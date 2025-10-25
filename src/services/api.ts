import axios, { AxiosInstance } from 'axios';
import { 
  Wallet, 
  CreateWalletRequest, 
  SendTransactionRequest, 
  TransactionResponse, 
  BridgeAssetsRequest, 
  BridgeResponse, 
  BalanceResponse, 
  TransactionHistoryResponse, 
  RestoreWalletRequest,
  MultiSigTransactionRequest
} from '../types';
import { safeLocalStorage } from '../utils/safeLocalStorage';

// 前端API基础配置
const API_BASE_URL = 'http://localhost:8888';
const API_KEY = process.env.REACT_APP_API_KEY || 'test_api_key';

// 新增：优先从本地读取已保存的 baseURL
const storedBaseUrl = typeof window !== 'undefined' ? safeLocalStorage.getItem('api_url') : null;
const resolvedBaseUrl = storedBaseUrl || process.env.REACT_APP_API_URL || API_BASE_URL;

// 创建axios实例（固定baseURL、默认头、超时）
const api: AxiosInstance = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Authorization': API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

// 请求拦截器：优先使用本地存储API Key（如有），否则使用默认值
api.interceptors.request.use((config) => {
  const storedKey = typeof window !== 'undefined' ? safeLocalStorage.getItem('api_key') : null;
  const auth = storedKey || API_KEY;
  config.headers = config.headers || {};
  config.headers['Authorization'] = auth;
  config.headers['Content-Type'] = 'application/json';
  return config;
});

// 新增：运行时更新与获取 baseURL 的方法
export const apiRuntime = {
  getBaseUrl: (): string => (api.defaults.baseURL as string) || '',
  setBaseUrl: (url?: string) => {
    if (url && url.trim()) {
      safeLocalStorage.setItem('api_url', url);
      api.defaults.baseURL = url;
    } else {
      safeLocalStorage.removeItem('api_url');
      api.defaults.baseURL = process.env.REACT_APP_API_URL || API_BASE_URL;
    }
  }
};

// 钱包相关API服务
export const walletService = {
  // 创建钱包
  createWallet: async (request: CreateWalletRequest): Promise<Wallet> => {
    const response = await api.post('/api/wallets', request);
    return response.data;
  },

  // 获取钱包列表
  listWallets: async (): Promise<Wallet[]> => {
    const response = await api.get('/api/wallets');
    return response.data;
  },

  // 获取钱包余额（加入网络参数，默认eth）
  getBalance: async (walletName: string, network: string = 'eth'): Promise<BalanceResponse> => {
    const response = await api.get(`/api/wallets/${walletName}/balance`, {
      params: { network },
    });
    return response.data;
  },

  // 发送交易（加入网络参数，默认eth）
  sendTransaction: async (walletName: string, request: SendTransactionRequest & { network?: string }): Promise<TransactionResponse> => {
    const body = { ...request, network: request.network ?? 'eth' };
    const response = await api.post(`/api/wallets/${walletName}/send`, body);
    return response.data;
  },

  // 发送多签交易
  sendMultiSigTransaction: async (walletName: string, request: MultiSigTransactionRequest): Promise<TransactionResponse> => {
    const response = await api.post(`/api/wallets/${walletName}/send_multi_sig`, request);
    return response.data;
  },

  // 获取交易历史（支持可选查询参数：network/limit/status/address）
  getTransactionHistory: async (walletName: string, params?: { network?: string; limit?: number; status?: string; address?: string }): Promise<TransactionHistoryResponse> => {
    const response = await api.get(`/api/wallets/${walletName}/history`, { params });
    return response.data;
  },

  // 备份钱包
  backupWallet: async (walletName: string): Promise<{ backup_data: string }> => {
    const response = await api.get(`/api/wallets/${walletName}/backup`);
    return response.data;
  },

  // 恢复钱包
  restoreWallet: async (request: RestoreWalletRequest): Promise<Wallet> => {
    const response = await api.post('/api/wallets/restore', request);
    return response.data;
  },

  // 轮换签名密钥
  rotateSigningKey: async (walletName: string): Promise<{ message: string }> => {
    const response = await api.post(`/api/wallets/${walletName}/rotate-signing-key`);
    return response.data;
  },

  // 删除钱包
  deleteWallet: async (walletName: string): Promise<void> => {
    await api.delete(`/api/wallets/${walletName}`);
  },

  // 跨链桥资产（保持现有接口，后端需带认证头）
  bridgeAssets: async (walletName: string, request: BridgeAssetsRequest): Promise<BridgeResponse> => {
    const response = await api.post(`/api/bridge`, {
      ...request,
      wallet_name: walletName
    });
    return response.data;
  }
};

// 健康检查和指标API
export const systemService = {
  // 健康检查
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await api.get('/api/health');
    return response.data;
  },

  // 获取系统指标
  getMetrics: async (): Promise<any> => {
    const response = await api.get('/api/metrics');
    return response.data;
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message =
      (data && (data.error || data.message)) ||
      (status ? `请求失败，状态码：${status}` : '网络错误');
    return Promise.reject(new Error(message));
  }
);
export default api;