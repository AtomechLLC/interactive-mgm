/* Which way is the exit? (The Level Design Book: Wayfinding)
   A plaza with four exits; only the north one leads on. Players arrive one at a time and pick an exit.
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
  const START = [520, 545], PLAZA = [520, 300];
  const EXITS = { W: [70, 300], N: [520, 70], NE: [890, 75], E: [975, 300] };
  const rnd = (i, seed) => { let x = (i * 374761393 + seed * 668265263) >>> 0; x = (x ^ (x >>> 13)) * 1274126177 >>> 0; return (x >>> 8) / 16777216; };

  canvasDemo('wayfind', (s, cv, g) => {
    const on = new Set(); let seed = 1, t = 0, sim = null;
    const box = $(s, '.wf-aids');
    box.innerHTML = AIDS.map(([k, n, , tier]) => `<label class="chk"><input type="checkbox" data-k="${k}"> ${n} <small style="color:var(--muted);font-weight:400">${tier}</small></label>`).join('');
    const pRight = () => on.has('barrier') ? 1 : 1 - .75 * AIDS.filter(a => on.has(a[0])).reduce((m, a) => m * (1 - a[2]), 1);
    function run() {
      const p = pRight(), wrong = ['W', 'NE', 'E'];
      sim = Array.from({ length: N }, (_, i) => {
        const jx = (rnd(i, seed + 7) - .5) * 60, jy = (rnd(i, seed + 9) - .5) * 40;
        const path = T.Path([START[0] + jx * .3, START[1]], SPEED).wait(i * GAP).go(PLAZA[0] + jx, PLAZA[1] + jy + 30);
        const ok = rnd(i, seed) < p, first = ok ? 'N' : wrong[Math.floor(rnd(i, seed + 3) * 3)];
        if (!ok) { const e = EXITS[first]; path.go(e[0], e[1]).wait(.4).go(PLAZA[0] + jx, PLAZA[1] + jy); }
        path.go(EXITS.N[0] + jx * .4, EXITS.N[1]);
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
      say($(s, '.wf-out'), !on.size ? 'No aids: the plaza is a coin toss, and three in four players walk into a dead end first. Add aids from the top of the list down.'
        : on.has('barrier') ? '<b class="accent">Total certainty, no decision.</b> Nobody gets lost, and nobody chooses either. The book treats direct aids as the last resort: reach for them when the subtle ones have failed in playtests.'
        : tiers.has('direct') ? 'A HUD marker works on almost everyone, but players then follow the marker instead of reading the space. Try the same result with lighting, a landmark and signs.'
        : '<b class="accent">Stack subtle aids before direct ones.</b> Each one pulls a few more players the right way while leaving the choice with them. Watch how many still explore a dead end: some exploring is the point.');
    }
    $$(box, 'input').forEach(i => i.onchange = () => { i.checked ? on.add(i.dataset.k) : on.delete(i.dataset.k); seed++; run(); });
    $(s, '.wf-run').onclick = () => { seed++; run(); };
    run();
    window.__wayfindSet = (keys, tt = 0) => { on.clear(); keys.forEach(k => on.add(k)); $$(box, 'input').forEach(i => i.checked = on.has(i.dataset.k)); run(); t = tt; };

    function corridor(a, b, w = 70) {
      g.lineCap = 'butt'; g.strokeStyle = C.wall; g.lineWidth = w + 16; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
      g.strokeStyle = C.floor; g.lineWidth = w; g.stroke();
    }
    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      // map: start corridor, plaza, four exits
      corridor(START, PLAZA); Object.values(EXITS).forEach(e => corridor(PLAZA, e));
      g.fillStyle = C.wall; g.fillRect(PLAZA[0] - 158, PLAZA[1] - 108, 316, 216); T.floor(PLAZA[0] - 150, PLAZA[1] - 100, 300, 200);
      // exit mouths: dead ends get a wall cap, north gets the goal
      ['W', 'NE', 'E'].forEach(k => { const e = EXITS[k]; g.fillStyle = C.wallDk; g.beginPath(); g.arc(e[0], e[1], 14, 0, Math.PI * 2); g.fill(); T.label('dead end', e[0], e[1] + (k === 'NE' ? 34 : -46), 'center', C.muted, 13); });
      T.flag(EXITS.N[0] + 40, EXITS.N[1] + 6); T.label('exit', EXITS.N[0] - 52, EXITS.N[1], 'center', C.goldInk, 14);
      const nMid = [(PLAZA[0] + EXITS.N[0]) / 2, (PLAZA[1] + EXITS.N[1]) / 2];
      // aids
      if (on.has('detail')) { g.fillStyle = 'rgba(138,79,214,.28)'; g.fillRect(EXITS.N[0] - 35, PLAZA[1] - 150, 70, 46); }
      if (on.has('light')) { const gr = g.createRadialGradient(nMid[0], nMid[1] + 40, 10, nMid[0], nMid[1] + 40, 150); gr.addColorStop(0, 'rgba(255,214,120,.65)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.fillRect(nMid[0] - 160, nMid[1] - 120, 320, 320); }
      if (on.has('sound')) for (let i = 0; i < 3; i++) { const k = ((t * .7 + i / 3) % 1); g.strokeStyle = `rgba(85,98,235,${.6 * (1 - k)})`; g.lineWidth = 3; g.beginPath(); g.arc(EXITS.N[0], EXITS.N[1] + 20, 20 + k * 90, Math.PI * .15, Math.PI * .85); g.stroke(); }
      if (on.has('landmark')) { const x = 640, y = 20; g.fillStyle = C.stone; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(x, y + 10, 34, 80); g.strokeRect(x, y + 10, 34, 80); for (let i = 0; i < 3; i++) { g.fillRect(x + i * 13, y, 8, 10); g.strokeRect(x + i * 13, y, 8, 10); } T.label('tower', x + 70, y + 50, 'center', C.muted, 13); }
      if (on.has('sign')) { const x = PLAZA[0] - 60, y = PLAZA[1] - 70; g.fillStyle = '#b07a4a'; g.fillRect(x - 3, y, 6, 34); g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 30, y - 26); g.lineTo(x + 20, y - 26); g.lineTo(x + 34, y - 13); g.lineTo(x + 20, y); g.lineTo(x - 30, y); g.closePath(); g.fill(); g.stroke(); g.font = '700 12px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT ↑', x, y - 13); }
      if (on.has('crumbs')) for (let i = 0; i < 5; i++) { const y = PLAZA[1] - 30 - i * 42; g.fillStyle = C.gold; g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.arc(EXITS.N[0] - 18, y, 7, 0, Math.PI * 2); g.fill(); g.stroke(); }
      if (on.has('barrier')) ['W', 'NE', 'E'].forEach(k => { const e = EXITS[k], x = (PLAZA[0] * 1.6 + e[0]) / 2.6, y = (PLAZA[1] * 1.6 + e[1]) / 2.6; for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? C.stoneDk : C.stone; g.beginPath(); g.arc(x + (i - 2) * 11, y + (i % 2) * 8 - 4, 13, 0, Math.PI * 2); g.fill(); } });
      // walkers
      const counts = { W: 0, N: 0, NE: 0, E: 0 };
      sim.forEach((w, i) => {
        if (t < i * GAP) return;
        const a = clamp((w.end + .6 - t) / .6); if (a <= 0) { counts[w.first]++; return; }
        const p = w.path.at(t); T.player(p.x, p.y, p.face, .62, a, w.ok ? C.player : C.p3);
        if (t > i * GAP + Math.hypot(START[0] - PLAZA[0], START[1] - PLAZA[1]) / SPEED + .5) counts[w.first]++;
      });
      // tallies at each exit: who picked it first
      Object.entries(EXITS).forEach(([k, e]) => { if (on.has('barrier') && k !== 'N') return; const lx = k === 'W' ? e[0] + 60 : k === 'E' ? e[0] - 60 : k === 'NE' ? e[0] - 70 : e[0] + 64; T.label(`${counts[k]} first`, lx, k === 'N' ? e[1] + 50 : e[1] + 30, 'center', k === 'N' ? C.player : C.p3, 13); });
      if (on.has('hud')) { g.save(); g.translate(EXITS.N[0], 30); g.rotate(Math.PI / 4); g.fillStyle = 'rgba(255,185,81,.95)'; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(-10, -10, 20, 20); g.strokeRect(-10, -10, 20, 20); g.restore(); T.label('HUD: 24 m', EXITS.N[0] + 70, 28, 'center', C.goldInk, 13); }
      T.label('start', START[0] + 60, START[1], 'center', C.muted, 13);
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('blue: right exit first try · purple: tried a dead end first', 20, H - 14);
      if (t > Math.max(...sim.map(w => w.end)) + 3) { seed++; run(); }
    };
  });
})();
