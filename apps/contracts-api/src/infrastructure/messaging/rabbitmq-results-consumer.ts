import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { validateEvent } from "@contractflow/events";
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import type { JobRepository } from "../../application/ports/job.repository";
import type { ReportRepository } from "../../application/ports/report.repository";
import { JOB_REPOSITORY, REPORT_REPOSITORY } from "../../application/ports/tokens";
import { Report } from "../../domain/report/report";
import { connectRabbit } from "./rabbitmq-connection";

const MAX_RETRIES = 3;

@Injectable()
export class RabbitMqResultsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqResultsConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private readonly queue = "contractflow.api.results";
  private shuttingDown = false;

  constructor(
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const connected = await connectRabbit();
    this.connection = connected.connection;
    this.channel = connected.channel;
    await this.channel.assertQueue(this.queue, {
      durable: true,
      arguments: { "x-dead-letter-exchange": "contractflow.events.dlx" },
    });
    await this.channel.prefetch(10);
    await this.channel.consume(this.queue, (msg) => {
      void this.handle(msg);
    });
    this.logger.log(`Consuming queue ${this.queue}`);
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  isReady(): boolean {
    return Boolean(this.channel) && !this.shuttingDown;
  }

  private retryCount(msg: ConsumeMessage): number {
    const headers = msg.properties.headers ?? {};
    const raw = headers["x-retry-count"];
    return typeof raw === "number" ? raw : Number(raw ?? 0);
  }

  private async handle(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(msg.content.toString("utf8"));
    } catch {
      this.channel.nack(msg, false, false);
      return;
    }

    const validated = validateEvent(parsed);
    if (!validated.ok) {
      this.logger.warn(`Rejecting invalid event: ${validated.error}`);
      this.channel.nack(msg, false, false);
      return;
    }

    try {
      await this.apply(validated.event);
      this.channel.ack(msg);
    } catch (error) {
      const retries = this.retryCount(msg);
      const message = (error as Error).message;
      this.logger.error(`Failed processing result event: ${message}`, (error as Error).stack);
      const transient =
        message.includes("conflict") ||
        message.includes("ECONNREFUSED") ||
        message.includes("not ready");
      if (transient && retries < MAX_RETRIES) {
        const delay = Math.min(5000, 250 * 2 ** retries) + Math.floor(Math.random() * 100);
        await new Promise((r) => setTimeout(r, delay));
        this.channel.publish(msg.fields.exchange || "contractflow.events", msg.fields.routingKey, msg.content, {
          ...msg.properties,
          headers: { ...(msg.properties.headers ?? {}), "x-retry-count": retries + 1 },
        });
        this.channel.ack(msg);
        return;
      }
      this.channel.nack(msg, false, false);
    }
  }

  private async apply(envelope: {
    eventType: string;
    householdId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const payload = envelope.payload;
    const jobId = String(payload.jobId ?? "");
    if (!jobId) return;

    if (envelope.eventType === "comparison.requested.v1") {
      return;
    }

    const job = await this.jobs.findById(jobId);
    if (!job) {
      this.logger.warn(`Job not found for event ${envelope.eventType}: ${jobId}`);
      return;
    }

    if (envelope.eventType === "comparison.completed.v1") {
      job.markComparisonCompleted(String(payload.comparisonId));
      await this.jobs.save(job);
      return;
    }

    if (envelope.eventType === "comparison.failed.v1" || envelope.eventType === "report.failed.v1") {
      job.markFailed(String(payload.errorMessage ?? "Worker failed"));
      await this.jobs.save(job);
      return;
    }

    if (envelope.eventType === "report.completed.v1") {
      const reportId = String(payload.reportId);
      const existing = await this.reports.findById(reportId);
      if (!existing) {
        const report = Report.create({
          id: reportId,
          jobId,
          contractId: String(payload.contractId),
          householdId: envelope.householdId,
          ownerId: String(payload.ownerId),
          comparisonId: String(payload.comparisonId),
          storageKey: String(payload.storageKey),
          fileName: String(payload.fileName ?? `report-${reportId}.pdf`),
          contentType: String(payload.contentType ?? "application/pdf"),
          sizeBytes: Number(payload.sizeBytes ?? 0),
          createdAt: new Date(envelope.occurredAt),
        });
        await this.reports.save(report);
      }
      job.markCompleted(reportId);
      await this.jobs.save(job);
    }
  }
}
