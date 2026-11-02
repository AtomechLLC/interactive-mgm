// Records the delve's guided tour (slide 4) as a webm, then turns it into pve-interactions/gifs/wow-delve-unavoidable-calamity.gif.
// Serve InteractiveMGM on :8191 (python3 -m http.server 8191), run from a scratch folder: node <repo>/pve-interactions/tools/record-delve.js
// then: ffmpeg -ss 2.6 -t 44 -i vid/<page>.webm -vf "fps=8,scale=1280:720:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" wow-delve-unavoidable-calamity.gif
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: 'vid', size: { width: 1920, height: 1080 } } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8191/pve-interactions/delve/index.html');
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} FPF.go(3); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('.dv-side [data-act=tour]').click());
  await p.waitForTimeout(45000);
  await ctx.close(); await b.close();
  console.log(errs.length ? errs : 'no errors');
})();
