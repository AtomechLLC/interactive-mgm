# Composition: Techniques to Scale Engaging Gameplay Design: interactive and GIF proposals

Source: "MGM C4 M7 - Techniques to Scale Engaging Gameplay Design" (Drive 1LI7XwvCSMh5rcPnvmNQ0vDhMoSplvKDFMOXSJkDGA-c, 275 slides), the final module of Mastering Game Mechanics. Read 2026-10-29 from the full PDF export (every slide viewed) and the speaker notes via `/htmlpresent`. Slide numbers below are the `/edit#slide=N` numbers; the deck's own footer counter reads one higher (slide 2 shows "3 of 275"). Quotes marked "notes" come from the speaker notes.

Nothing is built for this deck yet.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

Format: **G** = slide-ready GIF (1280x720, recorded from a page), **I** = interactive page on the site. Most interactives also yield a GIF for the deck.

Rules followed: no slide numbers inside rendered visuals; no "good"/"bad" in labels (use "holds", "breaks", "covered", "gap", "solves", "costs" and so on); real imagery where the project allows it (WoW spell icons, LoL portraits, Pokémon, Mario sprites, game-icons.net). Doom Eternal, Hades, Sekiro, Street Fighter and Smash appear in the deck but are not on the project's imagery list, so those proposals use game-icons.net silhouettes plus the game's name as a caption, unless you say otherwise.

## Module map

| Part | Slides | Topic |
|------|--------|-------|
| 1 | 1-19 | Intro: depth at scale, the industry "open secret", players vs studios |
| 2 | 20-45 | What is composition: deconstruction, decomposition, toolbox, Lego bricks, source/target fire example |
| 3 | 46-76 | Decomposition example: four fighting game abilities, Purpose / Payload / Packaging, keywords |
| 4 | 77-108 | Designing three abilities: Siphoning Strike, Smothering Smoke, Restoring Rain vs the Flame Demon and Lightning Mage |
| 5 | 109-141 | Refining them: skill expression, 3Cs, game feel, balance, tutorialization |
| 6 | 142-188 | Enemy creation framework: archetypes, creatures, variants; structured vs unstructured frameworks |
| 7 | 189-227 | Composition across systems: BotW alchemy, loot, skill trees, Doom Eternal encounter archetypes, design skeletons |
| 8 | 228-260 | Combining frameworks: counter circle x teamplay timing = the 9 fundamentals of action games, No Rest for the Wicked |
| 9 | 261-275 | What's next: final advice, course map, thanks |

## Top recommendations

| # | Proposal | Part | Slides | Effort | Format |
|---|----------|------|--------|--------|--------|
| 1 | Ability forge: Purpose, Payload, Packaging vs the Flame Demon and Lightning Mage | 4 | 77-105 | L | I + G |
| 2 | Souls archetype composer: three behaviors, one creature | 6 | 155-173 | L | I + G |
| 3 | Nine fundamentals grid with a moveset audit | 8 | 243-255 | M | I + G |
| 4 | Three dials: change one of Purpose, Payload or Packaging | 3 | 57-65 | M | I |
| 5 | Keyword reach: one new ability, many free interactions | 4 | 104-105 | M | I + G |
| 6 | Doom Eternal encounter swapper: two nested frameworks | 7 | 202-214 | M | I + G |

Quick wins (GIFs, under a day each, worth doing even if they are not top 6):
- **Paladin or turtle?** (slides 171-173). Same three archetypes, two creatures; the heal zone follows the paladin but trails behind the turtle.
- **Strip the packaging** (slides 238-240). Attack / throw / block fighters fade to grey boxes, then to the Offense / Defense / Prediction circle.
- **Souls archetype gallery** (slides 158-166). Seven two-second top-down loops, one per archetype, with each attack area drawn.
- **One element, four targets** (slides 37-40, 73). WoW Fireball, Hellfire, Cauterize and Flamestrike drop into a Source x Target grid.
- **Two views of one bestiary** (slides 6-7). Players see twelve different enemies; a "studio view" toggle reveals the same colored parts reused.

---

## Part 1: Why depth at scale (slides 1-19)

