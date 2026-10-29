/* The audits on this page: thirteen games run through the nine fundamentals of action games (deck slides 242-255).
   Each game has one or two kits. A move is [name, image, cell, risk, why]: risk is 'H' or 'L', read against the deck's
   high-risk and low-risk examples for that cell. na lists cells the game has no way to express, with the reason; a cell
   that is neither filled nor na is a gap. inherit: the index of a kit whose moves also count (Deadlock's shared kit).
   off: verbs the grid does not see at all. The tags are this page's reading of each game. */
window.AUDITS = [
  { id: 'subnautica', game: 'Subnautica', art: 'img/sn-reaper.png', kits: [
    { name: 'The diver', sub: 'on foot, with handheld tools', art: 'img/sn-seaglide.png', moves: [
      ['Survival Knife', 'img/sn-knife.png', 'Initiate', 'H', 'swim in and stab first; very little damage'],
      ['Stasis Rifle', 'img/sn-stasis.png', 'Zone', 'H', 'freezes a sphere of water and all in it'],
      ['Seaglide', 'img/sn-seaglide.png', 'Mitigate', 'L', 'out-swim whatever is chasing you'],
      ['Repulsion Cannon', 'img/sn-repulsion.png', 'Reflex', 'L', 'shove a lunging creature away'],
      ['First Aid Kit', 'img/sn-firstaid.png', 'React', 'L', 'heal after a bite'],
      ['Creature Decoy', 'img/sn-decoy.png', 'Setup', 'L', 'a lure that pulls leviathans elsewhere'] ] },
    { name: 'The diver with vehicles', sub: 'Seamoth, Cyclops, Prawn Suit', art: 'img/sn-seamoth.png', moves: [
      ['Survival Knife', 'img/sn-knife.png', 'Initiate', 'H', 'still the only way to start a fight'],
      ['Stasis Rifle', 'img/sn-stasis.png', 'Zone', 'H', 'freezes a sphere of water and all in it'],
      ['Silent Running', 'img/sn-silent.png', 'Mitigate', 'L', 'the Cyclops goes quiet before it is heard'],
      ['Cyclops Shield Generator', 'img/sn-shield.png', 'Mitigate', 'H', 'a timed shield that drains power'],
      ['Repulsion Cannon', 'img/sn-repulsion.png', 'Reflex', 'L', 'shove a lunging creature away'],
      ['Perimeter Defense', 'img/sn-perimeter.png', 'React', 'L', 'shocks whatever just grabbed the Seamoth'],
      ['Creature Decoy', 'img/sn-decoy.png', 'Setup', 'L', 'a lure that pulls leviathans elsewhere'],
      ['Swap vehicles', 'img/sn-prawn.png', 'Response', 'H', 'Prawn Suit for depth, Seamoth for speed'] ] } ],
    finding: 'Subnautica fills the defensive row and leaves Punish and Counterplay empty. Most moves are evasive, and the one offensive tool does almost no damage. The gaps are the design: the player is never paid for reading a leviathan, only for not being there.' },

  { id: 'god-of-war', game: 'God of War', art: 'img/gow-kratos.png', kits: [
    { name: 'Kratos, Norse era', sub: 'God of War (2018) and Ragnarök', art: 'img/gow-kratos.png', moves: [
      ['Atreus’s arrows', 'img/gow-atreus.png', 'Initiate', 'L', 'the companion opens from range'],
      ['Leviathan Axe throw', 'img/gow-axe.png', 'Zone', 'H', 'pins and freezes; bare hands until recalled'],
      ['Runic attack', 'img/gow-runic.png', 'Punish', 'H', 'long cooldown; save it for an opening'],
      ['Stun grab', 'gi:grab', 'Punish', 'L', 'fill the stun meter, then finish them'],
      ['Shield block', 'img/gow-shield.png', 'Mitigate', 'H', 'raise the Guardian Shield before the blow'],
      ['Shield parry', 'gi:shield-reflect', 'Reflex', 'H', 'a block timed to the hit'],
      ['Dodge roll', 'gi:dodge', 'Reflex', 'L', 'roll out of a red-ring attack'],
      ['Health stone', 'gi:health-increase', 'React', 'L', 'heal after taking damage'],
      ['Weapon charge', 'img/gow-blades.png', 'Setup', 'H', 'frost or fire on the next swings'],
      ['Shield bash', 'gi:shield-bash', 'Counterplay', 'L', 'breaks an enemy’s raised shield'],
      ['Swap Axe and Blades', 'img/gow-blades.png', 'Response', 'L', 'frost for fire enemies, fire for frost'] ] },
    { name: 'Kratos, Greek era', sub: 'God of War I to III', art: 'img/gow-kratos-greek.png', moves: [
      ['Boots of Hermes dash', 'gi:sprint', 'Initiate', 'H', 'close the gap at speed (III)'],
      ['Blades of Chaos', 'img/gow-blades-greek.png', 'Zone', 'H', 'chains that reach across the room'],
      ['Poseidon’s Rage', 'img/gow-poseidon.png', 'Zone', 'L', 'lightning all around clears the crowd'],
      ['Context finisher', 'gi:punch-blast', 'Punish', 'H', 'a button-prompt kill on a weakened foe'],
      ['Block', 'gi:checked-shield', 'Mitigate', 'H', 'hold to take the hit on the guard'],
      ['Golden Fleece parry', 'img/gow-fleece.png', 'Reflex', 'H', 'a timed block that reflects the blow (II)'],
      ['Evade roll', 'gi:dodge', 'Reflex', 'L', 'roll away on the right stick'],
      ['Health chests and orbs', 'gi:health-increase', 'React', 'L', 'heal from chests and kills'],
      ['Rage of the Gods', 'img/gow-rage.png', 'Setup', 'H', 'fill the meter, then fight empowered'],
      ['Grab', 'gi:grab', 'Counterplay', 'L', 'goes through an enemy who keeps blocking'],
      ['Swap weapons', 'img/gow-olympus.png', 'Response', 'L', 'Blade of Olympus, Cestus and more (II, III)'] ] } ],
    finding: 'Both eras fill all nine cells, so the audit shows no gaps; the change is which moves fill them. The Norse games hand Initiate to a companion, make Zone a throw-and-recall gamble, and move Setup from a once-a-fight rage meter to a weapon charge used every exchange.' },

  { id: 'cyberpunk', game: 'Cyberpunk 2077', art: 'img/cp-v.png', kits: [
    { name: 'V, blades build', sub: 'Reflexes and Body, Update 2.0', art: 'img/cp-mantis.png', moves: [
      ['Mantis Blades leap', 'img/cp-mantis.png', 'Initiate', 'H', 'jump across the room onto a target'],
      ['Blade finisher', 'img/cp-katana.png', 'Punish', 'H', 'kill a target left at low health'],
      ['Block with a blade', 'gi:sword-clash', 'Mitigate', 'H', 'raise the blade before the hit'],
      ['Deflect bullets', 'img/cp-katana.png', 'Reflex', 'H', 'a block timed to the shot sends it back'],
      ['Kerenzikov', 'img/cp-kerenzikov.png', 'Reflex', 'L', 'slows time as you dodge mid-fight'],
      ['Bounce Back', 'img/cp-bounceback.png', 'React', 'L', 'an inhaler that heals over time'],
      ['Sandevistan', 'img/cp-sandevistan.png', 'Setup', 'H', 'slow time before you commit'] ] },
    { name: 'V, netrunner build', sub: 'Intelligence, quickhacks', art: 'img/cp-ping.png', moves: [
      ['Overload from cover', 'img/cp-overload.png', 'Initiate', 'L', 'damage a target before it sees you'],
      ['Reboot Optics', 'gi:eye-target', 'Zone', 'H', 'blind a target: crowd control'],
      ['Synapse Burnout', 'gi:brain', 'Punish', 'L', 'hits harder the lower its health'],
      ['Optical Camo', 'img/cp-camo.png', 'Mitigate', 'L', 'vanish before the fight finds you'],
      ['Self-ICE', 'img/cp-selfice.png', 'Reflex', 'L', 'blocks an enemy quickhack mid-upload'],
      ['MaxDoc', 'img/cp-maxdoc.png', 'React', 'L', 'heal after taking damage'],
      ['Ping', 'img/cp-ping.png', 'Setup', 'L', 'reveal the enemy network first'],
      ['Cyberware Malfunction', 'img/cp-malfunction.png', 'Counterplay', 'H', 'read their implants, then switch them off'] ] } ],
    finding: 'The game fills all nine cells, but no single build does. The blades build keeps Initiate, Punish and the defensive row, mostly as high-risk moves, with Zone, Counterplay and Response empty. The netrunner keeps eight cells, almost all low-risk, and lacks Response. Hybrid builds are how a player fills the grid.' },

  { id: 'portal-2', game: 'Portal 2', art: 'img/p2-chell.png', kits: [
    { name: 'Chell', sub: 'single player; the room and its turrets are the opponent', art: 'img/p2-chell.png', moves: [
      ['Fling', 'gi:portal', 'Initiate', 'H', 'drop in, fly out: commit to the arc'],
      ['Aim a laser through portals', 'gi:fire-ray', 'Zone', 'L', 'redirect a beam to burn turrets'],
      ['Hold a cube as a shield', 'img/p2-cube.png', 'Mitigate', 'L', 'turret fire hits the cube'],
      ['Portal Wheatley’s bombs back', 'img/p2-wheatley.png', 'Reflex', 'H', 'catch the bomb in flight with a portal'],
      ['Paint Repulsion Gel', 'img/p2-gel-blue.png', 'Setup', 'L', 'lay a bounce pad before the run'],
      ['Paint Propulsion Gel', 'img/p2-gel-orange.png', 'Setup', 'L', 'lay a speed strip before the jump'],
      ['Knock a turret over from behind', 'gi:grab', 'Counterplay', 'L', 'turrets only see ahead'],
      ['Re-aim the exit mid-flight', 'gi:portal', 'Response', 'H', 'move the exit portal while airborne'] ] } ],
    finding: 'Chell’s kit fills seven cells with no weapon. Punish and React are gaps: turrets never leave an opening worth punishing, and health refills by itself, so nothing answers a hit. Portal 2 reads the grid as puzzle language: the "opponent" is the room, and Setup carries the most moves.' },

  { id: 'expedition-33', game: 'Clair Obscur: Expedition 33', art: 'img/e33-gustave.png', kits: [
    { name: 'The Expedition', sub: 'Gustave, Maelle, Lune, Sciel', art: 'img/e33-gustave.png', moves: [
      ['First strike on the field', 'img/e33-gustave.png', 'Initiate', 'L', 'hit the enemy before battle starts'],
      ['Free Aim shot', 'gi:crosshair', 'Punish', 'L', 'spend AP to shoot an exposed weak point'],
      ['Overcharge', 'img/e33-gustave.png', 'Punish', 'H', 'Gustave spends his full charge in one hit'],
      ['Shell', 'gi:magic-shield', 'Mitigate', 'L', 'a status that cuts incoming damage'],
      ['Parry', 'gi:fencer', 'Reflex', 'H', 'a tight window; a full chain hits back'],
      ['Dodge', 'gi:dodging', 'Reflex', 'L', 'a wider window than parry'],
      ['Healing Tint', 'gi:round-potion', 'React', 'L', 'heal after the enemy turn'],
      ['Lune’s Stains', 'img/e33-lune.png', 'Setup', 'H', 'elements from one spell power the next'],
      ['Jump counter', 'gi:high-kick', 'Counterplay', 'H', 'jump a sweeping attack and strike back'],
      ['Maelle’s stances', 'img/e33-maelle.png', 'Response', 'H', 'trade defense for damage mid-fight'],
      ['Revive Tint', 'gi:health-increase', 'Response', 'L', 'bring a fallen member back'] ] } ],
    finding: 'A turn-based game that fills eight cells, because parry, dodge and jump turn the enemy’s turn into real-time defense. Zone is the one gap: there is no space on the battlefield to control. The turn structure moves most offense into Setup and Punish.' },

  { id: 'brood-war', game: 'StarCraft: Brood War', art: 'img/sc-terran.png', kits: [
    { name: 'Terran bio and tanks', sub: 'the army’s verbs in a Terran versus Zerg game', art: 'img/sc-marine.png', moves: [
      ['Stim Pack', 'img/sc-marine.png', 'Initiate', 'H', 'trade health for speed and fire rate'],
      ['Siege Mode', 'img/sc-tank.png', 'Zone', 'H', 'lock down an area; slow to pack up'],
      ['Irradiate', 'img/sc-vessel.png', 'Punish', 'H', 'on a Mutalisk flock that clumped up'],
      ['Bunker', 'img/sc-bunker.png', 'Mitigate', 'L', 'marines fire from inside cover'],
      ['Marine split', 'img/sc-lurker.png', 'Reflex', 'H', 'spread out as Lurker spines travel'],
      ['Medic Heal', 'img/sc-medic.png', 'React', 'L', 'heal bio after an exchange'],
      ['Spider Mines', 'img/sc-vulture.png', 'Setup', 'L', 'Vultures plant mines on the path'],
      ['Comsat Scan', 'img/sc-comsat.png', 'Counterplay', 'H', 'reveal burrowed Lurkers, then focus them'],
      ['Tech switch', 'img/sc-terran.png', 'Response', 'H', 'move from bio to mech when Zerg changes'] ] } ],
    off: ['Gather', 'Build workers', 'Expand', 'Supply', 'Production'],
    finding: 'The Terran army fills all nine cells, but no single unit does: Initiate belongs to the Marine, Zone to the Siege Tank, Punish to the Science Vessel. A real-time strategy moveset is an army’s, spread across units. The economy (gathering, expanding, production) is off the grid, and it decides most games.' },

  { id: 'mario-kart-8', game: 'Mario Kart 8 Deluxe', art: 'img/mk-mario.png', kits: [
    { name: 'The item set', sub: 'items as the moveset', art: 'img/mk-mario.png', moves: [
      ['Red Shell', 'img/mk-red.png', 'Initiate', 'L', 'homes in on the racer ahead'],
      ['Bullet Bill', 'img/mk-bill.png', 'Initiate', 'H', 'close the gap through the pack'],
      ['Green Shell', 'img/mk-green.png', 'Zone', 'H', 'a straight shot that bounces off walls'],
      ['Bob-omb', 'img/mk-bobomb.png', 'Zone', 'L', 'a blast zone on the road'],
      ['Lightning', 'img/mk-lightning.png', 'Punish', 'H', 'time it for when rivals are mid-jump'],
      ['Spiny Shell', 'img/mk-spiny.png', 'Punish', 'L', 'hits the leader for leading, not for a mistake'],
      ['Trailing a Banana', 'img/mk-banana.png', 'Mitigate', 'L', 'held behind you, it blocks a shell'],
      ['Mushroom', 'img/mk-mushroom.png', 'Reflex', 'H', 'boost away as the Spiny Shell lands'],
      ['Coins', 'img/mk-coin.png', 'React', 'L', 'rebuild speed after a hit spills them'],
      ['Super Star', 'img/mk-star.png', 'Setup', 'H', 'pop it before contact: invincible and fast'],
      ['Super Horn', 'img/mk-horn.png', 'Counterplay', 'H', 'save it for the Spiny Shell'],
      ['Boo', 'img/mk-boo.png', 'Response', 'L', 'steal a rival’s item and turn invisible'] ] } ],
    finding: 'The item set fills all nine cells, but the player does not choose the cell: the item roulette deals items by race position. The leader is dealt Bananas, Green Shells and Coins (Mitigate, Zone, React); the back of the pack is dealt Bullet Bills, Stars and Lightning (Initiate, Setup, Punish). The player’s choice is timing. The Spiny Shell is the stretch case: it sits in Punish but punishes leading, not a mistake.' },

  { id: 'minecraft', game: 'Minecraft', art: 'img/mc-steve.png', kits: [
    { name: 'Survival mode', sub: 'the player against mobs, the world and other players', art: 'img/mc-steve.png', moves: [
      ['Bow', 'img/mc-bow.png', 'Initiate', 'L', 'shoot a mob before it closes in'],
      ['Torches', 'img/mc-torch.png', 'Zone', 'L', 'light stops mobs spawning nearby'],
      ['Critical hit', 'img/mc-sword.png', 'Punish', 'H', 'fall onto a target for extra damage'],
      ['Shield', 'img/mc-shield.png', 'Mitigate', 'H', 'raise it before the arrow or blast'],
      ['Wall of blocks', 'img/mc-cobble.png', 'Mitigate', 'L', 'pillar up or wall off'],
      ['Water bucket clutch', 'img/mc-water.png', 'Reflex', 'H', 'place water just before you land'],
      ['Golden Apple', 'img/mc-gapple.png', 'React', 'L', 'heal and absorb after a hit'],
      ['TNT trap', 'img/mc-tnt.png', 'Setup', 'L', 'rig a trap before they arrive'],
      ['Potion of Strength', 'img/mc-potion.png', 'Setup', 'H', 'drink before the fight'],
      ['Axe against a shield', 'img/mc-axe.png', 'Counterplay', 'L', 'disables a player’s raised shield'],
      ['Bed', 'img/mc-bed.png', 'Response', 'L', 'choose where you come back'] ] } ],
    off: ['Mine', 'Craft', 'Build', 'Farm', 'Trade', 'Explore'],
    finding: 'The grid fills, but only by stretching. Counterplay exists only against players: mobs never block. Zone and Reflex answer the world, not an opponent (darkness, falls). And most of play sits off the grid: mining, crafting and building have no "them" to answer. The framework audits Minecraft’s combat, not Minecraft.' },

  { id: 'celeste', game: 'Celeste', art: 'img/cel-madeline.png', kits: [
    { name: 'Madeline', sub: 'jump, dash, climb; the mountain is the opponent', art: 'img/cel-madeline.png', moves: [
      ['Dash across a gap', 'gi:sprint', 'Initiate', 'H', 'one charge: commit or fall'],
      ['Grab and climb', 'gi:hand', 'Mitigate', 'L', 'hold the wall before you fall; stamina drains'],
      ['Dash out of a Seeker’s lunge', 'gi:dodging', 'Reflex', 'H', 'the dash as a dodge'],
      ['Jump off a crumbling block', 'gi:plain-arrow', 'React', 'L', 'the shake is the telegraph'],
      ['Route through refill crystals', 'gi:gem-chain', 'Setup', 'L', 'plan where your next dash comes from'],
      ['Outrun Badeline’s copy', 'img/cel-badeline.png', 'Counterplay', 'H', 'she repeats your path: never stop'],
      ['Instant respawn', 'gi:cycle', 'Response', 'L', 'try again from the screen’s start'] ] } ],
    na: { Zone: 'Madeline has no hitbox to put out.', Punish: 'Nothing to attack, so no opening to take.' },
    finding: 'Madeline’s kit is all movement, so the offensive row nearly empties: Zone and Punish are not gaps but impossible, because she has no hitbox. Read with the mountain as the opponent, the defensive and predictive rows fill, and instant respawn turns every Response into a retry.' },

  { id: 'deadlock', game: 'Deadlock', art: 'img/dl-abrams.png', kits: [
    { name: 'The shared kit', sub: 'what every hero can do', art: 'img/dl-souls.png', moves: [
      ['Shoot', 'gi:crosshair', 'Initiate', 'L', 'poke from range'],
      ['Light melee', 'img/dl-melee.png', 'Punish', 'L', 'a quick hit on a reloading enemy'],
      ['Heavy melee', 'img/dl-melee.png', 'Punish', 'H', 'slow, strong, and parryable'],
      ['Zipline away', 'img/dl-zipline.png', 'Mitigate', 'L', 'leave a fight before it turns'],
      ['Parry', 'gi:fencer', 'Reflex', 'H', 'stuns a melee attacker on the right frame'],
      ['Dash and slide', 'gi:sprint', 'Reflex', 'L', 'move out of the line of fire'],
      ['Last-hit and deny souls', 'img/dl-souls.png', 'Setup', 'L', 'build the lead before the fight'],
      ['Bait the parry', 'gi:punch-blast', 'Counterplay', 'H', 'wait out their parry, then heavy melee'],
      ['Buy items', 'img/dl-shop.png', 'Response', 'H', 'change your build to fit the enemy'] ] },
    { name: 'Abrams', sub: 'the shared kit plus his four abilities', art: 'img/dl-abrams.png', inherit: 0, moves: [
      ['Shoulder Charge', 'img/dl-charge.png', 'Initiate', 'H', 'grab an enemy and slam them into a wall'],
      ['Seismic Impact', 'img/dl-seismic.png', 'Punish', 'H', 'leap in from afar onto a caught target'],
      ['Siphon Life', 'img/dl-siphon.png', 'React', 'H', 'drain health from enemies nearby'],
      ['Infernal Resilience', 'img/dl-resilience.png', 'React', 'L', 'regenerate part of the damage taken'] ] } ],
    finding: 'The shared kit fills seven cells; React and Zone are its gaps, left for heroes and items to fill. Abrams (picked as the clearest brawler) adds two React moves and stacks Initiate and Punish, but leaves Zone empty, which fits a hero built to close distance rather than hold space.' },

  { id: 'factorio', game: 'Factorio', art: 'img/fac-biter.png', kits: [
    { name: 'The engineer', sub: 'defense against the biters', art: 'img/fac-gunturret.png', moves: [
      ['Artillery', 'img/fac-artillery.png', 'Initiate', 'L', 'shells nests in range on its own'],
      ['Gun and laser turrets', 'img/fac-laser.png', 'Zone', 'L', 'placed hitboxes that hold the line'],
      ['Poison capsule', 'img/fac-poison.png', 'Punish', 'H', 'on biters bunched at your wall'],
      ['Walls', 'img/fac-wall.png', 'Mitigate', 'L', 'an obstacle before the attack arrives'],
      ['Exoskeleton', 'img/fac-exo.png', 'Reflex', 'L', 'outrun the swarm'],
      ['Raw fish', 'img/fac-fish.png', 'React', 'L', 'heal after a bite'],
      ['Land mines', 'img/fac-mine.png', 'Setup', 'L', 'traps on the attack path'],
      ['Radar', 'img/fac-radar.png', 'Setup', 'L', 'see expansions before they reach you'],
      ['Piercing ammo', 'img/fac-piercing.png', 'Response', 'L', 'upgrade when biters evolve'] ] } ],
    off: ['Mine', 'Craft', 'Place', 'Belts', 'Inserters', 'Trains', 'Research'],
    finding: 'The grid only sees the defense layer, and the factory automates most of it: turrets do the zoning, the reflexes and the punishing. Counterplay is a gap, because biters have no pattern to read beyond following pollution. The real moveset is the factory, and its verbs (belts, inserters, trains) sit off the grid.' },

  { id: 'slay-the-spire', game: 'Slay the Spire', art: 'img/sts-ironclad.png', kits: [
    { name: 'The Ironclad', sub: 'starting deck and core red cards', art: 'img/sts-ironclad.png', moves: [
      ['Strike', 'img/sts-strike.png', 'Initiate', 'L', 'damage before the enemy acts'],
      ['Intimidate', 'img/sts-intimidate.png', 'Zone', 'L', 'Weak on every enemy shrinks their hits'],
      ['Bludgeon', 'img/sts-bludgeon.png', 'Punish', 'H', 'spend 3 energy on a turn they do not attack'],
      ['Defend', 'img/sts-defend.png', 'Mitigate', 'L', 'Block sized to the intent shown'],
      ['Reaper', 'img/sts-reaper.png', 'React', 'H', 'heal by the damage dealt'],
      ['Burning Blood', 'img/sts-burning.png', 'React', 'L', 'the starting relic heals after each fight'],
      ['Bash', 'img/sts-bash.png', 'Setup', 'L', 'Vulnerable first, so the next hits land harder'],
      ['Inflame', 'img/sts-inflame.png', 'Setup', 'H', 'Strength for the rest of the fight'],
      ['Play no Skills into the Nob', 'img/sts-nob.png', 'Counterplay', 'H', 'Gremlin Nob gains Strength per Skill'],
      ['Card rewards and removal', 'gi:card-play', 'Response', 'L', 'shape the deck to the act’s threats'] ] } ],
    na: { Reflex: 'The enemy turn takes no input, so nothing can answer an attack in flight.' },
    finding: 'Eight cells fill; Reflex is impossible because the enemy turn takes no input. Intents turn every telegraph into exact information, so Mitigate becomes arithmetic (Block equal to the number shown) and Counterplay becomes deck rules learned per enemy.' },

  { id: 'runeterra', game: 'Legends of Runeterra', art: 'img/lor-draven.png', kits: [
    { name: 'Draven', sub: 'Noxus, aggro; levels after 2 Spinning Axe strikes and surviving', art: 'img/lor-draven.png', moves: [
      ['Quick Attack', 'img/lor-draven.png', 'Initiate', 'H', 'attacks and strikes before the blocker'],
      ['Draven’s Whirling Death', 'img/lor-whirling.png', 'Punish', 'H', 'a battling ally strikes the blocker they chose'],
      ['Overwhelm (level 2)', 'img/lor-draven2.png', 'Punish', 'L', 'a chump block still leaks damage'],
      ['Spinning Axe', 'img/lor-axe.png', 'Setup', 'H', 'discard a card for +1 power this round'] ] },
    { name: 'Teemo', sub: 'Piltover & Zaun; levels after 15 Poison Puffcaps planted', art: 'img/lor-teemo.png', moves: [
      ['Elusive attack', 'img/lor-teemo.png', 'Initiate', 'L', 'only Elusive units can block him'],
      ['Poison Puffcaps', 'img/lor-puffcap.png', 'Zone', 'L', '1 damage to their Nexus when drawn'],
      ['Doubling Puffcaps (level 2)', 'img/lor-teemo2.png', 'Punish', 'H', 'each unblocked hit doubles the field'],
      ['Nexus Strike: plant 5', 'img/lor-cloud.png', 'Setup', 'L', 'traps in the enemy deck'],
      ['Teemo’s Mushroom Cloud', 'img/lor-cloud.png', 'Response', 'L', 'plants 5 and puts a new Teemo in the deck'] ] } ],
    finding: 'Two champions, both empty in the defensive row. In a card game the champion is half the moveset: the second region’s spells (Barrier, Deny, healing) fill the other row. Draven covers three cells, all bets on striking first; Teemo covers five, nearly all low-risk and delayed, and wins through the opponent’s own draws.' },
];
