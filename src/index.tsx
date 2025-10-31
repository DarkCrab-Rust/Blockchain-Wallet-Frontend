import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { eventBus } from './utils/eventBus';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// Runtime clickjacking defense: bust out of frames when headers aren't enforced
try {
  if (typeof window !== 'undefined' && window.top && window.self && window.top !== window.self) {
    // Attempt to escape framing to the top window
    window.top.location.replace(window.self.location.href);
    // As a fallback (e.g., cross-origin blocks), clear UI content
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.textContent = '';
    }
  }
} catch {
  try {
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.textContent = '';
    }
  } catch {}
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 900_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Read CSP nonce injected by server for Emotion style tags
const nonceEl = document.querySelector('meta[name="csp-nonce"]');
const cspNonce = nonceEl?.getAttribute('content') || undefined;
const emotionCache = createCache({ key: 'css', nonce: cspNonce });

root.render(
  <React.StrictMode>
    <CacheProvider value={emotionCache}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </CacheProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals((m) => {
  try {
    if ((process.env.NODE_ENV || '').toLowerCase() === 'development') {
      // 仅在开发环境打印，避免生产环境日志噪音
      // eslint-disable-next-line no-console
      console.log('web-vitals:', m.name, m.value);
    }
  } catch {}
  try {
    eventBus.emitApiError({
      title: 'Web Vitals',
      message: `${m.name}:${m.value}`,
      category: 'perf',
      endpoint: 'web-vitals',
      severity: 'info',
    });
  } catch {}
});
