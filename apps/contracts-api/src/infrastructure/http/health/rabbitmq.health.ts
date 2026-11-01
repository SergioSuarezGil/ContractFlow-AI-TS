import { Injectable } from "@nestjs/common";
import { connectRabbit } from "../../messaging/rabbitmq-connection";

@Injectable()
export class RabbitMqHealthIndicator {
  async ping(): Promise<{ exchange: string }> {
    const { connection, channel, exchange } = await connectRabbit();
    await channel.checkExchange(exchange);
    await channel.close().catch(() => undefined);
    await connection.close().catch(() => undefined);
    return { exchange };
  }
}
