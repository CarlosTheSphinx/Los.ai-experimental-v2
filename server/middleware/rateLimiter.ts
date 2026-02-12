import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

function getClientKey(req: Request): string {
  // Use X-Forwarded-For if behind proxy, otherwise use IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
  return ip;
}

/**
 * In-memory rate limiter middleware.
 * For production at scale, replace with Redis-backed solution.
 */
export function rateLimit(options: {
  name: string;
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window per IP
  message?: string;
}) {
  const { name, windowMs, maxRequests, message } = options;
  const store = getStore(name);

  // Cleanup expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientKey(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: message || 'Too many requests. Please try again later.',
        retryAfterSeconds,
      });
    }

    next();
  };
}

// Pre-configured limiters
export const authLimiter = rateLimit({
  name: 'auth',
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 10,             // 10 login attempts per 15 min
  message: 'Too many login attempts. Please wait 15 minutes.',
});

export const apiLimiter = rateLimit({
  name: 'api',
  windowMs: 60 * 1000,        // 1 minute
  maxRequests: 100,            // 100 requests per minute
  message: 'Too many requests. Please slow down.',
});

export const pricingLimiter = rateLimit({
  name: 'pricing',
  windowMs: 60 * 1000,        // 1 minute
  maxRequests: 20,             // 20 pricing requests per minute
  message: 'Too many pricing requests. Please wait.',
});

export const uploadLimiter = rateLimit({
  name: 'upload',
  windowMs: 60 * 1000,        // 1 minute
  maxRequests: 30,             // 30 uploads per minute
  message: 'Too many uploads. Please wait.',
});
