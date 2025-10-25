import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Wallet } from '../../types';

interface HistoryWalletSelectorProps {
  wallets: Wallet[];
  selectedWallet: string;
  onChangeSelectedWallet: (value: string) => void;
}

const HistoryWalletSelector: React.FC<HistoryWalletSelectorProps> = ({ wallets, selectedWallet, onChangeSelectedWallet }) => {
  return (
    <FormControl fullWidth>
      <InputLabel>选择钱包</InputLabel>
      <Select
        value={selectedWallet}
        label="选择钱包"
        onChange={(e) => onChangeSelectedWallet(e.target.value as string)}
      >
        {wallets.map((w) => (
          <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default HistoryWalletSelector;