/* Two bars (mock-up for DGMS M8, beside Three Ways to Grow Toughness).
   1. Sekiro: an enemy with vitality and posture. Three play styles (trade hits, deflect only, deflect and press) are
      simulated over 30 s with the same enemy; posture recovery slows as vitality drops. Charts plus live bars.
   2. Halo: 115 points as one health bar vs 70 shield over 45 health, with a recharge delay, through five firefights.
   Every simulation is deterministic; the walk-through draws as a function of t only. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, SPAN = 30, DT = 0.02;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const bg = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const rr = (g, x, y, w, h, r, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };

  /* ---------- 1. Sekiro ---------- */
  const VIT = '#d83a34', POS = '#e8a21e', YOU = '#2ea3dc';
  const STYLES = [
    { key: 'trade', name: 'Trade hits', rule: 'swing back, never deflect' },
    { key: 'defl', name: 'Deflect only', rule: 'deflect every swing, never attack' },
    { key: 'press', name: 'Deflect and press', rule: 'deflect, then three strikes' },
  ];
  function sekiro(style, regen) {
    let vit = 100, pos = 0, hp = 100, last = -9, end = null, how = '';
    const pts = [], ev = [], swings = [], strikes = [];
    for (let s = 1.5; s < SPAN; s += 2) { swings.push(s); [0.35, 0.75, 1.15].forEach((o, i) => strikes.push([s + o, i === 0])); }
    let si = 0, ki = 0;
    for (let t = 0; t <= SPAN + 1e-9; t += DT) {
      if (end === null) {
        while (si < swings.length && swings[si] <= t) {
          if (style === 'trade') { hp -= 18; ev.push([swings[si], 'took']); }
          else { pos += 14; last = swings[si]; ev.push([swings[si], 'defl']); }
          si++;
        }
        while (ki < strikes.length && strikes[ki][0] <= t) {
          if (style !== 'defl') { const [at, open] = strikes[ki]; if (open) { vit -= 10; pos += 4; ev.push([at, 'land']); } else { pos += 6; ev.push([at, 'guard']); } last = at; }
          ki++;
        }
        if (t - last > 0.6) pos = Math.max(0, pos - regen * (vit / 100) * DT);
        pos = Math.min(100, pos); vit = Math.max(0, vit); hp = Math.max(0, hp);
        if (pos >= 100) { end = t; how = 'deathblow'; }
        else if (vit <= 0) { end = t; how = 'vitality'; }
        else if (hp <= 0) { end = t; how = 'fell'; }
      }
      pts.push({ t, vit, pos, hp });
    }
    return { pts, ev, end, how };
  }
  const at = (r, t) => r.pts[clamp(Math.round(t / DT), 0, r.pts.length - 1)];
  const verdict = r => r.end === null ? 'still fighting at 30 s' : r.how === 'deathblow' ? `deathblow at ${r.end.toFixed(1)} s` : r.how === 'vitality' ? `vitality emptied at ${r.end.toFixed(1)} s` : `you fall at ${r.end.toFixed(1)} s`;
  function postureBar(g, cx, y, w, v) {
    rr(g, cx - w / 2, y, w, 10, 5, 'rgba(38,44,106,.14)');
    const f = v / 100, col = f > 0.75 ? '#e5322d' : POS;
    rr(g, cx - w / 2 * f, y, w * f, 10, 5, col);
    g.fillStyle = C.navy; g.fillRect(cx - 1, y - 2, 2, 14);
  }
  function drawSekiro(g, runs, t) {
    bg(g);
    const X0 = 300, X1 = 1015, px = v => X0 + (X1 - X0) * v / SPAN;
    runs.forEach((r, k) => {
      const st = STYLES[k], y0 = 14 + k * 185, ch = 112, py = v => y0 + 30 + ch - ch * v / 100;
      const tt = Math.min(t, r.end ?? SPAN), p = at(r, tt);
      txt(g, st.name, 20, y0 + 14, { font: '800 17px Montserrat' });
      txt(g, st.rule, 20, y0 + 34, { font: '600 12px Jost', col: C.muted });
      // live bars, Sekiro style: vitality bar, posture centred above it
      txt(g, 'enemy posture', 20, y0 + 62, { font: '700 11px Jost', col: C.muted }); postureBar(g, 145, y0 + 72, 250, p.pos);
      txt(g, 'enemy vitality', 20, y0 + 98, { font: '700 11px Jost', col: C.muted });
      rr(g, 20, y0 + 108, 250, 10, 4, 'rgba(38,44,106,.14)'); rr(g, 20, y0 + 108, 250 * p.vit / 100, 10, 4, VIT);
      txt(g, 'your health', 20, y0 + 134, { font: '700 11px Jost', col: C.muted });
      rr(g, 20, y0 + 144, 250, 8, 4, 'rgba(38,44,106,.14)'); rr(g, 20, y0 + 144, 250 * p.hp / 100, 8, 4, YOU);
      // chart
      g.fillStyle = 'rgba(239,230,210,.55)'; g.fillRect(X0, y0 + 30, X1 - X0, ch);
      g.strokeStyle = 'rgba(38,44,106,.12)'; g.lineWidth = 1; for (let s = 0; s <= SPAN; s += 5) { g.beginPath(); g.moveTo(px(s), y0 + 30); g.lineTo(px(s), y0 + 30 + ch); g.stroke(); }
      [['hp', YOU, 2], ['vit', VIT, 3], ['pos', POS, 3]].forEach(([f, col, lw]) => {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
        r.pts.forEach((q, i) => { if (q.t > tt) return; i ? g.lineTo(px(q.t), py(q[f])) : g.moveTo(px(q.t), py(q[f])); }); g.stroke();
      });
      // event strip
      r.ev.forEach(([e, kind]) => {
        if (e > tt) return; const x = px(e), y = y0 + 30 + ch + 12;
        if (kind === 'defl') { g.fillStyle = POS; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.fill(); }
        else if (kind === 'land') { g.fillStyle = VIT; g.fillRect(x - 1.5, y - 6, 3, 12); }
        else if (kind === 'guard') { g.fillStyle = 'rgba(38,44,106,.35)'; g.fillRect(x - 1, y - 4, 2, 8); }
        else { g.strokeStyle = YOU; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x + 4, y - 4); g.lineTo(x - 4, y + 4); g.stroke(); }
      });
      g.strokeStyle = C.navy; g.lineWidth = 1.5; g.strokeRect(X0, y0 + 30, X1 - X0, ch);
      if (r.end !== null && t >= r.end) {
        const lab = r.how === 'fell' ? `You fall · ${r.end.toFixed(1)} s` : r.how === 'deathblow' ? `Deathblow · ${r.end.toFixed(1)} s` : `Vitality empty · ${r.end.toFixed(1)} s`;
        const x = px(r.end), col = r.how === 'fell' ? YOU : C.good;
        g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y0 + 30); g.lineTo(x, y0 + 30 + ch); g.stroke();
        g.font = '800 14px Montserrat'; const w = g.measureText(lab).width + 16, bx = Math.min(x + 6, X1 - w - 4);
        rr(g, bx, y0 + 38, w, 24, 6, col); txt(g, lab, bx + 8, y0 + 51, { font: '800 14px Montserrat', col: '#fff' });
      } else if (t < SPAN) { g.strokeStyle = 'rgba(21,32,68,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px(t), y0 + 30); g.lineTo(px(t), y0 + 30 + ch); g.stroke(); }
      if (k === 0) [0, 10, 20, 30].forEach(s => txt(g, s + ' s', px(s), y0 + 20, { font: '600 11px Jost', col: C.muted, align: 'center' }));
    });
    const ly = H - 8; let lx = X0;
    [['vitality', VIT], ['posture', POS], ['your health', YOU]].forEach(([n, col]) => { g.fillStyle = col; g.fillRect(lx, ly - 2, 18, 4); txt(g, n, lx + 24, ly, { font: '600 12px Jost', col: C.muted }); lx += 110; });
    txt(g, '◆ deflect   ▮ strike lands   ▯ strike into guard   ✕ hit taken', X1, ly, { font: '600 12px Jost', col: C.muted, align: 'right' });
  }
  canvasDemo('sekiro', (s, cv, g) => {
    const st = { regen: 14, tour: true, held: false, t: 0, key: '' }, tourBtn = $(s, '.sk-tour'), rng = $(s, '.sk-r');
    let runs = STYLES.map(x => sekiro(x.key, st.regen));
    const rerun = () => { runs = STYLES.map(x => sekiro(x.key, st.regen)); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.regen = 14; rng.value = 14; rerun(); tourBtn.classList.add('on'); };
    rng.oninput = () => { st.tour = false; tourBtn.classList.remove('on'); st.regen = +rng.value; rerun(); st.t = 0; };
    function info(cap) {
      const k = cap + st.regen; if (k === st.key) return; st.key = k; $(s, '.sk-rv').textContent = st.regen;
      say($(s, '.sk-stats'), runs.map((r, i) => `<div class="${r.how === 'fell' ? 'r' : r.end === null ? 'y' : 'g'}"><b>${r.end === null ? '30+' : r.end.toFixed(1)}</b><span>${STYLES[i].name}: ${verdict(r)}</span></div>`).join(''));
      say($(s, '.sk-out'), cap);
    }
    const DUR = 34;
    const cap = t => t < 8 ? 'All three lanes face the same enemy, swinging every two seconds. Watch the posture bar in the middle lane: each deflect fills it, and it drains back between swings.'
      : t < 16 ? 'Deflect and press fills posture faster than it recovers, and every strike that lands lowers vitality, which slows that recovery further.'
      : t < 24 ? 'Trading hits only works on vitality, and you take a hit every swing. Deflecting alone never gets there at full vitality.'
      : 'Two bars give two routes to the same kill. The posture recovery rate decides which route the fight rewards: try it at 0.';
    s._seek = t => { if (st.regen !== 14) { st.regen = 14; rerun(); } drawSekiro(g, runs, Math.min(SPAN, t)); info(cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      drawSekiro(g, runs, Math.min(SPAN, st.t));
      info(st.regen === 0 ? 'At 0 recovery, posture never drains, so deflecting alone wins without a single strike.' : `Posture recovers ${st.regen} per second at full vitality, and less as vitality drops. ${runs[1].end === null ? 'Deflecting alone cannot outpace it.' : 'Deflecting alone now gets the deathblow.'}`);
    };
  });

  /* ---------- 2. Halo ---------- */
  const SH = C.shield, HP = '#d8603a', FIGHTS = [[1, 3, 25], [7, 9, 30], [12.5, 15, 32], [19.5, 21.5, 30], [26, 28, 26]];
  function halo(shieldMax, hpMax, delay, rate) {
    let sh = shieldMax, hp = hpMax, last = -99, end = null; const pts = [];
    for (let t = 0; t <= SPAN + 1e-9; t += DT) {
      if (end === null) {
        const f = FIGHTS.find(([a, b]) => t >= a && t < b);
        if (f) { let d = f[2] * DT; last = t; const s1 = Math.min(sh, d); sh -= s1; d -= s1; hp -= d; }
        else if (shieldMax && t - last >= delay) sh = Math.min(shieldMax, sh + rate * DT);
        if (hp <= 0) { hp = 0; end = t; }
      }
      pts.push({ t, sh, hp });
    }
    return { pts, end, shieldMax, hpMax };
  }
  function drawHalo(g, runs, t, delay) {
    bg(g);
    const X0 = 300, X1 = 1015, px = v => X0 + (X1 - X0) * v / SPAN;
    const NAMES = [['One bar', '115 health, nothing comes back'], ['Shield over health', '70 shield that refills, over 45 health']];
    runs.forEach((r, k) => {
      const y0 = 20 + k * 270, ch = 180, py = v => y0 + 40 + ch - ch * v / 115, tt = Math.min(t, r.end ?? SPAN), p = at(r, tt);
      txt(g, NAMES[k][0], 20, y0 + 14, { font: '800 17px Montserrat' });
      txt(g, NAMES[k][1], 20, y0 + 34, { font: '600 12px Jost', col: C.muted });
      // HUD bars
      const bw = 250;
      if (r.shieldMax) {
        txt(g, 'shield', 20, y0 + 66, { font: '700 11px Jost', col: C.muted });
        rr(g, 20, y0 + 76, bw, 16, 4, 'rgba(38,44,106,.14)'); rr(g, 20, y0 + 76, bw * p.sh / r.shieldMax, 16, 4, SH);
        const since = tt - (r.pts.slice(0, Math.round(tt / DT) + 1).reduce((a, q, i, arr) => i && arr[i - 1].sh > q.sh + 1e-9 || (i && arr[i - 1].hp > q.hp + 1e-9) ? q.t : a, -99));
        if (p.sh < r.shieldMax - 0.01 && r.end === null || (r.end !== null && t < r.end && p.sh < r.shieldMax - 0.01)) {
          const f = clamp(since / delay, 0, 1); txt(g, f < 1 ? `recharge in ${(delay - since).toFixed(1)} s` : 'recharging', 20 + bw, y0 + 66, { font: '700 11px Jost', col: f < 1 ? C.muted : SH, align: 'right' });
        }
      }
      txt(g, 'health', 20, y0 + 110, { font: '700 11px Jost', col: C.muted });
      const segs = Math.round(r.hpMax / 5), sw = bw / 23;
      for (let i = 0; i < segs; i++) { const on = p.hp > i * 5 + 0.01; rr(g, 20 + i * sw, y0 + 120, sw - 2, 14, 2, on ? HP : 'rgba(38,44,106,.14)'); }
      // chart: stacked area
      g.fillStyle = 'rgba(239,230,210,.55)'; g.fillRect(X0, y0 + 40, X1 - X0, ch);
      FIGHTS.forEach(([a, b]) => { g.fillStyle = 'rgba(229,50,45,.10)'; g.fillRect(px(a), y0 + 40, px(b) - px(a), ch); if (k === 0) txt(g, 'under fire', (px(a) + px(b)) / 2, y0 + 30, { font: '600 11px Jost', col: C.red, align: 'center' }); });
      const vis = r.pts.filter(q => q.t <= tt);
      const area = (top, bot, col) => { g.fillStyle = col; g.beginPath(); vis.forEach((q, i) => i ? g.lineTo(px(q.t), py(top(q))) : g.moveTo(px(q.t), py(top(q)))); for (let i = vis.length - 1; i >= 0; i--) g.lineTo(px(vis[i].t), py(bot(vis[i]))); g.fill(); };
      if (vis.length > 1) { area(q => q.hp, () => 0, HP); if (r.shieldMax) area(q => q.hp + q.sh, q => q.hp, SH); }
      g.strokeStyle = C.navy; g.lineWidth = 1.5; g.strokeRect(X0, y0 + 40, X1 - X0, ch);
      txt(g, '115', X0 - 6, py(115), { font: '600 11px Jost', col: C.muted, align: 'right' }); txt(g, '0', X0 - 6, py(0), { font: '600 11px Jost', col: C.muted, align: 'right' });
      if (r.end !== null && t >= r.end) {
        const x = px(r.end), lab = `Down at ${r.end.toFixed(1)} s`;
        g.font = '800 14px Montserrat'; const w = g.measureText(lab).width + 16; rr(g, Math.min(x + 6, X1 - w - 4), y0 + 50, w, 24, 6, C.red); txt(g, lab, Math.min(x + 6, X1 - w - 4) + 8, y0 + 63, { font: '800 14px Montserrat', col: '#fff' });
      } else if (t >= SPAN) {
        const lab = `Standing · ${Math.round(p.hp)} health left`; g.font = '800 14px Montserrat'; const w = g.measureText(lab).width + 16; rr(g, X1 - w - 6, y0 + 50, w, 24, 6, C.good); txt(g, lab, X1 - w + 2, y0 + 63, { font: '800 14px Montserrat', col: '#fff' });
      } else { g.strokeStyle = 'rgba(21,32,68,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px(t), y0 + 40); g.lineTo(px(t), y0 + 40 + ch); g.stroke(); }
      [0, 10, 20, 30].forEach(s => txt(g, s + ' s', px(s), y0 + 40 + ch + 12, { font: '600 11px Jost', col: C.muted, align: 'center' }));
    });
  }
  canvasDemo('halo', (s, cv, g) => {
    const st = { delay: 3, tour: true, held: false, t: 0, key: '' }, tourBtn = $(s, '.ha-tour'), rng = $(s, '.ha-d');
    const mk = d => [halo(0, 115, d, 0), halo(70, 45, d, 70)];
    let runs = mk(3);
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.delay = 3; rng.value = 3; runs = mk(3); tourBtn.classList.add('on'); };
    rng.oninput = () => { st.tour = false; tourBtn.classList.remove('on'); st.delay = +rng.value; runs = mk(st.delay); st.t = 0; };
    const res = r => r.end !== null ? `down at ${r.end.toFixed(1)} s` : `standing, ${Math.round(r.pts[r.pts.length - 1].hp)} health left`;
    function info(cap) {
      const k = cap + st.delay; if (k === st.key) return; st.key = k; $(s, '.ha-dv').textContent = st.delay.toFixed(1) + ' s';
      say($(s, '.ha-stats'), runs.map((r, i) => `<div class="${r.end !== null ? 'r' : 'g'}"><b>${r.end !== null ? r.end.toFixed(1) + ' s' : Math.round(r.pts[r.pts.length - 1].hp)}</b><span>${i ? 'shield over health' : 'one bar'}: ${res(r)}</span></div>`).join(''));
      say($(s, '.ha-out'), cap);
    }
    const DUR = 34;
    const cap = t => t < 6 ? 'Both soldiers take the same first firefight: 50 damage. The top one keeps the loss; the bottom one loses only shield.'
      : t < 13 ? 'Three seconds after the last hit, the shield starts to refill. Breaking line of sight is now worth something, and the bar shows it.'
      : t < 22 ? 'The one-bar soldier goes down in the third fight. The other spends a little health when a fight outlasts the shield, and keeps going.'
      : 'Same 115 points either way. The recharge delay is the lever: drag it to 4 seconds and the shield never comes back in time.';
    s._seek = t => { if (st.delay !== 3) { st.delay = 3; runs = mk(3); } drawHalo(g, runs, Math.min(SPAN, t), 3); info(cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      drawHalo(g, runs, Math.min(SPAN, st.t), st.delay);
      info(`Recharge delay ${st.delay.toFixed(1)} s. ${runs[1].end === null ? 'The gaps between fights are long enough for the shield to return.' : 'The gaps between fights are now too short, so the shield stops helping.'}`);
    };
  });
})();
