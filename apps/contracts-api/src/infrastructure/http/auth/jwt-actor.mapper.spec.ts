import { InvalidJwtActorError, mapJwtPayloadToActor } from "./jwt-actor.mapper";

describe("mapJwtPayloadToActor", () => {
  it("uses sub as stable ownerId", () => {
    const actor = mapJwtPayloadToActor({
      sub: "uuid-123",
      preferred_username: "demo",
      household_id: "hh_acme",
    });
    expect(actor.ownerId).toBe("uuid-123");
    expect(actor.householdId).toBe("hh_acme");
  });

  it("defaults household from sub when claim missing", () => {
    const actor = mapJwtPayloadToActor({ sub: "user-9" });
    expect(actor.householdId).toBe("hh_user-9");
  });

  it("rejects missing sub", () => {
    expect(() => mapJwtPayloadToActor({ preferred_username: "demo" })).toThrow(
      InvalidJwtActorError,
    );
  });
});
