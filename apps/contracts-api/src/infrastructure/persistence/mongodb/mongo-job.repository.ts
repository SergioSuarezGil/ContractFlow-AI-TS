import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Db } from "mongodb";
import type { JobRepository } from "../../../application/ports/job.repository";
import { Job, type JobProps } from "../../../domain/job/job";
import { MONGO_DB } from "./mongo.module";

@Injectable()
export class MongoJobRepository implements JobRepository {
  private readonly logger = new Logger(MongoJobRepository.name);
  private indexesReady = false;

  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private collection() {
    return this.db.collection<JobProps>("jobs");
  }

  private async ensureIndexes(): Promise<void> {
    if (this.indexesReady) return;
    await this.collection().createIndex({ id: 1 }, { unique: true });
    await this.collection().createIndex({
      "outbox.publishedAt": 1,
      status: 1,
      updatedAt: 1,
    });
    this.indexesReady = true;
  }

  private rehydrate(doc: JobProps): Job {
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
      version: doc.version ?? 0,
      outbox: doc.outbox ?? null,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    });
  }

  async save(job: Job): Promise<void> {
    await this.ensureIndexes();
    const snap = job.snapshot();
    const expectedVersion = snap.version - 1;

    if (snap.version === 0) {
      await this.collection().insertOne(snap);
      return;
    }

    const result = await this.collection().updateOne(
      { id: snap.id, version: expectedVersion },
      { $set: snap },
    );
    if (result.matchedCount === 0) {
      this.logger.warn(`Optimistic lock failed for job ${snap.id} version ${expectedVersion}`);
      throw new Error(`Job concurrent update conflict: ${snap.id}`);
    }
  }

  async findById(id: string): Promise<Job | null> {
    await this.ensureIndexes();
    const doc = await this.collection().findOne({ id });
    if (!doc) return null;
    return this.rehydrate(doc);
  }

  async findPendingOutbox(limit: number): Promise<Job[]> {
    await this.ensureIndexes();
    const docs = await this.collection()
      .find({
        "outbox.publishedAt": null,
        outbox: { $ne: null },
        status: { $in: ["PENDING", "PROCESSING"] },
      })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .toArray();
    return docs.map((doc) => this.rehydrate(doc));
  }
}
