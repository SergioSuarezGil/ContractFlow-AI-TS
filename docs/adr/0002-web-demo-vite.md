# ADR 0002 — Web demo uses React + Vite + Tailwind + Preline

## Status

Accepted (supersedes vanilla Vite SPA)

## Context

The first demo used vanilla DOM rendering for speed. The product owner requested a React front with modern hooks, Tailwind CSS, Preline UI, and Angular-like modularization, plus a mocked Google login.

## Decision

Ship `apps/web-demo` as:

- React 19 + Vite + React Router
- Tailwind CSS v4 + Preline UI (`preline/non-auto` + `HSStaticMethods.autoInit`)
- Feature modules under `src/modules/*`, shared UI under `src/shared/ui`, auth/API under `src/core`
- Keycloak OIDC (PKCE) and a **Google mock** that uses Keycloak Resource Owner Password for the demo user until a real Google IdP is wired

Nginx still serves the static build and proxies `/api` to `contracts-api`.

## Consequences

- Larger bundle than vanilla DOM, clearer structure for portfolio demos
- OpenAPI-driven client codegen can replace `core/api` later without changing modules
- Real Google SSO will replace the mock grant path without changing Contracts UI
