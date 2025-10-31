import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Typography, Button, InputAdornment, IconButton, Alert } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = !!email.trim() && !!password && !loading;

  const handleLogin = async () => {
    setError(null);
    if (!canSubmit) return;
    try {
      setLoading(true);
      await login(email.trim(), password);
      const target = (location.state as any)?.from?.pathname || '/';
      navigate(target);
    } catch (e: any) {
      setError(e?.message || '登录失败');
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
      // 近似扣除顶部 AppBar 高度，保证视区内垂直居中
      minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
    }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>欢迎回来</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            fullWidth
            label="电子邮件或钱包 ID"
            placeholder="输入您的电子邮件或钱包 ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="密码"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
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
          <Button fullWidth variant="contained" sx={{ mt: 2 }} disabled={!canSubmit} onClick={handleLogin}>
            {loading ? '处理中…' : '继续'}
          </Button>
          <Box sx={{ textAlign: 'center', my: 2, color: 'text.secondary' }}>或者</Box>
          <Button fullWidth variant="outlined" disabled>使用 Google 登录</Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button component={RouterLink} to="/signup">没有账户？去创建</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;