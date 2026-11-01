# gRPC contracts

Canonical Protocol Buffer definitions for **synchronous** inter-service calls.

| Service | Proto | Server | Clients |
| ------- | ----- | ------ | ------- |
| `WorkerHealth` | `contractflow/v1/worker_health.proto` | `ai-worker` `:50051` | `contracts-api` (`GET /health/ready`) |

Async workflows stay on RabbitMQ. Keep domain logic out of proto stubs — adapters only.
