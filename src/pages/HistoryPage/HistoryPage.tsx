import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Alert, Button, CircularProgress } from '@mui/material';
import { Timeline } from '@mui/lab';
import Grid from '@mui/material/GridLegacy';
import { walletService } from '../../services/api';
import { Transaction, Wallet } from '../../types';
import { useWalletContext } from '../../context/WalletContext';
import { Pagination } from "@mui/material";
import HistoryToolbar from './HistoryToolbar';
import HistoryWalletSelector from './HistoryWalletSelector';
import HistoryTimelineItem from './HistoryTimelineItem';
import { safeLocalStorage } from '../../utils/safeLocalStorage';

const HistoryPage: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [history, setHistory] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { currentWallet, currentNetwork, setCurrentNetwork } = useWalletContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => safeLocalStorage.getItem('history_auto_refresh') === 'true');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(() => {
    const saved = safeLocalStorage.getItem("history_page_size");
    const n = saved ? parseInt(saved, 10) : 20;
    return isNaN(n) ? 20 : n;
  });



  // 时间范围与状态筛选
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');

  // 获取钱包列表
  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const list = await walletService.listWallets();
        setWallets(list);
        if (currentWallet) {
          setSelectedWallet(currentWallet);
        } else if (list.length > 0) {
          setSelectedWallet(list[0].name);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWallets();
  }, [currentWallet]);

  // 拉取历史数据
  const fetchHistory = useCallback(async () => {
    if (!selectedWallet) return;
    setLoading(true);
    try {
      const res = await walletService.getTransactionHistory(selectedWallet, { network: currentNetwork });
      setHistory(res.transactions);
      setError(null);
    } catch (e: any) {
      setError(e?.message || '获取交易历史失败');
    } finally {
      setLoading(false);
    }
  }, [selectedWallet, currentNetwork]);

  // 自动刷新持久化与轮询
  useEffect(() => {
    safeLocalStorage.setItem('history_auto_refresh', String(autoRefresh));
  }, [autoRefresh]);
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      fetchHistory();
    }, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchHistory]);

  React.useEffect(() => {
    safeLocalStorage.setItem("history_page_size", String(pageSize));
  }, [pageSize]);

  React.useEffect(() => {
    // 当筛选条件变化时，重置到第一页
    setPage(1);
  }, [timeRange, statusFilter, searchQuery, currentNetwork, selectedWallet]);

  const displayHistory = React.useMemo(() => {
    let filtered = history;
    const nowSec = Math.floor(Date.now() / 1000);
    let cutoff: number | null = null;
    if (timeRange === '24h') cutoff = nowSec - 24 * 3600;
    else if (timeRange === '7d') cutoff = nowSec - 7 * 24 * 3600;
    else if (timeRange === '30d') cutoff = nowSec - 30 * 24 * 3600;
    if (cutoff !== null) {
      const c = cutoff as number;
      filtered = filtered.filter((tx) => tx.timestamp >= c);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.id?.toLowerCase().includes(q) ||
        tx.from_address?.toLowerCase().includes(q) ||
        tx.to_address?.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  }, [history, timeRange, statusFilter, searchQuery]);

  const total = displayHistory.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const pagedHistory = displayHistory.slice(startIdx, endIdx);

  // CSV转义
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const handleExportCSV = () => {
    const headers = ['id', 'time_iso', 'status', 'amount', 'from_address', 'to_address', 'network'];
    const rows = displayHistory.map((tx) => [
      tx.id,
      new Date(tx.timestamp * 1000).toISOString(),
      tx.status,
      tx.amount,
      tx.from_address,
      tx.to_address,
      currentNetwork
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:]/g, '-');
    a.href = url;
    a.download = `history_${currentNetwork}_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchHistory} disabled={loading}>
              重试
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      <HistoryToolbar
        currentNetwork={currentNetwork}
        onChangeNetwork={setCurrentNetwork}
        fetchHistory={fetchHistory}
        loading={loading}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={setAutoRefresh}
        timeRange={timeRange}
        onChangeTimeRange={(v: string) => setTimeRange(v as any)}
        statusFilter={statusFilter}
        onChangeStatusFilter={(v: string) => setStatusFilter(v as any)}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        pageSize={pageSize}
        onChangePageSize={(v: number) => setPageSize(v)}
        displayEmpty={displayHistory.length === 0}
        onExportCSV={handleExportCSV}
      />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <HistoryWalletSelector wallets={wallets} selectedWallet={selectedWallet} onChangeSelectedWallet={setSelectedWallet} />
        </Grid>
        <Grid item xs={12}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : displayHistory.length === 0 ? (
            <Alert severity="info">暂无交易记录</Alert>
          ) : (
            <Timeline>
              {pagedHistory.map((tx) => (
                <HistoryTimelineItem key={tx.id} tx={tx} network={currentNetwork} />
              ))}
            </Timeline>
          )}
        </Grid>
      </Grid>

      {/* 顶部分页与统计 */}
      <Box mt={2} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Typography variant="body2" color="text.secondary">
          显示 {total === 0 ? 0 : startIdx + 1}–{endIdx} 共 {total} 条
        </Typography>
        <Pagination
          count={pageCount}
          page={page}
          onChange={(_, value) => setPage(value)}
          size="small"
          showFirstButton
          showLastButton
        />
      </Box>
      {/* 底部分页 */}
      <Box mt={2} display="flex" alignItems="center" justifyContent="flex-end">
        <Pagination
          count={pageCount}
          page={page}
          onChange={(_, value) => setPage(value)}
          size="small"
          showFirstButton
          showLastButton
        />
      </Box>
    </Box>
  );
};

export default HistoryPage;