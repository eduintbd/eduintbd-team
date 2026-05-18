// Shared Facebook publishing logic.
// Used by:
//   - publish-facebook-post   (user-triggered, JWT-authenticated)
//   - dispatch-scheduled-posts (cron-triggered, service-role)
//
// All callers MUST pass a service-role SupabaseClient — secrets selection and attempt
// logging require RLS bypass.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const FB_API_VERSION = "v22.0";
const FB = `https://graph.facebook.com/${FB_API_VERSION}`;
const SIGNED_URL_TTL = 3600;

type MediaKind = "image" | "video" | "unknown";

function classifyMedia(path: string): MediaKind {
  const lower = path.toLowerCase().split("?")[0];
  if (/\.(jpe?g|png|gif|webp|bmp)$/.test(lower)) return "image";
  if (/\.(mp4|mov|webm|m4v|avi|mkv)$/.test(lower)) return "video";
  return "unknown";
}

export interface FbErr {
  message: string;
  type?: string;
  code?: number;
  fbtrace_id?: string;
}

async function fbCall<T = unknown>(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const text = await r.text();
  let parsed: { error?: FbErr } & Record<string, unknown> = {};
  try { parsed = text ? JSON.parse(text) : {}; } catch { /* leave */ }
  if (!r.ok || parsed.error) {
    const err: FbErr = parsed.error ?? { message: text || `HTTP ${r.status}` };
    return { ok: false as const, status: r.status, error: err, raw: text };
  }
  return { ok: true as const, body: parsed as T };
}

