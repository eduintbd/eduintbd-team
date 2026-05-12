import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Plus,
  FilePlus,
  Files,
  ScrollText,
  BookTemplate,
  ShieldCheck,
  Link2,
} from "lucide-react";
import FileBreadcrumbs from "@/components/files/FileBreadcrumbs";
import FileGrid from "@/components/files/FileGrid";
import FileListView from "@/components/files/FileListView";
import FileUploadDialog from "@/components/files/FileUploadDialog";
import BulkUploadDialog from "@/components/files/BulkUploadDialog";
import CreateFolderDialog from "@/components/files/CreateFolderDialog";
import CreateDocDialog from "@/components/files/CreateDocDialog";
import FileDetailSheet from "@/components/files/FileDetailSheet";
import FileShareDialog from "@/components/files/FileShareDialog";
import TrashView from "@/components/files/TrashView";
import RecentFilesView from "@/components/files/RecentFilesView";
import AuditLogView from "@/components/files/AuditLogView";
import TemplatesView from "@/components/files/TemplatesView";
import ApprovalWorkflow from "@/components/files/ApprovalWorkflow";

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
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);

  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingDoc, setCreatingDoc] = useState(false);

  const [totalFiles, setTotalFiles] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [recentUploads, setRecentUploads] = useState(0);
  const [trashCount, setTrashCount] = useState(0);

  useEffect(() => {
    fetchContents();
    fetchStats();
    fetchUserRoles();
  }, [currentFolderId]);

  const fetchUserRoles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    setUserRoles(rolesData?.map((r) => r.role) || []);
  };

  const fetchContents = async () => {
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
    if (folderError) toast.error("Error loading folders");
    else setFolders(folderData || []);

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
        if (id === folderId) setCurrentDriveFolderId(data.google_drive_folder_id);
        id = data.parent_folder_id;
      } else break;
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

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (file: File, description?: string) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const fileBase64 = await readFileAsBase64(file);
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

  const handleBulkUpload = async (fileList: File[]) => {
    let success = 0;
    let failed = 0;
    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 10MB limit, skipped`);
        failed++;
        continue;
      }
      try {
        const fileBase64 = await readFileAsBase64(file);
        await callDriveProxy("upload_file", {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64,
          parentFolderId: currentDriveFolderId,
          folderDbId: currentFolderId,
        });
        success++;
      } catch {
        failed++;
      }
    }
    toast.success(`Uploaded ${success} files${failed > 0 ? `, ${failed} failed` : ""}`);
    fetchContents();
    fetchStats();
  };

  const handleCreateDoc = async (name: string, docType: string) => {
    setCreatingDoc(true);
    try {
      const result = await callDriveProxy("create_google_doc", {
        name,
        docType,
        parentFolderId: currentDriveFolderId,
        folderDbId: currentFolderId,
      });
      toast.success(`"${name}" created`);
      setCreateDocOpen(false);
      fetchContents();
      fetchStats();
      // Open in new tab
      if (result?.id) {
        const urls: Record<string, string> = {
          "application/vnd.google-apps.document": `https://docs.google.com/document/d/${result.id}/edit`,
          "application/vnd.google-apps.spreadsheet": `https://docs.google.com/spreadsheets/d/${result.id}/edit`,
          "application/vnd.google-apps.presentation": `https://docs.google.com/presentation/d/${result.id}/edit`,
          "application/vnd.google-apps.form": `https://docs.google.com/forms/d/${result.id}/edit`,
        };
        const url = urls[result.mimeType];
        if (url) window.open(url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create document");
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleCreateFromTemplate = async (template: any, name: string) => {
    try {
      if (template.google_drive_file_id) {
        await callDriveProxy("create_from_template", {
          templateDriveId: template.google_drive_file_id,
          templateName: template.name,
          name,
          parentFolderId: currentDriveFolderId,
          folderDbId: currentFolderId,
        });
      } else {
        await handleCreateDoc(name, template.template_type);
        return;
      }
      toast.success(`"${name}" created from template`);
      fetchContents();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to create from template");
    }
  };

  const handleFilePreview = async (file: any) => {
    const fileItem = file as FileItem;
    setSelectedFile(fileItem);

    // Log view activity
    try {
      await callDriveProxy("log_activity", {
        fileId: fileItem.id,
        activityType: "view",
        details: { name: fileItem.name },
      });
    } catch {}

    const { data: versions } = await supabase
      .from("file_versions")
      .select("*")
      .eq("file_id", fileItem.id)
      .order("version_number", { ascending: false });
    setFileVersions(versions || []);
    setDetailOpen(true);
  };

  const handleFileDownload = async (file: FileItem) => {
    try {
      await callDriveProxy("log_activity", {
        fileId: file.id,
        activityType: "download",
        details: { name: file.name },
      });

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

  const handleShareFile = (file: FileItem) => {
    setShareFile(file);
    setShareOpen(true);
  };

  const formatStorageSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">File Management</h1>
          <p className="text-muted-foreground">
            Manage your organization's files with Google Drive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateDocOpen(true)}>
                <FilePlus className="h-4 w-4 mr-2" />
                Google Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkUploadOpen(true)}>
                <Files className="h-4 w-4 mr-2" />
                Bulk Upload
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="files">
              <FolderOpen className="h-4 w-4 mr-1" />
              Files
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Clock className="h-4 w-4 mr-1" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="templates">
              <BookTemplate className="h-4 w-4 mr-1" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <ShieldCheck className="h-4 w-4 mr-1" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="audit">
              <ScrollText className="h-4 w-4 mr-1" />
              Activity
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
          <FileBreadcrumbs breadcrumbs={breadcrumbs} onNavigate={navigateToFolder} />
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
                  onFileShare={handleShareFile}
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
                  onFileShare={handleShareFile}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <RecentFilesView onFileClick={handleFilePreview} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <TemplatesView
                onCreateFromTemplate={handleCreateFromTemplate}
                onCreateBlank={handleCreateDoc}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <ApprovalWorkflow userRoles={userRoles} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <AuditLogView />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trash" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <TrashView
                onAction={callDriveProxy}
                onRefresh={() => { fetchContents(); fetchStats(); }}
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

      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onUpload={handleBulkUpload}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSubmit={handleCreateFolder}
        loading={creatingFolder}
      />

      <CreateDocDialog
        open={createDocOpen}
        onOpenChange={setCreateDocOpen}
        onSubmit={handleCreateDoc}
        loading={creatingDoc}
      />

      <FileDetailSheet
        file={selectedFile}
        versions={fileVersions}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDownload={() => selectedFile && handleFileDownload(selectedFile)}
        onNewVersion={() => { setDetailOpen(false); setUploadOpen(true); }}
      />

      {shareFile && (
        <FileShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          fileId={shareFile.id}
          fileName={shareFile.name}
          googleDriveFileId={shareFile.google_drive_file_id}
          onShare={(params) => callDriveProxy("share_file", params)}
          onUnshare={(params) => callDriveProxy("unshare_file", params)}
        />
      )}
    </div>
  );
};

export default FileManagement;
