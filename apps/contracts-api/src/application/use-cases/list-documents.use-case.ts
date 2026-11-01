import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "../../domain/shared/domain-error";
import type { ActorContext } from "../dto/actor.dto";
import type { ContractDocumentRepository } from "../ports/contract-document.repository";
import type { ServiceContractRepository } from "../ports/service-contract.repository";
import {
  CONTRACT_DOCUMENT_REPOSITORY,
  SERVICE_CONTRACT_REPOSITORY,
} from "../ports/tokens";

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(SERVICE_CONTRACT_REPOSITORY)
    private readonly contracts: ServiceContractRepository,
    @Inject(CONTRACT_DOCUMENT_REPOSITORY)
    private readonly documents: ContractDocumentRepository,
  ) {}

  async execute(actor: ActorContext, contractId: string) {
    const contract = await this.contracts.findById(contractId);
    if (!contract) {
      throw new NotFoundError(`Contract not found: ${contractId}`);
    }
    if (!contract.belongsTo(actor.ownerId, actor.householdId)) {
      throw new ForbiddenError("Access denied to this contract");
    }
    const docs = await this.documents.listByContractId(contractId);
    return docs.map((doc) => doc.snapshot());
  }
}
