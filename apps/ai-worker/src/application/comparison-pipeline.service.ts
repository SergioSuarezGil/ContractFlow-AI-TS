import { Inject, Injectable } from "@nestjs/common";
import { verifyCitations } from "./citation-verifier";
import { redactPii } from "./pii-redaction";
import type { ComparisonResult } from "./comparison-result.types";
import { DocumentExtractorService } from "./extraction/document-extractor.service";
import type { RedactedExtractedBundle } from "./extraction/types";
import { CONTRACT_ANALYZER } from "./ports/tokens";
import type { ContractAnalyzerPort } from "./ports/contract-analyzer.port";
import { MongoDocumentLoaderService } from "../infrastructure/persistence/mongo-document-loader.service";

export interface ComparisonJobInput {
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

@Injectable()
export class ComparisonPipelineService {
  constructor(
    private readonly loader: MongoDocumentLoaderService,
    private readonly extractor: DocumentExtractorService,
    @Inject(CONTRACT_ANALYZER) private readonly analyzer: ContractAnalyzerPort,
  ) {}

  async run(input: ComparisonJobInput): Promise<ComparisonResult> {
    const ids = [...input.currentDocumentIds, ...input.proposalDocumentIds];
    const stored = await this.loader.loadBodies(ids);
    const extracted = [];
    for (const doc of stored) {
      extracted.push(
        await this.extractor.extract({
          documentId: doc.id,
          fileName: doc.fileName,
          role: doc.role,
          contentType: doc.contentType,
          body: doc.body,
        }),
      );
    }

    const redactedDocs = extracted.map((d) => ({
      ...d,
      pages: d.pages.map((p) => ({ ...p, text: redactPii(p.text) })),
      fullText: redactPii(d.fullText),
    }));

    const bundle: RedactedExtractedBundle = {
      jobId: input.jobId,
      contractId: input.contractId,
      title: input.title,
      providerName: input.providerName,
      serviceType: input.serviceType,
      documents: redactedDocs,
    };

    const analyzed = await this.analyzer.analyze(bundle);
    const citationCheck = verifyCitations(analyzed.structured.citations, extracted);
    if (!citationCheck.ok) {
      throw new Error(`Invalid citation validation: ${citationCheck.reason}`);
    }

    return {
      jobId: input.jobId,
      contractId: input.contractId,
      verdict: analyzed.structured.verdict === "abstain" ? "depends" : analyzed.structured.verdict,
      summary: analyzed.structured.summary,
      priceNotes: analyzed.structured.priceNotes,
      coverageNotes: analyzed.structured.coverageNotes,
      risks: analyzed.structured.risks,
      disclaimer:
        "ContractFlow AI analysis is informational only — not legal or financial advice.",
      createdAt: new Date().toISOString(),
      analysisMode: analyzed.meta.provider === "gemini" ? "gemini" : "mock",
      modelVersion: analyzed.meta.model,
      promptVersion: analyzed.meta.promptVersion,
      schemaVersion: analyzed.meta.schemaVersion,
      citations: analyzed.structured.citations,
      structured: analyzed.structured,
      llmUsage: {
        inputTokens: analyzed.meta.inputTokens,
        outputTokens: analyzed.meta.outputTokens,
        retries: analyzed.meta.retries,
        provider: analyzed.meta.provider,
        model: analyzed.meta.model,
      },
    };
  }
}
