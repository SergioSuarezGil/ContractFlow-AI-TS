import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { ActorContext } from "../../../application/dto/actor.dto";
import { ArchiveServiceContractUseCase } from "../../../application/use-cases/archive-service-contract.use-case";
import { CreateServiceContractUseCase } from "../../../application/use-cases/create-service-contract.use-case";
import { GetServiceContractUseCase } from "../../../application/use-cases/get-service-contract.use-case";
import { ListServiceContractsUseCase } from "../../../application/use-cases/list-service-contracts.use-case";
import { UpdateServiceContractUseCase } from "../../../application/use-cases/update-service-contract.use-case";
import { Actor } from "../auth/actor.decorator";
import { ServiceContractResponseDto } from "../dto/api-responses.dto";
import { CreateContractDto } from "./create-contract.dto";
import { UpdateContractDto } from "./update-contract.dto";

@ApiTags("contracts")
@ApiBearerAuth("bearer")
@Controller("api/v1/contracts")
export class ContractsController {
  constructor(
    private readonly createContract: CreateServiceContractUseCase,
    private readonly listContracts: ListServiceContractsUseCase,
    private readonly getContract: GetServiceContractUseCase,
    private readonly updateContract: UpdateServiceContractUseCase,
    private readonly archiveContract: ArchiveServiceContractUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a service contract" })
  @ApiCreatedResponse({ type: ServiceContractResponseDto })
  create(@Actor() actor: ActorContext, @Body() body: CreateContractDto) {
    return this.createContract.execute({
      actor,
      serviceType: body.serviceType,
      providerName: body.providerName,
      title: body.title,
      notes: body.notes,
    });
  }

  @Get()
  @ApiOperation({ summary: "List contracts for the authenticated household" })
  @ApiOkResponse({ type: ServiceContractResponseDto, isArray: true })
  list(@Actor() actor: ActorContext) {
    return this.listContracts.execute(actor);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a contract by id" })
  @ApiOkResponse({ type: ServiceContractResponseDto })
  get(@Actor() actor: ActorContext, @Param("id") id: string) {
    return this.getContract.execute(actor, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update contract details" })
  @ApiOkResponse({ type: ServiceContractResponseDto })
  update(
    @Actor() actor: ActorContext,
    @Param("id") id: string,
    @Body() body: UpdateContractDto,
  ) {
    return this.updateContract.execute({
      actor,
      contractId: id,
      ...body,
    });
  }

  @Delete(":id")
  @ApiOperation({ summary: "Archive a contract" })
  @ApiOkResponse({ type: ServiceContractResponseDto })
  archive(@Actor() actor: ActorContext, @Param("id") id: string) {
    return this.archiveContract.execute(actor, id);
  }
}
