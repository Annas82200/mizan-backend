import { Router } from 'express';
import { bonusAgent, BonusTriggerSchema } from '../services/agents/bonus/bonus-agent';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/bonus/trigger
 * Receives a trigger to run bonus analysis for an employee.
 */
router.post('/trigger', authenticate, authorize(['system', 'superadmin', 'clientAdmin']), async (req, res) => {
    try {
        const validatedInput = BonusTriggerSchema.parse(req.body);

        const result = await bonusAgent.handleBonusTrigger(validatedInput);

        res.json({
            success: true,
            message: 'Bonus trigger processed successfully.',
            data: result,
        });

    } catch (error: unknown) {
        logger.error('Bonus trigger error:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Invalid input data', details: error.errors });
        }

        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(500).json({ success: false, error: 'Failed to process bonus trigger' });
    }
});

export default router;
