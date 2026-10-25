const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const extPath = path.resolve('extension').replace(/\\/g, '/');
const userDataDir = path.resolve('data/mca_chrome_user_data').replace(/\\/g, '/');
const targetUrl = 'https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html';

const args = [
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  `--load-extension=${extPath}`,
  `--disable-extensions-except=${extPath}`,
  '--no-first-run',
  '--no-default-browser-check',
  targetUrl
];

console.log('[CHROME PREVIEW] Launching Google Chrome in Preview Mode...');
console.log('[CHROME PREVIEW] Extension Path:', extPath);
console.log('[CHROME PREVIEW] User Data Dir:', userDataDir);
console.log('[CHROME PREVIEW] Remote Debugging Port: 9222');
console.log('[CHROME PREVIEW] Target URL:', targetUrl);

const chromeProc = spawn(chromePath, args, {
  stdio: ['ignore', 'pipe', 'pipe']
});

chromeProc.stdout.on('data', d => {
  const line = d.toString().trim();
  if (line) console.log('[CHROME STDOUT]', line);
});

chromeProc.stderr.on('data', d => {
  const line = d.toString().trim();
  if (line.includes('DevTools listening') || line.includes('ERROR:')) {
    console.log('[CHROME STDERR]', line);
  }
});

chromeProc.on('exit', (code, signal) => {
  console.log(`[CHROME EXITED] Exit code: ${code}, signal: ${signal}`);
  process.exit(code || 0);
});

// Verify CDP connection and extension presence after 3 seconds
setTimeout(() => {
  http.get('http://localhost:9222/json/list', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const list = JSON.parse(data);
        console.log(`\n======================================================`);
        console.log(`🎉 CHROME PREVIEW IS RUNNING & CONNECTED ON PORT 9222!`);
        console.log(`Open Pages & Targets: ${list.length}`);
        list.forEach(item => {
          console.log(` - [${item.type}] ${item.title || item.name || '(unnamed)'} -> ${item.url}`);
        });
        console.log(`======================================================\n`);
      } catch (e) {
        console.log('[CDP RAW]', data);
      }
    });
  }).on('error', err => {
    console.error('[CDP CONNECTION ERROR]', err.message);
  });
}, 3000);

// Keep daemon alive
setInterval(() => {}, 60000);
