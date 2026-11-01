import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import {
  COMPARISON_LOOKUP,
  CONTRACT_DOCUMENT_REPOSITORY,
  EVENT_PUBLISHER,
  JOB_REPOSITORY,
  OBJECT_STORAGE,
  REPORT_REPOSITORY,
  SERVICE_CONTRACT_REPOSITORY,
} from "../../../application/ports/tokens";
import { ArchiveServiceContractUseCase } from "../../../application/use-cases/archive-service-contract.use-case";
import { AttachDocumentUseCase } from "../../../application/use-cases/attach-document.use-case";
import { CreateServiceContractUseCase } from "../../../application/use-cases/create-service-contract.use-case";
import { GetJobUseCase } from "../../../application/use-cases/get-job.use-case";
import { GetWorkerComparisonUseCase } from "../../../application/use-cases/get-worker-comparison.use-case";
import {
  DownloadReportUseCase,
  GetReportUseCase,
} from "../../../application/use-cases/get-report.use-case";
import { AiWorkerGrpcClient } from "../../grpc/ai-worker-grpc.client";
import { HealthModule } from "../health/health.module";
import { GetServiceContractUseCase } from "../../../application/use-cases/get-service-contract.use-case";
import { ListDocumentsUseCase } from "../../../application/use-cases/list-documents.use-case";
import { ListServiceContractsUseCase } from "../../../application/use-cases/list-service-contracts.use-case";
import { RequestComparisonUseCase } from "../../../application/use-cases/request-comparison.use-case";
import { UpdateServiceContractUseCase } from "../../../application/use-cases/update-service-contract.use-case";
import { RabbitMqEventPublisher } from "../../messaging/rabbitmq-event-publisher";
import { RabbitMqResultsConsumer } from "../../messaging/rabbitmq-results-consumer";
import { MongoContractDocumentRepository } from "../../persistence/mongodb/mongo-contract-document.repository";
import { MongoJobRepository } from "../../persistence/mongodb/mongo-job.repository";
import { MongoReportRepository } from "../../persistence/mongodb/mongo-report.repository";
import { MongoServiceContractRepository } from "../../persistence/mongodb/mongo-service-contract.repository";
import { S3ObjectStorageAdapter } from "../../storage/s3/s3-object-storage.adapter";
import { OidcActorMiddleware } from "../auth/oidc-actor.middleware";
import { ComparisonsController } from "../comparisons/comparisons.controller";
import { DocumentsController } from "../documents/documents.controller";
import { JobsController } from "../jobs/jobs.controller";
import { ReportsController } from "../reports/reports.controller";
import { ContractsController } from "./contracts.controller";

@Module({
  imports: [HealthModule],
  controllers: [
    ContractsController,
    DocumentsController,
    ComparisonsController,
    JobsController,
    ReportsController,
  ],
  providers: [
    CreateServiceContractUseCase,
    ListServiceContractsUseCase,
    GetServiceContractUseCase,
    UpdateServiceContractUseCase,
    ArchiveServiceContractUseCase,
    AttachDocumentUseCase,
    ListDocumentsUseCase,
    RequestComparisonUseCase,
    GetJobUseCase,
    GetWorkerComparisonUseCase,
    GetReportUseCase,
    DownloadReportUseCase,
    RabbitMqResultsConsumer,
    {
      provide: COMPARISON_LOOKUP,
      useExisting: AiWorkerGrpcClient,
    },
    {
      provide: SERVICE_CONTRACT_REPOSITORY,
      useClass: MongoServiceContractRepository,
    },
    {
      provide: CONTRACT_DOCUMENT_REPOSITORY,
      useClass: MongoContractDocumentRepository,
    },
    {
      provide: JOB_REPOSITORY,
      useClass: MongoJobRepository,
    },
    {
      provide: REPORT_REPOSITORY,
      useClass: MongoReportRepository,
    },
    {
      provide: OBJECT_STORAGE,
      useClass: S3ObjectStorageAdapter,
    },
    {
      provide: EVENT_PUBLISHER,
      useClass: RabbitMqEventPublisher,
    },
  ],
})
export class ContractsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(OidcActorMiddleware)
      .forRoutes(
        ContractsController,
        DocumentsController,
        ComparisonsController,
        JobsController,
        ReportsController,
      );
  }
}
