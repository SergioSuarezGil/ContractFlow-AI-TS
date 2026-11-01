# ADR 0001: TypeScript-first NestJS with hexagonal architecture

## Status

Accepted

## Context

ContractFlow AI will exist in TypeScript and Python. We need a first implementation that demonstrates senior backend engineering and runs fully on Docker locally.

## Decision

- Implement **TypeScript / NestJS first**
- Apply **DDD, hexagonal architecture, Clean Architecture, and SOLID**
- Keep NestJS at the edges (HTTP, DI, workers host); domain stays framework-free
- Default local AI mode to **Mock LLM**
- Defer Python parity until TS MVP contracts are stable

## Consequences

- Faster portfolio demo path on one stack
- Clear OpenAPI/event contracts become the bridge for the Python twin
- Slightly more upfront folder discipline in each Nest app
