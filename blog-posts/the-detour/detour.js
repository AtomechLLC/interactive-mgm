/* The Detour (replanned page for "Make It Fit Your Game"; Scripture: Relevancy and Skill Dissonance, Skill Spectrum and Audience).
   A sprint with a fishing hole, run three ways: forced, optional, optional with a time bonus. The page records whether the
   learner fished, how long they stayed and their own rating of each run. The walk-through's ratings are a script's. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp;
  const AX = 20, AY = 46, AW = 1000, AH = 250, LEN = 2400, SP = 240, POND = 1300, HURD = [320, 560, 800, 1040, 1640, 1860, 2080], BONUS = 4, NEED = 3;
  const VER = [{ id: 'forced', n: 'Forced', tip: 'The gate opens after three fish.' }, { id: 'opt', n: 'Optional', tip: 'F to fish, or run past.' }, { id: 'reward', n: 'Optional, with a bonus', tip: `F to fish. Each fish takes ${BONUS} s off your time.` }];
  const FACES = ['annoyed', 'fine', 'delighted'];
  const table = [];
  const lap = () => ({ x: 0, t: 0, air: -9, stun: 0, mode: 'run', fish: 0, pondT: 0, fished: false, wait: 0, dip: -9, stumbles: 0, offered: false });
  function nextDip(st) { st.r.wait = 1.4 + st.R() * 2.4; st.r.dip = -9; }

  PLAY.game('detour', {
    dur: 60, keys: [' ', 'f', '1', '2', '3'],
    init(o, live) { return { live, R: live ? Math.random : GK.rng(5), t: 0, v: 0, r: lap(), phase: live ? 'ready' : 'go', rows: [], at: 0 }; },
    step(st, inp, dt) {
      st.t += dt; const r = st.r, ver = VER[st.v];
      if (st.phase === 'ready') { if (inp.press[' '] || inp.click) st.phase = 'go'; return; }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true), { phase: 'go' }); return; }
      if (st.phase === 'rate') {
        const k = inp.press['1'] || inp.click === 'r0' ? 0 : inp.press['2'] || inp.click === 'r1' ? 1 : inp.press['3'] || inp.click === 'r2' ? 2 : null;
        if (k == null || st.t - st.at < .4) return;
        const row = { v: ver.n, fished: r.fished, pond: r.pondT, fish: r.fish, time: r.t - (ver.id === 'reward' ? r.fish * BONUS : 0), raw: r.t, rate: k, hit: r.stumbles };
        st.rows.push(row); if (st.live) table[st.v] = row;
        if (st.v < 2) { st.v++; st.r = lap(); st.phase = 'go'; } else st.phase = 'end';
        return;
      }
      r.t += dt;
      if (r.mode === 'fish') {
        r.pondT += dt;
        if ((inp.press.f || inp.click === 'leave') && ver.id !== 'forced') { r.mode = 'run'; return; }
        if (r.dip < 0) { r.wait -= dt; if (r.wait <= 0) { r.dip = st.t; if (st.live) PLAY.beep(980, .08, .12); } if (inp.press[' ']) { nextDip(st); r.early = st.t; } }
        else if (inp.press[' ']) { r.fish++; r.got = st.t; if (st.live) PLAY.beep(1300, .15, .15); nextDip(st); if (r.fish >= NEED) r.mode = 'run'; }
        else if (st.t - r.dip > .7) nextDip(st);
        return;
      }
      if (r.stun > 0) { r.stun -= dt; return; }
      if (inp.press[' '] && st.t - r.air > .5) { r.air = st.t; if (st.live) PLAY.beep(600, .06, .1, 'square'); }
      const nx = r.x + SP * dt;
      if (HURD.some(h => r.x < h && nx >= h) && st.t - r.air > .42) { r.stun = .8; r.stumbles++; if (st.live) PLAY.beep(150, .2, .18, 'sawtooth'); }
      r.x = nx;
      if (!r.offered && r.x >= POND) {
        r.offered = true;
        if (ver.id === 'forced') { r.mode = 'fish'; r.fished = true; r.x = POND; nextDip(st); }
      }
      if (ver.id !== 'forced' && !r.fished && r.x > POND - 200 && r.x < POND + 60 && (inp.press.f || inp.click === 'fish')) { r.mode = 'fish'; r.fished = true; nextDip(st); }
      if (r.x >= LEN) { st.phase = 'rate'; st.at = st.t; }
    },
    // a scripted player: hops every hurdle, fishes when it is forced or pays, skips when it is neither, and rates as written
    bot(st) {
      const r = st.r, P = k => ({ down: {}, press: { [k]: true } });
      if (st.phase === 'rate') return st.t - st.at > 1.3 ? P(['1', '3', '2'][st.v]) : null;
      if (st.phase !== 'go') return null;
      if (r.mode === 'fish') return r.dip > 0 && st.t - r.dip > .25 ? P(' ') : null;
      if (st.v === 2 && !r.fished && r.x > POND - 60) return P('f');
      return HURD.some(h => h - r.x > 0 && h - r.x < 50) && st.t - r.air > .5 ? P(' ') : null;
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const r = st.r, ver = VER[st.v], cam = clamp(r.x - 300, 0, LEN - AW + 100), X = x => AX + x - cam, GY = AY + 180;
      GK.head(g, `Run ${st.v + 1} of 3 · the pond is ${ver.n.toLowerCase()}`, AX, 30, 'left', C.ink, 17);
      GK.text(g, `${(r.t - (ver.id === 'reward' ? r.fish * BONUS : 0)).toFixed(1)} s`, AX + AW, 32, C.navy, 22, 'right', 800);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#bfe3c6'; g.fillRect(AX, AY, AW, AH); g.fillStyle = '#d9c08a'; g.fillRect(AX, GY - 34, AW, 68);
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.setLineDash([16, 16]); g.lineDashOffset = cam; g.beginPath(); g.moveTo(AX, GY); g.lineTo(AX + AW, GY); g.stroke(); g.setLineDash([]);
      HURD.forEach(h => { g.fillStyle = '#7a4b22'; g.fillRect(X(h) - 4, GY - 30, 8, 60); g.fillStyle = '#fff'; g.fillRect(X(h) - 4, GY - 6, 8, 12); });
      // the pond
      g.fillStyle = '#4a90d9'; g.beginPath(); g.ellipse(X(POND + 20), GY - 110, 120, 52, 0, 0, TAU); g.fill();
      TD.label(ver.tip, X(POND + 20), GY - 60, 'center', C.ink, 12);
      if (ver.id === 'forced' && r.fish < NEED) { g.fillStyle = '#5c4424'; g.fillRect(X(POND + 40), GY - 36, 10, 72); }
      g.fillStyle = '#fff'; g.fillRect(X(LEN), GY - 80, 4, 114); g.fillStyle = C.good; g.beginPath(); g.moveTo(X(LEN) + 4, GY - 80); g.lineTo(X(LEN) + 44, GY - 66); g.lineTo(X(LEN) + 4, GY - 52); g.fill();
      const air = st.t - r.air < .42, hop = air ? Math.sin((st.t - r.air) / .42 * Math.PI) : 0;
      if (r.mode === 'fish') {
        const dip = r.dip > 0, bx = X(POND + 20), by = GY - 112 + (dip ? 9 : Math.sin(st.t * 3) * 2);
        g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(r.x), GY - 24); g.quadraticCurveTo(X(r.x) + 20, GY - 150, bx, by); g.stroke();
        g.fillStyle = dip ? '#e5322d' : '#fff'; g.beginPath(); g.arc(bx, by, 7, 0, TAU); g.fill();
        if (dip) TD.label('strike!', bx, by - 22, 'center', '#fff', 13, 'rgba(183,28,28,.95)');
        if (r.early && st.t - r.early < .8) TD.label('too early', bx, by - 22, 'center', C.ink, 12);
        if (r.got && st.t - r.got < .8) TD.label(ver.id === 'reward' ? `fish! −${BONUS} s` : 'fish!', bx + 60, by - 30, 'center', '#fff', 13, 'rgba(47,174,99,.95)');
      }
      if (hop) { g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(X(r.x), GY + 12, 14, 5, 0, 0, TAU); g.fill(); }
      TD.player(X(r.x), GY - hop * 26, r.mode === 'fish' ? -Math.PI / 2 : 0, 1 + hop * .15, r.stun > 0 ? .5 : 1);
      for (let i = 0; i < NEED; i++) { g.fillStyle = i < r.fish ? '#ffd23f' : 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(AX + 30 + i * 34, AY + 24, 13, 7, 0, 0, TAU); g.fill(); }
      g.restore();
      if (st.phase === 'ready') TD.stamp('Space to start, Space to hop', AX + AW / 2, AY + 60, C.navy, 1, 22);
      if (st.phase === 'go' && ver.id !== 'forced' && r.mode === 'run' && !r.fished && r.x > POND - 200 && r.x < POND + 60) ui.btn('fish', 'F · stop and fish', AX + AW / 2 - 100, AY + 14, 200, 40, { px: 14 });
      if (r.mode === 'fish' && ver.id !== 'forced') ui.btn('leave', 'F · back to the run', AX + AW / 2 - 100, AY + 14, 200, 40, { px: 14 });
      if (st.phase === 'rate') {
        GK.box(g, AX + 250, AY + 40, 500, 150, '#fffaf0', C.navy, 12, 2); GK.text(g, 'How did that run leave you?', AX + 500, AY + 72, C.ink, 17, 'center', 700);
        FACES.forEach((f, i) => { const x = AX + 290 + i * 150; ui.btn('r' + i, '', x, AY + 90, 120, 84, {}); g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(x + 60, AY + 122, 20, 0, TAU); g.stroke(); g.fillStyle = C.navy; g.beginPath(); g.arc(x + 53, AY + 117, 2.5, 0, TAU); g.arc(x + 67, AY + 117, 2.5, 0, TAU); g.fill(); g.beginPath(); if (i === 1) { g.moveTo(x + 52, AY + 130); g.lineTo(x + 68, AY + 130); } else g.arc(x + 60, AY + (i ? 124 : 136), 9, i ? .15 * Math.PI : 1.15 * Math.PI, i ? .85 * Math.PI : 1.85 * Math.PI); g.stroke(); GK.text(g, `${i + 1} · ${f}`, x + 60, AY + 164, C.ink, 12, 'center', 700); });
      }
      // the table
      const TY = AY + AH + 36, col = [AX, AX + 220, AX + 330, AX + 480, AX + 580, AX + 740, AX + 870];
      ['the pond', 'fished?', 'time at the pond', 'fish', 'final time', 'hurdles hit', 'your rating'].forEach((h, i) => GK.text(g, h, col[i], TY, C.muted, 11, 'left', 700));
      VER.forEach((v, i) => {
        const y = TY + 34 + i * 40, q = st.rows[i];
        if (i === st.v && st.phase !== 'end') { g.fillStyle = 'rgba(245,176,65,.16)'; g.beginPath(); g.roundRect(AX - 8, y - 23, AW + 8, 36, 8); g.fill(); }
        GK.text(g, v.n, col[0], y, C.ink, 14, 'left', 700);
        if (!q) return;
        [q.fished ? 'yes' : 'ran past', q.pond.toFixed(1) + ' s', String(q.fish), q.time.toFixed(1) + ' s' + (q.raw !== q.time ? ` (${q.raw.toFixed(1)} − ${q.fish * BONUS})` : ''), String(q.hit), FACES[q.rate]].forEach((s, c) => GK.text(g, s, col[c + 1], y, C.ink, 14, 'left', 700));
      });
      if (st.phase === 'end' && live) ui.btn('again', 'Run all three again', AX, TY + 150, 200, 38, { px: 13 });
      // side panel
      ui.stats(`<div><b>${r.t.toFixed(1)} s</b><span>on the clock</span></div><div><b>${r.pondT.toFixed(1)} s</b><span>spent at the pond</span></div><div class="g"><b>${r.fish}</b><span>fish this run</span></div>`);
      const [a, b, c] = st.rows, who = live ? 'You' : 'The scripted player';
      ui.out(st.phase !== 'end' ? (live ? ver.tip + ' The clock never stops.' : 'Same sprint three times. Only the rule at the pond changes; watch what the scripted player does at it.')
        : `Forced: ${a.pond.toFixed(1)} s at the pond on a ${a.raw.toFixed(1)} s run, rated ${FACES[a.rate]}. Optional: ${who.toLowerCase()} ${b.fished ? `fished for ${b.pond.toFixed(1)} s` : 'ran past'}, rated ${FACES[b.rate]}. With the bonus: ${c.fished ? `${c.fish} fish in ${c.pond.toFixed(1)} s` : 'ran past'}, rated ${FACES[c.rate]}. Fishing tests patience in a game that promised speed. Forcing it breaks that promise, leaving it optional lets it be skipped, and paying for it in the main currency makes ${c.fished ? 'skipping the wrong play, so it is forced again by other means' : 'it a tax you chose not to collect'}.`);
    },
  });
})();
