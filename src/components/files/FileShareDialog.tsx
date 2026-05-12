import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Mail, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareRecord {
  id: string;
  share_type: string;
  share_target: string | null;
  permission: string;
  link_url: string | null;
  google_drive_permission_id: string | null;
  created_at: string;
}

interface FileShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
  googleDriveFileId: string;
  onShare: (params: any) => Promise<any>;
  onUnshare: (params: any) => Promise<void>;
}

const FileShareDialog = ({ open, onOpenChange, fileId, fileName, googleDriveFileId, onShare, onUnshare }: FileShareDialogProps) => {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [shareType, setShareType] = useState<"link" | "user">("link");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("reader");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) fetchShares();
  }, [open, fileId]);

  const fetchShares = async () => {
    const { data } = await supabase
      .from("file_shares")
      .select("*")
      .eq("file_id", fileId)
      .order("created_at", { ascending: false });
    setShares(data || []);
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      const result = await onShare({
        googleDriveFileId,
        fileDbId: fileId,
        shareType,
        email: shareType === "user" ? email : undefined,
        permission,
      });

      if (result?.linkUrl) {
        await navigator.clipboard.writeText(result.linkUrl);
        toast.success("Link copied to clipboard");
      } else {
        toast.success(`Shared with ${email}`);
      }

      setEmail("");
      fetchShares();
    } catch (err: any) {
      toast.error(err.message || "Failed to share");
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (share: ShareRecord) => {
    try {
      await onUnshare({
        googleDriveFileId,
        googleDrivePermissionId: share.google_drive_permission_id,
        shareDbId: share.id,
      });
      toast.success("Share removed");
      fetchShares();
    } catch {
      toast.error("Failed to remove share");
    }
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share "{fileName}"
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Share type selector */}
          <div className="flex gap-2">
            <Button
              variant={shareType === "link" ? "default" : "outline"}
              size="sm"
              onClick={() => setShareType("link")}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Get Link
            </Button>
            <Button
              variant={shareType === "user" ? "default" : "outline"}
              size="sm"
              onClick={() => setShareType("user")}
            >
              <Mail className="h-4 w-4 mr-1" />
              Share with User
            </Button>
          </div>

          {shareType === "user" && (
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Permission</Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reader">Viewer</SelectItem>
                <SelectItem value="commenter">Commenter</SelectItem>
                <SelectItem value="writer">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleShare} disabled={loading || (shareType === "user" && !email)} className="w-full">
            {loading ? "Sharing..." : shareType === "link" ? "Generate Link" : "Share"}
          </Button>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Active Shares</Label>
              {shares.map((share) => (
                <div key={share.id} className="flex items-center gap-2 p-2 rounded bg-muted">
                  {share.share_type === "link" ? (
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {share.share_type === "link" ? "Anyone with link" : share.share_target}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{share.permission}</Badge>
                  {share.link_url && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(share.link_url!)}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleUnshare(share)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileShareDialog;
