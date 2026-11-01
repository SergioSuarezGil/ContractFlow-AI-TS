import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "mongodb";
import type { ContractDocumentRepository } from "../../../application/ports/contract-document.repository";
import {
  ContractDocument,
  type ContractDocumentProps,
} from "../../../domain/document/contract-document";
import { MONGO_DB } from "./mongo.module";

interface DocumentShape extends Omit<ContractDocumentProps, "createdAt"> {
  createdAt: Date | string;
}

@Injectable()
export class MongoContractDocumentRepository implements ContractDocumentRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private collection() {
    return this.db.collection<DocumentShape>("documents");
  }

  async save(document: ContractDocument): Promise<void> {
    const snap = document.snapshot();
    await this.collection().updateOne(
      { id: snap.id },
      { $set: snap },
      { upsert: true },
    );
  }

  async findById(id: string): Promise<ContractDocument | null> {
    const doc = await this.collection().findOne({ id });
    return doc ? this.toDomain(doc) : null;
  }

  async listByContractId(contractId: string): Promise<ContractDocument[]> {
    const docs = await this.collection()
      .find({ contractId })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async delete(id: string): Promise<void> {
    await this.collection().deleteOne({ id });
  }

  private toDomain(doc: DocumentShape): ContractDocument {
    return ContractDocument.rehydrate({
      id: doc.id,
      contractId: doc.contractId,
      householdId: doc.householdId,
      ownerId: doc.ownerId,
      role: doc.role,
      fileName: doc.fileName,
      contentType: doc.contentType,
      sizeBytes: doc.sizeBytes,
      storageKey: doc.storageKey,
      createdAt: new Date(doc.createdAt),
    });
  }
}
