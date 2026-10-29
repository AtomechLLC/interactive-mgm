# Mastering Game Mechanics: interactive visuals

Slides from the *Mastering Game Mechanics* course rebuilt as interactive web slides. Same engine and keys as `../InteractiveFPF`.

Open `index.html` in a browser (no build step, works straight off disk). It lists the course modules, each with its own home page:

- `pvp/`: **PvP Interactions** (`pvp/index.html`), from *MGM C4 M4 - Fundamentals for Designing Engaging PvP Interactions*.
- `pve-interactions/`: **PvE Interactions** (`pve-interactions/index.html`), from *MGM C4 M5 - Fundamentals for Designing Engaging PvE Interactions*.
- `coop-interactions/`: **Co-op Interactions** (`coop-interactions/index.html`), from *MGM C3 M6 - Engaging Co-op Interaction Design Fundamentals*.
- `mechanics-tools/`: **Mechanics Design Tools** (`mechanics-tools/index.html`), from *MGM C4 M3 - Mechanics Design Optimizations and Tools*.
- `understand-mechanics/`: **Understand Mechanics** (`understand-mechanics/index.html`), from *MGM C4 M2 - Understand, Analyze and Plan Mechanics*.
- `depth/`: **The Goal: Depth** (`depth/index.html`), from *MGM C4 M1 - The Goal of Mechanics Design - Depth*.
- `composition/`: **Composition** (`composition/index.html`), from *MGM C4 M7 - Techniques to Scale Engaging Gameplay Design*, the final module.

Shared engine, theme and art stay in `assets/` at the root, so a deck one level down loads `../../assets/`. `404.html` redirects the old root deck URLs (for example `/core-actions/`) to their `pvp/` homes.

| Key | Action |
| --- | --- |
| `←` `→` / `Space` | previous / next (Space also reveals step-by-step items) |
| `N` | speaker notes |
| `O` | overview of all slides |
| `F` | fullscreen |

## PvP Interactions decks (`pvp/`)

Each deck's home button goes back to `pvp/index.html`. Add a card there when you make a new PvP deck.

- `pvp/core-actions/`: **Core Gameplay Actions**, from *MGM C4 M4 - Fundamentals for Designing Engaging PvP Interactions*, deck slides 428 to 434.
  1. Title
  2. The anatomy of an attack (428): anticipation, slash and recovery frames, the human reaction window and online latency. Press K to block.
  3. Offensive verbs (429): drag your token around a sweep and a thrust side by side.
  4. Defensive verbs (430, 431): block, dodge and quickstep looping against both attacks, with frame strips.
  5. Quick steps used to be overpowered dodges (432): the outcome grid with and without quickstep i-frames.
  6. Which way to step (433): sidestep a thrust, backstep a sweep (A / S / D, Q for all).
  7. Read your opponent: a playable duel. A / D quickstep aside, S back, K block (hold), L roll, J counterattack. React mode shows the telegraph; Predict mode is too fast to react to. The opponent adapts to your habits. Your decision map fills in as you play (saved in this browser).
  8. The original Forsaken Spine mockups (Basic Strikes skeleton), with animation picker and speed.
  9. Every option has a counter.

- `pvp/bruiser-meta/`: **Unbalanced Meta: the Bruiser Meta** (League of Legends).
  1. Title
  2. Every class has a hole: class radar (health, damage, range, mobility, ease) against a shared power budget; the meta bruiser is over budget with no weak stat.
  3. Strong + easy = everywhere: strength and ease sliders drive win rate, pick share and 10 sample lobbies.
  4. Breaking the meta: toggle systems and content fixes (anti-heal, item nerfs, durability update, Mythic removal, class updates, targeted nerfs, counter champions) and watch pick share fall.
  5. Watch it happen: 12 YouTube clips (montages, explainers, Riot changes), click-to-play embeds.
  6. Takeaways and sources. All numbers are illustrative; the model lives at the top of `pvp/bruiser-meta/bruiser.js`.

