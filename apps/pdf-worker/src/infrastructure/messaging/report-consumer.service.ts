import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { SimplePdfGenerator } from "../../application/simple-pdf.generator";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required (set it in .env — see .env.example)`);
  }
  return value;
}

interface EventEnvelope {
  eventId: string;
  eventType: string;
  schemaVersion: 1;
  correlationId: string;
  causationId: string | null;
  householdId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class ReportConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportConsumerService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private s3!: S3Client;
  private readonly queue = "contractflow.pdf.generate";
  private exchange = "contractflow.events";

  constructor(private readonly pdf: SimplePdfGenerator) {}

  async onModuleInit(): Promise<void> {
    this.s3 = this.createS3();
    const url = process.env.RABBITMQ_URL?.trim();
    if (!url) {
      throw new Error("RABBITMQ_URL is required (set it in .env — see .env.example)");
    }
    this.exchange = process.env.RABBITMQ_EXCHANGE?.trim() || "contractflow.events";
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, "topic", { durable: true });
    await this.channel.assertQueue(this.queue, {
      durable: true,
      arguments: { "x-dead-letter-exchange": "contractflow.events.dlx" },
    });
    await this.channel.prefetch(5);
    await this.channel.consume(this.queue, (msg) => {
      void this.onMessage(msg);
    });
    this.logger.log(`PDF worker consuming ${this.queue}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  isReady(): boolean {
    return Boolean(this.channel);
  }

  private async onMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;
    let envelope: EventEnvelope;
    try {
      envelope = JSON.parse(msg.content.toString("utf8")) as EventEnvelope;
    } catch {
      this.channel.nack(msg, false, false);
      return;
    }

    if (envelope.eventType !== "report.requested.v1") {
      this.channel.ack(msg);
      return;
    }

    try {
      await this.process(envelope);
      this.channel.ack(msg);
    } catch (error) {
      this.logger.error((error as Error).message, (error as Error).stack);
      this.publish("report.failed.v1", this.envelope(envelope, "report.failed.v1", {
        jobId: String(envelope.payload.jobId),
        contractId: String(envelope.payload.contractId),
        ownerId: String(envelope.payload.ownerId),
        comparisonId: String(envelope.payload.comparisonId ?? ""),
        errorMessage: (error as Error).message,
      }));
      this.channel.nack(msg, false, false);
    }
  }

  private async process(envelope: EventEnvelope): Promise<void> {
    const comparison = (envelope.payload.comparison ?? {}) as Record<string, unknown>;
    const reportId = randomUUID();
    const jobId = String(envelope.payload.jobId);
    const contractId = String(envelope.payload.contractId);
    const ownerId = String(envelope.payload.ownerId);
    const comparisonId = String(envelope.payload.comparisonId);
    const fileName = `comparison-${reportId}.pdf`;
    const storageKey = `${envelope.householdId}/${contractId}/${jobId}/${fileName}`;

    const body = this.pdf.generate([
      "ContractFlow AI — Comparative Report (MOCK)",
      `Job: ${jobId}`,
      `Contract: ${contractId}`,
      `Comparison: ${comparisonId}`,
      `Verdict: ${String(comparison.verdict ?? "depends")}`,
      "",
      "Summary:",
      String(comparison.summary ?? ""),
      "",
      "Price notes:",
      String(comparison.priceNotes ?? ""),
      "",
      "Coverage notes:",
      String(comparison.coverageNotes ?? ""),
      "",
      "Disclaimer:",
      String(comparison.disclaimer ?? "Informational only."),
    ]);

    const bucket = process.env.S3_BUCKET_REPORTS ?? "reports";
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: body,
        ContentType: "application/pdf",
      }),
    );

    this.publish(
      "report.completed.v1",
      this.envelope(envelope, "report.completed.v1", {
        jobId,
        contractId,
        ownerId,
        comparisonId,
        reportId,
        storageKey,
        fileName,
        contentType: "application/pdf",
        sizeBytes: body.length,
      }),
    );
  }

  private envelope(
    source: EventEnvelope,
    eventType: string,
    payload: Record<string, unknown>,
  ): EventEnvelope {
    return {
      eventId: randomUUID(),
      eventType,
      schemaVersion: 1,
      correlationId: source.correlationId,
      causationId: source.eventId,
      householdId: source.householdId,
      occurredAt: new Date().toISOString(),
      payload,
    };
  }

  private publish(routingKey: string, envelope: EventEnvelope): void {
    if (!this.channel) return;
    this.channel.publish(this.exchange, routingKey, Buffer.from(JSON.stringify(envelope)), {
      contentType: "application/json",
      deliveryMode: 2,
      messageId: envelope.eventId,
      correlationId: envelope.correlationId,
      type: envelope.eventType,
    });
  }

  private createS3(): S3Client {
    const endpointHost = process.env.S3_ENDPOINT ?? "127.0.0.1";
    const port = process.env.S3_PORT ?? "4566";
    const useSsl = (process.env.S3_USE_SSL ?? "false") === "true";
    const protocol = useSsl ? "https" : "http";
    const endpoint =
      endpointHost.startsWith("http://") || endpointHost.startsWith("https://")
        ? endpointHost
        : `${protocol}://${endpointHost}:${port}`;
    return new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY"),
        secretAccessKey: requireEnv("S3_SECRET_KEY"),
      },
    });
  }
}
