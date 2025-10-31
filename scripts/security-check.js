/* Security headers and CSP verification script */
const http = require('http');
const https = require('https');
const { URL } = require('url');

const target = process.env.CHECK_URL || `http://localhost:${process.env.PORT || '3015'}/`;
const u = new URL(target);
const client = u.protocol === 'https:' ? https : http;

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = client.request(url, { method: 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function has(h, key) {
  return Object.prototype.hasOwnProperty.call(h, key.toLowerCase());
}

function get(h, key) {
  return h[key.toLowerCase()] || '';
}

(async () => {
  try {
    const { status, headers, body } = await fetch(target);
    const results = [];

    results.push({ name: 'HTTP Status', ok: status === 200, value: status });

    const mustHave = [
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'permissions-policy',
      'origin-agent-cluster',
      'x-permitted-cross-domain-policies',
    ];

    for (const k of mustHave) {
      results.push({ name: k, ok: has(headers, k), value: get(headers, k) });
    }

    // HSTS only applies on HTTPS; warn if missing
    results.push({ name: 'strict-transport-security', ok: has(headers, 'strict-transport-security'), value: get(headers, 'strict-transport-security'), warnOnly: u.protocol !== 'https:' });

    const csp = get(headers, 'content-security-policy');
    results.push({ name: 'CSP frame-ancestors none', ok: /frame-ancestors\s+'none'/.test(csp), value: csp });
    results.push({ name: 'CSP style-src nonce', ok: /style-src[^;]*'nonce-/.test(csp), value: csp });

    // Optional: COEP presence check, pass if absent; if present, must be require-corp
    const coep = get(headers, 'cross-origin-embedder-policy');
    const coepPresent = has(headers, 'cross-origin-embedder-policy');
    results.push({ name: 'COEP require-corp (if present)', ok: !coepPresent || /require-corp/i.test(coep), value: coep });

    // HTML should not include meta CSP tag
    const hasMetaCsp = /http-equiv\s*=\s*"Content-Security-Policy"/i.test(body);
    results.push({ name: 'No meta CSP in HTML', ok: !hasMetaCsp, value: hasMetaCsp ? 'present' : 'absent' });

    const failed = results.filter(r => !r.ok && !r.warnOnly);
    const warnings = results.filter(r => !r.ok && r.warnOnly);

    console.log('Security header check for:', target);
    for (const r of results) {
      const statusTxt = r.ok ? 'OK' : (r.warnOnly ? 'WARN' : 'FAIL');
      console.log(`- ${r.name}: ${statusTxt}${r.value ? ` | ${r.value}` : ''}`);
    }

    if (failed.length) {
      console.error(`\n${failed.length} checks failed.`);
      process.exitCode = 1;
    } else {
      console.log('\nAll mandatory checks passed.');
    }

    if (warnings.length) {
      console.warn(`${warnings.length} warnings (likely due to non-HTTPS environment).`);
    }
  } catch (e) {
    console.error('Security check error:', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
})();