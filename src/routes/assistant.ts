/**
 * AI Assistant Routes — REST endpoints for the unified chatbot
 */

import { Router, Request, Response } from 'express';
import { AssistantController } from '../../src/services/assistant/assistant-controller';
import { ConversationManager } from '../../src/services/assistant/conversation-manager';
import { validate } from '../../src/middleware/validate';
import { assistantMessageSchema, executeActionSchema } from '../../src/middleware/schemas';

const router = Router();
const controller = new AssistantController();
const conversationManager = new ConversationManager();

interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
  userRole: string;
}

// Send a message to the AI assistant
router.post('/message', validate(assistantMessageSchema), async (req: Request, res: Response) => {
  const { userId, tenantId, userRole } = req as AuthRequest;
  const { message, conversationId } = req.body;

  try {
    const response = await controller.processMessage({
      message,
      conversationId,
      tenantId,
      userId,
      userRole,
    });

    return res.json(response);
  } catch (error) {
    console.error('[Assistant] Error processing message:', error);
    return res.status(500).json({ error: 'Failed to process message' });
  }
});

// List conversations
router.get('/conversations', async (req: Request, res: Response) => {
  const { userId, tenantId } = req as AuthRequest;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const conversations = await conversationManager.listConversations(tenantId, userId, limit);
    return res.json({ conversations });
  } catch (error) {
    console.error('[Assistant] Error listing conversations:', error);
    return res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// Get conversation history
router.get('/conversations/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const conversationId = req.params.id;

  try {
    const context = await conversationManager.getContext(conversationId, tenantId);
    return res.json({ messages: context });
  } catch (error) {
    console.error('[Assistant] Error getting conversation:', error);
    return res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Execute a confirmed action
router.post('/actions/:actionId/execute', validate(executeActionSchema), async (req: Request, res: Response) => {
  const { userId, tenantId } = req as AuthRequest;
  const { conversationId, actionType, parameters } = req.body;

  try {
    const result = await controller.executeAction({
      actionId: req.params.actionId,
      conversationId,
      tenantId,
      userId,
      actionType,
      parameters: parameters || {},
    });

    return res.json(result);
  } catch (error) {
    console.error('[Assistant] Error executing action:', error);
    return res.status(500).json({ error: 'Failed to execute action' });
  }
});

export default router;
