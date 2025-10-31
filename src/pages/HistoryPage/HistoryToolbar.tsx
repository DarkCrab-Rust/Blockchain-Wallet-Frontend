import React from 'react';
import { Box, Typography, TextField, MenuItem, Button, Switch, FormControl, InputLabel, Select, Stack, IconButton, Tooltip, Popover, Divider } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

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
  const [filterAnchorEl, setFilterAnchorEl] = React.useState<HTMLElement | null>(null);
  const filterOpen = Boolean(filterAnchorEl);
  const handleOpenFilter = (e: React.MouseEvent<HTMLElement>) => setFilterAnchorEl(e.currentTarget);
  const handleCloseFilter = () => setFilterAnchorEl(null);

  return (
    <Box mb={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ mr: 1 }}>交易历史</Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
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

          {/* 刷新图标按钮 */}
          <Tooltip title="刷新">
            <span>
              <IconButton aria-label="刷新" size="small" onClick={fetchHistory} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {/* 自动刷新：使用无标签开关（节省空间） */}
          <Tooltip title={autoRefresh ? '自动刷新：开' : '自动刷新：关'}>
            <Switch
              checked={autoRefresh}
              onChange={(e) => onToggleAutoRefresh(e.target.checked)}
              size="small"
              inputProps={{ 'aria-label': '自动刷新' }}
            />
          </Tooltip>

          {/* 筛选弹层按钮（时间范围、状态） */}
          <Button variant="outlined" size="small" onClick={handleOpenFilter}>筛选</Button>

          {/* 导出 */}
          <Button variant="outlined" size="small" onClick={onExportCSV}>导出 CSV</Button>
        </Stack>
      </Stack>

      {/* 弹层：包含时间范围与状态筛选 */}
      <Popover
        open={filterOpen}
        anchorEl={filterAnchorEl}
        onClose={handleCloseFilter}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 280 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>时间范围</InputLabel>
            <Select value={timeRange} label="时间范围" onChange={(e) => onChangeTimeRange(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="24h">近24小时</MenuItem>
              <MenuItem value="7d">近7天</MenuItem>
              <MenuItem value="30d">近30天</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>状态</InputLabel>
            <Select value={statusFilter} label="状态" onChange={(e) => onChangeStatusFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="submitted">已提交</MenuItem>
              <MenuItem value="confirmed">已确认</MenuItem>
              <MenuItem value="failed">失败</MenuItem>
            </Select>
          </FormControl>
          <Divider sx={{ my: 2 }} />
          <Box textAlign="right">
            <Button size="small" onClick={handleCloseFilter}>完成</Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default React.memo(HistoryToolbar);