import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert } from '@mui/material';
import { Box as MuiBox } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useWalletContext } from '../../context/WalletContext';
import { walletService, swapService } from '../../services/api';

const formatUsd = (v: number | null, locale?: string) => {
  if (v == null || !Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `$${(v as number).toFixed(2)}`;
  }
};

const AssetDetailPage: React.FC = () => {
  const { symbol: paramSymbol } = useParams();
  const navigate = useNavigate();
  const { currentWallet, currentNetwork } = useWalletContext();
  const symbol = useMemo(() => (paramSymbol || 'ETH').toUpperCase(), [paramSymbol]);
  const [qty, setQty] = useState<number | null>(null);
  const [usd, setUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!currentWallet) {
          setError('请先选择或创建卡包');
          return;
        }
        let amount = 0;
        try {
          // ETH 主资产优先使用总览余额；其他资产使用多资产余额接口
          if (symbol === 'ETH') {
            const res = await walletService.getBalance(currentWallet, currentNetwork);
            const val = typeof res.balance === 'string' ? parseFloat(res.balance as any) : (res.balance as number);
            amount = Number.isFinite(val) ? val : 0;
          } else {
            const map = await walletService.getAssetBalances(currentWallet, { assets: [symbol] });
            amount = Number.isFinite(map[symbol]) ? map[symbol] : 0;
          }
        } catch {
          amount = 0;
        }
        setQty(amount);

        // 使用内置 swap 报价近似 USD（USDT≈USD）
        try {
          const q = await swapService.quote({ from: symbol, to: 'USDT', amount: 1, network: currentNetwork });
          const rate = Number.isFinite(q.rate) ? q.rate : 0;
          setUsd(Number.isFinite(rate) ? amount * rate : 0);
        } catch {
          setUsd(null);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [currentWallet, currentNetwork, symbol]);

  const qtyText = useMemo(() => {
    const n = Number.isFinite(qty as number) ? (qty as number) : 0;
    return `${n.toFixed(2)} ${symbol}`;
  }, [qty, symbol]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h4">{symbol} 资产详情</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)}>返回</Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      <Card>
        <CardContent>
          <MuiBox>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>总持仓</Typography>
              {/* Coinbase 风格：主显数量，次显法币近似 */}
              <Typography variant="h3" sx={{ fontWeight: 700 }} aria-label="total-holdings-primary">
                {loading ? '— —' : qtyText}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }} aria-label="total-holdings-secondary">
                {loading ? '≈ —' : `≈ ${formatUsd(usd)}`}
              </Typography>
          </MuiBox>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AssetDetailPage;