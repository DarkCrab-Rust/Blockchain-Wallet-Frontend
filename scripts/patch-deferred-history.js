const fs=require('fs');
const p='src/pages/HistoryPage/HistoryPage.tsx';
let s=fs.readFileSync(p,'utf8');
// 1) insert deferred value after search state
const searchState="const [searchQuery, setSearchQuery] = useState<string>('');";
const deferredDecl="  const deferredSearchQuery = React.useDeferredValue(searchQuery);";
if(!s.includes(deferredDecl.trim())){
  s=s.replace(searchState, searchState+'\n'+deferredDecl);
}
// 2) update dependency for page reset effect
s=s.replace(
  /\[timeRange, statusFilter, searchQuery, currentNetwork, selectedWallet\]/,
  '[timeRange, statusFilter, deferredSearchQuery, currentNetwork, selectedWallet]'
);
// 3) use deferred value in filtering
s=s.replace(
  /if \(searchQuery\.trim\(\)\) \{\n\s+const q = searchQuery\.trim\(\)\.toLowerCase\(\);/,
  'if (deferredSearchQuery.trim()) {\n      const q = deferredSearchQuery.trim().toLowerCase();'
);
// 4) update displayHistory memo deps
s=s.replace(
  /\], \[history, timeRange, statusFilter, searchQuery\]\);/,
  '], [history, timeRange, statusFilter, deferredSearchQuery]);'
);
fs.writeFileSync(p,s,'utf8');
console.log('Patched HistoryPage.tsx with deferred search');
