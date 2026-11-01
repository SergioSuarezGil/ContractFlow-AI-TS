# OpenAPI → front codegen

## Flow

```mermaid
sequenceDiagram
  participant Nest as contracts-api (decorators)
  participant Swagger as /docs-json
  participant Export as pnpm openapi:export
  participant Gen as pnpm openapi:generate
  participant Web as web-demo core/api

  Nest->>Swagger: SwaggerModule document
  Export->>Swagger: GET docs-json
  Export->>Export: write contracts/openapi/openapi.yaml
  Gen->>Gen: openapi-typescript
  Gen->>Web: generated/openapi.d.ts
  Web->>Web: contracts.api.ts uses components schemas
```

## Commands

```bash
# API must be running (Docker or host)
pnpm openapi:sync
```

| Script | Output |
| ------ | ------ |
| `openapi:export` | `contracts/openapi/openapi.yaml` + `.json` |
| `openapi:generate` | `apps/web-demo/src/core/api/generated/openapi.d.ts` |
| `openapi:sync` | both |

Swagger UI: http://localhost:3000/docs

Keep DTOs annotated with `@ApiProperty` / `@ApiOkResponse` so the exported contract stays truthful.
