# Module 4: 3Cs: Character: interactive and GIF proposals

Source: "RGF C2 M4 - 3Cs - Character" (Drive 1Ygzxm6xhocviwCxE_-onbyu8Sz_cO6NmCnCnJDeNs_8, 273 slides). First pass 2026-11-04. Slides 1-200 were read with speaker notes, and slide numbers for them are the export's "N of 273" numbers. The notes export stops at slide 200, so Part 6 (Silhouette and Metrics, the last ~50 slides) was read from slide text only, and those entries are cited by slide title rather than number.

Built so far: nothing yet. The course home is `../index.html`.

The deck has two halves. Parts 1-5 cover character *fantasy*: the 3Cs, mechanics-first vs fantasy-first design, Alex Yee's Pyramid of Complexity, Devon Giehl's Compelling Character Composition, and long League of Legends case studies (Jinx, Draven, Braum, Lucian, Gnar, Ziggs, Trundle). Part 6 covers character *metrics*: silhouette, core actions and jump tuning. League portraits and Mario sprites are allowed for class use, and most proposals lean on them.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Champion dossier: the Pyramid of Complexity and the six compelling pieces, filled in for six champions | 54-123, 141-200 | M |
| 2 | Same kit, new fantasy: character iterations where the mechanics stay and the read changes | 37-48, 102, 127-137 | M |
| 3 | Same button, five meanings: input, controller, character | 9-20, 30-31 | S |
| 4 | Silhouette test with real sprites | Part 6, "Character Shape & Silhouette" slides | S |
| 5 | Jump metrics tuner: how far, how fast, how long, plus coyote time | Part 6, "Character Metrics" slides | M |

Quick wins worth doing early even though they are not top 5:
- **The Last of Us: the world speeds up** (slide 82). Notes: instead of slowing Joel while he carries Sarah, "they instead kept movement speed the same as usual, but the world accelerates around you." Two side-by-side runs: one with a slowed player, one with everyone else sped up. Joel's speed readout is the same in both. One GIF.
- **Core actions by genre** (Part 6, "Core Actions Define the Character"). The slide's verb sets (platformers: run, jump, attack; fighting games: walk, fast, heavy, block, grab, jump; Souls-likes: walk, run, root motion, pushback, dodge; FPS: run, shoot, ADS, grenade, take cover; parkour: run, climb, mantle, swing, slide) as one puppet whose action bar swaps when you pick a genre. Small, and it opens Module 5.

---

## Part 1: What are the 3Cs? (slides 6-28)

**Same button, five meanings** (slides 9-20, 30-31), effort **S**, **TOP 5**
- Teaches: notes on 16: "the jump button might make your character stand in place if you're in the idle state. However, if you're running, then the jump button would make the character take a running leap; or if you're swimming near a ledge, it might make the character pull itself out onto the shore. If you were driving a tank, the jump input might do nothing at all, or if you had a special rocket booster attachment equipped, cause the tank to launch into the air." Input is the hand, controller the control rods, character the puppet.
- Hard as text: the controller is invisible in play, and this paragraph is the clearest picture of it the deck has.
- Proposal: one jump key and a state picker (idle, running, swimming near a ledge, tank, tank with booster). Press jump and the signal travels Input → Controller → Character with the hop renderer from `understand-mechanics/shared/xray.js`, ending in a different action each time. Slides 30-31's full loop (player, commands, controller, character, interaction, game world, camera, back to player) is the page's second slide.

## Part 2: The crux of character design (slides 29-58)

