"use client";

import { useEffect, useRef, useState } from "react";
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

async function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  let json: { success: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error("Upload failed");
  }
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? "Upload failed");
  }
  return json.data;
}

interface PresignResponse {
  uploadUrl: string;
  fileUrl: string;
  fileName: string;
  contentType: string;
}

function putToR2(
  uploadUrl: string,
  file: File,
  contentType: string,
  fileName: string,
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    // Must exactly match what /api/upload/presign signed into the request —
    // R2 rejects the PUT with a signature mismatch otherwise.
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const onAbort = () => xhr.abort();
    signal.addEventListener("abort", onAbort);

    function cleanup() {
      signal.removeEventListener("abort", onAbort);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Upload failed"));
    };

    xhr.send(file);
  });
}

// Uploads go straight from the browser to R2 via a presigned URL — the file
// bytes never pass through a Vercel Function, which caps request/response
// bodies at 4.5MB (well under this app's own 10MB file / 5MB image ceilings).
// /api/upload/presign only exchanges small JSON metadata; /api/upload/confirm
// re-verifies the real uploaded object (size, and — for signature-checkable
// types — the actual bytes) before the app trusts it.
async function uploadFile(
  file: File,
  kind: UploadKind,
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<UploadedFile> {
  const presigned = await postJson<PresignResponse>(
    "/api/upload/presign",
    { fileName: file.name, mimeType: file.type, size: file.size, kind },
    signal
  );

  await putToR2(presigned.uploadUrl, file, presigned.contentType, presigned.fileName, onProgress, signal);

  const confirmed = await postJson<{ fileUrl: string; fileSize: number }>(
    "/api/upload/confirm",
    { fileUrl: presigned.fileUrl },
    signal
  );

  return { fileUrl: confirmed.fileUrl, fileName: presigned.fileName, fileSize: confirmed.fileSize };
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancels whatever upload/presign/confirm call is in flight (if any) when
  // this component unmounts — e.g. the Create Item dialog is closed or the
  // item drawer's edit mode is exited mid-upload. Without this the request
  // keeps running to completion in the background for no reason, and any
  // setState it triggers afterward would hit an unmounted component.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const constraint = FILE_CONSTRAINTS[kind];

  async function handleFile(file: File) {
    const validationError = validateFile(kind, file.name, file.type, file.size);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setProgress(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const uploaded = await uploadFile(file, kind, setProgress, controller.signal);
      if (!controller.signal.aborted) onChange(uploaded);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      if (!controller.signal.aborted) setProgress(null);
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
