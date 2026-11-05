# Module 8: Gameplay Balance: interactive and GIF proposals

Source: "DGMS - RGF C2 M8 - Balancing" (Drive 1nlCS2Y1ZdzP3zO1288nsFoDoEJ6zuwLYKBFjxAQxSv0, 438 slides). First pass 2026-11-04. Slides 1-320 were read with speaker notes, and their numbers are the export's "N of 438" numbers. The notes export stops at 320 (Part 7, comeback solutions), so the rest of Part 7, Parts 8-10 and the bonus math section were read from slide text only. Slide numbers after 320 are approximate (the text export skips blank slides) and are marked "about".

Built so far: nothing yet. The course home is `../index.html`. Related pages already built: `mgm-depth/site/depth/three-tiers/` (possibility space and the three tiers of depth, which slide 9 sends learners back to), `pvp/counter-cycles/gifs/` (rush/turtle/expand, attack/block/grab and the MOBA role cycle, which fit the counters block), and the root `resources-and-states.gif` (resource flow, which slide 125 references). The proposals below link to those rather than redraw them.

This deck is Alex's balance course: six layers of balance, seven principles, four building blocks (raw power, situational value, counters, noise), tuning, three practical techniques, six common problems, exploits, nerfs, and seven guidelines from Blizzard and Riot. Most of its examples come from League of Legends and World of Warcraft, both on the project's approved imagery list, so real champion portraits and spell icons can carry the visuals. Pokémon (164) is approved too. The deck is also unusually numeric: hits to kill, effective health, resistance curves, coefficients and comeback sizes are all formulas the slides draw with static bars, so several proposals are small calculators.

Slide 283's notes ask for exactly this: "Intensity vs frequency needs some visuals!"

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Hits-to-kill bench: same DPS, different thresholds | 117-128, 159-162 | M |
| 2 | Hammer Time: tune a shield and a charged swing | 204-216 | M |
| 3 | Three ways to grow toughness: reduction, effective health, resistance | 140-157, about 409-425 | M |
| 4 | Comeback tug-of-war: six balance problems in one race | 287-about 324 | L |
| 5 | Unfair fairness board: when is a champion allowed to dominate? | 91-109 | M |

Quick wins worth doing early even though they are not top 5:
- **The murder bears** (slides 197-199). A WoW-style GIF: a player walks toward an Elder Brown Bear on Bloodmyst Isle and drops instantly, then the editor field flips from 1000 to 1. Caption: attack speed 1000 means one attack per second, 1 means a thousand. Paired with Val'anyr, whose 2,000 shield cap was typed as 20,000 and nobody noticed. Notes on 199: "three orders of magnitude will be noticed every single time. Also. Test your work." Uses approved WoW icons (Val'anyr, a bear).
- **Stable part vs variance** (slide 185). Three dice readouts, 1d8+4, 8+1d4 and 10+1d2, each rolled 200 times into a histogram. All three have similar averages, and the learner sees the spread tighten as more of the damage is fixed. Notes: "We can get a lot of value as game designers by knowing what % of something we want to be stable and what percent we want to be unpredictable."
- **Blizzard, Valve and Riot ways** (slides 17-21). A line chart of overall power level over ten patches under each philosophy. Blizzard rotates who's on top, Valve buffs everything up (power creep), Riot nerfs the top down (characters "feel less and less powerful over time", notes on 21). A dashed target line shows the note's real point: "a good designer will recognize what power level they're trying to target." Original chart, not the comic.

---

## Part 1: What is game balance? (slides 3-33)

**Balance reclaims possibility space** (slides 6-9), effort **S**, link
- Teaches: "The craft of making two distinctly different things equally valuable" (6), so designers can "Reclaim possibility space into depth" and "Enable options that weren't viable" (7), and players "Believe the game is more fair", "Employ a wider range of strategies" and "See more of your game's content" (8). Notes on 9: possibility space is "the sum of everything that can ever happen in your game, versus all of those things that are actually relevant and useful to players."
- Proposal: no new widget. Link `mgm-depth/site/depth/three-tiers/` from the module page, with one added caption: balancing moves options from "possible" into "relevant".

