/* Composition across systems (MGM C4 M7, deck slides 193-201).
   'alchemy-grid' (193-194): Breath of the Wild's "alchemy engine" rests on five major effects (Burnable, Electrifiable,
   Pushable, Freezable, Liftable); roguelikes add rules such as searing meat and lighting lamps. Every cell here is computed
   from an object's tags and one rule per tag, never written by hand, so a new object fills its whole row for free.
   'loot-roll' (197): "The weapon is given a power value, a type, then has a variety of different ways those can be combined
   and expressed, granting different keywords at different magnitudes." Affixes here are this page's.
   'bespoke-procedural' (198-199): Diablo III's runes are authored skill by skill; Path of Exile's support gems combine.
   'systems-reel' (193-201): the deck's nine examples, each reduced to parts and the whole they make. */
(function () {
  const { $, $$ } = FPF.kit;
  const { icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C, TAU = Math.PI * 2;
  const ph = (t, a, b) => clamp((t - a) / (b - a));

  // ---------- alchemy grid ----------
  const ELEM = [['Fire', 'flame', '#e5622d'], ['Ice', 'snowflake-1', '#5ab4e6'], ['Lightning', 'lightning-arc', '#d6aa28'], ['Wind', 'tornado', '#5fb3bb']];
  // one rule per tag and element: written once
  const RULES = { 'Burnable|Fire': 'burns', 'Freezable|Ice': 'freezes', 'Electrifiable|Lightning': 'conducts', 'Pushable|Wind': 'blown away', 'Cookable|Fire': 'sears: heals more', 'Lightable|Fire': 'lights up', 'Meltable|Fire': 'melts' };
  const TAGS = ['Burnable', 'Electrifiable', 'Pushable', 'Freezable', 'Cookable', 'Lightable', 'Meltable'];
  const BOTW = { Burnable: 1, Electrifiable: 1, Pushable: 1, Freezable: 1 };
  const OBJ = [
    ['Grass', 'grass', '#4c9a52', ['Burnable']], ['Wooden shield', 'round-shield', '#a0703a', ['Burnable', 'Pushable']],
    ['Metal sword', 'broadsword', '#7d8aa0', ['Electrifiable']], ['Boulder', 'rock', '#8b8fa8', []],
    ['Meat', 'steak', '#c2412c', ['Cookable', 'Freezable']], ['Lamp', 'lantern', '#d0a020', ['Lightable']], ['Pond', 'water-drop', '#3f8fd6', ['Freezable', 'Electrifiable']],
  ];
  const EXTRA = [['Wooden crate', 'wooden-crate', '#a0703a', ['Burnable', 'Pushable']], ['Iron barrel', 'barrel', '#7d8aa0', ['Electrifiable', 'Pushable']], ['Ice block', 'ice-cube', '#5ab4e6', ['Meltable', 'Pushable']]];
  const GX = 236, CW = 136, RH = 50, GY0 = 96;
  const cell = (tags, e) => tags.map(tg => RULES[tg + '|' + e]).filter(Boolean);

  scene('alchemy-grid', {
    dur: 15,
    state: () => ({ extra: [], at: {}, tags: ['Burnable', 'Pushable'] }),
    init(s, st, api) {
      const box = $(s, '.ag-tags');
      box.innerHTML = TAGS.map(tg => `<button class="btn" data-t="${tg}">${tg}</button>`).join('');
      const sync = () => $$(box, '.btn').forEach(b => b.classList.toggle('on', st.tags.includes(b.dataset.t)));
      $$(box, '.btn').forEach(b => b.onclick = () => { st.tags = st.tags.includes(b.dataset.t) ? st.tags.filter(x => x !== b.dataset.t) : [...st.tags, b.dataset.t]; sync(); });
      $(s, '.ag-add').onclick = () => { if (st.tour) { api.manual(); st.extra = []; } if (st.extra.length >= 3) st.extra.shift(); st.extra.push(['New object', 'cog', '#5562eb', [...st.tags]]); st.at[st.extra.length - 1] = st.t; };
      $(s, '.ag-reset').onclick = () => { api.manual(); st.extra = []; };
      sync();
    },
    draw(g, t, st, tour) {
      const extra = tour ? EXTRA.filter((_, i) => t >= 5 + i * 2.8) : st.extra;
      const rowAt = i => tour ? (i < OBJ.length ? .3 + i * .25 : 5 + (i - OBJ.length) * 2.8) : (i < OBJ.length ? -9 : st.at[i - OBJ.length] ?? -9);
      const rows = [...OBJ, ...extra];
      // header
      ELEM.forEach(([n, gi, col], j) => { const x = GX + 20 + j * CW + CW / 2; GI.draw(g, gi, x - 34, 66, 24, col); text(g, n, x - 18, 66, { align: 'left', size: 16, w: 800, col }); });
      let interactions = 0;
      rows.forEach(([n, gi, col, tags], i) => {
        const y = GY0 + 22 + i * RH, k = ease(clamp((t - rowAt(i)) / .5)), isNew = i >= OBJ.length;
        if (k <= 0) return;
        g.save(); g.globalAlpha = k;
        card(g, 120, y, 220, RH - 6, { fill: isNew ? '#eef2ff' : '#fffaf0', edge: isNew ? '#8ea2e6' : '#cdbf9f', lw: 2, shadow: false, r: 8 });
        GI.draw(g, gi, 28, y, 24, col);
        text(g, n, 46, y - 8, { align: 'left', size: 14, w: 800 });
        text(g, tags.length ? tags.join(', ') : 'no tags', 46, y + 10, { align: 'left', size: 11, col: C.muted });
        ELEM.forEach(([e, , ecol], j) => {
          const x = GX + 20 + j * CW + CW / 2, hits = cell(tags, e), kk = ease(clamp((t - rowAt(i) - .2 - j * .12) / .35));
          if (hits.length && kk > 0) interactions++;
          g.fillStyle = hits.length ? ecol + '30' : 'rgba(150,140,115,.08)'; g.strokeStyle = hits.length ? ecol : 'rgba(150,140,115,.3)'; g.lineWidth = hits.length ? 2 : 1;
          g.beginPath(); g.roundRect(x - CW / 2 + 4, y - RH / 2 + 4, CW - 8, RH - 8, 6); g.fill(); g.stroke();
          if (hits.length) text(g, hits.join(', '), x, y, { size: 13, w: 700, col: C.ink, a: kk });
        });
        g.restore();
      });
      // counter
      panel(g, 818, 14, 208, 558, { title: 'The count' });
      text(g, String(Object.keys(RULES).length), 922, 98, { size: 44, w: 800, display: true, col: C.navy });
      text(g, 'rules written', 922, 132, { size: 14, w: 700, col: C.muted });
      text(g, String(rows.length), 922, 196, { size: 44, w: 800, display: true, col: C.navy });
      text(g, 'objects tagged', 922, 230, { size: 14, w: 700, col: C.muted });
      text(g, String(interactions), 922, 294, { size: 44, w: 800, display: true, col: C.good });
      text(g, 'interactions', 922, 328, { size: 14, w: 700, col: C.muted });
      wrap(g, extra.length ? 'Each new object adds a row of interactions and no new rules.' : 'Breath of the Wild: about five major effects, applied to everything.', 834, 384, 180, { size: 14, w: 700, lh: 18, col: C.navy });
      text(g, 'Tags', 834, 470, { align: 'left', size: 12, w: 800, col: C.muted });
      chip(g, 'BotW’s five', 834, 494, { ...TONE.blue, size: 11.5, align: 'left' }); chip(g, 'roguelike rules', 834, 524, { ...TONE.gold, size: 11.5, align: 'left' });
    },
    side(t, st, tour) { const n = tour ? EXTRA.filter((_, i) => t >= 5 + i * 2.8).length : st.extra.length; return { out: n ? 'A new object only needs tags. The rules already exist, so its whole row fills itself.' : 'Rows are objects, columns are elements. Each cell comes from the object’s tags and one rule per tag.' }; },
  });

  // ---------- loot roll ----------
  const BASES = [['Sword', 'broadsword'], ['Axe', 'battle-axe'], ['Bow', 'bow-arrow'], ['Staff', 'wizard-staff'], ['Mace', 'spiked-mace'], ['Dagger', 'plain-dagger']];
  const AFFIX = [
    ['Burn', 'chance to [Burn]', '%', 5, 20, 'Searing', 'orange'], ['Lifesteal', 'of damage as [Lifesteal]', '%', 2, 8, 'of the Leech', 'pink'],
    ['Shock', '[Shock] damage on crit', '', 10, 60, 'Crackling', 'gold'], ['Haste', 'attack speed', '%', 5, 15, 'of Haste', 'teal'],
    ['Frost', 'chance to [Freeze]', '%', 3, 12, 'Frozen', 'blue'], ['Thorns', '[Thorns] damage', '', 8, 40, 'of Thorns', 'green'],
    ['Crit', 'critical hit chance', '%', 2, 9, 'Keen', 'red'],
  ];
  const RAR = [['Magic', '#3d6ee8'], ['Rare', '#d0a020'], ['Legendary', '#e07a2a']];
  const rnd = s => { const x = Math.sin(s * 9301.7 + 49297.3) * 233280; return x - Math.floor(x); };
  function rollItem(seed) {
    const b = Math.floor(rnd(seed) * BASES.length), pw = 120 + Math.floor(rnd(seed + 1) * 280), na = 2 + Math.floor(rnd(seed + 2) * 3);
    const pool = AFFIX.map((a, i) => [rnd(seed + 3 + i), a]).sort((p, q) => p[0] - q[0]).slice(0, na).map(([r, a], i) => ({ a, v: Math.round(lerp(a[3], a[4], rnd(seed + 20 + i))) }));
    const pre = pool.find(p => !p.a[5].startsWith('of')), suf = pool.find(p => p.a[5].startsWith('of'));
    const name = `${pre ? pre.a[5] + ' ' : ''}${BASES[b][0]}${suf ? ' ' + suf.a[5] : ''}`;
    return { b, pw, aff: pool, name, rar: na - 2 };
  }
  const LTOUR = [3, 11, 27];

  scene('loot-roll', {
    dur: 15,
    state: () => ({ seeds: [3, 11], seed: 27, at: -9 }),
    init(s, st, api) { $(s, '.lr-roll').onclick = () => { api.manual(); st.seeds = [...st.seeds, st.seed].slice(-2); st.seed = Math.floor(Math.random() * 9999); st.at = st.t; }; },
    draw(g, t, st, tour) {
      const i = tour ? Math.min(2, Math.floor(t / 5)) : -1, seed = tour ? LTOUR[i] : st.seed, at = tour ? i * 5 + .2 : st.at;
      const prev = tour ? LTOUR.slice(0, i) : st.seeds, it = rollItem(seed), s = t - at;
      const R = RAR[it.rar];
      panel(g, 14, 14, 600, 558, { title: 'Roll an item: base, power, affixes' });
      // reels
      const steps = [['Base type', BASES[it.b][0]], ['Power', String(it.pw)], ['Affixes', `${it.aff.length} keywords`]];
      steps.forEach(([n, v], j) => { const k = ease(ph(s, j * .5, j * .5 + .4)), x = 120 + j * 190; card(g, x, 84, 170, 54, { edge: k >= 1 ? C.navy : '#cdbf9f', shadow: false, r: 8 }); text(g, n, x, 66, { size: 12, w: 800, col: C.muted }); text(g, k >= 1 ? v : ['…', '·', '…'][Math.floor(t * 12) % 3], x, 92, { size: 17, w: 800, display: true }); if (j) CK.arrow(g, [x - 120, 84], [x - 88, 84], C.muted, 2.5); });
      // the card
      const kc = ease(ph(s, .6, 1));
      g.save(); g.globalAlpha = kc;
      card(g, 314, 340, 420, 380, { fill: '#1b1d2e', edge: R[1], lw: 4 });
      GI.draw(g, BASES[it.b][1], 180, 220, 80, R[1]);
      wrap(g, it.name, 236, 200, 280, { size: 22, w: 800, display: true, col: R[1], lh: 26 });
      text(g, `${R[0]} ${BASES[it.b][0]}`, 236, 254, { align: 'left', size: 13, col: '#c9c4b0' });
      text(g, String(it.pw), 132, 300, { align: 'left', size: 34, w: 800, display: true, col: '#fff' });
      text(g, 'damage per second', 220, 304, { align: 'left', size: 13, col: '#c9c4b0' });
      it.aff.forEach((p, j) => { const ka = ease(ph(s, 1.4 + j * .35, 1.7 + j * .35)); text(g, `+${p.v}${p.a[2]} ${p.a[1]}`, 132, 352 + j * 34, { align: 'left', size: 16, w: 700, col: '#8ea2ff', a: ka }); });
      g.restore();
      // earlier rolls
      panel(g, 626, 14, 400, 558, { title: 'Same parts, different items' });
      [...prev, seed].slice(-3).forEach((sd, j, arr) => {
        const o = rollItem(sd), y = 96 + j * 150, Rr = RAR[o.rar], cur = j === arr.length - 1;
        card(g, 826, y, 370, 132, { fill: '#1b1d2e', edge: Rr[1], lw: cur ? 4 : 2, a: cur ? kc : 1 });
        g.save(); g.globalAlpha = cur ? kc : 1;
        GI.draw(g, BASES[o.b][1], 676, y - 30, 34, Rr[1]);
        text(g, o.name, 702, y - 34, { align: 'left', size: 15, w: 800, col: Rr[1] });
        text(g, `${o.pw} dps`, 702, y - 12, { align: 'left', size: 12, col: '#c9c4b0' });
        let cx = 660; o.aff.forEach(p => { if (cx > 940) return; cx += chip(g, p.a[0], cx, y + 30, { ...TONE[p.a[6]], size: 12, align: 'left' }) + 5; });
        g.restore();
      });
    },
    side(t, st, tour) { const seed = tour ? LTOUR[Math.min(2, Math.floor(t / 5))] : st.seed, it = rollItem(seed); return { out: `<b>${it.name}</b>: a ${BASES[it.b][0].toLowerCase()}, ${it.pw} power, ${it.aff.map(p => p.a[0].toLowerCase()).join(', ')}. Every item is the same three parts, rolled.` }; },
  });

  // ---------- bespoke vs procedural ----------
  const D3 = ['Magic Missile', 'Arcane Orb', 'Ray of Frost', 'Meteor', 'Blizzard', 'Hydra'];
  const POE = ['Fireball', 'Cleave', 'Lightning Arrow', 'Frostbolt', 'Molten Strike', 'Raise Zombie'];
  const SUP = ['Added Fire', 'Multistrike', 'Multiple Projectiles', 'Chain', 'Fork', 'Pierce', 'Faster Attacks', 'Increased Area', 'Life Leech', 'Melee Physical'];
  const C3 = n => n * (n - 1) * (n - 2) / 6;
  scene('bespoke-procedural', {
    dur: 15,
    draw(g, t) {
      // Diablo III: each rune authored, one cell at a time
      panel(g, 14, 14, 500, 558, { title: 'Diablo III: bespoke runes' });
      const filled = Math.min(30, Math.floor(clamp((t - .5) / 8) * 30 + .0001));
      D3.forEach((n, r) => {
        const y = 92 + r * 66; text(g, n, 30, y, { align: 'left', size: 14, w: 800 });
        for (let c = 0; c < 5; c++) { const i = r * 5 + c, x = 184 + c * 62, on = i < filled, fresh = i === filled - 1; card(g, x, y, 54, 50, { fill: on ? '#f3e2c4' : 'rgba(255,250,240,.4)', edge: on ? '#c9782a' : '#cdbf9f', lw: fresh ? 3 : 2, shadow: false, r: 6, dash: on ? [] : [4, 4] }); if (on) GI.draw(g, 'pencil', x, y, 22, '#8a4a10'); }
      });
      text(g, `${filled} authored pieces → ${filled} combinations`, 264, 520, { size: 17, w: 800, display: true, col: C.goldInk });
      text(g, 'every rune is its own designed thing', 264, 546, { size: 13, col: C.muted });
      // Path of Exile: skills x supports, choose three
      panel(g, 526, 14, 500, 558, { title: 'Path of Exile: support gems combine' });
      const pick = Math.floor(t * 1.4), ss = [0, 1, 2].map(j => (pick * 7 + j * 3 + (pick % 3)) % 10), sk = pick % 6;
      POE.forEach((n, r) => { const y = 92 + r * 40, on = r === sk; chip(g, n, 546, y, { ...(on ? TONE.navy : TONE.grey), size: 13, align: 'left' }); });
      SUP.forEach((n, j) => { const x = 790 + (j % 2) * 116, y = 92 + Math.floor(j / 2) * 46, on = ss.includes(j); chip(g, n, x, y, { ...(on ? TONE.green : TONE.grey), size: 11.5, width: 108 }); });
      if (t > 1) { const y0 = 92 + sk * 40; ss.forEach(j => { const x = 790 + (j % 2) * 116 - 54, y = 92 + Math.floor(j / 2) * 46; g.strokeStyle = 'rgba(47,174,99,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(690, y0); g.lineTo(x, y); g.stroke(); }); }
      const total = 6 * C3(10), shown = Math.floor(total * ease(clamp((t - .5) / 6)));
      text(g, `${6 + 10} authored pieces → ${shown.toLocaleString()} combinations`, 776, 520, { size: 17, w: 800, display: true, col: C.good });
      text(g, 'six skills × any three of ten supports', 776, 546, { size: 13, col: C.muted });
      if (t > 10) { TD.use(g); TD.stamp('Both are composition', 520, 478, C.navy, clamp((t - 10) / .4), 26); }
    },
    side() { return { out: '“Both bespoke and procedural content can be examples of compositional game design.” Bespoke gives precise pieces; procedural gives many combinations from few pieces.' }; },
  });

  // ---------- systems tour reel ----------
  const REEL = [
    ['The Legend of Zelda: Breath of the Wild', 'Alchemy engine', [['Burnable', 'grass'], ['Fire', 'flame']], ['Grass fire', 'campfire']],
    ['Ember Knights and other roguelikes', 'Broad core rules', [['Meat', 'steak'], ['Fire', 'flame']], ['Seared meat heals more', 'meat']],
    ['The Legend of Zelda: Breath of the Wild', 'Physics interactions', [['Planks', 'wood-beam'], ['Fans', 'wind-slap']], ['Flying machine', 'hang-glider']],
    ['Far Cry 5', 'Physics interactions', [['Vehicle', 'jeep'], ['Explosion', 'spiky-explosion']], ['Launched into the sky', 'jeep']],
    ['Diablo III', 'Item generators', [['Base type', 'battle-axe'], ['Power', 'anvil'], ['Affixes', 'gem-chain']], ['A new item', 'battle-axe']],
    ['Diablo III', 'Skill combinations', [['Skill', 'fire-ray'], ['Rune', 'scroll-unfurled']], ['One authored variant', 'pencil']],
    ['Path of Exile', 'Extensive skill tree', [['Skill gem', 'gem-chain'], ['Supports', 'gem-chain']], ['A build', 'checkbox-tree']],
    ['Potionomics', 'Crafting and bartering', [['Cards', 'card-play'], ['Customer', 'conversation']], ['A sale', 'round-potion']],
    ['Signs of the Sojourner', 'Deck building + NPCs', [['Deck symbols', 'card-random'], ['NPC', 'conversation']], ['A conversation', 'conversation']],
  ];
  const RS = 2.4;
  scene('systems-reel', {
    dur: REEL.length * RS,
    draw(g, t) {
      const i = Math.min(REEL.length - 1, Math.floor(t / RS)), a = t - i * RS, [game, kind, parts, whole] = REEL[i];
      const k = ease(ph(a, 0, .35)), out = ph(a, RS - .3, RS);
      g.save(); g.globalAlpha = 1 - out;
      text(g, kind, 520, 80, { size: 30, w: 800, display: true, col: C.navy, a: k });
      text(g, game, 520, 116, { size: 17, w: 700, col: C.muted, a: k });
      const n = parts.length, W = 180, x0 = 520 - ((n + 1) * W + n * 40 + 60) / 2 + W / 2;
      parts.forEach(([p, gi], j) => { const kj = ease(ph(a, .2 + j * .2, .5 + j * .2)), x = x0 + j * (W + 40); card(g, x, 280, W, 170, { edge: C.navy, lw: 3, a: kj }); GI.draw(g, gi, x, 260, 64, C.ink); text(g, p, x, 330, { size: 18, w: 800, a: kj }); if (j < n - 1) text(g, '+', x + W / 2 + 20, 280, { size: 34, w: 800, col: C.muted, a: kj }); });
      const xw = x0 + n * (W + 40) + 40, kw = ease(ph(a, .9, 1.3));
      text(g, '=', xw - W / 2 - 30, 280, { size: 34, w: 800, col: C.muted, a: kw });
      card(g, xw, 280, W + 20, 190, { fill: '#d8f0df', edge: '#5fb47c', lw: 4, a: kw }); GI.draw(g, whole[1], xw, 256, 72, C.good); g.save(); g.globalAlpha = kw; wrap(g, whole[0], xw, 324, W, { size: 17, w: 800, align: 'center', lh: 20 }); g.restore();
      g.restore();
      // where we are in the tour
      REEL.forEach(([, kd], j) => { const x = 520 + (j - 4) * 112; chip(g, kd.split(' ')[0], x, 520, { ...(j === i ? TONE.navy : TONE.grey), size: 11.5, width: 104 }); });
      text(g, 'Parts make a whole, in every genre', 520, 556, { size: 14, col: C.muted, it: true });
    },
    side(t) { const i = Math.min(REEL.length - 1, Math.floor(t / RS)); return { out: `<b>${REEL[i][1]}</b>, ${REEL[i][0]}: ${REEL[i][2].map(p => p[0].toLowerCase()).join(' + ')} = ${REEL[i][3][0].toLowerCase()}.` }; },
  });
})();
