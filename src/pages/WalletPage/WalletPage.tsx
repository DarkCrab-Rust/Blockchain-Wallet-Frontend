import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  Typography, 
  CircularProgress,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  MenuItem
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Add as AddIcon, Refresh } from '@mui/icons-material';
import { walletService } from '../../services/api';
import { Wallet } from '../../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '../../context/WalletContext';

const WalletPage: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [quantumSafe, setQuantumSafe] = useState(false);
  const [creating, setCreating] = useState(false);
  const [overviewBalance, setOverviewBalance] = useState<number | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<{ time: string; value: number }[]>([]);
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const { wallets: ctxWallets, currentWallet, refreshWallets, currentNetwork, setCurrentNetwork } = useWalletContext();
  // 移除本地 network 状态，改用全局网络
  // const [network, setNetwork] = useState<string>('eth');
  // 新增：网络符号映射
  const NETWORK_LABELS: Record<string, string> = { eth: 'ETH', solana: 'SOL', polygon: 'MATIC', bsc: 'BNB' };

  // 动画数字组件（无额外依赖）
  // const AnimatedNumber: React.FC<{ value: number | null; unit?: string; duration?: number }> = ({ value, unit = 'ETH', duration = 800 }) => {
  //   const [display, setDisplay] = useState<number>(value ?? 0);
  //   const prev = useRef<number>(value ?? 0);

  //   useEffect(() => {
  //     if (value == null) return;
  //     const start = prev.current;
  //     const end = value;
  //     const startTs = performance.now();
  //     const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  //     let raf: number;
  //     const tick = (ts: number) => {
  //       const p = Math.min(1, (ts - startTs) / duration);
  //       const eased = easeOut(p);
  //       setDisplay(start + (end - start) * eased);
  //       if (p < 1) raf = requestAnimationFrame(tick);
  //     };
  //     raf = requestAnimationFrame(tick);
  //     prev.current = end;
  //     return () => cancelAnimationFrame(raf);
  //   }, [value, duration]);

  //   return (
  //     <Typography variant="h3" sx={{ fontWeight: 700 }}>
  //       {display.toFixed(4)} {unit}
  //     </Typography>
  //   );
  // };

  // 获取钱包列表
  const fetchWallets = async () => {
    try {
      setLoading(true);
      const data = await walletService.listWallets();
      setWallets(data);
      setError(null);
    } catch (err) {
      console.error('获取钱包列表失败:', err);
      setError('获取钱包列表失败，请检查API连接');
    } finally {
      setLoading(false);
    }
  };

  // 根据首个钱包获取余额与生成趋势数据（加入性能计时）
  const fetchOverviewBalance = useCallback(async (walletName?: string) => {
    const name = walletName ?? (currentWallet ?? ctxWallets[0]?.name);
    if (!name) {
      setOverviewBalance(null);
      setBalanceHistory([]);
      return;
    }
    console.time(`fetchOverviewBalance:${name}`);
    try {
      const res = await walletService.getBalance(name, currentNetwork);
      const val = typeof res.balance === 'string' ? parseFloat(res.balance as any) : (res.balance as number);
      const current = Number.isFinite(val) ? val : 0;
      setOverviewBalance(current);
      const days = 14;
      const base = current;
      const now = new Date();
      const series: { time: string; value: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        const jitter = Math.sin((i / days) * Math.PI * 2) * base * 0.01 + (i % 2 === 0 ? base * 0.005 : -base * 0.003);
        series.push({ time: label, value: Math.max(0, base + jitter) });
      }
      setBalanceHistory(series);
    } catch (e) {
      console.error('获取余额失败:', e);
      setOverviewBalance(null);
      setBalanceHistory([]);
    } finally {
      console.timeEnd(`fetchOverviewBalance:${name}`);
    }
  }, [currentNetwork, currentWallet, ctxWallets]);

  // 创建新钱包
  const handleCreateWallet = async () => {
    if (!newWalletName.trim()) {
      setError('钱包名称不能为空');
      return;
    }

    if (newWalletName.includes('-') || !/^[a-zA-Z0-9_]+$/.test(newWalletName)) {
      setError('钱包名称只能包含字母、数字和下划线');
      return;
    }

    try {
      setCreating(true);
      await walletService.createWallet({
        name: newWalletName,
        quantum_safe: quantumSafe
      });
      setOpenCreateDialog(false);
      setNewWalletName('');
      setQuantumSafe(false);
      await refreshWallets();
      await fetchOverviewBalance(newWalletName);
    } catch (err: any) {
      console.error('创建钱包失败:', err);
      setError(err.response?.data?.error || '创建钱包失败');
    } finally {
      setCreating(false);
    }
  };

  // 删除钱包
  const handleDeleteWallet = async (name: string) => {
    if (window.confirm(`确定要删除钱包 "${name}" 吗？`)) {
      try {
        await walletService.deleteWallet(name);
        await refreshWallets();
         await fetchOverviewBalance(currentWallet ?? ctxWallets[0]?.name);
      } catch (err) {
        console.error('删除钱包失败:', err);
        setError('删除钱包失败');
      }
    }
  };

  // 刷新余额按钮逻辑（加入性能计时）
  const handleRefreshBalance = async () => {
    console.time('handleRefreshBalance');
    try {
      setRefreshing(true);
      await refreshWallets();
      await fetchOverviewBalance(currentWallet ?? ctxWallets[0]?.name);
    } catch (err) {
      console.error('刷新余额失败:', err);
      setError('刷新余额失败，请稍后重试');
    } finally {
      setRefreshing(false);
      console.timeEnd('handleRefreshBalance');
    }
  };

  // 组件加载时获取钱包列表与余额
  useEffect(() => {
    const run = async () => {
      await fetchWallets();
      const name = currentWallet ?? ctxWallets[0]?.name;
       await fetchOverviewBalance(name);
    };
    run();
  }, [currentWallet, ctxWallets, fetchOverviewBalance]);

  // 新增：网络变化时仅刷新余额
  useEffect(() => {
    const name = currentWallet ?? ctxWallets[0]?.name;
    fetchOverviewBalance(name);
  }, [currentNetwork, currentWallet, ctxWallets, fetchOverviewBalance]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">我的钱包</Typography>
        <Box display="flex" gap={1}>
          <TextField
            select
            size="small"
            label="网络"
            value={currentNetwork}
            onChange={(e) => setCurrentNetwork(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="eth">Ethereum</MenuItem>
            <MenuItem value="solana">Solana</MenuItem>
            <MenuItem value="polygon">Polygon</MenuItem>
            <MenuItem value="bsc">BSC</MenuItem>
          </TextField>
          <Button 
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            创建钱包
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefreshBalance}
            disabled={refreshing}
          >
            {refreshing ? '刷新中...' : '刷新余额'}
          </Button>
        </Box>
      </Box>

      {/* 资产总览与余额趋势 - 现代化设计 */}
      <Card sx={{ 
        mb: 3,
        background: 'linear-gradient(135deg, #121D33 0%, #1E293B 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(51, 221, 187, 0.05) 100%)',
          pointerEvents: 'none',
        }
      }}>
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2 
              }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00D4AA 0%, #33DDBB 100%)',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }} />
                <Typography variant="subtitle2" sx={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 500 
                }}>
                  总资产 ({NETWORK_LABELS[currentNetwork] || 'ETH'})
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #00D4AA 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {(overviewBalance ?? 0).toFixed(4)}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontWeight: 500 
                }}>
                  {NETWORK_LABELS[currentNetwork] || 'ETH'}
                </Typography>
              </Box>
              {(currentWallet ?? ctxWallets[0]?.name) && (
                <Chip 
                  label={`🔐 ${currentWallet ?? ctxWallets[0]?.name}`} 
                  size="small" 
                  sx={{ 
                    background: 'rgba(0, 212, 170, 0.2)',
                    color: '#00D4AA',
                    border: '1px solid rgba(0, 212, 170, 0.3)',
                    fontWeight: 600
                  }} 
                />
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={balanceHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(v: any) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) : '-')}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(v: any) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(4) : String(v))}
                      contentStyle={{
                        backgroundColor: 'rgba(18, 29, 51, 0.95)',
                        border: '1px solid rgba(0, 212, 170, 0.3)',
                        borderRadius: '12px',
                        color: 'white'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="url(#gradient)" 
                      strokeWidth={3} 
                      dot={false} 
                      animationDuration={600}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00D4AA" />
                        <stop offset="100%" stopColor="#33DDBB" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 代币资产列表 - 现代化设计 */}
      <Card sx={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        border: '1px solid rgba(0, 212, 170, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        mb: 3
      }}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mb: 3 
          }}>
            <Box sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #00D4AA 0%, #33DDBB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              💎
            </Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 700,
              color: '#1E293B'
            }}>
              代币资产组合
            </Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
                border: '1px solid rgba(0, 212, 170, 0.15)',
                borderRadius: '16px',
                p: 2.5,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0, 212, 170, 0.15)',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #00D4AA 0%, #33DDBB 100%)',
                }
              }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    color: '#1E293B',
                    mb: 0.5
                  }}>
                    {NETWORK_LABELS[currentNetwork] || 'ETH'}
                  </Typography>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600,
                    color: '#00D4AA',
                    mb: 0.5
                  }}>
                    {(overviewBalance ?? 0).toFixed(4)}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: '#64748B',
                    fontWeight: 500
                  }}>
                    主要资产
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  justifyContent: 'center' 
                }}>
                  <Button 
                    size="small" 
                    variant="contained"
                    onClick={() => navigate('/send')}
                    sx={{
                      background: 'linear-gradient(135deg, #00D4AA 0%, #33DDBB 100%)',
                      color: 'white',
                      fontWeight: 600,
                      borderRadius: '8px',
                      textTransform: 'none',
                      px: 2,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00B894 0%, #2DD4BF 100%)',
                      }
                    }}
                  >
                    📤 转账
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => navigate('/bridge')}
                    sx={{
                      borderColor: '#00D4AA',
                      color: '#00D4AA',
                      fontWeight: 600,
                      borderRadius: '8px',
                      textTransform: 'none',
                      px: 2,
                      '&:hover': {
                        borderColor: '#00B894',
                        color: '#00B894',
                        background: 'rgba(0, 212, 170, 0.05)',
                      }
                    }}
                  >
                    🔄 兑换
                  </Button>
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
                border: '1px solid rgba(0, 212, 170, 0.15)',
                borderRadius: '16px',
                p: 2.5,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0, 212, 170, 0.15)',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #00D4AA 0%, #33DDBB 100%)',
                }
              }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    color: '#1E293B',
                    mb: 0.5
                  }}>
                    USDT
                  </Typography>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600,
                    color: '#00D4AA',
                    mb: 0.5
                  }}>
                    0.0000
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: '#64748B',
                    fontWeight: 500
                  }}>
                    稳定币
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  justifyContent: 'center' 
                }}>
                  <Button 
                    size="small" 
                    variant="contained"
                    onClick={() => navigate('/send')}
                    sx={{
                      background: 'linear-gradient(135deg, #00D4AA 0%, #33DDBB 100%)',
                      color: 'white',
                      fontWeight: 600,
                      borderRadius: '8px',
                      textTransform: 'none',
                      px: 2,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00B894 0%, #2DD4BF 100%)',
                      }
                    }}
                  >
                    📤 转账
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    sx={{
                      borderColor: '#00D4AA',
                      color: '#00D4AA',
                      fontWeight: 600,
                      borderRadius: '8px',
                      textTransform: 'none',
                      px: 2,
                      '&:hover': {
                        borderColor: '#00B894',
                        color: '#00B894',
                        background: 'rgba(0, 212, 170, 0.05)',
                      }
                    }}
                  >
                    💰 买入
                  </Button>
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
                border: '1px solid rgba(0, 212, 170, 0.15)',
                borderRadius: '16px',
                p: 2.5,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0, 212, 170, 0.15)',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #00D4AA 0%, #33DDBB 100%)',
                }
              }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    color: '#1E293B',
                    mb: 0.5
                  }}>
                    DAI
                  </Typography>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600,
                    color: '#00D4AA',
                    mb: 0.5
                  }}>
                    0.0000
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: '#64748B',
                    fontWeight: 500
                  }}>
                    去中心化稳定币
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  justifyContent: 'center' 
                }}>
                  <Button 
                    size="small" 
                    variant="contained"
                    onClick={() => navigate('/send')}
                    sx={{
                      background: 'linear-gradient(135deg, #00D4AA 0%, #33DDBB 100%)',
                      color: 'white',
                      fontWeight: 600,
                      borderRadius: '8px',
                      textTransform: 'none',
                      px: 2,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00B894 0%, #2DD4BF 100%)',
                      }
                    }}
                  >
                    📤 转账
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    sx={{
                      borderColor: '#00D4AA',
                      color: '#00D4AA',
                      fontWeight: 600,
                      borderRadius: '8px',
                      textTransform: 'none',
                      px: 2,
                      '&:hover': {
                        borderColor: '#00B894',
                        color: '#00B894',
                        background: 'rgba(0, 212, 170, 0.05)',
                      }
                    }}
                  >
                    🔄 兑换
                  </Button>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress />
        </Box>
      ) : wallets.length === 0 ? (
        <Box textAlign="center" my={5}>
          <Typography variant="h6" color="textSecondary">
            没有找到钱包，请创建一个新钱包
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {wallets.map((wallet) => (
            <Grid item xs={12} sm={6} md={4} key={wallet.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {wallet.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ID: {wallet.id}
                  </Typography>
                  <Box mt={2} display="flex" gap={1}>
                    <Button size="small" variant="contained" onClick={() => navigate('/send')}>转账</Button>
                    <Button size="small" variant="outlined" onClick={() => navigate('/bridge')}>跨链</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteWallet(wallet.name)}>删除</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 创建钱包弹窗 */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>创建新钱包</DialogTitle>
        <DialogContent>
          <TextField
            label="钱包名称"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            fullWidth
            margin="dense"
          />
          <FormControlLabel
            control={<Switch checked={quantumSafe} onChange={(e) => setQuantumSafe(e.target.checked)} />}
            label="量子安全（实验性）"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>取消</Button>
          <Button onClick={handleCreateWallet} variant="contained" disabled={creating}>
            {creating ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WalletPage;