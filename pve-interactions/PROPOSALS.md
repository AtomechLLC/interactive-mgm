# PvE Interactions: interactive and GIF proposals

Source: "MGM C4 M5 - Fundamentals for Designing Engaging PvE Interactions" (204 slides, read 2026-10-27 with speaker notes via `/htmlpresent`). Slide numbers below are the deck's own numbers.

Already built, so left out: the 14 hazard pattern GIFs and themed meta-GIFs (slides 186-199) and the Mario enemy counters GIF (slide 76, Start/Opposition/Goal).

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Enemy composer (compositional design) | 42, 45 | M |
| 2 | Resistance corridor: types and strength threshold | 74-84 | M |
| 3 | Escalate numerically vs contextually | 126-133, 148 | M |
| 4 | Hazard builder: trigger, effect, recovery | 176-177 | M |
| 5 | Framework map that grows with the course | 30 + 15 recurring framework slides | S-M |

Quick win worth doing early even though it is not top 5: **WoW mechanical counters** (slide 96). The speaker note says outright "these concepts don't have good visuals, so just explain".

---

## Part 1: What is PvE and why it matters (slides 3-19)

Mostly motivation and setup. Low priority.

**Quality x Quantity = Engagement** (slides 7-8), effort **S**, low priority
- Teaches: engagement is the product of content quality and content quantity, which means you need a lot of engaging content.
- Hard as text: "x" reads like "and". Novices miss that zero on either side gives zero.
- Proposal: two sliders feed a bar for engagement and retention, and a third readout shows "content pieces to build". Pushing quality to zero collapses the bar no matter how much quantity there is.

## Part 2: Engaging Enemy & Environment Design Framework (slides 20-33)

**Framework map** (slide 30, and its progressive reveals on 35, 48, 53, 55, 56, 67, 73, 83, 84, 99, 113, 116, 125, 135, 149, 169), effort **S-M**, **TOP 5**
- Teaches: nine aspects in three pillars, and each column is a causal chain (Role → Interactions → Uniqueness; Resistance → Opportunity → Memorability; Lessons → Escalations → Permutations).
- Hard as text: the grid reads as a checklist of nine buzzwords. The arrows of cause ("roles provide the pathway to interactions", "resistance, if strong enough, creates opportunity", "the ✗ when resistance is not strong enough") are spoken, not shown.
- Proposal: one interactive map where clicking an aspect shows its evaluating question from the notes and lights the chain it feeds. A "break a link" toggle shows slide 83's failure: weak resistance greys out Opportunity and Memorability. Also export one short GIF per reveal step to drop onto the 15 recurring slides.

**Ori lizard: over-design** (slide 29), effort **M**, medium priority
- Teaches: piling modes onto an enemy (jumping, shell mode, lure into wall) serves the designer, not the player, and makes it hard to place.
- Hard as text: novices think more features = better enemy. The cost (fewer rooms it fits in, less player agency) is invisible.
- Proposal: add feature chips to an enemy one at a time and watch a strip of level rooms grey out as each feature's placement requirement fails, while a "player agency" meter drops. Ends with 4-5 months of work and a cut stamp.

**Punching bag vs genius AI** (slides 22-25), effort **S**, low priority
- Teaches: neither extreme makes fun PvE; both have a place.
- Proposal: a slider from "punching bag" to "ultra intelligent" plays the same short fight loop. Ends are boring or hopeless, the middle shows readable tells the player can exploit.

## Part 3: Purposeful (slides 34-64)

**Enemy composer (compositional design)** (slides 42, 45), effort **M**, **TOP 5**
- Teaches: Mario enemies are built from one movement rule plus two interaction results (stomp, fireball). Swapping a single result makes a new enemy (Koopa → Spiny → Buzzy Beetle). Slide 45: same behaviour with different timing feels different (Piranha Plant vs Lava Bubble).
- Hard as text: the slide is a dense 12-card table. Novices see a chart, not a recipe, and don't see the reskin test it enables (slide 44 notes: "ensure you're creating true variety and not a reskin").
- Proposal: pick movement + stomp result + fireball result from three dropdowns. A sprite plays it, and a readout names the matching Mario enemy, or says "new enemy" or "reskin of X". A timing slider on the up/down patrol morphs Piranha Plant into Lava Bubble. Reuses the `RULES` table and sprites from `enemy-counters/counters.js`.

