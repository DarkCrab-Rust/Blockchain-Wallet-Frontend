import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { walletService } from '../../services/api';
import { Wallet } from '../../types';
import { useWalletContext } from '../../context/WalletContext';

// 将可用链常量移到组件外以避免依赖警告
const AVAILABLE_CHAINS = [
  { id: 'eth', name: '以太坊' },
  { id: 'bsc', name: '币安智能链' },
  { id: 'solana', name: 'Solana' },
  { id: 'polygon', name: 'Polygon' }
];

const BridgePage: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const { currentNetwork } = useWalletContext();
  const [sourceChain, setSourceChain] = useState<string>(currentNetwork);
  const [targetChain, setTargetChain] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingWallets, setFetchingWallets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentWallet } = useWalletContext();

  // 源链余额及加载态
  const [sourceBalance, setSourceBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // 获取钱包列表
  useEffect(() => {
    const fetchWallets = async () => {
      try {
        setFetchingWallets(true);
        const data = await walletService.listWallets();
        setWallets(data);
        if (currentWallet) {
          setSelectedWallet(currentWallet);
        } else if (data.length > 0) {
          setSelectedWallet(data[0].name);
        }
      } catch (err) {
        console.error('获取钱包列表失败:', err);
        setError('获取钱包列表失败，请检查API连接');
      } finally {
        setFetchingWallets(false);
      }
    };

    fetchWallets();
  }, [currentWallet]);

  // 同步源网络与全局网络设置
  useEffect(() => {
    setSourceChain(currentNetwork);
  }, [currentNetwork]);

  // 当选中的钱包或源链变化时拉取余额
  useEffect(() => {
    const loadBalance = async () => {
      if (!selectedWallet || !sourceChain) {
        setSourceBalance(null);
        return;
      }
      try {
        setBalanceLoading(true);
        const res = await walletService.getBalance(selectedWallet, sourceChain);
        const val = typeof res.balance === 'string' ? parseFloat(res.balance as any) : (res.balance as number);
        setSourceBalance(Number.isFinite(val) ? val : null);
      } catch (e) {
        setSourceBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };
    loadBalance();
  }, [selectedWallet, sourceChain]);

  // 发起跨链交易（加入性能计时）
  const handleBridgeAssets = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWallet) {
      setError('请选择钱包');
      return;
    }

    if (!sourceChain) {
      setError('请选择源网络');
      return;
    }

    if (!targetChain) {
      setError('请选择目标链');
      return;
    }

    if (sourceChain === targetChain) {
      setError('源网络和目标网络不能相同');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('请输入有效的金额');
      return;
    }

    // 余额校验
    if (sourceBalance != null && Number(amount) > sourceBalance) {
      setError('余额不足，无法发起跨链');
      return;
    }

    console.time('bridgeAssets');
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await walletService.bridgeAssets(selectedWallet, {
        source_chain: sourceChain,
        target_chain: targetChain,
        amount: parseFloat(amount)
      });

      setSuccess('跨链请求已提交，请等待处理！');
      setAmount('');
    } catch (err: any) {
      console.error('跨链请求失败:', err);
      setError(err.response?.data?.error || '跨链请求失败，请稍后再试');
    } finally {
      setLoading(false);
      console.timeEnd('bridgeAssets');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        跨链桥
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          {fetchingWallets ? (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress />
            </Box>
          ) : wallets.length === 0 ? (
            <Alert severity="info">没有可用的钱包，请先创建一个钱包</Alert>
          ) : (
            <form onSubmit={handleBridgeAssets}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>选择钱包</InputLabel>
                    <Select
                      value={selectedWallet}
                      onChange={(e) => setSelectedWallet(e.target.value)}
                      label="选择钱包"
                      required
                    >
                      {wallets.map((wallet) => (
                        <MenuItem key={wallet.id} value={wallet.name}>
                          {wallet.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>源网络</InputLabel>
                    <Select
                      value={sourceChain}
                      onChange={(e) => setSourceChain(e.target.value)}
                      label="源网络"
                      required
                    >
                      {AVAILABLE_CHAINS.map((chain) => (
                        <MenuItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>目标链</InputLabel>
                    <Select
                      value={targetChain}
                      onChange={(e) => setTargetChain(e.target.value)}
                      label="目标链"
                      required
                    >
                      {AVAILABLE_CHAINS.map((chain) => (
                        <MenuItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 源链余额展示 */}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">当前余额：</Typography>
                    {balanceLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Typography variant="body2" color={sourceBalance != null ? 'text.primary' : 'text.secondary'}>
                        {sourceBalance != null ? sourceBalance : '-'}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{sourceBalance != null ? '' : '（无法获取余额）'}</Typography>
                  {sourceChain && targetChain && sourceChain === targetChain && (
                    <Alert severity="warning" sx={{ mt: 1 }}>源网络与目标网络相同，请选择不同的网络</Alert>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="金额"
                    fullWidth
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    inputProps={{ min: 0, step: '0.000001' }}
                    placeholder="输入跨链金额"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading || sourceChain === targetChain}>
                    {loading ? <CircularProgress size={24} /> : '发起跨链'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BridgePage;