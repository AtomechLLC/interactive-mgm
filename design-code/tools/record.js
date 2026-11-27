// Records one Design Code page to a looping 1920x1080 GIF through the page's window.__seek / __dur hooks.
// Usage: serve the repository (python3 -m http.server 8181), then
//   node design-code/tools/record.js <slug> [fps=15] [frames dir to keep]
// Needs playwright and ffmpeg. The canvas already has a 1920x1080 backing store, so frames are read straight from it.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const [,, slug, fpsArg = '15', keep] = process.argv, fps = +fpsArg;
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8181}/design-code/${slug}/index.html`);
  await p.evaluate(() => window.__ready);
  const dur = await p.evaluate(() => window.__dur()), n = Math.round(dur * fps);
  const dir = keep || fs.mkdtempSync(path.join(os.tmpdir(), 'dcgif-')); fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i++) {
    const url = await p.evaluate(t => { window.__seek(t); return document.getElementById('stage').toDataURL('image/png'); }, i / fps);
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
  const out = path.join(__dirname, '..', 'gifs', slug + '.gif');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.png'),
    '-vf', 'split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', '-loop', '0', out]);
  if (!keep) fs.rmSync(dir, { recursive: true, force: true });
  console.log(out, n, 'frames', dur + 's', (fs.statSync(out).size / 1e6).toFixed(1) + ' MB');
})();
