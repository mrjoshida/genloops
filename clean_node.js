const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('engine.js', 'utf8');

try {
  acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  console.log('✅ Syntax is completely valid!');
} catch (e) {
  console.error('❌ Syntax error:', e.message);
  
  // Print 5 lines around the error
  const lines = code.split('\n');
  const errLine = e.loc.line - 1;
  const start = Math.max(0, errLine - 2);
  const end = Math.min(lines.length - 1, errLine + 2);
  
  for (let i = start; i <= end; i++) {
    const prefix = i === errLine ? '>> ' : '   ';
    console.log(`${prefix}${i + 1}: ${lines[i]}`);
  }
}
