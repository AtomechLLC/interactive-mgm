/* Two views, one dungeon (genre breakdown: "What Was the First Turn-Based RPG Video Game?"), a lesson-richness
   spike for slide 2. Slide 1 shows Ultima I's split: a top-down overworld and first-person dungeons. This slide asks
   what the first-person view does to the dungeon. One seeded 12 x 12 maze; 30 explorers enter at the top-left and look
   for the stairs at the bottom-right. The designer picks what the player can see:
     first person, no map:  the explorer only remembers the last 4 cells it walked (players drew maps on graph paper);
     first person, automap: the game remembers every visited cell, so the explorer never re-enters a dead end it knows;
     top-down, whole map:   the explorer sees the maze and walks the shortest path.
   At each junction an explorer prefers a cell it does not remember, picking at random among those. An explorer that
   has not found the stairs after 400 steps gives up. The maze and the explorer model are this page's own. */
(function () {
  const C = TD.C, { clamp } = TD;
  const N = 12, MAX = 400;
  // maze: walls[r][c] = [N, E, S, W] open flags, carved by a seeded depth-first search
  const MAZE = (() => {
    const R = GK.rng(21), open = Array.from({ length: N }, () => Array.from({ length: N }, () => [0, 0, 0, 0])), seen = new Set(['0,0']), st = [[0, 0]];
    const D = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    while (st.length) {
      const [r, c] = st[st.length - 1], opts = [];
      D.forEach(([dr, dc], k) => { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N && !seen.has(nr + ',' + nc)) opts.push([nr, nc, k]); });
      if (!opts.length) { st.pop(); continue; }
      const [nr, nc, k] = opts[Math.floor(R() * opts.length)]; open[r][c][k] = 1; open[nr][nc][(k + 2) % 4] = 1; seen.add(nr + ',' + nc); st.push([nr, nc]);
    }
    // a few extra openings make loops, as hand-made dungeons have
    [[2, 3, 1], [5, 5, 2], [6, 1, 1], [3, 7, 2]].forEach(([r, c, k]) => { const D2 = [[-1, 0], [0, 1], [1, 0], [0, -1]][k]; open[r][c][k] = 1; open[r + D2[0]][c + D2[1]][(k + 2) % 4] = 1; });
    return open;
  })();
  const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]], GOAL = [N - 1, N - 1];
  const nbrs = (r, c) => DIRS.map(([dr, dc], k) => MAZE[r][c][k] ? [r + dr, c + dc, k] : null).filter(Boolean);
  function shortest() {
    const prev = { '0,0': null }, q = [[0, 0]];
    while (q.length) { const [r, c] = q.shift(); if (r === GOAL[0] && c === GOAL[1]) break; for (const [nr, nc] of nbrs(r, c)) { const k = nr + ',' + nc; if (!(k in prev)) { prev[k] = [r, c]; q.push([nr, nc]); } } }
    const path = []; let cur = GOAL; while (cur) { path.unshift(cur); cur = prev[cur[0] + ',' + cur[1]]; } return path;
  }
  const SHORT = shortest();
  function explore(seed, mode) {
    if (mode === 'map') return { path: SHORT.map(([r, c], i) => [r, c, i ? DIRS.findIndex(([dr, dc]) => dr === r - SHORT[i - 1][0] && dc === c - SHORT[i - 1][1]) : 2]), found: true };
    const R = GK.rng(seed), mem = [], seen = new Set(), dead = new Set(); let r = 0, c = 0, f = 2; const path = [[0, 0, 2]];
    for (let s = 0; s < MAX; s++) {
      if (r === GOAL[0] && c === GOAL[1]) return { path, found: true };
      const key = r + ',' + c; seen.add(key); mem.push(key); if (mem.length > 4) mem.shift();
      let opts = nbrs(r, c);
      if (mode === 'auto') { const fresh = opts.filter(([nr, nc]) => !seen.has(nr + ',' + nc)); if (fresh.length) opts = fresh; else { const back = opts.filter(([nr, nc]) => !dead.has(nr + ',' + nc)); if (back.length > 1) opts = back.filter(([, , k]) => k !== (f + 2) % 4); else opts = back.length ? back : opts; dead.add(key); } }
      else { const fresh = opts.filter(([nr, nc]) => !mem.includes(nr + ',' + nc)); if (fresh.length) opts = fresh; }
      const [nr, nc, k] = opts[Math.floor(R() * opts.length)]; r = nr; c = nc; f = k; path.push([r, c, f]);
    }
    return { path, found: r === GOAL[0] && c === GOAL[1] };
  }
  const RUNS = {}; ['none', 'auto', 'map'].forEach(m => { RUNS[m] = Array.from({ length: 30 }, (_, i) => explore(i * 7 + 3, m)); });
  const stat = m => { const rs = RUNS[m], ok = rs.filter(x => x.found); return { found: ok.length, med: Math.round(rs.reduce((a, x) => a + (x.found ? x.path.length - 1 : MAX), 0) / rs.length), gave: rs.length - ok.length }; };   // med: average steps, a give-up counted as MAX
  const STAT = { none: stat('none'), auto: stat('auto'), map: stat('map') };
  const LABEL = { none: 'First person, no map', auto: 'First person, automap', map: 'Top-down, whole map' };

  // a first-person corridor view, drawn as nested frames up to three cells deep
  function corridor(g, x0, y0, w, h, r, c, f) {
    g.fillStyle = '#111528'; g.fillRect(x0, y0, w, h);
    const fr = d => { const k = [0, .28, .41, .47][d] ?? .49; return [x0 + w * k, y0 + h * k, w * (1 - 2 * k), h * (1 - 2 * k)]; };
    let cr = r, cc = c;
    for (let d = 0; d < 4; d++) {
      const [ax, ay, aw, ah] = fr(d), [bx, by, bw, bh] = fr(d + 1), cell = MAZE[cr]?.[cc]; if (!cell) break;
      const shade = 210 - d * 45, wall = `rgb(${shade * .55},${shade * .6},${shade})`;
      const left = (f + 3) % 4, right = (f + 1) % 4;
      g.fillStyle = wall; g.strokeStyle = '#e6e9ff'; g.lineWidth = 1.5;
      if (!cell[left]) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(bx, by + bh); g.lineTo(ax, ay + ah); g.closePath(); g.fill(); g.stroke(); }
      else { g.beginPath(); g.moveTo(ax, by); g.lineTo(bx, by); g.lineTo(bx, by + bh); g.lineTo(ax, by + bh); g.stroke(); }
      if (!cell[right]) { g.beginPath(); g.moveTo(ax + aw, ay); g.lineTo(bx + bw, by); g.lineTo(bx + bw, by + bh); g.lineTo(ax + aw, ay + ah); g.closePath(); g.fill(); g.stroke(); }
      else { g.beginPath(); g.moveTo(ax + aw, by); g.lineTo(bx + bw, by); g.lineTo(bx + bw, by + bh); g.lineTo(ax + aw, by + bh); g.stroke(); }
      if (cr === GOAL[0] && cc === GOAL[1] && d) { GK.text(g, 'stairs', bx + bw / 2, by + bh / 2, C.gold, 14, 'center', 800); break; }
      if (!cell[f]) { g.fillStyle = wall; g.fillRect(bx, by, bw, bh); g.strokeRect(bx, by, bw, bh); break; }
      cr += DIRS[f][0]; cc += DIRS[f][1];
    }
  }

  GK.scene('maze', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.mz-m .btn')]; const st = { m: 'none' };
    const sync = () => btns.forEach(b => b.classList.toggle('on', b.dataset.m === st.m));
    btns.forEach(b => b.onclick = () => { st.m = b.dataset.m; sync(); }); ui.watch(btns);
    const ACTS = [
      { to: 10, m: 'none', say: 'No map: the corridor ahead is all you see. Explorers walk in circles, and some give up. In 1981 players drew the maze on graph paper, and that was the game.' },
      { to: 18, m: 'auto', say: 'An automap: the game remembers where you have been. The maze is still a puzzle, but it stops being a memory test.' },
      { to: 24, m: 'map', say: 'Show the whole map from above and the maze is just a corridor to walk down.' },
    ];
    sync();
    return {
      dur: 24,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); st.m = a.m; say = a.say; sync(); }
        const run = RUNS[st.m][0], k = Math.min(run.path.length - 1, Math.floor((t * 14) % (run.path.length + 12))), [r, c, f] = run.path[k];
        GK.panel(g);
        GK.head(g, st.m === 'map' ? 'What the player sees: the whole map' : 'What the player sees', 20, 28);
        if (st.m === 'map') { /* the top-down view replaces the corridor */ }
        else corridor(g, 20, 44, 420, 300, r, c, f);
        // top-down: the designer's view, with this explorer's walk; the player sees it only with a map
        const mx = st.m === 'map' ? 20 : 480, my = 44, cs = 300 / N;
        if (st.m !== 'map') GK.head(g, st.m === 'auto' ? 'The automap: cells this explorer has visited' : 'The designer’s view (hidden from the player)', 480, 28);
        const visited = new Set(run.path.slice(0, k + 1).map(([a, b]) => a + ',' + b));
        for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) {
          const x = mx + cc * cs, y = my + rr * cs, hidden = st.m === 'auto' && !visited.has(rr + ',' + cc);
          g.fillStyle = hidden ? '#2a2e55' : visited.has(rr + ',' + cc) ? '#f6e7c4' : '#fffaf0'; g.fillRect(x, y, cs, cs);
          if (hidden) continue;
          g.strokeStyle = C.wall; g.lineWidth = 3; const o = MAZE[rr][cc];
          if (!o[0]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + cs, y); g.stroke(); } if (!o[1]) { g.beginPath(); g.moveTo(x + cs, y); g.lineTo(x + cs, y + cs); g.stroke(); }
          if (!o[2]) { g.beginPath(); g.moveTo(x, y + cs); g.lineTo(x + cs, y + cs); g.stroke(); } if (!o[3]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + cs); g.stroke(); }
        }
        g.fillStyle = C.gold; g.fillRect(mx + GOAL[1] * cs + 5, my + GOAL[0] * cs + 5, cs - 10, cs - 10);
        TD.player(mx + c * cs + cs / 2, my + r * cs + cs / 2, Math.atan2(DIRS[f][0], DIRS[f][1]), .34, 1, C.red);
        // outcomes for all three views
        const tx = st.m === 'map' ? 360 : 820, ty = 60;
        GK.head(g, `30 explorers (shortest path ${SHORT.length - 1})`, tx, ty - 16, 'left', C.ink, 13);
        ['none', 'auto', 'map'].forEach((m, i) => {
          const S = STAT[m], y = ty + i * 92, on = m === st.m;
          GK.box(g, tx, y, st.m === 'map' ? 650 : 200, 82, on ? '#dfe6fb' : '#fffaf0', on ? C.navy : '#cdbf9f', 10, 2);
          GK.text(g, LABEL[m], tx + 10, y + 20, C.ink, 12, 'left', 800);
          GK.text(g, `about ${S.med} steps on average`, tx + 10, y + 42, C.ink, 12, 'left', 600);
          GK.text(g, S.gave ? `${S.gave} of 30 gave up` : 'everyone found the stairs', tx + 10, y + 62, S.gave ? C.redDk : C.good, 12, 'left', 700);
        });
        GK.wrap(g, say || 'The view decides what the dungeon is about: memory and nerve without a map, puzzle-solving with an automap, a walk with the whole map.', 20, 420, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'Ultima I and Wizardry made the first-person dungeon itself the challenge. Every later dungeon picks a point on this dial: what the camera hides is what the player has to master.', 20, 500, 1000, 18, C.muted, 13);
        const S = STAT[st.m];
        ui.stats(`<div><b>${S.med}</b><span>average steps to the stairs (shortest ${SHORT.length - 1})</span></div><div class="${S.gave ? 'r' : 'g'}"><b>${S.gave}</b><span>of 30 gave up</span></div>`);
        ui.out('What the camera hides is what the player has to master.');
      },
    };
  });
})();
