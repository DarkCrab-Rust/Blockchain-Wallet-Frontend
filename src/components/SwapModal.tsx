import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, TextField, MenuItem, Select, InputLabel, FormControl, Slider, Alert } from '@mui/material';
import { getQuote, executeSwap, Chain } from '../services/aggregators/mockAggregator';

interface Props {
  open: boolean;
  onClose: () => void;
  initialFrom?: string; // 兼容 WalletPage 传入的初始支付币种
}

const CHAINS: Chain[] = ['ethereum', 'bsc', 'solana'];
const TOKENS = ['BTC', 'ETH', 'USDT', 'SOL', 'BNB'];

const SwapModal: React.FC<Props> = ({ open, onClose, initialFrom }) => {
  const [chain, setChain] = useState<Chain>('ethereum');
  const [from, setFrom] = useState<string>(initialFrom || 'ETH');
  const [to, setTo] = useState<string>('USDT');
  const [amount, setAmount] = useState<string>('0.1');
  const [slippagePct, setSlippagePct] = useState<number>(0.5);
  const [quote, setQuote] = useState<null | { outAmount: number; priceImpactPct: number; route: string; fee: number }>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');

  const valid = useMemo(() => {
    const a = Number(amount);
    return Number.isFinite(a) && a > 0 && from !== to;
  }, [amount, from, to]);

  // 同步外部传入的初始支付币种
  useEffect(() => {
    if (initialFrom) setFrom(initialFrom);
  }, [initialFrom]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getQuote({ chain, from, to, amount: Number(amount) || 0, slippagePct });
        if (!alive) return;
        setQuote({ outAmount: res.outAmount, priceImpactPct: res.priceImpactPct, route: res.route, fee: res.estimatedFeeInFrom });
      } catch (e) {
        if (!alive) return;
        setError('获取报价失败，请稍后重试');
        setQuote(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (valid) load(); else setQuote(null);
    return () => { alive = false; };
  }, [chain, from, to, amount, slippagePct, valid]);

  const onSubmit = async () => {
    if (!valid || !quote) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await executeSwap({ chain, from, to, amount: Number(amount), slippagePct });
      setSuccess(`Swap 完成，交易ID：${res.txId}`);
    } catch (e) {
      setError('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const body = (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel id="chain-label">链</InputLabel>
        <Select labelId="chain-label" label="链" value={chain} onChange={(e) => setChain(e.target.value as Chain)}>
          {CHAINS.map((c) => (<MenuItem key={c} value={c}>{c}</MenuItem>))}
        </Select>
      </FormControl>
      <Box />
      <FormControl fullWidth>
        <InputLabel id="from-label">支付</InputLabel>
        <Select labelId="from-label" label="支付" value={from} onChange={(e) => setFrom(e.target.value)}>
          {TOKENS.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
        </Select>
      </FormControl>
      <TextField fullWidth label="数量" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
      <FormControl fullWidth>
        <InputLabel id="to-label">得到</InputLabel>
        <Select labelId="to-label" label="得到" value={to} onChange={(e) => setTo(e.target.value)}>
          {TOKENS.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
        </Select>
      </FormControl>
      <Box>
        <Typography variant="caption" color="text.secondary">滑点容忍度（%）</Typography>
        <Slider value={slippagePct} onChange={(_, v) => setSlippagePct(v as number)} step={0.1} min={0.1} max={5} valueLabelDisplay="auto" />
      </Box>
      <Box sx={{ gridColumn: '1 / -1' }}>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }}>{success}</Alert>}
        <Typography variant="subtitle2" gutterBottom>报价预览</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">路由</Typography>
          <Typography variant="body2">{quote?.route || '-'}</Typography>
          <Typography variant="body2" color="text.secondary">预估得到</Typography>
          <Typography variant="body2">{quote ? `${quote.outAmount.toFixed(6)} ${to}` : '-'}</Typography>
          <Typography variant="body2" color="text.secondary">价格影响</Typography>
          <Typography variant="body2">{quote ? `${quote.priceImpactPct.toFixed(2)}%` : '-'}</Typography>
          <Typography variant="body2" color="text.secondary">预估手续费</Typography>
          <Typography variant="body2">{quote ? `${quote.fee.toFixed(6)} ${from}` : '-'}</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>一键 Swap</DialogTitle>
      <DialogContent>
        {body}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>取消</Button>
        <Button variant="contained" onClick={onSubmit} disabled={!valid || !quote || submitting || loading}>确认Swap</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SwapModal;