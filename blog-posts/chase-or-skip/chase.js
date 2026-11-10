/* Chase or Skip (replanned page for "Make It Important"; Scripture: Systems That Make Players Care, Perceived Value vs Effort,
   Mystery Boxes). Six rooms against a clock that affords three detours. Each room shows a reward one of four ways; what each
   is worth is hidden until the end. The page records which ones the learner chased. Worth values are set by the page. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp;
  const AX = 20, AY = 62, AW = 1000, AH = 250, ROOM = 460, SP = 115, DET = 3, BUDGET = 34, NR = 6, LEN = NR * ROOM + 160;
  const RW = [{ show: 'glow', name: 'Glowing gem', worth: 1 }, { show: 'text', name: '“+6% damage”', label: '+6% damage', worth: 6 }, { show: 'mush', name: 'Mushroom', worth: 3 }, { show: 'chest', name: 'Mystery chest', worth: 2, inside: 'a common potion' }, { show: 'text', name: '“+4% damage”', label: '+4% damage', worth: 4 }, { show: 'crown', name: 'Golden crown', worth: 1.5 }];
  const BEST = 13; let last = null;
  function art(g, r, x, y, t, s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s);
    if (r.show === 'glow' || r.show === 'crown') { const p = 1 + Math.sin(t * 5) * .12, gr = g.createRadialGradient(0, 0, 4, 0, 0, 46 * p); gr.addColorStop(0, r.show === 'glow' ? 'rgba(120,220,255,.95)' : 'rgba(255,215,90,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 46 * p, 0, TAU); g.fill(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.cos(a) * 24, Math.sin(a) * 24); g.lineTo(Math.cos(a) * 38 * p, Math.sin(a) * 38 * p); g.stroke(); }
      if (r.show === 'glow') { g.fillStyle = '#2bb6e8'; g.beginPath(); g.moveTo(0, -18); g.lineTo(14, 0); g.lineTo(0, 18); g.lineTo(-14, 0); g.fill(); g.fillStyle = '#b8ecff'; g.beginPath(); g.moveTo(0, -18); g.lineTo(14, 0); g.lineTo(0, 0); g.fill(); }
      else { g.fillStyle = '#f5b301'; g.beginPath(); g.moveTo(-18, 12); g.lineTo(-18, -8); g.lineTo(-9, 2); g.lineTo(0, -14); g.lineTo(9, 2); g.lineTo(18, -8); g.lineTo(18, 12); g.fill(); g.fillStyle = '#e5322d'; g.beginPath(); g.arc(0, 4, 3.5, 0, TAU); g.fill(); } }
    else if (r.show === 'text') { g.fillStyle = '#fffaf0'; g.strokeStyle = '#8b8370'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(-52, -14, 104, 28, 4); g.fill(); g.stroke(); g.fillStyle = '#4a4538'; g.font = '500 14px Jost, sans-serif'; g.textAlign = 'center'; g.fillText(r.label, 0, 5); }
    else if (r.show === 'mush') { g.fillStyle = '#f3e3c2'; g.beginPath(); g.roundRect(-9, 0, 18, 18, 5); g.fill(); g.fillStyle = '#e5322d'; g.beginPath(); g.arc(0, 0, 20, Math.PI, 0); g.lineTo(20, 4); g.lineTo(-20, 4); g.fill(); g.fillStyle = '#fff'; [[-10, -8, 5], [8, -10, 4.5], [0, -2, 3.5]].forEach(([a, b, c]) => { g.beginPath(); g.arc(a, b, c, 0, TAU); g.fill(); }); g.fillStyle = '#222'; g.fillRect(-4, 6, 2, 6); g.fillRect(2, 6, 2, 6); }
    else { g.fillStyle = '#7a4b22'; g.beginPath(); g.roundRect(-20, -12, 40, 28, 4); g.fill(); g.fillStyle = '#5c3616'; g.fillRect(-20, -2, 40, 4); g.fillStyle = '#f5b301'; g.fillRect(-4, -5, 8, 10); g.fillStyle = '#fff'; g.font = '800 15px Montserrat, sans-serif'; g.textAlign = 'center'; g.fillText('?', 0, -18); }
    g.restore();
  }
  PLAY.game('chase', {
    dur: 40, keys: [' '],
    init(o, live) { const R = live ? Math.random : GK.rng(1), rooms = RW.map(r => ({ r })); if (live) for (let i = NR - 1; i > 0; i--) { const j = R() * (i + 1) | 0;[rooms[i], rooms[j]] = [rooms[j], rooms[i]]; } return { live, t: 0, clock: BUDGET, x: 0, rooms, det: 0, got: [], phase: live ? 'ready' : 'go', n: 0 }; },
    step(st, inp, dt) {
      if (st.phase === 'ready') { if (inp.press[' '] || inp.click) st.phase = 'go'; return; }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true), { phase: 'go' }); return; }
      st.t += dt; st.clock -= dt;
      if (st.clock <= 0) { st.clock = 0; st.out = true; st.phase = 'end'; last = st; return; }
      if (st.det > 0) { const b = st.det; st.det -= dt; if (b > DET / 2 && st.det <= DET / 2) { st.rooms[st.cur].got = true; st.got.push(st.cur); if (st.live) PLAY.beep(980, .15, .15); } if (st.det <= 0) st.det = 0; return; }
      st.x += SP * dt; const i = Math.floor(st.x / ROOM), rx = st.x - i * ROOM;
      if (i < NR && rx > 60 && rx < 300 && !st.rooms[i].got && !st.rooms[i].tried && (inp.press[' '] || inp.click === 'det')) { st.rooms[i].tried = true; st.det = DET; st.cur = i; st.n++; }
      if (st.x >= LEN) { st.phase = 'end'; last = st; }
    },
    // a scripted player that chases what shines and what it recognises
    bot(st) { const i = Math.floor(st.x / ROOM), rx = st.x - i * ROOM; return st.phase === 'go' && i < NR && rx > 120 && ['glow', 'mush', 'crown'].includes(st.rooms[i].r.show) ? { down: {}, press: { ' ': true } } : null; },
    draw(g, st, ui, live) {
      GK.panel(g); const cam = clamp(st.x - 260, 0, LEN - AW + 60), X = x => AX + x - cam, GY = AY + 196, i = Math.min(NR - 1, Math.floor(st.x / ROOM)), rx = st.x - i * ROOM;
      const left = (LEN - st.x) / SP + st.det, afford = Math.max(0, Math.floor((st.clock - left + .001) / DET));
      GK.head(g, st.phase === 'end' ? (st.out ? 'The clock ran out before the exit' : 'Out in time') : `Room ${i + 1} of ${NR}`, AX, 34, 'left', C.ink, 17);
      GK.text(g, `${st.clock.toFixed(1)} s`, AX + AW, 36, st.clock < 6 ? C.redDk : C.navy, 22, 'right', 800); GK.text(g, `a detour costs ${DET} s · the clock still affords ${afford}`, AX + AW - 90, 34, C.muted, 13, 'right', 600);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#3d3a4e'; g.fillRect(AX, AY, AW, AH); g.fillStyle = '#6b6478'; g.fillRect(AX, GY + 24, AW, AH);
      st.rooms.forEach((rm, k) => {
        const x0 = X(k * ROOM); if (x0 > AX + AW || x0 < AX - ROOM) return;
        g.fillStyle = '#2b2838'; g.fillRect(x0 - 8, AY, 16, GY - AY - 40); GK.text(g, String(k + 1), x0 + 26, AY + 30, 'rgba(255,255,255,.35)', 22, 'left', 800);
        const ax = x0 + 330, ay = AY + 84; g.fillStyle = '#56506a'; g.beginPath(); g.roundRect(ax - 76, ay - 54, 152, 104, 10); g.fill(); g.fillStyle = '#6b6478'; for (let s = 0; s < 4; s++) g.fillRect(ax - 76 + s * 16 - 64, GY + 24 - (s + 1) * 18 + 0, 16, (s + 1) * 18);
        if (!rm.got) art(g, rm.r, ax, ay, st.t); else GK.text(g, 'taken', ax, ay + 5, 'rgba(255,255,255,.5)', 13, 'center', 700);
      });
      g.fillStyle = '#9be28f'; g.fillRect(X(LEN) - 6, AY + 60, 12, GY - AY - 36); GK.text(g, 'EXIT', X(LEN), AY + 50, '#9be28f', 14, 'center', 800);
      let py = GY, px = X(st.x); if (st.det > 0) { const p = 1 - st.det / DET, up = Math.sin(p * Math.PI); px = X(st.x) + up * (330 - (st.x - st.cur * ROOM)); py = GY - up * 96; }
      TD.shadow(px, GY + 22, 18, 5); TD.player(px, py, 0, 1.2);
      g.restore();
      if (st.phase === 'ready') TD.stamp('Space to run', AX + AW / 2, AY + 150, '#fff', 1, 22);
      if (st.phase === 'go' && st.det <= 0 && i < NR && rx > 60 && rx < 300 && !st.rooms[i].tried) ui.btn('det', 'Space · take the detour', X(st.x) - 100, AY + AH - 52, 200, 38, { px: 13, on: true });
      // clock bar
      const BY = AY + AH + 14; g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(AX, BY, AW, 12, 6); g.fill(); g.fillStyle = st.clock < 6 ? C.red : C.navy; g.beginPath(); g.roundRect(AX, BY, Math.max(12, AW * st.clock / BUDGET), 12, 6); g.fill();
      // reveal
      const TY = BY + 44, end = st.phase === 'end', rows = st.rooms.map((rm, k) => ({ rm, k })).sort((a, b) => end ? b.rm.r.worth - a.rm.r.worth : a.k - b.k);
      GK.text(g, end ? 'what each one was worth (set by this page), highest first' : 'what you have passed', AX, TY - 12, C.muted, 12, 'left', 700);
      rows.forEach(({ rm, k }, n) => {
        const x = AX + n * 168, seenIt = end || k < i || (k === i && rx > 300); GK.box(g, x, TY, 160, 150, end && rm.got ? '#e6f3e4' : '#fffaf0', end && rm.got ? C.good : '#cdbf9f', 10, end && rm.got ? 3 : 1.5);
        if (!seenIt) { GK.text(g, `room ${k + 1}`, x + 80, TY + 80, C.muted, 13, 'center', 600); return; }
        g.fillStyle = '#3d3a4e'; g.beginPath(); g.roundRect(x + 10, TY + 10, 140, 66, 8); g.fill(); art(g, rm.r, x + 80, TY + 44, st.t, .8);
        GK.text(g, rm.r.name, x + 80, TY + 96, C.ink, 13, 'center', 800); GK.text(g, rm.got ? 'chased' : (rm.tried ? 'clock ran out' : 'skipped'), x + 80, TY + 114, rm.got ? C.good : C.muted, 12, 'center', 700);
        if (end) GK.text(g, `worth ${rm.r.worth}${rm.r.inside ? ` · ${rm.r.inside}` : ''}`, x + 80, TY + 136, C.navy, rm.r.inside ? 11 : 14, 'center', 800);
      });
      if (end && live) ui.btn('again', 'Run again, reshuffled', AX + AW - 220, AY + AH - 52, 200, 38, { px: 13, on: true });
      const sum = st.rooms.reduce((a, rm) => a + (rm.got ? rm.r.worth : 0), 0), nGot = st.rooms.filter(rm => rm.got).length;
      ui.stats(`<div><b>${st.clock.toFixed(0)} s</b><span>on the clock</span></div><div><b>${nGot}</b><span>rewards chased</span></div><div class="g"><b>${end ? sum : '?'}</b><span>worth collected${end ? ` of ${BEST} possible` : ''}</span></div>`);
      const who = live ? 'You' : 'The script';
      if (!end) { ui.out(live ? 'The clock covers the run plus three detours, no more. You see each reward only as the room shows it.' : 'A scripted player chases whatever glows and the item it recognises, and walks past the plain text.'); return; }
      const got = st.rooms.filter(rm => rm.got).map(rm => rm.r), kinds = { text: 0, shine: 0, mush: 0, chest: 0 }; got.forEach(r => kinds[r.show === 'glow' || r.show === 'crown' ? 'shine' : r.show]++);
      const skippedBig = st.rooms.filter(rm => !rm.got && rm.r.show === 'text').map(rm => rm.r.label);
      ui.out((st.out ? `${who} took ${st.n} detours and the clock ran out short of the exit. ` : '') + `${who} chased ${got.length ? got.map(r => r.name).join(', ') : 'nothing'}: worth ${sum} of a possible ${BEST}. ` + (skippedBig.length ? `Skipped: ${skippedBig.join(' and ')}, shown as plain text and worth more than anything that glowed. ` : 'Both plain-text rewards were taken, and they were the two largest. ') + (kinds.shine ? `${kinds.shine} of the picks glowed (worth ${got.filter(r => r.show === 'glow' || r.show === 'crown').map(r => r.worth).join(' and ')}). ` : '') + 'Players act on what the presentation says a thing is worth, so a designer has to spend presentation where the value is.');
    },
  });
})();