**Two views of one bestiary** (slides 6-7), effort **S**, G, **quick win**
- Teaches: deep content serves players (variety, each element feels different, reinforces fantasy) and studios (retention, cost-effective because parts are reusable).
- Hard as text: two bulleted boxes, and the link between them (the same parts make both happen) is never drawn.
- Proposal: a grid of twelve enemies with icons. Caption "What players see: 12 enemies". The view flips to "What the studio built: 5 parts", and each enemy breaks into colored part chips; the same chip colors recur across the grid.
- Game: Mario enemies from the existing composer sprites, or a WoW dungeon roster.

**Depth or scale, rarely both** (slides 5, 9, 216), effort **S** (G) or **M** (I)
- Teaches: notes on 9: "have your cake and eat it too". Hand-making each item gives depth, mass-producing gives scale, composition gives both.
- Option A, GIF: a chart with "Content count" across and "Relevant depth per item" up. Three paths grow over time: handcrafted climbs high but stops early, reskins run far but stay low, composed content climbs and keeps going. Labels name the approach, not a verdict.
- Option B, interactive: a labor budget slider and a method picker (handcraft, reskin, compose). The funnel from the depth module (`depth/three-tiers/`) redraws with the resulting possibility space, differentiated depth and relevant depth.
- Recommendation: GIF A. Slide 216 already reuses the depth funnel, so Option B is a cheap extension of the existing page if you want it.

**Industry open secret reveal** (slide 4), effort **S**, G, low priority
- Proposal: a WoW talent tree, a LoL champion grid and an MTG card fan each "x-ray" into the same part chips. A teaser for the whole module. Skip unless the opening needs motion.

## Part 2: What is composition (slides 20-45)

**Black box decomposer** (slides 33-36), effort **M**, I + G
- Teaches: decomposition breaks one piece of content into composite parts, and repeating it across a game fills "the game's toolbox of components" (notes on 35).
- Hard as text: the slide shows "?" boxes and shapes, which is abstract until learners crack open a real item.
- Proposal: a shelf of "?" boxes: Mario's Super Star, WoW Fireball, Pikachu's Thunderbolt, Dark Souls Estus Flask, a LoL Doran's Blade. Clicking one splits it into labeled parts (Source, Target, Mechanic, Duration, Trigger). Each part drops into a toolbox tray; parts already in the tray pulse instead of duplicating, so the tray stays small while the decomposed list grows. A counter reads "items opened 5, unique parts 9".
- Recommendation: build. It pairs with the next proposal as one page ("take apart, then put together").

**Toolbox to composite** (slides 38-39, 41-42), effort **S** (G) or **M** (I)
- Teaches: composition is "exploring different combinations of properties"; reusable and repurposable.
- Option A, GIF: the slide's own shapes. Shapes leave the toolbox in groups of three and assemble into composites, then the same shapes regroup into a different composite.
- Option B, interactive: drag parts from the decomposer's toolbox to build a new item; the readout names a real item it matches (Hellfire, Bloodlust, Rain Dance) or says "new item". A combinatorics line shows "9 parts, 3 slots: 84 combinations".
- Recommendation: B as the second half of the decomposer page; A only if the deck needs a standalone loop.

**Lego bricks** (slides 30-31), effort **S**, G, low priority
- Proposal: the same six bricks snap into a Goomba silhouette, scatter, then snap into a Koopa. Charming, but the composer GIFs already say this.

**One element, four targets** (slides 37, 40, 73), effort **S** (G) or **M** (I), **quick win**
- Teaches: notes on 40: "a bunch of different ways to use fire". Source Self, Target varies: Hellfire (self), Fireball (enemy), Cauterize (ally), Pool of Flames (environment). Notes on 73: changing the target of a heal from ally to self turns it into "a self bandage concept". Slide 37 recalls the Super Star as Self to Self empowerment.
- Option A, GIF: the slide's Source x Target grid. WoW spell icons drop into each checked cell: Hellfire (self), Fireball (enemy), Cauterize (ally), Flamestrike or Rain of Fire (environment). Then the mechanic swaps to Heal and the row refills: Bandage (self), Flash Heal (ally), Healing Rain (environment), and an empty enemy cell that asks "what would healing an enemy mean?".
- Option B, interactive: mechanic picker (Fire, Frost, Heal, Lightning, Shield) x target grid. Each cell shows a real spell (WoW, Pokémon move, LoL ability) or an "unexplored" badge. Empty cells are the point: they are design prompts.
- Recommendation: GIF A now; Option B also makes a strong workshop warm-up.

