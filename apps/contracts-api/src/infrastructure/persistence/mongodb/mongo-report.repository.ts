import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "mongodb";
import type { ReportRepository } from "../../../application/ports/report.repository";
import { Report, type ReportProps } from "../../../domain/report/report";
import { MONGO_DB } from "./mongo.module";

@Injectable()
export class MongoReportRepository implements ReportRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private collection() {
    return this.db.collection<ReportProps>("reports");
  }

  async save(report: Report): Promise<void> {
    const snap = report.snapshot();
    await this.collection().updateOne({ id: snap.id }, { $set: snap }, { upsert: true });
  }

  async findById(id: string): Promise<Report | null> {
    const doc = await this.collection().findOne({ id });
    if (!doc) return null;
    return Report.rehydrate({
      id: doc.id,
      jobId: doc.jobId,
      contractId: doc.contractId,
      householdId: doc.householdId,
      ownerId: doc.ownerId,
      comparisonId: doc.comparisonId,
      storageKey: doc.storageKey,
      fileName: doc.fileName,
      contentType: doc.contentType,
      sizeBytes: doc.sizeBytes,
      createdAt: new Date(doc.createdAt),
    });
  }
}
