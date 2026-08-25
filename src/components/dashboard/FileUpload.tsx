"use client";

import { useRef, useState } from "react";
import { File as FileIcon, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FILE_CONSTRAINTS, formatFileSize, validateFile, type UploadKind } from "@/lib/file-constraints";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

function uploadFile(
  file: File,
  kind: UploadKind,
  onProgress: (percent: number) => void
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let body: { success: boolean; data?: UploadedFile; error?: string };
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Upload failed"));
        return;
      }
      if (xhr.status !== 200 || !body.success || !body.data) {
        reject(new Error(body.error ?? "Upload failed"));
        return;
      }
      resolve(body.data);
    };

    xhr.onerror = () => reject(new Error("Upload failed"));

    xhr.send(formData);
  });
}

export function FileUpload({
  kind,
  value,
  onChange,
}: {
  kind: UploadKind;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const constraint = FILE_CONSTRAINTS[kind];

  async function handleFile(file: File) {
    const validationError = validateFile(kind, file.name, file.type, file.size);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setProgress(0);

    try {
      const uploaded = await uploadFile(file, kind, setProgress);
      onChange(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  }

  function handleRemove() {
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-[5px] p-3">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.fileUrl}
            alt={value.fileName}
            className="size-12 shrink-0 rounded-[5px] border-b-4 border-border object-cover"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-[5px] border-b-4 border-border bg-muted">
            <FileIcon className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{value.fileName}</span>
          <span className="text-xs text-muted-foreground">{formatFileSize(value.fileSize)}</span>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={handleRemove}>
          <X className="size-4" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        disabled={progress !== null}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-[5px] border border-dashed border-border p-6 text-center transition-colors sm:min-h-[200px]",
          isDragging && "border-primary bg-accent",
          progress === null && "hover:border-primary hover:bg-accent"
        )}
      >
        {progress !== null ? (
          <>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <Progress value={progress} className="w-full max-w-40" />
          </>
        ) : (
          <>
            <UploadCloud className="size-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drag and drop or click to upload
            </span>
            <span className="text-xs text-muted-foreground">
              {constraint.extensions.join(", ")} — up to{" "}
              {constraint.maxSizeBytes / (1024 * 1024)}MB
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={constraint.extensions.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
