// server/services/queue.ts
// BullMQ v5 implementation with separate Queue (producer) and Worker (consumer) instances

import { logger } from './logger';
import { Queue, Worker, Job } from 'bullmq';
import { db } from '../../db/index';
import { analyses, triggerExecutions } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// Redis connection configuration
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Create queues (producers)
export const queues = {
  analysis: new Queue('analysis', { connection }),
  hiring: new Queue('hiring', { connection }),
  socialMedia: new Queue('social-media', { connection }),
  email: new Queue('email', { connection }),
  notifications: new Queue('notifications', { connection }),
};

// Analysis Worker
const analysisWorker = new Worker('analysis', async (job: Job) => {
  const { tenantId, userId, input } = job.data;

  // Update job progress
  await job.updateProgress(10);

  // Run Architect AI
  const { runArchitectAI } = await import('./orchestrator/architect-ai.js');
  const architect = await runArchitectAI({ tenantId, ...input });
  await job.updateProgress(50);

  // Build unified results
  const { buildUnifiedResults } = await import('./results/unified-results.js');
  const snapshot = await buildUnifiedResults(architect);
  await job.updateProgress(70);

  // Run triggers
  const { runTriggers } = await import('./results/trigger-engine.js');
  const snapshotWithTenant = { ...snapshot, tenantId };
  const triggers = await runTriggers(snapshotWithTenant);
  await job.updateProgress(80);

  // Save results to database
  const createdAt = new Date();
  const overallHealthScore = snapshot.overall_health_score;

  // Save analysis
  await db.insert(analyses).values({
    id: randomUUID(),
    tenantId,
    type: 'full-analysis',
    status: 'completed',
    results: { architect, snapshot, triggers },
    metadata: { userId, overallHealthScore },
    createdAt,
    updatedAt: createdAt
  });

  await job.updateProgress(100);

  return { success: true, snapshot, triggers };
}, { connection });

// Hiring Worker
const hiringWorker = new Worker('hiring', async (job: Job) => {
  const { candidate, jobPosting, tenantId } = job.data;

  await job.updateProgress(20);

  const { assessCultureFit } = await import('./modules/hiring/core/culture-fit-assessor.js');

  await job.updateProgress(50);

  const assessment = await assessCultureFit({
    candidateId: candidate.id || 'unknown',
    tenantId,
    jobId: jobPosting.id || 'unknown',
    assessmentResponses: candidate.assessmentResponses || []
  });

  await job.updateProgress(100);

  return { success: true, assessment };
}, { connection });

// Social Media Worker
const socialMediaWorker = new Worker('social-media', async (job: Job) => {
  const { platform, content, scheduledTime, tenantId } = job.data;

  await job.updateProgress(10);

  const { schedulePost } = await import('./social-media/scheduler.js');

  await job.updateProgress(30);

  const postId = await schedulePost(
    tenantId,
    platform,
    content,
    scheduledTime || new Date()
  );

  await job.updateProgress(100);

  return { success: true, postId };
}, { connection });

// Email Worker
const emailWorker = new Worker('email', async (job: Job) => {
  const { to, template, data, from } = job.data;

  await job.updateProgress(10);

  const { sendEmail } = await import('./email.js');
  await sendEmail({ to, template, data, from });

  await job.updateProgress(100);

  return { success: true };
}, { connection });

// Notifications Worker
const notificationsWorker = new Worker('notifications', async (job: Job) => {
  const { userId, type, title, message, data } = job.data;

  await job.updateProgress(10);

  // Store notification in database or send via websocket
  // Implementation depends on notification service setup

  await job.updateProgress(100);

  return { success: true };
}, { connection });

// Error handlers for all workers
const workers = [analysisWorker, hiringWorker, socialMediaWorker, emailWorker, notificationsWorker];

workers.forEach(worker => {
  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });
});

interface AnalysisJobData {
  tenantId: string;
  userId: string;
  input: Record<string, unknown>;
}

interface HiringJobData {
  candidate: {
    id?: string;
    assessmentResponses?: Array<{ questionId: string; question: string; response: string }>;
  };
  jobPosting: {
    id?: string;
  };
  tenantId: string;
}

interface SocialMediaJobData {
  platform: string;
  content: string;
  scheduledTime?: Date;
  tenantId: string;
}

interface EmailJobData {
  to: string;
  template: string;
  data: Record<string, unknown>;
  from?: string;
}

interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Queue management functions
export async function addAnalysisJob(data: AnalysisJobData) {
  return queues.analysis.add('full-analysis', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function addHiringJob(data: HiringJobData) {
  return queues.hiring.add('culture-fit-assessment', data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  });
}

export async function addSocialMediaJob(data: SocialMediaJobData) {
  return queues.socialMedia.add('publish-post', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

export async function addEmailJob(data: EmailJobData) {
  return queues.email.add('send-email', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function addNotificationJob(data: NotificationJobData) {
  return queues.notifications.add('send-notification', data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
  });
}

// Graceful shutdown
export async function shutdownQueues() {
  logger.info('Shutting down queues and workers...');

  await Promise.all([
    // Close workers
    analysisWorker.close(),
    hiringWorker.close(),
    socialMediaWorker.close(),
    emailWorker.close(),
    notificationsWorker.close(),
    // Close queues
    queues.analysis.close(),
    queues.hiring.close(),
    queues.socialMedia.close(),
    queues.email.close(),
    queues.notifications.close(),
  ]);

  logger.info('All queues and workers shut down');
}
