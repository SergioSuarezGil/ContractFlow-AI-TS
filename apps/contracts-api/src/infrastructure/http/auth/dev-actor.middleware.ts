import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import type { ActorContext } from "../../../application/dto/actor.dto";

/**
 * Temporary identity bridge until Keycloak JWT validation is wired.
 * Pass X-Owner-Id and X-Household-Id headers in local/dev.
 */
@Injectable()
export class DevActorMiddleware implements NestMiddleware {
  use(req: Request & { actor?: ActorContext }, _res: Response, next: NextFunction): void {
    const ownerHeader = req.header("x-owner-id");
    const householdHeader = req.header("x-household-id");
    req.actor = {
      ownerId: ownerHeader?.trim() || process.env.DEV_OWNER_ID || "user_demo",
      householdId:
        householdHeader?.trim() || process.env.DEV_HOUSEHOLD_ID || "hh_demo",
    };
    next();
  }
}
