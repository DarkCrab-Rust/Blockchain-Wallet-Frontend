import React from 'react';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem 
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountBalanceWallet, 
  Send, 
  History, 
  SwapHoriz, 
  Settings,
  Bolt
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useWalletContext } from '../../context/WalletContext';

const drawerWidth = 240;

interface AppLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { text: '钱包', icon: <AccountBalanceWallet />, path: '/' },
  { text: '发送', icon: <Send />, path: '/send' },
  { text: '交易历史', icon: <History />, path: '/history' },
  { text: '跨链桥', icon: <SwapHoriz />, path: '/bridge' },
  { text: '设置', icon: <Settings />, path: '/settings' },
];

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  const { wallets, currentWallet, setCurrentWallet } = useWalletContext();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar sx={{ 
        background: 'linear-gradient(135deg, #121D33 0%, #1E293B 100%)',
        color: 'white',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="h6" noWrap component="div" sx={{ 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #00D4AA 0%, #33DDBB 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          🔐 SecureWallet
        </Typography>
      </Toolbar>
      <List sx={{ pt: 2, px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              component={Link} 
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                mx: 1,
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #00D4AA 0%, #33DDBB 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00A085 0%, #00D4AA 100%)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(0, 212, 170, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ 
                minWidth: 40,
                color: location.pathname === item.path ? 'white' : '#64748B'
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ 
                  '& .MuiTypography-root': { 
                    fontWeight: location.pathname === item.path ? 600 : 500,
                    fontSize: '0.95rem'
                  } 
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
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
          {/* 钱包快速切换下拉 */}
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: 180,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#00D4AA',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-focused': {
                  color: '#00D4AA',
                },
              },
              '& .MuiSelect-select': {
                color: 'white',
              },
              '& .MuiSelect-icon': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
            }}
          >
            <InputLabel>当前钱包</InputLabel>
            <Select
              value={currentWallet || ''}
              label="当前钱包"
              onChange={(e) => setCurrentWallet(e.target.value || null)}
            >
              {wallets.map((w) => (
                <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
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
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;