import type { Job } from "../../domain/job/job";

export interface JobRepository {
  /** Conditional write using job.version (optimistic lock). */
  save(job: Job): Promise<void>;
  findById(id: string): Promise<Job | null>;
  findPendingOutbox(limit: number): Promise<Job[]>;
}
