import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { runAuthIntegrationTest, TestResult } from '../utils/authIntegrationTest';

const AuthTestPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ passed: number; total: number } | null>(null);

  const handleRunTests = async () => {
    setTesting(true);
    setResults([]);
    setSummary(null);

    try {
      const testResults = await runAuthIntegrationTest();
      setResults(testResults);
      
      const passed = testResults.filter(r => r.success).length;
      const total = testResults.length;
      setSummary({ passed, total });
    } catch (error: any) {
      console.error('测试运行失败:', error);
      setResults([{
        test: '测试运行',
        success: false,
        message: error.message || '测试运行失败'
      }]);
      setSummary({ passed: 0, total: 1 });
    } finally {
      setTesting(false);
    }
  };

  const getStatusColor = (success: boolean) => success ? 'success' : 'error';
  const getStatusIcon = (success: boolean) => success ? <CheckCircleIcon /> : <ErrorIcon />;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          前后端认证集成测试
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          测试所有认证功能的前后端集成，包括注册、登录、获取用户、修改密码、登出等
        </Typography>

        <Button
          variant="contained"
          startIcon={testing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          onClick={handleRunTests}
          disabled={testing}
          sx={{ mb: 3 }}
        >
          {testing ? '测试中...' : '运行集成测试'}
        </Button>

        {summary && (
          <Alert 
            severity={summary.passed === summary.total ? 'success' : 'warning'} 
            sx={{ mb: 2 }}
          >
            测试完成: {summary.passed}/{summary.total} 项通过
            {summary.passed === summary.total ? ' 🎉 所有测试通过！' : ' ⚠️ 部分测试失败'}
          </Alert>
        )}

        {results.length > 0 && (
          <Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              测试结果详情
            </Typography>
            <List>
              {results.map((result, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {getStatusIcon(result.success)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight={500}>
                          {result.test}
                        </Typography>
                        <Chip
                          label={result.success ? '通过' : '失败'}
                          color={getStatusColor(result.success)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={result.message}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {testing && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              正在运行测试，请稍候...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthTestPanel;