/* Hits-to-kill bench (Module 8, Part 4, slides 117-139 and 159-162).
   Slide 1: two attackers with editable damage and swing interval race an enemy at a chosen HP, and step charts plot hits
   to kill and time to kill against HP for both, so equal DPS still shows steps that fall out of line (150 / 200 / 205).
   Slide 2: effective damage, melee 1200 HP / 125 DPS vs ranged 1000 HP / 100 DPS under one 100 DPS monster.
   Slide 3: Ori-style pricing: each zone's spirit light is split across its purchases by weight.
   Every frame is drawn from (state, t) only, so __seek(t, which) is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const GL = {}; Object.entries(window.HTK_GLYPHS).forEach(([k, d]) => { GL[k] = new Path2D(d); });
  const COL = { a: C.player, b: C.p3, m: C.player, r: C.p2, mon: C.red };
  const fmt = (v, d = 0) => (+v).toFixed(d).replace(/\.0+$/, '');
  const sec = v => fmt(v, Math.abs(v - Math.round(v)) < 1e-6 ? 0 : 2).replace(/(\.\d)0$/, '$1') + ' s';

  function glyph(g, k, x, y, s, col) { g.save(); g.translate(x - s / 2, y - s / 2); g.scale(s / 512, s / 512); g.fillStyle = col; g.fill(GL[k]); g.restore(); }
  function txt(g, s, x, y, o = {}) {
    g.font = `${o.w || 600} ${o.size || 14}px ${o.disp ? 'Montserrat, Jost' : 'Jost'}, sans-serif`;
    g.fillStyle = o.col || C.ink; g.textAlign = o.al || 'left'; g.textBaseline = o.bl || 'alphabetic'; g.fillText(s, x, y);
  }
  function panel(g, x, y, w, h, col = '#efe6d2') { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); }
  function bg(g) { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.88)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }
  function disc(g, x, y, r, col, k) { g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); glyph(g, k, x, y, r * 1.25, '#fff'); }
  function dashV(g, x, y0, y1, col, w = 1.5) { g.strokeStyle = col; g.lineWidth = w; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); g.setLineDash([]); }

  // ---------- generic slider binding: input[data-k] writes st[k], b[data-v] shows it ----------
  function bindSliders(s, st, onManual, show) {
    const ins = $$(s, 'input[type=range][data-k]');
    ins.forEach(i => i.addEventListener('input', () => { onManual(); st[i.dataset.k] = +i.value; }));
    return () => ins.forEach(i => { const k = i.dataset.k; if (+i.value !== st[k]) i.value = st[k]; const b = $(s, `[data-v="${k}"]`); if (b) b.textContent = show(k, st[k]); });
  }
  const scenes = {};

  /* ================= 1. the bench ================= */
  const PRESETS = [{ ad: 25, ai: 1, bd: 50, bi: 2 }, { ad: 25, ai: 1, bd: 100, bi: 4 }];
  const MARKS = [150, 200, 205], HPMAX = 400;
  const kill = (d, i, hp, inst) => { const n = Math.ceil(hp / d); return { n, t: (inst ? n - 1 : n) * i }; };
  const hitTimes = (d, i, hp, inst) => { const { n } = kill(d, i, hp, inst); return Array.from({ length: n }, (_, k) => (inst ? k : k + 1) * i); };

  function drawBench(g, st, rt) {
    bg(g);
    const A = { d: st.ad, i: st.ai, col: COL.a, k: 'sword', name: 'A' }, B = { d: st.bd, i: st.bi, col: COL.b, k: 'bow', name: 'B' };
    const kA = kill(A.d, A.i, st.hp, st.inst), kB = kill(B.d, B.i, st.hp, st.inst);
    // race panel
    panel(g, 12, 12, W - 24, 196);
    txt(g, `Race to ${st.hp} HP`, 28, 38, { w: 800, size: 16, disp: 1 });
    const tMax = Math.max(1, kA.t, kB.t) * 1.06 + .2, x0 = 262, x1 = W - 40, X = t => x0 + (x1 - x0) * t / tMax;
    const step = tMax > 24 ? 4 : tMax > 12 ? 2 : tMax > 5 ? 1 : .5;
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    for (let t = 0; t <= tMax + 1e-6; t += step) { g.fillStyle = 'rgba(93,97,140,.22)'; g.fillRect(X(t), 52, 1, 140); g.fillStyle = C.muted; g.fillText(sec(t), X(t), 202); }
    [[A, kA, 82], [B, kB, 150]].forEach(([P, K, y]) => {
      disc(g, 44, y, 20, P.col, P.k);
      txt(g, `${P.name}: ${P.d} every ${sec(P.i)}`, 74, y - 6, { w: 700, size: 15 });
      txt(g, `${fmt(P.d / P.i, 1)} DPS`, 74, y + 13, { size: 13, col: C.muted });
      // enemy HP left, at the race time
      const times = hitTimes(P.d, P.i, st.hp, st.inst), landed = times.filter(t => t <= rt + 1e-9).length, left = Math.max(0, st.hp - landed * P.d);
      const bx = 150, bw = 92; g.fillStyle = '#5a1f1c'; g.fillRect(bx, y + 20, bw, 7); g.fillStyle = C.red; g.fillRect(bx, y + 20, bw * left / st.hp, 7);
      txt(g, `${left} HP`, bx + bw, y + 13, { size: 12, al: 'right', col: C.muted });
      g.strokeStyle = 'rgba(38,44,106,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      times.forEach((t, k) => {
        const x = X(t), on = t <= rt + 1e-9, sz = 7 + Math.min(9, P.d / 12);
        g.globalAlpha = on ? 1 : .28; g.fillStyle = P.col; g.strokeStyle = '#fff'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x, y - sz); g.lineTo(x + sz, y); g.lineTo(x, y + sz); g.lineTo(x - sz, y); g.closePath(); g.fill(); g.stroke();
        if (times.length <= 14) txt(g, `${P.d}`, x, y - sz - 5, { size: 11, al: 'center', col: P.col, w: 700 });
        g.globalAlpha = 1;
      });
      if (rt >= K.t - 1e-9) {
        const x = X(K.t); glyph(g, 'skull', x, y + 22, 18, C.red);
        const nearEnd = x > x1 - 130;
        txt(g, `KO at ${sec(K.t)} · ${K.n} hit${K.n > 1 ? 's' : ''}`, x + (nearEnd ? -14 : 14), y + 27, { size: 12, w: 700, col: C.red, al: nearEnd ? 'right' : 'left' });
      }
    });
    if (rt < tMax) { const x = X(Math.max(0, rt)); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 54); g.lineTo(x, 186); g.stroke(); }

    // two step charts
    const charts = [
      { x: 12, title: 'Hits to kill', f: (P, h) => kill(P.d, P.i, h, st.inst).n, unit: '' },
      { x: 528, title: 'Time to kill', f: (P, h) => kill(P.d, P.i, h, st.inst).t, unit: ' s', shade: 1 },
    ];
    charts.forEach(ch => {
      const cx = ch.x, cy = 220, cw = 500, chh = 353; panel(g, cx, cy, cw, chh);
      txt(g, ch.title, cx + 16, cy + 26, { w: 800, size: 15, disp: 1 });
      const px0 = cx + 48, px1 = cx + cw - 16, py0 = cy + chh - 34, py1 = cy + 52;
      let vmax = Math.max(ch.f(A, HPMAX), ch.f(B, HPMAX), 1); const nice = [1, 2, 4, 5, 10, 20, 40, 50, 100]; let tick = nice.find(n => vmax / n <= 6) || 100; vmax = Math.ceil(vmax / tick) * tick;
      const XH = h => px0 + (px1 - px0) * h / HPMAX, YV = v => py0 - (py0 - py1) * v / vmax;
      g.font = '500 11px Jost, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let v = 0; v <= vmax + 1e-9; v += tick) { g.fillStyle = 'rgba(93,97,140,.18)'; g.fillRect(px0, YV(v), px1 - px0, 1); g.fillStyle = C.muted; g.fillText(fmt(v, 2) + ch.unit, px0 - 6, YV(v)); }
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      for (let h = 0; h <= HPMAX; h += 100) { g.fillStyle = C.muted; g.fillText(h, XH(h), py0 + 16); }
      txt(g, 'enemy HP', px1, py0 + 30, { size: 11, al: 'right', col: C.muted });
      // shade where one attacker is ahead of the other
      if (ch.shade) for (let h = 1; h <= HPMAX; h++) {
        const va = ch.f(A, h), vb = ch.f(B, h); if (Math.abs(va - vb) < 1e-9) continue;
        g.fillStyle = va < vb ? 'rgba(46,163,220,.16)' : 'rgba(138,79,214,.16)';
        const ya = YV(va), yb = YV(vb); g.fillRect(XH(h - 1), Math.min(ya, yb), XH(h) - XH(h - 1) + .5, Math.abs(ya - yb));
      }
      [A, B].forEach((P, j) => {
        g.strokeStyle = P.col; g.lineWidth = 3; g.lineJoin = 'miter'; g.beginPath();
        let prev = ch.f(P, 1); g.moveTo(XH(0), YV(prev));
        for (let h = 2; h <= HPMAX; h++) { const v = ch.f(P, h); if (v !== prev) { g.lineTo(XH(h - 1), YV(prev)); g.lineTo(XH(h - 1), YV(v)); prev = v; } }
        g.lineTo(XH(HPMAX), YV(prev)); g.stroke();
      });
      // legend
      [A, B].forEach((P, j) => { const lx = cx + cw - 150 + j * 70; g.fillStyle = P.col; g.fillRect(lx, cy + 18, 18, 4); txt(g, P.name, lx + 24, cy + 25, { size: 13, w: 700 }); });
      // deck markers at 150 / 200 / 205
      MARKS.forEach((m, k) => { dashV(g, XH(m), py1 - 6, py0, 'rgba(154,90,6,.7)'); txt(g, m, XH(m) + (k === 1 ? -3 : k === 2 ? 3 : 0), py1 - 10, { size: 11, w: 700, col: C.goldInk, al: k === 1 ? 'right' : k === 2 ? 'left' : 'center' }); });
      // cursor
      const x = XH(st.hp); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, py1); g.lineTo(x, py0); g.stroke();
      const va = ch.f(A, st.hp), vb = ch.f(B, st.hp), same = Math.abs(va - vb) < 1e-9;
      [[A, va, -1], [B, vb, 1]].forEach(([P, v, sg]) => {
        g.fillStyle = P.col; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, YV(v), 6, 0, TAU); g.fill(); g.stroke();
        const right = x < px1 - 90, lab = `${P.name} ${fmt(v, 2)}${ch.unit}`;
        T.label(lab, x + (right ? 12 : -12), YV(v) + (same ? sg * 14 : (P === A ? (va > vb ? -12 : 12) : (vb > va ? -12 : 12))), right ? 'left' : 'right', P.col, 13);
      });
    });
    return { kA, kB };
  }

  // walk-through: sweep HP under the slide 120 pair, then park on 150 / 200 / 205 with a 100-damage attacker
  const BENCH_DUR = 24;
  function benchTour(st, t) {
    let pre = 0, hp, rt, ph;
    if (t < 8) { ph = 0; hp = Math.round(lerp(10, 260, ease(clamp((t - .6) / 6.8)))); rt = 99; }
    else if (t < 12) { ph = 1; hp = 130; rt = clamp((t - 8.3) / 3) * 6; }
    else { pre = 1; const k = Math.min(2, Math.floor((t - 12) / 4)), f = (t - 12) - k * 4; ph = 2 + k; hp = MARKS[k]; rt = clamp((f - .3) / 3) * (kill(100, 4, hp).t + .4); }
    Object.assign(st, PRESETS[pre], { hp, inst: false }); st.pre = pre;
    return { rt, ph };
  }

  canvasDemo('bench', (s, cv, g) => {
    const st = { ...PRESETS[0], hp: 205, inst: false, pre: 0, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.htk-tour'), inst = $(s, '.htk-inst'), pres = $$(s, '.htk-pre .btn');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } st.t0 = st.t; };
    const sync = bindSliders(s, st, () => { manual(); st.pre = -1; }, (k, v) => k === 'ai' || k === 'bi' ? sec(v) : k === 'hp' ? v : v);
    inst.onchange = () => { manual(); st.inst = inst.checked; };
    pres.forEach(b => b.onclick = () => { manual(); Object.assign(st, PRESETS[+b.dataset.p]); st.pre = +b.dataset.p; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); };
    const PH = [
      'Both attackers deal 25 DPS. As enemy HP rises, A steps up every 25 HP and B every 50. Their time-to-kill steps do not line up.',
      'At 130 HP, A needs 6 hits (6 s) and B needs 3 hits (6 s). Move HP a little and one of them pulls ahead by a full swing.',
      'Now B hits for 100 every 4 s: still 25 DPS. At 150 HP B needs 2 hits.',
      'At 200 HP, B still needs only 2 hits. Same 8 s as A.',
      'At 205 HP, B needs a third hit: 12 s against A’s 9 s. Five HP moved B past a threshold.',
    ];
    function info(ph, K) {
      inst.checked = st.inst; pres.forEach(b => b.classList.toggle('on', +b.dataset.p === st.pre)); sync();
      const key = [ph, st.ad, st.ai, st.bd, st.bi, st.hp, st.inst].join(); if (key === st.key) return; st.key = key;
      if (ph != null) return say($(s, '.htk-out'), PH[ph]);
      const dA = st.ad / st.ai, dB = st.bd / st.bi, d = K.kB.t - K.kA.t;
      const lead = Math.abs(d) < 1e-9 ? 'They tie.' : `${d > 0 ? 'A' : 'B'} kills ${sec(Math.abs(d))} sooner.`;
      say($(s, '.htk-out'), `At ${st.hp} HP: A needs ${K.kA.n} hits (${sec(K.kA.t)}), B needs ${K.kB.n} (${sec(K.kB.t)}). ${lead} ${Math.abs(dA - dB) < 1e-9 ? 'Same DPS, so the gap comes from thresholds alone.' : `DPS ${fmt(dA, 1)} vs ${fmt(dB, 1)}.`}`);
    }
    scenes.bench = { seek(t) { st.held = true; const { rt, ph } = benchTour(st, t); info(ph, drawBench(g, st, rt)); }, dur: () => BENCH_DUR };
    st.t0 = 0;
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= BENCH_DUR) st.t = 0; const { rt, ph } = benchTour(st, st.t); info(ph, drawBench(g, st, rt)); return; }
      // manual: replay the race in about three seconds, then hold for one
      const tm = Math.max(kill(st.ad, st.ai, st.hp, st.inst).t, kill(st.bd, st.bi, st.hp, st.inst).t, 1), f = ((st.t - st.t0) % 4.2) / 3;
      info(null, drawBench(g, st, f * (tm + .2)));
    };
  });

  /* ================= 2. effective damage ================= */
  const EFF0 = { mh: 1200, md: 125, rh: 1000, rd: 100, xd: 100 };
  function drawEff(g, st, T0, reveal) {
    bg(g);
    const P = [{ name: 'Melee', hp: st.mh, dps: st.md, col: COL.m, k: 'sword' }, { name: 'Ranged', hp: st.rh, dps: st.rd, col: COL.r, k: 'bow' }];
    P.forEach(p => { p.life = p.hp / st.xd; p.total = p.life * p.dps; });
    const tEnd = Math.max(P[0].life, P[1].life);
    panel(g, 12, 12, W - 24, 220);
    txt(g, `Time ${fmt(Math.min(T0, tEnd), 1)} s`, 28, 38, { w: 800, size: 16, disp: 1 });
    // the monster
    const mx = W - 110, my = 122;
    T.foe(mx, my, 34, Math.PI, C.red, { mark: 'horns' }); txt(g, `Monster: ${st.xd} DPS`, mx, my + 62, { al: 'center', w: 700, size: 14, col: C.redDk });
    P.forEach((p, j) => {
      const y = 82 + j * 92, t = Math.min(T0, p.life), alive = T0 < p.life;
      disc(g, 50, y, 24, p.col, p.k);
      txt(g, p.name, 86, y - 8, { w: 800, size: 16 }); txt(g, `${p.hp} HP · ${p.dps} DPS`, 86, y + 12, { size: 13, col: C.muted });
      const bx = 240, bw = 330, left = Math.max(0, p.hp - st.xd * T0);
      g.fillStyle = '#5a1f1c'; g.fillRect(bx, y - 18, bw, 16); g.fillStyle = C.red; g.fillRect(bx, y - 18, bw * left / Math.max(P[0].hp, P[1].hp), 16);
      g.strokeStyle = C.navy; g.lineWidth = 1.5; g.strokeRect(bx, y - 18, bw * p.hp / Math.max(P[0].hp, P[1].hp), 16);
      txt(g, `${Math.round(left)} HP left`, bx, y + 16, { size: 13, col: C.muted });
      if (!alive) { glyph(g, 'skull', bx + 120, y + 11, 18, C.red); txt(g, `survived ${fmt(p.life, 1)} s`, bx + 134, y + 16, { size: 13, w: 700, col: C.red }); }
      // damage dealt counter
      txt(g, 'damage dealt', 720, y - 14, { size: 12, col: C.muted, al: 'right' });
      txt(g, `${Math.round(p.dps * t)}`, 720, y + 18, { w: 800, size: 30, disp: 1, col: p.col, al: 'right' });
      // hits flying at the monster while alive
      if (alive && T0 > 0) { const f = (T0 * 2.2 + j * .5) % 1; g.fillStyle = p.col; g.beginPath(); g.arc(lerp(740, mx - 40, f), lerp(y, my, f), 5, 0, TAU); g.fill(); }
      if (alive && T0 > 0) { const f = (T0 * 1.6 + j * .3) % 1; g.fillStyle = 'rgba(229,50,45,.8)'; g.beginPath(); g.arc(lerp(mx - 40, 600, f), lerp(my, y - 10, f), 4, 0, TAU); g.fill(); }
    });
    // cumulative damage chart
    const cx = 12, cy = 244, cw = 640, chh = 329; panel(g, cx, cy, cw, chh);
    txt(g, 'Total damage dealt over time', cx + 16, cy + 26, { w: 800, size: 15, disp: 1 });
    const px0 = cx + 56, px1 = cx + cw - 20, py0 = cy + chh - 32, py1 = cy + 50;
    const tm = Math.ceil(tEnd * 1.12), vm = Math.max(P[0].total, P[1].total) * 1.15;
    const XT = t => px0 + (px1 - px0) * t / tm, YD = v => py0 - (py0 - py1) * v / vm;
    g.font = '500 11px Jost, sans-serif'; g.textAlign = 'center'; g.fillStyle = C.muted;
    const ts = tm > 30 ? 5 : tm > 14 ? 2 : 1;
    for (let t = 0; t <= tm; t += ts) g.fillText(t + ' s', XT(t), py0 + 16);
    const vs = vm > 3000 ? 1000 : vm > 1200 ? 500 : 250; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let v = 0; v <= vm; v += vs) { g.fillStyle = 'rgba(93,97,140,.18)'; g.fillRect(px0, YD(v), px1 - px0, 1); g.fillStyle = C.muted; g.fillText(v, px0 - 6, YD(v)); }
    g.textBaseline = 'alphabetic';
    const short = P[0].life <= P[1].life ? 0 : 1, long = 1 - short;
    if (T0 >= P[short].life && Math.abs(P[0].life - P[1].life) > 1e-6) {
      const ts = P[short].life, x = XT(ts); dashV(g, x, py1, py0, 'rgba(38,44,106,.55)');
      const v = P[long].dps * ts, pct = Math.round((P[long].dps / P[short].dps - 1) * 100);
      T.label(`same ${fmt(ts, 1)} s: ${Math.round(v)} vs ${Math.round(P[short].total)} (${pct >= 0 ? '+' : ''}${pct}%)`, x - 8, py0 - 16, 'right', C.ink, 12);
    }
    P.forEach(p => {
      const t = Math.min(T0, p.life); g.strokeStyle = p.col; g.lineWidth = 3.5; g.beginPath(); g.moveTo(XT(0), YD(0)); g.lineTo(XT(t), YD(p.dps * t)); g.stroke();
      g.fillStyle = p.col; g.beginPath(); g.arc(XT(t), YD(p.dps * t), 5, 0, TAU); g.fill();
      if (T0 >= p.life) T.label(`${p.name} ${Math.round(p.total)}`, XT(t) + 8, YD(p.total) - 12, XT(t) > px1 - 110 ? 'right' : 'left', p.col, 13);
    });
    // the multiplication card
    const kx = 664, ky = 244, kw = W - 12 - kx; panel(g, kx, ky, kw, chh);
    txt(g, `${P[0].name} vs ${P[1].name}`, kx + 16, ky + 26, { w: 800, size: 15, disp: 1 });
    const rh = P[0].hp / P[1].hp, rd = P[0].dps / P[1].dps, rt = rh * rd, a = reveal;
    g.globalAlpha = clamp(a * 3);
    const pc = r => `${r >= 1 ? '+' : ''}${Math.round((r - 1) * 100)}%`;
    [['HP', rh, 'lifespan, by the same ratio'], ['DPS', rd, 'damage each second']].forEach(([n, r, s2], i) => {
      const y = ky + 74 + i * 66; txt(g, `${n} ×${r.toFixed(2)}`, kx + 20, y, { w: 800, size: 24, disp: 1 }); txt(g, `${pc(r)}: ${s2}`, kx + 20, y + 22, { size: 13, col: C.muted });
    });
    g.globalAlpha = clamp(a * 3 - 1);
    g.fillStyle = C.navy; g.fillRect(kx + 20, ky + 196, kw - 40, 2);
    txt(g, `= total ×${rt.toFixed(2)}`, kx + 20, ky + 232, { w: 800, size: 26, disp: 1, col: C.goldInk });
    txt(g, `${pc(rt)} damage over each one’s lifespan`, kx + 20, ky + 256, { size: 13, col: C.muted });
    txt(g, 'lifespan = HP ÷ monster DPS', kx + 20, ky + 290, { size: 13 });
    txt(g, 'total = lifespan × DPS', kx + 20, ky + 310, { size: 13 });
    g.globalAlpha = 1;
    return { P, rh, rd, rt, tEnd };
  }
  const EFF_DUR = 18;
  canvasDemo('eff', (s, cv, g) => {
    const st = { ...EFF0, tour: true, held: false, t: 0, t0: 0, key: '' };
    const tourBtn = $(s, '.ef-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } st.t0 = st.t; };
    const sync = bindSliders(s, st, manual, (k, v) => v);
    tourBtn.onclick = () => { Object.assign(st, EFF0); st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); };
    $(s, '.ef-reset').onclick = () => { manual(); Object.assign(st, EFF0); };
    function info(R, done) {
      sync();
      const key = [st.mh, st.md, st.rh, st.rd, st.xd, done].join(); if (key === st.key) return; st.key = key;
      const [m, r] = R.P;
      say($(s, '.ef-out'), !done ? `Both take ${st.xd} DPS from the monster. Watch who is still swinging when the other drops.`
        : `Melee lives ${fmt(m.life, 1)} s and deals ${Math.round(m.total)}; ranged lives ${fmt(r.life, 1)} s and deals ${Math.round(r.total)}. ×${R.rh.toFixed(2)} HP and ×${R.rd.toFixed(2)} DPS multiply to ×${R.rt.toFixed(2)} total. In the same window the gap is only the DPS ratio.`);
    }
    function frame(t) { const tEnd = Math.max(st.mh, st.rh) / st.xd, sp = tEnd / 9, T0 = Math.min(t * sp, tEnd + .001); const R = drawEff(g, st, T0, clamp((t * sp - tEnd) / (tEnd * .25))); info(R, T0 >= tEnd); }
    scenes.eff = { seek(t) { st.held = true; Object.assign(st, EFF0); frame(Math.max(0, t - .5)); }, dur: () => EFF_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= EFF_DUR) st.t = 0; frame(Math.max(0, st.t - .5)); return; }
      // manual: show the finished race, so slider moves read straight away
      const tEnd = Math.max(st.mh, st.rh) / st.xd, R = drawEff(g, st, tEnd + .001, 1); info(R, true);
    };
  });

  /* ================= 3. Ori pricing ================= */
  const CAT = { map: { name: 'Area map', col: '#7fb3d9' }, shard: { name: 'Spirit shard', col: '#b48be0' }, weapon: { name: 'Weapon', col: '#e7a14a' } };
  const ZONES = [
    ['Inkwater Marsh', 500, [['Map', 'map'], ['Sticky', 'shard']]],
    ['Wellspring Glades', 1200, [['Map', 'map'], ['Triple Jump', 'shard'], ['Spike', 'weapon']]],
    ['Kwolok’s Hollow', 1600, [['Map', 'map'], ['Overcharge', 'shard'], ['Splinter', 'shard'], ['Sentry', 'weapon']]],
    ['Silent Woods', 2000, [['Map', 'map'], ['Magnet', 'shard'], ['Blaze', 'weapon']]],
    ['Baur’s Reach', 2600, [['Map', 'map'], ['Thorn', 'shard'], ['Lifeforce', 'shard']]],
    ['Luma Pools', 3000, [['Map', 'map'], ['Swap', 'shard'], ['Wingclip', 'shard'], ['Shuriken', 'weapon']]],
    ['Mouldwood Depths', 3400, [['Map', 'map'], ['Finesse', 'shard'], ['Sentry +', 'weapon'], ['Blaze +', 'weapon']]],
  ];
  const ORI0 = { map: 1, shard: 2, weapon: 4 };
  const price = (sl, items, wt) => { const sum = items.reduce((a, [, c]) => a + wt[c], 0); return items.map(([, c]) => Math.round(sl * wt[c] / sum / 5) * 5); };
  function drawOri(g, st, hi) {
    bg(g);
    const RX = { zone: 22, sl: 236, items: 316, bar: 760 }, top = 58, rh = 66;
    txt(g, 'Zone', RX.zone, 36, { w: 700, size: 13, col: C.muted }); txt(g, 'Spirit light', RX.sl + 56, 36, { w: 700, size: 13, col: C.muted, al: 'right' });
    txt(g, 'Purchases (weight: price)', RX.items, 36, { w: 700, size: 13, col: C.muted }); txt(g, 'Budget split', RX.bar, 36, { w: 700, size: 13, col: C.muted });
    const maxSL = Math.max(...st.sl.map(Number)), bw = W - 22 - RX.bar;
    ZONES.forEach(([zn, , items], i) => {
      const y = top + i * rh, sl = st.sl[i], pr = price(sl, items, st);
      if (i === st.zone) { g.fillStyle = 'rgba(255,185,81,.22)'; g.beginPath(); g.roundRect(10, y - 4, W - 20, rh - 6, 10); g.fill(); }
      else if (i % 2 === 0) { g.fillStyle = 'rgba(239,230,210,.7)'; g.beginPath(); g.roundRect(10, y - 4, W - 20, rh - 6, 10); g.fill(); }
      txt(g, zn, RX.zone, y + 30, { w: 700, size: 15 }); txt(g, sl, RX.sl + 56, y + 30, { w: 800, size: 17, disp: 1, al: 'right' });
      let x = RX.items;
      items.forEach(([n, c], k) => {
        const lab = n, w = Math.max(84, (g.font = '600 13px Jost, sans-serif', g.measureText(lab).width + 20)), on = hi === c;
        g.fillStyle = CAT[c].col; g.globalAlpha = on ? 1 : .55; g.beginPath(); g.roundRect(x, y + 4, w, 46, 8); g.fill(); g.globalAlpha = 1;
        if (on) { g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); }
        txt(g, lab, x + w / 2, y + 21, { size: 13, al: 'center' });
        txt(g, `×${fmt(st[c], 1)}: ${pr[k]}`, x + w / 2, y + 41, { size: 13, w: 800, al: 'center', col: C.navy });
        x += w + 8;
      });
      // stacked budget bar, length = zone spirit light
      let bx = RX.bar; const L = bw * sl / maxSL;
      pr.forEach((p, k) => { const w = L * p / Math.max(1, pr.reduce((a, b) => a + b, 0)); g.fillStyle = CAT[items[k][1]].col; g.fillRect(bx, y + 14, Math.max(0, w - 2), 26); bx += w; });
    });
    const fy = top + ZONES.length * rh + 6;
    Object.entries(CAT).forEach(([c, v], k) => { g.fillStyle = v.col; g.fillRect(22 + k * 150, fy, 16, 16); txt(g, v.name, 44 + k * 150, fy + 13, { size: 13 }); });
    txt(g, 'price = zone spirit light × weight ÷ total weight of the zone’s purchases', W - 22, fy + 13, { size: 13, w: 700, al: 'right', col: C.goldInk });
  }
  const ORI_DUR = 16;
  function oriTour(st, t) {
    const w = t < 3 ? 4 : t < 7 ? lerp(4, 8, ease(clamp((t - 3.5) / 2.5))) : t < 11 ? 8 : 4;
    const sh = t < 8 ? 2 : t < 11 ? lerp(2, 1, ease(clamp((t - 8) / 2))) : 2;
    Object.assign(st, { map: 1, shard: Math.round(sh * 2) / 2, weapon: Math.round(w * 2) / 2, zone: 2 }); st.sl = ZONES.map(z => z[1]);
    return t < 3 ? [0, null] : t < 8 ? [1, 'weapon'] : t < 11 ? [2, 'shard'] : [3, null];
  }
  canvasDemo('ori', (s, cv, g) => {
    const st = { ...ORI0, zone: 2, sl: ZONES.map(z => z[1]), tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.or-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    const slIn = $(s, 'input[data-k="sl"]');
    Object.defineProperty(st, 'slz', { get: () => st.sl[st.zone] });
    const ins = $$(s, 'input[type=range][data-k]');
    ins.forEach(i => i.addEventListener('input', () => { manual(); if (i.dataset.k === 'sl') st.sl[st.zone] = +i.value; else st[i.dataset.k] = +i.value; st.hi = i.dataset.k === 'sl' ? null : i.dataset.k; }));
    const sync = () => ins.forEach(i => { const k = i.dataset.k, v = k === 'sl' ? st.sl[st.zone] : st[k]; if (+i.value !== v) i.value = v; $(s, `[data-v="${k}"]`).textContent = k === 'sl' ? v : '×' + fmt(v, 1); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); };
    $(s, '.or-reset').onclick = () => { manual(); Object.assign(st, ORI0); st.sl = ZONES.map(z => z[1]); st.hi = null; };
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) * H / r.height, i = Math.floor((y - 54) / 66); if (i >= 0 && i < ZONES.length) { manual(); st.zone = i; } });
    const PH = ['Each zone hands out a known amount of spirit light. Its purchases share that budget by weight: a weapon weighs 4, a shard 2, a map 1.',
      'Raise the weapon weight and weapons cost more everywhere, while every map and shard in the same zone gets cheaper. Each zone still spends exactly its budget.',
      'Drop the shard weight and the shards’ share flows back to maps and weapons.',
      'One weight per kind of purchase prices the whole game, so a zone with more spirit light simply has pricier stock.'];
    function info(ph) {
      sync(); $(s, '.or-zn').textContent = '· ' + ZONES[st.zone][0];
      const z = ZONES[st.zone], pr = price(st.sl[st.zone], z[2], st);
      const key = [ph, st.map, st.shard, st.weapon, st.zone, st.sl[st.zone]].join(); if (key === st.key) return; st.key = key;
      say($(s, '.or-out'), ph != null ? PH[ph] : `${z[0]}: ${st.sl[st.zone]} spirit light across ${z[2].length} purchases. ${z[2].map(([n], k) => `${n} ${pr[k]}`).join(', ')}.`);
    }
    scenes.ori = { seek(t) { st.held = true; const [ph, hi] = oriTour(st, t); drawOri(g, st, hi); info(ph); }, dur: () => ORI_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= ORI_DUR) st.t = 0; const [ph, hi] = oriTour(st, st.t); drawOri(g, st, hi); info(ph); return; }
      drawOri(g, st, st.hi); info(null);
    };
  });

  window.__seek = (t, which = 'bench') => scenes[which].seek(t);
  window.__dur = (which = 'bench') => scenes[which].dur();
})();
