# Module 9: Game Feel: interactive and GIF proposals

Source: "DGMS - RGF C2 M9 - Game Feel" (Drive 1wRmHaTL2_wDjqxJdZGFL-Da_-Q_oo0U8bM8-NtoSI2Q, 329 slides). First pass 2026-11-04. Slides 1-307 were read with speaker notes, and their numbers are the export's "N of 329" numbers. The notes export stops at 307 (Disney principle 6), so principles 7-12 and the closing slides were read from slide text only. Slide numbers after 307 are approximate and are marked "about".

Built so far: nothing yet. The course home is `../index.html`. This module is where several earlier proposals pay off, so it should reuse rather than rebuild:
- Module 0's "Same strike, polish layered on" is the preview of Part 2 here. Build it once, as proposal 1 below, and have Module 0 embed the first three stages.
- Module 4's jump metrics tuner and Module 5's ADR curves quick win share the runner and jumper that proposal 3 needs.
- Module 5's attack window editor already covers hit stop and screen shake windows. Proposal 4 can link to it for timing.
- Module 6's lens ladder covers FOV in depth. Slide 198's FOV table here can link to it.

This deck pulls together four outside frameworks (Andre's before-and-after demos, Steve Swink's three components, Manderson and McEntee's goals, Tim Rogers' friction types) plus Jacopo's feedback tool and Disney's principles. The deck itself observes (slides 221-222) that Rogers' types "are actually intensity over time, reshaped in different ways", which is the key to making most of this visual: nearly every idea here is a curve of intensity, position or time scale.

Imagery note: approved imagery fits several examples directly. Super Mario Bros. sprites cover the jump curves (167), League of Legends covers Sion's ultimate sound (190), and Mario Kart's Bullet Bill appears in Module 8. Other examples (Ori, Celeste, Guilty Gear Strive, Devil May Cry 2, Kena, Sekiro, Dying Light) are captions over original grey-box scenes.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Polish ladder: one strike, one shot, one ship, layer by layer | 35-57 | L |
| 2 | Feel shapes: Rogers' 16 types as intensity curves | 211-271 | L |
| 3 | Jump curve lab: Sonic, Mario, short hops and ADSR | 164-173 | M |
| 4 | Feedback channel mixer and checklist | 179-208 | M |
| 5 | Pendulum and ball: Disney's principles you can scrub | 281-about 320 | M |

Quick wins worth doing early even though they are not top 5:
- **Seven principles score sheet** (slides 65-84). A radar chart with the seven principles (predictable results, nuance, context, feedback, low floor and high ceiling, impact and resolution, appealing reaction), each scored 0-10 by the learner for a game of their choice. Slide 83: "You can treat these 7 Principles like a score sheet." Slide 84: "There's no 'perfect' score." It saves as an image for the Discord drill.
- **Which attack comes out?** (slides 66-69). Two panels, one button. Left: Smash-style, where the stick direction picks the attack and the same input always gives the same move (67). Right: a Witcher-style picker that chooses one of three attacks you can't predict (a forward roll into a thrust, a double-slash pirouette, an upward slash, from the notes on 68). A tally counts how often the learner guessed right. Notes on 68: "When you can't predict what your character is going to do… you can't consistently make informed decisions."
- **Under, match, over** (slide 107). A three-zone bar ("under-deliver", "match", "over-deliver" player expectations) with a few actions placed on it and a budget meter beside it. Notes: "It's an infinite pit you can pour money into… your job is to know where the line is for every element." Small, and a good opener for the Manderson and McEntee section.

---

## Part 1: What is game feel? (slides 3-29)

**The module map** (slides 17-28), effort **S**, fold into the index
- Teaches: the module sorts its tools into goals (Andre's before and after, Manderson and McEntee), values (Steve Swink's components, spatial simulation, seven principles) and techniques (the feedback tool, Rogers' types, Disney's principles). The same map slide appears about a dozen times as a progress marker.
- Proposal: one clickable map at the top of the module page, with three columns and a link per tool. It replaces the repeated map slides on the web version and shows where each proposal below sits.

