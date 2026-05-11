import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FolderOpen,
  Upload,
  FolderPlus,
  Search,
  LayoutGrid,
  List,
  FileText,
  HardDrive,
  Clock,
  Trash2,
} from "lucide-react";
import FileBreadcrumbs from "@/components/files/FileBreadcrumbs";
import FileGrid from "@/components/files/FileGrid";
import FileListView from "@/components/files/FileListView";
import FileUploadDialog from "@/components/files/FileUploadDialog";
import CreateFolderDialog from "@/components/files/CreateFolderDialog";
import FileDetailSheet from "@/components/files/FileDetailSheet";
import FileTagManager from "@/components/files/FileTagManager";
import TrashView from "@/components/files/TrashView";

interface FolderItem {
  id: string;
  name: string;
  parent_folder_id: string | null;
  google_drive_folder_id: string;
  created_at: string;
}

interface FileItem {
  id: string;
  name: string;
  folder_id: string | null;
  google_drive_file_id: string;
  mime_type: string;
  file_size: number;
  description: string | null;
  current_version: number;
  created_at: string;
  updated_at: string;
  tags?: { name: string; color: string }[];
}

interface FileVersion {
  id: string;
  version_number: number;
  file_size: number;
  change_notes: string | null;
  created_at: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const FileManagement = () => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentDriveFolderId, setCurrentDriveFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("files");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [totalFiles, setTotalFiles] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [recentUploads, setRecentUploads] = useState(0);
  const [trashCount, setTrashCount] = useState(0);

  useEffect(() => {
    fetchContents();
    fetchStats();
  }, [currentFolderId]);

  const fetchContents = async () => {
    // Fetch folders
    let folderQuery = supabase
      .from("file_folders")
      .select("*")
      .eq("is_deleted", false)
      .order("name");

    if (currentFolderId) {
      folderQuery = folderQuery.eq("parent_folder_id", currentFolderId);
    } else {
      folderQuery = folderQuery.is("parent_folder_id", null);
    }

    const { data: folderData, error: folderError } = await folderQuery;
    if (folderError) {
      toast.error("Error loading folders");
    } else {
      setFolders(folderData || []);
    }

    // Fetch files
    let fileQuery = supabase
      .from("file_items")
      .select("*")
      .eq("is_deleted", false)
      .order("name");

    if (currentFolderId) {
      fileQuery = fileQuery.eq("folder_id", currentFolderId);
    } else {
      fileQuery = fileQuery.is("folder_id", null);
    }

    const { data: fileData, error: fileError } = await fileQuery;
    if (fileError) {
      toast.error("Error loading files");
    } else {
      // Fetch tags for each file
      const filesWithTags = await Promise.all(
        (fileData || []).map(async (file) => {
          const { data: tagData } = await supabase
            .from("file_item_tags")
            .select("tag_id")
            .eq("file_id", file.id);

          if (tagData && tagData.length > 0) {
            const tagIds = tagData.map((t) => t.tag_id);
            const { data: tags } = await supabase
              .from("file_tags")
              .select("name, color")
              .in("id", tagIds);
            return { ...file, tags: tags || [] };
          }
          return { ...file, tags: [] };
        })
      );
      setFiles(filesWithTags);
    }
  };

  const fetchStats = async () => {
    const { count: total } = await supabase
      .from("file_items")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false);
    setTotalFiles(total || 0);

    const { data: sizeData } = await supabase
      .from("file_items")
      .select("file_size")
      .eq("is_deleted", false);
    setStorageUsed(sizeData?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabase
      .from("file_items")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .gte("created_at", oneDayAgo);
    setRecentUploads(recent || 0);

    const { count: trash } = await supabase
      .from("file_items")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", true);
    setTrashCount(trash || 0);
  };

  const navigateToFolder = async (folderId: string | null) => {
    setCurrentFolderId(folderId);

    if (!folderId) {
      setBreadcrumbs([]);
      setCurrentDriveFolderId(null);
      return;
    }

    // Build breadcrumbs by walking up
    const crumbs: BreadcrumbItem[] = [];
    let id: string | null = folderId;
    while (id) {
      const { data } = await supabase
        .from("file_folders")
        .select("id, name, parent_folder_id, google_drive_folder_id")
        .eq("id", id)
        .single();

      if (data) {
        crumbs.unshift({ id: data.id, name: data.name });
        if (id === folderId) {
          setCurrentDriveFolderId(data.google_drive_folder_id);
        }
        id = data.parent_folder_id;
      } else {
        break;
      }
    }
    setBreadcrumbs(crumbs);
  };

