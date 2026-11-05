# Module 1: Game Pillars and Values: interactive and GIF proposals

Source: "RGF C2 M1 - Game Pillars and Values" (Drive 1h6oIIXoNZPaeqFyv3BFJkOZFbpB5OYaTJ60dMifzQdQ, 69 slides). First pass 2026-11-04 from the Drive text export with speaker notes. Slide numbers are the export's "N of 69" numbers. Quotes marked "notes" come from the speaker notes. Slides 11-12 (the God of War pillars) are image-only in the export, so check those images before building anything that depends on them. Slide 13's notes link a Google Doc pillar template.

Built so far: nothing yet. The course home is `../index.html`.

The deck is a set of rules (four for pillars, three for values) plus common mistakes. Rules are easy to state and hard to apply, so the proposals mostly let a learner run a rule against real examples and see it pass or fail.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Feature triage board: drop features onto pillars, prioritise the ones that hold up two | 26-30 | M |
| 2 | Pillar linter: run the four rules against any pillar | 16-25 | M |
| 3 | Pull a pillar: load-bearing pillars hold features up | 24-25, 34-35 | S |
| 4 | Pillar or value? A sorting drill | 40-61 | M |
| 5 | Too many pillars: count them up and watch priority stop meaning anything | 16, 33 | S |

Quick wins worth doing early even though they are not top 5:
- **Restraint vs pillar** (slides 36-37). Two filters side by side over the same twelve move ideas. "The game must have combos" lets through only combo strings. "Controlled Power" lets through combos, charge attacks, parries and a held-back super, and rejects button-mash spam. One GIF.
- **A value grows up** (slides 49-56). The Master Chef example as a three-row stepper: a one-word value (Aesthetic, Expressive, Sophisticated), then its one-sentence statement, then its actionable rule, then the "self-explanatory" check. One GIF per row or one page with ← →.

---

## Part 1: Game Pillars (slides 3-39)

**Pillar linter** (slides 16-25), effort **M**, **TOP 5**
- Teaches: "Aim for 1 to 3 Pillars, never more than 5" (16), and the "4 Rules to create effective Pillars" (20): keep the pillar short (21), a pillar is not a feature (22: "Oxygen system" vs "Thrill of the Unknown"), avoid words that could describe any project (23: Deep, Exciting, Replayable, Retention, Engaging, Innovative, Easy to Learn Hard to Master, Fun, Pick up and Play), and pillars should be load bearing (24-25: "Dark Modern Fairytale").
- Hard as text: every rule sounds obvious until a learner writes their own pillar. Slide 18's run-on "Kids should be able to play the game because…" is funny on a slide but a learner never checks their own draft against it.
- Proposal: a text box and four rule lamps. **Short**: a word meter that goes amber past five words, the notes' own threshold on 21 ("if it's more than 5 words, you need to think about it again"), and red past fifteen. **Not a feature**: flags nouns from a small list (system, mode, crafting, inventory, multiplayer, skill tree). **Not generic**: flags slide 23's words. **Load bearing**: can't be automated, so it asks the slide's question, "Would this still describe your game if you removed it?" with a yes/no answer. Presets load every example from slides 18, 21-23 and 33 so a learner can watch each one pass or fail. The lamps say **passes** or **flags**, never "good" or "bad".

**Pull a pillar** (slides 24-25, 34-35), effort **S**, GIF, **TOP 5**
- Teaches: "Pillars should be Load Bearing" (24-25); notes: "If changing the Pillar changes the whole project, it's a powerful Pillar… If changing a pillar has a lot of ripple effects it means that it's used correctly." Also the mistakes "Changing pillars too late" and "changing pillars during development without understanding the effect" (34-35).
- Hard as text: "load bearing" is a physical metaphor. It makes sense once something falls down.
- Proposal: a Greek temple (game-icons.net `greek-temple`) whose roof is a row of feature tiles. Each tile rests on the pillars it supports. Click a pillar to pull it: tiles resting only on that pillar drop and crack, while tiles resting on two pillars tilt but stay. A "decorative pillar" preset, a generic word like "Fun!", holds up nothing, so pulling it changes nothing, which is how a learner sees it isn't load bearing. Second beat for slides 34-35: a timeline slider under the temple. Pulling a pillar early drops two placeholder tiles; pulling it at month 18 drops forty finished ones.

**Feature triage board** (slides 26-30), effort **M**, **TOP 5**
- Teaches: "Whenever you are adding any feature, ask yourself which pillar it supports" (27). "Any feature that supports more than 1 pillar should be prioritized" (28). Pillars should be referenced and visible everywhere (29-30).
- Hard as text: these are workflow rules, and a learner only sees why they matter when they triage a real backlog.
- Proposal: two or three pillar columns from a real game, *Subnautica* or another case the course already uses, and a backlog of about fifteen feature cards. Drag each card under every pillar it supports. The board sorts itself: cards under two or more pillars get a priority star and rise to the top, cards under none fall into a "cut or rethink" tray. A "use my pillars" mode takes the output of the pillar linter so a learner can triage their own game. The same board drives proposal 5.

