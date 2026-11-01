export interface WorkerComparisonView {
  found: boolean;
  jobId: string;
  comparisonId: string;
  contractId: string;
  verdict: string;
  summary: string;
  createdAt: string;
}

export interface ComparisonLookupPort {
  getByJobId(jobId: string): Promise<WorkerComparisonView>;
}
