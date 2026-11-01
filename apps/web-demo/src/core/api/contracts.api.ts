import { authService, type SessionIdentity } from "../auth/auth.service";

/** Hand-written DTOs until `pnpm openapi:export` + codegen lands. */
export interface ServiceContract {
  id: string;
  householdId: string;
  ownerId: string;
  serviceType: string;
  providerName: string;
  title: string;
  notes: string;
  status: string;
  currentDocumentIds: string[];
  proposalDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ContractDocument {
  id: string;
  contractId: string;
  role: "current" | "proposal";
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Job {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  contractId: string;
  comparisonId?: string;
  reportId?: string;
  errorMessage?: string;
  updatedAt: string;
}

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
  create(
    session: SessionIdentity,
    body: {
      serviceType: string;
      providerName: string;
      title: string;
      notes?: string;
    },
  ) {
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
    return request<{ jobId: string; status: string }>(
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
