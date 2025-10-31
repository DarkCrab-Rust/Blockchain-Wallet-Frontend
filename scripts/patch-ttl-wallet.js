const fs=require('fs');
const p='src/pages/WalletPage/WalletPage.tsx';
let s=fs.readFileSync(p,'utf8');
const importTarget="import SwapModal from '../../components/SwapModal';";
const ttlImport="import { withTtlCache, invalidateCache } from '../../utils/ttlCache';";
if(!s.includes(ttlImport)){
  s=s.replace(importTarget, importTarget+'\n'+ttlImport);
}
const balancePattern="await walletService.getBalance(name, currentNetwork);";
const balanceReplacement=[
  "await withTtlCache(",
  "  `\"balance|${name}|${currentNetwork}\"`",
  "  10000,",
  "  async () => walletService.getBalance(name, currentNetwork)",
  ");"
].join('\n');
s=s.replace(balancePattern,balanceReplacement);
const refreshPattern="setRefreshing(true);";
const invalidateBlock=[
  "      // 主动失效当前余额缓存，确保手动刷新获取最新值",
  "      try {",
  "        const name = currentWallet ?? ctxWallets[0]?.name;",
  "        if (name) invalidateCache(`\"balance|${name}|${currentNetwork}\"`);",
  "      } catch {}"
].join('\n');
if(!s.includes(invalidateBlock)){
  s=s.replace(refreshPattern, refreshPattern+'\n'+invalidateBlock);
}
fs.writeFileSync(p,s,'utf8');
console.log('Patched WalletPage.tsx successfully');
