
import { z } from 'zod';
import { loanPricingFormSchema, pricingResponseSchema } from './schema';

export const api = {
  pricing: {
    submit: {
      method: 'POST' as const,
      path: '/api/get-pricing',
      input: loanPricingFormSchema,
      responses: {
        200: pricingResponseSchema,
        400: z.object({ error: z.string(), message: z.string() }),
        500: z.object({ error: z.string(), message: z.string() })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
