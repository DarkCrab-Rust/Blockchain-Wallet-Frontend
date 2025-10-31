const fs=require('fs');
const p='src/pages/HistoryPage/HistoryPage.tsx';
let s=fs.readFileSync(p,'utf8');
s=s.replace('[history, timeRange, statusFilter, searchQuery]', '[history, timeRange, statusFilter, deferredSearchQuery]');
fs.writeFileSync(p,s,'utf8');
console.log('Replaced useMemo deps to deferredSearchQuery');
