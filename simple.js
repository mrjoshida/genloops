const code = require('fs').readFileSync('engine.js', 'utf8').split('\n');
let bal = 0;
let lastO = 0;
for(let i=684; i<933; i++) {
  let line = code[i].split('//')[0];
  for(let c of line) {
    if(c==='{') { bal++; lastO = i+1; }
    if(c==='}') { bal--; }
  }
}
console.log('Balance at 933:', bal);
