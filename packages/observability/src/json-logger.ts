import type { LoggerService, LogLevel } from "@nestjs/common";
import { getBuildInfo } from "./build-info";

/**
 * JSON lines logger for Docker → Promtail → Loki.
 * One object per line; no ANSI colors.
 */
export class JsonLogger implements LoggerService {
  constructor(private readonly serviceName: string) {}

  log(message: unknown, context?: string): void {
    this.write("log", message, context);
  }

  error(message: unknown, traceOrContext?: string, context?: string): void {
    if (context !== undefined) {
      this.write("error", message, context, traceOrContext);
      return;
    }
    this.write("error", message, traceOrContext);
  }

  warn(message: unknown, context?: string): void {
    this.write("warn", message, context);
  }

  debug?(message: unknown, context?: string): void {
    this.write("debug", message, context);
  }

  verbose?(message: unknown, context?: string): void {
    this.write("verbose", message, context);
  }

  fatal?(message: unknown, context?: string): void {
    this.write("fatal", message, context);
  }

  private write(
    level: LogLevel | "fatal",
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const build = getBuildInfo(this.serviceName);
    const line: Record<string, string> = {
      ts: new Date().toISOString(),
      level,
      service: build.service,
      gitSha: build.gitSha,
      context: context?.trim() || this.serviceName,
      msg: typeof message === "string" ? message : safeJson(message),
    };
    if (trace) {
      line.trace = trace;
    }
    // Nest expects loggers to print; stdout is scraped by Promtail.
    process.stdout.write(`${JSON.stringify(line)}\n`);
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
