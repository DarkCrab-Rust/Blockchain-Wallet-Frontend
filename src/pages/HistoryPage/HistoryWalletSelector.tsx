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
      <InputLabel id="history-wallet-select-label">选择卡包</InputLabel>
      <Select
        labelId="history-wallet-select-label"
        id="history-wallet-select"
        value={selectedWallet}
        label="选择卡包"
        onChange={(e) => onChangeSelectedWallet(e.target.value as string)}
      >
        {(Array.isArray(wallets) ? wallets : []).map((w) => (
          <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default React.memo(HistoryWalletSelector);