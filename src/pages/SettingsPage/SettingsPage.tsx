import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { walletService } from '../../services/api';
import { ReactComponent as PadlockEyeIcon } from '../../assets/icons/padlock-eye.svg';
// import { useWalletContext } from '../../context/WalletContext';

import MockModeBanner from '../../components/MockModeBanner';
// import { normalizeApiUrl } from '../../utils/url';
import FeatureFlagsPanel from '../../components/FeatureFlagsPanel';
import DefaultWalletSelector from '../../components/DefaultWalletSelector';
import ApiConfigPanel from '../../components/ApiConfigPanel';
import ChangePasswordPanel from '../../components/ChangePasswordPanel';
import AuthTestPanel from '../../components/AuthTestPanel';
import BackendHealthPanel from '../../components/BackendHealthPanel';
import RiskPolicyPanel from '../../components/RiskPolicyPanel';
import RestoreWalletPanel from '../../components/RestoreWalletPanel';
import SwaggerLinkPanel from '../../components/SwaggerLinkPanel';
import { eventBus } from '../../utils/eventBus';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';



const SettingsPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { useMockBackend } = useFeatureFlags();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 取消未使用的硬件钱包上下文与处理逻辑（占位实现保留在 services/hardware.ts）


  const reloadWallets = React.useCallback(async () => {
    // 在 Mock 模式下跳过真实钱包列表请求，避免误报错误横幅
    if (useMockBackend) {
      setError(null);
      return;
    }
    try {
      await walletService.listWallets();
      setError(null);
    } catch (err) {
      eventBus.emitApiError({
        title: '获取钱包列表失败',
        message: (err as any)?.message || '获取钱包列表失败，请检查API连接',
        category: 'network',
        endpoint: 'wallets.list',
        friendlyMessage: '获取钱包列表失败，请检查API连接',
        userAction: '请到设置页检查 API 地址与密钥，或启动后端',
      });
      setError('获取钱包列表失败，请检查API连接');
    }
  }, [useMockBackend]);

  useEffect(() => {
    reloadWallets();
  }, [reloadWallets]);

  // URL 格式化和校验
  // const normalizeApiUrl = (raw: string): string | null => {
  //   const trimmed = (raw || '').trim();
  //   if (!trimmed) return null;
  //   let url = trimmed;
  //   if (!/^https?:\/\//i.test(url)) {
  //     url = 'http://' + url;
  //   }
  //   try {
  //     const parsed = new URL(url);
  //     const pathNoTrailing = parsed.pathname.replace(/\/+$/, '');
  //     const base = `${parsed.protocol}//${parsed.host}${pathNoTrailing}`;
  //     return base.endsWith('/api') ? base : `${base}/api`;
  //   } catch {
  //     return null;
  //   }
  // };








  const handleLogout = React.useCallback(() => {
    try {
      logout();
    } finally {
      navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PadlockEyeIcon style={{ width: 24, height: 24 }} />
        <Typography variant="h4" gutterBottom>设置</Typography>
      </Box>

      <MockModeBanner dense />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <ApiConfigPanel />

      {/* 后端文档入口 */}
      <SwaggerLinkPanel />

      {/* 风险策略设置 */}
      <RiskPolicyPanel />

      {/* 后端健康检查 */}
      <BackendHealthPanel />

      {/* 恢复钱包 */}
      <RestoreWalletPanel />

      {/* 默认钱包设置 */}
      <DefaultWalletSelector />

      {/* 功能开关 */}
      <FeatureFlagsPanel />

      {/* 认证集成测试 */}
      <AuthTestPanel />

      {/* 修改密码 */}
      <ChangePasswordPanel />

      {/* 退出账户 */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px dashed #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5 }}>账户</Typography>
          <Typography variant="caption" color="text.secondary">退出当前账户，清除本地登录状态并返回登录界面</Typography>
        </Box>
        <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)}>退出账户</Button>
      </Box>

      {/* 退出确认弹窗 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>确认退出</DialogTitle>
        <DialogContent>
          <Typography variant="body2">退出当前账户并返回登录界面。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button onClick={handleLogout} color="error" variant="contained" autoFocus>确认退出</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;