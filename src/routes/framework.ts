import { Router, Request, Response } from 'express';
import { db } from '../../db/index';
import { frameworkConfig, auditLogs } from '../../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate, requireRole, validateTenantAccess } from '../middleware/auth';
import { logger } from '../services/logger';

const router = Router();

// Apply authentication and tenant validation to all routes
router.use(authenticate);
router.use(validateTenantAccess);

/**
 * GET /api/framework - Get current active framework configuration
 * Framework is global but access is tenant-isolated for security
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    // Framework configuration is global but logged for audit purposes
    logger.info(`Framework config accessed by tenant: ${tenantId}, user: ${userId}`);

    // Get the most recent active framework config
    // Framework is global but we log tenant access for security auditing
    const configs = await db.select()
      .from(frameworkConfig)
      .where(eq(frameworkConfig.isActive, true))
      .orderBy(desc(frameworkConfig.createdAt))
      .limit(1);

    if (configs.length === 0) {
      // Return default framework if none exists
      return res.json({
        version: 1,
        cylinders: getDefaultFramework(),
        tenantId: tenantId // Include for audit trail
      });
    }

    return res.json({
      id: configs[0].id,
      version: configs[0].version,
      cylinders: configs[0].cylinders,
      updatedAt: configs[0].updatedAt,
      tenantId: tenantId // Include for audit trail
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch framework configuration';
    logger.error('Get framework error:', {
      error,
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    return res.status(500).json({ error: errorMessage });
  }
});

/**
 * PUT /api/framework - Update framework configuration (superadmin only)
 * Framework updates are global but tracked by superadmin's tenantId for audit
 */
