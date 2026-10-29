// Records one slide of any module page to a looping 1920x1080 GIF (slide resolution), frame by frame through the page's
// window.__seek(t, which) / window.__dur(which) hooks (env GIF_HOOK=__ec reads __ecSeek / __ecDur instead).
// The module recorders (<module>/tools/record-slide-gif.js) all run this file.
// Usage: serve InteractiveMGM on a port, then
//   node record-slide-gif.js <url with #slide> <which> <out.gif> [fps=15] [hide selectors, comma separated] [extra css]
// e.g. node tools/record-slide-gif.js http://127.0.0.1:8151/composition/why-scale/index.html#1 bestiary composition/gifs/two-views-one-bestiary.gif
// Env GIF_CSS adds CSS to the page, after [extra css].
// Env GIF_COLORS (default 128), GIF_DITHER (default bayer) and GIF_STATS (default diff) trade quality for size on scrolling scenes.
// The page renders at its 1600x900 stage size with a 1.2 device scale, so text and CSS are drawn at 1920x1080,
// and the fixed-size demo canvases get a 2x backing store so they are not upscaled.
// Needs playwright-core and Edge (the bundled chromium does not start on this machine) and ffmpeg on PATH;
// elsewhere it falls back to require('playwright') and its own chromium.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const WIN_PW = 'C:/Projects/game-agent/node_modules/playwright-core', EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const { chromium } = require(fs.existsSync(WIN_PW) ? WIN_PW : 'playwright');
const W = 1920, H = 1080, SCALE = W / 1600, CANVAS_K = 2;
// Gives canvas.demo a CANVAS_K backing store while width/height still read as the size the draw code was written for.
const HIDPI = k => {
  const get = HTMLCanvasElement.prototype.getContext;
  const dims = Object.getOwnPropertyDescriptors(HTMLCanvasElement.prototype);
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    if (type !== '2d' || !this.classList.contains('demo') || this.__hidpi) return get.call(this, type, ...a);
    let w = this.width, h = this.height, st;
    dims.width.set.call(this, w * k); dims.height.set.call(this, h * k);
    // a resize clears the context, so the logical scale goes back on
    Object.defineProperty(this, 'width', { get: () => w, set(v) { w = v; dims.width.set.call(this, v * k); st(k, 0, 0, k, 0, 0); } });
    Object.defineProperty(this, 'height', { get: () => h, set(v) { h = v; dims.height.set.call(this, v * k); st(k, 0, 0, k, 0, 0); } });
    this.__hidpi = 1;
    const g = get.call(this, type, ...a); st = g.setTransform.bind(g);
    g.scale(k, k);
    g.setTransform = (...m) => { st(...(m.length ? m : [1, 0, 0, 1, 0, 0])); g.scale(k, k); };   // keep the logical space
    g.resetTransform = () => { st(k, 0, 0, k, 0, 0); };
    return g;
  };
};
const [,, url, which, out, fpsArg = '15', hide = '', extra = ''] = process.argv;
const fps = +fpsArg;
const CSS = `.viewport{inset:0!important}
.stage{transform:none!important;left:0!important;top:0!important;border-radius:0!important;box-shadow:none!important}
.stage::after,.bar,.edge-nav,.touch-pad,.rotate-hint{display:none!important}
${hide ? hide + '{visibility:hidden!important}' : ''}
${extra}
${process.env.GIF_CSS || ''}`;
(async () => {
  const b = await chromium.launch(fs.existsSync(EDGE) ? { executablePath: EDGE } : {});
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: SCALE });
  await p.addInitScript(HIDPI, CANVAS_K);
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url);
  await p.addStyleTag({ content: CSS });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slidegif-'));
  const HK = process.env.GIF_HOOK, SEEK = HK ? HK + 'Seek' : '__seek', DUR = HK ? HK + 'Dur' : '__dur';
  const dur = await p.evaluate(([w, D]) => window[D](w), [which, DUR]);
  const n = Math.round(dur * fps);
  for (let i = 0; i < n; i++) {
    await p.evaluate(([t, w, S]) => window[S](t, w), [i / fps, which, SEEK]);
    await p.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.png`) });
  }
  await b.close();
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.png'),
    '-vf', `scale=${W}:${H}:flags=lanczos,split[a][b];[a]palettegen=max_colors=${process.env.GIF_COLORS || 128}:stats_mode=${process.env.GIF_STATS || "diff"}[p];[b][p]paletteuse=dither=${process.env.GIF_DITHER || 'bayer:bayer_scale=4'}:diff_mode=rectangle`,
    '-loop', '0', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(out, n, 'frames', dur.toFixed(1) + 's', (fs.statSync(out).size / 1e6).toFixed(1) + ' MB');
})();
