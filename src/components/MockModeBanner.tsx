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
  closable?: boolean;
}

const STORAGE_KEY = 'ui.hide_mock_banner';
const MockModeBanner: React.FC<MockModeBannerProps> = ({ message, dense = false, sx, severity = 'info', action, showSettingsLink = false, closable = true }) => {
  const flags = useFeatureFlags();
  const navigate = useNavigate();
  // 允许关闭横幅并持久化，避免遮挡内容（Hook 必须在组件顶层调用）
  const [hidden, setHidden] = React.useState<boolean>(() => {
    try { return !!window.localStorage.getItem(STORAGE_KEY); } catch { return false; }
  });
  if (!flags.useMockBackend || hidden) return null;

  const actionNode = action ?? (showSettingsLink ? (
    <Button color="inherit" size="small" onClick={() => navigate('/settings')}>去设置</Button>
  ) : undefined);

  return (
    <Alert
      severity={severity}
      variant={dense ? 'outlined' : 'standard'}
      sx={{
        position: 'relative',
        zIndex: 'auto',
        mt: dense ? 0.5 : 1,
        mb: dense ? 1.5 : 2,
        py: dense ? 0.75 : 1.25,
        ...(sx || {}),
      }}
      action={actionNode}
      onClose={closable ? (() => { try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch {} setHidden(true); }) : undefined}
    >
      {message || 'Mock 后端已启用：前端使用本地模拟数据'}
    </Alert>
  );
};

export default MockModeBanner;