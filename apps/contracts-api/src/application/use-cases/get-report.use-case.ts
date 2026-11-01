import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "../../domain/shared/domain-error";
import type { ActorContext } from "../dto/actor.dto";
import type { ObjectStoragePort } from "../ports/object-storage";
import type { ReportRepository } from "../ports/report.repository";
import { OBJECT_STORAGE, REPORT_REPOSITORY } from "../ports/tokens";

@Injectable()
export class GetReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reports: ReportRepository,
  ) {}

  async execute(actor: ActorContext, reportId: string) {
    const report = await this.reports.findById(reportId);
    if (!report) {
      throw new NotFoundError(`Report not found: ${reportId}`);
    }
    if (!report.belongsTo(actor.ownerId, actor.householdId)) {
      throw new ForbiddenError("Access denied to this report");
    }
    return report.snapshot();
  }
}

@Injectable()
export class DownloadReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reports: ReportRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStoragePort,
  ) {}

  async execute(actor: ActorContext, reportId: string) {
    const report = await this.reports.findById(reportId);
    if (!report) {
      throw new NotFoundError(`Report not found: ${reportId}`);
    }
    if (!report.belongsTo(actor.ownerId, actor.householdId)) {
      throw new ForbiddenError("Access denied to this report");
    }
    const snap = report.snapshot();
    const bucket = process.env.S3_BUCKET_REPORTS ?? "reports";
    const body = await this.storage.getObject(bucket, snap.storageKey);
    return {
      ...snap,
      body,
    };
  }
}