**WoW Classic spell generator** (slide 74), effort **L**, I
- Teaches: notes: "this advanced spell creation framework that Blizzard used on World of Warcraft: Classic". The slide's columns: Shape (cone, line, circular area, single target), Proxy (trap or device, pet, missile, caster), Payload (knockback, charge, stun, damage), Valid targets, Special conditions, Keywords.
- Hard as text: the slide is a sticky-note wall nobody can read at slide size.
- Proposal: a slot machine with one reel per column. Spin, or set reels by hand, and the page names the WoW Classic spell that matches (Frost Nova: circular area, caster, root; Cone of Cold: cone, caster, damage and slow; Explosive Trap: trap, circular area, damage; Charge: line, caster, charge and stun), or flags "unused combination". A coverage view shades which reel combinations Classic actually used.
- Recommendation: build after the top 6 if there is time; the payoff is high for WoW-literate students.

## Part 3: Decomposition example (slides 46-76)

**Three dials: change one, keep two** (slides 56-65), effort **M**, I, **TOP 4**
- Teaches: every ability has Purpose (the problem), Payload (the mechanics) and Packaging (theme). Notes on 58: "each element could be changed while leaving the others intact", and packaging is usually best changed last. Slides 64-65: Shoulder Throw and Hookshot share purpose and payload except range; Nayru's Love and Mario's Cape share purpose and payload except timing window and theme.
- Hard as text: four breakdown slides, then two comparison slides. The point (one dial differs, the rest match) is a diff, and diffs are easier to see than to read.
- Proposal: three dials with locks. Turning Packaging cycles the same purpose and payload through real abilities: Reflect against projectiles becomes Nayru's Love, Mario's Cape, Fox's Reflector, Yasuo's Wind Wall, Braum's Unbreakable. Turning Payload under a locked Purpose ("counter blocking") cycles grab, ranged grab, guard break kick, unblockable. A "diff" strip highlights the one field that changed between the current card and the previous one.
- Games: Smash and Street Fighter as captions; LoL champion portraits and ability icons for the reflect family (allowed imagery).
- Recommendation: build. It is the clearest home for the framework itself, and Part 4's forge reuses its card component.

**Strip the packaging** (slides 60-65), effort **S**, G
- Proposal: Shoulder Throw and Hookshot side by side as icon cards. The packaging line fades out on both, the payload lines slide together, and only "range: touch" vs "range: far" stays lit. Second beat: the same for Nayru's Love vs Cape, leaving "window 2s" vs "window 0.25s".
- Recommendation: make this as a GIF even if the dials page is built; it drops straight onto slides 64-65.

**Reflect window test** (slides 65, 71), effort **S**, I + G
- Teaches: notes on 65: Zelda gets "a long window of time" while Mario "must time it more precisely". Slide 71 writes it as [Reflect] (2 sec) vs [Reflect] (0.25 sec).
- Proposal: a missile flies toward the player. Press Space to reflect. Two modes, 2.0s and 0.25s windows; the page tracks the learner's success rate in each. Same keyword, different skill test, which seeds Part 5's skill expression step.
- Recommendation: small and fun; build if one more playable moment is wanted in Part 3.

**Same purpose gallery** (slides 47-55), effort **S**, G, low priority
- Proposal: "Counter blocking" across games: a fighting game throw, a hookshot, the Elden Ring guard-break kick, Pokémon's Feint (hits through Protect), WoW Shield Bash. One purpose, many payloads. Fold into the dials page as a preset if not made separately.

**Keyword coverage map** (slides 66-72), effort **M**, I
- Teaches: keywords are the shortcut for filling the framework. Notes on 71: over time "we can clearly see which keywords are exposed to game content… where we have used our game features effectively… and where maybe we could repurpose some." Deep Rock Galactic labels status effects for players (slide 69).
- Proposal: abilities as rows, keywords as columns, enemies and objects as a third panel. Toggle content on and off; keyword columns light up only when something in the content responds to them. Columns that never light read "unused keyword".
- Overlap: the co-op module's "Keywords only matter if situations demand them" covers similar ground. Recommendation: make this a preset of that existing page, not a new one.

