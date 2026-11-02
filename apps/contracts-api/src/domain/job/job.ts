import { ValidationError } from "../shared/domain-error";

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type JobType = "COMPARE_PROPOSALS";

export interface OutboxEvent {
  routingKey: string;
  envelope: Record<string, unknown>;
  publishedAt: string | null;
}

export interface JobProps {
  id: string;
  type: JobType;
  status: JobStatus;
  contractId: string;
  householdId: string;
  ownerId: string;
  correlationId: string;
  comparisonId?: string;
  reportId?: string;
  errorMessage?: string;
  version: number;
  outbox?: OutboxEvent | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Job {
  private constructor(private props: JobProps) {}

  static create(input: {
    id: string;
    contractId: string;
    householdId: string;
    ownerId: string;
    correlationId: string;
    outbox: OutboxEvent;
    now?: Date;
  }): Job {
    const now = input.now ?? new Date();
    return new Job({
      id: input.id,
      type: "COMPARE_PROPOSALS",
      status: "PENDING",
      contractId: input.contractId,
      householdId: input.householdId,
      ownerId: input.ownerId,
      correlationId: input.correlationId,
      version: 0,
      outbox: input.outbox,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: JobProps): Job {
    return new Job({
      ...props,
      version: props.version ?? 0,
      outbox: props.outbox ?? null,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get contractId(): string {
    return this.props.contractId;
  }

  get version(): number {
    return this.props.version;
  }

  belongsTo(ownerId: string, householdId: string): boolean {
    return this.props.ownerId === ownerId && this.props.householdId === householdId;
  }

  snapshot(): JobProps {
    return {
      ...this.props,
      outbox: this.props.outbox
        ? { ...this.props.outbox, envelope: { ...this.props.outbox.envelope } }
        : this.props.outbox,
    };
  }

  markOutboxPublished(now?: Date): void {
    if (!this.props.outbox || this.props.outbox.publishedAt) {
      return;
    }
    this.assertNotTerminal();
    this.props.outbox = {
      ...this.props.outbox,
      publishedAt: (now ?? new Date()).toISOString(),
    };
    if (this.props.status === "PENDING") {
      this.props.status = "PROCESSING";
    }
    this.bump(now);
  }

  markProcessing(now?: Date): void {
    this.assertNotTerminal();
    if (this.props.status === "PROCESSING") {
      return;
    }
    this.props.status = "PROCESSING";
    this.bump(now);
  }

  markComparisonCompleted(comparisonId: string, now?: Date): void {
    if (this.props.status === "COMPLETED" || this.props.status === "FAILED") {
      return;
    }
    this.props.comparisonId = comparisonId;
    this.props.status = "PROCESSING";
    this.bump(now);
  }

  markCompleted(reportId: string, now?: Date): void {
    if (this.props.status === "COMPLETED") {
      return;
    }
    if (this.props.status === "FAILED") {
      throw new ValidationError("Failed jobs cannot complete");
    }
    this.props.reportId = reportId;
    this.props.status = "COMPLETED";
    this.bump(now);
  }

  markFailed(message: string, now?: Date): void {
    if (this.props.status === "COMPLETED") {
      return;
    }
    if (this.props.status === "FAILED") {
      return;
    }
    this.props.status = "FAILED";
    this.props.errorMessage = message;
    this.bump(now);
  }

  private assertNotTerminal(): void {
    if (this.props.status === "COMPLETED" || this.props.status === "FAILED") {
      throw new ValidationError(`Job already ${this.props.status}`);
    }
  }

  private bump(now?: Date): void {
    this.props.version += 1;
    this.props.updatedAt = now ?? new Date();
  }
}
