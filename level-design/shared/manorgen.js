/* MANORGEN: a seeded generator for manor-family floor plans, plus the rule checks that score any plan it makes.
   Every plan starts from a recipe (how many towers and wings, which wing shapes, which hall, a garden, the edge
   rooms). generate() then builds that recipe from parts, using the rules in layout/MANOR-STUDY.md: a hall on the
   main grid, a heavy round tower nested in the corner between the hall and its lower hall, each wing hinged on a hall
   corner and turned onto its own grid with a stair on the seam, lesser turrets on outside corners, thin walls at the
   edge. Doors are not drawn at fixed spots: required ones join the parts, the rest are picked from the free walls.
   check(plan) knows nothing about how the plan was made: it works from the geometry (wall segments and their weights,
   room polygons, doors, stairs), so it can also score a plan that breaks a rule on purpose (opt.breakRule) or one
   drawn by hand in the same format.
   Units are metres. Works in the browser (window.MANORGEN) and in node (module.exports), for layout/manor-smoke.js. */
(function (root) {
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = a => Math.hypot(a[0], a[1]), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const neg = a => [-a[0], -a[1]], cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const BREAKS = { turns: 'Equal turns', weight: 'One wall weight', stairs: 'No stairs', doors: 'Doors in line' };
  const HALLS = { aisle1: 'nave and one aisle', aisle2: 'nave and two aisles', square: 'square great hall', cross: 'nave, aisle and a transept' };
  const SHAPES = { bar2: 'two-room bar', L: 'L', T: 'T', court: 'court' };

  /* ---- the recipe: what this manor must contain. Anything given in `o` is kept, the rest is rolled. ---- */
  function recipe(seed, o = {}) {
    const R = rng(seed * 104729 + 71), pick = a => a[Math.floor(R() * a.length)], has = k => o[k] !== undefined && o[k] !== null;
    if (!Object.keys(o).some(k => k !== 'breakRule' && has(k)) && R() < .1) return { classic: true, hall: 'aisle1', wings: 2, shapes: ['bar2', 'L'], towers: 1, garden: 0, loggia: true, apse: true, porch: true, outbuilding: true, crossAisle: true };
    const rolled = { hall: pick(['aisle1', 'aisle1', 'aisle2', 'square', 'cross']), wings: pick([1, 2, 2, 2, 3, 3]), towers: pick([1, 1, 1, 2, 2, 3, 4]), garden: R() < .5 ? 1 : 0 };
    const pool = ['bar2', 'L', 'T', 'court']; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    let loggia = R() < .55, apse = R() < .55, porch = R() < .35, outbuilding = R() < .5; const crossAisle = R() < .5;
    const hall = has('hall') ? o.hall : rolled.hall; let wings = has('wings') ? +o.wings : rolled.wings;
    if (hall === 'cross') wings = Math.min(wings, 2);                       // the transept takes the side a third wing would need
    if (o.breakRule === 'turns') wings = Math.max(2, wings);                // equal turns need two wings to show
    const shapes = (o.shapes || pool).slice(0, wings);
    if (hall === 'cross' && wings === 2 && !shapes.some(s => s === 'L' || s === 'bar2')) shapes[0] = 'L';   // an end wing is short
    const towers = clamp(has('towers') ? +o.towers : rolled.towers, 1, 4), garden = has('garden') ? +o.garden : rolled.garden;
    if (!loggia && !apse && !porch) { if (R() < .5) apse = true; else porch = true; }                      // one small room, for scale
    if (!loggia && !porch && !garden && !outbuilding && !shapes.includes('court')) porch = true;           // one thin edge
    return { hall, wings, shapes, towers, garden, loggia, apse, porch, outbuilding, crossAisle };
  }
  const describe = b => [b.classic && 'the study plan', HALLS[b.hall], `${b.towers} tower${b.towers > 1 ? 's' : ''}`, `${b.wings} wing${b.wings > 1 ? 's' : ''} (${b.shapes.map(s => SHAPES[s]).join(', ')})`, b.garden && 'a walled garden', b.loggia && 'a loggia', b.apse && 'an apse', b.porch && 'a porch', b.outbuilding && 'an outbuilding'].filter(Boolean).join(' · ');

  function inPoly(p, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  const isRoom = f => f.room[0] !== '_';
  function roomAt(P, p) { const f = P.floors.find(f => isRoom(f) && inPoly(p, f.pts)); return f ? f.room : 'outside'; }
  // two doors of one room that look straight at each other
  function facingPair(d1, d2) {
    const shared = d1.rooms.find(r => r !== 'outside' && d2.rooms.includes(r)); if (!shared) return null;
    if (Math.abs(dot(d1.n, d2.n)) < .978) return null;                              // walls more than 12° apart
    const v = sub(mid(d2.a, d2.b), mid(d1.a, d1.b)), across = Math.abs(dot(v, d1.n)), side = Math.abs(v[0] * d1.n[1] - v[1] * d1.n[0]);
    return across > .5 && side < (d1.w + d2.w) / 2 * .6 ? shared : null;
  }

  function generate(seed, opt = {}) {
    const brk = opt.breakRule || null, B = opt.recipe || recipe(seed, { ...(opt.brief || {}), breakRule: brk });
    if (B.classic) return Object.assign(classic(seed, opt), { brief: B, skel: 'the study plan' });
    const R = rng(seed * 7919 + 13), U = (a, b) => a + (b - a) * R(), pick = a => a[Math.floor(R() * a.length)];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const floors = [], specs = [], lines = [], stairs = [], labels = [], opens = [], curves = [];
    const LVL = { aisle: 2, 'east aisle': 2, nave: 1, 'great hall': 1, 'lower hall': 1, tower: 3, gallery: 2, 'long wing': 3, 'L wing': 0, range: 3, 'bay room': 2, 'court wing': 0, transept: 2, apse: 2 };
    const fl = (room, pts, tint) => floors.push({ room, pts, lv: LVL[room] ?? (room.startsWith('turret') ? 3 : 1), tint });
    const here = p => roomAt({ floors }, p), taken = p => floors.some(f => inPoly(p, f.pts));
    // a wall is kept as a spec until the end, so doors can still be cut into it. ext: an outside wall; door: free for the door pass
    const wall = (a, b, type = 'std', o = {}) => { const L = len(sub(b, a)), s = { a, b, type, L, dir: L ? [(b[0] - a[0]) / L, (b[1] - a[1]) / L] : [1, 0], ext: !!o.ext, door: !!o.door, hall: !!o.hall, gaps: [], ko: [] }; if (L > .05) specs.push(s); return s; };
    const gap = (s, g0, g1, open) => { s.gaps.push({ g0, g1, open: !!open }); return s; };
    const at = (s, t) => add(s.a, s.dir, t);
    const line = (pts, type, curve) => lines.push({ pts, type, curve: !!curve });
    const stair = (F, p0, p1, q0, q1, n, alongP) => {
      const treads = []; for (let i = 0; i <= n; i++) { const t = i / n; treads.push(alongP ? [F(p0 + (p1 - p0) * t, q0), F(p0 + (p1 - p0) * t, q1)] : [F(p0, q0 + (q1 - q0) * t), F(p1, q0 + (q1 - q0) * t)]); }
      stairs.push({ quad: [F(p0, q0), F(p1, q0), F(p1, q1), F(p0, q1)], treads });
    };
    const arc = (c, rr, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]; });
    const lab = (t, p, col) => labels.push({ t, p, col });
    // free stretches of a wall: away from its ends, its doors and anything already attached to it
    const freeInt = (s, pad = .35) => { let iv = [[pad, s.L - pad]]; [...s.ko, ...s.gaps.map(g => [g.g0 - .45, g.g1 + .45])].forEach(([k0, k1]) => { iv = iv.flatMap(([a, b]) => k1 <= a || k0 >= b ? [[a, b]] : [[a, k0], [k1, b]].filter(([x, y]) => y - x > .05)); }); return iv; };
    const endFree = (s, atEnd, need) => [...s.ko, ...s.gaps.map(g => [g.g0, g.g1])].every(([a, b]) => (atEnd ? s.L - b : a) >= need);
    const outN = s => { const n = [-s.dir[1], s.dir[0]], m = at(s, s.L / 2); const o1 = here(add(m, n, .3)) === 'outside' && !taken(add(m, n, .3)), o2 = here(add(m, n, -.3)) === 'outside' && !taken(add(m, n, -.3)); return o1 && !o2 ? n : o2 && !o1 ? neg(n) : null; };
    // would a door on this wall look straight across a room at a door already cut? (geometry only, so it works before the far side is built)
    const faces = (s, g0, g1) => { const m = at(s, (g0 + g1) / 2), n = [-s.dir[1], s.dir[0]], w = g1 - g0; return specs.some(o => o !== s && Math.abs(dot(o.dir, s.dir)) > .978 && o.gaps.some(g => { if (g.open) return false; const m2 = at(o, (g.g0 + g.g1) / 2), v = sub(m2, m), across = Math.abs(dot(v, n)), side = Math.abs(cross(v, n)); if (across < .5 || across > 12 || side >= (w + g.g1 - g.g0) / 2 * .6) return false; const u = [v[0] / len(v), v[1] / len(v)], rm = here(mid(m, m2)); return rm !== 'outside' && here(add(m, u, .4)) === rm && here(add(m2, u, -.4)) === rm; })); };
    // is this patch of ground free? sample a box given by an origin and two axes
    const clear = (o, u, v, u0, u1, v0, v1) => { for (let i = 0; i <= 8; i++) for (let j = 0; j <= 6; j++) { if (taken(add(add(o, u, u0 + (u1 - u0) * i / 8), v, v0 + (v1 - v0) * j / 6))) return false; } return true; };

    /* ---- the tower's size sets the hall: the hall must be long enough to hold the tower and the lower hall beside it ---- */
    const r = U(2.3, 3.0), k = .83 * r, e = Math.sqrt(r * r - k * k), ek = e + k, hd = U(1.6, 2.1);
    const CN = { N: ['NW', 'NE'], S: ['SE', 'SW'], W: ['SW', 'NW'] };
    /* ---- where the wings go: a side each, a hinge corner each, turns that are unequal and not all one way ---- */
    const sideSets = B.hall === 'cross' ? (B.wings === 2 ? [['N', 'S']] : [['S'], ['S'], ['N']]) : B.wings === 3 ? [['W', 'N', 'S']] : B.wings === 2 ? [['W', 'S'], ['W', 'S'], ['W', 'N'], ['N', 'S']] : [['W'], ['W'], ['S']];
    const sides = pick(sideSets), HOPT = { W: ['s', 'e'], N: ['s'], S: ['s', 'e'] };
    let combos = [[]]; sides.forEach(sd => { combos = combos.flatMap(c => HOPT[sd].map(h => [...c, h])); });
    combos = combos.filter(c => c.length < 2 || new Set(c).size > 1);            // hinged at the start turns one way, at the end the other
    const hinges = pick(combos), mags = []; let m0 = U(14, 17); sides.forEach(() => { mags.push(m0); m0 += U(2.6, 3.6); }); shuffle(mags);
    const shapes = shuffle(B.shapes.slice()), ni = sides.indexOf('N');
    if (ni >= 0 && shapes[ni] !== 'L') { const j = shapes.indexOf('L'), j2 = shapes.indexOf('bar2'); if (j >= 0) [shapes[ni], shapes[j]] = [shapes[j], shapes[ni]]; else if (shapes[ni] !== 'bar2') { if (j2 >= 0) [shapes[ni], shapes[j2]] = [shapes[j2], shapes[ni]]; else shapes[ni] = 'L'; } }   // the end of the hall is short: it takes the compact shapes
    const wings = sides.map((sd, i) => ({ side: sd, h: hinges[i], theta: brk === 'turns' ? mags[0] : mags[i], shape: shapes[i], hc: hinges[i] === 's' ? CN[sd][0] : CN[sd][1], fc: hinges[i] === 's' ? CN[sd][1] : CN[sd][0] }));
    const claimed = new Set(['NE', ...wings.map(w => w.hc)]);
    wings.forEach(w => { const full = w.side !== 'N' && !claimed.has(w.fc) && R() < .6; if (full) claimed.add(w.fc); w.f = full ? 1 : w.side === 'N' ? U(.6, .8) : U(.55, .8); w.tan = Math.tan(rad(w.theta)); });
    let L = ek + hd + (B.hall === 'square' ? U(.9, 2.0) : U(1.2, 3.4)), strips;
    const At = area(arc([k, e], r, Math.atan2(-e, -k), Math.atan2(k, e)).concat([[0, ek]])), twin = (a, b) => Math.abs(a - b) / Math.max(a, b) < .14;
    const ww = wings.find(w => w.side === 'W'), wedge = () => ww ? (ww.f * L) ** 2 * ww.tan / 2 : 0;
    if (B.hall === 'square') { let w = U(4.6, 5.6); while (twin(w * L, At)) w += .3; strips = [['great hall', w]]; }
    else {
      let wn = U(2.5, 3.2), wb = B.hall === 'aisle2' ? U(1.7, 2.3) : 0; while (twin(wn * L, At)) wn += .3; while (wb > 1.5 && twin(wb * L, At)) wb -= .25;
      // the aisle's width is chosen after the wing's wedge is known, so aisle and nave never come out the same size
      const wa = clamp((U(.55, .8) * wn * L - wedge()) / L, 1.7, wn - .3); while (twin(wa * L + wedge(), wn * L) || twin(wn * L, At)) wn += .3;
      strips = [['aisle', wa], ['nave', wn]]; if (wb) strips.push(['east aisle', wb]);
    }
    const W = strips.reduce((m, s) => m + s[1], 0);
    const eastRoom = strips[strips.length - 1][0], mainRoom = B.hall === 'square' ? 'great hall' : 'nave';
    const SD = { N: { o: [0, 0], d: [1, 0], n: [0, -1], L: W }, S: { o: [W, L], d: [-1, 0], n: [0, 1], L: W }, W: { o: [0, L], d: [0, -1], n: [-1, 0], L } };
    wings.forEach(w => { const s = SD[w.side]; w.tH = w.h === 's' ? 0 : s.L; w.tS = w.h === 's' ? w.f * s.L : (1 - w.f) * s.L; });
    const wingOn = {}; wings.forEach(w => wingOn[w.side] = w);
    // points along a hall side from t0 to t1, pushed out where a wing's seam opens a wedge
    const ptsOn = (key, t0, t1) => {
      const s = SD[key], w = wingOn[key], P = (t, o = 0) => add(add(s.o, s.d, t), s.n, o);
      if (!w) return [P(t0), P(t1)];
      const lo = Math.min(w.tH, w.tS), hi = Math.max(w.tH, w.tS), off = t => t >= lo - 1e-9 && t <= hi + 1e-9 ? Math.abs(t - w.tH) * w.tan : 0, oS = off(w.tS), above = w.tS < w.tH, eq = (a, b) => Math.abs(a - b) < 1e-6, out = [];
      if (eq(t0, w.tS)) { out.push(P(t0)); if (above) out.push(P(t0, oS)); } else out.push(P(t0, off(t0)));
      if (w.tS > t0 + 1e-6 && w.tS < t1 - 1e-6) out.push(...(above ? [P(w.tS), P(w.tS, oS)] : [P(w.tS, oS), P(w.tS)]));
      if (eq(t1, w.tS)) { if (!above) out.push(P(t1, oS)); out.push(P(t1)); } else out.push(P(t1, off(t1)));
      return out;
    };

    /* ---- the hall: strips divided by piers, on the main grid ---- */
    let x0 = 0; const divs = [];
    strips.forEach(([name, w], i) => {
      const x1 = x0 + w, last = i === strips.length - 1, pts = [...ptsOn('N', x0, x1)];
      if (last) pts.push([W, L]);
      pts.push(...ptsOn('S', W - x1, W - x0));
      if (i === 0) pts.push(...ptsOn('W', 0, L));
      fl(name, pts); lab(name, [x0 + w / 2 - (i === 0 && strips.length > 1 ? .2 : 0), L * (i === 0 ? .5 : .46)]);
      if (!last) divs.push(x1); x0 = x1;
    });
    divs.forEach(x => { const a = ptsOn('N', x, x)[0], b = ptsOn('S', W - x, W - x)[0]; wall(a, b, 'piers'); line([[x - .08, a[1] + .08], [x - .08, b[1] - .05]], 'edge'); opens.push([[x, L * .4], [x, L * .6]]); });
    if (B.hall === 'square') { const x = W * U(.34, .42); wall([x, .9], [x, L - .9], 'piers'); line([[x - .08, .95], [x - .08, L - .95]], 'edge'); }
    ['N', 'S', 'W'].forEach(key => {
      const s = SD[key], w = wingOn[key], P = (t, o = 0) => add(add(s.o, s.d, t), s.n, o);
      if (!w) { wall(P(0), P(s.L), 'std', { ext: true, door: true, hall: true }); return; }
      if (w.f < 1) { const a = w.h === 's' ? w.tS : 0, b = w.h === 's' ? s.L : w.tS; wall(P(a), P(b), 'std', { ext: true, door: true, hall: true }); }
      wall(P(w.tS), P(w.tS, Math.abs(w.tS - w.tH) * w.tan), 'std', { ext: true });                        // closes the wedge, on the main grid
    });
    if (B.hall === 'cross') {                                                                           // a transept arm off the aisle
      const aw = U(2.4, 3.0), ad = U(1.8, 2.4), ya = U(.9, L - aw - .9); fl('transept', [[-ad, ya], [0, ya], [0, ya + aw], [-ad, ya + aw]]);
      const ws = specs.find(s => s.hall && Math.abs(s.a[0]) < 1e-6 && Math.abs(s.b[0]) < 1e-6); gap(ws, L - ya - aw + .3, L - ya - .3, true); ws.ko.push([L - ya - aw - .2, L - ya + .2]);
      wall([-ad, ya], [0, ya], 'std', { ext: true, door: true }); wall([-ad, ya + aw], [0, ya + aw], 'std', { ext: true, door: true }); wall([-ad, ya], [-ad, ya + aw], 'std', { ext: true, door: true });
      lab('transept', [-ad / 2, ya + aw / 2]);
    }
    if (B.crossAisle && B.hall !== 'square') { const y = L - 1, w = wingOn.W, xw = w && (L - y) >= Math.min(w.tH, w.tS) && (L - y) <= Math.max(w.tH, w.tS) ? -Math.abs(L - y - w.tH) * w.tan : 0; wall([xw, y], [strips[0][1], y], 'piers'); }

    /* ---- the tower: heavy arc nested between the hall and the lower hall, its squared corner carrying both doors ---- */
    const cx = W + k, cy = e, TC = [cx, cy], BPx = cx + e, a0 = Math.atan2(-e, -k), a1 = Math.atan2(k, e);
    fl('tower', arc(TC, r, a0, a1).concat([[W, ek]]));
    line(arc(TC, r, a0 - .002, a1 + .002), 'heavy', true); curves.push({ c: TC, r, type: 'heavy', room: 'tower' });
    const g1 = ek * U(.28, .5), g2 = ek * U(.3, .5);
    gap(wall([W, 0], [W, ek], 'std'), g1, g1 + .85); gap(wall([W, ek], [BPx, ek], 'std'), g2, g2 + 1.0);
    [0, .32, .64].forEach(o => line([[W + .1, cy - 1 + o], [cx + 1 - o, cy - 1 + o], [cx + 1 - o, cy + k - .1]], 'edge'));
    fl('lower hall', [[W, ek], [BPx, ek], [BPx, ek + hd], [W, ek + hd]]); opens.push([[W, ek + hd * .25], [W, ek + hd * .75]]);
    lab('tower', [cx + .2, cy - r * .6]); lab('lower hall', [(W + BPx) / 2, ek + hd * .52]);
    wall([W, ek + hd], [W, L], 'std', { ext: true, door: true, hall: true });
    wall([W, ek + hd], [BPx, ek + hd], 'std', { ext: true, door: true });
    if (B.loggia) {                                                                                     // an open side behind piers, with a thin outer wall
      const lw = Math.min(1.12, .44 * r - .03), xo = BPx + lw, yArc = cy + Math.sqrt(Math.max(0, r * r - (xo - cx) ** 2)), aL = Math.atan2(yArc - cy, xo - cx);
      fl('loggia', [[BPx, ek], [BPx, ek + hd], [xo, ek + hd], ...arc(TC, r, aL, a1, 8)], '#f3efe2');
      wall([BPx, ek], [BPx, ek + hd], 'piers'); wall([xo, yArc], [xo, ek + hd], 'thin'); opens.push([[BPx, ek + hd * .3], [BPx, ek + hd * .7]]);
      gap(wall([BPx, ek + hd], [xo, ek + hd], 'thin'), .14, lw - .14); lab('loggia', [BPx + lw / 2, ek + hd * .55]);
    } else wall([BPx, ek], [BPx, ek + hd], 'std', { ext: true, door: true });

    /* ---- the wings: each a frame turned about its hinge; p runs along the hall side, q away from it ---- */
    wings.forEach((w, wi) => {
      const s = SD[w.side], th = rad(w.theta), dir = w.h === 's' ? s.d : neg(s.d), Hc = add(s.o, s.d, w.tH);
      const ph = add([dir[0] * Math.cos(th), dir[1] * Math.cos(th)], s.n, Math.sin(th)); let qh = [-ph[1], ph[0]]; if (dot(qh, s.n) < 0) qh = neg(qh);
      const F = (p, q) => add(add(Hc, ph, p), qh, q), c = w.f * s.L / Math.cos(th), ext = w.f === 1 ? U(.15, .6) : U(.2, 1.6);
      const maxN = w.side === 'N' ? (W - .3) / Math.cos(th) : 99; let shape = w.shape;
      if (shape === 'bar2' && maxN < 5.3) shape = 'L'; w.shape = shape;
      const minLen = { bar2: 5.2, L: 4.0, T: 5.9, court: 7.4 }[shape], lw = Math.min(maxN, Math.max(c + ext, minLen + U(0, .5)));
      const seam = shape !== 'bar2' && w.side === 'W' && c * Math.sin(th) >= 1.05 + 1.7 * Math.sin(th) && R() < .65;
      const p1 = 1.05 / Math.sin(th), edge = wall(F(0, 0), F(Math.min(c, lw), 0), 'std');
      if (lw > c + .05) wall(F(c, 0), F(lw, 0), 'std', { ext: true, door: lw - c > 1.8 });
      const beside = (w.side === 'W' ? [strips[0][0]] : strips.map(x => x[0])).map(n => area(floors.find(f => f.room === n).pts)), grow = fn => { let d = 0; while (d < 2.2 && beside.some(a => twin(fn(d), a))) d += .6; return d; };
      const O = { ext: true, door: true }, room = (name, pts, lp) => { if (floors.some(f => f.room === name)) name += ' II'; fl(name, pts.map(p => F(...p))); floors[floors.length - 1].lv = LVL[name.replace(' II', '')] ?? 1; lab(name, F(...lp)); };
      let sq;                                                                      // how far the head stair reaches across the wing
      if (shape === 'bar2') {
        const dw = U(3.6, 4.4), sdp = 1.7, pu = .5 * dw, pv = Math.min(U(3.0, 3.5), lw - 2.5); sq = .62 * dw;
        room('gallery', [[0, 0], [0, dw], [pv, dw], [pv, pu], [sdp, pu], [sdp, 0]], [sdp - .1, .78 * dw]);
        room('long wing', [[sdp, 0], [sdp, pu], [pv, pu], [pv, dw], [lw, dw], [lw, 0]], [(pv + lw) / 2 + .2, dw / 2]);
        wall(F(0, 0), F(0, dw), 'std', { ext: true }); wall(F(0, dw), F(lw, dw), 'std', O); wall(F(lw, dw), F(lw, 0), 'std', O);
        wall(F(sdp, 0), F(sdp, pu)); wall(F(sdp, pu), F(pv, pu)); gap(wall(F(pv, pu), F(pv, dw)), .55, 1.3);
      } else if (shape === 'L') {
        const ql = U(2.0, 2.6), lg = Math.min(U(2.5, 3.1), lw - 1.6), bl0 = ql + U(2.4, 3.2), a = lw - lg, bl = bl0 + grow(d => lw * ql + lg * (bl0 + d - ql)); sq = Math.min(ql - .25, 2.1);
        room('L wing', [[0, 0], [0, ql], [a, ql], [a, bl], [lw, bl], [lw, 0]], [a + lg / 2, bl * .55]);
        wall(F(0, 0), F(0, ql), 'std', { ext: true }); wall(F(0, ql), F(a, ql), 'std', O); wall(F(a, ql), F(a, bl), 'std', O); wall(F(a, bl), F(lw, bl), 'std', O); wall(F(lw, bl), F(lw, 0), 'std', O);
      } else if (shape === 'T') {
        const ql = U(2.0, 2.5), lg = U(2.4, 3.0), bl = ql + U(2.4, 3.2), pm = clamp(lw * U(.48, .62), 2.0 + lg / 2, lw - lg / 2 - 1.2), a = pm - lg / 2, b = pm + lg / 2; sq = Math.min(ql - .25, 2.1);
        room('range', [[0, 0], [0, ql], [lw, ql], [lw, 0]], [lw * .5 + .9, ql * .5]); room('bay room', [[a, ql], [a, bl], [b, bl], [b, ql]], [pm, (ql + bl) / 2 + .2]);
        wall(F(0, 0), F(0, ql), 'std', { ext: true }); wall(F(0, ql), F(a, ql), 'std', O); wall(F(a, ql), F(a, bl), 'std', O); wall(F(a, bl), F(b, bl), 'std', O); wall(F(b, bl), F(b, ql), 'std', O); wall(F(b, ql), F(lw, ql), 'std', O); wall(F(lw, ql), F(lw, 0), 'std', O);
        const g = U(.5, lg - 1.35); gap(wall(F(a, ql), F(b, ql)), g, g + .85);
      } else {
        const ql = U(2.0, 2.4), lg = U(2.2, 2.6), bl0 = ql + U(2.6, 3.4), b = lw - lg, bl = bl0 + grow(d => lw * ql + 2 * lg * (bl0 + d - ql)); sq = Math.min(ql - .25, 2.1);
        room('court wing', [[0, 0], [0, bl], [lg, bl], [lg, ql], [b, ql], [b, bl], [lw, bl], [lw, 0]], [lw / 2, ql * .5]);
        floors.push({ room: '_court', pts: [[lg, ql], [b, ql], [b, bl + .02], [lg, bl + .02]].map(p => F(...p)), lv: 1, tint: 'rgba(126,170,98,.2)' }); lab('court', F(lw / 2, (ql + bl) / 2), '#4f7a43');
        wall(F(0, 0), F(0, bl), 'std', { ext: true }); wall(F(0, bl), F(lg, bl), 'std', O); wall(F(lg, bl), F(lg, ql), 'std', O); wall(F(lg, ql), F(b, ql), 'std', O); wall(F(b, ql), F(b, bl), 'std', O); wall(F(b, bl), F(lw, bl), 'std', O); wall(F(lw, bl), F(lw, 0), 'std', O);
        const gm = (lg + b) / 2; wall(F(lg, bl), F(gm - .6, bl), 'thin'); wall(F(gm + .6, bl), F(b, bl), 'thin');
      }
      // into the wing: either at its head and straight up a stair, or through a door with the stair lying in the seam
      if (seam) { const pd = U(.6, p1 - 1.35); gap(edge, pd, pd + .9); edge.ko.push([p1 - .3, c]); if (brk !== 'stairs') stair(F, p1, c - .3, -.95, -.12, Math.max(4, Math.round((c - .3 - p1) / .28)), true); }
      else { gap(edge, .3, 1.45, true); if (brk !== 'stairs') stair(F, .08, 1.6, .1, sq, 8, false); }
    });

    /* ---- the walled garden goes first: it needs the longest free wall ---- */
    const hostWalls = (minFree, hallOnly) => shuffle(specs.filter(s => s.type === 'std' && s.ext && s.door && (!hallOnly || s.hall))).map(s => ({ s, n: outN(s), iv: freeInt(s, .2).filter(([a, b]) => b - a >= minFree) })).filter(h => h.n && h.iv.length);
    const plantGarden = () => { for (let gi = 0; gi < B.garden; gi++) {                                                             // a walled garden: thin walls, a door from the house, a gate out
      for (const h of [...hostWalls(4.4, false), ...hostWalls(3.4, false)]) {
        const [a, b] = pick(h.iv), gl = Math.min(b - a, U(4.6, 7)), t0 = U(a, b - gl), s = h.s, o = at(s, t0), hf = floors.find(f => f.room === here(add(at(s, t0 + gl / 2), h.n, -.4))), ha = hf ? area(hf.pts) : 0; let gd = U(3.0, 4.4); while (twin(gl * gd, ha)) gd += .5;
        if (!clear(o, s.dir, h.n, -.5, gl + .5, .3, gd + .7)) continue;
        const A0 = o, A1 = at(s, t0 + gl), A2 = add(A1, h.n, gd), A3 = add(A0, h.n, gd); let nearStart = R() < .5;
        if (faces(s, t0 + (nearStart ? .5 : gl - 1.4), t0 + (nearStart ? 1.4 : gl - .5))) nearStart = !nearStart;
        if (faces(s, t0 + (nearStart ? .5 : gl - 1.4), t0 + (nearStart ? 1.4 : gl - .5))) continue;
        floors.push({ room: 'garden', pts: [A0, A1, A2, A3], lv: 1, tint: '#dfe8cf' }); lab('garden', add(mid(A0, A2), h.n, .2), '#4f7a43');
        wall(A0, A3, 'thin'); wall(A1, A2, 'thin'); const dh = nearStart ? .5 : gl - 1.4, dg = nearStart ? gl - 1.6 : .7;
        gap(wall(A3, A2, 'thin'), dg, dg + .9); gap(s, t0 + dh, t0 + dh + .9); s.ko.push([t0 - .2, t0 + gl + .2]); break;
      }
    } };
    if (B.towers < 3) plantGarden();                                             // with many turrets wanted, the corners are claimed first

    /* ---- lesser towers: a turret on an outside corner, where two outside walls meet square ---- */
    const corners = [];
    specs.forEach((s1, i) => specs.slice(i + 1).forEach(s2 => {
      if (s1.type !== 'std' || s2.type !== 'std' || !s1.ext || !s2.ext) return;
      [[s1.a, s1.dir, 0], [s1.b, neg(s1.dir), 1]].forEach(([K, d1, e1]) => [[s2.a, s2.dir, 0], [s2.b, neg(s2.dir), 1]].forEach(([K2, d2, e2]) => {
        if (len(sub(K, K2)) > .02 || Math.abs(dot(d1, d2)) > .06) return;
        const inn = add(K, add(d1, d2), .45), rm = here(inn); if (rm === 'outside' || taken(add(K, add(d1, d2), -.45))) return;
        corners.push({ K, d1, d2, s1, s2, e1, e2, rm });
      }));
    }));
    shuffle(corners); let nt = 1;
    for (const c of [...corners, ...corners]) {
      if (nt >= B.towers) break; if (c.used) continue;
      const rt = c.tried ? 1.3 : Math.max(1.3, r * U(.5, .58)); c.tried = true; if (c.s1.L < rt + 1 || c.s2.L < rt + 1) continue;
      if (curves.some(q => len(sub(q.c, c.K)) < q.r + rt + .8)) continue;
      let ok = true; for (let i = 0; i < 20 && ok; i++) { const a = i / 20 * 2 * Math.PI, v = [Math.cos(a), Math.sin(a)]; if (dot(v, c.d1) > -.05 && dot(v, c.d2) > -.05) continue; if (taken(add(c.K, v, rt * .55)) || taken(add(c.K, v, rt * 1.12))) ok = false; }
      if (!ok || !endFree(c.s1, c.e1, rt + .4) || !endFree(c.s2, c.e2, rt + .4)) continue;
      const face = [[c.s1, c.e1], [c.s2, c.e2]].map(([s, en]) => [s, en ? s.L - 1.05 : .3, en ? s.L - .3 : 1.05]).find(([s, g0, g1]) => !faces(s, g0, g1)); if (!face) continue;
      gap(...face); c.used = true;
      const aa = Math.atan2(c.d1[1], c.d1[0]), sweep = cross(c.d1, c.d2) > 0 ? -1.5 * Math.PI : 1.5 * Math.PI, name = ['turret', 'turret II', 'turret III'][nt - 1], pts = arc(c.K, rt, aa, aa + sweep, 30);
      fl(name, pts.concat([c.K])); line(pts, 'std', true); curves.push({ c: c.K, r: rt, type: 'std', room: name });
      c.s1.ko.push(c.e1 ? [c.s1.L - rt - .3, c.s1.L] : [0, rt + .3]); c.s2.ko.push(c.e2 ? [c.s2.L - rt - .3, c.s2.L] : [0, rt + .3]);
      lab(name, add(c.K, add(c.d1, c.d2), -rt * .42)); nt++;
    }

    if (B.towers >= 3) plantGarden();
    /* ---- the edge rooms the recipe asks for, each attached to a free outside wall ---- */
    if (B.apse) {                                                                                       // a small curve, a third of the tower
      const ra = r / 3;
      for (const h of [...hostWalls(2 * ra + .9, true), ...hostWalls(2 * ra + .9, false)]) {
        const [a, b] = pick(h.iv), t = U(a + ra + .4, b - ra - .4), s = h.s, o = at(s, t);
        if (!clear(o, s.dir, h.n, -ra - .4, ra + .4, .25, .9 + ra + .6) || faces(s, t - .35, t + .35)) continue;
        const C = add(o, h.n, .9), cap = Array.from({ length: 13 }, (_, i) => add(add(C, s.dir, ra * Math.cos(Math.PI * i / 12)), h.n, ra * Math.sin(Math.PI * i / 12)));
        fl('apse', [add(o, s.dir, -ra), add(o, s.dir, ra), ...cap]); wall(add(o, s.dir, -ra), add(C, s.dir, -ra)); wall(add(o, s.dir, ra), add(C, s.dir, ra));
        line(cap, 'std', true); curves.push({ c: C, r: ra, type: 'std', room: 'apse' }); gap(s, t - .35, t + .35); s.ko.push([t - ra - .3, t + ra + .3]); lab('apse', add(C, h.n, .1)); break;
      }
    }
    if (B.porch) {                                                                                      // a thin box at a door, entered from the side
      for (const h of hostWalls(2.3, false)) {
        const [a, b] = pick(h.iv), t = U(a + 1.1, b - 1.1), s = h.s, o = at(s, t);
        if (!clear(o, s.dir, h.n, -1.3, 1.3, .25, 1.7) || faces(s, t - .42, t + .42)) continue;
        const Q0 = add(o, s.dir, -.85), Q1 = add(o, s.dir, .85), Q2 = add(Q1, h.n, 1.15), Q3 = add(Q0, h.n, 1.15);
        fl('porch', [Q0, Q1, Q2, Q3], '#f3efe2'); wall(Q3, Q2, 'thin'); wall(Q0, Q3, 'thin'); gap(wall(Q1, Q2, 'thin'), .2, .95);
        gap(s, t - .42, t + .42); s.ko.push([t - 1.1, t + 1.1]); lab('porch', add(o, h.n, .6)); break;
      }
    }
    let yard = null;
    if (B.outbuilding) {                                                                                // two unequal bays on the main grid, across a yard
      const all = floors.flatMap(f => f.pts), bx0 = Math.min(...all.map(p => p[0])), bx1 = Math.max(...all.map(p => p[0])), by0 = Math.min(...all.map(p => p[1])), by1 = Math.max(...all.map(p => p[1]));
      const tw = U(3.2, 3.8), hw = U(3.5, 4.0), bw = hw + tw, g = U(1.9, 2.6);
      for (const sd of shuffle(['below', 'above', 'left', 'right'])) {
        const ox = sd === 'left' ? bx0 - g - bw : sd === 'right' ? bx1 + g : U(bx0, Math.max(bx0, bx1 - bw)), oy = sd === 'above' ? by0 - g - 3.3 : sd === 'below' ? by1 + g : U(by0, Math.max(by0, by1 - 3.3)), mx = ox + hw;
        if (!clear([ox, oy], [1, 0], [0, 1], -.8, bw + .8, -.8, 4.1)) continue;
        fl('outbuilding', [[ox, oy], [mx, oy], [mx, oy + 3.3], [ox, oy + 3.3]], '#ece5d4'); fl('store', [[mx, oy + 1], [mx + tw, oy + 1], [mx + tw, oy + 3.1], [mx, oy + 3.1]], '#ece5d4');
        gap(wall([ox, oy], [mx, oy]), 1.5, 2.3); gap(wall([mx, oy], [mx, oy + 3.3]), 1.5, 2.4); wall([ox, oy], [ox, oy + 3.3], 'thin'); wall([ox, oy + 3.3], [mx, oy + 3.3]);
        gap(wall([mx, oy + 1], [mx + tw, oy + 1], 'thin'), tw - 1.3, tw - .4); wall([mx + tw, oy + 1], [mx + tw, oy + 3.1], 'thin'); wall([mx, oy + 3.1], [mx + tw, oy + 3.1], 'thin');
        wall([mx + tw / 2, oy + 1], [mx + tw / 2, oy + 1.6], 'thin'); wall([mx + tw / 2, oy + 2.55], [mx + tw / 2, oy + 3.1], 'thin');
        const yx0 = Math.min(ox, sd === 'right' ? bx1 : ox) - .6, yx1 = Math.max(ox + bw, sd === 'left' ? bx0 : ox + bw) + .6, yy0 = Math.min(oy, sd === 'below' ? by1 - .4 : oy) - .6, yy1 = Math.max(oy + 3.3, sd === 'above' ? by0 + .4 : oy + 3.3) + .6;
        yard = { room: '_yard', pts: [[yx0, yy0], [yx1, yy0], [yx1, yy1], [yx0, yy1]], lv: 1, tint: 'rgba(126,170,98,.18)', yard: true };
        lab('outbuilding', [ox + hw / 2, oy + 1.7]); lab('store', [mx + tw / 2, oy + 2.05]); break;
      }
    }

    /* ---- doors: cut the required ones, then add doors on free outside walls until the routes loop ---- */
    const doors = [], edges = [], rooms = new Set();
    const link = (a, b) => { rooms.add(a); rooms.add(b); edges.push([a, b]); };
    const mk = (a, b, open) => { const m = mid(a, b), t = sub(b, a), w = len(t), n = [-t[1] / w, t[0] / w]; return { a, b, n, w, open: !!open, rooms: [here(add(m, n, .35)), here(add(m, n, -.35))] }; };
    const push = d => { doors.push(d.open ? { a: d.a, b: d.b, rooms: d.rooms, open: true, n: d.n, w: d.w } : { a: d.a, b: d.b, rooms: d.rooms, n: d.n, w: d.w }); link(...d.rooms); };
    opens.forEach(([a, b]) => push(mk(a, b, true)));
    specs.forEach(s => s.gaps.forEach(g => { g.done = true; push(mk(at(s, g.g0), at(s, g.g1), g.open)); }));
    const loops = () => edges.length - rooms.size + 1, outs = () => doors.filter(d => d.rooms.includes('outside')).length;
    const target = 4 + Math.floor(R() * 3), cands = shuffle(specs.filter(s => s.ext && s.door && s.type === 'std'));
    const touches = (s, rm) => { const m = at(s, s.L / 2), n = [-s.dir[1], s.dir[0]]; return here(add(m, n, .35)) === rm || here(add(m, n, -.35)) === rm; };
    cands.sort((a, b) => (touches(b, mainRoom) ? 1 : 0) - (touches(a, mainRoom) ? 1 : 0));               // the main room gets its way out first
    for (let pass = 0; pass < 2; pass++) for (const s of cands) {
      if (loops() >= target && outs() >= 4) break;
      if (pass === 0 && s.gaps.length) continue;
      for (let tries = 0; tries < 3; tries++) {
        const w = U(.8, 1.0), iv = freeInt(s).filter(([a, b]) => b - a >= w); if (!iv.length) break;
        const [a, b] = pick(iv), g0 = U(a, b - w), d = mk(at(s, g0), at(s, g0 + w));
        if (d.rooms[0] === d.rooms[1] || doors.some(o => !o.open && facingPair(d, o))) continue;
        gap(s, g0, g0 + w); s.gaps[s.gaps.length - 1].done = true; push(d); break;
      }
    }
    if (brk === 'doors') {                                                                              // put a door straight across a room from another
      for (const d1 of doors.filter(d => !d.open)) {
        const m = mid(d1.a, d1.b), sgn = [1, -1].find(k => here(add(m, d1.n, .5 * k)) !== 'outside'); if (!sgn) continue;
        const dirn = [d1.n[0] * sgn, d1.n[1] * sgn], rm = here(add(m, dirn, .5)); let best = null;
        specs.forEach(s => { if (s.type !== 'std' || Math.abs(dot(s.dir, dirn)) > .2) return; const den = cross(dirn, s.dir); if (Math.abs(den) < 1e-6) return; const dist = cross(sub(s.a, m), s.dir) / den, t = cross(sub(s.a, m), dirn) / den; if (dist > .9 && dist < 8 && t > .7 && t < s.L - .7 && (!best || dist < best.dist)) best = { s, t, dist }; });
        if (!best || best.s.gaps.some(g => best.t > g.g0 - .9 && best.t < g.g1 + .9) || here(add(m, dirn, best.dist - .3)) !== rm) continue;
        const d = mk(at(best.s, best.t - .43), at(best.s, best.t + .43)); if (d.rooms[0] === d.rooms[1] || !facingPair(d, d1)) continue;
        gap(best.s, best.t - .43, best.t + .43); push(d); break;
      }
    }
    const walls = [];
    specs.forEach(s => { let t = 0; [...s.gaps.slice().sort((a, b) => a.g0 - b.g0), { g0: s.L, g1: s.L }].forEach(g => { if (g.g0 > t + .01) walls.push({ pts: [at(s, t), at(s, g.g0)], type: s.type }); t = Math.max(t, g.g1); }); });
    lines.forEach(l => walls.push(l.curve ? { pts: l.pts, type: l.type, curve: true } : { pts: l.pts, type: l.type }));
    if (yard) floors.unshift(yard);
    if (brk === 'weight') walls.forEach(w => { if (w.type !== 'edge') w.type = 'std'; });

    /* ---- mirror and turn the whole plan, then move it to the origin ---- */
    const flip = R() < .5, ext0 = floors.flatMap(f => f.pts), wide = Math.max(...ext0.map(p => p[0])) - Math.min(...ext0.map(p => p[0])) >= Math.max(...ext0.map(p => p[1])) - Math.min(...ext0.map(p => p[1])), turn = (wide ? 0 : 1) + 2 * Math.floor(R() * 2);
    const Tp = p => { let x = flip ? -p[0] : p[0], y = p[1]; for (let i = 0; i < turn; i++) [x, y] = [-y, x]; return [x, y]; };
    const all = [];
    const map = pts => pts.map(p => { const q = Tp(p); all.push(q); return q; });
    floors.forEach(f => f.pts = map(f.pts)); walls.forEach(w => w.pts = map(w.pts));
    stairs.forEach(s => { s.quad = map(s.quad); s.treads = s.treads.map(map); });
    doors.forEach(dr => { [dr.a, dr.b] = map([dr.a, dr.b]); delete dr.n; delete dr.w; }); curves.forEach(c => { [c.c] = map([c.c]); });
    labels.forEach(l => { l.p = Tp(l.p); });
    const minX = Math.min(...all.map(p => p[0])), minY = Math.min(...all.map(p => p[1]));
    const sh = p => { p[0] -= minX; p[1] -= minY; };
    new Set(all).forEach(sh); labels.forEach(l => sh(l.p));
    const w = Math.max(...all.map(p => p[0])), h = Math.max(...all.map(p => p[1]));
    const skel = [B.hall, wings.map(x => x.side + x.h + x.shape + (x.f === 1 ? 'f' : 'p')).join('+'), curves.length].join('|');   // the arrangement, ignoring sizes and doors
    return { seed, breakRule: brk, brief: { ...B, shapes: wings.map(x => x.shape) }, floors, walls, stairs, labels, doors, edges, curves, rooms, w, h, skel, params: { turns: wings.map(x => x.theta), r, W, L, flip, turn } };
  }

  /* ---- the plan the study measured, played with random numbers inside its ranges: one fixed arrangement, kept as a member of the family ---- */
  function classic(seed, opt = {}) {
    const R = rng(seed * 7919 + 13), U = (a, b) => a + (b - a) * R(), brk = opt.breakRule || null;
    /* ---- the numbers, each inside the range the study measured ---- */
    const alpha = U(14, 23); let beta = U(15, 24);
    if (Math.abs(alpha - beta) < 2.5) beta = alpha + (alpha > 19 ? -3 : 3);
    if (brk === 'turns') beta = alpha;
    const wn = U(2.5, 3.2), wa = Math.max(1.8, wn - U(.35, .9));               // nave and aisle widths, never equal
    const r = clamp(.45 * (wn + wa) + U(-.1, .3), 2.3, 3.0), k = .83 * r, e = Math.sqrt(r * r - k * k);   // tower
    const ca = Math.cos(rad(alpha)), sa = Math.sin(rad(alpha)), cb = Math.cos(rad(beta)), sb = Math.sin(rad(beta));
    const xN = wa, xE = wa + wn, cx = xE + k, cy = e, BPx = cx + e;
    let d = U(1.45, 1.7), hd = U(1.6, 2.1);                                     // stair band depth; lower hall depth
    let dl = -(d + (xN - BPx) * sb) / cb; if (dl < 0) { d = -(xN - BPx) * sb; dl = 0; }
    const Lh = hd + dl + e + k, y1 = Lh, BPy = y1 - dl, BP = [BPx, BPy];        // hall length follows from the seam
    const uA = [-ca, -sa], vA = [-sa, ca], A = (u, v) => add(add([0, 0], uA, u), vA, v);       // north-west wing's grid
    const pB = [-cb, sb], qB = [sb, cb], B = (p, q) => add(add(BP, pB, p), qB, q);             // south wing's grid
    const C = [xN, y1], Ls = dot(sub(C, BP), pB), ll = wn / cb + U(.05, .3), p0 = Ls - ll;     // seam length; landing
    const wA = U(3.6, 4.4), lA = (Lh + U(.15, .6)) / ca, sd = 1.6, su = .62 * wA, pu = .5 * wA, pv = U(3.0, 3.5);
    const pl = U(2.4, 3.0), ql = U(1.3, 1.55), bl = ql + U(3.0, 3.5);
    const lw = Math.min(1.12, .44 * r - .03), xo = BPx + lw, ra = r / 3, ax = xN - .43 - ra;

    const floors = [], walls = [], stairs = [], labels = [], doors = [], edges = [], curves = [], rooms = new Set();
    const LVL = { aisle: 2, nave: 1, 'lower hall': 1, tower: 3, gallery: 2, 'long wing': 3, 'L wing': 0, landing: 1, apse: 2 };
    const fl = (room, pts, tint) => floors.push({ room, pts, lv: LVL[room] ?? 1, tint });
    const link = (a, b) => { rooms.add(a); rooms.add(b); edges.push([a, b]); };
    // a wall from a to b in one of five weights. gaps are doors: [from, to, room, room] in metres from a.
    const wall = (a, b, type = 'std', gaps = []) => {
      const L = len(sub(b, a)), dir = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; let t = 0;
      gaps.forEach(([g0, g1, r1, r2]) => { doors.push({ a: add(a, dir, g0), b: add(a, dir, g1), rooms: [r1, r2] }); link(r1, r2); });
      [...gaps, [L, L]].forEach(([g0, g1]) => { if (g0 > t + .01) walls.push({ pts: [add(a, dir, t), add(a, dir, g0)], type }); t = g1; });
    };
    const open = (a, b, r1, r2) => { doors.push({ a, b, rooms: [r1, r2], open: true }); link(r1, r2); };   // joined without a door
    const line = (pts, type) => walls.push({ pts, type });
    const stair = (at, u0, u1, v0, v1, n, alongU) => {
      const treads = []; for (let i = 0; i <= n; i++) { const t = i / n; treads.push(alongU ? [at(u0 + (u1 - u0) * t, v0), at(u0 + (u1 - u0) * t, v1)] : [at(u0, v0 + (v1 - v0) * t), at(u1, v0 + (v1 - v0) * t)]); }
      stairs.push({ quad: [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], treads });
    };
    const arc = (c, rr, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]; });
    const lab = (t, p, col) => labels.push({ t, p, col });

    /* ---- 2. the hall: a nave you walk and an aisle one step up, divided by piers ---- */
    const xS = -Lh * sa / ca, yq = y1 - wn * sb / cb;        // aisle's south-west corner; where the stair band meets the nave's east line
    fl('aisle', [[0, 0], [xN, 0], C, [xS, y1]]);
    fl('nave', [[xN, 0], [xE, 0], [xE, yq], C]);
    wall([0, 0], [xE, 0], 'std', [[xN + .5, xN + 1.4, 'nave', 'outside']]);
    wall([xS, y1], C, 'std', [[ax - .35 - xS, ax + .35 - xS, 'aisle', 'apse']]);
    wall([xN, 0], C, 'piers'); line([[xN - .08, .08], [xN - .08, y1 - .05]], 'edge'); open([xN, y1 * .4], [xN, y1 * .6], 'nave', 'aisle');
    lab('nave', [xN + wn / 2, y1 * .47]); lab('aisle', [xN / 2 - .2, y1 * .5]);

    /* ---- 3. the tower: heavy arc, a squared corner that bites into the hall and carries both doors ---- */
    const a0 = Math.atan2(-e, -k), a1 = Math.atan2(k, e), TC = [cx, cy];
    fl('tower', arc(TC, r, a0, a1).concat([[xE, cy + k]]));
    line(arc(TC, r, a0 - .002, a1 + .002), 'heavy'); walls[walls.length - 1].curve = true; curves.push({ c: TC, r, type: 'heavy', room: 'tower' });
    wall([xE, 0], [xE, cy + k], 'std', [[(e + k) * .38, (e + k) * .38 + .85, 'nave', 'tower']]);
    wall([xE, cy + k], [BPx, cy + k], 'std', [[(e + k) * .4, (e + k) * .4 + 1.0, 'tower', 'lower hall']]);
    [0, .32, .64].forEach(o => line([[xE + .1, cy - 1 + o], [cx + 1 - o, cy - 1 + o], [cx + 1 - o, cy + k - .1]], 'edge'));
    fl('lower hall', [[xE, cy + k], [BPx, cy + k], BP, B(p0, 0), B(p0, -d), [xE, yq]]);
    open([xE, cy + k + (yq - cy - k) * .3], [xE, cy + k + (yq - cy - k) * .7], 'nave', 'lower hall');
    lab('tower', [cx + .2, cy - r * .6]); lab('lower hall', [BPx - 1.15, cy + k + hd * .52]);

    /* ---- 4. north-west wing: hinged on the hall's corner, square inside itself, carved into an L ---- */
    const Kb = A(wA, 0), Kc = A(wA, lA), Kd = A(0, lA), yd = brk === 'doors' ? pu + .75 : .7;
    fl('gallery', [A(0, 0), Kb, A(wA, pv), A(pu, pv), A(pu, sd + .1), A(0, sd + .1)]);
    fl('long wing', [A(0, sd + .1), A(pu, sd + .1), A(pu, pv), A(wA, pv), Kc, Kd]);
    wall([0, 0], Kb); wall(Kb, Kc); wall(A(0, sd + .1), Kd);
    wall(Kd, Kc, 'std', [[yd, yd + .95, 'long wing', 'outside']]);
    wall(A(0, sd + .1), A(pu, sd + .1)); wall(A(pu, sd + .1), A(pu, pv));
    wall(A(pu, pv), A(wA, pv), 'std', [[.85, 1.6, 'gallery', 'long wing']]);
    open(A(0, .3), A(0, sd - .2), 'aisle', 'gallery');
    [A(yd - .15, lA), A(yd + 1.1, lA)].forEach(p => line([p, add(p, vA, 1.1)], 'thin'));
    lab('gallery', A(wA * .78, sd)); lab('long wing', A(wA / 2, (pv + lA) / 2 + .2));

    /* ---- 5. south wing: turned the other way, an L under the tower; its seam cuts the hall on the diagonal ---- */
    const B2 = B(Ls, 0);
    fl('L wing', [B(0, 0), B2, B(Ls, bl), B(pl, bl), B(pl, ql), B(0, ql)]);
    fl('landing', [B(p0, -d), C, B2, B(p0, 0)]);
    wall(BP, B2, 'std', [[Ls - 1.3, Ls - .35, 'landing', 'L wing']]);
    wall(B(0, ql), B(pl, ql)); wall(B(pl, ql), B(pl, bl), 'std', [[.7, 1.8, 'L wing', 'outside']]); wall(B(pl, bl), B(Ls, bl));
    wall(B2, B(Ls, bl), 'std', [[bl - 1.05, bl - .2, 'L wing', 'outside']]);
    wall(B(0, 0), B(0, ql), 'std', [[(ql - .9) / 2, (ql + .9) / 2, 'porch', 'L wing']]);
    wall(B(p0, -d), C); wall(C, B2); wall(B(p0, -d), B(p0, 0), 'std', [[.4, 1.2, 'lower hall', 'landing']]);
    lab('L wing', B((pl + Ls) / 2 + .2, bl * .55)); lab('landing', B(Ls - .75, -d / 2));

    /* ---- 6. stairs in the seams: along the south seam in two flights, along the wing's head in the north-west ---- */
    if (brk !== 'stairs') {
      stair(A, .1, su, .08, sd - .05, 8, true);
      stair(B, Math.max(.9, p0 - 2.2), p0 - .1, -d + .05, -.12, 7, true);
      stair(B, p0 + .35, Ls - 1.5, -d + .05, -.12, Math.max(3, Math.round((ll - 1.85) / .28)), true);
      stair(B, Ls + .12, Ls + 1.1, bl - 3.3, bl - 1.15, 6, false);
    }
    fl('_steps', [B(Ls + .12, bl - 3.4), B(Ls + 1.1, bl - 3.4), B(Ls + 1.1, bl - .1), B(Ls + .12, bl - .1)], '#f3efe2');
    line([B(Ls + .12, bl - 3.4), B(Ls + 1.1, bl - 3.4), B(Ls + 1.1, bl - .1), B(Ls + .12, bl - .1)], 'thin');

    /* ---- 7. thin edges: loggia behind piers, a porch on the wing's grid, a cross-aisle; and the apse on the hinge ---- */
    const yArc = cy + Math.sqrt(Math.max(0, r * r - (xo - cx) ** 2)), aL = Math.atan2(yArc - cy, xo - cx);
    fl('loggia', [[BPx, cy + k], BP, [xo, BPy], ...arc(TC, r, aL, a1, 8)], '#f3efe2');
    wall([BPx, cy + k], BP, 'piers'); wall([xo, yArc], [xo, BPy], 'thin'); open([BPx, cy + k + hd * .3], [BPx, cy + k + hd * .7], 'lower hall', 'loggia');
    const P1 = [xo, BPy], P2 = B(-lw * cb, ql), Lc = B(0, ql), pw = lw * cb;
    fl('porch', [BP, P1, P2, Lc], '#f3efe2'); wall(P1, P2, 'thin'); wall(P2, Lc, 'thin', [[.12, pw - .12, 'porch', 'outside']]);
    line([[BPx + .04, BPy], P1], 'edge'); open([BPx + .2, BPy], [xo - .2, BPy], 'loggia', 'porch');
    wall([-(y1 - 1) * sa / ca, y1 - 1], [xN, y1 - 1], 'piers');
    fl('apse', [[ax - ra, y1], [ax + ra, y1], [ax + ra, y1 + .9], ...arc([ax, y1 + .9], ra, 0, Math.PI, 12), [ax - ra, y1 + .9]]);
    wall([ax - ra, y1], [ax - ra, y1 + .9]); wall([ax + ra, y1], [ax + ra, y1 + .9]);
    line(arc([ax, y1 + .9], ra, 0, Math.PI, 16), 'std'); walls[walls.length - 1].curve = true; curves.push({ c: [ax, y1 + .9], r: ra, type: 'std', room: 'apse' });
    lab('loggia', [BPx + lw / 2, cy + k + hd * .55]); lab('porch', mid(BP, P2)); lab('apse', [ax, y1 + 1.0]);

    /* ---- 8. the grounds: an outbuilding of two unequal bays on the main grid closes the yard ---- */
    const sx = Math.min(B(Ls + 1.1, bl - 3.4)[0], B(Ls + 1.1, bl - .1)[0]), tw = U(3.2, 3.8), hw = U(3.5, 4.0);
    const oy = Math.max(y1 + .9 + ra + .9, Kd[1] + 1.9, Kc[1] + 2.2), ox = sx - .45 - tw - hw, mx = ox + hw;
    fl('outbuilding', [[ox, oy], [mx, oy], [mx, oy + 3.3], [ox, oy + 3.3]], '#ece5d4'); fl('store', [[mx, oy + 1], [mx + tw, oy + 1], [mx + tw, oy + 3.1], [mx, oy + 3.1]], '#ece5d4');
    wall([ox, oy], [mx, oy], 'std', [[1.5, 2.3, 'outbuilding', 'outside']]); wall([mx, oy], [mx, oy + 3.3], 'std', [[1.5, 2.4, 'outbuilding', 'store']]);
    wall([ox, oy], [ox, oy + 3.3], 'thin'); wall([ox, oy + 3.3], [mx, oy + 3.3]);
    wall([mx, oy + 1], [mx + tw, oy + 1], 'thin', [[tw - 1.3, tw - .4, 'store', 'outside']]); wall([mx + tw, oy + 1], [mx + tw, oy + 3.1], 'thin'); wall([mx, oy + 3.1], [mx + tw, oy + 3.1], 'thin');
    wall([mx + tw / 2, oy + 1], [mx + tw / 2, oy + 1.6], 'thin'); wall([mx + tw / 2, oy + 2.55], [mx + tw / 2, oy + 3.1], 'thin');
    const yardL = Math.min(ox, Kc[0]) - .5, yardR = Math.max(B(Ls + 1.1, bl)[0], mx + tw) + .5;
    floors.unshift({ room: '_yard', pts: [[yardL, y1 + .5], [yardR, y1 + .5], [yardR, oy + 3.8], [yardL, oy + 3.8]], lv: 1, tint: 'rgba(126,170,98,.18)', yard: true });
    lab('yard', [(Kd[0] + mx) / 2 + .6, oy - .75], '#4f7a43'); lab('outbuilding', [ox + hw / 2, oy + 1.7]); lab('store', [mx + tw / 2, oy + 2.05]);

    if (brk === 'weight') walls.forEach(w => { if (w.type !== 'edge') w.type = 'std'; });

    /* ---- mirror and turn the whole plan, then move it to the origin ---- */
    const flip = R() < .5, turn = Math.floor(R() * 4);
    const Tp = p => { let x = flip ? -p[0] : p[0], y = p[1]; for (let i = 0; i < turn; i++) [x, y] = [-y, x]; return [x, y]; };
    const all = [];
    const map = pts => pts.map(p => { const q = Tp(p); all.push(q); return q; });
    floors.forEach(f => f.pts = map(f.pts)); walls.forEach(w => w.pts = map(w.pts));
    stairs.forEach(s => { s.quad = map(s.quad); s.treads = s.treads.map(map); });
    doors.forEach(dr => { [dr.a, dr.b] = map([dr.a, dr.b]); }); curves.forEach(c => { [c.c] = map([c.c]); });
    labels.forEach(l => { l.p = Tp(l.p); });
    const minX = Math.min(...all.map(p => p[0])), minY = Math.min(...all.map(p => p[1]));
    const sh = p => { p[0] -= minX; p[1] -= minY; };
    new Set(all).forEach(sh); labels.forEach(l => sh(l.p));
    const w = Math.max(...all.map(p => p[0])), h = Math.max(...all.map(p => p[1]));
    return { seed, breakRule: brk, floors, walls, stairs, labels, doors, edges, curves, rooms, w, h, params: { turns: [alpha, beta], r, flip, turn } };
  }

  /* ================= the rule checks: geometry in, verdicts out ================= */
  function segDist(p, a, b) { const ab = sub(b, a), t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1); return len(sub(p, add(a, ab, t))); }
  function area(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function segments(P, types) { const out = []; P.walls.forEach(w => { if (w.curve || !types.includes(w.type)) return; for (let i = 0; i + 1 < w.pts.length; i++) out.push({ a: w.pts[i], b: w.pts[i + 1], type: w.type }); }); return out; }
  // wall directions folded into (-45, 45], clustered: each cluster is one grid
  function grids(P) {
    const segs = segments(P, ['heavy', 'std', 'thin', 'piers']).map(s => { let a = deg(Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0])) % 90; if (a > 45) a -= 90; if (a <= -45) a += 90; return { ...s, ang: a, L: len(sub(s.b, s.a)) }; }).filter(s => s.L > .25);
    const cl = [];
    segs.sort((a, b) => a.ang - b.ang).forEach(s => { const c = cl[cl.length - 1]; if (c && s.ang - c.max < 1.5) { c.max = s.ang; c.sum += s.ang * s.L; c.L += s.L; c.segs.push(s); } else cl.push({ max: s.ang, sum: s.ang * s.L, L: s.L, segs: [s] }); });
    cl.forEach(c => c.ang = c.sum / c.L);
    // the main grid is the one the tower's flat faces sit on; without a tower, the grid with the most wall
    const big = (P.curves || []).reduce((m, c) => !m || c.r > m.r ? c : m, null), td = big && P.doors.find(d => d.rooms.includes(big.room) && !d.open);
    let ta = null; if (td) { ta = deg(Math.atan2(td.b[1] - td.a[1], td.b[0] - td.a[0])) % 90; if (ta > 45) ta -= 90; if (ta <= -45) ta += 90; }
    const near = ta === null ? null : cl.find(c => Math.min(Math.abs(c.ang - ta), 90 - Math.abs(c.ang - ta)) < 3);
    const main = near || cl.reduce((m, c) => c.L > m.L ? c : m, cl[0]);
    cl.forEach(c => { let t = c.ang - main.ang; if (t > 45) t -= 90; if (t <= -45) t += 90; c.turn = t; c.main = c === main; });
    return cl;
  }

  function check(P) {
    const out = [], rule = (id, label, pass, detail) => out.push({ id, label, pass: !!pass, detail });
    const G = grids(P), turned = G.filter(c => !c.main), turns = turned.map(c => c.turn);
    const fmt = t => (t > 0 ? '+' : '−') + Math.abs(t).toFixed(0) + '°';
    const slight = turned.filter(c => c.L < 8).length;
    rule('grids', 'One main grid, one more for each wing', G.length >= 2 && G.length <= 4 && !slight, slight ? 'a stray wall sits on a grid of its own' : `${G.length} grid${G.length === 1 ? '' : 's'}: 0°${turns.map(t => ', ' + fmt(t)).join('')}`);
    const opposite = turns.length < 2 || (turns.some(t => t > 0) && turns.some(t => t < 0)), unequal = turns.every((a, i) => turns.every((b, j) => i === j || Math.abs(Math.abs(a) - Math.abs(b)) >= 2)), small = turns.every(t => Math.abs(t) >= 12 && Math.abs(t) <= 27);
    rule('turns', 'Turns small, unequal, not all one way', turns.length >= 1 && opposite && unequal && small, !turns.length ? 'no wing is turned' : !opposite ? 'every wing turns the same way' : !unequal ? 'two wings turn by the same amount' : !small ? 'a turn is outside 12° to 27°' : `${turns.map(fmt).join(', ')}; none near 45°`);

    const types = new Set(P.walls.map(w => w.type));
    rule('weights', 'Five weights of boundary', types.size === 5, `${types.size} in use: ${[...types].join(', ')}`);
    const heavyStraight = P.walls.some(w => w.type === 'heavy' && !w.curve), big = P.curves.reduce((m, c) => !m || c.r > m.r ? c : m, null), sm = P.curves.reduce((m, c) => !m || c.r < m.r ? c : m, null);
    const bigHeavy = big && P.walls.some(w => w.curve && w.type === 'heavy');
    rule('anchor', 'Heaviest wall is the round anchor', bigHeavy && !heavyStraight, bigHeavy ? (heavyStraight ? 'a straight wall is as heavy as the tower' : `tower radius ${big.r.toFixed(1)} m`) : 'the tower is no heavier than the rest');
    const lesser = P.curves.filter(c => c !== big).map(c => c.r / big.r), tooBig = lesser.filter(q => q > .66).length;
    rule('curves', 'One big curve, the others clearly smaller', big && !tooBig && P.curves.length <= 5, !lesser.length ? 'the tower is the only curve' : tooBig ? 'a second curve rivals the tower' : `lesser curves at ${lesser.map(q => q.toFixed(2)).sort().join(', ')} of the tower`);
    const tDoors = big ? P.doors.filter(d => d.rooms.includes(big.room)) : [];
    rule('bite', 'Tower bites the hall, doors on its flat faces', tDoors.length >= 2 && tDoors.every(d => len(sub(mid(d.a, d.b), big.c)) < big.r * .95), `${tDoors.length} doors on the squared corner`);

    // every door and opening really joins the two rooms it claims to
    const real = P.doors.filter(d => !d.open), wrong = [];
    P.doors.forEach(d => { const m = mid(d.a, d.b), t = sub(d.b, d.a), L = len(t), n = [-t[1] / L, t[0] / L]; d.n = n; d.w = L; const got = [roomAt(P, add(m, n, .35)), roomAt(P, add(m, n, -.35))].sort().join('|'); if (got !== [...d.rooms].sort().join('|')) wrong.push(`${d.rooms.join(' to ')} opens ${got.replace('|', ' to ')}`); });
    rule('joins', 'Every door joins the rooms it should', !wrong.length, wrong.length ? wrong[0] : `${P.doors.length} doors and openings`);
    const odd = real.filter(d => d.w < .64 || d.w > 1.15);
    rule('doorw', 'Doors 0.65 to 1.1 m wide', !odd.length, odd.length ? `${odd[0].rooms.join(' to ')} is ${odd[0].w.toFixed(2)} m` : `${real.length} doors`);
    let facing = null;
    real.forEach((d1, i) => real.slice(i + 1).forEach(d2 => { const shared = !facing && facingPair(d1, d2); if (shared) facing = `two doors of the ${shared} line up`; }));
    rule('facing', 'No door faces a door', !facing, facing || 'every pair is offset');

    // rooms must not overlap: sample the plan on a 15 cm grid
    const rf = P.floors.filter(isRoom); let over = 0, pair = '';
    for (let x = .07; x < P.w; x += .15) for (let y = .07; y < P.h; y += .15) { let first = null; for (const f of rf) if (inPoly([x, y], f.pts)) { if (first && first !== f.room) { over++; pair = `${first} and ${f.room}`; break; } first = f.room; } }
    rule('overlap', 'No two rooms claim the same floor', over * .0225 < .4, over * .0225 < .4 ? 'rooms share walls, not floor' : `${pair} overlap by ${(over * .0225).toFixed(1)} m²`);

    // stairs belong on the seams: each touches a wall of a turned grid, and each turned grid has one
    const tw = turned.map(c => c.segs.filter(s => s.type === 'std'));
    const touch = (s, segs) => segs.some(w => s.quad.some(p => segDist(p, w.a, w.b) < .4));
    const stray = P.stairs.filter(s => !tw.some(segs => touch(s, segs))).length, bare = tw.filter(segs => !P.stairs.some(s => touch(s, segs))).length;
    rule('seams', 'A stair on every seam, none elsewhere', turned.length > 0 && !stray && !bare, bare ? `${bare} turned grid${bare > 1 ? 's have' : ' has'} no stair` : stray ? `${stray} stair${stray > 1 ? 's sit' : ' sits'} away from a seam` : `${P.stairs.length} flights, all on seams`);

    // gradient of enclosure: long thin walls face the outdoors, piers stand between two rooms
    const sides = s => { const m = mid(s.a, s.b), t = sub(s.b, s.a), L = len(t), n = [-t[1] / L, t[0] / L]; return [roomAt(P, add(m, n, .3)), roomAt(P, add(m, n, -.3))]; };
    const thinIn = segments(P, ['thin']).filter(s => len(sub(s.b, s.a)) > 1 && !sides(s).includes('outside')).length;
    const piersOut = segments(P, ['piers']).filter(s => sides(s).includes('outside')).length;
    rule('gradient', 'Walls get lighter towards the outside', !thinIn && !piersOut && types.has('thin') && types.has('piers'), thinIn ? 'a thin wall is buried indoors' : piersOut ? 'piers stand on an outside edge' : !types.has('thin') ? 'no thin walls at the edge' : 'thin walls outside, piers inside');

    const nRooms = P.rooms.size, loops = P.edges.length - nRooms + 1, outDoors = P.doors.filter(d => d.rooms.includes('outside')).length;
    rule('loops', 'Routes loop through the outdoors', loops >= 4 && outDoors >= 4, `${loops} loops, ${outDoors} doors to outside`);
    const A = {}; rf.forEach(f => A[f.room] = (A[f.room] || 0) + area(f.pts));
    const twins = P.edges.filter(([a, b]) => A[a] && A[b] && Math.abs(A[a] - A[b]) / Math.max(A[a], A[b]) < .06).map(e => e.join(' and '));
    const av = Object.values(A), spread = Math.max(...av) / Math.min(...av);
    rule('sizes', 'Neighbours differ in size', !twins.length && spread >= 6, twins.length ? `${twins[0]} are the same size` : `largest room ${spread.toFixed(0)}× the smallest`);
    if (P.brief) {                                                            // the plan must contain what its recipe asked for
      const b = P.brief, has = n => P.floors.some(f => f.room === n), nt = P.curves.filter(c => /^(tower|turret)/.test(c.room)).length, miss = [];
      if (nt !== b.towers) miss.push(`${nt} of ${b.towers} towers`);
      if (turned.length !== b.wings) miss.push(`${turned.length} of ${b.wings} wings`);
      ['garden', 'loggia', 'apse', 'porch', 'outbuilding'].forEach(k => { if (!!b[k] !== has(k)) miss.push(b[k] ? `no ${k}` : `an unasked ${k}`); });
      rule('brief', 'Delivers the recipe', !miss.length, miss.length ? miss.join(', ') : `${b.towers} tower${b.towers > 1 ? 's' : ''}, ${b.wings} wing${b.wings > 1 ? 's' : ''}${['garden', 'loggia', 'apse', 'porch', 'outbuilding'].filter(k => b[k]).map(k => ', ' + k).join('')}`);
    }
    return out;
  }

  // keep drawing drafts until one passes every check; report what was thrown away
  // the recipe is fixed by the seed (or given); only the drawing of it is retried
  function generatePassing(seed, opt = {}, max = 60) {
    const rejected = [], rec = opt.recipe || recipe(seed, { ...(opt.brief || {}), breakRule: opt.breakRule });
    for (let i = 0; i < max; i++) {
      const P = generate(seed + i * 100003, { ...opt, recipe: rec, breakRule: null }), res = check(P), fails = res.filter(r => !r.pass);
      if (!fails.length) { if (!opt.breakRule) return { plan: P, checks: res, rejected }; const Q = generate(seed + i * 100003, { ...opt, recipe: rec, breakRule: opt.breakRule }); return { plan: Q, checks: check(Q), rejected }; }
      rejected.push(fails.map(f => f.label));
    }
    const P = generate(seed, { ...opt, recipe: rec }); return { plan: P, checks: check(P), rejected };
  }

  const api = { generate, check, generatePassing, recipe, describe, BREAKS, HALLS, SHAPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MANORGEN = api;
})(typeof window !== 'undefined' ? window : globalThis);
