import React from 'react';
import { Box, Typography, TextField, MenuItem, Button, FormControlLabel, Switch, FormControl, InputLabel, Select } from '@mui/material';

interface HistoryToolbarProps {
  currentNetwork: string;
  onChangeNetwork: (value: string) => void;
  fetchHistory: () => void;
  loading: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: (value: boolean) => void;
  timeRange: string;
  onChangeTimeRange: (value: string) => void;
  statusFilter: string;
  onChangeStatusFilter: (value: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  pageSize: number;
  onChangePageSize: (value: number) => void;
  displayEmpty: boolean;
  onExportCSV: () => void;
}

const HistoryToolbar: React.FC<HistoryToolbarProps> = ({
  currentNetwork,
  onChangeNetwork,
  fetchHistory,
  loading,
  autoRefresh,
  onToggleAutoRefresh,
  timeRange,
  onChangeTimeRange,
  statusFilter,
  onChangeStatusFilter,
  searchQuery,
  onChangeSearchQuery,
  pageSize,
  onChangePageSize,
  displayEmpty,
  onExportCSV,
}) => {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h5">交易历史</Typography>
      <Box display="flex" alignItems="center" gap={1}>
        {/* 网络选择 */}
        <TextField
          select
          size="small"
          label="网络"
          value={currentNetwork}
          onChange={(e) => onChangeNetwork(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="eth">Ethereum</MenuItem>
          <MenuItem value="solana">Solana</MenuItem>
          <MenuItem value="polygon">Polygon</MenuItem>
          <MenuItem value="bsc">BSC</MenuItem>
        </TextField>
        {/* 刷新与自动刷新 */}
        <Button variant="outlined" size="small" onClick={fetchHistory} disabled={loading}>
          刷新
        </Button>
        <FormControlLabel
          control={<Switch checked={autoRefresh} onChange={(e) => onToggleAutoRefresh(e.target.checked)} size="small" />}
          label="自动刷新"
        />
        {/* 时间范围 */}
        <TextField
          select
          size="small"
          label="时间范围"
          value={timeRange}
          onChange={(e) => onChangeTimeRange(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">全部</MenuItem>
          <MenuItem value="24h">24小时</MenuItem>
          <MenuItem value="7d">7天</MenuItem>
          <MenuItem value="30d">30天</MenuItem>
        </TextField>
        {/* 状态筛选 */}
        <TextField
          select
          size="small"
          label="状态"
          value={statusFilter}
          onChange={(e) => onChangeStatusFilter(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">全部</MenuItem>
          <MenuItem value="confirmed">已确认</MenuItem>
          <MenuItem value="pending">进行中</MenuItem>
          <MenuItem value="failed">失败</MenuItem>
        </TextField>
        {/* 搜索 */}
        <TextField
          size="small"
          label="搜索"
          placeholder="地址或交易ID"
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        {/* 每页大小 */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="page-size-label">每页</InputLabel>
          <Select
            labelId="page-size-label"
            value={pageSize}
            label="每页"
            onChange={(e) => onChangePageSize(Number(e.target.value))}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          size="small"
          onClick={onExportCSV}
          disabled={displayEmpty}
        >
          导出CSV
        </Button>
      </Box>
    </Box>
  );
};

export default HistoryToolbar;