**Nintendo model: Introduce, Escalate, Permutate, Both** (slide 40), effort **S**
- Teaches: the four-step ladder, with Goomba, Koopa, Red Koopa, Spiny as examples from the notes.
- Hard as text: the four labels are abstract until you see each step change what the player does.
- Proposal: four-panel GIF using the existing Mario sprites, each panel showing the enemy and the one new player response it demands (stomp, kick shell, time the ledge turn, don't jump).

**Every tool has a target** (slide 41), effort **S**
- Teaches: enemies exist so players use all their mechanics (stomp, fireball, star). Notes contrast an FPS where any weapon works on any enemy.
- Hard as text: "samey" is a feeling. Novices don't feel it from a sentence.
- Proposal: tool vs enemy matrix you click through. A "samey mode" toggle sets every cell to "works" and the matrix turns flat grey, showing the lost texture. Extends the enemy-counters page rather than a new one.

**Roles across genres** (slides 48-52), effort **S-M**
- Teaches: roles (RTS peons/soldiers/archers/casters, MOBA tanks…mages, ARPG brutes…enchanters) and that roles shift by genre. Notes: tank/healer/DPS is a poor model for monster design.
- Hard as text: three long bullet lists with the definitions only in notes.
- Proposal: genre tabs over the same small battlefield. Each role is an icon with its one-line job from the notes, and hovering shows what it asks the player to do. A "line up" view shows which roles in different genres fill the same slot (soak, ranged threat, disrupt, empower).

**Silhouette and response-set test** (slides 57-61), effort **S**
- Teaches: is an enemy unique? Check silhouette, response set and toolkit.
- Hard as text: "unique silhouette" is easy to agree with and hard to judge.
- Proposal: a line-up quiz. Round 1 shows black silhouettes of original enemies and asks which is which. Round 2 shows two enemies with the same response set to show "looks different, plays the same". Original art, not Horizon models.

**Interactions palette** (slide 54), effort **S**, low priority
- Proposal: an ally/enemy/environment card sort where students drop verbs (rescue, immobilize, corrupt, activate) onto a sample enemy. Better as a workshop exercise than a lecture visual.

## Part 4: Challenging (slides 66-111)

**Resistance corridor: types and strength threshold** (slides 74-84), effort **M**, **TOP 5**
- Teaches: resistance slows players down and must force a change in play pattern. The examples are kill it (Doom), avoid it (Tree Sentinel), backstab (Black Knight), take cover (Halo snipers) and switch targets (XCOM). Slides 82-83: if resistance is too weak, uniqueness never shows.
- Hard as text: five screenshots of different games. The common thread (the player's path changes) is only in the narration.
- Proposal: one top-down corridor from start to goal. Pick a resistance type and watch the player's path redraw: straight, detour, sneak behind, cover hops, shoot the support first. A strength slider: below a threshold every type collapses to the same straight "just shoot it" path, and the enemy's unique tell greys out (slide 83's ✗).

**Flow channel** (slide 69), effort **S**, high priority
- Teaches: challenge must rise with skill; too easy is boring, too hard is frustrating.
- Hard as text: the static diagram is familiar, but novices don't see that a flat difficulty curve exits the channel once skill grows (slide 68: "content cannot be the same all the way through").
- Proposal: player skill rises over time; drag control points on the challenge curve and a dot travels it, turning blue (bored) or red (frustrated) outside the channel. Presets: flat, spike, staircase with escalations.

**WoW mechanical counters** (slide 96), effort **S**, quick win
- Teaches: simple hard counters (dispel removes magic buffs, remove curse, cleanse poison, interrupt spell bars) give each class a target to watch.
- Hard as text: the speaker note says these "don't have good visuals". Four arrows on a slide.
- Proposal: a boss applies a random effect every few seconds (buff icon, curse, poison, cast bar). Students press the matching counter in time; misses stack up. Optional class selector greys out counters the class lacks, which links to "bring a valuable purpose".

**Three baseline opportunities: timing, targeting, movement** (slides 85, 89-90), effort **M**
- Teaches: most opportunity comes from timing windows, target choice and movement; anything beyond needs advanced mechanics.
- Proposal: three 10-second micro-challenges side by side (hit during the tell window, pick the weak spot, step out of the telegraph). One GIF of all three for the slide plus a playable version.

**Safety dance** (slide 88), effort **S**
- Teaches: an environmental pattern (Heigan's lava floor sections) as an opportunity to show awareness and timing.
- Proposal: top-down GIF of a floor in four lanes erupting in a sweeping pattern while a player dot dances to the safe lane. Original art; could reuse the hazards.js renderer.

## Part 5: Growing (slides 112-152)

**Escalate numerically vs contextually** (slides 126-133, 148), effort **M**, **TOP 5**
- Teaches: escalation raises stakes after a lesson. Numeric escalation (more HP and damage, Risk of Rain) vs contextual escalation (same stats, harder placement: narrow corridor, darkness, Dark Souls). Slide 126 asks whether stat changes alter the play pattern or only the risk. Slide 148 contrasts escalation with permutation.
- Hard as text: this is the slide 126 question, and novices answer it wrong. They assume more HP means harder in an interesting way.
- Proposal: the same enemy and player. Numeric sliders (HP, damage, attack speed) leave the player's response pattern identical and just stretch the fight. Context toggles (corridor, darkness, ledge, second enemy) visibly change the player's options. A third "permutate" button changes a rule (gains a ranged attack) to show slide 148's distinction. A "pattern changed?" readout answers slide 126 live.

**Permutation stacking: combos that help, clash or kill** (slide 136), effort **M**, high priority
- Teaches: some enemy mixes stack nicely, some fight each other, some create impossible situations. Notes: Defias Pillager fireballs plus a net-thrower was a guaranteed death for melee.
- Hard as text: the three outcomes are abstract until you see one.
- Proposal: pick two enemies and a player class (melee or ranged). A short simulation plays out and stamps "stacks", "clashes" (two grapplers blocking each other) or "impossible" (net + fireball vs melee). Presets reproduce the notes' examples.

**Elite modifier roller** (slides 138-142), effort **S-M**
- Teaches: procedural permutation keeps a learnable base moveset while adding a twist (Diablo III illusionist fakes, SC2 mutators, Dead Cells elites).
- Proposal: a base enemy with a "roll elite" button that adds one modifier (illusion clones, shielding, fast, explodes on death). A side panel lists which of the player's learned responses still work.

**Lesson ladder** (slides 117-123), effort **M**, medium priority
- Teaches: enemies must teach before they test (Lizalfos then Iron Knuckle; dungeons that end in a boss that tests their lessons; Mario 1-1).
- Proposal: an original side-scroller strip in three beats: safe introduction, isolated test, combined test. Annotations show what each beat teaches. A toggle swaps in a "pop-up tutorial" version (slide 119, Doom Eternal) where the player stops experimenting. Original level, not 1-1.

## Part 6: Environmental hazards (slides 154-171)

**Distortion of behaviour: shrinking tiles** (slides 161-166), effort **S**
- Teaches: hazards disrupt comfortable habits and raise awareness. Slide 166: shrinking tiles ask for nothing new, just speed.
- Proposal: GIF of the same tile path walked twice: once at leisure, once with tiles shrinking behind and ahead, with a "habit" meter dropping and an "awareness" meter rising.

**Hazard purpose card** (slide 170), effort **S**, low priority
- Proposal: pick one of the 14 pattern GIFs and fill in Purpose / Challenge / Growth from dropdowns. Better as a workshop worksheet than a lecture visual.

## Part 7: Scaling technical design (slides 173-182)

**Hazard builder: trigger, effect, recovery** (slides 176-177), effort **M**, **TOP 5**
- Teaches: every hazard is trigger → effect → recovery (reset or destroyed), and each part is reusable (Skyrim pressure plates firing wall spikes or a swinging spiked door).
- Hard as text: the slide is a three-box flow. The payoff, that the parts mix and match, is only in the notes.
- Proposal: three slot pickers. Trigger: pressure plate, tripwire, timer, switch, proximity. Effect: wall spikes, swinging door, flamethrower, boulder. Recovery: reset after N s, destroyed. The scene plays the combination, and a counter shows "3 parts built, N hazards made". Reuses hazards.js art and ENV skins.

**Same hazard, many skins** (slide 179), effort **S**
- Teaches: one instakill zone shown as spikes, lava or water (Mega Man X) keeps production cheap and still feels different.
- Proposal: one kill-zone hitbox with a skin switcher cycling spikes, lava, water and acid, while a code panel beside it stays identical. GIF version for the slide. Direct reuse of `ENV` in hazards.js.

**Spot the mimic** (slide 181), effort **S**
- Teaches: similar shapes, different results. Small tells separate a mimic from a safe chest, and it reuses the art asset.
- Proposal: a row of chests, a few of which have subtle tells (chain direction, drool, slight breathing). Click to open; mimics bite. Reveal mode outlines the tells.

## Part 8: 14 hazard patterns (slides 184-199)

Done. One small addition: **pattern contact sheet** for slide 185, effort **S**, a 1280x720 grid of all 14 pattern loops playing together as an overview before the deep dive. `tools/record.js --sheet` may already cover most of this.

## Closing (slides 200-204)

Nothing worth animating.
