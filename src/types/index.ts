// 通用类型定义，前端与页面使用保持一致

export interface Wallet {
  id: string;
  name: string;
  quantum_safe: boolean;
}

export interface CreateWalletRequest {
  name: string;
  quantum_safe?: boolean;
}

export interface SendTransactionRequest {
  to_address: string;
  amount: number;
  fee?: number;
  clientRequestId?: string;
}

export interface Transaction {
  id: string;
  timestamp: number; // Unix 时间戳（秒）
  from_address: string;
  to_address: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | string;
}

export interface TransactionResponse {
  tx_hash: string;
  status: string;
}

export interface BridgeAssetsRequest {
  source_chain?: string;
  target_chain: string;
  amount: number;
  fee?: number;
}

export interface BridgeResponse {
  bridge_id: string;
  status: string;
  target_chain: string;
  amount: number;
}

export interface BalanceResponse {
  balance: number;
  currency?: string;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
}

export interface RestoreWalletRequest {
  name: string;
  backup_data: string;
}

export interface MultiSigTransactionRequest {
  to_address: string;
  amount: number;
  signers: string[];
  threshold: number;
}

export interface ErrorResponse {
  code: string;
  error: string;
}

export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
};

// 追加：系统与API配置类型
export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface SystemInfo {
  version: string;
}