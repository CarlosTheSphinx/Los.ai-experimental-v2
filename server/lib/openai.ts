/**
 * Centralized OpenAI client factory.
 *
 * Railway has two sets of env vars:
 *   AI_INTEGRATIONS_OPENAI_API_KEY / AI_INTEGRATIONS_OPENAI_BASE_URL
 *     → set to a local model-farm proxy (_DUMMY_API_KEY_ + http://localhost:…)
 *       which doesn't exist in production and causes ECONNREFUSED.
 *   OPENAI_API_KEY
 *     → the real OpenAI key that works everywhere.
 *
 * This module selects the right key/baseURL so all callers automatically
 * get a working client without any per-file logic.
 */

import OpenAI from "openai";

function isLocalhostUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /localhost|127\.0\.0\.1/.test(url);
}

function isDummyKey(key: string | undefined): boolean {
  return !key || key === "_DUMMY_API_KEY_" || key.trim() === "";
}

const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const integrationBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const useIntegration =
  !isDummyKey(integrationKey) && !isLocalhostUrl(integrationBaseUrl);

export const OPENAI_API_KEY: string | undefined = useIntegration
  ? integrationKey
  : process.env.OPENAI_API_KEY;

export const OPENAI_BASE_URL: string | undefined = useIntegration
  ? integrationBaseUrl
  : undefined;

if (!OPENAI_API_KEY) {
  console.warn(
    "⚠️  No usable OpenAI API key found. Set OPENAI_API_KEY. AI features will be disabled."
  );
} else if (!useIntegration && integrationBaseUrl) {
  console.log(
    "ℹ️  AI_INTEGRATIONS_OPENAI_BASE_URL points to localhost — using standard OpenAI endpoint with OPENAI_API_KEY instead."
  );
}

/**
 * Returns a configured OpenAI client, or null if no API key is available.
 * Pass `overrideKey` for places that allow a user-supplied key (e.g. AI assistant settings).
 */
export function getOpenAIClient(overrideKey?: string): OpenAI | null {
  const key = overrideKey || OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: OPENAI_BASE_URL });
}

/**
 * Singleton client for most uses. null if no API key is configured.
 */
export const openai: OpenAI | null = getOpenAIClient();
