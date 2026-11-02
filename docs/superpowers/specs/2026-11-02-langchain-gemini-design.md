# Design: LangChain.js + Gemini contract analyzer

**Date:** 2026-11-02  
**Status:** approved in conversation (pending file review)  
**Scope:** ContractFlow-AI-TS `ai-worker` LLM provider only

## Goal

Replace the OpenAI SDK path with a **LangChain.js + Gemini** adapter behind the existing `ContractAnalyzerPort`, so the demo can run a real free-tier model and the same pattern can later be reproduced in Python (`langchain` + `ChatGoogleGenerativeAI`) without changing the hexagonal boundary.

## Decisions

| Decision | Choice |
|----------|--------|
| Providers | `LLM_PROVIDER=mock\|gemini` (default `mock`) |
| OpenAI | Remove analyzer, dependency, and labels |
| LangChain style | Thin adapter: model + `withStructuredOutput(Zod)` — no agents, no RAG |
| Package | `@langchain/core` + `@langchain/google-genai` (`ChatGoogleGenerativeAI`) for name parity with Python |
| CI / deploy | None — local unit tests only |
| Python port | Out of scope for this change; document the mirror contract only |

## Architecture

```
ComparisonPipeline
  → ContractAnalyzerPort
       ├─ MockContractAnalyzer          (unchanged)
       └─ GeminiLangChainContractAnalyzer  (new)
            ChatGoogleGenerativeAI
              .withStructuredOutput(contractAnalysisSchema)
            + same SYSTEM_PROMPT / PROMPT_VERSION
            + Zod parse + verdictFromPrices
            + retry once on schema/transport failure
```

- Extraction, PII redaction, citation checks, outbox, PDF worker, and web polling stay as they are.
- Only provider meta, env, wiring, and UI/PDF mode labels change from `openai` → `gemini`.

## Components

### Port (`contract-analyzer.port.ts`)

- `AnalyzerRunMeta.provider`: `"mock" | "gemini"`.
- Result shape unchanged (`structured` + `meta`).

### `GeminiLangChainContractAnalyzer`

- Reads `GOOGLE_API_KEY` (required when `LLM_PROVIDER=gemini`).
- Optional: `GEMINI_MODEL` (default `gemini-2.0-flash`), `GEMINI_MAX_OUTPUT_TOKENS`, `GEMINI_TIMEOUT_MS` / LangChain maxRetries.
- Builds user payload identical in spirit to the former OpenAI analyzer (jobId, docs excerpts, optional repair hint).
- Invokes structured chat; maps usage into `inputTokens` / `outputTokens` when available (else `0`).
- On failure: one repair attempt with hint; then throw (pipeline already handles job failure).

### Wiring (`messaging.module.ts`)

- Factory: `gemini` → LangChain analyzer; else mock.
- Drop OpenAI imports/classes.

### Downstream labels

- `analysisMode`: `"mock" | "gemini"` in comparison types, PDF generator badge (`REAL (Gemini)` / `MOCK`), web-demo `VITE_LLM_PROVIDER` if present, metrics tariffs as needed for the Gemini model id.

### Env / docs

- `.env.example`: `LLM_PROVIDER=mock`, `GOOGLE_API_KEY=`, `GEMINI_MODEL=gemini-2.0-flash`.
- README, architecture notes, demo-script: mock vs Gemini; remove OpenAI instructions.
- Short “Python parity” note: same prompt/schema versions + `ChatGoogleGenerativeAI` + structured output — no code in this repo yet.

## Data flow

1. Worker receives comparison job → extract → redact PII.
2. Analyzer returns structured analysis + meta.
3. Citations validated against excerpts; comparison persisted; report requested.
4. PDF/UI show mock vs Gemini mode from `analysisMode` / meta.

## Error handling

- Missing `GOOGLE_API_KEY` when provider is `gemini`: fail fast at analyzer construction or first analyze with a clear error.
- Schema / JSON failures: one retry with repair hint; then surface error to existing consumer failure path.
- Network/rate limits: rely on LangChain `maxRetries` + our single schema retry; no infinite loops.

## Testing

- Keep all mock analyzer and guardrail unit tests.
- Add focused unit tests for Gemini analyzer with **mocked** LangChain model (no network, no CI).
- Wiring/factory test: `LLM_PROVIDER=gemini` selects Gemini class (optional, lightweight).
- Manual smoke only: set key locally and run one comparison — not automated.

## Out of scope

- GitHub Actions, remote deploy, Coolify.
- Python worker / shared package.
- Agents, tools, RAG, LlamaIndex.
- Keeping OpenAI as a third provider.
- Changing Zod schema fields or prompt semantics (version bump only if prompt text must change for Gemini).

## Acceptance criteria

1. `LLM_PROVIDER=mock` (default): behavior and tests unchanged for the mock path.
2. `LLM_PROVIDER=gemini` + valid `GOOGLE_API_KEY`: analyzer uses LangChain `ChatGoogleGenerativeAI` and returns schema-valid structured analysis.
3. No `openai` dependency in `ai-worker`.
4. Docs/env/demo-script describe mock|gemini only.
5. `pnpm test` (and existing local lint/typecheck if run) pass without calling Gemini.
6. Design notes state how Python can mirror the same port later.

## Risks

- Gemini structured-output quirks vs OpenAI JSON mode → mitigated by Zod + one repair retry.
- Package deprecation notes around `@langchain/google-genai` vs newer `@langchain/google` → accept genai package for Python class-name parity; revisit later if needed.
- Free-tier rate limits → demo script: prefer mock; use Gemini only for the live LLM slide.
