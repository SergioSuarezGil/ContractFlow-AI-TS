import type { EventEnvelope } from "../messaging/event-envelope";

export interface EventPublisher {
  publish(routingKey: string, envelope: EventEnvelope): Promise<void>;
}
