import { assertDevAuthAllowed, requireOidcAudience, resolveAuthMode } from "./auth-mode";

describe("auth-mode", () => {
  it("allows dev mode in test NODE_ENV", () => {
    expect(resolveAuthMode({ AUTH_MODE: "dev", NODE_ENV: "test" })).toBe("dev");
  });

  it("rejects dev mode in production NODE_ENV", () => {
    expect(() =>
      resolveAuthMode({ AUTH_MODE: "dev", NODE_ENV: "production" }),
    ).toThrow(/AUTH_MODE=dev/);
  });

  it("requires OIDC audience in oidc mode", () => {
    expect(() => requireOidcAudience({ AUTH_MODE: "oidc" })).toThrow(/OIDC_AUDIENCE/);
    expect(requireOidcAudience({ OIDC_AUDIENCE: "contractflow-api" })).toBe(
      "contractflow-api",
    );
  });

  it("assertDevAuthAllowed throws outside dev/test", () => {
    expect(() => assertDevAuthAllowed({ NODE_ENV: "production" })).toThrow();
  });
});
