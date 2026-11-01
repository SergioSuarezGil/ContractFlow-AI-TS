import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { assertAllowedDocumentUpload } from "../../domain/document/allowed-content-types";
import { ContractDocument } from "../../domain/document/contract-document";
import { ForbiddenError, NotFoundError, ValidationError } from "../../domain/shared/domain-error";
import type { ActorContext } from "../dto/actor.dto";
import type { ContractDocumentRepository } from "../ports/contract-document.repository";
import type { ObjectStoragePort } from "../ports/object-storage";
import type { ServiceContractRepository } from "../ports/service-contract.repository";
import {
  CONTRACT_DOCUMENT_REPOSITORY,
  OBJECT_STORAGE,
  SERVICE_CONTRACT_REPOSITORY,
} from "../ports/tokens";

export interface AttachDocumentCommand {
  actor: ActorContext;
  contractId: string;
  role: string;
  fileName: string;
  contentType: string;
  body: Buffer;
}

@Injectable()
export class AttachDocumentUseCase {
  constructor(
    @Inject(SERVICE_CONTRACT_REPOSITORY)
    private readonly contracts: ServiceContractRepository,
    @Inject(CONTRACT_DOCUMENT_REPOSITORY)
    private readonly documents: ContractDocumentRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStoragePort,
  ) {}

  async execute(command: AttachDocumentCommand) {
    if (!command.body.length) {
      throw new ValidationError("Empty file upload");
    }
    assertAllowedDocumentUpload(command.fileName, command.contentType);

    const contract = await this.contracts.findById(command.contractId);
    if (!contract) {
      throw new NotFoundError(`Contract not found: ${command.contractId}`);
    }
    if (!contract.belongsTo(command.actor.ownerId, command.actor.householdId)) {
      throw new ForbiddenError("Access denied to this contract");
    }

    const documentId = randomUUID();
    const bucket = process.env.S3_BUCKET_DOCUMENTS ?? "documents";
    const storageKey = `${command.actor.householdId}/${command.contractId}/${documentId}/${command.fileName}`;

    await this.storage.putObject({
      bucket,
      key: storageKey,
      body: command.body,
      contentType: command.contentType,
    });

    const document = ContractDocument.create({
      id: documentId,
      contractId: contract.id,
      householdId: command.actor.householdId,
      ownerId: command.actor.ownerId,
      role: command.role,
      fileName: command.fileName,
      contentType: command.contentType,
      sizeBytes: command.body.length,
      storageKey,
    });

    try {
      contract.attachDocument(
        document.id,
        document.role === "proposal" ? "proposal" : "current",
      );
      await this.documents.save(document);
      await this.contracts.save(contract);
    } catch (error) {
      await this.storage.deleteObject(bucket, storageKey).catch(() => undefined);
      throw error;
    }

    return document.snapshot();
  }
}
