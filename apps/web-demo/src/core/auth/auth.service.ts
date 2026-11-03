import {
  User,
  UserManager,
  WebStorageStateStore,
  type UserProfile,
} from "oidc-client-ts";

/**
 * Redirect URIs must be computed at runtime from window.location.origin.
 * Baking a fixed host into the Docker image breaks login when the user opens
 * a different host (localhost vs 127.0.0.1).
 */
const authority =
  import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8080/realms/contractflow";
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID ?? "contractflow-web";

export type AuthProvider = "keycloak" | "google-mock";

export interface SessionIdentity {
  ownerId: string;
  householdId: string;
  displayName: string;
  accessToken: string;
  provider: AuthProvider;
}

function redirectUri(): string {
  return import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/callback`;
}

function postLogoutRedirectUri(): string {
  return (
    import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI || `${window.location.origin}/`
  );
}

const PROVIDER_KEY = "contractflow.auth.provider";

/**
 * React Strict Mode mounts the callback twice in Vite. Keycloak authorization
 * codes are single-use, so a second exchange returns "Code not valid" and the
 * UI wipes the session. Share one exchange per callback URL.
 */
let redirectCallbackInflight: { url: string; pending: Promise<SessionIdentity> } | null =
  null;

const userManager = new UserManager({
  authority,
  client_id: clientId,
  redirect_uri: redirectUri(),
  post_logout_redirect_uri: postLogoutRedirectUri(),
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: true,
  monitorSession: false,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});

function readProvider(): AuthProvider {
  const value = window.localStorage.getItem(PROVIDER_KEY);
  return value === "google-mock" ? "google-mock" : "keycloak";
}

function writeProvider(provider: AuthProvider): void {
  window.localStorage.setItem(PROVIDER_KEY, provider);
}

function toIdentity(user: User, provider: AuthProvider = readProvider()): SessionIdentity {
  const profile = user.profile as UserProfile & { household_id?: string | string[] };
  const ownerId = String(profile.preferred_username ?? profile.sub ?? "unknown");
  const householdRaw = profile.household_id;
  const householdId = Array.isArray(householdRaw)
    ? String(householdRaw[0] ?? "")
    : String(householdRaw ?? "");
  return {
    ownerId,
    householdId: householdId || `hh_${ownerId}`,
    displayName: String(profile.name ?? ownerId),
    accessToken: user.access_token,
    provider,
  };
}

async function ensureUser(): Promise<User | null> {
  let user = await userManager.getUser();
  if (!user) return null;
  if (!user.expired) return user;
  try {
    user = await userManager.signinSilent();
    return user;
  } catch {
    await userManager.removeUser();
    return null;
  }
}

async function fetchUserInfo(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${authority}/protocol/openid-connect/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("Failed to load user profile");
  }
  return (await response.json()) as UserProfile;
}

/**
 * Mock Google OAuth: UI simulates Google account picker, then obtains a real
 * Keycloak token via Resource Owner Password (demo user) so API calls work.
 */
async function storePasswordGrantUser(
  username: string,
  password: string,
  provider: AuthProvider,
): Promise<SessionIdentity> {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    username,
    password,
    scope: "openid profile email",
  });
  const response = await fetch(`${authority}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("Mock Google sign-in failed (Keycloak token grant)");
  }
  const tokens = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    token_type: string;
    scope?: string;
    expires_in: number;
  };
  const profile = await fetchUserInfo(tokens.access_token);
  const user = new User({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    id_token: tokens.id_token,
    token_type: tokens.token_type,
    scope: tokens.scope,
    profile,
    expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
  });
  await userManager.storeUser(user);
  writeProvider(provider);
  return toIdentity(user, provider);
}

export const authService = {
  async getSession(): Promise<SessionIdentity | null> {
    const user = await ensureUser();
    return user ? toIdentity(user) : null;
  },

  async getAccessToken(): Promise<string | null> {
    const user = await ensureUser();
    return user?.access_token ?? null;
  },

  loginWithKeycloak(): Promise<void> {
    writeProvider("keycloak");
    return userManager.signinRedirect({ redirect_uri: redirectUri() });
  },

  async loginWithMockGoogle(): Promise<SessionIdentity> {
    // Simulated latency of a Google consent screen.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return storePasswordGrantUser("demo", "demo", "google-mock");
  },

  async handleCallback(): Promise<SessionIdentity> {
    const user = await userManager.signinRedirectCallback();
    writeProvider("keycloak");
    return toIdentity(user, "keycloak");
  },

  consumeRedirectCallback(): Promise<SessionIdentity> {
    const url = window.location.href;
    if (redirectCallbackInflight?.url === url) {
      return redirectCallbackInflight.pending;
    }
    const pending = this.handleCallback();
    redirectCallbackInflight = { url, pending };
    return pending;
  },

  async logout(): Promise<void> {
    const provider = readProvider();
    window.localStorage.removeItem(PROVIDER_KEY);
    if (provider === "google-mock") {
      await userManager.removeUser();
      window.location.assign("/");
      return;
    }
    await userManager.signoutRedirect({
      post_logout_redirect_uri: postLogoutRedirectUri(),
    });
  },
};
