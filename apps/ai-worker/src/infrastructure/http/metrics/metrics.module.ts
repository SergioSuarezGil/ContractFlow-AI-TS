import { Global, Module } from "@nestjs/common";
import { createLlmMetrics, createServiceMetrics } from "@contractflow/observability";
import { LLM_METRICS } from "./llm-metrics.tokens";
import { SERVICE_METRICS } from "./metrics.tokens";

@Global()
@Module({
  providers: [
    {
      provide: SERVICE_METRICS,
      useFactory: () => createServiceMetrics("ai-worker"),
    },
    {
      provide: LLM_METRICS,
      useFactory: (serviceMetrics: ReturnType<typeof createServiceMetrics>) =>
        createLlmMetrics(serviceMetrics.registry),
      inject: [SERVICE_METRICS],
    },
  ],
  exports: [SERVICE_METRICS, LLM_METRICS],
})
export class MetricsModule {}