**Two reworks** (slides 10-11), effort **S**, GIF
- Teaches: League's assassins had become samey: "They either blew up opponents immediately or failed and died" (10). The rework split long-range strategic stealth (Evelynn, Rengar) from short tactical stealth (Akali, LeBlanc, Talon), and spread damage over more time so they could "hit and run". Sion went from "a point and click spell bot" to timed knockups and a long-range charging ultimate: "MORE interactive, have MORE counterplay and was ultimately COOLER" (11).
- Proposal: a before/after card for each, using the champions' portraits and ability icons. The assassin card shows five portraits sorted by "stealth length" (strategic vs tactical) after the rework, all stacked on one line before it. The Sion card shows his old and new kits side by side, with counterplay chips on the new abilities.

## Part 2: 6 layers of game balance (slides 36-67)

**Six layers, and when each can change** (slides 43-63), effort **M**
- Teaches: player vs player (45-51: Sonic 2's Tails, Smash difficulty, chess first move, tennis serve, port-dependent bugs like Mr. Heart's player-2-only infinite in Fist of the North Star), character vs character (52-54: Zed and Akali, same teacher, very different play), loadout vs loadout (55-56), verbs (57: Dark Souls light/heavy/dodge/block, WoW warlock self-heals Dark Regeneration, Soul Leech and Harvest Life), weapons (58-59: Fortnite, Apex, Elden Ring) and tactics (60: StarCraft rush, economic, defensive). Slide 62 sorts them by when they can change: some "can change at will", some only between matches or sessions, and the player layer "Cannot be changed (unless you're a sports team)". Notes on 63: "player : player problems need handicaps, while character-character balance problems need to be carefully checked by designers, while deck:deck balance problems will be sorted out by the community if there are enough counter cards."
- Hard as text: slide 62 maps six layers to six change rules in a list that reads like a table but isn't one.
- Proposal: six horizontal bands, one per layer, against a timeline axis (mid-exchange, mid-match, between matches, between sessions, never). Each band's bar spans the times its choice can change, and its example icon sits on it (Zed and Akali for characters, the three warlock heals for verbs, StarCraft for tactics). Clicking a band shows who usually fixes problems in it (handicap, designer, community), from slide 63. The rush/turtle/expand GIF from `pvp/counter-cycles/` plays on the tactics band.

## Part 3: 7 balance principles (slides 70-113)

