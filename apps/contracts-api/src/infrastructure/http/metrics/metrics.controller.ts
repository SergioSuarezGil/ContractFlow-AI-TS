import { Controller, Get, Header, Inject } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { ServiceMetrics } from "@contractflow/observability";
import { SERVICE_METRICS } from "./metrics.tokens";

@ApiExcludeController()
@Controller("metrics")
export class MetricsController {
  constructor(@Inject(SERVICE_METRICS) private readonly metrics: ServiceMetrics) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  scrape(): Promise<string> {
    return this.metrics.scrape();
  }
}
