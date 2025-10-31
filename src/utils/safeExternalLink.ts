export function openExternal(url: string): boolean {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    const parsed = new URL(url, window.location.origin);
    const allowedProtocols = ['https:', 'mailto:', 'tel:'];
    if (!isProd) allowedProtocols.push('http:');
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new Error(`Blocked protocol: ${parsed.protocol}`);
    }
    const whitelistEnv = (process.env.REACT_APP_EXTERNAL_WHITELIST as string) || '';
    const whitelist = whitelistEnv.split(',').map((s) => s.trim()).filter(Boolean);
    if (whitelist.length > 0 && !whitelist.includes(parsed.origin)) {
      throw new Error(`Blocked origin: ${parsed.origin}`);
    }
    const a = document.createElement('a');
    a.href = parsed.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    // 通过 a 标签确保 noopener/noreferrer，避免 window.opener 劫持
    a.click();
    return true;
  } catch (e) {
    try { console.warn('[openExternal] blocked', e); } catch {}
    return false;
  }
}