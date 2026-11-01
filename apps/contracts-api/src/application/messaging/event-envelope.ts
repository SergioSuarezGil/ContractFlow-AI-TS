export interface EventEnvelope<TPayload extends object = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  schemaVersion: 1;
  correlationId: string;
  causationId: string | null;
  householdId: string;
  occurredAt: string;
  payload: TPayload;
}

export function createEnvelope<TPayload extends object>(input: {
  eventId: string;
  eventType: string;
  correlationId: string;
  causationId?: string | null;
  householdId: string;
  payload: TPayload;
  occurredAt?: Date;
}): EventEnvelope<TPayload> {
  return {
    eventId: input.eventId,
    eventType: input.eventType,
    schemaVersion: 1,
    correlationId: input.correlationId,
    causationId: input.causationId ?? null,
    householdId: input.householdId,
    occurredAt: (input.occurredAt ?? new Date()).toISOString(),
    payload: input.payload,
  };
}
