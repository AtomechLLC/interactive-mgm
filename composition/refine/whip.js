/* Siphoning Strike: skill shot with a recast cost (MGM C4 M7, deck slides 113, 124, 129).
   113: "a heavy whip attack and hard to land… If you miss, you get nothing, however if you hit, you can deal heavy damage and
   heal yourself." 124: the whip "stretches using IK to wrap around the target, causing a great surge down the whip if the
   target is electrified." 129: players miss the tight skill shot, so "recast the ability quickly, but make it drain more
   resources each time you repeat it." Aim and lash at a Lightning Mage that keeps moving; the two balance modes share one
   simulation, replayed from the list of presses so the canvas stays a function of time. Numbers are illustrative. */
(function () {
  const { $$ } = FPF.kit;
  const { icon, text, wrap, card, chip, TONE, panel, scene, pointer, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C;
  const PX = 110, PY = 300, MX = 600, REACH = 560, WIND = .3, REGEN = 6, STREAK = 2.5, MAGE_COL = '#5562eb';
  const MODES = [
    { name: 'One cast, long cooldown', cd: 4, cost: () => 25, rule: '25 mana, 4 s cooldown' },
    { name: 'Fast recast, rising cost', cd: .7, cost: n => 10 * (n + 1), rule: '10 mana, +10 per quick repeat' },
  ];
  const MY = t => 300 + 175 * Math.sin(t * 1.25);
  const charge = (t, lastDrain) => Math.min(100, (t - lastDrain) * 15);
  const aimAt = (t, dy = 0) => Math.atan2(MY(t + WIND) + dy - PY, MX - PX);
  // walk-through: [time, hit?] in mode 0 until 11 s, then mode 1
  const SPLIT = 11, DUR = 22;
  const TOUR = [[1.2, 1], [3, 1], [5.6, 0], [9.8, 1], [11.8, 0], [12.6, 1], [13.4, 0], [14.2, 1], [15, 1], [18.5, 1], [19.4, 1]]
    .map(([t, h]) => ({ t, ang: aimAt(t, h ? 0 : (t * 37 % 2 > 1 ? 70 : -70)) }));

  // replays every press up to time t under one mode
  function sim(casts, mode, t0, t) {
    const M = MODES[mode]; let mana = 100, last = t0, ready = -1, prev = null, streak = 0, lastDrain = -99, hits = 0, n = 0;
    const ev = [];
    casts.forEach(c => {
      if (c.t > t || c.t < t0) return;
      mana = Math.min(100, mana + (c.t - last) * REGEN); last = c.t;
      if (c.t < ready) { ev.push({ ...c, kind: 'cooldown' }); return; }
      const st = prev !== null && c.t - prev < STREAK ? streak + 1 : 0, cost = M.cost(st);
      if (mana < cost) { ev.push({ ...c, kind: 'nomana', cost }); return; }
      mana -= cost; ready = c.t + M.cd; prev = c.t; streak = st; n++;
      const land = c.t + WIND, my = MY(land), dx = Math.cos(c.ang), dy = Math.sin(c.ang);
      const along = (MX - PX) * dx + (my - PY) * dy, off = Math.abs(-(MX - PX) * dy + (my - PY) * dx);
      const hit = along > 0 && along < REACH + 20 && off < 38;
      const e = { ...c, kind: 'cast', hit, cost, land, surge: false };
      if (hit && land <= t) { e.surge = charge(land, lastDrain) >= 40; lastDrain = land; hits++; }
      ev.push(e);
    });
    mana = Math.min(100, mana + (t - last) * REGEN);
    const nextStreak = prev !== null && t - prev < STREAK ? streak + 1 : 0;
    return { mana, ready, ev, hits, n, lastDrain, nextCost: M.cost(nextStreak) };
  }

  function view(t, st, tour) {
    if (!tour) { const s = sim(st.casts, st.mode, st.t0, t); return { mode: st.mode, s, ang: st.ang, done: st.done }; }
    const m = t < SPLIT ? 0 : 1, s = sim(TOUR, m, m ? SPLIT : 0, t);
    const s0 = sim(TOUR, 0, 0, Math.min(t, SPLIT - .01));
    const nx = TOUR.find(c => c.t > t) || TOUR[TOUR.length - 1], pv = [...TOUR].reverse().find(c => c.t <= t) || TOUR[0];
    const ang = lerp(pv.ang, nx.ang, ease(clamp((t - pv.t - .6) / .5)));
    return { mode: m, s, ang, done: m ? [{ n: s0.n, hits: s0.hits }, { n: 0, hits: 0 }] : [{ n: 0, hits: 0 }, { n: 0, hits: 0 }] };
  }

  function whip(g, e, t, my) {
    const a = t - e.t, dx = Math.cos(e.ang), dy = Math.sin(e.ang);
    if (a < 0 || a > 1.4) return;
    const out = ease(clamp(a / WIND)), len = REACH * out;
    let ex = PX + dx * len, ey = PY + dy * len;
    if (e.hit && a >= WIND) { ex = MX; ey = my; }
    const fade = e.hit ? 1 - clamp((a - 1) / .4) : 1 - clamp((a - WIND - .1) / .5);
    g.save(); g.globalAlpha = fade; g.strokeStyle = '#4b2286'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(PX + 16, PY);
    const sag = e.hit ? 0 : clamp((a - WIND) / .4) * 60;
    for (let i = 1; i <= 16; i++) { const k = i / 16, w = Math.sin(k * Math.PI * 3 - a * 14) * 10 * (1 - out * .7) * (1 - k); g.lineTo(lerp(PX + 16, ex, k) - dy * w, lerp(PY, ey, k) + dx * w + Math.sin(k * Math.PI) * sag); }
    g.stroke();
    if (e.hit && a >= WIND) {
      // the whip wraps around the target
      const wr = ease(clamp((a - WIND) / .25));
      g.beginPath(); g.arc(ex, ey, 30, Math.PI, Math.PI + wr * Math.PI * 1.8); g.stroke();
      // a charged target surges down the whip
      if (e.surge) for (let j = 0; j < 4; j++) { const k = clamp((a - WIND - .1 - j * .1) / .45); if (k <= 0 || k >= 1) continue; const x = lerp(ex, PX, k), y = lerp(ey, PY, k); g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
  }

  scene('siphon-whip', {
    dur: DUR,
    state: () => ({ mode: 0, casts: [], t0: 0, ang: 0, done: [{ n: 0, hits: 0 }, { n: 0, hits: 0 }] }),
    init(s, st, api) {
      const take = () => { if (st.tour) { api.manual(); st.casts = []; st.t0 = st.t; st.done = [{ n: 0, hits: 0 }, { n: 0, hits: 0 }]; } };
      $$(s, '.sw-mode').forEach(b => b.onclick = () => {
        take(); const m = +b.dataset.m; if (m === st.mode) return;
        const cur = sim(st.casts, st.mode, st.t0, st.t); st.done[st.mode].n += cur.n; st.done[st.mode].hits += cur.hits;
        st.mode = m; st.casts = []; st.t0 = st.t; sync();
      });
      function sync() { $$(s, '.sw-mode').forEach(b => b.classList.toggle('on', +b.dataset.m === st.mode)); }
      pointer(api.cv, (x, y, type) => {
        if (x > 700) return;
        if (type === 'move' && !st.tour) st.ang = clamp(Math.atan2(y - PY, x - PX), -1.2, 1.2);
        if (type === 'down') { take(); st.ang = clamp(Math.atan2(y - PY, x - PX), -1.2, 1.2); st.casts.push({ t: st.t, ang: st.ang }); sync(); }
      });
      sync();
    },
    draw(g, t, st, tour) {
      const v = view(t, st, tour), s = v.s, my = MY(t), M = MODES[v.mode];
      T.use(g); T.floor(14, 14, 686, 558);
      // aim
      g.save(); g.setLineDash([6, 8]); g.strokeStyle = 'rgba(75,34,134,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(PX, PY); g.lineTo(PX + Math.cos(v.ang) * REACH, PY + Math.sin(v.ang) * REACH); g.stroke(); g.restore();
      // the mage, charging up between drains
      const ch = charge(t, s.lastDrain), hot = ch >= 40;
      if (hot) for (let j = 0; j < 4; j++) { const an = t * 5 + j * 1.6; g.strokeStyle = '#ffd23c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(MX + Math.cos(an) * 24, my + Math.sin(an) * 24); g.lineTo(MX + Math.cos(an + .3) * 38, my + Math.sin(an + .3) * 38); g.stroke(); }
      T.foe(MX, my, 24, Math.PI, MAGE_COL);
      icon(g, 'wow-spell_nature_lightningoverload.jpg', MX + 62, my - 40, 30, { lw: 2 });
      g.fillStyle = 'rgba(21,32,68,.25)'; g.fillRect(MX - 30, my - 46, 60, 8); g.fillStyle = hot ? '#ffd23c' : '#9aa6e8'; g.fillRect(MX - 30, my - 46, 60 * ch / 100, 8);
      text(g, hot ? 'Charged' : 'Charging', MX, my + 40, { size: 12, w: 800, col: hot ? C.goldInk : C.muted, stroke: 3 });
      T.player(PX, PY, v.ang, 1.25);
      text(g, 'You', PX, PY + 36, { size: 12, w: 800, col: C.navy, stroke: 3 });
      // what each press did
      s.ev.forEach(e => {
        const a = t - e.t;
        if (e.kind === 'cast') { whip(g, e, t, my); if (a > WIND && a < WIND + 1) { const k = 1 - (a - WIND); if (e.hit) { T.popText('Drained', MX, my - 70 - (1 - k) * 20, '#4b2286', k); T.popText(e.surge ? '+ heal, surge!' : '+ heal', PX, PY - 46 - (1 - k) * 20, C.good, k); } else T.popText('Missed', PX + Math.cos(e.ang) * REACH * .8, PY + Math.sin(e.ang) * REACH * .8 - 20, C.muted, k); } }
        else if (a < 1) T.popText(e.kind === 'cooldown' ? 'On cooldown' : `Needs ${e.cost} mana`, PX + 20, PY - 50 - a * 20, C.redDk, 1 - a);
      });
      // the panel: mode, mana, cooldown, results
      panel(g, 712, 14, 314, 558, { title: 'Balance' });
      card(g, 869, 92, 286, 82, { edge: C.navy, lw: 3, shadow: false });
      text(g, M.name, 869, 76, { size: 16, w: 800, display: true });
      text(g, M.rule, 869, 102, { size: 13, col: C.muted });
      text(g, 'Mana', 736, 162, { align: 'left', size: 14, w: 800 });
      g.fillStyle = 'rgba(21,32,68,.15)'; g.beginPath(); g.roundRect(736, 176, 266, 22, 6); g.fill();
      g.fillStyle = '#3f6fd6'; g.beginPath(); g.roundRect(736, 176, 266 * s.mana / 100, 22, 6); g.fill();
      const nc = Math.min(s.nextCost, 100); g.strokeStyle = s.mana >= s.nextCost ? C.gold : C.red; g.lineWidth = 3; g.strokeRect(736 + 266 * Math.max(0, s.mana - nc) / 100, 174, 266 * nc / 100, 26);
      text(g, `${Math.floor(s.mana)} / 100`, 1002, 162, { align: 'right', size: 13, w: 700, col: C.muted });
      text(g, `Next cast costs ${s.nextCost}`, 736, 216, { align: 'left', size: 13.5, w: 700, col: s.mana >= s.nextCost ? C.navy : C.redDk });
      const cd = Math.max(0, s.ready - t);
      text(g, cd > 0 ? `Cooldown ${cd.toFixed(1)} s` : 'Ready', 1002, 216, { align: 'right', size: 13.5, w: 800, col: cd > 0 ? C.goldInk : C.good });
      // per-mode results
      text(g, 'Results', 736, 262, { align: 'left', size: 14, w: 800 });
      MODES.forEach((m2, i) => {
        const y = 310 + i * 96, live = i === v.mode, n = v.done[i].n + (live ? s.n : 0), h = v.done[i].hits + (live ? s.hits : 0);
        card(g, 869, y, 286, 82, { edge: live ? C.navy : '#cdbf9f', lw: live ? 3 : 2, shadow: false, fill: live ? '#fffaf0' : 'rgba(255,250,240,.5)' });
        text(g, i ? 'After' : 'Before', 740, y - 22, { align: 'left', size: 13, w: 800, col: C.muted });
        text(g, `${n} cast${n === 1 ? '' : 's'}, ${h} hit${h === 1 ? '' : 's'}`, 740, y + 2, { align: 'left', size: 16, w: 800 });
        text(g, n ? `${Math.round(100 * h / n)}% landed` : 'no casts yet', 740, y + 26, { align: 'left', size: 13, col: C.muted });
        if (n) { g.fillStyle = 'rgba(21,32,68,.12)'; g.fillRect(900, y + 18, 90, 10); g.fillStyle = C.good; g.fillRect(900, y + 18, 90 * h / n, 10); }
      });
      wrap(g, 'Misses still sting after the change, but the next try comes sooner, and spamming it runs you dry.', 736, 506, 270, { size: 13, lh: 16, col: C.ink });
    },
    side(t, st, tour) {
      const v = view(t, st, tour), s = v.s, last = s.ev[s.ev.length - 1];
      const stats = `<div class="${v.mode ? 'g' : 'y'}"><b>${MODES[v.mode].name}</b></div><div>Mana <b>${Math.floor(s.mana)}</b></div><div>Next cast <b>${s.nextCost}</b></div>`;
      if (!last) return { stats, out: tour ? 'Before the balance pass: one cast, then a long wait.' : 'Aim with the mouse and click to lash.' };
      const out = last.kind === 'cooldown' ? 'Still on cooldown: before the change, a miss means a long wait.' : last.kind === 'nomana' ? `Not enough mana: the ${last.cost}-mana repeat is the price of fast recasts.` : last.hit ? (last.surge ? 'Hit a charged mage: the whip wraps, surges, drains and heals.' : 'Hit: drained and healed. It wasn’t charged yet, so no surge.') : 'Missed: you get nothing.';
      return { stats, out };
    },
  });
})();
