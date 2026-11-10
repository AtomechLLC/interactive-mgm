/* Five layouts, one walk (The Level Design Book: Typology, Circulation; plans drawn with ../shared/plan.js).
   Each typology is a floor plan: rooms share walls at varied angles, doors are gaps in those walls, and stairs,
   thresholds, half walls, columns and a landmark give each space a reason to exist. The player walks a route
   room to room through the doors. Stats come from the route: rooms on it, revisits (backtracking), branch points
   (rooms on the route with 3+ doors, or a room split into several ways through) and walk length in 40 px tiles.
   The three-lane map has no route: three players walk the three lanes, and the stat counts every simple path
   from base to base. The left half of that map is built once and rotated 180 degrees, so both teams get the same map. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, SPEED = 260, PAUSE = .25;
  const GOLD = '#f6e6bc', KEY = '#e9eef9';

  // helpers on a built plan
  const sideNear = (P, id, pt) => { const r = P.rooms[id]; let best = 0, bd = 1e9; r.pts.forEach((p, i) => { const q = r.pts[(i + 1) % r.pts.length], d = Math.hypot((p[0] + q[0]) / 2 - pt[0], (p[1] + q[1]) / 2 - pt[1]); if (d < bd) { bd = d; best = i; } }); return best; };
  const along = (P, a, b, k) => { const d = P.doorOf(a, b); return [d.m[0] + d.e[0] * k, d.m[1] + d.e[1] * k]; };
  const fwd = (P, a, b) => { const d = P.doorOf(a, b); return [-d.e[1], d.e[0]]; };

  const BUILD = {
    corridor() {
      // a building that grew: an entry porch, a straight hall with a niche, a wing turned off the grid with stairs
      // where it meets the hall, a hall back on the grid, and a round tower at the end; a shed stands apart
      const P = PLAN.make();
      P.rect('S', 40, 280, 170, 390, { lab: 'start' });
      P.rect('A', 170, 240, 390, 430, { cham: [0], k: 34 });
      P.door('S', 'A', [170, 335], 90);
      P.chain('A', 3, [{ id: 'Ap', round: 34 }]);   // edges with one cut corner: 0 cut, 1 top, 2 right, 3 bottom, 4 left
      P.chain('A', 2, [{ id: 'B', len: 200, turn: -20, w: 150, w0: 150 }, { id: 'C', len: 150, turn: 20, w: 150 }, { id: 'G', round: 100, lab: 'objective', tint: GOLD }]);
      const B = P.rooms.B, sd = P.doorOf('A', 'B'), n = [-sd.e[1], sd.e[0]], dir = PLAN.unit([B.c[0] - sd.m[0], B.c[1] - sd.m[1]]);
      P.stairs([sd.m[0] + dir[0] * 20, sd.m[1] + dir[1] * 20], [sd.m[0] + dir[0] * 95, sd.m[1] + dir[1] * 95], 120, 8);
      P.prop('column', 230, 290, 8); P.prop('column', 330, 290, 8); P.prop('column', 230, 385, 8); P.prop('column', 330, 385, 8);
      P.prop('crate', 70, 310, 9, .3); P.prop('table', P.rooms.G.c[0] + 30, P.rooms.G.c[1] - 40, 10, .5);
      return { P, route: ['S', 'A', 'B', 'C', 'G'] };
    },
    hub() {
      // a cut-corner hall with a fountain; straight volumes north and south, rotated wings east and west
      const P = PLAN.make();
      P.rect('H', 400, 200, 640, 390, { cham: [0, 1, 2, 3], k: 32, lab: 'hub' });
      P.chain('H', 1, [{ id: 'G', len: 105, turn: 0, w: 170, w0: 170, lab: 'objective', kind: 'gate', tint: GOLD }]);
      P.chain('H', 5, [{ id: 'S', len: 90, turn: 0, w: 130, w0: 130, lab: 'start' }]);
      P.chain('H', 7, [{ id: 'K1a', len: 110, turn: 25, w: 80, w0: 80 }, { id: 'K1', len: 120, turn: -25, w: 160, w0: 160, lab: 'key', tint: KEY }]);
      P.chain('H', 3, [{ id: 'K2a', len: 100, turn: 20, w: 80, w0: 80 }, { id: 'K2', round: 75, lab: 'key', tint: KEY }]);
      P.mark('fountain', 580, 250, .75);
      const g = P.rooms.G; P.stairs([g.c[0] - 60, g.c[1] + 40], [g.c[0] - 60, g.c[1] - 35], 36, 6);
      const k1 = P.rooms.K1; P.prop('crate', k1.c[0] - 40, k1.c[1] + 40, 9, .4); P.prop('crate', k1.c[0] - 18, k1.c[1] + 50, 7, -.2);
      return { P, keys: ['K1', 'K2'], route: ['S', 'H', 'K1a', 'K1', 'K1a', 'H', 'K2a', 'K2', 'K2a', 'H', 'G'] };
    },
    loop() {
      // a wrapped core: a band of corridor runs round a core of halls, one corner cut; the objective sits in the
      // core's far end, and a one-way door from the core hall drops you back beside the entry annex
      const P = PLAN.make();
      P.rect('W', 170, 100, 250, 480, { cham: [0], k: 46 });
      P.rect('Nb', 250, 100, 800, 180); P.rect('E', 800, 100, 880, 480); P.rect('Sb', 250, 400, 800, 480);
      P.rect('X', 250, 180, 620, 400, { lab: 'core hall' }); P.rect('G', 620, 180, 800, 400, { lab: 'objective', tint: GOLD });
      P.rect('S', 60, 250, 170, 350, { lab: 'start' });
      P.door('S', 'W', [170, 300], 90); P.door('W', 'Nb', [250, 140], 90); P.door('Nb', 'E', [800, 140], 90); P.door('E', 'G', [800, 290], 90);
      P.door('G', 'X', [620, 290], 90); P.door('X', 'W', [250, 290], 90, 'short'); P.door('W', 'Sb', [250, 440], 90); P.door('Sb', 'E', [800, 440], 90);
      P.chain('E', 1, [{ id: 'T', round: 52, lab: 'tower' }]);
      P.stairs([390, 140], [480, 140], 64, 7); P.stairs([640, 440], [550, 440], 64, 7);
      [[320, 230], [420, 230], [520, 230], [320, 350], [420, 350], [520, 350]].forEach(([x, y]) => P.prop('column', x, y, 8));
      P.rooms.W.via = { n: [210, 150], m: [210, 292] };
      return { P, route: ['S', 'W:n', 'Nb', 'E', 'G', 'X', 'W:m', 'S'] };
    },
    pearls() {
      // a porch, a skewed hall with two rows of columns (three ways through), a round hall with a fountain
      // (two ways round), and the objective room set square against the round hall
      const P = PLAN.make();
      P.rect('S', 30, 285, 150, 395, { lab: 'start' });
      P.chain('S', 1, [{ id: 'c1', len: 70, turn: 0, w: 60, w0: 60 }, { id: 'P1', len: 230, turn: -14, w: 300, w0: 300, lab: 'pearl' }, { id: 'c2', len: 60, turn: 14, w: 60, w0: 60 }, { id: 'P2', round: 115, lab: 'pearl' }]);
      const [cx, cy, r] = P.rooms.P2.circle;
      P.rect('G', cx + r, cy - 70, cx + r + 150, cy + 70, { lab: 'objective', tint: GOLD }); P.door('P2', 'G', [cx + r, cy], 90);
      const a = P.doorOf('c1', 'P1').m, b = P.doorOf('P1', 'c2').m, d = PLAN.unit([b[0] - a[0], b[1] - a[1]]), n = [-d[1], d[0]], mm = PLAN.mid(a, b);
      [-50, 50].forEach(k => [-70, -25, 20, 65].forEach(t => P.prop('column', mm[0] + n[0] * k + d[0] * t, mm[1] + n[1] * k + d[1] * t, 8)));
      P.rooms.P1.via = { a: [mm[0] - n[0] * 100, mm[1] - n[1] * 100], b: mm, c: [mm[0] + n[0] * 100, mm[1] + n[1] * 100] }; P.rooms.P1.fork = 3;
      P.mark('fountain', cx, cy, .9); P.rooms.P2.via = { a: [cx, cy - 75], b: [cx, cy + 75] }; P.rooms.P2.fork = 2;
      P.stairs([cx + r + 20, cy - 50], [cx + r + 20, cy + 50], 30, 7);
      return { P, route: ['S', 'c1', 'P1:a', 'c2', 'P2:b', 'G'] };
    },
    lanes() {
      const P = PLAN.make(), R = ([x, y]) => [W - x, H - y];
      P.poly('A', [[30, 190], [140, 160], [205, 240], [205, 345], [140, 425], [30, 395]], { lab: 'base', tint: '#e3ecfa' });
      P.chain('A', 1, [{ id: 'T1', len: 80, turn: -12, w: 95 }, { id: 'T2', len: 150, turn: 38, w: 105 }]);
      P.chain('A', 3, [{ id: 'B1', len: 80, turn: 12, w: 95 }, { id: 'B2', len: 150, turn: -38, w: 105 }]);
      P.chain('A', 2, [{ id: 'M1', len: 135, turn: 10, w: 115 }]);
      P.poly('Mid', [[455, 225], [560, 205], [600, 290], [585, 360], [480, 380], [440, 295]], { lab: 'mid', tint: '#efe4cc' });
      P.mark('statue', 520, 292, .9);
      // rotate the left half onto the right, so both bases face the same map
      const left = ['A', 'T1', 'T2', 'B1', 'B2', 'M1'], twin = { A: 'B', T1: 'rB1', T2: 'rB2', B1: 'rT1', B2: 'rT2', M1: 'rM1' };
      left.forEach(id => { const r = P.rooms[id]; P.poly(twin[id], r.pts.map(R), { lab: r.lab, tint: r.tint }); });
      P.doors.filter(d => left.includes(d.a) && left.includes(d.b)).forEach(d => P.doors.push({ ...d, a: twin[d.a], b: twin[d.b], m: R(d.m), e: [-d.e[0], -d.e[1]] }));
      P.link('Ttop', 'T2', 2, 'rT2', 2, { w: 100 });
      P.link('Bbot', 'B2', 2, 'rB2', 2, { w: 100 });
      P.link('Mw', 'M1', 2, 'Mid', sideNear(P, 'Mid', P.rooms.M1.c), { w: 100, wb: 90 });
      P.link('Me', 'rM1', 2, 'Mid', sideNear(P, 'Mid', P.rooms.rM1.c), { w: 100, wb: 90 });
      // connectors between lanes: short passages, also rotated
      const con = (id, a, b) => P.link(id, a, sideNear(P, a, P.rooms[b].c), b, sideNear(P, b, P.rooms[a].c), { w: 44, kind: 'door' });
      con('cT', 'T2', 'M1'); con('cB', 'B2', 'M1'); con('rcT', 'rT2', 'rM1'); con('rcB', 'rB2', 'rM1');
      ['cT', 'cB', 'rcT', 'rcB'].forEach(id => P.rooms[id].link = true);
      P.prop('crate', 300, 120, 9, .5); P.prop('crate', R([300, 120])[0], R([300, 120])[1], 9, .5);
      P.prop('column', 330, 300, 8); P.prop('column', ...R([330, 300]), 8);
      return { P, lanes: [['A', 'T1', 'T2', 'Ttop', 'rT2', 'rT1', 'B'], ['A', 'M1', 'Mw', 'Mid', 'Me', 'rM1', 'B'], ['A', 'B1', 'B2', 'Bbot', 'rB2', 'rB1', 'B']] };
    },
  };

  const TYPES = {
    corridor: { name: 'Corridor', text: '<b class="accent">One way forward.</b> Nobody gets lost and you set the order of every beat, but the player never chooses a route. Distinct rooms (a columned hall, a turned wing with stairs on the seam, a round tower) keep a one-way path from feeling like a hallway.' },
    hub: { name: 'Hub and spoke', text: '<b class="accent">A central room with branches.</b> The player picks the order of the spokes, and the hub, with its fountain, becomes familiar from repeat visits, so it doubles as an orientation point. The book points to Gone Home’s mansion. The price is the walk back through the hub after every spoke.' },
    loop: { name: 'Loopback', text: '<b class="accent">The route bends back on itself.</b> A band of corridor wraps a core of halls. The trip out goes all the way round; at the objective a one-way door drops you back beside the entry, so the way home is short. Dark Souls’ Undead Burg, one of the book’s studies, is built on shortcuts like this.' },
    pearls: { name: 'String of pearls', text: '<b class="accent">Open halls joined by chokepoints.</b> Inside each pearl, rows of columns or a fountain give the player several ways through; the narrow doors between pearls bring everyone back to the same point. Freedom inside each space, a fixed order between them.' },
    lanes: { name: 'Three lane', text: '<b class="accent">A multiplayer layout.</b> Two bases joined by three routes, with short connectors between them. The right half is the left half turned 180 degrees, so neither team has an advantage. There is no critical path: which lane to take, and when to cross over, is the decision.' },
  };
  const ORDER = ['corridor', 'hub', 'loop', 'pearls', 'lanes'];

  function build(key) {
    const b = BUILD[key](), P = b.P;
    const deg = {}; P.doors.forEach(d => { if (d.kind === 'short' || d.kind === 'open') return; deg[d.a] = (deg[d.a] || 0) + 1; deg[d.b] = (deg[d.b] || 0) + 1; });
    const walks = (b.lanes || [b.route]).map(route => {
      // walk point by walk point: a door between two rooms is passed through, a room's own point is an arrival
      const pts = P.walk(route), p = T.Path(pts[0], SPEED), arr = [{ id: route[0].split(':')[0], t: 0 }];
      let k = 1;
      route.slice(1).forEach((item, i) => {
        const id = item.split(':')[0], prev = route[i].split(':')[0], d = id !== prev && P.doorOf(prev, id);
        if (d && d.kind !== 'open') { p.go(...pts[k]); k++; }
        p.go(...pts[k]); k++; arr.push({ id, t: p.t }); p.wait(PAUSE);
      });
      return { route: route.map(x => x.split(':')[0]), pts, p, arr };
    });
    return { ...b, P, deg, walks, dur: Math.max(...walks.map(w => w.p.t)), cache: { shut: P.render(W, H) } };
  }
  function simplePaths(P, from, to) {
    const adj = {}; P.doors.forEach(({ a, b }) => { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); });
    let n = 0; const seen = new Set([from]);
    (function dfs(u) { if (u === to) { n++; return; } for (const v of adj[u] || []) if (!seen.has(v)) { seen.add(v); dfs(v); seen.delete(v); } })(from);
    return n;
  }
  function stats(G) {
    const P = G.P;
    if (G.lanes) return [
      [3, 'lanes from base to base', 'g'],
      [Object.values(P.rooms).filter(r => r.link).length, 'connectors between lanes', 'y'],
      [simplePaths(P, 'A', 'B'), 'different routes from base to base, counting lane switches', ''],
    ];
    const r = G.walks[0].route, uniq = new Set(r).size, pts = G.walks[0].pts;
    const len = pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
    const seen = new Set(), branch = r.filter(id => { const f = !seen.has(id); seen.add(id); return f && ((G.deg[id] || 0) >= 3 || P.rooms[id].fork); }).length;
    return [
      [uniq, 'rooms on the path to the objective', ''],
      [r.length - uniq, 'rooms walked through a second time (backtracking)', r.length - uniq ? 'r' : 'g'],
      [branch, 'branch points: rooms with three or more doors, or several ways through', branch ? 'g' : 'y'],
      [Math.round(len / 40), 'tiles walked, start to finish', ''],
    ];
  }

  canvasDemo('typo', (s, cv, g) => {
    let key = 'corridor', G = build(key), t = 0;
    const pick = $(s, '.ty-pick');
    pick.innerHTML = ORDER.map(k => `<button class="btn${k === key ? ' on' : ''}" data-k="${k}">${TYPES[k].name}</button>`).join('');
    const set = k => {
      key = k; G = build(k); t = 0;
      $$(pick, '.btn').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      say($(s, '.ty-stats'), stats(G).map(([v, l, c]) => `<div class="${c}"><b>${v}</b><span>${l}</span></div>`).join(''));
      say($(s, '.ty-out'), TYPES[k].text);
    };
    $$(pick, '.btn').forEach(b => b.onclick = () => set(b.dataset.k));
    $(s, '.ty-replay').onclick = () => { t = 0; };
    set(key);
    window.__typoSeek = (k, tt) => { if (k && k !== key) set(k); t = Math.min(tt, G.dur + 1.4); };

    return dt => {
      t += dt; const P = G.P, R = P.rooms, tt = Math.min(t, G.dur + 1.5), w0 = G.walks[0];
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      const reached = id => G.walks.some(w => w.arr.some(a => a.id === id && a.t <= tt));
      const gArr = !G.lanes && w0.arr.find(a => a.id === 'G'), goalDone = gArr && gArr.t <= tt;
      const keysDone = (G.keys || []).every(reached);
      g.drawImage(G.cache.shut, 0, 0);
      P.overlay(g, { gate: keysDone, short: goalDone });
      // the walked route, under the walkers
      G.walks.forEach((w, i) => T.trail(w.p.trail(tt), [C.player, C.p2, C.p3][i], .9, 5));
      // gate and shortcut notes
      P.doors.forEach(d => {
        if (d.kind === 'gate') T.label(keysDone ? 'gate open' : `locked: ${(G.keys || []).filter(reached).length} / ${G.keys.length} keys`, d.m[0] + 110, d.m[1] + 4, 'center', keysDone ? C.good : C.redDk, 14);
        if (d.kind === 'short') T.label(goalDone ? 'shortcut open' : 'one-way door (shut)', d.m[0] + 10, d.m[1] - 34, 'center', goalDone ? C.good : C.muted, 13);
      });
      (G.keys || []).forEach(id => { if (!reached(id)) { const r = R[id]; g.save(); g.translate(r.c[0], r.c[1]); g.rotate(Math.PI / 4); g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(-10, -10, 20, 20); g.strokeRect(-10, -10, 20, 20); g.restore(); } });
      if (R.G) T.flag(R.G.c[0] + 26, R.G.c[1] + 4);
      // room labels and visit counts
      Object.values(R).forEach(r => {
        if (r.lab) T.label(r.lab, r.c[0], r.c[1] + (r.circle ? -r.circle[2] * .55 : -28), 'center', C.muted, 13);
        if (G.lanes) return;
        const n = w0.arr.filter(a => a.id === r.id && a.t <= tt).length;
        if (n > 1) T.label(`×${n}`, r.c[0] + 30, r.c[1] + 22, 'center', C.redDk, 15);
      });
      G.walks.forEach((w, i) => { const p = w.p.at(tt); T.player(p.x, p.y, p.face, .78, 1, [C.player, C.p2, C.p3][i]); });
      if (goalDone && tt < G.dur + 1.5) T.popText('objective reached', R.G.c[0], R.G.c[1] - 70, C.goldInk, clamp((gArr.t + 1.5 - tt) / 1.5));
      if (t > G.dur + 2.5) t = 0;
    };
  });
})();
