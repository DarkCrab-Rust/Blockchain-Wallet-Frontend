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
import MockModeBanner from '../../components/MockModeBanner';
import { eventBus } from '../../utils/eventBus';

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
  const [pageVisible, setPageVisible] = useState<boolean>(() => !document.hidden);
  const lastFetchKeyRef = React.useRef<string>('');
  const refreshDebounceRef = React.useRef<number | undefined>(undefined);
  const historyAbortRef = React.useRef<AbortController | null>(null);



  // 时间范围与状态筛选
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');

  // 可见性变化时更新状态
  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // 获取钱包列表
  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const list = await walletService.listWallets();
        const safeList = Array.isArray(list) ? list : [];
        setWallets(safeList);
        if (currentWallet) {
          setSelectedWallet(currentWallet);
        } else if (safeList.length > 0) {
          setSelectedWallet(safeList[0].name);
        }
      } catch (err) {
        eventBus.emitApiError({
          title: '获取钱包列表失败',
          message: (err as any)?.message || '无法获取钱包列表',
          category: 'network',
          endpoint: 'wallets.list',
          friendlyMessage: '无法获取钱包列表，历史记录无法展示',
          userAction: '请检查后端服务与 API 配置',
        });
      }
    };
    fetchWallets();
  }, [currentWallet]);

  // 拉取历史数据
  const fetchHistory = useCallback(async () => {
    if (!selectedWallet) return;
    if (loading) return; // 防止并发重复请求

    // 若存在上次的请求，先主动取消
    if (historyAbortRef.current) {
      try { historyAbortRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    historyAbortRef.current = controller;

    const key = `${selectedWallet}|${currentNetwork}|${Date.now()}`;
    lastFetchKeyRef.current = key;
    setLoading(true);
    try {
      const res = await walletService.getTransactionHistory(selectedWallet, currentNetwork, { signal: controller.signal });
      // 若期间筛选或网络变更导致 key 变化，忽略旧响应
      if (lastFetchKeyRef.current !== key) return;
      setHistory(res.transactions);
      setError(null);
    } catch (e: any) {
      if (lastFetchKeyRef.current !== key) return;
      const code = e?.code || e?.name;
      const msg = e?.message || '';
      const isCanceled = code === 'ERR_CANCELED' || code === 'CanceledError' || msg.includes('ERR_ABORTED') || msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('canceled');
      if (!isCanceled) {
        setError(msg || '获取交易历史失败');
      }
    } finally {
      if (lastFetchKeyRef.current === key) setLoading(false);
    }
  }, [selectedWallet, currentNetwork, loading]);

  // 自动刷新持久化与轮询
  useEffect(() => {
    safeLocalStorage.setItem('history_auto_refresh', String(autoRefresh));
  }, [autoRefresh]);
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  useEffect(() => {
    if (!autoRefresh || !pageVisible) return;
    const id = setInterval(() => {
      // 仅在未加载中且页面可见时触发
      if (!loading) {
        fetchHistory();
      }
    }, 60000);
    return () => clearInterval(id);
  }, [autoRefresh, pageVisible, fetchHistory, loading]);

  React.useEffect(() => {
    // 当筛选条件变化时，重置到第一页
    setPage(1);
  }, [timeRange, statusFilter, searchQuery, currentNetwork, selectedWallet]);

  // 刷新按钮轻微防抖，避免误触造成瞬时多次请求
  const handleRefreshClick = React.useCallback(() => {
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }
    refreshDebounceRef.current = window.setTimeout(() => {
      fetchHistory();
    }, 250);
  }, [fetchHistory]);

  // 组件卸载时清理可能残留的防抖与取消控制器
  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
      if (historyAbortRef.current) {
        try { historyAbortRef.current.abort(); } catch {}
        historyAbortRef.current = null;
      }
    };
  }, []);

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
    // 不再依赖 appendChild，直接触发点击以兼容测试环境
    try { a.click(); } catch {}
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <MockModeBanner dense showSettingsLink message="Mock 后端已启用：交易历史为本地模拟数据" />

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
        fetchHistory={handleRefreshClick}
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