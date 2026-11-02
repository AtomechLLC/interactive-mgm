/* Unavoidable Calamity: a World of Warcraft delve concept by Alonso R Baselli, Diogo Guerreiro and Pavle Sivakov.
   Everything here is transcribed from their Miro board: the enemy kits and what each ability teaches, the 23 pulls with
   the synergy and solution the team wrote for each, the elite, the final boss, the two delve features and the painted
   map (pull IDs, barrels, patrols, zones). Map positions are fractions of the map image (u across, v down).
   Numbers (health, damage, cooldowns) are this page's tuning; the board gives behaviour, not numbers.
   Works in the browser (window.DELVE_DATA) and in node (module.exports) so tools/ can check the balance. */
(function (root) {
  const CREDIT = {
    title: 'Unavoidable Calamity',
    sub: 'A World of Warcraft delve concept',
    by: ['Alonso R Baselli', 'Diogo Guerreiro', 'Pavle Sivakov'],
    note: 'Design, enemies, encounters and map by the three designers above (portfolio piece). Art in the original portfolio is owned by Blizzard Entertainment; icons here are World of Warcraft icons from wow.zamimg.com.',
  };

  const PREMISE = 'The Void forces seek to undermine the defences of Silvermoon by sowing discord from within the city. Using an old smugglers’ cavern near the harbour, they moved void-corrupted wine barrels toward the wine cellar of a prominent inn. Before the plan could hatch, critters in the caverns, and caged animals that escaped nearby, got into the barrels first. They became void-corrupted abominations, slaughtered the smugglers, and now roam the twisting depths.';

  const OBJECTIVES = [
    { k: 'primary', name: 'Primary objective', text: 'Destroy 12 Corrupted Wine Barrels' },
    { k: 'secondary', name: 'Secondary objective', text: 'Eliminate void-infused creatures' },
    { k: 'boss', name: 'Boss objective', text: 'The Void Corrupted Construct (“Vintage ‘The Uncorked’ Construct”, working name)' },
  ];

  const RULES = {
    goals: ['Build a delve that fits WoW’s design philosophy', 'Create interactive objectives that are fun and new while maintaining familiarity', 'Have dynamic, interesting encounters that can challenge the player in higher difficulties'],
    guidelines: ['Mobs should have synergy, at minimum between two of them', 'Add variety so encounters feel distinct from each other', 'There should be a straightforward solution to each mob group other than “DPS them down”', 'Some encounters should not be needed to complete the main objectives'],
    anti: ['A delve that is too complex, with too many mechanics', 'Mechanics that might frustrate the player base', 'Every encounter feels like the same thing with small changes', 'Encounters that are too difficult and annoying', 'Encounters that are too simplistic and boring'],
    mobs: ['Tiny mobs have 1 ability', 'Non-elite mobs have 2 abilities on average, and they are basic', 'Elite mobs have 3 abilities, impactful and more threatening'],
    delve: ['3 objectives on average', 'Usually 1 starting area, 3 main areas, 1 treasure area and 1 boss area', 'Some delves have traps, bonuses, and additional interactive abilities'],
    pillars: ['Smugglers’ cavern', 'Void-infused critters and objects', 'Corrupted wine barrels', 'Animal cages and contraband', 'Chaotic aftermath'],
  };

  // the skill tags the board puts under every ability
  const SKILLS = { position: 'Position', timing: 'Timing', targeting: 'Targeting', prioritizing: 'Prioritizing', dispel: 'Dispelling', health: 'Health control' };

  /* ---------- enemies: board kit + this page's numbers ----------
     ab: abilities. kind: how sim.js plays it. int: interruptible. disp: what it applies can be dispelled.
     teach: the board's "teaches" line. skills: the board's "X is important" tags. */
  const ENEMIES = {
    fox: { name: 'Void Corrupted Fox', icon: 'inv_misc_foxkit', tier: 'Non-elite', tags: ['Melee', 'Single target', 'Ambusher', 'Pack'],
      hp: 520, r: 15, speed: 150, range: 'melee', dps: 22,
      ab: [
        { id: 'ambush', name: 'Nether Ambush', icon: 'ability_rogue_ambush', type: 'Instant', int: false, kind: 'ambush', cd: 13, first: 1.2, dmg: 90, dot: 12, dotT: 6,
          text: 'Teleports behind its target and deals bleeding damage.', teach: 'Requires players to reposition once the fox has teleported.', skills: ['position'] },
        { id: 'dark', name: 'One with the Dark', icon: 'ability_stealth', type: 'Passive', int: false, kind: 'passive',
          text: 'Invisible until aggro. Takes less damage just after leaving invisibility.', teach: 'Teaches the player to expect invisible enemies.', skills: ['timing', 'targeting'] },
      ] },
    hawk: { name: 'Baby Dragonhawk', icon: 'ability_hunter_pet_dragonhawk', tier: 'Non-elite', tags: ['Melee', 'AOE', 'Disruptor', 'Sustained damage'],
      hp: 700, r: 17, speed: 120, range: 'melee', dps: 16,
      ab: [
        { id: 'breath', name: 'Void Breath', icon: 'spell_shadow_shadowfury', type: 'Channeled', int: true, kind: 'cone', cd: 8, first: 2.5, cast: 0.6, chan: 2.4, tick: 0.4, dmg: 42, len: 190, arc: 0.95,
          text: 'Deals shadow damage in a cone. Cannot move while channeling.', teach: 'Teaches the players to position correctly or interrupt.', skills: ['position', 'targeting'] },
      ] },
    lynx: { name: 'Lynx', icon: 'ability_hunter_pet_cat', tier: 'Non-elite', tags: ['Melee', 'Single target', 'Debuffer', 'Self-buff', 'Patrols'],
      hp: 650, r: 16, speed: 150, range: 'melee', dps: 0, swing: 1.0, hit: 28,
      ab: [
        { id: 'claws', name: 'Corrupted Claws', icon: 'ability_druid_rake', type: 'Passive', int: false, disp: true, kind: 'passive', vuln: 0.1, max: 6, dur: 12,
          text: 'Attacks make the target vulnerable, taking more damage. Stacks a limited number of times.', teach: 'Encourages the player to use their dispels.', skills: ['dispel'] },
        { id: 'wrath', name: 'Predator’s Wrath', icon: 'spell_shadow_unholyfrenzy', type: 'Cast', int: false, kind: 'selfbuff', cd: 15, first: 4, cast: 1.5, dur: 6, haste: 2,
          text: 'Increases its attack speed for a duration.', teach: 'Encourages the player to prioritize this target when it becomes a bigger threat.', skills: ['targeting'] },
      ] },
    rabbit: { name: 'Void Corrupted Rabbit', icon: 'inv_misc_rabbit', tier: 'Non-elite', tags: ['Melee', 'Single target', 'Nuker', 'Ambusher', 'Assassin'],
      hp: 380, r: 13, speed: 170, range: 'melee', dps: 14,
      ab: [
        { id: 'leap', name: 'Rabid Leap', icon: 'ability_hunter_pet_raptor', type: 'Channeled', int: false, kind: 'leap', cd: 6, first: 1.5, cast: 1.2, dmg: 170, rad: 54,
          text: 'Locks on, channels, then leaps at the player. The landing spot is telegraphed.', teach: 'Teaches the players to reposition on time.', skills: ['timing', 'position'] },
      ] },
    frog: { name: 'Void Corrupted Frog', icon: 'inv_pet_toad_green', tier: 'Non-elite', tags: ['Ranged / melee', 'Single target', 'Tank', 'Disruptor'],
      hp: 1500, r: 22, speed: 95, range: 'melee', dps: 18,
      ab: [
        { id: 'lick', name: 'Poisoned Lick', icon: 'ability_creature_poison_05', type: 'Instant', int: false, kind: 'lick', cd: 7, first: 3, dmg: 45, dot: 10, dotT: 8,
          text: 'A normal attack that deals instant damage and applies a small DoT.', teach: 'Teaches the player to soak damage and focus on killing the target.', skills: ['health'] },
        { id: 'tongue', name: 'Tongue Pull', icon: 'ability_vehicle_launchplayer', type: 'Cast', int: true, kind: 'pull', cd: 9, first: 2, cast: 1.8, min: 130,
          text: 'Targets the farthest player and pulls them closer to itself.', teach: 'Teaches the player to interrupt or expect a relocation.', skills: ['targeting', 'position'] },
      ] },
    caller: { name: 'Makrura Shadowcaller', icon: 'ability_hunter_pet_crab', tint: '#6a8dff', tier: 'Non-elite', tags: ['Ranged', 'Single target', 'Protector', 'Caster'],
      hp: 650, r: 16, speed: 100, range: 'ranged', dps: 0,
      ab: [
        { id: 'armor', name: 'Dark Water Armor', icon: 'spell_shadow_antishadow', type: 'Instant', int: false, disp: true, kind: 'shield', cd: 13, first: 2, absorb: 380, dur: 14,
          text: 'Shields a friendly unit with water and slows enemies that attack it.', teach: 'Teaches players to dispel or avoid attacking the buffed target.', skills: ['dispel'] },
        { id: 'tide', name: 'Toxic Tide', icon: 'spell_nature_corrosivebreath', type: 'Channel', int: true, kind: 'beam', cd: 8, first: 4, cast: 0.3, chan: 3, tick: 0.5, dmg: 36,
          text: 'Channels a toxic beam that damages its target.', teach: 'Teaches the player to interrupt a channel to avoid damage.', skills: ['targeting'] },
      ] },
    healer: { name: 'Shadow-Infused Makrura', icon: 'ability_hunter_pet_crab', tint: '#43c78a', tier: 'Non-elite', tags: ['Ranged', 'AOE', 'Healer', 'Caster'],
      hp: 650, r: 16, speed: 100, range: 'ranged', dps: 0,
      ab: [
        { id: 'heal', name: 'Dark Tides', icon: 'spell_nature_healingwavelesser', type: 'Channeled', int: true, kind: 'heal', cd: 7, first: 3, cast: 0.3, chan: 3, tick: 0.5, amt: 75, rad: 280,
          text: 'A shower of void rain that heals nearby allies.', teach: 'Teaches the player to interrupt heals.', skills: ['position', 'targeting'] },
        { id: 'pressure', name: 'Tidal Pressure', icon: 'spell_frost_frostbolt02', type: 'Cast', int: true, kind: 'bolt', cd: 3.5, first: 1, cast: 1.8, dmg: 85,
          text: 'A basic ranged attack that deals single-target damage.', teach: 'Requires the player to choose which ability to interrupt.', skills: ['prioritizing'] },
      ] },
    caster: { name: 'Mur’gul Shadowcaster', icon: 'inv_misc_head_murloc_01', tier: 'Non-elite', tags: ['Ranged', 'AOE', 'Curser', 'Caster'],
      hp: 560, r: 15, speed: 100, range: 'ranged', dps: 0,
      ab: [
        { id: 'hex', name: 'Hex', icon: 'spell_shaman_hex', type: 'Cast', int: true, disp: true, kind: 'hex', cd: 12, first: 2.5, cast: 1.6, dur: 4,
          text: 'Turns its target into a critter for a few seconds.', teach: 'Teaches the player to dispel and/or interrupt based on priority and circumstances.', skills: ['targeting', 'dispel'] },
        { id: 'bolt', name: 'Shadow Bolt', icon: 'spell_shadow_shadowbolt', type: 'Cast', int: true, kind: 'bolt', cd: 2.6, first: 0.8, cast: 2, dmg: 105,
          text: 'Deals shadow damage to its target.', teach: 'Requires the player to choose which ability to interrupt.', skills: ['prioritizing'] },
      ] },
    fly: { name: 'Void-infested Dragonfly', icon: 'ability_hunter_pet_wasp', tier: 'Non-elite', tags: ['Ranged', 'Single target', 'Debuffer', 'Caster'],
      hp: 420, r: 13, speed: 130, range: 'ranged', dps: 0,
      ab: [
        { id: 'spit', name: 'Corrupted Spit', icon: 'spell_nature_acid_01', type: 'Cast', int: true, disp: true, kind: 'spit', cd: 4, first: 1, cast: 1.5, dmg: 65, slow: 0.45, dur: 6,
          text: 'A simple spell at a player in range that slows them and deals damage.', teach: 'Teaches the player to dispel and/or interrupt based on priority and circumstances.', skills: ['prioritizing', 'dispel'] },
      ] },
    murloc: { name: 'Corrupted Murloc Tidehunter', icon: 'inv_misc_fish_75', tier: 'Non-elite', tags: ['Ranged', 'Single target', 'Caster', 'Disruptor'],
      hp: 560, r: 15, speed: 100, range: 'ranged', dps: 0,
      ab: [
        { id: 'wine', name: 'Wine Bolt', icon: 'inv_drink_17', type: 'Cast', int: false, kind: 'bolt', cd: 2.8, first: 0.6, cast: 1.6, dmg: 70,
          text: 'Hurls a wine bolt at an enemy.', teach: 'Teaches the player to stun or deal with ranged enemies first.', skills: ['targeting'] },
        { id: 'splash', name: 'Corrupted Splash', icon: 'spell_frost_frostshock', type: 'Cast', int: true, kind: 'splash', cd: 9, first: 2, cast: 1.2, dmg: 60, push: 190, near: 140,
          text: 'A splash of wine that deals damage and knocks players back.', teach: 'Teaches the player to keep moving and keep distance in mind.', skills: ['position'] },
      ] },
    slime: { name: 'Void Wine Slime', icon: 'inv_misc_slime_01', tier: 'Boss add', tags: ['Melee', 'Bruiser'],
      hp: 300, r: 13, speed: 120, range: 'melee', dps: 16,
      ab: [
        { id: 'burst', name: 'Slimy Repercussion', icon: 'inv_misc_volatileshadow', type: 'Cast', int: false, kind: 'burst', at: 0.3, cast: 2.4, dmg: 120, rad: 62,
          text: 'At low health it prepares to explode, leaving a Corrupting Wine Pool, unless killed before the cast finishes.', teach: 'Teaches the player that some enemies must die quickly or they cause more problems.', skills: ['timing', 'targeting'] },
      ] },
    gnoll: { name: 'Azeroth Destroyer Omega Void Gnoll', short: 'Omega Void Gnoll', icon: 'inv_misc_head_gnoll_01', tier: 'Elite', tags: ['Elite', 'Melee', 'AOE', 'Single target', 'Berserker', 'DoT'],
      hp: 3000, r: 24, speed: 120, range: 'melee', dps: 34, elite: true,
      flavor: 'How the smugglers managed to trap these rare gnoll specimens is a mystery. Not so much how they managed to escape.',
      ab: [
        { id: 'enrage', name: 'Enrage', icon: 'ability_racial_bearform', type: 'Instant', int: false, kind: 'enrage', at: 0.3, more: 0.35,
          text: 'Cast only at low health. Becomes temporarily immune to crowd control.', teach: 'Time your crowd control before the enrage, and clear the adds first so only the Gnoll is left.', skills: ['timing', 'targeting'] },
        { id: 'bite', name: 'Vicious Void Bite', icon: 'inv_misc_monsterfang_01', type: 'Cast', int: true, kind: 'bite', cd: 6, first: 2, cast: 1.5, dmg: 130, dot: 24, dotT: 6,
          text: 'Deals instant damage and leaves a DoT.', teach: 'Encourages the player to interrupt to avoid the DoT.', skills: ['targeting', 'timing'] },
        { id: 'slash', name: 'Ferocious Slash', icon: 'ability_warrior_cleave', type: 'Channeled', int: false, kind: 'cone', cd: 10, first: 5, cast: 0.5, chan: 2, tick: 0.33, dmg: 50, len: 130, arc: 1.7,
          text: 'Slashes in a cone in front of it several times, alternating arms.', teach: 'Tests what the Dragonhawks already taught.', skills: ['position'] },
      ] },
    construct: { name: 'Void Corrupted Construct', icon: 'achievement_boss_xt002deconstructor_01', tier: 'Final boss', tags: ['Boss', 'Melee', 'AOE', 'Tank', 'Lifesteal', 'Buffer'],
      hp: 4800, r: 34, speed: 70, range: 'melee', dps: 38, boss: true,
      flavor: 'A construct that was deactivated and about to be sold on the black market, until it came in contact with the void.',
      ab: [
        { id: 'enhance', name: 'Void Enhancement', icon: 'spell_shadow_ritualofsacrifice', type: 'Cast', int: true, kind: 'enhance', cast: 2, more: 1,
          text: 'Targets a nearby ally and gives it a damage buff.', teach: 'Teaches players to watch for interruptible abilities in combat.', skills: ['timing', 'targeting'] },
        { id: 'siphon', name: 'Void Siphon', icon: 'spell_shadow_siphonmana', type: 'Channel', int: false, kind: 'siphon', cd: 8, first: 7, wait: 6, cast: 0.3, chan: 3, rad: 300, dr: 0.18, dur: 20,
          text: 'Siphons void from nearby slimes and gains damage resistance per slime consumed.', teach: 'Teaches players that clearing the adds makes the tank easier to deal with.', skills: ['position', 'targeting'] },
        { id: 'barrage', name: 'Void Barrage', icon: 'inv_misc_bomb_05', type: 'Channel', int: false, kind: 'barrage', cd: 14, first: 4, cast: 0.4, chan: 4.2, tick: 0.7, dmg: 95, rad: 50, fuse: 1,
          text: 'Lobs void bombs where the player stands when each one is thrown.', teach: 'Teaches players to watch the ground and avoid telegraphed attacks in combat.', skills: ['position', 'targeting'] },
      ],
      phases: { every: 0.2, adds: 3, enhanceAfter: 4 } },
    barrel: { name: 'Corrupted Wine Barrel', icon: 'inv_drink_05', tier: 'Object', tags: ['Delve feature'],
      hp: 320, r: 18, speed: 0, range: 'none', dps: 0, object: true,
      ab: [
        { id: 'lob', name: 'Void Wine', icon: 'spell_shadow_lifedrain', type: 'Passive', int: false, kind: 'lob', cd: 2.8, fuse: 1.2, rad: 44,
          text: 'Does nothing until hit by a damaging ability. Then throws balls of void wine at intervals, creating Corrupting Wine Pools. Spawns 3 Void Wine Slimes when destroyed.', teach: 'Ties the delve’s theme into combat.', skills: ['position'] },
      ] },
  };

  const FEATURES = {
    collector: { name: 'Void Collector', icon: 'spell_priest_voidshift', type: 'Delve ability · medium cooldown', text: 'When pressed, sucks in the Corrupted Wine Pools around the player for a few seconds. The player can move while it is active.' },
    pool: { name: 'Corrupted Wine Pool', icon: 'spell_shadow_lifedrain', type: 'Ground effect', text: 'Damages and slows players standing in it. Stays on the ground for a long time unless cleared with the Void Collector.' },
    barrel: { name: 'Corrupted Wine Barrels', icon: 'inv_drink_05', type: 'Interactive object', text: 'Inert until hit by a damaging ability. Then lobs void wine at intervals, making pools. Destroyed, it spawns 3 Void Wine Slimes.' },
  };

  /* ---------- the 23 pulls ----------
     at: where the board puts the encounter ID on the map. m: members. syn / sol: the board's synergy and solution.
     plan: how the demo player solves it (kill order by role, which casts it spends interrupts on, what it stuns). */
  const P = (id, area, at, m, syn, sol, plan, extra = {}) => ({ id, area, at, m, syn, sol, plan, ...extra });
  const PULLS = [
    P('1-A', 1, [0.655, 0.165], ['murloc', 'murloc', 'fly', 'frog'],
      'The Frog protects the three casters in the back, who deal consistent damage and slow the player.',
      'Focus the ranged enemies and interrupt the Dragonfly to avoid getting slowed.',
      { order: ['fly', 'murloc', 'frog'], int: ['spit', 'splash', 'tongue'], stun: ['tongue'] }),
    P('1-B', 1, [0.715, 0.242], ['rabbit', 'rabbit', 'rabbit'],
      'Introductory encounter for the Void Corrupted Rabbits and their leap.',
      'Avoid the Rabbits’ landing spots and AOE them.',
      { order: ['rabbit'], int: [] }),
    P('1-C', 1, [0.768, 0.392], ['frog', 'caster'],
      'The Frog pulls the player away from the Shadowcaster, who deals consistent damage and crowd controls the player.',
      'Interrupt Hex to avoid crowd control and focus the Shadowcaster.',
      { order: ['caster', 'frog'], int: ['hex', 'tongue', 'bolt'], stun: ['tongue'] }),
    P('1-D', 1, [0.625, 0.321], ['fly', 'fly', 'hawk', 'hawk'],
      'Baby Dragonhawks make a defensive front with their Void Breath cones while the Dragonflies deal consistent damage and slow the player.',
      'Avoid the Dragonhawks’ cones while interrupting and focusing the Dragonflies. Dispel when possible.',
      { order: ['fly', 'hawk'], int: ['spit', 'breath'] }),
    P('1-E', 1, [0.612, 0.503], ['gnoll', 'healer', 'caller'],
      'Elite encounter: the Gnoll protects the two supports in the back, who heal and shield it.',
      'Interrupt, stun and dispel the supports’ abilities. Focus the healer to stop the healing. Avoid the Gnoll’s frontal cone, and focus it after the healer is dead.',
      { order: ['healer', 'caller', 'gnoll'], int: ['heal', 'bite', 'tide'], stun: ['heal', 'bite'] }, { elite: true }),
    P('1-F', 1, [0.703, 0.479], ['lynx', 'lynx'],
      'A patrolling pair meant to surprise and ambush the player.',
      'Dispel the debuff or stun the enemies to avoid high stacks.',
      { order: ['lynx'], int: [], stun: ['wrath'] },
      { patrol: [[0.655, 0.47], [0.72, 0.445], [0.785, 0.42], [0.79, 0.36], [0.72, 0.445]] }),
    P('1-G', 1, [0.777, 0.487], ['caller', 'caller', 'healer', 'caster'],
      'An all-ranged encounter where the player must prioritize which mobs to interrupt, stun and gather.',
      'Choose between interrupting Hex and the Makrura. Kill the Shadowcaster first, then the healer, and lastly the Shadowcallers.',
      { order: ['caster', 'healer', 'caller'], int: ['hex', 'heal', 'tide', 'bolt'], stun: ['heal', 'hex'] }),
    P('2-A', 2, [0.92, 0.606], ['frog', 'fox', 'lynx'],
      'The Lynx makes you vulnerable and tests your dispels; the Fox exploits that vulnerability. The Frog tests your interrupts and disrupts the fight, especially for ranged classes.',
      'Dispel the Lynx’s debuff and kill the Lynx first. Interrupt the Frog so it can’t pull you mid-fight.',
      { order: ['lynx', 'fox', 'frog'], int: ['tongue'], stun: ['wrath'] }),
    P('2-B', 2, [0.91, 0.70], ['fly', 'hawk'],
      'The Dragonhawk forces movement while the Dragonfly’s slow hinders it.',
      'Kill the Dragonhawk first, dispelling the Dragonfly’s slow and interrupting the Dragonhawk’s breath as needed.',
      { order: ['hawk', 'fly'], int: ['breath', 'spit'] }),
    P('2-C', 2, [0.794, 0.692], ['murloc', 'murloc', 'rabbit', 'rabbit', 'hawk'],
      'Rabbits and the Dragonhawk force you to move, so the ranged Murlocs are hard to reach and deal steady damage. Their knockback makes dodging leaps and breath harder, and keeps melee off them.',
      'Dodge the Rabbits and kill them first: they die quickly. Interrupt the Dragonhawk. Once the melee threats are gone, kill the Murlocs.',
      { order: ['rabbit', 'hawk', 'murloc'], int: ['breath', 'splash'] }),
    P('2-D', 2, [0.814, 0.827], ['hawk', 'hawk', 'fly', 'fly', 'frog'],
      'Dragonhawks make you move while the Dragonflies slow you. The Frog is a constant threat that disrupts and deals damage over time.',
      'Ranged: interrupt the Frog, kill the Dragonhawks first, dispel the Dragonflies. Melee: interrupt the Dragonhawks, dispel, kill the Dragonhawks, then the Frog, then the Dragonflies.',
      { order: ['hawk', 'fly', 'frog'], int: ['tongue', 'breath', 'spit'], melee: { order: ['hawk', 'frog', 'fly'], int: ['breath', 'tongue', 'spit'] } }),
    P('2-E', 2, [0.684, 0.716], ['rabbit', 'rabbit', 'fox', 'fox', 'healer'],
      'Foxes and Rabbits pressure you to kill them first, while the Makrura heals them from the back and keeps the melee alive.',
      'Move away from the Rabbits’ leaps. Interrupt the Makrura whenever it tries to heal.',
      { order: ['rabbit', 'fox', 'healer'], int: ['heal'], stun: ['heal'] }),
    P('2-F', 2, [0.666, 0.771], ['lynx', 'lynx'],
      'A patrolling pair. Pulled into a bigger fight, their vulnerability makes everything else hit harder.',
      'Fight them on their own, never mixed into a larger encounter, and dispel their debuff.',
      { order: ['lynx'], int: [], stun: ['wrath'] },
      { patrol: [[0.60, 0.785], [0.665, 0.775], [0.72, 0.735], [0.765, 0.70], [0.72, 0.735], [0.665, 0.775]] }),
    P('2-G', 2, [0.669, 0.819], ['caster', 'frog'],
      'The Shadowcaster is a constant ranged threat while the Frog defends it by pulling you away.',
      'Interrupt the Frog. Dispel the Shadowcaster’s Hex.',
      { order: ['caster', 'frog'], int: ['tongue', 'bolt'], stun: ['hex'] }),
    P('3-A', 3, [0.434, 0.692], ['fly', 'fly', 'healer', 'frog', 'hawk'],
      'The Frog pulls you in while the Dragonhawk breathes. Dragonflies slow and damage you while the Makrura heals and adds damage.',
      'Ranged: interrupt the Frog, dodge the cone, kill the Dragonflies and the Makrura. Melee: kill the Dragonhawk first and interrupt the Makrura.',
      { order: ['fly', 'healer', 'hawk', 'frog'], int: ['tongue', 'heal', 'spit'], melee: { order: ['hawk', 'healer', 'fly', 'frog'], int: ['heal', 'spit', 'breath'] } }),
    P('3-B', 3, [0.359, 0.819], ['rabbit', 'caster'],
      'The Rabbit rushes you and leaps while the Shadowcaster hexes you so the leap lands.',
      'Interrupt the Shadowcaster and kill it before dealing with the Rabbit.',
      { order: ['caster', 'rabbit'], int: ['hex', 'bolt'] }),
    P('3-C', 3, [0.379, 0.763], ['lynx'],
      'Not much of a threat alone, but it patrols. Pulled with another group, its vulnerability makes any encounter harder.',
      'Isolate and engage it: clear other groups while it is away, or crowd control it, otherwise dispel.',
      { order: ['lynx'], int: [], stun: ['wrath'] },
      { patrol: [[0.31, 0.79], [0.37, 0.75], [0.43, 0.73], [0.47, 0.80], [0.43, 0.73], [0.37, 0.75]] }),
    P('3-D', 3, [0.268, 0.716], ['caster', 'frog'],
      'The Frog pulls you in and poisons you while the Shadowcaster crowd controls you.',
      'Ranged: interrupt the Shadowcaster and kill the Frog. Melee: interrupt the Shadowcaster and kill it first.',
      { order: ['frog', 'caster'], int: ['hex', 'bolt'], melee: { order: ['caster', 'frog'], int: ['hex', 'tongue'] } }),
    P('3-E', 3, [0.305, 0.625], ['gnoll', 'caller'],
      'The Makrura reinforces the Gnoll, already a formidable opponent, especially once enraged.',
      'Interrupt the Gnoll and kill the Shadowcaller first. Dispel the shield if possible.',
      { order: ['caller', 'gnoll'], int: ['bite', 'tide'], stun: ['bite'] }, { elite: true }),
    P('3-F', 3, [0.388, 0.574], ['lynx', 'hawk', 'fly', 'murloc', 'fox'],
      'A damage-heavy group with crowd control and a damage vulnerability debuff.',
      'Interrupt the Dragonfly, use defensive cooldowns and AOE, and dispel the Lynx’s debuff if possible.',
      { order: ['fly', 'fox', 'lynx', 'murloc', 'hawk'], int: ['spit', 'breath', 'splash'], stun: ['wrath'], openDef: true }),
    P('3-G', 3, [0.264, 0.527], ['frog', 'caller', 'caster'],
      'The Frog pulls you in, the Shadowcaster hexes you and the Shadowcaller shields the already tanky Frog.',
      'Interrupt Hex, crowd control the Frog, dispel the shield. Kill the Shadowcaster, then the Shadowcaller, and leave the Frog for last.',
      { order: ['caster', 'caller', 'frog'], int: ['hex', 'tongue', 'tide'], stun: ['tongue'] }),
    P('3-H', 3, [0.229, 0.479], ['lynx', 'fox'],
      'A roaming pair, one of them invisible: like an earlier patrol, but more potent.',
      'Plan your pulls and movement so the patrol is away from the group you engage. Pick a favourable spot to fight.',
      { order: ['fox', 'lynx'], int: [], stun: ['wrath'] },
      { patrol: [[0.14, 0.50], [0.20, 0.49], [0.27, 0.48], [0.33, 0.53], [0.37, 0.56], [0.33, 0.53], [0.27, 0.48], [0.20, 0.49]] }),
    P('3-I', 3, [0.181, 0.527], ['frog', 'caller', 'caster', 'healer'],
      'The tank gets shielded and the group healed while you can be crowd controlled.',
      'Interrupt the Shadowcaster, crowd control the Frog, kill the Makrura, then the Shadowcaster, and leave the Frog for last.',
      { order: ['healer', 'caster', 'caller', 'frog'], int: ['hex', 'heal', 'tongue'], stun: ['tongue', 'heal'] }),
  ];

  const BOSS = {
    id: 'boss', name: 'Void Corrupted Construct', at: [0.235, 0.27], m: ['construct'],
    syn: 'Every fifth of its health, three Void Wine Slimes burst from the barrels and run at you; a few seconds later the Construct casts Void Enhancement on one of them. Void Siphon eats nearby slimes for damage resistance.',
    sol: 'Kill the slimes fast (before they explode or get siphoned), interrupt Void Enhancement, and keep moving out of Void Barrage.',
    plan: { order: ['slime', 'construct'], int: ['enhance'], stun: [] },
    barrels: [[0.15, 0.18], [0.32, 0.18], [0.15, 0.36], [0.32, 0.36]],
  };

  // 13 Corrupted Wine Barrels on the painted map (the red markers); the primary objective asks for 12
  const BARRELS = [[0.640, 0.170], [0.754, 0.228], [0.635, 0.369], [0.825, 0.378], [0.738, 0.480], [0.120, 0.498], [0.363, 0.528],
    [0.145, 0.551], [0.928, 0.623], [0.813, 0.682], [0.406, 0.705], [0.654, 0.744], [0.821, 0.822]];

  const ZONES = [
    { k: 'start', name: 'Start', at: [0.84, 0.035], col: '#7ef310' },
    { k: 'a1', name: 'Area 1', at: [0.70, 0.105], col: '#ffe94a' },
    { k: 'a2', name: 'Area 2', at: [0.87, 0.93], col: '#ff9f2a' },
    { k: 'rest', name: 'Rest Area', at: [0.51, 0.835], col: '#7ef310' },
    { k: 'a3', name: 'Area 3', at: [0.11, 0.83], col: '#ff6a1a' },
    { k: 'boss', name: 'Boss Area', at: [0.235, 0.39], col: '#ff4040' },
    { k: 'treasure', name: 'Treasure Room', at: [0.21, 0.035], col: '#7ef310' },
  ];
  const SPOTS = { start: [0.84, 0.06], rest: [0.52, 0.80], boss: [0.235, 0.27], treasure: [0.21, 0.045], gate: [0.235, 0.43] };

  const DATA = { CREDIT, PREMISE, OBJECTIVES, RULES, SKILLS, ENEMIES, FEATURES, PULLS, BOSS, BARRELS, ZONES, SPOTS, BARRELS_NEEDED: 12 };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.DELVE_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
