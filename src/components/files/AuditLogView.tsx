import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Upload, Download, Trash2, Eye, Share2, Move, Tag, FileText } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
  file: { name: string } | null;
}

const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
  view: { label: "Viewed", icon: Eye, color: "text-blue-500" },
  download: { label: "Downloaded", icon: Download, color: "text-green-500" },
  upload: { label: "Uploaded", icon: Upload, color: "text-purple-500" },
  delete: { label: "Deleted", icon: Trash2, color: "text-red-500" },
  restore: { label: "Restored", icon: Upload, color: "text-orange-500" },
  share: { label: "Shared", icon: Share2, color: "text-indigo-500" },
  move: { label: "Moved", icon: Move, color: "text-yellow-500" },
  tag: { label: "Tagged", icon: Tag, color: "text-pink-500" },
  create_doc: { label: "Created", icon: FileText, color: "text-teal-500" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AuditLogView = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    fetchLog();
  }, [filterAction]);

  const fetchLog = async () => {
    setLoading(true);
    let query = supabase
      .from("file_audit_log")
      .select("id, action, details, created_at, user_id, file:file_items(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filterAction !== "all") {
      query = query.eq("action", filterAction);
    }

    const { data, error } = await query;
    if (!error && data) {
      setEntries(data as any);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading audit log...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{entries.length} activities</p>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="view">Views</SelectItem>
            <SelectItem value="download">Downloads</SelectItem>
            <SelectItem value="upload">Uploads</SelectItem>
            <SelectItem value="delete">Deletes</SelectItem>
            <SelectItem value="share">Shares</SelectItem>
            <SelectItem value="move">Moves</SelectItem>
            <SelectItem value="create_doc">Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No activity recorded yet</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const config = actionConfig[entry.action] || { label: entry.action, icon: Eye, color: "text-gray-500" };
              const Icon = config.icon;
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <Badge variant="outline" className="text-xs">{config.label}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{entry.file?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {entry.details?.docType && `Type: ${entry.details.docType}`}
                    {entry.details?.target && `To: ${entry.details.target}`}
                    {entry.details?.fromTemplate && `Template: ${entry.details.fromTemplate}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(entry.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AuditLogView;
