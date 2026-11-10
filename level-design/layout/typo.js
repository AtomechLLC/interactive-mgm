/* Five layouts, one walk (The Level Design Book: Typology, Circulation).
   Each typology is a small room graph: rooms [id, x, y, w, h, label], edges [a, b, kind] (kind 'gate' needs every key,
   'short' is a one-way shortcut that opens when the goal is reached) and a route the player walks room centre to room centre.
   Stats come from the route: rooms on it, revisits (backtracking), branch points (rooms on the route with 3+ exits)
   and walk length in 40 px floor tiles. The three-lane map has no route: three players walk the three lanes, and the
   stat counts every simple path from base to base. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, SPEED = 300, PAUSE = .3;

  const TYPES = {
    corridor: {
      name: 'Corridor',
      rooms: [['S', 110, 300, 130, 110, 'start'], ['A', 300, 190, 120, 100], ['B', 500, 330, 120, 100], ['C', 700, 190, 120, 100], ['G', 910, 300, 130, 110, 'objective']],
      edges: [['S', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'G']],
      route: ['S', 'A', 'B', 'C', 'G'],
      text: '<b class="accent">One way forward.</b> Nobody gets lost and you set the order of every beat, but the player never chooses a route. It suits set pieces, tutorials and anything that has to happen in order.',
    },
    hub: {
      name: 'Hub and spoke',
      rooms: [['S', 520, 515, 130, 70, 'start'], ['H', 520, 300, 190, 140, 'hub'], ['K1', 170, 300, 140, 110, 'key'], ['K2', 870, 300, 140, 110, 'key'], ['G', 520, 85, 140, 90, 'objective']],
      edges: [['S', 'H'], ['H', 'K1'], ['H', 'K2'], ['H', 'G', 'gate']],
      keys: ['K1', 'K2'],
      route: ['S', 'H', 'K1', 'H', 'K2', 'H', 'G'],
      text: '<b class="accent">A central room with branches.</b> The player picks the order of the spokes, and the hub becomes familiar from repeat visits, so it doubles as an orientation point. The book points to Gone Home’s mansion. The price is the walk back through the hub after every spoke.',
    },
    loop: {
      name: 'Loopback',
      rooms: [['S', 150, 470, 140, 100, 'start'], ['A', 150, 250, 120, 100], ['B', 380, 105, 130, 90], ['C', 650, 105, 130, 90], ['D', 880, 250, 120, 100], ['G', 880, 470, 140, 100, 'objective']],
      edges: [['S', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'G'], ['G', 'S', 'short']],
      route: ['S', 'A', 'B', 'C', 'D', 'G', 'S'],
      text: '<b class="accent">The route bends back on itself.</b> A shortcut at the end opens beside the start, so the trip out is long and the way home is short. Opening it feels like a reward, and the player learns how the whole space fits together. Dark Souls’ Undead Burg, one of the book’s studies, is built around shortcuts like this.',
    },
    pearls: {
      name: 'String of pearls',
      rooms: [['S', 85, 300, 110, 100, 'start'], ['c1', 230, 300, 60, 50], ['P1', 400, 145, 130, 90], ['P2', 400, 300, 130, 90], ['P3', 400, 455, 130, 90], ['c2', 565, 300, 60, 50], ['Q1', 730, 180, 130, 100], ['Q2', 730, 420, 130, 100], ['G', 935, 300, 120, 100, 'objective']],
      edges: [['S', 'c1'], ['c1', 'P1'], ['c1', 'P2'], ['c1', 'P3'], ['P1', 'c2'], ['P2', 'c2'], ['P3', 'c2'], ['P1', 'P2'], ['P2', 'P3'], ['c2', 'Q1'], ['c2', 'Q2'], ['Q1', 'Q2'], ['Q1', 'G'], ['Q2', 'G']],
      route: ['S', 'c1', 'P1', 'c2', 'Q2', 'G'],
      text: '<b class="accent">Open areas joined by chokepoints.</b> Inside each pearl the player picks a way through; the narrow links between pearls bring everyone back to the same door. Freedom inside each area, a fixed order between them.',
    },
    lanes: {
      name: 'Three lane',
      rooms: [['A', 85, 300, 120, 150, 'base'], ['T1', 300, 90, 110, 80], ['T2', 520, 70, 120, 70], ['T3', 740, 90, 110, 80], ['M1', 300, 300, 100, 80], ['M', 520, 300, 140, 110, 'mid'], ['M3', 740, 300, 100, 80], ['B1', 300, 510, 110, 80], ['B2', 520, 530, 120, 70], ['B3', 740, 510, 110, 80], ['B', 955, 300, 120, 150, 'base']],
      edges: [['A', 'T1'], ['T1', 'T2'], ['T2', 'T3'], ['T3', 'B'], ['A', 'M1'], ['M1', 'M'], ['M', 'M3'], ['M3', 'B'], ['A', 'B1'], ['B1', 'B2'], ['B2', 'B3'], ['B3', 'B'], ['T1', 'M1', 'link'], ['M1', 'B1', 'link'], ['T3', 'M3', 'link'], ['M3', 'B3', 'link']],
      lanes: [['A', 'T1', 'T2', 'T3', 'B'], ['A', 'M1', 'M', 'M3', 'B'], ['A', 'B1', 'B2', 'B3', 'B']],
      text: '<b class="accent">A multiplayer layout.</b> Two bases joined by three routes, with connectors between the lanes. There is no critical path: which lane to take, and when to cross over, is the decision. MOBAs and many shooter maps use this shape.',
    },
  };
  const ORDER = ['corridor', 'hub', 'loop', 'pearls', 'lanes'];

  function build(ty) {
    const R = {}; ty.rooms.forEach(([id, x, y, w, h, lab]) => R[id] = { id, x, y, w, h, lab });
    const deg = {}; ty.edges.forEach(([a, b, k]) => { if (k === 'short') return; deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; });
    const walks = (ty.lanes || [ty.route]).map(route => {
      const p = T.Path([R[route[0]].x, R[route[0]].y], SPEED), arr = [{ id: route[0], t: 0 }];
      route.slice(1).forEach(id => { p.go(R[id].x, R[id].y); arr.push({ id, t: p.t }); p.wait(PAUSE); });
      return { route, p, arr };
    });
    return { R, deg, walks, dur: Math.max(...walks.map(w => w.p.t)) };
  }
  function simplePaths(ty, from, to) {
    const adj = {}; ty.edges.forEach(([a, b]) => { (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); });
    let n = 0; const seen = new Set([from]);
    (function dfs(u) { if (u === to) { n++; return; } for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); dfs(v); seen.delete(v); } })(from);
    return n;
  }
  function stats(ty, g) {
    if (ty.lanes) return [
      [3, 'lanes from base to base', 'g'],
      [ty.edges.filter(e => e[2] === 'link').length, 'connectors between lanes', 'y'],
      [simplePaths(ty, 'A', 'B'), 'different routes from base to base, counting lane switches', ''],
    ];
    const r = ty.route, uniq = new Set(r).size, len = g.walks[0].arr.reduce((s, a, i) => i ? s + Math.hypot(g.R[a.id].x - g.R[r[i - 1]].x, g.R[a.id].y - g.R[r[i - 1]].y) : 0, 0);
    const seen = new Set(), branch = r.filter(id => { const f = !seen.has(id); seen.add(id); return f && (g.deg[id] || 0) >= 3; }).length;
    return [
      [uniq, 'rooms on the path to the objective', ''],
      [r.length - uniq, 'rooms walked through a second time (backtracking)', r.length - uniq ? 'r' : 'g'],
      [branch, 'branch points: rooms with three or more exits', branch ? 'g' : 'y'],
      [Math.round(len / 40), 'tiles walked, start to finish', ''],
    ];
  }

  canvasDemo('typo', (s, cv, g) => {
    let key = 'corridor', G = build(TYPES[key]), t = 0;
    const pick = $(s, '.ty-pick');
    pick.innerHTML = ORDER.map(k => `<button class="btn${k === key ? ' on' : ''}" data-k="${k}">${TYPES[k].name}</button>`).join('');
    const set = k => {
      key = k; G = build(TYPES[k]); t = 0;
      $$(pick, '.btn').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      say($(s, '.ty-stats'), stats(TYPES[k], G).map(([v, l, c]) => `<div class="${c}"><b>${v}</b><span>${l}</span></div>`).join(''));
      say($(s, '.ty-out'), TYPES[k].text);
    };
    $$(pick, '.btn').forEach(b => b.onclick = () => set(b.dataset.k));
    $(s, '.ty-replay').onclick = () => { t = 0; };
    set(key);
    window.__typoSeek = (k, tt) => { if (k && k !== key) set(k); t = Math.min(tt, G.dur + 1.4); };

    return dt => {
      t += dt; const ty = TYPES[key], R = G.R, tt = Math.min(t, G.dur + 1.5);
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      const reached = id => G.walks.some(w => w.arr.some(a => a.id === id && a.t <= tt));
      const keysDone = (ty.keys || []).every(reached), goalDone = ty.route && reached('G') && G.walks[0].arr.find(a => a.id === 'G').t <= tt;
      // corridors: a wall-coloured stroke with a floor-coloured stroke on top
      ty.edges.forEach(([a, b, k]) => {
        const A = R[a], B = R[b], shut = k === 'short' && !goalDone;
        g.lineCap = 'butt'; g.setLineDash(shut ? [10, 10] : []);
        g.strokeStyle = k === 'link' ? C.wallHi : C.wall; g.lineWidth = k === 'link' ? 30 : 44; g.globalAlpha = shut ? .35 : 1;
        g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke();
        g.strokeStyle = C.floor; g.lineWidth = k === 'link' ? 18 : 30; g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      });
      // rooms
      Object.values(R).forEach(r => {
        g.fillStyle = C.wall; g.fillRect(r.x - r.w / 2 - 8, r.y - r.h / 2 - 8, r.w + 16, r.h + 16);
        T.floor(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
      });
      // the critical path, drawn under the walkers
      G.walks.forEach((w, i) => T.trail(w.p.trail(tt), [C.player, C.p2, C.p3][i], .9, 5));
      // gates, shortcuts, keys, goal
      ty.edges.forEach(([a, b, k]) => {
        const mx = (R[a].x + R[b].x) / 2, my = (R[a].y + R[b].y) / 2;
        if (k === 'gate') { T.label(keysDone ? 'gate open' : `locked: ${(ty.keys || []).filter(reached).length} / ${ty.keys.length} keys`, mx + 70, my, 'left', keysDone ? C.good : C.redDk, 14); g.fillStyle = keysDone ? C.good : C.redDk; g.fillRect(mx - 26, my - 5, 52, 10); }
        if (k === 'short') { const sx = (R[a].x + R[b].x) / 2, sy = R[a].y + 50; T.label(goalDone ? 'shortcut open' : 'one-way shortcut (shut)', sx, sy, 'center', goalDone ? C.good : C.muted, 14); }
      });
      (ty.keys || []).forEach(id => { if (!reached(id)) { const r = R[id]; g.save(); g.translate(r.x, r.y); g.rotate(Math.PI / 4); g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(-11, -11, 22, 22); g.strokeRect(-11, -11, 22, 22); g.restore(); } });
      if (R.G) T.flag(R.G.x + 30, R.G.y + 5);
      // room labels and visit counts
      Object.values(R).forEach(r => {
        if (r.lab) T.label(r.lab, r.x, r.y - r.h / 2 + 14, 'center', C.muted, 13);
        if (ty.lanes) return;
        const n = G.walks[0].arr.filter(a => a.id === r.id && a.t <= tt).length;
        if (n > 1) T.label(`×${n}`, r.x + r.w / 2 - 18, r.y + r.h / 2 - 14, 'center', C.redDk, 15);
      });
      // walkers
      G.walks.forEach((w, i) => { const p = w.p.at(tt); T.player(p.x, p.y, p.face, .9, 1, [C.player, C.p2, C.p3][i]); });
      if (goalDone && ty.route && tt < G.dur + 1.5 && !ty.lanes) T.popText('objective reached', R.G.x, R.G.y - R.G.h / 2 - 22, C.goldInk, clamp((G.walks[0].arr.find(a => a.id === 'G').t + 1.5 - tt) / 1.5));
      if (t > G.dur + 2.5) t = 0;
    };
  });
})();
