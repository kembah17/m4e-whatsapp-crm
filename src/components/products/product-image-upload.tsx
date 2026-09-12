"use client";

import { useState, useRef, useCallback } from "react";
import { uploadAccountMedia, deleteAccountMedia, MEDIA_MAX_BYTES_BY_KIND } from "@/lib/storage/upload-media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload,
  X,
  Loader2,
  ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import Image from "next/image";

const BUCKET = "product-media";
const MAX_SIZE = MEDIA_MAX_BYTES_BY_KIND.image; // 5 MB
const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

interface ProductImageUploadProps {
  value: string; // current image_url
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function ProductImageUpload({
  value,
  onChange,
  disabled = false,
}: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  // Track the storage path so we can delete on replace
  const [storagePath, setStoragePath] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`Image must be under ${Math.round(MAX_SIZE / 1024 / 1024)} MB`);
        return;
      }

      setUploading(true);
      try {
        // Delete previous upload if it was from storage
        if (storagePath) {
          try {
            await deleteAccountMedia(BUCKET, storagePath);
          } catch {
            // Best-effort cleanup
          }
        }

        const result = await uploadAccountMedia(BUCKET, file);
        onChange(result.publicUrl);
        setStoragePath(result.path);
        toast.success("Image uploaded");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [onChange, storagePath],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, uploading, handleFile],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled || uploading) return;
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    },
    [disabled, uploading, handleFile],
  );

  const handleRemove = useCallback(async () => {
    if (storagePath) {
      try {
        await deleteAccountMedia(BUCKET, storagePath);
      } catch {
        // Best-effort
      }
      setStoragePath(null);
    }
    onChange("");
  }, [onChange, storagePath]);

  const handleUrlSubmit = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }
    onChange(url);
    setStoragePath(null); // External URL, no storage path
    setUrlInput("");
    setShowUrlInput(false);
    toast.success("Image URL set");
  }, [urlInput, onChange]);

  // Has an image
  if (value) {
    return (
      <div className="space-y-1.5">
        <Label>Product Image</Label>
        <div className="relative group rounded-lg border border-border overflow-hidden bg-muted/50">
          <div className="relative w-full h-40 flex items-center justify-center">
            <Image
              src={value}
              alt="Product"
              fill
              className="object-contain p-2"
              unoptimized
            />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1 rounded-full bg-card/80 text-muted-foreground hover:text-red-400 hover:bg-card opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // No image — show upload zone
  return (
    <div className="space-y-1.5">
      <Label>Product Image</Label>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onPaste={handlePaste}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer
          ${dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-border bg-muted/30"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onClick={() => !disabled && !uploading && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = ""; // Reset so same file can be re-selected
          }}
        />

        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/50">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Drop image here, click to browse, or paste
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                PNG, JPG, WebP, GIF — max 5 MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* URL fallback */}
      {!showUrlInput ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowUrlInput(true);
          }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-muted-foreground transition-colors"
          disabled={disabled}
        >
          <LinkIcon className="h-3 w-3" />
          Or paste an image URL
        </button>
      ) : (
        <div className="flex gap-1.5">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="h-7 text-xs bg-muted/50 border-border"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={handleUrlSubmit}
          >
            Set
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-1.5"
            onClick={() => {
              setShowUrlInput(false);
              setUrlInput("");
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
