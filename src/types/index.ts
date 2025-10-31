// 通用类型定义，前端与页面使用保持一致

export interface Wallet {
  id: string;
  name: string;
  quantum_safe: boolean;
}

export interface CreateWalletRequest {
  name: string;
  quantum_safe?: boolean;
  password?: string;
  generate_mnemonic?: boolean;
}

export interface SendTransactionRequest {
  to_address: string;
  amount: number;
  fee?: number;
  clientRequestId?: string;
  password?: string;
}

export interface Transaction {
  id: string;
  timestamp: number; // Unix 时间戳（秒）
  from_address: string;
  to_address: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | string;
  // 新增字段：对齐后端返回
  network?: string; // 统一小写枚举（如 mainnet/testnet 或具体链）
  fee?: number; // 网络费用（单位与后端一致）
  confirmations?: number; // 区块确认数
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
  // 对齐后端桥接请求：可选传入 token（资产符号）
  token?: string;
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

// 交换相关类型
export interface SwapQuote {
  from: string;
  to: string;
  amount: number;
  rate: number; // to per from
  estimatedOutput: number;
  slippageBps?: number; // basis points
  networkFee?: number; // in from token units or fiat-equivalent
}

export interface SwapExecuteRequest {
  from: string;
  to: string;
  amount: number;
  network?: string;
  unsignedTx?: any; // backend may return unsigned tx details
  signedTx?: string; // hex-encoded signed payload
}

export interface SwapExecuteResponse {
  tx_hash?: string;
  status: 'prepared' | 'submitted' | 'failed';
  unsignedTx?: any;
}