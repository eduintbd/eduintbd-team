import { useState } from "react";
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
} from "lucide-react";

const PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" />, maxChars: 63206, color: "text-blue-600" },
  { id: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, maxChars: 5000, color: "text-red-600" },
  { id: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, maxChars: 3000, color: "text-blue-700" },
  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" />, maxChars: 65536, color: "text-green-600" },
  { id: "tiktok", label: "TikTok", icon: <Music className="h-4 w-4" />, maxChars: 2200, color: "text-gray-900" },
  { id: "instagram", label: "Instagram", icon: <Camera className="h-4 w-4" />, maxChars: 2200, color: "text-pink-600" },
];

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

  const savePost = async (status: "draft" | "pending_review" | "scheduled") => {
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    if (status === "scheduled" && (!scheduleDate || !scheduleTime)) {
      toast.error("Schedule date and time are required");
      return;
    }

    setSaving(true);

    const scheduledAt =
      status === "scheduled" && scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : null;

    const hashtagArr = hashtags
      .split(/[,\s]+/)
      .map((h) => h.replace(/^#/, "").trim())
      .filter(Boolean);

    // Save one row per platform
    const rows = selectedPlatforms.map((platform) => ({
      platform,
      content: platformOverrides[platform] || content,
      hashtags: hashtagArr,
      campaign_name: campaignName || null,
      scheduled_at: scheduledAt,
      status,
      media_urls: [] as string[],
    }));

    const { error } = await supabase
      .from("social_media_scheduled_posts")
      .insert(rows as any);

    if (error) {
      toast.error("Failed to save post: " + error.message);
      setSaving(false);
      return;
    }

    const statusLabels: Record<string, string> = {
      draft: "Saved as draft",
      pending_review: "Submitted for review",
      scheduled: "Post scheduled",
    };
    toast.success(statusLabels[status] || "Post saved");

    // Reset form
    setContent("");
    setSelectedPlatforms([]);
    setPlatformOverrides({});
    setHashtags("");
    setCampaignName("");
    setScheduleDate("");
    setScheduleTime("");
    setMediaFiles([]);
    setSaving(false);
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