**Same kit, new fantasy** (slides 37-48, 102, 127-137), effort **M**, **TOP 5**
- Teaches: mechanics-originated vs fantasy-originated design (37), with Braum (a shield first; one iteration was "a girl from Piltover with a big energy shield and trampolines") and Caitlyn (a sniper first) vs Aurelion Sol (a storm dragon first). "A cohesive character achieves both, but there is great risk trying to do both independently at the same time" (43-44). Notes give Apex Legends' fixes: Caustic's trap-and-wait loop clashed with an aggressive soldier fantasy and became a mad scientist (45), Revenant's ambush kit didn't fit a skeleton ninja and became a horror character (47), and Pathfinder's art moved back to friendly to match a team-leader kit (48). League's own fixes: Ziggs went from a "weird human man" whose explosions read as real-world warfare to a Yordle (133-134), Trundle's "gross poop-troll" became a troll with a magic ice club "which worked with all of the existing mechanics" (136-137). Ori went from a boy to a white box to a horned demon to a forest spirit (131).
- Hard as text: the lesson is that the kit stayed the same while the read changed, and a slide can only show one version at a time.
- Proposal: a kit strip at the top (icons for the abilities) that never changes, and a fantasy card below that steps through each version. A three-word "reads as" label under each card changes, for example Ziggs from "distasteful" to "chaotic fun", which is Devon's emotional-framing point (102). Cases: Ziggs, Trundle, Braum and Ori with League portraits and concept descriptions. Caustic and Revenant are text-only, since Apex art isn't on the project's allowed list. A GIF steps through all four.

## Parts 3-5: Pyramid of Complexity, compelling characters, case studies (slides 59-200)

**Champion dossier** (slides 54-123, 141-200), effort **M**, **TOP 5**
- Teaches: Alex Yee's Pyramid of Complexity, built bottom-up in seven layers: core theme (a log line), type of narrative (event- or character-based), character roles (protagonist, antagonist, reflection, avatar), world (stage, molder, participant), mechanic-emotion loop, specificity, and source of power and conflicts (66-92). Notes on 91: "TREAT THEM LIKE LUG NUTS - don't fully develop any single element to 100%." Devon Giehl's Compelling Character Composition has six pieces: role and lens, flawed over likeable, depth through damage, memorability through conflict, medium considerations, and character-driven prompts (99-123). The case studies fill every layer for Jinx (71-121), Draven ("Love me or die trying", 141-154), Braum ("Kindness is Strength", 155-168), Lucian ("Let go of vengeance or be consumed by it", 169-194) and Gnar ("Towering Tantrums", 195-200).
- Hard as text: the deck builds each case study one layer per slide, so Lucian alone is twenty-odd slides. The pyramid shape and the cross-champion comparison never appear together.
- Proposal: a pyramid with seven clickable layers next to a champion picker (Jinx, Draven, Braum, Lucian, Gnar, with Ziggs from Part 4). Click a layer to read that champion's answer from the notes, and click a layer *name* to see every champion's answer to it side by side, so learners compare log lines or worlds at a glance. A second tab swaps the pyramid for Devon's six pieces on the same champions. A third tab, "lug nuts", is a blank pyramid for the learner's own cast: one progress ring per layer per character, and a warning when one character's layer is far ahead of the rest. Goofy (62-63, 92) is the first preset, as the deck's before-and-after example. League splash art and portraits for each champion.
- Note: the notes on 115 and 147 contain drafting residue. See the small fixes. Quote only the cleaned text.

**Role and lens: Ziggs, Lucian, Gnar** (slides 101-109), effort **S**, fold into the dossier
- Teaches: context, emotional framing and subjective truth, each shown on the same three champions (102). For example, Lucian carries Senna's gun "because it matters to him personally. It's not about weapon symmetry." This is a dossier column, not a separate page.

## Part 6: Silhouette and metrics (last ~50 slides, cited by title)

**Silhouette test** ("Create solid black silhouettes", "Character Shape & Silhouette" slides), effort **S**, **TOP 5**
- Teaches: characters should "clearly reinforce what they do that is distinctive", and shape separates the player's character, companions and opposition: Sonic and Tracer, Sonic vs Dark Souls enemies, Sonic and Super Mario Bros. companions, Mass Effect squads, and Super Mario RPG's party vs enemies. One slide is still a placeholder reading "CREATE SOLID BLACK SILHOUETTES".
- Proposal: this page can be that slide. Real Super Mario Bros. and Super Mario World sprites (Mario, Luigi, Toad, Goomba, Koopa, Boo, Bowser) and League champion portraits are shown as solid black shapes. Guess who each one is, then a reveal shows the colours. A score per group (player, companion, opposition) shows which group reads best by shape alone. A second mode sorts the silhouettes into friend and foe before revealing them.