## Part 2: Before and after polish (slides 32-58)

**Polish ladder** (slides 35-57), effort **L**, **TOP 5**
- Teaches: three demos by Andre, stepped with number keys. The slasher strike in five stages (35-40): basic blockout ("as quickly and as dirtily as possible… basic shapes and active hit box outlines"), essential communication ("Yes, you hit the target. It flashes and moves back a tiny bit"), preparation for tuning (faster weapons get shorter animations, heavier hits get heavier visuals), vertical exploration ("turn up absolutely every form of visual effect… But only on a couple of attacks and a target dummy… to get a sense of… how high your visual effect bill will go"), and proof (final quality, applied to a few places first). The FPS demo in seven separable toggles (41-48): blockout, smoothed movement (to reduce nausea), shot recoil, enemy flash with hit VFX and sound, charge attack with FOV change, essential UI, and diegetic visor UI. The on-rail shooter in seven (49-56): blockout, "10% better polish" (cheap rotations "to get past the uncanny weirdness"), aim indicators and assist, impact and death confirmation, start/hold/release charge, thrusters and trails, then sprint sound and FOV changes. Notes on 41: the slasher stages are a progression, while the FPS stages are "all of the parts broken up".
- Hard as text: the demos exist as builds driven by number keys, and the slides can only say "Press '3' in Metroid Demo". A web version lets every learner press the keys.
- Proposal: three tabs (slasher, first-person shooter, rail shooter), each with original grey-box art and number keys 1-5 or 1-7 that toggle layers. The slasher tab is cumulative (each stage adds to the last), the other two allow any combination, matching the notes on 41. A strip under the scene lists what each layer adds, and a small "cost" chip per layer echoes the vertical exploration point. Module 0 embeds the slasher tab's first three stages as its preview. Give the demos neutral names on the page ("first-person shooter", "rail shooter"), since the deck's working titles name other companies' games.
- Check before building: whether Andre's original demo builds can be shared or recorded. If they can, a recorded GIF of each stage is a quick first version while the web version is built.

## Part 3: 7 principles of highly satisfying games (slides 60-85)

**Seven principles** (slides 65-84), effort **S** each, see the quick wins
- Teaches: predictable results (66-69, Smash vs Witcher 2 and 3, and Witcher 2's enemies blocking "at random, even if they're in the middle of an attack"), nuance (70-71, Silksong's jump height and turnarounds), context (72-73, Assassin's Creed's context-sensitive buttons), feedback (74), low floor and high ceiling (75-76: "Hour 1: This feels nice! Hour 100: This feels AMAZING!", and Ori 2's final Kuro phase where the player stays airborne using every skill), impact and resolution (77-79: Guilty Gear Strive's counter-hit slowdown and zoom, with the warning that too much hit stop feels like "a rollercoaster that brakes every 10 feet", vs Devil May Cry 2's wolves that "just nudge him a little"), and appealing reaction (80-82, "Even if it's completely fake").
- Proposal: the score sheet and the "which attack comes out?" quick wins cover principles 1 and the whole set. Principle 6 gets a small hit stop slider on the polish ladder's slasher tab, from 0 to "brakes every 10 feet", so learners find the point where it starts to halt.

## Part 4: Goals of game feel in development (slides 88-126)

**Manderson and McEntee's five goals** (slides 98-123), effort **M**
- Teaches: five goals from Michael Anderson (Call of Duty, Apex Legends) and Chris McEntee (Rayman, Ori), whose genres "could not have worked on more different" yet whose philosophies are "nearly identical" (99). Goal 1, comfortable core, mythical mastery (103-105): easy base actions, harder optional depth, shown by Ori's combat platforming. Goal 2, understand the expectations of execution (106-107): responsive input, interruptible windows, fitting sound, VFX, force feedback and shake, and the under/match/over line. Goal 3, protect the player (108-110): "helpful limitations behind the scenes to protect the player from themselves", like coyote time in Ori and Celeste, "since human reaction times are slower than computers", and input queues. Goal 4, flow and momentum (111-113): Forspoken's momentum, and where sudden stops break it. Goal 5, fun from fusion (114-120): "Tools, Characters and Level Design are collaborators in fun", with Ori 2's combined movement abilities and Tears of the Kingdom.
- Proposal: a five-card page. Goal 3's card embeds a coyote time and input buffer toggle on a small platformer (shared with Module 4's jump tuner), with a "frames saved" counter that counts the jumps the player would have missed without it. Goal 4's card is a runner with a "momentum kept through landing" toggle, so the learner feels the sudden stop. Goal 2's card is the under/match/over quick win. Goal 1's and 5's cards are captioned clips. Slide 123's tip ("Screenshot it and make it your desktop and phone wallpaper") gets a downloadable wallpaper of the five goals.

