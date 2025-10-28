import React from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import { Link } from 'react-router-dom';

export interface MenuItemDef {
  text: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarMenuProps {
  items: MenuItemDef[];
  currentPath: string;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({ items, currentPath }) => {
  return (
    <div>
      <Toolbar sx={{ 
        background: 'linear-gradient(135deg, #121D33 0%, #1E293B 100%)',
        color: 'white',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <span style={{
          fontWeight: 700,
          background: 'linear-gradient(135deg, #00D4AA 0%, #33DDBB 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '1rem'
        }}>🔐 SecureWallet</span>
      </Toolbar>
      <List sx={{ pt: 2, px: 1 }}>
        {items.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              component={Link} 
              to={item.path}
              selected={currentPath === item.path}
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
                color: currentPath === item.path ? 'white' : '#64748B'
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ 
                  '& .MuiTypography-root': { 
                    fontWeight: currentPath === item.path ? 600 : 500,
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
};

export default React.memo(SidebarMenu);