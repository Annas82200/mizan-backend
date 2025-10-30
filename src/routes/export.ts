import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
// import { validateTenantAccess } from '../middleware/tenant';
import { db } from '../../db/index';
import { orgStructures } from '../db/schema/core';
import { eq, and } from 'drizzle-orm';

const router = Router();
router.use(authenticate);
// router.use(validateTenantAccess);

// Custom sophisticated icons for structure analysis
const ICONS = {
  structure: '⬡', // Hexagon for organizational structure
  span: '◬', // Diamond for span of control
  layers: '⬢', // Layered hexagon for hierarchy
  strategy: '◈', // Star diamond for strategy
  alignment: '◉', // Target circle for alignment
  recommendation: '◆', // Diamond bullet for recommendations
  gap: '◭', // Half-filled diamond for gaps
  strength: '◐', // Half circle for strengths
  score: '◙', // Filled diamond for scores
  warning: '◮', // Triangle warning
  success: '◕', // Checkmark circle
  metric: '◫', // Square with dot
};

interface SpanAnalysis {
  average: number;
  distribution: Record<string, number>;
  outliers?: Array<{ role: string; span: number; recommendation: string }>;
  interpretation?: string;
}

interface LayerAnalysis {
  totalLayers: number;
  averageLayersToBottom: number;
  bottlenecks?: Array<{ layer: number; roles: string[]; issue: string }>;
  interpretation?: string;
}

interface StrategyAlignment {
  score: number;
  alignments?: string[];
  misalignments?: Array<{ area: string; issue: string; recommendation: string; impact?: string }>;
  interpretation?: string;
  canAchieveStrategy?: boolean;
  hasStrategy?: boolean;
  achievabilityExplanation?: string;
  strengths?: string[];
}

interface Recommendation {
  category: string;
  priority: string;
  title: string;
  description: string;
  actionItems?: string[];
  expectedImpact?: string;
}

interface AnalysisExport {
  overallScore: number;
  operationalScore: number;
  spanAnalysis: SpanAnalysis;
  layerAnalysis: LayerAnalysis;
  strategyAlignment: StrategyAlignment;
  recommendations: Recommendation[];
}

// Validate that analysis data belongs to the authenticated tenant
async function validateAnalysisOwnership(
  analysisId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const analysis = await db.select()
      .from(orgStructures)
      .where(
        and(
          eq(orgStructures.id, analysisId),
          eq(orgStructures.tenantId, tenantId)
        )
      )
      .limit(1);

    return analysis.length > 0;
  } catch (error) {
    console.error('Error validating analysis ownership:', error);
    return false;
  }
}

