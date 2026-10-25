const http = require('http');

http.get('http://localhost:3001/api/aoc4/inspect-dom', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const els = json.elements || [];
      console.log('Total elements in DOM:', els.length);
      // Find all buttons with OK
      const okButtons = els.filter(e => (e.text || '').toLowerCase() === 'ok');
      console.log('OK buttons:', JSON.stringify(okButtons, null, 2));

      // Find any elements with error or alert text
      const alerts = els.filter(e => {
        const t = (e.text || '').toLowerCase();
        return t.includes('technical') || t.includes('error') || t.includes('warning') || t.includes('alert') || t.includes('mandatory');
      });
      console.log('Alert/Error elements count:', alerts.length);
      alerts.slice(0, 10).forEach(a => console.log(`[${a.tag}] id="${a.id}" class="${a.className}" text="${a.text}"`));
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
}).on('error', err => console.error('HTTP error:', err.message));
