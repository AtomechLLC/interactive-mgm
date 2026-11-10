/* Build the Tool First? (replanned page for the Nightbane tools post; Scripture: Fast Playable Prototypes, Tool Matrix).
   Sixty seconds to fit a flight path (three coefficients) through three rings. A blind test costs 5 s; a live preview
   costs 20 s once. Costs are invented for a one-minute exercise. Rows are the learner's own runs. */
(function () {
  const C = TD.C, clamp = TD.clamp, BUDGET = 60, TEST = 5, BUILD = 20, TOL = 14;
  const AX = 20, AY = 46, AW = 640, AH = 330, Y0 = AY + 170, RING = [.3, .6, .9], NAMES = ['Climb', 'Bank', 'Dive'];
  const yAt = (p, x) => Y0 - 60 * ((p[0] - 10) * .5 * x + (p[1] - 10) * x * x + (p[2] - 10) * x * x * x);
  const err = (p, tg) => RING.map(x => Math.abs(yAt(p, x) - yAt(tg, x)));
  const runs = [];
  function target(R) { for (;;) { const t = [0, 0, 0].map(() => 5 + Math.floor(R() * 11)); if (RING.every(x => yAt(t, x) > AY + 40 && yAt(t, x) < AY + AH - 40) && Math.max(...err([10, 10, 10], t)) > 50) return t; } }
  const fresh = (live, R, useTool) => ({ live, R, t: 0, left: BUDGET, p: [10, 10, 10], tg: target(R), tool: false, lock: 0, lockWhy: '', tested: null, tests: 0, tries: 0, phase: live ? 'ready' : 'run', best: null, plan: useTool, rows: [], seg: 0, bot: { i: 0, dir: 1, wait: 0, base: null, ph: useTool ? 'build' : 'init' } });
  const score = e => ({ hit: e.filter(v => v <= TOL).length, mean: e.reduce((a, b) => a + b, 0) / 3, sq: e.reduce((a, b) => a + b * b, 0) });
  function evaluate(st) { st.tested = st.p.slice(); const s = score(err(st.p, st.tg)); if (!st.best || s.mean < st.best.mean) st.best = s; st.last = s; return s; }
  function tick(st, inp, dt) {
    if (st.left <= 0) return;
    st.left -= dt;
    if (st.lock > 0) { st.lock -= dt; if (st.lock <= 0) { if (st.lockWhy === 'build') st.tool = true; evaluate(st); } return; }
    let ch = false; [['q', 'a'], ['w', 's'], ['e', 'd']].forEach(([up, dn], i) => { const d = (inp.press[up] || inp.click === 'u' + i ? 1 : 0) - (inp.press[dn] || inp.click === 'd' + i ? 1 : 0); if (d) { st.p[i] = clamp(st.p[i] + d, 0, 20); ch = true; } });
    if (ch && st.tool) { st.tries++; evaluate(st); }
    if (!st.tool && (inp.press.t || inp.click === 'build')) { st.lock = BUILD; st.lockWhy = 'build'; st.lockT = BUILD; }
    else if (!st.tool && (inp.press[' '] || inp.click === 'test')) { st.lock = TEST; st.lockWhy = 'test'; st.lockT = TEST; st.tests++; st.tries++; }
  }
  function close(st) { const b = st.best || { hit: 0, mean: score(err([10, 10, 10], st.tg)).mean }; const r = { tool: st.tool || st.lockWhy === 'build', tests: st.tests, tries: st.tries, hit: b.hit, mean: b.mean }; (st.live ? runs : st.rows).push(r); st.result = r; st.phase = 'end'; st.at = st.t; }

  PLAY.game('tool', {
    dur: 46, keys: ['q', 'a', 'w', 's', 'e', 'd', ' ', 't'],
    init(o, live) { return fresh(live, live ? Math.random : GK.rng(9), false); },
    step(st, inp, dt) {
      st.t += dt;
      if (st.phase === 'ready') { if (Object.keys(inp.press).length || inp.click) st.phase = 'run'; else return; }
      if (st.phase === 'end') {
        if (!st.live && st.seg < 1 && st.t - st.at > 1.5) { const rows = st.rows, t = st.t; Object.assign(st, fresh(false, GK.rng(9), true), { rows, t, seg: 1 }); }
        else if (st.live && inp.click === 'again') { Object.assign(st, fresh(true, Math.random, false)); st.phase = 'run'; }
        return;
      }
      if (st.live) tick(st, inp, dt);
      else for (let k = 0; k < 3 && st.left > 0; k++) {
        // the scripted designer: change one number, look, keep it if the tested path got closer, else flip direction or move on
        const b = st.bot, i2 = { press: {}, click: null }, KEYS = [['q', 'a'], ['w', 's'], ['e', 'd']];
        if (st.lock <= 0) {
          if (b.wait > 0) b.wait -= dt;
          else if (b.ph === 'build') { i2.press.t = true; b.ph = 'init'; }
          else if (st.tool) {
            // with the preview a look is free, so it tries every setting one step away (26 of them) and takes the closest
            if (!b.c) { b.c = st.p.slice(); evaluate(st); b.bs = st.last.sq; b.bp = b.c.slice(); b.k = 0; }
            if (b.k < 27) { const o = [b.k % 3 - 1, Math.floor(b.k / 3) % 3 - 1, Math.floor(b.k / 9) - 1]; b.k++; if (o.some(v => v)) { st.p = b.c.map((v, i) => clamp(v + o[i], 0, 20)); st.tries++; evaluate(st); if (st.last.sq < b.bs) { b.bs = st.last.sq; b.bp = st.p.slice(); } b.wait = .12; } }
            else { st.p = b.bp.slice(); evaluate(st); if (b.bp.join() === b.c.join()) b.wait = 99; else b.c = null; }
          }
          else if (b.ph === 'init') { if (st.tool) { evaluate(st); b.base = st.last.sq; b.ph = 'move'; } else { i2.press[' '] = true; b.ph = 'init2'; } }
          else if (b.ph === 'init2') { b.base = st.last.sq; b.ph = 'move'; }
          else if (b.ph === 'move') { i2.press[KEYS[b.i][b.dir === 1 ? 0 : 1]] = true; if (st.tool) { b.ph = 'judge'; b.wait = .2; } else b.ph = 'test'; }
          else if (b.ph === 'test') { i2.press[' '] = true; b.ph = 'judge'; }
          else if (b.ph === 'judge') {
            if (st.last.sq < b.base) b.base = st.last.sq;
            else { st.p[b.i] = clamp(st.p[b.i] - b.dir, 0, 20); if (st.tool) evaluate(st); if (b.dir === 1) b.dir = -1; else { b.dir = 1; b.i = (b.i + 1) % 3; } }
            b.ph = 'move';
          }
        }
        tick(st, i2, dt);
      }
      if (st.left <= 0 && st.phase === 'run') close(st);
    },
    bot() { return null; },
    draw(g, st, ui, live) {
      GK.panel(g);
      const X = x => AX + 30 + x * (AW - 60), end = st.phase === 'end';
      GK.head(g, `${Math.max(0, st.left).toFixed(0)} s of budget left · ${st.tool ? 'live preview built' : 'slow editor'}`, AX, 30, 'left', C.ink, 17);
      PLAY.bar(g, AX + 420, 18, 220, 12, st.left / BUDGET, st.left > 15 ? C.blue : C.red);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#1b2350'; g.fillRect(AX, AY, AW, AH);
      g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 40; i++) g.fillRect(AX + (i * 173) % AW, AY + (i * 97) % AH, 2, 2);
      RING.forEach((x, i) => { const y = yAt(st.tg, x), e = st.tested ? Math.abs(yAt(st.tested, x) - y) : 99; g.strokeStyle = e <= TOL ? '#7dffa0' : '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.ellipse(X(x), y, 7, TOL + 6, 0, 0, TD.TAU); g.stroke(); GK.text(g, String(i + 1), X(x), y - TOL - 14, '#fff', 12, 'center', 700); });
      const shown = st.tool ? st.p : st.tested, flying = st.lock > 0 && st.lockWhy === 'test';
      if (shown && !flying) { g.strokeStyle = st.tool ? '#7ac8ff' : 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.setLineDash(st.tool ? [] : [8, 6]); g.beginPath(); for (let k = 0; k <= 60; k++) { const x = k / 60; k ? g.lineTo(X(x), yAt(shown, x)) : g.moveTo(X(x), yAt(shown, x)); } g.stroke(); g.setLineDash([]); }
      if (flying) { const u = clamp(1 - st.lock / st.lockT), u2 = clamp((u - .45) / .5), x = u2, y = yAt(st.p, x); g.strokeStyle = '#ff9d6b'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 60 * u2; k++) { const q = k / 60; k ? g.lineTo(X(q), yAt(st.p, q)) : g.moveTo(X(q), yAt(st.p, q)); } g.stroke(); g.fillStyle = '#e5322d'; g.beginPath(); g.moveTo(X(x) + 14, y); g.lineTo(X(x) - 10, y - 9); g.lineTo(X(x) - 4, y); g.lineTo(X(x) - 10, y + 9); g.closePath(); g.fill(); if (u < .45) TD.label('loading the test…', AX + AW / 2, AY + 30, 'center', C.ink, 13); }
      if (st.lock > 0 && st.lockWhy === 'build') { TD.label(`building the live preview… ${st.lock.toFixed(0)} s`, AX + AW / 2, AY + AH / 2, 'center', C.ink, 16); }
      g.restore();
      if (st.phase === 'ready') TD.stamp('Change a number to start the clock', AX + AW / 2, AY + 60, '#fff', 1, 20);
      // the three numbers and the two buttons
      const PY = AY + AH + 20;
      NAMES.forEach((n, i) => {
        const x = AX + i * 150; GK.text(g, n, x, PY + 14, C.muted, 12, 'left', 700); GK.text(g, String(st.p[i] - 10), x + 60, PY + 52, C.ink, 26, 'center', 800);
        ui.btn('d' + i, '−', x, PY + 24, 34, 40, { px: 20 }); ui.btn('u' + i, '+', x + 90, PY + 24, 34, 40, { px: 20 });
        GK.text(g, 'QWE'[i] + ' up · ' + 'ASD'[i] + ' down', x + 62, PY + 82, C.muted, 10, 'center', 600);
      });
      if (!st.tool && !end) { ui.btn('test', `Test flight (${TEST} s)`, AX + 462, PY + 8, 178, 36, { px: 13 }); ui.btn('build', `Build live preview (${BUILD} s)`, AX + 462, PY + 52, 178, 36, { px: 12 }); }
      const L = st.last; if (L) GK.text(g, `last ${st.tool ? 'preview' : 'test'}: ${L.hit} of 3 rings, ${L.mean.toFixed(0)} px off on average`, AX, PY + 108, C.ink, 13, 'left', 700);
      if (end && live) ui.btn('again', 'New rings, tune again', AX + 440, PY + 86, 200, 36, { px: 13 });
      // the runs
      const RX = 690, src = live ? runs : st.rows, list = src.slice(-7);
      GK.head(g, live ? 'Your runs' : 'A scripted designer\'s runs', RX, 30, 'left', C.ink, 17);
      ['tool', 'settings looked at', 'rings', 'avg miss'].forEach((h, i) => GK.text(g, h, RX + [0, 66, 200, 256][i], 60, C.muted, 11, 'left', 700));
      list.forEach((r, i) => { const y = 88 + i * 34; GK.text(g, r.tool ? 'built' : 'none', RX, y, r.tool ? C.blue : C.ink, 13, 'left', 800); GK.text(g, `${r.tries}${r.tool ? '' : ' (' + r.tests * TEST + ' s of tests)'}`, RX + 66, y, C.ink, 13, 'left', 700); GK.text(g, `${r.hit}/3`, RX + 200, y, r.hit === 3 ? C.good : C.ink, 14, 'left', 800); GK.text(g, r.mean.toFixed(0) + ' px', RX + 256, y, C.ink, 13, 'left', 700); });
      if (!list.length) PLAY.note(g, live ? 'Finish a run to log it. Try one run each way.' : 'First run: no tool. Second run: the same rings, tool first.', RX, 86, 320);
      PLAY.note(g, `The tool costs ${BUILD} s, which is ${BUILD / TEST} test flights. It pays for itself once you would have needed more than ${BUILD / TEST} more looks at the path.`, RX, 360, 320);
      // side panel
      ui.stats(`<div><b>${st.tries}</b><span>settings looked at this run</span></div><div class="g"><b>${st.best ? st.best.hit : 0}/3</b><span>rings at your best setting</span></div><div class="r"><b>${st.tool ? BUILD : st.tests * TEST} s</b><span>of the budget spent ${st.tool ? 'building' : 'waiting on tests'}</span></div>`);
      const wt = src.filter(r => r.tool), nt = src.filter(r => !r.tool), avg = (L, f) => (L.reduce((a, r) => a + f(r), 0) / L.length);
      const who = live ? 'you' : 'the scripted designer';
      ui.out(!wt.length || !nt.length ? (live ? (src.length ? 'Now try a run the other way: ' + (wt.length ? 'no tool, tests only.' : 'press T first.') : 'Sixty seconds. Decide early: the tool is worth less with every second you wait.') : 'Without the tool, each look at the path costs five seconds, so sixty seconds buys twelve looks at most.')
        : `Without the tool ${who} looked at ${avg(nt, r => r.tries).toFixed(0)} settings a run and averaged ${avg(nt, r => r.hit).toFixed(1)} rings; with it, ${avg(wt, r => r.tries).toFixed(0)} settings and ${avg(wt, r => r.hit).toFixed(1)} rings. The tool took a third of the budget before any tuning happened. It wins when the work needs many more looks than the build costs, and loses on a job you could have finished in four tests.`);
    },
  });
})();
