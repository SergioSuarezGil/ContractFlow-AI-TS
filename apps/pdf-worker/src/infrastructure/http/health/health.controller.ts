import { Controller, Get } from "@nestjs/common";
import { getBuildInfo } from "@contractflow/observability";
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
} from "@nestjs/terminus";
import { ReportConsumerService } from "../../messaging/report-consumer.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly consumer: ReportConsumerService,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<
    HealthCheckResult & { version: ReturnType<typeof getBuildInfo> }
  > {
    const result = await this.health.check([]);
    return { ...result, version: getBuildInfo("pdf-worker") };
  }

  @Get("ready")
  ready(): {
    status: string;
    version: ReturnType<typeof getBuildInfo>;
    checks: Record<string, { status: string }>;
  } {
    const checks = {
      rabbitmq_consumer: {
        status: this.consumer.isReady() ? "up" : "down",
      },
    };
    const degraded = Object.values(checks).some((c) => c.status !== "up");
    return {
      status: degraded ? "degraded" : "ok",
      version: getBuildInfo("pdf-worker"),
      checks,
    };
  }
}
