import { createEventValidators } from "./schema-registry";
import {
  KNOWN_EVENT_TYPES,
  type EventEnvelope,
  type KnownEventType,
  type ValidateEventResult,
} from "./types";

const validators = createEventValidators();

function isKnownEventType(value: string): value is KnownEventType {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(value);
}

export function validateEvent(raw: unknown): ValidateEventResult {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, error: "Event must be a JSON object" };
  }

  if (!validators.validateEnvelope(raw)) {
    return {
      ok: false,
      error: validators.validateEnvelope.errors?.[0]?.message ?? "Invalid event envelope",
    };
  }

  const envelope = raw as EventEnvelope;
  if (!isKnownEventType(envelope.eventType)) {
    return { ok: false, error: `Unsupported eventType: ${envelope.eventType}` };
  }

  if (!validators.validatePayload(envelope.eventType, envelope.payload)) {
    return {
      ok: false,
      error: validators.payloadErrors(envelope.eventType) ?? "Invalid event payload",
    };
  }

  return { ok: true, event: envelope };
}
