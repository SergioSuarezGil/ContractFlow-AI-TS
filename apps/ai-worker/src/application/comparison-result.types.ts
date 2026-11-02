import type { AnalysisCitation, ContractAnalysisStructured } from "./contract-analysis.schema";

export interface ComparisonResult {
  jobId: string;
  contractId: string;
  verdict: "better" | "worse" | "depends";
  summary: string;
  priceNotes: string;
  coverageNotes: string;
  risks: string[];
  disclaimer: string;
  createdAt: string;
  analysisMode: "mock" | "gemini";
  modelVersion?: string;
  promptVersion?: string;
  schemaVersion?: string;
  citations?: AnalysisCitation[];
  structured?: ContractAnalysisStructured;
  llmUsage?: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    retries: number;
  };
}
