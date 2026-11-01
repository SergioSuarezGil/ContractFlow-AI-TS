import type { Report } from "../../domain/report/report";

export interface ReportRepository {
  save(report: Report): Promise<void>;
  findById(id: string): Promise<Report | null>;
}
