import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import '../services/api'; // 绑定axios默认配置与拦截器

type HealthState = {
  reachable: boolean | null;
  status?: number;
  latencyMs?: number;
  message?: string;
  healthPayload?: {
    status?: string;
    version?: string;
    uptime?: string;
    timestamp?: string;
  } | null;
};

const BackendHealthPanel: React.FC = () => {
  const [health, setHealth] = useState<HealthState>({ reachable: null });
  const [running, setRunning] = useState(false);

  const runHealthCheck = async () => {
    setRunning(true);
    setHealth({ reachable: null });
    const start = Date.now();
    try {
      // 优先请求 /api/health 展示版本/运行时长/时间戳
      const healthRes = await axios.get('/api/health', { validateStatus: () => true });
      const latencyMs = Date.now() - start;
      if (healthRes.status >= 200 && healthRes.status < 500) {
        setHealth({
          reachable: true,
          status: healthRes.status,
          latencyMs,
          message: healthRes.status === 200 ? '后端健康' : '后端可达（健康端点非 200）',
          healthPayload: {
            status: healthRes.data?.status,
            version: healthRes.data?.version,
            uptime: healthRes.data?.uptime,
            timestamp: healthRes.data?.timestamp,
          },
        });
        return;
      }

      // 回退：/api/auth/me（无token将返回401，但可判定后端可达）
      const res = await axios.get('/api/auth/me', { validateStatus: () => true });
      setHealth({
        reachable: true,
        status: res.status,
        latencyMs,
        message: res.status === 200 ? '后端正常' : '后端可达（可能未登录或需要凭据）',
        healthPayload: null,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      setHealth({
        reachable: false,
        latencyMs,
        message: err?.message || '网络不可达或 CORS 阻止',
        healthPayload: null,
      });
    } finally {
      setRunning(false);
    }
  };

  const statusColor = health.reachable ? 'success' : health.reachable === false ? 'error' : 'default';

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          后端健康检查
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          检查前端与后端 API 的连通性与响应状态
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={runHealthCheck}
            disabled={running}
          >
            {running ? '检查中...' : '运行健康检查'}
          </Button>

          {health.reachable !== null && (
            <Chip
              label={health.reachable ? '可达' : '不可达'}
              color={statusColor as any}
              icon={health.reachable ? <CheckCircleIcon /> : <ErrorIcon />}
            />
          )}
        </Box>

        {health.reachable !== null && (
          <Box sx={{ mt: 2 }}>
            {health.reachable ? (
              <Alert severity="success">
                {health.message}；状态码 {health.status}；延迟 {health.latencyMs}ms
                {health.healthPayload && (
                  <>
                    <br />版本：{health.healthPayload.version || '-'}
                    <br />运行时长：{health.healthPayload.uptime || '-'}
                    <br />时间戳：{health.healthPayload.timestamp || '-'}
                    <br />健康状态：{health.healthPayload.status || '-'}
                  </>
                )}
              </Alert>
            ) : (
              <Alert severity="error">
                {health.message}；延迟 {health.latencyMs}ms
              </Alert>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default BackendHealthPanel;