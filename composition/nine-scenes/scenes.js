/* The nine fundamentals of action games, one scene each (MGM C4 M7, deck slides 244-254).
   Every scene uses the same layout so only the category changes: Pip (the player) and Rook (the opponent) act out one exchange,
   a two-row timeline under them shows what Rook does and where Pip's action falls (before, during or post), and the 3 x 3 grid
   on the right lights the cell. Scenes are 'f-initiate', 'f-zone', 'f-punish', 'f-mitigate', 'f-reflex', 'f-react', 'f-setup',
   'f-counterplay', 'f-response'. Names, definitions and risk examples are the deck's; the staged exchanges and the damage
   numbers are this page's illustrations. Each is a pure function of time: window.__seek(t, which) / __dur(which). */
(function () {
  const { text, wrap, chip, panel, scene, clamp, ease, lerp } = CK;
  const C = TD.C, TAU = Math.PI * 2;
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const ROWS = [['Offensive', '#e5736b', 'crossed-swords', '#a8322a'], ['Defensive', '#6f93e0', 'checked-shield', '#2f55a8'], ['Predictive', '#62b77c', 'eye-target', '#1f7a3f']];
  const COLS = [['Before', '#f2c94c', '#8a6500'], ['During', '#f0954a', '#9a4a06'], ['Post', '#9b7fd6', '#4b2c8a']];
  // [name, definition, high risk, low risk], row-major: the deck's wording
  const CELLS = [
    ['Initiate', 'Pre-empting the opponent by performing an offensive, proactive action.', ['Charging', 'Gap Closing', 'Approaching'], ['Projectile Harassment']],
    ['Zone', 'Putting hitboxes out to influence what the opponent is doing and where they go.', ['Far-reaching Pokes', 'Crowd Control'], ['Resource-Limited Missiles', 'Placed AoE Zones']],
    ['Punish', 'Making use of an enemy mistake to land an attack that would otherwise not be possible or easy to avoid.', ['Slow Launchers', 'Super Moves', 'Charged Moves'], ['Quick Jabs', 'Far-reaching Pokes']],
    ['Mitigate', 'Proactively acting to prevent or reduce an incoming attack.', ['Retreat', 'Block', 'Super-Armor'], ['Distancing', 'Obstacle']],
    ['Reflex', 'Twitch-responses to an incoming attack in flight.', ['Perfect Block or Dodge', 'Parry', 'Deflecting'], ['Interrupt', 'Pushback', 'Disengage']],
    ['React', 'Done in response to a situation, such as an enemy telegraph or an attack hitting you.', ['Tech Roll (Ukemi)', 'Lifesteal (Rally)'], ['Heal']],
    ['Setup', 'Performing an action to prepare before an exchange.', ['Empowerment', 'Attack Feint', 'Baiting'], ['Trap', 'AoE Totem-Base', 'Primer']],
    ['Counterplay', 'Observing the opponent’s patterns, reading when they will repeat, and countering them during the exchange.', ['Power Shield', 'Unblockable', 'Conditional Counters'], ['Block Break', 'Grab / Throw']],
    ['Response', 'Seeing how the opponent is playing and changing your own state to improve your situation.', ['Equipment Change', 'Switch Stance / Spell Swap', 'Toe-to-Toe Trade'], ['Elemental Enchant / Infuse', 'Revive']],
  ];
  const FLOOR = 392, S = 1.1, SX0 = 20, SW = 760;

  /* ---------- small helpers ---------- */
  // pose keyframes [[time, pose], ...], eased between neighbours
  const kf = (a, keys) => {
    if (a <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) if (a < keys[i + 1][0]) return CAST.mix(keys[i][1], keys[i + 1][1], ease(ph(a, keys[i][0], keys[i + 1][0])));
    return keys[keys.length - 1][1];
  };
  const kv = (a, keys) => {
    if (a <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) if (a < keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], ease(ph(a, keys[i][0], keys[i + 1][0])));
    return keys[keys.length - 1][1];
  };
  // a strike: startup [t0, t1), active [t1, t2), recovery [t2, t3); null outside it
  const strike = (a, t0, t1, t2, t3, kind) => a < t0 || a >= t3 ? null : CAST.swing(a - t0, t1 - t0, t2 - t0, t3 - t0, kind).pose;
  const fig = (g, id, x, pose, o = {}) => CAST.draw(g, id, { x, y: FLOOR, s: S, pose, ...o });
  const pip = (g, x, pose, o) => fig(g, 'pip', x, pose, { face: 1, ...o });
  const rook = (g, x, pose, o) => fig(g, 'rook', x, pose, { face: -1, ...o });
  // a label that pops at time t0 and drifts up while it fades
  function pop(g, s, x, y, col, a, t0, o = {}) {
    const k = a - t0, life = o.life || 1.3; if (k < 0 || k > life) return;
    const sc = 1 + .5 * (1 - ease(ph(k, 0, .18)));
    g.save(); g.translate(x, y - 22 * ease(k / life)); g.scale(sc, sc);
    text(g, s, 0, 0, { size: o.size || 22, w: 800, display: true, col, stroke: 6, a: 1 - ph(k, life - .35, life) }); g.restore();
  }
  // a label that stays between t0 and t1
  function note(g, s, x, y, col, a, t0, t1, o = {}) {
    const k = Math.min(ph(a, t0, t0 + .2), 1 - ph(a, t1 - .2, t1)); if (k <= 0) return;
    chip(g, s, x, y, { fill: '#fffaf0', edge: col, col, size: o.size || 14, a: k, w: 700 });
  }
  function spark(g, x, y, a, t0, col = '#ffd45e', r = 34) {
    const k = ph(a, t0, t0 + .32); if (a < t0 || k >= 1) return;
    g.save(); g.globalAlpha *= 1 - k; g.strokeStyle = col; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + .3, r0 = r * (.25 + .5 * k), r1 = r * (.6 + .7 * k); g.beginPath(); g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * .3 * (1 - k), 0, TAU); g.fill(); g.restore();
  }
  function hp(g, x, frac, o = {}) {
    const w = 96, h = 13, y = FLOOR - 212, x0 = x - w / 2;
    g.save(); g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x0, y, w, h, 5); g.fill();
    if (o.ghost != null) { g.fillStyle = o.ghostCol || '#f4b5ae'; g.beginPath(); g.roundRect(x0, y, w * o.ghost, h, 5); g.fill(); }
    g.fillStyle = o.col || '#4fb36a'; g.beginPath(); g.roundRect(x0, y, Math.max(6, w * frac), h, 5); g.fill();
    g.beginPath(); g.roundRect(x0, y, w, h, 5); g.stroke(); g.restore();
    text(g, 'health', x, y - 11, { size: 11.5, w: 700, col: C.muted });
  }
  // a thought bubble for the predictive row: the eye icon and a line or two
  function think(g, x, y, w, lines, a, t0, t1) {
    const k = Math.min(ph(a, t0, t0 + .25), 1 - ph(a, t1 - .25, t1)); if (k <= 0) return;
    const h = 30 + lines.length * 21;
    g.save(); g.globalAlpha *= k; g.fillStyle = '#fffdf6'; g.strokeStyle = ROWS[2][3]; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 18); g.fill(); g.stroke();
    [[x - w / 2 + 34, y + h / 2 + 12, 8], [x - w / 2 + 22, y + h / 2 + 28, 5]].forEach(([bx, by, r]) => { g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); g.stroke(); });
    GI.draw(g, 'eye-target', x - w / 2 + 28, y, 30, ROWS[2][3]);
    lines.forEach((l, i) => text(g, l, x + 18, y - (lines.length - 1) * 10.5 + i * 21, { size: 16, w: 700, col: C.navy }));
    g.restore();
  }
  // game icon in a round badge
  function badge(g, name, x, y, s, col, a = 1) {
    g.save(); g.globalAlpha *= a; g.fillStyle = '#fffaf0'; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, s * .72, 0, TAU); g.fill(); g.stroke();
    GI.draw(g, name, x, y, s, col); g.restore();
  }

  /* ---------- the shared frame: header, grid, examples, stage, timeline ---------- */
  function cellArt(g, r, c, x, y, w, h, lit) {
    const x0 = x - w / 2, y0 = y - h / 2, rad = Math.min(10, w / 6);
    g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, rad); g.save(); g.clip();
    g.fillStyle = ROWS[r][1]; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = COLS[c][1]; g.beginPath(); g.moveTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = `rgba(255,250,240,${lit ? .18 : .78})`; g.fillRect(x0, y0, w, h); g.restore();
    g.strokeStyle = lit ? C.navy : '#b9b09a'; g.lineWidth = lit ? 3 : 1.5; g.beginPath(); g.roundRect(x0, y0, w, h, rad); g.stroke(); g.restore();
  }
  function frame(g, a, cfg) {
    const i = cfg.cell, r = Math.floor(i / 3), c = i % 3, [name, def, hi, lo] = CELLS[i];
    // header
    cellArt(g, r, c, 66, 64, 88, 88, true); GI.draw(g, ROWS[r][2], 66, 64, 46, C.navy);
    text(g, name, 124, 36, { align: 'left', size: 36, w: 800, display: true, col: C.navy });
    g.save(); g.font = '800 36px Montserrat, Jost, sans-serif'; const nw = g.measureText(name).width; g.restore();
    const w1 = chip(g, ROWS[r][0], 124 + nw + 20, 37, { fill: ROWS[r][1], edge: ROWS[r][3], col: '#fff', size: 15, align: 'left', w: 800 });
    text(g, '×', 124 + nw + 20 + w1 + 12, 37, { size: 18, w: 800, col: C.muted });
    chip(g, COLS[c][0] === 'Post' ? 'Post (after)' : COLS[c][0], 124 + nw + 20 + w1 + 24, 37, { fill: COLS[c][1], edge: COLS[c][2], col: C.navy, size: 15, align: 'left', w: 800 });
    wrap(g, def, 124, 74, 640, { size: 16.5, w: 600, lh: 22, col: C.ink });
    // grid
    const lit = a >= cfg.key, pulse = lit ? 1 - ph(a, cfg.key, cfg.key + .6) : 0;
    panel(g, 796, 10, 230, 250);
    text(g, 'The nine fundamentals', 911, 27, { size: 12.5, w: 700, col: C.muted, display: true });
    const gx = cc => 856 + cc * 66, gy = rr => 92 + rr * 62;
    COLS.forEach(([n, , dk], cc) => text(g, n, gx(cc), 50, { size: 12.5, w: 800, col: cc === c ? dk : C.muted }));
    ROWS.forEach(([, , ic, dk], rr) => GI.draw(g, ic, 810, gy(rr), 20, rr === r ? dk : '#a9a391'));
    for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) {
      const me = rr === r && cc === c, x = gx(cc), y = gy(rr);
      if (me) { g.fillStyle = `rgba(253,200,60,${lit ? .55 + .45 * pulse : .25})`; g.beginPath(); g.roundRect(x - 35 - 6 * pulse, y - 32 - 6 * pulse, 70 + 12 * pulse, 64 + 12 * pulse, 12); g.fill(); }
      cellArt(g, rr, cc, x, y, 60, 54, me);
      const nm = CELLS[rr * 3 + cc][0];
      text(g, nm, x, y, { size: nm.length > 9 ? 8.4 : nm.length > 7 ? 10 : 11.5, w: 800, display: true, col: me ? C.navy : '#8d8672' });
    }
    // the deck's examples
    panel(g, 796, 270, 230, 305);
    text(g, 'Examples from the deck', 911, 288, { size: 12.5, w: 700, col: C.muted, display: true });
    let y = 316;
    [['High risk', hi, C.redDk], ['Low risk', lo, '#1c6fa8']].forEach(([t, list, col]) => {
      text(g, t, 812, y, { align: 'left', size: 14, w: 800, display: true, col }); y += 22;
      list.forEach(e => { g.fillStyle = col; g.beginPath(); g.arc(818, y, 3, 0, TAU); g.fill(); const ls = wrap(g, e, 828, y, 190, { size: 14.5, w: 600, lh: 18 }); y += ls.length * 18 + 5; });
      y += 12;
    });
    text(g, 'In every scene', 812, 520, { align: 'left', size: 12.5, w: 700, col: C.muted, display: true });
    CAST.tag(g, 'pip', 834, 541, { size: 13 }); text(g, 'the player', 862, 541, { align: 'left', size: 14, w: 600 });
    CAST.tag(g, 'rook', 838, 562, { size: 13 }); text(g, 'the opponent', 870, 562, { align: 'left', size: 14, w: 600 });
    // stage
    g.save(); g.fillStyle = 'rgba(255,252,244,.7)'; g.strokeStyle = 'rgba(205,191,159,.9)'; g.lineWidth = 2; g.beginPath(); g.roundRect(SX0, 126, SW, 292, 14); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(SX0, 126, SW, 292, 14); g.clip();
    g.fillStyle = '#e6dcc6'; g.fillRect(SX0, FLOOR, SW, 40); g.strokeStyle = '#b9ab88'; g.lineWidth = 3; g.beginPath(); g.moveTo(SX0, FLOOR); g.lineTo(SX0 + SW, FLOOR); g.stroke();
    cfg.stage(g, a);
    g.restore();
    // caption
    let cap = cfg.caps[0]; cfg.caps.forEach(cp => { if (a >= cp[0]) cap = cp; });
    const last = cap === cfg.caps[cfg.caps.length - 1], ck = ph(a, cap[0], cap[0] + .2);
    text(g, cap[1], SX0 + SW / 2, 438, { size: last ? 20 : 18.5, w: 800, display: last, col: last ? ROWS[r][3] : C.navy, a: ck });
    timeline(g, a, cfg, r, c);
  }
  function timeline(g, a, cfg, r, c) {
    const TX = 96, TW = 676, Y0 = 458, Y1 = 575, sx = t => TX + TW * t / cfg.dur;
    const edges = [0, cfg.bands[0], cfg.bands[1], cfg.next || cfg.dur];
    for (let k = 0; k < 3; k++) {
      const x0 = sx(edges[k]), x1 = sx(edges[k + 1]), me = k === c;
      g.fillStyle = COLS[k][1]; g.globalAlpha = me ? .5 : .13; g.beginPath(); g.roundRect(x0 + 1, Y0, x1 - x0 - 2, Y1 - Y0, 8); g.fill(); g.globalAlpha = 1;
      if (me) { g.strokeStyle = COLS[k][2]; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x0 + 1, Y0, x1 - x0 - 2, Y1 - Y0, 8); g.stroke(); }
      text(g, (COLS[k][0] === 'Post' ? 'Post (after)' : COLS[k][0]).toUpperCase(), (x0 + x1) / 2, Y0 + 12, { size: me ? 13.5 : 12, w: 800, display: true, col: me ? COLS[k][2] : '#9a9483' });
    }
    if (cfg.next) {
      const x0 = sx(cfg.next), x1 = sx(cfg.dur);
      g.fillStyle = 'rgba(120,112,90,.1)'; g.beginPath(); g.roundRect(x0 + 1, Y0, x1 - x0 - 2, Y1 - Y0, 8); g.fill();
      text(g, 'NEXT EXCHANGE', (x0 + x1) / 2, Y0 + 12, { size: 12, w: 800, display: true, col: '#9a9483' });
    }
    CAST.tag(g, 'rook', 56, 503, { size: 13 }); CAST.tag(g, 'pip', 56, 541, { size: 13 });
    const bars = (list, y, who) => list.forEach(([t0, t1, label, kind]) => {
      const x0 = sx(t0), x1 = sx(t1), on = a >= t0, key = kind === 'key', ghost = kind === 'ghost', win = kind === 'window';
      g.save(); g.globalAlpha = on || ghost || win ? 1 : .28;
      const fill = who === 'rook' ? (kind === 'hit' ? '#d0574f' : kind === 'stuck' ? '#f4c9c4' : '#e9a8a2') : key ? ROWS[r][1] : '#c9d6e8';
      g.fillStyle = ghost || win ? 'rgba(255,250,240,.6)' : fill; g.strokeStyle = who === 'rook' ? '#7c2420' : key || win ? ROWS[r][3] : '#5d6f8c'; g.lineWidth = key || win ? 3 : 1.8;
      if (ghost || win) g.setLineDash([5, 4]);
      g.beginPath(); g.roundRect(x0, y - 9, Math.max(6, x1 - x0), 18, 5); g.fill(); g.stroke(); g.setLineDash([]);
      // the part already played
      if (on && !ghost && !win && a < t1) { g.fillStyle = 'rgba(21,32,68,.22)'; g.beginPath(); g.roundRect(x0, y - 9, Math.max(4, sx(a) - x0), 18, 5); g.fill(); }
      const ly = who === 'rook' ? y - 19 : y + 20;
      if (label) text(g, label, (x0 + x1) / 2, ly, { size: key ? 13.5 : 12, w: key ? 800 : 700, col: who === 'rook' ? '#7c2420' : key || win ? ROWS[r][3] : '#4a5a78' });
      g.restore();
    });
    bars(cfg.rook, 503, 'rook'); bars(cfg.pip, 541, 'pip');
    // the moment Pip's action lands
    if (a >= cfg.key) { const x = sx(cfg.key), k = 1 - ph(a, cfg.key, cfg.key + .5); g.fillStyle = C.navy; g.beginPath(); g.arc(x, 541, 6 + 6 * k, 0, TAU); g.fill(); g.fillStyle = '#ffd45e'; g.beginPath(); g.arc(x, 541, 3, 0, TAU); g.fill(); }
    // playhead
    const x = sx(Math.min(a, cfg.dur)); g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, Y0 + 22); g.lineTo(x, Y1 - 4); g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(x - 6, Y0 + 20); g.lineTo(x + 6, Y0 + 20); g.lineTo(x, Y0 + 29); g.closePath(); g.fill();
  }
  function make(name, cfg) {
    scene(name, { dur: cfg.dur, draw(g, t) { frame(g, t, cfg); }, side(t) { let cap = cfg.caps[0]; cfg.caps.forEach(cp => { if (t >= cp[0]) cap = cp; }); return { out: cap[1] }; } });
  }
  const hitPose = (a, t0, hold = .7) => kf(a, [[t0, 'guard'], [t0 + .12, 'hit'], [t0 + hold, 'hit'], [t0 + hold + .5, 'guard']]);

  /* ---------- 1. Initiate: offensive, before ---------- */
  make('f-initiate', {
    cell: 0, dur: 6.5, bands: [3.8, 5.0], key: 2.25,
    rook: [[3.8, 5.0, 'never starts', 'ghost']],
    pip: [[1.0, 2.0, 'gap close', 'key'], [2.0, 2.7, 'strike', 'key']],
    caps: [[0, 'Rook has not attacked yet.'], [1.0, 'Pip closes the gap…'], [2.2, '…and lands the first hit.'], [3.6, 'Initiate: offense, before the opponent acts.']],
    stage(g, a) {
      const px = kv(a, [[1.0, 170], [2.0, 452]]);
      const pp = a < 1 ? 'guard' : a < 2 ? CAST.cycle('run', (a - 1) * 2.5) : strike(a, 2.0, 2.22, 2.4, 2.9) || 'guard';
      const rx = kv(a, [[2.25, 580], [2.7, 640]]);
      const rp = a < 2.25 ? 'idle' : hitPose(a, 2.25, 1.0);
      note(g, 'idle: no attack yet', 580, FLOOR - 196, '#7c2420', a, .2, 2.2);
      if (a > 1 && a < 2.1) { g.save(); g.strokeStyle = 'rgba(46,163,220,.5)'; g.lineWidth = 4; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(px - 50 - i * 16, FLOOR - 60 - i * 24); g.lineTo(px - 96 - i * 16, FLOOR - 60 - i * 24); g.stroke(); } g.restore(); }
      rook(g, rx, rp, { flash: a > 2.25 ? 1 - ph(a, 2.25, 2.55) : 0 });
      pip(g, px, pp);
      spark(g, 545, FLOOR - 100, a, 2.25);
      pop(g, 'first hit', 560, FLOOR - 190, ROWS[0][3], a, 2.25, { life: 1.6 });
    },
  });

  /* ---------- 2. Zone: offensive, during ---------- */
  make('f-zone', {
    cell: 1, dur: 8, bands: [1.0, 6.2], key: 2.25,
    rook: [[1.0, 2.3, 'walks in'], [2.3, 3.3, 'backs off', 'stuck'], [3.6, 4.75, 'walks in'], [4.75, 5.7, 'pushed out', 'stuck']],
    pip: [[2.0, 3.1, 'poke', 'key'], [4.5, 5.6, 'poke', 'key']],
    caps: [[0, 'Rook wants to get close.'], [2.0, 'Pip puts a hitbox where Rook wants to go.'], [3.6, 'Rook tries again and is pushed out.'], [6.0, 'Zone: offense during the exchange, controlling space.']],
    stage(g, a) {
      const PX = 230, o = { x: PX, y: FLOOR, s: S, face: 1 };
      const tipX = CAST.tip('pip', { ...o, pose: 'thrust' }).x, tipY = CAST.tip('pip', { ...o, pose: 'thrust' }).y;
      const pp = strike(a, 2.0, 2.25, 2.8, 3.1, 'thrust') || strike(a, 4.5, 4.75, 5.3, 5.6, 'thrust') || 'guard';
      const active = (a >= 2.25 && a < 2.8) || (a >= 4.75 && a < 5.3);
      const edge = tipX + 18;
      // the zone on the floor
      g.fillStyle = `rgba(229,115,107,${active ? .5 : .2})`; g.fillRect(PX + 30, FLOOR + 3, edge - PX - 30, 21);
      text(g, 'space Pip controls', (PX + 30 + edge) / 2, FLOOR + 14, { size: 12.5, w: 800, col: ROWS[0][3] });
      g.strokeStyle = ROWS[0][3]; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(edge, FLOOR - 190); g.lineTo(edge, FLOOR + 24); g.stroke(); g.setLineDash([]);
      const rx = kv(a, [[1.0, 660], [2.3, edge + 52], [2.5, edge + 52], [3.3, 640], [3.6, 640], [4.75, edge + 34], [4.85, edge + 34], [5.7, 670]]);
      const rp = a < 1 ? 'guard' : a < 2.3 ? CAST.cycle('walk', (a - 1) * 1.7) : a < 3.3 ? CAST.mix('block', 'guard', ph(a, 2.9, 3.3)) : a < 3.6 ? 'guard' : a < 4.75 ? CAST.cycle('walk', (a - 3.6) * 1.7) : hitPose(a, 4.75, .8);
      rook(g, rx, rp, { flash: a > 4.75 ? 1 - ph(a, 4.75, 5.05) : 0 });
      pip(g, PX, pp);
      if (active) {
        g.fillStyle = 'rgba(229,50,45,.3)'; g.strokeStyle = C.red; g.lineWidth = 2.5; g.setLineDash([7, 4]);
        g.beginPath(); g.roundRect(PX + 46, tipY - 17, edge - PX - 46, 34, 6); g.fill(); g.stroke(); g.setLineDash([]);
        text(g, 'hitbox', (PX + 46 + edge) / 2, tipY - 30, { size: 14, w: 800, col: C.redDk, stroke: 4 });
      }
      spark(g, edge, tipY, a, 4.75, '#ffd45e', 26);
      pop(g, 'cannot get in', edge + 70, FLOOR - 196, '#7c2420', a, 2.35, { size: 18, life: 1.2 });
      pop(g, 'pushed out', edge + 80, FLOOR - 196, ROWS[0][3], a, 4.8, { size: 20, life: 1.4 });
    },
  });

  /* ---------- 3. Punish: offensive, post ---------- */
  make('f-punish', {
    cell: 2, dur: 8, bands: [1.2, 3.0], key: 4.25,
    rook: [[1.2, 2.7, 'slow wind-up'], [2.7, 3.0, 'miss', 'hit'], [3.0, 5.4, 'recovery: cannot act', 'stuck']],
    pip: [[3.3, 3.9, 'step in'], [3.9, 4.7, 'strike', 'key']],
    caps: [[0, 'Rook winds up a slow, heavy swing.'], [2.7, 'It misses.'], [3.05, 'Rook is stuck in recovery…'], [3.9, '…so Pip lands a hit he could not get otherwise.'], [5.3, 'Punish: offense after the opponent’s mistake.']],
    stage(g, a) {
      const px = kv(a, [[3.3, 250], [3.9, 372]]);
      const pp = a < 3.3 ? 'guard' : a < 3.9 ? CAST.cycle('walk', (a - 3.3) * 2.2) : strike(a, 3.9, 4.2, 4.4, 4.9) || 'guard';
      const rx = kv(a, [[2.5, 520], [2.9, 492], [4.25, 492], [4.8, 560]]);
      const rp = a < 1.2 ? 'guard' : a < 4.25 ? (strike(a, 1.2, 2.7, 3.0, 3.01) || kf(a, [[3.0, 'follow'], [3.2, { base: 'follow', lean: 30, head: 14 }]])) : hitPose(a, 4.25, 1.0);
      const tip = CAST.tip('rook', { x: rx, y: FLOOR, s: S, face: -1, pose: 'strike' });
      rook(g, rx, rp, { flash: a > 4.25 ? 1 - ph(a, 4.25, 4.6) : 0 });
      pip(g, px, pp);
      // the gap the swing fell short by
      if (a > 2.8 && a < 3.6) { const k = 1 - ph(a, 3.3, 3.6); g.save(); g.globalAlpha = k; g.strokeStyle = C.muted; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(290, FLOOR - 78); g.lineTo(tip.x - 6, FLOOR - 78); g.stroke(); g.setLineDash([]); text(g, 'out of reach', (290 + tip.x) / 2, FLOOR - 64, { size: 12.5, w: 700, col: C.muted }); g.restore(); }
      pop(g, 'miss', tip.x + 44, FLOOR - 186, C.muted, a, 2.75, { size: 22, life: 1.0 });
      if (a >= 3.05 && a < 4.25) { const k = ph(a, 3.05, 3.25); badge(g, 'padlock', rx + 4, FLOOR - 222, 22, '#7c2420', k); note(g, 'recovering', rx + 4, FLOOR - 190, '#7c2420', a, 3.05, 4.3, { size: 13 }); }
      spark(g, 468, FLOOR - 100, a, 4.25, '#ffd45e', 44);
      pop(g, 'PUNISHED', 470, FLOOR - 208, ROWS[0][3], a, 4.25, { size: 26, life: 1.8 });
    },
  });

  /* ---------- 4. Mitigate: defensive, before ---------- */
  make('f-mitigate', {
    cell: 3, dur: 8, bands: [3.0, 4.8], key: 1.3,
    rook: [[3.0, 4.2, 'wind-up'], [4.2, 4.5, 'hit', 'hit'], [4.5, 5.3, 'recovery', 'stuck']],
    pip: [[1.3, 5.3, 'guard raised early and held', 'key']],
    caps: [[0, 'Rook is about to attack.'], [1.2, 'Pip raises his guard early. No timing needed.'], [3.0, 'The swing comes…'], [4.3, '…and the guard absorbs most of it.'], [5.5, 'Mitigate: defense set up before the attack.']],
    stage(g, a) {
      const PX = 330, RX = 462;
      const pp = kf(a, [[1.2, 'idle'], [1.55, 'block'], [5.5, 'block'], [6.0, 'idle']]);
      const rp = strike(a, 3.0, 4.2, 4.5, 5.3) || 'guard';
      const up = Math.min(ph(a, 1.3, 1.6), 1 - ph(a, 5.5, 5.9));
      hp(g, PX, kv(a, [[4.3, 1], [4.5, .9]]), { ghost: a > 4.3 ? 1 : null });
      rook(g, RX, rp);
      pip(g, PX, pp, { x: PX - (a > 4.3 ? 6 * (1 - ph(a, 4.3, 4.7)) : 0) });
      if (up > 0) { g.save(); g.globalAlpha = up; g.strokeStyle = '#3f7fe0'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(PX + 4, FLOOR - 92, 62 + (a > 4.3 ? 5 * (1 - ph(a, 4.3, 4.6)) : 0), -1.0, .95); g.stroke(); g.strokeStyle = 'rgba(111,147,224,.35)'; g.lineWidth = 16; g.stroke(); g.restore(); }
      pop(g, 'guard up', PX - 120, FLOOR - 150, ROWS[1][3], a, 1.35, { size: 20, life: 1.5 });
      spark(g, PX + 66, FLOOR - 104, a, 4.3, '#9cc3ff', 34);
      pop(g, '−1', PX - 84, FLOOR - 196, ROWS[1][3], a, 4.3, { size: 26, life: 1.6 });
      note(g, 'unguarded: −6', PX + 128, FLOOR - 206, C.muted, a, 4.9, 7.0, { size: 13 });
    },
  });

  /* ---------- 5. Reflex: defensive, during ---------- */
  make('f-reflex', {
    cell: 4, dur: 8, bands: [1.2, 4.8], key: 3.5,
    rook: [[1.2, 2.4, 'wind-up'], [2.4, 3.5, 'swing in flight', 'hit'], [3.5, 4.8, 'staggered', 'stuck']],
    pip: [[3.34, 3.66, 'parry window', 'window']],
    caps: [[0, 'Pip waits. No guard is up.'], [1.2, 'Rook swings.'], [2.4, 'The blade is already in flight…'], [3.5, '…and Pip parries inside a tiny window.'], [5.0, 'Reflex: defense timed during the attack.']],
    stage(g, a) {
      const PX = 330;
      const rx = kv(a, [[3.5, 462], [4.0, 520]]);
      const rp = a < 1.2 ? 'guard' : a < 2.4 ? CAST.mix('guard', 'windup', ease(ph(a, 1.2, 2.2))) : a < 3.5 ? CAST.mix('windup', 'strike', ph(a, 2.4, 3.5) * .8) : kf(a, [[3.5, { mix: ['windup', 'strike', .8] }], [3.68, 'hit'], [4.9, 'hit'], [5.5, 'guard']]);
      const pp = kf(a, [[3.36, 'guard'], [3.5, { base: 'block', lean: 6, w: 150 }], [4.3, { base: 'block', lean: 6, w: 150 }], [4.8, 'guard']]);
      const slow = a >= 2.4 && a < 3.9;
      if (slow) { const k = Math.min(ph(a, 2.4, 2.6), 1 - ph(a, 3.7, 3.9)); g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(21,32,68,.07)'; g.fillRect(SX0, 126, SW, 292); badge(g, 'stopwatch', 62, 162, 20, C.navy); text(g, 'slow motion', 86, 162, { align: 'left', size: 14, w: 800, col: C.navy }); g.restore(); }
      // the blade's path so far
      if (a >= 2.4 && a < 3.5) { const P0 = { x: rx, y: FLOOR, s: S, face: -1 }; g.save(); g.strokeStyle = 'rgba(208,87,79,.45)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); for (let k = 0; k <= 10; k++) { const p = CAST.tip('rook', { ...P0, pose: CAST.mix('windup', 'strike', ph(a, 2.4, 3.5) * .8 * k / 10) }); k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke(); g.restore(); }
      rook(g, rx, rp);
      pip(g, PX, pp, { flash: a > 3.5 ? .7 * (1 - ph(a, 3.5, 3.8)) : 0 });
      spark(g, PX + 62, FLOOR - 128, a, 3.5, '#ffd45e', 50);
      pop(g, 'PARRY', PX + 30, FLOOR - 214, ROWS[1][3], a, 3.5, { size: 28, life: 1.8 });
    },
  });

  /* ---------- 6. React: defensive, post ---------- */
  make('f-react', {
    cell: 5, dur: 8, bands: [1.0, 3.0], key: 3.8,
    rook: [[1.0, 2.2, 'wind-up'], [2.2, 2.5, 'hit', 'hit'], [2.5, 3.2, 'recovery', 'stuck']],
    pip: [[2.3, 3.0, 'is hit'], [3.8, 5.3, 'heal', 'key']],
    caps: [[0, 'Rook attacks.'], [2.3, 'The hit lands. Pip loses health.'], [3.7, 'Afterwards, Pip answers the damage: he heals.'], [5.6, 'React: defense after the attack has landed.']],
    stage(g, a) {
      const RX = 462, px = kv(a, [[2.3, 330], [2.7, 286]]);
      const rp = strike(a, 1.0, 2.2, 2.5, 3.2) || 'guard';
      const drink = { base: 'idle', lean: -8, head: -16, fa: [110, 190], w: 250 };
      const pp = a < 2.3 ? 'guard' : a < 3.7 ? hitPose(a, 2.3, .8) : kf(a, [[3.7, 'guard'], [4.1, drink], [5.0, drink], [5.5, 'guard']]);
      const h = a < 3.9 ? kv(a, [[2.3, 1], [2.55, .4]]) : kv(a, [[4.2, .4], [5.2, .9]]);
      hp(g, px, h, { ghost: a > 2.3 && a < 4.2 ? 1 - .6 * ph(a, 2.9, 3.6) : a >= 4.2 ? kv(a, [[4.2, .4], [4.5, .9]]) : null, ghostCol: a >= 4.2 ? '#bfe8c8' : '#f4b5ae' });
      rook(g, RX, rp);
      pip(g, px, pp, { flash: a > 2.3 ? 1 - ph(a, 2.3, 2.6) : 0, tint: a > 4.2 && a < 5.4 ? '#4fc48a' : undefined });
      spark(g, 356, FLOOR - 104, a, 2.3, '#ff9d8a', 40);
      pop(g, '−6', 216, FLOOR - 196, C.redDk, a, 2.3, { size: 26, life: 1.3 });
      if (a > 3.8 && a < 5.5) {
        const k = Math.min(ph(a, 3.8, 4.1), 1 - ph(a, 5.2, 5.5));
        badge(g, 'round-potion', px + 62, FLOOR - 150, 26, '#1a8a4c', k);
        g.save(); g.fillStyle = '#2fae63'; for (let i = 0; i < 5; i++) { const t = ((a - 4.1) * .9 + i * .2) % 1; if (a < 4.1) continue; g.globalAlpha = k * (1 - t); const x = px - 30 + i * 15, y = FLOOR - 40 - t * 130; g.fillRect(x - 2, y - 7, 4, 14); g.fillRect(x - 7, y - 2, 14, 4); } g.restore();
      }
      pop(g, '+5', px - 84, FLOOR - 196, '#1a8a4c', a, 4.4, { size: 26, life: 1.6 });
    },
  });

  /* ---------- 7. Setup: predictive, before ---------- */
  function trap(g, x, open, a = 1) {
    g.save(); g.globalAlpha *= a; g.translate(x, FLOOR); g.strokeStyle = '#4a4f63'; g.fillStyle = '#8b8fa8'; g.lineWidth = 2.5; g.lineJoin = 'round';
    [-1, 1].forEach(sd => { g.save(); g.scale(sd, 1); g.rotate(-open * 1.25); g.beginPath(); g.moveTo(0, 0); g.lineTo(30, 0); for (let i = 5; i >= 0; i--) { g.lineTo(i * 5 + 2.5, -9); g.lineTo(i * 5, 0); } g.closePath(); g.fill(); g.stroke(); g.restore(); });
    g.fillStyle = '#4a4f63'; g.beginPath(); g.roundRect(-9, -3, 18, 6, 3); g.fill(); g.restore();
  }
  make('f-setup', {
    cell: 6, dur: 8.5, bands: [4.2, 6.2], key: 2.3,
    rook: [[4.2, 5.2, 'charges in'], [5.2, 7.6, 'trapped', 'stuck']],
    pip: [[1.5, 2.9, 'places a trap', 'key']],
    caps: [[0, 'Pip predicts: “Rook will charge straight in.”'], [1.5, 'So before the exchange, he places a trap.'], [4.2, 'Rook charges…'], [5.2, '…into something prepared long before.'], [6.4, 'Setup: prediction, prepared before the exchange.']],
    stage(g, a) {
      const TXP = 470;
      const px = kv(a, [[1.5, 290], [2.1, 420], [2.9, 420], [3.6, 290]]);
      const pp = a < 1.5 ? 'guard' : a < 2.1 ? CAST.cycle('walk', (a - 1.5) * 2.2) : a < 2.9 ? kf(a, [[2.1, 'guard'], [2.3, 'crouch'], [2.7, 'crouch'], [2.9, 'guard']]) : a < 3.6 ? CAST.cycle('walk', (a - 2.9) * 2.2) : 'guard';
      const rx = kv(a, [[4.2, 716], [5.2, TXP + 6]]);
      const rp = a < 4.2 ? 'idle' : a < 5.2 ? CAST.cycle('run', (a - 4.2) * 2.5) : kf(a, [[5.2, 'run1'], [5.35, { base: 'hit', lean: 24, head: 16 }]]);
      // the predicted path
      if (a > .5 && a < 5.2) { const k = Math.min(ph(a, .5, .9), 1 - ph(a, 4.9, 5.2)); g.save(); g.globalAlpha = k * .9; CK.arrow(g, [690, FLOOR + 20], [340, FLOOR + 20], ROWS[2][3], 3, { dash: [8, 6] }); text(g, 'predicted path', 560, FLOOR + 9, { size: 12, w: 700, col: ROWS[2][3], stroke: 3 }); g.restore(); }
      think(g, 300, 170, 264, ['Rook will charge', 'straight in.'], a, .25, 3.9);
      if (a > 2.3) trap(g, TXP, a < 5.2 ? 0 : ease(ph(a, 5.2, 5.3)), ph(a, 2.3, 2.5));
      note(g, 'trap', TXP, FLOOR - 30, ROWS[2][3], a, 3.3, 4.6, { size: 13 });
      rook(g, rx, rp, { flash: a > 5.2 ? 1 - ph(a, 5.2, 5.5) : 0 });
      pip(g, px, pp, { face: a > 2.9 && a < 3.6 ? -1 : 1 });
      if (a > 5.2) trap(g, TXP, ease(ph(a, 5.2, 5.3)));
      spark(g, TXP, FLOOR - 14, a, 5.2, '#ffd45e', 36);
      pop(g, 'SNAP', TXP + 10, FLOOR - 210, ROWS[2][3], a, 5.2, { size: 28, life: 1.8 });
      note(g, 'placed 3 seconds earlier', TXP + 150, FLOOR - 60, ROWS[2][3], a, 5.6, 8.4, { size: 13 });
    },
  });

  /* ---------- 8. Counterplay: predictive, during ---------- */
  make('f-counterplay', {
    cell: 7, dur: 9, bands: [3.5, 6.0], key: 4.5,
    rook: [[.5, 1.5, 'block'], [1.9, 2.9, 'block'], [3.8, 4.5, 'block'], [4.5, 6.0, 'thrown', 'stuck']],
    pip: [[.6, 1.3, 'hit'], [2.0, 2.7, 'hit'], [4.0, 4.9, 'throw', 'key']],
    caps: [[0, 'Pip attacks. Rook blocks.'], [2.0, 'Again, Rook blocks. A pattern.'], [2.9, 'Pip reads it: “He will block the next one too.”'], [3.8, 'Rook blocks, as predicted. Pip throws instead.'], [6.1, 'Counterplay: a read that pays off during the exchange.']],
    stage(g, a) {
      const RX = 462;
      const px = kv(a, [[4.0, 330], [4.4, 392], [5.2, 392], [5.8, 330]]);
      const grab = { base: 'point', lean: 14, fa: [96, 92], ba: [80, 96] };
      const pp = strike(a, .6, .82, 1.0, 1.4) || strike(a, 2.0, 2.22, 2.4, 2.8) || (a < 4.0 ? 'guard' : kf(a, [[4.0, 'guard'], [4.4, grab], [4.5, grab], [4.75, 'follow'], [5.2, 'follow'], [5.8, 'guard']]));
      const blk = Math.max(Math.min(ph(a, .45, .6), 1 - ph(a, 1.4, 1.6)), Math.min(ph(a, 1.85, 2.0), 1 - ph(a, 2.8, 3.0)), a < 4.5 ? ph(a, 3.8, 3.95) : 0);
      const thrown = a >= 4.5, k = ph(a, 4.5, 5.3);
      const rx = thrown ? lerp(RX, 650, k) : RX;
      const rp = thrown ? (k < 1 ? { base: 'tuck', lift: Math.sin(k * Math.PI) * 62 + 10, spin: -90 - 270 * k } : 'down') : CAST.mix('guard', 'block', blk);
      // Rook's habit: one shield per block
      panel(g, 544, 138, 222, 62, { fill: 'rgba(255,253,246,.9)' });
      text(g, 'Rook’s habit so far', 655, 153, { size: 12.5, w: 700, col: C.muted, display: true });
      [[.9, 0], [2.3, 1], [3.95, 2]].forEach(([t0, j]) => { const on = a >= t0, x = 600 + j * 55; badge(g, 'checked-shield', x, 179, 15, on ? '#7c2420' : '#cfc7b3', on ? 1 : .6); if (on && j === 2) text(g, 'as predicted', 655, 212, { size: 13, w: 800, col: ROWS[2][3], a: 1 - ph(a, 5.6, 6.0), stroke: 4 }); });
      think(g, 250, 170, 250, ['He will block', 'the next one too.'], a, 2.9, 4.3);
      rook(g, rx, rp);
      pip(g, px, pp);
      spark(g, 410, FLOOR - 118, a, .9, '#c9d3e6', 26); spark(g, 410, FLOOR - 118, a, 2.3, '#c9d3e6', 26);
      pop(g, 'blocked', 430, FLOOR - 214, '#7c2420', a, .9, { size: 18, life: 1.0 }); pop(g, 'blocked', 430, FLOOR - 214, '#7c2420', a, 2.3, { size: 18, life: 1.0 });
      pop(g, 'THROW beats block', 300, FLOOR - 212, ROWS[2][3], a, 4.5, { size: 24, life: 2.0 });
    },
  });

  /* ---------- 9. Response: predictive, post ---------- */
  make('f-response', {
    cell: 8, dur: 9.5, bands: [.8, 3.4], next: 6.6, key: 4.8,
    rook: [[.8, 3.4, 'blocks everything'], [6.8, 7.25, ''], [7.25, 8.3, 'guard broken', 'stuck']],
    pip: [[1.0, 1.7, 'hit'], [2.2, 2.9, 'hit'], [4.2, 5.4, 'swaps weapon', 'key'], [6.9, 7.7, 'hit']],
    caps: [[0, 'Pip’s sword keeps bouncing off Rook’s guard.'], [3.4, 'The exchange is over. Pip saw how Rook plays…'], [4.2, '…and changes his own state: sword out, axe in.'], [6.6, 'Next exchange: the axe breaks the guard.'], [8.1, 'Response: after the exchange, change yourself to fit what you saw.']],
    stage(g, a) {
      const px = kv(a, [[3.4, 330], [3.9, 280], [6.6, 280], [6.9, 330]]);
      const swapPose = { base: 'idle', fa: [50, 100], w: 112, lean: -4 };
      const pp = strike(a, 1.0, 1.22, 1.4, 1.8) || strike(a, 2.2, 2.42, 2.6, 3.0) || strike(a, 6.9, 7.12, 7.3, 7.9) || (a > 4.2 && a < 5.6 ? kf(a, [[4.2, 'guard'], [4.5, swapPose], [5.3, swapPose], [5.6, 'guard']]) : 'guard');
      const axe = a >= 4.8;
      const blk = a < 7.25 ? Math.max(Math.min(ph(a, .8, 1.0), 1 - ph(a, 3.3, 3.6)), ph(a, 6.75, 6.9)) : 0;
      const rx = kv(a, [[7.25, 462], [7.7, 520]]);
      const rp = a >= 7.25 ? hitPose(a, 7.25, 1.2) : CAST.mix('guard', 'block', blk);
      rook(g, rx, rp, { flash: a > 7.25 ? 1 - ph(a, 7.25, 7.6) : 0 });
      pip(g, px, pp, { weapon: axe ? 'axe' : 'sword', flash: a > 4.8 ? .8 * (1 - ph(a, 4.8, 5.2)) : 0 });
      spark(g, 410, FLOOR - 118, a, 1.28, '#c9d3e6', 26); spark(g, 410, FLOOR - 118, a, 2.48, '#c9d3e6', 26);
      pop(g, 'blocked: 0', 430, FLOOR - 214, '#7c2420', a, 1.28, { size: 18, life: 1.0 }); pop(g, 'blocked: 0', 430, FLOOR - 214, '#7c2420', a, 2.48, { size: 18, life: 1.0 });
      think(g, 230, 166, 262, ['The sword cannot', 'get through his guard.'], a, 3.3, 4.5);
      // the swap: sword out, axe in
      if (a > 4.3 && a < 6.5) {
        const k = Math.min(ph(a, 4.3, 4.6), 1 - ph(a, 6.2, 6.5)), y = 166, x = 250, done = a >= 4.8;
        g.save(); g.globalAlpha = k; panel(g, x - 118, y - 32, 236, 88, { fill: 'rgba(255,253,246,.95)', edge: ROWS[2][3] });
        badge(g, 'broadsword', x - 70, y, 24, done ? '#a9a391' : C.navy); CK.arrow(g, [x - 36, y], [x + 36, y], ROWS[2][3], 4); badge(g, 'battle-axe', x + 70, y, 24, done ? ROWS[2][3] : '#a9a391');
        if (done) { g.strokeStyle = '#a9a391'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 90, y + 18); g.lineTo(x - 50, y - 18); g.stroke(); }
        text(g, done ? 'new state: axe' : 'swapping…', x, y + 40, { size: 15, w: 800, col: done ? ROWS[2][3] : C.muted });
        g.restore();
      }
      spark(g, 410, FLOOR - 118, a, 7.25, '#ffd45e', 46);
      if (a > 7.25 && a < 8.6) badge(g, 'broken-shield', rx + 84, FLOOR - 150, 24, '#7c2420', Math.min(ph(a, 7.25, 7.4), 1 - ph(a, 8.3, 8.6)));
      pop(g, 'GUARD BROKEN', 440, FLOOR - 212, ROWS[2][3], a, 7.25, { size: 24, life: 1.8 });
    },
  });
})();
