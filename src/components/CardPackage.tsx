import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { walletService } from '../services/api';

type NetItem = {
  id: 'btc' | 'eth' | 'bsc';
  name: string;
  mainSymbol: string;
  tokens: string[];
};

const NETWORKS: NetItem[] = [
  { id: 'btc', name: 'Bitcoin (Taproot)', mainSymbol: 'BTC', tokens: ['BTC'] },
  { id: 'eth', name: 'Ethereum', mainSymbol: 'ETH', tokens: ['ETH', 'USDT', 'USDC'] },
  { id: 'bsc', name: 'BSC', mainSymbol: 'BNB', tokens: ['BNB', 'BUSD', 'USDT'] },
];

const shorten = (s: string) => (s && s.length > 12 ? `${s.slice(0, 8)}...` : s);

function deriveAddress(walletName: string, net: 'btc' | 'eth' | 'bsc'): string {
  const base = `${walletName}:${net}`;
  // 简易稳定哈希：生成十六进制串（UI 展示用途）
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  if (net === 'btc') return `bc1p${hex}`;
  return `0x${hex}${hex}`;
}

interface Props {
  walletName: string | null;
}

const CardPackage: React.FC<Props> = ({ walletName }) => {
  const [mainBalances, setMainBalances] = useState<Record<string, number | null>>({});
  const [tokenBalances, setTokenBalances] = useState<Record<string, Record<string, number>>>({});

  const nets = useMemo(() => NETWORKS, []);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (!walletName) {
        setMainBalances({});
        setTokenBalances({});
        return;
      }
      const main: Record<string, number | null> = {};
      const tokensMap: Record<string, Record<string, number>> = {};
      for (const n of nets) {
        try {
          const res = await walletService.getBalance(walletName, n.id);
          const val = typeof res.balance === 'string' ? parseFloat(res.balance as any) : (res.balance as number);
          main[n.id] = Number.isFinite(val) ? val : null;
        } catch {
          main[n.id] = null;
        }
        try {
          const map = await walletService.getAssetBalances(walletName, { assets: n.tokens });
          tokensMap[n.id] = map || {};
        } catch {
          tokensMap[n.id] = {};
        }
      }
      if (!canceled) {
        setMainBalances(main);
        setTokenBalances(tokensMap);
      }
    };
    load();
    return () => { canceled = true; };
  }, [walletName, nets]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {nets.map((n) => (
          <Box key={n.id} sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{n.name}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              主资产：{(mainBalances[n.id] ?? 0).toFixed(4)} {n.mainSymbol}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              地址：{walletName ? shorten(deriveAddress(walletName, n.id)) : '—'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>代币资产组合：</Typography>
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              {n.tokens.map((t) => {
                const bal = tokenBalances[n.id]?.[t.toUpperCase()];
                return (
                  <Grid key={`${n.id}-${t}`} size={{ xs: 4, sm: 3, md: 2 }}>
                    <Box sx={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      p: 1,
                      textAlign: 'center'
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t}</Typography>
                      <Typography variant="caption">{Number.isFinite(bal) ? (bal as number).toFixed(2) : '0.00'}</Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

export default CardPackage;