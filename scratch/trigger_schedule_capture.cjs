const http = require('http');

// Call API to capture schedule screenshots
const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/aoc4/capture-schedules',
  method: 'POST'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Capture schedules result status:', res.statusCode);
  });
});
req.on('error', e => console.error(e));
req.end();
