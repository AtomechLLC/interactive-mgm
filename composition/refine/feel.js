/* 3Cs and game feel (MGM C4 M7, deck slides 116-126).
   'three-cs': one C per ability, as the notes assign them. 117 Character: Siphoning Strike "has some forward motion as the
   character swings, then strikes forward in a line". 118 Controller: Smothering Smoke locks "the player down, preventing any
   movement until the spell channel ends or the player dodges, which causes the smoke cloud to dissipate". 119 Camera:
   Restoring Rain "might zoom the camera up super high… so they know both who they are healing and where they are headed".
   'game-feel': each ability with and without the feedback of slides 124-126: the whip wraps and surges, the smoke ripples
   where the hidden enemy moves, rain splatters glow green on wounded units it heals. */
(function () {
  const { icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C, R = window.REFINE;
  const TAU = Math.PI * 2;

  // ---------- 3Cs ----------
  const PX = [180, 520, 860], LOOP = 4;
  const CS = [['Character', 'Steps forward, then strikes in a line'], ['Controller', 'Movement locks until the channel ends or you dodge'], ['Camera', 'Zooms up high to show the whole battlefield']];

  function character(g, a) {
    const step = ease(clamp((a - .4) / .4)), px = -100 + 46 * step, out = ease(clamp((a - .9) / .25)), back = clamp((a - 2.6) / .6);
    if (step > 0) { g.globalAlpha = .3; T.player(-100, 0, 0, .9); g.globalAlpha = 1; CK.arrow(g, [-90, 34], [px + 6, 34], C.muted, 2.5, { a: 1 - back }); }
    T.foe(110, 0, 18, Math.PI, '#5562eb');
    if (out > 0 && back < 1) { g.save(); g.globalAlpha = 1 - back; g.strokeStyle = '#4b2286'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(px + 16, 0); g.lineTo(lerp(px + 16, 96, out), 0); g.stroke(); g.restore(); }
    if (a > 1.15 && a < 2) T.popText('strike', 110, -40, '#4b2286', 1 - (a - 1.15) / .85);
    T.player(px, 0, 0, .9);
  }
  function controller(g, a) {
    const ch = a > .3 && a < 2.6, dodge = clamp((a - 2.6) / .35), px = -40 + 120 * ease(dodge) * (a < 3.6 ? 1 : 1 - clamp((a - 3.6) / .3));
    // the cloud
    const cloud = a > .3 ? (a < 2.6 ? ease(clamp((a - .3) / .4)) : 0) : 0;
    if (cloud > 0) { g.fillStyle = `rgba(107,107,120,${.55 * cloud})`; for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + a; g.beginPath(); g.arc(-40 + Math.cos(an) * 28, -30 + Math.sin(an) * 18, 30, 0, TAU); g.fill(); } }
    T.use(g); T.poof(-40, -30, a - 2.6, 40);
    T.player(px, -30, 0, .9);
    // the stick: it pushes, nothing moves while the channel runs
    const sx = -50, sy = 90, push = ch ? Math.sin(a * 9) * 10 : 0;
    g.fillStyle = ch ? '#d9d4c7' : '#c9d6f5'; g.strokeStyle = ch ? '#9a927c' : C.navy; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, 34, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = ch ? '#9a927c' : C.blue; g.beginPath(); g.arc(sx + 10 + push, sy, 15, 0, TAU); g.fill();
    if (ch) { GI.draw(g, 'padlock', sx, sy - 52, 22, C.redDk); }
    text(g, ch ? 'locked' : 'free', sx, sy + 48, { size: 12, w: 800, col: ch ? C.redDk : C.good });
    const pressed = a > 2.5 && a < 2.9;
    g.fillStyle = pressed ? C.gold : '#f3eee2'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(70, sy, 24, 0, TAU); g.fill(); g.stroke();
    text(g, 'Dodge', 70, sy + 1, { size: 12, w: 800 });
  }
  const WORLD = [[-200, -140, 'a'], [-60, 170, 'a'], [210, 120, 'a'], [160, -170, 'e'], [250, -30, 'e'], [-230, 90, 'e']];
  function camera(g, a, t) {
    const z = lerp(1.6, .55, ease(clamp((a - .4) / .9))) + (a > 3.3 ? lerp(0, 1.05, ease(clamp((a - 3.3) / .6))) : 0);
    g.save(); g.scale(z, z);
    g.fillStyle = '#cfe8b8'; g.fillRect(-320, -230, 640, 460);
    g.fillStyle = 'rgba(63,143,214,.18)'; g.beginPath(); g.arc(0, 0, 180, 0, TAU); g.fill();
    for (let i = 0; i < 40; i++) { const x = ((i * 83.3 + a * 120) % 600) - 300, y = ((i * 47.9 + a * 400) % 440) - 220; g.strokeStyle = 'rgba(63,120,214,.6)'; g.lineWidth = 2 / z; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y + 12); g.stroke(); }
    T.use(g); WORLD.forEach(([x, y, k]) => k === 'a' ? T.player(x, y, 0, .9, 1, C.p2) : T.foe(x, y, 17));
    T.player(0, 0, -Math.PI / 2, .9);
    g.restore();
    text(g, z < .8 ? 'whole field in view' : 'close up', 0, 128, { size: 12, w: 800, col: C.navy, stroke: 4 });
  }

  scene('three-cs', {
    dur: 12,
    draw(g, t) {
      const a = t % LOOP;
      R.AB.forEach((ab, i) => {
        const x = PX[i];
        card(g, x, 268, 316, 500, { edge: ab.col, lw: 3 });
        chip(g, CS[i][0], x, 50, { ...TONE.teal, size: 17 });
        icon(g, ab.icon, x - 112, 96, 38, { lw: 2 });
        text(g, ab.name, x - 86, 96, { align: 'left', size: 17, w: 800, display: true });
        g.save(); g.beginPath(); g.roundRect(x - 144, 124, 288, 300, 10); g.clip();
        T.use(g); if (i !== 2) T.floor(x - 144, 124, 288, 300);
        g.translate(x, 268); [character, controller, camera][i](g, a, t);
        g.restore();
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x - 144, 124, 288, 300, 10); g.stroke();
        wrap(g, CS[i][1], x, 456, 270, { size: 15, w: 700, align: 'center', lh: 19, col: C.navy });
      });
      text(g, 'Little details that add up to how the ability feels in your hands', 520, 556, { size: 14, col: C.muted, it: true });
    },
    side(t) { const i = Math.floor(t / LOOP) % 3; return { out: `<b>${CS[i][0]}</b> on ${R.AB[i].name}: ${CS[i][1].toLowerCase()}.` }; },
  });

  // ---------- game feel ----------
  const RY = i => 120 + i * 176, COLX = [399, 821], FL = 3;
  const FEEL = ['The whip wraps the target and surges down to you if it is electrified', 'The cloud ripples where the hidden enemy moves', 'Splatters turn green and glow when they heal a wounded unit'];

  function strikeRow(g, a, felt) {
    const tx = 120, ty = Math.sin(a * 2) * 14, out = ease(clamp((a - .3) / .3));
    T.player(-150, 0, 0, .85);
    if (felt) for (let j = 0; j < 3; j++) { const an = a * 6 + j * 2.1; g.strokeStyle = '#ffd23c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(tx + Math.cos(an) * 20, ty + Math.sin(an) * 20); g.lineTo(tx + Math.cos(an + .3) * 32, ty + Math.sin(an + .3) * 32); g.stroke(); }
    T.foe(tx, ty, 17, Math.PI, '#5562eb');
    if (a > .3 && a < 2.4) {
      const fade = 1 - clamp((a - 2) / .4);
      g.save(); g.globalAlpha = fade; g.strokeStyle = '#4b2286'; g.lineWidth = felt ? 6 : 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-134, 0);
      if (felt) { for (let i = 1; i <= 14; i++) { const k = i / 14 * out; g.lineTo(lerp(-134, tx, k), lerp(0, ty, k) + Math.sin(k * 9 - a * 10) * 8 * (1 - k)); } }
      else g.lineTo(lerp(-134, tx - 18, out), lerp(0, ty, out));
      g.stroke();
      if (felt && a > .6) { const w = ease(clamp((a - .6) / .25)); g.beginPath(); g.arc(tx, ty, 24, Math.PI, Math.PI + w * TAU * .9); g.stroke(); for (let j = 0; j < 4; j++) { const k = clamp((a - .75 - j * .12) / .5); if (k > 0 && k < 1) { g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(lerp(tx, -150, k), lerp(ty, 0, k), 9, 0, TAU); g.fill(); } } }
      g.restore();
    }
    if (a > .65 && a < 1.6) T.popText('-30', tx, ty - 38 - (a - .65) * 14, C.redDk, 1 - (a - .65) / .95);
    if (felt && a > 1.3 && a < 2.2) { T.flash(-150, 0, 36, .8 * (1 - (a - 1.3) / .9)); T.popText('+ heal', -150, -40, C.good, 1 - (a - 1.3) / .9); }
  }
  function smokeRow(g, a, felt) {
    const ex = Math.cos(a * 2.1) * 40, ey = Math.sin(a * 2.1) * 18;
    g.fillStyle = 'rgba(107,107,120,.62)'; for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; g.beginPath(); g.arc(Math.cos(an) * 46, Math.sin(an) * 22, 34, 0, TAU); g.fill(); }
    g.beginPath(); g.ellipse(0, 0, 70, 36, 0, 0, TAU); g.fill();
    if (felt) for (let j = 0; j < 3; j++) { const k = ((a * 1.6 + j / 3) % 1); g.strokeStyle = `rgba(255,255,255,${.75 * (1 - k)})`; g.lineWidth = 2.5; g.beginPath(); for (let s = 0; s <= 24; s++) { const an = s / 24 * TAU, r = 10 + k * 34 + Math.sin(an * 5 + a * 8) * 3; s ? g.lineTo(ex + Math.cos(an) * r, ey + Math.sin(an) * r * .6) : g.moveTo(ex + Math.cos(an) * r, ey + Math.sin(an) * r * .6); } g.stroke(); }
    T.player(-150, 0, 0, .85);
    text(g, felt ? 'something moves in there' : 'enemy hidden somewhere', 0, 56, { size: 12, w: 700, col: C.muted, stroke: 3 });
  }
  const UNITS = [[-120, -20, .35], [-40, 30, 1], [50, -25, .4], [130, 20, 1]];
  function rainRow(g, a, felt) {
    UNITS.forEach(([x, y, h0], i) => {
      const hp = Math.min(1, h0 + clamp((a - .4) / 2) * .6);
      T.player(x, y, -Math.PI / 2, .75, 1, C.p2); T.hp(x, y - 26, 34, hp, 1);
      if (felt && h0 < 1 && a > .4 && a < 2.6) { g.fillStyle = `rgba(47,174,99,${.25 + .15 * Math.sin(a * 10)})`; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.fill(); }
    });
    for (let i = 0; i < 26; i++) {
      const x = ((i * 61.7) % 340) - 170, fall = ((a * 1.4 + i * .137) % 1), y = -60 + fall * 120;
      const near = UNITS.find(([ux, uy, h0]) => Math.abs(ux - x) < 22 && h0 < 1);
      const heal = felt && near && fall > .45;
      g.fillStyle = heal ? '#2fae63' : 'rgba(63,143,214,.85)';
      if (heal) { g.shadowColor = '#7dffb0'; g.shadowBlur = 12; }
      g.beginPath(); g.ellipse(x, y, heal ? 4.5 : 3, heal ? 4.5 : 7, 0, 0, TAU); g.fill(); g.shadowBlur = 0;
      if (heal && fall > .8) text(g, '+', x + 8, y - 8, { size: 14, w: 800, col: C.good });
    }
  }

  scene('game-feel', {
    dur: 12,
    state: () => ({ solo: -1 }),
    init(s, st, api) { pointer(api.cv, (x, y, type) => { if (type === 'down') [0, 1, 2].forEach(i => { if (inBox(x, y, 520, RY(i), 1012, 168)) { api.manual(); st.solo = st.solo === i ? -1 : i; } }); }); },
    draw(g, t, st, tour) {
      const a = t % FL, focus = tour ? Math.floor(t / 4) % 3 : st.solo;
      text(g, 'Plain', COLX[0], 22, { size: 16, w: 800, col: C.muted, display: true });
      text(g, 'Felt', COLX[1], 22, { size: 16, w: 800, col: C.navy, display: true });
      R.AB.forEach((ab, i) => {
        const y = RY(i), dim = focus >= 0 && focus !== i && !tour;
        g.save(); g.globalAlpha = dim ? .3 : 1;
        card(g, 100, y, 172, 164, { edge: focus === i ? C.navy : ab.col, lw: focus === i ? 4 : 2, shadow: false });
        icon(g, ab.icon, 100, y - 50, 40, { lw: 2 });
        text(g, ab.name, 100, y - 14, { size: 14, w: 800, display: true });
        wrap(g, FEEL[i], 100, y + 10, 152, { size: 11.5, lh: 14, align: 'center', col: C.muted });
        [0, 1].forEach(f => {
          const cx = COLX[f];
          g.save(); g.beginPath(); g.roundRect(cx - 205, y - 80, 410, 160, 10); g.clip(); T.use(g); T.floor(cx - 205, y - 80, 410, 160);
          g.translate(cx, y); [strikeRow, smokeRow, rainRow][i](g, a, !!f); g.restore();
          g.strokeStyle = f ? (focus === i ? C.navy : '#8ea2e6') : '#cdbf9f'; g.lineWidth = f && focus === i ? 4 : 2; g.beginPath(); g.roundRect(cx - 205, y - 80, 410, 160, 10); g.stroke();
        });
        g.restore();
      });
    },
    side(t, st, tour) { const i = tour ? Math.floor(t / 4) % 3 : st.solo; return { out: i >= 0 ? `<b>${R.AB[i].name}</b>: ${FEEL[i].toLowerCase()}. Same mechanic either way; the felt version tells you it worked.` : 'Click a row to focus it.' }; },
  });
})();
