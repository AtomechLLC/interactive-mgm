/* Sketch level: a student's graph-paper platformer encounter, built one square for one square and played.
   level.js holds the level and the simulation (SKETCH); this file only draws it and wires the four slides.
   The pencil render (graph paper, wobbly ink, coloured pencil, a little line boil) uses the sketch's own pixel coordinates, so it can be wiped over or laid under img/sketch.png.
   window.__seek(t, 'reveal') / window.__dur('reveal') render slide 2's sequence frame by frame for the GIF. */
(function () {
  const { $, $$, demo, canvasDemo, say, raf } = FPF.kit;
  const { DT, RULES, LEVEL, newGame, step, newBot, botInput, recordRun, chest } = SKETCH;
  const { PAPER, CEIL, GROUND, CRACKED, LANTERNS, SPAWNS } = LEVEL;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

  try { ['700 24px Caveat', '600 22px Caveat'].forEach(f => document.fonts.load(f)); } catch (e) {}
  const IMG = new Image();
  IMG.src = 'img/sketch.png';

  /* ---------- pencil on graph paper, in the sketch's own colours ---------- */
  const C = {
    paper: '#eef0f2', grid: 'rgba(90,95,105,.32)', ink: '#2a2a2e', graphite: 'rgba(60,62,70,.16)',
    brown: '#7a4f2a', blue: '#2f6fe0', blueWash: 'rgba(70,140,255,', red: '#c8252b', redWash: 'rgba(220,40,50,',
    purple: '#7a3fd6', green: '#3d8a3d',
  };
  const HAND = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';
  // a repeatable wobble: the same seed always draws the same stroke, a new seed redraws it (line boil)
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const boil = t => Math.floor(t * 8);
  function stroke(g, pts, seed, col = C.ink, w = 2.2, j = 1.1, passes = 2) {
    g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let pass = 0; pass < passes; pass++) {
      g.lineWidth = pass ? w * 0.6 : w; g.globalAlpha *= pass ? 0.55 : 1;
      g.beginPath();
      let k = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 12));
        for (let m = (i ? 1 : 0); m <= n; m++, k++) {
          const u = m / n, x = ax + (bx - ax) * u + (hash(seed + k * 7.3 + pass * 91) - 0.5) * 2 * j, y = ay + (by - ay) * u + (hash(seed + k * 3.1 + pass * 57) - 0.5) * 2 * j;
          if (!i && !m) g.moveTo(x, y); else g.lineTo(x, y);
        }
      }
      g.stroke();
    }
    g.restore();
  }
  function box2(g, x0, y0, x1, y1, seed, col = C.ink, w = 2.4) {
    const o = 2;   // corners overshoot a little, as a hand-drawn box does
    stroke(g, [[x0 - o, y0], [x1 + o, y0]], seed + 1, col, w); stroke(g, [[x1, y0 - o], [x1, y1 + o]], seed + 2, col, w);
    stroke(g, [[x1 + o, y1], [x0 - o, y1]], seed + 3, col, w); stroke(g, [[x0, y1 + o], [x0, y0 - o]], seed + 4, col, w);
  }
  function hatch(g, x0, y0, x1, y1, seed, col = C.graphite, gap = 9) {
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath();
    for (let d = -(y1 - y0); d < x1 - x0; d += gap) { const j = (hash(seed + d) - 0.5) * 3; g.moveTo(x0 + d + j, y1); g.lineTo(x0 + d + (y1 - y0) + j, y0); }
    g.stroke(); g.restore();
  }
  function circ(g, x, y, r, seed, col = C.ink, w = 2.2, n = 14) {
    const pts = []; const a0 = hash(seed) * 6;
    for (let k = 0; k <= n + 1; k++) { const a = a0 + k / n * Math.PI * 2, rr = r * (1 + (hash(seed + k) - 0.5) * 0.12); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    stroke(g, pts, seed + 5, col, w, 0.5, 1);
  }
  function heartPath(g, x, y, r) {
    g.beginPath();
    g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
    g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
    g.closePath();
  }
  // a coloured-pencil heart: scribbled in, then outlined
  function drawHeart(g, x, y, r, col = C.red, seed = 1, empty = false) {
    g.save();
    if (!empty) { heartPath(g, x, y, r); g.save(); g.clip(); g.strokeStyle = col; g.lineWidth = 1.6; g.globalAlpha = 0.75; g.beginPath(); for (let d = -2 * r; d < 2 * r; d += 2.6) { g.moveTo(x + d - r, y + r); g.lineTo(x + d + r, y - r); } g.stroke(); g.restore(); }
    heartPath(g, x + (hash(seed) - 0.5), y + (hash(seed + 2) - 0.5), r); g.strokeStyle = empty ? 'rgba(200,37,43,.4)' : col; g.lineWidth = 1.8; g.stroke();
    g.restore();
  }
  function drawSword(g, x, y, s = 1, rot = -Math.PI / 4, seed = 3) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.fillStyle = 'rgba(122,63,214,.35)'; g.fillRect(-4, -6, 30, 12);
    stroke(g, [[-4, -7], [26, -5], [33, 0], [26, 5], [-4, 7], [-4, -7]], seed, C.purple, 2.2, 0.6, 1);
    stroke(g, [[-7, -13], [-7, 13]], seed + 9, C.purple, 4, 0.5, 1);
    stroke(g, [[-20, 0], [-8, 0]], seed + 13, C.purple, 5, 0.4, 1);
    g.restore();
  }
  // a little arrow from an item to the lantern holding it, as the sketch draws them
  function arrow(g, x0, y0, x1, y1, seed, col) {
    stroke(g, [[x0, y0], [(x0 + x1) / 2 + 3, (y0 + y1) / 2 - 3], [x1, y1]], seed, col, 1.6, 0.6, 1);
    const a = Math.atan2(y1 - y0, x1 - x0);
    stroke(g, [[x1 - Math.cos(a - 0.5) * 7, y1 - Math.sin(a - 0.5) * 7], [x1, y1], [x1 - Math.cos(a + 0.5) * 7, y1 - Math.sin(a + 0.5) * 7]], seed + 4, col, 1.6, 0.3, 1);
  }
  // the brown squiggles drawn inside each cracked block
  const SQUIG = [[0.15, 0.25, 0.3, 0.75], [0.4, 0.2, 0.52, 0.8], [0.66, 0.25, 0.8, 0.72]];
  function crackedBlock(g, b, st, t, i) {
    const shake = st.state === 'shaking' ? Math.sin(t * 70 + i) * Math.min(2.5, st.stand * 4) : 0;
    const x0 = b.x0 + shake, y0 = b.y0, x1 = b.x1 + shake, y1 = b.y1, w = x1 - x0, h = y1 - y0, sd = 500 + i * 40;
    if (st.state === 'gone') {
      const u = st.gone / RULES.regrow;
      g.save(); g.setLineDash([4, 6]); g.globalAlpha = 0.25 + 0.4 * u; box2(g, b.x0 + 3, y0 + 3, b.x1 - 3, y1 - 3, sd, C.brown, 1.6); g.restore();
      return;
    }
    g.fillStyle = 'rgba(122,79,42,.10)'; g.fillRect(x0, y0, w, h);
    box2(g, x0, y0, x1, y1, sd, C.brown, 2.6);
    SQUIG.forEach(([ax, ay, bx, by], k) => {
      const pts = []; for (let m = 0; m <= 6; m++) { const u = m / 6; pts.push([x0 + (ax + (bx - ax) * u) * w + (m % 2 ? 4 : -4), y0 + (ay + (by - ay) * u) * h]); }
      stroke(g, pts, sd + k * 9, C.brown, 1.7, 0.8, 1);
    });
    if (st.state === 'shaking' && st.stand > 0) stroke(g, [[x0 + w * 0.08, y0 + h * 0.5], [x0 + w * 0.5, y0 + h * 0.3], [x0 + w * 0.92, y0 + h * 0.55]], sd + 77 + boil(t), C.ink, 1.6 + 2 * clamp(st.stand / RULES.crumble, 0, 1), 1, 1);
  }
  function ceilingAbove(x) { const c = CEIL.find(([a, b]) => x >= a && x < b); return c ? c[3] : PAPER.y0; }
  function lantern(g, L, lit, t, i) {
    const top = ceilingAbove(L.x), cy = L.y, sd = 900 + i * 30;
    if (!lit) {
      // only the hook is left, and the pieces scribbled where it hung
      stroke(g, [[L.x - 9, cy + 6], [L.x - 3, cy + 12]], sd, C.blue, 1.6, 0.5, 1); stroke(g, [[L.x + 4, cy + 4], [L.x + 10, cy + 13]], sd + 3, C.blue, 1.6, 0.5, 1);
      return;
    }
    const sw = Math.sin(t * 2 + L.x) * 0.04;
    g.save(); g.translate(L.x, cy - 20); g.rotate(sw); g.translate(-L.x, -(cy - 20));
    const glow = g.createRadialGradient(L.x, cy, 2, L.x, cy, 34);
    glow.addColorStop(0, C.blueWash + '.22)'); glow.addColorStop(1, C.blueWash + '0)');
    g.fillStyle = glow; g.fillRect(L.x - 36, cy - 36, 72, 72);
    stroke(g, [[L.x - 12, cy - 13], [L.x, cy - 22], [L.x + 12, cy - 13], [L.x - 12, cy - 13]], sd, C.blue, 2.2, 0.6, 1);
    box2(g, L.x - 9, cy - 13, L.x + 9, cy + 12, sd + 10, C.blue, 2);
    stroke(g, [[L.x - 3, cy - 12], [L.x - 3, cy + 11]], sd + 20, C.blue, 1.4, 0.5, 1); stroke(g, [[L.x + 3, cy - 12], [L.x + 3, cy + 11]], sd + 21, C.blue, 1.4, 0.5, 1);
    circ(g, L.x, cy + 15, 11, sd + 30, C.blue, 2, 12);
    g.restore();
    // what it holds, drawn small beside it with an arrow, as the sketch does
    if (L.drop === 'sword') { drawSword(g, L.x + 34, cy - 36, 0.65, 0, sd + 40); arrow(g, L.x + 18, cy - 32, L.x + 7, cy - 22, sd + 50, C.red); }
    else { drawHeart(g, L.x + 26, cy - 34, 7, C.red, sd + 40); arrow(g, L.x + 20, cy - 28, L.x + 9, cy - 20, sd + 50, C.red); }
  }
  // a Spawn: the red scribble in the ceiling the heads come out of, with its handwritten label
  function spawn(g, S, st, t, i) {
    const y = ceilingAbove(S.x), sd = 1300 + i * 50 + (st.pulse > 0 ? boil(t) : 0);
    if (st.pulse > 0) { g.fillStyle = C.redWash + (0.12 + st.pulse * 0.4) + ')'; g.beginPath(); g.ellipse(S.x, y + 6, 30, 16, 0, 0, 7); g.fill(); }
    const pts = []; for (let k = 0; k <= 16; k++) { const a = Math.PI * k / 16; pts.push([S.x + Math.cos(a) * 24, y + Math.sin(a) * (10 + st.pulse * 14)]); }
    stroke(g, pts, sd, C.red, 2.4, 1.2, 2);
    for (let k = 0; k < 5; k++) stroke(g, [[S.x - 18 + k * 9, y + 2], [S.x - 15 + k * 9, y + 9]], sd + k * 5, C.red, 1.4, 0.8, 1);
  }
  // a Medusa head, drawn like the sketch's red creature: round face, one eye, a mane of snakes, and its wave as a dashed line
  function medusa(g, h, t) {
    if (h.trail.length > 2) { g.save(); g.setLineDash([5, 5]); stroke(g, h.trail.filter((_, k) => k % 3 === 0).concat([[h.x, h.y]]), 7, 'rgba(200,37,43,.55)', 1.6, 0.3, 1); g.restore(); }
    const fl = h.hit > 0 && Math.floor(h.hit * 30) % 2, r = RULES.medusaR, sd = 2000 + (h.id || 0) * 17 + boil(t);
    g.save(); g.translate(h.x, h.y); g.scale(-h.dir, 1);   // faces the way it flies
    const col = fl ? '#ff9a3a' : C.red;
    for (let k = 0; k < 6; k++) {
      const a = -2.3 + k * 0.62, wig = Math.sin(t * 10 + k * 1.7) * 0.4, pts = [];
      for (let m = 0; m <= 5; m++) { const rr = r - 2 + m * 3.4, aa = a + Math.sin(m * 1.3 + t * 9 + k) * 0.18 + wig * m / 5; pts.push([Math.cos(aa) * rr + 3, Math.sin(aa) * rr]); }
      stroke(g, pts, sd + k * 11, col, 1.8, 0.4, 1);
    }
    g.fillStyle = 'rgba(238,240,242,.9)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.fillStyle = C.redWash + '.18)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    circ(g, 0, 0, r, sd, col, 2.2, 14);
    circ(g, -5, -3, 4.5, sd + 3, col, 1.6, 9);
    g.fillStyle = col; g.beginPath(); g.arc(-6, -2.5, 1.8, 0, 7); g.fill();
    stroke(g, [[-10, 6], [-6, 9], [-2, 7]], sd + 8, col, 1.6, 0.4, 1);
    if (h.hp < RULES.headHp) stroke(g, [[3, -10], [7, -3], [3, 4]], sd + 12, C.ink, 1.6, 0.4, 1);
    g.restore();
  }
  // the player is the student's own drawing, cut out of the sketch and posed after Castlevania 1's Simon
  // (tools/simon_frames.py builds img/simon.png): stand, a three-frame walk, the tucked jump, a three-frame whip and a knock-back
  const SIMON = new Image(); SIMON.src = 'img/simon.png';
  const SF = { names: ['stand', 'walk1', 'walk2', 'walk3', 'jump', 'whip1', 'whip2', 'whip3', 'hurt'], w: 76, h: 100, k: 4, foot: 97, cx: 39 };
  const WALK = ['walk1', 'walk2', 'walk3', 'walk2'];
  function simonFrame(s) {
    const p = s.p;
    if (p.inv > RULES.invuln - 0.35) return 'hurt';
    if (s.fl) { const ft = s.fl.t; return ft < 0.05 ? 'whip1' : ft < 0.1 || (s.fl.dy < 0 && !s.fl.dx) ? 'whip2' : 'whip3'; }
    if (!p.ground) return 'jump';
    if (Math.abs(p.vx) > 1) return WALK[Math.floor(s.t * 9) % 4];
    return 'stand';
  }
  const FIST = { whip1: [-6, -82], whip2: [10, -78], whip3: [28, -56] };
  function player(g, s, t) {
    const p = s.p;
    if (p.inv > 0 && p.inv <= RULES.invuln - 0.35 && Math.floor(p.inv * 14) % 2) return;
    if (!SIMON.complete || !SIMON.naturalWidth) return;
    const name = simonFrame(s), i = SF.names.indexOf(name), lift = name === 'jump' ? 4 : 0;
    g.save(); g.translate(p.x, p.y - lift); g.scale(p.face, 1);
    g.drawImage(SIMON, i * SF.w * SF.k, 0, SF.w * SF.k, SF.h * SF.k, -SF.cx, -SF.foot, SF.w, SF.h);
    g.restore();
  }
  // the chain is a row of little red loops and the head a red gear, as sketched
  function flail(g, s, t) {
    const f = s.fl; if (!f || f.hx === undefined) return;
    const fist = FIST[simonFrame(s)] || [24, -56], c = { x: s.p.x + fist[0] * s.p.face, y: s.p.y + fist[1] };
    const n = Math.max(2, Math.floor(Math.hypot(f.hx - c.x, f.hy - c.y) / 9)), col = s.p.sword ? C.purple : C.red;
    for (let k = 1; k < n; k++) { const u = k / n; circ(g, c.x + (f.hx - c.x) * u, c.y + (f.hy - c.y) * u, 3, 4000 + k, col, 1.4, 7); }
    const pts = []; const r = RULES.headR - 2;
    for (let k = 0; k <= 16; k++) { const a = k * Math.PI / 8 + t * 12, rr = k % 2 ? r : r + 5; pts.push([f.hx + Math.cos(a) * rr, f.hy + Math.sin(a) * rr]); }
    g.fillStyle = s.p.sword ? 'rgba(122,63,214,.25)' : C.redWash + '.22)'; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo : g.moveTo).call(g, x, y)); g.fill();
    stroke(g, pts, 4100 + boil(t), col, 1.8, 0.3, 1);
    circ(g, f.hx, f.hy, 4, 4200, col, 1.6, 8);
  }
  function item(g, it, t) {
    if (it.got) return;
    const bob = it.vy === 0 ? Math.sin(t * 4 + it.id) * 2 : 0;
    if (it.kind === 'sword') drawSword(g, it.x, it.y - 14 + bob, 0.85, -Math.PI / 4, 5000 + boil(t));
    else drawHeart(g, it.x, it.y - 12 + bob, 9, C.red, 5000 + it.id + boil(t));
  }
  function hud(g, s) {
    const x = PAPER.x0 + 16, y = PAPER.y0 + 26;
    g.save();
    for (let k = 0; k < RULES.maxHearts; k++) drawHeart(g, x + 10 + k * 26, y, 9, C.red, 6000 + k, k >= s.p.hearts);
    if (s.p.sword) drawSword(g, x + 152, y + 1, 0.6, 0, 6100);
    g.fillStyle = C.ink; g.font = `700 24px ${HAND}`; g.textAlign = 'left';
    g.fillText(`${Math.floor(s.t / 60)}:${String(Math.floor(s.t % 60)).padStart(2, '0')}`, x + 196, y + 8);
    g.restore();
  }
  function tags(g) {
    g.save(); g.font = `700 26px ${HAND}`; g.fillStyle = C.red; g.textAlign = 'center';
    SPAWNS.forEach(S => g.fillText('Spawn', S.x + 8, ceilingAbove(S.x) - 10 > PAPER.y0 + 60 ? ceilingAbove(S.x) - 10 : ceilingAbove(S.x) + 46));
    g.restore();
  }
  // the graph paper, with the grid exactly where the sketch's grid is
  function paper(g) {
    g.fillStyle = C.paper; g.fillRect(PAPER.x0, PAPER.y0, PAPER.x1 - PAPER.x0, PAPER.y1 - PAPER.y0);
    g.save(); g.strokeStyle = C.grid; g.lineWidth = 1.2; g.setLineDash([6, 3]); g.beginPath();
    for (let x = 64 - 41; x < PAPER.x1; x += 41.05) { g.moveTo(x, PAPER.y0); g.lineTo(x, PAPER.y1); }
    for (let y = 88 - 44; y < PAPER.y1; y += 44) { g.moveTo(PAPER.x0, y); g.lineTo(PAPER.x1, y); }
    g.stroke(); g.restore();
  }

  // draws the whole level for state s, in the sketch's coordinates
  function drawWorld(g, s, t, o = {}) {
    g.save();
    g.beginPath(); g.rect(PAPER.x0, PAPER.y0, PAPER.x1 - PAPER.x0, PAPER.y1 - PAPER.y0); g.clip();
    paper(g);
    // the ceiling: its top line and its underside, with the steps between, shaded lightly so it reads as solid
    CEIL.forEach(([x0, x1, top, under], i) => {
      hatch(g, x0, top, x1, under, 700 + i * 13);
      stroke(g, [[x0, top], [x1, top]], 710 + i, C.ink, 2.8, 1.2);
      stroke(g, [[x0, under], [x1, under]], 720 + i, C.ink, 2.8, 1.2);
      const nx = CEIL[i + 1];
      if (nx) { stroke(g, [[x1, Math.min(under, nx[3])], [x1, Math.max(under, nx[3])]], 730 + i, C.ink, 2.8, 1); if (nx[2] !== top) stroke(g, [[x1, Math.min(top, nx[2])], [x1, Math.max(top, nx[2])]], 740 + i, C.ink, 2.8, 1); }
    });
    // ledges and blocks; the staircase is one zigzag line, as drawn
    GROUND.forEach(([x0, y0, x1, y1], i) => {
      if (x0 >= 928 && x0 < 1010) return;
      hatch(g, x0, y0, x1, y1, 800 + i * 7);
      box2(g, x0, y0, x1, y1, 810 + i * 9);
    });
    const steps = GROUND.filter(([x0]) => x0 >= 928 && x0 < 1010), zig = [[928, 437]];
    steps.forEach(([x0, y0, x1]) => { zig.push([x0, y0]); zig.push([x1, y0]); });
    zig.push([1010, 527]);
    stroke(g, zig, 880, C.ink, 2.4, 0.8);
    s.cracked.forEach((st, i) => crackedBlock(g, CRACKED[i], st, t, i));
    LANTERNS.forEach((L, i) => lantern(g, L, s.lanterns[i].lit, t, i));
    SPAWNS.forEach((S, i) => spawn(g, S, s.spawns[i], t, i));
    if (o.tags !== false) tags(g);
    s.items.forEach(it => item(g, it, t));
    player(g, s, t);
    flail(g, s, t);
    s.heads.forEach(h => medusa(g, h, t));
    if (o.hud !== false) hud(g, s);
    g.restore();
  }
  function drawSketch(g, a = 1) {
    if (!IMG.complete || !IMG.naturalWidth || a <= 0) return;
    g.save(); g.globalAlpha = a;
    g.beginPath(); g.rect(PAPER.x0, PAPER.y0, PAPER.x1 - PAPER.x0, PAPER.y1 - PAPER.y0); g.clip();
    g.drawImage(IMG, 0, 0);
    g.restore();
  }
  // canvas pixels <- sketch pixels
  function view(g, W, H) {
    const k = Math.min(W / (PAPER.x1 - PAPER.x0), H / (PAPER.y1 - PAPER.y0));
    g.translate((W - (PAPER.x1 - PAPER.x0) * k) / 2, (H - (PAPER.y1 - PAPER.y0) * k) / 2);
    g.scale(k, k); g.translate(-PAPER.x0, -PAPER.y0);
  }
  function banner(g, text, sub, a) {
    if (a <= 0) return;
    const cx = (PAPER.x0 + PAPER.x1) / 2, cy = 586, w = 560, h = sub ? 84 : 58;
    g.save(); g.globalAlpha = a;
    g.fillStyle = 'rgba(250,250,247,.94)'; g.fillRect(cx - w / 2, cy - 38, w, h);
    box2(g, cx - w / 2, cy - 38, cx + w / 2, cy - 38 + h, 7000, C.ink, 2.2);
    g.fillStyle = C.red; g.font = `700 36px ${HAND}`; g.textAlign = 'center'; g.fillText(text, cx, cy);
    if (sub) { g.fillStyle = C.ink; g.font = `600 22px ${HAND}`; g.fillText(sub, cx, cy + 30); }
    g.restore();
  }

  /* ---------- slide 2: the sketch becomes the level, then the level is played ---------- */
  let RUN = null;
  const run = () => RUN || (RUN = recordRun(60));
  const T_SK = 1.6, T_WIPE = 2.4, T_HOLD = 0.8;
  function revealDur() { return T_SK + T_WIPE + T_HOLD + run().length * DT + 1.2; }
  function captionAt(s) {
    const e = s.events.filter(e => !['fire'].includes(e[1])).slice(-1)[0];
    return e && s.t - e[0] < 2.6 ? e[2] : '';
  }
  function drawReveal(g, W, H, t, overlay) {
    const frames = run(), t0 = T_SK + T_WIPE + T_HOLD;
    const fi = clamp(Math.floor((t - t0) / DT), 0, frames.length - 1), s = frames[fi];
    g.clearRect(0, 0, W, H);
    g.save(); view(g, W, H);
    const end = t0 + frames.length * DT;
    if (t < T_SK) { drawSketch(g, 1); }
    else if (t < T_SK + T_WIPE) {
      const u = ease((t - T_SK) / T_WIPE), wx = PAPER.x0 + (PAPER.x1 - PAPER.x0) * u;
      drawSketch(g, 1);
      g.save(); g.beginPath(); g.rect(PAPER.x0, PAPER.y0, wx - PAPER.x0, PAPER.y1 - PAPER.y0); g.clip();
      drawWorld(g, frames[0], t, { hud: false }); g.restore();
      stroke(g, [[wx, PAPER.y0], [wx, PAPER.y1]], 7100 + boil(t), C.red, 3, 1.5);
    } else {
      drawWorld(g, s, t);
      drawSketch(g, overlay ? 0.32 : 0);
      if (s.won) banner(g, 'Encounter cleared', `${s.p.hearts} hearts left · the purple sword found`, clamp((t - (t0 + frames.findIndex(f => f.won) * DT)) / 0.4, 0, 1));
      if (t > end) drawSketch(g, clamp((t - end) / 1.2, 0, 1));
    }
    g.restore();
    if (t < T_SK) return 'The student’s sketch: one ledge-to-ledge encounter on graph paper.';
    if (t < T_SK + T_WIPE + T_HOLD) return 'The same level, redrawn square for square and brought to life: every ledge, lantern, cracked block and Spawn point sits where it was drawn.';
    if (t > end) return 'Back to the sketch.';
    return captionAt(s) || 'Played by a scripted run: jump, swing the flail, read what each piece asks.';
  }
  let revealApi = null;
  canvasDemo('reveal', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.rv-out');
    const st = { t: 0, paused: false, overlay: false };
    const btnP = $(s, '.rv-pause'), btnO = $(s, '.rv-overlay');
    $(s, '.rv-replay').onclick = () => { st.t = 0; st.paused = false; btnP.classList.remove('on'); };
    btnP.onclick = () => { st.paused = !st.paused; btnP.classList.toggle('on', st.paused); };
    btnO.onclick = () => { st.overlay = !st.overlay; btnO.classList.toggle('on', st.overlay); };
    let last = '';
    const render = t => { const m = drawReveal(g, W, H, t, st.overlay); if (m !== last) { last = m; say(out, m); } };
    revealApi = { seek: t => { st.t = t; st.paused = true; render(t); }, dur: revealDur };
    return dt => { if (!st.paused) st.t += dt; if (st.t > revealDur()) st.t = 0; render(st.t); };
  });

  /* ---------- slide 3: play it ---------- */
  const KEYS = { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], jump: ['Space', 'KeyK', 'KeyZ'], throw: ['KeyJ', 'KeyX'] };
  const GAME_CODES = new Set(Object.values(KEYS).flat().concat(['ArrowDown', 'KeyS']));
  canvasDemo('play', (sl, c, g) => {
    const W = c.width, H = c.height, out = $(sl, '.pl-out');
    let s = newGame(), bot = null, acc = 0, keys = new Set(), focused = false, lastEv = 0, overlay = 0;
    c.tabIndex = 0;
    const restart = () => { s = newGame(); acc = 0; lastEv = 0; };
    c.addEventListener('pointerdown', () => { c.focus(); });
    c.addEventListener('focus', () => { focused = true; });
    c.addEventListener('blur', () => { focused = false; keys.clear(); });
    c.addEventListener('keydown', e => {
      if (e.code === 'Escape') { c.blur(); return; }
      if (e.code === 'KeyR') { restart(); bot = null; syncBtns(); }
      if (!GAME_CODES.has(e.code) && e.code !== 'KeyR') return;
      e.preventDefault(); e.stopPropagation();
      if (bot) { bot = null; syncBtns(); }
      keys.add(e.code);
    });
    c.addEventListener('keyup', e => { keys.delete(e.code); if (GAME_CODES.has(e.code)) { e.preventDefault(); e.stopPropagation(); } });
    const btnD = $(sl, '.pl-demo'), sk = $(sl, '.pl-sketch');
    const syncBtns = () => btnD.classList.toggle('on', !!bot);
    $(sl, '.pl-restart').onclick = () => { restart(); bot = null; syncBtns(); c.focus(); };
    btnD.onclick = () => { restart(); bot = bot ? null : newBot(); syncBtns(); if (!bot) c.focus(); };
    sk.oninput = () => { overlay = sk.value / 100; };
    const held = list => list.some(k => keys.has(k));
    return dt => {
      acc = Math.min(acc + dt, 0.25);
      if (!focused && !bot && !s.won) acc = 0;   // the level waits until you click in
      while (acc >= DT) {
        acc -= DT;
        const inp = bot ? botInput(s, bot) : { left: held(KEYS.left), right: held(KEYS.right), up: held(KEYS.up), jump: held(KEYS.jump), throw: held(KEYS.throw) };
        step(s, inp);
        if (s.won && bot && s.t - s.events[s.events.length - 1][0] > 3) { restart(); bot = newBot(); }
      }
      g.clearRect(0, 0, W, H);
      g.save(); view(g, W, H);
      drawWorld(g, s, s.t);
      drawSketch(g, overlay);
      if (s.won) banner(g, 'Encounter cleared', `${s.p.hearts} hearts left in ${s.t.toFixed(1)} s · R or Restart to go again`, 1);
      else if (s.over > 0) banner(g, 'Out of hearts', 'Back to the start', 1);
      else if (!focused && !bot) banner(g, 'Click the level to play', 'A D or ← → move · Space jump · J flail · hold W or ↑ to aim up', 1);
      g.restore();
      if (s.events.length !== lastEv) {
        lastEv = s.events.length;
        const e = s.events.filter(e => e[1] !== 'fire').slice(-1)[0];
        if (e) say(out, e[2]);
      }
    };
  }, { leave(s) { $(s, 'canvas.demo').blur(); } });

  /* ---------- slide 4: read each piece ---------- */
  // each card is a crop of the same level, in sketch pixels, and what that piece asks of the player
  const PIECES = [
    { name: 'The low ceiling at the start', crop: [24, 200, 517, 480], setup: s => { s.p.x = 112; s.p.y = 437; },
      text: 'The ceiling hangs low over the first ledge, so a jump from under it hits stone. The jump has to leave from the lip, as the dashed arc in the sketch does.' },
    { name: 'Lanterns hold hearts', crop: [1080, 240, 1500, 480], setup: s => { s.p.x = 1293; s.p.y = 437; s.lanterns[5].lit = false; s.items.push({ kind: 'heart', x: 1293, y: 400, vy: 0, got: false, id: 1 }); },
      text: 'Six lanterns drop a heart when the flail breaks them. Each is optional health that costs a jump and a swing, often while something is firing at you.' },
    { name: 'The sword behind the cracked row', crop: [230, 160, 793, 480], setup: s => { s.p.x = 455; s.p.y = 438; s.cracked[2].state = 'gone'; s.cracked[2].gone = 1; s.items.push({ kind: 'sword', x: 455, y: 262 - 1, vy: 0, got: false, id: 2 }); },
      text: 'The sword’s lantern hangs over the cracked row. Break one block and the sword drops through the gap, or climb onto the row from the floating block.' },
    { name: 'Cracked floor', crop: [560, 240, 950, 462], setup: s => { s.p.x = 740; s.p.y = 437; s.cracked[4].state = 'shaking'; s.cracked[4].stand = 0.6; s.cracked[5].state = 'shaking'; s.cracked[5].stand = 0.6; },
      text: 'Stand still and it gives way. A heart that lands on a cracked block falls with it, so you catch the drop and move on.' },
    { name: 'Spawn: Medusa heads', crop: [460, 150, 1040, 480], setup: s => { s.p.x = 640; s.p.y = 438; s.p.face = 1; s.heads.push(waved(742, 214, -1, 0.9, 360)); },
      text: 'The Spawn keeps releasing heads that fly at you in a sine wave, drifting to your height. You read the wave and swing on the low beat, or jump the crest, while the floor asks you to keep moving.' },
    { name: 'The last stretch', crop: [1050, 140, 1556, 480], setup: s => { s.p.x = 1293; s.p.y = 437; s.heads.push(waved(1456, 214, -1, 1.1, 330)); s.cracked[8].state = 'shaking'; s.cracked[8].stand = 0.5; s.cracked[9].state = 'shaking'; s.cracked[9].stand = 0.5; },
      text: 'Three crumbling platforms over the pit while Medusa heads wave in: two pressures at once, which makes this the peak of the encounter.' },
  ];
  function waved(x0, y0, dir, secs, midY) {
    const h = { x: x0, y: y0, mid: y0 + RULES.waveAmp, ph: -Math.PI / 2, dir, hp: RULES.headHp, hit: 0, trail: [] }, w = 2 * Math.PI / RULES.wavePeriod;
    for (let t = 0; t < secs; t += DT) { h.mid += clamp(midY - h.mid, -RULES.homing * DT, RULES.homing * DT); h.ph += w * DT; h.x += dir * RULES.headSpeed * DT; h.y = h.mid + Math.sin(h.ph) * RULES.waveAmp; h.trail.push([h.x, h.y]); if (h.trail.length > 40) h.trail.shift(); }
    return h;
  }
  demo('read', {
    init(sl) {
      const box = $(sl, '.rd-grid');
      box.innerHTML = PIECES.map((p, i) => `<figure class="rd-card"><canvas class="rd-c" data-i="${i}" width="458" height="258"></canvas><figcaption><b>${p.name}</b><span>${p.text}</span></figcaption></figure>`).join('');
      sl._pieces = PIECES.map(p => { const s = newGame(); p.setup(s); return s; });
    },
    enter(sl) {
      const cs = $$(sl, '.rd-c');
      sl._stop = raf((dt, now) => cs.forEach((c, i) => {
        const g = c.getContext('2d'), P = PIECES[i], [x0, y0, x1, y1] = P.crop;
        const k = Math.min(c.width / (x1 - x0), c.height / (y1 - y0));
        g.clearRect(0, 0, c.width, c.height);
        g.save(); g.translate((c.width - (x1 - x0) * k) / 2, (c.height - (y1 - y0) * k) / 2); g.scale(k, k); g.translate(-x0, -y0);
        g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
        const s = sl._pieces[i]; s.t = now;
        drawWorld(g, s, now, { hud: false });
        g.restore();
      }));
    },
    leave(sl) { sl._stop?.(); },
  });

  window.__seek = (t, which = 'reveal') => revealApi.seek(t);
  window.__dur = (which = 'reveal') => revealApi.dur();
})();
