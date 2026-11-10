/* Same Dungeon, Fifth Time (replanned page for the MMO-as-a-service post; Scripture: Late-Stage Retention Problems,
   Repetition Blocking, Variance Generators). Five runs of one dungeon; before each the learner picks an affix and plans
   a route. The readout is their own five routes side by side: which affixes changed the line they drew. */
(function () {
  const C = TD.C, { clamp, lerp } = TD, D = DUNGEON;
  const MX = 20, MY = 44, MW = 640, MH = 330;
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
  const key = r => r.map(i => D.PACKS[i].id).join('');
  const SCRIPT = [['x0', 'p0', 'p2', 'p5', 'p6'], ['x3', 'p0', 'p2', 'p5', 'p6'], ['x2', 'p2', 'p1', 'p4', 'p6'], ['x4', 'p0', 'p2', 'p1', 'p3'], ['x5', 'p0', 'p1', 'p3', 'p4']];
  const pts = route => [D.START, ...route.map(i => [D.PACKS[i].x, D.PACKS[i].y]), D.BOSS];
  function along(P, k) {   // the point a fraction k along a polyline
    const L = P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1])), tot = L.reduce((a, b) => a + b, 0); let d = k * tot;
    for (let i = 0; i < L.length; i++) { if (d <= L[i]) return [lerp(P[i][0], P[i + 1][0], d / L[i]), lerp(P[i][1], P[i + 1][1], d / L[i])]; d -= L[i]; }
    return P[P.length - 1];
  }
  PLAY.game('dungeon', {
    dur: 47, keys: [],
    init: (o, live) => ({ live, t: 0, run: 0, affix: -1, route: [], phase: 'plan', at: 0, runs: [], si: 0, sj: 0, wait: 1 }),
    step(st, inp, dt) {
      st.t += dt; const c = inp.click;
      if (st.phase === 'go' && st.t - st.at > 3) { st.phase = 'result'; st.runs.push({ affix: st.affix, route: st.route.slice(), ...D.cost(st.affix, st.route) }); }
      if (!c) return;
      if (st.phase === 'plan') {
        if (c[0] === 'x') st.affix = +c.slice(1);
        if (c[0] === 'p') { const i = +c.slice(1), k = st.route.indexOf(i); if (k >= 0) st.route.splice(k, 1); else st.route.push(i); }
        if (c === 'clear') st.route = [];
        if (c === 'go' && st.affix >= 0 && D.cost(st.affix, st.route).ok) { st.phase = 'go'; st.at = st.t; }
      } else if (st.phase === 'result' && c === 'next') { if (st.run < 4) { st.run++; st.affix = -1; st.route = []; st.phase = 'plan'; } else st.phase = 'end'; }
    },
    bot(st) {
      const click = id => ({ down: {}, press: {}, click: id });
      if (st.phase === 'plan') {
        if (st.t < st.wait) return null; st.wait = st.t + .45;
        const s = SCRIPT[st.run]; if (st.sj < s.length) return click(s[st.sj++]); st.sj = 0; return click('go');
      }
      if (st.phase === 'result' && st.t - st.at > 5.2) { st.wait = st.t + .5; return click('next'); }
      return null;
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const a = st.affix, A = D.AFFIX[a], plan = st.phase === 'plan';
      GK.head(g, st.phase === 'end' ? 'Five runs, one dungeon' : `Run ${st.run + 1} of 5${A ? ': ' + A.n : ''}`, MX, 30, 'left', C.ink, 17);
      // the map
      g.save(); g.beginPath(); g.roundRect(MX, MY, MW, MH, 12); g.clip();
      g.fillStyle = C.wallDk; g.fillRect(MX, MY, MW, MH);
      const X = x => MX + x, Y = y => MY + 10 + y * .85;
      // corridors along every pack-to-pack hop that makes sense, then the rooms
      g.strokeStyle = C.floor; g.lineWidth = 26; g.lineCap = 'round'; g.lineJoin = 'round';
      [[D.START, [140, 190]], [[140, 190], [250, 90]], [[140, 190], [250, 290]], [[250, 90], [360, 190]], [[250, 290], [360, 190]], [[140, 190], [360, 190]], [[250, 90], [440, 60]], [[360, 190], [440, 60]], [[250, 290], [470, 300]], [[360, 190], [470, 300]], [[360, 190], [530, 180]], [[440, 60], [530, 180]], [[470, 300], [530, 180]], [[530, 180], D.BOSS], [[470, 300], D.BOSS], [[440, 60], D.BOSS]]
        .forEach(([p, q]) => { g.beginPath(); g.moveTo(X(p[0]), Y(p[1])); g.lineTo(X(q[0]), Y(q[1])); g.stroke(); });
      D.PACKS.forEach(p => { g.fillStyle = C.floor; g.beginPath(); if (p.narrow) g.roundRect(X(p.x) - 44, Y(p.y) - 22, 88, 44, 8); else g.arc(X(p.x), Y(p.y), 46, 0, TD.TAU); g.fill(); });
      g.fillStyle = C.floor; g.beginPath(); g.arc(X(D.BOSS[0]), Y(D.BOSS[1]), 34, 0, TD.TAU); g.fill();
      // the route so far
      const P = pts(st.route).map(p => [X(p[0]), Y(p[1])]);
      if (st.route.length) TD.trail(st.phase === 'plan' ? P.slice(0, -1) : P, C.navy, 1, 4);
      const tint = a === 0 ? '#ff2a2a' : C.red;
      D.PACKS.forEach((p, i) => {
        const x = X(p.x), y = Y(p.y), ord = st.route.indexOf(i);
        for (let k = 0; k < p.mobs; k++) {
          const big = k < p.big, cast = k >= p.mobs - p.cast, ang = k * 2.4, r = big ? 0 : 10 + (k % 3) * 9;
          const mx = x + Math.cos(ang) * r * (p.narrow ? 1.5 : 1) + (big ? (k - (p.big - 1) / 2) * 26 : 0), my = y + Math.sin(ang) * r * (p.narrow ? .5 : 1);
          g.globalAlpha = ord >= 0 || plan ? 1 : .35; TD.foe(mx, my, big ? 12 : 6.5, 0, cast ? '#b23a6b' : tint, cast ? { mark: 'staff' } : {}); g.globalAlpha = 1;
        }
        const c = D.pack(Math.max(0, a), i), extra = c.t - p.t;
        TD.label(`${a === 3 ? p.n.split(' ').reverse().join(' ') : p.n} · ${p.f}`, x + (p.id === 'G' ? 36 : p.id === 'C' ? -16 : 0), y - (p.narrow ? 36 : 56), 'center', C.ink, 11);
        TD.label(`${Math.round(c.t)} s${extra >= 1 ? ' (+' + Math.round(extra) + ')' : ''} · danger ${c.d.toFixed(1).replace('.0', '')}`, x + (p.id === 'G' ? 52 : 0), y + (p.narrow ? 36 : 58), 'center', extra >= 12 ? '#fff' : C.ink, 11, extra >= 12 ? C.redDk : 'rgba(255,252,244,.9)');
        if (ord >= 0) { g.fillStyle = C.navy; g.beginPath(); g.arc(x - 40, y - (p.narrow ? 16 : 30), 12, 0, TD.TAU); g.fill(); GK.text(g, String(ord + 1), x - 40, y - (p.narrow ? 11 : 25), '#fff', 13, 'center', 800); }
        if (plan) ui.hit('p' + i, x - 50, y - 50, 100, 100);
      });
      TD.foe(X(D.BOSS[0]), Y(D.BOSS[1]), 20, Math.PI, '#8a1c15', { mark: 'horns' }); TD.label('boss', X(D.BOSS[0]), Y(D.BOSS[1]) - 42, 'center', C.ink, 11);
      TD.label('entrance', X(D.START[0]) + 6, Y(D.START[1]) - 30, 'center', C.ink, 11);
      const k = st.phase === 'go' ? clamp((st.t - st.at) / 3) : st.phase === 'plan' ? 0 : 1, pp = along(P, k);
      TD.player(pp[0], pp[1], 0, .8);
      g.restore();
      // right: affixes, forces, go
      const RX = 680, RW = 340, cur = D.cost(Math.max(0, a), st.route);
      GK.text(g, '1. Pick this run\'s affix', RX, 30, C.muted, 12, 'left', 700);
      D.AFFIX.forEach((x, i) => ui.btn('x' + i, x.n, RX + (i % 3) * 114, 40 + Math.floor(i / 3) * 38, 108, 32, { on: a === i, px: 13 }));
      PLAY.note(g, A ? A.tip : 'Two of these six only change how enemies look.', RX, 136, RW);
      GK.text(g, '2. Click packs in order: enemy forces', RX, 196, C.muted, 12, 'left', 700);
      PLAY.bar(g, RX, 204, RW - 70, 16, cur.forces / D.NEED, cur.ok ? C.good : C.gold); GK.text(g, `${cur.forces} / ${D.NEED}`, RX + RW, 218, C.ink, 14, 'right', 800);
      if (plan) {
        ui.btn('go', a < 0 ? 'Pick an affix first' : cur.ok ? 'Run it' : 'Add packs until you reach 60', RX, 234, RW - 90, 40, { fill: a >= 0 && cur.ok ? '#fde9b8' : '#f1ece0', stroke: '#e0a92d', px: 14 });
        ui.btn('clear', 'Clear', RX + RW - 80, 234, 80, 40, { px: 13 });
      } else if (st.phase === 'go') GK.text(g, 'Running…', RX, 260, C.ink, 16, 'left', 800);
      const last = st.runs[st.runs.length - 1];
      if ((st.phase === 'result' || st.phase === 'end') && last) {
        GK.big(g, mmss(last.time), `against a 5:00 timer${last.deaths ? `, with ${last.deaths} death${last.deaths > 1 ? 's' : ''}` : ''}`, RX, 258, last.timed ? C.good : C.redDk);
        const b = D.best(last.affix);
        PLAY.note(g, `Fastest possible under ${D.AFFIX[last.affix].n}: ${mmss(b.time)} by ${key(b.route).split('').join(', ')}.`, RX, 300, RW);
        if (st.phase === 'result') ui.btn('next', st.run < 4 ? `Plan run ${st.run + 2}` : 'See all five routes', RX, 330, RW, 40, { fill: '#fde9b8', stroke: '#e0a92d', px: 14 });
      }
      // bottom: the five routes, drawn small
      const BY = 392, bw = 196, bh = 150, s = .26;
      for (let r = 0; r < 5; r++) {
        const x = 20 + r * (bw + 5), R = st.runs[r], on = r === st.run && st.phase !== 'end';
        GK.box(g, x, BY, bw, bh, on ? '#fff3d6' : '#fffaf0', on ? C.gold : '#cdbf9f', 9, on ? 2.5 : 1.5);
        GK.text(g, `Run ${r + 1}`, x + 10, BY + 18, C.muted, 11, 'left', 700);
        const route = R ? R.route : on ? st.route : null; if (!route) continue;
        const af = R ? R.affix : a; if (af >= 0) GK.text(g, D.AFFIX[af].n, x + bw - 10, BY + 18, D.AFFIX[af].real ? C.ink : C.muted, 12, 'right', 800);
        const ox = x + 16, oy = BY + 28;
        D.PACKS.forEach((p, i) => { g.fillStyle = route.includes(i) ? C.red : '#d9cdb4'; g.beginPath(); g.arc(ox + p.x * s, oy + p.y * s, 5, 0, TD.TAU); g.fill(); });
        const dup = R && st.runs.slice(0, r).some(q => key(q.route) === key(R.route));
        GK.line(g, pts(route).map(p => [ox + p[0] * s, oy + p[1] * s]), dup ? '#8b8fa8' : C.navy, 3);
        if (R) { GK.text(g, mmss(R.time), x + 10, BY + bh - 10, R.timed ? C.good : C.redDk, 14, 'left', 800); GK.text(g, dup ? 'same route as before' : r ? 'a new route' : key(R.route).split('').join(' '), x + bw - 10, BY + bh - 10, dup ? C.muted : C.ink, 11, 'right', 700); }
      }
      const distinct = new Set(st.runs.map(r => key(r.route))).size, timed = st.runs.filter(r => r.timed).length;
      const cosSame = st.runs.filter((r, i) => !D.AFFIX[r.affix].real && st.runs.slice(0, i).some(q => key(q.route) === key(r.route))).length;
      ui.stats(`<div><b>${distinct}</b><span>different routes in ${st.runs.length} run${st.runs.length === 1 ? '' : 's'}</span></div><div class="${timed === st.runs.length ? 'g' : 'r'}"><b>${timed}/${st.runs.length}</b><span>runs inside the timer</span></div>`);
      ui.out(!st.runs.length ? 'The first run is the dungeon as built. After that, the question is which affixes make you draw a different line.'
        : st.phase === 'end' || st.runs.length >= 3 ? `${distinct} different route${distinct === 1 ? '' : 's'} in ${st.runs.length} runs${cosSame ? `, and ${cosSame} run${cosSame > 1 ? 's' : ''} under a cosmetic affix that traced an old line` : ''}. A system counts as new content when it changes the decisions. Recolouring changed nothing; the heavy affixes changed the route and cost you time or deaths while you relearned it.`
        : last && !last.timed ? `Over the timer under ${D.AFFIX[last.affix].n}. The red labels on the map show which packs this affix punishes: the old route went straight through them.`
        : 'Timed. Pick a different affix and see whether the same line still works.');
    },
  });
})();
