import React, { useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Chip } from '@mui/material';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  require2FA?: boolean;
  requireBiometric?: boolean;
  quoteAmount?: number;
  quoteSymbol?: string;
}

// 非托管安全联动确认弹窗：支持 2FA 与生物识别（模拟）
const OrderConfirmDialog: React.FC<Props> = ({ open, onCancel, onConfirm, require2FA = true, requireBiometric = true, quoteAmount, quoteSymbol }) => {
  const [code, setCode] = useState('');
  const [bioPassed, setBioPassed] = useState(false);
  const codeValid = useMemo(() => code.trim().length >= 6, [code]);

  const canConfirm = useMemo(() => {
    const ok2fa = !require2FA || codeValid;
    const okBio = !requireBiometric || bioPassed;
    return ok2fa && okBio;
  }, [require2FA, codeValid, requireBiometric, bioPassed]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs" aria-labelledby="order-confirm-title">
      <DialogTitle id="order-confirm-title">安全确认</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          这是非托管钱包下单。请完成安全校验以继续。
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <Chip size="small" label="非托管" color="success" />
          {quoteAmount !== undefined && quoteSymbol && (
            <Typography variant="caption" color="text.secondary">资金将直接来源于钱包：约 {quoteAmount?.toFixed(4)} {quoteSymbol}</Typography>
          )}
        </Box>

        {require2FA && (
          <TextField
            fullWidth
            label="2FA 验证码"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputProps={{ maxLength: 8 }}
            helperText={code && !codeValid ? '请输入至少6位验证码' : ''}
            error={code !== '' && !codeValid}
            sx={{ mb: 2 }}
          />
        )}

        {requireBiometric && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>生物识别</Typography>
            <Button variant={bioPassed ? 'contained' : 'outlined'} color={bioPassed ? 'success' : 'primary'} onClick={() => setBioPassed(true)}>
              {bioPassed ? '已通过' : '进行识别'}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>取消</Button>
        <Button onClick={onConfirm} disabled={!canConfirm} variant="contained">确认下单</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderConfirmDialog;