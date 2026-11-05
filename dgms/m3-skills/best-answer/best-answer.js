/* Is there a clear best answer? Slide 2: the NBA shot chart (DGMS Module 3, Leveraging Player Skills).
   A top-down half court. Every spot within 28 ft has an expected value: make chance (falls with distance, and near a
   defender) times the points the spot is worth. Teams pick shots in proportion to exp(EV / tau): a low tau is a league
   that optimises hard (the analytics era), a high tau one that shoots by feel. The slider runs tau from "2005" to "2025".
   Under 2-and-3 scoring the shots converge on the arc and the rim, like the 2005 vs 2025 shot charts in the deck's notes.
   "Graded payoffs" makes points rise smoothly with distance, so open EV is nearly flat: the best spot is wherever the
   defence is not, and the answer changes when the defence moves. Notes: "Am I making something with a clear best answer?"
   Court geometry is the NBA's (arc 23.75 ft, corners 22 ft, rim 5.25 ft from the baseline). The make-chance curve, the
   contest penalty, the graded payoff formula and tau are illustrative, tuned so the three-point share runs from about
   1 in 5 shots to about 2 in 5, the rough NBA league shares for 2005 and 2025. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2;

  const P = {
    PX: 12, CX: 315, BY: 46, DEPTH: 40,           // px per foot, court centre x, baseline y
    RIM: 5.25, ARC: 23.75, CORNER: 22, CORNER_LEN: 14, MAX_D: 28, CELL: 1.25,
    p: d => .40 + .25 * Math.exp(-d / 2.5) - .0035 * Math.max(0, d - 10),   // open make chance by distance (ft)
    CONTEST: .4, CONTEST_FT: 3.5,      // make chance x (1 - CONTEST * closeness to the nearest defender)
    GRADED: d => 1.1 / (.40 + .25 * Math.exp(-d / 2.5) - .0035 * Math.max(0, d - 10)),   // graded points: open EV flat at 1.1
    PRIOR: d => (1 + 6 * Math.exp(-d / 2.5)) * Math.exp(-d / 18),   // how easy a spot is to get a shot from: drives make the rim common, long shots are rarer
    TAU: [.35, .10],                  // "2005" and "2025"
    DEF: [[[0, 10], [-12, 12], [12, 12], [-16, 22], [16, 22]], [[4, 8], [-10, 18], [15, 14], [-19, 6], [2, 26]]],   // a rim protector and four perimeter defenders; two layouts
    DUR: 18,
  };
  // court feet: x across (-25..25), y out from the baseline (0..47); rim at (0, RIM)
  const toPx = (x, y) => [P.CX + x * P.PX, P.BY + y * P.PX];
  const dist = (x, y) => Math.hypot(x, y - P.RIM);
  const isThree = (x, y) => Math.abs(x) >= P.CORNER ? true : y <= P.CORNER_LEN ? false : dist(x, y) >= P.ARC;
  const CELLS = [];
  for (let x = -25 + P.CELL / 2; x < 25; x += P.CELL) for (let y = P.CELL / 2; y < 47; y += P.CELL) {
    const d = dist(x, y); if (d <= P.MAX_D) CELLS.push({ x, y, d, three: isThree(x, y), rim: d < 4 });
  }

  function model(rule, tau, def) {
    let sum = 0, best = null;
    const ev = CELLS.map(c => {
      const nd = Math.min(...def.map(([dx, dy]) => Math.hypot(c.x - dx, c.y - dy)));
      const close = Math.exp(-nd * nd / (2 * P.CONTEST_FT * P.CONTEST_FT));
      const pm = P.p(c.d) * (1 - P.CONTEST * close);
      const pts = rule === 'classic' ? (c.three ? 3 : 2) : P.GRADED(c.d);
      return pm * pts;
    });
    const mx = Math.max(...ev);
    const w = CELLS.map((c, i) => { const v = P.PRIOR(c.d) * Math.exp((ev[i] - mx) / tau); sum += v; return v; });
    let three = 0, rim = 0, mid = 0, H = 0;
    w.forEach((v, i) => { const s = v / sum; w[i] = s; if (CELLS[i].three) three += s; else if (CELLS[i].rim) rim += s; else mid += s; if (s > 0) H -= s * Math.log(s); if (!best || ev[i] > ev[best]) best = i; });
    return { ev, w, three, rim, mid, spots: Math.exp(H), best, mx };
  }

  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const HEAT = ['#fbf3e1', '#fbd9a0', '#f5a65b', '#e5622d', '#b4201c'];
  function heat(k) {
    k = clamp(k) * (HEAT.length - 1); const i = Math.min(HEAT.length - 2, Math.floor(k)), f = k - i;
    const a = HEAT[i].match(/\w\w/g).map(h => parseInt(h, 16)), b = HEAT[i + 1].match(/\w\w/g).map(h => parseInt(h, 16));
    return `rgb(${a.map((v, j) => Math.round(lerp(v, b[j], f))).join(',')})`;
  }

  function court(g, m, def, rule) {
    const [x0, y0] = toPx(-25, 0), w = 50 * P.PX, h = P.DEPTH * P.PX;
    g.fillStyle = '#efe0bf'; g.fillRect(x0, y0, w, h);
    const top = Math.max(...m.w), cs = P.CELL * P.PX;
    CELLS.forEach((c, i) => { const [px, py] = toPx(c.x, c.y); g.fillStyle = heat(Math.sqrt(m.w[i] / top)); g.fillRect(px - cs / 2, py - cs / 2, cs + .6, cs + .6); });
    // lines
    g.strokeStyle = C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x0, y0 + h); g.lineTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h); g.stroke();
    g.setLineDash([6, 8]); g.beginPath(); g.moveTo(x0, y0 + h); g.lineTo(x0 + w, y0 + h); g.stroke(); g.setLineDash([]);
    const [lx] = toPx(-8, 0), [, ly] = toPx(0, 19); g.strokeRect(lx, y0, 16 * P.PX, ly - y0);
    const [rx, ry] = toPx(0, P.RIM);
    g.beginPath(); g.arc(rx, ly, 6 * P.PX, 0, Math.PI); g.stroke();
    const a0 = Math.asin((P.CORNER_LEN - P.RIM) / P.ARC);   // where the arc meets the corner lines
    g.strokeStyle = rule === 'classic' ? C.navy : 'rgba(21,32,68,.35)'; g.lineWidth = 3;
    g.beginPath(); const [c1x] = toPx(-P.CORNER, 0), [, c1y] = toPx(0, P.CORNER_LEN);
    g.moveTo(c1x, y0); g.lineTo(c1x, c1y);
    g.arc(rx, ry, P.ARC * P.PX, Math.PI - a0, a0, true);
    g.lineTo(toPx(P.CORNER, 0)[0], y0); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 2;
    const [, bb] = toPx(0, 4); g.beginPath(); g.moveTo(rx - 3 * P.PX, toPx(0, 4)[1]); g.lineTo(rx + 3 * P.PX, toPx(0, 4)[1]); g.stroke();
    g.strokeStyle = '#e5622d'; g.lineWidth = 3; g.beginPath(); g.arc(rx, ry, .75 * P.PX + 2, 0, TAU); g.stroke();
    // defenders
    def.forEach(([dx, dy]) => { const [px, py] = toPx(dx, dy); T.foe(px, py, 13, -Math.PI / 2, C.ink, { edge: C.navy }); });
    const [bx, by] = toPx(CELLS[m.best].x, CELLS[m.best].y);
    g.strokeStyle = '#1a8a4c'; g.lineWidth = 3; g.beginPath(); g.arc(bx, by, 14, 0, TAU); g.stroke();
  }

  function evChart(g, rule, x0, y0, w, h) {
    txt(g, 'Open-shot points per attempt by distance', x0, y0 - 22, '800 16px Montserrat, Jost, sans-serif', C.ink);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5;
    const X = d => x0 + d / P.MAX_D * w, Y = v => y0 + h - v / 1.5 * h;
    [0, .5, 1, 1.5].forEach(v => { g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x0 + w, Y(v)); g.stroke(); txt(g, v.toFixed(1), x0 - 8, Y(v), '500 12px Jost, sans-serif', C.muted, 'right'); });
    [0, 4, 10, 14, 22, 28].forEach(d => txt(g, d + ' ft', X(d), y0 + h + 14, '500 12px Jost, sans-serif', C.muted, 'center'));
    g.fillStyle = 'rgba(46,163,220,.12)'; g.fillRect(X(P.CORNER), y0, w - (X(P.CORNER) - x0), h);
    txt(g, 'three-point range', X(25), y0 + 12, '600 12px Jost, sans-serif', C.player, 'center');
    g.strokeStyle = rule === 'classic' ? C.red : '#1a8a4c'; g.lineWidth = 3.5; g.beginPath();
    for (let d = 0; d <= P.MAX_D; d += .1) {
      const v = P.p(d) * (rule === 'classic' ? (d >= P.ARC ? 3 : 2) : P.GRADED(d));
      if (rule === 'classic' && Math.abs(d - P.ARC) < .05) g.lineTo(X(d), Y(P.p(d) * 2));
      d ? g.lineTo(X(d), Y(v)) : g.moveTo(X(d), Y(v));
    }
    g.stroke();
    if (rule === 'classic') {
      [[1, 'rim', -14, 'left'], [21, 'long two', 16, 'center'], [25.5, 'three', -14, 'center']].forEach(([d, n, dy, al]) => { const v = P.p(d) * (d >= P.ARC ? 3 : 2); txt(g, `${n} ${v.toFixed(2)}`, X(d) + (al === 'left' ? 6 : 0), Y(v) + dy, '700 13px Jost, sans-serif', C.red, al); });
    } else txt(g, 'flat: about 1.1 everywhere when open', X(11), Y(1.1) + 18, '700 13px Jost, sans-serif', '#1a8a4c', 'center');
  }

  function mixBar(g, x0, y0, w, m) {
    txt(g, 'Shot mix', x0, y0, '800 16px Montserrat, Jost, sans-serif', C.ink);
    const parts = [['at the rim', m.rim, '#e5622d'], ['midrange', m.mid, '#cdbf9f'], ['threes', m.three, C.player]];
    let x = x0;
    parts.forEach(([n, v, col]) => { g.fillStyle = col; g.fillRect(x, y0 + 16, w * v, 26); x += w * v; });
    let lx = x0;
    parts.forEach(([n, v, col], i) => { txt(g, `${n} ${Math.round(v * 100)}%`, x0 + i * w / 3, y0 + 58, '700 14px Jost, sans-serif', col === '#cdbf9f' ? C.muted : col); });
  }

  let api;
  canvasDemo('court', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, rule: 'classic', year: 2005, def: 0, defK: 0, key: '' };
    const tourBtn = $(s, '.ba-tour'), yIn = $(s, '.ba-y');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.ba-rule .btn').forEach(b => b.onclick = () => { free(); st.rule = b.dataset.r; });
    yIn.oninput = () => { free(); st.year = +yIn.value; };
    $(s, '.ba-def').onclick = () => { free(); st.def = 1 - st.def; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render(dt = 0) {
      let rule = st.rule, year = st.year, dk;
      st.defK += (st.def - st.defK) * clamp(dt * 4);
      dk = st.defK;
      if (st.tour) {
        const t = st.t;
        year = Math.round(lerp(2005, 2025, ease(clamp((t - 1) / 5))));
        rule = t < 9 ? 'classic' : 'graded';
        dk = t < 11 ? 0 : t < 13.5 ? ease(clamp((t - 11) / 2.5)) : 1 - ease(clamp((t - 15) / 2.5));
        yIn.value = year;
      }
      $$(s, '.ba-rule .btn').forEach(b => b.classList.toggle('on', b.dataset.r === rule));
      $(s, '.ba-yv').textContent = year;
      const k = (year - 2005) / 20, tau = Math.exp(lerp(Math.log(P.TAU[0]), Math.log(P.TAU[1]), k));
      const def = P.DEF[0].map((a, i) => [lerp(a[0], P.DEF[1][i][0], dk), lerp(a[1], P.DEF[1][i][1], dk)]);
      const m = model(rule, tau, def);
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      court(g, m, def, rule);
      const x0 = 640;
      txt(g, `${rule === 'classic' ? '2 and 3 points' : 'Graded payoffs'} · ${year}`, x0, 44, '800 22px Montserrat, Jost, sans-serif', C.ink);
      txt(g, 'heat = share of shots taken from each spot', x0, 72, '600 14px Jost, sans-serif', C.muted);
      evChart(g, rule, x0 + 26, 130, 340, 150);
      mixBar(g, x0, 340, 370, m);
      txt(g, `${Math.round(m.spots)}`, x0, 450, '800 40px Montserrat, Jost, sans-serif', m.spots > 450 ? '#1a8a4c' : C.red);
      const nw = g.measureText(`${Math.round(m.spots)}`).width + 14;
      txt(g, 'spots in real use (effective count)', x0 + nw, 442, '600 15px Jost, sans-serif', C.ink);
      txt(g, `of ${CELLS.length} on the chart`, x0 + nw, 462, '500 13px Jost, sans-serif', C.muted);
      T.foe(x0 + 12, 510, 10, -Math.PI / 2, C.ink, { edge: C.navy }); txt(g, 'defender', x0 + 30, 510, '600 14px Jost, sans-serif', C.ink);
      g.strokeStyle = '#1a8a4c'; g.lineWidth = 3; g.beginPath(); g.arc(x0 + 130, 510, 9, 0, TAU); g.stroke(); txt(g, 'highest-value spot', x0 + 146, 510, '600 14px Jost, sans-serif', C.ink);
      txt(g, 'make chances and payoffs are illustrative', x0, 548, 'italic 500 13px Jost, sans-serif', C.muted);
      const key = [rule, year, Math.round(dk * 20)].join(); if (key === st.key) return; st.key = key;
      say($(s, '.ba-stats'), `<div class="${rule === 'classic' ? 'r' : 'g'}"><b>${Math.round((m.rim + m.three) * 100)}%</b><span>of shots at the rim or from three</span></div>`
        + `<div><b>${m.mx.toFixed(2)}</b><span>points per attempt at the highest-value spot</span></div>`
        + `<div class="y"><b>${Math.round(m.spots)}</b><span>spots in real use, of ${CELLS.length}</span></div>`);
      say($(s, '.ba-out'), rule === 'classic'
        ? (year < 2012 ? 'Teams shooting by feel still spread out. Drag toward 2025: once teams optimise, the midrange empties, because there is a clear best answer.'
          : 'The clear best answer: a 22-foot two is worth less than a 24-foot three for almost the same skill, so optimised play converges on the arc and the rim.')
        : 'Graded payoffs: every open spot is worth about the same, so the best shot is wherever the defence is not. Move the defence and the answer moves with it.');
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; st.key = ''; render(); }, dur: () => P.DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > P.DUR) st.t = 0; render(Math.max(0, dt)); };
  });
  (window.BA_APIS = window.BA_APIS || {}).court = { seek: t => api.seek(t), dur: () => api.dur() };
  window.__baModel = (rule, year) => { const k = (year - 2005) / 20, tau = Math.exp(lerp(Math.log(P.TAU[0]), Math.log(P.TAU[1]), k)); const m = model(rule, tau, P.DEF[0]); return { rim: m.rim.toFixed(2), mid: m.mid.toFixed(2), three: m.three.toFixed(2), spots: Math.round(m.spots), n: CELLS.length }; };
})();
