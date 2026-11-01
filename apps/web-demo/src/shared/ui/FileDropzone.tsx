import { useCallback, useId, useRef, useState, type DragEvent } from "react";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_ACCEPT_HINT,
  partitionAllowedFiles,
} from "../files/allowed-documents";

export interface FileDropzoneProps {
  label: string;
  hint?: string;
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  onReject?: (message: string) => void;
}

export function FileDropzone({
  label,
  hint = DOCUMENT_ACCEPT_HINT,
  disabled = false,
  multiple = true,
  onFiles,
  onReject,
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);

  const handleFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list || disabled || pending) return;
      const files = Array.from(list);
      if (files.length === 0) return;
      const { accepted, rejected } = partitionAllowedFiles(files);
      if (rejected.length > 0) {
        onReject?.(
          `Skipped ${rejected.length} file(s): only ${DOCUMENT_ACCEPT_HINT} up to 15 MB.`,
        );
      }
      if (accepted.length === 0) return;
      setPending(true);
      try {
        await onFiles(accepted);
      } finally {
        setPending(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, pending, onFiles, onReject],
  );

  const onDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  };

  return (
    <label
      htmlFor={inputId}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
        dragging
          ? "border-teal-500 bg-teal-50"
          : "border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/40",
        disabled || pending ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={DOCUMENT_ACCEPT}
        multiple={multiple}
        disabled={disabled || pending}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <span className="mt-1 max-w-sm text-xs text-slate-500">
        {pending ? "Uploading…" : `Drop files here or click to browse · ${hint}`}
      </span>
    </label>
  );
}
