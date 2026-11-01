import { ValidationError } from "../shared/domain-error";

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "xlsx",
  "xls",
  "csv",
  "md",
  "txt",
  "docx",
]);

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/csv",
  "application/csv",
  "application/octet-stream", // browsers sometimes omit a precise MIME; extension still checked
]);

export function assertAllowedDocumentUpload(
  fileName: string,
  contentType: string,
): void {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase().trim()
    : "";
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new ValidationError(
      `Unsupported file type '.${ext || "unknown"}'. Allowed: pdf, xlsx, xls, csv, md, txt, docx`,
    );
  }

  const mime = (contentType || "").split(";")[0]?.trim().toLowerCase() || "";
  if (mime && !ALLOWED_CONTENT_TYPES.has(mime)) {
    throw new ValidationError(
      `Unsupported content type '${contentType}'. Allowed: PDF, Excel, CSV, Markdown, text, Word`,
    );
  }
}