async function signedMediaUrl(admin: SupabaseClient, storagePath: string): Promise<string | null> {
  const path = storagePath.replace(/^social-media-media\//, "");
  const { data } = await admin.storage.from("social-media-media").createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

async function recordAttempt(
  admin: SupabaseClient,
  row: {
    scheduled_post_id: string;
    channel_id: string;
    provider: string;
    status: "success" | "failed";
    external_post_id?: string | null;
    external_post_url?: string | null;
    request_payload?: unknown;
    response_body?: unknown;
    error_message?: string | null;
  },
) {
  await admin.from("social_media_publish_attempts").insert(row);
}

export interface ChannelTarget {
  channel_id: string;
  page_id: string;
  page_name: string;
  page_access_token: string;
}

export interface PublishResult {
  channel_id: string;
  status: "success" | "failed";
  external_post_id?: string;
  external_post_url?: string;
  error?: string;
  at: string;
}

async function publishToPage(
  admin: SupabaseClient,
  target: ChannelTarget,
  message: string,
  mediaPaths: string[],
  scheduledPostId: string,
): Promise<PublishResult> {
  const at = new Date().toISOString();

  const media = await Promise.all(
    mediaPaths.map(async (p) => ({ path: p, kind: classifyMedia(p), url: await signedMediaUrl(admin, p) })),
  );
  if (media.some((m) => m.kind === "unknown" || !m.url)) {
    const bad = media.find((m) => m.kind === "unknown" || !m.url);
    const reason = bad?.kind === "unknown"
      ? `unsupported media type: ${bad?.path}`
      : `could not sign URL for ${bad?.path}`;
    await recordAttempt(admin, {
      scheduled_post_id: scheduledPostId, channel_id: target.channel_id, provider: "facebook",
      status: "failed", error_message: reason,
    });
    return { channel_id: target.channel_id, status: "failed", error: reason, at };
  }

  const images = media.filter((m) => m.kind === "image") as { path: string; kind: "image"; url: string }[];
  const videos = media.filter((m) => m.kind === "video") as { path: string; kind: "video"; url: string }[];

  if (videos.length > 1) {
    const err = "multiple videos per post not supported";
    await recordAttempt(admin, { scheduled_post_id: scheduledPostId, channel_id: target.channel_id, provider: "facebook", status: "failed", error_message: err });
    return { channel_id: target.channel_id, status: "failed", error: err, at };
  }
  if (videos.length === 1 && images.length > 0) {
    const err = "cannot mix image and video in a single FB post";
    await recordAttempt(admin, { scheduled_post_id: scheduledPostId, channel_id: target.channel_id, provider: "facebook", status: "failed", error_message: err });
    return { channel_id: target.channel_id, status: "failed", error: err, at };
  }

  let endpoint = "";
  let params: URLSearchParams;
  let requestSummary: Record<string, unknown> = { message_chars: message.length };

  if (videos.length === 1) {
    endpoint = `${FB}/${target.page_id}/videos`;
    params = new URLSearchParams({
      access_token: target.page_access_token,
      file_url: videos[0].url,
      description: message,
    });
    requestSummary = { ...requestSummary, mode: "video", media_path: videos[0].path };
  } else if (images.length === 0) {
    endpoint = `${FB}/${target.page_id}/feed`;
    params = new URLSearchParams({ access_token: target.page_access_token, message });
    requestSummary = { ...requestSummary, mode: "text" };
  } else if (images.length === 1) {
    endpoint = `${FB}/${target.page_id}/photos`;
    params = new URLSearchParams({
      access_token: target.page_access_token,
      url: images[0].url,
      caption: message,
    });
    requestSummary = { ...requestSummary, mode: "single_image", media_path: images[0].path };
  } else {
    const mediaFbids: string[] = [];
    for (const img of images) {
      const r = await fbCall<{ id: string }>(`${FB}/${target.page_id}/photos`, {
        method: "POST",
        body: new URLSearchParams({ access_token: target.page_access_token, url: img.url, published: "false" }),
      });
      if (!r.ok) {
        await recordAttempt(admin, {
          scheduled_post_id: scheduledPostId, channel_id: target.channel_id, provider: "facebook",
          status: "failed", request_payload: { mode: "multi_image_upload", url_path: img.path },
          response_body: { error: r.error }, error_message: r.error.message,
        });
        return { channel_id: target.channel_id, status: "failed", error: `image upload failed: ${r.error.message}`, at };
      }
      mediaFbids.push(r.body.id);
    }
    endpoint = `${FB}/${target.page_id}/feed`;
    params = new URLSearchParams({ access_token: target.page_access_token, message });
    mediaFbids.forEach((id, i) => params.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
    requestSummary = { ...requestSummary, mode: "multi_image", count: images.length };
  }

  const result = await fbCall<{ id?: string; post_id?: string }>(endpoint, { method: "POST", body: params });

  if (!result.ok) {
    await recordAttempt(admin, {
      scheduled_post_id: scheduledPostId, channel_id: target.channel_id, provider: "facebook",
      status: "failed", request_payload: requestSummary,
      response_body: { error: result.error, status: result.status }, error_message: result.error.message,
    });
    return { channel_id: target.channel_id, status: "failed", error: result.error.message, at };
  }

  const externalId = result.body.post_id ?? result.body.id;
  const externalUrl = externalId ? `https://www.facebook.com/${externalId.replace("_", "/posts/")}` : undefined;

  await recordAttempt(admin, {
    scheduled_post_id: scheduledPostId, channel_id: target.channel_id, provider: "facebook",
    status: "success", external_post_id: externalId, external_post_url: externalUrl,
    request_payload: requestSummary, response_body: result.body,
  });
  return {
    channel_id: target.channel_id, status: "success",
    external_post_id: externalId, external_post_url: externalUrl, at,
  };
}

interface SchedPostRow {
  id: string;
  content: string;
  hashtags: string[] | null;
  media_urls: string[] | null;
  channel_ids: string[] | null;
  platform_content: Record<string, unknown> | null;
  publish_results: Record<string, PublishResult> | null;
}

function buildMessage(post: SchedPostRow): string {
  const pc = (post.platform_content ?? {}) as Record<string, { content?: string } | string | undefined>;
  const fbOverride = typeof pc.facebook === "string"
    ? pc.facebook
    : (pc.facebook && typeof pc.facebook === "object" && pc.facebook.content) || null;
  const base = (fbOverride ?? post.content ?? "").trim();
  const tagLine = (post.hashtags ?? []).map((t) => `#${t.replace(/^#/, "")}`).join(" ");
  return [base, tagLine].filter(Boolean).join("\n\n");
}

export async function publishPostToFacebookChannels(
  admin: SupabaseClient,
  postId: string,
  filterChannelIds?: string[],
): Promise<{ results: PublishResult[]; allDone: boolean; allFailed: boolean }> {
  const { data: post, error: postErr } = await admin
    .from("social_media_scheduled_posts")
    .select("id, content, hashtags, media_urls, channel_ids, platform_content, publish_results, status")
    .eq("id", postId)
    .single();

  if (postErr || !post) throw new Error(`post_not_found: ${postErr?.message}`);

  const targetIds = filterChannelIds ?? (post.channel_ids ?? []);
  if (targetIds.length === 0) return { results: [], allDone: false, allFailed: false };

  const { data: rows, error: secErr } = await admin
    .from("social_media_channel_secrets")
    .select("channel_id, provider, external_account_id, external_account_name, page_access_token, social_media_channels!inner(id, platform, channel_name)")
    .in("channel_id", targetIds);

  if (secErr) throw new Error(`secrets_lookup_failed: ${secErr.message}`);

  type Row = {
    channel_id: string; provider: string;
    external_account_id: string; external_account_name: string | null;
    page_access_token: string;
    social_media_channels: { id: string; platform: string; channel_name: string };
  };

  const targets: ChannelTarget[] = (rows as unknown as Row[] ?? [])
    .filter((r) => r.provider === "facebook" && r.social_media_channels?.platform === "facebook")
    .map((r) => ({
      channel_id: r.channel_id,
      page_id: r.external_account_id,
      page_name: r.external_account_name ?? r.social_media_channels.channel_name,
      page_access_token: r.page_access_token,
    }));

  if (targets.length === 0) return { results: [], allDone: false, allFailed: false };

  const message = buildMessage(post as SchedPostRow);
  const results: PublishResult[] = [];
  for (const t of targets) {
    results.push(await publishToPage(admin, t, message, (post.media_urls ?? []) as string[], post.id));
  }

  const existing = ((post as SchedPostRow).publish_results ?? {}) as Record<string, PublishResult>;
  const merged = { ...existing };
  for (const r of results) merged[r.channel_id] = r;

  const allChannelIds = (post.channel_ids ?? []) as string[];
  const allDone = allChannelIds.length > 0 && allChannelIds.every((id) => merged[id]?.status === "success");
  const allFailed = results.length > 0 && results.every((r) => r.status === "failed")
    && Object.values(merged).every((r) => r.status === "failed");

  const update: Record<string, unknown> = { publish_results: merged, dispatch_lock_at: null };
  if (allDone) {
    update.status = "published";
    update.published_at = new Date().toISOString();
    update.last_dispatch_error = null;
  } else if (allFailed) {
    update.status = "failed";
    update.last_dispatch_error = results.map((r) => `${r.channel_id}: ${r.error}`).join("; ");
  }
  await admin.from("social_media_scheduled_posts").update(update).eq("id", post.id);

  return { results, allDone, allFailed };
}
