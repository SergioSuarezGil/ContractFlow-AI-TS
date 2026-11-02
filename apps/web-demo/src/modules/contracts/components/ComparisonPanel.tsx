import type { Job } from "../../../core/api/contracts.api";
import type { ComparisonStage } from "../hooks/useContractsWorkspace";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";

interface ComparisonPanelProps {
  job: Job | null;
  stage: ComparisonStage;
  analysisModeLabel: string;
  disabled?: boolean;
  canCompare: boolean;
  onCompare: () => void;
  onDownload: () => void;
}

function toneFor(status: Job["status"]) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "FAILED") return "danger" as const;
  if (status === "PROCESSING") return "warn" as const;
  return "neutral" as const;
}

const STAGE_LABEL: Record<ComparisonStage, string> = {
  idle: "Idle",
  extraction: "Extraction",
  waiting: "Waiting in queue",
  analysis: "Analysis",
  retry: "Retrying",
  done: "Done",
  error: "Error",
};

export function ComparisonPanel({
  job,
  stage,
  analysisModeLabel,
  disabled,
  canCompare,
  onCompare,
  onDownload,
}: ComparisonPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Comparison</h3>
      <p className="text-sm text-slate-600">
        Requires at least one current document and one proposal. Analysis mode:{" "}
        <span className="font-medium text-slate-800">{analysisModeLabel}</span>.
        Jobs run asynchronously via RabbitMQ workers with exponential backoff polling.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled || !canCompare} onClick={onCompare}>
          Run comparison
        </Button>
        <Button
          variant="secondary"
          disabled={!job?.reportId || job.status !== "COMPLETED"}
          onClick={onDownload}
        >
          Download report
        </Button>
      </div>
      {stage !== "idle" ? (
        <p className="text-xs text-slate-500">
          Stage: <span className="font-medium text-slate-700">{STAGE_LABEL[stage]}</span>
        </p>
      ) : null}
      {job ? (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Job</span>
            <code className="text-xs text-slate-700">{job.id}</code>
            <Badge tone={toneFor(job.status)}>{job.status}</Badge>
            <Badge tone="neutral">{analysisModeLabel}</Badge>
          </div>
          {job.errorMessage ? (
            <p className="mt-2 text-rose-700">{job.errorMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
