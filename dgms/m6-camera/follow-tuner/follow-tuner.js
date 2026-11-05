/* Follow camera tuner (Module 6, 3Cs: Camera; slides 118-137, 204-213, 222-232).
   A grey-box third-person scene (floor grid, a doorway the hero is heading for, a few crates, the hero) drawn by a small
   perspective projector written for this page: boxes are split into faces, back faces culled, faces clipped at the near
   plane and painted far to near, with flat shading from one light.
   The rig is the deck's five composition variables (224-226): the anchor point (the pivot, usually head or neck), the
   distance arm back from it, the left/right offset, the height above the anchor and the horizontal FOV. The camera sits at
   anchor - forward*distance + right*offset + up*height and pitches to look at the anchor (shifted by the offset), so a
   positive offset puts the camera over the right shoulder and the hero on the left third.
   Verb states (walk, sprint, cover, blind fire, aim: The Order's drill on 229-230) are full parameter sets, blended with
   an ease over each state's blend time (notes on 227). Changing FOV moves the hero on screen ("framing drift", notes on
   209), which the ghost outline shows so the learner re-tunes the offset.
   Tunable rules live in RIG_RANGE, PRESETS, VERBS and FAR_BADGE at the top. Every slide is a pure function of time on
   its walk-through (window.__seek / __dur), so the GIFs are deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const W = 1040, H = 585, GRN = '#1a8a4c';

  /* ---------- tunable rules ---------- */
  const RIG_RANGE = { anchor: [0.6, 1.9], dist: [0.8, 10], off: [-1.5, 1.5], hgt: [-0.6, 2.5], fov: [40, 110] };
  // pose numbers: crouch 0-1, lean (sprint) 0-1, aim 0-1, blind (gun over cover) 0-1; speed in m/s drives the floor
  const VERBS = {
    walk:   { label: 'Walk',       anchor: 1.5,  dist: 3.0,  off: 0.75, hgt: 0.30, fov: 70, blend: 0.45, speed: 1.6, crouch: 0, lean: 0, aim: 0, blind: 0 },
    sprint: { label: 'Sprint',     anchor: 1.45, dist: 3.9,  off: 0.55, hgt: 0.22, fov: 84, blend: 0.60, speed: 5.5, crouch: 0, lean: 1, aim: 0, blind: 0 },
    cover:  { label: 'Cover',      anchor: 1.0,  dist: 2.6,  off: 0.85, hgt: 0.45, fov: 70, blend: 0.35, speed: 0,   crouch: 1, lean: 0, aim: 0, blind: 0 },
    blind:  { label: 'Blind fire', anchor: 1.05, dist: 2.9,  off: 1.05, hgt: 0.70, fov: 72, blend: 0.25, speed: 0,   crouch: 1, lean: 0, aim: 0, blind: 1 },
    aim:    { label: 'Aim',        anchor: 1.55, dist: 1.9,  off: 0.55, hgt: 0.08, fov: 55, blend: 0.20, speed: 0.7, crouch: 0, lean: 0, aim: 1, blind: 0 },
  };
  const VERB_KEYS = Object.keys(VERBS);
  const PRESETS = {
    centred: { name: 'Centred (Lies of P style)', anchor: 1.5, dist: 3.2, off: 0,    hgt: 0.15, fov: 70 },
    third:   { name: 'On a third (Gears style)',  anchor: 1.5, dist: 3.0, off: 0.75, hgt: 0.30, fov: 70 },
    far:     { name: 'Too far',                   anchor: 1.5, dist: 8.5, off: 0.75, hgt: 1.6,  fov: 70 },
  };
  const FAR_BADGE = 6;          // distance (m) past which the "watching, not being" badge shows (slide 232)
  const DOOR = { z: 14, half: 0.8, h: 2.4 };
  // crates beside the path: [x, z, w, h, d]; they scroll past as the hero runs (wrapping over PROP_SPAN metres)
  const PROPS = [[-3.2, 1, 1.2, 1.2, 1.2], [3.4, 4, 1, 2, 1], [-4.6, 8, 1.6, 0.8, 1.6], [4.4, 10, 1.3, 1.3, 1.3], [-2.9, -3, 1, 1, 1], [3.1, -1.5, 1.4, 0.7, 1.4], [-3.8, 13, 1, 1.6, 1]];
  const PROP_SPAN = 18, PROP_MIN = -6;
  const COL = { sky0: '#f4ecd9', sky1: '#dfe5ef', ground: '#e4d9c0', grid: '#c9b993', wall: '#7b7fa6', crate: '#a99d84', cover: '#8b8fa8', hero: '#2ea3dc', heroHead: '#7ccbec', gun: '#2a2e55', foe: '#e5322d', foeHead: '#f08a7c', door: '#ffb951' };

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
  const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };

  /* ---------- the hero (and the enemy): grey-box parts posed by crouch / lean / aim / blind ---------- */
  function figure(L, x0, z0, f, phase, o = {}) {
    const yaw = o.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw), col = o.col || COL.hero, head = o.head || COL.heroHead, tag = o.tag || 'hero', a = o.a ?? 1;
    const part = (dx, y, dz, w, h, d, cl) => box(L, x0 + dx * c + dz * s, y, z0 - dx * s + dz * c, w, h, d, cl, { yaw, tag, a });
    const cr = f.crouch || 0, ln = f.lean || 0, am = f.aim || 0, bl = f.blind || 0;
    const swing = clamp((f.speed || 0) / 2.5) * (1 - cr), sw = Math.sin(phase) * .24 * swing;
    const legH = .85 - .38 * cr, tz = .12 * cr + .14 * ln, ty = legH, th = .6, hy = ty + th + .03;
    part(-.11, 0, sw, .17, legH, .2, col); part(.11, 0, -sw, .17, legH, .2, col);
    part(0, ty, tz, .48, th, .28, col);
    part(0, hy, tz + .03 * ln, .25, .27, .26, head);
    part(-.32, ty + .05, tz - sw * .8, .13, .55, .14, col);
    const ex = 1 - Math.max(am, bl);
    if (ex > .02) part(.32, ty + .05, tz + sw * .8, .13, .55 * ex + .14 * (1 - ex), .14, col);
    if (am > .02) part(.28, ty + .42, tz + .3 * am, .13, .14, .55 * am, col);
    if (bl > .02) part(.26, ty + .5, tz + .22, .13, .55 * bl, .14, col);
    const gk = Math.max(am, bl);
    if (gk > .05) { const wb = bl / (am + bl || 1); part(lerp(.31, .14, wb), lerp(ty + .4, hy + .42, wb), tz + lerp(.7, .45, wb), .1, .16, .8 * gk, COL.gun); }
    return [0, hy + .13, tz];
  }
  function heroBBox(cam, f, phase) {
    const L = []; figure(L, 0, 0, f, phase);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    L.forEach(fc => fc.pts.forEach(p => { const q = cam.proj(p); if (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } }));
    return { x0, y0, x1, y1 };
  }

  /* ---------- the rig ---------- */
  const rigCam = (p, vx = 0, vy = 0, vw = W, vh = H) => camera([p.off, p.anchor + p.hgt, -p.dist], 0, Math.atan2(p.hgt, p.dist), p.fov, vx, vy, vw, vh);
  const mix = (a, b, k) => { const o = {}; for (const key in b) o[key] = typeof b[key] === 'number' && typeof a[key] === 'number' ? lerp(a[key], b[key], k) : b[key]; return o; };
  const thirdOffset = p => p.dist * Math.tan(p.fov * D2R / 2) / 3;   // offset that puts the hero's centre on the left third

  // draws the grey-box scene; returns where the hero landed and how much of the doorway it leaves visible
  function scene(g, cam, f, s, o = {}) {
    g.save(); g.beginPath(); g.roundRect(cam.vx, cam.vy, cam.vw, cam.vh, o.r ?? 14); g.clip();
    ground(g, cam, s);
    const L = [];
    // back wall with the doorway (the hero's destination)
    box(L, -7.4, 0, DOOR.z, 13.2, 4.5, .4, COL.wall); box(L, 7.4, 0, DOOR.z, 13.2, 4.5, .4, COL.wall);
    box(L, 0, DOOR.h, DOOR.z, DOOR.half * 2, 4.5 - DOOR.h, .4, COL.wall);
    L.push({ n: [0, 0, -1], pts: [[-DOOR.half, 0, DOOR.z + .15], [DOOR.half, 0, DOOR.z + .15], [DOOR.half, DOOR.h, DOOR.z + .15], [-DOOR.half, DOOR.h, DOOR.z + .15]], col: COL.door, a: 1, glow: 1, tag: 'door' });
    PROPS.forEach(([x, z0, w, h, d]) => {
      const z = (((z0 - s - PROP_MIN) % PROP_SPAN) + PROP_SPAN) % PROP_SPAN + PROP_MIN;
      const a = clamp((PROP_MIN + PROP_SPAN - z) / 3) * clamp((z - PROP_MIN) / 2);
      box(L, x, 0, z, w, h, d, COL.crate, { a });
    });
    if ((f.crouch || 0) > .05) box(L, 0, 0, .78, 1.7, .95, .45, COL.cover, { a: clamp(f.crouch * 1.4) });
    const phase = s * 2.6;
    const head = figure(L, 0, 0, f, phase);
    if (o.foe) figure(L, o.foe.x, o.foe.z, { speed: 2.5 }, o.foe.phase, { yaw: o.foe.yaw, col: COL.foe, head: COL.foeHead, tag: 'foe' });
    const drawn = render(g, cam, L);
    if ((f.aim || 0) > .3) { const a = clamp((f.aim - .3) / .5), mx = cam.vx + cam.vw / 2, my = cam.vy + cam.vh / 2; g.strokeStyle = `rgba(229,50,45,${a})`; g.lineWidth = 2.5; g.beginPath(); g.arc(mx, my, 12, 0, TAU); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { g.moveTo(mx + dx * 6, my + dy * 6); g.lineTo(mx + dx * 20, my + dy * 20); }); g.stroke(); }
    g.restore();
    const heroPolys = drawn.filter(d => d.f.tag === 'hero').map(d => d.sp);
    let seen = 0, n = 0;
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
      n++; const q = cam.proj([-DOOR.half + 2 * DOOR.half * i / 10, .05 + (DOOR.h - .1) * j / 10, DOOR.z]);
      if (q && q[0] > cam.vx && q[0] < cam.vx + cam.vw && q[1] > cam.vy && q[1] < cam.vy + cam.vh && !heroPolys.some(P => inPoly(q[0], q[1], P))) seen++;
    }
    const bb = heroBBox(cam, f, phase);
    return { doorVis: seen / n, head: cam.proj(head), bb, door: cam.proj([0, DOOR.h + .35, DOOR.z]), foeBox: drawn.filter(d => d.f.tag === 'foe').reduce((b, d) => { d.sp.forEach(([x, y]) => { b = b || { x0: x, x1: x }; b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); }); return b; }, null) };
  }
  function thirds(g, cam) {
    const { vx, vy, vw, vh } = cam;
    g.save(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,252,244,.7)';
    const ln = () => { g.beginPath(); [1, 2].forEach(k => { g.moveTo(vx + vw * k / 3, vy); g.lineTo(vx + vw * k / 3, vy + vh); g.moveTo(vx, vy + vh * k / 3); g.lineTo(vx + vw, vy + vh * k / 3); }); g.stroke(); };
    ln(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(21,32,68,.55)'; g.setLineDash([7, 6]); ln(); g.setLineDash([]);
    [1, 2].forEach(i => [1, 2].forEach(j => { g.fillStyle = 'rgba(21,32,68,.6)'; g.beginPath(); g.arc(vx + vw * i / 3, vy + vh * j / 3, 4, 0, TAU); g.fill(); }));
    g.restore();
  }
  // centred label wrapped to maxW; returns the y below the last line
  function wrapLabel(g, s, x, y, maxW, col, size) {
    g.font = `600 ${size}px Jost, sans-serif`;
    const lines = []; let cur = '';
    s.split(' ').forEach(w => { const tryS = cur ? cur + ' ' + w : w; if (g.measureText(tryS).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS; });
    if (cur) lines.push(cur);
    lines.forEach((l, i) => T.label(l, x, y + i * (size * 1.75), 'center', col, size));
    return y + lines.length * size * 1.75;
  }
  function card(g, x, y, w, h, a = .92) { g.fillStyle = `rgba(255,252,244,${a})`; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.strokeStyle = 'rgba(205,191,159,.9)'; g.lineWidth = 1.5; g.stroke(); }
  function text(g, s, x, y, o = {}) { g.font = `${o.w || 600} ${o.size || 13}px ${o.disp ? 'Montserrat, ' : ''}Jost, sans-serif`; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic'; g.fillText(s, x, y); }
  const fmtOff = v => Math.abs(v) < .02 ? 'centre' : `${Math.abs(v).toFixed(2)} m ${v > 0 ? 'right' : 'left'}`;
  function readouts(g, x, y, p) {
    const rows = [['Anchor height', `${p.anchor.toFixed(2)} m`, 'anchor'], ['Distance', `${p.dist.toFixed(1)} m`, 'dist'], ['Offset', fmtOff(p.off), 'off'], ['Height', `${p.hgt >= 0 ? '+' : ''}${p.hgt.toFixed(2)} m`, 'hgt'], ['FOV', `${Math.round(p.fov)}° H`, 'fov']];
    card(g, x, y, 250, 30 + rows.length * 22);
    text(g, 'The five variables', x + 12, y + 20, { w: 800, size: 13, disp: 1 });
    rows.forEach(([n, v, k], i) => {
      const yy = y + 42 + i * 22, [a, b] = RIG_RANGE[k];
      text(g, n, x + 12, yy, { size: 12, col: C.muted }); text(g, v, x + 238, yy, { size: 13, w: 700, align: 'right' });
      g.fillStyle = '#e8dfca'; g.fillRect(x + 98, yy - 8, 46, 5); g.fillStyle = C.player; g.fillRect(x + 98, yy - 8, 46 * clamp((p[k] - a) / (b - a)), 5);
    });
  }
  // the rig from above and from the side: anchor dot, distance arm, offset, height
  function rigInset(g, x, y, w, h, p) {
    card(g, x, y, w, h);
    const pw = w / 2;
    text(g, 'Rig from above', x + 12, y + 18, { w: 800, size: 12, disp: 1 }); text(g, 'from the side', x + pw + 10, y + 18, { w: 800, size: 12, disp: 1 });
    g.strokeStyle = '#e2d7bd'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + pw, y + 10); g.lineTo(x + pw, y + h - 10); g.stroke();
    // top view: forward is up
    const sc = Math.min(28, (h - 48) / (p.dist + .6), (pw / 2 - 18) / Math.max(.5, Math.abs(p.off))), ax = x + pw / 2 - p.off * sc * .5, ay = y + 36, cx = ax + p.off * sc, cy = ay + p.dist * sc;
    const half = p.fov * D2R / 2, fl = 32;
    g.fillStyle = 'rgba(46,163,220,.14)'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - Math.tan(half) * fl, cy - fl); g.lineTo(cx + Math.tan(half) * fl, cy - fl); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(46,163,220,.7)'; g.lineWidth = 1.5; g.stroke();
    g.setLineDash([4, 3]); g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, cy); g.lineTo(cx, cy); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.player; g.beginPath(); g.arc(ax, ay, 7, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    g.fillStyle = C.gold; g.beginPath(); g.arc(ax, ay, 3, 0, TAU); g.fill();
    g.fillStyle = C.navy; g.fillRect(cx - 6, cy - 4, 12, 9);
    text(g, 'distance', ax - 8, ay + (cy - ay) * .32 + 4, { size: 11, col: C.muted, align: 'right' });
    if (Math.abs(p.off) > .05) text(g, 'offset', (ax + cx) / 2, cy + 16, { size: 11, col: C.muted, align: 'center' });
    // side view: forward is right
    const gy = y + h - 14, sc2 = Math.min(34, (pw - 40) / (p.dist + .5), (h - 46) / (p.anchor + Math.max(0, p.hgt) + .3)), hx = x + w - 26, camx = hx - p.dist * sc2, aY = gy - p.anchor * sc2, camY = gy - (p.anchor + p.hgt) * sc2;
    g.strokeStyle = C.muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + pw + 8, gy); g.lineTo(x + w - 8, gy); g.stroke();
    const hh = (1.75 - .38 * (p.crouch || 0)) * sc2;
    g.fillStyle = C.player; g.beginPath(); g.roundRect(hx - 5, gy - hh, 10, hh, 4); g.fill();
    g.setLineDash([4, 3]); g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(hx, aY); g.lineTo(camx, aY); g.lineTo(camx, camY); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(46,163,220,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(camx, camY); g.lineTo(hx, aY); g.stroke();
    g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.arc(hx, aY, 4, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = C.navy; g.fillRect(camx - 6, camY - 4, 12, 9);
    text(g, 'height', camx - 8, (aY + camY) / 2 + 4, { size: 11, col: C.muted, align: 'right' });
    text(g, 'anchor', hx, gy - hh - 6, { size: 11, col: C.goldInk, align: 'center' });
  }
  function verbStrip(g, x, y, verb, k, blend) {
    let xx = x;
    VERB_KEYS.forEach(v => {
      g.font = '700 13px Jost, sans-serif'; const w = g.measureText(VERBS[v].label).width + 22, on = v === verb;
      g.fillStyle = on ? C.navy : 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(xx, y, w, 26, 8); g.fill();
      g.strokeStyle = on ? C.navy : '#cdbf9f'; g.lineWidth = 1.5; g.stroke();
      text(g, VERBS[v].label, xx + w / 2, y + 18, { w: 700, col: on ? '#fff' : C.ink, align: 'center' });
      if (on) {
        card(g, xx - 4, y + 30, 132, 22);
        g.fillStyle = '#e8dfca'; g.fillRect(xx + 4, y + 44, 120, 4); g.fillStyle = C.gold; g.fillRect(xx + 4, y + 44, 120 * clamp(k), 4);
        text(g, k < 1 ? `blending ${blend.toFixed(2)} s` : `blend time ${blend.toFixed(2)} s`, xx + 4, y + 41, { size: 11, col: C.muted });
      }
      xx += w + 6;
    });
  }
  function ghostMark(g, bb, now, a) {
    if (a <= 0 || !isFinite(bb.x0)) return;
    g.save(); g.globalAlpha = a;
    g.setLineDash([6, 5]); g.strokeStyle = C.red; g.lineWidth = 2.5; g.fillStyle = 'rgba(229,50,45,.08)';
    g.beginPath(); g.roundRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0, 10); g.fill(); g.stroke(); g.setLineDash([]);
    const ox = (bb.x0 + bb.x1) / 2, nx = (now.x0 + now.x1) / 2, yy = bb.y0 + (bb.y1 - bb.y0) * .45, dx = nx - ox;
    if (Math.abs(dx) > 6) { g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ox, yy); g.lineTo(nx, yy); g.stroke(); const sg = Math.sign(dx); g.fillStyle = C.red; g.beginPath(); g.moveTo(nx, yy); g.lineTo(nx - sg * 10, yy - 6); g.lineTo(nx - sg * 10, yy + 6); g.fill(); }
    T.label(`framing drift ${Math.round(Math.abs(dx))} px`, ox, bb.y0 - 14, 'center', C.red, 13);
    g.restore();
  }

  /* ---------- deterministic tours: key frames [t, params, blend, verb, caption, ghost params] ---------- */
  const K = (t, p, blend, verb, cap, ghost) => ({ t, p, blend, verb, cap, ghost });
  const keyAt = (Ks, t) => { let i = 0; while (i + 1 < Ks.length && t >= Ks[i + 1].t) i++; return i; };
  function frameAt(Ks, t) {
    const i = keyAt(Ks, t), k = Ks[i], from = i ? Ks[i - 1].p : k.p, e = k.blend ? ease(clamp((t - k.t) / k.blend)) : 1;
    return { f: mix(from, k.p, e), k, e, since: t - k.t };
  }
  const distAt = (Ks, t, dt = .05) => { let s = 0; for (let x = 0; x < t; x += dt) s += frameAt(Ks, x).f.speed * Math.min(dt, t - x); return s; };

  const thirdP = { ...VERBS.walk, ...PRESETS.third }, wideP = { ...thirdP, fov: 95 }, retuned = { ...wideP, off: thirdOffset(wideP) };
  const TOUR1 = [
    K(0, { ...VERBS.walk, ...PRESETS.centred }, 0, 'walk', 'Centred (Lies of P style): the hero sits on the sight line to the doorway (119-120)'),
    K(4, thirdP, .8, 'walk', 'On a third (Gears style): offset the camera right and the doorway clears'),
    K(8, { ...VERBS.walk, ...PRESETS.far }, 1, 'walk', 'Too far: the hero shrinks, and you watch the hero instead of being the hero'),
    K(11.5, thirdP, .8, 'walk', 'Back on the third'),
    K(13, wideP, 1.2, 'walk', 'Widen the FOV to 95°: the hero drifts off the third', thirdP),
    K(16, retuned, 1, 'walk', `Re-tune the offset to ${retuned.off.toFixed(2)} m and the hero is back on the third`, thirdP),
    K(18.5, VERBS.walk, .45, 'walk', 'The Order’s drill as parameter sets, one per verb (229-230). Walk:'),
    K(20, VERBS.sprint, VERBS.sprint.blend, 'sprint', 'Sprint: pull away and widen the FOV to sell speed'),
    K(22.5, VERBS.cover, VERBS.cover.blend, 'cover', 'Cover: drop the anchor to the crouch, push the hero further left'),
    K(24.5, VERBS.blind, VERBS.blind.blend, 'blind', 'Blind fire: rise and swing wider to see over the cover'),
    K(26.5, VERBS.aim, VERBS.aim.blend, 'aim', 'Aim: tighter FOV, close in, frame the weapon'),
  ];
  const DUR1 = 29.5;

  /* ---------- slide 1: the tuner ---------- */
  function drawTuner(g, F) {
    T.use(g); g.clearRect(0, 0, W, H);
    const cam = rigCam(F.p);
    const res = scene(g, cam, F.p, F.s);
    thirds(g, cam);
    if (F.ghost) ghostMark(g, heroBBox(rigCam(F.ghost), F.ghost, F.s * 2.6), res.bb, F.ghostA);
    readouts(g, 14, 14, F.p);
    // framing chips, top right
    const vis = Math.round(res.doorVis * 100), hx = res.head ? res.head[0] : W / 2;
    const where = Math.abs(hx - W / 2) < W * .07 ? 'hero centred' : Math.abs(hx - W / 3) < W * .06 ? 'hero on the left third' : Math.abs(hx - 2 * W / 3) < W * .06 ? 'hero on the right third' : hx < W / 2 ? 'hero left of centre' : 'hero right of centre';
    T.label(`doorway visible ${vis}%`, W - 16, 30, 'right', vis > 85 ? GRN : vis > 40 ? C.goldInk : C.red, 15);
    T.label(where, W - 16, 62, 'right', C.ink, 14);
    const hh = Math.round(clamp((res.bb.y1 - res.bb.y0) / H) * 100);
    T.label(`hero ${hh}% of frame height`, W - 16, 92, 'right', C.muted, 13);
    if (res.door && res.door[1] > 0) T.label('doorway', res.door[0], res.door[1] - 6, 'center', C.goldInk, 12);
    if (F.p.dist > FAR_BADGE) { T.stamp('watching, not being', W / 2, 150, C.red, clamp((F.p.dist - FAR_BADGE) / 1), 28); T.label('sympathizing with the hero, not empathizing', W / 2, 192, 'center', C.red, 13); }
    const capY = F.cap ? wrapLabel(g, F.cap, 572, 30, 560, C.ink, 15) : 30;
    if (F.retune) T.label(`offset that restores the third: ${F.retune.toFixed(2)} m`, 572, capY + (F.cap ? 4 : 0), 'center', C.red, 14);
    verbStrip(g, 14, H - 64, F.verb, F.e, F.blend);
    rigInset(g, W - 14 - 340, H - 14 - 170, 340, 170, F.p);
    return res;
  }
  function tourFrame1(t) {
    const fr = frameAt(TOUR1, t), k = fr.k;
    const ghostA = k.ghost ? clamp(fr.since / .3) * clamp((k.t + 3 - t) / .4 + 1) : 0;
    return { p: fr.f, s: distAt(TOUR1, t), verb: k.verb, e: fr.e, blend: k.blend, cap: k.cap, ghost: k.ghost, ghostA, retune: k.ghost && k.p.fov !== k.ghost.fov ? thirdOffset(k.p) : 0 };
  }

  const scenes = {};
  canvasDemo('tuner', (s, cv, g) => {
    const fresh = () => Object.fromEntries(VERB_KEYS.map(v => [v, { ...VERBS[v] }]));
    const st = { tour: true, held: false, t: 0, verb: 'walk', states: fresh(), cur: { ...VERBS.walk }, from: { ...VERBS.walk }, to: { ...VERBS.walk }, bt: 1, bd: 0, s: 0, ghost: null, ghostAge: 9, last: '' };
    const tourBtn = $(s, '.ft-tour'), sliders = $$(s, 'input[type=range]'), verbs = $$(s, '.ft-verb .btn'), pres = $$(s, '.ft-pre .btn');
    const show = (p, blend) => sliders.forEach(r => { const k = r.dataset.k, v = k === 'blend' ? blend : p[k]; r.value = v; $(s, '.v-' + k).textContent = k === 'fov' ? `${Math.round(v)}°` : k === 'off' ? fmtOff(v) : k === 'blend' ? `${(+v).toFixed(2)} s` : `${(+v).toFixed(2)} m`; });
    const markVerb = v => verbs.forEach(b => b.classList.toggle('on', b.dataset.v === v));
    const manual = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.cur = { ...st.states.walk, ...tourFrame1(st.t % DUR1).p }; st.verb = 'walk'; st.from = { ...st.cur }; st.to = { ...st.states.walk }; st.bt = 0; st.bd = .6; markVerb('walk'); };
    const blendTo = (p, d) => { st.from = { ...st.cur }; st.to = { ...p }; st.bt = 0; st.bd = d; st.ghost = null; st.ghostAge = 9; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); pres.forEach(b => b.classList.remove('on')); };
    $(s, '.ft-reset').onclick = () => { manual(); st.states = fresh(); blendTo(st.states[st.verb], .6); pres.forEach(b => b.classList.remove('on')); show(st.states[st.verb], st.states[st.verb].blend); };
    verbs.forEach(b => b.onclick = () => { manual(); st.verb = b.dataset.v; markVerb(st.verb); const v = st.states[st.verb]; blendTo(v, v.blend); show(v, v.blend); });
    pres.forEach(b => b.onclick = () => { manual(); pres.forEach(x => x.classList.toggle('on', x === b)); const v = st.states[st.verb]; Object.assign(v, PRESETS[b.dataset.p]); delete v.name; blendTo(v, .7); show(v, v.blend); });
    sliders.forEach(r => r.oninput = () => {
      manual(); const k = r.dataset.k, v = +r.value, sv = st.states[st.verb];
      if (k === 'fov' && st.ghostAge > 2.5) st.ghost = { ...st.cur };
      if (k === 'fov') st.ghostAge = 0;
      sv[k] = v; if (k !== 'blend') { st.cur[k] = v; st.to[k] = v; st.from[k] = v; }
      show(sv, sv.blend);
    });
    show(VERBS.walk, VERBS.walk.blend);
    function frameLive() {
      const e = st.bd ? clamp(st.bt / st.bd) : 1, v = st.states[st.verb];
      const ga = st.ghost ? clamp((4 - st.ghostAge) / 1) : 0;
      return { p: st.cur, s: st.s, verb: st.verb, e, blend: v.blend, cap: '', ghost: ga > 0 ? st.ghost : null, ghostA: ga, retune: ga > 0 && Math.abs(st.ghost.fov - st.cur.fov) > 1 ? thirdOffset(st.cur) : 0 };
    }
    let lastSync = -1;
    const syncSliders = F => { const key = Math.round(F.p.dist * 20) + ':' + Math.round(F.p.fov) + ':' + Math.round(F.p.off * 100) + F.verb; if (key !== lastSync) { lastSync = key; show(F.p, VERBS[F.verb].blend); markVerb(F.verb); } };
    scenes.tuner = { seek(t) { st.held = true; drawTuner(g, tourFrame1(t)); }, dur: () => DUR1 };
    return dt => {
      if (st.held) return;
      st.t += dt;
      if (st.tour) { if (st.t >= DUR1) st.t = 0; const F = tourFrame1(st.t); drawTuner(g, F); syncSliders(F); return; }
      if (st.bt < st.bd) { st.bt += dt; st.cur = mix(st.from, st.to, ease(clamp(st.bt / st.bd))); }
      st.s += (st.cur.speed || 0) * dt; st.ghostAge += dt;
      drawTuner(g, frameLive());
    };
  });

  /* ---------- slide 2: cameras accentuate verbs ---------- */
  const TOUR2 = [K(0, VERBS.walk, 0, 'walk'), K(4, VERBS.sprint, VERBS.sprint.blend, 'sprint'), K(9, VERBS.aim, VERBS.aim.blend, 'aim'), K(13.5, VERBS.walk, VERBS.walk.blend, 'walk')];
  const DUR2 = 16;
  const RIG5 = ['anchor', 'dist', 'off', 'hgt', 'fov'];
  const fixCam = (f, answer) => answer ? f : { ...f, ...Object.fromEntries(RIG5.map(k => [k, VERBS.walk[k]])) };
  const VERB_COL = { walk: '#5d618c', sprint: '#2fae63', aim: '#e5322d' };
  const SERIES = [['Distance', 'dist', 1, 5, C.player, v => `${v.toFixed(1)} m`], ['Height', 'camH', 1.4, 2.0, C.gold, v => `${v.toFixed(2)} m`], ['FOV', 'fov', 45, 90, C.red, v => `${Math.round(v)}°`]];
  const camH = p => p.anchor + p.hgt;
  function drawVerbs(g, F) {
    T.use(g); g.clearRect(0, 0, W, H);
    const p = fixCam(F.p, F.answer), cam = rigCam(p);
    scene(g, cam, F.p, F.s);
    // big verb name
    T.stamp(VERBS[F.verb].label.toUpperCase(), 110, 52, VERB_COL[F.verb], 1, 30);
    if (!F.answer) T.label('camera fixed at walk values', 110, 100, 'center', C.red, 13);
    // readouts card
    const cx = W - 14 - 250, cy = 14;
    card(g, cx, cy, 250, 140);
    text(g, F.answer ? 'Camera for this verb' : 'Camera (fixed)', cx + 14, cy + 22, { w: 800, size: 13, disp: 1 });
    SERIES.forEach(([n, k, a, b, col, fmt], i) => {
      const v = k === 'camH' ? camH(p) : p[k], w0 = k === 'camH' ? camH(VERBS.walk) : VERBS.walk[k], y = cy + 52 + i * 30, d = v - w0;
      text(g, k === 'camH' ? 'Camera height' : n, cx + 14, y, { size: 13, col: C.muted });
      text(g, fmt(v), cx + 170, y, { size: 17, w: 800, align: 'right', disp: 1 });
      if (Math.abs(d) > (k === 'fov' ? .5 : .02)) text(g, `${d > 0 ? '+' : '−'}${k === 'fov' ? Math.round(Math.abs(d)) + '°' : Math.abs(d).toFixed(k === 'dist' ? 1 : 2)}`, cx + 236, y, { size: 13, w: 700, col: d > 0 ? GRN : C.red, align: 'right' });
      g.fillStyle = '#e8dfca'; g.fillRect(cx + 14, y + 6, 222, 4); g.fillStyle = col; g.fillRect(cx + 14, y + 6, 222 * clamp((v - a) / (b - a)), 4);
    });
    // timeline of the loop, bottom right
    const tx = W - 14 - 430, ty = H - 14 - 140, tw = 430, th = 140, px = tx + 14, pw = tw - 28, py = ty + 30, ph = 88;
    card(g, tx, ty, tw, th);
    text(g, 'The loop: distance, camera height and FOV over time', tx + 14, ty + 20, { w: 700, size: 12 });
    const tX = t => px + 70 + (pw - 70) * t / DUR2;
    TOUR2.forEach((k, i) => { const x0 = tX(k.t), x1 = tX(i + 1 < TOUR2.length ? TOUR2[i + 1].t : DUR2); g.fillStyle = VERB_COL[k.verb] + '22'; g.fillRect(x0, py, x1 - x0, ph); text(g, VERBS[k.verb].label, x0 + 4, py + ph + 13, { size: 11, col: VERB_COL[k.verb], w: 700 }); });
    SERIES.forEach(([n, k, a, b, col], j) => {
      const ly = py + j * ph / 3, lh = ph / 3;
      g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath();
      for (let i = 0; i <= 160; i++) { const t = DUR2 * i / 160, q = fixCam(frameAt(TOUR2, t).f, F.answer), v = k === 'camH' ? camH(q) : q[k], x = px + 70 + (pw - 70) * i / 160, y = ly + lh - 5 - (lh - 10) * clamp((v - a) / (b - a)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      text(g, n, px + 4, ly + lh / 2 + 4, { size: 11, w: 700, col });
    });
    if (F.t != null) { const x = tX(F.t); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, py - 4); g.lineTo(x, py + ph + 4); g.stroke(); }
    else text(g, `holding: ${VERBS[F.verb].label}`, tx + tw - 14, ty + 20, { size: 12, col: C.muted, align: 'right' });
    if (F.answer && F.verb === 'sprint') T.label('pull away + wider FOV: speed', W / 2 + 40, 140, 'center', GRN, 14);
    if (F.answer && F.verb === 'aim') T.label('closer + tighter FOV: frame the weapon', W / 2 + 40, 140, 'center', C.red, 14);
  }
  canvasDemo('verbs', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, verb: 'walk', cur: { ...VERBS.walk }, from: { ...VERBS.walk }, to: { ...VERBS.walk }, bt: 1, bd: 0, s: 0, answer: true };
    const tourBtn = $(s, '.fv-tour'), btns = $$(s, '.fv-verb .btn'), chk = $(s, '.fv-answer');
    const mark = v => btns.forEach(b => b.classList.toggle('on', b.dataset.v === v));
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); mark(''); };
    btns.forEach(b => b.onclick = () => {
      if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.cur = frameAt(TOUR2, st.t % DUR2).f; }
      st.verb = b.dataset.v; mark(st.verb); st.from = { ...st.cur }; st.to = { ...VERBS[st.verb] }; st.bt = 0; st.bd = VERBS[st.verb].blend;
    });
    chk.onchange = () => { st.answer = chk.checked; };
    const tf = t => { const fr = frameAt(TOUR2, t); return { p: fr.f, s: distAt(TOUR2, t), verb: fr.k.verb, t, answer: st.answer }; };
    scenes.verbs = { seek(t) { st.held = true; drawVerbs(g, { ...tf(t), answer: true }); }, dur: () => DUR2 };
    return dt => {
      if (st.held) return;
      st.t += dt;
      if (st.tour) { if (st.t >= DUR2) st.t = 0; drawVerbs(g, tf(st.t)); return; }
      if (st.bt < st.bd) { st.bt += dt; st.cur = mix(st.from, st.to, ease(clamp(st.bt / st.bd))); }
      st.s += st.cur.speed * dt;
      drawVerbs(g, { p: st.cur, s: st.s, verb: st.verb, t: null, answer: st.answer });
    };
  });

  /* ---------- slide 3: thirds, centre and circle-right ---------- */
  const ORBIT = { r: 2.5, speed: 30 };     // enemy circles the hero at r metres, speed degrees per second
  const ARENA = 8;                        // radius (m) of the arena area that is counted
  const VIEW3 = { x: 16, y: 16, w: 640, h: 360 }, MAP3 = { x: 672, y: 16, w: 352, h: 360 };
  const p3 = k => ({ ...VERBS.walk, ...PRESETS.third, off: PRESETS.third.off * k, hgt: lerp(PRESETS.centred.hgt, PRESETS.third.hgt, k), dist: lerp(PRESETS.centred.dist, PRESETS.third.dist, k), speed: 0 });
  const seesXZ = (p, x, z) => { const dz = z + p.dist, dx = x - p.off; return dz > .2 && Math.abs(Math.atan2(dx, dz)) < p.fov * D2R / 2; };
  function sideStats(p) {
    let L = 0, R = 0;
    for (let x = -ARENA; x <= ARENA; x += .25) for (let z = -ARENA; z <= ARENA; z += .25) if (x * x + z * z <= ARENA * ARENA && Math.abs(x) > .12 && seesXZ(p, x, z)) { if (x < 0) L += .0625; else R += .0625; }
    let aL = 0, aR = 0;
    for (let d = 0; d <= 180; d++) { const th = d * D2R; if (seesXZ(p, ORBIT.r * Math.sin(th), ORBIT.r * Math.cos(th))) aR = d; else break; }
    for (let d = 0; d <= 180; d++) { const th = -d * D2R; if (seesXZ(p, ORBIT.r * Math.sin(th), ORBIT.r * Math.cos(th))) aL = d; else break; }
    return { L, R, aL, aR };
  }
  function bar(g, x, y, w, v, max, col, lab, val) {
    text(g, lab, x, y, { size: 12, col: C.muted });
    g.fillStyle = '#e8dfca'; g.beginPath(); g.roundRect(x, y + 6, w, 12, 6); g.fill();
    g.fillStyle = col; g.beginPath(); g.roundRect(x, y + 6, Math.max(6, w * clamp(v / max)), 12, 6); g.fill();
    text(g, val, x + w, y, { size: 13, w: 700, align: 'right' });
  }
  function drawThirds(g, F) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const p = p3(F.k), V = VIEW3, cam = rigCam(p, V.x, V.y, V.w, V.h);
    let foe = null, th = 0;
    if (F.dir) { th = (F.dir === 'left' ? -1 : 1) * F.ot * ORBIT.speed * D2R; const fx = ORBIT.r * Math.sin(th), fz = ORBIT.r * Math.cos(th); foe = { x: fx, z: fz, yaw: Math.atan2(-fx, -fz), phase: F.ot * 7 }; }
    const res = scene(g, cam, p, 0, { foe, r: 12 });
    thirds(g, cam);
    const vis = Math.round(res.doorVis * 100);
    if (res.door) T.label('doorway', res.door[0], res.door[1] - 6, 'center', C.goldInk, 12);
    T.label(F.k < .08 ? 'centred' : F.k > .92 ? 'on the left third' : 'moving to the third', V.x + 12, V.y + 22, 'left', C.ink, 13);
    if (foe) { const on = res.foeBox && res.foeBox.x1 > V.x + 8 && res.foeBox.x0 < V.x + V.w - 8; T.label(on ? 'enemy in view' : 'enemy out of view', V.x + V.w - 12, V.y + 22, 'right', on ? GRN : C.red, 13); }
    if (F.cap) T.label(F.cap, V.x + V.w / 2, V.y + V.h - 22, 'center', C.ink, 13);
    // top-down map
    const M = MAP3, sc = 17, ox = M.x + M.w / 2, oy = M.y + 196, P = (x, z) => [ox + x * sc, oy - z * sc];
    g.save(); g.beginPath(); g.roundRect(M.x, M.y, M.w, M.h, 12); g.clip();
    g.fillStyle = '#efe6d2'; g.fillRect(M.x, M.y, M.w, M.h);
    g.fillStyle = COL.ground; g.beginPath(); g.arc(ox, oy, ARENA * sc, 0, TAU); g.fill();
    // visible area: frustum wedge inside the arena, left and right of the hero shaded apart
    const [cxs, czs] = P(p.off, -p.dist), half = p.fov * D2R / 2, far = 30;
    const wedge = () => { g.beginPath(); g.moveTo(cxs, czs); g.lineTo(cxs + Math.sin(-half) * far * sc, czs - Math.cos(half) * far * sc); g.lineTo(cxs + Math.sin(half) * far * sc, czs - Math.cos(half) * far * sc); g.closePath(); };
    [[-1, 'rgba(85,98,235,.30)'], [1, 'rgba(47,174,99,.30)']].forEach(([sg, col]) => {
      g.save(); g.beginPath(); g.arc(ox, oy, ARENA * sc, 0, TAU); g.clip();
      g.beginPath(); g.rect(sg < 0 ? M.x : ox, M.y, sg < 0 ? ox - M.x : M.x + M.w - ox, M.h); g.clip();
      wedge(); g.fillStyle = col; g.fill(); g.restore();
    });
    g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ox, oy, ARENA * sc, 0, TAU); g.stroke();
    g.save(); g.beginPath(); g.arc(ox, oy, ARENA * sc, 0, TAU); g.clip(); wedge(); g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 1.5; g.stroke(); g.restore();
    g.setLineDash([3, 4]); g.strokeStyle = 'rgba(21,32,68,.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox, M.y); g.lineTo(ox, M.y + M.h); g.stroke(); g.setLineDash([]);
    // orbit: seen arcs solid, hidden arcs dashed red
    const S = sideStats(p);
    for (let d = -180; d < 180; d += 3) { const a0 = d * D2R, a1 = (d + 3) * D2R, on = seesXZ(p, ORBIT.r * Math.sin(a0 + .02), ORBIT.r * Math.cos(a0 + .02)); g.strokeStyle = on ? C.ink : 'rgba(229,50,45,.55)'; g.lineWidth = on ? 3 : 2; g.setLineDash(on ? [] : [4, 4]); g.beginPath(); g.arc(ox, oy, ORBIT.r * sc, -Math.PI / 2 + a0, -Math.PI / 2 + a1); g.stroke(); }
    g.setLineDash([]);
    // door arrow, hero, camera, enemy
    g.fillStyle = C.gold; g.fillRect(ox - DOOR.half * sc, M.y + 8, DOOR.half * 2 * sc, 6); text(g, 'doorway 14 m ahead', ox + 8, M.y + 30, { size: 11, col: C.goldInk, align: 'left' }); if (0) text(g, '', ox, M.y + 30, { size: 11, col: C.goldInk, align: 'center' });
    g.strokeStyle = 'rgba(255,185,81,.8)'; g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox, M.y + 14); g.stroke(); g.setLineDash([]);
    T.use(g); T.player(ox, oy, -Math.PI / 2, .6);
    g.fillStyle = C.navy; g.fillRect(cxs - 7, czs - 5, 14, 11); text(g, 'camera', cxs + 10, czs + 18, { size: 11, col: C.muted });
    if (foe) { const [fx, fy] = P(foe.x, foe.z); T.foe(fx, fy, 9, Math.atan2(oy - fy, ox - fx), seesXZ(p, foe.x, foe.z) ? C.red : 'rgba(229,50,45,.45)'); }
    text(g, 'left of hero', M.x + 12, M.y + M.h - 12, { size: 12, col: C.blue, w: 700 }); text(g, 'right of hero', M.x + M.w - 12, M.y + M.h - 12, { size: 12, col: GRN, w: 700, align: 'right' });
    g.restore();
    // stats strip
    const by = 392;
    card(g, 16, by, 1008, 177, .6);
    text(g, 'Sight line to the doorway', 32, by + 26, { w: 800, size: 14, disp: 1 });
    bar(g, 32, by + 52, 280, vis, 100, vis > 85 ? GRN : vis > 40 ? C.gold : C.red, 'doorway visible past the hero', `${vis}%`);
    text(g, vis < 40 ? 'The hero blocks the destination.' : vis > 85 ? 'Clear: the destination reads past the hero.' : 'Partly covered.', 32, by + 100, { size: 13, col: C.ink });
    text(g, '“Melee centric games tend to desire', 32, by + 128, { size: 12, col: C.muted }); text(g, 'a more of a centered view”', 32, by + 146, { size: 12, col: C.muted });
    text(g, 'Arena you can see (8 m around the hero)', 350, by + 26, { w: 800, size: 14, disp: 1 });
    const mx = Math.max(S.L, S.R, 1);
    bar(g, 350, by + 52, 300, S.L, mx, C.blue, 'left of the hero', `${Math.round(S.L)} m²`);
    bar(g, 350, by + 92, 300, S.R, mx, GRN, 'right of the hero', `${Math.round(S.R)} m²`);
    text(g, S.R > S.L * 1.15 ? `${(S.R / Math.max(S.L, .1)).toFixed(1)}× more to see on the right` : 'about the same on both sides', 350, by + 146, { size: 13, w: 700 });
    text(g, `Enemy circling at ${ORBIT.r} m`, 690, by + 26, { w: 800, size: 14, disp: 1 });
    const tL = S.aL / ORBIT.speed, tR = S.aR / ORBIT.speed;
    bar(g, 690, by + 52, 316, S.aL, 180, F.dir === 'left' ? C.blue : 'rgba(85,98,235,.45)', 'circling left: in view after passing in front', `${S.aL}° · ${tL.toFixed(1)} s`);
    bar(g, 690, by + 92, 316, S.aR, 180, F.dir === 'right' ? GRN : 'rgba(47,174,99,.45)', 'circling right: in view after passing in front', `${S.aR}° · ${tR.toFixed(1)} s`);
    text(g, '“you almost always want to circle right” (Gears, 119)', 690, by + 146, { size: 13, w: 700 });
    return { vis, S };
  }
  const DUR3 = 27;
  function tour3(t) {
    const k = t < 1 ? 0 : t < 6 ? ease((t - 1) / 5) : t < 25 ? 1 : 1 - ease(clamp((t - 25) / 1.5));
    let dir = null, ot = 0, cap = '';
    if (t < 1) cap = 'Centred: the hero covers the doorway';
    else if (t < 6) cap = 'Offset the camera right: the hero slides to the left third';
    else if (t < 8) cap = 'On the third the sight line to the doorway is clear';
    else if (t < 16.5) { dir = 'left'; ot = t - 8; cap = 'Enemy circles left: it leaves the screen quickly'; }
    else if (t < 25) { dir = 'right'; ot = t - 16.5; cap = 'Enemy circles right: more of it stays in view'; }
    else cap = 'Back to centre';
    return { k, dir, ot, cap };
  }
  canvasDemo('thirds', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, k: 0, dir: null, ot: 0, key: '' };
    const tourBtn = $(s, '.fc-tour'), rng = $(s, '.fc-off'), circ = $$(s, '.fc-circ .btn'), out = $(s, '.fc-out');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    rng.oninput = () => { manual(); st.k = +rng.value; };
    circ.forEach(b => b.onclick = () => { manual(); circ.forEach(x => x.classList.toggle('on', x === b)); st.dir = b.dataset.c === 'none' ? null : b.dataset.c; st.ot = 0; });
    const info = (F, r) => {
      const key = [Math.round(F.k * 20), F.dir, r.vis > 85, r.vis < 40].join();
      $(s, '.v-off3').textContent = `${(PRESETS.third.off * F.k).toFixed(2)} m`;
      if (st.tour) rng.value = F.k;
      if (key === st.key) return; st.key = key;
      say(out, F.dir ? `With the camera over the right shoulder the hero sits on the left third, so the screen holds more to the hero’s right. Circling right keeps the enemy in view ${(r.S.aR / Math.max(r.S.aL, 1)).toFixed(1)}× longer after it passes in front.`
        : r.vis < 40 ? 'Centred, the hero’s silhouette sits on the sight line to the doorway. Slide the offset toward the third.'
        : 'On the third the doorway is clear, and the screen to the hero’s right is larger. Now have the enemy circle each way.');
    };
    scenes.thirds = { seek(t) { st.held = true; drawThirds(g, tour3(t)); }, dur: () => DUR3 };
    return dt => {
      if (st.held) return;
      st.t += dt;
      let F;
      if (st.tour) { if (st.t >= DUR3) st.t = 0; F = tour3(st.t); }
      else { st.ot += dt; F = { k: st.k, dir: st.dir, ot: st.ot, cap: '' }; }
      info(F, drawThirds(g, F));
    };
  });

  window.__seek = (t, which = 'tuner') => scenes[which].seek(t);
  window.__dur = (which = 'tuner') => scenes[which].dur();
})();