## Part 5: 3 components of game feel design (slides 128-153)

**Swink's three components sorter** (slides 135-151), effort **S**
- Teaches: game feel is "the combination of Real-Time Direct Control, Spatial Simulation, and feedback effects" (136), "not design principles so much as… the fundamental building blocks" of feeling "like the character is an extension of you". Real-time direct control needs a 1:1 relation between input and response (137-138), which RTS games lack (139). Spatial simulation needs objects moving in a represented space (140-142): a ship rotating on a black background has none until stars appear (141), StarCraft has it, a turn-based RPG battle screen doesn't (143), and Punch-Out doesn't because the player stands still in the centre (144). Games with only feedback effects are menu games (145).
- Proposal: a three-circle Venn with game cards to drag into it (StarCraft, a turn-based RPG, Punch-Out!!, a menu game, a platformer, an action game). Each card snaps to its answer with the deck's reason. A side widget shows the slide 141 example: a ship rotating on black, then a starfield toggle that suddenly makes it feel like it's moving.

## Part 6: 5 spatial simulation optimizations (slides 155-173)

**Jump curve lab** (slides 164-173), effort **M**, **TOP 5**
- Teaches: "Game Physics is a Lie!" (162). The five optimizations are movement, acceleration, top speed, deceleration and air control (164). "Most 2D games use gravity 3 times stronger than on earth", because "The increased sense of power… [is] more fun than the half-human height a realistic jump would achieve" (165). Sonic sets a high Y velocity and, on release, brakes it to a lower value, so arcs stay smooth at any release time (166). Mario has lower gravity while A is held, triples it on release, and gets a higher launch speed when running fast (167). Smash and King of Fighters use a 3-6 frame pre-jump: release during it for a short hop, hold for a full jump, and in KOF tap down first for a longer horizontal jump (168). ADSR envelopes from audio describe press and release behaviour that real life doesn't have (169). Lerps and easing functions (170-172: linear, ease in, ease out, ease in-out, bounce, with easings.net as a reference).
- Hard as text: three jump systems in three paragraphs. They differ only in what happens on release, which is the one thing a paragraph can't show and a held key can.
- Proposal: one jump key and three jumpers side by side (Sonic-style velocity cut, Mario-style gravity switch with the Super Mario Bros. sprite, and a fighting-game pre-jump with short hop). Holding the key for different lengths draws each arc, and the arcs stay on screen as ghost lines so learners can compare. A gravity slider runs from 1x Earth to 3x. A curve panel shows the ADSR envelope of the last jump. A small easing gallery under it animates a dot along each easing curve. This should share code with Module 4's jump tuner and Module 5's ADR quick win, so the three modules teach one jumper progressively.

## Part 7: Feedback techniques (slides 176-203)

