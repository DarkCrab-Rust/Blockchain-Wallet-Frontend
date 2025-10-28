export type ApiErrorPayload = {
  message: string;
  status?: number;
  title?: string;
  severity?: 'error' | 'warning' | 'info' | 'low' | 'medium' | 'high' | 'critical';
  category?: string; // 错误类别，如 network/timeout/http_5xx/canceled
  endpoint?: string; // 触发错误的接口或路径前缀
  // 友好化字段（可选）：用于UI展示与聚合
  friendlyMessage?: string;
  friendlyCategory?: string;
  friendlyEndpoint?: string;
  originalEndpoint?: string;
  endpointCategory?: string;
  // 行动建议与上下文
  userAction?: string;
  errorContext?: any;
};

export type ApiConfigUpdatedPayload = {
  baseUrl: string;
  // 兼容：历史上曾使用 key；当前统一使用 apiKey
  apiKey?: string;
  key?: string;
};

export const eventBus = {
  emitApiError(payload: ApiErrorPayload) {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-error', { detail: payload }));
      }
    } catch {
      // noop
    }
  },
  onApiError(handler: (payload: ApiErrorPayload) => void) {
    if (typeof window === 'undefined') return () => {};
    const listener = (e: Event) => {
      const ce = e as CustomEvent<ApiErrorPayload>;
      handler(ce.detail);
    };
    window.addEventListener('api-error', listener as EventListener);
    return () => window.removeEventListener('api-error', listener as EventListener);
  },
  emitApiConfigUpdated(payload: ApiConfigUpdatedPayload) {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-config-updated', { detail: payload }));
      }
    } catch {
      // noop
    }
  },
  onApiConfigUpdated(handler: (payload: ApiConfigUpdatedPayload) => void) {
    if (typeof window === 'undefined') return () => {};
    const listener = (e: Event) => {
      const ce = e as CustomEvent<ApiConfigUpdatedPayload>;
      handler(ce.detail);
    };
    window.addEventListener('api-config-updated', listener as EventListener);
    return () => window.removeEventListener('api-config-updated', listener as EventListener);
  },
};