import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";

export interface ComparisonInput {
  jobId: string;
  contractId: string;
  ownerId: string;
  householdId: string;
  title: string;
  providerName: string;
  serviceType: string;
  currentDocumentIds: string[];
  proposalDocumentIds: string[];
}

export interface ComparisonResult {
  id: string;
  jobId: string;
  contractId: string;
  verdict: "better" | "worse" | "depends";
  summary: string;
  priceNotes: string;
  coverageNotes: string;
  risks: string[];
  disclaimer: string;
  createdAt: string;
}

@Injectable()
export class MockComparisonService {
  analyze(input: ComparisonInput): ComparisonResult {
    const proposals = input.proposalDocumentIds.length;
    const verdict = proposals > 0 ? "depends" : "worse";
    return {
      id: randomUUID(),
      jobId: input.jobId,
      contractId: input.contractId,
      verdict,
      summary: `Mock comparison for "${input.title}" (${input.serviceType}) with provider ${input.providerName}. Analyzed ${input.currentDocumentIds.length} current and ${proposals} proposal document(s).`,
      priceNotes:
        "Mock LLM: proposal pricing appears competitive, but exact tariffs were not extracted from real PDF text in this milestone.",
      coverageNotes:
        "Mock LLM: coverage/clauses should be reviewed manually; this result is deterministic for local demos.",
      risks: [
        "Informational only — not legal or financial advice",
        "Mock provider does not parse PDF contents yet",
      ],
      disclaimer:
        "ContractFlow AI mock analysis. Recommendations are informational and based on uploaded metadata only.",
      createdAt: new Date().toISOString(),
    };
  }
}
