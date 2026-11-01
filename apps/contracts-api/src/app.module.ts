import { Module } from "@nestjs/common";
import { ContractsModule } from "./infrastructure/http/contracts/contracts.module";
import { HealthModule } from "./infrastructure/http/health/health.module";
import { MongoModule } from "./infrastructure/persistence/mongodb/mongo.module";

@Module({
  imports: [MongoModule, HealthModule, ContractsModule],
})
export class AppModule {}
