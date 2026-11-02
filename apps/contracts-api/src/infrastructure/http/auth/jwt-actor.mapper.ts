import type { JWTPayload } from "jose";
import type { ActorContext } from "../../../application/dto/actor.dto";

export class InvalidJwtActorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidJwtActorError";
  }
}

export function mapJwtPayloadToActor(payload: JWTPayload): ActorContext {
  const ownerId = String(payload.sub ?? "").trim();
  if (!ownerId) {
    throw new InvalidJwtActorError("Token missing subject (sub)");
  }
  const householdClaim = payload.household_id;
  const householdId = Array.isArray(householdClaim)
    ? String(householdClaim[0] ?? "").trim()
    : String(householdClaim ?? "").trim();
  return {
    ownerId,
    householdId: householdId || `hh_${ownerId}`,
  };
}
