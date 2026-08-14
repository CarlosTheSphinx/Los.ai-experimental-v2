import type { Express, Request, Response } from 'express';
import { escapeHtml } from '../digestService';
import { getResendClient } from '../email';

const INTEREST_LABELS: Record<string, string> = {
  starter: 'Starter Plan',
  professional: 'Professional Plan',
  enterprise: 'Enterprise Plan',
  'just-browsing': 'Just Browsing',
};

export function registerContactRoutes(app: Express) {
  app.post('/api/public/contact', async (req: Request, res: Response) => {
    try {
      const { name, email, company, phone, interest, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields: name, email, message' });
      }

      const notifyEmail = process.env.CONTACT_NOTIFICATION_EMAIL || 'hello@lendry.ai';

      try {
        const { client, fromEmail } = await getResendClient();
        const safeName = escapeHtml(String(name));
        const safeEmail = escapeHtml(String(email));
        const safeCompany = company ? escapeHtml(String(company)) : null;
        const safePhone = phone ? escapeHtml(String(phone)) : null;
        const safeInterest = interest ? escapeHtml(String(INTEREST_LABELS[interest] || interest)) : null;
        const safeMessage = escapeHtml(String(message));
        await client.emails.send({
          from: fromEmail,
          to: notifyEmail,
          subject: `New Contact Form Submission — ${safeName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #0F1729; font-size: 20px; margin-bottom: 16px;">New Contact Form Submission</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #64748b; width: 120px;">Name</td><td style="padding: 8px 0; color: #0F1729;">${safeName}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0; color: #0F1729;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
                ${safeCompany ? `<tr><td style="padding: 8px 0; color: #64748b;">Company</td><td style="padding: 8px 0; color: #0F1729;">${safeCompany}</td></tr>` : ''}
                ${safePhone ? `<tr><td style="padding: 8px 0; color: #64748b;">Phone</td><td style="padding: 8px 0; color: #0F1729;">${safePhone}</td></tr>` : ''}
                ${safeInterest ? `<tr><td style="padding: 8px 0; color: #64748b;">Interest</td><td style="padding: 8px 0; color: #0F1729;">${safeInterest}</td></tr>` : ''}
              </table>
              <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">Message:</p>
                <p style="color: #0F1729; font-size: 14px; white-space: pre-wrap; margin: 0;">${safeMessage}</p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Contact form email send failed:', emailErr);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({ error: 'Failed to submit contact form' });
    }
  });
}
