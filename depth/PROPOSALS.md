# The Goal of Mechanics Design: Depth: interactive and GIF proposals

Source: "MGM C4 M1 - The Goal of Mechanics Design - Depth" (Drive 1PA2gQrD1XzZBvGOLVJdaGsrVnwwLUpebCRGspJ8GpTM, 200 slides). First pass 2026-10-28 from the Drive text export (slide text and speaker notes); re-numbered the same day after the deck was made public. Slide numbers below are the `/htmlpresent` `Slide N` numbers. Quotes marked "notes" come from the speaker notes.

Built so far (see `depth/index.html`): the three tiers funnel as `three-tiers/` (rebuilt with counted Dark Souls III and Bloodborne weapons), the sword forge as `sword-forge/`, additive vs multiplicative as `additive/`, and the three quick wins as `go-board/`, `ghost-runs/` and `mtg-keywords/`.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Tic-Tac-Toe symmetry lens: apparent, distinct and relevant moves | 44-55, 69-72 | M |
| 2 | Three tiers funnel: weapon arsenals filtered to relevant depth | 56-68, 82, 122-129 | M |
| 3 | RPS-101 vs Pokémon: symmetric vs asymmetric matchup wheels | 100-106, 161 | M |
| 4 | Additive vs multiplicative: adding a weapon vs adding an element | 111-115 | M |
| 5 | Sword forge: proportion, then orthogonality | 164-182 | M |

Quick wins worth doing early even though they are not top 5:
- **Go board size** (slide 93). One toggle between 9x9, 19x19 and 31x31 with the edge zone shaded. The share of points within three lines of an edge falls from 89% to 53% to 35%, which is exactly the notes' point: bigger boards add positions, but the middle becomes self-similar.
- **Ghost runs** (slides 77-78). One GIF of 60 ghost runs through a small original platformer level, then filtered: every path (possibility space), distinct routes (differentiated), routes that reach the exit (relevant). Replaces describing Super Meat Boy's death replay and Trackmania ghosts in words.
- **MTG keyword combat** (slides 193-194). Two 2/2 creatures, a toggle row of the slide's nine keywords on each side, and the combat result. Same stats, different fights.

---

## Part 2: What is depth? (slides 22-38)

**Dredge ship sounding** (slides 28-30), effort **S**, GIF
- Teaches: notes: design is "like a Dredge ship out on a pitch black sea" that can only test the depth under it, and can get stuck in a local minimum; understanding depth lets you "see which way the ground curves".
- The slides repeat the same attempt labels (20m, 30m, 40m, 100m Jackpot) across three slides; the metaphor is motion.
- Proposal: a ship drops soundings on a dark sea (20m, 30m, 40m), then settles in a local dip. Second pass: the seabed contour fades in faintly and the ship heads straight for the 100m trench. Two short loops in one GIF.

**Train tracks vs runway** (slides 32-36), effort **S**, GIF
- Teaches: notes: depth is "the difference between frantically building a railroad track of content to keep your players going, versus building a runway for your players to take off and fly."
- Proposal: left, a train that halts at the end of the track until a worker lays one more segment (content); right, a plane that takes off from one short runway and flies in many directions. Label the panels "Many generic options" and "Only meaningful options", matching the slide, without check or cross marks.

## Part 3: Gameplay Depth Analysis Framework (slides 43-82)

