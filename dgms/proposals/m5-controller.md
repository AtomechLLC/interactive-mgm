# Module 5: 3Cs: Controllers: interactive and GIF proposals

Source: "RGF C2 M5 - 3Cs - Controller" (Drive 1F8f9I_lV1kdQe03nSfCcTMcfYbowvuTCbxsEmOYlfZQ, 472 slides). First pass 2026-11-04. Slides 1-304 were read with speaker notes, and their numbers are the export's "N of 472" numbers. The notes export stops at 304, so Parts 6 (end) to 9 were read from slide text only. Slide numbers after 304 are approximate (the text export skips blank slides) and are marked "about".

Built so far: nothing yet. The course home is `../index.html`. Related pages already built: `pvp/core-actions/` (attack anatomy, frame strips) and `pvp/strike-trades/` (armour and super armour windows). Several proposals below should extend those rather than start over.

This deck holds the technical core of the 3Cs: puppet architecture (input, controller, pawn), the Ori vs No Rest for the Wicked case study, control mapping, responsiveness, contextual interactions, attack animation windows, cancel philosophies, hitboxes and prototyping. Much of it is described as state, time windows and shapes, all of which are easier to show moving than to explain.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Puppet signal tracer: queued jumps, refused attacks, swappable inputs and pawns | 17-62 | M |
| 2 | Two jumps, two philosophies: Ori vs No Rest for the Wicked | 69-115 | M |
| 3 | Attack window editor with frame advantage | 248-323 | L |
| 4 | Cancel playground: 17 cancels and 5 anti-patterns | about 329-392 | L |
| 5 | Hitbox lab: shapes, placement and the naming mess | about 396-441 | M |

Quick wins worth doing early even though they are not top 5:
- **ADR curves** (slide 193). Acceleration, deceleration and rotation sliders on a top-down runner, with presets that snap direction change instantly (Mega Man X, 191) or carry momentum. The speed-over-time curve is drawn under it. Small, and the same runner can drive the Module 4 jump tuner.
- **One thumb, too many buttons** (slides 157-164). A gamepad drawing with the right thumb's reach highlighted. Assign Souls actions (attack, block, dodge, camera) and the page flags any two that must happen at once but share a thumb. Notes on 158: "Players only have one thumb, which can usually only press one button at a time." A PC tab does the same for two mouse fingers (159).
- **Plus, even or minus** (slides 302-309). Two frame strips, attacker and defender. Drag the attack's recovery length and the hitstun length, and the result reads plus, even, minus or unsafe on block. It's a small, standalone piece of the attack window editor.

---

## Part 1: What is a controller? (slides 7-68)

**Puppet signal tracer** (slides 17-62), effort **M**, **TOP 5**
- Teaches: the four pieces of puppet architecture (18: controllers, pawns, models, actions), modes vs actions (26-39: Elden Ring on foot vs on horseback, Final Fantasy's alive and dead, Ori's many movement modes), and the step-by-step example (44-58). Press jump while grounded and the pawn jumps. Press it while falling and the controller says "Oh… you're falling… you can't jump yet…" and queues the command until landing. Attack while swimming gets "It's swimming. Attacks aren't allowed right now" with an error sound or UI flash. The same pawn takes input from keyboard, gamepad, touch, a bot or a recorded replay (55-57), and a TankController drives a tank pawn (58). Slide 62: "it can become as simple as a set of rules, or… a set of flags on each mode."
- Hard as text: the queued jump takes eight slides of the same diagram, and the whole idea is timing, so it needs to move.
- Proposal: three boxes (Input, Controller, Pawn) with the signal hop renderer from `understand-mechanics/shared/xray.js`, beside a small side-view puppet. Keys trigger jump, attack and swim. A falling jump shows a "queued" chip that waits and fires on landing, and an attack while swimming shows a refusal bounce. Two pickers swap the input source (keyboard, gamepad, bot, replay) and the pawn (hero, tank). The pawn's mode-by-action flag table (slide 39 and 62's "What's exclusive and what stacks?") sits below and is editable, so a learner can allow attacking while swimming and watch the refusal go away. This is the full version of the Module 0 and Module 4 previews.

**Muppet vs puppet** (slides 41-42, 77-87), effort **S**, fold into proposal 2
- Teaches: muppets mix input, controller and character in one place ("SeinPrefab" in Ori, 79), which is quick but "a tendency to create circular feedback patterns" (80). Puppets separate them (No Rest's Photon Quantum: device input in Unity, then the simulation's controller and pawn, then a view back in Unity, 82-86). Puppets allow AI control and multiplayer but take more thought and are "trickier to debug" (42).

## Part 2: Ori vs No Rest for the Wicked (slides 69-117)

