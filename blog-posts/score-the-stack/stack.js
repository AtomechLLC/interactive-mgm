/* Score the Stack (replanned page for "Risk for Score"; Scripture: Incentive Alignment, Interesting Choices and Tension).
   A small falling-block stacker played three times under three score tables. The page records the learner's own stack
   height after every piece, their clears by size and whether they topped out. The walk-through's player is a script
   whose policy is written to chase each table, so its rows show the incentive, not a person. */
(function () {
  const C = TD.C, W = 8, H = 14, CS = 30, BX = 40, BY = 84, N = 28;
  const SH = [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]]];
  const COL = ['#3b6fd4', '#f5b041', '#8e5bd0', '#e67e22', '#2fae63', '#e5322d', '#17a2a2'];
  const TB = [{ n: 'Flat', pts: [0, 100, 200, 300, 400], tip: '100 per line, however many at once', need: 0 },
    { n: 'Steep', pts: [0, 40, 100, 300, 1200], tip: '40, 100, 300, then 1,200 for four at once', need: 3 },
    { n: 'Jackpot', pts: [0, 10, 20, 30, 3000], tip: 'Almost nothing, then 3,000 for four at once', need: 4 }];
  const saved = [];
  function cells(k, r) {
    let c = SH[k].map(p => p.slice());
    for (let i = 0; i < r; i++) c = c.map(([x, y]) => [-y, x]);
    const mx = Math.min(...c.map(p => p[0])), my = Math.min(...c.map(p => p[1]));
    return c.map(([x, y]) => [x - mx, y - my]);
  }
  const fits = (grid, k, r, x, y) => cells(k, r).every(([cx, cy]) => x + cx >= 0 && x + cx < W && y + cy < H && (y + cy < 0 || !grid[y + cy][x + cx]));
  const heights = grid => Array.from({ length: W }, (_, x) => { for (let y = 0; y < H; y++) if (grid[y][x]) return H - y; return 0; });
  function lock(grid, k, r, x, y) {
    const g2 = grid.map(row => row.slice()); let over = false;
    cells(k, r).forEach(([cx, cy]) => { if (y + cy < 0) over = true; else g2[y + cy][x + cx] = k + 1; });
    const keep = g2.filter(row => row.some(v => !v)), lines = H - keep.length;
    while (keep.length < H) keep.unshift(Array(W).fill(0));
    return { grid: keep, lines, over };
  }
  const dropY = (grid, k, r, x) => { let y = -3; while (fits(grid, k, r, x, y + 1)) y++; return y; };
  // the scripted player: lowest, flattest landing; with a table that pays for big clears it keeps the right column empty
  function plan(grid, k, need) {
    let best = null; const panic = Math.max(...heights(grid)) >= 9;
    for (let r = 0; r < 4; r++) for (let x = 0; x < W; x++) {
      if (!fits(grid, k, r, x, -3)) continue;
      const y = dropY(grid, k, r, x), res = lock(grid, k, r, x, y); if (res.over) continue;
      const h = heights(res.grid); let holes = 0, bump = 0;
      for (let cx = 0; cx < W; cx++) for (let cy = H - h[cx]; cy < H; cy++) if (!res.grid[cy][cx]) holes++;
      const lim = need && !panic ? W - 2 : W - 1; for (let cx = 0; cx < lim; cx++) bump += Math.abs(h[cx] - h[cx + 1]);
      let v = -.5 * h.reduce((a, b) => a + b, 0) - 7 * holes - 1.8 * bump + res.lines * 8;
      if (need && !panic) { const well = cells(k, r).some(([cx]) => x + cx === W - 1); if (well) v += res.lines >= need ? 200 : -1000; }
      if (!best || v > best.v) best = { v, r, x };
    }
    return best || { r: 0, x: 3 };
  }
  const round = st => ({ grid: Array.from({ length: H }, () => Array(W).fill(0)), n: 0, score: 0, by: [0, 0, 0, 0, 0], hist: [], over: false, p: null, fall: 0, pt: 0, flash: -9, got: 0 });
  function spawn(st) {
    const q = st.q;
    if (!st.bag.length) { st.bag = [0, 1, 2, 3, 4, 5, 6]; for (let i = 6; i > 0; i--) { const j = st.R() * (i + 1) | 0;[st.bag[i], st.bag[j]] = [st.bag[j], st.bag[i]]; } }
    q.p = { k: st.bag.pop(), r: 0, x: 3, y: -1 }; q.pt = 0; q.fall = 0;
    if (!fits(q.grid, q.p.k, 0, 3, -1)) { q.over = true; q.p = null; finish(st); }
  }
  function place(st) {
    const q = st.q, p = q.p, res = lock(q.grid, p.k, p.r, p.x, p.y);
    q.grid = res.grid; q.n++; q.by[res.lines]++; q.score += TB[st.tb].pts[res.lines];
    if (res.lines) { q.flash = st.t; q.got = res.lines; if (st.live) PLAY.beep(500 + res.lines * 220, .1 + res.lines * .05, .15); }
    q.hist.push(Math.max(...heights(q.grid))); q.p = null;
    if (res.over) q.over = true;
    if (q.over || q.n >= N) finish(st); else spawn(st);
  }
  function finish(st) {
    const q = st.q, row = { tb: st.tb, score: q.score, by: q.by, hist: q.hist, over: q.over, n: q.n, peak: Math.max(0, ...q.hist), mean: q.hist.reduce((a, b) => a + b, 0) / Math.max(1, q.hist.length) };
    st.rows[st.tb] = row; if (st.live) saved[st.tb] = row;
    st.phase = st.tb < 2 ? 'between' : 'end'; st.at = st.t;
  }
  PLAY.game('stack', {
    dur: 46, keys: [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
    init(o, live) { const st = { live, R: live ? Math.random : GK.rng(11), t: 0, tb: 0, bag: [], rows: [], phase: live ? 'ready' : 'go', at: 0 }; st.q = round(st); if (!live) spawn(st); return st; },
    step(st, inp, dt) {
      st.t += dt; const q = st.q;
      if (st.phase === 'ready') { if (inp.press[' '] || inp.click) { st.phase = 'go'; spawn(st); } return; }
      if (st.phase === 'between') { if ((st.live ? inp.press[' '] || inp.click : st.t - st.at > 1.6) && st.t - st.at > .5) { st.tb++; st.q = round(st); st.bag = []; st.phase = 'go'; spawn(st); } return; }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true)); return; }
      const p = q.p; if (!p) return;
      q.pt += dt;
      if (!st.live) { if (inp.place && q.pt > .26) { p.r = inp.place.r; p.x = inp.place.x; p.y = dropY(q.grid, p.k, p.r, p.x); place(st); } return; }
      const mv = d => { if (fits(q.grid, p.k, p.r, p.x + d, p.y)) p.x += d; };
      if (inp.press.ArrowLeft) mv(-1); if (inp.press.ArrowRight) mv(1);
      if (inp.press.ArrowUp) { const r = (p.r + 1) % 4; for (const d of [0, -1, 1, -2]) if (fits(q.grid, p.k, r, p.x + d, p.y)) { p.r = r; p.x += d; break; } }
      if (inp.press[' ']) { p.y = dropY(q.grid, p.k, p.r, p.x); place(st); return; }
      q.fall += dt * (inp.down.ArrowDown ? 12 : 1);
      if (q.fall >= .6) { q.fall = 0; if (fits(q.grid, p.k, p.r, p.x, p.y + 1)) p.y++; else place(st); }
    },
    bot(st) { const q = st.q; if (st.phase !== 'go' || !q.p) return null; if (!q.p.plan) q.p.plan = plan(q.grid, q.p.k, TB[st.tb].need); return { down: {}, press: {}, place: q.p.plan }; },
    draw(g, st, ui, live) {
      GK.panel(g); const q = st.q, tb = TB[st.tb];
      GK.head(g, `Round ${st.tb + 1} of 3 · ${tb.n} table`, BX, 34, 'left', C.ink, 17);
      GK.text(g, tb.tip, BX, 58, C.muted, 13, 'left', 600);
      GK.box(g, BX - 4, BY - 4, W * CS + 8, H * CS + 8, '#22262f', '#22262f', 8, 2);
      const cell = (x, y, k, a = 1) => { g.globalAlpha = a; g.fillStyle = COL[k]; g.beginPath(); g.roundRect(BX + x * CS + 1.5, BY + y * CS + 1.5, CS - 3, CS - 3, 5); g.fill(); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(BX + x * CS + 5, BY + y * CS + 4, CS - 10, 4); g.globalAlpha = 1; };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (q.grid[y][x]) cell(x, y, q.grid[y][x] - 1); else { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(BX + x * CS + 1, BY + y * CS + 1, CS - 2, CS - 2); } }
      if (q.p) {
        const p = q.p, gy = dropY(q.grid, p.k, p.r, p.x);
        if (live) cells(p.k, p.r).forEach(([cx, cy]) => { if (gy + cy >= 0) cell(p.x + cx, gy + cy, p.k, .25); });
        cells(p.k, p.r).forEach(([cx, cy]) => { if (p.y + cy >= 0) cell(p.x + cx, p.y + cy, p.k); });
      }
      if (st.t - q.flash < .9) TD.label(`${q.got} line${q.got > 1 ? 's' : ''} · +${tb.pts[q.got].toLocaleString()}`, BX + W * CS / 2, BY + 40, 'center', '#fff', 15, 'rgba(47,174,99,.95)');
      const SX = BX + W * CS + 30;
      GK.text(g, 'score', SX, BY + 14, C.muted, 12, 'left', 700); GK.text(g, q.score.toLocaleString(), SX, BY + 46, C.navy, 28, 'left', 800);
      GK.text(g, 'pieces left', SX, BY + 84, C.muted, 12, 'left', 700); GK.text(g, String(N - q.n), SX, BY + 112, C.ink, 22, 'left', 800);
      GK.text(g, 'this table pays', SX, BY + 152, C.muted, 12, 'left', 700);
      [1, 2, 3, 4].forEach(n => { GK.text(g, `${n} line${n > 1 ? 's' : ''}`, SX, BY + 152 + n * 24, C.ink, 13, 'left', 600); GK.text(g, tb.pts[n].toLocaleString(), SX + 130, BY + 152 + n * 24, C.ink, 13, 'right', 800); });
      if (live) GK.wrap(g, '← → move · ↑ turn · ↓ faster · Space drop', SX, BY + 300, 140, 18, C.muted, 12, 600);
      // the three rows
      const RX = 500, RW = 510;
      GK.text(g, 'stack height after each piece', RX, 34, C.muted, 12, 'left', 700);
      TB.forEach((t, i) => {
        const y = 50 + i * 172, row = i === st.tb && st.phase === 'go' ? { hist: q.hist, score: q.score, by: q.by, cur: true } : st.rows[i];
        GK.box(g, RX, y, RW, 158, i === st.tb && st.phase !== 'end' ? '#fff6dd' : '#fffaf0', '#cdbf9f', 10, 1.5);
        GK.text(g, t.n, RX + 14, y + 26, C.ink, 15, 'left', 800); GK.text(g, t.pts.slice(1).map(v => v.toLocaleString()).join(' · '), RX + 14, y + 46, C.muted, 12, 'left', 600);
        const cx = RX + 170, cw = RW - 190, cy = y + 18, ch = 100;
        g.strokeStyle = '#e3d8bf'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy + ch); g.lineTo(cx + cw, cy + ch); g.moveTo(cx, cy); g.lineTo(cx + cw, cy); g.stroke();
        GK.text(g, 'top', cx - 6, cy + 4, C.muted, 10, 'right', 600); GK.text(g, '0', cx - 6, cy + ch + 4, C.muted, 10, 'right', 600);
        if (!row) return;
        if (row.hist.length) { g.fillStyle = 'rgba(59,111,212,.18)'; g.beginPath(); g.moveTo(cx, cy + ch); row.hist.forEach((h, j) => g.lineTo(cx + (j + 1) / N * cw, cy + ch - h / H * ch)); g.lineTo(cx + row.hist.length / N * cw, cy + ch); g.fill(); GK.line(g, [[cx, cy + ch], ...row.hist.map((h, j) => [cx + (j + 1) / N * cw, cy + ch - h / H * ch])], C.navy, 2.5); }
        GK.text(g, row.score.toLocaleString() + ' pts', RX + 14, y + 82, C.navy, 18, 'left', 800);
        if (!row.cur) GK.text(g, `mean height ${row.mean.toFixed(1)} · peak ${row.peak}`, RX + 14, y + 104, C.ink, 12, 'left', 600);
        GK.text(g, `clears: ${[1, 2, 3, 4].map(n => `${row.by[n]}×${n}`).join('  ')}`, cx, y + 144, C.ink, 12, 'left', 600);
        if (row.over) GK.text(g, `topped out after ${row.n} pieces`, RX + RW - 14, y + 144, C.redDk, 12, 'right', 800);
      });
      if (st.phase === 'ready') TD.stamp('Space to start', BX + W * CS / 2, BY + 200, '#fff', 1, 22);
      if (st.phase === 'between') { TD.label(q.over ? 'Topped out. The round ends here.' : 'Round over', BX + W * CS / 2, BY + 180, 'center', C.ink, 15); if (live) ui.btn('next', `Space · next: ${TB[st.tb + 1].n}`, BX + 10, BY + 210, W * CS - 20, 44, { px: 14, on: true }); }
      if (st.phase === 'end' && live) ui.btn('again', 'Play all three again', BX + 10, BY + 210, W * CS - 20, 44, { px: 14, on: true });
      ui.stats(`<div><b>${q.score.toLocaleString()}</b><span>points this round</span></div><div><b>${q.hist.length ? q.hist[q.hist.length - 1] : 0} of ${H}</b><span>stack height now</span></div><div class="g"><b>${q.by[4]}</b><span>four-line clears</span></div>`);
      const R = st.rows, who = live ? 'Your' : 'The script’s';
      if (st.phase !== 'end') { ui.out(live ? `${tb.tip}. ${N} pieces a round; if the stack reaches the top the round ends and the pieces left are lost.` : 'A scripted player takes each table at its word: with a big four-line prize it leaves the right column open and waits for a long piece.'); return; }
      const tall = [0, 1, 2].reduce((a, b) => R[b].mean > R[a].mean ? b : a), rich = [0, 1, 2].reduce((a, b) => R[b].score > R[a].score ? b : a), outs = R.filter(r => r.over).map(r => TB[r.tb].n);
      const spread = Math.max(...R.map(r => r.mean)) - Math.min(...R.map(r => r.mean));
      ui.out(`${who} mean stack height: ${R.map(r => `${TB[r.tb].n} ${r.mean.toFixed(1)}`).join(', ')}. ` + (spread < .8 ? `That is a spread of ${spread.toFixed(1)} rows, so the table barely changed how ${live ? 'you' : 'it'} stacked this time. ` : `${TB[tall].n} had ${live ? 'you' : 'it'} stacking highest. `) + (outs.length ? `Topped out under: ${outs.join(', ')}. ` : 'No round topped out. ') + `Highest points came under ${TB[rich].n}${rich === tall ? ', the same table' : `, not ${TB[tall].n}`}; points from different tables are not on one scale, so the height line is the fair comparison. The table is the designer saying how much danger a clear is worth.`);
    },
  });
})();
