import React from 'react';
import { Card, CardContent, Typography, TextField, InputAdornment, IconButton, Box, Button, Alert } from '@mui/material';
import Grid from '@mui/material/Grid';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import RuntimeConfigBanner from './RuntimeConfigBanner';
import { useApiConfig } from '../hooks/useApiConfig';

const ApiConfigPanel: React.FC = () => {
  const {
    apiUrl,
    setApiUrl,
    apiKey,
    setApiKey,
    apiUrlErr,
    apiKeyErr,
    clearApiUrlErr,
    clearApiKeyErr,
    isTestingConnection,
    successMsg,
    saveConfig,
    testConnectivity,
    clearSensitive,
  } = useApiConfig();
  const [showApiKey, setShowApiKey] = React.useState<boolean>(false);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>API 基础设置</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth
              label="API URL"
              placeholder="如：http://localhost:8888"
              value={apiUrl}
              onChange={(e) => {
                setApiUrl(e.target.value);
                if (apiUrlErr) clearApiUrlErr();
              }}
              onBlur={saveConfig}
              error={!!apiUrlErr}
              helperText={apiUrlErr || '支持 http/https，自动添加协议前缀'}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="API Key"
              placeholder="认证密钥"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (apiKeyErr) clearApiKeyErr();
              }}
              onBlur={saveConfig}
              error={!!apiKeyErr}
              helperText={apiKeyErr || '用于API认证的密钥'}
              type={showApiKey ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="显示/隐藏 API Key"
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
        </Grid>

        {/* 运行时配置展示 */}
        <RuntimeConfigBanner />

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button 
            variant="contained" 
            onClick={saveConfig}
          >
            保存配置
          </Button>
          <Button 
            variant="outlined" 
            onClick={testConnectivity}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? '测试中...' : '测试连接'}
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={clearSensitive}
          >
            清除配置
          </Button>
        </Box>

        {successMsg && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {successMsg}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiConfigPanel;