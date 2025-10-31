export type Chain = 'ethereum' | 'bsc' | 'solana';

export interface QuoteRequest {
  chain: Chain;
  from: string; // symbol, e.g. ETH
  to: string;   // symbol, e.g. USDT
  amount: number; // in from token units
  slippagePct: number; // 0.5 means 0.5%
}

export interface QuoteResponse {
  outAmount: number;
  priceImpactPct: number;
  route: string;
  estimatedFeeInFrom: number;
}

const RATE_TABLE: Record<string, number> = {
  'ETH/USDT': 3500,
  'BTC/USDT': 65000,
  'SOL/USDT': 180,
  'BNB/USDT': 520,
  'USDT/ETH': 1 / 3500,
  'USDT/BTC': 1 / 65000,
  'USDT/SOL': 1 / 180,
  'USDT/BNB': 1 / 520,
};

export async function getQuote(req: QuoteRequest): Promise<QuoteResponse> {
  const key = `${req.from}/${req.to}`.toUpperCase();
  const rate = RATE_TABLE[key] ?? 1;
  // Simple mock: apply small synthetic price impact based on amount
  const impact = Math.min(2, Math.max(0.05, Math.log10(Math.max(1, req.amount)) * 0.15));
  const priceImpactPct = impact; // 0.05% ~ 2%
  const effectiveRate = rate * (1 - priceImpactPct / 100);
  const outAmount = req.amount * effectiveRate;
  const estimatedFeeInFrom = Math.max(0.0005, req.amount * 0.001);
  const route = `MockRoute(${req.chain}): ${req.from}→${req.to}`;
  // simulate network latency
  await new Promise((r) => setTimeout(r, 300));
  return { outAmount, priceImpactPct, route, estimatedFeeInFrom };
}

export async function executeSwap(req: QuoteRequest): Promise<{ txId: string }>{
  // simulate signing & broadcasting
  await new Promise((r) => setTimeout(r, 600));
  return { txId: `mock_${Date.now().toString(36)}` };
}