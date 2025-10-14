import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { frameworkConfig } from '../db/schema/core.js';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Apply authentication
router.use(authenticate);

/**
 * GET /api/framework - Get current active framework configuration
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get the most recent active framework config
    const configs = await db.query.frameworkConfig.findMany({
      where: eq(frameworkConfig.isActive, true),
      orderBy: [desc(frameworkConfig.createdAt)],
      limit: 1
    });

    if (configs.length === 0) {
      // Return default framework if none exists
      return res.json({
        version: 1,
        cylinders: getDefaultFramework()
      });
    }

    return res.json({
      id: configs[0].id,
      version: configs[0].version,
      cylinders: configs[0].cylinders,
      updatedAt: configs[0].updatedAt
    });
  } catch (error: any) {
    console.error('Get framework error:', error);
    return res.status(500).json({ error: 'Failed to fetch framework configuration' });
  }
});

/**
 * PUT /api/framework - Update framework configuration (superadmin only)
 */
router.put('/', requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const { cylinders } = req.body;

    if (!cylinders || !Array.isArray(cylinders) || cylinders.length !== 7) {
      return res.status(400).json({ error: 'Invalid framework data. Must include 7 cylinders.' });
    }

    // Validate each cylinder has required fields
    for (const cylinder of cylinders) {
      if (!cylinder.cylinder || !cylinder.name || !cylinder.definition || 
          !cylinder.ethicalPrinciple || !cylinder.enablingValues || !cylinder.limitingValues) {
        return res.status(400).json({ 
          error: `Invalid cylinder ${cylinder.cylinder || 'unknown'}. Missing required fields.` 
        });
      }
    }

    // Get current version
    const currentConfigs = await db.query.frameworkConfig.findMany({
      orderBy: [desc(frameworkConfig.version)],
      limit: 1
    });

    const newVersion = currentConfigs.length > 0 ? currentConfigs[0].version + 1 : 1;

    // Deactivate all previous configs
    await db.update(frameworkConfig)
      .set({ isActive: false })
      .where(eq(frameworkConfig.isActive, true));

    // Insert new config
    const [newConfig] = await db.insert(frameworkConfig).values({
      version: newVersion,
      cylinders: cylinders,
      isActive: true,
      updatedBy: req.user!.id
    }).returning();

    return res.json({
      success: true,
      message: 'Framework configuration updated successfully',
      version: newConfig.version,
      id: newConfig.id
    });
  } catch (error: any) {
    console.error('Update framework error:', error);
    return res.status(500).json({ error: 'Failed to update framework configuration' });
  }
});

/**
 * GET /api/framework/history - Get framework configuration history (superadmin only)
 */
router.get('/history', requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const configs = await db.query.frameworkConfig.findMany({
      orderBy: [desc(frameworkConfig.createdAt)],
      limit
    });

    return res.json({
      history: configs.map(config => ({
        id: config.id,
        version: config.version,
        isActive: config.isActive,
        updatedBy: config.updatedBy,
        updatedAt: config.updatedAt,
        cylinderCount: Array.isArray(config.cylinders) ? config.cylinders.length : 0
      }))
    });
  } catch (error: any) {
    console.error('Get framework history error:', error);
    return res.status(500).json({ error: 'Failed to fetch framework history' });
  }
});

/**
 * GET /api/framework/version/:version - Get specific version
 */
router.get('/version/:version', requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const version = parseInt(req.params.version);

    const configs = await db.query.frameworkConfig.findMany({
      where: eq(frameworkConfig.version, version),
      limit: 1
    });

    if (configs.length === 0) {
      return res.status(404).json({ error: 'Framework version not found' });
    }

    return res.json({
      id: configs[0].id,
      version: configs[0].version,
      cylinders: configs[0].cylinders,
      isActive: configs[0].isActive,
      updatedBy: configs[0].updatedBy,
      updatedAt: configs[0].updatedAt
    });
  } catch (error: any) {
    console.error('Get framework version error:', error);
    return res.status(500).json({ error: 'Failed to fetch framework version' });
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
