export interface PdfReportInput {
  title: string;
  analysisMode: "mock" | "gemini";
  jobId: string;
  contractId: string;
  comparisonId: string;
  verdict: string;
  summary: string;
  priceNotes: string;
  coverageNotes: string;
  disclaimer: string;
  risks: string[];
  citations?: Array<{ documentId: string; page?: number; excerpt: string }>;
  limits?: string[];
}
