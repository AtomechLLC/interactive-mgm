/* Why not just chess? (post-mortem: "The Chess Event: Taking Risks for Extraordinary Rewards").
   Slide 1, rules: a ten-player raid plays the Karazhan chess board against Medivh. Five house rules from the post are
   toggles: each player controls their own piece, more pieces than players (the dead jump into a spare), the king is the
   strongest piece, you always play your own faction, and Medivh cheats. Turning one off shows its failure state:
   one player decides everything, dead players sit out, the king hides, the raid plays the other faction's pieces, the
   AI is decimated and the game drags into a chase. The game is a scripted skirmish, simulated turn by turn from the
   options (paths in RAID / HORDE, deaths in deaths()), so the walk-through and __seek are deterministic.
   Slide 2, grid: the engine's pathing grid had cells larger than the board's squares (making it finer would have cost
   40% more server memory, from the post). Orders snap to the nearest pathing node; then 64 invisible bunnies, one per
   square with its own string id, give every square a target and an "is it full?" check. Bunnies: ../shared/bunny.js.
   Source of numbers: the 40% is the post's. Piece names are the game's, not the post's. Turn timings, who dies when,
   the tension curve and the cell size (1.5 squares) are illustrative.
   Slide 2, spells: every piece's two spells and Medivh's three cheats, names, icons and numbers from warcraft.wiki.gg ("Chess Event");
   slide 1 casts them on the board (when each support spell lands is illustrative).
   GIF hooks: __seek(t, which) / __dur(which), which = rules, spells or grid. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const img = src => { const im = new Image(); im.src = src; return im; };
  const ok = im => im && im.complete && im.naturalWidth > 0;
  const ICON = n => img('../img/' + n + '.jpg');
  const GLYPH = {}; ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'].forEach(k => GLYPH[k] = img('img/chess-' + k + '.svg'));
  const KIND = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
  const NAMES = {
    A: { K: 'King Llane', Q: 'Human Conjurer', B: 'Human Cleric', N: 'Human Charger', R: 'Conjured Water Elemental', P: 'Human Footman' },
    H: { K: 'Warchief Blackhand', Q: 'Orc Warlock', B: 'Orc Necrolyte', N: 'Orc Wolf', R: 'Summoned Daemon', P: 'Orc Grunt' },
  };
  const FAC = { A: { fill: '#2c5fc0', ring: '#173a80', name: 'Alliance' }, H: { fill: '#b8332d', ring: '#74160f', name: 'Horde' } };
  const BANNER = { A: ICON('inv_bannerpvp_02'), H: ICON('inv_bannerpvp_01') };
  const MEDIVH = ICON('inv_staff_medivh'), FIRE = ICON('spell_fire_fire');
  const FILES = 'abcdefgh';
  /* Each piece's two spells, from the game (warcraft.wiki.gg, "Chess Event"): [Alliance name, Horde name], icon per faction,
     the shape it hits and the wiki's numbers. Movement and turning share a 5 s cooldown; the two spells share another. */
  const SPELLS = {
    K: [{ n: ['Sweep', 'Cleave'], i: ['ability_whirlwind', 'ability_warrior_cleave'], shape: 'cone3', d: '4000 damage to the 3 squares in front' },
        { n: ['Heroism', 'Bloodlust'], i: ['ability_shaman_heroism', 'spell_nature_bloodlust'], shape: 'aura', d: '+50% damage for allies on the 8 squares around (15 s cooldown)' }],
    Q: [{ n: ['Elemental Blast', 'Fireball'], i: ['spell_frost_frostbolt02', 'spell_fire_fireball02'], shape: 'bolt', d: '4000 damage to any piece in range (4 straight, 3 diagonal)' },
        { n: ['Rain of Fire', 'Poison Cloud'], i: ['spell_shadow_rainoffire', 'spell_nature_naturetouchdecay'], shape: 'area', d: '6000 damage to a target and every enemy next to it (15 s cooldown)' }],
    B: [{ n: ['Holy Lance', 'Shadow Spear'], i: ['spell_holy_holysmite', 'spell_shadow_shadowbolt'], shape: 'line3', d: '2000 damage to enemies in a line of 3 squares in front' },
        { n: ['Healing', 'Shadow Mend'], i: ['spell_holy_heal', 'spell_shadow_lifedrain02'], shape: 'heal', d: 'Heals a friendly piece for 12,000, up to half the board away (20 s cooldown)' }],
    N: [{ n: ['Smash', 'Bite'], i: ['ability_warrior_decisivestrike', 'ability_druid_ferociousbite'], shape: 'front1', d: '3000 damage to the square in front' },
        { n: ['Stomp', 'Howl'], i: ['ability_warstomp', 'ability_hunter_pet_wolf'], shape: 'debuff', d: 'Enemies on the 8 squares around deal 50% less damage for 10 s' }],
    R: [{ n: ['Geyser', 'Hellfire'], i: ['spell_frost_summonwaterelemental', 'spell_fire_incinerate'], shape: 'adj', d: '3000 damage to every enemy on the 8 squares around' },
        { n: ['Water Shield', 'Fire Shield'], i: ['ability_shaman_watershield', 'spell_fire_firearmor'], shape: 'shield', d: 'Takes 50% less damage for 5 s' }],
    P: [{ n: ['Heroic Blow', 'Vicious Strike'], i: ['ability_warrior_punishingblow', 'ability_backstab'], shape: 'front1', d: '1000 damage to the square in front' },
        { n: ['Shield Block', 'Weapon Deflection'], i: ['ability_defend', 'ability_parry'], shape: 'shield', d: 'Absorbs 500 damage for 5 s' }],
  };
  const CHEATS = {
    fire: { n: 'Damage cheat', i: 'spell_fire_fire', d: 'Fire on the square of one of your pieces' },
    heal: { n: 'Healing cheat', i: 'spell_nature_tranquility', d: 'His king, and sometimes every piece, back to full health' },
    berserk: { n: 'Berserking cheat', i: 'racial_troll_berserk', d: 'One of his pieces grows: more size, speed and damage' },
  };
  const ICONS = {}; const icon = n => ICONS[n] || (ICONS[n] = ICON(n));
  const fi = fac => fac === 'A' ? 0 : 1;
  const TINT = { A: { cone3: '255,214,90', bolt: '120,190,255', area: '255,110,40', line3: '255,236,150', heal: '110,230,140', front1: '255,255,255', adj: '90,170,255', aura: '255,200,80', debuff: '190,150,255', shield: '140,200,255' },
                 H: { cone3: '255,150,60', bolt: '255,120,30', area: '120,220,80', line3: '170,110,230', heal: '170,110,230', front1: '255,255,255', adj: '255,110,30', aura: '255,70,50', debuff: '190,150,255', shield: '255,140,60' } };
  // one spell effect from a (caster) to b (target) at progress q (0..1), in squares of size sq
  function fx(g, shape, fac, a, b, q, sq) {
    if (q <= 0 || q >= 1) return;
    const col = TINT[fac][shape], fade = Math.sin(q * Math.PI), ang = Math.atan2(b.y - a.y, b.x - a.x);
    g.save(); g.lineCap = 'round';
    if (shape === 'front1') {   // a slash across the target
      g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 5; g.beginPath(); g.arc(b.x - Math.cos(ang) * sq * .3, b.y - Math.sin(ang) * sq * .3, sq * .5, ang - 1.1 + q * .6, ang + .1 + q * .9); g.stroke();
      g.strokeStyle = `rgba(229,50,45,${fade})`; g.lineWidth = 2; g.stroke();
    } else if (shape === 'cone3') {   // a sweep over the three squares in front
      g.fillStyle = `rgba(${col},${.45 * fade})`; g.beginPath(); g.moveTo(a.x, a.y); g.arc(a.x, a.y, sq * 1.6, ang - .8, ang - .8 + 1.6 * clamp(q * 1.6)); g.closePath(); g.fill();
      g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 4; g.beginPath(); g.arc(a.x, a.y, sq * 1.6, ang - .8, ang - .8 + 1.6 * clamp(q * 1.6)); g.stroke();
    } else if (shape === 'bolt') {   // a ball flies to the target, then bursts
      const k = clamp(q / .6), x = lerp(a.x, b.x, ease(k)), y = lerp(a.y, b.y, ease(k));
      if (k < 1) { const gr = g.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, '#fff'); gr.addColorStop(.4, `rgba(${col},1)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill();
        g.strokeStyle = `rgba(${col},.5)`; g.lineWidth = 6; g.beginPath(); g.moveTo(lerp(a.x, b.x, ease(Math.max(0, k - .25))), lerp(a.y, b.y, ease(Math.max(0, k - .25)))); g.lineTo(x, y); g.stroke(); }
      else { const r = (q - .6) / .4; g.fillStyle = `rgba(${col},${.7 * (1 - r)})`; g.beginPath(); g.arc(b.x, b.y, sq * (.3 + .4 * r), 0, TAU); g.fill(); }
    } else if (shape === 'area') {   // the target and every square around it
      g.fillStyle = `rgba(${col},${.4 * fade})`; g.fillRect(b.x - sq * 1.5, b.y - sq * 1.5, sq * 3, sq * 3);
      g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 2; g.setLineDash([5, 4]); g.strokeRect(b.x - sq * 1.5, b.y - sq * 1.5, sq * 3, sq * 3); g.setLineDash([]);
      for (let i = 0; i < 9; i++) { const dx = ((i * 37) % 30) / 30 - .5, y0 = ((q * 2 + i * .13) % 1); g.fillStyle = `rgba(${col},${fade})`; g.fillRect(b.x + dx * sq * 2.6, b.y - sq * 1.5 + y0 * sq * 3, 3, 9); }
    } else if (shape === 'line3') {   // a lance down a line of three squares
      const len = sq * 3 * clamp(q * 1.8), ex = a.x + Math.cos(ang) * len, ey = a.y + Math.sin(ang) * len;
      g.strokeStyle = `rgba(${col},${.5 * fade})`; g.lineWidth = 14; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${fade})`; g.lineWidth = 3; g.stroke();
    } else if (shape === 'adj') {   // a ring bursting out over the 8 squares around
      const r = sq * 1.5 * ease(clamp(q * 1.4));
      g.fillStyle = `rgba(${col},${.25 * fade})`; g.fillRect(a.x - r, a.y - r, r * 2, r * 2);
      g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 5; g.beginPath(); g.arc(a.x, a.y, r, 0, TAU); g.stroke();
    } else if (shape === 'heal') {   // a beam to an ally, and a rising plus
      g.strokeStyle = `rgba(${col},${.7 * fade})`; g.lineWidth = 4; g.setLineDash([2, 7]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]);
      g.fillStyle = `rgba(${col},${fade})`; const y = b.y - 10 - q * 22; g.fillRect(b.x - 3, y - 10, 6, 20); g.fillRect(b.x - 10, y - 3, 20, 6);
      g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, sq * .45, 0, TAU); g.stroke();
    } else if (shape === 'aura') {   // allies around the caster light up
      g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 3; g.setLineDash([6, 5]); g.strokeRect(a.x - sq * 1.5, a.y - sq * 1.5, sq * 3, sq * 3); g.setLineDash([]);
      (b.allies || []).forEach(p => { g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 4; g.beginPath(); g.arc(p.x, p.y, sq * .45 + 4 * Math.sin(q * 12), 0, TAU); g.stroke(); });
    } else if (shape === 'debuff') {   // enemies around shrink their damage
      g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 3; g.beginPath(); g.arc(a.x, a.y, sq * 1.5 * ease(clamp(q * 1.5)), 0, TAU); g.stroke();
      (b.foes || []).forEach(p => { g.fillStyle = `rgba(${col},${fade})`; g.beginPath(); g.moveTo(p.x - 7, p.y - sq * .5); g.lineTo(p.x + 7, p.y - sq * .5); g.lineTo(p.x, p.y - sq * .5 + 9); g.fill(); });
    } else if (shape === 'shield') {   // a bubble on the caster
      g.strokeStyle = `rgba(${col},${fade})`; g.lineWidth = 3; g.fillStyle = `rgba(${col},${.25 * fade})`; g.beginPath(); g.arc(a.x, a.y, sq * .5, 0, TAU); g.fill(); g.stroke();
    }
    g.restore();
  }
  // the spell's icon and name over the caster
  function castTag(g, x, y, name, ic, a, col = '#262c6a') {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a; g.font = '700 11px Jost, sans-serif';
    const w = g.measureText(name).width + 30, bx = clamp(x - w / 2, 4, 1036 - w);
    g.fillStyle = 'rgba(255,252,244,.95)'; g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.roundRect(bx, y - 11, w, 22, 6); g.fill(); g.stroke();
    if (ok(ic)) g.drawImage(ic, bx + 3, y - 8, 16, 16);
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(name, bx + 23, y + 1); g.restore();
  }

  function piece(g, x, y, kind, fac, o = {}) {
    const r = o.r || 21, a = o.a == null ? 1 : o.a;
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a;
    g.fillStyle = 'rgba(10,8,20,.35)'; g.beginPath(); g.ellipse(x + 2, y + 4, r, r * .8, 0, 0, TAU); g.fill();
    g.fillStyle = FAC[fac].fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.lineWidth = 3; g.strokeStyle = o.hi ? '#ffb951' : FAC[fac].ring;
    if (o.empty) g.setLineDash([4, 4]);
    g.stroke(); g.setLineDash([]);
    const im = GLYPH[KIND[kind]]; if (ok(im)) { const s = r * 1.45; g.drawImage(im, x - s / 2, y - s / 2, s, s); }
    if (o.badge && ok(o.badge)) {
      const bs = o.bs || 18, bx = x + r * .62, by = y - r * .62;
      g.fillStyle = '#ffb951'; g.beginPath(); g.roundRect(bx - bs / 2 - 2, by - bs / 2 - 2, bs + 4, bs + 4, 4); g.fill();
      g.drawImage(o.badge, bx - bs / 2, by - bs / 2, bs, bs);
    }
    g.restore();
  }
  function cross(g, x, y, s, a) { if (a <= 0) return; g.save(); g.globalAlpha *= a; g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke(); g.strokeStyle = C.red; g.lineWidth = 3; g.stroke(); g.restore(); }
  function text(g, s, x, y, font, col, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  function wrap(g, s, x, y, w, lh, font, col) {
    g.font = font; g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let line = '', yy = y;
    s.split(' ').forEach(word => { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > w && line) { g.fillText(line, x, yy); line = word; yy += lh; } else line = t; });
    if (line) g.fillText(line, x, yy); return yy;
  }
  function board(g, bx, by, sq, frame = true) {
    if (frame) { g.fillStyle = '#2a2342'; g.beginPath(); g.roundRect(bx - 14, by - 14, sq * 8 + 28, sq * 8 + 28, 12); g.fill(); g.strokeStyle = '#5b4d7e'; g.lineWidth = 2; g.stroke(); }
    for (let c = 0; c < 8; c++) for (let r = 0; r < 8; r++) { g.fillStyle = (c + r) % 2 ? '#e4dccb' : '#6c5b86'; g.fillRect(bx + c * sq, by + (7 - r) * sq, sq, sq); }
    g.font = '600 10px Jost, sans-serif'; g.fillStyle = '#c9bfdf'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) { g.fillText(FILES[i], bx + i * sq + sq / 2, by + sq * 8 + 7); g.fillText(String(i + 1), bx - 7, by + (7 - i) * sq + sq / 2); }
  }

  /* ---------------- slide 1: the rules ---------------- */
  const SQ = 58, BX = 40, BY = 62, TURNS = 12;
  const at = (c, r) => ({ x: BX + c * SQ + SQ / 2, y: BY + (7 - r) * SQ + SQ / 2 });
  // the ten players: class icons, and the piece each starts on
  const PLAYERS = [
    ['warrior', 'K'], ['mage', 'Q'], ['priest', 'Bc'], ['paladin', 'Bf'], ['rogue', 'Nb'],
    ['druid', 'Ng'], ['hunter', 'Ra'], ['warlock', 'Rh'], ['shaman', 'Pd'], ['priest', 'Pe'],
  ].map(([cls, pc], i) => ({ i, cls, pc, im: ICON('classicon_' + cls) }));
  // the raid's side (rows 0-1) and Medivh's side (rows 6-7). path: [turn, col, row] moves, applied when the square is free
  const RAID = {
    K: [4, 0, [[3, 4, 1], [5, 4, 2], [7, 4, 3], [9, 4, 4], [10, 4, 5]]], Q: [3, 0, [[5, 3, 1], [7, 3, 2]]],
    Bc: [2, 0, [[2, 3, 1], [4, 3, 3]]], Bf: [5, 0, [[2, 5, 2], [6, 5, 3]]], Nb: [1, 0, [[0, 2, 2], [2, 2, 3]]], Ng: [6, 0, [[0, 5, 2], [2, 5, 3]]],
    Ra: [0, 0, []], Rh: [7, 0, [[3, 6, 2], [7, 6, 3]]],
    Pa: [0, 1, []], Pb: [1, 1, []], Pc: [2, 1, []], Pd: [3, 1, [[1, 3, 3]]], Pe: [4, 1, [[1, 4, 3]]], Pf: [5, 1, []], Pg: [6, 1, []], Ph: [7, 1, []],
  };
  const SPARES = [['Pc', 2, 2], ['Pf', 5, 2], ['Pb', 1, 2], ['Pg', 6, 2], ['Pa', 0, 2], ['Ph', 7, 2]];   // jump order, and where each spare walks once someone is in it
  const HORDE = {
    K: [4, 7, [[8, 4, 6]]], Q: [3, 7, [[5, 3, 6], [8, 3, 5]]], Bc: [2, 7, [[2, 3, 6], [4, 3, 5]]], Bf: [5, 7, [[2, 4, 6], [4, 5, 5]]],
    Nb: [1, 7, [[0, 2, 5], [2, 2, 4]]], Ng: [6, 7, [[0, 5, 5], [2, 5, 4]]], Ra: [0, 7, [[4, 1, 5]]], Rh: [7, 7, [[3, 6, 5]]],
    Pa: [0, 6, []], Pb: [1, 6, []], Pc: [2, 6, [[3, 2, 5]]], Pd: [3, 6, [[1, 3, 4]]], Pe: [4, 6, [[1, 4, 4]]], Pf: [5, 6, [[5, 6, 4]]], Pg: [6, 6, []], Ph: [7, 6, []],
  };
  const FLEE = [[7, 5, 6], [9, 6, 6], [11, 7, 7]];
  const STEADY = [['Pd', 2], ['Pe', 4], ['Nb', 5], ['Ng', 6], ['Pc', 7], ['Bc', 8], ['Bf', 9], ['Pf', 10], ['Rh', 10]];
  const FAST = [['Pd', 2], ['Pe', 2], ['Nb', 3], ['Ng', 3], ['Pc', 4], ['Bc', 4], ['Bf', 4], ['Pf', 5], ['Rh', 5], ['Q', 6], ['Ra', 6], ['Pb', 7], ['Pg', 7], ['Pa', 8], ['Ph', 8]];
  const RAID_LOSS = { cheat: [['Pd', 3], ['Ng', 5, 'fire'], ['Pe', 6], ['Bf', 8, 'fire'], ['Rh', 9], ['Nb', 10, 'fire']], fair: [['Pe', 5], ['Nb', 9]] };
  const RULES = [
    { k: 'own', name: 'Each player controls their own piece', fail: 'One player decides everything' },
    { k: 'spare', name: 'More pieces than players', fail: 'Dead players sit out' },
    { k: 'king', name: 'The king is the strongest piece', fail: 'The king hides' },
    { k: 'faction', name: 'You always play your own faction', fail: 'You play the other faction' },
    { k: 'cheat', name: 'Medivh cheats for drama', fail: 'The AI is decimated' },
  ];
  const ALL = { own: true, spare: true, king: true, faction: true, cheat: true };

  function deaths(o) {
    let L = (o.cheat ? STEADY : FAST).slice();
    if (!o.king) L = L.slice(0, -2);
    if (!o.own) L = L.filter((_, i) => i % 2 === 0);
    if (!o.spare) L = L.slice(0, -2);
    const kingFalls = o.cheat && o.king && o.own && o.spare;
    if (kingFalls) L.push(['K', 11]);
    return { horde: L, raid: o.cheat ? RAID_LOSS.cheat : RAID_LOSS.fair, kingFalls, flee: !o.cheat };
  }

  // turn-by-turn simulation: snaps[k] = positions, life and owners during turn k, plus that turn's events
  const cache = {};
  function sim(o) {
    const key = JSON.stringify(o); if (cache[key]) return cache[key];
    const D = deaths(o), ps = [];
    const add = (side, id, [c, r, path]) => ps.push({ side, id, kind: id[0], c, r, path: path.map(p => p.slice()), alive: true, dieAt: null, how: null, owner: null });
    Object.entries(RAID).forEach(([id, d]) => add('R', id, id === 'K' && !o.king ? [4, 0, [[1, 6, 0]]] : d));
    Object.entries(HORDE).forEach(([id, d]) => add('M', id, id === 'K' && D.flee ? [4, 7, FLEE] : d));
    const P = (side, id) => ps.find(p => p.side === side && p.id === id);
    D.horde.forEach(([id, t]) => { P('M', id).dieAt = t; });
    D.raid.forEach(([id, t, how]) => { const p = P('R', id); p.dieAt = t; p.how = how || null; });
    if (o.own) PLAYERS.forEach(pl => { P('R', pl.pc).owner = pl.i; });
    const bench = [], spareQ = SPARES.slice(), snaps = [];
    let kingKills = 0, prev = null;
    for (let k = 0; k < TURNS; k++) {
      const occ = (c, r) => ps.some(p => p.alive && p.c === c && p.r === r);
      const moves = [];
      ps.forEach(p => {
        if (!p.alive || !p.path.length || p.path[0][0] > k) return;
        if (p.side === 'R' && p.id[0] === 'P' && p.owner == null && o.own && SPARES.some(s => s[0] === p.id)) return;   // an empty spare never moves
        const [, c, r] = p.path[0]; if (occ(c, r)) return;
        moves.push({ p, from: [p.c, p.r] }); p.c = c; p.r = r; p.path.shift();
      });
      const ev = { kills: [], fire: [], jumps: [], moves, casts: [] };
      ps.filter(p => p.alive && p.dieAt === k).forEach(v => {
        if (v.how === 'fire') { ev.fire.push(v); ev.kills.push({ v, by: null }); return; }
        const foes = ps.filter(q => q.alive && q.side !== v.side && q.dieAt !== k && (q.side === 'M' || q.owner != null || !o.own));
        foes.sort((a, b) => Math.max(Math.abs(a.c - v.c), Math.abs(a.r - v.r)) - Math.max(Math.abs(b.c - v.c), Math.abs(b.r - v.r)));
        let by = foes[0] || null;
        const king = ps.find(q => q.side === 'R' && q.id === 'K' && q.alive);
        if (v.side === 'M' && o.king && king && Math.max(Math.abs(king.c - v.c), Math.abs(king.r - v.r)) <= 2) by = king;
        if (by && by.side === 'R' && by.id === 'K') kingKills++;
        ev.kills.push({ v, by });
      });
      // support spells and Medivh's other two cheats, on fixed turns (illustrative timing)
      ev.casts = [];
      const live = q => q && q.alive && q.dieAt !== k;
      const front = side => ps.filter(q => live(q) && q.side === side).sort((x, y) => side === 'R' ? y.r - x.r : x.r - y.r)[0];
      const near = (q, side) => ps.filter(z => live(z) && z !== q && z.side === side && Math.max(Math.abs(z.c - q.c), Math.abs(z.r - q.r)) <= 1);
      const rk = P('R', 'K');
      if (o.king && (k === 5 || k === 9) && live(rk)) ev.casts.push({ by: rk, sp: 1, allies: near(rk, 'R') });
      if (k === 4 || k === 8) { const b = [P('R', 'Bc'), P('R', 'Bf')].find(live), t = front('R'); if (b && t) ev.casts.push({ by: b, sp: 1, to: t }); }
      if (k === 3 || k === 7) { const b = [P('M', 'Bc'), P('M', 'Bf')].find(live), t = front('M'); if (b && t) ev.casts.push({ by: b, sp: 1, to: t }); }
      if (k === 3) { const n = [P('R', 'Nb'), P('R', 'Ng')].find(live); if (n) ev.casts.push({ by: n, sp: 1, foes: near(n, 'M') }); }
      if (k === 6) { const n = [P('M', 'Nb'), P('M', 'Ng')].find(live); if (n) ev.casts.push({ by: n, sp: 1, foes: near(n, 'R') }); }
      if (k === 2) { const r = P('R', 'Rh'); if (live(r)) ev.casts.push({ by: r, sp: 1 }); }
      if (k === 4) { const pw = P('M', 'Pf'); if (live(pw)) ev.casts.push({ by: pw, sp: 1 }); }
      if (o.cheat && k === 4) ev.cheat = 'berserk';
      if (o.cheat && k === 7) ev.cheat = 'heal';
      if (ev.fire.length) ev.cheat = 'fire';
      snaps.push({ k, pos: ps.map(p => ({ c: p.c, r: p.r, alive: p.alive, owner: p.owner, dying: p.dieAt === k })), ev, bench: bench.slice(), kingKills });
      // end of turn: the dead leave; their players jump into a spare or sit out
      ps.filter(p => p.alive && p.dieAt === k).forEach(v => {
        v.alive = false;
        if (v.owner == null) return;
        const pl = v.owner; v.owner = null;
        const s = o.spare && spareQ.find(([id]) => P('R', id).alive && P('R', id).owner == null);
        if (s) { spareQ.splice(spareQ.indexOf(s), 1); const q = P('R', s[0]); q.owner = pl; q.path = [[k + 1, s[1], s[2]]]; ev.jumps.push({ pl, from: v, to: q }); }
        else bench.push(pl);
      });
    }
    const res = { ps, snaps, D, final: { raid: ps.filter(p => p.side === 'R' && p.alive).length, horde: ps.filter(p => p.side === 'M' && p.alive).length, bench: bench.length, kingKills } };
    // tension, per turn (illustrative): how close the piece counts are, flattened when the king hides, plus Medivh's fire
    res.tension = snaps.map(s => {
      const R = s.pos.filter((p, i) => p.alive && ps[i].side === 'R').length, M = s.pos.filter((p, i) => p.alive && ps[i].side === 'M').length;
      let v = 1 - clamp(Math.abs(R - M) / 9);
      if (M <= 3 && D.flee) v *= .3;
      if (!o.king) v *= .6;
      if (s.ev.fire.length) v += .2;
      if (D.kingFalls && s.k >= 9) v += .15;
      return clamp(v * .85 + .05);
    });
    return (cache[key] = res);
  }

  function drawRules(g, o, gt, hold) {
    const S = sim(o), k = Math.min(TURNS - 1, Math.floor(gt)), f = gt >= TURNS ? 1 : gt - k, snap = S.snaps[k];
    const raidFac = o.faction ? 'A' : 'H', hordeFac = o.faction ? 'H' : 'A';
    T.use(g); g.clearRect(0, 0, W, H);
    board(g, BX, BY, SQ);
    // header
    text(g, `Turn ${k + 1} of ${TURNS}`, BX - 6, 30, '800 16px Montserrat, Jost, sans-serif', C.ink);
    if (ok(MEDIVH)) g.drawImage(MEDIVH, BX + SQ * 8 - 26, 12, 26, 26);
    if (snap.ev.cheat && f < .95) { const ch = CHEATS[snap.ev.cheat]; castTag(g, BX + SQ * 8 - 110, 25, `Medivh cheats: ${ch.n}`, icon(ch.i), Math.sin(clamp(f / .95) * Math.PI) * 1.6, C.redDk); }
    else text(g, `Medivh (the AI) plays the ${FAC[hordeFac].name}`, BX + SQ * 8 - 32, 30, '600 13px Jost, sans-serif', C.muted, 'right');
    // fire
    snap.ev.fire.forEach(v => {
      const p = at(snap.pos[S.ps.indexOf(v)].c, snap.pos[S.ps.indexOf(v)].r), a = Math.sin(clamp(f / .8) * Math.PI);
      g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(255,120,30,.55)'; g.fillRect(p.x - SQ / 2, p.y - SQ / 2, SQ, SQ);
      if (ok(FIRE)) g.drawImage(FIRE, p.x - 14, p.y - SQ / 2 + 2, 28, 28); g.restore();
    });
    // pieces: slide during the first 40% of the turn
    const mk = clamp(f / .4), mv = ease(mk);
    S.ps.forEach((p, i) => {
      const now = snap.pos[i]; if (!now.alive) return;
      const mvd = snap.ev.moves.find(m => m.p === p);
      const from = mvd ? at(...mvd.from) : at(now.c, now.r), to = at(now.c, now.r);
      const x = lerp(from.x, to.x, mv), y = lerp(from.y, to.y, mv);
      const fac = p.side === 'R' ? raidFac : hordeFac;
      const dying = now.dying, da = dying ? 1 - clamp((f - .55) / .4) : 1;
      const owned = now.owner != null, empty = p.side === 'R' && o.own && !owned;
      const acting = !o.own && p.side === 'R' && mvd;
      const zerk = o.cheat && p.side === 'M' && p.id === 'Q' && k >= 4;
      if (zerk) { g.fillStyle = `rgba(229,50,45,${.25 + .1 * Math.sin(gt * 9)})`; g.beginPath(); g.arc(x, y, 30, 0, TAU); g.fill(); }
      if (snap.ev.cheat === 'heal' && p.side === 'M') { const q = Math.sin(clamp(f / .9) * Math.PI); g.strokeStyle = `rgba(110,230,140,${q})`; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.stroke(); g.fillStyle = `rgba(110,230,140,${q})`; g.fillRect(x - 2.5, y - 34 - f * 10, 5, 14); g.fillRect(x - 7, y - 29.5 - f * 10, 14, 5); }
      piece(g, x, y, p.kind, fac, { r: zerk ? 26 : 21, a: da * (empty ? .5 : 1), empty, badge: owned ? PLAYERS[now.owner].im : acting ? PLAYERS[0].im : null, hi: acting });
      if (dying) cross(g, x, y, 12, clamp((f - .45) / .15) * da);
    });
    // attacks
    const posOf = q => at(snap.pos[S.ps.indexOf(q)].c, snap.pos[S.ps.indexOf(q)].r);
    const facOf = q => q.side === 'R' ? raidFac : hordeFac;
    const tags = [];
    snap.ev.kills.forEach(({ v, by }, n) => {
      if (!by) return;
      const sp = SPELLS[by.kind][by.kind === 'Q' && (k + n) % 2 ? 1 : 0], fac = facOf(by), a = posOf(by), b = posOf(v);
      fx(g, sp.shape, fac, a, b, (f - .22) / .5, SQ);
      tags.push([a, sp.n[fi(fac)], icon(sp.i[fi(fac)])]);
    });
    snap.ev.casts.forEach(c => {
      const sp = SPELLS[c.by.kind][c.sp], fac = facOf(c.by), a = posOf(c.by);
      const b = c.to ? posOf(c.to) : { x: a.x + (c.by.side === 'R' ? 0 : 0), y: a.y - (c.by.side === 'R' ? SQ : -SQ), allies: (c.allies || []).map(posOf), foes: (c.foes || []).map(posOf) };
      fx(g, sp.shape, fac, a, b, (f - .2) / .65, SQ);
      tags.push([a, sp.n[fi(fac)], icon(sp.i[fi(fac)])]);
    });
    const ta = Math.sin(clamp((f - .15) / .75) * Math.PI) * 1.5;
    const seen = new Set(); for (let i = tags.length - 1; i >= 0; i--) { const key = tags[i][0].x + ',' + tags[i][0].y + tags[i][1]; if (seen.has(key)) tags.splice(i, 1); else seen.add(key); }
    tags.forEach(([a, n, ic], i) => castTag(g, a.x, a.y - SQ * .62 - (tags.slice(0, i).some(([b]) => Math.abs(b.x - a.x) < 70 && Math.abs(b.y - a.y) < 20) ? 22 : 0), n, ic, ta));
    // jumps (shown at the end of the turn the piece died in)
    snap.ev.jumps.forEach(j => {
      const q = ease(clamp((f - .6) / .35)); if (q <= 0) return;
      const a = at(snap.pos[S.ps.indexOf(j.from)].c, snap.pos[S.ps.indexOf(j.from)].r), b = at(snap.pos[S.ps.indexOf(j.to)].c, snap.pos[S.ps.indexOf(j.to)].r);
      const x = lerp(a.x, b.x, q), y = lerp(a.y, b.y, q) - Math.sin(q * Math.PI) * 60;
      const im = PLAYERS[j.pl].im; g.fillStyle = '#ffb951'; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill(); if (ok(im)) { g.save(); g.beginPath(); g.arc(x, y, 12, 0, TAU); g.clip(); g.drawImage(im, x - 12, y - 12, 24, 24); g.restore(); }
    });
    // end stamp
    if (gt >= TURNS - .3) {
      const a = clamp((gt - TURNS + .3) / .4), msg = S.D.kingFalls ? 'Medivh’s king falls' : S.D.flee ? 'His king runs: the game drags on' : 'Turn 12: no winner yet';
      T.stamp(msg, BX + SQ * 4, BY + SQ * 4, S.D.kingFalls ? C.good : C.red, a, 22);
    }
    // legend under the board
    text(g, `Raid (${FAC[raidFac].name}): ${['K', 'Q', 'B', 'N', 'R', 'P'].map(x => NAMES[raidFac][x]).join(', ')}`, BX - 12, 560, '500 11px Jost, sans-serif', C.muted);
    text(g, `Medivh (${FAC[hordeFac].name}): ${['K', 'Q', 'B', 'N', 'R', 'P'].map(x => NAMES[hordeFac][x]).join(', ')}`, BX - 12, 576, '500 11px Jost, sans-serif', C.muted);

    // right: the players
    const RX = 548;
    const benchNow = f > .9 ? snap.bench.concat(S.snaps[k + 1] ? S.snaps[k + 1].bench.filter(b => !snap.bench.includes(b)) : []) : snap.bench;
    text(g, 'The raid’s ten players', RX, 28, '800 15px Montserrat, Jost, sans-serif', C.ink);
    if (ok(BANNER.A)) g.drawImage(BANNER.A, RX + 214, 13, 20, 20);
    text(g, o.faction ? 'Alliance players, Alliance pieces' : 'Alliance players, Horde pieces', RX + 240, 28, '600 13px Jost, sans-serif', o.faction ? C.muted : C.red);
    PLAYERS.forEach((pl, i) => {
      const x = RX + i * 47, y = 40, out = !o.own ? i !== 0 : benchNow.includes(i);
      const kingIdle = !o.king && pl.pc === 'K';
      g.save(); g.globalAlpha = out ? .3 : 1; if (ok(pl.im)) g.drawImage(pl.im, x, y, 40, 40); g.restore();
      g.strokeStyle = out ? '#a9a39a' : kingIdle ? C.red : raidFac === 'A' ? FAC.A.fill : FAC.H.fill; g.lineWidth = 3; g.strokeRect(x, y, 40, 40);
      if (!o.faction) { g.fillStyle = FAC.H.fill; g.fillRect(x, y + 34, 40, 6); }
      text(g, !o.own ? (i === 0 ? 'decides' : 'watches') : out ? 'sits out' : kingIdle ? 'idle' : 'plays', x + 20, y + 54, '600 11px Jost, sans-serif', out || kingIdle ? C.red : C.ink, 'center');
    });
    // rules readout
    const st = stateOf(o, S, k, f, benchNow);
    RULES.forEach((ru, i) => {
      const y = 126 + i * 54, on = o[ru.k];
      g.fillStyle = on ? '#e7f3ea' : '#fbe3e0'; g.beginPath(); g.roundRect(RX, y - 18, 482, 48, 8); g.fill();
      g.fillStyle = on ? C.good : C.red; g.beginPath(); g.roundRect(RX, y - 18, 6, 48, [8, 0, 0, 8]); g.fill();
      text(g, on ? ru.name : ru.fail, RX + 16, y, '800 14px Montserrat, Jost, sans-serif', on ? C.ink : C.redDk);
      text(g, st[ru.k], RX + 16, y + 20, '500 13px Jost, sans-serif', on ? C.muted : C.redDk);
      text(g, on ? 'ON' : 'OFF', RX + 470, y, '800 12px Montserrat, Jost, sans-serif', on ? C.good : C.red, 'right');
    });
    // tension strip
    const TX = RX + 6, TY = 418, TW = 470, TH = 112;
    text(g, 'Tension, turn by turn (illustrative)', RX, TY - 8, '800 13px Montserrat, Jost, sans-serif', C.ink);
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(TX - 6, TY, TW + 12, TH, 8); g.fill(); g.stroke();
    const px = i => TX + (i + .5) / TURNS * TW, py = v => TY + TH - 14 - v * (TH - 26);
    g.strokeStyle = 'rgba(93,97,140,.35)'; g.setLineDash([3, 4]); g.beginPath(); S.tension.forEach((v, i) => i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v))); g.stroke(); g.setLineDash([]);
    if (RULES.some(r => !o[r.k])) {
      const ref = sim(ALL).tension; g.strokeStyle = 'rgba(26,138,76,.55)'; g.lineWidth = 2; g.beginPath(); ref.forEach((v, i) => i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v))); g.stroke();
      text(g, '— all five rules on', TX + TW, TY - 8, '600 11px Jost, sans-serif', C.good, 'right');
    }
    const upto = Math.min(TURNS - 1, gt);
    g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= Math.floor(upto); i++) i ? g.lineTo(px(i), py(S.tension[i])) : g.moveTo(px(i), py(S.tension[i]));
    if (upto < TURNS - 1) { const i = Math.floor(upto), q = upto - i; g.lineTo(lerp(px(i), px(i + 1), q), lerp(py(S.tension[i]), py(S.tension[i + 1]), q)); }
    g.stroke();
    S.snaps.forEach((s, i) => { if (s.ev.fire.length) { if (ok(FIRE)) g.drawImage(FIRE, px(i) - 7, TY + 4, 14, 14); } });
    text(g, '1', px(0), TY + TH - 2, '500 10px Jost, sans-serif', C.muted, 'center'); text(g, String(TURNS), px(TURNS - 1), TY + TH - 2, '500 10px Jost, sans-serif', C.muted, 'center');
    text(g, 'turn', TX + TW / 2, TY + TH - 2, '500 10px Jost, sans-serif', C.muted, 'center');
    return st;
  }
  function stateOf(o, S, k, f, bench) {
    const s = S.snaps[k], hordeAlive = s.pos.filter((p, i) => S.ps[i].side === 'M' && p.alive && !(p.dying && f > .9)).length;
    const deaths = S.snaps.slice(0, k + (f > .9 ? 1 : 0)).reduce((n, x) => n + x.ev.kills.filter(e => e.v.side === 'R' && e.v.owner !== undefined).length, 0);
    const jumps = S.snaps.slice(0, k + (f > .9 ? 1 : 0)).reduce((n, x) => n + x.ev.jumps.length, 0);
    const playing = !o.own ? 1 : 10 - bench.length;
    return {
      own: o.own ? `${playing} of 10 players choose their own move every turn` : 'One player moves one piece a turn; the other nine watch',
      spare: !o.own ? 'Nobody owns a piece, so nobody needs a spare' : o.spare ? `${jumps} player${jumps === 1 ? '' : 's'} died and jumped into a spare piece; nobody waits` : `${bench.length} dead player${bench.length === 1 ? '' : 's'} sitting out, ${16 - 10} spare pieces standing idle`,
      king: o.king ? `The king fights at the front: ${s.kingKills} kill${s.kingKills === 1 ? '' : 's'} so far` : 'Kept in the corner, the strongest play; its player does nothing',
      faction: o.faction ? 'Alliance raid, Alliance pieces against the Horde' : 'An Alliance raid moves Warchief Blackhand’s orcs',
      cheat: o.cheat ? `Fire on your squares keeps it close: ${hordeAlive} of 16 Horde pieces left` : `AI tools built for single units: ${hordeAlive} of 16 Horde pieces left`,
      playing, hordeAlive, deaths,
    };
  }

  const TOUR = [ALL, { ...ALL, own: false }, { ...ALL, spare: false }, { ...ALL, king: false }, { ...ALL, faction: false }, { ...ALL, cheat: false }];
  const TOUR_TURN = 1, TOUR_SEG = TURNS * TOUR_TURN + 2.5, PLAY_TURN = 1.5, PLAY_LOOP = TURNS * PLAY_TURN + 3.5;
  const apis = {};
  canvasDemo('rules', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, key: '' };
    const boxes = Object.fromEntries(RULES.map(r => [r.k, $(s, '.cr-' + r.k)]));
    const tourBtn = $(s, '.cr-tour'), playBtn = $(s, '.cr-play');
    const opts = () => Object.fromEntries(RULES.map(r => [r.k, boxes[r.k].checked]));
    const setBoxes = o => RULES.forEach(r => { boxes[r.k].checked = o[r.k]; });
    const free = () => { st.tour = false; st.t = 0; playBtn.classList.add('on'); tourBtn.classList.remove('on'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); playBtn.classList.remove('on'); };
    playBtn.onclick = () => { free(); setBoxes(ALL); };
    RULES.forEach(r => { boxes[r.k].onchange = () => { if (st.tour) { st.tour = false; playBtn.classList.add('on'); tourBtn.classList.remove('on'); } st.t = 0; }; });
    function frame(t) {
      let o, gt;
      if (st.tour) { const i = Math.floor(t / TOUR_SEG) % TOUR.length; o = TOUR[i]; setBoxes(o); gt = (t % TOUR_SEG) / TOUR_TURN; }
      else { o = opts(); gt = (t % PLAY_LOOP) / PLAY_TURN; }
      const r = drawRules(g, o, Math.min(gt, TURNS), st.held);
      const S = sim(o), off = RULES.filter(x => !o[x.k]);
      const key = JSON.stringify(o) + r.playing + r.hordeAlive + st.tour; if (key === st.key) return; st.key = key;
      say($(s, '.cr-stats'), `<div class="${r.playing < 10 ? 'r' : 'g'}"><b>${r.playing}/10</b><span>players making a decision</span></div>`
        + `<div class="${S.final.bench ? 'r' : 'g'}"><b>${S.final.bench}</b><span>players sitting out by turn 12</span></div>`
        + `<div class="${S.D.kingFalls ? 'g' : 'r'}"><b>${S.D.kingFalls ? 'win' : S.D.flee ? 'chase' : 'none'}</b><span>${S.D.kingFalls ? 'Medivh’s king falls on turn 12' : S.D.flee ? 'his army is gone, his king runs' : 'no winner after 12 turns'}</span></div>`);
      say($(s, '.cr-out'), !off.length ? 'All five house rules on: ten people, each with a piece, a king worth risking, and an opponent who cheats just enough to keep it close. This is why it wasn’t just chess.'
        : off.length > 1 ? `${off.length} rules off. Each one shows its own failure in the readout.`
        : { own: 'Classic chess: one mind moves one piece. In a ten-person raid that is one player and nine spectators.', spare: 'Pieces equal people: whoever dies first watches the rest of the game. The spare pieces exist so nobody waits.', king: 'If the king is just the target, the strongest play is to hide it. The player on the king does nothing, and the game loses its stakes.', faction: 'Same game, wrong colours. Players who picked a faction for its identity are asked to fight for the other side.', cheat: 'Equal pieces against WoW’s single-unit AI: the raid decimates the computer, and the end is a long chase for one king.' }[off[0].k]);
    }
    apis.rules = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => TOUR_SEG * TOUR.length };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); frame(st.t); };
  });

  /* ---------------- slide 2: the grid ---------------- */
  const Q = 62, GX = 30, GY = 40, CELL = Q * 1.5, OX = GX - 77, OY = GY - 30.5;   // pathing cells: 1.5 squares, offset from the board
  const sq = (c, r) => ({ x: GX + c * Q + Q / 2, y: GY + (7 - r) * Q + Q / 2 });
  const node = (x, y) => ({ x: OX + (Math.round((x - OX) / CELL - .5) + .5) * CELL, y: OY + (Math.round((y - OY) / CELL - .5) + .5) * CELL });
  const squareOf = (x, y) => { const c = Math.floor((x - GX) / Q), r = 7 - Math.floor((y - GY) / Q); return c >= 0 && c < 8 && r >= 0 && r < 8 ? [c, r] : null; };
  const name = (c, r) => FILES[c] + (r + 1);
  // grid stats over all 64 squares
  const GRID = (() => {
    let inside = 0; const seen = {};
    for (let c = 0; c < 8; c++) for (let r = 0; r < 8; r++) {
      const p = sq(c, r), n = node(p.x, p.y), s = squareOf(n.x, n.y);
      const edge = Math.abs(((n.x - GX) % Q + Q) % Q) < 3 || Math.abs(((n.y - GY) % Q + Q) % Q) < 3;
      if (s && s[0] === c && s[1] === r && !edge) inside++;
      const k = n.x + ',' + n.y; seen[k] = (seen[k] || 0) + 1;
    }
    const shared = Object.values(seen).filter(v => v > 1).reduce((a, b) => a + b, 0);
    return { inside, shared, nodes: Object.keys(seen).length };
  })();
  const STEPS = [
    { t: 'The board: 64 squares', d: 'What the design needs: every piece stands on one square, and the game knows which squares are full.' },
    { t: 'The engine’s pathing grid', d: `Cells bigger than the squares. An order walks to the nearest pathing node, so ${64 - GRID.inside} of 64 squares can’t be stood on and ${GRID.shared} share a node with a neighbour.` },
    { t: 'Make the grid finer?', d: 'Cells the size of the squares would fix it, at 40% more memory on every WoW server. Not an option.' },
    { t: 'Invisible bunnies', d: 'One invisible creature at the centre of each square, each with its own string id. Pieces walk to and target a bunny, and a bunny knows if its square is full.' },
  ];
  const START = [['A', 'P', 4, 1], ['A', 'P', 3, 1], ['A', 'N', 6, 0], ['A', 'B', 2, 0], ['A', 'K', 4, 0], ['H', 'P', 4, 6], ['H', 'P', 3, 6], ['H', 'N', 1, 7], ['H', 'K', 4, 7]];
  const ORDERS = [[4, 1, 4, 3], [3, 1, 3, 3], [6, 0, 5, 2]];   // e2-e4, d2-d4, g1-f3
  function land(step, c, r) { const p = sq(c, r); return step === 1 ? node(p.x, p.y) : p; }
  function freshGrid() { return { pcs: START.map(([fac, kind, c, r]) => ({ fac, kind, x: sq(c, r).x, y: sq(c, r).y, c, r })), log: [], sel: -1 }; }
  function order(G, step, i, c, r, t0) {
    const p = G.pcs[i], to = land(step, c, r), hit = squareOf(to.x, to.y);
    const clash = G.pcs.some((q, j) => j !== i && Math.hypot(q.x - to.x, q.y - to.y) < 4);
    const onX = Math.abs(((to.x - GX) % Q + Q) % Q) < 3, onY = Math.abs(((to.y - GY) % Q + Q) % Q) < 3;
    const res = clash ? 'clash' : hit && hit[0] === c && hit[1] === r && !onX && !onY ? 'ok' : 'off';
    const where = onX || onY || !hit ? 'between squares' : 'on ' + name(hit[0], hit[1]);
    G.log.unshift({ who: NAMES[p.fac][p.kind], sq: name(c, r), res, step, where });
    G.log.length = Math.min(G.log.length, 4);
    p.anim = { fx: p.x, fy: p.y, t0 }; p.x = to.x; p.y = to.y; p.want = sq(c, r); p.res = res; p.where = where; p.c = c; p.r = r;
  }
  function drawGrid(g, step, G, t, o) {
    T.use(g); g.clearRect(0, 0, W, H);
    board(g, GX, GY, Q);
    // highlight wanted squares
    G.pcs.forEach(p => { if (!p.want || p.res === 'ok') return; g.strokeStyle = C.gold; g.lineWidth = 3; g.setLineDash([5, 4]); g.strokeRect(p.want.x - Q / 2 + 2, p.want.y - Q / 2 + 2, Q - 4, Q - 4); g.setLineDash([]); });
    if (step === 1 || step === 2) {
      g.save(); g.beginPath(); g.rect(GX, GY, Q * 8, Q * 8); g.clip();
      const cell = step === 2 ? Q : CELL, ox = step === 2 ? GX : OX, oy = step === 2 ? GY : OY;
      g.strokeStyle = step === 2 ? 'rgba(47,174,99,.9)' : 'rgba(229,50,45,.9)'; g.lineWidth = 2; g.setLineDash([6, 5]);
      for (let x = ox; x <= GX + Q * 8 + cell; x += cell) { g.beginPath(); g.moveTo(x, GY); g.lineTo(x, GY + Q * 8); g.stroke(); }
      for (let y = oy; y <= GY + Q * 8 + cell; y += cell) { g.beginPath(); g.moveTo(GX, y); g.lineTo(GX + Q * 8, y); g.stroke(); }
      g.setLineDash([]); g.fillStyle = step === 2 ? 'rgba(47,174,99,.95)' : 'rgba(229,50,45,.95)';
      for (let x = ox + cell / 2; x < GX + Q * 8; x += cell) for (let y = oy + cell / 2; y < GY + Q * 8; y += cell) if (x > GX && y > GY) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
      g.restore();
    }
    // bunnies
    if (step === 3) {
      for (let c = 0; c < 8; c++) for (let r = 0; r < 8; r++) {
        const p = sq(c, r), d = (c + (7 - r) * 8) * .02, q = clamp((o.bunnyT - d) / .35), y = p.y - (1 - ease(q)) * 40;
        const full = G.pcs.some(pc => !pc.anim || t - pc.anim.t0 > 1 ? squareOf(pc.x, pc.y)?.[0] === c && squareOf(pc.x, pc.y)?.[1] === r : false);
        if (q > 0) BUNNY.draw(g, p.x, y + 10, { s: .62, a: q, on: full, ghost: o.seen });
      }
    }
    // pieces
    G.pcs.forEach((p, i) => {
      let x = p.x, y = p.y;
      if (p.anim) { const q = ease(clamp((t - p.anim.t0) / 1)); x = lerp(p.anim.fx, p.x, q); y = lerp(p.anim.fy, p.y, q); }
      piece(g, x, y, p.kind, p.fac, { r: 20, hi: G.sel === i, a: 1 });
      const done = !p.anim || t - p.anim.t0 > 1;
      const covered = G.pcs.some((q, j) => j !== i && q.res === 'clash' && Math.hypot(q.x - p.x, q.y - p.y) < 4);
      if (done && p.res === 'off' && !covered) { cross(g, p.want.x, p.want.y, 9, 1); T.label(p.where === 'between squares' ? 'between squares' : 'wanted ' + name(p.c, p.r) + ', got ' + p.where.slice(3), x, y + 32, 'center', C.redDk, 12); }
      if (done && p.res === 'clash') T.label('same spot', x, y + 32, 'center', C.redDk, 12);
      if (done && p.res === 'ok' && step === 3) T.label('sq_' + name(p.c, p.r), x, y + 32, 'center', C.ink, 12);
    });
    // right panel: the steps
    const RX = 580;
    STEPS.forEach((sx, i) => {
      const y = 30 + i * 56 + (i > step ? 36 : 0), on = i === step, hh = on ? 84 : 48;
      g.fillStyle = on ? '#fffaf0' : 'rgba(255,250,240,.45)'; g.strokeStyle = on ? C.navy : '#cdbf9f'; g.lineWidth = on ? 2.5 : 1.5; g.beginPath(); g.roundRect(RX, y, 450, hh, 8); g.fill(); g.stroke();
      text(g, `${i + 1}. ${sx.t}`, RX + 12, y + 22, '800 14px Montserrat, Jost, sans-serif', on ? C.ink : C.muted);
      if (on) wrap(g, sx.d, RX + 12, y + 40, 426, 16, '500 12.5px Jost, sans-serif', C.muted);
    });
    // memory bar
    const my = 300;
    text(g, step === 2 ? 'Server memory: +40% on every server' : step === 3 ? 'Server memory: unchanged (64 small creatures)' : 'Server memory: today’s grid', RX, my, '800 13px Montserrat, Jost, sans-serif', C.ink);
    const mw = 300, mem = step === 2 ? 1.4 : 1;
    g.fillStyle = '#e9e1d2'; g.fillRect(RX, my + 8, mw * 1.45, 16);
    g.fillStyle = C.blue; g.fillRect(RX, my + 8, mw, 16);
    if (step === 2) { const q = clamp(o.memT / 1.2); g.fillStyle = C.red; g.fillRect(RX + mw, my + 8, mw * .4 * q, 16); }
    // stats
    const sy = 350, rows = step === 1 ? [[`${GRID.inside}/64`, 'squares a piece can stand in'], [String(GRID.shared), 'squares sharing a node'], [String(GRID.nodes), 'pathing nodes on the board']]
      : step === 3 ? [['64/64', 'squares a piece can stand in'], ['0', 'squares sharing a target'], ['64', 'bunnies, each with a string id']]
      : step === 2 ? [['64/64', 'squares a piece can stand in'], ['+40%', 'memory, on every server'], ['no', 'shippable']]
      : [['64', 'squares the design needs'], ['?', 'what the engine gives'], ['', '']];
    rows.forEach(([v, n], i) => { if (!v) return; const x = RX + i * 152; text(g, v, x, sy + 22, '800 24px Montserrat, Jost, sans-serif', (step === 1 && i < 2) || (step === 2 && i) ? C.red : C.ink); text(g, n, x, sy + 40, '500 12px Jost, sans-serif', C.muted); });
    // order log
    text(g, 'Orders', RX, 430, '800 13px Montserrat, Jost, sans-serif', C.ink);
    G.log.forEach((l, i) => {
      const y = 452 + i * 22;
      text(g, `${l.who} → ${l.sq}`, RX, y, '500 13px Jost, sans-serif', C.ink);
      text(g, l.res === 'ok' ? (l.step === 3 ? 'on the bunny' : 'on the square') : l.res === 'clash' ? 'same spot as another piece' : l.where === 'between squares' ? 'stopped between squares' : 'ended ' + l.where, RX + 450, y, '600 13px Jost, sans-serif', l.res === 'ok' ? C.good : C.red, 'right');
    });
    if (!G.log.length) text(g, o.tour ? '' : 'Click one of your pieces (blue), then a square.', RX, 452, '500 13px Jost, sans-serif', C.muted);
    if (step === 3 && o.seen) T.label('What players see: no bunnies, just pieces that land on squares', GX + Q * 4, GY + Q * 8 + 0, 'center', C.ink, 13);
  }

  const SEG = 8.5;
  canvasDemo('grid', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, step: 0, G: freshGrid(), stepT: 0, key: '' };
    const tourBtn = $(s, '.cg-tour'), playBtn = $(s, '.cg-play'), segs = $$(s, '.cg-step'), seen = $(s, '.cg-seen');
    const setStep = i => { st.step = i; st.G = freshGrid(); st.stepT = st.t; segs.forEach((b, j) => b.classList.toggle('on', j === i)); };
    const free = () => { if (!st.tour) return; st.tour = false; st.t = 0; playBtn.classList.add('on'); tourBtn.classList.remove('on'); setStep(st.step); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); playBtn.classList.remove('on'); };
    playBtn.onclick = () => { st.tour = true; free(); };
    segs.forEach((b, i) => b.onclick = () => { st.tour = true; free(); setStep(i); });
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    cv.addEventListener('click', e => {
      if (st.tour) { free(); }
      const p = pt(e), G = st.G;
      const i = G.pcs.findIndex(q => q.fac === 'A' && Math.hypot(q.x - p.x, q.y - p.y) < 24);
      if (i >= 0) { G.sel = i; return; }
      const s2 = squareOf(p.x, p.y);
      if (G.sel >= 0 && s2) { order(G, st.step, G.sel, s2[0], s2[1], st.t); G.sel = -1; }
    });
    function frame(t) {
      let step, G, local;
      if (st.tour) {
        step = Math.floor(t / SEG) % 4; local = t % SEG;
        G = freshGrid();
        const times = step === 3 ? [2.4, 4.0, 5.6] : [1.0, 2.8, 4.6];
        if (step !== 2) ORDERS.forEach(([c0, r0, c, r], k) => { if (local >= times[k]) { const i = G.pcs.findIndex(q => q.c === c0 && q.r === r0 && q.fac === 'A'); order(G, step, i, c, r, times[k]); } });
        segs.forEach((b, j) => b.classList.toggle('on', j === step));
      } else { step = st.step; G = st.G; local = t; }
      const o = { tour: st.tour, seen: seen.checked && step === 3, bunnyT: st.tour ? local : t - st.stepT, memT: st.tour ? local - 1 : t - st.stepT };
      drawGrid(g, step, G, local, o);
      const key = step + '|' + st.tour; if (key === st.key) return; st.key = key;
      say($(s, '.cg-out'), STEPS[step].d);
    }
    apis.grid = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => SEG * 4 };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); frame(st.t); };
  });

  /* ---------------- slide 2: every piece's spells ---------------- */
  const MS = 17;   // mini-board square
  const SHAPE_CELLS = {   // [col, row] on a 5 x 3 mini board, caster at [1, 1] facing right
    front1: [[2, 1]], cone3: [[2, 0], [2, 1], [2, 2]], line3: [[2, 1], [3, 1], [4, 1]], bolt: [[4, 1]], area: [[2, 0], [3, 0], [4, 0], [2, 1], [3, 1], [4, 1], [2, 2], [3, 2], [4, 2]],
    adj: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]], aura: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]], debuff: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    heal: [[3, 0]], shield: [[1, 1]],
  };
  const FRIENDLY = { heal: 1, aura: 1, shield: 1 };
  function mini(g, x0, y0, sp, fac, kind, q) {
    for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) { g.fillStyle = (c + r) % 2 ? '#e4dccb' : '#a99cc0'; g.fillRect(x0 + c * MS, y0 + r * MS, MS, MS); }
    const cells = SHAPE_CELLS[sp.shape], col = FRIENDLY[sp.shape] ? '47,174,99' : '229,50,45', pulse = .35 + .25 * Math.sin(q * TAU);
    cells.forEach(([c, r]) => { g.fillStyle = `rgba(${col},${pulse})`; g.fillRect(x0 + c * MS + 1, y0 + r * MS + 1, MS - 2, MS - 2); });
    g.strokeStyle = '#6c5b86'; g.lineWidth = 1; g.strokeRect(x0, y0, MS * 5, MS * 3);
    const cx = x0 + MS * 1.5, cy = y0 + MS * 1.5, tc = sp.shape === 'heal' ? [3, 0] : sp.shape === 'bolt' ? [4, 1] : sp.shape === 'area' ? [3, 1] : [2, 1];
    const b = { x: x0 + (tc[0] + .5) * MS, y: y0 + (tc[1] + .5) * MS, allies: [], foes: [] };
    piece(g, cx, cy, kind, fac, { r: 7 });
    if (sp.shape === 'heal') piece(g, b.x, b.y, 'P', fac, { r: 6 });
    fx(g, sp.shape, fac, { x: cx, y: cy }, b, q, MS);
  }
  const ORDER = ['K', 'Q', 'B', 'N', 'R', 'P'];
  function drawSpells(g, fac, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    const other = fac === 'A' ? 'H' : 'A', rowH = 80, y0 = 28;
    text(g, 'Piece', 8, 18, '800 12px Montserrat, Jost, sans-serif', C.muted);
    text(g, 'Spell 1 (attack)', 250, 18, '800 12px Montserrat, Jost, sans-serif', C.muted);
    text(g, 'Spell 2', 645, 18, '800 12px Montserrat, Jost, sans-serif', C.muted);
    ORDER.forEach((kind, i) => {
      const y = y0 + i * rowH;
      g.fillStyle = i % 2 ? 'rgba(255,250,240,.55)' : 'rgba(255,250,240,.9)'; g.beginPath(); g.roundRect(0, y, 1040, rowH - 6, 8); g.fill();
      piece(g, 26, y + 36, kind, fac, { r: 19 }); piece(g, 60, y + 44, kind, other, { r: 12, a: .8 });
      const ny = wrap(g, NAMES[fac][kind], 82, y + 28, 150, 15, '800 13px Montserrat, Jost, sans-serif', C.ink);
      wrap(g, `${FAC[other].name}: ${NAMES[other][kind]}`, 82, ny + 16, 150, 13, '500 11px Jost, sans-serif', C.muted);
      SPELLS[kind].forEach((sp, j) => {
        const x = 245 + j * 398, q = ((t * .55 + i * .17 + j * .5) % 1);
        mini(g, x, y + 12, sp, fac, kind, q);
        const ic = icon(sp.i[fi(fac)]); if (ok(ic)) g.drawImage(ic, x + 94, y + 6, 26, 26);
        text(g, sp.n[fi(fac)], x + 126, y + 18, '800 14px Montserrat, Jost, sans-serif', C.ink);
        text(g, `Horde/Alliance: ${sp.n[fi(other)]}`.replace('Horde/Alliance', FAC[other].name), x + 126, y + 31, '500 10.5px Jost, sans-serif', C.muted);
        wrap(g, sp.d, x + 94, y + 50, 290, 13, '500 11.5px Jost, sans-serif', C.ink);
      });
    });
    // Medivh's cheats
    const cy = y0 + 6 * rowH + 4;
    g.fillStyle = '#fbe3e0'; g.beginPath(); g.roundRect(0, cy, 1040, 585 - cy - 2, 8); g.fill();
    if (ok(MEDIVH)) g.drawImage(MEDIVH, 10, cy + 14, 34, 34);
    text(g, 'Medivh cheats', 52, cy + 28, '800 14px Montserrat, Jost, sans-serif', C.redDk);
    text(g, 'at random, for drama', 52, cy + 44, '500 11px Jost, sans-serif', C.redDk);
    Object.values(CHEATS).forEach((ch, j) => {
      const x = 190 + j * 285, ic = icon(ch.i), q = .5 + .5 * Math.sin(t * 3 + j * 2);
      g.save(); g.shadowColor = `rgba(229,50,45,${q})`; g.shadowBlur = 12; if (ok(ic)) g.drawImage(ic, x, cy + 12, 34, 34); g.restore();
      text(g, ch.n, x + 42, cy + 24, '800 13px Montserrat, Jost, sans-serif', C.redDk);
      wrap(g, ch.d, x + 42, cy + 40, 230, 13, '500 11.5px Jost, sans-serif', C.ink);
    });
  }
  canvasDemo('spells', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, fac: 'A' };
    const bA = $(s, '.cs-a'), bH = $(s, '.cs-h');
    const set = f => { st.fac = f; bA.classList.toggle('on', f === 'A'); bH.classList.toggle('on', f === 'H'); };
    bA.onclick = () => { st.tour = false; set('A'); }; bH.onclick = () => { st.tour = false; set('H'); };
    function frame(t) { if (st.tour) set(Math.floor(t / 8) % 2 ? 'H' : 'A'); drawSpells(g, st.fac, t); }
    apis.spells = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => 16 };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); frame(st.t); };
  });

  window.__seek = (t, which = 'rules') => apis[which].seek(t);
  window.__dur = (which = 'rules') => apis[which].dur();
})();
