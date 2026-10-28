# Mechanics Design Optimizations and Tools: interactive and GIF proposals

Source: "MGM C4 M3 - Mechanics Design Optimizations and Tools" (Drive 1xojrjF3yYHfewXjAWGp8WvCXilzMuEqYtmIAxtxY9rQ, 193 slides, read 2026-10-27 via `/htmlpresent`). This deck is not public, so `/htmlpresent` needs a signed-in browser (Xelnath's Chrome works; the built-in browser pane is not signed in). Slide numbers below are the `/htmlpresent` order, which should match `/edit#slide=N`. Unlike the co-op deck, speaker notes here are real notes (`aside.slide-notes`), and 166 of 193 slides have them.

Nothing is built for this deck yet.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Switch, pressure plate, pulley: what the door is really checking | 79-94 | M |
| 2 | Feedback loop sandbox: snowball, then tame it | 155-188 | M |
| 3 | Tension rope: sword vs bow against an enemy mix | 30-34, 43-46 | M |
| 4 | Contrapositive arena: where can melee and ranged stand? | 132-134 | S-M |
| 5 | Inversion: danger zone vs safe rune | 110-113 | S |

Quick wins worth doing early even though they are not top 5:
- **Xerath stun diminishing returns** (slides 184-185). The notes literally say "change chart to match actual stun values", so the slide is waiting on a real chart. One small linear vs diminishing chart with the current live values (check the League wiki before drawing) fixes a known gap.
- **Reverse sequencing map** (slide 116). The slide body is the placeholder "MAP EXAMPLE HERE". A single GIF of a dungeon map solved forward (start → key → door → goal) and then planned backward (goal ← door ← key ← start) fills it.
- **Lifesteal vs life per hit** (slide 180). The Diablo III beta story (immortal Barbarians) is told in the notes only. Two HP bars under a stream of hits, % lifesteal vs a flat amount, as damage scales up, shows why the change worked.

---

## Part 1: 4 ways to optimize a mechanic's relevant depth (slides 4-16)

**Relevant depth circles** (slide 5), effort **S**, low priority
- Teaches: total possibility space (complexity) contains differentiated depth, which contains relevant depth, the range of things players judge worthwhile.
- Hard as text: three nested circles with names; novices don't see what moves an option from one ring to the next.
- Proposal: a cloud of option dots. Toggles "is it different from another option?" and "would a player ever pick it?" sort each dot into its ring. Later parts (niche, tension, anti-patterns) can reuse it to show dots falling out of the relevant ring.

**Versatility: one verb, many uses** (slides 8-9), effort **S**
- Teaches: Miyamoto's heuristic. Before adding a mechanic, see if an existing one can do the job (Yoshi's egg throw hits switches instead of a new interact button). Slide 9 lists nine uses of a single mechanic (avoid, stomp, bounce off enemies, propel yourself, reset jumps, wall boost...).
- Hard as text: a list of nine uses reads as nine mechanics.
- Proposal: an original platformer character with one verb (say, a bounce). A GIF cycles through the slide's uses in one small level, with a counter "1 mechanic, N uses". An optional toggle "add a new button for each" shows the controller filling up with buttons for the same result.

**Niche and overlap** (slides 10-11), effort **S-M**
- Teaches: overlap is fine when there are trade-offs. Under Night's laser (instant, full screen, knockdown) vs fireball (controls space, combo starter). Counter-examples in the notes: SMT's agi/bufu/zio, Nioh's look-alike weapons, RPS-101.
- Hard as text: "orthogonal" is an abstract word.
- Proposal: a radar of 4-5 traits (speed, range, damage, space control, follow-up) with two moves overlaid. A preset "laser vs fireball" shows two different shapes; "agi vs bufu" shows identical shapes in different colours, labelled "same niche, different packaging". This ties into Illusion of Depth (slide 61).

**Control: same input, many outcomes** (slide 12), effort **S**, quick win candidate
- Teaches: letting players steer a mechanic's variables (hold jump to go higher, aim an AOE, boost size and direction) creates more emergent results from one mechanic.
- Hard as text: the notes have a TODO to break each example into its own slide.
- Proposal: three tiny side-by-side widgets that match the slide's three bullets: variable jump (hold time → arc), AOE placement (drag a circle over a crowd, enemy count shown) and a directional boost. Each has a "fixed" toggle that removes control, so the arcs collapse to one.

**Synergy: Phyrexian Arena + Sheoldred** (slides 13-14), effort **S**
- Teaches: one card's downside becomes an upside with the right partner (draw cost life → draw gains life).
- Proposal: a life total ticking over 6 turns with Arena alone, then Arena plus Sheoldred. The two lines split. Card art should be described or drawn as card frames, not copied.

