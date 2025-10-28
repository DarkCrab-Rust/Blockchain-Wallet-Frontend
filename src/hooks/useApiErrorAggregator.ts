import React from 'react';
import toast from 'react-hot-toast';
import { eventBus, ApiErrorPayload } from '../utils/eventBus';

export type AggregatedError = {
  key: string;
  count: number;
  lastSeen: number;
  category: string;
  endpoint: string;
  title: string;
  message: string;
  severity: string;
  userAction?: string;
  errorContext?: any;
};

function normalizeErrorContent(message: string): string {
  return (message || '')
    .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(\.\d{3})?[Z]?/g, '[TIMESTAMP]')
    .replace(/\d{13,}/g, '[TIMESTAMP]')
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
    .replace(/[a-f0-9]{32,}/gi, '[HASH]')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g, '[IP]')
    .replace(/\b\d{4,}\b/g, '[NUMBER]')
    .replace(/"[^"]{10,}"/g, '"[CONTENT]"')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDynamicWindow(errorCount: number): number {
  if (errorCount <= 2) return 30000; // 30秒
  if (errorCount <= 5) return 60000; // 1分钟
  if (errorCount <= 10) return 120000; // 2分钟
  return 300000; // 5分钟
}

// 保留更简单的动态窗口策略，移除未使用的辅助函数

export function useApiErrorAggregator() {
  const bucketRef = React.useRef<Map<string, AggregatedError>>(new Map());
  // 移除强制刷新，避免不必要的父组件重渲染导致界面抖动
  // const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const cleanupErrorBucket = React.useCallback(() => {
    const now = Date.now();
    const entries = Array.from(bucketRef.current.entries());
    const sortedEntries = entries
      .sort(([, a], [, b]) => b.lastSeen - a.lastSeen)
      .slice(0, 100);
    const validEntries = sortedEntries.filter(([_, value]) => {
      const dynamicWindow = getDynamicWindow(value.count);
      const maxAge = Math.max(dynamicWindow, 60000);
      return (now - value.lastSeen) < maxAge;
    });
    bucketRef.current.clear();
    validEntries.forEach(([key, value]) => bucketRef.current.set(key, value));
  }, []);

  React.useEffect(() => {
    const unsub = eventBus.onApiError((error: ApiErrorPayload & any) => {
      // 优先使用友好字段，其次回退到原始字段
      const title: string = error?.title || '请求错误';
      const message: string = error?.friendlyMessage || error?.message || '';
      const category: string = error?.friendlyCategory || error?.category || 'unknown';
      const endpoint: string = error?.friendlyEndpoint || error?.endpoint || error?.originalEndpoint || 'unknown';
      const severity: string = error?.severity || 'error';
      const userAction: string | undefined = error?.userAction;
      const errorContext = error?.errorContext;

      const normalizedTitle = normalizeErrorContent(title);
      const normalizedMessage = normalizeErrorContent(message);
      const smartKey = `${category}|${endpoint}|${normalizedTitle}|${normalizedMessage}`;
      const fallbackKey = `${category}|${endpoint}|${title}|${message}`;

      const existingSmart = bucketRef.current.get(smartKey);
      const existingFallback = bucketRef.current.get(fallbackKey);
      const now = Date.now();

      const existing = existingSmart || existingFallback;
      const showToastBySeverity = (sev: string, text: string) => {
        const contextText = userAction ? `\n建议: ${userAction}` : '';
        const fullText = `${text}${contextText}`;
        if (sev === 'warning') return toast(fullText, { icon: '⚠️', duration: 4000 });
        if (sev === 'info' || sev === 'low') return toast(fullText, { icon: 'ℹ️', duration: 3500 });
        if (sev === 'medium') return toast(fullText, { icon: 'ℹ️', duration: 3500 });
        if (sev === 'high' || sev === 'critical') return toast.error(fullText, { duration: 5000 });
        return toast.error(fullText, { duration: 4000 });
      };

      if (existing) {
        existing.count += 1;
        const windowMs = getDynamicWindow(existing.count);
        const timeSinceLast = now - existing.lastSeen;
        if (existing.count <= 3 || timeSinceLast > windowMs) {
          showToastBySeverity(severity, `${title}: ${message}`);
          // 仅在实际展示 toast 时更新 lastSeen，避免过度重置导致频繁提示
          existing.lastSeen = now;
        }
      } else {
        const finalKey = existingSmart ? smartKey : smartKey; // 优先智能键
        const entry: AggregatedError = {
          key: finalKey,
          count: 1,
          lastSeen: now,
          category,
          endpoint,
          title,
          message,
          severity,
          userAction,
          errorContext,
        };
        bucketRef.current.set(finalKey, entry);
        showToastBySeverity(severity, `${title}: ${message}`);
      }

      cleanupErrorBucket();
      // 移除强制刷新，避免对使用该 Hook 的容器造成抖动
      // forceUpdate();
    });

    return unsub;
  }, [cleanupErrorBucket]);

  const errors = React.useMemo(() => Array.from(bucketRef.current.values()), []);

  const clearAll = React.useCallback(() => {
    bucketRef.current.clear();
    // forceUpdate();
  }, []);

  const removeByKey = React.useCallback((key: string) => {
    bucketRef.current.delete(key);
    // forceUpdate();
  }, []);

  return {
    errors,
    clearAll,
    removeByKey,
  };
}