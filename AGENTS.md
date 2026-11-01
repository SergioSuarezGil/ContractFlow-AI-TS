# ContractFlow AI — Agent Guide (TypeScript)

## Product

ContractFlow AI compares personal service contracts (energy, insurance, telecom, etc.) using uploaded PDFs (current + proposals) and produces async comparative PDF reports.

## Language

- Source code, comments, commits, ADRs, and technical docs: **English**
- Chat with the repository owner may be in Spanish; artifacts stay in English

## Architecture (mandatory)

- NestJS hosts HTTP and workers; **business logic lives outside Nest modules**
- Layers: `domain/` → `application/` → `infrastructure/`
- DDD + hexagonal (ports/adapters) + Clean Architecture + SOLID
- Domain must not import NestJS, MongoDB, RabbitMQ, LangChain, MinIO, or HTTP frameworks
- Controllers are thin; use cases orchestrate; adapters implement ports

## Apps in this repo

| App | Role |
| --- | ---- |
| `apps/contracts-api` | REST API, authz, jobs, document metadata |
| `apps/ai-worker` | Indexing, RAG, comparison analysis |
| `apps/pdf-worker` | Comparative PDF generation |
| `apps/web-demo` | React + Tailwind + Preline SPA (feature modules) |

Shared technical contracts live under `contracts/` (OpenAPI + events). Do not share domain entities with a future Python repo.

## Local runtime

- Prefer Docker Compose (`infra/compose.yaml` + `infra/compose.typescript.yaml`)
- Optional observability: add `infra/compose.observability.yaml` (`pnpm obs:up`)
- NestJS **12** + **Express** for HTTP apps; OpenAPI via Swagger (`/docs`, `pnpm openapi:export`)
- Default LLM mode: `LLM_PROVIDER=mock` (no external API keys required)
- Never commit secrets; use `.env.example` as the twin template for `.env`

## Git

- Do not commit or push unless the user explicitly asks
