import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ServiceContract } from "../../domain/service-contract/service-contract";
import type { ActorContext } from "../dto/actor.dto";
import type { ServiceContractRepository } from "../ports/service-contract.repository";
import { SERVICE_CONTRACT_REPOSITORY } from "../ports/tokens";

export interface CreateServiceContractCommand {
  actor: ActorContext;
  serviceType: string;
  providerName: string;
  title: string;
  notes?: string;
}

@Injectable()
export class CreateServiceContractUseCase {
  constructor(
    @Inject(SERVICE_CONTRACT_REPOSITORY)
    private readonly contracts: ServiceContractRepository,
  ) {}

  async execute(command: CreateServiceContractCommand) {
    const contract = ServiceContract.create({
      id: randomUUID(),
      householdId: command.actor.householdId,
      ownerId: command.actor.ownerId,
      serviceType: command.serviceType,
      providerName: command.providerName,
      title: command.title,
      notes: command.notes,
    });
    await this.contracts.save(contract);
    return contract.snapshot();
  }
}
