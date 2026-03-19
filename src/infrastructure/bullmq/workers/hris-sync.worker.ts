/**
 * HRIS Sync Worker — BullMQ worker that processes sync jobs
 *
 * Handles both full and incremental syncs scheduled via the queue registry.
 * Runs as a separate process/pod for scalability.
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ConnectorGateway } from '../../../services/hris/connector-gateway';
import { QUEUE_NAMES, HRISSyncJob } from '../queue-registry';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const gateway = new ConnectorGateway();

const worker = new Worker<HRISSyncJob>(
  QUEUE_NAMES.HRIS_SYNC,
  async (job: Job<HRISSyncJob>) => {
    const { type, connectorId, tenantId } = job.data;

    console.info(`[HRISSyncWorker] Starting ${type} for connector ${connectorId}`);
    await job.updateProgress(10);

    try {
      let result;
      if (type === 'full_sync') {
        result = await gateway.executeFullSync(connectorId, tenantId);
      } else {
        result = await gateway.executeIncrementalSync(connectorId, tenantId);
      }

      await job.updateProgress(100);

      if (!result.success) {
        throw new Error(`Sync failed: ${result.errors.map(e => e.message).join('; ')}`);
      }

      console.info(`[HRISSyncWorker] Completed ${type}: ${result.recordsProcessed} records processed`);
      return result;
    } catch (error) {
      console.error(`[HRISSyncWorker] Failed ${type}:`, (error as Error).message);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process up to 2 sync jobs simultaneously
    limiter: { max: 5, duration: 60_000 }, // Max 5 syncs per minute
  }
);

worker.on('failed', (job, err) => {
  console.error(`[HRISSyncWorker] Job ${job?.id} failed:`, err.message);
});

worker.on('completed', (job) => {
  console.info(`[HRISSyncWorker] Job ${job.id} completed`);
});

export default worker;
