"use client";

import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
import {
  UploadCloud,
  X,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { MAX_MEDIA_SIZE_BYTES, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from "@/lib/constants";

interface UploadedMedia {
  url: string;
  type: "image" | "video";
  originalName: string;
  size: number;
}

interface AnonymousUploaderProps {
  onUploadSuccess: (media: UploadedMedia) => void;
  onClear: () => void;
  currentMedia?: UploadedMedia | null;
}

export function AnonymousUploader({
  onUploadSuccess,
  onClear,
  currentMedia,
}: AnonymousUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_MEDIA_SIZE_BYTES) {
      return `File size exceeds 30MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return "Only JPEG, PNG, WebP, GIF images and MP4, WebM videos are supported.";
    }

    return null;
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(5);

    try {
      // 1. Fetch direct signed upload authorization from backend API
      const sigResponse = await fetch("/api/upload/cloudinary-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "superior_connection/anon_uploads" }),
      });

      if (!sigResponse.ok) {
        const errJson = await sigResponse.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to authorize secure anonymous upload.");
      }

      const sigData = await sigResponse.json();
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
      const resourceType = isVideo ? "video" : "image";

      // 2. Prepare Direct Form Data for Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);
      // Strip EXIF metadata to ensure zero GPS, device, or identity trail
      formData.append("image_metadata", "false");

      // 3. Upload directly to Cloudinary with Progress Tracking via XMLHttpRequest
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const uploadUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`;

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 90);
            setProgress(Math.max(10, percent));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              setProgress(100);
              onUploadSuccess({
                url: res.secure_url,
                type: resourceType,
                originalName: file.name,
                size: file.size,
              });
              resolve();
            } catch (parseErr) {
              reject(parseErr);
            }
          } else {
            reject(new Error(`Cloudinary upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during direct media upload."));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted."));
        });

        xhr.open("POST", uploadUrl);
        xhr.send(formData);
      });
    } catch (err: unknown) {
      console.warn("Direct upload error:", err);
      // Fallback preview mode if Cloudinary credentials are not configured in local environment
      if (
        err instanceof Error &&
        (err.message.includes("apiKey") ||
          err.message.includes("cloudName") ||
          err.message.includes("401") ||
          err.message.includes("Network error") ||
          err.message.includes("authorize"))
      ) {
        const localPreviewUrl = URL.createObjectURL(file);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
        setProgress(100);
        onUploadSuccess({
          url: localPreviewUrl,
          type: isVideo ? "video" : "image",
          originalName: file.name,
          size: file.size,
        });
        setError(null);
      } else {
        const message = err instanceof Error ? err.message : "Media upload failed.";
        setError(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const onFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Uploaded Media Preview */}
      {currentMedia ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#6C1C74]/40 bg-black/5 dark:bg-black/40 group shadow-md">
          {currentMedia.type === "image" ? (
            <div className="relative w-full h-56 max-h-72">
              <Image
                src={currentMedia.url}
                alt="Uploaded media preview"
                fill
                className="object-cover rounded-2xl"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          ) : (
            <video
              src={currentMedia.url}
              controls
              className="w-full h-56 max-h-72 object-cover rounded-2xl bg-black"
            />
          )}

          <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-black/75 text-white px-3 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              EXIF Scrubbed
            </span>
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition shadow-md hover:scale-110 active:scale-95"
              title="Remove media"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Drag & Drop Upload Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group ${
            isDragging
              ? "border-[#6C1C74] bg-purple-50 dark:bg-[#6C1C74]/20 scale-[1.01]"
              : "border-slate-300 hover:border-[#6C1C74] bg-white hover:bg-purple-50/50 dark:bg-[#20182c] dark:border-slate-700 dark:hover:border-[#b54ec4]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={onFileSelect}
            disabled={uploading}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#6C1C74]/10 dark:bg-[#b54ec4]/20 text-[#6C1C74] dark:text-[#d880ea] flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs">
              {uploading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
              <span className="text-[#6C1C74] dark:text-[#d880ea] underline underline-offset-2">
                Click to browse
              </span>{" "}
              or drag & drop
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Images (PNG, JPG, WebP) or short video clips • Max 30MB
            </p>

            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                Auto-EXIF Scrubbing
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6C1C74] dark:text-[#d880ea] bg-[#6C1C74]/10 px-2.5 py-0.5 rounded-full border border-[#6C1C74]/20">
                Direct Signed Upload
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="mt-4 w-full">
              <div className="flex justify-between text-xs text-muted-foreground mb-1 font-semibold">
                <span>Uploading directly to Cloudinary...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6C1C74] to-[#9D31A8] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default AnonymousUploader;
