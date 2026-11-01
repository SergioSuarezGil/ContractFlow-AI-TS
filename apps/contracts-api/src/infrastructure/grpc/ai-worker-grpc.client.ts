import { join } from "node:path";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  ClientGrpc,
  ClientProxyFactory,
  type GrpcOptions,
  Transport,
} from "@nestjs/microservices";
import { firstValueFrom, type Observable, timeout } from "rxjs";

interface WorkerHealthService {
  Check(data: { service: string }): Observable<{ status: string; service: string }>;
}

interface ComparisonLookupService {
  GetByJobId(data: {
    jobId: string;
  }): Observable<{
    found: boolean;
    jobId: string;
    comparisonId: string;
    contractId: string;
    verdict: string;
    summary: string;
    createdAt: string;
  }>;
}

export interface WorkerComparisonView {
  found: boolean;
  jobId: string;
  comparisonId: string;
  contractId: string;
  verdict: string;
  summary: string;
  createdAt: string;
}

function resolveProtoDir(): string {
  return join(__dirname, "..", "..", "..", "..", "..", "contracts", "grpc", "contractflow", "v1");
}

@Injectable()
export class AiWorkerGrpcClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiWorkerGrpcClient.name);
  private proxy?: ReturnType<typeof ClientProxyFactory.create>;
  private workerHealth?: WorkerHealthService;
  private comparisonLookup?: ComparisonLookupService;

  onModuleInit(): void {
    const url = process.env.AI_WORKER_GRPC_TARGET ?? "127.0.0.1:50051";
    const protoDir = resolveProtoDir();
    const options: GrpcOptions = {
      transport: Transport.GRPC,
      options: {
        package: "contractflow.v1",
        protoPath: [
          join(protoDir, "worker_health.proto"),
          join(protoDir, "comparison_lookup.proto"),
        ],
        url,
        loader: { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true },
      },
    };
    this.proxy = ClientProxyFactory.create(options);
    const client = this.proxy as unknown as ClientGrpc;
    this.workerHealth = client.getService<WorkerHealthService>("WorkerHealth");
    this.comparisonLookup =
      client.getService<ComparisonLookupService>("ComparisonLookup");
  }

  async onModuleDestroy(): Promise<void> {
    await this.proxy?.close();
  }

  async check(service = "ai-worker"): Promise<{ status: string; service: string }> {
    if (!this.workerHealth) {
      return { status: "NOT_SERVING", service };
    }
    try {
      return await firstValueFrom(
        this.workerHealth.Check({ service }).pipe(timeout(2000)),
      );
    } catch (error) {
      this.logger.warn(
        `gRPC health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { status: "NOT_SERVING", service };
    }
  }

  async getByJobId(jobId: string): Promise<WorkerComparisonView> {
    if (!this.comparisonLookup) {
      return emptyComparison(jobId);
    }
    try {
      const result = await firstValueFrom(
        this.comparisonLookup.GetByJobId({ jobId }).pipe(timeout(3000)),
      );
      return {
        found: Boolean(result.found),
        jobId: result.jobId || jobId,
        comparisonId: result.comparisonId || "",
        contractId: result.contractId || "",
        verdict: result.verdict || "",
        summary: result.summary || "",
        createdAt: result.createdAt || "",
      };
    } catch (error) {
      this.logger.warn(
        `gRPC comparison lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return emptyComparison(jobId);
    }
  }
}

function emptyComparison(jobId: string): WorkerComparisonView {
  return {
    found: false,
    jobId,
    comparisonId: "",
    contractId: "",
    verdict: "",
    summary: "",
    createdAt: "",
  };
}
