/* Three ways to teach (MGM C4 M7, deck slides 133-137), one tutorialization method per ability from the notes.
   135 Hard check: "a gate the players cannot pass until they use siphoning strike on it to drain it of electricity".
   136 Soft check: "the smoke skill causing archers to miss the players as they dash down a hallway".
   137 Sandbox: "have the environment respond to restoring rain by making some flowers bloom and produce edible fruits".
   Side views in the Super Mario Bros. look the course already uses; Mario and Hammer Bros. stand in for the player and the
   archers. Each panel loops. */
(function () {
  const { pic, icon, text, wrap, card, chip, TONE, scene, clamp, ease, lerp } = CK;
  const C = TD.C, R = window.REFINE, TAU = Math.PI * 2;
  const PX = [180, 520, 860], LOOP = 6, GY = 92, VW = 288, VH = 290;
  const WAYS = [
    ['Hard check', TONE.red, 'Required: the gate won’t open until you drain it, so you learn that Strike counters electricity.'],
    ['Soft check', TONE.gold, 'Optional: dash the hallway inside your smoke and the archers miss. Players notice when to hide.'],
    ['Sandbox', TONE.green, 'Nothing to pass: the field simply responds to the rain, and players discover what else it does.'],
  ];

  function world(g) {
    g.fillStyle = '#5c94fc'; g.fillRect(-VW / 2, -VH / 2, VW, VH);
    for (let x = -VW / 2; x < VW / 2; x += 24) for (let r = 0; r < 3; r++) {
      const y = GY + r * 24; g.fillStyle = '#c84c0c'; g.fillRect(x, y, 24, 24);
      g.fillStyle = '#fcbcb0'; g.fillRect(x, y, 24, 2); g.fillRect(x, y, 2, 24); g.fillStyle = '#000'; g.fillRect(x + 22, y, 2, 24); g.fillRect(x, y + 22, 24, 2);
    }
  }
  const walkFrame = t => `smb-mario-walk${1 + Math.floor(t * 10) % 3}.png`;
  function mario(g, x, moving, t, o = {}) { pic(g, moving ? walkFrame(t) : 'smb-mario.png', x, GY, moving ? 40 : 30, { px: true, bottom: true, ...o }); }

  function hard(g, a) {
    const open = ease(clamp((a - 2.6) / .7)), mx = a < 1.2 ? lerp(-110, -30, a / 1.2) : a < 3.4 ? -30 : lerp(-30, 150, clamp((a - 3.4) / 2));
    // the gate: bars that slide up once drained
    const gx = 50, lift = open * 110, charged = a < 2.3;
    g.fillStyle = '#3d4270'; g.fillRect(gx - 34, -70, 68, 14);
    for (let i = 0; i < 4; i++) { g.fillStyle = charged ? '#ffd23c' : '#8b8fa8'; g.fillRect(gx - 28 + i * 18, -56 - lift, 8, 148); }
    g.fillStyle = '#5c94fc'; g.fillRect(gx - 40, -VH / 2, 80, 75 - 0);
    g.fillStyle = '#3d4270'; g.fillRect(gx - 34, -84, 68, 14);
    if (charged) for (let j = 0; j < 5; j++) { const y = -40 + ((a * 120 + j * 31) % 130), x = gx - 30 + ((j * 37) % 60); g.strokeStyle = '#fff6a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 8); g.lineTo(x - 2, y + 12); g.stroke(); }
    // the whip, and the charge flowing back to the player
    if (a > 1.5 && a < 2.6) {
      const out = ease(clamp((a - 1.5) / .25)); g.strokeStyle = '#4b2286'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(mx + 12, GY - 26); g.lineTo(lerp(mx + 12, gx - 20, out), GY - 30); g.stroke();
      for (let j = 0; j < 4; j++) { const k = clamp((a - 1.8 - j * .1) / .5); if (k > 0 && k < 1) { g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(lerp(gx - 20, mx + 12, k), GY - 30, 6, 0, TAU); g.fill(); } }
    }
    mario(g, mx, a < 1.2 || a > 3.4, a);
    if (a > 2.4 && a < 3.4) text(g, 'drained!', gx, -100, { size: 15, w: 800, col: '#fff', stroke: 4, strokeCol: '#4b2286' });
    if (a < 1.4) text(g, 'locked', gx, -100, { size: 15, w: 800, col: '#fff', stroke: 4, strokeCol: C.redDk });
  }

  function soft(g, a) {
    // a hallway ceiling, archers on the right, the player dashes through in smoke
    g.fillStyle = '#3d4270'; g.fillRect(-VW / 2, -VH / 2, VW, 40);
    const smoke = a > .6 && a < 4.6, mx = a < .8 ? -110 : lerp(-110, 160, clamp((a - .8) / 3.4));
    pic(g, 'smb-hammer-bro.png', 104, GY - 70, 30, { px: true, bottom: true, flip: false });
    pic(g, 'smb-hammer-bro.png', 120, GY, 30, { px: true, bottom: true });
    g.fillStyle = '#c84c0c'; g.fillRect(84, GY - 70, 44, 12);
    // arrows aimed where the player was, all wide of the cloud
    for (let j = 0; j < 4; j++) {
      const t0 = 1 + j * .8, k = clamp((a - t0) / .7); if (k <= 0 || k >= 1) continue;
      const sx = j % 2 ? 104 : 120, sy = j % 2 ? GY - 100 : GY - 30, tx = -130, ty = j % 2 ? GY - 120 : -40;
      const x = lerp(sx, tx, k), y = lerp(sy, ty, k), ang = Math.atan2(ty - sy, tx - sx);
      g.strokeStyle = '#3d2a10'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(ang) * 18, y - Math.sin(ang) * 18); g.stroke();
      g.fillStyle = '#ddd'; g.beginPath(); g.moveTo(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6); g.lineTo(x - Math.sin(ang) * 4, y + Math.cos(ang) * 4); g.lineTo(x + Math.sin(ang) * 4, y - Math.cos(ang) * 4); g.fill();
      if (k > .5) text(g, 'miss', x, y - 16, { size: 12, w: 800, col: '#fff', stroke: 3, strokeCol: C.navy, a: 1 - k });
    }
    mario(g, mx, a > .8 && a < 4.2, a, { a: smoke ? .55 : 1 });
    if (smoke) { const k = Math.min(1, (a - .6) / .3, (4.6 - a) / .3); g.fillStyle = `rgba(90,90,104,${.55 * k})`; for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + a * 2; g.beginPath(); g.arc(mx + Math.cos(an) * 18, GY - 22 + Math.sin(an) * 14, 20, 0, TAU); g.fill(); } }
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
    mario(g, -126, false, a);
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
        world(g); [hard, soft, sandbox][i](g, a);
        g.restore();
        g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(x - VW / 2, 120, VW, VH, 8); g.stroke();
        wrap(g, cap, x, 438, 280, { size: 13.5, lh: 17, align: 'center', col: C.ink });
      });
      text(g, 'From must-do to discover-it-yourself', 520, 556, { size: 14, col: C.muted, it: true });
    },
    side(t) { const i = Math.floor(t / 4) % 3; return { out: `<b>${WAYS[i][0]}</b> for ${R.AB[i].name}. ${WAYS[i][2]}` }; },
  });
})();
