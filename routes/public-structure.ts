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
 * Public endpoint for structure analysis - no authentication required
 * Rate limited and returns watermarked/limited results
 */
router.post('/analyze', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
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

    // Basic structure analysis
    // For public access, we provide limited insights (no full AI analysis)
    const employeeCount = lines.length - 1; // Exclude header

    // Simple entropy calculation based on reporting relationships
    // This is a simplified version - full analysis requires authentication
    const reportingRelationships: { [key: string]: string[] } = {};

    // Parse basic structure (assuming format: Employee, Manager)
    for (let i = 1; i < lines.length; i++) {
      const [employee, manager] = lines[i].split(',').map(s => s.trim());
      if (manager && manager !== '' && manager.toLowerCase() !== 'none') {
        if (!reportingRelationships[manager]) {
          reportingRelationships[manager] = [];
        }
        reportingRelationships[manager].push(employee);
      }
    }

    // Calculate basic metrics
    const managers = Object.keys(reportingRelationships);
    const spansOfControl = managers.map(m => reportingRelationships[m].length);
    const avgSpan = spansOfControl.reduce((a, b) => a + b, 0) / spansOfControl.length || 0;
    const maxSpan = Math.max(...spansOfControl, 0);

    // Find bottlenecks (managers with >7 direct reports)
    const bottlenecks = managers.filter(m => reportingRelationships[m].length > 7);

    // Simple entropy score (0-100, lower is better)
    // Based on span variance and bottleneck count
    const spanVariance = spansOfControl.reduce((acc, span) => acc + Math.pow(span - avgSpan, 2), 0) / spansOfControl.length || 0;
    const entropyScore = Math.min(100, Math.round((spanVariance * 10) + (bottlenecks.length * 5)));

    // Health score (0-100, higher is better)
    const healthScore = Math.max(0, 100 - entropyScore);

    // Limited public response (watermarked)
    return res.status(200).json({
      success: true,
      message: 'Basic structure analysis complete. Sign up for full insights.',
      data: {
        entropyScore,
        healthScore,
        employeeCount,
        managerCount: managers.length,
        avgSpan: Math.round(avgSpan * 10) / 10,
        maxSpan,
        bottlenecks: bottlenecks.map(name => ({ name, directReports: reportingRelationships[name].length })),
        // Watermark for public access
        isPreview: true,
        upgradeMessage: 'This is a basic scan. Sign up to unlock:\n• Detailed AI-powered analysis\n• Strategy alignment insights\n• Comprehensive recommendations\n• Historical trend tracking'
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
