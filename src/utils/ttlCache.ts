type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<any>>();

export async function withTtlCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  try {
    const value = await fetcher();
    store.set(key, { value, expiresAt: now + Math.max(0, ttlMs || 0) });
    return value;
  } catch (e) {
    // 不缓存错误结果
    throw e;
  }
}

export function invalidateCache(key: string) {
  store.delete(key);
}

export function invalidateByPrefix(prefix: string) {
  const p = String(prefix || '');
  if (!p) return;
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(p)) {
      store.delete(k);
    }
  }
}

export function clearCache() {
  store.clear();
}