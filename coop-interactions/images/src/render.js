// Renders continuity.html?n=1..3 to ../continuity-*.png at 1920x1080. Needs playwright-core and Edge.
const { chromium } = require('C:/Projects/game-agent/node_modules/playwright-core');
const path = require('path'), { pathToFileURL } = require('url');
const NAMES = ['centralized-server', 'host-save-file', 'individual-saves'];
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  for (let n = 1; n <= 3; n++) {
    await p.goto(pathToFileURL(path.join(__dirname, 'continuity.html')).href + '?n=' + n);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
    const out = path.join(__dirname, '..', `continuity-${n}-${NAMES[n - 1]}.png`);
    await p.screenshot({ path: out });
    console.log(out);
  }
  await b.close();
})();
