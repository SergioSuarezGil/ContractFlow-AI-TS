import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "../../domain/shared/domain-error";
import type { ActorContext } from "../dto/actor.dto";
import type { JobRepository } from "../ports/job.repository";
import { JOB_REPOSITORY } from "../ports/tokens";

@Injectable()
export class GetJobUseCase {
  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly jobs: JobRepository,
  ) {}

  async execute(actor: ActorContext, jobId: string) {
    const job = await this.jobs.findById(jobId);
    if (!job) {
      throw new NotFoundError(`Job not found: ${jobId}`);
    }
    if (!job.belongsTo(actor.ownerId, actor.householdId)) {
      throw new ForbiddenError("Access denied to this job");
    }
    return job.snapshot();
  }
}
