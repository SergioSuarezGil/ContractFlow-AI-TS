import { randomUUID } from "node:crypto";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { MongoClient, type Db } from "mongodb";
import {
  MockComparisonService,
  type ComparisonInput,
} from "../../application/mock-comparison.service";

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
export class ComparisonConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComparisonConsumerService.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private mongo?: MongoClient;
  private db?: Db;
  private readonly queue = "contractflow.ai.compare";
  private exchange = "contractflow.events";

  constructor(private readonly mockComparison: MockComparisonService) {}

  async onModuleInit(): Promise<void> {
    const mongoUri =
      process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/contractflow?directConnection=true";
    this.mongo = new MongoClient(mongoUri);
    await this.mongo.connect();
    this.db = this.mongo.db(process.env.MONGODB_DB ?? "contractflow");

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
    this.logger.log(`AI worker consuming ${this.queue}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    await this.mongo?.close().catch(() => undefined);
  }

  isReady(): boolean {
    return Boolean(this.channel && this.db);
  }

  private async onMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel || !this.db) return;
    let envelope: EventEnvelope;
    try {
      envelope = JSON.parse(msg.content.toString("utf8")) as EventEnvelope;
    } catch {
      this.channel.nack(msg, false, false);
      return;
    }

    if (envelope.eventType !== "comparison.requested.v1") {
      this.channel.ack(msg);
      return;
    }

    try {
      await this.process(envelope);
      this.channel.ack(msg);
    } catch (error) {
      this.logger.error((error as Error).message, (error as Error).stack);
      await this.publishFailure(envelope, (error as Error).message).catch(() => undefined);
      this.channel.nack(msg, false, false);
    }
  }

  private async process(envelope: EventEnvelope): Promise<void> {
    const payload = envelope.payload;
    const input: ComparisonInput = {
      jobId: String(payload.jobId),
      contractId: String(payload.contractId),
      ownerId: String(payload.ownerId),
      householdId: envelope.householdId,
      title: String(payload.title ?? "Contract"),
      providerName: String(payload.providerName ?? "Unknown"),
      serviceType: String(payload.serviceType ?? "other"),
      currentDocumentIds: (payload.currentDocumentIds as string[]) ?? [],
      proposalDocumentIds: (payload.proposalDocumentIds as string[]) ?? [],
    };

    const result = this.mockComparison.analyze(input);
    await this.db!.collection("comparisons").updateOne(
      { id: result.id },
      { $set: { ...result, householdId: input.householdId, ownerId: input.ownerId } },
      { upsert: true },
    );

    const completed = this.envelope(envelope, "comparison.completed.v1", {
      jobId: input.jobId,
      contractId: input.contractId,
      ownerId: input.ownerId,
      comparisonId: result.id,
      verdict: result.summary,
      comparison: result,
    });
    this.publish("comparison.completed.v1", completed);

    const reportRequested = this.envelope(envelope, "report.requested.v1", {
      jobId: input.jobId,
      contractId: input.contractId,
      ownerId: input.ownerId,
      comparisonId: result.id,
      comparison: result,
    });
    this.publish("report.requested.v1", reportRequested);
  }

  private async publishFailure(envelope: EventEnvelope, errorMessage: string): Promise<void> {
    const failed = this.envelope(envelope, "comparison.failed.v1", {
      jobId: String(envelope.payload.jobId),
      contractId: String(envelope.payload.contractId),
      ownerId: String(envelope.payload.ownerId),
      errorMessage,
    });
    this.publish("comparison.failed.v1", failed);
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
}
