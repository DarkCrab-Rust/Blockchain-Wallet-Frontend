import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { walletService } from '../../services/api';
import { ReactComponent as PadlockEyeIcon } from '../../assets/icons/padlock-eye.svg';
// import { useWalletContext } from '../../context/WalletContext';

import MockModeBanner from '../../components/MockModeBanner';
// import { normalizeApiUrl } from '../../utils/url';
import FeatureFlagsPanel from '../../components/FeatureFlagsPanel';
import DefaultWalletSelector from '../../components/DefaultWalletSelector';
import ApiConfigPanel from '../../components/ApiConfigPanel';
import { eventBus } from '../../utils/eventBus';



const SettingsPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  // 取消未使用的硬件钱包上下文与处理逻辑（占位实现保留在 services/hardware.ts）


  const reloadWallets = React.useCallback(async () => {
    try {
      await walletService.listWallets();
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
  }, []);

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

      {/* 默认钱包设置 */}
      <DefaultWalletSelector />

      {/* 功能开关 */}
      <FeatureFlagsPanel />
    </Box>
  );
};

export default SettingsPage;