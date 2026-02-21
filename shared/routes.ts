
import { z } from 'zod';
import { loanPricingFormSchema, pricingResponseSchema, insertSavedQuoteSchema } from './schema';

export const savedQuoteInputSchema = z.object({
  customerFirstName: z.string().min(1, "First name is required"),
  customerLastName: z.string().min(1, "Last name is required"),
  customerCompanyName: z.string().optional(),
  propertyAddress: z.string().min(1, "Property address is required"),
  loanData: z.record(z.any()),
  interestRate: z.string(),
  pointsCharged: z.number().min(0).max(10),
  programId: z.number().nullable().optional(),
  // YSP fields
  yspAmount: z.number().min(0).max(5).optional().default(0),
  yspRateImpact: z.number().optional().default(0),
  yspDollarAmount: z.number().optional().default(0),
  // Split points tracking
  basePointsCharged: z.number().min(0).max(10).optional().default(0),
  brokerPointsCharged: z.number().min(0).max(10).optional().default(0),
});

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
  },
  quotes: {
    save: {
      method: 'POST' as const,
      path: '/api/quotes',
      input: savedQuoteInputSchema
    },
    list: {
      method: 'GET' as const,
      path: '/api/quotes'
    },
    get: {
      method: 'GET' as const,
      path: '/api/quotes/:id'
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/quotes/:id'
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
