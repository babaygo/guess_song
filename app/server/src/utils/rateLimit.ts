import type { Request, RequestHandler } from "express";

type RateLimitOptions = {
  max: number;
  windowMs: number;
  message?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export const RATE_LIMIT_MESSAGE = "Trop de requetes. Reessaie dans quelques instants.";

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    pruneExpiredBuckets(now);
    return true;
  }

  if (bucket.count >= options.max) return false;
  bucket.count += 1;
  return true;
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    const key = `${requestIp(req)}:${req.path}`;
    if (checkRateLimit(key, options)) {
      next();
      return;
    }

    res.status(429).json({
      error: options.message ?? RATE_LIMIT_MESSAGE,
      results: [],
    });
  };
}

export function requestIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 10000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
