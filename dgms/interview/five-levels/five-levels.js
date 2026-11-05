/* One question, five levels (bonus deck "Getting Hired as a Game Designer", slides 35-41).
   Slide 1: one design prompt, five written answers (Junior to Director) on a level slider. Each answer marks the spans
   that show a level's trait: talking it out, a concrete plan, a cost to other teams, who does what, a shared vision.
   Slide 2: the learner writes their own answer and tags the traits it shows; the highest trait tagged names the level it
   sounds like. Saved per prompt with FPF.store ('iv-levels'). Both walk-throughs are pure functions of t. */
(function () {
  const { $, $$, demo } = FPF.kit, store = FPF.store;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const LEVELS = [
    { name: 'Junior', trait: 'talk', line: 'Doesn\'t know the answer but can talk it out' },
    { name: 'Mid', trait: 'plan', line: 'Has answers and knows how to execute' },
    { name: 'Senior', trait: 'cost', line: 'Executes independently and thinks about the organizational costs' },
    { name: 'Lead', trait: 'deleg', line: 'Can delegate and supervise mids and up' },
    { name: 'Director', trait: 'vision', line: 'Broadcasts vision across multiple disciplines clearly' },
  ];
  const TRAITS = { talk: 'Talks it out', plan: 'Concrete plan', cost: 'Cost to other teams', deleg: 'Who does what', vision: 'Shared vision' };
  const TK = Object.keys(TRAITS);

  // answers: [[trait|text]] marks a span
  const PROMPTS = [
    { short: 'Dodge', q: 'Players say the dodge feels unreliable. What do you do?', a: [
      'I\'m not sure what causes it yet, so let me think out loud. [[talk|"Unreliable" could mean the dodge doesn\'t come out, or it comes out and you still get hit.]] [[talk|I\'d want to watch someone play and ask when it felt wrong.]] Maybe the invincibility window is too short? [[talk|I\'d try a few versions and see what players say.]]',
      '[[plan|First I\'d pull playtest clips of failed dodges and sort them: input dropped, or hit during the roll.]] [[plan|If inputs drop during attack recovery, I\'d add a 6-frame input buffer.]] [[plan|If players get hit mid-roll, I\'d extend invincibility from 12 to 16 frames]] and retest with the same players, then compare the complaint rate.',
      '[[plan|I\'d sort the clips into dropped inputs and hits during the roll, and fix the larger group first.]] [[cost|A buffer is cheap in code, but animation would have to re-time recovery on twelve attacks, so I\'d check their schedule.]] [[cost|Longer invincibility also shifts boss tuning, so combat design reruns their encounter tests.]] I can own the change and the retest myself.',
      '[[plan|The plan: classify the failures, fix the largest group, retest.]] [[deleg|I\'d ask one mid designer to tag the playtest clips this week, and another to prototype the buffer in the gym.]] [[cost|I\'d book animation time for the re-timing and warn combat design their tests will move.]] [[deleg|I review both results on Friday and pick what ships.]]',
      '[[vision|Our pillar is combat that feels fair and readable. A dodge that fails with no visible reason breaks it, whatever the numbers say.]] [[vision|I\'d give animation, audio and UI one goal: when a dodge works, the player sees, hears and feels it.]] [[deleg|The combat lead owns the fix, and I make sure every discipline knows why it matters and what "done" looks like.]] [[cost|If it costs the milestone a week, I\'d make that trade and explain it to production.]]',
    ] },
    { short: 'Crafting', q: 'Our new crafting system makes loot drops feel worthless. What do you do?', a: [
      '[[talk|So players can craft gear as strong as drops? Let me think about why anyone would still raid.]] [[talk|Maybe drops could have something crafting can\'t, like a special effect?]] [[talk|I\'d want to look at what players actually equip before I pick.]]',
      '[[plan|I\'d pull data on which item sources players equip at max level.]] [[plan|If crafted gear wins every slot, I\'d cap crafted items one tier below raid drops, or make the top recipes need raid materials.]] [[plan|Then I\'d watch equip rates for two weeks.]]',
      '[[plan|Capping crafted items below raid drops is the direct fix.]] [[cost|It also cuts what materials are worth, so the economy\'s gold sinks and auction prices move; I\'d model that first.]] [[cost|Crafters who already invested will feel punished, so community needs a clear message.]]',
      '[[deleg|I\'d have the economy designer model material prices under two caps, and an item designer draft recipes that need raid materials.]] [[cost|Community prepares the announcement once we pick.]] [[deleg|We review both options together and I decide what ships next patch.]]',
      '[[vision|Raiding and crafting should both feel like a path worth taking: raids give power first, crafting gives choice and fills gaps.]] [[vision|I\'d share that one line with design, economy, art and community so every change points the same way.]] [[deleg|The systems lead owns the numbers.]] [[cost|If it means less crafted power this season, I accept that to keep raids meaningful.]]',
    ] },
  ];
  const parse = src => { let k = 0; return esc(src).replace(/\[\[(\w+)\|([^\]]+)\]\]/g, (m, t, x) => `<mark class="t-${t}" data-k="${k++}">${x}</mark>`); };
  const traitsIn = src => TK.filter(t => src.includes(`[[${t}|`));
  const rungs = (box, on) => box.innerHTML = LEVELS.map((l, i) => `<button class="fl-rung t-${l.trait}${i === on ? ' on' : ''}" data-i="${i}"><span class="n">${i + 1}</span><span><b>${l.name}</b><small>${esc(l.line)}</small></span></button>`).join('');

  /* ---------- slide 1 ---------- */
  demo('levels', {
    init(s) {
      const board = $(s, '.fl-board'), qEl = $(s, '.fl-prompt .q'), ladder = $(s, '.fl-ladder'), ans = $(s, '.fl-ans'), out = $(s, '.fl-out');
      const slider = $(s, '.fl-slider'), lvl = $(s, '.fl-lvl'), picks = $$(s, '.fl-pick .btn');
      rungs(ladder, 0);
      const rs = $$(ladder, '.fl-rung');
      const user = { p: store.get('iv-levels-p', 0), lv: 0 };
      let key = '';
      // shown = how many marks are lit (Infinity = all)
      const render = (p, lv, shown = Infinity) => {
        const P = PROMPTS[p], L = LEVELS[lv], src = P.a[lv];
        if (key !== p + '|' + lv) {
          key = p + '|' + lv;
          qEl.textContent = P.q;
          ans.innerHTML = `<h3>${L.name} <span class="tchip t-${L.trait} on">${TRAITS[L.trait]}</span></h3><p class="fl-text">${parse(src)}</p>
            <h4>Traits in this answer</h4><div class="fl-traits">${TK.map(t => `<span class="tchip t-${t}" data-t="${t}">${TRAITS[t]}</span>`).join('')}</div>`;
        }
        const marks = $$(ans, 'mark');
        marks.forEach((m, i) => m.classList.toggle('show', i < shown));
        const lit = new Set(marks.filter(m => m.classList.contains('show')).map(m => m.className.match(/t-(\w+)/)[1]));
        $$(ans, '.fl-traits .tchip').forEach(c => c.classList.toggle('on', lit.has(c.dataset.t)));
        rs.forEach((r, i) => r.classList.toggle('on', i === lv));
        picks.forEach(b => b.classList.toggle('on', +b.dataset.p === p));
        slider.value = lv; lvl.textContent = L.name;
        const tr = traitsIn(src);
        out.innerHTML = `<b>${L.name}:</b> ${esc(L.line.toLowerCase())}. This answer shows ${tr.map(t => TRAITS[t].toLowerCase()).join(', ')}.`;
      };
      slider.oninput = () => { user.lv = +slider.value; render(user.p, user.lv); };
      rs.forEach(r => r.onclick = () => { user.lv = +r.dataset.i; render(user.p, user.lv); });
      picks.forEach(b => b.onclick = () => { user.p = +b.dataset.p; store.set('iv-levels-p', user.p); render(user.p, user.lv); });
      const cur = IV.cursor(board);
      // walk-through: climb the ladder on the first prompt, lighting each answer's marks one by one
      const T0 = .8, STEP = 3.2, DUR = T0 + LEVELS.length * STEP + .8;
      const keys = LEVELS.map((l, i) => [T0 + i * STEP, rs[i]]);
      s._sc = IV.scene(s, 'levels', {
        dur: DUR,
        frame(t) {
          const lv = Math.max(0, Math.min(4, Math.floor((t - T0) / STEP)));
          const f = t - (T0 + lv * STEP);
          render(0, lv, t < T0 ? 0 : Math.floor((f - .25) / .45) + 1);
          cur.glide(keys, t);
        },
        manual() { cur.hide(); render(user.p, user.lv); },
      });
      render(0, 0, 0);
    },
    enter(s) { s._sc.start(); },
    leave(s) { s._sc.stop(); },
  });

  /* ---------- slide 2: your answer ---------- */
  const SAMPLE = { text: 'I\'d first ask which players report it, and watch clips of the failed dodges. If inputs drop during attack recovery, I\'d add a short input buffer and retest. Animation would need to re-time the recovery frames, so I\'d check their schedule before I commit.', tags: [['talk', 4.2], ['plan', 6.6], ['cost', 9]] };
  demo('mine', {
    init(s) {
      const board = $(s, '.fl-mine'), qEl = $(s, '.fl-prompt .q'), ta = $(s, '.fl-ta'), tagBox = $(s, '.fl-tags'), out = $(s, '.fl-out2');
      const lvEl = $(s, '.fl-read .lv'), strip = $(s, '.fl-strip'), picks = $$(s, '.fl-pick2 .btn'), clr = $(s, '.fl-clear');
      tagBox.innerHTML = LEVELS.map(l => `<label class="fl-tag t-${l.trait}"><input type="checkbox" data-t="${l.trait}"><span><b>${TRAITS[l.trait]}</b><small>${l.name} trait</small></span></label>`).join('');
      strip.innerHTML = LEVELS.map(l => `<span class="t-${l.trait}"></span>`).join('');
      const boxes = $$(tagBox, 'input'), tags = $$(tagBox, '.fl-tag'), bars = $$(strip, 'span');
      const saved = store.get('iv-levels', {});
      const user = { p: store.get('iv-levels-p', 0) };
      const mine = p => saved[p] || (saved[p] = { text: '', tags: [] });
      const render = (p, text, tg, fromUser) => {
        qEl.textContent = PROMPTS[p].q;
        if (!fromUser && ta.value !== text) ta.value = text;
        boxes.forEach((b, i) => { const on = tg.includes(b.dataset.t); b.checked = on; tags[i].classList.toggle('on', on); });
        picks.forEach(b => b.classList.toggle('on', +b.dataset.p === p));
        const hi = Math.max(-1, ...tg.map(t => TK.indexOf(t)));
        lvEl.textContent = hi < 0 ? '…' : LEVELS[hi].name;
        bars.forEach((b, i) => b.classList.toggle('on', i <= hi));
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        out.innerHTML = hi < 0 ? `${words} words. Tag only the traits a listener would hear.` :
          hi < 4 ? `${words} words. To sound like a <b>${LEVELS[hi + 1].name}</b>, add: ${TRAITS[LEVELS[hi + 1].trait].toLowerCase()}.` : `${words} words. Every trait is there. Check each one is clear out loud.`;
      };
      const save = () => store.set('iv-levels', saved);
      ta.oninput = () => { mine(user.p).text = ta.value; save(); render(user.p, ta.value, mine(user.p).tags, true); };
      boxes.forEach(b => b.onchange = () => { const m = mine(user.p); m.tags = boxes.filter(x => x.checked).map(x => x.dataset.t); save(); render(user.p, m.text, m.tags); });
      picks.forEach(b => b.onclick = () => { user.p = +b.dataset.p; store.set('iv-levels-p', user.p); render(user.p, mine(user.p).text, mine(user.p).tags); });
      clr.onclick = () => { saved[user.p] = { text: '', tags: [] }; save(); render(user.p, '', []); };
      const cur = IV.cursor(board);
      // walk-through: a sample answer types itself in, then its three traits get tagged
      const TYPE0 = .6, TYPE1 = 3.6, DUR = 12;
      const keys = [[TYPE0, ta], ...SAMPLE.tags.map(([t, at]) => [at, boxes[TK.indexOf(t)]])];
      s._sc = IV.scene(s, 'mine', {
        dur: DUR,
        frame(t) {
          const n = Math.round(IV.clamp((t - TYPE0) / (TYPE1 - TYPE0)) * SAMPLE.text.length);
          render(0, SAMPLE.text.slice(0, n), SAMPLE.tags.filter(([, at]) => t >= at).map(([x]) => x));
          cur.glide(keys, t);
        },
        manual() { cur.hide(); render(user.p, mine(user.p).text, mine(user.p).tags); },
      });
    },
    enter(s) { s._sc.start(); },
    leave(s) { s._sc.stop(); },
  });
})();
