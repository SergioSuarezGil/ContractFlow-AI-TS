import {
  GeminiLangChainContractAnalyzer,
  type StructuredChatModel,
} from "./gemini-langchain-contract-analyzer";

const validStructured = {
  verdict: "better" as const,
  periodicity: "monthly" as const,
  currentPrice: 50,
  proposalPrice: 40,
  coverages: [],
  risks: [],
  citations: [{ documentId: "d2", excerpt: "Price: 40" }],
  summary: "Proposal is cheaper monthly.",
  priceNotes: "40 vs 50",
  coverageNotes: "",
  unknownFields: [],
};

const sampleBundle = {
  jobId: "j1",
  contractId: "c1",
  title: "Energy",
  providerName: "Acme",
  serviceType: "electricity",
  documents: [
    {
      documentId: "d1",
      fileName: "c.txt",
      role: "current" as const,
      contentType: "text/plain",
      pages: [{ pageNumber: 1, text: "Price: 50" }],
      fullText: "Price: 50",
    },
    {
      documentId: "d2",
      fileName: "p.txt",
      role: "proposal" as const,
      contentType: "text/plain",
      pages: [{ pageNumber: 1, text: "Price: 40" }],
      fullText: "Price: 40",
    },
  ],
};

describe("GeminiLangChainContractAnalyzer", () => {
  it("returns gemini meta and structured analysis from LangChain model", async () => {
    const structured: StructuredChatModel = {
      invoke: jest.fn().mockResolvedValue({
        parsed: validStructured,
        raw: { usage_metadata: { input_tokens: 11, output_tokens: 7 } },
      }),
    };
    const analyzer = new GeminiLangChainContractAnalyzer(structured);
    const result = await analyzer.analyze(sampleBundle);
    expect(result.meta.provider).toBe("gemini");
    expect(result.meta.inputTokens).toBe(11);
    expect(result.meta.outputTokens).toBe(7);
    expect(result.structured.verdict).toBe("better");
    expect(result.structured.summary).toContain("cheaper");
    expect(structured.invoke).toHaveBeenCalledTimes(1);
  });

  it("retries once when the first invoke fails schema validation", async () => {
    const structured: StructuredChatModel = {
      invoke: jest
        .fn()
        .mockResolvedValueOnce({ parsed: { summary: "" } })
        .mockResolvedValueOnce({
          parsed: validStructured,
          raw: { usage_metadata: { input_tokens: 1, output_tokens: 1 } },
        }),
    };
    const analyzer = new GeminiLangChainContractAnalyzer(structured);
    const result = await analyzer.analyze(sampleBundle);
    expect(result.meta.retries).toBe(1);
    expect(structured.invoke).toHaveBeenCalledTimes(2);
  });
});
