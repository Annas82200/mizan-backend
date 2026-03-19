/**
 * Branding Routes — White-label branding API
 */

import { Router, Request, Response } from 'express';
import { validate } from '../../src/middleware/validate';
import { updateBrandingSchema, verifyDomainSchema } from '../../src/middleware/schemas';
import { BrandingService } from '../../src/services/branding/branding-service';

const router = Router();
const brandingService = new BrandingService();

interface AuthRequest extends Request {
  tenantId: string;
}

// Get tenant branding (public — used on page load)
router.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;

  try {
    const branding = await brandingService.getBranding(tenantId);
    return res.json(branding);
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get branding' });
  }
});

// Get CSS variables for tenant (cacheable)
router.get('/css', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;

  try {
    const css = await brandingService.getCSSVariables(tenantId);
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(css);
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get CSS' });
  }
});

// Update branding (admin only)
router.put('/', validate(updateBrandingSchema), async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;

  try {
    const updated = await brandingService.updateBranding(tenantId, req.body);
    return res.json(updated);
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to update branding' });
  }
});

// Verify custom domain
router.post('/domain/verify', validate(verifyDomainSchema), async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { domain } = req.body;

  if (!domain) return res.status(400).json({ error: 'Domain is required' });

  try {
    const result = await brandingService.verifyCustomDomain(tenantId, domain);
    return res.json(result);
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to verify domain' });
  }
});

export default router;
