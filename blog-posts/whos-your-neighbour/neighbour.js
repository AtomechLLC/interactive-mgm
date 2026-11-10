/* Who's Your Neighbour? (replanned page for "Shared World or Instance"; Scripture: Incentive Alignment, Co-op Definition and
   Value, Designing Out Toxicity). The learner mines ore in a field with six scripted miners under three sharing rules.
   The page records their own ore, the times a node was taken from under them, and the nodes they mined alongside someone.
   The coin figure splits a fixed 700 coins of demand over all ore mined, a formula stated on the page. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, FX = 24, FY = 56, FW = 640, FH = 410, SP = 135, MINE = 1.6, RESPAWN = 7, RANGE = 26, DEMAND = 700;
  const NODES = [[90, 80], [300, 60], [540, 90], [170, 220], [420, 200], [80, 340], [320, 350], [560, 330]].map(([x, y]) => ({ x: FX + x, y: FY + y }));
  const RULES = [{ id: 'first', n: 'First come', tip: 'Whoever finishes a node gets the ore. Everyone else at it gets nothing.' }, { id: 'personal', n: 'Personal nodes', tip: 'Every miner has a private copy of each node. Nobody can take yours or help with it.' }, { id: 'shared', n: 'Shared credit', tip: 'Everyone who worked a node gets ore, and more picks break it faster.' }];
  const COLS = ['#c0398b', '#e67e22', '#17a2a2', '#8e5bd0', '#b0562c', '#6b8e23'], saved = {}; let API = null;
  function start(st, ri, dur) { const R = st.R; st.ri = ri; st.q = { t: 0, dur, ore: 0, blocked: 0, along: 0, total: 0, nodes: NODES.map(() => ({ down: 0, prog: 0, who: {}, mine: Array(7).fill(0), pdown: Array(7).fill(0) })), P: Array.from({ length: 7 }, (_, i) => ({ x: FX + 60 + R() * (FW - 120), y: FY + 60 + R() * (FH - 120), ore: 0, tg: -1, me: i === 0 })), pops: [] }; st.ph = 'go'; }
  const avail = (q, id, n, pi) => id === 'personal' ? q.nodes[n].pdown[pi] <= 0 : q.nodes[n].down <= 0;
  function pick(q, id, pi) { const p = q.P[pi]; let best = -1, bd = 1e9; NODES.forEach((nd, n) => { if (!avail(q, id, n, pi)) return; let d = Math.hypot(nd.x - p.x, nd.y - p.y); if (id === 'shared' && Object.keys(q.nodes[n].who).length) d -= 90; if (d < bd) { bd = d; best = n; } }); return best; }
  PLAY.game('neighbour', {
    dur: 46, keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'],
    opts: s => ({ ri: +(s.querySelector('.seg .on')?.dataset.v || 0) }),
    setup(s, api) { API = api; s.querySelectorAll('.seg button').forEach(b => b.onclick = () => { s.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { const st = { live, R: live ? Math.random : GK.rng(31), t: 0, rows: {}, ph: 'go' }; start(st, live ? o.ri : 0, live ? 45 : 13.5); if (live) st.ph = 'ready'; return st; },
    step(st, inp, dt) {
      st.t += dt; const q = st.q, id = RULES[st.ri].id, d = inp.down || {};
      if (st.ph === 'ready') { if (inp.click || Object.keys(d).length) st.ph = 'go'; else return; }
      if (st.ph === 'done') { if (st.live && inp.click === 'again') API.start(); if (!st.live && st.ri < 2 && st.t - st.at > 1.6) start(st, st.ri + 1, 13.5); return; }
      q.t += dt;
      q.nodes.forEach(nd => { if (nd.down > 0) nd.down -= dt; nd.pdown = nd.pdown.map(v => Math.max(0, v - dt)); nd.who = {}; });
      q.P.forEach((p, pi) => {
        let vx = 0, vy = 0;
        if (p.me && st.live) { vx = (d.ArrowRight || d.d ? 1 : 0) - (d.ArrowLeft || d.a ? 1 : 0); vy = (d.ArrowDown || d.s ? 1 : 0) - (d.ArrowUp || d.w ? 1 : 0); }
        else { if (p.tg < 0 || !avail(q, id, p.tg, pi)) p.tg = pick(q, id, pi); if (p.tg >= 0) { const nd = NODES[p.tg], dx = nd.x - p.x, dy = nd.y - p.y, dd = Math.hypot(dx, dy); if (dd > RANGE - 8) { vx = dx / dd; vy = dy / dd; } } }
        const m = Math.hypot(vx, vy) || 1; p.x = clamp(p.x + vx / m * SP * (p.me ? 1 : .9) * dt, FX + 10, FX + FW - 10); p.y = clamp(p.y + vy / m * SP * (p.me ? 1 : .9) * dt, FY + 10, FY + FH - 10);
        p.at = NODES.findIndex((nd, n) => Math.hypot(nd.x - p.x, nd.y - p.y) < RANGE && avail(q, id, n, pi)); if (p.at >= 0) q.nodes[p.at].who[pi] = true;
      });
      q.nodes.forEach((nd, n) => {
        const who = Object.keys(nd.who).map(Number);
        if (id === 'shared') { nd.prog += who.length * dt / MINE; who.forEach(pi => nd.mine[pi] += dt / MINE); if (nd.prog >= 1) { const got = nd.mine.map((v, pi) => v >= .15 ? pi : -1).filter(v => v >= 0); got.forEach(pi => { q.P[pi].ore++; q.total++; }); if (got.includes(0)) { q.ore++; if (got.length > 1) q.along++; if (st.live) PLAY.beep(900, .1, .12); } q.pops.push({ n, t: q.t, txt: got.length > 1 ? `+1 each (${got.length})` : '+1', me: got.includes(0) }); nd.prog = 0; nd.mine = Array(7).fill(0); nd.down = RESPAWN; } }
        else { who.forEach(pi => nd.mine[pi] += dt / MINE); const fin = who.find(pi => nd.mine[pi] >= 1);
          if (fin != null) { q.P[fin].ore++; q.total++; if (fin === 0) { q.ore++; if (st.live) PLAY.beep(900, .1, .12); }
            if (id === 'first') { if (fin !== 0 && (nd.mine[0] > .1 || Math.hypot(NODES[n].x - q.P[0].x, NODES[n].y - q.P[0].y) < 60)) { q.blocked++; q.pops.push({ n, t: q.t, txt: 'taken', bad: true, me: true }); if (st.live) PLAY.beep(160, .15, .14, 'sawtooth'); } else q.pops.push({ n, t: q.t, txt: '+1', me: fin === 0 }); nd.mine = Array(7).fill(0); nd.down = RESPAWN; }
            else { nd.mine[fin] = 0; nd.pdown[fin] = RESPAWN; if (fin === 0) q.pops.push({ n, t: q.t, txt: '+1', me: true }); } } }
      });
      q.pops = q.pops.filter(p => q.t - p.t < 1.2);
      if (q.t >= q.dur) { st.ph = 'done'; st.at = st.t; const row = { ore: q.ore, blocked: q.blocked, along: q.along, total: q.total, coins: q.total ? q.ore * DEMAND / q.total : 0, each: q.total ? DEMAND / q.total : 0 }; st.rows[st.ri] = row; if (st.live) saved[st.ri] = row; }
    },
    bot() { return null; },
    draw(g, st, ui, live) {
      GK.panel(g); const q = st.q, rule = RULES[st.ri], id = rule.id;
      GK.head(g, `${rule.n} · ${Math.max(0, q.dur - q.t).toFixed(0)} s left`, FX, 32, 'left', C.ink, 17); GK.text(g, rule.tip, FX + 210, 32, C.muted, 12, 'left', 600);
      g.save(); g.beginPath(); g.roundRect(FX, FY, FW, FH, 12); g.clip(); g.fillStyle = '#b9b08f'; g.fillRect(FX, FY, FW, FH); g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 40; i++) g.fillRect(FX + (i * 137) % FW, FY + (i * 71) % FH, 26, 6);
      NODES.forEach((nd, n) => { const s = q.nodes[n], up = avail(q, id, n, 0), pr = id === 'shared' ? s.prog : s.mine[0];
        g.fillStyle = up ? '#6d6f7c' : '#a39b85'; g.beginPath(); g.moveTo(nd.x - 22, nd.y + 14); g.lineTo(nd.x - 12, nd.y - 14); g.lineTo(nd.x + 8, nd.y - 18); g.lineTo(nd.x + 22, nd.y + 2); g.lineTo(nd.x + 16, nd.y + 14); g.fill();
        if (up) { g.fillStyle = '#ffd23f'; [[-6, -4], [6, 2], [-2, 8]].forEach(([a, b]) => { g.beginPath(); g.arc(nd.x + a, nd.y + b, 3.5, 0, TAU); g.fill(); }); if (pr > 0) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(nd.x, nd.y, 30, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(pr)); g.stroke(); } }
        else GK.text(g, `${(id === 'personal' ? s.pdown[0] : s.down).toFixed(0)} s`, nd.x, nd.y + 34, '#6b644f', 11, 'center', 700); });
      q.P.forEach((p, i) => { if (p.me) return; g.globalAlpha = id === 'personal' ? .35 : 1; g.fillStyle = COLS[i - 1]; g.beginPath(); g.arc(p.x, p.y, 9, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1; });
      const me = q.P[0]; TD.shadow(me.x, me.y + 12, 12, 4); TD.player(me.x, me.y, 0, .85);
      q.pops.forEach(p => { const nd = NODES[p.n]; if (p.me || id !== 'personal') TD.label(p.txt, nd.x, nd.y - 34 - (q.t - p.t) * 16, 'center', '#fff', 12, p.bad ? 'rgba(183,28,28,.95)' : p.me ? 'rgba(47,174,99,.95)' : 'rgba(80,80,90,.8)'); });
      g.restore();
      if (st.ph === 'ready') TD.stamp('Arrow keys or WASD: walk onto ore to mine', FX + FW / 2, FY + 40, C.navy, 1, 18);
      if (id === 'personal') GK.text(g, 'the faded miners are in their own copies of the field', FX + FW - 10, FY + FH - 10, '#5a533f', 11, 'right', 700);
      if (st.ph === 'done' && live) ui.btn('again', 'Mine this rule again', FX + FW / 2 - 110, FY + FH / 2 - 20, 220, 40, { px: 14, on: true });
      GK.text(g, `Coins: ${DEMAND} coins of demand are split over all the ore everyone mined, so more ore means less per piece.`, FX, FY + FH + 26, C.muted, 11, 'left', 500);
      GK.text(g, 'Stand on a node to mine it. The white ring is your progress. A broken node comes back after 7 s.', FX, FY + FH + 46, C.muted, 11, 'left', 500);
      // table
      const RX = 690, RW = 326, store = live ? saved : st.rows; GK.text(g, 'one run per rule', RX, 32, C.muted, 12, 'left', 700);
      RULES.forEach((r, k) => { const y = 46 + k * 172, row = k === st.ri && st.ph !== 'done' ? { ore: q.ore, blocked: q.blocked, along: q.along, total: q.total, cur: true } : store[k]; GK.box(g, RX, y, RW, 160, k === st.ri ? '#fff6dd' : '#fffaf0', k === st.ri ? C.navy : '#cdbf9f', 10, k === st.ri ? 2.5 : 1.5); GK.text(g, r.n, RX + 14, y + 24, C.ink, 14, 'left', 800);
        if (!row) { GK.text(g, 'not played yet', RX + RW / 2, y + 90, C.muted, 12, 'center', 600); return; }
        [['your ore', row.ore, C.navy], ['taken from you', row.blocked, C.redDk], ['mined alongside', row.along, C.good]].forEach(([l, v, col], i) => { GK.text(g, String(v), RX + 14 + i * 104, y + 66, col, 24, 'left', 800); GK.text(g, l, RX + 14 + i * 104, y + 84, C.muted, 11, 'left', 600); });
        GK.text(g, `all seven miners: ${row.total} ore`, RX + 14, y + 116, C.ink, 12, 'left', 700); if (!row.cur) GK.text(g, `${row.each.toFixed(1)} coins a piece · you earned ${Math.round(row.coins)}`, RX + 14, y + 138, C.ink, 12, 'left', 700); });
      ui.stats(`<div><b>${q.ore}</b><span>your ore</span></div><div class="r"><b>${q.blocked}</b><span>nodes taken from under you</span></div><div class="g"><b>${q.along}</b><span>mined alongside someone</span></div>`);
      const done = [0, 1, 2].filter(k => store[k]), who = live ? 'You' : 'The script';
      if (st.ph !== 'done' || done.length < 2) { ui.out(st.ph === 'done' ? `${who} mined ${st.rows[st.ri].ore} ore under “${rule.n.toLowerCase()}”. ${live ? 'Pick another rule above to compare.' : ''}` : (live ? rule.tip : 'The same field and the same six scripted miners under each rule in turn. The blue miner is a script here too.')); return; }
      const f = store[0], p = store[1], s = store[2];
      ui.out((f && f.blocked ? 'Under first come the other miners cost you ore, so they are rivals. ' : '') + (p ? 'With personal nodes they cost and gave you nothing: they are scenery. ' : '') + (s ? (s.along ? `With shared credit ${s.along} of your ore came with help, and the field produced ${s.total} ore${f ? ` against ${f.total}` : ''}, which is what pushes the price down. ` : 'With shared credit you mined alone this time, so the rule had nothing to act on. ') : '') + 'The sharing rule decides what the person next to you is.');
    },
  });
})();
