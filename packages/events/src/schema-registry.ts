import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { KnownEventType } from "./types";

const eventsDir = join(__dirname, "..", "..", "..", "contracts", "events");

function loadSchema(fileName: string): object {
  return JSON.parse(readFileSync(join(eventsDir, fileName), "utf8")) as object;
}

const payloadSchemaFiles: Record<KnownEventType, string> = {
  "comparison.requested.v1": "comparison.requested.v1.schema.json",
  "comparison.completed.v1": "comparison.completed.v1.schema.json",
  "comparison.failed.v1": "comparison.failed.v1.schema.json",
  "report.requested.v1": "report.requested.v1.schema.json",
  "report.completed.v1": "report.completed.v1.schema.json",
  "report.failed.v1": "report.failed.v1.schema.json",
};

export interface EventValidators {
  validateEnvelope: ValidateFunction;
  validatePayload: (eventType: KnownEventType, payload: unknown) => boolean;
  payloadErrors: (eventType: KnownEventType) => string | undefined;
}

export function createEventValidators(): EventValidators {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  ajv.addSchema(loadSchema("comparison-result.schema.json"));

  const envelopeSchema = loadSchema("envelope.schema.json");
  const validateEnvelope = ajv.compile({
    ...envelopeSchema,
    properties: {
      ...(envelopeSchema as { properties: Record<string, unknown> }).properties,
      payload: { type: "object" },
    },
  });

  const payloadValidators = Object.fromEntries(
    (Object.keys(payloadSchemaFiles) as KnownEventType[]).map((eventType) => {
      const schema = loadSchema(payloadSchemaFiles[eventType]);
      return [eventType, ajv.compile(schema)];
    }),
  ) as Record<KnownEventType, ValidateFunction>;

  return {
    validateEnvelope,
    validatePayload(eventType: KnownEventType, payload: unknown): boolean {
      return payloadValidators[eventType](payload) as boolean;
    },
    payloadErrors(eventType: KnownEventType): string | undefined {
      return ajv.errorsText(payloadValidators[eventType].errors);
    },
  };
}
