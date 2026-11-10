/* Fool the Guard (replanned page for the stealth post; Scripture: Variance Generators, Noise, Feel-Smart Design).
   One room and one guard. The learner crosses five times under each of three settings: no randomness, randomness in the
   patrol (rolled before each attempt, in plain view), and randomness in detection (rolled while you move). The table is the
   learner's own attempts. Detection odds in the dice setting are invented for this page and stated in the side panel. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp;
  const AX = 20, AY = 46, AW = 1000, AH = 330, GOAL = 5;
  const BOX = [[180, 60, 80, 90], [180, 200, 80, 90], [400, 110, 200, 110], [740, 60, 80, 90], [740, 200, 80, 90]];
  const LOOP = [[340, 55], [660, 55], [660, 275], [340, 275]];
  const PATHS = { A: LOOP, B: LOOP.slice().reverse(), C: [[340, 165], [340, 55], [660, 55], [660, 165], [660, 55], [340, 55]] };
  const START = [40, 165], PSP = 150, GSP = 110, HALF = .5, RANGE = 240, EAR = 140;
  const MODES = { fixed: 'Nowhere', patrol: 'In his patrol', dice: 'In his detection' };
  const TIPS = { fixed: 'Same loop, same timing, every attempt. If his cone touches you for a quarter of a second, you are caught.', patrol: 'Each attempt he draws one of three routes and a starting point. You can watch for as long as you like before you move. The cone works as before.', dice: 'Same loop every attempt. In his cone, a 45% roll every fifth of a second. Inside the dotted ring, a 12% roll every half second that he hears you, cone or not.' };
  const table = { fixed: null, patrol: null, dice: null };
  const inBox = (x, y, r = 0) => BOX.some(([bx, by, bw, bh]) => x > bx - r && x < bx + bw + r && y > by - r && y < by + bh + r);
  function los(a, b) { for (let i = 1; i < 16; i++) { const k = i / 16; if (inBox(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)) return false; } return true; }
  function sees(gd, p, extra = 0) {
    const dx = p[0] - gd.x, dy = p[1] - gd.y, d = Math.hypot(dx, dy); if (d > RANGE + extra) return false;
    let da = Math.atan2(dy, dx) - gd.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    return Math.abs(da) < HALF + (extra ? .15 : 0) && los([gd.x, gd.y], p);
  }
  function attempt(st) {
    const m = st.mode, key = m === 'patrol' ? 'ABC'[Math.floor(st.R() * 3)] : 'A', path = PATHS[key], i = m === 'patrol' ? Math.floor(st.R() * path.length) : 0;
    st.gd = { path, i, x: path[i][0], y: path[i][1], ang: 0, look: 0, key };
    st.p = { x: START[0], y: START[1], ang: 0 }; st.seen = 0; st.roll = 0; st.ear = 0; st.moved = false; st.watch = 0; st.whistle = 1; st.sig = ''; st.phase = 'go'; st.trail = [];
  }
  function fresh(mode, live) { return { live, mode, R: live ? Math.random : GK.rng(21), t: 0, ready: live, row: { tries: 0, through: 0, caught: 0, heard: 0, watch: 0, whistles: 0, routes: [] }, at: 0, msg: '' }; }
  function guardStep(st, dt) {
    const g = st.gd; if (g.look > 0) { g.look -= dt; return; }
    const n = g.path[(g.i + 1) % g.path.length], dx = n[0] - g.x, dy = n[1] - g.y, d = Math.hypot(dx, dy), want = Math.atan2(dy, dx);
    let da = want - g.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); g.ang += clamp(da, -5 * dt, 5 * dt);
    if (Math.abs(da) > .3) return;
    if (d < GSP * dt) { g.x = n[0]; g.y = n[1]; g.i = (g.i + 1) % g.path.length; } else { g.x += dx / d * GSP * dt; g.y += dy / d * GSP * dt; }
  }
  function endAttempt(st, how) {
    const r = st.row; r.tries++; r.watch += st.watch; r.whistles += 1 - st.whistle;
    if (how === 'through') { r.through++; r.routes.push(st.sig); } else { r.caught++; if (how === 'heard') r.heard++; }
    st.phase = how; st.at = st.t; st.msg = how === 'through' ? 'Through' : how === 'heard' ? 'He heard you' : 'Seen';
    if (st.live) PLAY.beep(how === 'through' ? 880 : 150, .2, .18, how === 'through' ? 'sine' : 'sawtooth');
    if (r.through >= GOAL || r.tries >= 14) { st.phase = 'done'; if (st.live) table[st.mode] = r; }
  }
  const TOUR = ['fixed', 'patrol', 'dice'], SEG = 22;

  PLAY.game('guard', {
    dur: SEG * 3, keys: ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', ' '],
    opts: s => ({ mode: s.querySelector('.fg-mode .on').dataset.v }),
    setup(s, api) {
      const seg = [...s.querySelectorAll('.fg-mode .btn')], tip = () => { s.querySelector('.fg-tip').textContent = TIPS[s.querySelector('.fg-mode .on').dataset.v]; };
      seg.forEach(b => b.onclick = () => { seg.forEach(x => x.classList.toggle('on', x === b)); tip(); api.start(); }); tip();
    },
    init(o, live) { const st = fresh(live ? o.mode : 'fixed', live); st.rows = {}; st.seg = 0; attempt(st); return st; },
    step(st, inp, dt) {
      if (st.ready) { if (Object.keys(inp.press).length || inp.click) st.ready = false; return; }
      st.t += dt;
      if (!st.live && Math.floor(st.t / SEG) !== st.seg && st.seg < 2) { st.rows[st.mode] = st.row; st.seg++; const R = st.R; Object.assign(st, fresh(TOUR[st.seg], false), { t: st.t, rows: st.rows, seg: st.seg, R }); attempt(st); }
      if (st.phase === 'done') { if (st.live && (inp.press[' '] || inp.click)) { const n = fresh(st.mode, true); n.ready = false; Object.assign(st, n); attempt(st); } return; }
      if (st.phase !== 'go') { if (st.t - st.at > .9) attempt(st); return; }
      guardStep(st, dt);
      const D = inp.down, p = st.p; let vx = (D.d || D.ArrowRight ? 1 : 0) - (D.a || D.ArrowLeft ? 1 : 0), vy = (D.s || D.ArrowDown ? 1 : 0) - (D.w || D.ArrowUp ? 1 : 0);
      if (inp.vx != null) { vx = inp.vx; vy = inp.vy; }
      const v = Math.hypot(vx, vy);
      if (v) {
        st.moved = true; p.ang = Math.atan2(vy, vx);
        const nx = clamp(p.x + vx / v * PSP * dt, 12, AW - 12), ny = clamp(p.y + vy / v * PSP * dt, 12, AH - 12);
        if (!inBox(nx, p.y, 10)) p.x = nx; if (!inBox(p.x, ny, 10)) p.y = ny;
        if (st.trail.length === 0 || Math.hypot(p.x - st.trail[st.trail.length - 1][0], p.y - st.trail[st.trail.length - 1][1]) > 14) st.trail.push([p.x, p.y]);
      } else if (!st.moved) st.watch += dt;
      // the route's signature: which gap on the left, which side of the middle block, which gap on the right
      const lane = y => y < 60 ? 'T' : y > 290 ? 'B' : 'M';
      if (st.sig.length === 0 && p.x > 220) st.sig += lane(p.y); if (st.sig.length === 1 && p.x > 500) st.sig += p.y < 165 ? 'T' : 'B'; if (st.sig.length === 2 && p.x > 780) st.sig += lane(p.y);
      if (inp.press[' '] && st.whistle) { st.whistle = 0; st.gd.look = 2.5; st.gd.ang = Math.atan2(p.y - st.gd.y, p.x - st.gd.x); st.ping = { x: p.x, y: p.y, t: st.t }; if (st.live) PLAY.beep(1400, .15, .1); }
      const inCone = sees(st.gd, [p.x, p.y]);
      if (st.mode === 'dice') {
        st.roll += dt; st.ear += dt;
        if (st.roll >= .2) { st.roll = 0; if (inCone && st.R() < .45) return endAttempt(st, 'seen'); }
        if (st.ear >= .5) { st.ear = 0; if (Math.hypot(p.x - st.gd.x, p.y - st.gd.y) < EAR && st.R() < .12) return endAttempt(st, 'heard'); }
        st.seen = inCone ? .2 : 0;
      } else { st.seen = inCone ? st.seen + dt : 0; if (st.seen >= .25) return endAttempt(st, 'seen'); }
      if (p.x > AW - 30) endAttempt(st, 'through');
    },
    // a scripted sneak: it takes the upper side, waits whenever its next step would be in his cone, and never whistles
    bot(st) {
      if (st.phase !== 'go') return null;
      const WP = [[150, 165], [300, 175], [320, 28], [680, 28], [700, 175], [985, 165]], p = st.p;
      if (st.wp == null || !st.moved && p.x < 60) st.wp = 0;
      while (st.wp < WP.length - 1 && Math.hypot(WP[st.wp][0] - p.x, WP[st.wp][1] - p.y) < 8) st.wp++;
      const w = WP[st.wp], dx = w[0] - p.x, dy = w[1] - p.y, d = Math.hypot(dx, dy) || 1, nx = [p.x + dx / d * 40, p.y + dy / d * 40];
      const farSide = st.gd.y > 200 || st.gd.x > 600 && st.gd.y > 100;
      if (sees(st.gd, nx, 30) || sees(st.gd, [p.x + dx / d * 90, p.y + dy / d * 90], 30) || (st.wp === 2 && p.y > 150 && !farSide)) return { down: {}, press: {}, vx: 0, vy: 0 };
      return { down: {}, press: {}, vx: dx / d, vy: dy / d };
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const X = x => AX + x, Y = y => AY + y, r = st.row, gd = st.gd, p = st.p;
      GK.head(g, `Randomness: ${MODES[st.mode].toLowerCase()} · crossing ${Math.min(GOAL, r.through + 1)} of ${GOAL}`, AX, 30, 'left', C.ink, 17);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); TD.floor(AX, AY, AW, AH);
      g.fillStyle = 'rgba(47,174,99,.25)'; g.fillRect(X(AW - 30), AY, 30, AH); g.fillStyle = 'rgba(27,35,80,.12)'; g.fillRect(AX, AY, 70, AH);
      // his route, drawn so the plan can be made from what is on screen
      g.strokeStyle = 'rgba(229,50,45,.35)'; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); gd.path.forEach((w, i) => i ? g.lineTo(X(w[0]), Y(w[1])) : g.moveTo(X(w[0]), Y(w[1]))); g.closePath(); g.stroke(); g.setLineDash([]);
      if (st.mode === 'dice') { g.strokeStyle = 'rgba(138,79,214,.7)'; g.lineWidth = 2; g.setLineDash([3, 6]); g.beginPath(); g.arc(X(gd.x), Y(gd.y), EAR, 0, TAU); g.stroke(); g.setLineDash([]); }
      // the cone, clipped by the crates
      g.fillStyle = st.seen > 0 ? 'rgba(229,50,45,.42)' : 'rgba(229,50,45,.2)'; g.beginPath(); g.moveTo(X(gd.x), Y(gd.y));
      for (let i = 0; i <= 24; i++) { const a = gd.ang - HALF + i / 24 * HALF * 2; let d = 0; while (d < RANGE && !inBox(gd.x + Math.cos(a) * (d + 8), gd.y + Math.sin(a) * (d + 8))) d += 8; g.lineTo(X(gd.x + Math.cos(a) * d), Y(gd.y + Math.sin(a) * d)); }
      g.closePath(); g.fill();
      BOX.forEach(([bx, by, bw, bh]) => { g.fillStyle = '#8a6a3c'; g.strokeStyle = '#5c4424'; g.lineWidth = 3; g.beginPath(); g.roundRect(X(bx), Y(by), bw, bh, 6); g.fill(); g.stroke(); });
      if (st.trail.length > 1) { g.strokeStyle = 'rgba(58,123,213,.5)'; g.lineWidth = 3; g.beginPath(); st.trail.forEach((w, i) => i ? g.lineTo(X(w[0]), Y(w[1])) : g.moveTo(X(w[0]), Y(w[1]))); g.stroke(); }
      if (st.ping && st.t - st.ping.t < .8) { const k = (st.t - st.ping.t) / .8; g.strokeStyle = `rgba(58,123,213,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.arc(X(st.ping.x), Y(st.ping.y), 14 + 60 * k, 0, TAU); g.stroke(); }
      TD.foe(X(gd.x), Y(gd.y), 14, gd.ang, C.red); TD.player(X(p.x), Y(p.y), p.ang, .8, 1);
      if (gd.look > 0) TD.label('?', X(gd.x), Y(gd.y) - 28, 'center', C.ink, 16);
      g.restore();
      GK.text(g, 'start', X(8), Y(AH) - 8, C.muted, 11, 'left', 700); GK.text(g, 'exit', X(AW - 6), Y(AH) - 8, C.good, 11, 'right', 800);
      if (st.ready) TD.stamp('Watch him, then W A S D', X(AW / 2), Y(40), C.navy, 1, 22);
      if (st.phase === 'seen' || st.phase === 'heard' || st.phase === 'through') TD.stamp(st.msg, X(AW / 2), Y(40), st.phase === 'through' ? C.good : C.redDk, 1, 24);
      if (st.phase === 'done' && live) TD.stamp(r.through >= GOAL ? 'Five crossings. Pick another setting, or Space to repeat' : 'Fourteen attempts used. Pick another setting', X(AW / 2), Y(40), C.navy, 1, 18);
      if (st.mode === 'patrol' && !st.moved && st.phase === 'go') TD.label(`this attempt: route ${gd.key}`, X(AW / 2), Y(AH - 16), 'center', C.ink, 12);
      // the table of settings
      const TY = AY + AH + 34, cols = [AX, AX + 190, AX + 300, AX + 400, AX + 560, AX + 730, AX + 860];
      ['randomness', 'crossings', 'caught', 'caught outside his cone', 'watching before moving', 'whistles', 'routes used'].forEach((h, i) => GK.text(g, h, cols[i], TY, C.muted, 11, 'left', 700));
      Object.keys(MODES).forEach((m, i) => {
        const y = TY + 34 + i * 40, q = m === st.mode ? r : live ? table[m] : st.rows[m];
        if (m === st.mode) { g.fillStyle = 'rgba(245,176,65,.16)'; g.beginPath(); g.roundRect(AX - 8, y - 23, AW + 8, 36, 8); g.fill(); }
        GK.text(g, MODES[m], cols[0], y, C.ink, 14, 'left', 700);
        if (!q || !q.tries) { GK.text(g, 'not played yet', cols[1], y, C.muted, 12, 'left', 500); return; }
        GK.text(g, `${q.through} in ${q.tries} tries`, cols[1], y, C.ink, 14, 'left', 700); GK.text(g, String(q.caught), cols[2], y, q.caught ? C.redDk : C.ink, 14, 'left', 700);
        GK.text(g, m === 'dice' ? String(q.heard) : '–', cols[3], y, q.heard ? C.redDk : C.ink, 14, 'left', 700);
        GK.text(g, (q.watch / q.tries).toFixed(1) + ' s each', cols[4], y, C.ink, 14, 'left', 700); GK.text(g, String(q.whistles), cols[5], y, C.ink, 14, 'left', 700);
        GK.text(g, String(new Set(q.routes).size) + (q.routes.length ? ` (${[...new Set(q.routes)].join(', ')})` : ''), cols[6], y, C.ink, 13, 'left', 700);
      });
      GK.text(g, 'A route is named by the gap you took on the left, the side of the middle block, and the gap on the right: T top, M middle, B bottom.', AX, TY + 154, C.muted, 11, 'left', 500);
      // side panel
      ui.stats(`<div class="g"><b>${r.through}/${GOAL}</b><span>crossings</span></div><div class="r"><b>${r.caught}</b><span>times caught${st.mode === 'dice' ? ', ' + r.heard + ' outside his cone' : ''}</span></div><div><b>${r.tries ? (r.watch / r.tries).toFixed(1) : '0.0'} s</b><span>watched before moving, per attempt</span></div>`);
      const f = table.fixed, pa = table.patrol, di = table.dice, routes = q => new Set(q.routes).size;
      ui.out(!live ? ['Fixed guard: the scripted sneak finds one line and repeats it. Nothing here asks it to look again.', 'Now the route is drawn fresh each attempt, in view, before the first step. The same line no longer works every time, and the information to choose another is on screen.', 'Now the patrol is fixed and the dice are in his eyes and ears. A line that worked can fail with nothing on screen to explain it.'][st.seg]
        : st.phase !== 'done' ? 'Take as long as you like before the first step: the page counts how long you watch.'
        : f && pa && di ? `Fixed: ${routes(f)} route${routes(f) > 1 ? 's' : ''}, ${(f.watch / f.tries).toFixed(1)} s of watching per attempt. Varied patrol: ${routes(pa)} route${routes(pa) > 1 ? 's' : ''}, ${(pa.watch / pa.tries).toFixed(1)} s. Dice in detection: caught ${di.caught} times, ${di.heard} with no cone on you, and ${(di.watch / di.tries).toFixed(1)} s of watching. Randomness you can see before you commit gives you something to plan around; randomness after you commit takes the plan's result away from you.`
        : st.mode === 'fixed' ? `Five crossings in ${r.tries} attempts with ${routes(r)} route${routes(r) > 1 ? 's' : ''}. Once a line works here it works forever. Now try the other two settings.`
        : st.mode === 'patrol' ? `${r.tries} attempts, ${routes(r)} different routes, ${(r.watch / r.tries).toFixed(1)} s of watching each time. You had to read him again on every attempt. Play the remaining settings to compare.`
        : `Caught ${r.caught} times, ${r.heard} of them outside his cone. Ask yourself what you would do differently next time; if the answer is nothing, the dice are in the wrong place. Play the remaining settings to compare.`);
    },
  });
})();
