import { ServiceContract } from "./service-contract";

describe("ServiceContract", () => {
  it("creates a draft contract", () => {
    const contract = ServiceContract.create({
      id: "c1",
      householdId: "hh1",
      ownerId: "u1",
      serviceType: "electricity",
      providerName: "DemoEnergy",
      title: "Home power",
    });
    expect(contract.status).toBe("draft");
    expect(contract.snapshot().title).toBe("Home power");
  });

  it("requires current and proposal docs before comparison", () => {
    const contract = ServiceContract.create({
      id: "c1",
      householdId: "hh1",
      ownerId: "u1",
      serviceType: "gas",
      providerName: "GasCo",
      title: "Gas",
    });
    expect(() => contract.canRequestComparison()).toThrow(/current document/);
    contract.attachDocument("d1", "current");
    expect(() => contract.canRequestComparison()).toThrow(/proposal document/);
    contract.attachDocument("d2", "proposal");
    expect(() => contract.canRequestComparison()).not.toThrow();
  });
});
