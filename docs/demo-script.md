# ContractFlow demo script (~5 minutes)

## Prerequisites

- Stack running: `pnpm stack:up`
- Keycloak user `demo` / `demo`, realm `contractflow`
- Web UI: http://localhost:8088 (or Vite dev on :5173)

## Happy path (mock LLM default)

1. Sign in via Keycloak (or Google mock in dev UI).
2. Create a contract (electricity provider + title).
3. Upload **current** `.txt` with `Price: 55 monthly`.
4. Upload **proposal** `.txt` with `Price: 42 monthly`.
5. Click **Run comparison** — UI polls with backoff until `COMPLETED`.
6. Download PDF report — verify verdict and **MOCK** analysis badge unless `LLM_PROVIDER=gemini` (+ `GOOGLE_API_KEY`).

## Unscanned / empty PDF path

1. Upload a scanned PDF (image-only) or empty PDF as proposal.
2. Run comparison — job should end `FAILED` with `UNPROCESSABLE` (no extractable text).
3. Confirm API/worker logs include `jobId` / `correlationId` without full document bodies.

## API smoke (Bearer OIDC)

```bash
TOKEN=$(curl -sS -X POST \
  "http://localhost:8080/realms/contractflow/protocol/openid-connect/token" \
  -d "client_id=contractflow-web" \
  -d "username=demo" \
  -d "password=demo" \
  -d "grant_type=password" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/contracts
```

## Notes

- Prompt-injection regression coverage lives in **unit-test fixtures** (`apps/ai-worker` tests), not as a guaranteed runtime filter for arbitrary uploads.
- Jobs are idempotent by `jobId`; retries use worker backoff; poison messages land in DLQ for manual reprocess.
