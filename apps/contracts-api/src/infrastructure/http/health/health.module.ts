import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { createServiceMetrics } from "@contractflow/observability";
import { AiWorkerGrpcClient } from "../../grpc/ai-worker-grpc.client";
import { MetricsController } from "../metrics/metrics.controller";
import { SERVICE_METRICS } from "../metrics/metrics.tokens";
import { AiWorkerGrpcHealthIndicator } from "./ai-worker-grpc.health";
import { HealthController } from "./health.controller";
import { MongoHealthIndicator } from "./mongo.health";
import { RabbitMqHealthIndicator } from "./rabbitmq.health";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController, MetricsController],
  providers: [
    AiWorkerGrpcClient,
    MongoHealthIndicator,
    RabbitMqHealthIndicator,
    AiWorkerGrpcHealthIndicator,
    {
      provide: SERVICE_METRICS,
      useFactory: () => createServiceMetrics("contracts-api"),
    },
  ],
  exports: [SERVICE_METRICS, AiWorkerGrpcClient],
})
export class HealthModule {}
