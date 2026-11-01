# ContractFlow AI (TypeScript)

AI-powered platform to manage **personal service contracts** and compare the **current offer vs alternative proposals** from uploaded PDFs. Analysis and comparative PDF reports run **asynchronously** via microservices.

This repository is the **TypeScript / NestJS** implementation (priority stack). A separate Python/FastAPI implementation will share the same HTTP and event contracts later.

## Stack

- NestJS (Contracts API, AI Worker, PDF Worker)
- MongoDB (incl. Vector Search locally)
- RabbitMQ
- S3-compatible object storage (LocalStack locally; MinIO-compatible SDK)
- Keycloak (OIDC) + Google login mock on the web demo
- React + Vite + Tailwind CSS + Preline UI (`apps/web-demo`)
- OpenAPI from Nest decorators → `contracts/openapi/openapi.yaml` → web typed client
- Prometheus + Grafana (optional Compose overlay)
- gRPC for sync probes (RabbitMQ remains async)
- Docker Compose for local development
- DDD + hexagonal + Clean Architecture + SOLID

## Deployment note (current)

**Local Compose only.** There are no GitHub Actions pipelines or remote deploys in this repo yet. Secrets live in gitignored `.env` (from `.env.example`). Coolify / CI come later.

## Quick start (Docker)

```bash
cp .env.example .env

# Infrastructure only
pnpm infra:up

# Full TypeScript stack (infra + apps)
pnpm stack:up

# Logs
pnpm stack:logs
```

Health checks (host):

- Web demo: http://localhost:8088 (OIDC login · Google mock)
- Contracts API: http://localhost:3000/health · OpenAPI http://localhost:3000/docs · metrics `/metrics`
- AI Worker: http://localhost:3001/health
- PDF Worker: http://localhost:3002/health
- RabbitMQ UI: http://localhost:15672 (user/pass from `.env.example`)
- S3 (LocalStack): http://localhost:4566
- Keycloak: http://localhost:8080 (admin/admin) · realm `contractflow` · user `demo` / `demo`
- Observability (optional `pnpm obs:up`): Prometheus http://localhost:9090 · Grafana http://localhost:3003
- Swagger UI: http://localhost:3000/docs
- Prometheus (optional): http://localhost:9090
- Grafana (optional): http://localhost:3003 (`admin` / `admin`)

Each runtime piece runs in its **own container**: `contracts-api`, `ai-worker`, `pdf-worker`, `web-demo`, plus infra (`mongodb`, `rabbitmq`, `object-storage`, `keycloak`).

```bash
# Observability overlay (Prometheus + Grafana scrapes /metrics on every micro)
pnpm obs:up
```

Stop:

```bash
pnpm stack:down
```

## Local development (apps on host)

Requires Node 20+, pnpm 9+, and infrastructure containers running.

```bash
pnpm install
pnpm contracts-api:dev
pnpm ai-worker:dev
pnpm pdf-worker:dev
pnpm web-demo:dev   # http://localhost:5173 (proxies /api -> :3000)
```

Point `MONGODB_URI`, `RABBITMQ_URL`, etc. at `localhost` when apps run outside Compose (see comments in `.env.example`).

If `pnpm install` fails with `ECONNRESET` / TLS timeouts against `registry.npmjs.org`, use a normal terminal (not a flaky sandboxed agent shell), keep the repo `.npmrc` (`network-concurrency=1`), and optionally:

```bash
unset NPM_CONFIG_CACHE PNPM_STORE_PATH
export NODE_OPTIONS=--dns-result-order=ipv4first
pnpm install
```

Docker builds remain a reliable fallback (`pnpm stack:up`).

## Repository layout

```text
apps/
  contracts-api/
  ai-worker/
  pdf-worker/
  web-demo/         # React + Tailwind + Preline (modular SPA)
contracts/          # OpenAPI + event schemas (shared technical contracts)
infra/              # Docker Compose + service config (see infra/README.md)
docs/               # ADRs and architecture notes
```

Local orchestration is **Docker Compose** (not Kubernetes). Details and diagrams: [`infra/README.md`](./infra/README.md).

## API (Contracts) — current status

API requires a Keycloak access token (`Authorization: Bearer …`) when `AUTH_MODE=oidc`.

```bash
# Get a token (direct grant, demo only)
TOKEN=$(curl -sS -X POST \
  "http://localhost:8080/realms/contractflow/protocol/openid-connect/token" \
  -d "client_id=contractflow-web" \
  -d "username=demo" \
  -d "password=demo" \
  -d "grant_type=password" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -sS -X POST http://localhost:3000/api/v1/contracts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"serviceType":"electricity","providerName":"DemoEnergy","title":"Home power"}'
```

### OpenAPI sync (code → yaml → front types)

With the API running:

```bash
pnpm openapi:sync
# export: contracts/openapi/openapi.yaml (+ .json)
# generate: apps/web-demo/src/core/api/generated/openapi.d.ts
```

Swagger UI: http://localhost:3000/docs · readiness (gRPC): http://localhost:3000/health/ready

## Async comparison flow (mock LLM)

```bash
# After contract + current/proposal docs exist:
curl -sS -X POST "http://localhost:3000/api/v1/contracts/$CONTRACT_ID/comparisons" \
  -H 'X-Owner-Id: user_demo' -H 'X-Household-Id: hh_demo'
# -> { jobId, status: PROCESSING }

curl -sS "http://localhost:3000/api/v1/jobs/$JOB_ID" \
  -H 'X-Owner-Id: user_demo' -H 'X-Household-Id: hh_demo'
# -> status COMPLETED + reportId

curl -sS -o report.pdf "http://localhost:3000/api/v1/reports/$REPORT_ID/download" \
  -H 'X-Owner-Id: user_demo' -H 'X-Household-Id: hh_demo'
```

## MVP scope

1. ~~Upload current contract + alternative proposal PDFs~~
2. ~~Request an async comparison job~~
3. ~~Download a comparative PDF report (Mock LLM locally)~~

URL scraping and rich UI are out of MVP scope. A minimal web demo will be added after the API/workers path is stable.

## License

See [LICENSE](./LICENSE).
