# Module 2: Audience Demographics: interactive and GIF proposals

Source: "RGF C2 M2 - Audience Demographics" (Drive 1ldJVcHJUs8ENsbrO_5L3vmKMKf5a_Wn4CNvt8XuLt24, 288 slides). First pass 2026-11-04 from the Drive text export with speaker notes. Slide numbers are the export's "N of 288" numbers. Quotes marked "notes" come from the speaker notes.

Built so far: nothing yet. The course home is `../index.html`.

The deck has eight parts: player psychology models, skill curves, raising beginners, tailoring to hardcore players, tailoring to intermediate players, late-stage retention, and psychology traps. Most of its strongest material is in the notes: Alex's League of Legends and World of Warcraft stories (the Adjudicators, the Master Yi rework, the 13% rule, gold items). Those stories have real numbers, which makes them easy to turn into interactives.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Five skill curves, one chart: floor, ceiling and the flow channel | 67-89 | M |
| 2 | Shift the power: move strength between reliable and niche elements, watch the floor and ceiling move | 88-89, 174-178 | M |
| 3 | The affordance grid, played in a Mario level | 102-111 | M |
| 4 | The 13% rule: when an upgrade feels like an upgrade | 226-237 | M |
| 5 | Score a game with Quantic Foundry: the Skyrim radar | 38-40, 49-50 | M |

Quick wins worth doing early even though they are not top 5:
- **The gold item trap** (slide 260). One slider for how many gold-per-10-seconds items you stack, one for game length. Plot gold earned against the 2,250 spent, with the break-even minute marked. Fewer than ten numbers explain the notes' story of why "EVERYONE wanted them" and why it was still a losing deal. See the small fix below about the notes' arithmetic.
- **Time pressure, three ways** (slides 277-280). One corridor, three chasers: Ori and the Blind Forest's fixed-speed escape, Ori and the Will of the Wisps' rubber-banded wall "a fixed amount of time behind", and Kirby's Return to Dreamland's mist that drags along behind a fast player. A player-speed slider shows that only the fixed chaser filters out slower players.
- **Hard check vs soft check** (slides 132-135). A Zergling cluster from the StarCraft campaign: kite it with Raynor (slow, possible) or bring Firebats (fast). Then a God of War ice-coated enemy that technically takes some damage but is "effectively a hard check". A timer for each solution shows the difference between "forced" and "much more efficient".

---

## Part 1: What is Audience Demographics? (slides 5-25)

**Rushing Ralph vs Careful Chris** (slide 14), effort **S**, GIF
- Teaches: notes: "Careful Chris players find every possible resource before proceeding into danger. Rushing Ralph players blaze ahead and just deal with whatever problem they run into." Dishonored players vs DOOM players.
- Proposal: two ghost runners in one small room with three pickups and two enemies. Chris clears every corner first. Ralph runs the straight line and fights what he hits. A timer and a "resources used" counter make it clear that both are playing the same game. Could reuse the ghost-runs code in `depth/ghost-runs/`.

## Part 2: 8 player psychology models (slides 26-60)

**Score a game with Quantic Foundry: the Skyrim radar** (slides 38-40, 49-50), effort **M**, **TOP 5**
- Teaches: notes on 50: "designers should start voting each category based on how much that category is present in the project. Not how much they like it but how present it is… having more designers adding their data and using them as an average could ensure better results." Slide 50 lists 18 scores for Skyrim, which fits Quantic Foundry's 6 groups and 12 motivations. Notes on 39-40: swap the rows and the model splits into inward (your own actions, growth, identity) vs outward (external stimulus and content).
- Hard as text: slide 50 is a grid of eighteen unlabeled numbers in the export.
- Proposal: a radar of the 12 motivations grouped into the 6 families. Skyrim's scores load first. Add up to four "designer" score sets and the radar shows the average with a spread band, which is the notes' method. A "my game" set draws over Skyrim so a learner can see what a competitor would have to match. A toggle regroups the axes into inward vs outward (39-40).
- Check before building: map the 18 numbers on slide 50 to their labels from the slide image.

**Bartle as scores, not a point** (slides 30-32), effort **S**, GIF
- Teaches: notes: World of Warcraft's analytics found "Newbies, Bluebies, Oldbies, Soloists, Raiders and Gladiators" instead of Bartle's four types, and "it became clear this system was less of a position on a graph and more of an individual score in each category… and these preferences can shift dramatically."
- Proposal: a Bartle quadrant with one player dot. Turn it into four bars (Killer, Achiever, Socializer, Explorer) and the bars change across a timeline (levelling, raiding, PvP season, retirement), while the dot can't show that change. End with the six WoW segments as labelled cards with WoW class icons.

