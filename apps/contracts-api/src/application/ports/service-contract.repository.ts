import type { ServiceContract } from "../../domain/service-contract/service-contract";

export interface ServiceContractRepository {
  save(contract: ServiceContract): Promise<void>;
  findById(id: string): Promise<ServiceContract | null>;
  listByHousehold(householdId: string, ownerId: string): Promise<ServiceContract[]>;
  delete(id: string): Promise<void>;
}
