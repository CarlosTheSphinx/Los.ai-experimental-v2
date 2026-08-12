/**
 * Broker Notification Service (Phase 4)
 * Sends status-change emails to brokers via Resend when email-intake deals progress.
 */

import { getResendClient } from '../email';
import { db } from '../db';
import { commercialSubmissions, commercialSubmissionDocuments } from '@shared/schema';
import { eq } from 'drizzle-orm';

type BrokerNotificationType =
  | 'document_uploaded'
  | 'all_docs_received'
  | 'deal_approved'
  | 'deal_declined';

function emailWrapper(headerColor: string, headerText: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${headerText}</h1></div>
    <div class="content">${bodyHtml}</div>
    <div class="footer"><p><em>Sphinx Capital AI Assistant — automated notification</em></p></div>
  </div>
</body>
</html>`;
}

export async function sendBrokerNotification(
  type: BrokerNotificationType,
  submissionId: number,
  extra?: Record<string, any>,
): Promise<void> {
  try {
    const [submission] = await db.select().from(commercialSubmissions)
      .where(eq(commercialSubmissions.id, submissionId));

    if (!submission || !submission.email) {
      console.warn(`[BrokerNotification] No submission or broker email for id ${submissionId}`);
      return;
    }

    const brokerEmail = submission.email;
    const brokerName = submission.brokerOrDeveloperName || 'Broker';
    const propertyName = submission.propertyName || submission.propertyAddress || 'your submission';

    let subject = '';
    let html = '';

    switch (type) {
      case 'document_uploaded': {
        const docName = extra?.documentName || 'a document';
        subject = `Document Received: ${propertyName}`;
        html = emailWrapper(
          '#3b82f6',
          'Document Received',
          `<p>Dear ${brokerName},</p>
<p>We have received <strong>${docName}</strong> for your deal submission: <em>${propertyName}</em>.</p>
<p>Our team will review the submitted materials shortly. You will be notified when all required documents have been received or if additional information is needed.</p>
<p>Thank you for your prompt submission.</p>
<p>Best regards,<br/><strong>Sphinx Capital AI Assistant</strong></p>`,
        );
        break;
      }

      case 'all_docs_received': {
        subject = `All Documents Received — Submission Under Review: ${propertyName}`;
        html = emailWrapper(
          '#10b981',
          'Submission Complete',
          `<p>Dear ${brokerName},</p>
<p>We have received all required documents for your deal submission: <em>${propertyName}</em>.</p>
<p>Your submission is now under review by our underwriting team. We will be in touch with a decision or any follow-up questions within our standard review timeframe.</p>
<p>Thank you for your submission to Sphinx Capital.</p>
<p>Best regards,<br/><strong>Sphinx Capital AI Assistant</strong></p>`,
        );
        break;
      }

      case 'deal_approved': {
        subject = `Deal Approved — Next Steps: ${propertyName}`;
        html = emailWrapper(
          '#10b981',
          'Deal Approved',
          `<p>Dear ${brokerName},</p>
<p>Congratulations! We are pleased to inform you that your deal submission for <em>${propertyName}</em> has been <strong>approved</strong>.</p>
${extra?.message ? `<p>${extra.message}</p>` : ''}
<p>A member of our team will be reaching out shortly to discuss the next steps and closing timeline.</p>
<p>Thank you for choosing Sphinx Capital.</p>
<p>Best regards,<br/><strong>Sphinx Capital</strong></p>`,
        );
        break;
      }

      case 'deal_declined': {
        const reason = extra?.reason || 'the deal did not meet our current program criteria';
        subject = `Update on Your Submission: ${propertyName}`;
        html = emailWrapper(
          '#6b7280',
          'Submission Update',
          `<p>Dear ${brokerName},</p>
<p>Thank you for submitting your deal <em>${propertyName}</em> to Sphinx Capital. After careful review, we are unable to move forward with this submission at this time because ${reason}.</p>
<p>We appreciate the opportunity to review this deal and encourage you to reach out with future opportunities that may be a better fit.</p>
<p>Best regards,<br/><strong>Sphinx Capital</strong></p>`,
        );
        break;
      }

      default:
        console.warn(`[BrokerNotification] Unknown type: ${type}`);
        return;
    }

    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: brokerEmail,
      subject,
      html,
    });

    console.log(`[BrokerNotification] Sent "${type}" to ${brokerEmail} for submission ${submissionId}`);
  } catch (err: any) {
    console.error(`[BrokerNotification] Error sending ${type} for submission ${submissionId}:`, err.message);
  }
}
