/* Retro enemy attributes (an added M7 example set). Source: Garret Bright, "Build a Bad Guy Workshop: Designing Enemies for
   Retro Games" (Game Developer, 22 April 2014), which lists 51 mix-and-match attributes in three groups: 22 movement
   attributes, 13 qualities and 16 abilities, plus triggers that switch them on and off.
   Each attribute here is one small loop, a pure function of time, in the same 240 x 180 box (centred on 0,0) the Souls
   archetype loops use (../archetypes/arch.js). The article is about sidescrollers and top-down games, so a loop is either
   a side view (view: 'side', drawn with the helpers below and the Super Mario Bros. sprites in student-tokens) or a
   top-down view (view: 'top', drawn with ../shared/topdown.js).
   RA.A[key] = { name, group, view, gi, col, line, counter, ex, loop(g, t) }.
   line is the article's definition in our words; ex is the example the article names ('' when it names none);
   counter is our reading of the answer the attribute asks the player for (the article does not give answers). */
(function () {
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const LOOP = 4, GY = 50, SKY = '#dcebf2', FOE = '#c2412c';
  const DIR = new URL('../../student-tokens/256px/mario/', document.currentScript.src).href;
  // the sprite's own pixels inside its 256 x 256 file
  const BOX = { 'goomba': [11, 11, 245, 245], 'goomba-flat': [11, 68, 245, 188], 'red-koopa': [45, 10, 211, 246], 'piranha': [49, 11, 207, 245],
    'paratroopa': [49, 11, 207, 245], 'bullet-bill': [11, 26, 245, 230], 'bobomb-hd': [17, 10, 239, 246], 'hammer-bro': [54, 11, 202, 245],
    'hammer-hd': [10, 20, 246, 236], 'spiny': [11, 11, 245, 245], 'trampoline': [11, 11, 245, 245], 'fireball': [10, 10, 246, 246],
    'mario': [40, 11, 216, 245], 'mario-jump': [11, 11, 245, 245], 'mario-walk': [26, 11, 230, 245], 'hard-block': [11, 11, 245, 245], 'used-block': [11, 11, 245, 245] };
  const IM = {};
  Object.keys(BOX).forEach(n => { IM[n] = new Image(); IM[n].src = DIR + n + '.png'; });
  // a sprite with its feet at x,y and height h. o: flip, a, rot (about its centre), sx, sy (squash from the feet)
  function S(g, n, x, y, h, o = {}) {
    const im = IM[n]; if (!im.complete || !im.naturalWidth) return;
    const b = BOX[n], sw = b[2] - b[0], sh = b[3] - b[1], w = h * sw / sh;
    g.save(); g.globalAlpha *= o.a ?? 1; g.imageSmoothingEnabled = n.endsWith('-hd'); g.translate(x, y);
    if (o.rot) { g.translate(0, -h / 2); g.rotate(o.rot); g.translate(0, h / 2); }
    g.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1);
    g.drawImage(im, b[0], b[1], sw, sh, -w / 2, -h, w, h); g.restore();
  }
  // the player in side view: Mario, feet at x,y. o.jump for the jump pose, o.walk (a clock) to step, o.flip to face left
  function hero(g, x, y, o = {}) {
    const n = o.jump ? 'mario-jump' : o.walk != null && Math.floor(o.walk * 8) % 2 ? 'mario-walk' : 'mario';
    S(g, n, x, y, o.jump ? 34 : 32, o);
  }
  // a generic side-view enemy: a dome with eyes, feet at x,y, r half its width, facing left unless o.flip
  function blob(g, x, y, r, col = FOE, o = {}) {
    const d = o.flip ? -1 : 1;
    g.save(); g.globalAlpha *= o.a ?? 1; g.translate(x, y); g.scale(o.sx ?? 1, o.sy ?? 1);
    g.fillStyle = col; g.strokeStyle = o.edge || C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(-r, 0); g.lineTo(-r, -r * .9); g.quadraticCurveTo(-r, -r * 2, 0, -r * 2); g.quadraticCurveTo(r, -r * 2, r, -r * .9); g.lineTo(r, 0); g.closePath(); g.fill(); g.stroke();
    if (!o.noEyes) {
      g.fillStyle = '#fff'; [-.6, -.08].forEach(e => { g.beginPath(); g.ellipse(e * r * d, -r * 1.2, r * .2, r * .3, 0, 0, TAU); g.fill(); });
      g.fillStyle = C.navy; [-.6, -.08].forEach(e => { g.beginPath(); g.arc(e * r * d - d * r * .07, -r * 1.15, r * .1, 0, TAU); g.fill(); });
    }
    g.restore();
  }
  function side(g, w = 240, h = 180) { g.fillStyle = SKY; g.fillRect(-w / 2, -h / 2, w, h); T.wall(-w / 2, GY, w, h / 2 - GY); }
  function top(g, w = 240, h = 180) { T.floor(-w / 2, -h / 2, w, h); }
  // cuts a pit into the ground between x0 and x1
  function gap(g, x0, x1) { g.fillStyle = SKY; g.fillRect(x0, GY, x1 - x0, 45); g.fillStyle = C.wallDk; g.fillRect(x0 - 2, GY, 2, 45); g.fillRect(x1, GY, 2, 45); }
  function spikes(g, x0, x1, y, dir = -1, h = 10) {
    g.fillStyle = '#9da1b8'; g.strokeStyle = C.navy; g.lineWidth = 1.5;
    const n = Math.max(1, Math.round((x1 - x0) / 10)), w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(x0 + i * w, y); g.lineTo(x0 + (i + .5) * w, y + dir * h); g.lineTo(x0 + (i + 1) * w, y); g.closePath(); g.fill(); g.stroke(); }
  }
  function pipe(g, x, topY, w = 32) {
    g.fillStyle = '#3aa655'; g.strokeStyle = C.navy; g.lineWidth = 2;
    g.fillRect(x - w / 2 + 3, topY, w - 6, GY - topY); g.strokeRect(x - w / 2 + 3, topY, w - 6, GY - topY);
    g.fillRect(x - w / 2, topY, w, 10); g.strokeRect(x - w / 2, topY, w, 10);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - w / 2 + 6, topY + 11, 4, GY - topY - 12);
  }
  const orb = (g, x, y, r, col, edge = C.navy) => { g.fillStyle = col; g.strokeStyle = edge; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); };
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const arc = (k, h) => Math.sin(Math.PI * clamp(k)) * h;
  const pop = (s, x, y, age, col = C.redDk) => { if (age >= 0 && age < .9) T.popText(s, x, y - age * 22, col, 1 - age / .9); };
  const hit = (x0, y0, x1, y1, age, col = C.gold) => { if (age >= 0 && age < .22) T.tracer(x0, y0, x1, y1, 1 - age / .22, col, 5); };
  const spark = (x, y, age, r = 22) => { if (age >= 0 && age < .3) T.flash(x, y, r, 1 - age / .3); };
  // Mario's fireball from x0 to x1 over d seconds, starting at t0
  const shot = (g, t, t0, x0, x1, y = GY - 18, d = .4) => { const k = (t - t0) / d; if (k >= 0 && k <= 1) S(g, 'fireball', lerp(x0, x1, k), y + 6, 12, { rot: t * 14 }); };
  const note = (s, x, y, col = C.muted) => T.label(s, x, y, 'center', col, 11);
  const dizzy = (g, x, y, t) => { g.fillStyle = C.gold; for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; g.beginPath(); g.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 4, 3, 0, TAU); g.fill(); } };
  const face = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const tri = u => 4 * Math.abs(u - Math.floor(u + .5)) - 1;   // triangle wave, -1 to 1, period 1

  window.RA = { A: {}, LOOP, GY, SKY, FOE, S, hero, blob, side, top, gap, spikes, pipe, orb, ph, arc, pop, hit, spark, shot, note, dizzy, face, tri, T, C, clamp, lerp, ease, TAU };
})();
