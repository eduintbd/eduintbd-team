import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Facebook,
  Youtube,
  Linkedin,
  ExternalLink,
  Pencil,
  Users,
  MessageCircle,
  Music,
  Camera,
} from "lucide-react";

interface SocialChannel {
  id: string;
  platform: string;
  channel_name: string;
  channel_handle: string | null;
  channel_url: string | null;
  followers_count: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

const platformConfig: Record<string, { icon: React.ReactNode; color: string; bgClass: string }> = {
  facebook: {
    icon: <Facebook className="h-6 w-6" />,
    color: "text-blue-600",
    bgClass: "bg-blue-50",
  },
  youtube: {
    icon: <Youtube className="h-6 w-6" />,
    color: "text-red-600",
    bgClass: "bg-red-50",
  },
  whatsapp: {
    icon: <MessageCircle className="h-6 w-6" />,
    color: "text-green-600",
    bgClass: "bg-green-50",
  },
  linkedin: {
    icon: <Linkedin className="h-6 w-6" />,
    color: "text-blue-700",
    bgClass: "bg-blue-50",
  },
  tiktok: {
    icon: <Music className="h-6 w-6" />,
    color: "text-gray-900",
    bgClass: "bg-gray-100",
  },
  instagram: {
    icon: <Camera className="h-6 w-6" />,
    color: "text-pink-600",
    bgClass: "bg-gradient-to-br from-pink-50 to-purple-50",
  },
};

function formatFollowers(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editChannel, setEditChannel] = useState<SocialChannel | null>(null);
  const [editForm, setEditForm] = useState({
    channel_name: "",
    channel_handle: "",
    channel_url: "",
    description: "",
  });

  const fetchChannels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("social_media_channels")
      .select("*")
      .order("platform");

    if (error) {
      console.warn("Failed to load channels:", error.message);
      toast.error("Failed to load channels");
    }
    setChannels((data || []) as SocialChannel[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleToggleActive = async (channel: SocialChannel) => {
    const { error } = await supabase
      .from("social_media_channels")
      .update({ is_active: !channel.is_active } as any)
      .eq("id", channel.id);

    if (error) {
      toast.error("Failed to update channel status");
      return;
    }
    toast.success(`${channel.channel_name} ${channel.is_active ? "deactivated" : "activated"}`);
    fetchChannels();
  };

  const openEdit = (channel: SocialChannel) => {
    setEditChannel(channel);
    setEditForm({
      channel_name: channel.channel_name,
      channel_handle: channel.channel_handle || "",
      channel_url: channel.channel_url || "",
      description: channel.description || "",
    });
  };

  const handleSave = async () => {
    if (!editChannel) return;

    const { error } = await supabase
      .from("social_media_channels")
      .update({
        channel_name: editForm.channel_name,
        channel_handle: editForm.channel_handle || null,
        channel_url: editForm.channel_url || null,
        description: editForm.description || null,
      } as any)
      .eq("id", editChannel.id);

    if (error) {
      toast.error("Failed to update channel");
      return;
    }
    toast.success("Channel updated");
    setEditChannel(null);
    fetchChannels();
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading channels...</div>;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => {
          const config = platformConfig[channel.platform] || {
            icon: <Users className="h-6 w-6" />,
            color: "text-gray-600",
            bgClass: "bg-gray-50",
          };

          return (
            <Card key={channel.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bgClass} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{channel.channel_name}</CardTitle>
                      {channel.channel_handle && (
                        <p className="text-xs text-muted-foreground">@{channel.channel_handle}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={channel.is_active ? "default" : "secondary"}>
                    {channel.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Users className="h-4 w-4" />
                  <span>{formatFollowers(channel.followers_count)} followers</span>
                </div>

                {channel.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {channel.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openEdit(channel)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <div className="flex items-center gap-2 ml-auto">
                    <Label htmlFor={`active-${channel.id}`} className="text-xs">
                      Active
                    </Label>
                    <Switch
                      id={`active-${channel.id}`}
                      checked={channel.is_active}
                      onCheckedChange={() => handleToggleActive(channel)}
                    />
                  </div>
                  {channel.channel_url && (
                    <a
                      href={channel.channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {channels.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No channels configured yet.
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editChannel} onOpenChange={(open) => !open && setEditChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
            <DialogDescription>
              Update the details for {editChannel?.platform} channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Channel Name</Label>
              <Input
                value={editForm.channel_name}
                onChange={(e) => setEditForm({ ...editForm, channel_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Handle</Label>
              <Input
                value={editForm.channel_handle}
                onChange={(e) => setEditForm({ ...editForm, channel_handle: e.target.value })}
                placeholder="@handle"
              />
            </div>
            <div>
              <Label>Channel URL</Label>
              <Input
                value={editForm.channel_url}
                onChange={(e) => setEditForm({ ...editForm, channel_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditChannel(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
