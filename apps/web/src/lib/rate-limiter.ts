/**
 * Simple in-memory fixed-window rate limiter.
 * Suitable for a single-process Node.js deployment (Docker container).
 *
 * Limits: 5 attempts per IP per 15-minute window.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Prune expired entries periodically to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, WINDOW_MS);

/**
 * Record a login attempt for the given IP.
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) return false;

  entry.count++;
  return true;
}

/** Returns seconds until the rate limit resets for an IP. */
export function retryAfterSeconds(ip: string): number {
  const entry = store.get(ip);
  if (!entry) return 0;
  return Math.ceil((entry.resetAt - Date.now()) / 1000);
}
