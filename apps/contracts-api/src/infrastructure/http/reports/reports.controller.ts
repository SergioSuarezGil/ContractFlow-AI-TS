import { Controller, Get, Header, Param, Res, StreamableFile } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import type { ActorContext } from "../../../application/dto/actor.dto";
import {
  DownloadReportUseCase,
  GetReportUseCase,
} from "../../../application/use-cases/get-report.use-case";
import { Actor } from "../auth/actor.decorator";
import { ReportResponseDto } from "../dto/api-responses.dto";

@ApiTags("reports")
@ApiBearerAuth("bearer")
@Controller("api/v1/reports")
export class ReportsController {
  constructor(
    private readonly getReport: GetReportUseCase,
    private readonly downloadReport: DownloadReportUseCase,
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "Get report metadata" })
  @ApiOkResponse({ type: ReportResponseDto })
  get(@Actor() actor: ActorContext, @Param("id") id: string) {
    return this.getReport.execute(actor, id);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Download comparative PDF report" })
  @ApiProduces("application/pdf")
  @Header("Content-Type", "application/pdf")
  async download(
    @Actor() actor: ActorContext,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const report = await this.downloadReport.execute(actor, id);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${report.fileName}"`,
    );
    return new StreamableFile(report.body);
  }
}
