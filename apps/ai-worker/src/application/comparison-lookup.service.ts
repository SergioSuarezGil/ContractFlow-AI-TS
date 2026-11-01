import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { MongoClient, type Db } from "mongodb";

export interface ComparisonLookupResult {
  found: boolean;
  jobId: string;
  comparisonId: string;
  contractId: string;
  verdict: string;
  summary: string;
  createdAt: string;
}

@Injectable()
export class ComparisonLookupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComparisonLookupService.name);
  private client?: MongoClient;
  private db?: Db;

  async onModuleInit(): Promise<void> {
    const uri =
      process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/contractflow?directConnection=true";
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB ?? "contractflow");
    this.logger.log("ComparisonLookupService connected to MongoDB");
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close().catch(() => undefined);
  }

  async findByJobId(jobId: string): Promise<ComparisonLookupResult> {
    if (!this.db || !jobId.trim()) {
      return empty(jobId);
    }
    const doc = await this.db.collection("comparisons").findOne({ jobId });
    if (!doc) {
      return empty(jobId);
    }
    return {
      found: true,
      jobId: String(doc.jobId ?? jobId),
      comparisonId: String(doc.id ?? ""),
      contractId: String(doc.contractId ?? ""),
      verdict: String(doc.verdict ?? ""),
      summary: String(doc.summary ?? ""),
      createdAt: String(doc.createdAt ?? ""),
    };
  }

  async pingMongo(): Promise<boolean> {
    if (!this.db) return false;
    await this.db.command({ ping: 1 });
    return true;
  }
}

function empty(jobId: string): ComparisonLookupResult {
  return {
    found: false,
    jobId,
    comparisonId: "",
    contractId: "",
    verdict: "",
    summary: "",
    createdAt: "",
  };
}
