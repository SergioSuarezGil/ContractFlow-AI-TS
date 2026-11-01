import type { ContractDocument } from "../../../core/api/contracts.api";
import { FileDropzone } from "../../../shared/ui/FileDropzone";

interface DocumentPanelProps {
  documents: ContractDocument[];
  disabled?: boolean;
  onUpload: (files: File[], role: "current" | "proposal") => Promise<void>;
  onReject?: (message: string) => void;
}

export function DocumentPanel({
  documents,
  disabled,
  onUpload,
  onReject,
}: DocumentPanelProps) {
  const current = documents.filter((d) => d.role === "current");
  const proposals = documents.filter((d) => d.role === "proposal");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
        <p className="mt-1 text-xs text-slate-500">
          Drag and drop one or more files for the current contract and for proposals.
        </p>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-500">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <DocGroup title="Current" items={current} />
          <DocGroup title="Proposals" items={proposals} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FileDropzone
          label="Current documents"
          disabled={disabled}
          onReject={onReject}
          onFiles={(files) => onUpload(files, "current")}
        />
        <FileDropzone
          label="Proposal documents"
          disabled={disabled}
          onReject={onReject}
          onFiles={(files) => onUpload(files, "proposal")}
        />
      </div>
    </div>
  );
}

function DocGroup({ title, items }: { title: string; items: ContractDocument[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
          >
            <span className="truncate">
              {doc.fileName}{" "}
              <span className="text-xs text-slate-400">
                ({formatBytes(doc.sizeBytes)})
              </span>
            </span>
            <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
              {extensionOf(doc.fileName)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function extensionOf(fileName: string): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
  return (ext || "file").toLowerCase();
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
