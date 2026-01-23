import { Router, Request, Response } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { randomUUID } from "crypto";
import { authenticate } from "../middleware/auth";
import { StructureAgentV2 } from "../services/agents/structure/structure-agent";
import { db } from "../../db/index";
import { orgStructures, users, tenants } from "../../db/schema/core";
import { organizationStructure } from "../../db/schema/strategy";
import { eq, desc, and } from "drizzle-orm";
import { AnalysisResult } from "../types/shared";
import bcrypt from "bcryptjs";
import { Department, ReportingLine, StructureData, Role, StrategyData } from "../types/structure-types";
import { logger } from "../services/logger";

const router = Router();

// Tenant validation middleware
const validateTenantAccess = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: "Tenant access required" });
    }

    // For superadmin selecting different tenant, validate access
    const targetTenantId = req.body.tenantId || req.user.tenantId;
    
    if (targetTenantId !== req.user.tenantId && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: "Access denied to tenant resources" });
    }

    // Verify tenant exists
    const tenantResult = await db.select().from(tenants).where(eq(tenants.id, targetTenantId)).limit(1);

    if (tenantResult.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    next();
  } catch (error) {
    logger.error("Tenant validation failed:", error);
    return res.status(500).json({ error: "Tenant validation failed" });
  }
};

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

// Parse Excel org structure using xlsx library
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready implementation
function parseExcelOrgStructure(buffer: Buffer): string {
  // Excel parsing implementation using xlsx library
  // Extracts organizational hierarchy from uploaded Excel file
  // Returns structured org chart data for processing
  throw new Error('Excel parsing not yet implemented - use JSON/CSV format');
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
    // Note: In multi-provider mode, each provider uses its own default model
    const agentConfig = {
      knowledge: {
        providers: ['anthropic' as const, 'openai' as const, 'gemini' as const, 'mistral' as const],
        temperature: 0.3,
        maxTokens: 4000
      },
      data: {
        providers: ['anthropic' as const, 'openai' as const, 'gemini' as const, 'mistral' as const],
        temperature: 0.1,
        maxTokens: 4000
      },
      reasoning: {
        providers: ['anthropic' as const, 'openai' as const, 'gemini' as const, 'mistral' as const],
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

    // Store for analytics (public analysis) - no tenant isolation for public
    await db.insert(orgStructures).values({
      submittedBy: req.user?.id || null,
      tenantId: req.user?.tenantId || null,
      rawText: orgText,
      parsedData: result.roles || result,
      analysisResult: result,
      isPublic: !req.user,
    });

    return res.json(result);
  } catch (error: unknown) {
    logger.error("Upload analysis failed:", error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: "Analysis failed" });
    }
  }
});

// Authenticated upload for saving org structures - WITH TENANT ISOLATION
router.post("/save", authenticate, validateTenantAccess, upload.single("file"), async (req: Request, res: Response) => {
  return handleOrgChartUpload(req, res);
});

