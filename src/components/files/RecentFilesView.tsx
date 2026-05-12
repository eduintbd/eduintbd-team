import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { File, FileText, Image, Clock } from "lucide-react";

interface RecentFile {
  file_id: string;
  viewed_at: string;
  file: {
    id: string;
    name: string;
    mime_type: string;
    file_size: number;
    google_drive_file_id: string;
  } | null;
}

interface RecentFilesViewProps {
  onFileClick: (file: any) => void;
}

function formatDate(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const RecentFilesView = ({ onFileClick }: RecentFilesViewProps) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("file_recent_views")
      .select("file_id, viewed_at, file:file_items(id, name, mime_type, file_size, google_drive_file_id)")
      .eq("user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setRecentFiles(data as any);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading recent files...</div>;
  }

  if (recentFiles.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No recently viewed files</p>
        <p className="text-sm">Files you open will appear here</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Viewed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recentFiles.map((recent) => {
          if (!recent.file) return null;
          return (
            <TableRow
              key={recent.file_id}
              className="cursor-pointer"
              onClick={() => onFileClick(recent.file)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  {recent.file.mime_type.startsWith("image/") ? (
                    <Image className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{recent.file.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatSize(recent.file.file_size)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(recent.viewed_at)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default RecentFilesView;
