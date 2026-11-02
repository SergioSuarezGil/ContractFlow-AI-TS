import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/Button";
import { SERVICE_TYPES, type ServiceType } from "../constants";

interface CreateContractFormProps {
  disabled?: boolean;
  onSubmit: (body: {
    serviceType: ServiceType;
    providerName: string;
    title: string;
    notes?: string;
  }) => Promise<void>;
}

export function CreateContractForm({ disabled, onSubmit }: CreateContractFormProps) {
  const [serviceType, setServiceType] = useState<ServiceType>(SERVICE_TYPES[0]);
  const [providerName, setProviderName] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      serviceType,
      providerName: providerName.trim(),
      title: title.trim(),
      notes: notes.trim() || undefined,
    });
    setProviderName("");
    setTitle("");
    setNotes("");
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">New contract</h2>
      <label className="block text-xs font-medium text-slate-600">
        Service type
        <select
          className="mt-1 block w-full rounded-lg border-slate-300 text-sm"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value as ServiceType)}
          disabled={disabled}
        >
          {SERVICE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Provider
        <input
          className="mt-1 block w-full rounded-lg border-slate-300 text-sm"
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
          required
          disabled={disabled}
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Title
        <input
          className="mt-1 block w-full rounded-lg border-slate-300 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={disabled}
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Notes
        <textarea
          className="mt-1 block w-full rounded-lg border-slate-300 text-sm"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled}
        />
      </label>
      <Button type="submit" disabled={disabled} className="w-full">
        Create
      </Button>
    </form>
  );
}
