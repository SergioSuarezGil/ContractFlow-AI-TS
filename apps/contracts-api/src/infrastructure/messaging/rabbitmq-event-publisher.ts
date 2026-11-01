import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Channel, ChannelModel } from "amqplib";
import type { EventEnvelope } from "../../application/messaging/event-envelope";
import type { EventPublisher } from "../../application/ports/event-publisher";
import { connectRabbit } from "./rabbitmq-connection";

@Injectable()
export class RabbitMqEventPublisher
  implements EventPublisher, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqEventPublisher.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private exchange = "contractflow.events";

  async onModuleInit(): Promise<void> {
    const connected = await connectRabbit();
    this.connection = connected.connection;
    this.channel = connected.channel;
    this.exchange = connected.exchange;
    this.logger.log(`Publisher connected to exchange ${this.exchange}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async publish(routingKey: string, envelope: EventEnvelope): Promise<void> {
    if (!this.channel) {
      throw new Error("RabbitMQ channel is not ready");
    }
    const body = Buffer.from(JSON.stringify(envelope), "utf8");
    this.channel.publish(this.exchange, routingKey, body, {
      contentType: "application/json",
      deliveryMode: 2,
      messageId: envelope.eventId,
      correlationId: envelope.correlationId,
      type: envelope.eventType,
    });
  }
}
