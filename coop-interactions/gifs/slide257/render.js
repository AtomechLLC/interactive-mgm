// Renders the slide 257 GIF (co-op deck "Cross-Class Structure & Co-op Games") from the slide's own SVG export.
// Header, paper, shapes, labels and skulls are the exported pieces; only transforms/opacity are animated,
// plus small effect marks (bolts, rings, hit sparks) in the slide's own blue #1155cc / #c9daf8 and the header gold.
// Story (speaker notes): tank holds the boss while the healer keeps it up, mage + bruiser clear the swarm,
// marksmen + bruiser take the two soldiers, controller disables and assassin picks the wizard, then all focus the boss.
// Usage: node render.js frames   then encode with ffmpeg (see make.sh).
const { chromium } = require('C:/Projects/game-agent/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const outDir = process.argv[2] || 'frames';
const FPS = 25, W = 1920, H = 1080;
const svg = fs.readFileSync(path.join(__dirname, 'src/s257.svg'), 'utf8');
const hats = Object.fromEntries(Object.entries({ tophat: '1f3a9', helmet: '1fa96', crown: '1f451' })
  .map(([k, c]) => [k, 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, `src/hats/${c}.png`)).toString('base64')]));

(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent('<html><body style="margin:0;overflow:hidden"><div id="stage"></div></body></html>');
  const total = await p.evaluate(({ svg, hats, W, H }) => {
    const NS = 'http://www.w3.org/2000/svg';
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    doc.setAttribute('width', W); doc.setAttribute('height', H);
    document.getElementById('stage').appendChild(doc);
    const root = doc.querySelector(':scope > g');
    const k = [...root.children];
    // Wrap exported children in groups we can transform. Indices come from the export's child order.
    const wrap = (id, idx) => { const g = document.createElementNS(NS, 'g'); g.id = id; k[idx[0]].before(g); idx.forEach(i => g.appendChild(k[i])); return g; };
    const centre = g => { const r = g.getBBox ? g.getBoundingClientRect() : null; return [(r.x + r.width / 2) * 960 / W, (r.y + r.height / 2) * 540 / H]; };
    const S = {
      boss: wrap('boss', [11]), wiz: wrap('wiz', [25]), sol1: wrap('sol1', [28]), sol2: wrap('sol2', [31]), ctlSk: wrap('ctlSk', [58]),
      sw: [13, 15, 17, 19, 21, 23].map((i, n) => wrap('sw' + n, [i])),
    };
    const P = {
      tank: wrap('tank', [33, 35]), healer: wrap('healer', [36, 38]), assassin: wrap('assassin', [39, 41]), mage: wrap('mage', [42, 44]),
      mkL: wrap('mkL', [45, 47]), mkR: wrap('mkR', [48, 50]), bruR: wrap('bruR', [51, 53]), bruL: wrap('bruL', [54, 56]), ctl: wrap('ctl', [60, 62]),
    };
    const C = {}; Object.entries({ ...P, ...S }).forEach(([n, g]) => { if (!Array.isArray(g)) C[n] = centre(g); });
    const swC = S.sw.map(centre);
    // Headwear from the slide's text boxes (the emoji don't render in Slides), same Noto style as the skulls.
    // Added inside each skull's group so it moves, shakes and fades with it. [w, x offset, bottom overlap, tilt] as skull fractions.
    const HAT = { tophat: [.62, .04, .5, -12], helmet: [.8, 0, .5, 0], crown: [.6, 0, .42, 0] };
    const hat = (g, kind) => {
      const bb = g.getBBox(), [w, ox, ov, r] = HAT[kind], s = bb.width * w;
      const x = bb.x + bb.width / 2 + ox * bb.width - s / 2, y = bb.y + ov * bb.height - s;
      const im = document.createElementNS(NS, 'image');
      im.setAttribute('href', hats[kind]); im.setAttribute('x', x); im.setAttribute('y', y); im.setAttribute('width', s); im.setAttribute('height', s);
      im.setAttribute('transform', `rotate(${r} ${x + s / 2} ${y + s})`);
      g.appendChild(im);
    };
    hat(S.wiz, 'tophat'); hat(S.sol1, 'helmet'); hat(S.sol2, 'helmet'); hat(S.ctlSk, 'crown'); hat(S.boss, 'crown');
    const fx = document.createElementNS(NS, 'g'); fx.id = 'fx'; root.appendChild(fx);
    const BLUE = '#1155cc', PALE = '#c9daf8', GOLD = '#ffb951';

    const clamp = x => Math.max(0, Math.min(1, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const out = t => 1 - Math.pow(1 - t, 3);
    const back = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const bump = (t, a, d) => { const u = (t - a) / d; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
    const xf = (g, [cx, cy], { dx = 0, dy = 0, s = 1, r = 0, o = 1 } = {}) => {
      g.setAttribute('transform', `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${Math.max(s, 0.0001)}) translate(${-cx} ${-cy})`);
      g.style.opacity = o;
    };
    const el = (tag, a) => { const e = document.createElementNS(NS, tag); for (const n in a) e.setAttribute(n, a[n]); fx.appendChild(e); return e; };
    // Effects drawn per frame
    const bolt = (t, t0, d, from, to, r = 4) => { r *= 1.4; // projectile dot with a short trail
      const u = (t - t0) / d; if (u < 0 || u > 1) return;
      const x = lerp(from[0], to[0], u), y = lerp(from[1], to[1], u), v = Math.max(0, u - .18);
      el('line', { x1: lerp(from[0], to[0], v), y1: lerp(from[1], to[1], v), x2: x, y2: y, stroke: BLUE, 'stroke-width': r * .9, 'stroke-linecap': 'round', opacity: .45 });
      el('circle', { cx: x, cy: y, r, fill: PALE, stroke: BLUE, 'stroke-width': 1.6 });
    };
    const spark = (t, t0, [x, y], size = 14) => { size *= 1.3; // hit burst in header gold
      const u = (t - t0) / .35; if (u < 0 || u > 1) return;
      const s = size * (.5 + out(u)), o = 1 - u;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .3; el('line', { x1: x + Math.cos(a) * s * .45, y1: y + Math.sin(a) * s * .45, x2: x + Math.cos(a) * s, y2: y + Math.sin(a) * s, stroke: GOLD, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: o }); }
    };
    const ring = (t, t0, d, [x, y], r0, r1, w = 3, fill = 'none') => {
      const u = (t - t0) / d; if (u < 0 || u > 1) return;
      el('circle', { cx: x, cy: y, r: lerp(r0, r1, out(u)), fill, 'fill-opacity': .25 * (1 - u), stroke: BLUE, 'stroke-width': w, opacity: 1 - u * u });
    };
    const shake = (t, hits, amp = 3) => hits.reduce((s, h) => s + bump(t, h, .18) * amp * Math.sin((t - h) * 70), 0);

    // Timeline (seconds)
    const T = {
      bossHits: [1.0, 2.2, 3.4, 4.6, 5.8, 7.0, 8.2, 9.4], // boss slams the tank throughout
      heals: [1.35, 2.55, 3.75, 4.95, 6.15, 7.35, 8.55, 9.75, 10.95],
      mageCast: 1.8, aoe: [2.35, 3.25, 4.15], bruR: [2.2, 3.1, 4.0],
      swarmDie: [2.5, 2.7, 3.3, 3.5, 4.2, 4.35],
      mkShots: [4.8, 5.3, 5.8, 6.3, 6.8], bruL: [5.0, 5.9, 6.8], sol2Die: 7.1, sol1Die: 7.2,
      ctlCast: 7.4, stun: [7.75, 10.1], dash1: [8.0, 8.3], wizDie: 8.35, dash2: [8.75, 9.05], ctlSkDie: 9.15, home: [9.4, 9.8],
      focus: [10.0, 12.4], bossDie: 12.5, hold: 13.6, fadeIn: [14.2, 14.9], end: 15.2,
    };
    const dieAt = (t, td) => { const u = seg(t, td, td + .3); return u <= 0 ? 1 : 1 - u; };
    const fadeIn = t => seg(t, ...T.fadeIn);
    const alive = (t, td) => t < T.fadeIn[0] ? dieAt(t, td) : fadeIn(t); // dead skulls return for the loop

    window.setT = t => {
      fx.replaceChildren();
      // Tank holds the boss: boss lunges down each slam, tank absorbs
      const lunge = T.bossHits.reduce((s, h) => s + bump(t, h - .1, .35), 0);
      const tankKick = T.bossHits.reduce((s, h) => s + bump(t, h + .05, .3), 0);
      const bossHurt = shake(t, T.mkShots.concat([10.2, 10.5, 10.8, 11.1, 11.4, 11.7, 12.0, 12.3]), 2.5);
      const bAlive = alive(t, T.bossDie);
      xf(S.boss, C.boss, { dx: bossHurt, dy: 10 * lunge, s: (1 + .06 * lunge) * (t < T.fadeIn[0] ? lerp(1, .6, seg(t, T.bossDie, T.bossDie + .3)) : 1), o: bAlive });
      xf(P.tank, C.tank, { dy: 4 * tankKick, s: 1 - .04 * tankKick });
      T.bossHits.forEach(h => { if (h < T.bossDie) spark(t, h + .05, [C.tank[0], C.tank[1] - 26], 16); });
      // Healer pulses heals onto the tank
      T.heals.forEach(h => { if (h < T.bossDie + .5) { ring(t, h, .3, C.healer, 14, 26, 2.5); bolt(t, h + .05, .35, [C.healer[0], C.healer[1] - 18], [C.tank[0], C.tank[1] + 22], 5); ring(t, h + .4, .4, C.tank, 30, 44, 2.5); } });
      xf(P.healer, C.healer, { s: 1 + .1 * T.heals.reduce((s, h) => s + bump(t, h, .3), 0) });

      // Mage AoE + bruiser on the swarm
      const swarmC = [736, 215];
      const mageSpin = T.aoe.reduce((s, a) => s + io(seg(t, a - .5, a)), 0);
      xf(P.mage, C.mage, { r: 72 * mageSpin, s: 1 + .15 * T.aoe.reduce((s, a) => s + bump(t, a - .5, .5), 0) });
      T.aoe.forEach(a => { bolt(t, a - .3, .3, C.mage, swarmC, 6); ring(t, a, .55, swarmC, 10, 80, 3, PALE); });
      const bruOut = T.bruR.reduce((s, a) => s + bump(t, a, .45), 0);
      xf(P.bruR, C.bruR, { dx: 26 * bruOut, dy: 8 * bruOut, r: 72 * T.bruR.reduce((s, a) => s + io(seg(t, a, a + .45)), 0) });
      T.bruR.forEach(a => spark(t, a + .2, [C.bruR[0] + 40, C.bruR[1] + 10], 12));
      S.sw.forEach((g, i) => {
        const td = T.swarmDie[i], hurt = shake(t, T.aoe.filter(a => a < td + .01), 3);
        const pop = t < T.fadeIn[0] ? 1 + .25 * bump(t, td, .3) : 1;
        xf(g, swC[i], { dx: hurt, s: pop * (t < T.fadeIn[0] ? lerp(1, .2, seg(t, td, td + .3)) : 1), o: alive(t, td) });
      });

      // Marksmen shoot the soldiers, left bruiser bashes one
      T.mkShots.forEach((s, i) => {
        bolt(t, s, .3, [C.mkL[0] + 10, C.mkL[1] - 16], C.sol1, 4); bolt(t, s + .12, .3, [C.mkR[0], C.mkR[1] - 18], C.sol2, 4);
        if (s + .3 < T.sol1Die) spark(t, s + .3, C.sol1, 11); if (s + .42 < T.sol2Die) spark(t, s + .42, C.sol2, 11);
      });
      const recoil = (t, shots) => shots.reduce((s, h) => s + bump(t, h, .2), 0);
      xf(P.mkL, C.mkL, { dy: 4 * recoil(t, T.mkShots), r: -6 * recoil(t, T.mkShots) });
      xf(P.mkR, C.mkR, { dy: 4 * recoil(t, T.mkShots.map(s => s + .12)), r: -6 * recoil(t, T.mkShots.map(s => s + .12)) });
      const bl = T.bruL.reduce((s, a) => s + bump(t, a, .4), 0);
      xf(P.bruL, C.bruL, { dx: -20 * bl, dy: -6 * bl, r: -10 * bl });
      T.bruL.forEach(a => spark(t, a + .18, [C.sol1[0] + 8, C.sol1[1] + 8], 13));
      const solHits = T.mkShots.concat(T.bruL.map(a => a + .18));
      xf(S.sol1, C.sol1, { dx: shake(t, solHits.filter(h => h < T.sol1Die)), s: t < T.fadeIn[0] ? lerp(1, .2, seg(t, T.sol1Die, T.sol1Die + .3)) : 1, o: alive(t, T.sol1Die) });
      xf(S.sol2, C.sol2, { dx: shake(t, T.mkShots.filter(h => h < T.sol2Die)), s: t < T.fadeIn[0] ? lerp(1, .2, seg(t, T.sol2Die, T.sol2Die + .3)) : 1, o: alive(t, T.sol2Die) });

      // Controller disables a key enemy, assassin picks off the wizard then the stunned one
      xf(P.ctl, C.ctl, { s: 1 + .2 * bump(t, T.ctlCast, .4), r: 45 * io(seg(t, T.ctlCast, T.ctlCast + .4)) });
      ring(t, T.ctlCast, .35, C.ctl, 12, 24, 2.5);
      bolt(t, T.ctlCast + .1, .25, C.ctl, C.ctlSk, 5);
      const stunned = t > T.stun[0] && t < T.ctlSkDie + .3;
      if (stunned) { // spinning stun halo of small octagon-blue dots over the frozen skull
        for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.09; el('circle', { cx: C.ctlSk[0] + Math.cos(a) * 16, cy: C.ctlSk[1] - 33 + Math.sin(a) * 5, r: 3.2, fill: GOLD, stroke: BLUE, 'stroke-width': 1 }); }
        el('ellipse', { cx: C.ctlSk[0], cy: C.ctlSk[1] - 33, rx: 16, ry: 5, fill: 'none', stroke: BLUE, 'stroke-width': 1.6, opacity: .7 });
      }
      xf(S.ctlSk, C.ctlSk, { r: stunned ? 8 * Math.sin(t * 3) : 0, s: t < T.fadeIn[0] ? lerp(1, .2, seg(t, T.ctlSkDie, T.ctlSkDie + .3)) : 1, o: (stunned ? .75 : 1) * alive(t, T.ctlSkDie) });
      // Assassin path: home -> wizard -> stunned skull -> home
      const home = C.assassin, at1 = [C.wiz[0] + 22, C.wiz[1] + 4], at2 = [C.ctlSk[0] - 24, C.ctlSk[1] + 4];
      let pos = home;
      const d1 = io(seg(t, ...T.dash1)), d2 = io(seg(t, ...T.dash2)), dh = io(seg(t, ...T.home));
      if (t >= T.dash1[0]) pos = [lerp(home[0], at1[0], d1), lerp(home[1], at1[1], d1)];
      if (t >= T.dash2[0]) pos = [lerp(at1[0], at2[0], d2), lerp(at1[1], at2[1], d2)];
      if (t >= T.home[0]) pos = [lerp(at2[0], home[0], dh), lerp(at2[1], home[1], dh)];
      const moving = [T.dash1, T.dash2, T.home].some(([a, b2]) => t > a && t < b2);
      if (moving) el('line', { x1: lerp(pos[0], home[0], .0), y1: pos[1], x2: pos[0] - (pos[0] - (t < T.dash2[0] ? home : t < T.home[0] ? at1 : at2)[0]) * .35, y2: pos[1] - (pos[1] - (t < T.dash2[0] ? home : t < T.home[0] ? at1 : at2)[1]) * .35, stroke: BLUE, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .35 });
      xf(P.assassin, home, { dx: pos[0] - home[0], dy: pos[1] - home[1], r: moving ? 25 : 0 });
      spark(t, T.wizDie - .05, C.wiz, 15); spark(t, T.ctlSkDie - .05, C.ctlSk, 15);
      xf(S.wiz, C.wiz, { s: t < T.fadeIn[0] ? lerp(1, .2, seg(t, T.wizDie, T.wizDie + .3)) : 1, o: alive(t, T.wizDie) });

      // Everyone focuses the boss
      const fs = [10.2, 10.5, 10.8, 11.1, 11.4, 11.7, 12.0, 12.3];
      fs.forEach((s, i) => {
        const from = [C.mkL, C.mkR, C.mage, C.bruL, C.ctl, C.assassin, C.mkR, C.mage][i];
        bolt(t, s - .28, .28, from, [C.boss[0] + (i % 3 - 1) * 10, C.boss[1] + (i % 2) * 10], 5); spark(t, s, [C.boss[0] + (i % 3 - 1) * 14, C.boss[1] - 6], 18);
      });
      ring(t, T.bossDie, .6, C.boss, 30, 90, 4, PALE);
      return 0;
    };
    return T.end;
  }, { svg, hats, W, H });

  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
  const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
  if (only) { // quick stills: node render.js stills 1,3,5
    for (const t of only) { await p.evaluate(t => setT(t), t); await p.screenshot({ path: path.join(outDir, `t${t}.png`) }); }
  } else {
    const n = Math.round(total * FPS);
    for (let i = 0; i < n; i++) {
      await p.evaluate(t => setT(t), i / FPS);
      await p.screenshot({ path: path.join(outDir, `f${String(i).padStart(4, '0')}.png`) });
    }
    console.log(n, 'frames');
  }
  await b.close();
})();
