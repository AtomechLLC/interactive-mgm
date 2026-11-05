/* Stable part vs variance (Module 8, Part 4, slide 185).
   Three damage rolls, 1d8+4, 8+1d4 and 10+1d2, each rolled from a seeded generator into a histogram on one shared
   damage axis, so the spread visibly tightens as more of the damage is fixed. Rolls are precomputed per seed and the
   walk-through reveals them as a function of t only, so __seek is deterministic. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, MAXN = 1000;
  const ROLLS = [
    { name: '1d8 + 4', fixed: 4, die: 8, col: '#e5322d' },
    { name: '8 + 1d4', fixed: 8, die: 4, col: '#e0a92d' },
    { name: '10 + 1d2', fixed: 10, die: 2, col: '#2ea3dc' },
  ];
  ROLLS.forEach(r => { r.lo = r.fixed + 1; r.hi = r.fixed + r.die; r.avg = r.fixed + (r.die + 1) / 2; r.share = r.fixed / r.avg; });
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const cache = {};
  const rollsFor = seed => cache[seed] || (cache[seed] = ROLLS.map((r, k) => { const rnd = mulberry(seed * 7919 + k * 104729 + 1); return Array.from({ length: MAXN }, () => r.fixed + 1 + Math.floor(rnd() * r.die)); }));
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const VLO = 4, VHI = 13, HX = 300, HW = 710, RH = 180, BW = HW / (VHI - VLO + 1);
  const vx = v => HX + (v - VLO) * BW;

  function draw(g, seed, n, t, total) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const all = rollsFor(seed), counts = all.map((arr, k) => { const c = {}; for (let i = 0; i < n; i++) c[arr[i]] = (c[arr[i]] || 0) + 1; return c; });
    // shared y scale: the expected peak at the full roll count (the 1d2 row), so bars grow as rolls land
    const ymax = Math.max(total / 2 * 1.25, ...counts.flatMap(c => Object.values(c)));
    ROLLS.forEach((r, k) => {
      const y0 = 14 + k * (RH + 6), base = y0 + RH - 30, top = y0 + 24, c = counts[k];
      g.fillStyle = k % 2 ? 'rgba(239,230,210,.55)' : 'rgba(239,230,210,.9)'; g.beginPath(); g.roundRect(10, y0, W - 20, RH, 12); g.fill();
      // label block
      txt(g, r.name, 26, y0 + 34, { font: '800 30px Montserrat, Jost, sans-serif', col: r.col });
      txt(g, `range ${r.lo} to ${r.hi} · average ${r.avg}`, 26, y0 + 68, { font: '600 15px Jost, sans-serif', col: C.ink });
      // fixed vs random share of the average
      const bx = 26, by = y0 + 92, bw = 240;
      g.fillStyle = C.navy; g.fillRect(bx, by, bw * r.share, 22); g.fillStyle = r.col; g.globalAlpha = .45; g.fillRect(bx + bw * r.share, by, bw * (1 - r.share), 22); g.globalAlpha = 1;
      g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(bx, by, bw, 22);
      txt(g, `fixed ${Math.round(r.share * 100)}%`, bx + 8, by + 12, { font: '700 13px Jost, sans-serif', col: '#fff' });
      txt(g, 'of the average', bx, by + 40, { font: '500 13px Jost, sans-serif', col: C.muted });
      let sum = 0; for (let i = 0; i < n; i++) sum += all[k][i];
      txt(g, n ? `rolled mean ${(sum / n).toFixed(2)}` : 'no rolls yet', bx + bw, by + 40, { font: '600 13px Jost, sans-serif', col: C.ink, align: 'right' });
      // axis + bars
      g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(HX, base); g.lineTo(HX + HW, base); g.stroke();
      for (let v = VLO; v <= VHI; v++) {
        const x = vx(v), cnt = c[v] || 0, h = cnt / ymax * (base - top), inR = v >= r.lo && v <= r.hi;
        if (inR) { g.fillStyle = 'rgba(38,44,106,.06)'; g.fillRect(x + 3, top, BW - 6, base - top); }
        g.fillStyle = r.col; g.fillRect(x + 6, base - h, BW - 12, h);
        if (cnt) txt(g, String(cnt), x + BW / 2, base - h - 10, { font: '700 13px Jost, sans-serif', align: 'center' });
        txt(g, String(v), x + BW / 2, base + 14, { font: `${inR ? 700 : 500} 13px Jost, sans-serif`, col: inR ? C.ink : '#b3a988', align: 'center' });
      }
      // average marker
      const ax = vx(r.avg) + BW / 2; g.setLineDash([6, 5]); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, top - 6); g.lineTo(ax, base); g.stroke(); g.setLineDash([]);
      T.label('avg ' + r.avg, ax, top - 8, 'center', C.navy, 12);
      // latest roll pop
      if (n > 0 && t != null) { const v = all[k][n - 1], age = (t * 20) % 1; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.roundRect(vx(v) + 3, top, BW - 6, base - top, 6); g.globalAlpha = .6; g.stroke(); g.globalAlpha = 1; }
    });
    txt(g, 'damage dealt', HX + HW / 2, H - 10, { font: '700 13px Montserrat, Jost, sans-serif', col: C.muted, align: 'center' });
  }
  // walk-through: 200 rolls land over 13 s, slow at first, then hold
  const DUR = 20, N = 200, ROLL_T = 13;
  const tourN = t => Math.round(N * clamp(Math.pow(t / ROLL_T, 1.8)));
  const tourCap = t => t < 3 ? 'Each readout rolls once per hit. Early on, a few rolls say little about the shape.'
    : t < ROLL_T ? 'As the rolls pile up, the shapes appear. Same kind of hit, three very different spreads.'
    : t < 17 ? 'All three average between 8.5 and 11.5. What changes is how much of each hit is fixed: 47%, 76% and 87% of the average.'
    : 'Decide what percent of a value you want to be stable and what percent you want to be unpredictable.';
  canvasDemo('dice', (s, cv, g) => {
    const st = { seed: 1, n: N, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.dv-tour'), rng = $(s, '.dv-n');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.n = +rng.value; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.seed = 1; tourBtn.classList.add('on'); };
    $(s, '.dv-reroll').onclick = () => { manual(); st.seed++; };
    rng.oninput = () => { manual(); st.n = +rng.value; };
    function info(n, cap) {
      const key = n + '|' + st.seed + cap; if (key === st.key) return; st.key = key;
      $(s, '.dv-nv').textContent = n;
      say($(s, '.dv-stats'), ROLLS.map((r, k) => `<div class="${['r', 'y', ''][k]}"><b>${r.lo}-${r.hi}</b><span>${r.name}: ${Math.round(r.share * 100)}% fixed, spread of ${r.die - 1}</span></div>`).join(''));
      say($(s, '.dv-out'), cap);
    }
    s._seek = t => { const n = tourN(t); draw(g, 1, n, t < ROLL_T ? t : null, N); info(n, tourCap(t)); };
    window.__seek = (t) => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); }
      else { draw(g, st.seed, st.n, null, st.n); info(st.n, `${st.n} rolls each, seed ${st.seed}. Reroll to see how much the shapes wobble. With fewer rolls, even the 1d2 can look lopsided.`); }
    };
  });
})();
