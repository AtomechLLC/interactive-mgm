# Understand, Analyze and Plan Mechanics: interactive and GIF proposals

Source: "MGM C4 M2 - Understand, Analyze and Plan Mechanics" (Drive 1-0SYOoFgQ-RLPE0lmzjR0C1ZauN624Afp0n0z4ZjN5w, 259 slides, read 2026-10-27 via `/htmlpresent` in a signed-in browser plus the Drive text export). Slide numbers below are the `/htmlpresent` `aria-label="Slide N"` numbers. This deck has no speaker notes (every `slide-notes` aside is empty), so the teaching points here come from the slide text and the build-up order of the slides.

Nothing is built for this deck yet.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Mechanics X-ray stepper (states, signals, receivers, transforms, context) | 20-33, 52-54, 100, 107 | M |
| 2 | Tool reach matrix: tools x situations, with cost meter | 58-77, 85-90 | M |
| 3 | Resource pool sandbox: generators, spenders, capacity | 198-213, 257 | M |
| 4 | Cast timeline: Life Tap, class imbalance and tokens | 226-256 | M |
| 5 | Context web: one ability, four context layers | 153-189 | M |

Quick wins worth doing early even though they are not top 5:
- **Type weakness X-ray** (slide 107). The slide's numbers are already a complete worked example (10 HP, 5 damage, x2 if electric vulnerable, so Dying at 0 vs Wounded at 5). Two toggles make it click, and it can reuse the X-ray stepper's drawing code.
- **Life Tap solo vs raid** (slides 227-228). One GIF: -40 HP / +40 mana is a risk alone, then the priest heals +40 and it becomes free. The "THX, BRO~ / LOL!" beat is the whole lesson.
- **Discrete vs continuous spending** (slides 215-216). An ammo counter ticking down in chunks next to a battery bar draining smoothly. One short looping GIF.

---

## Part 1: Universal Mechanics Description Framework (slides 4-46)

**Mechanics X-ray stepper** (slides 20-33, reused on 52-54, 100, 104-107), effort **M**, **TOP 5**
- Teaches: every mechanic can be described with five parts: States (values that describe the world), Signals (messages that ask a system to do something), Receivers (entities that accept signals), Transforms (instructions on how to change states) and Context (states specific to the signal). Slides 29-33 then X-ray Mario 3: Jump/Shoot create a Fireball at (x, y), Stomp and Hit signal the Goomba, the Health system goes 1 -1 = 0, Death fires the Animation and Reward systems, and the Party Level-Up system gets +100 XP and levels up.
- Hard as text: the slides add one box at a time across 14 slides, but the point is the flow: a signal leaves one entity, a receiver accepts it, a transform changes a state, and that change fires the next signal. Novices see a static box diagram and miss that it is a chain reaction. The deck calls it "X-ray vision", which is a motion idea.
- Proposal: a two-layer view. Top: a small original platformer scene (a hero, a walking enemy). Bottom: the X-ray diagram from slides 29-33. Press Jump or Shoot and a glowing signal packet travels along the diagram's arrows; each receiver lights up as it accepts, the state value ticks (1 to 0, 0 to 100 XP), and the next system fires. A "step" button walks one hop at a time so the instructor can narrate. A legend colours each box by its framework part (state, signal, receiver, transform, context). The same engine then drives the foot switch (52-54: Inactive, "Lever tool used", Set Active, Active), the flammable grass (100: Not On Fire, Burn, On Fire) and type weakness (107), so the framework shows up as one tool used four times. GIF per scene.

**Framework thermometer** (slides 20-25), effort **S**, can be the first screen of the X-ray stepper
- Teaches: the five parts built up on one tiny example: a state of 5, Heat and Cool signals, Warmable and Coolable receivers, +1 and -1 transforms, and context.
- Proposal: one value (5) with Heat and Cool buttons. Toggle the object's Warmable and Coolable receivers off and the matching signal bounces off with no change. Toggle the transform between +1 and +2. A context chip (for example "in the sun") changes the transform. Each part's label highlights as it is used, in the deck's order.

**Leveling system cascade** (slides 14-15), effort **S**
- Teaches: systems create side effects. XP raises Level, Level raises HP and MP, and that means the player can take more hits and cast more spells.
- Proposal: an XP bar to drag or fill; on each level-up, the HP and MP bars grow, then a short test fight replays showing one more hit survived and one more spell cast. GIF.

