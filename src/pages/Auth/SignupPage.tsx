import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Typography, Button, InputAdornment, IconButton, Alert } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignupPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validEmail = emailRegex.test(email.trim());
  const pwdTooShort = (password || '').length < 8;
  const pwdNotStrong = !(/[a-zA-Z]/.test(password) && /[0-9]/.test(password));
  const confirmMismatch = confirm !== password;

  const canSubmit = validEmail && !pwdTooShort && !pwdNotStrong && !confirmMismatch && !loading;

  const handleSignup = async () => {
    setError(null);
    if (!canSubmit) return;
    try {
      setLoading(true);
      await register(email.trim(), password);
      const target = (location.state as any)?.from?.pathname || '/';
      navigate(target);
    } catch (e: any) {
      setError(e?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      px: 2,
      minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
    }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>创建账户</Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>使用您的电子邮件或 Google 注册</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            fullWidth
            label="电子邮件"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            error={!!email && !validEmail}
            helperText={!!email && !validEmail ? '请输入有效的邮箱地址' : ' '}
          />
          <TextField
            fullWidth
            label="创建密码"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            error={!!password && (pwdTooShort || pwdNotStrong)}
            helperText={!!password && (pwdTooShort || pwdNotStrong) ? '至少 8 位并包含字母和数字' : '至少 8 个字符'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle password visibility" onClick={() => setShowPwd((s) => !s)} edge="end">
                    {showPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="确认密码"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            margin="normal"
            error={!!confirm && confirmMismatch}
            helperText={!!confirm && confirmMismatch ? '两次输入的密码不一致' : '重新输入您的密码'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle confirm visibility" onClick={() => setShowConfirm((s) => !s)} edge="end">
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button fullWidth variant="contained" sx={{ mt: 2 }} disabled={!canSubmit} onClick={handleSignup}>
            {loading ? '处理中…' : '下一个'}
          </Button>
          <Box sx={{ textAlign: 'center', my: 2, color: 'text.secondary' }}>或者</Box>
          <Button fullWidth variant="outlined" disabled>使用 Google 账号注册</Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button component={RouterLink} to="/login">导入钱包 / 已有账户？去登录</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SignupPage;