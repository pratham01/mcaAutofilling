const http = require('http');

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const r = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  console.log('--- 1. Testing /health ---');
  console.log(await req('/health'));

  console.log('\n--- 2. Testing /aoc4/check-session ---');
  console.log(await req('/aoc4/check-session'));

  console.log('\n--- 3. Testing /aoc4/open-login ---');
  console.log(await req('/aoc4/open-login', 'POST'));

  console.log('\n--- 4. Testing /aoc4/fill-section (section_1) ---');
  const fill1 = await req('/aoc4/fill-section', 'POST', { section: 'section_1' });
  console.log('Fill Section 1:', fill1);
})();
