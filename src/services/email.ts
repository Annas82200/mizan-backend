// server/services/email.ts

import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string | string[];
  template: string;
  data: Record<string, unknown>;
  from?: string;
}

export class EmailService {
  private defaultFrom: string;

  constructor() {
    this.defaultFrom = process.env.FROM_EMAIL || 'noreply@mizan.ai';
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      const template = this.getTemplate(emailData.template, emailData.data);
      
      const msg = {
        to: emailData.to,
        from: emailData.from || this.defaultFrom,
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      await sgMail.send(msg);
      logger.info(`Email sent successfully to ${emailData.to}`);
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendBulkEmails(emails: EmailData[]): Promise<void> {
    const promises = emails.map(email => this.sendEmail(email));
    await Promise.allSettled(promises);
  }

  private getTemplate(templateName: string, data: Record<string, unknown>): EmailTemplate {
    interface EmailData {
      name?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      userName?: unknown;
      companyName?: unknown;
      company?: unknown;
      analysisType?: unknown;
      demoUrl?: unknown;
      score?: unknown;
      insights?: unknown;
      findings?: unknown;
      actionUrl?: unknown;
      resetUrl?: unknown;
      resetLink?: unknown;
      verificationUrl?: unknown;
      amount?: unknown;
      currency?: unknown;
      invoiceUrl?: unknown;
      nextBillingDate?: unknown;
      reason?: unknown;
      supportUrl?: unknown;
      invitationLink?: unknown;
      dashboardLink?: unknown;
      phone?: unknown;
      employeeCount?: unknown;
      industry?: unknown;
      interestedIn?: unknown;
      message?: unknown;
      type?: unknown;
      email?: unknown;
      plan?: unknown;
      customerName?: unknown;
      billingPeriod?: unknown;
      title?: unknown;
      department?: unknown;
      description?: unknown;
      requirements?: unknown;
      adminName?: unknown;
      employeeName?: unknown;
      requestType?: unknown;
      [key: string]: unknown;
    }
    
    // Type guard helper functions
    const asString = (value: unknown): string => typeof value === 'string' ? value : '';
    const asNumber = (value: unknown): number => typeof value === 'number' ? value : 0;
    const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

    const templates: Record<string, (data: EmailData) => EmailTemplate> = {
      welcome: (data) => ({
        subject: `Welcome to Mizan, ${asString(data.name)}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome to Mizan!</h1>
            <p>Hi ${asString(data.name)},</p>
            <p>Welcome to Mizan! We're excited to help you transform your organization's culture and performance.</p>
            <p>Your account has been created and you can now access the platform.</p>
            <p>Best regards,<br>The Mizan Team</p>
          </div>
        `,
        text: `Welcome to Mizan, ${asString(data.name)}! Your account has been created.`
      }),

      passwordReset: (data) => ({
        subject: 'Reset Your Mizan Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Password Reset Request</h1>
            <p>Hi ${asString(data.name)},</p>
            <p>You requested a password reset for your Mizan account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${asString(data.resetLink)}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
        text: `Password reset requested. Click here: ${asString(data.resetLink)}`
      }),

      invitation: (data) => ({
        subject: `You're invited to join ${asString(data.companyName)} on Mizan`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>You're Invited!</h1>
            <p>Hi ${asString(data.name)},</p>
            <p>You've been invited to join ${asString(data.companyName)} on Mizan.</p>
            <p>Click the link below to accept your invitation:</p>
            <a href="${asString(data.invitationLink)}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
            <p>Best regards,<br>The Mizan Team</p>
          </div>
        `,
        text: `You're invited to join ${asString(data.companyName)} on Mizan. Accept here: ${asString(data.invitationLink)}`
      }),

      analysisComplete: (data) => ({
        subject: `Your ${asString(data.analysisType)} analysis is complete`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Analysis Complete!</h1>
            <p>Hi ${asString(data.name)},</p>
            <p>Your ${asString(data.analysisType)} analysis has been completed.</p>
            <p>Key findings:</p>
            <ul>
              ${asStringArray(data.findings).map((finding: string) => `<li>${finding}</li>`).join('')}
            </ul>
            <p>View the full report in your dashboard.</p>
            <a href="${asString(data.dashboardLink)}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Report</a>
          </div>
        `,
        text: `Your ${asString(data.analysisType)} analysis is complete. View report: ${asString(data.dashboardLink)}`
      }),

      consultationRequest: (data) => ({
        subject: 'New Consultation Request Received',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>New Consultation Request</h1>
            <p>A new consultation request has been received:</p>
            <ul>
              <li><strong>Name:</strong> ${asString(data.name)}</li>
              <li><strong>Company:</strong> ${asString(data.company)}</li>
              <li><strong>Email:</strong> ${asString(data.email)}</li>
              <li><strong>Type:</strong> ${asString(data.type)}</li>
              <li><strong>Message:</strong> ${asString(data.message)}</li>
            </ul>
            <p>Please respond within 24 hours.</p>
          </div>
        `,
        text: `New consultation request from ${asString(data.name)} (${asString(data.company)}): ${asString(data.message)}`
      }),

      hiringNotification: (data) => ({
        subject: `New hiring requisition: ${asString(data.title)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>New Hiring Requisition</h1>
            <p>A new hiring requisition has been created:</p>
            <ul>
              <li><strong>Title:</strong> ${asString(data.title)}</li>
              <li><strong>Department:</strong> ${asString(data.department)}</li>
              <li><strong>Description:</strong> ${asString(data.description)}</li>
              <li><strong>Requirements:</strong> ${asStringArray(data.requirements).join(', ')}</li>
            </ul>
            <p>Review and approve in your dashboard.</p>
          </div>
        `,
        text: `New hiring requisition: ${asString(data.title)} in ${asString(data.department)}`
      }),

      demoRequestConfirmation: (data) => ({
        subject: 'Thank you for your interest in Mizan!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Thank you for requesting a demo!</h1>
            <p>Hi ${asString(data.firstName)},</p>
            <p>We received your demo request for ${asString(data.company)}. Our team will review your information and reach out within 24 hours.</p>
            <p><strong>What happens next:</strong></p>
            <ul>
              <li>Our team will review your organizational needs</li>
              <li>We'll schedule a personalized demo session</li>
              <li>You'll see how Mizan can transform your culture and performance</li>
            </ul>
            <p>In the meantime, feel free to explore our resources at <a href="https://www.mizan.work">www.mizan.work</a></p>
            <p>Best regards,<br>The Mizan Team</p>
          </div>
        `,
        text: `Thank you for requesting a demo, ${asString(data.firstName)}! We'll contact you within 24 hours to schedule your personalized session.`
      }),

      demoRequestNotification: (data) => ({
        subject: `New Demo Request: ${asString(data.company)} (${asString(data.employeeCount) || 'N/A'} employees)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>🎯 New Demo Request</h1>
            <p>A new demo request has been submitted:</p>
            <ul>
              <li><strong>Name:</strong> ${asString(data.firstName)} ${asString(data.lastName)}</li>
              <li><strong>Email:</strong> ${asString(data.email)}</li>
              <li><strong>Company:</strong> ${asString(data.company)}</li>
              <li><strong>Phone:</strong> ${asString(data.phone) || 'Not provided'}</li>
              <li><strong>Employee Count:</strong> ${asString(data.employeeCount) || 'Not provided'}</li>
              <li><strong>Industry:</strong> ${asString(data.industry) || 'Not provided'}</li>
              <li><strong>Interested In:</strong> ${asString(data.interestedIn) || 'Not specified'}</li>
              <li><strong>Message:</strong> ${asString(data.message) || 'No message'}</li>
            </ul>
            <p><strong>Action Required:</strong> Contact within 24 hours</p>
            <a href="${process.env.FRONTEND_URL}/dashboard/superadmin/demo-requests" style="background-color: #CCA404; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View in Dashboard</a>
          </div>
        `,
        text: `New demo request from ${asString(data.firstName)} ${asString(data.lastName)} at ${asString(data.company)}. Email: ${asString(data.email)}`
      }),

      paymentSuccess: (data) => ({
        subject: `Payment Successful - Mizan ${asString(data.plan)} Plan`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>✅ Payment Successful!</h1>
            <p>Hi ${asString(data.customerName)},</p>
            <p>Your payment has been successfully processed.</p>
            <p><strong>Payment Details:</strong></p>
            <ul>
              <li><strong>Plan:</strong> Mizan ${asString(data.plan)} Plan</li>
              <li><strong>Amount:</strong> $${(asNumber(data.amount) / 100).toFixed(2)}</li>
              <li><strong>Billing Period:</strong> ${asString(data.billingPeriod)}</li>
              <li><strong>Employee Count:</strong> ${asString(data.employeeCount)}</li>
            </ul>
            <p>Your account is now active. Access your dashboard at <a href="${process.env.FRONTEND_URL}/dashboard">${process.env.FRONTEND_URL}/dashboard</a></p>
            <p>Best regards,<br>The Mizan Team</p>
          </div>
        `,
        text: `Payment successful! Your Mizan ${asString(data.plan)} plan is now active. Amount: $${(asNumber(data.amount) / 100).toFixed(2)}`
      }),

      paymentFailed: (data) => ({
        subject: 'Payment Failed - Action Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>⚠️ Payment Failed</h1>
            <p>Hi ${asString(data.customerName)},</p>
            <p>We were unable to process your recent payment.</p>
            <p><strong>Details:</strong></p>
            <ul>
              <li><strong>Amount:</strong> $${(asNumber(data.amount) / 100).toFixed(2)}</li>
              <li><strong>Reason:</strong> ${asString(data.reason) || 'Payment declined'}</li>
            </ul>
            <p><strong>What to do next:</strong></p>
            <ol>
              <li>Update your payment method in your account settings</li>
              <li>Ensure sufficient funds are available</li>
              <li>Contact your bank if the issue persists</li>
            </ol>
            <a href="${process.env.FRONTEND_URL}/dashboard/billing" style="background-color: #CCA404; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Update Payment Method</a>
            <p>If you need assistance, please contact our support team.</p>
          </div>
        `,
        text: `Payment failed for $${(asNumber(data.amount) / 100).toFixed(2)}. Please update your payment method.`
      }),

      employeeInvitation: (data) => ({
        subject: `${asString(data.adminName)} invited you to join ${asString(data.companyName)} on Mizan`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>You're Invited to Mizan!</h1>
            <p>Hi ${asString(data.employeeName)},</p>
            <p>${asString(data.adminName)} has invited you to join ${asString(data.companyName)} on the Mizan platform.</p>
            <p><strong>About Mizan:</strong></p>
            <p>Mizan is a comprehensive organizational culture and performance platform that helps you:</p>
            <ul>
              <li>Understand your values and how they align with the company</li>
              <li>Track your professional growth and development</li>
              <li>Receive personalized insights and recommendations</li>
              <li>Contribute to a healthier organizational culture</li>
            </ul>
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Click the button below to accept your invitation</li>
              <li>Complete your profile setup</li>
              <li>Take the culture assessment survey</li>
            </ol>
            <a href="${asString(data.invitationLink)}" style="background-color: #CCA404; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Accept Invitation</a>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">This invitation will expire in 7 days.</p>
          </div>
        `,
        text: `${asString(data.adminName)} invited you to join ${asString(data.companyName)} on Mizan. Accept invitation: ${asString(data.invitationLink)}`
      }),

      consultingRequestConfirmation: (data) => ({
        subject: 'Consulting Request Received - Mizan',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Thank you for your consulting request</h1>
            <p>Hi ${asString(data.name)},</p>
            <p>We received your request for ${asString(data.requestType)} consulting services.</p>
            <p>Our team of experts will review your request and reach out within 48 hours to discuss how we can help.</p>
            <p><strong>Your Request Details:</strong></p>
            <ul>
              <li><strong>Service Type:</strong> ${asString(data.requestType)}</li>
              <li><strong>Company:</strong> ${asString(data.company) || 'Not provided'}</li>
              <li><strong>Description:</strong> ${asString(data.description)}</li>
            </ul>
            <p>Best regards,<br>The Mizan Consulting Team</p>
          </div>
        `,
        text: `Thank you for your consulting request for ${asString(data.requestType)}. We'll contact you within 48 hours.`
      }),

      // Skills Analysis Email Templates
      skillsAnalysisComplete: (data) => ({
        subject: `Skills Analysis Complete - ${asString(data.companyName)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>🎯 Skills Analysis Complete!</h1>
            <p>Hi ${asString(data.name)},</p>
            <p>Your organization's skills analysis has been completed.</p>
            <p><strong>Key Metrics:</strong></p>
            <ul>
              <li><strong>Overall Score:</strong> ${asNumber(data.score)}/100</li>
              <li><strong>Strategic Alignment:</strong> ${asNumber(data.strategicAlignment)}%</li>
              <li><strong>Skills Coverage:</strong> ${asNumber(data.skillsCoverage)}%</li>
              <li><strong>Critical Gaps:</strong> ${asNumber(data.criticalGapsCount)}</li>
            </ul>
            <p><strong>Top Insights:</strong></p>
            <ul>
              ${asStringArray(data.insights).map((insight: string) => `<li>${insight}</li>`).join('')}
            </ul>
            <a href="${asString(data.dashboardLink)}" style="background-color: #CCA404; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Full Report</a>
            <p style="margin-top: 20px;">Best regards,<br>The Mizan Team</p>
          </div>
        `,
        text: `Skills analysis complete for ${asString(data.companyName)}. Score: ${asNumber(data.score)}/100. View report: ${asString(data.dashboardLink)}`
      }),

      skillsGapDetected: (data) => ({
        subject: `⚠️ Critical Skills Gap Detected - ${asString(data.skillName)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>⚠️ Critical Skills Gap Alert</h1>
            <p>Hi ${asString(data.name)},</p>
            <p>We've detected a critical skills gap in your organization:</p>
            <p><strong>Gap Details:</strong></p>
            <ul>
              <li><strong>Skill:</strong> ${asString(data.skillName)}</li>
              <li><strong>Category:</strong> ${asString(data.category)}</li>
              <li><strong>Current Level:</strong> ${asString(data.currentLevel)}</li>
              <li><strong>Required Level:</strong> ${asString(data.requiredLevel)}</li>
              <li><strong>Priority:</strong> ${asString(data.priority)}</li>
              <li><strong>Employees Affected:</strong> ${asNumber(data.employeesAffected)}</li>
            </ul>
            <p><strong>Business Impact:</strong></p>
            <p>${asString(data.businessImpact)}</p>
            <p><strong>Recommended Actions:</strong></p>
            <ul>
              ${asStringArray(data.recommendations).map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
            <a href="${asString(data.actionUrl)}" style="background-color: #CCA404; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Take Action</a>
          </div>
        `,
        text: `Critical skills gap detected: ${asString(data.skillName)}. ${asNumber(data.employeesAffected)} employees affected. Take action: ${asString(data.actionUrl)}`
      }),

      skillsFrameworkCreated: (data) => ({
        subject: `Strategic Skills Framework Created - ${asString(data.companyName)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>📊 Skills Framework Created!</h1>
            <p>Hi ${asString(data.name)},</p>
            <p>Your organization's strategic skills framework has been created and is ready for review.</p>
            <p><strong>Framework Highlights:</strong></p>
            <ul>
              <li><strong>Strategic Skills:</strong> ${asNumber(data.strategicSkillsCount)} identified</li>
              <li><strong>Industry Benchmarks:</strong> Aligned with ${asString(data.industry)} standards</li>
              <li><strong>Critical Skills:</strong> ${asNumber(data.criticalSkillsCount)} mapped to business goals</li>
            </ul>
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Review the framework in your dashboard</li>
              <li>Customize skills categories as needed</li>
              <li>Begin employee skills assessments</li>
              <li>Track progress against benchmarks</li>
            </ol>
            <a href="${asString(data.dashboardLink)}" style="background-color: #CCA404; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Review Framework</a>
          </div>
        `,
        text: `Strategic skills framework created for ${asString(data.companyName)}. ${asNumber(data.strategicSkillsCount)} strategic skills identified. Review: ${asString(data.dashboardLink)}`
      }),

      skillsAssessmentReminder: (data) => ({
        subject: 'Please Update Your Skills Profile - Mizan',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>📝 Skills Assessment Reminder</h1>
            <p>Hi ${asString(data.employeeName)},</p>
            <p>It's time to update your skills profile on Mizan!</p>
            <p>Keeping your skills up-to-date helps us:</p>
            <ul>
              <li>Provide personalized learning recommendations</li>
              <li>Match you with relevant projects and opportunities</li>
              <li>Support your career development goals</li>
              <li>Build a stronger, more capable team</li>
            </ul>
            <p><strong>What to do:</strong></p>
            <ol>
              <li>Review your current skills list</li>
              <li>Add any new skills you've acquired</li>
              <li>Update proficiency levels where applicable</li>
              <li>Save your updated profile</li>
            </ol>
            <p>This will only take 5-10 minutes.</p>
            <a href="${asString(data.assessmentLink)}" style="background-color: #CCA404; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Update Skills Profile</a>
          </div>
        `,
        text: `Time to update your skills profile on Mizan! Update here: ${asString(data.assessmentLink)}`
      }),

      skillsLearningRecommendation: (data) => ({
        subject: `🎓 Personalized Learning Recommendations - ${asString(data.skillName)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>🎓 New Learning Recommendations</h1>
            <p>Hi ${asString(data.employeeName)},</p>
            <p>Based on your skills profile and career goals, we've identified learning opportunities for you:</p>
            <p><strong>Focus Area:</strong> ${asString(data.skillName)}</p>
            <p><strong>Why this matters:</strong></p>
            <p>${asString(data.rationale)}</p>
            <p><strong>Recommended Learning Paths:</strong></p>
            <ul>
              ${asStringArray(data.learningPaths).map((path: string) => `<li>${path}</li>`).join('')}
            </ul>
            <p><strong>Expected Benefits:</strong></p>
            <ul>
              ${asStringArray(data.benefits).map((benefit: string) => `<li>${benefit}</li>`).join('')}
            </ul>
            <a href="${asString(data.lxpLink)}" style="background-color: #CCA404; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Explore Learning Paths</a>
          </div>
        `,
        text: `New learning recommendation for ${asString(data.skillName)}. Explore learning paths: ${asString(data.lxpLink)}`
      })
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    return template(data);
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export convenience functions
export async function sendEmail(emailData: EmailData): Promise<void> {
  return emailService.sendEmail(emailData);
}

export async function sendBulkEmails(emails: EmailData[]): Promise<void> {
  return emailService.sendBulkEmails(emails);
}