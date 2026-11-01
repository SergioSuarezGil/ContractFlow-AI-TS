/** Browser accept attribute + client-side allowlist for contract documents. */
export const DOCUMENT_ACCEPT =
  ".pdf,.xlsx,.xls,.csv,.md,.txt,.docx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "xlsx",
  "xls",
  "csv",
  "md",
  "txt",
  "docx",
]);

const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/csv",
  "application/csv",
];

export const DOCUMENT_ACCEPT_HINT =
  "PDF, Excel (.xlsx/.xls), CSV, Markdown (.md), plain text (.txt), Word (.docx)";

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export function isAllowedDocument(file: File): boolean {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;
  const mime = (file.type || "").toLowerCase();
  if (!mime) return false;
  return ALLOWED_MIME_PREFIXES.some((allowed) => mime === allowed || mime.startsWith(`${allowed};`));
}

export function partitionAllowedFiles(files: File[]): {
  accepted: File[];
  rejected: File[];
} {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES || !isAllowedDocument(file)) {
      rejected.push(file);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}
