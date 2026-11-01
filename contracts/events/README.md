# Event contracts

Exchange: `contractflow.events` (topic)

Initial event types:

- `document.uploaded.v1`
- `document.indexed.v1`
- `comparison.requested.v1`
- `comparison.completed.v1`
- `comparison.failed.v1`
- `report.requested.v1`
- `report.completed.v1`
- `report.failed.v1`

JSON Schema files will be added as the first real publishers land. Envelope fields: `eventId`, `eventType`, `schemaVersion`, `correlationId`, `causationId`, `householdId`, `occurredAt`, `payload`.
