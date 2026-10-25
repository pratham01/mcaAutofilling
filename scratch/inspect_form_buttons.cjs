const http = require('http');

const req = http.request('http://localhost:3001/api/aoc4/inspect-dom', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const els = json.elements || [];
      const buttons = els.filter(x => x.tag === 'button' || (x.tag === 'input' && (x.type === 'button' || x.type === 'submit')) || x.tag === 'a');
      console.log(`--- ALL ACTION BUTTONS IN FORM ---`);
      buttons.forEach(b => {
        const text = (b.text || '').trim();
        const id = (b.id || '').trim();
        if (text && (text.toLowerCase().includes('save') || text.toLowerCase().includes('next') || text.toLowerCase().includes('submit') || text.toLowerCase().includes('proceed') || text.toLowerCase().includes('draft') || text.toLowerCase().includes('ok'))) {
          console.log(`Tag: <${b.tag}> | Type: ${b.type} | Text: "${text}" | ID: ${id}`);
        }
      });
    } catch (e) {
      console.error(e.message);
    }
  });
});
req.end();