- `pvp/elusives/`: **Unbalanced Meta: Elusives** (Legends of Runeterra).
  1. Title
  2. Try to stop the attacker: an Elusive 3|2 attacks; normal blockers bounce off, only an Elusive blocker or a spell works. Toggle Elusive off to see a plain wall stop it.
  3. The only counter is itself: a toy replicator model of a 20-week season; with no fix the field folds into Elusive + spell decks. Compare "weaker Elusive stats" and "answers in every region". Win rates are illustrative and live in `FIX` at the top of the meta demo in `pvp/elusives/elusives.js`.
  4. Design takeaways.

- `pvp/counter-cycles/`: **Counter Cycles** (high level meta, other expressions).
  1. Title
  2. RTS: rush, turtle, expand as a counter wheel. Hover an opening or an arrow to read what it beats and why; click a node to pin it.
  3. Fighting: attack, block, grab, the same triangle at the scale of a fraction of a second.
  4. MOBA: a five-role cycle, in one stage (the ring) or two (each role beats the next two).
  5. Why two stages?: the full matchup grid, so no matchup is even.
  6. Drill: counter-pick. The enemy picks; you pick what beats it.
  7. Same shape, three genres.

- `pvp/strike-trades/`: **Strike Trade Balance Techniques**, from the same deck, part 7, slides 265 to 272.
  1. Title: armor, super armor, immunity.
  2. Same hit, different answers: you wind up a heavy hammer swing while the monster attacks. Toggle your protection (1 to 4: none, armor, super armor, immunity) and the attack (jab, heavy, 3-hit flurry, throw) and watch damage, hit stun, knockback and whether your swing lands. The frame strip shows the protected window and every hit. Super armor breaks after 2 hits like Drive Impact; flip it to hyper armor. A table compares all four for the current attack.
  3. Who wins the trade?: the full protection by attack grid; click a cell to watch it.
  4. Which one would you give this move?: Forsaken Spine mockups with a pick-the-technique quiz, answered from the deck's "When to use" slides.
  5. Best applications.
  The rules (`SWING`, `ATK`, `MODES`, `CAP`, `resolve`) are at the top of `pvp/strike-trades/trades.js`.

