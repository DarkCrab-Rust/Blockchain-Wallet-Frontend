const fs=require('fs');
const p='src/pages/SendPage/SendPage.tsx';
let s=fs.readFileSync(p,'utf8');
const ttlImport="import { withTtlCache } from '../../utils/ttlCache';";
if(!s.includes(ttlImport)){
  s=s.replace("import { walletService } from '../../services/api';", "import { walletService } from '../../services/api';\n"+ttlImport);
}
const balancePattern="const res = await walletService.getBalance(fromWallet, currentNetwork);";
const balanceReplacement=[
  "const res = await withTtlCache(",
  "  `\"balance|${fromWallet}|${currentNetwork}\"`",
  "  10000,",
  "  async () => walletService.getBalance(fromWallet, currentNetwork)",
  ");"
].join('\n');
s=s.replace(balancePattern,balanceReplacement);
fs.writeFileSync(p,s,'utf8');
console.log('Patched SendPage.tsx successfully');
