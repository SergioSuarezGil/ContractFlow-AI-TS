import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";

interface HealthCheckRequest {
  service?: string;
}

interface HealthCheckResponse {
  status: string;
  service: string;
}

@Controller()
export class WorkerHealthGrpcController {
  @GrpcMethod("WorkerHealth", "Check")
  check(data: HealthCheckRequest): HealthCheckResponse {
    return {
      status: "SERVING",
      service: data.service?.trim() || "ai-worker",
    };
  }
}
