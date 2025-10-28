import React from 'react';
import { Box, Typography } from '@mui/material';
import { apiRuntime } from '../services/api';
import { safeLocalStorage } from '../utils/safeLocalStorage';

const RuntimeConfigBanner: React.FC = () => {
  const baseUrl = apiRuntime.getBaseUrl();
  const storedUrlNew = safeLocalStorage.getItem('api.baseUrl');
  const storedUrlLegacy = safeLocalStorage.getItem('api_url');
  const storedKeyNew = safeLocalStorage.getItem('api.key');
  const storedKeyLegacy = safeLocalStorage.getItem('api_key');

  const sourceLabel = storedUrlNew
    ? '本地存储（新键）'
    : storedUrlLegacy
    ? '本地存储（旧键）'
    : (process.env.REACT_APP_API_URL ? '环境变量' : '默认 /api');

  const apiKeyLabel = storedKeyNew || storedKeyLegacy
    ? '已配置（本地存储）'
    : ((process.env.REACT_APP_API_KEY as string) ? '已配置（环境变量）' : '未配置');

  return (
    <Box sx={{ mt: 2, px: 1.5, py: 1, borderRadius: 1, backgroundColor: 'rgba(2, 132, 199, 0.06)', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
      <Typography variant="body2" color="text.secondary">
        当前运行时 API: {baseUrl}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        来源：{sourceLabel}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        API Key：{apiKeyLabel}
      </Typography>
    </Box>
  );
};

export default RuntimeConfigBanner;