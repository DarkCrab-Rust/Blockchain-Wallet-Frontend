import axios from 'axios';
import { ApiConfig, BalanceResponse, SendTransactionRequest, SystemInfo, TransactionResponse, Wallet, CreateWalletRequest, TransactionHistoryResponse, BridgeAssetsRequest, BridgeResponse } from '../types';
import { getFeatureFlags } from '../utils/featureFlags';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { eventBus } from '../utils/eventBus';

// Mock 开关与本地存储工具
const isMockEnabled = () => getFeatureFlags().useMockBackend;
const readJSON = <T>(key: string, def: T): T => {
  const v = safeLocalStorage.getItem(key);
  if (!v) return def;
  try { return JSON.parse(v) as T; } catch { return def; }
};
const writeJSON = (key: string, val: any) => {
  try { safeLocalStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
};
const MOCK_WALLETS_KEY = 'mock_wallets';
const MOCK_HISTORY_PREFIX = 'mock_history_';

// 生成稳定的伪随机数用于余额
const stableNumber = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 10000) / 100;
};

// Mock 实现
const mockApi = {
  system: {
    async info(): Promise<SystemInfo> {
      return { version: 'mock-0.1' };
    },
    async healthCheck(): Promise<{ status: string }> {
      return { status: 'ok' };
    },
  },
  wallet: {
    async listWallets(): Promise<Wallet[]> {
      let wallets = readJSON<Wallet[]>(MOCK_WALLETS_KEY, []);
      if (wallets.length === 0) {
        wallets = [{ id: 'demo-1', name: 'demo_wallet', quantum_safe: false }];
        writeJSON(MOCK_WALLETS_KEY, wallets);
      }
      return wallets;
    },
    async createWallet(request: CreateWalletRequest): Promise<Wallet> {
      const wallets = readJSON<Wallet[]>(MOCK_WALLETS_KEY, []);
      const w: Wallet = {
        id: Math.random().toString(36).slice(2),
        name: request.name,
        quantum_safe: !!request.quantum_safe,
      };
      wallets.push(w);
      writeJSON(MOCK_WALLETS_KEY, wallets);
      return w;
    },
    async deleteWallet(walletName: string): Promise<void> {
      let wallets = readJSON<Wallet[]>(MOCK_WALLETS_KEY, []);
      wallets = wallets.filter((w) => w.name !== walletName);
      writeJSON(MOCK_WALLETS_KEY, wallets);
      safeLocalStorage.removeItem(MOCK_HISTORY_PREFIX + walletName);
    },
    async getBalance(walletName: string, network?: string): Promise<BalanceResponse> {
      const currency = (network || 'eth').toUpperCase();
      const base = stableNumber(walletName + ':' + (network || 'eth'));
      return { balance: Number((base / 10 + 1).toFixed(4)), currency };
    },
    async sendTransaction(walletName: string, request: SendTransactionRequest, network?: string): Promise<TransactionResponse> {
      const tx_hash = `${network || 'eth'}_mock_${Date.now().toString(16)}`;
      const status = 'submitted';
      // 写入简易历史
      const histKey = MOCK_HISTORY_PREFIX + walletName;
      const history = readJSON<TransactionHistoryResponse>(histKey, { transactions: [] });
      history.transactions.unshift({
        id: tx_hash,
        timestamp: Math.floor(Date.now() / 1000),
        from_address: walletName,
        to_address: request.to_address,
        amount: request.amount,
        status,
      });
      writeJSON(histKey, history);
      return { tx_hash, status };
    },
    async getTransactionHistory(walletName: string, network?: string, opts?: { signal?: AbortSignal }): Promise<TransactionHistoryResponse> {
      const histKey = MOCK_HISTORY_PREFIX + walletName;
      const history = readJSON<TransactionHistoryResponse>(histKey, { transactions: [] });
      // 简单过滤网络（示例：不做实际区分）
      return history;
    },
    async bridgeAssets(walletName: string, request: BridgeAssetsRequest): Promise<BridgeResponse> {
      const bridge_id = `bridge_mock_${Date.now().toString(16)}`;
      const status = 'submitted';
      return { bridge_id, status, target_chain: request.target_chain, amount: request.amount };
    },
  },
};

