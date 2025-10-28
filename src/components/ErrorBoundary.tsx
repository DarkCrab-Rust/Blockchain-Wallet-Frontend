import React from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 可扩展：上报错误到监控
    // console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    try {
      // 清除可能导致异常的本地开关或缓存
      localStorage.removeItem('feature_mock');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}
            action={<Button color="inherit" size="small" onClick={this.handleReload}>刷新页面</Button>}>
            <AlertTitle>页面出现错误</AlertTitle>
            {this.state.error?.message || '发生未知错误，请刷新重试'}
          </Alert>
        </Box>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;