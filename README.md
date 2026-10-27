# Mastering Game Mechanics: interactive visuals

Slides from the *Mastering Game Mechanics* course rebuilt as interactive web slides. Same engine and keys as `../InteractiveFPF`.

Open `index.html` in a browser (no build step, works straight off disk). It lists the course modules, each with its own home page:

- `pvp/`: **PvP Interactions** (`pvp/index.html`), from *MGM C4 M4 - Fundamentals for Designing Engaging PvP Interactions*.
- `pve-interactions/`: **PvE Interactions** (`pve-interactions/index.html`), from *MGM C4 M5 - Fundamentals for Designing Engaging PvE Interactions*.

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

- `index.html`: the course home, one card per module.
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
- `shared/topdown.js`: the top-down drawing kit (floor, walls, player disc, enemies, telegraphs, timed paths) used by resistance and escalation.
- Slide GIFs for those three: `gifs/enemy-composer.gif`, `gifs/same-card-different-feel.gif`, `gifs/resistance-strong-enough.gif`, `gifs/escalation-numbers-vs-context.gif`, `gifs/wow-mechanical-counters.gif`. Rebuild while serving InteractiveMGM locally with `node pve-interactions/tools/record-slide-gif.js <page url#slide> <which> <out.gif> [fps] [selectors to hide]` (usage in the file).
- `PROPOSALS.md`: further slides in the deck that could use an interactive or GIF, by section.
- `gifs/`: one 1280×720 looping GIF per slide (`p01-across.gif` … `p14-crushing.gif`). Rebuild with `node pve-interactions/tools/record.js [pattern numbers]` (Edge + ffmpeg). Scenes are pure functions of time in `hazards/hazards.js`.
- Themed meta-GIFs: `gifs/pNN-name-themes.gif` cycles three themed examples per pattern (the original plus two more from each slide's list, same timing, new art and setting). `hazards/index.html?themes` plays them live; rebuild with `node pve-interactions/tools/record.js --themes`.
