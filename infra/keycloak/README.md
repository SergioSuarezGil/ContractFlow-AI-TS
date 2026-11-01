# Keycloak (local demo)

`realm-contractflow.json` is imported on first Keycloak start (`--import-realm`).

## Local-only credentials

This JSON intentionally contains **local demo** values (not production secrets):

| Item | Value | Source of truth for ops |
| ---- | ----- | ----------------------- |
| Admin bootstrap | from `.env` → `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | Compose env |
| Demo user | `demo` / `demo` | Realm import (fixture) |
| Web client | `contractflow-web` (public, PKCE) | Realm import |
| API client secret | `contractflow-api-secret` | Realm import (unused by current PKCE web flow) |

Change passwords for anything beyond a laptop demo. Do not reuse these values outside local Compose.

Keycloak cannot interpolate env vars inside realm JSON; keep fixtures here and document real secrets only in ignored `.env` for bootstrap admin.