let apiConfig: ApiConfig = {
  baseUrl: '/api',
};
// 从本地持久化配置初始化 baseURL
const persistedBase = (safeLocalStorage.getItem('api.baseUrl') || safeLocalStorage.getItem('api_url') || '').trim();
if (persistedBase) {
  apiConfig.baseUrl = persistedBase;
  axios.defaults.baseURL = persistedBase;
} else {
// 默认回退到 '/api'，保持与开发代理一致
  axios.defaults.baseURL = apiConfig.baseUrl;
}
// 将当前 baseURL 公开到全局，供运行时读取，避免测试间污染
try { if (typeof window !== 'undefined') { (window as any).__API_BASE_URL__ = apiConfig.baseUrl; } } catch {}

// 统一默认 baseURL 读写为运行时配置，避免测试间状态漂移
try {
  const ax: any = axios as any;
  if (ax?.defaults) {
    Object.defineProperty(ax.defaults, 'baseURL', {
      configurable: true,
      get() { return apiConfig.baseUrl; },
      set(v: any) { apiConfig.baseUrl = String(v || '').trim() || apiConfig.baseUrl; },
    });
  }
  const ax2: any = (() => { try { return require('axios'); } catch { return null; } })();
  if (ax2?.defaults && ax2.defaults !== ax.defaults) {
    Object.defineProperty(ax2.defaults, 'baseURL', {
      configurable: true,
      get() { return apiConfig.baseUrl; },
      set(v: any) { apiConfig.baseUrl = String(v || '').trim() || apiConfig.baseUrl; },
    });
  }
  // 确保初始绑定完成后，后续若被 Jest 重置也能重新绑定
  ensureAxiosDefaultsBinding();
} catch {}

// 在Jest环境下，强制所有axios实例共享同一个defaults引用，确保读值一致
try {
  const currentDefaults: any = (axios as any).defaults || {};
  const shared = (typeof window !== 'undefined'
    ? ((window as any).__AXIOS_DEFAULTS__ || currentDefaults)
    : ((globalThis as any).__AXIOS_DEFAULTS__ || currentDefaults));
  if (typeof window !== 'undefined') (window as any).__AXIOS_DEFAULTS__ = shared;
  // 覆盖 axios.defaults 的 getter/setter 保持共享
  Object.defineProperty((axios as any), 'defaults', {
    configurable: true,
    get() { return shared; },
    set(next: any) {
      try {
        const base = String((next?.baseURL || next?.baseUrl || '')).trim();
        if (base) apiConfig.baseUrl = base;
      } catch {}
    },
  });
  try {
    const ax2: any = require('axios');
    ax2.defaults = shared;
  } catch {}
  // 同步初始 baseURL 至共享对象
  shared.baseURL = apiConfig.baseUrl;
  // 绑定 baseURL 属性至运行时配置，避免后续对象替换造成读值不一致
  Object.defineProperty(shared, 'baseURL', {
    configurable: true,
    get() { return apiConfig.baseUrl; },
    set(v: any) { apiConfig.baseUrl = String(v || '').trim() || apiConfig.baseUrl; },
  });
} catch {}

// 添加请求拦截器：自动附加 Authorization 头（API Key）
const getApiKey = () => ((safeLocalStorage.getItem('api_key') || (process.env.REACT_APP_API_KEY as string) || '').trim());
axios.interceptors.request.use((config) => {
  const key = getApiKey();
  if (key) {
    config.headers = config.headers || {};
    (config.headers as any)['Authorization'] = key;
    (config.headers as any)['X-API-Key'] = key;
  }
  return config;
});

