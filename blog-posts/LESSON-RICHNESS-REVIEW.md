# Blog-post interactives: how much design lesson each one teaches

Reviewed 2026-11-09: all 57 pages in `blog-posts/`, read from their code and walk-throughs (headers, controls, captions), with screenshots for the four rebuilt here. The 32 genre breakdowns built today got the closest look, since they were made fastest and share one template.

## The yardstick

A page teaches a lot of design when the learner does the designer's job and pays for it. Five checks, in order of weight:

1. **Decide.** The learner makes a design choice. Scrubbing a timeline or flipping the slide's own feature on and off doesn't count.
2. **Cost.** The choice has a price. If one setting comes out ahead on every readout, the learner learns a fact, not a judgement.
3. **Surprise.** The result is not what the title already said.
4. **Transfer.** The page names a rule the learner can take to another game.
5. **Grounding.** It is tied to the post's real story or numbers.

Most of the thin pages fail on the same check, **Cost**. They show A against B, and B wins on every number (storm on against storm off, counter-strafe against running, a wide lens against a plain one, instance against open world). Each page shows its point clearly, but a student who turns everything on learns nothing new. In every rebuild below, the post's own fix becomes something with a price, and the learner has to choose what to pay.

## Tiers

**Rich: the learner decides, pays, and comes away with a rule.** Too Weak to Waste, Why Not Just Chess?, Feeney's items, the six Learning From My Past pages (Clarity, Care, Response, Satisfaction, Ennui, Fit, plus Five Gates), The Ogre Turn, Shade of Aran (play mode), Cross-Game Controllers, Billion Dollar Hardware Mistake, Compositional Cats, Atomech's First Year, Keep Only Five, Netherspite, MOBA (last hits), Author the Puzzle Backward (the solver judges the learner's puzzle), A Mission Is a List of Conditions, One Pair of Eyes (RTS, playable), Triggers on the Stack, Puzzle Dependency Chart.

**Solid: one real decision, or a cost the learner can see but not change.** Best Button, Warlock talent trees, Attumen, Pac-Man targeting, Nightbane's Flight, One River Many Answers, Simple Rules Emergent Results, Two Days Three Needs, Readable Detection, Tension Curve, Risk for Score, Sawtooth or Ramp, Gacha Pity, Assist Levels (this one does have a trade-off: accessibility against the gap skill earns), Jump Lab, The Next Upgrade, Climb to See, Parser or Choice List, Branch and Bottleneck (scenes against endings), Barks, All the Games I've Played.

**Thin: the learner watches a curve or a one-sided comparison.** Ranked below, thinnest first.

## Thin pages, ranked, with a stronger version

| # | Page | Why it's thin | Stronger version | Status |
|---|------|---------------|------------------|--------|
| 1 | **An MMORPG Is a Service** | A timeline the learner scrubs. "Launch is the start" is a slogan, not a decision. | **Feed the treadmill**: split a 120-person live team between new content, systems that make old content replayable, and stability, then watch three years. | **Built** (slide 2) |
| 2 | **Shared World or Instance** | Instanced beats open world on every readout; more players only makes the open world look worse. | **Write the tag rule**: first tag or shared credit, respawn, layer cap, health that grows with the number of attackers. Six readouts, and no setting keeps them all in range. | **Built** (slide 2) |
| 3 | **Weapon Roles** | Each weapon wins its own range band by construction; the slider only moves a cursor. | **The map picks the meta**: the same guns on three maps, plus a damage slider per gun. | **Built** (slide 2) |
| 4 | **Speed Is a Camera Job** | Every effect only adds speed; nothing pushes back. | **Speed costs readability**: the same effects, but 20 drivers have to read a braking board. | **Built** (slide 2) |
| 5 | The First Turn-Based RPGs | A history timeline and a drawing of two views. No mechanic to act on. | *Two views, one dungeon*: map the same maze in first person and top-down and count the wrong turns. Disorientation was the challenge, and the map is a tool for spending it. | **Built** (slide 2) |
| 6 | XP Curves + What an RPG Needs | Curve shapes against an hours axis; the grind slider only shifts a line. | *Pace the curve to your zones* (on XP Curves, covering both pages): fixed content hours per zone; shape the curve so nobody has to grind through a gap or outlevels a zone they skipped. The XP curve is a content schedule. | **Built** (slide 2) |
| 7 | The Storm | Storm on beats storm off. | *Tune the circle*: phase timings against time to first fight, looting time, deaths to the storm and how crowded the final circle gets. | **Built** (slide 2) |
| 8 | Counter-Strafe | Counter-strafing beats running every time. | *Write the accuracy rule*: the speed at which spread hits its minimum, and the spread while running. Watch who wins peeks, holding an angle or run-and-gun. | **Built** (slide 2) |
| 9 | Ring of Blood | A bar staircase the learner reads. | *Tune the ladder*: set each fight's step and watch a population of mixed skill climb it, and see where they quit. | **Built** (slide 2) |
| 10 | D&D Advantage | The maths is right and clear, but there is no decision. | *The GM's table*: three players add ideas to one roll and the GM rewards each with nothing, Advantage or +2. Advantage doesn't stack and +2s do. | **Built** (slide 2) |
| 11 | Arm Locomotion | A physics toy, kinesthetic but closed. | *Tune the launch*: launch multiplier, speed cap and smoothing, set against new players, experts and comfort. | **Built** (slide 2) |
| — | Genre by Verb | A taxonomy table. | Leave it as it is: it works as a navigation page. | Keep |

## The four rebuilt pages, ranked by how much more they teach

Each one is a new slide 2 on its existing page, so the original stays on slide 1 to compare against. Each has a walk-through, live controls and speaker notes, and all the numbers are labelled illustrative.

1. **Write the tag rule** (`mmo/`, slide 2). This one gains the most. Slide 1 teaches "instances scale". The new slide teaches that every sharing rule decides whether the next player is a rival or a help, and that each rule moves the cost somewhere else. First tag keeps the item rare and costs waiting and resentment. Layers cut the wait, but they empty the world and triple the drops. Shared credit turns strangers into allies, but the monster dies in 4 seconds and the item floods the market. Scaling its health fixes the fight, not the market. Six readouts, and no setting keeps them all in range.
2. **The map picks the meta** (`br-ranges/`, slide 2). Two surprises a student won't predict. First, a 30% SMG buff on open fields only moves its share from 5% to 8%, because no damage number fixes a map that never offers the gun's range. Second, double the buff and the SMG takes 71% of fights by out-killing rifles at 100 m, so it shows up only by losing its role. On the mixed island, a buff takes fights only from the gun's neighbours. Balance is weapon × map.
3. **Feed the treadmill** (`wow-service/`, slide 2). Turns the slogan into a staffing decision. Players eat 45 hours of content a month and even 108 people make about 32, so droughts are certain. Three quarters on content ends at 0.51 of the launch population by month 36; 40% content and 40% systems ends at 0.82. Starve stability and outages arrive, because the work it needs grows with success. Lean too hard on systems and the game goes stale.
4. **Speed costs readability** (`racing-camera/`, slide 2). The smallest change and the cleanest lesson. The full kit of slide 1's effects takes felt speed from 1.0× to 2.6×, but brake points spread from ±3 m to ±24 m and 14 of 20 drivers brake too early or too late. Calming the camera on the approach keeps 2.6× on the straight and brings that down to 4.

## The seven follow-up spikes, ranked

These were built after the first four, again as slide 2 on each page, with a walk-through, live controls and speaker notes. All numbers are illustrative.

1. **Write the accuracy rule** (`valorant-strafe/`). Counter-strafing becomes a rule the learner writes. With a rule like slide 1's, stopping wins peeks and timing it well is worth 18 points over a novice. Make running accurate and run-and-gun matches a perfect stop, so movement skill disappears. A strict threshold makes new players lose peeks they played right; a loose one shrinks the gap.
2. **Pace the curve to your zones** (`rpg-xp/`). Every curve has the same total XP; only the shape differs. Linear makes the player grind before each of the next four zones. Exponential overlevels four of the six. A curve built from the content fits it. Cut one zone to ship on time and the player grinds again.
3. **Tune the ladder** (`ring-of-blood/`). 400 groups climb the Ring. The post's Skra'gath swap makes his rung trivial for most groups, and the dungeon-boss Champion is where most of them quit. Steps smaller than the groups' growth bore; bigger ones funnel.
4. **The GM's table** (`dnd-advantage/`). Three ideas, one roll. Three Advantages means two ideas change nothing; three +2s each count, with no cap. On a long shot Advantage is worth about half what it is on a coin flip.
5. **Tune the circle** (`fortnite-storm/`). A fast storm kills about one player in six and sends a crowd to a lottery final circle. A slow one leaves 8-minute lulls and decides the match early.
6. **Tune the launch** (`gorilla-tag/`). A 50% boost takes novices clearing the first gap from 10% to 63%, and puts half the expert launches past the comfort line. A cap pins three quarters of experts against it. Smoothing sounds like help for shaky hands, but it trims lucky launches as well as unlucky ones and adds lag.
7. **Two views, one dungeon** (`first-rpg/`). The same 12 × 12 maze for 30 explorers. Without a map, 10 give up and the rest average about 256 steps. With an automap it's about 191 steps and nobody gives up; with the whole map it's the shortest path, 50 steps. It's the weakest of the seven because the learner picks a view rather than tuning a rule, but it gives the history page a design point.

One shared change: `shared/genre.js` now keeps a page's own `__seek` / `__dur` when it loads after them. Ring of Blood and D&D Advantage needed this to add a genre-style slide 2 without breaking slide 1's GIF hooks.

## Patterns to reuse on the next batch

- **Give the post's fix a price.** If the page shows "feature on" winning, add the readout where it loses.
- **Use several readouts with ranges, not one score.** Then the learner has to pick which cost to carry, which is the design judgement.
- **Two failure modes per knob.** A weapon that never gets its fight and a weapon that wins everyone's; droughts and staleness. A single slider then has an interior answer, not an "always more".
- **Keep the original as slide 1.** It explains the mechanic first; slide 2 lets the learner make a design call on it.
