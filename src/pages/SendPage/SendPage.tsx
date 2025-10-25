import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography, Alert, CircularProgress } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { walletService } from '../../services/api';
import { SendTransactionRequest, Wallet } from '../../types';
import { useWalletContext } from '../../context/WalletContext';

const SendPage: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [fromWallet, setFromWallet] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentWallet, currentNetwork, setCurrentNetwork } = useWalletContext();
  // 余额相关
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const list = await walletService.listWallets();
        setWallets(list);
        // 默认使用全局选择钱包
        if (currentWallet) {
          setFromWallet(currentWallet);
        } else if (list.length > 0) {
          setFromWallet(list[0].name);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWallets();
  }, [currentWallet]);

  // 获取余额：钱包或网络变化时刷新
  useEffect(() => {
    const loadBalance = async () => {
      if (!fromWallet || !currentNetwork) {
        setBalance(null);
        return;
      }
      setBalanceLoading(true);
      try {
        const res = await walletService.getBalance(fromWallet, currentNetwork);
        // 兼容字符串/数字
        const val = typeof res.balance === 'string' ? parseFloat(res.balance as any) : (res.balance as number);
        setBalance(Number.isFinite(val) ? val : null);
      } catch (e) {
        setBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };
    loadBalance();
  }, [fromWallet, currentNetwork]);

  // 基础校验
  const isEth = currentNetwork === 'eth' || currentNetwork === 'ethereum' || currentNetwork === 'sepolia';
  const addressInvalid = !toAddress || (isEth && !/^0x[a-fA-F0-9]{40}$/.test(toAddress));
  const amountNum = Number(amount);
  const amountInvalid = !amount || isNaN(amountNum) || amountNum <= 0;
  const exceedBalance = balance != null && !isNaN(amountNum) && amountNum > balance;
  const formInvalid = addressInvalid || amountInvalid || exceedBalance || !fromWallet;

  const handleSend = async () => {
    if (formInvalid) return;
    console.time('sendTransaction');
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: SendTransactionRequest = {
        to_address: toAddress,
        amount: parseFloat(amount),
      };
      // 传入网络参数
      const res = await walletService.sendTransaction(fromWallet, { ...payload, network: currentNetwork });
      setSuccess(`交易已提交，哈希: ${res.tx_hash}`);
      // 成功后可刷新余额
      try {
        const b = await walletService.getBalance(fromWallet, currentNetwork);
        const val = typeof b.balance === 'string' ? parseFloat(b.balance as any) : (b.balance as number);
        setBalance(Number.isFinite(val) ? val : null);
      } catch {}
    } catch (e: any) {
      setError(e?.message || '发送交易失败');
    } finally {
      setLoading(false);
      console.timeEnd('sendTransaction');
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        发送交易
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="选择钱包"
            value={fromWallet}
            onChange={(e) => setFromWallet(e.target.value)}
          >
            {wallets.map((w) => (
              <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
            <Typography variant="h4">转账</Typography>
            <TextField
              select
              fullWidth
              label="网络"
              value={currentNetwork}
              onChange={(e) => setCurrentNetwork(e.target.value)}
            >
              <MenuItem value="eth">Ethereum</MenuItem>
              <MenuItem value="solana">Solana</MenuItem>
              <MenuItem value="polygon">Polygon</MenuItem>
              <MenuItem value="bsc">BSC</MenuItem>
            </TextField>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              当前余额：
            </Typography>
            {balanceLoading ? (
              <CircularProgress size={16} />
            ) : (
              <Typography variant="body2" color={balance != null ? 'text.primary' : 'text.secondary'}>
                {balance != null ? balance : '-'}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {balance != null ? '' : '（无法获取余额）'}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="接收地址"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            error={addressInvalid && !!toAddress}
            helperText={addressInvalid && !!toAddress ? (isEth ? '请输入有效的以太坊地址（0x开头，40位十六进制）' : '请输入有效地址') : ' '}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="金额"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputProps={{ min: 0, step: '0.000001' }}
            error={(amountInvalid && !!amount) || exceedBalance}
            helperText={
              exceedBalance ? '金额超过可用余额' : (amountInvalid && !!amount ? '请输入大于0的有效数字' : ' ')
            }
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={handleSend} disabled={loading || formInvalid}>
            {loading ? '发送中...' : '发送'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SendPage;