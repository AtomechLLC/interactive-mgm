/* Three ways to teach (MGM C4 M7, deck slides 133-137), one tutorialization method per ability from the notes.
   135 Hard check: "a gate the players cannot pass until they use siphoning strike on it to drain it of electricity".
   136 Soft check: "the smoke skill causing archers to miss the players as they dash down a hallway".
   137 Sandbox: "have the environment respond to restoring rain by making some flowers bloom and produce edible fruits".
   Side views in an original pixel-art dungeon: a hooded rogue stands in for the player and skeleton archers fire real
   arrows, so the fiction matches the notes. Each panel loops. */
(function () {
  const { icon, text, wrap, card, chip, TONE, scene, clamp, ease, lerp } = CK;
  const C = TD.C, R = window.REFINE, TAU = Math.PI * 2;
  const PX = [180, 520, 860], LOOP = 6, GY = 92, VW = 288, VH = 290, P = 3;
  const WAYS = [
    ['Hard check', TONE.red, 'Required: the gate won’t open until you drain it, so you learn that Strike counters electricity.'],
    ['Soft check', TONE.gold, 'Optional: dash the hallway inside your smoke and the archers miss. Players notice when to hide.'],
    ['Sandbox', TONE.green, 'Nothing to pass: the field simply responds to the rain, and players discover what else it does.'],
  ];

  // pixel sprites: one string per row, one char per pixel, '.' is empty; drawn at P canvas px per pixel, feet on y
  const PAL = {
    H: '#2f6b45', h: '#1c4129', S: '#f2c79a', E: '#1a1a1a', B: '#5a3f86', b: '#9a6a2c', L: '#3a2a1e', K: '#2a1c12', D: '#d4dbe3',
    W: '#ece6d4', w: '#a9a290', X: '#1a1a1a', R: '#8a5524', s: '#f4f4f4',
  };
  const HERO_TOP = [
    '....HHHH....',
    '...HHHHHH...',
    '..HHhSSSH...',
    '..HhSSESS...',
    '..HhSSSSH...',
    '...HHHHH....',
    '..BBBBBBB.D.',
    '.BBBBBBBBSD.',
    '.SBBBBBBB...',
    '..bbbbbbb...',
    '..BBBBBBB...',
  ];
  const HERO_LEGS = [
    ['..LL...LL...', '..LL...LL...', '.KKK...KKK..'],
    ['...LL.LL....', '...LL.LL....', '..KKK.KKK...'],
    ['.LL.....LL..', 'LL.......LL.', 'KK.......KK.'],
  ];
  const ARCHER = [
    '.....WWWW...',
    '....WWWWWW..',
    '....WXWWXW..',
    '....WWWWWW..',
    '.....WwWw...',
    '..R...WW....',
    '.R.sWWWWWW..',
    'R..WWwWwWW..',
    'R..s.WWWW...',
    'R..s.WwWw...',
    '.R.s..WW....',
    '..R..W..W...',
    '.....W..W...',
    '....WW..WW..',
  ];
  function sprite(g, rows, x, y, o = {}) {
    const w = rows[0].length, h = rows.length, f = o.flip ? -1 : 1;
    g.save(); g.globalAlpha *= o.a ?? 1;
    rows.forEach((r, j) => { for (let i = 0; i < w; i++) { const c = PAL[r[i]]; if (!c) continue; g.fillStyle = c; g.fillRect(x + f * (i - w / 2) * P - (f < 0 ? P : 0), y - (h - j) * P, P, P); } });
    g.restore();
  }
  function hero(g, x, moving, t, o = {}) { sprite(g, HERO_TOP.concat(HERO_LEGS[moving ? 1 + Math.floor(t * 10) % 2 : 0]), x, GY, o); }
  function archer(g, x, y, drawn) {
    sprite(g, ARCHER, x, y);
    if (drawn) { g.fillStyle = PAL.s; g.fillRect(x - 6 * P, y - 9 * P, 3 * P, 1); }
  }

  // stone hall (gate, hallway) or open courtyard (sandbox)
  function world(g, kind) {
    const L = -VW / 2, T = -VH / 2;
    if (kind === 'yard') {
      g.fillStyle = '#7cb4ec'; g.fillRect(L, T, VW, VH);
      g.fillStyle = '#8a8798'; g.fillRect(L, GY - 60, VW, 60);
      g.fillStyle = '#6e6b7c'; for (let x = L; x < -L; x += 24) { g.fillRect(x, GY - 72, 14, 12); for (let y = GY - 60; y < GY; y += 12) g.fillRect(x + ((y / 12) % 2 ? 12 : 0), y, 2, 12); g.fillRect(x, GY - 49, 24, 1); g.fillRect(x, GY - 25, 24, 1); }
      g.fillStyle = '#4caa3c'; g.fillRect(L, GY, VW, 8); g.fillStyle = '#7a4a1e'; g.fillRect(L, GY + 8, VW, VH);
      g.fillStyle = '#5c3814'; for (let x = L; x < -L; x += 16) g.fillRect(x + 4, GY + 20 + (x % 3) * 8, 4, 4);
      return;
    }
    g.fillStyle = '#3a3848'; g.fillRect(L, T, VW, VH);
    g.fillStyle = '#2b2a37'; for (let y = T; y < GY; y += 16) { g.fillRect(L, y, VW, 2); for (let x = L + ((y - T) / 16 % 2 ? 12 : 0); x < -L; x += 24) g.fillRect(x, y, 2, 16); }
    g.fillStyle = '#6d6a7a'; g.fillRect(L, GY, VW, VH);
    g.fillStyle = '#8f8c9c'; g.fillRect(L, GY, VW, 3);
    g.fillStyle = '#55525f'; for (let r = 0; r < 3; r++) for (let x = L + (r % 2) * 18; x < -L; x += 36) { g.fillRect(x, GY + 3 + r * 22, 2, 22); g.fillRect(L, GY + 24 + r * 22, VW, 2); }
  }
  function torch(g, x, y, t) {
    g.fillStyle = '#5a3a1a'; g.fillRect(x - 3, y, 6, 14); g.fillStyle = '#3a3a3a'; g.fillRect(x - 5, y - 2, 10, 4);
    const f = 1 + .15 * Math.sin(t * 17 + x);
    g.fillStyle = 'rgba(255,190,80,.18)'; g.beginPath(); g.arc(x, y - 8, 22 * f, 0, TAU); g.fill();
    g.fillStyle = '#ff9a1c'; g.beginPath(); g.ellipse(x, y - 8, 5 * f, 9 * f, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffe36a'; g.beginPath(); g.ellipse(x, y - 6, 2.5, 5 * f, 0, 0, TAU); g.fill();
  }

  function hard(g, a) {
    const open = ease(clamp((a - 2.6) / .7)), mx = a < 1.2 ? lerp(-110, -30, a / 1.2) : a < 3.4 ? -30 : lerp(-30, 150, clamp((a - 3.4) / 2));
    torch(g, -90, -40, a); torch(g, 120, -40, a);
    // the gate: a stone arch whose bars slide up into the lintel once drained
    const gx = 50, lift = open * 110, charged = a < 2.3;
    g.fillStyle = '#1c1b24'; g.fillRect(gx - 34, -70, 68, GY + 70);
    g.save(); g.beginPath(); g.rect(gx - 34, -70, 68, GY + 70); g.clip();
    for (let i = 0; i < 4; i++) { g.fillStyle = charged ? '#ffd23c' : '#8b8fa8'; g.fillRect(gx - 28 + i * 18, -56 - lift, 8, 148); }
    g.fillStyle = charged ? '#ffd23c' : '#8b8fa8'; g.fillRect(gx - 34, 20 - lift, 68, 6);
    g.restore();
    g.fillStyle = '#56536a'; g.fillRect(gx - 46, -84, 12, GY + 84); g.fillRect(gx + 34, -84, 12, GY + 84); g.fillRect(gx - 46, -96, 92, 26);
    g.fillStyle = '#7b788c'; g.fillRect(gx - 46, -96, 92, 3); g.fillRect(gx - 46, -84, 3, GY + 84); g.fillRect(gx + 34, -84, 3, GY + 84);
    if (charged) for (let j = 0; j < 5; j++) { const y = -40 + ((a * 120 + j * 31) % 130), x = gx - 30 + ((j * 37) % 60); g.strokeStyle = '#fff6a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 8); g.lineTo(x - 2, y + 12); g.stroke(); }
    // the whip, and the charge flowing back to the player
    if (a > 1.5 && a < 2.6) {
      const out = ease(clamp((a - 1.5) / .25)); g.strokeStyle = '#8a4fd6'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(mx + 12, GY - 26); g.lineTo(lerp(mx + 12, gx - 20, out), GY - 30); g.stroke();
      for (let j = 0; j < 4; j++) { const k = clamp((a - 1.8 - j * .1) / .5); if (k > 0 && k < 1) { g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(lerp(gx - 20, mx + 12, k), GY - 30, 6, 0, TAU); g.fill(); } }
    }
    hero(g, mx, a < 1.2 || a > 3.4, a);
    if (a > 2.4 && a < 3.4) text(g, 'drained!', gx, -112, { size: 15, w: 800, col: '#fff', stroke: 4, strokeCol: '#4b2286' });
    if (a < 1.4) text(g, 'locked', gx, -112, { size: 15, w: 800, col: '#fff', stroke: 4, strokeCol: C.redDk });
  }

  // the hallway: skeleton archers on a balcony loose arrows at the dashing rogue; inside the smoke every arrow lands behind
  const SHOTS = [1.1, 1.7, 2.3, 2.9, 3.5];
  const heroX = a => a < .8 ? -110 : lerp(-110, 170, clamp((a - .8) / 3.4));
  function soft(g, a) {
    torch(g, -100, -50, a); torch(g, -10, -50, a);
    const smoke = a > .6 && a < 4.6, mx = heroX(a);
    // balcony
    g.fillStyle = '#56536a'; g.fillRect(56, GY - 96, 88, 14); g.fillStyle = '#7b788c'; g.fillRect(56, GY - 96, 88, 3);
    g.fillStyle = '#46435a'; for (let x = 60; x < 144; x += 14) g.fillRect(x, GY - 82, 4, 82);
    const AR = [[84, GY - 96], [122, GY - 96]];
    SHOTS.forEach((t0, j) => {
      const [sx0, sy0] = AR[j % 2], sx = sx0 - 18, sy = sy0 - 27, k = clamp((a - t0) / .45);
      if (a < t0) return;
      // aimed at the rogue as they were seen, but the smoke hides where they are now: every arrow lands short and behind
      const tx = heroX(t0) - 34 - (j % 3) * 10, ty = GY - 2, x = lerp(sx, tx, k), y = lerp(sy, ty, k), ang = Math.atan2(ty - sy, tx - sx);
      g.strokeStyle = '#6a4418'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(ang) * 18, y - Math.sin(ang) * 18); g.stroke();
      g.fillStyle = '#c9ced6'; g.beginPath(); g.moveTo(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6); g.lineTo(x - Math.sin(ang) * 4, y + Math.cos(ang) * 4); g.lineTo(x + Math.sin(ang) * 4, y - Math.cos(ang) * 4); g.fill();
      g.fillStyle = '#e8e8e8'; g.fillRect(x - Math.cos(ang) * 18 - 2, y - Math.sin(ang) * 18 - 2, 4, 4);
      if (k >= 1 && a - t0 < 1.3) text(g, 'miss', tx, ty - 22 - (j % 2) * 12, { size: 12, w: 800, col: '#fff', stroke: 3, strokeCol: C.navy, a: 1 - (a - t0 - .45) / .85 });
    });
    AR.forEach(([x, y], j) => archer(g, x, y, SHOTS.some((t0, k) => k % 2 === j && a > t0 - .3 && a < t0)));
    hero(g, mx, a > .8 && a < 4.2, a, { a: smoke ? .55 : 1 });
    if (smoke) { const k = Math.min(1, (a - .6) / .3, (4.6 - a) / .3); g.fillStyle = `rgba(150,150,165,${.6 * k})`; for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + a * 2; g.beginPath(); g.arc(mx + Math.cos(an) * 18, GY - 22 + Math.sin(an) * 14, 20, 0, TAU); g.fill(); } }
  }

  const PLOTS = [-90, -40, 10, 60, 110];
  function sandbox(g, a) {
    // tilled soil on the ground
    PLOTS.forEach(x => { g.fillStyle = '#7a4a1e'; g.fillRect(x - 18, GY - 6, 36, 8); });
    const rain = a > .6 && a < 3.4 ? Math.min(1, (a - .6) / .3, (3.4 - a) / .3) : 0;
    if (rain > 0) {
      g.fillStyle = `rgba(250,250,255,${rain})`; [[-60, -100], [-20, -110], [20, -100], [60, -108], [100, -98]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 24, 0, TAU); g.fill(); });
      g.strokeStyle = `rgba(30,80,200,${.8 * rain})`; g.lineWidth = 2; for (let i = 0; i < 24; i++) { const x = -100 + (i * 37) % 220, y = -80 + ((a * 260 + i * 23) % 160); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 10); g.stroke(); }
    }
    PLOTS.forEach((x, i) => {
      const grow = ease(clamp((a - 1.4 - i * .15) / 1)), bloom = ease(clamp((a - 2.8 - i * .1) / .5)), fruit = ease(clamp((a - 3.6 - i * .12) / .4));
      if (grow > 0) { g.fillStyle = '#00a800'; g.fillRect(x - 2, GY - 6 - 36 * grow, 4, 36 * grow); g.fillRect(x - 10, GY - 20 * grow, 8, 4); g.fillRect(x + 2, GY - 26 * grow, 8, 4); }
      if (bloom > 0) { const fy = GY - 44; g.fillStyle = i % 2 ? '#fcfcfc' : '#fc7460'; for (let p = 0; p < 4; p++) { const an = p / 4 * TAU; g.fillRect(x + Math.cos(an) * 6 * bloom - 4, fy + Math.sin(an) * 6 * bloom - 4, 8, 8); } g.fillStyle = '#fca044'; g.fillRect(x - 3, fy - 3, 6, 6); }
      if (fruit > 0) { g.fillStyle = '#d82800'; g.beginPath(); g.arc(x + 12, GY - 30, 6 * fruit, 0, TAU); g.fill(); }
    });
    hero(g, -126, false, a);
    if (a > 4.2 && a < 5.8) text(g, '+ food', 10, -60, { size: 16, w: 800, col: '#fff', stroke: 4, strokeCol: C.good });
  }

  scene('three-ways-teach', {
    dur: 12,
    draw(g, t) {
      const a = t % LOOP;
      R.AB.forEach((ab, i) => {
        const x = PX[i], [n, tone, cap] = WAYS[i];
        card(g, x, 268, 316, 500, { edge: ab.col, lw: 3 });
        chip(g, n, x, 50, { ...tone, size: 17 });
        icon(g, ab.icon, x - 112, 94, 36, { lw: 2 });
        text(g, ab.name, x - 86, 94, { align: 'left', size: 17, w: 800, display: true });
        g.save(); g.beginPath(); g.roundRect(x - VW / 2, 120, VW, VH, 8); g.clip(); g.translate(x, 120 + VH / 2);
        world(g, i === 2 ? 'yard' : 'hall'); [hard, soft, sandbox][i](g, a);
        g.restore();
        g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(x - VW / 2, 120, VW, VH, 8); g.stroke();
        wrap(g, cap, x, 438, 280, { size: 13.5, lh: 17, align: 'center', col: C.ink });
      });
      text(g, 'From must-do to discover-it-yourself', 520, 556, { size: 14, col: C.muted, it: true });
    },
    side(t) { const i = Math.floor(t / 4) % 3; return { out: `<b>${WAYS[i][0]}</b> for ${R.AB[i].name}. ${WAYS[i][2]}` }; },
  });
})();
