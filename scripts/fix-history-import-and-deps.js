const fs=require('fs');
const p='src/pages/HistoryPage/HistoryPage.tsx';
let s=fs.readFileSync(p,'utf8');
// add import for ttlCache
const ttlImport="import { withTtlCache } from '../../utils/ttlCache';";
if(!s.includes(ttlImport)){
  s=s.replace("import { walletService } from '../../services/api';", "import { walletService } from '../../services/api';\n"+ttlImport);
}
// fix useMemo deps to use deferredSearchQuery
s=s.replace(
  /\], \[history, timeRange, statusFilter, searchQuery\]\);/,
  '], [history, timeRange, statusFilter, deferredSearchQuery]);'
);
fs.writeFileSync(p,s,'utf8');
console.log('Fixed HistoryPage imports and deps');
