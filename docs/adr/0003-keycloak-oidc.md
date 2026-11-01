# ADR 0003 — Keycloak OIDC for web + API

## Status

Accepted

## Context

ContractFlow AI needs authenticated multi-user access with household isolation. Headers-based demo identity is insufficient for portfolio demos.

## Decision

- Keycloak realm `contractflow` runs in its own container
- Public SPA client `contractflow-web` (PKCE) for the Vite web demo
- Contracts API validates access tokens with JWKS (`jose`), reading `preferred_username` as `ownerId` and `household_id` claim as `householdId`
- Web redirect / post-logout URIs are computed at **runtime** from `window.location.origin` (never baked as a fixed host in the image) so `localhost` vs `127.0.0.1` do not break the OIDC callback
- The SPA silent-renews expired access tokens before calling the API
- Browser issuer is `http://localhost:8080/realms/contractflow`; API fetches JWKS via `http://keycloak:8080/...` inside Docker
- Workers remain internal (no public OIDC); they trust RabbitMQ/Mongo within the compose network
- `AUTH_MODE=dev` remains available for local header-based debugging only

## Consequences

- Web demo requires Sign in before API calls
- Existing Mongo data keyed by previous `user_demo` owner will not appear for Keycloak user `demo`
- Container topology stays one process per service (API, AI worker, PDF worker, web)
