/* Practice card (bonus deck "Getting Hired as a Game Designer", slides 48-52).
   Slide 1: a prompt generator tied to the role picked on the role map (FPF.store 'iv-role'), a think/answer timer,
   the five tactics as a checklist, and a frameworks drawer listing the course's own frameworks.
   Slide 2: self-score on the rubric rows, with a log of recent rounds (FPF.store 'iv-practice-log').
   The live timer uses the frame clock; the walk-throughs are pure functions of t, so __seek is deterministic. */
(function () {
  const { $, $$, demo } = FPF.kit, store = FPF.store, gi = IV.gi;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const THINK = 30, ANSWER = 120;
  const fmt = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const roles = IV.roleList();
  // the round in progress, shared by both slides
  const round = { role: store.get('iv-role', 'mechanics'), pi: 0, tac: [0, 0, 0, 0, 0] };
  if (!IV.role(round.role)) round.role = 'mechanics';

  demo('practice', {
    init(s) {
      const board = $(s, '.pr-board'), sel = $(s, '.pr-sel'), out = $(s, '.pr-out');
      const qEl = $(s, '.pr-q'), roleEl = $(s, '.pr-role'), leanEl = $(s, '.pr-lean'), icoEl = $(s, '.pr-ico');
      const phaseEl = $(s, '.pr-phase'), digits = $(s, '.pr-digits'), barTh = $(s, '.pr-bar .th'), barAn = $(s, '.pr-bar .an');
      const goBtn = $(s, '.pr-go'), resetBtn = $(s, '.pr-reset'), drawBtn = $(s, '.pr-draw');
      const drawer = $(s, '.pr-drawer'), fwOpen = $(s, '.pr-fw-open'), fwClose = $(s, '.pr-close');
      $(s, '.pr-steer-ico').innerHTML = gi('compass');
      sel.innerHTML = IV.ROLES.map(([d, a, b]) => `<optgroup label="${esc(d)}">${[a, b].map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</optgroup>`).join('');
      $(s, '.pr-tacs').innerHTML = IV.TACTICS.map(([t, l], i) => `<label class="pr-tac"><input type="checkbox" data-i="${i}"><span><b>${esc(t)}</b><small>${esc(l)}</small></span></label>`).join('');
      $(s, '.pr-fws').innerHTML = IV.FRAMEWORKS.map(f => `<div class="pr-fw"><b>${esc(f.name)}<span>${esc(IV.MODULES[f.mod])}</span></b><ul>${f.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
      const tacEls = $$(s, '.pr-tac'), tacIn = $$(s, '.pr-tac input');
      // live timer state (manual mode)
      const tm = { el: 0, run: false };
      const renderTimer = el => {
        const think = el < THINK;
        phaseEl.textContent = el >= THINK + ANSWER ? 'Time' : think ? 'Think time' : 'Answer';
        digits.textContent = fmt(think ? THINK - el : THINK + ANSWER - el);
        barTh.style.width = (Math.min(el, THINK) / (THINK + ANSWER) * 100) + '%';
        barAn.style.width = (IV.clamp((el - THINK) / ANSWER) * ANSWER / (THINK + ANSWER) * 100) + '%';
      };
      const render = (st, el, drawerOpen) => {
        const r = IV.role(st.role), P = r.prompts;
        sel.value = st.role;
        roleEl.textContent = r.name; leanEl.textContent = r.lean === 'sys' ? 'systems-leaning' : 'content-leaning';
        leanEl.className = 'chip ' + r.lean; icoEl.innerHTML = gi(r.icon);
        qEl.textContent = P[st.pi % P.length];
        tacIn.forEach((b, i) => { b.checked = !!st.tac[i]; tacEls[i].classList.toggle('on', !!st.tac[i]); });
        renderTimer(el);
        drawer.classList.toggle('open', drawerOpen);
        const n = st.tac.filter(Boolean).length;
        out.innerHTML = `<b>${esc(r.name)}</b>, prompt ${st.pi % P.length + 1} of ${P.length}. Tactics used: ${n} of 5.`;
      };
      const user = { drawer: false };
      const live = () => render(round, tm.el, user.drawer);
      sel.onchange = () => { round.role = sel.value; round.pi = 0; store.set('iv-role', round.role); live(); };
      drawBtn.onclick = () => { round.pi = (round.pi + 1) % 3; round.tac = [0, 0, 0, 0, 0]; tm.el = 0; tm.run = false; goBtn.textContent = 'Start'; live(); };
      goBtn.onclick = () => { tm.run = !tm.run; if (tm.el >= THINK + ANSWER) tm.el = 0; goBtn.textContent = tm.run ? 'Pause' : 'Start'; live(); };
      resetBtn.onclick = () => { tm.el = 0; tm.run = false; goBtn.textContent = 'Start'; live(); };
      tacIn.forEach((b, i) => b.onchange = () => { round.tac[i] = b.checked ? 1 : 0; live(); });
      fwOpen.onclick = () => { user.drawer = true; live(); };
      fwClose.onclick = () => { user.drawer = false; live(); };
      const cur = IV.cursor(board);
      // walk-through: pick a role, draw a prompt, run the timer (sped up), tick the tactics as they get used, open the drawer
      const TOUR_ROLE = 'controller', K = { sel: .8, draw: 2.2, start: 3.4, tac: [5, 6.4, 7.8, 9.2, 10.6], end: 12, fw: 12.8, DUR: 18.5 };
      const keys = [[K.sel, roleEl, false], [K.draw, drawBtn], [K.start, goBtn], ...K.tac.map((t, i) => [t, tacIn[i]]), [K.fw, fwOpen]];
      s._sc = IV.scene(s, 'practice', {
        dur: K.DUR,
        frame(t) {
          const st = { role: t < K.sel ? 'mechanics' : TOUR_ROLE, pi: t < K.draw ? 0 : 1, tac: K.tac.map(at => (t >= at ? 1 : 0)) };
          // the timer runs at 17x: 150 timer seconds over the 8.6 s between start and end
          const el = t < K.start ? 0 : Math.min(THINK + ANSWER, (t - K.start) / (K.end - K.start) * (THINK + ANSWER));
          drawer.classList.add('instant');
          render(st, el, t >= K.fw + .1);
          // the drawer slides in over .35 s from its key
          const u = IV.clamp((t - K.fw - .1) / .35);
          drawer.style.transform = t >= K.fw + .1 ? `translateX(${(1 - IV.ease(u)) * 100}%)` : '';
          goBtn.textContent = t >= K.start && t < K.end ? 'Pause' : 'Start';
          cur.glide(t < K.fw + .4 ? keys : keys.concat([[K.fw + .9, [760, 560], false]]), t);
        },
        manual() { cur.hide(); drawer.classList.remove('instant'); drawer.style.transform = ''; goBtn.textContent = tm.run ? 'Pause' : 'Start'; live(); },
      });
      s._tick = FPF.raf(dt => { if (s._sc.tour || !tm.run) return; tm.el += dt; if (tm.el >= THINK + ANSWER) { tm.el = THINK + ANSWER; tm.run = false; goBtn.textContent = 'Start'; } renderTimer(tm.el); });
    },
    enter(s) { s._sc.start(); },
    leave(s) { s._sc.stop(); },
  });

  demo('score', {
    init(s) {
      const board = $(s, '.ps-board'), qEl = $(s, '.ps-q'), rows = $(s, '.ps-rows'), big = $(s, '.ps-total .big'), nEl = $(s, '.ps-n');
      const weak = $(s, '.ps-weak'), logEl = $(s, '.ps-log ol'), saveBtn = $(s, '.ps-save'), out = $(s, '.ps-out');
      const R = IV.RUBRIC;
      const row = r => `<div class="ps-row" data-k="${r.k}"><span>${esc(r.q)}<small>${esc(r.looks)}</small></span><span class="rb-sc">${[1, 2, 3, 4].map(n => `<button data-n="${n}">${n}</button>`).join('')}</span></div>`;
      rows.innerHTML = `<div class="ps-sec">What the interviewer cares about</div>${R.filter(r => r.grp === 'Interviewer').map(row).join('')}<div class="ps-sec">The 4Cs</div>${R.filter(r => r.grp === '4Cs').map(row).join('')}`;
      const rEls = $$(rows, '.ps-row');
      const user = { sc: {}, log: store.get('iv-practice-log', []) };
      const render = (st, sc, log, saved) => {
        const r = IV.role(st.role);
        qEl.innerHTML = `${esc(r.name)}: “${esc(r.prompts[st.pi % r.prompts.length])}”`;
        rEls.forEach((el, i) => $$(el, 'button').forEach(b => b.classList.toggle('on', +b.dataset.n === sc[R[i].k])));
        const vals = R.map(x => sc[x.k] || 0), tot = vals.reduce((a, b) => a + b, 0), n = vals.filter(Boolean).length;
        big.textContent = tot; nEl.textContent = n;
        const low = R.filter(x => sc[x.k] && sc[x.k] <= 2);
        weak.innerHTML = n < R.length ? `Score all ${R.length} rows to see what to practise next.` : low.length ? `<b>Practise next:</b> ${low.map(x => esc(x.q.replace(/\?$/, ''))).join('; ')}.` : '<b>No row at 2 or lower.</b> Try a harder prompt, or a role outside your lean.';
        logEl.innerHTML = log.slice(0, 5).map(e => `<li><b>${e.tot}/32</b> · ${esc(e.role)} · ${esc(e.date)}</li>`).join('') || '<li>No rounds saved yet.</li>';
        saveBtn.textContent = saved ? 'Saved' : 'Save this round';
        out.innerHTML = `${n} of ${R.length} rows scored. Tactics used on the practice card: ${st.tac.filter(Boolean).length} of 5.`;
      };
      rEls.forEach((el, i) => el.onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = +b.dataset.n; user.sc[R[i].k] = user.sc[R[i].k] === v ? 0 : v; render(round, user.sc, user.log); });
      saveBtn.onclick = () => {
        const tot = R.reduce((a, x) => a + (user.sc[x.k] || 0), 0);
        user.log.unshift({ tot, role: IV.role(round.role).name, date: new Date().toISOString().slice(0, 10) });
        user.log = user.log.slice(0, 20); store.set('iv-practice-log', user.log); render(round, user.sc, user.log, true);
      };
      $(s, '.ps-clear').onclick = () => { user.sc = {}; render(round, user.sc, user.log); };
      s._rerender = () => render(round, user.sc, user.log);
      const cur = IV.cursor(board);
      // walk-through: score the eight rows, then save
      const SAMPLE = [3, 2, 3, 4, 3, 2, 2, 3], T0 = .8, STEP = 1.05, SAVE = T0 + R.length * STEP + .6, DUR = SAVE + 2.6;
      const keys = R.map((x, i) => [T0 + i * STEP, rEls[i].querySelectorAll('button')[SAMPLE[i] - 1]]).concat([[SAVE, saveBtn]]);
      const TLOG = [{ tot: 17, role: 'Character and controller designer', date: 'round 1' }];
      s._sc = IV.scene(s, 'score', {
        dur: DUR,
        frame(t) {
          const sc = {}; R.forEach((x, i) => { if (t >= T0 + i * STEP) sc[x.k] = SAMPLE[i]; });
          const tot = SAMPLE.reduce((a, b) => a + b, 0);
          const log = t >= SAVE ? [{ tot, role: 'Character and controller designer', date: 'round 2' }, ...TLOG] : TLOG;
          render({ role: 'controller', pi: 1, tac: [1, 1, 1, 1, 1] }, sc, log, t >= SAVE);
          cur.glide(keys, t);
        },
        manual() { cur.hide(); render(round, user.sc, user.log); },
      });
    },
    enter(s) { s._sc.start(); if (!s._sc.tour) s._rerender(); },
    leave(s) { s._sc.stop(); },
  });
})();
