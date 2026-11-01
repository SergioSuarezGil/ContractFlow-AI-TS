import "reflect-metadata";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { type MicroserviceOptions, Transport } from "@nestjs/microservices";
import { JsonLogger, type ServiceMetrics } from "@contractflow/observability";
import { AppModule } from "./app.module";
import { SERVICE_METRICS } from "./infrastructure/http/metrics/metrics.tokens";

async function bootstrap(): Promise<void> {
  const logger = new JsonLogger("ai-worker");
  const app = await NestFactory.create(AppModule, { logger });
  const metrics = app.get<ServiceMetrics>(SERVICE_METRICS);
  app.use(metrics.middleware);

  const grpcUrl = process.env.AI_WORKER_GRPC_URL ?? "0.0.0.0:50051";
  const protoDir = join(
    __dirname,
    "..",
    "..",
    "..",
    "contracts",
    "grpc",
    "contractflow",
    "v1",
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: "contractflow.v1",
      protoPath: [
        join(protoDir, "worker_health.proto"),
        join(protoDir, "comparison_lookup.proto"),
      ],
      url: grpcUrl,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  await app.startAllMicroservices();
  const port = Number(process.env.AI_WORKER_PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  logger.log(`ai-worker listening on 0.0.0.0:${port} grpc=${grpcUrl}`, "Bootstrap");
}

void bootstrap();
