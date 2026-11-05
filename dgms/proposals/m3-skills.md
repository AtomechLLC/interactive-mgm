# Module 3: Leveraging Player Skills: interactive and GIF proposals

Source: "RGF C2 M3 - Skills" (Drive 1OcRCb8L9WrJh9L0zSJ7ZSTsm3-K-GY-YeglZzXez9gM, 337 slides). First pass 2026-11-04 from the Drive text export with speaker notes. Slide numbers are the export's "N of 337" numbers. Quotes marked "notes" come from the speaker notes. The export stops at slide 336, so slide 337 wasn't read.

Built so far: nothing yet. The course home is `../index.html`.

This is the most measurable deck in the course. The notes give frame windows, reaction times in frames and milliseconds, mash rates and hit counts, so many proposals can be playable tests that measure the learner instead of describing them. The deck runs: the skill testing framework (Part 2), then the five skill types (physical execution, decision making, processing, knowledge, freeform; Parts 3-7), then dynamic skill tests (Part 8) and examples (Part 9).

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Frame window and reaction lab: measure yourself against the deck's numbers | 91-110 | M |
| 2 | Three difficulty dials: intensity, fault tolerance, required successes | 46-52, 81 | M |
| 3 | AND vs OR: complementary and supplementary skill tests | 53-70 | M |
| 4 | Build the flea juggle: add the four dynamism tools one at a time | 250-278 | L |
| 5 | Five-skill fingerprints: which skills a game tests, and skill dissonance | 23-33, 89, 295-330 | M |

Quick wins worth doing early even though they are not top 5:
- **Asynchronous cycles** (slide 256). Five oscillators start in phase and drift apart because their periods differ. Turn one into a lava bubble, one into a moving platform and one into a guard, and the same drift becomes a level. Notes: "Asynchrony creates predictable irregularities." One GIF, and the code is small.
- **Is there a clear best answer?** (slide 76). A top-down court with shot positions scored by distance. Under 2-and-3 scoring the shots converge on the arc and the rim, like the notes' 2005 vs 2025 heatmaps. A "graded payoffs" toggle (points vary smoothly with distance and defender proximity) spreads them out again. Notes: "Am I making something with a clear best answer?"
- **Mash meter** (slides 111-115). Mash a key for five seconds and see presses per second against the notes' marks: about 8 for most people, 16 for the old world record, 30 as the 60 fps ceiling, and 31 for the current record. A toggle adds Smash's roll lockout (ready for 20 frames, then locked for 40), so mashing too early fails. Includes the notes' accessibility point: a "hold instead of mash" option.

---

## Part 1: What are player skills? (slides 4-38)

**Mario 1-1's three staircases** (slide 11), effort **S**, GIF
- Teaches: notes: two easier versions of the end-of-level stair jump appear earlier in 1-1. The first has "no penalty for failure, except jumping out of the pit", and the final staircase has "no penalty for failure, but there is a bonus for fast, accurate performance."
- Proposal: real Super Mario Bros. sprites. Three crops of 1-1 side by side, each with a caption for its failure cost (none, a bottomless pit, the flagpole score). Mario attempts each one in turn.

**Simple vs dynamic** (slides 17-19), effort **S**, fold into proposal 4
- Teaches: Human Benchmark's red/green test "tests reaction time fairly well, but it doesn't ask players to make any choices", while Silksong's flea juggle combines "fine motor control, muscle memory, timing, reaction time, visual calculus, and thinking ahead". Proposal 4 starts from the first and builds up to the second.

**Five-skill fingerprints** (slides 23-33, 89, 295-330), effort **M**, **TOP 5**
- Teaches: the five skill types (89), "Why challenge players across the skill spectrum?" (23, 29) vs "Why challenge a specific skill spectrum?" (24: "If you are designing a rhythm game for rhythm gamers, they probably don't want to deal with physics, calculations, and decision-making"). Skill combinations: Undertale (RPG plus bullet hell), Minecraft, Crypt of the NecroDancer. Skill dissonance: Sonic Adventure's mandatory Big fishing, The World Ends with You's Tin Pin Slammer, Dark Souls' Bed of Chaos (30-32). Part 9's genre examples are Mega Man X, Rock Band, Dungeons & Dragons and Vital Signs (327-330).
- Hard as text: the slides show five emoji icons per game but no amounts, and the dissonance examples only make sense as a change in profile.
- Proposal: a five-axis radar (physical, decisions, processing, knowledge, freeform) with presets for each example game. Skill dissonance is shown as a moving shape: Sonic Adventure's radar animates from Sonic's stages to Big's fishing, and the overlap with the original shape is printed as a percentage. A "your game" mode is the self-reflection prompt from 295. Values are the course's estimates, labelled as such, and live in one table.

