import { Counter, Histogram, type Registry } from "prom-client";

export interface LlmMetrics {
  requestsTotal: Counter<"provider" | "model" | "outcome">;
  durationSeconds: Histogram<"provider" | "model">;
  inputTokensTotal: Counter<"provider" | "model">;
  outputTokensTotal: Counter<"provider" | "model">;
  estimatedCostUsdTotal: Counter<"provider" | "model">;
  retriesTotal: Counter<"provider" | "model">;
}

export interface LlmTariff {
  version: string;
  inputUsdPer1k: number;
  outputUsdPer1k: number;
}

/** Versioned tariff table for estimated cost metrics (not billing). */
export const DEFAULT_LLM_TARIFFS: Record<string, LlmTariff> = {
  "gemini-2.0-flash": {
    version: "2026-11",
    inputUsdPer1k: 0,
    outputUsdPer1k: 0,
  },
  mock: {
    version: "2025-01",
    inputUsdPer1k: 0,
    outputUsdPer1k: 0,
  },
};

export function createLlmMetrics(registry: Registry): LlmMetrics {
  return {
    requestsTotal: new Counter({
      name: "contractflow_llm_requests_total",
      help: "LLM analysis requests",
      labelNames: ["provider", "model", "outcome"] as const,
      registers: [registry],
    }),
    durationSeconds: new Histogram({
      name: "contractflow_llm_duration_seconds",
      help: "LLM request duration",
      labelNames: ["provider", "model"] as const,
      buckets: [0.25, 0.5, 1, 2, 5, 10, 20, 40, 60],
      registers: [registry],
    }),
    inputTokensTotal: new Counter({
      name: "contractflow_llm_input_tokens_total",
      help: "LLM input tokens (estimated when provider omits usage)",
      labelNames: ["provider", "model"] as const,
      registers: [registry],
    }),
    outputTokensTotal: new Counter({
      name: "contractflow_llm_output_tokens_total",
      help: "LLM output tokens",
      labelNames: ["provider", "model"] as const,
      registers: [registry],
    }),
    estimatedCostUsdTotal: new Counter({
      name: "contractflow_llm_estimated_cost_usd_total",
      help: "Estimated LLM spend using versioned tariff config",
      labelNames: ["provider", "model"] as const,
      registers: [registry],
    }),
    retriesTotal: new Counter({
      name: "contractflow_llm_retries_total",
      help: "LLM repair/retry attempts",
      labelNames: ["provider", "model"] as const,
      registers: [registry],
    }),
  };
}

export function estimateLlmCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  tariffs: Record<string, LlmTariff> = DEFAULT_LLM_TARIFFS,
): number {
  const tariff = tariffs[model] ?? tariffs.mock;
  return (
    (inputTokens / 1000) * tariff.inputUsdPer1k +
    (outputTokens / 1000) * tariff.outputUsdPer1k
  );
}
