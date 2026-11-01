import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "../../domain/shared/domain-error";
import type { ActorContext } from "../dto/actor.dto";
import type { ComparisonLookupPort } from "../ports/comparison-lookup";
import type { JobRepository } from "../ports/job.repository";
import { COMPARISON_LOOKUP, JOB_REPOSITORY } from "../ports/tokens";

@Injectable()
export class GetWorkerComparisonUseCase {
  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly jobs: JobRepository,
    @Inject(COMPARISON_LOOKUP)
    private readonly comparisons: ComparisonLookupPort,
  ) {}

  async execute(actor: ActorContext, jobId: string) {
    const job = await this.jobs.findById(jobId);
    if (!job) {
      throw new NotFoundError(`Job not found: ${jobId}`);
    }
    if (!job.belongsTo(actor.ownerId, actor.householdId)) {
      throw new ForbiddenError("Access denied to this job");
    }
    const worker = await this.comparisons.getByJobId(jobId);
    return { jobId, worker };
  }
}
