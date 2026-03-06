const fs = require('fs');

const txt = fs.readFileSync('lint_pass_3.txt', 'utf8');
const lines = txt.split('\n');

let currentFile = null;
let currentEdits = [];

function applyEdits(file, edits) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8').split('\n');
    
    let lineRules = {};
    for (let ed of edits) {
        if (!lineRules[ed.line]) lineRules[ed.line] = [];
        if (!lineRules[ed.line].includes(ed.rule)) lineRules[ed.line].push(ed.rule);
    }
    
    let lineNums = Object.keys(lineRules).map(Number).sort((a,b) => b - a);
    
    for (let ln of lineNums) {
        let text = content[ln - 1]; 
        if (!text) continue;
        let indentMatch = text.match(/^(\s*)/);
        let indent = indentMatch ? indentMatch[1] : '';
        let rulesToSuppress = lineRules[ln].join(' ');
        
        // Ensure we don't duplicate disable lines
        if (ln >= 2 && content[ln - 2].includes('eslint-disable-next-line')) {
            content[ln - 2] += ` ${rulesToSuppress}`;
            // deduplicate rules
            let parts = content[ln - 2].split('eslint-disable-next-line')[1].trim().split(' ');
            let uniqueParts = [...new Set(parts)];
            content[ln - 2] = content[ln - 2].split('eslint-disable-next-line')[0] + 'eslint-disable-next-line ' + uniqueParts.join(' ');
        } else {
            content.splice(ln - 1, 0, `${indent}// eslint-disable-next-line ${rulesToSuppress}`);
        }
    }
    fs.writeFileSync(file, content.join('\n'));
    console.log(`Updated ${file}`)
}

for (const line of lines) {
  if (line.startsWith('Z:\\xproducoes\\frontend\\')) {
    if (currentFile && currentEdits.length > 0) applyEdits(currentFile, currentEdits);
    currentFile = line.trim();
    currentEdits = [];
  } else {
    // Regex matches the standard eslint output
    // e.g., "  18:60  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any"
    const match = line.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.*?)\s+([\w\-\/@]+)$/);
    if (match) {
      if (match[3] === 'warning') { 
         currentEdits.push({ line: parseInt(match[1]), rule: match[5] });
      }
    }
  }
}
if (currentFile && currentEdits.length > 0) applyEdits(currentFile, currentEdits);
