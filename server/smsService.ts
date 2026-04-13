// Twilio SMS Service for Loan Digest Notifications
// Uses environment variables for credential management

import twilio from 'twilio';

export async function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables must be set');
  }
  return twilio(accountSid, authToken);
}

export async function getTwilioFromPhoneNumber() {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER environment variable is not set');
  }
  return phoneNumber;
}

// Send an SMS message
export async function sendSms(
  toPhoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    if (!fromNumber) {
      return { success: false, error: 'Twilio phone number not configured' };
    }

    // Normalize phone number format
    let normalizedTo = toPhoneNumber.replace(/\D/g, '');
    if (!normalizedTo.startsWith('1') && normalizedTo.length === 10) {
      normalizedTo = '1' + normalizedTo;
    }
    if (!normalizedTo.startsWith('+')) {
      normalizedTo = '+' + normalizedTo;
    }

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: normalizedTo,
    });

    console.log(`SMS sent to ${normalizedTo}: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    return { success: false, error: error.message };
  }
}

// Send a digest SMS notification
export async function sendDigestSms(
  toPhoneNumber: string,
  projectName: string,
  outstandingDocsCount: number,
  updatesCount: number,
  portalLink: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let message = `Lendry.AI - ${projectName}\n\n`;
  
  if (outstandingDocsCount > 0) {
    message += `${outstandingDocsCount} document(s) still needed.\n`;
  }
  
  if (updatesCount > 0) {
    message += `${updatesCount} new update(s) on your loan.\n`;
  }
  
  message += `\nView details: ${portalLink}`;
  
  // SMS has 160 character limit for single message, 1600 for multi-part
  // Keep it concise but informative
  if (message.length > 160) {
    message = `Lendry.AI: ${projectName} - ${outstandingDocsCount} docs needed. View: ${portalLink}`;
  }
  
  return sendSms(toPhoneNumber, message);
}

// Send a custom SMS with any message content
export async function sendCustomSms(
  toPhoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Truncate if message is too long (keep under 160 for single segment)
  const truncatedMessage = message.length > 160 
    ? message.substring(0, 157) + '...'
    : message;
  
  return sendSms(toPhoneNumber, truncatedMessage);
}
