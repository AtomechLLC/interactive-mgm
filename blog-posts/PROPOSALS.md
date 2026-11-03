# Blog Posts: interactive and GIF proposals

Source: the **Analyze real games** path on funsmith.world (`https://funsmith.world/#study`), read 2026-10-30. The path is built by the site's `home.js` from its article index; it lists 87 articles in four groups, and this document follows the same groups: **Post-mortems from the trenches** (26, oldest first), **Why games fail** (14), **System teardowns** (15) and **Genre breakdowns** (32). Every post was read from its funsmith.world page; the same articles are mirrored on gamedesignskills.com and xelnath.com. Links below are site paths, so prefix `https://funsmith.world`.

Nothing is built for this folder yet. Several posts already have a built interactive in another module; those are marked **already built** with the path, and the proposal is only what would be new.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

Labels in the visuals follow the project rule: no "good" or "bad". Where a post's own title uses them (*What Makes a Good RPG*, *Bad Game Design*), the visuals use precise words instead: aligned / misaligned, clear / unclear, recoverable / unrecoverable, intended / observed.

## Top 5

| # | Proposal | Post | Effort |
|---|----------|------|--------|
| 1 | Three supers, three movement answers (Shade of Aran) | Shade of Aran, part 1 (and parts 2-3) | M |
| 2 | Best button calculator: how talents collapsed a rotation to Shadow Bolt | Streamlining and Gameplay Balance | M |
| 3 | Netherspite beams: novelty, layering and how many mistakes you can recover from | Netherspite | M-L |
| 4 | Pac-Man ghost targeting: four target tiles, one straight-line rule | Pathfinding in Pac-Man | M |
| 5 | Keep only five: strip a Warlock spec to its minigame | Redefining the Warlock Class | M |

Quick wins worth doing early even though they are not top 5:
- **Ring of Blood difficulty ladder** (S). Six fights, each meant to be about 30% harder than the last, drawn as a bar staircase. Two bars break the line: Skra'gath drops below the fight before him (a class swap from Paladin to Mage cut his armor by 80%) and the Warmaul Champion spikes above it (tuned like a dungeon boss for pick-up groups). The post's lesson is visible in one picture.
- **Spline vs invisible bunnies** (S, Nightbane technical). Drag fifteen flight-path points one at a time (no multi-select, a click on the castle snaps the point onto the wall) against dropping three anchors A, B, C. A click counter and an "iterations per hour" readout carry the lesson about tooling.
- **D&D Advantage** (S). The d20 distribution for one die, best of two and worst of two, with a target number slider and the equivalent flat bonus printed (about +5 near the middle of the range, much less at the ends).
- **Valorant counter-strafe** (S). Crosshair spread against velocity: shoot while moving, stop and shoot, tap the opposite key and shoot. The spread circle and a hit/miss scatter make movement inaccuracy obvious.
- **Gacha pity** (S). Pull probability per roll and the cumulative chance curve with and without pity, using Genshin Impact's published base rate (0.6%) and hard pity (90); soft pity from about pull 74 is community-measured and labelled as such.

### Shared parts

Three pieces recur across many posts and are worth building once:
- **Raid arena kit**: a top-down room, 5 or 10 raider discs with role colours, boss telegraphs on a timeline, and real World of Warcraft spell icons from wow.zamimg.com (as in `pve-interactions/counters-wow/`). Builds on `shared/topdown.js`. Used by Attumen, Hungarfen, Black Stalker, Big Bad Wolf, Netherspite, Nightbane and Shade of Aran.
- **Five questions card**: the checklist from the Attumen post (Is it clear? Does the player care? Is there a response? Is the response satisfying? Does it fit the situation and theme?), next to the five qualities from Shade of Aran (clear, motivating, responsive, satisfying, cohesive). Any boss ability in the arena kit can be opened against the card, and the learner answers before the post's answer is revealed, the way the posts ask readers to reply in the comments.
- **Failure autopsy grid**: one heatmap shared by all fourteen failure posts (see that section).

---

## Part 1: Post-mortems from the trenches (26 posts)

Alexander Brazie's first-hand retrospectives from World of Warcraft: The Burning Crusade content design (Karazhan, Hellfire Ramparts, The Underbog, the Outland world) and the Warlock class overhaul from Classic to Mists of Pandaria. These are the posts no one else can write, so most of the larger proposals are here.

### Burning Crusade content design

**Attumen the Huntsman: The Dangers of Neglecting Research** (`/game-design/post-mortem/content-design-raid-boss-attumen-the-huntsman/`), effort **M**
- Concept: the same ability names can hide very different player experiences. Version 1 and version 2 of Attumen and Midnight share names, but each ability changed so players could respond: Charge picks one of the three most distant players (so the raid chooses who is hit), Shadow Cleave becomes a cone (melee can stand behind), Intangible Presence becomes a curse (Mages and Druids can remove it), and the merge keeps damage already done instead of respawning at full health. The lesson: implement a lead's idea, but you still own the outcome.
- Hard as text: the post lists v1 and v2 as two near-identical ability lists and asks the reader to spot the issues. The differences only show when you watch a raid try to respond.
- Proposal: **Respond-ability diff**, built on the raid arena kit. Each ability has a v1 / v2 toggle; the raid runs a scripted pull and every raider shows a small icon for what they can do about the current hit (step behind, decurse, nothing). Version 1's chain cleave always hits the tank and two melee with no answer, and Disarm makes Attumen faster. A counter tallies "hits with a response" against "hits with no response". The last slide opens Charge and Intangible Presence against the five questions card, which is exactly the exercise the post sets.

**Nazan & Vazruden: The Boss Who Stole the Show** (`/game-design/post-mortem/content-design-raid-boss-nazan-and-vazruden/`), effort **S**
- Concept: development dollars. Choosing where to spend time is a skill; the costly choice was not the flying dragon but a week spent making the dragon wake the orc and resume flying if the orc died first, when "despawn and respawn everything" took twenty minutes. Also: the dragon looked great before the pull and was out of the camera's view for the whole fight.
- Proposal: two short GIFs. **Dev-dollar ledger**: a bar per feature (flight path, flame breath, two-body loot and reset rules, the wake-up polish) sized by days spent, beside a bar of how often players notice it; Scott's line appears and the week-long bar shrinks to twenty minutes. **Above the camera**: a third-person camera frustum drawn from the side; pre-fight, Nazan circles inside it, in-fight he hovers above it, so the biggest model in the dungeon is never on screen.

