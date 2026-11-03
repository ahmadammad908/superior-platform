import crypto from "crypto";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_SALT = process.env.RATE_LIMIT_SALT || "superior_connection_default_secure_salt_value_74";

// Optional Upstash Redis client
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.warn("Failed to initialize Upstash Redis, using memory fallback", err);
    redis = null;
  }
}

// In-memory fallback cache for development or when Upstash is unconfigured
interface MemoryEntry {
  count: number;
  resetAt: number;
}
const memoryRateLimitStore = new Map<string, MemoryEntry>();

/**
 * Generate a one-way cryptographically secure SHA-256 hash
 * from the client IP, User-Agent, and a secret server-side salt.
 * This guarantees zero raw IP address retention or leak.
 */
export function generateAnonymizedClientHash(ip: string, userAgent: string): string {
  const normalizedIp = (ip || "127.0.0.1").trim().toLowerCase();
  const normalizedUa = (userAgent || "unknown-ua").trim();
  const rawPayload = `${normalizedIp}:${normalizedUa}:${RATE_LIMIT_SALT}`;

  return crypto.createHash("sha256").update(rawPayload).digest("hex");
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

export interface RateLimitConfig {
  action: "create_post" | "create_comment" | "vote" | "upload_signature";
  maxRequests: number;
  windowInSeconds: number;
}

export const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  create_post: {
    action: "create_post",
    maxRequests: 5, // 5 posts per 10 minutes
    windowInSeconds: 600,
  },
  create_comment: {
    action: "create_comment",
    maxRequests: 15, // 15 comments per 5 minutes
    windowInSeconds: 300,
  },
  vote: {
    action: "vote",
    maxRequests: 40, // 40 votes per minute
    windowInSeconds: 60,
  },
  upload_signature: {
    action: "upload_signature",
    maxRequests: 10, // 10 uploads per 10 minutes
    windowInSeconds: 600,
  },
};

/**
 * Check and record a rate limit attempt using hashed client identity.
 * Works seamlessly with Upstash Redis (if configured) or fast in-memory store.
 */
export async function checkRateLimit(
  clientHash: string,
  ruleKey: keyof typeof RATE_LIMIT_RULES
): Promise<RateLimitResult> {
  const rule = RATE_LIMIT_RULES[ruleKey];
  if (!rule) {
    return { success: true, limit: 100, remaining: 100, reset: Date.now() / 1000 + 60 };
  }

  // Key format: anonymized hash only, zero PII
  const key = `ratelimit:${rule.action}:${clientHash}`;
  const now = Math.floor(Date.now() / 1000);

  // If Upstash Redis is available:
  if (redis) {
    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, rule.windowInSeconds);
      }
      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, rule.maxRequests - current);
      const reset = now + (ttl > 0 ? ttl : rule.windowInSeconds);

      return {
        success: current <= rule.maxRequests,
        limit: rule.maxRequests,
        remaining,
        reset,
      };
    } catch (redisError) {
      console.warn("Upstash Redis error during rate limit, falling back to memory:", redisError);
    }
  }

  // In-memory fallback
  const existing = memoryRateLimitStore.get(key);
  if (!existing || now >= existing.resetAt) {
    const newEntry: MemoryEntry = {
      count: 1,
      resetAt: now + rule.windowInSeconds,
    };
    memoryRateLimitStore.set(key, newEntry);
    return {
      success: true,
      limit: rule.maxRequests,
      remaining: rule.maxRequests - 1,
      reset: newEntry.resetAt,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, rule.maxRequests - existing.count);
  return {
    success: existing.count <= rule.maxRequests,
    limit: rule.maxRequests,
    remaining,
    reset: existing.resetAt,
  };
}
