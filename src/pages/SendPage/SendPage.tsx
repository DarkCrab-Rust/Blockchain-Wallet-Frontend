import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { walletService } from '../../services/api';
import { SendTransactionRequest, Wallet } from '../../types';
import { useWalletContext } from '../../context/WalletContext';
import MockModeBanner from '../../components/MockModeBanner';
import { getAvailableNetworks } from '../../utils/networks';
import { eventBus } from '../../utils/eventBus';

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
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const networks = getAvailableNetworks();

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const list = await walletService.listWallets();
        const listArray = Array.isArray(list) ? list : [];
        setWallets(listArray);
        // 选择优先：当前上下文钱包存在且在列表中，否则取列表首个，否则空
        const preferred = (currentWallet && listArray.some((w) => w.name === currentWallet))
          ? currentWallet
          : (listArray[0]?.name || '');
        setFromWallet(preferred);
      } catch (err) {
        eventBus.emitApiError({
          title: '获取钱包列表失败',
          message: (err as any)?.message || '无法获取钱包列表',
          category: 'network',
          endpoint: 'wallets.list',
          friendlyMessage: '无法获取钱包列表，功能受限',
          userAction: '请检查后端连接与 API 配置后重试',
        });
      }
    };
    fetchWallets();
  }, [currentWallet]);

  // 获取余额：钱包或网络变化时刷新（仅在钱包有效时）
  useEffect(() => {
    const loadBalance = async () => {
      const isValid = Array.isArray(wallets) && wallets.some((w) => w.name === fromWallet);
      if (!isValid || !currentNetwork) {
        setBalance(null);
        return;
      }
      setBalanceLoading(true);
      try {
        const res = await walletService.getBalance(fromWallet, currentNetwork);
        const val = typeof res.balance === 'string' ? parseFloat(res.balance as any) : (res.balance as number);
        setBalance(Number.isFinite(val) ? val : null);
      } catch (e) {
        setBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };
    loadBalance();
  }, [fromWallet, currentNetwork, wallets]);

  // 地址校验增强：支持 EVM 与 Solana
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  const isSolanaAddress = (addr: string) => !!addr && base58Regex.test(addr) && addr.length >= 32 && addr.length <= 44;
  const isEvmAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr || '');
  const isBtcTaprootAddress = (addr: string) => /^bc1p[0-9ac-hj-np-z]{38,62}$/i.test((addr || '').toLowerCase());

  // 基础校验
  const isEth = ['eth', 'ethereum', 'sepolia', 'polygon', 'bsc', 'arbitrum', 'optimism'].includes((currentNetwork || '').toLowerCase());
  const isSol = ['sol', 'solana'].includes((currentNetwork || '').toLowerCase());
  const isBtc = ['btc', 'bitcoin'].includes((currentNetwork || '').toLowerCase());
  const addressInvalid = !toAddress || (isEth && !isEvmAddress(toAddress)) || (isSol && !isSolanaAddress(toAddress)) || (isBtc && !isBtcTaprootAddress(toAddress));
  const amountNum = Number(amount);
  const amountInvalid = !amount || isNaN(amountNum) || amountNum <= 0;
  const exceedBalance = balance != null && !isNaN(amountNum) && amountNum > balance;
  const isWalletValid = Array.isArray(wallets) && wallets.some((w) => w.name === fromWallet);
  const formInvalid = addressInvalid || amountInvalid || exceedBalance || !isWalletValid;

  const performSend = async () => {
    if (loading || isSending) return;
    console.time('sendTransaction');
    setIsSending(true);
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: SendTransactionRequest = {
        to_address: toAddress,
        amount: parseFloat(amount),
        clientRequestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      const res = await walletService.sendTransaction(fromWallet, payload, currentNetwork);
      setSuccess(`交易已提交，哈希: ${res.tx_hash}`);
      try {
        const b = await walletService.getBalance(fromWallet, currentNetwork);
        const val = typeof b.balance === 'string' ? parseFloat(b.balance as any) : (b.balance as number);
        setBalance(Number.isFinite(val) ? val : null);
      } catch {}
    } catch (e: any) {
      setError(e?.message || '发送交易失败');
    } finally {
      setLoading(false);
      setIsSending(false);
      console.timeEnd('sendTransaction');
    }
  };

  const handleSend = () => {
    if (formInvalid) return;
    setConfirmOpen(true);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        发送交易
      </Typography>
      <MockModeBanner dense showSettingsLink message="Mock 后端已启用：数据为本地模拟" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Grid container spacing={3}>
        {/* 左列：选择钱包 + 余额 */}
        <Grid item xs={12} md={6}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              select
              fullWidth
              label="选择钱包"
              value={isWalletValid ? fromWallet : ''}
              onChange={(e) => setFromWallet(e.target.value)}
            >
              {(Array.isArray(wallets) ? wallets.length === 0 : true) ? (
                <MenuItem value="" disabled>暂无钱包</MenuItem>
              ) : (
                (Array.isArray(wallets) ? wallets : []).map((w) => (
                  <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
                ))
              )}
            </TextField>
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
          </Box>
        </Grid>

        {/* 右列：网络选择（与左侧并行） */}
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="网络"
            value={currentNetwork}
            onChange={(e) => setCurrentNetwork(e.target.value)}
          >
            {networks.map((n) => (
              <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* 表单：地址与金额 */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="接收地址"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            error={addressInvalid && !!toAddress}
            helperText={addressInvalid && !!toAddress ? (isSol ? '请输入有效的 Solana 地址（Base58，32–44位字符）' : isBtc ? '请输入有效的 Taproot 地址（以 bc1p 开头）' : '请输入有效的以太坊系地址（0x开头，40位十六进制）') : ' '}
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

        {/* 动作按钮 */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-start">
            <Button variant="contained" onClick={handleSend} disabled={loading || formInvalid}>
              {loading ? '发送中...' : '发送'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* 发送确认弹窗 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} aria-labelledby="send-confirm-title">
        <DialogTitle id="send-confirm-title">确认发送</DialogTitle>
        <DialogContent>
          <DialogContentText>
            请确认交易信息：
          </DialogContentText>
          <Typography variant="body2" sx={{ mt: 1 }}>来自钱包：{fromWallet || '-'}</Typography>
          <Typography variant="body2">网络：{currentNetwork || '-'}</Typography>
          <Typography variant="body2">接收地址：{toAddress || '-'}</Typography>
          <Typography variant="body2">金额：{amount || '-'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isSending || loading}>取消</Button>
          <Button onClick={() => { setConfirmOpen(false); performSend(); }} variant="contained" autoFocus disabled={isSending || loading}>
            确认发送
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SendPage;