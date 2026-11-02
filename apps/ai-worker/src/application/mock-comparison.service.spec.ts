import { MockComparisonService } from "./mock-comparison.service";

describe("MockComparisonService", () => {
  const service = new MockComparisonService();

  it("returns a comparison result with expected shape", () => {
    const result = service.analyze({
      jobId: "job-1",
      contractId: "contract-1",
      ownerId: "owner-1",
      householdId: "household-1",
      title: "Energy plan",
      providerName: "Acme",
      serviceType: "electricity",
      currentDocumentIds: ["doc-a"],
      proposalDocumentIds: ["doc-b"],
    });

    expect(result.jobId).toBe("job-1");
    expect(result.contractId).toBe("contract-1");
    expect(["better", "worse", "depends"]).toContain(result.verdict);
    expect(result.summary).toContain("Energy plan");
    expect(result.risks.length).toBeGreaterThan(0);
  });
});
