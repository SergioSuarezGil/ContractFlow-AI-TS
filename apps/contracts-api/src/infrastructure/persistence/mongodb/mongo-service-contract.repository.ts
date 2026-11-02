import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "mongodb";
import type { ServiceContractRepository } from "../../../application/ports/service-contract.repository";
import {
  ServiceContract,
  type ServiceContractProps,
} from "../../../domain/service-contract/service-contract";
import { MONGO_DB } from "./mongo.module";

interface ContractDocumentShape extends Omit<ServiceContractProps, "createdAt" | "updatedAt"> {
  createdAt: Date | string;
  updatedAt: Date | string;
}

@Injectable()
export class MongoServiceContractRepository implements ServiceContractRepository {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private collection() {
    return this.db.collection<ContractDocumentShape>("contracts");
  }

  async save(contract: ServiceContract): Promise<void> {
    const snap = contract.snapshot();
    await this.collection().updateOne(
      { id: snap.id },
      { $set: snap },
      { upsert: true },
    );
  }

  async findById(id: string): Promise<ServiceContract | null> {
    const doc = await this.collection().findOne({ id });
    return doc ? this.toDomain(doc) : null;
  }

  async listByHousehold(householdId: string, ownerId: string): Promise<ServiceContract[]> {
    const docs = await this.collection()
      .find({ householdId, ownerId })
      .sort({ updatedAt: -1 })
      .toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async delete(id: string): Promise<void> {
    await this.collection().deleteOne({ id });
  }

  async attachDocumentId(
    contractId: string,
    documentId: string,
    role: "current" | "proposal",
  ): Promise<void> {
    const field = role === "current" ? "currentDocumentIds" : "proposalDocumentIds";
    const now = new Date();
    const result = await this.collection().updateOne(
      { id: contractId },
      {
        $addToSet: { [field]: documentId },
        $set: { updatedAt: now },
      },
    );
    if (result.matchedCount === 0) {
      throw new Error(`Contract not found: ${contractId}`);
    }
    await this.collection().updateOne(
      { id: contractId, status: "draft" },
      { $set: { status: "active", updatedAt: now } },
    );
  }

  private toDomain(doc: ContractDocumentShape): ServiceContract {
    return ServiceContract.rehydrate({
      id: doc.id,
      householdId: doc.householdId,
      ownerId: doc.ownerId,
      serviceType: doc.serviceType,
      providerName: doc.providerName,
      title: doc.title,
      notes: doc.notes,
      status: doc.status,
      currentDocumentIds: doc.currentDocumentIds,
      proposalDocumentIds: doc.proposalDocumentIds,
      version: doc.version,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    });
  }
}
