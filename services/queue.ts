// server/services/queue.ts

import { Queue, Worker, Job } from 'bullmq';
import { db } from '../db/index.js';
import { orgSnapshots, triggeredActions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// Redis connection configuration
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Create queues
export const queues = {
  analysis: new Queue('analysis', { connection }),
  hiring: new Queue('hiring', { connection }),
  socialMedia: new Queue('social-media', { connection }),
  hris: new Queue('hris', { connection }),
  email: new Queue('email', { connection }),
  notifications: new Queue('notifications', { connection }),
};

// Analysis Queue Processors
queues.analysis.process("full-analysis", async (job: Job) => {
  const { tenantId, userId, input } = job.data;
  
  try {
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
    const triggers = await runTriggers(snapshot);
    await job.updateProgress(80);
    
    // Save results to database
    const createdAt = new Date();
    const overallHealthScore = snapshot.overall_health_score;
    
    // Save snapshot
    await db.insert(orgSnapshots).values({
      id: crypto.randomUUID(),
      tenantId,
      overallHealthScore,
      trend: "steady", // Calculate from historical data
      highlights: triggers.slice(0, 3).map((t: any) => t.reason),
      fullReport: { architect, snapshot, triggers },
      createdAt
    });
    
    // Save individual assessments
    const assessmentData = [
      { type: 'structure', score: architect.structure?.healthScore || 0 },
      { type: 'culture', score: architect.culture?.alignmentScore || 0 },
      { type: 'skills', score: architect.skills?.coverageScore || 0 },
    ];
    
    await job.updateProgress(100);
    
    return { success: true, snapshot, triggers };
    
  } catch (error) {
    console.error('Analysis job failed:', error);
    throw error;
  }
});

// Hiring Queue Processors
queues.hiring.process("culture-fit-assessment", async (job: Job) => {
  const { candidateId, jobId, tenantId } = job.data;
  
  try {
    await job.updateProgress(20);
    
    // Get candidate and job data
    const candidate = await db.query.candidates?.findFirst({
      where: eq('id', candidateId)
    });
    
    const job = await db.query.jobs?.findFirst({
      where: eq('id', jobId)
    });
    
    if (!candidate || !job) {
      throw new Error('Candidate or job not found');
    }
    
    await job.updateProgress(50);
    
    // Run culture fit assessment
    const { assessCultureFit } = await import('./hiring/culture-fit-assessor.js');
    const assessment = await assessCultureFit(candidate, job, tenantId);
    
    await job.updateProgress(80);
    
    // Save assessment results
    // Implementation would save to database
    
    await job.updateProgress(100);
    
    return { success: true, assessment };
    
  } catch (error) {
    console.error('Culture fit assessment failed:', error);
    throw error;
  }
});

// Social Media Queue Processors
queues.socialMedia.process("publish-post", async (job: Job) => {
  const { postId, platform, content, mediaUrl } = job.data;
  
  try {
    await job.updateProgress(10);
    
    // Get platform-specific publisher
    const { publishPost } = await import(`./social-media/platforms/${platform}.js`);
    
    await job.updateProgress(30);
    
    // Publish the post
    const result = await publishPost(content, mediaUrl);
    
    await job.updateProgress(80);
    
    // Update post status in database
    await db.update('social_media_posts')
      .set({
        status: 'published',
        publishedAt: new Date(),
        platformPostId: result.id
      })
      .where(eq('id', postId));
    
    await job.updateProgress(100);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('Social media publish failed:', error);
    
    // Update post status to failed
    await db.update('social_media_posts')
      .set({
        status: 'failed',
        error: error.message
      })
      .where(eq('id', postId));
    
    throw error;
  }
});

// HRIS Queue Processors
queues.hris.process("sync-employees", async (job: Job) => {
  const { integrationId, tenantId } = job.data;
  
  try {
    await job.updateProgress(10);
    
    // Get integration config
    const integration = await db.query.hrisIntegrations.findFirst({
      where: eq('id', integrationId)
    });
    
    if (!integration) {
      throw new Error('HRIS integration not found');
    }
    
    await job.updateProgress(30);
    
    // Sync employees from HRIS
    const { syncEmployees } = await import('./hris/index.js');
    const result = await syncEmployees(integration, tenantId);
    
    await job.updateProgress(80);
    
    // Log sync results
    await db.insert('hris_sync_logs').values({
      id: crypto.randomUUID(),
      integrationId,
      tenantId,
      status: result.success ? 'success' : 'failed',
      recordsProcessed: result.recordsProcessed || 0,
      errors: result.errors || [],
      startedAt: new Date(),
      completedAt: new Date()
    });
    
    await job.updateProgress(100);
    
    return result;
    
  } catch (error) {
    console.error('HRIS sync failed:', error);
    throw error;
  }
});

// Email Queue Processors
queues.email.process("send-email", async (job: Job) => {
  const { to, template, data, from } = job.data;
  
  try {
    await job.updateProgress(10);
    
    const { sendEmail } = await import('./email.js');
    await sendEmail({ to, template, data, from });
    
    await job.updateProgress(100);
    
    return { success: true };
    
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
});

// Notifications Queue Processors
queues.notifications.process("send-notification", async (job: Job) => {
  const { userId, type, title, message, data } = job.data;
  
  try {
    await job.updateProgress(10);
    
    // Send real-time notification via Socket.IO
    const { io } = await import('../index.js');
    io.to(`user-${userId}`).emit('notification', {
      type,
      title,
      message,
      data,
      timestamp: new Date()
    });
    
    await job.updateProgress(100);
    
    return { success: true };
    
  } catch (error) {
    console.error('Notification sending failed:', error);
    throw error;
  }
});

// Queue management functions
export async function addAnalysisJob(data: any) {
  return queues.analysis.add('full-analysis', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function addHiringJob(data: any) {
  return queues.hiring.add('culture-fit-assessment', data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  });
}

export async function addSocialMediaJob(data: any) {
  return queues.socialMedia.add('publish-post', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

export async function addHRISJob(data: any) {
  return queues.hris.add('sync-employees', data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 10000,
    },
  });
}

export async function addEmailJob(data: any) {
  return queues.email.add('send-email', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

export async function addNotificationJob(data: any) {
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
  console.log('Shutting down queues...');
  
  await Promise.all([
    queues.analysis.close(),
    queues.hiring.close(),
    queues.socialMedia.close(),
    queues.hris.close(),
    queues.email.close(),
    queues.notifications.close(),
  ]);
  
  console.log('All queues shut down');
}