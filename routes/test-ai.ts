import { Router } from 'express';
import { CultureAgent } from '../services/agents/culture-agent.js';

const router = Router();

router.get('/test-ai', async (req, res) => {
  try {
    console.log('🧪 TEST - Starting AI test...');
    
    const agent = new CultureAgent();
    
    // Test simple AI call
    const response = await (agent as any).reasoningAI.call({
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
  } catch (error: any) {
    console.error('🧪 TEST - Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
