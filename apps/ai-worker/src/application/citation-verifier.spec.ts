import { verifyCitations } from "./citation-verifier";

describe("verifyCitations", () => {
  const documents = [
    {
      documentId: "doc-1",
      fileName: "a.txt",
      role: "proposal" as const,
      contentType: "text/plain",
      pages: [{ pageNumber: 1, text: "Price: EUR 45.00 monthly" }],
      fullText: "[doc:doc-1 p:1]\nPrice: EUR 45.00 monthly",
    },
  ];

  it("accepts excerpts present in document text", () => {
    expect(
      verifyCitations(
        [{ documentId: "doc-1", page: 1, excerpt: "Price: EUR 45.00 monthly" }],
        documents,
      ).ok,
    ).toBe(true);
  });

  it("rejects missing excerpts", () => {
    const result = verifyCitations(
      [{ documentId: "doc-1", excerpt: "secret token abc" }],
      documents,
    );
    expect(result.ok).toBe(false);
  });
});
