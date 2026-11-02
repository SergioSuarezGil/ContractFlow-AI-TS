export type AuthMode = "oidc" | "dev";

export function resolveAuthMode(env: NodeJS.ProcessEnv = process.env): AuthMode {
  const mode = (env.AUTH_MODE ?? "oidc").toLowerCase();
  if (mode === "dev") {
    assertDevAuthAllowed(env);
    return "dev";
  }
  if (mode !== "oidc") {
    throw new Error(`Unsupported AUTH_MODE '${mode}'. Use 'oidc' or 'dev'.`);
  }
  return "oidc";
}

export function assertDevAuthAllowed(env: NodeJS.ProcessEnv = process.env): void {
  const nodeEnv = (env.NODE_ENV ?? "production").toLowerCase();
  if (nodeEnv !== "development" && nodeEnv !== "test") {
    throw new Error(
      "AUTH_MODE=dev is only allowed when NODE_ENV is development or test",
    );
  }
}

export function requireOidcAudience(env: NodeJS.ProcessEnv = process.env): string {
  const audience = env.OIDC_AUDIENCE?.trim();
  if (!audience) {
    throw new Error("OIDC_AUDIENCE is required when AUTH_MODE=oidc");
  }
  return audience;
}
