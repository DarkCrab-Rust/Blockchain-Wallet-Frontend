import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import { walletService } from '../../services/api';
import { Wallet } from '../../types';
import { useWalletContext } from '../../context/WalletContext';
import { getAvailableNetworks } from '../../utils/networks';
import MockModeBanner from '../../components/MockModeBanner';
import { eventBus } from '../../utils/eventBus';

// 基于源网络的常见资产列表（示例，便于与市场标准对齐）
const ASSETS_BY_CHAIN: Record<string, string[]> = {
  eth: ['ETH', 'USDT', 'USDC', 'WBTC'],
  polygon: ['MATIC', 'USDT', 'USDC', 'WBTC'],
  bsc: ['BNB', 'USDT', 'USDC', 'BTCB'],
  btc: ['BTC'],
};


const BridgePage: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const { currentNetwork } = useWalletContext();
  const [sourceChain, setSourceChain] = useState<string>(currentNetwork);
  const [targetChain, setTargetChain] = useState('');
  const [amount, setAmount] = useState('');
  // 新增：资产/代币、目标地址、路由提供商
  const [asset, setAsset] = useState<string>('');
  const [destAddress, setDestAddress] = useState<string>('');
  const [routeProvider, setRouteProvider] = useState<string>('auto');
  const [loading, setLoading] = useState(false);
  const [fetchingWallets, setFetchingWallets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentWallet } = useWalletContext();

  // 源链余额及加载态
  const [sourceBalance, setSourceBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const networks = getAvailableNetworks().map((n) => ({ id: n.id, name: n.name }));

  // 桥接历史状态
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const hasPending = useMemo(() => historyItems.some((it) => ['initiated', 'pending'].includes(String(it.status || '').toLowerCase())), [historyItems]);


  // 源网络变化时设置默认资产
  useEffect(() => {
    const list = ASSETS_BY_CHAIN[sourceChain] || [];
    setAsset((prev) => (list.includes(prev) ? prev : (list[0] || '')));
  }, [sourceChain]);

  // 获取钱包列表
  useEffect(() => {
    const fetchWallets = async () => {
      try {
        setFetchingWallets(true);
        const data = await walletService.listWallets();
        const list = Array.isArray(data) ? data : [];
        setWallets(list);
        if (currentWallet) {
          setSelectedWallet(currentWallet);
        } else if (list.length > 0) {
          setSelectedWallet(list[0].name);
        }
      } catch (err) {
        eventBus.emitApiError({
          title: '获取钱包列表失败',
          message: (err as any)?.message || '获取钱包列表失败，请检查API连接',
          category: 'network',
          endpoint: 'wallets.list',
          friendlyMessage: '获取钱包列表失败，请检查API连接',
          userAction: '请启动后端或检查设置中的 API 配置',
        });
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
        amount: parseFloat(amount),
        token: asset || undefined,
      });

      setSuccess('跨链请求已提交，请等待处理！');
      setAmount('');
      // 触发刷新历史
      fetchBridgeHistory();
    } catch (err: any) {
      eventBus.emitApiError({
        title: '跨链请求失败',
        message: err?.message || '跨链请求失败',
        category: 'http_4xx',
        endpoint: 'bridge.assets',
        friendlyMessage: err?.response?.data?.error || '跨链请求失败，请稍后再试',
        userAction: '请检查余额与网络选择是否正确后重试',
        errorContext: err,
      });
      setError(err.response?.data?.error || '跨链请求失败，请稍后再试');
    } finally {
      setLoading(false);
      console.timeEnd('bridgeAssets');
    }
  };

  // 拉取桥接历史
  const fetchBridgeHistory = async () => {
    if (!selectedWallet) return;
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const res = await walletService.getBridgeHistory({ page, page_size: pageSize, wallet: selectedWallet });
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setHistoryItems(items);
      setTotal(Number(res?.total || items.length || 0));
    } catch (err: any) {
      eventBus.emitApiError({
        title: '获取桥接历史失败',
        message: err?.message || '获取桥接历史失败',
        category: 'network',
        endpoint: 'bridge.history',
        friendlyMessage: err?.response?.data?.error || '获取桥接历史失败，请稍后再试',
        errorContext: err,
      });
      setHistoryError(err?.response?.data?.error || '获取桥接历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchBridgeHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallet, page, pageSize]);

  // 轮询未完成桥接状态并更新
  useEffect(() => {
    if (!historyItems.length) return;
    let timer: any;
    const poll = async () => {
      try {
        const updates: Record<string, string> = {};
        const pending = historyItems.filter((it) => ['initiated', 'pending'].includes(String(it.status || '').toLowerCase()));
        await Promise.all(pending.map(async (it) => {
          try {
            const statusRes = await walletService.getBridgeStatus(String(it.id));
            const st = String(statusRes?.status || '').toLowerCase();
            if (st && st !== String(it.status || '').toLowerCase()) {
              updates[String(it.id)] = st;
            }
          } catch (e) {
            /* 忽略单个查询错误 */
          }
        }));
        if (Object.keys(updates).length) {
          setHistoryItems((prev) => prev.map((it) => updates[String(it.id)] ? { ...it, status: updates[String(it.id)] } : it));
        }
      } finally {
        // noop
      }
    };
    // 10s 轮询
    timer = setInterval(poll, 10000);
    return () => { if (timer) clearInterval(timer); };
  }, [historyItems]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        跨链桥
      </Typography>
      <MockModeBanner dense message="Mock 后端已启用：跨链操作为本地模拟数据" />

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
          ) : (Array.isArray(wallets) ? wallets.length === 0 : true) ? (
            <Alert severity="info">没有可用的卡包，请先创建一个卡包</Alert>
          ) : (
            <form onSubmit={handleBridgeAssets}>
              <Grid container spacing={2}>
                {/* 第一行：钱包 / 源网络 / 资产 / 目标链 */}
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="bridge-wallet-select-label">选择卡包</InputLabel>
                    <Select
                      labelId="bridge-wallet-select-label"
                      id="bridge-wallet-select"
                      value={selectedWallet}
                      onChange={(e) => setSelectedWallet(e.target.value)}
                      label="选择卡包"
                      required
                    >
                      {(Array.isArray(wallets) ? wallets : []).map((wallet) => (
                        <MenuItem key={wallet.id} value={wallet.name}>
                          {wallet.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="source-chain-select-label">源网络</InputLabel>
                    <Select
                      labelId="source-chain-select-label"
                      id="source-chain-select"
                      value={sourceChain}
                      onChange={(e) => setSourceChain(e.target.value)}
                      label="源网络"
                      required
                    >
                      {networks.map((chain) => (
                        <MenuItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 资产/代币（根据源网络） */}
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="asset-select-label">资产/代币</InputLabel>
                    <Select
                      labelId="asset-select-label"
                      id="asset-select"
                      value={asset}
                      onChange={(e) => setAsset(e.target.value)}
                      label="资产/代币"
                    >
                      {(ASSETS_BY_CHAIN[sourceChain] || []).map((a) => (
                        <MenuItem key={a} value={a}>{a}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="target-chain-select-label">目标链</InputLabel>
                    <Select
                      labelId="target-chain-select-label"
                      id="target-chain-select"
                      value={targetChain}
                      onChange={(e) => setTargetChain(e.target.value)}
                      label="目标链"
                      required
                    >
                      {networks.map((chain) => (
                        <MenuItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 第二行：金额 / 目标地址 / 路由提供商 / 提交 */}
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    id="bridge-amount"
                    label="金额"
                    InputLabelProps={{ htmlFor: 'bridge-amount' }}
                    fullWidth
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    inputProps={{ min: 0, step: '0.000001' }}
                    placeholder="输入跨链金额"
                    size="small"
                    helperText={balanceLoading ? '余额载入中…' : (sourceBalance != null ? `当前余额：${sourceBalance}` : '（无法获取余额）')}
                  />
                </Grid>

                {/* 目标地址（可选） */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    id="dest-address"
                    label="目标地址（可选）"
                    fullWidth
                    value={destAddress}
                    onChange={(e) => setDestAddress(e.target.value)}
                    placeholder="填写目标链接收地址，留空则使用默认路由"
                    size="small"
                  />
                </Grid>

                {/* 路由提供商（可选） */}
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="route-provider-label">路由提供商</InputLabel>
                    <Select
                      labelId="route-provider-label"
                      id="route-provider"
                      value={routeProvider}
                      onChange={(e) => setRouteProvider(e.target.value)}
                      label="路由提供商"
                    >
                      <MenuItem value="auto">自动选择</MenuItem>
                      <MenuItem value="lifi">LI.FI</MenuItem>
                      <MenuItem value="socket">Socket</MenuItem>
                      <MenuItem value="synapse">Synapse</MenuItem>
                      <MenuItem value="mock">MockProvider</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* 费用与到达时间提示（简化为 caption 文本） */}
                <Grid size={{ xs: 12, md: 9 }}>
                  <Typography variant="caption" color="text.secondary">
                    预计费用与到达时间将基于路由实时估算（演示占位）。当前未接入真实路由，提交后以 Mock 后端返回为准。
                  </Typography>
                  {sourceChain && targetChain && sourceChain === targetChain && (
                    <Alert severity="warning" sx={{ mt: 1 }}>源网络与目标网络相同，请选择不同的网络</Alert>
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading || sourceChain === targetChain}>
                    {loading ? <CircularProgress size={24} /> : '发起跨链'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 桥接历史 */}
      <Box mt={3}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">桥接历史</Typography>
              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchBridgeHistory}
                >刷新</Button>
              </Box>
            </Box>

            {historyError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setHistoryError(null)}>
                {historyError}
              </Alert>
            )}

            {historyLoading ? (
              <Box display="flex" justifyContent="center" my={3}><CircularProgress /></Box>
            ) : historyItems.length === 0 ? (
              <Alert severity="info">暂无桥接记录</Alert>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>源链</TableCell>
                    <TableCell>目标链</TableCell>
                    <TableCell>代币</TableCell>
                    <TableCell>金额</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>创建时间</TableCell>
                    <TableCell>更新时间</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyItems.map((it) => {
                    const idShort = String(it.id || '').slice(0, 10);
                    const status = String(it.status || '').toLowerCase();
                    const color = status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'warning';
                    const created = it.created_at || it.timestamp || '-';
                    const updated = it.updated_at || '-';
                    return (
                      <TableRow key={String(it.id)}>
                        <TableCell title={String(it.id)}>{idShort}</TableCell>
                        <TableCell>{it.from_chain || '-'}</TableCell>
                        <TableCell>{it.to_chain || '-'}</TableCell>
                        <TableCell>{it.token || '-'}</TableCell>
                        <TableCell>{it.amount || '-'}</TableCell>
                        <TableCell><Chip size="small" color={color as any} label={status || 'unknown'} /></TableCell>
                        <TableCell>{created}</TableCell>
                        <TableCell>{updated}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={async () => {
                            try {
                              const res = await walletService.getBridgeStatus(String(it.id));
                              const st = String(res?.status || '').toLowerCase();
                              setHistoryItems((prev) => prev.map((row) => row.id === it.id ? { ...row, status: st } : row));
                            } catch (e) {
                              // 单项失败静默
                            }
                          }}>
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* 简单分页信息 */}
            <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption">共 {total} 条 · 每页 {pageSize} 条</Typography>
              <Box>
                <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</Button>
                <Button size="small" disabled={(page * pageSize) >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default BridgePage;
