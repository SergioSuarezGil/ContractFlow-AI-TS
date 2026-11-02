export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  documentId: string;
  fileName: string;
  role: "current" | "proposal";
  contentType: string;
  pages: ExtractedPage[];
  fullText: string;
}

export interface ExtractedBundle {
  documents: ExtractedDocument[];
}

export interface RedactedExtractedBundle extends ExtractedBundle {
  jobId: string;
  contractId: string;
  title: string;
  providerName: string;
  serviceType: string;
}
