import type { ServiceContract } from "../../domain/service-contract/service-contract";

export interface ServiceContractRepository {
  save(contract: ServiceContract): Promise<void>;
  findById(id: string): Promise<ServiceContract | null>;
  listByHousehold(householdId: string, ownerId: string): Promise<ServiceContract[]>;
  delete(id: string): Promise<void>;
  /** Atomically attach a document id to current/proposal lists (concurrent-upload safe). */
  attachDocumentId(
    contractId: string,
    documentId: string,
    role: "current" | "proposal",
  ): Promise<void>;
}
