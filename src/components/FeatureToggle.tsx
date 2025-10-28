import React from 'react';
import { Tooltip, FormControlLabel, Switch, Box, Typography } from '@mui/material';

interface FeatureToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltipTitle?: string;
  ariaLabel?: string;
  description?: string;
}

const FeatureToggle: React.FC<FeatureToggleProps> = ({ label, checked, onChange, tooltipTitle, ariaLabel, description }) => {
  return (
    <Box>
      <Tooltip title={tooltipTitle || ''}>
        <FormControlLabel 
          control={
            <Switch
              size="small"
              checked={checked}
              onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
              inputProps={{ 'aria-label': ariaLabel || label }}
            />
          } 
          label={label}
          sx={{ ml: 2, color: 'white' }}
        />
      </Tooltip>
      {description && (
        <Typography variant="caption" color="text.secondary">{description}</Typography>
      )}
    </Box>
  );
};

export default FeatureToggle;