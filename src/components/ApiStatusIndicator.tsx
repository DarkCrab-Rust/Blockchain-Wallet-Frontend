import React from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import { Refresh } from '@mui/icons-material';

import type { ApiStatus } from '../hooks/useApiStatus';

interface ApiStatusIndicatorProps {
  status: ApiStatus;
  onRefresh?: () => void;
}

const ApiStatusIndicator: React.FC<ApiStatusIndicatorProps> = ({ status, onRefresh }) => {
  const title = status === 'ok' 
    ? '后端服务正常' 
    : status === 'checking' 
    ? '正在检查后端状态' 
    : status === 'mock'
    ? 'Mock 模式启用，使用本地模拟数据'
    : '后端不可达';
  const color = status === 'ok' 
    ? '#22c55e' 
    : status === 'checking' 
    ? '#f59e0b' 
    : status === 'mock'
    ? '#3b82f6'
    : '#ef4444';
  const label = status === 'ok' 
    ? 'API 正常' 
    : status === 'checking' 
    ? 'API 检查中' 
    : status === 'mock'
    ? 'API Mock'
    : 'API 异常';

  return (
    <Tooltip title={title}>
      <Box role="status" aria-label="API 状态" aria-live="polite" sx={{ ml: 2, display: 'inline-flex', alignItems: 'center' }}>
        <Box sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: color,
          border: '1px solid rgba(255,255,255,0.4)'
        }} />
        <Typography variant="caption" sx={{ color: 'white', ml: 0.75 }}>
          {label}
        </Typography>
        <Tooltip title="立即重检">
          <IconButton size="small" aria-label="立即重检" onClick={onRefresh} sx={{ ml: 0.5, color: 'white' }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Tooltip>
  );
};

export default React.memo(ApiStatusIndicator);