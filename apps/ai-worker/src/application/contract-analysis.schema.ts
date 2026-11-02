import { z } from "zod";

export const PROMPT_VERSION = "contract-compare-v1";
export const SCHEMA_VERSION = "structured-v1";

export const citationSchema = z.object({
  documentId: z.string().min(1),
  page: z.number().int().positive().optional(),
  excerpt: z.string().min(1).max(500),
});

export const contractAnalysisSchema = z.object({
  verdict: z.enum(["better", "worse", "depends", "abstain"]),
  currency: z.string().min(1).optional(),
  periodicity: z.enum(["monthly", "annual", "other", "unknown"]).default("unknown"),
  currentPrice: z.number().nonnegative().optional(),
  proposalPrice: z.number().nonnegative().optional(),
  permanenceMonths: z.number().int().nonnegative().optional(),
  penaltyNotes: z.string().optional(),
  coverages: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  citations: z.array(citationSchema).default([]),
  summary: z.string().min(1),
  priceNotes: z.string().default(""),
  coverageNotes: z.string().default(""),
  unknownFields: z.array(z.string()).default([]),
});

export type ContractAnalysisStructured = z.infer<typeof contractAnalysisSchema>;
export type AnalysisCitation = z.infer<typeof citationSchema>;
