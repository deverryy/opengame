// tools/generate_list.js
// Run: node tools/generate_list.js
// This script walks the ./games folder and writes list.json containing only .html files.
// Requires Node.js

const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, '..', 'games');
const outFile = path.join(gamesDir, 'list.json');

const files = fs.readdirSync(gamesDir)
  .filter(f => /\.html?$/i.test(f))
  .filter(f => f !== 'list.json') // avoid including list.json itself
  .sort((a,b) => a.localeCompare(b, undefined, {sensitivity:'base'}));

fs.writeFileSync(outFile, JSON.stringify(files, null, 2), 'utf8');
console.log(`Found ${files.length} .html files. Wrote ${outFile}`);
