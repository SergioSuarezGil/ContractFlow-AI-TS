import type { Job } from "../../../core/api/contracts.api";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";

interface ComparisonPanelProps {
  job: Job | null;
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

export function ComparisonPanel({
  job,
  disabled,
  canCompare,
  onCompare,
  onDownload,
}: ComparisonPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Comparison</h3>
      <p className="text-sm text-slate-600">
        Requires at least one current document and one proposal. The job runs
        asynchronously via RabbitMQ workers.
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
      {job ? (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Job</span>
            <code className="text-xs text-slate-700">{job.id}</code>
            <Badge tone={toneFor(job.status)}>{job.status}</Badge>
          </div>
          {job.errorMessage ? (
            <p className="mt-2 text-rose-700">{job.errorMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
