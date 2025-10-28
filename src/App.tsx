import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, LinearProgress } from '@mui/material';
import AppLayout from './components/Layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { WalletProvider } from './context/WalletContext';
import { HardwareProvider } from './context/HardwareContext';
import { apiRuntime } from './services/api';
import { safeLocalStorage } from './utils/safeLocalStorage';
import { normalizeApiUrl } from './utils/url';
import { Toaster } from 'react-hot-toast';

// 创建现代化主题 - 参考 blockchain.com 设计风格
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#14B8A6',
      light: '#2DD4BF',
      dark: '#0F766E',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1E293B',
      light: '#334155',
      dark: '#0F172A',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#1E293B',
    },
    h6: {
      fontWeight: 600,
      color: '#1E293B',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
        },
        contained: {
          background: 'linear-gradient(135deg, #2EECCB 0%, #14B8A6 60%, #0F766E 100%)',
          boxShadow: '0 4px 14px 0 rgba(20, 184, 166, 0.25)',
          '&:hover': {
            background: 'linear-gradient(135deg, #26D9BA 0%, #12A89A 60%, #0C615A 100%)',
            boxShadow: '0 6px 20px 0 rgba(20, 184, 166, 0.35)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #121D33 0%, #1E293B 100%)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        },
      },
    },
    // 全局禁用波纹，减少交互抖动
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiIconButton: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiSwitch: {
      defaultProps: {
        disableRipple: true,
      },
    },
    // Tooltip 全局延迟与禁用交互，减少 hover 抖动
    MuiTooltip: {
      defaultProps: {
        enterDelay: 400,
        leaveDelay: 0,
        disableInteractive: true,
      },
    },
    // Drawer 打开/关闭过渡简化，减少移动端抽屉动画带来的抖动
    MuiDrawer: {
      defaultProps: {
        transitionDuration: 0,
      },
    },
  },
});

// 替换为懒加载路由组件
const WalletPage = React.lazy(() => import('./pages/WalletPage/WalletPage'));
const SendPage = React.lazy(() => import('./pages/SendPage/SendPage'));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage/HistoryPage'));
const BridgePage = React.lazy(() => import('./pages/BridgePage/BridgePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage/SettingsPage'));

function App() {
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    const hasUrl = !!safeLocalStorage.getItem('api_url');
    const currentKey = safeLocalStorage.getItem('api_key');
    const envKey = (process.env.REACT_APP_API_KEY || '').trim();
    const envUrl = (process.env.REACT_APP_API_URL || '').trim();

    if (!hasUrl) {
      // 优先使用环境变量中的 API URL，统一确保包含 '/api'
      const normalized = normalizeApiUrl(envUrl) ?? '/api';
      apiRuntime.setBaseUrl(normalized);
    } else {
      // 若存在用户配置，优先使用该配置
      apiRuntime.setBaseUrl(safeLocalStorage.getItem('api_url')!);
    }

    // 开发环境：默认使用环境变量中的 API Key；若已是占位符则覆盖
    if (isDev) {
      if (!currentKey) {
        safeLocalStorage.setItem('api_key', envKey || 'test_api_key');
      } else if (currentKey === 'test_api_key' && envKey && envKey !== 'test_api_key') {
        safeLocalStorage.setItem('api_key', envKey);
      }
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="bottom-center" gutter={8} toastOptions={{ duration: 3500 }} />
      <Router>
        <HardwareProvider>
          <WalletProvider>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<Box sx={{ p: 2 }}><LinearProgress /></Box>}>
                  <Routes>
                    <Route path="/" element={<WalletPage />} />
                    <Route path="/send" element={<SendPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/bridge" element={<BridgePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </WalletProvider>
        </HardwareProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
