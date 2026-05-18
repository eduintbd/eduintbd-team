import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Facebook,
  Youtube,
  Linkedin,
  MessageCircle,
  Music,
  Camera,
  Image,
  Calendar,
  Hash,
  Send,
  Save,
  Eye,
  Upload,
  Zap,
} from "lucide-react";

const PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" />, maxChars: 63206, color: "text-blue-600" },
  { id: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, maxChars: 5000, color: "text-red-600" },
  { id: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, maxChars: 3000, color: "text-blue-700" },
  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" />, maxChars: 65536, color: "text-green-600" },
  { id: "tiktok", label: "TikTok", icon: <Music className="h-4 w-4" />, maxChars: 2200, color: "text-gray-900" },
  { id: "instagram", label: "Instagram", icon: <Camera className="h-4 w-4" />, maxChars: 2200, color: "text-pink-600" },
];

interface ConnectedChannel {
  id: string;
  platform: string;
  channel_name: string;
  company_id: string | null;
  company_name?: string;
  external_account_name: string | null;
}

export default function PostComposer() {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string>>({});
  const [hashtags, setHashtags] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [connectedChannels, setConnectedChannels] = useState<ConnectedChannel[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("social_media_channels")
        .select("id, platform, channel_name, company_id, social_media_companies(name), social_media_channel_secrets!inner(channel_id, external_account_name)")
        .eq("is_active", true);
      if (error || !data) return;
      const channels: ConnectedChannel[] = data.map((r: any) => ({
        id: r.id,
        platform: r.platform,
        channel_name: r.channel_name,
        company_id: r.company_id,
        company_name: r.social_media_companies?.name,
        external_account_name: r.social_media_channel_secrets?.external_account_name ?? null,
      }));
      setConnectedChannels(channels);
    })();
  }, []);

  const toggleChannel = (id: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const getCharCount = (platformId: string) => {
    const text = platformOverrides[platformId] || content;
    return text.length;
  };

  const getMaxChars = (platformId: string) => {
    return PLATFORMS.find((p) => p.id === platformId)?.maxChars || 5000;
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setMediaFiles((prev) => [...prev, ...files]);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMediaFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (userId: string | null): Promise<string[]> => {
    if (mediaFiles.length === 0) return [];
    const paths: string[] = [];
    for (const file of mediaFiles) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId ?? "anon"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
      const { error } = await supabase.storage.from("social-media-media").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`);
      paths.push(path);
    }
    return paths;
  };

  const savePost = async (
    status: "draft" | "pending_review" | "scheduled" | "publish_now",
  ): Promise<{ id: string; channel_ids: string[] } | null> => {
    if (!content.trim()) {
      toast.error("Content is required");
      return null;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return null;
    }
    if (status === "scheduled" && (!scheduleDate || !scheduleTime)) {
      toast.error("Schedule date and time are required");
      return null;
    }
    if (status === "publish_now" && selectedPlatforms.includes("facebook") && selectedChannelIds.length === 0) {
      toast.error("Select at least one Facebook channel to publish to");
      return null;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let mediaUrls: string[] = [];
      try {
        mediaUrls = await uploadMedia(user?.id ?? null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Media upload failed");
        return null;
      }

      const scheduledAt =
        status === "scheduled" && scheduleDate && scheduleTime
          ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
          : status === "publish_now"
            ? new Date().toISOString()
            : null;

      const hashtagArr = hashtags
        .split(/[,\s]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean);

      const platformContent: Record<string, string> = {};
      for (const pId of selectedPlatforms) {
        if (platformOverrides[pId]) platformContent[pId] = platformOverrides[pId];
      }

      const dbStatus = status === "publish_now" ? "scheduled" : status;
      const row = {
        content,
        platforms: selectedPlatforms,
        channel_ids: selectedChannelIds,
        platform_content: Object.keys(platformContent).length > 0 ? platformContent : null,
        hashtags: hashtagArr,
        campaign: campaignName || null,
        scheduled_at: scheduledAt,
        status: dbStatus,
        media_urls: mediaUrls,
        created_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from("social_media_scheduled_posts")
        .insert(row as any)
        .select("id, channel_ids")
        .single();

      if (error || !data) {
        toast.error("Failed to save post: " + (error?.message ?? "no row returned"));
        return null;
      }

      if (status !== "publish_now") {
        const labels: Record<string, string> = {
          draft: "Saved as draft",
          pending_review: "Submitted for review",
          scheduled: "Post scheduled",
        };
        toast.success(labels[status]);
        resetForm();
      }

      return { id: (data as any).id, channel_ids: (data as any).channel_ids ?? [] };
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setSelectedPlatforms([]);
    setSelectedChannelIds([]);
    setPlatformOverrides({});
    setHashtags("");
    setCampaignName("");
    setScheduleDate("");
    setScheduleTime("");
    setMediaFiles([]);
  };

  const publishNow = async () => {
    const saved = await savePost("publish_now");
    if (!saved) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-facebook-post", {
        body: { scheduled_post_id: saved.id, channel_ids: saved.channel_ids },
      });
      if (error) {
        toast.error("Publish failed: " + error.message);
        return;
      }
      const summary = data?.summary;
      const results = (data?.results ?? []) as { channel_id: string; status: string; error?: string }[];
      if (summary?.success > 0 && summary?.failed === 0) {
        toast.success(`Published to ${summary.success} channel${summary.success === 1 ? "" : "s"}`);
        resetForm();
      } else if (summary?.success > 0) {
        toast.warning(`Published to ${summary.success}, ${summary.failed} failed`);
        results.filter((r) => r.status === "failed").forEach((r) => toast.error(`Channel ${r.channel_id}: ${r.error}`));
      } else {
        results.forEach((r) => toast.error(`${r.channel_id}: ${r.error ?? "failed"}`));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compose Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campaign */}
            <div>
              <Label>Campaign Name (optional)</Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Q2 Product Launch"
              />
            </div>

            {/* Content */}
            <div>
              <Label>Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length} characters
              </p>
            </div>

            {/* Hashtags */}
            <div>
              <Label className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" /> Hashtags
              </Label>
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#marketing, #launch, #brand"
              />
            </div>

            {/* Media Upload */}
            <div>
              <Label className="flex items-center gap-1">
                <Image className="h-3.5 w-3.5" /> Media
              </Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleMediaDrop}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here or{" "}
                  <label className="text-primary cursor-pointer underline">
                    browse
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleMediaSelect}
                    />
                  </label>
                </p>
              </div>
              {mediaFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {mediaFiles.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {f.name}
                      <button
                        onClick={() => removeMedia(i)}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Schedule Date
                </Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Schedule Time</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform-Specific Overrides */}
        {selectedPlatforms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Previews</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={selectedPlatforms[0]}>
                <TabsList className="flex-wrap h-auto">
                  {selectedPlatforms.map((pId) => {
                    const p = PLATFORMS.find((x) => x.id === pId)!;
                    return (
                      <TabsTrigger key={pId} value={pId} className="gap-1">
                        {p.icon} {p.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {selectedPlatforms.map((pId) => {
                  const p = PLATFORMS.find((x) => x.id === pId)!;
                  const charCount = getCharCount(pId);
                  const maxChars = getMaxChars(pId);
                  const isOver = charCount > maxChars;

                  return (
                    <TabsContent key={pId} value={pId}>
                      <div className="space-y-2">
                        <Textarea
                          value={platformOverrides[pId] || content}
                          onChange={(e) =>
                            setPlatformOverrides({
                              ...platformOverrides,
                              [pId]: e.target.value,
                            })
                          }
                          rows={4}
                          placeholder={`Override content for ${p.label}...`}
                          className="resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <p className={`text-xs ${isOver ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                            {charCount} / {maxChars.toLocaleString()} characters
                          </p>
                          {platformOverrides[pId] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const copy = { ...platformOverrides };
                                delete copy[pId];
                                setPlatformOverrides(copy);
                              }}
                            >
                              Reset to default
                            </Button>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="space-y-4">
        {/* Platform Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platforms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLATFORMS.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Checkbox
                  id={`platform-${p.id}`}
                  checked={selectedPlatforms.includes(p.id)}
                  onCheckedChange={() => togglePlatform(p.id)}
                />
                <label
                  htmlFor={`platform-${p.id}`}
                  className={`flex items-center gap-2 cursor-pointer text-sm ${p.color}`}
                >
                  {p.icon}
                  {p.label}
                </label>
                {selectedPlatforms.includes(p.id) && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {getCharCount(p.id)}/{p.maxChars.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Connected channels — destination picker */}
        {selectedPlatforms.length > 0 && (() => {
          const eligible = connectedChannels.filter((c) => selectedPlatforms.includes(c.platform));
          if (eligible.length === 0) {
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Destinations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    No connected channels for the selected platform(s). Connect a Facebook page from <b>Channel Manager</b> first.
                  </p>
                </CardContent>
              </Card>
            );
          }
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Destinations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {eligible.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`channel-${c.id}`}
                      checked={selectedChannelIds.includes(c.id)}
                      onCheckedChange={() => toggleChannel(c.id)}
                    />
                    <label htmlFor={`channel-${c.id}`} className="text-sm cursor-pointer flex-1 truncate">
                      <span className="capitalize text-xs text-muted-foreground">{c.platform}</span>{" "}
                      {c.external_account_name ?? c.channel_name}
                      {c.company_name && <span className="text-xs text-muted-foreground"> &middot; {c.company_name}</span>}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}

        {/* Status Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">Draft</Badge>
              <span>-&gt;</span>
              <Badge variant="outline" className="border-yellow-300">Review</Badge>
              <span>-&gt;</span>
              <Badge variant="outline" className="border-blue-300">Approved</Badge>
              <span>-&gt;</span>
              <Badge variant="outline" className="border-green-300">Scheduled</Badge>
              <span>-&gt;</span>
              <Badge className="bg-emerald-600">Published</Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                onClick={publishNow}
                disabled={saving || !selectedPlatforms.includes("facebook") || selectedChannelIds.length === 0}
                title={!selectedPlatforms.includes("facebook") ? "Publish Now currently supports Facebook only" : selectedChannelIds.length === 0 ? "Select at least one channel" : ""}
              >
                <Zap className="h-4 w-4 mr-2" /> Publish Now (Facebook)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => savePost("draft")}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" /> Save as Draft
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => savePost("pending_review")}
                disabled={saving}
              >
                <Eye className="h-4 w-4 mr-2" /> Submit for Review
              </Button>
              <Button
                className="w-full justify-start"
                onClick={() => savePost("scheduled")}
                disabled={saving}
              >
                <Send className="h-4 w-4 mr-2" /> Schedule Post
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
