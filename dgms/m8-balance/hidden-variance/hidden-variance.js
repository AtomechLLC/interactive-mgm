/* Hidden variance (mock-up for DGMS M8, beside Stable part vs variance).
   1. Fire Emblem's two-roll hit: displayed vs true hit for one roll and the average of two, exact from all 10,000 pairs,
      plus 100 seeded attacks at the chosen displayed hit, rolled both ways.
   2. XCOM's hidden aim assist: twenty squads take twelve 65% shots; with assist, each miss in a row adds a bonus to the
      next shot. Rows of hits and misses, and the longest losing streak, with and without. All rolls are seeded. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const bg = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };

  /* ---------- 1. Fire Emblem ---------- */
  const TRUE2 = Array.from({ length: 101 }, (_, h) => { let n = 0; for (let a = 0; a < 100; a++) for (let b = 0; b < 100; b++) if ((a + b) / 2 < h) n++; return n / 100; });
  const ONE = '#e0a92d', TWO = '#2ea3dc';
  function fe(g, h, seed, shown) {
    bg(g);
    const X = 70, Y = 40, S = 440, px = v => X + S * v / 100, py = v => Y + S - S * v / 100;
    g.fillStyle = 'rgba(239,230,210,.7)'; g.fillRect(X, Y, S, S);
    g.strokeStyle = 'rgba(38,44,106,.15)'; g.lineWidth = 1; for (let v = 0; v <= 100; v += 10) { g.beginPath(); g.moveTo(px(v), Y); g.lineTo(px(v), Y + S); g.moveTo(X, py(v)); g.lineTo(X + S, py(v)); g.stroke(); }
    g.strokeStyle = ONE; g.lineWidth = 4; g.beginPath(); g.moveTo(px(0), py(0)); g.lineTo(px(100), py(100)); g.stroke();
    g.strokeStyle = TWO; g.lineWidth = 4; g.beginPath(); TRUE2.forEach((v, i) => i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v))); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(X, Y, S, S);
    [0, 25, 50, 75, 100].forEach(v => { txt(g, v + '%', px(v), Y + S + 16, { font: '600 12px Jost', col: C.muted, align: 'center' }); txt(g, v + '%', X - 8, py(v), { font: '600 12px Jost', col: C.muted, align: 'right' }); });
    txt(g, 'displayed hit', X + S / 2, Y + S + 36, { font: '700 13px Jost', col: C.muted, align: 'center' });
    g.save(); g.translate(X - 46, Y + S / 2); g.rotate(-Math.PI / 2); txt(g, 'how often it lands', 0, 0, { font: '700 13px Jost', col: C.muted, align: 'center' }); g.restore();
    const t2 = TRUE2[h];
    g.setLineDash([5, 4]); g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px(h), Y + S); g.lineTo(px(h), py(t2)); g.lineTo(X, py(t2)); g.stroke(); g.setLineDash([]);
    g.fillStyle = TWO; g.beginPath(); g.arc(px(h), py(t2), 8, 0, TAU); g.fill(); g.fillStyle = ONE; g.beginPath(); g.arc(px(h), py(h), 7, 0, TAU); g.fill();
    T.label(`${h}% shown → ${t2.toFixed(1)}% real`, px(h) + (h > 60 ? -10 : 10), py(t2) - 18, h > 60 ? 'right' : 'left', C.navy, 14);
    g.fillStyle = 'rgba(255,253,246,.92)'; g.fillRect(X + S - 270, Y + S - 58, 262, 50);
    txt(g, '— one roll: what you see is what you get', X + S - 260, Y + S - 42, { font: '700 13px Jost', col: ONE });
    txt(g, '— average of two rolls', X + S - 260, Y + S - 22, { font: '700 13px Jost', col: TWO });
    // 100 attacks each way
    const R = mulberry(seed * 977 + 5), rows = Array.from({ length: 100 }, () => { const a = Math.floor(R() * 100), b = Math.floor(R() * 100), c = Math.floor(R() * 100); return [a < h, (b + c) / 2 < h]; });
    const AX = 560;
    [['One roll', 0, ONE], ['Two rolls, averaged', 1, TWO]].forEach(([name, k, col], j) => {
      const y0 = 40 + j * 250; let hits = 0;
      txt(g, name, AX, y0, { font: '800 18px Montserrat', col });
      for (let i = 0; i < 100; i++) { const on = i < shown, hit = rows[i][k]; if (on && hit) hits++; const cx = AX + 12 + (i % 20) * 22, cy = y0 + 34 + Math.floor(i / 20) * 26; g.fillStyle = !on ? 'rgba(38,44,106,.08)' : hit ? col : '#fff'; g.strokeStyle = !on ? 'transparent' : hit ? col : C.red; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 9, 0, TAU); g.fill(); g.stroke(); if (on && !hit) { g.strokeStyle = C.red; g.beginPath(); g.moveTo(cx - 5, cy - 5); g.lineTo(cx + 5, cy + 5); g.moveTo(cx + 5, cy - 5); g.lineTo(cx - 5, cy + 5); g.stroke(); } }
      txt(g, `${hits} of ${shown} land · ${shown - hits} miss`, AX, y0 + 176, { font: '700 15px Jost' });
    });
  }
  canvasDemo('fe', (s, cv, g) => {
    const st = { h: 80, seed: 1, tour: true, held: false, t: 0, key: '' }, tourBtn = $(s, '.fe-tour'), rng = $(s, '.fe-h');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.seed = 1; tourBtn.classList.add('on'); };
    rng.oninput = () => { manual(); st.h = +rng.value; st.t = 0; };
    $(s, '.fe-roll').onclick = () => { manual(); st.seed++; st.t = 0; };
    function info(h, cap) {
      const k = h + cap; if (k === st.key) return; st.key = k; $(s, '.fe-hv').textContent = h + '%'; rng.value = h;
      say($(s, '.fe-stats'), `<div class="y"><b>${h}%</b><span>one roll: lands as often as shown</span></div><div><b>${TRUE2[h].toFixed(1)}%</b><span>two rolls averaged at the same ${h}%</span></div>`);
      say($(s, '.fe-out'), cap);
    }
    const STOPS = [[0, 80], [7, 20], [14, 50], [20, 95]];
    const CAPS = { 80: 'At a displayed 80, averaging two rolls lands about 92 times in 100. The sure thing feels sure.', 20: 'At a displayed 20, it lands about 8 times in 100. Long shots rarely surprise the player, or the enemy.', 50: 'At 50 the two curves meet: averaging only bends the tails, never the middle.', 95: 'At 95, two rolls land 99.5% of the time. The famous missed 95 nearly disappears.' };
    s._seek = t => { const stop = STOPS.filter(([a]) => a <= t).pop(), h = stop[1], lt = t - stop[0]; fe(g, h, 1, Math.min(100, Math.floor(lt * 25))); info(h, CAPS[h]); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => 26;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= 26) st.t = 0; s._seek(st.t); return; }
      fe(g, st.h, st.seed, Math.min(100, Math.floor(st.t * 25)));
      info(st.h, `Displayed ${st.h}%: one roll lands ${st.h}% of the time, two averaged rolls ${TRUE2[st.h].toFixed(1)}%. The player only ever sees the first number.`);
    };
  });

  /* ---------- 2. XCOM ---------- */
  const SQ = 20, SH = 12, BASE = 65;
  function squads(seed, bonus) {
    const R = mulberry(seed * 4241 + 11), rolls = Array.from({ length: SQ * SH }, () => R() * 100);
    const run = b => Array.from({ length: SQ }, (_, i) => { let streak = 0; return Array.from({ length: SH }, (_, j) => { const ch = Math.min(100, BASE + b * streak), hit = rolls[i * SH + j] < ch; streak = hit ? 0 : streak + 1; return { hit, ch }; }); });
    return [run(0), run(bonus)];
  }
  const longest = rows => Math.max(...rows.map(r => { let m = 0, c = 0; r.forEach(x => { c = x.hit ? 0 : c + 1; m = Math.max(m, c); }); return m; }));
  const rate = rows => rows.flat().filter(x => x.hit).length / (SQ * SH);
  function xcom(g, seed, bonus, shown) {
    bg(g);
    const [plain, help] = squads(seed, bonus);
    [['Shown 65%, rolled 65%', plain, '#e5322d'], [`Each miss adds +${bonus}% to the next shot`, help, '#1a8a4c']].forEach(([name, rows, col], k) => {
      const x0 = 24 + k * 510; txt(g, name, x0, 30, { font: '800 17px Montserrat', col });
      rows.forEach((r, i) => {
        let c = 0;
        r.forEach((x, j) => {
          const on = i * SH + j < shown, cx = x0 + 22 + j * 34, cy = 64 + i * 24;
          c = x.hit ? 0 : c + 1;
          g.fillStyle = !on ? 'rgba(38,44,106,.07)' : x.hit ? '#2ea3dc' : c >= 3 ? '#e5322d' : '#f2c9c6'; g.beginPath(); g.roundRect(cx - 14, cy - 9, 28, 18, 5); g.fill();
          if (on && x.ch > BASE) txt(g, Math.round(x.ch) + '', cx, cy + 1, { font: '700 10px Jost', col: x.hit ? '#fff' : C.navy, align: 'center' });
        });
      });
      const vis = rows.map((r, i) => r.filter((_, j) => i * SH + j < shown)).filter(r => r.length);
      if (vis.length) { const n = vis.flat().length, h = vis.flat().filter(x => x.hit).length; txt(g, `${Math.round(100 * h / n)}% landed · longest losing streak ${longest(vis)}`, x0, H - 26, { font: '700 15px Jost' }); }
    });
    txt(g, 'blue: hit · pink: miss · red: third miss in a row or more · small numbers: the boosted chance', W / 2, H - 6, { font: '600 11px Jost', col: C.muted, align: 'center' });
  }
  canvasDemo('xcom', (s, cv, g) => {
    const st = { b: 10, seed: 1, tour: true, held: false, t: 0, key: '' }, tourBtn = $(s, '.xc-tour'), rng = $(s, '.xc-b');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.seed = 1; st.b = 10; rng.value = 10; tourBtn.classList.add('on'); };
    rng.oninput = () => { manual(); st.b = +rng.value; st.t = 99; };
    $(s, '.xc-roll').onclick = () => { manual(); st.seed++; st.t = 0; };
    function info(cap) {
      const k = cap + st.b + st.seed; if (k === st.key) return; st.key = k; $(s, '.xc-bv').textContent = '+' + st.b + '%';
      const [p, h] = squads(st.seed, st.b);
      say($(s, '.xc-stats'), `<div class="r"><b>${longest(p)}</b><span>longest losing streak, plain (${Math.round(rate(p) * 100)}% landed)</span></div><div class="g"><b>${longest(h)}</b><span>with +${st.b}% per miss (${Math.round(rate(h) * 100)}% landed)</span></div>`);
      say($(s, '.xc-out'), cap);
    }
    const ALL = SQ * SH;
    s._seek = t => { const n = Math.min(ALL, Math.floor(t * 18)); xcom(g, 1, 10, n); info(t < 8 ? 'Twenty squads, twelve shots each, every one shown as 65%. Watch for the red runs: three or more misses in a row.' : t < 16 ? 'On the right, each miss quietly raises the next shot. The red runs get shorter; the overall hit rate rises only a little.' : 'The player sees 65% either way. The design choice is which tail of the variance they live through.'); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => 22;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= 22) st.t = 0; s._seek(st.t); return; }
      xcom(g, st.seed, st.b, Math.min(ALL, Math.floor(st.t * 18)));
      info(`Seed ${st.seed}, +${st.b}% per miss in a row. Raise the bonus and the streaks vanish; at +0 the two sides match.`);
    };
  });
})();
