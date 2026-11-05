/* Hitbox lab (Module 5, Part 8: "3 components of well-designed hitboxes", about slides 396-441).
   One looping overhead swing drives both slides. Slide 1 draws its colliders and relabels them per genre (the naming mess,
   and the course's verb / adjective / noun fix: Attack, Attackable, Collision), swaps the attack volume between the five
   shapes, and lets it ride the weapon bone (Elden Ring) or sit in hand-placed keys (Skullgirls). Slide 2 plays the seven
   placement tips as before / after panels on the same swing. Every frame is a pure function of time and the options,
   so window.__seek is deterministic. Art is original; sizes are illustrative approximations. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease, TAU } = TD;
  const W = 1040, H = 585, PER = 1.6, GREEN = '#1a8a4c';
  const K = { atk: '#e5322d', rec: '#2ea3dc', col: '#2fae63', sec: '#8a4fd6' };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const rot = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });

  /* ---------- the swing: an overhead chop, as joint positions in world units (feet at 0,0, facing +x) ---------- */
  const ACT0 = .32, ACT1 = .45;
  function rig(f, swing = true) {
    const A0 = -.55, A1 = -2.55, A2 = .62;
    let a = A0, lean = 0, crouch = 0;
    if (swing) {
      if (f < .30) { const k = ease(f / .30); a = lerp(A0, A1, k); lean = lerp(0, -.12, k); }
      else if (f < .44) { const k = (f - .30) / .14, kk = 1 - (1 - k) * (1 - k); a = lerp(A1, A2, kk); lean = lerp(-.12, .26, kk); crouch = kk * 14; }
      else if (f < .70) { a = A2; lean = .26; crouch = 14; }
      else { const k = ease((f - .70) / .30); a = lerp(A2, A0, k); lean = lerp(.26, 0, k); crouch = lerp(14, 0, k); }
    }
    const hip = { x: 0, y: -105 + crouch };
    const sh = add(hip, rot({ x: 0, y: -80 }, lean));
    const head = add(sh, rot({ x: 4, y: -34 }, lean));
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    const hand = { x: sh.x + 58 * dir.x, y: sh.y + 58 * dir.y };
    const elbow = { x: sh.x + 30 * Math.cos(a + .45), y: sh.y + 30 * Math.sin(a + .45) };
    const off = add(sh, rot({ x: 20, y: 44 }, lean));
    return { hip, sh, head, hand, elbow, dir, a, lean, crouch, off, active: swing && f >= ACT0 && f < ACT1,
      knees: [{ x: 22, y: -52 + crouch * .4 }, { x: -30, y: -50 + crouch * .4 }], feet: [{ x: 36, y: 0 }, { x: -38, y: 0 }] };
  }
  const along = (R, d) => ({ x: R.hand.x + R.dir.x * d, y: R.hand.y + R.dir.y * d });

  /* ---------- volumes: a segment A-B with radius r and a kind; contains() is the 2D side-view projection ---------- */
  function vol(kind, A, B, r) { return { kind, A, B, r }; }
  function contains(v, p) {
    const dx = v.B.x - v.A.x, dy = v.B.y - v.A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const rx = p.x - v.A.x, ry = p.y - v.A.y, s = rx * ux + ry * uy, q = Math.abs(-rx * uy + ry * ux);
    if (v.kind === 'sphere') return Math.hypot(p.x - (v.A.x + v.B.x) / 2, p.y - (v.A.y + v.B.y) / 2) <= L * .42 + v.r * .5;
    if (v.kind === 'capsule') { const c = clamp(s, 0, L); return Math.hypot(rx - ux * c, ry - uy * c) <= v.r; }
    if (v.kind === 'cone') return s >= 0 && s <= L && q <= v.r * 2.3 * s / L;
    return s >= 0 && s <= L && q <= v.r;   // box and cylinder project to the same rectangle
  }
  function bbox(v) {
    const R = v.kind === 'sphere' ? Math.hypot(v.B.x - v.A.x, v.B.y - v.A.y) * .42 + v.r * .5 : v.kind === 'cone' ? v.r * 2.3 : v.r;
    return [Math.min(v.A.x, v.B.x) - R, Math.min(v.A.y, v.B.y) - R, Math.max(v.A.x, v.B.x) + R, Math.max(v.A.y, v.B.y) + R];
  }
  function overlaps(v, rc) {   // rc = [x0, y0, x1, y1]
    const b = bbox(v), x0 = Math.max(b[0], rc[0]), y0 = Math.max(b[1], rc[1]), x1 = Math.min(b[2], rc[2]), y1 = Math.min(b[3], rc[3]);
    if (x0 > x1 || y0 > y1) return false;
    for (let x = x0; x <= x1; x += 3) for (let y = y0; y <= y1; y += 3) if (contains(v, { x, y })) return true;
    return false;
  }
  function drawVol(g, v, col, a = 1, dash = false) {
    const dx = v.B.x - v.A.x, dy = v.B.y - v.A.y, L = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
    g.save(); g.globalAlpha *= a; g.translate(v.A.x, v.A.y); g.rotate(ang);
    g.fillStyle = rgba(col, .2); g.strokeStyle = col; g.lineWidth = 2.5; if (dash) g.setLineDash([7, 5]);
    g.beginPath();
    if (v.kind === 'sphere') { const R = L * .42 + v.r * .5; g.arc(L / 2, 0, R, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.ellipse(L / 2, 0, R, R * .28, 0, 0, TAU); g.globalAlpha *= .6; g.stroke(); }
    else if (v.kind === 'capsule') { g.moveTo(0, -v.r); g.lineTo(L, -v.r); g.arc(L, 0, v.r, -Math.PI / 2, Math.PI / 2); g.lineTo(0, v.r); g.arc(0, 0, v.r, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill(); g.stroke(); }
    else if (v.kind === 'cone') { const R = v.r * 2.3; g.moveTo(0, 0); g.lineTo(L, -R); g.lineTo(L, R); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.ellipse(L, 0, R * .3, R, 0, 0, TAU); g.stroke(); }
    else if (v.kind === 'cylinder') { g.rect(0, -v.r, L, 2 * v.r); g.fill(); g.stroke(); g.beginPath(); g.ellipse(0, 0, v.r * .35, v.r, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(L, 0, v.r * .35, v.r, 0, 0, TAU); g.stroke(); }
    else { g.rect(0, -v.r, L, 2 * v.r); g.fill(); g.stroke(); }
    g.restore();
  }
  function drawRect(g, rc, col, a = 1, dash = false) {
    g.save(); g.globalAlpha *= a; g.fillStyle = rgba(col, .16); g.strokeStyle = col; g.lineWidth = 2.5; if (dash) g.setLineDash([7, 5]);
    g.beginPath(); g.rect(rc[0], rc[1], rc[2] - rc[0], rc[3] - rc[1]); g.fill(); g.stroke(); g.restore();
  }

  /* ---------- the attack volume for a scene at phase f ---------- */
  // manual keys (Skullgirls style): three hand-placed volumes across the active window, in world units
  const KEYS = [{ x: 40, y: -258, w: 62 }, { x: 128, y: -170, w: 62 }, { x: 112, y: -78, w: 56 }];
  function attackVol(sc, R, f) {
    if (sc.mode === 'manual') {
      const k = Math.min(2, Math.floor(clamp((f - ACT0) / (ACT1 - ACT0), 0, .999) * 3)), c = KEYS[k];
      return vol(sc.shape, { x: c.x - c.w, y: c.y }, { x: c.x + c.w, y: c.y }, 30 * (sc.pad || 1));
    }
    const s0 = sc.s0 ?? 10, s1 = (sc.s1 ?? 126) * (sc.pad ? 1 + (sc.pad - 1) * .08 : 1);
    return vol(sc.shape, along(R, s0), along(R, s1), (sc.r ?? 15) * (sc.pad || 1));
  }
  const sweetVol = R => vol('sphere', along(R, 112), along(R, 140), 6);

  /* ---------- receivers ---------- */
  function playerBoxes(R, kind) {
    const hd = R.head, s = R.sh, hp = R.hip;
    if (kind === 'core') return [[hd.x - 15, hd.y - 16, hd.x + 15, hd.y + 16], [Math.min(s.x, hp.x) - 16, s.y - 4, Math.max(s.x, hp.x) + 16, hp.y + 4], [-26, hp.y, 26, -6]];
    if (kind === 'loose') return [[hd.x - 34, hd.y - 36, hd.x + 34, hd.y + 26], [Math.min(s.x, hp.x) - 34, s.y - 10, Math.max(s.x, hp.x) + 34, hp.y + 6], [-52, hp.y, 52, 0]];
    return [[hd.x - 23, hd.y - 24, hd.x + 23, hd.y + 22], [Math.min(s.x, hp.x) - 24, s.y - 6, Math.max(s.x, hp.x) + 24, hp.y + 6], [-44, hp.y, 44, 0]];
  }
  // the enemy: a stout figure at feet x; boxes in world units
  function enemyBoxes(e) {
    const x = e.x, sz = e.size || 1, h = 236 * sz, w = 36 * sz;
    if (e.recv === 'limbs') {
      const L = [];
      L.push([x - 18 * sz, -h, x + 18 * sz, -h + 34 * sz]);                 // head
      L.push([x - 26 * sz, -h + 40 * sz, x + 26 * sz, -h + 82 * sz]);       // chest
      L.push([x - 24 * sz, -h + 84 * sz, x + 24 * sz, -h + 124 * sz]);      // belly
      L.push([x - 46 * sz, -h + 44 * sz, x - 30 * sz, -h + 92 * sz]);       // upper arm
      L.push([x - 50 * sz, -h + 96 * sz, x - 34 * sz, -h + 140 * sz]);      // forearm
      L.push([x + 30 * sz, -h + 44 * sz, x + 46 * sz, -h + 92 * sz]);
      L.push([x + 34 * sz, -h + 96 * sz, x + 50 * sz, -h + 140 * sz]);
      L.push([x - 24 * sz, -h + 128 * sz, x - 4 * sz, -h + 180 * sz]);      // thighs
      L.push([x + 4 * sz, -h + 128 * sz, x + 24 * sz, -h + 180 * sz]);
      L.push([x - 24 * sz, -h + 184 * sz, x - 6 * sz, -4]);                 // shins
      L.push([x + 6 * sz, -h + 184 * sz, x + 24 * sz, -4]);
      return L;
    }
    if (e.recv === 'huge') return [[x - w - 70, -h - 40, x + w + 40, 0]];
    return [[x - w, -h, x + w, 0]];
  }
  const PLAYER_LIMBS = R => {
    const b = [], seg = (p, q, r) => b.push([Math.min(p.x, q.x) - r, Math.min(p.y, q.y) - r, Math.max(p.x, q.x) + r, Math.max(p.y, q.y) + r]);
    seg(R.head, R.head, 18); seg(R.sh, R.hip, 14); seg(R.sh, R.elbow, 8); seg(R.elbow, R.hand, 8); seg(R.sh, R.off, 8);
    seg(R.hip, R.knees[0], 8); seg(R.knees[0], R.feet[0], 8); seg(R.hip, R.knees[1], 8); seg(R.knees[1], R.feet[1], 8);
    seg({ x: R.hip.x - 14, y: R.hip.y }, { x: R.hip.x + 14, y: R.hip.y }, 8); seg(R.feet[0], { x: R.feet[0].x + 14, y: 0 }, 5); seg(R.feet[1], { x: R.feet[1].x - 10, y: 0 }, 5);
    seg(R.hand, R.hand, 7); seg({ x: R.sh.x - 12, y: R.sh.y }, { x: R.sh.x + 12, y: R.sh.y }, 7);
    return b;
  };

  /* ---------- art ---------- */
  function limb(g, p, q, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }
  function fighter(g, R, flash = 0) {
    const body = '#3d4270', dk = '#262c6a', hi = '#5a5f92';
    T.use(g); g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse(0, 2, 62, 9, 0, 0, TAU); g.fill();
    limb(g, R.hip, R.knees[1], 15, dk); limb(g, R.knees[1], R.feet[1], 13, dk);
    limb(g, R.sh, R.off, 11, dk);
    limb(g, R.hip, R.knees[0], 16, body); limb(g, R.knees[0], R.feet[0], 14, body);
    g.fillStyle = dk; g.beginPath(); g.roundRect(R.feet[0].x - 10, -9, 28, 10, 4); g.fill(); g.beginPath(); g.roundRect(R.feet[1].x - 18, -9, 26, 10, 4); g.fill();
    limb(g, R.hip, R.sh, 36, body); limb(g, add(R.hip, { x: 0, y: -10 }), add(R.sh, { x: 0, y: 12 }), 14, hi);
    g.fillStyle = C.gold; g.beginPath(); g.ellipse(R.hip.x, R.hip.y, 20, 6, R.lean, 0, TAU); g.fill();
    // head: a helmet with a visor slit
    g.fillStyle = body; g.beginPath(); g.arc(R.head.x, R.head.y, 21, 0, TAU); g.fill();
    g.fillStyle = dk; g.beginPath(); g.roundRect(R.head.x + 2, R.head.y - 5, 19, 6, 3); g.fill();
    g.fillStyle = C.gold; g.beginPath(); g.moveTo(R.head.x - 6, R.head.y - 21); g.lineTo(R.head.x + 2, R.head.y - 31); g.lineTo(R.head.x + 6, R.head.y - 20); g.fill();
    // sword arm and sword
    limb(g, R.sh, R.elbow, 12, body); limb(g, R.elbow, R.hand, 11, body);
    const tip = along(R, 126), gd = along(R, 12), n = { x: -R.dir.y, y: R.dir.x };
    g.strokeStyle = '#8a8fa8'; g.lineWidth = 9; g.lineCap = 'butt'; g.beginPath(); g.moveTo(gd.x, gd.y); g.lineTo(tip.x, tip.y); g.stroke();
    g.strokeStyle = '#e8ecf6'; g.lineWidth = 4; g.beginPath(); g.moveTo(gd.x, gd.y); g.lineTo(tip.x, tip.y); g.stroke();
    limb(g, { x: gd.x + n.x * 13, y: gd.y + n.y * 13 }, { x: gd.x - n.x * 13, y: gd.y - n.y * 13 }, 5, C.gold);
    g.fillStyle = dk; g.beginPath(); g.arc(R.hand.x, R.hand.y, 8, 0, TAU); g.fill();
    if (flash > 0) { g.save(); g.globalAlpha = flash; g.fillStyle = '#fff'; g.beginPath(); g.arc(R.head.x, R.head.y, 24, 0, TAU); g.fill(); g.restore(); }
  }
  function enemy(g, e, hit = 0) {
    const x = e.x + hit * 10, sz = e.size || 1, h = 236 * sz, col = '#b5523a', dk = '#7a2f1f';
    g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse(e.x, 2, 50 * sz, 9, 0, 0, TAU); g.fill();
    limb(g, { x: x - 12 * sz, y: -h + 130 * sz }, { x: x - 14 * sz, y: -6 }, 18 * sz, dk);
    limb(g, { x: x + 12 * sz, y: -h + 130 * sz }, { x: x + 14 * sz, y: -6 }, 18 * sz, dk);
    g.fillStyle = col; g.beginPath(); g.roundRect(x - 30 * sz, -h + 38 * sz, 60 * sz, 98 * sz, 22 * sz); g.fill();
    limb(g, { x: x - 30 * sz, y: -h + 54 * sz }, { x: x - 40 * sz, y: -h + 132 * sz }, 15 * sz, dk);
    limb(g, { x: x + 30 * sz, y: -h + 54 * sz }, { x: x + 40 * sz, y: -h + 132 * sz }, 15 * sz, dk);
    g.fillStyle = col; g.beginPath(); g.arc(x, -h + 18 * sz, 20 * sz, 0, TAU); g.fill();
    g.fillStyle = '#2a1410'; g.beginPath(); g.arc(x - 8 * sz, -h + 15 * sz, 3 * sz, 0, TAU); g.arc(x + 1 * sz, -h + 15 * sz, 3 * sz, 0, TAU); g.fill();
    if (hit > 0) { g.save(); g.globalAlpha = hit * .7; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x - 32 * sz, -h - 2, 64 * sz, h, 20); g.fill(); g.restore(); }
  }
  function spark(g, p, k) {
    if (k <= 0) return;
    g.save(); g.globalAlpha = k; g.strokeStyle = C.gold; g.lineWidth = 4; g.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8, r0 = 8 + (1 - k) * 10, r1 = 22 + (1 - k) * 26; g.beginPath(); g.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0); g.lineTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1); g.stroke(); }
    g.restore();
  }

  /* ---------- one scene: fighter, enemy, colliders, outcome; ox/oy is the feet position on the canvas, s the scale ---------- */
  // first phase in the active window at which the attack overlaps a target (cached per scene key)
  const cache = new Map();
  function firstHit(sc, test) {
    const key = JSON.stringify(sc) + test; if (cache.has(key)) return cache.get(key);
    let at = -1;
    for (let i = 0; i <= 60 && at < 0; i++) {
      const f = lerp(ACT0, ACT1 - 1e-4, i / 60), R = rig(f), v = attackVol(sc, R, f);
      const boxes = test === 'sweet' ? null : enemyBoxes(sc.enemy);
      if (sc.depth && !sc.depth.projected && Math.abs(sc.depth.enemy - sc.depth.player) > sc.depth.half * 2) continue;
      if (test === 'sweet' ? enemyBoxes(sc.enemy).some(b => overlaps(sweetVol(R), b)) : boxes.some(b => overlaps(v, b))) at = f;
    }
    cache.set(key, at); return at;
  }
  function scene(g, sc, f, ox, oy, s, o = {}) {
    const R = rig(f, sc.swing !== false), P = p => ({ x: ox + p.x * s, y: oy + p.y * s });
    const hitAt = sc.enemy ? firstHit(sc, 'main') : -1, sweetAt = sc.sweet ? firstHit(sc, 'sweet') : -1;
    const landed = hitAt >= 0 && f >= hitAt, hk = landed ? clamp(1 - (f - hitAt) / .12) : 0;
    g.save(); g.translate(ox, oy); g.scale(s, s);
    // ground
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 3 / s; g.beginPath(); g.moveTo(-ox / s + 10, 0); g.lineTo((o.w || W) / s, 0); g.stroke();
    if (sc.enemy) enemy(g, sc.enemy, hk);
    let bullet = null;
    if (sc.bullet) {
      // a bullet crosses from the right at the height of the top of the head, once per swing
      const bx = lerp(330, -200, clamp((f - .1) / .6)), by = -258;
      bullet = { x: bx, y: by, r: 6 };
      g.fillStyle = C.gold; g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, 7, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,185,81,.5)'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx + 10, by); g.lineTo(bx + 46, by); g.stroke();
    }
    fighter(g, R);
    // colliders
    if (o.boxes !== false) {
      if (sc.enemy) enemyBoxes(sc.enemy).forEach(b => drawRect(g, b, K.rec, .9));
      if (o.collision) { drawRect(g, [-46, -262, 46, 0], K.col, .9, true); if (sc.enemy) drawRect(g, [sc.enemy.x - 44 * (sc.enemy.size || 1), -246 * (sc.enemy.size || 1), sc.enemy.x + 44 * (sc.enemy.size || 1), 0], K.col, .6, true); }
      (sc.pRecv === 'limbs' ? PLAYER_LIMBS(R) : playerBoxes(R, sc.pRecv)).forEach(b => drawRect(g, b, K.rec, .9));
      const v = attackVol(sc, R, f);
      if (R.active) drawVol(g, v, K.atk);
      else if (o.ghost) drawVol(g, v, K.atk, .28, true);
      if (sc.sweet) { const sv = sweetVol(R); if (R.active) drawVol(g, sv, K.sec); else if (o.ghost) drawVol(g, sv, K.sec, .28, true); }
    }
    g.restore();
    // outcome: a spark on contact, then a stamp until the swing resets
    const out = { landed, R, P, bulletHit: false, graze: false };
    if (sc.enemy) {
      const sz = sc.enemy.size || 1, ep = P({ x: sc.enemy.x - 10, y: -150 * sz });
      if (landed) spark(g, ep, hk);
      const sweet = sweetAt >= 0 && landed;
      if (landed && f < .95) T.stamp(sweet ? (o.sweetText || 'Sweet spot') : (o.hitText || 'Hit'), ox + (sc.enemy.x) * s, oy - 262 * sz * s, sweet ? K.sec : C.red, clamp((f - hitAt) * 12), 22);
      if (!landed && f > ACT1 && f < .95) T.stamp(o.missText || 'Miss', ox + (sc.enemy.x) * s, oy - 262 * sz * s, C.muted, clamp((f - ACT1) * 12), 22);
    }
    if (bullet) {
      const boxes = sc.pRecv === 'limbs' ? PLAYER_LIMBS(R) : playerBoxes(R, sc.pRecv);
      // has the bullet touched a receiver yet this swing?
      let hitF = -1;
      for (let i = 0; i <= 80; i++) { const ff = lerp(.1, .7, i / 80); if (ff > f) break; const bx = lerp(330, -200, clamp((ff - .1) / .6)); if (boxes.some(b => bx + 6 > b[0] && bx - 6 < b[2] && -258 + 6 > b[1] && -258 - 6 < b[3])) { hitF = ff; break; } }
      const passed = f > .1 + .6 * (330 - (R.head.x - 30)) / 530;
      if (hitF >= 0 && f < .95) { spark(g, P({ x: lerp(330, -200, clamp((hitF - .1) / .6)), y: -258 }), clamp(1 - (f - hitF) / .1)); T.stamp(o.hitText || 'Hit', ox + R.head.x * s, oy - 330 * s, C.red, clamp((f - hitF) * 12), 22); out.bulletHit = true; }
      else if (passed && f < .95) { T.stamp(o.missText || 'Graze', ox + R.head.x * s, oy - 330 * s, GREEN, 1, 22); out.graze = true; }
    }
    return out;
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

  /* ---------- slide 1: the lab ---------- */
  const GENRES = {
    fps: { name: 'FPS', atk: 'attackbox', rec: 'hitbox', col: 'collision capsule', note: 'In shooters the hitbox is what gets shot: it receives damage.' },
    fight: { name: 'Fighting', atk: 'hitbox', rec: 'hurtbox', col: 'pushbox', note: 'In fighting games the hitbox deals damage, and the hurtbox receives it.' },
    action: { name: 'Action', atk: 'attack collision', rec: 'damage collision', col: 'body collision', note: 'Action games call all of it collision, and qualify each one.' },
    course: { name: 'Course', atk: 'Attack', rec: 'Attackable', col: 'Collision', note: 'The fix is a verb, an adjective and a noun: Attack hits, Attackable gets hit, Collision blocks movement.' },
  };
  const SHAPES = { box: 'Box', sphere: 'Sphere', capsule: 'Capsule', cylinder: 'Cylinder', cone: 'Cone' };
  const SHAPE_NOTE = {
    box: 'Boxes are the default in 2D: cheap, and easy to read on a frame.',
    sphere: 'Spheres are the cheapest test of all, but a blade is long and thin.',
    capsule: 'Capsules fit limbs and blades, and are the default for 3D bodies.',
    cylinder: 'Cylinders have flat ends: useful for columns and area attacks.',
    cone: 'Cones suit breath, shotgun spread and sweeping arcs from a point.',
  };
  function drawLab(g, st, t) {
    T.use(g); g.clearRect(0, 0, W, H); panel(g, 0, 0, W, H);
    const f = (t % PER) / PER, gn = GENRES[st.genre];
    const sc = { mode: st.bone ? 'bone' : 'manual', shape: st.shape, enemy: { x: 172 }, pRecv: 'normal' };
    const ox = 270, oy = 528, s = 1.55;
    const o = scene(g, sc, f, ox, oy, s, { collision: true, ghost: true, w: 680 });
    // labels on the three kinds of collider
    const R = o.R, P = o.P, v = attackVol(sc, R, f), mid = P({ x: (v.A.x + v.B.x) / 2, y: (v.A.y + v.B.y) / 2 });
    const lab = (s1, x, y, col, lx, ly) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke(); T.label(s1, x, y, 'center', col, 15); };
    lab(gn.atk, Math.min(mid.x + 60, 600), Math.max(mid.y - 70, 60), K.atk, mid.x, mid.y);
    const hd = P(R.head); lab(gn.rec, hd.x - 150, hd.y - 30, K.rec, hd.x - 36, hd.y);
    const ft = P({ x: -46, y: -60 }); lab(gn.col, ft.x - 100, ft.y + 30, K.col, ft.x, ft.y);
    const eh = P({ x: 172 + 36, y: -120 }); lab(gn.rec, eh.x + 40, eh.y - 30, K.rec, eh.x, eh.y);
    // the active-window bar under the scene
    text(g, st.bone ? 'Rides the weapon bone (Elden Ring style)' : 'Hand-placed keys per frame (Skullgirls style)', 24, 30, { size: 15, w: 700 });
    const bx = 24, by = 556, bw = 600;
    g.fillStyle = '#e6dcc5'; g.fillRect(bx, by, bw, 10); g.fillStyle = rgba(K.atk, .8); g.fillRect(bx + bw * ACT0, by, bw * (ACT1 - ACT0), 10);
    g.fillStyle = C.navy; g.fillRect(bx + bw * f - 2, by - 5, 4, 20);
    text(g, 'wind-up', bx, by - 6, { size: 12, col: C.muted }); text(g, 'active', bx + bw * ACT0, by - 6, { size: 12, col: K.atk, w: 700 }); text(g, 'recovery', bx + bw * .6, by - 6, { size: 12, col: C.muted });
    // right column: 3D preview and the naming table
    const rx = 700, rw = 324;
    panel(g, rx, 16, rw, 214, '#efe6d2');
    text(g, `${SHAPES[st.shape]} in 3D`, rx + 14, 40, { size: 15, w: 800, font: 'Montserrat' });
    text(g, 'Drawn as its side-view outline on the left', rx + 14, 58, { size: 12, col: C.muted });
    wire(g, st.shape, rx + rw / 2, 142, 88, t);
    panel(g, rx, 244, rw, 325, '#efe6d2');
    text(g, 'The naming mess', rx + 14, 268, { size: 15, w: 800, font: 'Montserrat' });
    const cols = ['fps', 'fight', 'action', 'course'], cw = 64, c0 = rx + 66;
    cols.forEach((k, i) => {
      const x = c0 + i * cw;
      if (k === st.genre) { g.fillStyle = 'rgba(255,185,81,.45)'; g.beginPath(); g.roundRect(x - 2, 280, cw - 2, 228, 8); g.fill(); }
      text(g, GENRES[k].name, x + cw / 2 - 2, 298, { size: 12, w: 700, align: 'center' });
    });
    [['atk', 'deals', K.atk], ['rec', 'takes', K.rec], ['col', 'blocks', K.col]].forEach(([r, verb, col], j) => {
      const y = 330 + j * 62;
      g.fillStyle = col; g.beginPath(); g.roundRect(rx + 12, y - 12, 14, 14, 3); g.fill();
      text(g, verb, rx + 32, y, { size: 12, col: C.muted, w: 700 });
      cols.forEach((k, i) => { const words = GENRES[k][r].split(' '); words.forEach((wd, n) => text(g, wd, c0 + i * cw + cw / 2 - 2, y + n * 15, { size: 12, w: k === st.genre ? 700 : 500, align: 'center', col: k === st.genre ? C.ink : C.muted })); });
    });
    wrap(g, gn.note, rx + 14, 528, rw - 28, 17, { size: 13, w: 600 });
    return o;
  }
  // walk-through: genres, then shapes on the bone, then manual keys vs the bone
  const LAB_DUR = 25.6;
  function labTour(st, t) {
    if (t < 10) { st.genre = ['fps', 'fight', 'action', 'course'][Math.floor(t / 2.5)]; st.shape = 'box'; st.bone = false; return 'The same red box, four names: watch the word hitbox change sides.'; }
    if (t < 19.6) { st.genre = 'course'; st.shape = ['box', 'sphere', 'capsule', 'cylinder', 'cone'][Math.min(4, Math.floor((t - 10) / 1.92))]; st.bone = true; return 'Five shapes on the same weapon bone.'; }
    st.genre = 'course'; st.shape = 'capsule'; st.bone = t >= 22.6;
    return st.bone ? 'Bone-follow: the volume rides the blade, frame by frame.' : 'Hand-placed: one volume per key, positioned by a designer.';
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
      if (cap) T.label(cap, 350, 72, 'center', '#fff', 15, C.navy);
      const key = [st.genre, st.shape, st.bone, o.landed].join();
      if (key === st.key) return; st.key = key;
      $$(s, '.hb-genre .btn').forEach(b => b.classList.toggle('on', b.dataset.g === st.genre));
      $$(s, '.hb-shape .btn').forEach(b => b.classList.toggle('on', b.dataset.s === st.shape));
      bone.checked = st.bone;
      const gn = GENRES[st.genre];
      say($(s, '.hb-stats'), `<div class="r"><b style="font-size:20px;min-width:0">${gn.atk}</b><span>the red volume, in ${gn.name === 'Course' ? 'the course' : gn.name + ' games'}</span></div>`
        + `<div><b style="font-size:20px;min-width:0">${gn.rec}</b><span>the blue receivers</span></div>`);
      say($(s, '.hb-out'), `${SHAPE_NOTE[st.shape]} ${st.bone ? 'On the bone it follows the blade exactly, with no authoring per frame (Elden Ring).' : 'Hand-placed keys jump between poses but give exact control of each frame (Skullgirls).'}`);
    }
    scenes.lab = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => LAB_DUR };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); if (st.tour && st.t >= LAB_DUR) st.t = 0; frame(st.t); };
  });

  /* ---------- slide 2: seven tips, before and after ---------- */
  const base = { mode: 'bone', shape: 'capsule', pRecv: 'normal' };
  const TIPS = [
    { name: 'Extend attacks inside the character',
      before: { ...base, s0: 96, enemy: { x: 90 } }, after: { ...base, s0: -58, enemy: { x: 90 } },
      bt: 'The volume starts halfway up the blade. An enemy standing in the gap is missed.',
      at: 'The volume reaches back inside the body, so there is no gap to stand in.' },
    { name: 'Make player-favourable volumes a bit too big',
      before: { ...base, r: 5, enemy: { x: 244 } }, after: { ...base, r: 5, pad: 2.6, enemy: { x: 244 } },
      bt: 'An exact blade-sized volume. The swing looked like it connected, and missed by a hair.',
      at: 'The player’s attack is a little bigger than the blade, so near misses land.' },
    { name: 'Make attackable areas smaller (bullet grazing)',
      before: { ...base, swing: false, pRecv: 'loose', bullet: true }, after: { ...base, swing: false, pRecv: 'core', bullet: true },
      bt: 'The receiver covers more than the silhouette. A bullet that visibly missed still hits.',
      at: 'A smaller receiver lets the bullet graze past, and the near miss feels earned.', hitText: 'Hit', missText: 'Graze' },
    { name: 'Use secondary boxes for special interactions',
      before: { ...base, enemy: { x: 205 } }, after: { ...base, sweet: true, enemy: { x: 205 } },
      bt: 'One attack volume, so every hit is the same hit.',
      at: 'A secondary box at the tip marks a sweet spot. Throws, grabs and parries get their own boxes too.' },
    { name: 'Keep attacks and receivers proportional',
      before: { ...base, enemy: { x: 262, recv: 'huge' } }, after: { ...base, enemy: { x: 262 } },
      bt: 'The receiver is far bigger than the body, so a swing that visibly falls short still connects.',
      at: 'Sized to the body and the weapon, the result matches what the player sees.', missText: 'Out of reach' },
    { name: 'Keep it simple',
      before: { ...base, pRecv: 'limbs', enemy: { x: 178, recv: 'limbs' } }, after: { ...base, shape: 'box', enemy: { x: 178 } },
      bt: 'Twenty-six colliders to author and keep in sync, for the same hit.',
      at: 'Boxes in 2D, capsules in 3D: one per body, and the same predictable hit.' },
    { name: 'Project 3D boxes to the plane in 2.5D',
      before: { ...base, enemy: { x: 178 }, depth: { player: 0, enemy: 42, half: 14, projected: false } }, after: { ...base, enemy: { x: 178 }, depth: { player: 0, enemy: 42, half: 14, projected: true } },
      bt: 'On screen the swing overlaps, but the enemy stands a step deeper, so the volume passes in front of it.',
      at: 'Projected to the gameplay plane, depth stops mattering, and what you see is what hits.' },
  ];
  const TIP_LEN = PER * 3, TIP_DUR = TIP_LEN * TIPS.length;
  function depthStrip(g, sc, x, y, w, ox, s, f) {
    const d = sc.depth, R = rig(f), v = attackVol(sc, R, f), zs = .8;
    g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(x, y, w, 70, 8); g.fill();
    text(g, 'Seen from above (depth)', x + 10, y + 16, { size: 11, col: C.muted, w: 700 });
    const zy = z => y + 32 + z * zs * .5;
    g.strokeStyle = C.navy; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 8, zy(0)); g.lineTo(x + w - 8, zy(0)); g.stroke(); g.setLineDash([]);
    if (d.projected) { g.fillStyle = rgba(K.atk, .12); g.fillRect(x + 4, y + 20, w - 8, 42); text(g, 'flattened: depth ignored', x + w - 10, y + 16, { size: 11, col: K.atk, w: 700, align: 'right' }); }
    g.fillStyle = rgba(K.rec, .3); g.fillRect(ox + (sc.enemy.x - 36) * s, zy(d.enemy - d.half), 72 * s, d.half * zs);
    if (R.active) { const b = bbox(v); g.fillStyle = rgba(K.atk, .35); g.strokeStyle = K.atk; g.lineWidth = 2; g.beginPath(); g.rect(ox + b[0] * s, zy(-d.half), (b[2] - b[0]) * s, d.half * zs); g.fill(); g.stroke(); }
    g.fillStyle = C.player; g.beginPath(); g.arc(ox, zy(d.player), 8, 0, TAU); g.fill();
    g.fillStyle = '#b5523a'; g.beginPath(); g.arc(ox + sc.enemy.x * s, zy(d.enemy), 10, 0, TAU); g.fill();
  }
  function drawTips(g, k, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    const tip = TIPS[k], f = (t % PER) / PER, pw = 512, ph = 490;
    [['Before', tip.before, tip.bt], ['After', tip.after, tip.at]].forEach(([nm, sc, cap], i) => {
      const x = i * (pw + 16);
      panel(g, x, 0, pw, ph);
      g.save(); g.beginPath(); g.roundRect(x, 0, pw, ph, 14); g.clip();
      const oy = sc.depth ? 386 : 452, s = sc.depth ? 1.04 : 1.2, ox = x + (sc.enemy && sc.enemy.x > 230 ? 95 : 130);
      const o = scene(g, sc, f, ox, oy, s, { hitText: tip.hitText, missText: tip.missText, w: pw - (ox - x) + x, ghost: true });
      if (sc.depth) depthStrip(g, sc, x + 12, 404, pw - 24, ox, s, f);
      if (k === 5) text(g, `${(sc.pRecv === 'limbs' ? PLAYER_LIMBS(o.R).length : 3) + enemyBoxes(sc.enemy).length + 1} colliders`, x + pw - 16, 66, { size: 20, w: 800, align: 'right', font: 'Montserrat', col: i ? GREEN : C.red });
      g.restore();
      text(g, nm, x + 16, 32, { size: 20, w: 800, font: 'Montserrat', col: i ? GREEN : C.red });
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
      say($(s, '.hb-tout'), `<b>${tp.name}.</b> Left: ${tp.bt} Right: ${tp.at}`);
    }
    scenes.tips = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => TIP_DUR };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); if (st.tour && st.t >= TIP_DUR) st.t = 0; frame(st.t); };
  });

  window.__seek = (t, which = 'lab') => scenes[which].seek(t);
  window.__dur = (which = 'lab') => scenes[which].dur();
})();
