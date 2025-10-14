import express, { Request, Response } from 'express';
import multer from 'multer';
import { StructureAgent } from '../services/agents/structure-agent.js';

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

    // Parse org structure from CSV
    const orgStructure: any[] = [];
    const reportingRelationships: { [key: string]: string[] } = {};

    // Parse (assuming format: Employee, Manager or Name, Reports To)
    for (let i = 1; i < lines.length; i++) {
      const [employee, manager] = lines[i].split(',').map(s => s.trim());
      if (employee) {
        orgStructure.push({
          name: employee,
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

    // Prepare structure data for AI analysis
    const structureData = {
      employees: orgStructure,
      reportingRelationships,
      totalEmployees: orgStructure.length,
      managers: Object.keys(reportingRelationships)
    };

    // Prepare strategy data
    const strategyData = {
      vision: vision || '',
      mission: mission || '',
      strategy: strategy || '',
      values: values ? values.split(',').map((v: string) => v.trim()) : []
    };

    // Run FULL AI-powered structure analysis using Structure Agent
    const structureAgent = new StructureAgent();
    let richAnalysis: any = null;

    try {
      const agentResponse = await structureAgent.generateRichStructureAnalysis({
        tenantId: 'public', // Special tenant ID for public analyses
        companyName,
        structureData,
        strategyData: vision || mission || strategy ? strategyData : undefined,
        useFastMode: true // Use single Gemini call for speed (~3-5 seconds vs ~30+ seconds)
      });

      // Transform agent response to match frontend expectations
      richAnalysis = {
        overallAssessment: agentResponse.overallHealthInterpretation || '',
        keyFindings: [
          agentResponse.spanAnalysis?.interpretation,
          agentResponse.layerAnalysis?.interpretation,
          agentResponse.strategyAlignment?.interpretation,
          agentResponse.humanImpact?.interpretation
        ].filter(Boolean),
        recommendations: agentResponse.recommendations || []
      };
    } catch (aiError: any) {
      console.error('AI analysis error:', aiError);
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

  } catch (error: any) {
    console.error('Public structure analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Analysis failed. Please ensure your file is properly formatted.'
    });
  }
});

export default router;
