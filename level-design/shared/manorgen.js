/* MANORGEN: a seeded generator for manor-family floor plans, plus the rule checks that score any plan it makes.
   The rules come from layout/MANOR-STUDY.md. generate(seed, opt) plays the eight recipes with random numbers inside the
   ranges the study gives, then mirrors and turns the result. check(plan) knows nothing about how the plan was made: it
   works from the geometry (wall segments and their weights, room polygons, doors, stairs), so it can also score a plan
   that breaks a rule on purpose (opt.breakRule) or one drawn by hand in the same format.
   Units are metres. Works in the browser (window.MANORGEN) and in node (module.exports), for layout/manor-smoke.js. */
(function (root) {
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = a => Math.hypot(a[0], a[1]), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const BREAKS = { turns: 'Equal turns', weight: 'One wall weight', stairs: 'No stairs', doors: 'Doors in line' };

  function generate(seed, opt = {}) {
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
    return { seed, breakRule: brk, floors, walls, stairs, labels, doors, edges, curves, rooms, w, h, params: { alpha, beta, wn, wa, r, Lh, flip, turn } };
  }

  /* ================= the rule checks: geometry in, verdicts out ================= */
  function inPoly(p, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function segDist(p, a, b) { const ab = sub(b, a), t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1); return len(sub(p, add(a, ab, t))); }
  function area(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  const isRoom = f => f.room[0] !== '_';
  function roomAt(P, p) { const f = P.floors.find(f => isRoom(f) && inPoly(p, f.pts)); return f ? f.room : 'outside'; }
  function segments(P, types) { const out = []; P.walls.forEach(w => { if (w.curve || !types.includes(w.type)) return; for (let i = 0; i + 1 < w.pts.length; i++) out.push({ a: w.pts[i], b: w.pts[i + 1], type: w.type }); }); return out; }
  // wall directions folded into (-45, 45], clustered: each cluster is one grid
  function grids(P) {
    const segs = segments(P, ['heavy', 'std', 'thin', 'piers']).map(s => { let a = deg(Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0])) % 90; if (a > 45) a -= 90; if (a <= -45) a += 90; return { ...s, ang: a, L: len(sub(s.b, s.a)) }; }).filter(s => s.L > .25);
    const cl = [];
    segs.sort((a, b) => a.ang - b.ang).forEach(s => { const c = cl[cl.length - 1]; if (c && s.ang - c.max < 1.5) { c.max = s.ang; c.sum += s.ang * s.L; c.L += s.L; c.segs.push(s); } else cl.push({ max: s.ang, sum: s.ang * s.L, L: s.L, segs: [s] }); });
    cl.forEach(c => c.ang = c.sum / c.L);
    const main = cl.reduce((m, c) => c.L > m.L ? c : m, cl[0]);
    cl.forEach(c => { c.turn = c.ang - main.ang; c.main = c === main; });
    return cl;
  }

  function check(P) {
    const out = [], rule = (id, label, pass, detail) => out.push({ id, label, pass: !!pass, detail });
    const G = grids(P), turned = G.filter(c => !c.main), turns = turned.map(c => c.turn);
    const fmt = t => (t > 0 ? '+' : '−') + Math.abs(t).toFixed(0) + '°';
    rule('grids', 'Three grids, no more', G.length === 3, `${G.length} grid${G.length === 1 ? '' : 's'}: 0°${turns.map(t => ', ' + fmt(t)).join('')}`);
    const opposite = turns.length === 2 && turns[0] * turns[1] < 0, unequal = turns.length === 2 && Math.abs(Math.abs(turns[0]) - Math.abs(turns[1])) >= 2, small = turns.every(t => Math.abs(t) >= 12 && Math.abs(t) <= 27);
    rule('turns', 'Turns small, unequal and opposite', turns.length === 2 && opposite && unequal && small, turns.length !== 2 ? 'needs exactly two turned grids' : !opposite ? 'both wings turn the same way' : !unequal ? `both turn ${Math.abs(turns[0]).toFixed(0)}°` : !small ? 'a turn is outside 12° to 27°' : `${fmt(turns[0])} and ${fmt(turns[1])}, none near 45°`);

    const types = new Set(P.walls.map(w => w.type));
    rule('weights', 'Five weights of boundary', types.size === 5, `${types.size} in use: ${[...types].join(', ')}`);
    const heavyStraight = P.walls.some(w => w.type === 'heavy' && !w.curve), big = P.curves.reduce((m, c) => !m || c.r > m.r ? c : m, null), sm = P.curves.reduce((m, c) => !m || c.r < m.r ? c : m, null);
    const bigHeavy = big && P.walls.some(w => w.curve && w.type === 'heavy');
    rule('anchor', 'Heaviest wall is the round anchor', bigHeavy && !heavyStraight, bigHeavy ? (heavyStraight ? 'a straight wall is as heavy as the tower' : `tower radius ${big.r.toFixed(1)} m`) : 'the tower is no heavier than the rest');
    const ratio = big && sm && big !== sm ? sm.r / big.r : 0;
    rule('curves', 'Two curves, small one a third of the big', P.curves.length === 2 && ratio > .27 && ratio < .4, `${P.curves.length} curves, ratio ${ratio.toFixed(2)}`);
    const tDoors = big ? P.doors.filter(d => d.rooms.includes(big.room)) : [];
    rule('bite', 'Tower bites the hall, doors on its flat faces', tDoors.length >= 2 && tDoors.every(d => len(sub(mid(d.a, d.b), big.c)) < big.r * .95), `${tDoors.length} doors on the squared corner`);

    // every door and opening really joins the two rooms it claims to
    const real = P.doors.filter(d => !d.open), wrong = [];
    P.doors.forEach(d => { const m = mid(d.a, d.b), t = sub(d.b, d.a), L = len(t), n = [-t[1] / L, t[0] / L]; d.n = n; d.w = L; const got = [roomAt(P, add(m, n, .35)), roomAt(P, add(m, n, -.35))].sort().join('|'); if (got !== [...d.rooms].sort().join('|')) wrong.push(`${d.rooms.join(' to ')} opens ${got.replace('|', ' to ')}`); });
    rule('joins', 'Every door joins the rooms it should', !wrong.length, wrong.length ? wrong[0] : `${P.doors.length} doors and openings`);
    const odd = real.filter(d => d.w < .64 || d.w > 1.15);
    rule('doorw', 'Doors 0.65 to 1.1 m wide', !odd.length, odd.length ? `${odd[0].rooms.join(' to ')} is ${odd[0].w.toFixed(2)} m` : `${real.length} doors`);
    let facing = null;
    real.forEach((d1, i) => real.slice(i + 1).forEach(d2 => {
      const shared = d1.rooms.find(r => r !== 'outside' && d2.rooms.includes(r)); if (!shared || facing) return;
      if (Math.abs(dot(d1.n, d2.n)) < .978) return;                                // walls more than 12° apart
      const v = sub(mid(d2.a, d2.b), mid(d1.a, d1.b)), across = Math.abs(dot(v, d1.n)), side = Math.abs(v[0] * d1.n[1] - v[1] * d1.n[0]);
      if (across > .5 && side < (d1.w + d2.w) / 2 * .6) facing = `two doors of the ${shared} line up`;
    }));
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
    return out;
  }

  // keep drawing drafts until one passes every check; report what was thrown away
  function generatePassing(seed, opt = {}, max = 30) {
    const rejected = [];
    for (let i = 0; i < max; i++) {
      const P = generate(seed + i * 100003, opt), res = check(P), fails = res.filter(r => !r.pass);
      if (!fails.length || opt.breakRule) return { plan: P, checks: res, rejected };
      rejected.push(fails.map(f => f.label));
    }
    const P = generate(seed, opt); return { plan: P, checks: check(P), rejected };
  }

  const api = { generate, check, generatePassing, BREAKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MANORGEN = api;
})(typeof window !== 'undefined' ? window : globalThis);
