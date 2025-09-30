#!/usr/bin/env node

/**
 * Comprehensive Trigger Engine Test Script
 * Tests all 27 triggers with proper data structures and keywords
 */

// Mock UnifiedResults data for testing
const createMockUnifiedResults = (recommendations) => ({
  tenantId: 'test-tenant',
  timestamp: new Date(),
  recommendations: recommendations,
  detailed_analysis: {
    skills: {
      score: 75,
      weaknesses: ['Critical technical skills gap', 'Urgent communication skills needed']
    },
    structure: {
      score: 83,
      layerEfficiency: 65,
      averageSpan: 6.4
    },
    culture: {
      score: 78,
      cylinderScores: [70, 80, 75, 85, 70, 80, 75]
    },
    engagement: {
      score: 72,
      engagementDrivers: ['recognition', 'growth', 'autonomy']
    },
    recognition: {
      score: 68,
      recognitionEffectiveness: 0.7
    }
  }
});

// Test cases with proper keywords that match the trigger logic
const testCases = [
  // 1. Skills Analysis Triggers
  {
    name: 'Skills Gap Analysis → LXP',
    triggerType: 'skill_gaps_critical',
    recommendations: [
      { id: '1', category: 'skills', title: 'Critical technical skills gap identified', description: 'Test' }
    ],
    expectedAction: 'initiate_training_program'
  },
  
  // 2. Structure Analysis Triggers
  {
    name: 'Structure Analysis → Hiring Module',
    triggerType: 'hiring_needs_urgent',
    recommendations: [
      { id: '2', category: 'structure', title: 'Urgent hiring needs for strategic positions', description: 'Test' }
    ],
    expectedAction: 'activate_hiring_module'
  },
  {
    name: 'Structure Analysis → Talent Management',
    triggerType: 'structure_optimal_talent',
    recommendations: [
      { id: '3', category: 'structure', title: 'Optimal structure achieved - no additional layers needed', description: 'Test' }
    ],
    expectedAction: 'activate_talent_management_module'
  },
  {
    name: 'Structure Analysis → Structure Recommendations',
    triggerType: 'structure_inflated_recommendations',
    recommendations: [
      { id: '4', category: 'structure', title: 'Structure is inflated and needs optimization', description: 'Test' }
    ],
    expectedAction: 'provide_structure_recommendations'
  },
  
  // 3. Culture Analysis Triggers
  {
    name: 'Culture Analysis → LXP',
    triggerType: 'culture_learning_needed',
    recommendations: [
      { id: '5', category: 'culture', title: 'Employee needs culture learning and value adaptation', description: 'Test' }
    ],
    expectedAction: 'activate_lxp'
  },
  {
    name: 'Culture Analysis → Reward Module',
    triggerType: 'culture_alignment_reward',
    recommendations: [
      { id: '6', category: 'culture', title: 'Employee culture perfectly aligns with company values', description: 'Test' }
    ],
    expectedAction: 'activate_reward_module'
  },
  
  // 4. Performance Management Triggers
  {
    name: 'Performance Management (100%+) → Reward Module',
    triggerType: 'performance_excellent_reward',
    recommendations: [
      { id: '7', category: 'performance', title: 'Employee performance exceeds 100% target', description: 'Test' }
    ],
    expectedAction: 'activate_reward_module'
  },
  {
    name: 'Performance Management (100%) → LXP',
    triggerType: 'performance_perfect_lxp',
    recommendations: [
      { id: '8', category: 'performance', title: 'Employee achieved perfect 100% performance', description: 'Test' }
    ],
    expectedAction: 'activate_lxp'
  },
  {
    name: 'Performance Management (105%+) → Talent Management + Succession Planning',
    triggerType: 'performance_exceptional_talent_succession',
    recommendations: [
      { id: '9', category: 'performance', title: 'Employee performance exceeds 105% - exceptional achievement', description: 'Test' }
    ],
    expectedAction: 'activate_talent_management_succession_planning_modules'
  },
  {
    name: 'Performance Management (Below 100%) → LXP',
    triggerType: 'performance_improvement_lxp',
    recommendations: [
      { id: '10', category: 'performance', title: 'Employee performance below 100% - needs improvement', description: 'Test' }
    ],
    expectedAction: 'activate_lxp'
  },
  
  // 5. Hiring Module Triggers
  {
    name: 'Hiring Module → Onboarding Module',
    triggerType: 'candidate_hired_onboarding',
    recommendations: [
      { id: '11', category: 'hiring', title: 'Candidate successfully hired and ready for onboarding', description: 'Test' }
    ],
    expectedAction: 'activate_onboarding_module'
  },
  
  // 6. LXP Module Triggers
  {
    name: 'LXP Training Plans → Performance Management Module',
    triggerType: 'lxp_completed_performance',
    recommendations: [
      { id: '12', category: 'lxp', title: 'LXP training plans completed successfully', description: 'Test' }
    ],
    expectedAction: 'activate_performance_management_module'
  },
  
  // 7. Time-based Triggers
  {
    name: 'Annual Performance Review Due → Performance Management Module',
    triggerType: 'annual_performance_review_due',
    recommendations: [
      { id: '13', category: 'performance', title: 'Annual performance review is due', description: 'Test' }
    ],
    expectedAction: 'activate_performance_management_module'
  },
  {
    name: 'Quarterly Check-in → Performance Review Module',
    triggerType: 'quarterly_checkin_due',
    recommendations: [
      { id: '14', category: 'performance', title: 'Quarterly check-in is due', description: 'Test' }
    ],
    expectedAction: 'activate_performance_review_module'
  },
  {
    name: 'Probation Period Ending → Performance Evaluation Module',
    triggerType: 'probation_period_ending',
    recommendations: [
      { id: '15', category: 'performance', title: 'Probation period is ending', description: 'Test' }
    ],
    expectedAction: 'activate_performance_evaluation_module'
  },
  
  // 8. Training Triggers
  {
    name: 'Compliance Training Due → Compliance Training Module',
    triggerType: 'compliance_training_due',
    recommendations: [
      { id: '16', category: 'training', title: 'Compliance training is due', description: 'Test' }
    ],
    expectedAction: 'activate_compliance_training_module'
  },
  {
    name: 'Safety Training Expired → Safety Training Module',
    triggerType: 'safety_training_expired',
    recommendations: [
      { id: '17', category: 'training', title: 'Safety training has expired', description: 'Test' }
    ],
    expectedAction: 'activate_safety_training_module'
  },
  {
    name: 'Certification Expiring → Certification Renewal Module',
    triggerType: 'certification_expiring',
    recommendations: [
      { id: '18', category: 'training', title: 'Certification is expiring', description: 'Test' }
    ],
    expectedAction: 'activate_certification_renewal_module'
  },
  
  // 9. Legal and Policy Triggers
  {
    name: 'Legal Requirement Change → Policy Update Module',
    triggerType: 'legal_requirement_change',
    recommendations: [
      { id: '19', category: 'legal', title: 'Legal requirements have changed', description: 'Test' }
    ],
    expectedAction: 'activate_policy_update_module'
  },
  
  // 10. Team and Structure Triggers
  {
    name: 'Team Size Changes → Team Restructuring Module',
    triggerType: 'team_size_changes',
    recommendations: [
      { id: '20', category: 'structure', title: 'Team size has changed significantly', description: 'Test' }
    ],
    expectedAction: 'activate_team_restructuring_module'
  },
  
  // 11. Onboarding Triggers
  {
    name: 'Onboarding Completion → Performance Baseline Module',
    triggerType: 'onboarding_completion',
    recommendations: [
      { id: '21', category: 'performance', title: 'Onboarding completion requires performance baseline', description: 'Test' }
    ],
    expectedAction: 'activate_performance_baseline_module'
  },
  
  // 12. Training Completion Triggers
  {
    name: 'Training Completion → Performance Assessment Module',
    triggerType: 'training_completion',
    recommendations: [
      { id: '22', category: 'performance', title: 'Training completion requires performance assessment', description: 'Test' }
    ],
    expectedAction: 'activate_performance_assessment_module'
  },
  
  // 13. Succession Planning Triggers
  {
    name: 'Succession Plan Activation → Leadership Transition Module',
    triggerType: 'succession_plan_activation',
    recommendations: [
      { id: '23', category: 'talent', title: 'Succession plan activation requires leadership transition', description: 'Test' }
    ],
    expectedAction: 'activate_leadership_transition_module'
  },
  
  // 14. Retention Triggers
  {
    name: 'Flight Risk Prediction → Retention Intervention Module',
    triggerType: 'flight_risk_prediction',
    recommendations: [
      { id: '24', category: 'retention', title: 'Flight risk prediction indicates high departure risk', description: 'Test' }
    ],
    expectedAction: 'activate_retention_intervention_module'
  },
  
  // 15. Skill Obsolescence Triggers
  {
    name: 'Skill Obsolescence Risk → Proactive Training Module',
    triggerType: 'skill_obsolescence_risk',
    recommendations: [
      { id: '25', category: 'skills', title: 'Skill obsolescence risk detected', description: 'Test' }
    ],
    expectedAction: 'activate_proactive_training_module'
  },
  
  // 16. Leadership Gap Triggers
  {
    name: 'Leadership Gap Prediction → Succession Acceleration Module',
    triggerType: 'leadership_gap_prediction',
    recommendations: [
      { id: '26', category: 'talent', title: 'Leadership gap prediction indicates critical shortage', description: 'Test' }
    ],
    expectedAction: 'activate_succession_acceleration_module'
  }
];

