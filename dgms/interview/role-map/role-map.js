/* Which designer are you? (bonus deck "Getting Hired as a Game Designer", slides 7-27).
   Slide 1: the role map the deck builds up over nine slides, shown whole: six domains as rows, a systems-leaning and a
   content-leaning role in each. Each cell opens a card with the role, studio examples and the course modules that train it.
   The role picked last is remembered (FPF.store 'iv-role') so the practice card can draw prompts for it.
   Slide 2: Richard Carrillo's four designer types on the deck's systems/experience and concrete/abstract axes, with a
   self-check per type. Where each type sits is not confirmed: change PLACE below to move them.
   Both walk-throughs are pure functions of t, so __seek is deterministic. */
(function () {
  const { $, $$, demo } = FPF.kit, store = FPF.store, gi = IV.gi;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- slide 1: role map ---------- */
  const cardHTML = r => `
    <div class="rm-ch"><span class="iv-ico">${gi(r.icon)}</span><div><h3>${esc(r.name)}</h3>
      <span class="chip ${r.lean}">${r.lean === 'sys' ? 'systems-leaning' : 'content-leaning'}</span> <span class="rm-dom">${esc(r.domain)}</span></div></div>
    <p class="rm-what">${esc(r.what)}</p>
    <h4>In studios</h4>
    <ul class="rm-ex">${r.ex.map(([t, img]) => `<li>${img ? `<img src="img/${img}" alt="">` : `<span class="iv-ico sm">${gi(r.icon)}</span>`}<span>${esc(t)}</span></li>`).join('')}</ul>
    <h4>Train it in this course</h4>
    <div class="iv-chips">${r.mods.map(m => `<span class="chip">${esc(IV.MODULES[m])}</span>`).join('')}</div>
    <p class="rm-go"><a href="../practice/index.html">Practise an interview prompt for this role ›</a></p>`;
  const introHTML = `<h3>Pick a role</h3><p class="rm-what">The deck's first split is systems vs content. Then each domain of a game has one role of each kind.</p>
    <p class="rm-what">Find the cell you would be happiest in for years, and apply for that title. A studio hires a specialist for a specialist role.</p>`;

  demo('rolemap', {
    init(s) {
      const grid = $(s, '.rm-grid'), card = $(s, '.rm-card'), out = $(s, '.rm-out'), board = $(s, '.rm-board');
      const roles = IV.roleList();
      grid.innerHTML = `<div class="rm-h"></div><div class="rm-h sys">${gi('gears')} Systems-leaning</div><div class="rm-h con">${gi('jigsaw-piece')} Content-leaning</div>` +
        IV.ROLES.map(([d, a, b]) => `<div class="rm-d">${esc(d)}</div>` + [a, b].map((r, k) =>
          `<button class="rm-cell ${k ? 'con' : 'sys'}" data-id="${r.id}"><span class="iv-ico">${gi(r.icon)}</span><span>${esc(r.name)}</span></button>`).join('')).join('');
      const cells = $$(grid, '.rm-cell'), leanBtns = $$(s, '.rm-lean .btn');
      const user = { id: store.get('iv-role', null), lean: 'all' };
      const show = (id, lean) => {
        cells.forEach(c => { c.classList.toggle('on', c.dataset.id === id); c.classList.toggle('dim', lean !== 'all' && !c.classList.contains(lean)); });
        leanBtns.forEach(b => b.classList.toggle('on', b.dataset.l === lean));
        const r = id && IV.role(id);
        const key = id + '|' + lean;
        if (card.dataset.key !== key) { card.dataset.key = key; card.innerHTML = r ? cardHTML(r) : introHTML; }
        out.innerHTML = r ? `<b>${esc(r.name)}</b> (${esc(r.domain.toLowerCase())}, ${r.lean === 'sys' ? 'systems' : 'content'}).` : 'Click any role to open its card.';
      };
      cells.forEach(c => c.onclick = () => { user.id = c.dataset.id; store.set('iv-role', user.id); show(user.id, user.lean); });
      leanBtns.forEach(b => b.onclick = () => { user.lean = b.dataset.l; show(user.id, user.lean); });
      const cur = IV.cursor(board);
      // walk-through: open every card, row by row, systems then content
      const T0 = 1, STEP = 1.45, DUR = T0 + roles.length * STEP + 1.2;
      const keys = roles.map((r, i) => [T0 + i * STEP, cells[i]]);
      s._sc = IV.scene(s, 'rolemap', {
        dur: DUR,
        frame(t) {
          const i = Math.floor((t - T0) / STEP);
          const id = t < T0 ? null : roles[Math.min(roles.length - 1, i)].id;
          show(id, 'all');
          cur.glide(keys, t);
        },
        manual() { cur.hide(); show(user.id, user.lean); },
      });
    },
    enter(s) { s._sc.start(); },
    leave(s) { s._sc.stop(); },
  });

  /* ---------- slide 2: four designer types ---------- */
  // UNCONFIRMED: which quadrant each type sits in. x: 'systems' (left) or 'experience' (right); y: 'abstract' (top) or 'concrete' (bottom).
  const PLACE = {
    Director: ['experience', 'abstract'],
    Architect: ['systems', 'abstract'],
    Empath: ['experience', 'concrete'],
    Analyst: ['systems', 'concrete'],
  };
  const TYPES = {
    Director: { tip: 'open with the feeling or fantasy the answer serves, then show how each choice protects it.', was: 'formerly "Visionary"', icon: 'crown', line: 'High-level direction, world-building, narrative and thematic fantasy. Anchors the emotional or conceptual soul of the project.',
      q: ['Do you start by asking what the game should make the player feel?', 'Do people come to you to settle what the game is about?', 'Do you write the world or fantasy before the features?'] },
    Architect: { tip: 'say the hook first, in one sentence, and how a player would describe it to a friend.', was: 'formerly "Salesman"', icon: 'public-speaker', line: 'Market appeal, high-concept hooks and engagement value. Champions the pitch, so the game stands out and shows its value clearly.',
      q: ['Can you pitch the game\'s hook in one sentence?', 'Do you ask what makes the game stand out from others in its genre?', 'Do you judge a feature by how exciting the first session feels?'] },
    Empath: { tip: 'walk through the moment from the player\'s seat: what they see, press and feel.', was: '', icon: 'heart-beats', line: 'The player-centric experience, moment-to-moment fun and accessibility. Tunes control feel, pacing, emotional highs and lows, and comfort.',
      q: ['Do you watch playtests for the moment players smile or frown?', 'Do you tune control feel and pacing by playing it again and again?', 'Do you notice when a fight or menu is uncomfortable for a new player?'] },
    Analyst: { tip: 'put numbers on it: what you would measure, the values you would tune and how you would know it worked.', was: '', icon: 'abacus', line: 'Systems, math, balance and long-term progression. Adjusts specific values within the systems, often after the Empath has created the experience.',
      q: ['Do you open a spreadsheet when something feels off?', 'Do you enjoy tuning numbers once the experience exists?', 'Do you think about how the game holds up after 100 hours?'] },
  };
  const NAMES = Object.keys(TYPES);

  demo('quadrant', {
    init(s) {
      const plot = $(s, '.qd-plot'), card = $(s, '.qd-card'), board = $(s, '.qd-board'), stats = $(s, '.qd-stats'), out = $(s, '.qd-out');
      const cellOf = n => ({ col: PLACE[n][0] === 'systems' ? 1 : 2, row: PLACE[n][1] === 'abstract' ? 1 : 2 });
      plot.innerHTML = `<div class="qd-ax y top">Abstract</div><div class="qd-ax y bot">Concrete</div><div class="qd-ax x left">Systems</div><div class="qd-ax x right">Experience</div>` +
        NAMES.map(n => { const c = cellOf(n), T = TYPES[n]; return `<button class="qd-tile" data-n="${n}" style="grid-column:${c.col + 1};grid-row:${c.row}"><span class="iv-ico">${gi(T.icon)}</span><b>${n}</b>${T.was ? `<small>${T.was}</small>` : ''}<span class="qd-score"></span></button>`; }).join('');
      const tiles = $$(plot, '.qd-tile'), clr = $(s, '.qd-clear');
      const saved = store.get('iv-types', {});
      const user = { pick: 'Director', ans: Object.fromEntries(NAMES.map(n => [n, (saved[n] || [0, 0, 0]).slice(0, 3)])) };
      const view = { pick: null, ans: null };
      const render = (pick, ans, sel) => {
        tiles.forEach(b => { const n = b.dataset.n, k = ans[n].filter(Boolean).length; b.classList.toggle('on', n === pick); b.querySelector('.qd-score').textContent = `${k}/3`; b.style.setProperty('--fill', k / 3); });
        const T = TYPES[pick];
        const key = pick + JSON.stringify(ans[pick]);
        if (card.dataset.key !== key) {
          card.dataset.key = key;
          card.innerHTML = `<div class="rm-ch"><span class="iv-ico">${gi(T.icon)}</span><div><h3>${pick}</h3><span class="rm-dom">${T.was || 'one of Carrillo\'s four types'}</span></div></div>
            <p class="rm-what">${esc(T.line)}</p><h4>Self-check</h4>
            ${T.q.map((q, i) => `<label class="qd-q${ans[pick][i] ? ' yes' : ''}"><input type="checkbox" data-i="${i}"${ans[pick][i] ? ' checked' : ''}><span>${esc(q)}</span></label>`).join('')}
            <h4>In an interview, show it</h4><p class="rm-what">If this is you, ${esc(T.tip)}</p>`;
          $$(card, 'input').forEach(inp => inp.onchange = () => { user.ans[user.pick][+inp.dataset.i] = inp.checked ? 1 : 0; store.set('iv-types', user.ans); render(user.pick, user.ans); });
        }
        const sc = NAMES.map(n => [n, ans[n].filter(Boolean).length]).sort((a, b) => b[1] - a[1]);
        const top = sc[0][1] ? sc.filter(x => x[1] === sc[0][1]).map(x => x[0]) : [];
        stats.innerHTML = `<div class="y"><b>${top.length ? top.join(' + ') : '…'}</b><span>${top.length ? 'your strongest lean so far' : 'answer a few questions'}</span></div>`;
        out.innerHTML = `<b>${pick}</b>: ${PLACE[pick][0]} side, ${PLACE[pick][1]} side.`;
      };
      tiles.forEach(b => b.onclick = () => { user.pick = b.dataset.n; render(user.pick, user.ans); });
      clr.onclick = () => { NAMES.forEach(n => user.ans[n] = [0, 0, 0]); store.set('iv-types', user.ans); render(user.pick, user.ans); };
      const cur = IV.cursor(board);
      // walk-through: the four axis ends, then each type with a sample learner ticking some of its questions
      const SAMPLE = { Director: [1, 0, 1], Architect: [0, 0, 1], Empath: [1, 1, 1], Analyst: [1, 0, 0] };
      const T0 = 2.6, STEP = 3.1, DUR = T0 + NAMES.length * STEP + 1.4;
      const axes = $$(plot, '.qd-ax');
      const buildKeys = () => {
        const k = [[.3, axes[0], false], [.9, axes[1], false], [1.5, axes[2], false], [2.1, axes[3], false]];
        NAMES.forEach((n, i) => {
          const t0 = T0 + i * STEP; k.push([t0, tiles.find(b => b.dataset.n === n)]);
          SAMPLE[n].forEach((v, j) => { if (v) k.push([t0 + .7 + j * .6, () => $$(card, '.qd-q')[j]]); });
        });
        return k;
      };
      const keys = buildKeys();
      s._sc = IV.scene(s, 'quadrant', {
        dur: DUR,
        frame(t) {
          const ans = Object.fromEntries(NAMES.map(n => [n, [0, 0, 0]]));
          let pick = NAMES[0];
          NAMES.forEach((n, i) => {
            const t0 = T0 + i * STEP;
            if (t >= t0) pick = n;
            SAMPLE[n].forEach((v, j) => { if (v && t >= t0 + .7 + j * .6) ans[n][j] = 1; });
          });
          axes.forEach((a, i) => a.classList.toggle('hl', t >= .3 + i * .6 && t < T0));
          render(pick, ans);
          cur.glide(keys.map(([kt, el, p]) => [kt, typeof el === 'function' ? el() : el, p]), t);
        },
        manual() { cur.hide(); axes.forEach(a => a.classList.remove('hl')); card.dataset.key = ''; render(user.pick, user.ans); },
      });
    },
    enter(s) { s._sc.start(); },
    leave(s) { s._sc.stop(); },
  });
})();
