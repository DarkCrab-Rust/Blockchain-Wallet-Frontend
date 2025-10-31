const fs=require('fs');
function fixFile(p){
  let s=fs.readFileSync(p,'utf8');
  s=s.replace(/`"balance\|\$\{name\}\|\$\{currentNetwork\}"`\n\s+10000,/g, '`"balance|${name}|${currentNetwork}"`,\n  10000,');
  s=s.replace(/`"balance\|\$\{fromWallet\}\|\$\{currentNetwork\}"`\n\s+10000,/g, '`"balance|${fromWallet}|${currentNetwork}"`,\n  10000,');
  fs.writeFileSync(p,s,'utf8');
  console.log('Fixed commas in', p);
}
fixFile('src/pages/WalletPage/WalletPage.tsx');
fixFile('src/pages/SendPage/SendPage.tsx');
