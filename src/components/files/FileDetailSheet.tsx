import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, ExternalLink, FileText, Image, Film, File, Clock, User, HardDrive } from "lucide-react";

interface FileVersion {
  id: string;
  version_number: number;
  file_size: number;
  change_notes: string | null;
  created_at: string;
}

interface FileDetail {
  id: string;
  name: string;
  mime_type: string;
  file_size: number;
  description: string | null;
  current_version: number;
  google_drive_file_id: string;
  created_at: string;
  updated_at: string;
  tags?: { name: string; color: string }[];
}

interface FileDetailSheetProps {
  file: FileDetail | null;
  versions: FileVersion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
  onNewVersion: () => void;
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPreviewUrl(googleDriveFileId: string, mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return `https://drive.google.com/thumbnail?id=${googleDriveFileId}&sz=w600`;
  }
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("presentation") || mimeType.includes("spreadsheet")) {
    return `https://drive.google.com/file/d/${googleDriveFileId}/preview`;
  }
  return null;
}

const FileDetailSheet = ({ file, versions, open, onOpenChange, onDownload, onNewVersion }: FileDetailSheetProps) => {
  if (!file) return null;

  const previewUrl = getPreviewUrl(file.google_drive_file_id, file.mime_type);
  const isImage = file.mime_type.startsWith("image/");
  const isEmbeddable = previewUrl && !isImage;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">{file.name}</span>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
            <TabsTrigger value="versions" className="flex-1">Versions ({versions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* File info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Type:</span>
                <span>{file.mime_type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Size:</span>
                <span>{formatSize(file.file_size)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(file.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Modified:</span>
                <span>{formatDate(file.updated_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Version:</span>
                <span>v{file.current_version}</span>
              </div>
            </div>

            {file.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{file.description}</p>
                </div>
              </>
            )}

            {file.tags && file.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {file.tags.map((tag) => (
                      <Badge key={tag.name} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex gap-2">
              <Button onClick={onDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={onNewVersion} className="flex-1">
                Upload New Version
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(`https://drive.google.com/file/d/${file.google_drive_file_id}/view`, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Drive
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {isImage && previewUrl && (
              <img
                src={previewUrl}
                alt={file.name}
                className="w-full rounded-lg border"
              />
            )}
            {isEmbeddable && (
              <iframe
                src={previewUrl}
                className="w-full h-[500px] rounded-lg border"
                title={file.name}
                allow="autoplay"
              />
            )}
            {!previewUrl && (
              <div className="py-12 text-center text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Preview not available for this file type</p>
                <Button variant="outline" className="mt-3" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to view
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="versions" className="mt-4 space-y-3">
            {versions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No version history</p>
            )}
            {versions.map((v) => (
              <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium">v{v.version_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{v.change_notes || `Version ${v.version_number}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(v.created_at)} &middot; {formatSize(v.file_size)}
                  </p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default FileDetailSheet;
