#!/usr/bin/env node
/**
 * Fetches the OpenAPI document from a running contracts-api and writes
 * contracts/openapi/openapi.yaml (and .json).
 *
 * Usage (API must be up):
 *   node scripts/export-openapi.mjs
 *   OPENAPI_URL=http://localhost:3000/docs-json node scripts/export-openapi.mjs
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "apps/contracts-api/package.json"));
const { dump } = require("js-yaml");

const url = process.env.OPENAPI_URL ?? "http://127.0.0.1:3000/docs-json";
const outDir = resolve(root, "contracts/openapi");

const response = await fetch(url);
if (!response.ok) {
  console.error(`Failed to fetch OpenAPI from ${url}: ${response.status}`);
  process.exit(1);
}

const document = await response.json();
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "openapi.json"), JSON.stringify(document, null, 2));
await writeFile(resolve(outDir, "openapi.yaml"), dump(document, { lineWidth: 100 }));
console.log(`Wrote ${outDir}/openapi.yaml and openapi.json`);