## Part 2: Player choice optimization framework (slides 18-68)

**Strategy vs tactics timeline** (slides 24-25), effort **S**
- Teaches: strategy is locked before the battle (character, loadout), tactics happen during it (moves, timing, spacing); weapon swap sits in between.
- Proposal: a match timeline with a "lock-in" line. Choices (character, loadout, weapon, moves, timing and spacing) are draggable chips; drop each where it belongs and the slide's answer is revealed. Works as a 30-second in-lecture quiz.

**Tension rope: sword vs bow** (slides 30-34, with 37-46 as cases), effort **M**, **TOP 5**
- Teaches: a choice is only interesting with tension. The notes build it as a rope (limp alone, strong with weights at both ends), then sword vs bow: if most enemies are met at range and can't reach you, the bow wins and there is no choice.
- Hard as text: the rope metaphor and the sword vs bow case are on separate slides; novices don't connect "tension" to the numbers that create it.
- Proposal: an enemy mix slider (mostly ranged ↔ mostly rushers) and terrain (open field ↔ tight corridors). A small sim plays each weapon against the mix and shows win rate. A rope drawn between the two options goes taut when the rates are close and limp when one dominates, with the slide's "NO TENSION = NO INTERESTING CHOICE" stamp. Presets reuse the deck's three examples ranked on slides 43-46: Doom Eternal disarm vs damage (weakest), Dark Souls light vs heavy (passable), Dark Souls block/dodge/strafe (strongest).

**Touhou item line** (slide 47), effort **S**
- Teaches: crossing the Point of Collection line vacuums up items, but that is where enemies spawn. Risk vs reward made spatial.
- Proposal: an original vertical shmup GIF: the ship hugs the bottom, drops pile up, the ship darts above the line, everything is collected, bullets close in, it dips back. A "risk" meter and an "items" counter move in opposite directions.

**Elegance = depth / complexity** (slides 49-58), effort **M**, medium priority
- Teaches: Getting Over It (one hammer, huge range), Super Monkey Ball (intuitive, gradual curve), Mario's variable jump, Lightning Bolt, Mario Kart drift, Kirby Air Ride (stick + A), Asteroids momentum. Slide 58: space, velocity and momentum are an easy source of elegant depth.
- Hard as text: "depth over complexity" is a formula with no numbers. The notes even flag that it implies a maximum of 1.
- Proposal: a scatter plot, complexity (inputs and rules) on x and depth (distinct useful outcomes) on y, with the deck's examples as dots. Each dot opens a tiny toy: an Asteroids-style ship with low friction, where turning thrust into a brake or drift is felt in ten seconds. The momentum toy alone is a strong GIF for slide 58.

**Illusion of depth** (slides 60-61), effort **S**
- Teaches: High on Life's creature-on-a-grapple pushing a button is the same skill test as dropping a block on a plate.
- Proposal: a split-screen GIF. Left: block onto plate, door opens. Right: a chattering creature dragged onto the plate, door opens. Then an "x-ray" wipe strips both to the same three boxes (signal → state → door). This reuses the x-ray look from Part 3, so build them together.

**Silver bullets vs interesting choices** (slides 62-65), effort **S-M**
- Teaches: Metroid's ice beam, Arkham's cape stun, "Simon Says". The notes give the test: ask why you shouldn't use a mechanic here and what you could do instead; no answer means a silver bullet.
- Proposal: an encounter with four tools. Run it 20 times with random enemy mixes and show a usage heat strip per tool. Silver-bullet mode: one tool is 100% for one enemy type and the strip is a solid block. Tension mode: the strip spreads. The "Simon Says" framing works as the caption.

**Best choice beats all: parry** (slides 66-68), effort **S**
- Teaches: Sekiro's deflect and mikiri counter (and parries in general) dominate block and dodge, so the game gets less interesting as you get better.
- Proposal: a skill slider. At low skill, players spread across block, dodge and deflect; as skill rises the pick share collapses onto deflect. Slide 68 asks how to rebalance; add a "parry costs" toggle (smaller window, stamina cost, fewer parryable moves) so students see the spread return.

## Part 3: Mechanics design tools 1-2 (slides 71-101)

