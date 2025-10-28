import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import FeatureToggle from './FeatureToggle';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { setFeatureFlag } from '../utils/featureFlags';

const FeatureFlagsPanel: React.FC = () => {
  const flags = useFeatureFlags();
  const updateFlag = (
    key: 'solana' | 'btc' | 'ledger' | 'trezor' | 'mock',
    value: boolean
  ) => setFeatureFlag(key, value);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>功能开关</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FeatureToggle
              label="启用 Solana 网络"
              checked={flags.enableSolana}
              onChange={(checked) => updateFlag('solana', checked)}
              tooltipTitle="控制是否显示 Solana 相关选项与校验"
              ariaLabel="启用 Solana 网络"
              description="控制是否显示 Solana 相关选项与校验"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FeatureToggle
              label="启用 BTC Taproot"
              checked={flags.enableBtcTaproot}
              onChange={(checked) => updateFlag('btc', checked)}
              tooltipTitle="开启后支持 Taproot 地址与网络选择"
              ariaLabel="启用 BTC Taproot"
              description="开启后支持 Taproot 地址与网络选择"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FeatureToggle
              label="启用 Ledger 集成"
              checked={flags.enableLedger}
              onChange={(checked) => updateFlag('ledger', checked)}
              tooltipTitle="启用后可在发送页选择硬件签名（占位实现）"
              ariaLabel="启用 Ledger 集成"
              description="启用后可在发送页选择硬件签名（占位实现）"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FeatureToggle
              label="启用 Trezor 集成"
              checked={flags.enableTrezor}
              onChange={(checked) => updateFlag('trezor', checked)}
              tooltipTitle="启用后可在发送页选择硬件签名（占位实现）"
              ariaLabel="启用 Trezor 集成"
              description="启用后可在发送页选择硬件签名（占位实现）"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FeatureToggle
              label="使用 Mock 后端"
              checked={flags.useMockBackend}
              onChange={(checked) => updateFlag('mock', checked)}
              tooltipTitle="前端将以本地模拟响应替代真实后端（开发调试）"
              ariaLabel="使用 Mock 后端"
              description="前端将以本地模拟响应替代真实后端（开发调试）"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default FeatureFlagsPanel;