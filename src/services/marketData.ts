// 简易市场数据订阅服务：模拟 WebSocket，按交易对推送 mid、盘口与成交
import { safeLocalStorage } from '../utils/safeLocalStorage';

export type Side = 'buy' | 'sell';
export interface OrderBookLevel { price: number; size: number; }
export interface TradeItem { price: number; size: number; side: Side; time: number; }

export type MarketSnapshot = {
  symbol: string;
  mid: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  trade?: TradeItem;
};

type Unsubscribe = () => void;

function rnd(min: number, max: number, fixed = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(fixed));
}

function genBook(mid: number): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  const bids: OrderBookLevel[] = []; const asks: OrderBookLevel[] = [];
  for (let i = 0; i < 12; i++) bids.push({ price: Number((mid - i * rnd(0.5, 2)).toFixed(2)), size: rnd(0.001, 0.3, 3) });
  for (let i = 0; i < 12; i++) asks.push({ price: Number((mid + i * rnd(0.5, 2)).toFixed(2)), size: rnd(0.001, 0.3, 3) });
  return { bids, asks };
}

function basePriceFor(symbol: string): number {
  if (symbol.startsWith('BTC')) return 65000;
  if (symbol.startsWith('ETH')) return 3500;
  return 1;
}

export function subscribeMarket(symbol: string, onData: (snap: MarketSnapshot) => void): Unsubscribe {
  // 允许从本地存储提示更新频率（毫秒），默认 1500ms
  let intervalMs = 1500;
  try {
    const raw = safeLocalStorage.getItem('market.intervalMs');
    if (raw) {
      const n = Number(raw); if (Number.isFinite(n) && n > 300) intervalMs = n;
    }
  } catch {}

  let mid = basePriceFor(symbol);
  const timer = window.setInterval(() => {
    mid = Number((mid + rnd(-30, 30, 2)).toFixed(2));
    const { bids, asks } = genBook(mid);
    const trade: TradeItem = { price: Number((mid + rnd(-5, 5, 2)).toFixed(2)), size: rnd(0.001, 0.2, 3), side: (Math.random() > 0.5 ? 'buy' : 'sell'), time: Date.now() };
    onData({ symbol, mid, bids, asks, trade });
  }, intervalMs);

  return () => { clearInterval(timer); };
}