**Two jumps, two philosophies** (slides 69-115), effort **M**, **TOP 5**
- Teaches: notes: "Ori was single-player and Moon's first game. No Rest was their third." Ori's intent was "a platformer that flows like water" (126), No Rest's "an experience that rewards thinking and punishes mistakes" (127). Ori's jump is on demand, direct control, air sustain, momentum preservation, double jump, air control, coyote time and interruptible. No Rest's is contextually triggered, with a preset destination, fixed distance and root-motion curve (110-112). Slide 113: "Ori has many scattered elements stacking together to create fluid motions. No Rest has singular, clear actions that have total motion control." Slide 76: the data comes from the modding community plus Alex's insight, within confidentiality limits.
- Hard as text: two lists of eight properties. The difference shows up instantly once you press jump in each.
- Proposal: two side-by-side jumpers with one shared jump key. Left: an Ori-style variable jump with each property as a toggle (air sustain, momentum preservation, double jump, air control, coyote time, interruptible). Right: a No Rest-style contextual jump that only fires at a ledge marker and follows a fixed curve to a preset destination. A component diagram under each (Ori: Platform Movement + SeinController + many abilities; No Rest: Pawn Component + Weapon + Action + Movement Base) lights the parts that ran on the last jump. The muppet vs puppet architecture is the page's second slide. Original art only, since the internals come from mods and confidential knowledge.

## Part 3: How to map player controls and inputs (slides 118-177)

