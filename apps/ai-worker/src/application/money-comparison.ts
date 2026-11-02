import type { ContractAnalysisStructured } from "./contract-analysis.schema";

const MONTHLY_FACTOR: Record<string, number> = {
  monthly: 1,
  annual: 1 / 12,
  other: 1,
  unknown: 1,
};

export function normalizeMonthlyPrice(
  price: number | undefined,
  periodicity: ContractAnalysisStructured["periodicity"],
): number | undefined {
  if (price === undefined) return undefined;
  const factor = MONTHLY_FACTOR[periodicity] ?? 1;
  return price * factor;
}

/** Deterministic verdict adjustment from normalized monthly prices when both exist. */
export function verdictFromPrices(
  structured: ContractAnalysisStructured,
): ContractAnalysisStructured["verdict"] {
  const current = normalizeMonthlyPrice(structured.currentPrice, structured.periodicity);
  const proposal = normalizeMonthlyPrice(structured.proposalPrice, structured.periodicity);
  if (current === undefined || proposal === undefined) {
    return structured.verdict;
  }
  const delta = proposal - current;
  const tolerance = Math.max(0.5, current * 0.01);
  if (Math.abs(delta) <= tolerance) return "depends";
  return delta < 0 ? "better" : "worse";
}
