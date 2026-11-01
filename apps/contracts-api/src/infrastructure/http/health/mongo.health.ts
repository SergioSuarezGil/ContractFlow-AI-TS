import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "mongodb";
import { MONGO_DB } from "../../persistence/mongodb/mongo.module";

@Injectable()
export class MongoHealthIndicator {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  async ping(): Promise<void> {
    await this.db.command({ ping: 1 });
  }
}
