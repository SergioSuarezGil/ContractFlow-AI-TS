import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { Job } from "../../domain/job/job";
import { ForbiddenError, NotFoundError } from "../../domain/shared/domain-error";
import type { ActorContext } from "../dto/actor.dto";
import { createEnvelope } from "../messaging/event-envelope";
import type { EventPublisher } from "../ports/event-publisher";
import type { JobRepository } from "../ports/job.repository";
import type { ServiceContractRepository } from "../ports/service-contract.repository";
import {
  EVENT_PUBLISHER,
  JOB_REPOSITORY,
  SERVICE_CONTRACT_REPOSITORY,
} from "../ports/tokens";

@Injectable()
export class RequestComparisonUseCase {
  constructor(
    @Inject(SERVICE_CONTRACT_REPOSITORY)
    private readonly contracts: ServiceContractRepository,
    @Inject(JOB_REPOSITORY)
    private readonly jobs: JobRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly publisher: EventPublisher,
  ) {}

  async execute(actor: ActorContext, contractId: string) {
    const contract = await this.contracts.findById(contractId);
    if (!contract) {
      throw new NotFoundError(`Contract not found: ${contractId}`);
    }
    if (!contract.belongsTo(actor.ownerId, actor.householdId)) {
      throw new ForbiddenError("Access denied to this contract");
    }
    contract.canRequestComparison();

    const jobId = randomUUID();
    const correlationId = randomUUID();
    const eventId = randomUUID();
    const snap = contract.snapshot();

    const job = Job.create({
      id: jobId,
      contractId: contract.id,
      householdId: actor.householdId,
      ownerId: actor.ownerId,
      correlationId,
    });
    await this.jobs.save(job);

    const envelope = createEnvelope({
      eventId,
      eventType: "comparison.requested.v1",
      correlationId,
      householdId: actor.householdId,
      payload: {
        jobId,
        contractId: contract.id,
        ownerId: actor.ownerId,
        currentDocumentIds: snap.currentDocumentIds,
        proposalDocumentIds: snap.proposalDocumentIds,
        title: snap.title,
        providerName: snap.providerName,
        serviceType: snap.serviceType,
      },
    });

    await this.publisher.publish("comparison.requested.v1", envelope);
    job.markProcessing();
    await this.jobs.save(job);

    return {
      jobId: job.id,
      status: job.snapshot().status,
      correlationId,
    };
  }
}