**Pick the right skills: Star Rune** (slide 45), effort **S**
- Teaches: notes: a typing tutor whose battle scenes judged players on getting hit, which locked low-skill players in fights. Celia's fix was to score "how fast they complete levels and how few mistakes they make."
- Proposal: one battle replayed under two rule sets with the same typing log. Scoring by hits taken, the slow typist gets stunned on loop. Scoring by speed and accuracy, the same typist finishes with a lower grade. That is the point of slide 43: "What are you actually testing?"

## Part 2: The skill testing framework (slides 39-86)

**Three difficulty dials** (slides 46-52, 81), effort **M**, **TOP 5**
- Teaches: "3 different qualities that affect the difficulty of your skill test: Intensity, Fault Tolerance, and Required Successes" (47). Intensity is "how little reaction time you have, how narrow an input window" (48), fault tolerance is "how many mistakes the player is allowed to make" (49), and required successes is "how much the player needs to succeed before they are allowed to progress" (50), including checkpoint spacing (52). Notes on 48: "Difficulty isn't good or bad. It's a question of artistic direction."
- Hard as text: three numbers that multiply into one feel, and the deck gives them one slide each.
- Proposal: a corridor of jumps. Three sliders: gap width (intensity), lives (fault tolerance) and jumps between checkpoints (required successes). Three scripted ghost players at different skill levels run it twenty times each, and the page prints each one's clear rate and average attempts. The Savage Beastfly preset (81) uses the deck's numbers: 550 HP, 5 damage a hit (110 required successes), Silk Spear at 15 damage (a third as many), the Beastfly dealing 2 masks and its summons 1.

**AND vs OR** (slides 53-70), effort **M**, **TOP 5**
- Teaches: complementary tests are "AND" challenges (56: "It expects you to do this, and this, and this"), with Sky Diver, StarCraft II and Melee as examples. Supplementary tests are "OR" (62: "You don't have to be as precise at timing if you can button mash quickly. You don't have to predict if you can react"), with Overwatch roles and Go, Dark Souls III, DDR, King of Fighters and Street Fighter supplementation.
- Hard as text: the difference is a logic gate, and the effect is on who gets through.
- Proposal: twelve player cards, each with five skill bars. Build a test from skill requirements and toggle the joiner between AND and OR. The cards that pass light up, and the AND version passes fewer, more specialised players. Presets: Sky Diver (jump aim AND chute timing AND steering), Overwatch (aim OR strategy OR positioning, shown with Ana, Torbjörn, Mercy and Reinhardt), and Dark Souls III's teleport slam, where knowledge of the timing substitutes for reaction on the second attempt (66-67).

**Where are the choices?** (slides 71-81), effort **S**, GIF
- Teaches: notes on 75: Batman: Arkham Asylum's call-and-response enemies (knife: stun first; baton: jump over; Titan: batarang the charge) "doesn't demand anything from the player except doing the right thing when the game prompts them to". Compare Silksong's Savage Beastfly (81), whose charge can be punished by jumping over it, pogoing off it or luring it high. Axiom Verge's safe-spot boss (79) is the third example.
- Proposal: a decision tree for each enemy. Arkham's Titan has one branch, the Beastfly's charge has three, and Axiom Verge's boss has one dominant branch. Branch count is printed under each tree. Hollow Knight-style original art.

## Part 3: Physical execution (slides 87-131)