**Tic-Tac-Toe symmetry lens** (slides 44-55, then the tier recap on 69-72), effort **M**, **TOP 5**
- Teaches: the first move shows 9 options but only 3 are distinct (corner, side, middle; the rest are rotations or mirrors). After X takes a corner, O sees 8 options but 5 distinct ones, so fewer discrete options can still mean more meaningful ones, because the X broke symmetry (notes on 49). Slides 69-71 then run the first move through the tiers: 9 possible, 3 differentiated, 1 relevant (the corner).
- Hard as text: the slides reveal the five groups one at a time across eleven slides. A learner never gets to test their own guess, and the symmetry argument is easier to see than to read.
- Proposal: a playable board. Each empty cell is tinted by its symmetry class (computed from the board's remaining rotations and mirrors), and a readout shows "apparent options 8, distinct options 5". A "guess first" mode hides the tints and asks the learner to name the count, as the notes do ("wait like it's Dora the Explorer"). A third layer runs perfect play and marks which replies still hold the draw, so the three tiers are three overlays on one board.
- Accuracy note: slide 72 says "any deviation will guarantee a loss". Under perfect play all three first moves draw; the corner is the strongest opening because it leaves O only one drawing reply (the center) out of 8. The interactive can show this honestly, which supports the slide's point rather than contradicting it, but the wording on 72 may want "deviations give the opponent more ways to survive" or a scope like "for the second player".

**Three tiers funnel** (slides 56-68 for the model, 82 and 122-129 for the weapon numbers), effort **M**, **TOP 5**
- Teaches: Total Possibility Space contains Differentiated Depth, which contains Relevant Depth; each limits the next (slide 57: "Limits"). Slide 65 shows four shapes: Bloated and Wasteful, Limited Potential, Failure to Balance, Masterpiece. Part 4 then gives napkin numbers (notes on 123: "focus more on the ratios"): Dark Souls III 120 weapons / 18 types / 10 useful / 5 competitive, Bloodborne 26 / 18 / 8 / 4, Breath of the Wild 122 / 18 / 3 / 1, Nioh 194 / 30 / 7 / 6.
- Hard as text: the deck states the numbers but never lets learners feel the filter. The circles are also drawn the same size from slide to slide, so the ratios are not visible.
- Proposal, part one: nested circles drawn to scale, with a game picker for the four arsenals so the ratios become shapes side by side. Part two: a small made-up arsenal of weapon cards. Merge cards that share a moveset and they fold into one type (the red to orange filter); mark one type as dominant and the others drop out of the yellow circle (orange to yellow); rebalance and they come back. The four slide 65 shapes are presets. Every tier label uses the deck's terms, not value words.

**Ghost runs** (slides 77-78), effort **S**, quick win
- Teaches: notes: possibility space is every path that can be taken, differentiated depth every unique path, relevant depth every path a player actually takes that reaches the end.
- Proposal: an original-art platformer level with scripted ghost runs drawn as trails; three toggles filter them by tier.

**Nuance and interaction** (slides 79-80), effort **S**
- Teaches: outcomes (nuance: one mechanic has a range of results, like a held jump) and interaction (combinatorics: mechanics combine).
- Proposal: a jump with a hold slider draws a fan of arcs (nuance), then add a spring and a moving platform and the fan multiplies into branches (interaction). A counter shows outcomes added vs outcomes multiplied. Could share code with the ghost runs.

## Part 4: How Depth Impacts Elegance (slides 85-133)

**Elegance ratio meter** (slides 89-94), effort **S**, could be a strip on the Tic-Tac-Toe and funnel pages
- Teaches: Elegance = Depth / Complexity, where complexity is the number of apparent discrete options (notes on 92: "the total number of meaningful options, divided by the number of apparent discrete options").
- Proposal: a meter that reads live from the other interactives: 3/9 on the Tic-Tac-Toe first move, 5/120 for Dark Souls III, and so on.

**Go board size** (slide 93), effort **S**, quick win
- Teaches: notes: bigger boards are not automatically deeper. "As boards get bigger, the game gets more self-similar", and without the edge pressing in, "the middle of the board plays out in a more repetitive way".
- Proposal: board size toggle with the third-line edge zone shaded and the share printed (9x9: 72 of 81 points, 89%; 19x19: 192 of 361, 53%; 31x31: 336 of 961, 35%). The slide's "(Probably not…)" becomes a visible trend.

**RPS-101 vs Pokémon** (slides 100-106, reused on 161), effort **M**, **TOP 5**
- Teaches: RPS-101 has 101 options and 5,050 outcomes, yet every option beats exactly 50 and loses to exactly 50, so "you can pick literally any 3 options on this chart, play with just those, and have the same game as regular rock paper scissors" (notes on 161). Pokémon uses the same system but gives types different numbers of strengths and weaknesses, plus dual types and the 50% same-type bonus (notes on 104).
- Hard as text: the slide shows the RPS-101 chart as an image nobody can read, and the symmetry claim is something learners have to take on faith.
- Proposal: two matchup wheels side by side. Left: RPS-N with a slider from 3 to 101; every node shows the same "beats / loses to" count, and a "pick any 3" button highlights a random triangle that is plain rock paper scissors. Right: the 18 Pokémon types with their real chart; nodes show different counts, and picking a type lights its strengths, weaknesses and immunities. A readout counts distinct matchup profiles: 1 on the left at any N, many on the right. Real type icons are fine for class use.

**Melee tier list shift** (slides 107-110), effort **S**, GIF
- Teaches: differentiated depth is not relevant depth, and relevant depth moves over time. Notes on 110: Yoshi rose from 21st to 10th after aMSa's results.
- Proposal: an animated tier list moving from the older list to the newer one, Yoshi highlighted, while the yellow circle grows. Check both tier lists against the slide images before building. The notes' own TODO (108: "put the low tiers in orange, not red") can be applied here.

**Additive vs multiplicative** (slides 111-115), effort **M**, **TOP 5**
- Teaches: notes: "Are you adding completely interchangeable content with slight tweaks, or are you creating unique interactions across a system of asymmetries?" Breath of the Wild's weapons are additive; its Sheikah Slate powers and chemistry engine (fire, wind, electricity against wood, sails, metal) are multiplicative.
- Hard as text: "multiplicative" is a growth curve, and the slides show it as two static icons.
- Proposal: a grid of elements (rows) by materials (columns), each cell a small reaction (fire on wood burns, electricity on metal conducts, wind on a sail pushes). An "Add weapon" button adds one row of near-identical cells that react the same way; an "Add element" or "Add material" button adds a whole row or column of new reactions. A chart under the grid plots distinct interactions against things built, giving one flat line and one climbing line. Optional toggle for the slide 113 comparison: Devil May Cry 3's few weapons with many moves.

**MTG removal and counterspell fan** (slides 118-121), effort **S**
- Teaches: functional reprints vs distinct cards vs played cards, in Magic's terms. Notes on 118: some destroy-creature spells hit only some creatures; the best hit many or all at a low cost.
- Proposal: a fan of removal cards sorted onto a cost by coverage chart; functional reprints stack on the same point, and the top-left frontier lights up as the playable set. Could reuse the funnel's drawing code.

## Part 5: Gameplay Elegance Optimization Cycle (slides 135-152)

**The No Rest for the Wicked cycle** (slides 142-150), effort **S**, GIF
- Teaches: the three phases (make unique elements, give each variability, balance), repeated. Notes walk the real example: one sword; then a greathammer (slow, melee) and a bow (fast, ranged) because they were strongly differentiated from the sword; tested against melee enemies, ranged enemies and a boss; balanced; then more types (spear, staff, greatsword, wand); then sword variants (three sweeps vs sweep, thrust, sweep); then PvP and PvE with all variants.
- Proposal: a looping cycle diagram with the arsenal growing in the middle, one ring per pass, and a small arena that flashes each test. Useful as the module's closing visual for Part 5.

## Part 6: How to Functionally Differentiate (slides 154-194)

**Break symmetry** (slides 162-163), effort **S**, GIF
- Teaches: notes: two characters in an empty void have only distance between them; adding walls, obstacles, projectiles or more characters creates more distinct situations.
- Proposal: a top-down arena (reuse `pve-interactions/shared/topdown.js`) with two duelists. Empty: every position is the same position rotated. Add a pillar, then a second enemy, and a counter of distinct spacing situations climbs.

**Sword forge: proportion, then orthogonality** (slides 164-182), effort **M**, **TOP 5**
- Teaches: proportional scaling changes nothing (notes on 171: "3 hits to kill is still 3 hits to kill, no matter how big the damage numbers"). Disproportionate scaling creates tradeoffs: slide 172's swords are Power 5 / Durability 50 (250 lifetime damage, 10 hits on a 50 HP enemy), 15 / 27 (405, 4 hits), 48 / 14 (672, 2 hits). Orthogonality is disproportionate scaling across many variables (slide 179 adds Price 10g / 100g / 500g, Speed 50 / 10 / 80, Range 3ft / 6ft / 5ft), and it is limited by how many variables exist (181: only Hurt and Heal; 182: hitbox shape, timing, armor, knockback and so on).
- Hard as text: the A and B circles on 165-170 are abstract (the notes say "follow along carefully"), and the swords' tradeoff only shows up when you fight several enemies in a row.
- Proposal, slide one: a hero level slider and an enemy level slider, locked together or unlocked; damage numbers grow but the hits-to-kill readout only changes when they are unlocked. Slide two: the three swords run the same gauntlet (a stream of 10 HP enemies, then a 50 HP brute) and the page shows which sword breaks first, which kills fastest, and which deals the most total damage, so no sword is best everywhere. Slide three: add the slide 179 variables one at a time; each sword's profile on a radar chart pulls apart. Start the radar with only Hurt and Heal (slide 181) and the six skills collapse onto one line.

**Fighting-game attack set** (slides 191-192), effort **S** to **M**
- Teaches: six attacks (invincible uppercut, slide into knockdown, divekick, boomerang, command grab, slow heavy pressure) each differ in range, hurtbox, active and recovery frames, damage and advantage.
- Proposal: frame strips for the six moves side by side with their hitboxes. Could reuse `pvp/core-actions` frame drawing and the Forsaken Spine mockups where a move fits.

**Platformer enemy movement** (slides 189-190), effort **S**
- Orthogonality as movement patterns. Overlaps `pve-interactions/hazards` and `nintendo-model`; link to those rather than build new.

**MTG keyword combat** (slides 193-194), effort **S**, quick win
- Teaches: notes: with only Power and Toughness, "you can't have significant differences of proportion, you can't have orthogonality"; keywords make two creatures with the same stats fight differently.
- Proposal: two 2/2 creatures and a keyword toggle row for each (the slide's nine). Resolve one combat and show who dies, who taps, and damage to the player. Menace and Flying need a second blocker option. GIF of a few combinations.

**Pokémon moves, reused assets, Cosmic Star Heroine** (slides 184-188)
- Lower priority. The Pokémon move part can be a tab on the RPS-101 vs Pokémon page. Cosmic Star Heroine's turn order (speed sets how often a character appears, Hyper Points on set turns) could be a small timeline later.

## Small fixes spotted while reading

- Slide 113 title reads "Something & DMC 3"; the slide compares Breath of the Wild with Devil May Cry 3.
- Slides 100-103 and 104-105 use "Poor Example" and "Better Example"; slides 32-36 use "✗ Depth" and "✔ Depth"; slides 58 and 64 say "Tight, simple, 100% efficient design is good…". Precise alternatives: "Low elegance" and "High elegance", "Many generic options" and "Only meaningful options" without marks, "Tight, simple, 100% efficient design is ideal…".
- Slide 72, "Any deviation will guarantee a loss": see the accuracy note under the Tic-Tac-Toe proposal.
- Slide 136's notes say "four key factors" (complexity, differentiation, proportion, elegance) while the slide shows three phases.
- Slide 144's notes say "the great hammer (or was it greatsword)"; the slide says Greathammer.
- Slide 41's notes have Alex saying "Celia will show you a framework that I use", which reads oddly; probably "that she uses".
- Slide 108's notes carry a TODO to colour the low tiers orange instead of red.
- Slide 1 is marked "INTERNAL ONLY".
