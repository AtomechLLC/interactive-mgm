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
  const BTN = ['Jab', 'Strong', 'Fierce', 'Short', 'Forward', 'Roundhouse'];
  const POS = ['Standing', 'Crouching', 'Jumping'];
  // [name, game-icons stand-in, colour, specials, super, reach 0-1, speed 0-1]
  const CHARS = [
    ['Ryu', 'fist', '#e8e2d0', ['Hadoken', 'Shoryuken', 'Tatsumaki Senpukyaku'], 'Shinku Hadoken', .5, .55],
    ['Ken', 'fist', '#e05a3a', ['Hadoken', 'Shoryuken', 'Tatsumaki Senpukyaku'], 'Shoryureppa', .5, .6],
    ['Chun-Li', 'high-kick', '#3d6ee8', ['Kikoken', 'Hyakuretsukyaku', 'Spinning Bird Kick'], 'Senretsukyaku', .55, .8],
    ['Guile', 'boot-kick', '#4c9a52', ['Sonic Boom', 'Flash Kick', null], 'Double Flash', .6, .5],
    ['Zangief', 'punch-blast', '#c2412c', ['Spinning Piledriver', 'Double Lariat', 'Banishing Flat'], 'Final Atomic Buster', .3, .3],
    ['Blanka', 'lightning-arc', '#5aa84a', ['Electric Thunder', 'Rolling Attack', 'Vertical Rolling'], 'Ground Shave Rolling', .4, .7],
    ['E. Honda', 'fist', '#3d4a9a', ['Hundred Hand Slap', 'Sumo Headbutt', 'Sumo Smash'], 'Oni-Musou', .4, .45],
    ['Dhalsim', 'fire-ray', '#d0a020', ['Yoga Fire', 'Yoga Flame', 'Yoga Teleport'], 'Yoga Inferno', .95, .3],
  ];
  const rnd = s => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

  scene('sf2-skeleton', {
    dur: 16,
    state: () => ({ c: 0, at: 0 }),
    init(s, st, api) { pointer(api.cv, (x, y, type) => { if (type !== 'down') return; CHARS.forEach((_, i) => { if (inBox(x, y, 70 + (i % 2) * 112, 96 + Math.floor(i / 2) * 116, 104, 108)) { api.manual(); st.c = i; st.at = st.t; } }); }); },
    draw(g, t, st, tour) {
      const ci = tour ? Math.floor(t / 2) % CHARS.length : st.c, at = tour ? Math.floor(t / 2) * 2 : st.at, s = t - at, [n, gi, col, sp, su, reach, speed] = CHARS[ci];
      panel(g, 14, 14, 236, 558, { title: 'Character select' });
      CHARS.forEach(([cn, cg, cc], i) => {
        const x = 70 + (i % 2) * 112, y = 96 + Math.floor(i / 2) * 116, on = i === ci;
        card(g, x, y, 104, 108, { fill: on ? '#fffaf0' : '#f3eee2', edge: on ? C.gold : '#cdbf9f', lw: on ? 5 : 2, shadow: false, r: 8 });
        GI.draw(g, cg, x, y - 12, 50, cc === '#e8e2d0' ? '#8a8270' : cc);
        text(g, cn, x, y + 36, { size: 13.5, w: 800 });
      });
      // the template: 18 normals, 3 specials, 1 super
      panel(g, 262, 14, 764, 558, { title: `${n}: the same 22 slots as everyone` });
      BTN.forEach((b, j) => text(g, b, 404 + j * 104, 58, { size: 13, w: 800, col: j < 3 ? '#8a1c15' : '#23306e' }));
      POS.forEach((p, r) => {
        const y = 100 + r * 66; text(g, p, 286, y, { align: 'left', size: 13, w: 800 });
        BTN.forEach((b, j) => {
          const x = 404 + j * 104, k = ease(ph(s, .1 + (r * 6 + j) * .03, .35 + (r * 6 + j) * .03)), rr = clamp(reach * .7 + rnd(ci * 31 + r * 7 + j) * .45), sp2 = clamp(speed * .6 + rnd(ci * 17 + r * 5 + j * 3) * .5) * (j % 3 === 0 ? 1.1 : j % 3 === 1 ? .8 : .55);
          card(g, x, y, 96, 54, { edge: '#cdbf9f', shadow: false, r: 8, lw: 2 });
          g.save(); g.globalAlpha = k;
          text(g, 'reach', x - 40, y - 10, { align: 'left', size: 9.5, col: C.muted }); g.fillStyle = col === '#e8e2d0' ? '#8a8270' : col; g.fillRect(x - 6, y - 14, 46 * rr, 7);
          text(g, 'speed', x - 40, y + 10, { align: 'left', size: 9.5, col: C.muted }); g.fillStyle = '#5d618c'; g.fillRect(x - 6, y + 6, 46 * clamp(sp2), 7);
          g.restore();
        });
      });
      text(g, 'Special moves', 286, 318, { align: 'left', size: 13, w: 800 });
      sp.forEach((m, j) => { const x = 470 + j * 186, k = ease(ph(s, .7 + j * .12, 1 + j * .12)); card(g, x, 318, 176, 50, { fill: m ? '#fde9b8' : 'rgba(255,250,240,.5)', edge: m ? '#e0a92d' : '#cdbf9f', shadow: false, r: 8, dash: m ? [] : [5, 5] }); g.save(); g.globalAlpha = k; wrap(g, m || 'open slot', x, 318 - (m && m.length > 18 ? 8 : 0), 164, { size: 13.5, w: 800, align: 'center', lh: 16, col: m ? '#7a4a00' : C.muted }); g.restore(); });
      text(g, 'Super', 286, 390, { align: 'left', size: 13, w: 800 });
      card(g, 470, 390, 176, 50, { fill: '#eadcfb', edge: '#a77fe0', shadow: false, r: 8 }); text(g, su, 470, 390, { size: 13.5, w: 800, col: '#4b2286', a: ease(ph(s, 1.1, 1.4)) });
      wrap(g, 'The template stays: 6 standing, 6 crouching, 6 jumping, 3 specials, 1 super. Only the contents change, so each character is easy to plan and easy to contrast.', 290, 446, 700, { size: 15, w: 700, lh: 20, col: C.navy });
      text(g, 'Reach and speed bars are illustrative; special and super names are Super Street Fighter II Turbo’s.', 290, 540, { align: 'left', size: 11.5, col: C.muted });
    },
    side(t, st, tour) { const ci = tour ? Math.floor(t / 2) % CHARS.length : st.c, c = CHARS[ci]; return { out: `<b>${c[0]}</b>: ${c[3].filter(Boolean).join(', ')}; super ${c[4]}.${c[3].includes(null) ? ' Only two specials, so one slot stays open.' : ''}` }; },
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
