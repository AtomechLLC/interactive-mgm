/* Interview rubric (bonus deck "Getting Hired as a Game Designer", slides 29-34 and 42-47).
   A printable card: the four things the interviewer cares about and the 4Cs, each with a "looks like" line and a
   1-4 score. Scores are kept with FPF.store ('iv-rubric'), which the practice card reads too. "Print the card" (or
   Ctrl+P) prints a clean paper copy built into #iv-print-root. The walk-through is a pure function of t. */
(function () {
  const { $, $$, demo } = FPF.kit, store = FPF.store, gi = IV.gi;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const R = IV.RUBRIC;
  const ICON = { explore: 'magnifying-glass', paths: 'split-arrows', costs: 'scales', collab: 'shaking-hands', critical: 'brain', comm: 'chat-bubble', creative: 'sparkles', consistent: 'cycle' };

  // paper copy
  const paper = document.createElement('div');
  paper.id = 'iv-print-root';
  const table = grp => `<table><tr><th>${grp === '4Cs' ? 'The 4Cs' : 'Question'}</th><th>Looks like</th><th>Score</th></tr>${R.filter(r => r.grp === grp).map(r => `<tr><td class="q">${esc(r.q)}</td><td>${esc(r.looks)}<span class="say">${esc(r.say)}</span></td><td class="s">☐☐☐☐</td></tr>`).join('')}</table>`;
  paper.innerHTML = `<h1>Interview rubric</h1><div class="meta"><span>Name:</span><span>Date:</span><span>Prompt:</span></div>
    <p>Score each row from 1 (not shown) to 4 (shown clearly, more than once). Total out of 32.</p>
    <h2>What the interviewer cares about</h2>${table('Interviewer')}<h2>What they screen for: the 4Cs</h2>${table('4Cs')}
    <div class="foot">Total: ______ / 32 &nbsp;·&nbsp; One thing to change next time: ____________________________________________</div>
    <div class="foot" style="margin-top:2mm">Directing Game Mechanics · Bonus: Getting Hired as a Game Designer.</div>`;
  document.body.appendChild(paper);

  demo('rubric', {
    init(s) {
      const board = $(s, '.rb-board'), rows = $(s, '.rb-rows'), sayT = $(s, '.rb-say-t'), stats = $(s, '.rb-stats'), out = $(s, '.rb-out');
      const row = r => `<div class="rb-row" data-k="${r.k}"><span class="iv-ico">${gi(ICON[r.k])}</span><span class="q">${esc(r.q)}</span><span class="lk">${esc(r.looks)}</span><span class="rb-sc">${[1, 2, 3, 4].map(n => `<button data-n="${n}">${n}</button>`).join('')}</span></div>`;
      rows.innerHTML = `<div class="rb-sec">${gi('public-speaker')} What the interviewer cares about</div>${R.filter(r => r.grp === 'Interviewer').map(row).join('')}
        <div class="rb-sec">${gi('archery-target')} What they screen for: the 4Cs</div>${R.filter(r => r.grp === '4Cs').map(row).join('')}`;
      const rEls = $$(rows, '.rb-row');
      const user = { sc: store.get('iv-rubric', {}), hl: -1 };
      const render = (sc, hl) => {
        rEls.forEach((el, i) => { el.classList.toggle('hl', i === hl); $$(el, 'button').forEach(b => b.classList.toggle('on', +b.dataset.n === sc[R[i].k])); });
        sayT.textContent = hl >= 0 ? R[hl].say : 'Pick a row to hear an example line.';
        const vals = R.map(r => sc[r.k] || 0), n = vals.filter(Boolean).length, tot = vals.reduce((a, b) => a + b, 0);
        stats.innerHTML = `<div class="${n === R.length ? 'g' : 'y'}"><b>${tot}/32</b><span>${n} of ${R.length} rows scored</span></div>`;
        const low = R.filter(r => sc[r.k] && sc[r.k] <= 2);
        out.innerHTML = hl >= 0 ? `<b>${esc(R[hl].q)}</b> ${esc(R[hl].looks)}` : low.length ? `Practise next: <b>${low.map(r => esc(r.q.replace(/\?$/, ''))).join('</b>, <b>')}</b>.` : 'Click a row to see what it sounds like. Click a number to score it.';
      };
      rEls.forEach((el, i) => {
        el.onclick = e => { const b = e.target.closest('button'); if (b) { const v = +b.dataset.n; user.sc[R[i].k] = user.sc[R[i].k] === v ? 0 : v; store.set('iv-rubric', user.sc); } user.hl = i; render(user.sc, user.hl); };
      });
      $(s, '.rb-print').onclick = () => window.print();
      $(s, '.rb-clear').onclick = () => { user.sc = {}; store.set('iv-rubric', user.sc); render(user.sc, user.hl); };
      const cur = IV.cursor(board);
      // walk-through: each row in turn lights up with its example line, and a sample self-score goes in
      const SAMPLE = [3, 2, 2, 4, 3, 3, 2, 3];
      const T0 = .6, STEP = 1.9, DUR = T0 + R.length * STEP + 1.4;
      const keys = R.flatMap((r, i) => [[T0 + i * STEP, rEls[i].querySelector('.q'), false], [T0 + i * STEP + 1, rEls[i].querySelectorAll('.rb-sc button')[SAMPLE[i] - 1]]]);
      s._sc = IV.scene(s, 'rubric', {
        dur: DUR,
        frame(t) {
          const i = t < T0 ? -1 : Math.min(R.length - 1, Math.floor((t - T0) / STEP));
          const sc = {}; R.forEach((r, j) => { if (t >= T0 + j * STEP + 1) sc[r.k] = SAMPLE[j]; });
          render(sc, t >= DUR - 1.2 ? -1 : i);
          cur.glide(keys, t);
        },
        manual() { cur.hide(); render(user.sc, user.hl); },
      });
    },
    enter(s) { s._sc.start(); },
    leave(s) { s._sc.stop(); },
  });
})();