**Parts vs verbs vs mechanics sorter** (slide 40), effort **S**
- Teaches: cards, dice, buttons and levers are parts; playing, rolling, pushing and flipping are verbs; uncertainty and transformation are mechanics. The slide warns that many courses get this wrong.
- Hard as text: the slide shows the right answer, so learners never test their own instinct.
- Proposal: a drag-to-sort quiz with three bins and a dozen chips (the slide's words plus a few extra like "spinner", "drawing", "hidden information"). Wrong drops explain why ("a die is a part; rolling is the verb; not knowing the result is the mechanic").

## Part 2: 6 Qualities of Deep Mechanics and Player Tools (slides 47-77)

**Tool reach matrix** (slides 58-77, merged with Part 3's matrix on 85-90), effort **M**, **TOP 5**
- Teaches: the weakest tool acts on one thing (58); a better tool acts usefully in more situations and more often (59); an even better tool acts in more diverse situations (60: killing enemies, smashing chests, smashing locks); ideal mechanics add diverse consequences (61-62: success, surprise, big payoff). Slide 68's A Link to the Past items (bombs and the Power Glove do combat and exploration, the Cane of Somaria only holds down pressure plates) and slide 73 (Ocarina multi-purpose vs single-purpose) are the examples. Then two warnings: more player tools means more design, situations and teaching cost (74: +$, +$$, +$$$), and more environments do not mean more choices (76-77: complex environment, fewer choices vs simple environment, more choices). Part 3 adds the axes Narrow/Broad and Shallow/Versatile (86-88) and the 80/20 split: simple/narrow secondary mechanics vs versatile/broad core mechanics (90).
- Hard as text: "more situations" and "more frequently" are abstract. The idea only lands when you see one tool light up a whole row of a grid while another lights a single cell.
- Proposal: a grid with tools as rows (original items: bomb, glove, hammer, rod, plus a custom slot) and situations as columns (enemy, chest, lock, rock, peg, pressure plate, gap). Cells light where the tool acts, with an icon for the consequence type. Readouts per tool: situations covered, consequence variety, and the quadrant it lands in on the Narrow/Broad x Shallow/Versatile chart from slides 86-88. A cost meter adds $ per tool, $$ per situation and $$$ per thing the player must be taught (slide 74), so adding the fifth single-purpose tool visibly costs more than it gives. A preset "Cane of Somaria" row makes the single-purpose case obvious. The 80/20 view (90) colours the core tools.

**Innate, receiver, tool** (slides 49-51), effort **S**
- Teaches: some mechanics are innate (Mario moves on A), some need a receiver (the foot switch), and some need the right tool (the rusted switch needs the hammer on Y).
- Proposal: three short GIFs with one original hero: walks; steps on a switch and it clicks; steps on a rusted switch, nothing, equips the hammer, it clicks. Pairs with the X-ray stepper's switch scene (52-54).

**Simple environment, more choices** (slides 76-77), effort **S-M**
- Teaches: a busy, detailed room can offer fewer real choices than a plain room with a few interactive pieces.
- Proposal: two rooms side by side. The left is cluttered with decoration but has one door; the right is plain with a crate, a ledge, a switch and a gap. A counter shows the number of distinct ways through each, and a route overlay draws them. GIF.

**One tool, two jobs: rocket jump** (slide 71, also 69-70), effort **S**, low priority
- Teaches: one verb that is both an attack and a movement tool (TF2 rocket jump, Ori's Bash, Yoshi's egg toss).
- Proposal: an original side-view GIF: the same shot damages an enemy, then is fired at the floor to launch the player onto a ledge. The slides likely already carry footage, so this is only worth it if they do not.

## Part 3: How to Plan Mechanics, Tools, Situations and Consequences (slides 80-91)

Covered by the **Tool reach matrix** above (slides 85-90). Slide 90's 80/20 split can also stand alone as an **S** still: a pie of 20% core (versatile, broad) and 80% secondary (simple, narrow) mechanics with example tools in each slice.

## Part 4: 6 Techniques to Help Players Master Your Mechanics (slides 94-144)

**One mechanic, six ways to teach it** (slides 97-128), effort **L**, high priority (just outside the top 5)
- Teaches: Accidental Discovery (BotW flammable grass, Half-Life 2 saw blade, Pokemon type weakness), Demonstration (Mirror's Edge, Mega Man X NPCs), Nuzzles or "not-puzzles" (Deku Tree ladder, torch lighting, God of War III), Tutorialization (SpongeBob, Titanfall 2), Drip Exposure (WoW, LoL, Devil May Cry shop, LoR chunking) and Free Practice (Street Fighter V, LoL practice tool, Control routes), plus the bonus "intentionally don't teach" (Dark Souls III kick and poise, DOOM Eternal).
- Hard as text: six names with game logos. Novices can't compare them because every example teaches a different thing.
- Proposal: hold the mechanic constant (fire spreads through grass) and show six tiny original level vignettes, one per technique: the player swings a torch near grass by chance; an NPC burns a bush ahead of them; a dead end with only grass and a torch; a prompt "press X to light"; fire arrows unlocked in a later level; a practice field with infinite fire. Each vignette is a GIF, and a page shows all six in a grid with "player effort" and "designer control" readouts. This is the most reusable set in the deck, but it is a lot of art and scripting.

**Type weakness X-ray** (slide 107), effort **S**, quick win
- Teaches: a vulnerability multiplies damage through context: 10 HP, a 5 damage hit, x2 if the damage type is electric and the target is electric vulnerable, so 0 (Dying) instead of 5 (Wounded).
- Proposal: a target with toggles for damage type (electric, fire, physical) and "electric vulnerable". Fire the hit and the X-ray boxes from slide 107 light in order, with the multiplier shown as a context check. Uses the X-ray stepper's renderer.

**Anti-patterns** (slides 134-136), effort **S** each, medium priority
- Teaches: overteaching, anti-lessons (teaching something the game later punishes) and hinting to overcome design.
- Hard as text: the three slides are title-only, so the instructor has to describe each from scratch.
- Proposal: three short original GIFs: a prompt box that pops up for the fifth time on something the player already did; a tutorial that rewards standing still, then a boss that kills anyone who stands still; a glowing arrow added over a confusing room instead of fixing the room.

**How much to teach: audience slider** (slides 137-142), effort **S**, low priority
- Teaches: tailor teaching to the audience. Someone's very first game needs everything explained; someone's favourite genre in a new flavour should be set free.
- Proposal: a slider from "first game ever" to "genre veteran" that turns tutorial prompts, demonstrations and free practice up or down on a mock first level.

## Part 5: 4 Key Contexts That Enhance Player Satisfaction (slides 147-191)

**Context web: one ability, four context layers** (slides 153-189), effort **M**, **TOP 5**
- Teaches: a mechanic is more satisfying when it fits more contexts (149). Contexts are Environment (BotW storm, Half-Life 2 barrels, Gungeon traps), Opponent (blocking, counters, weaknesses, enemy states, stamina), Ally (Half-Life NPC healing, Genshin co-op chain) and Self (special meter, WoW demon armor), and they combine (175). A hook is any piece of the game where a player ability or object can activate a mechanic (177). The combinations section ends with Hades knockback and stunning (187) and Magicka electrocution, which touches all four (189). Slide 153 frames it as "Walls vs Webs".
- Hard as text: the combination slides are a list of game names. The "web" only shows up when you add a context layer and watch the outcomes multiply.
- Proposal: a small top-down arena and one ability, a knockback shove. Toggle each context layer on: Environment adds walls, spikes and a ledge (shove into a wall stuns, into spikes damages, off a ledge kills); Opponent adds a shielded enemy and a stunned enemy (shove breaks the shield, a stunned target flies further); Ally adds a partner whose attack the shoved enemy lands in front of; Self adds a meter that fills on each wall slam and makes the next shove bigger. A side panel draws the web: the ability in the centre, a strand to each hook it can use, and a counter of distinct outcomes (one layer alone vs all four). Flip to "wall" mode to see the same ability with only its intended target. GIF tours the layers one by one.

**Hook highlighter** (slides 176-184), effort **S**
- Teaches: hooks are the places an ability can activate a mechanic: hookshot targets, slide-friendly slopes, deep water, ledges, cover, grapple points, wall-jump walls.
- Proposal: one original side-view level shown twice: plain, then with every hook outlined and tagged by the ability that uses it. A GIF fades the outlines in.

## Part 6: How Mechanics Impact Resources and Resource Flow (slides 195-259)

**Resource pool sandbox** (slides 198-213, 257), effort **M**, **TOP 5**
- Teaches: a resource is a pool that can be accumulated, capped and spent (199). Its three parts are generators (inflow), spenders (outflow) and capacity (201-202). Generators: passive, active, conversion, conditional (204-207). Without outflow it fills forever, or there can be an equilibrium point where it leaks above a threshold (208-209). Spenders: active, passive, triggered, theft (210-213). Slide 257 says to iterate by exploring the extremes: double or halve capacity, inflow and outflow.
- Hard as text: flow is a rate over time, and the slides show it as a still bar (MP 75/100). Novices can't feel how changing one rate reshapes play.
- Proposal: an MP pool with inflow pipes and outflow drains, each a toggleable generator or spender from the slides' lists (passive regen per second, an active "channel" button, convert HP to MP, a conditional "on hit" gain; casting, passive decay, a triggered drain, an enemy that steals). A capacity slider and a leak threshold for equilibrium. A live graph of the pool over 30 seconds, plus a "can I cast?" strip that shows when the player is blocked. Slide 257's six buttons (x2 and x½ for capacity, inflow, outflow) jump straight to the extremes. Presets: Dark Souls stamina, God of War rage meter (200).

**Cast timeline: Life Tap, class imbalance and tokens** (slides 226-256), effort **M**, **TOP 5**
- Teaches: the case study. Life Tap trades 40 HP for 40 mana: risky alone (227), free in a raid because the healer refills it (228), and so the warlock casts forever and mashes buttons (229-230). Time is a resource: a 10-second timeline with Fireballs at 2.5 s fits four (233-237). Fireball deals 10 x 4 = 40; Shadow Bolt deals 13 x 3 = 39 plus a Life Tap, and 52 if Life Tap is not needed (239-245). "Just changing numbers isn't enough" (246). The fix: Shadow Bolt grants 25 tokens, casts get shorter, back to back, then the stacks reset at a milestone, with 50! hits and 2x damage taken as the cost (247-255), which lands on Destruction Warlock's Chaotic Energy (256).
- Hard as text: the deck spends about 30 build-up slides on one timeline. The ideas are rates and sequences, and a learner who misses one slide loses the thread.
- Proposal: two 10-second cast bars (mage, warlock) that the learner fills by clicking spells, with the slide's damage numbers and a running total. A mana bar under each forces Life Tap when empty, and a "raid" toggle adds a priest who heals the HP back, so the learner sees Life Tap go from cost to free. A second tab applies the token redesign step by step (tokens, shorter casts, back to back, reset at milestone) with the cast count and button presses per 10 seconds shown for each step. Numbers come straight from the slides; cast times are read off the slide timeline. GIF per stage.

**Life Tap solo vs raid** (slides 226-228), effort **S**, quick win
- Proposal: a GIF of the slide's three bars (Priest, Warlock, Boss). Solo: the warlock taps from 60 to 20 HP and the boss's next hit is a threat. Raid: the warlock taps, the priest heals +40, "THX, BRO~ / LOL!". Can be cut from the cast timeline page.

**Discrete vs continuous spending** (slides 215-216), effort **S**, quick win
- Teaches: resources can be spent in discrete chunks (ammo, Jhin's four shots) or drained continuously (a Subnautica battery).
- Proposal: an ammo counter ticking down 4, 3, 2, 1, reload next to a battery bar draining while a tool is held. One looping GIF.

**Threshold states: full-health sword beam** (slides 219-220), effort **S**
- Teaches: a resource can trigger a state when beyond a threshold (A Link Between Worlds sword beams only at full health; a character lights on fire when full of energy).
- Proposal: an HP bar and a sword. At full HP each swing fires a beam; take one hit and the beams stop until healed. GIF.

**Unlimited resources and the flow channel** (slides 222-224), effort **S**, low priority
- Teaches: resources limit player actions, and unlimited resources push the game into "too easy, boring" below the flow channel.
- Proposal: the slide's skill vs challenge chart with a dot for the player. A slider removes the mana limit and the dot slides into the boring zone; adding the cap puts it back in the channel.

**Positive feedback loop** (slide 258), effort **S**, low priority
- Teaches: converting resources both ways can make a positive feedback loop (enjoy playing music, play lots, get better, more satisfaction and motivation).
- Proposal: the slide's loop as an animated cycle where each lap grows the arrows a little, with a toggle that applies the same loop to a game resource (gold buys gear, gear earns more gold).