**Feedback channel mixer** (slides 179-202, plus the feedback tool on 208), effort **M**, **TOP 5**
- Teaches: eight feedback types (179): VFX and light (180-183: Kena, trails "simulate the blur", impacts and explosions "bring weight into actions"), haptics (184-186: "the only physical influence most games have", short and strong for impacts, rising or pulsing for charge-ups), UI (187-188: GDKeys' trick of painting all UI green to check it isn't overused; Sekiro's contextual UI), SFX (189-190: "the rare feedback that doesn't need to be on-screen", Sion's ultimate heard map-wide), animation (191-193: "Not moving enough the characters" and slow starts are the two mistakes; a pack animation made responsive by cutting its first frames), 3D materials and decals (194), camera (195-198: shake that "must simulate the action", and an FOV table: Dying Light 1 at 50 for claustrophobic horror, Dying Light 2 at 70 for open parkour, Doom at 90 for awareness, Forza Horizon at 100 for speed), and time (199-201: hit stop "scaled depending on the impact. Don't abuse it or it might make the game feel laggy", Smash's freeze with a wobbling victim, and slow motion). Jacopo's feedback tool (208): "It helps me understand which effects are missing and what are the best things to prioritize."
- Hard as text: eight channels in twenty slides, and the deck's own point is that they combine.
- Proposal: one melee hit on a training dummy, replayed on a loop, with eight channel toggles and a strength slider each. Haptics plays through the Gamepad API's vibration when a controller is connected, with an on-screen rumble meter otherwise. A "paint the UI green" button applies GDKeys' trick to the UI layer. A "cut the first frames" toggle on the animation channel reproduces slide 193. The FOV channel uses the four presets from slide 198 and links to Module 6's lens ladder. Under the scene, a checklist in the shape of Jacopo's tool fills in as channels are turned on and can be exported, so the tool lives on the page rather than only in Discord.
- Check before building: whether Jacopo's tool can be reproduced or linked publicly, and in what form.

## Part 9: Tim Rogers' 16 game feel types (slides 211-271)

**Feel shapes** (slides 211-271), effort **L**, **TOP 5**
- Teaches: from Rogers' Kotaku article "In Praise of Sticky Friction" (214), sixteen types: crunch, swish, chunk, sticky, velcro, juice, grease, snap, meaty, crisp, electricity, grip, jerk, click, spurt and woosh (216). The deck's own reframing (221-222): they "are actually intensity over time, reshaped in different ways", described by trigger (one shot or held), duration, motion (snap, ease or spring) and channels (VFX, animation, audio, camera, haptics, time). Each type gets that treatment: crunch is "one big impact at first, followed by various little secondary elements" (224), sticky is "nothing more than a hit stop to show the impact of an attack, with a camera shake added" (232), chunk is "small peaks of feedback, repeated over longer periods of time" (228), electricity is energy that "builds up, and then it's released in a bigger outcome" (250, Mega Man X), jerk is "the movement blending into a stop, and then blending into the other direction" (256), and woosh is an object "sucked in, with a small anticipation and a clear snap" (266). Slide 270: "None of these terms are official, they're just names for shapes… What matters is the shape underneath."
- Hard as text: sixteen definitions, each followed by a GIF and then a second definition. The slides already say the useful version is a curve, but never draw the curves side by side.
- Proposal: a grid of sixteen small cards, each with an intensity-over-time curve on top and a tiny grey-box demo under it that plays the shape (two blocks colliding for crunch, a charge-and-release orb for electricity, a magnet snap for woosh). Each card lists its trigger, duration, motion and channels as chips. A builder panel lets a learner draw their own curve and pick its chips, then shows which named type it's closest to, or "unnamed shape" if none, which carries out slide 270's "invent your own". Clicking two cards overlays their curves, which shows near-relatives clearly (velcro vs grip, swish vs grease).
- Check before building: the notes on 222 say "TO REWRITE" for the motion profile explanation. Settle that wording first, since the cards depend on it.

## Part 10: Disney's 12 animation principles (slides 274-about 325)

