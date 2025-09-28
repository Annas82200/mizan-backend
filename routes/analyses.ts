import { Router } from "express";
import { analyzeStructure } from "../services/agents/structure-agent.js";
import { analyzeCulture } from "../services/agents/culture-agent.js";
import { runArchitectAI } from "../services/orchestrator/architect-ai.js";
import { buildUnifiedResults } from "../services/results/unified-results.js";
import { runTriggers } from "../services/results/trigger-engine.js";

const router = Router();

// POST /api/analyses/structure
router.post("/structure", async (req, res) => {
  try {
    const result = await analyzeStructure(req.body || {});
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "structure failure" });
  }
});

// POST /api/analyses/culture
router.post("/culture", async (req, res) => {
  try {
    const result = await analyzeCulture(req.body || {});
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "culture failure" });
  }
});

// POST /api/analyses/run-all
router.post("/run-all", async (req, res) => {
  try {
    const arch = await runArchitectAI(req.body || {});
    res.json(arch);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "orchestrator failure" });
  }
});

// POST /api/analyses/results  (orchestrator -> unified snapshot -> triggers)
router.post("/results", async (req, res) => {
  try {
    const arch = await runArchitectAI(req.body || {});
    const snapshot = await buildUnifiedResults(arch);
    const triggers = await runTriggers(snapshot);
    res.json({ snapshot, triggers });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "results failure" });
  }
});

export default router;