**Too many pillars** (slides 16, 33), effort **S**, **TOP 5**
- Teaches: slide 33 lists nine pillars (Thrill of the Unknown, Earned Triumph, Silent Predator, Living World, Desperate Survival, Controlled Chaos, Fragile Humanity, Echoes of the Past, Relentless Momentum), against slide 16's "1 to 3, never more than 5".
- Hard as text: the cost of nine pillars isn't the length of the list. It's that the rule from slide 28 stops working.
- Proposal: a pillar-count slider from 1 to 9 over the triage board's backlog. As pillars are added, the share of features that support two or more climbs, and the "priority" stars spread until nearly every card has one. A small chart plots priority share against pillar count, with 1-3 shaded as the slide's range. Illustrative numbers live in one table at the top of the script.

**Pillars as features** (slide 32), effort **S**, fold into the linter
- Teaches: God of War (2018)'s pillars as listed, "Combat, Father and Son, Exploration", shown as the mistake of writing features instead of experiences. Notes on 12 and 32: the pillars "served well their purpose", but combat and exploration are features, and that "strongly risks creating isolated teams, who work in silos".
- Proposal: a linter preset. "Combat" and "Exploration" flag as features, "Father and Son" passes, and a "rewrite" button shows one possible experience phrase for each flagged one, so the fix is shown and not only the error. A second toggle draws the silo risk: one team box per feature pillar, with no arrows between them.

**Restraint vs pillar** (slides 36-37), effort **S**, GIF (quick win, see above). Notes: "Think of them as road markings, not traffic signs." That line can be the GIF's last caption.

## Part 2: Game Values (slides 40-64)

**Pillar or value?** (slides 40-61), effort **M**, **TOP 5**
- Teaches: "A Value is a guiding ideology for how the game is made. It defines the mindset behind every design decision" (42), next to the pillar's "what should the player feel?" (15). Notes on 44: "Pillars are from the HEART. Values are from the MIND and explain how to deliver on the pillars." Notes on 47: "Pillars are like an elevator pitch for the project, and Values are how this pitch gets carried out", and "constraints are fine here". Rules (58): 2-4 values per pillar, no overlap ("If a value sounds like a pillar, it's actually a pillar"), team independent ("Values should survive team member turnover"). Mistake 1 is "Confusing Values with Pillars" (59).
- Hard as text: the two definitions differ by one idea, the player's experience versus the team's mindset, and the deck's examples sit on separate slides.
- Proposal: a deck of statement cards drawn from the module (Subnautica's three values, the Master Chef pillars and values, the slide 18 and 33 pillars, God of War's pillars) plus a few new ones. Drag each card to **Pillar** or **Value**. A wrong drop explains which half of the definition it fails. A second round adds the 58 rules: a value that only the art team can act on breaks "team independent", and a value that repeats a pillar breaks "no overlap".

**Subnautica's values in play** (slides 44-47), effort **S**, GIF
- Teaches: Subnautica's three values: "Never tell the player what to do. If there's something we want them to do, breadcrumb it", "The world doesn't care about the player…", and "Respect the player and their time. Don't manipulate them through achievements, dopamine and extrinsic rewards."
- Proposal: each value appears with one before/after pair from a mock HUD. A quest arrow becomes a distress signal on the horizon. A creature that turns to chase the player becomes one that ignores them and keeps grazing. An achievement pop-up becomes nothing. Mock HUD art is original. Real screenshots could replace it if licensing is fine for the class.

**A value grows up** (slides 49-56), effort **S**, GIF or stepper (quick win, see above)
- Teaches: the four ways to create values: formalise them alongside pillars (49), simple statements (50), actionable (51) and self-explanatory (52, 56), all shown on the Master Chef example.
- Note: slides 53-55 repeat 50-52 with a different layout. Use one set.

**Values checklist** (slides 57-61), effort **S**, fold into "Pillar or value?"
- Teaches: rules (2-4 values, no overlap with pillars, team independent) and mistakes (confusing values with pillars, values too abstract, not reinforcing values enough).
- Proposal: the linter's lamp row, reused for values. A count lamp, an overlap lamp that compares against the learner's pillars from the linter, and an "abstract" lamp built from the same generic-word list.

## Closing (slides 62-69)

No interactive proposed. The hand-off to the next module (67-68) can be the triage board's footer: "Your pillars say what players should feel. Next: who those players are."

## Small fixes spotted while reading

- Slides 11-12 present God of War's pillars as a "great study case" and slide 32 lists them as the mistake "Pillars as features". The notes on 12 do set this up ("Combat and exploration could definitely be improved, we'll come back to this shortly"), but a learner reading only the slides could miss it. A "we'll come back to this" tag on slide 12 would help. "God of war" should also be "God of War".
- Slide 13 still has the placeholder title "[Blank game's] Pillars". Its notes link a Google Doc template, which may be the intended workshop handout.
- Slide 58 says "2-4 Values maximum", and the notes say "2–4 values maximum per pillar". These differ by a factor of the pillar count.
- Numbering: slide 17 is "3) Short phrases" with no 1) or 2) before it. Slides 35-36 are "3)" and "4)" but 32-34 are unnumbered.
- Slides 10 and 43: "Let's look at a some examples" ("a" is extra).
- Slides 24 and 25 spell it "Load Bearing" and "Loadbearing". Pick one, ideally "Load-Bearing".
- Slide 50: "the player is already a master of his discipline" could be "their discipline".
- Slides 53-55 duplicate 50-52, and slides 60-61 duplicate 58-59 without the numbers. Probably build variants; hide one set.
- Slide 68: "Next Time: Player Types and Psychology", but the next deck is titled "Audience Demographics".
- Slide 69 is a leftover "STOP" slide.