## Part 4: Designing three abilities (slides 77-108)

**Ability forge** (slides 77-105), effort **L**, I + G, **TOP 1**
- Teaches: the module's core exercise. Step 1 Purpose from a problem (defeat the Lightning Mage; defeat the Flame Demon). Step 2 Payload from keywords ([Drain] [Lifesteal]; [Extinguish] [Stealth]; [Extinguish] [Wet]). Step 3 Packaging (Necrotic, Smoke, Rain), giving Siphoning Strike, Smothering Smoke and Restoring Rain.
- Hard as text: the build takes 25 slides of slow reveals, and learners never test whether their ability solves the problem.
- Proposal: a three-step builder with a test arena.
  1. Pick a problem card: Flame Demon (vulnerable to Extinguish) or Lightning Mage (vulnerable to Drain). Real fantasy art is optional; WoW creature icons fit.
  2. Pick up to two keywords from a palette: Drain, Lifesteal, Extinguish, Stealth, Wet, Heal, Burn, Shock, Push, Root.
  3. Pick packaging: Necrotic, Smoke, Storm, Holy, Frost. The card renders with a name suggestion.
  4. "Test" drops the ability into a small top-down arena against both enemies. Extinguish strips the Demon's fire aura, Drain empties the Mage's charge bar, Wet makes the next lightning bolt arc (notes on 102: "wet things tend to conduct electricity"), Heal in an area also heals enemies standing in it (notes on 115).
- Presets load the deck's three abilities. A "compare" tray keeps the last three cards side by side.
- Recommendation: build first. It is the workshop in interactive form and makes a strong GIF of all three abilities being forged.

**Three cards, three steps** (slides 84-103), effort **S**, G, quick win if the forge is not built
- Proposal: one card fills slot by slot (Purpose, Payload, Packaging) for each ability in turn, ending with the three cards in a row and the shared [Extinguish] tag highlighted on two of them.

**Keyword reach** (slides 104-105), effort **M**, I + G, **TOP 5**
- Teaches: slide 105: Low Labor Investment + Clear Attributes That Matter = Relevant Depth at Scale. Notes: "Simply by attaching a keyword to a new skill, you contextually interact with existing system."
- Hard as text: the equation is a claim. The interactive makes it a count.
- Proposal: a three-column graph: abilities, keywords, world things (Flame Demon, Lightning Mage, burning bridge, brazier, electrified gate, fallow field, archer hallway). Add a new ability by ticking its keywords; edges draw themselves to every existing thing that responds. A counter reads "interactions gained +6, new rules written 0". Then add a new keyword instead, and the counter flips: "+1 interaction, 1 new rule".
- Recommendation: build. The GIF (add one ability, watch six edges appear) is the clearest slide-105 visual on the list.

**Smoke or rain? Same keyword, different fight** (slide 104), effort **M**, I
- Teaches: both put out the Demon, but Smoke hides everyone in the cloud (notes on 114) and Rain heals enemies too and makes the ground wet (notes on 102, 115).
- Proposal: a top-down arena with the Demon, the Mage and two allies. Cast Smoke or Rain on the same spot and play ten seconds. Side readouts: Demon fire out (both), Mage lightning damage (higher on wet ground), enemies healed (Rain only), allies hidden (Smoke only).
- Recommendation: fold into the forge's test arena instead of a separate page.

**Pokémon parallel: Rain Dance and fire types** (slides 94-103), effort **S**, G
- Teaches: the same Extinguish + Wet idea in a game students know. Rain Dance halves Fire-type move damage and boosts Water moves; Thunder always hits in rain.
- Proposal: Charmander's Ember hits full; Squirtle uses Rain Dance; Ember now shows reduced damage and Pikachu's Thunder lands for sure. Captions: "[Extinguish]", "[Wet]", "[Wet] + [Shock]".
- Recommendation: make it. It uses allowed imagery (Pikachu and a water Pokémon) and grounds made-up keywords in a real system.

## Part 5: Refining the three abilities (slides 109-141)