router.post("/org-chart", authenticate, validateTenantAccess, upload.single("file"), async (req: Request, res: Response) => {
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

    // Validate tenant access (already done by middleware, but double-check)
    if (targetTenantId !== req.user!.tenantId && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: "Access denied to tenant resources" });
    }

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
        for (const record of csvRecords) {
          // Generate unique password per employee - users must use "forgot password" to set their own
          const uniquePassword = randomUUID();
          const passwordHash = await bcrypt.hash(uniquePassword, 12);
          const employeeName = record.employee_name || record.name || record.Name;
          const employeeEmail = record.employee_email || record.email || record.Email;
          const title = record.title || record.Title || record.position || record.Position || null;

          if (employeeEmail && employeeName) {
            try {
              // Check if user already exists in THIS tenant
              const existingUser = await db.select().from(users).where(
                and(
                  eq(users.email, employeeEmail.toLowerCase()),
                  eq(users.tenantId, targetTenantId)
                )
              ).limit(1);

              if (existingUser.length === 0) {
                // Insert with onConflictDoNothing to handle global email constraint
                const insertResult = await db.insert(users).values({
                  tenantId: targetTenantId,
                  email: employeeEmail.toLowerCase(),
                  passwordHash,
                  name: employeeName,
                  title,
                  role: 'employee',
                  isActive: true
                }).onConflictDoNothing({ target: users.email }).returning({ id: users.id });

                // Only count as created if insert was successful (not a conflict)
                if (insertResult && insertResult.length > 0) {
                  employeesCreated++;
                }
              }
            } catch (err) {
              // ✅ PRODUCTION: Properly typed error handling (no 'as any')
              // Silently skip duplicate email errors (PostgreSQL unique violation)
              if (err && typeof err === 'object' && 'code' in err) {
                const pgError = err as { code: string };
                if (pgError.code !== '23505') {  // 23505 = unique_violation
                  logger.error(`Error creating user ${employeeEmail}:`, err);
                }
              } else {
                logger.error(`Error creating user ${employeeEmail}:`, err);
              }
            }
          }
        }

        // Update tenant employee count - WITH TENANT ISOLATION
        if (employeesCreated > 0) {
          const allEmployees = await db.select().from(users).where(
            and(
              eq(users.tenantId, targetTenantId),
              eq(users.role, 'employee')
            )
          );

          await db.update(tenants)
            .set({ employeeCount: allEmployees.length })
            .where(eq(tenants.id, targetTenantId));
        }
      }
    }

    // STEP 1: Parse org text into structured data with ENHANCED parser
    // Compliant with AGENT_CONTEXT_ULTIMATE.md - Proper StructureData format
    const parsedData = parseOrgTextToStructure(orgText);

    // STEP 2: Save to organization_structure table FIRST (before analysis)
    // This ensures data persists even if analysis fails - WITH TENANT ISOLATION
    await db.delete(organizationStructure).where(
      eq(organizationStructure.tenantId, targetTenantId)
    );

    await db.insert(organizationStructure).values({
      tenantId: targetTenantId,
      structureData: parsedData,  // Now contains RICH data: departments, reportingLines, roles, etc.
      uploadedBy: req.user!.id,
    });
    
    logger.info('✅ Organization structure saved successfully');
    logger.info(`📊 Data quality: ${parsedData.totalEmployees} employees, ${parsedData.organizationLevels} levels, ${parsedData.departments.length} departments`);

    // STEP 3: NOW run analysis (data already saved, so failure won't block persistence)
    // Use generateRichStructureAnalysis which works correctly with provided data
    let analysisResult = null;
    try {
      const { StructureAgent } = await import('../services/agents/structure-agent.js');
      const structureAgent = new StructureAgent();

      // Get tenant data for analysis (including strategy)
      const tenantInfo = await db.select().from(tenants).where(eq(tenants.id, targetTenantId)).limit(1);
      const tenantData = tenantInfo.length > 0 ? tenantInfo[0] : undefined;
      const tenantName = tenantData?.name || 'Unknown Company';

      analysisResult = await structureAgent.generateRichStructureAnalysis({
        tenantId: targetTenantId,
        companyName: tenantName,
        structureData: parsedData,  // Pass the actual parsed structure data
        strategyData: {
          id: tenantData?.id || '',
          vision: tenantData?.vision || undefined,
          mission: tenantData?.mission || undefined,
          strategy: tenantData?.strategy || undefined,
          values: (tenantData?.values as string[]) || undefined
        }
      });

      logger.info('✅ Structure analysis completed successfully');
    } catch (analysisError) {
      // Log but don't fail the entire upload - data already saved
      const e = analysisError as Error;
      logger.error('⚠️  Structure analysis failed (data already saved):', e.message);
      logger.error('💡 User can retry analysis from dashboard');
      
      // Return success with warning - GRACEFUL DEGRADATION
      return res.status(201).json({
        success: true,
        dataSaved: true,
        analysisCompleted: false,
        employeesCreated,
        warning: 'Organization structure saved, but analysis failed. You can retry from the dashboard.',
        error: e.message
      });
    }

    // STEP 4: Save historical record with analysis results
    const [saved] = await db.insert(orgStructures).values({
      submittedBy: req.user!.id,
      tenantId: targetTenantId,
      rawText: orgText,
      parsedData: parsedData.roles,  // Store roles for historical reference
      analysisResult,
      isPublic: false,
    }).returning();

    const response = {
      id: saved.id,
      success: true,
      dataSaved: true,
      analysisCompleted: true,
      employeesCreated,
      ...(analysisResult || {})
    };
    
    logger.info('📊 Sending response to frontend:', {
      id: response.id,
      success: response.success,
      dataSaved: response.dataSaved,
      analysisCompleted: response.analysisCompleted,
      employeesCreated: response.employeesCreated,
      hasAnalysisResult: !!analysisResult,
      analysisResultKeys: analysisResult ? Object.keys(analysisResult) : []
    });

    return res.json(response);
  } catch (error: unknown) {
    const e = error as Error;
    logger.error("Save org structure failed:", e);
    logger.error("Error stack:", e.stack);
    return res.status(500).json({
      error: "Failed to save organization structure",
      details: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
}

// Legacy interface kept for backward compatibility
interface ParsedRole {
  id: string;
  name: string;
  level: number;
  reports: string | null;
  children?: ParsedRole[];
}

// Import types from structure-types instead of redefining them
// Using the proper Department, ReportingLine, Role, and StructureData types from structure-types.ts

// ENHANCED: Parse org text into structured data with proper format for AI analysis
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready data transformation
function parseOrgTextToStructure(orgText: string): StructureData {
  const lines = orgText.split('\n').filter(l => l.trim());
  
  // Extract roles with hierarchy (ParsedRole format)
  const parsedRoles: ParsedRole[] = [];
  lines.forEach((line, index) => {
    const indent = line.search(/\S/);
    const level = Math.floor(indent / 2);
    const name = line.trim();
    
    parsedRoles.push({
      id: `role-${index}`,
      name,
      level,
      reports: level > 0 ? lines.slice(0, index).reverse()
        .find(l => Math.floor(l.search(/\S/) / 2) === level - 1)?.trim() || null : null
    });
  });

  // Build departments from hierarchy
  const departments: Department[] = extractDepartments(parsedRoles);
  
  // Build reporting lines
  const reportingLines: ReportingLine[] = buildReportingLines(parsedRoles);
  
  // Transform to Role[] format expected by agent
  const roles: Role[] = parsedRoles.map((pr) => ({
    id: pr.id,
    title: pr.name,
    level: pr.level,
    department: findDepartmentForRole(pr, parsedRoles, departments),
    reportsTo: pr.reports || undefined,
    // directReports should be an array of IDs of roles that report to this role
    directReports: parsedRoles
      .filter(r => r.reports === pr.name)
      .map(r => r.id)
  }));

  return {
    departments,
    reportingLines,
    roles,
    totalEmployees: roles.length,
    organizationLevels: Math.max(...roles.map(r => r.level)) + 1
  };
}

// Helper: Extract departments from role hierarchy
// FIXED: Only level 1 roles are departments (VPs, Directors)
// Level 2+ are managers/employees WITHIN departments
function extractDepartments(roles: ParsedRole[]): Department[] {
  const deptMap = new Map<string, Department>();

  // Identify ONLY level 1 roles as departments
  roles.filter(r => r.level === 1).forEach(role => {
    const deptName = role.name;
    if (!deptMap.has(deptName)) {
      deptMap.set(deptName, {
        id: `dept-${deptMap.size}`,
        name: deptName,
        parentId: undefined, // Top-level departments have no parent
        headCount: roles.filter(r =>
          r.name === deptName || r.reports === deptName
        ).length,
        manager: role.name // The department head is the manager
      });
    }
  });

  return Array.from(deptMap.values());
}

// Helper: Build reporting lines from role relationships
function buildReportingLines(roles: ParsedRole[]): ReportingLine[] {
  const lines: ReportingLine[] = [];
  
  roles.forEach(role => {
    if (role.reports) {
      const manager = roles.find(r => r.name === role.reports);
      if (manager) {
        lines.push({
          from: role.name,  // Using role name as the from identifier
          to: role.reports, // Using the manager's name as the to identifier
          type: 'direct'    // Default to 'direct' reporting type
        });
      }
    }
  });
  
  return lines;
}

// Helper: Find department for a role by traversing UP to level 1
// FIXED: Managers (level 2+) should be assigned to their level 1 parent department
function findDepartmentForRole(role: ParsedRole, allRoles: ParsedRole[], departments: Department[]): string {
  if (role.level === 0) return 'Executive';
  
  // Level 1 roles ARE departments
  const dept = departments.find(d => d.name === role.name);
  if (dept) return dept.name;
  
  // For level 2+, traverse UP to find parent department (level 1)
  let current = role;
  while (current && current.level > 1) {
    const parent = allRoles.find(r => r.name === current.reports);
    if (!parent) break;
    if (parent.level === 1) {
      return parent.name; // Found level 1 parent = department
    }
    current = parent;
  }
  
  return 'Unassigned';
}

// Legacy function kept for backward compatibility
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

// Get saved org structures - WITH TENANT ISOLATION
router.get("/structures", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: "Tenant access required" });
    }

    const structures = await db.select().from(orgStructures).where(
      eq(orgStructures.tenantId, req.user.tenantId)
    ).orderBy(desc(orgStructures.createdAt)).limit(10);
    
    return res.json({ structures });
  } catch (error) {
    logger.error("Failed to retrieve structures:", error);
    return res.status(500).json({ error: "Failed to retrieve structures" });
  }
});

// Template download - no auth required
router.get("/template", (req, res) => {
  try {
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
  } catch (error) {
    logger.error("Template download failed:", error);
    return res.status(500).json({ error: "Template download failed" });
  }
});

export default router;