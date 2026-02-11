"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface CsvUploadZoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export function CsvUploadZone({ onFileAccepted, disabled }: CsvUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onFileAccepted(file);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-12 w-12 text-muted-foreground" />
      <p className="mt-4 text-center text-muted-foreground">
        {isDragActive
          ? "放開以上傳 CSV 檔案"
          : "拖曳 CSV 檔案至此，或點擊選擇檔案"}
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        僅接受 .csv 格式，建議使用 UTF-8 編碼
      </p>
    </div>
  );
}
