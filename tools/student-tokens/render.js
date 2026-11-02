const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<html><body></body></html>');
  await p.addScriptTag({ path: require('path').join(__dirname, 'td-noshadow.js') });
  const gi = JSON.parse(fs.readFileSync('gi.json', 'utf8'));
  const glyphs = await p.evaluate(gi => {
    const out = {}; const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    for (const [n, [, d]] of Object.entries(gi)) { g.clearRect(0, 0, 1024, 1024); g.save(); g.scale(2, 2); g.fillStyle = '#fff'; g.fill(new Path2D(d)); g.restore(); out[n] = c.toDataURL(); }
    return out;
  }, gi);
  for (const [n, u] of Object.entries(glyphs)) fs.writeFileSync(`raw/gi/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  // top-down kit pieces, drawn at 10x scale on a 512 canvas, no shadow
  const td = await p.evaluate(() => {
    const out = {}; const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); TD.use(g);
    const S = 512 / 50; TD.shadow = () => {};
    const shot = (n, fn) => { g.clearRect(0, 0, 512, 512); g.save(); g.translate(256, 256); g.scale(S, S); fn(); g.restore(); out[n] = c.toDataURL(); };
    const C = TD.C; const up = -Math.PI / 2;
    // player() and foe() call shadow() internally through closure; patch by drawing then nothing else
    shot('player-blue', () => TD.player(0, 0, up, 1, 1, C.player));
    shot('player-green', () => TD.player(0, 0, up, 1, 1, C.p2));
    shot('player-purple', () => TD.player(0, 0, up, 1, 1, C.p3));
    shot('player-gold', () => TD.player(0, 0, up, 1, 1, C.gold));
    for (const m of ['plain', 'horns', 'shield', 'staff', 'scope']) shot('foe-' + m, () => { g.scale(.8, .8); g.translate(-6, 0); TD.foe(0, 0, 18, up * -1 + Math.PI, C.red, { mark: m === 'plain' ? undefined : m }); });
    shot('foe-purple', () => { g.scale(.8, .8); TD.foe(0, 0, 18, up * -1 + Math.PI, C.purple, { edge: '#5b2c99' }); });
    return out;
  });
  for (const [n, u] of Object.entries(td)) fs.writeFileSync(`raw/td/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  await b.close(); console.log(Object.keys(glyphs).length, Object.keys(td));
})();
