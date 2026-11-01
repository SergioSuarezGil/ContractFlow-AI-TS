import { Global, Logger, Module, OnModuleDestroy } from "@nestjs/common";
import { MongoClient, type Db } from "mongodb";

export const MONGO_DB = Symbol("MONGO_DB");

const logger = new Logger("MongoModule");

async function ensureIndexes(db: Db): Promise<void> {
  const ops = [
    () => db.collection("contracts").createIndex({ householdId: 1, ownerId: 1 }),
    () => db.collection("documents").createIndex({ contractId: 1 }),
  ];

  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      for (const op of ops) {
        await op();
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        /not primary|NotWritablePrimary|InterruptedDueToReplStateChange|Unavailable/i.test(
          message,
        );
      if (!retryable || attempt === 15) {
        throw error;
      }
      logger.warn(
        `Mongo not ready for indexes (attempt ${attempt}/15): ${message}. Retrying…`,
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MONGO_DB,
      useFactory: async (): Promise<Db> => {
        const uri =
          process.env.MONGODB_URI ??
          "mongodb://127.0.0.1:27017/contractflow?directConnection=true";
        const dbName = process.env.MONGODB_DB ?? "contractflow";
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db(dbName);
        await ensureIndexes(db);
        (db as Db & { __client?: MongoClient }).__client = client;
        return db;
      },
    },
  ],
  exports: [MONGO_DB],
})
export class MongoModule implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    // Client lifecycle is tied to process; explicit close handled in factory holder if needed.
  }
}
