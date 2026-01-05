"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offersRelations = exports.interviewsRelations = exports.candidateAssessmentsRelations = exports.candidatesRelations = exports.jobPostingsRelations = exports.hiringRequisitionsRelations = exports.offers = exports.interviews = exports.candidateAssessments = exports.candidates = exports.jobPostings = exports.hiringRequisitions = exports.jobPostingStatusEnum = exports.offerStatusEnum = exports.interviewRecommendationEnum = exports.interviewStatusEnum = exports.interviewTypeEnum = exports.assessmentTypeEnum = exports.candidateStageEnum = exports.candidateStatusEnum = exports.candidateSourceEnum = exports.requisitionStatusEnum = exports.requisitionUrgencyEnum = exports.jobTypeEnum = exports.jobLevelEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// ============================================================================
// ENUMS
// ============================================================================
exports.jobLevelEnum = (0, pg_core_1.pgEnum)('job_level', ['entry', 'mid', 'senior', 'executive', 'leadership']);
exports.jobTypeEnum = (0, pg_core_1.pgEnum)('job_type', ['full_time', 'part_time', 'contract', 'temporary', 'intern']);
exports.requisitionUrgencyEnum = (0, pg_core_1.pgEnum)('requisition_urgency', ['low', 'medium', 'high', 'critical']);
exports.requisitionStatusEnum = (0, pg_core_1.pgEnum)('requisition_status', [
    'draft',
    'pending_approval',
    'approved',
    'posted',
    'filled',
    'cancelled',
    'on_hold'
]);
exports.candidateSourceEnum = (0, pg_core_1.pgEnum)('candidate_source', [
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
exports.candidateStatusEnum = (0, pg_core_1.pgEnum)('candidate_status', [
    'applied',
    'screening',
    'interview',
    'offer',
    'hired',
    'rejected',
    'withdrawn',
    'on_hold'
]);
exports.candidateStageEnum = (0, pg_core_1.pgEnum)('candidate_stage', [
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
exports.assessmentTypeEnum = (0, pg_core_1.pgEnum)('assessment_type', [
    'skills',
    'culture_fit',
    'technical',
    'behavioral',
    'cognitive',
    'personality',
    'resume_review'
]);
exports.interviewTypeEnum = (0, pg_core_1.pgEnum)('interview_type', [
    'phone',
    'video',
    'in_person',
    'technical',
    'behavioral',
    'panel',
    'culture_fit',
    'final'
]);
exports.interviewStatusEnum = (0, pg_core_1.pgEnum)('interview_status', [
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'rescheduled',
    'no_show'
]);
exports.interviewRecommendationEnum = (0, pg_core_1.pgEnum)('interview_recommendation', [
    'strong_yes',
    'yes',
    'maybe',
    'no',
    'strong_no'
]);
exports.offerStatusEnum = (0, pg_core_1.pgEnum)('offer_status', [
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
exports.jobPostingStatusEnum = (0, pg_core_1.pgEnum)('job_posting_status', [
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
exports.hiringRequisitions = (0, pg_core_1.pgTable)('hiring_requisitions', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    // Position details
    positionTitle: (0, pg_core_1.text)('position_title').notNull(),
    department: (0, pg_core_1.text)('department').notNull(),
    level: (0, exports.jobLevelEnum)('level').notNull(),
    type: (0, exports.jobTypeEnum)('type').notNull().default('full_time'),
    // Location
    location: (0, pg_core_1.text)('location').notNull(),
    remote: (0, pg_core_1.boolean)('remote').notNull().default(false),
    remoteDetails: (0, pg_core_1.text)('remote_details'), // fully_remote, hybrid, on_site
    // Job description
    description: (0, pg_core_1.text)('description').notNull(),
    responsibilities: (0, pg_core_1.jsonb)('responsibilities').notNull().default([]), // array of strings
    qualifications: (0, pg_core_1.jsonb)('qualifications').notNull().default([]), // array of strings
    // Skills and requirements
    requiredSkills: (0, pg_core_1.jsonb)('required_skills').notNull().default([]), // array of skill objects
    preferredSkills: (0, pg_core_1.jsonb)('preferred_skills').default([]), // array of skill objects
    experienceRequired: (0, pg_core_1.text)('experience_required'), // e.g., "3-5 years"
    educationRequired: (0, pg_core_1.text)('education_required'),
    // Culture fit requirements (Mizan 7 Cylinders)
    cultureValues: (0, pg_core_1.jsonb)('culture_values').default([]), // array of values from 7 cylinders
    cultureFitWeight: (0, pg_core_1.decimal)('culture_fit_weight', { precision: 3, scale: 2 }).default('0.30'), // 0.00 to 1.00
    // Compensation
    compensationRange: (0, pg_core_1.jsonb)('compensation_range').notNull(), // { min, max, currency }
    bonus: (0, pg_core_1.jsonb)('bonus'), // { type, amount, description }
    equity: (0, pg_core_1.text)('equity'),
    benefits: (0, pg_core_1.jsonb)('benefits').default([]), // array of benefit strings
    relocationPackage: (0, pg_core_1.boolean)('relocation_package').default(false),
    relocationDetails: (0, pg_core_1.text)('relocation_details'),
    // Requisition management
    urgency: (0, exports.requisitionUrgencyEnum)('urgency').notNull().default('medium'),
    status: (0, exports.requisitionStatusEnum)('status').notNull().default('draft'),
    numberOfPositions: (0, pg_core_1.integer)('number_of_positions').notNull().default(1),
    positionsFilled: (0, pg_core_1.integer)('positions_filled').notNull().default(0),
    // Dates
    targetStartDate: (0, pg_core_1.timestamp)('target_start_date', { withTimezone: true }),
    expectedCloseDate: (0, pg_core_1.timestamp)('expected_close_date', { withTimezone: true }),
    postedDate: (0, pg_core_1.timestamp)('posted_date', { withTimezone: true }),
    closedDate: (0, pg_core_1.timestamp)('closed_date', { withTimezone: true }),
    // Ownership and approval
    requestedBy: (0, pg_core_1.uuid)('requested_by').notNull(), // Employee who requested
    hiringManagerId: (0, pg_core_1.uuid)('hiring_manager_id').notNull(),
    recruiterId: (0, pg_core_1.uuid)('recruiter_id'), // Assigned recruiter
    approvedBy: (0, pg_core_1.uuid)('approved_by'),
    approvalDate: (0, pg_core_1.timestamp)('approval_date', { withTimezone: true }),
    // Job posting details
    jobPostingUrl: (0, pg_core_1.text)('job_posting_url'),
    jobBoards: (0, pg_core_1.jsonb)('job_boards').default([]), // array of board names where posted
    // AI and automation
    aiGenerated: (0, pg_core_1.boolean)('ai_generated').default(false),
    aiRecommendations: (0, pg_core_1.jsonb)('ai_recommendations'), // AI suggestions for improvements
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata').default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow()
});
/**
 * Job Postings Table
 * Stores published job postings with marketing content
 */
exports.jobPostings = (0, pg_core_1.pgTable)('job_postings', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    requisitionId: (0, pg_core_1.uuid)('requisition_id').notNull(),
    // Job posting content
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description').notNull(), // Full job description
    responsibilities: (0, pg_core_1.text)('responsibilities').notNull(), // Formatted list
    requirements: (0, pg_core_1.text)('requirements').notNull(), // Formatted list
    qualifications: (0, pg_core_1.text)('qualifications'), // Formatted list
    // Company information
    companyName: (0, pg_core_1.text)('company_name').notNull(),
    companyDescription: (0, pg_core_1.text)('company_description'),
    companyValues: (0, pg_core_1.jsonb)('company_values').default([]),
    companyBenefits: (0, pg_core_1.text)('company_benefits'),
    // Compensation display
    salaryRange: (0, pg_core_1.text)('salary_range'), // e.g., "$100k - $150k"
    displaySalary: (0, pg_core_1.boolean)('display_salary').default(true),
    benefitsSummary: (0, pg_core_1.text)('benefits_summary'),
    // Location
    location: (0, pg_core_1.text)('location').notNull(),
    remote: (0, pg_core_1.boolean)('remote').default(false),
    remoteDetails: (0, pg_core_1.text)('remote_details'),
    // Platform-specific versions
    linkedInVersion: (0, pg_core_1.text)('linkedin_version'), // LinkedIn-optimized version
    indeedVersion: (0, pg_core_1.text)('indeed_version'), // Indeed-optimized version
    careerPageVersion: (0, pg_core_1.text)('career_page_version'), // Company career page version
    // SEO and marketing
    seoTitle: (0, pg_core_1.text)('seo_title'),
    seoDescription: (0, pg_core_1.text)('seo_description'),
    keywords: (0, pg_core_1.jsonb)('keywords').default([]), // array of SEO keywords
    // Publishing
    status: (0, exports.jobPostingStatusEnum)('status').notNull().default('draft'),
    publishedPlatforms: (0, pg_core_1.jsonb)('published_platforms').default([]), // array of platform names
    careerPageUrl: (0, pg_core_1.text)('career_page_url'),
    externalUrls: (0, pg_core_1.jsonb)('external_urls').default({}), // { linkedin: url, indeed: url, etc. }
    // Approval workflow
    requiresApproval: (0, pg_core_1.boolean)('requires_approval').default(true),
    approvedBy: (0, pg_core_1.uuid)('approved_by'),
    approvalDate: (0, pg_core_1.timestamp)('approval_date', { withTimezone: true }),
    approvalNotes: (0, pg_core_1.text)('approval_notes'),
    // Dates
    publishedAt: (0, pg_core_1.timestamp)('published_at', { withTimezone: true }),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }),
    closedAt: (0, pg_core_1.timestamp)('closed_at', { withTimezone: true }),
    // Analytics
    views: (0, pg_core_1.integer)('views').default(0),
    applications: (0, pg_core_1.integer)('applications').default(0),
    clickThroughRate: (0, pg_core_1.decimal)('click_through_rate', { precision: 5, scale: 2 }),
    // AI generation
    aiGenerated: (0, pg_core_1.boolean)('ai_generated').default(false),
    generatedBy: (0, pg_core_1.text)('generated_by'), // 'hiring_agent', 'job_posting_generator'
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata').default({}),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow()
});
/**
 * Candidates Table
 * Stores candidate information and application data
 */
exports.candidates = (0, pg_core_1.pgTable)('candidates', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    requisitionId: (0, pg_core_1.uuid)('requisition_id').notNull(),
    // Personal information
    firstName: (0, pg_core_1.text)('first_name').notNull(),
    lastName: (0, pg_core_1.text)('last_name').notNull(),
    email: (0, pg_core_1.text)('email').notNull(),
    phone: (0, pg_core_1.text)('phone'),
    // Professional profiles
    linkedinUrl: (0, pg_core_1.text)('linkedin_url'),
    portfolioUrl: (0, pg_core_1.text)('portfolio_url'),
    githubUrl: (0, pg_core_1.text)('github_url'),
    personalWebsite: (0, pg_core_1.text)('personal_website'),
    // Application documents
    resumeUrl: (0, pg_core_1.text)('resume_url').notNull(),
    coverLetterUrl: (0, pg_core_1.text)('cover_letter_url'),
    additionalDocuments: (0, pg_core_1.jsonb)('additional_documents').default([]), // array of document URLs
    // Application source
    source: (0, exports.candidateSourceEnum)('source').notNull(),
    sourceDetails: (0, pg_core_1.text)('source_details'), // referrer name, agency, etc.
    referredBy: (0, pg_core_1.uuid)('referred_by'), // Employee ID if referral
    // Current employment
    currentCompany: (0, pg_core_1.text)('current_company'),
    currentTitle: (0, pg_core_1.text)('current_title'),
    yearsOfExperience: (0, pg_core_1.integer)('years_of_experience'),
    currentSalary: (0, pg_core_1.decimal)('current_salary', { precision: 12, scale: 2 }),
    expectedSalary: (0, pg_core_1.decimal)('expected_salary', { precision: 12, scale: 2 }),
    noticePeriod: (0, pg_core_1.text)('notice_period'), // e.g., "2 weeks", "1 month"
    // Education
    education: (0, pg_core_1.jsonb)('education').default([]), // array of education objects
    certifications: (0, pg_core_1.jsonb)('certifications').default([]), // array of certification objects
    // Skills and experience
    skills: (0, pg_core_1.jsonb)('skills').default([]), // array of skill objects with proficiency
    languages: (0, pg_core_1.jsonb)('languages').default([]), // array of language objects with proficiency
    industryExperience: (0, pg_core_1.jsonb)('industry_experience').default([]),
    // Application status
    status: (0, exports.candidateStatusEnum)('status').notNull().default('applied'),
    stage: (0, exports.candidateStageEnum)('stage').notNull().default('application'),
    // Scoring
    overallScore: (0, pg_core_1.decimal)('overall_score', { precision: 5, scale: 2 }),
    skillsScore: (0, pg_core_1.decimal)('skills_score', { precision: 5, scale: 2 }),
    cultureScore: (0, pg_core_1.decimal)('culture_score', { precision: 5, scale: 2 }),
    experienceScore: (0, pg_core_1.decimal)('experience_score', { precision: 5, scale: 2 }),
    educationScore: (0, pg_core_1.decimal)('education_score', { precision: 5, scale: 2 }),
    // Assessment summary
    assessmentSummary: (0, pg_core_1.jsonb)('assessment_summary'), // consolidated assessment results
    strengths: (0, pg_core_1.jsonb)('strengths').default([]), // array of strings
    weaknesses: (0, pg_core_1.jsonb)('weaknesses').default([]), // array of strings
    redFlags: (0, pg_core_1.jsonb)('red_flags').default([]), // array of concern objects
    // Culture fit (Mizan 7 Cylinders alignment)
    cultureAnalysis: (0, pg_core_1.jsonb)('culture_analysis'), // detailed culture fit analysis
    cultureAlignment: (0, pg_core_1.jsonb)('culture_alignment'), // alignment scores per cylinder
    // Communication and notes
    notes: (0, pg_core_1.text)('notes'),
    internalNotes: (0, pg_core_1.text)('internal_notes'), // not visible to candidate
    tags: (0, pg_core_1.jsonb)('tags').default([]), // array of tags for filtering
    // Preferences
    willingToRelocate: (0, pg_core_1.boolean)('willing_to_relocate'),
    remotePreference: (0, pg_core_1.text)('remote_preference'), // remote_only, hybrid, on_site, flexible
    availableStartDate: (0, pg_core_1.timestamp)('available_start_date', { withTimezone: true }),
    // Communication tracking
    lastContactedDate: (0, pg_core_1.timestamp)('last_contacted_date', { withTimezone: true }),
    responseRate: (0, pg_core_1.decimal)('response_rate', { precision: 3, scale: 2 }), // 0.00 to 1.00
    // AI insights
    aiRecommendation: (0, pg_core_1.text)('ai_recommendation'), // strong_hire, hire, maybe, pass, strong_pass
    aiInsights: (0, pg_core_1.jsonb)('ai_insights'), // AI-generated insights and recommendations
    // Dates
    appliedAt: (0, pg_core_1.timestamp)('applied_at', { withTimezone: true }).defaultNow(),
    lastUpdatedBy: (0, pg_core_1.uuid)('last_updated_by'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata').default({})
});
/**
 * Candidate Assessments Table
 * Stores detailed assessment results for candidates
 */
exports.candidateAssessments = (0, pg_core_1.pgTable)('candidate_assessments', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    candidateId: (0, pg_core_1.uuid)('candidate_id').notNull(),
    requisitionId: (0, pg_core_1.uuid)('requisition_id').notNull(),
    // Assessment details
    assessmentType: (0, exports.assessmentTypeEnum)('assessment_type').notNull(),
    assessmentName: (0, pg_core_1.text)('assessment_name').notNull(),
    assessedBy: (0, pg_core_1.text)('assessed_by').notNull(), // 'AI' or employee ID
    assessorRole: (0, pg_core_1.text)('assessor_role'), // 'recruiter', 'hiring_manager', 'ai_agent'
    // Scoring
    overallScore: (0, pg_core_1.decimal)('overall_score', { precision: 5, scale: 2 }).notNull(),
    scores: (0, pg_core_1.jsonb)('scores').notNull(), // detailed scoring breakdown
    maxScore: (0, pg_core_1.decimal)('max_score', { precision: 5, scale: 2 }).default('100.00'),
    passingScore: (0, pg_core_1.decimal)('passing_score', { precision: 5, scale: 2 }).default('70.00'),
    passed: (0, pg_core_1.boolean)('passed').default(false),
    // Skills assessment
    skillsAssessed: (0, pg_core_1.jsonb)('skills_assessed').default([]), // array of skill objects
    skillGaps: (0, pg_core_1.jsonb)('skill_gaps').default([]), // identified gaps
    skillStrengths: (0, pg_core_1.jsonb)('skill_strengths').default([]), // identified strengths
    // Culture fit assessment (Mizan 7 Cylinders)
    cultureFitAnalysis: (0, pg_core_1.jsonb)('culture_fit_analysis'), // detailed analysis per cylinder
    cultureAlignment: (0, pg_core_1.jsonb)('culture_alignment'), // alignment scores
    cultureFitScore: (0, pg_core_1.decimal)('culture_fit_score', { precision: 5, scale: 2 }),
    // Analysis
    strengths: (0, pg_core_1.jsonb)('strengths').default([]), // array of strength descriptions
    weaknesses: (0, pg_core_1.jsonb)('weaknesses').default([]), // array of weakness descriptions
    opportunities: (0, pg_core_1.jsonb)('opportunities').default([]), // development opportunities
    concerns: (0, pg_core_1.jsonb)('concerns').default([]), // areas of concern
    // Recommendations
    recommendation: (0, pg_core_1.text)('recommendation'), // hire, maybe, pass
    recommendations: (0, pg_core_1.text)('recommendations'), // detailed recommendation text
    nextSteps: (0, pg_core_1.jsonb)('next_steps').default([]), // suggested next actions
    // Technical assessment specific
    technicalChallenges: (0, pg_core_1.jsonb)('technical_challenges'), // for technical assessments
    codeQuality: (0, pg_core_1.decimal)('code_quality', { precision: 5, scale: 2 }),
    problemSolving: (0, pg_core_1.decimal)('problem_solving', { precision: 5, scale: 2 }),
    // Behavioral assessment specific
    behavioralTraits: (0, pg_core_1.jsonb)('behavioral_traits'), // trait scores
    leadershipPotential: (0, pg_core_1.decimal)('leadership_potential', { precision: 5, scale: 2 }),
    teamworkScore: (0, pg_core_1.decimal)('teamwork_score', { precision: 5, scale: 2 }),
    // Assessment metadata
    assessmentDuration: (0, pg_core_1.integer)('assessment_duration'), // minutes
    completionRate: (0, pg_core_1.decimal)('completion_rate', { precision: 3, scale: 2 }), // 0.00 to 1.00
    // Timestamps
    assessmentDate: (0, pg_core_1.timestamp)('assessment_date', { withTimezone: true }).defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata').default({})
});
/**
 * Interviews Table
 * Stores interview schedules, feedback, and outcomes
 */
exports.interviews = (0, pg_core_1.pgTable)('interviews', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    candidateId: (0, pg_core_1.uuid)('candidate_id').notNull(),
    requisitionId: (0, pg_core_1.uuid)('requisition_id').notNull(),
    // Interview details
    interviewType: (0, exports.interviewTypeEnum)('interview_type').notNull(),
    round: (0, pg_core_1.integer)('round').notNull().default(1),
    title: (0, pg_core_1.text)('title').notNull(), // e.g., "Technical Interview Round 1"
    description: (0, pg_core_1.text)('description'),
    // Scheduling
    scheduledDate: (0, pg_core_1.timestamp)('scheduled_date', { withTimezone: true }).notNull(),
    duration: (0, pg_core_1.integer)('duration').notNull().default(60), // minutes
    timezone: (0, pg_core_1.text)('timezone').default('UTC'),
    // Location
    location: (0, pg_core_1.text)('location'), // for in-person interviews
    meetingLink: (0, pg_core_1.text)('meeting_link'), // for video interviews
    meetingPlatform: (0, pg_core_1.text)('meeting_platform'), // Zoom, Teams, Meet, etc.
    meetingId: (0, pg_core_1.text)('meeting_id'),
    // Participants
    interviewers: (0, pg_core_1.jsonb)('interviewers').notNull(), // array of interviewer objects
    primaryInterviewer: (0, pg_core_1.uuid)('primary_interviewer'),
    panelSize: (0, pg_core_1.integer)('panel_size').default(1),
    // Status
    status: (0, exports.interviewStatusEnum)('status').notNull().default('scheduled'),
    confirmationSent: (0, pg_core_1.boolean)('confirmation_sent').default(false),
    reminderSent: (0, pg_core_1.boolean)('reminder_sent').default(false),
    // Feedback and scoring
    feedback: (0, pg_core_1.jsonb)('feedback').default([]), // array of feedback from each interviewer
    scores: (0, pg_core_1.jsonb)('scores'), // consolidated scores
    overallScore: (0, pg_core_1.decimal)('overall_score', { precision: 5, scale: 2 }),
    // Recommendations
    recommendation: (0, exports.interviewRecommendationEnum)('recommendation'),
    recommendations: (0, pg_core_1.text)('recommendations'), // detailed recommendation text
    // Assessment areas
    technicalSkills: (0, pg_core_1.decimal)('technical_skills', { precision: 5, scale: 2 }),
    communication: (0, pg_core_1.decimal)('communication', { precision: 5, scale: 2 }),
    problemSolving: (0, pg_core_1.decimal)('problem_solving', { precision: 5, scale: 2 }),
    cultureFit: (0, pg_core_1.decimal)('culture_fit', { precision: 5, scale: 2 }),
    leadershipPotential: (0, pg_core_1.decimal)('leadership_potential', { precision: 5, scale: 2 }),
    // Observations
    strengths: (0, pg_core_1.jsonb)('strengths').default([]),
    weaknesses: (0, pg_core_1.jsonb)('weaknesses').default([]),
    concerns: (0, pg_core_1.jsonb)('concerns').default([]),
    redFlags: (0, pg_core_1.jsonb)('red_flags').default([]),
    // Notes
    notes: (0, pg_core_1.text)('notes'),
    internalNotes: (0, pg_core_1.text)('internal_notes'), // not shared with candidate
    // Recording and transcript
    recordingUrl: (0, pg_core_1.text)('recording_url'),
    transcriptUrl: (0, pg_core_1.text)('transcript_url'),
    // Completion
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    cancelledAt: (0, pg_core_1.timestamp)('cancelled_at', { withTimezone: true }),
    cancelReason: (0, pg_core_1.text)('cancel_reason'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata').default({})
});
/**
 * Offers Table
 * Stores job offers and their status
 */
exports.offers = (0, pg_core_1.pgTable)('offers', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    candidateId: (0, pg_core_1.uuid)('candidate_id').notNull(),
    requisitionId: (0, pg_core_1.uuid)('requisition_id').notNull(),
    // Position details
    positionTitle: (0, pg_core_1.text)('position_title').notNull(),
    department: (0, pg_core_1.text)('department').notNull(),
    level: (0, exports.jobLevelEnum)('level').notNull(),
    type: (0, exports.jobTypeEnum)('type').notNull(),
    location: (0, pg_core_1.text)('location').notNull(),
    remote: (0, pg_core_1.boolean)('remote').default(false),
    // Compensation
    salary: (0, pg_core_1.decimal)('salary', { precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.text)('currency').notNull().default('USD'),
    payFrequency: (0, pg_core_1.text)('pay_frequency').default('annual'), // annual, hourly
    // Additional compensation
    bonus: (0, pg_core_1.jsonb)('bonus'), // { type, amount, description, frequency }
    equity: (0, pg_core_1.jsonb)('equity'), // { type, amount, vestingSchedule }
    signOnBonus: (0, pg_core_1.decimal)('sign_on_bonus', { precision: 12, scale: 2 }),
    // Benefits
    benefits: (0, pg_core_1.jsonb)('benefits').notNull().default([]), // array of benefit objects
    benefitsValue: (0, pg_core_1.decimal)('benefits_value', { precision: 12, scale: 2 }), // estimated annual value
    // Relocation
    relocationAssistance: (0, pg_core_1.boolean)('relocation_assistance').default(false),
    relocationPackage: (0, pg_core_1.jsonb)('relocation_package'), // details of relocation assistance
    // Employment terms
    startDate: (0, pg_core_1.timestamp)('start_date', { withTimezone: true }).notNull(),
    employmentType: (0, pg_core_1.text)('employment_type'), // at_will, contract, etc.
    probationPeriod: (0, pg_core_1.text)('probation_period'), // e.g., "90 days"
    // Offer documents
    offerLetterUrl: (0, pg_core_1.text)('offer_letter_url'),
    contractUrl: (0, pg_core_1.text)('contract_url'),
    additionalDocuments: (0, pg_core_1.jsonb)('additional_documents').default([]),
    // Status and workflow
    status: (0, exports.offerStatusEnum)('status').notNull().default('draft'),
    version: (0, pg_core_1.integer)('version').notNull().default(1), // for tracking revisions
    // Approval workflow
    requiresApproval: (0, pg_core_1.boolean)('requires_approval').default(true),
    approvedBy: (0, pg_core_1.uuid)('approved_by'),
    approvalDate: (0, pg_core_1.timestamp)('approval_date', { withTimezone: true }),
    // Dates
    sentDate: (0, pg_core_1.timestamp)('sent_date', { withTimezone: true }),
    expiryDate: (0, pg_core_1.timestamp)('expiry_date', { withTimezone: true }),
    respondedDate: (0, pg_core_1.timestamp)('responded_date', { withTimezone: true }),
    acceptedDate: (0, pg_core_1.timestamp)('accepted_date', { withTimezone: true }),
    rejectedDate: (0, pg_core_1.timestamp)('rejected_date', { withTimezone: true }),
    // Negotiations
    negotiationNotes: (0, pg_core_1.text)('negotiation_notes'),
    negotiationHistory: (0, pg_core_1.jsonb)('negotiation_history').default([]), // array of negotiation rounds
    counterOffers: (0, pg_core_1.jsonb)('counter_offers').default([]), // array of counter offer details
    // Rejection/withdrawal
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    withdrawalReason: (0, pg_core_1.text)('withdrawal_reason'),
    // Next steps
    onboardingTriggered: (0, pg_core_1.boolean)('onboarding_triggered').default(false),
    onboardingDate: (0, pg_core_1.timestamp)('onboarding_date', { withTimezone: true }),
    // Metadata
    notes: (0, pg_core_1.text)('notes'),
    metadata: (0, pg_core_1.jsonb)('metadata').default({}),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow()
});
// ============================================================================
// RELATIONS
// ============================================================================
exports.hiringRequisitionsRelations = (0, drizzle_orm_1.relations)(exports.hiringRequisitions, ({ many }) => ({
    candidates: many(exports.candidates),
    interviews: many(exports.interviews),
    offers: many(exports.offers),
    assessments: many(exports.candidateAssessments),
    jobPostings: many(exports.jobPostings)
}));
exports.jobPostingsRelations = (0, drizzle_orm_1.relations)(exports.jobPostings, ({ one }) => ({
    requisition: one(exports.hiringRequisitions, {
        fields: [exports.jobPostings.requisitionId],
        references: [exports.hiringRequisitions.id]
    })
}));
exports.candidatesRelations = (0, drizzle_orm_1.relations)(exports.candidates, ({ one, many }) => ({
    requisition: one(exports.hiringRequisitions, {
        fields: [exports.candidates.requisitionId],
        references: [exports.hiringRequisitions.id]
    }),
    assessments: many(exports.candidateAssessments),
    interviews: many(exports.interviews),
    offers: many(exports.offers)
}));
exports.candidateAssessmentsRelations = (0, drizzle_orm_1.relations)(exports.candidateAssessments, ({ one }) => ({
    candidate: one(exports.candidates, {
        fields: [exports.candidateAssessments.candidateId],
        references: [exports.candidates.id]
    }),
    requisition: one(exports.hiringRequisitions, {
        fields: [exports.candidateAssessments.requisitionId],
        references: [exports.hiringRequisitions.id]
    })
}));
exports.interviewsRelations = (0, drizzle_orm_1.relations)(exports.interviews, ({ one }) => ({
    candidate: one(exports.candidates, {
        fields: [exports.interviews.candidateId],
        references: [exports.candidates.id]
    }),
    requisition: one(exports.hiringRequisitions, {
        fields: [exports.interviews.requisitionId],
        references: [exports.hiringRequisitions.id]
    })
}));
exports.offersRelations = (0, drizzle_orm_1.relations)(exports.offers, ({ one }) => ({
    candidate: one(exports.candidates, {
        fields: [exports.offers.candidateId],
        references: [exports.candidates.id]
    }),
    requisition: one(exports.hiringRequisitions, {
        fields: [exports.offers.requisitionId],
        references: [exports.hiringRequisitions.id]
    })
}));
//# sourceMappingURL=hiring.js.map