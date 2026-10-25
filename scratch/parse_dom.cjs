(async () => {
  const res = await fetch('http://localhost:3001/api/aoc4/inspect-login-dom');
  const d = await res.json();
  const fs = require('fs');
  fs.writeFileSync('scratch/modal.html', d.modalHtml || '');
  console.log('Saved modal.html, size:', (d.modalHtml || '').length);

  // Parse with regex
  const imgs = (d.modalHtml || '').match(/<img[^>]+>/g) || [];
  console.log('Images in modal:', imgs);

  const canvases = (d.modalHtml || '').match(/<canvas[^>]+>/g) || [];
  console.log('Canvases in modal:', canvases);
})();
