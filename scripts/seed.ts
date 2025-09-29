import { db } from "../db/client.js";
import {
  tenants,
  users,
  assessments,
  orgSnapshots,
  actionModules,
  learningExperiences,
  employeeProgress,
  learningAssignments,
} from "../db/schema.js";
import { hashPassword } from "../services/auth.js";

const DEFAULT_VALUES_FRAMEWORK = [
  {
    cylinder: 1,
    name: "Stability",
    definition: "Builds predictable systems that keep people psychologically and physically safe.",
    ethicalPrinciple: "Duty of Care",
    enablingValues: [
      { name: "Safety", definition: "Protects wellbeing through clear guardrails and dependable routines." },
      { name: "Reliability", definition: "Delivers on commitments so teams can plan and coordinate with confidence." },
      { name: "Clarity", definition: "Explains expectations in plain language to reduce ambiguity and anxiety." },
    ],
    limitingValues: [
      { name: "Fear", definition: "Leads with threat or scarcity, shrinking experimentation." },
      { name: "Rigidity", definition: "Locks processes even when signals show they no longer fit reality." },
      { name: "Micromanagement", definition: "Controls every decision instead of building collective trust." },
    ],
  },
  {
    cylinder: 2,
    name: "Belonging",
    definition: "Signals genuine inclusion, connection and shared identity across the organisation.",
    ethicalPrinciple: "Human Dignity",
    enablingValues: [
      { name: "Inclusion", definition: "Designs rituals and systems where every voice can shape the story." },
      { name: "Empathy", definition: "Listens for lived experience and adapts decisions with compassion." },
      { name: "Celebration", definition: "Recognises milestones and contributions so people feel seen." },
    ],
    limitingValues: [
      { name: "Cliquishness", definition: "Builds inner circles that gate access to opportunity." },
      { name: "Bias", definition: "Allows unchecked assumptions to steer hiring, promotion or influence." },
      { name: "Tokenism", definition: "Invites diversity without redistributing power or voice." },
    ],
  },
  {
    cylinder: 3,
    name: "Mastery",
    definition: "Elevates craft through deliberate practice, feedback and shared standards.",
    ethicalPrinciple: "Commitment to Excellence",
    enablingValues: [
      { name: "Craftsmanship", definition: "Invests in honing skills and improving quality of outputs." },
      { name: "Learning Agility", definition: "Turns new information into upgraded methods quickly." },
      { name: "Mentorship", definition: "Passes on expertise to grow collective capability." },
    ],
    limitingValues: [
      { name: "Perfectionism", definition: "Stalls delivery in pursuit of unattainable standards." },
      { name: "Gatekeeping", definition: "Restricts access to knowledge to maintain status." },
      { name: "Burnout", definition: "Over-rotates on output at the expense of sustainable pacing." },
    ],
  },
  {
    cylinder: 4,
    name: "Autonomy",
    definition: "Distributes decision rights with the guardrails that keep teams aligned.",
    ethicalPrinciple: "Reciprocal Trust",
    enablingValues: [
      { name: "Ownership", definition: "Encourages individuals to steward outcomes, not just tasks." },
      { name: "Initiative", definition: "Rewards those who spot gaps and act without waiting for permission." },
      { name: "Adaptability", definition: "Adjusts approaches quickly while keeping the shared intent intact." },
    ],
    limitingValues: [
      { name: "Isolation", definition: "Lets teams drift without connection to peers or the mission." },
      { name: "Chaos", definition: "Ignores coordination leading to conflicting priorities." },
      { name: "Avoidance", definition: "Uses freedom to escape accountability for tough calls." },
    ],
  },
  {
    cylinder: 5,
    name: "Purpose",
    definition: "Connects everyday work to the story of impact for customers, community and planet.",
    ethicalPrinciple: "Stewardship of Impact",
    enablingValues: [
      { name: "Contribution", definition: "Shows how roles ladder to outcomes people care about." },
      { name: "Storytelling", definition: "Translates strategy into human narratives that inspire action." },
      { name: "Service", definition: "Centres decisions on those who are affected by them." },
    ],
    limitingValues: [
      { name: "Hero Syndrome", definition: "Relies on a few saviours instead of building collective ownership." },
      { name: "Dogma", definition: "Treats purpose statements as untouchable even when reality shifts." },
      { name: "Disconnection", definition: "Lets mission language drift away from everyday practice." },
    ],
  },
  {
    cylinder: 6,
    name: "Evolution",
    definition: "Keeps learning loops alive so the organisation can transform with integrity.",
    ethicalPrinciple: "Mutual Growth",
    enablingValues: [
      { name: "Experimentation", definition: "Runs safe-to-try tests that inform bigger decisions." },
      { name: "Feedback Fluency", definition: "Normalises giving and receiving signals to tune performance." },
      { name: "Resilience", definition: "Helps teams recover, learn and re-engage after setbacks." },
    ],
    limitingValues: [
      { name: "Thrash", definition: "Spins up constant change without finishing learning cycles." },
      { name: "Data Myopia", definition: "Over-indexes on easy metrics and misses deeper insights." },
      { name: "Fatigue", definition: "Burns people out by stacking too many transformations at once." },
    ],
  },
  {
    cylinder: 7,
    name: "Legacy",
    definition: "Designs for long-term flourishing beyond any single leader or quarter.",
    ethicalPrinciple: "Intergenerational Responsibility",
    enablingValues: [
      { name: "Stewardship", definition: "Guards resources today so future teams have options." },
      { name: "Systems Thinking", definition: "Maps ripple effects before committing to action." },
      { name: "Regeneration", definition: "Invests in ecosystems that renew talent, community and planet." },
    ],
    limitingValues: [
      { name: "Complacency", definition: "Assumes past success guarantees future relevance." },
      { name: "Nostalgia", definition: "Clings to legacy symbols instead of evolving them." },
      { name: "Risk Aversion", definition: "Avoids necessary change in the name of protecting tradition." },
    ],
  },
];

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Clear existing data
    console.log("Clearing existing data...");
    await db.delete(learningAssignments);
    await db.delete(employeeProgress);
    await db.delete(learningExperiences);
    await db.delete(actionModules);
    await db.delete(orgSnapshots);
    await db.delete(assessments);
    await db.delete(users);
    await db.delete(tenants);

    // Create demo tenants
    console.log("Creating tenants...");
    const [tenant1, tenant2] = await db.insert(tenants).values([
      {
        name: "Aurora Biotech",
        plan: "growth",
        status: "active",
        primaryContact: "demo@aurorabiotech.com",
        aiProviders: {
          knowledge: ["claude", "openai"],
          data: ["gemini"],
          reasoning: ["openai", "mistral"],
        },
        features: {
          entryAnalyzer: true,
          orchestrator: true,
          actionModules: true,
          lxpPipeline: true,
          benchmarking: true,
        },
        integrations: {
          hris: ["workday"],
          dataResidency: "cloud",
          environment: "prod",
        },
        valuesFramework: DEFAULT_VALUES_FRAMEWORK,
      },
      {
        name: "Demo Company",
        plan: "free",
        status: "trial",
        primaryContact: "demo@democompany.com",
        aiProviders: {
          knowledge: ["openai"],
          data: ["openai"],
          reasoning: ["openai"],
        },
        features: {
          entryAnalyzer: true,
          orchestrator: false,
          actionModules: false,
          lxpPipeline: false,
          benchmarking: false,
        },
        integrations: {
          hris: [],
          dataResidency: "cloud",
          environment: "sandbox",
        },
        valuesFramework: DEFAULT_VALUES_FRAMEWORK,
      },
    ]).returning();

    // Create demo users
    console.log("Creating users...");
    const demoPassword = await hashPassword("demo123!");
    
    const demoUsers = await db.insert(users).values([
      {
        email: "admin@mizan.ai",
        passwordHash: await hashPassword("admin123!"),
        name: "Super Admin",
        role: "superadmin",
        tenantId: null,
      },
      {
        email: "demo@aurorabiotech.com",
        passwordHash: demoPassword,
        name: "Sarah Chen",
        title: "Chief People Officer",
        role: "clientAdmin",
        tenantId: tenant1.id,
        cylinderFocus: 6,
      },
      {
        email: "employee@aurorabiotech.com",
        passwordHash: demoPassword,
        name: "Alex Rivera",
        title: "Senior Scientist",
        role: "employee",
        tenantId: tenant1.id,
        cylinderFocus: 3,
        reportsTo: "demo@aurorabiotech.com",
      },
      {
        email: "demo@democompany.com",
        passwordHash: demoPassword,
        name: "Demo User",
        title: "HR Manager",
        role: "clientAdmin",
        tenantId: tenant2.id,
      },
    ]).returning();

    // Create action modules
    console.log("Creating action modules...");
    await db.insert(actionModules).values([
      {
        category: "Hiring",
        title: "Role Clarity Scorecard",
        description: "Codify outcomes, craft signals and align interview loops to Cylinder 3 mastery values.",
        triggerTags: ["structure", "talent", "values-cylinder-3"],
        effort: "medium",
      },
      {
        category: "Onboarding",
        title: "Narrative Onboarding Sprint",
        description: "90-minute immersion linking Cylinder 2 belonging stories to Cylinder 5 purpose narrative.",
        triggerTags: ["culture", "belonging", "values-cylinder-2"],
        effort: "low",
      },
      {
        category: "Performance",
        title: "Adaptive Goal Canvas",
        description: "Enable Cylinder 4 autonomy by wiring goal cadences with peer calibration.",
        triggerTags: ["performance", "autonomy", "values-cylinder-4"],
        effort: "medium",
      },
      {
        category: "Rewards",
        title: "Peer Recognition Rituals",
        description: "Design lightweight kudos loops anchored in Cylinder 2 belonging.",
        triggerTags: ["recognition", "belonging", "values-cylinder-2"],
        effort: "low",
      },
    ]);

    // Create learning experiences
    console.log("Creating learning experiences...");
    const experiences = await db.insert(learningExperiences).values([
      {
        title: "Stability Playbook",
        description: "Design operating guardrails that stabilize rapid scaling teams.",
        cylinder: 1,
        estimatedMinutes: 35,
        format: "course",
        tags: ["ops", "safety", "foundation"],
      },
      {
        title: "Belonging Story Sprint",
        description: "Craft micro-stories that anchor team rituals in belonging values.",
        cylinder: 2,
        estimatedMinutes: 50,
        format: "ritual",
        tags: ["culture", "facilitation", "belonging"],
      },
      {
        title: "Mastery Ladder Lab",
        description: "Map apprenticeship ladders and calibrate growth loops for craft excellence.",
        cylinder: 3,
        estimatedMinutes: 70,
        format: "coaching",
        tags: ["skills", "craft", "mentorship"],
      },
    ]).returning();

    // Create sample assessments
    console.log("Creating assessments...");
    await db.insert(assessments).values([
      {
        tenantId: tenant1.id,
        type: "structure",
        score: "0.72",
        summary: "Org flattened two layers in R&D; collaboration loops improved.",
        triadConfidence: "0.82",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        tenantId: tenant1.id,
        type: "culture",
        score: "0.68",
        summary: "Values alignment increasing yet belonging cues lag for new hires.",
        triadConfidence: "0.78",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      },
    ]);

    // Create org snapshot
    console.log("Creating org snapshots...");
    await db.insert(orgSnapshots).values([
      {
        tenantId: tenant1.id,
        overallHealthScore: "0.70",
        trend: "up",
        highlights: ["Engagement +5% QoQ", "Game-based onboarding launched", "Skills gaps in data science identified"],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ]);

    // Create employee progress
    console.log("Creating employee progress...");
    const employeeUser = demoUsers.find(u => u.email === "employee@aurorabiotech.com");
    if (employeeUser) {
      const [progress] = await db.insert(employeeProgress).values([
        {
          employeeId: employeeUser.id,
          tenantId: tenant1.id,
          xp: 1280,
          streak: 6,
          lastActivityAt: new Date(),
        },
      ]).returning();

      // Create learning assignments
      await db.insert(learningAssignments).values([
        {
          progressId: progress.id,
          experienceId: experiences[0].id,
          status: "completed",
          progress: "1.00",
          nextAction: "Share learnings with team",
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          progressId: progress.id,
          experienceId: experiences[1].id,
          status: "in_progress",
          progress: "0.45",
          nextAction: "Complete story workshop",
          startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ]);
    }

    console.log("✅ Seed completed successfully!");
    console.log("");
    console.log("Demo accounts created:");
    console.log("  Super Admin: admin@mizan.ai / admin123!");
    console.log("  Client Admin: demo@aurorabiotech.com / demo123!");
    console.log("  Employee: employee@aurorabiotech.com / demo123!");
    console.log("  Free Tier: demo@democompany.com / demo123!");
    
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seed();
