import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { walletService, systemService, apiRuntime } from '../../services/api';
import { Wallet } from '../../types';
import { ReactComponent as PadlockEyeIcon } from '../../assets/icons/padlock-eye.svg';
import { useWalletContext } from '../../context/WalletContext';
import { safeLocalStorage } from '../../utils/safeLocalStorage';

const SettingsPage: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { currentWallet, setCurrentWallet } = useWalletContext();

  // API 配置本地状态
  const [apiUrl, setApiUrl] = useState<string>(() => safeLocalStorage.getItem('api_url') || process.env.REACT_APP_API_URL || 'http://localhost:8888');
  const [apiKey, setApiKey] = useState<string>(() => safeLocalStorage.getItem('api_key') || (process.env.REACT_APP_API_KEY as string) || 'test_api_key');
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkMessage, setCheckMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // 备份/恢复/轮换 状态
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreName, setRestoreName] = useState('');
  const [restoreData, setRestoreData] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotateLoading, setRotateLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // 冒烟测试状态
  const [smokeLoading, setSmokeLoading] = useState(false);
  const [smokeLogs, setSmokeLogs] = useState<string[]>([]);
  // 发送阶段配置
  const [sendMode, setSendMode] = useState<'skip' | 'mock' | 'real'>('skip');
  const [sendAmount, setSendAmount] = useState<number>(0.01);
  const [sendTo, setSendTo] = useState<string>('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
  // 新增：网络选择（目前仅支持 eth）
  const [network, setNetwork] = useState<'eth'>('eth');

  const isValidEthAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
  const appendLog = (line: string) => setSmokeLogs((prev) => [...prev, line]);

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(smokeLogs.join('\n'));
      setCheckMessage({ ok: true, text: '日志已复制到剪贴板' });
    } catch (e: any) {
      setCheckMessage({ ok: false, text: e?.message || '复制失败' });
    }
  };
  const handleClearLogs = () => setSmokeLogs([]);

  const reloadWallets = async () => {
    try {
      const data = await walletService.listWallets();
      setWallets(data);
      if (currentWallet) {
        setSelectedWallet(currentWallet);
      } else if (data.length > 0) {
        setSelectedWallet(data[0].name);
      }
    } catch (err) {
      console.error('获取钱包列表失败:', err);
      setError('获取钱包列表失败，请检查API连接');
    }
  };

  useEffect(() => {
    reloadWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWallet]);

  // 保存 API 配置
  const handleSaveApiConfig = () => {
    try {
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        setCheckMessage({ ok: false, text: 'API URL 需以 http:// 或 https:// 开头' });
        return;
      }
      safeLocalStorage.setItem('api_url', apiUrl);
      safeLocalStorage.setItem('api_key', apiKey);
      apiRuntime.setBaseUrl(apiUrl);
      setCheckMessage({ ok: true, text: '已保存 API 配置' });
    } catch (e: any) {
      setCheckMessage({ ok: false, text: e?.message || '保存失败' });
    }
  };

  // 连通性检查
  const handleCheckConnectivity = async () => {
    setCheckLoading(true);
    setCheckMessage(null);
    try {
      apiRuntime.setBaseUrl(apiUrl);
      safeLocalStorage.setItem('api_key', apiKey);
      const res = await systemService.healthCheck();
      const status = (res && (res as any).status) || 'ok';
      setCheckMessage({ ok: true, text: `连通性正常：${status}` });
    } catch (e: any) {
      const msg = e?.message || '连通性检查失败';
      setCheckMessage({ ok: false, text: msg });
    } finally {
      setCheckLoading(false);
    }
  };

  // 一键冒烟测试：创建钱包 -> 列表 -> 余额 -> 发送交易 -> 历史
  const handleRunSmokeTest = async () => {
    setSmokeLoading(true);
    setSmokeLogs([]);
    try {
      // 确保使用当前设置
      apiRuntime.setBaseUrl(apiUrl);
      safeLocalStorage.setItem('api_key', apiKey);

      const ts = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const name = `smoke_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;

      appendLog(`创建钱包：${name}`);
      const wallet = await walletService.createWallet({ name, quantum_safe: false });
      appendLog(`✓ 创建成功（id=${wallet.id}）`);

      appendLog('获取钱包列表…');
      const list = await walletService.listWallets();
      const exists = list.some((w) => w.name === name);
      appendLog(exists ? '✓ 列表包含新钱包' : '× 列表未包含新钱包');

      appendLog(`查询余额（${network}）…`);
      const bal = await walletService.getBalance(name, network);
      appendLog(`✓ 余额：${bal.balance} ${bal.currency || ''}`.trim());

      const balNum = Number.parseFloat(String((bal as any)?.balance ?? '0'));
      const amtValid = Number.isFinite(sendAmount) && sendAmount > 0;
      const canSend = Number.isFinite(balNum) && balNum > sendAmount && amtValid;

      if (sendMode === 'skip') {
        appendLog('发送阶段跳过（send=skip）');
      } else if (sendMode === 'mock') {
        appendLog('发送阶段模拟（测试/桩环境不执行真实交易）');
      } else if (sendMode === 'real') {
        appendLog(`发送小额交易（${network} ${sendAmount}）到示例地址…`);
        if (!amtValid) {
          appendLog('! 跳过发送：金额无效或未设置');
        } else if (!isValidEthAddress(sendTo)) {
          appendLog('! 跳过发送：收款地址无效');
        } else if (!canSend) {
          appendLog('! 跳过发送：余额不足或无效金额');
        } else {
          try {
            const tx = await walletService.sendTransaction(name, { to_address: sendTo, amount: sendAmount });
            appendLog(`✓ 发送成功：tx_hash=${tx.tx_hash}`);
          } catch (e: any) {
            appendLog(`! 发送交易失败：${e?.message || e?.toString?.() || '未知错误'}`);
          }
        }
      }

      appendLog('获取交易历史…');
      try {
        const hist = await walletService.getTransactionHistory(name, { network, limit: 10 });
        appendLog(`✓ 历史记录条数：${hist.transactions?.length ?? 0}`);
      } catch (e: any) {
        appendLog(`! 获取历史失败：${e?.message || '未知错误'}`);
      }

      appendLog('冒烟测试完成');
    } catch (e: any) {
      appendLog(`× 冒烟测试中断：${e?.message || '未知错误'}`);
    } finally {
      setSmokeLoading(false);
    }
  };

  // 备份下载
  const handleDownloadBackup = async () => {
    if (!selectedWallet) {
      setActionMessage({ ok: false, text: '请先选择需要备份的钱包' });
      return;
    }
    setBackupLoading(true);
    setActionMessage(null);
    try {
      const res = await walletService.backupWallet(selectedWallet);
      const content = res?.backup_data || '';
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      const ts = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fname = `${selectedWallet}_backup_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setActionMessage({ ok: true, text: '备份已下载' });
    } catch (e: any) {
      setActionMessage({ ok: false, text: e?.message || '备份失败' });
    } finally {
      setBackupLoading(false);
    }
  };

  // 恢复钱包
  const handleConfirmRestore = async () => {
    if (!restoreName || !restoreData) {
      setActionMessage({ ok: false, text: '请输入钱包名称与备份数据' });
      return;
    }
    setRestoreLoading(true);
    setActionMessage(null);
    try {
      const w = await walletService.restoreWallet({ name: restoreName, backup_data: restoreData });
      setActionMessage({ ok: true, text: `恢复成功：${w.name}` });
      setRestoreOpen(false);
      setRestoreName('');
      setRestoreData('');
      await reloadWallets();
      setCurrentWallet(w.name);
      setSelectedWallet(w.name);
    } catch (e: any) {
      setActionMessage({ ok: false, text: e?.message || '恢复失败' });
    } finally {
      setRestoreLoading(false);
    }
  };

  // 轮换密钥
  const handleConfirmRotate = async () => {
    if (!selectedWallet) {
      setActionMessage({ ok: false, text: '请先选择钱包' });
      return;
    }
    setRotateLoading(true);
    setActionMessage(null);
    try {
      const res = await walletService.rotateSigningKey(selectedWallet);
      const msg = (res && (res as any).message) || '轮换成功';
      setActionMessage({ ok: true, text: msg });
      setRotateOpen(false);
    } catch (e: any) {
      setActionMessage({ ok: false, text: e?.message || '轮换失败' });
    } finally {
      setRotateLoading(false);
    }
  };

  const runSmokeTestRef = React.useRef(handleRunSmokeTest);
  runSmokeTestRef.current = handleRunSmokeTest;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingUrl = params.get('apiUrl');
    const incomingKey = params.get('apiKey');
    if (incomingUrl) {
      setApiUrl(incomingUrl);
      safeLocalStorage.setItem('api_url', incomingUrl);
      apiRuntime.setBaseUrl(incomingUrl);
    }
    if (incomingKey) {
      setApiKey(incomingKey);
      safeLocalStorage.setItem('api_key', incomingKey);
    }
    const incomingSend = params.get('send');
    const incomingAmount = params.get('sendAmount');
    const incomingTo = params.get('sendTo');
    const incomingNetwork = params.get('network');
    if (incomingSend && (incomingSend === 'skip' || incomingSend === 'mock' || incomingSend === 'real')) {
      setSendMode(incomingSend as 'skip' | 'mock' | 'real');
    }
    if (incomingAmount) {
      const val = parseFloat(incomingAmount);
      if (Number.isFinite(val) && val > 0) setSendAmount(val);
    }
    if (incomingTo) setSendTo(incomingTo);
    if (incomingNetwork && incomingNetwork.toLowerCase() === 'eth') setNetwork('eth');

    const auto = params.get('autoSmoke');
    if (auto && auto !== '0' && auto !== 'false') {
      setTimeout(() => {
        runSmokeTestRef.current();
      }, 300);
    }
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PadlockEyeIcon style={{ width: 24, height: 24 }} />
        <Typography variant="h4" gutterBottom>设置</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* API 基础设置 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>API 基础设置</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="API URL"
                placeholder="如：https://api.example.com"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                helperText="用于请求后端的基础地址，保存后全局生效"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="API Key"
                placeholder="认证密钥"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                helperText="将作为 Authorization 发送"
              />
            </Grid>
            <Grid item xs={12} display="flex" gap={1}>
              <Button variant="contained" color="primary" onClick={handleSaveApiConfig}>
                保存
              </Button>
              <Button variant="outlined" onClick={handleCheckConnectivity} disabled={checkLoading}>
                {checkLoading ? '检查中…' : '检查连通性'}
              </Button>
              <Button variant="outlined" color="secondary" onClick={handleRunSmokeTest} disabled={smokeLoading}>
                {smokeLoading ? '冒烟中…' : '一键冒烟测试'}
              </Button>
              <Button variant="text" onClick={handleCopyLogs} disabled={!smokeLogs.length}>复制日志</Button>
              <Button variant="text" onClick={handleClearLogs} disabled={!smokeLogs.length}>清空日志</Button>
            </Grid>
            {/* 发送阶段与参数配置 */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>发送阶段</InputLabel>
                <Select value={sendMode} label="发送阶段" onChange={(e) => setSendMode(e.target.value as any)}>
                  <MenuItem value="skip">跳过</MenuItem>
                  <MenuItem value="mock">模拟</MenuItem>
                  <MenuItem value="real">真实</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>网络</InputLabel>
                <Select value={network} label="网络" onChange={(e) => setNetwork(e.target.value as any)}>
                  <MenuItem value="eth">eth</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="发送金额 (ETH)" type="number" inputProps={{ step: '0.001', min: 0 }} value={sendAmount} onChange={(e) => setSendAmount(parseFloat(e.target.value))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="收款地址" value={sendTo} onChange={(e) => setSendTo(e.target.value)} />
            </Grid>
            {checkMessage && (
              <Grid item xs={12}>
                <Alert severity={checkMessage.ok ? 'success' : 'error'} onClose={() => setCheckMessage(null)}>
                  {checkMessage.text}
                </Alert>
              </Grid>
            )}
            {smokeLogs.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ whiteSpace: 'pre-wrap' }}>
                  {smokeLogs.join('\n')}
                </Alert>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* 备份与恢复 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>钱包备份与恢复</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <FormControl fullWidth>
                <InputLabel>选择备份/轮换的钱包</InputLabel>
                <Select
                  label="选择备份/轮换的钱包"
                  value={selectedWallet}
                  onChange={(e) => {
                    const name = e.target.value as string;
                    setSelectedWallet(name);
                    setCurrentWallet(name);
                  }}
                >
                  {wallets.map((wallet) => (
                    <MenuItem key={wallet.id} value={wallet.name}>
                      {wallet.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4} display="flex" alignItems="center" gap={1}>
              <Button variant="outlined" onClick={handleDownloadBackup} disabled={backupLoading || !selectedWallet}>
                {backupLoading ? '备份中…' : '下载备份'}
              </Button>
              <Button variant="contained" color="primary" onClick={() => setRestoreOpen(true)}>
                恢复钱包
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                备份文件请妥善保存。恢复前请确认来源可靠，避免粘贴来路不明的数据。
              </Alert>
            </Grid>
            {actionMessage && (
              <Grid item xs={12}>
                <Alert severity={actionMessage.ok ? 'success' : 'error'} onClose={() => setActionMessage(null)}>
                  {actionMessage.text}
                </Alert>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* 签名密钥轮换 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>签名密钥轮换</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" color="text.secondary">
                轮换后将为所选钱包生成新的签名密钥。请确保您已备份钱包（如需）。
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} display="flex" justifyContent="flex-end">
              <Button variant="contained" color="warning" onClick={() => setRotateOpen(true)} disabled={!selectedWallet}>
                轮换签名密钥
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 默认钱包设置（原有） */}
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>默认钱包</InputLabel>
                <Select
                  label="默认钱包"
                  value={selectedWallet}
                  onChange={(e) => {
                    const name = e.target.value as string;
                    setSelectedWallet(name);
                    setCurrentWallet(name);
                  }}
                >
                  {wallets.map((wallet) => (
                    <MenuItem key={wallet.id} value={wallet.name}>
                      {wallet.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                当前页面使用导航栏选择的全局钱包作为默认值，仍可在此手动调整。
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 恢复钱包对话框 */}
      <Dialog open={restoreOpen} onClose={() => !restoreLoading && setRestoreOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>恢复钱包</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="钱包名称"
              value={restoreName}
              onChange={(e) => setRestoreName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="备份数据（粘贴内容）"
              value={restoreData}
              onChange={(e) => setRestoreData(e.target.value)}
              fullWidth
              multiline
              minRows={6}
              placeholder="粘贴 backup_data 字符串或JSON"
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreOpen(false)} disabled={restoreLoading}>取消</Button>
          <Button variant="contained" onClick={handleConfirmRestore} disabled={restoreLoading}>
            {restoreLoading ? '恢复中…' : '确认恢复'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 轮换确认对话框 */}
      <Dialog open={rotateOpen} onClose={() => !rotateLoading && setRotateOpen(false)}>
        <DialogTitle>确认轮换签名密钥</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            将为钱包“{selectedWallet || '未选择'}”轮换签名密钥。此操作不可逆，请确保已完成必要备份。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRotateOpen(false)} disabled={rotateLoading}>取消</Button>
          <Button color="warning" variant="contained" onClick={handleConfirmRotate} disabled={rotateLoading || !selectedWallet}>
            {rotateLoading ? '处理中…' : '确认轮换'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;