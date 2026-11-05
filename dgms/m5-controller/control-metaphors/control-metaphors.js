/* Controls as metaphor (Module 5, Part 3: mapping gameplay through metaphor, slides 143-155).
   One controller, five metaphors. Pick one and the buttons relabel with the game that used it: left and right hand
   (Dark Souls, Skyrim), horizontal and vertical (Soulcalibur), body parts (the first Assassin's Creed), light and heavy
   (God of War, Ninja Gaiden), and numbered action slots on the keyboard (World of Warcraft, from EverQuest). Beside the
   controller, a small figure shows what the metaphor maps onto. The walk-through presses each mapped button in turn,
   as a pure function of time. Original art; WoW icons in img/ (see img/SOURCES.txt). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease, TAU } = TD;
  const W = 1040, H = 585, PY = 40;
  const G = { L: '#2ea3dc', R: '#e0a92d', H: '#2ea3dc', V: '#e0a92d', K: '#2fae63', D: '#8a4fd6', head: '#8a4fd6', wpn: '#e5322d', empty: '#2ea3dc', legs: '#2fae63', light: '#2ea3dc', heavy: '#e5322d', slot: '#e0a92d' };

  // slot geometry, same layout as the one-thumb page
  const PAD = {
    L2: { r: [118, 82, 104, 28], tag: [170, 44] }, L1: { r: [118, 116, 104, 22], tag: [68, 127] },
    R2: { r: [418, 82, 104, 28], tag: [470, 44] }, R1: { r: [418, 116, 104, 22], tag: [572, 127] },
    LS: { c: [200, 232, 36] }, DP: { c: [262, 318, 30] }, RS: { c: [380, 318, 36] },
    TRI: { c: [446, 194, 19], tag: [548, 166] }, SQ: { c: [408, 232, 19], tag: [300, 186] }, CIR: { c: [484, 232, 19], tag: [580, 228] }, X: { c: [446, 270, 19], tag: [560, 318] },
  };
  const PS = { L1: 'L1', L2: 'L2', R1: 'R1', R2: 'R2' }, XB = { L1: 'LB', L2: 'LT', R1: 'RB', R2: 'RT' };
  const XFACE = { TRI: ['Y', '#e0a92d'], SQ: ['X', '#3a6fd8'], CIR: ['B', '#e5322d'], X: ['A', '#2fae63'] };

  const META = {
    hands: { name: 'Left / right hand', fig: 'hands', games: [
      { name: 'Dark Souls', pf: 'ps', map: [['L1', 'Left hand: block', 'L'], ['L2', 'Left hand: parry', 'L'], ['R1', 'Right hand: attack', 'R'], ['R2', 'Right hand: heavy', 'R']],
        note: 'Dark Souls: the left shoulder buttons use whatever is in the left hand, the right ones whatever is in the right hand. Swap a shield for a torch and the same buttons still make sense.' },
      { name: 'Skyrim', pf: 'xb', map: [['L2', 'Left hand', 'L'], ['R2', 'Right hand', 'R']],
        note: 'Skyrim: one trigger per hand. Equip a sword, a spell or a shield in either hand, and the trigger on that side uses it.' }] },
    planes: { name: 'Horizontal / vertical', fig: 'planes', games: [
      { name: 'Soulcalibur', pf: 'ps', map: [['SQ', 'A: horizontal', 'H'], ['TRI', 'B: vertical', 'V'], ['CIR', 'K: kick', 'K'], ['X', 'G: guard', 'D']],
        note: 'Soulcalibur: horizontal attacks catch an opponent who steps to the side, and vertical attacks can be stepped around. The buttons name the plane of the swing, not the move.' }] },
    body: { name: 'Body parts', fig: 'body', games: [
      { name: 'Assassin’s Creed (2007)', pf: 'xb', map: [['TRI', 'Head', 'head'], ['SQ', 'Weapon hand', 'wpn'], ['CIR', 'Empty hand', 'empty'], ['X', 'Legs', 'legs']],
        note: 'The first Assassin’s Creed mapped the face buttons onto Altaïr’s body: head, weapon hand, empty hand and legs, so each button changed meaning with the context. Later games dropped it for familiar verbs.' }] },
    weight: { name: 'Light / heavy', fig: 'weight', games: [
      { name: 'God of War', pf: 'ps', map: [['SQ', 'Light attack', 'light'], ['TRI', 'Heavy attack', 'heavy']],
        note: 'God of War: square is quick and light, triangle is slow and heavy. Combos are strings of the two.' },
      { name: 'Ninja Gaiden', pf: 'xb', map: [['SQ', 'Fast attack', 'light'], ['TRI', 'Strong attack', 'heavy']],
        note: 'Ninja Gaiden: the same metaphor on the same two buttons, which is part of why it feels familiar to an action player.' }] },
    slots: { name: 'Numbered slots', fig: 'slots', games: [
      { name: 'World of Warcraft', pf: 'kb', map: [],
        note: 'World of Warcraft took its ten action slots on 1 to 0 from EverQuest. The metaphor is the action bar itself: any ability can go in any slot, and the keys follow.' }] },
  };
  const ORDER = ['hands', 'planes', 'body', 'weight', 'slots'];
  const ICONS = ['spell_shadow_shadowbolt', 'spell_fire_immolation', 'spell_fire_fireball', 'spell_nature_lightning', 'spell_holy_flashheal', 'inv_potion_54', 'ability_warrior_rampage', 'spell_nature_timestop', 'spell_fire_flamebolt', 'spell_shadow_rainoffire'];
  const img = {}; ICONS.forEach(n => { const i = new Image(); i.src = `img/${n}.jpg`; img[n] = i; });

  const text = (g, s, x, y, { size = 14, col = C.ink, w = 600, align = 'left', font = 'Jost', base = 'alphabetic' } = {}) => { g.font = `${w} ${size}px ${font}, Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); };
  const panel = (g, x, y, w, h, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); };
  function wrap(g, s, x, y, maxW, lh, o = {}) {
    g.font = `${o.w || 500} ${o.size || 14}px Jost, sans-serif`; const words = s.split(' '); let line = '', yy = y;
    words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { text(g, line, x, yy, o); line = wd; yy += lh; } else line = t; });
    if (line) text(g, line, x, yy, o); return yy;
  }
  function glyph(g, k, x, y, col) {
    g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath();
    if (k === 'TRI') { g.moveTo(x, y - 8); g.lineTo(x + 8, y + 6); g.lineTo(x - 8, y + 6); g.closePath(); }
    if (k === 'SQ') g.rect(x - 7, y - 7, 14, 14);
    if (k === 'CIR') g.arc(x, y, 8, 0, TAU);
    if (k === 'X') { g.moveTo(x - 7, y - 7); g.lineTo(x + 7, y + 7); g.moveTo(x + 7, y - 7); g.lineTo(x - 7, y + 7); }
    g.stroke();
  }

  /* ---------- the controller (or the keyboard row for numbered slots) ---------- */
  function drawPad(g, game, press) {
    const used = {}; game.map.forEach(([id, , grp], i) => { used[id] = { grp, i }; });
    g.save(); g.translate(0, PY);
    g.fillStyle = '#c9cde6'; g.strokeStyle = C.navy; g.lineWidth = 3;
    g.beginPath(); g.moveTo(150, 140); g.bezierCurveTo(240, 128, 400, 128, 490, 140); g.bezierCurveTo(560, 150, 600, 260, 610, 360);
    g.bezierCurveTo(620, 450, 540, 470, 500, 420); g.bezierCurveTo(470, 380, 440, 360, 320, 360); g.bezierCurveTo(200, 360, 170, 380, 140, 420);
    g.bezierCurveTo(100, 470, 20, 450, 30, 360); g.bezierCurveTo(40, 260, 80, 150, 150, 140); g.closePath(); g.fill(); g.stroke();
    const names = game.pf === 'xb' ? XB : PS;
    Object.entries(PAD).forEach(([id, s]) => {
      const u = used[id], p = u && press(u.i), col = u ? G[u.grp] : null, dy = p ? 3 * p : 0;
      if (s.r) {
        g.fillStyle = u ? col : '#e6e8f4'; g.globalAlpha = u ? .35 + .65 * (p || 0) : 1; g.beginPath(); g.roundRect(s.r[0], s.r[1] + dy, s.r[2], s.r[3], 9); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = u ? col : C.navy; g.lineWidth = u ? 3.5 : 2.5; g.stroke();
        text(g, names[id], s.r[0] + s.r[2] / 2, s.r[1] + s.r[3] / 2 + 1 + dy, { size: 13, w: 800, align: 'center', base: 'middle', col: C.navy });
        return;
      }
      const [x, y, r] = s.c;
      if (id === 'DP') { g.fillStyle = '#eef0f8'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.rect(x - 10, y - r, 20, 2 * r); g.rect(x - r, y - 10, 2 * r, 20); g.fill(); return; }
      if (id === 'LS' || id === 'RS') { g.fillStyle = '#5d618c'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); return; }
      g.fillStyle = u ? col : '#eef0f8'; g.globalAlpha = u ? .3 + .7 * (p || 0) : 1; g.beginPath(); g.arc(x, y + dy, r + (p ? 3 * p : 0), 0, TAU); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = u ? col : C.navy; g.lineWidth = u ? 3.5 : 2.5; g.stroke();
      if (game.pf === 'xb') text(g, XFACE[id][0], x, y + dy + 1, { size: 16, w: 800, align: 'center', base: 'middle', col: XFACE[id][1] });
      else glyph(g, id, x, y + dy, { TRI: '#2fae63', SQ: '#d04fa0', CIR: '#e5322d', X: '#3a6fd8' }[id]);
    });
    // callouts
    game.map.forEach(([id, label, grp], i) => {
      const s = PAD[id], c = s.c ? { x: s.c[0], y: s.c[1] } : { x: s.r[0] + s.r[2] / 2, y: s.r[1] + s.r[3] / 2 }, tg = s.tag, p = press(i) || 0, col = G[grp];
      g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(tg[0], tg[1]); g.stroke();
      T.label(label, tg[0], tg[1], 'center', p > .3 ? '#fff' : col, 15, p > .3 ? col : 'rgba(255,252,244,.96)');
    });
    g.restore();
    text(g, game.pf === 'xb' ? 'Xbox layout' : 'PlayStation layout', 320, 520, { size: 13, w: 700, align: 'center', col: C.muted });
  }
  function drawKeys(g, press, t) {
    const x0 = 36, y0 = 200, k = 54;
    text(g, 'The number row is the action bar', 320, 150, { size: 15, w: 700, align: 'center' });
    for (let i = 0; i < 10; i++) {
      const x = x0 + i * (k + 3), p = press(i) || 0;
      g.fillStyle = p > .2 ? '#fde9b8' : '#eef0f8'; g.strokeStyle = p > .2 ? C.gold : C.navy; g.lineWidth = p > .2 ? 3.5 : 2;
      g.beginPath(); g.roundRect(x, y0 + 3 * p, k - 4, k - 4, 8); g.fill(); g.stroke();
      text(g, String((i + 1) % 10), x + (k - 4) / 2, y0 + 26 + 3 * p, { size: 18, w: 800, align: 'center', base: 'middle', col: C.navy });
      // the slot it fires
      const ic = img[ICONS[i]], sy = y0 + 110;
      g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 25, y0 + k); g.lineTo(x + 25, sy - 4); g.stroke();
      g.fillStyle = '#262c6a'; g.fillRect(x - 2, sy - 2, k, k);
      if (ic.complete && ic.naturalWidth) { g.drawImage(ic, x + 1, sy + 1, k - 6, k - 6); }
      if (p > 0) { g.fillStyle = `rgba(255,255,255,${.5 * p})`; g.fillRect(x + 1, sy + 1, k - 6, k - 6); g.strokeStyle = C.gold; g.lineWidth = 3; g.strokeRect(x - 1, sy - 1, k - 2, k - 2); }
    }
    text(g, 'Any ability in any slot: the key is a place, not a verb.', 320, 410, { size: 14, w: 600, align: 'center', col: C.muted });
  }

  /* ---------- what the metaphor maps onto ---------- */
  function figure(g, kind, game, press, t) {
    const cx = 846, gy = 330;
    const P = i => press(i) || 0;
    const lw = (x1, y1, x2, y2, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const body = '#3d4270';
    if (kind === 'slots') {
      // a WoW-style bar seen in the game's UI
      text(g, 'Action bar', cx, 80, { size: 13, w: 700, align: 'center', col: C.muted });
      for (let i = 0; i < 10; i++) { const x = 676 + i * 34, y = 96, ic = img[ICONS[i]]; g.fillStyle = '#262c6a'; g.fillRect(x, y, 32, 32); if (ic.complete && ic.naturalWidth) g.drawImage(ic, x + 2, y + 2, 28, 28); text(g, String((i + 1) % 10), x + 4, y + 12, { size: 10, w: 800, col: '#fff' }); if (P(i) > 0) { g.strokeStyle = C.gold; g.lineWidth = 3; g.strokeRect(x, y, 32, 32); } }
      text(g, 'EverQuest', 760, 210, { size: 18, w: 800, align: 'center', font: 'Montserrat', col: C.muted }); text(g, '→', 846, 210, { size: 22, w: 800, align: 'center', col: C.gold }); text(g, 'WoW', 930, 210, { size: 18, w: 800, align: 'center', font: 'Montserrat' });
      text(g, 'ten slots on 1 to 0', cx, 236, { size: 13, w: 600, align: 'center', col: C.muted });
      return;
    }
    if (kind === 'weight') {
      const a = P(0), b = P(1);
      text(g, 'Light', 760, 72, { size: 15, w: 800, align: 'center', col: G.light }); text(g, 'Heavy', 932, 72, { size: 15, w: 800, align: 'center', col: G.heavy });
      // a dagger and a hammer, each swinging when its button is pressed
      g.save(); g.translate(760, 190); g.rotate(-.6 + a * 1.4); lw(0, 30, 0, -60, 6, '#8a8fa8'); lw(-14, 30, 14, 30, 5, C.gold); lw(0, 30, 0, 52, 8, body); g.restore();
      g.save(); g.translate(932, 230); g.rotate(-.9 + ease(b) * 1.5); lw(0, 30, 0, -96, 8, '#7a5a3a'); g.fillStyle = '#62688a'; g.fillRect(-34, -126, 68, 40); g.restore();
      // timing bars: three quick swings in the time of one heavy one
      const bx = 680, by = 290;
      text(g, 'Same second of play', bx, by - 8, { size: 12, w: 700, col: C.muted });
      for (let i = 0; i < 3; i++) { g.fillStyle = G.light; g.beginPath(); g.roundRect(bx + i * 112, by, 100, 14, 6); g.fill(); }
      g.fillStyle = G.heavy; g.beginPath(); g.roundRect(bx, by + 22, 330, 14, 6); g.fill();
      return;
    }
    // a figure seen from behind, as the camera sees it
    const swing = kind === 'planes' ? t : 0;
    const head = { x: cx, y: 110 }, sh = { y: 150 }, hip = { y: 240 };
    const grp = {}; game.map.forEach(([, , gp], i) => { grp[gp] = P(i); });
    const col = (gp, base = body) => grp[gp] !== undefined ? G[gp] : base;
    const glow = gp => grp[gp] > 0 ? grp[gp] : 0;
    // legs
    const legC = kind === 'body' ? col('legs') : body, lg = kind === 'body' ? glow('legs') : 0;
    lw(cx - 16, hip.y, cx - 30 - lg * 16, gy, 15, legC); lw(cx + 16, hip.y, cx + 30 + lg * 6, gy, 15, legC);
    lw(cx, sh.y, cx, hip.y, 40, body);
    // arms: left hand on the left of the screen (seen from behind)
    const leftC = kind === 'hands' ? col('L') : kind === 'body' ? col('empty') : body, rightC = kind === 'hands' ? col('R') : kind === 'body' ? col('wpn') : body;
    const lg2 = kind === 'hands' ? glow('L') : kind === 'body' ? glow('empty') : 0, rg = kind === 'hands' ? glow('R') : kind === 'body' ? glow('wpn') : 0;
    const lh = { x: cx - 62 - lg2 * 12, y: 210 - lg2 * 30 }, rh = { x: cx + 62 + rg * 20, y: 210 - rg * 60 };
    lw(cx - 22, sh.y + 4, lh.x, lh.y, 12, leftC); lw(cx + 22, sh.y + 4, rh.x, rh.y, 12, rightC);
    // shield in the left hand, sword in the right
    if (kind === 'hands' || kind === 'body') {
      if (kind === 'hands') { g.fillStyle = col('L'); g.globalAlpha = .9; g.beginPath(); g.roundRect(lh.x - 26, lh.y - 30, 34, 56, [6, 6, 18, 18]); g.fill(); g.globalAlpha = 1; }
      lw(rh.x, rh.y, rh.x + 10 + rg * 30, rh.y - 80 + rg * 20, 6, '#8a8fa8');
    }
    g.fillStyle = kind === 'body' ? col('head') : body; g.beginPath(); g.arc(head.x, head.y, 24 + (kind === 'body' ? glow('head') * 4 : 0), 0, TAU); g.fill();
    if (kind === 'body' && glow('head') > 0) { g.save(); g.globalAlpha = glow('head'); g.strokeStyle = G.head; g.lineWidth = 3; g.beginPath(); g.arc(head.x, head.y, 40, 0, TAU); g.stroke(); g.restore(); }
    lw(cx - 70, gy + 4, cx + 70, gy + 4, 3, '#cdbf9f');
    if (kind === 'hands') { text(g, 'left hand', cx - 120, 290, { size: 14, w: 800, align: 'center', col: G.L }); text(g, 'right hand', cx + 120, 290, { size: 14, w: 800, align: 'center', col: G.R }); }
    if (kind === 'body') [['head', 'head', cx + 70, 104], ['empty', 'empty hand', cx - 120, 230], ['wpn', 'weapon hand', cx + 124, 230], ['legs', 'legs', cx + 76, 312]].forEach(([gp, l, x, y]) => text(g, l, x, y, { size: 14, w: 800, align: 'center', col: G[gp] }));
    if (kind === 'planes') {
      // the two planes of attack, drawn around the figure
      const h = P(0), v = P(1);
      g.save(); g.strokeStyle = G.H; g.lineWidth = 4 + h * 4; g.globalAlpha = .45 + .55 * h; g.beginPath(); g.ellipse(cx, 200, 130, 30, 0, Math.PI * .05, Math.PI * (.05 + .9 * (h || 1))); g.stroke(); g.restore();
      g.save(); g.strokeStyle = G.V; g.lineWidth = 4 + v * 4; g.globalAlpha = .45 + .55 * v; g.beginPath(); g.ellipse(cx + 40, 190, 26, 130, 0, -Math.PI * .5, -Math.PI * .5 + Math.PI * (v || 1)); g.stroke(); g.restore();
      text(g, 'horizontal', cx - 150, 196, { size: 14, w: 800, align: 'center', col: G.H }); text(g, 'vertical', cx + 110, 70, { size: 14, w: 800, align: 'center', col: G.V });
    }
  }

  function draw(g, st, t, press, cap) {
    T.use(g); g.clearRect(0, 0, W, H);
    panel(g, 0, 0, 640, H, 'rgba(255,252,244,.85)'); panel(g, 652, 0, 388, H, 'rgba(255,252,244,.85)');
    const m = META[st.meta], game = m.games[st.game] || m.games[0];
    text(g, `${m.name}: ${game.name}`, 20, 30, { size: 16, w: 800, font: 'Montserrat' });
    if (game.pf === 'kb') drawKeys(g, press, t); else drawPad(g, game, press);
    if (cap) T.label(cap, 320, 66, 'center', '#fff', 15, C.navy);
    figure(g, m.fig, game, press, t);
    // the game note and the deck's line
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(664, 352, 364, 136, 10); g.fill();
    text(g, game.name, 678, 376, { size: 15, w: 800 });
    wrap(g, game.note, 678, 398, 336, 18, { size: 13, w: 500 });
    wrap(g, '"Familiarity usually wins… but an understandable metaphor is essential."', 670, 516, 350, 20, { size: 15, w: 700, col: C.goldInk });
    text(g, 'Slide 152', 670, 562, { size: 12, w: 600, col: C.muted });
  }

  // walk-through: each metaphor in turn, pressing its buttons one after another
  const SEG = [['hands', 0], ['hands', 1], ['planes', 0], ['body', 0], ['weight', 0], ['weight', 1], ['slots', 0]], LEN = 4.2, DUR = LEN * SEG.length;
  const CAPS = { hands: 'Each shoulder is a hand.', planes: 'Each button is a plane of attack.', body: 'Each button is a part of the body.', weight: 'Each button is a weight of attack.', slots: 'Each key is a slot on the bar.' };
  canvasDemo('meta', (s, cv, g) => {
    const st = { meta: 'hands', game: 0, tour: true, held: false, t: 0, key: '', pressAt: -9, pressI: -1 };
    const tourBtn = $(s, '.cm-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    const syncGames = () => {
      const gs = META[st.meta].games;
      $(s, '.cm-game').innerHTML = gs.map((gm, i) => `<button class="btn${i === st.game ? ' on' : ''}" data-i="${i}">${gm.name}</button>`).join('');
      $$(s, '.cm-game .btn').forEach(b => b.onclick = () => { manual(); st.game = +b.dataset.i; st.key = ''; });
    };
    $$(s, '.cm-meta .btn').forEach(b => b.onclick = () => { manual(); st.meta = b.dataset.m; st.game = 0; st.key = ''; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // click a mapped button (or a number key) to press it
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      const game = META[st.meta].games[st.game];
      let hit = -1;
      if (game.pf === 'kb') { for (let i = 0; i < 10; i++) { const kx = 36 + i * 57; if (x >= kx && x <= kx + 50 && y >= 200 && y <= 364) hit = i; } }
      else game.map.forEach(([id], i) => { const sl = PAD[id]; if (sl.c ? Math.hypot(x - sl.c[0], y - PY - sl.c[1]) <= sl.c[2] + 4 : x >= sl.r[0] && x <= sl.r[0] + sl.r[2] && y - PY >= sl.r[1] && y - PY <= sl.r[1] + sl.r[3]) hit = i; });
      if (hit < 0) return; manual(); st.pressI = hit; st.pressAt = st.t;
    });
    function frame(t) {
      let press, cap = null;
      if (st.tour) {
        const k = Math.min(SEG.length - 1, Math.floor(t / LEN)), f = t - k * LEN;
        st.meta = SEG[k][0]; st.game = SEG[k][1]; cap = CAPS[st.meta];
        const n = Math.max(1, META[st.meta].games[st.game].map.length || 10), step = Math.min(.8, 3.4 / n);
        press = i => { const a = f - .5 - i * step; return a > 0 && a < step * 1.6 ? Math.sin(clamp(a / (step * 1.6)) * Math.PI) : 0; };
      } else {
        const a = t - st.pressAt;
        press = i => i === st.pressI && a < .6 ? Math.sin(clamp(a / .6) * Math.PI) : 0;
      }
      draw(g, st, t, press, cap);
      const key = st.meta + st.game;
      if (key === st.key) return; st.key = key;
      $$(s, '.cm-meta .btn').forEach(b => b.classList.toggle('on', b.dataset.m === st.meta));
      syncGames();
      const m = META[st.meta];
      say($(s, '.cm-out'), `${CAPS[st.meta]} ${st.meta === 'body' ? 'Clever, and later dropped: players had to learn it before it made sense.' : st.meta === 'slots' ? 'The most familiar PC metaphor of all, inherited rather than invented.' : 'Players who know the metaphor can guess a new weapon or spell before reading a tooltip.'} ${st.meta === 'slots' ? 'Click a number key' : 'Click a coloured button'} to press it.`);
    }
    window.__seek = t => { st.held = true; st.tour = true; frame(t); };
    window.__dur = () => DUR;
    return dt => { if (st.held) return; st.t += Math.max(0, dt); if (st.tour && st.t >= DUR) st.t = 0; frame(st.t); };
  });
})();
