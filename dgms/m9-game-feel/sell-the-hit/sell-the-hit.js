/* Sell the hit (DGMS Module 9, feedback techniques, deck slides 179-202).
   Slide 1: the plain version, a square striking a circle in eighteen tiles, one technique each, in the course palette.
   Slide 2: eighteen copies of one strike, a knight lunging at a training dummy, each adding exactly one game feel
   technique, grouped into six layers (timing, body, effects, camera, beyond the screen, world).
   Slide 3: the same strike, large, with any mix of the eighteen stacked together.
   Every frame is a pure function of (techniques on, time in the loop), so window.__seek replays exactly for the
   GIF recorder. Sound and rumble fire only during live play, never from __seek. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2;

  /* ---------- the eighteen techniques, in grid order ---------- */
  const GROUPS = {
    time: { name: 'Timing', col: '#5562eb', ink: '#3a46c8', say: 'changes when things happen' },
    body: { name: 'Body', col: '#2fae63', ink: '#1a7f45', say: 'changes how the characters move and react' },
    fx: { name: 'Effects', col: '#ffb951', ink: '#9a5a06', say: 'draws on top of the action' },
    cam: { name: 'Camera', col: '#8a4fd6', ink: '#6a34b0', say: 'moves the view itself' },
    sense: { name: 'Beyond the screen', col: '#e5322d', ink: '#a8201c', say: 'reaches the ears and hands' },
    world: { name: 'World', col: '#3d4270', ink: '#262c6a', say: 'makes the place answer back' },
  };
  const TECH = [
    ['antic', 'Anticipation', 'time', 'The knight pulls back before it lunges, so the eye knows a strike is coming.', 'A longer wind-up reads as heavier. Too long, and the press feels late.'],
    ['ramp', 'Speed ramping', 'time', 'The lunge starts slow and finishes fast, so the speed peaks at the moment of contact.', 'Same distance, same duration as the plain hit: only the speed curve changes.'],
    ['stop', 'Hit stop', 'time', 'Both fighters freeze for a few frames at contact, and the dummy shivers in place.', 'Deck: “scaled depending on the impact. Don’t abuse it or it might make the game feel laggy.”'],
    ['follow', 'Follow-through', 'time', 'The knight keeps moving past the contact point and settles, instead of stopping dead on it.', 'The overshoot says the strike had momentum the dummy didn’t absorb.'],
    ['squash', 'Squash & stretch', 'body', 'The knight stretches along its lunge and flattens on contact; the dummy squashes and springs back.', 'Keep the volume: as a shape gets wider it gets shorter.'],
    ['react', 'Hit reactions', 'body', 'The dummy is knocked back, tips over, winces, and recovers.', 'Deck: the classic mistake is “not moving enough the characters”.'],
    ['second', 'Secondary motion', 'body', 'A plume on the dummy keeps swinging after the body has stopped.', 'Loose parts lag behind and overshoot, which sells the force that moved the body.'],
    ['vfx', 'Impact VFX', 'fx', 'A burst of sparks marks the exact point and moment of contact.', 'Deck: impacts and explosions “bring weight into actions”.'],
    ['trail', 'Weapon trails', 'fx', 'A ribbon follows the sword tip, tracing an arc the eye would otherwise miss.', 'Deck: trails “simulate the blur”.'],
    ['smear', 'Motion smears', 'fx', 'On the fastest frames the knight’s body is drawn as one solid trapezoid: full height at the front, tapering back to where it was a moment ago.', 'Animators paint this instead of in-between frames. Seen in a still it looks broken; in motion it reads as speed.'],
    ['blur', 'Motion blur', 'fx', 'Fading copies trail the knight, more of them the faster it moves.', 'Dynamic: no copies at rest, the most at peak speed.'],
    ['flash', 'Hit flash', 'fx', 'The dummy turns white for a few frames at contact.', 'Deck: “Yes, you hit the target. It flashes and moves back a tiny bit.”'],
    ['shake', 'Camera shake', 'cam', 'The whole view jolts and settles. The frame corners mark the screen, which holds still.', 'Deck: shake “must simulate the action”: sideways for a sideways blow.'],
    ['fov', 'FOV kick', 'cam', 'The view punches in at contact and eases back out.', 'A quick narrowing of the field of view: the opposite of a sprint’s widening.'],
    ['focus', 'Focus kick', 'cam', 'The background blurs at contact, pulling the eye onto the hit, then sharpens again.', 'A depth-of-field pulse: the subject stays crisp.'],
    ['sound', 'Sound design', 'sense', 'A whoosh on the swing and a thump on contact. The track under the tile shows where each lands.', 'Deck: “the rare feedback that doesn’t need to be on-screen”. Hear it on the next slide.'],
    ['haptic', 'Haptics', 'sense', 'The controller rumbles, short and strong, on contact.', 'Deck: “the only physical influence most games have”. Short and strong for impacts; rising or pulsing for charge-ups.'],
    ['world', 'World response', 'world', 'Dust kicks up, pebbles scatter and the floor cracks under the dummy.', 'The place reacts, so the hit has consequences beyond the two fighters.'],
  ].map(([id, name, group, what, tip]) => ({ id, name, group, what, tip }));
  const BY = Object.fromEntries(TECH.map(t => [t.id, t]));
  const GROUP_IDS = Object.keys(GROUPS);

  /* ---------- the strike, as a pure function of time ----------
     Local frame: 200 x 180, floor at GY; K scales both characters. The knight starts at AX and its sword tip reaches the dummy's face at AHIT. */
  const K = 1.3, LW = 200, LH = 180, GY = 128, AX = 40, DX = 160, AHIT = DX - 16 * K - 10 * K - 23 * K * Math.cos(.3);
  const P = 2.4, A0 = .42, A1 = .82, HIT = 1.04, R0 = 1.62, R1 = 2.08, STOP = .15;
  // BASIC draws the plain version: a square and a circle, nothing else on screen unless a technique needs it
  let BASIC = false, NOBODY = false;   // NOBODY: draw the knight's blade without its body
  const hitX = () => BASIC ? DX - 31 * K : AHIT;
  const sim = (t, on) => on.stop && t > HIT ? (t < HIT + STOP ? HIT : t - STOP) : t;
  function knightX(s, on) {
    const back = on.antic ? 14 : 0;
    if (s < A0) return AX;
    if (s < A1) return AX - back * ease(clamp((s - A0) / (A1 - A0)));
    const AH = hitX();
    if (s < HIT) { const k = (s - A1) / (HIT - A1); return lerp(AX - back, AH, on.ramp ? k * k * k : k); }
    const d = s - HIT;
    const fx = on.follow ? 11 * Math.exp(-d * 6) * Math.sin(Math.min(d * 13, Math.PI * 1.5)) : 0;
    if (s < R0) return AH + fx;
    return lerp(AH, AX, ease(clamp((s - R0) / (R1 - R0)))) + fx;
  }
  // sword angle: 0 points right, negative is up
  function swordA(s, on) {
    const rest = -.75, raised = on.antic ? -2.05 : -1.5, hit = .3;
    if (s < A0) return rest;
    if (s < A1) return lerp(rest, raised, ease(clamp((s - A0) / (A1 - A0))));
    if (s < HIT) { const k = clamp((s - A1 - (HIT - A1) * .35) / ((HIT - A1) * .65)); return lerp(raised, hit, on.ramp ? k * k : ease(k)); }
    const d = s - HIT, over = on.follow ? .85 * Math.sin(clamp(d / .16) * Math.PI / 2) * (1 - clamp((d - .2) / .3)) : 0;
    if (s < R0) return hit + over;
    return lerp(hit, rest, ease(clamp((s - R0) / (R1 - R0)))) + over;
  }
  const speed = (s, on) => Math.abs(knightX(s, on) - knightX(s - 1 / 60, on)) * 60;
  // deterministic noise for shake and debris
  const nz = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  /* ---------- drawing ---------- */
  function backdrop(g, on, dr) {
    // two distant pillars: the focus kick blurs them, every other tile leaves them sharp
    const bl = on.focus && dr > 0 ? 3.2 * Math.sin(clamp(dr / .1) * Math.PI / 2) * (1 - clamp((dr - .25) / .45)) : 0;
    if (BASIC) {   // only the focus kick's background rings and the world's floor line
      if (on.focus) {
        g.save(); if (bl > .05) g.filter = `blur(${bl.toFixed(2)}px)`;
        g.strokeStyle = '#a9aed0'; g.lineWidth = 1.5;
        [[18, 70, 5], [90, 58, 4], [44, 118, 4], [176, 74, 5], [132, 120, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); });
        g.restore();
      }
      if (on.world) { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(8, GY + 1); g.lineTo(LW - 8, GY + 1); g.stroke(); }
      return;
    }
    g.save();
    if (bl > .05) { g.filter = `blur(${bl.toFixed(2)}px)`; g.globalAlpha = 1 - bl * .08; }
    [[14, 76], [184, 62]].forEach(([x, h]) => {
      g.fillStyle = '#cfc6dd'; g.fillRect(x - 7, GY - h, 14, h);
      g.fillStyle = '#b9b0cb'; g.fillRect(x - 9, GY - h - 4, 18, 5); g.fillRect(x - 7, GY - 6, 14, 6);
    });
    g.fillStyle = '#d9d0e6'; g.beginPath(); g.arc(60, 30, 7, 0, TAU); g.arc(126, 22, 5, 0, TAU); g.fill();
    g.restore();
    // floor
    g.fillStyle = '#e8dcc0'; g.fillRect(-20, GY, LW + 40, LH - GY + 30);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-20, GY); g.lineTo(LW + 20, GY); g.stroke();
  }
  function knight(g, x, a, sx = 1, sy = 1, lean = 0, alpha = 1) {
    if (BASIC) {
      if (NOBODY) return;
      g.save(); g.globalAlpha *= alpha; g.translate(x, GY); g.rotate(lean); g.scale(sx * K, sy * K);
      g.fillStyle = '#5562eb'; g.strokeStyle = C.navy; g.lineWidth = 1.8; g.beginPath(); g.rect(-13, -26, 26, 26); g.fill(); g.stroke();
      g.restore(); return;
    }
    if (!NOBODY) {
    g.save(); g.globalAlpha *= alpha; g.translate(x, GY); g.rotate(lean); g.scale(sx * K, sy * K);
    g.fillStyle = 'rgba(40,30,20,.2)'; g.beginPath(); g.ellipse(0, 1, 14, 3.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#5562eb'; g.strokeStyle = C.navy; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-12, -26, 24, 26, 6); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(0, -21, 10, 4, 2); g.fill();
    g.restore();
    }
    // the sword stays rigid, pivoting at the knight's front
    g.save(); g.globalAlpha *= alpha; g.translate(x + 10 * K * sx, GY - 13 * K * sy); g.rotate(a); g.scale(K, K);
    g.fillStyle = '#9a5a06'; g.fillRect(-3, -2.5, 6, 5);
    g.fillStyle = '#eef1fb'; g.strokeStyle = C.navy; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(3, -2.6); g.lineTo(23, 0); g.lineTo(3, 2.6); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  const tipOf = (x, a) => BASIC ? [x - 6 * K, GY - 13 * K] : [x + K * (10 + Math.cos(a) * 23), GY - K * (13 - Math.sin(a) * 23)];
  function dummy(g, x, o) {
    g.save(); g.translate(x, GY); g.rotate(o.tilt || 0); g.scale(K * (o.sx || 1), K / (o.sx || 1));
    if (BASIC) {
      if (o.plume != null) {   // secondary motion: a stalk with a weight on the end
        g.save(); g.translate(4, -34); g.rotate(.5 + o.plume);
        g.strokeStyle = C.navy; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -10); g.stroke();
        g.fillStyle = C.navy; g.beginPath(); g.moveTo(0, -10); g.lineTo(3, -13); g.lineTo(0, -16); g.lineTo(-3, -13); g.closePath(); g.fill();
        g.restore();
      }
      g.fillStyle = o.flash ? C.red : '#fffcf4'; g.strokeStyle = C.red; g.lineWidth = 2.4;
      g.beginPath(); g.arc(0, -18, 17, 0, TAU); g.fill(); g.stroke();
      g.restore(); return;
    }
    g.fillStyle = 'rgba(40,30,20,.22)'; g.beginPath(); g.ellipse(0, 1, 17, 4, 0, 0, TAU); g.fill();
    if (o.plume != null) {   // secondary motion: a plume on a short stem
      g.save(); g.translate(0, -40); g.rotate(o.plume);
      g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -12); g.stroke();
      g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, -17, 4, 7, 0, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
    g.fillStyle = o.flash ? '#fff' : C.red; g.strokeStyle = C.redDk; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-16, -40, 32, 40, 10); g.fill(); g.stroke();
    g.strokeStyle = o.flash ? C.red : '#fff'; g.fillStyle = o.flash ? C.red : '#fff'; g.lineWidth = 2.2; g.lineCap = 'round';
    if (o.wince) { [[-6, 1], [6, -1]].forEach(([ex, s]) => { g.beginPath(); g.moveTo(ex - 3 * s, -31); g.lineTo(ex + 2 * s, -28); g.lineTo(ex - 3 * s, -25); g.stroke(); }); }
    else { g.beginPath(); g.arc(-6, -28, 3.2, 0, TAU); g.arc(6, -28, 3.2, 0, TAU); g.fill(); }
    g.restore();
  }
  function sparks(g, x, y, k) {   // k: 0 at contact, 1 when gone
    if (k < 0 || k >= 1) return;
    g.save(); g.translate(x, y);
    g.strokeStyle = `rgba(255,185,81,${1 - k})`; g.lineWidth = 2.5 * (1 - k) + .5; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + .2, r0 = 4 + 10 * k, r1 = r0 + 14 * (1 - k * .6) * (i % 2 ? .6 : 1);
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
    }
    g.fillStyle = `rgba(255,255,255,${(1 - k) * .95})`; g.beginPath(); g.arc(0, 0, 7 * (1 - k), 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,255,255,${(1 - k) * .8})`; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 6 + 22 * ease(k), 0, TAU); g.stroke();
    g.restore();
  }
  function frameCorners(g, col) {
    g.strokeStyle = col; g.lineWidth = 2; const m = 5, L = 11, top = BASIC ? 24 + m : m;   // the plain grid crops the top 24
    [[m, top, 1, 1], [LW - m, top, -1, 1], [m, LH - m, 1, -1], [LW - m, LH - m, -1, -1]].forEach(([x, y, sx, sy]) => {
      g.beginPath(); g.moveTo(x, y + L * sy); g.lineTo(x, y); g.lineTo(x + L * sx, y); g.stroke();
    });
  }
  function pad(g, x, y, rumble) {   // a small controller glyph
    const j = rumble > 0 ? (nz(rumble * 40, 1) - .5) * 3 * rumble : 0;
    g.save(); g.translate(x + j, y);
    g.fillStyle = '#3d4270'; g.beginPath();
    g.moveTo(-14, -6); g.lineTo(14, -6); g.quadraticCurveTo(20, -6, 21, 2); g.quadraticCurveTo(22, 11, 15, 9); g.lineTo(9, 4); g.lineTo(-9, 4);
    g.lineTo(-15, 9); g.quadraticCurveTo(-22, 11, -21, 2); g.quadraticCurveTo(-20, -6, -14, -6); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-12, -2, 6, 2); g.fillRect(-10, -4, 2, 6);
    g.fillStyle = C.gold; g.beginPath(); g.arc(10, -2, 1.7, 0, TAU); g.arc(14, 1, 1.7, 0, TAU); g.fill();
    g.restore();
    if (rumble > 0) {
      g.strokeStyle = `rgba(229,50,45,${rumble})`; g.lineWidth = 1.8; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const r = 26 + i * 5 + (1 - rumble) * 4;
        g.beginPath(); g.arc(x, y, r, -.45, .45); g.stroke(); g.beginPath(); g.arc(x, y, r, Math.PI - .45, Math.PI + .45); g.stroke();
      }
    }
  }
  // the sound track: a whoosh on the swing, a thump on contact, with a playhead
  const wave = (s, on) => {
    const sw = A1 + (HIT - A1) * .4, whoosh = Math.exp(-Math.pow((s - sw) / .07, 2)) * .35;
    const d = s - HIT, thump = d >= 0 ? Math.exp(-d * 9) : 0;
    return whoosh + thump;
  };
  function track(g, s, on, t) {
    const y = LH - 9, x0 = 14, x1 = LW - 14;
    g.fillStyle = 'rgba(255,252,244,.9)'; g.fillRect(x0 - 4, y - 11, x1 - x0 + 8, 20);
    g.strokeStyle = GROUPS.sense.ink; g.lineWidth = 1.2; g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const tt = i / 120 * P, ss = sim(tt, on), a = wave(ss, on) * 9, x = lerp(x0, x1, i / 120);
      const w = Math.sin(i * 2.7) * a; i ? g.lineTo(x, y + w) : g.moveTo(x, y + w);
    }
    g.stroke();
    const px = lerp(x0, x1, t / P); g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, y - 10); g.lineTo(px, y + 9); g.stroke();
  }

  // draws the strike into the local 200 x 130 frame at loop time t with the techniques in `on`
  function strike(g, t, on, ghost) {
    const s = sim(t, on), frozen = on.stop && t >= HIT && t < HIT + STOP, d = s - HIT, dr = t - HIT;
    g.save();
    g.beginPath(); g.rect(0, 0, LW, LH); g.clip();
    // camera: shake and FOV kick move everything inside the frame
    g.save();
    if (on.shake && dr > 0) { const a = 5 * Math.exp(-dr * 9); g.translate(Math.sin(dr * 95) * a, Math.cos(dr * 71) * a * .45); }
    if (on.fov && dr > 0) { const k = 1 + .2 * Math.sin(clamp(dr / .05) * Math.PI / 2) * Math.exp(-Math.max(0, dr - .05) * 5); g.translate(127, 80); g.scale(k, k); g.translate(-127, -80); }
    backdrop(g, on, dr);
    // world response: cracks stay for the rest of the swing
    if (on.world && d >= 0) {
      const k = clamp(d / .12), fade = 1 - clamp((s - R1 + .1) / .3);
      g.save(); g.globalAlpha = fade; g.strokeStyle = '#8b7d5c'; g.lineWidth = 1.4; g.lineCap = 'round';
      [[-1, 0], [1, .2], [0, .5]].forEach(([dir, j]) => { g.beginPath(); g.moveTo(DX, GY + 1); g.lineTo(DX + dir * 10 * k + 3, GY + 6 * k); g.lineTo(DX + dir * 22 * k - 2 + j * 4, GY + 10 * k); g.stroke(); });
      g.restore();
    }
    const kx = knightX(s, on), ka = swordA(s, on), v = speed(s, on);
    if (ghost) { knight(g, knightX(t, {}), swordA(t, {}), 1, 1, 0, .2); g.save(); g.globalAlpha = .2; dummy(g, DX, {}); g.restore(); }
    // dummy reaction
    const o = {};
    if (on.react && d >= 0) {
      const back = d < .55 ? 1 : 1 - clamp((d - .55) / .6);
      o.knock = 15 * (1 - Math.exp(-d * 14)) * back;
      o.tilt = .42 * Math.exp(-d * 4.5) * Math.cos(d * 9);
      o.wince = d < .45;
    }
    if (on.squash && d >= 0) o.sx = 1 + .3 * Math.exp(-d * 7) * Math.cos(d * 24);
    if (on.flash && (frozen || (d >= 0 && d < .08))) o.flash = 1;
    if (on.second) o.plume = d >= 0 ? -1.1 * Math.exp(-d * 3.5) * Math.sin(d * 14 + .1) - (o.tilt || 0) * .5 : 0;
    const dx = DX + (o.knock || 0) + (frozen ? Math.sin(t * 160) * 1.6 : 0);
    dummy(g, dx, o);
    // knight body deformation
    let sx = 1, sy = 1, lean = 0;
    if (on.squash) {
      if (d < 0) { const st = 1 + clamp(v / 520) * .5; sx = st; sy = 1 / st; }
      else if (d < .18) { sx = 1 - .32 * (1 - d / .18); sy = 1 / sx; }
    }
    if (on.antic && s >= A0 && s < A1 + .05) lean = -.18 * Math.sin(clamp((s - A0) / (A1 - A0 + .05)) * Math.PI);
    if (on.follow && d >= 0) lean = .22 * Math.exp(-d * 6) * Math.sin(Math.min(d * 13, Math.PI));
    // motion blur: fading copies behind the knight, more when faster
    if (on.blur && v > 40 && !frozen) {
      const n = Math.round(clamp(v / 500) * 6);
      for (let i = n; i >= 1; i--) { const ps = s - i * .014; knight(g, knightX(ps, on), swordA(ps, on), sx, sy, lean, .12 + .05 * (n - i) / n); }
    }
    // motion smear: on the fastest frames the body is replaced by one solid trapezoid, full height at the leading edge
    // and tapering back to a sliver where the body was a few frames ago (the reference's "trapezoid echo")
    const smearing = on.smear && !frozen && s > A1 + .05 && s < HIT;
    if (smearing) {
      const hw = (BASIC ? 13 : 12) * K, tail = knightX(Math.max(A1, s - .1), on) - hw, front = kx + hw;
      g.save(); g.fillStyle = '#5562eb'; g.strokeStyle = C.navy; g.lineWidth = 1.8 * K; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(front, GY - 26 * K); g.lineTo(front, GY); g.lineTo(tail, GY - 11 * K); g.lineTo(tail, GY - 15 * K); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    // weapon trail: a ribbon behind the sword tip
    if (on.trail && s > A1 && s < HIT + .35) {
      const pts = []; for (let i = 0; i <= 12; i++) { const ps = s - i * .012; if (ps < A1) break; pts.push(tipOf(knightX(ps, on), swordA(ps, on))); }
      const fade = 1 - clamp((s - HIT - .12) / .2);
      for (let i = 1; i < pts.length; i++) {
        g.strokeStyle = `rgba(255,185,81,${(1 - i / pts.length) * .95 * fade})`; g.lineWidth = 7 * (1 - i / pts.length) + 1; g.lineCap = 'round';
        g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke();
      }
    }
    NOBODY = smearing; knight(g, kx, ka, sx, sy, lean); NOBODY = false;   // a smear frame keeps only the blade
    // impact sparks at the blade's point of contact
    if (on.vfx && d >= 0) sparks(g, BASIC ? DX - 18 * K : DX - 16 * K, BASIC ? GY - 18 * K : GY - K * (13 - Math.sin(.3) * 23) - 2, frozen ? 0 : clamp(d / .26));
    // world response: dust and pebbles
    if (on.world && d >= 0 && d < .7) {
      const k = d / .7;
      [-1, 1].forEach(dir => { for (let i = 0; i < 3; i++) {
        const r = 4 + 9 * ease(k) + i * 2, a = (1 - k) * .55;
        g.fillStyle = `rgba(190,170,130,${a})`; g.beginPath(); g.arc(DX + dir * (16 * K + 16 * ease(k) + i * 6), GY - 3 - i * 3 - 5 * k, r, 0, TAU); g.fill();
      } });
      g.fillStyle = '#8b7d5c';
      for (let i = 0; i < 5; i++) { const vx = (nz(i, 3) - .3) * 90, vy = -70 - nz(i, 7) * 60, tt = d; const y = GY - 2 + vy * tt + 260 * tt * tt; if (y < GY) g.fillRect(DX + vx * tt - 1.5, y - 1.5, 3, 3); }
    }
    g.restore();   // end of camera space
    if (on.shake || on.fov || on.focus) frameCorners(g, GROUPS.cam.ink);
    if (on.haptic) { const r = dr > 0 && dr < .32 ? 1 - dr / .32 : 0; pad(g, 100, 52, r); }
    if (on.sound) track(g, s, on, t);
    g.restore();
  }

  /* ---------- sound and rumble for live play ---------- */
  let AC = null;
  const audio = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; };
  document.addEventListener('pointerdown', audio, { once: true });
  document.addEventListener('keydown', audio, { once: true });
  function noise(ac, dur) { const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; }
  function playWhoosh() {
    const ac = AC; if (!ac || ac.state !== 'running') return; const t = ac.currentTime;
    const n = noise(ac, .25), f = ac.createBiquadFilter(), gn = ac.createGain();
    f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2400, t + .2);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.18, t + .12); gn.gain.linearRampToValueAtTime(0, t + .24);
    n.connect(f).connect(gn).connect(ac.destination); n.start(t);
  }
  function playThump() {
    const ac = AC; if (!ac || ac.state !== 'running') return; const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + .22);
    g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.001, t + .3);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .32);
    const n = noise(ac, .1), f = ac.createBiquadFilter(), gn = ac.createGain();
    f.type = 'highpass'; f.frequency.value = 1800; gn.gain.setValueAtTime(.25, t); gn.gain.exponentialRampToValueAtTime(.001, t + .09);
    n.connect(f).connect(gn).connect(ac.destination); n.start(t);
  }
  function rumble() {
    try { const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      pads.forEach(p => p.vibrationActuator?.playEffect?.('dual-rumble', { duration: 140, strongMagnitude: 1, weakMagnitude: .6 })); } catch (e) { /* no controller */ }
  }

  const scenes = {};

  /* ---------- slides 1 and 2: the grid, plain and layered ---------- */
  const COLS = 6, ROWS = 3, GAP = 10, TW = (W - GAP * (COLS - 1)) / COLS, TH = (H - GAP * (ROWS - 1)) / ROWS;
  const HEAD = 28, SC = Math.min(TW / LW, (TH - HEAD - 6) / LH);
  // the same grid twice: `basic` is the plain square-and-circle version, the other the knight with its six layers
  // the plain slide names the shapes instead of the knight and dummy
  const plain = str => str.replace(/the knight’s body is/gi, 'the square is').replace(/the sword tip/gi, 'the square').replace(/the plume on the dummy|A plume on the dummy/g, 'A stalk on the circle')
    .replace(/the knight/g, 'the square').replace(/The knight/g, 'The square').replace(/the dummy/g, 'the circle').replace(/The dummy/g, 'The circle').replace(/, winces,/, '');
  const makeGrid = (name, basic) => canvasDemo(name, (s, cv, g) => {
    const st = { tour: true, t: 0, frozen: false, now: 0, ghost: false, pick: 2, group: null, key: '' };
    const tourBtn = $(s, '.sh-tour'), ghostBtn = $(s, '.sh-ghost');
    if (!basic) $(s, '.sh-legend').innerHTML = GROUP_IDS.map(k => `<button data-g="${k}"><i style="background:${GROUPS[k].col}"></i>${GROUPS[k].name}<small>${TECH.filter(t => t.group === k).length}</small></button>`).join('');
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.now = st.t; };
    $$(s, '.sh-legend button').forEach(b => b.onclick = () => { free(); st.group = st.group === b.dataset.g ? null : b.dataset.g; });
    ghostBtn.onclick = () => { st.ghost = !st.ghost; ghostBtn.classList.toggle('on', st.ghost); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const tileAt = (x, y) => { const c = Math.floor(x / (TW + GAP)), r = Math.floor(y / (TH + GAP)); return c >= 0 && c < COLS && r >= 0 && r < ROWS ? r * COLS + c : -1; };
    cv.addEventListener('pointerdown', e => {
      const b = cv.getBoundingClientRect(), i = tileAt((e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height);
      if (i >= 0) { free(); st.pick = i; st.group = null; }
    });
    cv.style.cursor = 'pointer';
    // the walk-through: one swing per layer, then one swing with nothing highlighted
    const DUR = basic ? P : P * (GROUP_IDS.length + 1);   // the plain grid just loops one swing
    function render() {
      const t = st.tour ? st.t : st.now;
      let group = st.group, pick = st.pick;
      if (st.tour && !basic) { const n = Math.floor(t / P); group = GROUP_IDS[n] || null; pick = group ? TECH.findIndex(x => x.group === group) : 2; }
      const lt = t % P;
      g.clearRect(0, 0, W, H);
      TECH.forEach((tc, i) => {
        const c = i % COLS, r = Math.floor(i / COLS), x = c * (TW + GAP), y = r * (TH + GAP), gr = GROUPS[tc.group];
        const dim = group && tc.group !== group;
        g.save(); g.globalAlpha = dim ? .5 : 1;
        g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(x, y, TW, TH, 12); g.fill();
        if (!basic) { g.fillStyle = gr.col; g.beginPath(); g.roundRect(x, y, 6, TH, [12, 0, 0, 12]); g.fill(); }
        g.font = '800 15px Montserrat'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(tc.name, x + (basic ? 12 : 16), y + 19);
        g.save(); g.translate(x + (TW - LW * SC) / 2 + 3, y + HEAD + 4); g.scale(SC, SC);
        if (basic) { g.beginPath(); g.rect(0, 0, LW, LH - 24); g.clip(); g.translate(0, -24); }   // no floor, so lift the pair to the middle
        BASIC = basic; strike(g, lt, { [tc.id]: 1 }, st.ghost); BASIC = false;
        g.restore();
        const sel = !st.tour && !group && i === pick;
        if (sel || (group && !dim)) { g.strokeStyle = sel ? C.navy : gr.col; g.lineWidth = 3; g.beginPath(); g.roundRect(x + 1.5, y + 1.5, TW - 3, TH - 3, 11); g.stroke(); }
        g.restore();
      });
      const key = [group, pick, st.tour].join();
      if (key !== st.key) {
        st.key = key;
        $$(s, '.sh-legend button').forEach(b => b.classList.toggle('on', b.dataset.g === group));
        const box = $(s, '.sh-pick');
        if (group) {
          const gr = GROUPS[group], list = TECH.filter(x => x.group === group).map(x => x.name);
          box.style.borderLeftColor = gr.col;
          say(box, `<b style="color:${gr.ink}">${gr.name}</b><p>This layer ${gr.say}: ${list.join(', ')}.</p><p>Click a tile in it to see what one technique does.</p>`);
        } else {
          const tc = TECH[pick], gr = GROUPS[tc.group];
          box.style.borderLeftColor = basic ? C.navy : gr.col;
          say(box, `<b>${tc.name}</b><p>${basic ? plain(tc.what) : tc.what}</p><p>${basic ? plain(tc.tip) : tc.tip}</p>`);
        }
      }
    }
    scenes[name] = { seek(t) { st.frozen = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (st.tour) { if (!st.frozen) st.t += dt; if (st.t > DUR) st.t = 0; } else st.now += dt; render(); };
  });
  makeGrid('basic', true);
  makeGrid('grid', false);

  /* ---------- slide 3: stack them ---------- */
  canvasDemo('stack', (s, cv, g) => {
    const st = { tour: true, t: 0, frozen: false, now: 0, on: {}, key: '', lastS: 0 };
    const tourBtn = $(s, '.st-tour'), box = $(s, '.sh-chips');
    box.innerHTML = TECH.map(t => `<label style="border-left-color:${GROUPS[t.group].col}"><input type="checkbox" data-id="${t.id}">${t.name}</label>`).join('');
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.now = 0; };
    $$(box, 'input').forEach(i => i.onchange = () => { free(); st.on[i.dataset.id] = i.checked ? 1 : 0; });
    $(s, '.st-none').onclick = () => { free(); st.on = {}; };
    $(s, '.st-all').onclick = () => { free(); st.on = Object.fromEntries(TECH.map(t => [t.id, 1])); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // the walk-through: the plain hit, then one more layer per swing, then everything twice
    const STEPS = [[], ...GROUP_IDS.map((_, n) => GROUP_IDS.slice(0, n + 1))], DUR = P * (STEPS.length + 1);
    const tourOn = t => { const n = Math.min(STEPS.length - 1, Math.floor(t / P)); return Object.fromEntries(TECH.filter(x => STEPS[n].includes(x.group)).map(x => [x.id, 1])); };
    const TOP = 24, SCL = H / (LH - TOP), BW = LW * SCL, BH = H, BX = (W - BW) / 2, BYY = 0;   // crops a strip of empty sky
    function render(live) {
      const t = st.tour ? st.t : st.now, on = st.tour ? tourOn(t) : st.on, lt = t % P;
      g.clearRect(0, 0, W, H);
      g.save(); g.beginPath(); g.roundRect(BX, BYY, BW, BH, 16); g.clip();
      g.fillStyle = 'rgba(255,252,244,.92)'; g.fillRect(BX, BYY, BW, BH);
      g.translate(BX, BYY); g.scale(SCL, SCL); g.translate(0, -TOP);
      strike(g, lt, on, false);
      g.restore();
      // the layer strip above the scene
      const n = TECH.filter(x => on[x.id]).length;
      g.font = '800 16px Montserrat'; g.textBaseline = 'middle'; g.textAlign = 'left';
      let x = BX + 14;
      GROUP_IDS.forEach(k => {
        const m = TECH.filter(x => x.group === k), c = m.filter(x => on[x.id]).length, gr = GROUPS[k];
        const lab = `${gr.name} ${c}/${m.length}`; g.font = '700 14px Jost'; const w = g.measureText(lab).width + 20;
        g.fillStyle = c ? gr.col : 'rgba(255,252,244,.92)'; g.strokeStyle = gr.col; g.lineWidth = 2;
        g.beginPath(); g.roundRect(x, BYY + 12, w, 26, 13); g.fill(); g.stroke();
        g.fillStyle = c ? (k === 'fx' ? C.navy : '#fff') : gr.ink; g.fillText(lab, x + 10, BYY + 26);
        x += w + 8;
      });
      if (live) {   // sound and rumble cross the frame they belong to, only in live play
        const sNow = sim(lt, on), sw = A1 + (HIT - A1) * .4;
        if (sNow < st.lastS) st.lastS = 0;   // the loop wrapped
        if (on.sound) { if (st.lastS < sw && sNow >= sw) playWhoosh(); if (st.lastS < HIT && sNow >= HIT) playThump(); }
        if (on.haptic && st.lastS < HIT && sNow >= HIT) rumble();
        st.lastS = sNow;
      }
      const key = TECH.map(x => on[x.id] ? 1 : 0).join('') + st.tour;
      if (key !== st.key) {
        st.key = key;
        $$(box, 'input').forEach(i => i.checked = !!on[i.dataset.id]);
        say($(s, '.st-count'), `${n} of 18 on`);
        const last = st.tour ? STEPS[Math.min(STEPS.length - 1, Math.floor(t / P))] : null;
        say($(s, '.st-out'), n === 0 ? 'The plain hit: a box slides into a box. Everything the eye learns, it learns from the positions alone.'
          : st.tour && last ? `Adding <b>${GROUPS[last[last.length - 1]].name.toLowerCase()}</b>: it ${GROUPS[last[last.length - 1]].say}.${n === 18 ? ' All eighteen together: the same positions, a very different hit.' : ''}`
          : n === 18 ? 'All eighteen at once. Untick one at a time to find out what each was carrying.'
          : 'Tick and untick to compare. Every technique runs on the same swing, so the differences are only the ones you choose.');
      }
    }
    scenes.stack = { seek(t) { st.frozen = st.tour = true; st.t = t; render(false); }, dur: () => DUR };
    return dt => {
      if (st.tour) { if (!st.frozen) st.t += dt; if (st.t > DUR) st.t = 0; } else st.now += dt;
      render(true);
    };
  });

  window.__seek = (t, which = 'grid') => scenes[which].seek(t);
  window.__dur = (which = 'grid') => scenes[which].dur();
})();
