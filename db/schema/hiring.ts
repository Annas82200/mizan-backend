import { pgTable, uuid, text, timestamp, integer, decimal, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const jobLevelEnum = pgEnum('job_level', ['entry', 'mid', 'senior', 'executive', 'leadership']);

export const jobTypeEnum = pgEnum('job_type', ['full_time', 'part_time', 'contract', 'temporary', 'intern']);

export const requisitionUrgencyEnum = pgEnum('requisition_urgency', ['low', 'medium', 'high', 'critical']);

export const requisitionStatusEnum = pgEnum('requisition_status', [
  'draft',
  'pending_approval',
  'approved',
  'posted',
  'filled',
  'cancelled',
  'on_hold'
]);

export const candidateSourceEnum = pgEnum('candidate_source', [
  'job_board',
  'referral',
  'agency',
  'direct',
  'linkedin',
  'career_page',
  'social_media',
  'event',
  'other'
]);

export const candidateStatusEnum = pgEnum('candidate_status', [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
  'on_hold'
]);

export const candidateStageEnum = pgEnum('candidate_stage', [
  'application',
  'resume_review',
  'phone_screen',
  'technical_assessment',
  'behavioral_interview',
  'final_interview',
  'reference_check',
  'offer',
  'hired'
]);

export const assessmentTypeEnum = pgEnum('assessment_type', [
  'skills',
  'culture_fit',
  'technical',
  'behavioral',
  'cognitive',
  'personality',
  'resume_review'
]);

export const interviewTypeEnum = pgEnum('interview_type', [
  'phone',
  'video',
  'in_person',
  'technical',
  'behavioral',
  'panel',
  'culture_fit',
  'final'
]);

export const interviewStatusEnum = pgEnum('interview_status', [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rescheduled',
  'no_show'
]);

export const interviewRecommendationEnum = pgEnum('interview_recommendation', [
  'strong_yes',
  'yes',
  'maybe',
  'no',
  'strong_no'
]);

export const offerStatusEnum = pgEnum('offer_status', [
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'negotiating',
  'accepted',
  'rejected',
  'expired',
  'withdrawn'
]);

export const jobPostingStatusEnum = pgEnum('job_posting_status', [
  'draft',
  'pending_approval',
  'approved',
  'published',
  'paused',
  'closed',
  'expired'
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Job Requisitions Table
 * Stores job openings and their requirements
 */
export const hiringRequisitions = pgTable('hiring_requisitions', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  
  // Position details
  positionTitle: text('position_title').notNull(),
  department: text('department').notNull(),
  level: jobLevelEnum('level').notNull(),
  type: jobTypeEnum('type').notNull().default('full_time'),
  
  // Location
  location: text('location').notNull(),
  remote: boolean('remote').notNull().default(false),
  remoteDetails: text('remote_details'), // fully_remote, hybrid, on_site
  
  // Job description
  description: text('description').notNull(),
  responsibilities: jsonb('responsibilities').notNull().default([]), // array of strings
  qualifications: jsonb('qualifications').notNull().default([]), // array of strings
  
  // Skills and requirements
  requiredSkills: jsonb('required_skills').notNull().default([]), // array of skill objects
  preferredSkills: jsonb('preferred_skills').default([]), // array of skill objects
  experienceRequired: text('experience_required'), // e.g., "3-5 years"
  educationRequired: text('education_required'),
  
  // Culture fit requirements (Mizan 7 Cylinders)
  cultureValues: jsonb('culture_values').default([]), // array of values from 7 cylinders
  cultureFitWeight: decimal('culture_fit_weight', { precision: 3, scale: 2 }).default('0.30'), // 0.00 to 1.00
  
  // Compensation
  compensationRange: jsonb('compensation_range').notNull(), // { min, max, currency }
  bonus: jsonb('bonus'), // { type, amount, description }
  equity: text('equity'),
  benefits: jsonb('benefits').default([]), // array of benefit strings
  relocationPackage: boolean('relocation_package').default(false),
  relocationDetails: text('relocation_details'),
  
  // Requisition management
  urgency: requisitionUrgencyEnum('urgency').notNull().default('medium'),
  status: requisitionStatusEnum('status').notNull().default('draft'),
  numberOfPositions: integer('number_of_positions').notNull().default(1),
  positionsFilled: integer('positions_filled').notNull().default(0),
  
  // Dates
  targetStartDate: timestamp('target_start_date', { withTimezone: true }),
  expectedCloseDate: timestamp('expected_close_date', { withTimezone: true }),
  postedDate: timestamp('posted_date', { withTimezone: true }),
  closedDate: timestamp('closed_date', { withTimezone: true }),
  
  // Ownership and approval
  requestedBy: uuid('requested_by').notNull(), // Employee who requested
  hiringManagerId: uuid('hiring_manager_id').notNull(),
  recruiterId: uuid('recruiter_id'), // Assigned recruiter
  approvedBy: uuid('approved_by'),
  approvalDate: timestamp('approval_date', { withTimezone: true }),
  
  // Job posting details
  jobPostingUrl: text('job_posting_url'),
  jobBoards: jsonb('job_boards').default([]), // array of board names where posted
  
  // AI and automation
  aiGenerated: boolean('ai_generated').default(false),
  aiRecommendations: jsonb('ai_recommendations'), // AI suggestions for improvements
  
  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

/**
 * Job Postings Table
 * Stores published job postings with marketing content
 */
export const jobPostings = pgTable('job_postings', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  requisitionId: uuid('requisition_id').notNull(),

  // Job posting content
  title: text('title').notNull(),
  description: text('description').notNull(), // Full job description
  responsibilities: text('responsibilities').notNull(), // Formatted list
  requirements: text('requirements').notNull(), // Formatted list
  qualifications: text('qualifications'), // Formatted list

  // Company information
  companyName: text('company_name').notNull(),
  companyDescription: text('company_description'),
  companyValues: jsonb('company_values').default([]),
  companyBenefits: text('company_benefits'),

  // Compensation display
  salaryRange: text('salary_range'), // e.g., "$100k - $150k"
  displaySalary: boolean('display_salary').default(true),
  benefitsSummary: text('benefits_summary'),

  // Location
  location: text('location').notNull(),
  remote: boolean('remote').default(false),
  remoteDetails: text('remote_details'),

  // Platform-specific versions
  linkedInVersion: text('linkedin_version'), // LinkedIn-optimized version
  indeedVersion: text('indeed_version'), // Indeed-optimized version
  careerPageVersion: text('career_page_version'), // Company career page version

  // SEO and marketing
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  keywords: jsonb('keywords').default([]), // array of SEO keywords

  // Publishing
  status: jobPostingStatusEnum('status').notNull().default('draft'),
  publishedPlatforms: jsonb('published_platforms').default([]), // array of platform names
  careerPageUrl: text('career_page_url'),
  externalUrls: jsonb('external_urls').default({}), // { linkedin: url, indeed: url, etc. }

  // Approval workflow
  requiresApproval: boolean('requires_approval').default(true),
  approvedBy: uuid('approved_by'),
  approvalDate: timestamp('approval_date', { withTimezone: true }),
  approvalNotes: text('approval_notes'),

  // Dates
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),

  // Analytics
  views: integer('views').default(0),
  applications: integer('applications').default(0),
  clickThroughRate: decimal('click_through_rate', { precision: 5, scale: 2 }),

  // AI generation
  aiGenerated: boolean('ai_generated').default(false),
  generatedBy: text('generated_by'), // 'hiring_agent', 'job_posting_generator'

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

/**
 * Candidates Table
 * Stores candidate information and application data
 */
export const candidates = pgTable('candidates', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  requisitionId: uuid('requisition_id').notNull(),
  
  // Personal information
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  
  // Professional profiles
  linkedinUrl: text('linkedin_url'),
  portfolioUrl: text('portfolio_url'),
  githubUrl: text('github_url'),
  personalWebsite: text('personal_website'),
  
  // Application documents
  resumeUrl: text('resume_url').notNull(),
  coverLetterUrl: text('cover_letter_url'),
  additionalDocuments: jsonb('additional_documents').default([]), // array of document URLs
  
  // Application source
  source: candidateSourceEnum('source').notNull(),
  sourceDetails: text('source_details'), // referrer name, agency, etc.
  referredBy: uuid('referred_by'), // Employee ID if referral
  
  // Current employment
  currentCompany: text('current_company'),
  currentTitle: text('current_title'),
  yearsOfExperience: integer('years_of_experience'),
  currentSalary: decimal('current_salary', { precision: 12, scale: 2 }),
  expectedSalary: decimal('expected_salary', { precision: 12, scale: 2 }),
  noticePeriod: text('notice_period'), // e.g., "2 weeks", "1 month"
  
  // Education
  education: jsonb('education').default([]), // array of education objects
  certifications: jsonb('certifications').default([]), // array of certification objects
  
  // Skills and experience
  skills: jsonb('skills').default([]), // array of skill objects with proficiency
  languages: jsonb('languages').default([]), // array of language objects with proficiency
  industryExperience: jsonb('industry_experience').default([]),
  
  // Application status
  status: candidateStatusEnum('status').notNull().default('applied'),
  stage: candidateStageEnum('stage').notNull().default('application'),
  
  // Scoring
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }),
  skillsScore: decimal('skills_score', { precision: 5, scale: 2 }),
  cultureScore: decimal('culture_score', { precision: 5, scale: 2 }),
  experienceScore: decimal('experience_score', { precision: 5, scale: 2 }),
  educationScore: decimal('education_score', { precision: 5, scale: 2 }),
  
  // Assessment summary
  assessmentSummary: jsonb('assessment_summary'), // consolidated assessment results
  strengths: jsonb('strengths').default([]), // array of strings
  weaknesses: jsonb('weaknesses').default([]), // array of strings
  redFlags: jsonb('red_flags').default([]), // array of concern objects
  
  // Culture fit (Mizan 7 Cylinders alignment)
  cultureAnalysis: jsonb('culture_analysis'), // detailed culture fit analysis
  cultureAlignment: jsonb('culture_alignment'), // alignment scores per cylinder
  
  // Communication and notes
  notes: text('notes'),
  internalNotes: text('internal_notes'), // not visible to candidate
  tags: jsonb('tags').default([]), // array of tags for filtering
  
  // Preferences
  willingToRelocate: boolean('willing_to_relocate'),
  remotePreference: text('remote_preference'), // remote_only, hybrid, on_site, flexible
  availableStartDate: timestamp('available_start_date', { withTimezone: true }),
  
  // Communication tracking
  lastContactedDate: timestamp('last_contacted_date', { withTimezone: true }),
  responseRate: decimal('response_rate', { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // AI insights
  aiRecommendation: text('ai_recommendation'), // strong_hire, hire, maybe, pass, strong_pass
  aiInsights: jsonb('ai_insights'), // AI-generated insights and recommendations
  
  // Dates
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow(),
  lastUpdatedBy: uuid('last_updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  
  // Metadata
  metadata: jsonb('metadata').default({})
});

/**
 * Candidate Assessments Table
 * Stores detailed assessment results for candidates
 */
export const candidateAssessments = pgTable('candidate_assessments', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  candidateId: uuid('candidate_id').notNull(),
  requisitionId: uuid('requisition_id').notNull(),
  
  // Assessment details
  assessmentType: assessmentTypeEnum('assessment_type').notNull(),
  assessmentName: text('assessment_name').notNull(),
  assessedBy: text('assessed_by').notNull(), // 'AI' or employee ID
  assessorRole: text('assessor_role'), // 'recruiter', 'hiring_manager', 'ai_agent'
  
  // Scoring
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),
  scores: jsonb('scores').notNull(), // detailed scoring breakdown
  maxScore: decimal('max_score', { precision: 5, scale: 2 }).default('100.00'),
  passingScore: decimal('passing_score', { precision: 5, scale: 2 }).default('70.00'),
  passed: boolean('passed').default(false),
  
  // Skills assessment
  skillsAssessed: jsonb('skills_assessed').default([]), // array of skill objects
  skillGaps: jsonb('skill_gaps').default([]), // identified gaps
  skillStrengths: jsonb('skill_strengths').default([]), // identified strengths
  
  // Culture fit assessment (Mizan 7 Cylinders)
  cultureFitAnalysis: jsonb('culture_fit_analysis'), // detailed analysis per cylinder
  cultureAlignment: jsonb('culture_alignment'), // alignment scores
  cultureFitScore: decimal('culture_fit_score', { precision: 5, scale: 2 }),
  
  // Analysis
  strengths: jsonb('strengths').default([]), // array of strength descriptions
  weaknesses: jsonb('weaknesses').default([]), // array of weakness descriptions
  opportunities: jsonb('opportunities').default([]), // development opportunities
  concerns: jsonb('concerns').default([]), // areas of concern
  
  // Recommendations
  recommendation: text('recommendation'), // hire, maybe, pass
  recommendations: text('recommendations'), // detailed recommendation text
  nextSteps: jsonb('next_steps').default([]), // suggested next actions
  
  // Technical assessment specific
  technicalChallenges: jsonb('technical_challenges'), // for technical assessments
  codeQuality: decimal('code_quality', { precision: 5, scale: 2 }),
  problemSolving: decimal('problem_solving', { precision: 5, scale: 2 }),
  
  // Behavioral assessment specific
  behavioralTraits: jsonb('behavioral_traits'), // trait scores
  leadershipPotential: decimal('leadership_potential', { precision: 5, scale: 2 }),
  teamworkScore: decimal('teamwork_score', { precision: 5, scale: 2 }),
  
  // Assessment metadata
  assessmentDuration: integer('assessment_duration'), // minutes
  completionRate: decimal('completion_rate', { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // Timestamps
  assessmentDate: timestamp('assessment_date', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  
  // Metadata
  metadata: jsonb('metadata').default({})
});

/**
 * Interviews Table
 * Stores interview schedules, feedback, and outcomes
 */
export const interviews = pgTable('interviews', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  candidateId: uuid('candidate_id').notNull(),
  requisitionId: uuid('requisition_id').notNull(),
  
  // Interview details
  interviewType: interviewTypeEnum('interview_type').notNull(),
  round: integer('round').notNull().default(1),
  title: text('title').notNull(), // e.g., "Technical Interview Round 1"
  description: text('description'),
  
  // Scheduling
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
  duration: integer('duration').notNull().default(60), // minutes
  timezone: text('timezone').default('UTC'),
  
  // Location
  location: text('location'), // for in-person interviews
  meetingLink: text('meeting_link'), // for video interviews
  meetingPlatform: text('meeting_platform'), // Zoom, Teams, Meet, etc.
  meetingId: text('meeting_id'),
  
  // Participants
  interviewers: jsonb('interviewers').notNull(), // array of interviewer objects
  primaryInterviewer: uuid('primary_interviewer'),
  panelSize: integer('panel_size').default(1),
  
  // Status
  status: interviewStatusEnum('status').notNull().default('scheduled'),
  confirmationSent: boolean('confirmation_sent').default(false),
  reminderSent: boolean('reminder_sent').default(false),
  
  // Feedback and scoring
  feedback: jsonb('feedback').default([]), // array of feedback from each interviewer
  scores: jsonb('scores'), // consolidated scores
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }),
  
  // Recommendations
  recommendation: interviewRecommendationEnum('recommendation'),
  recommendations: text('recommendations'), // detailed recommendation text
  
  // Assessment areas
  technicalSkills: decimal('technical_skills', { precision: 5, scale: 2 }),
  communication: decimal('communication', { precision: 5, scale: 2 }),
  problemSolving: decimal('problem_solving', { precision: 5, scale: 2 }),
  cultureFit: decimal('culture_fit', { precision: 5, scale: 2 }),
  leadershipPotential: decimal('leadership_potential', { precision: 5, scale: 2 }),
  
  // Observations
  strengths: jsonb('strengths').default([]),
  weaknesses: jsonb('weaknesses').default([]),
  concerns: jsonb('concerns').default([]),
  redFlags: jsonb('red_flags').default([]),
  
  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'), // not shared with candidate
  
  // Recording and transcript
  recordingUrl: text('recording_url'),
  transcriptUrl: text('transcript_url'),
  
  // Completion
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelReason: text('cancel_reason'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  
  // Metadata
  metadata: jsonb('metadata').default({})
});

/**
 * Offers Table
 * Stores job offers and their status
 */
export const offers = pgTable('offers', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  candidateId: uuid('candidate_id').notNull(),
  requisitionId: uuid('requisition_id').notNull(),
  
  // Position details
  positionTitle: text('position_title').notNull(),
  department: text('department').notNull(),
  level: jobLevelEnum('level').notNull(),
  type: jobTypeEnum('type').notNull(),
  location: text('location').notNull(),
  remote: boolean('remote').default(false),
  
  // Compensation
  salary: decimal('salary', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  payFrequency: text('pay_frequency').default('annual'), // annual, hourly
  
  // Additional compensation
  bonus: jsonb('bonus'), // { type, amount, description, frequency }
  equity: jsonb('equity'), // { type, amount, vestingSchedule }
  signOnBonus: decimal('sign_on_bonus', { precision: 12, scale: 2 }),
  
  // Benefits
  benefits: jsonb('benefits').notNull().default([]), // array of benefit objects
  benefitsValue: decimal('benefits_value', { precision: 12, scale: 2 }), // estimated annual value
  
  // Relocation
  relocationAssistance: boolean('relocation_assistance').default(false),
  relocationPackage: jsonb('relocation_package'), // details of relocation assistance
  
  // Employment terms
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  employmentType: text('employment_type'), // at_will, contract, etc.
  probationPeriod: text('probation_period'), // e.g., "90 days"
  
  // Offer documents
  offerLetterUrl: text('offer_letter_url'),
  contractUrl: text('contract_url'),
  additionalDocuments: jsonb('additional_documents').default([]),
  
  // Status and workflow
  status: offerStatusEnum('status').notNull().default('draft'),
  version: integer('version').notNull().default(1), // for tracking revisions
  
  // Approval workflow
  requiresApproval: boolean('requires_approval').default(true),
  approvedBy: uuid('approved_by'),
  approvalDate: timestamp('approval_date', { withTimezone: true }),
  
  // Dates
  sentDate: timestamp('sent_date', { withTimezone: true }),
  expiryDate: timestamp('expiry_date', { withTimezone: true }),
  respondedDate: timestamp('responded_date', { withTimezone: true }),
  acceptedDate: timestamp('accepted_date', { withTimezone: true }),
  rejectedDate: timestamp('rejected_date', { withTimezone: true }),
  
  // Negotiations
  negotiationNotes: text('negotiation_notes'),
  negotiationHistory: jsonb('negotiation_history').default([]), // array of negotiation rounds
  counterOffers: jsonb('counter_offers').default([]), // array of counter offer details
  
  // Rejection/withdrawal
  rejectionReason: text('rejection_reason'),
  withdrawalReason: text('withdrawal_reason'),
  
  // Next steps
  onboardingTriggered: boolean('onboarding_triggered').default(false),
  onboardingDate: timestamp('onboarding_date', { withTimezone: true }),
  
  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// ============================================================================
// RELATIONS
// ============================================================================

export const hiringRequisitionsRelations = relations(hiringRequisitions, ({ many }) => ({
  candidates: many(candidates),
  interviews: many(interviews),
  offers: many(offers),
  assessments: many(candidateAssessments),
  jobPostings: many(jobPostings)
}));

export const jobPostingsRelations = relations(jobPostings, ({ one }) => ({
  requisition: one(hiringRequisitions, {
    fields: [jobPostings.requisitionId],
    references: [hiringRequisitions.id]
  })
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  requisition: one(hiringRequisitions, {
    fields: [candidates.requisitionId],
    references: [hiringRequisitions.id]
  }),
  assessments: many(candidateAssessments),
  interviews: many(interviews),
  offers: many(offers)
}));

export const candidateAssessmentsRelations = relations(candidateAssessments, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateAssessments.candidateId],
    references: [candidates.id]
  }),
  requisition: one(hiringRequisitions, {
    fields: [candidateAssessments.requisitionId],
    references: [hiringRequisitions.id]
  })
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  candidate: one(candidates, {
    fields: [interviews.candidateId],
    references: [candidates.id]
  }),
  requisition: one(hiringRequisitions, {
    fields: [interviews.requisitionId],
    references: [hiringRequisitions.id]
  })
}));

export const offersRelations = relations(offers, ({ one }) => ({
  candidate: one(candidates, {
    fields: [offers.candidateId],
    references: [candidates.id]
  }),
  requisition: one(hiringRequisitions, {
    fields: [offers.requisitionId],
    references: [hiringRequisitions.id]
  })
}));

