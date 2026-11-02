import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { MessagingModule } from "../../messaging/messaging.module";
import { MetricsController } from "../metrics/metrics.controller";
import { MetricsModule } from "../metrics/metrics.module";
import { SERVICE_METRICS } from "../metrics/metrics.tokens";
import { HealthController } from "./health.controller";

@Module({
  imports: [TerminusModule, MetricsModule, MessagingModule],
  controllers: [HealthController, MetricsController],
  exports: [SERVICE_METRICS, MessagingModule],
})
export class HealthModule {}
