/* The DGMS practice program: one entry per course day, each with its live workshop and its self-study part.
   Sources: "DGSM - RGF 26Q3 C2 - Live Workshop Exercises" (cohort 2), "DGMS: C2 - Self-Study Exercises" and
   "DGMS Self Study Project Templates". Rendered by dgms/practice/*.html through ../../practice/practice.js.
   Links are relative to dgms/practice/. Strings may hold simple inline HTML.

   THE SELF-STUDY HALF IS SWAPPABLE. In the cohort 2 decks only Part 1 is written for DGMS; Parts 2 to 17 are the
   Mastering Game Mechanics project (same steps, same optional templates, same Echidna Z worked example). So this
   file writes Part 1 itself and borrows the rest from ../../practice/program.js, which each page loads first.
   To replace the project with a DGMS-specific one, fill STUDY below with one entry per day (the same shape as a
   `study` object in ../../practice/program.js) and the borrowed part for that day is no longer used. */
(function () {
  const MGM = (window.PROGRAM && window.PROGRAM.DAYS) || [];
  const TEMPLATES = 'https://docs.google.com/document/d/10A9IpM4m3_15f02T7tOZjMjFsm0Qo_NkvNHo5q1dLz4/edit';
  const L = (label, href, note, icon) => ({ label, href, note, icon });
  const D = (page, label, note) => L(label, `../../dgms/${page}/index.html`, note); /* a DGMS interactive */
  const M = key => `../../dgms/${key}/index.html`;

  const KINDS = {
    analytical: 'Analytical Exercise', group: 'Group Activity', individual: 'Individual Activity',
    discussion: 'Discussion Exercise', conceptual: 'Conceptual Exercise', playtest: 'Playtest Exercise', production: 'Production Exercise'
  };

  /* DGMS-specific self-study parts, by day. Days missing here fall back to the MGM part for that day. */
  const STUDY = {
    0: { none: true, title: 'No exercise', note: 'Nothing to hand in. Use the cohort board from the workshop to find people who play what you play: teams form around shared pillars on Day 2.' },
    1: {
      title: 'Craft Your Own Pillars', part: 'Part 1',
      goal: 'Come up with a game concept, then support it with pillars.',
      framework: {
        name: 'Pillars / Values / Features',
        items: [
          ['Pillars', 'Core experience descriptions.'],
          ['Values', 'Short phrases that support the pillars.'],
          ['Features', 'Specific game elements that satisfy multiple values and pillars.']
        ],
        note: 'Order matters: pillars first, values second, features last.'
      },
      steps: [
        'On your own, come up with a very brief game concept.',
        'Create pillars and values for your game.',
        'Create a brief presentation (slides, a doc, anything) that explains your concept.',
        'Rehearse the pitch: you present it in the next class, and teams form around it.'
      ]
    },
    17: { none: true, title: 'No new part', note: 'The self-study deck has no part for this day. Keep folding the earlier parts into your game design document: Part 17+ pulls them together after class.' },
    18: { none: true, title: 'No new part', note: 'The self-study deck has no part for this day. The workshop’s homework applies here: write the instructions you would give artists and programmers to bring the older game’s feel up to the newer one’s.' }
  };

  /* a part borrowed from the MGM program: fix its paths for this folder and label where it comes from */
  const up = href => href.replace(/^\.\.\//, '../../');
  function borrowed(mgmDay) {
    const m = MGM.find(d => d.day === mgmDay);
    if (!m) return { none: true, title: 'Not available', note: 'This part could not be loaded.' };
    const s = Object.assign({}, m.study, { links: m.links.map(l => Object.assign({}, l, { href: up(l.href) })) });
    if (s.tab) s.tab = TEMPLATES;
    if (m.moduleHref) { s.module = 'MGM ' + m.module; s.moduleHref = up(m.moduleHref); }
    return s;
  }
  const study = (day, mgmDay) => STUDY[day] || borrowed(mgmDay === undefined ? day : mgmDay);

  const DAYS = [
    {
      day: 0, theme: 'Meet your cohort', module: 'Orientation',
      workshop: {
        title: "Meet n' Greet", kinds: ['individual', 'discussion'],
        goal: 'Get to know your cohort and the games they play.',
        steps: [
          'Post a few of your favorite games next to their genres.',
          'Add a new genre if none describes them.',
          'Put your name on a sticky note on the games you enjoy most.',
          'Group together the names that share favorite games.'
        ]
      },
      links: [
        D('m0-power-of-polish/course-map', 'The Course Map', 'the building blocks of the course, in build order'),
        D('m0-power-of-polish/designer-to-director', 'From Designer to Director', 'what a director does on teams of different sizes'),
        L('Student Tokens', '../../student-tokens/index.html', 'battle-map tokens, arrows and status badges for your Miro boards')
      ]
    },
    {
      day: 1, theme: 'Game pillars', module: 'M1 Design Pillars', moduleHref: M('m1-pillars'),
      workshop: {
        title: 'Analyze Game Pillars', kinds: ['analytical', 'group'],
        goal: 'Understand how vision guides a development team through the process of creating a game, long before they know what the final game will be.',
        why: 'You take a series of games your team has played and boil each one down to three pillars.',
        example: 'Keba, Jacopo and Celia walk through the Miro board: one game each, three pillars per game, then the values and features that sit under each pillar.',
        steps: [
          'Each person in the group contributes one game.',
          'Individually, pick one of the proposed games and identify three pillars for it.',
          'Review everyone’s pillar choices for their game.',
          'Pick the three strongest game + pillars combos. Discuss the values and features that fall under those pillars.',
          'Four groups will be asked to present.'
        ],
        meta: { type: 'Solo and Group', time: '60 minutes', zoom: 'Game' }
      },
      links: [
        D('m1-pillars/pillar-linter', 'Pillar Linter', 'run the four rules on any pillar you write'),
        D('m1-pillars/pillar-or-value', 'Pillar or Value?', 'sort statements into pillars and values'),
        D('m1-pillars/pull-a-pillar', 'Pull a Pillar', 'see which features fall when a pillar goes'),
        D('m1-pillars/triage-board', 'Feature Triage Board', 'rank features by the pillars they support'),
        D('m0-power-of-polish/it-depends', 'It Depends', 'the same feature fits one game’s pillars and fights another’s')
      ]
    },
    {
      day: 2, theme: 'Present pillars, form teams', module: 'M1 Design Pillars', moduleHref: M('m1-pillars'),
      workshop: {
        title: 'Present Pillars and Pick Teams!', kinds: ['group', 'conceptual'],
        goal: 'Practice presenting your pillars and finding people whose values align with your own. The happiest teams are made of people who want to march in the same direction.',
        why: 'You take notes as other students present and write down the values you share with them. Then you reach out and start groups together.',
        parts: [
          { title: 'Present and find your team', steps: [
            'Add your name to the Miro board before you present.',
            'Listen while everyone presents. Write down the pillars and values that align with yours.',
            'Add your name below the names of others who share your values.',
            'If you and someone else both listed each other, start a breakout room together.',
            'If that does not happen, find the group with the most pillars you admire and join it. Five people at most: split into teams of three if you reach six.'
          ] },
          { title: 'Brainstorm with your team', steps: [
            'Brainstorm game concepts and ideas.',
            'Apply audience demographics and player skill type analysis to your ideas.',
            'Come up with a game concept and pillars.',
            'Continue the brainstorm outside of class.'
          ] }
        ]
      },
      links: [
        D('m1-pillars/pillar-linter', 'Pillar Linter', 'check your pillars before you present them'),
        D('m1-pillars/triage-board', 'Feature Triage Board', 'test a team’s pillars against a backlog'),
        D('m0-power-of-polish/audience-dials', 'Target Audience Dials', 'from audience to insight to fantasy'),
        D('m3-skills/skill-fingerprints', 'Five-Skill Fingerprints', 'the skill types a concept leans on')
      ]
    },
    {
      day: 3, theme: 'Audience and competitors', module: 'M2 Audience', moduleHref: M('m2-audience'),
      workshop: {
        title: 'Build for an Audience', kinds: ['analytical', 'group'],
        goal: 'Learn how to build a game from the concept, understanding your audience, your competitors and their skill level.',
        why: 'You pick a competitor for your game concept and analyze it with the Quantic Foundry model. Then you design features that reinforce its dominant gameplay type while pushing a weaker one, and explain your target skill curve.',
        example: 'Keba, Jacopo and Celia have a concept for a new Elder Scrolls type of game, so they analyze Skyrim. They score it on the six types of gameplay and average the scores per type. They build their project around the strongest types, writing down the required features, and add features designed to push the weakest type (Social) into a co-dominant spot. Then they explain the skill curve they are aiming for and why it suits the audience. Keba presents.',
        framework: {
          name: 'Quantic Foundry gameplay types',
          items: [
            ['Action', 'Destruction, Excitement'],
            ['Social', 'Competition, Community'],
            ['Mastery', 'Challenge, Strategy'],
            ['Achievement', 'Completion, Power'],
            ['Immersion', 'Fantasy, Story'],
            ['Creativity', 'Design, Discovery']
          ],
          note: 'Score each motivation, then average the pair to get the type’s score.',
          sample: 'Skyrim on the instructors’ board: Action 3.5, Social 2, Mastery 3.5, Achievement 9, Immersion 7, Creativity 6.'
        },
        steps: [
          'Pick a competitor to your team’s game concept.',
          'Analyze it with the Quantic Foundry model.',
          'Design your project with the same core as the competitor, but push one of the weaker types up to co-dominant. Write down which features achieve that.',
          'Explain the skill curve of your project and how that choice supports your target audience.',
          'Choose one person to present.'
        ],
        meta: { type: 'Solo and Group', time: '60 minutes', zoom: 'Game' }
      },
      links: [
        D('m2-audience/quantic-radar', 'The Skyrim Radar', 'score a game on the Quantic Foundry motivations'),
        D('m2-audience/skill-curves', 'Five Skill Curves', 'skill against hours, with floor and ceiling'),
        D('m2-audience/shift-the-power', 'Shift the Power', 'move power between the skill floor and ceiling'),
        D('m0-power-of-polish/audience-dials', 'Target Audience Dials', 'theme, pace and combat dials for three audiences'),
        D('m2-audience/hard-check', 'Hard Check vs Soft Check', 'how checks raise beginners')
      ]
    },
    {
      day: 4, theme: 'Physical and decision skills', module: 'M3 Player Skills', moduleHref: M('m3-skills'),
      workshop: {
        title: 'Physical Execution and Decision Making', kinds: ['analytical', 'group'],
        goal: 'Create challenges through physical execution and decision making, using the Skill Testing Framework, for your game pitch.',
        why: 'You work as a group to create physical execution and decision-making challenges. <b>Physical execution:</b> timing, reaction time, mashing, dexterity, aim, muscle memory, kinesthetics (gross motor). <b>Decision making:</b> intuition, game sense, buffered reaction, ability to predict.',
        framework: {
          name: 'The Skill Testing Framework',
          items: [
            ['Which', 'Which skills do you want to test?'],
            ['How hard', 'How difficult should those skill tests be?'],
            ['Together', 'How do those skills complement or supplement one another?'],
            ['Choice', 'How do these skill tests enable player choice?']
          ],
          note: 'Then discuss whether the tests support your game’s pillars or distract from them.'
        },
        steps: [
          'Examine your team’s game pitch.',
          'Together, create physical execution and decision-making challenges: at least one skill test for each skill.',
          'Do this even where it does not fit your game. You do not need to keep it.',
          'Analyze how you could test them using the framework.',
          'Evaluate whether this helps your game target its audience.',
          'Some groups will be chosen to present their list.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Feature' }
      },
      links: [
        D('m3-skills/reaction-lab', 'Frame Window and Reaction Lab', 'measure timing windows and reaction time'),
        D('m3-skills/mash-meter', 'Mash Meter', 'mash against the deck’s marks'),
        D('m3-skills/flea-juggle', 'Build the Flea Juggle', 'stack execution demands one at a time'),
        D('m3-skills/best-answer', 'Is There a Clear Best Answer?', 'when a decision stops being a decision'),
        D('m3-skills/and-or', 'AND vs OR', 'how skill tests combine, and who passes')
      ]
    },
    {
      day: 5, theme: 'Processing, knowledge, freeform', module: 'M3 Player Skills', moduleHref: M('m3-skills'),
      workshop: {
        title: 'Processing, Knowledge and Freeform', kinds: ['group', 'discussion'],
        goal: 'Learn to analyze Processing, Knowledge and Freeform expression, and understand which skills fit your game pitch.',
        why: 'You discuss with your group how Processing, Knowledge and Freeform expression differ from one another as player skills, and which ones work for your game pitch.',
        example: 'Celia, Keba and Jacopo first discuss the differences between the three. Together they list one feature for each skill in the list, making sure everyone contributes at least one, for all three categories. They discuss which games and features make the most sense to explore for the pitch, then choose one person to present.',
        framework: {
          name: 'Three skill families',
          items: [
            ['Processing', 'Math, valuation, thinking ahead, dynamic vision, visual calculus.'],
            ['Knowledge', 'General knowledge, game knowledge, memory, sense of direction, mental mapping.'],
            ['Freeform', 'Creativity, communication, empathy, sense of humor.']
          ],
          sample: 'From the instructors’ board: Dragon Quest sells items to afford new equipment (math), Hollow Knight asks you to remember an obstacle until you have the skill for it (memory), Among Us asks you to explain why you are not the impostor (communication).'
        },
        steps: [
          'Examine your team’s game pitch.',
          'Together, create Processing, Knowledge and Freeform skill challenges: at least one skill test for each skill.',
          'Do this even where it does not fit your game. You do not need to keep it.',
          'Evaluate whether this helps your game target its audience.',
          'Some groups will be chosen to present their list.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Feature' }
      },
      links: [
        D('m3-skills/skill-fingerprints', 'Five-Skill Fingerprints', 'physical, decisions, processing, knowledge, freeform on one radar'),
        D('m3-skills/and-or', 'AND vs OR', 'join skill tests and see who gets through'),
        D('m3-skills/three-dials', 'Three Difficulty Dials', 'tune how hard a test is'),
        D('m3-skills/async-cycles', 'Asynchronous Cycles', 'a processing test built from drifting loops')
      ]
    },
    {
      day: 6, theme: 'Fantasy versus gameplay', module: 'M4 Character', moduleHref: M('m4-character'),
      workshop: {
        title: 'Fantasy and Gameplay Separation', kinds: ['conceptual', 'group'],
        goal: 'Learn to break down common characters and distinguish between fantasy and gameplay.',
        why: 'You swap fantasy and gameplay between characters to understand how one affects the other.',
        example: 'Jacopo, Celia and Keba pick two games they all know, Sonic and Dark Souls, and break down the fantasy and the gameplay of each. They discuss what swapping them would produce: what is a game with the gameplay of Dark Souls and the fantasy of Sonic? They list five fantasy-supporting elements and five gameplay-supporting elements per game (sneakers, golden rings, loops; souls, stamina bar, bonfires), mix and match them, pick the three most interesting, and write down what each game would be. Celia presents.',
        steps: [
          'As a group, choose 2 different games everyone knows.',
          'Break down their fantasy and their gameplay.',
          'Transpose their fantasy and their gameplay, and discuss what would happen.',
          'For both games, take the fantasy and list 5 gameplay elements that support it.',
          'Do the same for gameplay, listing 5 fantasies that support it.',
          'Mix and match them and pick the 3 most interesting ones.',
          'Four groups will be asked to present.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Feature' }
      },
      links: [
        D('m4-character/same-kit-new-fantasy', 'Same Kit, New Fantasy', 'one kit worn by different characters'),
        D('m4-character/source-of-power', 'Source of Power', 'where a character’s power comes from'),
        D('m4-character/log-line', 'Log Line', 'the same input under nine fantasies'),
        D('m4-character/champion-dossier', 'Champion Dossier', 'fantasy and kit, layer by layer'),
        D('m4-character/silhouette-test', 'Silhouette Test', 'read a character from its shape')
      ]
    },
    {
      day: 7, theme: 'Character metrics', module: 'M4 Character', moduleHref: M('m4-character'),
      workshop: {
        title: 'Understanding Metrics', kinds: ['analytical', 'group'],
        goal: 'Learn how to analyze games in a technical way and measure actions.',
        why: 'You record video and use a few tools to measure the relationship between walking, running and sprinting.',
        example: 'Keba, Jacopo and Celia choose Expedition 33 because Jacopo can record it locally. They agree on the distance and the metric: the gap between two rocks, measured in character sizes. They open OBS and record the character covering that same distance in each of the three movement modes, then count the timings frame by frame in Keyframe MP and write down their findings. Keba presents.',
        steps: [
          'Choose a game that features walking, running and sprinting, ideally one that someone has installed.',
          'Record a video of the movement modes over a fixed distance.',
          'Break down the speed and time of each one, using metrics you decide on (for example, the size of the character).'
        ],
        hints: ['Record with OBS and step through the video in Keyframe MP to count frames accurately.'],
        meta: { type: 'Group', time: '45 minutes', zoom: 'Feature' }
      },
      links: [
        D('m4-character/jump-tuner', 'Jump Metrics Tuner', 'seven real jumps measured the same way'),
        D('m4-character/world-speeds-up', 'The World Speeds Up', 'speed is relative to the world around the hero'),
        D('m4-character/core-actions-by-genre', 'Core Actions by Genre', 'the verbs worth measuring in each genre'),
        D('m5-controller/adr-curves', 'ADR Curves', 'speed over time as a curve')
      ]
    },
    {
      day: 8, theme: 'No workshop', module: 'M4 Character', moduleHref: M('m4-character'), noWorkshop: 'No workshop this day',
      workshop: null,
      links: [
        D('m4-character/same-button', 'Same Button, Five Meanings', 'one input, five character states'),
        D('m5-controller/puppet-tracer', 'Puppet Signal Tracer', 'from input to pawn to action'),
        D('m5-controller/two-jumps', 'Two Jumps, Two Philosophies', 'two ways to build the same verb')
      ]
    },
    {
      day: 9, theme: 'Pawn and world', module: 'M5 Controller', moduleHref: M('m5-controller'),
      workshop: {
        title: 'Pawn and World Interactions', kinds: ['analytical', 'group'],
        goal: 'Break down all interactions between world and pawn to understand their purpose.',
        why: 'You list every interaction between the character and the world in one game, then separate the ones that are purely aesthetic from the ones that are mechanical.',
        example: 'Celia, Keba and Jacopo choose Breath of the Wild. They list interactions between the pawn and the world, like chopping down a tree, or the grass bending when Link walks over it. They discuss why the first is mechanical and the second aesthetic, and do the same for every interaction. Then they pick one from each list and try to flip it to the other: bending grass that enemies can notice, for example. Jacopo presents.',
        steps: [
          'As a group, choose one game.',
          'Together, list as many interactions between the pawn and the world as you can.',
          'Discuss what is mechanical and what is aesthetic, and separate them into two lists.',
          'Pick one from each list and flip it to the other. Discuss what you would need to change to do that.',
          'Some groups will be chosen to present.'
        ],
        meta: { type: 'Group', time: '45 minutes', zoom: 'System' }
      },
      links: [
        D('m5-controller/axe-context', 'Interaction + Context = Outcome', 'one key, read against the pawn’s state'),
        D('m5-controller/puppet-tracer', 'Puppet Signal Tracer', 'follow a press from input to action'),
        D('m5-controller/hitbox-lab', 'Hitbox Lab', 'how the pawn touches the world'),
        D('m0-power-of-polish/controller-preview', 'Puppets and Wall-Runs', 'the controller reading the world for the player')
      ]
    },
    {
      day: 10, theme: 'Control schemes', module: 'M5 Controller', moduleHref: M('m5-controller'),
      workshop: {
        title: 'Purpose in Control Schemes', kinds: ['analytical', 'group'],
        goal: 'Analyze control schemes to understand the reasoning behind button assignments.',
        why: 'You choose one game and work out why its designers put each action on the button they did.',
        example: 'Jacopo, Celia and Keba analyze A Hat in Time. They find the control scheme online, list every input (move on the left stick, camera on the right stick, jump…) and discuss, one by one, the reasoning behind each assignment. Keba presents.',
        steps: [
          'Pick a game everyone in the group knows.',
          'Find its control scheme. List every input and discuss why it is mapped that way.',
          'Some groups will be chosen to show their analysis.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Game' }
      },
      links: [
        D('m5-controller/control-metaphors', 'Controls as Metaphor', 'five metaphors for laying out a controller'),
        D('m5-controller/one-thumb', 'One Thumb, Too Many Buttons', 'actions that must happen at once'),
        D('m4-character/same-button', 'Same Button, Five Meanings', 'one key across character states'),
        D('m5-controller/cancel-playground', 'Cancel Playground', 'which inputs let you out of an attack'),
        D('m5-controller/attack-windows', 'Attack Window Editor', 'what an input does across a strike')
      ]
    },
    {
      day: 11, theme: 'Camera types', module: 'M6 Camera', moduleHref: M('m6-camera'),
      workshop: {
        title: 'Understanding Camera Types', kinds: ['analytical', 'group'],
        goal: 'Change camera types in games to understand the correlation between controller and camera.',
        why: 'You swap camera types between two games and discuss how the change would affect the controller. Then you open the example project and compare its cameras.',
        example: 'The group chooses two games everyone knows with two different camera types (Mirror’s Edge and Hollow Knight on the instructors’ board). They discuss how swapping the cameras changes the experience, and whether the controller would need to change and why. Then they open the game samples, enter camera mode, and try each sample with different camera types and settings, discussing how each one affects every verb.',
        parts: [
          { title: 'Swap the cameras (30 minutes)', steps: [
            'Every group chooses 2 games with different camera types.',
            'Discuss how swapping each game’s camera type would affect the experience.',
            'Discuss how the controller would change: list the changes it would need, and what would already work.'
          ] },
          { title: 'Try the game samples (30 minutes)', steps: [
            'Open the game samples.',
            'Click Camera Mode.',
            'Try each sample, changing each camera setting.',
            'Discuss the impact.'
          ] }
        ],
        meta: { type: 'Groups', time: '30 + 30 minutes', zoom: 'System' }
      },
      links: [
        D('m6-camera/rig-switcher', 'Camera Rig Switcher', 'one level through eleven camera rigs'),
        D('m6-camera/follow-tuner', 'Follow Camera Tuner', 'the five follow-camera variables'),
        D('m6-camera/position-blend', 'Position Blend Arena', 'authored blends between camera positions'),
        D('m6-camera/lower-horizon', 'Lower the Horizon', 'height and pitch change how a boss reads'),
        D('m6-camera/clipping-lab', 'Clipping and Occlusion Lab', 'what a camera does when the world gets in the way')
      ]
    },
    {
      day: 12, theme: 'Responsiveness', module: 'M5 Controller', moduleHref: M('m5-controller'),
      workshop: {
        title: 'The Importance of Responsiveness', kinds: ['playtest', 'group'],
        goal: 'Understand how important acceleration, deceleration and rotation are to achieving responsiveness.',
        why: 'You play with acceleration, deceleration and rotation values in the game sample to reach different kinds of responsiveness.',
        example: 'Everyone opens the game sample and tunes the Acceleration, Deceleration and Rotation settings toward different feels, in both the FPS and the Action project. They analyze the FOV options in the samples and explain their purpose. Some people show their results; everyone else records theirs and posts them in the Discord.',
        steps: [
          'Take the FPS and Action game samples.',
          'Play with the Acceleration, Deceleration and Rotation settings.',
          'Tune them to feel: really slow, like on ice; as fast as possible; and somewhere in the middle.',
          'Analyze the FOV options in the game samples and explain them. Can you spot the one in the action sample?'
        ],
        meta: { type: 'Group', time: '40 minutes', zoom: 'Feature' }
      },
      links: [
        D('m5-controller/adr-curves', 'ADR Curves', 'tune acceleration, deceleration and rotation on a runner'),
        D('m5-controller/two-jumps', 'Two Jumps, Two Philosophies', 'responsiveness built from switchable pieces'),
        D('m4-character/world-speeds-up', 'The World Speeds Up', 'what makes controls feel heavy'),
        D('m6-camera/lens-ladder', 'Lens Ladder', 'focal length and field of view'),
        D('m6-camera/follow-tuner', 'Follow Camera Tuner', 'camera lag as part of responsiveness')
      ]
    },
    {
      day: 13, theme: 'Build a sound library', module: 'M7 Sound Design', moduleHref: M('m7-sound'),
      workshop: {
        title: '2 Simple Steps to Getting Your Own Sound Effect Library', kinds: ['conceptual', 'group'],
        goal: 'Make sure you know how to set up your own sound library.',
        why: 'You practice using Soundly, download free sound effects, and learn how to get the most out of your audio assets.',
        steps: [
          'Download Soundly at getsoundly.com.',
          'Download one of the sound effect libraries from the course Drive folder: MLG, Retro / Chiptune or Spider-Man sound effects.',
          'Load the library locally into Soundly and pick out 5 to 10 sound effect files that tell a complete story.',
          'See the “_My Example” files in each pack for demonstrations.'
        ],
        res: [
          { label: 'Soundly', href: 'https://getsoundly.com' },
          { label: 'Royalty-free sound effect libraries', href: 'https://drive.google.com/drive/folders/1qCvYk0MaGXKkXtRqFzdFjOPzwpfcxBoi?usp=drive_link' }
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Game' }
      },
      links: [
        D('m7-sound/faucet', 'The Faucet', 'list every sound one object makes'),
        D('m7-sound/audio-breaks', 'Two Ways Audio Breaks', 're-sound a silent lap, layer by layer'),
        D('m7-sound/four-classes', 'Four Classes Sorter', 'sort sounds by the job they do'),
        D('m7-sound/four-rules', 'Same Scene, Four Rules', 'one scene mixed four ways')
      ]
    },
    {
      day: 14, theme: 'Four classes of sound', module: 'M7 Sound Design', moduleHref: M('m7-sound'),
      workshop: {
        title: 'Practice Identifying the 4 Classes of Sound Design', kinds: ['conceptual', 'group'],
        goal: 'Understand how to use each of the four classes of sound design, so you can apply the right music and sound assets to your game.',
        steps: [
          'The instructors showcase a sound or a piece of music from GDC’s video game sound effect library.',
          'Place your name under Character, Environment or UI/UX sound effect, whichever describes the audio most closely.',
          'Be prepared to explain your reasoning.',
          'Do not listen with headphones, in case a louder sound is demonstrated.',
          'For a piece of music, consider how it shapes the scene. What tone does it set (happy, sad, exciting)? How might it serve a gameplay purpose? Does it change dynamically to fit the gameplay?'
        ],
        res: [{ label: 'Workshop sound effects (optional download)', href: 'https://drive.google.com/drive/folders/1YBubwo_q2z8kduRg_x52syGctl4An4b-' }],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Game' }
      },
      links: [
        D('m7-sound/four-classes', 'Four Classes Sorter', 'the same sorting drill, on your own'),
        D('m7-sound/reactive-music', 'Music That Reacts', 'stems that follow the gameplay'),
        D('m7-sound/boss-telegraph', 'Hear the Boss Coming', 'sound serving a gameplay purpose'),
        D('m7-sound/consonant-menu', 'Consonant and Dissonant Menu', 'UI sound that says yes or no'),
        D('m7-sound/four-rules', 'Same Scene, Four Rules', 'the rules of a clear mix')
      ]
    },
    {
      day: 15, theme: 'Balance layers', module: 'M8 Balance', moduleHref: M('m8-balance'),
      workshop: {
        title: 'Breakdown Game Layers', kinds: ['analytical', 'group'],
        goal: 'Understand game balancing layers, and how different solutions can bring similar or opposite results.',
        why: 'You break down three major games layer by layer, then suggest alternatives to what each game did in those layers.',
        example: 'Jacopo, Keba and Celia choose three games together (League of Legends, Dark Souls and Monster Hunter Wilds on the instructors’ board). They take the six layers and list what fits each layer for each game, and what does not. Then they propose alternative solutions: six in total across the layers and games, not one per layer per game. Keba presents.',
        framework: {
          name: 'Six balance layers',
          items: [
            ['Player vs player', 'League of Legends: the map is symmetrical.'],
            ['Character vs character', 'Class differences, like bruisers growing stronger in longer fights.'],
            ['Loadout vs loadout', 'Rune setup.'],
            ['Between verbs', 'Poison, slow, in the air…'],
            ['Between weapons', 'Itemization.'],
            ['Between strategies', 'Split pushing versus regrouping.']
          ],
          note: 'The examples are League of Legends, from the instructors’ board.'
        },
        steps: [
          'Choose 3 character-based games everyone in the group knows.',
          'Go through each layer and identify what fits it in each game (or note that the game gives the player no choice there).',
          'Discuss one alternative solution for each of the six layers. You can use any of the 3 games for any layer: 6 in total, not 18.',
          'Four groups will be asked to present.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Game' }
      },
      links: [
        D('m8-balance/unfair-fairness', 'Unfair Fairness', 'characters against situations, cell by cell'),
        D('m8-balance/patch-philosophies', 'Three Patch Philosophies', 'same roster, three ways to balance it'),
        D('m8-balance/hits-to-kill', 'Hits-to-Kill Bench', 'balance between weapons at thresholds'),
        D('m8-balance/toughness', 'Three Ways to Grow Toughness', 'different solutions, different curves'),
        D('m8-balance/comebacks', 'Comeback Tug-of-War', 'one match under five comeback rules')
      ]
    },
    {
      day: 16, theme: 'Balance with keywords', module: 'M8 Balance', moduleHref: M('m8-balance'),
      workshop: {
        title: 'Cats vs Mechs', kinds: ['conceptual', 'group'],
        goal: 'Learn to achieve game balance and find solutions through keywords.',
        why: 'The instructors begin by crafting basic rules and balance for a game where cats and mechs fight each other. Your role is to pick up where their design leaves off.',
        example: 'Celia invents two unique factions. The group brainstorms actions and keywords each faction could use (cats: Slash, Hairball, Screech; mechs: Fly, Lasers, Recharge), maps which abilities counter which using keywords, then invents a resource that helps balance them. The group posts the result in Discord.',
        steps: [
          'Pay attention and give input while the instructors set up the base game.',
          'Copy the Miro example.',
          'Brainstorm a list of actions and keywords each side could use.',
          'Create a map of which abilities counter which, using keywords.',
          'Experiment with an initial balance using resources and any other concept taught in the balance module.',
          'Post your work in the Discord thread.'
        ],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Action, Feature' }
      },
      links: [
        D('m8-balance/hammer-time', 'Hammer Time', 'tune two options one variable at a time'),
        D('m8-balance/unfair-fairness', 'Unfair Fairness', 'a counter map with no row left without a weakness'),
        D('m8-balance/dice-variance', 'Stable Part vs Variance', 'how much of a hit is fixed'),
        D('m8-balance/hits-to-kill', 'Hits-to-Kill Bench', 'health and damage as resources'),
        D('m8-balance/murder-bears', 'The Murder Bears', 'what one number can do to a balance')
      ]
    },
    {
      day: 17, theme: 'Elements of game feel', module: 'M9 Game Feel', moduleHref: M('m9-game-feel'),
      workshop: {
        title: 'The Elements of Game Feel', kinds: ['group', 'playtest', 'analytical'],
        goal: 'Analyze games and break down the elements that create game feel.',
        why: 'You select three abilities or verbs in three different games and list the elements each uses to achieve its game feel. Then you analyze the game samples, from least to most polished, and note which elements could improve them.',
        example: 'Jacopo, Keba and Celia discuss three games they think have rich game feel and select one ability or verb in each (the lightsaber light attack in Jedi: Survivor, the capture in Mario Odyssey). They list the elements that produce the feel: the strike animation, light generated, burn effect on hit, camera shake, controller rumble. They add new elements that could improve it. Then they open the game sample, write down every element from their lists that they find in it, and add new elements to the samples from their list.',
        parts: [
          { title: 'Break down three verbs (30 minutes)', steps: [
            'Pick an ability or verb from 3 different games.',
            'Make a list of all the feedback elements that compose that feature.',
            'Try to add new elements to the feature.'
          ] },
          { title: 'Play the game samples (30 minutes)', steps: [
            'Play each game sample.',
            'For each sample, cycle through the presets from least polished to most polished.',
            'Write down which elements from your list you see in the sample.',
            'Note what you saw that could add to it, and explain why.'
          ] }
        ],
        meta: { type: 'Group', time: '30 + 30 minutes', zoom: 'Game' }
      },
      links: [
        D('m9-game-feel/polish-ladder', 'Polish Ladder', 'add polish layers one key at a time'),
        D('m9-game-feel/sell-the-hit', 'Sell the Hit', 'one strike, eighteen game feel techniques'),
        D('m9-game-feel/feedback-mixer', 'Feedback Mixer', 'eight feedback channels on faders'),
        D('m0-power-of-polish/polish-layers', 'Same Strike, Polish Layered On', 'nine layers of feedback on one sword strike'),
        D('m9-game-feel/seven-principles', 'Seven Principles Score Sheet', 'score any game’s feel on a radar')
      ]
    },
    {
      day: 18, theme: 'The feedback tool', module: 'M9 Game Feel', moduleHref: M('m9-game-feel'),
      workshop: {
        title: 'Utilizing the Feedback Tool', kinds: ['group', 'analytical', 'production'],
        goal: 'Understand how to break down game feel elements in a technical way using the feedback tool.',
        why: 'You break down features using the Feedback Tool, then use it to add new elements to those features.',
        example: 'Celia, Jacopo and Keba choose two games made around 20 years apart. They fill in the feedback tool for the features the two titles share, the more the better, and discuss which addition would have the most impact. Then they take the older game and write a priority list of elements that would bring its feel up to the newer one’s. Jacopo presents. As homework, they write the instructions they would give artists and programmers to get the older game there.',
        framework: {
          name: 'The Feedback Tool',
          items: [
            ['Feature', 'The verb you are breaking down, such as shooting the M4 rifle.'],
            ['Context', 'One row each for self, enemy, ally and world.'],
            ['Channels', 'VFX / light, haptics, UI, SFX, animation / movement, 3D, camera, time.']
          ],
          sample: 'Call of Duty 4: Modern Warfare, shooting: muzzle light and smoke (VFX), pad vibration (haptics), bullet counter dropping (UI), M4 fire audio (SFX), recoil pushing upward (animation), low-intensity camera shake (camera); on the enemy, blood and a hit marker.'
        },
        steps: [
          'Pick 2 games that are roughly 20 years apart.',
          'Analyze them using the feedback tool.',
          'Understand the goal of the feedback, and discuss the next most impactful addition for each game.',
          'Create a priority list of elements that would bring the newer game’s feel to the older one.',
          'Present your instructions.'
        ],
        res: [{ label: 'The Feedback Tool (Google Sheet)', href: 'https://docs.google.com/spreadsheets/d/1uILP9wwKBwZNaHVlWbfHlv7HrQbSaU23rxkk2A7BgUo/edit?gid=0#gid=0' }],
        meta: { type: 'Group', time: '60 minutes', zoom: 'Creative' }
      },
      links: [
        D('m9-game-feel/feedback-mixer', 'Feedback Mixer', 'the tool’s channels as a mixing desk'),
        D('m9-game-feel/feel-shapes', 'Feel Shapes', 'game feel types as intensity over time'),
        D('m9-game-feel/pendulum', 'Pendulum and Ball', 'the animation principles behind feel'),
        D('m9-game-feel/jump-lab', 'Jump Curve Lab', 'four jumps that differ in one detail'),
        D('m9-game-feel/which-attack', 'Which Attack Comes Out?', 'input feedback the player can predict')
      ]
    },
    {
      day: 19, label: 'After class', theme: 'Put it all together', module: 'Capstone',
      workshop: null,
      links: [
        D('m0-power-of-polish/course-map', 'The Course Map', 'check your slice against every block of the course'),
        D('m9-game-feel/seven-principles', 'Seven Principles Score Sheet', 'score your own slice'),
        D('interview/practice', 'Interview Practice Card', 'practice talking about the game you made')
      ]
    }
  ];
  /* attach the self-study half: Parts 1 to 16 land on Days 1 to 16, Part 17+ after class (MGM's day 17) */
  DAYS.forEach(d => { d.study = study(d.day, d.day === 19 ? 17 : d.day); });

  window.PROGRAM = { DAYS, KINDS, config: { root: '../../', key: 'dgms-practice-done', fallback: 'dgms.svg' } };
})();
