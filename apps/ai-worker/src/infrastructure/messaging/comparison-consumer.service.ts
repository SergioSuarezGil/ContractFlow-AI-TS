import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { validateEvent } from "@contractflow/events";
import amqp, { type Channel, type ChannelModel, type ConfirmChannel, type ConsumeMessage } from "amqplib";
import { MongoClient, type Db } from "mongodb";
import type { ComparisonResult } from "../../application/comparison-result.types";
import { ComparisonPipelineService } from "../../application/comparison-pipeline.service";
import {
  estimateLlmCostUsd,
  type LlmMetrics,
} from "@contractflow/observability";
import { LLM_METRICS } from "../http/metrics/llm-metrics.tokens";

const MAX_RETRIES = 3;

@Injectable()
export class ComparisonConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComparisonConsumerService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private confirmChannel?: ConfirmChannel;
  private mongo?: MongoClient;
  private db?: Db;
  private readonly queue = "contractflow.ai.compare";
  private exchange = "contractflow.events";
  private shuttingDown = false;

  constructor(
    private readonly pipeline: ComparisonPipelineService,
    @Inject(LLM_METRICS) private readonly llmMetrics: LlmMetrics,
  ) {}

  async onModuleInit(): Promise<void> {
    const mongoUri =
      process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/contractflow?directConnection=true";
    this.mongo = new MongoClient(mongoUri);
    await this.mongo.connect();
    this.db = this.mongo.db(process.env.MONGODB_DB ?? "contractflow");
    await this.db.collection("comparisons").createIndex({ jobId: 1 }, { unique: true });
    await this.db.collection("comparisons").createIndex({ id: 1 }, { unique: true });

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
    this.logger.log(`AI worker consuming ${this.queue}`);
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    await this.channel?.close().catch(() => undefined);
    await this.confirmChannel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    await this.mongo?.close().catch(() => undefined);
  }

  isReady(): boolean {
    return Boolean(this.channel && this.db) && !this.shuttingDown;
  }

  private retryCount(msg: ConsumeMessage): number {
    const headers = msg.properties.headers ?? {};
    const raw = headers["x-retry-count"];
    return typeof raw === "number" ? raw : Number(raw ?? 0);
  }

  private async onMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel || !this.db) return;
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
    if (envelope.eventType !== "comparison.requested.v1") {
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
      const permanent =
        message.includes("UNPROCESSABLE") ||
        message.includes("Invalid citation") ||
        message.includes("validation") ||
        message.includes("Invalid");
      if (!permanent && retries < MAX_RETRIES) {
        const delay = Math.min(5000, 250 * 2 ** retries) + Math.floor(Math.random() * 100);
        await new Promise((r) => setTimeout(r, delay));
        this.channel.publish(this.exchange, msg.fields.routingKey, msg.content, {
          ...msg.properties,
          headers: { ...(msg.properties.headers ?? {}), "x-retry-count": retries + 1 },
        });
        this.channel.ack(msg);
        return;
      }
      await this.publishFailure(envelope, message).catch(() => undefined);
      this.channel.nack(msg, false, false);
    }
  }

  private stableComparisonId(jobId: string): string {
    return createHash("sha256").update(`comparison:${jobId}`).digest("hex").slice(0, 32);
  }

  private async process(envelope: {
    eventId: string;
    eventType: string;
    schemaVersion: number;
    correlationId: string;
    causationId: string | null;
    householdId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const payload = envelope.payload;
    const jobId = String(payload.jobId);
    const existing = await this.db!.collection("comparisons").findOne({ jobId });
    if (existing) {
      this.logger.log(`Idempotent skip for job ${jobId}`);
      return;
    }

    const started = process.hrtime.bigint();
    let result: ComparisonResult & { id: string };
    try {
      const analyzed = await this.pipeline.run({
        jobId,
        contractId: String(payload.contractId),
        ownerId: String(payload.ownerId),
        householdId: envelope.householdId,
        title: String(payload.title ?? "Contract"),
        providerName: String(payload.providerName ?? "Unknown"),
        serviceType: String(payload.serviceType ?? "other"),
        currentDocumentIds: (payload.currentDocumentIds as string[]) ?? [],
        proposalDocumentIds: (payload.proposalDocumentIds as string[]) ?? [],
      });
      result = { ...analyzed, id: this.stableComparisonId(jobId) };
      this.recordLlmMetrics(analyzed, "success", started);
    } catch (error) {
      this.recordLlmFailure(started, (error as Error).message);
      throw error;
    }

    try {
      await this.db!.collection("comparisons").insertOne({
        ...result,
        householdId: envelope.householdId,
        ownerId: String(payload.ownerId),
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        this.logger.log(`Duplicate comparison for job ${jobId}`);
        return;
      }
      throw error;
    }

    const completed = this.envelope(envelope, "comparison.completed.v1", {
      jobId,
      contractId: String(payload.contractId),
      ownerId: String(payload.ownerId),
      comparisonId: result.id,
      verdict: result.verdict,
      comparison: result,
    });
    await this.publish("comparison.completed.v1", completed);

    const reportRequested = this.envelope(envelope, "report.requested.v1", {
      jobId,
      contractId: String(payload.contractId),
      ownerId: String(payload.ownerId),
      comparisonId: result.id,
      comparison: result,
    });
    await this.publish("report.requested.v1", reportRequested);
  }

  private recordLlmMetrics(
    result: ComparisonResult,
    outcome: "success" | "error",
    started: bigint,
  ): void {
    const usage = result.llmUsage;
    if (!usage) return;
    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    const labels = { provider: usage.provider, model: usage.model };
    this.llmMetrics.durationSeconds.observe(labels, seconds);
    this.llmMetrics.requestsTotal.inc({ ...labels, outcome });
    this.llmMetrics.inputTokensTotal.inc(labels, usage.inputTokens);
    this.llmMetrics.outputTokensTotal.inc(labels, usage.outputTokens);
    if (usage.retries > 0) {
      this.llmMetrics.retriesTotal.inc(labels, usage.retries);
    }
    const cost = estimateLlmCostUsd(usage.model, usage.inputTokens, usage.outputTokens);
    if (cost > 0) {
      this.llmMetrics.estimatedCostUsdTotal.inc(labels, cost);
    }
  }

  private recordLlmFailure(started: bigint, _message: string): void {
    const provider = (process.env.LLM_PROVIDER ?? "mock").toLowerCase() === "gemini" ? "gemini" : "mock";
    const model =
      provider === "gemini"
        ? process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash"
        : "mock-contract-analyzer-v1";
    const labels = { provider, model };
    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    this.llmMetrics.durationSeconds.observe(labels, seconds);
    this.llmMetrics.requestsTotal.inc({ ...labels, outcome: "error" });
  }

  private async publishFailure(
    envelope: {
      eventId: string;
      correlationId: string;
      householdId: string;
      payload: Record<string, unknown>;
    },
    errorMessage: string,
  ): Promise<void> {
    const failed = this.envelope(envelope, "comparison.failed.v1", {
      jobId: String(envelope.payload.jobId),
      contractId: String(envelope.payload.contractId),
      ownerId: String(envelope.payload.ownerId),
      errorMessage,
    });
    await this.publish("comparison.failed.v1", failed);
  }

  private envelope(
    source: {
      eventId: string;
      correlationId: string;
      householdId: string;
    },
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
    envelope: {
      eventId: string;
      eventType: string;
      correlationId: string;
    },
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
}
