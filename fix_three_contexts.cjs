const fs = require('fs');
const files = [
  'src/contexts/AuthContext.tsx',
  'src/contexts/SettingsContext.tsx', 
  'src/contexts/ThemeContext.tsx'
];

files.forEach(f => {
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('react-refresh')) {
    fs.writeFileSync(f, '/* eslint-disable react-refresh/only-export-components */\n' + s);
  }
});
console.log('Banners injected.');
