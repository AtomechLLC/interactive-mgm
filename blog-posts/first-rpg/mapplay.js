/* Map it yourself (genre breakdown: "What Was the First Turn-Based RPG Video Game?"), slide 2: a playable dungeon.
   Slide 1 shows Ultima I's split: a top-down overworld and first-person dungeons. Here the learner walks a first-person
   dungeon (W forward, A / D turn, S turn around) to find the stairs. Beside it is graph paper.
     Graph paper: the game shows nothing; click a cell edge to draw a wall, click a cell to mark it. You do not see
                  where you are, as in the early first-person crawlers, where players mapped on paper.
     Automap:     the game draws every wall you have seen and shows your arrow.
   Each mode uses its own 8 x 8 dungeon (the same layout mirrored, so equally hard but not memorised). The steps each
   mode took are the learner's own. The walk-through plays a scripted explorer on the automap. Mazes and art are this
   page's own. */
(function () {
  const C = TD.C, { clamp } = TD;
  const N = 8, DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
  function carve(seed) {
    const R = GK.rng(seed), open = Array.from({ length: N }, () => Array.from({ length: N }, () => [0, 0, 0, 0])), seen = new Set(['0,0']), st = [[0, 0]];
    while (st.length) {
      const [r, c] = st[st.length - 1], opts = [];
      DIRS.forEach(([dr, dc], k) => { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N && !seen.has(nr + ',' + nc)) opts.push([nr, nc, k]); });
      if (!opts.length) { st.pop(); continue; }
      const [nr, nc, k] = opts[Math.floor(R() * opts.length)]; open[r][c][k] = 1; open[nr][nc][(k + 2) % 4] = 1; seen.add(nr + ',' + nc); st.push([nr, nc]);
    }
    return open;
  }
  const BASE = carve(31);
  // mirror left-right: east and west swap, columns reverse
  const MIRROR = BASE.map(row => row.slice().reverse().map(([n, e, s, w]) => [n, w, s, e]));
  const MAZES = { paper: { open: BASE, start: [0, 0], goal: [N - 1, N - 1] }, auto: { open: MIRROR, start: [0, N - 1], goal: [N - 1, 0] } };
  function bfs(mz) {
    const prev = { [mz.start]: null }, q = [mz.start];
    while (q.length) { const [r, c] = q.shift(); DIRS.forEach(([dr, dc], k) => { if (!mz.open[r][c][k]) return; const n = [r + dr, c + dc]; if (!(n in prev)) { prev[n] = [r, c]; q.push(n); } }); }
    const p = []; let cur = mz.goal; while (cur) { p.unshift(cur); cur = prev[cur]; } return p;
  }
  const SHORT = bfs(MAZES.paper).length - 1;

  function corridor(g, x0, y0, w, h, open, r, c, f, goal) {
    g.fillStyle = '#111528'; g.fillRect(x0, y0, w, h);
    const fr = d => { const k = [0, .26, .39, .455, .485][d] ?? .49; return [x0 + w * k, y0 + h * k, w * (1 - 2 * k), h * (1 - 2 * k)]; };
    let cr = r, cc = c;
    for (let d = 0; d < 4; d++) {
      const cell = open[cr]?.[cc]; if (!cell) break;
      const [ax, ay, aw, ah] = fr(d), [bx, by, bw, bh] = fr(d + 1), sh = 220 - d * 45, wall = `rgb(${sh * .55},${sh * .6},${sh})`, left = (f + 3) % 4, right = (f + 1) % 4;
      g.fillStyle = wall; g.strokeStyle = '#e6e9ff'; g.lineWidth = 1.5;
      const side = (x1, x2, closed) => { g.beginPath(); if (closed) { g.moveTo(x1, ay); g.lineTo(x2, by); g.lineTo(x2, by + bh); g.lineTo(x1, ay + ah); g.closePath(); g.fill(); } else { g.moveTo(x1, by); g.lineTo(x2, by); g.lineTo(x2, by + bh); g.lineTo(x1, by + bh); } g.stroke(); };
      side(ax, bx, !cell[left]); side(ax + aw, bx + bw, !cell[right]);
      if (cr === goal[0] && cc === goal[1]) { g.fillStyle = C.gold; g.beginPath(); g.moveTo(bx + bw * .2, by + bh); g.lineTo(bx + bw * .8, by + bh); g.lineTo(bx + bw * .65, by + bh * .7); g.lineTo(bx + bw * .35, by + bh * .7); g.fill(); GK.text(g, 'stairs down', bx + bw / 2, by + bh * .62, C.gold, Math.max(10, 16 - d * 2), 'center', 800); break; }
      if (!cell[f]) { g.fillStyle = wall; g.fillRect(bx, by, bw, bh); g.strokeRect(bx, by, bw, bh); break; }
      cr += DIRS[f][0]; cc += DIRS[f][1];
    }
  }

  GK.scene('mapplay', (s, g, ui) => {
    const cv = s.querySelector('canvas'), modeBtns = [...s.querySelectorAll('.mp-m .btn')], padBtns = [...s.querySelectorAll('.mp-pad .btn')], resetBtn = s.querySelector('.mp-reset');
    const face0 = m => { const [r, c] = MAZES[m].start; return [2, 1, 3, 0].find(k => MAZES[m].open[r][c][k]); };
    const fresh = m => ({ pos: MAZES[m].start.slice(), f: face0(m), steps: 0, done: false, seen: new Set([MAZES[m].start + '']), walls: new Set(), marks: new Set() });
    const st = { mode: 'paper', play: { paper: fresh('paper'), auto: fresh('auto') }, bump: 0 };
    const sync = () => modeBtns.forEach(b => b.classList.toggle('on', b.dataset.m === st.mode));
    modeBtns.forEach(b => b.onclick = () => { st.mode = b.dataset.m; sync(); });
    resetBtn.onclick = () => { st.play[st.mode] = fresh(st.mode); };
    const act = k => {
      ui.stopTour(); const P = st.play[st.mode], mz = MAZES[st.mode]; if (P.done) return;
      if (k === 'a') P.f = (P.f + 3) % 4; else if (k === 'd') P.f = (P.f + 1) % 4; else if (k === 's') P.f = (P.f + 2) % 4;
      else if (k === 'w') { const [r, c] = P.pos; if (mz.open[r][c][P.f]) { P.pos = [r + DIRS[P.f][0], c + DIRS[P.f][1]]; P.steps++; P.seen.add(P.pos + ''); if (P.pos[0] === mz.goal[0] && P.pos[1] === mz.goal[1]) P.done = true; } else st.bump = performance.now() + 500; }
    };
    addEventListener('keydown', e => { if (!s.classList.contains('active')) return; const k = e.key.toLowerCase(); if ('wasd'.includes(k) && k.length === 1) act(k); });
    padBtns.forEach(b => b.onclick = () => act(b.dataset.k));
    // graph paper clicks: near an edge draws a wall, the middle of a cell marks it
    const PX = 600, PY = 54, CS = 36;
    cv.addEventListener('pointerdown', e => {
      if (st.mode !== 'paper') return;
      const rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * cv.width / rc.width - PX, y = (e.clientY - rc.top) * cv.height / rc.height - PY;
      if (x < -6 || y < -6 || x > N * CS + 6 || y > N * CS + 6) return;
      ui.stopTour(); const P = st.play.paper, c = clamp(Math.floor(x / CS), 0, N - 1), r = clamp(Math.floor(y / CS), 0, N - 1), fx = x - c * CS, fy = y - r * CS;
      const d = [fy, CS - fx, CS - fy, fx], k = d.indexOf(Math.min(...d));
      const toggle = (set, key) => set.has(key) ? set.delete(key) : set.add(key);
      if (d[k] < 9) { const key = k === 0 ? `h${r},${c}` : k === 2 ? `h${r + 1},${c}` : k === 3 ? `v${r},${c}` : `v${r},${c + 1}`; toggle(P.walls, key); }
      else toggle(P.marks, r + ',' + c);
    });
    ui.watch(modeBtns, resetBtn, padBtns);
    // walk-through: the shortest path on the automap with a few wrong turns, one move every 0.35 s
    const TOUR = (() => { const mz = MAZES.auto, path = bfs(mz), moves = []; let f = 2, cur = mz.start;
      for (let i = 1; i < path.length; i++) { const [r, c] = cur, k = DIRS.findIndex(([dr, dc]) => r + dr === path[i][0] && c + dc === path[i][1]); while (f !== k) { f = (f + 1) % 4; moves.push([cur, f]); } cur = path[i]; moves.push([cur, f]); }
      return moves; })();
    sync();
    return {
      dur: TOUR.length * .35 + 4,
      frame(t, tour) {
        let mode = st.mode, P = st.play[mode];
        if (tour) {
          mode = 'auto'; const k = Math.min(TOUR.length - 1, Math.floor(t / .35)), seen = new Set(TOUR.slice(0, k + 1).map(m => m[0] + ''));
          P = { pos: TOUR[k][0], f: TOUR[k][1], steps: new Set(TOUR.slice(0, k + 1).map(m => m[0] + '')).size - 1, done: k === TOUR.length - 1, seen, walls: new Set(), marks: new Set() };
        }
        const mz = MAZES[mode];
        GK.panel(g);
        GK.head(g, P.done ? 'You found the stairs' : 'What you see', 20, 30, 'left', P.done ? C.good : C.ink);
        corridor(g, 20, 44, 540, 340, mz.open, P.pos[0], P.pos[1], P.f, mz.goal);
        if (!tour && st.bump > performance.now()) GK.text(g, 'bump: a wall', 290, 70, '#ff8a80', 14, 'center', 800);
        GK.text(g, `Facing ${['north', 'east', 'south', 'west'][P.f]} · ${P.steps} steps`, 20, 404, C.ink, 14, 'left', 700);
        // the paper
        GK.head(g, mode === 'paper' ? 'Your graph paper: click edges to draw walls' : 'The automap draws what you have seen', PX, 30);
        g.fillStyle = '#fbf8ee'; g.fillRect(PX, PY, N * CS, N * CS);
        g.strokeStyle = 'rgba(80,120,190,.25)'; g.lineWidth = 1;
        for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(PX + i * CS, PY); g.lineTo(PX + i * CS, PY + N * CS); g.stroke(); g.beginPath(); g.moveTo(PX, PY + i * CS); g.lineTo(PX + N * CS, PY + i * CS); g.stroke(); }
        g.strokeStyle = C.navy; g.lineWidth = 3;
        if (mode === 'paper') {
          P.marks.forEach(k => { const [r, c] = k.split(',').map(Number); g.fillStyle = 'rgba(224,169,45,.45)'; g.fillRect(PX + c * CS + 4, PY + r * CS + 4, CS - 8, CS - 8); });
          P.walls.forEach(k => { const [r, c] = k.slice(1).split(',').map(Number); g.beginPath(); if (k[0] === 'h') { g.moveTo(PX + c * CS, PY + r * CS); g.lineTo(PX + (c + 1) * CS, PY + r * CS); } else { g.moveTo(PX + c * CS, PY + r * CS); g.lineTo(PX + c * CS, PY + (r + 1) * CS); } g.stroke(); });
          GK.text(g, `You start in the top-left corner, facing ${['north', 'east', 'south', 'west'][face0('paper')]}.`, PX, PY + N * CS + 20, C.muted, 12, 'left', 600);
        } else {
          P.seen.forEach(k => { const [r, c] = k.split(',').map(Number), o = mz.open[r][c], x = PX + c * CS, y = PY + r * CS; g.fillStyle = 'rgba(46,163,220,.15)'; g.fillRect(x, y, CS, CS);
            g.beginPath(); if (!o[0]) { g.moveTo(x, y); g.lineTo(x + CS, y); } if (!o[1]) { g.moveTo(x + CS, y); g.lineTo(x + CS, y + CS); } if (!o[2]) { g.moveTo(x, y + CS); g.lineTo(x + CS, y + CS); } if (!o[3]) { g.moveTo(x, y); g.lineTo(x, y + CS); } g.stroke(); });
          TD.player(PX + P.pos[1] * CS + CS / 2, PY + P.pos[0] * CS + CS / 2, Math.atan2(DIRS[P.f][0], DIRS[P.f][1]), .36, 1, C.red);
        }
        // scores
        const sc = m => st.play[m].done ? `${st.play[m].steps} steps` : st.play[m].steps ? `${st.play[m].steps} steps so far` : 'not tried';
        const sx = PX + N * CS + 24;
        GK.head(g, 'Your runs', sx, 70, 'left', C.ink, 14);
        GK.text(g, 'Graph paper', sx, 100, C.ink, 13, 'left', 700); GK.text(g, sc('paper'), sx, 120, C.muted, 13, 'left', 600);
        GK.text(g, 'Automap', sx, 150, C.ink, 13, 'left', 700); GK.text(g, sc('auto'), sx, 170, C.muted, 13, 'left', 600);
        GK.text(g, `Shortest route: ${SHORT}`, sx, 200, C.muted, 12, 'left', 600);
        const a = st.play.paper, b = st.play.auto;
        const msg = tour ? 'The walk-through takes the shortest route on the automap. Press W, A, S, D (or the arrows on the right) to walk it yourself, first on graph paper.'
          : a.done && b.done ? (a.steps > b.steps * 1.2 ? `Graph paper took you ${a.steps} steps and the automap ${b.steps}. The view hid the layout, and remembering it was the game.` : `Graph paper took ${a.steps} steps and the automap ${b.steps}. Close: your own mapping did the automap's job.`)
          : mode === 'paper' ? 'Walk, and draw what you find. Nothing on screen tells you where you are.' : 'Now the game remembers for you. Notice what you stop paying attention to.';
        GK.wrap(g, msg, 20, 470, 1000, 21, C.ink, 16, 700);
        GK.wrap(g, 'A first-person view hides the layout, so in the early crawlers mapping was the challenge. An automap moves the challenge somewhere else: what the camera hides is what the player has to master.', 20, 540, 1000, 18, C.muted, 13);
        ui.stats(`<div class="${a.done ? 'g' : ''}"><b>${a.steps}</b><span>steps on graph paper${a.done ? '' : ' so far'}</span></div><div class="${b.done ? 'g' : ''}"><b>${b.steps}</b><span>steps with the automap${b.done ? '' : ' so far'}</span></div>`);
        ui.out(mode === 'paper' ? 'Graph paper: you are the map.' : 'Automap: the game is the map.');
      },
    };
  });
})();
