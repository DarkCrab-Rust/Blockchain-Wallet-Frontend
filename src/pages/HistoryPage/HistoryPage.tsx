import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert, Button, CircularProgress } from '@mui/material';
import { Timeline } from '@mui/lab';
// 兼容当前 MUI 版本，使用 Box 进行简单布局，避免 Grid 类型差异
import { walletService } from '../../services/api';
import { Wallet } from '../../types';
import { useWalletContext } from '../../context/WalletContext';
import { Pagination } from "@mui/material";
import HistoryToolbar from './HistoryToolbar';
import HistoryWalletSelector from './HistoryWalletSelector';
import HistoryTimelineItem from './HistoryTimelineItem';
import { safeLocalStorage } from '../../utils/safeLocalStorage';
import MockModeBanner from '../../components/MockModeBanner';
import { eventBus } from '../../utils/eventBus';
import { useTransactions } from '../../hooks/useTransactions';

const HistoryPage: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { currentWallet, currentNetwork, setCurrentNetwork } = useWalletContext();
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => safeLocalStorage.getItem('history_auto_refresh') === 'true');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(() => {
    const saved = safeLocalStorage.getItem("history_page_size");
    const n = saved ? parseInt(saved, 10) : 20;
    return isNaN(n) ? 20 : n;
  });
  const [pageVisible, setPageVisible] = useState<boolean>(() => !document.hidden);
  const refreshDebounceRef = React.useRef<number | undefined>(undefined);



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

  // React Query：拉取历史数据
  const { data: historyData = [], refetch, isFetching: loading, error: queryError } = useTransactions({
    walletName: selectedWallet,
    network: currentNetwork,
    autoRefresh,
    pageVisible,
  });

  // 自动刷新持久化与轮询
  useEffect(() => {
    safeLocalStorage.setItem('history_auto_refresh', String(autoRefresh));
  }, [autoRefresh]);
  useEffect(() => {
    // 将 Query 错误同步到本地错误态（保持 UI 结构一致）
    setError(queryError ? (queryError as any)?.message || '获取交易历史失败' : null);
  }, [queryError]);

  React.useEffect(() => {
    // 当筛选条件变化时，重置到第一页
    setPage(1);
  }, [timeRange, statusFilter, deferredSearchQuery, currentNetwork, selectedWallet]);

  // 刷新按钮轻微防抖，避免误触造成瞬时多次请求
  const handleRefreshClick = React.useCallback(() => {
    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }
    refreshDebounceRef.current = window.setTimeout(() => {
      try { refetch(); } catch {}
    }, 250);
  }, [refetch]);

  // 组件卸载时清理可能残留的防抖与取消控制器
  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
    };
  }, []);

  const displayHistory = React.useMemo(() => {
    let filtered = historyData;
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
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.trim().toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.id?.toLowerCase().includes(q) ||
        tx.from_address?.toLowerCase().includes(q) ||
        tx.to_address?.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  }, [historyData, timeRange, statusFilter, deferredSearchQuery]);

  const total = displayHistory.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const pagedHistory = displayHistory.slice(startIdx, endIdx);

  // 虚拟滚动参数与状态（大列表时提升渲染性能）
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const itemHeight = 96; // 每个时间线项的近似高度
  const containerHeight = 600; // 容器固定高度
  const useVirtual = pagedHistory.length > 40; // 当列表较大时启用虚拟滚动
  const buffer = 6; // 额外缓冲渲染项数量
  const visibleCount = Math.ceil(containerHeight / itemHeight) + buffer;
  const startVirtual = Math.max(0, Math.floor(scrollTop / itemHeight));
  const endVirtual = Math.min(pagedHistory.length, startVirtual + visibleCount);
  const topPad = startVirtual * itemHeight;
  const bottomPad = Math.max(0, (pagedHistory.length - endVirtual) * itemHeight);

  const handleScroll = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, [listRef]);

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
    const headers = ['id', 'time_iso', 'status', 'amount', 'from_address', 'to_address', 'network', 'confirmations', 'fee'];
    const rows = displayHistory.map((tx) => [
      tx.id,
      new Date(tx.timestamp * 1000).toISOString(),
      tx.status,
      tx.amount,
      tx.from_address,
      tx.to_address,
      tx.network || currentNetwork,
      typeof tx.confirmations === 'number' ? tx.confirmations : '',
      typeof tx.fee === 'number' ? tx.fee : ''
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
      <MockModeBanner dense message="Mock 后端已启用：交易历史为本地模拟数据" />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRefreshClick} disabled={loading}>
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
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 360px', minWidth: 280 }}>
          <HistoryWalletSelector wallets={wallets} selectedWallet={selectedWallet} onChangeSelectedWallet={setSelectedWallet} />
        </Box>
        <Box sx={{ flex: '1 1 100%', minWidth: 280 }}>
          <Box position="relative" sx={{ minHeight: displayHistory.length === 0 ? 96 : undefined }}>
            {displayHistory.length === 0 ? (
              <Alert severity="info">暂无交易记录</Alert>
            ) : (
              useVirtual ? (
                <Box
                  ref={listRef}
                  onScroll={handleScroll}
                  sx={{ height: containerHeight, overflowY: 'auto' }}
                  data-testid="history-virtual-container"
                >
                  <Timeline>
                    <Box sx={{ height: topPad }} />
                    {pagedHistory.slice(startVirtual, endVirtual).map((tx) => (
                      <HistoryTimelineItem key={tx.id} tx={tx} network={currentNetwork} />
                    ))}
                    <Box sx={{ height: bottomPad }} />
                  </Timeline>
                </Box>
              ) : (
                <Timeline>
                  {pagedHistory.map((tx) => (
                    <HistoryTimelineItem key={tx.id} tx={tx} network={currentNetwork} />
                  ))}
                </Timeline>
              )
            )}
            {loading && (
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                sx={{ pointerEvents: 'none', bgcolor: 'transparent' }}
              >
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

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
    </Box>
  );
};

export default HistoryPage;