import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import type { EventEnvelope } from "../../application/messaging/event-envelope";
import type { JobRepository } from "../../application/ports/job.repository";
import type { ReportRepository } from "../../application/ports/report.repository";
import { JOB_REPOSITORY, REPORT_REPOSITORY } from "../../application/ports/tokens";
import { Report } from "../../domain/report/report";
import { connectRabbit } from "./rabbitmq-connection";

@Injectable()
export class RabbitMqResultsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqResultsConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private readonly queue = "contractflow.api.results";

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
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async handle(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;
    try {
      const envelope = JSON.parse(msg.content.toString("utf8")) as EventEnvelope;
      await this.apply(envelope);
      this.channel.ack(msg);
    } catch (error) {
      this.logger.error(
        `Failed processing result event: ${(error as Error).message}`,
        (error as Error).stack,
      );
      this.channel.nack(msg, false, false);
    }
  }

  private async apply(envelope: EventEnvelope): Promise<void> {
    const payload = envelope.payload as Record<string, unknown>;
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
      job.markCompleted(reportId);
      await this.jobs.save(job);
    }
  }
}
