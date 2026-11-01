import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { ActorContext } from "../../../application/dto/actor.dto";
import { GetJobUseCase } from "../../../application/use-cases/get-job.use-case";
import { GetWorkerComparisonUseCase } from "../../../application/use-cases/get-worker-comparison.use-case";
import { Actor } from "../auth/actor.decorator";
import { JobResponseDto } from "../dto/api-responses.dto";

@ApiTags("jobs")
@ApiBearerAuth("bearer")
@Controller("api/v1/jobs")
export class JobsController {
  constructor(
    private readonly getJob: GetJobUseCase,
    private readonly getWorkerComparison: GetWorkerComparisonUseCase,
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "Get comparison job status" })
  @ApiOkResponse({ type: JobResponseDto })
  get(@Actor() actor: ActorContext, @Param("id") id: string) {
    return this.getJob.execute(actor, id);
  }

  @Get(":id/worker-comparison")
  @ApiOperation({
    summary:
      "Sync gRPC lookup of comparison result on ai-worker (by job id)",
  })
  @ApiOkResponse({ description: "Worker-side comparison view (may be not found yet)" })
  workerComparison(@Actor() actor: ActorContext, @Param("id") id: string) {
    return this.getWorkerComparison.execute(actor, id);
  }
}