**Pendulum and ball** (slides 281-about 320), effort **M**, **TOP 5**
- Teaches: Frank Thomas and Ollie Johnston's principles (280-282): squash and stretch, anticipation, timing and spacing, slow in and slow out, straight-ahead and pose-to-pose, follow-through and overlapping action, arcs, secondary action, exaggeration, staging, solid drawing and appeal. Slide 283: "We are not actually recreating reality, we are actually recreating our… perception of reality." Squash and stretch (284-285, a ball and Jak). Anticipation: "The bigger the difference between the anticipation and the impact poses, the more impactful the motion will appear… Small motions should have minimal anticipation" (287). Timing and spacing with a pendulum: 20 frames at 24 fps, then doubled by inbetweening, then respaced to swing wider in the same time (289-291). Easing on the same pendulum: none, lopsided, ease in only, ease out only (292-296). Pose-to-pose vs straight-ahead on walks and attacks (298-305). Follow-through and overlap (306): "Jak and Daxter has Daxter serve as a source of overlapping action by lagging behind Jak," and engines can do it with inverse kinematics and physics.
- Hard as text: the pendulum slides are the clearest teaching in the deck and they're frame sequences, which is what a scrubber is for.
- Proposal: a pendulum with a frame scrubber and onion skin. Controls for frame count (timing), frame spacing (spacing) and easing (none, in, out, in-out, lopsided), reproducing slides 289-296 exactly. A second tab is a bouncing ball with squash and stretch, anticipation (squat depth slider, with a "small hop" and "super jump" preset from 287) and a trailing tail for follow-through. Principles 7-12 get one small card each with a before/after loop, since the slides past 307 have no notes to expand on.

**Movies vs games** (about slides 323-329), effort **S**
- Teaches: "(Movies/TV) Feel ≠ (Games) Feel" and "without this, you miss out of most of the viscerality and connection that is only possible with a live game." The deck ends on samples from Kevin Rucker, senior animator at Riot Games.
- Proposal: a closing card that plays the same attack twice, once as a fixed animation and once responding to input (cancel, hit stop, shake), to make the "≠" concrete. Link Kevin Rucker's samples if they are public.

## Small fixes spotted while reading

- Slide 1 is marked "INTERNAL ONLY SLIDE". Slide 2 says "Module 8: Improve Game Feel"; this is Module 9.
- The Disney section is counted three ways: "Disney's 11 Effective Animation Techniques" (16), "Disney's 12 Principles of Animation" (18 and the map slides) and "Disney's 12 Effective Animation Techniques" (272, 274). Notes on 281-283 say "These 11 principles". The list has twelve.
- Rogers' list is called "16 Game Feel Tricks" (map slides), "16 Types of Game Feel" (209) and "16 Game Feel Techniques" (211). "Roger's" should be "Rogers'" (209, 211, 222). "Tim Roger's 16 Types" in 209's title too.
- The notes on 222 say "TO REWRITE" above the motion profile explanation.
- Slide 104's title says "Comfortable Core, Mythical Master" (missing "y").
- The demos are named "Metroid Demo" and "Starfox game" in the instructions on 42-56. Fine internally, but neutral names would be safer on anything public.
- Slide 105's notes are an editor instruction ("Editor play this video: [Show sequence from the ground breaking to Ori flying…]"); slides 109-110, 115-119 have "[Play this gif]" and empty bracketed links. Slide 202's notes and slide 208's Feedback Tool link are empty.
- Notes on 126: "steve swink0". Notes on 93: "Game feel is an awful phrase" is fine spoken; worth softening if notes go to students.
- Typos: "Game feel is comes later" (7), "we'll be be explaining" (17, 129, 206), "they team can do" (39), "controls appear it the corner" (47), "informations" (188), "istantaneous" (259), "one one side" (294), "it's own" (226, 244), "two entities collides" (233), "for you personal situation" (271).
- The FOV table (198) gives Dying Light 1 a default of 50 and says "like RE7". The project's Module 6 proposal treats FOV values as horizontal or vertical depending on engine; the table should say which.
