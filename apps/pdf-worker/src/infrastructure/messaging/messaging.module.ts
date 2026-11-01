import { Module } from "@nestjs/common";
import { SimplePdfGenerator } from "../../application/simple-pdf.generator";
import { ReportConsumerService } from "./report-consumer.service";

@Module({
  providers: [SimplePdfGenerator, ReportConsumerService],
  exports: [SimplePdfGenerator, ReportConsumerService],
})
export class MessagingModule {}
