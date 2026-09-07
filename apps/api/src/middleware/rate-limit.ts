import { getRedisClient, redisKey } from "../services/redis.js";

// ─── Rate Limiter ───
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const incrementScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count`;

let lastRedisFallbackLogAt = 0;

function isLocallyRateLimited(ip: string, bucket: string, maxRequests: number, windowMs: number) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  if (entry.count > maxRequests) return true;
  return false;
}

export async function isRateLimited(ip: string, bucket: string, maxRequests: number, windowMs: number) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const count = await redis.eval(incrementScript, {
        keys: [redisKey("rate-limit", bucket, ip)],
        arguments: [String(windowMs)],
      });
      return Number(count) > maxRequests;
    } catch (error) {
      const now = Date.now();
      if (now - lastRedisFallbackLogAt >= 60_000) {
        lastRedisFallbackLogAt = now;
        console.error(JSON.stringify({
          event: "redis_rate_limit_fallback",
          message: error instanceof Error ? error.message : String(error),
        }));
      }
    }
  }

  return isLocallyRateLimited(ip, bucket, maxRequests, windowMs);
}

// Periodically clean up expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}, 60_000).unref();
