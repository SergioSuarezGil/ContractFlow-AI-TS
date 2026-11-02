import amqp, { type Channel, type ChannelModel, type ConfirmChannel } from "amqplib";
import { envOr, requiredEnv } from "../config/required-env";

export async function connectRabbit(): Promise<{
  connection: ChannelModel;
  channel: Channel;
  exchange: string;
}> {
  const url = requiredEnv("RABBITMQ_URL");
  const exchange = envOr("RABBITMQ_EXCHANGE", "contractflow.events");
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  await channel.assertExchange(exchange, "topic", { durable: true });
  return { connection, channel, exchange };
}

export async function connectRabbitConfirm(): Promise<{
  connection: ChannelModel;
  channel: ConfirmChannel;
  exchange: string;
}> {
  const url = requiredEnv("RABBITMQ_URL");
  const exchange = envOr("RABBITMQ_EXCHANGE", "contractflow.events");
  const connection = await amqp.connect(url);
  const channel = await connection.createConfirmChannel();
  await channel.assertExchange(exchange, "topic", { durable: true });
  return { connection, channel, exchange };
}