// 端点别名映射 - 友好化API路径显示
const endpointAliasMap: Record<string, string> = {
  '/system/info': '系统信息',
  '/health': '健康检查',
  '/wallets': '钱包列表',
  '/wallets/[name]': '钱包操作',
  '/wallets/[name]/balance': '余额查询',
  '/wallets/[name]/send': '发送交易',
  '/wallets/[name]/history': '交易历史',
  '/bridge': '跨链桥接',
};

// 智能端点识别与别名化
function getEndpointAlias(url: string): { original: string; alias: string; category: string } {
  const cleanUrl = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  
  // 动态路径参数替换
  const normalizedUrl = cleanUrl
    .replace(/\/wallets\/[^/]+(?=\/|$)/, '/wallets/[name]')
    .replace(/\/\d+(?=\/|$)/, '/[id]')
    .replace(/\/[a-f0-9-]{8,}(?=\/|$)/, '/[hash]');
  
  const alias = endpointAliasMap[normalizedUrl] || normalizedUrl || '未知接口';
  
  // 端点分类
  let category = 'api';
  if (normalizedUrl.includes('/system') || normalizedUrl.includes('/health')) {
    category = 'system';
  } else if (normalizedUrl.includes('/wallet')) {
    category = 'wallet';
  } else if (normalizedUrl.includes('/bridge')) {
    category = 'bridge';
  }
  
  return { original: cleanUrl, alias, category };
}

// 服务层降级注入错误端点信息（优先使用错误对象中的URL，其次使用调用方提供的URL）
function annotateErrorWithEndpoint(err: any, urlHint: string) {
  try {
    const useUrl = String(err?.config?.url || err?.response?.config?.url || urlHint || '');
    if (useUrl) {
      const info = getEndpointAlias(useUrl);
      if (!err.friendlyEndpoint || err.friendlyEndpoint === '未知接口') {
        err.friendlyEndpoint = info.alias;
        err.originalEndpoint = info.original;
        err.endpointCategory = info.category;
      }
      if (!err.errorContext) {
        const status = err?.response?.status as number | undefined;
        const enhanced = enhanceErrorClassification(err);
        err.errorContext = {
          timestamp: Date.now(),
          endpoint: info,
          classification: enhanced,
          requestConfig: {
            method: err?.config?.method?.toUpperCase() || 'UNKNOWN',
            timeout: err?.config?.timeout || 0,
            headers: err?.config?.headers ? Object.keys(err.config.headers) : [],
          },
          responseInfo: err?.response ? {
            status,
            statusText: err?.response?.statusText || '',
            headers: err?.response?.headers ? Object.keys(err.response.headers) : [],
          } : null,
        };
      }
    }
    // 取消请求的友好信息降级处理
    const code = err?.code as string | undefined;
    const message = String(err?.message || '');
    if (code === 'ERR_CANCELED' || /aborted|cancel/i.test(message)) {
      err.friendlyMessage = '请求已取消';
      err.friendlyCategory = 'canceled';
      const enhanced = enhanceErrorClassification(err);
      Object.assign(err, enhanced);
    }
  } catch {}
}

