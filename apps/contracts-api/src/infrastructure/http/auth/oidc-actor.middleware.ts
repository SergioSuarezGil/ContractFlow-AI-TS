import {
  Injectable,
  Logger,
  UnauthorizedException,
  type NestMiddleware,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { ActorContext } from "../../../application/dto/actor.dto";
import { requireOidcAudience, resolveAuthMode, type AuthMode } from "./auth-mode";
import { InvalidJwtActorError, mapJwtPayloadToActor } from "./jwt-actor.mapper";

type AuthedRequest = Request & { actor?: ActorContext };

@Injectable()
export class OidcActorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OidcActorMiddleware.name);
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly jwksUri: string;
  private readonly authMode: AuthMode;
  private readonly audience?: string;

  constructor() {
    this.authMode = resolveAuthMode();
    this.audience =
      this.authMode === "oidc" ? requireOidcAudience() : undefined;
    this.issuer =
      process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/contractflow";
    this.jwksUri =
      process.env.OIDC_JWKS_URI ??
      "http://keycloak:8080/realms/contractflow/protocol/openid-connect/certs";
  }

  use(req: AuthedRequest, _res: Response, next: NextFunction): void {
    void this.handle(req, next);
  }

  private async handle(req: AuthedRequest, next: NextFunction): Promise<void> {
    try {
      if (this.authMode === "dev") {
        req.actor = {
          ownerId: req.header("x-owner-id")?.trim() || process.env.DEV_OWNER_ID || "demo",
          householdId:
            req.header("x-household-id")?.trim() ||
            process.env.DEV_HOUSEHOLD_ID ||
            "hh_demo",
        };
        next();
        return;
      }

      const header = req.header("authorization");
      if (!header?.toLowerCase().startsWith("bearer ")) {
        throw new UnauthorizedException("Missing Bearer token");
      }
      const token = header.slice("bearer ".length).trim();
      if (!token) {
        throw new UnauthorizedException("Empty Bearer token");
      }

      if (!this.jwks) {
        this.jwks = createRemoteJWKSet(new URL(this.jwksUri));
      }

      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      req.actor = mapJwtPayloadToActor(payload);
      next();
    } catch (error) {
      if (error instanceof InvalidJwtActorError) {
        next(new UnauthorizedException(error.message));
        return;
      }
      this.logger.warn(`OIDC auth failed: ${(error as Error).message}`);
      const unauthorized = new UnauthorizedException("Invalid or expired access token");
      next(unauthorized);
    }
  }

}