router.put('/', requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { cylinders } = req.body;

    // Validate tenant access
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant and user identification required' });
    }

    logger.info(`Framework config update attempted by superadmin (tenant: ${tenantId}, user: ${userId})`);

    if (!cylinders || !Array.isArray(cylinders) || cylinders.length !== 7) {
      return res.status(400).json({ 
        error: 'Invalid framework data. Must include 7 cylinders.',
        tenantId: tenantId 
      });
    }

    // Validate each cylinder has required fields
    for (const cylinder of cylinders) {
      if (!cylinder.cylinder || !cylinder.name || !cylinder.definition ||
          !cylinder.ethicalPrinciple || !cylinder.enablingValues || !cylinder.limitingValues) {
        return res.status(400).json({
          error: `Invalid cylinder ${cylinder.cylinder || 'unknown'}. Missing required fields.`,
          tenantId: tenantId
        });
      }
    }

    // Get current version
    const currentConfigs = await db.select()
      .from(frameworkConfig)
      .orderBy(desc(frameworkConfig.version))
      .limit(1);

    const newVersion = currentConfigs.length > 0 ? currentConfigs[0].version + 1 : 1;

    // Deactivate all previous configs
    await db.update(frameworkConfig)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(frameworkConfig.isActive, true));

    // Insert new config with tenant audit trail
    const [newConfig] = await db.insert(frameworkConfig).values({
      version: newVersion,
      cylinders: cylinders,
      isActive: true,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Log successful update with tenant information
    logger.info(`Framework config updated successfully by superadmin (tenant: ${tenantId}, user: ${userId}, version: ${newVersion})`);

    return res.json({
      success: true,
      message: 'Framework configuration updated successfully',
      version: newConfig.version,
      id: newConfig.id,
      tenantId: tenantId // Include for audit trail
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update framework configuration';
    logger.error('Update framework error:', {
      error,
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    return res.status(500).json({ 
      error: errorMessage,
      tenantId: req.user?.tenantId 
    });
  }
});

/**
 * GET /api/framework/history - Get framework configuration history (superadmin only)
 * Tenant-isolated access to framework history
 */
router.get('/history', requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Cap at 100

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    logger.info(`Framework history accessed by superadmin (tenant: ${tenantId}, user: ${userId})`);

    // Framework history is global but we audit the access per tenant
    const configs = await db.select()
      .from(frameworkConfig)
      .orderBy(desc(frameworkConfig.createdAt))
      .limit(limit);

    return res.json({
      history: configs.map(config => ({
        id: config.id,
        version: config.version,
        isActive: config.isActive,
        updatedBy: config.updatedBy,
        updatedAt: config.updatedAt,
        cylinderCount: Array.isArray(config.cylinders) ? config.cylinders.length : 0
      })),
      tenantId: tenantId, // Include for audit trail
      accessedBy: userId,
      accessedAt: new Date()
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch framework history';
    logger.error('Get framework history error:', {
      error,
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    return res.status(500).json({ 
      error: errorMessage,
      tenantId: req.user?.tenantId 
    });
  }
});

/**
 * GET /api/framework/version/:version - Get specific version (superadmin only)
 * Tenant-isolated access to specific framework version
 */
router.get('/version/:version', requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const version = parseInt(req.params.version);

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    if (isNaN(version) || version < 1) {
      return res.status(400).json({ 
        error: 'Invalid version number',
        tenantId: tenantId 
      });
    }

    logger.info(`Framework version ${version} accessed by superadmin (tenant: ${tenantId}, user: ${userId})`);

    const configs = await db.select()
      .from(frameworkConfig)
      .where(eq(frameworkConfig.version, version))
      .limit(1);

    if (configs.length === 0) {
      return res.status(404).json({ 
        error: 'Framework version not found',
        tenantId: tenantId 
      });
    }

    return res.json({
      id: configs[0].id,
      version: configs[0].version,
      cylinders: configs[0].cylinders,
      isActive: configs[0].isActive,
      updatedBy: configs[0].updatedBy,
      updatedAt: configs[0].updatedAt,
      tenantId: tenantId, // Include for audit trail
      accessedBy: userId,
      accessedAt: new Date()
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch framework version';
    logger.error('Get framework version error:', {
      error,
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      version: req.params.version
    });
    return res.status(500).json({ 
      error: errorMessage,
      tenantId: req.user?.tenantId 
    });
  }
});

/**
 * GET /api/framework/audit - Get framework access audit log (superadmin only)
 * Returns audit trail of framework access per tenant
 */
router.get('/audit', requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    logger.info(`Framework audit accessed by superadmin (tenant: ${tenantId}, user: ${userId})`);

    // Query audit logs for framework-related actions
    const frameworkAuditLogs = await db.select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, tenantId),
          eq(auditLogs.resource, 'framework')
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(100); // Last 100 audit entries

    return res.json({
      success: true,
      tenantId: tenantId,
      auditedBy: userId,
      auditedAt: new Date(),
      totalEntries: frameworkAuditLogs.length,
      auditLogs: frameworkAuditLogs.map(log => ({
        id: log.id,
        action: log.action,
        userId: log.userId,
        resourceId: log.resourceId,
        status: log.status,
        ipAddress: log.ipAddress,
        metadata: log.metadata,
        createdAt: log.createdAt
      }))
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch framework audit';
    logger.error('Get framework audit error:', {
      error,
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    return res.status(500).json({ 
      error: errorMessage,
      tenantId: req.user?.tenantId 
    });
  }
});

// Default framework configuration
function getDefaultFramework() {
  return [
    {
      cylinder: 1,
      name: "Safety & Survival",
      definition: "Protecting life and dignity by ensuring health, stability, and freedom from harm. Organizations grounded here safeguard people's wellbeing before all else.",
      ethicalPrinciple: "Preservation of Life",
      enablingValues: [
        { name: "Safety", definition: "Creates environments free from physical, psychological, and digital harm where people feel secure to contribute." },
        { name: "Stability", definition: "Establishes dependable systems, predictable routines, and consistent leadership that sustain confidence and trust." },
        { name: "Preparedness", definition: "Anticipates risks and responds proactively through prevention, training, and care for resilience." },
        { name: "Wellbeing", definition: "Promotes holistic balance—mental, physical, emotional, and social—so individuals can thrive sustainably." }
      ],
      limitingValues: [
        { name: "Fear", definition: "Uses control or intimidation to drive compliance instead of safety and trust." },
        { name: "Neglect", definition: "Ignores early warning signs that threaten people's wellbeing or stability." },
        { name: "Instability", definition: "Creates chaos through unclear priorities or frequent disruptive change." },
        { name: "Complacency", definition: "Fails to update systems and safeguards, leaving people vulnerable." }
      ]
    },
    {
      cylinder: 2,
      name: "Belonging & Loyalty",
      definition: "Fostering genuine connection, trust, and shared identity within teams and communities.",
      ethicalPrinciple: "Human Dignity",
      enablingValues: [
        { name: "Inclusion", definition: "Creates spaces where all voices are valued and respected regardless of status or background." },
        { name: "Trust", definition: "Builds reliability through transparency, honesty, and consistent care for others." },
        { name: "Collaboration", definition: "Encourages teamwork and mutual reliance to achieve shared goals." },
        { name: "Compassion", definition: "Recognizes the emotional and human side of work, fostering empathy and kindness." }
      ],
      limitingValues: [
        { name: "Cliquishness", definition: "Forms exclusive circles that divide teams and limit access to opportunity." },
        { name: "Bias", definition: "Lets personal or cultural prejudice influence decisions or relationships." },
        { name: "Distrust", definition: "Assumes bad intent or hides information, eroding openness and cooperation." },
        { name: "Favoritism", definition: "Rewards loyalty to individuals over loyalty to shared purpose or principles." }
      ]
    },
    {
      cylinder: 3,
      name: "Growth & Achievement",
      definition: "Encouraging learning, mastery, and performance that honor both excellence and humility.",
      ethicalPrinciple: "Striving with Excellence",
      enablingValues: [
        { name: "Discipline", definition: "Maintains consistency, focus, and perseverance in pursuit of goals." },
        { name: "Learning", definition: "Seeks continuous improvement through feedback, curiosity, and reflection." },
        { name: "Ambition", definition: "Sets bold yet ethical aspirations that uplift the individual and the organization." },
        { name: "Accountability", definition: "Takes ownership for actions, results, and the wellbeing of others." }
      ],
      limitingValues: [
        { name: "Ego", definition: "Pursues recognition and power at the expense of humility and shared success." },
        { name: "Burnout", definition: "Overextends effort without balance or care, leading to exhaustion and decline." },
        { name: "Competition", definition: "Creates rivalry that undermines trust and collaboration." },
        { name: "Arrogance", definition: "Rejects feedback or learning due to inflated self-perception." }
      ]
    },
    {
      cylinder: 4,
      name: "Meaning & Contribution",
      definition: "Connecting personal and collective work to purpose and long-term impact.",
      ethicalPrinciple: "Service",
      enablingValues: [
        { name: "Purpose", definition: "Aligns actions and decisions with a clear sense of meaning and contribution." },
        { name: "Stewardship", definition: "Acts responsibly toward people, resources, and the environment." },
        { name: "Empowerment", definition: "Gives others the freedom and tools to take initiative and create positive impact." },
        { name: "Recognition", definition: "Celebrates effort and contribution as vital to collective success." }
      ],
      limitingValues: [
        { name: "Apathy", definition: "Shows disinterest in the organization's mission or others' wellbeing." },
        { name: "Self-interest", definition: "Prioritizes personal gain over shared outcomes." },
        { name: "Cynicism", definition: "Dismisses purpose or meaning as irrelevant or naïve." },
        { name: "Disconnection", definition: "Loses sight of how one's work contributes to a larger purpose." }
      ]
    },
    {
      cylinder: 5,
      name: "Integrity & Justice",
      definition: "Upholding truth, fairness, and ethical responsibility as the foundation of trust.",
      ethicalPrinciple: "Justice and Accountability",
      enablingValues: [
        { name: "Integrity", definition: "Acts consistently with moral principles even when inconvenient or unseen." },
        { name: "Fairness", definition: "Makes impartial decisions that respect the rights and dignity of all." },
        { name: "Transparency", definition: "Shares information honestly to build confidence and accountability." },
        { name: "Courage", definition: "Stands up for what is right, even under pressure or risk." }
      ],
      limitingValues: [
        { name: "Deception", definition: "Distorts truth for convenience or personal advantage." },
        { name: "Injustice", definition: "Permits unfair systems or double standards to persist." },
        { name: "Blame", definition: "Avoids responsibility by shifting fault onto others." },
        { name: "Corruption", definition: "Compromises moral principles for personal or organizational gain." }
      ]
    },
    {
      cylinder: 6,
      name: "Wisdom & Compassion",
      definition: "Integrating intellect and empathy to lead with understanding and balance.",
      ethicalPrinciple: "Mercy and Knowledge",
      enablingValues: [
        { name: "Humility", definition: "Listens deeply, learns from others, and admits the limits of one's perspective." },
        { name: "Empathy", definition: "Seeks to understand others' experiences before acting or deciding." },
        { name: "Discernment", definition: "Balances facts, values, and intuition to make wise judgments." },
        { name: "Patience", definition: "Responds to difficulty with steadiness and grace rather than reactivity." }
      ],
      limitingValues: [
        { name: "Pride", definition: "Closes the door to learning by overestimating one's own wisdom." },
        { name: "Indifference", definition: "Fails to act with compassion when others are in need." },
        { name: "Impulsiveness", definition: "Acts hastily without reflection or counsel." },
        { name: "Judgmentalism", definition: "Condemns others harshly rather than guiding with mercy." }
      ]
    },
    {
      cylinder: 7,
      name: "Transcendence & Unity",
      definition: "Achieving harmony between self, others, and the greater purpose of existence.",
      ethicalPrinciple: "Unity of Being",
      enablingValues: [
        { name: "Alignment", definition: "Brings actions, words, and intentions into coherence across all areas of life." },
        { name: "Gratitude", definition: "Recognizes and appreciates the interconnectedness of all blessings and efforts." },
        { name: "Purposeful Reflection", definition: "Pauses to connect daily work to deeper meaning and shared humanity." },
        { name: "Harmony", definition: "Promotes peace, cooperation, and spiritual balance within and between groups." }
      ],
      limitingValues: [
        { name: "Division", definition: "Amplifies differences and conflict, eroding unity and purpose." },
        { name: "Materialism", definition: "Overfocuses on possessions or status, neglecting inner growth." },
        { name: "Alienation", definition: "Feels disconnected from meaning, others, or the greater whole." },
        { name: "Despair", definition: "Loses faith in the possibility of renewal, healing, or higher purpose." }
      ]
    }
  ];
}

export default router;