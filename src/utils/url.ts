// Canonical API URL normalizer used across the app
// Ensures protocol, trims trailing slashes, and appends '/api' as needed.
export function normalizeApiUrl(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  // If relative path is provided (e.g., '/api'), keep it and ensure suffix
  if (!/^https?:\/\//i.test(trimmed)) {
    // Only accept proper relative paths starting with '/'
    if (!trimmed.startsWith('/')) return null;
    const p = trimmed.replace(/\/+$/, '');
    return p.endsWith('/api') ? p : `${p}/api`;
  }

  try {
    const parsed = new URL(trimmed);
    const pathNoTrailing = parsed.pathname.replace(/\/+$/, '');
    const base = `${parsed.protocol}//${parsed.host}${pathNoTrailing}`;
    return base.endsWith('/api') ? base : `${base}/api`;
  } catch {
    return null;
  }
}