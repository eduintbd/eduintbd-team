import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw, File, FileText, Image, Folder } from "lucide-react";
import { toast } from "sonner";

interface TrashedFile {
  id: string;
  name: string;
  mime_type: string;
  file_size: number;
  google_drive_file_id: string;
  deleted_at: string;
}

interface TrashViewProps {
  onAction: (action: string, params: any) => Promise<void>;
  onRefresh: () => void;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TrashView = ({ onAction, onRefresh }: TrashViewProps) => {
  const [trashedFiles, setTrashedFiles] = useState<TrashedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<TrashedFile | null>(null);

  useEffect(() => {
    fetchTrashed();
  }, []);

  const fetchTrashed = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("file_items")
      .select("id, name, mime_type, file_size, google_drive_file_id, deleted_at")
      .eq("is_deleted", true)
      .order("deleted_at", { ascending: false });

    if (!error && data) setTrashedFiles(data);
    setLoading(false);
  };

  const handleRestore = async (file: TrashedFile) => {
    try {
      await onAction("restore_file", {
        fileDbId: file.id,
        googleDriveFileId: file.google_drive_file_id,
      });
      toast.success(`Restored "${file.name}"`);
      fetchTrashed();
      onRefresh();
    } catch {
      toast.error("Failed to restore file");
    }
  };

  const handlePermanentDelete = async (file: TrashedFile) => {
    try {
      await onAction("permanently_delete", {
        fileDbId: file.id,
        googleDriveFileId: file.google_drive_file_id,
      });
      toast.success(`Permanently deleted "${file.name}"`);
      setConfirmDelete(null);
      fetchTrashed();
    } catch {
      toast.error("Failed to delete file");
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading trash...</div>;
  }

  if (trashedFiles.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Trash is empty</p>
        <p className="text-sm">Deleted files will appear here for 30 days</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trashedFiles.map((file) => (
            <TableRow key={file.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {file.mime_type.startsWith("image/") ? (
                    <Image className="h-4 w-4 text-muted-foreground" />
                  ) : file.mime_type.includes("pdf") ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <File className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground line-through">{file.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatSize(file.file_size)}</TableCell>
              <TableCell className="text-muted-foreground">{file.deleted_at ? formatDate(file.deleted_at) : "—"}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleRestore(file)}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restore
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(file)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{confirmDelete?.name}" from both the system and Google Drive. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handlePermanentDelete(confirmDelete)}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TrashView;
