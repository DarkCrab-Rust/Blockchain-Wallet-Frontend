import React from 'react';
import { systemService } from '../services/api';

import { useFeatureFlags } from './useFeatureFlags';

export type ApiStatus = 'ok' | 'error' | 'checking' | 'mock';

export function useApiStatus(useMockBackend?: boolean) {
  const [status, setStatus] = React.useState<ApiStatus>('checking');
  const [delay, setDelay] = React.useState<number>(15000);
  const timerRef = React.useRef<any>(null);
  const seqRef = React.useRef<number>(0);
  const { useMockBackend: flagsUseMockBackend } = useFeatureFlags();
  const mock = (useMockBackend ?? flagsUseMockBackend) === true;

  const refresh = React.useCallback(async () => {
    if (mock) {
      setStatus('mock');
      return;
    }
    const seq = ++seqRef.current;
    // 避免后端不可达时每次轮询都切回 "checking" 造成抖动
    setStatus((prev) => (prev === 'error' ? 'error' : 'checking'));
    try {
      const res = await systemService.healthCheck();
      if (seq !== seqRef.current) return; // 仅处理最新一次检查结果
      setStatus(res?.status === 'ok' ? 'ok' : 'error');
      setDelay(15000);
    } catch (e) {
      if (seq !== seqRef.current) return; // 过期结果直接丢弃
      setStatus('error');
      setDelay((d) => {
        const next = Math.min(d * 2, 60000);
        const jitter = 0.85 + Math.random() * 0.3;
        return Math.round(next * jitter);
      });
    }
  }, [mock]);

  const schedule = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (document.hidden) {
        schedule();
        return;
      }
      await refresh();
      schedule();
    }, delay);
  }, [delay, refresh]);

  React.useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current);
      } else {
        refresh();
        if (!mock) {
          schedule();
        }
      }
    };
    if (!document.hidden) {
      refresh();
      if (!mock) {
        schedule();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mock, delay, refresh, schedule]);

  return { status, refresh } as const;
}