export interface PutObjectInput {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}

export interface ObjectStoragePort {
  putObject(input: PutObjectInput): Promise<void>;
  getObject(bucket: string, key: string): Promise<Buffer>;
  deleteObject(bucket: string, key: string): Promise<void>;
}
