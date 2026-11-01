import { ValidationError } from "../shared/domain-error";

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type JobType = "COMPARE_PROPOSALS";

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
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: JobProps): Job {
    return new Job({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get contractId(): string {
    return this.props.contractId;
  }

  belongsTo(ownerId: string, householdId: string): boolean {
    return this.props.ownerId === ownerId && this.props.householdId === householdId;
  }

  snapshot(): JobProps {
    return { ...this.props };
  }

  markProcessing(now?: Date): void {
    this.assertNotTerminal();
    this.props.status = "PROCESSING";
    this.touch(now);
  }

  markComparisonCompleted(comparisonId: string, now?: Date): void {
    this.assertNotTerminal();
    this.props.comparisonId = comparisonId;
    this.props.status = "PROCESSING";
    this.touch(now);
  }

  markCompleted(reportId: string, now?: Date): void {
    this.assertNotTerminal();
    this.props.reportId = reportId;
    this.props.status = "COMPLETED";
    this.touch(now);
  }

  markFailed(message: string, now?: Date): void {
    if (this.props.status === "COMPLETED") {
      throw new ValidationError("Completed jobs cannot fail");
    }
    this.props.status = "FAILED";
    this.props.errorMessage = message;
    this.touch(now);
  }

  private assertNotTerminal(): void {
    if (this.props.status === "COMPLETED" || this.props.status === "FAILED") {
      throw new ValidationError(`Job already ${this.props.status}`);
    }
  }

  private touch(now?: Date): void {
    this.props.updatedAt = now ?? new Date();
  }
}
