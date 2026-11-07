# Student tokens

Round battle-map tokens for laying out your own encounters in Miro, FigJam, Google Slides or on paper. Every image here comes from the *Mastering Game Mechanics* interactives: the same sprites, portraits, spell icons and markers you saw in the decks.

**Start with `contact-sheet-all.png`** to browse everything at once, or open one sheet per theme in `contact-sheets/`.

## Sizes

- `512px/` for big boards, slides and print.
- `256px/` for dense maps with many tokens (it's lighter and loads faster in Miro).

Both folders have the same files and the same names. This repo keeps the 256px set only (to stay light); the 512px set and ready-made zips live in the course's shared files, and `tools/student-tokens/build.sh` rebuilds both from the decks' art.

## Three kinds of file

For every icon there is a plain cut-out and one or two ringed tokens:

| File | What it is |
| --- | --- |
| `goomba.png` | The plain image on a transparent background. |
| `goomba-token-enemy.png` | A round token with a red ring. |
| `mario-token-player.png` | A round token with a purple ring. |
| `bulbasaur-token-enemy.png` / `bulbasaur-token-player.png` | Characters that could be on either side come with both rings. |
| `brick-wall-token.png` | Objects, hazards, abilities and roles have one ring in their own colour. |

## Ring colours

| Ring | Means |
| --- | --- |
| Red | Enemy |
| Purple | Player |
| Green | Ally or NPC on the players' side |
| Blue | Ability, spell or keyword |
| Orange | Hazard or element (fire, poison, shells, bombs) |
| Slate grey | Object, item, weapon or terrain |
| Gold | Role or class emblem |

To put any image in a different ring, drop it under one of the `map-markers/blank-ring-*.png` rings.

## Themes

| Folder | What's inside |
| --- | --- |
| `mario/` | Super Mario Bros. and Super Mario World sprites (heroes, enemies, blocks, power-ups), plus large versions of the co-op cast (`*-hd`). |
| `pokemon/` | The Pokémon from the type-weakness and reverse-map decks, and the Poké Balls. |
| `wow-abilities/` | World of Warcraft spell and ability icons used across the decks. |
| `wow-classes-and-bosses/` | Class crests as player tokens, Onyxia and Ragnaros as enemy tokens. |
| `wow-items/` | Potions, bandages, gear and coins. |
| `league-of-legends/` | Champion portraits (both rings), Yasuo and Braum abilities, Doran's Blade. |
| `roles-and-classes/` | League class and lane emblems (assassin, tank, support, jungle and so on). |
| `starcraft/` | StarCraft II co-op units and mutators, plus the rush / turtle / expand opening icons. |
| `enter-the-gungeon/` | Every Gun-dead variant from the gungeon-variants deck, plus the Pilot and a table. |
| `zelda/` | Tears of the Kingdom bosses and sages, a Gohma portrait, and NES Link. |
| `more-games/` | The audit icons: Celeste, Cyberpunk 2077, Deadlock, Expedition 33, Factorio, God of War, Legends of Runeterra, Minecraft, Mario Kart 8, Portal 2, StarCraft: Brood War, Subnautica and Slay the Spire. File names start with the game. |
| `icons-creatures/` | Generic monsters (ogre, troll, wolf, spider, dragon, ghost, golem...) for when you need "a monster" without a specific game. |
| `icons-weapons/` | Swords, axes, bows, guns, shields. |
| `icons-items-and-pickups/` | Chests, potions, hearts, food, coins, cards, dice. |
| `icons-elements-and-hazards/` | Fire, ice, lightning, water, poison, wind, explosions, traps. |
| `icons-obstacles-and-terrain/` | Walls, crates, barrels, rocks, doors, portals, towers. |
| `icons-actions-and-keywords/` | Verbs and keywords: dodge, grab, block, reflect, teleport, crosshairs. |
| `icons-design-tools/` | Gears, controller, pencil, puzzle piece: for notes on the board itself. |
| `map-markers/` | The Forsaken mockup telegraphs (circles, cones, zones, hits, zaps, shields; `-ally` is blue, `-enemy` is orange), the top-down player and foe discs from the hazard GIFs, the P1 / P2 / P3 tokens, and blank rings in every colour. |

`index.json` lists every file with its theme, its ring and the deck image it was made from.

## Vector basics (`vector-basics/`)

These are flat, simple shapes for sketching a fight, in the style of the Forsaken mockup sheet. Every one comes as an editable **SVG** in `vector-basics/svg/`, plus PNG exports in `vector-basics/256px/` and `vector-basics/512px/`. Browse them in `vector-basics/contact-sheet.png`.

| Folder | What's inside |
| --- | --- |
| `tokens/` | P1 to P4 player discs, each with a facing triangle (labelled and unlabelled). Enemy, minion, elite and boss faces, an ally NPC, a neutral creature and a facing marker. |
| `archetypes/` | 24 enemy discs in the same grey-and-red style, each with one prop that names its job in a fight: tank, swarm, archer, sniper, healer, summoner, exploder, charger, assassin, caster, buffer, shielder, splitter, flyer, burrower, turret, trapper, grappler, berserker, regenerator, stalker, mimic, leech and spawner. File names start with `enemy-`. |
| `modern/` | 12 modern-warfare enemies in the same style: rifleman, heavy gunner, riot shield, marksman, medic, grenadier, rocketeer, drone operator, K9 handler, juggernaut, commander and infiltrator. |
| `scifi/` | 12 sci-fi enemies in the same style: trooper, mech, hover drone, shield drone, cyborg, xeno swarm, psion, cloaker, repair bot, blinker, laser turret and broodmother. |
| `arrows/` | Move, dashed path, curve, rotate, two-way, charge, knockback, pull and leap, each in black, ally teal and enemy peach. |
| `telegraphs/` | Circle, ring, half-circle, crescent, cone, wide cone, line, trapezoid, square, cross, burst, lightning, sweep arc, shield, projectile, puddle, target circle and safe spot, each in ally teal (`-ally`) and enemy peach (`-enemy`). |
| `status/` | Round condition badges: stun, slow, haste, silence, interrupt, root, taunt, invulnerable, shield, heal, regen, poison, burn, freeze, bleed, vulnerable, blind, sleep, fear, confuse, disarm, knocked down, marked, damage up, damage down, cooldown, channeling, immune, cleanse and dead. |
| `props/` | Sword, spear, dagger, axe, bow, staff, chain, rock, pillar, wall, crate, barrel, spikes, vortex, flag, chest, key, door, lever, pressure plate, potion, bomb, a "no" symbol, a crossed-out target and a question mark. |

The SVGs open in Figma, Illustrator or Inkscape, and Miro accepts them directly, so you can recolour or resize them without losing sharpness. Stack a status badge on the corner of a token to show a condition.

## Using them in Miro

1. Drag a whole theme folder (or a handful of files) onto the board.
2. Scale tokens down until they sit like miniatures on your map; the 256px set stays crisp at small sizes.
3. Lock your map image (right-click > Lock) so tokens slide over it without moving it.
4. Use `map-markers/` cones, circles and zones to show telegraphs and areas of effect.

## Credits

Course material for educational use. Game art belongs to its owners: Nintendo (Mario, Zelda), The Pokémon Company, Blizzard Entertainment (World of Warcraft, StarCraft), Riot Games (League of Legends, Legends of Runeterra), Dodge Roll / Devolver (Enter the Gungeon) and the studios of the audited games. The `icons-*` glyphs are from [game-icons.net](https://game-icons.net) under CC BY 3.0, by Lorc, Delapouite, Carl Olsen, Caro Asercion, Cathelineau, DarkZaitzev, Faithtoken, Felbrigg, Quoting, Sbed, Skoll, Willdabeast and Zeromancer. The vector basics are drawn for this course after the Forsaken mockup sheet. The map markers are from the Forsaken Spine mockups and the course's own top-down drawing kit.
