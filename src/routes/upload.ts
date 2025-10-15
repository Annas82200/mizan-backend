import { Router, Request, Response } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { authenticate } from "../middleware/auth.js";
import { StructureAgentV2 } from "../services/agents/structure/structure-agent.js";
import { db } from "../../db/index.js";
import { orgStructures, users, tenants } from "../../db/schema/core.js";
import { organizationStructure } from "../../db/schema/strategy.js";
import { eq, desc, and } from "drizzle-orm";
import { AnalysisResult } from "../types/shared.js";
import bcrypt from "bcryptjs";

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

// Parse CSV org structure - supports multiple formats
function parseCSVOrgStructure(buffer: Buffer): string {
  try {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    // Check CSV format - support both formats:
    // Format 1: employee_name, employee_email, department, supervisor_name, supervisor_email
    // Format 2: level, title, reports_to (legacy)

    const firstRecord = records[0] || {};
    const hasEmployeeFormat = 'employee_name' in firstRecord ||
                              'name' in firstRecord ||
                              'employee_email' in firstRecord;

    if (hasEmployeeFormat) {
      // New employee-based format
      return parseEmployeeCSV(records);
    } else {
      // Legacy hierarchy format
      return parseLegacyHierarchyCSV(records);
    }
  } catch (error) {
    throw new Error("Failed to parse CSV file");
  }
}

// Parse employee-based CSV (employee, email, department, supervisor)
function parseEmployeeCSV(records: Array<Record<string, string>>): string {
  const employeeMap = new Map<string, any>();
  const departments = new Set<string>();

  // First pass: collect all employees
  for (const record of records) {
    const employeeName = record.employee_name || record.name || 'Unknown';
    const employeeEmail = record.employee_email || record.email || '';
    const department = record.department || 'Unassigned';
    const supervisorName = record.supervisor_name || record.supervisor || '';
    const supervisorEmail = record.supervisor_email || '';

    employeeMap.set(employeeEmail || employeeName, {
      name: employeeName,
      email: employeeEmail,
      department,
      supervisorName,
      supervisorEmail,
      subordinates: []
    });

    if (department) {
      departments.add(department);
    }
  }

  // Second pass: build hierarchy
  const roots: HierarchyEmployee[] = [];
  for (const [key, employee] of employeeMap.entries()) {
    if (employee.supervisorEmail || employee.supervisorName) {
      const supervisor = employeeMap.get(employee.supervisorEmail) ||
                        Array.from(employeeMap.values()).find(e =>
                          e.name === employee.supervisorName
                        );
      if (supervisor) {
        supervisor.subordinates.push(employee);
      } else {
        roots.push(employee);
      }
    } else {
      roots.push(employee);
    }
  }

  interface HierarchyEmployee {
    name: string;
    department: string;
    subordinates: HierarchyEmployee[];
  }

  // Convert to hierarchical text
  function buildHierarchyText(employee: HierarchyEmployee, level: number = 0): string {
    const indent = "  ".repeat(level);
    let text = `${indent}${employee.name} - ${employee.department}\n`;
    for (const subordinate of employee.subordinates) {
      text += buildHierarchyText(subordinate, level + 1);
    }
    return text;
  }

  let orgText = "";
  for (const root of roots) {
    orgText += buildHierarchyText(root);
  }

  // If no hierarchy found, create department-based structure
  if (orgText.trim() === "") {
    orgText = "Organization Structure\n";
    for (const dept of Array.from(departments).sort()) {
      orgText += `  ${dept}\n`;
      const deptEmployees = Array.from(employeeMap.values()).filter(
        e => e.department === dept
      );
      for (const emp of deptEmployees) {
        orgText += `    ${emp.name}\n`;
      }
    }
  }

  return orgText.trim();
}

