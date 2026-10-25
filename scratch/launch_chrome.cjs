const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const extPath = 'E:\\AutomateFormFIll\\extension';
const userDataDir = 'E:\\AutomateFormFIll\\data\\mca_chrome_user_data';
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

console.log('Launching Chrome with args:', args);
const child = spawn(chromePath, args, {
  detached: true,
  stdio: 'ignore'
});

child.unref();
console.log('Chrome launched with PID:', child.pid);

// Wait 2 seconds and check port 9222
setTimeout(() => {
  http.get('http://localhost:9222/json/version', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Port 9222 is alive! Response:');
      console.log(data);
      process.exit(0);
    });
  }).on('error', (err) => {
    console.error('Failed to connect to port 9222:', err.message);
    process.exit(1);
  });
}, 2500);