**Timmy, Johnny, Spike: population vs who reaches advanced** (slides 44-45, 57, 157-162), effort **S**
- Teaches: Timmies are the largest population and Spikes the smallest (158), "Timmy / Johnny / Spike can all be beginner, intermediate, and advanced… but the players that become advanced are often Spikes" (161-162), and "you can be a Timmy and a pro. You can be a Spike and a novice" (57).
- Proposal: 100 player tokens coloured by type, spread across a beginner / intermediate / advanced ladder. Press "a season passes" and tokens climb. Spikes climb fastest, so the advanced rung ends mostly Spike-coloured even though Spikes are the smallest group. The visual answers why "Spikes tend to be your most outspoken players" (160). Magic: The Gathering mana symbols for the three types.

**Lobbyist, guide, therapist** (slides 51-54), effort **S**, GIF
- Teaches: the designer's role changes across development: lobbyist before development (anticipating the audience), guide during it (based on experience), therapist after it (based on feedback).
- Proposal: a three-stop timeline. One designer token changes its hat at each stop, and the speech bubble changes from "players will want…" to "this path leads…" to "what's under that complaint?" The notes' aside, "some game designers are better at prototyping and others are better at live maintenance," is the last caption.

## Part 3: 5 types of player skill curves (slides 62-93)

**Five skill curves, one chart** (slides 67-89), effort **M**, **TOP 5**
- Teaches: the designer's definition, "How challenging a new tool is to learn initially, then proceed to mastery" (68), and the five curves with their examples: flat (Chutes and Ladders), easy to learn and easy to master (Guess Who?), hard to learn and easy to master (A Game of Thrones: The Board Game), easy to learn and hard to master (Go), hard to learn and hard to master (Chess), and regressive (Street Fighter III, where "skills that will carry you early on, like jumping, need to be unlearned"). Slide 70 adds the flow channel and slides 87-89 add the skill floor and ceiling.
- Hard as text: the slides show each curve on its own, so a learner can't compare their shapes or see floor and ceiling on the same axes.
- Proposal: one chart of skill gained against hours played, with the six curves drawn in. Pick one to highlight it and play a short caption from the notes. Floor and ceiling markers sit on each curve. Turn on the flow channel (70) and a challenge line, and the chart shows where each game gets boring or frustrating. Slide 84's "skill curves are diverse" becomes a second tab with two curves inside one game: League of Legends' Garen and Ryze, and World of Warcraft's Warrior and Warlock, with LoL portraits and WoW class icons.

**Floor and ceiling elements** (slides 88-89), effort **S**, fold into "Shift the power"
- Teaches: floor elements raise everyone equally (WoW auto attacks, button mashing in fighting games, LoL passive gold). Ceiling elements need "arcane rules, precise timing and large amounts of attention" (LoL animation cancelling, StarCraft II Chrono Boost, Street Fighter III parries).

## Part 4: 5 methods to raise beginner players (slides 95-150)

**The affordance grid, played in a Mario level** (slides 102-111), effort **M**, **TOP 5**
- Teaches: the 2×2 of "user perceives action?" by "action possible?": visible affordance, correct rejection, false affordance and hidden affordance (105). Notes: false affordances belong in troll level design (108), and hidden affordances are secrets, Easter eggs and advanced techniques like Super Metroid's wall jump (109). Notes on 104: Ooblets' "hype" and "fluster" vs "steal 1 life", which is the point of slide 110's "Natural language is important!"
- Hard as text: four labelled boxes. A player learns affordances by walking into them.
- Proposal: a short Super Mario World level with real sprites. A pipe Mario can enter (visible), a background pipe he can't (correct rejection), a ledge that looks solid and drops him (false), and an invisible block that holds a 1-Up (hidden). Each discovery drops a token into the matching quadrant of the grid beside the level. A second tab is a word swap: Ooblets' "hype" next to "steal 1 life" to show slide 110.
- Note: slides 106-107 label the quadrants "Good" and "BAD". The visual should label them **intended** (visible, correct rejection) and **misleading** (false) or **secret** (hidden), so it says what each quadrant does.

