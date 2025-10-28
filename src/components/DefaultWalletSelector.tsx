import React from 'react';
import { Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useWalletContext } from '../context/WalletContext';

const DefaultWalletSelector: React.FC = () => {
  const { wallets, currentWallet, setCurrentWallet } = useWalletContext();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>默认钱包</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>选择默认钱包</InputLabel>
              <Select
                label="选择默认钱包"
                value={currentWallet ?? ''}
                onChange={(e) => {
                  const name = e.target.value as string;
                  setCurrentWallet(name);
                }}
              >
                {(Array.isArray(wallets) ? wallets : []).map((wallet) => (
                  <MenuItem key={wallet.id} value={wallet.name}>
                    {wallet.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              选择一个钱包作为默认钱包，将在应用启动时自动选中。
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default DefaultWalletSelector;