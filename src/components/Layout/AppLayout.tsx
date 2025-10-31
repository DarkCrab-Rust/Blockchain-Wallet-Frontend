import React from 'react';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Drawer, 
  IconButton, 
  Toolbar, 
  Typography
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountBalanceWallet, 
  Send, 
  History, 
  SwapHoriz, 
  Settings,
  Bolt,
  ShowChart,
  SportsEsports
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { useWalletContext } from '../../context/WalletContext';

import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { setFeatureFlag } from '../../utils/featureFlags';
// 移除未使用的 MUI 切换组件与 API 服务导入
// import { FormControlLabel, Switch } from '@mui/material';
// import { systemService } from '../../services/api';

import ApiStatusIndicator from '../ApiStatusIndicator';
import SidebarMenu from './SidebarMenu';
import WalletSwitcher from '../WalletSwitcher';
import FeatureToggle from '../FeatureToggle';
import { useApiStatus } from '../../hooks/useApiStatus';
import { useApiErrorAggregator } from '../../hooks/useApiErrorAggregator';
import { eventBus } from '../../utils/eventBus';

const drawerWidth = 240;

interface AppLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { text: '卡包', icon: <AccountBalanceWallet />, path: '/' },
  { text: '交易', icon: <ShowChart />, path: '/exchange' },
  { text: '发送', icon: <Send />, path: '/send' },
  { text: '交易历史', icon: <History />, path: '/history' },
  { text: '跨链桥', icon: <SwapHoriz />, path: '/bridge' },
  // 新世界：位于“跨链桥”下方，使用游戏手柄图标
  { text: '新世界', icon: <SportsEsports sx={{
    background: 'linear-gradient(135deg, #2EECCB 0%, #14B8A6 60%, #0F766E 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  }} />, path: '/newworld' },
  { text: '设置', icon: <Settings />, path: '/settings' },
];

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  const { wallets, currentWallet, setCurrentWallet } = useWalletContext();
  // const [snackOpen, setSnackOpen] = React.useState(false);
  // const [snackMsg] = React.useState<string>('');
  // const [snackSeverity] = React.useState<'error' | 'warning' | 'info'>('error');
  // const navigate = useNavigate();
  const flags = useFeatureFlags();
  const { status: apiStatus, refresh: check } = useApiStatus(flags.useMockBackend);
  // 错误聚合与通知（Hook 内部管理 toast）
  useApiErrorAggregator();

  // 配置更新后自动触发一次状态重检（事件驱动，避免双向依赖）
  React.useEffect(() => {
    const off = eventBus.onApiConfigUpdated(() => {
      check();
    });
    return () => off();
  }, [check]);

  // 在登录/注册页隐藏侧边栏与右上角控制（钱包切换 / API 状态 / Mock 开关）
  const isAuthRoute = /^\/(login|signup)(?:$|\/?)/.test(location.pathname);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = React.useMemo(() => (
    <SidebarMenu items={menuItems} currentPath={location.pathname} />
  ), [location.pathname]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: isAuthRoute ? '100%' : `calc(100% - ${drawerWidth}px)` },
          ml: { sm: isAuthRoute ? 0 : `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              transform: 'translateY(-2px)',
              '& svg': {
                width: 32,
                height: 32,
                color: '#00D4AA',
                filter: 'none',
                shapeRendering: 'geometricPrecision'
              }
            }}>
              <Bolt />
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ 
              fontWeight: 500,
              color: 'white'
            }}>
              SecureWallet
            </Typography>
          </Box>
          {/* 登录/注册页不显示右上角控制区 */}
          {!isAuthRoute && (
            <>
              {/* 钱包快速切换下拉 */}
              <WalletSwitcher wallets={wallets || []} currentWallet={currentWallet} onChange={setCurrentWallet} />

              {/* API 状态指示器 */}
              <ApiStatusIndicator status={apiStatus} onRefresh={check} />

              <FeatureToggle 
                label="Mock 模式" 
                checked={flags.useMockBackend} 
                onChange={(checked) => setFeatureFlag('mock', checked)} 
                tooltipTitle="Mock 模式快捷开关"
                ariaLabel="切换 Mock 模式"
              />
            </>
          )}
          
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {!isAuthRoute && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
              borderRight: '1px solid #E2E8F0',
            },
          }}
        >
          {drawer}
        </Drawer>
        )}
        {!isAuthRoute && (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
              borderRight: '1px solid #E2E8F0',
              boxShadow: '4px 0 6px -1px rgba(0, 0, 0, 0.1)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: isAuthRoute ? '100%' : `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        {children}
      </Box>
      {/**
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackSeverity} onClose={() => setSnackOpen(false)} sx={{ width: '100%' }}
          action={<Button color="inherit" size="small" onClick={() => navigate('/settings')}>去设置</Button>}>
          {snackMsg || '发生错误'}
        </Alert>
      </Snackbar>
      */}
    </Box>
  );
};

export default AppLayout;