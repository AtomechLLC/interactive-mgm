/* The MGM practice program: one entry per course day, each with its live workshop and its self-study part.
   Sources: "MGM: C4 - Live Workshop Exercises" (cohort 4), "MGM: C4 - Self-Study Exercises" and
   "MGM - Self Study Project Templates" (the Echidna Z worked examples). Rendered by practice/*.html.
   Links are relative to practice/. Strings may hold simple inline HTML. */
(function () {
  const GDOC = id => `https://docs.google.com/document/d/${id}/edit?usp=sharing`;
  const TAB = tab => `https://docs.google.com/document/d/1H_5FDquXjb5LzbWBhDk_RMRuoNoTWmKz8FKnSf0tL-w/edit?tab=${tab}`;
  const L = (label, href, note, icon) => ({ label, href, note, icon }); /* icon: a file in assets/img/home when the page has none of its own */

  /* exercise kinds, as tagged on the workshop deck's day cards */
  const KINDS = {
    analytical: 'Analytical Exercise', group: 'Group Activity', individual: 'Individual Activity',
    discussion: 'Discussion Exercise', conceptual: 'Conceptual Exercise', playtest: 'Playtest Exercise', production: 'Production Exercise'
  };

  const DAYS = [
    {
      day: 0, theme: 'Meet your cohort', module: 'Orientation',
      workshop: {
        title: "Meet n' Greet", kinds: ['individual', 'discussion'],
        goal: 'Get to know your cohort and the games they play, so you can form teams around shared tastes.',
        steps: [
          'Post a few of your favorite games next to their genres.',
          'Add a new genre if none describes them.',
          'Put your name on a sticky note on the games you enjoy most.',
          'Group together the names that share favorite games.'
        ],
        meta: { type: 'Group', time: '20 minutes', zoom: 'System' }
      },
      study: { none: true, title: 'No exercise', note: 'Nothing to hand in. Use the cohort board from the workshop to find people who share your interests: you form a team in Part 1.' },
      links: [L('Student Tokens', '../student-tokens/index.html', 'battle-map tokens, arrows and status badges for your Miro boards')]
    },
    {
      day: 1, theme: 'Goals, values, actions', module: 'Orientation',
      workshop: {
        title: 'Disagreeing Productively', kinds: ['group', 'discussion'],
        goal: 'Working in a team means you will disagree. Learn to identify the core issues and work together to resolve game problems and conflict.',
        example: 'Alex and Celia disagree about save states. They can disagree respectfully, and talk about why disrespect gets nowhere. Criticism can be constructive: offer observations rather than character judgments, be direct, show empathy and sincerity, explain your thoughts clearly and briefly, and leave room to listen.',
        framework: {
          name: 'Goals / Values / Actions',
          items: [
            ['Goals', 'What are you trying to achieve?'],
            ['Values', 'What matters to each person in how the problem is solved?'],
            ['Actions', 'What will actually happen in the game?']
          ],
          note: 'Order matters: discuss goals first, which unlocks values, which unlocks actions.',
          sample: 'Goal: cross the river. Values: fast, cheap, reusable. Fast and cheap? Swim. Reusable? Build a bridge. Cheap and reusable? Build a raft.'
        },
        hints: ['The first time, it is easier to start from solutions (actions), extract their values (priorities), then decide what the goals were.', 'Professionally, do the opposite: start from goals.'],
        steps: [
          'Pick a topic from the cards.',
          'Each person states their position. If you all agree, someone plays Devil’s Advocate.',
          'Use the Goals / Values / Actions framework in Miro to capture each person’s opinion and position, then talk through the tradeoffs.',
          'Choose who presents to the group.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'System' }
      },
      study: {
        title: "Let's Make a Game!", part: 'Part 1',
        goal: 'Practice being creative while collaborating in a group.',
        steps: [
          'Form a group of up to 4 students (use the Day 0 board to find shared interests).',
          'Throw out ideas for game concepts you would like to make.',
          'Settle on 3 core game concepts as candidates. Favor what the team finds interesting over what is feasible to build.',
          'Use Goals / Values / Actions to capture each person’s opinion and position. Talk about the tradeoffs.'
        ],
        tab: TAB('t.0'),
        example: {
          title: 'Echidna Z, the team conversation',
          html: `<p><b>Keba:</b> Let’s make a game about echidnas, it will be cool. <b>Alex:</b> Let’s make a game about heavily animated combat, it will be cool.</p>
<p>Sure, “Echidna-souls” is possible, but ideas without goals, values and actions wander. Without a framework you get stuck in arbitrary arguments (“What if we did an idle game instead?”).</p>
<table><tr><th>Goals</th><td>Cross the river. Stay alive. <i>Alex: I’m bleeding. Keba: The wolves will kill us if we stay.</i></td></tr>
<tr><th>Values</th><td>Score them. Alex: Reusable 0, Stealthy 7, Fast 10. Keba: Reusable 3, Stealthy 3, Fast 10. Values conflict, so prioritize: the values talk is often worth more than the goal or the action.</td></tr>
<tr><th>Actions</th><td>Search for a boat; break branches to fight off wolves; start a raft; if all else fails, swim.</td></tr></table>`
        }
      },
      links: [
        L('Pillar or Value?', '../dgms/m1-pillars/pillar-or-value/index.html', 'sort statements into pillars and values'),
        L('Feature Triage Board', '../dgms/m1-pillars/triage-board/index.html', 'rank features against what the team values'),
        L('Pull a Pillar', '../dgms/m1-pillars/pull-a-pillar/index.html', 'see what a game loses without one of its goals')
      ]
    },
    {
      day: 2, theme: 'Break a mechanic down', module: 'M2 Understand Mechanics', moduleHref: '../understand-mechanics/index.html',
      workshop: {
        title: 'Diagram a Mechanic', kinds: ['analytical', 'group'],
        goal: 'Get comfortable breaking systems into small, understandable parts and spotting repeatable patterns in gameplay interactions.',
        example: 'Dark Souls melee swing. [Input] the controller button → [Action] the character swings → [Mechanic] apply hit → damage → poise → [Receivers] → [Transformations] → [Systems] → [Response] → [Action] the hit reaction.',
        steps: [
          'Pick at least one mechanic from a game.',
          'Break it apart, from the moment the player presses a button to the final result in game.',
          'Split it into stages using the example framework.',
          'Note what is decided at each stage, and what changes.',
          'Prepare to present to your team and instructors.'
        ],
        meta: { type: 'Solo', time: '30 minutes', zoom: 'Action, Feature' }
      },
      study: {
        title: 'Understand the Core of Your Game', part: 'Part 2',
        steps: [
          'Choose one of your three game concepts to refine.',
          'List its mechanics: verbs (player actions) and systems.',
          'Detail how each verb is bound to an input.',
          'Diagram these mechanics with the mechanics diagram framework from class (zoomed-out character interactions, zoomed-out system map, zoomed-in two-entity interaction).',
          'Post to your thread and tag the instructors for review.'
        ],
        tab: TAB('t.i56ies22pm26'),
        example: {
          title: 'Echidna Z, core verbs',
          html: `<p>A playful soulslike: a down-on-his-luck short-beaked echidna on a journey to become emperor of the Australian animal kingdom.</p>
<table><tr><th>Verb</th><th>Button</th><th>What happens</th></tr>
<tr><td>Slash</td><td>X</td><td>Play an animation, then a crescent hitbox in front of the echidna (like Hollow Knight). Deals damage and makes the enemy react.</td></tr>
<tr><td>Burrow</td><td>Y</td><td>Dive underground and surface behind the current target, or a short way forward with no target.</td></tr>
<tr><td>Jump</td><td>A</td><td>A short leap over things.</td></tr>
<tr><td>Deflect</td><td>LB</td><td>Deflect incoming attacks with the spikes.</td></tr></table>`
        }
      },
      links: [
        L('Mechanics X-ray', '../understand-mechanics/xray/index.html', 'input to response, stage by stage'),
        L('Core Gameplay Actions', '../pvp/core-actions/index.html', 'the anatomy of a melee swing, frame by frame'),
        L('The Guarded Door', '../understand-mechanics/guarded-door/index.html', 'one interaction diagrammed several ways'),
        L('Time as a Resource', '../understand-mechanics/cast-timeline/index.html', 'what is decided at each moment of a cast')
      ]
    },
    {
      day: 3, theme: 'Revise the design test', module: 'M1 The Goal: Depth', moduleHref: '../depth/index.html',
      workshop: {
        title: 'Design Test', kinds: ['analytical', 'group'],
        goal: 'Collaborate with teammates to improve your answers from before the course.',
        why: 'Revise your design test answers as a group, then try a new question together.',
        example: 'Add or remove a feature in one game. Take gliding out of Breath of the Wild. Navigation: updrafts lose their purpose, players can’t descend safely from climbs. Combat: no launch-to-plunge, no fleeing by air. What would the game need after removing it?',
        steps: [
          'Review your design test with your team.',
          'Discuss which answers hold up best, taking in multiple perspectives.',
          'Write a new design test response together in Google Docs.',
          'A few groups present for instructor feedback. If you miss live feedback, come to office hours or open a forum thread and tag the instructors.'
        ],
        meta: { type: 'Group', time: '30 minutes', zoom: 'Action, Feature' }
      },
      study: {
        title: 'Create a Pitch Deck', part: 'Part 3',
        steps: [
          'Settle on the game concept you will work on for the rest of the course.',
          'Get the concept across in an elevator pitch.',
          'Explain it in more detail: theme or narrative, unique selling point (USP), target audience, market opportunity and/or competition, and anything else that matters.',
          'Introduce your team members’ roles and specialties.',
          'Post to your thread and tag the instructors for review.'
        ],
        template: GDOC('1qx-Hh3GJEcIYHmyAxWPpMjuEprkIuPozv36tuGoO_Qg'), tab: TAB('t.6v9w6rkpvwmq'),
        example: {
          title: 'Echidna Z, pitch framing',
          html: `<p><b>Elevator pitch:</b> a soulslike where a down-on-his-luck echidna claws, burrows and deflects his way to the throne, with deliberate combat, satisfying combos and a partner character who turns duets into execution chains.</p>
<p><b>USPs:</b> burrow as the identity verb; co-op chains designed in from day one; playful tone with gritty mechanics; a conservation story woven into the world.</p>
<p><b>Audience:</b> Hollow Knight and Hades fans first, co-op action players (It Takes Two, Cuphead) second, animal-curious players third.</p>`
        }
      },
      links: [
        L('Pull a Pillar', '../dgms/m1-pillars/pull-a-pillar/index.html', 'remove one feature and trace what breaks'),
        L('Mechanic or Aesthetic?', '../understand-mechanics/grass/index.html', 'is the thing you removed a mechanic at all?'),
        L('Three Tiers, Counted', '../depth/three-tiers/index.html', 'possibility space, differentiated and relevant depth')
      ]
    },
    {
      day: 4, theme: 'Critique and feedback', module: 'M1 The Goal: Depth', moduleHref: '../depth/index.html',
      workshop: {
        title: 'Critiquing Design Tests', kinds: ['group', 'discussion'],
        goal: 'Practice giving critical feedback effectively, taking feedback to improve your answers, and noticing your own emotions as you hear criticism.',
        why: 'You critique another team, then practice processing that feedback with your own. Taking feedback, critiquing others and iterating is an essential skill.',
        steps: [
          'Find another group, ideally one that had the same or a similar question in Day 3.',
          'Roleplay destructive criticism first. Pay attention to your emotions.',
          'Critique the other team’s answer constructively, using the four relevant depth optimizations where they apply.',
          'Use the critiques you received to write a new answer.'
        ],
        meta: { type: 'Two groups', time: '60 minutes', zoom: 'Feature' }
      },
      study: {
        title: 'Present Your Pitch Deck', part: 'Part 4',
        steps: [
          'Prepare a presentation of your pitch deck as a team. Rehearse until you can present confidently.',
          'Record it with Loom or OBS and upload it to the class drive.',
          'Post the video in the #mgm-activities Discord forum.',
          'Get feedback from the class in your thread, and give feedback to others.',
          'Revise your pitch based on what you heard.'
        ],
        template: GDOC('1jAzmZ3GYCvy-jO1DNjT5-Vmy0YqmwwZ1CaqlJWuOHI0'), tab: TAB('t.tvrhnfp5zh4h'),
        example: {
          title: 'Questions for giving feedback on a concept deck',
          html: `<table>
<tr><th>Clarity</th><td>How easy is the deck to read? How simple is the core pitch? Are the illustrations valid, comprehensible and relevant?</td></tr>
<tr><th>Rehearsed</th><td>Did they practice? Do they speak convincingly? Do they believe in their pitch?</td></tr>
<tr><th>Team &amp; talent</th><td>Do they explain the team and its talents briefly? Are the talents well applied? What is the team missing?</td></tr>
<tr><th>Competition</th><td>What competitors do you know of? What gaps are in their thinking? How is the idea most likely to fail?</td></tr>
<tr><th>Core idea</th><td>Score novelty, popular appeal, technical difficulty, narrative / gameplay alignment.</td></tr>
<tr><th>Critical thinking</th><td>What problems may they hit? Have they considered several paths? Do they understand their goals? Which values are they prioritizing?</td></tr></table>`
        }
      },
      links: [
        L('Three Tiers, Counted', '../depth/three-tiers/index.html', 'the depth vocabulary for critique'),
        L('Thirty-Two Slimes', '../scriptures/thirty-two-slimes/index.html', 'possibility space versus relevant depth', 'depth.svg'),
        L('Additive vs Multiplicative', '../depth/additive/index.html', 'why some additions multiply depth')
      ]
    },
    {
      day: 5, theme: 'Logic tools', module: 'M3 Mechanics Design Tools', moduleHref: '../mechanics-tools/index.html',
      workshop: {
        title: 'Inverse & Reverse', kinds: ['group', 'conceptual'],
        goal: 'Build skills that kickstart creativity, break you out of ruts and inspire new perspectives.',
        why: 'Logic tools help you identify systems, in games and beyond. Spotting them helps design, improves communication and eases confusion.',
        example: 'A Warrior goes to Orgrimmar: walk the chain of events step by step; many paths lead to one outcome, and avoiding a destination means thinking of every route to it. Magic: The Gathering: Damage → Loss of life (A→B). Damage → Gaining life (A→~B). Loss of life → Damage (B→A). Gaining life → no damage (~B→~A). Gaining life → Damage (~B→A).',
        framework: {
          name: 'Logic',
          items: [['Q → R', 'Implication'], ['~Q → R', 'Inverse'], ['R → Q', 'Reverse (converse)'], ['~R → ~Q', 'Contrapositive']]
        },
        steps: [
          'Come up with an A → B implication.',
          'Describe the inverse, A → ~B.',
          'Describe the reversal (converse), B → A.',
          'Look for new possibilities from flipping these around.',
          'Bonus: describe the contrapositive, ~B → ~A, and try ~B → A.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Feature' }
      },
      study: {
        title: 'Deepen Your Game Concept', part: 'Part 5',
        steps: [
          'With your team, write a draft game design document for one feature of your game.',
          'Use A → B, inverse, reverse and contrapositive to iterate on it.',
          'Look for new ideas or a new take on the core gameplay.',
          'Get feedback in your Discord thread.'
        ],
        tab: TAB('t.m34w03cq8f79'),
        example: {
          title: 'Echidna Z, one rule flipped four ways',
          html: `<table><tr><th>Transform</th><th>New ability</th><th>Rule</th></tr>
<tr><td>Base (F → H)</td><td>Echidna Slash</td><td>An enemy in front of you in a small radius gets hit.</td></tr>
<tr><td>Converse (H → F)</td><td>Gravity Well</td><td>An enemy you hit is dragged in front of you.</td></tr>
<tr><td>Contrapositive (~H → ~F)</td><td>Safe Zone</td><td>An enemy that isn’t hit can’t be in front of you.</td></tr>
<tr><td>Negated consequent (F → ~H)</td><td>Protecting Gaze</td><td>An enemy in front of you isn’t hit (a shielding frame).</td></tr></table>
<p>It is fine if they don’t match the logic perfectly: the point is to break your mind out of habits.</p>`
        }
      },
      links: [
        L('Switch, Plate, Pulley', '../mechanics-tools/doors/index.html', 'A → B chains on doors'),
        L('Inversion', '../mechanics-tools/inversion/index.html', 'danger zone or safe rune'),
        L('Reverse Sequencing', '../mechanics-tools/reverse-map/index.html', 'work backward from the outcome'),
        L('Contrapositive Arena', '../mechanics-tools/contrapositive/index.html', 'flip the order and the truth'),
        L('Contrapositive Rules', '../mechanics-tools/contrapositive-rules/index.html', 'rules rewritten four ways')
      ]
    },
    {
      day: 6, theme: 'Interlocking, disruption, loops', module: 'M3 Mechanics Design Tools', moduleHref: '../mechanics-tools/index.html',
      workshop: {
        title: 'Interlocking, Disruption, and Feedback Loops', kinds: ['analytical', 'group'],
        goal: 'Learn to identify common design tool patterns in games and see how they shape the player’s experience.',
        why: 'Practice design creativity by using fundamental concepts to inspire new ideas.',
        example: 'Interlocking: Expedition 33, where Gustave, Maelle and Lune use status effects that feed each other. Disruption: Dark Souls’ Silver Knight archers force you to dodge mid-fight; Kirby Air Ride’s City Trial events force you to adapt; roguelikes are all disruption.',
        framework: {
          name: 'Patterns',
          items: [['Interlocking', 'A = 1, B = 1, (A + B) = 3'], ['Disruption', 'AAAAB AAABA → AACAB AAABC'], ['Feedback loops', 'accelerating or self-regulating']]
        },
        parts: [
          { title: 'Part 1 (15 minutes)', steps: [
            'Identify interlocking, disruption, accelerating loops and decelerating loops in: checkers, chess, any RTS, Mario Kart power-ups, Tears of the Kingdom Zonai devices.',
            'And in these Magic: The Gathering pairs (look them up on <a href="https://scryfall.com/">Scryfall</a>): Soul Warden and Ajani’s Pridemate; Forced Fruition and Eidolon of the Great Revel; Rampant Growth and Stitcher’s Supplier.'
          ] },
          { title: 'Part 2 (30 minutes)', steps: [
            'Pick 2 games you have played and find an example of interlocking, disruption and feedback loops (ideally one accelerating and one self-regulating).',
            'Where would you apply these concepts to your games? Where do your favorite games apply them?'
          ] }
        ],
        meta: { type: 'Group', time: '45 minutes', zoom: 'Feature' }
      },
      study: {
        title: 'Iterate on Your Gameplay Dynamics', part: 'Part 6',
        steps: [
          'Use interlocking (pieces that work together), disruption (throw the player off their pattern) and feedback loops (regulation or acceleration) to iterate on your concept.',
          'Look for new ideas or a new take on the core gameplay.',
          'Get feedback in your Discord thread.'
        ],
        template: GDOC('1JXLvWmGr2Bm_NVgNGL4ce-VLZJl81xfUyTgM9sC9X_M'), tab: TAB('t.tryn13306xq2'),
        example: {
          title: 'Echidna Z, combos from interlocking verbs',
          html: `<table><tr><th>Sharp Dive</th><td>Jump, then Slash: dive to the ground for heavy damage on a target below.</td></tr>
<tr><th>Spin Sequence</th><td>Slash three times in a row for a heavier finishing slash.</td></tr>
<tr><th>Earthen Ambush</th><td>After two attacks, Burrow instead of Slash: dive behind the target and backstab (a combo that disrupts the pattern).</td></tr>
<tr><th>Accelerating loop</th><td>Landing deflects builds a Quill Charge meter that powers finishers.</td></tr>
<tr><th>Self-regulating loop</th><td>Leaning on Burrow drains stamina faster, pushing you back into grounded combat.</td></tr></table>`
        }
      },
      links: [
        L('Feedback Loop Sandbox', '../mechanics-tools/feedback-loops/index.html', 'accelerating and self-regulating loops'),
        L('Diminishing Returns', '../mechanics-tools/diminishing/index.html', 'a brake on a runaway loop'),
        L('MTG Keyword Combat', '../depth/mtg-keywords/index.html', 'keywords that interlock in combat'),
        L('Lifesteal vs Life per Hit', '../mechanics-tools/life-per-hit/index.html', 'one rule, two loop shapes')
      ]
    },
    {
      day: 7, theme: 'Skill, RNG, hidden information', module: 'M4 PvP Interactions', moduleHref: '../pvp/index.html',
      workshop: {
        title: 'RNG, Hidden Information, and Efficiency Races', kinds: ['analytical', 'group'],
        goal: 'Identify which factors decide the outcome of a competitive game.',
        why: 'Break games down as a whole and identify what is in and out of the player’s control, and how that changes the game.',
        example: 'Baselines: held cards are hidden information, dice are RNG, racing is a skill / efficiency test. Then a rough % breakdown of [efficiency, hidden info, RNG] for StarCraft and Clash Royale.',
        steps: [
          'Choose 3 games: Rocket League, Dota 2, Valorant, Counter-Strike, Street Fighter, Fortnite, Clash Royale, Magic: The Gathering, Pokémon cards.',
          'Give each a % breakdown, drawn as rings (make your own).',
          'Identify and justify your reasons.',
          'Present to your team.'
        ],
        meta: { type: 'Solo', time: '30 minutes', zoom: 'Game Project' }
      },
      study: {
        title: 'Identify Your Focus', part: 'Part 7',
        steps: [
          'Identify how skill tests, rock-paper-scissors / hidden information and random number generation affect your game’s outcome. For a single-player game, replace RPS with decision-making.',
          'Give it a % breakdown like the rings from class, and justify it.',
          'Then break your mechanics down with the Dynamic PvP Decision Design framework. For each: <b>stake</b> (what does it cost, what can you lose?), <b>reward</b> (what can you gain?), <b>difficulty / chance of success</b>, and <b>counterplay</b> (wide or narrow, soft or hard). For a non-PvP game, replace counterplay with situationality.',
          'Get feedback in your Discord thread.'
        ],
        template: GDOC('1qOL7p-KSiJKdJ9DnqwDDai10K9EPU1ycd107_P6ih-Y'), tab: TAB('t.v8sp6hjaaeku'),
        example: {
          title: 'Echidna Z, outcome profile',
          html: `<div class="rings" data-r="65,25,10"></div>
<table><tr><th>Skill test 65%</th><td>Timing deflects, spacing slashes, reading telegraphs, managing stamina: the soulslike DNA.</td></tr>
<tr><th>Rock-paper-scissors 25%</th><td>Burrow beats stationary threats; deflect beats telegraphed strikes; aerial play beats grounded area attacks.</td></tr>
<tr><th>RNG 10%</th><td>Light damage variance, crit chance on backstabs from burrow, spawn variation. No loot-table RNG in combat.</td></tr></table>`
        }
      },
      links: [
        L('Three Forms of Counterplay', '../pvp/counterplay/index.html', 'wide or narrow, soft or hard'),
        L('Five-Skill Fingerprints', '../dgms/m3-skills/skill-fingerprints/index.html', 'what kind of skill a game tests'),
        L('D&D Advantage', '../blog-posts/dnd-advantage/index.html', 'how a dice rule reshapes the odds'),
        L('Positioning Payoffs', '../pvp/payoffs/index.html', 'stake and reward in one duel')
      ]
    },
    {
      day: 8, theme: 'Metas and counterplay', module: 'M4 PvP Interactions', moduleHref: '../pvp/index.html',
      workshop: {
        title: 'Metas & Counterplay', kinds: ['analytical', 'group'],
        goal: 'Break down your experience with PvP games, identify the metagames you saw, and understand how developers addressed them.',
        example: 'StarCraft’s “Hand of God” meta leaned on flying Carriers; Brood War, six months later, added anti-air units to disrupt it. League of Legends’ bruiser meta (high health, high damage, slow) led Riot to add Vayne, ranged and agile with max-health true damage. Instead she was perma-banned in competitive play, and Riot had to fix bruisers at the root through items, balance and system changes.',
        framework: {
          name: 'Five steps',
          items: [['1', 'Name the meta.'], ['2', 'Identify the properties that made it dominant.'], ['3', 'Why couldn’t players fix it themselves?'], ['4', 'What did the developers do?'], ['5', 'What else might have worked that you would try?']],
          note: 'Bonus: use Goals / Values / Actions to weigh the tradeoffs.'
        },
        steps: [
          'Pick 1 to 3 multiplayer games.',
          'Identify a specific meta in each game’s history (search “game + year” for hints).',
          'Identify why it became dominant, and judge whether it was fair.',
          'Identify what the developers did to disrupt it and how that worked out.',
          'Describe what you would try now. Hint: did counters not exist, or did they not work?'
        ],
        meta: { type: 'Group', time: '30 minutes', zoom: 'Game' }
      },
      study: {
        title: 'Design Meaningful Choices', part: 'Part 8',
        choose: true,
        variants: [
          { title: 'PvP', steps: [
            'Make a counterplay graph for your game, showing which options are strong against which.',
            'Come up with exciting gameplay events that show some of these interactions.',
            'Describe how the game nudges players toward some options over others in some circumstances.',
            'Get feedback in your Discord thread.'
          ] },
          { title: 'PvE', steps: [
            'Outline how each mechanic creates meaningful choices (decisions you make differently each time you meet them).',
            'Is each one relevant (to players), significant (affects gameplay) and expressive (represents the player)?',
            'What range of outcomes can the choice produce?',
            'How do other mechanics and systems change it, creating situational considerations?'
          ] }
        ],
        template: GDOC('1Qqm9Z8CJtiz7rjS5GqhpU6CUjhkhCkXtW-oVJ7eppmU'), tab: TAB('t.2s54hslnlebw'),
        example: {
          title: 'Echidna Z, a counter chart',
          html: `<table class="num"><tr><th>Attacker \\ Defender</th><th>Fire</th><th>Water</th><th>Grass</th></tr>
<tr><th>Fire</th><td>1</td><td>0</td><td>2</td></tr><tr><th>Water</th><td>2</td><td>1</td><td>−1</td></tr><tr><th>Grass</th><td>0</td><td>2</td><td>0</td></tr></table>
<p>A matched element can flip a losing fight; a mismatched one can heal the enemy (Water on Grass is −1).</p>`
        }
      },
      links: [
        L('Unbalanced Meta: Bruisers', '../pvp/bruiser-meta/index.html', 'the League of Legends example, played out'),
        L('Unbalanced Meta: Elusives', '../pvp/elusives/index.html', 'a Legends of Runeterra meta and its fixes'),
        L('Counter Cycles', '../pvp/counter-cycles/index.html', 'counter graphs in RTS, fighting games and MOBAs'),
        L('Type Weakness X-ray', '../understand-mechanics/type-weakness/index.html', 'Fire, Water, Grass as a chart')
      ]
    },
    {
      day: 9, theme: 'Enemies and obstacles', module: 'M5 PvE Interactions', moduleHref: '../pve-interactions/index.html',
      workshop: {
        title: 'Animal Roles: Create PvE Enemies', kinds: ['group', 'conceptual'],
        goal: 'Apply the Purposeful, Challenging, Growing framework to come up with unique, memorable enemies that test the game’s mechanics.',
        why: 'Random, thematic enemies come easily. Intentional, unique enemies take far more work.',
        example: '9 creatures in 3 groups of 3.',
        parts: [
          { title: 'Part 1 (30 minutes)', steps: [
            'As a group, pick 9 animals and give each a gameplay role. Use tank, DPS or healer no more than once.',
            'Mix land, sea and air.',
            'Split them into 3 groups of 3 and describe them with the Purposeful, Challenging, Growing framework.',
            'Consider how each serves a unique purpose, and how they complement one another together.'
          ] },
          { title: 'Part 2 (30 minutes): iterate, iterate, iterate', steps: [
            '<b>Purposeful:</b> what problem does this enemy pose, and which of the player’s tools does it ask for?',
            '<b>Challenging:</b> how do players express skill against it? Does it create opportunities for the player? Are the combinations of enemy, opportunity and outcome memorable?',
            '<b>Growing:</b> how can you raise the difficulty without changing its behavior? Which environments make it more dangerous? What small changes alter how the player faces it?'
          ] }
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Encounter' }
      },
      study: {
        title: 'Create Obstacles', part: 'Part 9',
        steps: [
          'Create a set of enemies, traps or obstacles for your game.',
          'Use escalation and permutation to make them varied.',
          'Draw how the player uses the actions you built earlier to overcome them.',
          'Get feedback in your Discord thread.'
        ],
        template: GDOC('16ROi_nR0UZi8jcpowK8Vmo_HPrf4Q5PaISkD5PeEAew'), tab: TAB('t.578fmtg5ytok'),
        example: {
          title: 'Echidna Z, obstacles against tools',
          html: `<table class="num"><tr><th>Obstacle</th><th>Slash</th><th>Burrow</th><th>Deflect</th><th>Jump</th></tr>
<tr><th>Armored enemy</th><td>chip</td><td>✔ backstab</td><td>✔ parry</td><td>–</td></tr>
<tr><th>Ranged sniper</th><td>–</td><td>✔ close gap</td><td>✔ reflect</td><td>dodge</td></tr>
<tr><th>Ground hazard</th><td>–</td><td>✔ tunnel</td><td>–</td><td>✔ leap</td></tr>
<tr><th>Swarm</th><td>✔ arc</td><td>✔ relocate</td><td>part</td><td>part</td></tr>
<tr><th>Heavy telegraph</th><td>–</td><td>✔ evade</td><td>✔ parry</td><td>part</td></tr></table>
<p>Every obstacle should have several answers in the kit, and every tool several obstacles it answers.</p>`
        }
      },
      links: [
        L('Nintendo Model', '../pve-interactions/nintendo-model/index.html', 'introduce, escalate, permutate'),
        L('Enemy Composer', '../pve-interactions/enemy-composer/index.html', 'Mario enemies as one movement rule plus two results'),
        L('Resistance', '../pve-interactions/resistance/index.html', 'resistance that forces a new play pattern'),
        L('Escalation', '../pve-interactions/escalation/index.html', 'numeric versus contextual escalation'),
        L('Evaluating Permutations', '../pve-interactions/permutations/index.html', 'which variants are worth keeping')
      ]
    },
    {
      day: 10, theme: 'Encounters', module: 'M5 PvE Interactions', moduleHref: '../pve-interactions/index.html',
      workshop: {
        title: 'Combined Encounters', kinds: ['analytical', 'group'],
        goal: 'Apply the hazard framework and combine it with your enemy concepts from the last workshop.',
        parts: [
          { title: 'Part 1 (30 minutes)', steps: [
            'Pick 3 biomes, keeping in mind how last workshop’s animals fit them.',
            'Create 3 hazards for each biome, aiming for 9 unique hazard patterns.',
            'Pick someone to present.'
          ], aside: 'Stuck for biomes? Grasslands, lava land, caves, mines, coral reef, temple, city in the sky, jungle, haunted house, library, theater, carnival, elephant graveyard (giant ribcages), gothic castle, mushroom forest, cyberpunk, steampunk, casino, beehive, seasteading, ship, cake and sweets, crystal cavern, pumpkin patch, rooftops, sewer, storm drains, skyscraper, courthouse, hospital, cubicle office, brutalist block, log cabins, gingerbread.' },
          { title: 'Part 2 (1 hour)', steps: [
            'Pick 1 of your biomes.',
            'Build an encounter in it with your hazards and last class’s animals.',
            'Combine hazards and animals together, so it isn’t a linear sequence of one hazard or animal at a time.',
            'If you have time, build encounters for the other biomes. Pick someone to present.'
          ] }
        ],
        meta: { type: 'Group', time: '90 minutes', zoom: 'Encounter' }
      },
      study: {
        title: 'Create Encounters', part: 'Part 10',
        steps: [
          'Create an encounter that combines enemies and obstacles.',
          'Fit it to your genre (racing = a track, platformer = a level).',
          'If you have capacity, make 2 more to show the range of your game’s design space (the range of content your mechanics allow).',
          'Get feedback in your Discord thread.'
        ],
        template: GDOC('151g7ETjMYBG09I2Pf9pwHxov92MnpngEEcIGABOwaOM'), tab: TAB('t.46m3ru1ej65h'),
        example: {
          title: 'Echidna Z, encounters as creature synergies',
          html: `<table><tr><th>Burning Garden</th><td>Flamer + walker swarm. The flamer zones the floor; walkers push you into it. Answer: burrow past the walkers and backstab the flamer first.</td></tr>
<tr><th>Reflect Gauntlet</th><td>Beamer + clinger. The clinger forces you onto the floor where the beam arc catches you. Answer: deflect the beam, or time a jump.</td></tr>
<tr><th>Boss Preamble</th><td>Patroller + exploder. The patroller telegraphs a safe corridor; the exploder blocks it. Answer: Sharp Dive the exploder before the patroller lines up.</td></tr></table>
<p>Metal Gear Solid designed its rooms with Lego: block out your encounter with whatever is at hand.</p>`
        }
      },
      links: [
        L('Hazard Patterns', '../pve-interactions/hazards/index.html?p=1', 'the 14 hazard patterns'),
        L('Reading a Pull', '../pve-interactions/pulls/index.html', 'enemy synergies in World of Warcraft pulls'),
        L('Unavoidable Calamity', '../pve-interactions/delve/index.html', 'a student delve with 23 pulls'),
        L('Sketch to Level', '../pve-interactions/sketch-level/index.html', 'from a paper sketch to a level'),
        L('Hammer Bros. Encounter', '../pve-interactions/hammer-bros/index.html', 'one enemy, many layouts', 'pve-interactions.svg')
      ]
    },
    {
      day: 11, theme: 'Co-op sequences', module: 'M6 Co-op Interactions', moduleHref: '../coop-interactions/index.html',
      workshop: {
        title: 'Role Types: Build a Cooperative Moment', kinds: ['group', 'conceptual'],
        goal: 'Take a concept, identify the player behaviors you want, then write rules and restrictions that encourage them.',
        why: 'Translate concepts into gameplay, identify multiplayer mechanics and develop them.',
        example: 'Imagination: the tasks the players must achieve and how they divide responsibilities. Rules: the rules that encourage those divisions. Sequencing: the chain of responsibilities. Themes: bees, robots, cats…',
        framework: {
          name: 'Setup → Exploit → Payoff',
          items: [['Setup', 'opens the opportunity'], ['Exploit', 'both a payoff and a setup'], ['Payoff', 'cashes it in']],
          sample: 'Water (setup) → Freeze (exploit) → Shatter (payoff), with AOE damage as a second exploit.'
        },
        steps: [
          'Come up with a theme for a co-op game.',
          'Develop a moment that encourages or enforces that cooperative style.',
          'Build 3 co-op chains of actions using Setup → Exploit → Payoff. The exploit is both a payoff and a setup.',
          'Select someone to present.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Game Project, Creative' }
      },
      study: {
        title: 'Create Co-op Sequences', part: 'Part 11',
        steps: [
          'Plan co-op Setup → Exploit → Payoff sequences for your game, for several players or AI teammates.',
          'Remember the exploit is both a setup and a payoff.',
          'Think about how a single player could take advantage of them (an NPC, or an alternate weapon, mode or tool, as one step).',
          'Get feedback in your Discord thread.'
        ],
        template: GDOC('1mb2pBRoGRs7fARfE82t8_z8FkXrXnZqw7-56UdbeATE'), tab: TAB('t.5kap5wsthqpv'),
        example: {
          title: 'Echidna Z, a solo chain',
          html: `<div class="chain"><span><b>Setup</b>Knockdown</span><span><b>Exploit</b>Paralyze</span><span><b>Payoff</b>Spinblade</span></div>
<p>EchidnaZ ambushes from underground to knock the enemy down, pushes it into a trap, then spins like a top with blades for continuous damage.</p>`
        }
      },
      links: [
        L('Co-op Chain Builder', '../coop-interactions/chains/index.html', 'Setup → Exploit → Payoff chains'),
        L('Sequencing with Tokens', '../coop-interactions/sequencing/index.html', 'a sandbox for ordering co-op actions'),
        L('Sequencing in Real Games', '../coop-interactions/sequencing-games/index.html', 'Mario, Pokémon and World of Warcraft'),
        L('Before, During, After', '../coop-interactions/timing/index.html', 'timing around the hit')
      ]
    },
    {
      day: 12, theme: 'Co-op roles', module: 'M6 Co-op Interactions', moduleHref: '../coop-interactions/index.html',
      workshop: {
        title: 'Cross-Class Roles', kinds: ['analytical', 'group'],
        goal: 'Practice setting clear strengths, weaknesses and roles as guidelines for creating characters and classes.',
        why: 'Develop cooperative roles for a game, then drill down into one character.',
        example: 'Roles: Initiator (starts fights, ganks at critical moments), Carry (farms, then dominates the late game), Support (amplifies teammates, stays close). Character: Silver from Deadlock. Role: carry tank. Weaknesses: long delay between shots, low early mobility. Strengths: nearly invincible up close, huge late-game scaling. Unique: pinning an enemy down triggers a transformation that makes the character unstoppable.',
        steps: [
          'Create roles for a hypothetical co-op game and diagram how they play together (players or AI teammates). You don’t need to animate a whole fight: one small piece of it is enough.',
          'Use the cross-class structure to describe a character for each role, with a distinct set of strengths and weaknesses.',
          'Describe the character’s unique one-off properties.',
          'Select a team member to present.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Game Project' }
      },
      study: {
        title: 'Create Co-op Roles', part: 'Part 12',
        steps: [
          'Define the roles for your game and diagram how they play together (players or AI teammates).',
          'Use the cross-class structure to describe a character for each role with distinct strengths and weaknesses.',
          'Describe each character’s unique one-off properties.',
          'Get feedback in your Discord thread.'
        ],
        tab: TAB('t.e92l3959kp21'),
        example: {
          title: 'Echidna Z, two characters split one chain',
          html: `<table><tr><th></th><th>EchidnaZ</th><th>Snapdragonella</th></tr>
<tr><th>Cross-class</th><td>Frontline engager, setup</td><td>Agile ambusher, exploit</td></tr>
<tr><th>Weakness</th><td>No ranged attacks or exploits</td><td>Fragile, combo-dependent</td></tr>
<tr><th>Strengths</th><td>Mobility, many setups</td><td>Flight, versatile status effects</td></tr>
<tr><th>Unique</th><td>Attacks while moving; charged attacks when still</td><td>Cyborg virus effects; locks enemies down by giving up her own movement</td></tr></table>
<div class="chain"><span><b>Setup</b>EchidnaZ ambush knockdown</span><span><b>Exploit</b>Snapdragonella paralysis beam</span><span><b>Payoff</b>EchidnaZ top spin, held in place</span></div>`
        }
      },
      links: [
        L('Cross-Class Structure', '../coop-interactions/team-roles/index.html', 'roles, strengths, weaknesses, uniques'),
        L('Symmetry Spectrum', '../coop-interactions/symmetry/index.html', 'how alike co-op roles should be'),
        L('Teamplay Targeting Matrix', '../coop-interactions/targeting/index.html', 'who each role can affect')
      ]
    },
    {
      day: 13, theme: 'Decompose abilities', module: 'M7 Composition', moduleHref: '../composition/index.html',
      workshop: {
        title: 'Deconstruct Spells or Abilities', kinds: ['analytical', 'group'],
        goal: 'Practice breaking spells into common components, then use those structures to create new spells.',
        why: 'Decomposition reveals an existing framework. Changing parameters inspires creativity and explores the possibility space efficiently.',
        example: 'Together, break 3 or 4 spells into parts, then change parameters to invent 3 or 4 new ones.',
        framework: {
          name: 'Decomposition',
          items: [['Source', 'who performs the action or spell'], ['Target', 'who is affected'], ['Mechanic', 'what the interaction is'], ['Timing', 'when, relative to an event (before / during / after)'], ['Description', 'a human-readable summary']]
        },
        steps: [
          'Choose a common spell or spell-like ability from a game (magic themes are easier, physical ones work too).',
          'Identify its source, target, mechanic, timing and description.',
          'Change one of the four parts to create a different spell, and write its description.',
          'Repeat 10 times.',
          'Pick your 3 favorites to present to the class.'
        ],
        meta: { type: 'Group', time: '30 minutes', zoom: 'Action, Feature' }
      },
      study: {
        title: 'Analyze Your Competition', part: 'Part 13',
        steps: [
          'Identify the top-performing games in your genre.',
          'Using a compositional lens that fits the genre, break some of their verbs / abilities into keywords to see how and why they work.',
          'Take any lessons you can into your game.',
          'Check whether this changes your market analysis.',
          'Get feedback in your Discord thread.'
        ],
        template: GDOC('1Z88JC3Hyz8cANmOJxGXX2aChJ6kI4uMHaULoqOElpMc'), tab: TAB('t.rkuxozzafyas'),
        example: {
          title: 'Echidna Z, competitors broken into keywords',
          html: `<table><tr><th>Link to the Past</th><td>Strikes (shape, timing) · Explosions (radius) · Missiles (range, damage, speed) · Catchables (type, effect)</td></tr>
<tr><th>Hades</th><td>Dashes (distance, cooldown) · Thrusts (range, speed, combos) · Supers (payload, cost, cooldown) · Projectiles (damage, speed, range, pattern)</td></tr>
<tr><th>V Rising</th><td>Transform (shape, duration, skills) · Curses (attribute, magnitude, duration) · Summon (creature, stats, count, duration) · Immobilize (duration)</td></tr>
<tr><th>No Rest for the Wicked</th><td>Strikes (shape, timing, stamina) · Parry (timing, stamina) · Dodges (duration, distance, cost) · Blink (distance, cost, intangibility)</td></tr></table>
<p><b>Keyword pool:</b> Damage (amount, school) · Missile (type, speed) · Mobility (type, distance) · Backstab bonus (%) · Lifesteal · Slow (%, duration) · Teleport (distance, cooldown)</p>`
        }
      },
      links: [
        L('What Is Composition', '../composition/decompose/index.html', 'abilities taken apart into parts'),
        L('Keywords Need Situations', '../coop-interactions/keywords/index.html', 'a keyword only matters where it applies'),
        L('Audit Gallery', '../composition/audits/index.html', 'real games decomposed')
      ]
    },
    {
      day: 14, theme: 'Compose abilities', module: 'M7 Composition', moduleHref: '../composition/index.html',
      workshop: {
        title: 'Composition', kinds: ['analytical', 'group'],
        goal: 'Learn to spot composition in an existing framework, then create new spells and extend the framework.',
        why: 'Using Alex’s example spell composition framework, find existing abilities that match, then write your own.',
        example: 'Alex’s advanced spell composition framework comes from the spell creator used on World of Warcraft at Blizzard Entertainment: a framework, even though it is codified into an engine. It works on spells outside WoW too: Spiritual Weapon, Fireball and Tidal Wave (D&D), Whirlwind (Diablo II / III). This is the decomposition exercise in reverse.',
        framework: {
          name: 'Spell composition',
          items: [['Shape', 'who and what it targets'], ['Proxy', 'the object that delivers the payload'], ['Payload', 'the list of mechanics and their tuning'], ['Conditions', 'requirements for casting'], ['Packaging', 'presentation: how you sell it'], ['Keywords', 'shortcuts for marking and tracking common themes']]
        },
        parts: [
          { title: 'Part 1 (45 minutes)', steps: [
            'Pick a spell or skill from any real-time game.',
            'Identify its shape, proxy, payload, targets, cast position, conditions, purpose and packaging, and fill them in on the framework in Miro.',
            'Repeat twice more.',
            'Discover 8 brand-new spells by filling in parameters with any suggested values, then look for spells in any game that match.'
          ] },
          { title: 'Part 2 (60 minutes)', steps: [
            'Add a new parameter to the framework and come up with example values.',
            'Fill it in for 3 spells from Part 1.',
            'Change the new parameter of one spell 3 times and describe the new spells.',
            'Describe the new parameter, and what you thought of it, to the class.'
          ] }
        ],
        meta: { type: 'Group', time: '105 minutes', zoom: 'Action' }
      },
      study: {
        title: 'Build Abilities Using Composition & Keywords', part: 'Part 14',
        steps: [
          'Create a compositional framework that fits your game and genre (reuse your Day 13 breakdowns).',
          'Break down each of your verbs / abilities in that format.',
          'Create new verbs / abilities with it, and decide whether any belong in your game.',
          '<b>14-2, mutate:</b> add a new parameter to the framework with example values; fill it in for 3 spells; change it 3 times on one spell; describe the new spells.',
          'Get feedback in your Discord thread.'
        ],
        template: GDOC('1vsmm-9-z-vVr6Fh0KIB29eWFpFckYlkXeNeLOGOp5tU'), tab: TAB('t.moqf3jhswyo'),
        example: {
          title: 'Echidna Z, actions as parameters',
          html: `<table><tr><th>Name</th><th>Shape</th><th>Payload</th><th>Target</th><th>Keyword</th></tr>
<tr><td>Echidna Slash</td><td>Arc</td><td>Damage</td><td>Enemies</td><td>Basic</td></tr>
<tr><td>Top Spin</td><td>Circle</td><td>Damage + knockback</td><td>Enemies</td><td>Disruption</td></tr>
<tr><td>Quicksand</td><td>Circle</td><td>Slow</td><td>Enemies + allies</td><td>Snare</td></tr>
<tr><td>Poison Breath</td><td>Cone</td><td>Damage + poison</td><td>Enemies</td><td>Debuff</td></tr>
<tr><td>Paralysis Beam</td><td>Line</td><td>Stun</td><td>Self + 1 enemy</td><td>Control</td></tr></table>
<p>Keywords combine too: Wall + Shotgun + Remote Control = a remote-controlled shotgun wall (Deadlock).</p>`
        }
      },
      links: [
        L('Purpose, Payload, Packaging', '../composition/three-dials/index.html', 'the three dials of an ability'),
        L('Ability Forge', '../composition/ability-forge/index.html', 'compose abilities from parts'),
        L('Refining the Abilities', '../composition/refine/index.html', 'tune what you composed')
      ]
    },
    {
      day: 15, theme: 'Enemy archetypes', module: 'M7 Composition', moduleHref: '../composition/index.html',
      workshop: {
        title: 'Utilizing Archetypes to Rapidly Create Creatures', kinds: ['group', 'conceptual'],
        goal: 'See how the constraints of frameworks supercharge creativity and unlock original ideas.',
        why: 'Mix and match components to create constraints and unlock creative, original ideas.',
        example: 'Pick 3 archetypes at random: [Desecrator] [Fighter] [Evader]. Elden Ring’s Carrion Beetle rolls a giant ball of corpses, beats you with it, leaves a semi-permanent poison zone when it breaks, then flees to find more corpses. Or Super Mario Odyssey style, “Poopin’ Phil”: runs around wildly leaving slippery messes, throws a big punch you can jump over and stomp, and the mess makes you slide into walls or off platforms.',
        parts: [
          { title: 'Compose (30 minutes)', steps: [
            'Pick 3 archetypes from the framework.',
            'Describe each archetype’s in-game behavior on its own.',
            'Combine all 3 behaviors and tweak them to work together sensibly.',
            'Describe the creature thematically and mechanically. Repeat 10 times; pick 3 favorites to present.'
          ] },
          { title: 'Deconstruct (30 minutes)', steps: [
            'Pick a game other than Elden Ring or Super Mario and list 5 to 10 of its monsters.',
            'Describe each monster’s behaviors.',
            'Map the behaviors to archetype labels of your own.',
            'List the archetypes used across those enemies and present your results.'
          ] }
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Creative' }
      },
      study: {
        title: 'Create Your Own Archetype List', part: 'Part 15',
        steps: [
          'Think of a game in the same genre as yours and list its enemies.',
          'Describe each enemy’s behaviors.',
          'Map the behaviors into a list of archetypes (invent new ones freely).',
          'Remix those archetypes into enemies or obstacles for your game.'
        ],
        template: GDOC('1xo81r3wkbnwQ0KBtCWj7kf6rbXvJYy_KasYJ8Tz90WA'), tab: TAB('t.4h3qeir4uh8j'),
        reading: L('Garret Bright’s enemy design workshop for retro games', 'https://www.gamedeveloper.com/design/build-a-bad-guy-workshop---designing-enemies-for-retro-games'),
        example: {
          title: 'Kirby’s Dream Land, enemies into archetypes',
          html: `<table><tr><th>Waddle Doo</th><td>Walks, periodically whips a beam in an arc</td><td>[Walker] [Beamer]</td></tr>
<tr><th>Sir Kibble</th><td>Throws his bladed helmet as a boomerang</td><td>[Walker] [Boomeranger]</td></tr>
<tr><th>Flamer</th><td>Clings to and spins along walls and ceilings</td><td>[Clinger] [Spikey]</td></tr>
<tr><th>Pengi</th><td>Slides on its belly and spits cold air</td><td>[Roller] [Flamer]</td></tr>
<tr><th>Rocky</th><td>Hops slowly and crashes down</td><td>[Hopper] [Slam]</td></tr></table>
<p><b>Archetypes:</b> Beamer, Boomeranger, Clinger, Exploder, Fighter, Flamer, Floater, Hopper, Patroller, Roller, Sessile, Shooter, Slam, Sparker, Spikey, Spinner, Walker.</p>`
        }
      },
      links: [
        L('Enemy Archetypes', '../composition/archetypes/index.html', 'compose creatures from archetypes'),
        L('Enemy Composer', '../pve-interactions/enemy-composer/index.html', 'Mario enemies built from rules'),
        L('Gungeon Enemy Variants', '../pve-interactions/gungeon-variants/index.html', 'handcrafted permutations'),
        L('Build the Bestiary', '../blog-posts/build-the-bestiary/index.html', 'a bestiary from parts', 'blog-posts.svg')
      ]
    },
    {
      day: 16, theme: 'Encounter arcs', module: 'M7 Composition', moduleHref: '../composition/index.html',
      workshop: {
        title: 'Encounter Arc Composition', kinds: ['group', 'conceptual'],
        goal: 'Show that composition is not limited to spells or enemies: it applies to encounters, and even whole games.',
        why: 'Take similar frameworks and apply them from a higher level. Nobody taught this one explicitly; you can do it anyway.',
        example: 'A DOOM room: break down the layout and what it builds toward, how the enemy types are placed ([Miniboss] [Fodder] [Elites] [Summoner] [Support]), and how the environment leads to a climax.',
        steps: [
          'Go back to your animals with roles from Day 9 and identify their archetypes.',
          'Build a series of 3 encounters, in order, that lead to a climax: map, traps, enemy placement.',
          'Swap animals that share an archetype for one another. How did the encounter change? Does it still work? Why or why not?',
          'Analyze the encounters to create your own framework for how you built them.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Encounter, Creative' }
      },
      study: {
        title: 'Expand Your Monster List', part: 'Part 16',
        steps: [
          'Review your archetype list from Part 15.',
          'Create 10 unique enemies from those archetypes and describe their behaviors.',
          'Add, remove or change archetypes freely.',
          'Find the clearest way to document their behaviors, then document them.'
        ],
        template: GDOC('1wTWwNG0Nxc3jw8Am9lAIaq1_R47rWi-S0ZxfQGr9m90'), tab: TAB('t.jws4yqwpxinw'),
        example: {
          title: 'Echidna Z, monster seeds from three archetypes',
          html: `<table><tr><th>Slam + Spinner + Walker</th><td>A top-heavy, wobbling colossus that stumbles along a path, slamming and spinning on impact.</td></tr>
<tr><th>Sparker + Exploder + Boomeranger</th><td>A charged mine that lobs itself back to its start after bursting in a spark ring.</td></tr>
<tr><th>Clinger + Roller + Flamer</th><td>A wall-clinging roller that leaves a burning trail on vertical surfaces.</td></tr>
<tr><th>Beamer + Hopper + Floater</th><td>A drifting beamer that hops between perches and sweeps a beam on landing.</td></tr></table>`
        }
      },
      links: [
        L('Systems at Scale', '../composition/systems/index.html', 'composition applied to encounters and systems'),
        L('Level Design Book: Pacing', '../level-design/pacing/index.html', 'a beat sheet and intensity graph'),
        L('The Zig-Zag Dungeon', '../scriptures/zig-zag-dungeon/index.html', 'rooms ordered into an arc', 'level-design--pacing.svg')
      ]
    },
    {
      day: 17, label: 'After class', theme: 'Put it all together', module: 'Capstone',
      workshop: null,
      study: {
        title: 'Put It All Together!', part: 'Part 17+',
        steps: [
          'Fold the ideas from every self-study exercise into your game design document.',
          'Build a vertical slice of your game: a GDD alone, or a mini game jam for a prototype.',
          'Share the results with the class!'
        ],
        quote: 'Remember that the real game design is what you make in the engine or on the page: the finished product.',
        template: GDOC('1V1ZzrQi7gIQj1FyALOPfe0FQ6VchuNoyFBrSJlY-XXU'), tab: TAB('t.685l707an1d7'),
        example: {
          title: 'Echidna Z, the master GDD',
          html: `<p>Not a format to copy, but a summary of the game, its goals, and how the work done meets them, with inline illustrations to cut text. Each exercise landed in one section:</p>
<ol class="gdd"><li>Executive summary and elevator pitch</li><li>Vision: goals, values, actions <i>(Part 1)</i></li><li>Core gameplay verbs <i>(Part 2)</i></li><li>Logic design tools <i>(Part 5)</i></li><li>Combat systems: interlocking, loops, skill / RPS / RNG <i>(Parts 6, 7)</i></li><li>Counterplay <i>(Part 8)</i></li><li>Obstacles and tools <i>(Part 9)</i></li><li>Encounters <i>(Part 10)</i></li><li>Enemy archetypes <i>(Parts 15, 16)</i></li><li>Co-op design <i>(Parts 11, 12)</i></li><li>Keyword-driven design system <i>(Parts 13, 14)</i></li><li>Pitch framing and feedback <i>(Parts 3, 4)</i></li></ol>`
        }
      },
      links: [
        L('What’s Next', '../composition/whats-next/index.html', 'where to take the course from here'),
        L('Audit Gallery', '../composition/audits/index.html', 'whole games audited with the course frameworks')
      ]
    }
  ];

  window.PROGRAM = { DAYS, KINDS };
})();
