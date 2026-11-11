/* Keep Two Threads Open (replanned page for "Puzzle Dependency Chart"; Scripture: Curiosity vs Confusion, Nested Goals,
   Direction). The learner wires six puzzles into a dependency chart and then plays it. Each puzzle is a timing lock,
   two of them narrow. Every solved puzzle widens the locks that remain, which stands in for what a player learns
   elsewhere. The page records how many puzzles were open at each moment, every miss, and the order the story arrived in. */
(function () {
  const C = TD.C, TAU = TD.TAU, FX = 24, FY = 56, FW = 640, FH = 410, CX = FX + 320, CY = FY + 160, RAD = 128, LOCK = .8, PERIOD = 1.6;
  const PZ = [{ n: 'Dock', line: 'A storm strands you at the dock.' }, { n: 'Lamp', line: 'The lamp shows a locked cellar.' }, { n: 'Cellar', line: 'The cellar hides a map.', hard: true }, { n: 'Map', line: 'The map marks a hidden cove.' }, { n: 'Dog', line: 'The dog leads you to the cove.', hard: true }, { n: 'Boat', line: 'The boat carries you out.' }];
  const POS = PZ.map((p, i) => { const a = -Math.PI / 2 + i * TAU / 6; return [CX + Math.cos(a) * RAD * 1.6, CY + Math.sin(a) * RAD]; });
  const PRE = { chain: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], two: [[0, 1], [1, 2], [3, 4], [2, 5], [4, 5]], flat: [] };
  const needs = (E, b) => E.filter(e => e[1] === b).map(e => e[0]);
  function reach(E, a, b) { const seen = new Set([a]), q = [a]; while (q.length) { const x = q.shift(); if (x === b) return true; E.forEach(([u, v]) => { if (u === x && !seen.has(v)) { seen.add(v); q.push(v); } }); } return false; }
  function orders(E) { let n = 0; const used = Array(6).fill(false); (function rec(k) { if (k === 6) { n++; return; } for (let i = 0; i < 6; i++) if (!used[i] && needs(E, i).every(d => used[d])) { used[i] = true; rec(k + 1); used[i] = false; } })(0); return n; }
  const open = (st, i) => !st.solved[i] && needs(st.E, i).every(d => st.solved[d]), breadth = st => PZ.filter((p, i) => open(st, i)).length;
  const width = (st, i) => (PZ[i].hard ? .035 : .2) * (1 + .25 * st.order.length);
  const mark = t => { const u = (t / PERIOD) % 1; return u < .5 ? u * 2 : 2 - u * 2; };
  let API = null;
  function play(st) { st.ph = 'play'; st.solved = Array(6).fill(false); st.order = []; st.pt = 0; st.lock = 0; st.sel = -1; st.curve = []; st.miss = []; st.zc = PZ.map(() => .2 + st.R() * .6); st.streak = 0; st.pick = -1; st.ord = orders(st.E); }
  PLAY.game('threads', {
    dur: 40, keys: [' '],
    setup(s, api) { API = api; },
    init(o, live) { return { live, t: 0, R: live ? Math.random : GK.rng(12), ph: 'wire', E: PRE.two.map(e => e.slice()), pick: -1, msg: '', mt: -9, pass: 0, solved: Array(6).fill(false), order: [], curve: [], miss: [] }; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, pr = inp.press || {};
      if (st.ph === 'wire') {
        if (typeof c === 'string' && PRE[c]) { st.E = PRE[c].map(e => e.slice()); st.pick = -1; }
        if (typeof c === 'number') { if (st.pick < 0) st.pick = c; else if (st.pick === c) st.pick = -1; else { const a = st.pick, b = c, k = st.E.findIndex(e => e[0] === a && e[1] === b); if (k >= 0) st.E.splice(k, 1); else if (reach(st.E, b, a)) { st.msg = `${PZ[a].n} already waits on ${PZ[b].n}: that would be a loop`; st.mt = st.t; } else st.E.push([a, b]); st.pick = -1; } }
        if (c === 'go') play(st); return; }
      if (st.ph === 'done') { if (st.live) { if (c === 'again') API.start(); if (c === 'replay') { st.ph = 'wire'; st.solved = Array(6).fill(false); st.order = []; } } else if (st.pass === 0 && st.t - st.at > 3) { st.pass = 1; st.first = { ord: st.ord, miss: st.miss.length, one: st.miss.filter(m => m.b === 1).length, time: st.pt }; st.E = PRE.two.map(e => e.slice()); play(st); } return; }
      st.pt += dt; if (st.lock > 0) st.lock -= dt;
      const ops = PZ.map((p, i) => i).filter(i => open(st, i)); if (st.sel < 0 || !open(st, st.sel)) st.sel = ops.length === 1 ? ops[0] : -1;
      if (typeof c === 'number' && open(st, c)) { st.sel = c; st.streak = 0; }
      const k = Math.floor(st.pt * 4); while (st.curve.length <= k) st.curve.push(ops.length);
      if ((pr[' '] || c === 'try') && st.sel >= 0 && st.lock <= 0) { const i = st.sel, m = mark(st.pt);
        if (Math.abs(m - st.zc[i]) <= width(st, i) / 2) { st.solved[i] = true; st.order.push(i); st.streak = 0; st.sel = -1; if (st.live) PLAY.beep(880, .15, .12); if (st.order.length === 6) { st.ph = 'done'; st.at = st.t; } }
        else { st.miss.push({ t: st.pt, b: ops.length, i }); st.lock = LOCK; st.streak++; if (st.live) PLAY.beep(200, .12, .12, 'sawtooth'); } }
    },
    // the scripted player aims near each lock with a fixed spread, and after two misses in a row moves to another open puzzle if there is one
    bot(st) { const out = { down: {}, press: {} };
      if (st.ph === 'wire') { if (st.pass === 0 && st.t > .8 && st.t < .9) out.click = 'chain'; if (st.t > 2.6) out.click = 'go'; return out; }
      if (st.ph !== 'play') return out; const ops = PZ.map((p, i) => i).filter(i => open(st, i));
      if (st.sel < 0) { out.click = ops[0]; return out; } if (st.streak >= 2 && ops.length > 1) { out.click = ops[(ops.indexOf(st.sel) + 1) % ops.length]; return out; }
      if (st.off == null) st.off = (st.R() - .5) * .3; if (st.lock <= 0 && Math.abs(mark(st.pt) - (st.zc[st.sel] + st.off)) < .025) { out.press[' '] = true; st.off = null; } return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const wire = st.ph === 'wire', ord = wire ? orders(st.E) : st.ord, br = wire ? PZ.filter((p, i) => !needs(st.E, i).length).length : breadth(st);
      GK.head(g, wire ? 'Wire the chart: click a puzzle, then the puzzle that waits on it' : st.ph === 'done' ? 'All six solved' : `Play it · ${br} thread${br === 1 ? '' : 's'} open`, FX, 32, 'left', C.ink, 16);
      GK.box(g, FX, FY, FW, 322, '#f6efdd', '#cdbf9f', 12, 1.5);
      st.E.forEach(([a, b]) => { const [x1, y1] = POS[a], [x2, y2] = POS[b], d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d, sx = x1 + ux * 44, sy = y1 + uy * 26, ex = x2 - ux * 48, ey = y2 - uy * 30, done = !wire && st.solved[a];
        g.strokeStyle = done ? C.good : '#6b7bbd'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(ex + ux * 10, ey + uy * 10); g.lineTo(ex - uy * 7, ey + ux * 7); g.lineTo(ex + uy * 7, ey - ux * 7); g.fill(); });
      PZ.forEach((p, i) => { const [x, y] = POS[i], sol = !wire && st.solved[i], op = !wire && open(st, i), sel = wire ? st.pick === i : st.sel === i;
        GK.box(g, x - 46, y - 24, 92, 48, sol ? '#dff3e3' : wire || op ? '#fffaf0' : '#e6dfcf', sel ? C.navy : sol ? C.good : wire || op ? '#8ea2e6' : '#b9ad92', 10, sel ? 3.5 : 2); ui.hit(i, x - 46, y - 24, 92, 48);
        GK.text(g, p.n, x, y - 1, sol || wire || op ? C.ink : '#8d846f', 14, 'center', 800); GK.text(g, sol ? 'solved' : p.hard ? 'narrow lock' : 'wide lock', x, y + 15, sol ? C.good : p.hard ? C.redDk : C.muted, 10, 'center', 700); });
      if (wire && st.msg && st.t - st.mt < 2.2) TD.label(st.msg, CX, FY + 304, 'center', '#fff', 12, 'rgba(183,28,28,.95)');
      const by = FY + 334;
      if (wire) { [['chain', 'One chain'], ['two', 'Two threads'], ['flat', 'No order']].forEach(([id, n], k) => ui.btn(id, n, FX + k * 132, by, 124, 36, { px: 12 })); ui.btn('go', 'Play this chart', FX + FW - 200, by, 200, 36, { px: 14, on: true }); GK.text(g, 'An arrow from A to B means B stays shut until A is solved. Click the same pair again to remove it.', FX, by + 60, C.muted, 11, 'left', 500); }
      else if (st.ph === 'play') { const i = st.sel;
        if (i < 0) GK.text(g, 'Click an open puzzle to work on it.', CX, by + 26, C.ink, 14, 'center', 700);
        else { const w = width(st, i), bx = FX + 20, bw = FW - 190, m = mark(st.pt); GK.text(g, `${PZ[i].n}: stop the marker in the gold zone`, bx, by, C.ink, 13, 'left', 800); GK.box(g, bx, by + 10, bw, 26, '#efe6d2', '#b9ad92', 8, 1.5); g.fillStyle = '#e2b93b'; g.fillRect(bx + bw * Math.max(0, st.zc[i] - w / 2), by + 11, bw * Math.min(w, 1), 24); g.fillStyle = st.lock > 0 ? '#b0a58c' : C.navy; g.fillRect(bx + bw * m - 3, by + 4, 6, 38);
          if (st.lock > 0) GK.text(g, 'missed: wait', bx + bw / 2, by + 58, C.redDk, 12, 'center', 700); ui.btn('try', 'Stop (Space)', FX + FW - 150, by + 4, 150, 38, { px: 13, on: st.lock <= 0 }); }
        GK.text(g, 'Each puzzle you solve widens every lock that is left by a quarter. You can switch to any open puzzle at any time.', FX, by + 84, C.muted, 11, 'left', 500); }
      else if (live) { ui.btn('replay', 'Rewire and play again', FX + 100, by, 220, 38, { px: 13, on: true }); ui.btn('again', 'Start over', FX + 340, by, 160, 38, { px: 13 }); }
      // right
      const RX = 690, RW = 326; GK.text(g, 'open threads through the playthrough', RX, 32, C.muted, 12, 'left', 700); GK.box(g, RX, 44, RW, 150, '#fffaf0', '#cdbf9f', 10, 1.5);
      const cw = RW - 44, ch = 100, x0 = RX + 30, y0 = 164, tot = Math.max(20, st.pt || 0); for (let v = 0; v <= 6; v += 2) { GK.text(g, String(v), x0 - 8, y0 - v / 6 * ch + 4, C.muted, 10, 'right', 600); g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0 - v / 6 * ch); g.lineTo(x0 + cw, y0 - v / 6 * ch); g.stroke(); }
      g.fillStyle = 'rgba(183,28,28,.10)'; g.fillRect(x0, y0 - ch / 6, cw, ch / 6); if (st.curve.length) { g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); st.curve.forEach((v, k) => { const x = x0 + (k / 4) / tot * cw, y = y0 - v / 6 * ch; if (k) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); }
      st.miss.forEach(m => { g.fillStyle = C.red; g.fillRect(x0 + m.t / tot * cw - 1, y0 - m.b / 6 * ch - 9, 2.5, 9); });
      GK.text(g, 'red ticks: misses · shaded: one thread only', RX + 30, 186, C.muted, 10, 'left', 600);
      GK.text(g, 'the story, in the order it arrived', RX, 216, C.muted, 12, 'left', 700); let inOrder = 0;
      for (let k = 0; k < 6; k++) { const y = 226 + k * 26, i = st.order[k]; GK.box(g, RX, y, RW, 22, '#fffaf0', '#e1d6bd', 6, 1); if (i == null) continue; const ok = k === 0 || i > st.order[k - 1]; if (k > 0 && ok) inOrder++; GK.text(g, `${i + 1}`, RX + 10, y + 16, ok ? C.good : C.redDk, 12, 'left', 800); GK.text(g, PZ[i].line, RX + 28, y + 16, C.ink, 11.5, 'left', 600); }
      const y1 = 400, one = st.miss.filter(m => m.b === 1).length; GK.text(g, `${ord} order${ord === 1 ? '' : 's'} a player could solve this chart in`, RX, y1, C.ink, 12.5, 'left', 800); GK.text(g, ord === 1 ? 'you control the whole reveal' : ord >= 200 ? 'the reveal order is the player’s, not yours' : 'you fix part of the reveal', RX, y1 + 18, C.muted, 11, 'left', 600);
      GK.text(g, `${st.miss.length} misses · ${one} of them with one thread open`, RX, y1 + 44, C.ink, 12.5, 'left', 800); GK.text(g, `${(st.miss.length * LOCK).toFixed(1)} s locked out · ${(st.pt || 0).toFixed(0)} s played`, RX, y1 + 62, C.muted, 11, 'left', 600);
      if (st.first) GK.text(g, `first chart: 1 order · ${st.first.miss} misses, ${st.first.one} with one thread · ${st.first.time.toFixed(0)} s`, RX, y1 + 88, C.muted, 11, 'left', 700);
      ui.stats(`<div><b>${ord}</b><span>possible solve orders</span></div><div class="r"><b>${one}</b><span>misses with one thread open</span></div><div class="g"><b>${st.order.length > 1 ? inOrder + ' of ' + (st.order.length - 1) : '0'}</b><span>beats in story order</span></div>`);
      const who = live ? 'You' : 'The script';
      if (wire) ui.out(live ? `This chart starts with ${br} puzzle${br === 1 ? '' : 's'} open and can be solved in ${ord} order${ord === 1 ? '' : 's'}. Cellar and Dog have narrow locks.` : 'A scripted player works a single chain first, then a chart with two threads. It moves to another open puzzle after two misses in a row.');
      else if (st.ph === 'play') ui.out(`${br} open now. ${one} of ${st.miss.length} misses came with nowhere else to go.`);
      else ui.out(`${who} solved it in ${st.pt.toFixed(0)} s with ${st.miss.length} misses, ${one} of them while one thread was open. The story beats followed on ${inOrder} of 5 times, and this chart allows ${ord} order${ord === 1 ? '' : 's'}. ` + (ord === 1 ? 'A chain keeps the story whole and leaves a stuck player nothing else to try.' : ord >= 200 ? 'With no order there is always something else to try, and the story arrives however the player wanders.' : one === 0 ? 'Every miss had another thread to turn to, and part of the order held.' : 'Some misses still came with one thread open: look at where the chart narrows.') + (st.first ? ` The single chain took ${st.first.time.toFixed(0)} s with ${st.first.one} one-thread misses.` : ''));
    },
  });
})();