// 增强错误分类逻辑
function enhanceErrorClassification(error: any): {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
  userAction?: string;
} {
  const status = error?.response?.status as number | undefined;
  const code = error?.code as string | undefined;
  const message = String(error?.message || '');
  
  // 基础分类
  let category = error.friendlyCategory || 'unknown';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let isRetryable = false;
  let userAction: string | undefined;
  
  // 增强分类逻辑
  if (code === 'ERR_CANCELED' || /aborted|cancel/i.test(message)) {
    category = 'canceled';
    severity = 'low';
    isRetryable = false;
  } else if (code === 'ECONNABORTED' || /timeout/i.test(message)) {
    category = 'timeout';
    severity = 'medium';
    isRetryable = true;
    userAction = '检查网络连接或稍后重试';
  } else if (!error?.response) {
    // 网络错误
    category = 'network';
    severity = 'high';
    isRetryable = true;
    userAction = '检查网络连接或后端服务状态';
  } else {
    // HTTP 状态码分类
    if (status === 401) {
      category = 'auth';
      severity = 'high';
      isRetryable = false;
      userAction = '检查API密钥或重新登录';
    } else if (status === 403) {
      category = 'permission';
      severity = 'high';
      isRetryable = false;
      userAction = '联系管理员获取权限';
    } else if (status === 404) {
      category = 'not_found';
      severity = 'medium';
      isRetryable = false;
      userAction = '检查接口路径或后端版本';
    } else if (status === 429) {
      category = 'rate_limit';
      severity = 'medium';
      isRetryable = true;
      userAction = '稍后重试或降低请求频率';
    } else if (status && status >= 500) {
      category = 'server_error';
      severity = 'critical';
      isRetryable = true;
      userAction = '稍后重试或联系技术支持';
    } else if (status && status >= 400) {
      category = 'client_error';
      severity = 'medium';
      isRetryable = false;
      userAction = '检查请求参数或数据格式';
    }
  }
  
  return { category, severity, isRetryable, userAction };
}

// 响应拦截器：规范错误对象，附加友好提示
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const err: any = error || {};
    const status = err?.response?.status as number | undefined;
    const message = String(err?.message || '');
    const code = err?.code as string | undefined;
    const hasResponse = !!err?.response;
    const isTimeout = code === 'ECONNABORTED' || /timeout/i.test(message);
    const isCanceled = code === 'ERR_CANCELED' || /aborted|cancel/i.test(message);

    // 端点信息增强
    const endpointInfo = getEndpointAlias(String(err?.config?.url || ''));
    err.friendlyEndpoint = endpointInfo.alias;
    err.originalEndpoint = endpointInfo.original;
    err.endpointCategory = endpointInfo.category;

    if (isCanceled) {
      err.friendlyMessage = '请求已取消';
      err.friendlyCategory = 'canceled';
      // 增强分类信息
      const enhanced = enhanceErrorClassification(err);
      Object.assign(err, enhanced);
      return Promise.reject(err);
    }

    let friendlyMessage = '发生未知错误';
    let friendlyCategory = 'unknown';
    if (isTimeout) {
      friendlyMessage = '请求超时，请检查网络或后端服务';
      friendlyCategory = 'timeout';
    } else if (hasResponse) {
      if (status === 401) { friendlyMessage = '未授权或 API Key 无效'; friendlyCategory = 'auth'; }
      else if (status === 403) { friendlyMessage = '权限不足，请检查 API Key 或访问策略'; friendlyCategory = 'permission'; }
      else if (status === 404) { friendlyMessage = '接口未找到，请检查后端路径或代理'; friendlyCategory = 'not_found'; }
      else if (status === 429) { friendlyMessage = '请求过于频繁，请稍后重试'; friendlyCategory = 'rate_limit'; }
      else if ((status || 0) >= 500 && (status || 0) <= 599) { friendlyMessage = '服务异常，请稍后再试'; friendlyCategory = 'server_error'; }
      else { friendlyMessage = `服务错误(${status || '未知状态'})`; friendlyCategory = 'client_error'; }
    } else {
      const maybeCors = /Network Error/i.test(message) || /CORS/i.test(message);
      friendlyMessage = maybeCors ? '网络异常，可能是跨域限制或后端未启动' : '网络异常或后端未启动';
      friendlyCategory = 'network';
    }

    err.friendlyMessage = friendlyMessage;
    err.friendlyCategory = friendlyCategory;
    
    // 应用增强分类
    const enhanced = enhanceErrorClassification(err);
    Object.assign(err, enhanced);
    
    // 为前端错误聚合系统提供更丰富的上下文
    err.errorContext = {
      timestamp: Date.now(),
      endpoint: endpointInfo,
      classification: enhanced,
      requestConfig: {
        method: err?.config?.method?.toUpperCase() || 'UNKNOWN',
        timeout: err?.config?.timeout || 0,
        headers: err?.config?.headers ? Object.keys(err.config.headers) : [],
      },
      responseInfo: hasResponse ? {
        status,
        statusText: err?.response?.statusText || '',
        headers: err?.response?.headers ? Object.keys(err.response.headers) : [],
      } : null,
    };

    // 统一上报错误到事件总线，供 UI 聚合展示
    try {
      eventBus.emitApiError({
        message: friendlyMessage,
        status,
        title: '请求错误',
        severity: 'error',
        category: friendlyCategory,
        endpoint: endpointInfo.alias,
        friendlyMessage,
        friendlyCategory,
        friendlyEndpoint: endpointInfo.alias,
        originalEndpoint: endpointInfo.original,
        userAction: enhanced.userAction,
        errorContext: err.errorContext,
      } as any);
    } catch {}

    return Promise.reject(err);
  }
);

