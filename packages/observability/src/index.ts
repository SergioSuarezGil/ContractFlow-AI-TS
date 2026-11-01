import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";
import type { NextFunction, Request, Response } from "express";

export { getBuildInfo, type BuildInfo } from "./build-info";
export { JsonLogger } from "./json-logger";

export interface ServiceMetrics {
  registry: Registry;
  httpRequestsTotal: Counter<"service" | "method" | "route" | "status_code">;
  httpRequestDurationSeconds: Histogram<
    "service" | "method" | "route" | "status_code"
  >;
  processUp: Gauge<"service">;
  middleware: (req: Request, res: Response, next: NextFunction) => void;
  scrape: () => Promise<string>;
}

export function createServiceMetrics(serviceName: string): ServiceMetrics {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, labels: { service: serviceName } });

  const processUp = new Gauge({
    name: "contractflow_process_up",
    help: "1 if the process is serving traffic",
    labelNames: ["service"] as const,
    registers: [registry],
  });
  processUp.set({ service: serviceName }, 1);

  const httpRequestsTotal = new Counter({
    name: "contractflow_http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["service", "method", "route", "status_code"] as const,
    registers: [registry],
  });

  const httpRequestDurationSeconds = new Histogram({
    name: "contractflow_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["service", "method", "route", "status_code"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    if (
      req.path === "/metrics" ||
      req.path === "/health" ||
      req.path.startsWith("/health/")
    ) {
      next();
      return;
    }
    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const elapsedNs = Number(process.hrtime.bigint() - started);
      const seconds = elapsedNs / 1e9;
      const route = req.route?.path
        ? `${req.baseUrl}${req.route.path}`
        : req.path;
      const labels = {
        service: serviceName,
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, seconds);
    });
    next();
  };

  return {
    registry,
    httpRequestsTotal,
    httpRequestDurationSeconds,
    processUp,
    middleware,
    scrape: () => registry.metrics(),
  };
}
