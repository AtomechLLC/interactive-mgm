// Renders the hazard pattern scenes (../hazards) to looping 1920x1080 GIFs in ../gifs (the 1280x720 scene drawn at k=1.5).
// Usage: node record.js [patternNumbers...] [--fps 20] [--sheet] [--themes]
//   --sheet writes a few still frames per pattern to ./frames-sheet instead of GIFs (for checking).
//   --themes renders the themed cycle (every theme, one loop each) to <file>-themes.gif at 15 fps unless --fps is given.
// Needs playwright-core and Edge (the bundled chromium does not start on this machine) and ffmpeg on PATH;
// elsewhere it falls back to require('playwright') and its own chromium.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const WIN_PW = 'C:/Projects/game-agent/node_modules/playwright-core', EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const { chromium } = require(fs.existsSync(WIN_PW) ? WIN_PW : 'playwright');
const args = process.argv.slice(2);
const themes = args.includes('--themes');
const fps = args.includes('--fps') ? +args[args.indexOf('--fps') + 1] : themes ? 15 : 20;
const sheet = args.includes('--sheet');
const only = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--fps').map(Number);
const root = path.resolve(__dirname, '..');
const page = 'file:///' + path.join(root, 'hazards/index.html').replace(/\\/g, '/') + '?rec=1&k=1.5';

(async () => {
  const b = await chromium.launch({ ...(fs.existsSync(EDGE) ? { executablePath: EDGE } : {}), args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(page); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all(['800 44px Montserrat', '600 20px Jost', '500 20px Jost'].map(f => document.fonts.load(f))));
  await p.evaluate(() => HAZARDS.ready);
  const pats = await p.evaluate(() => HAZARDS.patterns);
  for (let i = 0; i < pats.length; i++) {
    if (only.length && !only.includes(i + 1)) continue;
    const { T: T1, n: nt } = pats[i], file = pats[i].file + (themes ? '-themes' : ''), T = themes ? T1 * nt : T1;
    const dir = path.join(__dirname, sheet ? 'frames-sheet' : 'frames-' + file);
    fs.mkdirSync(dir, { recursive: true });
    if (!sheet) for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    const n = sheet ? (themes ? 12 : 8) : Math.round(T * fps);
    for (let f = 0; f < n; f++) {
      const t = sheet ? T * f / n : f / fps;
      const url = await p.evaluate(([i, t, th]) => { HAZARDS.select(i); th ? HAZARDS.frameThemes(t) : HAZARDS.frame(t); return document.getElementById('c').toDataURL('image/png'); }, [i, t, themes]);
      fs.writeFileSync(path.join(dir, sheet ? `${file}-${f}.png` : `f${String(f).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
    }
    if (sheet) {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(dir, `${file}-%d.png`), '-vf', themes ? 'scale=640:360,tile=4x3' : 'scale=640:360,tile=4x2', '-frames:v', '1', path.join(dir, `sheet-${file}.png`)]);
      console.log('sheet', file); continue;
    }
    const out = path.join(root, 'gifs', file + '.gif');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.png'),
      '-vf', `split[a][b];[a]palettegen=max_colors=${themes ? 256 : 128}:stats_mode=diff[pl];[b][pl]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, '-loop', '0', out]);
    fs.rmSync(dir, { recursive: true });
    console.log(file, n, 'frames', (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
  }
  await b.close();
})();
