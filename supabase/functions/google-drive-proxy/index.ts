import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Get Google access token using OAuth2 refresh token
async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get Google access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

const ROOT_FOLDER_ID = () => Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID") ?? "root";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the user's JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { action, ...params } = await req.json();
    const accessToken = await getGoogleAccessToken();

    let result: any;

    switch (action) {
      case "list_files": {
        const folderId = params.folderId || ROOT_FOLDER_ID();
        const query = `'${folderId}' in parents and trashed = false`;
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink)&orderBy=folder,name&pageSize=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = await res.json();
        break;
      }

      case "create_folder": {
        const parentId = params.parentFolderId || ROOT_FOLDER_ID();
        const res = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: params.name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
          }),
        });
        const driveFolder = await res.json();

        // Save to Supabase
        const { data: folder, error: folderError } = await supabaseClient
          .from("file_folders")
          .insert({
            name: params.name,
            parent_folder_id: params.parentFolderDbId || null,
            google_drive_folder_id: driveFolder.id,
            created_by: user.id,
          })
          .select()
          .single();

        if (folderError) throw folderError;
        result = { ...driveFolder, dbRecord: folder };
        break;
      }

      case "upload_file": {
        const parentId = params.parentFolderId || ROOT_FOLDER_ID();
        const fileContent = Uint8Array.from(atob(params.fileBase64), (c) => c.charCodeAt(0));

        // Multipart upload to Google Drive
        const boundary = "-------314159265358979323846";
        const metadata = JSON.stringify({
          name: params.fileName,
          parents: [parentId],
        });

        const body = new Uint8Array([
          ...new TextEncoder().encode(
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${params.mimeType}\r\n\r\n`
          ),
          ...fileContent,
          ...new TextEncoder().encode(`\r\n--${boundary}--`),
        ]);

        const res = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
          }
        );
        const driveFile = await res.json();

        if (driveFile.error) throw new Error(driveFile.error.message);

        // Save metadata to Supabase
        const { data: fileRecord, error: fileError } = await supabaseClient
          .from("file_items")
          .insert({
            name: params.fileName,
            folder_id: params.folderDbId || null,
            google_drive_file_id: driveFile.id,
            mime_type: params.mimeType,
            file_size: fileContent.length,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (fileError) throw fileError;

        // Create initial version
        await supabaseClient.from("file_versions").insert({
          file_id: fileRecord.id,
          version_number: 1,
          google_drive_file_id: driveFile.id,
          file_size: fileContent.length,
          change_notes: "Initial upload",
          uploaded_by: user.id,
        });

        result = { ...driveFile, dbRecord: fileRecord };
        break;
      }

      case "download_file": {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const fileBlob = await res.arrayBuffer();
        const fileBase64 = base64Encode(new Uint8Array(fileBlob));
        result = { fileBase64, mimeType: res.headers.get("content-type") };
        break;
      }

      case "delete_file": {
        // Soft delete in Supabase
        await supabaseClient
          .from("file_items")
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
          .eq("id", params.fileDbId);

        // Trash in Google Drive
        await fetch(`https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trashed: true }),
        });

        result = { success: true };
        break;
      }

      case "delete_folder": {
        await supabaseClient
          .from("file_folders")
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
          .eq("id", params.folderDbId);

        await fetch(`https://www.googleapis.com/drive/v3/files/${params.googleDriveFolderId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trashed: true }),
        });

        result = { success: true };
        break;
      }

      case "restore_file": {
        await supabaseClient
          .from("file_items")
          .update({ is_deleted: false, deleted_at: null, deleted_by: null })
          .eq("id", params.fileDbId);

        await fetch(`https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trashed: false }),
        });

        result = { success: true };
        break;
      }

      case "permanently_delete": {
        await supabaseClient
          .from("file_items")
          .delete()
          .eq("id", params.fileDbId);

        await fetch(`https://www.googleapis.com/drive/v3/files/${params.googleDriveFileId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        result = { success: true };
        break;
      }

      case "search_files": {
        const query = `fullText contains '${params.query.replace(/'/g, "\\'")}' and trashed = false`;
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)&pageSize=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = await res.json();
        break;
      }

      case "get_storage_quota": {
        const res = await fetch(
          "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = await res.json();
        break;
      }

      case "update_file": {
        const fileContent = Uint8Array.from(atob(params.fileBase64), (c) => c.charCodeAt(0));

        const res = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${params.googleDriveFileId}?uploadType=media&fields=id,name,mimeType,size`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": params.mimeType,
            },
            body: fileContent,
          }
        );
        const updatedFile = await res.json();

        // Update version in Supabase
        const { data: fileRecord } = await supabaseClient
          .from("file_items")
          .select("current_version")
          .eq("id", params.fileDbId)
          .single();

        const newVersion = (fileRecord?.current_version || 0) + 1;

        await supabaseClient.from("file_items").update({
          current_version: newVersion,
          file_size: fileContent.length,
          updated_at: new Date().toISOString(),
        }).eq("id", params.fileDbId);

        await supabaseClient.from("file_versions").insert({
          file_id: params.fileDbId,
          version_number: newVersion,
          google_drive_file_id: params.googleDriveFileId,
          file_size: fileContent.length,
          change_notes: params.changeNotes || `Version ${newVersion}`,
          uploaded_by: user.id,
        });

        result = { ...updatedFile, version: newVersion };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
