// One-time script to manually generate Marco's employee report
import { db } from './db/index.js';
import { cultureAssessments, cultureReports, users } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { CultureAgent } from './services/agents/culture-agent.js';
import { EngagementAgent } from './services/agents/engagement-agent.js';
import { RecognitionAgent } from './services/agents/recognition-agent.js';
import { randomUUID } from 'crypto';

async function generateMarcoReport() {
  try {
    const assessmentId = '15b014c0-4f62-4921-ae6c-ab89cdf05524';
    const userId = '77c140d7-1654-4fbe-a8a2-84d4d2ea57f1';
    const tenantId = '1ce32fe3-6788-44e9-82c5-fb799a0501ab';

    console.log('🎯 Starting Marco report generation...');

    const cultureAgent = new CultureAgent();
    const engagementAgent = new EngagementAgent();
    const recognitionAgent = new RecognitionAgent();

    // Get the assessment with user data
    const assessment = await db.query.cultureAssessments.findFirst({
      where: eq(cultureAssessments.id, assessmentId),
      with: { user: true }
    });

    if (!assessment) {
      console.error('❌ Assessment not found');
      return;
    }

    console.log('📊 Assessment found for:', assessment.user?.name);

    // Call Culture Agent
    console.log('🎨 Calling Culture Agent...');
    const cultureAnalysis = await cultureAgent.analyzeIndividualEmployee({
      tenantId,
      employeeId: userId,
      employeeName: assessment.user?.name || 'Employee',
      personalValues: assessment.personalValues,
      currentExperienceValues: assessment.currentExperience,
      desiredExperienceValues: assessment.desiredExperience
    });
    console.log('✅ Culture analysis complete');

    // Call Engagement Agent
    console.log('💼 Calling Engagement Agent...');
    const engagementAnalysis = await engagementAgent.analyzeIndividual({
      tenantId,
      employeeId: userId,
      engagementScore: assessment.engagement || 0,
      context: {
        valuesAlignment: 0, // Not used in new design
        currentExperience: assessment.currentExperience
      }
    });
    console.log('✅ Engagement analysis complete');

    // Call Recognition Agent
    console.log('🏆 Calling Recognition Agent...');
    const recognitionAnalysis = await recognitionAgent.analyzeIndividual({
      tenantId,
      employeeId: userId,
      recognitionScore: assessment.recognition || 0,
      context: {
        valuesAlignment: 0, // Not used in new design
        engagement: assessment.engagement || 0
      }
    });
    console.log('✅ Recognition analysis complete');

    // Build the report
    const report = {
      employeeId: userId,
      employeeName: assessment.user?.name || 'Employee',
      assessmentDate: assessment.completedAt,

      personalValues: {
        selected: assessment.personalValues,
        interpretation: cultureAnalysis.personalValuesInterpretation || 'Analysis in progress...',
        strengths: cultureAnalysis.strengths || [],
        limitingFactors: cultureAnalysis.limitingFactors || []
      },

      visionForGrowth: {
        selected: assessment.desiredExperience,
        meaning: cultureAnalysis.visionForGrowth || 'Analysis in progress...',
        opportunities: cultureAnalysis.growthOpportunities || []
      },

      engagement: {
        score: assessment.engagement || 0,
        interpretation: engagementAnalysis.interpretation || 'Analysis in progress...',
        meaning: engagementAnalysis.meaning || '',
        factors: engagementAnalysis.factors || [],
        recommendations: engagementAnalysis.recommendations || []
      },

      recognition: {
        score: assessment.recognition || 0,
        interpretation: recognitionAnalysis.interpretation || 'Analysis in progress...',
        meaning: recognitionAnalysis.meaning || '',
        impact: recognitionAnalysis.impact || '',
        recommendations: recognitionAnalysis.recommendations || []
      },

      reflectionQuestions: cultureAnalysis.reflectionQuestions || [],

      overallSummary: {
        keyStrengths: cultureAnalysis.strengths?.slice(0, 3) || [],
        growthOpportunities: cultureAnalysis.growthOpportunities?.slice(0, 3) || [],
        nextSteps: [
          'Reflect on your personalized questions',
          'Take one small action from your recommendations',
          'Revisit this report monthly to track your growth'
        ]
      }
    };

    // Save to database
    console.log('💾 Saving report to database...');
    await db.insert(cultureReports).values({
      id: randomUUID(),
      tenantId,
      analysisId: assessmentId,
      reportType: 'employee',
      reportData: report,
      createdAt: new Date()
    });

    console.log('✅ Report generated successfully!');
    console.log('\n📋 Report Summary:');
    console.log('- Personal Values:', report.personalValues.strengths.join(', '));
    console.log('- Vision for Growth:', report.visionForGrowth.opportunities.slice(0, 3).join(', '));
    console.log('- Engagement Score:', report.engagement.score + '/5');
    console.log('- Recognition Score:', report.recognition.score + '/5');
    console.log('- Reflection Questions:', report.reflectionQuestions.length);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

generateMarcoReport();
