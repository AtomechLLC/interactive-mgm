// Renders the enemy counters framework sequence (pve-interactions/enemy-counters, slide 2: the deck's diagram, then Mario plays it) frame by frame for the course GIF.
// Usage: serve InteractiveMGM on :8141, then  node tools/record-enemy-counters-gif.js <frameDir> [fps] [onlyTimes,comma,separated]
// Encode: ffmpeg -framerate <fps> -i <frameDir>/f%05d.png -vf "scale=1280:720:flags=neighbor,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=none" -loop 0 out.gif
const { chromium } = require('C:/Projects/game-agent/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const [,, outDir, fpsArg = '15', only] = process.argv;
const fps = +fpsArg;
const CSS = `.viewport{inset:0!important}
.stage{transform:none!important;left:0!important;top:0!important;border-radius:0!important;box-shadow:none!important}
.stage::after,.bar,.edge-nav,.touch-pad,.rotate-hint{display:none!important}`;
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto('http://127.0.0.1:8141/pve-interactions/enemy-counters/index.html#2');
  await p.addStyleTag({ content: CSS + ".fr-row .btn{display:none!important}" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
  const dur = await p.evaluate(() => window.__ecDur());
  const times = only ? only.split(',').map(Number) : Array.from({ length: Math.floor(dur * fps) }, (_, i) => i / fps);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate(t => window.__ecSeek(t), times[i]);
    await p.screenshot({ path: path.join(outDir, `f${String(i).padStart(5, '0')}.png`) });
  }
  console.log(times.length, 'frames', dur.toFixed(2) + 's');
  await b.close();
})();
