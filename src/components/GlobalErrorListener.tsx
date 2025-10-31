import { useEffect } from 'react';
import { eventBus } from '../utils/eventBus';

function GlobalErrorListener() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      try {
        eventBus.emitApiError({
          title: 'Unhandled Error',
          message: e.message || 'Unknown error',
          category: 'runtime',
          severity: 'error',
          endpoint: 'window.error',
          errorContext: { filename: e.filename, lineno: e.lineno, colno: e.colno },
        });
      } catch {}
    };
    const onUnhandled = (e: PromiseRejectionEvent) => {
      try {
        const message = (e.reason && (e.reason.message || e.reason.toString())) || 'Unknown rejection';
        eventBus.emitApiError({
          title: 'Unhandled Rejection',
          message,
          category: 'runtime',
          severity: 'error',
          endpoint: 'window.unhandledrejection',
          errorContext: { reason: e.reason },
        });
      } catch {}
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);
  return null;
}

export default GlobalErrorListener;