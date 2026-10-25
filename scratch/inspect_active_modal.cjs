const http = require('http');
const fs = require('fs');

http.get('http://localhost:3001/api/aoc4/inspect-section-errors?section=section_1', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const data = JSON.parse(d);
      console.log('Has errors:', data.hasErrors);
      console.log('Issues detected:', data.issues);
      if (data.screenshot) {
        const b64 = data.screenshot.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync('scratch/live_modal_captured.png', b64, 'base64');
        console.log('Saved live_modal_captured.png');
      }
    } catch(err) {
      console.error(err);
    }
  });
}).on('error', console.error);
