import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import type { PdfReportInput } from "./pdf-report.types";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const LINE_HEIGHT = 14;
const BODY_SIZE = 11;
const TITLE_SIZE = 16;

@Injectable()
export class SimplePdfGenerator {
  private fontBytes: Uint8Array | null = null;

  /** @deprecated Use generateReport for multipage Unicode reports */
  generate(lines: string[]): Buffer {
    return Buffer.from(lines.join("\n"), "utf8");
  }

  async generateReport(input: PdfReportInput): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const font = await this.loadFont(pdf);
    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const modeLabel = input.analysisMode === "gemini" ? "REAL (Gemini)" : "MOCK";
    y = drawLine(page, font, input.title, MARGIN, y, TITLE_SIZE, true);
    y -= 4;
    y = drawLine(page, font, `Analysis mode: ${modeLabel}`, MARGIN, y, BODY_SIZE, false);
    y = drawLine(page, font, `Verdict: ${input.verdict}`, MARGIN, y, BODY_SIZE, false);
    y = drawLine(page, font, `Job: ${input.jobId}`, MARGIN, y, BODY_SIZE - 1, false);
    y = drawLine(page, font, `Contract: ${input.contractId}`, MARGIN, y, BODY_SIZE - 1, false);
    y -= 8;

    const sections: Array<[string, string]> = [
      ["Summary", input.summary],
      ["Price notes", input.priceNotes],
      ["Coverage notes", input.coverageNotes],
      ["Disclaimer", input.disclaimer],
    ];
    for (const [heading, body] of sections) {
      ({ page, y } = ensureSpace(pdf, page, font, y, LINE_HEIGHT * 2));
      y = drawLine(page, font, heading, MARGIN, y, BODY_SIZE + 1, true);
      ({ page, y } = drawWrapped(page, pdf, font, body, MARGIN, y));
      y -= 6;
    }

    if (input.risks.length) {
      ({ page, y } = ensureSpace(pdf, page, font, y, LINE_HEIGHT * 2));
      y = drawLine(page, font, "Risks", MARGIN, y, BODY_SIZE + 1, true);
      for (const risk of input.risks) {
        ({ page, y } = drawWrapped(page, pdf, font, `• ${risk}`, MARGIN, y));
      }
      y -= 6;
    }

    if (input.citations?.length) {
      ({ page, y } = ensureSpace(pdf, page, font, y, LINE_HEIGHT * 2));
      y = drawLine(page, font, "Citations", MARGIN, y, BODY_SIZE + 1, true);
      for (const citation of input.citations) {
        const label = `[${citation.documentId}${citation.page ? ` p.${citation.page}` : ""}] ${citation.excerpt}`;
        ({ page, y } = drawWrapped(page, pdf, font, label, MARGIN, y));
      }
    }

    if (input.limits?.length) {
      ({ page, y } = ensureSpace(pdf, page, font, y, LINE_HEIGHT * 2));
      y = drawLine(page, font, "Limits", MARGIN, y, BODY_SIZE + 1, true);
      for (const limit of input.limits) {
        ({ page, y } = drawWrapped(page, pdf, font, limit, MARGIN, y));
      }
    }

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }

  private async loadFont(pdf: PDFDocument): Promise<PDFFont> {
    if (!this.fontBytes) {
      const candidates = [
      join(__dirname, "..", "..", "assets", "DejaVuSans.ttf"),
      join(process.cwd(), "assets", "DejaVuSans.ttf"),
    ];
    const fontPath = candidates.find((path) => {
      try {
        readFileSync(path);
        return true;
      } catch {
        return false;
      }
    });
    if (!fontPath) {
      throw new Error("DejaVuSans.ttf not found — ensure apps/pdf-worker/assets is copied in build");
    }
    this.fontBytes = readFileSync(fontPath);
    }
    return pdf.embedFont(this.fontBytes);
  }
}

function drawLine(
  page: ReturnType<PDFDocument["addPage"]>,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  _bold: boolean,
): number {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: rgb(0.1, 0.12, 0.18),
  });
  return y - size - 4;
}

function drawWrapped(
  page: ReturnType<PDFDocument["addPage"]>,
  pdf: PDFDocument,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
): { page: ReturnType<PDFDocument["addPage"]>; y: number } {
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let cursorPage = page;
  let cursorY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, BODY_SIZE);
    if (width > maxWidth && line) {
      ({ page: cursorPage, y: cursorY } = ensureSpace(pdf, cursorPage, font, cursorY, LINE_HEIGHT));
      cursorY = drawLine(cursorPage, font, line, x, cursorY, BODY_SIZE, false);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    ({ page: cursorPage, y: cursorY } = ensureSpace(pdf, cursorPage, font, cursorY, LINE_HEIGHT));
    cursorY = drawLine(cursorPage, font, line, x, cursorY, BODY_SIZE, false);
  }
  return { page: cursorPage, y: cursorY };
}

function ensureSpace(
  pdf: PDFDocument,
  page: ReturnType<PDFDocument["addPage"]>,
  font: PDFFont,
  y: number,
  needed: number,
): { page: ReturnType<PDFDocument["addPage"]>; y: number } {
  if (y - needed >= MARGIN) {
    return { page, y };
  }
  const next = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { page: next, y: PAGE_HEIGHT - MARGIN };
}