// 统一重绑 axios.defaults.baseURL 的工具，确保在被 Jest 重置后仍保持绑定
function ensureAxiosDefaultsBinding() {
  try {
    const ax: any = axios as any;
    if (ax?.defaults) {
      Object.defineProperty(ax.defaults, 'baseURL', {
        configurable: true,
        get() { return apiConfig.baseUrl; },
        set(v: any) { apiConfig.baseUrl = String(v || '').trim() || apiConfig.baseUrl; },
      });
    }
    const ax2: any = (() => { try { return require('axios'); } catch { return null; } })();
    if (ax2?.defaults && ax2.defaults !== ax.defaults) {
      Object.defineProperty(ax2.defaults, 'baseURL', {
        configurable: true,
        get() { return apiConfig.baseUrl; },
        set(v: any) { apiConfig.baseUrl = String(v || '').trim() || apiConfig.baseUrl; },
      });
    }
    // 强制统一共享 defaults 对象并覆盖所有 axios 引用，抵御 Jest 重置
    const currentDefaults: any = ax.defaults || {};
    const shared = (typeof window !== 'undefined'
      ? ((window as any).__AXIOS_DEFAULTS__ ||= currentDefaults)
      : ((globalThis as any).__AXIOS_DEFAULTS__ ||= currentDefaults));
    Object.defineProperty(shared, 'baseURL', {
      configurable: true,
      get() { return apiConfig.baseUrl; },
      set(v: any) { apiConfig.baseUrl = String(v || '').trim() || apiConfig.baseUrl; },
    });
    // 覆盖 axios.defaults 的 getter/setter，确保总是返回共享对象
    Object.defineProperty(ax, 'defaults', {
      configurable: true,
      get() { return shared; },
      set(next: any) {
        try {
          const base = String((next?.baseURL || next?.baseUrl || '')).trim();
          if (base) apiConfig.baseUrl = base;
        } catch {}
      },
    });
    try { const ax2r: any = require('axios'); ax2r.defaults = shared; } catch {}
    shared.baseURL = apiConfig.baseUrl;
  } catch {}
}

