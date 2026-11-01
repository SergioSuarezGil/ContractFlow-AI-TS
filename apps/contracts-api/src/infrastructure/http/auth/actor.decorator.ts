import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { ActorContext } from "../../../application/dto/actor.dto";
import type { Request } from "express";

export const Actor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext => {
    const request = ctx.switchToHttp().getRequest<Request & { actor?: ActorContext }>();
    if (!request.actor) {
      return { ownerId: "user_demo", householdId: "hh_demo" };
    }
    return request.actor;
  },
);
