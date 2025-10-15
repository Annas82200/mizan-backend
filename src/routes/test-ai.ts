import { Router, Request, Response } from 'express';
import { CultureAgentV2 as CultureAgent } from '../services/agents/culture/culture-agent';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Apply authentication and restrict to superadmin only
router.use(authenticate);
router.use(requireRole('superadmin'));

router.get('/test-ai', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    console.log(`🧪 TEST - Starting AI test for superadmin (tenant: ${tenantId}, user: ${userId})...`);

    const agent = new CultureAgent('culture', {
      knowledge: {
        providers: ['anthropic'],
        model: 'claude-3-opus-20240229',
        temperature: 0.7,
        maxTokens: 4000
      },
      data: {
        providers: ['anthropic'],
        model: 'claude-3-opus-20240229',
        temperature: 0.3,
        maxTokens: 4000
      },
      reasoning: {
        providers: ['anthropic'],
        model: 'claude-3-opus-20240229',
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    });

    // Test simple AI call
    const response = await (agent as Record<string, any>).reasoningAI.call({
      engine: 'reasoning',
      prompt: 'Return this exact JSON and nothing else: {"test": "success", "number": 42}',
      temperature: 0.3,
      maxTokens: 100
    });
    
    console.log('🧪 TEST - Response:', JSON.stringify(response, null, 2));
    
    return res.json({
      success: true,
      response: response,
      narrative: response?.narrative,
      narrativeType: typeof response?.narrative
    });
  } catch (error) {
    console.error('🧪 TEST - Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return res.status(500).json({
      success: false,
      error: errorMessage,
      stack: errorStack
    });
  }
});

export default router;
