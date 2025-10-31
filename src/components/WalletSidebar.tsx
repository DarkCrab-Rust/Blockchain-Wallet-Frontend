import React from 'react';
import { Card, CardContent, Typography, Box, Button, Divider } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useWalletContext } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  symbol: string;
  baseAvail: number | null;
  quoteAvail: number | null;
}

// 简洁的钱包侧边栏，参考 OKX 工作台左侧资产概览
const WalletSidebar: React.FC<Props> = ({ symbol, baseAvail, quoteAvail }) => {
  const { currentWallet, currentNetwork } = useWalletContext();
  const navigate = useNavigate();
  const [base, quote] = symbol.split('/');

  return (
    <Card className="card" sx={{ mb: 2, overflow: 'hidden', '& .MuiButton-contained': { boxShadow: 'none' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">钱包</Typography>
          <Typography variant="body2" color="text.secondary">{currentNetwork?.toUpperCase() || '—'}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {currentWallet ? currentWallet : '未选择钱包'}
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Grid container spacing={1}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">{base}</Typography>
              <Typography variant="body2" fontWeight={600}>{(baseAvail ?? 0).toFixed(6)}</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">{quote}</Typography>
              <Typography variant="body2" fontWeight={600}>{(quoteAvail ?? 0).toFixed(6)}</Typography>
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" sx={{ flex: '1 1 0', minWidth: 0 }} onClick={() => navigate('/wallet')}>充币</Button>
          <Button size="small" variant="contained" disableElevation sx={{ flex: '1 1 0', minWidth: 0 }} onClick={() => navigate('/send')}>提币</Button>
          <Button size="small" variant="outlined" sx={{ flex: '1 1 0', minWidth: 0 }} onClick={() => navigate('/bridge')}>跨链</Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          非托管模式：交易资金直接来源于当前钱包资产。
        </Typography>
      </CardContent>
    </Card>
  );
};

export default WalletSidebar;