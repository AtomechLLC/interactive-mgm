/* Author the puzzle backward (genre breakdown: "Puzzle Game Design").
   One mechanic (push a block; you cannot pull) explored by designing from the solution backward: start from the solved
   state, pull the gold block away to get a start, add walls that close the obvious route, then add a grey decoy that
   invites a false move. A breadth-first solver checks every stage: the shortest solution, how many positions the
   player can reach, and how many of those can no longer be solved (dead ends). Click a cell to add or remove a wall. */
(function () {
  const C = TD.C;
  const W = 8, H = 6, CS = 62, OX = 30, OY = 70;
  const BASE_WALLS = [[6, 2], [6, 3], [6, 4], [3, 1], [3, 2]];
  const STAGES = [
    { name: '1. The solved state', say: 'Start at the end: the gold block sits on the goal.', goal: [6, 1], p: [5, 1], a: [6, 1], walls: [] },
    { name: '2. Pull it back', say: 'Pull the block away from the goal, one step at a time. Played forward, the pulls are the solution.', goal: [6, 1], p: [2, 3], a: [3, 3], walls: [] },
    { name: '3. Close the obvious route', say: 'Walls stop the straight push right and up: the block now goes up the middle and slides in from the left.', goal: [6, 1], p: [2, 3], a: [3, 3], walls: BASE_WALLS },
    { name: '4. Add a false lead', say: 'A grey decoy blocks the climb. Pushing it the tempting way jams the route; moving it aside first is the insight.', goal: [6, 1], p: [2, 3], a: [3, 3], b: [5, 2], walls: BASE_WALLS },
  ];
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function solve(L) {
    const wall = new Set(L.walls.map(([x, y]) => y * W + x)), goal = L.goal[1] * W + L.goal[0];
    const free = c => c >= 0 && !wall.has(c), key = s => s.join(',');
    const step = (c, d) => { const x = c % W + d[0], y = Math.floor(c / W) + d[1]; return x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x; };
    const start = [L.p[1] * W + L.p[0], L.a[1] * W + L.a[0], L.b ? L.b[1] * W + L.b[0] : -1];
    const prev = new Map([[key(start), null]]), q = [start], out = new Map(); let firstWin = null, n = 0;
    for (let h = 0; h < q.length; h++) {
      const s = q[h], ks = key(s), o = []; n++;
      if (!firstWin && s[1] === goal) firstWin = s;
      for (const d of D) {
        const c = step(s[0], d); if (!free(c)) continue; let a = s[1], b = s[2];
        if (c === a || c === b) { const m = step(c, d); if (!free(m) || m === a || m === b) continue; if (c === a) a = m; else b = m; }
        const t = [c, a, b], k = key(t); o.push(k);
        if (!prev.has(k)) { prev.set(k, ks); q.push(t); }
      }
      out.set(ks, o);
    }
    const rev = new Map(); out.forEach((o, k) => o.forEach(t => { let r = rev.get(t); if (!r) rev.set(t, r = []); r.push(k); }));
    const alive = new Set(q.filter(s => s[1] === goal).map(key)), q2 = [...alive];
    for (let h = 0; h < q2.length; h++) (rev.get(q2[h]) || []).forEach(p => { if (!alive.has(p)) { alive.add(p); q2.push(p); } });
    let path = null;
    if (firstWin) { path = []; let k = key(firstWin); while (k) { path.unshift(k.split(',').map(Number)); k = prev.get(k); } }
    const pushes = path ? path.filter((s, i) => i && (s[1] !== path[i - 1][1] || s[2] !== path[i - 1][2])).length : 0;
    return { states: n, dead: n - alive.size, moves: path ? path.length - 1 : null, pushes, path };
  }
  const xy = c => [c % W, Math.floor(c / W)];

  GK.scene('reverse', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.pr-s')]; ui.watch(btns);
    let si = 1; const edits = STAGES.map(st => st.walls.map(w => w.join(',')));
    btns.forEach(b => b.onclick = () => { si = +b.dataset.s; });
    const cache = {};
    const level = i => ({ ...STAGES[i], walls: edits[i].map(k => k.split(',').map(Number)) });
    const run = i => { const k = i + '|' + edits[i].join(';'); return cache[k] || (cache[k] = solve(level(i))); };
    const cv = g.canvas;
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * cv.width / r.width, my = (e.clientY - r.top) * cv.height / r.height;
      const x = Math.floor((mx - OX) / CS), y = Math.floor((my - OY) / CS); if (x < 0 || y < 0 || x >= W || y >= H) return;
      const L = STAGES[si], k = `${x},${y}`;
      if ([L.goal, L.p, L.a, L.b].some(v => v && v[0] === x && v[1] === y)) return;
      ui.stopTour(); const e2 = edits[si], i = e2.indexOf(k); i < 0 ? e2.push(k) : e2.splice(i, 1);
    });
    const PER = 9;
    return {
      dur: PER * 4,
      frame(t, tour) {
        let lt = t;
        if (tour) { si = Math.floor(t / PER) % 4; lt = t % PER; }
        btns.forEach(b => b.classList.toggle('on', +b.dataset.s === si));
        const L = level(si), R = run(si);
        // which state to draw: stage 2 plays the solution backward (the pulls); 3 and 4 play it forward
        let st = null, label = '';
        if (si === 0 || !R.path) st = null;
        else {
          const n = R.path.length, f = Math.min(n - 1, Math.floor(Math.max(0, lt - 1) * 4.5) % (n + 8));
          const idx = Math.min(n - 1, f);
          st = si === 1 ? R.path[n - 1 - idx] : R.path[idx];
          label = si === 1 ? `pull ${idx} of ${n - 1} moves back from the goal` : `move ${idx} of ${n - 1}`;
        }
        const P = st ? xy(st[0]) : L.p, A = st ? xy(st[1]) : L.a, B = st ? (st[2] >= 0 ? xy(st[2]) : null) : L.b;
        GK.panel(g);
        GK.head(g, STAGES[si].name, OX, 40, 'left', C.ink, 18);
        // grid
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const X = OX + x * CS, Y = OY + y * CS, wl = L.walls.some(w => w[0] === x && w[1] === y);
          g.fillStyle = wl ? C.wall : (x + y) % 2 ? '#efe6d2' : '#e7dcc4'; g.fillRect(X, Y, CS, CS);
          if (wl) { g.fillStyle = C.wallHi; g.fillRect(X, Y, CS, 6); }
        }
        g.strokeStyle = C.wallDk; g.lineWidth = 4; g.strokeRect(OX - 2, OY - 2, W * CS + 4, H * CS + 4);
        const G = L.goal; g.strokeStyle = C.gold; g.lineWidth = 4; g.setLineDash([6, 5]); g.strokeRect(OX + G[0] * CS + 8, OY + G[1] * CS + 8, CS - 16, CS - 16); g.setLineDash([]);
        const blk = (p, fill, edge) => { g.fillStyle = fill; g.beginPath(); g.roundRect(OX + p[0] * CS + 6, OY + p[1] * CS + 6, CS - 12, CS - 12, 8); g.fill(); g.strokeStyle = edge; g.lineWidth = 3; g.stroke(); };
        if (B) blk(B, '#b9b5a8', '#7d786a');
        blk(A, C.gold, C.goldInk);
        TD.player(OX + P[0] * CS + CS / 2, OY + P[1] * CS + CS / 2, 0, .9);
        if (label) GK.text(g, label, OX + W * CS, 40, C.muted, 13, 'right', 600);
        // stage text and solver
        const RX = 580;
        GK.wrap(g, STAGES[si].say, RX, 80, 430, 21, C.navy, 15, 600);
        const yy = 200;
        GK.head(g, 'The solver checks it', RX, yy, 'left', C.ink, 15);
        GK.big(g, si === 0 ? '0' : R.moves == null ? 'none' : `${R.moves}`, si === 0 ? 'moves: already solved' : 'moves in the shortest solution', RX, yy + 40, R.moves == null ? C.redDk : C.ink);
        GK.big(g, si === 0 ? '0' : `${R.pushes}`, 'of them pushes', RX + 230, yy + 40);
        if (si > 0) {
          GK.big(g, R.states.toLocaleString(), 'positions the player can reach', RX, yy + 110);
          GK.big(g, `${Math.round(100 * R.dead / Math.max(1, R.states))}%`, 'of them dead ends', RX + 230, yy + 110, R.dead ? C.redDk : C.good);
        } else GK.wrap(g, 'No start position yet, so nothing to search: the level begins as its own answer.', RX, yy + 100, 430, 19, C.ink, 14, 600);
        GK.wrap(g, 'A dead end is a position from which the gold block can no longer reach the goal, such as a block pushed into a corner. Click any empty cell to add or remove a wall and the solver runs again.', RX, yy + 190, 430, 19, C.muted, 13);
        // stage strip
        STAGES.forEach((stg, i) => { GK.box(g, OX + i * 128, 470, 120, 30, i === si ? '#fff3d6' : '#fffaf0', i === si ? C.gold : '#cdbf9f', 8, 2); GK.text(g, `stage ${i + 1}`, OX + i * 128 + 60, 490, i === si ? C.ink : C.muted, 13, 'center', 700); });
        GK.text(g, 'Design order: solution first, start second, obstacles and false leads last.', OX, 530, C.ink, 14, 'left', 600);
        ui.stats(`<div><b>${si === 0 ? 0 : R.moves ?? '—'}</b><span>moves to solve</span></div><div><b>${Math.round(100 * R.dead / Math.max(1, R.states))}%</b><span>reachable positions that are dead ends</span></div>`);
        ui.out(R.moves == null && si > 0 ? 'Unsolvable: the walls cut the block off from the goal. Remove one.' : 'Each stage adds one idea to a level that is already known to be solvable, because it was built from the answer.');
      },
    };
  });
})();
