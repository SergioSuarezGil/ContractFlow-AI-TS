import type { ContractDocument } from "../../domain/document/contract-document";

export interface ContractDocumentRepository {
  save(document: ContractDocument): Promise<void>;
  findById(id: string): Promise<ContractDocument | null>;
  listByContractId(contractId: string): Promise<ContractDocument[]>;
  delete(id: string): Promise<void>;
}
