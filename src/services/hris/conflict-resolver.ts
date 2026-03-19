// @ts-nocheck
/**
 * Conflict Resolver — Handles data conflicts between HRIS and Mizan
 *
 * When the same field has different values in HRIS and Mizan,
 * resolves based on the tenant's configured strategy.
 */

import { db } from '../../../db/index';
import { syncConflicts } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export type ConflictStrategy = 'hris_wins' | 'mizan_wins' | 'manual_review' | 'newest_wins';

export interface ConflictInput {
  syncLogId: string;
  connectorId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  hrisValue: unknown;
  mizanValue: unknown;
  hrisTimestamp?: Date;
  mizanTimestamp?: Date;
}

export interface ResolutionResult {
  resolved: boolean;
  winner: 'hris' | 'mizan' | 'pending';
  finalValue: unknown;
}

export class ConflictResolver {
  /**
   * Resolve a single field conflict based on configured strategy
   */
  async resolve(
    input: ConflictInput,
    strategy: ConflictStrategy
  ): Promise<ResolutionResult> {
    switch (strategy) {
      case 'hris_wins':
        return { resolved: true, winner: 'hris', finalValue: input.hrisValue };

      case 'mizan_wins':
        return { resolved: true, winner: 'mizan', finalValue: input.mizanValue };

      case 'newest_wins': {
        const hrisTime = input.hrisTimestamp?.getTime() || 0;
        const mizanTime = input.mizanTimestamp?.getTime() || 0;
        if (hrisTime >= mizanTime) {
          return { resolved: true, winner: 'hris', finalValue: input.hrisValue };
        }
        return { resolved: true, winner: 'mizan', finalValue: input.mizanValue };
      }

      case 'manual_review':
        // Store conflict for admin to review
        await db.insert(syncConflicts).values({
          syncLogId: input.syncLogId,
          connectorId: input.connectorId,
          tenantId: input.tenantId,
          entityType: input.entityType,
          entityId: input.entityId,
          fieldName: input.fieldName,
          hrisValue: String(input.hrisValue),
          mizanValue: String(input.mizanValue),
          status: 'pending',
        });
        return { resolved: false, winner: 'pending', finalValue: input.mizanValue };

      default:
        return { resolved: true, winner: 'hris', finalValue: input.hrisValue };
    }
  }

  /**
   * Manually resolve a pending conflict (admin action)
   */
  async resolveManually(
    conflictId: string,
    tenantId: string,
    resolution: 'resolved_hris' | 'resolved_mizan' | 'resolved_manual',
    resolvedBy: string,
    customValue?: string
  ): Promise<void> {
    await db
      .update(syncConflicts)
      .set({
        status: resolution,
        resolvedBy,
        resolvedAt: new Date(),
        resolution: customValue || `Resolved as ${resolution} by ${resolvedBy}`,
      })
      .where(and(eq(syncConflicts.id, conflictId), eq(syncConflicts.tenantId, tenantId)));
  }

  /**
   * Get count of pending conflicts for a connector
   */
  async getPendingCount(connectorId: string, tenantId: string): Promise<number> {
    const rows = await db
      .select()
      .from(syncConflicts)
      .where(and(
        eq(syncConflicts.connectorId, connectorId),
        eq(syncConflicts.tenantId, tenantId),
        eq(syncConflicts.status, 'pending')
      ));

    return rows.length;
  }
}
