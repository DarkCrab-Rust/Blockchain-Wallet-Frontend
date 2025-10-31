import { useEffect, useRef, useState } from 'react';

type EventType = 'detection_completed' | 'transaction_blocked' | 'warning_issued';

export interface AnomalyEventPayload {
  type: EventType;
  message?: string;
  threatLevel?: string; // e.g., None, Low, Medium, High, Critical
  data?: any; // backend-specific payload
}

interface UseAnomalyEventsOptions {
  url?: string;
  onDetectionCompleted?: (evt: AnomalyEventPayload) => void;
  onTransactionBlocked?: (evt: AnomalyEventPayload) => void;
  onWarningIssued?: (evt: AnomalyEventPayload) => void;
}

export function useAnomalyEvents(options: UseAnomalyEventsOptions = {}) {
  const normalizeWs = (raw: string) => {
    try {
      const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
      const base = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost';
      // 若未提供原始地址，按环境生成安全默认
      if (!raw || !raw.trim()) {
        if (!isProd) return 'ws://localhost:8888/api/anomaly-detection/events';
        const host = (typeof window !== 'undefined' && window.location ? window.location.host : 'localhost');
        return `wss://${host}/api/anomaly-detection/events`;
      }
      const u = new URL(raw, base);
      const needsSecure = isProd || (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1');
      const protocol = (u.protocol === 'ws:' && needsSecure) ? 'wss:' : u.protocol;
      return `${protocol}//${u.host}${u.pathname}${u.search}`;
    } catch {
      return raw.replace(/^ws:\/\//i, 'wss://');
    }
  };
  const { url = normalizeWs(process.env.REACT_APP_ANOMALY_WS_URL || ''), onDetectionCompleted, onTransactionBlocked, onWarningIssued } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<AnomalyEventPayload | null>(null);

  // 使用ref持有回调，避免在依赖数组中加入这些函数导致eslint警告
  const onDetectionCompletedRef = useRef<typeof onDetectionCompleted | undefined>(onDetectionCompleted);
  const onTransactionBlockedRef = useRef<typeof onTransactionBlocked | undefined>(onTransactionBlocked);
  const onWarningIssuedRef = useRef<typeof onWarningIssued | undefined>(onWarningIssued);

  useEffect(() => {
    onDetectionCompletedRef.current = onDetectionCompleted;
    onTransactionBlockedRef.current = onTransactionBlocked;
    onWarningIssuedRef.current = onWarningIssued;
  }, [onDetectionCompleted, onTransactionBlocked, onWarningIssued]);

  useEffect(() => {
    const isTestEnv = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
    if (isTestEnv) {
      // 在测试环境跳过 WebSocket 连接，避免 jsdom 下的网络错误与 open handle 泄漏
      setConnected(false);
      setError(null);
      wsRef.current = null;
      return () => {};
    }
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onerror = () => setError('WebSocket 连接错误');
      ws.onclose = () => setConnected(false);
      ws.onmessage = (event) => {
        try {
          const data: AnomalyEventPayload = JSON.parse(event.data);
          setLastEvent(data);
          switch (data.type) {
            case 'detection_completed':
              onDetectionCompletedRef.current?.(data);
              break;
            case 'transaction_blocked':
              onTransactionBlockedRef.current?.(data);
              break;
            case 'warning_issued':
              onWarningIssuedRef.current?.(data);
              break;
            default:
              break;
          }
        } catch (e) {
          // ignore parse errors
        }
      };
    } catch (e: any) {
      setError(String(e?.message || e));
    }
    return () => {
      if (wsRef.current && wsRef.current.readyState <= 1) {
        try { wsRef.current.close(); } catch {}
      }
      wsRef.current = null;
    };
  }, [url]);

  const close = () => {
    if (wsRef.current && wsRef.current.readyState <= 1) {
      try { wsRef.current.close(); } catch {}
    }
    wsRef.current = null;
    setConnected(false);
  };

  return { connected, error, lastEvent, close };
}