- `pvp/payoffs/`: **Positioning Payoffs**, from the same deck, skill expression category 4, slides 299 to 304.
  1. Title: payoffs, the reward for a skilfully executed power.
  2. Positioning payoffs (299 to 302): PC and enemy 5 m either side of centre. Press → to step through neutral, the swing, their opening (301) and your follow-up (302). Swap your weapon (fists' uppercut, sword, Shocking Spear Thrust) and the same beats resolve differently: the uppercut whiffs into the enemy's pressure, the sword whiffs safely and gains little, the spear's 10 m pressure lands from neutral and stays out of reach. Drag your token to change the start distance, or have the enemy back off or step in.
  3. Perspective agnostic (303): the same exchange drawn side-on and top-down at once; play as the enemy to see the PC's opening become your payoff.
  4. Power breakdown (304): positioning, pressure and payoff for the selected weapon, with sliders that retune it (and every other slide).
  5. Same sequence, three weapons: the whole sequence re-run for each weapon in one table.
  The rules (`WEAPONS`, `ENEMY`, `plan`) are at the top of `pvp/payoffs/payoffs.js`. Spear numbers are the deck's; fist and sword payoffs are illustrative.

## Layout

- `index.html`: the course home. One section per module in module number order (M1 to M8), each listing that module's interactive pages in deck order with their part and slide range. Add a line here when you add a page to a module.
- Each module home groups its pages under the deck part they come from (`PARTS` in the data-driven homes, `<div class="part">` blocks in `pvp/` and `pve-interactions/`), in deck order.
- `assets/deck.js`, `deck.css`, `kit.js`, `kit.css`, `gi.js`: copied from `InteractiveFPF/assets`. Keep them in sync by hand if the engine changes there.
- `assets/img/forsaken/`: the token art from `MoonStudios/Forsaken/Design/Abilities/images`.
- `assets/spine/`: the Basic Strikes skeleton, the packed `forsaken` atlas, and `spine-data.js` (all three as data URIs, since browsers block `fetch` from `file://`).
- `assets/vendor/spine-player.min.js` / `.css`: `@esotericsoftware/spine-player` 4.3.13 (Spine Runtimes license, see `SPINE-LICENSE.txt`).
- `pvp/core-actions/core.js`: every demo. The rules live at the top (`ATK` hitboxes, `MOVES`, `inHitbox`, `outcome`), so the grids, the 433 diagram and the duel all agree. Tune reach, arc and step distances there.
- `tools/build_spine.py`: rebuilds `assets/spine/` from the Spine project.

## Rebuilding the Spine assets

```
"C:/Program Files/Spine/Spine.com" -i "C:/Projects/MoonStudios/Forsaken/Design/Abilities/AbilityMockups.spine" -o out/spine -e json
"C:/Program Files/Spine/Spine.com" -i "C:/Projects/MoonStudios/Forsaken/Design/Abilities/images" -o assets/spine -p forsaken
python tools/build_spine.py "out/spine/Basic Strikes.json"
```

## PvE Interactions module (`pve-interactions/`)

Its own home page is `pve-interactions/index.html`, from *MGM C4 M5 - Fundamentals for Designing Engaging PvE Interactions*.

- `hazards/`: the 14 hazard movement patterns (deck slides 186 to 199). Each pattern shows the slide's 3×3 grid, its arrow filling as the hazard moves, next to a top-down example from the slide's list. ← → switch patterns; `?p=N` opens one.
- `enemy-counters/`: the Start, Opposition, Goal slide (deck slide id g273797b7e36_0_683) as Mario's jump and fireball against a Koopa (both work), a Spiny (only fire) and a Buzzy Beetle (only jump): every matchup, a run to the flagpole with a plan, and an editable rules matrix that the other slides run on. Sprites are original pixel shapes drawn in `counters.js`. GIF: `gifs/enemy-counters-mario.gif` (slide 2's sequence: the deck diagram built as start, goal, opposition, decisions, then laid over the level while Mario tries, rewinds and switches verbs at each enemy), rebuilt with `node tools/record-enemy-counters-gif.js <frameDir>` while serving on :8141, then the ffmpeg line in that file.
- `enemy-composer/`: deck slides 42 and 45, compositional design. The slide's twelve Mario enemies as cards of movement, stomp result and fireball result (`CARDS` at the top of `composer.js`, verbatim from the slide); a composer that names the enemy, a reskin or a new enemy for any look plus rules, with a one-rule-at-a-time tour; the 48-card design space; and the Piranha Plant vs Lava Bubble timing comparison. Sprites are original pixel shapes.
- `resistance/`: deck slides 74 to 84. One corridor, five kinds of resistance from the deck's examples (DOOM, Elden Ring, Dark Souls, Halo, XCOM), a strength slider with the slide 83 threshold, and all five weak then strong. Routes are scripted in `plan()` in `resistance.js`.
- `escalation/`: deck slides 126 to 133 and 148. One sword enemy and its lesson; numeric sliders, contextual toggles (corridor, darkness, ledge) and a permutation (shield), with a readout of whether the play pattern or only the risk changed. Fights are scripted in `fight()` in `escalation.js`.
- `counters-wow/`: deck slide 96, World of Warcraft's mechanical counters (magic buff → dispel, curse → remove curse, poison → cleanse, spell bar → interrupt): the four rows animated, then a small raid encounter played with keys 1 to 4, a class picker for who brings which counter, and a demo player. `sim()` in `wow.js` replays a seeded schedule plus presses.
- `nintendo-model/`: deck slide 40 (Mario Enemies Comparison), three spikes: a four-beat ladder from the speaker notes (Goomba introduce, Koopa escalate, Red Koopa permutate, Spiny both), a drag-and-drop sort of the slide's enemies into the four steps with the course's reading, and the Koopa family tree (each branch is one changed rule). Sprites come from `shared/mario.js`, a copy of the composer's pixel sprites. GIFs: `gifs/nintendo-model-ladder.gif`, `gifs/koopa-family-tree.gif` (which `ladder` / `tree`).
- `gungeon-variants/`: Handcrafted Permutation: Enemy Variants (deck slide id g2e56547ebf8_0_1160), Enter the Gungeon. The slide's nineteen Gundead (Bullet Kin, Shotgun Kin and Sniper Shell families), each a scripted scene of its pattern against the Pilot beside its Ammonomicon card (health against the family base, what changed, what the player does now, numbers-only escalation or new-response permutation); a sort of the sixteen variants into escalation or permutation; and a matrix of the Veteran, Ashen and Mutant rules reused across bases. Data is `V` at the top of `gungeon.js` (health and behaviour from the Enter the Gungeon wiki), scenes are `SC`. Sprites and Ammonomicon art in `img/` are the game's own, from the wiki. GIF: `gifs/gungeon-enemy-variants.gif` (1920×1080, all nineteen, about 65 s), rebuilt with `GIF_COLORS=160 node composition/tools/record-slide-gif.js <url>/pve-interactions/gungeon-variants/index.html#2 tour pve-interactions/gifs/gungeon-enemy-variants.gif 12`.
- `shared/topdown.js`: the top-down drawing kit (floor, walls, player disc, enemies, telegraphs, timed paths) used by resistance and escalation.
- Slide GIFs for those three: `gifs/compositional-design-cards.gif`, `gifs/enemy-composer.gif`, `gifs/same-card-different-feel.gif`, `gifs/resistance-strong-enough.gif`, `gifs/escalation-numbers-vs-context.gif`, `gifs/wow-mechanical-counters.gif`. Rebuild while serving InteractiveMGM locally with `node pve-interactions/tools/record-slide-gif.js <page url#slide> <which> <out.gif> [fps] [selectors to hide]` (usage in the file).
- `PROPOSALS.md`: further slides in the deck that could use an interactive or GIF, by section.
- `gifs/`: one 1280×720 looping GIF per slide (`p01-across.gif` … `p14-crushing.gif`). Rebuild with `node pve-interactions/tools/record.js [pattern numbers]` (Edge + ffmpeg). Scenes are pure functions of time in `hazards/hazards.js`.
- Themed meta-GIFs: `gifs/pNN-name-themes.gif` cycles three themed examples per pattern (the original plus two more from each slide's list, same timing, new art and setting). `hazards/index.html` plays the themed cycle live (`?single` for one theme), and `hazards/gallery.html` lists every GIF; rebuild with `node pve-interactions/tools/record.js --themes`.

## Mechanics Design Tools module (`mechanics-tools/`)

Home page `mechanics-tools/index.html` (cards from `PAGES` + `READY`, extra GIFs in `EXTRA`), from *MGM C4 M3 - Mechanics Design Optimizations and Tools*. Each page has a walk-through that the `window.__seek` / `__dur` hooks replay deterministically.

- `doors/`: switch, pressure plate and pulley (deck slides 79-94), plus binary, discrete and continuous (89-91). Model in `step()` at the top of `doors.js`.
- `contrapositive/`: melee vs ranged safe room against a monster with shot lanes (132-134). `room()` counts the area.
- `contrapositive-rules/`: replaces the burning / chillable pair (135-136, 139-140 in the editor). Mario's stomp with real Super Mario Bros. sprites, where a rule and its contrapositive both hold, and League of Legends brush (Ashe and Pyke), where both break together, on purpose. Timings in `E` and the `BREAK` constants in `rules.js`.
- `inversion/`: danger zone, safe rune and shrinking ring with ten raiders (110-113). `MODES` and `targetOf()`.
- `reverse-map/`: the slide 116 map example, forward vs backward, with the WoW grind/level/raid strip (115-119). Slides 2-4 are alternate takes on the same idea: a Pokémon gym planned from Misty back (`rv-pokemon.js`), a card turn built from the finisher with WoW spell icons (`rv-cards.js`) and a Super Mario World climb placed from the Dragon Coin down (`rv-mario.js`). Sprites and art are in `reverse-map/img/`.
- `diminishing/`: stun per rank as linear, diminishing or capped (the deck's illustrative Xerath curve; live Xerath scales by distance, up to 2.25 s) beside Elden Ring's real Vigor HP (183-186).
- `life-per-hit/`: 6% lifesteal vs 12 life per hit as damage rises, the Diablo III beta story (177-180). Numbers are illustrative.
- `shared/`: `mech.css` layout and a copy of the top-down kit.
- GIFs in `gifs/`: rebuild with `node mechanics-tools/tools/record-slide-gif.js <page url#slide> <which> <out.gif> [fps] [selectors to hide]` while serving InteractiveMGM locally.
- `PROPOSALS.md`: the rest of the deck's interactive and GIF ideas, by section.

## Understand Mechanics module (`understand-mechanics/`)

Home page `understand-mechanics/index.html` (cards from `PAGES` + `READY`, extra GIFs in `EXTRA`), from *MGM C4 M2 - Understand, Analyze and Plan Mechanics*. Each page has a walk-through that the `window.__seek` / `__dur` hooks replay deterministically.

- `xray/`: the Universal Mechanics Description Framework as a stepper: a candle (deck slides 20-25), Mario 3 (27-33), a rusted one-time switch (49-54) and flammable grass (99-100). Each scene is `nodes` + `rules` + `tour` in `xray.js`; buttons become actions and `XR.script` turns them into signal hops.
- `guarded-door/`: key, lockpick and hammer on a door, a chest and an enemy, plus the notes' security guard (58-63); the narrow/broad x shallow/versatile tool matrix with a cost meter and the 80/20 split (73-74, 83-90). Rules in `WORKS`, `GUARD`, `KIT`.
- `cast-timeline/`: time as a resource, Fireball vs Shadow Bolt + Life Tap and the Burning Crusade +30% (225-245), the rotation repeating forever (246), the token redesign (246-254) and the boss weakness window (255-256). Token cast time (1.5 s) and window length (5 s) are chosen so the notes' "3 casts instead of 2" always holds.
- `resource-pool/`: generators, spenders and capacity over 30 seconds with slide 257's x2 / x½ extremes (198-213, 257), discrete vs continuous spending (215-216), and resources & states: a full energy bar sets Link on fire (219). Numbers are illustrative: `R` in `pool.js`.
- `grass/`: mechanic or aesthetic, cutting grass that hides things or doesn't (18).
- `type-weakness/`: the slide 107 X-ray, 5 damage with a type context, x2 or x1 (104-107).
- `life-tap/`: the same warlock rotation solo and in a raid (226-228).
- `life-tap-trade/`: the two Life Tap slides as drawn, before | the trade | after, animated (230 solo, 231 raid). Solo adds a boss hit (slider) to show what the lost 40 HP costs; raid adds the priest's Flash Heal, THX, BRO~ and LOL!. Scenes are `solo(t)` and `raid(t)` in `trade.js`; GIFs `life-tap-solo-risky` and `life-tap-raid-free` (`__seek(t, 'solo' | 'raid')`).
- `chaotic-energy/`: Destruction Warlock & Chaotic Energy (224, 256), Mists of Pandaria patch 5.4.8. The auto rotation (SimulationCraft's priority list) on a cast timeline with the Burning Ember bar, damage per hit and damage vs casting-time shares, with pooling for Dark Soul, breaks, Havoc and Shadowburn; a play-it-yourself slide (keys 1-6) against a training dummy; and the numbers. `R` at the top of `destro.js` holds every number; `chaotic-energy/SOURCES.md` lists where each comes from (SimC release-548-8 spell data and Wowhead MoP tooltips).
- `shared/`: `um.css` layout, a copy of the top-down kit, and `xray.js`, the X-ray diagram renderer (boxes coloured by framework part, timed signal hops, bounces for refused signals).
- GIFs in `gifs/`: rebuild them all with `sh understand-mechanics/tools/record-all.sh` while serving InteractiveMGM on 127.0.0.1:8171.
- `PROPOSALS.md`: the rest of the deck's interactive and GIF ideas, by section.

## Depth module (`depth/`)

Home page `depth/index.html` (cards from `PAGES` + `READY`, extra GIFs in `EXTRA`), from *MGM C4 M1 - The Goal of Mechanics Design - Depth*. Slide numbers are the deck's `/htmlpresent` numbers. Each page has a walk-through that the `window.__seek` / `__dur` hooks replay deterministically.

- `three-tiers/`: Dark Souls III vs Bloodborne as nested circles drawn to scale (deck slides 56-68, 122-125). Every tile is a real weapon from `data.js`, drawn with its in-game inventory icon (sprite sheets in `three-tiers/icons/`, sources in `icons/sources.json`): Dark Souls III's 206 weapons across 21 classes (base game and both DLCs) and Bloodborne's 26 trick weapons (base game and The Old Hunters), from the Fextralife wikis. Dark Souls III weapons collapse to one moveset per class; Bloodborne's don't collapse. The relevant tier is the deck's estimate, with a slider, since neither game publishes usage data. A toggle shows the deck's own napkin numbers.
- `sword-forge/`: three slides. Locked vs unlocked levels and hits to kill (164-171); slide 172's swords against a horde, a brute and both (`SWORDS`, `FIGHTS`, `fight()` in `forge.js`); slide 179's five variables on a radar, one at a time (173-182).
- `additive/`: Breath of the Wild's additive swords (base damage from the game) beside its multiplicative chemistry systems (111-115). Reactions in `REACT` are a simplified slice of the chemistry engine.
- `go-board/`: 9×9, 19×19 and 31×31 with the edge zone shaded (93). `share(n, d)` is the whole model.
- `ghost-runs/`: 60 seeded attempts at one level played back at once, then filtered to distinct routes and to routes that reach the flag (77-78). Level and runner in `level.js`.
- `mtg-keywords/`: two 2/2 creatures and the slide's keywords plus Reach (193-194). Combat rules in `rules.js`.
- `shared/`: `depth.css` layout and a copy of the top-down kit.
- GIFs in `gifs/`: rebuild them all with `sh depth/tools/record-all.sh` while serving InteractiveMGM on 127.0.0.1:8171.
- `PROPOSALS.md`: the rest of the deck's interactive and GIF ideas, by section.

## Composition module (`composition/`)

Home page `composition/index.html` (cards from `PAGES`, GIFs from `GIFS`), from *MGM C4 M7 - Techniques to Scale Engaging Gameplay Design* (275 slides). Slide numbers are the deck's `/edit#slide=N` numbers. `PROPOSALS.md` lists the fifty visuals planned for the deck.

Every slide is a `CK.scene` (`shared/comp.js`): a canvas drawn as a pure function of time and the slide's state, a walk-through that loops, and controls in the side panel. `window.__seek(t, which)` / `__dur(which)` reach any scene, so the recorder replays it frame by frame.

- `why-scale/`: two views of one bestiary (slides 6-7): twelve Super Mario Bros. enemies flip to their movement, stomp and fireball parts, with how often each part is reused.
- `decompose/`: one element, four targets (slides 37, 40, 73): the Super Star as Self → Self, then fire, frost and heal across Self, Enemy, Ally and Environment with World of Warcraft spell icons; empty cells are design prompts.
- `three-dials/`: three dials (56-65): `abilities.js` files twelve real abilities by purpose, payload and packaging; turning one dial keeps the other two.
- `ability-forge/`: `forge-data.js` holds the deck's problems, keywords, themes and the world's keyword rules. The forge (77-104) builds and tests an ability against the Flame Demon and Lightning Mage; keyword reach (104-105) counts the interactions a new ability gets for free.
- `archetypes/`: `arch.js` holds the Souls archetypes as small top-down loops (Flailer, Fighter, Brute, Sweeper, Defender, Evader, Rampager, Zone Healer). The composer (155-173) runs up to three on one body; the gallery (158-168) and paladin or turtle (170-173) run on it too.
- `systems/`: the Doom Eternal encounter swapper (202-214): map slots by role, rerolled rosters.
- `counter-circle/`: strip the packaging (238-240): attack, throw and block become Offense, Prediction and Defense. The nine fundamentals (242-255): explore each cell, audit a moveset for gaps, or place a move.
- `shared/`: `comp.css` layout, `comp.js` scene engine and drawing helpers, a copy of the top-down kit, `icons.js` (game-icons.net, rebuilt by `tools/build-icons.py` from `tools/icon-names.txt`) and `img/`: Super Mario Bros. sprites cropped from the NES sheets on mariouniverse.com, and World of Warcraft spell icons from wow.zamimg.com.
- GIFs in `gifs/`: rebuild with `sh composition/tools/record-all.sh [names]` while serving InteractiveMGM on 127.0.0.1:8181. They are 1920×1080 with the side panel hidden.
