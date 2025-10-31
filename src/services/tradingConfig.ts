import { safeLocalStorage } from '../utils/safeLocalStorage';

export interface PairTradingConfig {
  feeRateBps: number; // 手续费，基点（bps），100 = 1%
  slippageBps: number; // 预计滑点，基点（bps）
  minOrderQty: number; // 最小下单量（基础币）
  priceTick: number; // 最小价格刻度
}

export interface TradingConfigStore {
  [key: string]: PairTradingConfig; // key: `${network||'default'}::${symbol}`
}

const KEY = 'trading_config_store';

function readStore(): TradingConfigStore {
  try {
    const raw = safeLocalStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TradingConfigStore) : {};
  } catch { return {}; }
}
function writeStore(store: TradingConfigStore) {
  try { safeLocalStorage.setItem(KEY, JSON.stringify(store)); } catch {}
}

export function getPairConfig(symbol: string, network?: string): PairTradingConfig {
  const store = readStore();
  const key = `${(network || 'default').toLowerCase()}::${symbol.toUpperCase()}`;
  const fallback: PairTradingConfig = inferDefaultConfig(symbol, network);
  return store[key] || fallback;
}

export function setPairConfig(symbol: string, cfg: Partial<PairTradingConfig>, network?: string) {
  const store = readStore();
  const key = `${(network || 'default').toLowerCase()}::${symbol.toUpperCase()}`;
  const cur = store[key] || inferDefaultConfig(symbol, network);
  const next: PairTradingConfig = {
    feeRateBps: cfg.feeRateBps ?? cur.feeRateBps,
    slippageBps: cfg.slippageBps ?? cur.slippageBps,
    minOrderQty: cfg.minOrderQty ?? cur.minOrderQty,
    priceTick: cfg.priceTick ?? cur.priceTick,
  };
  store[key] = next;
  writeStore(store);
}

export function inferDefaultConfig(symbol: string, network?: string): PairTradingConfig {
  const s = symbol.toUpperCase();
  const isBtc = s.includes('BTC');
  const isEth = s.includes('ETH');
  const priceTick = isBtc ? 0.5 : (isEth ? 0.05 : 0.001);
  const minOrderQty = isBtc ? 0.0001 : (isEth ? 0.001 : 1);
  const feeBase = network?.toLowerCase() === 'bsc' ? 8 : 10; // bsc 略低
  const slipBase = 50; // 默认0.5%
  return { feeRateBps: feeBase, slippageBps: slipBase, minOrderQty, priceTick };
}