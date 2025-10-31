const fs=require('fs');
const p='src/pages/NewWorldPage/NewWorldPage.tsx';
let s=fs.readFileSync(p,'utf8');

// 1) Replace bindingsKey + bindings useMemo with state + readBindings
const newBindingsBlock = `const bindingsKey = React.useMemo(() => 'game_bindings', []);
const [bindingsVersion, setBindingsVersion] = React.useState(0);

const readBindings = React.useCallback((): Record<string, string[]> => {
  try {
    const raw = safeLocalStorage.getItem(bindingsKey) || '{}';
    const val = JSON.parse(raw);
    return typeof val === 'object' && val ? val : {};
  } catch {
    return {};
  }
}, [bindingsKey]);`;
s=s.replace(/const bindingsKey[^]*?\}, \[bindingsKey\]\);/, newBindingsBlock);

// 2) Replace isBound to read from localStorage via readBindings
s=s.replace(/const isBound = \(gameName: string\) => \{[^]*?\};/,
`const isBound = (gameName: string) => {
  const wallet = currentWallet || 'demo_wallet';
  const map = readBindings();
  const arr = map[wallet] || [];
  return arr.includes(gameName);
};`);

// 3) Replace bindGame to use readBindings and bump version
s=s.replace(/const bindGame = \(gameName: string\) => \{[^]*?\};/,
`const bindGame = (gameName: string) => {
  if (!currentWallet) {
    toast.error('请先选择或创建钱包');
    return;
  }
  // 模拟签名绑定
  const wallet = currentWallet;
  const next = { ...readBindings() };
  const arr = new Set(next[wallet] || []);
  arr.add(gameName);
  next[wallet] = Array.from(arr);
  safeLocalStorage.setItem(bindingsKey, JSON.stringify(next));
  toast.success(\`已绑定 \${gameName}（钱包：\${wallet}）\`);
  setBindingsVersion(v => v + 1);
};`);

// 4) Insert unbindGame and handleUnbindClick before enterGame definition
s=s.replace(/\n\s*const enterGame = \(gameName: string\) => \{/,
`
  const unbindGame = (gameName: string) => {
    if (!currentWallet) {
      toast.error('请先选择或创建钱包');
      return;
    }
    const wallet = currentWallet;
    const next = { ...readBindings() };
    const arr = new Set(next[wallet] || []);
    arr.delete(gameName);
    next[wallet] = Array.from(arr);
    safeLocalStorage.setItem(bindingsKey, JSON.stringify(next));
    toast.success(\`已解除绑定 \${gameName}（钱包：\${wallet}）\`);
    setBindingsVersion(v => v + 1);
  };

  const handleUnbindClick = (gameName: string) => {
    const ok = window.confirm('是否要解除绑定？');
    if (ok) {
      unbindGame(gameName);
    }
  };

  const enterGame = (gameName: string) => {`);

// 5) Make the bound Chip clickable and unbind on click
s=s.replace(
  /<Chip label="已绑定"[^>]*\/>/,
  '<Chip label="已绑定" color="success" size="small" clickable onClick={() => handleUnbindClick(g.name)} sx={{ mr: 1 }} />'
);

fs.writeFileSync(p,s,'utf8');
console.log('Patched NewWorldPage: unbind with confirm and reactive status');
