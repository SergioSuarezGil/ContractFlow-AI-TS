import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { getBuildInfo } from "@contractflow/observability";
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
} from "@nestjs/terminus";
import { AiWorkerGrpcHealthIndicator } from "./ai-worker-grpc.health";
import { MongoHealthIndicator } from "./mongo.health";
import { RabbitMqHealthIndicator } from "./rabbitmq.health";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongo: MongoHealthIndicator,
    private readonly rabbit: RabbitMqHealthIndicator,
    private readonly aiWorkerGrpc: AiWorkerGrpcHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: "Liveness probe (process up + build identity)" })
  @ApiOkResponse({ description: "Service is up" })
  async check(): Promise<HealthCheckResult & { version: ReturnType<typeof getBuildInfo> }> {
    const result = await this.health.check([]);
    return { ...result, version: getBuildInfo("contracts-api") };
  }

  @Get("ready")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Readiness probe (Mongo, RabbitMQ, optional gRPC ping to ai-worker)",
  })
  async ready(): Promise<{
    status: string;
    version: ReturnType<typeof getBuildInfo>;
    checks: Record<string, { status: string; message?: string }>;
  }> {
    const version = getBuildInfo("contracts-api");
    const checks: Record<string, { status: string; message?: string }> = {};

    try {
      await this.mongo.ping();
      checks.mongodb = { status: "up" };
    } catch (error) {
      checks.mongodb = {
        status: "down",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      await this.rabbit.ping();
      checks.rabbitmq = { status: "up" };
    } catch (error) {
      checks.rabbitmq = {
        status: "down",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    if (process.env.GRPC_HEALTH_CHECK !== "false") {
      try {
        await this.aiWorkerGrpc.ping();
        checks["ai-worker-grpc"] = { status: "up" };
      } catch (error) {
        checks["ai-worker-grpc"] = {
          status: "down",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const criticalDown =
      checks.mongodb?.status !== "up" || checks.rabbitmq?.status !== "up";
    const degraded = Object.values(checks).some((c) => c.status !== "up");
    if (criticalDown) {
      throw new ServiceUnavailableException({
        status: "degraded",
        version,
        checks,
      });
    }
    return { status: degraded ? "degraded" : "ok", version, checks };
  }
}
