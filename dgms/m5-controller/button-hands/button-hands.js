/* The button is the hand (mock-up for DGMS M5, beside Controls as metaphor).
   1. Shadow of the Colossus: hold R1 to grip; a gauge drains while hanging; shakes throw you off unless you grip.
   2. Death Stranding: L2 and R2 pull the load toward their side; both steady it at a slower walk. Three policies race.
   3. Katamari Damacy: two sticks push a ball tank style; it rolls up anything smaller than itself.
   Each walk-through re-simulates from t = 0 with a fixed step, so every frame is a pure function of t. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, DT = 0.02;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const bg = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const rr = (g, x, y, w, h, r, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const inside = (list, t) => list.some(([a, b]) => t >= a && t < b);
  // a hold button plus keyboard keys, live only while this slide is showing
  function holdInput(s, btn, keys, onUse) {
    const st = { down: false, ptr: false, key: false }, set = () => { st.down = st.ptr || st.key; btn.classList.toggle('down', st.down); };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); st.ptr = true; onUse(); set(); btn.setPointerCapture?.(e.pointerId); });
    ['pointerup', 'pointercancel'].forEach(n => btn.addEventListener(n, () => { st.ptr = false; set(); }));
    addEventListener('keydown', e => { if (!s.classList.contains('active') || !keys.includes(e.key.toLowerCase()) || e.repeat) return; st.key = true; onUse(); set(); });
    addEventListener('keyup', e => { if (keys.includes(e.key.toLowerCase())) { st.key = false; set(); } });
    return st;
  }
  function lanesAxis(g, x0, x1, y, span) { [0, 10, 20, 30].filter(v => v <= span).forEach(v => txt(g, v + ' s', x0 + (x1 - x0) * v / span, y, { font: '600 11px Jost', col: C.muted, align: 'center' })); }
  function flag(g, x, y, lab, col) { g.font = '800 12px Montserrat'; const w = g.measureText(lab).width + 12; rr(g, x - w / 2, y - 10, w, 20, 5, col); txt(g, lab, x, y + 1, { font: '800 12px Montserrat', col: '#fff', align: 'center' }); }

  /* ---------- 1. Shadow of the Colossus ---------- */
  const GSPAN = 37, LEDGES = [0, 35, 70, 100], SHAKES = [[5, 7], [13, 15.5], [21, 23], [29, 31]], PINK = '#e0569b';
  const GRIP_TOUR = [[0.5, 4.9], [5, 7], [10, 17], [20, 26.4], [29, 31], [32, 37]];
  function gripInit() { return { t: 0, h: 0, grip: 100, lock: false, done: null, pts: [], ev: [] }; }
  function gripStep(st, hold) {
    const t = st.t, shaking = inside(SHAKES, t);
    if (st.done === null) {
      if (!hold) st.lock = false;
      if (hold && !st.lock) {
        if (shaking) st.grip -= 25 * DT; else { st.h += 8 * DT; st.grip -= 10 * DT; }
        if (st.h >= 100) { st.h = 100; st.done = t; st.ev.push([t, 'top']); }
        else if (st.grip <= 0) { st.grip = 0; st.lock = true; const l = Math.max(...LEDGES.filter(v => v <= st.h)); st.ev.push([t, 'slip']); st.h = l; }
      } else {
        const l = Math.max(...LEDGES.filter(v => v <= st.h + 1e-6));
        if (st.h - l > 3) st.ev.push([t, 'fall']);
        st.h = l;
        if (shaking && st.h > 0) { st.ev.push([t, 'thrown']); st.h = 0; }
        st.grip = Math.min(100, st.grip + 35 * DT);
      }
    }
    st.pts.push({ t, h: st.h, grip: st.grip, hold: hold && !st.lock, shake: shaking });
    st.t += DT;
  }
  const gripTour = (() => { const st = gripInit(); while (st.t <= GSPAN) gripStep(st, inside(GRIP_TOUR, st.t)); return st; })();
  const EVN = { slip: ['grip gave out', PINK], fall: ['let go mid-climb', C.muted], thrown: ['shaken off', C.red], top: ['weak point', C.good] };
  function drawGrip(g, run, t) {
    bg(g);
    const i = clamp(Math.round(t / DT), 0, run.pts.length - 1), p = run.pts[i] || { h: 0, grip: 100, hold: false, shake: false };
    const dx = p.shake ? 5 * Math.sin(t * 47) : 0, yOf = h => 525 - 4.5 * h;
    // the colossus
    g.save(); g.translate(dx, 0);
    rr(g, 190, 50, 250, 490, 40, '#6b5a48');
    const R = mulberry(7); g.strokeStyle = '#4e4033'; g.lineWidth = 3; g.lineCap = 'round';
    for (let k = 0; k < 170; k++) { const x = 200 + R() * 230, y = 70 + R() * 450; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4 - R() * 8, y + 10 + R() * 8); g.stroke(); }
    [35, 70].forEach(l => { rr(g, 430, yOf(l) - 2, 80, 18, 6, '#9a9488'); g.fillStyle = '#7d776c'; g.fillRect(434, yOf(l) + 10, 72, 6); txt(g, 'ledge', 470, yOf(l) + 28, { font: '700 11px Jost', col: C.muted, align: 'center' }); });
    const glow = g.createRadialGradient(315, yOf(100), 2, 315, yOf(100), 30); glow.addColorStop(0, 'rgba(140,210,255,.95)'); glow.addColorStop(1, 'rgba(140,210,255,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(315, yOf(100), 30, 0, TAU); g.fill(); txt(g, 'weak point', 315, yOf(100) - 30, { font: '700 12px Jost', col: '#2a6fa8', align: 'center' });
    // Wander
    const onLedge = !p.hold && LEDGES.includes(Math.round(p.h * 1000) / 1000) && p.h > 0, wy = yOf(p.h), wx = p.hold ? 448 : p.h > 0 ? 470 : 470;
    g.lineWidth = 4; g.strokeStyle = '#2b2b44'; g.fillStyle = '#e9e4d6';
    if (p.hold) {
      g.beginPath(); g.moveTo(wx, wy - 26); g.lineTo(436, wy - 52); g.stroke();               // arm up into the fur
      g.beginPath(); g.ellipse(wx + 2, wy - 12, 9, 16, 0, 0, TAU); g.fill(); g.stroke();       // body
      g.beginPath(); g.moveTo(wx, wy + 2); g.lineTo(wx - 4, wy + 22); g.moveTo(wx + 5, wy + 2); g.lineTo(wx + 10, wy + 20); g.stroke();
      g.fillStyle = '#3b2f2a'; g.beginPath(); g.arc(wx + 3, wy - 36, 8, 0, TAU); g.fill();
    } else {
      const fy = p.h > 0 ? yOf(p.h) - 4 : yOf(0) + 2;
      g.beginPath(); g.moveTo(wx - 4, fy); g.lineTo(wx, fy - 20); g.lineTo(wx + 4, fy); g.stroke();
      g.beginPath(); g.ellipse(wx, fy - 32, 9, 15, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(wx - 7, fy - 36); g.lineTo(wx - 14, fy - 20); g.moveTo(wx + 7, fy - 36); g.lineTo(wx + 14, fy - 20); g.stroke();
      g.fillStyle = '#3b2f2a'; g.beginPath(); g.arc(wx, fy - 54, 8, 0, TAU); g.fill();
    }
    g.restore();
    g.fillStyle = '#c9bc9c'; g.fillRect(20, yOf(0) + 2, 580, 30); txt(g, 'ground', 40, yOf(0) + 17, { font: '700 11px Jost', col: C.muted });
    // grip gauge
    const gx = 545, gy = Math.max(70, wy - 40);
    g.lineWidth = 8; g.strokeStyle = 'rgba(38,44,106,.15)'; g.beginPath(); g.arc(gx, gy, 22, 0, TAU); g.stroke();
    g.strokeStyle = p.grip < 25 ? C.red : PINK; g.beginPath(); g.arc(gx, gy, 22, -Math.PI / 2, -Math.PI / 2 + TAU * p.grip / 100); g.stroke();
    txt(g, 'grip', gx, gy + 1, { font: '800 11px Montserrat', col: C.navy, align: 'center' });
    if (p.shake) flag(g, 315, 30, 'the colossus shakes', C.red);
    // R1 button
    const bx = 830, by = 54, down = p.hold;
    rr(g, bx - 70, by - 22 + (down ? 3 : 0), 140, 44, 12, down ? PINK : '#e6e8f4'); g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.roundRect(bx - 70, by - 22 + (down ? 3 : 0), 140, 44, 12); g.stroke();
    txt(g, 'R1', bx, by + 1 + (down ? 3 : 0), { font: '800 20px Montserrat', col: down ? '#fff' : C.navy, align: 'center' });
    txt(g, down ? 'held: the hand is closed' : 'released: the hand is open', bx, by + 40, { font: '700 13px Jost', col: down ? PINK : C.muted, align: 'center' });
    // timeline
    const X0 = 640, X1 = 1015, px = v => X0 + (X1 - X0) * v / GSPAN, vis = run.pts.slice(0, i + 1);
    const L1 = 130, L2 = 168, CY = 210, CH = 250, py = v => CY + CH - CH * v / 100;
    txt(g, 'R1 held', X0, L1 - 14, { font: '700 11px Jost', col: C.muted }); txt(g, 'colossus shakes', X0, L2 - 14, { font: '700 11px Jost', col: C.muted });
    rr(g, X0, L1 - 4, X1 - X0, 10, 4, 'rgba(38,44,106,.08)'); rr(g, X0, L2 - 4, X1 - X0, 10, 4, 'rgba(38,44,106,.08)');
    SHAKES.forEach(([a, b]) => { g.fillStyle = 'rgba(229,50,45,.25)'; g.fillRect(px(a), L2 - 4, px(b) - px(a), 10); g.fillStyle = 'rgba(229,50,45,.07)'; g.fillRect(px(a), CY, px(b) - px(a), CH); });
    g.fillStyle = PINK; vis.forEach(q => { if (q.hold) g.fillRect(px(q.t), L1 - 4, (X1 - X0) * DT / GSPAN + 0.6, 10); });
    g.fillStyle = 'rgba(239,230,210,.55)'; g.fillRect(X0, CY, X1 - X0, CH);
    [35, 70].forEach(l => { g.setLineDash([4, 4]); g.strokeStyle = 'rgba(38,44,106,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X0, py(l)); g.lineTo(X1, py(l)); g.stroke(); g.setLineDash([]); });
    [['h', C.navy], ['grip', PINK]].forEach(([f, col]) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); vis.forEach((q, k) => k ? g.lineTo(px(q.t), py(q[f])) : g.moveTo(px(q.t), py(q[f]))); g.stroke(); });
    g.strokeStyle = C.navy; g.lineWidth = 1.5; g.strokeRect(X0, CY, X1 - X0, CH);
    run.ev.filter(([e]) => e <= t).forEach(([e, k], n) => { const [lab, col] = EVN[k]; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(px(e), CY); g.lineTo(px(e), CY + CH); g.stroke(); flag(g, clamp(px(e), X0 + 50, X1 - 50), CY + CH + 22 + (n % 2) * 22, lab, col); });
    lanesAxis(g, X0, X1, CY - 10, GSPAN);
    g.fillStyle = C.navy; g.fillRect(X0, H - 14, 16, 3); txt(g, 'height', X0 + 22, H - 13, { font: '600 12px Jost', col: C.muted });
    g.fillStyle = PINK; g.fillRect(X0 + 90, H - 14, 16, 3); txt(g, 'grip', X0 + 112, H - 13, { font: '600 12px Jost', col: C.muted });
  }
  canvasDemo('grip', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, key: '', run: gripInit() }, tourBtn = $(s, '.sg-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.run = gripInit(); } };
    const r1 = holdInput(s, $(s, '.sg-r1'), ['r'], manual);
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.sg-reset').onclick = () => { manual(); st.run = gripInit(); };
    function info(run, t, cap) {
      const n = k => run.ev.filter(([e, x]) => x === k && e <= t).length, top = run.done !== null && run.done <= t;
      const k = cap + n('slip') + n('thrown') + n('fall') + top; if (k === st.key) return; st.key = k;
      say($(s, '.sg-stats'), `<div class="${top ? 'g' : 'y'}"><b>${top ? run.done.toFixed(1) + ' s' : '…'}</b><span>${top ? 'reached the weak point' : 'still climbing'}</span></div><div class="r"><b>${n('slip') + n('thrown') + n('fall')}</b><span>falls: ${n('slip')} grip gave out, ${n('thrown')} shaken off, ${n('fall')} let go mid-climb</span></div>`);
      say($(s, '.sg-out'), cap);
    }
    const cap = t => t < 5 ? 'Holding R1 is holding on: Wander climbs while you hold, and the pink gauge drains like a tiring arm.'
      : t < 10 ? 'On the ledge he lets go and the gauge refills. When the colossus shakes, he grips again, even on a ledge, or he is thrown off.'
      : t < 19 ? 'The second climb holds through a shake with too little grip left. The hand gives out, and he drops back to the ledge.'
      : t < 29 ? 'Rested, he climbs again, holding through the next shake with a full gauge, and reaches the upper ledge.' : 'One more shake on the ledge, one more rest, and he reaches the weak point. The button taught the rhythm: grip, rest, grip.';
    s._seek = t => { drawGrip(g, gripTour, Math.min(GSPAN, t)); info(gripTour, t, cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => GSPAN + 2;
    return dt => {
      if (st.held) return; dt = Math.max(0, dt);
      if (st.tour) { st.t += dt; if (st.t >= GSPAN + 2) st.t = 0; s._seek(st.t); return; }
      const run = st.run, end = run.t + dt; while (run.t < Math.min(end, GSPAN)) gripStep(run, r1.down);
      drawGrip(g, run, Math.min(run.t, GSPAN));
      info(run, run.t, run.done !== null ? 'You reached the weak point. Try it with fewer rests.' : run.t >= GSPAN ? 'Time is up. Start over and rest on the ledges before the shakes.' : 'Hold R1 or the R key to grip and climb. Let go on a ledge to rest; grip again when the colossus shakes.');
    };
  });

  /* ---------- 2. Death Stranding ---------- */
  const DSPAN = 30, BUMPS = [[1.5, 7], [3.5, -9], [6, -6], [8, 10], [10.5, -8], [12, 8], [14.5, -10], [17, 6], [19, -7], [21.5, 9], [24, -8], [26, 7], [28.5, -9]];
  const DSL = '#2ea3dc', DSR = '#e0a92d', POL = [
    { key: 'none', name: 'No hands', rule: 'never touch the triggers' },
    { key: 'one', name: 'One hand at a time', rule: 'pull the strap opposite the lean' },
    { key: 'both', name: 'Both hands', rule: 'hold L2 and R2 the whole way' },
  ];
  function dsInit() { return { t: 0, th: 0, d: 0, down: 0, falls: 0, bi: 0, pts: [], ev: [], hand: 0 }; }
  function dsStep(st, L, R) {
    const t = st.t;
    while (st.bi < BUMPS.length && BUMPS[st.bi][0] <= t) { if (st.down <= 0) st.th += BUMPS[st.bi][1]; st.bi++; }
    if (st.down > 0) { st.down -= DT; L = R = false; }
    else {
      if (L && R) st.th += -3 * st.th * DT; else st.th += (0.8 * st.th + (R ? 45 : 0) - (L ? 45 : 0)) * DT;
      st.d += (L && R ? 0.9 : 1.5) * DT;
      if (Math.abs(st.th) >= 30) { st.ev.push([t, st.th]); st.falls++; st.down = 3; st.th = 0; }
    }
    st.pts.push({ t, th: st.th, L, R, d: st.d, down: st.down > 0 });
    st.t += DT;
  }
  function dsPolicy(key) {
    const st = dsInit();
    while (st.t <= DSPAN) {
      let L = false, R = false;
      if (key === 'both') L = R = true;
      if (key === 'one') { if (st.hand === 0 && st.th < -4) st.hand = 1; if (st.hand === 0 && st.th > 4) st.hand = -1; if (st.hand === 1 && st.th >= 0) st.hand = 0; if (st.hand === -1 && st.th <= 0) st.hand = 0; R = st.hand === 1; L = st.hand === -1; }
      dsStep(st, L, R);
    }
    return st;
  }
  const DSRUNS = POL.map(p => dsPolicy(p.key));
  function drawSam(g, p, t, rocksAt) {
    const gx = 40, gw = 960, gy = 205, sx = 470;
    g.fillStyle = '#d9cdb0'; g.fillRect(gx, gy, gw, 26); g.strokeStyle = '#b5a77f'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + gw, gy); g.stroke();
    rocksAt.forEach(([bt]) => { const x = sx + (bt - t) * 110; if (x < gx + 10 || x > gx + gw - 10) return; g.fillStyle = '#8b8fa8'; g.beginPath(); g.ellipse(x, gy - 2, 14, 8, 0, Math.PI, TAU); g.fill(); });
    const th = p.th * Math.PI / 180, walk = p.d * 7, down = p.down;
    g.lineCap = 'round'; g.strokeStyle = '#2b2b44'; g.lineWidth = 5;
    if (down) { g.fillStyle = '#c96b2d'; [0, 1, 2].forEach(k => { g.fillRect(sx + 30 + k * 34, gy - 22, 30, 22); }); g.lineWidth = 5; g.beginPath(); g.moveTo(sx - 40, gy - 6); g.lineTo(sx + 10, gy - 10); g.stroke(); g.fillStyle = '#3b2f2a'; g.beginPath(); g.arc(sx - 48, gy - 8, 9, 0, TAU); g.fill(); flag(g, sx, gy - 70, 'cargo down', C.red); return; }
    // legs
    [0, Math.PI].forEach(o => { const a = Math.sin(walk + o) * 0.45; g.beginPath(); g.moveTo(sx, gy - 52); g.lineTo(sx + Math.sin(a) * 52, gy - 52 + Math.cos(a) * 52); g.stroke(); });
    // torso leans with the load
    g.save(); g.translate(sx, gy - 52); g.rotate(th * 0.5);
    g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -56); g.stroke();
    g.fillStyle = '#3b2f2a'; g.beginPath(); g.arc(4, -70, 11, 0, TAU); g.fill();
    // the load, behind him
    g.save(); g.translate(-14, -50); g.rotate(th * 0.6);
    ['#c96b2d', '#d8833f', '#e09b55', '#c96b2d'].forEach((c, k) => { rr(g, -42, -k * 26, 38, 24, 3, c); g.strokeStyle = '#7a3e14'; g.lineWidth = 1.5; g.strokeRect(-42, -k * 26, 38, 24); });
    g.restore();
    // arms: up to the straps when a trigger is held
    g.strokeStyle = '#2b2b44'; g.lineWidth = 5;
    [[p.L, DSL, -6], [p.R, DSR, 6]].forEach(([on, col, o]) => { g.strokeStyle = on ? col : '#2b2b44'; g.beginPath(); g.moveTo(0, -48); if (on) { g.lineTo(10 + o, -36); g.lineTo(-6 + o, -50); } else { g.lineTo(10 + o, -24); g.lineTo(12 + o, -4); } g.stroke(); });
    g.restore();
    // lean gauge
    const cx = 690, cy = 120;
    g.lineWidth = 10; g.strokeStyle = 'rgba(38,44,106,.12)'; g.beginPath(); g.arc(cx, cy, 70, Math.PI * 1.25, Math.PI * 1.75); g.stroke();
    g.strokeStyle = 'rgba(229,50,45,.5)'; [[1.25, 1.3333], [1.6667, 1.75]].forEach(([a, b]) => { g.beginPath(); g.arc(cx, cy, 70, Math.PI * a, Math.PI * b); g.stroke(); });
    const na = -Math.PI / 2 + th; g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(na) * 64, cy + Math.sin(na) * 64); g.stroke();
    txt(g, `lean ${p.th < -1 ? 'left' : p.th > 1 ? 'right' : 'centred'} ${Math.abs(p.th).toFixed(0)}°`, cx, cy + 20, { font: '800 14px Montserrat', col: C.navy, align: 'center' });
    txt(g, 'falls past 30°', cx, cy + 40, { font: '600 11px Jost', col: C.muted, align: 'center' });
    // triggers
    [['L2', p.L, DSL, 840], ['R2', p.R, DSR, 950]].forEach(([n, on, col, x]) => {
      rr(g, x - 40, 70 + (on ? 4 : 0), 80, 46, 14, on ? col : '#e6e8f4'); g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x - 40, 70 + (on ? 4 : 0), 80, 46, 14); g.stroke();
      txt(g, n, x, 94 + (on ? 4 : 0), { font: '800 20px Montserrat', col: on ? '#fff' : C.navy, align: 'center' });
      txt(g, n === 'L2' ? 'left hand' : 'right hand', x, 136, { font: '700 12px Jost', col: on ? col : C.muted, align: 'center' });
    });
    txt(g, p.L && p.R ? 'both straps: steady, slower' : p.L ? 'pulling the load left' : p.R ? 'pulling the load right' : 'hands free', 895, 160, { font: '700 13px Jost', col: C.navy, align: 'center' });
  }
  function drawStraps(g, focus, t, focusName) {
    bg(g);
    const i = clamp(Math.round(t / DT), 0, focus.pts.length - 1), p = focus.pts[i] || { th: 0, L: false, R: false, d: 0, down: false };
    txt(g, focusName, 40, 30, { font: '800 16px Montserrat' });
    txt(g, `${focus.pts[i] ? p.d.toFixed(1) : '0.0'} m walked · ${focus.ev.filter(([e]) => e <= t).length} falls`, 40, 52, { font: '600 13px Jost', col: C.muted });
    drawSam(g, p, t, BUMPS);
    const X0 = 230, X1 = 900, px = v => X0 + (X1 - X0) * v / DSPAN;
    DSRUNS.forEach((r, k) => {
      const y0 = 262 + k * 104, mid = y0 + 40, py = v => mid - 34 * v / 30, q = r.pts[clamp(Math.round(t / DT), 0, r.pts.length - 1)], vis = r.pts.slice(0, Math.round(t / DT) + 1);
      txt(g, POL[k].name, 40, y0 + 22, { font: '800 15px Montserrat' }); txt(g, POL[k].rule, 40, y0 + 42, { font: '600 11px Jost', col: C.muted });
      g.fillStyle = 'rgba(239,230,210,.55)'; g.fillRect(X0, mid - 34, X1 - X0, 68);
      g.fillStyle = 'rgba(229,50,45,.12)'; g.fillRect(X0, mid - 40, X1 - X0, 6); g.fillRect(X0, mid + 34, X1 - X0, 6);
      g.strokeStyle = 'rgba(38,44,106,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X0, mid); g.lineTo(X1, mid); g.stroke();
      txt(g, 'R', X0 - 8, mid - 26, { font: '700 10px Jost', col: C.muted, align: 'right' }); txt(g, 'L', X0 - 8, mid + 26, { font: '700 10px Jost', col: C.muted, align: 'right' });
      vis.forEach(v => { if (v.L) { g.fillStyle = DSL; g.fillRect(px(v.t), mid + 44, (X1 - X0) * DT / DSPAN + .6, 4); } if (v.R) { g.fillStyle = DSR; g.fillRect(px(v.t), mid + 49, (X1 - X0) * DT / DSPAN + .6, 4); } if (v.down) { g.fillStyle = 'rgba(229,50,45,.18)'; g.fillRect(px(v.t), mid - 34, (X1 - X0) * DT / DSPAN + .6, 68); } });
      g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); let pen = false; vis.forEach(v => { if (v.down) { pen = false; return; } pen ? g.lineTo(px(v.t), py(v.th)) : g.moveTo(px(v.t), py(v.th)); pen = true; }); g.stroke();
      r.ev.filter(([e]) => e <= t).forEach(([e]) => { g.fillStyle = C.red; g.beginPath(); g.arc(px(e), mid, 6, 0, TAU); g.fill(); });
      g.strokeStyle = 'rgba(21,32,68,.4)'; g.lineWidth = 1; g.strokeRect(X0, mid - 34, X1 - X0, 68);
      txt(g, `${q.d.toFixed(1)} m`, X1 + 14, mid - 8, { font: '800 18px Montserrat', col: C.navy });
      const f = r.ev.filter(([e]) => e <= t).length; txt(g, `${f} fall${f === 1 ? '' : 's'}`, X1 + 14, mid + 14, { font: '700 13px Jost', col: f ? C.red : C.good });
    });
    lanesAxis(g, X0, X1, 252, DSPAN);
    txt(g, 'line: lean (up is right, down is left) · shaded: cargo down for 3 s · bars below: L2 held, R2 held', X0, H - 8, { font: '600 11px Jost', col: C.muted });
  }
  canvasDemo('straps', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, key: '', run: dsInit() }, tourBtn = $(s, '.ds-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.run = dsInit(); } };
    const l2 = holdInput(s, $(s, '.ds-l2'), ['q'], manual), r2 = holdInput(s, $(s, '.ds-r2'), ['e'], manual);
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.ds-reset').onclick = () => { manual(); st.run = dsInit(); };
    function info(focus, t, cap) {
      const k = cap + Math.floor(t); if (k === st.key) return; st.key = k;
      const at = r => r.pts[clamp(Math.round(t / DT), 0, r.pts.length - 1)];
      const rows = (st.tour ? DSRUNS.map((r, i) => [POL[i].name, r]) : [['You', focus], ...DSRUNS.map((r, i) => [POL[i].name, r])]);
      say($(s, '.ds-stats'), rows.map(([n, r]) => { const f = r.ev.filter(([e]) => e <= t).length; return `<div class="${f ? 'r' : 'g'}"><b>${at(r) ? at(r).d.toFixed(1) : '0.0'} m</b><span>${n}: ${f} fall${f === 1 ? '' : 's'}</span></div>`; }).join(''));
      say($(s, '.ds-out'), cap);
    }
    const cap = t => t < 7 ? 'Each trigger is one hand on one strap. When the load tips left, R2 pulls it back to the right; when it tips right, L2 pulls it left.'
      : t < 15 ? 'With no hands, every bump grows until the cargo goes over. One hand at the right moment keeps Sam upright at full speed.'
      : t < 23 ? 'Holding both straps never falls, but Sam walks more slowly, so the both-hands lane falls behind.'
      : 'The metaphor makes the trade-off physical: two free hands for speed, two hands on the straps for safety.';
    s._seek = t => { const tt = Math.min(DSPAN, t); drawStraps(g, DSRUNS[1], tt, 'Walk-through: one hand at a time'); info(DSRUNS[1], tt, cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DSPAN + 2;
    return dt => {
      if (st.held) return; dt = Math.max(0, dt);
      if (st.tour) { st.t += dt; if (st.t >= DSPAN + 2) st.t = 0; s._seek(st.t); return; }
      const run = st.run, end = run.t + dt; while (run.t < Math.min(end, DSPAN)) dsStep(run, l2.down, r2.down);
      const tt = Math.min(run.t, DSPAN); drawStraps(g, run, tt, 'Your hands');
      info(run, tt, run.t >= DSPAN ? 'Walk over. Compare your distance and falls with the three lanes, then start over.' : 'Hold Q or the L2 button to pull the load left, E or R2 to pull it right, both to steady it.');
    };
  });

  /* ---------- 3. Katamari Damacy ---------- */
  const KSPAN = 30, RX0 = 24, RY0 = 24, RX1 = 600, RY1 = 560;
  const ITEMS = (() => { const R = mulberry(31), out = [], cols = ['#e5322d', '#2ea3dc', '#2fae63', '#e0a92d', '#8a4fd6', '#ef7921', '#5d618c'];
    for (let k = 0; k < 150; k++) { const r = 3 + Math.pow(R(), 2.6) * 22, x = RX0 + 30 + R() * (RX1 - RX0 - 60), y = RY0 + 30 + R() * (RY1 - RY0 - 60); if (Math.hypot(x - 312, y - 470) < 50) continue; out.push({ x, y, r, col: cols[k % cols.length], sh: k % 3 }); } return out; })();
  const KTOUR = [[0, 3, 1, 1], [3, 3.9, 1, -1], [3.9, 7, 1, 1], [7, 8.6, -1, 1], [8.6, 11, 1, 1], [11, 12.4, 1, -1], [12.4, 15, 1, 1], [15, 16.5, -1, -1], [16.5, 17.6, 1, -1], [17.6, 21, 1, 1], [21, 22.8, -1, 1], [22.8, 26, 1, 1], [26, 27.2, 1, -1], [27.2, 30, 1, 1]];
  const ktour = t => { const k = KTOUR.find(([a, b]) => t >= a && t < b); return k ? [k[2], k[3]] : [0, 0]; };
  function kInit() { return { t: 0, x: 312, y: 470, a: 0, R: 16, got: new Set(), pts: [], L: 0, Rs: 0 }; }
  function kStep(st, L, Rv) {
    const v = (L + Rv) / 2 * 110, w = (L - Rv) / 2 * 2.4;
    st.a += w * DT; st.x = clamp(st.x + Math.sin(st.a) * v * DT, RX0 + st.R, RX1 - st.R); st.y = clamp(st.y - Math.cos(st.a) * v * DT, RY0 + st.R, RY1 - st.R);
    ITEMS.forEach((it, k) => { if (st.got.has(k) || it.r > st.R * 0.6) return; if (Math.hypot(it.x - st.x, it.y - st.y) < st.R + it.r * .5) { st.got.add(k); st.R = Math.sqrt(st.R * st.R + 0.6 * it.r * it.r); } });
    st.L = L; st.Rs = Rv; if (st.pts.length % 5 === 0) st.pts.push([st.x, st.y]); else st.pts.length++; st.t += DT;
  }
  const kTourAt = (() => { const cache = new Map(); return t => { const n = Math.round(Math.min(t, KSPAN) / DT); if (cache.has(n)) return cache.get(n); const st = kInit(); for (let k = 0; k < n; k++) { const [l, r] = ktour(st.t); kStep(st, l, r); } cache.clear(); cache.set(n, st); return st; }; })();
  function itemShape(g, it, x, y, r) { g.fillStyle = it.col; g.beginPath(); if (it.sh === 0) g.arc(x, y, r, 0, TAU); else if (it.sh === 1) g.roundRect(x - r, y - r * .7, 2 * r, 1.4 * r, r * .3); else { g.moveTo(x, y - r); g.lineTo(x + r, y + r * .8); g.lineTo(x - r, y + r * .8); g.closePath(); } g.fill(); }
  function stick(g, cx, cy, v, lab, col) {
    g.fillStyle = '#e6e8f4'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 46, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(cx, cy - v * 30, 22, 0, TAU); g.fill(); g.strokeStyle = C.navy; g.stroke();
    if (Math.abs(v) > .1) txt(g, v > 0 ? '▲' : '▼', cx, cy - v * 30 + 1, { font: '800 16px Jost', col: '#fff', align: 'center' });
    txt(g, lab, cx, cy + 64, { font: '700 13px Jost', col: C.navy, align: 'center' });
  }
  function drawKata(g, st) {
    bg(g);
    rr(g, RX0, RY0, RX1 - RX0, RY1 - RY0, 10, '#efe3c8'); g.strokeStyle = 'rgba(201,180,138,.45)'; g.lineWidth = 1;
    for (let x = RX0 + 96; x < RX1; x += 96) { g.beginPath(); g.moveTo(x, RY0); g.lineTo(x, RY1); g.stroke(); }
    for (let y = RY0 + 134; y < RY1; y += 134) { g.beginPath(); g.moveTo(RX0, y); g.lineTo(RX1, y); g.stroke(); }
    ITEMS.forEach((it, k) => { if (!st.got.has(k)) { itemShape(g, it, it.x, it.y, it.r); if (it.r > st.R * 0.6) { g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 1.5; g.stroke(); } } });
    g.strokeStyle = 'rgba(38,44,106,.25)'; g.lineWidth = 2; g.setLineDash([3, 5]); g.beginPath(); st.pts.forEach((p, k) => { if (!p) return; k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke(); g.setLineDash([]);
    // ball with stuck items
    const b = g.createRadialGradient(st.x - st.R * .3, st.y - st.R * .3, 2, st.x, st.y, st.R); b.addColorStop(0, '#ff9ccf'); b.addColorStop(1, '#d24b8f');
    g.fillStyle = b; g.beginPath(); g.arc(st.x, st.y, st.R, 0, TAU); g.fill();
    [...st.got].slice(-14).forEach((k, n) => { const it = ITEMS[k], an = n * 2.4 + st.t * 1.2; itemShape(g, it, st.x + Math.cos(an) * st.R * .85, st.y + Math.sin(an) * st.R * .85, Math.min(it.r, st.R * .35)); });
    // the Prince pushes from behind
    const px = st.x - Math.sin(st.a) * (st.R + 12), py = st.y + Math.cos(st.a) * (st.R + 12);
    g.fillStyle = '#2fae63'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 10, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#f2d7a8'; g.beginPath(); g.arc(px, py, 5, 0, TAU); g.fill();
    // sticks and combos
    stick(g, 740, 110, st.L, 'left hand', '#2ea3dc'); stick(g, 900, 110, st.Rs, 'right hand', '#e0a92d');
    const COMBOS = [[[1, 1], '▲ ▲', 'both push: roll ahead'], [[-1, -1], '▼ ▼', 'both pull: roll back'], [[1, -1], '▲ ▼', 'left pushes, right pulls: turn right'], [[-1, 1], '▼ ▲', 'left pulls, right pushes: turn left']];
    const sg = v => v > .3 ? 1 : v < -.3 ? -1 : 0;
    COMBOS.forEach(([[l, r], k, lab], n) => { const on = sg(st.L) === l && sg(st.Rs) === r, y = 236 + n * 44; rr(g, 650, y - 17, 360, 36, 8, on ? '#fde9b8' : 'rgba(38,44,106,.05)'); txt(g, k, 680, y + 1, { font: '800 15px Jost', col: C.navy }); txt(g, lab, 740, y + 1, { font: on ? '700 14px Jost' : '600 14px Jost', col: on ? C.navy : C.muted }); });
    txt(g, `Ball ${(st.R * 2 / 10).toFixed(1)} cm across · ${st.got.size} things rolled up`, 830, 430, { font: '800 16px Montserrat', col: C.navy, align: 'center' });
    txt(g, 'Outlined objects are too big to roll up yet.', 830, 456, { font: '600 13px Jost', col: C.muted, align: 'center' });
  }
  canvasDemo('kata', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, key: '', run: kInit(), keys: {} }, tourBtn = $(s, '.kd-tour'), ls = $(s, '.kd-l'), rs = $(s, '.kd-r');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.run = kInit(); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.kd-reset').onclick = () => { manual(); st.run = kInit(); ls.value = 0; rs.value = 0; };
    [ls, rs].forEach(el => el.oninput = manual);
    addEventListener('keydown', e => { if (!s.classList.contains('active')) return; const k = e.key.toLowerCase(); if ('wsik'.includes(k) && k.length === 1) { manual(); st.keys[k] = true; } });
    addEventListener('keyup', e => { st.keys[e.key.toLowerCase()] = false; });
    function info(run, cap) {
      const k = cap + run.got.size; if (k === st.key) return; st.key = k;
      say($(s, '.kd-stats'), `<div class="y"><b>${(run.R * 2 / 10).toFixed(1)} cm</b><span>ball size</span></div><div class="g"><b>${run.got.size}</b><span>things rolled up</span></div>`);
      say($(s, '.kd-out'), cap);
    }
    const cap = t => t < 3.9 ? 'Both sticks forward: two hands push the ball straight ahead.'
      : t < 8.6 ? 'Left stick forward, right stick back: the hands twist the ball, and it turns right. Reverse them and it turns left.'
      : t < 17.6 ? 'Both back rolls it backwards. Each thing it picks up makes it bigger, so it can pick up bigger things.'
      : 'Tank steering is usually a hard sell. Framed as two hands on a ball, it reads at once.';
    s._seek = t => { const run = kTourAt(t); ls.value = run.L; rs.value = run.Rs; drawKata(g, run); info(run, cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => KSPAN + 2;
    return dt => {
      if (st.held) return; dt = Math.max(0, dt);
      if (st.tour) { st.t += dt; if (st.t >= KSPAN + 2) st.t = 0; s._seek(st.t); return; }
      const kL = st.keys.w ? 1 : st.keys.s ? -1 : null, kR = st.keys.i ? 1 : st.keys.k ? -1 : null;
      if (kL !== null) ls.value = kL; else if (st.keys.w === false || st.keys.s === false) { if (!st.keys.w && !st.keys.s && (ls.value == 1 || ls.value == -1)) ls.value = 0; }
      if (kR !== null) rs.value = kR; else if (!st.keys.i && !st.keys.k && (rs.value == 1 || rs.value == -1) && (st.keys.i === false || st.keys.k === false)) rs.value = 0;
      const run = st.run, n = Math.round(Math.min(dt, .1) / DT); for (let k = 0; k < n; k++) kStep(run, +ls.value, +rs.value);
      drawKata(g, run); info(run, 'Drag the two sliders, or hold W / S and I / K. Push both to roll, push one and pull the other to turn.');
    };
  });
})();