**Polish pipeline** (slides 110-138), effort **M**, I (or **S** as G)
- Teaches: steps 4-8 (Skill Expression, 3Cs, Game Feel, Balance, Tutorialization) each add one line to each ability.
- Proposal: the three ability cards travel along a conveyor with five stations. At each station a new labeled line stamps onto each card. A scrubber lets the instructor stop at any step; the final frame shows three complete cards. Notes on 121: these "are not hard numbered steps", so stations can be reordered by drag.
- Recommendation: GIF version for the part opener and summary; interactive only if the forge page gets a "refine" tab.

**Skill test radar** (slides 112-115), effort **S**, G or small I
- Proposal: six axes (Timing, Dexterity, Decision making, Game sense, Situational awareness, Game knowledge). Three overlapping shapes, one per ability, show that the trio covers different skills.

**Siphoning Strike: skill shot with a recast cost** (slides 113, 124, 129), effort **M**, I + G
- Teaches: skill expression (a hard whip skill shot: miss and get nothing, hit and drain plus heal), game feel (the whip surges if the target is electrified), and the balance pass (notes on 129: recast quickly, but each repeat drains more).
- Proposal: a playable whip aimed at a moving Lightning Mage. Hits show a surge down the whip and a heal pop. A balance toggle switches between "one cast, long cooldown" and "fast recast, rising mana cost", with the mana bar and hit rate side by side.
- Recommendation: strong candidate for a seventh build. It shows three of the five refining steps on one ability.

**3Cs in three panels** (slides 116-120), effort **S**, G
- Proposal: Strike steps the character forward (Character); Smoke greys out the movement stick until a dodge (Controller); Rain pulls the camera up and back to show the whole field (Camera). Three short loops, each labeled with its C.

**Game feel toggle** (slides 122-126), effort **S**, G (or toggle in the forge arena)
- Proposal: each ability plays twice, plain then felt. Rain drops turn green and glow only on wounded units; Smoke ripples where the hidden enemy moves; the whip wraps (IK) and surges on an electrified target. Caption pairs "Plain" / "Felt" (not before/after verdicts).

**Solution + Vulnerability scale** (slides 127-132), effort **S**, G
- Teaches: slide 132: "Purposeful = Solution + Vulnerability".
- Proposal: a balance scale per ability. Left pan: what it solves; right pan: what it opens up (missed Strike wastes resources; Smoke hides enemies too; Rain heals enemies). The balance change from the slides then moves a weight, and the scale levels.

**Restoring Rain exploit** (slide 131), effort **M**, I, low priority
- Proposal: a top-down team fight. One healer stands outside the fight and recasts Rain. A heatmap shows where healers stand. Toggle "heal split across targets + longer cooldown" and the heatmap moves into the fight.

**Three ways to teach** (slides 133-137), effort **M**, G
- Teaches: Hard check (electrified wall only Strike can drain), Soft check (archers in a hallway miss inside the Smoke), Sandbox (Rain over a fallow field grows food).
- Proposal: three looping vignettes side by side, labeled Hard, Soft, Sandbox. Original pixel art in the Mario style the course already uses.
- Recommendation: make it; tutorialization is otherwise text-only here.

## Part 6: Enemy creation framework (slides 142-188)

**Souls archetype composer** (slides 155-173), effort **L**, I + G, **TOP 2**
- Teaches: enemies are Archetypes (recurring play patterns), combined into Creatures, then varied into Variants. Slide 168 lists 28 Souls archetypes. Crab = Sweeper + Brute + Grappler; Defender + Zone Healer + Brute = paladin, or a turtle (notes on 173).
- Hard as text: notes describe each archetype's behavior in detail, but slides show a still enemy and a label. Learners never see the patterns combine.
- Proposal: a deck of archetype cards (game-icons.net icons) and a top-down arena with a player dot. Each archetype is a behavior module with a drawn attack area: Flailer combos when you step into range, Brute telegraphs one slow heavy slam, Sweeper swings a wide arc, Defender raises a front shield, Evader sidesteps on cooldown, Rampager lunges and then rests, Zone Healer pulses a heal ring. Pick three and the creature runs all three modules on one body. A "draw 3" button deals random archetypes as a design prompt (notes on 171: "What do you imagine?"). Presets: Crab, Paladin, Turtle, plus labeled Souls examples (Black Knight, Bonewheel Skeleton, Pursuer) as captions.
- Builds on `depth/shared/topdown.js` and the PvE module's Mario enemy composer pattern, but for 3D action games.
- Recommendation: build. This is the strongest interactive in the deck.

