type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  capacity?: number;
};

type Entry = {
  count: number;
  resetAt: number;
  touchedAt: number;
};

const store = new Map<string, Entry>();

function evictOldest(capacity: number) {
  if (store.size <= capacity) return;

  const entries = [...store.entries()].sort((a, b) => a[1].touchedAt - b[1].touchedAt);
  const removeCount = store.size - capacity;
  for (let i = 0; i < removeCount; i += 1) {
    store.delete(entries[i][0]);
  }
}

export function checkRateLimit(key: string, options: RateLimitOptions): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs, touchedAt: now });
    evictOldest(options.capacity ?? 2000);
    return { allowed: true, retryAfterSec: 0 };
  }

  existing.touchedAt = now;
  existing.count += 1;

  if (existing.count > options.maxRequests) {
    const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true, retryAfterSec: 0 };
}
