import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import type {
  ObjectStoragePort,
  PutObjectInput,
} from "../../../application/ports/object-storage";
import type { Readable } from "node:stream";
import { envOr, requiredEnv } from "../../config/required-env";

@Injectable()
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;

  constructor() {
    const endpointHost = envOr(
      "S3_ENDPOINT",
      process.env.MINIO_ENDPOINT?.trim() || "127.0.0.1",
    );
    const port = envOr("S3_PORT", process.env.MINIO_PORT?.trim() || "4566");
    const useSsl =
      envOr("S3_USE_SSL", process.env.MINIO_USE_SSL?.trim() || "false") === "true";
    const protocol = useSsl ? "https" : "http";
    const endpoint =
      endpointHost.startsWith("http://") || endpointHost.startsWith("https://")
        ? endpointHost
        : `${protocol}://${endpointHost}:${port}`;

    const accessKeyId =
      process.env.S3_ACCESS_KEY?.trim() ||
      process.env.MINIO_ACCESS_KEY?.trim() ||
      "";
    const secretAccessKey =
      process.env.S3_SECRET_KEY?.trim() ||
      process.env.MINIO_SECRET_KEY?.trim() ||
      "";
    if (!accessKeyId || !secretAccessKey) {
      requiredEnv("S3_ACCESS_KEY");
      requiredEnv("S3_SECRET_KEY");
    }

    this.client = new S3Client({
      region: envOr("S3_REGION", "us-east-1"),
      endpoint,
      forcePathStyle: envOr("S3_FORCE_PATH_STYLE", "true") === "true",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const body = response.Body;
    if (!body) {
      return Buffer.alloc(0);
    }
    return this.streamToBuffer(body as Readable);
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
