/* Clipping and occlusion lab (Module 6, 3Cs: Camera, slides 233-251).
   A "map + view" widget. The left half is a top-down map of a corner room (a hallway, a pillar, a tree, and a corner
   with a low ceiling); the right half is the third-person view, drawn by the small software renderer below
   (perspective projection, near-plane clipping, a depth buffer, so a camera that ends up inside a wall really shows
   the inside of that wall, and dithering is real screen-door transparency).
   The model: a scripted hero path (PATH_MAIN, PATH_FIGHT) gives, at each time, the hero's position and facing and the
   player's camera yaw and pitch. simulate() runs a camera rig over that path at 30 Hz with a chosen set of solutions:
     col   collision: cast the arm from the anchor, stop it short of the hit (the push toward the anchor, which can jump)
     pred  prediction: feeler rays fanned around the arm shorten it smoothly before the arm itself hits anything
     quant pitch quantizer: arm length is a function of pitch (shorter looking up from low, and looking down from high)
     hall  hallway pull-in: side rays measure the space; a narrow space brings the camera closer
     res   collision resolve point: in the low-ceiling corner volume the camera resolves toward a placed point
     up    the old approach: when blocked, rotate the arm up over the head (jitters under a low ceiling)
     dith  dithering: occluders that can fade (pillar, tree) are screen-door faded instead of moving the camera
   and counts "frames hero fully hidden" and "frames camera inside geometry" (and, in combat, "frames enemy lost").
   Each run is a pure function of (path, solutions, arm distance, combat), cached, so __seek(t) is deterministic.
   All tunable rules live in RULES; the room is BOXES, CANOPY and RESOLVE; the paths are key tables. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585, HZ = 30, DT = 1 / HZ, DEG = Math.PI / 180;

  const RULES = {
    anchorZ: 1.5,            // the anchor point the arm pivots around (head / neck height, m)
    dist: 4,                 // default arm length (m)
    hfov: 65,                // horizontal field of view (deg), same for every view
    near: 0.05,              // near plane (m)
    radius: 0.22,            // the camera is cast as a sphere of this radius (collision, feelers, push-up)
    colMargin: 0.05, colMin: 0.3,               // collision: stop this far before the hit, never shorter than this
    feelers: [[0, .85], [22, .75], [-22, .75], [45, .5], [-45, .5]],   // prediction feelers: [yaw offset deg, weight]
    feelLen: 1.15, predMargin: 0.25, predRate: 5, predMin: 0.6,        // feelers reach 115% of the arm; ease rate (1/s)
    quant: [[-40, .4], [-25, .6], [-10, .9], [0, 1], [35, 1], [50, .75], [70, .55]],  // pitch (deg) -> arm scale
    hall: { ray: 3, wide: 4.2, narrow: 2, minK: .55, rate: 4 },      // side rays (m); width -> arm scale
    resolve: { trigger: 1.9, rate: 4 },          // resolve when the arm to the anchor is shorter than this (m)
    up: { rise: 150, fall: 40, max: 70 },        // old push-up: deg/s up while blocked, deg/s back down, max extra pitch
    dither: { alpha: .26, rate: 8 },             // faded occluders draw this share of their pixels
  };

  /* ---------- vectors ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const vl = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const ez = (k) => 1 - Math.exp(-k * DT);

  /* ---------- the room (metres; x east, y north, z up). Rock outside the room is solid. ---------- */
  const BOXES = [
    { n: 'floor', b: [-20, 32, -20, 32, -3, 0], m: 'floor' },
    { n: 'wall', b: [-6, 0, -6, 18, 0, 4], m: 'rock' },
    { n: 'wall', b: [12, 18, -6, 18, 0, 4], m: 'rock' },
    { n: 'wall', b: [0, 12, -6, 0, 0, 4], m: 'rock' },
    { n: 'wall', b: [0, 12, 12, 18, 0, 4], m: 'rock' },
    { n: 'wall', b: [2, 2.5, 0, 5.5, 0, 4], m: 'rock', hall: 1 },
    { n: 'pillar', b: [6, 7.2, 4.4, 5.6, 0, 4], m: 'pillar', key: 'pillar' },
    { n: 'ceiling', b: [8.6, 12, 8.6, 12, 2.5, 2.9], m: 'slab' },
    { n: 'tree', b: [3.8, 4.2, 9.2, 9.6, 0, 2.4], m: 'trunk', key: 'tree' },
  ];
  const CANOPY = { c: [4, 9.4, 3.1], r: 1.5, key: 'tree' };
  const CORNER = [8.6, 12, 8.6, 12];            // the "corner with low ceiling" volume (x0, x1, y0, y1)
  const RESOLVE = [8.2, 9.5, 2.0];              // collision resolve point placed by the camera designer

  function rayBox(o, d, b) {
    let t0 = -Infinity, t1 = Infinity, ax = -1, sg = 0;
    for (let i = 0; i < 3; i++) {
      const lo = b[2 * i], hi = b[2 * i + 1];
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo || o[i] > hi) return null; continue; }
      let a = (lo - o[i]) / d[i], c = (hi - o[i]) / d[i];
      const s = d[i] > 0 ? -1 : 1; if (a > c) { const q = a; a = c; c = q; }
      if (a > t0) { t0 = a; ax = i; sg = s; }
      if (c < t1) t1 = c;
      if (t0 > t1) return null;
    }
    if (t1 < 0) return null;
    return { t: Math.max(0, t0), ax, sg, inside: t0 < 0 };
  }
  function raySphere(o, d, c, r) {
    const oc = sub(o, c), b = dot(oc, d), q = dot(oc, oc) - r * r, disc = b * b - q;
    if (disc < 0) return null;
    const s = Math.sqrt(disc), t0 = -b - s, t1 = -b + s;
    if (t1 < 0) return null;
    return { t: Math.max(0, t0) };
  }
  // nearest solid hit along a unit ray, up to maxT, for a camera sphere of radius r (boxes grown by r).
  // The canopy is soft: no camera collision on leaves.
  const grow = (b, r) => [b[0] - r, b[1] + r, b[2] - r, b[3] + r, b[4] - r, b[5] + r];
  // With dithering on, objects that can fade (pillar, tree) are left out: they fade instead of moving the camera.
  let SKIP_FADE = false;
  function castSolid(o, d, maxT, r = RULES.radius) {
    let best = null;
    for (const bx of BOXES) { if (SKIP_FADE && bx.key) continue; const h = rayBox(o, d, r ? grow(bx.b, r) : bx.b); if (h && h.t < maxT && (!best || h.t < best.t)) best = { ...h, box: bx }; }
    return best;
  }
  // is the segment from p to q blocked for the eye? faded objects (dithering) do not block
  function blocked(p, q, dith) {
    const dv = sub(q, p), L = len(dv), d = mul(dv, 1 / L);
    for (const bx of BOXES) { if (dith && bx.key) continue; const h = rayBox(p, d, bx.b); if (h && h.t < L - 0.02) return bx; }
    if (!dith) { const h = raySphere(p, d, CANOPY.c, CANOPY.r); if (h && h.t < L - 0.02) return CANOPY; }
    return null;
  }
  function objBlocks(key, p, q) {
    const dv = sub(q, p), L = len(dv), d = mul(dv, 1 / L);
    for (const bx of BOXES) if (bx.key === key) { const h = rayBox(p, d, bx.b); if (h && h.t < L - .02) return true; }
    if (key === 'tree') { const h = raySphere(p, d, CANOPY.c, CANOPY.r); if (h && h.t < L - .02) return true; }
    return false;
  }
  const inBox = (p, b, m = 0) => p[0] > b[0] - m && p[0] < b[1] + m && p[1] > b[2] - m && p[1] < b[3] + m && p[2] > b[4] - m && p[2] < b[5] + m;
  // a point inside an actor's body (oriented box around its feet position, facing f)
  function inActor(p, a, big) {
    const dx = p[0] - a.x, dy = p[1] - a.y, c = Math.cos(a.f), s = Math.sin(a.f), u = dx * c + dy * s, v = -dx * s + dy * c;
    const hx = big ? .33 : .26, hy = big ? .44 : .36, top = big ? 2.08 : 1.88;
    return Math.abs(u) < hx && Math.abs(v) < hy && p[2] > -0.05 && p[2] < top;
  }
  function insideWhat(p, fr, dith) {
    for (const bx of BOXES) if (inBox(p, bx.b, .08) && !(dith && bx.key)) return bx.n;
    if (!dith && len(sub(p, CANOPY.c)) < CANOPY.r * .95) return 'tree';
    if (inActor(p, fr.hero)) return 'hero';
    if (fr.enemy && inActor(p, fr.enemy, 1)) return 'enemy';
    return '';
  }

  /* ---------- scripted paths: [time s, hero x, y, facing deg, camera yaw deg (where it looks), pitch deg] ---------- */
  const PATH_MAIN = [
    [0, 1.0, 1.2, 90, 90, 15], [2.2, 1.0, 4.4, 90, 90, 15], [3.4, 1.2, 5.8, 75, 40, 15], [4.4, 2.5, 6.8, 35, 38, 15],
    [5.2, 3.3, 7.5, 50, 55, 6], [6.2, 4.2, 8.4, 55, 62, -36], [7.2, 4.9, 9.5, 70, 72, -32], [8.0, 5.6, 10.6, 85, 82, 15],
    [8.6, 5.6, 10.6, 85, 82, 15], [10.2, 5.6, 10.7, 200, 228, 15], [11.0, 5.7, 10.8, 255, 268, 18], [11.8, 5.8, 10.8, 270, 270, 18],
    [12.8, 7.0, 10.9, 360, 345, 16], [14.0, 9.6, 10.9, 365, 360, 20], [15.0, 10.9, 11.0, 405, 405, 20],
    [16.0, 11.3, 11.3, 585, 585, 20], [17.4, 11.35, 11.35, 585, 585, 20],
    [18.2, 10.2, 9.8, 585, 600, 15], [19.4, 8.3, 6.6, 600, 625, 15], [20.1, 7.9, 4.0, 620, 630, 15], [20.8, 6.6, 3.5, 630, 630, 15], [22.0, 6.6, 3.3, 630, 630, 15],
  ];
  const PATH_FIGHT = [
    [0, 5.2, 3.0, -20, -60, 15], [2.0, 5.6, 3.1, -15, -62, 15], [5.0, 6.6, 3.4, -20, -90, 15], [8.0, 6.6, 3.4, -15, -90, 15],
    [9.5, 8.4, 3.3, -180, -150, 15], [11.5, 10.8, 3.2, -180, -180, 15], [14.0, 10.8, 3.2, -180, -180, 15],
  ];
  const ENEMY_MAIN = [[0, 8.0, 2.6], [22, 8.0, 2.6]], ENEMY_MAIN_FROM = 18;   // the enemy joins for the pillar leg
  const ENEMY_FIGHT = [[0, 8.0, 2.7], [8.0, 8.0, 2.7], [11.5, 8.9, 3.0], [14, 9.1, 3.1]];
  function keyAt(keys, t) {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1] || a, k = clamp((t - a[0]) / ((b[0] - a[0]) || 1));
    return { a, b, k, e: k * k * (3 - 2 * k) };
  }
  function makePath(keys, ekeys) {
    const dur = keys.at(-1)[0];
    return {
      dur, at(t) {
        const { a, b, k, e } = keyAt(keys, t);
        const o = { t, hero: { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), f: lerp(a[3], b[3], e) * DEG }, yaw: lerp(a[4], b[4], e) * DEG, pitch: lerp(a[5], b[5], e) * DEG, enemy: null };
        if (ekeys && t >= (ekeys.from || 0)) { const q = keyAt(ekeys, t); o.enemyPos = { x: lerp(q.a[1], q.b[1], q.k), y: lerp(q.a[2], q.b[2], q.k) }; }
        return o;
      },
    };
  }
  const PATHS = { main: makePath(PATH_MAIN, Object.assign(ENEMY_MAIN, { from: ENEMY_MAIN_FROM })), fight: makePath(PATH_FIGHT, ENEMY_FIGHT) };

  /* ---------- the rig ---------- */
  const armDir = (yaw, pitch) => [-Math.cos(pitch) * Math.cos(yaw), -Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)];
  function quantK(pDeg) {
    const q = RULES.quant; if (pDeg <= q[0][0]) return q[0][1];
    for (let i = 1; i < q.length; i++) if (pDeg <= q[i][0]) return lerp(q[i - 1][1], q[i][1], (pDeg - q[i - 1][0]) / (q[i][0] - q[i - 1][0]));
    return q.at(-1)[1];
  }
  function viewBasis(cam, look) {
    const f = norm(sub(look, cam)); let r = cross(f, [0, 0, 1]);
    if (len(r) < 1e-4) r = [1, 0, 0]; r = norm(r);
    return { f, r, u: cross(r, f) };
  }
  const F_OF = w => (w / 2) / Math.tan(RULES.hfov / 2 * DEG);
  const heroPts = (h, zs = [1.66, 1.22, .72, .25]) => { const s = Math.sin(h.f), c = Math.cos(h.f); return [...zs.map(z => [h.x, h.y, z]), [h.x - s * .24, h.y + c * .24, 1.25], [h.x + s * .24, h.y - c * .24, 1.25]]; };
  const enemyPts = e => heroPts(e, [1.85, 1.3, .8, .3]);
  function onScreen(cam, B, p, aspect) {
    const d = sub(p, cam), z = dot(d, B.f); if (z < .1) return false;
    const tx = Math.tan(RULES.hfov / 2 * DEG), x = dot(d, B.r) / z, y = dot(d, B.u) / z;
    return Math.abs(x) < tx * .96 && Math.abs(y) < tx / aspect * .96;
  }

  function step(S, p, set, o) {
    const A = [p.hero.x, p.hero.y, RULES.anchorZ], yaw = p.yaw, fr = { t: p.t, hero: p.hero, A, yaw, pitch: p.pitch, feel: [], side: [], enemy: null };
    if (o.combat && p.enemyPos) fr.enemy = { x: p.enemyPos.x, y: p.enemyPos.y, f: Math.atan2(p.hero.y - p.enemyPos.y, p.hero.x - p.enemyPos.x) };
    let L = o.D;
    SKIP_FADE = !!set.dith;
    if (set.quant) L *= quantK(p.pitch / DEG);
    if (set.hall) {
      let w = 0;
      for (const sg of [1, -1]) {
        const d = [-Math.sin(yaw) * sg, Math.cos(yaw) * sg, 0], h = castSolid(A, d, RULES.hall.ray, 0), t = h ? h.t : RULES.hall.ray;
        w += t; fr.side.push([add(A, mul(d, t)), !!h]);
      }
      const R = RULES.hall, tk = w >= R.wide ? 1 : lerp(R.minK, 1, clamp((w - R.narrow) / (R.wide - R.narrow)));
      S.hall += (tk - S.hall) * ez(R.rate); L *= S.hall;
    }
    let pitch = p.pitch;
    fr.jitter = false;
    if (set.up) {
      const h = castSolid(A, armDir(yaw, pitch + S.pu * DEG), L);
      if (h && h.t < L - .05) {
        if (h.ax === 2 && h.sg < 0) { S.pu = 0; fr.jitter = true; }      // the raised arm hits a ceiling: the old code drops it back
        else S.pu = Math.min(RULES.up.max, S.pu + RULES.up.rise * DT);
      } else if (S.pu > 0 && !castSolid(A, armDir(yaw, pitch + (S.pu - 6) * DEG), L)) S.pu = Math.max(0, S.pu - RULES.up.fall * DT);
      pitch += S.pu * DEG;
    }
    const u = armDir(yaw, pitch), ideal = add(A, mul(u, L));
    let arm = L;
    if (set.pred) {
      let tgt = L;
      for (const [off, w] of RULES.feelers) {
        const d = armDir(yaw + off * DEG, pitch), reach = L * RULES.feelLen, h = castSolid(A, d, reach);
        fr.feel.push([add(A, mul(d, h ? h.t : reach)), !!h]);
        if (h) tgt = Math.min(tgt, lerp(L, Math.max(RULES.predMin, h.t - RULES.predMargin), w));
      }
      if (S.pred == null) S.pred = tgt;
      S.pred += (tgt - S.pred) * ez(RULES.predRate); S.pred = Math.min(S.pred, L);
      arm = S.pred;
    }
    const predArm = arm;
    fr.pushed = '';
    if (set.col) {
      const h = castSolid(A, u, arm);
      if (h && h.t < arm) { arm = Math.max(RULES.colMin, h.t - RULES.colMargin); fr.pushed = 'collision push'; }
    }
    if (set.pred && set.col) { S.predPull += Math.max(0, L - predArm); S.colPull += Math.max(0, predArm - arm); }
    let cam = add(A, mul(u, arm));
    let look = add(A, [Math.cos(yaw) * 1.0, Math.sin(yaw) * 1.0, -.15]);
    if (set.res) {
      const inC = p.hero.x > CORNER[0] && p.hero.x < CORNER[1] && p.hero.y > CORNER[2] && p.hero.y < CORNER[3];
      const h = castSolid(A, u, L), want = inC && h && h.t < RULES.resolve.trigger ? 1 : 0;
      S.rw += (want - S.rw) * ez(RULES.resolve.rate);
      if (S.rw > .01) { cam = vl(cam, RESOLVE, S.rw); look = vl(look, A, S.rw); if (S.rw > .3) fr.pushed = 'to the resolve point'; }
    }
    if (set.up && S.pu > 2 && !fr.pushed) fr.pushed = 'pushed up';
    if (fr.jitter) fr.pushed = 'pushed up';
    fr.cam = cam; fr.look = look; fr.ideal = ideal; fr.L = L; fr.arm = len(sub(cam, A)); fr.rw = S.rw; fr.pu = S.pu;
    // what the player sees
    const dith = !!set.dith, hp = heroPts(p.hero);
    fr.inside = insideWhat(cam, fr, dith);
    fr.hidden = !!fr.inside && fr.inside !== 'hero' ? true : hp.every(q => blocked(cam, q, dith));
    if (fr.inside === 'hero') fr.hidden = false;
    fr.dA = {};
    for (const key of ['pillar', 'tree']) {
      let want = 1;
      if (dith) {
        const near = key === 'pillar' ? inBox(cam, BOXES[6].b, .5) : len(sub(cam, CANOPY.c)) < CANOPY.r + .5;
        const tgts = fr.enemy ? hp.concat(enemyPts(fr.enemy)) : hp;
        if (near || tgts.some(q => objBlocks(key, cam, q))) want = RULES.dither.alpha;
      }
      S.dA[key] += (want - S.dA[key]) * ez(RULES.dither.rate); fr.dA[key] = S.dA[key];
    }
    if (fr.enemy) {
      const B = viewBasis(cam, look), ep = enemyPts(fr.enemy);
      fr.lost = !!fr.inside || ep.every(q => !onScreen(cam, B, q, o.aspect) || blocked(cam, q, dith));
      fr.lostOff = fr.lost && !fr.inside && ep.every(q => !onScreen(cam, B, q, o.aspect));
    } else fr.lost = false;
    return fr;
  }

  const CACHE = new Map();
  const setKey = s => ['col', 'pred', 'quant', 'hall', 'res', 'up', 'dith'].filter(k => s[k]).join('+') || 'none';
  function simulate(pathId, set, a, b, o) {
    const key = [pathId, setKey(set), a, b, o.D, o.combat ? 1 : 0, o.aspect.toFixed(3)].join('|');
    if (CACHE.has(key)) return CACHE.get(key);
    const path = PATHS[pathId], n0 = Math.round(Math.max(0, a - 1) * HZ), na = Math.round(a * HZ), nb = Math.round(b * HZ);
    const S = { pred: null, hall: 1, pu: 0, rw: 0, dA: { pillar: 1, tree: 1 }, predPull: 0, colPull: 0 };
    const cnt = { hid: 0, ins: 0, lost: 0 }, frames = []; let prevArm = null, lastJit = -99, lastJump = -99;
    for (let i = n0; i <= nb; i++) {
      const fr = step(S, path.at(i / HZ), set, o);
      if (prevArm != null && prevArm - fr.arm > .45) lastJump = i;
      if (fr.jitter) lastJit = i;
      prevArm = fr.arm;
      if (i < na) continue;
      if (fr.hidden) cnt.hid++; if (fr.inside) cnt.ins++; if (fr.lost) cnt.lost++;
      fr.cnt = { ...cnt }; fr.jumpRecent = i - lastJump < 8; fr.jitRecent = i - lastJit < 6;
      fr.share = S.predPull + S.colPull > 1e-6 ? S.predPull / (S.predPull + S.colPull) : null;
      frames.push(fr);
    }
    const run = { pathId, set, a, b, frames, o, at: t => frames[clamp(Math.round((t - a) * HZ), 0, frames.length - 1)] };
    CACHE.set(key, run);
    if (CACHE.size > 80) CACHE.delete(CACHE.keys().next().value);
    return run;
  }

  /* ---------- software renderer ---------- */
  const COL = {
    floor: [221, 210, 188], floorLn: [204, 190, 158], rock: [64, 70, 118], rockLn: [42, 46, 85], rockTop: [96, 101, 150],
    pillar: [146, 150, 174], pillarLn: [104, 110, 142], slab: [118, 120, 148], slabLn: [80, 84, 116], trunk: [122, 90, 58],
    canopy: [88, 140, 64], hero: [46, 163, 220], head: [170, 225, 245], visor: [21, 32, 68], enemy: [229, 50, 45], enemyHd: [160, 30, 28],
  };
  const SUN = norm([0.42, -0.62, 0.66]);
  const pack = (r, g, b) => (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  const IN_BASE = pack(44, 30, 60), IN_STRIPE = pack(150, 40, 44);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const MAT = { floor: 1, rock: 2, pillar: 3, slab: 4, flat: 5 };

  function mkPoly(v, n, ob, mat, rgb, ln, ax) {
    const lum = .6 + .4 * Math.max(0, dot(n, SUN)) + (n[2] < -.5 ? -.12 : 0);
    const p = { v, n, ob, mat, key: ob.key, r: rgb[0] * lum, g: rgb[1] * lum, b: rgb[2] * lum };
    const l = ln || rgb.map(c => c * .72); p.lr = l[0] * lum; p.lg = l[1] * lum; p.lb = l[2] * lum;
    if (ax) { p.o = ax[0]; p.a1 = ax[1]; p.l1 = ax[2]; p.a2 = ax[3]; p.l2 = ax[4]; }
    return p;
  }
  // six faces of a box given its origin corner o and three unit edge axes with lengths
  function boxFaces(o, X, lx, Y, ly, Z, lz, ob, colFn) {
    const P = (a, b, c) => add(o, add(mul(X, a * lx), add(mul(Y, b * ly), mul(Z, c * lz))));
    const fs = [
      [[P(0, 0, 0), P(0, 1, 0), P(0, 1, 1), P(0, 0, 1)], mul(X, -1), [P(0, 0, 0), Y, ly, Z, lz]],
      [[P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)], X, [P(1, 0, 0), Y, ly, Z, lz]],
      [[P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)], mul(Y, -1), [P(0, 0, 0), X, lx, Z, lz]],
      [[P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], Y, [P(0, 1, 0), X, lx, Z, lz]],
      [[P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)], mul(Z, -1), [P(0, 0, 0), X, lx, Y, ly]],
      [[P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)], Z, [P(0, 0, 1), X, lx, Y, ly]],
    ];
    return fs.map(([v, n, ax]) => { const [mat, rgb, ln] = colFn(n); return mkPoly(v, n, ob, mat, rgb, ln, ax); });
  }
  const STATIC = [];
  BOXES.forEach(bx => {
    const b = bx.b, ob = { kind: 'box', b, key: bx.key };
    bx.ob = ob;
    const fn = n => {
      if (bx.m === 'floor') return [MAT.floor, COL.floor, COL.floorLn];
      if (bx.m === 'rock') return n[2] > .5 ? [MAT.flat, COL.rockTop] : [MAT.rock, COL.rock, COL.rockLn];
      if (bx.m === 'pillar') return [MAT.pillar, COL.pillar, COL.pillarLn];
      if (bx.m === 'slab') return [MAT.slab, COL.slab, COL.slabLn];
      return [MAT.flat, COL.trunk];
    };
    STATIC.push(...boxFaces([b[0], b[2], b[4]], [1, 0, 0], b[1] - b[0], [0, 1, 0], b[3] - b[2], [0, 0, 1], b[5] - b[4], ob, fn));
  });
  (function canopy() {
    const ob = { kind: 'sph', c: CANOPY.c, r: CANOPY.r, key: 'tree' }, R = 6, S = 10, c = CANOPY.c;
    const pt = (i, j) => { const ph = -Math.PI / 2 + Math.PI * i / R, th = 2 * Math.PI * j / S + (i % 2) * .3; return [c[0] + Math.cos(ph) * Math.cos(th) * CANOPY.r, c[1] + Math.cos(ph) * Math.sin(th) * CANOPY.r, c[2] + Math.sin(ph) * CANOPY.r * .9]; };
    for (let i = 0; i < R; i++) for (let j = 0; j < S; j++) {
      const v = [pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j)], m = v.reduce((s, q) => add(s, mul(q, .25)), [0, 0, 0]);
      const k = .86 + .26 * (((i * 7 + j * 13) % 5) / 4);
      STATIC.push(mkPoly(v, norm(sub(m, c)), ob, MAT.flat, COL.canopy.map(x => x * k)));
    }
  })();
  // an actor: body, head and a visor on the facing side
  function actorPolys(a, enemy) {
    const out = [], c = Math.cos(a.f), s = Math.sin(a.f), X = [c, s, 0], Y = [-s, c, 0], Z = [0, 0, 1];
    const ob = { kind: 'actor', a, big: enemy };
    const box = (fx, hx, hy, z0, z1, rgb) => {
      const o = [a.x + X[0] * (fx - hx) + Y[0] * -hy, a.y + X[1] * (fx - hx) + Y[1] * -hy, z0];
      out.push(...boxFaces(o, X, 2 * hx, Y, 2 * hy, Z, z1 - z0, ob, () => [MAT.flat, rgb]));
    };
    if (enemy) { box(0, .25, .36, 0, 1.62, COL.enemy); box(0, .19, .19, 1.66, 2.04, COL.enemyHd); box(.22, .03, .13, 1.78, 1.88, [255, 230, 190]); }
    else { box(0, .18, .28, 0, 1.44, COL.hero); box(0, .16, .16, 1.48, 1.8, COL.head); box(.17, .03, .12, 1.6, 1.7, COL.visor); }
    return out;
  }

  function makeView(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'), img = g.createImageData(w, h);
    return { cv, g, img, buf: new Uint32Array(img.data.buffer), dep: new Float32Array(w * h), w, h, sky: [...Array(h)].map((_, y) => { const k = y / h; return pack(lerp(186, 238, k), lerp(208, 230, k), lerp(230, 212, k)); }) };
  }
  function insideOb(ob, p) {
    if (ob.kind === 'box') return inBox(p, ob.b);
    if (ob.kind === 'sph') return len(sub(p, ob.c)) < ob.r * .93;
    return inActor(p, ob.a, ob.big);
  }
  function render(V, fr) {
    const { w, h, buf, dep } = V;
    for (let y = 0; y < h; y++) buf.fill(V.sky[y], y * w, (y + 1) * w);
    dep.fill(0);
    const Cm = fr.cam, B = viewBasis(Cm, fr.look), F = F_OF(w), cam = { C: Cm, ...B, F, cx: w / 2, cy: h / 2 };
    const polys = STATIC.concat(actorPolys(fr.hero, false), fr.enemy ? actorPolys(fr.enemy, true) : []);
    const seen = new Map();
    for (const p of polys) {
      let ins = seen.get(p.ob); if (ins == null) { ins = insideOb(p.ob, Cm); seen.set(p.ob, ins); }
      const back = dot(p.n, sub(Cm, p.v[0])) <= 0;
      if (back && !ins) continue;
      const alpha = p.key ? fr.dA[p.key] : 1;
      drawPoly(V, cam, p, back ? 0 : p.mat, back ? 1 : alpha);
    }
    V.g.putImageData(V.img, 0, 0);
    return cam;
  }
  function project(cam, p) {
    const d = sub(p, cam.C), z = dot(d, cam.f);
    return { x: cam.cx + dot(d, cam.r) / z * cam.F, y: cam.cy - dot(d, cam.u) / z * cam.F, z };
  }
  function drawPoly(V, cam, p, mat, alpha) {
    const NEAR = RULES.near, src = p.v.map(v => { const d = sub(v, cam.C); return [dot(d, cam.r), dot(d, cam.u), dot(d, cam.f), v[0], v[1], v[2]]; });
    let pts = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length], ia = a[2] >= NEAR, ib = b[2] >= NEAR;
      if (ia) pts.push(a);
      if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); pts.push(a.map((x, j) => x + (b[j] - x) * k)); }
    }
    if (pts.length < 3) return;
    const pr = pts.map(q => { const iz = 1 / q[2]; return { sx: cam.cx + q[0] * iz * cam.F, sy: cam.cy - q[1] * iz * cam.F, iz, wx: q[3] * iz, wy: q[4] * iz, wz: q[5] * iz }; });
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    for (const q of pr) { mnx = Math.min(mnx, q.sx); mxx = Math.max(mxx, q.sx); mny = Math.min(mny, q.sy); mxy = Math.max(mxy, q.sy); }
    if (mxx < 0 || mny > V.h || mxy < 0 || mnx > V.w) return;
    for (let i = 1; i < pr.length - 1; i++) tri(V, pr[0], pr[i], pr[i + 1], p, mat, alpha, cam.F);
  }
  function tri(V, a, b, c, P, mat, alpha, F) {
    const { w, h, buf, dep } = V;
    const area = (b.sx - a.sx) * (c.sy - a.sy) - (b.sy - a.sy) * (c.sx - a.sx);
    if (Math.abs(area) < 1e-9) return;
    const ia = 1 / area;
    const x0 = Math.max(0, Math.floor(Math.min(a.sx, b.sx, c.sx))), x1 = Math.min(w - 1, Math.ceil(Math.max(a.sx, b.sx, c.sx)));
    const y0 = Math.max(0, Math.floor(Math.min(a.sy, b.sy, c.sy))), y1 = Math.min(h - 1, Math.ceil(Math.max(a.sy, b.sy, c.sy)));
    const E = -1e-6, dith = alpha < .999, ath = alpha * 16, bias = mat === 0 ? 1.002 : 1;
    for (let y = y0; y <= y1; y++) {
      const py = y + .5, row = y * w;
      for (let x = x0; x <= x1; x++) {
        const px = x + .5;
        const w0 = ((b.sx - px) * (c.sy - py) - (b.sy - py) * (c.sx - px)) * ia;
        if (w0 < E) continue;
        const w1 = ((c.sx - px) * (a.sy - py) - (c.sy - py) * (a.sx - px)) * ia;
        if (w1 < E) continue;
        const w2 = 1 - w0 - w1;
        if (w2 < E) continue;
        const iz = (w0 * a.iz + w1 * b.iz + w2 * c.iz) * bias, idx = row + x;
        if (iz <= dep[idx]) continue;
        if (dith && BAYER[(y & 3) * 4 + (x & 3)] >= ath) continue;
        dep[idx] = iz;
        if (mat === 0) { buf[idx] = ((x + y) & 15) < 4 ? IN_STRIPE : IN_BASE; continue; }
        const z = bias / iz;
        buf[idx] = shade(P, mat, (w0 * a.wx + w1 * b.wx + w2 * c.wx) * z, (w0 * a.wy + w1 * b.wy + w2 * c.wy) * z, (w0 * a.wz + w1 * b.wz + w2 * c.wz) * z, z, F);
      }
    }
  }
  function shade(P, mat, wx, wy, wz, z, F) {
    let r = P.r, g = P.g, b = P.b;
    const lw = 1.25 * z / F;
    let line = false, edge = false;
    if (P.a1) {
      const dx = wx - P.o[0], dy = wy - P.o[1], dz = wz - P.o[2];
      const u = dx * P.a1[0] + dy * P.a1[1] + dz * P.a1[2], v = dx * P.a2[0] + dy * P.a2[1] + dz * P.a2[2];
      edge = Math.min(u, P.l1 - u, v, P.l2 - v) < lw * 1.5;
      if (!edge) {
        if (mat === 1) { const fx = wx - Math.floor(wx), fy = wy - Math.floor(wy); line = fx < lw || fy < lw; }
        else if (mat === 2) { const rw = Math.floor(wz / .5), fz = wz - rw * .5, fu = u + (rw & 1) * .5; line = fz < lw || fu - Math.floor(fu) < lw; }
        else if (mat === 3) line = wz - Math.floor(wz / .6) * .6 < lw;
        else if (mat === 4) { const s = wx + wy; line = s - Math.floor(s / .4) * .4 < lw; }
      }
    }
    if (edge) { r *= .5; g *= .5; b *= .55; } else if (line) { r = P.lr; g = P.lg; b = P.lb; }
    if (z > 7) { const k = Math.min(.45, (z - 7) / 40); r = lerp(r, 236, k); g = lerp(g, 228, k); b = lerp(b, 212, k); }
    return pack(r | 0, g | 0, b | 0);
  }

  /* ---------- 2D drawing on the main canvas ---------- */
  const font = (wt, px) => `${wt} ${px}px Jost, sans-serif`;
  function text(g, s, x, y, col = C.ink, px = 13, wt = 600, al = 'left') { g.font = font(wt, px); g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function card(g) { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }
  const NAMES = { col: 'collision', pred: 'prediction', quant: 'pitch quantizer', hall: 'hallway pull-in', res: 'resolve point', up: 'old push-up', dith: 'dithering' };
  const setName = s => { const k = ['col', 'pred', 'quant', 'hall', 'res', 'up', 'dith'].filter(x => s[x]); return k.length ? k.map(x => NAMES[x]).join(' + ') : 'no solution'; };

  function drawView(g, V, fr, rect, set, opt = {}) {
    const cam = render(V, fr);
    g.save(); g.beginPath(); g.roundRect(rect.x, rect.y, rect.w, rect.h, 10); g.clip();
    g.imageSmoothingEnabled = false; g.drawImage(V.cv, rect.x, rect.y, rect.w, rect.h);
    const sx = rect.w / V.w, P = q => { const p = project(cam, q); return { x: rect.x + p.x * sx, y: rect.y + p.y * sx, z: p.z }; };
    // the enemy tag, or an arrow to where it went
    if (fr.enemy) {
      const p = P([fr.enemy.x, fr.enemy.y, 2.3]);
      if (!fr.lost && p.z > 0) T.label('enemy', p.x, Math.max(rect.y + 14, p.y), 'center', C.red, 12);
      else if (!fr.lostOff && !fr.inside && p.z > 0) T.label('enemy hidden', clamp(p.x, rect.x + 50, rect.x + rect.w - 50), clamp(p.y, rect.y + 14, rect.y + rect.h - 14), 'center', C.red, 12);
      else {
        const d = sub([fr.enemy.x, fr.enemy.y, 1.2], fr.cam), ang = Math.atan2(-dot(d, cam.u), dot(d, cam.r));
        const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, ex = cx + Math.cos(ang) * (rect.w / 2 - 34), ey = cy + Math.sin(ang) * (rect.h / 2 - 34);
        g.save(); g.translate(ex, ey); g.rotate(ang); g.fillStyle = C.red; g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -10); g.lineTo(-8, 10); g.closePath(); g.fill(); g.restore();
        T.label(fr.inside ? 'enemy lost' : 'enemy off screen', clamp(ex, rect.x + 70, rect.x + rect.w - 70), clamp(ey + (ey > cy ? -24 : 24), rect.y + 16, rect.y + rect.h - 16), 'center', C.red, 12);
      }
    }
    if (opt.chips !== false) {
      const s = setName(set); g.font = font(600, 12);
      const tw = g.measureText(s).width; g.fillStyle = 'rgba(21,32,68,.78)'; g.beginPath(); g.roundRect(rect.x + 8, rect.y + 8, tw + 18, 22, 11); g.fill();
      text(g, s, rect.x + 17, rect.y + 19.5, '#fff', 12);
    }
    // what went wrong (or right) this frame
    const msgs = [];
    if (fr.inside) msgs.push([fr.inside === 'hero' ? 'camera inside the hero' : fr.inside === 'floor' ? 'camera inside the floor' : `camera inside the ${fr.inside}`, C.red]);
    else if (fr.hidden) msgs.push(['hero fully hidden', C.red]);
    else if (fr.arm < fr.L * .5) msgs.push(['camera pulled in close', C.goldInk]);
    if (fr.jitRecent) msgs.push(['jitter: push-up hits the ceiling', C.redDk]);
    else if (fr.jumpRecent) msgs.push(['jump: collision snaps in', C.goldInk]);
    if (fr.dA.pillar < .8) msgs.push(['pillar dithered', C.p3]);
    if (fr.dA.tree < .8) msgs.push(['tree dithered', C.p3]);
    msgs.forEach(([m, col], i) => T.label(m, rect.x + rect.w / 2, rect.y + 48 + i * 30, 'center', col, i ? 14 : 17));
    // arm readout
    const ar = `arm ${fr.L.toFixed(1)} m → ${fr.arm.toFixed(1)} m`;
    T.label(ar, rect.x + 14, rect.y + rect.h - 18, 'left', C.ink, 13);
    if (fr.share != null && set.pred && set.col) T.label(`pull-in: prediction ${Math.round(fr.share * 100)}% · collision ${Math.round((1 - fr.share) * 100)}%`, rect.x + rect.w - 14, rect.y + rect.h - 18, 'right', C.ink, 13);
    g.restore();
    g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2; g.beginPath(); g.roundRect(rect.x, rect.y, rect.w, rect.h, 10); g.stroke();
  }

  // top-down map. M = { x0 (world x at left edge), y1 (world y at top edge), s (px per m) }
  function drawMap(g, rect, M, fr, set, run, opt = {}) {
    const X = x => rect.x + (x - M.x0) * M.s, Y = y => rect.y + (M.y1 - y) * M.s, S = M.s;
    const R = (b) => [X(b[0]), Y(b[3]), (b[1] - b[0]) * S, (b[3] - b[2]) * S];
    g.save(); g.beginPath(); g.roundRect(rect.x, rect.y, rect.w, rect.h, 10); g.clip();
    T.use(g);
    T.wall(rect.x, rect.y, rect.w, rect.h);
    // floor with 1 m tiles
    const [fx, fy, fw, fh] = R([0, 12, 0, 12]);
    g.fillStyle = C.floor; g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = C.floorLn; g.lineWidth = 1; g.beginPath();
    for (let i = 1; i < 12; i++) { g.moveTo(X(i), fy); g.lineTo(X(i), fy + fh); g.moveTo(fx, Y(i)); g.lineTo(fx + fw, Y(i)); }
    g.stroke();
    const hw = R(BOXES[5].b); T.wall(...hw);
    // low ceiling: hatched
    const lc = R(BOXES[7].b);
    g.save(); g.beginPath(); g.rect(...lc); g.clip(); g.fillStyle = 'rgba(61,66,112,.16)'; g.fillRect(...lc);
    g.strokeStyle = 'rgba(61,66,112,.45)'; g.lineWidth = 1.5; g.beginPath();
    for (let k = -lc[3]; k < lc[2]; k += 10) { g.moveTo(lc[0] + k, lc[1] + lc[3]); g.lineTo(lc[0] + k + lc[3], lc[1]); } g.stroke(); g.restore();
    g.strokeStyle = 'rgba(61,66,112,.7)'; g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeRect(...lc); g.setLineDash([]);
    // trail
    if (run && opt.trail !== false) {
      const pts = []; for (const f of run.frames) { if (f.t > fr.t) break; pts.push([X(f.hero.x), Y(f.hero.y)]); }
      T.trail(pts.filter((_, i) => i % 3 === 0).concat(pts.length ? [pts.at(-1)] : []), C.player, .55, 3);
    }
    // pillar and tree, faded when dithered
    const pa = fr.dA.pillar, pl = R(BOXES[6].b);
    g.save(); g.globalAlpha = .35 + .65 * pa; T.pillar(...pl); g.restore();
    if (pa < .8) { g.strokeStyle = C.p3; g.setLineDash([4, 3]); g.lineWidth = 2; g.strokeRect(...pl); g.setLineDash([]); }
    const ta = fr.dA.tree;
    g.fillStyle = `rgba(88,140,64,${.25 + .4 * ta})`; g.strokeStyle = ta < .8 ? C.p3 : 'rgba(47,90,28,.8)'; g.lineWidth = 2;
    if (ta < .8) g.setLineDash([4, 3]);
    g.beginPath(); g.arc(X(CANOPY.c[0]), Y(CANOPY.c[1]), CANOPY.r * S, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#7a5a3a'; g.beginPath(); g.arc(X(4), Y(9.4), .25 * S, 0, Math.PI * 2); g.fill();
    // resolve point and its corner volume
    if (set.res) {
      const [rx, ry] = [X(RESOLVE[0]), Y(RESOLVE[1])];
      g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(rx, ry - 9); g.lineTo(rx + 9, ry); g.lineTo(rx, ry + 9); g.lineTo(rx - 9, ry); g.closePath(); g.fill(); g.stroke();
      if (opt.labels !== false) T.label('resolve point', rx - 4, ry + 22, 'center', C.goldInk, 11);
    }
    // labels
    if (opt.labels !== false) {
      T.label('hallway', X(1), Y(2.6), 'center', C.muted, 11);
      T.label('pillar', X(6.6), Y(6.15), 'center', C.muted, 11);
      T.label('tree', X(4), Y(11.25), 'center', C.muted, 11);
      T.label('low ceiling 2.5 m', X(10.3), Y(9.1), 'center', C.ink, 11);
    }
    // rays
    const A = fr.A;
    fr.side.forEach(([e, hit]) => { g.strokeStyle = 'rgba(46,163,220,.9)'; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(A[0]), Y(A[1])); g.lineTo(X(e[0]), Y(e[1])); g.stroke(); g.setLineDash([]); if (hit) { g.fillStyle = C.player; g.beginPath(); g.arc(X(e[0]), Y(e[1]), 3.5, 0, 7); g.fill(); } });
    fr.feel.forEach(([e, hit]) => { g.strokeStyle = 'rgba(224,169,45,.95)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(A[0]), Y(A[1])); g.lineTo(X(e[0]), Y(e[1])); g.stroke(); if (hit) { g.fillStyle = C.red; g.beginPath(); g.arc(X(e[0]), Y(e[1]), 4, 0, 7); g.fill(); } });
    // ideal camera ghost
    const id = fr.ideal, cm = fr.cam, far = len(sub(id, cm)) > .15;
    // a camera off the edge of the map is pinned to the edge
    const CX = clamp(X(cm[0]), rect.x + 10, rect.x + rect.w - 10), CY = clamp(Y(cm[1]), rect.y + 10, rect.y + rect.h - 10);
    if (far) {
      g.strokeStyle = 'rgba(21,32,68,.45)'; g.setLineDash([5, 4]); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(X(A[0]), Y(A[1])); g.lineTo(X(id[0]), Y(id[1])); g.stroke();
      g.beginPath(); g.arc(X(id[0]), Y(id[1]), 7, 0, 7); g.stroke(); g.setLineDash([]);
    }
    // frustum
    const B = viewBasis(cm, fr.look), yaw = Math.atan2(B.f[1], B.f[0]), hf = RULES.hfov / 2 * DEG, fl = 2.2 * S;
    g.fillStyle = fr.inside ? 'rgba(229,50,45,.16)' : 'rgba(85,98,235,.13)'; g.beginPath(); g.moveTo(CX, CY);
    g.arc(CX, CY, fl, -yaw - hf, -yaw + hf); g.closePath(); g.fill();
    // arm
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(X(A[0]), Y(A[1])); g.lineTo(CX, CY); g.stroke();
    // push arrow from the ideal position to where the camera ended up
    if (far && fr.pushed) {
      const ax = X(id[0]), ay = Y(id[1]), bx = X(cm[0]), by = Y(cm[1]), an = Math.atan2(by - ay, bx - ax), dd = Math.hypot(bx - ax, by - ay);
      if (dd > 12) {
        g.strokeStyle = C.red; g.fillStyle = C.red; g.lineWidth = 3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx - Math.cos(an) * 10, by - Math.sin(an) * 10); g.stroke();
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - Math.cos(an - .45) * 12, by - Math.sin(an - .45) * 12); g.lineTo(bx - Math.cos(an + .45) * 12, by - Math.sin(an + .45) * 12); g.closePath(); g.fill();
      }
      if (opt.labels !== false) T.label(fr.pushed, clamp((ax + bx) / 2, rect.x + 60, rect.x + rect.w - 60), clamp((ay + by) / 2 - 16, rect.y + 14, rect.y + rect.h - 14), 'center', C.red, 11);
    }
    // actors
    if (fr.enemy) T.foe(X(fr.enemy.x), Y(fr.enemy.y), 11, -fr.enemy.f, C.red);
    T.player(X(fr.hero.x), Y(fr.hero.y), -fr.hero.f, .6);
    // camera icon
    g.save(); g.translate(CX, CY); g.rotate(-yaw);
    g.fillStyle = fr.inside ? C.red : C.navy; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(-9, -6, 13, 12, 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(4, -3); g.lineTo(11, -7); g.lineTo(11, 7); g.lineTo(4, 3); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // line of sight blocked
    if (fr.hidden && !fr.inside) { g.strokeStyle = C.red; g.setLineDash([3, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(cm[0]), Y(cm[1])); g.lineTo(X(A[0]), Y(A[1])); g.stroke(); g.setLineDash([]); }
    g.restore();
    g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2; g.beginPath(); g.roundRect(rect.x, rect.y, rect.w, rect.h, 10); g.stroke();
  }

  // side view of the arm: a vertical slice through the hero along the arm's horizontal direction
  function drawSide(g, rect, fr) {
    const sc = 17, hx = rect.x + rect.w - 34, base = rect.y + rect.h - 10, Z = z => base - z * sc;
    g.save(); g.beginPath(); g.roundRect(rect.x, rect.y, rect.w, rect.h, 8); g.clip();
    g.fillStyle = '#e8eef5'; g.fillRect(rect.x, rect.y, rect.w, rect.h);
    let dir = [fr.cam[0] - fr.A[0], fr.cam[1] - fr.A[1]];
    let dl = Math.hypot(dir[0], dir[1]);
    if (dl < .05) { dir = [-Math.cos(fr.yaw), -Math.sin(fr.yaw)]; dl = 1; }
    dir = [dir[0] / dl, dir[1] / dl];
    for (let px = rect.x; px < rect.x + rect.w; px += 2) {
      const d = (hx - px) / sc, x = fr.hero.x + dir[0] * d, y = fr.hero.y + dir[1] * d;
      for (const bx of BOXES) {
        const b = bx.b; if (bx.n === 'floor' || x < b[0] || x > b[1] || y < b[2] || y > b[3]) continue;
        g.fillStyle = bx.m === 'rock' ? C.wall : bx.m === 'slab' ? '#767896' : bx.m === 'pillar' ? C.stone : '#7a5a3a';
        g.fillRect(px, Z(Math.min(b[5], 4.4)), 2, (Math.min(b[5], 4.4) - b[4]) * sc);
      }
      const dx = x - CANOPY.c[0], dy = y - CANOPY.c[1], q = CANOPY.r * CANOPY.r - dx * dx - dy * dy;
      if (q > 0) { const hh = Math.sqrt(q) * .9; g.fillStyle = 'rgba(88,140,64,.6)'; g.fillRect(px, Z(CANOPY.c[2] + hh), 2, 2 * hh * sc); }
    }
    g.fillStyle = C.floorLn; g.fillRect(rect.x, base, rect.w, 10);
    g.fillStyle = C.player; g.fillRect(hx - 4, Z(1.8), 8, 1.8 * sc);
    const ca = fr.arm > 0 ? Math.hypot(fr.cam[0] - fr.A[0], fr.cam[1] - fr.A[1]) : 0;
    const cx = hx - ca * sc, cy = Z(fr.cam[2]);
    const ih = Math.hypot(fr.ideal[0] - fr.A[0], fr.ideal[1] - fr.A[1]), ix = hx - ih * sc, iy = Z(fr.ideal[2]);
    g.strokeStyle = 'rgba(21,32,68,.45)'; g.setLineDash([4, 3]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx, Z(fr.A[2])); g.lineTo(ix, iy); g.stroke(); g.beginPath(); g.arc(ix, iy, 5, 0, 7); g.stroke(); g.setLineDash([]);
    g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.moveTo(hx, Z(fr.A[2])); g.lineTo(cx, cy); g.stroke();
    g.fillStyle = fr.inside ? C.red : C.navy; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill();
    g.fillStyle = C.gold; g.beginPath(); g.arc(hx, Z(fr.A[2]), 3.5, 0, 7); g.fill();
    text(g, 'side view of the arm', rect.x + 8, rect.y + 11, C.muted, 11);
    g.restore();
    g.strokeStyle = 'rgba(21,32,68,.4)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(rect.x, rect.y, rect.w, rect.h, 8); g.stroke();
  }

  function stat(g, x, y, w, h, v, lab, col) {
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 9); g.fill(); g.stroke();
    g.fillStyle = col; g.beginPath(); g.roundRect(x, y, 6, h, [9, 0, 0, 9]); g.fill();
    g.font = '800 24px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(String(v), x + 16, y + h / 2 + 1);
    const nw = g.measureText(String(v)).width;
    g.font = font(600, 12); g.fillStyle = C.muted;
    const words = lab.split(' '), lines = ['']; words.forEach(wd => { const t = lines.at(-1) ? lines.at(-1) + ' ' + wd : wd; if (g.measureText(t).width > w - nw - 34 && lines.at(-1)) lines.push(wd); else lines[lines.length - 1] = t; });
    lines.forEach((l, i) => g.fillText(l, x + 26 + nw, y + h / 2 + (i - (lines.length - 1) / 2) * 14));
  }
  function legend(g, x, y) {
    const it = [['arm', C.navy, 0], ['ideal camera', 'rgba(21,32,68,.5)', 1], ['feeler rays', '#e0a92d', 0], ['hallway rays', C.player, 1], ['push', C.red, 0]];
    it.forEach(([n, col, dash], i) => {
      const xx = x + (i % 2) * 112, yy = y + Math.floor(i / 2) * 20;
      g.strokeStyle = col; g.lineWidth = 3; if (dash) g.setLineDash([4, 3]); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 20, yy); g.stroke(); g.setLineDash([]);
      text(g, n, xx + 26, yy, C.muted, 12);
    });
  }

  /* ---------- slide 1: the lab ---------- */
  const PRESETS = [
    ['None', {}], ['Collision', { col: 1 }], ['Old push-up', { up: 1 }], ['Prediction + collision', { pred: 1, col: 1 }],
    ['All five', { col: 1, pred: 1, quant: 1, hall: 1, res: 1 }], ['Dithering', { dith: 1 }],
  ];
  const TOUR = [
    ['Hallway', 1.6, 4.4, {}, 'The player swings the camera: with no solution it ends up in the hallway wall.'],
    ['Hallway', 1.6, 4.4, { hall: 1, col: 1 }, 'Hallway pull-in + collision: the side rays shorten the arm, the push is small.'],
    ['Looking up', 4.8, 7.6, {}, 'Low pitch with a long arm: the camera swings under the floor.'],
    ['Looking up', 4.8, 7.6, { quant: 1 }, 'Pitch quantizer: the arm shortens as the pitch drops ("change camera attributes based on pitch").'],
    ['Back to the wall', 8.8, 11.8, {}, 'The hero turns away from the wall: the camera ends up in the rock.'],
    ['Back to the wall', 8.8, 11.8, { pred: 1, col: 1 }, 'Prediction + collision: the feelers pull in early; collision only catches the rest.'],
    ['Corner with low ceiling', 14.6, 17.4, { up: 1 }, 'Old approach, push up over the head: the arm rises, hits the ceiling, drops. Jitter.'],
    ['Corner with low ceiling', 14.6, 17.4, { col: 1, pred: 1, res: 1 }, 'Collision resolve point: in the worst case the camera resolves to a placed point.'],
    ['Behind the pillar', 19.0, 22.0, { col: 1 }, 'Collision: the camera snaps in past the pillar (a jump).'],
    ['Behind the pillar', 19.0, 22.0, { dith: 1 }, 'Dithering: the pillar fades and the arm stays long. It does not help with walls.'],
  ];
  const TOUR_T = []; { let t = 0; TOUR.forEach(r => { TOUR_T.push(t); t += r[2] - r[1]; }); TOUR_T.push(t); }
  const TOUR_DUR = TOUR_T.at(-1);
  const RECT1 = { map: { x: 12, y: 30, w: 440, h: 440 }, view: { x: 466, y: 30, w: 562, h: 440 } };
  const MAP1 = { x0: -0.875, y1: 12.875, s: 32 };
  const V1 = makeView(562, 440), ASP1 = 562 / 440;
  const scenes = {};

  function drawLab(g, run, fr, set, head, cap, combat) {
    T.use(g); card(g);
    text(g, 'Top-down map', 16, 16, C.ink, 14, 700);
    text(g, 'Third-person view', 470, 16, C.ink, 14, 700);
    text(g, head, 1026, 16, C.goldInk, 14, 700, 'right');
    drawMap(g, RECT1.map, MAP1, fr, set, run);
    drawView(g, V1, fr, RECT1.view, set);
    drawSide(g, { x: 12, y: 480, w: 200, h: 96 }, fr);
    legend(g, 226, 492);
    text(g, `path ${fr.t.toFixed(1)} s · counts at 30 fps`, 226, 560, C.muted, 12);
    const sw = combat ? 182 : 276, xs = 466;
    stat(g, xs, 480, sw, 50, fr.cnt.hid, 'frames hero fully hidden', C.red);
    stat(g, xs + sw + 8, 480, sw, 50, fr.cnt.ins, 'frames camera inside geometry', C.red);
    if (combat) stat(g, xs + 2 * (sw + 8), 480, sw, 50, fr.cnt.lost, 'frames enemy lost', '#e0a92d');
    g.font = font(600, 13);
    const lines = []; let cur = '';
    cap.split(' ').forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > 556) { lines.push(cur); cur = wd; } else cur = t; }); lines.push(cur);
    lines.slice(0, 2).forEach((l, i) => text(g, l, xs + 2, 547 + i * 17, C.ink, 13));
  }

  canvasDemo('lab', (s, cv, g) => {
    const st = { tour: true, play: true, t: 0, tau: 0, held: false, set: { col: 1, pred: 1 }, D: RULES.dist, combat: false, tourIdx: -1, tabKey: '' };
    const tourBtn = $(s, '.cl-tour'), playBtn = $(s, '.cl-play'), tIn = $(s, '.cl-t'), tV = $(s, '.cl-tv'), dIn = $(s, '.cl-d'), dV = $(s, '.cl-dv');
    const boxes = $$(s, '.cl-tg input[data-k]'), cmb = $(s, '.cl-combat'), pre = $(s, '.cl-pre'), tab = $(s, '.cl-tab');
    pre.innerHTML = PRESETS.map(([n], i) => `<button class="btn" data-i="${i}">${n}</button>`).join('');
    const syncBoxes = set => boxes.forEach(b => { b.checked = !!set[b.dataset.k]; });
    const syncPre = () => $$(pre, '.btn').forEach(b => b.classList.toggle('on', setKey(PRESETS[+b.dataset.i][1]) === setKey(st.set)));
    const opts = () => ({ D: st.D, combat: st.combat, aspect: ASP1 });
    const manual = () => {
      if (!st.tour) return;
      st.tour = false; tourBtn.classList.remove('on');
      if (st.tourIdx >= 0) { const r = TOUR[st.tourIdx]; st.set = { ...r[3] }; }
      syncBoxes(st.set); syncPre();
    };
    tourBtn.onclick = () => { st.tour = true; st.play = true; st.t = 0; tourBtn.classList.add('on'); playBtn.textContent = '❚❚ Pause'; };
    playBtn.onclick = () => { manual(); st.play = !st.play; playBtn.textContent = st.play ? '❚❚ Pause' : '▶ Play'; if (st.play && st.tau >= PATHS.main.dur - .02) st.tau = 0; };
    tIn.oninput = () => { manual(); st.tau = +tIn.value; st.play = false; playBtn.textContent = '▶ Play'; };
    dIn.oninput = () => { manual(); st.D = +dIn.value; dV.textContent = st.D.toFixed(1) + ' m'; };
    boxes.forEach(b => b.onchange = () => { manual(); st.set[b.dataset.k] = b.checked ? 1 : 0; syncPre(); });
    cmb.onchange = () => { manual(); st.combat = cmb.checked; };
    $$(pre, '.btn').forEach(b => b.onclick = () => { manual(); st.set = { ...PRESETS[+b.dataset.i][1] }; syncBoxes(st.set); syncPre(); });
    syncBoxes(st.set); syncPre();

    function table() {
      const k = [st.D, st.combat, setKey(st.set)].join('|'); if (k === st.tabKey) return; st.tabKey = k;
      const rows = PRESETS.slice(); if (!rows.some(r => setKey(r[1]) === setKey(st.set))) rows.push(['Your toggles', st.set]);
      tab.innerHTML = `<tr><th>solutions</th><th>hidden</th><th>inside</th>${st.combat ? '<th>enemy lost</th>' : ''}</tr>` + rows.map(([n, set]) => {
        const r = simulate('main', set, 0, PATHS.main.dur, opts()), c = r.frames.at(-1).cnt;
        return `<tr class="${setKey(set) === setKey(st.set) ? 'on' : ''}"><td>${n}</td><td>${c.hid}</td><td>${c.ins}</td>${st.combat ? `<td>${c.lost}</td>` : ''}</tr>`;
      }).join('');
    }
    function tourFrame(t) {
      t = ((t % TOUR_DUR) + TOUR_DUR) % TOUR_DUR;
      let k = 0; while (k < TOUR.length - 1 && t >= TOUR_T[k + 1]) k++;
      const [leg, a, b, set, cap] = TOUR[k], tau = a + (t - TOUR_T[k]);
      const run = simulate('main', set, a, b, opts());
      if (k !== st.tourIdx) { st.tourIdx = k; syncBoxes(set); $$(pre, '.btn').forEach(bt => bt.classList.toggle('on', setKey(PRESETS[+bt.dataset.i][1]) === setKey(set))); }
      return { run, fr: run.at(tau), set, head: `${leg} · ${k + 1}/${TOUR.length}`, cap, tau };
    }
    function paint(dt) {
      let o;
      if (st.tour) { o = tourFrame(st.t); st.tau = o.tau; }
      else {
        if (st.play) { st.tau += dt; if (st.tau > PATHS.main.dur + 1) st.tau = 0; }
        const run = simulate('main', st.set, 0, PATHS.main.dur, opts());
        o = { run, fr: run.at(Math.min(st.tau, PATHS.main.dur)), set: st.set, head: 'Your toggles · whole path', cap: 'Toggle solutions, scrub the path, compare the counters (and the table on the right).' };
      }
      drawLab(g, o.run, o.fr, o.set, o.head, o.cap, st.combat);
      tIn.value = Math.min(st.tau, PATHS.main.dur); tV.textContent = Math.min(st.tau, PATHS.main.dur).toFixed(1) + ' s';
      table();
    }
    scenes.lab = { seek(t) { st.held = true; st.tour = true; st.t = t; paint(0); }, dur: () => TOUR_DUR };
    return dt => {
      if (st.held) return;
      dt = Math.max(0, Math.min(dt, .1));
      if (st.tour) st.t += dt;
      paint(dt);
    };
  });

  /* ---------- slide 2: the combat trade-off ---------- */
  const SETS2 = { pc: [{ pred: 1, col: 1 }, 'Prediction + collision'], c: [{ col: 1 }, 'Collision only'], d: [{ dith: 1 }, 'Dithering only (Elden Ring)'], dc: [{ dith: 1, col: 1 }, 'Dithering + collision'] };
  const V2 = [makeView(502, 262), makeView(502, 262)], ASP2 = 502 / 262;
  const COLS2 = [12, 526], MAP2 = x => ({ x0: -1.6, y1: 8.1, s: 33 });
  const PHASES = [[0, 'The fight starts in the open'], [2.4, 'The player orbits: the pillar comes between camera and hero'], [9.0, 'The hero backs up to the wall']];
  function drawFight(g, runs, t, keys) {
    T.use(g); card(g);
    const ph = PHASES.filter(p => t >= p[0]).at(-1)[1];
    runs.forEach((run, i) => {
      const x = COLS2[i], fr = run.at(t), set = SETS2[keys[i]][0];
      text(g, SETS2[keys[i]][1], x + 4, 16, C.ink, 14, 700);
      drawView(g, V2[i], fr, { x, y: 30, w: 502, h: 262 }, set, { chips: false });
      drawMap(g, { x, y: 318, w: 502, h: 208 }, MAP2(i), fr, set, run, { labels: false });
      const sw = 164;
      stat(g, x, 534, sw, 44, fr.cnt.lost, 'frames enemy lost', '#e0a92d');
      stat(g, x + sw + 5, 534, sw, 44, fr.cnt.hid, 'frames hero hidden', C.red);
      stat(g, x + 2 * (sw + 5), 534, sw, 44, fr.cnt.ins, 'frames inside geometry', C.red);
    });
    text(g, ph, W / 2, 305, C.goldInk, 14, 700, 'center');
  }
  canvasDemo('combat', (s, cv, g) => {
    const st = { tour: true, play: true, t: 0, held: false, keys: ['pc', 'd'], sk: '' };
    const tourBtn = $(s, '.cb-tour'), playBtn = $(s, '.cb-play'), tIn = $(s, '.cb-t'), tV = $(s, '.cb-tv');
    const DUR = PATHS.fight.dur;
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.play = true; st.t = 0; st.keys = ['pc', 'd']; sync(); tourBtn.classList.add('on'); playBtn.textContent = '❚❚ Pause'; };
    playBtn.onclick = () => { manual(); st.play = !st.play; playBtn.textContent = st.play ? '❚❚ Pause' : '▶ Play'; };
    tIn.oninput = () => { manual(); st.t = +tIn.value; st.play = false; playBtn.textContent = '▶ Play'; };
    const sync = () => { $$(s, '.cb-a .btn').forEach(b => b.classList.toggle('on', b.dataset.s === st.keys[0])); $$(s, '.cb-b .btn').forEach(b => b.classList.toggle('on', b.dataset.s === st.keys[1])); };
    $$(s, '.cb-a .btn').forEach(b => b.onclick = () => { manual(); st.keys[0] = b.dataset.s; sync(); });
    $$(s, '.cb-b .btn').forEach(b => b.onclick = () => { manual(); st.keys[1] = b.dataset.s; sync(); });
    const runs = () => st.keys.map(k => simulate('fight', SETS2[k][0], 0, DUR, { D: RULES.dist, combat: true, aspect: ASP2 }));
    function info(rs) {
      const k = st.keys.join() + Math.round(st.t * 2); if (k === st.sk) return; st.sk = k;
      const f = rs.map(r => r.at(st.t).cnt);
      say($(s, '.cb-stats'), `<div class="y"><b>${f[0].lost}</b><span>enemy lost, left camera</span></div><div class="y"><b>${f[1].lost}</b><span>enemy lost, right camera</span></div><div class="r"><b>${f[1].ins}</b><span>right camera inside geometry</span></div>`);
      say($(s, '.cb-out'), st.keys[1] === 'd' ? 'Collision and prediction solve occlusion and walls together, but pull the camera in during combat. Dithering keeps the camera’s footprint, but it is art-heavy, can break immersion ("why are things going invisible?") and does not solve walls.'
        : 'Dithering + collision keeps the enemy in view around the pillar and stays out of the wall, at the art cost of fading every occluder that can fade.');
    }
    function paint() { const rs = runs(); drawFight(g, rs, Math.min(st.t, DUR), st.keys); tIn.value = Math.min(st.t, DUR); tV.textContent = Math.min(st.t, DUR).toFixed(1) + ' s'; info(rs); }
    scenes.combat = { seek(t) { st.held = true; st.t = t; paint(); }, dur: () => DUR };
    return dt => {
      if (st.held) return;
      dt = Math.max(0, Math.min(dt, .1));
      if (st.play) { st.t += dt; if (st.t > DUR + 1.2) st.t = 0; }
      paint();
    };
  });

  window.__seek = (t, which = 'lab') => scenes[which].seek(t);
  window.__dur = (which = 'lab') => scenes[which].dur();
  window.__clip = { simulate, PATHS, TOUR, RULES };
})();
