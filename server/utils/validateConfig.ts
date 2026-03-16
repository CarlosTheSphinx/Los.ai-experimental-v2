/**
 * Validates all required and recommended environment variables at startup.
 * Call this early in the boot process to fail fast on missing configuration.
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVarConfig[] = [
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  { name: 'JWT_SECRET', required: false, description: 'JWT signing key (or use SESSION_SECRET)' },
  { name: 'SESSION_SECRET', required: false, description: 'Session/JWT signing key (or use JWT_SECRET)' },
  { name: 'PANDADOC_WEBHOOK_SECRET', required: false, description: 'PandaDoc webhook signature verification' },
  { name: 'CRON_SECRET_KEY', required: false, description: 'API key for cron digest endpoint' },
  { name: 'TOKEN_ENCRYPTION_KEY', required: false, description: 'AES-256-GCM key for OAuth token encryption (64 hex chars)' },
  { name: 'PII_ENCRYPTION_KEY', required: false, description: 'AES-256-GCM key for PII field encryption (64 hex chars)' },
  { name: 'AI_INTEGRATIONS_OPENAI_API_KEY', required: false, description: 'OpenAI API key for document review' },
  { name: 'RESEND_API_KEY', required: false, description: 'Resend email service API key' },
  { name: 'TWILIO_ACCOUNT_SID', required: false, description: 'Twilio SMS account SID' },
  { name: 'TWILIO_AUTH_TOKEN', required: false, description: 'Twilio SMS auth token' },
  { name: 'GOOGLE_CLIENT_ID', required: false, description: 'Google OAuth client ID' },
  { name: 'GOOGLE_CLIENT_SECRET', required: false, description: 'Google OAuth client secret' },
];

export function validateConfig(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // JWT_SECRET or SESSION_SECRET must be set (validated separately in auth.ts, but warn here too)
  if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
    missing.push('JWT_SECRET or SESSION_SECRET — server cannot start without a signing key');
  }

  for (const envVar of ENV_VARS) {
    if (envVar.required && !process.env[envVar.name]) {
      missing.push(`${envVar.name} — ${envVar.description}`);
    } else if (!envVar.required && !process.env[envVar.name]) {
      // Only warn for key integrations, not all optional vars
      if (['TOKEN_ENCRYPTION_KEY', 'PII_ENCRYPTION_KEY', 'AI_INTEGRATIONS_OPENAI_API_KEY'].includes(envVar.name)) {
        warnings.push(`${envVar.name} — ${envVar.description}`);
      }
    }
  }

  // Validate TOKEN_ENCRYPTION_KEY format if set
  if (process.env.TOKEN_ENCRYPTION_KEY) {
    if (!/^[0-9a-fA-F]{64}$/.test(process.env.TOKEN_ENCRYPTION_KEY)) {
      missing.push('TOKEN_ENCRYPTION_KEY — must be exactly 64 hex characters (32 bytes)');
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Missing recommended environment variables:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(m => console.error(`   - ${m}`));
    throw new Error(`Cannot start: ${missing.length} required environment variable(s) missing. See above.`);
  }
}