**Packaging vs substance x-ray** (slides 73-76), effort **S-M**, high priority
- Teaches: health is a state, jump is signal + transform over time, burn damage is a signal, a throw is a signal received only in the right state, a portal is state + transform. Slides 74-75 list 14 such pairs.
- Hard as text: two columns of words; the "x-ray glasses" metaphor begs for a visual.
- Proposal: a deck of flip cards. Front: the packaging (an original icon for health, jump, freeze, decks, portals...). Hover or tap an x-ray lens over it to see the substance built from the five framework symbols (state, signal, receiver, transform, context, slide 77). A quiz mode shows the substance and asks which packaging it is. Doubles as a lecture still and a homework drill.

**Switch, pressure plate, pulley** (slides 79-94), effort **M**, **TOP 5**
- Teaches: three ways to open a door. The switch listens for a signal and flips binary state. The plate keeps checking "is something there?" (continuous evaluation, binary output). The pulley keeps checking how far the rope moved and stores a percentage (3.5 / 5.0). Slide 91 swaps in a blender for a discrete example. Slide 94 names input vs output type and *when* each one evaluates.
- Hard as text: this runs over 16 slides of F/T boxes and arrows. The core lesson, that evaluation timing changes player behaviour, only shows up when you interact.
- Proposal: three doors side by side in one room. Click the switch, drag a crate onto or off the plate, drag the rope. Under each door a live readout shows its state (F/T, a 0-5 blender dial, 0.0-1.0), an "evaluated this frame?" blink and the input/output type from slide 94 (binary/binary, binary repeated checks/binary, analog/analog). A "walk away" button shows the plate door closing behind you while the switch door stays open: the behaviour difference the notes care about. A GIF tour covers each door in turn.

**Controller as binary and analog** (slide 97), effort **S**
- Teaches: buttons are binary, triggers analog, sticks dual-axis analog.
- Proposal: a gamepad drawing with live meters. If a real gamepad is connected (Gamepad API), it reads it; otherwise a scripted GIF presses a button, squeezes a trigger and rolls a stick. Cheap and very concrete.

**Distance curves: chance to switch target vs can attack** (slides 98-99), effort **S-M**
- Teaches: the same input (distance) drives a continuous weight (chance to switch targets, as used for No Rest for the Wicked AI skill choice) and a binary output (can attack, a tuned threshold). The notes joke that a mistuned threshold means it never attacks.
- Proposal: a top-down enemy and a draggable player. A curve editor for "switch target" weight beside a threshold line for "can attack". The enemy reacts live: its aggro flickers by weight, its attack only fires inside the threshold. A "mistuned" preset sets the threshold below the enemy's own reach.

## Part 4: Mechanics design tools 3-5 (slides 103-137)

**Inversion: danger zone vs safe rune** (slides 110-113), effort **S**, **TOP 5**
- Teaches: flip the space. A white island in a black pit vs a black pit in a white field. The WoW story: Ragnaros-style "danger near the boss" inverted into a "safe rune" that protects you, which later inspired the battle royale ring.
- Hard as text: the slides use a figure-ground image; the behaviour change (spread out vs collapse onto one spot) is only described.
- Proposal: a top-down arena with 10 raiders and an "invert" toggle. Danger mode: a red zone around the boss and raiders flee its edge. Inverted: the whole floor is about to erupt, one small safe circle appears and raiders rush into it. A third preset shrinks the safe circle over time (the ring). The raiders' paths draw as trails so the opposite behaviour is plain. GIF loops all three.

**Reverse sequencing: grind → level → raid** (slides 115-119), effort **S**
- Teaches: action-driven (grind, so level, so raid) vs goal-driven (want to raid, so level, so grind), and that a goal can open many routes (rehearse with the raid group, read guides...).
- Proposal: a flow graph that rebuilds itself. Forward mode is a single chain. "Reverse" flips the arrows, anchors on Raid and branches out alternative routes. Pairs with the slide 116 map quick win above.

**Inverse / reverse / contrapositive on a wall** (slides 122-130), effort **S**
- Teaches: A → B, ~A → ~B, B → A, ~B → ~A, with the wall example: inverse removes the wall, reverse brings the goal to the player, contrapositive removes blockers so the goal can escape (the princess sneaking out).
- Hard as text: notation, and the deck repeats the same A/B slide four times.
- Proposal: one scene (player, wall, goal) with four buttons. Each rewrites the scene and the logic line at once. A coat-and-rain row underneath (slide 122) shows why the reverse of a true statement can be false.

