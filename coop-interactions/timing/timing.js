/* Teamplay timing (MGM C3 M6, deck slides 147-160). One enemy swing at an ally, and three tools anchored to it:
   a shield before the hit (proactive), an intervention during the swing (coactive) and a heal after it (reactive).
   outcome(use) resolves one cycle and scene(g, t, use) draws it as a pure function of time, so the sandbox, the tour,
   the title loop and window.__seek (for the GIF) all draw the same thing. Slide 3 is slide 153: shields invite risk. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const WW = 900, WH = 540;
  // one cycle: the enemy winds up from WIND, the swing lands at IMPACT, it recovers until REC
  const CYCLE = 4, WIND = .8, IMPACT = 2, SWING = [1.9, 2.15], REC = 3;
  const E = [650, 190], A = [500, 190], Y = [250, 285], GUARD_AT = [575, 190];
  const HIT = 45, SHIELD_LEN = 1.6, LEAP = .2, GUARD = .35, HEAL_RAMP = .4;
  const TOOLS = {
    shield: { name: 'Shield', when: 'Before', win: [IMPACT - SHIELD_LEN, IMPACT - .02], rgb: '60,140,230', col: '#3c8ce6' },
    intervene: { name: 'Intervene', when: 'During', win: [IMPACT - LEAP - GUARD, IMPACT - LEAP], rgb: '224,169,45', col: '#c98a10' },
    heal: { name: 'Heal', when: 'After', win: [IMPACT + .02, CYCLE - .35], rgb: '47,174,99', col: '#1f8a4c' },
  };
  const f1 = x => x.toFixed(1);

  /* ---------- the rules: one use of one tool per cycle ---------- */
  function outcome(u) {
    const o = { allyHit: true, youHit: false, blocked: false, absorbed: false, healAt: -1, ok: false, text: '' };
    if (!u) { o.text = 'No answer: the hit lands.'; return o; }
    const { tool, at } = u, [w0, w1] = TOOLS[tool].win, ok = at >= w0 && at <= w1;
    o.ok = ok;
    if (tool === 'shield') {
      if (ok) { o.allyHit = false; o.absorbed = true; o.text = `Shield up ${f1(IMPACT - at)} s before the hit: it soaks the whole swing. <b>Proactive:</b> you acted before the event.`; }
      else if (at < w0) o.text = `Too early: the shield faded ${f1(IMPACT - at - SHIELD_LEN)} s before the swing landed.`;
      else o.text = 'Too late: a shield after the hit protects nothing. That moment wanted a heal.';
    } else if (tool === 'intervene') {
      if (ok) { o.allyHit = false; o.blocked = true; o.text = `You landed in front ${f1(IMPACT - at - LEAP)} s before impact and caught it on your guard. <b>Coactive:</b> a narrow window, during the event.`; }
      else if (at < w0) { o.allyHit = false; o.youHit = true; o.text = `Too early: your guard dropped ${f1(IMPACT - at - LEAP - GUARD)} s before the swing landed, so you took the hit instead.`; }
      else o.text = at < IMPACT ? 'Too late: you were still in the air when the swing landed.' : 'Too late: the swing already landed. An intervention only works during it.';
    } else {
      if (at >= IMPACT) { o.healAt = at; o.text = `Healed ${f1(at - IMPACT)} s after the hit: the damage is erased. <b>Reactive:</b> you acted after the event.`; }
      else o.text = 'Nothing to heal yet: the ally was at full health, and then the hit landed anyway.';
    }
    return o;
  }
  const allyHp = (t, o) => 100 - (o.allyHit && t >= IMPACT ? HIT : 0) + (o.healAt >= 0 && t > o.healAt ? HIT * clamp((t - o.healAt) / HEAL_RAMP) : 0);
  const youHp = (t, o) => 100 - (o.youHit && t >= IMPACT ? HIT : 0);

  function youPos(t, u) {
    if (!u || u.tool !== 'intervene' || t < u.at) return Y;
    const back = Math.max(REC, u.at + LEAP + GUARD + .3);
    if (t < u.at + LEAP) { const k = (t - u.at) / LEAP, p = [lerp(Y[0], GUARD_AT[0], k), lerp(Y[1], GUARD_AT[1], k)]; p[1] -= Math.sin(k * Math.PI) * 40; return p; }
    if (t < back) return GUARD_AT;
    const k = ease(clamp((t - back) / (CYCLE - .15 - back)));
    return [lerp(GUARD_AT[0], Y[0], k), lerp(GUARD_AT[1], Y[1], k)];
  }

  /* ---------- drawing ---------- */
  function enemy(g, x, y, face, t, o = {}) {
    const wind = t >= WIND && t < SWING[0], sw = t >= SWING[0] && t < SWING[1], k = wind ? (t - WIND) / (SWING[0] - WIND) : sw ? (t - SWING[0]) / (SWING[1] - SWING[0]) : 0;
    if (wind) T.cone(x, y, face, Math.PI / 3, 150, .4 + .6 * k);
    if (sw) T.cone(x, y, face, Math.PI / 3, 150, 2.2);
    const lean = wind ? -6 * k : sw ? 10 : 0, ex = x + Math.cos(face) * lean, ey = y + Math.sin(face) * lean;
    T.foe(ex, ey, 30, face, C.red, { mark: 'horns' });
    const s = wind ? -1.4 * ease(k) : sw ? lerp(-1.4, 1.4, k) : t >= SWING[1] && t < REC ? 1.4 * (1 - (t - SWING[1]) / (REC - SWING[1])) : 0, a = face + s;
    g.strokeStyle = '#e8e2cf'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ex + Math.cos(a) * 24, ey + Math.sin(a) * 24); g.lineTo(ex + Math.cos(a) * 78, ey + Math.sin(a) * 78); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke();
    if (!o.quiet && wind) T.label('winding up', x, y + 58, 'center', C.redDk, 14);
  }
  function guardArc(g, x, y, face) {
    g.strokeStyle = '#e8e2cf'; g.lineWidth = 9; g.beginPath(); g.arc(x, y, 28, face - .9, face + .9); g.stroke();
    g.strokeStyle = C.gold; g.lineWidth = 3; g.stroke();
  }
  function beam(g, a, b, rgb, k) {
    g.save(); g.globalAlpha = clamp(k); g.strokeStyle = `rgba(${rgb},.9)`; g.lineWidth = 5; g.setLineDash([8, 8]); g.lineDashOffset = -k * 60;
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
  }
  const BX0 = 70, BX1 = 860, tx = t => BX0 + (BX1 - BX0) * t / CYCLE;

  // the arena (top) and the timeline (bottom) at time t of a cycle in which `use` happened (or will)
  function scene(g, t, use, o = {}) {
    T.use(g);
    const done = use && t >= use.at ? use : null, R = outcome(done), Rfull = outcome(use);
    const sel = o.tool || use?.tool;
    T.floor(0, 0, WW, 360); T.wall(0, 0, WW, 26); T.wall(0, 334, WW, 26);
    const yp = youPos(t, done), face = Math.atan2(A[1] - E[1], A[0] - E[0]);
    // enemy swings at whoever stands in front of it
    enemy(g, E[0], E[1], face, t, o);
    // shield bubble
    if (done?.tool === 'shield' && t >= done.at && t < done.at + SHIELD_LEN) {
      T.bubble(A[0], A[1], 34, t, Math.min(1, (done.at + SHIELD_LEN - t) / .25));
      if (t < done.at + .3) beam(g, Y, A, TOOLS.shield.rgb, 1 - (t - done.at) / .3);
    }
    if (done?.tool === 'heal' && t >= done.at && t < done.at + HEAL_RAMP + .2) beam(g, Y, A, TOOLS.heal.rgb, 1);
    T.player(A[0], A[1], Math.PI * 0, 1, 1, C.p2);
    T.label('Ally', A[0], A[1] + 44, 'center', C.ink, 14);
    T.hp(A[0], A[1] - 36, 56, allyHp(t, R), 100);
    T.player(yp[0], yp[1], Math.atan2(E[1] - yp[1], E[0] - yp[0]));
    T.label('You', yp[0], yp[1] + 44, 'center', C.ink, 14);
    if (R.youHit || (done?.tool === 'intervene')) T.hp(yp[0], yp[1] - 36, 56, youHp(t, R), 100);
    const guardUp = done?.tool === 'intervene' && t >= done.at + LEAP && t < done.at + LEAP + GUARD;
    if (guardUp) guardArc(g, yp[0], yp[1], 0);
    // the moment of impact
    const k = (t - IMPACT) / .7;
    if (k >= 0 && k < 1 && !o.quiet) {
      const who = R.blocked || R.youHit ? GUARD_AT : A;
      const txt = R.absorbed ? 'Absorbed' : R.blocked ? 'Blocked!' : R.youHit ? `−${HIT} (you)` : `−${HIT}`;
      const col = R.absorbed ? '#2f78c4' : R.blocked ? C.goldInk : C.red;
      if (k < .25) T.flash(who[0] + 10, who[1], 40, 1 - k * 4);
      T.popText(txt, who[0], who[1] - 62 - 20 * k, col, 1 - k);
    }
    if (R.healAt >= 0 && t >= R.healAt && t < R.healAt + .9 && !o.quiet) T.popText(`+${HIT}`, A[0], A[1] - 62 - 20 * (t - R.healAt), C.good, 1 - (t - R.healAt) / .9);
    if (done && t < done.at + .5 && !o.quiet) T.popText(TOOLS[done.tool].name, Y[0], Y[1] - 50, TOOLS[done.tool].col, 1 - (t - done.at) / .5);

    // ---- the timeline ----
    const y0 = 400, bh = 28;
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(20, 368, WW - 40, WH - 378, 12); g.fill();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.stroke();
    // before / during / after brackets around the event
    const D = [IMPACT - LEAP - GUARD - .05, IMPACT + .12];
    [['Before · proactive', 0, D[0]], ['During · coactive', D[0], D[1]], ['After · reactive', D[1], CYCLE]].forEach(([s, a, b], i) => {
      const x0 = tx(a) + 3, x1 = tx(b) - 3;
      g.strokeStyle = C.muted; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 - 6); g.lineTo(x0, y0 - 12); g.lineTo(x1, y0 - 12); g.lineTo(x1, y0 - 6); g.stroke();
      g.font = '600 14px Jost, sans-serif'; g.textAlign = 'center'; g.fillStyle = C.ink;
      if (i === 1) { g.fillText('During', (x0 + x1) / 2, y0 - 20); } else g.fillText(s, (x0 + x1) / 2, y0 - 20);
    });
    g.fillStyle = '#e9dfcb'; g.fillRect(BX0, y0, BX1 - BX0, bh);
    const gr = g.createLinearGradient(tx(WIND), 0, tx(SWING[0]), 0); gr.addColorStop(0, 'rgba(229,50,45,.05)'); gr.addColorStop(1, 'rgba(229,50,45,.45)');
    g.fillStyle = gr; g.fillRect(tx(WIND), y0, tx(SWING[0]) - tx(WIND), bh);
    g.fillStyle = 'rgba(229,50,45,.6)'; g.fillRect(tx(SWING[0]), y0, tx(SWING[1]) - tx(SWING[0]), bh);
    if (sel) {
      const w = TOOLS[sel].win;
      g.fillStyle = `rgba(${TOOLS[sel].rgb},.35)`; g.fillRect(tx(w[0]), y0 + bh * .5, tx(w[1]) - tx(w[0]), bh * .5);
      g.strokeStyle = TOOLS[sel].col; g.lineWidth = 2; g.strokeRect(tx(w[0]), y0 + bh * .5, tx(w[1]) - tx(w[0]), bh * .5);
    }
    g.fillStyle = C.red; g.fillRect(tx(IMPACT) - 1.5, y0 - 4, 3, bh + 8);
    g.font = '700 13px Jost, sans-serif'; g.textAlign = 'center'; g.fillStyle = C.ink;
    g.fillText('wind-up', (tx(WIND) + tx(SWING[0])) / 2, y0 + 12);
    g.fillStyle = C.redDk; g.fillText('the hit', tx(IMPACT), y0 + bh + 16);
    // ally health under the bar
    const hy = v => 528 - (v / 100) * 60;
    g.strokeStyle = 'rgba(93,97,140,.35)'; g.lineWidth = 1; g.setLineDash([3, 5]); g.beginPath(); g.moveTo(BX0, hy(100)); g.lineTo(BX1, hy(100)); g.moveTo(BX0, hy(55)); g.lineTo(BX1, hy(55)); g.stroke(); g.setLineDash([]);
    g.font = '600 12px Jost, sans-serif'; g.textAlign = 'right'; g.fillStyle = C.muted; g.fillText('ally HP', BX0 - 6, hy(78));
    g.strokeStyle = C.p2; g.lineWidth = 3; g.beginPath();
    for (let s = 0; s <= t + 1e-6; s += .02) { const v = allyHp(s, use && s >= use.at ? Rfull : outcome(null)); s ? g.lineTo(tx(s), hy(v)) : g.moveTo(tx(s), hy(v)); }
    g.stroke();
    if (use) { const ux = tx(use.at); g.fillStyle = TOOLS[use.tool].col; g.beginPath(); g.moveTo(ux, y0 + bh + 2); g.lineTo(ux - 8, y0 + bh + 14); g.lineTo(ux + 8, y0 + bh + 14); g.closePath(); g.fill(); }
    g.fillStyle = C.navy; g.fillRect(tx(t) - 1.5, y0 - 8, 3, bh + 16 + 70);
  }
  function fit(g, x, y, w, h, fn) {
    const sc = Math.min(w / WW, h / WH);
    g.save(); g.translate(x + (w - WW * sc) / 2, y + (h - WH * sc) / 2); g.scale(sc, sc); fn(); g.restore();
  }

  /* ---------- the tour: the right moment for each tool, then two wrong ones ---------- */
  const TOUR = [
    { use: { tool: 'shield', at: 1.05 }, cap: 'Shield before the hit' },
    { use: { tool: 'intervene', at: 1.6 }, cap: 'Intervene during the swing' },
    { use: { tool: 'heal', at: 2.55 }, cap: 'Heal after the hit' },
    { use: { tool: 'shield', at: 2.35 }, cap: 'A shield too late' },
    { use: { tool: 'intervene', at: 1.1 }, cap: 'An intervention too early' },
  ];
  const TOUR_DUR = TOUR.length * CYCLE;
  function tourAt(tt) { const i = Math.floor(((tt % TOUR_DUR) + TOUR_DUR) % TOUR_DUR / CYCLE); return { i, step: TOUR[i], t: (tt % CYCLE + CYCLE) % CYCLE }; }

  /* ---------- slide 1: title ---------- */
  canvasDemo('title', (s, cv, g) => (dt, t) => {
    const { step, t: u } = tourAt(t);
    g.clearRect(0, 0, cv.width, cv.height);
    fit(g, 0, 0, cv.width, cv.height, () => scene(g, u, step.use));
  });

  /* ---------- slide 2: the sandbox ---------- */
  let sb = null;
  canvasDemo('sandbox', (s, cv, g) => {
    const verdict = $(s, '.tm-verdict');
    const st = { tool: 'shield', t: 0, use: null, slow: false, tour: false, tt: 0, held: false, last: '' };
    const ui = () => {
      $$(s, '.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === (st.tour ? tourAt(st.tt).step.use.tool : st.tool)));
      $(s, '.tm-slow').classList.toggle('on', st.slow); $(s, '.tm-tour').classList.toggle('on', st.tour);
    };
    const use = () => { if (st.tour) { st.tour = false; st.t = 0; } if (!st.use) st.use = { tool: st.tool, at: st.t }; };
    $$(s, '.tool').forEach(b => b.onclick = () => { st.tool = b.dataset.tool; if (st.tour) { st.tour = false; st.t = 0; st.use = null; } ui(); });
    $(s, '.tm-use').onclick = use;
    cv.addEventListener('click', use);
    s.tabIndex = -1;
    document.addEventListener('keydown', e => { if ((e.key === 'u' || e.key === 'U') && s.classList.contains('active')) use(); });
    $(s, '.tm-slow').onclick = () => { st.slow = !st.slow; ui(); };
    $(s, '.tm-tour').onclick = () => { st.tour = !st.tour; st.tt = 0; st.t = 0; st.use = null; ui(); };
    function words(u, t) {
      if (!u) return t > IMPACT + .4 ? `<b class="bad">The hit landed.</b> Pick a tool and press <b>Use it now</b> at the right moment.` : `Watch the wind-up. Use the <b>${TOOLS[st.tool].name.toLowerCase()}</b> inside its green band.`;
      const R = outcome(u);
      return `<b class="${R.ok ? 'good' : 'bad'}">${R.ok ? '✓' : '✗'} ${TOOLS[u.tool].name} at ${f1(u.at)} s.</b> ${R.text}`;
    }
    function render() {
      let u, t, extra = {};
      if (st.tour) { const a = tourAt(st.tt); u = a.step.use; t = a.t; extra.cap = `${a.i + 1} / ${TOUR.length}  ${a.step.cap}`; }
      else { u = st.use; t = st.t; extra.tool = st.tool; }
      g.clearRect(0, 0, cv.width, cv.height);
      fit(g, 0, 0, cv.width, cv.height, () => {
        scene(g, t, u, { tool: st.tour ? u.tool : st.tool });
        if (extra.cap) T.label(extra.cap, WW - 30, 52, 'right', '#fff', 17, 'rgba(21,32,68,.9)');
      });
      const html = st.tour ? words(t >= u.at ? u : null, t).replace(/Pick a tool.*$/, '') : words(u && t >= u.at ? u : null, t);
      if (html !== st.last) { st.last = html; say(verdict, html); }
      ui();
    }
    sb = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => TOUR_DUR };
    return dt => {
      if (!st.held) {
        const d = dt * (st.slow ? .45 : 1);
        st.tt += d; st.t += d;
        if (st.t >= CYCLE) { st.t -= CYCLE; st.use = null; }
      }
      render();
    };
  }, { enter(s) { const b = $(s, '.tm-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  /* ---------- slide 3: heal after vs shield first (slide 153) ---------- */
  const PW = 700, PH = 420, PE = 520, HOME = 330, NEAR = 90, HEALER = [190, 330], RK = 10;
  const kf = (pts, t) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return lerp(va, vb, ease((t - a) / (b - a || 1))); } return pts.at(-1)[1]; };
  // each side: enemy x, ally x, swings [wind-up start, impact], ally hits, shields [from, to], heals [at], hits taken [at]
  const SIDES = {
    heal: (() => {
      const sw = [], hits = [], ally = [[0, HOME]], took = [], heals = [];
      for (let p = 0; p < 4; p++) {
        const o = p * 2.5; sw.push([o + .3, o + 1.3]);
        if (p === 1) { ally.push([o + .9, HOME], [o + 1.1, PE - NEAR], [o + 1.6, PE - NEAR], [o + 2.0, HOME]); took.push(o + 1.3); heals.push(o + 1.5); }
        else { ally.push([o + 1.4, HOME], [o + 1.6, PE - NEAR], [o + 1.85, PE - NEAR], [o + 2.15, HOME]); hits.push(o + 1.75); }
      }
      return { enemy: [[0, PE]], ally, sw, hits, shields: [], heals, took };
    })(),
    shield: {
      enemy: [[0, PE], [.6, PE], [1.7, PE + 130], [3.6, PE + 130], [4.3, PE], [7.0, PE], [8.0, PE + 130], [9.4, PE + 130], [10, PE]],
      ally: [[0, HOME], [.4, HOME], [.75, PE - NEAR + 20], [1.7, PE + 130 - NEAR], [3.5, PE + 130 - NEAR], [4.1, HOME], [5.7, HOME], [5.9, PE - NEAR], [6.15, PE - NEAR], [6.45, HOME], [6.9, HOME], [7.2, PE - NEAR + 20], [8.0, PE + 130 - NEAR], [9.3, PE + 130 - NEAR], [9.9, HOME]],
      sw: [[4.6, 5.6]], hits: [.9, 1.4, 1.9, 2.4, 2.9, 3.4, 6.05, 7.4, 7.9, 8.4, 8.9], shields: [[.3, 3.6], [6.8, 9.6]], heals: [], took: [],
    },
  };
  function sideAt(S, t) {
    const ex = kf(S.enemy, t), ax = kf(S.ally, t);
    const sw = S.sw.find(([a, b]) => t >= a && t < b + .4);
    const shield = S.shields.find(([a, b]) => t >= a && t < b);
    return { ex, ax, sw, shield, hitsSoFar: S.hits.filter(h => h <= t).length, back: S.shields.length && ex > PE + 20 };
  }
  function riskPanel(g, S, t, title) {
    T.use(g);
    const s = sideAt(S, t), y = 200;
    T.floor(0, 0, PW, PH); T.wall(0, 0, PW, 24); T.wall(0, PH - 24, PW, 24);
    // the enemy, and its swing when it has one
    const face = Math.PI;
    if (s.sw) { const [a, b] = s.sw, k = clamp((t - a) / (b - a)); if (t < b) T.cone(s.ex, y, face, Math.PI / 3, 150, .4 + .6 * k); else T.cone(s.ex, y, face, Math.PI / 3, 150, 2 * (1 - (t - b) / .4)); }
    T.foe(s.ex, y, 30, face, C.red, { mark: 'horns' });
    if (s.back) T.label('backing off', s.ex, y + 56, 'center', C.redDk, 14);
    if (s.shield) T.bubble(s.ax, y, 34, t, Math.min(1, (s.shield[1] - t) / .25, (t - s.shield[0]) / .2));
    if (S.shields.some(([a]) => t >= a && t < a + .3)) beam(g, HEALER, [s.ax, y], TOOLS.shield.rgb, 1);
    const hl = S.heals.find(h => t >= h && t < h + .5);
    if (hl != null) { beam(g, HEALER, [s.ax, y], TOOLS.heal.rgb, 1); T.popText('+heal', s.ax, y - 60, C.good, 1 - (t - hl) / .5); }
    const tk = S.took.find(h => t >= h && t < h + .6);
    if (tk != null) { T.flash(s.ax + 10, y, 40, 1 - (t - tk) / .3); T.popText('−45', s.ax, y - 80, C.red, 1 - (t - tk) / .6); }
    const hit = S.hits.find(h => t >= h && t < h + .3);
    if (hit != null) { T.tracer(s.ax + 18, y, s.ex - 20, y, 1, C.gold, 7); T.flash(s.ex - 22, y, 30, 1 - (t - hit) / .3); }
    T.player(s.ax, y, 0, 1, 1, C.p2);
    T.player(HEALER[0], HEALER[1], Math.atan2(y - HEALER[1], s.ax - HEALER[0]));
    T.label('You', HEALER[0], HEALER[1] + 42, 'center', C.ink, 14);
    T.label(title, 24, 52, 'left', '#fff', 18, 'rgba(21,32,68,.9)');
    T.label(`Hits landed: ${s.hitsSoFar}`, PW - 24, 52, 'right', C.ink, 18);
  }
  canvasDemo('risk', (s, cv, g) => (dt, t) => {
    const u = t % RK;
    g.clearRect(0, 0, cv.width, cv.height);
    const W = cv.width / 2;
    [['heal', 'Heal after'], ['shield', 'Shield first']].forEach(([k, title], i) => {
      g.save(); g.translate(i * W + 10, 0); const sc = Math.min((W - 20) / PW, cv.height / PH); g.scale(sc, sc);
      g.beginPath(); g.roundRect(0, 0, PW, PH, 12); g.clip(); riskPanel(g, SIDES[k], u, title); g.restore();
    });
  });

  /* ---------- slides 4-6: the deck's own examples as small action scenes (slides 150-160) ----------
     mini(g, t, kind) draws one 4 s cycle of the same swing with one answer: heal and revive (slides 150-151), the
     Dark Souls trio on yourself (156-158: Iron Flesh before, a shield block during, Estus after) and all three
     answers stacked on one big hit (159-160). */
  const MW = 600, MH = 330, ME = [440, 140], MT = [300, 140], MY = [130, 215], GUARD2 = [380, 140];
  const MINI = {
    heal: { self: false, hit: 45, cap: 'Heal', when: 'After', at: 2.5, note: 'needs damage first' },
    revive: { self: false, hit: 100, cap: 'Revive', when: 'After', at: 2.35, note: 'needs a death first' },
    iron: { self: true, hit: 45, cap: 'Iron Flesh', when: 'Before', at: .9, note: 'cast, then take half' },
    block: { self: true, hit: 45, cap: 'Shield block', when: 'During', at: 1.72, note: 'raised as the punch comes' },
    estus: { self: true, hit: 45, cap: 'Estus', when: 'After', at: 2.55, note: 'take it, then drink' },
    stack: { self: false, hit: 90, cap: 'All three', when: '', at: 0, note: '' },
  };
  const WHEN_COL = { Before: TOOLS.shield.col, During: TOOLS.intervene.col, After: TOOLS.heal.col };
  function miniHp(kind, t) {
    const M = MINI[kind];
    if (kind === 'iron' || kind === 'block') return t >= IMPACT ? 100 - M.hit / 2 : 100;
    if (kind === 'estus' || kind === 'heal') return 100 - (t >= IMPACT ? M.hit : 0) + (t > M.at ? M.hit * clamp((t - M.at) / .5) : 0);
    if (kind === 'revive') return t < IMPACT ? 100 : t < 3.35 ? 0 : 50;
    return 100 - (t >= IMPACT ? 30 : 0) + (t > 2.5 ? 30 * clamp((t - 2.5) / .5) : 0);
  }
  function stackYou(t) {
    if (t < 1.55) return MY;
    if (t < 1.75) { const k = (t - 1.55) / .2; return [lerp(MY[0], GUARD2[0], k), lerp(MY[1], GUARD2[1], k) - Math.sin(k * Math.PI) * 30]; }
    if (t < 3) return GUARD2;
    const k = ease(clamp((t - 3) / .8)); return [lerp(GUARD2[0], MY[0], k), lerp(GUARD2[1], MY[1], k)];
  }
  function mini(g, t, kind, o = {}) {
    T.use(g);
    const M = MINI[kind], tgt = MT;
    T.floor(0, 0, MW, MH); T.wall(0, 0, MW, 20); T.wall(0, 250, MW, 14);
    g.fillStyle = 'rgba(255,252,244,.92)'; g.fillRect(0, 264, MW, MH - 264);
    enemy(g, ME[0], ME[1], Math.PI, t, { quiet: true });
    const hp = miniHp(kind, t), down = kind === 'revive' && t >= IMPACT && t < 3.35;
    // the answer, drawn in the scene
    if (kind === 'iron' && t >= M.at && t < 3.2) { g.save(); g.globalAlpha = Math.min(1, (t - M.at) / .2, (3.2 - t) / .2); g.strokeStyle = C.gold; g.lineWidth = 6; g.setLineDash([3, 6]); g.beginPath(); g.arc(tgt[0], tgt[1], 32 + 2 * Math.sin(t * 9), 0, Math.PI * 2); g.stroke(); g.restore(); }
    if (kind === 'block' && t >= M.at && t < 2.3) guardArc(g, tgt[0], tgt[1], 0);
    if (kind === 'estus' && t >= M.at && t < M.at + .6) { g.fillStyle = '#e8892a'; g.beginPath(); g.roundRect(tgt[0] - 6, tgt[1] - 62, 12, 18, 4); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); T.flash(tgt[0], tgt[1], 46, .5 * (1 - (t - M.at) / .6)); }
    if ((kind === 'heal' || kind === 'stack') && t >= 2.5 && t < 3) beam(g, kind === 'stack' ? GUARD2 : MY, tgt, TOOLS.heal.rgb, 1);
    if (kind === 'revive' && t >= M.at && t < 3.35) { beam(g, MY, tgt, TOOLS.heal.rgb, 1); const k = (t - M.at) / (3.35 - M.at); g.strokeStyle = C.good; g.lineWidth = 6; g.beginPath(); g.arc(tgt[0], tgt[1], 30, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); }
    if (kind === 'stack') {
      if (t >= 1 && t < 2.05) T.bubble(tgt[0], tgt[1], 34, t, Math.min(1, (2.05 - t) / .1));
      if (t >= 1 && t < 1.3) beam(g, MY, tgt, TOOLS.shield.rgb, 1 - (t - 1) / .3);
    }
    // the target, and you when you are not the target
    if (down) { g.fillStyle = '#9a9cae'; g.beginPath(); g.ellipse(tgt[0], tgt[1] + 6, 22, 14, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); T.popText('✝', tgt[0], tgt[1] - 4, C.navy, 1); }
    else T.player(tgt[0], tgt[1], 0, 1, 1, M.self ? C.player : C.p2);
    T.label(M.self ? 'You' : 'Ally', tgt[0], tgt[1] + 44, 'center', C.ink, 14);
    T.hp(tgt[0], tgt[1] - 38, 56, hp, 100);
    if (!M.self) {
      const you = kind === 'stack' ? stackYou(t) : MY;
      T.player(you[0], you[1], Math.atan2(ME[1] - you[1], ME[0] - you[0]));
      if (you === MY) T.label('You', you[0], you[1] + 40, 'center', C.ink, 14);
      if (kind === 'stack' && t >= 1.75 && t < 2.3) guardArc(g, GUARD2[0], GUARD2[1], 0);
    }
    // the hit
    const k = (t - IMPACT) / .8;
    if (k >= 0 && k < 1) {
      const at = kind === 'stack' ? GUARD2 : tgt;
      if (k < .25) T.flash(at[0] + 14, at[1], 44, 1 - k * 4);
      const txt = kind === 'iron' ? '−22, halved' : kind === 'block' ? '−22, blocked half' : kind === 'revive' ? 'Killed' : kind === 'stack' ? '90 → 30' : `−${M.hit}`;
      T.popText(txt, tgt[0], tgt[1] - 70 - 16 * k, kind === 'iron' || kind === 'block' ? C.goldInk : C.red, 1 - k);
    }
    if ((kind === 'heal' || kind === 'estus') && t >= M.at && t < M.at + .8) T.popText(`+${M.hit}`, tgt[0] + 40, tgt[1] - 60, C.good, 1 - (t - M.at) / .8);
    if (kind === 'stack' && t >= 2.5 && t < 3.3) T.popText('+30', tgt[0] + 40, tgt[1] - 60, C.good, 1 - (t - 2.5) / .8);
    if (kind === 'revive' && t >= 3.35 && t < 4) T.popText('Back up', tgt[0], tgt[1] - 66, C.good, 1 - (t - 3.35) / .65);
    // the strip: wind-up, the hit, and when the answer went in
    const sx = v => 30 + (MW - 60) * v / CYCLE, sy = 274;
    g.fillStyle = '#e9dfcb'; g.fillRect(30, sy, MW - 60, 14);
    const gr = g.createLinearGradient(sx(WIND), 0, sx(SWING[0]), 0); gr.addColorStop(0, 'rgba(229,50,45,.05)'); gr.addColorStop(1, 'rgba(229,50,45,.5)');
    g.fillStyle = gr; g.fillRect(sx(WIND), sy, sx(SWING[0]) - sx(WIND), 14);
    g.fillStyle = C.red; g.fillRect(sx(IMPACT) - 1.5, sy - 4, 3, 22);
    const marks = kind === 'stack' ? [[1, 'Before'], [1.6, 'During'], [2.5, 'After']] : [[M.at, M.when]];
    marks.forEach(([at, w]) => { g.fillStyle = WHEN_COL[w]; g.beginPath(); g.moveTo(sx(at), sy + 16); g.lineTo(sx(at) - 7, sy + 27); g.lineTo(sx(at) + 7, sy + 27); g.closePath(); g.fill(); g.font = '700 14px Jost, sans-serif'; g.textAlign = 'center'; g.fillText(w, sx(at), sy + 42); });
    g.fillStyle = C.navy; g.fillRect(sx(t) - 1.5, sy - 6, 3, 26);
    if (!o.quiet) T.label(kind === 'stack' ? 'Shield, intervene, heal' : `${M.cap}: ${M.note}`, 16, 44, 'left', '#fff', 16, 'rgba(21,32,68,.9)');
    if (kind === 'stack') {
      // where the 90 went
      const parts = [['Shield', TOOLS.shield.col, IMPACT], ['Your guard', TOOLS.intervene.col, IMPACT], ['Ally, healed', TOOLS.heal.col, 2.5]];
      let x = 262; const y = 222;
      g.font = '600 13px Jost, sans-serif';
      parts.forEach(([n, col, at]) => { const w = 108; g.globalAlpha = t >= at ? 1 : .2; g.fillStyle = col; g.fillRect(x, y, w, 14); g.globalAlpha = 1; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(`${n} 30`, x + w / 2, y - 7); x += w + 3; });
    }
  }
  const miniFit = (g, x, y, w, h, fn) => { const sc = Math.min(w / MW, h / MH); g.save(); g.translate(x + (w - MW * sc) / 2, y + (h - MH * sc) / 2); g.scale(sc, sc); g.beginPath(); g.roundRect(0, 0, MW, MH, 12); g.clip(); fn(); g.restore(); };
  const SEEK = {};
  function panels(name, kinds) {
    canvasDemo(name, (s, cv, g) => {
      const st = { t: 0, held: false };
      const render = () => {
        g.clearRect(0, 0, cv.width, cv.height);
        const W = cv.width / kinds.length;
        kinds.forEach((k, i) => miniFit(g, i * W + 8, 0, W - 16, cv.height, () => mini(g, st.t % CYCLE, k)));
      };
      SEEK[name] = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => CYCLE * 2 };
      return dt => { if (!st.held) st.t += dt; render(); };
    });
  }
  panels('revive', ['heal', 'revive']);
  panels('souls', ['iron', 'block', 'estus']);
  panels('stack', ['stack']);

  window.__seek = (t, which) => (SEEK[which] || sb).seek(t);
  window.__dur = which => (SEEK[which] || sb).dur();
})();
