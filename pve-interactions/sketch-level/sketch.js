/* Sketch level: a student's graph-paper platformer encounter, built one square for one square and played.
   level.js holds the level and the simulation (SKETCH); this file only draws it and wires the four slides.
   The clean render uses the sketch's own pixel coordinates, so it can be wiped over or laid under img/sketch.png.
   window.__seek(t, 'reveal') / window.__dur('reveal') render slide 2's sequence frame by frame for the GIF. */
(function () {
  const { $, $$, demo, canvasDemo, say, raf } = FPF.kit;
  const { DT, RULES, LEVEL, newGame, step, newBot, botInput, recordRun, chest } = SKETCH;
  const { PAPER, CEIL, GROUND, CRACKED, LANTERNS, SPAWNS } = LEVEL;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

  const IMG = new Image();
  IMG.src = 'img/sketch.png';

  /* ---------- colours ---------- */
  const C = {
    sky0: '#232b50', sky1: '#141a33', grid: 'rgba(255,255,255,.05)',
    stone: '#4b5680', stoneDk: '#343d61', stoneTop: '#a2aed6', mortar: 'rgba(16,20,40,.35)', edge: '#1a2040',
    crack: '#8b5a2b', crackDk: '#5e3a17', crackLine: '#3a220c', crackTop: '#c08a4f',
    glass: '#8fd0ff', cage: '#2f6fd0', glow: 'rgba(120,190,255,', heart: '#e2343f', sword: '#9a55e6', swordDk: '#5d2a9c',
    spawn: '#cf2d2d', spawnDk: '#7d1414', spawnLt: '#ff7a6a', shot: '#ff5a3a',
    armor: '#c9d0e0', armorDk: '#7f88a3', hood: '#2b3358', visor: '#7fe0ff', chain: '#b9c0d4',
  };

  /* ---------- shapes ---------- */
  function heartPath(g, x, y, r) {
    g.beginPath();
    g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
    g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
    g.closePath();
  }
  function drawHeart(g, x, y, r, fill = C.heart, a = 1) {
    g.save(); g.globalAlpha *= a; heartPath(g, x, y, r); g.fillStyle = fill; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(60,0,10,.6)'; g.stroke(); g.restore();
  }
  function drawSword(g, x, y, s = 1, rot = -Math.PI / 4) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.fillStyle = C.sword; g.strokeStyle = C.swordDk; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-4, -8); g.lineTo(26, -4); g.lineTo(32, 0); g.lineTo(26, 4); g.lineTo(-4, 8); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.swordDk; g.fillRect(-8, -13, 5, 26); g.fillRect(-20, -3.5, 13, 7);
    g.fillStyle = '#e7d4ff'; g.fillRect(0, -1.5, 22, 3);
    g.restore();
  }
  function bricks(g, x0, y0, x1, y1, h = 22, w = 41) {
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.strokeStyle = C.mortar; g.lineWidth = 1.5; g.beginPath();
    for (let y = y0 + h, r = 1; y < y1; y += h, r++) { g.moveTo(x0, y); g.lineTo(x1, y); }
    for (let y = y0, r = 0; y < y1; y += h, r++) for (let x = x0 + (r % 2 ? w / 2 : 0) + w; x < x1 + w; x += w) { g.moveTo(x, y); g.lineTo(x, Math.min(y1, y + h)); }
    g.stroke(); g.restore();
  }
  function stoneBlock(g, x0, y0, x1, y1, top = true) {
    g.fillStyle = C.stone; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    bricks(g, x0, y0, x1, y1);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0, y1 - 6, x1 - x0, 6);
    if (top) { g.fillStyle = C.stoneTop; g.fillRect(x0, y0, x1 - x0, 4); }
    g.strokeStyle = C.edge; g.lineWidth = 2; g.strokeRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
  }
  // the crack pattern is fixed per block, like the scribbles in the sketch
  const CRACKS = [[[0.2, 0.15], [0.35, 0.45], [0.22, 0.8]], [[0.55, 0.1], [0.48, 0.4], [0.65, 0.6], [0.58, 0.9]], [[0.8, 0.2], [0.72, 0.5], [0.85, 0.85]]];
  function crackedBlock(g, b, st, t, i) {
    const shake = st.state === 'shaking' ? Math.sin(t * 70 + i) * Math.min(2.5, st.stand * 4) : 0;
    const x0 = b.x0 + shake, y0 = b.y0, w = b.x1 - b.x0, h = b.y1 - b.y0;
    if (st.state === 'gone') {
      const u = st.gone / RULES.regrow;
      g.save(); g.setLineDash([5, 5]); g.strokeStyle = `rgba(192,138,79,${0.25 + 0.35 * u})`; g.lineWidth = 2; g.strokeRect(b.x0 + 2, y0 + 2, w - 4, h - 4); g.restore();
      g.fillStyle = `rgba(139,90,43,${0.25 * u})`; g.fillRect(b.x0 + 2, y0 + h * (1 - u) + 2, w - 4, h * u - 4 > 0 ? h * u - 4 : 0);
      return;
    }
    g.fillStyle = C.crack; g.fillRect(x0, y0, w, h);
    g.fillStyle = C.crackTop; g.fillRect(x0, y0, w, 4);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0, y0 + h - 5, w, 5);
    g.strokeStyle = C.crackLine; g.lineWidth = 2; g.lineJoin = 'round';
    CRACKS.forEach((c, k) => { if ((i + k) % 4 === 3) return; g.beginPath(); c.forEach(([u, v], j) => (j ? g.lineTo : g.moveTo).call(g, x0 + u * w, y0 + v * h)); g.stroke(); });
    if (st.state === 'shaking' && st.stand > 0) {
      g.strokeStyle = `rgba(255,220,170,${clamp(st.stand / RULES.crumble, 0, 1)})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x0 + w * 0.1, y0 + h * 0.55); g.lineTo(x0 + w * 0.5, y0 + h * 0.35); g.lineTo(x0 + w * 0.9, y0 + h * 0.6); g.stroke();
    }
    g.strokeStyle = C.crackDk; g.lineWidth = 2; g.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
  }
  function ceilingAbove(x) { const c = CEIL.find(([a, b]) => x >= a && x < b); return c ? c[3] : PAPER.y0; }
  function lantern(g, L, lit, t) {
    const top = ceilingAbove(L.x), cy = L.y;
    g.strokeStyle = '#9aa3bf'; g.lineWidth = 2; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(L.x, top); g.lineTo(L.x, lit ? cy - 20 : top + 14); g.stroke(); g.setLineDash([]);
    if (!lit) { g.strokeStyle = '#9aa3bf'; g.beginPath(); g.arc(L.x, top + 18, 4, 0, Math.PI); g.stroke(); return; }
    const sw = Math.sin(t * 2 + L.x) * 0.04;
    g.save(); g.translate(L.x, cy - 20); g.rotate(sw); g.translate(-L.x, -(cy - 20));
    const glow = g.createRadialGradient(L.x, cy, 2, L.x, cy, 44);
    glow.addColorStop(0, C.glow + '.45)'); glow.addColorStop(1, C.glow + '0)');
    g.fillStyle = glow; g.fillRect(L.x - 46, cy - 46, 92, 92);
    g.fillStyle = C.glass; g.fillRect(L.x - 9, cy - 13, 18, 26);
    g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(L.x, cy + 2, 4, 7 + Math.sin(t * 9 + L.x) * 1.2, 0, 0, 7); g.fill();
    g.strokeStyle = C.cage; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(L.x - 13, cy - 13); g.lineTo(L.x, cy - 22); g.lineTo(L.x + 13, cy - 13); g.closePath(); g.stroke();
    g.strokeRect(L.x - 10, cy - 13, 20, 26);
    g.beginPath(); g.moveTo(L.x - 3, cy - 13); g.lineTo(L.x - 3, cy + 13); g.moveTo(L.x + 3, cy - 13); g.lineTo(L.x + 3, cy + 13); g.stroke();
    g.beginPath(); g.ellipse(L.x, cy + 16, 13, 4, 0, 0, 7); g.fillStyle = C.cage; g.fill();
    g.restore();
    // what it holds, drawn small beside it as the sketch does
    g.save(); g.globalAlpha = 0.85;
    if (L.drop === 'sword') drawSword(g, L.x + 30, cy - 34, 0.7, 0); else drawHeart(g, L.x + 22, cy - 30, 8);
    g.restore();
  }
  function spawn(g, S, st, t) {
    if (st.hp <= 0) {
      g.fillStyle = 'rgba(80,20,20,.55)'; g.beginPath(); g.ellipse(S.x, ceilingAbove(S.x) + 3, 26, 7, 0, 0, 7); g.fill();
      return;
    }
    const fl = st.hit > 0, pulse = Math.sin(t * 4) * 2;
    g.save(); g.translate(S.x, S.y);
    // the spiky mane on the right, as sketched
    g.fillStyle = fl ? '#fff' : C.spawnDk;
    g.beginPath();
    for (let k = 0; k <= 9; k++) { const a = -1.6 + k * 0.36, r = k % 2 ? 26 : 40 + pulse; g.lineTo(Math.cos(a) * r + 6, Math.sin(a) * r); }
    g.lineTo(0, 0); g.closePath(); g.fill();
    g.fillStyle = fl ? '#fff' : C.spawn;
    g.beginPath(); g.ellipse(0, 0, 26, 30, 0, 0, 7); g.fill();
    g.strokeStyle = C.spawnDk; g.lineWidth = 2.5; g.stroke();
    // eye and mouth face down-left, toward where its Homing shots go
    g.fillStyle = '#fff3d6'; g.beginPath(); g.ellipse(-9, -4, 9, 10, 0, 0, 7); g.fill();
    g.fillStyle = '#220'; g.beginPath(); g.arc(-12, -1, 4, 0, 7); g.fill();
    g.strokeStyle = '#3a0505'; g.lineWidth = 3; g.beginPath(); g.arc(-12, 14, 8, 0.2, 2.6); g.stroke();
    if (st.hp < RULES.spawnHp) { g.strokeStyle = '#ffd0c0'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, -18); g.lineTo(14, -6); g.lineTo(8, 4); g.stroke(); }
    g.restore();
  }
  function shot(g, sh) {
    sh.trail.forEach(([x, y], k) => { g.fillStyle = `rgba(255,90,58,${(k / sh.trail.length) * 0.4})`; g.beginPath(); g.arc(x, y, 3 + k * 0.35, 0, 7); g.fill(); });
    const gl = g.createRadialGradient(sh.x, sh.y, 1, sh.x, sh.y, 20);
    gl.addColorStop(0, 'rgba(255,200,150,.9)'); gl.addColorStop(0.4, 'rgba(255,90,58,.7)'); gl.addColorStop(1, 'rgba(255,90,58,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(sh.x, sh.y, 20, 0, 7); g.fill();
    g.fillStyle = '#fff1d0'; g.beginPath(); g.arc(sh.x, sh.y, 4, 0, 7); g.fill();
  }
  function gear(g, x, y, r, col) {
    g.fillStyle = col; g.beginPath();
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, rr = k % 2 ? r : r + 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#2a2f45'; g.beginPath(); g.arc(x, y, r * 0.35, 0, 7); g.fill();
  }
  function player(g, s, t) {
    const p = s.p;
    if (p.inv > 0 && Math.floor(p.inv * 14) % 2) return;
    const x = p.x, foot = p.y, f = p.face, moving = Math.abs(p.vx) > 1 && p.ground;
    const ph = moving ? Math.sin(s.t * 16) : 0;
    g.save(); g.translate(x, foot); g.scale(f, 1);
    g.lineCap = 'round';
    // legs
    g.strokeStyle = C.armorDk; g.lineWidth = 8;
    if (!p.ground) { g.beginPath(); g.moveTo(-4, -30); g.lineTo(-9, -12); g.lineTo(-4, -4); g.moveTo(5, -30); g.lineTo(10, -16); g.lineTo(14, -10); g.stroke(); }
    else { g.beginPath(); g.moveTo(-4, -30); g.lineTo(-4 - ph * 8, -2); g.moveTo(5, -30); g.lineTo(5 + ph * 8, -2); g.stroke(); }
    // body and pauldrons
    g.fillStyle = C.armor; g.strokeStyle = C.edge; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-12, -62, 24, 34, 6); g.fill(); g.stroke();
    g.fillStyle = C.armorDk; g.fillRect(-12, -36, 24, 5);
    g.fillStyle = p.sword ? C.sword : '#5b6a9a'; g.beginPath(); g.ellipse(-9, -58, 7, 5, 0, 0, 7); g.ellipse(9, -58, 7, 5, 0, 0, 7); g.fill();
    // hooded helm
    g.fillStyle = C.hood; g.beginPath(); g.moveTo(-13, -62); g.quadraticCurveTo(-14, -88, 2, -86); g.quadraticCurveTo(15, -84, 13, -62); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.visor; g.fillRect(2, -76, 10, 3);
    // arm: out when the flail is out
    g.strokeStyle = C.armor; g.lineWidth = 7;
    g.beginPath(); g.moveTo(4, -56);
    if (s.fl) g.lineTo(14 + s.fl.dx * f * 0, -56 + 0); else g.lineTo(10, -42 + ph * 2);
    g.stroke();
    g.restore();
  }
  function flail(g, s) {
    const f = s.fl; if (!f || f.hx === undefined) return;
    const c = chest(s.p), n = Math.max(2, Math.floor(f.len / 10));
    g.fillStyle = C.chain;
    for (let k = 1; k < n; k++) { const u = k / n; g.beginPath(); g.ellipse(c.x + (f.hx - c.x) * u, c.y + (f.hy - c.y) * u, 3.4, 2.2, Math.atan2(f.hy - c.y, f.hx - c.x), 0, 7); g.fill(); }
    gear(g, f.hx, f.hy, RULES.headR - 2, s.p.sword ? '#b98af2' : '#d4d8e4');
  }
  function item(g, it, t) {
    if (it.got) return;
    const bob = it.vy === 0 ? Math.sin(t * 4 + it.id) * 2 : 0;
    if (it.kind === 'sword') { const gl = g.createRadialGradient(it.x, it.y - 14, 2, it.x, it.y - 14, 30); gl.addColorStop(0, 'rgba(180,120,255,.5)'); gl.addColorStop(1, 'rgba(180,120,255,0)'); g.fillStyle = gl; g.fillRect(it.x - 30, it.y - 44, 60, 60); drawSword(g, it.x, it.y - 14 + bob, 0.85); }
    else drawHeart(g, it.x, it.y - 12 + bob, 9);
  }
  function hud(g, s) {
    const x = PAPER.x0 + 14, y = PAPER.y0 + 22;
    g.save();
    g.fillStyle = 'rgba(10,14,30,.6)'; g.beginPath(); g.roundRect(x - 8, y - 16, 238, 34, 10); g.fill();
    for (let k = 0; k < RULES.maxHearts; k++) drawHeart(g, x + 12 + k * 26, y + 1, 8, k < s.p.hearts ? C.heart : 'rgba(255,255,255,.14)');
    if (s.p.sword) drawSword(g, x + 152, y + 2, 0.55, 0);
    g.fillStyle = '#cfd6ef'; g.font = '600 15px Jost, sans-serif'; g.textAlign = 'right';
    g.fillText(`${Math.floor(s.t / 60)}:${String(Math.floor(s.t % 60)).padStart(2, '0')}`, x + 224, y + 6);
    g.restore();
  }
  function tags(g) {
    g.save(); g.font = '600 italic 17px Jost, sans-serif'; g.fillStyle = '#ff8f80'; g.textAlign = 'center';
    SPAWNS.forEach(S => g.fillText('Spawn', S.x - 2, S.y - 40 < PAPER.y0 + 50 ? S.y + 58 : S.y - 40));
    g.restore();
  }

  // draws the whole level for state s, in the sketch's coordinates
  function drawWorld(g, s, t, o = {}) {
    g.save();
    g.beginPath(); g.rect(PAPER.x0, PAPER.y0, PAPER.x1 - PAPER.x0, PAPER.y1 - PAPER.y0); g.clip();
    const sky = g.createLinearGradient(0, PAPER.y0, 0, PAPER.y1);
    sky.addColorStop(0, C.sky0); sky.addColorStop(1, C.sky1);
    g.fillStyle = sky; g.fillRect(PAPER.x0, PAPER.y0, PAPER.x1 - PAPER.x0, PAPER.y1 - PAPER.y0);
    // the graph paper is still there, faintly: one square is one square
    g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath();
    for (let x = 64 - 41; x < PAPER.x1; x += 41.05) { g.moveTo(x, PAPER.y0); g.lineTo(x, PAPER.y1); }
    for (let y = 88 - 44; y < PAPER.y1; y += 44) { g.moveTo(PAPER.x0, y); g.lineTo(PAPER.x1, y); }
    g.stroke();
    // the pit glows faintly
    const pit = g.createLinearGradient(0, PAPER.y1 - 70, 0, PAPER.y1);
    pit.addColorStop(0, 'rgba(0,0,0,0)'); pit.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = pit; g.fillRect(PAPER.x0, PAPER.y1 - 70, PAPER.x1 - PAPER.x0, 70);
    // ceiling band
    CEIL.forEach(([x0, x1, top, under]) => { g.fillStyle = C.stoneDk; g.fillRect(x0, PAPER.y0, x1 - x0, under - PAPER.y0); bricks(g, x0, PAPER.y0, x1, under); });
    g.strokeStyle = C.stoneTop; g.lineWidth = 3; g.beginPath();
    CEIL.forEach(([x0, x1, , under], i) => { g.moveTo(x0, under); g.lineTo(x1, under); const nx = CEIL[i + 1]; if (nx) { g.moveTo(x1, under); g.lineTo(x1, nx[3]); } });
    g.stroke();
    GROUND.forEach(([x0, y0, x1, y1]) => stoneBlock(g, x0, y0, x1, y1));
    s.cracked.forEach((st, i) => crackedBlock(g, CRACKED[i], st, t, i));
    LANTERNS.forEach((L, i) => lantern(g, L, s.lanterns[i].lit, t));
    SPAWNS.forEach((S, i) => spawn(g, S, s.spawns[i], t));
    if (o.tags !== false) tags(g);
    s.items.forEach(it => item(g, it, t));
    player(g, s, t);
    flail(g, s);
    s.shots.forEach(sh => shot(g, sh));
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
    const cx = (PAPER.x0 + PAPER.x1) / 2, cy = 586;
    g.save(); g.globalAlpha = a;
    g.fillStyle = 'rgba(10,14,30,.82)'; g.beginPath(); g.roundRect(cx - 270, cy - 40, 540, sub ? 86 : 62, 14); g.fill();
    g.strokeStyle = '#ffb951'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffb951'; g.font = '800 30px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.fillText(text, cx, cy + 2);
    if (sub) { g.fillStyle = '#d6dbef'; g.font = '500 18px Jost, sans-serif'; g.fillText(sub, cx, cy + 32); }
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
      drawWorld(g, frames[0], t, { hud: false }); drawSketch(g, 0.18); g.restore();
      g.fillStyle = '#ffb951'; g.fillRect(wx - 2, PAPER.y0, 4, PAPER.y1 - PAPER.y0);
    } else {
      drawWorld(g, s, t);
      drawSketch(g, overlay ? 0.32 : 0);
      if (s.won) banner(g, 'Encounter cleared', `${s.p.hearts} hearts left · both Spawns down · the purple sword found`, clamp((t - (t0 + frames.findIndex(f => f.won) * DT)) / 0.4, 0, 1));
      if (t > end) drawSketch(g, clamp((t - end) / 1.2, 0, 1));
    }
    g.restore();
    if (t < T_SK) return 'The student’s sketch: one ledge-to-ledge encounter on graph paper.';
    if (t < T_SK + T_WIPE + T_HOLD) return 'The same level, built square for square: every ledge, lantern, cracked block and Spawn sits where it was drawn.';
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
    { name: 'Spawn and Homing', crop: [460, 150, 1040, 480], setup: s => { s.p.x = 640; s.p.y = 438; s.p.face = 1; s.shots.push({ x: 700, y: 300, a: 2.3, trail: [[730, 250], [722, 265], [714, 278], [706, 290]], dead: false }); },
      text: 'A chaser from above. It pulls your eyes to the ceiling while the floor below asks you to keep moving; the flail can knock a shot out of the air.' },
    { name: 'The last stretch', crop: [1050, 140, 1556, 480], setup: s => { s.p.x = 1293; s.p.y = 437; s.shots.push({ x: 1380, y: 300, a: 2.6, trail: [[1440, 240], [1425, 255], [1410, 270], [1395, 285]], dead: false }); s.cracked[8].state = 'shaking'; s.cracked[8].stand = 0.5; s.cracked[9].state = 'shaking'; s.cracked[9].stand = 0.5; },
      text: 'Three crumbling platforms over the pit while a Homing shot closes in: two pressures at once, which makes this the peak of the encounter.' },
  ];
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
