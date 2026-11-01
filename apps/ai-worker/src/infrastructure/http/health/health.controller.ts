import { Controller, Get } from "@nestjs/common";
import { getBuildInfo } from "@contractflow/observability";
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
} from "@nestjs/terminus";
import { ComparisonLookupService } from "../../../application/comparison-lookup.service";
import { ComparisonConsumerService } from "../../messaging/comparison-consumer.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly consumer: ComparisonConsumerService,
    private readonly lookups: ComparisonLookupService,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<
    HealthCheckResult & { version: ReturnType<typeof getBuildInfo> }
  > {
    const result = await this.health.check([]);
    return { ...result, version: getBuildInfo("ai-worker") };
  }

  @Get("ready")
  async ready(): Promise<{
    status: string;
    version: ReturnType<typeof getBuildInfo>;
    checks: Record<string, { status: string; message?: string }>;
  }> {
    const version = getBuildInfo("ai-worker");
    const checks: Record<string, { status: string; message?: string }> = {
      rabbitmq_consumer: {
        status: this.consumer.isReady() ? "up" : "down",
      },
    };
    try {
      await this.lookups.pingMongo();
      checks.mongodb = { status: "up" };
    } catch (error) {
      checks.mongodb = {
        status: "down",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    const degraded = Object.values(checks).some((c) => c.status !== "up");
    return { status: degraded ? "degraded" : "ok", version, checks };
  }
}
