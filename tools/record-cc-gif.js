// Records a counter-cycles slide (2, 3 or 4) as timestamped PNG frames for the course GIFs.
// Usage: serve InteractiveMGM on :8137, then  node tools/record-cc-gif.js <slide> <frameDir>
// Encode: ffmpeg -f concat -i <frameDir>/list.txt -vf "fps=12,scale=1280:720:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 out.gif
const { chromium } = require('C:/Projects/game-agent/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const [,, slide, outDir] = process.argv;
const BASE = 'http://127.0.0.1:8137/counter-cycles/index.html';
const CSS = `.viewport{inset:0!important}
.stage{transform:none!important;left:0!important;top:0!important;border-radius:0!important;box-shadow:none!important}
.stage::after,.bar,.edge-nav,.touch-pad,.rotate-hint{display:none!important}
#cur{position:fixed;left:0;top:0;width:34px;height:34px;pointer-events:none;z-index:99999;transform:translate(-200px,-200px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
#cur.down{transform-origin:4px 4px}`;
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto(BASE + '#' + slide); await p.reload();
  await p.addStyleTag({ content: CSS });
  await p.evaluate(() => {
    const d = document.createElement('div'); d.id = 'cur';
    d.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M3 2 L3 19 L7.5 14.8 L10.6 21.6 L13.6 20.3 L10.5 13.6 L16.6 13.4 Z" fill="#fff" stroke="#152044" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(d);
  });
  await p.mouse.move(1590, 880);
  await p.waitForTimeout(1500);
  let cx = 1500, cy = 820;
  const setCur = (x, y) => p.evaluate(([x, y]) => { document.getElementById('cur').style.transform = `translate(${x - 4}px,${y - 3}px)`; }, [x, y]);
  await setCur(cx, cy);

  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
  const cdp = await p.context().newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const fn = `f${String(frames.length).padStart(5, '0')}.png`;
    fs.writeFileSync(path.join(outDir, fn), Buffer.from(data, 'base64'));
    frames.push({ fn, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: 1600, maxHeight: 900, everyNthFrame: 1 });

  const S = '.slide.active ';
  const wait = ms => p.waitForTimeout(ms);
  async function glide(x, y, ms = 650) {
    const n = Math.max(8, Math.round(ms / 30)), x0 = cx, y0 = cy;
    for (let i = 1; i <= n; i++) {
      const k = i / n, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      cx = x0 + (x - x0) * e; cy = y0 + (y - y0) * e;
      await setCur(cx, cy); await p.mouse.move(cx, cy); await wait(ms / n);
    }
  }
  async function center(sel, dx = 0, dy = 0) {
    const bb = await p.locator(S + sel).first().boundingBox();
    return [bb.x + bb.width / 2 + dx, bb.y + bb.height / 2 + dy];
  }
  const node = async name => glide(...await center(`.cc-node[aria-label="${name}"] .cc-disc`, 18, 22));
  async function click(sel) {
    await glide(...await center(sel));
    await p.evaluate(() => { const c = document.getElementById('cur'); c.animate([{ scale: 1 }, { scale: .8 }, { scale: 1 }], { duration: 260 }); });
    await p.mouse.down(); await wait(90); await p.mouse.up();
  }
  async function edgeMid(w, l) {   // a point on the arrow from w to l
    return p.evaluate(([S, w, l]) => {
      const W = document.querySelector(S + '.cc-wheel'), es = [...W.querySelectorAll('.cc-edge:not(.hide)')];
      // edges are drawn in order; find by matching the data the deck put on the slide
      const edge = document.querySelector(S)._w.edges.find(e => e.w === w && e.l === l);
      const path = edge.g.querySelector('.cc-line'), len = path.getTotalLength(), pt = path.getPointAtLength(len * .5);
      const m = path.getScreenCTM(); return [pt.x * m.a + pt.y * m.c + m.e, pt.x * m.b + pt.y * m.d + m.f];
    }, [S, w, l]);
  }
  const park = () => glide(1250, 845, 700);   // rest in the empty bottom-right, clear of the camera corner

  const scripts = {
    async 2() {
      await wait(900);
      for (const n of ['Rush', 'Turtle', 'Expand']) { await node(n); await wait(2300); }
      await glide(...await edgeMid('turtle', 'rush')); await wait(2300);
      await click('.cc-walk'); await park(); await wait(2600 * 3 - 700);
      await click('.cc-walk'); await park(); await wait(900);
    },
    async 3() {
      await wait(900);
      for (const n of ['Attack', 'Block', 'Grab']) { await node(n); await wait(2300); }
      await glide(...await edgeMid('grab', 'block')); await wait(2300);
      await click('.cc-walk'); await park(); await wait(2600 * 3 - 700);
      await click('.cc-walk'); await park(); await wait(900);
    },
    async 4() {
      await wait(900);
      await node('Assassin'); await wait(2600);
      await node('Tank'); await wait(2200);
      await click('[data-stage="2"]'); await wait(1400);
      await node('Assassin'); await wait(2800);
      await node('Tank'); await wait(2600);
      await glide(...await edgeMid('assassin', 'marksman')); await wait(2400);
      await click('[data-stage="1"]'); await park(); await wait(1200);
    },
  };
  await scripts[slide]();
  await cdp.send('Page.stopScreencast');
  await wait(300);
  const end = frames.at(-1).t + 0.5;
  const list = frames.map((f, i) => `file '${f.fn}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).fn}'\n`;
  fs.writeFileSync(path.join(outDir, 'list.txt'), list);
  console.log(slide, frames.length, 'frames', (end - frames[0].t).toFixed(1) + 's');
  await b.close();
})();
