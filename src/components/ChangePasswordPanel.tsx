import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { changePassword } from '../services/auth';
import { Snackbar } from '@mui/material';

const ChangePasswordPanel: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  // 密码强度验证
  const pwdTooShort = (newPassword || '').length > 0 && (newPassword || '').length < 8;
  const pwdNotStrong = (newPassword || '').length > 0 && !(/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword));
  const confirmMismatch = confirmPassword !== newPassword && confirmPassword.length > 0;

  const canSubmit = 
    currentPassword.trim() && 
    newPassword.trim() && 
    confirmPassword.trim() && 
    !pwdTooShort && 
    !pwdNotStrong && 
    !confirmMismatch && 
    !loading;

  const handleChangePassword = async () => {
    if (!canSubmit) return;
    
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('密码修改成功！');
      setSuccessOpen(true);
      // 清空表单
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e?.message || '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          修改密码
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          为了账户安全，请定期更换密码
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Snackbar
          open={successOpen}
          autoHideDuration={3000}
          onClose={() => { setSuccessOpen(false); setSuccess(null); }}
          message={success || ''}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="当前密码"
            type={showCurrentPwd ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle current password visibility"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    edge="end"
                  >
                    {showCurrentPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="新密码"
            type={showNewPwd ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={pwdTooShort || pwdNotStrong}
            helperText={
              pwdTooShort
                ? '密码长度至少8位'
                : pwdNotStrong
                ? '密码需包含字母和数字'
                : '至少8个字符，包含字母和数字'
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle new password visibility"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    edge="end"
                  >
                    {showNewPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="确认新密码"
            type={showConfirmPwd ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmMismatch}
            helperText={confirmMismatch ? '两次输入的密码不一致' : '重新输入新密码'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    edge="end"
                  >
                    {showConfirmPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={!canSubmit}
            sx={{ alignSelf: 'flex-start', mt: 1 }}
          >
            {loading ? '修改中...' : '修改密码'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordPanel;