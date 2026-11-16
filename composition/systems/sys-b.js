/* Design skeletons (MGM C4 M7, deck slides 215-222).
   'owl' (217): the slide's joke, "1. Draw some circles. 2. Draw the rest of the owl", then the same owl with a skeleton:
   the parts named first and filled one by one. "A design skeleton is like a sketch before you fill in details."
   'sf2-skeleton' (220): "Street Fighter has 6 attack buttons, meaning that each character has 6 standing moves, 6 crouching
   moves, and 6 jumping moves. On top of this, each character has 3 special moves, and a super." Specials and supers are
   from Super Street Fighter II Turbo; where a character has fewer than three specials, the slot stays open.
   'mtg-skeleton' (218, 222): the slide's Magic: The Gathering set skeleton (cards allotted per colour, split into creatures
   and spells, with general traits per slot), and the workshop sheets of slide 222. */
(function () {
  const { $, $$ } = FPF.kit;
  const { icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C, TAU = Math.PI * 2;
  const ph = (t, a, b) => clamp((t - a) / (b - a));

  // ---------- draw the rest of the owl ----------
  // parts in skeleton order: [name, draw(g, k)]
  const BR = '#7a5a3a', LT = '#c9a77a', DK = '#4a3420';
  const PARTS = [
    ['Body', (g, x, y) => { g.fillStyle = LT; g.beginPath(); g.ellipse(x, y + 50, 72, 100, 0, 0, TAU); g.fill(); }],
    ['Head', (g, x, y) => { g.fillStyle = BR; g.beginPath(); g.ellipse(x, y - 70, 66, 56, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - 58, y - 100); g.lineTo(x - 46, y - 150); g.lineTo(x - 26, y - 112); g.fill(); g.beginPath(); g.moveTo(x + 58, y - 100); g.lineTo(x + 46, y - 150); g.lineTo(x + 26, y - 112); g.fill(); }],
    ['Eyes', (g, x, y) => { [-26, 26].forEach(dx => { g.fillStyle = '#f2d36b'; g.beginPath(); g.arc(x + dx, y - 74, 19, 0, TAU); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(x + dx, y - 74, 9, 0, TAU); g.fill(); }); g.fillStyle = '#e3a33a'; g.beginPath(); g.moveTo(x - 8, y - 54); g.lineTo(x + 8, y - 54); g.lineTo(x, y - 36); g.fill(); }],
    ['Wings', (g, x, y) => { g.fillStyle = DK; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(x + s * 62, y + 40, 30, 86, s * .15, 0, TAU); g.fill(); }); }],
    ['Feathers', (g, x, y) => { g.strokeStyle = BR; g.lineWidth = 2; for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) { const fx = x + c * 22 + (r % 2) * 11, fy = y + 10 + r * 28; g.beginPath(); g.arc(fx, fy, 9, .2, Math.PI - .2); g.stroke(); } }],
    ['Feet and branch', (g, x, y) => { g.fillStyle = '#6b4a2a'; g.fillRect(x - 160, y + 150, 320, 18); g.fillStyle = '#e3a33a'; [-24, 24].forEach(dx => { for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(x + dx + k * 8, y + 150, 4, 9, 0, 0, TAU); g.fill(); } }); }],
  ];
  function circles(g, x, y, k) {
    g.strokeStyle = 'rgba(90,90,100,.75)'; g.lineWidth = 2.5;
    [[x, y - 70, 64, 56], [x, y + 50, 76, 102]].forEach(([cx, cy, rx, ry], i) => { const kk = clamp(k * 2 - i); if (kk <= 0) return; for (let p = 0; p < 2; p++) { g.beginPath(); g.ellipse(cx + p * 4, cy - p * 3, rx - p * 3, ry + p * 4, p * .05, 0, TAU * kk); g.stroke(); } });
  }
  scene('owl', {
    dur: 16,
    draw(g, t) {
      // left: the joke
      panel(g, 14, 14, 500, 558, { title: 'How to draw an owl' });
      const L = 264, Y = 270;
      text(g, '1. Draw some circles', 140, 520, { size: 16, w: 700 });
      text(g, '2. Draw the rest of the owl', 380, 520, { size: 16, w: 700, a: t > 2.4 ? 1 : .3 });
      if (t < 2.4) circles(g, L, Y, ph(t, .3, 1.8));
      else { g.save(); g.translate(L, Y); g.scale(.95, .95); PARTS.forEach(([, d]) => d(g, 0, 0)); g.restore(); if (t < 4.5) text(g, '…wait, how?', L, 70, { size: 20, w: 800, col: C.redDk, a: ph(t, 2.6, 2.9) }); }
      // right: with a skeleton
      panel(g, 526, 14, 500, 558, { title: 'With a design skeleton' });
      const R = 668, k0 = ph(t, 4.5, 5.2);
      g.save(); g.globalAlpha = k0;
      circles(g, R, Y, 1);
      PARTS.forEach(([n, d], i) => {
        const at = 5.6 + i * 1.3, on = t >= at, k = ease(ph(t, at, at + .5)), y = 70 + i * 66;
        card(g, 930, y, 170, 50, { fill: on ? '#d8f0df' : 'rgba(255,250,240,.6)', edge: on ? '#5fb47c' : '#cdbf9f', shadow: false, r: 8, lw: 2 });
        text(g, n, 930, y, { size: 15, w: 800, col: on ? C.good : C.muted });
        if (k > 0) { g.save(); g.globalAlpha *= k; g.translate(R, Y); g.scale(.95, .95); d(g, 0, 0); g.restore(); }
      });
      g.restore();
      if (t > 13.6) text(g, 'Name the parts first, then fill each one in.', 776, 520, { size: 16, w: 800, col: C.navy, a: ph(t, 13.6, 14) });
    },
    side(t) { return { out: t < 4.5 ? 'The joke on slide 217: the hard part is everything between the circles and the owl.' : 'A design skeleton lists the parts before any detail, so the work in between has a plan.' }; },
  });

  // ---------- Street Fighter II skeleton ----------
  // Every fighter gets the same 22 slots. What tells them apart is which jobs their three specials take on, so the
  // slide lays the eight fighters side by side against those jobs; a job only one fighter fills is that fighter's identity.
  // [key, label, game-icons glyph, tone]
  const JOBS = [
    ['proj', 'Projectile', 'fire-ray', TONE.orange],
    ['aa', 'Anti-air', 'high-kick', TONE.blue],
    ['rush', 'Rush in', 'sprint', TONE.red],
    ['burst', 'Close burst', 'spiky-explosion', TONE.pink],
    ['grab', 'Command throw', 'grab', TONE.green],
    ['tele', 'Teleport', 'teleport', TONE.teal],
  ];
  const JI = Object.fromEntries(JOBS.map((j, i) => [j[0], i]));
  // specials are [name, short name, job, input]; null is an open slot. reach and walk speed are 1-5 tiers, read off play.
  const CHARS = [
    { n: 'Ryu', gi: 'fist', col: '#8a8270', arch: 'all-rounder', reach: 3, speed: 3,
      sp: [['Hadoken', 'Hadoken', 'proj', '↓↘→ P'], ['Shoryuken', 'Shoryuken', 'aa', '→↓↘ P'], ['Tatsumaki Senpukyaku', 'Tatsumaki', 'rush', '↓↙← K']],
      su: ['Shinku Hadoken', '↓↘→↓↘→ P'], only: 'The reference build: one special each for the three most common jobs. Ryu leans on the Hadoken to hold the opponent out.' },
    { n: 'Ken', gi: 'punch-blast', col: '#e05a3a', arch: 'all-rounder, closer in', reach: 3, speed: 3,
      sp: [['Hadoken', 'Hadoken', 'proj', '↓↘→ P'], ['Shoryuken', 'Shoryuken', 'aa', '→↓↘ P'], ['Tatsumaki Senpukyaku', 'Tatsumaki', 'rush', '↓↙← K']],
      su: ['Shoryureppa', '↓↘→↓↘→ P'], only: 'Same row as Ryu. The difference sits inside the slots: his Shoryuken hits more times and his Tatsumaki travels further, so he plays closer.' },
    { n: 'Chun-Li', gi: 'high-kick', col: '#3d6ee8', arch: 'speed and pokes', reach: 4, speed: 5,
      sp: [['Kikoken', 'Kikoken', 'proj', '←↙↓↘→ P'], ['Hyakuretsukyaku', 'Hyakuretsukyaku', 'burst', 'mash K'], ['Spinning Bird Kick', 'Spinning Bird', 'rush', 'charge ↓↑ K']],
      su: ['Senretsukyaku', 'charge ←→←→ K'], only: 'The fastest walker, with no anti-air special: she answers jumps with her long normals instead of a move.' },
    { n: 'Guile', gi: 'sound-waves', col: '#4c9a52', arch: 'fortress', reach: 4, speed: 3,
      sp: [['Sonic Boom', 'Sonic Boom', 'proj', 'charge ←→ P'], ['Flash Kick', 'Flash Kick', 'aa', 'charge ↓↑ K'], null],
      su: ['Double Flash', 'charge ↙↘↙↗ K'], only: 'Two specials, so one slot stays open. Both are charge moves: he holds down-back and waits for the opponent to come to him.' },
    { n: 'Zangief', gi: 'grapple', col: '#c2412c', arch: 'grappler', reach: 2, speed: 1,
      sp: [['Spinning Piledriver', 'Piledriver', 'grab', '360 P'], ['Double Lariat', 'Double Lariat', 'aa', 'P P P'], ['Banishing Flat', 'Banishing Flat', 'rush', '→↘↓ P']],
      su: ['Final Atomic Buster', '720 P'], only: 'The only command throw, and no projectile: he walks in slowly, and one correct read up close does heavy damage.' },
    { n: 'Blanka', gi: 'lightning-arc', col: '#5aa84a', arch: 'wild card', reach: 3, speed: 4,
      sp: [['Electric Thunder', 'Electric Thunder', 'burst', 'mash P'], ['Rolling Attack', 'Rolling Attack', 'rush', 'charge ←→ P'], ['Vertical Rolling', 'Vertical Rolling', 'aa', 'charge ↓↑ K']],
      su: ['Ground Shave Rolling', 'charge ←→←→ P'], only: 'No projectile, but the most varied kit: a body rush across the screen, a roll upward and an electric burst up close.' },
    { n: 'E. Honda', gi: 'heavy-fall', col: '#3d4a9a', arch: 'heavy rush', reach: 3, speed: 2,
      sp: [['Hundred Hand Slap', 'Hundred Hand Slap', 'burst', 'mash P'], ['Sumo Headbutt', 'Headbutt', 'rush', 'charge ←→ P'], ['Sumo Smash', 'Sumo Smash', 'rush', 'charge ↓↑ K']],
      su: ['Oni-Musou', 'charge ←→←→ P'], only: 'Two of three specials rush in, so he crosses the screen in one move, then stays there with the Hundred Hand Slap.' },
    { n: 'Dhalsim', gi: 'flame', col: '#d0a020', arch: 'long-range zoner', reach: 5, speed: 1,
      sp: [['Yoga Fire', 'Yoga Fire', 'proj', '↓↘→ P'], ['Yoga Flame', 'Yoga Flame', 'aa', '←↙↓↘→ P'], ['Yoga Teleport', 'Teleport', 'tele', '→↓↘ PPP']],
      su: ['Yoga Inferno', '←↙↓↘→ ×2 P'], only: 'The only teleport and the longest limbs: his normals reach about half the screen, while he walks slowest.' },
  ];
  const has = (c, j) => c.sp.filter(m => m && m[2] === JOBS[j][0]);
  const COUNT = JOBS.map((_, j) => CHARS.filter(c => has(c, j).length).length);
  // matrix geometry
  const MX0 = 206, MW = 104, RY0 = 126, RH = 35, RX = MX0 + MW * 6, SX = RX + 92;
  const colX = j => MX0 + MW * j + MW / 2, rowY = i => RY0 + i * RH;
  // the walk-through: each fighter in turn, then the two jobs only one fighter fills
  function sview(t, st, tour) {
    if (!tour) return st;
    if (t < 12) { const c = Math.floor(t / 1.5); return { c, job: -1, at: c * 1.5 }; }
    return t < 15 ? { c: 4, job: JI.grab, at: 12 } : { c: 7, job: JI.tele, at: 15 };
  }
  function fit(g, s, w, size, weight = 700) { g.save(); let k = size; g.font = `${weight} ${k}px Jost, sans-serif`; while (k > 8.5 && g.measureText(s).width > w) { k -= .5; g.font = `${weight} ${k}px Jost, sans-serif`; } g.restore(); return k; }
  function pips(g, x, y, n, col) { for (let q = 0; q < 5; q++) { g.fillStyle = q < n ? col : 'rgba(150,140,115,.22)'; g.beginPath(); g.roundRect(x + q * 13, y - 5, 10, 10, 2); g.fill(); } }

  scene('sf2-skeleton', {
    dur: 18,
    state: () => ({ c: 0, job: -1, at: 0 }),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        JOBS.forEach((_, j) => { if (inBox(x, y, colX(j), 70, MW - 4, 56)) { api.manual(); st.job = st.job === j ? -1 : j; } });
        CHARS.forEach((_, i) => { if (y > rowY(i) - RH / 2 && y < rowY(i) + RH / 2 && x > 22 && x < 1018) { api.manual(); if (st.c !== i) st.at = st.t; st.c = i; } });
      });
    },
    draw(g, t, st, tour) {
      const v = sview(t, st, tour), c = CHARS[v.c], s = t - v.at;
      // ---- the comparison: eight fighters against the jobs a special can do ----
      panel(g, 14, 14, 1012, 398, { title: 'Eight fighters, the same three special slots: which jobs does each fill?' });
      text(g, 'Fighter', 30, 70, { align: 'left', size: 12, w: 800, col: C.muted });
      JOBS.forEach(([, label, gi, tone], j) => {
        const x = colX(j), on = v.job === j, solo = COUNT[j] === 1;
        card(g, x, 72, MW - 6, 58, { fill: on ? tone.fill : 'rgba(255,250,240,.7)', edge: on ? tone.edge : 'rgba(205,191,159,.7)', lw: on ? 3 : 1.5, shadow: false, r: 8 });
        GI.draw(g, gi, x, 56, 20, tone.edge);
        text(g, label, x, 77, { size: 12, w: 800, col: tone.col });
        if (solo) chip(g, 'only one fighter', x, 93, { fill: '#fff3c4', edge: C.gold, col: '#7a4a00', size: 9.5, h: 15, pad: 10 });
        else text(g, `${COUNT[j]} of 8`, x, 93, { size: 10.5, w: 700, col: C.muted });
      });
      text(g, 'Reach', RX + 44, 66, { size: 12, w: 800, col: C.muted }); text(g, 'normals', RX + 44, 82, { size: 10, col: C.muted });
      text(g, 'Walk speed', SX + 34, 66, { size: 12, w: 800, col: C.muted }); text(g, 'tier, 1 to 5', SX + 34, 82, { size: 10, col: C.muted });
      CHARS.forEach((ch, i) => {
        const y = rowY(i), sel = i === v.c, dim = v.job >= 0 && !has(ch, v.job).length;
        if (sel) { g.fillStyle = 'rgba(232,180,60,.16)'; g.strokeStyle = C.gold; g.lineWidth = 2.5; g.beginPath(); g.roundRect(22, y - RH / 2 + 1, 996, RH - 2, 8); g.fill(); g.stroke(); }
        g.save(); g.globalAlpha = dim ? .3 : 1;
        GI.draw(g, ch.gi, 42, y, 24, ch.col);
        text(g, ch.n, 62, y - 7, { align: 'left', size: 14, w: 800 });
        text(g, ch.arch, 62, y + 9, { align: 'left', size: 10.5, col: C.muted, it: true });
        JOBS.forEach(([, , , tone], j) => {
          const ms = has(ch, j), x = colX(j);
          if (!ms.length) { g.fillStyle = 'rgba(150,140,115,.35)'; g.fillRect(x - 8, y - 1, 16, 2); return; }
          const solo = COUNT[j] === 1;
          card(g, x, y, MW - 8, RH - 6, { fill: tone.fill, edge: solo ? C.gold : tone.edge, lw: solo ? 3 : 1.5, shadow: false, r: 6 });
          if (ms.length > 1) ms.forEach((m, q) => text(g, m[1], x, y - 6 + q * 12, { size: fit(g, m[1], MW - 16, 10.5), w: 700, col: tone.col }));
          else { text(g, ms[0][1], x, y - 5, { size: fit(g, ms[0][1], MW - 16, 11.5), w: 700, col: tone.col }); text(g, ms[0][3], x, y + 8, { size: 9, w: 600, col: tone.col, a: .8 }); }
        });
        pips(g, RX + 12, y, ch.reach, '#8a6a3a');
        pips(g, SX + 2, y, ch.speed, '#5d618c');
        g.restore();
      });
      // ---- the skeleton: the chosen fighter's 22 slots ----
      panel(g, 14, 422, 1012, 150, { title: `${c.n}: the same 22 slots as everyone, filled ${c.n === 'Ken' ? 'almost like Ryu' : 'their own way'}` });
      const k0 = ease(ph(s, 0, .35));
      text(g, '18 normals', 30, 462, { align: 'left', size: 12, w: 800 });
      for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) { g.fillStyle = q < 3 ? '#e0b4ae' : '#b9c3e8'; g.beginPath(); g.roundRect(30 + q * 15, 474 + r * 15, 12, 12, 2); g.fill(); }
      text(g, 'the same for all 8', 30, 528, { align: 'left', size: 10, col: C.muted, it: true });
      c.sp.forEach((m, j) => {
        const x = 230 + j * 170, y = 488, kk = ease(ph(s, .1 + j * .12, .45 + j * .12));
        if (!m) { card(g, x, y, 160, 54, { fill: 'rgba(255,250,240,.5)', edge: '#cdbf9f', dash: [5, 5], shadow: false, r: 8 }); text(g, 'open slot', x, y, { size: 13, w: 700, col: C.muted, a: kk }); return; }
        const tone = JOBS[JI[m[2]]][3];
        card(g, x, y, 160, 54, { fill: tone.fill, edge: COUNT[JI[m[2]]] === 1 ? C.gold : tone.edge, lw: COUNT[JI[m[2]]] === 1 ? 3.5 : 2, shadow: false, r: 8 });
        g.save(); g.globalAlpha = kk;
        text(g, JOBS[JI[m[2]]][1].toUpperCase(), x, y - 16, { size: 9.5, w: 800, col: tone.col });
        text(g, m[0], x, y + 1, { size: fit(g, m[0], 148, 13.5, 800), w: 800, col: tone.col });
        text(g, m[3], x, y + 17, { size: 10.5, w: 600, col: tone.col });
        g.restore();
      });
      text(g, 'specials', 400, 524, { size: 10, col: C.muted, it: true });
      card(g, 750, 488, 160, 54, { fill: TONE.purple.fill, edge: TONE.purple.edge, shadow: false, r: 8 });
      g.save(); g.globalAlpha = ease(ph(s, .5, .85));
      text(g, 'SUPER', 750, 472, { size: 9.5, w: 800, col: TONE.purple.col });
      text(g, c.su[0], 750, 489, { size: fit(g, c.su[0], 148, 13.5, 800), w: 800, col: TONE.purple.col });
      text(g, c.su[1], 750, 505, { size: 10.5, w: 600, col: TONE.purple.col });
      g.restore();
      text(g, 'Reach', 862, 474, { align: 'left', size: 11, w: 700 }); pips(g, 930, 474, c.reach, '#8a6a3a');
      text(g, 'Walk', 862, 498, { align: 'left', size: 11, w: 700 }); pips(g, 930, 498, c.speed, '#5d618c');
      wrap(g, c.only, 30, 548, 980, { size: 13.5, w: 700, lh: 17, col: C.navy, a: ease(ph(s, .6, 1)) });
    },
    side(t, st, tour) {
      const v = sview(t, st, tour), c = CHARS[v.c];
      if (v.job >= 0) {
        const who = CHARS.filter(ch => has(ch, v.job).length).map(ch => ch.n), [, label] = JOBS[v.job];
        return { out: who.length === 1 ? `<b>${label}</b>: only ${who[0]} has one. A job that one fighter fills alone is that fighter’s identity.` : `<b>${label}</b>: ${who.length} of 8 (${who.join(', ')}). Shared jobs make fighters comparable; the moves inside them still differ.` };
      }
      const open = c.sp.includes(null) ? ' One slot stays open.' : '';
      return { out: `<b>${c.n}</b>, ${c.arch}: ${c.sp.filter(Boolean).map(m => `${m[0]} (${JOBS[JI[m[2]]][1].toLowerCase()})`).join(', ')}; super ${c.su[0]}.${open}` };
    },
  });

  // ---------- Magic: The Gathering set skeleton ----------
  const COLS = [['W', 'White', '#f4ecd0', '#a08a40'], ['U', 'Blue', '#d6e4f6', '#3d6ea8'], ['B', 'Black', '#d9d4d8', '#3a3040'], ['R', 'Red', '#f6d6cc', '#b0381e'], ['G', 'Green', '#d6ecd2', '#3a7a3a']];
  const SK = {
    W: ['creature, small', 'creature, small, flying, gravetwist', 'creature, small, first strike', 'creature, small, flash, ETB – life gain', 'creature, medium, vigilance', 'creature, medium, flying', 'sorcery – token making, flying', 'instant, power boost', 'instant, enchantment removal', 'enchantment, creature removal'],
    U: ['creature, small, flying', 'creature, small, shroud', 'creature, medium, flying', 'creature, large', 'instant, hard counterspell, gravetwist', 'instant, soft counterspell', 'instant, “bounce”', 'sorcery, card drawing', 'sorcery', 'enchantment, aura, creature removal'],
    B: ['creature, small', 'creature, small, flying', 'creature, small, deathtouch, gravetwist', 'creature, medium, intimidate', 'creature, medium, ETB – raise dead', 'creature, medium', 'instant, creature kill, gravetwist', 'sorcery, discard', 'sorcery, drain creature', 'enchantment, aura, positive effect, gravetwist'],
    R: ['creature, small – ETB direct damage to player', 'creature, small, first strike', 'creature, small', 'creature, medium, haste', 'creature, medium, trample', 'instant – direct damage to creatures', 'instant – direct damage to either', 'instant – power pump', 'sorcery – panic, gravetwist', 'enchantment, aura, positive effect'],
    G: ['creature, small, gravetwist, ETB – artifact/enchantment removal', 'creature, small, regeneration', 'creature, small, deathtouch', 'creature, medium, reach, gravetwist', 'creature, medium', 'creature, medium', 'creature, large, trample', 'instant, power/toughness boost', 'sorcery, life gain', 'enchantment, aura, positive effect'],
  };
  const TRAITS = [['Creature', /creature,|creature –/], ['Flying', /flying/], ['Removal', /removal|kill|direct damage to creatures|either|bounce/], ['Damage', /direct damage/], ['Counter', /counterspell/], ['Card draw', /card draw/], ['Life gain', /life gain/], ['Pump', /pump|boost/], ['Aura', /aura/], ['Gravetwist', /gravetwist/]];
  const SHEETS = {
    animals: { title: 'Workshop: three animals (and more) and their roles', head: ['Name', 'Role'], rows: [['Ogre', 'Bruiser (meat shield)'], ['Mimic', 'Trap'], ['Mind Flayer', 'Mind controller'], ['Lich', 'Summoner'], ['Devil', 'Hybrid melee / caster'], ['Dragon', 'Shapeshifting area damage']] },
    spells: { title: 'Workshop: a list of spells', head: ['Spell', 'Source', 'Target', 'Mechanic', 'Timing'], rows: [['Heal', 'Player', 'Self', 'Heal', 'Reactive'], ['Curse', 'Ally', 'Enemy', 'Heal enemy + heal caster', 'Coactive or proactive'], ['Encase', 'Enemy', 'Player', 'Heal player + stun player', 'Proactive'], ['Remedy', 'Environment', 'Enemy', 'Heal over time', 'Coactive'], ['Repair Turret', 'Enemy', 'Environment', 'Repairing a turret', 'Reactive'], ['Timebomb Flower', 'Self', 'Environment', 'Damage area', 'Proactive'], ['Heat Up', 'Enemy', 'Enemy', 'Increase attack', 'Proactive'], ['Reconstruct', 'Environment', 'Environment', 'Heal', 'Reactive'], ['Gravity Arrow', 'Self', 'Environment', 'Create a gravity zone', 'Coactive']] },
  };
  const MX = j => 120 + j * 150, MY = r => 60 + r * 40;
  function mview(t, st, tour) { if (!tour) return st; return t < 4 ? { tab: 'set', trait: -1 } : t < 7 ? { tab: 'set', trait: 1 } : t < 10 ? { tab: 'set', trait: 2 } : t < 13 ? { tab: 'set', trait: 4 } : t < 16.5 ? { tab: 'animals', trait: -1 } : { tab: 'spells', trait: -1 }; }

  scene('mtg-skeleton', {
    dur: 20,
    state: () => ({ tab: 'set', trait: -1 }),
    init(s, st, api) {
      const sync = () => { $$(s, '.mg-tab').forEach(b => b.classList.toggle('on', b.dataset.v === st.tab)); };
      $$(s, '.mg-tab').forEach(b => b.onclick = () => { api.manual(); st.tab = b.dataset.v; sync(); });
      pointer(api.cv, (x, y, type) => { if (type !== 'down' || st.tab !== 'set') return; TRAITS.forEach((_, i) => { if (inBox(x, y, 872 + (i % 2) * 76, 120 + Math.floor(i / 2) * 44, 72, 36)) { api.manual(); st.trait = st.trait === i ? -1 : i; } }); });
      sync();
    },
    draw(g, t, st, tour) {
      const v = mview(t, st, tour);
      if (v.tab !== 'set') {
        const S = SHEETS[v.tab], n = S.head.length, W = n === 2 ? [220, 320] : [170, 130, 130, 230, 190], x0 = 520 - W.reduce((a, b) => a + b, 0) / 2;
        panel(g, 14, 14, 1012, 558, { title: S.title });
        let x = x0; S.head.forEach((h, j) => { chip(g, h, x + W[j] / 2, 64, { ...[TONE.pink, TONE.blue, TONE.purple, TONE.orange, TONE.teal][j], size: 14, width: W[j] - 10 }); x += W[j]; });
        S.rows.forEach((r, i) => { let x = x0; const y = 110 + i * (n === 2 ? 64 : 48); r.forEach((c, j) => { card(g, x + W[j] / 2, y, W[j] - 10, n === 2 ? 52 : 40, { fill: j ? '#fdf6c8' : '#fbdcec', edge: '#e0d08a', shadow: false, r: 4, lw: 1.5 }); text(g, c, x + W[j] / 2, y, { size: n === 2 ? 16 : 13, w: j ? 600 : 800 }); x += W[j]; }); if (n > 2 && i === 4) { g.fillStyle = '#3d4270'; g.fillRect(x0, y + 24, W.reduce((a, b) => a + b, 0) - 10, 3); } });
        return;
      }
      // the set skeleton: five colours, ten slots each
      COLS.forEach(([k, name, fill, edge], j) => {
        chip(g, `${name} (C${k})`, MX(j), 30, { fill, edge, col: edge, size: 13, width: 140 });
        SK[k].forEach((s, r) => {
          const hit = v.trait >= 0 && TRAITS[v.trait][1].test(s), dim = v.trait >= 0 && !hit;
          card(g, MX(j), MY(r) + 20, 142, 36, { fill: hit ? '#fff3c4' : fill, edge: hit ? C.gold : edge + '66', lw: hit ? 3 : 1.5, shadow: false, r: 5, a: dim ? .35 : 1 });
          g.save(); g.globalAlpha = dim ? .35 : 1;
          text(g, `C${k}${String(r + 1).padStart(2, '0')}`, MX(j) - 66, MY(r) + 12, { align: 'left', size: 9.5, w: 800, col: edge });
          const lines = wrap(g, s, 0, 0, 132, { size: 10, draw: false });
          text(g, lines.length > 1 ? lines[0] + '…' : lines[0], MX(j) - 66, MY(r) + 26, { align: 'left', size: 10, col: C.ink });
          g.restore();
        });
      });
      // traits and coverage
      panel(g, 830, 14, 196, 558, { title: 'Traits' });
      TRAITS.forEach(([n], i) => chip(g, n, 872 + (i % 2) * 76, 120 + Math.floor(i / 2) * 44, { ...(v.trait === i ? TONE.navy : TONE.grey), size: 11.5, width: 72 }));
      text(g, v.trait >= 0 ? `${TRAITS[v.trait][0]} per colour` : 'Click a trait', 846, 352, { align: 'left', size: 13, w: 800 });
      if (v.trait >= 0) COLS.forEach(([k, name, fill, edge], j) => {
        const c = SK[k].filter(s => TRAITS[v.trait][1].test(s)).length, y = 380 + j * 32;
        text(g, name, 846, y, { align: 'left', size: 12, w: 700 });
        for (let q = 0; q < Math.max(c, 0); q++) { g.fillStyle = edge; g.fillRect(900 + q * 16, y - 6, 12, 12); }
        if (!c) text(g, 'none: a gap, or a choice', 900, y, { align: 'left', size: 11, col: C.redDk, it: true });
      });
    },
    side(t, st, tour) {
      const v = mview(t, st, tour);
      if (v.tab === 'animals') return { out: 'The animals workshop: each creature gets a name and a role first, before any description, uniqueness or interactions.' };
      if (v.tab === 'spells') return { out: 'The spells workshop: each spell is a source, a target, a mechanic and a timing, filled into a shared grid.' };
      if (v.trait < 0) return { out: 'Fifty common slots: ten per colour, creatures first, then spells, each with only general traits. The skeleton is the set’s scope before any card exists.' };
      const per = COLS.map(([k, n]) => `${n} ${SK[k].filter(s => TRAITS[v.trait][1].test(s)).length}`).join(', ');
      return { out: `<b>${TRAITS[v.trait][0]}</b>: ${per}.` };
    },
  });
})();
