import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "../../domain/shared/domain-error";
import type { ActorContext } from "../dto/actor.dto";
import type { ServiceContractRepository } from "../ports/service-contract.repository";
import { SERVICE_CONTRACT_REPOSITORY } from "../ports/tokens";

export interface UpdateServiceContractCommand {
  actor: ActorContext;
  contractId: string;
  title?: string;
  providerName?: string;
  notes?: string;
  serviceType?: string;
  status?: string;
}

@Injectable()
export class UpdateServiceContractUseCase {
  constructor(
    @Inject(SERVICE_CONTRACT_REPOSITORY)
    private readonly contracts: ServiceContractRepository,
  ) {}

  async execute(command: UpdateServiceContractCommand) {
    const contract = await this.contracts.findById(command.contractId);
    if (!contract) {
      throw new NotFoundError(`Contract not found: ${command.contractId}`);
    }
    if (!contract.belongsTo(command.actor.ownerId, command.actor.householdId)) {
      throw new ForbiddenError("Access denied to this contract");
    }
    contract.updateDetails({
      title: command.title,
      providerName: command.providerName,
      notes: command.notes,
      serviceType: command.serviceType,
      status: command.status,
    });
    await this.contracts.save(contract);
    return contract.snapshot();
  }
}
