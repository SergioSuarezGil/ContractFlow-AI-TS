import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ComparisonLookupService } from "../../application/comparison-lookup.service";

interface GetComparisonByJobIdRequest {
  jobId?: string;
  job_id?: string;
}

@Controller()
export class ComparisonLookupGrpcController {
  constructor(private readonly lookups: ComparisonLookupService) {}

  @GrpcMethod("ComparisonLookup", "GetByJobId")
  async getByJobId(data: GetComparisonByJobIdRequest) {
    const jobId = (data.jobId ?? data.job_id ?? "").trim();
    const result = await this.lookups.findByJobId(jobId);
    return {
      found: result.found,
      jobId: result.jobId,
      comparisonId: result.comparisonId,
      contractId: result.contractId,
      verdict: result.verdict,
      summary: result.summary,
      createdAt: result.createdAt,
    };
  }
}
