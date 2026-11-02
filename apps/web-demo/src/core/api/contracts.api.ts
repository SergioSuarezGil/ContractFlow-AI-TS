import { authService, type SessionIdentity } from "../auth/auth.service";
import type { components } from "./generated/openapi";

export type ServiceContract = components["schemas"]["ServiceContractResponseDto"];
export type ContractDocument = components["schemas"]["ContractDocumentResponseDto"];
export type Job = components["schemas"]["JobResponseDto"];
export type CreateContractInput = components["schemas"]["CreateContractDto"];

const apiBase = import.meta.env.VITE_API_BASE ?? "";

async function request<T>(
  path: string,
  session: SessionIdentity,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = (await authService.getAccessToken()) ?? session.accessToken;
  if (!token) {
    throw new Error("Session expired. Please sign in again.");
  }
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  if (response.status === 401) {
    throw new Error("Invalid or expired access token. Sign out and sign in again.");
  }
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) message = errorBody.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const contractsApi = {
  list(session: SessionIdentity) {
    return request<ServiceContract[]>("/api/v1/contracts", session);
  },
  create(session: SessionIdentity, body: CreateContractInput) {
    return request<ServiceContract>("/api/v1/contracts", session, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  get(session: SessionIdentity, id: string) {
    return request<ServiceContract>(`/api/v1/contracts/${id}`, session);
  },
  listDocuments(session: SessionIdentity, contractId: string) {
    return request<ContractDocument[]>(
      `/api/v1/contracts/${contractId}/documents`,
      session,
    );
  },
  uploadDocument(
    session: SessionIdentity,
    contractId: string,
    file: File,
    role: "current" | "proposal",
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("role", role);
    return request<ContractDocument>(
      `/api/v1/contracts/${contractId}/documents`,
      session,
      { method: "POST", body: form },
    );
  },
  requestComparison(session: SessionIdentity, contractId: string) {
    return request<components["schemas"]["ComparisonAcceptedDto"]>(
      `/api/v1/contracts/${contractId}/comparisons`,
      session,
      { method: "POST" },
    );
  },
  getJob(session: SessionIdentity, jobId: string) {
    return request<Job>(`/api/v1/jobs/${jobId}`, session);
  },
  downloadReportUrl(reportId: string) {
    return `${apiBase}/api/v1/reports/${reportId}/download`;
  },
};
