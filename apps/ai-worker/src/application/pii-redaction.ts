const PII_PATTERNS: Array<{ name: string; regex: RegExp; placeholder: string }> = [
  { name: "dni", regex: /\b[0-9]{8}[A-Z]\b/gi, placeholder: "[REDACTED_DNI]" },
  { name: "nie", regex: /\b[XYZ][0-9]{7}[A-Z]\b/gi, placeholder: "[REDACTED_NIE]" },
  {
    name: "iban",
    regex: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b/gi,
    placeholder: "[REDACTED_IBAN]",
  },
  {
    name: "cups",
    regex: /\bES[0-9]{16}[A-Z]{2}\b/gi,
    placeholder: "[REDACTED_CUPS]",
  },
  {
    name: "phone",
    regex: /\b(?:\+34|0034)?[\s.-]?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g,
    placeholder: "[REDACTED_PHONE]",
  },
  {
    name: "email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    placeholder: "[REDACTED_EMAIL]",
  },
];

export function redactPii(text: string): string {
  let out = text;
  for (const pattern of PII_PATTERNS) {
    out = out.replace(pattern.regex, pattern.placeholder);
  }
  return out;
}
