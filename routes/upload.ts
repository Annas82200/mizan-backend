import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { authenticate } from "../middleware/auth.js";
import { analyzeStructure } from "../services/agents/structure-agent.js";
import { db } from "../db/client.js";
import { orgStructures } from "../db/schema.js";

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, and text files are allowed.'));
    }
  },
});

// Parse CSV org structure
function parseCSVOrgStructure(buffer: Buffer): string {
  try {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    // Convert CSV rows to indented text format
    // Expected columns: level, title, reports_to
    let orgText = "";
    
    for (const record of records) {
      const level = parseInt(record.level || "0");
      const title = record.title || record.role || record.position || "Unknown";
      const indent = "  ".repeat(level);
      orgText += `${indent}${title}\n`;
    }
    
    return orgText.trim();
  } catch (error) {
    throw new Error("Failed to parse CSV file");
  }
}

// Parse Excel org structure (simplified - in production use xlsx library)
function parseExcelOrgStructure(buffer: Buffer): string {
  // For now, return a placeholder
  // In production, use the xlsx library to parse Excel files
  return "CEO\n  COO\n  CTO\n  CFO";
}

// Public upload endpoint (no auth required for free tier)
router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file && !req.body.orgText) {
      return res.status(400).json({ error: "No file or text provided" });
    }
    
    let orgText = req.body.orgText || "";
    
    // Process uploaded file
    if (req.file) {
      if (req.file.mimetype === "text/csv") {
        orgText = parseCSVOrgStructure(req.file.buffer);
      } else if (req.file.mimetype.includes("excel") || req.file.mimetype.includes("spreadsheet")) {
        orgText = parseExcelOrgStructure(req.file.buffer);
      } else {
        // Plain text file
        orgText = req.file.buffer.toString("utf-8");
      }
    }
    
    // Analyze the structure
    const result = await analyzeStructure({ orgText });
    
    // Store for analytics (public analysis)
    await db.insert(orgStructures).values({
      submittedBy: req.user?.id || null,
      tenantId: req.user?.tenantId || null,
      rawText: orgText,
      parsedData: result.roles,
      analysisResult: result,
      isPublic: !req.user,
    });
    
    res.json(result);
  } catch (error) {
    console.error("Upload analysis failed:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Analysis failed" });
    }
  }
});

// Authenticated upload for saving org structures
router.post("/save", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file && !req.body.orgText) {
      return res.status(400).json({ error: "No file or text provided" });
    }
    
    let orgText = req.body.orgText || "";
    
    if (req.file) {
      if (req.file.mimetype === "text/csv") {
        orgText = parseCSVOrgStructure(req.file.buffer);
      } else {
        orgText = req.file.buffer.toString("utf-8");
      }
    }
    
    const result = await analyzeStructure({ 
      orgText, 
      tenantId: req.user!.tenantId || undefined 
    });
    
    // Save to database
    const [saved] = await db.insert(orgStructures).values({
      submittedBy: req.user!.id,
      tenantId: req.user!.tenantId,
      rawText: orgText,
      parsedData: result.roles,
      analysisResult: result,
      isPublic: false,
    }).returning();
    
    res.json({
      id: saved.id,
      ...result,
    });
  } catch (error) {
    console.error("Save org structure failed:", error);
    res.status(500).json({ error: "Failed to save organization structure" });
  }
});

// Get saved org structures
router.get("/structures", authenticate, async (req, res) => {
  try {
    const structures = await db.query.orgStructures.findMany({
      where: eq(orgStructures.tenantId, req.user!.tenantId!),
      orderBy: [desc(orgStructures.createdAt)],
      limit: 10,
    });
    
    res.json({ structures });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve structures" });
  }
});

// Template download
router.get("/template", (req, res) => {
  const format = req.query.format || "csv";
  
  if (format === "csv") {
    const csvTemplate = `level,title,reports_to
0,CEO,
1,COO,CEO
1,CTO,CEO
1,CFO,CEO
2,VP Engineering,CTO
2,VP Product,CTO
2,VP Sales,COO
3,Engineering Manager,VP Engineering
3,Product Manager,VP Product`;
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=org-structure-template.csv");
    res.send(csvTemplate);
  } else {
    const textTemplate = `CEO
  COO
    VP Sales
      Sales Manager
    VP Marketing
  CTO
    VP Engineering
      Engineering Manager
        Senior Engineer
        Engineer
    VP Product
      Product Manager
  CFO
    Controller
    Treasurer`;
    
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=org-structure-template.txt");
    res.send(textTemplate);
  }
});

export default router;
