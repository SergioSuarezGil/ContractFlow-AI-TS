import { Module } from "@nestjs/common";
import { ComparisonPipelineService } from "../../application/comparison-pipeline.service";
import { DocumentExtractorService } from "../../application/extraction/document-extractor.service";
import { ComparisonLookupService } from "../../application/comparison-lookup.service";
import { MockComparisonService } from "../../application/mock-comparison.service";
import { CONTRACT_ANALYZER } from "../../application/ports/tokens";
import { GeminiLangChainContractAnalyzer } from "../llm/gemini-langchain-contract-analyzer";
import { MockContractAnalyzer } from "../llm/mock-contract-analyzer";
import { MongoDocumentLoaderService } from "../persistence/mongo-document-loader.service";
import { MetricsModule } from "../http/metrics/metrics.module";
import { ComparisonConsumerService } from "./comparison-consumer.service";

function llmProviderFactory() {
  const provider = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();
  if (provider === "gemini") {
    return new GeminiLangChainContractAnalyzer();
  }
  return new MockContractAnalyzer();
}

@Module({
  imports: [MetricsModule],
  providers: [
    MockComparisonService,
    MockContractAnalyzer,
    DocumentExtractorService,
    MongoDocumentLoaderService,
    ComparisonPipelineService,
    ComparisonConsumerService,
    ComparisonLookupService,
    {
      provide: CONTRACT_ANALYZER,
      useFactory: llmProviderFactory,
    },
  ],
  exports: [
    MockComparisonService,
    ComparisonConsumerService,
    ComparisonLookupService,
    ComparisonPipelineService,
    CONTRACT_ANALYZER,
  ],
})
export class MessagingModule {}
