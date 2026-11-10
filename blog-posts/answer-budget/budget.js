/* Answer Budget (replanned page for "Give Players a Response"; Scripture: Categorizing Responses, Decision Intervals,
   Working Memory Limits). The learner picks three boss mechanics, each tagged react, prepare or recuperate, then plays the
   healer. One key per mechanic and a shared 0.4 s cooldown. The page records every window, press and miss on a timeline
   and counts the seconds with nothing to answer. The walk-through's healer is a script with a written reaction time. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, GCD = .4;
  const TYPE = { react: { n: 'React', col: '#e5322d', tip: 'No warning. One press inside 0.85 s.' }, prepare: { n: 'Prepare', col: '#3b6fd4', tip: 'Seen 7 s ahead. One press any time before it lands.' }, recup: { n: 'Recuperate', col: '#2fae63', tip: 'After the hit lands: four presses inside 4 s.' } };
  const DECK = [['Raid-wide blast', 'react'], ['Tank buster', 'react'], ['Sudden curse', 'react'], ['Marked for fire', 'prepare'], ['Stack marker', 'prepare'], ['Countdown doom', 'prepare'], ['Bleed', 'recup'], ['Aftershock', 'recup'], ['Life drain', 'recup']];
  const fights = [], TOURPICK = [[0, 1, 2], [0, 3, 6]];
  function schedule(card, F) {
    const [, ty] = DECK[card], j = card % 3, out = [];
    if (ty === 'react') for (let t = 4 + j * .12; t < F - 1; t += 5.5) out.push({ open: t, close: t + .85, need: 1, show: t });
    if (ty === 'prepare') for (let t = 10 - j * .6; t <= F; t += 10) out.push({ open: t - 7, close: t, need: 1, show: t - 7 });
    if (ty === 'recup') for (let t = 5 + j * 1.2; t < F - 4; t += 9) out.push({ open: t, close: t + 4, need: 4, show: t });
    return out.map(d => Object.assign(d, { got: 0, done: null }));
  }
  function startFight(st) { st.F = st.live ? 30 : 22; st.f = { pick: st.pick.slice(), t: 0, gcd: 0, lanes: st.pick.map(c => ({ card: c, dem: schedule(c, st.F), presses: [] })), idle: 0, peak: 0, empty: 0 }; st.phase = 'fight'; }
  function endFight(st) { const f = st.f, all = f.lanes.flatMap(l => l.dem); f.total = all.length; f.met = all.filter(d => d.done === true).length; f.missed = f.total - f.met; st.phase = 'done'; st.at = st.t; (st.live ? fights : st.tf).push(f); if (st.live && fights.length > 3) fights.shift(); }
  PLAY.game('budget', {
    dur: 54, keys: ['1', '2', '3'], clickStarts: true,
    init(o, live) { return { live, t: 0, pick: [], phase: 'pick', tf: [], think: 0 }; },
    step(st, inp, dt) {
      st.t += dt; st.think += dt; const k = inp.click;
      if (st.phase === 'pick') { if (typeof k === 'number') { const i = st.pick.indexOf(k); if (i >= 0) st.pick.splice(i, 1); else if (st.pick.length < 3) st.pick.push(k); st.think = 0; } if (k === 'go' && st.pick.length === 3) startFight(st); return; }
      if (st.phase === 'done') { if (k === 'again') { st.phase = 'pick'; st.think = 0; if (!st.live) st.pick = []; } return; }
      const f = st.f; f.t += dt; f.gcd = Math.max(0, f.gcd - dt);
      let open = 0;
      f.lanes.forEach((l, i) => {
        l.dem.forEach(d => { if (d.done == null && f.t >= d.close) { d.done = false; l.missT = f.t; if (st.live) PLAY.beep(150, .15, .14, 'sawtooth'); } if (d.done == null && f.t >= d.open) open++; });
        const want = inp.press[String(i + 1)] || k === 'k' + i || inp.key === i;
        if (want && f.gcd <= 0) { f.gcd = GCD; l.presses.push(f.t); const d = l.dem.find(d => d.done == null && f.t >= d.open); if (d) { d.got++; if (d.got >= d.need) { d.done = true; d.at = f.t; } if (st.live) PLAY.beep(700 + i * 150, .05, .1); } else f.empty++; }
      });
      if (!open) f.idle += dt; f.peak = Math.max(f.peak, open);
      if (f.t >= st.F) endFight(st);
    },
    // a scripted healer: notices a window 0.3 s after it opens and answers the one that closes soonest
    bot(st) {
      const P = o => Object.assign({ down: {}, press: {} }, o);
      if (st.phase === 'pick') { if (st.think < .5) return null; const want = TOURPICK[Math.min(1, st.tf.length)], nx = want.find(c => !st.pick.includes(c)); st.think = .25; return P({ click: nx != null ? nx : 'go' }); }
      if (st.phase === 'done') return st.tf.length < 2 && st.t - st.at > 2.5 ? P({ click: 'again' }) : null;
      const f = st.f; if (f.gcd > 0) return null; let best = null;
      f.lanes.forEach((l, i) => l.dem.forEach(d => { if (d.done == null && f.t >= d.open + (d.need === 1 && d.close - d.open > 2 ? 1 : .3) && (!best || d.close < best.d.close)) best = { d, i }; }));
      return best ? P({ key: best.i }) : null;
    },
    draw(g, st, ui, live) {
      GK.panel(g); const X0 = 24;
      const tag = (ty, x, y) => { g.fillStyle = TYPE[ty].col; g.beginPath(); g.roundRect(x, y, 78, 16, 8); g.fill(); GK.text(g, TYPE[ty].n, x + 39, y + 12, '#fff', 10, 'center', 800); };
      const strip = (f, x, y, w, h, F, upto) => {
        f.lanes.forEach((l, i) => { const yy = y + i * (h + 6), ty = DECK[l.card][1]; g.fillStyle = '#f3ecd9'; g.fillRect(x, yy, w, h);
          l.dem.forEach(d => { if (d.show > upto) return; const x0 = x + d.open / F * w, x1 = x + Math.min(d.close, F) / F * w; g.fillStyle = d.done === true ? 'rgba(47,174,99,.55)' : d.done === false ? 'rgba(229,50,45,.7)' : 'rgba(245,176,65,.55)'; g.fillRect(x0, yy, Math.max(3, x1 - x0), h); });
          l.presses.forEach(t => { g.fillStyle = C.ink; g.fillRect(x + t / F * w - 1, yy + 2, 2, h - 4); }); g.fillStyle = TYPE[ty].col; g.fillRect(x - 5, yy, 3, h); });
      };
      if (st.phase === 'pick') {
        GK.head(g, `Pick three mechanics for the boss (${st.pick.length} of 3)`, X0, 32, 'left', C.ink, 17);
        DECK.forEach(([n, ty], i) => { const x = X0 + (i % 3) * 196, y = 50 + (i / 3 | 0) * 82, on = st.pick.includes(i); GK.box(g, x, y, 188, 74, on ? '#fff3cf' : '#fffaf0', on ? C.navy : '#cdbf9f', 10, on ? 3 : 1.5); GK.text(g, n, x + 12, y + 24, C.ink, 14, 'left', 800); tag(ty, x + 12, y + 32); if (on) GK.text(g, `key ${st.pick.indexOf(i) + 1}`, x + 176, y + 24, C.navy, 12, 'right', 800); GK.wrap(g, TYPE[ty].tip, x + 12, y + 62, 170, 13, C.muted, 10, 500); ui.hit(i, x, y, 188, 74); });
        if (st.pick.length === 3 && live) ui.btn('go', 'Pull the boss', X0 + 190, 306, 200, 42, { px: 14, on: true });
        GK.wrap(g, 'You are the healer. Each mechanic gets a key: 1, 2 and 3. Any press starts a 0.4 s cooldown shared by all three keys, so two answers can never land at once.', X0, 372, 580, 19, C.ink, 13, 600);
      } else {
        const f = st.f, F = st.F, done = st.phase === 'done';
        GK.head(g, done ? 'Fight over' : `Boss fight · ${Math.max(0, F - f.t).toFixed(0)} s left`, X0, 32, 'left', C.ink, 17);
        f.lanes.forEach((l, i) => {
          const y = 50 + i * 100, [n, ty] = DECK[l.card], cur = l.dem.find(d => d.done == null && f.t >= d.open), nextP = l.dem.find(d => d.done == null);
          GK.box(g, X0, y, 580, 90, cur ? '#fff3cf' : '#fffaf0', cur ? TYPE[ty].col : '#cdbf9f', 10, cur ? 3 : 1.5);
          if (live && !done) ui.hit('k' + i, X0, y, 580, 90);
          g.fillStyle = cur ? TYPE[ty].col : '#d9cdb2'; g.beginPath(); g.arc(X0 + 46, y + 45, 30, 0, TAU); g.fill(); GK.text(g, String(i + 1), X0 + 46, y + 55, '#fff', 28, 'center', 800);
          if (cur) { g.strokeStyle = C.ink; g.lineWidth = 5; g.beginPath(); g.arc(X0 + 46, y + 45, 34, -Math.PI / 2, -Math.PI / 2 + TAU * clamp((cur.close - f.t) / (cur.close - cur.open))); g.stroke(); }
          GK.text(g, n, X0 + 96, y + 30, C.ink, 15, 'left', 800); tag(ty, X0 + 96, y + 38);
          GK.text(g, cur ? (cur.need > 1 ? `press ${i + 1}: ${cur.got} of ${cur.need}` : `press ${i + 1} now · ${(cur.close - f.t).toFixed(1)} s`) : (!done && ty === 'prepare' && nextP ? `next in ${(nextP.open - f.t).toFixed(1)} s` : (done ? '' : 'quiet')), X0 + 96, y + 74, cur ? C.ink : C.muted, 13, 'left', 700);
          if (l.missT && f.t - l.missT < .8 && !done) TD.label('missed', X0 + 300, y + 30, 'center', '#fff', 13, 'rgba(183,28,28,.95)');
          // the next eight seconds
          const sx = X0 + 330, sw = 236; g.fillStyle = '#f3ecd9'; g.fillRect(sx, y + 52, sw, 22);
          l.dem.forEach(d => { const a = (d.open - f.t) / 8, b = (d.close - f.t) / 8; if (b < 0 || a > 1 || d.done != null || (ty !== 'prepare' && f.t < d.open)) return; g.fillStyle = TYPE[ty].col; g.globalAlpha = .6; g.fillRect(sx + clamp(a) * sw, y + 52, (clamp(b) - clamp(a)) * sw, 22); g.globalAlpha = 1; });
          GK.text(g, 'now', sx, y + 48, C.muted, 10, 'left', 600); GK.text(g, '+8 s', sx + sw, y + 48, C.muted, 10, 'right', 600);
        });
        GK.text(g, 'shared cooldown', X0, 366, C.muted, 11, 'left', 700); PLAY.bar(g, X0 + 104, 357, 160, 10, 1 - f.gcd / GCD, f.gcd > 0 ? C.gold : C.good);
        if (done && live) ui.btn('again', 'Pick three again', X0 + 380, 348, 200, 38, { px: 13, on: true });
        GK.text(g, 'this fight: windows (green answered, red missed), your presses, and the gaps', X0, 404, C.muted, 12, 'left', 700);
        strip(f, X0 + 8, 414, 572, 22, F, f.t);
        // idle shading
        GK.text(g, `${f.idle.toFixed(1)} s with nothing to answer · most windows open at once: ${f.peak}`, X0, 512, C.ink, 13, 'left', 700);
      }
      // past fights
      const RX = 640, RW = 376, list = (live ? fights : st.tf).slice(-3);
      GK.text(g, 'your fights', RX, 32, C.muted, 12, 'left', 700);
      list.forEach((f, k) => { const y = 46 + k * 172; GK.box(g, RX, y, RW, 160, '#fffaf0', '#cdbf9f', 10, 1.5); f.pick.forEach((c, i) => tag(DECK[c][1], RX + 14 + i * 84, y + 12)); strip(f, RX + 18, y + 40, RW - 34, 14, f.lanes[0] ? Math.max(22, f.t) : 30, 99);
        [['missed', `${f.missed} of ${f.total}`, C.redDk], ['idle seconds', f.idle.toFixed(1), C.navy], ['most at once', f.peak, C.ink]].forEach(([l, v, col], i) => { GK.text(g, String(v), RX + 18 + i * 120, y + 126, col, 20, 'left', 800); GK.text(g, l, RX + 18 + i * 120, y + 144, C.muted, 11, 'left', 600); }); });
      if (!list.length) GK.wrap(g, 'Each fight you finish is kept here, up to three, so you can compare mixes.', RX + 14, 76, RW - 28, 20, C.muted, 14, 500);
      const f = st.f;
      ui.stats(st.phase === 'pick' ? `<div><b>${st.pick.length} of 3</b><span>mechanics picked</span></div>` : `<div class="g"><b>${f.lanes.flatMap(l => l.dem).filter(d => d.done === true).length}</b><span>windows answered</span></div><div class="r"><b>${f.lanes.flatMap(l => l.dem).filter(d => d.done === false).length}</b><span>missed</span></div><div><b>${f.idle.toFixed(0)} s</b><span>with nothing to answer</span></div>`);
      if (st.phase !== 'done') { ui.out(st.phase === 'pick' ? (live ? 'Three of one kind, or a mix? Pick, then play it.' : 'First three react mechanics. Then one of each kind. The healer is a script that notices a window 0.3 s after it opens.') : 'Press the key for whichever lane lights up. The ring is the time left.'); return; }
      const kinds = f.pick.map(c => DECK[c][1]), same = kinds.every(k => k === kinds[0]), who = live ? 'You' : 'The script', prev = list.length > 1 ? list[list.length - 2] : null;
      ui.out(`${who} missed ${f.missed} of ${f.total} windows, had ${f.idle.toFixed(1)} s of the ${st.F} with nothing to answer, and at worst faced ${f.peak} open windows at once. ` + (same ? (kinds[0] === 'react' ? 'Three react mechanics land in the same second, and the shared cooldown cannot answer them all in time. ' : kinds[0] === 'prepare' ? 'Three prepare mechanics can all be answered early, which leaves long stretches of waiting. ' : 'Three recuperate mechanics ask for twelve presses in overlapping windows after each hit. ') : 'A mix puts the asks at different moments. ') + (prev ? `The fight before: ${prev.missed} missed, ${prev.idle.toFixed(1)} s idle. ` : '') + 'The type of response decides when the load arrives, so a fight is budgeted across types, not only by count.');
    },
  });
})();
