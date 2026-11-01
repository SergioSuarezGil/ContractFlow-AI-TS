#!/usr/bin/env node
/**
 * Generates TypeScript types for the web-demo from contracts/openapi/openapi.yaml
 * using openapi-typescript. Run after `pnpm openapi:export` (or with a checked-in yaml).
 */
import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = resolve(root, "contracts/openapi/openapi.yaml");
const output = resolve(
  root,
  "apps/web-demo/src/core/api/generated/openapi.d.ts",
);

try {
  await access(input);
} catch {
  console.error(`Missing ${input}. Run: pnpm openapi:export`);
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  ["exec", "openapi-typescript", input, "-o", output],
  { cwd: resolve(root, "apps/web-demo"), stdio: "inherit", shell: process.platform === "win32" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log(`Generated ${output}`);