export const apiRuntime = {
  getBaseUrl(): string {
if (typeof __shouldLog === 'function' ? __shouldLog() : ((process.env.NODE_ENV || '').toLowerCase() !== 'test')) {
  try { console.log('[apiRuntime.getBaseUrl] apiConfig.baseUrl=', apiConfig.baseUrl, 'system.baseUrl=', systemService.getConfig().baseUrl); } catch {}
}
    return systemService.getConfig().baseUrl;
  },
  setBaseUrl(url?: string) {
    const normalized = (url || '').trim();
const __shouldLog = () => ((process.env.NODE_ENV || '').toLowerCase() !== 'test');
if (__shouldLog()) { try { console.log('[apiRuntime.setBaseUrl]', normalized, 'prev', (axios as any).defaults?.baseURL); } catch {} }
    apiConfig.baseUrl = normalized || apiConfig.baseUrl;
if (__shouldLog()) { try { console.log('[apiRuntime.setBaseUrl] assigned apiConfig.baseUrl =', apiConfig.baseUrl); } catch {} }
    axios.defaults.baseURL = apiConfig.baseUrl;
    try { (require('axios') as any).defaults.baseURL = apiConfig.baseUrl; } catch {}
    ensureAxiosDefaultsBinding();
    // 保持与系统配置一致，确保后续读取一致性
    systemService.setConfig({ baseUrl: apiConfig.baseUrl });
    try { safeLocalStorage.setItem('api.baseUrl', apiConfig.baseUrl); } catch {}
    try { if (typeof window !== 'undefined') { (window as any).__API_BASE_URL__ = apiConfig.baseUrl; } } catch {}
    // 强制覆盖所有可能的 axios.defaults 引用，避免先前测试污染导致读值不一致
    try {
      const ax: any = axios as any;
      if (!ax.defaults) ax.defaults = {};
      if (ax.defaults.baseURL !== apiConfig.baseUrl) {
        ax.defaults.baseURL = apiConfig.baseUrl;
      }
      const ax2: any = (() => { try { return require('axios'); } catch { return null; } })();
      if (ax2?.defaults && ax2.defaults !== ax.defaults) {
        if (ax2.defaults.baseURL !== apiConfig.baseUrl) {
          ax2.defaults.baseURL = apiConfig.baseUrl;
        }
      }
      if (typeof window !== 'undefined') {
        const shared = (window as any).__AXIOS_DEFAULTS__;
        if (shared && shared.baseURL !== apiConfig.baseUrl) {
          shared.baseURL = apiConfig.baseUrl;
        }
      }
    } catch {}
    // 广播配置更新，通知其他模块或测试用例环境同步
    try { eventBus.emitApiConfigUpdated({ baseUrl: apiConfig.baseUrl }); } catch {}
    // 移除微任务重绑，避免跨测试时序影响，直接同步完成
  },
};

// 轻量重试工具与可取消的 sleep
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new Error('aborted'));
    };
    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    };
    if (signal) {
      if (signal.aborted) {
        cleanup();
        return reject(new Error('aborted'));
      }
      signal.addEventListener('abort', onAbort);
    }
  });
}

