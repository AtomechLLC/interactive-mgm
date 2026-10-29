/* Doom Eternal encounter swapper (MGM C4 M7, deck slides 203-214). Enemies sort into map archetypes (Fodder, Threat, Mini
   Boss) and behaviours (Ranged, Rushdown, Support, Keep Away, Close In). Slide 212: swap any enemy for another from its same
   map archetype and you have a new encounter. Slide 213: two nested frameworks, structure at the map level and composition
   at the enemy level. Reroll changes the roster and keeps the slots; the structure buttons change the slots themselves.
   Enemy names are Doom Eternal's (id Software); the silhouettes are game-icons.net stand-ins. Role tags follow the deck's
   slides where it shows the enemy, and the game's own heavy / super-heavy tiers otherwise. */
(function () {
  const { $, $$ } = FPF.kit;
  const { text, wrap, chip, TONE, panel, scene, clamp, ease } = CK;
  const T = TD, C = TD.C;
  const TIER = { Fodder: ['#9a9480', 17], Threat: ['#e0892d', 24], 'Mini Boss': ['#c2412c', 32] };
  const BEH = { Ranged: TONE.teal, Rushdown: TONE.red, Support: TONE.green, 'Keep Away': TONE.purple, 'Close In': TONE.orange };
  const ROSTER = [
    ['Imp', 'imp-laugh', 'Fodder', []], ['Zombie', 'shambling-zombie', 'Fodder', []], ['Soldier', 'cyborg-face', 'Fodder', []], ['Gargoyle', 'bat-wing', 'Fodder', []],
    ['Arachnotron', 'spider-bot', 'Threat', ['Ranged']], ['Revenant', 'skull-crossed-bones', 'Threat', ['Ranged']], ['Cacodemon', 'cyclops', 'Threat', ['Ranged']],
    ['Pinky', 'charging-bull', 'Threat', ['Rushdown']], ['Hell Knight', 'brute', 'Threat', ['Rushdown']],
    ['Mancubus', 'ogre', 'Threat', ['Keep Away']], ['Cyber Mancubus', 'robot-golem', 'Threat', ['Close In']], ['Carcass', 'skull-shield', 'Threat', ['Support']],
    ['Marauder', 'heavy-helm', 'Mini Boss', ['Close In']], ['Archvile', 'fire-silhouette', 'Mini Boss', ['Support']], ['Doom Hunter', 'minigun', 'Mini Boss', ['Ranged']], ['Tyrant', 'rock-golem', 'Mini Boss', ['Ranged']],
  ].map(([name, gi, tier, beh]) => ({ name, gi, tier, beh }));
  // structures: slots are [tier or null, behaviour or null, x, y] in the map's 600 x 520 box
  const STRUCT = {
    arena: { name: 'Arena', slots: [
      ['Fodder', null, 90, 120], ['Fodder', null, 150, 400], ['Fodder', null, 250, 470], ['Fodder', null, 470, 440], ['Fodder', null, 520, 110], ['Fodder', null, 110, 280],
      ['Threat', null, 200, 200], ['Threat', null, 430, 300], ['Threat', 'Ranged', 500, 200], [null, 'Support', 330, 380], ['Mini Boss', null, 320, 120]] },
    gauntlet: { name: 'Gauntlet', slots: [
      ['Fodder', null, 70, 90], ['Fodder', null, 130, 150], ['Fodder', null, 70, 220], ['Fodder', null, 160, 300], ['Fodder', null, 90, 400], ['Fodder', null, 180, 460], ['Fodder', null, 260, 90], ['Fodder', null, 280, 400],
      ['Threat', 'Rushdown', 340, 200], ['Threat', 'Rushdown', 360, 330], ['Threat', 'Ranged', 520, 120], ['Mini Boss', null, 500, 360]] },
  };
  const fits = ([tier, beh]) => ROSTER.filter(e => (!tier || e.tier === tier) && (!beh || e.beh.includes(beh)));
  const pick = (slot, i, seed) => { const c = fits(slot); return c[(seed * (i % 3 + 1) + i * 5 + (seed > 0 ? seed * 3 : 0)) % c.length]; };
  const MX = 26, MY = 40, DUR = 27;
  const TOUR = [[0, 'arena', 0], [2.6, 'arena', 1], [5, 'arena', 2], [7.4, 'arena', 3], [9.8, 'arena', 4], [13.6, 'gauntlet', 4], [17.2, 'gauntlet', 5], [20, 'gauntlet', 6], [22.8, 'gauntlet', 7]];

  function view(t, st, tour) {
    if (!tour) return st;
    let i = 0; while (i + 1 < TOUR.length && t >= TOUR[i + 1][0]) i++;
    const [at, s, seed] = TOUR[i], prev = TOUR[Math.max(0, i - 1)];
    return { struct: s, seed, prevSeed: i ? prev[2] : seed, prevStruct: i ? prev[1] : s, changeT: at, extra: [], cap: t < 13.6 ? (t < 2.6 ? 'map' : 'roster') : 'structure' };
  }
  const slotsOf = v => [...STRUCT[v.struct].slots, ...(v.extra || [])];
  function count(v) { return slotsOf(v).reduce((n, s) => n * fits(s).length, 1); }

  function map(g, v, t) {
    panel(g, 14, 14, 628, 558, { title: `Map: ${STRUCT[v.struct].name}` });
    g.save(); g.translate(MX, MY); g.beginPath(); g.roundRect(0, 0, 604, 520, 10); g.clip();
    T.use(g); T.floor(0, 0, 604, 520);
    if (v.struct === 'arena') { T.pillar(270, 250, 60, 50); T.pillar(60, 330, 40, 40); T.pillar(560, 300, 40, 40); }
    else { T.wall(220, 150, 30, 160); T.wall(420, 230, 30, 180); }
    T.player(v.struct === 'arena' ? 320 : 40, v.struct === 'arena' ? 300 : 300, -Math.PI / 2, .85);
    const k = clamp((t - v.changeT) / .5), sm = v.prevStruct !== v.struct;
    slotsOf(v).forEach((s, i) => {
      const [tier, beh, x, y] = s, e = pick(s, i, v.seed), was = sm ? null : pick(s, i, v.prevSeed), changed = !was || was.name !== e.name;
      const R = tier ? TIER[tier][1] : 26, col = tier ? TIER[tier][0] : '#2fae63';
      // the slot: the structure framework
      g.setLineDash([6, 5]); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R + 8, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      if (beh) chip(g, beh, x, y + R + 22, { ...BEH[beh], size: 10.5 });
      // the enemy: the composition framework
      const a = changed ? ease(k) : 1, sc = changed ? .4 + .6 * ease(k) : 1;
      if (changed && was && k < 1) { g.save(); g.globalAlpha = 1 - k; disc(g, was, x, y, R); g.restore(); }
      g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(sc, sc); disc(g, e, 0, 0, R); g.restore();
      text(g, e.name, x, y - R - 12, { size: tier === 'Fodder' ? 11 : 13, w: 800, stroke: 4, a });
    });
    g.restore();
  }
  function disc(g, e, x, y, R) {
    const col = TIER[e.tier][0];
    g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill(); g.stroke();
    GI.draw(g, e.gi, x, y, R * 1.35, '#fff');
  }

  scene('doom-swap', {
    dur: DUR,
    state: () => ({ struct: 'arena', seed: 0, prevSeed: 0, prevStruct: 'arena', changeT: -9, extra: [] }),
    init(s, st, api) {
      const take = () => { if (st.tour) { api.manual(); Object.assign(st, { struct: 'arena', seed: 0, extra: [] }); } st.prevSeed = st.seed; st.prevStruct = st.struct; st.changeT = st.t; };
      $(s, '.ds-reroll').onclick = () => { take(); st.seed++; };
      $$(s, '.ds-struct .btn').forEach(b => b.onclick = () => { take(); st.struct = b.dataset.s; st.extra = []; sync(); });
      $$(s, '.ds-add .btn').forEach(b => b.onclick = () => {
        take(); st.prevStruct = '';
        if (b.dataset.a === 'drop') st.extra.pop();
        else { const n = st.extra.length; if (n < 4) st.extra.push([b.dataset.a === 'Fodder' ? 'Fodder' : 'Threat', b.dataset.a === 'Fodder' ? null : b.dataset.a, 560 - n * 60, 490]); }
      });
      function sync() { $$(s, '.ds-struct .btn').forEach(b => b.classList.toggle('on', b.dataset.s === st.struct)); }
      st.sync = sync; sync();
    },
    draw(g, t, st, tour) {
      const v = view(t, st, tour), slots = slotsOf(v);
      map(g, v, t);
      // the two frameworks, side by side
      const P = 656, PW = 370;
      panel(g, P, 14, PW, 254, { title: 'Structure: the map’s slots' });
      const groups = {};
      slots.forEach(([tier, beh]) => { const k = `${tier || 'Any'}${beh ? ' · ' + beh : ''}`; groups[k] = (groups[k] || 0) + 1; });
      Object.entries(groups).forEach(([k, n], i) => {
        const y = 58 + i * 34, tier = k.split(' · ')[0];
        text(g, `${n}×`, P + 34, y, { size: 17, w: 800, display: true, align: 'right' });
        chip(g, k, P + 44, y, { ...(tier === 'Fodder' ? TONE.grey : tier === 'Threat' ? TONE.orange : tier === 'Mini Boss' ? TONE.red : TONE.green), size: 13, align: 'left' });
        text(g, `${fits(slots.find(s => `${s[0] || 'Any'}${s[1] ? ' · ' + s[1] : ''}` === k)).length} fit`, P + PW - 20, y, { size: 12.5, col: C.muted, align: 'right' });
      });
      panel(g, P, 278, PW, 294, { title: 'Composition: who fills them' });
      const seen = [];
      slots.forEach((s, i) => { const e = pick(s, i, v.seed); if (!seen.includes(e)) seen.push(e); });
      seen.slice(0, 10).forEach((e, i) => {
        const x = P + 22 + (i % 2) * 176, y = 330 + Math.floor(i / 2) * 46;
        disc(g, e, x + 14, y, 14);
        text(g, e.name, x + 36, y - 8, { align: 'left', size: 13.5, w: 800 });
        text(g, [e.tier, ...e.beh].join(' · '), x + 36, y + 9, { align: 'left', size: 11, col: C.muted });
      });
      const cap = tour ? { map: 'Slots first: the map decides the roles.', roster: 'Reroll: every enemy swaps for another of its role.', structure: 'Change the slots and the fight changes kind.' }[v.cap] : null;
      if (cap) T.label(cap, 328, 548, 'center', C.navy, 16);
      st.sync?.();
    },
    side(t, st, tour) {
      const v = view(t, st, tour);
      const stats = `<div class="y"><b>${slotsOf(v).length}</b><span>slots in the structure</span></div><div class="g"><b>${count(v).toLocaleString()}</b><span>possible rosters for these slots</span></div>`;
      const out = tour && v.cap === 'structure' ? 'A new structure: a corridor of fodder, two rushdown threats, a ranged threat and a mini boss. The roster still rerolls inside it.'
        : 'Swap any enemy for another from its same map archetype and you have a new encounter. Two nested frameworks: structure at the map level, composition at the enemy level.';
      return { stats, out };
    },
  });
})();
