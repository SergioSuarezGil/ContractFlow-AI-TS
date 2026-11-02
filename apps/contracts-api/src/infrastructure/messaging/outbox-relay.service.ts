import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { EventEnvelope } from "../../application/messaging/event-envelope";
import type { EventPublisher } from "../../application/ports/event-publisher";
import type { JobRepository } from "../../application/ports/job.repository";
import { EVENT_PUBLISHER, JOB_REPOSITORY } from "../../application/ports/tokens";

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly intervalMs = Number(process.env.OUTBOX_POLL_MS ?? 500);

  constructor(
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.drain();
    }, this.intervalMs);
    this.logger.log(`Outbox relay polling every ${this.intervalMs}ms`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.drain();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.jobs.findPendingOutbox(20);
      for (const job of pending) {
        const snap = job.snapshot();
        const outbox = snap.outbox;
        if (!outbox || outbox.publishedAt) continue;
        try {
          await this.publisher.publish(
            outbox.routingKey,
            outbox.envelope as unknown as EventEnvelope,
          );
          job.markOutboxPublished();
          await this.jobs.save(job);
        } catch (error) {
          this.logger.warn(
            `Outbox publish failed for job ${snap.id}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Outbox drain error: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
