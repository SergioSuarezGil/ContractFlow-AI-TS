import type { AnalysisCitation } from "./contract-analysis.schema";
import type { ExtractedDocument } from "./extraction/types";

export function verifyCitations(
  citations: AnalysisCitation[],
  documents: ExtractedDocument[],
): { ok: true } | { ok: false; reason: string } {
  const byId = new Map(documents.map((d) => [d.documentId, d]));
  for (const citation of citations) {
    const doc = byId.get(citation.documentId);
    if (!doc) {
      return { ok: false, reason: `Citation references unknown document ${citation.documentId}` };
    }
    const haystack = citation.page
      ? doc.pages.find((p) => p.pageNumber === citation.page)?.text ?? ""
      : doc.fullText;
    const needle = citation.excerpt.trim();
    if (!needle || !normalize(haystack).includes(normalize(needle))) {
      return {
        ok: false,
        reason: `Citation excerpt not found in document ${citation.documentId}`,
      };
    }
  }
  return { ok: true };
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
