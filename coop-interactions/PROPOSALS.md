# Co-op Interactions: interactive and GIF proposals

Source: "MGM C3 M6 - Engaging Co-op Interaction Design Fundamentals" (Drive 1xBadKm2iOtQxbKC5WrMZ3rgbZq8e6a7cGx2jwtTIf9w, 341 slides, read 2026-10-27 via `/htmlpresent`). Slide numbers below are the `/edit#slide=N` numbers. The deck's own footer counter reads one higher (slide 9 shows "10 of 341"). In this deck the speaker notes are typed onto the slides themselves, so the notes quoted here come from the slide text.

Nothing is built for this deck yet.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Before, during, after the hit (shield vs intervention vs heal) | 147-160 | M |
| 2 | Co-op chain builder: setup, exploit, payoff | 186-229, 288-291 | M |
| 3 | Shared-screen camera lab | 68-78 | M |
| 4 | Targeting matrix ability generator | 116-133, 161-171 | M |
| 5 | Keywords only matter if situations demand them | 270-285 | M |

Quick wins worth doing early even though they are not top 5:
- **Interaction count explosion** (slide 9). The notes walk through 3 interactions growing to 15 when two players join. One small widget or GIF makes the number land.
- **Free gear plateau** (slides 316-317). The WoW alpha story about gifted quest gear is a great story, but the cost (weeks with no upgrades) is invisible on a slide. One power-over-time GIF shows it.

---

## Part 1: What is co-op and why it matters (slides 2-17)

**Interaction count explosion** (slide 9, also 5-8), effort **S**, quick win
- Teaches: every added player multiplies the interactions you have to design. The notes: 1 player and 3 monsters is 3 interactions; 3 players and 3 monsters is 9 player-monster pairs plus 6 player-player pairs, so 15.
- Hard as text: "exponentially" is a word, and novices nod at it. They don't feel how fast the line count grows.
- Proposal: player and monster steppers (1-6 each). Dots on two sides, with a line drawn for every pair, colored by type (player-monster, player-player). A big counter shows the total and a "you are designing N things" label. The GIF version steps 1 → 2 → 3 players. Note: the notes count 6 player pairs for 3 players, which counts each direction separately (A helps B is not B helps A). The widget should show both readings with a toggle, or follow the notes and say "directed".

**Framework map** (slides 14-16, recurring on 20, 48, 65, 107, 115, 146, 175, 235, 261, 307), effort **S-M**, medium priority
- Teaches: the module's three columns (dynamics, interactions, classes) and which framework answers which question ("Which direction to apply mechanics?", "When?", "In what order?").
- Hard as text: the slide is a grid of names and "???" placeholders that fill in as the course goes. Novices lose track of where the current part sits.
- Proposal: same as the PvE framework map. One clickable map where each tile shows its question and its part, with a "you are here" state. Export one still or short GIF per reveal step to drop onto the recurring slides.

## Part 2: Symmetrical vs asymmetrical (slides 19-45)

**Symmetry spectrum slider** (slides 27, 37-41), effort **S**
- Teaches: symmetry is a spectrum. Mario 3D World (Luigi jumps a block higher) sits near the symmetrical end, Bowser's Fury (Bowser Jr flies, no camera) at the asymmetrical end, and Diablo is "co-optional" even with different classes because everyone does the same job.
- Hard as text: the Diablo vs WoW point is subtle. Different classes on paper is not the same as different jobs.
- Proposal: two original characters side by side with a slider. As it moves, their move lists diverge one step at a time (jump height, then a different weapon, then one has no camera). Pros and cons from slides 38-39 light up as the slider passes them ("unclear responsibilities", "skill gap risks"). A "same job?" readout marks the point where co-optional turns into true asymmetry.

**Only possible together: Bubble Bobble** (slide 25), effort **S**, low priority
- Teaches: same moves as single player, but co-op unlocks tricks (blow a bubble for an ally to ride up, trap an enemy for your partner to pop).
- Proposal: a two-panel GIF with original art: one player can't reach a ledge alone, then a second player's bubble lifts them.

## Part 3: 3 types of teamplay (slides 47-62)

**Who is acting right now?** (slides 51-61), effort **S**
- Teaches: asynchronous (Minecraft farm, No Rest for the Wicked), turn-taking (FF4, LoR co-op, where you wait 75% of the time) and synchronous (Clash Royale 2v2), and why synchronous costs far more.
- Hard as text: three definitions in a list. The difference is about time, which a list can't show.
- Proposal: three lanes of a timeline for two players. Async: P1 plants, a gap, P2 harvests hours later. Turn-taking: blocks alternate, with a "waiting" hatch on the idle player and a running "time spent waiting" %. Synchronous: both lanes active at once with overlapping blocks. A "burst" toggle on turn-taking (slide 58 note: LoR burst, Magic instants) lets a short action land on the other player's turn and shrinks the wait %.

