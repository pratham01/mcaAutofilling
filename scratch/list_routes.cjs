const fs = require('fs');
const content = fs.readFileSync('server/routes/api.ts', 'utf8');
const regex = /apiRouter\.(get|post)\(['"]([^'"]+)['"]/g;
let m;
while ((m = regex.exec(content)) !== null) {
  console.log(`${m[1].toUpperCase()} ${m[2]}`);
}
