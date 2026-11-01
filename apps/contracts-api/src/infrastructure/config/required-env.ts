/** Fail fast when a required secret/config env var is missing. */
export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required (set it in .env — see .env.example)`);
  }
  return value;
}

export function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}
