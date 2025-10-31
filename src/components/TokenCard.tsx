import React from 'react';
import { Box, Card, CardContent, Typography, Button, IconButton } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

type Props = {
  symbol: string;
  titleColor?: string;
  value: string;
  subtitle?: string;
  accentTop?: string;
  onSend?: () => void;
  onBridge?: () => void;
  onBuy?: () => void;
  onSwap?: () => void;
};

export default function TokenCard({ symbol, titleColor = '#1E293B', value, subtitle, accentTop, onSend, onBridge, onBuy, onSwap }: Props) {
  return (
    <Card sx={{
      background: 'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)',
      border: '1px solid rgba(0, 212, 170, 0.15)',
      borderRadius: '16px',
      p: 2.5,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 40px rgba(0, 212, 170, 0.15)',
        border: '1px solid rgba(0, 212, 170, 0.3)',
      },
      '&::before': accentTop ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: accentTop,
      } : undefined
    }}>
      <IconButton aria-label="交换" onClick={onSwap} sx={{ position: 'absolute', right: 8, top: 8 }}>
        <SwapHorizIcon />
      </IconButton>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor, mb: 0.5 }}>
            {symbol}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600, color: titleColor, mb: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          {onSend && (
            <Button size="small" variant="contained" onClick={onSend}>📤 转账</Button>
          )}
          {onBridge && (
            <Button size="small" variant="outlined" onClick={onBridge}>跨链</Button>
          )}
          {onBuy && (
            <Button size="small" variant="outlined" onClick={onBuy}>💰 买入</Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}