**Souls archetype gallery** (slides 158-166), effort **M**, G, **quick win**
- Proposal: a 7-cell grid of two-second loops (Flailer, Fighter, Brute, Sweeper, Defender, Evader, Rampager), each showing its attack area and the player counter from the notes (block the flurry, bait the evasion, punish the rest). Recorded from the composer if it gets built.

**Paladin or turtle?** (slides 170-173), effort **S**, G, **quick win**
- Teaches: notes on 173: the same three archetypes give a paladin ("stay close and heal") or a turtle leaving "a healing mist" trail, and those play differently.
- Proposal: split screen. Left, a paladin (WoW paladin icon) with a heal aura that moves with it. Right, a turtle whose heal mist is left on the ground behind it. Both block and slam. Caption: "Defender + Zone Healer + Brute".

**Archetypes depend on your game** (slide 156), effort **S**, G
- Teaches: notes: a charging bull you dodge in an action game "doesn't make sense in a turn-based RPG where the enemy always hits".
- Proposal: left, a top-down charger missing a sidestepping player and stunning itself on a wall. Right, a Pokémon battle where Tauros uses Take Down and simply hits. Caption: "Same idea, different archetype list".

**Variants: thematic or mechanical** (slides 176-180), effort **M**, I
- Teaches: notes on 178: variants can be thematic (red to blue, classic Final Fantasy) or mechanical; keywords scale variants without losing depth.
- Proposal: the paladin from the composer with a variant picker: Flames, Wind, Lightning. A switch toggles "thematic only" (color swap, same behavior) vs "mechanical" (heal aura becomes a burn, push or shock aura) and attaches vulnerability keywords (Flames: Extinguish; Lightning: Drain). The forge's abilities can be tested against each variant.
- Recommendation: make it a tab on the composer page.

**Structured vs unstructured** (slides 181-183), effort **S**, I or G
- Teaches: notes on 183: enemy design "is pretty unstructured. You can add anything together and the ideas will probably work"; abilities have requirements.
- Proposal: two slot machines side by side. The enemy machine accepts every spin. The ability machine rejects spins that break a rule ("no purpose", "payload does not address the purpose") with the reason shown.

**Zoom to the encounter** (slides 174-175), effort **S**, G
- Note: slide 174 still reads "SET ZOOM LEVEL TO ENCOUNTER" and 175 reads "FPS Encounters = many enemies," with no notes, so this looks like a placeholder.
- Proposal: the camera pulls back from one composed creature to a room of six, showing that archetypes also matter at the group level. Bridges to Part 7's Doom Eternal section.

## Part 7: Composition across systems (slides 189-227)

**Doom Eternal encounter swapper** (slides 202-214), effort **M**, I + G, **TOP 6**
- Teaches: Doom Eternal sorts enemies by map role (Fodder, Threat, Mini Boss, Ranged, Rushdown, Support, Keep Away, Close In). Slide 212: "swapping any enemy out with another from its same map archetype" makes a new encounter. Slide 213: two nested frameworks, structure at the map level and composition at the enemy level.
- Proposal: an arena map with labeled slots (six Fodder, two Threat, one Ranged, one Support, one Mini Boss). "Reroll" swaps each enemy for another of the same role; the layout and roles stay fixed while the roster changes. A second control edits the slot list itself (the structure). Enemy names as captions (Imp, Arachnotron, Mancubus, Carcass, Marauder) on game-icons silhouettes.
- Recommendation: build. It is the clearest picture of "nested frameworks", which is otherwise one sentence on one slide.

**Alchemy engine grid** (slides 193-195), effort **M**, I + G
- Teaches: notes on 193: BotW's "alchemy engine" is keyword interaction across all entities, built on only about five major effects (Burnable, Electrifiable, Pushable, Freezable, Liftable).
- Proposal: objects as rows (grass, wooden shield, metal sword, boulder, meat, lamp, pond) and elements as columns (fire, ice, lightning, wind). Each object carries property tags; every cell is computed from the tags, not hand-authored. "Add object" asks for tags and fills its whole row. A counter compares rules written vs interactions produced. Notes on 194's roguelike examples (sear meat for healing, light lamps, extinguish to find passages) become extra rows.
- Recommendation: build if there is room for a seventh page; otherwise make the GIF (add a "wooden crate" row, watch it fill).

