// Exports every SVG under <dir>/svg to transparent PNGs at <dir>/<size>px/<group>/<name>.png (512 and 256).
// Usage: node render_svgs.js <dir>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const dir = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage();
  const files = []; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.svg') && files.push(path.join(d, e.name)));
  walk(path.join(dir, 'svg'));
  for (const size of [512, 256]) {
    await p.setViewportSize({ width: size, height: size });
    for (const f of files) {
      const svg = fs.readFileSync(f, 'utf8').replace('width="512" height="512"', `width="${size}" height="${size}"`);
      await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
      const rel = path.relative(path.join(dir, 'svg'), f).replace(/\.svg$/, '.png'); const out = path.join(dir, `${size}px`, rel);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await p.locator('svg').screenshot({ path: out, omitBackground: true });
    }
  }
  await b.close(); console.log(files.length * 2, 'pngs');
})();
