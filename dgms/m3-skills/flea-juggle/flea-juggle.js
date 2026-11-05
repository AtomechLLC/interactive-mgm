/* Build the flea juggle (DGMS Module 3, Leveraging Player Skills; deck slides 17-19 and 250-278).
   Slide 1 starts from slide 18's simple test, one flea on one fixed arc and a hit key, and adds the deck's four tools for
   dynamic skill tests in any order: asynchrony (each flea its own launch force), input sensitivity (where you hit decides
   the new arc), multi-threading (1-3 fleas from different sides) and input RNG (the next wave is rolled before it arrives
   and shown, like Slay the Spire / Into the Breach intents). Slide 278 is Silksong's flea juggle, which uses all four.
   The counter multiplies what each tool adds to the situations a hit can be, and also counts the distinct situations the
   player actually met in the last minute (a signature taken at every hit).
   Slide 2 walks through each tool with Super Mario Bros. sprites: Podoboos on matching vs mismatched loops (asynchrony),
   jump height set by how long the button is held (input sensitivity), Goombas plus Bullet Bills (multi-threading) and a
   Hammer Bro whose rolled throw is hidden vs shown (output vs input RNG), with the deck's examples beside each one.
   Deck numbers: the four tools, "8 positions", "28 possible combinations". Everything else in P is illustrative tuning.
   Slide 1 art is original, drawn in code; slide 2 sprites: Super Mario Bros. (Nintendo, 1985), see ../img/skill-tools/. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2;

  const P = {
    G: 1000,                       // gravity, px/s²
    HIT_Y: 470, FLOOR: 540,        // racket height and the floor
    SPEED: 1150,                   // player run speed, px/s
    T_BASE: 1.5,                   // flight time of the fixed arc (s)
    T_ASYNC: [1.2, 1.5, 1.8],      // asynchrony: the three launch forces, as flight times
    LANES: { L: 260, C: 520, R: 780 },
    ZONES: [140, 330, 520, 710, 900],   // input sensitivity: the five landing spots the counter counts
    REACH: 46, HIT_DY: 28,         // hit box half-width and half-height around the racket
    SWING: .16,                    // a swing stays live this long (s)
    SENS_K: 6.5,                   // input sensitivity: landing shift per px of racket offset
    HITS_TO_SAVE: 4,               // the fourth hit sends a flea home
    WAVE_GAP: .8, STAGGER: .5,     // pause before the next wave; delay between fleas in a wave
    TOUR: [4, 8, 12, 16], DUR: 20, // walk-through: tools switch on at these times
    DT: 1 / 120,
  };
  const TOOLS = [['async', 'Asynchrony'], ['sens', 'Input sensitivity'], ['threads', 'Multi-threading'], ['rng', 'Input RNG']];
  const SIDES = ['L', 'C', 'R'];
  const ENTRY = { L: [36, 300], C: [520, 96], R: [1004, 300] };
  const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

  // what each tool multiplies into the situations one hit can be
  function possible(on) {
    const F = on.async ? P.T_ASYNC.length : 1;
    const S = on.sens ? P.ZONES.length : (on.threads || on.rng) ? 3 : 1;
    const L = on.threads ? choose(S, 1) + choose(S, 2) + choose(S, 3) : S;
    const I = on.rng ? (on.threads ? 7 : 3) : 1;
    return { F, S, L, I, total: F * L * I };
  }

  /* ---------- the simulation: a deterministic function of the inputs ---------- */
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  function newSim(seed = 7) {
    return { t: 0, px: 520, tx: 520, swing: -9, fleas: [], pending: [], waveAt: .3, next: null, r: rng(seed), id: 0,
      hits: 0, saved: 0, dropped: 0, log: [], fx: [], banner: null };
  }
  function rollWave(sim, on) {
    if (!on.threads) return [SIDES[Math.floor(sim.r() * 3)]];
    const n = 1 + Math.floor(sim.r() * 3), pool = SIDES.slice(), out = [];
    while (out.length < n) out.push(pool.splice(Math.floor(sim.r() * pool.length), 1)[0]);
    return SIDES.filter(s => out.includes(s));
  }
  function launch(f, tx, T0) { f.vx = (tx - f.x) / T0; f.vy = -P.G * T0 / 2; }
  function toss(sim, side, on) {
    const [sx, sy] = ENTRY[side], ex = on.threads || on.rng ? P.LANES[side] : P.LANES.C, TT = side === 'C' ? 1.0 : 1.1;
    const f = { id: ++sim.id, side, home: ex, x: sx, y: sy, vx: (ex - sx) / TT, vy: (P.HIT_Y - sy - .5 * P.G * TT * TT) / TT,
      force: Math.floor(sim.r() * P.T_ASYNC.length), hits: 0, state: 'air', plan: null, trail: [] };
    if (side === 'C') { f.x = ex; f.vx = 0; }
    sim.fleas.push(f);
  }
  // time until a flea comes down through the racket height, and where
  function arrival(f) {
    const a = .5 * P.G, b = f.vy, c = f.y - P.HIT_Y, d = b * b - 4 * a * c;
    if (d < 0) return null;
    const tau = (-b + Math.sqrt(d)) / (2 * a);
    if (tau < 0) return null;
    let x = f.x + f.vx * tau;
    if (x < 30) x = 60 - x; if (x > W - 30) x = 2 * (W - 30) - x;
    return { tau, x };
  }
  const bin = (x, on) => {
    const pts = on.sens ? P.ZONES : (on.threads || on.rng) ? [P.LANES.L, P.LANES.C, P.LANES.R] : [P.LANES.C];
    let bi = 0; pts.forEach((p, i) => { if (Math.abs(p - x) < Math.abs(pts[bi] - x)) bi = i; }); return bi;
  };

  function step(sim, on, input) {
    const dt = P.DT; sim.t += dt;
    // waves: when the arena is empty, the next wave is tossed in
    const live = sim.fleas.filter(f => f.state === 'air');
    if (!live.length && !sim.pending.length && sim.waveAt == null) sim.waveAt = sim.t + P.WAVE_GAP;
    if (sim.waveAt != null && sim.t >= sim.waveAt) {
      const sides = on.rng && sim.next ? sim.next : on.threads ? SIDES.slice() : ['C'];
      sides.forEach((s, i) => sim.pending.push({ side: s, at: sim.t + i * P.STAGGER }));
      sim.next = rollWave(sim, on); sim.waveAt = null;
    }
    sim.pending = sim.pending.filter(p => { if (sim.t >= p.at) { toss(sim, p.side, on); return false; } return true; });

    // auto-player: run under the next flea to come down, offset so it lands on a chosen spot
    if (input.auto) {
      let best = null;
      sim.fleas.forEach(f => { if (f.state !== 'air') return; const a = arrival(f); if (a && f.vy > -9999 && (!best || a.tau < best.a.tau)) best = { f, a }; });
      if (best) {
        const { f, a } = best;
        if (f.plan == null) f.plan = on.sens ? Math.floor(sim.r() * P.ZONES.length) : -1;
        const off = on.sens && f.plan >= 0 ? clamp((P.ZONES[f.plan] - a.x) / P.SENS_K, -P.REACH * .8, P.REACH * .8) : 0;
        sim.tx = clamp(a.x - off, 40, W - 40);
        if (Math.abs(f.y - P.HIT_Y) < 10 && f.vy > 0 && Math.abs(f.x - sim.px) < P.REACH) sim.swing = sim.t;
      }
    } else {
      sim.tx = clamp(input.tx, 40, W - 40);
      if (input.swing) sim.swing = sim.t;
    }
    const d = sim.tx - sim.px; sim.px += Math.sign(d) * Math.min(Math.abs(d), P.SPEED * dt);

    const swingLive = sim.t - sim.swing < P.SWING;
    sim.fleas.forEach(f => {
      f.vy += P.G * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.state === 'air') {
        if (f.x < 30 && f.vx < 0 || f.x > W - 30 && f.vx > 0) f.vx *= -1;
        f.trail.push([f.x, f.y]); if (f.trail.length > 30) f.trail.shift();
        if (swingLive && f.vy > 0 && Math.abs(f.y - P.HIT_Y) < P.HIT_DY && Math.abs(f.x - sim.px) < P.REACH) {
          f.hits++; sim.hits++; f.plan = null;
          const T0 = on.async ? P.T_ASYNC[f.force] : P.T_BASE;
          // the situation the player just answered: this flea's force, where every flea is, and the next wave shown
          const others = sim.fleas.filter(g => g.state === 'air').map(g => bin(g.x, on)).sort().join('');
          sim.log.push([sim.t, [on.async ? f.force : 0, others, on.rng && sim.next ? sim.next.join('') : '-'].join('|')]);
          if (f.hits >= P.HITS_TO_SAVE) { f.state = 'home'; f.vx = (f.x < W / 2 ? -1 : 1) * 120; f.vy = -1250; sim.saved++; sim.fx.push(['save', f.x, f.y, sim.t]); }
          else {
            const tx = on.sens ? clamp(f.x + (f.x - sim.px) * P.SENS_K, 80, W - 80) : f.home;
            launch(f, tx, T0); sim.fx.push(['hit', f.x, f.y, sim.t]);
          }
        } else if (f.y > P.FLOOR) { f.state = 'drop'; f.y = P.FLOOR; f.vx = f.vy = 0; f.at = sim.t; sim.dropped++; sim.fx.push(['drop', f.x, P.FLOOR, sim.t]); }
      }
      if (f.state === 'drop') { f.vx = f.vy = 0; f.y = P.FLOOR; }
    });
    sim.fleas = sim.fleas.filter(f => f.state === 'air' || (f.state === 'home' && f.y > -60) || (f.state === 'drop' && sim.t - f.at < .8));
    sim.fx = sim.fx.filter(e => sim.t - e[3] < 1);
    sim.log = sim.log.filter(e => sim.t - e[0] < 60);
  }
  const metPerMin = sim => new Set(sim.log.map(e => e[1])).size;

  /* ---------- drawing ---------- */
  function flea(g, x, y, ang, s = 1, a = 1, ghost = false) {
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(ang); g.scale(s, s);
    if (ghost) {
      g.setLineDash([4, 4]); g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 0, 17, 13, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      g.restore(); return;
    }
    g.strokeStyle = '#5a2e12'; g.lineWidth = 2.5; g.lineCap = 'round';
    [[-6, 9, -12, 17], [2, 10, -2, 19], [8, 8, 12, 17]].forEach(([a1, b1, a2, b2]) => { g.beginPath(); g.moveTo(a1, b1); g.lineTo(a2, b2); g.stroke(); });
    g.fillStyle = '#d27b33'; g.strokeStyle = '#6b3510'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(0, 0, 17, 13, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(107,53,16,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(-4, -2, 11, -1.2, 1.2); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(9, -3, 6, 0, TAU); g.fill();
    g.fillStyle = '#1b1b2a'; g.beginPath(); g.arc(11, -3, 3, 0, TAU); g.fill();
    g.strokeStyle = '#6b3510'; g.lineWidth = 2; g.beginPath(); g.moveTo(12, -11); g.quadraticCurveTo(18, -20, 24, -18); g.stroke();
    g.restore();
  }
  function hero(g, x, swingK) {
    const y = P.FLOOR;
    T.shadow(x, y + 4, 26, 6, .25);
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(x - 22, y); g.quadraticCurveTo(x - 16, y - 40, x, y - 46); g.quadraticCurveTo(x + 16, y - 40, x + 22, y); g.closePath(); g.fill();
    g.fillStyle = C.gold; g.fillRect(x - 13, y - 38, 26, 6);
    g.fillStyle = '#f4ede0'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y - 54, 13, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.arc(x - 4.5, y - 55, 2.6, 0, TAU); g.arc(x + 4.5, y - 55, 2.6, 0, TAU); g.fill();
    g.strokeStyle = '#f4ede0'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - 7, y - 64); g.lineTo(x - 11, y - 80); g.moveTo(x + 7, y - 64); g.lineTo(x + 11, y - 80); g.stroke();
    // the needle: rests at the side, sweeps up through the hit box on a swing
    const ang = lerp(.9, -1.9, swingK);
    g.save(); g.translate(x + 14, y - 34); g.rotate(ang);
    g.strokeStyle = '#9a5a06'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -46); g.stroke();
    g.strokeStyle = C.gold; g.lineWidth = 3.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -46); g.stroke(); g.restore();
    if (swingK > 0 && swingK < 1) {
      g.strokeStyle = `rgba(255,185,81,${.7 * (1 - swingK)})`; g.lineWidth = 8;
      g.beginPath(); g.arc(x + 14, y - 34, 50, -Math.PI / 2 - 1.9, -Math.PI / 2 + .9 - 2.8 * swingK, true); g.stroke();
    }
  }
  function chip(g, x, y, text, on, n) {
    g.font = '700 16px Montserrat, Jost, sans-serif';
    const w = g.measureText(text).width + 50;
    g.fillStyle = on ? C.navy : 'rgba(255,252,244,.9)'; g.strokeStyle = on ? C.navy : '#cdbf9f'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, y - 17, w, 34, 17); g.fill(); g.stroke();
    g.fillStyle = on ? C.gold : '#cdbf9f'; g.beginPath(); g.arc(x + 17, y, 11, 0, TAU); g.fill();
    g.fillStyle = on ? C.navy : '#fff'; g.font = '800 13px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x + 17, y + 1);
    g.fillStyle = on ? '#fff' : C.muted; g.font = '700 16px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText(text, x + 34, y + 1);
    return w;
  }
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };

  function drawArena(g, sim, on, extra) {
    T.use(g); g.clearRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f3ead6'); bg.addColorStop(1, '#e6d8b8');
    g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    // cave backdrop: hanging roots and far pillars
    g.fillStyle = 'rgba(93,97,140,.10)';
    [[90, 160], [300, 110], [610, 140], [880, 120]].forEach(([x, h]) => { g.beginPath(); g.moveTo(x - 40, 0); g.quadraticCurveTo(x, h * 1.6, x + 40, 0); g.fill(); });
    [[180, 260], [450, 200], [760, 240], [980, 210]].forEach(([x, h]) => { g.beginPath(); g.roundRect(x - 22, P.FLOOR - h, 44, h, 18); g.fill(); });
    // floor
    g.fillStyle = '#b9a47c'; g.fillRect(0, P.FLOOR, W, H - P.FLOOR);
    g.fillStyle = '#8f7b55'; g.fillRect(0, P.FLOOR, W, 4);
    // landing marks: one centre spot, three lanes, or five zones
    const marks = on.sens ? P.ZONES : (on.threads || on.rng) ? [P.LANES.L, P.LANES.C, P.LANES.R] : [P.LANES.C];
    marks.forEach(x => { g.fillStyle = 'rgba(38,44,106,.18)'; g.beginPath(); g.ellipse(x, P.FLOOR + 1, 34, 6, 0, 0, TAU); g.fill(); });

    // header: the tools and the multiplication
    let x = 18; TOOLS.forEach(([k, n], i) => { x += chip(g, x, 28, n, on[k], i + 1) + 10; });
    const p = possible(on);
    const parts = [`${p.F} force${p.F > 1 ? 's' : ''}`, on.threads ? `${p.L} layouts of 1-3 fleas over ${p.S} spots` : `${p.S} landing spot${p.S > 1 ? 's' : ''}`, `${p.I} wave${p.I > 1 ? 's' : ''} shown`];
    txt(g, 'Situations a hit can be:', 20, 70, '600 17px Jost, sans-serif', C.muted);
    g.font = '600 17px Jost, sans-serif'; const lw = g.measureText('Situations a hit can be:').width;
    txt(g, parts.join(' × ') + ' = ', 28 + lw, 70, '700 17px Jost, sans-serif', C.ink);
    g.font = '700 17px Jost, sans-serif'; const pw = g.measureText(parts.join(' × ') + ' = ').width;
    txt(g, String(p.total), 28 + lw + pw, 70, '800 22px Montserrat, Jost, sans-serif', p.total > 1 ? C.good : C.red);

    // input RNG: the next wave's intent, shown at its entry points
    if (on.rng && sim.next) {
      txt(g, `next wave: ${sim.next.length} flea${sim.next.length > 1 ? 's' : ''}`, W - 20, 70, '700 16px Montserrat, Jost, sans-serif', C.red, 'right');
      sim.next.forEach(s => {
        const [ex, ey] = ENTRY[s], bob = Math.sin(sim.t * 5) * 3;
        const gx = ex + (s === 'L' ? 22 : s === 'R' ? -22 : 0), gy = ey + 30 + bob;
        g.fillStyle = 'rgba(229,50,45,.12)'; g.beginPath(); g.arc(gx, gy, 26, 0, TAU); g.fill();
        flea(g, gx, gy, 0, 1.1, 1, true); T.label('next', gx, gy - 38, 'center', C.red, 13);
        g.fillStyle = C.red; g.beginPath();
        if (s === 'C') { g.moveTo(ex - 8, ey + 56); g.lineTo(ex + 8, ey + 56); g.lineTo(ex, ey + 68); }
        else { const dx = s === 'L' ? 1 : -1; g.moveTo(ex + dx * 52, ey + 22); g.lineTo(ex + dx * 52, ey + 38); g.lineTo(ex + dx * 64, ey + 30); }
        g.fill();
      });
    }

    // hit box
    const sk = clamp((sim.t - sim.swing) / P.SWING);
    g.strokeStyle = 'rgba(46,163,220,.5)'; g.setLineDash([6, 6]); g.lineWidth = 2;
    g.beginPath(); g.roundRect(sim.px - P.REACH, P.HIT_Y - P.HIT_DY, P.REACH * 2, P.HIT_DY * 2, 12); g.stroke(); g.setLineDash([]);
    if (on.sens) { g.fillStyle = 'rgba(46,163,220,.5)'; g.fillRect(sim.px - 1, P.HIT_Y - P.HIT_DY, 2, P.HIT_DY * 2); }
    hero(g, sim.px, sk < 1 ? sk : 0);

    // fleas
    sim.fleas.forEach(f => {
      if (f.state === 'air') T.trail(f.trail.filter((_, i) => i % 3 === 0), '#c9a271', .7, 3);
      const ang = f.state === 'drop' ? Math.PI : Math.atan2(f.vy, f.vx) * .35;
      flea(g, f.x, f.state === 'drop' ? P.FLOOR - 8 : f.y, f.state === 'drop' ? 0 : ang, 1, f.state === 'drop' ? clamp(1 - (sim.t - f.at) / .8) : 1);
      if (f.state === 'air') for (let i = 0; i < P.HITS_TO_SAVE; i++) { g.fillStyle = i < f.hits ? C.gold : 'rgba(38,44,106,.25)'; g.beginPath(); g.arc(f.x - 12 + i * 8, f.y - 24, 3, 0, TAU); g.fill(); }
    });
    sim.fx.forEach(([k, fx, fy, t0]) => {
      const a = sim.t - t0;
      if (k === 'hit') T.popText('hit', fx, fy - 30 - a * 40, C.ink, 1 - a * 1.4);
      if (k === 'save') T.popText('home!', fx, Math.max(110, fy - 30 - a * 60), '#1a8a4c', 1 - a);
      if (k === 'drop') { T.poof(fx, fy - 6, a, 26); T.popText('dropped', fx, fy - 40, C.red, 1 - a); }
    });

    // floor readout
    txt(g, `hits ${sim.hits}  ·  sent home ${sim.saved}  ·  dropped ${sim.dropped}`, 20, 563, '700 16px Jost, sans-serif', '#fffaf0');
    txt(g, `distinct situations met in the last minute: ${metPerMin(sim)}`, W - 20, 563, '700 16px Jost, sans-serif', '#fffaf0', 'right');
    if (extra) extra();
  }

  const apis = {};
  /* ---------- slide 1: the juggle ---------- */
  canvasDemo('juggle', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, on: { async: false, sens: false, threads: false, rng: false }, auto: true, sim: newSim(), acc: 0, key: '',
      tx: 520, swing: false, keys: {} };
    const tourBtn = $(s, '.fj-tour'), autoIn = $(s, '.fj-auto'), boxes = $$(s, '.fj-t');
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); };
    boxes.forEach(b => b.onchange = () => { free(); st.on[b.dataset.k] = b.checked; st.sim.log = []; });
    autoIn.onchange = () => { free(); st.auto = autoIn.checked; };
    $(s, '.fj-reset').onclick = () => { st.sim = newSim(); st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.sim = newSim(); st.auto = true; autoIn.checked = true; tourBtn.classList.add('on'); };
    const toPlay = () => { free(); if (st.auto) { st.auto = false; autoIn.checked = false; } };
    cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); st.tx = (e.clientX - r.left) / r.width * W; if (!st.auto) free(); });
    cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); st.tx = (e.clientX - r.left) / r.width * W; toPlay(); st.swing = true; });
    addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.target.closest?.('input, textarea')) return;
      const k = e.key.toLowerCase();
      if (k === 'j') { toPlay(); st.swing = true; }
      if (k === 'a' || k === 'd') { toPlay(); st.keys[k] = true; }
    });
    addEventListener('keyup', e => { st.keys[e.key.toLowerCase()] = false; });

    const tourOn = t => ({ async: t >= P.TOUR[0], sens: t >= P.TOUR[1], threads: t >= P.TOUR[2], rng: t >= P.TOUR[3] });
    function advance(dt) {
      st.acc += dt;
      while (st.acc >= P.DT) {
        st.acc -= P.DT;
        const on = st.tour ? tourOn(st.sim.t) : st.on;
        if (st.keys.a) st.tx = st.sim.px - 60; if (st.keys.d) st.tx = st.sim.px + 60;
        step(st.sim, on, { auto: st.tour || st.auto, tx: st.tx, swing: st.swing });
        st.swing = false;
      }
    }
    function render() {
      const on = st.tour ? tourOn(st.sim.t) : st.on;
      if (st.tour) boxes.forEach(b => b.checked = on[b.dataset.k]);
      drawArena(g, st.sim, on, () => {
        if (!st.tour) return;
        const i = P.TOUR.findIndex(t => st.sim.t >= t && st.sim.t < t + 1.6);
        if (i >= 0) T.stamp('+ ' + TOOLS[i][1], W / 2, 150, C.ink, clamp((P.TOUR[i] + 1.6 - st.sim.t) / .4), 30);
        else if (st.sim.t < 2.2) T.stamp('the simple test: one flea, one arc', W / 2, 150, C.muted, clamp((2.2 - st.sim.t) / .4), 26);
      });
      const p = possible(on), met = metPerMin(st.sim), n = st.sim.log.length;
      const key = [JSON.stringify(on), met, n, st.sim.dropped, st.sim.saved].join(); if (key === st.key) return; st.key = key;
      say($(s, '.fj-stats'), `<div><b>${p.total}</b><span>situations a hit can be (${p.F} × ${p.L} × ${p.I})</span></div>`
        + `<div class="g"><b>${met}</b><span>distinct ones met in the last minute, over ${n} hits</span></div>`
        + `<div class="${st.sim.dropped ? 'r' : 'y'}"><b>${st.sim.saved}/${st.sim.dropped}</b><span>fleas sent home / dropped</span></div>`);
      const count = TOOLS.filter(([k]) => on[k]).length;
      say($(s, '.fj-out'), count === 0
        ? 'One flea on one arc is the simple test: like the red/green reaction test, it measures timing well, but every hit is the same situation, so there is nothing to decide.'
        : count === 4 ? 'All four tools on: forces drift, you aim each hit, up to three fleas share the air and the next wave is shown in advance. That is the Silksong flea juggle.'
        : `${TOOLS.filter(([k]) => on[k]).map(([, n]) => n).join(' + ')}: ${p.total} possible situations. Each tool adds variety on its own, and together they multiply.`);
    }
    apis.juggle = {
      seek(t) { st.held = st.tour = true; st.sim = newSim(); st.acc = 0; advance(t); st.key = ''; render(); },
      dur: () => P.DUR,
    };
    return dt => {
      if (!st.held) { advance(Math.min(Math.max(0, dt), .1)); if (st.tour && st.sim.t > P.DUR) st.sim = newSim(); }
      render();
    };
  });

  /* ---------- slide 2: the four tools, one Mario scene each ----------
     Every tab is the same player (Super Mario Bros. Mario) against one obstacle design, played as a short walk-through
     with numbered steps: first the simple version, then the same obstacles with the tool switched on. The header gives
     the deck's definition and the caption narrates what is happening on screen. Each scene is a pure function of the
     tab's local time (the small sims replay from the step start), so __seek can record it frame by frame. */
  function panel(g) { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }
  const IMG2 = {};
  ['smb-mario', 'smb-mario-walk1', 'smb-mario-walk2', 'smb-mario-walk3', 'smb-mario-jump', 'smb-mario-dead', 'smb-goomba', 'smb-goomba-step',
    'smb-bullet-bill', 'smb-hammer-bro-0', 'smb-hammer-bro-1', 'smb-hammer-bro-2', 'smb-hammer-0', 'smb-hammer-1', 'smb-hammer-2', 'smb-hammer-3',
    'smb-ground', 'smb-brick', 'smb-block', 'smb-qblock', 'smb-coin', 'podoboo', 'lava', 'castle-ground']
    .forEach(k => { const im = new Image(); im.src = `../img/skill-tools/${k}.png`; IMG2[k] = im; });
  const PX = 3, SKY = '#5c94fc', SCN = { x: 20, y: 96, w: W - 40, h: 396 }, GY = 444;   // GY: top of the ground
  // draws a sprite with its feet at (x, y)
  function spr(g, k, x, y, o = {}) {
    const im = IMG2[k]; if (!im || !im.complete || !im.naturalWidth) return;
    const s = o.s || PX, w = im.naturalWidth * s, h = im.naturalHeight * s;
    g.save(); g.globalAlpha *= o.a ?? 1; g.imageSmoothingEnabled = false; g.translate(x, y - h / 2);
    if (o.rot) g.rotate(o.rot);
    g.scale(o.flip ? -1 : 1, 1); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
  }
  function tileRow(g, k, x0, x1, y, rows = 1) {
    const im = IMG2[k]; if (!im || !im.complete || !im.naturalWidth) return;
    const s = im.naturalWidth * PX;
    g.save(); g.imageSmoothingEnabled = false; g.beginPath(); g.rect(x0, y, x1 - x0, rows * s); g.clip();
    for (let r = 0; r < rows; r++) for (let x = x0; x < x1; x += s) g.drawImage(im, x, y + r * s, s, im.naturalHeight * PX);
    g.restore();
  }
  function wrap(g, s, x, y, maxW, lh, font, col) {
    g.font = font; const words = s.split(' '); let line = '', yy = y;
    words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { txt(g, line, x, yy, font, col); line = w; yy += lh; } else line = t; });
    if (line) txt(g, line, x, yy, font, col);
  }
  function tag(g, s, x, y, col = C.ink, bg = 'rgba(255,252,244,.94)', size = 15) {
    g.font = `700 ${size}px Jost, sans-serif`; const w = g.measureText(s).width + 16;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - 13, w, 26, 8); g.fill();
    txt(g, s, x, y + 1, `700 ${size}px Jost, sans-serif`, col, 'center');
  }
  const walkFrame = x => ['smb-mario-walk1', 'smb-mario-walk2', 'smb-mario-walk3'][Math.floor(x / 14) % 3];
  // a jump as two half-parabolas through the start, the peak and the landing
  function arc(x0, y0, x1, y1, peak, k) {
    const rise = y0 - peak, fall = y1 - peak, sp = Math.sqrt(rise) / (Math.sqrt(rise) + Math.sqrt(Math.max(fall, 0)));
    const y = k < sp ? y0 - rise * (1 - (1 - k / sp) ** 2) : peak + fall * ((k - sp) / (1 - sp)) ** 2;
    return [lerp(x0, x1, k), y];
  }

  /* --- 1. Asynchrony: three lava pits, a Podoboo in each ---------------------------------------------------------- */
  const PITS = [[250, 346], [500, 596], [750, 846]], POD_UP = .9, POD_H = 170, M_RUN = 240, M_JUMP = .5, FLAG_X = 960;
  const POD_SETS = [{ per: [2, 2, 2], off: [0, 1.08, .16] }, { per: [2, 3, 4], off: [0, .9, 2.3] }];
  const podPhase = (set, i, t) => ((t + set.off[i]) % set.per[i] + set.per[i]) % set.per[i];
  const podY = (set, i, t) => { const p = podPhase(set, i, t); return p < POD_UP ? GY + 40 - (POD_H + 40) * Math.sin(Math.PI * p / POD_UP) : null; };
  // safe to jump pit i when its Podoboo stays in the lava for the whole jump
  const podSafe = (set, i, t) => { const p = podPhase(set, i, t); return p >= POD_UP && set.per[i] - p >= M_JUMP + .08; };
  function asyncSim(set, T) {
    const m = { x: 60, y: GY, mode: 'run', pit: 0, jt: 0, wait: 0, waits: [], runs: [], pause: 0 };
    for (let t = 0; t < T; t += 1 / 60) {
      const dt = 1 / 60;
      // a new run starts on the next even second, so with matching loops every run meets the same phases
      if (m.mode === 'pause') { m.pause -= dt; if (m.pause <= 0 && (t % 2 < dt || 2 - t % 2 < dt / 2)) Object.assign(m, { x: 60, mode: 'run', pit: 0, waits: [] }); continue; }
      if (m.mode === 'jump') {
        m.jt += dt; const [a, b] = PITS[m.pit], k = clamp(m.jt / M_JUMP);
        [m.x, m.y] = arc(a - 22, GY, b + 22, GY, GY - 90, k);
        if (k >= 1) { m.mode = 'run'; m.y = GY; m.pit++; }
        continue;
      }
      if (m.mode === 'wait') {
        if (podSafe(set, m.pit, t)) { m.waits.push(m.wait); m.mode = 'jump'; m.jt = 0; } else m.wait += dt;
        continue;
      }
      m.x += M_RUN * dt;
      if (m.pit < 3 && m.x >= PITS[m.pit][0] - 22) { m.x = PITS[m.pit][0] - 22; m.mode = 'wait'; m.wait = 0; }
      if (m.pit === 3 && m.x >= FLAG_X - 20) { m.runs.push(m.waits.slice()); m.mode = 'pause'; m.pause = .7; }
    }
    return m;
  }
  function drawAsync(g, t, step) {
    const set = POD_SETS[step], m = asyncSim(set, t);
    g.fillStyle = '#000'; g.fillRect(SCN.x, SCN.y, SCN.w, SCN.h);
    // ground with three pits of lava
    let x = SCN.x;
    PITS.forEach(([a, b]) => { tileRow(g, 'castle-ground', x, a, GY, 2); tileRow(g, 'lava', a, b, GY + 18, 1); x = b; });
    tileRow(g, 'castle-ground', x, SCN.x + SCN.w, GY, 2);
    // flag
    g.fillStyle = '#d8d8d8'; g.fillRect(FLAG_X + 8, GY - 150, 5, 150); g.fillStyle = '#2fae63';
    g.beginPath(); g.moveTo(FLAG_X + 13, GY - 148); g.lineTo(FLAG_X + 55, GY - 130); g.lineTo(FLAG_X + 13, GY - 112); g.fill();
    // each Podoboo and its loop clock
    PITS.forEach(([a, b], i) => {
      const cx = (a + b) / 2, y = podY(set, i, t), p = podPhase(set, i, t) / set.per[i];
      if (y !== null) { const up = Math.cos(Math.PI * podPhase(set, i, t) / POD_UP) > 0; spr(g, 'podoboo', cx, y + 24, { rot: up ? 0 : Math.PI }); }
      const ky = 138;
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 6; g.beginPath(); g.arc(cx, ky, 16, 0, TAU); g.stroke();
      g.strokeStyle = y !== null ? '#ff6a3d' : '#ffd36b'; g.beginPath(); g.arc(cx, ky, 16, -Math.PI / 2, -Math.PI / 2 + TAU * p); g.stroke();
      txt(g, `every ${set.per[i]} s`, cx, ky + 32, '700 15px Jost, sans-serif', '#ffe2a8', 'center');
    });
    // Mario
    const k = m.mode === 'jump' ? 'smb-mario-jump' : m.mode === 'run' ? walkFrame(m.x) : 'smb-mario';
    spr(g, k, m.x, m.y);
    if (m.mode === 'wait' && m.wait > .12) tag(g, `waits ${m.wait.toFixed(1)} s`, m.x, m.y - 70, '#8a3b00');
    // the waits, run by run
    const rows = m.runs.slice(-3), x0 = 40, y0 = 196;
    txt(g, 'Mario’s wait at pits 1 · 2 · 3', x0, y0, '700 15px Jost, sans-serif', '#ffffff');
    rows.forEach((w, r) => txt(g, `run ${m.runs.length - rows.length + r + 1}:  ${w.map(v => v.toFixed(1) + ' s').join(' · ')}`, x0, y0 + 24 + r * 22, '600 15px Jost, sans-serif', '#d9e1ff'));
    if (rows.length >= 2) {
      const same = rows.every(w => w.every((v, i) => Math.abs(v - rows[0][i]) < .05));
      txt(g, same ? '→ the same every run' : '→ different every run', x0, y0 + 24 + rows.length * 22 + 4, '800 15px Jost, sans-serif', same ? '#ffd36b' : '#7ee0a0');
    }
    return { runs: m.runs.length };
  }

  /* --- 2. Input sensitivity: how long jump is held ------------------------------------------------------------------ */
  const SENS_X0 = 170, JUMPS = [
    { hold: .1, word: 'tap', x1: 420, y1: GY, peak: GY - 70, col: '#ffb951' },
    { hold: .25, word: 'half hold', x1: 600, y1: GY - 144, peak: GY - 200, col: '#2fae63' },
    { hold: .45, word: 'full hold', x1: 820, y1: GY - 288, peak: GY - 330, col: '#e5322d' },
  ], SENS_CYC = 2.5;
  function drawSens(g, t, step) {
    g.fillStyle = SKY; g.fillRect(SCN.x, SCN.y, SCN.w, SCN.h);
    tileRow(g, 'smb-ground', SCN.x, SCN.x + SCN.w, GY, 2);
    tileRow(g, 'smb-brick', 552, 696, GY - 144, 1);     // the low ledge
    tileRow(g, 'smb-block', 744, 936, GY - 288, 1);     // the high ledge
    const n = Math.floor(t / SENS_CYC), lt = t - n * SENS_CYC, i = Math.min(n, 2), J = step === 0 ? JUMPS[1] : JUMPS[i], press = JUMPS[i];
    // coin on the high ledge, collected by the full hold
    const gotCoin = step === 1 && (n > 2 || (n === 2 && lt > 1.35));
    if (!gotCoin) spr(g, 'smb-coin', 880, GY - 288 - 6);
    // the Goomba between Mario and the ledges
    spr(g, Math.floor(t * 4) % 2 ? 'smb-goomba' : 'smb-goomba-step', 300, GY);
    // trails of the jumps already made
    for (let q = 0; q < Math.min(n, 3); q++) {
      const P2 = step === 0 ? JUMPS[1] : JUMPS[q], pts = [];
      for (let k = 0; k <= 1.001; k += .04) pts.push(arc(SENS_X0, GY, P2.x1, P2.y1, P2.peak, k));
      T.trail(pts, step === 0 ? '#ffffff' : P2.col, .55, 3);
    }
    // the jump in progress: press (0-.35 s), flight (.35-1.35 s), landed
    const fk = clamp((lt - .35) / 1), pts = [];
    if (n < 3) {
      for (let k = 0; k <= fk; k += .04) pts.push(arc(SENS_X0, GY, J.x1, J.y1, J.peak, k));
      if (pts.length > 1) T.trail(pts, step === 0 ? '#ffffff' : J.col, 1, 4);
      const [mx, my] = arc(SENS_X0, GY, J.x1, J.y1, J.peak, fk);
      spr(g, fk > 0 && fk < 1 ? 'smb-mario-jump' : 'smb-mario', mx, my);
      if (fk >= 1) tag(g, step === 0 ? `${press.word} → the same jump` : `${press.word} → ${['hops the Goomba', 'lands on the bricks', 'reaches the coin'][i]}`, mx, my - 70, step === 0 ? C.ink : J.col);
    } else {
      spr(g, 'smb-mario', JUMPS[step === 0 ? 1 : 2].x1, step === 0 ? JUMPS[1].y1 : JUMPS[2].y1);
    }
    // the jump button and how long it is held
    const held = n < 3 ? clamp(lt / .35) * press.hold : 0, bx = 70, by = 150;
    g.fillStyle = 'rgba(255,252,244,.94)'; g.beginPath(); g.roundRect(bx - 34, by - 40, 250, 92, 12); g.fill();
    g.fillStyle = held > 0 && lt < .35 ? '#a8201c' : '#e5322d'; g.beginPath(); g.arc(bx, by + 6, 22, 0, TAU); g.fill();
    txt(g, 'A', bx, by + 7, '800 20px Montserrat, Jost, sans-serif', '#fff', 'center');
    txt(g, 'jump held', bx + 36, by - 18, '700 14px Jost, sans-serif', C.muted);
    g.fillStyle = '#efe5cf'; g.fillRect(bx + 36, by, 160, 16);
    g.fillStyle = step === 0 ? C.navy : press.col; g.fillRect(bx + 36, by, 160 * held / .45, 16);
    txt(g, n < 3 ? `${press.word}, ${press.hold.toFixed(2)} s` : 'three presses', bx + 36, by + 34, '600 14px Jost, sans-serif', C.ink);
    return {};
  }

  /* --- 3. Multi-threading: Goombas on the ground, Bullet Bills at jump height --------------------------------------- */
  const MX = 260, G_V = 150, B_V = 330, MJ = .7, MPEAK = 90, BILL_Y = GY - 76;
  const THREAD_STEPS = [
    { g: [1.4, 3.0, 4.6], b: [] },
    { g: [], b: [1.4, 3.0, 4.6] },
    { g: [1.5, 3.3, 5.1, 6.9, 8.7], b: [1.95, 4.15, 5.55, 7.35, 9.15] },
  ];
  const mH = (s, t) => { const k = (t - s) / MJ; return k > 0 && k < 1 ? 4 * MPEAK * k * (1 - k) : 0; };
  // a Bill hits Mario when it passes him while he is off the ground
  const billHits = (s, bs) => bs.some(b => { for (let t = b - .2; t <= b + .2; t += .01) if (mH(s, t) > 8) return true; return false; });
  function plan(st) {
    return st.g.map(o => {
      const habit = o - .35;
      if (!billHits(habit, st.b)) return { o, s: habit, habit, note: null };
      let best = null;
      for (let s = o - .466; s <= o - .234; s += .005) if (!billHits(s, st.b) && (best === null || Math.abs(s - habit) < Math.abs(best - habit))) best = s;
      return { o, s: best ?? habit, habit, note: best === null ? null : best < habit ? 'jumps early, lands before the Bill' : 'lets the Bill pass, then jumps' };
    });
  }
  const PLANS = THREAD_STEPS.map(plan);
  function drawThreads(g, t, step) {
    const st = THREAD_STEPS[step], P3 = PLANS[step];
    g.fillStyle = SKY; g.fillRect(SCN.x, SCN.y, SCN.w, SCN.h);
    tileRow(g, 'smb-ground', SCN.x, SCN.x + SCN.w, GY, 2);
    g.save(); g.beginPath(); g.rect(SCN.x, SCN.y, SCN.w, SCN.h); g.clip();
    // the thread labels on the right
    if (step !== 1) tag(g, 'thread 1: Goombas, jump over', 870, SCN.y + 34, '#8a3b00');
    if (step !== 0) tag(g, 'thread 2: Bullet Bills, stay down', 870, SCN.y + (step === 2 ? 68 : 34), C.ink);
    st.g.forEach(o => { const x = MX + G_V * (o - t); if (x > -40 && x < W + 40) spr(g, Math.floor(t * 5) % 2 ? 'smb-goomba' : 'smb-goomba-step', x, GY); });
    st.b.forEach(b => { const x = MX + B_V * (b - t); if (x > -40 && x < W + 40) spr(g, 'smb-bullet-bill', x, BILL_Y + 21); });
    // Mario follows the plan; a red ghost shows where the step-1 timing would have been hit
    const cur = P3.find(p => t >= p.s && t < p.s + MJ), h = cur ? mH(cur.s, t) : 0;
    P3.forEach(p => {
      if (!p.note || t < p.habit || t > p.habit + MJ + .5) return;
      const hit = st.b.find(b => { for (let q = b - .2; q <= b + .2; q += .01) if (mH(p.habit, q) > 8) return true; return false; });
      const tt = Math.min(t, hit), gh = mH(p.habit, tt);
      g.save(); g.filter = 'sepia(1) saturate(6) hue-rotate(-35deg)'; spr(g, 'smb-mario-jump', MX, GY - gh, { a: .5 }); g.restore();
      tag(g, t >= hit ? '✕ old timing: hit by the Bill' : 'old timing', MX - 20, GY - gh - 72, '#ffffff', 'rgba(229,50,45,.92)');
    });
    spr(g, h > 0 ? 'smb-mario-jump' : 'smb-mario', MX, GY - h);
    const lastNote = P3.find(p => p.note && t >= p.s - .6 && t < p.o + .9);
    if (lastNote) tag(g, 'Mario ' + lastNote.note, MX + 40, GY - 190, '#1a8a4c');
    g.restore();
    return {};
  }

  /* --- 4. Input RNG: the Hammer Bro's throw is rolled, then shown (or not) --------------------------------------- */
  const HB_X = 860, SPOTS = { near: 640, far: 420 }, RNG_CYC = 2.6;
  const RNG_ROUNDS = [
    [{ pick: 'near', roll: 'near' }, { pick: 'far', roll: 'near' }, { pick: 'far', roll: 'far' }],
    [{ roll: 'far' }, { roll: 'near' }, { roll: 'far' }],
  ];
  const other = s => s === 'near' ? 'far' : 'near';
  function die(g, x, y, face, spin) {
    g.save(); g.translate(x, y); g.rotate(spin); g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 3;
    g.beginPath(); g.roundRect(-20, -20, 40, 40, 8); g.fill(); g.stroke(); g.fillStyle = C.navy;
    const pips = { 2: [[-9, -9], [9, 9]], 5: [[-10, -10], [10, -10], [0, 0], [-10, 10], [10, 10]], 3: [[-10, -10], [0, 0], [10, 10]] }[face];
    pips.forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 4, 0, TAU); g.fill(); }); g.restore();
  }
  function drawRng(g, t, step) {
    const n = Math.min(Math.floor(t / RNG_CYC), 3), lt = t - n * RNG_CYC, R = RNG_ROUNDS[step][Math.min(n, 2)], live = n < 3;
    g.fillStyle = SKY; g.fillRect(SCN.x, SCN.y, SCN.w, SCN.h);
    tileRow(g, 'smb-ground', SCN.x, SCN.x + SCN.w, GY, 2);
    tileRow(g, 'smb-brick', HB_X - 72, HB_X + 72, GY - 96, 1);
    // timeline of a round
    const input = step === 1;
    const tRoll = input ? [0, .5] : [.7, 1.0], tThrow = input ? [1.2, 2.0] : [1.0, 1.8];
    const rolled = lt >= tRoll[1], spin = lt >= tRoll[0] && lt < tRoll[1];
    const target = live ? SPOTS[R.roll] : null;
    // where Mario stands: output picks first; input moves to the spot the telegraph leaves clear
    const spot = live ? (input ? other(R.roll) : R.pick) : 'far';
    const prev = n === 0 ? 'far' : input ? other(RNG_ROUNDS[1][n - 1].roll) : RNG_ROUNDS[0][n - 1].pick;
    const walkK = input ? clamp((lt - .55) / .55) : clamp(lt / .6);
    const mx = live ? lerp(SPOTS[prev], SPOTS[spot], ease(walkK)) : SPOTS.far;
    const hit = live && R.roll === spot && lt >= tThrow[1];
    // the two landing spots
    Object.entries(SPOTS).forEach(([k, x]) => {
      const marked = live && input && rolled && k === R.roll && lt < tThrow[1] + .4;
      g.fillStyle = marked ? 'rgba(229,50,45,.75)' : 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x, GY + 4, 44, 9, 0, 0, TAU); g.fill();
      tag(g, k === 'near' ? 'near spot' : 'far spot', x, GY + 26, C.ink, 'rgba(255,252,244,.94)', 14);
    });
    // the telegraph: the rolled arc drawn before Mario moves
    if (live && input && rolled && lt < tThrow[0] + .1) {
      g.strokeStyle = 'rgba(229,50,45,.9)'; g.lineWidth = 3; g.setLineDash([8, 7]); g.beginPath();
      for (let k = 0; k <= 1.001; k += .05) { const [x, y] = arc(HB_X - 10, GY - 150, target, GY - 10, GY - 290, k); k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.setLineDash([]);
      tag(g, `shown: ${R.roll} throw`, (HB_X + target) / 2, GY - 300, '#ffffff', 'rgba(229,50,45,.92)');
    }
    // the Hammer Bro: arm up while it holds the rolled throw
    const raised = live && rolled && lt < tThrow[0];
    spr(g, raised ? 'smb-hammer-bro-2' : Math.floor(t * 3) % 2 ? 'smb-hammer-bro-0' : 'smb-hammer-bro-1', HB_X, GY - 96);
    if (live && (spin || rolled) && lt < tThrow[1] + .3) {
      die(g, HB_X, GY - 210, spin ? [2, 5, 3][Math.floor(lt * 14) % 3] : R.roll === 'near' ? 2 : 5, spin ? lt * 18 : 0);
      if (rolled) tag(g, `rolled: ${R.roll}`, HB_X, GY - 250, C.ink);
    }
    // the hammer in flight
    if (live && lt >= tThrow[0] && lt < tThrow[1]) {
      const k = (lt - tThrow[0]) / (tThrow[1] - tThrow[0]), [x, y] = arc(HB_X - 10, GY - 150, target, GY - 10, GY - 290, k);
      spr(g, 'smb-hammer-' + (Math.floor(lt * 12) % 4), x, y);
    }
    // Mario
    const moving = walkK > 0 && walkK < 1;
    spr(g, hit ? 'smb-mario-dead' : moving ? walkFrame(mx) : 'smb-mario', mx, GY, { flip: moving && SPOTS[spot] < SPOTS[prev] });
    if (live && !input && lt < .7) tag(g, `Mario picks the ${R.pick} spot`, mx, GY - 72, C.ink);
    if (live && input && rolled && lt >= .55 && lt < tThrow[0]) tag(g, `reads it, moves ${spot}`, mx, GY - 72, '#1a8a4c');
    if (live && lt >= tThrow[1]) tag(g, hit ? 'hit' : 'clear', mx, GY - 72, hit ? '#ffffff' : '#1a8a4c', hit ? 'rgba(229,50,45,.92)' : undefined);
    // tally of the rounds played so far
    const done = RNG_ROUNDS[step].slice(0, n + (live && lt >= tThrow[1] ? 1 : 0));
    const hits = done.filter((r, i) => r.roll === (input ? other(r.roll) : r.pick)).length;
    g.fillStyle = 'rgba(255,252,244,.94)'; g.beginPath(); g.roundRect(40, 120, 300, 70, 12); g.fill();
    txt(g, input ? 'Input RNG: roll, show, then act' : 'Output RNG: act, then roll', 56, 142, '800 16px Montserrat, Jost, sans-serif', C.ink);
    txt(g, done.length ? `${hits} of ${done.length} throws hit Mario` : 'no throws yet', 56, 170, '700 16px Jost, sans-serif', hits ? C.red : '#1a8a4c');
    return { hits, done: done.length };
  }

  /* --- the tabs: definition, steps, narration ---------------------------------------------------------------------- */
  const TABS = ['async', 'sens', 'threads', 'rng'];
  const TOOL_TABS = {
    async: { name: 'Asynchrony', def: 'Two or more things moving independently of one another.', draw: drawAsync,
      steps: [[12, 'Three fireballs jump on the same 2-second loop. Mario learns one rhythm, and his wait at each pit is the same on every run.'],
        [16, 'Now the loops are 2, 3 and 4 seconds. Each fireball is still simple, but together they drift apart, so Mario has to read every pit again on every run.']],
      stats: ['<div><b>2 s</b><span>until the whole pattern repeats: one rhythm to learn</span></div>', '<div class="g"><b>12 s</b><span>until loops of 2, 3 and 4 s line up again, each one still predictable</span></div>'],
      deck: 'In the deck: Monaco’s guards walk patrol loops of different lengths, Celeste’s bounce pads fire out of step with each other, and This Way Madness Lies’ hyper bars run on separate timers. Every part is predictable; together they never settle into one rhythm.' },
    sens: { name: 'Input sensitivity', def: 'How much the game changes its output when the player’s input changes.', draw: drawSens,
      steps: [[7.5, 'Insensitive: tap or hold, the jump is always the same. With one possible jump, there is only one answer and nothing to choose.'],
        [7.5, 'Sensitive: the longer Mario holds jump, the higher he goes. A tap hops the Goomba, a half hold lands on the bricks, a full hold reaches the coin.']],
      stats: ['<div><b>1</b><span>jump, whatever the press</span></div>', '<div class="g"><b>3</b><span>presses, 3 different landings</span></div>'],
      deck: 'In the deck: Celeste’s pinball bumpers launch Madeline in a direction set by where she touches them, and Silksong’s enemies react differently depending on where and how Hornet hits them.' },
    threads: { name: 'Multi-threading', def: 'Mixing several challenges or layers of interaction at the same time.', draw: drawThreads,
      steps: [[6, 'Thread 1, Goombas: Mario has one rule, jump as each one arrives. He learns the timing fast.'],
        [6, 'Thread 2, Bullet Bills at jump height: a second simple rule, stay on the ground while one flies past.'],
        [10.5, 'Both threads at once: the rules collide. When a Bill arrives right behind a Goomba, the timing Mario learned gets him hit (red ghost), so he has to jump earlier.']],
      stats: ['<div><b>1</b><span>thing to watch</span></div>', '<div><b>1</b><span>thing to watch</span></div>', '<div class="g"><b>2</b><span>things to watch, and each one changes the answer to the other</span></div>'],
      deck: 'In the deck: Ninpek’s level design runs platforms and enemies at once, and Silksong’s encounters mix enemies so that one enemy across 8 positions is 8 situations, but two at once is 28 combinations.' },
    rng: { name: 'Input RNG', def: 'Randomness shown to the player before they decide. Output RNG lands after they decide.', draw: drawRng,
      steps: [[8.2, 'Output RNG: Mario picks a spot, then the dice decide where the hammer lands. Reading cannot help, so luck decides.'],
        [8.2, 'Input RNG: the dice roll first and the Hammer Bro shows the throw. Mario reads it and steps clear: the randomness creates the problem and skill answers it.']],
      stats: ['<div class="r"><b>luck</b><span>decides whether a throw hits</span></div>', '<div class="g"><b>reading</b><span>decides whether a throw hits</span></div>'],
      deck: 'In the deck: Slay the Spire and Into the Breach show each enemy’s rolled intent before your turn, and Dark Souls 3 bosses choose an attack at random but telegraph it in the windup.' },
  };
  const tabDur = k => TOOL_TABS[k].steps.reduce((a, s) => a + s[0], 0);
  const TOUR_DUR = TABS.reduce((a, k) => a + tabDur(k), 0);
  function stepAt(k, lt) {
    const S = TOOL_TABS[k].steps; let a = 0;
    for (let i = 0; i < S.length; i++) { if (lt < a + S[i][0] || i === S.length - 1) return { i, st: lt - a }; a += S[i][0]; }
  }
  function frame(g, k, lt) {
    const tab = TOOL_TABS[k], { i, st } = stepAt(k, lt);
    panel(g);
    g.save(); g.beginPath(); g.roundRect(SCN.x, SCN.y, SCN.w, SCN.h, 10); g.clip();
    tab.draw(g, st, i);
    g.restore();
    // header: the tool and the deck's definition
    txt(g, tab.name, 24, 36, '800 28px Montserrat, Jost, sans-serif', C.ink);
    g.font = '800 28px Montserrat, Jost, sans-serif'; const nw = g.measureText(tab.name).width;
    txt(g, tab.def, 24, 72, '600 19px Jost, sans-serif', C.muted);
    txt(g, `tool ${TABS.indexOf(k) + 1} of 4`, W - 24, 36, '700 15px Jost, sans-serif', C.muted, 'right');
    // caption: step chips and narration
    const S = tab.steps;
    S.forEach((_, q) => {
      const x = 40 + q * 40, y = 528, on = q === i;
      g.fillStyle = on ? C.navy : q < i ? '#c9c2e8' : '#efe5cf'; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill();
      txt(g, String(q + 1), x, y + 1, '800 15px Montserrat, Jost, sans-serif', on ? '#fff' : C.ink, 'center');
    });
    const cx = 40 + S.length * 40;
    g.fillStyle = C.gold; g.fillRect(cx - 4, 506, 4, 60 * clamp(st / S[i][0]));
    wrap(g, S[i][1], cx + 10, 516, W - cx - 40, 26, '600 19px Jost, sans-serif', C.ink);
    return i;
  }
  canvasDemo('tools', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, tab: 'async', t0: 0, key: '' };
    const tourBtn = $(s, '.tl-tour');
    $$(s, '.tl-tab .btn').forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.tab = b.dataset.k; st.t0 = st.t; st.key = ''; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.key = ''; tourBtn.classList.add('on'); };
    function render() {
      let tab = st.tab, lt = (st.t - st.t0) % tabDur(st.tab);
      if (st.tour) { let a = 0; for (const k of TABS) { if (st.t < a + tabDur(k)) { tab = k; lt = st.t - a; break; } a += tabDur(k); } }
      $$(s, '.tl-tab .btn').forEach(b => b.classList.toggle('on', b.dataset.k === tab));
      const i = frame(g, tab, Math.max(0, lt)), key = tab + i;
      if (key === st.key) return; st.key = key;
      const info = TOOL_TABS[tab];
      say($(s, '.tl-stats'), info.stats[i]); say($(s, '.tl-out'), info.deck);
    }
    apis.tools = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => TOUR_DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t >= TOUR_DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w = 'juggle') => apis[w].seek(t);
  window.__dur = (w = 'juggle') => apis[w].dur();
  window.__fleaSim = { newSim, step, possible, P };
  window.__toolSims = { PLANS, asyncSim, POD_SETS };
})();
