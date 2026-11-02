import { Injectable } from "@nestjs/common";
import pdfParse from "pdf-parse";
import type { ExtractedDocument, ExtractedPage } from "./types";

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_CHARS = 200_000;
const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class DocumentExtractorService {
  private limits() {
    return {
      maxBytes: Number(process.env.MAX_DOCUMENT_BYTES ?? DEFAULT_MAX_BYTES),
      maxPages: Number(process.env.MAX_PDF_PAGES ?? DEFAULT_MAX_PAGES),
      maxChars: Number(process.env.MAX_EXTRACT_CHARS ?? DEFAULT_MAX_CHARS),
      timeoutMs: Number(process.env.EXTRACTION_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
    };
  }

  async extract(input: {
    documentId: string;
    fileName: string;
    role: "current" | "proposal";
    contentType: string;
    body: Buffer;
  }): Promise<ExtractedDocument> {
    const { maxBytes, maxPages, maxChars, timeoutMs } = this.limits();
    if (input.body.length > maxBytes) {
      throw new Error(`UNPROCESSABLE: document exceeds ${maxBytes} bytes`);
    }

    const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "";
    const isPdf =
      ext === "pdf" || input.contentType.toLowerCase().includes("pdf");
    const isTxt =
      ext === "txt" || input.contentType.toLowerCase().startsWith("text/plain");

    if (!isPdf && !isTxt) {
      throw new Error(
        `UNPROCESSABLE: only PDF and plain text extraction supported (got ${ext || input.contentType})`,
      );
    }

    const work = isPdf ? this.extractPdf(input.body, maxPages, maxChars) : this.extractTxt(input.body, maxChars);
    const pages = await withTimeout(work, timeoutMs);
    const fullText = pages.map((p) => `[doc:${input.documentId} p:${p.pageNumber}]\n${p.text}`).join("\n\n");
    if (!fullText.trim()) {
      throw new Error("UNPROCESSABLE: scanned PDF or empty document (no extractable text)");
    }
    return {
      documentId: input.documentId,
      fileName: input.fileName,
      role: input.role,
      contentType: input.contentType,
      pages,
      fullText,
    };
  }

  private async extractPdf(
    body: Buffer,
    maxPages: number,
    maxChars: number,
  ): Promise<ExtractedPage[]> {
    const parsed = await pdfParse(body, { max: maxPages });
    const raw = (parsed.text ?? "").slice(0, maxChars);
    if (!raw.trim()) {
      return [];
    }
    const pageCount = Math.min(parsed.numpages || 1, maxPages);
    return splitIntoPages(raw, pageCount);
  }

  private extractTxt(body: Buffer, maxChars: number): Promise<ExtractedPage[]> {
    const raw = body.toString("utf8").slice(0, maxChars);
    return Promise.resolve([{ pageNumber: 1, text: raw }]);
  }
}

function splitIntoPages(text: string, pageCount: number): ExtractedPage[] {
  if (pageCount <= 1) {
    return [{ pageNumber: 1, text }];
  }
  const chunkSize = Math.ceil(text.length / pageCount);
  const pages: ExtractedPage[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    const slice = text.slice(i * chunkSize, (i + 1) * chunkSize).trim();
    if (slice) {
      pages.push({ pageNumber: i + 1, text: slice });
    }
  }
  return pages.length ? pages : [{ pageNumber: 1, text }];
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("UNPROCESSABLE: extraction timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
