import { Module } from "@nestjs/common";
import { HealthModule } from "./infrastructure/http/health/health.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";

@Module({
  imports: [HealthModule, MessagingModule],
})
export class AppModule {}