**The Underbog: Technical Limitations and Design Reflections** (`/game-design/content-design-dungeon-the-underbog/`), effort **M**, shares a page with *Spawning The Outlands*
- Concept: two parts of spawning, pull composition and placement. A dungeon spawned for "realism" (homogeneous clusters, long patrols, looping sporebat formations) is flat and exhausting to run repeatedly; discrete varied packs make it clear when you can rest. The pull test (god mode, aggro each pull, wait 20 seconds, kill, repeat) turned "maybe half an hour" into two hours. And overspawning broke graphics cards: half the spawns were removed by hand.
- Proposal: **Spawn lab: pull test**. A top-down dungeon strip where the learner places packs and patrols. Press "pull test" and a party disc walks the route at the post's 20-seconds-per-pull rule; a clock, a rest-beat strip (green where the party can stop, red where a patrol or ambush can join) and a "client load" meter that rises with spawn count. Presets: the first-pass Underbog and the scrunched, linked-pairs revision. A second slide reads Jeff Kaplan's red orc pack the way the post does (silhouette, role, target order, colour pop against a red room).

**Hungarfen: Mastering Complexity and Gradual Tension** (`/game-design/post-mortem/content-design-dungeon-boss-hungarfen-the-mushroom-dancer/`), effort **M**
- Concept: three abilities can make an engaging fight when they are shaped around how players relate to them. The iterations: landmines felt binary and swingy; mushrooms that grow before bursting plus a stacking DoT made results graded; the pair test found the boss could be kited in a circle with everyone on top of him; gravity pulls removed agency; a stacking burn punished melee only. The final set: mushrooms prefer spots in front of your camera, deal extra upfront damage to clumped players, leave clouds that shrink usable space, stack a DoT that punishes chain failures, plus a short-range lifesteal at 20%. Second lesson: he was the first boss, and his intensity front-loaded the dungeon.
- Proposal: **Mushroom iteration stepper** on the raid arena kit. Five versions on tabs; each runs the same party twice (a scattered party and a "stack on the boss and kite" party). Readouts: an outcome histogram (all-or-nothing in v1, graded later), whether the kite exploit wins, and how much of the room is still usable over time. A final strip plots the Underbog's tension per boss with Hungarfen first, then the same curve reordered.

**Ghaz'an & Swamplord Musel'ik: Adding Clarity** (`/game-design/post-mortem/content-design-dungeon-boss-ghazan-and-swamplord-muselik/`), effort **S**
- Concept: Rob Pardo's point that the hardest part of an event is getting people to notice it. Ghaz'an's timed hydra race ran behind players who were looking ahead, had no voice-over, no UI and no reward for winning, so no one found it. Musel'ik is the counterpoint: an unplanned boss, kept because the loot designer assumed he was one.
- Proposal: **Did anyone notice?** A top-down corridor with the party's view cone pointing forward and the hydra racing up the pipe behind them. Toggles add selling tools one at a time (a voice line, a camera nudge, a UI timer, a breadcrumb NPC, a reward), and a "players who noticed" meter fills with each. Short and loopable as a GIF.

**The Black Stalker: Fun for Designers Doesn't Guarantee Fun for Players** (`/game-design/post-mortem/content-design-dungeon-boss-the-black-stalker/`), effort **S-M**
- Concept: a pet idea (psychic lightning mushroom tripod that juggles players in the air) built for the designer; Jeff Kaplan got motion sick. The fix was a list of small changes: lift only one non-tank, let the lifted player cast, make Static Charge dispellable, allow only one Static Charge target, stop the bouncing after the yank.
- Proposal: **Levitate, before and after** on the raid arena kit. Version 1 lifts random players including the tank and healer and spins the camera (shown as a small inset camera icon spinning, not as a spinning screen); a run counter shows how often the party wipes. Each of the six tweaks is a checkbox; turning them on raises survival and adds agency icons (Dispel Magic, "can still cast"). Lands the line "an encounter is meant for the players, not the designer."

**The Big Bad Wolf: Embracing Simplicity** (`/game-design/post-mortem/content-design-raid-boss-the-big-bad-wolf/`), effort **M**
- Concept: safe brainstorming builds an idea one contribution at a time (Little Red Riding Hood: no armor, abilities disabled, run faster; a fear to reset threat; a voice line telling you to run), and critique belongs after an idea resonates. The question the team missed: how can everyone else help Little Red survive? Players answered with their class kits: Blessing of Protection, Slow, Thunder Clap, Intervene, Demoralizing Shout.
- Proposal: **Run, Little Red**. A playable kite around the Opera House stage: when you get the debuff, WASD to run while the wolf chases. A raid composition picker adds helper buttons with real WoW icons (Blessing of Protection, Slow, Thunder Clap, Intervene, Demoralizing Shout) and shows how much longer Little Red lives with each. Greyed-out buttons show the post's unbuilt ideas (trip the wolf, set traps). A second slide is a "yes, and" chain GIF: each speaker's line adds one rule card to the fight.

