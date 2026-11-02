# LangChain.js + Gemini Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OpenAI with LangChain.js `ChatGoogleGenerativeAI` behind `ContractAnalyzerPort` (`mock|gemini`).

**Architecture:** Thin `GeminiLangChainContractAnalyzer` adapter using `withStructuredOutput(contractAnalysisSchema)`; same prompt/schema versions; remove OpenAI SDK. Labels and env updated across ai-worker, pdf-worker, web-demo, docs.

**Tech Stack:** NestJS ai-worker, Zod, `@langchain/core`, `@langchain/google-genai`, Gemini via `GOOGLE_API_KEY`.

## Global Constraints

- `LLM_PROVIDER=mock|gemini` only (default `mock`)
- No GitHub Actions / deploy
- No commits unless user asks
- Local `pnpm test` must pass without calling Gemini
- Python port documented only, not implemented

## File map

| Path | Role |
|------|------|
| `apps/ai-worker/src/application/ports/contract-analyzer.port.ts` | provider union → `mock\|gemini` |
| `apps/ai-worker/src/infrastructure/llm/gemini-langchain-contract-analyzer.ts` | new adapter |
| `apps/ai-worker/src/infrastructure/llm/gemini-langchain-contract-analyzer.spec.ts` | unit tests with mocked model |
| `apps/ai-worker/src/infrastructure/llm/openai-contract-analyzer.ts` | delete |
| `apps/ai-worker/src/infrastructure/messaging/messaging.module.ts` | factory wiring |
| `apps/ai-worker/package.json` | deps |
| `apps/ai-worker/src/application/comparison-result.types.ts` | analysisMode |
| `apps/ai-worker/src/application/comparison-pipeline.service.ts` | map provider |
| `apps/ai-worker/src/infrastructure/messaging/comparison-consumer.service.ts` | model name labels |
| `apps/pdf-worker/.../pdf-report.types.ts` + generator + consumer | badges |
| `apps/web-demo/.../useContractsWorkspace.ts` | UI label |
| `packages/observability/src/llm-metrics.ts` | gemini tariff |
| `.env.example`, README, architecture, demo-script, AGENTS.md, roadmap | docs |

---

### Task 1: Port + deps + Gemini analyzer (TDD)

**Files:**
- Modify: `apps/ai-worker/src/application/ports/contract-analyzer.port.ts`
- Create: `apps/ai-worker/src/infrastructure/llm/gemini-langchain-contract-analyzer.ts`
- Create: `apps/ai-worker/src/infrastructure/llm/gemini-langchain-contract-analyzer.spec.ts`
- Delete: `apps/ai-worker/src/infrastructure/llm/openai-contract-analyzer.ts`
- Modify: `apps/ai-worker/package.json`, `apps/ai-worker/src/infrastructure/messaging/messaging.module.ts`

- [x] **Step 1:** Change port `provider` to `"mock" | "gemini"`.
- [x] **Step 2:** Write failing unit test that injects a fake structured invoker returning valid schema JSON and asserts `meta.provider === "gemini"`.
- [x] **Step 3:** `pnpm --filter @contractflow/ai-worker add @langchain/core @langchain/google-genai` and remove `openai`.
- [x] **Step 4:** Implement `GeminiLangChainContractAnalyzer` with optional ctor injection for the structured model (for tests); production ctor builds `ChatGoogleGenerativeAI` + `withStructuredOutput(contractAnalysisSchema)`.
- [x] **Step 5:** Wire factory `gemini` → Gemini analyzer; remove OpenAI.
- [x] **Step 6:** Run `pnpm --filter @contractflow/ai-worker test` — pass.
- [x] **Step 7:** Skip commit unless user asks.

**Analyzer sketch:**

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
// SYSTEM_PROMPT same as former OpenAI analyzer
// analyze(): 2 attempts; structured.invoke([SystemMessage, HumanMessage]);
// usage from rawResponse if includeRaw; else 0
```

Use `withStructuredOutput(schema, { includeRaw: true })` when available so token usage can be read from `raw.usage_metadata`.

---

### Task 2: Downstream analysisMode labels

**Files:** comparison-result.types, comparison-pipeline, comparison-consumer, pdf-report.types, simple-pdf.generator (+ spec), report-consumer, useContractsWorkspace, llm-metrics

- [x] Replace `"openai"` with `"gemini"` / `"REAL (Gemini)"` / `"real (Gemini)"` everywhere listed in file map.
- [x] Add tariff entry for default model `gemini-2.0-flash` (zeros or approximate free-tier placeholder `0`).
- [x] Run pdf-worker + ai-worker unit tests.

---

### Task 3: Env + docs

**Files:** `.env.example`, `README.md`, `docs/architecture/README.md`, `docs/demo-script.md`, `AGENTS.md`, `docs/roadmap/next-improvements.md`, short Python parity note in architecture or README

- [x] Document `GOOGLE_API_KEY`, `GEMINI_MODEL=gemini-2.0-flash`, `LLM_PROVIDER=mock|gemini`.
- [x] Note Python mirror: same prompt/schema + `ChatGoogleGenerativeAI` (no Python code).

---

### Task 4: Verify

- [x] `pnpm --filter @contractflow/ai-worker test`
- [x] `pnpm --filter @contractflow/pdf-worker test` (if package name matches)
- [x] `pnpm --filter @contractflow/ai-worker typecheck` (and lint if cheap)
- [x] Confirm `openai` gone from lockfile for ai-worker
