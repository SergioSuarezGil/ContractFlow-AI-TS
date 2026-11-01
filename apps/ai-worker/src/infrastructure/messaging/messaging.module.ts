import { Module } from "@nestjs/common";
import { MockComparisonService } from "../../application/mock-comparison.service";
import { ComparisonLookupService } from "../../application/comparison-lookup.service";
import { ComparisonConsumerService } from "./comparison-consumer.service";

@Module({
  providers: [
    MockComparisonService,
    ComparisonConsumerService,
    ComparisonLookupService,
  ],
  exports: [
    MockComparisonService,
    ComparisonConsumerService,
    ComparisonLookupService,
  ],
})
export class MessagingModule {}
