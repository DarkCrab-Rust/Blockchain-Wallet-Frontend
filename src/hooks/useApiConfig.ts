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
    const normalized = normalizeApiUrl(apiUrl);
    if (!normalized) {
      setApiUrlErr('URL 无效，请输入完整的后端地址');
      return;
    }
    if (apiKey && apiKey.length < 8) {
      setApiKeyErr('API Key 太短，请检查');
      return;
    }
    // 同步新旧键名，保持兼容性
    safeLocalStorage.setItem('api.baseUrl', normalized);
    safeLocalStorage.setItem('api_url', normalized);
    if (apiKey) {
      safeLocalStorage.setItem('api.key', apiKey);
      safeLocalStorage.setItem('api_key', apiKey);
    }
    // 更新运行时 baseUrl，确保拦截器与展示一致
    apiRuntime.setBaseUrl(normalized);
    showSuccess('已保存配置');
    // 广播同时携带新旧键，确保不同订阅者兼容更新
    eventBus.emitApiConfigUpdated({ baseUrl: normalized, apiKey, key: apiKey });
  }, [apiUrl, apiKey, showSuccess]);

  const debounceRef = React.useRef<number | null>(null);

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
    setApiKey('');
    showSuccess('已清除敏感配置');
  }, [showSuccess]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
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