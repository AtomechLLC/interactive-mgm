/* Weapon data for the three tiers page (MGM C4 M1, deck slides 56-68 and 122-125).
   Dark Souls III: every weapon in the base game and both DLCs (Ashes of Ariandel, The Ringed City), grouped by the
   game's weapon classes, from darksouls3.wiki.fextralife.com/Weapons (checked 2026-10-28). Shields, talismans, chimes
   and pyromancy flames are left out; staves stay in because they are melee weapons too.
   Bloodborne: every trick weapon in the base game and The Old Hunters, from bloodborne.wiki.fextralife.com/Weapons.
   Firearms are left out, as on the slide. DLC flags are from the same page.
   deck: the numbers on slides 123 and 125, for comparison. relevant: the deck's own estimate, the only tier with no
   public usage data behind it. */
window.WEAPONS = {
  ds3: {
    name: 'Dark Souls III',
    deck: { weapons: 120, possibility: 18, differentiated: 10, relevant: 5 },
    relevant: 5,
    classes: [
      ['Daggers', ['Dagger', 'Parrying Dagger', 'Mail Breaker', 'Bandit’s Knife', 'Rotten Ghru Dagger', 'Corvian Greatknife', 'Handmaid’s Dagger', 'Scholar’s Candlestick', 'Tailbone Short Sword', 'Brigand Twindaggers', 'Harpe', 'Aquamarine Dagger', 'Murky Hand Scythe']],
      ['Straight Swords', ['Shortsword', 'Longsword', 'Broadsword', 'Broken Straight Sword', 'Astora Straight Sword', 'Lothric Knight Sword', 'Barbed Straight Sword', 'Dark Sword', 'Cleric’s Candlestick', 'Irithyll Straight Sword', 'Anri’s Straight Sword', 'Sunlight Straight Sword', 'Morion Blade', 'Lothric’s Holy Sword', 'Gotthard Twinswords', 'Valorheart', 'Ringed Knight Straight Sword']],
      ['Greatswords', ['Bastard Sword', 'Claymore', 'Hollowslayer Greatsword', 'Firelink Greatsword', 'Black Knight Sword', 'Flamberge', 'Executioner’s Greatsword', 'Wolf Knight’s Greatsword', 'Wolnir’s Holy Sword', 'Greatsword of Judgment', 'Storm Ruler', 'Moonlight Greatsword', 'Twin Princes’ Greatsword', 'Drakeblood Greatsword', 'Onyx Blade', 'Gael’s Greatsword']],
      ['Ultra Greatswords', ['Zweihander', 'Greatsword', 'Astora Greatsword', 'Farron Greatsword', 'Fume Ultra Greatsword', 'Profaned Greatsword', 'Cathedral Knight Greatsword', 'Black Knight Greatsword', 'Lorian’s Greatsword', 'Lothric Knight Greatsword', 'Ringed Knight Paired Greatswords']],
      ['Curved Swords', ['Crescent Moon Sword', 'Scimitar', 'Pontiff Knight Curved Sword', 'Falchion', 'Sellsword Twinblades', 'Warden Twinblades', 'Shotel', 'Painting Guardian’s Curved Sword', 'Dancer’s Enchanted Swords', 'Storm Curved Sword', 'Carthus Curved Sword', 'Carthus Shotel', 'Rotten Ghru Curved Sword', 'Follower Sabre', 'Demon’s Scar']],
      ['Curved Greatswords', ['Murakumo', 'Exile Greatsword', 'Old Wolf Curved Sword', 'Carthus Curved Greatsword', 'Harald Curved Greatsword']],
      ['Katanas', ['Darkdrift', 'Uchigatana', 'Washing Pole', 'Onikiri and Ubadachi', 'Black Blade', 'Chaos Blade', 'Bloodlust', 'Frayed Blade']],
      ['Thrusting Swords', ['Estoc', 'Rapier', 'Ricard’s Rapier', 'Crystal Sage’s Rapier', 'Irithyll Rapier', 'Crow Quills']],
      ['Axes', ['Battle Axe', 'Hand Axe', 'Thrall Axe', 'Brigand Axe', 'Dragonslayer’s Axe', 'Butcher Knife', 'Winged Knight Twinaxes', 'Eleonora', 'Man Serpent Hatchet', 'Millwood Battle Axe']],
      ['Greataxes', ['Greataxe', 'Dragonslayer Greataxe', 'Demon’s Greataxe', 'Great Machete', 'Yhorm’s Great Machete', 'Black Knight Greataxe', 'Earth Seeker']],
      ['Hammers', ['Club', 'Drang Hammers', 'Mace', 'Morning Star', 'Reinforced Club', 'Heysel Pick', 'Warpick', 'Blacksmith Hammer']],
      ['Great Hammers', ['Gargoyle Flame Hammer', 'Great Mace', 'Large Club', 'Vordt’s Great Hammer', 'Morne’s Great Hammer', 'Great Wooden Hammer', 'Great Club', 'Smough’s Great Hammer', 'Old King’s Great Hammer', 'Pickaxe', 'Dragon Tooth', 'Spiked Mace', 'Quakestone Hammer', 'Ledo’s Great Hammer']],
      ['Fists & Claws', ['Caestus', 'Demon’s Fist', 'Dark Hand', 'Claw', 'Manikin Claws', 'Crow Talons']],
      ['Spears & Pikes', ['Arstor’s Spear', 'Drang Twinspears', 'Gargoyle Flame Spear', 'Spear', 'Tailbone Spear', 'Pike', 'Winged Spear', 'Four-Pronged Plow', 'Saint Bident', 'Rotten Ghru Spear', 'Partizan', 'Yorshka’s Spear', 'Dragonslayer Spear', 'Dragonslayer Swordspear', 'Golden Ritual Spear', 'Soldering Iron', 'Lothric Knight Long Spear', 'Greatlance', 'Follower Javelin', 'Lothric War Banner', 'Ringed Knight Spear']],
      ['Halberds', ['Halberd', 'Lucerne', 'Winged Knight Halberd', 'Red Hilted Halberd', 'Glaive', 'Crescent Axe', 'Gundyr’s Halberd', 'Black Knight Glaive', 'Immolation Tinder', 'Splitleaf Greatsword', 'Crucifix of the Mad King']],
      ['Reapers', ['Great Scythe', 'Pontiff Knight Great Scythe', 'Great Corvian Scythe', 'Friede’s Great Scythe']],
      ['Whips', ['Whip', 'Notched Whip', 'Witch’s Locks', 'Spotted Whip', 'Rose of Ariandel']],
      ['Bows', ['Black Bow of Pharis', 'Longbow', 'Short Bow', 'Dragonrider Bow', 'Composite Bow', 'Darkmoon Longbow', 'White Birch Bow']],
      ['Greatbows', ['Onislayer Greatbow', 'Dragonslayer Greatbow', 'Millwood Greatbow']],
      ['Crossbows', ['Light Crossbow', 'Knight’s Crossbow', 'Arbalest', 'Sniper Crossbow', 'Avelyn', 'Heavy Crossbow', 'Repeating Crossbow']],
      ['Staves', ['Sorcerer’s Staff', 'Heretic’s Staff', 'Witchtree Branch', 'Sage’s Crystal Staff', 'Izalith Staff', 'Court Sorcerer’s Staff', 'Man-Grub’s Staff', 'Storyteller’s Staff', 'Mendicant’s Staff', 'Archdeacon’s Great Staff', 'Murky Longstaff', 'Preacher’s Right Arm']],
    ],
  },
  bb: {
    name: 'Bloodborne',
    deck: { weapons: 26, possibility: 18, differentiated: 8, relevant: 4 },
    relevant: 4,
    // every trick weapon has its own moveset, in both forms, so each one is its own class here
    classes: [
      'Saw Cleaver', 'Saw Spear', 'Hunter Axe', 'Threaded Cane', 'Kirkhammer', 'Ludwig’s Holy Blade', 'Blade of Mercy', 'Burial Blade',
      'Chikage', 'Reiterpallasch', 'Rifle Spear', 'Stake Driver', 'Tonitrus', 'Logarius’ Wheel', 'Beast Claw',
      'Amygdalan Arm*', 'Beasthunter Saif*', 'Beast Cutter*', 'Bloodletter*', 'Boom Hammer*', 'Church Pick*', 'Holy Moonlight Sword*', 'Kos Parasite*', 'Rakuyo*', 'Simon’s Bowblade*', 'Whirligig Saw*',
    ].map(n => [n.replace('*', ''), [n.replace('*', '')], n.endsWith('*')]),
  },
};
