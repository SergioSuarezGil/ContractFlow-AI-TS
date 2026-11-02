import { Module } from "@nestjs/common";
import { ComparisonLookupGrpcController } from "./infrastructure/grpc/comparison-lookup.controller";
import { WorkerHealthGrpcController } from "./infrastructure/grpc/worker-health.controller";
import { HealthModule } from "./infrastructure/http/health/health.module";
import { MetricsModule } from "./infrastructure/http/metrics/metrics.module";

@Module({
  imports: [MetricsModule, HealthModule],
  controllers: [WorkerHealthGrpcController, ComparisonLookupGrpcController],
})
export class AppModule {}
