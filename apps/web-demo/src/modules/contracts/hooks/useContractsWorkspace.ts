import { useCallback, useEffect, useState } from "react";
import {
  contractsApi,
  type ContractDocument,
  type Job,
  type ServiceContract,
} from "../../../core/api/contracts.api";
import { authService, type SessionIdentity } from "../../../core/auth/auth.service";

export function useContractsWorkspace(session: SessionIdentity | null) {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ServiceContract | null>(null);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        return null;
      }
      return current;
    });
  }, [session]);

  const selectContract = useCallback(
    async (id: string) => {
      if (!session) return;
      setSelectedId(id);
      setSelected(await contractsApi.get(session, id));
      setDocuments(await contractsApi.listDocuments(session, id));
      setJob(null);
      flash(null);
    },
    [session, flash],
  );

  const pollJob = useCallback(
    async (jobId: string) => {
      if (!session) return;
      for (let i = 0; i < 20; i += 1) {
        const next = await contractsApi.getJob(session, jobId);
        setJob(next);
        if (next.status === "COMPLETED" || next.status === "FAILED") return;
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
    [session],
  );

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
