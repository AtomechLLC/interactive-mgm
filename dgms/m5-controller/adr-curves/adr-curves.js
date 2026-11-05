/* ADR curves (Module 5: character responsiveness). Acceleration (time to top speed), deceleration
   (time to stop) and rotation (turn rate) on a top-down runner, with the speed-over-time curve drawn underneath.
   Presets run from instant direction change (Mega Man X) to momentum. Values are illustrative.
   Model: a heading and a speed. Input sets a target heading; the heading turns toward it at the rotation rate, and the
   speed ramps up while a direction is held and down when it is released. Fixed 60 Hz steps; the walk-through replays one
   fixed input script per preset, so __seek is a pure function of time.
   Gamepad (standard mapping, polled every frame): the left stick's tilt sets a target speed (TOP x magnitude), so a half
   tilt ramps to half speed at the acceleration rate and easing off the stick slows down at the deceleration rate. The
   d-pad is digital, like the keys. A restarts the run, LB/RB switch presets, Start replays the walk-through. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, AH = 352, DT = 1 / 60, TOP = 300;   // arena height, top speed px/s
  const DZ = .15;                                              // stick deadzone (radial)
  const PRESETS = {
    instant: { name: 'Instant (Mega Man X)', a: 0, d: 0, r: 1800, col: '#2ea3dc' },
    snappy: { name: 'Snappy', a: .1, d: .08, r: 1080, col: '#2fae63' },
    momentum: { name: 'Momentum', a: .6, d: .8, r: 360, col: '#e5322d' },
    tank: { name: 'Heavy turn', a: .3, d: .2, r: 120, col: '#8a4fd6' },
  };
  const PK = Object.keys(PRESETS);
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  function newRunner() { return { x: 170, y: 230, hd: 0, sp: 0, trail: [], hist: [] }; }
  // m: input magnitude 0..1 (keys and d-pad are 1, the stick is its tilt). The target speed is TOP * m: below it the runner
  // speeds up at the acceleration rate, above it (stick eased off, or released) it slows at the deceleration rate.
  function step(p, P, dx, dy, t, m = 1) {
    const has = (dx || dy) && m > 0, tgt = has ? TOP * m : 0;
    if (has) {
      const tg = Math.atan2(dy, dx), d = angDiff(p.hd, tg), max = P.r >= 1800 ? Infinity : P.r * Math.PI / 180 * DT;
      p.hd += clamp(d, -max, max);
    }
    if (p.sp < tgt) p.sp = P.a <= 0 ? tgt : Math.min(tgt, p.sp + TOP / P.a * DT);
    else if (p.sp > tgt) p.sp = P.d <= 0 ? tgt : Math.max(tgt, p.sp - TOP / P.d * DT);
    p.x += Math.cos(p.hd) * p.sp * DT; p.y += Math.sin(p.hd) * p.sp * DT;
    p.x = (p.x + W) % W; p.y = ((p.y - 20 + AH - 40) % (AH - 40)) + 20;
    p.trail.push([p.x, p.y]); if (p.trail.length > 150) p.trail.shift();
    p.hist.push({ t, sp: p.sp, dx, dy, m: has ? m : 0 }); if (p.hist.length > 6 * 60) p.hist.shift();
  }
  // the walk-through's input script: [until (s), dx, dy]
  const SCRIPT = [[.4, 0, 0], [1.6, 1, 0], [2.2, 0, 0], [3.4, -1, 0], [4.0, 0, -1], [4.9, 1, 0], [5.5, -1, 0], [6.4, 0, 0]];
  const SEG = 6.4;
  const inputAt = t => { const s = SCRIPT.find(r => t < r[0]); return s ? [s[1], s[2]] : [0, 0]; };
  function scripted(P, t) { const p = newRunner(), n = Math.floor(t * 60); for (let i = 0; i < n; i++) { const [dx, dy] = inputAt(i * DT); step(p, P, dx, dy, i * DT); } return p; }

  const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  const ARROW = (dx, dy) => (dx || dy) ? ARROWS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8] : '';
  function draw(g, st) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
    T.floor(0, 0, W, AH);
    const p = st.p, P = st.P;
    const segs = [[]]; p.trail.forEach((q, i, a) => { if (i && Math.hypot(q[0] - a[i - 1][0], q[1] - a[i - 1][1]) > 60) segs.push([]); segs.at(-1).push(q); });
    segs.forEach(sg => T.trail(sg, st.preset ? PRESETS[st.preset].col : C.player, .7, 4));
    T.player(p.x, p.y, p.hd, 1.1);
    // held key
    const [dx, dy] = st.inp;
    if (st.src === 'pad') {
      // the stick: ring = full tilt, dot = where the stick is, readout = the speed it asks for
      const cx = 44, cy = 44, R = 26, m = st.mag, a = Math.atan2(dy, dx);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.strokeStyle = C.muted; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); g.stroke();
      g.setLineDash([3, 4]); g.beginPath(); g.arc(cx, cy, R * DZ, 0, TAU); g.stroke(); g.setLineDash([]);
      const kx = cx + (m ? Math.cos(a) * R * (DZ + (1 - DZ) * m) : 0), ky = cy + (m ? Math.sin(a) * R * (DZ + (1 - DZ) * m) : 0);
      g.strokeStyle = C.ink; g.beginPath(); g.moveTo(cx, cy); g.lineTo(kx, ky); g.stroke();
      g.fillStyle = m ? (st.preset ? PRESETS[st.preset].col : C.navy) : C.muted; g.beginPath(); g.arc(kx, ky, 7, 0, TAU); g.fill();
      T.label(m ? `stick ${Math.round(m * 100)}% → asks for ${(TOP * m / 30).toFixed(1)} tiles/s` : 'stick centred', 82, 44, 'left', m ? C.ink : C.muted, 15);
    } else T.label(ARROW(dx, dy) ? `holding ${ARROW(dx, dy)}` : 'no input', 90, 30, 'center', ARROW(dx, dy) ? C.ink : C.muted, 15);
    T.label(`speed ${(p.sp / 30).toFixed(1)} tiles/s`, W - 110, 30, 'center', C.ink, 15);
    // graph
    const gx = 60, gy = AH + 24, gw = W - 90, gh = H - AH - 64;
    g.fillStyle = '#fffaf0'; g.fillRect(0, AH, W, H - AH);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx, gy + gh); g.lineTo(gx + gw, gy + gh); g.stroke();
    g.setLineDash([4, 5]); g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + gw, gy); g.stroke(); g.setLineDash([]);
    g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillText('top', gx - 6, gy); g.fillText('0', gx - 6, gy + gh);
    g.save(); g.translate(16, gy + gh / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('speed', 0, 0); g.restore();
    const span = 6.4, t0 = st.tour ? 0 : Math.max(0, st.now - span), X = t => gx + (t - t0) / span * gw, Y = v => gy + gh - v / TOP * gh;
    // input bands
    let last = null, from = 0;
    const bands = st.tour ? SCRIPT.map((r, i) => ({ a: i ? SCRIPT[i - 1][0] : 0, b: r[0], k: ARROW(r[1], r[2]) })) : (() => { const out = []; p.hist.forEach(h => { const k = ARROW(h.dx, h.dy); if (k !== last) { if (last != null) out.push({ a: from, b: h.t, k: last }); last = k; from = h.t; } }); if (last != null) out.push({ a: from, b: st.now, k: last }); return out; })();
    bands.forEach(b => { if (!b.k) return; const a = Math.max(t0, b.a); if (b.b <= a) return; g.fillStyle = 'rgba(46,163,220,.10)'; g.fillRect(X(a), gy, X(b.b) - X(a), gh); g.font = '700 20px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(b.k, (X(a) + X(b.b)) / 2, gy + 14); });
    // ghost curves of the other presets (walk-through only), then this one
    const curve = (hist, col, w, a) => { g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); hist.forEach((h, i) => { if (h.t < t0) return; i && hist[i - 1].t >= t0 ? g.lineTo(X(h.t), Y(h.sp)) : g.moveTo(X(h.t), Y(h.sp)); }); g.stroke(); g.restore(); };
    if (st.tour) PK.forEach(k => { if (k !== st.preset) curve(st.ghost[k], PRESETS[k].col, 2.5, .45); });
    if (!st.tour && p.hist.some(h => h.m > 0 && h.m < 1)) {   // analog input: dashed line = speed the stick asks for
      g.save(); g.strokeStyle = C.ink; g.globalAlpha = .55; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath();
      p.hist.forEach((h, i) => { if (h.t < t0) return; const y = Y(TOP * h.m); i && p.hist[i - 1].t >= t0 ? (g.lineTo(X(h.t), Y(TOP * p.hist[i - 1].m)), g.lineTo(X(h.t), y)) : g.moveTo(X(h.t), y); });
      g.stroke(); g.restore();
    }
    curve(p.hist, st.preset ? PRESETS[st.preset].col : C.navy, 4, 1);
    g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText(st.tour ? 'seconds into the run, all four presets on the same input' : p.hist.some(h => h.m > 0 && h.m < 1) ? 'the last 6 seconds · dashed: the speed the stick asks for' : 'the last 6 seconds', gx + gw, gy + gh + 16);
    if (st.tour) { g.textAlign = 'left'; PK.forEach((k, i) => { g.fillStyle = PRESETS[k].col; g.fillRect(gx + i * 170, gy + gh + 11, 18, 4); g.fillStyle = k === st.preset ? C.ink : C.muted; g.fillText(PRESETS[k].name, gx + 24 + i * 170, gy + gh + 14); }); }
    g.restore();
  }

  const scenes = {};
  canvasDemo('adr', (s, cv, g) => {
    const st = { P: { ...PRESETS.instant }, preset: 'instant', p: newRunner(), inp: [0, 0], mag: 0, src: 'keys', tour: true, held: false, t: 0, now: 0, key: '', ghost: {} };
    const sl = { a: $(s, '.adr-a'), d: $(s, '.adr-d'), r: $(s, '.adr-r') }, vl = { a: $(s, '.adr-v-a'), d: $(s, '.adr-v-d'), r: $(s, '.adr-v-r') };
    const tourBtn = $(s, '.adr-tour'), playBtn = $(s, '.adr-play'), pbtn = $$(s, '.adr-presets .btn');
    const keys = { l: 0, r: 0, u: 0, d: 0 };
    const restart = () => { st.p = newRunner(); st.now = 0; };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); playBtn.classList.add('on'); restart(); } };
    const sync = () => {
      sl.a.value = st.P.a; sl.d.value = st.P.d; sl.r.value = st.P.r;
      vl.a.textContent = st.P.a ? `${st.P.a.toFixed(2)} s` : 'instant'; vl.d.textContent = st.P.d ? `${st.P.d.toFixed(2)} s` : 'instant'; vl.r.textContent = st.P.r >= 1800 ? 'instant' : `${st.P.r}°/s`;
      pbtn.forEach(b => b.classList.toggle('on', b.dataset.p === st.preset));
    };
    Object.keys(sl).forEach(k => sl[k].oninput = () => { manual(); st.P[k] = +sl[k].value; st.preset = PK.find(q => ['a', 'd', 'r'].every(f => PRESETS[q][f] === st.P[f])) || null; sync(); });
    pbtn.forEach(b => b.onclick = () => { manual(); st.preset = b.dataset.p; st.P = { ...PRESETS[st.preset] }; sync(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); playBtn.classList.remove('on'); };
    playBtn.onclick = () => { manual(); restart(); cv.focus(); };
    const KM = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd' };
    const onKey = down => e => {
      if (!s.classList.contains('active') || e.target.closest?.('textarea, select')) return;
      const k = KM[e.key.toLowerCase()]; if (!k) return;
      if (e.target.matches?.('input[type=range]') && e.key.startsWith('Arrow')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (down && st.tour) manual();
      keys[k] = down ? 1 : 0;
    };
    addEventListener('keydown', onKey(true), true); addEventListener('keyup', onKey(false), true);
    // gamepad: polled each frame while this slide is active
    const padTip = $(s, '.adr-pad'); let prevBtn = [], padName = '';
    const pressed = (gp, i) => !!gp.buttons[i]?.pressed;
    function pollPad() {
      const gp = [...(navigator.getGamepads?.() || [])].find(q => q && q.connected);
      if ((gp?.id || '') !== padName) { padName = gp?.id || ''; padTip.hidden = !gp; if (gp) padTip.textContent = `Controller connected: ${gp.id.replace(/\s*\(.*$/, '') || 'gamepad'}.`; }
      if (!gp) return null;
      const edge = i => pressed(gp, i) && !prevBtn[i];
      if (edge(0)) { manual(); restart(); }                                  // A / cross
      if (edge(4) || edge(5)) {                                              // LB / RB
        manual(); const i = PK.indexOf(st.preset), n = PK[((i < 0 ? 0 : i) + (edge(5) ? 1 : -1) + PK.length) % PK.length];
        st.preset = n; st.P = { ...PRESETS[n] }; sync();
      }
      if (edge(9) && !st.tour) tourBtn.onclick();                            // Start / options
      prevBtn = gp.buttons.map(b => b.pressed);
      const ddx = pressed(gp, 15) - pressed(gp, 14), ddy = pressed(gp, 13) - pressed(gp, 12);
      if (ddx || ddy) return [ddx, ddy, 1];
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, r = Math.hypot(ax, ay);
      if (r < DZ) return [0, 0, 0];
      return [ax / r, ay / r, Math.min(1, (r - DZ) / (1 - DZ))];          // radial deadzone, rescaled to 0..1
    }
    function readInput() {
      const kx = keys.r - keys.l, ky = keys.d - keys.u, pad = s.classList.contains('active') ? pollPad() : null;
      if (kx || ky) { st.src = 'keys'; return [kx, ky, 1]; }
      if (pad && (pad[2] > 0 || st.src === 'pad')) { if (pad[2] > 0) { st.src = 'pad'; if (st.tour) manual(); } return pad; }
      return [0, 0, 0];
    }
    function info() {
      const P = st.P, key = [P.a, P.d, P.r].join('|'); if (key === st.key) return; st.key = key; sync();
      const stopDist = TOP * P.d / 2 / 30, turn = P.r >= 1800 ? 0 : 180 / P.r;
      say($(s, '.adr-stats'), `<div><b>${P.a ? P.a.toFixed(2) + ' s' : '0 s'}</b><span>from standing to top speed</span></div><div class="y"><b>${stopDist.toFixed(1)}</b><span>tiles of slide after letting go</span></div><div class="r"><b>${turn ? turn.toFixed(2) + ' s' : '0 s'}</b><span>to turn around</span></div>`);
      say($(s, '.adr-out'), P.a === 0 && P.d === 0 && P.r >= 1800 ? 'Mega Man X: every edge of the curve is vertical. The character goes exactly where the stick says, the moment it says it.'
        : P.a >= .4 || P.d >= .4 || P.r <= 400 ? 'Momentum: the curve ramps and the turns arc. It reads as weight, but every reversal costs time and distance.'
        : 'Snappy: short ramps keep a sense of weight without getting in the way of the player’s intention.');
    }
    function tourAt(t) {
      const i = Math.min(PK.length - 1, Math.floor(t / SEG)), f = t - i * SEG, k = PK[i];
      st.preset = k; st.P = { ...PRESETS[k] };
      st.p = scripted(st.P, f); st.inp = inputAt(f); st.now = f;
      PK.forEach(q => { if (q !== k) st.ghost[q] = scripted(PRESETS[q], f).hist; });
    }
    sync();
    scenes.adr = { seek(t) { st.held = true; st.tour = true; tourAt(t); draw(g, st); info(); }, dur: () => SEG * PK.length };
    let acc = 0;
    return dt => {
      if (st.held) return;
      const [ix, iy, im] = readInput();
      if (st.tour) { st.t += dt; if (st.t >= SEG * PK.length) st.t = 0; tourAt(st.t); }
      else { acc += dt; while (acc >= DT) { acc -= DT; st.inp = [ix, iy]; st.mag = im; step(st.p, st.P, ix, iy, st.now, im || 1); st.now += DT; } }
      draw(g, st); info();
    };
  });
  window.__seek = (t, which = 'adr') => scenes[which].seek(t);
  window.__dur = (which = 'adr') => scenes[which].dur();
})();
