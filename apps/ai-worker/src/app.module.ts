import { Module } from "@nestjs/common";
import { ComparisonLookupGrpcController } from "./infrastructure/grpc/comparison-lookup.controller";
import { WorkerHealthGrpcController } from "./infrastructure/grpc/worker-health.controller";
import { HealthModule } from "./infrastructure/http/health/health.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";

@Module({
  imports: [HealthModule, MessagingModule],
  controllers: [WorkerHealthGrpcController, ComparisonLookupGrpcController],
})
export class AppModule {}
