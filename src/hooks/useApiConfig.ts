import React from 'react';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { apiRuntime, systemService } from '../services/api';
import { eventBus } from '../utils/eventBus';
import { normalizeApiUrl } from '../utils/url';

export type UseApiConfigResult = {
  apiUrl: string;
  setApiUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  apiUrlErr: string;
  apiKeyErr: string;
  clearApiUrlErr: () => void;
  clearApiKeyErr: () => void;
  isTestingConnection: boolean;
  successMsg: string;
  saveConfig: () => Promise<void>;
  testConnectivity: () => Promise<void>;
  clearSensitive: () => void;
};

export function useApiConfig(): UseApiConfigResult {
  const [apiUrl, setApiUrl] = React.useState<string>(() => {
    const storedNew = safeLocalStorage.getItem('api.baseUrl');
    const storedLegacy = safeLocalStorage.getItem('api_url');
    return storedNew ?? storedLegacy ?? apiRuntime.getBaseUrl() ?? '';
  });
  const [apiKey, setApiKey] = React.useState<string>(() => {
    const storedNew = safeLocalStorage.getItem('api.key');
    const storedLegacy = safeLocalStorage.getItem('api_key');
    return storedNew ?? storedLegacy ?? '';
  });

  const [apiUrlErr, setApiUrlErr] = React.useState<string>('');
  const [apiKeyErr, setApiKeyErr] = React.useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = React.useState<boolean>(false);
  const [successMsg, setSuccessMsg] = React.useState<string>('');

  const showSuccess = React.useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  }, []);

  const clearApiUrlErr = React.useCallback(() => setApiUrlErr(''), []);
  const clearApiKeyErr = React.useCallback(() => setApiKeyErr(''), []);

  const saveConfig = React.useCallback(async () => {
    const isProd = process.env.NODE_ENV === 'production';
    const normalized = normalizeApiUrl(apiUrl);
    if (!normalized) {
      setApiUrlErr('URL 无效，请输入完整的后端地址');
      return;
    }
    // 统一规范化后的地址到输入框，避免显示与运行时不一致
    setApiUrl(normalized);
    if (apiKey && apiKey.length < 8) {
      setApiKeyErr('API Key 太短，请检查');
      return;
    }
    // 同步新旧键名，保持兼容性（baseUrl 可持久化；API Key 生产环境仅内存）
    safeLocalStorage.setItem('api.baseUrl', normalized);
    safeLocalStorage.setItem('api_url', normalized);
    if (apiKey) {
      if (isProd) {
        try { (window as any).__API_KEY__ = apiKey; } catch {}
        // 显式清理可能存在的历史持久化
        safeLocalStorage.removeItem('api.key');
        safeLocalStorage.removeItem('api_key');
      } else {
        safeLocalStorage.setItem('api.key', apiKey);
        safeLocalStorage.setItem('api_key', apiKey);
      }
    }
    // 更新运行时 baseUrl，确保拦截器与展示一致
    apiRuntime.setBaseUrl(normalized);
    showSuccess('已保存配置');
    // 广播同时携带新旧键，确保不同订阅者兼容更新
    eventBus.emitApiConfigUpdated({ baseUrl: normalized, apiKey, key: apiKey });
  }, [apiUrl, apiKey, showSuccess]);

  const debounceRef = React.useRef<number | null>(null);
  const autoSaveRef = React.useRef<number | null>(null);
  const lastSavedRef = React.useRef<{ url: string; key: string }>({
    url: (safeLocalStorage.getItem('api.baseUrl') || safeLocalStorage.getItem('api_url') || apiRuntime.getBaseUrl() || ''),
    key: (safeLocalStorage.getItem('api.key') || safeLocalStorage.getItem('api_key') || ''),
  });

  // 带校验的防抖自动保存：当输入稳定且合法时自动持久化
  React.useEffect(() => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
      autoSaveRef.current = null;
    }
    autoSaveRef.current = window.setTimeout(() => {
      const normalized = normalizeApiUrl(apiUrl);
      if (!normalized) return; // URL 无效时不自动保存
      if (apiKey && apiKey.length > 0 && apiKey.length < 8) return; // Key 太短时不自动保存
      // 无变化时不写入，避免刷屏提示
      if (normalized === lastSavedRef.current.url && apiKey === lastSavedRef.current.key) return;
      try {
        const isProd = process.env.NODE_ENV === 'production';
        safeLocalStorage.setItem('api.baseUrl', normalized);
        safeLocalStorage.setItem('api_url', normalized);
        if (apiKey) {
          if (isProd) {
            try { (window as any).__API_KEY__ = apiKey; } catch {}
            safeLocalStorage.removeItem('api.key');
            safeLocalStorage.removeItem('api_key');
          } else {
            safeLocalStorage.setItem('api.key', apiKey);
            safeLocalStorage.setItem('api_key', apiKey);
          }
        } else {
          safeLocalStorage.removeItem('api.key');
          safeLocalStorage.removeItem('api_key');
          try { delete (window as any).__API_KEY__; } catch {}
        }
        apiRuntime.setBaseUrl(normalized);
        eventBus.emitApiConfigUpdated({ baseUrl: normalized, apiKey, key: apiKey });
        lastSavedRef.current = { url: normalized, key: apiKey };
        showSuccess('已自动保存');
      } catch {
        // 忽略本地存储错误
      }
    }, 800);
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
        autoSaveRef.current = null;
      }
    };
  }, [apiUrl, apiKey, showSuccess]);

  const testConnectivity = React.useCallback(async () => {
    if (debounceRef.current) {
      return; // 简单防抖，避免频繁点击
    }
    debounceRef.current = window.setTimeout(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }, 300);

    const normalized = normalizeApiUrl(apiUrl);
    if (!normalized) {
      setApiUrlErr('URL 无效，无法测试');
      return;
    }
    setIsTestingConnection(true);
    try {
      const ok = await systemService.ping(normalized, apiKey);
      if (ok) {
        // 成功后同步规范化地址，减少 8888 与 8888/api 的困惑
        setApiUrl(normalized);
        showSuccess('连接成功');
      } else {
        setApiUrlErr('连接失败，请检查地址或网络');
      }
    } catch (e) {
      setApiUrlErr('网络错误或后端不可用');
    } finally {
      setIsTestingConnection(false);
    }
  }, [apiUrl, apiKey, showSuccess]);

  const clearSensitive = React.useCallback(() => {
    safeLocalStorage.removeItem('api.key');
    safeLocalStorage.removeItem('api_key');
    try { delete (window as any).__API_KEY__; } catch {}
    setApiKey('');
    showSuccess('已清除敏感配置');
  }, [showSuccess]);

  // 生产环境强制迁移并清理历史持久化的 API Key
  React.useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) return;
    try {
      const legacy = safeLocalStorage.getItem('api.key') || safeLocalStorage.getItem('api_key');
      if (legacy) {
        try { (window as any).__API_KEY__ = legacy; } catch {}
        safeLocalStorage.removeItem('api.key');
        safeLocalStorage.removeItem('api_key');
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
        autoSaveRef.current = null;
      }
    };
  }, []);

  return {
    apiUrl,
    setApiUrl,
    apiKey,
    setApiKey,
    apiUrlErr,
    apiKeyErr,
    clearApiUrlErr,
    clearApiKeyErr,
    isTestingConnection,
    successMsg,
    saveConfig,
    testConnectivity,
    clearSensitive,
  };
}