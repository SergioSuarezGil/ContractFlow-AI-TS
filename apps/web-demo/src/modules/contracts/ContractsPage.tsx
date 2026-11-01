import { Navigate } from "react-router";
import { contractsApi } from "../../core/api/contracts.api";
import { useAuth } from "../../core/auth/AuthContext";
import { Alert } from "../../shared/ui/Alert";
import { Button } from "../../shared/ui/Button";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { ContractList } from "./components/ContractList";
import { CreateContractForm } from "./components/CreateContractForm";
import { DocumentPanel } from "./components/DocumentPanel";
import { useContractsWorkspace } from "./hooks/useContractsWorkspace";

export function ContractsPage() {
  const { session, logout } = useAuth();
  // Hooks must run unconditionally; redirect if unauthenticated.
  const workspace = useContractsWorkspace(session);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const {
    contracts,
    selectedId,
    selected,
    documents,
    job,
    busy,
    message,
    error,
    withBusy,
    refreshContracts,
    selectContract,
    pollJob,
    downloadReport,
    flash,
    setDocuments,
  } = workspace;

  const canCompare =
    documents.some((d) => d.role === "current") &&
    documents.some((d) => d.role === "proposal");

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_28%,#f8fafc_100%)]">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-2xl font-semibold text-ink">ContractFlow AI</p>
            <p className="text-xs text-slate-500">
              {session.displayName}
              {session.provider === "google-mock" ? " · Google (mock)" : " · Keycloak"} ·{" "}
              {session.householdId}
            </p>
          </div>
          <Button variant="ghost" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <CreateContractForm
              disabled={busy}
              onSubmit={async (body) => {
                await withBusy(async () => {
                  const created = await contractsApi.create(session, body);
                  await refreshContracts();
                  await selectContract(created.id);
                  flash("Contract created.");
                });
              }}
            />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Your contracts</h2>
            <ContractList
              contracts={contracts}
              selectedId={selectedId}
              onSelect={(id) => {
                void withBusy(async () => {
                  await selectContract(id);
                });
              }}
            />
          </section>
        </aside>

        <section className="space-y-4">
          {message ? <Alert variant="success">{message}</Alert> : null}
          {error ? <Alert variant="danger">{error}</Alert> : null}

          {!selected ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
              <p className="font-display text-xl text-slate-800">Select or create a contract</p>
              <p className="mt-2 text-sm text-slate-500">
                Upload current and proposal PDFs, then run a comparison job.
              </p>
            </div>
          ) : (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  {selected.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selected.providerName} · {selected.serviceType} · status{" "}
                  <span className="font-medium">{selected.status}</span>
                </p>
                {selected.notes ? (
                  <p className="mt-3 text-sm text-slate-600">{selected.notes}</p>
                ) : null}
              </div>

              <DocumentPanel
                documents={documents}
                disabled={busy}
                onReject={(msg) => flash(null, msg)}
                onUpload={async (files, role) => {
                  await withBusy(async () => {
                    for (const file of files) {
                      await contractsApi.uploadDocument(
                        session,
                        selected.id,
                        file,
                        role,
                      );
                    }
                    const docs = await contractsApi.listDocuments(session, selected.id);
                    setDocuments(docs);
                    await refreshContracts();
                    flash(
                      `Uploaded ${files.length} ${role} document${files.length === 1 ? "" : "s"}.`,
                    );
                  });
                }}
              />

              <ComparisonPanel
                job={job}
                disabled={busy}
                canCompare={canCompare}
                onCompare={() => {
                  void withBusy(async () => {
                    flash("Comparison requested…");
                    const accepted = await contractsApi.requestComparison(
                      session,
                      selected.id,
                    );
                    await pollJob(accepted.jobId);
                  });
                }}
                onDownload={() => {
                  if (job?.reportId) void downloadReport(job.reportId);
                }}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