**Bespoke vs procedural combos** (slides 198-199), effort **S**, G
- Teaches: Diablo III runes are authored one at a time; Path of Exile's support gems combine procedurally. Notes: "Both bespoke and procedural content can be examples of compositional game design."
- Proposal: left grid fills one hand-drawn cell at a time (6 skills x 5 runes = 30 authored). Right grid: 6 skills x 10 supports, choose 3, the combination count rolls up into the thousands while authored pieces stay at 16.

**Loot generator roll** (slide 197), effort **S**, G
- Proposal: a Diablo-style item card assembles from reels: base type, power value, then affixes as keywords with magnitudes. Three rolls, three different items, same parts. game-icons.net weapons.

**Design skeleton: Street Fighter II template** (slide 220), effort **S**, G
- Teaches: notes on 220: 6 attack buttons give each character 6 standing, 6 crouching, 6 jumping moves, plus 3 specials and a super.
- Proposal: a character select grid; each character expands into the same 22-slot template, and the slots fill with different moves. The template stays, the contents change.

**Design skeleton: MTG set planner** (slides 217-219, 222), effort **M**, I
- Teaches: notes on 218: Magic sets allot cards per color, split into creatures and spells, then set general traits per slot (the CB01 "creature, small" list on the slide).
- Proposal: a fillable skeleton grid (colors x slot codes). Fill a slot by picking traits; a coverage strip shows which traits each color has and which are missing. A second preset loads the workshop's "three animals and their roles" sheet (slide 222).
- Recommendation: a workshop tool more than a lecture visual; build after the top 6.

**"Draw the rest of the owl"** (slide 217), effort **S**, G, low priority
- Proposal: animate the slide's joke straight: circles, then a skeleton grid, then the full set. Funny opener for design skeletons.

**Systems tour reel** (slides 193-201), effort **S**, G, low priority
- Proposal: one GIF that walks through the nine system examples, each reduced to a three-chip "parts make a whole" strip (Potionomics cards, Signs of the Sojourner deck symbols, PoE tree nodes).

## Part 8: Combining frameworks (slides 228-260)

**Strip the packaging: counter circle** (slides 238-240), effort **S**, G, **quick win**
- Teaches: notes on 238-239: attacks beat throws, throws beat blocks, blocks beat attacks; strip the presentation and theme and you get the Offense / Defense / Prediction circle.
- Proposal: the PvP module's `slide3-fighting-attack-block-grab.gif` style. Fighters fade to grey boxes (step 1, strip presentation), labels fade to Offense / Defense / Prediction (step 2, strip theme), and the circle remains.

**Counter circle reskinner** (slide 241), effort **S**, I + G
- Teaches: the same circle yields V1 (Pressuring, Blocking, Priming), V2 (Zoning, Evading, Healing), V3 (Punishing, Parrying, Buffing).
- Proposal: one circle, a dropdown of skins: the slide's V1-V3, plus known games: Pokémon Fire / Water / Grass (Charmander, Squirtle, Bulbasaur), Fire Emblem weapon triangle, RTS rush / turtle / expand (reuse the PvP module's GIF). The arrows stay put while the labels change.

**Two frameworks make nine** (slides 242-244), effort **S**, G
- Proposal: the three-node circle on the left, the Before / During / Post timing column on the right (from the co-op module). They slide together and multiply into the 3x3 grid, each cell gaining its name: Initiate, Zone, Punish; Mitigate, Reflex, React; Setup, Counterplay, Response.