// Parse legacy hierarchy CSV (level, title, reports_to)
function parseLegacyHierarchyCSV(records: Array<Record<string, string>>): string {
  let orgText = "";
  for (const record of records) {
    const level = parseInt(record.level || "0");
    const title = record.title || record.role || record.position || "Unknown";
    const indent = "  ".repeat(level);
    orgText += `${indent}${title}\n`;
  }
  return orgText.trim();
}

// Parse Excel org structure (simplified - in production use xlsx library)
function parseExcelOrgStructure(buffer: Buffer): string {
  // For now, return a placeholder
  // In production, use the xlsx library to parse Excel files
  return "CEO\n  COO\n  CTO\n  CFO";
}

// Public upload endpoint (no auth required for free tier)
router.post("/analyze", upload.single("file"), async (req: Request, res: Response) => {
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
    
    // Analyze the structure using StructureAgentV2
    const agentConfig = {
      knowledge: {
        providers: ['openai' as const, 'anthropic' as const],
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 4000
      },
      data: {
        providers: ['openai' as const],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 4000
      },
      reasoning: {
        providers: ['anthropic' as const],
        model: 'claude-3',
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    };
    const agent = new StructureAgentV2('structure', agentConfig);
    const result = await agent.analyze({
      tenantId: req.user?.tenantId || 'public',
      userId: req.user?.id || 'anonymous',
      orgText
    }) as unknown as AnalysisResult;

    // Store for analytics (public analysis)
    await db.insert(orgStructures).values({
      submittedBy: req.user?.id || null,
      tenantId: req.user?.tenantId || null,
      rawText: orgText,
      parsedData: result.roles || result,
      analysisResult: result,
      isPublic: !req.user,
    });

    return res.json(result);
  } catch (error) {
    console.error("Upload analysis failed:", error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    } else {
      return res.status(500).json({ error: "Analysis failed" });
    }
  }
});

// Authenticated upload for saving org structures
// Supports both /save and /org-chart endpoints
router.post("/save", authenticate, upload.single("file"), async (req: Request, res: Response) => {
  return handleOrgChartUpload(req, res);
});

router.post("/org-chart", authenticate, upload.single("file"), async (req: Request, res: Response) => {
  return handleOrgChartUpload(req, res);
});

