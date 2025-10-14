// server/services/workflow/automated-flow.ts

import { db } from '../../../db/index.js';
import { automatedFlows, flowExecutions } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export interface FlowStep {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  name: string;
  config: any;
  nextSteps: string[];
}

export interface FlowExecution {
  id: string;
  flowId: string;
  tenantId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStep: string;
  context: any;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export class AutomatedFlowService {
  async createFlow(tenantId: string, name: string, description: string, steps: FlowStep[]): Promise<string> {
    try {
      const flowId = randomUUID();
      
      await db.insert(automatedFlows).values({
        id: flowId,
        tenantId,
        name,
        description,
        flowType: 'manual',
        steps: steps as any,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`Created automated flow: ${name} (${flowId})`);
      
      return flowId;
    } catch (error) {
      console.error('Failed to create automated flow:', error);
      throw error;
    }
  }

  async executeFlow(flowId: string, tenantId: string, context: any): Promise<FlowExecution> {
    try {
      console.log(`Executing flow ${flowId} for tenant ${tenantId}`);
      
      const flow = await db.query.automatedFlows.findFirst({
        where: and(
          eq(automatedFlows.id, flowId),
          eq(automatedFlows.tenantId, tenantId)
        )
      });
      
      if (!flow) {
        throw new Error('Flow not found');
      }
      
      // Ensure steps exist
      if (!flow.steps || !Array.isArray(flow.steps) || flow.steps.length === 0) {
        throw new Error('Flow has no steps defined');
      }

      const executionId = randomUUID();
      const execution: FlowExecution = {
        id: executionId,
        flowId,
        tenantId,
        status: 'running',
        currentStep: flow.steps[0]?.id || '',
        context,
        startedAt: new Date()
      };

      await db.insert(flowExecutions).values({
        id: executionId,
        flowId,
        tenantId,
        status: 'running',
        currentStep: execution.currentStep,
        context: context,
        startedAt: new Date()
      });

      await this.executeFlowSteps(flow.steps as unknown as FlowStep[], execution);
      
      return execution;
    } catch (error) {
      console.error('Failed to execute flow:', error);
      throw error;
    }
  }

  private async executeFlowSteps(steps: FlowStep[], execution: FlowExecution): Promise<void> {
    try {
      let currentStepId = execution.currentStep;
      
      while (currentStepId) {
        const step = steps.find(s => s.id === currentStepId);
        if (!step) {
          throw new Error(`Step ${currentStepId} not found`);
        }
        
        console.log(`Executing step: ${step.name} (${step.type})`);
        
        const result = await this.executeStep(step, execution);
        execution.context = { ...execution.context, ...result };
        
        currentStepId = step.nextSteps[0] || '';
        
        if (currentStepId) {
          await db.update(flowExecutions)
            .set({
              currentStep: currentStepId,
              context: execution.context,
              updatedAt: new Date()
            })
            .where(eq(flowExecutions.id, execution.id));
          
          execution.currentStep = currentStepId;
        }
      }
      
      execution.status = 'completed';
      execution.completedAt = new Date();
      
      await db.update(flowExecutions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(flowExecutions.id, execution.id));
      
      console.log(`Flow execution ${execution.id} completed successfully`);
      
    } catch (error) {
      console.error('Failed to execute flow steps:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      execution.status = 'failed';
      execution.error = errorMessage;
      execution.completedAt = new Date();
      
      await db.update(flowExecutions)
        .set({
          status: 'failed',
          error: errorMessage,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(flowExecutions.id, execution.id));
      
      throw error;
    }
  }

  private async executeStep(step: FlowStep, execution: FlowExecution): Promise<any> {
    switch (step.type) {
      case 'trigger':
        return await this.executeTriggerStep(step, execution);
      case 'action':
        return await this.executeActionStep(step, execution);
      case 'condition':
        return await this.executeConditionStep(step, execution);
      case 'delay':
        return await this.executeDelayStep(step, execution);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeTriggerStep(step: FlowStep, execution: FlowExecution): Promise<any> {
    console.log('Executing trigger step');
    return { triggerExecuted: true };
  }

  private async executeActionStep(step: FlowStep, execution: FlowExecution): Promise<any> {
    console.log('Executing action step');
    return { actionExecuted: true };
  }

  private async executeConditionStep(step: FlowStep, execution: FlowExecution): Promise<any> {
    console.log('Executing condition step');
    return { conditionMet: true };
  }

  private async executeDelayStep(step: FlowStep, execution: FlowExecution): Promise<any> {
    console.log('Executing delay step');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { delayCompleted: true };
  }
}

export const automatedFlowService = new AutomatedFlowService();

export async function createFlow(tenantId: string, name: string, description: string, steps: FlowStep[]): Promise<string> {
  return automatedFlowService.createFlow(tenantId, name, description, steps);
}

export async function executeFlow(flowId: string, tenantId: string, context: any): Promise<FlowExecution> {
  return automatedFlowService.executeFlow(flowId, tenantId, context);
}