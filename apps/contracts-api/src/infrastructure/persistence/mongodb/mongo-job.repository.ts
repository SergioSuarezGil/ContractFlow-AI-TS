import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "mongodb";
import type { JobRepository } from "../../../application/ports/job.repository";
import { Job, type JobProps } from "../../../domain/job/job";
import { MONGO_DB } from "./mongo.module";

@Injectable()
export class MongoJobRepository implements JobRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private collection() {
    return this.db.collection<JobProps>("jobs");
  }

  async save(job: Job): Promise<void> {
    const snap = job.snapshot();
    await this.collection().updateOne({ id: snap.id }, { $set: snap }, { upsert: true });
  }

  async findById(id: string): Promise<Job | null> {
    const doc = await this.collection().findOne({ id });
    if (!doc) return null;
    return Job.rehydrate({
      id: doc.id,
      type: doc.type,
      status: doc.status,
      contractId: doc.contractId,
      householdId: doc.householdId,
      ownerId: doc.ownerId,
      correlationId: doc.correlationId,
      comparisonId: doc.comparisonId,
      reportId: doc.reportId,
      errorMessage: doc.errorMessage,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    });
  }
}