**Jump metrics tuner** ("Character Metrics" slides: How far? How fast? How long?; gravity; Ori, GMTK Platformer Toolkit, Sonic vs Mario, Mega Man, Commander Keen 1 vs 4; "Coyote Time, Celeste"), effort **M**, **TOP 5**
- Teaches: "Metrics define the feel." Changing gravity "completely transforms the feel of jumping… and how every single level and space must be created in harmony with the controls." Coyote time "allows the player to slightly mess up, but not ruin the feel and consistency of jumping." Closing slides: "You could either run faster, or have smaller rooms! You could jump higher, or make obstacles lower."
- Hard as text: the slides compare jump arcs of games that feel very different, and a learner needs to feel the change with their own hands.
- Proposal: a playable platformer runner with sliders for run speed, jump height, time to apex, fall gravity multiplier and coyote frames. Presets approximate Super Mario Bros., Sonic, Mega Man and the two Commander Keens, and each preset's arc is drawn as a ghost trail. Arc overlays are labelled as approximations, since the deck doesn't give numbers. A "fit the level" toggle loads a fixed set of gaps and ledges, so loosening the jump trivialises the level and tightening it makes jumps impossible, which is the "metrics only matter in context" slide. This page can be extended in Module 5 rather than rebuilt.
- Check before building: if the course wants real numbers, take them from published frame data for each game, or from the GMTK Platformer Toolkit presets the slide cites.

**Source of power and personality** ("Source of Power" slides: Ratchet and Link, Kenny in High on Life; "Character Personality & Animation": Kratos, Dark Souls' Chosen Undead), effort **S**, low priority
- Proposal: a gallery strip on the dossier page rather than its own build.

**FPGD fit check** (slide titled "Use the F…": clarity, motivation, response, satisfaction, fit), effort **S**, fold into the dossier
- Teaches: "Clarity: who they are matches how they play. Motivation: they do things you want to do or are someone you want to be. Response: their tools matter. Satisfaction: you feel rewarded for playing as that character. Fit: the mechanics and tools match the fantasy and game context."
- Proposal: five lamps under each dossier card that the learner sets, with the case-study champions pre-filled.

## Small fixes spotted while reading

- Slides 24-25 promise "How to Plan Character Puppet Actions", "How to Map Player Controls & Inputs", "The Anatomy of an Attack Animation", "Philosophies of Canceling Actions", "3 Components of Well-Designed Hitboxes" and "3 Components of Fast, Playable Prototypes". None of these appear in this deck; they are Parts 2 and 6-9 of Module 5. The overview slides could say so. Slide 27 also promises a "Drill" that doesn't follow.
- Notes on slide 115 include a line reading "----- GPT trash:" above the Jinx text. Slide 147's notes read "(Draven doesn't have a 'Case Study' version in your source, so we keep the ex…". Both are drafting residue that shouldn't be in delivered notes.
- Production notes still on slides: 68 "To cut?", 76 "[Use Noxus / Arcane Examples]", 91 "/// ADHOC this", 139 "CUT GNAR SIMPLIFY ADD MARIO / DUKE NUKEM", 170 "CUT GNAR" (but the Gnar slides 195-200 are still in the deck), and in Part 6 "NEED A GIF OF GAME SAMPLES" and "CREATE SOLID BLACK SILHOUETTES".
- Slides 182-194 repeat slides 171-181 (the Lucian build-up appears twice).
- Part 6 has "Preview Module 8: Game Feel", but Game Feel is Module 9.
- Naming: slide 55 says "Crafted Character Composition" and slide 100 says "Compelling Character Composition". Slide 57 says "7 Steps on the Character Complexity Pyramid", and slides 96 and 98 say "6 Slices" and "6 Pieces" for Devon's model.
- Slide 33 again credits Mohammad Alavi as "Creative Director - Apex Legends, Valve" (see the Module 0 fix).
- Notes on slides 60-61 repeat slide 52's line. Notes on 3 copy the "exploration of polish" opener. Slides 3 and 26 have a stray "я" and "м".
- Typos: "Caitlin" (39, "Caitlyn"), "namesless" (76), "lugnet" (91), "rambuncttious" (195).
- Notes on 111 and 133-134 contain profanity ("fuck it up", "fuzzy little mother fuckers"). Fine for a live talk, but worth a pass if the notes are handed to students.
