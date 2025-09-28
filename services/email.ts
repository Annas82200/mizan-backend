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
  data: Record<string, any>;
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
      console.log(`Email sent successfully to ${emailData.to}`);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendBulkEmails(emails: EmailData[]): Promise<void> {
    const promises = emails.map(email => this.sendEmail(email));
    await Promise.allSettled(promises);
  }

  private getTemplate(templateName: string, data: Record<string, any>): EmailTemplate {
    const templates: Record<string, (data: any) => EmailTemplate> = {
      welcome: (data) => ({
        subject: `Welcome to Mizan, ${data.name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome to Mizan!</h1>
            <p>Hi ${data.name},</p>
            <p>Welcome to Mizan! We're excited to help you transform your organization's culture and performance.</p>
            <p>Your account has been created and you can now access the platform.</p>
            <p>Best regards,<br>The Mizan Team</p>
          </div>
        `,
        text: `Welcome to Mizan, ${data.name}! Your account has been created.`
      }),

      passwordReset: (data) => ({
        subject: 'Reset Your Mizan Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Password Reset Request</h1>
            <p>Hi ${data.name},</p>
            <p>You requested a password reset for your Mizan account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${data.resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
        text: `Password reset requested. Click here: ${data.resetLink}`
      }),

      invitation: (data) => ({
        subject: `You're invited to join ${data.companyName} on Mizan`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>You're Invited!</h1>
            <p>Hi ${data.name},</p>
            <p>You've been invited to join ${data.companyName} on Mizan.</p>
            <p>Click the link below to accept your invitation:</p>
            <a href="${data.invitationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
            <p>Best regards,<br>The Mizan Team</p>
          </div>
        `,
        text: `You're invited to join ${data.companyName} on Mizan. Accept here: ${data.invitationLink}`
      }),

      analysisComplete: (data) => ({
        subject: `Your ${data.analysisType} analysis is complete`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Analysis Complete!</h1>
            <p>Hi ${data.name},</p>
            <p>Your ${data.analysisType} analysis has been completed.</p>
            <p>Key findings:</p>
            <ul>
              ${data.findings.map((finding: string) => `<li>${finding}</li>`).join('')}
            </ul>
            <p>View the full report in your dashboard.</p>
            <a href="${data.dashboardLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Report</a>
          </div>
        `,
        text: `Your ${data.analysisType} analysis is complete. View report: ${data.dashboardLink}`
      }),

      consultationRequest: (data) => ({
        subject: 'New Consultation Request Received',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>New Consultation Request</h1>
            <p>A new consultation request has been received:</p>
            <ul>
              <li><strong>Name:</strong> ${data.name}</li>
              <li><strong>Company:</strong> ${data.company}</li>
              <li><strong>Email:</strong> ${data.email}</li>
              <li><strong>Type:</strong> ${data.type}</li>
              <li><strong>Message:</strong> ${data.message}</li>
            </ul>
            <p>Please respond within 24 hours.</p>
          </div>
        `,
        text: `New consultation request from ${data.name} (${data.company}): ${data.message}`
      }),

      hiringNotification: (data) => ({
        subject: `New hiring requisition: ${data.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>New Hiring Requisition</h1>
            <p>A new hiring requisition has been created:</p>
            <ul>
              <li><strong>Title:</strong> ${data.title}</li>
              <li><strong>Department:</strong> ${data.department}</li>
              <li><strong>Description:</strong> ${data.description}</li>
              <li><strong>Requirements:</strong> ${data.requirements.join(', ')}</li>
            </ul>
            <p>Review and approve in your dashboard.</p>
          </div>
        `,
        text: `New hiring requisition: ${data.title} in ${data.department}`
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