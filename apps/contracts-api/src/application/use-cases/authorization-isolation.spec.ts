import { Job } from "../../domain/job/job";
import { ServiceContract } from "../../domain/service-contract/service-contract";

describe("authorization isolation", () => {
  const ownerA = { ownerId: "user-a", householdId: "hh-a" };
  const ownerB = { ownerId: "user-b", householdId: "hh-b" };

  it("denies contract ownership across users", () => {
    const contract = ServiceContract.create({
      id: "c1",
      householdId: ownerA.householdId,
      ownerId: ownerA.ownerId,
      serviceType: "electricity",
      providerName: "GridCo",
      title: "Home power",
    });
    expect(contract.belongsTo(ownerA.ownerId, ownerA.householdId)).toBe(true);
    expect(contract.belongsTo(ownerB.ownerId, ownerB.householdId)).toBe(false);
  });

  it("denies job ownership across users", () => {
    const job = Job.create({
      id: "j1",
      contractId: "c1",
      householdId: ownerA.householdId,
      ownerId: ownerA.ownerId,
      correlationId: "corr",
      outbox: {
        routingKey: "comparison.requested.v1",
        envelope: { eventId: "e1" },
        publishedAt: null,
      },
    });
    expect(job.belongsTo(ownerA.ownerId, ownerA.householdId)).toBe(true);
    expect(job.belongsTo(ownerB.ownerId, ownerB.householdId)).toBe(false);
  });
});
