import { ValidationError } from "../shared/domain-error";

export type ServiceType =
  | "electricity"
  | "gas"
  | "insurance"
  | "mobile"
  | "internet"
  | "other";

export type ContractStatus = "draft" | "active" | "under_review" | "archived";

export type DocumentRole = "current" | "proposal";

const SERVICE_TYPES: ReadonlySet<string> = new Set([
  "electricity",
  "gas",
  "insurance",
  "mobile",
  "internet",
  "other",
]);

const CONTRACT_STATUSES: ReadonlySet<string> = new Set([
  "draft",
  "active",
  "under_review",
  "archived",
]);

const DOCUMENT_ROLES: ReadonlySet<string> = new Set(["current", "proposal"]);

export function assertServiceType(value: string): ServiceType {
  if (!SERVICE_TYPES.has(value)) {
    throw new ValidationError(`Invalid serviceType: ${value}`);
  }
  return value as ServiceType;
}

export function assertContractStatus(value: string): ContractStatus {
  if (!CONTRACT_STATUSES.has(value)) {
    throw new ValidationError(`Invalid status: ${value}`);
  }
  return value as ContractStatus;
}

export function assertDocumentRole(value: string): DocumentRole {
  if (!DOCUMENT_ROLES.has(value)) {
    throw new ValidationError(`Invalid document role: ${value}`);
  }
  return value as DocumentRole;
}

export function assertNonEmpty(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${label} must not be empty`);
  }
  return trimmed;
}
