export interface ReportProps {
  id: string;
  jobId: string;
  contractId: string;
  householdId: string;
  ownerId: string;
  comparisonId: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
}

export class Report {
  private constructor(private readonly props: ReportProps) {}

  static create(input: ReportProps): Report {
    return new Report({ ...input });
  }

  static rehydrate(props: ReportProps): Report {
    return new Report({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  belongsTo(ownerId: string, householdId: string): boolean {
    return this.props.ownerId === ownerId && this.props.householdId === householdId;
  }

  snapshot(): ReportProps {
    return { ...this.props, createdAt: new Date(this.props.createdAt) };
  }
}