async function withRetry<T>(task: () => Promise<T>, opts?: { retries?: number; delayMs?: number; signal?: AbortSignal }): Promise<T> {
  const retries = opts?.retries ?? 1; // 轻量重试 1 次
  const baseDelay = opts?.delayMs ?? 300;
  let attempt = 0;
  let lastErr: any;
  while (attempt <= retries) {
    try {
      return await task();
    } catch (e: any) {
      if (lastErr === undefined) lastErr = e;
      // 降级增强：即便在被 jest 替换的 axios 环境下，也尽量提供端点上下文
      // 这样测试中直接 mockRejectedValueOnce 的错误也能拥有 friendlyEndpoint 等字段
      try {
        const url = String(e?.config?.url || e?.response?.config?.url || '');
        const info = getEndpointAlias(url);
        e.friendlyEndpoint = info.alias;
        e.originalEndpoint = info.original;
        e.endpointCategory = info.category;
        const code = e?.code as string | undefined;
        const message = String(e?.message || '');
        const status = e?.response?.status as number | undefined;
        if (code === 'ERR_CANCELED' || /aborted|cancel/i.test(message)) {
          e.friendlyMessage = '请求已取消';
          e.friendlyCategory = 'canceled';
        }
        if ((code === 'ECONNABORTED' || /timeout/i.test(message)) && !e.friendlyMessage) {
          e.friendlyMessage = '请求超时，请检查网络或后端服务';
          e.friendlyCategory = 'timeout';
        }
        if (typeof status === 'number' && status >= 500 && status <= 599 && !e.friendlyMessage) {
          e.friendlyMessage = '服务异常，请稍后再试';
          e.friendlyCategory = 'server_error';
        }
        if (typeof status === 'number' && !e.friendlyMessage) {
          if (status === 401) { e.friendlyMessage = '未授权或 API Key 无效'; e.friendlyCategory = 'auth'; }
          else if (status === 403) { e.friendlyMessage = '权限不足，请检查 API Key 或访问策略'; e.friendlyCategory = 'permission'; }
          else if (status === 404) { e.friendlyMessage = '接口未找到，请检查后端路径或代理'; e.friendlyCategory = 'not_found'; }
          else if (status === 429) { e.friendlyMessage = '请求过于频繁，请稍后重试'; e.friendlyCategory = 'rate_limit'; }
          else if (status >= 400 && status < 500) { e.friendlyMessage = `服务错误(${status})`; e.friendlyCategory = 'client_error'; }
        }
        // 应用增强分类，并仅在可重试错误时继续重试（如网络/超时/5xx）
        const enhanced = enhanceErrorClassification(e);
        Object.assign(e, enhanced);
        if (enhanced.category === 'network' && !e.friendlyMessage) {
          const maybeCors = /Network Error/i.test(message) || /CORS/i.test(message);
          e.friendlyMessage = maybeCors ? '网络异常，可能是跨域限制或后端未启动' : '网络异常或后端未启动';
          e.friendlyCategory = 'network';
        }
        if (!enhanced.isRetryable) {
          // 不可重试错误（如取消、4xx）直接退出循环
          break;
        }
      } catch {}
      if (opts?.signal?.aborted) throw e;
      if (attempt === retries) break;
      const jitter = Math.random() * baseDelay * 0.4; // 0~40% 抖动
      await sleep(baseDelay + jitter, opts?.signal);
      attempt += 1;
    }
  }
  throw lastErr;
}

export const systemService = {
  async info(): Promise<SystemInfo> {
    if (isMockEnabled()) return mockApi.system.info();
    const res = await axios.get('/system/info');
    return res.data;
  },

  async healthCheck(opts?: { signal?: AbortSignal }): Promise<{ status: string }> {
    if (isMockEnabled()) return mockApi.system.healthCheck();
    try {
      return await withRetry(async () => {
        const res = await axios.get('/health', { signal: opts?.signal, timeout: 5000 });
        return res.data;
      }, { retries: 1, delayMs: 250, signal: opts?.signal });
    } catch (err: any) {
      annotateErrorWithEndpoint(err, '/health');
      throw err;
    }
  },
  async ping(baseUrl: string, key?: string): Promise<boolean> {
    if (isMockEnabled()) return true;
    const endpoint = `${(baseUrl || '').replace(/\/+$/, '')}/health`;
    try {
      const res = await axios.get(endpoint, {
        timeout: 5000,
        headers: key ? { Authorization: key, 'X-API-Key': key } : undefined,
      });
      return res?.data?.status === 'ok';
    } catch {
      return false;
    }
  },
  setConfig(config: ApiConfig) {
    apiConfig = { ...apiConfig, ...config };
  },
  getConfig(): ApiConfig {
    return apiConfig;
  },
};

