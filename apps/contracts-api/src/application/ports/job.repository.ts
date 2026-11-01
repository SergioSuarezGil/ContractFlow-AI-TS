import type { Job } from "../../domain/job/job";

export interface JobRepository {
  save(job: Job): Promise<void>;
  findById(id: string): Promise<Job | null>;
}