**Nine fundamentals grid with a moveset audit** (slides 243-255), effort **M**, I + G, **TOP 3**
- Teaches: notes on 244: every action combat mechanic falls into at least one of nine categories. Slides 246-254 give each a definition and high-risk / low-risk examples. Notes on 255: the grid let the No Rest for the Wicked team find what a weapon or enemy class was missing.
- Hard as text: nine definition slides in a row; learners cannot apply the grid to a kit they know.
- Proposal, part one (explore): click any cell for its definition and a risk slider that slides between its high-risk and low-risk examples (Punish: slow launchers and supers at the high end, quick jabs at the low end).
- Part two (audit): load a moveset preset and its moves light the cells they belong to; empty cells read "gap". Presets: a Dark Souls straight sword, Yasuo (Q poke: Zone; W Wind Wall: Reflex; E dash: Initiate; R: Punish), a WoW warrior, Mario (stomp, spin jump, cape). Learners can add their own moves by tagging them.
- Part three (quiz): a move appears (Elden Ring kick, Sekiro deflect, Bloodborne rally, Dante's Stinger) and the learner places it. Several moves fit more than one cell, which the answer explains.
- Recommendation: build. It is the module's capstone framework and the most reusable tool for students' own games.

**Duel timeline** (slide 244), effort **M**, G
- Proposal: two fighters on a horizontal timeline centered on one enemy attack. Actions appear before, during and after the hit, and the matching grid cell lights each time: a feint (Setup), a perfect block (Reflex), a rally hit-back (React), a weapon swap (Response).

**Elemental diamond** (slide 256), effort **S**, I
- Teaches: four elements (Earth, Plague, Chemical, Lightning) laid on two axes: inorganic (corrosion, physical) vs organic (infection, mental), heavy (hard, defensive) vs light (ethereal, offensive). Notes on 256: "You need to do this work yourself."
- Proposal: the diamond with the two axes as sliders. Drag a point and the page shows which element sits there and what its keywords lean toward. A "make your own" mode lets learners name the axes and the four corners, then export the diagram.

## Part 9: What's next (slides 261-275)

**Challenge-first loop** (slide 266), effort **S**, G
- Teaches: notes: create the challenges first, then the tools, then expand breadth or depth, then prune and repeat.
- Proposal: a looping Mario sequence. A gap appears (challenge), Mario gets a jump (tool), the gap widens and the spin jump arrives (expand), an unused power-up is crossed out (prune), and the loop starts again.

**Course map finale** (slides 268-270), effort **S**, I
- Teaches: the path FPF, then Mastering Game Mechanics, then level design, narrative design and implementation.
- Proposal: the slide's stage arrows as the site's closing page, with each module of Mastering Game Mechanics expanding into thumbnails of its interactives. It doubles as an index of everything built across the course.
- Recommendation: build last. It is cheap once the module pages exist.

**Framework kit download** (slides 256, 271-273), effort **S**, I, low priority
- Proposal: printable blank cards (Purpose / Payload / Packaging, archetype cards, the 3x3 grid, the elemental diamond) as one PDF for students who want to mod a game or plan their own.

## Stretch: compose a boss fight

Effort **L**. Chains the top three into one sandbox: compose a boss from archetypes (Part 6), forge two player abilities against it (Part 4), then run the nine-cell audit on both kits (Part 8) and see which cells the fight never uses. Only worth doing after the individual pages exist.

## Deck review notes

Things noticed while reading every slide, in case they matter before recording:
- Slides 1, 10 and 11 are marked internal ("INTERNAL ONLY SLIDE", "FLOW ISSUE" with before/during/proposed outlines).
- Slides 174-175 look unfinished: "SET ZOOM LEVEL TO ENCOUNTER" and "FPS Encounters = many enemies," with no notes.
- Part 1's title asks "What is Systems Thinking?", but the part is about depth at scale and the phrase does not come back until Part 8.
- Slide 70 is the co-op Reference slide, but its notes talk about Warcraft Rumble showing unit keywords.
- Slide 71 spells "[Missle]" twice; notes on 69 say "exploded to the players" (likely "exposed").
- Slide 57 says Payload is "the mechanics delivered" and Packaging "the theming/visuals"; slide 80 says "the mechanics brought" and "theming/visuals/spatial". Worth picking one.
- Notes on 115 say Restoring Rain also heals enemies, but slide 115 and the balance change on 131 never mention it. If kept, it is a clean example for "Solution + Vulnerability".
- Notes on 83 and 180 are near-duplicates (the same keyword explanation in both places).
- Notes on 116 and 122 still carry "NOTE: REWORD THIS AS MINI-COURSE REFERENCE".
