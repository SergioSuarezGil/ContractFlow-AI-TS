import { Injectable } from "@nestjs/common";
import {
  PROMPT_VERSION,
  SCHEMA_VERSION,
  contractAnalysisSchema,
  type ContractAnalysisStructured,
} from "../../application/contract-analysis.schema";
import type {
  ContractAnalyzerPort,
  ContractAnalyzerResult,
} from "../../application/ports/contract-analyzer.port";
import { verdictFromPrices } from "../../application/money-comparison";
import type { RedactedExtractedBundle } from "../../application/extraction/types";

const MODEL = "mock-contract-analyzer-v1";

@Injectable()
export class MockContractAnalyzer implements ContractAnalyzerPort {
  async analyze(bundle: RedactedExtractedBundle): Promise<ContractAnalyzerResult> {
    const current = bundle.documents.filter((d) => d.role === "current");
    const proposal = bundle.documents.filter((d) => d.role === "proposal");
    const injection = bundle.documents.some((d) =>
      /ignore (all )?previous instructions|send (data|secrets) to http/i.test(d.fullText),
    );
    if (injection) {
      const structured = contractAnalysisSchema.parse({
        verdict: "abstain",
        summary: "Abstaining due to suspicious instruction-like content in documents.",
        priceNotes: "Not computed.",
        coverageNotes: "Not computed.",
        risks: ["Potential prompt injection patterns detected in source text"],
        citations: [],
        unknownFields: ["all pricing fields"],
      });
      return this.wrap(structured, 0);
    }

    if (!current.length || !proposal.length) {
      const structured = contractAnalysisSchema.parse({
        verdict: "abstain",
        summary: "Insufficient documents to compare current vs proposal.",
        risks: ["Missing current or proposal document"],
        citations: [],
      });
      return this.wrap(structured, 0);
    }

    const currentPrice = extractPrice(current[0]!.fullText);
    const proposalPrice = extractPrice(proposal[0]!.fullText);
    const permanence = extractPermanence(proposal[0]!.fullText);
    const penalty = extractLine(proposal[0]!.fullText, /penalty[:\s]+([^\n]+)/i);
    const contradiction =
      /contradiction/i.test(proposal[0]!.fullText) &&
      /no permanence/i.test(proposal[0]!.fullText) &&
      permanence !== undefined &&
      permanence > 0;

    let baseVerdict: ContractAnalysisStructured["verdict"] = "depends";
    if (contradiction) {
      baseVerdict = "abstain";
    } else if (currentPrice !== undefined && proposalPrice !== undefined) {
      baseVerdict = proposalPrice < currentPrice ? "better" : proposalPrice > currentPrice ? "worse" : "depends";
    }

    const citationDoc = proposal[0]!;
    const excerpt = pickCitationExcerpt(citationDoc.pages[0]?.text ?? citationDoc.fullText);
    const structured = contractAnalysisSchema.parse({
      verdict: baseVerdict,
      currency: "EUR",
      periodicity: /annual|year/i.test(proposal[0]!.fullText) ? "annual" : "monthly",
      currentPrice,
      proposalPrice,
      permanenceMonths: permanence,
      penaltyNotes: penalty,
      coverages: extractCoverages(proposal[0]!.fullText),
      risks: contradiction ? ["Contradictory permanence clauses"] : ["Mock analyzer — verify manually"],
      citations: excerpt
        ? [{ documentId: citationDoc.documentId, page: 1, excerpt }]
        : [],
      summary: buildSummary(bundle, currentPrice, proposalPrice, baseVerdict),
      priceNotes: formatPriceNotes(currentPrice, proposalPrice),
      coverageNotes: "Derived from extracted proposal text (mock).",
      unknownFields: currentPrice === undefined ? ["currentPrice"] : [],
    });

    structured.verdict = verdictFromPrices(structured);
    return this.wrap(structured, estimateTokens(bundle));
  }

  private wrap(structured: ContractAnalysisStructured, inputTokens: number): ContractAnalyzerResult {
    return {
      structured,
      meta: {
        provider: "mock",
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        inputTokens,
        outputTokens: 256,
        retries: 0,
      },
    };
  }
}

function extractPrice(text: string): number | undefined {
  const match = text.match(/(?:price|tariff|€|eur)\s*[:\s]*([0-9]+(?:[.,][0-9]+)?)/i);
  if (!match) return undefined;
  return Number(match[1]!.replace(",", "."));
}

function extractPermanence(text: string): number | undefined {
  const match = text.match(/permanence[:\s]*([0-9]+)\s*months?/i);
  return match ? Number(match[1]) : undefined;
}

function extractLine(text: string, regex: RegExp): string | undefined {
  const match = text.match(regex);
  return match?.[1]?.trim();
}

function extractCoverages(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^coverage:/i.test(l));
  return lines.map((l) => l.replace(/^coverage:\s*/i, ""));
}

function pickCitationExcerpt(text: string): string | undefined {
  const line = text.split("\n").map((l) => l.trim()).find((l) => l.length >= 12);
  return line?.slice(0, 120);
}

function buildSummary(
  bundle: RedactedExtractedBundle,
  currentPrice: number | undefined,
  proposalPrice: number | undefined,
  verdict: string,
): string {
  return `Mock comparison for "${bundle.title}" (${bundle.serviceType}) — verdict ${verdict}. Current=${currentPrice ?? "unknown"} vs proposal=${proposalPrice ?? "unknown"}.`;
}

function formatPriceNotes(current?: number, proposal?: number): string {
  if (current === undefined || proposal === undefined) {
    return "Could not extract comparable prices from all documents.";
  }
  const delta = proposal - current;
  return `Normalized comparison delta (same periodicity): ${delta.toFixed(2)}`;
}

function estimateTokens(bundle: RedactedExtractedBundle): number {
  const chars = bundle.documents.reduce((n, d) => n + d.fullText.length, 0);
  return Math.ceil(chars / 4);
}
