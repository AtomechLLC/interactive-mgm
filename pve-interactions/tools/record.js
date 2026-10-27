// Renders the hazard pattern scenes (../hazards) to looping 1280x720 GIFs in ../gifs.
// Usage: node record.js [patternNumbers...] [--fps 20] [--sheet]
//   --sheet writes a few still frames per pattern to ./frames-sheet instead of GIFs (for checking).
// Needs playwright-core and Edge (the bundled chromium does not start on this machine) and ffmpeg on PATH.
const { chromium } = require('C:/Projects/game-agent/node_modules/playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const args = process.argv.slice(2);
const fps = +(args[args.indexOf('--fps') + 1] || 0) || 20;
const sheet = args.includes('--sheet');
const only = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--fps').map(Number);
const root = path.resolve(__dirname, '..');
const page = 'file:///' + path.join(root, 'hazards/index.html').replace(/\\/g, '/') + '?rec=1';

(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(page); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all(['800 44px Montserrat', '600 20px Jost', '500 20px Jost'].map(f => document.fonts.load(f))));
  const pats = await p.evaluate(() => HAZARDS.patterns);
  for (let i = 0; i < pats.length; i++) {
    if (only.length && !only.includes(i + 1)) continue;
    const { file, T } = pats[i];
    const dir = path.join(__dirname, sheet ? 'frames-sheet' : 'frames-' + file);
    fs.mkdirSync(dir, { recursive: true });
    if (!sheet) for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    const n = sheet ? 8 : Math.round(T * fps);
    for (let f = 0; f < n; f++) {
      const t = sheet ? T * f / n : f / fps;
      const url = await p.evaluate(([i, t]) => { HAZARDS.select(i); HAZARDS.frame(t); return document.getElementById('c').toDataURL('image/png'); }, [i, t]);
      fs.writeFileSync(path.join(dir, sheet ? `${file}-${f}.png` : `f${String(f).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
    if (sheet) {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(dir, `${file}-%d.png`), '-vf', 'scale=640:360,tile=4x2', '-frames:v', '1', path.join(dir, `sheet-${file}.png`)]);
      console.log('sheet', file); continue;
    }
    const out = path.join(root, 'gifs', file + '.gif');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.png'),
      '-vf', 'split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[pl];[b][pl]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', '-loop', '0', out]);
    fs.rmSync(dir, { recursive: true });
    console.log(file, n, 'frames', (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
  }
  await b.close();
})();
