import React, { useState } from 'react';
import { Card, CardContent, Typography, TextField, Button, Alert, Box } from '@mui/material';
import { walletService } from '../services/api';
import { eventBus } from '../utils/eventBus';

const RestoreWalletPanel: React.FC = () => {
  const [name, setName] = useState('');
  const [backup, setBackup] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onRestore = async () => {
    setError(null);
    setSuccess(null);
    const n = name.trim();
    const b = backup.trim();
    if (!n || !b) {
      setError('请输入钱包名称与备份数据');
      return;
    }
    try {
      setLoading(true);
      const res = await walletService.restoreWallet({ name: n, backup_data: b });
      setSuccess(`已恢复钱包：${res.name}`);
      setName('');
      setBackup('');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || '恢复钱包失败';
      eventBus.emitApiError({
        title: '恢复钱包失败',
        message: msg,
        category: 'wallet',
        endpoint: 'wallets.restore',
        friendlyMessage: '请检查备份数据是否正确',
        userAction: '请确认备份内容与钱包名称匹配后重试',
        errorContext: e,
      });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>恢复钱包</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="钱包名称"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="备份数据"
            placeholder="粘贴备份字符串或JSON"
            fullWidth
            multiline
            minRows={3}
            value={backup}
            onChange={(e) => setBackup(e.target.value)}
          />
          <Button variant="contained" onClick={onRestore} disabled={loading}>
            {loading ? '恢复中...' : '恢复钱包'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RestoreWalletPanel;