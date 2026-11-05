/* Lower the horizon (Module 6, 3Cs: Camera; "Angles are our friends", slides 122-129).
   One grey-box boss, the hero beside it for scale, and a camera you can raise, lower and pitch. The view is drawn by the
   same small perspective projector as the follow camera tuner (boxes split into faces, back faces culled, near-plane
   clipping, painted far to near). The horizon line is where level directions land on screen: pitch the camera up and it
   drops down the frame; raise the camera and pitch down and it climbs out of the top.
   Notes on 125: "When the camera is up high looking down on someone…" and on 129: "if you want to make something be big
   and scary/imposing it's one of the best tools (Think boss fights)". Slide 122: "Try extremes", so Min and Max jump to
   the two ends of both sliders.
   Tunable rules live in CAM_RANGE, EXTREMES, BOSS, READ (the thresholds for the imposing / diminished verdict) and TOUR.
   The slide is a pure function of time on its walk-through (window.__seek / __dur), so the GIF is deterministic. */
(function () {
  const { $, $$, canvasDemo } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const W = 1040, H = 585;

  /* ---------- tunable rules ---------- */
  const CAM_RANGE = { h: [0.2, 20], pitch: [-30, 60] };   // camera height (m) and pitch (degrees, positive looks down)
  const CAM_Z = -10, FOV = 60;                             // camera stands 18 m in front of the boss, 60° horizontal FOV
  const EXTREMES = {
    min: { h: 0.25, pitch: -16, name: 'Min: on the ground, looking up' },
    eye: { h: 1.6, pitch: 0, name: 'Eye level' },
    max: { h: 18, pitch: 42, name: 'Max: high, looking down' },
  };
  const BOSS = { z: 8, h: 6.3, col: '#a8665a', head: '#b97a6c' };
  const HERO = { x: -2.4, z: 4.5 };
  const READ = { lowHorizon: .62, highHorizon: .3 };       // horizon position (0 top, 1 bottom) for the verdict
  const TOUR = [[0, 'eye', 0], [1.5, 'min', 3.5], [7.5, 'max', 4.5], [14.5, 'eye', 2.5]];   // [start, target, blend seconds]
  const DUR = 18;
  const COL = { sky0: '#f4ecd9', sky1: '#d9e1ee', ground: '#e4d9c0', wall: '#7b7fa6', stone: '#9a9fb5', hero: '#2ea3dc', heroHead: '#7ccbec', club: '#6b4a3a', eye: '#ffb951' };

  /* ---------- tiny 3D projector ---------- */
  const NEAR = 0.05;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
  const LIGHT = norm([-0.45, 0.85, -0.5]);
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const shade = (col, n, a = 1, k0 = .62) => { const k = k0 + (1 - k0) * Math.max(0, dot(n, LIGHT)); return `rgba(${rgb(col).map(v => Math.round(Math.min(255, v * k))).join(',')},${a})`; };

  // yaw 0 looks down +z; pitch > 0 looks down. vx..vh is the view rectangle on the canvas.
  function camera(pos, yaw, pitch, hfov, vx, vy, vw, vh) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const f = [sy * cp, -sp, cy * cp], r = [cy, 0, -sy], u = cross(f, r);
    const foc = (vw / 2) / Math.tan(hfov * D2R / 2);
    const toCam = P => { const d = sub(P, pos); return [dot(d, r), dot(d, u), dot(d, f)]; };
    const scr = c => [vx + vw / 2 + c[0] / c[2] * foc, vy + vh / 2 - c[1] / c[2] * foc];
    const horizon = () => { const c = [dot([f[0], 0, f[2]], r), dot([f[0], 0, f[2]], u), dot([f[0], 0, f[2]], f)]; return c[2] > .01 ? vy + vh / 2 - c[1] / c[2] * foc : (pitch > 0 ? vy - 1 : vy + vh + 1); };
    return { pos, f, r, u, foc, vx, vy, vw, vh, hfov, toCam, scr, horizon, proj: P => { const c = toCam(P); return c[2] > NEAR ? scr(c) : null; } };
  }
  function clipPoly(cs) {
    const out = [];
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i], b = cs[(i + 1) % cs.length], ai = a[2] > NEAR, bi = b[2] > NEAR;
      if (ai) out.push(a);
      if (ai !== bi) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]); }
    }
    return out;
  }
  // a box standing on y0, centred on (cx, cz), turned by o.yaw; pushes its six faces into L
  function box(L, cx, y0, cz, w, h, d, col, o = {}) {
    const a = o.a ?? 1; if (a <= .01 || h <= 0) return;
    const yaw = o.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw), x = w / 2, z = d / 2;
    const P = (dx, dy, dz) => [cx + dx * c + dz * s, y0 + dy, cz - dx * s + dz * c];
    const N = (nx, ny, nz) => [nx * c + nz * s, ny, -nx * s + nz * c];
    [[N(1, 0, 0), [P(x, 0, -z), P(x, 0, z), P(x, h, z), P(x, h, -z)]],
     [N(-1, 0, 0), [P(-x, 0, z), P(-x, 0, -z), P(-x, h, -z), P(-x, h, z)]],
     [N(0, 0, 1), [P(x, 0, z), P(-x, 0, z), P(-x, h, z), P(x, h, z)]],
     [N(0, 0, -1), [P(-x, 0, -z), P(x, 0, -z), P(x, h, -z), P(-x, h, -z)]],
     [N(0, 1, 0), [P(-x, h, -z), P(x, h, -z), P(x, h, z), P(-x, h, z)]],
     [N(0, -1, 0), [P(-x, 0, -z), P(-x, 0, z), P(x, 0, z), P(x, 0, -z)]]]
      .forEach(([n, pts]) => L.push({ n, pts, col, a, tag: o.tag, glow: o.glow }));
  }
  function render(g, cam, L) {
    const out = [];
    for (const f of L) {
      const k = 1 / f.pts.length, cen = f.pts.reduce((m, p) => [m[0] + p[0] * k, m[1] + p[1] * k, m[2] + p[2] * k], [0, 0, 0]);
      if (dot(f.n, sub(cam.pos, cen)) <= 0) continue;
      const cs = clipPoly(f.pts.map(cam.toCam)); if (cs.length < 3) continue;
      const d = sub(cen, cam.pos);
      out.push({ f, sp: cs.map(cam.scr), depth: dot(d, d) + (f.glow ? .5 : 0) });
    }
    out.sort((a, b) => b.depth - a.depth);
    for (const o of out) {
      g.beginPath(); o.sp.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
      g.fillStyle = o.f.glow ? o.f.col : shade(o.f.col, o.f.n, o.f.a); g.fill();
      g.strokeStyle = `rgba(21,32,68,${.35 * o.f.a})`; g.lineWidth = 1; g.stroke();
    }
    return out;
  }
  function seg3(g, cam, a, b) {
    let A = cam.toCam(a), B = cam.toCam(b);
    if (A[2] < NEAR && B[2] < NEAR) return;
    const cut = (P, Q) => { const k = (NEAR - P[2]) / (Q[2] - P[2]); return [P[0] + (Q[0] - P[0]) * k, P[1] + (Q[1] - P[1]) * k, NEAR]; };
    if (A[2] < NEAR) A = cut(A, B); else if (B[2] < NEAR) B = cut(B, A);
    const p = cam.scr(A), q = cam.scr(B); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]);
  }
  // sky above the horizon, parchment floor with a 1 m grid that scrolls by s metres (the hero runs on a treadmill)
  function ground(g, cam, s) {
    const { vx, vy, vw, vh } = cam, hy = cam.horizon();
    g.fillStyle = COL.ground; g.fillRect(vx, vy, vw, vh);
    if (hy > vy) { const gr = g.createLinearGradient(0, vy, 0, Math.max(vy + 1, hy)); gr.addColorStop(0, COL.sky1); gr.addColorStop(1, COL.sky0); g.fillStyle = gr; g.fillRect(vx, vy, vw, clamp(hy - vy, 0, vh)); }
    const ph = ((s % 1) + 1) % 1;
    g.lineWidth = 1.3;
    for (let k = 0; k < 64; k++) {
      const z = -8 + k - ph; g.strokeStyle = `rgba(150,128,90,${.55 * clamp(1 - (z - 4) / 50)})`;
      g.beginPath(); seg3(g, cam, [-24, 0, z], [24, 0, z]); g.stroke();
    }
    g.strokeStyle = 'rgba(150,128,90,.45)'; g.beginPath();
    for (let x = -24; x <= 24; x++) seg3(g, cam, [x, 0, -8], [x, 0, 56]);
    g.stroke();
  }

  /* ---------- the boss, the hero, the arena ---------- */
  function bossFaces(L) {
    const yaw = Math.PI, z0 = BOSS.z;          // faces the camera (-z): local +z maps to world -z
    const part = (dx, y, dz, w, h, d, col, o = {}) => box(L, -dx, y, z0 - dz, w, h, d, col, { yaw, ...o });
    part(-.62, 0, 0, .95, 2.6, .95, BOSS.col); part(.62, 0, 0, .95, 2.6, .95, BOSS.col);
    part(0, 2.6, 0, 2.5, 2.2, 1.3, BOSS.col);
    part(0, 4.8, .05, 1.1, 1.05, 1.0, BOSS.head);
    part(-.38, 5.85, .05, .2, .45, .2, '#e8dcc0'); part(.38, 5.85, .05, .2, .45, .2, '#e8dcc0');
    part(-.25, 5.3, .52, .2, .14, .06, COL.eye, { glow: 0 }); part(.25, 5.3, .52, .2, .14, .06, COL.eye);
    part(-1.6, 2.35, .1, .7, 2.45, .7, BOSS.col); part(1.6, 2.35, .1, .7, 2.45, .7, BOSS.col);
    part(1.6, 0, .75, .45, 3.0, .45, COL.club);
  }
  function heroFaces(L) {
    const x = HERO.x, z = HERO.z, col = COL.hero;
    box(L, x - .11, 0, z, .17, .85, .2, col); box(L, x + .11, 0, z, .17, .85, .2, col);
    box(L, x, .85, z, .48, .6, .28, col); box(L, x, 1.48, z, .25, .27, .26, COL.heroHead);
    box(L, x - .32, .9, z, .13, .55, .14, col); box(L, x + .32, .9, z, .13, .55, .14, col);
  }
  function arena(L) {
    [[-7, 2], [7, 2], [-7, 10], [7, 10], [-7, 18], [7, 18]].forEach(([x, z]) => box(L, x, 0, z, 1.2, 4.2, 1.2, COL.stone));
    box(L, 0, 0, 26, 30, 2.2, .8, COL.wall);
  }

  /* ---------- drawing ---------- */
  const viewCam = p => camera([0, p.h, CAM_Z], 0, p.pitch * D2R, FOV, 0, 0, W, H);
  function card(g, x, y, w, h, a = .92) { g.fillStyle = `rgba(255,252,244,${a})`; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.strokeStyle = 'rgba(205,191,159,.9)'; g.lineWidth = 1.5; g.stroke(); }
  function text(g, s, x, y, o = {}) { g.font = `${o.w || 600} ${o.size || 13}px ${o.disp ? 'Montserrat, ' : ''}Jost, sans-serif`; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  function measure(p) {
    const cam = viewCam(p), hy = cam.horizon(), hf = hy / H;
    const top = cam.proj([0, BOSS.h, BOSS.z]), bot = cam.proj([0, 0, BOSS.z]);
    const fill = top && bot ? (Math.min(H, bot[1]) - Math.max(0, top[1])) / H : 0;
    const up = Math.atan2(BOSS.h - .5 - p.h, BOSS.z - CAM_Z) / D2R;      // + = looking up at the boss's head
    const verdict = hf >= READ.lowHorizon && up > 0 ? 'imposing' : (p.h > BOSS.h - .5 && hf <= READ.highHorizon) ? 'diminished' : 'level';
    return { cam, hy, hf, fill, up, verdict };
  }
  function sideInset(g, x, y, w, h, p) {
    card(g, x, y, w, h);
    text(g, 'From the side', x + 12, y + 18, { w: 800, size: 12, disp: 1 });
    const gy = y + h - 14, sc = Math.min((w - 40) / (BOSS.z - CAM_Z + 1), (h - 40) / 20.5), cx = x + 20, cy = gy - p.h * sc, bx = cx + (BOSS.z - CAM_Z) * sc;
    g.strokeStyle = C.muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 8, gy); g.lineTo(x + w - 8, gy); g.stroke();
    g.fillStyle = BOSS.col; g.beginPath(); g.roundRect(bx - 1.2 * sc, gy - BOSS.h * sc, 2.4 * sc, BOSS.h * sc, 3); g.fill();
    g.fillStyle = C.player; g.fillRect(cx + (HERO.z - CAM_Z) * sc - 2, gy - 1.75 * sc, 4, 1.75 * sc);
    // horizon from the camera, and the view wedge
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(21,32,68,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x + w - 8, cy); g.stroke(); g.setLineDash([]);
    const vf = Math.atan(Math.tan(FOV * D2R / 2) * H / W), a = -p.pitch * D2R, len = w;
    g.save(); g.beginPath(); g.rect(x, y + 24, w, h - 24); g.clip();
    g.fillStyle = 'rgba(46,163,220,.16)'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a + vf) * len, cy - Math.sin(a + vf) * len); g.lineTo(cx + Math.cos(a - vf) * len, cy - Math.sin(a - vf) * len); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(46,163,220,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 60, cy - Math.sin(a) * 60); g.stroke();
    g.restore();
    g.fillStyle = C.navy; g.fillRect(cx - 7, cy - 5, 14, 10);
    text(g, `${p.h.toFixed(1)} m`, cx + 4, cy < y + 50 ? cy + 18 : cy - 10, { size: 11, col: C.muted });
    text(g, 'horizon', x + w - 10, cy - 5, { size: 11, col: C.muted, align: 'right' });
  }
  function draw(g, F) {
    T.use(g); g.clearRect(0, 0, W, H);
    const p = F.p, M = measure(p), cam = M.cam;
    g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
    ground(g, cam, 0);
    const L = []; arena(L); heroFaces(L); bossFaces(L);
    render(g, cam, L);
    // horizon line
    if (M.hy > 0 && M.hy < H) {
      g.strokeStyle = 'rgba(255,252,244,.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, M.hy); g.lineTo(W, M.hy); g.stroke();
      g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([10, 7]); g.beginPath(); g.moveTo(0, M.hy); g.lineTo(W, M.hy); g.stroke(); g.setLineDash([]);
      T.label('horizon', 300, M.hy, 'center', C.navy, 13);
    }
    g.restore();
    // readouts
    card(g, 14, 14, 270, 150);
    text(g, 'Camera', 28, 36, { w: 800, size: 14, disp: 1 });
    const rows = [['Height', `${p.h.toFixed(1)} m`], ['Pitch', Math.abs(p.pitch) < .5 ? 'level' : `${Math.abs(p.pitch).toFixed(0)}° ${p.pitch > 0 ? 'down' : 'up'}`],
      ['Horizon', M.hy <= 0 ? 'above the frame' : M.hy >= H ? 'below the frame' : `${Math.round(M.hf * 100)}% down the frame`],
      ['Boss fills', `${Math.round(clamp(M.fill) * 100)}% of frame height`],
      ['Boss’s head', M.up >= 0 ? `${M.up.toFixed(0)}° above the lens` : `${(-M.up).toFixed(0)}° below the lens`]];
    rows.forEach(([n, v], i) => { text(g, n, 28, 60 + i * 21, { size: 13, col: C.muted }); text(g, v, 270, 60 + i * 21, { size: 13, w: 700, align: 'right' }); });
    const vc = { imposing: C.red, level: C.muted, diminished: C.blue }[M.verdict];
    T.stamp(M.verdict === 'level' ? 'eye level: neutral' : M.verdict, 150, 206, vc, 1, 26);
    if (M.verdict === 'imposing') { T.label('“big and scary / imposing…', 22, 252, 'left', C.red, 13); T.label('think boss fights”', 22, 280, 'left', C.red, 13); }
    if (M.verdict === 'diminished') T.label('“up high looking down on someone…”', 22, 252, 'left', C.blue, 13);
    if (F.cap) T.label(F.cap, W / 2, H - 26, 'center', C.ink, 15);
    sideInset(g, W - 14 - 250, 14, 250, 210, p);
  }

  /* ---------- tour: eye level, drop to the minimum, rise to the maximum, back ---------- */
  function tourAt(t) {
    let i = 0; while (i + 1 < TOUR.length && t >= TOUR[i + 1][0]) i++;
    const [t0, key, bl] = TOUR[i], from = EXTREMES[i ? TOUR[i - 1][1] : key], to = EXTREMES[key], k = bl ? ease(clamp((t - t0) / bl)) : 1;
    const cap = k < 1 ? (key === 'min' ? 'Drop the camera and pitch up: the horizon sinks' : key === 'max' ? 'Raise the camera and pitch down: the horizon climbs out of the frame' : 'Back to eye level') : to.name;
    return { p: { h: lerp(from.h, to.h, k), pitch: lerp(from.pitch, to.pitch, k) }, cap };
  }

  const scenes = {};
  canvasDemo('horizon', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, p: { ...EXTREMES.eye }, from: null, to: null, bt: 1, bd: 0 };
    const tourBtn = $(s, '.lh-tour'), rh = $(s, '.lh-h'), rp = $(s, '.lh-p'), xb = $$(s, '.lh-x .btn');
    const show = p => { rh.value = p.h; rp.value = p.pitch; $(s, '.v-h').textContent = `${p.h.toFixed(1)} m`; $(s, '.v-p').textContent = Math.abs(p.pitch) < .5 ? 'level' : `${Math.abs(p.pitch).toFixed(0)}° ${p.pitch > 0 ? 'down' : 'up'}`; };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.p = { ...tourAt(st.t % DUR).p }; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); xb.forEach(b => b.classList.remove('on')); };
    rh.oninput = () => { manual(); st.bd = 0; st.p.h = +rh.value; xb.forEach(b => b.classList.remove('on')); };
    rp.oninput = () => { manual(); st.bd = 0; st.p.pitch = +rp.value; xb.forEach(b => b.classList.remove('on')); };
    xb.forEach(b => b.onclick = () => { manual(); xb.forEach(x => x.classList.toggle('on', x === b)); const e = EXTREMES[b.dataset.x]; st.from = { h: st.p.h, pitch: st.p.pitch }; st.to = { h: e.h, pitch: e.pitch }; st.bt = 0; st.bd = .8; });
    scenes.horizon = { seek(t) { st.held = true; draw(g, tourAt(t)); }, dur: () => DUR };
    return dt => {
      if (st.held) return;
      st.t += dt;
      let F;
      if (st.tour) { if (st.t >= DUR) st.t = 0; F = tourAt(st.t); }
      else { if (st.bt < st.bd) { st.bt += dt; const k = ease(clamp(st.bt / st.bd)); st.p = { h: lerp(st.from.h, st.to.h, k), pitch: lerp(st.from.pitch, st.to.pitch, k) }; } F = { p: st.p, cap: '' }; }
      draw(g, F); show(F.p);
    };
  });

  window.__seek = (t, which = 'horizon') => scenes[which].seek(t);
  window.__dur = (which = 'horizon') => scenes[which].dur();
})();
