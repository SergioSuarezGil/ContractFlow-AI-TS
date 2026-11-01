import { ValidationError } from "../shared/domain-error";
import { assertDocumentRole, assertNonEmpty, type DocumentRole } from "../service-contract/value-objects";

export interface ContractDocumentProps {
  id: string;
  contractId: string;
  householdId: string;
  ownerId: string;
  role: DocumentRole;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}

export interface CreateContractDocumentInput {
  id: string;
  contractId: string;
  householdId: string;
  ownerId: string;
  role: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  now?: Date;
}

export class ContractDocument {
  private constructor(private readonly props: ContractDocumentProps) {}

  static create(input: CreateContractDocumentInput): ContractDocument {
    if (input.sizeBytes <= 0) {
      throw new ValidationError("sizeBytes must be positive");
    }
    return new ContractDocument({
      id: assertNonEmpty("id", input.id),
      contractId: assertNonEmpty("contractId", input.contractId),
      householdId: assertNonEmpty("householdId", input.householdId),
      ownerId: assertNonEmpty("ownerId", input.ownerId),
      role: assertDocumentRole(input.role),
      fileName: assertNonEmpty("fileName", input.fileName),
      contentType: assertNonEmpty("contentType", input.contentType),
      sizeBytes: input.sizeBytes,
      storageKey: assertNonEmpty("storageKey", input.storageKey),
      createdAt: input.now ?? new Date(),
    });
  }

  static rehydrate(props: ContractDocumentProps): ContractDocument {
    return new ContractDocument({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get contractId(): string {
    return this.props.contractId;
  }

  get role(): DocumentRole {
    return this.props.role;
  }

  snapshot(): ContractDocumentProps {
    return { ...this.props, createdAt: new Date(this.props.createdAt) };
  }
}
