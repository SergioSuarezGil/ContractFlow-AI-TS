import { createHash, randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { validateEvent } from "@contractflow/events";
import amqp, { type Channel, type ChannelModel, type ConfirmChannel, type ConsumeMessage } from "amqplib";
import { MongoClient, type Db } from "mongodb";
import { SimplePdfGenerator } from "../../application/simple-pdf.generator";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required (set it in .env — see .env.example)`);
  }
  return value;
}

const MAX_RETRIES = 3;

@Injectable()
export class ReportConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportConsumerService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private confirmChannel?: ConfirmChannel;
  private mongo?: MongoClient;
  private db?: Db;
  private s3!: S3Client;
  private readonly queue = "contractflow.pdf.generate";
  private exchange = "contractflow.events";
  private shuttingDown = false;

  constructor(private readonly pdf: SimplePdfGenerator) {}

  async onModuleInit(): Promise<void> {
    this.s3 = this.createS3();
    const mongoUri =
      process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/contractflow?directConnection=true";
    this.mongo = new MongoClient(mongoUri);
    await this.mongo.connect();
    this.db = this.mongo.db(process.env.MONGODB_DB ?? "contractflow");
    await this.db.collection("report_idempotency").createIndex({ jobId: 1 }, { unique: true });

    const url = process.env.RABBITMQ_URL?.trim();
    if (!url) {
      throw new Error("RABBITMQ_URL is required (set it in .env — see .env.example)");
    }
    this.exchange = process.env.RABBITMQ_EXCHANGE?.trim() || "contractflow.events";
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    this.confirmChannel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange(this.exchange, "topic", { durable: true });
    await this.confirmChannel.assertExchange(this.exchange, "topic", { durable: true });
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
    this.shuttingDown = true;
    await this.channel?.close().catch(() => undefined);
    await this.confirmChannel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    await this.mongo?.close().catch(() => undefined);
  }

  isReady(): boolean {
    return Boolean(this.channel) && !this.shuttingDown;
  }

  private retryCount(msg: ConsumeMessage): number {
    const headers = msg.properties.headers ?? {};
    const raw = headers["x-retry-count"];
    return typeof raw === "number" ? raw : Number(raw ?? 0);
  }

  private stableReportId(jobId: string): string {
    return createHash("sha256").update(`report:${jobId}`).digest("hex").slice(0, 32);
  }

  private async onMessage(msg: ConsumeMessage | null): Promise<void> {
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
      this.logger.warn(`Invalid event rejected: ${validated.error}`);
      this.channel.nack(msg, false, false);
      return;
    }

    const envelope = validated.event;
    if (envelope.eventType !== "report.requested.v1") {
      this.channel.ack(msg);
      return;
    }

    try {
      await this.process(envelope);
      this.channel.ack(msg);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(message, (error as Error).stack);
      const retries = this.retryCount(msg);
      if (retries < MAX_RETRIES) {
        const delay = Math.min(5000, 250 * 2 ** retries) + Math.floor(Math.random() * 100);
        await new Promise((r) => setTimeout(r, delay));
        this.channel.publish(this.exchange, msg.fields.routingKey, msg.content, {
          ...msg.properties,
          headers: { ...(msg.properties.headers ?? {}), "x-retry-count": retries + 1 },
        });
        this.channel.ack(msg);
        return;
      }
      await this.publish(
        "report.failed.v1",
        this.envelope(envelope, "report.failed.v1", {
          jobId: String(envelope.payload.jobId),
          contractId: String(envelope.payload.contractId),
          ownerId: String(envelope.payload.ownerId),
          comparisonId: String(envelope.payload.comparisonId ?? ""),
          errorMessage: message,
        }),
      ).catch(() => undefined);
      this.channel.nack(msg, false, false);
    }
  }

  private async process(envelope: {
    eventId: string;
    correlationId: string;
    householdId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const jobId = String(envelope.payload.jobId);
    const existing = await this.db!.collection("report_idempotency").findOne({ jobId });
    if (existing) {
      this.logger.log(`Idempotent skip report for job ${jobId}`);
      return;
    }

    const comparison = (envelope.payload.comparison ?? {}) as Record<string, unknown>;
    const reportId = this.stableReportId(jobId);
    const contractId = String(envelope.payload.contractId);
    const ownerId = String(envelope.payload.ownerId);
    const comparisonId = String(envelope.payload.comparisonId);
    const modeRaw = String(comparison.analysisMode ?? "mock");
    const analysisMode = modeRaw === "gemini" ? "gemini" : "mock";
    const title =
      analysisMode === "mock"
        ? "ContractFlow AI — Comparative Report (MOCK)"
        : "ContractFlow AI — Comparative Report";
    const fileName = `comparison-${reportId}.pdf`;
    const storageKey = `${envelope.householdId}/${contractId}/${jobId}/${fileName}`;

    const risks = Array.isArray(comparison.risks)
      ? (comparison.risks as string[])
      : [];
    const citations = Array.isArray(comparison.citations)
      ? (comparison.citations as Array<{ documentId: string; page?: number; excerpt: string }>)
      : undefined;

    const body = await this.pdf.generateReport({
      title,
      analysisMode,
      jobId,
      contractId,
      comparisonId,
      verdict: String(comparison.verdict ?? "depends"),
      summary: String(comparison.summary ?? ""),
      priceNotes: String(comparison.priceNotes ?? ""),
      coverageNotes: String(comparison.coverageNotes ?? ""),
      disclaimer: String(comparison.disclaimer ?? "Informational only."),
      risks,
      citations,
      limits: [
        "Informational analysis — not legal or financial advice.",
        "PDF/TXT extraction only; scanned PDFs without text are rejected.",
      ],
    });

    const bucket = process.env.S3_BUCKET_REPORTS ?? "reports";
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: body,
        ContentType: "application/pdf",
      }),
    );

    try {
      await this.db!.collection("report_idempotency").insertOne({
        jobId,
        reportId,
        storageKey,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return;
      }
      throw error;
    }

    await this.publish(
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
    source: { eventId: string; correlationId: string; householdId: string },
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    return {
      eventId: randomUUID(),
      eventType,
      schemaVersion: 1 as const,
      correlationId: source.correlationId,
      causationId: source.eventId,
      householdId: source.householdId,
      occurredAt: new Date().toISOString(),
      payload,
    };
  }

  private async publish(
    routingKey: string,
    envelope: { eventId: string; eventType: string; correlationId: string },
  ): Promise<void> {
    if (!this.confirmChannel) return;
    const body = Buffer.from(JSON.stringify(envelope));
    await new Promise<void>((resolve, reject) => {
      this.confirmChannel!.publish(
        this.exchange,
        routingKey,
        body,
        {
          contentType: "application/json",
          deliveryMode: 2,
          messageId: envelope.eventId,
          correlationId: envelope.correlationId,
          type: envelope.eventType,
          mandatory: true,
        },
        (err) => (err ? reject(err) : resolve()),
      );
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
