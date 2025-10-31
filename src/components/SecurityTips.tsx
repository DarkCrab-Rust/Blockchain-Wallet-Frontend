import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { safeLocalStorage } from '../utils/safeLocalStorage';

interface Props {
  featureName: string;
}

const SecurityTips: React.FC<Props> = ({ featureName }) => {
  let coldRatio = 0.96;
  try {
    const raw = safeLocalStorage.getItem('security.coldRatio');
    if (raw) { const n = Number(raw); if (Number.isFinite(n) && n > 0 && n <= 1) coldRatio = n; }
  } catch {}

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', p: 1, borderRadius: 1 }}>
      <Tooltip title="建议为敏感操作启用双因素认证（2FA）">
        <Chip icon={<VerifiedUserIcon color="success" />} label={`2FA 建议：${featureName}`} size="small" />
      </Tooltip>
      <Tooltip title="支持设备生物识别（指纹/FaceID）作为确认提示">
        <Chip icon={<FingerprintIcon color="primary" />} label="生物识别提示" size="small" />
      </Tooltip>
      <Tooltip title="冷钱包资金占比，建议>95%">
        <Chip icon={<AcUnitIcon color="info" />} label={`冷钱包占比 ${Math.round(coldRatio*100)}%`} size="small" />
      </Tooltip>
    </Box>
  );
};

export default SecurityTips;