/* One thumb, too many buttons (Module 5, Part 3: simultaneous actions, slides 157-164).
   "Players only have one thumb, which can usually only press one button at a time." A gamepad (and a mouse-and-keyboard
   tab, slide 159: two mouse fingers) with each button tied to the finger that presses it. The learner assigns Souls
   actions to buttons, and every pair of actions that must happen at once is checked: if both land on the same finger,
   the pair is flagged. Presets: the Souls default (passes) and a face-button layout (fails). The walk-through checks
   both presets on both devices, one pair at a time, as a pure function of time. Original art. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, TAU } = TD;
  const W = 1040, H = 585, GREEN = '#1a8a4c';

  const ACTS = ['Move', 'Camera', 'Attack', 'Heavy attack', 'Block', 'Parry', 'Dodge', 'Heal', 'Lock-on', 'Interact'];
  // pairs of actions players need at the same moment
  const PAIRS = [
    ['Move', 'Camera', 'walk while looking around'],
    ['Move', 'Attack', 'step in while swinging'],
    ['Move', 'Dodge', 'roll in a chosen direction'],
    ['Move', 'Block', 'strafe behind the shield'],
    ['Move', 'Heal', 'back away while drinking'],
    ['Camera', 'Attack', 'track a target while swinging'],
    ['Camera', 'Block', 'keep the guard up while turning'],
    ['Block', 'Attack', 'attack straight out of a guard'],
  ];
  const FING = { lt: 'left thumb', rt: 'right thumb', li: 'left index finger', ri: 'right index finger',
    lp: 'left little finger', lr: 'left ring finger', lm: 'left middle finger', lx: 'left index finger', lth: 'left thumb',
    mi: 'mouse index finger', mm: 'mouse middle finger', mt: 'mouse thumb', arm: 'mouse arm' };

  /* ---------- devices: slots with a shape, a finger set, and where the callout goes ---------- */
  const PAD = {
    L2: { r: [118, 82, 104, 28], f: ['li'], tag: [170, 48], name: 'L2' }, L1: { r: [118, 116, 104, 22], f: ['li'], tag: [62, 127], name: 'L1' },
    R2: { r: [418, 82, 104, 28], f: ['ri'], tag: [470, 48], name: 'R2' }, R1: { r: [418, 116, 104, 22], f: ['ri'], tag: [578, 127], name: 'R1' },
    LS: { c: [200, 232, 36], f: ['lt'], tag: [70, 232], name: 'Left stick', stick: 'L' }, L3: { c: [200, 232, 13], f: ['lt'], tag: [96, 290], name: 'L3 (click)', stick: 'L' },
    DP: { c: [262, 318, 30], f: ['lt'], tag: [150, 392], name: 'D-pad', dpad: true },
    RS: { c: [380, 318, 36], f: ['rt'], tag: [380, 410], name: 'Right stick', stick: 'R' }, R3: { c: [380, 318, 13], f: ['rt'], tag: [270, 450], name: 'R3 (click)', stick: 'R' },
    TRI: { c: [446, 194, 19], f: ['rt'], tag: [560, 182], name: 'Triangle', glyph: 'tri' }, SQ: { c: [408, 232, 19], f: ['rt'], tag: [330, 168], name: 'Square', glyph: 'sq' },
    CIR: { c: [484, 232, 19], f: ['rt'], tag: [586, 236], name: 'Circle', glyph: 'cir' }, X: { c: [446, 270, 19], f: ['rt'], tag: [560, 300], name: 'Cross', glyph: 'x' },
  };
  const KEY = 54, KX0 = 20, KY0 = 132, kx = (c, r, w = 1) => [KX0 + c * KEY, KY0 + r * KEY, KEY * w - 5, KEY - 5];
  const PC = {
    K1: { r: kx(1, 0), f: ['lp'], name: '1' }, K2: { r: kx(2, 0), f: ['lr'], name: '2' }, K3: { r: kx(3, 0), f: ['lm'], name: '3' }, K4: { r: kx(4, 0), f: ['lx'], name: '4' },
    TAB: { r: kx(0, 1, 1.4), f: ['lp'], name: 'Tab' }, Q: { r: kx(1.45, 1), f: ['lr'], name: 'Q' }, E: { r: kx(3.45, 1), f: ['lx'], name: 'E' }, R: { r: kx(4.45, 1), f: ['lx'], name: 'R' },
    WASD: { keys: [kx(2.45, 1), kx(1.7, 2), kx(2.7, 2), kx(3.7, 2)], f: ['lr', 'lm', 'lx'], name: 'WASD', fname: 'WASD fingers' },
    F: { r: kx(4.7, 2), f: ['lx'], name: 'F' }, SHIFT: { r: kx(0, 3, 1.95), f: ['lp'], name: 'Shift' }, C: { r: kx(3.95, 3), f: ['lx'], name: 'C' },
    CTRL: { r: kx(0, 4, 1.4), f: ['lp'], name: 'Ctrl' }, SPACE: { r: kx(1.45, 4, 4.2), f: ['lth'], name: 'Space' },
    LMB: { mouse: 'L', f: ['mi'], name: 'Left click' }, RMB: { mouse: 'R', f: ['mm'], name: 'Right click' }, WHEEL: { mouse: 'W', f: ['mm'], name: 'Wheel click' },
    M4: { mouse: '4', f: ['mt'], name: 'Side button 4' }, M5: { mouse: '5', f: ['mt'], name: 'Side button 5' }, MOUSE: { mouse: 'M', f: ['arm'], name: 'Mouse movement', fname: 'mouse arm' },
  };
  const DECO = [kx(0, 0), kx(5, 0), kx(5.45, 1), kx(0, 2, 1.65), kx(5.7, 2), kx(1.95, 3), kx(2.95, 3), kx(4.95, 3), kx(5.95, 3)];
  const DEV = { pad: PAD, pc: PC };
  const PRESETS = {
    pad: {
      souls: { Move: 'LS', Camera: 'RS', Attack: 'R1', 'Heavy attack': 'R2', Block: 'L1', Parry: 'L2', Dodge: 'CIR', Heal: 'SQ', 'Lock-on': 'R3', Interact: 'X' },
      broken: { Move: 'LS', Camera: 'RS', Attack: 'SQ', 'Heavy attack': 'TRI', Block: 'CIR', Parry: 'L1', Dodge: 'X', Heal: 'DP', 'Lock-on': 'R1', Interact: 'R2' },
    },
    pc: {
      souls: { Move: 'WASD', Camera: 'MOUSE', Attack: 'LMB', 'Heavy attack': 'M5', Block: 'RMB', Parry: 'SHIFT', Dodge: 'SPACE', Heal: 'M4', 'Lock-on': 'WHEEL', Interact: 'E' },
      broken: { Move: 'WASD', Camera: 'MOUSE', Attack: 'RMB', 'Heavy attack': 'LMB', Block: 'WHEEL', Parry: 'SHIFT', Dodge: 'SPACE', Heal: 'R', 'Lock-on': 'Q', Interact: 'E' },
    },
  };

  /* ---------- the rule: a pair fails when both actions need the same finger ---------- */
  function check(dev, map, a, b) {
    const D = DEV[dev], sa = map[a], sb = map[b];
    if (!sa || !sb) return { ok: null, why: `${!sa ? a : b} has no button yet` };
    const A = D[sa], B = D[sb];
    // tilting a stick and clicking it is one thumb doing one thing: allowed
    if (A.stick && A.stick === B.stick) return { ok: true, why: `${A.name} and ${B.name}: the thumb tilts and clicks the same stick` };
    const shared = A.f.filter(x => B.f.includes(x));
    if (shared.length) {
      const why = sa === 'WASD' || sb === 'WASD' ? `${sa === 'WASD' ? B.name : A.name} takes the ${FING[shared[0]]} off WASD` : `${A.name} and ${B.name} both need the ${FING[shared[0]]}`;
      return { ok: false, why };
    }
    const fn = x => x.fname || FING[x.f[0]], why = `${fn(A)} and ${fn(B)}`;
    return { ok: true, why: why[0].toUpperCase() + why.slice(1) };
  }

  /* ---------- drawing ---------- */
  const text = (g, s, x, y, { size = 14, col = C.ink, w = 600, align = 'left', font = 'Jost', base = 'alphabetic' } = {}) => { g.font = `${w} ${size}px ${font}, Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); };
  const panel = (g, x, y, w, h, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); };
  function glyph(g, k, x, y, col) {
    g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath();
    if (k === 'tri') { g.moveTo(x, y - 8); g.lineTo(x + 8, y + 6); g.lineTo(x - 8, y + 6); g.closePath(); }
    if (k === 'sq') g.rect(x - 7, y - 7, 14, 14);
    if (k === 'cir') g.arc(x, y, 8, 0, TAU);
    if (k === 'x') { g.moveTo(x - 7, y - 7); g.lineTo(x + 7, y + 7); g.moveTo(x + 7, y - 7); g.lineTo(x - 7, y + 7); }
    g.stroke();
  }
  // centre of a slot, for callout lines
  function centre(dev, id) {
    const s = DEV[dev][id];
    if (s.c) return { x: s.c[0], y: s.c[1] };
    if (s.r) return { x: s.r[0] + s.r[2] / 2, y: s.r[1] + s.r[3] / 2 };
    if (s.keys) return { x: s.keys[0][0] + s.keys[0][2] / 2, y: s.keys[0][1] + s.keys[0][3] / 2 };
    return MOUSE_POS[s.mouse];
  }
  const MX = 452, MY = 150, MW = 160, MH = 290, MB = 108;
  const MOUSE_POS = { L: { x: MX + 44, y: MY + 56 }, R: { x: MX + 116, y: MY + 56 }, W: { x: MX + 80, y: MY + 64 }, 4: { x: MX + 6, y: MY + 160 }, 5: { x: MX + 6, y: MY + 210 }, M: { x: MX + 80, y: MY + 240 } };
  const PADY = 46;
  function hitSlot(dev, x, y) {
    const D = DEV[dev]; if (dev === 'pad') y -= PADY;
    // smaller things first: stick clicks before sticks
    const order = Object.keys(D).sort((a, b) => (D[a].c ? D[a].c[2] : 99) - (D[b].c ? D[b].c[2] : 99));
    for (const id of order) {
      const s = D[id];
      if (s.c && Math.hypot(x - s.c[0], y - s.c[1]) <= s.c[2] + 3) return id;
      if (s.r && x >= s.r[0] && x <= s.r[0] + s.r[2] && y >= s.r[1] && y <= s.r[1] + s.r[3]) return id;
      if (s.keys && s.keys.some(r => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3])) return id;
      if (s.mouse) { const p = MOUSE_POS[s.mouse], rr = s.mouse === 'M' ? 40 : s.mouse === 'W' ? 12 : 24; if (Math.hypot(x - p.x, y - p.y) <= rr) return id; }
    }
    return null;
  }

  function drawPad(g, st, hot, t) {
    // finger zones
    const pulse = .5 + .5 * Math.sin(t * 6);
    const zone = (f, draw) => { const on = hot.fingers.includes(f); g.save(); g.fillStyle = on ? `rgba(255,185,81,${.35 + .25 * pulse})` : 'rgba(255,185,81,.0)'; draw(); g.restore(); };
    // controller body
    g.fillStyle = '#c9cde6'; g.strokeStyle = C.navy; g.lineWidth = 3;
    g.beginPath(); g.moveTo(150, 140); g.bezierCurveTo(240, 128, 400, 128, 490, 140); g.bezierCurveTo(560, 150, 600, 260, 610, 360);
    g.bezierCurveTo(620, 450, 540, 470, 500, 420); g.bezierCurveTo(470, 380, 440, 360, 320, 360); g.bezierCurveTo(200, 360, 170, 380, 140, 420);
    g.bezierCurveTo(100, 470, 20, 450, 30, 360); g.bezierCurveTo(40, 260, 80, 150, 150, 140); g.closePath(); g.fill(); g.stroke();
    // right thumb reach: always shown, brighter when a checked pair uses it
    g.save(); g.fillStyle = `rgba(255,185,81,${hot.fingers.includes('rt') ? .35 + .3 * pulse : .28})`; g.strokeStyle = C.gold; g.lineWidth = 2; g.setLineDash([6, 5]);
    g.beginPath(); g.ellipse(430, 262, 100, 98, -.5, 0, TAU); g.fill(); g.stroke(); g.restore();
    T.label('Right thumb reach', 548, 348, 'center', C.goldInk, 13);
    if (hot.fingers.includes('lt')) { g.fillStyle = `rgba(46,163,220,${.18 + .2 * pulse})`; g.beginPath(); g.ellipse(226, 272, 90, 88, .5, 0, TAU); g.fill(); }
    // shoulders
    Object.entries(PAD).forEach(([id, s]) => {
      if (!s.r) return;
      const on = hot.slots.includes(id), finger = s.f[0];
      g.fillStyle = on ? (hot.clash ? '#f9d9d6' : '#fde9b8') : hot.fingers.includes(finger) ? '#fde9b8' : '#e6e8f4'; g.strokeStyle = on && hot.clash ? C.red : C.navy; g.lineWidth = on ? 3.5 : 2.5;
      g.beginPath(); g.roundRect(s.r[0], s.r[1], s.r[2], s.r[3], 9); g.fill(); g.stroke();
      text(g, id, s.r[0] + s.r[2] / 2, s.r[1] + s.r[3] / 2 + 1, { size: 13, w: 800, align: 'center', base: 'middle', col: C.navy });
    });
    // sticks, d-pad, face buttons
    Object.entries(PAD).forEach(([id, s]) => {
      if (!s.c) return;
      const on = hot.slots.includes(id), [x, y, r] = s.c;
      const fill = on ? (hot.clash ? '#f9d9d6' : '#fde9b8') : '#eef0f8';
      if (s.dpad) {
        g.fillStyle = fill; g.strokeStyle = on && hot.clash ? C.red : C.navy; g.lineWidth = on ? 3.5 : 2.5;
        g.beginPath(); g.rect(x - 10, y - r, 20, 2 * r); g.rect(x - r, y - 10, 2 * r, 20); g.fill();
        g.beginPath(); g.moveTo(x - 10, y - r); g.lineTo(x + 10, y - r); g.lineTo(x + 10, y - 10); g.lineTo(x + r, y - 10); g.lineTo(x + r, y + 10); g.lineTo(x + 10, y + 10); g.lineTo(x + 10, y + r); g.lineTo(x - 10, y + r); g.lineTo(x - 10, y + 10); g.lineTo(x - r, y + 10); g.lineTo(x - r, y - 10); g.lineTo(x - 10, y - 10); g.closePath(); g.stroke();
        return;
      }
      if (id === 'L3' || id === 'R3') {
        g.fillStyle = on ? (hot.clash ? C.red : C.gold) : '#9aa0c4'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        text(g, id, x, y + 1, { size: 10, w: 800, align: 'center', base: 'middle', col: '#fff' });
        return;
      }
      g.fillStyle = s.stick ? '#5d618c' : fill; g.strokeStyle = on && hot.clash ? C.red : on ? C.gold : C.navy; g.lineWidth = on ? 5 : 2.5;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
      if (s.glyph) glyph(g, s.glyph, x, y, { tri: '#2fae63', sq: '#d04fa0', cir: '#e5322d', x: '#3a6fd8' }[s.glyph]);
    });
  }
  function drawPC(g, st, hot, t) {
    const pulse = .5 + .5 * Math.sin(t * 6);
    text(g, 'Left hand on the keyboard', KX0, KY0 - 14, { size: 13, w: 700, col: C.muted });
    text(g, 'Right hand on the mouse', MX + MW / 2, MY - 64, { size: 13, w: 700, col: C.muted, align: 'center' });
    g.strokeStyle = '#b7bad3'; g.lineWidth = 1.5; DECO.forEach(r => { g.fillStyle = '#f2f3f9'; g.beginPath(); g.roundRect(r[0], r[1], r[2], r[3], 8); g.fill(); g.stroke(); });
    const fingerCol = { lp: '#8a4fd6', lr: '#2fae63', lm: '#2ea3dc', lx: '#e0a92d', lth: '#e5322d' };
    const key = (r, label, id) => {
      const on = hot.slots.includes(id), s = PC[id];
      g.fillStyle = on ? (hot.clash ? '#f9d9d6' : '#fde9b8') : '#eef0f8'; g.strokeStyle = on ? (hot.clash ? C.red : C.gold) : C.navy; g.lineWidth = on ? 3.5 : 2;
      g.beginPath(); g.roundRect(r[0], r[1], r[2], r[3], 8); g.fill(); g.stroke();
      g.fillStyle = fingerCol[s.f[0]] || C.muted; g.fillRect(r[0] + 7, r[1] + r[3] - 8, r[2] - 14, 4);
      text(g, label, r[0] + r[2] / 2, r[1] + 15, { size: 14, w: 800, align: 'center', base: 'middle', col: C.navy });
    };
    Object.entries(PC).forEach(([id, s]) => { if (s.r) key(s.r, s.name, id); if (s.keys) s.keys.forEach((r, i) => key(r, 'WASD'[i], id)); });
    [['lp', 'little'], ['lr', 'ring'], ['lm', 'middle'], ['lx', 'index'], ['lth', 'thumb']].forEach(([f, n], i) => { g.fillStyle = fingerCol[f]; g.fillRect(KX0 + i * 74, KY0 + 5 * KEY + 14, 18, 5); text(g, n, KX0 + 22 + i * 74, KY0 + 5 * KEY + 20, { size: 12, col: C.muted }); });
    text(g, 'The coloured bar on each key is the finger that presses it.', KX0, KY0 + 5 * KEY + 44, { size: 12, col: C.muted });
    // the mouse
    const mOn = id => hot.slots.includes(id), mCol = id => mOn(id) ? (hot.clash ? '#f9d9d6' : '#fde9b8') : '#eef0f8', mLine = id => { g.lineWidth = mOn(id) ? 3.5 : 2; g.strokeStyle = mOn(id) ? (hot.clash ? C.red : C.gold) : C.navy; };
    const R0 = MW / 2;
    g.fillStyle = mOn('MOUSE') ? mCol('MOUSE') : '#c9cde6'; g.strokeStyle = C.navy; g.lineWidth = 3;
    g.beginPath(); g.roundRect(MX, MY, MW, MH, [R0, R0, 64, 64]); g.fill(); g.stroke();
    g.fillStyle = mCol('LMB'); g.beginPath(); g.moveTo(MX + R0, MY); g.lineTo(MX + R0, MY + MB); g.lineTo(MX, MY + MB); g.lineTo(MX, MY + R0); g.arc(MX + R0, MY + R0, R0, Math.PI, Math.PI * 1.5); g.closePath(); g.fill(); mLine('LMB'); g.stroke();
    g.fillStyle = mCol('RMB'); g.beginPath(); g.moveTo(MX + R0, MY); g.arc(MX + R0, MY + R0, R0, Math.PI * 1.5, 0); g.lineTo(MX + MW, MY + MB); g.lineTo(MX + R0, MY + MB); g.closePath(); g.fill(); mLine('RMB'); g.stroke();
    g.fillStyle = mOn('WHEEL') ? (hot.clash ? C.red : C.gold) : '#5d618c'; g.beginPath(); g.roundRect(MX + R0 - 9, MY + 40, 18, 46, 9); g.fill();
    ['4', '5'].forEach(n => { const p = MOUSE_POS[n], id = 'M' + n; g.fillStyle = mCol(id); mLine(id); g.beginPath(); g.roundRect(p.x - 13, p.y - 20, 24, 40, 7); g.fill(); g.stroke(); text(g, n, p.x - 1, p.y + 1, { size: 12, w: 800, align: 'center', base: 'middle', col: C.navy }); });
    text(g, 'index', MX + 40, MY + MB - 12, { size: 12, w: 700, align: 'center', col: C.muted }); text(g, 'middle', MX + MW - 40, MY + MB - 12, { size: 12, w: 700, align: 'center', col: C.muted });
    text(g, 'thumb', MX - 2, MY + 250, { size: 12, w: 700, align: 'right', col: C.muted });
    g.save(); g.fillStyle = `rgba(255,185,81,${hot.fingers.some(f => f === 'mi' || f === 'mm') ? .3 + .25 * pulse : .2})`; g.strokeStyle = C.gold; g.setLineDash([6, 5]); g.lineWidth = 2;
    g.beginPath(); g.ellipse(MX + R0, MY + 60, 104, 70, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
    text(g, 'Two fingers on top', MX + R0, MY + MB + 26, { size: 13, w: 700, align: 'center', col: C.goldInk });
  }

  function draw(g, st, t, hotIdx, revealed, cap) {
    T.use(g); g.clearRect(0, 0, W, H);
    panel(g, 0, 0, 640, H, 'rgba(255,252,244,.85)'); panel(g, 652, 0, 388, H, 'rgba(255,252,244,.85)');
    const map = st.maps[st.dev][st.preset] ? st.cur[st.dev] : st.cur[st.dev];
    const res = PAIRS.map(([a, b]) => check(st.dev, map, a, b));
    const hp = hotIdx >= 0 ? PAIRS[hotIdx] : null;
    const hot = { slots: [], fingers: [], clash: false };
    if (hp) { hot.slots = [map[hp[0]], map[hp[1]]].filter(Boolean); hot.fingers = hot.slots.flatMap(id => DEV[st.dev][id].f); hot.clash = res[hotIdx].ok === false; }
    text(g, st.dev === 'pad' ? 'Gamepad: each button belongs to one finger' : 'Mouse and keyboard: each key belongs to one finger', 20, 30, { size: 15, w: 700 });
    g.save(); if (st.dev === 'pad') g.translate(0, PADY);
    if (st.dev === 'pad') drawPad(g, st, hot, t); else drawPC(g, st, hot, t);
    // callouts: the action on each slot
    const D = DEV[st.dev], R0x = MW / 2;
    const inv = {}; Object.entries(map).forEach(([a, id]) => { if (id) inv[id] = a; });
    Object.entries(inv).forEach(([id, a]) => {
      const s = D[id], c = centre(st.dev, id), on = hot.slots.includes(id);
      let tg = s.tag;
      if (st.dev === 'pc') { tg = s.keys ? [KX0 + .8 * KEY, KY0 + 2.45 * KEY] : s.mouse ? { L: [MX + 30, MY - 34], R: [MX + MW - 20, MY - 34], W: [MX + R0x, MY + MB + 52], 4: [MX + 92, MY + 172], 5: [MX + 92, MY + 214], M: [MX + R0x, MY + 262] }[s.mouse] : [c.x, c.y + 31]; }
      if (st.dev === 'pc' && s.r) { text(g, a, c.x, s.r[1] + 35, { size: a.length > 7 ? 10 : 11, w: 800, align: 'center', base: 'middle', col: on ? (hot.clash ? C.red : C.goldInk) : C.player }); return; }
      if (!tg) tg = [c.x, c.y - 30];
      const col = on ? (hot.clash ? C.red : C.goldInk) : C.navy;
      if (st.dev === 'pad' || s.mouse || s.keys) { g.strokeStyle = on ? col : 'rgba(21,32,68,.45)'; g.lineWidth = on ? 2.5 : 1.5; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(tg[0], tg[1]); g.stroke(); }
      T.label(a, tg[0], tg[1], 'center', on ? '#fff' : col, st.dev === 'pc' && s.r && !s.keys ? 11 : 14, on ? (hot.clash ? C.red : C.gold) : 'rgba(255,252,244,.95)');
    });
    g.restore();
    if (st.armed) text(g, `Placing: ${st.armed}. Click a button.`, 20, H - 18, { size: 14, w: 700, col: C.player });
    if (cap) T.label(cap, 320, 62, 'center', '#fff', 15, C.navy);
    // the pairs
    text(g, 'Must happen at once', 670, 32, { size: 16, w: 800, font: 'Montserrat' });
    text(g, '"Players only have one thumb, which can', 670, 52, { size: 12, col: C.muted, w: 500 });
    text(g, 'usually only press one button at a time."', 670, 66, { size: 12, col: C.muted, w: 500 });
    PAIRS.forEach(([a, b, why], i) => {
      const y = 84 + i * 60, r = res[i], shown = i < revealed, isHot = i === hotIdx;
      g.fillStyle = isHot ? '#fde9b8' : shown && r.ok === false ? '#f9e1de' : '#efe6d2'; g.beginPath(); g.roundRect(664, y, 364, 54, 10); g.fill();
      if (isHot) { g.strokeStyle = r.ok === false ? C.red : C.gold; g.lineWidth = 2.5; g.stroke(); }
      text(g, `${a} + ${b}`, 678, y + 21, { size: 15, w: 700 });
      text(g, shown ? r.why : why, 678, y + 42, { size: 12, col: shown && r.ok === false ? C.redDk : C.muted, w: 600 });
      const mx = 1006, my = y + 27;
      if (!shown) { g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, 11, 0, TAU); g.stroke(); return; }
      g.fillStyle = r.ok === null ? '#cdbf9f' : r.ok ? GREEN : C.red; g.beginPath(); g.arc(mx, my, 13, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
      if (r.ok) { g.moveTo(mx - 6, my); g.lineTo(mx - 1, my + 5); g.lineTo(mx + 7, my - 5); } else if (r.ok === false) { g.moveTo(mx - 5, my - 5); g.lineTo(mx + 5, my + 5); g.moveTo(mx + 5, my - 5); g.lineTo(mx - 5, my + 5); } else { g.moveTo(mx - 6, my); g.lineTo(mx + 6, my); }
      g.stroke(); g.lineCap = 'butt';
    });
    return res;
  }

  // walk-through: Souls default and the broken layout, on the gamepad then on mouse and keyboard; one pair every 0.75 s
  const PH = 7, STEP = .75, DUR = PH * 4;
  const PHASES = [['pad', 'souls', 'The Souls default: every pair lands on two different fingers.'], ['pad', 'broken', 'Attack and block on face buttons: the right thumb has to be in three places.'],
    ['pc', 'souls', 'Mouse and keyboard: attack and block on the two fingers on top of the mouse.'], ['pc', 'broken', 'Attack and block both on the middle finger, and heal on R: two hands, still stuck.']];

  canvasDemo('thumb', (s, cv, g) => {
    const clone = m => JSON.parse(JSON.stringify(m));
    const st = { dev: 'pad', preset: 'souls', maps: PRESETS, cur: { pad: clone(PRESETS.pad.souls), pc: clone(PRESETS.pc.souls) }, armed: null, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.ot-tour');
    $(s, '.ot-acts').innerHTML = ACTS.map(a => `<button class="btn" data-a="${a}">${a}</button>`).join('');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    $$(s, '.ot-dev .btn').forEach(b => b.onclick = () => { manual(); st.dev = b.dataset.d; st.key = ''; });
    $$(s, '.ot-pre .btn').forEach(b => b.onclick = () => { manual(); st.preset = b.dataset.p; st.cur[st.dev] = clone(PRESETS[st.dev][st.preset]); st.key = ''; });
    $$(s, '.ot-acts .btn').forEach(b => b.onclick = () => { manual(); st.armed = st.armed === b.dataset.a ? null : b.dataset.a; st.key = ''; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.armed = null; tourBtn.classList.add('on'); };
    const at = e => { const r = cv.getBoundingClientRect(); return hitSlot(st.dev, (e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height); };
    cv.addEventListener('mousemove', e => { cv.style.cursor = at(e) ? 'pointer' : ''; });
    cv.addEventListener('click', e => {
      const id = at(e); if (!id) return; manual();
      const map = st.cur[st.dev];
      if (!st.armed) { st.armed = Object.keys(map).find(a => map[a] === id) || null; st.key = ''; return; }   // click a button to pick up its action
      const prev = map[st.armed], other = Object.keys(map).find(a => map[a] === id && a !== st.armed);
      if (other) map[other] = prev || null;   // swap
      map[st.armed] = id; st.armed = null; st.preset = 'custom'; st.key = '';
    });
    function frame(t) {
      let hotIdx = -1, revealed = PAIRS.length, cap = null;
      if (st.tour) {
        const k = Math.min(3, Math.floor(t / PH)), f = t - k * PH, [dev, pre, c] = PHASES[k];
        st.dev = dev; st.preset = pre; st.cur[dev] = clone(PRESETS[dev][pre]); st.armed = null;
        revealed = clamp(Math.floor((f - 1) / STEP) + 1, 0, PAIRS.length); hotIdx = f >= 1 && revealed <= PAIRS.length && f < 1 + STEP * PAIRS.length ? revealed - 1 : -1; cap = c;
      } else {
        // hovering is not needed: cycle through the failing pairs so the fingers light up
        const fails = PAIRS.map((p, i) => i).filter(i => check(st.dev, st.cur[st.dev], PAIRS[i][0], PAIRS[i][1]).ok === false);
        if (fails.length) hotIdx = fails[Math.floor(t / 1.2) % fails.length];
      }
      const res = draw(g, st, t, hotIdx, revealed, cap);
      const key = [st.dev, st.preset, st.armed, JSON.stringify(st.cur[st.dev]), revealed].join('|');
      if (key === st.key) return; st.key = key;
      $$(s, '.ot-dev .btn').forEach(b => b.classList.toggle('on', b.dataset.d === st.dev));
      $$(s, '.ot-pre .btn').forEach(b => b.classList.toggle('on', b.dataset.p === st.preset));
      $$(s, '.ot-acts .btn').forEach(b => b.classList.toggle('on', b.dataset.a === st.armed));
      const shown = res.slice(0, revealed), ok = shown.filter(r => r.ok).length, nClash = shown.filter(r => r.ok === false).length;
      say($(s, '.ot-stats'), `<div class="${nClash ? 'r' : 'g'}"><b>${ok}/${PAIRS.length}</b><span>pairs playable at once</span></div>` + (nClash ? `<div class="r"><b>${nClash}</b><span>pairs fighting over one finger</span></div>` : ''));
      say($(s, '.ot-out'), nClash ? 'A flagged pair needs two buttons under the same finger at the same moment. Move one of them to a finger that is free then: usually a shoulder button, or the other mouse finger.'
        : st.dev === 'pad' ? 'Held actions sit on the shoulders, so the right thumb stays on the camera while the index fingers attack and block.' : 'Two fingers rest on top of the mouse. Attack and block each get one, and everything else goes to the thumbs.');
    }
    window.__seek = (t) => { st.held = true; st.tour = true; frame(t); };
    window.__dur = () => DUR;
    return dt => { if (st.held) return; st.t += Math.max(0, dt); if (st.tour && st.t >= DUR) st.t = 0; frame(st.t); };
  });
})();
