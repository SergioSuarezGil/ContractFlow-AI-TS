import { Inject, Injectable } from "@nestjs/common";
import type { ActorContext } from "../dto/actor.dto";
import type { ServiceContractRepository } from "../ports/service-contract.repository";
import { SERVICE_CONTRACT_REPOSITORY } from "../ports/tokens";

@Injectable()
export class ListServiceContractsUseCase {
  constructor(
    @Inject(SERVICE_CONTRACT_REPOSITORY)
    private readonly contracts: ServiceContractRepository,
  ) {}

  async execute(actor: ActorContext) {
    const items = await this.contracts.listByHousehold(
      actor.householdId,
      actor.ownerId,
    );
    return items.map((item) => item.snapshot());
  }
}
