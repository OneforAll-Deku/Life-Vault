import emailService from './emailService.js';
import User from '../models/User.js';

/* ──────────────────────────────────────────────────────────────
   WILL NOTIFICATION SERVICE
   Handles staged warning emails and execution notifications
   for the Dead Man's Switch system.
   ────────────────────────────────────────────────────────────── */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

class WillNotificationService {

  /**
   * Send a warning email to the will owner.
   * @param {Object} will   – The DigitalWill document
   * @param {Object} user   – The will owner (User document)
   * @param {'REMINDER'|'URGENT'|'FINAL'} level – Warning stage
   */
  async sendWarningEmail(will, user, level) {
    const transporter = emailService.getTransporter();
    if (!transporter) {
      console.warn('⚠️  Warning email skipped (SMTP not configured)');
      return { success: false, skipped: true };
    }

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const to = user.email;
    const checkinUrl = `${FRONTEND_URL}/digital-will`;
    const { subject, html } = this._buildWarningTemplate(will, user, level, checkinUrl);

    try {
      await transporter.sendMail({ from, to, subject, html });
      console.log(`📧 Dead Man's Switch — ${level} warning sent to ${to} for will "${will.title}"`);
      return { success: true, level };
    } catch (error) {
      console.error(`❌ Failed to send ${level} warning to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send execution notification to all beneficiaries.
   * @param {Object} will – The executed DigitalWill document
   */
  async sendExecutionEmails(will) {
    const transporter = emailService.getTransporter();
    if (!transporter) {
      console.warn('⚠️  Execution emails skipped (SMTP not configured)');
      return { success: false, skipped: true };
    }

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const owner = await User.findById(will.userId);
    const ownerName = owner?.name || 'A LifeVault user';
    const results = [];

    for (const beneficiary of will.beneficiaries) {
      const { subject, html } = this._buildExecutionTemplate(will, ownerName, beneficiary);

      try {
        await transporter.sendMail({
          from,
          to: beneficiary.email,
          subject,
          html,
        });
        console.log(`📧 Execution notice sent to ${beneficiary.name} (${beneficiary.email})`);
        results.push({ email: beneficiary.email, success: true });
      } catch (error) {
        console.error(`❌ Failed to notify ${beneficiary.email}:`, error.message);
        results.push({ email: beneficiary.email, success: false, error: error.message });
      }
    }

    return { success: true, results };
  }

  /* ──────────────────────────────────────────────────────────
     PRIVATE — Email Template Builders
     ────────────────────────────────────────────────────────── */

  _buildWarningTemplate(will, user, level, checkinUrl) {
    const userName = user.name || 'there';
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(will.deadManSwitch.nextDeadline) - Date.now()) / (1000 * 60 * 60 * 24))
    );

    const configs = {
      REMINDER: {
        emoji: '🔔',
        subject: `LifeVault Check-In Reminder — ${daysLeft} days remaining`,
        urgency: '',
        color: '#6366f1',
        borderColor: '#e0e7ff',
        bgColor: '#eef2ff',
        message: `You haven't checked in to LifeVault for a while. Your Digital Will <strong>"${will.title}"</strong> will be automatically executed in <strong>${daysLeft} days</strong> if you don't check in.`,
      },
      URGENT: {
        emoji: '⚠️',
        subject: `⚠️ Urgent: Your Digital Will activates in ${daysLeft} days`,
        urgency: 'URGENT — ',
        color: '#f59e0b',
        borderColor: '#fef3c7',
        bgColor: '#fffbeb',
        message: `This is your <strong>second warning</strong>. Your Digital Will <strong>"${will.title}"</strong> will be executed in <strong>${daysLeft} days</strong>. All assigned memories will be released to your ${will.beneficiaries.length} beneficiaries.`,
      },
      FINAL: {
        emoji: '🚨',
        subject: `🚨 FINAL WARNING — Your Digital Will activates in ${daysLeft} days`,
        urgency: 'FINAL WARNING — ',
        color: '#ef4444',
        borderColor: '#fee2e2',
        bgColor: '#fef2f2',
        message: `This is your <strong>FINAL warning</strong>. Your Digital Will <strong>"${will.title}"</strong> will be executed in <strong>${daysLeft} days</strong>. After execution, your memories will be permanently released to your beneficiaries. <strong>This cannot be undone.</strong>`,
      },
    };

    const c = configs[level] || configs.REMINDER;

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.6;">
        
        <div style="background: ${c.color}; padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="margin: 0; color: #fff; font-size: 22px;">
            ${c.emoji} ${c.urgency}LifeVault Check-In Required
          </h1>
        </div>

        <div style="padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; background: #fff;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
            Hi ${userName},
          </p>

          <div style="padding: 16px; border-radius: 12px; background: ${c.bgColor}; border: 1px solid ${c.borderColor}; margin: 0 0 20px;">
            <p style="margin: 0; font-size: 14px; color: #374151;">${c.message}</p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${checkinUrl}" 
               style="display: inline-block; padding: 14px 36px; background: ${c.color}; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
              ✅ Check In Now
            </a>
          </div>

          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
            If everything is fine, simply click the button above to reset your timer.
            No further action is needed.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            — LifeVault • Your life, secured on the chain.
          </p>
        </div>
      </div>
    `;

    return { subject: c.subject, html };
  }

  _buildExecutionTemplate(will, ownerName, beneficiary) {
    const subject = `LifeVault — You have received digital memories from ${ownerName}`;

    const memoriesCount = (beneficiary.assignedMemories?.length || 0);
    const categoriesText = beneficiary.assignedCategories?.length
      ? beneficiary.assignedCategories.join(', ')
      : 'all assigned';

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.6;">
        
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 28px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="margin: 0; color: #fff; font-size: 22px;">
            💜 A Digital Legacy For You
          </h1>
        </div>

        <div style="padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; background: #fff;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
            Dear ${beneficiary.name},
          </p>

          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
            <strong>${ownerName}</strong> designated you as a beneficiary of their
            Digital Will titled <strong>"${will.title}"</strong>.
            Their legacy has now been released to you.
          </p>

          ${beneficiary.personalMessage ? `
          <div style="padding: 16px; border-radius: 12px; background: #f0f0ff; border-left: 4px solid #6366f1; margin: 0 0 20px;">
            <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">
              "${beneficiary.personalMessage}"
            </p>
            <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">— ${ownerName}</p>
          </div>
          ` : ''}

          <div style="padding: 16px; border-radius: 12px; background: #f9fafb; border: 1px solid #e5e7eb; margin: 0 0 20px;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">
              <strong>What you received:</strong>
            </p>
            <ul style="margin: 0; padding-left: 18px; font-size: 14px; color: #4b5563;">
              <li>${memoriesCount} memory item${memoriesCount !== 1 ? 's' : ''}</li>
              <li>Categories: ${categoriesText}</li>
              <li>Relationship: ${beneficiary.relationship || 'Not specified'}</li>
            </ul>
          </div>

          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
            This will was securely recorded on the blockchain and cannot be tampered with.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            — LifeVault • Your life, secured on the chain.
          </p>
        </div>
      </div>
    `;

    return { subject, html };
  }

  /**
   * Send an invitation email to a new beneficiary.
   * @param {Object} will          – The DigitalWill document
   * @param {Object} beneficiary   – The beneficiary object (from will.beneficiaries)
   * @param {string} ownerName     – The name of the will owner
   */
  async sendInvitationEmail(will, beneficiary, ownerName) {
    const transporter = emailService.getTransporter();
    if (!transporter || !beneficiary.email) {
      console.warn('⚠️  Invitation email skipped (SMTP not configured or no email)');
      return { success: false, skipped: true };
    }

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const confirmUrl = `${FRONTEND_URL}/confirm-beneficiary?token=${beneficiary.confirmationToken}`;
    const { subject, html } = this._buildInvitationTemplate(will, ownerName, beneficiary, confirmUrl);

    try {
      await transporter.sendMail({ from, to: beneficiary.email, subject, html });
      console.log(`📧 Invitation sent to beneficiary ${beneficiary.name} (${beneficiary.email})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send invitation to ${beneficiary.email}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  _buildInvitationTemplate(will, ownerName, beneficiary, confirmUrl) {
    const subject = `LifeVault — ${ownerName} added you as a beneficiary`;

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.6;">
        <div style="background: #6366f1; padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="margin: 0; color: #fff; font-size: 20px;">💜 LifeVault Invitation</h1>
        </div>
        <div style="padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; background: #fff;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">Hi ${beneficiary.name},</p>
          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
            <strong>${ownerName}</strong> has added you as a beneficiary in their Digital Will <strong>"${will.title}"</strong>.
            This means you will receive their digital legacy (memories, records, and messages) if their account ever activates the legacy protocol.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${confirmUrl}" style="display: inline-block; padding: 14px 30px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
              Accept Invitation
            </a>
          </div>
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">If you didn't expect this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">— LifeVault Team</p>
        </div>
      </div>
    `;
    return { subject, html };
  }
}

export default new WillNotificationService();
