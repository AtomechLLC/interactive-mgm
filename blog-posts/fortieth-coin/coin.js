/* The 40th Coin (replanned page for "Ennui: Repetition and Dissatisfaction"; Scripture: Pattern-Breakers, Contrast Drives Attention).
   Forty coins, three variant cards the learner places before the run. The chart is the learner's own reaction time per coin.
   Nothing is modelled: if their times do not drift, the page says so. The walk-through's clicks are scripted and flat. */
(function () {
  const C = TD.C, TAU = TD.TAU, N = 40, AX = 20, AY = 46, AW = 1000, AH = 250, DIST = 210;
  const VAR = [{ id: 'sound', n: 'new sound', col: C.purple }, { id: 'colour', n: 'rare colour', col: C.blue }, { id: 'big', n: 'bigger payout', col: C.good }];
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, ms = v => Math.round(v * 1000) + ' ms';
  const SX = i => AX + 12 + i * 24.6, SY = AY + AH + 34;
  function spawn(st) {
    const [mx, my] = st.mouse; let x, y, k = 0;
    do { const a = st.R() * TAU; x = mx + Math.cos(a) * DIST; y = my + Math.sin(a) * DIST; } while (++k < 60 && (x < AX + 50 || x > AX + AW - 50 || y < AY + 40 || y > AY + AH - 40));
    if (k >= 60) { x = AX + AW / 2; y = AY + AH / 2; }
    st.coin = { x, y, at: st.t }; const v = st.plan[st.i];
    if (st.live) PLAY.beep(v === 'sound' ? 1320 : 880, v === 'sound' ? .3 : .08, .14, v === 'sound' ? 'triangle' : 'square');
  }

  PLAY.game('coin', {
    dur: 50, keys: [' '],
    init(o, live) {
      const plan = {}; if (!live) { plan[8] = 'sound'; plan[20] = 'colour'; plan[32] = 'big'; }
      return { live, R: live ? Math.random : GK.rng(9), phase: live ? 'plan' : 'run', plan, t: 0, i: 0, rt: [], coin: null, next: .8, mouse: [AX + AW / 2, AY + AH / 2], score: 0, fx: [] };
    },
    step(st, inp, dt) {
      st.t += dt; if (st.live && inp.mouse) st.mouse = inp.mouse;
      if (st.phase === 'plan') {
        if (typeof inp.click === 'number') {
          if (st.plan[inp.click]) delete st.plan[inp.click];
          else { const free = VAR.find(v => !Object.values(st.plan).includes(v.id)); if (free) st.plan[inp.click] = free.id; }
        }
        if (inp.click === 'go' || inp.press[' ']) { st.phase = 'run'; st.next = st.t + .9; }
        return;
      }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true)); return; }
      if (!st.coin && st.t >= st.next) spawn(st);
      if (st.coin && inp.click && (inp.click === 'coin' || Math.hypot(st.mouse[0] - st.coin.x, st.mouse[1] - st.coin.y) < 36)) {
        const v = st.plan[st.i]; st.rt.push(st.t - st.coin.at); st.score += v === 'big' ? 10 : 1;
        st.fx.push({ x: st.coin.x, y: st.coin.y, t: st.t, v }); if (!st.live) st.mouse = [st.coin.x, st.coin.y];
        if (st.live) PLAY.beep(v === 'big' ? 1560 : 1180, .1, .12, 'sine');
        st.coin = null; st.i++; st.next = st.t + .35 + st.R() * .5;
        if (st.i >= N) st.phase = 'end';
      }
    },
    // a scripted hand: the same reaction every time plus a little seeded noise. It is flat on purpose.
    bot(st) { if (!st.coin) return null; if (st.coin.due == null) st.coin.due = .42 + st.R() * .12; return st.t - st.coin.at >= st.coin.due ? { down: {}, press: {}, click: 'coin' } : null; },
    draw(g, st, ui, live) {
      GK.panel(g);
      const end = st.phase === 'end', plan = st.phase === 'plan', placed = Object.keys(st.plan).length;
      GK.head(g, plan ? `Place your three variants (${placed} of 3 placed)` : end ? 'Forty coins' : `Coin ${Math.min(N, st.i + 1)} of ${N}`, AX, 30, 'left', C.ink, 17);
      GK.text(g, `payout ${st.score}`, AX + AW, 30, C.muted, 14, 'right', 700);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#1b2350'; g.fillRect(AX, AY, AW, AH);
      if (st.coin) {
        const v = st.plan[st.i], r = v === 'big' ? 34 : 22, k = TD.clamp((st.t - st.coin.at) / .12);
        g.fillStyle = v === 'colour' ? '#4fc3f7' : '#ffd23f'; g.strokeStyle = v === 'colour' ? '#0b6fa8' : '#b8860b'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(st.coin.x, st.coin.y, r * k, r * k, 0, 0, TAU); g.fill(); g.stroke();
        GK.text(g, v === 'big' ? '10' : '1', st.coin.x, st.coin.y + 6, v === 'colour' ? '#0b3d5c' : '#7a5a00', v === 'big' ? 20 : 15, 'center', 800);
      }
      st.fx.forEach(f => { const a = 1 - (st.t - f.t) / .5; if (a > 0) TD.popText(f.v === 'big' ? '+10' : '+1', f.x, f.y - 20 - 30 * (1 - a), '#ffe9a3', a); });
      if (!live && !end) { g.fillStyle = '#fff'; g.beginPath(); g.arc(st.mouse[0], st.mouse[1], 5, 0, TAU); g.fill(); }
      g.restore();
      if (plan) { TD.stamp('Click three slots below, then start', AX + AW / 2, AY + 80, '#fff', 1, 20); ui.btn('go', placed ? 'Start the run (Space)' : 'Start with no variants (Space)', AX + AW / 2 - 150, AY + 130, 300, 50, { px: 15 }); }
      // the strip of forty
      for (let i = 0; i < N; i++) {
        const v = VAR.find(q => q.id === st.plan[i]), x = SX(i);
        g.fillStyle = v ? v.col : i < st.i ? '#e9c95a' : '#e3d8bf'; g.beginPath(); g.arc(x, SY, v ? 11 : 8, 0, TAU); g.fill();
        if (i === st.i && st.phase === 'run') { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(x, SY, 14, 0, TAU); g.stroke(); }
        if (i % 5 === 4 || i === 0) GK.text(g, String(i + 1), x, SY + 26, C.muted, 10, 'center', 600);
        if (plan) ui.hit(i, x - 12, SY - 16, 24.6, 32);
      }
      VAR.forEach((v, i) => { g.fillStyle = v.col; g.beginPath(); g.arc(AX + 10 + i * 140, SY + 48, 6, 0, TAU); g.fill(); GK.text(g, v.n, AX + 22 + i * 140, SY + 52, C.ink, 12, 'left', 600); });
      // the chart: your reaction time per coin
      const CX = AX + 44, CY = SY + 88, CW = AW - 60, CH = 138, top = Math.max(1, Math.ceil(Math.max(...st.rt, 0) * 5) / 5);
      const ax = GK.axes(g, CX, CY, CW, CH, { x0: .5, x1: N + .5, y0: 0, y1: top, xt: [1, 5, 10, 15, 20, 25, 30, 35, 40], yt: [0, top / 2, top], fmtY: v => v.toFixed(1) + ' s' });
      GK.text(g, live ? 'your reaction time per coin' : 'a scripted hand\'s reaction time per coin', CX, CY - 8, C.muted, 12, 'left', 700);
      Object.keys(st.plan).forEach(i => { const v = VAR.find(q => q.id === st.plan[i]); g.strokeStyle = v.col; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(ax.sx(+i + 1), CY); g.lineTo(ax.sx(+i + 1), CY + CH); g.stroke(); g.setLineDash([]); });
      const avg = st.rt.map((_, i) => mean(st.rt.slice(Math.max(0, i - 4), i + 1)));
      if (avg.length > 1) GK.line(g, avg.map((v, i) => [ax.sx(i + 1), ax.sy(v)]), C.navy, 2.5);
      st.rt.forEach((v, i) => { const q = VAR.find(z => z.id === st.plan[i]); g.fillStyle = q ? q.col : 'rgba(27,35,80,.45)'; g.beginPath(); g.arc(ax.sx(i + 1), ax.sy(Math.min(top, v)), q ? 6 : 4, 0, TAU); g.fill(); });
      if (st.rt.length > 5) GK.text(g, 'line: average of the last five', CX + CW, CY - 8, C.navy, 11, 'right', 600);
      if (end && live) ui.btn('again', 'Plan another run', AX + AW / 2 - 110, AY + 100, 220, 48, { px: 15 });
      // side panel
      const first = mean(st.rt.slice(0, 10)), last = mean(st.rt.slice(-10)), ks = Object.keys(st.plan).map(Number).filter(i => i < st.rt.length && i >= 3);
      const before = mean(ks.flatMap(i => st.rt.slice(i - 3, i))), after = mean(ks.flatMap(i => st.rt.slice(i + 1, i + 4)));
      ui.stats(`<div><b>${st.rt.length >= 10 ? ms(first) : '–'}</b><span>average, coins 1 to 10</span></div><div class="${end && last > first * 1.05 ? 'r' : ''}"><b>${end ? ms(last) : '–'}</b><span>average, coins 31 to 40</span></div><div class="g"><b>${end && ks.length && after ? ms(after - before).replace(/^(\d)/, '+$1') : '–'}</b><span>three coins after a variant against three before</span></div>`);
      const drift = last - first, who = live ? 'Your' : 'The scripted';
      ui.out(plan ? 'Spend all three early and the back half is forty-odd identical clicks; hold them all for the end and the first thirty drag. Where does a change do the most?'
        : !end ? (live ? 'Click each coin as it appears.' : 'The scripted hand reacts the same way every time, so its line is flat. A person\'s rarely is: play a run and look at yours.')
        : !live ? 'Flat, because the script does not get bored. Run it yourself: the variants are the only thing in forty coins that is not the coin before it.'
        : `${who} last ten coins averaged ${ms(last)} against ${ms(first)} for the first ten: ${Math.abs(drift) < first * .05 ? 'no real drift in this run' : drift > 0 ? 'slower as the coin repeated' : 'faster with practice, which is the other thing repetition does'}. ${ks.length ? `Around your variants the next three coins were ${ms(Math.abs(after - before))} ${after < before ? 'quicker' : 'slower'} than the three before.` : 'You placed no variants, so nothing broke the pattern.'} The reward never changed value; only contrast gives a designer a way to make coin 40 land like coin 1, and there are never enough variants to put one everywhere.`);
    },
  });
})();
