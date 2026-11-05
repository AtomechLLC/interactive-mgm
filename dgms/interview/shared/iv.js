/* Interview deck (bonus: Getting Hired as a Game Designer): data and walk-through helpers shared by the pages in
   dgms/interview/. Load after deck.js, kit.js and gi.js.
   IV.ROLES      the role map: six domains, each with a systems-leaning and a content-leaning role
   IV.MODULES    course module names (shown as text chips; the module pages may not exist yet)
   IV.RUBRIC     the four interviewer questions and the 4Cs, each with a "looks like" line
   IV.TACTICS    the five tactics (slide 49)
   IV.FRAMEWORKS the course's own frameworks to reach for in an answer (slide 52)
   IV.scene()    a walk-through that auto-plays a slide and registers __seek / __dur for it
   IV.cursor()   a fake pointer the walk-through glides between elements */
(function () {
  const IV = (window.IV = window.IV || {});
  const gi = n => (FPF.gi && FPF.gi.svg ? FPF.gi.svg(n) : '');
  IV.gi = gi;
  IV.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  IV.ease = u => (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

  IV.MODULES = {
    m0: 'Module 0 · Power of Polish', m1: 'Module 1 · Design Pillars', m2: 'Module 2 · Audience', m3: 'Module 3 · Player Skills',
    m4: 'Module 4 · Character', m5: 'Module 5 · Controller', m6: 'Module 6 · Camera', m7: 'Module 7 · Sound Design',
    m8: 'Module 8 · Balance', m9: 'Module 9 · Game Feel',
  };

  // [domain, systems-leaning role, content-leaning role]. Each role: id, name, icon (game-icons name), what (one or two
  // sentences, from the deck notes where it has them), ex (studio examples: [text, image file in the page's img/ or null]),
  // mods (module keys that train it), prompts (practice questions for practice/).
  IV.ROLES = [
    ['Interactions',
      { id: 'mechanics', name: 'Mechanics designer', icon: 'gears',
        what: 'Designs the rules and behaviours of gameplay elements, balances them so choices stay meaningful, and iterates from playtests. Great combat design is a real-time combat puzzle.',
        ex: [['WoW class designers build each class kit', 'wow-classicon_mage.jpg'], ['League champion designers build each kit of four abilities', 'lol-Ahri.png']],
        mods: ['m3', 'm4', 'm5', 'm8'],
        prompts: ['Players say the dodge feels unreliable. What do you do?', 'Design a new ability for a healer that rewards positioning.', 'One weapon has a 70% pick rate. Walk me through how you would respond.'] },
      { id: 'puzzle', name: 'Puzzle designer', icon: 'jigsaw-piece',
        what: 'Builds the individual puzzles, cards or boards that test what the player knows about the mechanics. Focuses on the quality of each single piece.',
        ex: [['Match-3 puzzle designers author each board', null], ['Legends of Runeterra card designers write each card', null]],
        mods: ['m3', 'm1', 'm2'],
        prompts: ['Design a puzzle that teaches one new rule without any text.', 'Our match-3 level 40 has a 9% clear rate. What do you look at first?', 'Pitch a card that creates a new deck archetype.'] }],
    ['Space and pace',
      { id: 'controller', name: 'Character and controller designer', icon: 'run',
        what: 'Designs the systems players use to navigate spaces: movement, jumps, dashes and camera. Often built inside gymnasiums, test spaces with measured gaps and walls.',
        ex: [['League champion designers tune dashes such as Arcane Shift', 'lol-EzrealE.png'], ['WoW movement abilities such as Sprint and Blink', 'wow-ability_rogue_sprint.jpg']],
        mods: ['m4', 'm5', 'm6', 'm9'],
        prompts: ['Our jump feels floaty. How do you find out why?', 'Add a wall-run to an existing platformer. What changes?', 'How would you pick the dash distance for a new hero?'] },
      { id: 'level', name: 'Level designer', icon: 'treasure-map',
        what: 'Builds the spaces themselves: layout, pacing, sightlines and where each challenge lands. A level is one piece of the experience, judged on its own quality.',
        ex: [['Call of Duty mission designers lay out each mission', null], ['WoW raid designers shape each raid space', 'wow-achievement_dungeon_icecrown_frostmourne.jpg']],
        mods: ['m6', 'm3', 'm2'],
        prompts: ['Playtesters get lost in the second area. What do you change?', 'Pace a 20-minute level from first fight to boss.', 'How do you teach a new enemy inside a level?'] }],
    ['Usability',
      { id: 'ux', name: 'UX designer', icon: 'eyeball',
        what: 'Designs how the whole game communicates: flows, onboarding, readability and what the player needs to know at each moment.',
        ex: [['Onboarding flows and first-time user experience', null], ['Settings and accessibility options', null]],
        mods: ['m2', 'm9', 'm7'],
        prompts: ['New players quit during the tutorial. How do you investigate?', 'Redesign a crafting menu that takes nine clicks.', 'How do you test whether a status effect is readable?'] },
      { id: 'ui', name: 'UI designer', icon: 'smartphone',
        what: 'Designs the screens and widgets: the HUD, menus, icons and layouts, one piece at a time, so each one reads at a glance.',
        ex: [['WoW action bars and quest log', 'wow-inv_misc_book_09.jpg'], ['League shop and scoreboard', null]],
        mods: ['m9', 'm0', 'm7'],
        prompts: ['Design a HUD for a game with five resources.', 'Players miss the low-health warning. What do you try?', 'Walk me through how you would lay out an item tooltip.'] }],
    ['Plot and story',
      { id: 'narrative', name: 'Narrative designer', icon: 'open-book',
        what: 'Designs how story works as a system: structure, branching, how lore reaches the player, and how the story supports the pillars.',
        ex: [['WoW expansion story arcs told across zones', 'wow-inv_misc_note_01.jpg'], ['League champion lore and relationships', 'lol-Lux.png']],
        mods: ['m1', 'm2', 'm7'],
        prompts: ['How would you tell a story in a game with no cutscenes?', 'Our players skip every dialogue. What do you do?', 'Design a branching choice that matters without doubling the content.'] },
      { id: 'quest', name: 'Quest and mission designer', icon: 'scroll-unfurled',
        what: 'Builds the individual quests and missions that fill the game with content, focusing on the quality of each one.',
        ex: [['WoW quest designers', 'wow-inv_scroll_03.jpg'], ['Call of Duty mission designers', null]],
        mods: ['m1', 'm3', 'm6'],
        prompts: ['Turn a "kill ten boars" quest into something memorable.', 'Design an escort mission players will not hate.', 'How do you make a side quest feed the main story?'] }],
    ['Challenges',
      { id: 'technical', name: 'Technical designer', icon: 'spanner',
        what: 'Builds the tools and test spaces (gyms, zoos and museums) and bridges engineers and mechanics designers. People joke that technical designers are "technically designers".',
        ex: [['Scripting tools for encounter and quest designers', 'wow-inv_misc_gear_01.jpg'], ['Gyms that measure jump arcs and attack ranges', null]],
        mods: ['m4', 'm5', 'm9'],
        prompts: ['Design a tool that lets designers tune enemies without an engineer.', 'What would you put in a combat gym?', 'A designer wants a feature the engine cannot do. How do you help?'] },
      { id: 'combat', name: 'Combat designer', icon: 'crossed-swords',
        what: 'Builds the enemies, bosses and encounters, the individual fights that test the player.',
        ex: [['WoW raid and combat content designers', 'wow-achievement_boss_ragnaros.jpg'], ['Call of Duty enemy designers', null]],
        mods: ['m3', 'm8', 'm9'],
        prompts: ['Design a boss phase that tests a different skill than phase one.', 'Players say an enemy is unfair. How do you check?', 'Design an enemy that counters the player\'s strongest tactic.'] }],
    ['Finance',
      { id: 'economy', name: 'Economy designer', icon: 'scales',
        what: 'Designs the sources and sinks of currencies and items, progression rates, and the math that keeps rewards meaningful over time.',
        ex: [['WoW item designers and gold sinks', 'wow-inv_misc_coin_01.jpg'], ['Crafting and loot tables', 'wow-inv_sword_39.jpg']],
        mods: ['m8', 'm2'],
        prompts: ['Gold prices doubled in a month. What do you look at?', 'Design a crafting system that does not make drops worthless.', 'How fast should a player reach max level?'] },
      { id: 'monetization', name: 'Monetization designer', icon: 'coins',
        what: 'Designs what players can buy and how offers are shown, so the game earns money without breaking fairness or trust.',
        ex: [['League skin designers', 'lol-Jinx.png'], ['Battle passes and store offers', null]],
        mods: ['m2', 'm1', 'm8'],
        prompts: ['Design a battle pass for a game that has none.', 'Players call a new offer pay-to-win. How do you respond?', 'How would you price a cosmetic bundle?'] }],
  ];
  IV.roleList = () => IV.ROLES.flatMap(([d, s, c]) => [Object.assign({ domain: d, lean: 'sys' }, s), Object.assign({ domain: d, lean: 'con' }, c)]);
  IV.role = id => IV.roleList().find(r => r.id === id);

  // what the interviewer cares about (slides 31-34) and the 4Cs (slides 43-47)
  IV.RUBRIC = [
    { grp: 'Interviewer', k: 'explore', q: 'Do you explore the problem before jumping in?', looks: 'Asks who the player is and what "unreliable" means before proposing a fix.', say: '"Before I change anything: which players report it, and on what inputs?"' },
    { grp: 'Interviewer', k: 'paths', q: 'Do you consider multiple possible solution paths?', looks: 'Names two or three options and says why one goes first.', say: '"We could widen the window, add buffering, or change the feedback. I would test buffering first."' },
    { grp: 'Interviewer', k: 'costs', q: 'Do you understand the tradeoffs and costs?', looks: 'Says what each option costs in time, risk and other teams\' work.', say: '"Buffering is cheap for us but animation has to re-time twelve clips."' },
    { grp: 'Interviewer', k: 'collab', q: 'Are you a collaborator?', looks: 'Brings the interviewer in and builds on what they say.', say: '"What have you already tried? I can build on that."' },
    { grp: '4Cs', k: 'critical', q: 'Critical thinking', looks: 'Breaks the problem into parts and checks assumptions against data.', say: '"If it only happens online, it may be latency and not the design."' },
    { grp: '4Cs', k: 'comm', q: 'Communication', looks: 'Speaks in a clear order: the problem, the options, the pick and why.', say: '"Three steps: confirm the problem, try the cheapest fix, measure."' },
    { grp: '4Cs', k: 'creative', q: 'Creativity', looks: 'Offers at least one idea beyond the obvious fix.', say: '"What if the dodge left a short afterimage, so players can see it worked?"' },
    { grp: '4Cs', k: 'consistent', q: 'Consistency', looks: 'Uses the same way of thinking on every question, so the interviewer can predict their quality.', say: '"Same as before: goal, options, costs, test."' },
  ];

  IV.TACTICS = [
    ['If you need time, ask for it!', 'A ten-second pause reads as care, not doubt.'],
    ['Make it a collaboration', 'Treat the interviewer as a teammate on the problem.'],
    ['Ask what they\'ve already tried', 'It saves time and shows you respect their work.'],
    ['Connect to your history', 'Tie the answer to a game or project you shipped or studied.'],
    ['Practice, practice, practice', 'Run prompts out loud with a timer until the structure is automatic.'],
  ];

  IV.FRAMEWORKS = [
    { mod: 'm1', name: 'Pillars', items: ['Keep each pillar short', 'A pillar is not a feature', 'Avoid words that fit any project', 'Pillars should be load bearing', 'Ask which pillar each feature supports'] },
    { mod: 'm3', name: 'Skill tests', items: ['Five skill types: physical execution, decision making, processing, knowledge, freeform', 'Three difficulty dials: intensity, fault tolerance, required successes', 'AND (complementary) vs OR (supplementary) tests'] },
    { mod: 'm8', name: 'Balance checklist', items: ['Compare directly, in the same units', 'Intensity vs frequency', 'Push for uniqueness', 'Ensure responses survive', 'Violate balance on purpose'] },
    { mod: 'm9', name: 'Seven principles', items: ['Predictable results', 'Nuance', 'Context', 'Feedback', 'Low floor, high ceiling', 'Impact and resolution', 'Appealing reaction'] },
  ];

  /* ---------- fake pointer ---------- */
  IV.cursor = board => {
    const el = document.createElement('div');
    el.className = 'iv-cursor';
    el.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7 19 2.6-7.6L20 11z" fill="#fff" stroke="#262c6a" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    board.appendChild(el);
    const pos = target => {
      if (!target) return null;
      if (Array.isArray(target)) return { x: target[0], y: target[1] };
      const b = board.getBoundingClientRect(), r = target.getBoundingClientRect(), k = b.width / board.offsetWidth || 1;
      return { x: (r.left - b.left + r.width * .5) / k, y: (r.top - b.top + r.height * .55) / k };
    };
    return {
      el,
      hide() { el.classList.remove('on', 'press'); },
      // keys: [[time, element or [x, y]], ...] sorted by time. The pointer sits on each key's target from its time,
      // glides to the next one over the GLIDE seconds before that key, and shows a press ring just after each key.
      glide(keys, t, GLIDE = .55) {
        if (!keys.length || t < keys[0][0] - GLIDE) { el.classList.remove('on'); return; }
        let i = 0; while (i + 1 < keys.length && keys[i + 1][0] - GLIDE <= t) i++;
        let p = pos(keys[i][1]);
        const nx = keys[i + 1];
        if (t < keys[i][0] && i === 0) { /* arriving at the first key */ }
        if (nx && t > nx[0] - GLIDE) { const q = pos(nx[1]), u = IV.ease(IV.clamp((t - (nx[0] - GLIDE)) / GLIDE)); if (p && q) p = { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u }; }
        if (!p) { el.classList.remove('on'); return; }
        el.classList.add('on');
        el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        const since = t - keys[i][0];
        el.classList.toggle('press', since >= 0 && since < .22 && keys[i][2] !== false);
      },
    };
  };

  /* ---------- walk-through + __seek / __dur ---------- */
  // IV.scene(slide, which, { dur, frame(t), manual() }): frame(t) renders the walk-through at time t from t alone.
  // The tour plays while the slide shows; any real pointer or key press on the slide turns it off and calls manual()
  // (which should put back the learner's own state). The slide's .iv-tour button starts it again from 0.
  const scenes = (IV.scenes = IV.scenes || {});
  let firstWhich = null;
  IV.scene = (s, which, o) => {
    const btn = s.querySelector('.iv-tour');
    const st = { tour: true, t: 0, held: false, stop: null };
    const off = () => {
      if (!st.tour) return;
      st.tour = false; btn && btn.classList.remove('on');
      o.manual && o.manual();
    };
    const on = () => { st.tour = true; st.t = 0; btn && btn.classList.add('on'); o.frame(0); };
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); on(); });
    ['pointerdown', 'keydown'].forEach(ev => s.addEventListener(ev, e => {
      if (!e.isTrusted || (btn && btn.contains(e.target))) return;
      if (e.target.closest && e.target.closest('.slide-head')) return;
      off();
    }, true));
    const api = {
      get tour() { return st.tour; }, off, on,
      start() { if (st.held) return; st.stop && st.stop(); st.stop = FPF.raf(dt => { if (st.held || !st.tour) return; st.t += dt; if (st.t >= o.dur) st.t = 0; o.frame(st.t); }); if (st.tour) o.frame(st.t); },
      stop() { st.stop && st.stop(); st.stop = null; },
      seek(t) { st.held = true; document.body.classList.add('iv-held'); st.tour = true; btn && btn.classList.add('on'); api.stop(); o.frame(Math.max(0, Math.min(o.dur - 1e-3, t))); },
      dur: () => o.dur,
    };
    scenes[which] = api;
    if (!firstWhich) firstWhich = which;
    return api;
  };
  window.__seek = (t, which) => scenes[which || firstWhich].seek(t);
  window.__dur = which => scenes[which || firstWhich].dur();
})();
