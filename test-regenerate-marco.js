// Test script to regenerate Marco's employee report with framework mapping
import { db } from './db/index.js';
import { cultureAssessments, cultureReports } from './db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { CultureAgent } from './services/agents/culture-agent.js';
import { EngagementAgent } from './services/agents/engagement-agent.js';
import { RecognitionAgent } from './services/agents/recognition-agent.js';
import { randomUUID } from 'crypto';

const MARCO_USER_ID = 'f322b497-12bf-420e-86dc-5b9e9d1b1af7';
const TENANT_ID = '1ce32fe3-6788-44e9-82c5-fb799a0501ab';

async function regenerateMarcoReport() {
  console.log('🔄 Regenerating Marco\'s employee report with framework mapping...\n');

  // Get Marco's latest assessment
  const assessments = await db
    .select()
    .from(cultureAssessments)
    .where(eq(cultureAssessments.userId, MARCO_USER_ID))
    .orderBy(desc(cultureAssessments.createdAt))
    .limit(1);

  if (assessments.length === 0) {
    console.error('❌ No assessment found for Marco');
    return;
  }

  const assessment = assessments[0];
  console.log('✅ Found assessment:', assessment.id);
  console.log('   Personal Values:', assessment.personalValues);
  console.log('   Desired Experience:', assessment.desiredExperience);
  console.log('   Engagement:', assessment.engagement);
  console.log('   Recognition:', assessment.recognition);

  // Delete old report
  await db
    .delete(cultureReports)
    .where(eq(cultureReports.analysisId, assessment.id));
  console.log('\n✅ Deleted old report\n');

  // Create agents
  const cultureAgent = new CultureAgent();
  const engagementAgent = new EngagementAgent();
  const recognitionAgent = new RecognitionAgent();

  console.log('🤖 Calling Culture Agent with framework mapping...');
  const cultureAnalysis = await cultureAgent.analyzeIndividualEmployee({
    tenantId: TENANT_ID,
    employeeId: MARCO_USER_ID,
    employeeName: 'Marco Dahrouj',
    personalValues: assessment.personalValues,
    currentExperienceValues: assessment.currentExperience || [],
    desiredExperienceValues: assessment.desiredExperience
  });

  console.log('\n📊 Culture Analysis Result:');
  console.log('   Cylinder Mapping:', JSON.stringify(cultureAnalysis.valuesCylinderMapping?.cylinders || {}, null, 2));
  console.log('   Culture Alignment:', cultureAnalysis.cultureAlignment?.interpretation?.substring(0, 150) + '...');

  console.log('\n🤖 Calling Engagement Agent...');
  const engagementAnalysis = await engagementAgent.analyzeIndividual({
    tenantId: TENANT_ID,
    employeeId: MARCO_USER_ID,
    engagementScore: assessment.engagement || 0,
    context: {
      valuesAlignment: cultureAnalysis.alignmentScore || 0,
      currentExperience: assessment.currentExperience || []
    }
  });

  console.log('\n🤖 Calling Recognition Agent...');
  const recognitionAnalysis = await recognitionAgent.analyzeIndividual({
    tenantId: TENANT_ID,
    employeeId: MARCO_USER_ID,
    recognitionScore: assessment.recognition || 0,
    context: {
      valuesAlignment: cultureAnalysis.alignmentScore || 0,
      engagement: assessment.engagement || 0
    }
  });

  // Build comprehensive report
  const report = {
    employeeId: MARCO_USER_ID,
    employeeName: 'Marco Dahrouj',
    assessmentDate: assessment.completedAt,

    personalValues: {
      selected: assessment.personalValues,
      cylinderMapping: cultureAnalysis.valuesCylinderMapping || null,
      interpretation: cultureAnalysis.personalValuesInterpretation || 'Analysis in progress...',
      strengths: cultureAnalysis.strengths || [],
      limitingFactors: cultureAnalysis.limitingFactors || []
    },

    visionForGrowth: {
      selected: assessment.desiredExperience,
      meaning: cultureAnalysis.visionForGrowth || 'Analysis in progress...',
      opportunities: cultureAnalysis.growthOpportunities || []
    },

    cultureAlignment: {
      interpretation: cultureAnalysis.cultureAlignment?.interpretation || 'Analyzing alignment...',
      alignedAreas: cultureAnalysis.cultureAlignment?.alignedAreas || [],
      gapAreas: cultureAnalysis.cultureAlignment?.gapAreas || [],
      whatThisMeans: cultureAnalysis.cultureAlignment?.whatThisMeans || ''
    },

    recommendations: cultureAnalysis.recommendations || [],

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
  await db.insert(cultureReports).values({
    id: randomUUID(),
    tenantId: TENANT_ID,
    analysisId: assessment.id,
    reportType: 'employee',
    reportData: report,
    createdAt: new Date()
  });

  console.log('\n✅ Report saved to database!');
  console.log('\n📋 Report Preview:');
  console.log('   Cylinder Mapping:', Object.keys(report.personalValues.cylinderMapping?.cylinders || {}).join(', '));
  console.log('   Culture Gap:', report.cultureAlignment.interpretation.substring(0, 200) + '...');
  console.log('   Recommendations:', report.recommendations?.length || 0, 'personalized recommendations');
  console.log('   Reflection Questions:', report.reflectionQuestions?.length || 0, 'questions');

  process.exit(0);
}

regenerateMarcoReport().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
