import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { getClientIp } from './client-ip.util';

type Bucket = {
  count: number;
  resetAt: number;
  strikes: number;
  blockedUntil?: number;
};

type RateLimitRule = {
  name: string;
  matcher: (request: Request) => boolean;
  max: number;
  windowMs: number;
};

type RateLimitOptions = {
  enabled: boolean;
  blockDurationMs: number;
  maxStrikes: number;
  rules: RateLimitRule[];
};

const buckets = new Map<string, Bucket>();

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function matchesPath(request: Request, pathPart: string): boolean {
  return request.originalUrl.includes(pathPart);
}

function selectRule(request: Request, rules: RateLimitRule[]): RateLimitRule {
  return rules.find((rule) => rule.matcher(request)) ?? rules[rules.length - 1];
}

function cleanupExpiredBuckets(now: number): void {
  if (buckets.size < 5000) return;

  for (const [key, bucket] of buckets.entries()) {
    const isWindowExpired = bucket.resetAt < now;
    const isBlockExpired = !bucket.blockedUntil || bucket.blockedUntil < now;

    if (isWindowExpired && isBlockExpired) {
      buckets.delete(key);
    }
  }
}

function buildRetryAfterSeconds(until: number, now: number): number {
  return Math.max(1, Math.ceil((until - now) / 1000));
}

export function buildRateLimitOptionsFromEnv(): RateLimitOptions {
  const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  const generalMax = parsePositiveInt(process.env.RATE_LIMIT_GENERAL_MAX, 180);
  const authMax = parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 12);
  const uploadMax = parsePositiveInt(process.env.RATE_LIMIT_UPLOAD_MAX, 30);
  const strictMax = parsePositiveInt(process.env.RATE_LIMIT_STRICT_MAX, 40);

  return {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    blockDurationMs: parsePositiveInt(process.env.RATE_LIMIT_BLOCK_MS, 15 * 60_000),
    maxStrikes: parsePositiveInt(process.env.RATE_LIMIT_MAX_STRIKES, 5),
    rules: [
      {
        name: 'auth',
        windowMs,
        max: authMax,
        matcher: (request) =>
          matchesPath(request, '/auth/login') ||
          matchesPath(request, '/auth/register') ||
          matchesPath(request, '/auth/forgot-password') ||
          matchesPath(request, '/auth/reset-password'),
      },
      {
        name: 'upload',
        windowMs,
        max: uploadMax,
        matcher: (request) => matchesPath(request, '/uploads/'),
      },
      {
        name: 'write',
        windowMs,
        max: strictMax,
        matcher: (request) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
      },
      {
        name: 'general',
        windowMs,
        max: generalMax,
        matcher: () => true,
      },
    ],
  };
}

/**
 * Nota para mí:
 * Este limitador protege el API ante ráfagas masivas por IP. Es memoria local,
 * suficiente para una primera defensa en Railway; si luego escalo a varias
 * instancias, debería migrarlo a Redis/Upstash o Cloudflare Rate Limiting.
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!options.enabled || request.method === 'OPTIONS') {
      next();
      return;
    }

    const now = Date.now();
    cleanupExpiredBuckets(now);

    const rule = selectRule(request, options.rules);
    const clientIp = getClientIp(request);
    const key = `${rule.name}:${clientIp}`;
    const current = buckets.get(key);

    const bucket: Bucket =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + rule.windowMs,
            strikes: current?.strikes ?? 0,
            blockedUntil: current?.blockedUntil,
          };

    if (bucket.blockedUntil && bucket.blockedUntil > now) {
      const retryAfter = buildRetryAfterSeconds(bucket.blockedUntil, now);
      response.setHeader('Retry-After', retryAfter.toString());
      response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
        errors: 'RATE_LIMIT_BLOCKED',
      });
      return;
    }

    bucket.count += 1;

    response.setHeader('X-RateLimit-Limit', rule.max.toString());
    response.setHeader('X-RateLimit-Remaining', Math.max(0, rule.max - bucket.count).toString());
    response.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000).toString());

    if (bucket.count > rule.max) {
      bucket.strikes += 1;

      if (bucket.strikes >= options.maxStrikes) {
        bucket.blockedUntil = now + options.blockDurationMs;
      }

      buckets.set(key, bucket);

      const retryUntil = bucket.blockedUntil ?? bucket.resetAt;
      const retryAfter = buildRetryAfterSeconds(retryUntil, now);
      response.setHeader('Retry-After', retryAfter.toString());
      response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.',
        errors: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    buckets.set(key, bucket);
    next();
  };
}
