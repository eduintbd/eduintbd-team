import { Folder, File, FileText, Image, FileSpreadsheet, Film, Music, Archive, MoreVertical, Download, Trash2, Eye, Share2, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  file_size: number;
  google_drive_file_id: string;
  created_at: string;
  tags?: { name: string; color: string }[];
}

interface FolderItem {
  id: string;
  name: string;
  google_drive_folder_id: string;
  created_at: string;
}

interface FileListViewProps {
  folders: FolderItem[];
  files: FileItem[];
  onFolderClick: (folderId: string) => void;
  onFilePreview: (file: FileItem) => void;
  onFileDownload: (file: FileItem) => void;
  onFileDelete: (file: FileItem) => void;
  onFolderDelete: (folder: FolderItem) => void;
  onFileShare?: (file: FileItem) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed")) return Archive;
  return File;
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

const FileListView = ({ folders, files, onFolderClick, onFilePreview, onFileDownload, onFileDelete, onFolderDelete, onFileShare }: FileListViewProps) => {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>This folder is empty</p>
        <p className="text-sm">Upload files or create folders to get started</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {folders.map((folder) => (
          <TableRow
            key={`folder-${folder.id}`}
            className="cursor-pointer"
            onClick={() => onFolderClick(folder.id)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-blue-500 shrink-0" />
                <span className="font-medium truncate">{folder.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">Folder</TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(folder.created_at)}</TableCell>
            <TableCell></TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onFolderDelete(folder)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}

        {files.map((file) => {
          const Icon = getFileIcon(file.mime_type);
          return (
            <TableRow
              key={`file-${file.id}`}
              className="cursor-pointer"
              onClick={() => onFilePreview(file)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{file.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {file.mime_type.split("/").pop()?.toUpperCase()}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatSize(file.file_size)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatDate(file.created_at)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {file.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag.name} variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: tag.color, color: tag.color }}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onFilePreview(file)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileDownload(file)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    {onFileShare && (
                      <DropdownMenuItem onClick={() => onFileShare(file)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => window.open(`https://drive.google.com/file/d/${file.google_drive_file_id}/edit`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Drive
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileDelete(file)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default FileListView;
