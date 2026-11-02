import { useCallback, useEffect, useRef, useState } from "react";
import {
  contractsApi,
  type ContractDocument,
  type Job,
  type ServiceContract,
} from "../../../core/api/contracts.api";
import { authService, type SessionIdentity } from "../../../core/auth/auth.service";

const JOB_STORAGE_PREFIX = "contractflow.job.";

export type ComparisonStage =
  | "idle"
  | "extraction"
  | "waiting"
  | "analysis"
  | "retry"
  | "done"
  | "error";

function stageFromJob(job: Job | null, attempt: number): ComparisonStage {
  if (!job) return "idle";
  if (job.status === "FAILED") return "error";
  if (job.status === "COMPLETED") return "done";
  if (job.status === "PENDING") return attempt > 0 ? "waiting" : "extraction";
  if (job.status === "PROCESSING") return attempt > 2 ? "analysis" : "extraction";
  return "waiting";
}

export function useContractsWorkspace(session: SessionIdentity | null) {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ServiceContract | null>(null);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [comparisonStage, setComparisonStage] = useState<ComparisonStage>("idle");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const pollGenerationRef = useRef(0);

  const analysisModeLabel =
    (import.meta.env.VITE_LLM_PROVIDER as string | undefined)?.toLowerCase() === "gemini"
      ? "real (Gemini)"
      : "mock";

  const flash = useCallback((nextMessage: string | null, nextError: string | null = null) => {
    setMessage(nextMessage);
    setError(nextError);
  }, []);

  const withBusy = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      try {
        await fn();
      } catch (err) {
        flash(null, err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [flash],
  );

  const refreshContracts = useCallback(async () => {
    if (!session) return;
    const list = await contractsApi.list(session);
    setContracts(list);
    setSelectedId((current) => {
      if (current && !list.some((c) => c.id === current)) {
        setSelected(null);
        setDocuments([]);
        setJob(null);
        setComparisonStage("idle");
        return null;
      }
      return current;
    });
  }, [session]);

  const pollJob = useCallback(
    async (jobId: string, contractId?: string) => {
      if (!session) return;
      pollAbortRef.current?.abort();
      const controller = new AbortController();
      pollAbortRef.current = controller;
      const generation = pollGenerationRef.current;
      const ownerContractId = contractId ?? selectedId ?? "";

      if (ownerContractId) {
        sessionStorage.setItem(`${JOB_STORAGE_PREFIX}${ownerContractId}`, jobId);
      }

      let attempt = 0;
      let delayMs = 800;
      while (!controller.signal.aborted && generation === pollGenerationRef.current) {
        try {
          const next = await contractsApi.getJob(session, jobId);
          if (generation !== pollGenerationRef.current || controller.signal.aborted) {
            return;
          }
          setJob(next);
          setPollAttempt(attempt);
          setComparisonStage(stageFromJob(next, attempt));
          if (next.status === "COMPLETED" || next.status === "FAILED") {
            setComparisonStage(next.status === "COMPLETED" ? "done" : "error");
            return;
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          setComparisonStage("retry");
          flash(null, err instanceof Error ? err.message : String(err));
        }
        attempt += 1;
        delayMs = Math.min(delayMs * 1.4, 8000);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    },
    [session, selectedId, flash],
  );

  const selectContract = useCallback(
    async (id: string) => {
      if (!session) return;
      pollAbortRef.current?.abort();
      pollGenerationRef.current += 1;
      setSelectedId(id);
      setSelected(await contractsApi.get(session, id));
      setDocuments(await contractsApi.listDocuments(session, id));
      setJob(null);
      setComparisonStage("idle");
      setPollAttempt(0);
      flash(null);

      const storedJobId = sessionStorage.getItem(`${JOB_STORAGE_PREFIX}${id}`);
      if (storedJobId) {
        void pollJob(storedJobId, id);
      }
    },
    [session, flash, pollJob],
  );

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const downloadReport = useCallback(
    async (reportId: string) => {
      const token = await authService.getAccessToken();
      if (!token) {
        flash(null, "Session expired. Please sign in again.");
        return;
      }
      const response = await fetch(contractsApi.downloadReportUrl(reportId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        flash(null, `Download failed (${response.status})`);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `contractflow-report-${reportId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [flash],
  );

  useEffect(() => {
    if (!session) return;
    void withBusy(async () => {
      await refreshContracts();
      flash("Signed in.");
    });
  }, [session, refreshContracts, withBusy, flash]);

  return {
    contracts,
    selectedId,
    selected,
    documents,
    job,
    comparisonStage,
    pollAttempt,
    analysisModeLabel,
    busy,
    message,
    error,
    flash,
    withBusy,
    refreshContracts,
    selectContract,
    pollJob,
    downloadReport,
    setDocuments,
  };
}