**Overt vs soft tutorials** (slides 113-130), effort **M**
- Teaches: overt tutorials (The Sims, Plants vs. Zombies, Legends of Runeterra) vs soft tutorials (Super Mario 64, Super Mario Bros., Super Mario Odyssey, Cuphead hint text), when to use each (115, 121) and their drawbacks (119, 130). The antepiece (126-127): "a practice example of a challenge with the risk of failure removed, before encountering the real challenge" (Hamish Todd).
- Proposal: the same first screen taught three ways: a text-box overlay, a Cuphead-style hint sign, and an antepiece. In the antepiece, a Goomba walks under a low ceiling where Mario can't miss the jump, then a second Goomba sits over a pit. A counter shows "seconds before the player is playing". Slide 127's notes still say "Explain the mario example here", so this page could be that example.

**Hard check vs soft check** (slides 132-135), effort **S**, quick win (see above)

**Practice modes** (slides 141-145), effort **S**, low priority
- Teaches: Super Smash Bros. Ultimate's training room, League of Legends' Practice Tool, Soul Calibur's combo list, and Devil May Cry 5 and Bayonetta's combo rooms.
- Proposal: a gallery, not an interactive. It fits better as a strip on the tutorials page.

## Part 5: Tailor to hardcore players (slides 151-193)

**Shift the power** (slides 88-89, 174-178), effort **M**, **TOP 5**
- Teaches: "4 Ways to Shift Power Across The Skill Curve" (176): power in arcane, tricky or subtle elements empowers hardcore players; power in consistent, reliable, unavoidable elements empowers everyone; moving power from niche to reliable raises the floor; moving it from reliable to niche raises the ceiling. Notes on 174-175: Aphelios was built for hardcore players, and Master Yi was reworked because at competitive tuning he "was nearly unstoppable by players in low rank". The leap moved to Q, the attack-speed skill became the ultimate on a long cooldown, and Meditate became interruptible.
- Hard as text: the four bullets describe two dials and their effect on two curves. That needs a chart.
- Proposal: one champion's kit as power blocks: auto attacks and stats (reliable) and an animation-cancel window or a sequenced combo (niche). Drag power between the two piles. A chart above plots win rate against player skill, and the left end (floor) and right end (ceiling) move as power shifts. Presets: Aphelios (most power in niche), pre-rework Master Yi (most in reliable, high floor that crushes low ranks), and post-rework Master Yi. LoL portraits for each. All numbers are illustrative and live in one table at the top of the script.

**The donut and whose feedback** (slides 33, 167-180), effort **S**, GIF
- Teaches: Rob Pardo's donut (168): "In the center are your most hardcore players, outside the donut are the players that will never play your game. The most important players are actually the ones where the meat is." Notes on 170-171: League's Adjudicators forum of hardcore players, "hyper optimizers", who couldn't "envision the game as how it SHOULD be". Slide 180: "The most valuable feedback is going to come from players who leave your game, or who are almost interested."
- Proposal: a donut of player dots. Speech bubbles come from the centre loudly and often, and from the edge rarely. A "listen to" selector picks a ring. Listening only to the centre shrinks the donut over a few patches, and listening to the meat and the edge widens it while a few centre dots leave. Slide 179: "and that can be okay."

**The 55% rule** (slide 183), effort **S**, low priority
- Teaches: notes: "if a character didn't go over a 55% win rate… then it was 'close enough' for now. But characters which exceeded 60% win rate were definitely up for review patch-to-patch."
- Proposal: a strip of champion portraits on a win-rate axis with the 55% and 60% lines, nudged each "patch". Small, and could fold into the "Shift the power" page.

## Part 6: Tailor to intermediate players (slides 194-222)

**Pacing with pockets** (slides 203-204), effort **S**, GIF
- Teaches: notes on 203: "pacing which has pockets of extra difficulty, followed by drops in resistance, with an overall increase over the course of the game", and Ori and the Will of the Wisps' ability order (204): torch, weapon, double jump, dash, then Bash.
- Proposal: a resistance line drawn left to right as a sawtooth with a rising trend. Ori's ability icons drop on the dips, and the same gap from early in the game is shown being crossed trivially later on.

**Save scumming vs checkpoints vs grinding** (slides 214-219), effort **M**
- Teaches: three systems for the "I want to get better" and "I want to finish no matter what" mindsets (214). Quick save (215-216) has a short iteration time but can lock players into corners. Checkpoint spacing (217) covers Ori and the Blind Forest's energy-cost save points. Grinding (218) trades time for power. Notes on 219: League's hidden Elo behind resetting tiers.
- Proposal: one level strip with three deaths scripted on it. Toggle quick save, checkpoint spacing (slider) or grinding (power rises each retry), and a readout shows minutes replayed and skill practised per attempt. A second tab shows the Elo line against the tier progress bar over a season, so a learner sees why the flat line was hidden.

