# Architecture

High-level design for the TypeScript implementation of ContractFlow AI.

## Processes

1. **contracts-api** — REST edge, OIDC auth, contract & document metadata, job creation, transactional outbox + RabbitMQ publish, result consumers
2. **ai-worker** — PDF/TXT extraction, PII redaction, structured LLM comparison (`LLM_PROVIDER=mock|gemini` via LangChain), citation validation, comparison persistence
3. **pdf-worker** — multipage Unicode PDF reports (`pdf-lib` + embedded DejaVu font), S3 upload
4. **web-demo** — React SPA with OIDC login, polling UX
5. **mcp-server** — MCP tools proxying the HTTP API with Bearer token passthrough

Business communication between workers and the API uses **RabbitMQ events** (validated with `@contractflow/events`), not inter-service HTTP for the comparison pipeline.

## Implemented vs mock vs out of scope

| Area | Status |
| --- | --- |
| OIDC JWT (`sub` owner id, `OIDC_AUDIENCE`) | Implemented |
| Dev header auth | `AUTH_MODE=dev` only when `NODE_ENV` is `development` or `test` |
| Document upload validation before S3 | Implemented |
| PDF/TXT extraction | Implemented (no OCR) |
| LLM comparison | Mock default; Gemini via LangChain.js optional |
| Vector search / RAG / LangGraph | **Out of scope** (docs only) |
| Python sibling API | **Not yet** — mirror with LangChain + Gemini + same schema/prompt |
| MCP compare tools | Implemented (`apps/mcp-server`) |

## Reliability notes

- **Outbox**: comparison jobs persist an outbox envelope until Rabbit publish confirms.
- **Idempotency**: ai-worker comparisons and pdf-worker reports keyed by `jobId`.
- **Retries**: consumer republish with `x-retry-count` backoff; permanent failures (`UNPROCESSABLE`, invalid citations) skip retry and emit failure events.
- **DLQ**: queues use `contractflow.events.dlx`; reprocess manually after fixing payload/docs.

## Layering (per app / bounded context)

```text
domain/           entities, VOs, invariants (framework-free)
application/      use cases, ports, DTOs
infrastructure/   Nest controllers, Mongo/Rabbit/MinIO/LLM/PDF adapters, DI wiring
```

Dependency rule: infrastructure → application → domain.

## Observability

- Prometheus metrics on `/metrics` (HTTP + LLM counters/histograms without `userId`/`jobId` labels).
- JSON logs include `correlationId` / `jobId`; prompts and document bodies are not logged by default.
- Readiness returns **503** when MongoDB or RabbitMQ (contracts-api) / consumer (ai-worker) is down.