**Controls as metaphor** (slides 129-173), effort **M**
- Teaches: three phases: the nature of player movement (131-141: controlling one character, commanding units, driving realism, modifying the environment; indirect styles need command input, direct styles need direct input), mapping gameplay through metaphor (143-155: Skyrim and Dark Souls left/right hand, Soul Calibur horizontal vs vertical, the first Assassin's Creed's head/hands/feet buttons later dropped, light vs heavy from God of War and Ninja Gaiden, WoW's ten action slots from EverQuest), and simultaneous actions (157-164). Slide 152: "Familiarity usually wins… but an understandable metaphor is essential." Tips: held buttons on shoulders, rapid presses on face buttons (169), a key-use heatmap (172), and X vs O in Japan vs the US (173).
- Proposal: a controller and a keyboard diagram with a metaphor picker. Choose "left/right hand", "horizontal/vertical", "body parts" or "light/heavy" and the buttons relabel, with the game that used it. A heatmap overlay on the keyboard (172) colours keys by convenience, and a learner's own mapping is scored against it. The one-thumb quick win can live on this page.

## Part 4: Responsiveness (slides 178-202)

**Four kinds of responsiveness** (slides 181-198), effort **S**, GIF
- Teaches: "The absence of delay between players' intention and feedback" (181), in four contexts: character (190-193, including Ori's early jump buffer and coyote time, and ADR curves), UI (194, Microsoft's response-time guideline), world (195-196: grass that bends, burns or cuts) and camera (197: Redout 2's speed-reactive camera).
- Proposal: one scene, four latency sliders (character, UI, world, camera). Each adds delay to its layer, so a learner feels which delay hurts most. A "Tears of the Kingdom" note (186) is the caption: beautiful animation, never at the cost of response. Slides 196 and 198 still need their clips; see the small fixes.

## Part 5: Contextualizing character interactions (slides 203-247)

**Interaction + context = outcome** (slides 235-243), effort **S**, GIF
- Teaches: notes on 237-238: "if I'm next to a tree and I press the axe button, I chop the tree. If I'm not near a tree, my axe will simply swing… If I'm behind an enemy, I might instead swing my axe overhead as a backstab." Examples: Assassin's Creed parkour (239), Forspoken (241), Titanfall wall-running (242), Ori's feather glide and updrafts (243).
- Proposal: one axe button and a draggable character. Move it next to a tree, an enemy's back, an enemy's front or open ground, and the same press plays a different outcome, labelled with the context that chose it. Reuses the puppet tracer's controller box.

**Strip the packaging: tools, weapons and moves** (slides 218-234), effort **S**
- Teaches: keywords (218-219), Link's tools in A Link to the Past (221-222), weapons as emotional delivery (Ratchet & Clank comedic vs Dark Souls realistic, 226-227), innate moves (229), and League's first 25 champions' mechanics list (231). Slide 233: "Once you remove the aesthetic contextualization of the interaction, they are all" the same interactions.
- Proposal: this repeats a GIF the project already has (`composition/gifs/strip-the-packaging-abilities.gif`). Link to it instead of building a new one, and add League champion portraits for the slide 231 list if needed.

## Part 6: The anatomy of an attack animation (slides 248-about 328)

**Attack window editor** (slides 248-323), effort **L**, **TOP 5**
- Teaches: startup, active and recovery (258-260), windows as "Sections of time where things occur or CAN occur during an animation" (276), Elden Ring's frame data editor (270-279, including a dagger vs greatsword comparison where dodge and guard come sooner from the dagger), the Dark Souls compression-and-release cadence (284-286), and the window types (289 onward): interrupts, queues/buffers, hit (with hitstun variants: none in StarCraft, a freeze in Hollow Knight, interrupts in Under Night In-Birth, unique reactions like Street Fighter 6's crumple), iFrames, translation (root vs local motion), rotation, visual effect, sound and screen shake. Then frame advantage (302-309), the "sensory trio" of VFX, sound and shake, reversed windows like super armour, and disadvantageous windows.
- Hard as text: this is a timeline editor, and the deck shows screenshots of real editors that a learner can't touch.
- Proposal: a timeline with one row per window type over a frame ruler, and a strike played above it on loop. Drag the edges of any window. Moving the queue window earlier lets early presses through, moving the dodge interrupt changes when the strike can be cancelled, and turning off the sensory trio removes the VFX, sound and shake. A second attack row can be lined up by end frame, to compare a dagger against a greatsword. The plus/even/minus quick win is the bottom panel. It should extend `pvp/core-actions/` (which already has attack anatomy and frame strips) and reuse `pvp/strike-trades/`' super armour rules.

## Part 7: Cancel philosophies (about slides 329-395)

**Cancel playground** (about slides 329-392), effort **L**, **TOP 5**
- Teaches: commitment ("The feeling of being locked into a course of action after it is input"), cancel and cancel philosophy (about 335-337), free cancel vs no cancel vs IASA frames, then "17 Ways to Cancel Ongoing Actions" (about 363-384: free, IASA/follow-through, landing, damage, super armour, on-hit, switch, jump, defensive, stun into recovery, feint, active reload, self, resource, stance, string, chain), strings vs chains vs combos, three chain patterns, five ideal animation types to add cancels to, and five anti-patterns (about 387-392): universal free cancel, cancel windows the size of the whole move, infinite loops, cancels with no downsides, and option selects.
- Hard as text: seventeen definitions in a row. A learner only sees what a cancel does by pressing buttons during a move.
- Proposal: one looping attack string on the attack window editor's timeline. Seventeen toggle chips, one per cancel type, each opening a coloured window on the timeline. Press keys during the move, and accepted transitions flash green while refused ones flash red. An anti-pattern detector watches the current set and warns when, for example, free cancel plus self cancel creates an infinite loop, or a cancel window covers the whole move. Presets: a Souls-style "commit" set, a fighting-game "on-hit chain" set and a character-action "free" set.

## Part 8: 3 components of well-designed hitboxes (about slides 396-443)

**Hitbox lab** (about slides 396-441), effort **M**, **TOP 5**
- Teaches: the naming mess (hitbox, hurtbox, attackbox, throwbox, grabbox, pushbox): in FPS games the hitbox receives damage, in fighting games it deals damage, and action games use collision. The deck's fix is verb / adjective / noun: Attack, Attackable, Collision. Then the five shapes (box, sphere, capsule, cylinder, cone), bone-follow vs manually positioned colliders (Elden Ring vs Skullgirls), and seven placement tips: extend attacks inside the character to avoid gaps, make player-favourable volumes a bit too big, make attackable areas smaller (with bullet grazing), use secondary boxes for special interactions, keep attacks and receivers proportional, keep it simple (boxes in 2D, capsules in 3D), and project 3D boxes to the plane in 2.5D games.
- Proposal: a side-view fighter mid-swing with its colliders drawn. A genre switch (FPS, fighting, action, course) relabels every box, which shows the naming mess in one click. A shape picker swaps the attack volume between the five shapes, and a bone-follow toggle makes it ride the weapon bone instead of sitting fixed. Each of the seven tips is a button that shows the before and after on the same swing. For example, the gap tip shows an enemy standing in the gap between the body and a detached hitbox, getting missed.

## Part 9: 3 components of fast, playable prototypes (about slides 445-472)

**Behind the art** (about slides 448-457), effort **S**, GIF
- Teaches: ray traces, simple shapes (spheres, rectangles, triangles) and fast math, "Art is the enemy of fast, playable prototypes", "This is what Ori looks like behind the art…", Hollow Knight.
- Proposal: one scene that wipes between its final art and its grey-box version (capsules, rays and boxes), using any of the project's own pages as the subject. Short and reusable as the course's prototyping slide.

## Small fixes spotted while reading

- Module 4 promised this deck's Parts 6-9 (attack anatomy, cancels, hitboxes and prototypes). The Module 4 overview slides could point here.
- Slide 3 still says "Refining Gameplay & Game Feel", the old course name. Notes on 4 repeat the "exploration of polish" opener.
- Notes on 119: "Repeated? … To cut?" Slide 196: "\*Example gif of the punchable cages in Riot's Mageseeker game.\*" Slide 198: "Include a clip showing the before and after camera for wall running." Slide 262: "VIDEO HERE of start - hold - end". These are placeholders.
- Slides 277 and 287 say "Review Module 4 - Video 2: 5 Types of Player Skills". Skills is Module 3.
- Slides 289-290 say "8 Most Common Attack Animation Windows", but the list and the following slides run to nine (screen shake is "Window Type 9"). The "Sensory Trio" slide then labels VFX, sound and shake as Types 6, 7 and 8, while the individual slides number them 7, 8 and 9.
- The "No Cancels Allowed!" slides still have the note "(Maybe a little cancel here so it doesn't feel stiff)" on the slide face.
- Typos: "Stupidly Simpled" (one of the Tip 6 slides), "Grabox".
- Tone: slide 255 ("LORD ELMO DEMANDS VIOLENCE"), slide 270's notes ("what the fuck is this?") and the last slide's joke ("Those of you who don't skip will be getting paid a LOT more afterward") are fine live but worth a pass if notes go to students.
