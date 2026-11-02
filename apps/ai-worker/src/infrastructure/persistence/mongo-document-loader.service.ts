import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { MongoClient, type Db } from "mongodb";

export interface StoredDocumentMeta {
  id: string;
  contractId: string;
  role: "current" | "proposal";
  fileName: string;
  contentType: string;
  storageKey: string;
  householdId: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

@Injectable()
export class MongoDocumentLoaderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoDocumentLoaderService.name);
  private mongo?: MongoClient;
  private db?: Db;
  private s3?: S3Client;

  async onModuleInit(): Promise<void> {
    const uri =
      process.env.MONGODB_URI ??
      "mongodb://127.0.0.1:27017/contractflow?directConnection=true";
    this.mongo = new MongoClient(uri);
    await this.mongo.connect();
    this.db = this.mongo.db(process.env.MONGODB_DB ?? "contractflow");
    this.s3 = this.createS3();
    this.logger.log("Document loader ready (Mongo + S3)");
  }

  async onModuleDestroy(): Promise<void> {
    await this.mongo?.close().catch(() => undefined);
  }

  async loadBodies(
    documentIds: string[],
  ): Promise<Array<StoredDocumentMeta & { body: Buffer }>> {
    if (!this.db || !this.s3) {
      throw new Error("Document loader not initialized");
    }
    const bucket = process.env.S3_BUCKET_DOCUMENTS ?? "documents";
    const out: Array<StoredDocumentMeta & { body: Buffer }> = [];
    for (const id of documentIds) {
      const doc = await this.db.collection("documents").findOne({ id });
      if (!doc) {
        throw new Error(`Document not found: ${id}`);
      }
      const meta: StoredDocumentMeta = {
        id: String(doc.id),
        contractId: String(doc.contractId),
        role: doc.role === "proposal" ? "proposal" : "current",
        fileName: String(doc.fileName),
        contentType: String(doc.contentType ?? "application/octet-stream"),
        storageKey: String(doc.storageKey),
        householdId: String(doc.householdId),
      };
      const response = await this.s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: meta.storageKey }),
      );
      const chunks: Buffer[] = [];
      const stream = response.Body;
      if (!stream || typeof stream === "string") {
        throw new Error(`Empty S3 object for ${meta.storageKey}`);
      }
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        chunks.push(Buffer.from(chunk));
      }
      out.push({ ...meta, body: Buffer.concat(chunks) });
    }
    return out;
  }

  private createS3(): S3Client {
    const endpointHost = process.env.S3_ENDPOINT ?? "127.0.0.1";
    const port = process.env.S3_PORT ?? "4566";
    const useSsl = (process.env.S3_USE_SSL ?? "false") === "true";
    const protocol = useSsl ? "https" : "http";
    const endpoint =
      endpointHost.startsWith("http://") || endpointHost.startsWith("https://")
        ? endpointHost
        : `${protocol}://${endpointHost}:${port}`;
    return new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY"),
        secretAccessKey: requireEnv("S3_SECRET_KEY"),
      },
    });
  }
}
