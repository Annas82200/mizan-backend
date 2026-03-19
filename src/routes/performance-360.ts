/**
 * Performance 360 Routes — Multi-source evaluation and two-way feedback
 */

import { Router, Request, Response } from 'express';
import { validate } from '../../src/middleware/validate';
import { generate360Schema } from '../../src/middleware/schemas';
import { Evaluation360Service } from '../../src/services/modules/performance/evaluation-360';

const router = Router();
const evaluation360 = new Evaluation360Service();

interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
}

// Generate 360 evaluation summary from multiple feedback sources
router.post('/360-summary', validate(generate360Schema), async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { employeeId, sources } = req.body;

  if (!employeeId || !sources || !Array.isArray(sources)) {
    return res.status(400).json({ error: 'employeeId and sources array are required' });
  }

  try {
    const summary = await evaluation360.generate360Summary({
      tenantId,
      employeeId,
      sources,
    });
    return res.json({ summary });
  } catch (error) {
    console.error('[Performance360] Summary generation error:', error);
    return res.status(500).json({ error: 'Failed to generate 360 summary' });
  }
});

// Analyze two-way evaluation (employee ↔ manager)
router.post('/two-way-analysis', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { evaluation } = req.body;

  if (!evaluation) {
    return res.status(400).json({ error: 'evaluation data is required' });
  }

  try {
    const analysis = await evaluation360.analyzeTwoWayEvaluation({ tenantId, evaluation });
    return res.json({ analysis });
  } catch (error) {
    console.error('[Performance360] Two-way analysis error:', error);
    return res.status(500).json({ error: 'Failed to analyze two-way evaluation' });
  }
});

export default router;
