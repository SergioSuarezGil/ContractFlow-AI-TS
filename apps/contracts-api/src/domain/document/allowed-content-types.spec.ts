import { assertAllowedDocumentUpload } from "./allowed-content-types";

describe("assertAllowedDocumentUpload", () => {
  it("accepts pdf and markdown", () => {
    expect(() =>
      assertAllowedDocumentUpload("offer.pdf", "application/pdf"),
    ).not.toThrow();
    expect(() =>
      assertAllowedDocumentUpload("notes.md", "text/markdown"),
    ).not.toThrow();
  });

  it("rejects unsupported extensions", () => {
    expect(() =>
      assertAllowedDocumentUpload("photo.png", "image/png"),
    ).toThrow(/Unsupported file type/);
  });
});
