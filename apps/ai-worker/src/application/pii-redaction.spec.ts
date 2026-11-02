import { redactPii } from "./pii-redaction";

describe("redactPii", () => {
  it("redacts common Spanish PII patterns", () => {
    const input =
      "Holder 12345678Z IBAN ES7620770024003100251330 email user@example.com phone 612345678 CUPS ES0021000000000001AA";
    const out = redactPii(input);
    expect(out).not.toContain("12345678Z");
    expect(out).not.toContain("user@example.com");
    expect(out).toContain("[REDACTED_DNI]");
    expect(out).toContain("[REDACTED_EMAIL]");
  });
});