## Part 4: 3 dev cost sinks: camera, control, continuity (slides 64-103)

**Shared-screen camera lab** (slides 68-78), effort **M**, **TOP 5**
- Teaches: with two players on one screen, centering on one player fails, equal framing makes it hard to tell which character is yours, and far-apart players break everything (Secret of Mana players getting stuck, Cat Quest 2). Fixes: lock movement to the camera (TMNT), split the screen, or weight each entity (slide 75: P1 must-have, enemies half, allies a little less). Slide 77: if you can't see each other you forget each other.
- Hard as text: these are camera problems, and novices can't see them from screenshots. The weighted camera diagram is the densest idea in the part.
- Proposal: a top-down arena with two player dots (keyboard or scripted wander) and an enemy. Modes: follow P1, equal framing, locked scroll, split when far, weighted. In weighted mode, sliders for self, ally and enemy weights move the frame live. Failure states get flagged: "P2 off screen", "P2 stuck at the edge", "zoomed too far to read". A small HUD scores clarity, motivation and response from slide 77. The GIF version walks through the modes one by one.

**Locks and waiting** (slides 80-94), effort **S-M**
- Teaches: who's in charge? Menus that pause everyone (Secret of Mana, Ember Knights picking skills one after another), locks like the WoW quest-item queue, and the four fixes: minimize locks, internalize personal choices (Darksiders Genesis vs GTA weapon wheel), communicate who is responsible (Divinity), and keep players together (Mario 3D World bubble, 30XX teleport).
- Hard as text: the cost is idle time, and idle time is invisible in a screenshot.
- Proposal: four player tracks playing a short level. Events fire (open inventory, pick a skill, talk to an NPC, fall off a ledge). With all fixes off, each one freezes all four tracks and a "group time lost" counter climbs. Turning on each of the four fixes changes how that event resolves (inventory becomes local, the skill pick runs in parallel, the NPC talker gets a "deciding for the group" banner, the fallen player is bubbled back). The counter shows the saving.

**Who owns the save?** (slides 97-102), effort **S-M**, medium priority
- Teaches: centralized (V Rising server), single player host (It Takes Two) and individual (Dark Souls, Diablo 2) continuity, each with clear pros and cons.
- Hard as text: three definitions. The trade-offs only appear when something happens, like a friend leaving or a duped item.
- Proposal: three columns, one per model, each showing where the world state and the character state live. Scenario buttons play on all three at once: "play with a different friend", "host quits mid-story", "bring a max-level character", "duplicate an item". Each column marks the outcome as fine, lost progress or broken progression.

## Part 5-6: Teamplay frameworks and the targeting matrix (slides 106-143)

**Targeting matrix ability generator** (slides 116-133, plus the timing combo on 161-171), effort **M**, **TOP 5**
- Teaches: any mechanic run through source (self, ally, enemy, environment) × target (the same four) gives a family of abilities. The deck builds fire into fireball (self→enemy), pool of flames (self→environment), Hellfire (self→self), cauterize (self→ally). Slides 130-133 add healing zone (ally→environment), turret (self→environment), self heal and enemy buffs enemy. Slides 165-170 add timing: traps, hazards, and insight (information asymmetry, Keep Talking and Nobody Explodes).
- Hard as text: the slide builds one tick at a time, and students see a 4×4 grid rather than an idea machine. The payoff, that every cell is a design prompt, is spoken.
- Proposal: pick a payload (fire, heal, shield, slow, information) and click a cell. Each cell shows an ability name, an icon and a one-line description, taken from the deck where it gives one and written as original prompts elsewhere. Empty cells show "Your idea?". A third control for timing (before, during, after) re-labels cells to show the slide 162 idea that shifting time and target gives new tools (self→environment, before = trap). A "fill all" GIF works for the slide.

**Who gets the buff?** (slides 136-142), effort **S**
- Teaches: a team empowerment is only teamplay if there are moments where it's worth more on an ally than on you (Kayle ult). Slide 142: the best use should be conditional.
- Hard as text: "conditional best case" is abstract.
- Proposal: three party members on a short fight timeline, one of whom takes a big hit at a random moment. You hold one invulnerability buff and click who gets it and when. A value readout compares "on me now" vs "on the ally about to be hit". A toggle that makes the buff self-only shows the decision vanish.

