/* Twelve Units (replanned page for "One Pair of Eyes"; Scripture: Working Memory Limits, Decision-Making and Processing
   Skills, Complementary vs Supplementary Skills). The learner plays the same 40-second skirmish under two interface
   rulesets. Old rules: a selection holds four units (standing in for twelve at this scale), new workers stand idle
   until sent to mine, and the base queues one unit at a time. New rules: no selection cap, workers mine by
   themselves, a five-deep queue and a select-army key; and the opponent, who gets the same help, sends 40% more.
   The page records the learner's own actions per minute, idle production seconds and outcome. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, FX = 24, FY = 56, FW = 640, FH = 410, RUN = 40, BASE = [FX + 70, FY + 215], PATCH = [FX + 150, FY + 70], CAMP = [FX + 575, FY + 215], COSTW = 50, COSTS = 75, BUILD = 2, INCOME = 5;
  const RULE = [{ n: 'Old rules', cap: 4, auto: false, q: 1, waves: [2, 3, 5] }, { n: 'New rules', cap: 99, auto: true, q: 5, waves: [3, 4, 7] }], WT = [13, 25, 35];
  const saved = {}; let API = null, UID = 1;
  const U = (side, kind, x, y) => ({ id: UID++, side, kind, x, y, hp: kind === 'w' ? 20 : 40, tx: x, ty: y, state: 'idle', cd: 0 });
  function begin(st, ri) { st.ri = ri; st.rule = RULE[ri]; st.q = 0; st.min = 50; st.units = [0, 1, 2].map(k => Object.assign(U(0, 'w', PATCH[0] - 20 + k * 20, PATCH[1] + 26), { state: 'mine' })).concat([0, 1].map(k => U(1, 'r', CAMP[0] - 40, CAMP[1] - 30 + k * 60)));
    st.base = 300; st.camp = 300; st.queue = []; st.prog = 0; st.sel = []; st.acts = 0; st.idleProd = 0; st.idleWork = 0; st.wave = 0; st.built = 0; st.lost = 0; st.drag0 = null; st.wasDrag = false; st.ph = st.live ? 'ready' : 'go'; st.bt = 0; st.plan = null; st.fx = []; }
  const mine = st => st.units.filter(u => u.side === 0), army = st => st.units.filter(u => u.side === 0 && u.kind === 's');
  function act(st, cmd) { st.acts++; const r = st.rule;
    if (cmd.build) { const cost = cmd.build === 'w' ? COSTW : COSTS; if (st.queue.length < r.q && st.min >= cost) { st.min -= cost; st.queue.push(cmd.build); } else st.acts--; }
    if (cmd.sel) st.sel = cmd.sel.slice(0, r.cap);
    if (cmd.army && r.cap > 4) st.sel = army(st).map(u => u.id);
    if (cmd.go) { const [x, y] = cmd.go, onPatch = Math.hypot(x - PATCH[0], y - PATCH[1]) < 40; st.units.forEach(u => { if (!st.sel.includes(u.id)) return; if (u.kind === 'w') { if (onPatch) u.state = 'mine'; else { u.state = 'move'; u.tx = x; u.ty = y; } } else { u.state = 'move'; u.tx = x + (st.R() - .5) * 30; u.ty = y + (st.R() - .5) * 30; } }); st.fx.push({ x, y, t: 0 }); } }
  function finish(st) { st.ph = 'done'; st.at = st.t; const row = { apm: st.acts / (st.q / 60), idleProd: st.idleProd, idleWork: st.idleWork, built: st.built, lost: st.lost, base: Math.max(0, st.base), camp: 1 - Math.max(0, st.camp) / 300, out: st.base <= 0 ? 'base lost' : st.camp <= 0 ? 'camp destroyed' : 'held' }; st.rows[st.ri] = row; if (st.live) saved[st.ri] = row; }
  PLAY.game('twelve', {
    dur: 88, keys: ['q', 'w', 'e'],
    opts: s => ({ ri: +(s.querySelector('.seg .on')?.dataset.v || 0) }),
    setup(s, api) { API = api; s.querySelectorAll('.seg button').forEach(b => b.onclick = () => { s.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { const st = { live, t: 0, R: GK.rng(live ? 1 + Math.floor(Math.random() * 9999) : 8), rows: {}, pass: 0 }; begin(st, live ? o.ri : 0); return st; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, pr = inp.press || {}, r = st.rule;
      if (st.ph === 'ready') { if (c || Object.keys(pr).length) st.ph = 'go'; else return; }
      if (st.ph === 'done') { if (st.live && c === 'again') API.start(); if (!st.live && st.pass === 0 && st.t - st.at > 2.5) { st.pass = 1; begin(st, 1); } return; }
      // input
      if (pr.q || c === 'bw') act(st, { build: 'w' }); if (pr.w || c === 'bs') act(st, { build: 's' }); if ((pr.e || c === 'all') && r.cap > 4) act(st, { army: true });
      if (inp.cmds) inp.cmds.forEach(cm => act(st, cm));
      if (st.live && inp.mouse) { st.mouse = inp.mouse; const [mx, my] = inp.mouse, inField = mx >= FX && mx <= FX + FW && my >= FY && my <= FY + FH; if (c === '_canvas' && inField) { st.drag0 = [mx, my]; st.wasDrag = true; }
        if (st.wasDrag && !inp.drag && st.drag0) { const [x0, y0] = st.drag0; st.wasDrag = false; st.drag0 = null;
          if (Math.hypot(mx - x0, my - y0) > 10) { const ids = mine(st).filter(u => u.x >= Math.min(x0, mx) && u.x <= Math.max(x0, mx) && u.y >= Math.min(y0, my) && u.y <= Math.max(y0, my)); const sold = ids.filter(u => u.kind === 's'); act(st, { sel: (sold.length ? sold : ids).map(u => u.id) }); if ((sold.length ? sold : ids).length > r.cap) { st.capMsg = st.t; } }
          else { const hit = mine(st).find(u => Math.hypot(u.x - x0, u.y - y0) < 13); if (hit) act(st, { sel: [hit.id] }); else if (st.sel.length) act(st, { go: [x0, y0] }); } } }
      // world
      st.q += dt; st.fx.forEach(f => f.t += dt); st.fx = st.fx.filter(f => f.t < .5);
      const miners = st.units.filter(u => u.side === 0 && u.kind === 'w' && u.state === 'mine'); st.min += miners.length * INCOME * dt; st.idleWork += st.units.filter(u => u.side === 0 && u.kind === 'w' && u.state === 'idle').length * dt;
      if (st.queue.length) { st.prog += dt; if (st.prog >= BUILD) { st.prog = 0; const k = st.queue.shift(), u = U(0, k, BASE[0] + 34 + st.R() * 20, BASE[1] - 30 + st.R() * 60); if (k === 'w' && r.auto) u.state = 'mine'; if (k === 's') st.built++; st.units.push(u); } } else if (st.min >= COSTS) st.idleProd += dt;
      if (st.wave < 3 && st.q >= WT[st.wave]) { for (let k = 0; k < r.waves[st.wave]; k++) st.units.push(Object.assign(U(1, 'r', CAMP[0] - 30, CAMP[1] - 60 + st.R() * 120), { raid: true })); st.wave++; if (st.live) PLAY.beep(220, .2, .1, 'sawtooth'); }
      st.units.forEach(u => { u.cd -= dt; const foes = st.units.filter(o => o.side !== u.side && o.hp > 0); let tg = null, bd = 1e9; if (u.kind !== 'w') foes.forEach(o => { const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < bd && d < (u.raid ? 110 : 85) && (u.side === 0 || o.kind !== 'w' || d < 40)) { bd = d; tg = o; } });
        let gx = null, gy = null;
        if (u.kind === 'w') { if (u.state === 'mine') { const ph = (st.q * .7 + u.id * .37) % 2, f = ph < 1 ? ph : 2 - ph; u.x += ((PATCH[0] + (BASE[0] - PATCH[0]) * f + (u.id % 3 - 1) * 10) - u.x) * Math.min(1, dt * 4); u.y += ((PATCH[1] + (BASE[1] - PATCH[1]) * f) - u.y) * Math.min(1, dt * 4); } else if (u.state === 'move') { gx = u.tx; gy = u.ty; } }
        else if (tg) { if (bd > 26) { gx = tg.x; gy = tg.y; } else if (u.cd <= 0) { u.cd = .5; tg.hp -= 7; } }
        else if (u.side === 1) { if (u.raid) { const d = Math.hypot(BASE[0] - u.x, BASE[1] - u.y); if (d > 42) { gx = BASE[0]; gy = BASE[1]; } else if (u.cd <= 0) { u.cd = .5; st.base -= 6; } } }
        else { const dc = Math.hypot(CAMP[0] - u.x, CAMP[1] - u.y); if (u.state === 'move') { gx = u.tx; gy = u.ty; } if (dc < 46) { gx = null; if (u.cd <= 0) { u.cd = .5; st.camp -= 7; } } }
        if (gx != null) { const dx = gx - u.x, dy = gy - u.y, d = Math.hypot(dx, dy); if (d < 4) { if (u.state === 'move') u.state = 'idle'; } else { const sp = u.kind === 'w' ? 70 : 78; u.x += dx / d * sp * dt; u.y += dy / d * sp * dt; } } });
      const before = mine(st).length; st.units = st.units.filter(u => u.hp > 0); st.lost += before - mine(st).length; st.sel = st.sel.filter(id => st.units.some(u => u.id === id));
      if (st.q >= RUN || st.base <= 0 || st.camp <= 0) finish(st);
    },
    // the scripted player issues one command every 0.9 seconds at most, under either ruleset: the same hands, a different interface
    bot(st) { const out = { down: {}, press: {}, cmds: [] }; if (st.ph !== 'go') return out; st.bt += PLAY.DT; if (st.bt < .9) return out; const r = st.rule, push = cm => { out.cmds.push(cm); st.bt = 0; };
      if (st.plan && st.plan.length) { push(st.plan.shift()); return out; }
      const idle = st.units.find(u => u.side === 0 && u.kind === 'w' && u.state === 'idle'); if (idle) { st.plan = [{ go: PATCH }]; push({ sel: [idle.id] }); return out; }
      const workers = st.units.filter(u => u.side === 0 && u.kind === 'w').length; if (st.queue.length < r.q) { const k = workers < 5 ? 'w' : 's', cost = k === 'w' ? COSTW : COSTS; if (st.min >= cost) { push({ build: k }); return out; } }
      const A = army(st), raid = st.units.some(u => u.raid && Math.hypot(u.x - BASE[0], u.y - BASE[1]) < 260), home = A.filter(u => Math.hypot(u.x - BASE[0], u.y - BASE[1]) < 140 && u.state === 'idle');
      if (!raid && home.length >= 3 && st.q > 8) { if (r.cap > 4) { st.plan = [{ go: CAMP }]; push({ army: true }); } else { st.plan = [{ go: CAMP }]; push({ sel: home.slice(0, 4).map(u => u.id) }); } return out; }
      return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const r = st.rule;
      GK.head(g, `${r.n} · ${Math.max(0, RUN - st.q).toFixed(0)} s`, FX, 32, 'left', C.ink, 17); GK.text(g, `minerals ${Math.floor(st.min)}`, FX + 250, 32, C.ink, 14, 'left', 800); GK.text(g, `selected ${st.sel.length}${r.cap < 99 ? ' of ' + r.cap + ' max' : ''}`, FX + FW, 32, st.capMsg && st.t - st.capMsg < 1.2 ? C.redDk : C.ink, 13, 'right', 800);
      g.save(); g.beginPath(); g.roundRect(FX, FY, FW, FH, 12); g.clip(); g.fillStyle = '#9db87a'; g.fillRect(FX, FY, FW, FH); g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 40; i++) g.fillRect(FX + (i * 137) % FW, FY + (i * 71) % FH, 22, 5);
      g.fillStyle = '#3f7fd0'; g.fillRect(BASE[0] - 26, BASE[1] - 26, 52, 52); g.strokeStyle = '#1d3d73'; g.lineWidth = 3; g.strokeRect(BASE[0] - 26, BASE[1] - 26, 52, 52); PLAY.bar(g, BASE[0] - 30, BASE[1] - 40, 60, 6, st.base / 300, C.good, 'rgba(0,0,0,.35)');
      g.fillStyle = '#b23b3b'; g.fillRect(CAMP[0] - 26, CAMP[1] - 26, 52, 52); g.strokeStyle = '#5e1d1d'; g.strokeRect(CAMP[0] - 26, CAMP[1] - 26, 52, 52); PLAY.bar(g, CAMP[0] - 30, CAMP[1] - 40, 60, 6, st.camp / 300, C.red, 'rgba(0,0,0,.35)');
      [[-14, 0], [6, -8], [16, 8], [-2, 12]].forEach(([a, b]) => { g.fillStyle = '#6fe3f2'; g.beginPath(); g.moveTo(PATCH[0] + a, PATCH[1] + b - 12); g.lineTo(PATCH[0] + a + 8, PATCH[1] + b); g.lineTo(PATCH[0] + a, PATCH[1] + b + 8); g.lineTo(PATCH[0] + a - 8, PATCH[1] + b); g.fill(); }); GK.text(g, 'minerals', PATCH[0], PATCH[1] - 22, '#24525a', 10, 'center', 800);
      st.units.forEach(u => { const sel = st.sel.includes(u.id); if (sel) { g.strokeStyle = '#7CFC00'; g.lineWidth = 2.5; g.beginPath(); g.arc(u.x, u.y, u.kind === 'w' ? 10 : 13, 0, TAU); g.stroke(); }
        g.fillStyle = u.side ? '#c0392b' : u.kind === 'w' ? '#f2c94c' : '#2b5fc2'; g.beginPath(); g.arc(u.x, u.y, u.kind === 'w' ? 6 : 9, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.5; g.stroke(); if (u.side === 0 && u.kind === 'w' && u.state === 'idle') GK.text(g, 'idle', u.x, u.y - 11, C.redDk, 10, 'center', 800); });
      st.fx.forEach(f => { g.strokeStyle = `rgba(124,252,0,${1 - f.t * 2})`; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, 6 + f.t * 30, 0, TAU); g.stroke(); });
      if (st.live && st.wasDrag && st.drag0 && st.mouse) { const [x0, y0] = st.drag0, [mx, my] = st.mouse; g.strokeStyle = '#7CFC00'; g.lineWidth = 1.5; g.strokeRect(x0, y0, mx - x0, my - y0); g.fillStyle = 'rgba(124,252,0,.12)'; g.fillRect(x0, y0, mx - x0, my - y0); }
      g.restore();
      const qy = FY + FH - 40; ui.btn('bw', `Q · worker ${COSTW}`, FX + 8, qy, 126, 30, { px: 11.5, on: st.min >= COSTW && st.queue.length < r.q }); ui.btn('bs', `W · soldier ${COSTS}`, FX + 140, qy, 132, 30, { px: 11.5, on: st.min >= COSTS && st.queue.length < r.q }); if (r.cap > 4) ui.btn('all', 'E · whole army', FX + 278, qy, 116, 30, { px: 11.5 });
      for (let k = 0; k < r.q; k++) { const x = FX + 410 + k * 28; GK.box(g, x, qy + 3, 24, 24, st.queue[k] ? (st.queue[k] === 'w' ? '#f2c94c' : '#2b5fc2') : 'rgba(255,255,255,.5)', '#555', 4, 1.5); } if (st.queue.length) PLAY.bar(g, FX + 410, qy - 6, r.q * 28 - 4, 5, st.prog / BUILD, C.navy, 'rgba(0,0,0,.25)');
      if (st.ph === 'ready') TD.stamp('Drag a box to select · click ground to send · Q and W build', FX + FW / 2, FY + 46, C.navy, 1, 16);
      if (st.units.some(u => u.raid) && st.ph === 'go') TD.label('raid incoming', FX + FW / 2, FY + 18, 'center', '#fff', 12, 'rgba(183,28,28,.95)');
      if (st.ph === 'done') { const row = st.rows[st.ri]; TD.stamp(row.out === 'base lost' ? 'Base lost' : row.out === 'camp destroyed' ? 'Camp destroyed' : `Held · camp ${PLAY.pct(row.camp)} down`, FX + FW / 2, FY + 150, row.out === 'base lost' ? C.redDk : C.good, 1, 24); if (live) ui.btn('again', 'Play these rules again', FX + FW / 2 - 110, FY + 190, 220, 40, { px: 14, on: true }); }
      GK.text(g, r.auto ? 'New workers mine by themselves. Raids arrive at 13, 25 and 35 seconds, 40% larger: the opponent has the same interface.' : 'A new worker stands idle until you select it and click the minerals. A selection holds four. Raids arrive at 13, 25 and 35 seconds.', FX, FY + FH + 26, C.muted, 10.5, 'left', 500);
      const RX = 690, RW = 326, store = live ? saved : st.rows; GK.text(g, 'the same skirmish under each ruleset', RX, 32, C.muted, 12, 'left', 700);
      RULE.forEach((ru, k) => { const y = 44 + k * 200, cur = k === st.ri, row = cur && st.ph !== 'done' ? { apm: st.q > 1 ? st.acts / (st.q / 60) : 0, idleProd: st.idleProd, idleWork: st.idleWork, built: st.built, lost: st.lost, live: true } : (store[k] || (cur ? st.rows[k] : null)); GK.box(g, RX, y, RW, 190, cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : '#cdbf9f', 10, cur ? 2.5 : 1.5); GK.text(g, ru.n, RX + 14, y + 24, C.ink, 14, 'left', 800); GK.text(g, ru.auto ? 'no cap · auto-mine · queue of 5' : 'cap of 4 · manual mining · queue of 1', RX + RW - 14, y + 24, C.muted, 10.5, 'right', 600);
        if (!row) { GK.text(g, 'not played yet', RX + RW / 2, y + 100, C.muted, 12, 'center', 600); return; }
        [[Math.round(row.apm), 'actions a minute', C.navy], [row.idleProd.toFixed(0) + ' s', 'base idle, rich', C.redDk], [row.idleWork.toFixed(0) + ' s', 'workers idle', C.redDk]].forEach(([v, l, col], i) => { GK.text(g, String(v), RX + 14 + [0, 110, 220][i], y + 68, col, 22, 'left', 800); GK.text(g, l, RX + 14 + [0, 110, 220][i], y + 86, C.muted, 10.5, 'left', 600); });
        GK.text(g, `${row.built} soldiers built · ${row.lost} units lost`, RX + 14, y + 116, C.ink, 12, 'left', 700); if (row.out) { GK.text(g, row.out === 'held' ? `base held with ${Math.round(row.base)} of 300` : row.out, RX + 14, y + 140, row.out === 'base lost' ? C.redDk : C.good, 13, 'left', 800); GK.text(g, `enemy camp ${PLAY.pct(row.camp)} destroyed`, RX + 14, y + 162, C.ink, 12, 'left', 700); } });
      ui.stats(`<div><b>${st.q > 1 ? Math.round(st.acts / (st.q / 60)) : 0}</b><span>actions a minute</span></div><div class="r"><b>${st.idleProd.toFixed(0)} s</b><span>base idle with money to spend</span></div><div class="g"><b>${st.built}</b><span>soldiers built</span></div>`);
      const who = live ? 'You' : 'The script', a = store[0], b = store[1];
      if (st.ph !== 'done') { ui.out(live ? (r.auto ? 'The interface does the housekeeping. What is left is where to send the army, and when.' : 'Every worker needs two clicks and every four soldiers need their own order.') : 'A scripted player limited to one command every 0.9 seconds plays both rulesets with the same hands.'); return; }
      if (!a || !b) { const row = store[st.ri] || st.rows[st.ri]; ui.out(`${who} made ${Math.round(row.apm)} actions a minute, left the base idle for ${row.idleProd.toFixed(0)} s with money in hand and ${row.out === 'base lost' ? 'lost the base' : `held the base, with the enemy camp ${PLAY.pct(row.camp)} down`}. ${live ? 'Play the other ruleset to compare.' : ''}`); return; }
      ui.out(`Old rules: ${Math.round(a.apm)} actions a minute, base idle ${a.idleProd.toFixed(0)} s, workers idle ${a.idleWork.toFixed(0)} worker-seconds, ${a.built} soldiers, ${a.out === 'base lost' ? 'base lost' : 'camp ' + PLAY.pct(a.camp) + ' down'}. New rules: ${Math.round(b.apm)}, ${b.idleProd.toFixed(0)} s, ${b.built} soldiers, ${b.out === 'base lost' ? 'base lost' : 'camp ' + PLAY.pct(b.camp) + ' down'}. ` + (b.built > a.built ? 'The new interface turned the same hands into a bigger army. ' : b.apm < a.apm - 2 ? 'The new interface produced the same army with fewer actions, so what it saved is attention, not soldiers. ' : 'The new interface changed little in this run. ') + (b.out === 'base lost' || b.camp <= a.camp ? 'The larger raids absorbed it: the difficulty moved from the clicks to the choices.' : 'This time that was enough to do more damage as well.'));
    },
  });
})();
