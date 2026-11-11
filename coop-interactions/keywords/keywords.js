/* Keywords need situations (MGM C4 M6, deck slides 270-285). Slide 2 extends the deck's keyword sheets (slides 275-280, three WoW tanks)
   to twenty Cataclysm specs across all ten classes, sorted into role, class and spec layers, with Blizzard's class and spec icons. Slide 3 gives four original classes keyword cards and lets
   you build an encounter with sliders (role badges are League of Legends class icons): each keyword's meter shows how much the content asks for it (slide 283: area
   damage needs clustered enemies, taunt needs allies under threat, durability needs dangerous damage, self healing
   needs danger and the breathing room to use it). DEMAND below is the whole model. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;

  /* ---------- slide 2: keyword sheets for every class ---------- */
  // Cataclysm (patch 4.3): ten classes, three talent trees each. Twenty of the thirty specs, two per class.
  // A sheet is 3 role keywords + 5 class keywords + 1 spec keyword. The class row is identical for every spec of
  // a class (baseline abilities, no talents), so two sheets from one class share five tiles. Numbers 1-5 are
  // comparative ratings; percentages are the class's strongest baseline snare.
  const ROLES = {
    tank: { name: 'Tank', every: 'shared by every tank', kws: ['Durable', 'Uncrushable', 'Taunt'] },
    healer: { name: 'Healer', every: 'shared by every healer', kws: ['Spot healing', 'Group healing', 'Dispel magic'] },
    melee: { name: 'Melee DPS', every: 'shared by every damage dealer', kws: ['Ranged', 'Area damage', 'Burst'] },
    ranged: { name: 'Ranged DPS', every: 'shared by every damage dealer', kws: ['Ranged', 'Area damage', 'Burst'] },
  };
  const CLASS_KWS = ['Slow', 'Interrupt', 'Gap closer', 'Has pet', 'Heals others'];
  // [name, icon, Slow, Interrupt, Gap closer, Has pet, Heals others]
  const CLASSES_WOW = {
    warrior: ['Warrior', 'classicon_warrior', '50%', '✔', '3', '✗', '✗'],       // Hamstring; Pummel; Charge, Intercept, Heroic Leap
    paladin: ['Paladin', 'classicon_paladin', '✗', '✔', '0', '✗', '✔'],         // Rebuke
    hunter: ['Hunter', 'classicon_hunter', '50%', '✗', '0', '✔', '✗'],         // Concussive Shot; no baseline interrupt
    rogue: ['Rogue', 'classicon_rogue', '70%', '✔', '0', '✗', '✗'],            // Crippling Poison; Kick
    priest: ['Priest', 'classicon_priest', '✗', '✗', '0', '✗', '✔'],           // Silence and Mind Flay are Shadow talents
    dk: ['Death Knight', 'classicon_deathknight', '60%', '✔', '1', '✔', '✗'],   // Chains of Ice; Mind Freeze; Death Grip; Raise Dead
    shaman: ['Shaman', 'classicon_shaman', '50%', '✔', '0', '✗', '✔'],         // Frost Shock / Earthbind; Wind Shear
    mage: ['Mage', 'classicon_mage', '40%', '✔', '0', '✗', '✗'],               // Frostbolt; Counterspell
    warlock: ['Warlock', 'classicon_warlock', '30%', '✔', '0', '✔', '✗'],      // Curse of Exhaustion; Felhunter's Spell Lock
    druid: ['Druid', 'classicon_druid', '✗', '✔', '0', '✗', '✔'],              // Skull Bash; Feral Charge is a talent
  };
  // [key, class, spec, spec icon, role, role values x3, spec keyword, spec value, note]
  const SPECS = [
    ['warrior', 'warrior', 'Protection', 'ability_warrior_defensivestance', 'tank', ['3', '✔', '✔'], 'Self healing', '1',
      'Durability, uncrushability and taunt are shared by every class that fills the tank role. The slow, the interrupt and three gap closers (Charge, Intercept, Heroic Leap) are the warrior’s own in any spec; no pet and no healing others, ever.'],
    ['druid', 'druid', 'Guardian', 'ability_racial_bearform', 'tank', ['4', '✔', '✔'], 'Self healing', '3',
      'Still durable, uncrushable and able to taunt: the role is met. But the druid class brings healing others and no baseline slow or gap closer, and bear form carries far more self healing than the warrior. Each class meets the role and still sits in its own niche.'],
    ['dk', 'dk', 'Blood', 'spell_deathknight_bloodpresence', 'tank', ['4', '✔', '✔'], 'Self healing', '4',
      'The role keywords again, but here a pet (Raise Dead) is a class feature, Death Grip is the gap closer, and the spec carries the most self healing of any tank through Death Strike.'],
    ['protpal', 'paladin', 'Protection', 'spell_holy_devotionaura', 'tank', ['4', '✔', '✔'], 'Self healing', '2',
      'A fourth tank. Healing others and an interrupt come from the paladin class; no slow, no gap closer, no pet. Compare it with the Holy Paladin sheet: the five class tiles are identical.'],
    ['holypal', 'paladin', 'Holy', 'spell_holy_holybolt', 'healer', ['5', '2', '✔'], 'Heals two at once', '✔',
      'Strong single-target healing and Beacon of Light, which copies each heal onto a second target. The class row matches the Protection Paladin sheet tile for tile; only the role and spec rows moved.'],
    ['disc', 'priest', 'Discipline', 'spell_holy_powerwordshield', 'healer', ['4', '3', '✔'], 'Absorb shields', '5',
      'The priest class has no baseline slow, interrupt or gap closer, which narrows it down. Discipline prevents damage with absorb shields instead of healing it after the fact.'],
    ['rsham', 'shaman', 'Restoration', 'spell_nature_magicimmunity', 'healer', ['3', '4', '✔'], 'Restores mana', '✔',
      'A healer that can still slow and interrupt: only the shaman has both alongside healing others. Mana Tide Totem refills the whole group’s mana, a spec keyword no other healer has.'],
    ['rdruid', 'druid', 'Restoration', 'spell_nature_healingtouch', 'healer', ['3', '5', '✔'], 'Heals over time', '5',
      'Same class row as the Guardian sheet: heals others, interrupts in bear or cat form, no slow, no pet. The role row flips from tank to healer, and the spec leans on stacking heals over time.'],
    ['arms', 'warrior', 'Arms', 'ability_warrior_savageblow', 'melee', ['✗', '3', '4'], 'Healing reduction', '✔',
      'The warrior class row from the Protection sheet, unchanged: 50% slow, interrupt, three gap closers. Mortal Strike cuts the target’s healing taken, the spec’s signature keyword.'],
    ['assa', 'rogue', 'Assassination', 'ability_rogue_eviscerate', 'melee', ['✗', '1', '4'], 'Poison damage', '5',
      'The strongest slow in the game (Crippling Poison, 70%) and an interrupt, but no pet, no healing others and no baseline gap closer: a rogue. Assassination puts its damage into poisons.'],
    ['sub', 'rogue', 'Subtlety', 'ability_stealth', 'melee', ['✗', '1', '5'], 'Shadowstep', '✔',
      'Same rogue class row as Assassination. Subtlety adds Shadowstep, a teleport behind the target: the spec supplies the gap closer the class lacks.'],
    ['unholy', 'dk', 'Unholy', 'spell_deathknight_unholypresence', 'melee', ['✗', '3', '3'], 'Permanent pet', '✔',
      'Every death knight can raise a ghoul for a minute. Unholy keeps it for good, so “Has pet” on the class row and “Permanent pet” on the spec row stack.'],
    ['enh', 'shaman', 'Enhancement', 'spell_nature_lightningshield', 'melee', ['✗', '3', '4'], 'Spirit wolves', '✔',
      'A melee damage dealer that heals others, slows and interrupts: the shaman class row again. Feral Spirit summons two wolves, a temporary pet the class row does not grant.'],
    ['bm', 'hunter', 'Beast Mastery', 'ability_hunter_bestialdiscipline', 'ranged', ['✔', '2', '4'], 'Exotic pets', '✔',
      'Ranged, with a pet and a slow, but no interrupt: a hunter. Beast Mastery can tame exotic beasts no other hunter can.'],
    ['mm', 'hunter', 'Marksmanship', 'ability_hunter_focusedaim', 'ranged', ['✔', '2', '4'], 'Silence', '✔',
      'The hunter class row has no interrupt; Marksmanship patches the gap with Silencing Shot. A spec keyword can fill a hole the class leaves open.'],
    ['shadow', 'priest', 'Shadow', 'spell_shadow_shadowwordpain', 'ranged', ['✔', '2', '2'], 'Damage heals party', '✔',
      'A damage dealer whose class heals others. Vampiric Embrace turns Shadow’s damage into healing for the party, so the priest’s class keyword still shows up in a damage role.'],
    ['fire', 'mage', 'Fire', 'spell_fire_firebolt02', 'ranged', ['✔', '4', '5'], 'Spreads burns', '✔',
      'Ranged, a 40% slow from Frostbolt, an interrupt, and nothing else: no pet, no heals, no gap closer. Fire’s Impact spreads its burns across a pack.'],
    ['frost', 'mage', 'Frost', 'spell_frost_frostbolt02', 'ranged', ['✔', '3', '3'], 'Water Elemental', '✔',
      'Same mage class row as Fire, which has no pet. Frost adds a permanent Water Elemental, the same move Unholy makes for the death knight.'],
    ['affli', 'warlock', 'Affliction', 'spell_shadow_deathcoil', 'ranged', ['✔', '2', '1'], 'Damage over time', '5',
      'A pet, a weak 30% slow and an interrupt that comes from the Felhunter: a warlock. Affliction does almost all of its damage over time.'],
    ['demo', 'warlock', 'Demonology', 'spell_shadow_metamorphosis', 'ranged', ['✔', '3', '4'], 'Becomes a demon', '✔',
      'The warlock class row again. Metamorphosis turns Demonology into a demon for a short burst window.'],
  ];
  const SHEETS = SPECS.map(([key, cls, spec, sicon, role, rv, sk, sv, note], i) => {
    const C = CLASSES_WOW[cls];
    return { key, cls, role, name: `${spec} ${C[0]}`, icon: C[1], spec: [spec, sicon], note,
      rows: [...ROLES[role].kws.map((k, j) => [k, rv[j], 'role']), ...CLASS_KWS.map((k, j) => [k, C[j + 2], 'class']), [sk, sv, 'spec']] };
  });
  // seeded shuffles, so each sheet has its own layout and choices, the same on every visit
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  SHEETS.forEach((S, i) => {
    const r = rng(1000 + i * 97);
    S.mix = i === 0 ? [4, 0, 7, 2, 5, 8, 1, 6, 3] : shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], r);
    // four answers: this sheet, the other spec of its class, and two from the same role
    const sib = SHEETS.filter(o => o.cls === S.cls && o !== S);
    const same = shuffle(SHEETS.filter(o => o.role === S.role && o.cls !== S.cls), r);
    const rest = shuffle(SHEETS.filter(o => o !== S && !sib.includes(o) && !same.includes(o)), r);
    S.choices = shuffle([S, ...sib, ...same, ...rest].slice(0, 4), r);
  });
  const FILTERS = [['all', 'All 20'], ['tank', 'Tanks'], ['healer', 'Healers'], ['melee', 'Melee'], ['ranged', 'Ranged']];
  const LAYER = { class: ['Class', 'the class in any spec'], spec: ['Spec', 'this specialisation only'] };
  demo('sheet', {
    init(s) {
      const st = { i: 0, f: 'all', sorted: false, guessed: false };
      const tabs = $(s, '.ks-tabs'), sheet = $(s, '.ks-sheet'), guess = $(s, '.ks-guess'), out = $(s, '.ks-out');
      const list = () => SHEETS.map((S, i) => i).filter(i => st.f === 'all' || SHEETS[i].role === st.f);
      const go = i => { st.i = i; st.guessed = false; st.sorted = false; paint(); };
      function paint() {
        const S = SHEETS[st.i], L = list(), at = L.indexOf(st.i);
        tabs.innerHTML = `<div class="ks-filter">${FILTERS.map(([k, n]) => `<button class="ks-tab${st.f === k ? ' on' : ''}" data-f="${k}">${n}</button>`).join('')}</div>` +
          `<div class="ks-nav"><button class="ks-step" data-d="-1" aria-label="Previous sheet">‹</button><span>Sheet ${at + 1} <small>of ${L.length}</small></span><button class="ks-step" data-d="1" aria-label="Next sheet">›</button><button class="ks-tab ks-rand">Random sheet</button></div>`;
        $$(tabs, '[data-f]').forEach(b => b.onclick = () => { st.f = b.dataset.f; go(list()[0]); });
        $$(tabs, '.ks-step').forEach(b => b.onclick = () => { const n = L.length; go(L[(at + +b.dataset.d + n) % n]); });
        $(tabs, '.ks-rand').onclick = () => { const o = L.filter(i => i !== st.i); go(o[Math.floor(Math.random() * o.length)] ?? st.i); };
        const cell = ([n, v, l]) => `<div class="kw ${st.sorted ? l : ''} ${v === '✗' || v === '0' ? 'no' : ''}"><span>${n}</span><b>${v}</b></div>`;
        const head = l => l === 'role' ? [ROLES[S.role].name, ROLES[S.role].every, null] : l === 'class' ? [LAYER.class[0], st.guessed ? `${CLASSES_WOW[S.cls][0]} in any spec` : LAYER.class[1], S.icon] : [LAYER.spec[0], st.guessed ? S.spec[0] + ' only' : LAYER.spec[1], S.spec[1]];
        sheet.innerHTML = st.sorted
          ? ['role', 'class', 'spec'].map(l => { const [b, sm, ic] = head(l); return `<div class="layer ${l}"><div class="lh">${st.guessed && ic ? `<img src="img/wow-${ic}.jpg" alt="">` : ''}<b>${b}</b><small>${sm}</small></div><div class="lk">${S.rows.filter(r => r[2] === l).map(cell).join('')}</div></div>`; }).join('')
          : `<div class="cloud">${S.mix.map(i => cell(S.rows[i])).join('')}</div>`;
        guess.innerHTML = `<h4>Which class is it?</h4>` + S.choices.map(o => `<button class="ks-g${st.guessed && o === S ? ' yes' : ''}" data-k="${o.key}"><img src="img/wow-${o.icon}.jpg" alt="">${o.name}</button>`).join('') +
          (st.guessed ? SHEETS.filter(o => o.cls === S.cls && o !== S).map(o => `<button class="ks-sib" data-k="${o.key}">Compare: ${o.name} →</button>`).join('') : '');
        $$(guess, '.ks-g').forEach(b => b.onclick = () => { if (b.dataset.k === S.key) { st.guessed = true; st.sorted = true; paint(); } else { b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 500); } });
        $$(guess, '.ks-sib').forEach(b => b.onclick = () => { const j = SHEETS.findIndex(o => o.key === b.dataset.k); if (!list().includes(j)) st.f = 'all'; go(j); });
        say(out, st.guessed ? `<b>${S.name}.</b> ${S.note}` : 'A random scattering of keywords from one class. The exact keywords aren’t the point: they convey what the class can access, and how well.');
        $(s, '.ks-sort').classList.toggle('on', st.sorted);
      }
      $(s, '.ks-sort').onclick = () => { st.sorted = true; paint(); };
      $(s, '.ks-mix').onclick = () => { st.sorted = false; paint(); };
      paint();
    },
  });

  /* ---------- slide 3: the model ---------- */
  const SIT = [
    ['cluster', 'Clustered enemies', 'packs standing close together'],
    ['damage', 'Dangerous damage', 'hits that can kill'],
    ['casters', 'Enemy casters', 'spells worth stopping'],
    ['adds', 'Adds chasing allies', 'threats on the squishy ones'],
    ['elite', 'Lone elite', 'one high-value target'],
  ];
  // how much a situation asks for each keyword, 0..1
  const DEMAND = {
    'Area damage': x => x.cluster,
    'Taunt': x => x.adds,
    'Durable': x => x.damage,
    'Heals others': x => x.damage * .9,
    'Self healing': x => x.damage * (1 - .6 * x.adds),
    'Interrupt': x => x.casters,
    'Slow': x => x.adds * .8 + x.cluster * .2,
    'Stun': x => Math.max(x.casters * .6, x.elite * .7),
    'Burst': x => x.elite,
    'Stealth': x => x.elite * .7 + x.casters * .3,
    'Gap closer': x => Math.max(x.casters * .7, x.elite * .6),
    'Escapes': x => x.damage * .5 + x.adds * .5,
  };
  const CLASSES = [
    { name: 'Warden', role: 'Tank', icon: 'tank', col: C.player, kws: [['Durable', '4', 'role'], ['Taunt', '✔', 'role'], ['Interrupt', '✔', 'class'], ['Gap closer', '2', 'spec']] },
    { name: 'Pyromancer', role: 'Mage', icon: 'mage', col: '#e8641c', kws: [['Area damage', '5', 'role'], ['Slow', '30%', 'class'], ['Interrupt', '✔', 'class'], ['Self healing', '0', 'spec']] },
    { name: 'Cleric', role: 'Enchanter', icon: 'support', col: C.p2, kws: [['Heals others', '4', 'role'], ['Self healing', '2', 'class'], ['Stun', '✔', 'class'], ['Escapes', '1', 'spec']] },
    { name: 'Stalker', role: 'Assassin', icon: 'assassin', col: C.p3, kws: [['Burst', '5', 'role'], ['Stealth', '✔', 'class'], ['Gap closer', '3', 'class'], ['Escapes', '2', 'spec']] },
  ];
  const PRESETS = [
    ['Trash pull', { cluster: 1, damage: .3, casters: 0, adds: .6, elite: 0 }],
    ['Boss', { cluster: 0, damage: 1, casters: 0, adds: 0, elite: 1 }],
    ['Caster pack', { cluster: .5, damage: .5, casters: 1, adds: .3, elite: 0 }],
    ['Harmless pack', { cluster: 0, damage: 0, casters: 0, adds: 0, elite: 0 }],
  ];
  // a keyword with a zero weight never matters, whatever the content asks
  const useful = (kw, x) => (kw[1] === '0' || kw[1] === '✗') ? 0 : clamp(DEMAND[kw[0]](x));

  // the encounter, drawn from the sliders: where enemies stand, who casts, who chases whom
  function encounter(g, x, t, o = {}) {
    T.use(g);
    const W = 900, H = 300;
    T.floor(0, 0, W, H); T.wall(0, 0, W, 18); T.wall(0, H - 18, W, 18);
    const party = [[160, 110, C.player], [120, 190, '#e8641c'], [210, 220, C.p2], [230, 150, C.p3]];
    // red wash for dangerous damage
    if (x.damage > .05) { g.fillStyle = `rgba(229,50,45,${.12 * x.damage + .04 * x.damage * Math.sin(t * 4)})`; g.fillRect(0, 0, W, H); }
    // the pack: spread out or clustered
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + t * .3, r = lerp(110, 30, x.cluster);
      const px = 600 + Math.cos(a) * r, py = 150 + Math.sin(a) * r * .7;
      if (i < Math.round(x.casters * 3)) {
        T.foe(px, py, 16, Math.PI, '#b33bd0', { mark: 'staff', edge: '#6e1f80' });
        if (Math.sin(t * 3 + i) > .3) { g.strokeStyle = 'rgba(179,59,208,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(px, py, 22, -Math.PI / 2, -Math.PI / 2 + (t * 2 + i) % 1 * Math.PI * 2); g.stroke(); }
      } else T.foe(px, py, 16, Math.PI, C.red, { mark: 'horns' });
    }
    if (x.cluster > .6 && !o.quiet) T.label('clustered', 600, 268, 'center', C.redDk, 14);
    // adds chasing the healer
    const nAdds = Math.round(x.adds * 3);
    for (let i = 0; i < nAdds; i++) { const k = (t * .25 + i * .33) % 1, ax = lerp(470, 250, k), ay = 230 + (i - 1) * 22; T.foe(ax, ay, 12, Math.PI, '#d8452f', {}); }
    if (nAdds && !o.quiet) T.label('adds after the healer', 360, 280, 'center', C.redDk, 14);
    // the lone elite
    if (x.elite > .05) T.foe(790, 150, 22 + 20 * x.elite, Math.PI, '#8a1c15', { mark: 'horns', a: .4 + .6 * x.elite });
    party.forEach(([px, py, c]) => T.player(px, py, 0, .8, 1, c));
  }

  canvasDemo('title', (s, cv, g) => (dt, t) => { const i = Math.floor(t / 3) % PRESETS.length; encounter(g, PRESETS[i][1], t, { quiet: true }); });

  let api = null;
  canvasDemo('board', (s, cv, g) => {
    const st = { x: { ...PRESETS[0][1] }, tour: true, tt: 0, t: 0, held: false };
    const pre = $(s, '.kb-presets'), sls = $(s, '.kb-sliders'), cards = $(s, '.kb-cards');
    pre.innerHTML = PRESETS.map(([n], i) => `<button class="kb-pre" data-i="${i}">${n}</button>`).join('');
    sls.innerHTML = SIT.map(([k, n, d]) => `<label><span>${n} <small>${d}</small></span><input type="range" min="0" max="100" data-k="${k}"></label>`).join('');
    cards.innerHTML = CLASSES.map((c, ci) => `<div class="kc" style="--c:${c.col}"><div class="kh"><img src="img/lol-${c.icon}.png" alt=""><b>${c.name}</b><span>${c.role}</span></div>` +
      c.kws.map(([n, v, l], ki) => `<div class="kr" data-c="${ci}" data-k="${ki}"><span class="ly ${l}">${l}</span><span class="kn">${n}</span><b>${v}</b><div class="m"><i></i></div><em></em></div>`).join('') + '</div>').join('');
    $$(pre, '.kb-pre').forEach(b => b.onclick = () => { st.tour = false; st.x = { ...PRESETS[+b.dataset.i][1] }; });
    $$(sls, 'input').forEach(el => el.oninput = () => { st.tour = false; st.x[el.dataset.k] = el.value / 100; });
    const DT = 5;
    function render() {
      let x = st.x;
      if (st.tour) {
        // glide from one preset to the next
        const n = PRESETS.length, f = (st.tt / DT) % n, i = Math.floor(f), k = ease(clamp((f - i - .7) / .3));
        const a = PRESETS[i][1], b = PRESETS[(i + 1) % n][1];
        x = Object.fromEntries(SIT.map(([key]) => [key, lerp(a[key], b[key], k)]));
        st.x = x;
      }
      g.clearRect(0, 0, cv.width, cv.height);
      encounter(g, x, st.t);
      $$(sls, 'input').forEach(el => { if (document.activeElement !== el) el.value = Math.round(x[el.dataset.k] * 100); });
      $$(pre, '.kb-pre').forEach((b, i) => b.classList.toggle('on', SIT.every(([k]) => Math.abs(PRESETS[i][1][k] - x[k]) < .02)));
      $$(cards, '.kr').forEach(r => {
        const kw = CLASSES[+r.dataset.c].kws[+r.dataset.k], u = useful(kw, x);
        r.querySelector('i').style.width = `${Math.round(u * 100)}%`;
        r.classList.toggle('dead', u < .08); r.classList.toggle('hot', u > .7);
        r.querySelector('em').textContent = kw[1] === '0' ? 'weight 0' : u < .08 ? 'never matters here' : u > .7 ? 'in demand' : '';
      });
    }
    api = { seek(t) { st.held = true; st.tour = true; st.tt = t; st.t = t; render(); }, dur: () => DT * PRESETS.length };
    return dt => { dt = dt || 0; if (!st.held) { st.tt += dt; st.t += dt; } render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
