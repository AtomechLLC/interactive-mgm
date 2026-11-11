/* One Pressure, Two Helpers (replanned page for "Two Days, Three Needs"; Scripture: Resource Systems, Decision Intervals,
   Nested Goals). The learner picks which of three needs drains fastest, or sets them equal, then plays one day and night.
   Every setting drains the same total per second. The page records where the learner's own seconds went. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, FX = 24, FY = 56, FW = 640, FH = 410, SP = 92, FILL = .6, DAY = 36, DUSK = .7, R0 = 30;
  const NEED = [{ n: 'Hunger', col: '#c0562c', src: 'berry bush', x: 110, y: 205 }, { n: 'Warmth', col: '#e0a020', src: 'campfire', x: 320, y: 205 }, { n: 'Calm', col: '#8e5bd0', src: 'flower patch', x: 530, y: 205 }].map(o => ({ ...o, x: FX + o.x, y: FY + o.y }));
  const SETS = [{ n: 'Hunger fast', e: [8, 32, 32] }, { n: 'Warmth fast', e: [32, 8, 32] }, { n: 'Calm fast', e: [32, 32, 8] }, { n: 'All equal', e: [16, 16, 16] }];
  const MARKS = [[50, 50], [320, 40], [590, 50], [50, 360], [320, 370], [590, 360]].map(([x, y]) => ({ x: FX + x, y: FY + y }));
  const saved = {}; let API = null;
  function start(st, si) { st.si = si; st.q = { t: 0, x: FX + 320, y: FY + 260, v: [.8, .8, .8], found: MARKS.map(() => false), line: [], tend: 0, zero: 0, visits: [0, 0, 0], inS: -1, free: 0, best: 0, hold: -1 }; st.ph = 'go'; }
  function summary(q) { return { found: q.found.filter(Boolean).length, tend: q.tend, zero: q.zero, visits: q.visits.slice(), best: Math.max(q.best, q.free), line: q.line.slice() }; }
  PLAY.game('needs', {
    dur: 78, keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'],
    opts: s => ({ si: +(s.querySelector('.seg .on')?.dataset.v || 0) }),
    setup(s, api) { API = api; s.querySelectorAll('.seg button').forEach(b => b.onclick = () => { s.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { const st = { live, t: 0, rows: {} }; start(st, live ? o.si : 0); if (live) st.ph = 'ready'; return st; },
    step(st, inp, dt) {
      st.t += dt; const q = st.q, d = inp.down || {}, set = SETS[st.si];
      if (st.ph === 'ready') { if (inp.click || Object.keys(d).length) st.ph = 'go'; else return; }
      if (st.ph === 'done') { if (st.live && inp.click === 'again') API.start(); if (!st.live && st.si === 0 && st.t - st.at > 2) start(st, 3); return; }
      q.t += dt; const night = q.t > DAY * DUSK;
      let vx = inp.vx != null ? inp.vx : (d.ArrowRight || d.d ? 1 : 0) - (d.ArrowLeft || d.a ? 1 : 0), vy = inp.vy != null ? inp.vy : (d.ArrowDown || d.s ? 1 : 0) - (d.ArrowUp || d.w ? 1 : 0);
      const m = Math.hypot(vx, vy) || 1, empty = q.v.some(v => v <= 0), sp = SP * (empty ? .5 : 1);
      q.x = clamp(q.x + vx / m * sp * dt, FX + 12, FX + FW - 12); q.y = clamp(q.y + vy / m * sp * dt, FY + 12, FY + FH - 12);
      const at = NEED.findIndex(n => Math.hypot(n.x - q.x, n.y - q.y) < R0);
      q.v = q.v.map((v, i) => clamp(v - dt / set.e[i] + (at === i ? FILL * dt : 0)));
      if (at !== q.inS) q.stay = 0; q.inS = at;
      if (at >= 0) { const was = q.stay || 0; q.stay = was + dt; if (was < .5 && q.stay >= .5) { q.visits[at]++; if (st.live) PLAY.beep(620 + at * 120, .08, .1); } } // a refill counts after half a second in the circle
      if (at >= 0) { q.tend += dt; q.best = Math.max(q.best, q.free); q.free = 0; } else q.free += dt;
      if (empty) q.zero += dt;
      if (!night) MARKS.forEach((mk, i) => { if (!q.found[i] && Math.hypot(mk.x - q.x, mk.y - q.y) < 30) { q.found[i] = true; if (st.live) PLAY.beep(1040, .18, .12); } });
      const k = Math.floor(q.t * 4); while (q.line.length <= k) q.line.push(at >= 0 ? at : empty ? 4 : 3);
      if (q.t >= DAY) { st.ph = 'done'; st.at = st.t; st.rows[st.si] = summary(q); if (st.live) saved[st.si] = st.rows[st.si]; }
    },
    // the scripted player: tops up whichever need is lowest once it falls under 40%, and otherwise walks to the nearest unseen landmark
    bot(st) {
      const q = st.q; if (st.ph !== 'go') return null; let tg = null;
      if (q.hold >= 0 && q.v[q.hold] > .95) q.hold = -1;
      if (q.hold < 0) { const lo = q.v.indexOf(Math.min(...q.v)); if (q.v[lo] < .4) q.hold = lo; }
      if (q.hold >= 0) tg = NEED[q.hold];
      else if (q.t < DAY * DUSK) { let bd = 1e9; MARKS.forEach((mk, i) => { const dd = Math.hypot(mk.x - q.x, mk.y - q.y); if (!q.found[i] && dd < bd) { bd = dd; tg = mk; } }); }
      if (!tg) tg = q; // nothing to find at night: wait until a need calls
      const dx = tg.x - q.x, dy = tg.y - q.y, dd = Math.hypot(dx, dy);
      return { down: {}, press: {}, vx: dd > 6 ? dx / dd : 0, vy: dd > 6 ? dy / dd : 0 };
    },
    draw(g, st, ui, live) {
      GK.panel(g); const q = st.q, set = SETS[st.si], night = q.t > DAY * DUSK;
      GK.head(g, `${set.n} · ${night ? 'night' : 'day'} · ${Math.max(0, DAY - q.t).toFixed(0)} s left`, FX, 32, 'left', C.ink, 17);
      g.save(); g.beginPath(); g.roundRect(FX, FY, FW, FH, 12); g.clip(); g.fillStyle = '#9db87a'; g.fillRect(FX, FY, FW, FH); g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 40; i++) g.fillRect(FX + (i * 137) % FW, FY + (i * 71) % FH, 22, 5);
      MARKS.forEach((mk, i) => { g.fillStyle = q.found[i] ? '#ffd23f' : 'rgba(60,70,50,.45)'; g.beginPath(); g.arc(mk.x, mk.y, 15, 0, TAU); g.fill(); GK.text(g, q.found[i] ? '★' : '?', mk.x, mk.y + 6, q.found[i] ? '#7a5a00' : '#e9f0dc', 16, 'center', 800); });
      NEED.forEach((n, i) => { g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(n.x, n.y, R0, 0, TAU); g.fill(); g.strokeStyle = n.col; g.lineWidth = 3; g.stroke();
        if (i === 0) { g.fillStyle = '#3f7a35'; g.beginPath(); g.arc(n.x, n.y, 17, 0, TAU); g.fill(); g.fillStyle = '#c62828'; [[-6, -4], [6, -2], [0, 7]].forEach(([a, b]) => { g.beginPath(); g.arc(n.x + a, n.y + b, 3.5, 0, TAU); g.fill(); }); }
        if (i === 1) { g.fillStyle = '#6b4a2b'; g.fillRect(n.x - 14, n.y + 6, 28, 6); g.fillStyle = '#ff8a1e'; g.beginPath(); g.moveTo(n.x - 10, n.y + 6); g.quadraticCurveTo(n.x - 4 + Math.sin(st.t * 9) * 3, n.y - 22, n.x, n.y - 6); g.quadraticCurveTo(n.x + 6, n.y - 20, n.x + 10, n.y + 6); g.fill(); }
        if (i === 2) [[-9, -6], [8, -8], [0, 6], [-10, 8], [10, 7]].forEach(([a, b]) => { g.fillStyle = '#b388ff'; g.beginPath(); g.arc(n.x + a, n.y + b, 5, 0, TAU); g.fill(); g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(n.x + a, n.y + b, 2, 0, TAU); g.fill(); });
        TD.label(n.src, n.x, n.y + R0 + 16, 'center', '#fff', 11, 'rgba(40,50,40,.7)'); });
      if (night) { g.fillStyle = 'rgba(14,20,50,.45)'; g.fillRect(FX, FY, FW, FH); }
      TD.shadow(q.x, q.y + 12, 12, 4); TD.player(q.x, q.y, 0, .85);
      q.v.forEach((v, i) => { PLAY.bar(g, q.x - 20, q.y - 34 + i * 6, 40, 4, v, NEED[i].col, 'rgba(0,0,0,.35)'); });
      g.restore();
      if (st.ph === 'ready') TD.stamp('Arrow keys or WASD: keep three needs up, find the six landmarks', FX + FW / 2, FY + 40, C.navy, 1, 16);
      if (night && st.ph === 'go') TD.label('night: landmarks cannot be found in the dark', FX + FW / 2, FY + 20, 'center', '#fff', 12, 'rgba(14,20,50,.85)');
      if (q.v.some(v => v <= 0) && st.ph === 'go') TD.label('a need is empty: half speed', FX + FW / 2, FY + FH - 16, 'center', '#fff', 12, 'rgba(183,28,28,.95)');
      if (st.ph === 'done' && live) ui.btn('again', 'Play this setting again', FX + FW / 2 - 115, FY + FH / 2 - 20, 230, 40, { px: 14, on: true });
      NEED.forEach((n, i) => { const x = FX + i * 216; GK.text(g, `${n.n} · empty in ${set.e[i]} s`, x, FY + FH + 24, set.e[i] < 16 ? C.redDk : C.ink, 12, 'left', 700); PLAY.bar(g, x, FY + FH + 32, 200, 12, q.v[i], n.col); });
      GK.text(g, 'Every setting drains the same total per second. Standing in a circle refills that need at 60% a second.', FX, FY + FH + 68, C.muted, 11, 'left', 500);
      // timelines
      const RX = 690, RW = 326, store = live ? saved : st.rows, cols = [NEED[0].col, NEED[1].col, NEED[2].col, '#d9d2bd', '#b71c1c'];
      GK.text(g, 'where each day went, second by second', RX, 32, C.muted, 12, 'left', 700);
      SETS.forEach((s2, k) => { const y = 46 + k * 116, cur = k === st.si && st.ph !== 'done', row = cur ? summary(q) : store[k];
        GK.box(g, RX, y, RW, 106, k === st.si ? '#fff6dd' : '#fffaf0', k === st.si ? C.navy : '#cdbf9f', 10, k === st.si ? 2.5 : 1.5); GK.text(g, s2.n, RX + 12, y + 22, C.ink, 13, 'left', 800);
        if (!row) { GK.text(g, 'not played yet', RX + RW / 2, y + 62, C.muted, 12, 'center', 600); return; }
        const w = (RW - 24) / (DAY * 4); row.line.forEach((a, i) => { g.fillStyle = cols[a]; g.fillRect(RX + 12 + i * w, y + 32, w + .6, 22); });
        g.strokeStyle = C.ink; g.lineWidth = 1; g.strokeRect(RX + 12, y + 32, RW - 24, 22); const dx = RX + 12 + (RW - 24) * DUSK; g.beginPath(); g.moveTo(dx, y + 28); g.lineTo(dx, y + 58); g.stroke();
        GK.text(g, `${row.found}/6 landmarks · ${row.visits.reduce((a, b) => a + b, 0)} refills (${row.visits.join(' / ')})`, RX + 12, y + 74, C.ink, 12, 'left', 700);
        GK.text(g, `longest free stretch ${row.best.toFixed(1)} s · ${row.zero.toFixed(1)} s with a need empty`, RX + 12, y + 92, C.muted, 11, 'left', 600); });
      GK.text(g, 'colour = refilling · pale = walking · red = a need empty · tick = dusk', RX, 46 + 4 * 116 + 10, C.muted, 10, 'left', 600);
      ui.stats(`<div class="g"><b>${q.found.filter(Boolean).length}/6</b><span>landmarks found</span></div><div><b>${q.visits.reduce((a, b) => a + b, 0)}</b><span>refill visits</span></div><div class="r"><b>${q.zero.toFixed(1)} s</b><span>with a need empty</span></div>`);
      const who = live ? 'You' : 'The script', eq = store[3], fk = [0, 1, 2].find(k => store[k]), f = fk != null ? store[fk] : null;
      if (!f || !eq) { ui.out(st.ph === 'done' ? `${who} found ${st.rows[st.si].found} of 6 landmarks with ${st.rows[st.si].visits.reduce((a, b) => a + b, 0)} refill visits. ${live ? (st.si === 3 ? 'Now play a day with one need set fast.' : 'Now play “All equal” to compare.') : ''}` : (live ? `${set.n}: the needs empty in ${set.e.join(', ')} seconds.` : 'A scripted player: it tops up the lowest need under 40%, and otherwise walks to the nearest unseen landmark.')); return; }
      const fv = f.visits.reduce((a, b) => a + b, 0), ev = eq.visits.reduce((a, b) => a + b, 0), top = Math.max(...f.visits);
      ui.out(`${SETS[fk].n}: ${fv} refills, ${top} of them at one source, and ${f.found} landmarks. All equal: ${ev} refills spread ${eq.visits.join(' / ')}, and ${eq.found} landmarks. ` + (top / Math.max(1, fv) >= .5 ? 'One fast need gave the day a home base and a rhythm to plan trips around. ' : 'The fast need did not dominate the refills in this run. ') + (f.found > eq.found ? 'The fast-need day reached more of the edges.' : f.found === eq.found ? 'Both days found the same number of landmarks in this run, so the difference shows only in the pattern of the strip.' : 'In this run the equal day found more landmarks, so the pitch did not hold here: the fast need kept the leash too short.'));
    },
  });
})();
