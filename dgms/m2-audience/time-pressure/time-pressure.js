/* Time pressure, three ways (DGMS Module 2, Audience Demographics, deck slides 276-281: "Trap 3: Overuse of time pressure":
   stressful, artificial motivation, desensitising, filters). One corridor, three chasers, the same runner in each:
     fixed:  Ori and the Blind Forest's escapes. The threat moves at its own fixed speed; slower players are caught.
     rubber: Ori and the Will of the Wisps. The wall stays a fixed amount of time behind the player, whatever their speed:
             it only catches a player who stops for longer than that lag.
     mist:   Kirby's Return to Dreamland. A wall of mist that drags along behind a fast player (it never falls more
             than a screen behind) and hurts a slow one, but never ends the run.
   The corridor has three obstacles. The runner stops at each one for as long as the player takes to clear it
   (a skilled player hops it in a fraction of a second, a newer player fumbles for over a second), and the chaser
   keeps coming during that pause: the gap readout above each lane shrinks while the runner is stuck.
   The strip at the bottom runs every clearing time from 0.2 s to 2.0 s at the chosen run speed and colours the
   outcome, so the filter is visible: the fixed-speed chaser cuts off everyone who is slow at obstacles, the rubber
   band only someone who stalls longer than its lag, and the mist never ends the run.
   Numbers: all illustrative (the deck gives the three examples, not their speeds). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;

  /* ---------- tunables (all illustrative) ---------- */
  const N = {
    L: 48,              // corridor length, m
    v0: 10,             // the runner's speed at 100%, m/s
    obstacles: [12, 24, 36],   // obstacle positions, m; the runner stops just before each for the clearing time
    stopGap: 2,         // how far before an obstacle the runner stops (and lands after it), m
    fixed: { speed: 8, start: -8 },          // Ori 1: 8 m/s, 8 m head start -> slower than ~69% is caught
    rubber: { lag: 1.4 },                     // Ori 2: the wall replays the runner's path 1.4 s late
    mist: { speed: 7, start: -6, maxGap: 14, touch: .6, tick: .5 },  // Kirby: 7 m/s, never more than 14 m behind; a hit every 0.5 s in the mist
    rate: 1.4,          // sim seconds per real second in the tour and the replays
    clear: [.2, 2],     // the clearing-time strip, s
  };
  const KINDS = [
    { k: 'fixed', game: 'Ori and the Blind Forest', how: 'fixed-speed escape', col: '#2ea3dc', runner: '#e9f7ff' },
    { k: 'rubber', game: 'Ori and the Will of the Wisps', how: 'wall a fixed time behind', col: '#8a4fd6', runner: '#e9f7ff' },
    { k: 'mist', game: 'Kirby’s Return to Dreamland', how: 'mist that drags behind you', col: '#7d6c9e', runner: '#ff9ec7' },
  ];
  const apis = {};
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };

  /* ---------- the model: run one chaser until sim time tau ----------
     clear = seconds the player needs at each obstacle. The runner moves at v until it reaches the next obstacle, stands
     there for `clear` seconds, then carries on past it. */
  function run(kind, pct, clear, tau, dt = 1 / 120) {
    const v = N.v0 * pct / 100, hist = [];
    let t = 0, p = 0, next = 0, held = 0, c = kind === 'fixed' ? N.fixed.start : kind === 'mist' ? N.mist.start : -v * N.rubber.lag, hurt = 0, touchT = 0, caught = null, done = null, lost = 0;
    const posAt = tt => { if (tt <= 0) return v * tt;   // the runner was already running before the clip starts
      const i = Math.min(hist.length - 1, Math.floor(tt / dt)); return hist[i] ?? 0; };
    while (t < tau - 1e-9) {
      if (caught == null && done == null) {
        const ob = N.obstacles[next];
        if (ob != null && p >= ob - N.stopGap) { held += dt; lost += dt; if (held >= clear) { held = 0; next++; p = ob + N.stopGap; } }
        else p = Math.min(N.L, ob != null ? Math.min(ob - N.stopGap, p + v * dt) : p + v * dt);
        hist.push(p);
        if (kind === 'fixed') c += N.fixed.speed * dt;
        else if (kind === 'rubber') c = posAt(t + dt - N.rubber.lag);
        else { c = Math.max(c + N.mist.speed * dt, p - N.mist.maxGap); if (c >= p - N.mist.touch) { c = p - N.mist.touch; touchT += dt; if (touchT >= N.mist.tick) { hurt++; touchT -= N.mist.tick; } } else touchT = 0; }
        if (kind !== 'mist' && c >= p - .3) caught = { t: t + dt, at: p };
        else if (p >= N.L) done = t + dt;
      }
      t += dt;
    }
    const ob = N.obstacles[next];
    return { p, c, hurt, caught, done, lost, clearing: caught == null && done == null && ob != null && p >= ob - N.stopGap - 1e-6 ? { i: next, held, of: clear } : null };
  }
  // the whole run's outcome, for the strip
  const cache = {};
  function outcome(kind, pct, clear) {
    const key = [kind, pct, clear].join(); if (cache[key]) return cache[key];
    const tMax = N.L / (N.v0 * pct / 100) + clear * N.obstacles.length + 2;
    return (cache[key] = run(kind, pct, clear, tMax, 1 / 60));
  }
  const status = r => r.caught ? 'caught' : r.done != null ? (r.hurt ? 'hurt' : 'clear') : 'running';

  /* ---------- drawing ---------- */
  const X0 = 40, X1 = 1000, WMIN = -14, WMAX = N.L + 2;
  const wx = m => lerp(X0, X1, (m - WMIN) / (WMAX - WMIN));
  function chaser(g, kind, x, y, h, t) {
    g.save(); g.beginPath(); g.rect(X0, y, Math.max(0, x - X0), h); g.clip();
    if (kind === 'fixed') {
      const gr = g.createLinearGradient(x - 160, 0, x, 0); gr.addColorStop(0, 'rgba(46,163,220,.25)'); gr.addColorStop(1, 'rgba(46,163,220,.9)');
      g.fillStyle = gr; g.fillRect(X0, y, x - X0, h);
      g.strokeStyle = '#e9f7ff'; g.lineWidth = 3; g.beginPath();
      for (let yy = 0; yy <= h; yy += 4) g.lineTo(x - 4 + Math.sin(yy / 9 + t * 8) * 4, y + yy); g.stroke();
    } else if (kind === 'rubber') {
      const gr = g.createLinearGradient(x - 160, 0, x, 0); gr.addColorStop(0, 'rgba(138,79,214,.2)'); gr.addColorStop(1, 'rgba(110,40,150,.92)');
      g.fillStyle = gr; g.fillRect(X0, y, x - X0, h);
      g.fillStyle = '#4a1a6e'; for (let yy = 4; yy < h; yy += 14) { g.beginPath(); g.moveTo(x - 12, y + yy); g.lineTo(x + 4, y + yy + 6); g.lineTo(x - 12, y + yy + 12); g.fill(); }
    } else {
      for (let i = 0; i < 9; i++) { const yy = y + (i + .5) * h / 9, r = 22 + 6 * Math.sin(i * 2.1 + t * 3); g.fillStyle = 'rgba(125,108,158,.55)'; g.beginPath(); g.arc(x - 14 + Math.sin(i + t * 2) * 5, yy, r, 0, Math.PI * 2); g.fill(); }
      const gr = g.createLinearGradient(x - 200, 0, x - 10, 0); gr.addColorStop(0, 'rgba(70,55,100,.15)'); gr.addColorStop(1, 'rgba(90,72,128,.75)');
      g.fillStyle = gr; g.fillRect(X0, y, x - X0 - 10, h);
    }
    g.restore();
  }
  function lane(g, i, r, y, t, pct) {
    const K = KINDS[i], h = 70, cy = y + 34 + h / 2;
    txt(g, K.game, X0, y + 14, '800 17px Montserrat, Jost, sans-serif');
    g.font = '800 17px Montserrat, Jost, sans-serif'; const gw = g.measureText(K.game).width;
    txt(g, ' · ' + K.how, X0 + gw, y + 14, '600 16px Jost, sans-serif', C.muted);
    // corridor
    g.fillStyle = '#ece3cf'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(X0, y + 34, X1 - X0, h, 8); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(160,140,100,.35)'; g.lineWidth = 1; g.beginPath(); for (let m = 0; m <= N.L; m += 6) { g.moveTo(wx(m), y + 36); g.lineTo(wx(m), y + 32 + h); } g.stroke();
    T.flag(wx(N.L), cy + 18);
    // obstacles: a crate stack in the corridor
    N.obstacles.forEach(m => { const ox = wx(m); g.fillStyle = '#b07a3c'; g.strokeStyle = '#6b4520'; g.lineWidth = 2;
      [[-9, 18], [-9, -2], [-9, -22]].forEach(([dx, dy], k) => { if (k < 2) { g.beginPath(); g.rect(ox + dx, cy + dy - 2, 18, 18); g.fill(); g.stroke(); g.beginPath(); g.moveTo(ox + dx, cy + dy - 2); g.lineTo(ox + dx + 18, cy + dy + 16); g.stroke(); } }); });
    chaser(g, K.k, wx(r.c), y + 36, h - 4, t);
    const st = status(r), px = wx(r.p);
    // the gap: a bracket from the chaser's front to the runner, red while the runner is stuck at an obstacle
    if (st !== 'caught' && r.done == null) {
      const cx = Math.max(X0, wx(r.c)), gapM = r.p - r.c, stuck = !!r.clearing, gc = stuck ? C.red : C.muted, by = y + 44;
      if (px - cx > 24) { g.strokeStyle = gc; g.lineWidth = stuck ? 2.5 : 1.5; g.setLineDash(stuck ? [] : [4, 4]); g.beginPath(); g.moveTo(cx, by); g.lineTo(px - 20, by); g.moveTo(cx, by - 5); g.lineTo(cx, by + 5); g.stroke(); g.setLineDash([]); }
      const lab = `gap ${Math.max(0, gapM).toFixed(1)} m${stuck ? ', closing' : ''}`, f = `700 ${stuck ? 14 : 13}px Jost, sans-serif`;
      if (px - cx > 150) txt(g, lab, (cx + px - 20) / 2, by + 13, f, gc, 'center'); else T.label(lab, Math.max(X0 + 60, cx - 56), by + 12, 'center', gc, 13);
    }
    // the runner hops the crate at the end of the clearing time
    let hy = 0, hx = px;
    if (r.clearing) { const k = r.clearing.held / r.clearing.of, hk = clamp((k - .75) / .25); if (hk > 0) { hx = lerp(px, wx(N.obstacles[r.clearing.i] + N.stopGap), hk); hy = -Math.sin(hk * Math.PI) * 30; } }
    T.player(hx, cy + hy, 0, .85, st === 'caught' ? .4 : 1, K.k === 'mist' ? '#ff7fb3' : C.player);
    if (r.clearing) {   // a ring that fills while the player works out the obstacle
      const k = clamp(r.clearing.held / r.clearing.of); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 5; g.beginPath(); g.arc(hx, cy + hy, 25, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#e0a92d'; g.beginPath(); g.arc(hx, cy + hy, 25, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
    }
    // the outcome, on the right
    const msg = st === 'caught' ? `caught at ${Math.round(r.caught.at)} m` : st === 'running' && r.clearing ? `stuck at obstacle ${r.clearing.i + 1}: ${r.clearing.held.toFixed(1)} of ${r.clearing.of.toFixed(1)} s` : st === 'running' ? (r.hurt ? `${r.hurt} hit${r.hurt > 1 ? 's' : ''} from the mist` : '') : st === 'hurt' ? `through in ${r.done.toFixed(1)} s · ${r.hurt} hit${r.hurt > 1 ? 's' : ''}` : `through in ${r.done.toFixed(1)} s`;
    const col = st === 'caught' ? C.red : r.clearing || st === 'hurt' || r.hurt ? '#9a5a06' : C.good;
    if (msg) { g.font = '700 15px Jost, sans-serif'; txt(g, msg, X1, y + 14, '700 15px Jost, sans-serif', col, 'right'); }
    if (st === 'caught') T.stamp('CAUGHT', px, cy, C.red, 1, 22);
  }
  function strip(g, y, pct, clear) {
    const [a, b] = N.clear, sx0 = 250, sx1 = 1000, sx = c => lerp(sx0, sx1, (c - a) / (b - a)), step = .02;
    txt(g, 'Every player, from quick to slow at obstacles:', X0, y + 4, '800 16px Montserrat, Jost, sans-serif');
    KINDS.forEach((K, i) => {
      const yy = y + 26 + i * 30;
      txt(g, K.game.replace('Ori and the ', 'Ori: ').replace('’s Return to Dreamland', ''), X0, yy + 9, '600 14px Jost, sans-serif', C.ink);
      for (let c = a; c < b - 1e-9; c += step) {
        const o = outcome(K.k, pct, Math.round(c * 100) / 100), s = status(o);
        g.fillStyle = s === 'caught' ? '#e5322d' : s === 'hurt' ? '#e0a92d' : '#2fae63';
        g.fillRect(sx(c), yy, sx(c + step) - sx(c) + .5, 18);
      }
    });
    for (let c = .2; c <= 2.001; c += .2) if (Math.abs(c - clear) > .09) txt(g, c.toFixed(1) + ' s', sx(c), y + 26 + 3 * 30 + 6, '600 13px Jost, sans-serif', C.muted, 'center');
    const mx = sx(clear); g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, y + 20); g.lineTo(mx, y + 26 + 3 * 30 + 16); g.stroke();
    T.label('you: ' + clear.toFixed(1) + ' s per obstacle', mx, y + 26 + 3 * 30 + 30, 'center', C.navy, 13);
    [['through', '#2fae63'], ['through, hurt', '#e0a92d'], ['caught', '#e5322d']].forEach(([n, c], i) => { const lx = 600 + i * 132; g.fillStyle = c; g.fillRect(lx, y - 2, 14, 12); txt(g, n, lx + 20, y + 4, '600 13px Jost, sans-serif', C.ink); });
  }

  canvasDemo('chase', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, pct: 100, clear: .3, runT: 0, key: '' };
    const tourBtn = $(s, '.tp-tour'), sp = $(s, '.tp-speed'), sb = $(s, '.tp-clear');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    sp.oninput = () => { free(); st.pct = +sp.value; st.runT = 0; };
    sb.oninput = () => { free(); st.clear = +sb.value; st.runT = 0; };
    $(s, '.tp-replay').onclick = () => { free(); st.runT = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // the tour: three players at the same run speed, in sim seconds (speed %, clearing time s, run length)
    const TOUR = [[100, .3, 7.4], [100, .9, 8.6], [100, 1.7, 8.2]];
    const DUR = TOUR.reduce((a, r) => a + r[2], 0) / N.rate;
    function tourAt(t) { let tt = t * N.rate; for (const r of TOUR) { if (tt < r[2]) return { pct: r[0], clear: r[1], tau: tt }; tt -= r[2]; } const r = TOUR.at(-1); return { pct: r[0], clear: r[1], tau: r[2] }; }
    function render() {
      let { pct, clear } = st, tau = st.runT;
      if (st.tour) ({ pct, clear, tau } = tourAt(st.t));
      sp.value = pct; sb.value = clear;
      $(s, '.tp-sv').textContent = pct + '%'; $(s, '.tp-bv').textContent = clear.toFixed(1) + ' s' + (clear <= .4 ? ' (skilled)' : clear >= 1.4 ? ' (newer player)' : '');
      T.use(g); panel(g);
      const rs = KINDS.map(K => run(K.k, pct, clear, tau));
      rs.forEach((r, i) => lane(g, i, r, 14 + i * 122, tau, pct));
      strip(g, 408, pct, clear);
      const key = [pct, clear].join(); if (key === st.key) return; st.key = key;
      const os = KINDS.map(K => outcome(K.k, pct, clear));
      const cell = (o, cls) => o.caught ? `<b>caught</b>` : `<b>${o.done.toFixed(1)} s</b>`;
      say($(s, '.tp-stats'), KINDS.map((K, i) => { const o = os[i], sCls = o.caught ? 'r' : o.hurt ? 'y' : 'g'; return `<div class="${sCls}">${cell(o)}<span>${K.game.replace('Ori and the ', 'Ori: ')}${o.hurt ? ` · ${o.hurt} hit${o.hurt > 1 ? 's' : ''}` : ''}</span></div>`; }).join(''));
      say($(s, '.tp-out'), os[0].caught && os[1].caught
        ? `At ${clear.toFixed(1)} s per obstacle both Ori escapes catch you: the fixed one gains during every pause, and each pause is longer than the rubber band’s ${N.rubber.lag} s lag.`
        : os[0].caught
        ? `Each ${clear.toFixed(1)} s pause lets the fixed-speed escape gain ${(N.fixed.speed * clear).toFixed(1)} m, and it never gives that back. Only it catches you: it filters out players who are slow at obstacles, whatever the designer meant.`
        : os[2].hurt ? `Quick hops keep the Ori chasers behind you. The mist still catches up during each pause and lands ${os[2].hurt} hit${os[2].hurt > 1 ? 's' : ''}, but it never ends the run.`
        : `A skilled player clears each obstacle in ${clear.toFixed(1)} s: every chaser feels the same from inside. Slow the clearing time to see which one filters players out.`);
    }
    apis.chase = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => {
      dt = Math.max(0, Math.min(dt, .1));
      if (!st.held) { if (st.tour) { st.t += dt; if (st.t > DUR) st.t = 0; } else { st.runT += dt * N.rate; const end = N.L / (N.v0 * st.pct / 100) + st.clear * N.obstacles.length + 1.5; if (st.runT > end + 1.5) st.runT = 0; } }
      render();
    };
  });

  window.__seek = (t, w) => apis[w || 'chase'].seek(t);
  window.__dur = w => apis[w || 'chase'].dur();
})();
