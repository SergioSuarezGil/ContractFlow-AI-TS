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

export type ValidateEventResult =
  | { ok: true; event: EventEnvelope }
  | { ok: false; error: string };

export const KNOWN_EVENT_TYPES = [
  "comparison.requested.v1",
  "comparison.completed.v1",
  "comparison.failed.v1",
  "report.requested.v1",
  "report.completed.v1",
  "report.failed.v1",
] as const;

export type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number];
