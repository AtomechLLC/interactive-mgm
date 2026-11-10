/* Conversion rates (MGM C4 M6, Part 11, mechanism 2). A trade turns some value into other value at a rate:
   equivalent (value out = value in, even when the count changes: 1 apple -> 0.5 orange when an orange is worth 2 apples),
   growth (1 apple -> 1.5 apples) and erosive (100 coins -> 50 coins). Each slide repeats the trade so the rate's effect
   on a pool shows up over time. Every scene steps with a fixed dt, so window.__seek(t, which) / __dur(which) replay it
   (which = kinds, dial, guild). Rates are illustrative. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease, TAU } = TD;
  const KIND = [
    { name: 'Equivalent', col: C.blue, tint: '85,98,235' },
    { name: 'Growth', col: C.p2, tint: '47,174,99' },
    { name: 'Erosive', col: C.red, tint: '229,50,45' },
  ];
  const kindOf = r => Math.abs(r - 1) < 1e-6 ? 0 : r > 1 ? 1 : 2;

  // World of Warcraft item icons (wow.zamimg.com), saved in img/
  const ICON = {};
  [['apple', 'inv_misc_food_21'], ['orange', 'inv_misc_food_41'], ['coin', 'inv_misc_coin_02'], ['watch', 'inv_misc_pocketwatch_01']]
    .forEach(([k, f]) => { const im = new Image(); im.src = `img/${f}.jpg`; ICON[k] = im; });
  const WORD = { apple: ['apple', 'apples'], orange: ['orange', 'oranges'], coin: ['coin', 'coins'], watch: ['minute', 'minutes'] };
  const word = (k, n) => WORD[k][n === 1 ? 0 : 1];

  function fmt(v) {
    if (!isFinite(v)) return '∞';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e4) return Math.round(v).toLocaleString('en-US');
    if (v >= 100) return String(Math.round(v));
    return String(+v.toFixed(2));
  }

  // an item icon in a dark frame; frac < 1 shows only that share of it (half an orange is half an icon)
  function icon(g, k, x, y, s, frac = 1, a = 1) {
    if (a <= 0 || frac <= 0) return;
    g.save(); g.globalAlpha *= clamp(a);
    g.beginPath(); g.rect(x - s / 2 - 2, y - s / 2 - 2, (s + 4) * clamp(frac), s + 4); g.clip();
    g.fillStyle = '#1d2140'; g.beginPath(); g.roundRect(x - s / 2 - 2, y - s / 2 - 2, s + 4, s + 4, 5); g.fill();
    const im = ICON[k];
    if (im && im.complete && im.naturalWidth) g.drawImage(im, x - s / 2, y - s / 2, s, s);
    g.restore();
  }

  // a transmutation circle: two rings, a hexagram and six small circles, turning; glow lights it up
  function circle(g, x, y, r, rot, glow, col) {
    g.save(); g.translate(x, y);
    if (glow > 0) {
      const gr = g.createRadialGradient(0, 0, r * .2, 0, 0, r * 1.5);
      gr.addColorStop(0, `rgba(255,214,120,${.75 * glow})`); gr.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.5, 0, TAU); g.fill();
    }
    g.fillStyle = '#1d2140'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.strokeStyle = glow > .05 ? '#ffe7a8' : '#e9e4f5'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, r - 4, 0, TAU); g.stroke();
    g.beginPath(); g.arc(0, 0, r - 11, 0, TAU); g.stroke();
    g.rotate(rot);
    for (const off of [0, Math.PI / 3]) {
      g.beginPath();
      for (let i = 0; i <= 3; i++) { const a = off + i * TAU / 3 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * (r - 11), Math.sin(a) * (r - 11)); }
      g.stroke();
    }
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 - Math.PI / 2; g.beginPath(); g.arc(Math.cos(a) * (r - 11), Math.sin(a) * (r - 11), 5, 0, TAU); g.stroke(); }
    g.beginPath(); g.arc(0, 0, r * .28, 0, TAU); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
    g.restore();
  }

  function panel(g, W, H) { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.7)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }

  // draws "1 [apple] -> 0.5 [orange]" centred on x
  function formula(g, x, y, a, ka, b, kb, col = C.ink, size = 26, S = 34) {
    g.font = `700 ${size}px Montserrat, Jost, sans-serif`; g.textBaseline = 'middle';
    const parts = [[String(a)], [null, ka], ['  '], ['→', 1], ['  '], [String(b)], [null, kb]];
    const gap = 8;
    const wOf = p => p[1] === 1 ? size * 1.1 : p[0] != null ? g.measureText(p[0]).width : S;
    const total = parts.reduce((s, p) => s + wOf(p) + gap, -gap);
    let cx = x - total / 2;
    for (const p of parts) {
      if (p[1] === 1) {
        const w = size * 1.1; g.save(); g.strokeStyle = C.muted; g.fillStyle = C.muted; g.lineWidth = size / 9; g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + w - size * .3, y); g.stroke();
        g.beginPath(); g.moveTo(cx + w, y); g.lineTo(cx + w - size * .38, y - size * .26); g.lineTo(cx + w - size * .38, y + size * .26); g.closePath(); g.fill(); g.restore();
      }
      else if (p[0] != null) { g.fillStyle = col; g.textAlign = 'left'; g.fillText(p[0], cx, y + 1); }
      else icon(g, p[1], cx + S / 2, y, S);
      cx += wOf(p) + gap;
    }
  }

  const demos = {};

  /* ---------- 1: title ---------- */
  canvasDemo('title', (s, cv, g) => (dt, t) => {
    const W = 1100, H = 440; T.use(g); panel(g, W, H);
    const rows = [['apple', 1, 'orange', .5, 0], ['apple', 1, 'apple', 1.5, 1], ['coin', 100, 'coin', 50, 2]];
    rows.forEach(([ka, a, kb, b, k], i) => {
      const x = 190 + i * 360, ph = (t * .5 + i * .33) % 1, glow = Math.max(0, 1 - Math.abs(ph - .5) * 4);
      g.font = '800 28px Montserrat, sans-serif'; g.textAlign = 'center'; g.fillStyle = KIND[k].col; g.fillText(KIND[k].name.toUpperCase(), x, 50);
      circle(g, x, 210, 78, t * .4 * (i % 2 ? -1 : 1), glow, KIND[k].col);
      // inputs slide into the circle from the left, outputs come out on the right
      const inK = ease(clamp(ph / .5)), outK = ease(clamp((ph - .5) / .5));
      icon(g, ka, lerp(x - 130, x, inK), 210, 54 * (1 - .5 * inK), 1, 1 - clamp((ph - .4) / .1));
      icon(g, kb, lerp(x, x + 130, outK), 210 - (k === 1 ? 32 : 0), 54 * (.5 + .5 * outK), k === 0 ? .5 : 1, clamp((ph - .5) / .1));
      if (k === 1) icon(g, kb, lerp(x, x + 130, outK), 210 + 32, 54 * (.5 + .5 * outK), .5, clamp((ph - .5) / .1));
      formula(g, x, 370, a, ka, b, kb, C.ink, 34, 44);
    });
  });

  /* ---------- 2: three kinds, the same trade eight times ---------- */
  {
    const W = 1420, H = 600, N = 8, CW = W / 3, GAP = 1.6, FIRST = .8, HOLD = 3, ANIM = 1.1;
    const tradeAt = k => FIRST + (k - 1) * GAP, DUR = tradeAt(N) + HOLD;
    // each column's holdings after 0..N trades: { k: icon, n: count, v: value in starting units }
    const eqHist = [{ k: 'apple', n: 16 }];
    for (let i = 1; i <= N; i++) { const p = eqHist[i - 1]; eqHist.push(p.k === 'apple' ? { k: 'orange', n: p.n / 2 } : { k: 'apple', n: p.n * 2 }); }
    eqHist.forEach(h => h.v = h.k === 'apple' ? h.n : h.n * 2);
    const geo = (k, n0, r) => Array.from({ length: N + 1 }, (_, i) => ({ k, n: n0 * Math.pow(r, i), v: n0 * Math.pow(r, i) }));
    const COLS = [
      { hist: eqHist, per: 1, ymax: 2.1, start: 16, unit: 'apples' },
      { hist: geo('apple', 4, 1.5), per: 1, ymax: 27, start: 4, unit: 'apples' },
      { hist: geo('coin', 100, .5), per: 5, ymax: 1.15, start: 100, unit: 'coins' },
    ];
    const S = 38, SP = 44, PER_ROW = 10, MAXI = 40, CY = 174, CR = 50, PY = 270;
    const slot = (cx, i, total) => {
      const row = Math.floor(i / PER_ROW), m = Math.min(PER_ROW, total - row * PER_ROW);
      return [cx - (m - 1) * SP / 2 + (i % PER_ROW) * SP, PY + row * SP];
    };
    function pool(g, cx, h, per, mode, k) {   // mode: 0 still, -k moving in, +k moving out
      const units = h.n / per, full = Math.floor(units + 1e-9), part = units - full;
      const count = Math.min(MAXI, full + (part > 1e-6 ? 1 : 0));
      for (let i = 0; i < count; i++) {
        const [x, y] = slot(cx, i, count), frac = i === full ? part : 1;
        if (mode === 0) icon(g, h.k, x, y, S, frac);
        else if (mode < 0) { const e = ease(k); icon(g, h.k, lerp(x, cx, e), lerp(y, CY, e), S * (1 - .6 * e), frac, 1 - clamp((k - .8) / .2)); }
        else { const e = ease(k); icon(g, h.k, lerp(cx, x, e), lerp(CY, y, e), S * (.4 + .6 * e), frac, clamp(k / .2)); }
      }
      if (full + (part > 1e-6 ? 1 : 0) > MAXI && mode === 0) T.label(`+${fmt((units - MAXI) * per)} more`, cx + 150, PY + 3 * SP + 30, 'center', C.goldInk, 14);
    }
    function chart(g, cx, col, done, ki) {
      const x0 = cx - 190, x1 = cx + 190, y0 = 574, y1 = 494, X = i => lerp(x0, x1, i / N), Y = r => lerp(y0, y1, clamp(r / col.ymax));
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
      g.setLineDash([4, 5]); g.beginPath(); g.moveTo(x0, Y(1)); g.lineTo(x1, Y(1)); g.stroke(); g.setLineDash([]);
      g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText('start', x0 - 6, Y(1));
      g.textAlign = 'center'; g.fillText('trades →', cx, y0 + 12);
      const line = (f, w, c, dash, upto) => {
        g.strokeStyle = c; g.lineWidth = w; g.setLineDash(dash); g.beginPath();
        for (let i = 0; i <= upto; i++) g[i ? 'lineTo' : 'moveTo'](X(i), Y(f(col.hist[i])));
        g.stroke(); g.setLineDash([]);
      };
      if (ki === 0) { line(h => h.n / col.start, 2, 'rgba(93,97,140,.35)', [3, 5], N); line(h => h.n / col.start, 3, '#8b8fa8', [], done); }
      line(h => h.v / col.start, 2, `rgba(${KIND[ki].tint},.3)`, [3, 5], N);
      line(h => h.v / col.start, 5, KIND[ki].col, [], done);
      const r = col.hist[done].v / col.start;
      g.fillStyle = KIND[ki].col; g.beginPath(); g.arc(X(done), Y(r), 6, 0, TAU); g.fill();
      if (ki === 0) { T.label('value', x1 + 4, Y(1) - 14, 'left', KIND[0].col, 13); T.label('count', x1 + 4, Y(col.hist[N].n / col.start) + 14, 'left', '#6b6f8f', 13); }
      else T.label(`×${fmt(r)}`, X(done) + 10, Y(r) - 16, 'left', KIND[ki].col, 14);
    }
    canvasDemo('kinds', (s, cv, g) => {
      const st = { play: true, clock: 0, k: 0, at: 9, held: false, last: '' };
      $(s, '.cv-play').onclick = () => { st.play = !st.play; if (st.play && st.k >= N) { st.clock = 0; st.k = 0; } else if (st.play) st.clock = tradeAt(st.k + 1) - .3; };
      $(s, '.cv-once').onclick = () => { st.play = false; if (st.k >= N) { st.k = 0; st.at = 9; } else { st.k++; st.at = 0; } };
      $(s, '.cv-reset').onclick = () => { st.k = 0; st.at = 9; st.clock = 0; };
      function step(dt) {
        st.at += dt;
        if (!st.play) return;
        st.clock += dt;
        if (st.clock > DUR) { st.clock = 0; st.k = 0; st.at = 9; }
        let k = 0; while (k < N && tradeAt(k + 1) <= st.clock) k++;
        if (k !== st.k) { st.k = k; st.at = st.clock - tradeAt(k); }
      }
      function render(t) {
        T.use(g); panel(g, W, H);
        const kk = clamp(st.at / ANIM), animating = st.k > 0 && kk < 1;
        COLS.forEach((col, i) => {
          const cx = CW * (i + .5), K = KIND[i];
          if (i) { g.strokeStyle = '#d9cdb2'; g.lineWidth = 2; g.beginPath(); g.moveTo(CW * i, 20); g.lineTo(CW * i, H - 20); g.stroke(); }
          g.font = '800 28px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = K.col; g.fillText(K.name.toUpperCase(), cx, 34);
          const from = col.hist[Math.max(0, st.k - (animating ? 1 : 0))], cur = col.hist[st.k];
          // the rate for the trade being made (the equivalent column swaps back and forth)
          const nx = col.hist[Math.min(N, st.k + (animating ? 0 : 1))], pv = col.hist[Math.min(N, st.k + (animating ? 0 : 1)) - 1] || col.hist[0];
          if (i === 0) pv.k === 'apple' ? formula(g, cx, 84, 1, 'apple', .5, 'orange') : formula(g, cx, 84, 1, 'orange', 2, 'apple');
          else if (i === 1) formula(g, cx, 84, 1, 'apple', 1.5, 'apple');
          else formula(g, cx, 84, 100, 'coin', 50, 'coin');
          void nx;
          const glow = animating ? Math.max(0, 1 - Math.abs(kk - .5) * 3) : 0;
          circle(g, cx, CY, CR, t * .5 * (i % 2 ? -1 : 1) + kk * 2, glow, K.col);
          if (!animating) pool(g, cx, cur, col.per, 0);
          else if (kk < .5) pool(g, cx, from, col.per, -1, kk / .5);
          else pool(g, cx, cur, col.per, 1, (kk - .5) / .5);
          const h = animating && kk < .5 ? from : cur;
          const worth = i === 0 ? `${fmt(h.n)} ${word(h.k, h.n)}, worth ${fmt(h.v)} apples` : `${fmt(h.n)} ${word(h.k, h.n)}`;
          g.font = '700 20px Montserrat, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(worth, cx, 462);
          if (i === 2) { g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('each coin icon = 5 coins', cx, 487); }
          chart(g, cx, col, st.k, i);
        });
        T.label(`trade ${st.k} of ${N}`, W - 16, H - 16, 'right', C.muted, 13);
        $(s, '.cv-play').classList.toggle('on', st.play);
        $(s, '.cv-play').textContent = st.play ? '❚❚ Pause' : '▶ Play';
        const key = String(st.k);
        if (key === st.last) return; st.last = key;
        const [e, gr, er] = COLS.map(c => c.hist[st.k]);
        say($(s, '.cv-out'), st.k === 0
          ? 'Each column makes the same trade 8 times in a row. Watch the count and the value separately.'
          : `After ${st.k} trade${st.k > 1 ? 's' : ''}: the equivalent pool is still worth <b>16 apples</b> (its count went up and down), growth turned 4 apples into <b>${fmt(gr.n)}</b>, and erosion left <b>${fmt(er.n)}</b> of 100 coins.`);
        void e;
      }
      let time = 0;
      demos.kinds = { seek(t) { st.held = true; st.play = true; st.clock = 0; st.k = 0; st.at = 9; time = 0; for (let x = 0; x < t; x += 1 / 60) { step(1 / 60); time += 1 / 60; } render(time); }, dur: () => DUR };
      return dt => { if (st.held) return; step(dt); time += dt; render(time); };
    });
  }

  /* ---------- 3: dial the rate ---------- */
  {
    const W = 1100, H = 600, N = 10, START = 100, YMAX = 400, CAP = 10;
    const X0 = 96, X1 = 1000, Y0 = 530, Y1 = 70;
    const X = i => lerp(X0, X1, i / N), Y = v => lerp(Y0, Y1, Math.min(v, YMAX * 1.04) / YMAX);
    const series = (r, cap) => { const out = [START]; for (let i = 1; i <= N; i++) { const v = out[i - 1], gain = v * (r - 1); out.push(v + (cap && gain > 0 ? Math.min(gain, CAP) : gain)); } return out; };
    const PRESETS = [
      ['Apples for oranges, an orange worth 2 apples', 1, false],
      ['5 minutes of play → 100 coins, every time', 1, false],
      ['Group XP bonus', 1.2, false],
      ['Card donation with a daily cap', 1.5, true],
      ['Auction house cut, 5%', .95, false],
      ['Boosting a friend at half value', .5, false],
    ];
    canvasDemo('dial', (s, cv, g) => {
      const st = { r: 1, cap: false, p: 0, tour: false, tt: 0, held: false, last: '', pi: 0 };
      const rate = $(s, '.cv-rate'), capBox = $(s, '.cv-cap');
      say($(s, '.cv-presets'), PRESETS.map(([l, r, c], i) => `<button class="btn" data-i="${i}">${l} <b>×${r.toFixed(2)}${c ? ' + cap' : ''}</b></button>`).join(''));
      const set = (r, cap) => { st.r = r; st.cap = cap; st.p = 0; rate.value = r; capBox.checked = cap; };
      $$(s, '.cv-presets .btn').forEach(b => b.onclick = () => { const [, r, c] = PRESETS[+b.dataset.i]; st.tour = false; st.pi = +b.dataset.i; set(r, c); });
      rate.oninput = () => { st.tour = false; st.pi = -1; st.r = +rate.value; st.p = 0; };
      capBox.onchange = () => { st.tour = false; st.pi = -1; st.cap = capBox.checked; st.p = 0; };
      const TOUR = 3.6;
      function step(dt) {
        st.p = Math.min(N, st.p + dt * 4);
        if (st.tour) { st.tt += dt; const i = Math.floor(st.tt / TOUR) % PRESETS.length, [, r, c] = PRESETS[i]; if (i !== st.pi) { st.pi = i; set(r, c); } }
      }
      function render() {
        T.use(g); panel(g, W, H);
        const kind = kindOf(st.r), K = KIND[kind], vals = series(st.r, st.cap);
        // axes
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.textBaseline = 'middle';
        g.textAlign = 'right';
        for (let v = 0; v <= YMAX; v += 100) { g.beginPath(); g.moveTo(X0, Y(v)); g.lineTo(X1, Y(v)); g.stroke(); g.fillText(String(v), X0 - 10, Y(v)); }
        g.textAlign = 'center';
        for (let i = 0; i <= N; i++) g.fillText(String(i), X(i), Y0 + 20);
        g.fillText('trades made', (X0 + X1) / 2, Y0 + 44);
        g.save(); g.translate(30, (Y0 + Y1) / 2); g.rotate(-Math.PI / 2); g.fillText('value in the pool', 0, 0); g.restore();
        // the three reference rates
        g.save(); g.beginPath(); g.rect(X0 - 8, Y1 - 6, X1 - X0 + 120, Y0 - Y1 + 14); g.clip();
        [[.5, 2], [1, 0], [1.5, 1]].forEach(([r, k]) => {
          const v = series(r, false); g.strokeStyle = `rgba(${KIND[k].tint},.28)`; g.lineWidth = 2; g.setLineDash([5, 6]); g.beginPath();
          v.forEach((y, i) => g[i ? 'lineTo' : 'moveTo'](X(i), Y(y))); g.stroke(); g.setLineDash([]);
          const li = v.findIndex(y => y > YMAX), lx = li < 0 ? N : li - .6;
          g.font = '600 13px Jost, sans-serif'; g.fillStyle = `rgba(${KIND[k].tint},.8)`; g.textAlign = 'left';
          g.fillText(`${KIND[k].name.toLowerCase()} ×${r}`, X(lx) + 6, li < 0 ? Y(v[N]) - 12 : Y1 + 10);
        });
        // the dialled rate: fill between it and the start line, then the line itself
        const upto = st.p, pts = [];
        for (let i = 0; i <= Math.floor(upto); i++) pts.push([X(i), Y(vals[i])]);
        if (upto % 1 > 0 && upto < N) { const i = Math.floor(upto), f = upto % 1; pts.push([X(i + f), Y(lerp(vals[i], vals[i + 1], f))]); }
        if (kind !== 0) {
          g.fillStyle = `rgba(${K.tint},.12)`; g.beginPath(); g.moveTo(X(0), Y(START));
          pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(pts.at(-1)[0], Y(START)); g.closePath(); g.fill();
        }
        g.strokeStyle = K.col; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
        pts.forEach(([x, y], i) => { if (i <= Math.floor(upto)) { g.fillStyle = '#fffaf0'; g.strokeStyle = K.col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.stroke(); } });
        g.restore();
        const end = vals[N];
        if (end > YMAX && upto >= N) T.label(`off the chart: ${fmt(end)} after ${N} trades`, X1 - 6, Y1 + 34, 'right', '#fff', 16, K.col);
        T.stamp(K.name.toUpperCase(), X0 + 130, Y1 + 30, K.col, 1, 30);
        if (kind === 1 && upto >= N) T.label(st.cap ? 'capped: grows by a fixed step, not a multiple' : 'value created from nothing', X(6), Y(Math.min(end, YMAX)) - 30, 'center', K.col, 15);
        if (kind === 2 && upto >= N) T.label('value burned on every trade', X(6), Y(START) + 30, 'center', K.col, 15);
        $(s, '.cv-rv').textContent = '×' + st.r.toFixed(2); $(s, '.cv-rv').style.color = K.col;
        $$(s, '.cv-presets .btn').forEach((b, i) => b.classList.toggle('on', i === st.pi));
        const key = `${st.r}|${st.cap}|${st.pi}`;
        if (key === st.last) return; st.last = key;
        const per = st.r === 1 ? null : Math.log(st.r > 1 ? 2 : .5) / Math.log(st.r);
        const pace = st.r === 1 ? '<b>never</b><span>changes, however many trades</span>'
          : st.cap && st.r > 1 ? `<b>+${CAP}</b><span>per trade at most: straight line growth</span>`
          : `<b>${per < 10 ? per.toFixed(1) : Math.round(per)}</b><span>trades to ${st.r > 1 ? 'double' : 'halve'} the pool</span>`;
        say($(s, '.cv-stats'), `<div class="${['', 'g', 'r'][kind]}"><b>${fmt(end)}</b><span>after ${N} trades, from ${START}</span></div><div class="${['', 'g', 'r'][kind]}">${pace}</div>`);
      }
      demos.dial = { seek(t) { st.held = true; st.tour = true; st.tt = 0; st.pi = 0; set(PRESETS[0][1], PRESETS[0][2]); for (let x = 0; x < t; x += 1 / 60) step(1 / 60); render(); }, dur: () => TOUR * PRESETS.length };
      return dt => { if (st.held) return; step(dt); render(); };
    });
  }

  /* ---------- 4: pass it around the guild ---------- */
  {
    const W = 1100, H = 600, RX = 340, RY = 300, R = 210, P = 8, MOVE = .62, REST = .3, PASS = MOVE + REST, HOLD = 2.6;
    const COLS8 = ['#2ea3dc', '#2fae63', '#8a4fd6', '#e0a92d', '#e5322d', '#3d4270', '#d65fa8', '#1f9e9a'];
    const seat = i => { const a = -Math.PI / 2 + i * TAU / P; return [RX + Math.cos(a) * R, RY + Math.sin(a) * R, a]; };
    const RATES = [1, 1.5, .5], MAXPASS = [12, 16, 99];
    canvasDemo('guild', (s, cv, g) => {
      const st = { m: 1, cap: false, t: 0, held: false, last: '' };
      const modeBtns = $$(s, '.cv-modes .btn'), capBox = $(s, '.cv-gcap');
      const restart = () => { st.t = 0; st.last = ''; };
      modeBtns.forEach(b => b.onclick = () => { st.m = +b.dataset.m; restart(); });
      capBox.onchange = () => { st.cap = capBox.checked; restart(); };
      $(s, '.cv-grestart').onclick = restart;
      // the whole run is a function of (mode, cap, time): passes made, the value after each, and why it stopped
      function run(m, cap) {
        const r = RATES[m], vals = [100]; let why = null;
        for (let i = 1; ; i++) {
          if (cap && i > P) { why = 'cap'; break; }
          if (m === 2 && vals[i - 1] * r < 1) { why = 'small'; break; }
          if (i > MAXPASS[m]) { why = m === 1 ? 'loop' : 'flat'; break; }
          vals.push(vals[i - 1] * r);
        }
        return { vals, why, passes: vals.length - 1, end: (vals.length - 1) * PASS };
      }
      function step(dt) { const rn = run(st.m, st.cap); st.t += dt; if (st.t > rn.end + HOLD) st.t = 0; }
      function render(time) {
        T.use(g); panel(g, W, H);
        const rn = run(st.m, st.cap), K = KIND[st.m];
        const done = Math.min(rn.passes, Math.floor(st.t / PASS)), inPass = done < rn.passes ? (st.t - done * PASS) / MOVE : 1;
        const holder = done % P, v = rn.vals[done];
        // the ring, with an arrow for each hand-off
        g.strokeStyle = '#d9cdb2'; g.lineWidth = 3; g.setLineDash([6, 8]); g.beginPath(); g.arc(RX, RY, R, 0, TAU); g.stroke(); g.setLineDash([]);
        for (let i = 0; i < P; i++) {
          const [x, y, a] = seat(i), got = st.cap && i > 0 && i <= done || st.cap && i === 0 && done >= P;
          T.player(x, y, a + Math.PI, 1.15, got ? .45 : 1, COLS8[i]);
          if (st.cap && got) T.label('received today', x, y + 40, 'center', C.muted, 12);
        }
        circle(g, RX, RY, 62, time * .4, inPass < 1 ? Math.max(0, 1 - Math.abs(inPass - .7) * 3) : 0, K.col);
        g.font = '700 15px Montserrat, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(`×${RATES[st.m]}`, RX, RY + 1);
        // the gift travelling to the next player, or resting with its holder
        let gx, gy, gv = v;
        if (done < rn.passes && inPass < 1) {
          const [ax, ay] = seat(holder), [bx, by] = seat((holder + 1) % P), e = ease(clamp(inPass));
          gx = lerp(ax, bx, e); gy = lerp(ay, by, e) - Math.sin(e * Math.PI) * 50;
          if (inPass > .7) gv = rn.vals[done + 1];
        } else { [gx, gy] = seat(done % P); gy -= 50; }
        const size = 30 + 26 * clamp(Math.log10(Math.max(gv, .01)) / 6 + .2);
        icon(g, 'coin', gx, gy, size);
        T.label(fmt(gv), gx, gy - size / 2 - 16, 'center', K.col, 17);
        // value after each pass
        const cx0 = 720, cx1 = 1070, cy0 = 470, cy1 = 110, shown = rn.vals.slice(0, done + 1), ymax = Math.max(200, ...shown) * 1.1;
        g.fillStyle = C.ink; g.font = '700 16px Montserrat, sans-serif'; g.textAlign = 'left'; g.fillText('Value after each hand-off', cx0, 80);
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cx1, cy0); g.stroke();
        const y100 = lerp(cy0, cy1, 100 / ymax);
        g.setLineDash([4, 5]); g.beginPath(); g.moveTo(cx0, y100); g.lineTo(cx1, y100); g.stroke(); g.setLineDash([]);
        g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText('100', cx0 - 4, y100);
        const n = Math.max(rn.passes + 1, 9), bw = (cx1 - cx0) / n;
        shown.forEach((y, i) => { const top = lerp(cy0, cy1, y / ymax); g.fillStyle = i === done ? K.col : `rgba(${K.tint},.45)`; g.fillRect(cx0 + i * bw + 3, top, bw - 6, cy0 - top); });
        g.textAlign = 'center'; g.fillText('hand-offs →', (cx0 + cx1) / 2, cy0 + 16);
        // why it stopped
        if (done >= rn.passes && st.t > rn.end) {
          const msg = { cap: 'Daily cap reached: tomorrow it starts again', small: 'Too small to be worth passing on', loop: 'No limit: this can go on forever', flat: 'Still 100 after every hand-off' }[rn.why];
          T.stamp(msg, RX, RY + R + 56, K.col, clamp((st.t - rn.end) * 3), 20);
        }
        modeBtns.forEach((b, i) => b.classList.toggle('on', i === st.m)); capBox.checked = st.cap;
        const key = `${st.m}|${st.cap}|${done}`;
        if (key === st.last) return; st.last = key;
        const d = v - 100;
        say($(s, '.cv-gstats'), `<div><b>${done}</b><span>hand-offs</span></div><div class="${d > 1e-9 ? 'g' : d < -1e-9 ? 'r' : ''}"><b>${d > 1e-9 ? '+' + fmt(d) : d < -1e-9 ? '−' + fmt(-d) : '0'}</b><span>${d > 1e-9 ? 'value created by trading' : d < -1e-9 ? 'value burned by trading' : 'value created or burned'}</span></div>`);
        say($(s, '.cv-gout'), [
          'An equivalent hand-off only moves value: the guild ends the day with exactly what it started with.',
          st.cap ? 'The same growth rate with a daily cap: every player can be boosted once, so a day’s growth has a ceiling.' : 'Each hand-off prints 50% more. With no cap, a pair of friends can trade back and forth and the guild’s economy runs away.',
          'Each hand-off burns half. Boosting stops on its own: after a few passes the gift is too small to matter.',
        ][st.m]);
      }
      let time = 0;
      const TOUR = [[1, false], [1, true], [2, false], [0, false]], segDur = ([m, c]) => run(m, c).end + HOLD;
      demos.guild = {
        seek(t) {
          st.held = true; let at = 0, i = 0;
          while (i < TOUR.length - 1 && t >= at + segDur(TOUR[i])) at += segDur(TOUR[i++]);
          [st.m, st.cap] = TOUR[i]; st.t = Math.min(t - at, segDur(TOUR[i]) - .01); render(t);
        },
        dur: () => TOUR.reduce((a, s) => a + segDur(s), 0),
      };
      return dt => { if (st.held) return; step(dt); time += dt; render(time); };
    });
  }

  window.__seek = (t, which = 'kinds') => demos[which].seek(t);
  window.__dur = (which = 'kinds') => demos[which].dur();
})();
