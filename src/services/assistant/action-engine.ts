/**
 * Action Engine — Executes real actions suggested by the AI assistant
 *
 * When the assistant suggests an action (send email, schedule meeting, etc.),
 * and the user confirms, this engine executes it.
 */

import { db } from '../../db/index';
import { assistantActions, approvalRequests } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { enqueueEmail, enqueueReport, EmailJob } from '../../infrastructure/bullmq/queue-registry';
import { notifyUser } from '../../infrastructure/websocket/socket-server';

export type ActionType =
  | 'send_email'
  | 'schedule_meeting'
  | 'create_task'
  | 'approve_request'
  | 'generate_report'
  | 'trigger_workflow'
  | 'send_reminder'
  | 'update_record';

export interface ActionRequest {
  actionId: string;
  conversationId: string;
  tenantId: string;
  userId: string;
  actionType: ActionType;
  parameters: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export class ActionEngine {
  /**
   * Execute a confirmed action
   */
  async execute(request: ActionRequest): Promise<ActionResult> {
    // Record the action attempt
    const [action] = await db
      .insert(assistantActions)
      .values({
        conversationId: request.conversationId,
        tenantId: request.tenantId,
        userId: request.userId,
        actionType: request.actionType,
        status: 'executing',
        parameters: request.parameters,
      })
      .returning();

    try {
      let result: ActionResult;

      switch (request.actionType) {
        case 'send_email':
          result = await this.handleSendEmail(request);
          break;
        case 'send_reminder':
          result = await this.handleSendReminder(request);
          break;
        case 'create_task':
          result = await this.handleCreateTask(request);
          break;
        case 'schedule_meeting':
          result = await this.handleScheduleMeeting(request);
          break;
        case 'approve_request':
          result = await this.handleApproveRequest(request);
          break;
        case 'generate_report':
          result = await this.handleGenerateReport(request);
          break;
        case 'trigger_workflow':
          result = await this.handleTriggerWorkflow(request);
          break;
        case 'update_record':
          result = await this.handleUpdateRecord(request);
          break;
        default:
          result = { success: false, message: `Unknown action type: ${request.actionType}` };
      }

      // Update action status
      await db
        .update(assistantActions)
        .set({
          status: result.success ? 'completed' : 'failed',
          result,
          executedAt: new Date(),
          errorMessage: result.success ? undefined : result.message,
        })
        .where(eq(assistantActions.id, action.id));

      return result;
    } catch (error) {
      await db
        .update(assistantActions)
        .set({ status: 'failed', errorMessage: (error as Error).message })
        .where(eq(assistantActions.id, action.id));

      return { success: false, message: `Action failed: ${(error as Error).message}` };
    }
  }

  private async handleSendEmail(request: ActionRequest): Promise<ActionResult> {
    const { to, subject, body, templateId } = request.parameters as {
      to: string; subject: string; body?: string; templateId?: string;
    };

    if (!to || !subject) {
      return { success: false, message: 'Email requires "to" and "subject" parameters' };
    }

    const emailJob: EmailJob = {
      to,
      subject,
      templateId: templateId || 'generic',
      templateData: { body: body || '', senderName: 'AI Assistant' },
      tenantId: request.tenantId,
    };

    await enqueueEmail(emailJob);
    return { success: true, message: `Email queued for delivery to ${to}` };
  }

  private async handleSendReminder(request: ActionRequest): Promise<ActionResult> {
    const { to, message, dueDate } = request.parameters as {
      to: string; message: string; dueDate?: string;
    };

    const emailJob: EmailJob = {
      to: to || request.userId,
      subject: 'Reminder from Mizan Assistant',
      templateId: 'reminder',
      templateData: { message, dueDate },
      tenantId: request.tenantId,
    };

    await enqueueEmail(emailJob);
    return { success: true, message: `Reminder sent to ${to || 'you'}` };
  }

  private async handleCreateTask(request: ActionRequest): Promise<ActionResult> {
    const { title, description, dueDate, assigneeId } = request.parameters as {
      title: string; description?: string; dueDate?: string; assigneeId?: string;
    };

    if (!title) {
      return { success: false, message: 'Task requires a "title" parameter' };
    }

    // Store task as an assistant action with full metadata
    const [task] = await db.insert(assistantActions).values({
      conversationId: request.conversationId,
      tenantId: request.tenantId,
      userId: assigneeId || request.userId,
      actionType: 'create_task',
      status: 'completed',
      parameters: { title, description, dueDate, assigneeId, createdBy: request.userId },
      result: { taskCreated: true },
      executedAt: new Date(),
    }).returning();

    // Notify assignee if different from creator
    if (assigneeId && assigneeId !== request.userId) {
      notifyUser(assigneeId, 'notification', { type: 'task_assigned', title, from: request.userId });
    }

    return {
      success: true,
      message: `Task "${title}" created${assigneeId ? ' and assigned' : ''}`,
      data: { taskId: task.id, title, description, dueDate, assigneeId },
    };
  }

  private async handleScheduleMeeting(request: ActionRequest): Promise<ActionResult> {
    const { title, attendees, date, duration } = request.parameters as {
      title: string; attendees?: string[]; date?: string; duration?: number;
    };

    // Store meeting as an action record
    const [meeting] = await db.insert(assistantActions).values({
      conversationId: request.conversationId,
      tenantId: request.tenantId,
      userId: request.userId,
      actionType: 'schedule_meeting',
      status: 'completed',
      parameters: { title, attendees, date, duration: duration || 30 },
      result: { meetingScheduled: true },
      executedAt: new Date(),
    }).returning();

    // Notify each attendee
    if (attendees) {
      for (const attendee of attendees) {
        notifyUser(attendee, 'notification', { type: 'meeting_scheduled', title, date, from: request.userId });
      }
    }

    return {
      success: true,
      message: `Meeting "${title}" scheduled${date ? ` for ${date}` : ''}`,
      data: { meetingId: meeting.id, title, attendees, date, duration: duration || 30 },
    };
  }

  private async handleApproveRequest(request: ActionRequest): Promise<ActionResult> {
    const { requestId, comment } = request.parameters as {
      requestId: string; comment?: string;
    };

    if (!requestId) {
      return { success: false, message: 'Approval requires a "requestId" parameter' };
    }

    // Update the approval request in the DB
    const updated = await db.update(approvalRequests).set({
      status: 'approved',
      approvalHistory: [{ step: 1, approverId: request.userId, action: 'approved', comment, timestamp: new Date().toISOString() }],
      updatedAt: new Date(),
    }).where(and(eq(approvalRequests.id, requestId), eq(approvalRequests.tenantId, request.tenantId))).returning();

    if (updated.length === 0) {
      return { success: false, message: `Approval request ${requestId} not found` };
    }

    // Notify the requester
    notifyUser(updated[0].requesterId, 'notification', { type: 'request_approved', requestId, approvedBy: request.userId });

    return {
      success: true,
      message: `Request ${requestId} approved${comment ? ` with comment: "${comment}"` : ''}`,
      data: { requestId, approvedBy: request.userId },
    };
  }

  private async handleGenerateReport(request: ActionRequest): Promise<ActionResult> {
    const { reportType, parameters } = request.parameters as {
      reportType: string; parameters?: Record<string, unknown>;
    };

    // Queue report generation via BullMQ
    await enqueueReport({
      reportType,
      tenantId: request.tenantId,
      userId: request.userId,
      parameters: parameters || {},
      format: 'pdf',
    });

    return {
      success: true,
      message: `Report "${reportType}" generation queued. You'll be notified when it's ready.`,
      data: { reportType, parameters },
    };
  }

  private async handleTriggerWorkflow(request: ActionRequest): Promise<ActionResult> {
    const { workflowId, parameters } = request.parameters as {
      workflowId: string; parameters?: Record<string, unknown>;
    };

    // Create an approval request to track the workflow execution
    const [approvalReq] = await db.insert(approvalRequests).values({
      workflowId,
      tenantId: request.tenantId,
      requesterId: request.userId,
      entityType: 'workflow',
      entityId: workflowId,
      status: 'pending',
      metadata: parameters || {},
    }).returning();

    return {
      success: true,
      message: `Workflow ${workflowId} triggered (request: ${approvalReq.id})`,
      data: { workflowId, requestId: approvalReq.id, triggeredBy: request.userId },
    };
  }

  private async handleUpdateRecord(request: ActionRequest): Promise<ActionResult> {
    const { entityType, entityId, updates } = request.parameters as {
      entityType: string; entityId: string; updates: Record<string, unknown>;
    };

    if (!entityType || !entityId) {
      return { success: false, message: 'Update requires "entityType" and "entityId"' };
    }

    // Perform the actual update based on entity type
    const { employees, developmentPlans, onboardingAssignments } = await import('../../db/schema');
    const { eq: eqOp, and: andOp } = await import('drizzle-orm');

    let rowsUpdated = 0;
    switch (entityType) {
      case 'employee':
        const empResult = await db.update(employees)
          .set({ ...updates, updatedAt: new Date() } as Record<string, unknown>)
          .where(andOp(eqOp(employees.id, entityId), eqOp(employees.tenantId, request.tenantId)));
        rowsUpdated = 1;
        break;
      case 'development_plan':
        await db.update(developmentPlans)
          .set({ ...updates, updatedAt: new Date() } as Record<string, unknown>)
          .where(andOp(eqOp(developmentPlans.id, entityId), eqOp(developmentPlans.tenantId, request.tenantId)));
        rowsUpdated = 1;
        break;
      case 'onboarding_assignment':
        await db.update(onboardingAssignments)
          .set({ ...updates, updatedAt: new Date() } as Record<string, unknown>)
          .where(andOp(eqOp(onboardingAssignments.id, entityId), eqOp(onboardingAssignments.tenantId, request.tenantId)));
        rowsUpdated = 1;
        break;
      default:
        return { success: false, message: `Unsupported entity type: ${entityType}. Supported: employee, development_plan, onboarding_assignment` };
    }

    return {
      success: true,
      message: `Updated ${entityType} record ${entityId}`,
      data: { entityType, entityId, updates },
    };
  }
}
