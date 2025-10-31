const fs = require('fs');
const p = 'src/pages/WalletPage/WalletPage.tsx';
let s = fs.readFileSync(p, 'utf8');
const insert = `
  const AnimatedNumber = ({ value, decimals = 4, duration = 800 }) => {
    const React = require('react');
    const [display, setDisplay] = React.useState(value ?? 0);
    const prev = React.useRef(value ?? 0);
    React.useEffect(() => {
      if (value == null) return;
      const start = prev.current; const end = value;
      if (!(isFinite(start) && isFinite(end))) { setDisplay(end ?? 0); prev.current = end ?? 0; return; }
      if (start === end) return;
      const startTs = performance.now(); const ease = (t) => 1 - Math.pow(1 - t, 3); let raf;
      const tick = (ts) => { const p = Math.min(1, (ts - startTs) / duration); const e = ease(p); setDisplay(start + (end - start) * e); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick); prev.current = end; return () => cancelAnimationFrame(raf);
    }, [value, duration]);
    return React.createElement(React.Fragment, null, (isFinite(display) ? display : (value ?? 0)).toFixed(decimals));
  };
`;
if (!/const\s+AnimatedNumber\s*=/.test(s)) {
  s = s.replace(/const \[assetBalances,[^;]+;\n\n/, (m) => m + insert);
}
s = s.replace(/\{\(overviewBalance \?\? 0\)\.toFixed\(4\)\}/, '<AnimatedNumber value={overviewBalance ?? 0} decimals={4} duration={800} />');
s = s.replace(/\{bal\.toFixed\(4\)\}/g, '<AnimatedNumber value={bal} decimals={4} duration={600} />');
fs.writeFileSync(p, s);
console.log('Animated number patch applied.');