## Part 7: 2 late-stage retention problems (slides 223-243)

**The 13% rule** (slides 226-237), effort **M**, **TOP 5**
- Teaches: notes on 226-231: WoW's items were tied to level, dungeon items got "+5 levels", raids got more, and by the end of Classic "players were running around with items 10 or even 20 levels above their actual level". Notes on 232: Kris Zierhut found that when players go weeks between upgrades, the minimum jump that feels like an upgrade is about 1/8, 12.5% or roughly 13% more total power. With about 14 usable item slots, each slot is about 1%. Notes on 233-237: the sunk cost of giving up legendaries, and transmogrification as the fix ("bring back packaging only").
- Hard as text: the rule is a threshold on a ratio, and the slides draw it as a staircase without numbers.
- Proposal: a tier ladder of item level bars. A slider sets the gap between raid tiers, and the readout shows total power gained against the 12.5% line, as "reads as an upgrade" or "reads as a sidegrade". A "weeks between upgrades" slider moves the threshold: small jumps are fine while levelling, but not after weeks of raiding. Second beat: the paper doll with 14 slots, each upgrade adding about 1%. Third beat: Thunderfury's stats go away and its look stays through transmog. Real WoW item icons.

## Part 8: 4 psychology traps (slides 244-288)

**The gold item trap** (slide 260), effort **S**, quick win (see above)

**Perverse incentives gallery** (slides 261-264), effort **S**, low priority
- Teaches: grinding in Stranger of Paradise, buying homes for Fable's best ending, resistance gear, full-heal checkpoints that don't reset enemies, auction houses where farming gold is the most efficient play. Goal (264): "make the most effective and efficient way to play as close as possible as the most fun way to play."
- Proposal: a two-axis plot of "effective" vs "fun" for each example as a dot. The designer's goal is the diagonal. Each dot animates toward the diagonal when its fix is applied.

**Analysis paralysis dials** (slides 267-274), effort **S**
- Teaches: three causes: too many options, too little difference between them, an unclear path to optimising (267). Torchlight 2 tells you what each stat does, Xenoblade Chronicles 3 doesn't (269-271). StarCraft II gives "two clear, separate and exclusive choices" (272, 274). The fix: "communicate, condense or cut".
- Proposal: a level-up screen with three dials for option count, option distinctness and stat explanations. A "time to decide" meter fills as the screen gets worse. Presets reproduce the Torchlight 2 and Xenoblade 3 screens in original art, and the StarCraft II two-way choice.

**Time pressure, three ways** (slides 276-281), effort **S**, quick win (see above)

**Reward spam** (slides 283-285), effort **S**, GIF
- Teaches: overuse of reinforcement undermines natural goals and desensitises players.
- Proposal: the same quest turn-in shown with one reward toast, then eight stacked toasts, achievement pop-ups and currency counters. A "noticed" meter falls as the screen fills.

## Small fixes spotted while reading

- Slide 6: the pronunciation "\[ˈplāər sīˈkäləjē\]" is for "player psychology", left over from the old module title.
- Slide 3 notes: "Let's begin our exploration of polish…" is copied from another deck's opener.
- Slides 20, 149, 151: "Hardercore" should be "Hardcore". Slide 20 also has a stray tab in "Design s".
- Part 5's title says "3 Ways to Shift Power Across The Skill Curve", but slide 176 lists four.
- Slide 47 notes: "models 2, the donut theory and 6, timmy, johnny spike". Timmy, Johnny, Spike is model 7.
- Slide 24 lists "12 Quantic Foundry Models", but Quantic Foundry has 12 motivations in one model.
- Slide 254 is an unfinished definition: "A cognitive bias that".
- Slide 260 notes: "5 gold every 10 seconds. Stack three, that's 180 gold a minute… over 7,000 gold". Three items at 5 gold every 10 seconds is 90 gold a minute, about 3,150 over 35 minutes. Either the rate or the totals need to change.
- Slide 127 notes are a placeholder: "Explain the mario example here". Slide 125 repeats slide 124's notes with no title.
- Slide 213 ("Opportunity to promote Dan's Systems Course") and the "New Video Recording" slides (25, 61, 94, 150, 193, 222, 243, 288) look like production markers. Slide 288 is cut to "New Video Record".
- Slide 231 notes still contain "— To remove below?" and a duplicate paragraph.
- Slide 240 repeats slide 164's line about hardcore players in the middle of the retention part.
- Slides 266, 275 and 282 each show a single bullet ("Analysis Paralysis", etc.) where the other trap headers (259) are numbered.