## Part 7: Teamplay timing framework (slides 145-171)

**Before, during, after the hit** (slides 147-160), effort **M**, **TOP 5**
- Teaches: proactive (before the event), coactive (during) and reactive (after). Heal and revive are reactive, shield is proactive, and rescue or intervention (Braum, warrior intervene, priest grip) sits in the middle. The Dark Souls trio: Iron Flesh (before), shield block (during), Estus (after). Slide 153: healing erases past mistakes, while shields encourage risk and give enemies a reason to back off.
- Hard as text: this is the most "I already know this" part of the deck, and the notes say so ("Yes, yes, I know this seems obvious but its important"). The insight is in how each choice changes behavior, and a static timeline can't show that.
- Proposal: one enemy wind-up and strike on a timeline with an ally's HP bar. Choose shield, intervene or heal, then press it at any moment. The window for each lights up (shield must land before, intervene inside a narrow window, heal after), and the HP trace shows the result. A second mode plays a short skirmish where the enemy AI backs off while a shield is up (slide 153), and the ally plays more aggressively once shields are available. The GIF version shows the same hit three times, once per tool, with the Dark Souls trio captions from the slides.

## Part 8: Teamplay sequencing framework (slides 174-232)

**Co-op chain builder: setup, exploit, payoff** (slides 186-229, plus keyword chains 288-291), effort **M**, **TOP 5**
- Teaches: weak co-op is everyone doing their own loop (Diablo). Strong co-op is setup → exploit → payoff split across players (Ashe slow → Morgana bind → Ashe arrow → Morgana pool; Magicka wet → freeze → rock → shatter). Slide 212: payoffs are strong but slow or costly, so they need a vulnerable target. Slide 225: the same chain can live inside one character or be split across three. Slide 291 turns abilities into reusable keywords (Wet → Freeze → Laser, Break → Topple → Daze...).
- Hard as text: the slide builds a chain, but students only see boxes and arrows. The reason the order matters (the payoff misses or bounces without the setup) is spoken.
- Proposal: an enemy with a state bar (normal, slowed, wet, frozen, toppled...) and three player slots, each with two keyword abilities. Students drag abilities onto a shared timeline. The sim plays it: out-of-order payoffs miss or bounce, correct chains glow and multiply damage. A "Diablo mode" button plays all three players' best solo loops at once for comparison. Presets load the slide 291 chains. A "1 player vs 3 players" toggle (slide 225) gives one character all three keywords on cooldowns to show the internal loop. This can share the rules-table approach of `pvp/payoffs/`.

## Part 9: Cross-class structures (slides 234-258)

**Holy trinity tug-of-war** (slides 247-249), effort **S**
- Teaches: in co-op, each class gets part of the toolkit, and each weakness is covered by someone else (tank: damage too slow; healer: durability too low; DPS: no healing). The trinity is a one-dimensional HP tug-of-war.
- Proposal: a boss vs party HP bar fight. Remove any one of tank, healer or DPS and watch which failure happens (wipe, enrage timer, attrition). A GIF cycling the three removals fits the slide.

**Laning to teamfight** (slides 250-253), effort **S**
- Teaches: League's structure changes by phase, from lanes (top, mid, bot, support, jungle) to a frontline and backline in teamfights.
- Proposal: a short GIF where the five lane positions slide into frontline and backline formation, and the labels morph from lane names to class names. Original map, not the Riot one.

**Raid board: roles to threats** (slides 254, 266), effort **M**, medium priority
- Teaches: in PvE the encounter decides which role matters where: area casters and bruisers on the swarm, single target damage on the soldiers, controllers on the wizard, and tanks with the boss.
- Proposal: drag role tokens onto the enemy groups from slide 254. Each assignment shows how well that role's keywords fit ("area damage needs clustered enemies"). A score shows time to clear. A mismatched assignment (assassin on the swarm) visibly crawls.

## Part 10: Co-op cross-class design pyramid and keywords (slides 260-304)

