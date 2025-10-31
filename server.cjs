/* Secure static server with CSP and security headers */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 30900;
const buildDir = path.join(__dirname, 'build');

// Security headers middleware with per-request CSP nonce
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  const allowDevConnect = String(process.env.ALLOW_DEV_CONNECT || '').toLowerCase() === 'true';
  // Allow extra connect-src endpoints (comma-separated), e.g. "https://api.example.com wss://ws.example.com"
  const extrasRaw = String(process.env.CONNECT_SRC_EXTRA || '').trim();
  const extraList = extrasRaw
    ? extrasRaw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    : [];
  const extras = extraList.length ? ' ' + extraList.join(' ') : '';
  const connectSrc = allowDevConnect
    ? "connect-src 'self' http://localhost:* http://127.0.0.1:* https: wss:" + extras
    : "connect-src 'self' https: wss:" + extras;
  // Strong CSP via HTTP header (remove 'unsafe-inline'; use nonce for styles)
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://s3.tradingview.com",
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      connectSrc,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      'upgrade-insecure-requests',
      'block-all-mixed-content',
    ].join('; ')
  );
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  // Optional COEP toggle to enable strong cross-origin isolation (may affect third-party embeds)
  if (String(process.env.ENABLE_COEP).toLowerCase() === 'true') {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  // HSTS is only enforced over HTTPS; safe to include for production deployments
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Additional hardening
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

// Serve static files but do not auto-serve index.html; let SPA fallback handle it
app.use(express.static(buildDir, { fallthrough: true, index: false }));

// Minimal health check endpoint to satisfy frontend bootstrapping
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
});

// Anomaly detection stats stub to satisfy frontend fallback health checks
app.get('/api/anomaly-detection/stats', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify({
    status: 'ok',
    anomalies: 0,
    lastUpdated: new Date().toISOString(),
  }));
});

// Auth reachability endpoint for BackendHealthPanel (returns 401 by default)
app.get('/api/auth/me', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // 无登录态，返回 401 以表示端点可达但未授权
  res.status(401).send(JSON.stringify({ error: 'unauthorized' }));
});

// SPA fallback to index.html
app.get('*', (req, res) => {
  const indexPath = path.join(buildDir, 'index.html');
  // Ensure HTML is not cached to avoid stale sensitive UI
  res.setHeader('Cache-Control', 'no-store');
  try {
    let html = fs.readFileSync(indexPath, 'utf8');
    // Inject CSP nonce as a meta tag for client-side retrieval
    const injectedMeta = `  <meta name="csp-nonce" content="${res.locals.nonce}">\n`;
    // Remove any meta CSP to avoid conflicts with header CSP
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
    html = html.replace('</head>', `${injectedMeta}</head>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    // Fallback to streaming if any error occurs
    fs.createReadStream(indexPath).pipe(res);
  }
});

app.listen(PORT, () => {
  console.log(`Secure static server running at http://localhost:${PORT}/`);
});