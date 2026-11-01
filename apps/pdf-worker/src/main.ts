import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { JsonLogger, type ServiceMetrics } from "@contractflow/observability";
import { AppModule } from "./app.module";
import { SERVICE_METRICS } from "./infrastructure/http/metrics/metrics.tokens";

async function bootstrap(): Promise<void> {
  const logger = new JsonLogger("pdf-worker");
  const app = await NestFactory.create(AppModule, { logger });
  const metrics = app.get<ServiceMetrics>(SERVICE_METRICS);
  app.use(metrics.middleware);
  const port = Number(process.env.PDF_WORKER_PORT ?? 3002);
  await app.listen(port, "0.0.0.0");
  logger.log(`pdf-worker listening on 0.0.0.0:${port}`, "Bootstrap");
}

void bootstrap();
