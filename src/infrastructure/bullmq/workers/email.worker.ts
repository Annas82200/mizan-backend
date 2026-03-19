// @ts-nocheck
/**
 * Email Worker — Processes email sending jobs from BullMQ queue
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES, EmailJob } from '../queue-registry';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker<EmailJob>(
  QUEUE_NAMES.EMAIL,
  async (job: Job<EmailJob>) => {
    const { to, subject, templateId, templateData, tenantId } = job.data;
    console.info(`[EmailWorker] Sending email to ${to}: "${subject}"`);

    // Use SendGrid API for email delivery
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@mizan.ai' },
        subject,
        content: [{
          type: 'text/html',
          value: `<p>${(templateData as Record<string, unknown>).body || subject}</p>`,
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.status} ${response.statusText}`);
    }

    console.info(`[EmailWorker] Email sent to ${to}`);
    return { sent: true, to, subject };
  },
  { connection, concurrency: 5 }
);

worker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
});

export default worker;