**Netherspite: The Clash of Novelty and Game Difficulty**, **TOP 5** (`/game-design/post-mortem/content-design-raid-boss-netherspite/`), effort **M-L**
- Concept: a novelty fight that breaks deep rules (players stand in beams to steal the boss's power and must swap them) has to constrain difficulty, or it becomes "a dance: you had to take exactly the proper steps or you failed." The post shows three versions: v1 one-shots with unclear beams over the players' heads; v2 forces swapping by killing anyone who holds a beam too long, which works and is boring; v3 piles on every colleague's feedback at once (void zones, a banish phase with knockbacks, randomized portals) until the tooltips are paragraphs and QA beat it once. Players learned it, then skipped it.
- Hard as text: the problem is layering. Each added rule is reasonable on its own; the cost is in how few mistakes the final fight can absorb.
- Proposal: a beam simulation on the raid arena kit: three portals (red tank, green healer, blue damage) with beams that snap to the floor, a buildup debuff that forces a swap, and the boss's power when a beam is uncovered. The learner drives one raider; the rest follow a script. A layer panel adds v3's features one by one, and two meters update: **steps that must be exact** and **mistakes the raid can recover from**. A third toggle, "let players use their own tools", restores the retrospective's fixes (telegraphs before protection moments, fewer spell layers). The end card quotes the lesson: create situations that let players use their own tools, not just yours.

**Nightbane: Collaboration and Designing for External Stakeholders** (`/game-design/post-mortem/content-design-raid-boss-the-dragon-nightbane/`), effort **S**, low priority
- Concept: a boss commissioned from outside the boss team (a secret raid boss summoned from a quest, "TOUGH", a bone dragon burning from inside, a gear check) and the designer's own class bias.
- Proposal: a brief board GIF. Request cards from each stakeholder (quest designer, lead, item designer, the designer's own wish list) drop into the kit they produced (standard dragon kit, fly phases, cinematic moments). Short; mainly a lead-in for the next two posts.

**Nightbane: Overcoming Unforeseen Technical Challenges** (`/game-design/post-mortem/content-design-raid-boss-building-nightbane/`), effort **S**, quick win
- Concept: the editor could not multi-select, so a flight spline meant dragging every point into the air one at a time, and clicking a building snapped the point onto it. The replacement: three invisible "bunny" markers A, B, C in the air; the dragon circles, then picks one. Fast to iterate and enough for the experience. Lesson on tooling, and on being typecast as "the flying boss guy".
- Proposal: **Spline vs invisible bunnies** (see quick wins). The bunny markers also appear in the Chess Event, so the same widget can be reused there.

**Nightbane: When Design Assumptions Collide with Actual Gameplay** (`/game-design/post-mortem/content-design-raid-boss-balancing-nightbane/`), effort **M**
- Concept: every tweak had a prediction and every prediction met live players. Fear got a 3-second cast, a 3-second duration and a swing-timer reset; threat wiped on lift-off and landing; skeletons moved from two flank waves (needing three tanks) to a bone breath in the crowd; an anti-exploit fireball for players who never left the stairs. Live: a melee swing could still queue through fear after a parry, an Earth Shield bug sent all threat to the tank, players clumped through Rain of Fire, and the anti-exploit fireball wiped raids when someone pulled aggro on the roof.
- Proposal: **Intended vs observed**. One card per mechanic, split in two columns: the designer's prediction animates on the left, the live behaviour on the right, from the post's own lists. A timeline slide shows the fear cast and the melee swing timer, with and without the queued-swing bug, so the "extra swing" is visible on the frame where it lands.

**Shade of Aran: Unveiling the Ingredients of a Well-Crafted Boss**, **TOP 5** (`/game-design/post-mortem/content-design-raid-boss-the-shade-of-aran/`), effort **M**
- Concept: the one thing every class has in common is movement, so each school's super asks for a different movement answer. Arcane: pulled to the middle, run out before the explosion. Frost: a Blizzard that moves clockwise around the room in a predictable pattern, so you follow it. Fire: Flame Wreath rings around three players; crossing your ring detonates on your allies and knocks you up so everyone sees who crossed. The fight is the post's five qualities: clear, motivating, responsive, satisfying, cohesive.
- Hard as text: three sketches and a description. The point is that one verb (move) gives three distinct answers (leave, follow, stand still), which you only feel when you play it.
- Proposal: a playable top-down room (WASD) with Aran at the centre cycling through the three supers, each with its slide's sketch beside the arena (circle growing outward, slice rotating like a clock, rings). A "response" readout names what the player did (left, followed, held still) and whether it matched. A toggle swaps in the rejected early ideas (a debuff that explodes when you move, the Invoker-style "punish more the more you move") so learners see why the ring of fire won: plenty of warning, a visible line, a clear culprit. The five qualities card runs alongside. Parts 2 and 3 below reuse the same arena.

**Finding the Golden Nuggets: How to Prioritize Ideas for Shade of Aran** (`/game-design/post-mortem/content-design-raid-boss-the-shade-of-aran-collaboration/`), effort **S**
- Concept: collect raw ideas widely, then filter them into a structure. The colleagues' suggestions (Counterspell, Chains of Ice, Polymorph, Dragon's Breath, Water Elementals, drinking water, a line for anyone carrying Atiesh) happened to include three crowd controls, one per school, which completed a 3x3 chart of direct damage, super and crowd control.
- Proposal: **Idea sorter**. Idea cards with WoW spell icons and the colleague who suggested them; drag each into the school x slot grid (Arcane / Fire / Frost against Damage / Super / Control) or into a "parking lot". When the grid is full the post's chart appears; the parking lot shows which ideas came back in part 3.

**Shade of Aran: The Power of Playtesting for Iterative Design** (`/game-design/post-mortem/content-design-raid-boss-the-shade-of-aran-polishing/`), effort **M**, shares the part 1 arena
- Concept: fast iteration with QA. The notes and their fixes: the same super twice in a row felt unfair, so a cycler guarantees all three before repeating; Polymorph before Arcane Explosion and Dragon's Breath during Flame Wreath took control away, so Polymorph left; chasing a blinking Aran was annoying, so blink left; the fight was flat, so Mass Polymorph at 20% mana (the raid heals to full while sheeped, Aran drinks, then Pyroblast for 80% of current health) became a pace break; water elementals were taunted and ignored, so they became four ranged elementals that last until killed; the raid stood inside the Blizzard, so an AoE Counterspell went in; a 12-minute timer stopped six-healer stalls. After launch, Flame Wreath had no check for which player crossed the ring, so the community learned "everyone stop moving", and it was never changed.
- Proposal: **QA note to patch**. A fight ribbon (a timeline of supers, casts and phases) rendered from the current version; each QA note card, when applied, changes the ribbon and the arena. The last toggle is the shipped Flame Wreath bug: with it on, the whole raid freezes during Fire phase. A small counter keeps the post's other cost visible: QA hours used, against the four-times-normal figure from the post.

**The Chess Event: Taking Risks for Extraordinary Rewards** (`/game-design/post-mortem/content-design-special-quest-the-wolf-to-bishop-chess-event/`), effort **M**
- Concept: a minigame inside an engine built for something else. The rules were chosen for people, not chess: each player controls their own piece, there are more pieces than players so those who die can jump into another, the king is the strongest piece (so keeping it back is not the best play), you always play your own faction, and Medivh cheats for drama. The engine problems: a pathing grid larger than the board squares, and AI tools built for single units, solved with invisible creatures at the centre of each square.
- Proposal: **Why not just chess?** A board in the Karazhan room with rule toggles; each rule off shows its failure state in a readout (one player decides everything, dead players sit out, the king hides, the AI is decimated). A grid overlay compares the engine's pathing cells with the 64 squares and then drops the invisible square markers. Reuses the bunny widget from Nightbane.

**Spawning The Outlands: Structure and Mentorship** (`/game-design/post-mortem/content-design-world-building-crafting-the-outlands/`), effort **M**, shares the Underbog page
- Concept: Michael Heiberg's approach: each monster is a note in a song, and too much of one note is dull. Abilities fall into four categories, family (wolves howl), reactive (you can interrupt or line-of-sight a Fireball), preparation (pull the one that calls for help away first) and flavor, and the zone guidelines that came out of pull testing: watch control-effect crossover, give every monster combat space, use chain pulls and call-for-help carefully, keep disruptive patrols scarce and consistent.
- Proposal: **Spawn lab: notes in a song**. Place Hellfire Peninsula camps from a palette of monsters, each tagged with its ability categories (four colours). A "song" strip under the map plays the categories in the order a player meets them, so repeated notes show as runs of one colour. A pull test reports time spent stunned and the chance of a chain pull. Preset: the first pass (every warrior charges and stuns, every caster casts Fireball) against the planned version.

**The Ring of Blood: Balancing Fantasy and Gameplay** (`/game-design/post-mortem/content-design-quest-chain-the-ring-of-blood/`), effort **S**, quick win
- Concept: an outdoor five-player quest chain where every fight teaches a dungeon skill under a strong theme: Brokentoe (start with three people), the Blue Brothers (crowd-control immune, two targets to tab between), Rokdar (a knock-away timed as insurance for the healer), Skra'gath (resists a school the more it is used; silences casters in melee), the Warmaul Champion (charges the most distant player), and Mogor's surprise entrance (dispel, interrupt, a totem to swap to, a self-revive, a frenzy). Each fight about 30% tougher than the last. Two tuning misses: Skra'gath's class swap removed 80% of his armor, and the Champion was overtuned for outdoor groups.
- Proposal: the difficulty ladder from quick wins. Hover each bar for the skill it teaches and the theme beat. Optional second slide: Mogor's five mechanics as five WoW icons, each lighting when the matching response is used.

**Anzu & the Druid Flight Form: Class Quests and Personalized Gameplay** (`/game-design/content-design-raid-boss-anzu-and-druid-flight-form-quest/`), effort **S-M**
- Concept: a class quest structure (discovery from many NPCs, story framing, resource collection, exposition, solo tests, climax, group test) and trials that ask for each Druid form: endure as a bear at the eagle statue, outpace rising damage as cat or moonkin at the falcon, root and kite at the hawk. Anzu rewards an attentive Druid (Rejuvenation on statues for buffs) and drops a mount that makes every party want a Druid along.
- Proposal: **Form exam**. Three trials, each with a form picker (Bear, Cat, Moonkin, Tree icons); the chosen form plays the trial and passes or fails it. The quest structure is a ribbon across the top that fills as you go. A last slide shows Anzu's three statues and what each Rejuvenation buys.

### The Warlock overhaul series

Already built in `understand-mechanics/`: `life-tap/` and `life-tap-trade/` (the Life Tap trade solo vs raid), `cast-timeline/` (Shadow Bolt + Life Tap rotation and the TBC +30%) and `chaotic-energy/` (Mists of Pandaria Destruction with Burning Embers, playable). The proposals below link to those and add what they do not cover.

**Back to WoW Alpha & Classic: How Unnecessary Skills Hindered the Warlock** (`/game-design/post-mortem/class-design-warlock-mop-overhaul-retrospective-alpha-classic-warlocks/`), effort **M**
- Concept: the foundational Warlock principles, through Mike Heiberg and Kevin Jordan: Warlocks prepare, endure and recover (Demon Skin, Healthstones, Soulstones, Drain Life, Life Tap) rather than react perfectly; modality, where each demon is a distinct job you choose before you need it (Imp safe and buffs health, Voidwalker for soloing, Felhunter against casters, Succubus for control); agency; utility; and a cycle (dot, cast, tap, regen). Mike's three decision types: preparation, challenge, recovery. Adding a blink to the class "would undermine its character".
- Proposal: **Prepare, challenge, recover**. A pull drawn as a three-phase timeline. Drag Warlock spell icons into the phase where they act; the Mage's (Blink, Ice Block, Frost Nova) are a toggle for comparison and land mostly in "challenge". A second slide is the pet modality matrix: four demons against five situations (solo quest, dungeon caster pack, arena vs healer, raid, PvP stun), each cell showing the trade.

**The Core Fantasy: What Went Wrong in Warlock Talent Trees** (`/game-design/post-mortem/class-design-warlock-overhaul-classic-warlock-talent-tree/`), effort **S-M**
- Concept: talents were valued at about 1% per point (gold medal talents about 5x), so the larger and more competitive the group, the more those small numbers mattered. Demonology bought survivability, which is worth little in a raid with an overflow of healing, and abundant healing also erased the deal-damage, Life Tap, recover cycle. "Incentives count."
- Proposal: **Incentive weigher**. A context slider (solo, battleground, five-player dungeon, forty-player raid) and a healing-abundance slider. Bars show what each tree's points are worth in that context; Demonology's survivability value falls as healing rises, and the cycle strip (cast, tap, recover) flattens to cast-cast-cast at full raid healing. Links to `understand-mechanics/life-tap-trade/`.

**Warlock's Long-Term Burden: Short-Term Band-Aid Fixes** (`/game-design/post-mortem/class-design-warlock-overhaul-signature-spells/`), effort **S**, low priority
- Concept: the burned-out class team's problems were patched from outside the class: Soul Shard bags from professions, Ritual of Souls, Soulshatter, Fel Armor's healing bonus to make healers want to heal Warlocks, signature spells per spec. Each eased a symptom and hid the root.
- Proposal: a symptom tree GIF. Root nodes (shard inventory burden, healer drain, specs that look alike) with each Burning Crusade addition attached as a patch on a leaf. A "fix the root" toggle removes the root node and most patches fall away with it.

**Warlock's Overhaul: Streamlining and Gameplay Balance**, **TOP 5** (`/game-design/post-mortem/class-design-warlock-overhaul-the-one-button-rotation-gameplay/`), effort **M**
- Concept: Kris's whiteboard. Spell power coefficients scale with cast time against a 3.5-second baseline; Shadow Bolt was shortened to 3.0 seconds but kept a coefficient of about 0.857 (the post says "roughly 6/7"); Shadow and Flame added 20% to it; Bane cut its cast time; Improved Shadow Bolt multiplied direct Shadow damage; and nothing else in the book had a coefficient above 1.0. So the optimal play became spamming one button, and players who preferred Affliction's juggling lost. Also: small multiplicative talents compound (2% thirty times is about 81%).
- Hard as text: the post is a dialogue full of coefficients. The conclusion, "there's no other button with a better coefficient", is one picture.
- Proposal: **Best button calculator**. Every Warlock damage spell as a bar of damage per second of casting (base plus coefficient x spell power, from the post's list: Immolate, Incinerate, Corruption, Curse of Agony, Curse of Doom, Shadow Bolt). Talent toggles from the post's 21/40 build (Demonic Sacrifice, Improved Shadow Bolt, Ruin, Backlash, Bane, Shadow and Flame) and a spell power slider re-sort the bars; under them, the optimal rotation strip collapses toward Shadow Bolt only. A compounding widget beside it multiplies small talents. Links to `understand-mechanics/cast-timeline/`. Accuracy note: the post's "2.5 second cast, 1.02 coefficient" is the rounded result of 0.857 x 1.2 (about 1.03); the page should show its own arithmetic.

**Warlock's Overhaul: Trade-offs and Limited Design Space** (`/game-design/post-mortem/class-design-warlock-overhaul-the-overlap-with-new-death-knight-class/`), effort **S**
- Concept: the hero class vote (Death Knight, Rune Master, Necromancer). Brazie voted Rune Master for mechanical diversity; the Necromancer stomped on the Warlock's space; the Death Knight shipped with AoE, minions, resurrection, an evil fantasy and Death Coil, all close to the Warlock. New things need something removed, or the space fills. Side story: Army of the Dead got its purpose by flipping it into 1-HP ghouls that taunt.
- Proposal: **Design space map**. A two-axis map (fantasy x mechanics) with chips for Warlock, Shadow Priest, the three hero class pitches and the shipped Death Knight; shared mechanics (pets, DoTs, Death Coil, fear, AoE) draw overlap regions. Picking each pitch shows how much Warlock area it covers. The Army of the Dead flip can be a three-second GIF linked to `mechanics-tools/inversion/`.

**First WoW Class Overhaul: Redefining the Warlock Class**, **TOP 5** (`/game-design/post-mortem/class-design-warlock-mop-overhaul-redefining-the-class/`), effort **M**
- Concept: by Cataclysm the three specs felt the same, and play rate had fallen 42% (Cynwise's articles). The rework aligned fantasy and mechanics: "If I could keep only five things for each spec, what would be left?" Affliction kept Corruption, Agony, Unstable Affliction, Fear and Drain Life / Soul, a juggler. Destruction was "Simon Says". Demonology's core was uninteractive, and its fantasy (tough, unstoppable, sacrificing minions) was a tank's. Then the physical games inside WoW: DoTs and Fear as juggling, procs as Simon Says, Death Knight runes as Guitar Hero, rogue combo points as piano sequences, warrior rage as drums, Fire mage as a slot machine.
- Hard as text: the "keep five" exercise is an activity. Readers should do it before they see the answer.
- Proposal: **Keep only five**. The full Cataclysm Warlock spellbook as WoW icons. For each spec the learner picks five; then the post's five appear, and a small animation shows the minigame those five make (juggling DoTs across targets while Fear pushes them away). A second slide is the instrument wall: each resource system from the post next to a looping hand animation of its physical game. Destruction's inverted model (health instead of mana, Ember Tap) points to `understand-mechanics/chaotic-energy/`.

**The MoP Warlock: A Novel Resource System** (`/game-design/post-mortem/class-design-warlock-mop-overhaul-new-resource-system/`), effort **S-M**, partly **already built** (`understand-mechanics/chaotic-energy/`)
- Concept: Chaotic Energy (mana refills every 20 seconds, Life Tap removed) combined **pressure** (an overflowing bar punishes distraction) with **forgiveness** (a short pause to step out of fire costs little), unlike Life Tap, where any pause out of mana is a loss. Then capacitance: let players spend power in chunks with a high cap, so the choice of *when* returns to them. Conflagrate got two charges. The four conditions for decision making: different answers, situations where each is right, ambiguity, and flexibility in when to answer.
- Proposal: what the existing page does not show. **Pressure and forgiveness**: three resource bars side by side (out-of-mana Life Tap, Rogue energy, Chaotic Energy) under the same scripted 1.5-second "move out of the fire" break, with damage lost printed under each. **Capacitor**: a cap slider from 1 to 4 charges with the same incoming proc pattern; at cap 1 the timing is forced, at higher caps the learner can hold for a vulnerability window.

**Warlock Overhaul Part 3: Going Wild with Demonology** (`/game-design/post-mortem/class-design-warlock-overhaul-demonology/`), effort **M**
- Concept: five ideas for Demonology (Pikmin swarms, the player as the pet, a melee Warlock, a Warlock tank with pets dealing damage, and the Dark Apotheosis compromise) and what each one taught. The shipped answer gave each spec a power shape: Affliction consistent, Destruction built up then burst, Demonology a controllable ebb and flow through Demonic Fury (enter Metamorphosis at 25 Fury, it drains, leave early to re-enter sooner).
- Proposal: **Three power shapes**. Damage-over-time curves for the three specs on one chart (flat, sawtooth, player-shaped). The Demonology lane is playable: a Fury bar that fills while casting, a key to enter Metamorphosis at 25 or more and a key to leave early, and the curve draws as you play. A side carousel of the five ideas, each with its one-line reason for being cut (server cost of many pets, melee in an auto-attack engine, no cloth tanking gear), keeps the iteration story.

---

## Part 2: Why games fail (14 posts)

These posts share one shape: a numbered list of reasons and a "what can designers learn" section. A separate interactive per reason would repeat itself, so the proposal is one shared grid plus one mechanic-level visual per game, chosen for the reason that is most about design rather than business.

**Failure autopsy grid** (all 14 posts), effort **M**
- Rows: the thirteen games. Columns: the ten categories from *Why Do Shipped Video Games Usually Fail?* (repetitive gameplay, technical issues, gameplay, monetization, narrative and writing, pacing and flow, lack of support, player retention, community, marketing). A cell lights when that post lists a reason in that category; hovering shows the post's own heading. Sorting by column shows which causes recur (technical issues and pacing appear in most); clicking a row opens that game's visual below. Cell labels use the post's nouns ("netcode", "loot system"), not value words.

**Why Do Shipped Video Games Usually Fail?** (`/game-design/why-do-shipped-video-games-usually-fail/`), effort covered by the grid
- Concept: most shipped games fail commercially, and failure looks different by hype and scale. The ten categories are the grid's columns, so this post is the grid's legend and front page.

**Why Did MultiVersus Fail?** (`/game-development/why-did-multiversus-fail/`), effort **S**
- Concept: "job-like pacing": battle pass XP tied to challenges rather than play, and a slower unlock grind after relaunch.
- Proposal: two progress bars filling over play sessions, beta rules and relaunch rules, with XP from playing against XP from completing listed challenges. The number of sessions to unlock one character is the readout. Numbers illustrative and labelled so.

**Why Did Kerbal Space Program 2 Fail?** (`/game-design/why-did-kerbal-space-program-2-fail/`), effort **S**
- Concept: overambitious scope: about seven years against a two-year target, a reported $50 million, and one of five planned roadmap updates delivered.
- Proposal: a Gantt GIF. The planned two-year bar, then feature-creep segments stacking onto it until it reaches seven; the roadmap's five milestones below, one filled.

**Why Did Concord Fail?** (`/game-design/why-did-concord-fail/`), effort **S**
- Concept: a $40 hero shooter among free-to-play competitors, without a feature that set it apart. The post gives $325,000 gross revenue.
- Proposal: a positioning map, price against distinctiveness, with Overwatch 2, Valorant, Marvel Rivals and Concord as portraits. Concord sits alone in the paid, low-distinctiveness corner.

**Why Did XDefiant Fail?** (`/game-development/why-did-xdefiant-fail/`), effort **S**
- Concept: netcode. Hit registration and desync made deaths feel unfair, and the Snowdrop engine was built for an MMO, not a shooter.
- Proposal: a split timeline: the shooter's screen (shot lands), the server's view a few ticks later (target already moved), and the victim's screen (died behind cover). A latency slider widens the gap. Reusable for any online-shooter post.

**Why Did Anthem Fail?** (`/game-design/why-did-anthem-fail/`), effort **S**
- Concept: the loot loop. Most drops were junk, so repeating content stopped paying, and the endgame had nothing to chase.
- Proposal: a drop distribution histogram and a "reason to run it again" meter that fills only when a drop beats current gear. Two presets: launch drops and a tuned table.

**Why Did The Texas Chain Saw Massacre Fail?** (`/game-design/why-did-texas-chain-saw-massacre-fail/`), effort **S**
- Concept: asymmetric refers to team numbers (3 vs 4), not effectiveness; and a pay-to-win character in a game where a picked character is locked for everyone else.
- Proposal: a balance scale, three killers against four victims, where each character's power weight is added as it is picked; the DLC character's weight tips it, and a lobby GIF shows the lock-out when someone else picks him first.

**Why Did Battlefield 2042 Fail?** (`/game-design/why-did-battlefield-2042-fail/`), effort **S**
- Concept: 64 vs 64 on large open maps with little cover; more players did not mean more fights worth having.
- Proposal: a top-down map with a cover layer and 128 dots; a heatmap shows where fights cluster and where players cross open ground. Toggle 32 vs 32 on the same map.

**Why Did WildStar Fail?** (`/game-design/why-did-wildstar-fail/`), effort **S**
- Concept: a casual, cartoon aesthetic and marketing that attracted one audience, and a hardcore 40-player endgame that served another.
- Proposal: a funnel GIF: players drawn in by the trailer style flow toward the level cap and drop off at the attunement and raid wall, while the raiders the endgame was built for never entered the funnel.

**Why Did Mortal Kombat 1 Fail?** (`/game-design/why-did-mortal-kombat-1-fail/`), effort **S**
- Concept: the Kameo system changed a 1v1 fighter's core, and single-player content was thin at launch.
- Proposal: a combo string strip, the same combo with and without a Kameo assist, showing how the assist inserts frames the 1v1 player cannot answer alone. Kept short; the rest of the post sits in the grid.

**Why Did Dragon Age: The Veilguard Fail?** (`/game-design/why-did-dragon-age-the-veilguard-fail/`), effort **S**
- Concept: mismatched expectations: marketing and franchise legacy (dark fantasy, party tactics, consequential choices) against the shipped game.
- Proposal: a radar with two outlines, the series' promise and the post's reading of the shipped game, axes for tactical party control, choice consequence, tone and combat. Labels are the post's nouns.

**Why Did Starfield Fail?** (`/game-design/why-did-starfield-fail/`), effort **S-M**
- Concept: over-reliance on procedural generation: repeated outposts and empty planets replaced Bethesda's handcrafted density.
- Proposal: **Same outpost again**. Land on eight procedurally rolled planets in a row; a repetition counter tallies identical point-of-interest layouts. Toggle a handcrafted region of the same size for contrast. Pairs with *Composition: bespoke vs procedural* (`composition/gifs/bespoke-vs-procedural.gif`).

**Why Did Friday the 13th Fail?** (`/game-design/why-did-friday-the-13th-fail/`), effort **S**
- Concept: mixed incentives: each counselor's goal is their own escape, so cooperation is optional, which fed toxic behaviour. (The post also credits the developers for handling a lawsuit-blocked live service with poise.)
- Proposal: a two-counselor payoff matrix (help / ignore) with escape chances in each cell, then the same matrix with a shared-escape bonus that makes helping the stronger choice.

**Why Did Evolve Fail?** (`/game-design/why-did-evolve-fail/`), effort **S**
- Concept: matchmaking by connection rather than skill, so new players met veterans, on top of a steep two-role learning curve.
- Proposal: a skill-gap histogram for a thousand simulated matches, with skill-based matchmaking off and on; a win-chance line for the newest player sits on top.

---

## Part 3: System teardowns (15 posts)

**How Does the Batman: Arkham Combat System Work?** (`/game-design/batman-arkham-combat/`), effort **M**
- Concept: free-flow combat: one strike button, a counter prompt, rhythm and animation-driven movement that carries Batman between enemies, a combo meter that unlocks takedowns, and high enemy variety that changes which tool you use.
- Proposal: a two-key playable ring of thugs. Strike to chain, counter when the prompt shows; the combo counter and a rhythm strip (beats you hit against beats you missed) show that timing, not button speed, keeps the chain. Toggle enemy types (knife, shield, armored) that each require a different answer.

**13 RPG Games with the Most Classes** (`/game-design/rpgs-with-most-classes/`), effort **S**
- Concept: class counts range from 9 to 59; more classes give builds and replay value.
- Proposal: the post's counts as a bar chart (Warframe 59, Fire Emblem: Three Houses 45, Pathfinder 38, Tales of Maj'Eyal 37 and so on), with a second bar per game for distinct roles. The gap between the two ties to the depth module's three tiers (`depth/three-tiers/`).

**How Does Pathfinding Work in Minecraft?** (`/game-design/minecraft-pathfinding/`), effort **M**
- Concept: mobs pick a goal, then run a weighted A* where some blocks carry penalties; mob farms exploit those goals, penalties and blind spots to steer mobs from a spawner to a grinder.
- Proposal: a block grid with Minecraft tiles. Paint water, lava, fences and trapdoors; the search frontier and the chosen path animate, with the cost of each tile visible. A mob-farm preset funnels zombies to a drop.

**Final Fantasy Combat Systems** (`/game-design/final-fantasy-combat-systems/`), effort **M**
- Concept: turn-based, Active Time Battle and real-time combat, and how the post ranks them on strategic depth, customization and ease of understanding.
- Proposal: three lanes of the same fight over time. Turn-based: the world waits. ATB: gauges fill continuously and the enemy acts while you choose (Wait vs Active toggle). Real-time: input is the clock. A decision-time readout per lane.

**Combat System in Oblivion Remastered** (`/game-design/oblivion-combat-system/`), effort **S**
- Concept: real-time, attribute-based combat: your character's skills and fatigue shape outcomes as much as your timing.
- Proposal: the same sword swing at low and high Blade skill, and fresh and fatigued, with the damage breakdown split into player input and character stats.

**25 Video Games with the Best Lighting** (`/game-design/games-with-best-lighting/`), effort **S**
- Concept: lighting clarifies routes, builds mood and drives stealth.
- Proposal: one room lit three ways: a path-guiding light (clarity), low key (horror mood), and a Thief-style light gem that rises as the player steps out of shadow (mechanic).

**10 Hardest Video Game Missions of All Time** (`/game-design/hardest-video-game-missions/`), effort **S**
- Concept: missions are hard for different reasons: reflex and memorization (Turbo Tunnel), time limits (Mile High Club), puzzle navigation (Water Temple), endurance (Path of Pain, Champion's Road).
- Proposal: a small radar per mission over five sources of difficulty, readings taken from the post's descriptions; selecting two overlays them.

**Dungeons & Dragons Combat System** (`/game-design/dungeons-dragons-combat-system/`), effort **S**, quick win
- Concept: turn order by initiative; actions, bonus actions and movement; and Advantage / Disadvantage (roll two d20, keep the higher or lower).
- Proposal: the Advantage widget from quick wins, plus a turn-economy strip (action, bonus action, movement, reaction) that lights each slot a player used, aimed at the post's "common mistakes" list.

**18 Best Video Game Missions of All Time** (`/game-design/best-missions/`), effort **S-M**
- Concept: memorable missions pair a mechanic with a narrative beat, often introducing something new (Titanfall 2's Effect and Cause time-shifting, Half-Life 2's Ravenholm gravity gun, Resident Evil 4's village as a tutorial under pressure).
- Proposal: an Effect and Cause demo: one top-down room in two eras with a toggle key; hazards in one era are open floor in the other, so the route needs both.

**Pathfinding in Pac-Man**, **TOP 5** (`/game-design/pac-man-pathfinding/`), effort **M**
- Concept: each ghost aims at its own target tile and, at every intersection, takes the step with the shortest straight-line distance to it. Blinky targets Pac-Man's tile; Pinky four tiles ahead; Inky doubles the vector from Blinky to the tile two ahead of Pac-Man; Clyde chases until he is within eight tiles, then heads for his corner. Scatter and chase timers alternate. Simple rules, four personalities, all learnable. (The post describes the principle; the four target rules are the well-documented arcade behaviour and should be cited on the page.)
- Hard as text: the target rules are easy to state and hard to picture, especially Inky.
- Proposal: a playable maze with each ghost's target tile drawn as a coloured cross and a line from the ghost. Pause anywhere to see the distance check at the next intersection. Toggles: show one ghost at a time, force scatter, and "everyone uses Blinky's rule", which collapses four ghosts into a conga line.

**15 Video Games with the Best Level Design** (`/game-design/best-level-design-games/`), effort **M**
- Concept: the post's common threads: environmental storytelling, intuitive teaching, exploration and interconnection (Dark Souls first).
- Proposal: a Dark Souls style area graph: walk the nodes to a bonfire, open a shortcut, and watch the shortest-path distance back to the bonfire drop. The map stays the same size; the loops make it feel smaller.

**23 Games With the Best Environment Design** (`/game-design/games-with-best-environment-design/`), effort **S**
- Concept: environments communicate an artistic vision and guide players (Ghost of Tsushima's guiding wind).
- Proposal: the same open field with three guidance methods in turn: HUD waypoint, landmark on the horizon, and wind through the grass. A gaze heatmap per method shows where attention goes.

**10 Games with Destructible Environments** (`/game-design/games-with-destructible-environments/`), effort **S-M**
- Concept: letting players break and reshape terrain, instead of facing static maps.
- Proposal: a small block level with an exit; count the routes available with fixed walls, then with breakable walls (Teardown, Minecraft), and draw the extra routes as they open.

**7 Popular Games That Use Blender** (`/game-art/popular-blender-games/`), effort **S**, low priority
- Concept: Blender's use from indies to AAA studios (Embark, Iron Gate).
- Proposal: a short pipeline GIF from model to engine; low value for a mechanics course, listed for completeness.

**Bad Game Design: Examples of Games** (`/game-design/bad/`), effort **S-M**
- Concept: "bad" design is a design that conflicts with the game's own goals, emotions and pillars; the vague label is an unhelpful critique. The same trait (trial-and-error deaths, output randomness) can be aligned in one game and misaligned in another.
- Proposal: an alignment matrix. Rows: traits from the post (blind trial and error, grind, input vs output randomness). Columns: games with different goals. Each cell reads **aligned** or **misaligned** with a one-line reason. A toggle next to it switches a card from input randomness (dealt before you choose) to output randomness (rolled after you choose). Per the project rule, the visuals never print "good" or "bad".

---

## Part 4: Genre breakdowns (32 posts)

The genre guides each define a genre's fundamentals and mechanics. One widget per genre, aimed at the single mechanic that defines it, keeps these small.

**What Makes a Good RPG Video Game?** (`/game-design/good-rpg/`), effort **S**
- Concept: seven ingredients, ending on difficulty balance: a consistent challenge that grows with the character.
- Proposal: player power against enemy power over a campaign, with level-ups as steps. Sliders for XP rate and optional grinding show the gap widening (trivial) or closing (a wall). Title card avoids "good": "What an RPG needs".

**What Was the First Turn-Based RPG Video Game?** (`/game-design/first-turn-based-rpg/`), effort **S**, low priority
- Concept: *Dungeon* (1975) as the first, and Ultima I combining an overworld view with first-person dungeons.
- Proposal: a timeline GIF of early turn-based RPGs, ending on a split frame toggling Ultima I's top-down overworld and wireframe dungeon.

**How to Make a Card Video Game?** (`/game-design/card-game/`), effort **M**
- Concept: card data as components, a deck system, turn management and an event loop that resolves actions and triggered abilities in order.
- Proposal: a small stack resolver: play a card, triggers queue on a visible stack, step through resolution one item at a time. Swapping the order of two triggers changes the outcome.

**Horror Game Design** (`/game-design/horror/`), effort **S-M**
- Concept: fear needs a threat that feels imminent and real; tension builds through uncertainty, sparse UI, sound and a powerful antagonist.
- Proposal: a tension curve drawn live as a scripted corridor plays; toggles for how much of the enemy is shown, a heartbeat cue and diegetic vs HUD health change the curve.

**How to Make a Game Like GTA?** (`/game-design/gta/`), effort **S-M**
- Concept: a mission system built from atomic conditions while world systems (traffic, police, pedestrians) keep running.
- Proposal: a mission builder: chain condition blocks (reach marker, lose the wanted level, deliver car) and watch the world sim keep running between them.

**How to Make a Game Like Valorant?** (`/game-design/valorant-like/`), effort **S**, quick win
- Concept: high lethality, movement inaccuracy and counter-strafing.
- Proposal: the counter-strafe widget from quick wins.

**How to Make a Game like Fortnite?** (`/game-design/fortnite-like/`), effort **S**
- Concept: a battle royale's tension comes from mechanics that push risky moves, chief among them the shrinking safe zone.
- Proposal: a storm circle shrinking over 100 dots; a density readout and an "encounters per minute" line show how the circle manufactures fights.

**MOBA Game Design** (`/game-design/moba/`), effort **M**
- Concept: strategic team play, lanes, an in-match economy and balance through agency ("no champion should do something the opponent has no tools to deal with").
- Proposal: a one-lane last-hit trainer with real League of Legends minions and gold numbers, then a counter grid of five champions (Riot portraits) where every disruption has at least one answer.

**MMO Game Design** (`/game-design/mmo/`), effort **S**
- Concept: a persistent shared world; dungeons as instanced copies; dailies with cooldowns.
- Proposal: the same rare spawn in the open world with 30 players contesting it, against five parties each in their own instance; a wait-time readout per player.

**How to Make a Game Like Gorilla Tag?** (`/game-design/gorilla-tag-like/`), effort **S-M**
- Concept: arm-driven locomotion: you move by pushing your hands against surfaces.
- Proposal: a side view of two hands and a body; drag a hand along the ground and the body moves the opposite way, with velocity carried into a jump.

**How to Make a Clicker Game?** (`/game-design/clicker/`), effort **M**
- Concept: score variables, active and passive income, and upgrades that keep a player engaged for a long time.
- Proposal: a clicker with three producers whose cost grows geometrically, and a log-scale chart of income against cost over time, so the "next upgrade is always a few minutes away" rhythm shows.

**Adventure Game Design** (`/game-design/adventure/`), effort **S-M**
- Concept: lock-and-key actions and puzzles that are relevant, varied and reasonable to solve.
- Proposal: a puzzle dependency chart builder: items and locks as nodes; the chart flags a dead end (a key behind its own lock) and shows parallel branches.

**How to Make a Game Like World of Warcraft?** (`/game-development/world-of-warcraft/`), effort **S**, low priority
- Concept: an MMORPG is a persistent service (4 to 7 years of development, large teams, backend and live support).
- Proposal: a scale chart of the post's figures; low priority because the module's other WoW pages teach more.

**How to Make a Visual Novel?** (`/game-design/visual-novel/`), effort **S-M**
- Concept: decision points, decision tracking and narrative structure.
- Proposal: the same five decisions drawn as a full branching tree (32 endings) and as branch-and-bottleneck (three endings plus tracked flags); a node counter shows the writing cost of each.

**Minecraft Game Design: What Can We Learn?** (`/game-design/minecraft/`), effort **S-M**
- Concept: modular simplicity, open-ended progression and support for many playstyles; agency and emergence from simple systems.
- Proposal: a block interaction grid (water, lava, sand, redstone) where each pair's rule is one line; count the emergent results (cobblestone generator, sand fall traps) from a handful of rules.

**Sandbox Game Design** (`/game-design/sandbox/`), effort **S**
- Concept: a toolbox plus loosely tuned challenges allow multiple solutions.
- Proposal: one river, five tools (bridge, boat, dig, ice, glide); each tool solves it a different way and a solutions counter grows as tools are added.

**How to Design an Open-World Game?** (`/game-design/open-world/`), effort **M**
- Concept: visibility and discovery, natural dividers, player verbs shaping the world, fast travel.
- Proposal: a top-down map with landmarks and sight lines; move the player and see which landmarks are visible from where. Toggle the player verb (walk, glide, climb) and the reachable and visible area changes.

**Sports Game Design** (`/game-design/sports/`), effort **S**
- Concept: balancing authenticity with accessibility (simulation vs arcade).
- Proposal: the same basketball shot under three assist levels, with the input window and outcome spread shown for each.

**Platformer Game Design** (`/game-design/platformer/`), effort **M**
- Concept: a deep moveset and responsive controls; checkpoints; metrics.
- Proposal: a jump lab with real Super Mario World sprites: sliders for gravity, variable jump height, coyote time and jump buffer, with a ghost trail of each jump. A failing ledge in the corner becomes passable as forgiveness is added; a death heatmap shows where checkpoints belong.

**RTS Game Design** (`/game-design/real-time-strategy/`), effort **S-M**
- Concept: important but competing tasks: economy, production and army control under pressure.
- Proposal: an attention juggle: three timers (worker production, supply, army engagement); the learner can only attend one at a time and each neglected timer costs a little. A replay line shows where attention went.

**Battle Royale Game Design** (`/game-design/battle-royale/`), effort **S**
- Concept: in-match gear progression and clear weapon roles.
- Proposal: a range chart of damage per second for five weapon roles, with a distance slider that highlights the role that wins at that range.

**Casual Game Design** (`/game-design/casual/`), effort **S**
- Concept: a difficulty curve that challenges without alienating non-gamers.
- Proposal: a sawtooth level difficulty curve (rise, then a relief level), against a straight ramp; a simulated drop-off line for each.

**Puzzle Game Design** (`/game-design/puzzle/`), effort **M**
- Concept: one simple mechanic explored in many environments; levels designed from the solution backward.
- Proposal: a small push-block puzzle shown as authored: start from the solved state, add obstacles and false solutions one at a time. Links to `mechanics-tools/reverse-map/`.

**Arcade Game Design** (`/game-design/arcade/`), effort **S**
- Concept: accessible, fast loops with skill-based scoring.
- Proposal: a risk-for-score loop: a multiplier that grows the longer you stay near danger, and a high-score ghost run.

**Text-Based Game Design** (`/game-design/text-based/`), effort **S**
- Concept: parser input versus choice-based input, and clear language.
- Proposal: the same room played with a parser (typed verbs) and with a choice list; a readout of how many valid actions each input exposes.

**Stealth Game Design** (`/game-design/stealth/`), effort **M**
- Concept: robust detection rules the player can read, a world that keeps moving, and tools to manipulate AI.
- Proposal: a top-down level with guard view cones, a detection meter that fills by distance, light and noise, and a thrown distraction that redirects a patrol.

**FPS Game Design** (`/game-design/fps/`), effort **S-M**
- Concept: strategies (before a fight) and tactics (during it); enemies that create tactical choices; barks that tell the player the enemy's state.
- Proposal: an enemy state machine (patrol, alerted, flanking, reloading) where each state change prints its bark line; the player sees the reload bark and gets the window.

**RPG Game Design** (`/game-design/rpg/`), effort **S-M**
- Concept: player actions, progression and narrative as the three foundations.
- Proposal: an XP curve editor (linear, polynomial, exponential) showing time per level across a campaign, with the content needed to fill each level.

**Racing Game Design** (`/game-design/racing/`), effort **S**
- Concept: speed is communicated mostly through the camera.
- Proposal: the same car at the same speed with field of view, camera shake and speed lines toggled; the speedometer never changes.

**Survival Game Design** (`/game-design/survival/`), effort **M**
- Concept: harvesting, crafting and combat loops under constant pressure from needs.
- Proposal: a needs dashboard (hunger, warmth, health) that decays over a day-night cycle; harvest and craft actions buy time, and a pressure readout shows tension rising toward night.

**22 Types of Video Games** (`/gaming/genres/`), effort **S**
- Concept: a survey of genres and their core verbs.
- Proposal: a genre by verb matrix (move, aim, plan, build, choose, manage), cells filled from the post's descriptions; clicking a genre opens its own widget above.

**Gacha Game** (`/game-design/gacha-game/`), effort **S**, quick win
- Concept: lottery-style collection driven by characters players care about, uncertainty, and retention.
- Proposal: the pity widget from quick wins.

---

## Build notes

- Each page should follow the repo's existing pattern: a walk-through with `window.__seek` / `__dur` hooks so `tools/record-slide-gif.js` can render 1920×1080 GIFs, and a `notes.js` with speaker-note text.
- World of Warcraft icons from wow.zamimg.com, League of Legends portraits from Riot's Data Dragon, and Super Mario World sprites are fine here, per the project. Their sources should be listed in each page's `img/sources.json`, as in `pve-interactions/lessons/`.
- Post numbers quoted above (percentages, durations, counts) come from the posts. Where a page needs numbers the post does not give, they should be labelled illustrative on the page.
