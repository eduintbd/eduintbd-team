import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Get Google access token using OAuth2 refresh token
async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get Google access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

const ROOT_FOLDER_ID = () => Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID") ?? "root";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the user's JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { action, ...params } = await req.json();
    const accessToken = await getGoogleAccessToken();

    let result: any;

    switch (action) {
      case "list_files": {
        const folderId = params.folderId || ROOT_FOLDER_ID();
        const query = `'${folderId}' in parents and trashed = false`;
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink)&orderBy=folder,name&pageSize=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = await res.json();
        break;
      }

      case "create_folder": {
        const parentId = params.parentFolderId || ROOT_FOLDER_ID();
        const res = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: params.name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
          }),
        });
        const driveFolder = await res.json();

        // Save to Supabase
        const { data: folder, error: folderError } = await supabaseClient
          .from("file_folders")
          .insert({
            name: params.name,
            parent_folder_id: params.parentFolderDbId || null,
            google_drive_folder_id: driveFolder.id,
            created_by: user.id,
          })
          .select()
          .single();

        if (folderError) throw folderError;
        result = { ...driveFolder, dbRecord: folder };
        break;
      }

      case "upload_file": {
        const parentId = params.parentFolderId || ROOT_FOLDER_ID();
        const fileContent = Uint8Array.from(atob(params.fileBase64), (c) => c.charCodeAt(0));

        // Multipart upload to Google Drive
        const boundary = "-------314159265358979323846";
        const metadata = JSON.stringify({
          name: params.fileName,
          parents: [parentId],
        });

        const body = new Uint8Array([
          ...new TextEncoder().encode(
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${params.mimeType}\r\n\r\n`
          ),
          ...fileContent,
          ...new TextEncoder().encode(`\r\n--${boundary}--`),
        ]);

        const res = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
          }
        );
        const driveFile = await res.json();

        if (driveFile.error) throw new Error(driveFile.error.message);

        // Save metadata to Supabase
        const { data: fileRecord, error: fileError } = await supabaseClient
          .from("file_items")
          .insert({
            name: params.fileName,
            folder_id: params.folderDbId || null,
            google_drive_file_id: driveFile.id,
            mime_type: params.mimeType,
            file_size: fileContent.length,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (fileError) throw fileError;

        // Create initial version
        await supabaseClient.from("file_versions").insert({
          file_id: fileRecord.id,
          version_number: 1,
          google_drive_file_id: driveFile.id,
          file_size: fileContent.length,
          change_notes: "Initial upload",
          uploaded_by: user.id,
        });

        result = { ...driveFile, dbRecord: fileRecord };
        break;
      }

      case "download_file": {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const fileBlob = await res.arrayBuffer();
        const fileBase64 = base64Encode(new Uint8Array(fileBlob));
        result = { fileBase64, mimeType: res.headers.get("content-type") };
        break;
      }

      case "delete_file": {
        // Soft delete in Supabase
        await supabaseClient
          .from("file_items")
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
          .eq("id", params.fileDbId);

        // Trash in Google Drive
        await fetch(`https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trashed: true }),
        });

        result = { success: true };
        break;
      }

      case "delete_folder": {
        await supabaseClient
          .from("file_folders")
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
          .eq("id", params.folderDbId);

        await fetch(`https://www.googleapis.com/drive/v3/files/${params.googleDriveFolderId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trashed: true }),
        });

        result = { success: true };
        break;
      }

      case "restore_file": {
        await supabaseClient
          .from("file_items")
          .update({ is_deleted: false, deleted_at: null, deleted_by: null })
          .eq("id", params.fileDbId);

        await fetch(`https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trashed: false }),
        });

        result = { success: true };
        break;
      }

      case "permanently_delete": {
        await supabaseClient
          .from("file_items")
          .delete()
          .eq("id", params.fileDbId);

        await fetch(`https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        result = { success: true };
        break;
      }

      case "search_files": {
        const query = `fullText contains '${params.query.replace(/'/g, "\\'")}' and trashed = false`;
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)&pageSize=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = await res.json();
        break;
      }

      case "get_storage_quota": {
        const res = await fetch(
          "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = await res.json();
        break;
      }

      case "update_file": {
        const fileContent = Uint8Array.from(atob(params.fileBase64), (c) => c.charCodeAt(0));

        const res = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${params.googleDriveFileId}?uploadType=media&fields=id,name,mimeType,size`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": params.mimeType,
            },
            body: fileContent,
          }
        );
        const updatedFile = await res.json();

        const { data: fileRecord } = await supabaseClient
          .from("file_items")
          .select("current_version")
          .eq("id", params.fileDbId)
          .single();

        const newVersion = (fileRecord?.current_version || 0) + 1;

        await supabaseClient.from("file_items").update({
          current_version: newVersion,
          file_size: fileContent.length,
          updated_at: new Date().toISOString(),
        }).eq("id", params.fileDbId);

        await supabaseClient.from("file_versions").insert({
          file_id: params.fileDbId,
          version_number: newVersion,
          google_drive_file_id: params.googleDriveFileId,
          file_size: fileContent.length,
          change_notes: params.changeNotes || `Version ${newVersion}`,
          uploaded_by: user.id,
        });

        result = { ...updatedFile, version: newVersion };
        break;
      }

      case "create_google_doc": {
        // Create Google Docs, Sheets, Slides, or Forms
        const mimeTypes: Record<string, string> = {
          doc: "application/vnd.google-apps.document",
          sheet: "application/vnd.google-apps.spreadsheet",
          slide: "application/vnd.google-apps.presentation",
          form: "application/vnd.google-apps.form",
        };
        const mimeType = mimeTypes[params.docType] || mimeTypes.doc;
        const parentId = params.parentFolderId || ROOT_FOLDER_ID();

        const res = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: params.name,
            mimeType,
            parents: [parentId],
          }),
        });
        const driveFile = await res.json();
        if (driveFile.error) throw new Error(driveFile.error.message);

        // Save metadata to Supabase
        const { data: fileRecord, error: fileError } = await supabaseClient
          .from("file_items")
          .insert({
            name: params.name,
            folder_id: params.folderDbId || null,
            google_drive_file_id: driveFile.id,
            mime_type: mimeType,
            file_size: 0,
            uploaded_by: user.id,
          })
          .select()
          .single();
        if (fileError) throw fileError;

        await supabaseClient.from("file_versions").insert({
          file_id: fileRecord.id,
          version_number: 1,
          google_drive_file_id: driveFile.id,
          file_size: 0,
          change_notes: "Created",
          uploaded_by: user.id,
        });

        // Audit log
        await supabaseClient.from("file_audit_log").insert({
          file_id: fileRecord.id,
          user_id: user.id,
          action: "create_doc",
          details: { docType: params.docType, name: params.name },
        });

        result = { ...driveFile, dbRecord: fileRecord };
        break;
      }

      case "create_from_template": {
        // Copy a template file in Google Drive
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${params.templateDriveId}/copy`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: params.name,
              parents: [params.parentFolderId || ROOT_FOLDER_ID()],
            }),
          }
        );
        const copiedFile = await res.json();
        if (copiedFile.error) throw new Error(copiedFile.error.message);

        const { data: fileRecord, error: fileError } = await supabaseClient
          .from("file_items")
          .insert({
            name: params.name,
            folder_id: params.folderDbId || null,
            google_drive_file_id: copiedFile.id,
            mime_type: copiedFile.mimeType,
            file_size: 0,
            description: `Created from template: ${params.templateName}`,
            uploaded_by: user.id,
          })
          .select()
          .single();
        if (fileError) throw fileError;

        await supabaseClient.from("file_audit_log").insert({
          file_id: fileRecord.id,
          user_id: user.id,
          action: "create_doc",
          details: { fromTemplate: params.templateName },
        });

        result = { ...copiedFile, dbRecord: fileRecord };
        break;
      }

      case "move_file": {
        // Move file in Google Drive
        const fileMetaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}?fields=parents`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const fileMeta = await fileMetaRes.json();
        const previousParents = (fileMeta.parents || []).join(",");

        await fetch(
          `https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}?addParents=${params.newParentDriveId}&removeParents=${previousParents}`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        // Update in Supabase
        await supabaseClient
          .from("file_items")
          .update({ folder_id: params.newFolderDbId || null, updated_at: new Date().toISOString() })
          .eq("id", params.fileDbId);

        await supabaseClient.from("file_audit_log").insert({
          file_id: params.fileDbId,
          user_id: user.id,
          action: "move",
          details: { to: params.newFolderDbId },
        });

        result = { success: true };
        break;
      }

      case "share_file": {
        // Create sharing permission in Google Drive
        const permRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}/permissions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: params.shareType === "link" ? "anyone" : "user",
              role: params.permission || "reader",
              ...(params.shareType !== "link" && { emailAddress: params.email }),
            }),
          }
        );
        const perm = await permRes.json();

        // Get shareable link
        let linkUrl = "";
        if (params.shareType === "link") {
          const linkRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}?fields=webViewLink`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const linkData = await linkRes.json();
          linkUrl = linkData.webViewLink || "";
        }

        // Save share record
        const { data: shareRecord } = await supabaseClient
          .from("file_shares")
          .insert({
            file_id: params.fileDbId,
            shared_by: user.id,
            share_type: params.shareType || "link",
            share_target: params.email || null,
            permission: params.permission === "writer" ? "edit" : params.permission === "commenter" ? "comment" : "view",
            google_drive_permission_id: perm.id,
            link_url: linkUrl,
          })
          .select()
          .single();

        await supabaseClient.from("file_audit_log").insert({
          file_id: params.fileDbId,
          user_id: user.id,
          action: "share",
          details: { shareType: params.shareType, target: params.email, permission: params.permission },
        });

        result = { ...perm, linkUrl, dbRecord: shareRecord };
        break;
      }

      case "unshare_file": {
        if (params.googleDrivePermissionId) {
          await fetch(
            `https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}/permissions/${params.googleDrivePermissionId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
        }

        await supabaseClient
          .from("file_shares")
          .delete()
          .eq("id", params.shareDbId);

        result = { success: true };
        break;
      }

      case "log_activity": {
        await supabaseClient.from("file_audit_log").insert({
          file_id: params.fileId || null,
          folder_id: params.folderId || null,
          user_id: user.id,
          action: params.activityType,
          details: params.details || {},
        });

        // Update recent views if it's a view action
        if (params.activityType === "view" && params.fileId) {
          await supabaseClient
            .from("file_recent_views")
            .upsert(
              { file_id: params.fileId, user_id: user.id, viewed_at: new Date().toISOString() },
              { onConflict: "file_id,user_id" }
            );
        }

        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
