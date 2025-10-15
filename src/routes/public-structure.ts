import express, { Request, Response } from 'express';
import multer from 'multer';
import { StructureAgent } from '../services/agents/structure-agent';
import { StructureData, Role } from '../types/structure-types';

const router = express.Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
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
 * Now collects company info and runs complete Structure Agent
 */
router.post('/analyze', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { companyName, vision, mission, strategy, values } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    // Parse CSV/TXT file
    const fileContent = req.file.buffer.toString('utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

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

    // Parse org structure from CSV
    const orgStructure: OrgEmployee[] = [];
    const reportingRelationships: { [key: string]: string[] } = {};

    // Parse (assuming format: Employee, Manager or Name, Reports To)
    for (let i = 1; i < lines.length; i++) {
      const [employee, manager] = lines[i].split(',').map(s => s.trim());
      if (employee) {
        orgStructure.push({
          id: `emp-${i}`,
          name: employee,
          level: 0, // Will be calculated later
          manager: manager && manager !== '' && manager.toLowerCase() !== 'none' ? manager : null
        });

        if (manager && manager !== '' && manager.toLowerCase() !== 'none') {
          if (!reportingRelationships[manager]) {
            reportingRelationships[manager] = [];
          }
          reportingRelationships[manager].push(employee);
        }
      }
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

    // Prepare structure data for AI analysis in proper StructureData format
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

    // Prepare strategy data in proper StrategyData format
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

    // Run FULL AI-powered structure analysis using Structure Agent
    const structureAgent = new StructureAgent();
    let richAnalysis: any | null = null;

    try {
      const agentResponse = await structureAgent.generateRichStructureAnalysis({
        tenantId: 'public', // Special tenant ID for public analyses
        companyName,
        structureData,
        strategyData,
        useFastMode: true // Use single Gemini call for speed (~3-5 seconds vs ~30+ seconds)
      });

      // Transform agent response to match frontend expectations
      richAnalysis = {
        overallAssessment: agentResponse.overallHealthInterpretation || '',
        keyFindings: [
          agentResponse.spanAnalysis?.interpretation || `Span of Control: Average ${agentResponse.spanAnalysis?.average || 0} direct reports`,
          agentResponse.layerAnalysis?.interpretation || `Organization Layers: ${agentResponse.layerAnalysis?.totalLayers || 0} hierarchical levels`,
          agentResponse.strategyAlignment?.interpretation || `Strategy Alignment: ${agentResponse.strategyAlignment?.score || 0}% score`,
          agentResponse.humanImpact?.interpretation
        ].filter(Boolean),
        recommendations: agentResponse.recommendations || []
      };
    } catch (aiError) {
      const e = aiError as Error;
      console.error('AI analysis error:', e);
      // Fall back to basic analysis if AI fails
      richAnalysis = null;
    }

    // Calculate basic metrics (fallback or supplement to AI)
    const managers = Object.keys(reportingRelationships);
    const spansOfControl = managers.map(m => reportingRelationships[m].length);
    const avgSpan = spansOfControl.reduce((a, b) => a + b, 0) / spansOfControl.length || 0;
    const maxSpan = Math.max(...spansOfControl, 0);

    // Find bottlenecks (managers with >7 direct reports)
    const bottlenecks = managers.filter(m => reportingRelationships[m].length > 7);

    // Simple entropy score (0-100, lower is better)
    const spanVariance = spansOfControl.reduce((acc, span) => acc + Math.pow(span - avgSpan, 2), 0) / spansOfControl.length || 0;
    const entropyScore = Math.min(100, Math.round((spanVariance * 10) + (bottlenecks.length * 5)));

    // Health score (0-100, higher is better)
    const healthScore = Math.max(0, 100 - entropyScore);

    // Return response with BOTH rich AI analysis AND basic metrics
    return res.status(200).json({
      success: true,
      message: richAnalysis ? 'AI-powered structure analysis complete!' : 'Basic structure analysis complete. Sign up for full AI insights.',
      data: {
        // Rich AI analysis (if available)
        richAnalysis,

        // Basic metrics (always available)
        entropyScore,
        healthScore,
        employeeCount: orgStructure.length,
        managerCount: managers.length,
        avgSpan: Math.round(avgSpan * 10) / 10,
        maxSpan,
        bottlenecks: bottlenecks.map(name => ({
          name,
          directReports: reportingRelationships[name].length
        })),

        // Company info
        companyName,

        // Watermark for public access
        isPreview: true,
        upgradeMessage: 'This is a free scan. Sign up to unlock:\n• Historical trend tracking\n• Detailed reports and exports\n• Team collaboration features\n• Ongoing monitoring'
      }
    });

  } catch (error) {
    const e = error as Error;
    console.error('Public structure analysis error:', e);
    return res.status(500).json({
      success: false,
      error: 'Analysis failed. Please ensure your file is properly formatted.'
    });
  }
});

export default router;
