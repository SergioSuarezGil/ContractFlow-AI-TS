# Architecture

High-level design for the TypeScript implementation of ContractFlow AI.

## Processes

1. **contracts-api** — REST edge, authn/authz, contract & document metadata, job creation, event publish/subscribe for results
2. **ai-worker** — document indexing, RAG, structured comparison (LangChain.js / LangGraph.js)
3. **pdf-worker** — render comparative PDF, store in MinIO

Business communication between workers and the API goes through **RabbitMQ events**, not inter-service HTTP calls.

## Layering (per app / bounded context)

```text
domain/           entities, VOs, invariants (framework-free)
application/      use cases, ports, DTOs
infrastructure/   Nest controllers, Mongo/Rabbit/MinIO/LLM/PDF adapters, DI wiring
```

Dependency rule: infrastructure → application → domain.
