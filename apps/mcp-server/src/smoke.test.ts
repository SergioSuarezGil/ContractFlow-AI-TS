import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("mcp server exposes compare_contracts tool wiring", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "index.js"), "utf8");
  assert.match(src, /registerTool\(\s*["']compare_contracts["']/);
  assert.match(src, /registerTool\(\s*["']get_comparison_job["']/);
});
