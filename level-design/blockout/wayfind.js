/* Which way is the exit? (The Level Design Book: Wayfinding)
   A courtyard plan (../shared/plan.js) with four exits; only the north one leads on. Players arrive one at a time and pick an exit.
   With no aids each exit is equally likely (1 in 4). Each aid adds an illustrative pull toward the right exit:
   chance of the right exit first try = 1 - (3/4) * product(1 - pull). A hard barrier closes the others outright.
   A player who picks a dead end walks to its end, turns back and then takes the north exit.
   The aids are ordered subtle to direct as in the book; the pull numbers are ours, not the book's. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, N = 24, GAP = .45, SPEED = 230;
  const AIDS = [
    ['detail', 'Unusual detail', .10, 'subtle'], ['sound', 'Sound', .12, 'subtle'],
    ['light', 'Lighting', .30, 'coarse'], ['landmark', 'Landmark', .40, 'coarse'], ['sign', 'Signage', .45, 'coarse'],
    ['crumbs', 'Breadcrumbs', .55, 'situational'], ['hud', 'HUD marker', .80, 'direct'], ['barrier', 'Hard barrier', 1, 'direct'],
  ];
  const rnd = (i, seed) => { let x = (i * 374761393 + seed * 668265263) >>> 0; x = (x ^ (x >>> 13)) * 1274126177 >>> 0; return (x >>> 8) / 16777216; };
  // the courtyard: an irregular hall with the start below and four ways out
  const P = PLAN.make();
  P.rect('Q', 330, 220, 710, 420, { cham: [0, 1, 2, 3], k: 40, lab: 'courtyard' });   // edges: 1 top, 2 NE cut, 3 right, 5 bottom, 7 left
  P.chain('Q', 5, [{ id: 'S', len: 90, turn: 0, w: 120, w0: 120, lab: 'start' }]);
  P.chain('Q', 1, [{ id: 'N1', len: 70, turn: 0, w: 90, w0: 90 }, { id: 'N', len: 80, turn: 10, w: 170, w0: 170, tint: '#f6e6bc' }]);
  P.chain('Q', 7, [{ id: 'W1', len: 120, turn: -15, w: 80, w0: 80 }, { id: 'W', len: 90, turn: 0, w: 130, w0: 130 }]);
  P.chain('Q', 2, [{ id: 'NE1', len: 100, turn: 0, w: 70, w0: 70 }, { id: 'NE', round: 50 }]);
  P.chain('Q', 3, [{ id: 'E1', len: 110, turn: 15, w: 80, w0: 80 }, { id: 'E', len: 90, turn: 0, w: 130, w0: 130 }]);
  { const n = P.rooms.N; P.stairs([n.c[0] - 40, n.c[1] + 30], [n.c[0] - 40, n.c[1] - 25], 34, 6); }
  P.rect('O', 760, 470, 930, 550, { lab: 'outbuilding', tint: '#ece5d4' });
  P.prop('planter', 420, 290, 13); P.prop('planter', 620, 360, 13); [[400, 380], [640, 260]].forEach(([x, y]) => P.prop('column', x, y, 7));
  P.prop('crate', P.rooms.W.c[0] - 20, P.rooms.W.c[1] + 18, 9, .4); P.prop('crate', P.rooms.E.c[0] + 15, P.rooms.E.c[1] - 15, 9, -.3);
  const EX = { W: ['W1', 'W'], N: ['N1', 'N'], NE: ['NE1', 'NE'], E: ['E1', 'E'] };
  const MOUTH = k => P.doorOf('Q', EX[k][0]).m;

  canvasDemo('wayfind', (s, cv, g) => {
    const on = new Set(); let seed = 1, t = 0, sim = null;
    const box = $(s, '.wf-aids');
    box.innerHTML = AIDS.map(([k, n, , tier]) => `<label class="chk"><input type="checkbox" data-k="${k}"> ${n} <small style="color:var(--muted);font-weight:400">${tier}</small></label>`).join('');
    const pRight = () => on.has('barrier') ? 1 : 1 - .75 * AIDS.filter(a => on.has(a[0])).reduce((m, a) => m * (1 - a[2]), 1);
    function run() {
      const p = pRight(), wrong = ['W', 'NE', 'E'];
      sim = Array.from({ length: N }, (_, i) => {
        const jx = (rnd(i, seed + 7) - .5) * 70, jy = (rnd(i, seed + 9) - .5) * 40, Q = P.rooms.Q.c;
        const goVia = (path, pts) => pts.forEach(q => path.go(q[0], q[1]));
        const path = T.Path(P.rooms.S.c, SPEED).wait(i * GAP);
        goVia(path, [P.doorOf('S', 'Q').m, [Q[0] + jx, Q[1] + jy + 20]]);
        const ok = rnd(i, seed) < p, first = ok ? 'N' : wrong[Math.floor(rnd(i, seed + 3) * 3)];
        if (!ok) { const out = P.walk(['Q', ...EX[first]]).slice(1); goVia(path, out); path.wait(.4); goVia(path, [...out.slice(0, -1).reverse(), [Q[0] + jx, Q[1] + jy]]); }
        goVia(path, P.walk(['Q', ...EX.N]).slice(1));
        return { path, ok, first, end: path.t, walk: path.t - i * GAP };
      });
      t = 0; stats();
    }
    function stats() {
      const p = pRight(), firstOk = sim.filter(x => x.ok).length, avg = sim.reduce((a, x) => a + x.walk, 0) / N;
      const open = on.has('barrier') ? 1 : 4, tiers = new Set(AIDS.filter(a => on.has(a[0])).map(a => a[3]));
      say($(s, '.wf-stats'),
        `<div class="${firstOk / N > .8 ? 'g' : firstOk / N > .5 ? 'y' : 'r'}"><b>${firstOk}/${N}</b><span>took the right exit on the first try (expected ${Math.round(p * 100)}%)</span></div>` +
        `<div><b>${avg.toFixed(1)}s</b><span>average walk from start to exit</span></div>` +
        `<div class="${open > 1 ? 'g' : 'y'}"><b>${open}</b><span>exit${open > 1 ? 's' : ''} the player can still choose</span></div>`);
      say($(s, '.wf-out'), !on.size ? 'No aids: the courtyard is a coin toss, and three in four players walk into a dead end first. Add aids from the top of the list down.'
        : on.has('barrier') ? '<b class="accent">Total certainty, no decision.</b> Nobody gets lost, and nobody chooses either. The book treats direct aids as the last resort: reach for them when the subtle ones have failed in playtests.'
        : tiers.has('direct') ? 'A HUD marker works on almost everyone, but players then follow the marker instead of reading the space. Try the same result with lighting, a landmark and signs.'
        : '<b class="accent">Stack subtle aids before direct ones.</b> Each one pulls a few more players the right way while leaving the choice with them. Watch how many still explore a dead end: some exploring is the point.');
    }
    $$(box, 'input').forEach(i => i.onchange = () => { i.checked ? on.add(i.dataset.k) : on.delete(i.dataset.k); seed++; run(); });
    $(s, '.wf-run').onclick = () => { seed++; run(); };
    run();
    window.__wayfindSet = (keys, tt = 0) => { on.clear(); keys.forEach(k => on.add(k)); $$(box, 'input').forEach(i => i.checked = on.has(i.dataset.k)); run(); t = tt; };

    const plan = P.render(W, H);
    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      // a landmark outside the building, beyond the right exit
      g.drawImage(plan, 0, 0);
      const R = P.rooms, nm = MOUTH('N'), Q = R.Q.c;
      ['W', 'NE', 'E'].forEach(k => T.label('dead end', R[EX[k][1]].c[0], R[EX[k][1]].c[1] - 30, 'center', C.muted, 13));
      T.flag(R.N.c[0] + 30, R.N.c[1] + 4); T.label('exit', R.N.c[0] - 40, R.N.c[1], 'center', C.goldInk, 14);
      T.label('start', R.S.c[0] + 60, R.S.c[1] + 10, 'center', C.muted, 13); T.label('outbuilding', R.O.c[0], R.O.c[1], 'center', C.muted, 13);
      // aids
      if (on.has('detail')) { const n1 = R.N1.pts; g.fillStyle = 'rgba(138,79,214,.22)'; g.beginPath(); n1.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill(); }
      if (on.has('light')) { const gr = g.createRadialGradient(nm[0], nm[1], 10, nm[0], nm[1], 140); gr.addColorStop(0, 'rgba(255,214,120,.7)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.fillRect(nm[0] - 150, nm[1] - 150, 300, 300); }
      if (on.has('sound')) for (let i = 0; i < 3; i++) { const k = ((t * .7 + i / 3) % 1); g.strokeStyle = `rgba(85,98,235,${.6 * (1 - k)})`; g.lineWidth = 3; g.beginPath(); g.arc(R.N.c[0], R.N.c[1], 20 + k * 110, Math.PI * .15, Math.PI * .85); g.stroke(); }
      if (on.has('landmark')) { g.save(); g.translate(700, 62); g.fillStyle = '#b9b3c8'; g.strokeStyle = PLAN.INK; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill(); g.stroke(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.fillStyle = '#d5d0e0'; g.fillRect(Math.cos(a) * 25 - 4, Math.sin(a) * 25 - 4, 8, 8); } g.fillStyle = PLAN.INK; g.fillRect(-2, -40, 4, 38); g.fillStyle = C.gold; g.beginPath(); g.moveTo(2, -40); g.lineTo(26, -33); g.lineTo(2, -26); g.fill(); g.restore(); T.label('tower, seen over the roof', 790, 62, 'left', C.muted, 13); }
      if (on.has('sign')) { const x = nm[0] - 70, y = nm[1] + 45; g.fillStyle = '#b07a4a'; g.fillRect(x - 3, y, 6, 30); g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 30, y - 26); g.lineTo(x + 20, y - 26); g.lineTo(x + 34, y - 13); g.lineTo(x + 20, y); g.lineTo(x - 30, y); g.closePath(); g.fill(); g.stroke(); g.font = '700 12px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT ↗', x, y - 13); }
      if (on.has('crumbs')) { const pts = P.walk(['S', 'Q', 'N1', 'N']); for (let i = 0; i < 7; i++) { const k = (i + 1) / 8, a = pts[Math.floor(k * (pts.length - 1))], b = pts[Math.min(pts.length - 1, Math.floor(k * (pts.length - 1)) + 1)], f = k * (pts.length - 1) % 1; const x = a[0] + (b[0] - a[0]) * f - 16, y = a[1] + (b[1] - a[1]) * f; g.fillStyle = C.gold; g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); g.stroke(); } }
      if (on.has('barrier')) ['W', 'NE', 'E'].forEach(k => { const m = MOUTH(k); for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? C.stoneDk : C.stone; g.beginPath(); g.arc(m[0] + (i - 2) * 9, m[1] + (i % 2) * 8 - 4, 12, 0, Math.PI * 2); g.fill(); } });
      // walkers
      const counts = { W: 0, N: 0, NE: 0, E: 0 };
      sim.forEach((w, i) => {
        if (t < i * GAP) return;
        const a = clamp((w.end + .6 - t) / .6); if (a <= 0) { counts[w.first]++; return; }
        const p = w.path.at(t); T.player(p.x, p.y, p.face, .62, a, w.ok ? C.player : C.p3);
        if (t > i * GAP + 2) counts[w.first]++;
      });
      // tallies at each exit: who picked it first
      Object.keys(EX).forEach(k => { if (on.has('barrier') && k !== 'N') return; const e = R[EX[k][1]].c; T.label(`${counts[k]} first`, e[0], e[1] + (k === 'N' ? 34 : 30), 'center', k === 'N' ? C.player : C.p3, 13); });
      if (on.has('hud')) { const h = [R.N.c[0], R.N.c[1] - 50]; g.save(); g.translate(h[0], h[1]); g.rotate(Math.PI / 4); g.fillStyle = 'rgba(255,185,81,.95)'; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(-10, -10, 20, 20); g.strokeRect(-10, -10, 20, 20); g.restore(); T.label('HUD: 24 m', h[0] + 70, h[1], 'center', C.goldInk, 13); }
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('blue: right exit first try · purple: tried a dead end first', 20, H - 14);
      if (t > Math.max(...sim.map(w => w.end)) + 3) { seed++; run(); }
    };
  });
})();
