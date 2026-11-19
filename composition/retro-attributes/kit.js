/* Retro enemy attributes (an added M7 example set). Source: Garret Bright, "Build a Bad Guy Workshop: Designing Enemies for
   Retro Games" (Game Developer, 22 April 2014), which lists 51 mix-and-match attributes in three groups: 22 movement
   attributes, 13 qualities and 16 abilities, plus triggers that switch them on and off.
   Each attribute here is one small loop, a pure function of time, in the same 240 x 180 box (centred on 0,0) the Souls
   archetype loops use (../archetypes/arch.js). The article is about sidescrollers and top-down games, so a loop is either
   a side view (view: 'side', drawn with the helpers below, the Super Mario Bros. sprites in student-tokens and the Castlevania and Zelda II sprites in img/) or a
   top-down view (view: 'top', drawn with ../shared/topdown.js and The Legend of Zelda sprites in img/). Where the article names a
   Zelda or Castlevania enemy and its NES sprite exists, the loop uses that sprite, with Link or Simon Belmont as the player.
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
  // classic sprites in img/ (The Legend of Zelda, Zelda II, Castlevania), trimmed to their own pixels, one file per frame.
  // P draws one with its feet at x,y at k units per pixel. o: flip, vflip, a, rot (about its centre), c (centre it on y),
  // dx (shift in sprite pixels, for poses where the body is not the middle of the image).
  const IDIR = new URL('img/', document.currentScript.src).href, PI = {};
  const pim = n => { let im = PI[n]; if (!im) { im = PI[n] = new Image(); im.src = IDIR + n + '.png'; } return im; };
  ('z-bubble z-darknut-left z-ghini z-octorok-front z-octorok-left z-peahat z-peahat2 z-rope z-trap z-vire z-keese z-keese2 z-wallmaster z-wizzrobe z-goriya-front z-goriya-left ' +
    'z-dodongo z-dodongo-bomb z-link-front z-link-front2 z-link-left z-link-left2 z-link-back z-link-sword-left z-bomb z-arrow z-moldorm z2-myu z2-link z2-link-walk z2-link-walk2 z2-link-stab ' +
    'z2-link-crouch z2-link-crouch-stab cv-bat0 cv-bat1 cv-bat2 cv-bat3 cv-bat-hang cv-medusa cv-redskel cv-redskel2 cv-redskel-grow0 cv-redskel-grow1 cv-redskel-grow2 cv-skel cv-skel2 ' +
    'cv-bone0 cv-bone1 cv-bone2 cv-leopard0 cv-leopard1 cv-leopard2 cv-leopard-sit cv-ghost cv-simon0 cv-simon1 cv-simon2 cv-simon3 cv-simon-kneel cv-simon-whip cv-dagger').split(' ').forEach(pim);
  function P(g, n, x, y, k, o = {}) {
    const im = pim(n); if (!im.complete || !im.naturalWidth) return;
    const w = im.naturalWidth * k, h = im.naturalHeight * k;
    g.save(); g.globalAlpha *= o.a ?? 1; g.imageSmoothingEnabled = false; g.translate(x, o.c ? y + h / 2 : y);
    if (o.rot || o.vflip) { g.translate(0, -h / 2); if (o.rot) g.rotate(o.rot); if (o.vflip) g.scale(1, -1); g.translate(0, h / 2); }
    if (o.flip) g.scale(-1, 1);
    g.drawImage(im, -w / 2 + (o.dx || 0) * k, -h, w, h); g.restore();
  }
  const CV = 1.6, ZT = 1.9;   // units per sprite pixel: Castlevania and Zelda II in side view, The Legend of Zelda from above
  // Simon Belmont, feet at x,y, facing right unless o.flip. o.whip for the whip pose, o.jump for the jump pose, o.walk (a clock) to step
  function simon(g, x, y, o = {}) {
    if (o.whip) return P(g, 'cv-simon-whip', x, y, CV, { flip: o.flip, a: o.a, dx: 14 });
    P(g, o.jump ? 'cv-simon-kneel' : 'cv-simon' + (o.walk != null ? Math.floor(o.walk * 8) % 4 : 0), x, y, CV, { flip: o.flip, a: o.a });
  }
  // Link from Zelda II in side view, facing right unless o.flip (the sprites face left). o.stab, o.crouch, o.cstab pick the pose
  function link2(g, x, y, o = {}) {
    const n = o.cstab ? 'z2-link-crouch-stab' : o.stab ? 'z2-link-stab' : o.crouch ? 'z2-link-crouch' : o.walk != null ? (Math.floor(o.walk * 8) % 2 ? 'z2-link-walk' : 'z2-link-walk2') : 'z2-link';
    P(g, n, x, y, CV, { flip: !o.flip, dx: o.stab || o.cstab ? -8 : 0 });
  }
  // a Zelda sprite seen from above, centred on x,y, with a ground shadow
  function zs(g, n, x, y, o = {}) { if (!o.noShadow) T.shadow(x + 2, y + 13, 13, 5, .2 * (o.a ?? 1)); P(g, n, x, y, o.k || ZT, { ...o, c: true }); }
  // the player in the top-down loops: Link, centred on x,y, facing the angle ang. o.sword for the sword pose (sideways only), o.walk to step
  function pl(g, x, y, ang = 0, o = {}) {
    if (typeof o !== 'object') o = {};
    const dx = Math.cos(ang), dy = Math.sin(ang), f = o.walk != null && Math.floor(o.walk * 6) % 2 ? '2' : '';
    if (Math.abs(dx) >= Math.abs(dy)) zs(g, o.sword ? 'z-link-sword-left' : 'z-link-left' + f, x, y, { flip: dx > 0, a: o.a });
    else zs(g, dy > 0 ? 'z-link-front' + f : 'z-link-back', x, y, { a: o.a });
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
  const dshot = (g, t, t0, x0, x1, y = GY - 30, d = .4) => { const k = (t - t0) / d; if (k >= 0 && k <= 1) P(g, 'cv-dagger', lerp(x0, x1, k), y + 7, CV, { flip: x1 < x0 }); };
  const shot = (g, t, t0, x0, x1, y = GY - 18, d = .4) => { const k = (t - t0) / d; if (k >= 0 && k <= 1) S(g, 'fireball', lerp(x0, x1, k), y + 6, 12, { rot: t * 14 }); };
  const note = (s, x, y, col = C.muted) => T.label(s, x, y, 'center', col, 11);
  const dizzy = (g, x, y, t) => { g.fillStyle = C.gold; for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; g.beginPath(); g.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 4, 3, 0, TAU); g.fill(); } };
  const face = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const tri = u => 4 * Math.abs(u - Math.floor(u + .5)) - 1;   // triangle wave, -1 to 1, period 1

  window.RA = { A: {}, LOOP, GY, SKY, FOE, S, P, CV, ZT, simon, link2, zs, pl, dshot, hero, blob, side, top, gap, spikes, pipe, orb, ph, arc, pop, hit, spark, shot, note, dizzy, face, tri, T, C, clamp, lerp, ease, TAU };
})();
