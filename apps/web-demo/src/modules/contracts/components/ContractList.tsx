import type { ServiceContract } from "../../../core/api/contracts.api";
import { Badge } from "../../../shared/ui/Badge";

interface ContractListProps {
  contracts: ServiceContract[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ContractList({ contracts, selectedId, onSelect }: ContractListProps) {
  if (contracts.length === 0) {
    return (
      <p className="text-sm text-slate-500">No contracts yet. Create one to get started.</p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {contracts.map((contract) => {
        const active = contract.id === selectedId;
        return (
          <li key={contract.id}>
            <button
              type="button"
              onClick={() => onSelect(contract.id)}
              className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-slate-50 ${
                active ? "bg-teal-50/70" : ""
              }`}
            >
              <span className="text-sm font-medium text-slate-900">{contract.title}</span>
              <span className="text-xs text-slate-500">
                {contract.providerName} · {contract.serviceType}
              </span>
              <Badge tone={contract.status === "draft" ? "warn" : "neutral"}>
                {contract.status}
              </Badge>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
