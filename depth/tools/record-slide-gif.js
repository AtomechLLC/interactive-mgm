// Records one slide of a page in this module to a looping 1280x720 GIF, frame by frame through the page's
// window.__seek(t, which) / window.__dur(which) hooks .
// Usage: serve InteractiveMGM on a port, then
//   node record-slide-gif.js <url with #slide> <which> <out.gif> [fps=15] [hide selectors, comma separated]
// e.g. node record-slide-gif.js http://127.0.0.1:8171/depth/go-board/index.html#1 go ../gifs/go-board-size.gif
// Env GIF_COLORS (default 128), GIF_DITHER (default bayer) and GIF_STATS (default diff) trade quality for size on scrolling scenes.
// Needs ffmpeg on PATH, plus playwright-core and Edge on Windows (the bundled chromium does not start there) or playwright elsewhere.
const fs = require('fs');
const WIN = fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
const { chromium } = require(WIN ? 'C:/Projects/game-agent/node_modules/playwright-core' : 'playwright');
const path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const [,, url, which, out, fpsArg = '15', hide = ''] = process.argv;
const fps = +fpsArg;
const CSS = `.viewport{inset:0!important}
.stage{transform:none!important;left:0!important;top:0!important;border-radius:0!important;box-shadow:none!important}
.stage::after,.bar,.edge-nav,.touch-pad,.rotate-hint{display:none!important}
${hide ? hide + '{visibility:hidden!important}' : ''}`;
(async () => {
  const b = await chromium.launch(WIN ? { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } : {});
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url);
  await p.addStyleTag({ content: CSS });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'depthgif-'));
  const dur = await p.evaluate(w => window.__dur(w), which);
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) {
    await p.evaluate(([t, w]) => window.__seek(t, w), [i / fps, which]);
    await p.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.png`) });
  }
  await b.close();
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.png'),
    '-vf', `scale=1280:720:flags=lanczos,split[a][b];[a]palettegen=max_colors=${process.env.GIF_COLORS || 128}:stats_mode=${process.env.GIF_STATS || "diff"}[p];[b][p]paletteuse=dither=${process.env.GIF_DITHER || 'bayer:bayer_scale=4'}:diff_mode=rectangle`,
    '-loop', '0', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(out, n, 'frames', dur.toFixed(1) + 's', (fs.statSync(out).size / 1e6).toFixed(1) + ' MB');
})();
