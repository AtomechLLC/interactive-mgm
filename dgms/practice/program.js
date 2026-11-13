/* The DGMS practice program: one entry per course day, each with its live workshop and its self-study part.
   Workshops come from "DGSM - RGF 26Q3 C2 - Live Workshop Exercises" (cohort 2). The self-study project,
   "Direct one game, one moment", is written for this course: each part picks up what that day's workshop left
   undone and adds one page to a Director's Brief, with Echidna Z as the worked example (STUDY below).
   Rendered by dgms/practice/*.html through ../../practice/practice.js. Links are relative to dgms/practice/.
   Strings may hold simple inline HTML. */
(function () {
  const L = (label, href, note, icon) => ({ label, href, note, icon });
  const D = (page, label, note) => L(label, `../../dgms/${page}/index.html`, note); /* a DGMS interactive */
  const M = key => `../../dgms/${key}/index.html`;

  const KINDS = {
    analytical: 'Analytical Exercise', group: 'Group Activity', individual: 'Individual Activity',
    discussion: 'Discussion Exercise', conceptual: 'Conceptual Exercise', playtest: 'Playtest Exercise', production: 'Production Exercise'
  };

  /* The self-study project, by day: "Direct one game, one moment". Each part follows that day's workshop and adds
     one page to a Director's Brief. From Part 6 on the brief narrows to one signature action. Fields: after (what
     the workshop left undone), steps, page (what to add to the brief), example (the Echidna Z worked page) and
     links (the interactives for the part). */
  const T = (head, rows) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const STUDY = {
    0: {
      title: 'Before You Know Anything', part: 'Part 0',
      after: `You posted your favorite games and found people who share them. Nobody has looked closely at one yet.`,
      steps: [
        `Pick one moment, ten seconds or less, from a game on the cohort board.`,
        `Watch or play it five times.`,
        `List everything that makes it land. Use your own words: there is no framework yet.`,
        `Keep the list. Part 18 asks you to write it again.`
      ],
      page: `<b>Before list.</b> Game and moment, what happens, and everything you noticed.`,
      example: {
        title: 'Echidna Z, the reference moment',
        html: `<p>The team picks the nail strike on a Husk in Hollow Knight, the game closest to the feel they want.</p>
<p>Noticed on Day 0: a white slash arc, a crunch sound, the enemy slides back, the knight slides back a little too. Four items.</p>
<p>The same clip gets fourteen items in Part 18.</p>`
      },
      links: [
        D('m0-power-of-polish/polish-layers', 'Same Strike, Polish Layered On', 'one strike, nine layers switched on one at a time'),
        D('m0-power-of-polish/it-depends', 'It Depends', 'the same feature in three games'),
        D('m0-power-of-polish/course-map', 'The Course Map', 'the blocks your brief will cover')
      ]
    },
    1: {
      title: 'Craft Your Own Pillars', part: 'Part 1',
      after: `You boiled games your team has played down to three pillars. You analyzed pillars; you have not written any.`,
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
        `On your own, write a game concept in two or three sentences.`,
        `Write three pillars: short descriptions of the core experience.`,
        `Under each pillar, write two or three values that support it. Do not list features yet.`,
        `Test each pillar against the four rules: short, not a feature, not generic, load bearing.`,
        `Put it on one or two slides and rehearse. You present it in the next class, and teams form around it.`
      ],
      page: `<b>Pillars.</b> Concept, three pillars, the values under each, and the rule each pillar came closest to failing.`,
      example: {
        title: 'Echidna Z, Keba’s pitch',
        html: `<p><i>A down-on-his-luck short-beaked echidna claws, burrows and deflects his way to the throne of the Australian animal kingdom.</i></p>` +
          T(['Pillar', 'Values'], [
            ['Underdog with claws', 'Small hero, large world · every win is earned'],
            ['The ground is yours', 'Dig anywhere · the enemy never knows where you surface'],
            ['Playful, never mean', 'Creatures have charm · failure is funny before it is frustrating']
          ]) +
          `<p>“Burrow ability” was the first draft of pillar two. It failed the rule “not a feature” and became “The ground is yours”.</p>`
      },
      links: [
        D('m1-pillars/pillar-linter', 'Pillar Linter', 'run the four rules on each pillar'),
        D('m1-pillars/pillar-or-value', 'Pillar or Value?', 'sort statements into pillars and values')
      ]
    },
    2: {
      title: 'One Team, Three Pillars', part: 'Part 2',
      after: `You presented, found people whose values match yours, and started brainstorming. The workshop ends with “continue the brainstorm outside of class”: your team has several sets of pillars and no agreed game.`,
      steps: [
        `Lay every member’s pillars side by side. Merge them into three team pillars and note what was dropped.`,
        `Write the team concept in one paragraph.`,
        `List ten features someone on the team wants.`,
        `For each feature, mark which pillars it supports.`,
        `Sort them: supports two or more is kept, supports one is parked, supports none is cut.`,
        `Remove one pillar in your head. Which kept features fall? If none do, that pillar is not load bearing: rewrite it.`
      ],
      page: `<b>Concept and triage.</b> Team pillars, the concept paragraph, and the feature table with pillars supported and a verdict.`,
      example: {
        title: 'Echidna Z, two pitches become one',
        html: `<p>Keba wanted a game that makes people love echidnas. Alex wanted gritty, heavily animated combat. Team pillars: <b>The ground is yours</b> (Keba), <b>Gritty hands</b> (Alex), <b>Playful, never mean</b> (Keba). Alex’s “Read, then punish” became a value under Gritty hands.</p>` +
          T(['Feature', 'Pillars supported', 'Verdict'], [
            ['Burrow and surface behind the target', 'Ground, Gritty', 'Kept'],
            ['Spike deflect', 'Gritty, Playful', 'Kept'],
            ['Co-op partner Snapdragonella', 'Gritty, Playful', 'Kept'],
            ['Conservation codex', 'Playful', 'Parked'],
            ['Idle mode', 'none', 'Cut'],
            ['Random loot tables', 'none', 'Cut']
          ])
      },
      links: [
        D('m1-pillars/triage-board', 'Feature Triage Board', 'mark pillars per feature and the backlog sorts itself'),
        D('m1-pillars/pull-a-pillar', 'Pull a Pillar', 'see which features fall when a pillar goes')
      ]
    },
    3: {
      title: 'Know Your Player’s First Hour', part: 'Part 3',
      after: `You scored a competitor on the Quantic Foundry model, pushed one weaker motivation and named a skill curve. Only the competitor was scored, and nobody planned how a new player gets onto that curve.`,
      steps: [
        `Score your own game on the six Quantic Foundry groups, 0 to 10. Each member scores alone, then average.`,
        `Overlay the competitor’s scores from class. Circle the largest gap: that gap is your pitch to their audience.`,
        `Describe your primary player in three lines: what they play now, what they want more of, what makes them quit.`,
        `List the first five things your game checks in its first hour.`,
        `Mark each check hard (the player cannot continue without it) or soft (there is another way through).`,
        `For each hard check, say where the player learned it before being tested.`
      ],
      page: `<b>Audience.</b> Both score sets, the primary player, the skill curve with its floor and ceiling, and the first-hour check table.`,
      example: {
        title: 'Echidna Z against Hollow Knight',
        html: T(['Group', 'Hollow Knight', 'Echidna Z'], [
          ['Action', '7', '8'], ['Social', '1', '5'], ['Mastery', '9', '8'], ['Achievement', '7', '5'], ['Immersion', '8', '7'], ['Creativity', '3', '4']
        ]) +
          `<p>The gap is Social: the partner character is the pitch. Primary player: finished Hades, bounced off Elden Ring, wants weight without the dread. Skill curve: a lower floor than Hollow Knight, the same ceiling.</p>` +
          T(['First-hour check', 'Type', 'Learned where'], [
            ['Slash a slow Walker', 'Soft', 'Burrowing past also works'],
            ['Burrow under a spike row', 'Hard', 'A dirt patch with a paw print, no enemies nearby'],
            ['Deflect one Shooter', 'Soft', 'Burrow closes the gap instead'],
            ['Burrow behind an armored enemy', 'Hard', 'The armor only has a front plate, visible from far away'],
            ['Deflect the first boss’s slam', 'Hard', 'Three Shooters in the room before it']
          ])
      },
      links: [
        D('m2-audience/quantic-radar', 'The Skyrim Radar', 'score a game by averaging votes'),
        D('m2-audience/skill-curves', 'Five Skill Curves', 'floor and ceiling on one chart'),
        D('m2-audience/hard-check', 'Hard Check vs Soft Check', 'one answer, or several'),
        D('m2-audience/affordance-grid', 'The Affordance Grid', 'what a level shows before it tests')
      ]
    },
    4: {
      title: 'Choose Your Skill Tests', part: 'Part 4',
      after: `You invented a test for every physical execution and decision making skill, including ones that do not fit your game. Nothing was chosen and nothing has a number.`,
      steps: [
        `From your class list, keep the two or three tests your pillars need. Cross out the rest and write one reason for each.`,
        `For each kept test, answer the Skill Testing Framework questions: which skill, how difficult, how it complements the other tests, how it enables player choice.`,
        `Give each test one number: a window in frames, a reaction time in milliseconds, presses per second.`,
        `Try that number yourself. Change it if you fail more than half your attempts.`
      ],
      page: `<b>Skill tests.</b> One card per kept test (skill, test, number, the choice it enables) and the cut list.`,
      example: {
        title: 'Echidna Z, three tests kept',
        html: T(['Skill', 'Test', 'Number', 'Choice it enables'], [
          ['Timing', 'Deflect on the hit frame', '10 frame window at 60 fps', 'Deflect for a charge, or burrow away for safety'],
          ['Ability to predict', 'Pick where to surface before diving', 'Decided before 0.5 s underground ends', 'Behind the target, or beside the next one'],
          ['Buffered reaction', 'Enemy tells', '0.6 s shortest wind-up', 'Which of three answers to prepare']
        ]) +
          `<p>Cut: mashing (it fights the value “read, then punish”), aim (a melee game), dexterity inputs (they raise the floor Part 3 lowered).</p>`
      },
      links: [
        D('m3-skills/reaction-lab', 'Frame Window and Reaction Lab', 'find a window you can hit'),
        D('m3-skills/mash-meter', 'Mash Meter', 'presses per second, measured'),
        D('m3-skills/best-answer', 'Is There a Clear Best Answer?', 'when a decision is a real one')
      ]
    },
    5: {
      title: 'Draw Your Skill Fingerprint', part: 'Part 5',
      after: `You invented processing, knowledge and freeform tests. The five skill groups have never been put side by side for your game.`,
      steps: [
        `Keep one or two tests from today’s class list, the same way you did in Part 4.`,
        `Score your game 0 to 10 on each group: physical, decisions, processing, knowledge, freeform.`,
        `Score your Part 3 competitor on the same five. Where do you differ on purpose?`,
        `For your hardest moment, say which tests are joined by AND (all must pass) and which by OR (any one passes). Every AND shrinks the audience.`,
        `Set three difficulty dials for that moment: how hard the input is, what a failure costs, how far back a retry starts.`
      ],
      page: `<b>Skill profile.</b> Five scores for both games, the AND and OR statement, and the three dial settings.`,
      example: {
        title: 'Echidna Z, decisions over physical',
        html: T(['', 'Physical', 'Decisions', 'Processing', 'Knowledge', 'Freeform'], [
          ['Echidna Z', '7', '8', '4', '6', '2'], ['Hollow Knight', '8', '6', '4', '7', '2']
        ]) +
          `<p>Knowledge test kept: each enemy archetype has one tell. Processing test kept: a stamina budget across a fight.</p>
<p>Hardest moment, the first boss: deflect timing OR burrow prediction gets you through a slam, so two kinds of player pass. Dials: a 10 frame window, a failed deflect costs one of five health, a retry starts at the boss door.</p>`
      },
      links: [
        D('m3-skills/skill-fingerprints', 'Five-Skill Fingerprints', 'draw the radar for your game'),
        D('m3-skills/and-or', 'AND vs OR', 'how the joiner changes who passes'),
        D('m3-skills/three-dials', 'Three Difficulty Dials', 'input, punishment and retry cost'),
        D('m3-skills/async-cycles', 'Asynchronous Cycles', 'processing load from loops that drift')
      ]
    },
    6: {
      title: 'Separate Your Fantasy From Your Gameplay', part: 'Part 6',
      after: `You swapped the fantasy and gameplay of two known games and mixed their supporting elements. Your own character still has no fantasy statement.`,
      steps: [
        `Write your character’s log line: who they are and what the player does as them, in one sentence.`,
        `Make two columns. Fantasy: what the player imagines being. Gameplay: what the hands do.`,
        `List five gameplay elements that support the fantasy. Then list any that contradict it.`,
        `Run the swap test from class on yourself: keep the gameplay and write two other fantasies that could wear it. What would have to change?`,
        `Name the source of power: where does the character’s strength come from on screen?`,
        `Choose your <b>signature action</b>, the one action that carries the fantasy. The rest of the brief directs this action.`
      ],
      page: `<b>Character.</b> Log line, the fantasy and gameplay columns, contradictions, source of power, and the signature action with your reason.`,
      example: {
        title: 'Echidna Z, Burrow is chosen',
        html: `<p><i>A small, spiky underdog who owns the ground beneath every enemy’s feet.</i></p>` +
          T(['Fantasy', 'Gameplay that supports it'], [
            ['Small and overlooked', 'Low health; enemies are two to four times his height'],
            ['Owns the ground', 'Burrow passes under enemies and hazards'],
            ['Spikes are armor', 'Deflect uses the back, so he turns away from danger to block'],
            ['Scrappy, never elegant', 'Slash is short range with a wide arc'],
            ['Strikes from where you are not looking', 'Surfacing behind a target is a backstab']
          ]) +
          `<p>Contradiction: the three-hit Spin Sequence reads as a trained swordsman, so it is reanimated as a scrabbling flurry. Swap test: the same kit could be a mole miner or a sand-swimming ghost; the mole keeps everything, the ghost loses Deflect. Source of power: claws and quills, his own body, with no weapon.</p>
<p><b>Signature action: Burrow.</b></p>`
      },
      links: [
        D('m4-character/log-line', 'Log Line', 'one input under nine log lines'),
        D('m4-character/same-kit-new-fantasy', 'Same Kit, New Fantasy', 'the swap test, played out'),
        D('m4-character/source-of-power', 'Source of Power', 'where the strength sits on screen'),
        D('m4-character/silhouette-test', 'Silhouette Test', 'does the shape carry the fantasy?')
      ]
    },
    7: {
      title: 'Write Your Metrics Sheet', part: 'Part 7',
      after: `You recorded a game and measured its walk, run and sprint. That covered locomotion only, in someone else’s game.`,
      steps: [
        `Pick the published game whose signature action is closest to yours.`,
        `Record that action and count frames: how long it takes and how far it goes, measured in character lengths.`,
        `Set your unit: one character length or height.`,
        `Write targets for your own walk, run and signature action in units and seconds.`,
        `Give each number a reason from the world: a gap, a door, an enemy’s reach.`,
        `Derive two world rules from your numbers, such as the widest hazard a player can cross.`
      ],
      page: `<b>Metrics.</b> The reference measurements, your unit, the target table with reasons, and the world rules.`,
      example: {
        title: 'Echidna Z, measured in echidna lengths',
        html: `<p>Reference: the dash in Hades, roughly 0.3 s and 4 character lengths by the team’s frame count. Unit: one echidna length (EL).</p>` +
          T(['Metric', 'Target', 'Reason'], [
            ['Walk', '3 EL per second', 'Slow enough to read tells'],
            ['Run', '6 EL per second', 'Twice walk, so the change is felt'],
            ['Burrow dive', '0.25 s', 'Faster than the shortest enemy wind-up in Part 4'],
            ['Burrow travel', '5 EL in 0.5 s', 'The fastest thing the hero does'],
            ['Burrow emerge', '0.2 s', 'Short enough to hit a turning enemy'],
            ['Slash reach', '1.5 EL', 'Shorter than every enemy’s reach, so he must burrow in']
          ]) +
          `<p>World rules: no hazard row is wider than 4 EL, and arenas are at least 12 EL across so that two burrows never cross the room.</p>`
      },
      links: [
        D('m4-character/jump-tuner', 'Jump Metrics Tuner', 'seven real jumps, measured'),
        D('m4-character/world-speeds-up', 'The World Speeds Up', 'speed is relative to the world')
      ]
    },
    8: {
      title: 'Checkpoint: Brief Version 1', part: 'Part 8',
      after: `There is no workshop today. You have seven pages, and nobody outside your team has read them.`,
      steps: [
        `Put Parts 1 to 7 in one document with a title page: game, team, signature action.`,
        `Read it top to bottom. Mark any page that contradicts an earlier one.`,
        `Post it to your thread.`,
        `Read two other teams’ briefs. For each, answer three questions: which pillar is clearest in the pages, which page ignores the pillars, and what you would cut.`,
        `Revise one page of your own from the feedback you receive.`
      ],
      page: `<b>Revision note.</b> Contradictions found, feedback received, and what changed and why.`,
      example: {
        title: 'Echidna Z, two pages revised',
        html: `<p><b>Contradiction found.</b> Part 3 lowered the skill floor, but Part 4 set the deflect window at 10 frames.</p>
<p><b>Feedback from another team.</b> “Playful, never mean” does not appear on any page after Part 2.</p>
<p><b>Changes.</b> The deflect window widens to 14 frames for the first three areas. A failed burrow into a wall now pops him out dizzy instead of dealing damage.</p>`
      },
      links: [
        D('m1-pillars/pull-a-pillar', 'Pull a Pillar', 'check the pillars still carry the pages'),
        D('m0-power-of-polish/audience-dials', 'Target Audience Dials', 'audience to insight to fantasy, in one line')
      ]
    },
    9: {
      title: 'List How Your Character Touches the World', part: 'Part 9',
      after: `You listed every pawn and world interaction in a published game, sorted mechanical from aesthetic, and flipped one each way. Your game has no interaction list.`,
      steps: [
        `List fifteen ways your character and the world touch each other. Start from your signature action.`,
        `Tag each one mechanical (it changes what the player can do) or aesthetic (it changes only what they see and hear).`,
        `Choose three aesthetic interactions that earn their cost because they sell the Part 6 fantasy.`,
        `Flip one aesthetic interaction to mechanical so that it supports a pillar. Say what must change to make it work.`,
        `Flip one mechanical interaction to aesthetic. What does the game lose?`,
        `Find one input that should do different things in different places, and write it as interaction + context = outcome.`
      ],
      page: `<b>Interactions.</b> The tagged list, three aesthetic keepers, the two flips, and one context rule.`,
      example: {
        title: 'Echidna Z, the dust trail flips',
        html: T(['Interaction (six of the fifteen)', 'Tag'], [
          ['Burrowing through soft dirt', 'Mechanical'],
          ['Bouncing off stone when trying to burrow', 'Mechanical'],
          ['Dust trail above the tunnel', 'Aesthetic'],
          ['Grass parting as he walks', 'Aesthetic'],
          ['Quills rattling against low ceilings', 'Aesthetic'],
          ['Ants scattering where he surfaces', 'Aesthetic']
        ]) +
          `<p>Keepers: dust trail, ants, quill rattle.</p>
<p>Flip to mechanical: Patroller enemies now track the dust trail, so a long straight burrow gets punished and a curved one does not. This needs steering underground, which Part 10 must map.</p>
<p>Context rule: Burrow + soft dirt = travel. Burrow + stone = a dizzy bounce. Burrow + water’s edge = a splash that douses fire.</p>`
      },
      links: [
        D('m5-controller/axe-context', 'Interaction + Context = Outcome', 'one key, read against the surroundings'),
        D('m4-character/same-button', 'Same Button, Five Meanings', 'one input across five states'),
        D('m4-character/core-actions-by-genre', 'Core Actions by Genre', 'what a core verb touches in each genre')
      ]
    },
    10: {
      title: 'Map Your Control Scheme', part: 'Part 10',
      after: `You explained every input in a published game’s control scheme. Your own scheme has not been examined.`,
      steps: [
        `List every action from Parts 4, 6 and 9, with how often it is used and what it must combine with.`,
        `Map each action to a gamepad button. Write one reason per button, the way you did in class.`,
        `Name the metaphor behind the layout: left and right hand, body parts, offense and defense, or your own.`,
        `Find every pair of actions the player needs at the same moment. If both sit under one thumb, move one.`,
        `Map the same actions to mouse and keyboard.`,
        `State what happens to the signature action while each other button is held.`
      ],
      page: `<b>Controls.</b> The action table, the metaphor, conflicts found and resolved, and the second device.`,
      example: {
        title: 'Echidna Z, Burrow moves to the trigger',
        html: `<p>Metaphor: face buttons are claws and feet, shoulders are the back.</p>` +
          T(['Action', 'First draft', 'Final', 'Reason'], [
            ['Slash', 'X', 'X', 'Most used; resting thumb position'],
            ['Jump', 'A', 'A', 'Genre convention'],
            ['Burrow', 'Y', 'RT', 'Must combine with Slash on surfacing; Y takes the right thumb off it'],
            ['Deflect', 'LB', 'LB', 'The back: a shoulder button, held'],
            ['Steer underground', 'none', 'Left stick', 'Added by the Part 9 flip'],
            ['Partner command', 'none', 'Y', 'Freed by moving Burrow; used rarely']
          ]) +
          `<p>Conflict resolved: Burrow then Slash on surfacing needed the right thumb twice within 0.2 s. With Burrow on the trigger, Slash can be held during travel and fires on emerge.</p>
<p>Mouse and keyboard: Slash on left click, Burrow on Space, Deflect on right click, Jump on Shift.</p>`
      },
      links: [
        D('m5-controller/one-thumb', 'One Thumb, Too Many Buttons', 'find the pairs that share a thumb'),
        D('m5-controller/control-metaphors', 'Controls as Metaphor', 'five ways to organize a pad'),
        D('m5-controller/puppet-tracer', 'Puppet Signal Tracer', 'follow a press from input to action')
      ]
    },
    11: {
      title: 'Write Your Camera Brief', part: 'Part 11',
      after: `You swapped camera types between two games, discussed what the controller would need, and tried rigs in the game samples. No camera has been chosen for your game.`,
      steps: [
        `List what the player must see to pass each Part 4 and Part 5 skill test: how far, in which direction, how early.`,
        `Choose a rig that shows all of it. Name one rig you rejected and why.`,
        `Set distance, pitch and lens or field of view.`,
        `Describe the camera in three situations: traversal, combat, a tight space.`,
        `Describe the camera during the signature action, from first frame to last.`,
        `List what this camera forces the controller to change, as you did in class.`
      ],
      page: `<b>Camera.</b> The must-see list, the rig and the rejected rig, settings, three situations, the signature action, and controller consequences.`,
      example: {
        title: 'Echidna Z, a camera that stays above ground',
        html: `<p>Must see: enemy wind-ups 8 EL away in every direction, and the ground behind a target before diving. Rig: a fixed-angle three-quarter view from above, as in Hades. Rejected: over-the-shoulder, because the backstab target is behind an enemy and out of view. Settings: pitch 55 degrees, a 35 mm lens, 14 EL of ground visible across.</p>` +
          T(['Situation', 'Camera behavior'], [
            ['Traversal', 'Leads 2 EL ahead of movement'],
            ['Combat', 'Centers between hero and nearest threat; pulls out up to 20% for groups'],
            ['Tight space', 'Walls nearest the camera fade; no pull-in'],
            ['Burrow', 'Stays above ground and follows the dust trail; pushes in 10% on emerge, then eases back over 0.4 s']
          ]) +
          `<p>Controller consequence: with a fixed angle, the right stick is free. It becomes the surfacing aim, so the player points at where to come up.</p>`
      },
      links: [
        D('m6-camera/rig-switcher', 'Camera Rig Switcher', 'one level through eleven rigs'),
        D('m6-camera/follow-tuner', 'Follow Camera Tuner', 'the five follow variables'),
        D('m6-camera/lens-ladder', 'Lens Ladder', 'millimeters to field of view'),
        D('m6-camera/lower-horizon', 'Lower the Horizon', 'height and pitch against a boss')
      ]
    },
    12: {
      title: 'Tune Responsiveness and Time Your Action', part: 'Part 12',
      after: `You tuned acceleration, deceleration and rotation in the game samples to feel like ice, as fast as possible, and in between. Those targets belonged to the exercise, not to a game.`,
      steps: [
        `Write the feel your pillars ask for in three words.`,
        `Tune a game sample, or the ADR Curves interactive, until it matches. Record the three values and the time to top speed.`,
        `Record a ten-second clip and post it with the values.`,
        `Write the signature action’s timeline in frames at 60 fps: startup, active, recovery.`,
        `Mark when the player’s next input is accepted, and which actions can cancel which window.`,
        `Check the timeline against your Part 4 numbers. The action must fit inside the windows your enemies give.`
      ],
      page: `<b>Timing.</b> Feel words, the three values and time to top speed, the clip, the frame timeline, and the cancel rules.`,
      example: {
        title: 'Echidna Z, Burrow frame by frame',
        html: `<p>Feel words: planted, snappy, heavy. Time to top speed 0.1 s, stop in 0.07 s, turn rate 720 degrees per second. He starts and stops almost at once, because the weight comes from the attacks.</p>` +
          T(['Burrow window', 'Frames', 'Input rule'], [
            ['Dive (startup)', '1 to 15', 'Jump cancels until frame 6; no damage immunity'],
            ['Underground (active)', '16 to 45', 'Immune to ground attacks; steer with the left stick; Slash can be held'],
            ['Emerge', '46 to 57', 'Held Slash fires on frame 50 as a backstab'],
            ['Recovery', '58 to 69', 'Deflect cancels from frame 62']
          ]) +
          `<p>Check: the dive is 0.25 s and the shortest wind-up is 0.6 s, so a player who reacts within 0.35 s gets underground in time.</p>`
      },
      links: [
        D('m5-controller/adr-curves', 'ADR Curves', 'tune acceleration, deceleration and rotation'),
        D('m5-controller/attack-windows', 'Attack Window Editor', 'drag the windows of a strike'),
        D('m5-controller/cancel-playground', 'Cancel Playground', 'which cancels let you out'),
        D('m5-controller/hitbox-lab', 'Hitbox Lab', 'where and when the hit lands')
      ]
    },
    13: {
      title: 'Tell Ten Seconds in Sound', part: 'Part 13',
      after: `You set up Soundly, loaded a free library and picked five to ten sounds that tell a complete story. The story was your choice and had nothing to do with your game.`,
      steps: [
        `Write ten seconds of your game as a script, built around the signature action.`,
        `List every sound in it. For anything that lasts, split it into start, loop and stop.`,
        `Mark each sound static (plays once) or continuous (plays until something ends it).`,
        `Find a candidate for each in a free library. Rename the files in script order.`,
        `Play the files in order with your eyes closed. If the story is unclear, a sound is missing.`,
        `Post the list and the folder, or a clip.`
      ],
      page: `<b>Sound list.</b> The script, the sound table (event, sound, static or continuous), and a link to the files.`,
      example: {
        title: 'Echidna Z, the burrow in seven sounds',
        html: `<p>Script: he sees a Shooter wind up, dives, travels under the shot, surfaces behind it and slashes.</p>` +
          T(['Event', 'Sound', 'Type'], [
            ['Shooter wind-up', 'Rising creak', 'Continuous, ends on the shot'],
            ['Dive', 'Claw scrape, then earth crunch', 'Static'],
            ['Travel', 'Low rumble with loose pebbles', 'Continuous: start, loop, stop'],
            ['Shot passes overhead', 'Muffled whoosh, heard from underground', 'Static'],
            ['Emerge', 'Dirt burst and quill ring', 'Static'],
            ['Backstab', 'Crunch with a short squeak from the enemy', 'Static'],
            ['After', 'Pebbles settling', 'Static']
          ]) +
          `<p>Missing on the first listen: nothing said he was underground. The muffled whoosh was added, and all above-ground sounds are low-passed during travel.</p>`
      },
      links: [
        D('m7-sound/faucet', 'The Faucet', 'static and continuous sounds on a timeline'),
        D('m7-sound/audio-breaks', 'Two Ways Audio Breaks', 're-sound a clip layer by layer')
      ]
    },
    14: {
      title: 'Sort, Rank and Score', part: 'Part 14',
      after: `You sorted played sounds into classes and discussed what a piece of music does for a scene. Your own list is unsorted and has no priorities.`,
      steps: [
        `Sort your Part 13 list into the four classes: character, environment, UI/UX, music.`,
        `If a class is empty, add one sound to it or say why it stays empty.`,
        `Rank the sounds: when everything plays at once, which three must stay audible? What gets quieter to make room?`,
        `Answer the three music questions from class for your game: what tone does it set, what gameplay purpose does it serve, how does it change with play?`,
        `Choose one moment where sound warns the player before the picture does.`
      ],
      page: `<b>Mix.</b> Sounds by class, the top three and what ducks for them, the music brief, and one audio warning.`,
      example: {
        title: 'Echidna Z, two empty classes filled',
        html: T(['Class', 'Sounds'], [
          ['Character', 'Claw scrape, earth crunch, rumble, dirt burst, quill ring'],
          ['Environment', 'Pebbles, the muffled world while underground'],
          ['UI/UX', 'Was empty. Added: a soft tick when stamina is too low to burrow again'],
          ['Music', 'Was empty. See the brief below']
        ]) +
          `<p>Must stay audible: enemy wind-up, emerge burst, deflect ring. Music and ambience drop by half while he is underground, which is also how the player knows the burrow is active.</p>
<p>Music brief: light percussion over a didgeridoo drone, playful in tone. It drops to the drone alone while underground, and the percussion returns on the emerge hit.</p>
<p>Audio warning: the Shooter’s creak rises in pitch and ends exactly at the shot, so a player facing away can still time the dive.</p>`
      },
      links: [
        D('m7-sound/four-classes', 'Four Classes Sorter', 'sort twelve sounds into the classes'),
        D('m7-sound/four-rules', 'Same Scene, Four Rules', 'one scene mixed four ways'),
        D('m7-sound/reactive-music', 'Music That Reacts', 'stems that follow play'),
        D('m7-sound/boss-telegraph', 'Hear the Boss Coming', 'a tone that ends on the hit')
      ]
    },
    15: {
      title: 'Place Your Game in the Six Layers', part: 'Part 15',
      after: `You filled in the six balance layers for three published games and proposed alternatives. Your game has not been placed in the layers.`,
      steps: [
        `Fill the six layers for your game: player, character, loadout, verbs, weapons, tactics. Write “no choice” where the game offers none.`,
        `For each layer, say when the choice can change: mid-fight, between fights, between sessions, never.`,
        `Pick the layer where your signature action lives. Write two alternative designs for that layer and choose one.`,
        `Build a hits-to-kill table: your signature action and your basic attack against three enemies of different toughness.`,
        `Read the table. If one action wins every column, change one number.`
      ],
      page: `<b>Balance.</b> The six-layer table, alternatives considered, and the hits-to-kill table.`,
      example: {
        title: 'Echidna Z, Slash and Burrow each win a column',
        html: T(['Layer', 'Echidna Z', 'Can change'], [
          ['Player', 'Solo, or two players unequal in skill', 'Never'],
          ['Character', 'EchidnaZ or Snapdragonella', 'Between sessions'],
          ['Loadout', 'Three quill charms', 'At rest points'],
          ['Verbs', 'Slash, Burrow, Deflect, Jump', 'Mid-fight'],
          ['Weapons', 'No choice: claws only', 'Never'],
          ['Tactics', 'Ambush, stand and deflect, hit and run', 'Mid-fight']
        ]) +
          `<p>Alternatives for the verb layer: Burrow free and unlimited, or Burrow on a stamina cost. Chosen: stamina, 30 of 100 per burrow.</p>` +
          T(['Enemy', 'Health', 'Slash (10 damage)', 'Burrow backstab (25 damage)'], [
            ['Walker', '30', '3 hits, 1.2 s', '2 hits, 2.3 s'],
            ['Fighter', '60', '6 hits, 2.4 s', '3 hits, 3.5 s'],
            ['Armored Roller', '100, front plate blocks Slash', 'cannot', '4 hits, 4.6 s']
          ]) +
          `<p>Slash is faster against soft enemies; Burrow is the only answer to armor. Neither wins every column.</p>`
      },
      links: [
        D('m8-balance/hits-to-kill', 'Hits-to-Kill Bench', 'same DPS, different hits to kill'),
        D('m8-balance/toughness', 'Three Ways to Grow Toughness', 'reduction, effective health, resistance'),
        D('m8-balance/dice-variance', 'Stable Part vs Variance', 'how much of a hit is fixed')
      ]
    },
    16: {
      title: 'Map Your Counters', part: 'Part 16',
      after: `You built Cats vs Mechs with the instructors: keywords for each side, a map of what counters what, and a resource. You practiced the method on their game.`,
      steps: [
        `If your group did not finish Cats vs Mechs, finish it and post it first.`,
        `List the keywords on your player’s actions and on your enemies.`,
        `Draw the counter map: which player keyword answers which enemy keyword, and the reverse.`,
        `Check each player action. It needs one situation where it dominates and one where it is weak.`,
        `Name the resource that limits your signature action, and what refills it.`,
        `Multiply one number by ten. Describe what breaks, then decide what cap prevents it.`
      ],
      page: `<b>Counters.</b> Keyword lists, the counter map, a dominant and a weak situation per action, the resource rule, and the times-ten test.`,
      example: {
        title: 'Echidna Z, defense pays for mobility',
        html: `<p>Player keywords: Tunnel, Backstab, Reflect, Arc. Enemy keywords: Armored, Ranged, Airborne, Tremor, Swarm.</p>` +
          T(['Player action', 'Dominates against', 'Weak against'], [
            ['Burrow (Tunnel, Backstab)', 'Armored, Ranged', 'Airborne (cannot reach), Tremor (stomps force him up)'],
            ['Deflect (Reflect)', 'Ranged, single heavy hits', 'Swarm (too many angles)'],
            ['Slash (Arc)', 'Swarm', 'Armored'],
            ['Jump', 'Tremor', 'Ranged']
          ]) +
          `<p>Resource: stamina. Burrow costs 30; a successful deflect refunds 20, so defense pays for mobility.</p>
<p>Times-ten test: at a 250% backstab bonus every fight is one burrow and Slash is never used. Cap: the bonus applies once per enemy until that enemy attacks again.</p>`
      },
      links: [
        D('m8-balance/unfair-fairness', 'Unfair Fairness', 'every option dominant somewhere'),
        D('m8-balance/hammer-time', 'Hammer Time', 'change one variable at a time'),
        D('m8-balance/comebacks', 'Comeback Tug-of-War', 'five comeback rules on one match'),
        D('m8-balance/murder-bears', 'The Murder Bears', 'what a times-thousand typo does')
      ]
    },
    17: {
      title: 'Break Down the Feel', part: 'Part 17',
      after: `You listed the feel elements of one verb in each of three games, then stepped the game samples from least to most polished. Your signature action has no feel breakdown.`,
      steps: [
        `Record five seconds of the closest reference action from a published game.`,
        `Step through it frame by frame. List every element and the frame it starts on.`,
        `Sort the elements into the eight feedback channels: VFX and light, haptics, UI, SFX, animation, 3D materials and decals, camera, time.`,
        `Write the same list for your signature action, using your Part 12 timeline for the frames.`,
        `Order your list as layers: what goes in first on a gray box, what goes in last.`,
        `Check that each layer starts on a frame that matches a window in Part 12.`
      ],
      page: `<b>Feel.</b> The reference breakdown, and your layers by channel, frame and build order.`,
      example: {
        title: 'Echidna Z, nine layers on the emerge hit',
        html: T(['Order', 'Layer', 'Channel', 'Frame'], [
          ['1', 'Emerge pose with quills flared', 'Animation', '46'],
          ['2', 'Dirt burst sound and quill ring', 'SFX', '46'],
          ['3', 'Enemy flinch and a 0.5 EL knock forward', 'Animation', '50'],
          ['4', 'Hit stop, 4 frames', 'Time', '50'],
          ['5', 'Dirt burst particles and a white flash on the enemy', 'VFX and light', '46, 50'],
          ['6', 'Camera push in 10%, small vertical shake', 'Camera', '46'],
          ['7', 'Controller pulse, short and strong', 'Haptics', '50'],
          ['8', 'Hole decal that fades over 5 s', '3D materials and decals', '46'],
          ['9', 'Backstab number in a larger size', 'UI', '50']
        ]) +
          `<p>The travel rumble from Part 13 becomes a rising haptic pulse from frame 16 to 45, so the hands feel the burrow before the eyes see the exit.</p>`
      },
      links: [
        D('m9-game-feel/sell-the-hit', 'Sell the Hit', 'one strike, eighteen techniques'),
        D('m9-game-feel/feedback-mixer', 'Feedback Mixer', 'eight channels on a mixing desk'),
        D('m9-game-feel/feel-shapes', 'Feel Shapes', 'feel as intensity over time'),
        D('m9-game-feel/polish-ladder', 'Polish Ladder', 'layers added in order')
      ]
    },
    18: {
      title: 'Rank the Polish and Brief the Team', part: 'Part 18',
      after: `You compared two games made 20 years apart in the Feedback Tool and ranked what the older one should add first. The class homework asks for the instructions you would give artists and programmers.`,
      steps: [
        `Fill in the Feedback Tool for your signature action as it stands on a gray box, beside the Part 17 reference.`,
        `Rank the five additions that change the feel most for the least work.`,
        `For each, write one instruction for the discipline that builds it. Include a number and a reference clip, so no one has to guess.`,
        `Score your action on the seven principles, 0 to 10. Circle the lowest and say which ranked item raises it.`,
        `Return to your Part 0 moment and write the list again. Put the two lists side by side.`
      ],
      page: `<b>Polish priorities.</b> The Feedback Tool comparison, the top five with instructions, the seven-principle scores, and the before and after lists.`,
      example: {
        title: 'Echidna Z, the top five',
        html: T(['Rank', 'Addition', 'Instruction', 'For'], [
          ['1', 'Hit stop', 'Freeze hero and target for 4 frames on frame 50; particles keep moving', 'Programmer'],
          ['2', 'Emerge pose', 'Reach full quill flare within 3 frames of surfacing; hold 6 frames', 'Animator'],
          ['3', 'Dirt burst and ring', 'One layered sound, under 0.4 s, the loudest event in the fight', 'Sound'],
          ['4', 'Enemy flinch', 'Every enemy needs a from-behind flinch, 12 frames, no blend-in', 'Animator'],
          ['5', 'Camera push', '10% in over 3 frames, ease out over 24; no shake on the horizontal axis', 'Programmer']
        ]) +
          `<p>Lowest principle: appealing reaction, 4 of 10, because enemies have no from-behind flinch yet. Rank 4 raises it.</p>
<p>The Part 0 list for the Hollow Knight nail strike had four items. The same clip now gives fourteen, across six channels.</p>`
      },
      res: [{ label: 'The Feedback Tool (Google Sheet)', href: 'https://docs.google.com/spreadsheets/d/1uILP9wwKBwZNaHVlWbfHlv7HrQbSaU23rxkk2A7BgUo/edit?gid=0#gid=0' }],
      links: [
        D('m9-game-feel/feedback-mixer', 'Feedback Mixer', 'the tool’s channels as a mixing desk'),
        D('m9-game-feel/seven-principles', 'Seven Principles Score Sheet', 'score your action and save the chart'),
        D('m0-power-of-polish/polish-layers', 'Same Strike, Polish Layered On', 'the Part 0 strike, layer by layer'),
        D('m9-game-feel/pendulum', 'Pendulum and Ball', 'the animation principles behind the poses')
      ]
    },
    19: {
      title: 'Assemble the Director’s Brief', part: 'Part 18+',
      after: `Class is over. You have a page from every part and no single document.`,
      steps: [
        `Put all pages in one document in the order shown in the example. Cut each to one page.`,
        `Write a half-page summary on top: the game, the player, the signature action, and the three decisions you would defend hardest.`,
        `Add one line under each page: which pillar it serves.`,
        `Optional: tune the signature action in a game sample and attach a clip.`,
        `Present it in five minutes, recorded or live. This is a portfolio piece: rehearse it as an interview answer.`
      ],
      page: `<b>The finished Director’s Brief.</b> Share it with the class.`,
      example: {
        title: '“Echidna Z, directed”',
        html: T(['Section', 'Pages from'], [
          ['Summary', 'New'],
          ['Vision: pillars, concept, kept and cut features', 'Parts 1, 2'],
          ['Player: audience, first hour, skill profile', 'Parts 3, 4, 5'],
          ['Character: fantasy, signature action, metrics, interactions', 'Parts 6, 7, 9'],
          ['Controller: control map, timing sheet', 'Parts 10, 12'],
          ['Camera', 'Part 11'],
          ['Sound: list, mix, music', 'Parts 13, 14'],
          ['Balance: layers, hits to kill, counters', 'Parts 15, 16'],
          ['Feel: layers, polish priorities, instructions', 'Parts 17, 18'],
          ['Appendix: before list, revision note', 'Parts 0, 8']
        ]) +
          `<p>The three decisions defended in the summary: Burrow on the trigger (Part 10), the fixed three-quarter camera that frees the right stick for surfacing aim (Part 11), and the stamina refund on deflect (Part 16).</p>`
      },
      links: [
        D('m0-power-of-polish/course-map', 'The Course Map', 'check the brief against every block of the course'),
        D('interview/practice', 'Interview Practice Card', 'rehearse the five-minute walk-through'),
        D('interview/rubric', 'Interview Rubric', 'what an interviewer listens for')
      ]
    }
  };

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
      day: 19, label: 'After class', theme: 'The Director’s Brief', module: 'Capstone',
      workshop: null,
      links: [
        D('m0-power-of-polish/course-map', 'The Course Map', 'check your slice against every block of the course'),
        D('m9-game-feel/seven-principles', 'Seven Principles Score Sheet', 'score your own slice'),
        D('interview/practice', 'Interview Practice Card', 'practice talking about the game you made')
      ]
    }
  ];
  /* attach the self-study half: Parts 0 to 18 land on Days 0 to 18, the capstone after class */
  DAYS.forEach(d => { d.study = STUDY[d.day]; });

  window.PROGRAM = { DAYS, KINDS, config: { root: '../../', key: 'dgms-practice-done', fallback: 'dgms.svg', after: '18+', pageLabel: 'Add to your Director’s Brief' } };
})();
