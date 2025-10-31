import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, Box, Button, Chip, FormControlLabel, Switch, Alert } from '@mui/material';
import { safeLocalStorage } from '../utils/safeLocalStorage';

type RiskPolicy = {
  enableDetection: boolean;
  blockLevels: string[]; // values: low | medium | high | critical
  allowOverrideSend: boolean; // 如果为真，高危时允许用户继续
};

const DEFAULT_POLICY: RiskPolicy = {
  enableDetection: true,
  blockLevels: ['high', 'critical'],
  allowOverrideSend: false,
};

const LEVELS: { label: string; value: string; color: 'default' | 'success' | 'warning' | 'error' }[] = [
  { label: 'Low', value: 'low', color: 'success' },
  { label: 'Medium', value: 'medium', color: 'warning' },
  { label: 'High', value: 'high', color: 'error' },
  { label: 'Critical', value: 'critical', color: 'error' },
];

const storageKey = 'risk.policy';

const RiskPolicyPanel: React.FC = () => {
  const [policy, setPolicy] = useState<RiskPolicy>(DEFAULT_POLICY);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const raw = safeLocalStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setPolicy({ ...DEFAULT_POLICY, ...parsed });
      } catch {}
    }
  }, []);

  const selectedSet = useMemo(() => new Set(policy.blockLevels.map((l) => l.toLowerCase())), [policy.blockLevels]);

  const toggleLevel = (lvl: string) => {
    const v = lvl.toLowerCase();
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v); else next.add(v);
    setPolicy((p) => ({ ...p, blockLevels: Array.from(next) }));
  };

  const save = () => {
    try {
      safeLocalStorage.setItem(storageKey, JSON.stringify(policy));
      setSavedMsg('风险策略已保存');
      setTimeout(() => setSavedMsg(null), 3000);
    } catch {}
  };

  const reset = () => {
    setPolicy(DEFAULT_POLICY);
    safeLocalStorage.setItem(storageKey, JSON.stringify(DEFAULT_POLICY));
    setSavedMsg('已恢复默认策略');
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>风险策略</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          配置前端在发送交易前的风险判定与阻断策略
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 2 }}>
          <FormControlLabel
            control={<Switch checked={policy.enableDetection} onChange={(e) => setPolicy({ ...policy, enableDetection: e.target.checked })} />}
            label="启用风险检测"
          />
          <FormControlLabel
            control={<Switch checked={policy.allowOverrideSend} onChange={(e) => setPolicy({ ...policy, allowOverrideSend: e.target.checked })} />}
            label="允许高危覆盖发送"
          />
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>拦截级别</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {LEVELS.map((lvl) => (
            <Chip
              key={lvl.value}
              label={lvl.label}
              color={selectedSet.has(lvl.value) ? lvl.color : 'default'}
              variant={selectedSet.has(lvl.value) ? 'filled' : 'outlined'}
              onClick={() => toggleLevel(lvl.value)}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button variant="contained" onClick={save}>保存策略</Button>
          <Button variant="outlined" color="error" onClick={reset}>恢复默认</Button>
        </Box>

        {savedMsg && (
          <Alert severity="success" sx={{ mt: 2 }}>{savedMsg}</Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskPolicyPanel;