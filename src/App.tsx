import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import AppLayout from './components/Layout/AppLayout';
import WalletPage from './pages/WalletPage/WalletPage';
import SendPage from './pages/SendPage/SendPage';
import HistoryPage from './pages/HistoryPage/HistoryPage';
import BridgePage from './pages/BridgePage/BridgePage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import { WalletProvider } from './context/WalletContext';
import { apiRuntime } from './services/api';
import { safeLocalStorage } from './utils/safeLocalStorage';

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
  },
});

function App() {
  useEffect(() => {
    const defaultUrl = 'http://localhost:8888';
    const defaultKey = 'testnet_api_key_51a69b550a2c4149';
    const hasUrl = !!safeLocalStorage.getItem('api_url');
    const hasKey = !!safeLocalStorage.getItem('api_key');
    if (!hasUrl) {
      safeLocalStorage.setItem('api_url', defaultUrl);
      apiRuntime.setBaseUrl(defaultUrl);
    }
    if (!hasKey) {
      safeLocalStorage.setItem('api_key', defaultKey);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <WalletProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<WalletPage />} />
              <Route path="/send" element={<SendPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/bridge" element={<BridgePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AppLayout>
        </WalletProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
