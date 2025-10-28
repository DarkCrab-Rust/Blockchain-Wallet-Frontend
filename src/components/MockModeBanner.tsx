import React from 'react';
import { Alert, Button } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';

interface MockModeBannerProps {
  message?: string;
  dense?: boolean;
  sx?: SxProps<Theme>;
  severity?: 'info' | 'warning' | 'success' | 'error';
  action?: React.ReactNode;
  showSettingsLink?: boolean;
}

const MockModeBanner: React.FC<MockModeBannerProps> = ({ message, dense = false, sx, severity = 'info', action, showSettingsLink = false }) => {
  const flags = useFeatureFlags();
  const navigate = useNavigate();
  if (!flags.useMockBackend) return null;

  const actionNode = action ?? (showSettingsLink ? (
    <Button color="inherit" size="small" onClick={() => navigate('/settings')}>去设置</Button>
  ) : undefined);

  return (
    <Alert
      severity={severity}
      variant={dense ? 'outlined' : 'standard'}
      sx={{ mb: dense ? 0.75 : 2, py: dense ? 0.75 : 1.25, ...(sx || {}) }}
      action={actionNode}
    >
      {message || 'Mock 后端已启用：前端使用本地模拟数据'}
    </Alert>
  );
};

export default MockModeBanner;