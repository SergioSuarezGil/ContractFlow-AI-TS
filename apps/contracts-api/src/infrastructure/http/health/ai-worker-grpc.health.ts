import { Injectable } from "@nestjs/common";
import { AiWorkerGrpcClient } from "../../grpc/ai-worker-grpc.client";

@Injectable()
export class AiWorkerGrpcHealthIndicator {
  constructor(private readonly aiWorker: AiWorkerGrpcClient) {}

  async ping(): Promise<{ status: string }> {
    const result = await this.aiWorker.check("ai-worker");
    if (result.status !== "SERVING") {
      throw new Error(`gRPC status=${result.status}`);
    }
    return { status: result.status };
  }
}