export const walletService = {
  async listWallets(): Promise<Wallet[]> {
    if (isMockEnabled()) return mockApi.wallet.listWallets();
    try {
      return await withRetry(async () => {
        const res = await axios.get('/wallets');
        return res.data;
      }, { retries: 1, delayMs: 250 });
    } catch (err: any) {
      annotateErrorWithEndpoint(err, err?.config?.url || '/wallets');
      throw err;
    }
  },
  async createWallet(request: CreateWalletRequest): Promise<Wallet> {
    if (isMockEnabled()) return mockApi.wallet.createWallet(request);
    return withRetry(async () => {
      const res = await axios.post('/wallets', request);
      return res.data;
    }, { retries: 1, delayMs: 250 });
  },
  async deleteWallet(walletName: string): Promise<void> {
    if (isMockEnabled()) return mockApi.wallet.deleteWallet(walletName);
    return withRetry(async () => {
      await axios.delete(`/wallets/${encodeURIComponent(walletName)}`);
      return undefined as any;
    }, { retries: 1, delayMs: 250 });
  },
  async getBalance(walletName: string, network?: string): Promise<BalanceResponse> {
    if (isMockEnabled()) return mockApi.wallet.getBalance(walletName, network);
    const params: any = {};
    if (network) params.network = network;
    try {
      return await withRetry(async () => {
        const res = await axios.get(`/wallets/${encodeURIComponent(walletName)}/balance`, { params });
        return res.data;
      }, { retries: 1, delayMs: 300 });
    } catch (err: any) {
      annotateErrorWithEndpoint(err, err?.config?.url || `/wallets/${encodeURIComponent(walletName)}/balance`);
      throw err;
    }
  },
  async sendTransaction(walletName: string, request: SendTransactionRequest, network?: string): Promise<TransactionResponse> {
    if (isMockEnabled()) return mockApi.wallet.sendTransaction(walletName, request, network);
    const params: any = {};
    if (network) params.network = network;
    try {
      const res = await axios.post(`/wallets/${encodeURIComponent(walletName)}/send`, request, { params });
      return res.data;
    } catch (err: any) {
      annotateErrorWithEndpoint(err, err?.config?.url || `/wallets/${encodeURIComponent(walletName)}/send`);
      throw err;
    }
  },

  async getTransactionHistory(walletName: string, network?: string, opts?: { signal?: AbortSignal }): Promise<TransactionHistoryResponse> {
    if (isMockEnabled()) return mockApi.wallet.getTransactionHistory(walletName, network, opts);
    const params: any = {};
    if (network) params.network = network;
    try {
      return await withRetry(async () => {
        const res = await axios.get(`/wallets/${encodeURIComponent(walletName)}/history`, { params, signal: opts?.signal });
        return res.data;
      }, { retries: 1, delayMs: 300, signal: opts?.signal });
    } catch (err: any) {
      annotateErrorWithEndpoint(err, err?.config?.url || `/wallets/${encodeURIComponent(walletName)}/history`);
      throw err;
    }
  },
  async bridgeAssets(walletName: string, request: BridgeAssetsRequest): Promise<BridgeResponse> {
    if (isMockEnabled()) return mockApi.wallet.bridgeAssets(walletName, request);
    try {
      return await withRetry(async () => {
        const res = await axios.post('/bridge', { ...request, wallet_name: walletName });
        return res.data;
      }, { retries: 1, delayMs: 250 });
    } catch (err: any) {
      annotateErrorWithEndpoint(err, err?.config?.url || '/bridge');
      throw err;
    }
  },
};

// 全局 axios 实例的超时设置（默认 10s，可按需调整）
axios.defaults.timeout = 10000;

// 如果需要后续更丰富的重试策略，可在此基础上扩展
// 例如：拦截器中根据错误类型（网络超时、5xx）进行有限次数的重试
// Subscribe to config updates to keep services in sync
if (typeof window !== 'undefined') {
  eventBus.onApiConfigUpdated(({ baseUrl, apiKey }) => {
    const normalized = (baseUrl || '').trim();
    const key = (apiKey || '').trim();
    if (normalized) {
      // 直接同步到系统配置与 axios，避免递归调用 setBaseUrl
      apiConfig.baseUrl = normalized;
      systemService.setConfig({ baseUrl: normalized });
      axios.defaults.baseURL = normalized;
      try { (require('axios') as any).defaults.baseURL = normalized; } catch {}
      try { (window as any).__API_BASE_URL__ = normalized; } catch {}
    }
    if (key) {
      // 同步更新内存配置与本地存储，供请求拦截器读取
      systemService.setConfig({ apiKey: key } as any);
      try { safeLocalStorage.setItem('api_key', key); } catch {}
    }
  });
}