import { Job } from "./job";

describe("Job", () => {
  const outbox = {
    routingKey: "comparison.requested.v1",
    envelope: { eventId: "e1", eventType: "comparison.requested.v1" },
    publishedAt: null as string | null,
  };

  function createJob() {
    return Job.create({
      id: "job-1",
      contractId: "c1",
      householdId: "hh1",
      ownerId: "u1",
      correlationId: "corr-1",
      outbox,
    });
  }

  it("starts PENDING with unpublished outbox", () => {
    const job = createJob();
    const snap = job.snapshot();
    expect(snap.status).toBe("PENDING");
    expect(snap.outbox?.publishedAt).toBeNull();
    expect(snap.version).toBe(0);
  });

  it("marks outbox published and moves to PROCESSING", () => {
    const job = createJob();
    job.markOutboxPublished();
    const snap = job.snapshot();
    expect(snap.status).toBe("PROCESSING");
    expect(snap.outbox?.publishedAt).toBeTruthy();
    expect(snap.version).toBe(1);
  });

  it("does not regress COMPLETED to PROCESSING via comparison event", () => {
    const job = createJob();
    job.markOutboxPublished();
    job.markComparisonCompleted("cmp-1");
    job.markCompleted("rep-1");
    job.markComparisonCompleted("cmp-2");
    expect(job.snapshot().status).toBe("COMPLETED");
    expect(job.snapshot().comparisonId).toBe("cmp-1");
  });

  it("ignores markFailed after COMPLETED", () => {
    const job = createJob();
    job.markOutboxPublished();
    job.markCompleted("rep-1");
    job.markFailed("late failure");
    expect(job.snapshot().status).toBe("COMPLETED");
  });
});