async function handleOrgChartUpload(req: Request, res: Response) {
  try {
    if (!req.file && !req.body.orgText) {
      return res.status(400).json({ error: "No file or text provided" });
    }

    // Get tenantId from request (for superadmin selecting different tenant)
    // Fall back to logged-in user's tenant if not provided
    const targetTenantId = req.body.tenantId || req.user!.tenantId;

    let orgText = req.body.orgText || "";
    let csvRecords: Array<Record<string, string>> | null = null;

    if (req.file) {
      if (req.file.mimetype === "text/csv") {
        // Parse CSV to extract employee data
        csvRecords = parse(req.file.buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as Array<Record<string, string>>;

        orgText = parseCSVOrgStructure(req.file.buffer);
      } else {
        orgText = req.file.buffer.toString("utf-8");
      }
    }

    // Create employee user accounts from CSV if employee data is present
    let employeesCreated = 0;
    if (csvRecords && csvRecords.length > 0) {
      const firstRecord = csvRecords[0];
      const hasEmployeeFormat =
        'employee_name' in firstRecord ||
        'name' in firstRecord ||
        'Name' in firstRecord ||
        'employee_email' in firstRecord ||
        'email' in firstRecord ||
        'Email' in firstRecord;

      if (hasEmployeeFormat) {
        // Default password for CSV-imported employees
        const defaultPassword = 'Welcome@123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        for (const record of csvRecords) {
          const employeeName = record.employee_name || record.name || record.Name;
          const employeeEmail = record.employee_email || record.email || record.Email;
          const title = record.title || record.Title || record.position || record.Position || null;

          if (employeeEmail && employeeName) {
            try {
              // Check if user already exists
              const existingUser = await db.query.users.findFirst({
                where: and(
                  eq(users.email, employeeEmail.toLowerCase()),
                  eq(users.tenantId, targetTenantId)
                )
              });

              if (!existingUser) {
                await db.insert(users).values({
                  tenantId: targetTenantId,
                  email: employeeEmail.toLowerCase(),
                  passwordHash,
                  name: employeeName,
                  title,
                  role: 'employee',
                  isActive: true
                });
                employeesCreated++;
              }
            } catch (err) {
              console.error(`Skipped user ${employeeEmail}:`, err);
            }
          }
        }

        // Update tenant employee count
        if (employeesCreated > 0) {
          const allEmployees = await db.query.users.findMany({
            where: and(
              eq(users.tenantId, targetTenantId),
              eq(users.role, 'employee')
            )
          });

          await db.update(tenants)
            .set({ employeeCount: allEmployees.length })
            .where(eq(tenants.id, targetTenantId));
        }
      }
    }

    // Generate mock analysis results for now
    // TODO: Replace with actual AI agent when APIs are configured
    const result = generateMockStructureAnalysis(orgText);

    // Parse the org text into structured data for organization_structure table
    const parsedData = parseOrgTextToStructure(orgText);

    // Save to BOTH tables:
    // 1. org_structures (for historical records)
    const [saved] = await db.insert(orgStructures).values({
      submittedBy: req.user!.id,
      tenantId: targetTenantId,
      rawText: orgText,
      parsedData: result.roles || [],
      analysisResult: result,
      isPublic: false,
    }).returning();

    // 2. organization_structure (for analysis engine to read)
    // Delete old structure for this tenant first
    await db.delete(organizationStructure).where(eq(organizationStructure.tenantId, targetTenantId));

    await db.insert(organizationStructure).values({
      tenantId: targetTenantId,
      structureData: parsedData,
      uploadedBy: req.user!.id,
    });

    return res.json({
      id: saved.id,
      employeesCreated,
      ...result,
    });
  } catch (error) {
    const e = error as Error;
    console.error("Save org structure failed:", e);
    console.error("Error stack:", e.stack);
    return res.status(500).json({
      error: "Failed to save organization structure",
      details: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
}

interface ParsedRole {
  id: string;
  name: string;
  level: number;
  reports: string | null;
  children?: ParsedRole[];
}

interface OrgStructure {
  roles: ParsedRole[];
  hierarchy: ParsedRole | Record<string, never>;
  uploadedAt: string;
}

// Parse org text into structured data for organization_structure table
function parseOrgTextToStructure(orgText: string): OrgStructure {
  const lines = orgText.split('\n').filter(l => l.trim());
  const roles: ParsedRole[] = [];

  lines.forEach((line, index) => {
    const indent = line.search(/\S/);
    const level = Math.floor(indent / 2);
    const name = line.trim();

    roles.push({
      id: `role-${index}`,
      name,
      level,
      reports: level > 0 ? lines.slice(0, index).reverse().find(l => Math.floor(l.search(/\S/) / 2) === level - 1)?.trim() || null : null
    });
  });

  return {
    roles,
    hierarchy: buildHierarchy(roles),
    uploadedAt: new Date().toISOString()
  };
}

function buildHierarchy(roles: ParsedRole[]): ParsedRole | Record<string, never> {
  const root = roles.find(r => r.level === 0);
  if (!root) return {};

  const buildTree = (role: ParsedRole): ParsedRole => {
    const children = roles.filter(r => r.reports === role.name);
    return {
      ...role,
      children: children.map(buildTree)
    };
  };

  return buildTree(root);
}

interface StructureAnalysis {
  overallScore: number;
  spanAnalysis: {
    average: number;
    distribution: Record<string, number>;
    outliers: Array<{ role: string; span: number; recommendation: string }>;
  };
  layerAnalysis: {
    totalLayers: number;
    averageLayersToBottom: number;
    bottlenecks: Array<{ layer: number; roles: string[]; issue: string }>;
  };
  strategyAlignment?: {
    score: number;
    misalignments: Array<{
      area: string;
      issue: string;
      impact: 'high' | 'medium' | 'low';
    }>;
  };
  recommendations: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    actionItems: string[];
  }>;
  roles?: Array<{
    id: string;
    title: string;
    level: number;
  }>;
}

// Mock analysis generator
function generateMockStructureAnalysis(orgText: string): StructureAnalysis {
  // Count approximate employees and layers
  const lines = orgText.split('\n').filter(l => l.trim());
  const employeeCount = lines.length || 1; // Ensure at least 1
  const indents = lines.length > 0 ? lines.map(l => l.search(/\S/)) : [0];
  const maxIndent = Math.max(0, ...indents); // Ensure non-negative, default 0
  const layers = Math.floor(maxIndent / 2) + 1;

  return {
    overallScore: Math.floor(70 + Math.random() * 20), // 70-90
    spanAnalysis: {
      average: Math.floor(4 + Math.random() * 4), // 4-8
      distribution: {
        '1-3': Math.floor(employeeCount * 0.2),
        '4-7': Math.floor(employeeCount * 0.5),
        '8-12': Math.floor(employeeCount * 0.2),
        '13+': Math.floor(employeeCount * 0.1),
      },
      outliers: [
        {
          role: 'VP Engineering',
          span: 15,
          recommendation: 'Consider splitting into two teams with dedicated leads'
        },
        {
          role: 'Sales Director',
          span: 12,
          recommendation: 'Add regional sales managers to reduce span'
        }
      ]
    },
    layerAnalysis: {
      totalLayers: layers,
      averageLayersToBottom: Math.floor(layers * 0.6),
      bottlenecks: [
        {
          layer: 2,
          roles: ['VP Operations', 'VP Sales'],
          issue: 'High concentration of decision-making at this layer'
        }
      ]
    },
    strategyAlignment: {
      score: Math.floor(65 + Math.random() * 25), // 65-90
      misalignments: [
        {
          area: 'Product Development',
          issue: 'Disconnect between product vision and team structure',
          impact: 'high' as const
        },
        {
          area: 'Customer Success',
          issue: 'Insufficient representation at leadership level',
          impact: 'medium' as const
        }
      ]
    },
    recommendations: [
      {
        category: 'span' as const,
        priority: 'high' as const,
        title: 'Reduce Management Span',
        description: 'Several managers have spans exceeding optimal range of 7-8 direct reports',
        actionItems: [
          'Create team lead positions for large teams',
          'Redistribute responsibilities based on workload',
          'Consider promoting senior ICs to management'
        ]
      },
      {
        category: 'layers' as const,
        priority: 'medium' as const,
        title: 'Flatten Decision-Making',
        description: 'Too many approval layers slow down execution',
        actionItems: [
          'Empower mid-level managers with more autonomy',
          'Reduce required sign-offs for routine decisions',
          'Implement clear decision-making frameworks'
        ]
      },
      {
        category: 'alignment' as const,
        priority: 'high' as const,
        title: 'Align Structure with Strategy',
        description: 'Organization structure doesn\'t reflect stated strategic priorities',
        actionItems: [
          'Create dedicated product innovation team',
          'Elevate customer success to VP level',
          'Review and realign department goals with company vision'
        ]
      }
    ],
    roles: lines.map((line, idx) => ({
      id: `role-${idx}`,
      title: line.trim(),
      level: Math.floor(line.search(/\S/) / 2)
    }))
  };
}

// Get saved org structures
router.get("/structures", authenticate, async (req: Request, res: Response) => {
  try {
    const structures = await db.query.orgStructures.findMany({
      where: eq(orgStructures.tenantId, req.user!.tenantId!),
      orderBy: [desc(orgStructures.createdAt)],
      limit: 10,
    });
    
    return res.json({ structures });
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve structures" });
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
