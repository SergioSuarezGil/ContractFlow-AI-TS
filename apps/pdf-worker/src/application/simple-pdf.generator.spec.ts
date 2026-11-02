import { SimplePdfGenerator } from "./simple-pdf.generator";

describe("SimplePdfGenerator", () => {
  const generator = new SimplePdfGenerator();

  it("produces a multipage PDF buffer", async () => {
    const pdf = await generator.generateReport({
      title: "ContractFlow AI — Comparative Report (MOCK)",
      analysisMode: "mock",
      jobId: "job-1",
      contractId: "contract-1",
      comparisonId: "cmp-1",
      verdict: "depends",
      summary: "Line one with unicode €",
      priceNotes: "Price notes",
      coverageNotes: "Coverage notes",
      disclaimer: "Informational only.",
      risks: ["Risk A"],
      citations: [{ documentId: "d1", excerpt: "cite" }],
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
