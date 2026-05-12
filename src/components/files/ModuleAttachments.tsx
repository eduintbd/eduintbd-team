import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Paperclip, X, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface AttachedFile {
  id: string;
  file_id: string;
  file: {
    id: string;
    name: string;
    mime_type: string;
    google_drive_file_id: string;
  } | null;
  created_at: string;
}

interface AvailableFile {
  id: string;
  name: string;
  mime_type: string;
  google_drive_file_id: string;
}

interface ModuleAttachmentsProps {
  moduleType: string;
  moduleRecordId: string;
  compact?: boolean;
}

const ModuleAttachments = ({ moduleType, moduleRecordId, compact }: ModuleAttachmentsProps) => {
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [availableFiles, setAvailableFiles] = useState<AvailableFile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [moduleType, moduleRecordId]);

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from("file_module_attachments")
      .select("id, file_id, created_at, file:file_items(id, name, mime_type, google_drive_file_id)")
      .eq("module_type", moduleType)
      .eq("module_record_id", moduleRecordId)
      .order("created_at", { ascending: false });
    setAttachments((data as any) || []);
  };

  const openAttachDialog = async () => {
    const { data } = await supabase
      .from("file_items")
      .select("id, name, mime_type, google_drive_file_id")
      .eq("is_deleted", false)
      .order("name")
      .limit(100);
    setAvailableFiles(data || []);
    setDialogOpen(true);
  };

  const handleAttach = async () => {
    if (!selectedFileId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("file_module_attachments")
      .insert({
        file_id: selectedFileId,
        module_type: moduleType,
        module_record_id: moduleRecordId,
        attached_by: user?.id,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("File already attached");
      } else {
        toast.error("Failed to attach file");
      }
    } else {
      toast.success("File attached");
      setDialogOpen(false);
      setSelectedFileId("");
      fetchAttachments();
    }
    setLoading(false);
  };

  const handleDetach = async (attachmentId: string) => {
    const { error } = await supabase
      .from("file_module_attachments")
      .delete()
      .eq("id", attachmentId);

    if (error) {
      toast.error("Failed to detach file");
    } else {
      toast.success("File detached");
      fetchAttachments();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Attached Files ({attachments.length})</span>
        </div>
        <Button variant="outline" size="sm" onClick={openAttachDialog}>
          <Paperclip className="h-3 w-3 mr-1" />
          Attach
        </Button>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((att) => {
            if (!att.file) return null;
            return (
              <div key={att.id} className="flex items-center gap-2 p-2 rounded bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{att.file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => window.open(`https://drive.google.com/file/d/${att.file!.google_drive_file_id}/view`, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => handleDetach(att.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Attach File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select a file to attach</Label>
              <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a file..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFiles.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAttach} disabled={!selectedFileId || loading}>
              {loading ? "Attaching..." : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModuleAttachments;
