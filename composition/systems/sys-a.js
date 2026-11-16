/* Composition across systems (MGM C4 M7, deck slides 193-201).
   'alchemy-grid' (193-194): Breath of the Wild's "alchemy engine" rests on five major effects (Burnable, Electrifiable,
   Pushable, Freezable, Liftable); roguelikes add rules such as searing meat and lighting lamps. Every cell here is computed
   from an object's tags and one rule per tag, never written by hand, so a new object fills its whole row for free.
   'loot-roll' (197): "The weapon is given a power value, a type, then has a variety of different ways those can be combined
   and expressed, granting different keywords at different magnitudes." Affixes here are this page's.
   'bespoke-procedural' (198-199): one request (more projectiles, fire, cold) answered by each game: a Diablo III rune is
   written for one skill; a Path of Exile support gem fits every skill whose tags match, so its pieces multiply.
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
  // The same request ("make my skill fire more projectiles", "add fire", "add cold") answered by each game.
  // Diablo III: a rune belongs to one skill, so each variant is one designed piece. Path of Exile: a support gem plugs into
  // every skill whose tags it fits, so each piece multiplies. Tags are simplified from the games' own gem tags.
  const D3S = [['Magic Missile', 'magicmissile'], ['Arcane Orb', 'arcaneorb'], ['Ray of Frost', 'rayoffrost'], ['Meteor', 'meteor'], ['Blizzard', 'blizzard'], ['Hydra', 'hydra']];
  const MM_RUNES = ['Charged Blast', 'Split', 'Seeker', 'Conflagrate', 'Glacial Spike'];
  const POS = [
    ['Fireball', 'fireball', ['Spell', 'Projectile', 'Area']], ['Frostbolt', 'frostbolt', ['Spell', 'Projectile']],
    ['Lightning Arrow', 'lightning-arrow', ['Attack', 'Projectile', 'Area']], ['Cleave', 'cleave', ['Attack', 'Melee', 'Area']],
    ['Molten Strike', 'molten-strike', ['Attack', 'Melee', 'Projectile', 'Area']], ['Ice Nova', 'ice-nova', ['Spell', 'Area']],
  ];
  // support: [name, image, tags it needs (any one)]
  const SUPS = {
    gmp: ['Greater Multiple Projectiles', 'gmp', ['Projectile']], chain: ['Chain', 'chain', ['Projectile']], fork: ['Fork', 'fork', ['Projectile']],
    pierce: ['Pierce', 'pierce', ['Projectile']], fire: ['Added Fire Damage', 'added-fire', ['Attack', 'Spell']], cold: ['Added Cold Damage', 'added-cold', ['Attack', 'Spell']],
    aoe: ['Increased Area of Effect', 'inc-aoe', ['Area']], fatk: ['Faster Attacks', 'faster-attacks', ['Attack']], echo: ['Spell Echo', 'spell-echo', ['Spell']],
    fcast: ['Faster Casting', 'faster-casting', ['Spell']],
  };
  const EXTRA_SUP = ['Elemental Damage with Attacks', 'ele-attacks', ['Attack']];
  const ASKS = {
    proj: { label: 'More projectiles', rune: 1, effect: 'fires 3 missiles', sup: 'gmp', links: ['gmp', 'pierce', 'aoe'], poe: 'fires 4 more projectiles', tag: 'Projectile' },
    fire: { label: 'Fire damage', rune: 3, effect: 'turns to fire, burns', sup: 'fire', links: ['fire', 'gmp', 'echo'], poe: 'adds fire damage', tag: 'Attack or Spell' },
    cold: { label: 'Cold damage', rune: 4, effect: 'turns to cold, freezes', sup: 'cold', links: ['cold', 'fork', 'fcast'], poe: 'adds cold damage', tag: 'Attack or Spell' },
  };
  const fits = (sk, sp) => sp[2].some(tg => sk[2].includes(tg));
  const choose3 = n => n < 3 ? 0 : n * (n - 1) * (n - 2) / 6;
  const poeCount = plus => { const pool = [...Object.values(SUPS), ...(plus ? [EXTRA_SUP] : [])]; return POS.reduce((a, sk) => a + choose3(pool.filter(sp => fits(sk, sp)).length), 0); };
  const BP = { d3: [30, 30], d3p: [31, 31], poe: [16, poeCount(false)], poep: [17, poeCount(true)] };
  const BP_MAX = BP.poep[1];
  const D3COL = '#b5541b', POECOL = '#1f7a8c';
  function tick(g, x, y, ok, a = 1) {
    g.save(); g.globalAlpha *= a; g.lineWidth = 3.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = ok ? C.good : '#a39a86'; g.beginPath();
    if (ok) { g.moveTo(x - 7, y); g.lineTo(x - 2, y + 6); g.lineTo(x + 8, y - 6); } else { g.moveTo(x - 6, y); g.lineTo(x + 6, y); }
    g.stroke(); g.restore();
  }
  function socket(g, x, y, s, im, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    g.fillStyle = '#23201c'; g.strokeStyle = o.hi ? '#e0a92d' : '#6b5a3c'; g.lineWidth = o.hi ? 4 : 2.5;
    g.beginPath(); g.arc(x, y, s / 2, 0, TAU); g.fill(); g.stroke(); g.restore();
    if (im) CK.pic(g, 'poe-' + im + '.png', x, y, s * .86, { a: (o.a ?? 1) * (o.dim ? .35 : 1) });
  }
  const BPT = [[0, 'proj'], [6, 'fire'], [10, 'cold'], [14, 'plus']];
  scene('bespoke-procedural', {
    dur: 20,
    state: () => ({ ask: 'proj', plus: false, full: true }),
    init(s, st, api) {
      const sync = () => { $$(s, '.bp-ask .btn').forEach(b => b.classList.toggle('on', b.dataset.a === st.ask)); $(s, '.bp-plus').classList.toggle('on', st.plus); };
      $$(s, '.bp-ask .btn').forEach(b => b.onclick = () => { api.manual(); st.ask = b.dataset.a; st.full = true; st.t = 0; sync(); });
      $(s, '.bp-plus').onclick = () => { api.manual(); st.plus = !st.plus; st.full = false; st.t = 0; sync(); };
      st.sync = sync; sync();
    },
    draw(g, t, st, tour) {
      let ask = st.ask, plus = st.plus, t0 = 0;
      if (tour) { const step = [...BPT].reverse().find(p => t >= p[0]); plus = step[1] === 'plus'; ask = plus ? 'cold' : step[1]; t0 = step[0]; if (st.sync && (st.ask !== ask || st.plus !== plus)) { st.ask = ask; st.plus = plus; st.sync(); } }
      const s = t - t0, first = tour ? t < 6 : st.full, A = ASKS[ask], sp = SUPS[A.sup];
      const k1 = first ? ease(ph(s, .1, .6)) : 1, k2 = first ? ease(ph(s, 1.4, 1.9)) : .3 + .7 * ease(ph(s, 0, .4)), k3 = first ? ease(ph(s, 2.8, 3.3)) : 1;
      // the request both panels answer
      card(g, 520, 36, 1012, 40, { fill: '#152044', edge: '#152044', shadow: false, r: 10 });
      text(g, 'The player wants:', 360, 37, { size: 16, w: 700, col: '#c9cdf0', align: 'right' });
      text(g, A.label.toLowerCase() + ' on a skill', 372, 37, { size: 19, w: 800, display: true, col: '#ffb951', align: 'left' });
      text(g, 'How does each game deliver it?', 1010, 37, { size: 14, w: 600, col: '#c9cdf0', align: 'right' });
      [[14, D3COL, 'Diablo III: a designer writes each rune'], [526, POECOL, 'Path of Exile: support gems plug into skills']].forEach(([x, col, title]) => {
        panel(g, x, 64, 500, 508, {});
        g.fillStyle = col; g.beginPath(); g.roundRect(x, 64, 500, 30, [14, 14, 0, 0]); g.fill();
        text(g, title, x + 250, 80, { size: 16, w: 800, display: true, col: '#fff' });
      });
      const rowLabel = (n, s1, x, y, a) => { text(g, n, x, y, { align: 'left', size: 13, w: 800, col: C.muted, a }); text(g, s1, x + 18, y, { align: 'left', size: 13, w: 700, col: C.muted, a }); };
      // ---- row 1: how you get it ----
      ['', ''].forEach((_, side) => rowLabel('1', 'How you get it', 30 + side * 512, 112, k1));
      g.save(); g.globalAlpha = k1;
      icon(g, 'd3-wizard_magicmissile.png', 72, 182, 56, { edge: '#3a2a18' });
      text(g, 'Magic Missile', 72, 226, { size: 13, w: 800 });
      MM_RUNES.forEach((r, i) => { const on = i === A.rune; chip(g, r, 128, 136 + i * 23, { ...(on ? TONE.orange : TONE.grey), size: 12, align: 'left', width: 116, lw: on ? 2.5 : 1.5 }); });
      text(g, 'its 5 runes', 186, 254, { size: 12, w: 600, col: C.muted });
      CK.arrow(g, [108, 182], [124, 182], C.muted, 2);
      CK.arrow(g, [250, A.rune * 23 + 136], [314, 182], D3COL, 2.5);
      card(g, 410, 182, 180, 92, { fill: '#fbeee0', edge: D3COL, lw: 2.5, shadow: false, r: 10 });
      icon(g, 'd3-wizard_magicmissile.png', 344, 182, 34, { edge: '#3a2a18', lw: 2 });
      text(g, MM_RUNES[A.rune], 368, 166, { size: 15, w: 800, align: 'left', col: '#7a3a06' });
      wrap(g, A.effect, 368, 188, 130, { size: 13, w: 600, lh: 16 });
      text(g, 'Written for Magic Missile only', 410, 244, { size: 12, w: 700, col: D3COL });
      // PoE: four linked sockets
      const gx = [582, 646, 710, 774];
      g.fillStyle = '#8a7350'; gx.slice(1).forEach(x => g.fillRect(x - 46, 177, 28, 10));
      socket(g, gx[0], 182, 52, POS[0][1]);
      A.links.forEach((id, i) => socket(g, gx[i + 1], 182, 48, SUPS[id][1], { hi: i === 0 }));
      text(g, 'Fireball', gx[0], 222, { size: 12, w: 800 });
      text(g, '+ 3 linked supports', 710, 222, { size: 12, w: 700, col: C.muted });
      text(g, 'skill gem', gx[0], 140, { size: 12, w: 600, col: C.muted }); text(g, 'support gems', 710, 140, { size: 12, w: 600, col: C.muted });
      CK.arrow(g, [804, 182], [838, 182], POECOL, 2.5);
      card(g, 922, 182, 160, 92, { fill: '#e2f2f4', edge: POECOL, lw: 2.5, shadow: false, r: 10 });
      wrap(g, sp[0], 922, 162, 148, { size: 13, w: 800, align: 'center', lh: 15, col: '#0f4c58', valign: 'middle' });
      wrap(g, 'Fireball ' + A.poe, 922, 200, 148, { size: 12.5, w: 600, align: 'center', lh: 15, valign: 'middle' });
      text(g, 'One gem, reused on many skills', 922, 244, { size: 12, w: 700, col: POECOL });
      g.restore();
      // ---- row 2: where that piece works ----
      ['', ''].forEach((_, side) => rowLabel('2', 'Where that piece works', 30 + side * 512, 284, k2));
      g.save(); g.globalAlpha = k2;
      D3S.forEach(([n, f], i) => {
        const x = 62 + i * 78, own = i === 0;
        icon(g, 'd3-wizard_' + f + '.png', x, 330, 44, { edge: own ? D3COL : '#3a2a18', lw: own ? 4 : 2, grey: !own });
        wrap(g, n, x, 362, 74, { size: 11.5, w: 700, align: 'center', lh: 13, col: own ? C.ink : C.muted });
        tick(g, x, 396, own);
      });
      text(g, MM_RUNES[A.rune] + ' works on 1 of 6 skills.', 264, 426, { size: 15, w: 800, display: true, col: D3COL });
      text(g, 'Each other skill needs its own rune for this, written separately.', 264, 446, { size: 12, w: 600, col: C.muted });
      let fitN = 0;
      POS.forEach((sk, i) => {
        const x = 574 + i * 78, ok = fits(sk, sp); if (ok) fitN++;
        socket(g, x, 330, 46, sk[1], { hi: ok, dim: !ok });
        wrap(g, sk[0], x, 362, 74, { size: 11.5, w: 700, align: 'center', lh: 13, col: ok ? C.ink : C.muted });
        tick(g, x, 396, ok);
      });
      text(g, `${sp[0]} works on ${fitN} of 6 skills.`, 776, 426, { size: 15, w: 800, display: true, col: POECOL });
      text(g, `Any skill gem tagged ${A.tag} takes it.`, 776, 446, { size: 12, w: 600, col: C.muted });
      g.restore();
      // ---- row 3: pieces in, variants out (one scale for both panels) ----
      ['', ''].forEach((_, side) => rowLabel('3', 'Pieces vs. variants', 30 + side * 512, 474, k3));
      const kb = first ? ease(ph(s, 3, 4.6)) : 1, kp = plus ? ease(ph(s, .2, 1.2)) : 0;
      const bars = (x0, base, more, col, pieceWord) => {
        const W = 280, sc = W / BP_MAX, pc = lerp(base[0], more[0], kp), vc = lerp(base[1], more[1], kp);
        [[`${pieceWord} made`, pc, base[0]], ['variants', vc, base[1]]].forEach(([lab, v, v0], j) => {
          const y = 504 + j * 34, w = Math.max(3, v * sc * kb);
          text(g, lab, x0 + 120, y, { size: 12.5, w: 700, align: 'right', col: C.muted, a: k3 });
          g.save(); g.globalAlpha = k3; g.fillStyle = 'rgba(150,140,115,.12)'; g.fillRect(x0 + 128, y - 10, W, 20);
          g.fillStyle = j ? col : col + '88'; g.fillRect(x0 + 128, y - 10, w, 20); g.restore();
          const num = Math.round(v * kb), d = Math.round(v) - v0;
          text(g, num.toLocaleString() + (d > 0 && kp > .5 ? `  (+${d})` : ''), x0 + 136 + w, y, { size: 14, w: 800, align: 'left', col: col, a: k3 });
        });
      };
      bars(18, BP.d3, BP.d3p, D3COL, 'runes');
      bars(530, BP.poe, BP.poep, POECOL, 'gems');
      if (kp > 0) {
        chip(g, '+1 rune for Magic Missile', 430, 474, { ...TONE.orange, size: 11.5, a: kp, width: 156 });
        chip(g, '+1 support: ' + EXTRA_SUP[0], 880, 474, { ...TONE.teal, size: 11.5, a: kp, width: 270 });
      }
    },
    side(t, st, tour) {
      let ask = st.ask, plus = st.plus;
      if (tour) { const step = [...BPT].reverse().find(p => t >= p[0]); plus = step[1] === 'plus'; ask = plus ? 'cold' : step[1]; }
      const A = ASKS[ask], d3 = plus ? BP.d3p : BP.d3, poe = plus ? BP.poep : BP.poe;
      const stats = `<div class="y"><b>${d3[1]}</b><span>Diablo III variants from ${d3[0]} runes</span></div><div class="g"><b>${poe[1]}</b><span>Path of Exile variants from ${poe[0]} gems</span></div>`;
      if (plus) return { stats, out: `One more rune adds one variant. One more support gem fits every Attack skill, so it adds ${BP.poep[1] - BP.poe[1]}. Bespoke pieces are exact; combining pieces multiply. “Both bespoke and procedural content can be examples of compositional game design.”` };
      return { stats, out: `<b>${A.label}.</b> Diablo III answers with ${MM_RUNES[A.rune]}, a rune written for one skill. Path of Exile answers with ${SUPS[A.sup][0]}, one gem that fits every skill with the right tag.` };
    },
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
