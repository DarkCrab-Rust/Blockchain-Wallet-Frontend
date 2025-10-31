import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { Wallet } from '../types';

interface WalletSwitcherProps {
  wallets: Wallet[];
  currentWallet: string | null;
  onChange: (name: string | null) => void;
}

const WalletSwitcher: React.FC<WalletSwitcherProps> = ({ wallets, currentWallet, onChange }) => {
  return (
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
      <InputLabel>当前卡包</InputLabel>
      <Select
        value={currentWallet || ''}
        label="当前卡包"
        onChange={(e) => onChange((e.target as HTMLInputElement).value || null)}
      >
        {(wallets || []).map((w) => (
          <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default React.memo(WalletSwitcher);