**Normal is relative to the win condition** (slides 82-90), effort **S**
- Teaches: "Something is powerful or weak relative to what is normal for that thing" (83, Gigantosaurus). Leroy in Tekken 7 "beat every other character at the thing that character should be best at" (84). Normal depends on how you win: average damage and hit chance (85, Fallout's VATS), cost vs reward for victory points (86, Catan), turns to win for alternate wins (87, Exodia). "If something doesn't bring you closer to winning, it's underpowered" (88). Pot of Greed, Black Lotus and Upstart Goblin (89-90).
- Proposal: a three-tab card, one per win condition (damage, points, alternate win), each with a "normal" band and two or three examples placed above, within or below it. Leroy sits above the band in every column at once, which is the visual for "better at everyone's best thing".

**Unfair fairness board** (slides 91-109), effort **M**, **TOP 5**
- Teaches: "Contextually Overpowered = Balanced & Memorable. Always Overpowered = Unbalanced & Unfair" (92). Notes: "if you want a game of memorable moments, you need to have situations occur where the player is the hero of the moment." Wild Rift examples: Rammus against auto-attackers (96), farmed late-game Veigar (97), a protected full-build Tristana (98), Yasuo with allied knock-ups (99), Amumu's team-wide hold (100), and the exception, Kassadin, who "dominates everyone and makes it impossible for mages to win" (101). Dark Souls III greatswords are strong in PvE against clumped enemies but not in PvP (102). Principle 7, "Purpose = Powerful & Vulnerable" (103-109): Ori's Reckless shard felt mandatory at a small bonus and became "its own play-style" when both damage dealt and taken were quadrupled (104). "Don't fear… creating those moments… Do fear… one-man do-it-all designs… universally useful designs being dominant" (108-109).
- Hard as text: six champion slides that each say "it's fine when…". The pattern only shows when you see all six on one grid with the one that breaks it.
- Proposal: a grid of champion portraits (rows) against situations (columns: early game, late game, vs auto-attackers, with knock-up allies, teamfight, vs mages). Each cell is shaded "dominant", "even" or "weak". Rammus, Veigar, Tristana, Yasuo and Amumu each have one or two dominant cells and some weak ones. Kassadin's row is dominant almost everywhere and gets a "no answer" flag. A learner can add a row and shade it, and the page flags any row with no weak cells. A side card shows the Reckless shard as two sliders (damage dealt multiplier, damage taken multiplier) moving from 1.25x to 4x, captioned with the Ori story.

**The other five principles** (slides 74-81), effort **S**, fold into the guidelines card
- Variety is important (75, League item variety), simplicity is easy but boring (77, Pokémon types expanding rock-paper-scissors), popular doesn't mean strong (79, Yasuo vs Gnar), and balance isn't as important as fun (81, Mario Kart 8 Deluxe's Bullet Bill: "so much fun to use! So much so, players might even forget they were far behind"). One summary card each, with the approved Pokémon type icons on the simplicity card and a Super Mario Bros. Bullet Bill sprite on the fun card.

## Part 4: 4 fundamental building blocks (slides 115-193)

**Hits-to-kill bench** (slides 117-128, 159-162), effort **M**, **TOP 5**
- Teaches: "Frequency × Intensity = Throughput" (118). Two characters both deal 25 DPS, one hitting 25 every second, one 50 every two seconds (120). "It LOOKS balanced, but it's actually not" (121). The real measure is hits to kill: a 100-damage attack needs two hits for 150 or 200 HP, but three for 205 (122). Notes: "This is the concept of thresholding - and is the practical measure of balance." Ori had pre-defined hits to kill per monster per weapon (123), and priced spirit light upgrades by giving each a weight and dividing each zone's total spirit light by its weighted purchases (126-128). Situational value (160-162): "25 DPS is not the same as 2 hits for 25 and 1 hit for 50."
- Hard as text: the threshold jump (200 vs 205 HP) is the lesson, and it's a step function. A slider over HP makes the step obvious in a way a table doesn't.
- Proposal: two attackers with editable damage and interval, and an enemy HP slider from 1 to 400. A step chart plots hits to kill and time to kill against HP for both attackers, so the learner sees where their steps fall out of line even at equal DPS. A marker sits on 150, 200 and 205 from slide 122. A second tab is the Ori pricing table: zones as rows with spirit light earned, upgrades with weights, and the computed price per upgrade. Edit a weight and every price updates. This also answers slide 283's request for an intensity-vs-frequency visual.

**Effective damage** (slides 131-139), effort **S**, fold into proposal 1
- Teaches: "how much damage can you deal before the enemy kills you?" (132). Melee 1200 HP and 125 DPS, ranged 1000 HP and 100 DPS, against a monster dealing 100 DPS: melee survives 12 seconds and deals 1500, ranged survives 10 and deals 1000. "With just 20% more HP and 25% more dps, the Melee character will deal 50% more total damage" (137).
- Proposal: a third tab on the bench: two health bars draining under the same 100 DPS while each character's damage counter climbs, ending at 1000 and 1500. Sliders for HP and DPS show how the two percentages multiply (1.2 × 1.25 = 1.5).

**Three ways to grow toughness** (slides 140-157, plus the bonus math about 409-425), effort **M**, **TOP 5**
- Teaches: 1% damage reduction means taking 99 instead of 100; 1% effective health means dying after 101 instead of 100 (142-143). They feel similar but grow differently: 50% reduction doubles survival, 100% makes you immortal (146-148), and surviving 400 needs 75% reduction (149). Effective health just keeps adding: +300% survives 400 (151-153). Drawbacks of reduction: "Math gets very complicated", players can't tell how much stronger they're getting, and "The numbers feel less and less impressive as you upgrade" (150). The fix is a resistance formula: "Damage Taken = 100 / (100 + Resistance)", where 50 resistance is +50% effective HP, 100 is +100%, and -50 is -50% (156). The bonus section repeats it as S = (armor + 100) / 100 and adds linear, exponential, geometric, logarithmic, level-up and arctangent curves, with "you never use these formulas in the game engine" (about 417).
- Hard as text: three nearly identical bar diagrams per model. The curves are the point, and they're three lines on one chart.
- Proposal: one slider for "upgrade points spent", and a chart with three lines for survivable damage: damage reduction (curving up to infinity at 100%), effective health (a straight line) and resistance (a straight line in effective HP, with diminishing damage-taken percentages shown on a second axis). A readout under each line shows what the tooltip would say to the player ("+5% damage reduction" at the top end vs "+5 resistance"), so the "less impressive as you upgrade" drawback is visible. A second tab is the bonus curve gallery: each curve family drawn with its "best for" and "downside" line from the bonus slides.

**Counters and counterplay** (slides 168-182), effort **S**, link plus one GIF
- Teaches: hard counters "Clearly defeat the opposing mechanic" and soft counters "Situationally defeat the opposing mechanic" (169). Examples: Under Night In-Birth (170), StarCraft's cloaked units and detection (171) and marines vs zerglings in formation (172), Warcraft Rumble's melee > ranged > fliers (173). "A mixed strategy will beat a pure strategy" (174). Power should match rarity: bursts and supers are rare and strong, grapplers get stronger grabs for weaker combos (175). Makoto's 3rd Strike combo: "You think this full healthbar matters? Akuma is already dead" (176-177). "The higher the counterplay potential, the more powerful the skill can be!" (181).
- Proposal: reuse the attack/block/grab and rush/turtle/expand GIFs from `pvp/counter-cycles/gifs/` for hard counters. Add one new GIF for "power vs counterplay": a scatter with counterplay potential on one axis and allowed power on the other, with a few League abilities placed on it by their icons (a long-telegraph skillshot high on both, a point-and-click stun low on counterplay and so lower on power).

**Tradeoff budget** (slide 193), effort **S**
- Teaches: "High Health usually means low damage, or poor speed", "Self healing usually means small health pools", snipers come with uncertainty, and short range comes with gap closers. Notes: "Every plus should come with one or two minuses. Power at a price."
- Proposal: a character card with six stat sliders and a shared budget. Raise one and the budget meter asks for a minus elsewhere. Presets for the four tradeoffs on the slide. Small, and reusable by the Module 4 champion dossier.

## Part 5: Tools for tuning (slides 196-243)

**Hammer Time** (slides 204-216), effort **M**, **TOP 5**
- Teaches: a made-up game where shielded enemies take a regular swing (1 damage, 1 time) or a charged swing that always breaks shields. Version by version (205-212): with a 1-hit shield and equal time costs, the charged swing is pointless. Make it cost 2 time and it's "completely worthless". Raise the shield to 2 hits and they're "exactly equal". At 3 hits the charged swing finally wins, 2 time against 3. Notes on 207: "This is called Multivariable analysis. You change ONE variable at a time and look at how it affects the RELATIONSHIP BETWEEN EVERYTHING ELSE." Notes on 211: a new mechanic needs to be "at least 30% better than the standard" before people try it, and "at least 12.5% better" before they stick with it. Notes on 212: when players still don't use it, "do we KEEP increasing the shield health by only one hit…? NO! We're going to DOUBLE it." Slide 213 checks it against clarity, motivation and response. Slide 214: in WoW, "Break" was dispel.
- Hard as text: eight slides of the same block diagram with one number changed each time. That's a slider.
- Proposal: the enemy (health blocks and shield blocks) and the two swings (damage, time cost, break) as editable values. A timeline under them plays out "spam regular swing" against "charged swing then regular" and reports total time to kill for each, with the winner and the margin as a percentage. Two dashed thresholds on the margin bar mark 12.5% ("players keep using it") and 30% ("players try it"), from the notes on 211. Version buttons (v1 to v5) load the deck's steps in order. A "double it" button doubles the shield to illustrate 212's bracketing method. The final card shows the WoW dispel icon: "You just designed dispel."

**Four-part tuning checklist** (slides 216-234), effort **M**
- Teaches: define things in relation to each other (218-220: WoW never set HP by hand, but as a multiplier of the level's standard, so 1.0 is normal, 15 a dungeon monster and 150 "almost certainly a raid boss"), consider spike and throughput side by side (222-223: skill 2 hits twice as hard, but "Can I use skill 1 3 times for every skill 2? Flip the bars around and chart them over time"), base and scaling (225-232: coefficients of ½ for a 1-second skill and 1 for a 2-second skill keep scaling proportional to cast time, and the same logic covers WoW's overlapping DoTs), and math is imperfect (234: Wyatt Cheng's "Any skill, no matter how poor for the game, will be found appealing if it's sufficiently overpowered", and the FPS shotgun that players called weak until it got a louder sound).
- Proposal: four tabs. Tab 1 is a creature list with HP shown as multipliers, and a toggle that reveals absolute HP at a chosen level. Tab 2 is the flip: two bars (spike) that rotate into two timelines (throughput) over 6 seconds. Tab 3 is a yin/yang power-up counter with two skills; a coefficient toggle switches between "both scale fully" (skill 1 pulls ahead, 8 vs 6 total power) and "coefficients by cast time" (both 6). Tab 4 is the shotgun story as a two-frame card with a sound icon.

**Binary plus analog** (slides 236-241), effort **S**
- Teaches: think of skills independently of tuning, then expand each keyword with knobs (237). Build-up systems delay a binary effect until a threshold, "effectively an HP value specifically for this status condition", which is how Dark Souls poise works (238). "Always mix binary keywords with an analog effect" (239). "Usually true" practices: keep values relatable (A Link to the Past's sword did 1-4 damage, WoW ran from 1 to over 1,000,000), double or halve until you know the bounds, "Large numbers will hide weak designs", compare early, mid and endgame values (240-241).
- Proposal: a status bar that fills with each "break" hit and triggers a stun at the threshold, beside the same effect as an instant binary. Threshold and decay sliders. It reuses the Hammer Time enemy.

## Part 6: 3 practical balancing techniques (slides 246-283)

**Failsafes, floors and ceilings** (slides 250-283), effort **M**
- Teaches: failsafes for worst cases (252-271): overbuffing (255-257, Lee Sin, and WoW buffing less popular PvP specs), embrace weakness (258-262: Robin Walker on TF2 classes, and Alex's Xerath, who got slower and longer-ranged instead of the escape the forums asked for), full reset (263-266: the Karma rework that "had no gaps in her playstyle" and was "difficult to nerf"), and in-game failsafes like stalemate breakers in Legends of Runeterra, Grievous Wounds vs lifesteal and Banshee's Veil, and Fortnite's safe zone (268-270). Raising the floor (272-275: League's regen changes). Lowering the ceiling (276-280: Caitlyn's headshot resets, flash during spellcasts, internal cooldowns on proc effects). Checklist (283): direct comparison in the same units, intensity vs frequency, push for uniqueness, ensure responses survive, "Violate Balance Purposefully".
- Proposal: a skill-level distribution curve (beginner to pro) with a champion's win rate drawn across it. Three buttons apply the techniques: raising the floor lifts the whole line, lowering the ceiling only trims the right end, and an overbuff lifts everything then fades back over a few "patches". Each button shows its League example by icon. The embrace weakness and full reset cases sit as two side cards with Xerath's and Karma's portraits.

## Part 7: 6 common game balance problems (slides 287-about 324)

**Comeback tug-of-war** (slides 287-about 324), effort **L**, **TOP 5**
- Teaches: slippery slope (290-299: StarCraft and Lanchester's laws, Rainbow Six Siege teammates, tag fighters), and its four fixes: equal footing, rubber banding (Mario Kart items), "Prevent Infinite Disadvantages" (a Street Fighter knockdown that ends on wakeup), and "Prevent Infinite Advantages" (meter isn't permanent). Lame duck (300-303: Yu-Gi-Oh! with 9 of 10 zones locked; allow forfeits or end the game sooner). Kingmaker (304-306: prevent targeting or remove losing players). Perpetual comebacks (307-309: Super Puzzle Fighter II Turbo's gems going back and forth; "make sure exchanges always advance the game closer to the victory condition"). Rollover comebacks (310-about 321: Marvel vs. Capcom 3's X-Factor Vergil, Smash 4 rage, Tekken's Rage Art, with the fixes "Don't Let Players Win By Losing!", "Comebacks Should Be Proportional to the Gap", "Comebacks Should Only Happen When a Gap Exists" and "Don't Let a Comeback Become a Slippery Slope"). Solvability (about 322-324: Connect Four and tic-tac-toe; hide information, randomize or make it complex).
- Hard as text: every one of these is a feedback loop over time, which a single slide can't show. Running the same match under different rules is the whole lesson.
- Proposal: two simulated players on a tug-of-war rope (or two health bars) playing a few hundred exchanges, with a rule panel: snowball strength (loser loses power), rubber band (bonus to the trailing player), comeback size (flat or proportional to the gap), comeback only while a gap exists, and forfeit threshold. A trace chart shows the lead over time. Presets reproduce each problem: slippery slope (the lead runs away), perpetual comeback (the trace oscillates and never ends), rollover (a flat comeback bigger than the gap flips the lead and runs away the other way), and lame duck (the result is decided long before the match ends, with a "decided at" marker). The proportional fix from 313-319 (22 vs 90 HP earns +29) is the default good-practice preset, named "proportional comeback" on screen.

## Part 8: Balancing exploits (about slides 329-359)

**Exploit triage** (about slides 329-359), effort **S**
- Teaches: an exploit is "A game feature used in an unintended way that is favorable for the player or unfavorable for their opponent". "News Flash: Exploits Happen." To fix or not depends on four boundaries: frequency, severity, reliability and outcome, and whether the outcome is "Skillful or Tedious". Behaviour changes to watch: a change in play pattern, undermining the core loop, inconsistent disruption, tedium, or new decisions (Destiny's loot cave). Other considerations: attachment (League's Flash + Dash, WoW mountain climbing, Gunz: The Duel's animation canceling) and complexity ("More Moving Parts = More Exploits", Breath of the Wild's flying machines). "Exploits can undermine the spirit of your game or reinforce it."
- Proposal: a triage card. Pick an exploit (the deck's five, or type your own), then rate it on the four boundaries and the five behaviour changes, plus attachment. The card doesn't give a verdict; it lays out "reasons to fix" and "reasons to keep" columns, because slide about 346 says "You must rely on your judgment."

## Part 9: 5 tips to balance nerfs (about slides 362-384)

**Nerf guidelines card** (about slides 362-384), effort **S**
- Teaches: a nerf is "To reduce in effectiveness, usually through power reduction or narrowing of situational viability." Guidelines: try not to nerf first ("nerfs can nullify their time investment"), nerf what has no answer, identify problems and troubleshoot, solve the problem you're actually working on (Dark Souls backstabs across several games), and top players play favourites.
- Proposal: a five-step card that walks one example (a League champion with a "no answer" ability) through the guidelines, ending with the narrowest change. It can share layout with the exploit triage card.

## Part 10: 7 guidelines from Blizzard and Riot (about slides 388-407)

**Seven mantras** (about slides 388-407), effort **S**
- Teaches: Concentrated Cool ("Combine 3 weaker ideas into 1 stronger idea", WoW warlock design), Purity of Purpose (the warlock revamp: drains and fears, demons and transformation, fire and heavy magic), Bite Sized Fun (Hearthstone cards), Counterplay is Core ("Gluing solutions on later will be clunky and awkward (see: WoW PvP)"), Control is King, Balance is Ongoing, and Don't !@#$ the Player. Final takeaways (about 405-406), including "Use statistical analysis to find problems; use players to figure out why it's a problem."
- Proposal: seven summary cards in the course style, using WoW warlock spec icons on the two warlock cards. The Purity of Purpose card shows the three warlock specs as three tight icon groups, which is the slide's diagram made legible.

## Small fixes spotted while reading

- Slide 1 is marked "INTERNAL ONLY SLIDE".
- Slide 134 labels the ranged character "1200 HP / 100 DPS = 10 seconds". It should be 1000 HP.
- The notes on 137 still hold Adam's review comment ("I think there's a slight conceptual error in that statement…"). It's a fair point (in the same 10-second window, melee deals 25% more, not 50%; the 50% is over each character's own lifespan) and is worth resolving into the narration, then removing.
- Slide 138 is an authoring note on a slide face: "Should I add a ranged scenario or will that complicate things? ( think I'll do a drill)".
- Slide 149: "I would have to give them +25% damage reduction - or 75% damage reduction total. Also, it would need to be 25% ADDITIVE damage reduction or 75% MULTIPLICATIVE damage reduction." From the 50% example, it's +25 points additive or a further 50% multiplicative (0.5 × 0.5 = 0.25 taken). "75% multiplicative" doesn't fit.
- Notes on 185: "the 1d8, which is damage 5-12". The 1d8 is 1-8; the whole roll is 5-12. "Guaranteeing 33% of the damage" is true of the maximum (4 of 12); of the average (8.5) it's about 47%.
- Notes on 211 give adoption thresholds (30% to try, 12.5% to stick). They'd be stronger with a source or "in my experience".
- Slides 105 and 261 are video placeholders ("Show gameplay clip(s) of Ori…", "Video of Xerath playing league if possible").
- Notes on 283: "Intensity vs frequency needs some visuals!" (proposal 1 covers it).
- Slide 30 says "noticeable in-balance is bad". "Imbalance", and in any visual made from it, use "noticeable imbalance pushes players away" instead.
- Slide 80's title is "Balance Isn't as Important as Fun!" but slide 73's list says "Balance is not as important as fun"; slide 78 says "Popular Doesn't Mean Strong" while 73 says "Popular is not overpowered". Minor, but the summary should match the slide titles.
- The comic on 17-21 is explained again on 93. One of the two could go.
- Typos: "Evelyn" (Evelynn, notes on 10), "if its it sufficiently overpowered" (234), "in out imaginary game" (214), "you game" (268), "there surely many more" (271), "interchangable" (58), "tho" (59).