  const callDriveProxy = async (action: string, params: any) => {
    const { data, error } = await supabase.functions.invoke("google-drive-proxy", {
      body: { action, ...params },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleCreateFolder = async (name: string) => {
    setCreatingFolder(true);
    try {
      await callDriveProxy("create_folder", {
        name,
        parentFolderId: currentDriveFolderId,
        parentFolderDbId: currentFolderId,
      });
      toast.success(`Folder "${name}" created`);
      setCreateFolderOpen(false);
      fetchContents();
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUpload = async (file: File, description?: string) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await callDriveProxy("upload_file", {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBase64,
        parentFolderId: currentDriveFolderId,
        folderDbId: currentFolderId,
        description,
      });

      toast.success(`"${file.name}" uploaded successfully`);
      setUploadOpen(false);
      fetchContents();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleFilePreview = async (file: FileItem) => {
    setSelectedFile(file);

    // Fetch versions
    const { data: versions } = await supabase
      .from("file_versions")
      .select("*")
      .eq("file_id", file.id)
      .order("version_number", { ascending: false });

    setFileVersions(versions || []);
    setDetailOpen(true);
  };

  const handleFileDownload = async (file: FileItem) => {
    try {
      const data = await callDriveProxy("download_file", {
        googleDriveFileId: file.google_drive_file_id,
      });

      const byteArray = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: data.mimeType || file.mime_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded "${file.name}"`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download file");
    }
  };

  const handleFileDelete = async (file: FileItem) => {
    try {
      await callDriveProxy("delete_file", {
        fileDbId: file.id,
        googleDriveFileId: file.google_drive_file_id,
      });
      toast.success(`"${file.name}" moved to trash`);
      fetchContents();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file");
    }
  };

  const handleFolderDelete = async (folder: FolderItem) => {
    try {
      await callDriveProxy("delete_folder", {
        folderDbId: folder.id,
        googleDriveFolderId: folder.google_drive_folder_id,
      });
      toast.success(`Folder "${folder.name}" deleted`);
      fetchContents();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete folder");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchContents();
      return;
    }
    try {
      const data = await callDriveProxy("search_files", { query: searchQuery });
      // Match search results with our DB records
      if (data?.files) {
        const driveIds = data.files.map((f: any) => f.id);
        const { data: dbFiles } = await supabase
          .from("file_items")
          .select("*")
          .eq("is_deleted", false)
          .in("google_drive_file_id", driveIds);
        setFiles(dbFiles || []);
        setFolders([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    }
  };

  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">File Management</h1>
          <p className="text-muted-foreground">
            Manage your organization's files with Google Drive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFiles}</p>
              <p className="text-xs text-muted-foreground">Total Files</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatStorageSize(storageUsed)}</p>
              <p className="text-xs text-muted-foreground">Storage Used</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{recentUploads}</p>
              <p className="text-xs text-muted-foreground">Recent (24h)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trashCount}</p>
              <p className="text-xs text-muted-foreground">In Trash</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="files">
              <FolderOpen className="h-4 w-4 mr-1" />
              Files
            </TabsTrigger>
            <TabsTrigger value="trash">
              <Trash2 className="h-4 w-4 mr-1" />
              Trash
            </TabsTrigger>
          </TabsList>

          {activeTab === "files" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-[200px] h-9"
                />
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <TabsContent value="files" className="mt-4 space-y-4">
          {/* Breadcrumbs */}
          <FileBreadcrumbs
            breadcrumbs={breadcrumbs}
            onNavigate={navigateToFolder}
          />

          {/* File/Folder listing */}
          <Card>
            <CardContent className="p-4">
              {viewMode === "grid" ? (
                <FileGrid
                  folders={folders}
                  files={files}
                  onFolderClick={navigateToFolder}
                  onFilePreview={handleFilePreview}
                  onFileDownload={handleFileDownload}
                  onFileDelete={handleFileDelete}
                  onFolderDelete={handleFolderDelete}
                />
              ) : (
                <FileListView
                  folders={folders}
                  files={files}
                  onFolderClick={navigateToFolder}
                  onFilePreview={handleFilePreview}
                  onFileDownload={handleFileDownload}
                  onFileDelete={handleFileDelete}
                  onFolderDelete={handleFolderDelete}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trash" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <TrashView
                onAction={callDriveProxy}
                onRefresh={() => {
                  fetchContents();
                  fetchStats();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <FileUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
        loading={uploading}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSubmit={handleCreateFolder}
        loading={creatingFolder}
      />

      <FileDetailSheet
        file={selectedFile}
        versions={fileVersions}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDownload={() => selectedFile && handleFileDownload(selectedFile)}
        onNewVersion={() => {
          setDetailOpen(false);
          setUploadOpen(true);
        }}
      />
    </div>
  );
};

export default FileManagement;