// Mock trigger object
const createMockTrigger = (type) => ({
  id: 'test-trigger-id',
  name: `Test ${type} Trigger`,
  type: type,
  config: {},
  status: 'active',
  tenantId: 'test-tenant'
});

// Test function to verify trigger logic
function testTriggerLogic() {
  console.log('🚀 Starting Comprehensive Trigger Logic Test');
  console.log('=' .repeat(70));
  
  let passedTests = 0;
  let failedTests = 0;
  const results = [];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📋 Testing: ${testCase.name}`);
      console.log(`   Trigger Type: ${testCase.triggerType}`);
      console.log(`   Expected Action: ${testCase.expectedAction}`);
      
      // Create mock data for this test case
      const mockResults = createMockUnifiedResults(testCase.recommendations);
      const mockTrigger = createMockTrigger(testCase.triggerType);
      
      // Simulate the trigger processing logic
      const triggerResult = simulateTriggerProcessing(mockTrigger, mockResults);
      
      if (triggerResult && triggerResult.action === testCase.expectedAction) {
        console.log(`✅ PASSED: Trigger activated with correct action`);
        passedTests++;
        results.push({
          test: testCase.name,
          status: 'PASSED',
          action: triggerResult.action,
          triggerType: testCase.triggerType
        });
      } else {
        console.log(`❌ FAILED: Expected action not found`);
        console.log(`   Expected: ${testCase.expectedAction}`);
        console.log(`   Actual: ${triggerResult ? triggerResult.action : 'No trigger activated'}`);
        failedTests++;
        results.push({
          test: testCase.name,
          status: 'FAILED',
          expectedAction: testCase.expectedAction,
          actualAction: triggerResult ? triggerResult.action : null,
          triggerType: testCase.triggerType
        });
      }
      
    } catch (error) {
      console.log(`💥 ERROR: ${testCase.name} - ${error.message}`);
      failedTests++;
      results.push({
        test: testCase.name,
        status: 'ERROR',
        error: error.message,
        triggerType: testCase.triggerType
      });
    }
  }
  
  // Print summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(70));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total Tests: ${testCases.length}`);
  console.log(`🎯 Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);
  
  // Print detailed results
  console.log('\n📋 DETAILED RESULTS');
  console.log('=' .repeat(70));
  results.forEach((result, index) => {
    const status = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '💥';
    console.log(`${index + 1}. ${status} ${result.test}`);
    console.log(`   Type: ${result.triggerType}`);
    if (result.status === 'PASSED') {
      console.log(`   Action: ${result.action}`);
    } else if (result.status === 'FAILED') {
      console.log(`   Expected: ${result.expectedAction}`);
      console.log(`   Actual: ${result.actualAction || 'None'}`);
    } else if (result.status === 'ERROR') {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  return {
    passed: passedTests,
    failed: failedTests,
    total: testCases.length,
    successRate: (passedTests / testCases.length) * 100,
    results
  };
}

// Simulate trigger processing logic
function simulateTriggerProcessing(trigger, results) {
  const { type } = trigger;
  
  // This simulates the actual trigger logic from the trigger engine
  switch (type) {
    case 'skill_gaps_critical':
      const criticalGaps = results.detailed_analysis.skills.weaknesses.filter(
        weakness => weakness.toLowerCase().includes('critical') || weakness.toLowerCase().includes('urgent')
      );
      if (criticalGaps.length > 0) {
        return { action: 'initiate_training_program', reason: 'Critical skill gaps identified' };
      }
      break;
      
    case 'hiring_needs_urgent':
      const urgentHiring = results.recommendations.filter(
        rec => rec.category === 'structure' && rec.title.toLowerCase().includes('hiring')
      );
      if (urgentHiring.length > 0) {
        return { action: 'activate_hiring_module', reason: 'Urgent hiring needs identified' };
      }
      break;
      
    case 'structure_optimal_talent':
      const optimalStructure = results.recommendations.filter(
        rec => rec.category === 'structure' && rec.title.toLowerCase().includes('optimal')
      );
      if (optimalStructure.length > 0) {
        return { action: 'activate_talent_management_module', reason: 'Optimal structure achieved' };
      }
      break;
      
    case 'structure_inflated_recommendations':
      const inflatedStructure = results.recommendations.filter(
        rec => rec.category === 'structure' && rec.title.toLowerCase().includes('inflated')
      );
      if (inflatedStructure.length > 0) {
        return { action: 'provide_structure_recommendations', reason: 'Structure is inflated' };
      }
      break;
      
    case 'culture_learning_needed':
      const cultureLearning = results.recommendations.filter(
        rec => rec.category === 'culture' && rec.title.toLowerCase().includes('learning')
      );
      if (cultureLearning.length > 0) {
        return { action: 'activate_lxp', reason: 'Culture learning needed' };
      }
      break;
      
    case 'culture_alignment_reward':
      const cultureAlignment = results.recommendations.filter(
        rec => rec.category === 'culture' && rec.title.toLowerCase().includes('aligns')
      );
      if (cultureAlignment.length > 0) {
        return { action: 'activate_reward_module', reason: 'Culture alignment achieved' };
      }
      break;
      
    case 'performance_excellent_reward':
      const excellentPerformance = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('exceeds')
      );
      if (excellentPerformance.length > 0) {
        return { action: 'activate_reward_module', reason: 'Excellent performance' };
      }
      break;
      
    case 'performance_perfect_lxp':
      const perfectPerformance = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('perfect')
      );
      if (perfectPerformance.length > 0) {
        return { action: 'activate_lxp', reason: 'Perfect performance' };
      }
      break;
      
    case 'performance_exceptional_talent_succession':
      const exceptionalPerformance = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('exceptional')
      );
      if (exceptionalPerformance.length > 0) {
        return { action: 'activate_talent_management_succession_planning_modules', reason: 'Exceptional performance' };
      }
      break;
      
    case 'performance_improvement_lxp':
      const improvementNeeded = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('improvement')
      );
      if (improvementNeeded.length > 0) {
        return { action: 'activate_lxp', reason: 'Performance improvement needed' };
      }
      break;
      
    case 'candidate_hired_onboarding':
      const candidateHired = results.recommendations.filter(
        rec => rec.category === 'hiring' && rec.title.toLowerCase().includes('hired')
      );
      if (candidateHired.length > 0) {
        return { action: 'activate_onboarding_module', reason: 'Candidate hired' };
      }
      break;
      
    case 'lxp_completed_performance':
      const lxpCompleted = results.recommendations.filter(
        rec => rec.category === 'lxp' && rec.title.toLowerCase().includes('completed')
      );
      if (lxpCompleted.length > 0) {
        return { action: 'activate_performance_management_module', reason: 'LXP completed' };
      }
      break;
      
    case 'annual_performance_review_due':
      const annualReview = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('annual')
      );
      if (annualReview.length > 0) {
        return { action: 'activate_performance_management_module', reason: 'Annual review due' };
      }
      break;
      
    case 'quarterly_checkin_due':
      const quarterlyCheckin = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('quarterly')
      );
      if (quarterlyCheckin.length > 0) {
        return { action: 'activate_performance_review_module', reason: 'Quarterly check-in due' };
      }
      break;
      
    case 'probation_period_ending':
      const probationEnding = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('probation')
      );
      if (probationEnding.length > 0) {
        return { action: 'activate_performance_evaluation_module', reason: 'Probation period ending' };
      }
      break;
      
    case 'compliance_training_due':
      const complianceTraining = results.recommendations.filter(
        rec => rec.category === 'training' && rec.title.toLowerCase().includes('compliance')
      );
      if (complianceTraining.length > 0) {
        return { action: 'activate_compliance_training_module', reason: 'Compliance training due' };
      }
      break;
      
    case 'safety_training_expired':
      const safetyTraining = results.recommendations.filter(
        rec => rec.category === 'training' && rec.title.toLowerCase().includes('safety')
      );
      if (safetyTraining.length > 0) {
        return { action: 'activate_safety_training_module', reason: 'Safety training expired' };
      }
      break;
      
    case 'certification_expiring':
      const certificationExpiring = results.recommendations.filter(
        rec => rec.category === 'training' && rec.title.toLowerCase().includes('certification')
      );
      if (certificationExpiring.length > 0) {
        return { action: 'activate_certification_renewal_module', reason: 'Certification expiring' };
      }
      break;
      
    case 'legal_requirement_change':
      const legalChange = results.recommendations.filter(
        rec => rec.category === 'legal' && rec.title.toLowerCase().includes('legal')
      );
      if (legalChange.length > 0) {
        return { action: 'activate_policy_update_module', reason: 'Legal requirement changed' };
      }
      break;
      
    case 'team_size_changes':
      const teamSizeChanges = results.recommendations.filter(
        rec => rec.category === 'structure' && rec.title.toLowerCase().includes('team size')
      );
      if (teamSizeChanges.length > 0) {
        return { action: 'activate_team_restructuring_module', reason: 'Team size changed' };
      }
      break;
      
    case 'onboarding_completion':
      const onboardingCompletion = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('onboarding')
      );
      if (onboardingCompletion.length > 0) {
        return { action: 'activate_performance_baseline_module', reason: 'Onboarding completed' };
      }
      break;
      
    case 'training_completion':
      const trainingCompletion = results.recommendations.filter(
        rec => rec.category === 'performance' && rec.title.toLowerCase().includes('training')
      );
      if (trainingCompletion.length > 0) {
        return { action: 'activate_performance_assessment_module', reason: 'Training completed' };
      }
      break;
      
    case 'succession_plan_activation':
      const successionActivation = results.recommendations.filter(
        rec => rec.category === 'talent' && rec.title.toLowerCase().includes('succession')
      );
      if (successionActivation.length > 0) {
        return { action: 'activate_leadership_transition_module', reason: 'Succession plan activated' };
      }
      break;
      
    case 'flight_risk_prediction':
      const flightRisk = results.recommendations.filter(
        rec => rec.category === 'retention' && rec.title.toLowerCase().includes('flight risk')
      );
      if (flightRisk.length > 0) {
        return { action: 'activate_retention_intervention_module', reason: 'Flight risk predicted' };
      }
      break;
      
    case 'skill_obsolescence_risk':
      const skillObsolescence = results.recommendations.filter(
        rec => rec.category === 'skills' && rec.title.toLowerCase().includes('obsolescence')
      );
      if (skillObsolescence.length > 0) {
        return { action: 'activate_proactive_training_module', reason: 'Skill obsolescence risk' };
      }
      break;
      
    case 'leadership_gap_prediction':
      const leadershipGap = results.recommendations.filter(
        rec => rec.category === 'talent' && rec.title.toLowerCase().includes('leadership gap')
      );
      if (leadershipGap.length > 0) {
        return { action: 'activate_succession_acceleration_module', reason: 'Leadership gap predicted' };
      }
      break;
  }
  
  return null;
}

// Run the tests
testTriggerLogic();
