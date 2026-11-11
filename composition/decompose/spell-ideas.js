/* Spell idea generator (MGM C4 M7, deck slide 74). The spell creation framework from slide 74 with all nine columns: shape,
   proxy, payload, valid targets, cast position type, special conditions, problem it solves (purpose), presentation /
   packaging, and keywords. Roll fills every unlocked column; click a column header to lock it, click a note to reroll only
   that column. A column can hold more than one note, as in the deck's worked examples (Fireball, Spiritual Weapon).
   Coherent mode only draws values that agree with each other (a heal goes to an ally, a cone starts at the caster); Wild mode
   draws anything and names the clashes as design prompts. Options after the slide's "..." (dashed notes), the statuses,
   resources, themes, purposes and keyword mapping are this page's additions. */
(function () {
  const { $, $$ } = FPF.kit;
  const { icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C;

  // ---------- the framework ----------
  const COLS = [
    ['shape', 'Shape'], ['proxy', 'Proxy'], ['pay', 'Payload'], ['targets', 'Valid Targets'], ['cast', 'Cast Position Type'],
    ['cond', 'Special Conditions'], ['purpose', 'Problem It Solves (Purpose)'], ['pack', 'Presentation / Packaging'], ['keys', 'Keywords'],
  ];
  const SHAPES = ['Single Target', 'Circular Area', 'Line', 'Cone', 'Chain'];
  const PROXIES = ['Caster', 'Missile', 'Pet', 'Trap / Device', 'Beam'];
  const PAYLOADS = ['Damage', 'Spell Cast Interrupt', 'Stun', 'Charge', 'Apply Status', 'Knockback', 'Teleport', 'Heal', 'Shield', 'Pull'];
  const TARGETS = ['Player', 'Enemy', 'Environment', 'Ally'];
  const CASTS = ['Caster Position', 'Chosen Target Location', 'Enemy Target Loc', 'Predefined Environmental Location', 'Target Current Location', 'None'];
  // values that sit past the slide's "..." are drawn dashed
  const EXTRA = new Set(['Chain', 'Beam', 'Shield', 'Pull', 'AoE', 'Healing', 'Mobility', 'Summon', 'Zone Control', 'Buff', 'Debuff', 'Stealth']);
  // status effects that fill "Apply <Status Effect>": [name, harmful?, keyword, purposes]
  const STATUS = {
    Burning: [1, 'Sustained Damage', ['Enemy regenerates health', 'Enemy still alive']],
    Chilled: [1, 'Snare', ['Enemy runs away', 'Enemy closes in too fast']],
    Rooted: [1, 'Snare', ['Enemy chasing you', 'Need to escape']],
    Silenced: [1, 'CC', ['Enemy caster keeps casting']],
    Poisoned: [1, 'Sustained Damage', ['Enemy heals itself', 'Enemy still alive']],
    Weakened: [1, 'Debuff', ['Enemy hits too hard']],
    Exposed: [1, 'Debuff', ['Team needs a focus target']],
    Paralyzed: [1, 'CC', ['Enemy is faster than you']],
    Hasted: [0, 'Buff', ['Ally needs to get there faster']],
    Regenerating: [0, 'Healing', ['Party worn down after a fight']],
    Stealthed: [0, 'Stealth', ['Too many eyes on you']],
    Empowered: [0, 'Buff', ['Big burst window coming']],
  };
  const HARMFUL = Object.keys(STATUS).filter(k => STATUS[k][0]), HELPFUL = Object.keys(STATUS).filter(k => !STATUS[k][0]);
  const RESOURCES = ['30 Rage', '3 Combo Points', '2nd level spell slot', '1 Soul Shard', 'Full Focus bar', '1 of 2 charges', '40 Mana'];
  const NEEDS_HARM = ['Target is Burning', 'Target is Rooted', 'Target is Exposed', 'You are Stealthed', 'Target below 20% health'];
  const NEEDS_HELP = ['Ally below 30% health', 'You are Empowered', 'Ally is Stunned'];
  // packaging themes: [adjective, colour, name words, icons by role]
  const THEMES = {
    Fire: ['Burning', 'red', ['Searing', 'Cinder', 'Ember', 'Flame'], { hit: 'wow-spell_fire_flamebolt.jpg', area: 'wow-spell_shadow_rainoffire.jpg', trap: 'wow-spell_fire_selfdestruct.jpg', help: 'wow-spell_fire_firearmor.jpg', pet: 'wow-spell_shadow_summoninfernal.jpg' }],
    Frost: ['Freezing', 'pale blue', ['Frost', 'Glacial', 'Rime', 'Ice'], { hit: 'wow-spell_frost_frostbolt02.jpg', area: 'wow-spell_frost_frostnova.jpg', trap: 'wow-spell_frost_chainsofice.jpg', help: 'wow-spell_frost_frostarmor02.jpg', pet: 'wow-spell_frost_summonwaterelemental_2.jpg' }],
    Holy: ['Radiant', 'golden', ['Radiant', 'Dawn', 'Hallowed', 'Sun'], { hit: 'wow-spell_holy_holybolt.jpg', area: 'wow-spell_holy_searinglight.jpg', trap: 'wow-spell_holy_sealofmight.jpg', help: 'wow-spell_holy_flashheal.jpg', pet: 'wow-spell_holy_auraoflight.jpg' }],
    Shadow: ['Shadowy', 'violet', ['Shadow', 'Umbral', 'Dusk', 'Hollow'], { hit: 'wow-spell_shadow_lifedrain02.jpg', area: 'wow-spell_shadow_mindrot.jpg', trap: 'wow-spell_shadow_charm.jpg', help: 'wow-ability_vanish.jpg', pet: 'wow-spell_shadow_summoninfernal.jpg' }],
    Nature: ['Thorny', 'green', ['Bramble', 'Verdant', 'Thorn', 'Wild'], { hit: 'wow-spell_nature_stormreach.jpg', area: 'wow-spell_nature_tranquility.jpg', trap: 'wow-spell_nature_earthbind.jpg', help: 'wow-spell_nature_healingwavegreater.jpg', pet: 'wow-ability_hunter_pet_turtle.jpg' }],
    Lightning: ['Crackling', 'electric blue', ['Storm', 'Thunder', 'Static', 'Volt'], { hit: 'wow-spell_nature_lightning.jpg', area: 'wow-spell_nature_thunderclap.jpg', trap: 'wow-spell_nature_lightningshield.jpg', help: 'wow-spell_nature_bloodlust.jpg', pet: 'wow-spell_nature_lightningoverload.jpg' }],
    Arcane: ['Shimmering', 'purple', ['Arcane', 'Astral', 'Mirror', 'Rune'], { hit: 'wow-spell_nature_wispsplode.jpg', area: 'wow-spell_nature_wispsplode.jpg', trap: 'wow-spell_fire_rune.jpg', help: 'wow-spell_arcane_blink.jpg', pet: 'wow-spell_nature_magicimmunity.jpg' }],
    Water: ['Surging', 'sea-green', ['Tidal', 'Brine', 'Torrent', 'Mist'], { hit: 'wow-spell_frost_summonwaterelemental_2.jpg', area: 'wow-ability_druid_typhoon.jpg', trap: 'wow-inv_misc_volatilewater.jpg', help: 'wow-spell_nature_giftofthewaterspirit.jpg', pet: 'wow-spell_frost_summonwaterelemental_2.jpg' }],
    Steel: ['Gleaming', 'silver', ['Iron', 'Steel', 'Brutal', 'Rending'], { hit: 'wow-ability_warrior_savageblow.jpg', area: 'wow-ability_shockwave.jpg', trap: 'wow-ability_warrior_shieldbash.jpg', help: 'wow-ability_warrior_shieldwall.jpg', pet: 'wow-ability_warrior_battleshout.jpg' }],
  };
  // packaging nouns by proxy, then by shape
  const NOUNS = {
    Missile: { 'Single Target': ['orb', 'bolt', 'shard', 'javelin'], 'Circular Area': ['comet', 'bomb', 'meteor'], Line: ['lance', 'spear'], Chain: ['spark', 'ricocheting disc'] },
    Caster: { 'Single Target': ['touch', 'strike', 'palm'], 'Circular Area': ['nova', 'pulse', 'shockwave'], Cone: ['breath', 'blast', 'spray'], Line: ['wave', 'slash'], Chain: ['arc', 'chain'] },
    Pet: { any: ['spirit wolf', 'floating sword', 'imp', 'elemental', 'golem', 'raven'] },
    'Trap / Device': { any: ['rune on the ground', 'totem', 'turret', 'mine', 'sigil'] },
    Beam: { any: ['beam', 'ray', 'tether'] },
  };
  const NAME_NOUN = {
    Damage: ['Bolt', 'Lance', 'Burst', 'Strike'], 'Spell Cast Interrupt': ['Snap', 'Silence', 'Hush'], Stun: ['Shackle', 'Slam', 'Daze'], Charge: ['Rush', 'Leap', 'Charge'],
    Knockback: ['Gust', 'Shove', 'Repulse'], Teleport: ['Step', 'Shift', 'Blink'], Heal: ['Mending', 'Renewal', 'Touch'], Shield: ['Ward', 'Aegis', 'Barrier'], Pull: ['Grasp', 'Hook', 'Tether'],
    Apply: ['Curse', 'Hex', 'Mark'], ApplyHelp: ['Blessing', 'Boon', 'Gift'],
  };
  const PURPOSE = {
    Damage: ['Enemy still alive', 'Enemy out of melee reach', 'Dangerous to approach'], 'Spell Cast Interrupt': ['Enemy casting a big spell', 'Healer undoes your damage'],
    Stun: ['Enemy about to hit hard', 'Need a moment to escape'], Charge: ['Enemy is far away', 'Ally attacked across the room'],
    Knockback: ['Enemy is too close', 'Enemy standing on the objective'], Teleport: ['Surrounded', 'Gap too wide to cross', 'Need the high ground'],
    Heal: ['Ally about to die', 'Party worn down after a fight'], Shield: ['Big hit incoming', 'Ally is being focused'], Pull: ['Enemy hides behind its friends', 'Enemy out of reach'],
  };
  const PURPOSE_SHAPE = { 'Circular Area': ['Enemies bunched together', 'Swarm of weak enemies'], Line: ['Enemies lined up in a corridor'], Cone: ['Enemies crowding in front'], Chain: ['Enemies spread out'] };
  const PURPOSE_PROXY = { Pet: ['Distraction', 'Need an extra pair of hands'], 'Trap / Device': ['Enemy will come through here', 'Choke point to hold'] };

  // ---------- rules: what agrees with what (coherent mode) ----------
  const kind = p => p === 'Apply Status' ? null : (['Heal', 'Shield'].includes(p) ? 'help' : ['Charge', 'Teleport'].includes(p) ? 'move' : 'harm');
  const payKinds = d => d.pay.map(p => p === 'Apply Status' ? (STATUS[d.status]?.[0] ? 'harm' : 'help') : kind(p));
  const has = (d, p) => d.pay.includes(p);
  const same = (a, b) => a.join('|') === b.join('|');
  function allowedProxy(d) {
    if (has(d, 'Teleport') || has(d, 'Charge')) return ['Caster'];
    if (has(d, 'Spell Cast Interrupt')) return ['Caster', 'Missile', 'Pet'];
    if (has(d, 'Pull')) return ['Caster', 'Missile', 'Beam', 'Trap / Device'];
    return PROXIES;
  }
  function allowedShape(d) {
    if (has(d, 'Teleport')) return ['Single Target'];
    if (has(d, 'Charge')) return ['Single Target', 'Line'];
    const byProxy = { Missile: ['Single Target', 'Circular Area', 'Line', 'Chain'], Beam: ['Single Target', 'Line', 'Chain'], Pet: ['Single Target', 'Circular Area', 'Cone', 'Chain'], 'Trap / Device': ['Single Target', 'Circular Area', 'Line', 'Cone'], Caster: SHAPES }[d.proxy];
    return has(d, 'Spell Cast Interrupt') ? byProxy.filter(s => ['Single Target', 'Cone', 'Circular Area'].includes(s)) : byProxy;
  }
  function allowedTargets(d) {
    const k = payKinds(d);
    if (has(d, 'Teleport')) return k.includes('harm') ? [['Player', 'Enemy']] : [['Player']];
    if (has(d, 'Charge')) return k.includes('harm') ? [['Enemy']] : [['Enemy'], ['Ally']];
    if (k.includes('help')) return d.shape === 'Single Target' ? [['Ally'], ['Player'], ['Player', 'Ally']] : [['Ally'], ['Player', 'Ally']];
    return (has(d, 'Damage') || has(d, 'Knockback')) && d.shape !== 'Chain' ? [['Enemy'], ['Enemy'], ['Environment', 'Enemy']] : [['Enemy']];
  }
  function allowedCast(d) {
    const enemy = d.targets.includes('Enemy');
    if (has(d, 'Teleport')) return [['Chosen Target Location'], ['Caster Position', 'Chosen Target Location']];
    if (has(d, 'Charge')) return [['Enemy Target Loc'], ['Target Current Location']];
    if (same(d.targets, ['Player']) && d.proxy === 'Caster') return [['None'], ['Caster Position']];
    const out = {
      Missile: d.shape === 'Circular Area' ? [['Caster Position', 'Chosen Target Location'], ['Caster Position', 'Target Current Location']] : [['Caster Position', 'Target Current Location']],
      Beam: [['Caster Position', 'Target Current Location']],
      'Trap / Device': [['Chosen Target Location'], ['Predefined Environmental Location'], ['Caster Position']],
      Pet: [['Chosen Target Location'], ['Caster Position']],
      Caster: ({ Cone: [['Caster Position']], Line: [['Caster Position']], 'Circular Area': [['Caster Position'], ['Chosen Target Location'], ['Target Current Location'], ['Predefined Environmental Location']] })[d.shape] || [['Target Current Location']],
    }[d.proxy];
    if (enemy && d.proxy !== 'Beam') out.push(d.proxy === 'Missile' ? ['Caster Position', 'Enemy Target Loc'] : ['Enemy Target Loc']);
    return out;
  }
  const condFits = d => d.cond.k !== 'stat' || (payKinds(d).includes('help') ? NEEDS_HELP : NEEDS_HARM).includes(d.cond.v);
  // every rule a combination breaks, phrased as a design prompt
  function clashes(d) {
    const out = [], k = payKinds(d), pn = d.pay.map(p => p === 'Apply Status' ? `Apply ${d.status}` : p).join(' + ');
    if (k.includes('help') && k.includes('harm')) out.push('Helps and harms at once: lifesteal, or a cursed gift?');
    if (!allowedProxy(d).includes(d.proxy)) out.push(`${pn} through a ${d.proxy.toLowerCase()}: what does that look like?`);
    if (!allowedShape(d).includes(d.shape)) out.push(`${d.shape} is an odd shape for a ${d.proxy.toLowerCase()} that does ${d.pay[0].toLowerCase()}.`);
    if (!allowedTargets(d).some(t => same(t, d.targets))) out.push(k.includes('help') && d.targets.includes('Enemy') ? 'It helps an enemy: a trade-off, or a mistake?' : `${pn} on ${d.targets.join(' + ')}: who wants that, and why?`);
    if (!allowedCast(d).some(c => same(c, d.cast))) out.push(`Cast from ${d.cast.join(' to ')}: how does the player aim it?`);
    if (!condFits(d)) out.push(`Requires "${d.cond.v}": when is that ever true for this spell?`);
    return out;
  }

  // ---------- rolling ----------
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let R = Math.random;
  const pick = a => a[Math.floor(R() * a.length)];
  const some = (a, n) => [...a].sort(() => R() - .5).slice(0, n);
  // second payloads that read as one spell
  const PAIRS = { Damage: ['Apply Status', 'Knockback', 'Stun'], Stun: ['Damage'], Charge: ['Stun', 'Damage', 'Apply Status'], Knockback: ['Damage'], Teleport: ['Damage', 'Apply Status'], Heal: ['Apply Status', 'Shield'], Shield: ['Apply Status'], Pull: ['Damage', 'Stun'], 'Spell Cast Interrupt': ['Apply Status'], 'Apply Status': ['Damage'] };
  function drawPay(two, wild) {
    let a = pick(PAYLOADS), b = null;
    if (two && R() < .4) {
      b = pick(wild ? PAYLOADS.filter(p => p !== a) : PAIRS[a]);
    }
    const pay = b ? [a, b] : [a];
    if (a === 'Apply Status' && b) pay.reverse();
    return pay;
  }
  function drawStatus(d, wild) {
    if (!has(d, 'Apply Status')) return null;
    if (wild) return pick(Object.keys(STATUS));
    const k = d.pay.filter(p => p !== 'Apply Status').map(kind);
    return pick(k.includes('harm') || k.includes('move') ? HARMFUL : k.includes('help') ? HELPFUL : Object.keys(STATUS));
  }
  function packOf(d) {
    const N = NOUNS[d.proxy], nouns = has(d, 'Charge') ? ['dash', 'leap', 'trail'] : has(d, 'Teleport') ? ['flash', 'step', 'portal'] : N.any || N[d.shape] || N['Single Target'] || ['orb'];
    const [adj, col] = THEMES[d.theme];
    return d.proxy === 'Pet' ? `${adj} ${pick(nouns)}` : `${adj} ${col} ${pick(nouns)}`;
  }
  function nameOf(d) {
    const p = d.pay.find(x => x !== 'Apply Status'), help = STATUS[d.status] && !STATUS[d.status][0];
    const noun = d.proxy === 'Pet' ? pick(['Familiar', 'Guardian', 'Sentinel']) : d.proxy === 'Trap / Device' && !p ? pick(['Snare', 'Rune', 'Totem']) : pick(NAME_NOUN[p || (help ? 'ApplyHelp' : 'Apply')]);
    return `${pick(THEMES[d.theme][2])} ${noun}`;
  }
  function iconOf(d) {
    const I = THEMES[d.theme][3];
    return payKinds(d).includes('help') ? I.help : d.proxy === 'Pet' ? I.pet : d.proxy === 'Trap / Device' ? I.trap : d.shape === 'Circular Area' || d.shape === 'Cone' ? I.area : I.hit;
  }
  function purposeOf(d) {
    let ps = [];
    d.pay.forEach(p => { if (p === 'Apply Status') ps.push(...(STATUS[d.status]?.[2] || [])); else ps.push(...PURPOSE[p]); });
    if (payKinds(d).includes('harm')) ps.push(...(PURPOSE_SHAPE[d.shape] || []));
    if (d.targets.includes('Environment')) ps.push('Barricade blocks the path');
    const extra = PURPOSE_PROXY[d.proxy] ? [pick(PURPOSE_PROXY[d.proxy])] : [];
    ps = [...new Set(ps)];
    return [...some(ps, R() < .5 ? 1 : 2), ...extra].slice(0, 3);
  }
  function keysOf(d) {
    const k = [];
    const dot = d.status && STATUS[d.status][1] === 'Sustained Damage';
    if (has(d, 'Damage')) k.push(dot || d.proxy === 'Pet' || d.proxy === 'Beam' ? 'Sustained Damage' : 'Burst Damage');
    if (has(d, 'Stun')) k.push('CC');
    if (has(d, 'Spell Cast Interrupt')) k.push('Interrupt');
    if (has(d, 'Knockback') || has(d, 'Pull')) k.push('Disruption');
    if (has(d, 'Heal')) k.push('Healing');
    if (has(d, 'Shield')) k.push('Protection');
    if (has(d, 'Charge') || has(d, 'Teleport')) k.push('Mobility');
    if (d.status) k.push(STATUS[d.status][1]);
    if (d.proxy === 'Pet') k.push('Summon');
    if (d.proxy === 'Trap / Device') k.push('Zone Control');
    if (['Circular Area', 'Cone', 'Chain'].includes(d.shape) && !k.includes('Healing')) k.push('AoE');
    return [...new Set(k)].slice(0, 4);
  }
  function drawCond(d, wild) {
    const r = R();
    if (r < .45) return { k: 'none', v: 'None' };
    if (r < .75) return { k: 'res', v: pick(RESOURCES) };
    return { k: 'stat', v: pick(wild ? [...NEEDS_HARM, ...NEEDS_HELP] : payKinds(d).includes('help') ? NEEDS_HELP : NEEDS_HARM) };
  }
  // roll every unlocked column; locked ones (lock[col] true) keep prev's value
  function roll(prev, lock, opt) {
    let d;
    for (let a = 0; a < 800; a++) {
      d = { game: prev?.game || 'Your game', show: {} };
      const keep = c => lock[c] && prev;
      if (keep('pay')) { d.pay = [...prev.pay]; d.status = prev.status; if (prev.show.pay) d.show.pay = prev.show.pay; }
      else { d.pay = drawPay(opt.two, opt.wild); d.status = drawStatus(d, opt.wild); }
      d.proxy = keep('proxy') ? prev.proxy : pick(opt.wild ? PROXIES : allowedProxy(d));
      d.shape = keep('shape') ? prev.shape : pick(opt.wild ? SHAPES : allowedShape(d));
      d.targets = keep('targets') ? [...prev.targets] : opt.wild ? some(TARGETS, R() < .7 ? 1 : 2).sort((x, y) => TARGETS.indexOf(x) - TARGETS.indexOf(y)) : [...pick(allowedTargets(d))];
      d.cast = keep('cast') ? [...prev.cast] : opt.wild ? some(CASTS, R() < .7 ? 1 : 2) : [...pick(allowedCast(d))];
      d.cond = keep('cond') ? { ...prev.cond } : drawCond(d, opt.wild);
      if (keep('cond') && prev.show.cond) d.show.cond = prev.show.cond;
      if (keep('pack')) { d.theme = prev.theme; d.pack = prev.pack; } else { d.theme = pick(Object.keys(THEMES)); d.pack = packOf(d); }
      d.purpose = keep('purpose') ? [...prev.purpose] : purposeOf(d);
      d.keys = keep('keys') ? [...prev.keys] : keysOf(d);
      ['shape', 'proxy', 'targets', 'cast'].forEach(c => { if (keep(c) && prev.show[c]) d.show[c] = prev.show[c]; });
      d.name = lock.name && prev ? prev.name : nameOf(d);
      d.icon = lock.name && prev ? prev.icon : iconOf(d);
      d.game = lock.name && prev ? prev.game : 'Your game';
      d.clash = clashes(d);
      if (opt.wild || !d.clash.length) return d;
    }
    return d;   // locked columns that no coherent fill agrees with: the clashes say why
  }

  // ---------- worked examples: the deck's two (slide 74's example usage) and three more ----------
  const EX = [
    { game: 'World of Warcraft', name: 'Fireball', icon: 'wow-spell_fire_flamebolt.jpg', shape: 'Single Target', proxy: 'Missile', pay: ['Damage', 'Apply Status'], status: 'Burning', targets: ['Enemy'], cast: ['Caster Position', 'Target Current Location'], cond: { k: 'none', v: 'None' }, purpose: ['Enemy Still Alive'], theme: 'Fire', pack: 'Burning Red Orb', keys: ['[Damage] (Sustained)'], show: { pay: ['Damage', 'Apply Damage Over Time Status'] }, pitch: 'Launch a burning red orb at an enemy: it deals damage, then burns over time.' },
    { game: 'D&D', name: 'Spiritual Weapon', gi: 'spiked-mace', shape: 'Single Target', proxy: 'Pet', pay: ['Damage'], status: null, targets: ['Environment', 'Enemy'], cast: ['Chosen Target Location'], cond: { k: 'res', v: '2nd level spell slot (or higher)' }, purpose: ['Enemy is still alive', 'Distraction', 'Dangerous to approach'], theme: 'Holy', pack: 'Spiritual weapon of player’s choice', keys: ['Sustained Damage', 'Summon'], show: { proxy: ['Pet/Summon'], cond: ['2nd level spell slot (or higher)'] }, pitch: 'Summon a floating spectral weapon at a spot you choose; it attacks a creature or object near it, turn after turn.' },
    { game: 'World of Warcraft', name: 'Frost Nova', icon: 'wow-spell_frost_frostnova.jpg', shape: 'Circular Area', proxy: 'Caster', pay: ['Damage', 'Apply Status'], status: 'Rooted', targets: ['Enemy'], cast: ['Caster Position'], cond: { k: 'none', v: 'None' }, purpose: ['Enemies in melee range', 'Need to escape'], theme: 'Frost', pack: 'Ring of ice bursting from the caster', keys: ['Burst Damage', 'Snare', 'AoE'], show: { pay: ['Damage', 'Apply Rooted'] }, pitch: 'Burst a ring of ice around you: nearby enemies take damage and freeze in place.' },
    { game: 'Pokémon', name: 'Thunder Wave', pic: 'pk-pikachu.png', shape: 'Single Target', proxy: 'Caster', pay: ['Apply Status'], status: 'Paralyzed', targets: ['Enemy'], cast: ['Target Current Location'], cond: { k: 'res', v: '1 PP' }, purpose: ['Enemy is faster than you'], theme: 'Lightning', pack: 'Weak jolt of yellow electricity', keys: ['CC', 'Snare'], show: { pay: ['Apply Paralysis'], cond: ['Require 1 PP'] }, pitch: 'Send a weak jolt at the foe: it is paralyzed, slower, and sometimes cannot move at all.' },
    { game: 'League of Legends', name: 'Unbreakable', icon: 'lol-BraumE.png', shape: 'Cone', proxy: 'Caster', pay: ['Shield'], status: null, targets: ['Player', 'Ally'], cast: ['Caster Position'], cond: { k: 'none', v: 'None' }, purpose: ['Missiles incoming', 'Ally is being shot'], theme: 'Steel', pack: 'Giant door-shaped shield', keys: ['Protection'], show: { pay: ['Block Missiles'] }, pitch: 'Raise a giant shield in one direction: it blocks the first missile and cuts damage from the rest, for you and allies behind you.' },
  ].map(e => ({ ...e, clash: [] }));

  // the notes each column shows
  function notes(d) {
    const pay = d.pay.map(p => p === 'Apply Status' ? `Apply ${d.status}` : p);
    const cond = d.cond.k === 'none' ? ['None'] : [`Require ${d.cond.v}`];
    const v = { shape: [d.shape], proxy: [d.proxy], pay, targets: d.targets, cast: d.cast, cond, purpose: d.purpose, pack: [d.pack], keys: d.keys };
    return COLS.map(([c]) => d.show[c] || v[c]);
  }
  const CAST_TXT = { 'Chosen Target Location': ' at a spot you choose', 'Predefined Environmental Location': ' at a set spot in the level' };
  function pitch(d) {
    if (d.pitch) return d.pitch;
    const tg = d.targets.filter(t => t !== 'Player').map(t => ({ Enemy: 'enemy', Ally: 'ally', Environment: 'object' })[t]);
    const self = d.targets.includes('Player');
    const who = tg.length ? tg.join(' or ') : 'yourself';
    const verb = { Caster: 'Channel', Missile: 'Launch', Pet: 'Summon', 'Trap / Device': 'Place', Beam: 'Fire' }[d.proxy];
    const a = /^[aeiou]/i.test(d.pack) ? 'an' : 'a';
    const where = !tg.length ? '' : { 'Single Target': ` at ${/^[aeiou]/.test(who) ? 'an' : 'a'} ${who}`, 'Circular Area': ` that hits every ${who} in a circle`, Line: ` that hits every ${who} in a line`, Cone: ` that hits every ${who} in a cone ahead`, Chain: ` that leaps from ${who} to ${who}` }[d.shape];
    const them = tg.length ? 'them' : 'you';
    const eff = d.pay.map(p => ({ Damage: 'deal damage', 'Spell Cast Interrupt': 'interrupt their spell', Stun: `stun ${them}`, Charge: `rush you to ${them}`, Knockback: `knock ${them} back`, Teleport: 'teleport you there', Heal: `heal ${them}`, Shield: `shield ${them}`, Pull: `pull ${them} to you`, 'Apply Status': `make ${them} ${d.status}` })[p]);
    const cast = d.cast.map(c => CAST_TXT[c]).find(Boolean) || '';
    return `${verb} ${a} ${d.pack.toLowerCase()}${where}${cast}${self && tg.length ? ' (you included)' : ''} to ${eff.join(' and ')}.`;
  }
  // how many coherent skeletons (shape × proxy × payload × targets × cast) the rules allow, before purpose and packaging
  const SKELETONS = (() => {
    let n = 0; const pays = [];
    PAYLOADS.forEach(a => { pays.push([a]); PAIRS[a].forEach(b => pays.push(a === 'Apply Status' ? [b, a] : [a, b])); });
    pays.forEach(pay => (pay.includes('Apply Status') ? Object.keys(STATUS) : [null]).forEach(status => {
      const d = { pay, status };
      const k = payKinds(d); if (k.includes('help') && (k.includes('harm') || k.includes('move'))) return;
      allowedProxy(d).forEach(proxy => { d.proxy = proxy; allowedShape(d).forEach(shape => { d.shape = shape; allowedTargets(d).forEach(t => { d.targets = t; n += new Set(allowedCast(d).map(c => c.join())).size; }); }); });
    }));
    return n;
  })();

  // ---------- the walk-through: the deck's two examples, three rolls, a locked payload, then wild ----------
  R = mulberry(74);
  const T1 = roll(null, {}, { two: true });
  const LK = { pay: true, targets: true };
  const T2 = roll(T1, LK, { two: true }), T3 = roll(T2, LK, { two: true });
  let T4; for (let i = 0; i < 40 && !(T4?.clash.length >= 2); i++) T4 = roll(null, {}, { two: true, wild: true });
  R = Math.random;
  const TOUR = [
    [0, EX[0], {}, 'The deck’s first example: <b>Fireball</b> (World of Warcraft), one sticky note per column, two where it does two things.'],
    [7, EX[1], {}, 'The second: <b>Spiritual Weapon</b> (D&D). Same columns; a pet instead of a missile, and three problems it solves.'],
    [14, T1, {}, '🎲 Roll: one value for every column, drawn so the columns agree. The pitch at the bottom reads it back as a spell.'],
    [18, T2, LK, '🔒 Lock Payload and Valid Targets, then roll again: same job, new shape, delivery and look.'],
    [22, T3, LK, 'Again: locking a column and rolling the rest is how one payload becomes a family of spells.'],
    [26, T4, {}, 'Wild mode draws anything. The clashes become prompts: answer one and you may have something new.'],
  ];
  const DUR = 31;

  const NOTE = '#7fd7c6', HEAD = '#c9ec9b', ORANGE = '#f6a96b', CX = j => 189 + j * 99, NY = i => 120 + i * 54;
  function view(t, st, tour) {
    if (!tour) return { d: st.d, prev: st.prev, at: st.at, lock: st.lock, i: -1 };
    let i = 0; while (i + 1 < TOUR.length && t >= TOUR[i + 1][0]) i++;
    return { d: TOUR[i][1], prev: i ? TOUR[i - 1][1] : null, at: TOUR[i][0] + (i < 2 ? .2 : 0), lock: TOUR[i][2], i, slow: i < 2 };
  }
  function lockIcon(g, x, y, on) {
    g.save(); g.strokeStyle = on ? C.goldInk : 'rgba(93,97,140,.45)'; g.fillStyle = on ? C.gold : 'rgba(255,250,240,.9)'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y - 4, 4.5, Math.PI, 0); if (!on) g.lineTo(x + 4.5, y - 6); g.stroke();
    g.beginPath(); g.roundRect(x - 7, y - 3, 14, 10, 2); g.fill(); g.stroke(); g.restore();
  }
  function note(g, s, x, y, o) {
    g.save(); g.globalAlpha *= o.a; g.translate(x, y); g.scale(o.s, o.s);
    g.fillStyle = 'rgba(40,60,60,.13)'; g.fillRect(-44, -21, 92, 46);
    g.fillStyle = o.fill; g.fillRect(-46, -23, 92, 46);
    if (o.dash) { g.setLineDash([4, 3]); g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 1.5; g.strokeRect(-45, -22, 90, 44); }
    const size = s.length > 30 ? 10.5 : s.length > 16 ? 11.5 : 13;
    const lines = wrap(g, s, 0, 0, 84, { size, w: 600, draw: false });
    lines.slice(0, 3).forEach((l, i) => text(g, l, 0, (i - (Math.min(3, lines.length) - 1) / 2) * size * 1.15, { size, w: 600, col: C.navy }));
    g.restore();
  }

  scene('spell-ideas', {
    dur: DUR,
    state: () => ({ d: null, prev: null, at: -9, lock: {}, two: true, wild: false }),
    init(s, st, api) {
      st.d = roll(null, {}, { two: true });
      const opt = () => ({ two: st.two, wild: st.wild });
      const set = (d, keepPrev) => { api.manual(); st.prev = keepPrev === false ? null : st.d; st.d = d; st.at = st.t; fill(); };
      const doRoll = lock => set(roll(st.d, lock || st.lock, opt()));
      $(s, '.si-roll').onclick = () => doRoll();
      $(s, '.si-unlock').onclick = () => { api.manual(); st.lock = {}; };
      $(s, '.si-wild').onchange = e => { st.wild = e.target.checked; doRoll(); };
      $(s, '.si-two').onchange = e => { st.two = e.target.checked; };
      const exBox = $(s, '.si-ex');
      EX.forEach(e => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = e.name; b.title = e.game; b.onclick = () => { st.lock = {}; set(JSON.parse(JSON.stringify(e)), false); }; exBox.appendChild(b); });
      // write your own: typing locks that column so the next roll keeps it
      const fill = () => $$(s, '.si-in').forEach(inp => { if (document.activeElement === inp) return; const d = st.d; inp.value = { game: d.game, name: d.name, purpose: d.purpose.join(', '), pack: d.pack }[inp.dataset.k]; });
      $$(s, '.si-in').forEach(inp => inp.oninput = () => {
        api.manual(); const k = inp.dataset.k, v = inp.value.trim(), d = st.d;
        if (k === 'purpose') { d.purpose = v ? v.split(',').map(x => x.trim()).filter(Boolean).slice(0, 3) : ['(Freeform)']; st.lock.purpose = true; }
        if (k === 'pack') { d.pack = v || '(Freeform)'; st.lock.pack = true; delete d.pitch; }
        if (k === 'name') { d.name = v || 'Unnamed'; st.lock.name = true; }
        if (k === 'game') { d.game = v || 'Your game'; st.lock.name = true; }
      });
      fill();
      $(s, '.si-copy').onclick = () => {
        const d = st.d, n = notes(d), txt = [`${d.name} (${d.game})`, ...COLS.map(([, h], j) => `${h}: ${n[j].join('; ')}`), `Pitch: ${pitch(d)}`].join('\n');
        const done = () => { const b = $(s, '.si-copy'); b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy as text', 1200); };
        (navigator.clipboard?.writeText(txt) || Promise.reject()).then(done, () => { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); });
      };
      $(s, '.si-save').onclick = () => { const a = document.createElement('a'); a.href = api.cv.toDataURL('image/png'); a.download = `spell-idea-${st.d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`; a.click(); };
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        if (st.tour) { api.manual(); st.at = -9; }
        if (inBox(x, y, 66, 166, 116, 220)) { const l = {}; COLS.forEach(([c]) => l[c] = true); doRoll(l); return; }
        COLS.forEach(([c], j) => {
          if (inBox(x, y, CX(j), 52, 94, 54)) { st.lock = { ...st.lock, [c]: !st.lock[c] }; }
          else if (inBox(x, y, CX(j), 200, 94, 196)) { const l = { name: st.lock.name }; COLS.forEach(([k]) => { if (k !== c) l[k] = true; }); doRoll(l); }
        });
      });
    },
    draw(g, t, st, tour) {
      const { d, prev, at, lock, i: ti, slow } = view(t, st, tour), since = t - at;
      const N = notes(d), P = prev ? notes(prev) : null;
      panel(g, 8, 8, 1024, 296, { title: '' });
      // name column
      card(g, 66, 52, 112, 54, { fill: '#ece8de', edge: '#ece8de', r: 3, shadow: false });
      text(g, 'Game · Ability', 66, 52, { size: 12.5, w: 700, col: C.navy });
      const kN = slow ? ease(clamp(since / .4)) : ease(clamp((since - .05) / .3));
      note(g, d.game, 66, NY(0), { fill: ORANGE, a: kN, s: .8 + .2 * kN });
      note(g, d.name, 66, NY(1), { fill: ORANGE, a: kN, s: .8 + .2 * kN });
      g.save(); g.globalAlpha = kN;
      if (d.icon) icon(g, d.icon, 66, 250, 56, { lw: 3 });
      else if (d.pic) { card(g, 66, 250, 56, 56, { fill: '#fff6dc', edge: C.navy, r: 6, shadow: false, lw: 3 }); CK.pic(g, d.pic, 66, 250, 48); }
      else if (d.gi) { card(g, 66, 250, 56, 56, { fill: '#3a3f73', edge: C.navy, r: 6, shadow: false, lw: 3 }); GI.draw(g, d.gi, 66, 250, 40, '#ffe7a8'); }
      g.restore();
      // the nine columns
      COLS.forEach(([c, h], j) => {
        const x = CX(j), on = !!lock[c];
        g.fillStyle = HEAD; g.fillRect(x - 46, 25, 92, 54);
        if (on) { g.strokeStyle = C.gold; g.lineWidth = 4; g.strokeRect(x - 48, 23, 96, 58); }
        const hl = wrap(g, h, 0, 0, 80, { size: 12, w: 700, draw: false });
        hl.forEach((l, k) => text(g, l, x, 52 + (k - (hl.length - 1) / 2) * 14, { size: hl.length > 2 ? 11 : 12.5, w: 700, col: C.navy }));
        lockIcon(g, x + 37, 33, on);
        const changed = !P || N[j].join('|') !== P[j].join('|');
        const d0 = slow ? .25 + j * .55 : j * .07;
        N[j].slice(0, 4).forEach((v, i) => {
          const k = changed ? ease(clamp((since - d0 - i * .12) / .3)) : 1;
          note(g, v, x, NY(i), { fill: on ? '#bdf0d8' : NOTE, a: k, s: .7 + .3 * k, dash: EXTRA.has(v) || (c === 'pay' && ['Shield', 'Pull'].includes(v)) });
        });
      });
      // the pitch
      const kP = ease(clamp((since - (slow ? 5.4 : .8)) / .4));
      panel(g, 8, 314, 676, 263, { title: d.clash.length ? 'The pitch, and the clashes to answer' : 'The pitch' });
      g.save(); g.globalAlpha = kP;
      text(g, d.name, 30, 360, { size: 26, w: 800, display: true, align: 'left', col: C.navy });
      text(g, d.game, 30, 388, { size: 13, w: 600, align: 'left', col: C.muted });
      const pl = wrap(g, pitch(d), 30, 420, 630, { size: 17, w: 500, lh: 23, col: C.ink });
      let y = 420 + pl.length * 23 + 8;
      if (d.cond.k !== 'none') { text(g, `Requires: ${d.show.cond ? d.show.cond[0].replace(/^Require /, '') : d.cond.v}`, 30, y, { size: 14, w: 700, align: 'left', col: C.goldInk }); y += 24; }
      text(g, `Use it when: ${d.purpose.join(' · ')}`, 30, y, { size: 14, w: 700, align: 'left', col: '#145c33' }); y += 30;
      if (d.clash.length) d.clash.slice(0, 3).forEach(c => { chip(g, '?', 40, y, { ...TONE.gold, size: 13, width: 22 }); wrap(g, c, 58, y, 600, { size: 14, w: 600, col: C.goldInk }); y += 24; });
      else { let kx = 30; d.keys.forEach(k => { kx += chip(g, k, kx, y, { ...TONE.blue, size: 13, align: 'left' }) + 8; }); }
      g.restore();
      // the levers
      panel(g, 696, 314, 336, 263, { title: 'How to use it' });
      const L = [['🎲', 'Roll fills every column that is not locked.'], ['🔒', 'Click a green header to lock that column.'], ['↻', 'Click a note to reroll only its column.'], ['✎', 'Click the name to reroll just the name.']];
      L.forEach(([ic, s], k) => { text(g, ic, 718, 356 + k * 30, { size: 16 }); text(g, s, 736, 356 + k * 30, { size: 13.5, w: 600, align: 'left', col: C.ink }); });
      const locked = COLS.filter(([c]) => lock[c]).map(([, h]) => h.replace(/ \(.*| Type/, ''));
      text(g, locked.length ? `Locked: ${locked.join(', ')}` : 'Nothing locked', 714, 484, { size: 13.5, w: 700, align: 'left', col: locked.length ? C.goldInk : C.muted });
      text(g, `${SKELETONS.toLocaleString('en-US')} coherent skeletons`, 714, 514, { size: 15, w: 800, align: 'left', col: C.navy });
      text(g, 'shape × proxy × payload × targets × cast,', 714, 534, { size: 12.5, align: 'left', col: C.muted });
      text(g, 'before any purpose or packaging', 714, 551, { size: 12.5, align: 'left', col: C.muted });
      if (tour && ti >= 0) text(g, ti < 2 ? 'Worked example' : ti < 5 ? 'Coherent roll' : 'Wild roll', 1018, 330, { size: 12, w: 700, align: 'right', col: C.muted });
    },
    side(t, st, tour) {
      if (tour) { let i = 0; while (i + 1 < TOUR.length && t >= TOUR[i + 1][0]) i++; return { out: TOUR[i][3] }; }
      const d = st.d;
      return { out: d.clash.length ? `<b>${d.name}</b>: ${d.clash.length} clash${d.clash.length > 1 ? 'es' : ''} to answer, or roll again.` : `<b>${d.name}</b>: ${pitch(d)}` };
    },
  });
})();
