import type { ContractAnalysisStructured } from "../contract-analysis.schema";
import type { RedactedExtractedBundle } from "../extraction/types";

export interface AnalyzerRunMeta {
  provider: "mock" | "gemini";
  model: string;
  promptVersion: string;
  schemaVersion: string;
  inputTokens: number;
  outputTokens: number;
  retries: number;
}

export interface ContractAnalyzerResult {
  structured: ContractAnalysisStructured;
  meta: AnalyzerRunMeta;
}

export interface ContractAnalyzerPort {
  analyze(bundle: RedactedExtractedBundle): Promise<ContractAnalyzerResult>;
}
