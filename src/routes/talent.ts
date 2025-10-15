import { Router } from 'express';
import { talentAgent, TalentTriggerSchema } from '../services/agents/talent/talent-agent.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/talent/trigger
 * Receives a trigger to run talent analysis for an employee.
 * This is an internal-facing API, likely called by other services (e.g., Performance, Skills)
 */
router.post('/trigger', authenticate, authorize(['system', 'superadmin', 'clientAdmin']), async (req, res) => {
    try {
        const validatedInput = TalentTriggerSchema.parse(req.body);

        const result = await talentAgent.handleTalentTrigger(validatedInput);

        res.json({
            success: true,
            message: 'Talent trigger processed successfully.',
            data: result,
        });

    } catch (error: unknown) {
        console.error('Talent trigger error:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Invalid input data', details: error.errors });
        }
        
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(500).json({ success: false, error: 'Failed to process talent trigger' });
    }
});

export default router;
