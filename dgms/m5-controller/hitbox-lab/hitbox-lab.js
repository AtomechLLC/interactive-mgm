/* Hitbox lab (Module 5, "3 components of well-designed hitboxes"), on a real swing seen from above.
   The swing is No Rest for the Wicked's one-handed axe Combo 1 · A1 (Moon Studios), rendered from the Game Animation
   Library's 3D preview with the game's own weapon hit box: ../img/nrftw/clips.js carries, per frame, the box's 8 corners
   and the body joints in world metres, and the game's frame data says the box is live on frames 33-53 of 118 (60 fps).
   The game is top-down, so every volume is tested where the game tests it: on the ground plane.
   Slide 1 draws the colliders and relabels them per genre (the naming mess, and the course's verb / adjective / noun fix:
   Attack, Attackable, Collision), swaps the attack volume between five shapes built on the axe's long axis, and lets it ride
   the weapon bone or sit in hand-placed keys. Slide 2 plays the seven placement tips as before / after panels on the same
   swing. Every frame is a pure function of time and the options, so window.__seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, TAU } = TD;
  const W = 1040, H = 585, GREEN = '#1a8a4c';
  const K = { atk: '#e5322d', rec: '#2ea3dc', col: '#2fae63', sec: '#8a4fd6' };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  /* ---------- the real swing ---------- */
  const CL = window.NRFTW_CLIPS, SW = CL.combo, ID = CL['idle-r'];
  const N = SW.n, FPS = 30, PER = N / FPS;                  // one loop of the clip, 59 frames at 30 fps
  const HIT = [33, 53], TOTAL = 118;                         // the game's frame data for this move, 60 fps frames
  const gameFrame = i => 2 * i + 1, live = i => gameFrame(i) >= HIT[0] && gameFrame(i) <= HIT[1];
  const FS = -SW.ux[1] / SW.uz[0], HS = -SW.uy[1] / SW.uz[0];   // ground depth and height foreshortening of the camera
  const IMG = {};
  ['combo', 'idle-r'].forEach(k => { const im = new Image(); im.src = `../img/nrftw/${k}.webp`; IMG[k] = im; });
  const ready = im => im && im.complete && im.naturalWidth > 0;
  // world (x, y, z) -> ground (u forward, v toward the camera) plus height h
  const G = p => ({ u: p[2], v: -p[0], h: p[1] });
  const J = (clip, i) => clip.J[clamp(i, 0, clip.n - 1)].map(G);   // hip, chest, head, elbow, hand, offhand, knees, ankles, toes
  const frameAt = t => Math.floor(((t % PER) + PER) % PER * FPS) % N;
  const IDLE_I = ID.n - 1;

  /* ---------- ground-plane geometry ---------- */
  const sub = (a, b) => ({ u: a.u - b.u, v: a.v - b.v }), len = a => Math.hypot(a.u, a.v);
  const mix = (a, b, k) => ({ u: lerp(a.u, b.u, k), v: lerp(a.v, b.v, k), h: lerp(a.h || 0, b.h || 0, k) });
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a.u - b.u || a.v - b.v), cr = (o, a, b) => (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
    const lo = [], up = [];
    for (const q of p) { while (lo.length > 1 && cr(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (up.length > 1 && cr(up.at(-2), up.at(-1), q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function segDist(p, a, b) {
    const ab = sub(b, a), L2 = ab.u * ab.u + ab.v * ab.v || 1e-9, k = clamp(((p.u - a.u) * ab.u + (p.v - a.v) * ab.v) / L2);
    return Math.hypot(p.u - a.u - ab.u * k, p.v - a.v - ab.v * k);
  }
  function inPoly(poly, p) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.v > p.v) !== (b.v > p.v) && p.u < (b.u - a.u) * (p.v - a.v) / (b.v - a.v) + a.u) inside = !inside;
    }
    return inside;
  }
  const polyHits = (poly, c, r) => inPoly(poly, c) || poly.some((a, i) => segDist(c, a, poly[(i + 1) % poly.length]) <= r);
  // a volume against a round receiver (a capsule seen from above is a circle)
  function hits(vol, c, r) {
    if (vol.kind === 'sphere') return len(sub(vol.c, c)) <= vol.r + r;
    if (vol.kind === 'capsule') return segDist(c, vol.a, vol.b) <= vol.r + r;
    return polyHits(vol.poly, c, r);
  }
  function rect(a, b, w) {
    const d = sub(b, a), L = len(d) || 1, n = { u: -d.v / L * w, v: d.u / L * w };
    return [{ u: a.u + n.u, v: a.v + n.v }, { u: b.u + n.u, v: b.v + n.v }, { u: b.u - n.u, v: b.v - n.v }, { u: a.u - n.u, v: a.v - n.v }];
  }

  /* ---------- the attack volume for a scene at clip frame i ---------- */
  // hand-placed keys (Skullgirls style): the designer keys three poses across the live window and each one holds
  const KEYS = [17, 20, 23];
  const keyFrame = i => KEYS[Math.min(2, Math.floor(clamp((gameFrame(i) - HIT[0]) / (HIT[1] - HIT[0] + 1), 0, .999) * 3))];
  function attackVol(sc, i) {
    const k = sc.mode === 'manual' ? keyFrame(i) : i, w3 = SW.W[k], P = w3.map(G);
    let a = P[8], b = P[9];
    const pad = sc.pad || 1, w = (sc.w ?? .3) * pad;
    if (sc.s0 === 'mid') a = mix(a, b, .55);
    if (sc.s0 === 'chest') a = J(SW, k)[1];
    if (pad !== 1) { const d = sub(b, a), L = len(d) || 1; b = { u: b.u + d.u / L * .18 * (pad - 1), v: b.v + d.v / L * .18 * (pad - 1), h: b.h }; }
    const hs = w3.slice(0, 8).map(p => p[1]), height = [Math.min(...hs), Math.max(...hs)];
    let v;
    if (sc.shape === 'sphere') v = { kind: 'sphere', c: mix(a, b, .5), r: len(sub(b, a)) / 2 + w * .3 };
    else if (sc.shape === 'capsule') v = { kind: 'capsule', a, b, r: w };
    else if (sc.shape === 'cylinder') v = { kind: 'cylinder', poly: rect(a, b, w), a, b, r: w };
    else if (sc.shape === 'cone') { const d = sub(b, a), L = len(d) || 1, n = { u: -d.v / L * w * 2.3, v: d.u / L * w * 2.3 }; v = { kind: 'cone', poly: [a, { u: b.u + n.u, v: b.v + n.v }, { u: b.u - n.u, v: b.v - n.v }], a, b, r: w }; }
    else v = { kind: 'box', poly: sc.s0 || pad !== 1 || sc.w ? rect(a, b, w) : hull(P.slice(0, 8)), a, b, r: w, corners: sc.s0 || pad !== 1 || sc.w ? null : P.slice(0, 8) };
    v.height = height;
    return v;
  }
  const sweetVol = i => { const P = SW.W[i].map(G); return { kind: 'sphere', c: mix(P[8], P[9], .92), r: .2 }; };

  /* ---------- receivers: circles on the ground (centre, radius) ---------- */
  const R_BODY = { normal: .42, core: .27, loose: .68 };
  function playerRecv(sc, i) {
    const clip = sc.swing === false ? ID : SW, j = J(clip, sc.swing === false ? IDLE_I : i);
    if (sc.pRecv === 'limbs') return j.map((p, n) => ({ c: p, r: n === 2 ? .16 : .12 }));
    return [{ c: { u: j[0].u, v: j[0].v }, r: R_BODY[sc.pRecv || 'normal'] }];
  }
  // the enemy: the same knight, facing back toward the player, standing at (u, v)
  function enemyJ(e) { return J(ID, IDLE_I).map(p => ({ u: e.u - p.u, v: e.v + p.v, h: p.h })); }
  function enemyRecv(e) {
    if (e.low) return [{ c: { u: e.u, v: e.v }, r: .4 }];
    if (e.recv === 'limbs') return enemyJ(e).map((p, n) => ({ c: p, r: n === 2 ? .16 : .12 }));
    return [{ c: { u: e.u, v: e.v }, r: e.recv === 'huge' ? 1.3 : .45 }];
  }
  const footOf = j => mix(j[8], j[9], .5);

  // first clip frame in the live window where the attack touches the enemy (cached per scene)
  const cache = new Map();
  function firstHit(sc, sweet) {
    const key = JSON.stringify(sc) + sweet; if (cache.has(key)) return cache.get(key);
    let at = -1;
    for (let i = 0; i < N && at < 0; i++) {
      if (!live(i)) continue;
      const v = sweet ? sweetVol(i) : attackVol(sc, i);
      if (sc.enemy.low && !sc.projected && attackVol(sc, i).height[0] > sc.enemy.low) continue;   // the blade passes over it in 3D
      if (enemyRecv(sc.enemy).some(q => hits(v, q.c, q.r))) at = i;
    }
    cache.set(key, at); return at;
  }

  /* ---------- drawing ---------- */
  function view(ox, oy, M) { return (p, h = p.h || 0) => [ox + p.u * M, oy + p.v * M * FS - h * M * HS]; }
  function sprite(g, clip, i, x, y, M, flip, filter) {
    const im = IMG[clip === SW ? 'combo' : 'idle-r']; if (!ready(im)) return;
    const s = M / clip.uz[0], sx = (i % clip.cols) * clip.cw, sy = Math.floor(i / clip.cols) * clip.ch;
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); if (filter) g.filter = filter;
    g.drawImage(im, sx, sy, clip.cw, clip.ch, -clip.ax * s, -clip.ay * s, clip.cw * s, clip.ch * s);
    g.restore();
  }
  function ground(g, x, y, w, h) {
    g.fillStyle = '#80915f'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (let k = x + 20; k < x + w; k += 40) { g.beginPath(); g.moveTo(k, y); g.lineTo(k, y + h); g.stroke(); }
    for (let k = y + 20; k < y + h; k += 32) { g.beginPath(); g.moveTo(x, k); g.lineTo(x + w, k); g.stroke(); }
  }
  function circle(g, P, M, c, r, col, a = 1, dash = false, fill = true) {
    const [x, y] = P(c, 0); g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = 2.5; if (dash) g.setLineDash([7, 5]);
    g.beginPath(); g.ellipse(x, y, r * M, r * M * FS, 0, 0, TAU); if (fill) { g.fillStyle = rgba(col, .2); g.fill(); } g.stroke(); g.restore();
  }
  function drawVol(g, P, M, v, col, a = 1, dash = false) {
    g.save(); g.globalAlpha *= a; g.fillStyle = rgba(col, .26); g.strokeStyle = col; g.lineWidth = 2.5; if (dash) g.setLineDash([7, 5]);
    g.beginPath();
    if (v.kind === 'sphere') { const [x, y] = P(v.c, 0); g.ellipse(x, y, v.r * M, v.r * M * FS, 0, 0, TAU); }
    else if (v.kind === 'capsule') {
      // the ground outline of a capsule: two end caps joined
      const d = sub(v.b, v.a), L = len(d) || 1, n = { u: -d.v / L * v.r, v: d.u / L * v.r }, steps = 14, pts = [];
      const ang0 = Math.atan2(n.v, n.u);
      for (let s = 0; s <= steps; s++) { const an = ang0 + Math.PI * s / steps; pts.push({ u: v.b.u + Math.cos(an) * v.r, v: v.b.v + Math.sin(an) * v.r }); }
      for (let s = 0; s <= steps; s++) { const an = ang0 + Math.PI + Math.PI * s / steps; pts.push({ u: v.a.u + Math.cos(an) * v.r, v: v.a.v + Math.sin(an) * v.r }); }
      pts.forEach((p, k) => { const [x, y] = P(p, 0); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
    } else v.poly.forEach((p, k) => { const [x, y] = P(p, 0); k ? g.lineTo(x, y) : g.moveTo(x, y); }), g.closePath();
    g.fill(); g.stroke(); g.restore();
  }
  // the real 3D hit box in the air, as a thin wireframe above its footprint
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  function wire3d(g, P, corners, col, a) {
    g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = 1.5;
    EDGES.forEach(([p, q]) => { const A = P(corners[p]), B = P(corners[q]); g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.stroke(); });
    g.setLineDash([3, 4]); g.globalAlpha *= .6;
    [0, 2, 4, 6].forEach(k => { const A = P(corners[k]), B = P(corners[k], 0); g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.stroke(); });
    g.restore();
  }
  function spark(g, x, y, k) {
    if (k <= 0) return;
    g.save(); g.globalAlpha = k; g.strokeStyle = C.gold; g.lineWidth = 4; g.lineCap = 'round';
    for (let n = 0; n < 8; n++) { const a = n * TAU / 8, r0 = 8 + (1 - k) * 10, r1 = 22 + (1 - k) * 26; g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke(); }
    g.restore();
  }
  function blob(g, P, M, e, flash) {
    const [x, y] = P({ u: e.u, v: e.v }, 0), r = .4 * M, hh = e.low * M * HS;
    g.fillStyle = 'rgba(30,25,15,.3)'; g.beginPath(); g.ellipse(x, y, r, r * FS, 0, 0, TAU); g.fill();
    g.fillStyle = flash ? '#f2c6b4' : '#7d4a8f'; g.beginPath(); g.ellipse(x, y - hh / 2, r * .9, hh / 2 + r * FS * .6, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 10, y - hh * .7, 5, 0, TAU); g.arc(x + 8, y - hh * .7, 5, 0, TAU); g.fill();
    g.fillStyle = '#20124d'; g.beginPath(); g.arc(x - 11, y - hh * .7, 2.4, 0, TAU); g.arc(x + 7, y - hh * .7, 2.4, 0, TAU); g.fill();
  }

  /* ---------- one scene: knight, enemy, colliders, outcome; (ox, oy) is the knight's feet on the canvas, M px per metre ---------- */
  function scene(g, sc, i, ox, oy, M, o = {}) {
    const P = view(ox, oy, M), swing = sc.swing !== false, act = swing && live(i);
    const hitAt = sc.enemy ? firstHit(sc, false) : -1, sweetAt = sc.sweet ? firstHit(sc, true) : -1;
    const landed = hitAt >= 0 && i >= hitAt, hk = landed ? clamp(1 - (i - hitAt) / 6) : 0;
    const v = swing ? attackVol(sc, i) : null;
    // on the ground: receivers, collision, the attack footprint
    const pj = J(swing ? SW : ID, swing ? i : IDLE_I);
    if (o.boxes !== false) {
      if (o.collision) { circle(g, P, M, footOf(pj), .34, K.col, .9, true, false); if (sc.enemy && !sc.enemy.low) circle(g, P, M, footOf(enemyJ(sc.enemy)), .34, K.col, .7, true, false); }
      if (v && act) drawVol(g, P, M, v, K.atk);
      else if (v && o.ghost) drawVol(g, P, M, v, K.atk, .3, true);
      if (sc.sweet && swing) { const sv = sweetVol(i); if (act) drawVol(g, P, M, sv, K.sec); else if (o.ghost) drawVol(g, P, M, sv, K.sec, .3, true); }
    }
    // the knights, back to front
    const drawEnemy = () => {
      if (!sc.enemy) return;
      if (sc.enemy.low) return blob(g, P, M, sc.enemy, hk > 0);
      const [x, y] = P({ u: sc.enemy.u, v: sc.enemy.v }, 0);
      sprite(g, ID, IDLE_I, x + hk * 8, y, M, true, hk > 0 ? 'brightness(1.5) sepia(.7) hue-rotate(-35deg) saturate(2.2)' : 'sepia(.7) hue-rotate(-35deg) saturate(2.2) brightness(.8)');
    };
    const drawHero = () => sprite(g, swing ? SW : ID, swing ? i : IDLE_I, ox, oy, M, false);
    if (sc.enemy && sc.enemy.v < 0) { drawEnemy(); drawHero(); } else { drawHero(); drawEnemy(); }
    // outlines over the art, so the volumes read on top of the bodies
    if (o.boxes !== false) {
      if (sc.enemy) enemyRecv(sc.enemy).forEach(q => circle(g, P, M, q.c, q.r, K.rec, .95, false, false));
      playerRecv(sc, i).forEach(q => circle(g, P, M, q.c, q.r, K.rec, .95, false, false));
      if (v && act) { drawVol(g, P, M, v, K.atk, .9); if (o.wire && v.corners) wire3d(g, P, SW.W[sc.mode === 'manual' ? keyFrame(i) : i].map(G), K.atk, .8); }
    }
    let bulletHit = false;
    if (sc.bullet) {
      // an arrow crosses at shoulder height, just past the knight's far shoulder
      const k = clamp((i - 6) / 40), b = { u: lerp(3.2, -2.4, k), v: -.5 }, [bx, by] = P(b, 1.4);
      const recv = playerRecv(sc, i)[0], hitK = (() => { for (let n = 6; n <= i; n++) { const bb = { u: lerp(3.2, -2.4, clamp((n - 6) / 40)), v: -.5 }; if (len(sub(bb, recv.c)) <= recv.r + .04) return n; } return -1; })();
      if (hitK < 0 || i - hitK < 2) { g.strokeStyle = '#5b3a1e'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 34, by); g.stroke(); g.fillStyle = '#c8ccd8'; g.beginPath(); g.moveTo(bx - 8, by); g.lineTo(bx + 2, by - 5); g.lineTo(bx + 2, by + 5); g.fill(); }
      const [sx, sy] = P(b, 0); g.fillStyle = 'rgba(30,25,15,.25)'; g.beginPath(); g.ellipse(sx, sy, 14, 4, 0, 0, TAU); g.fill();
      if (hitK >= 0) { const [hx, hy] = P(recv.c, 1.4); spark(g, hx, hy, clamp(1 - (i - hitK) / 6)); if (i < N - 3) T.stamp(o.hitText || 'Hit', hx, hy - 70, C.red, clamp((i - hitK) / 3), 22); bulletHit = true; }
      else if (b.u < recv.c.u - .5 && i < N - 3) T.stamp(o.missText || 'Graze', ox, oy - 2.2 * M * HS - 20, GREEN, 1, 22);
    }
    if (sc.enemy) {
      const [ex, ey] = P({ u: sc.enemy.u, v: sc.enemy.v }, sc.enemy.low ? sc.enemy.low * .6 : 1.1), sweet = sweetAt >= 0 && landed;
      if (landed) spark(g, ex, ey, hk);
      const sy = ey - (sc.enemy.low ? 46 : 92);
      if (landed && i < N - 4) T.stamp(sweet ? (o.sweetText || 'Sweet spot') : (o.hitText || 'Hit'), ex, sy, sweet ? K.sec : C.red, clamp((i - hitAt) / 3), 22);
      if (!landed && gameFrame(i) > HIT[1] && i < N - 4) T.stamp(o.missText || 'Miss', ex, sy, C.muted, clamp((gameFrame(i) - HIT[1]) / 6), 22);
    }
    return { landed, P, v, pj, bulletHit };
  }

  /* ---------- tiny 3D wireframe preview of the attack shape ---------- */
  function wire(g, kind, cx, cy, sc, t) {
    const ry = t * .7, rx = .38, segs = [];
    const ring = (x, r, n = 20) => { const p = []; for (let i = 0; i <= n; i++) { const a = i * TAU / n; p.push([x, Math.cos(a) * r, Math.sin(a) * r]); } segs.push(p); };
    if (kind === 'box') { const a = .9, b = .38, c = [[-a, -b, -b], [a, -b, -b], [a, b, -b], [-a, b, -b], [-a, -b, b], [a, -b, b], [a, b, b], [-a, b, b]];
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([i, j]) => segs.push([c[i], c[j]])); }
    if (kind === 'sphere') { for (let k = 0; k < 3; k++) { const p = []; for (let i = 0; i <= 28; i++) { const a = i * TAU / 28, v = [Math.cos(a) * .75, Math.sin(a) * .75, 0]; p.push(k === 0 ? v : k === 1 ? [v[0], 0, v[1]] : [0, v[0], v[1]]); } segs.push(p); } }
    if (kind === 'cylinder') { ring(-.9, .38); ring(.9, .38); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; segs.push([[-.9, Math.cos(a) * .38, Math.sin(a) * .38], [.9, Math.cos(a) * .38, Math.sin(a) * .38]]); } }
    if (kind === 'capsule') { ring(-.6, .38); ring(.6, .38); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; segs.push([[-.6, Math.cos(a) * .38, Math.sin(a) * .38], [.6, Math.cos(a) * .38, Math.sin(a) * .38]]);
        [-1, 1].forEach(sg => { const p = []; for (let j = 0; j <= 10; j++) { const b = j / 10 * Math.PI / 2; p.push([sg * (.6 + Math.sin(b) * .38), Math.cos(b) * .38 * Math.cos(a), Math.cos(b) * .38 * Math.sin(a)]); } segs.push(p); }); } }
    if (kind === 'cone') { ring(.9, .55); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; segs.push([[-.9, 0, 0], [.9, Math.cos(a) * .55, Math.sin(a) * .55]]); } }
    const pr = ([x, y, z]) => { const x1 = x * Math.cos(ry) + z * Math.sin(ry), z1 = -x * Math.sin(ry) + z * Math.cos(ry); const y1 = y * Math.cos(rx) - z1 * Math.sin(rx); return [cx + x1 * sc, cy + y1 * sc]; };
    g.strokeStyle = K.atk; g.lineWidth = 2; g.lineJoin = 'round';
    segs.forEach(p => { g.beginPath(); p.forEach((v, i) => { const [x, y] = pr(v); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); });
  }

  const panel = (g, x, y, w, h, fill = 'rgba(255,252,244,.85)') => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); };
  const text = (g, s, x, y, { size = 14, col = C.ink, w = 600, align = 'left', font = 'Jost' } = {}) => { g.font = `${w} ${size}px ${font}, Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  function wrap(g, s, x, y, maxW, lh, o = {}) {
    g.font = `${o.w || 500} ${o.size || 14}px Jost, sans-serif`; const words = s.split(' '); let line = '', yy = y;
    words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { text(g, line, x, yy, o); line = wd; yy += lh; } else line = t; });
    if (line) text(g, line, x, yy, o); return yy;
  }
  function credit(g, x, y, align = 'left') { text(g, 'No Rest for the Wicked © Moon Studios · via Game Animation Library', x, y, { size: 11, w: 600, col: 'rgba(255,255,255,.92)', align }); }
  // the move's frame bar: startup, live window, recovery, and the frame on show
  function frameBar(g, x, y, w, i) {
    const sx = f => x + w * f / TOTAL;
    g.fillStyle = '#e6dcc5'; g.fillRect(x, y, w, 10); g.fillStyle = rgba(K.atk, .85); g.fillRect(sx(HIT[0]), y, sx(HIT[1] + 1) - sx(HIT[0]), 10);
    g.fillStyle = C.navy; g.fillRect(sx(gameFrame(i)) - 2, y - 5, 4, 20);
    text(g, 'startup', x, y - 6, { size: 12, col: C.muted }); text(g, `live: frames ${HIT[0]}–${HIT[1]}`, sx(HIT[0]), y - 6, { size: 12, col: K.atk, w: 700 });
    text(g, `frame ${gameFrame(i)} of ${TOTAL}`, x + w, y - 6, { size: 12, col: C.muted, align: 'right' });
  }

  /* ---------- slide 1: the lab ---------- */
  const GENRES = {
    fps: { name: 'FPS', atk: 'attackbox', rec: 'hitbox', col: 'collision capsule', note: 'In shooters the hitbox is what gets shot: it receives damage.' },
    fight: { name: 'Fighting', atk: 'hitbox', rec: 'hurtbox', col: 'pushbox', note: 'In fighting games the hitbox deals damage, and the hurtbox receives it.' },
    action: { name: 'Action', atk: 'attack collision', rec: 'damage collision', col: 'body collision', note: 'Action games call all of it collision, and qualify each one.' },
    course: { name: 'Course', atk: 'Attack', rec: 'Attackable', col: 'Collision', note: 'The fix is a verb, an adjective and a noun: Attack hits, Attackable gets hit, Collision blocks movement.' },
  };
  const SHAPES = { box: 'Box', sphere: 'Sphere', capsule: 'Capsule', cylinder: 'Cylinder', cone: 'Cone' };
  const SHAPE_NOTE = {
    box: 'The box is the game’s own: No Rest for the Wicked puts one box on the axe’s hand socket.',
    sphere: 'Spheres are the cheapest test of all, but an axe is long and thin.',
    capsule: 'Capsules fit limbs and blades, and are the default for 3D bodies.',
    cylinder: 'Cylinders have flat ends: useful for columns and area attacks.',
    cone: 'Cones suit breath, shotgun spread and sweeping arcs from a point.',
  };
  const LAB = { ox: 250, oy: 318, M: 112, enemy: { u: 1.5, v: .1 } };
  function drawLab(g, st, t) {
    T.use(g); g.clearRect(0, 0, W, H); panel(g, 0, 0, W, H);
    const i = frameAt(t), gn = GENRES[st.genre];
    const sc = { mode: st.bone ? 'bone' : 'manual', shape: st.shape, enemy: LAB.enemy, pRecv: 'normal' };
    g.save(); g.beginPath(); g.roundRect(12, 40, 666, 486, 12); g.clip(); ground(g, 12, 40, 666, 486);
    const o = scene(g, sc, i, LAB.ox, LAB.oy, LAB.M, { collision: true, ghost: true, wire: true });
    // labels on the three kinds of collider
    const P = o.P, lab = (s1, x, y, col, lx, ly) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke(); T.label(s1, x, y, 'center', col, 15); };
    if (o.v && live(i)) { const c = o.v.kind === 'sphere' ? o.v.c : mix(o.v.a, o.v.b, .6), [x, y] = P(c, 0); lab(gn.atk, clamp(x + 40, 90, 600), clamp(y + 70, 80, 500), K.atk, x, y); }
    const pr = playerRecv(sc, i)[0], [px, py] = P({ u: pr.c.u - pr.r, v: pr.c.v }, 0); lab(gn.rec, px - 86, py + 14, K.rec, px, py);
    const [fx, fy] = P(mix(footOf(o.pj), { u: 0, v: .34 }, 1), 0); lab(gn.col, fx + 10, fy + 74, K.col, fx, fy);
    const [ex, ey] = P({ u: LAB.enemy.u + .45, v: LAB.enemy.v }, 0); lab(gn.rec, ex + 70, ey + 60, K.rec, ex, ey);
    credit(g, 24, 516);
    g.restore();
    text(g, st.bone ? 'Rides the weapon bone, frame by frame (the game’s own way)' : 'Hand-placed keys: three poses, each held (Skullgirls style)', 24, 28, { size: 15, w: 700 });
    frameBar(g, 24, 556, 640, i);
    // right column: 3D preview and the naming table
    const rx = 700, rw = 324;
    panel(g, rx, 16, rw, 214, '#efe6d2');
    text(g, `${SHAPES[st.shape]} in 3D`, rx + 14, 40, { size: 15, w: 800, font: 'Montserrat' });
    text(g, 'Tested by its outline on the ground', rx + 14, 58, { size: 12, col: C.muted });
    wire(g, st.shape, rx + rw / 2, 142, 88, t);
    panel(g, rx, 244, rw, 325, '#efe6d2');
    text(g, 'The naming mess', rx + 14, 268, { size: 15, w: 800, font: 'Montserrat' });
    const cols = ['fps', 'fight', 'action', 'course'], cw = 64, c0 = rx + 66;
    cols.forEach((k, n) => {
      const x = c0 + n * cw;
      if (k === st.genre) { g.fillStyle = 'rgba(255,185,81,.45)'; g.beginPath(); g.roundRect(x - 2, 280, cw - 2, 228, 8); g.fill(); }
      text(g, GENRES[k].name, x + cw / 2 - 2, 298, { size: 12, w: 700, align: 'center' });
    });
    [['atk', 'deals', K.atk], ['rec', 'takes', K.rec], ['col', 'blocks', K.col]].forEach(([r, verb, col], j) => {
      const y = 330 + j * 62;
      g.fillStyle = col; g.beginPath(); g.roundRect(rx + 12, y - 12, 14, 14, 3); g.fill();
      text(g, verb, rx + 32, y, { size: 12, col: C.muted, w: 700 });
      cols.forEach((k, n) => { const words = GENRES[k][r].split(' '); words.forEach((wd, m) => text(g, wd, c0 + n * cw + cw / 2 - 2, y + m * 15, { size: 12, w: k === st.genre ? 700 : 500, align: 'center', col: k === st.genre ? C.ink : C.muted })); });
    });
    wrap(g, gn.note, rx + 14, 528, rw - 28, 17, { size: 13, w: 600 });
    return o;
  }
  // walk-through: genres, then shapes on the bone, then hand-placed keys against the bone, each over whole swings
  const LAB_STEPS = [['fps', 'box', true], ['fight', 'box', true], ['action', 'box', true], ['course', 'box', true],
    ['course', 'sphere', true], ['course', 'capsule', true], ['course', 'cylinder', true], ['course', 'cone', true], ['course', 'box', false], ['course', 'box', true]];
  const LAB_DUR = PER * LAB_STEPS.length;
  function labTour(st, t) {
    const k = Math.min(LAB_STEPS.length - 1, Math.floor(t / PER)); [st.genre, st.shape, st.bone] = LAB_STEPS[k];
    if (k < 4) return 'The same red box, four names: watch the word hitbox change sides.';
    if (k < 8) return 'Five shapes on the same axe: each one is tested by its outline on the ground.';
    return st.bone ? 'Riding the bone: the box follows the axe on every frame.' : 'Hand-placed: three keyed poses, each held until the next.';
  }

  const scenes = {};
  canvasDemo('lab', (s, cv, g) => {
    const st = { genre: 'course', shape: 'box', bone: true, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.hb-tour'), bone = $(s, '.hb-bone');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    $$(s, '.hb-genre .btn').forEach(b => b.onclick = () => { manual(); st.genre = b.dataset.g; });
    $$(s, '.hb-shape .btn').forEach(b => b.onclick = () => { manual(); st.shape = b.dataset.s; });
    bone.onchange = () => { manual(); st.bone = bone.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame(t) {
      let cap = null;
      if (st.tour) cap = labTour(st, t);
      const o = drawLab(g, st, t);
      if (cap) T.label(cap, 345, 64, 'center', '#fff', 15, C.navy);
      const key = [st.genre, st.shape, st.bone, o.landed].join();
      if (key === st.key) return; st.key = key;
      $$(s, '.hb-genre .btn').forEach(b => b.classList.toggle('on', b.dataset.g === st.genre));
      $$(s, '.hb-shape .btn').forEach(b => b.classList.toggle('on', b.dataset.s === st.shape));
      bone.checked = st.bone;
      const gn = GENRES[st.genre];
      say($(s, '.hb-stats'), `<div class="r"><b style="font-size:20px;min-width:0">${gn.atk}</b><span>the red volume, in ${gn.name === 'Course' ? 'the course' : gn.name + ' games'}</span></div>`
        + `<div><b style="font-size:20px;min-width:0">${gn.rec}</b><span>the blue receivers</span></div>`);
      say($(s, '.hb-out'), `${SHAPE_NOTE[st.shape]} ${st.bone ? 'On the bone it follows the axe exactly, with no authoring per frame.' : 'Hand-placed keys jump between poses but give exact control of each frame (Skullgirls).'}`);
    }
    scenes.lab = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => LAB_DUR };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); if (st.tour && st.t >= LAB_DUR) st.t = 0; frame(st.t); };
  });

  /* ---------- slide 2: seven tips, before and after ---------- */
  const base = { mode: 'bone', shape: 'capsule', pRecv: 'normal' };
  const TIPS = [
    { name: 'Extend attacks inside the character',
      before: { ...base, s0: 'mid', enemy: { u: .95, v: .2 } }, after: { ...base, s0: 'chest', enemy: { u: .95, v: .2 } },
      bt: 'The volume starts halfway up the axe. An enemy standing in close is missed.',
      at: 'The volume reaches back inside the body, so there is no gap to stand in.' },
    { name: 'Make player-favourable volumes a bit too big',
      before: { ...base, w: .1, enemy: { u: 3.0, v: 0 } }, after: { ...base, w: .1, pad: 2.6, enemy: { u: 3.0, v: 0 } },
      bt: 'A volume the exact size of the axe. The swing looked like it connected, and missed by a hair.',
      at: 'The player’s attack is a little bigger than the axe, so near misses land.' },
    { name: 'Make attackable areas smaller (arrow grazing)',
      before: { ...base, swing: false, pRecv: 'loose', bullet: true }, after: { ...base, swing: false, pRecv: 'core', bullet: true },
      bt: 'The receiver covers more than the body. An arrow that visibly missed still hits.',
      at: 'A smaller receiver lets the arrow graze past, and the near miss feels earned.', hitText: 'Hit', missText: 'Graze' },
    { name: 'Use secondary boxes for special interactions',
      before: { ...base, enemy: { u: 2.2, v: 0 } }, after: { ...base, sweet: true, enemy: { u: 2.2, v: 0 } },
      bt: 'One attack volume, so every hit is the same hit.',
      at: 'A secondary volume on the axe head marks a sweet spot. Throws, grabs and parries get their own volumes too.' },
    { name: 'Keep attacks and receivers proportional',
      before: { ...base, enemy: { u: 3.2, v: 0, recv: 'huge' } }, after: { ...base, enemy: { u: 3.2, v: 0 } },
      bt: 'The receiver is far bigger than the body, so a swing that visibly falls short still connects.',
      at: 'Sized to the body and the weapon, the result matches what the player sees.', missText: 'Out of reach' },
    { name: 'Keep it simple',
      before: { ...base, pRecv: 'limbs', enemy: { u: 1.5, v: 0, recv: 'limbs' } }, after: { ...base, shape: 'box', enemy: { u: 1.5, v: 0 } },
      bt: 'Two dozen colliders to author and keep in sync, for the same hit.',
      at: 'Boxes in 2D, capsules in 3D: one per body, and the same predictable hit.' },
    { name: 'Project 3D volumes to the ground plane',
      before: { ...base, shape: 'box', enemy: { u: 1.45, v: .1, low: .35 }, projected: false }, after: { ...base, shape: 'box', enemy: { u: 1.45, v: .1, low: .35 }, projected: true },
      bt: 'Seen from above the swing covers the low enemy, but in 3D the axe passes over its head.',
      at: 'Tested on the ground plane, height stops mattering, and what you see from above is what hits.' },
  ];
  const TIP_LEN = PER * 2, TIP_DUR = TIP_LEN * TIPS.length;
  function heightStrip(g, sc, i, x, y, w) {
    const v = attackVol(sc, i), hm = 2.2, sy = h => y + 62 - h / hm * 52;
    g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(x, y, w, 72, 8); g.fill();
    text(g, 'Seen from the side (height)', x + 10, y + 15, { size: 11, col: C.muted, w: 700 });
    g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 8, sy(0)); g.lineTo(x + w - 8, sy(0)); g.stroke();
    g.fillStyle = rgba(K.rec, .45); g.fillRect(x + w * .62, sy(sc.enemy.low), 40, sy(0) - sy(sc.enemy.low));
    text(g, `enemy ${sc.enemy.low} m`, x + w * .62 + 46, sy(sc.enemy.low / 2) + 4, { size: 11, w: 700, col: '#0f4f73' });
    if (live(i)) { g.fillStyle = rgba(K.atk, .45); g.strokeStyle = K.atk; g.lineWidth = 2; g.beginPath(); g.rect(x + w * .3, sy(v.height[1]), w * .4, sy(v.height[0]) - sy(v.height[1])); g.fill(); g.stroke();
      text(g, `axe ${v.height[0].toFixed(2)}–${v.height[1].toFixed(2)} m`, x + w * .3 - 6, sy((v.height[0] + v.height[1]) / 2) + 4, { size: 11, w: 700, col: K.atk, align: 'right' }); }
    if (sc.projected) { g.fillStyle = rgba(K.atk, .1); g.fillRect(x + 4, y + 20, w - 8, 46); text(g, 'flattened: height ignored', x + w - 10, y + 15, { size: 11, col: K.atk, w: 700, align: 'right' }); }
  }
  function drawTips(g, k, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    const tip = TIPS[k], i = frameAt(t), pw = 512, ph = 490;
    [['Before', tip.before, tip.bt], ['After', tip.after, tip.at]].forEach(([nm, sc, cap], n) => {
      const x = n * (pw + 16);
      panel(g, x, 0, pw, ph);
      g.save(); g.beginPath(); g.roundRect(x, 0, pw, ph, 14); g.clip();
      ground(g, x, 44, pw, ph - 44);
      const M = sc.enemy && sc.enemy.u > 2.5 ? 74 : 96, ox = x + (sc.enemy && sc.enemy.u > 2.5 ? 150 : 200), oy = sc.enemy && sc.enemy.low ? 250 : 288;
      scene(g, sc, i, ox, oy, M, { hitText: tip.hitText, missText: tip.missText, ghost: true });
      if (sc.enemy && sc.enemy.low) heightStrip(g, sc, i, x + 12, 392, pw - 24);
      if (k === 5) text(g, `${playerRecv(sc, i).length + (sc.enemy ? enemyRecv(sc.enemy).length : 0) + 1} colliders`, x + pw - 16, 76, { size: 20, w: 800, align: 'right', font: 'Montserrat', col: n ? GREEN : C.red });
      credit(g, x + pw - 12, ph - 10, 'right');
      g.restore();
      text(g, nm, x + 16, 32, { size: 20, w: 800, font: 'Montserrat', col: n ? GREEN : C.red });
      wrap(g, cap, x + 16, ph + 26, pw - 32, 20, { size: 16, w: 600 });
    });
  }
  canvasDemo('tips', (s, cv, g) => {
    const st = { k: 0, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.hb-ttour'), btns = $$(s, '.hb-tips .btn');
    btns.forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.k = +b.dataset.k; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame(t) {
      if (st.tour) st.k = Math.min(TIPS.length - 1, Math.floor(t / TIP_LEN));
      drawTips(g, st.k, st.tour ? t % TIP_LEN : t);
      if (st.key === st.k) return; st.key = st.k;
      btns.forEach(b => b.classList.toggle('on', +b.dataset.k === st.k));
      const tp = TIPS[st.k];
      say($(s, '.hb-tout'), `<b>${tp.name}.</b> Before: ${tp.bt} After: ${tp.at}`);
    }
    scenes.tips = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => TIP_DUR };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); if (st.tour && st.t >= TIP_DUR) st.t = 0; frame(st.t); };
  });

  // for checks: which tip panels land
  window.__hbCheck = () => TIPS.map(tp => [tp.name, tp.before.enemy ? firstHit(tp.before, false) : null, tp.after.enemy ? firstHit(tp.after, false) : null, tp.after.sweet ? firstHit(tp.after, true) : null]);
  window.__hbHit = (sc, sweet = false) => firstHit(sc, sweet);
  window.__seek = (t, which = 'lab') => scenes[which].seek(t);
  window.__dur = (which = 'lab') => scenes[which].dur();
})();
