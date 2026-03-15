import { useState } from "react";
import { getPublicUrl } from "./supabase";

interface UploadOptions {
  bucket: "avatars" | "task-attachments";
  path: string;
}

interface UploadResult {
  publicUrl: string;
  path: string;
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File, options: UploadOptions): Promise<UploadResult | null> {
    setIsUploading(true);
    setError(null);

    try {
      // 1. Get a signed upload URL from our API
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: options.bucket,
          path: options.path,
          contentType: file.type,
        }),
      });

      if (!signRes.ok) {
        const err = (await signRes.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to get upload URL");
      }

      const { signedUrl, path, maxBytes } = (await signRes.json()) as {
        signedUrl: string;
        path: string;
        maxBytes: number;
      };

      if (file.size > maxBytes) {
        throw new Error(`File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`);
      }

      // 2. PUT the file directly to Supabase
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const publicUrl = getPublicUrl(options.bucket, path);
      return { publicUrl, path };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  return { upload, isUploading, error, clearError: () => setError(null) };
}