**Frame window and reaction lab** (slides 91-110), effort **M**, **TOP 5**
- Teaches: the frame window scale (98-99): 1 frame (frame perfect), 2-3 (tight), 4-7 (tricky), 10-20 ("anyone can hit it and feel good"), 30+ ("nearly unmissable"). Red/green reaction is "about 250 milliseconds for most people, or about 15 frames… a reaction under 18 frames is generally considered 'unseeable'" (104). Street Fighter III's 14-frame overhead vs Street Fighter 6's 20-frame one (104). Dark Souls 2's knight at about 48 frames (107). Complex reaction adds about a frame per possible stimulus (108). Sound is about 40 ms, or 3 frames, faster than sight (109). "Unreactable = Rock Paper Scissors" (106): core moves must sit under the 18-frame barrier.
- Hard as text: every one of these is a number learners feel only with their own hands.
- Proposal: a test bench at 60 fps with four tests. **Timing**: press when the marker crosses a window, with a window-size selector on the slide 98 scale, and see your hit rate after 20 tries. **Red/green**: your reaction in frames, plotted against the 15-frame average and the 18-frame line. **Overhead**: block a move with a 14-frame or 20-frame startup, so SF3 against SF6. **Choice reaction**: one to four possible cues, each needing a different key, so your reaction time grows per option. A sight/sound toggle on every test lets learners measure the 40 ms themselves. Results stay in the browser only.

**Mash meter** (slides 111-115), effort **S**, quick win (see above)

**Six components of aim** (slides 122-124), effort **S**, low priority
- Teaches: physical accuracy, recoil compensation, shots to kill, reload timing, ADS vs move and shoot, and enemy movement anticipation. The notes say "We don't go deep into these."
- Proposal: a click target range with one toggle per component, so a learner adds them one at a time and watches the hit rate drop. Only worth it if an FPS module wants it.

## Part 4: Decision making (slides 132-147)

**Buffered reaction: holding an angle** (slides 141-143), effort **S**, fold into the lab
- Teaches: notes on 142: "the decision to watch out for particular stimulus and ignore other stimulus in order to improve your reaction time to that specific thing… your reaction time to other situations is worse." Counter-Strike's held angle (143).
- Proposal: a fifth lab test. Two doorways, and you pick one to watch. A target in the watched door is timed at your buffered reaction, and one in the other door at your unprepared reaction. Over twenty rounds the opponent learns your habit.

## Part 5: Processing (slides 148-180)

**Valuation gets harder with attributes** (slides 156-162), effort **M**
- Teaches: valuation "gets harder" as attributes are added (158-159), card "on rate" costs (160), Lightning Bolt (1 mana, 3 damage) vs Shock (1 mana, 2 damage) across formats (161), and Stardew Valley crops differentiated by "cost, availability, gestation time, sale price, nutritional value" and season (162). Notes on 159 tie this to Mastering Game Mechanics' orthogonality.
- Proposal: a shop of armour pieces. Start with defence only and a single clear best buy. Add gold cost, weight and resistance one at a time, and the "best buy" depends on the situation slider. A second tab is a Stardew crop picker using the game's real crop data per season, ranked by profit per day for a chosen number of days left. The ranking flips as days run out.

**Visual calculus: Medusa Heads and ghost pieces** (slides 172-176), effort **S**, GIF
- Teaches: predicting paths: Bowser's flames and hammers in Super Mario Bros. (173), Tetris and the ghost piece (174), Castlevania's sine-wave Medusa Heads (176).
- Proposal: Medusa Heads on a corridor, first without and then with their future paths drawn as faint sine trails. The trails are what a skilled player pictures. Same idea on a Tetris well with the ghost piece toggled.

## Part 6: Knowledge (slides 181-215)

**Which keywords explain themselves?** (slide 190), effort **S**
- Teaches: Magic: The Gathering "tries to leverage general knowledge" in keywords: Flying and Deathtouch are clear, Menace and Vigilance less so.
- Proposal: a guess-the-rule quiz. Show the keyword, the learner guesses what it does, then reveal the rule, and the page tallies which keywords most people guessed. It pairs with `depth/mtg-keywords/`, which already has the combat rules.

**Chunking** (slides 202-204), effort **S**
- Teaches: short-term memory holds "about 9 discrete pieces of information", and chunking stores more. Notes on 204: Alex's Warlock rework used Cynwise's chunking post: "Things that follow the same rules are easier to remember, but are less engaging to interact with."
- Proposal: flash twelve spell icons for three seconds and ask for them back. Round 2 shows the same twelve sorted into three schools (WoW Warlock icons for Affliction, Demonology and Destruction). The score difference is the point.

