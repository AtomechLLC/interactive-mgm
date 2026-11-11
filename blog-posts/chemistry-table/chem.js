/* Chemistry Table (replanned page for "Simple Rules, Emergent Results"; Scripture: Compositional Design, Systems That
   Generate the Structure of Fun, Judging Exploits). The learner switches seven one-line rules on or off and runs three
   fixed scenes. A small cell simulation plays each scene out and the page sorts what happened into intended (one rule
   did it), surprising (a chain of two or more rules did it) and degenerate (the camp burned, or one spark or strike
   felled four or more enemies). The totals over all 128 rule sets are computed at load by running every one. */
(function () {
  const C = TD.C, TAU = TD.TAU, FX = 24, FY = 56, CS = 32, GW = 20, GH = 12, FW = GW * CS, FH = GH * CS;
  const RULES = [['spread', 'Fire spreads to grass next to it'], ['douse', 'Fire next to water goes out'], ['water', 'Lightning runs through water'], ['metal', 'Lightning runs through metal'], ['wind', 'Wind carries fire east, over a gap'], ['spark', 'Lightning lights grass it touches'], ['runner', 'A burning enemy runs east, alight']];
  const SCENES = [{ n: 'Meadow', trig: 'spark', rows: ['..........w.........', '.gggggggggwggggg....', '.gggggggggwggggg....', '.gggEgggggwgggEgg...', '.gggggggggwggggggg..', '.FgggggEggWgggggggC.', '.gggggggggwgggggggC.', '.gggggggggwggggggg..', '.gggggggggwggggg....', '.gggggggggwggggg....', '..........w.........', '..........w.........'] },
    { n: 'Ford', trig: 'strike', rows: ['....................', '..........L.........', '..........mgEg......', '..........mgg.......', '..........m.........', 'wwwWwwwwWwwwWwwwWwww', 'wwwwwwwwwwwwwwwwwwww', 'gggggggggggggggggggg', 'ggggggggggggggggggg.', '.....e.......ggggg..', '.............gggCC..', '....................'] },
    { n: 'Storm camp', trig: 'strike', rows: ['....................', '....................', '....gggg............', '...gwwwwg....ggggw..', '...gwSwwmmmmMgEggwC.', '...gwWwwg....ggggwC.', '...gwwwwg....gEggw..', '....gggg.....ggggw..', '.............ggggw..', '....................', '....................', '....................'] }];
  const TYPE = { '.': '.', g: 'g', w: 'w', m: 'm', C: 'C', E: 'g', W: 'w', M: 'm', e: '.', F: 'g', L: 'm', S: 'w' };
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], pop = v => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; }, names = c => RULES.filter((r, i) => c >> i & 1).map(r => r[0]).join(' + ');
  function parse(k) { const sc = SCENES[k], S = { k, cells: [], en: [], step: 0, kills: [], saved: 0, camp: -1, stopped: false, hadFire: false, flash: 0, done: false };
    sc.rows.forEach((row, y) => [...row].forEach((ch, x) => { S.cells.push({ t: TYPE[ch], fire: 0, fc: 0, burnt: false, wet: false, ch: -1 }); if ('EWMe'.includes(ch)) S.en.push({ x, y, alive: true, burn: 0, c: 0 }); if ('FLS'.includes(ch)) S.trig = { x, y, kind: ch }; })); return S; }
  const at = (S, x, y) => x < 0 || y < 0 || x >= GW || y >= GH ? null : S.cells[y * GW + x];
  const flam = c => c && (c.t === 'g' || c.t === 'C') && !c.fire && !c.burnt && !c.wet;
  function light(S, c, cause) { c.fire = 3; c.fc = cause; S.hadFire = true; if (c.t === 'C' && S.camp < 0) S.camp = cause; }
  function tick(S, R) {
    S.step++;
    if (S.step === 1) { const T = S.trig, c0 = at(S, T.x, T.y);
      if (T.kind === 'F') light(S, c0, 0);
      else { c0.ch = 0; const q = [[T.x, T.y]]; while (q.length) { const [x, y] = q.shift(), c = at(S, x, y); N4.forEach(([dx, dy]) => { const n = at(S, x + dx, y + dy); if (!n || n.ch >= 0) return; if (n.t === 'w' && R & 4) { n.ch = c.ch | 4; q.push([x + dx, y + dy]); } if (n.t === 'm' && R & 8) { n.ch = c.ch | 8; q.push([x + dx, y + dy]); } }); }
        S.flash = 8; S.en.forEach(e => { const c = at(S, e.x, e.y); if (c.ch >= 0) { e.alive = false; e.how = 'shock'; S.kills.push({ how: 'shock', c: c.ch }); } });
        if (R & 32) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const c = at(S, x, y); if (c.ch >= 0) N4.forEach(([dx, dy]) => { const n = at(S, x + dx, y + dy); if (flam(n)) light(S, n, c.ch | 32); }); } }
      return; }
    if (S.flash) S.flash--;
    const burning = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const c = at(S, x, y); if (c.fire) burning.push([x, y, c]); }
    const live = burning.filter(([x, y, c]) => { if (R & 2 && N4.some(([dx, dy]) => at(S, x + dx, y + dy)?.t === 'w')) { c.fire = 0; c.wet = true; S.stopped = true; return false; } return true; });
    live.forEach(([x, y, c]) => { if (R & 1) N4.forEach(([dx, dy]) => { const n = at(S, x + dx, y + dy); if (flam(n)) light(S, n, c.fc | 1); }); if (R & 16) [1, 2].forEach(d => { const n = at(S, x + d, y); if (flam(n)) light(S, n, c.fc | 16); }); });
    S.en.forEach(e => { if (!e.alive) return;
      if (e.burn) { if (e.x + 1 < GW) e.x++; const c = at(S, e.x, e.y); if (c.t === 'w' && R & 2) { e.burn = 0; e.safe = true; S.saved++; return; } if (flam(c)) light(S, c, e.c | 64); if (--e.burn <= 0) { e.alive = false; e.how = 'burn'; S.kills.push({ how: 'burn', c: e.c }); } return; }
      const c = at(S, e.x, e.y); if (c.fire && !e.safe) { if (R & 64) { e.burn = 4; e.c = c.fc; } else { e.alive = false; e.how = 'burn'; S.kills.push({ how: 'burn', c: c.fc }); } } });
    live.forEach(([x, y, c]) => { if (--c.fire <= 0) { c.fire = 0; c.burnt = true; } });
    if (!S.cells.some(c => c.fire) && !S.en.some(e => e.burn) && !S.flash) S.done = true; if (S.step > 90) S.done = true;
  }
  function events(S) { const ev = [], grp = (how, hi) => S.kills.filter(k => k.how === how && (pop(k.c) >= 2) === hi);
    [['burn', 'burned'], ['shock', 'shocked']].forEach(([how, word]) => { const a = grp(how, false), b = grp(how, true); if (a.length) ev.push(['i', `${a.length} ${word}${how === 'burn' ? ' in the grass' : ''}`]); if (b.length) ev.push(['s', `${b.length} ${word}: ${names(b.reduce((u, k) => u | k.c, 0))}`]); });
    if (S.saved) ev.push(['s', `${S.saved} ran alight into water and lived`]); if (S.stopped) ev.push(['i', 'water stopped fire at the bank']);
    if (S.camp >= 0) ev.push(['d', `your camp burned${S.camp ? ': ' + names(S.camp) : ''}`]); if (S.kills.length >= 4) ev.push(['d', `${S.kills.length} enemies from one ${SCENES[S.k].trig}`]);
    if (!ev.length) ev.push(['n', 'nothing happened']); return ev; }
  function runAll(R) { return [0, 1, 2].map(k => { const S = parse(k); while (!S.done) tick(S, R); return events(S); }); }
  const count = (res, cl) => res.reduce((a, ev) => a + (ev ? ev.filter(e => e[0] === cl).length : 0), 0);
  const ALL = Array.from({ length: 128 }, (_, R) => { const r = runAll(R); return { R, s: count(r, 's'), d: count(r, 'd') }; }), withS = ALL.filter(a => a.s), clean = withS.filter(a => !a.d), bestClean = Math.max(0, ...clean.map(a => a.s)), bestAny = Math.max(...ALL.map(a => a.s));
  window.CHEM = { ALL, runAll };
  let API = null;
  PLAY.game('chem', {
    dur: 40, keys: [],
    setup(s, api) { API = api; },
    init(o, live) { return { live, t: 0, R: live ? 1 : 0, view: 0, run: null, res: [null, null, null], ran: -1, tries: 0 }; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click;
      if (typeof c === 'number' && !st.run) { st.R ^= 1 << c; st.res = [null, null, null]; st.ran = -1; st.S = null; }
      if (inp.setR != null) st.R = inp.setR;
      if (typeof c === 'string' && c.startsWith('sc') && !st.run) { st.view = +c[2]; st.S = null; }
      if (c === 'run' && !st.run) { st.res = [null, null, null]; st.run = { k: 0, acc: 0, wait: 0 }; st.view = 0; st.S = parse(0); st.tries++; }
      const r = st.run; if (!r) return;
      if (r.wait > 0) { r.wait -= dt; if (r.wait <= 0) { if (r.k >= 2) { st.run = null; st.ran = st.R; } else { r.k++; st.view = r.k; st.S = parse(r.k); } } return; }
      r.acc += dt; while (r.acc >= .07 && !st.S.done) { r.acc -= .07; tick(st.S, st.R); }
      if (st.S.done) { st.res[r.k] = events(st.S); r.wait = st.live ? .9 : .7; }
    },
    // the scripted designer runs two rule sets: fire and water alone, then nearly everything
    bot(st) { const out = { down: {}, press: {} }; if (st.run) return out; if (st.tries === 0) { if (st.t > .4) out.setR = 1 | 4; if (st.t > 1.6) out.click = 'run'; } else if (st.tries === 1) { st.botT = st.botT || st.t; if (st.t - st.botT > 1.5) out.setR = 1 | 4 | 8 | 16 | 32 | 64; if (st.t - st.botT > 3) out.click = 'run'; } return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const S = st.S || (st.S = parse(st.view)), sc = SCENES[st.view];
      GK.head(g, `Scene ${st.view + 1}: ${sc.n}`, FX, 32, 'left', C.ink, 17); SCENES.forEach((s2, k) => ui.btn('sc' + k, s2.n, FX + 330 + k * 104, 12, 98, 28, { px: 11, on: k === st.view }));
      g.save(); g.beginPath(); g.roundRect(FX, FY, FW, FH, 10); g.clip();
      S.cells.forEach((c, i) => { const x = FX + (i % GW) * CS, y = FY + Math.floor(i / GW) * CS; g.fillStyle = c.burnt ? '#4a4034' : c.t === 'g' ? (c.wet ? '#5f9a6a' : '#8fbf6a') : c.t === 'w' ? '#5aa9e6' : c.t === 'm' ? '#8d99ae' : c.t === 'C' ? '#d9a066' : '#d8c9a0'; g.fillRect(x, y, CS, CS); g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, CS - 1, CS - 1);
        if (c.t === 'm') { g.fillStyle = '#5c677d'; g.fillRect(x + 12, y, 8, CS); g.fillRect(x, y + 12, CS, 8); }
        if (c.t === 'C' && !c.burnt) { g.fillStyle = '#7a4a22'; g.beginPath(); g.moveTo(x + 4, y + 28); g.lineTo(x + 16, y + 4); g.lineTo(x + 28, y + 28); g.fill(); }
        if (c.fire) { g.fillStyle = '#ff7a1a'; g.fillRect(x, y, CS, CS); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + 16, y + 18 + Math.sin(st.t * 20 + i) * 2, 8, 0, TAU); g.fill(); }
        if (c.ch >= 0 && S.flash) { g.fillStyle = `rgba(255,245,120,${.25 + S.flash * .08})`; g.fillRect(x, y, CS, CS); } });
      S.en.forEach(e => { const x = FX + e.x * CS + 16, y = FY + e.y * CS + 16; if (!e.alive) { GK.text(g, '✕', x, y + 7, e.how === 'shock' ? '#fff27a' : '#2b2118', 20, 'center', 800); return; } TD.foe(x, y, 10, Math.PI, e.burn ? '#ff7a1a' : e.safe ? '#3c8f6a' : C.red); if (e.burn) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y - 12, 6, 0, TAU); g.fill(); } });
      const T = S.trig; TD.label(T.kind === 'F' ? 'spark' : 'strike', FX + T.x * CS + 16, FY + T.y * CS - 6 + (T.y === 0 ? 40 : 0), 'center', '#fff', 11, T.kind === 'F' ? 'rgba(200,80,20,.95)' : 'rgba(90,70,160,.95)');
      g.restore();
      GK.text(g, 'green grass · blue water · grey metal · tent your camp · red enemies', FX + FW, FY + FH + 14, C.muted, 10, 'right', 600);
      // results strip
      const cols = { i: C.navy, s: C.good, d: C.redDk, n: C.muted }, word = { i: 'intended', s: 'surprising', d: 'degenerate', n: '' };
      SCENES.forEach((s2, k) => { const x = FX + k * 216, y = FY + FH + 26; GK.text(g, s2.n, x, y + 4, C.ink, 12, 'left', 800); const ev = st.res[k]; if (!ev) { GK.text(g, st.run && st.run.k === k ? 'running…' : 'not run with these rules', x, y + 22, C.muted, 11, 'left', 600); return; }
        ev.slice(0, 6).forEach((e, i) => { g.fillStyle = cols[e[0]]; g.beginPath(); g.arc(x + 5, y + 18 + i * 15, 4, 0, TAU); g.fill(); GK.text(g, e[1].length > 34 ? e[1].slice(0, 33) + '…' : e[1], x + 14, y + 22 + i * 15, cols[e[0]], 10.5, 'left', 700); }); });
      // rules
      const RX = 690, RW = 326; GK.text(g, 'the rules of this world: click to switch', RX, 32, C.muted, 12, 'left', 700);
      RULES.forEach((r, i) => { const y = 44 + i * 40, on = st.R >> i & 1; GK.box(g, RX, y, RW, 34, on ? '#eaf6e6' : '#fffaf0', on ? C.good : '#cdbf9f', 8, on ? 2.5 : 1.5); ui.hit(i, RX, y, RW, 34); GK.box(g, RX + 10, y + 8, 18, 18, on ? C.good : '#fff', on ? C.good : '#9a8f78', 4, 2); if (on) GK.text(g, '✓', RX + 19, y + 23, '#fff', 14, 'center', 800); GK.text(g, r[1], RX + 38, y + 22, C.ink, 12.5, 'left', 700); });
      const n = pop(st.R), y0 = 44 + 7 * 40 + 6; GK.text(g, `${n} rule${n === 1 ? '' : 's'} on · ${n * (n - 1) / 2} pair${n * (n - 1) / 2 === 1 ? '' : 's'} that can meet`, RX, y0 + 12, C.ink, 12, 'left', 700);
      if (!st.run) ui.btn('run', 'Run the three scenes', RX, y0 + 24, RW, 40, { px: 14, on: true }); else GK.text(g, `running scene ${st.run.k + 1} of 3…`, RX + RW / 2, y0 + 50, C.muted, 13, 'center', 700);
      [['i', 'intended: one rule did it'], ['s', 'surprising: a chain of two or more rules'], ['d', 'degenerate: camp burned, or 4+ enemies at once']].forEach(([k, t], i) => { g.fillStyle = cols[k]; g.beginPath(); g.arc(RX + 6, y0 + 84 + i * 17, 4, 0, TAU); g.fill(); GK.text(g, t, RX + 16, y0 + 88 + i * 17, cols[k], 11, 'left', 700); });
      GK.wrap(g, `All 128 rule sets, run by this page: ${withS.length} produce a surprise, and ${clean.length} of those stay free of a degenerate result. The most surprises a clean set reaches is ${bestClean}; the most any set reaches is ${bestAny}.`, RX, y0 + 142, RW, 15, C.muted, 11, 600);
      const ni = count(st.res, 'i'), ns = count(st.res, 's'), nd = count(st.res, 'd'), ran = st.res.every(Boolean);
      ui.stats(`<div><b>${ni}</b><span>intended</span></div><div class="g"><b>${ns}</b><span>surprising</span></div><div class="r"><b>${nd}</b><span>degenerate</span></div>`);
      if (!ran) { ui.out(live ? 'Switch rules on, then run the scenes. You did not build them, and neither did your rules.' : 'A scripted designer runs two rule sets. The scenes play out by the rules alone.'); return; }
      const who = live ? 'Your' : 'The script’s';
      ui.out(`${who} ${n} rule${n === 1 ? '' : 's'} gave ${ni} intended, ${ns} surprising and ${nd} degenerate results. ` + (ns && nd ? 'The surprises and the exploits came out of the same rule set: the chain that delights is the chain that breaks a scene. ' : ns ? `This set surprises without breaking a scene. ${ns < bestAny ? `It also stops at ${ns} surprise${ns === 1 ? '' : 's'}, where the wildest set reaches ${bestAny}.` : ''} ` : nd ? 'This set broke a scene without one surprise. ' : 'Nothing beyond what each rule says on its own: no chain formed. ') + (live && !(ns && !nd) ? `Can you reach ${bestClean} surprises with nothing degenerate?` : ''));
    },
  });
})();
