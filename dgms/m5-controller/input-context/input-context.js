/* Input plus context (mock-up for DGMS M5 Interaction + Context, and DGMS M3 for input under stress).
   1. Batman: Arkham freeflow: one strike button; the stick direction (from Batman) picks the target, angle first,
      then distance. Strikes are replayed from a list, so the walk-through is a pure function of t.
   2. Helldivers 2 stratagems: directional codes typed while bugs close in; a wrong direction clears the entry.
      Inputs are replayed from a list as well; the interactive mode appends the viewer's presses. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const W = 1040, H = 585;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const bg = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const rr = (g, x, y, w, h, r, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };

  /* ---------- 1. Freeflow ---------- */
  const CX = 310, CY = 300, BAT = '#262c6a', THUG = '#8b8fa8', PICK = '#e0a92d';
  const THUGS = [[-20, 170], [40, 230], [95, 150], [150, 220], [200, 130], [255, 210], [310, 160]].map(([a, r], i) => ({ i, x: CX + Math.cos(a * DEG) * r, y: CY + Math.sin(a * DEG) * r }));
  const FF_TOUR = [[1, { to: 0, off: 10 }], [1.9, { to: 2, off: -15 }], [2.8, { to: 4, off: 12 }], [3.7, { to: 6, off: -10 }], [4.6, { to: 1, off: 8 }], [5.5, { to: 3, off: -12 }], [6.4, null], [7.6, { to: 5, off: 10 }], [8.5, { to: 0, off: -8 }], [9.4, { to: 4, off: 15 }], [13, 0], [13.9, 0]];
  const LEAP = 0.3, DOWN = 2.5, CHAIN = 1.6;
  function pick(bx, by, dir, up) {
    if (!up.length) return null;
    const scored = up.map(th => { const d = Math.hypot(th.x - bx, th.y - by), a = Math.atan2(th.y - by, th.x - bx); return { th, d, da: dir === null ? 0 : angDiff(a, dir * DEG) }; });
    const inCone = dir === null ? scored : scored.filter(s => s.da <= 60 * DEG);
    const pool = inCone.length ? inCone : scored;
    pool.forEach(s => { s.score = dir === null ? s.d : s.da / DEG + s.d * 0.08; });
    pool.sort((a, b) => a.score - b.score);
    return { best: pool[0], pool };
  }
  function replay(strikes, t) {
    let bx = CX, by = CY, fx = CX, fy = CY, t0 = -9, combo = 0, best = 0, last = null, lastT = -99;
    const down = new Map();
    strikes.filter(([s]) => s <= t).forEach(([s, aim]) => {
      // finish the previous leap first
      bx = fx; by = fy;
      const dir = aim && typeof aim === 'object' ? Math.atan2(THUGS[aim.to].y - by, THUGS[aim.to].x - bx) / DEG + aim.off : aim;
      const up = THUGS.filter(th => !(down.has(th.i) && s < down.get(th.i) + DOWN));
      const p = pick(bx, by, dir, up); if (!p) return;
      const th = p.best.th, d = Math.hypot(th.x - bx, th.y - by), k = Math.max(0, d - 34) / (d || 1);
      fx = bx + (th.x - bx) * k; fy = by + (th.y - by) * k; t0 = s;
      combo = s - lastT <= CHAIN ? combo + 1 : 1; best = Math.max(best, combo); lastT = s;
      down.set(th.i, s + LEAP); last = { s, dir, th, pool: p.pool, from: [bx, by], leap: d > 160 };
    });
    const f = clamp((t - t0) / LEAP, 0, 1), e = 1 - (1 - f) * (1 - f);
    const x = lerp(bx, fx, e), y = lerp(by, fy, e);
    if (t - lastT > CHAIN) combo = 0;
    return { x, y, combo, best, last, down, t };
  }
  function drawFF(g, r, stickDir) {
    bg(g);
    g.fillStyle = '#e6dcc4'; g.beginPath(); g.arc(CX, CY, 285, 0, TAU); g.fill(); g.strokeStyle = '#c9b48a'; g.lineWidth = 2; g.stroke();
    const L = r.last, fresh = L && r.t - L.s < 1.2;
    // cone and candidates for the latest strike
    g.save(); g.beginPath(); g.arc(CX, CY, 285, 0, TAU); g.clip();
    if (fresh && L.dir !== null) {
      const [fx, fy] = L.from; g.fillStyle = 'rgba(224,169,45,.16)'; g.beginPath(); g.moveTo(fx, fy); g.arc(fx, fy, 420, (L.dir - 60) * DEG, (L.dir + 60) * DEG); g.closePath(); g.fill();
      g.strokeStyle = PICK; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(L.dir * DEG) * 90, fy + Math.sin(L.dir * DEG) * 90); g.stroke();
    }
    g.restore();
    if (fresh) { g.strokeStyle = PICK; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(...L.from); g.lineTo(L.th.x, L.th.y); g.stroke(); g.setLineDash([]); }
    THUGS.forEach(th => {
      const dn = r.down.has(th.i) && r.t >= r.down.get(th.i) && r.t < r.down.get(th.i) + DOWN;
      if (dn) { g.fillStyle = 'rgba(93,97,140,.45)'; g.beginPath(); g.ellipse(th.x, th.y, 22, 11, 0.4, 0, TAU); g.fill(); txt(g, 'down', th.x, th.y + 22, { font: '700 11px Jost', col: C.muted, align: 'center' }); return; }
      g.fillStyle = THUG; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(th.x, th.y, 17, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#e5322d'; g.fillRect(th.x - 9, th.y - 4, 18, 5);
      if (fresh && L.th === th) { g.strokeStyle = PICK; g.lineWidth = 4; g.beginPath(); g.arc(th.x, th.y, 24, 0, TAU); g.stroke(); }
    });
    // Batman: a cape-shaped wedge
    g.save(); g.translate(r.x, r.y); const face = L ? Math.atan2(L.th.y - L.from[1], L.th.x - L.from[0]) : 0; g.rotate(face);
    g.fillStyle = BAT; g.beginPath(); g.moveTo(18, 0); g.lineTo(-16, -18); g.lineTo(-10, 0); g.lineTo(-16, 18); g.closePath(); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.ellipse(2, 0, 6, 3, 0, 0, TAU); g.fill(); g.restore();
    // stick widget
    const sx = 830, sy = 120;
    txt(g, 'stick', sx, 40, { font: '700 13px Jost', col: C.muted, align: 'center' });
    g.fillStyle = '#e6e8f4'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(sx, sy, 56, 0, TAU); g.fill(); g.stroke();
    const sd = stickDir, kx = sd === null ? sx : sx + Math.cos(sd * DEG) * 32, ky = sd === null ? sy : sy + Math.sin(sd * DEG) * 32;
    g.fillStyle = '#5d618c'; g.beginPath(); g.arc(kx, ky, 22, 0, TAU); g.fill();
    txt(g, sd === null ? 'centred: nearest thug' : 'pointing', sx, sy + 76, { font: '700 13px Jost', col: C.navy, align: 'center' });
    // candidates
    txt(g, 'Who the strike goes to', 660, 230, { font: '800 15px Montserrat' });
    if (fresh) {
      L.pool.slice(0, 4).forEach((p, k) => { const y = 262 + k * 32, on = k === 0; rr(g, 660, y - 13, 350, 26, 6, on ? '#fde9b8' : 'rgba(38,44,106,.05)'); txt(g, on ? 'picked' : 'passed over', 672, y, { font: '700 12px Jost', col: on ? '#9a5a06' : C.muted }); txt(g, L.dir === null ? `${Math.round(p.d)} px away` : `${Math.round(p.da / DEG)}° off the stick · ${Math.round(p.d)} px away`, 1000, y, { font: '600 12px Jost', col: C.navy, align: 'right' }); });
      if (L.leap) txt(g, 'far target: Batman leaps the gap', 660, 400, { font: '700 13px Jost', col: C.navy });
    } else txt(g, 'press Strike to see the choice', 660, 262, { font: '600 13px Jost', col: C.muted });
    txt(g, r.combo ? `${r.combo}× combo` : 'combo ended', 835, 470, { font: '800 34px Montserrat', col: r.combo ? C.navy : C.muted, align: 'center' });
    txt(g, `best ${r.best}× · a strike within ${CHAIN} s keeps it going`, 835, 506, { font: '600 13px Jost', col: C.muted, align: 'center' });
  }
  canvasDemo('freeflow', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, key: '', strikes: [], dir: null }, tourBtn = $(s, '.ff-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.strikes = []; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const strike = dir => { manual(); st.dir = dir; st.strikes.push([st.t, dir]); };
    $(s, '.ff-strike').onclick = () => strike(null);
    cv.addEventListener('pointerdown', e => {
      const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * W / b.width, y = (e.clientY - b.top) * H / b.height; if (x > 620) return;
      manual(); const r = replay(st.strikes, st.t); strike(Math.atan2(y - r.y, x - r.x) / DEG);
    });
    function info(r, cap) {
      const k = cap + r.combo + r.best; if (k === st.key) return; st.key = k;
      say($(s, '.ff-stats'), `<div class="y"><b>${r.combo}×</b><span>current combo</span></div><div class="g"><b>${r.best}×</b><span>longest combo</span></div>`);
      say($(s, '.ff-out'), cap);
    }
    const DUR = 15;
    const cap = t => t < 6.4 ? 'Every strike is the same button. The stick points, the cone shows which thugs it is choosing between, and the closest match to the direction wins.'
      : t < 7.6 ? 'With the stick centred, the strike simply goes to the nearest thug.'
      : t < 12 ? 'Far targets are fine: Batman leaps the gap, so the combo flows across the room.'
      : 'Same stick direction twice, different thugs: the input is constant, the context decides the outcome.';
    s._seek = t => { const r = replay(FF_TOUR, t); drawFF(g, r, r.last ? r.last.dir : null); info(r, cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      const r = replay(st.strikes, st.t); drawFF(g, r, st.dir);
      info(r, 'Click where you want the stick to point: the strike goes to the best match from where Batman stands now. Strike alone picks the nearest.');
    };
  });

  /* ---------- 2. Stratagems ---------- */
  const ARW = { U: '↑', D: '↓', L: '←', R: '→' };
  const CODES = [['Reinforce', 'UDRLU'], ['Eagle Airstrike', 'URDR'], ['Resupply', 'DDUR'], ['Orbital Precision Strike', 'RRU']];
  const ST_TOUR = [[1, 'D'], [1.3, 'D'], [1.6, 'U'], [1.9, 'R'], [6.5, 'U'], [6.9, 'R'], [7.3, 'L'], [8.1, 'U'], [8.5, 'R'], [8.9, 'D'], [9.3, 'R'], [12, 'U'], [12.35, 'D'], [12.7, 'R'], [13.05, 'L'], [13.4, 'U'], [15, 'R'], [15.3, 'R'], [15.6, 'U']];
  const BUGS_IN = 8;
  function sReplay(inputs, t, bugsFrom) {
    let buf = '', start = null, errT = -9, lastD = null, lastDT = -9, air = bugsFrom, strike = -99;
    const calls = [], errs = [];
    inputs.filter(([a]) => a <= t).forEach(([a, d]) => {
      if (!buf) start = a; buf += d; lastD = d; lastDT = a;
      const hit = CODES.find(([, c]) => c === buf), pre = CODES.some(([, c]) => c.startsWith(buf));
      if (hit) { calls.push({ name: hit[0], t: a, dur: a - start, code: hit[1] }); if (hit[0] === 'Eagle Airstrike') air = strike = a; buf = ''; }
      else if (!pre) { errs.push(a); errT = a; buf = ''; }
    });
    const bugs = clamp(1 - (t - air) / BUGS_IN, 0, 1);
    return { buf, calls, errs, errT, lastD, lastDT, bugs, air, strike, t };
  }
  function drawStrat(g, r) {
    bg(g);
    // the field: diver on the left, bugs closing from the right
    rr(g, 24, 20, 992, 150, 10, '#e9dfc6');
    const near = 1 - r.bugs, shake = near > .7 ? Math.sin(r.t * 50) * 3 * near : 0;
    g.fillStyle = '#e0a92d'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(90 + shake, 95, 16, 0, TAU); g.fill(); g.stroke(); txt(g, 'you', 90, 128, { font: '700 12px Jost', col: C.navy, align: 'center' });
    const front = 140 + 840 * r.bugs;
    for (let k = 0; k < 14; k++) { const x = front + (k % 5) * 34 + (k * 13 % 7) * 4, y = 40 + ((k * 37) % 110); if (x > 1005) continue; g.fillStyle = '#c0392b'; g.beginPath(); g.ellipse(x + Math.sin(r.t * 9 + k) * 2, y, 9, 6, 0, 0, TAU); g.fill(); }
    if (r.t >= r.strike && r.t - r.strike < 1.2) { const f = (r.t - r.strike) / 1.2; for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(255,${120 + k * 20},40,${1 - f})`; g.beginPath(); g.arc(380 + k * 110, 95 + (k % 2) * 20, 20 + 40 * f, 0, TAU); g.fill(); } txt(g, 'Eagle Airstrike', 520, 40, { font: '800 16px Montserrat', col: C.redDk, align: 'center' }); }
    txt(g, near > .85 ? 'they are on you' : near > .5 ? 'bugs closing in' : 'quiet, for now', 1000, 158, { font: '700 12px Jost', col: near > .5 ? C.red : C.muted, align: 'right' });
    // the codes
    txt(g, 'Stratagems', 40, 204, { font: '800 16px Montserrat' });
    CODES.forEach(([name, code], k) => {
      const y = 236 + k * 52, match = r.buf && code.startsWith(r.buf), dim = r.buf && !match, called = r.calls.length && r.calls[r.calls.length - 1].name === name && r.t - r.calls[r.calls.length - 1].t < 1.2;
      rr(g, 36, y - 20, 560, 42, 8, called ? '#cdeedb' : match ? '#fde9b8' : 'rgba(38,44,106,.05)');
      txt(g, name, 52, y + 1, { font: '700 15px Jost', col: dim ? 'rgba(38,44,106,.35)' : C.navy });
      [...code].forEach((d, i) => { const x = 300 + i * 42, done = match && i < r.buf.length; rr(g, x, y - 15, 34, 32, 6, done ? '#e0a92d' : dim ? 'rgba(38,44,106,.06)' : '#fff'); g.strokeStyle = dim ? 'rgba(38,44,106,.2)' : C.navy; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x, y - 15, 34, 32, 6); g.stroke(); txt(g, ARW[d], x + 17, y + 2, { font: '800 18px Jost', col: done ? '#fff' : dim ? 'rgba(38,44,106,.3)' : C.navy, align: 'center' }); });
      if (called) txt(g, 'called', 585, y + 1, { font: '800 13px Montserrat', col: C.good, align: 'right' });
    });
    if (r.t - r.errT < 1.2) { rr(g, 36, 440, 560, 34, 8, 'rgba(229,50,45,.12)'); txt(g, 'Wrong direction: the whole entry is cleared. Start the code again.', 52, 457, { font: '700 14px Jost', col: C.red }); }
    // D-pad
    const px = 810, py = 300, on = d => r.lastD === d && r.t - r.lastDT < 0.18;
    g.fillStyle = '#c9cde6'; g.strokeStyle = C.navy; g.lineWidth = 2.5;
    [['U', 0, -1], ['D', 0, 1], ['L', -1, 0], ['R', 1, 0]].forEach(([d, dx, dy]) => { const x = px + dx * 46, y = py + dy * 46; rr(g, x - 23, y - 23, 46, 46, 8, on(d) ? '#e0a92d' : '#e6e8f4'); g.beginPath(); g.roundRect(x - 23, y - 23, 46, 46, 8); g.stroke(); txt(g, ARW[d], x, y + 2, { font: '800 22px Jost', col: on(d) ? '#fff' : C.navy, align: 'center' }); });
    rr(g, px - 23, py - 23, 46, 46, 4, '#e6e8f4');
    txt(g, 'entry: ' + ([...r.buf].map(d => ARW[d]).join(' ') || '–'), px, py + 98, { font: '800 18px Montserrat', col: C.navy, align: 'center' });
    // call log
    txt(g, 'Called', 680, 450, { font: '800 14px Montserrat' });
    r.calls.slice(-3).forEach((c, k) => txt(g, `${c.name}: ${c.dur.toFixed(1)} s from first press`, 680, 476 + k * 22, { font: '600 13px Jost', col: C.navy }));
    if (!r.calls.length) txt(g, 'nothing yet', 680, 476, { font: '600 13px Jost', col: C.muted });
  }
  canvasDemo('strat', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, key: '', inputs: [] }, tourBtn = $(s, '.st-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.inputs = []; } };
    const press = d => { manual(); st.inputs.push([st.t, d]); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.st-reset').onclick = () => { manual(); st.t = 0; st.inputs = []; };
    $$(s, '.st-d').forEach(b => b.onclick = () => press(b.dataset.d));
    const KEYS = { w: 'U', s: 'D', a: 'L', d: 'R' };
    addEventListener('keydown', e => { if (!s.classList.contains('active') || e.repeat) return; const d = KEYS[e.key.toLowerCase()]; if (d) press(d); });
    function info(r, cap) {
      const k = cap + r.calls.length + r.errs.length; if (k === st.key) return; st.key = k;
      const avg = r.calls.length ? r.calls.reduce((a, c) => a + c.dur, 0) / r.calls.length : 0;
      say($(s, '.st-stats'), `<div class="g"><b>${r.calls.length}</b><span>stratagems called${r.calls.length ? `, ${avg.toFixed(1)} s each on average` : ''}</span></div><div class="r"><b>${r.errs.length}</b><span>entries cleared by a wrong direction</span></div>`);
      say($(s, '.st-out'), cap);
    }
    const DUR = 18;
    const cap = t => t < 5 ? 'Quiet moment: Resupply is down, down, up, right, and it takes under a second.'
      : t < 10 ? 'Now the bugs close in. The Eagle Airstrike code goes in with one slip: a wrong direction clears the entry, and it starts again.'
      : t < 14.5 ? 'Each code is short and easy to know. Entering it while the screen is full of trouble is the test.'
      : 'The difficulty is the pressure, not the code. That is why the airstrike feels earned.';
    s._seek = t => { const r = sReplay(ST_TOUR, t, 4); drawStrat(g, r); info(r, cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      const r = sReplay(st.inputs, st.t, 0); drawStrat(g, r);
      info(r, r.bugs <= 0 ? 'The bugs reached you. Call the Eagle Airstrike to clear them: ↑ → ↓ →.' : 'Type any code with the buttons or W A S D. The Eagle Airstrike clears the bugs; a wrong direction clears your entry.');
    };
  });
})();