**Keywords only matter if situations demand them** (slides 270-285), effort **M**, **TOP 5**
- Teaches: describe classes with keywords plus weights (Mario jump 3, Luigi jump 4), sorted into role, class and spec layers (warrior, guardian druid, blood DK on 275-280). Slide 283: a keyword has value only when the content gives it a chance (area damage needs clustered enemies, taunt needs allies under threat, durability needs dangerous damage).
- Hard as text: the keyword sheets are readable, but the main point on slide 283 is a list of four sentences. Novices design keyword lists and forget the content side.
- Proposal: left side, class keyword cards built from the slide sheets (original class names, with role, class and spec keywords tagged by color). Right side, encounter sliders: enemy clustering, incoming damage, casters present, adds that chase the healer. Each keyword on each card shows a live usefulness meter. A "this keyword never mattered" warning appears when a keyword has had zero opportunity across the encounter. A "guess the class" round (slide 275) is a cheap opener.

**Design pyramid** (slides 263, 278), effort **S**
- Teaches: cross-class structure → significant weaknesses → visible strengths → unique expression. Each layer depends on the one below, and skipping one gives "a middle-of-the-road character without both highs and lows".
- Proposal: a four-layer stack with a sample character beside it. Pulling out a layer shows the result: no weakness means teammates don't matter, no visible strength means nobody wants them, no unique expression means a forgettable character. Layer tags map to role, class and spec (slide 278).

**Opportunity pacing** (slide 292), effort **S**
- Teaches: player A gets to use their keyword many times, B once. Who feels better depends on the stakes of B's moment. WoW raid curse removal: one player could handle all of it until the designers changed frequency and targeting.
- Proposal: two lanes of a session timeline with opportunity markers. Students drag B's single marker into a high-tension moment, and a satisfaction meter swings. A "one decurser covers the raid" toggle shows everyone else's lane going empty.

**Hero moments and all-for-one** (slides 294-295), effort **S**, low priority
- Teaches: hand the spotlight to someone who usually isn't in it (Flame Leviathan: the co-pilot is flung onto the boss to break a part), and have the team rally around a struggling ally.
- Proposal: an original catapult GIF: a small sidelined character is launched onto a giant machine, breaks a part, and the whole team's damage jumps.

**Knowledge, power, encouragement** (slides 298-302), effort **S**, low priority
- Proposal: a party of four with three meters each. Stack all three on one player to show the solo carry problem (slide 301), then spread them so each member is needed. Better as a workshop worksheet than a lecture visual.

## Part 11: Co-op economics (slides 306-341)

**Free gear plateau** (slides 316-317), effort **S**, quick win
- Teaches: in the WoW alpha, high-level players gifted quest gear to newbies. It felt great for a moment and then meant hours or days with no upgrades, which led to soulbound items.
- Hard as text: a story with no picture of the cost.
- Proposal: two power curves over play time. The normal one climbs in steady steps as quests reward gear. The gifted one jumps early and then goes flat for a long stretch, with "nothing new to equip" markers. A GIF with the curves drawing in parallel is enough.

**Conversion rate sandbox: equivalent, growth, erosive** (slides 318-324, 329-331), effort **M**, high priority
- Teaches: equivalent (nothing lost), growth (more than you started with: Clash Royale card donation, group XP bonus, Potionomics slimes) and erosive (less: taxes, fees, a high-level player boosting a friend). Growth trades need caps, and erosive trades stop infinite boosting (slide 324).
- Hard as text: three formulas and long notes. The consequences show up over time and across many players.
- Proposal: a small guild of 8 players trading a daily resource. Choose a conversion rate and a daily cap, then run 30 days. Charts show total supply, the gap between the boosted player and everyone else, and days to the "shiny thing". Presets: Clash Royale donation (growth plus cap), unlimited gifting (equivalent, no cap) and boosting with erosion (slide 324). An "abundance" preset (Minecraft farm, WoW cauldron) shows the shared pool collapsing when one maintainer stops.

**Forced scarcity: Mooncloth** (slides 325-328), effort **S**
- Teaches: time-gated resources create value at first, then the price collapses once most players have what they need.
- Proposal: a price-over-weeks chart with demand (players still wanting items) and supply (daily crafts). Students drag the cooldown and recipe cost and watch when the price falls to its component cost.

**Auction house economy** (slides 332-337), effort **L**, medium priority
- Teaches: auction houses speed up trade, which spreads oversupply, inflation and exploits fast (Diablo 3: better to shop than play). Taxes as a sink, scarcity as the precondition.
- Proposal: an agent sim with gold taps (drops), sinks (tax %) and an "every item tradable" toggle. Charts for gold supply, average item price and "upgrades found by playing vs buying". With D3 settings, the buying line overtakes playing. Big build, best as a later deep dive.

## Closing (slides 338-341)

Nothing worth animating. Slide 341 is the author's outline and also lists "Coop testing: beneficial vs catastrophic tests", which has no slides yet.
