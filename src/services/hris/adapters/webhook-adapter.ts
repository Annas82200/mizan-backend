/**
 * Webhook Adapter — Receives real-time events from HRIS systems
 *
 * Unlike REST/SOAP adapters that pull data, this adapter receives pushes.
 * HRIS systems send HTTP POST events when employees are created/updated/terminated.
 * Events are queued for processing, ensuring no data loss under load.
 */

import crypto from 'crypto';
import {
  BaseAdapter,
  AdapterConfig,
  HRISEmployee,
  HRISDepartment,
  HRISPosition,
  HRISCompensation,
  ConnectionTestResult,
} from './adapter-interface';
import { db } from '../../../db/index';
import { webhookEvents } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export interface WebhookAdapterConfig extends AdapterConfig {
  /** Secret used to validate incoming webhook signatures (HMAC) */
  webhookSecret: string;
  /** Map of HRIS event types to Mizan entity types */
  eventMapping: Record<string, { entityType: string; action: 'create' | 'update' | 'delete' }>;
  /** Header name containing the HMAC signature */
  signatureHeader?: string;
}

export class WebhookAdapter extends BaseAdapter {
  readonly adapterType = 'webhook';
  private webhookConfig: WebhookAdapterConfig;

  constructor(config: WebhookAdapterConfig) {
    super(config);
    this.webhookConfig = config;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    // Webhook connections are validated by checking that we have a valid secret
    // and that the event mapping is configured
    const start = Date.now();
    const hasSecret = !!this.webhookConfig.webhookSecret;
    const hasMapping = Object.keys(this.webhookConfig.eventMapping).length > 0;

    return {
      success: hasSecret && hasMapping,
      message: hasSecret && hasMapping
        ? 'Webhook configuration valid. Awaiting incoming events.'
        : `Missing: ${!hasSecret ? 'webhook secret' : ''} ${!hasMapping ? 'event mapping' : ''}`.trim(),
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Validate an incoming webhook signature using HMAC-SHA256
   */
  validateSignature(payload: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.webhookConfig.webhookSecret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch (err) {
      return false;
    }
  }

  /**
   * Process an incoming webhook event. Stores it for async processing.
   */
  async processIncomingEvent(
    connectorId: string,
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<{ accepted: boolean; eventId: string }> {
    const mapping = this.webhookConfig.eventMapping[eventType];
    if (!mapping) {
      return { accepted: false, eventId: '' };
    }

    const [event] = await db
      .insert(webhookEvents)
      .values({
        connectorId,
        tenantId,
        eventType,
        payload,
        processed: false,
      })
      .returning();

    return { accepted: true, eventId: event.id };
  }

  /**
   * Fetch unprocessed webhook events for batch processing
   */
  async getUnprocessedEvents(connectorId: string, tenantId: string, limit: number = 100) {
    return db
      .select()
      .from(webhookEvents)
      .where(and(
        eq(webhookEvents.connectorId, connectorId),
        eq(webhookEvents.tenantId, tenantId),
        eq(webhookEvents.processed, false)
      ))
      .limit(limit);
  }

  /**
   * Mark events as processed after successful handling
   */
  async markProcessed(eventIds: string[]): Promise<void> {
    for (const id of eventIds) {
      await db
        .update(webhookEvents)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(webhookEvents.id, id));
    }
  }

  // Webhook adapters don't "fetch" — they receive. These return empty arrays
  // because data comes via processIncomingEvent, not polling.
  async fetchEmployees(): Promise<HRISEmployee[]> { return []; }
  async fetchDepartments(): Promise<HRISDepartment[]> { return []; }
  async fetchPositions(): Promise<HRISPosition[]> { return []; }
  async fetchCompensation(): Promise<HRISCompensation[]> { return []; }
}
