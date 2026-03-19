// @ts-nocheck
/**
 * BullMQ Queue Registry — Defines all job queues for async processing
 *
 * Queues:
 * - ai-processing: AI analysis jobs (culture, skills, structure analysis)
 * - hris-sync: HRIS connector sync jobs (full and incremental)
 * - email: Transactional email sending
 * - report-generation: PDF/CSV report generation
 * - course-generation: AI-powered LXP course creation
 * - leaderboard: Engagement leaderboard computation
 */

import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// BullMQ requires its own dedicated Redis connection (not shared with app cache).
// Using ioredis directly ensures compatibility with BullMQ's expected connection type.
function getBullMQConnection(): IORedis {
  return new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required by BullMQ
  });
}

// Queue definitions
export const QUEUE_NAMES = {
  AI_PROCESSING: 'ai-processing',
  HRIS_SYNC: 'hris-sync',
  EMAIL: 'email',
  REPORT_GENERATION: 'report-generation',
  COURSE_GENERATION: 'course-generation',
  LEADERBOARD: 'leaderboard',
} as const;

type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();
const queueEvents = new Map<QueueName, QueueEvents>();

/**
 * Get or create a queue by name
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const redis = getBullMQConnection();
    const queue = new Queue(name, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
    queues.set(name, queue);
  }
  return queues.get(name)!;
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(name: QueueName): QueueEvents {
  if (!queueEvents.has(name)) {
    const redis = getBullMQConnection();
    const events = new QueueEvents(name, { connection: redis });
    queueEvents.set(name, events);
  }
  return queueEvents.get(name)!;
}

// === Job Type Definitions ===

export interface AIProcessingJob {
  type: 'culture_analysis' | 'skills_analysis' | 'structure_analysis' | 'performance_calibration' | 'development_plan';
  tenantId: string;
  userId: string;
  payload: Record<string, unknown>;
}

export interface HRISSyncJob {
  type: 'full_sync' | 'incremental_sync';
  connectorId: string;
  tenantId: string;
}

export interface EmailJob {
  to: string;
  subject: string;
  templateId: string;
  templateData: Record<string, unknown>;
  tenantId: string;
}

export interface ReportGenerationJob {
  reportType: string;
  tenantId: string;
  userId: string;
  parameters: Record<string, unknown>;
  format: 'pdf' | 'csv' | 'json';
}

export interface CourseGenerationJob {
  tenantId: string;
  userId: string;
  skillGaps: Array<{ skill: string; currentLevel: number; targetLevel: number }>;
  learningStyle: string;
  difficulty: string;
}

export interface LeaderboardJob {
  tenantId: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

// === Helper functions to enqueue jobs ===

export async function enqueueAIJob(job: AIProcessingJob, priority?: number) {
  return getQueue(QUEUE_NAMES.AI_PROCESSING).add(job.type, job, { priority });
}

export async function enqueueHRISSync(job: HRISSyncJob) {
  return getQueue(QUEUE_NAMES.HRIS_SYNC).add(job.type, job, {
    jobId: `${job.connectorId}-${job.type}`, // Prevent duplicate syncs
  });
}

export async function enqueueEmail(job: EmailJob) {
  return getQueue(QUEUE_NAMES.EMAIL).add('send', job);
}

export async function enqueueReport(job: ReportGenerationJob) {
  return getQueue(QUEUE_NAMES.REPORT_GENERATION).add(job.reportType, job);
}

export async function enqueueCourseGeneration(job: CourseGenerationJob) {
  return getQueue(QUEUE_NAMES.COURSE_GENERATION).add('generate', job, {
    attempts: 2, // Course generation is expensive, limit retries
  });
}

export async function enqueueLeaderboardUpdate(job: LeaderboardJob) {
  return getQueue(QUEUE_NAMES.LEADERBOARD).add(job.period, job);
}

/**
 * Graceful shutdown — close all queues
 */
export async function closeAllQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  for (const events of queueEvents.values()) {
    await events.close();
  }
  queues.clear();
  queueEvents.clear();
}
