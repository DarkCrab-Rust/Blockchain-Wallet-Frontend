import React from 'react';
import { Box, Typography, TextField, MenuItem, Button, FormControlLabel, Switch, FormControl, InputLabel, Select } from '@mui/material';

import { getAvailableNetworks } from '../../utils/networks';

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
  const networks = getAvailableNetworks();
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
          {networks.map((n) => (
            <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>
          ))}
        </TextField>
        {/* 刷新与自动刷新 */}
        <Button variant="outlined" size="small" onClick={fetchHistory} disabled={loading}>
          刷新
        </Button>
        <FormControlLabel
          control={<Switch checked={autoRefresh} onChange={(e) => onToggleAutoRefresh(e.target.checked)} size="small" />}
          label="自动刷新"
        />
        {/* 时间范围筛选 */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>时间范围</InputLabel>
          <Select value={timeRange} label="时间范围" onChange={(e) => onChangeTimeRange(e.target.value)}>
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="24h">近24小时</MenuItem>
            <MenuItem value="7d">近7天</MenuItem>
            <MenuItem value="30d">近30天</MenuItem>
          </Select>
        </FormControl>
        {/* 状态筛选 */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>状态</InputLabel>
          <Select value={statusFilter} label="状态" onChange={(e) => onChangeStatusFilter(e.target.value)}>
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="submitted">已提交</MenuItem>
            <MenuItem value="confirmed">已确认</MenuItem>
            <MenuItem value="failed">失败</MenuItem>
          </Select>
        </FormControl>
        {/* 导出 */}
        <Button variant="outlined" size="small" onClick={onExportCSV}>导出 CSV</Button>
      </Box>
    </Box>
  );
};

export default HistoryToolbar;