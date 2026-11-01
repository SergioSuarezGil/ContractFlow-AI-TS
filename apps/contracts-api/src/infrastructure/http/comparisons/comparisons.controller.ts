import { Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { ActorContext } from "../../../application/dto/actor.dto";
import { RequestComparisonUseCase } from "../../../application/use-cases/request-comparison.use-case";
import { Actor } from "../auth/actor.decorator";
import { ComparisonAcceptedDto } from "../dto/api-responses.dto";

@ApiTags("comparisons")
@ApiBearerAuth("bearer")
@Controller("api/v1/contracts/:contractId/comparisons")
export class ComparisonsController {
  constructor(private readonly requestComparison: RequestComparisonUseCase) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Request an async AI comparison" })
  @ApiAcceptedResponse({ type: ComparisonAcceptedDto })
  create(@Actor() actor: ActorContext, @Param("contractId") contractId: string) {
    return this.requestComparison.execute(actor, contractId);
  }
}
