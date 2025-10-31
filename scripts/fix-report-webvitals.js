const fs=require('fs');
const p='src/reportWebVitals.ts';
let s=fs.readFileSync(p,'utf8');
s=s.replace(
  /const reportWebVitals = \(onPerfEntry\?: ReportHandler\) => \{/, 
  'const reportWebVitals = (onPerfEntry?: ReportHandler): void | Promise<void> => {'
);
if(!s.includes('return undefined')){
  s=s.replace(/\}\n\nexport default reportWebVitals;$/, '  return undefined;\n};\n\nexport default reportWebVitals;');
}
fs.writeFileSync(p,s,'utf8');
console.log('Fixed reportWebVitals returns and type');
