import { ValidationError } from "../shared/domain-error";
import {
  assertContractStatus,
  assertNonEmpty,
  assertServiceType,
  type ContractStatus,
  type ServiceType,
} from "./value-objects";

export interface ServiceContractProps {
  id: string;
  householdId: string;
  ownerId: string;
  serviceType: ServiceType;
  providerName: string;
  title: string;
  notes: string;
  status: ContractStatus;
  currentDocumentIds: string[];
  proposalDocumentIds: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface CreateServiceContractInput {
  id: string;
  householdId: string;
  ownerId: string;
  serviceType: string;
  providerName: string;
  title: string;
  notes?: string;
  now?: Date;
}

export class ServiceContract {
  private constructor(private props: ServiceContractProps) {}

  static create(input: CreateServiceContractInput): ServiceContract {
    const now = input.now ?? new Date();
    return new ServiceContract({
      id: assertNonEmpty("id", input.id),
      householdId: assertNonEmpty("householdId", input.householdId),
      ownerId: assertNonEmpty("ownerId", input.ownerId),
      serviceType: assertServiceType(input.serviceType),
      providerName: assertNonEmpty("providerName", input.providerName),
      title: assertNonEmpty("title", input.title),
      notes: (input.notes ?? "").trim(),
      status: "draft",
      currentDocumentIds: [],
      proposalDocumentIds: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  }

  static rehydrate(props: ServiceContractProps): ServiceContract {
    return new ServiceContract({
      ...props,
      currentDocumentIds: [...props.currentDocumentIds],
      proposalDocumentIds: [...props.proposalDocumentIds],
    });
  }

  get id(): string {
    return this.props.id;
  }

  get householdId(): string {
    return this.props.householdId;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get status(): ContractStatus {
    return this.props.status;
  }

  get currentDocumentIds(): readonly string[] {
    return this.props.currentDocumentIds;
  }

  get proposalDocumentIds(): readonly string[] {
    return this.props.proposalDocumentIds;
  }

  snapshot(): ServiceContractProps {
    return {
      ...this.props,
      currentDocumentIds: [...this.props.currentDocumentIds],
      proposalDocumentIds: [...this.props.proposalDocumentIds],
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
    };
  }

  belongsTo(ownerId: string, householdId: string): boolean {
    return this.props.ownerId === ownerId && this.props.householdId === householdId;
  }

  updateDetails(input: {
    title?: string;
    providerName?: string;
    notes?: string;
    serviceType?: string;
    status?: string;
    now?: Date;
  }): void {
    this.assertNotArchived();
    if (input.title !== undefined) {
      this.props.title = assertNonEmpty("title", input.title);
    }
    if (input.providerName !== undefined) {
      this.props.providerName = assertNonEmpty("providerName", input.providerName);
    }
    if (input.notes !== undefined) {
      this.props.notes = input.notes.trim();
    }
    if (input.serviceType !== undefined) {
      this.props.serviceType = assertServiceType(input.serviceType);
    }
    if (input.status !== undefined) {
      const next = assertContractStatus(input.status);
      if (next === "archived") {
        throw new ValidationError("Use archive() to archive a contract");
      }
      this.props.status = next;
    }
    this.touch(input.now);
  }

  attachDocument(documentId: string, role: "current" | "proposal", now?: Date): void {
    this.assertNotArchived();
    const id = assertNonEmpty("documentId", documentId);
    if (
      this.props.currentDocumentIds.includes(id) ||
      this.props.proposalDocumentIds.includes(id)
    ) {
      throw new ValidationError(`Document already attached: ${id}`);
    }
    if (role === "current") {
      this.props.currentDocumentIds.push(id);
    } else {
      this.props.proposalDocumentIds.push(id);
    }
    if (this.props.status === "draft") {
      this.props.status = "active";
    }
    this.touch(now);
  }

  detachDocument(documentId: string, now?: Date): void {
    this.assertNotArchived();
    const beforeCurrent = this.props.currentDocumentIds.length;
    const beforeProposal = this.props.proposalDocumentIds.length;
    this.props.currentDocumentIds = this.props.currentDocumentIds.filter(
      (id) => id !== documentId,
    );
    this.props.proposalDocumentIds = this.props.proposalDocumentIds.filter(
      (id) => id !== documentId,
    );
    if (
      this.props.currentDocumentIds.length === beforeCurrent &&
      this.props.proposalDocumentIds.length === beforeProposal
    ) {
      throw new ValidationError(`Document not attached: ${documentId}`);
    }
    this.touch(now);
  }

  canRequestComparison(): void {
    this.assertNotArchived();
    if (this.props.currentDocumentIds.length < 1) {
      throw new ValidationError("Comparison requires at least one current document");
    }
    if (this.props.proposalDocumentIds.length < 1) {
      throw new ValidationError("Comparison requires at least one proposal document");
    }
  }

  archive(now?: Date): void {
    this.assertNotArchived();
    this.props.status = "archived";
    this.touch(now);
  }

  private assertNotArchived(): void {
    if (this.props.status === "archived") {
      throw new ValidationError("Archived contracts cannot be modified");
    }
  }

  private touch(now?: Date): void {
    this.props.updatedAt = now ?? new Date();
    this.props.version += 1;
  }
}
