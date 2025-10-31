import React, { useEffect, useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import Grid from '@mui/material/Grid';
import { walletService } from '../../services/api';
import { withTtlCache } from '../../utils/ttlCache';
import { riskAssess } from '../../services/risk';
import { useAnomalyEvents } from '../../hooks/useAnomalyEvents';
import { getThreatColor } from '../../utils/threatColors';
import { SendTransactionRequest, Wallet } from '../../types';
import { useWalletContext } from '../../context/WalletContext';
import MockModeBanner from '../../components/MockModeBanner';
import { getAvailableNetworks } from '../../utils/networks';
import { eventBus } from '../../utils/eventBus';
import { safeLocalStorage } from '../../utils/safeLocalStorage';

const SendPage: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [fromWallet, setFromWallet] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentWallet, currentNetwork, setCurrentNetwork } = useWalletContext();
  // 余额相关
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [riskWarning, setRiskWarning] = useState<string | null>(null);
  const [riskChecking, setRiskChecking] = useState<boolean>(false);
  const [threatLevel, setThreatLevel] = useState<string | null>(null);
  const [riskPolicy, setRiskPolicy] = useState<any>(null);
  const networks = getAvailableNetworks();

  // 接入后端 AI 模块的实时异常事件（WebSocket）
  const anomalyWsUrl = (() => {
    const raw = process.env.REACT_APP_ANOMALY_WS_URL || '';
    try {
      const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
      const base = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost';
      // 若未提供原始地址，按环境生成安全默认
      if (!raw || !raw.trim()) {
        if (!isProd) return 'ws://localhost:8888/api/anomaly-detection/events';
        const host = (typeof window !== 'undefined' && window.location ? window.location.host : 'localhost');
        return `wss://${host}/api/anomaly-detection/events`;
      }
      const u = new URL(raw, base);
      const needsSecure = isProd || (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1');
      const protocol = (u.protocol === 'ws:' && needsSecure) ? 'wss:' : u.protocol;
      return `${protocol}//${u.host}${u.pathname}${u.search}`;
    } catch {
      return raw.replace(/^ws:\/\//i, 'wss://');
    }
  })();
  const { connected, lastEvent } = useAnomalyEvents({
    url: anomalyWsUrl,
    onTransactionBlocked: (evt) => {
      setRiskWarning(evt.message || '交易已拦截');
      setThreatLevel((evt as any)?.threatLevel || null);
      setConfirmOpen(true);
    },
    onWarningIssued: (evt) => {
      setRiskWarning(evt.message || '检测警告');
      setThreatLevel((evt as any)?.threatLevel || null);
      setConfirmOpen(true);
    },
    onDetectionCompleted: () => {
      // 检测完成事件仅用于提示，不改变发送流程
    },
  });

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

  // 加载风险策略
  useEffect(() => {
    const raw = safeLocalStorage.getItem('risk.policy');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setRiskPolicy(parsed);
      } catch {}
    }
  }, []);

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
        const res = await withTtlCache(
  `balance|${fromWallet}|${currentNetwork}`,
  10000,
  async () => walletService.getBalance(fromWallet, currentNetwork)
);
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

  // 地址校验增强：支持 EVM 与 BTC Taproot
  const isEvmAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr || '');
  const isBtcTaprootAddress = (addr: string) => /^bc1p[0-9ac-hj-np-z]{38,62}$/i.test((addr || '').toLowerCase());

  // 基础校验
  const isEth = ['eth', 'ethereum', 'sepolia', 'polygon', 'bsc', 'arbitrum', 'optimism'].includes((currentNetwork || '').toLowerCase());
  const isBtc = ['btc', 'bitcoin'].includes((currentNetwork || '').toLowerCase());
  // 根据输入前缀给出更友好的错误提示（不完全依赖当前网络选择）
  const hintIsEvm = (toAddress || '').trim().startsWith('0x');
  // 放宽校验：如果输入看起来是 EVM 地址，则按 EVM 校验；否则按当前网络校验
  const addressInvalid = !toAddress
    || ((isEth || hintIsEvm) && !isEvmAddress(toAddress))
    || ((isBtc && !hintIsEvm) && !isBtcTaprootAddress(toAddress));
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
      const genRequestId = () => {
        try {
          if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
            return (crypto as any).randomUUID();
          }
        } catch {}
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      };
      const payload: SendTransactionRequest = {
        to_address: toAddress,
        amount: parseFloat(amount),
        clientRequestId: genRequestId(),
        ...(password ? { password } : {}),
      };
      const res = await walletService.sendTransaction(fromWallet, payload, currentNetwork);
      setSuccess(`交易已提交，哈希: ${res.tx_hash}`);
      try {
        const b = await walletService.getBalance(fromWallet, currentNetwork);
        const val = typeof b.balance === 'string' ? parseFloat(b.balance as any) : (b.balance as number);
        setBalance(Number.isFinite(val) ? val : null);
      } catch {}
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || '发送交易失败';
      setError(msg);
    } finally {
      setLoading(false);
      setIsSending(false);
      console.timeEnd('sendTransaction');
    }
  };

  const handleSend = () => {
    if (formInvalid) return;
    setRiskWarning(null);
    setConfirmOpen(true);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        发送交易
      </Typography>
      <MockModeBanner dense message="Mock 后端已启用：数据为本地模拟" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Grid container spacing={3}>
        {/* 左列：选择钱包 + 余额 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              select
              fullWidth
              label="选择卡包"
              value={isWalletValid ? fromWallet : ''}
              onChange={(e) => setFromWallet(e.target.value)}
              inputProps={{ 'aria-label': '选择钱包' }}
            >
              {(Array.isArray(wallets) ? wallets.length === 0 : true) ? (
                <MenuItem value="" disabled>暂无卡包</MenuItem>
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
            <TextField
              fullWidth
              label="卡包密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="部分后端需要卡包密码用于交易签名（可选）"
            />
          </Box>
        </Grid>

        {/* 右列：网络选择（与左侧并行） */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            fullWidth
            label="网络"
            value={currentNetwork}
            onChange={(e) => setCurrentNetwork(e.target.value)}
            inputProps={{ 'aria-label': '网络' }}
          >
            {networks.map((n) => (
              <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* 表单：地址与金额 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="接收地址"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            error={addressInvalid && !!toAddress}
            helperText={
              addressInvalid && !!toAddress
                ? (hintIsEvm
                    ? '请输入有效的以太坊系地址（0x开头，40位十六进制）'
                    : (isBtc ? '请输入有效的 Taproot 地址（以 bc1p 开头）' : '请输入有效的以太坊系地址（0x开头，40位十六进制）'))
                : ' '
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="金额"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputProps={{ min: 0, step: '0.000001', 'aria-label': '金额' }}
            error={(amountInvalid && !!amount) || exceedBalance}
            helperText={
              exceedBalance ? '金额超过可用余额' : (amountInvalid && !!amount ? '请输入大于0的有效数字' : ' ')
            }
          />
        </Grid>

        {/* 动作按钮 */}
        <Grid size={{ xs: 12 }}>
          <Box display="flex" justifyContent="flex-start">
            <Button 
              variant="contained" 
              onClick={handleSend} 
              disabled={loading || formInvalid}
            >
              {loading ? '发送中...' : '发送'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* 发送确认弹窗 */}
  <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} aria-labelledby="send-confirm-title">
        <DialogTitle id="send-confirm-title">确认发送</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ mb: 1 }} color={connected ? 'success.main' : 'warning.main'}>
            事件流连接：{connected ? '已连接' : '未连接'}
          </Typography>
          <DialogContentText>
            请确认交易信息：
          </DialogContentText>
          {riskWarning && (
            <Alert severity="error" sx={{ mt: 2, borderLeft: '4px solid', borderColor: getThreatColor(threatLevel || (lastEvent as any)?.threatLevel) }}>
              {riskWarning}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mt: 1 }}>来自钱包：{fromWallet || '-'}</Typography>
          <Typography variant="body2">网络：{currentNetwork || '-'}</Typography>
          <Typography variant="body2">接收地址：{toAddress || '-'}</Typography>
          <Typography variant="body2">金额：{amount || '-'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isSending || loading}>取消</Button>
          <Button
            onClick={async () => {
              if (riskChecking) return;
              setRiskChecking(true);
              try {
                const res = await riskAssess({ 
                  from_wallet: fromWallet, 
                  to_address: toAddress, 
                  amount: parseFloat(amount), 
                  network: currentNetwork,
                  config: riskPolicy || undefined,
                });
                setThreatLevel(res?.threatLevel || null);
                if (res?.message) {
                  setRiskWarning(res.message);
                }
                const level = (res?.threatLevel || '').toLowerCase();
                const blockLevels = Array.isArray(riskPolicy?.blockLevels) && riskPolicy.blockLevels.length > 0
                  ? riskPolicy.blockLevels.map((x: string) => x.toLowerCase())
                  : ['high', 'critical'];
                const isSevere = blockLevels.includes(level);
                const allowOverride = Boolean(riskPolicy?.allowOverrideSend);
                if (res?.isFraud || isSevere) {
                  // 高危或后端判定拦截：根据策略决定是否允许继续
                  if (!allowOverride) return;
                }
                setConfirmOpen(false);
                performSend();
              } finally {
                setRiskChecking(false);
              }
            }}
            variant="contained"
            autoFocus
            disabled={isSending || loading || riskChecking}>
            确认发送
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SendPage;