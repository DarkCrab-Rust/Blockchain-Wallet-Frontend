import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, LinearProgress } from '@mui/material';
import AppLayout from './components/Layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { WalletProvider } from './context/WalletContext';
import { HardwareProvider } from './context/HardwareContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';
import { apiRuntime } from './services/api';
import { safeLocalStorage } from './utils/safeLocalStorage';
import { setFeatureFlag } from './utils/featureFlags';
import { normalizeApiUrl } from './utils/url';
import { Toaster } from 'react-hot-toast';
import TestAid from './test/TestAid';
import GlobalErrorListener from './components/GlobalErrorListener';

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
          minWidth: 150,
          whiteSpace: 'nowrap',
        },
        contained: {
          background: 'linear-gradient(135deg, #2EECCB 0%, #14B8A6 60%, #0F766E 100%)',
          boxShadow: '0 4px 14px 0 rgba(20, 184, 166, 0.25)',
          '&:hover': {
            background: 'linear-gradient(135deg, #26D9BA 0%, #12A89A 60%, #0C615A 100%)',
            boxShadow: '0 6px 20px 0 rgba(20, 184, 166, 0.35)',
          },
        },
        outlined: {
          borderColor: '#14B8A6',
          color: '#0F766E',
          '&:hover': {
            borderColor: '#12A89A',
            backgroundColor: 'rgba(20, 184, 166, 0.06)'
          }
        }
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
    MuiTextField: {
      defaultProps: {
        size: 'small',
        margin: 'dense',
        variant: 'outlined',
      },
    },
    MuiFormControl: {
      defaultProps: {
        margin: 'dense',
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
        input: {
          padding: '10px 12px',
        },
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
const LoginPage = React.lazy(() => import('./pages/Auth/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/Auth/SignupPage'));
const ExchangePage = React.lazy(() => import('./pages/ExchangePage/ExchangePage'));
const AssetDetailPage = React.lazy(() => import('./pages/AssetDetailPage/AssetDetailPage'));
const NewWorldPage = React.lazy(() => import('./pages/NewWorldPage/NewWorldPage'));

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

      // 自动启用 Mock 模式并校正本地钱包数据，避免用户需在控制台操作
      try {
        setFeatureFlag('mock', true);
        const raw = safeLocalStorage.getItem('mock_wallets');
        let arr: any[] | null = null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) arr = parsed;
          } catch {}
        }
        if (!arr || !Array.isArray(arr)) {
          arr = [{ id: 'demo-1', name: 'demo_wallet', quantum_safe: false }];
        }
        safeLocalStorage.setItem('mock_wallets', JSON.stringify(arr));
      } catch {}
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="bottom-center" gutter={8} toastOptions={{ duration: 3500 }} />
      <GlobalErrorListener />
      <Router>
        <AuthProvider>
          <HardwareProvider>
          <WalletProvider>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<Box sx={{ p: 2 }}><LinearProgress /></Box>}>
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                    <Route path="/exchange" element={<ProtectedRoute><ExchangePage /></ProtectedRoute>} />
                    <Route path="/asset/:symbol" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />
                    <Route path="/send" element={<ProtectedRoute><SendPage /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                    <Route path="/bridge" element={<ProtectedRoute><BridgePage /></ProtectedRoute>} />
                    <Route path="/newworld" element={<ProtectedRoute><NewWorldPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
                    <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              {/* 测试环境下集中渲染测试辅助节点 */}
              {(process.env.NODE_ENV || '').toLowerCase() === 'test' && <TestAid />}
            </AppLayout>
          </WalletProvider>
          </HardwareProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