// Helper function to format text with visual enhancement for subtitles
function formatRichText(text: string): string {
  // Convert **Bold Text** to styled subtitle elements
  let formatted = text.replace(/\*\*([^*]+)\*\*/g, '<span class="subtitle">$1</span>');

  // Convert line breaks to <br> tags
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function generateHTMLExport(data: AnalysisExport, tenantName: string): string {
  const { overallScore, operationalScore, spanAnalysis, layerAnalysis, strategyAlignment, recommendations } = data;

  // Determine score color and label
  let scoreColor = '#22c55e'; // green
  let scoreLabel = 'Excellent';
  if (overallScore < 50) {
    scoreColor = '#ef4444';
    scoreLabel = 'Critical';
  } else if (overallScore < 70) {
    scoreColor = '#f59e0b';
    scoreLabel = 'Needs Attention';
  } else if (overallScore < 85) {
    scoreColor = '#CCA404';
    scoreLabel = 'Good';
  }

  const canAchieve = strategyAlignment.canAchieveStrategy;
  let achieveColor = '#22c55e';
  let achieveLabel = 'Yes';
  if (canAchieve === false) {
    achieveColor = '#ef4444';
    achieveLabel = 'No';
  } else if (canAchieve === undefined) {
    achieveColor = '#f59e0b';
    achieveLabel = 'Unknown';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organizational Structure Analysis - ${tenantName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
      color: #3F3D56;
      line-height: 1.6;
      padding: 60px 40px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(63, 61, 86, 0.08);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #3F3D56 0%, #545454 100%);
      padding: 80px 60px;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(204, 164, 4, 0.1) 0%, transparent 70%);
      border-radius: 50%;
    }

    .header-content {
      position: relative;
      z-index: 1;
    }

    .company-name {
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 56px;
      font-weight: 600;
      color: white;
      margin-bottom: 20px;
      line-height: 1.2;
    }

    .report-date {
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 400;
    }

    .score-hero {
      padding: 60px;
      background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
      border-bottom: 1px solid rgba(63, 61, 86, 0.08);
    }

    .score-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 40px;
      align-items: start;
    }

    .score-card {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(63, 61, 86, 0.06);
      transition: transform 500ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 500ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .score-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 48px rgba(63, 61, 86, 0.12);
    }

    .score-icon {
      font-size: 32px;
      margin-bottom: 16px;
      opacity: 0.8;
    }

    .score-label {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #545454;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .score-value {
      font-family: 'Playfair Display', serif;
      font-size: 72px;
      font-weight: 600;
      line-height: 1;
      margin-bottom: 8px;
    }

    .score-caption {
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 500;
      margin-top: 12px;
    }

    .content {
      padding: 80px 60px;
    }

    .section {
      margin-bottom: 80px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    h2 {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      font-weight: 600;
      color: #3F3D56;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    h2 .icon {
      font-size: 32px;
      opacity: 0.7;
    }

    h3 {
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #3F3D56;
      margin-bottom: 20px;
      margin-top: 40px;
    }

    .strategy-verdict {
      background: ${canAchieve === false ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : canAchieve === undefined ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'};
      padding: 40px;
      border-radius: 16px;
      border-left: 4px solid ${achieveColor};
      margin: 32px 0;
    }

    .verdict-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .verdict-icon {
      font-size: 40px;
      color: ${achieveColor};
    }

    .verdict-title {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 600;
      color: ${achieveColor === '#ef4444' ? '#991b1b' : achieveColor === '#f59e0b' ? '#92400e' : '#166534'};
    }

    .verdict-text {
      font-size: 16px;
      line-height: 1.8;
      color: #3F3D56;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-top: 32px;
    }

    .metric-card {
      background: #fafafa;
      padding: 28px;
      border-radius: 12px;
      border: 1px solid rgba(63, 61, 86, 0.08);
    }

    .metric-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .metric-icon {
      font-size: 20px;
      color: #CCA404;
    }

    .metric-title {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #545454;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .metric-value {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      font-weight: 600;
      color: #3F3D56;
      line-height: 1;
    }

    .distribution-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 24px;
    }

    .distribution-item {
      text-align: center;
      padding: 20px;
      background: white;
      border-radius: 8px;
      border: 1px solid rgba(63, 61, 86, 0.08);
    }

    .distribution-label {
      font-size: 13px;
      color: #545454;
      margin-bottom: 8px;
    }

    .distribution-value {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 600;
      color: #3F3D56;
    }

    .gap-list {
      margin-top: 24px;
    }

    .gap-item {
      background: white;
      padding: 28px;
      border-radius: 12px;
      border-left: 4px solid #ef4444;
      margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(63, 61, 86, 0.04);
    }

    .gap-item.medium {
      border-left-color: #f59e0b;
    }

    .gap-item.low {
      border-left-color: #3b82f6;
    }

    .gap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .gap-title {
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: #3F3D56;
    }

    .gap-impact {
      font-size: 11px;
      font-weight: 700;
      color: white;
      background: #ef4444;
      padding: 4px 12px;
      border-radius: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .gap-impact.medium {
      background: #f59e0b;
    }

    .gap-impact.low {
      background: #3b82f6;
    }

    .gap-description {
      font-size: 15px;
      color: #545454;
      line-height: 1.7;
    }

    .recommendation-list {
      margin-top: 32px;
    }

    .recommendation-card {
      background: linear-gradient(135deg, #fafafa 0%, white 100%);
      padding: 32px;
      border-radius: 16px;
      margin-bottom: 24px;
      border: 1px solid rgba(63, 61, 86, 0.08);
      transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .recommendation-card:hover {
      transform: translateX(8px);
      border-color: #CCA404;
      box-shadow: 0 12px 40px rgba(204, 164, 4, 0.12);
    }

    .rec-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .rec-icon {
      font-size: 24px;
      color: #CCA404;
    }

    .rec-priority {
      font-size: 11px;
      font-weight: 700;
      color: white;
      background: #ef4444;
      padding: 4px 12px;
      border-radius: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .rec-priority.medium {
      background: #f59e0b;
    }

    .rec-priority.low {
      background: #3b82f6;
    }

    .rec-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 600;
      color: #3F3D56;
      margin-bottom: 12px;
    }

    .rec-description {
      font-size: 15px;
      color: #545454;
      line-height: 1.8;
      margin-bottom: 20px;
    }

    .subtitle {
      display: block;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #CCA404;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 16px;
      margin-bottom: 8px;
    }

    .action-items {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 3px solid #CCA404;
    }

    .action-item {
      font-size: 14px;
      color: #3F3D56;
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
    }

    .action-item::before {
      content: '◆';
      position: absolute;
      left: 0;
      color: #CCA404;
      font-size: 12px;
    }

    .strength-list {
      margin-top: 24px;
    }

    .strength-item {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      padding: 20px 24px;
      border-radius: 12px;
      margin-bottom: 12px;
      border-left: 3px solid #22c55e;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .strength-icon {
      font-size: 24px;
      color: #22c55e;
    }

    .strength-text {
      font-size: 15px;
      color: #166534;
      line-height: 1.6;
    }

    .footer {
      background: #3F3D56;
      padding: 40px 60px;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }

    .footer-logo {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      color: white;
      margin-bottom: 12px;
    }

    @media print {
      body {
        padding: 0;
        background: white;
      }
      .container {
        box-shadow: none;
      }
      .score-card:hover,
      .recommendation-card:hover {
        transform: none;
      }
    }

    @media (max-width: 768px) {
      .score-grid {
        grid-template-columns: 1fr;
      }
      .distribution-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      h1 {
        font-size: 36px;
      }
      .content, .header, .score-hero, .footer {
        padding: 40px 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="company-name">${tenantName}</div>
        <h1>Organizational Structure Analysis</h1>
        <div class="report-date">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>

    <!-- Score Hero -->
    <div class="score-hero">
      <div class="score-grid">
        <div class="score-card" style="border-top: 4px solid ${scoreColor};">
          <div class="score-icon">${ICONS.score}</div>
          <div class="score-label">Overall Structure Score</div>
          <div class="score-value" style="color: ${scoreColor};">${overallScore}</div>
          <div style="font-family: 'Playfair Display', serif; font-size: 20px; color: #545454;">/100</div>
          <div class="score-caption" style="color: ${scoreColor};">${scoreLabel}</div>
        </div>

        <div class="score-card" style="border-top: 4px solid #CCA404;">
          <div class="score-icon">${ICONS.metric}</div>
          <div class="score-label">Operational Efficiency</div>
          <div class="score-value" style="color: #CCA404;">${operationalScore}</div>
          <div style="font-family: 'Playfair Display', serif; font-size: 20px; color: #545454;">/100</div>
        </div>

        <div class="score-card" style="border-top: 4px solid ${achieveColor};">
          <div class="score-icon">${ICONS.strategy}</div>
          <div class="score-label">Can Achieve Strategy?</div>
          <div class="score-value" style="color: ${achieveColor}; font-size: 48px;">${achieveLabel}</div>
          <div style="font-size: 14px; color: #545454; margin-top: 8px;">Alignment: ${strategyAlignment.score}/100</div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Strategy Alignment -->
      <div class="section">
        <h2><span class="icon">${ICONS.strategy}</span>Strategy Alignment</h2>

        ${strategyAlignment.hasStrategy ? `
        <div class="strategy-verdict">
          <div class="verdict-header">
            <div class="verdict-icon">${canAchieve === false ? ICONS.warning : canAchieve === undefined ? ICONS.gap : ICONS.success}</div>
            <div class="verdict-title">Can You Achieve Your Strategy?</div>
          </div>
          <div class="verdict-text">${strategyAlignment.achievabilityExplanation}</div>
        </div>

        ${strategyAlignment.misalignments && strategyAlignment.misalignments.length > 0 ? `
        <h3>Critical Gaps to Address</h3>
        <div class="gap-list">
          ${strategyAlignment.misalignments?.map((gap: { area: string; issue: string; recommendation: string; impact?: string }) => `
            <div class="gap-item ${gap.impact || 'medium'}">
              <div class="gap-header">
                <div class="gap-title">${ICONS.gap} ${gap.area}</div>
                <div class="gap-impact ${gap.impact || 'medium'}">${gap.impact || 'medium'} Impact</div>
              </div>
              <div class="gap-description">${gap.issue}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${strategyAlignment.strengths && strategyAlignment.strengths.length > 0 ? `
        <h3>Structural Strengths</h3>
        <div class="strength-list">
          ${strategyAlignment.strengths?.map((strength: string) => `
            <div class="strength-item">
              <div class="strength-icon">${ICONS.strength}</div>
              <div class="strength-text">${strength}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        ` : '<p>No strategy data available for alignment analysis.</p>'}
      </div>

      <!-- Span of Control -->
      <div class="section">
        <h2><span class="icon">${ICONS.span}</span>Span of Control</h2>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-icon">${ICONS.metric}</div>
              <div class="metric-title">Average Span</div>
            </div>
            <div class="metric-value">${spanAnalysis.average}</div>
          </div>
        </div>

        <h3>Distribution</h3>
        <div class="distribution-grid">
          <div class="distribution-item">
            <div class="distribution-label">1-3 reports</div>
            <div class="distribution-value">${spanAnalysis.distribution['1-3']}</div>
            <div class="distribution-label" style="margin-top: 8px; font-size: 12px;">managers</div>
          </div>
          <div class="distribution-item">
            <div class="distribution-label">4-7 reports</div>
            <div class="distribution-value">${spanAnalysis.distribution['4-7']}</div>
            <div class="distribution-label" style="margin-top: 8px; font-size: 12px;">managers</div>
          </div>
          <div class="distribution-item">
            <div class="distribution-label">8-12 reports</div>
            <div class="distribution-value">${spanAnalysis.distribution['8-12']}</div>
            <div class="distribution-label" style="margin-top: 8px; font-size: 12px;">managers</div>
          </div>
          <div class="distribution-item">
            <div class="distribution-label">13+ reports</div>
            <div class="distribution-value">${spanAnalysis.distribution['13+']}</div>
            <div class="distribution-label" style="margin-top: 8px; font-size: 12px;">managers</div>
          </div>
        </div>
      </div>

      <!-- Organizational Layers -->
      <div class="section">
        <h2><span class="icon">${ICONS.layers}</span>Organizational Layers</h2>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-icon">${ICONS.metric}</div>
              <div class="metric-title">Total Layers</div>
            </div>
            <div class="metric-value">${layerAnalysis.totalLayers}</div>
          </div>
          <div class="metric-card">
            <div class="metric-header">
              <div class="metric-icon">${ICONS.metric}</div>
              <div class="metric-title">Avg to Bottom</div>
            </div>
            <div class="metric-value">${layerAnalysis.averageLayersToBottom}</div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="section">
        <h2><span class="icon">${ICONS.recommendation}</span>Recommendations</h2>

        <div class="recommendation-list">
          ${recommendations.map((rec: Recommendation) => `
            <div class="recommendation-card">
              <div class="rec-header">
                <div class="rec-icon">${ICONS.recommendation}</div>
                <div class="rec-priority ${rec.priority}">${rec.priority} Priority</div>
              </div>
              <div class="rec-title">${rec.title}</div>
              <div class="rec-description">${formatRichText(rec.description)}</div>
              <div class="action-items">
                ${rec.actionItems?.map((item: string) => `
                  <div class="action-item">${item}</div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-logo">Mizan</div>
      <div>AI-Powered Organizational Intelligence</div>
    </div>
  </div>
</body>
</html>`;
}

// POST /api/export/structure - Export structure analysis as beautiful HTML
router.post('/structure', async (req: Request, res: Response) => {
  try {
    const { analysisData, analysisId, tenantName } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    // Verify tenant isolation - ensure user can only export their own tenant's data
    if (!tenantId) {
      return res.status(401).json({ 
        error: 'Authentication required for export',
        code: 'UNAUTHORIZED'
      });
    }

    if (!analysisData) {
      return res.status(400).json({ 
        error: 'Analysis data is required for export',
        code: 'MISSING_ANALYSIS_DATA'
      });
    }

    // Additional security: If analysisId is provided, validate ownership
    if (analysisId) {
      const isOwner = await validateAnalysisOwnership(analysisId, tenantId);
      if (!isOwner) {
        console.warn(`Unauthorized export attempt: User ${userId} tried to export analysis ${analysisId} from tenant ${tenantId}`);
        return res.status(403).json({ 
          error: 'Access denied: Analysis does not belong to your organization',
          code: 'FORBIDDEN_ANALYSIS_ACCESS'
        });
      }
    }

    // Validate that analysisData structure is safe and contains expected fields
    if (!analysisData.overallScore && analysisData.overallScore !== 0) {
      return res.status(400).json({
        error: 'Invalid analysis data structure',
        code: 'INVALID_ANALYSIS_DATA'
      });
    }

    // Generate the HTML export with the validated data
    const html = generateHTMLExport(analysisData, tenantName || 'Organization');

    // Set appropriate headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="structure-analysis-${analysisId || Date.now()}.html"`);

    return res.send(html);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({
      error: 'Failed to generate export',
      code: 'EXPORT_GENERATION_ERROR'
    });
  }
});

export default router;