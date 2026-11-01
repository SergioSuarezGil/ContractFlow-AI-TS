import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { createServiceMetrics } from "@contractflow/observability";
import { MessagingModule } from "../../messaging/messaging.module";
import { MetricsController } from "../metrics/metrics.controller";
import { SERVICE_METRICS } from "../metrics/metrics.tokens";
import { HealthController } from "./health.controller";

@Module({
  imports: [TerminusModule, MessagingModule],
  controllers: [HealthController, MetricsController],
  providers: [
    {
      provide: SERVICE_METRICS,
      useFactory: () => createServiceMetrics("ai-worker"),
    },
  ],
  exports: [SERVICE_METRICS, MessagingModule],
})
export class HealthModule {}
