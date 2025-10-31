// 多链行情叠加与AI预测服务（前端模拟）
import { safeLocalStorage } from '../utils/safeLocalStorage';

export interface OverlayPoint { t: number; price: number; chain: string; }
export interface OverlaySnapshot {
  symbol: string;
  points: OverlayPoint[]; // 最新窗口的各链价格点
  aiPrediction?: { t: number; price: number }[]; // 预测曲线（未来短期）
}

type Unsubscribe = () => void;

function basePrice(symbol: string): number {
  if (symbol.startsWith('BTC')) return 65000;
  if (symbol.startsWith('ETH')) return 3500;
  return 1;
}

function randomDelta(scale = 1) {
  return (Math.random() - 0.5) * 2 * scale;
}

function smoothPredict(series: number[], steps = 20) {
  // 简单的指数平滑/线性外推（演示用）
  if (series.length < 3) return [];
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const drift = last - prev; // 简单漂移
  const out: { t: number; price: number }[] = [];
  const now = Date.now();
  for (let i = 1; i <= steps; i++) {
    const t = now + i * 1000;
    const p = last + drift * i * 0.3; // 衰减系数防止过度外推
    out.push({ t, price: Number(p.toFixed(2)) });
  }
  return out;
}

export function subscribeMultiChain(symbol: string, chains: string[], onData: (snap: OverlaySnapshot) => void): Unsubscribe {
  let intervalMs = 1500;
  try {
    const raw = safeLocalStorage.getItem('market.intervalMs');
    if (raw) { const n = Number(raw); if (Number.isFinite(n) && n > 300) intervalMs = n; }
  } catch {}

  const base = basePrice(symbol);
  const lastByChain: Record<string, number[]> = {};
  chains.forEach((c) => { lastByChain[c] = []; });

  const timer = window.setInterval(() => {
    const now = Date.now();
    const points: OverlayPoint[] = chains.map((c) => {
      // 为不同链设置轻微偏移与波动差异
      const bias = c === 'eth' ? 0 : c === 'bsc' ? -5 : 0;
      const vol = c === 'bsc' ? 25 : 18;
      const p = Number((base + bias + randomDelta(vol)).toFixed(2));
      lastByChain[c].push(p);
      // 仅保留最近 N 点
      if (lastByChain[c].length > 120) lastByChain[c].shift();
      return { t: now, price: p, chain: c };
    });
    // 以主链（第一条）生成预测
    const primary = chains[0];
    const predict = smoothPredict(lastByChain[primary], 24);
    onData({ symbol, points, aiPrediction: predict });
  }, intervalMs);

  return () => { clearInterval(timer); };
}