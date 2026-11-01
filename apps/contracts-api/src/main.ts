import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { JsonLogger, type ServiceMetrics } from "@contractflow/observability";
import { AppModule } from "./app.module";
import { DomainExceptionFilter } from "./infrastructure/http/filters/domain-exception.filter";
import { SERVICE_METRICS } from "./infrastructure/http/metrics/metrics.tokens";
import { setupOpenApi } from "./infrastructure/http/openapi";

async function bootstrap(): Promise<void> {
  const logger = new JsonLogger("contracts-api");
  const app = await NestFactory.create(AppModule, { logger });
  const metrics = app.get<ServiceMetrics>(SERVICE_METRICS);
  app.use(metrics.middleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  setupOpenApi(app);
  const port = Number(process.env.CONTRACTS_API_PORT ?? 3000);
  const host = process.env.CONTRACTS_API_HOST ?? "0.0.0.0";
  await app.listen(port, host);
  logger.log(`contracts-api listening on ${host}:${port}`, "Bootstrap");
}

void bootstrap();
