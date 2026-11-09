/* A mission is a list of conditions (genre breakdown: "How to Make a Game Like GTA?").
   The city runs on its own: traffic, police patrols, pedestrians and a clock. A mission adds nothing to that world;
   it is only a chain of condition blocks checked every frame, and the player's car (driven here by a simple AI)
   chases whichever condition is active. Build a chain from the blocks; the world never pauses between them. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const NX = 5, NY = 5, GX = i => 60 + i * 150, GY = j => 52 + j * 120, MAPW = 720;
  const node = (i, j) => j * NX + i, NI = n => n % NX, NJ = n => Math.floor(n / NX);
  const pos = n => [GX(NI(n)), GY(NJ(n))];
  const nbrs = n => { const i = NI(n), j = NJ(n), o = []; if (i > 0) o.push(node(i - 1, j)); if (i < NX - 1) o.push(node(i + 1, j)); if (j > 0) o.push(node(i, j - 1)); if (j < NY - 1) o.push(node(i, j + 1)); return o; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const MARK = node(4, 0), GAR = node(0, 4);
  const BLOCKS = {
    reach: { name: 'Reach the marker', cond: 'distance(player, marker) < 24', val: w => `${Math.round(dist(w.p.xy, pos(MARK)))}`, ok: w => dist(w.p.xy, pos(MARK)) < 24 },
    wanted: { name: 'Get a wanted level', cond: 'wanted ≥ 1', val: w => `${w.wanted}`, ok: w => w.wanted >= 1 },
    lose: { name: 'Lose the wanted level', cond: 'wanted = 0', val: w => `${w.wanted}`, ok: w => w.wanted === 0 },
    night: { name: 'Wait until night', cond: 'clock ≥ 20:00', val: w => clockStr(w.clock), ok: w => w.clock >= 20 },
    deliver: { name: 'Deliver the car to the garage', cond: 'distance(player, garage) < 24', val: w => `${Math.round(dist(w.p.xy, pos(GAR)))}`, ok: w => dist(w.p.xy, pos(GAR)) < 24 },
  };
  const clockStr = c => `${String(Math.floor(c) % 24).padStart(2, '0')}:${String(Math.floor((c % 1) * 60)).padStart(2, '0')}`;
  const DT = 1 / 30, SIGHT = 140;

  function mover(n, speed, r, kind, col) { const nb = nbrs(n); return { a: n, b: nb[Math.floor(r() * nb.length)], k: r(), speed, kind, col, xy: pos(n), ang: 0 }; }
  function newWorld(chain) {
    const r = GK.rng(11);
    const cols = ['#e5322d', '#2fae63', '#8a4fd6', '#d9822b', '#e9e6dc', '#57b6ff', '#a07a52', '#f1c84b'];
    const w = { r, chain, step: 0, done: [], wanted: 0, unseen: 0, clock: 12, t: 0, passed: null,
      cars: Array.from({ length: 9 }, (_, i) => mover(Math.floor(r() * NX * NY), 55 + r() * 20, r, 'car', cols[i % cols.length])),
      cops: [mover(node(2, 2), 70, r, 'cop'), mover(node(1, 3), 70, r, 'cop')],
      peds: Array.from({ length: 16 }, () => mover(Math.floor(r() * NX * NY), 14 + r() * 6, r, 'ped')),
      p: { a: node(0, 2), b: node(0, 2), k: 1, speed: 135, xy: pos(node(0, 2)), ang: 0 } };
    return w;
  }
  // choose the neighbour of n that heads toward point tgt (greedy on the grid)
  const toward = (n, tgt) => nbrs(n).reduce((best, m) => dist(pos(m), tgt) < dist(pos(best), tgt) ? m : best);
  function advance(m, dt, next) {
    m.k += m.speed * dt / Math.max(1, dist(pos(m.a), pos(m.b)));
    if (m.k >= 1) { const prev = m.a; m.a = m.b; m.k = 0; m.b = next(m, prev); if (m.b === m.a) m.k = 1; }
    const A = pos(m.a), B = pos(m.b); m.xy = [lerp(A[0], B[0], m.k), lerp(A[1], B[1], m.k)];
    if (m.b !== m.a) m.ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
  }
  const wander = r => (m, prev) => { const nb = nbrs(m.a).filter(x => x !== prev); return nb[Math.floor(r() * nb.length)] ?? prev; };
  function playerTarget(w) {
    const blk = w.chain[w.step];
    if (!blk || w.passed != null) return null;
    if (blk === 'reach') return pos(MARK);
    if (blk === 'deliver') return pos(GAR);
    if (blk === 'wanted') return w.cops.reduce((b, c) => dist(c.xy, w.p.xy) < dist(b.xy, w.p.xy) ? c : b).xy;
    if (blk === 'lose') { // the intersection farthest from every police car, among the neighbours
      let best = null, bv = -1; for (let n = 0; n < NX * NY; n++) { const v = Math.min(...w.cops.map(c => dist(pos(n), c.xy))) - .25 * dist(pos(n), w.p.xy); if (v > bv) { bv = v; best = n; } }
      return pos(best);
    }
    return null; // waiting: park
  }
  function step(w, dt) {
    w.t += dt; w.clock += dt / 2;   // one game hour every two seconds
    const wan = wander(w.r);
    w.cars.forEach(m => advance(m, dt, wan));
    w.peds.forEach(m => advance(m, dt, wan));
    w.cops.forEach(c => {
      c.chase = w.wanted > 0 && dist(c.xy, w.p.xy) < SIGHT;
      c.speed = c.chase ? 92 : 70;
      advance(c, dt, c.chase ? (m) => toward(m.a, w.p.xy) : wan);
    });
    const tgt = playerTarget(w), p = w.p;
    if (tgt && !(p.k >= 1 && dist(p.xy, tgt) < 4)) {
      if (p.k >= 1) { p.b = toward(p.a, tgt); p.k = 0; if (p.b === p.a) p.k = 1; }
      advance(p, dt, m => toward(m.a, tgt));
    }
    // wanted level: touching a police car while the mission asks for it, then lose it out of their sight
    const near = Math.min(...w.cops.map(c => dist(c.xy, p.xy)));
    if (w.chain[w.step] === 'wanted' && near < 26) w.wanted = 2;
    if (w.wanted > 0) { if (near > SIGHT) { w.unseen += dt; if (w.unseen > 2) { w.wanted--; w.unseen = 0; } } else w.unseen = 0; }
    // the mission: check the active condition
    const blk = w.chain[w.step];
    if (blk && w.passed == null && BLOCKS[blk].ok(w)) { w.done.push(w.t); w.step++; if (w.step >= w.chain.length) w.passed = w.t; }
  }
  function car(g, m, col, s = 1) {
    g.save(); g.translate(m.xy[0], m.xy[1]); g.rotate(m.ang);
    g.fillStyle = col; g.beginPath(); g.roundRect(-11 * s, -6 * s, 22 * s, 12 * s, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(2 * s, -4.5 * s, 5 * s, 9 * s); g.restore();
  }

  GK.scene('mission', (s, g, ui) => {
    const add = [...s.querySelectorAll('.gm-add')], clr = s.querySelector('.gm-clear'); ui.watch(add, clr);
    let chain = ['reach', 'night', 'wanted', 'lose', 'deliver'], user = false, t0 = 0, W = null, lastT = -1, sig = '';
    add.forEach(b => b.onclick = () => { if (!user) { chain = []; user = true; } if (chain.length < 6) chain.push(b.dataset.b); t0 = ui.t; });
    clr.onclick = () => { user = true; chain = []; t0 = ui.t; };
    const TOUR = ['reach', 'night', 'wanted', 'lose', 'deliver'];
    return {
      dur: 40,
      frame(t, tour) {
        if (tour) { chain = TOUR; user = false; t0 = 0; }
        const lt = t - t0, k = chain.join(',') + '|' + t0;
        if (k !== sig || lt < lastT || !W) { W = newWorld(chain.slice()); sig = k; }
        while (W.t + DT <= lt) step(W, DT);
        lastT = lt;
        GK.panel(g);
        // city
        g.fillStyle = '#d8cdb5'; g.beginPath(); g.roundRect(10, 10, MAPW - 20, 565, 10); g.fill();
        const hr = W.clock % 24, night = hr >= 12 ? clamp((hr - 18) / 2) : clamp((7 - hr) / 2);
        for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NY - 1; j++) {
          const x = GX(i) + 18, y = GY(j) + 18, ww = 150 - 36, hh = 120 - 36;
          g.fillStyle = (i + j) % 3 === 0 ? '#9fb98a' : '#b9ab8f'; g.beginPath(); g.roundRect(x, y, ww, hh, 6); g.fill();
        }
        g.fillStyle = '#5b5f73';
        for (let i = 0; i < NX; i++) g.fillRect(GX(i) - 13, GY(0) - 13, 26, GY(NY - 1) - GY(0) + 26);
        for (let j = 0; j < NY; j++) g.fillRect(GX(0) - 13, GY(j) - 13, GX(NX - 1) - GX(0) + 26, 26);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([8, 10]); g.lineWidth = 1.5;
        for (let i = 0; i < NX; i++) { g.beginPath(); g.moveTo(GX(i), GY(0)); g.lineTo(GX(i), GY(NY - 1)); g.stroke(); }
        for (let j = 0; j < NY; j++) { g.beginPath(); g.moveTo(GX(0), GY(j)); g.lineTo(GX(NX - 1), GY(j)); g.stroke(); }
        g.setLineDash([]);
        // marker and garage
        const M = pos(MARK), G = pos(GAR), pulse = 1 + .15 * Math.sin(t * 5);
        const act = chain[W.step];
        g.strokeStyle = C.gold; g.lineWidth = act === 'reach' ? 5 : 2.5; g.beginPath(); g.arc(M[0], M[1], 20 * pulse, 0, 7); g.stroke();
        TD.label('marker', M[0] - 40, M[1] + 36, 'center', C.goldInk, 12);
        g.fillStyle = C.wall; g.fillRect(G[0] + 16, G[1] - 40, 56, 36); g.fillStyle = act === 'deliver' ? C.gold : '#c9c3b2'; g.fillRect(G[0] + 26, G[1] - 22, 36, 18);
        TD.label('garage', G[0] + 44, G[1] - 52, 'center', C.ink, 12);
        // world
        W.peds.forEach(m => { const o = (m.a + m.b) % 2 ? 16 : -16; g.fillStyle = '#3d4270'; g.beginPath(); g.arc(m.xy[0] + (Math.abs(Math.cos(m.ang)) > .5 ? 0 : o), m.xy[1] + (Math.abs(Math.cos(m.ang)) > .5 ? o : 0), 3, 0, 7); g.fill(); });
        W.cars.forEach(m => car(g, m, m.col));
        W.cops.forEach(c => {
          if (W.wanted > 0) { g.strokeStyle = c.chase ? 'rgba(229,50,45,.55)' : 'rgba(29,37,80,.35)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc(c.xy[0], c.xy[1], SIGHT, 0, 7); g.stroke(); g.setLineDash([]); }
          car(g, c, '#1d2550'); const blink = Math.floor(t * 6) % 2;
          g.fillStyle = c.chase ? (blink ? C.red : C.blue) : '#fff'; g.beginPath(); g.arc(c.xy[0], c.xy[1], 3.5, 0, 7); g.fill();
        });
        car(g, W.p, C.player, 1.25);
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(W.p.xy[0], W.p.xy[1], 16, 0, 7); g.stroke();
        if (night > 0) { g.fillStyle = `rgba(16,22,58,${.35 * night})`; g.beginPath(); g.roundRect(10, 10, MAPW - 20, 565, 10); g.fill(); }
        // wanted stars
        for (let i = 0; i < 2; i++) { g.font = GK.font(800, 22, 'd'); g.fillStyle = i < W.wanted ? C.gold : 'rgba(255,255,255,.5)'; g.textAlign = 'left'; g.fillText('★', 24 + i * 24, 40); }
        // mission panel
        const PX = 740;
        GK.head(g, 'Mission', PX, 34, 'left', C.ink, 18);
        GK.text(g, `world clock ${clockStr(W.clock)}`, 1025, 34, C.muted, 13, 'right', 600);
        if (!chain.length) GK.wrap(g, 'No mission. Add blocks: the city keeps running either way.', PX, 70, 280, 18, C.muted, 13);
        chain.forEach((b, i) => {
          const y = 52 + i * 62, st = i < W.step ? 'done' : i === W.step && W.passed == null ? 'active' : 'wait';
          GK.box(g, PX, y, 285, 54, st === 'active' ? '#fff3d6' : st === 'done' ? '#e3f2e6' : '#fffaf0', st === 'active' ? C.gold : st === 'done' ? C.good : '#cdbf9f', 8, st === 'active' ? 2.5 : 1.5);
          GK.text(g, `${st === 'done' ? '✓' : st === 'active' ? '▶' : i + 1}  ${BLOCKS[b].name}`, PX + 12, y + 21, st === 'done' ? C.good : C.ink, 14, 'left', 700);
          GK.text(g, st === 'active' ? `${BLOCKS[b].cond}   now: ${BLOCKS[b].val(W)}` : st === 'done' ? `passed at ${W.done[i].toFixed(1)} s` : BLOCKS[b].cond, PX + 12, y + 42, C.muted, 12, 'left', 500);
        });
        const yb = 52 + Math.max(chain.length, 1) * 62 + 14;
        if (W.passed != null && chain.length) { GK.box(g, PX, yb - 6, 285, 34, C.good, null, 8); GK.text(g, `Mission passed at ${W.passed.toFixed(1)} s`, PX + 142, yb + 16, '#fff', 15, 'center', 700); }
        GK.wrap(g, `Still running: ${W.cars.length} cars, ${W.cops.length} police, ${W.peds.length} pedestrians and the clock, with or without a mission.`, PX, 552, 285, 17, C.muted, 12);
        ui.stats(`<div><b>${Math.min(W.step, chain.length)}/${chain.length}</b><span>conditions met</span></div><div class="g"><b>${clockStr(W.clock)}</b><span>world clock</span></div>`);
        ui.out(W.passed != null ? 'Mission passed, and the city carries on: the same traffic, police and clock that ran before the first block.'
          : chain.length ? `Waiting on one condition: <b>${BLOCKS[chain[W.step]].cond}</b>. Nothing else in the world waits for it.`
          : 'No mission: the world simulation runs anyway.');
      },
    };
  });
})();
