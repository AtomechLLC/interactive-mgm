/* The 48 games from Alex Brazie, "All The Games I've Played Before" (GDS Original Content), in the article's five rounds.
   Each row: title, platform, year, genre, the lesson as the article puts it (shortened), what kind of lesson it is, and
   whether it came from something the game did well (+) or something it missed (-).
   Genres follow the play-history quiz's genre rules (atomechllc.github.io/all-the-games-i-played-before), with a few
   hand fixes where the quiz falls back to "Arcade & Action". Lesson kinds are this page's reading. */
window.GP = (function () {
  const KINDS = {
    control: { name: 'Controls & feel', icon: 'gamepad', col: '#2ea3dc' },
    structure: { name: 'Structure & progression', icon: 'checklist', col: '#8a4fd6' },
    story: { name: 'Story & narrative', icon: 'book-cover', col: '#e5322d' },
    systems: { name: 'Systems & rules', icon: 'cog', col: '#2fae63' },
    social: { name: 'Players & community', icon: 'conversation', col: '#e0a92d' },
    craft: { name: 'Production & tech', icon: 'paint-brush', col: '#5d618c' },
  };
  const GENRES = {
    Platformers: 'jump-across', RPGs: 'crossed-swords', Adventure: 'magnifying-glass', Shooters: 'high-shot', Action: 'sword-clash',
    Roguelites: 'dice-twenty-faces-twenty', Puzzle: 'jigsaw-piece', 'Sim & Builder': 'claw-hammer', 'Racing & Party': 'race-car', 'Arcade & Brawlers': 'joystick',
  };
  // [title, platform, year, genre, lesson, kind, +/-]; ROUND_SIZES splits them into the article's five rounds
  const ROWS = [
    // round 1
    ['Super Monkey Ball', 'GameCube', 2001, 'Racing & Party', 'You tilt the world, the monkey just rolls: a frame that makes awkward controls feel natural.', 'control', '+'],
    ['SimCity', 'OS/2', 1995, 'Sim & Builder', 'No way to win can be fine: sometimes you play to build a farm and watch it live.', 'structure', '+'],
    ['Pokémon Gold / Silver', 'Game Boy Color', 2000, 'RPGs', 'A surprise return to the first region: an unexpected, loved surprise bonds players to you.', 'structure', '+'],
    ['Baba Is You', 'PC', 2019, 'Puzzle', 'The rules are the game. Players delight in breaking rules when that is the intent.', 'systems', '+'],
    ['Call of Duty: Warzone', 'PC', 2020, 'Shooters', 'Friends were the reason to play; class variations and skins only go so far.', 'social', '-'],
    ['Epic Mickey', 'Wii', 2010, 'Platformers', 'Create, destroy and protect as three domains of power; praise cannot save an unpopular system.', 'systems', '-'],
    ['Half-Life', 'PC', 1998, 'Shooters', 'A shooter can be a vehicle for storytelling, even for players who never finish it.', 'story', '+'],
    ['Eldest Souls', 'PC', 2021, 'Action', 'Aggression over safe dodging; top-down games need target lock and attack magnetism.', 'control', '+'],
    ['The Witcher', 'PC', 2007, 'RPGs', 'Sloppy combat, but potions and oils showed how far preparation can matter.', 'systems', '-'],
    ['Limbo', 'PC', 2011, 'Platformers', 'Low visual clarity works as a puzzle tool when the solutions stay clear.', 'craft', '+'],
    // round 2
    ['Mega Man V', 'Game Boy', 1994, 'Platformers', 'A long series struggles to stay novel, and cross-title story arcs are hard to carry.', 'story', '-'],
    ['StarTropics', 'NES', 1990, 'Adventure', 'Step-by-step movement turned dungeons into a sudoku-like puzzle.', 'control', '+'],
    ['Mega Man 6', 'NES', 1994, 'Platformers', 'Holding and charging the buster added a new level of skill expression.', 'control', '+'],
    ['Dispatch', 'PC', 2025, 'Adventure', 'Simple story-expressing mini-games tied the job’s pressure to the villains’ escalation.', 'story', '+'],
    ['Commander Keen', 'IBM PC', 1990, 'Platformers', 'Hard jumping aggravates; the pogo stick was a speedy joy few games brought back.', 'control', '-'],
    ['Super Mario Land 2', 'Game Boy', 1992, 'Platformers', 'Choose your own order, and make exclusive power-ups contrast strongly.', 'structure', '+'],
    ['Xenogears', 'PlayStation', 1998, 'RPGs', 'Fuel as a limit on ultra powerful mech battles added depth and narrative.', 'systems', '+'],
    ['Mario Kart Wii', 'Wii', 2008, 'Racing & Party', 'Motorcycles broke the series’ limits; forcing the wheel controller into play fell flat.', 'craft', '-'],
    ['The Last Remnant', 'PC', 2009, 'RPGs', 'Morale as a first-class mechanic that drives turn order; multi-pull aggro lets players pick their risk.', 'systems', '+'],
    ['Timberborn', 'PC', 2021, 'Sim & Builder', 'Clean and poisoned water: simple environmental pressure, well supported, runs deep.', 'systems', '+'],
    // round 3
    ['Mega Man 8', 'PlayStation', 1997, 'Platformers', 'Power progression in a skill-based series was an audience mismatch.', 'structure', '-'],
    ['Mario Party 6', 'GameCube', 2004, 'Racing & Party', 'Party games are about the people you play with, not the gameplay itself.', 'social', '+'],
    ['TMNT II: The Arcade Game', 'NES', 1990, 'Arcade & Brawlers', 'Co-op that is easy to play with a little brother makes a rental unforgettable.', 'social', '+'],
    ['The Secret of Monkey Island', 'IBM PC', 1990, 'Adventure', 'Insult swordfighting: an iconic reskin of lock-and-key; verb + object puzzles are all or nothing.', 'story', '+'],
    ['Illusion of Gaia', 'SNES', 1994, 'RPGs', 'Power-ups tied to clearing every enemy force you to deal with every creature.', 'structure', '-'],
    ['River City Ransom', 'NES', 1990, 'Arcade & Brawlers', 'Picking up environmental objects stood out; arcade-style resets exhausted kids.', 'control', '-'],
    ['Assassin’s Creed', 'Xbox 360', 2007, 'Action', 'Climbing towers to unlock the map became a staple landmark across genres.', 'structure', '+'],
    ['Planescape: Torment', 'PC', 1999, 'RPGs', 'Almost all dialogue, rewarding you for stacking conversational powers.', 'story', '+'],
    ['Mario Paint', 'SNES', 1992, 'Sim & Builder', 'Following recipes or spamming funny sounds: a toy can spark players to create.', 'social', '+'],
    // round 4
    ['Zelda: Majora’s Mask', 'N64', 2000, 'Adventure', 'Knowledge as progression: learn when and where things happen in the three days.', 'structure', '+'],
    ['Dig Dug', 'Arcade', 1982, 'Arcade & Brawlers', 'Rough controls teach you to value the successors; tunnel side effects returned in Minecraft.', 'control', '-'],
    ['Firewatch', 'PC', 2016, 'Adventure', 'Narrative through a walkie-talkie keeps the player free while the story plays.', 'story', '+'],
    ['Breath of Fire', 'SNES', 1994, 'RPGs', 'Dragon forms as a timed in-combat power-up, and fishing that never stopped coming back.', 'systems', '+'],
    ['Crypt of the NecroDancer', 'PC', 2015, 'Roguelites', 'Rhythm + roguelike from market research; a character who waits for you eases new players in.', 'structure', '+'],
    ['Devil May Cry', 'PS2', 2001, 'Action', 'Style ratings and many inputs turned me off, and the series succeeded anyway.', 'control', '-'],
    ['Darkest Dungeon', 'PC', 2016, 'Roguelites', 'Stress and torchlight as room-by-room risk against reward.', 'systems', '+'],
    ['Call of Duty 4: Modern Warfare', 'PC', 2007, 'Shooters', 'Ghillied-up stealth and a PvP class creator copied for generations.', 'structure', '+'],
    ['Ori and the Will of the Wisps', 'PC', 2020, 'Platformers', 'Weapon choice as self-expression, and tools that show difficulty at a glance.', 'craft', '+'],
    ['Mario Kart World', 'Switch 2', 2025, 'Racing & Party', 'Connected open-world roads made idle exploration as engaging as the races.', 'structure', '+'],
    // round 5
    ['Portal', 'PC', 2007, 'Puzzle', 'Freedom that delights and baffles; the furnace moment shows how players fall into conditioned helplessness.', 'story', '+'],
    ['Hatoful Boyfriend', 'PC', 2014, 'Adventure', 'Dating sims are a format, not a genre; understanding the other is the gameplay.', 'story', '+'],
    ['Broken Age', 'PC', 2014, 'Adventure', 'Two protagonists give you another puzzle to try when one frustrates you.', 'structure', '+'],
    ['Crawl', 'PC', 2017, 'Roguelites', 'Kill the hero and you become the hero; monsters need more power when a player drives them.', 'social', '-'],
    ['Mega Man X8', 'PS2', 2004, 'Platformers', 'Free character swaps in stages; the navigator held hands too much.', 'control', '-'],
    ['Dust: An Elysian Tail', 'PC', 2013, 'Action', 'Too much player power over general monsters made most fights feel the same.', 'systems', '-'],
    ['Pokémon Red / Blue', 'Game Boy', 1998, 'RPGs', 'Anything works if you power it up, but a diverse roster means less grinding; trading built community.', 'social', '+'],
    ['Super Meat Boy', 'PC', 2010, 'Platformers', 'Near instant restarts make brutal challenge tolerable, and every death replays.', 'control', '+'],
    ['Duck Hunt', 'NES', 1985, 'Shooters', 'A simple light gun bridged generations; humor plus one dexterity test lasted years.', 'craft', '+'],
  ];
  const ROUND_SIZES = [10, 10, 9, 10, 9];
  return { KINDS, GENRES, ROWS, ROUND_SIZES };
})();
