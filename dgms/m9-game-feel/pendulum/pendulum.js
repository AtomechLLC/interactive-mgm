/* Pendulum and ball (Module 9, Part 10): Disney's 12 principles you can scrub.
   Slide 1 reproduces slides 289-296: a pendulum drawn on 24 fps frames, with an onion skin, a spacing chart and a frame
   scrubber; frame count is timing, swing width is spacing, and five easings (none, in, out, in-out, lopsided) bunch the drawings.
   Slide 2 is the bouncing ball: squash and stretch, an anticipation squat (small hop and super jump presets, slide 287)
   and a tail that follows through. Principles 7-12 live in principles.js.
   Every frame is a pure function of t and the controls, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, FPS = 24, PAPER = 'rgba(255,252,244,.88)', CARD = '#efe6d2', ORANGE = '#e07b1a';
  const font = (w, s, m) => `${w} ${s}px ${m ? 'Montserrat, Jost' : 'Jost'}, sans-serif`;
  const bg = g => { g.clearRect(0, 0, W, H); g.fillStyle = PAPER; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const sstep = k => { k = clamp(k); return k * k * (3 - 2 * k); };
  const scenes = window.__pdScenes = window.__pdScenes || {};

  /* =================== slide 1: the pendulum =================== */
  const EASE = {
    none: p => p,
    in: p => p * p,
    out: p => 1 - (1 - p) * (1 - p),
    inout: p => p < .5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p),
    lop: p => p * p,   // forward swing; the back swing mirrors it (see angle), so drawings bunch on the left only
  };
  const EASE_NAME = { none: 'no easing', in: 'ease in', out: 'ease out', inout: 'ease in-out', lop: 'lopsided' };
  // angle of frame f in a full cycle of 2N frames: left to right, then right to left
  function angle(st, f) {
    const N = st.n, A = st.w / 2 * Math.PI / 180, fw = f < N, p = (fw ? f : f - N) / N;
    if (st.ease === 'lop') return fw ? -A + 2 * A * EASE.in(p) : A - 2 * A * EASE.out(p);
    return fw ? -A + 2 * A * EASE[st.ease](p) : A - 2 * A * EASE[st.ease](p);
  }
  const PX = 330, PY = 44, L = 370, BOB = 22;
  const bobAt = a => [PX + Math.sin(a) * L, PY + Math.cos(a) * L];
  function drawPend(g, st, f) {
    T.use(g); bg(g);
    const N = st.n, fw = f < N, base = fw ? 0 : N;
    // spacing chart: an arc under the bob path, one tick per drawing of this swing
    g.strokeStyle = '#d9cba8'; g.lineWidth = 2; g.beginPath(); g.arc(PX, PY, L + 46, Math.PI / 2 - .85, Math.PI / 2 + .85); g.stroke();
    const poseK = k => k === N ? (fw ? angle(st, N) : angle(st, 0)) : angle(st, base + k);
    for (let k = 0; k <= N; k++) {
      const aa = poseK(k), key = k === 0 || k === N, r0 = L + 46 - (key ? 14 : 7), r1 = L + 46 + (key ? 14 : 7);
      g.strokeStyle = key ? C.ink : C.muted; g.lineWidth = key ? 3 : 1.5; g.beginPath();
      g.moveTo(PX + Math.sin(aa) * r0, PY + Math.cos(aa) * r0); g.lineTo(PX + Math.sin(aa) * r1, PY + Math.cos(aa) * r1); g.stroke();
    }
    g.font = font(600, 12); g.fillStyle = C.muted; g.textAlign = 'center'; g.fillText('spacing chart: one tick per drawing', PX, PY + L + 90);
    // onion skin: every drawing of this swing
    if (st.onion) for (let k = 0; k <= N; k++) {
      const [x, y] = bobAt(poseK(k));
      g.strokeStyle = 'rgba(93,97,140,.16)'; g.lineWidth = 2; g.beginPath(); g.moveTo(PX, PY); g.lineTo(x, y); g.stroke();
      g.fillStyle = 'rgba(46,163,220,.14)'; g.strokeStyle = 'rgba(46,163,220,.45)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, BOB, 0, TAU); g.fill(); g.stroke();
    }
    // the current drawing
    const a = angle(st, f), [x, y] = bobAt(a);
    g.fillStyle = C.wall; g.fillRect(PX - 60, PY - 18, 120, 12);
    g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(PX, PY - 6); g.lineTo(x, y); g.stroke();
    g.fillStyle = C.player; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(x, y, BOB + 2, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = C.ink; g.beginPath(); g.arc(PX, PY - 6, 6, 0, TAU); g.fill();
    g.font = font(800, 13, 1); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(f - base), x, y + 1); g.textBaseline = 'alphabetic';
    // right panel: angle by frame over a full cycle
    const gx = 690, gy = 40, gw = 320, gh = 190, A = st.w / 2;
    g.fillStyle = CARD; g.beginPath(); g.roundRect(gx - 30, gy - 26, gw + 50, 520, 12); g.fill();
    g.font = font(800, 14, 1); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Angle on every frame', gx - 14, gy - 4);
    const yy = d => gy + 16 + (1 - (d + 45) / 90) * (gh - 16), xx = k => gx + k / (2 * N) * gw;
    g.fillStyle = '#fffaf0'; g.fillRect(gx, gy + 16, gw, gh - 16);
    g.strokeStyle = '#d9cba8'; g.lineWidth = 1; g.beginPath(); [-A, 0, A].forEach(d => { g.moveTo(gx, yy(d)); g.lineTo(gx + gw, yy(d)); }); g.moveTo(xx(N), gy + 16); g.lineTo(xx(N), gy + gh); g.stroke();
    g.font = font(500, 11); g.fillStyle = C.muted; g.textAlign = 'right'; [-A, A].forEach(d => g.fillText(`${d > 0 ? '+' : ''}${d}°`, gx - 4, yy(d) + 4));
    for (let k = 0; k < 2 * N; k++) { const d = angle(st, k) * 180 / Math.PI; g.fillStyle = k === f ? ORANGE : C.ink; g.beginPath(); g.arc(xx(k), yy(d), k === f ? 5 : 2.4, 0, TAU); g.fill(); }
    g.textAlign = 'center'; g.fillStyle = C.muted; g.fillText('swing right', xx(N / 2), gy + gh + 16); g.fillText('swing left', xx(N * 1.5), gy + gh + 16);
    // spacing bars: how far the bob moves between drawings on this swing
    const by = gy + gh + 50, bh = 120;
    g.font = font(800, 14, 1); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Spacing between drawings', gx - 14, by - 6);
    g.fillStyle = '#fffaf0'; g.fillRect(gx, by + 4, gw, bh);
    const steps = []; for (let k = 0; k < N; k++) steps.push(Math.abs(poseK(k + 1) - poseK(k)));
    const mx = Math.max(...steps, 1e-6), bw = gw / N;
    steps.forEach((s, k) => { g.fillStyle = base + k === f ? ORANGE : C.player; const hh = s / (Math.PI / 180 * 18) * bh; g.fillRect(gx + k * bw + 1, by + 4 + bh - Math.min(bh, hh), Math.max(1, bw - 2), Math.min(bh, hh)); });
    g.font = font(500, 11); g.fillStyle = C.muted; g.textAlign = 'left'; g.fillText(fw ? 'left pose' : 'right pose', gx, by + bh + 18); g.textAlign = 'right'; g.fillText(fw ? 'right pose' : 'left pose', gx + gw, by + bh + 18);
    // numbers
    const sy = by + bh + 50; g.textAlign = 'left';
    [[`${N}`, 'frames per swing'], [`${(N / FPS).toFixed(2)} s`, `per swing at ${FPS} fps`], [`${st.w}°`, `swing width, ${EASE_NAME[st.ease]}`]].forEach(([b, s], i) => {
      g.font = font(800, 20, 1); g.fillStyle = C.ink; g.fillText(b, gx - 14, sy + i * 30); g.font = font(500, 13); g.fillStyle = C.muted; g.fillText(s, gx + 72, sy + i * 30);
    });
  }
  const PSTEPS = [
    { n: 20, w: 40, ease: 'none', say: 'One swing drawn on 20 frames at 24 fps, every drawing the same distance apart.' },
    { n: 40, w: 40, ease: 'none', say: 'Inbetweening doubles the drawings to 40. At the same 24 fps the swing takes twice as long. Timing is how many frames an action gets.' },
    { n: 40, w: 90, ease: 'none', say: 'Respaced: the same 40 frames, spread wider. The swing covers more ground in the same time. Spacing is how far apart the drawings sit.' },
    { n: 40, w: 90, ease: 'lop', say: 'Lopsided: the drawings bunch on one side only. The bob lingers on the left and whips through the right.' },
    { n: 40, w: 90, ease: 'in', say: 'Ease in: each swing starts slow and arrives fast. Drawings bunch at the pose it leaves.' },
    { n: 40, w: 90, ease: 'out', say: 'Ease out: each swing leaves fast and settles slowly. Drawings bunch at the pose it arrives at.' },
    { n: 40, w: 90, ease: 'inout', say: 'Ease in-out: slow at both ends and fast through the middle. This is how a real pendulum moves.' },
  ];
  const PSTEP = 3.5, PDUR = PSTEPS.length * PSTEP;
  canvasDemo('pendulum', (s, cv, g) => {
    const st = { n: 20, w: 40, ease: 'none', onion: true, tour: true, playing: true, held: false, t: 0, f: 0, step: -1, key: '' };
    const tourBtn = $(s, '.pd-tour'), playBtn = $(s, '.pd-play'), scrub = $(s, '.pd-scrub input'), onion = $(s, '.pd-onion');
    const segs = { n: $$(s, '.pd-frames .btn'), w: $$(s, '.pd-width .btn'), ease: $$(s, '.pd-ease .btn') };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.step = -1; } };
    Object.entries(segs).forEach(([k, bs]) => bs.forEach(b => b.onclick = () => { manual(); st[k] = k === 'ease' ? b.dataset.v : +b.dataset.v; st.f = Math.min(st.f, 2 * st.n - 1); }));
    tourBtn.onclick = () => { st.tour = true; st.playing = true; st.t = 0; tourBtn.classList.add('on'); };
    playBtn.onclick = () => { manual(); st.playing = !st.playing; st.t = st.f / FPS; };
    scrub.oninput = () => { manual(); st.playing = false; st.f = +scrub.value; };
    onion.onchange = () => { manual(); st.onion = onion.checked; };
    const apply = t => { const k = Math.floor(t / PSTEP) % PSTEPS.length, d = PSTEPS[k]; Object.assign(st, { n: d.n, w: d.w, ease: d.ease }); st.step = k; st.f = Math.floor((t % PSTEP) * FPS) % (2 * d.n); };
    function sync() {
      Object.entries(segs).forEach(([k, bs]) => bs.forEach(b => b.classList.toggle('on', String(st[k]) === b.dataset.v)));
      scrub.max = 2 * st.n - 1; scrub.value = st.f; $(s, '.pd-fr').textContent = `${st.f < st.n ? st.f : st.f - st.n} of ${st.n}, ${st.f < st.n ? 'swing right' : 'swing left'}`;
      playBtn.textContent = st.playing ? '❚❚ Pause' : '▶ Play'; onion.checked = st.onion;
      const key = [st.step, st.ease, st.n, st.w].join(); if (key === st.key) return; st.key = key;
      say($(s, '.pd-out'), st.step >= 0 ? PSTEPS[st.step].say : {
        none: 'No easing: every drawing is the same distance apart, so the bob hits each end at full speed and turns instantly.',
        in: 'Ease in: each swing starts slow and arrives fast. Drawings bunch at the pose it leaves.',
        out: 'Ease out: each swing leaves fast and settles slowly. Drawings bunch at the pose it arrives at.',
        inout: 'Ease in-out: slow at both ends and fast through the middle, the way a real pendulum moves.',
        lop: 'Lopsided: the drawings bunch on the left only. The bob lingers there and whips through the right.',
      }[st.ease] + ' Scrub the frames, or change one control at a time.');
    }
    scenes.pendulum = { seek(t) { st.held = true; st.tour = true; apply(t); sync(); drawPend(g, st, st.f); }, dur: () => PDUR };
    return dt => {
      if (st.held) return; dt = Math.max(0, dt);
      if (st.tour) { st.t += dt; if (st.t >= PDUR) st.t = 0; apply(st.t); }
      else if (st.playing) { st.t += dt; st.f = Math.floor(st.t * FPS) % (2 * st.n); }
      sync(); drawPend(g, st, st.f);
    };
  });

  /* =================== slide 2: the bouncing ball =================== */
  const G = 2600, GROUND = 500, R = 42, BX = 560, PLAIN_X = 230;
  function plan(p) {
    const ts = .1 + .35 * p.sq, th = .04 + .1 * p.sq, v0 = Math.sqrt(2 * G * p.h), ta = 2 * v0 / G;
    const t1 = .35, t2 = t1 + ts, t3 = t2 + th, t4 = t3 + ta, t5 = t4 + .4, P = t5 + .3;
    return { ts, th, v0, ta, t1, t2, t3, t4, t5, P };
  }
  // ball state at cycle time u: lift above the ground, squash q (> 0 squash, < 0 stretch)
  function ballAt(p, k, u, plain) {
    let lift = 0, q = 0;
    if (u >= k.t3 && u < k.t4) { const a = u - k.t3; lift = k.v0 * a - G * a * a / 2; if (!plain) q = -p.ss * .38 * Math.abs(k.v0 - G * a) / k.v0; }
    else if (!plain && u >= k.t1 && u < k.t2) q = .5 * p.sq * sstep((u - k.t1) / k.ts);
    else if (!plain && u >= k.t2 && u < k.t3) q = .5 * p.sq;
    else if (!plain && u >= k.t4 && u < k.t5) { const a = u - k.t4; q = p.ss * .5 * Math.min(1, k.v0 / 1300) * Math.exp(-a / .1) * Math.cos(a * 26); }
    return { lift: Math.max(0, lift), q };
  }
  const geom = (x, b) => { const sy = 1 - b.q, sx = 1 + b.q * .8; return { x, y: GROUND - R * sy - b.lift, sx, sy, top: GROUND - 2 * R * sy - b.lift }; };
  // the tail: a damped spring pulled toward a rest point above the ball, integrated from the start of the cycle
  function tailAt(p, k, u) {
    const dt = 1 / 240, rest = [-30, -62], kk = 520, c = 6;
    let b = geom(BX, ballAt(p, k, 0)), tip = [b.x + rest[0], b.top + rest[1]], v = [0, 0];
    for (let a = 0; a < u; a += dt) {
      b = geom(BX, ballAt(p, k, a)); const tx = b.x + rest[0], ty = b.top + rest[1];
      v[0] += (kk * (tx - tip[0]) - c * v[0]) * dt; v[1] += (kk * (ty - tip[1]) - c * v[1]) * dt;
      tip[0] += v[0] * dt; tip[1] += v[1] * dt;
    }
    return tip;
  }
  function drawBall(g, st, u) {
    T.use(g); bg(g);
    const k = plan(st);
    g.fillStyle = '#d6cbb1'; g.fillRect(0, GROUND, W, H - GROUND - 14);
    g.strokeStyle = C.muted; g.lineWidth = 2; g.beginPath(); g.moveTo(0, GROUND); g.lineTo(W, GROUND); g.stroke();
    // apex guide
    g.setLineDash([6, 6]); g.strokeStyle = 'rgba(93,97,140,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(80, GROUND - 2 * R - st.h); g.lineTo(760, GROUND - 2 * R - st.h); g.stroke(); g.setLineDash([]);
    g.font = font(500, 12); g.fillStyle = C.muted; g.textAlign = 'left'; g.fillText(`apex, ${st.h} px`, 84, GROUND - 2 * R - st.h - 6);
    const draw = (x, b, col, edge) => { const m = geom(x, b); T.shadow(x, GROUND + 4, R * m.sx * (1 - Math.min(.6, b.lift / 500)), 8, .25); g.fillStyle = col; g.strokeStyle = edge; g.lineWidth = 3; g.beginPath(); g.ellipse(m.x, m.y, R * m.sx, R * m.sy, 0, 0, TAU); g.fill(); g.stroke(); return m; };
    if (st.ghost) { draw(PLAIN_X, ballAt(st, k, u, true), '#c9c3b3', C.stoneDk); g.font = font(700, 14); g.fillStyle = C.muted; g.textAlign = 'center'; g.fillText('plain: no squash, no squat, no tail', PLAIN_X, GROUND + 36); }
    const b = ballAt(st, k, u), m = geom(BX, b);
    if (st.tail) {
      const tip = tailAt(st, k, u), bx = m.x - 8, by = m.top + 6;
      g.strokeStyle = C.redDk; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx - 4, (by + tip[1]) / 2, tip[0], tip[1]); g.stroke(); g.lineCap = 'butt';
      g.fillStyle = C.red; g.beginPath(); g.arc(tip[0], tip[1], 9, 0, TAU); g.fill();
    }
    draw(BX, b, C.player, C.navy);
    // eye, so the ball reads as a character
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(m.x + 14 * m.sx, m.y - 8 * m.sy, 8 * m.sx, 10 * m.sy, 0, 0, TAU); g.fill();
    g.fillStyle = C.navy; g.beginPath(); g.arc(m.x + 16 * m.sx, m.y - 7 * m.sy, 4, 0, TAU); g.fill();
    g.font = font(700, 14); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText('with the principles', BX, GROUND + 36);
    // phase label
    const ph = u < k.t1 ? 'rest' : u < k.t3 ? 'anticipation' : u < k.t4 ? (u - k.t3 < k.ta / 2 ? 'launch: stretch' : 'fall: stretch') : u < k.t5 ? 'impact: squash' : 'settle';
    T.label(ph, BX, 40, 'center', C.ink, 15);
    // poses panel: anticipation vs impact
    const px = 800, py = 70; g.fillStyle = CARD; g.beginPath(); g.roundRect(px, py - 34, 222, 420, 12); g.fill();
    g.font = font(800, 14, 1); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Two poses', px + 14, py - 10);
    const pose = (y, q, lbl) => { const sy = 1 - q, sx = 1 + q * .8, r = 30; g.fillStyle = '#fffaf0'; g.fillRect(px + 14, y, 194, 92); g.strokeStyle = C.muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 24, y + 80); g.lineTo(px + 198, y + 80); g.stroke(); g.fillStyle = C.player; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.ellipse(px + 111, y + 80 - r * sy, r * sx, r * sy, 0, 0, TAU); g.fill(); g.stroke(); g.font = font(600, 12); g.fillStyle = C.muted; g.fillText(lbl, px + 14, y + 108); };
    pose(py + 4, .5 * st.sq, `anticipation squat: ${Math.round(st.sq * 100)}%`);
    pose(py + 130, -st.ss * .38, `launch stretch: ${Math.round(st.ss * 38)}%`);
    const diff = .5 * st.sq + st.ss * .38, ratio = st.h / 340;
    g.font = font(800, 22, 1); g.fillStyle = C.ink; g.fillText(`${Math.round(diff * 100)}`, px + 14, py + 290); g.font = font(500, 12); g.fillStyle = C.muted; g.fillText('pose difference', px + 60, py + 286);
    g.font = font(800, 22, 1); g.fillStyle = C.ink; g.fillText(`${st.h}`, px + 14, py + 324); g.font = font(500, 12); g.fillStyle = C.muted; g.fillText('jump height, px', px + 60, py + 320);
    const fit = diff / .88 - ratio, verdict = Math.abs(fit) < .3 ? ['pose matches the jump', C.good] : fit > 0 ? ['squat promises more than the jump', C.redDk] : ['jump bigger than the squat suggests', C.goldInk];
    g.font = font(700, 13); g.fillStyle = verdict[1]; g.fillText(verdict[0], px + 14, py + 358);
  }
  const BSTEPS = [
    { sq: .15, h: 70, ss: .5, tail: true, say: 'Small hop: a shallow squat and a short jump. The deck: "Small motions should have minimal anticipation."' },
    { sq: .9, h: 320, ss: .7, tail: true, say: 'Super jump: a deep squat before a big jump. "The bigger the difference between the anticipation and the impact poses, the more impactful the motion will appear."' },
    { sq: 1, h: 60, ss: .6, tail: true, say: 'A deep squat into a tiny hop: the anticipation promises more than the jump delivers.' },
    { sq: .6, h: 220, ss: 1, tail: true, say: 'Full squash and stretch, and watch the tail: it keeps moving after the ball lands, then settles. That is follow-through.' },
  ];
  const BSTEP = 6, BDUR = BSTEPS.length * BSTEP;
  canvasDemo('ball', (s, cv, g) => {
    const st = { sq: .2, h: 120, ss: .6, tail: true, ghost: true, tour: true, held: false, t: 0, u: 0, step: -1, key: '' };
    const tourBtn = $(s, '.bl-tour'), rs = { sq: $(s, '.bl-sq'), h: $(s, '.bl-h'), ss: $(s, '.bl-ss') }, tail = $(s, '.bl-tail'), ghost = $(s, '.bl-ghost');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.step = -1; st.u = 0; } };
    Object.entries(rs).forEach(([k, r]) => r.oninput = () => { manual(); st[k] = +r.value; });
    tail.onchange = () => { manual(); st.tail = tail.checked; };
    ghost.onchange = () => { manual(); st.ghost = ghost.checked; };
    $(s, '.bl-hop').onclick = () => { manual(); Object.assign(st, { sq: .15, h: 70 }); st.u = 0; };
    $(s, '.bl-super').onclick = () => { manual(); Object.assign(st, { sq: .9, h: 320 }); st.u = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const apply = t => { const k = Math.floor(t / BSTEP) % BSTEPS.length, d = BSTEPS[k]; Object.assign(st, { sq: d.sq, h: d.h, ss: d.ss, tail: d.tail }); st.step = k; return (t % BSTEP) % plan(st).P; };
    function sync() {
      rs.sq.value = st.sq; rs.h.value = st.h; rs.ss.value = st.ss; tail.checked = st.tail; ghost.checked = st.ghost;
      $(s, '.bl-v-sq').textContent = st.sq.toFixed(2); $(s, '.bl-v-h').textContent = `${st.h} px`; $(s, '.bl-v-ss').textContent = st.ss.toFixed(2);
      const key = st.step + '|' + (st.step < 0 ? [st.sq > .5, st.h > 200].join() : ''); if (key === st.key) return; st.key = key;
      say($(s, '.bl-out'), st.step >= 0 ? BSTEPS[st.step].say : 'Match the squat to the jump: a small hop wants a small squat, a super jump a deep one. Then turn the tail off and on to see what follow-through adds.');
    }
    scenes.ball = { seek(t) { st.held = true; st.tour = true; const u = apply(t); sync(); drawBall(g, st, u); }, dur: () => BDUR };
    return dt => {
      if (st.held) return; dt = Math.max(0, dt); let u;
      if (st.tour) { st.t += dt; if (st.t >= BDUR) st.t = 0; u = apply(st.t); }
      else { st.u = (st.u + dt) % plan(st).P; u = st.u; }
      sync(); drawBall(g, st, u);
    };
  });

  window.__seek = (t, which = 'pendulum') => scenes[which].seek(t);
  window.__dur = (which = 'pendulum') => scenes[which].dur();
})();