**Mental mapping vs sense of direction** (slides 205-212), effort **M**
- Teaches: mental mapping navigates by landmarks, while sense of direction is "Dead Reckoning… most effective in a barren landscape that lacks landmarks". Hollow Knight's delayed map and optional Compass (210), Pseudoregalia's door-linked maps (211), Subnautica's landmarks (212).
- Proposal: one small maze in three versions: landmarks and no grid, a grid and no landmarks, and door teleports. Find the exit, then the page shows your path. A compass toggle costs a "charm slot", as in Hollow Knight.

## Part 7: Freeform (slides 216-242)

No interactive proposed. The deck's own point (221) is that freeform skills are "better left to the judgment of other players". A Jackbox-style prompt would need multiple players to work in class. Slides 228-237 repeat Part 2's supplementation examples; see the small fixes below.

## Part 8: Building dynamic skill tests (slides 243-280)

**Build the flea juggle** (slides 250-278), effort **L**, **TOP 5**
- Teaches: four tools: asynchrony (255-259: Monaco guards, Celeste's out-of-sync bounce pad, This Way Madness Lies' hyper bars), input sensitivity (261-265: Silksong enemies, Celeste pinball bumpers, variable jump height), multi-threading (267-270: Ninpek's parallel platforms, Silksong's two enemies across 8 positions, "28 possible combinations"), and input RNG (272-276: Slay the Spire and Into the Breach intents, Dark Souls 3 attack choice). Slide 278 shows Silksong's flea minigame using all four.
- Hard as text: four definitions and a video. The point is that each tool adds variety on its own and they multiply together.
- Proposal: start from slide 18's simple test, one flea falling on a fixed arc and a "hit" key. Four toggles add the tools in any order. **Asynchrony**: each flea gets its own launch force, so they drift out of phase. **Input sensitivity**: where you hit decides the new arc. **Multi-threading**: one to three fleas from different sides. **Input RNG**: the next flea's count and side are shown before it arrives. A counter estimates how many distinct situations a player sees per minute with the current toggles. All art is original. A GIF records the four toggles switching on one by one.

**Asynchronous cycles** (slide 256), effort **S**, quick win (see above)

## Part 9: Examples of skill tests (slides 281-336)

**Shovel Knight escalation** (slides 288-290), effort **S**, GIF
- Teaches: the Mega Man formula: cauldrons in a flat room, then while jumping, then over a bottomless pit with vanishing platforms.
- Proposal: three panels, the same cauldron hazard in each, with risk labels (no penalty, a hit, a fall). It pairs with the escalation page in `pve-interactions/escalation/`.

**Opt-in difficulty** (slide 294), effort **S**, low priority
- Teaches: Super Mario Odyssey "can be completed with only the basic jump and hat throw", while advanced moves are optional.
- Proposal: one Odyssey-style gap with two routes: a long walk with basic jumps, and a cap-jump shortcut. Both reach the same moon.

## Small fixes spotted while reading

- Slide 4 notes contain a stray title from another deck: "Compositional Frameworks to Design Enemy Variety With Depth at Scale".
- Slide 9 ("How do we do this?") repeats slide 6's notes ("So why does skill matter…").
- Slide 26 (Overwatch) notes say "TODO: add speaker notes". Slide 187 notes say "[TODO: Improve this section]". Slide 93 notes say "\*example text\*". Slide 109 notes ask to "Add a graphic and their reaction time windows - bar chart".
- Slide 109 notes give conflicting baselines: "Sight - 20 frames", then "Sounds - 40 ms faster than 30 (30 - 2.5 = 27 frames)". Slide 104 gives red/green sight as about 15 frames. Pick one baseline.
- Slides 228-237 repeat slides 61-70 (skill supplementation, including the Dark Souls III and King of Fighters examples), and slide 236's notes ask "(King of Fighters again?)".
- Slide 37 promises "4. Drill" for the five skill types, but no drill follows.
- Slide 253's list says "Input Sensitivity" and its notes say "Responsiveness". Slide 255's title is "Multi-Threading" on the asynchrony definition.
- Slide 291 notes say Flow is "which we won't be covering in this module", but slides 15-16 cover it.
- Slide 226: Sense of Humor carries Empathy's pronunciation "\[ˈempəTHē\]".
- Slide 285 notes stop mid-sentence: "is ultimately one of those questions that".
- Slide 336 ("Summary") is empty in the export, and slide 337 is missing from it.
- Typos: "Street Figther" (104), "Savage Beastly" (81), "premiere 3d platformer" (294, "premier"), "he/I was heavily inspired" (204).