**Contrapositive arena: melee vs ranged** (slides 132-134), effort **S-M**, **TOP 5**
- Teaches: "If you're ranged, you can hit melee at range." The contrapositive exposes the asymmetry: ranged can hurt everyone, melee only what is close. Slide 134: a monster shooting in four directions leaves the ranged player a huge safe area to attack from and the melee player a tiny one.
- Hard as text: the notes admit the statement "breaks your mind a little". The space diagram is the payoff and it is static.
- Proposal: a top-down grid with a monster firing in four lanes. Toggle melee or ranged; every cell is coloured by "can hit the monster" and "safe from its shots", and the safe-and-useful area is counted as a percentage. Ranged shows a big region, melee a sliver. Sliders for weapon range and number of shot lanes let students try to even it out.

**Burn and chill truth table** (slides 135-136), effort **S**
- Teaches: if everything burnable is chillable, the contrapositive holds; add one burnable thing that can't be chilled and it breaks. The notes extend it: if all shotguns use ammo, could there be an ammo-free shotgun?
- Proposal: a set of object chips (wood crate, slime, torch, iron door...) with burnable and chillable checkboxes. Two statements at the top get a live ✔/✗. Clicking a ✗ highlights the object that broke it and prompts "what mechanic does this suggest?".

## Part 5: Mechanics design tools 6-8 (slides 140-193)

**Interlocking: Urza Tron and oil + fire** (slides 145-148), effort **S**
- Teaches: 1 + 1 ≠ 2. Urza's Tower, Mine and Power Plant give 1 mana each alone, 7 together; Planar Nexus counts as all three. Oil makes enemies slip, fire burns, oil + fire burns harder.
- Proposal: a land tray with three slots and a mana counter that jumps from 3 to 7 when the set completes, plus a "draw odds" panel showing how much more often the set completes with Nexus in the deck. The oil and fire half is a short GIF of an original enemy slipping into a burning pool with a damage counter beside a sum of the separate parts.

**Pattern disruption** (slides 150-152), effort **S-M**
- Teaches: players settle into a rhythm; disruptions keep it fresh (Hollow Knight's Radiance attacks diagonally after a game of horizontal and vertical attacks; L4D2's Spitter breaks closet camping).
- Proposal: a rhythm strip of incoming threats as notes on a beat. The player's "habit" (a fixed response) succeeds for a while, a disruptor arrives (diagonal attack, acid puddle) and the habit fails. An "engagement" line dips during repetition and spikes at disruption. A top-down closet-camping GIF with a Spitter-style puddle forcing the squad out makes the L4D2 case concrete with original art.

**Feedback loop sandbox** (slides 155-188), effort **M**, **TOP 5**
- Teaches: positive (snowball) vs negative (self-regulating) feedback, with the deck's repeated warning that positive does not mean desirable. Cases: wildfire vs thermostat, rich get richer, Bloodborne rally (negative), Mario Kart items (negative), Bloodborne hitstun chains, losing units in StarCraft or chess, Dark Souls 2 hollowing, Getting Over It falls, incremental games, Deadlock bounties (both), health → damage → lifesteal (slide 177), D3 life per hit (180), and the controls: diminishing returns (Xerath, Elden Ring stat softcaps) and limits (fighting game knockdown, Towerfall arrows and shields).
- Hard as text: 30+ slides of loop diagrams and trend labels. Loops are about change over time, which a still diagram can't show.
- Proposal: a two-player race over N rounds where each loop is a toggle. Turn on "damage increases lifesteal" and one lead snowballs off the chart; add "% lifesteal → flat life per hit" or "diminishing returns" or "limit" and the curves stay close. Presets for the deck's cases set the toggles and label the trend line (upwards, flat, downwards) the way the slides do. A small loop diagram beside the chart lights each arrow as it fires. Three GIFs fall out of it: the slide 177 snowball, the D3 fix and the Mario Kart rubber band.

**Psychological loops: music practice** (slides 164-165), effort **S**, low priority
- Proposal: two short animated loop diagrams (enjoy → play → improve; perfectionist → avoid → atrophy) with a skill meter beside each. Mainly useful to show that "positive loop" can describe a harmful spiral.

**Diminishing returns and limits** (slides 183-188), effort **S**, part of the sandbox or a quick win alone
- Proposal: one chart toggling linear, diminishing (Xerath stun, Elden Ring stat gain per level) and hard cap (knockdown). Use current, verified values for Xerath (notes ask for them) and the published Elden Ring softcap breakpoints.

**Games for understanding genres** (slides 190-192), effort **S**, low priority
- Proposal: not animated. A filterable list (genre, game, systems to study) would make the two dense text slides easier to use as a reference, and could link out to the course's Discord thread for suggestions.

## Image-only slides to check

Slides 172, 175, 176, 178, 179 and 181 have no text and mostly no notes; they are likely screenshots or videos. Check them in the deck before building anything for the feedback-loop section, as some may already be GIFs.
