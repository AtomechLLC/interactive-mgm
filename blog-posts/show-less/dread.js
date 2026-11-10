/* Show Less (replanned page for "Tension Curve"; Scripture: Danger, Curiosity vs Confusion, The Structure of Fun).
   A dark corridor with six growls. The learner chooses how many of them are followed by a real strike (none, one, three or
   all six) and walks it. The page records the learner's own hesitation (seconds stopped, hiding or backing up) in the six
   seconds after each growl, per setting. The walk-through's walker follows a written belief rule, not nerves. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, AX = 24, AY = 56, AW = 992, AH = 236, SP = 100, GROWL = [.12, .26, .42, .56, .72, .86], WARN = 1.7, WIN = 6;
  const SETS = [{ n: 0, name: 'Never', strikes: [] }, { n: 1, name: 'Once', strikes: [0] }, { n: 3, name: 'Three times', strikes: [0, 2, 4] }, { n: 6, name: 'Every time', strikes: [0, 1, 2, 3, 4, 5] }];
  const saved = {}; let API = null;
  function run(st, si) { const LEN = st.live ? 3000 : 1700; st.si = si; st.q = { si, x: 0, LEN, oil: st.live ? 58 : 99, hp: 3, t: 0, k: 0, hes: [0, 0, 0, 0, 0, 0], gT: [], hide: false, strike: null, belief: .5, hideFor: 0, hits: 0 }; st.ph = 'go'; }
  function end(st, how) { const q = st.q; q.how = how; q.total = q.hes.reduce((a, b) => a + b, 0); st.ph = 'done'; st.at = st.t; if (st.live) saved[q.si] = q; else st.tr[q.si] = q; }
  PLAY.game('dread', {
    dur: 62, keys: [' ', 'ArrowLeft', 'ArrowRight', 'a', 'd'],
    opts: s => ({ si: +(s.querySelector('.seg .on')?.dataset.v || 1) }),
    setup(s, api) { API = api; s.querySelectorAll('.seg button').forEach(b => b.onclick = () => { s.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { const st = { live, t: 0, tr: {}, ph: 'ready' }; run(st, live ? o.si : 1); if (live) st.ph = 'ready'; return st; },
    step(st, inp, dt) {
      st.t += dt; const q = st.q, d = inp.down || {};
      if (st.ph === 'ready') { if (inp.press[' '] || d.ArrowRight || d.d || inp.click) st.ph = 'go'; return; }
      if (st.ph === 'done') { if (st.live && inp.click === 'again') API.start(); if (!st.live && q.si === 1 && st.t - st.at > 2.2) run(st, 3); return; }
      q.t += dt; q.oil -= dt; q.hide = !!d[' '];
      const dir = q.hide ? 0 : (d.ArrowRight || d.d ? 1 : 0) - (d.ArrowLeft || d.a ? 1 : 0);
      if (q.knock > 0) { q.knock -= dt; q.x = Math.max(0, q.x - 420 * dt); } else q.x = clamp(q.x + dir * SP * dt, 0, q.LEN);
      q.dir = dir;
      if (q.k < 6 && q.x >= GROWL[q.k] * q.LEN) { const real = SETS[q.si].strikes.includes(q.k); q.gT[q.k] = q.t; q.growl = q.t; if (real) q.strike = { at: q.t + WARN, k: q.k }; else q.empty = { at: q.t + WARN, k: q.k }; q.k++; if (st.live) { PLAY.beep(70, .7, .25, 'sawtooth'); PLAY.beep(55, .9, .2, 'square'); } }
      q.gT.forEach((tg, k) => { if (q.t - tg < WIN && dir <= 0) q.hes[k] += dt; });
      if (q.strike && q.t >= q.strike.at) { q.rush = q.t; if (!q.hide) { q.hp--; q.hits++; q.knock = .35; q.hurt = q.t; if (st.live) PLAY.beep(120, .4, .3, 'sawtooth'); } q.belief = 1; q.strike = null; }
      if (q.empty && q.t >= q.empty.at) { q.belief = Math.max(0, q.belief - .25); q.empty = null; }
      if (q.hp <= 0) return end(st, 'taken'); if (q.oil <= 0) return end(st, 'dark'); if (q.x >= q.LEN) return end(st, 'out');
    },
    // a walker with a written belief: a strike sets it to 1, every empty growl takes a quarter off; it hides while belief is above 0.4
    bot(st) { const q = st.q; if (st.ph !== 'go') return null; const since = q.t - (q.growl != null ? q.growl : -99), scared = since < WARN + .5 && (q.beliefAt = since < .1 ? q.belief : q.beliefAt) > .4 && since > .3; return { down: scared ? { ' ': true } : { ArrowRight: true }, press: {} }; },
    draw(g, st, ui, live) {
      GK.panel(g); const q = st.q, S = SETS[q.si], cam = clamp(q.x - 300, 0, q.LEN - AW + 200), X = x => AX + x - cam, GY = AY + 176, px = X(q.x);
      GK.head(g, `The creature strikes: ${S.name.toLowerCase()}`, AX, 32, 'left', C.ink, 17);
      for (let i = 0; i < 3; i++) GK.text(g, '♥', AX + AW - 250 + i * 20, 34, i < q.hp ? C.red : '#d9cdb2', 18, 'center', 800);
      if (live) { GK.text(g, 'lantern oil', AX + AW - 170, 32, C.muted, 12, 'left', 700); PLAY.bar(g, AX + AW - 100, 22, 100, 12, q.oil / 58, q.oil < 12 ? C.red : C.gold); }
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#3a3340'; g.fillRect(AX, AY, AW, AH); g.fillStyle = '#4a4252'; g.fillRect(AX, GY + 22, AW, AH);
      for (let x = Math.floor(cam / 220) * 220; x < cam + AW + 220; x += 220) { g.fillStyle = '#2b2530'; g.fillRect(X(x), AY, 26, GY + 22 - AY); g.fillStyle = '#5a5162'; g.fillRect(X(x) + 70, AY + 50, 70, 90); }
      g.fillStyle = '#b8e6a0'; g.fillRect(X(q.LEN), AY + 40, 50, GY - AY - 18); GK.text(g, 'EXIT', X(q.LEN) + 25, AY + 32, '#b8e6a0', 13, 'center', 800);
      // the creature: eyes at the edge of the light on a growl, a rush across on a strike
      const sinceG = q.growl != null ? q.t - q.growl : 99;
      if (q.rush != null && q.t - q.rush < .45) { const rx = px + 500 - (q.t - q.rush) / .45 * 1100; g.fillStyle = '#0c0a10'; g.beginPath(); g.ellipse(rx, GY - 30, 90, 60, 0, 0, TAU); g.fill(); g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(rx - 40, GY - 44, 6, 0, TAU); g.arc(rx - 18, GY - 48, 6, 0, TAU); g.fill(); }
      TD.shadow(px, GY + 20, 18, 5); TD.player(px, GY - (q.hide ? -8 : 0), q.dir < 0 ? Math.PI : 0, q.hide ? .85 : 1.2, q.t - (q.hurt || -9) < .5 ? .5 : 1);
      // darkness with a hole for the lantern
      const rad = q.hide ? 46 : 170, dk = g.createRadialGradient(px, GY - 20, rad * .25, px, GY - 20, rad); dk.addColorStop(0, 'rgba(8,6,12,0)'); dk.addColorStop(1, 'rgba(8,6,12,.96)'); g.fillStyle = dk; g.fillRect(AX, AY, AW, AH);
      if (sinceG < 1.2) { const a = 1 - sinceG / 1.2, ex = px + 215; g.fillStyle = `rgba(255,59,48,${a})`; g.beginPath(); g.arc(ex, GY - 46, 4, 0, TAU); g.arc(ex + 16, GY - 48, 4, 0, TAU); g.fill(); GK.text(g, 'grrrrr…', ex + 8, GY - 70 - sinceG * 14, `rgba(255,220,210,${a})`, 16, 'center', 800); }
      if (q.t - (q.hurt || -9) < .3) { g.fillStyle = 'rgba(229,50,45,.35)'; g.fillRect(AX, AY, AW, AH); }
      if (q.hide) GK.text(g, 'hiding, lantern shuttered', px, GY - 60, 'rgba(255,255,255,.7)', 12, 'center', 700);
      g.restore();
      if (st.ph === 'ready') TD.stamp('Hold → to walk, hold Space to hide', AX + AW / 2, AY + 70, '#fff', 1, 20);
      if (st.ph === 'done') { TD.label(q.how === 'out' ? 'You reached the exit' : q.how === 'taken' ? 'It took you' : 'The lantern went out', AX + AW / 2, AY + 60, 'center', C.ink, 16); if (live) ui.btn('again', 'Walk this setting again', AX + AW / 2 - 120, AY + 90, 240, 40, { px: 14, on: true }); }
      const BY = AY + AH + 12; g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(AX, BY, AW, 8, 4); g.fill(); g.fillStyle = C.navy; g.beginPath(); g.roundRect(AX, BY, Math.max(8, AW * q.x / q.LEN), 8, 4); g.fill();
      // hesitation per growl, per setting
      const TY = BY + 40, store = live ? saved : st.tr; GK.text(g, `seconds not moving forward in the ${WIN} s after each growl`, AX, TY - 12, C.muted, 12, 'left', 700);
      SETS.forEach((s, i) => {
        const x = AX + i * 250, cur = i === q.si, r = cur && st.ph !== 'done' ? q : store[i]; GK.box(g, x, TY, 242, 198, cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : '#cdbf9f', 10, cur ? 2.5 : 1.5);
        GK.text(g, s.name, x + 12, TY + 22, C.ink, 14, 'left', 800); GK.text(g, s.n === 1 ? 'one strike, then silence' : `${s.n} of 6 growls are real`, x + 12, TY + 40, C.muted, 11, 'left', 600);
        if (!r) { GK.text(g, live ? 'not walked yet' : '', x + 121, TY + 116, C.muted, 12, 'center', 600); return; }
        for (let k = 0; k < 6; k++) { const bx = x + 20 + k * 36, h = Math.min(WIN, r.hes[k]) / WIN * 96, shown = r.gT[k] != null; g.fillStyle = '#e9dfc8'; g.fillRect(bx, TY + 56, 24, 96); if (shown) { g.fillStyle = C.purple; g.fillRect(bx, TY + 152 - h, 24, h); GK.text(g, r.hes[k].toFixed(1), bx + 12, TY + 148 - h, C.ink, 10, 'center', 700); } if ((r.how || !live) && s.strikes.includes(k) && shown) { g.fillStyle = C.red; g.beginPath(); g.arc(bx + 12, TY + 162, 4, 0, TAU); g.fill(); } }
        GK.text(g, r.how ? `${r.total.toFixed(1)} s in all · ${r.how === 'out' ? 'got out' : r.how === 'taken' ? 'taken' : 'oil ran out'}` : 'walking…', x + 12, TY + 186, C.ink, 12, 'left', 700);
      });
      GK.text(g, 'red dot = that growl was followed by a strike (shown after the walk)', AX + AW, TY - 12, C.muted, 11, 'right', 600);
      ui.stats(`<div><b>${q.k} of 6</b><span>growls heard</span></div><div><b>${q.hes.reduce((a, b) => a + b, 0).toFixed(1)} s</b><span>hesitating so far</span></div><div class="r"><b>${q.hits}</b><span>times it caught you</span></div>`);
      if (st.ph !== 'done') { ui.out(live ? 'Every setting has the same six growls. What changes is how many of them are followed by the creature. Hiding is safe, and the lantern oil keeps burning.' : 'A walker with a written belief: a strike sets it to full, each empty growl takes a quarter off, and it hides while belief is above 0.4. First one strike, then a strike every time.'); return; }
      const done = Object.values(store).filter(r => r.how), who = live ? 'You' : 'The walker';
      const emptyOf = r => { const e = [0, 1, 2, 3, 4, 5].filter(k => !SETS[r.si].strikes.includes(k) && r.gT[k] != null); return e.length ? e.reduce((a, k) => a + r.hes[k], 0) / e.length : null; }, eo = emptyOf(q);
      let s = `${who} hesitated ${q.total.toFixed(1)} s over ${q.gT.length} growls with “${S.name.toLowerCase()}”` + (eo != null ? `, and ${eo.toFixed(1)} s on average after the growls that had nothing behind them. ` : '. ');
      if (done.length > 1) { const top = done.reduce((a, b) => b.total > a.total ? b : a); s += `Across the settings walked so far (${done.map(r => `${SETS[r.si].name.toLowerCase()}: ${r.total.toFixed(1)} s`).join(', ')}), the most hesitation came with “${SETS[top.si].name.toLowerCase()}”. `; } else s += live ? 'Walk another setting to compare. ' : '';
      ui.out(s + (live ? 'Hesitation at an empty growl is dread: fear of a thing that is not there, paid for by the one time it was.' : 'The walker is arithmetic. Your own hesitations are the measurement.'));
    },
  });
})();
