import express, { Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { StructureAgent, StructureAnalysisOutput } from '../services/agents/structure-agent';
import { StructureData } from '../types/structure-types';
import { z } from 'zod';

const router = express.Router();

// Rate limiting for public endpoint to prevent abuse
const publicAnalysisLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    success: false,
    error: 'Too many analysis requests. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation schema
const analysisRequestSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  vision: z.string().max(500, 'Vision too long').optional(),
  mission: z.string().max(500, 'Mission too long').optional(),
  strategy: z.string().max(1000, 'Strategy too long').optional(),
  values: z.string().max(500, 'Values too long').optional(),
});

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max (reduced for public endpoint)
  },
  fileFilter: (req, file, cb) => {
    // Only accept CSV and TXT files
    if (file.mimetype === 'text/csv' || file.mimetype === 'text/plain' || file.originalname.endsWith('.csv') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and TXT files are allowed'));
    }
  }
});

/**
 * POST /api/public/structure/analyze
 * Public endpoint for FULL AI-powered structure analysis
 * Rate limited and input validated for security
 * Does NOT require authentication - intended for public demo/trial
 */
router.post('/analyze', publicAnalysisLimit, upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate file size (additional check)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum 5MB allowed.'
      });
    }

    // Validate request body
    let validatedInput;
    try {
      validatedInput = analysisRequestSchema.parse(req.body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validationError.errors.map(err => err.message)
        });
      }
      throw validationError;
    }

    const { companyName, vision, mission, strategy, values } = validatedInput;

    // Parse CSV/TXT file with size limits
    const fileContent = req.file.buffer.toString('utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    // Limit number of lines for public endpoint
    if (lines.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum 1000 lines allowed for public analysis.'
      });
    }

    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'File must contain at least 2 lines (header + data)'
      });
    }

    interface OrgEmployee {
      id: string;
      name: string;
      title?: string;
      department?: string;
      level: number;
      manager: string | null;
      reportsTo?: string | null;
    }

    // Parse org structure from CSV with input sanitization
    const orgStructure: OrgEmployee[] = [];
    const reportingRelationships: { [key: string]: string[] } = {};

    // Parse with input sanitization
    for (let i = 1; i < Math.min(lines.length, 501); i++) { // Limit to 500 employees for public
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(s => s.trim().slice(0, 100)); // Limit field length
      const [employee, manager] = parts;

      if (employee && employee.length > 0) {
        const sanitizedEmployee = employee.replace(/[<>\"']/g, ''); // Basic sanitization
        const sanitizedManager = manager && manager !== '' && manager.toLowerCase() !== 'none' 
          ? manager.replace(/[<>\"']/g, '') 
          : null;

        orgStructure.push({
          id: `emp-${i}`,
          name: sanitizedEmployee,
          level: 0,
          manager: sanitizedManager
        });

        if (sanitizedManager) {
          if (!reportingRelationships[sanitizedManager]) {
            reportingRelationships[sanitizedManager] = [];
          }
          reportingRelationships[sanitizedManager].push(sanitizedEmployee);
        }
      }
    }

    // Validate minimum data requirements
    if (orgStructure.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient data. At least 2 employees required for analysis.'
      });
    }

    // Build departments from employee data
    const departmentMap = new Map<string, { id: string; name: string; headCount: number; manager?: string }>();
    orgStructure.forEach(emp => {
      const deptName = emp.department || 'General';
      if (!departmentMap.has(deptName)) {
        departmentMap.set(deptName, {
          id: deptName.toLowerCase().replace(/\s+/g, '-'),
          name: deptName,
          headCount: 0
        });
      }
      const dept = departmentMap.get(deptName)!;
      dept.headCount++;
    });

    // Prepare structure data for AI analysis
    const structureData: StructureData = {
      departments: Array.from(departmentMap.values()),
      reportingLines: Object.entries(reportingRelationships).flatMap(([manager, reports]) =>
        (reports as string[]).map(report => ({
          from: report,
          to: manager,
          type: 'direct' as const
        }))
      ),
      roles: orgStructure.map(emp => ({
        id: emp.id,
        title: emp.title || 'Unknown',
        department: emp.department || 'General',
        level: emp.level,
        reportsTo: emp.reportsTo || undefined,
        directReports: (reportingRelationships[emp.id] as string[] | undefined) || []
      })),
      totalEmployees: orgStructure.length,
      organizationLevels: Math.max(...orgStructure.map(e => e.level), 1)
    };

    // Prepare strategy data
    const hasStrategy = vision || mission || strategy;
    const strategyData = hasStrategy ? {
      id: 'public-strategy',
      vision: vision || undefined,
      mission: mission || undefined,
      goals: [],
      priorities: [],
      targetMarket: undefined,
      competitiveAdvantage: undefined,
      growthStrategy: strategy || undefined
    } : undefined;

    // Run AI-powered structure analysis
    // Compliant with AGENT_CONTEXT_ULTIMATE.md - Strict TypeScript types
    const structureAgent = new StructureAgent();
    let richAnalysis: StructureAnalysisOutput | null = null;

    try {
      // Use timeout for public endpoint
      const analysisPromise = structureAgent.generateRichStructureAnalysis({
        tenantId: 'public-demo', // Special identifier for public analyses (not stored in DB)
        companyName: companyName.slice(0, 100), // Limit company name length
        structureData,
        strategyData,
        useFastMode: true // Use single call for speed in public demo
      });

      // Add timeout for public endpoint
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout')), 30000); // 30 second timeout
      });

      // ✅ PRODUCTION: Properly typed Promise.race (no 'as any')
      const agentResponse: StructureAnalysisOutput = await Promise.race([
        analysisPromise,
        timeoutPromise
      ]);

      // ✅ PRODUCTION: Map response to exact StructureAnalysisOutput type (no invalid properties)
      // gaps and hiringNeeds are not part of StructureAnalysisOutput interface
      richAnalysis = {
        overallScore: agentResponse.overallScore || 0,
        overallHealthInterpretation: agentResponse.overallHealthInterpretation,
        humanImpact: agentResponse.humanImpact,
        spanAnalysis: agentResponse.spanAnalysis,
        layerAnalysis: agentResponse.layerAnalysis,
        strategyAlignment: agentResponse.strategyAlignment,
        recommendations: (agentResponse.recommendations || []).slice(0, 5) // Limit recommendations for public
      };

    } catch (aiError) {
      const e = aiError as Error;
      logger.error('AI analysis error (public endpoint):', e.message);
      // Fall back to basic analysis if AI fails
      richAnalysis = null;
    }

    // Calculate basic metrics (fallback)
    const managers = Object.keys(reportingRelationships);
    const spansOfControl = managers.map(m => reportingRelationships[m].length);
    const avgSpan = spansOfControl.reduce((a, b) => a + b, 0) / spansOfControl.length || 0;
    const maxSpan = Math.max(...spansOfControl, 0);

    // Find bottlenecks
    const bottlenecks = managers.filter(m => reportingRelationships[m].length > 7);

    // Calculate scores
    const spanVariance = spansOfControl.reduce((acc, span) => acc + Math.pow(span - avgSpan, 2), 0) / spansOfControl.length || 0;
    const entropyScore = Math.min(100, Math.round((spanVariance * 10) + (bottlenecks.length * 5)));
    const healthScore = Math.max(0, 100 - entropyScore);

    // Sanitize output
    const sanitizedResponse = {
      success: true,
      message: richAnalysis ? 'AI-powered structure analysis complete!' : 'Basic structure analysis complete. Sign up for full AI insights.',
      data: {
        richAnalysis,
        entropyScore,
        healthScore,
        employeeCount: orgStructure.length,
        managerCount: managers.length,
        avgSpan: Math.round(avgSpan * 10) / 10,
        maxSpan,
        bottlenecks: bottlenecks.slice(0, 10).map(name => ({ // Limit bottlenecks shown
          name: name.slice(0, 50), // Limit name length in response
          directReports: reportingRelationships[name].length
        })),
        companyName: companyName.slice(0, 100),
        isPreview: true,
        upgradeMessage: 'This is a free scan. Sign up to unlock:\n• Historical trend tracking\n• Detailed reports and exports\n• Team collaboration features\n• Ongoing monitoring'
      }
    };

    return res.status(200).json(sanitizedResponse);

  } catch (error) {
    const e = error as Error;
    logger.error('Public structure analysis error:', e.message);
    
    // Don't expose internal error details in public endpoint
    return res.status(500).json({
      success: false,
      error: 'Analysis failed. Please ensure your file is properly formatted and try again.'
    });
  }
});

// Health check for public endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Public structure analysis endpoint is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;