/* Data for the Brian Feeney magic items page. Brian Feeney (Riot Games) wrote the item sheet, "D&D Magic Items Megasheet"
   (352 items). The 20 items below are quoted from it word for word in `sheet` (spelling as in the sheet). The five problems,
   the classic answers, the DCs and the party are this page's own and illustrative; the 5e rules quoted in `why` are the
   Player's Handbook's (long jump, falling, holding breath, group checks, Knock, Misty Step, Water Breathing).
   who: the class that leads the answer (F Fighter, R Rogue, W Wizard, B Bard, A everyone). sure: no die decides it.
   bin (items only): what the item changes. remove: takes the die away. move: moves the roll to another stat or player.
   scene: turns the scene into another kind of scene. stakes: changes what failing costs or what you know first. */
window.FEENEY = (function () {
  const CLASSES = {
    F: { name: 'Fighter', icon: 'visored-helm', col: '#2ea3dc' },
    R: { name: 'Rogue', icon: 'hood', col: '#2fae63' },
    W: { name: 'Wizard', icon: 'pointy-hat', col: '#8a4fd6' },
    B: { name: 'Bard', icon: 'lyre', col: '#e0a92d' },
  };
  const BINS = [
    { id: 'remove', name: 'Removes the roll', sub: 'no die decides it', col: '#1a8a4c', fill: '#d8f0df', edge: '#5fb47c' },
    { id: 'move', name: 'Moves the roll', sub: 'another stat, another player', col: '#2f3fb0', fill: '#dfe6fb', edge: '#8ea2e6' },
    { id: 'scene', name: 'Changes the scene', sub: 'stealth becomes social, and more', col: '#7a3fc0', fill: '#ece0fb', edge: '#b48ae8' },
    { id: 'stakes', name: 'Changes the stakes', sub: 'what failing costs, what you see', col: '#9a5a06', fill: '#fde9b8', edge: '#e0a92d' },
  ];
  const ITEMS = {
    powder: { name: 'Powder of Unmaking', type: 'Potion', icon: 'powder', bin: 'remove', change: 'A Dexterity check becomes a sure thing anyone can do. The door is gone for keeps, so you cannot lock it behind you.',
      sheet: 'This potion when thrown or poured onto an object reverts the materials it is comprised of to its natural state. Glass turns to sand, metal to ore, wood to branches, food to its ingredients.' },
    key: { name: 'Skeleton Key of Ownership', type: 'Wondrous', icon: 'skeleton-key', bin: 'scene', change: 'A break-in becomes a social scene: whoever spots you inside has to resist believing you own the place.',
      sheet: 'This Skeleton Key grants advantage on any checks to open or unlock doors. While inside a location any creature that spots you must make a DC13 Charisma Save or believe that you are in fact the proper owner of the establishment.' },
    window: { name: 'Portable Window', type: 'Wondrous', icon: 'window', bin: 'stakes', change: 'You see the room before you commit, and they cannot see you. Once a week, the wall itself becomes the way in.',
      sheet: 'If placed on a surface no thicker than 3 feet wide and the command word is spoken the window aheres itself to the wall and you can see through the window as if it were glass all the way through. Creatures on the other side cannot see back however. Additionally, once per week the window may be opened once attached and Creatures may move through the window to the other side of the wall.' },
    wmd: { name: 'Weapon of Mass Destruction', type: 'Wondrous', icon: 'warhammer', bin: 'move', change: 'A Strength check becomes a damage roll. The same Fighter solves it, with a different die and three times the damage.',
      sheet: 'This powerful weapon (typically a Warhammer or Maul) has a +2 Modifier. However critical hits from this weapon deal an additional 1d8 damage and knock an enemy back 10 ft. Additionally, this weapon deals 3x damage to inanimate objects.' },
    boots: { name: 'Boots of Reversed Momentum', type: 'Wondrous', icon: 'boots', bin: 'remove', change: 'No jump roll and no Strength score cap: walk away from the gap, then launch 30 ft across it.',
      sheet: 'If the user has moved more than 5 feet they may spend a charge to active the boots as a bonus action. This launches them 30 feet in the opposite direction last moved. Gain 1d3 charges per day.' },
    bread: { name: 'Archbakers Infinidough', type: 'Wondrous', icon: 'bread', bin: 'remove', change: 'Four rounds of rising bread fill a 20 ft gap. Crossing on it is the table’s call, and it is the kind of call this item invites.',
      sheet: 'This loaf of bread dough can pulled into multiple loaves each day. Additionally if the command word is spoken the bread rises and begins to expand and cook immediately gaining immense amounts of volume. It expands 5 feet per round in all directions for up to 10 rounds. Any creature in the way of the bread must make a DC14 Dex Save or get immobalized by the bread.' },
    portal: { name: 'Portal Bow', type: 'Weapon', icon: 'bow-arrow', bin: 'move', change: 'Athletics becomes an attack roll against AC 15. A miss still moves you, maybe over the drop.',
      sheet: '1/day you may Teleport to the square shot by this attack. You may also attack an empty tile as if AC 15. If the attack misses the DM may place you up to 5 feet away for each point the attack failed by.' },
    wool: { name: 'Wooly Floof', type: 'Armor', icon: 'sheep', bin: 'stakes', change: 'Falling stops costing hit points, so the fastest way across is straight down and up the other side.',
      sheet: 'This set of +2 Padded Armor is a clean white fluffy wool clothing with a hood that goes over the user’s head and has a set of floppy sheep ears. Once per fall the user may immediately as a reaction mitigate all the fall damage but be bounced half the distance in the air maintaining any momentum they had previously.' },
    cowl: { name: 'Cowl of Silence', type: 'Wondrous', icon: 'ninja-mask', bin: 'move', change: 'Four Stealth rolls become one: the party uses the wearer’s check, and plate armor stops mattering.',
      sheet: 'This magical face covering grants the user +2 to stealth checks. Additionally when making a sneaking or hiding check all allies within 10 feet may opt to use their check instead of their own.' },
    badge: { name: 'Badge of Authority', type: 'Wondrous', icon: 'police-badge', bin: 'move', change: 'The con moves from the Bard to whoever wears it. The guards roll to see through it, not you to sell it.',
      sheet: 'Can cast disguise self at will, as a generic local member of authority - such as a guard. The Investigation check is DC13 to reveal it as an illusion' },
    cats: { name: 'Bauble of Cats', type: 'Wondrous', icon: 'cat', bin: 'scene', change: 'Stealth becomes chaos. Noise is now the plan, because it pulls the guards away instead of toward you.',
      sheet: 'This small glass orb when broken releases 5d20 feral cats that spring out in all direciton.' },
    hanky: { name: 'Handkerchief of Misery', type: 'Wondrous', icon: 'tear-tracks', bin: 'scene', change: 'A fight becomes a kindness. Each guard who fails walks off in tears, and the fight that is left is smaller.',
      sheet: 'When offered to a creature they are overcome with intense sadness. They must pass a DC13 Charisma Save or begin to cry and weep uncontrollably forcing them to leave the situation. This automatically ends if the creature enters combat.' },
    blade: { name: 'Blade of Alarm', type: 'Weapon', icon: 'screaming', bin: 'remove', change: 'No Perception roll: walk with it drawn and the blade screams first. Surprise is off the table.',
      sheet: 'A +1 Dagger or Scimitar. When drawn and a hostile entity is within 60 feet the blade emits a single horrible scream.' },
    flies: { name: 'Ring of Fireflies', type: 'Ring', icon: 'ring', bin: 'stakes', change: 'A warning with a price: the flies turn red near hostiles, and they also make you the easiest target in the woods.',
      sheet: 'In any natural environment you can concentrate and draw nearby fireflies to circle near you. These flies make you easy to spot but illuminate the 15 ft area around you. Additionally these flies will turn from yellow to red when hostile creatures are nearby.' },
    shrooms: { name: 'Tordle’s Explosive Mushrooms', type: 'Weapon', icon: 'mushroom-gills', bin: 'scene', change: 'Once you know where they wait, you set a trap on the trap. The ambushed party becomes the ambusher.',
      sheet: 'These mushrooms when thrown will stick and adhere to any surface. When a unit moves onto their square they explode dealing 6d6 poison damage and blinding all enemies within 5 feet for 1 round (Save DC14 Con for Half damage and no blind)' },
    amulet: { name: 'Amulet of Deception', type: 'Wondrous', icon: 'invisible', bin: 'scene', change: 'Getting shot first becomes your opening move: leave a corpse behind and walk away invisible.',
      sheet: 'As a Reaction if you are hit by any attack or spell you may activate this. The amulet will creaste a copy of your body that will ragdoll back and appear dead, at the the same time you turn invisible, as the spell for up to 1 minute. An investigation or perception check DC 15.' },
    buoyant: { name: 'Buoyant Armor', type: 'Armor', icon: 'breastplate', bin: 'move', change: 'The player in plate, usually the one the water threatens most, becomes the one who scouts it.',
      sheet: 'This always wet armor can be fashioned from any suit of armor. It allows the wearer to float or sink as if the armor were heavy plate or made of air. The user can also hold their breath for up to 1 hour.' },
    pendant: { name: 'Pendant of Water Repulsion', type: 'Wondrous', icon: 'necklace', bin: 'remove', change: 'No swim checks and no breath to count: four people squeeze into a 10 ft bubble and walk the floor.',
      sheet: 'When the commandment is spoken, the pendant creates a bubble of air that repels any liquid within 5 feet. This functionally lets the user walk as if the liquid didn’t exist.' },
    pebble: { name: 'Oxygen Pebble', type: 'Wondrous', icon: 'bubbles', bin: 'stakes', change: 'An hour of waiting buys a place to breathe halfway. Time becomes the price instead of hit points.',
      sheet: 'These bright white stones are incredibly light and almost float when held or tossed. When placed in wate for 1 hour they emit an immense amount of tiny oxygen bubbles. In a 10 foot cube around and the pebble any creature that breathes air can breath fine in the bubbles.' },
    gills: { name: 'Steelgrate Gills', type: 'Wondrous', icon: 'heavy-collar', bin: 'remove', change: 'Put it on the player with the least breath. The weakest link is gone, so the swim fits everyone.',
      sheet: 'This this steel choker allows the wielder to breath in any liquid for up to 1 hour a day.' },
  };
  // the five problems: three classic answers each, then four of Brian's items
  const PROBLEMS = [
    { id: 'door', name: 'The Locked Door', sub: 'An iron-banded door, a sleeping guard beyond it, and the chest you came for.', icon: 'wooden-door',
      classic: [
        { id: 'pick', name: 'Pick the lock', icon: 'lockpicks', who: 'R', roll: 'DEX DC 15', noise: 'quiet', res: 'Through, quietly', tone: 'g', why: 'Quiet, and always the Rogue’s job. A miss only costs time, so the table waits while one player rolls until it opens.' },
        { id: 'bash', name: 'Break it down', icon: 'anvil-impact', who: 'F', roll: 'STR DC 20', noise: 'loud', res: 'Through, guard awake', tone: 'y', why: 'Anyone strong can try, and every try is loud. Two tries woke the guard before the door gave.' },
        { id: 'knock', name: 'Cast Knock', icon: 'spell-book', who: 'W', roll: 'No roll · a 2nd-level slot', noise: 'loud', sure: true, res: 'Through, guard awake', tone: 'y', why: 'Sure, but Knock makes a loud knock audible from 300 ft away, and it spends a slot the Wizard wanted for the fight.' },
      ],
      items: [
        { id: 'powder', who: 'B', roll: 'No roll · one use', noise: 'quiet', sure: true, res: 'Through, quietly', tone: 'g' },
        { id: 'key', who: 'B', roll: 'DEX with advantage, then their CHA save', noise: 'quiet', res: 'Through, as the owner', tone: 'g' },
        { id: 'window', who: 'W', roll: 'No roll · once a week', noise: 'quiet', sure: true, res: 'Through, scouted first', tone: 'g' },
        { id: 'wmd', who: 'F', roll: 'Damage roll × 3', noise: 'loud', res: 'One swing, guard awake', tone: 'y' },
      ] },
    { id: 'chasm', name: 'The Chasm', sub: 'A 20 ft gap and a 60 ft drop. The way on is the far lip.', icon: 'cliff-crossing',
      classic: [
        { id: 'jump', name: 'Long jump', icon: 'jump-across', who: 'F', roll: 'No roll can help', noise: 'quiet', res: 'Short by 4 ft', tone: 'r', why: 'With a 10 ft run-up, a long jump covers feet up to your Strength score. Strength 16 is 16 ft, and no roll adds the last 4.' },
        { id: 'rope', name: 'Grapple and climb', icon: 'grapple', who: 'R', roll: '1 throw + 4 climbs', noise: 'quiet', res: 'Wizard fell', tone: 'y', why: 'Five rolls for four people. The party is only as sure as its weakest climber, and 60 ft of falling is 6d6.' },
        { id: 'misty', name: 'Cast Misty Step', icon: 'magic-swirl', who: 'W', roll: 'No roll · a 2nd-level slot', noise: 'quiet', sure: true, res: 'Only the Wizard', tone: 'y', why: 'Thirty feet of teleport, for the caster only. One player is across and three still need an answer.' },
      ],
      items: [
        { id: 'boots', who: 'F', roll: 'No roll · 1 of 3 charges', noise: 'quiet', sure: true, res: 'Fighter on the far lip', tone: 'g' },
        { id: 'bread', who: 'B', roll: 'No roll', noise: 'quiet', sure: true, res: 'Everyone across', tone: 'g' },
        { id: 'portal', who: 'R', roll: 'Attack vs AC 15', noise: 'quiet', res: 'Rogue across', tone: 'y' },
        { id: 'wool', who: 'F', roll: 'One climb roll', noise: 'quiet', res: 'Fighter across, unhurt', tone: 'g' },
      ] },
    { id: 'guards', name: 'The Guarded Gate', sub: 'Two guards at the gate, and a barracks full of their friends.', icon: 'guarded-tower',
      classic: [
        { id: 'fight', name: 'Fight them', icon: 'crossed-swords', who: 'F', roll: 'Initiative and attacks', noise: 'loud', res: 'Through, keep alerted', tone: 'y', why: 'It works if you win, and the noise brings the rest of the keep out of the barracks.' },
        { id: 'sneak', name: 'Sneak past', icon: 'footsteps', who: 'R', roll: '4 Stealth rolls', noise: 'quiet', res: 'Spotted', tone: 'r', why: 'A group check: half the party must beat the guards’ passive Perception 13. The Fighter’s plate rolls with disadvantage.' },
        { id: 'talk', name: 'Talk your way in', icon: 'conversation', who: 'B', roll: 'CHA (Deception) vs Insight', noise: 'quiet', res: 'Through, the Bard’s scene', tone: 'g', why: 'One player’s skill carries the party. It works, and the other three watch the Bard play.' },
      ],
      items: [
        { id: 'cowl', who: 'R', roll: '1 Stealth roll for all', noise: 'quiet', res: 'Through, unseen', tone: 'g' },
        { id: 'badge', who: 'F', roll: 'Their Investigation DC 13', noise: 'quiet', res: 'Through, the Fighter’s con', tone: 'g' },
        { id: 'cats', who: 'W', roll: 'No roll · 5d20 cats', noise: 'loud', sure: true, res: 'Through, guards busy', tone: 'g' },
        { id: 'hanky', who: 'W', roll: 'Their CHA save DC 13', noise: 'quiet', res: 'A 4 against 1 fight', tone: 'y' },
      ] },
    { id: 'ambush', name: 'The Ambush', sub: 'A forest road, and bandits waiting in the trees ahead.', icon: 'bandit',
      classic: [
        { id: 'passive', name: 'Hope your Perception holds', icon: 'eye-target', who: 'A', roll: 'Their Stealth vs your passive Perception', noise: 'quiet', res: 'Surprised', tone: 'r', why: 'Their Stealth 16 beats every passive Perception in the party. Surprised creatures lose their first turn while the arrows land.' },
        { id: 'scout', name: 'Send a scout ahead', icon: 'magnifying-glass', who: 'R', roll: 'Perception vs their Stealth', noise: 'quiet', res: 'Seen, but alone', tone: 'y', why: 'The Rogue spots them, 60 ft ahead of the party. Splitting up turned one roll into a fight the Rogue starts alone.' },
        { id: 'formation', name: 'Fighter walks in front', icon: 'shield', who: 'F', roll: 'Their attack rolls', noise: 'quiet', res: 'A fight on their terms', tone: 'y', why: 'Armor and hit points soak the first volley. The problem stays; it just costs the Fighter instead of the Wizard.' },
      ],
      items: [
        { id: 'blade', who: 'F', roll: 'No roll', noise: 'loud', sure: true, res: 'No surprise', tone: 'g' },
        { id: 'flies', who: 'W', roll: 'No roll', noise: 'quiet', sure: true, res: 'Warned, but lit up', tone: 'y' },
        { id: 'shrooms', who: 'R', roll: 'Their CON save DC 14', noise: 'loud', res: 'Ambush reversed', tone: 'g' },
        { id: 'amulet', who: 'B', roll: 'Their check DC 15', noise: 'quiet', res: 'Shot first, struck first', tone: 'g' },
      ] },
    { id: 'flood', name: 'The Flooded Tunnel', sub: '240 ft of water with no air pocket. Swimming, that is 16 rounds.', icon: 'waves',
      classic: [
        { id: 'hold', name: 'Hold your breath', icon: 'drowning', who: 'A', roll: 'Breath: 1 + CON minutes', noise: 'quiet', res: 'Wizard drowning', tone: 'r', why: 'Breath lasts 1 + Constitution modifier minutes. The Wizard has 10 rounds of air, and the swim takes 16.' },
        { id: 'spell', name: 'Cast Water Breathing', icon: 'spell-book', who: 'W', roll: 'No roll · a 3rd-level slot', noise: 'quiet', sure: true, res: 'Everyone through', tone: 'g', why: 'It covers up to ten creatures for 24 hours, if somebody has 3rd-level spells. As a ritual it costs 10 more minutes instead of a slot.' },
        { id: 'around', name: 'Find another way', icon: 'hourglass', who: 'A', roll: 'No roll · hours of travel', noise: 'quiet', sure: true, res: 'Through, 4 hours later', tone: 'y', why: 'Sure, and slow. Every hour on the road is another random encounter roll.' },
      ],
      items: [
        { id: 'buoyant', who: 'F', roll: 'No roll', noise: 'quiet', sure: true, res: 'Fighter scouts it', tone: 'y' },
        { id: 'pendant', who: 'B', roll: 'No roll', noise: 'quiet', sure: true, res: 'Everyone through, dry', tone: 'g' },
        { id: 'pebble', who: 'F', roll: 'No roll · 1 hour', noise: 'quiet', sure: true, res: 'Everyone through', tone: 'g' },
        { id: 'gills', who: 'W', roll: 'No roll', noise: 'quiet', sure: true, res: 'Everyone through', tone: 'g' },
      ] },
  ];
  // fill item answers from ITEMS so every approach reads the same way
  PROBLEMS.forEach(p => {
    p.classic.forEach(a => { a.kind = 'classic'; a.problem = p.id; });
    p.items.forEach(a => { const it = ITEMS[a.id]; Object.assign(a, { kind: 'item', problem: p.id, name: it.name, icon: it.icon, why: it.change }); it.problem = p.id; it.approach = a; });
    p.all = [...p.classic, ...p.items];
  });
  return { CLASSES, BINS, ITEMS, PROBLEMS };
})();
