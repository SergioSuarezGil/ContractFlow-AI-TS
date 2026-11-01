import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "../../domain/shared/domain-error";
import type { ActorContext } from "../dto/actor.dto";
import type { ServiceContractRepository } from "../ports/service-contract.repository";
import { SERVICE_CONTRACT_REPOSITORY } from "../ports/tokens";

@Injectable()
export class ArchiveServiceContractUseCase {
  constructor(
    @Inject(SERVICE_CONTRACT_REPOSITORY)
    private readonly contracts: ServiceContractRepository,
  ) {}

  async execute(actor: ActorContext, contractId: string) {
    const contract = await this.contracts.findById(contractId);
    if (!contract) {
      throw new NotFoundError(`Contract not found: ${contractId}`);
    }
    if (!contract.belongsTo(actor.ownerId, actor.householdId)) {
      throw new ForbiddenError("Access denied to this contract");
    }
    contract.archive();
    await this.contracts.save(contract);
    return contract.snapshot();
  }
}
