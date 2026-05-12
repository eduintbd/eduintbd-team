import { Folder, File, FileText, Image, FileSpreadsheet, Film, Music, Archive, MoreVertical, Download, Trash2, Eye, Share2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

interface FileGridProps {
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

const FileGrid = ({ folders, files, onFolderClick, onFilePreview, onFileDownload, onFileDelete, onFolderDelete, onFileShare }: FileGridProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {folders.map((folder) => (
        <Card
          key={`folder-${folder.id}`}
          className="cursor-pointer hover:bg-accent/50 transition-colors group"
          onClick={() => onFolderClick(folder.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <Folder className="h-10 w-10 text-blue-500 mb-2" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onFolderDelete(folder)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm font-medium truncate">{folder.name}</p>
            <p className="text-xs text-muted-foreground">Folder</p>
          </CardContent>
        </Card>
      ))}

      {files.map((file) => {
        const Icon = getFileIcon(file.mime_type);
        return (
          <Card
            key={`file-${file.id}`}
            className="cursor-pointer hover:bg-accent/50 transition-colors group"
            onClick={() => onFilePreview(file)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <Icon className="h-10 w-10 text-muted-foreground mb-2" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-3 w-3" />
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
              </div>
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.file_size)}</p>
              {file.tags && file.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {file.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag.name} variant="outline" className="text-[10px] px-1 py-0" style={{ borderColor: tag.color, color: tag.color }}>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {folders.length === 0 && files.length === 0 && (
        <div className="col-span-full py-12 text-center text-muted-foreground">
          <Folder className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>This folder is empty</p>
          <p className="text-sm">Upload files or create folders to get started</p>
        </div>
      )}
    </div>
  );
};

export default FileGrid;
