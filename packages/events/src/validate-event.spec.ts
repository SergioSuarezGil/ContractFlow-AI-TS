import { validateEvent } from "./validate-event";

describe("validateEvent", () => {
  it("rejects envelope missing required fields", () => {
    const result = validateEvent({
      eventType: "comparison.requested.v1",
      payload: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it("rejects payload missing required fields for a known event type", () => {
    const result = validateEvent({
      eventId: "e1",
      eventType: "comparison.requested.v1",
      schemaVersion: 1,
      correlationId: "c1",
      causationId: null,
      householdId: "h1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: { jobId: "j1" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/required|contractId|ownerId/i);
    }
  });

  it("accepts a valid comparison.requested.v1 event", () => {
    const result = validateEvent({
      eventId: "e1",
      eventType: "comparison.requested.v1",
      schemaVersion: 1,
      correlationId: "c1",
      causationId: null,
      householdId: "h1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: {
        jobId: "j1",
        contractId: "c1",
        ownerId: "o1",
        currentDocumentIds: [],
        proposalDocumentIds: [],
        title: "Test",
        providerName: "Acme",
        serviceType: "electricity",
      },
    });

    expect(result.ok).toBe(true);
  });
});
