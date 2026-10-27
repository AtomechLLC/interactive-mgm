# Mastering Game Mechanics: interactive visuals

Slides from the *Mastering Game Mechanics* course rebuilt as interactive web slides. Same engine and keys as `../InteractiveFPF`.

Open `index.html` in a browser (no build step, works straight off disk).

| Key | Action |
| --- | --- |
| `←` `→` / `Space` | previous / next (Space also reveals step-by-step items) |
| `N` | speaker notes |
| `O` | overview of all slides |
| `F` | fullscreen |

## Decks

- `core-actions/`: **Core Gameplay Actions**, from *MGM C4 M4 - Fundamentals for Designing Engaging PvP Interactions*, deck slides 428 to 434.
  1. Title
  2. The anatomy of an attack (428): anticipation, slash and recovery frames, the human reaction window and online latency. Press K to block.
  3. Offensive verbs (429): drag your token around a sweep and a thrust side by side.
  4. Defensive verbs (430, 431): block, dodge and quickstep looping against both attacks, with frame strips.
  5. Quick steps used to be overpowered dodges (432): the outcome grid with and without quickstep i-frames.
  6. Which way to step (433): sidestep a thrust, backstep a sweep (A / S / D, Q for all).
  7. Read your opponent: a playable duel. A / D quickstep aside, S back, K block (hold), L roll, J counterattack. React mode shows the telegraph; Predict mode is too fast to react to. The opponent adapts to your habits. Your decision map fills in as you play (saved in this browser).
  8. The original Forsaken Spine mockups (Basic Strikes skeleton), with animation picker and speed.
  9. Every option has a counter.

- `bruiser-meta/`: **Unbalanced Meta: the Bruiser Meta** (League of Legends).
  1. Title
  2. Every class has a hole: class radar (health, damage, range, mobility, ease) against a shared power budget; the meta bruiser is over budget with no weak stat.
  3. Strong + easy = everywhere: strength and ease sliders drive win rate, pick share and 10 sample lobbies.
  4. Breaking the meta: toggle systems and content fixes (anti-heal, item nerfs, durability update, Mythic removal, class updates, targeted nerfs, counter champions) and watch pick share fall.
  5. Watch it happen: 12 YouTube clips (montages, explainers, Riot changes), click-to-play embeds.
  6. Takeaways and sources. All numbers are illustrative; the model lives at the top of `bruiser.js`.

- `elusives/`: **Unbalanced Meta: Elusives** (Legends of Runeterra).
  1. Title
  2. Try to stop the attacker: an Elusive 3|2 attacks; normal blockers bounce off, only an Elusive blocker or a spell works. Toggle Elusive off to see a plain wall stop it.
  3. The only counter is itself: a toy replicator model of a 20-week season; with no fix the field folds into Elusive + spell decks. Compare "weaker Elusive stats" and "answers in every region". Win rates are illustrative and live in `FIX` at the top of the meta demo in `elusives.js`.
  4. Design takeaways.

- `strike-trades/`: **Strike Trade Balance Techniques**, from the same deck, part 7, slides 265 to 272.
  1. Title: armor, super armor, immunity.
  2. Same hit, different answers: you wind up a heavy hammer swing while the monster attacks. Toggle your protection (1 to 4: none, armor, super armor, immunity) and the attack (jab, heavy, 3-hit flurry, throw) and watch damage, hit stun, knockback and whether your swing lands. The frame strip shows the protected window and every hit. Super armor breaks after 2 hits like Drive Impact; flip it to hyper armor. A table compares all four for the current attack.
  3. Who wins the trade?: the full protection by attack grid; click a cell to watch it.
  4. Which one would you give this move?: Forsaken Spine mockups with a pick-the-technique quiz, answered from the deck's "When to use" slides.
  5. Best applications.
  The rules (`SWING`, `ATK`, `MODES`, `CAP`, `resolve`) are at the top of `strike-trades/trades.js`.

## Layout

- `assets/deck.js`, `deck.css`, `kit.js`, `kit.css`, `gi.js`: copied from `InteractiveFPF/assets`. Keep them in sync by hand if the engine changes there.
- `assets/img/forsaken/`: the token art from `MoonStudios/Forsaken/Design/Abilities/images`.
- `assets/spine/`: the Basic Strikes skeleton, the packed `forsaken` atlas, and `spine-data.js` (all three as data URIs, since browsers block `fetch` from `file://`).
- `assets/vendor/spine-player.min.js` / `.css`: `@esotericsoftware/spine-player` 4.3.13 (Spine Runtimes license, see `SPINE-LICENSE.txt`).
- `core-actions/core.js`: every demo. The rules live at the top (`ATK` hitboxes, `MOVES`, `inHitbox`, `outcome`), so the grids, the 433 diagram and the duel all agree. Tune reach, arc and step distances there.
- `tools/build_spine.py`: rebuilds `assets/spine/` from the Spine project.

## Rebuilding the Spine assets

```
"C:/Program Files/Spine/Spine.com" -i "C:/Projects/MoonStudios/Forsaken/Design/Abilities/AbilityMockups.spine" -o out/spine -e json
"C:/Program Files/Spine/Spine.com" -i "C:/Projects/MoonStudios/Forsaken/Design/Abilities/images" -o assets/spine -p forsaken
python tools/build_spine.py "out/spine/Basic Strikes.json"
```
