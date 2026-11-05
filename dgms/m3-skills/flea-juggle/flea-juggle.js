/* Build the flea juggle (DGMS Module 3, Leveraging Player Skills; deck slides 17-19 and 250-278).
   Slide 1 starts from slide 18's simple test, one flea on one fixed arc and a hit key, and adds the deck's four tools for
   dynamic skill tests in any order: asynchrony (each flea its own launch force), input sensitivity (where you hit decides
   the new arc), multi-threading (1-3 fleas from different sides) and input RNG (the next wave is rolled before it arrives
   and shown, like Slay the Spire / Into the Breach intents). Slide 278 is Silksong's flea juggle, which uses all four.
   The counter multiplies what each tool adds to the situations a hit can be, and also counts the distinct situations the
   player actually met in the last minute (a signature taken at every hit).
   Slide 2 replays one deck example per tool: Monaco's guards (255-259), Celeste's pinball bumpers (261-265), Silksong's
   two enemies across 8 positions = 28 combinations (267-270) and Into the Breach's intents (272-276).
   Deck numbers: the four tools, "8 positions", "28 possible combinations". Everything else in P is illustrative tuning.
   All art is original, drawn in code. */
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
        : count === 4 ? 'All four tools on: forces drift, you aim each hit, up to three fleas share the air and the next wave is shown in advance. That is the Silksong flea juggle (slide 278).'
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

  /* ---------- slide 2: the deck's examples, one per tool ---------- */
  const TAB_T = 4.5, TABS = ['async', 'sens', 'threads', 'rng'];
  function panel(g) { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }

  // Monaco: three guards on loops of 4, 5 and 6 seconds cross one corridor
  const GUARDS = [{ x: 330, per: 4, ph: 0 }, { x: 520, per: 5, ph: .3 }, { x: 710, per: 6, ph: .6 }];
  const gy = (gd, t) => 250 + 150 * Math.sin(TAU * (t / gd.per + gd.ph));
  const inHall = (gd, t) => Math.abs(gy(gd, t) - 250) < 62;
  function drawAsync(g, t) {
    g.save(); g.beginPath(); g.roundRect(20, 20, W - 40, 380, 10); g.clip();
    T.floor(20, 20, W - 40, 380);
    T.wall(20, 20, W - 40, 40); T.wall(20, 380, W - 40, 20);
    g.fillStyle = 'rgba(255,185,81,.22)'; g.fillRect(20, 188, W - 40, 124);
    T.label('the corridor', 120, 205, 'center', C.goldInk, 14);
    GUARDS.forEach(gd => {
      const y = gy(gd, t), vy = Math.cos(TAU * (t / gd.per + gd.ph)), ang = vy > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.strokeStyle = 'rgba(38,44,106,.25)'; g.setLineDash([4, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(gd.x, 100); g.lineTo(gd.x, 400); g.stroke(); g.setLineDash([]);
      T.cone(gd.x, y, ang, .5, 120, inHall(gd, t) ? 1 : .5);
      T.foe(gd.x, y, 22, ang, C.red, { mark: 'shield' });
      T.label(gd.per + ' s loop', gd.x + 58, Math.min(370, Math.max(80, y)), 'left', C.ink, 14);
    });
    const clear = GUARDS.every(gd => !inHall(gd, t));
    T.player(80, 250, 0); T.flag(950, 270);
    if (clear) T.label('corridor clear: go', 520, 250, 'center', '#1a8a4c', 18);
    g.restore();
    // timeline: when each guard blocks the corridor over the next 30 s
    const x0 = 140, w = 860, span = 30;
    txt(g, `next ${span} s`, x0, 420, '700 14px Jost, sans-serif', C.muted);
    GUARDS.forEach((gd, i) => {
      const y = 440 + i * 26;
      txt(g, gd.per + ' s guard', x0 - 12, y + 8, '600 14px Jost, sans-serif', C.ink, 'right');
      g.fillStyle = '#efe5cf'; g.fillRect(x0, y, w, 16);
      g.fillStyle = 'rgba(229,50,45,.75)';
      for (let k = 0; k < w; k += 2) if (inHall(gd, t + k / w * span)) g.fillRect(x0 + k, y, 2, 16);
    });
    const y = 440 + 3 * 26;
    txt(g, 'clear', x0 - 12, y + 8, '700 14px Jost, sans-serif', '#1a8a4c', 'right');
    g.fillStyle = '#efe5cf'; g.fillRect(x0, y, w, 16); g.fillStyle = 'rgba(47,174,99,.85)';
    for (let k = 0; k < w; k += 2) if (GUARDS.every(gd => !inHall(gd, t + k / w * span))) g.fillRect(x0 + k, y, 2, 16);
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 432); g.lineTo(x0, 560); g.stroke();
  }

  // Celeste's pinball bumpers: the contact point decides the launch direction
  const CONTACTS = [-68, -34, 0, 34, 68], BUMP = [560, 300], BR = 62, PR = 18, SHOT_COL = ['#ffb951', '#57b6ff', '#2fae63', '#e07bd6', '#ff8a5c'];
  const dirWord = a => a > 100 ? 'up and back' : a > 20 ? 'up' : a > -20 ? 'straight back' : a > -100 ? 'down' : 'down and back';
  function bumpShot(off) {
    const R = BR + PR, cy = BUMP[1] + off, cx = BUMP[0] - Math.sqrt(R * R - off * off);
    const nx = (cx - BUMP[0]) / R, ny = (cy - BUMP[1]) / R;
    return { cx, cy, nx, ny, ang: Math.round(Math.atan2(-ny, nx) * 180 / Math.PI) };
  }
  function shotPos(off, k) {   // k: 0..1 in, 1..2 out
    const b = bumpShot(off);
    if (k < 1) return [lerp(80, b.cx, k), b.cy];
    const d = (k - 1) * 420; return [b.cx + b.nx * d, b.cy + b.ny * d];
  }
  function drawSens(g, t) {
    g.save(); g.fillStyle = '#2a2e55'; g.beginPath(); g.roundRect(20, 20, W - 40, 545, 12); g.fill(); g.clip();
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(40 + (i * 157) % 960, 40 + (i * 89) % 500, 1.5 + i % 3, 0, TAU); g.fill(); }
    const cyc = 1.6, idx = Math.floor(t / cyc) % CONTACTS.length, k = (t % cyc) / cyc * 2;
    // earlier shots as ghosts
    CONTACTS.forEach((off, i) => {
      const b = bumpShot(off), col = SHOT_COL[i];
      if (i === idx || (i > idx && t < CONTACTS.length * cyc)) return;
      g.strokeStyle = col; g.globalAlpha = .45; g.lineWidth = 3; g.setLineDash([3, 8]);
      g.beginPath(); g.moveTo(80, b.cy); g.lineTo(b.cx, b.cy); g.lineTo(b.cx + b.nx * 420, b.cy + b.ny * 420); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    });
    // the bumper
    const pulse = k > 1 && k < 1.25 ? 1 + .12 * Math.sin((k - 1) / .25 * Math.PI) : 1;
    g.fillStyle = '#e5322d'; g.strokeStyle = '#ffd0cc'; g.lineWidth = 5; g.beginPath(); g.arc(BUMP[0], BUMP[1], BR * pulse, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ff8a7a'; g.beginPath(); g.arc(BUMP[0], BUMP[1], BR * .55 * pulse, 0, TAU); g.fill();
    const off = CONTACTS[idx], b = bumpShot(off), col = SHOT_COL[idx];
    const pts = []; for (let q = 0; q <= k; q += .04) pts.push(shotPos(off, q));
    T.trail(pts, col, 1, 4);
    const [x, y] = shotPos(off, k); T.player(x, y, k < 1 ? 0 : Math.atan2(b.ny, b.nx), .9, 1, col);
    if (k > 1) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(BUMP[0], BUMP[1]); g.lineTo(b.cx + b.nx * 50, b.cy + b.ny * 50); g.stroke(); g.setLineDash([]); }
    g.restore();
    txt(g, `contact ${off === 0 ? 'dead centre' : off < 0 ? Math.abs(off) + ' px above centre' : off + ' px below centre'} → launched ${dirWord(b.ang)} (${b.ang}°)`, 40, 545, '700 18px Jost, sans-serif', col);
    txt(g, 'Same dash, same bumper: where you touch it decides where you go.', W - 40, 50, '600 16px Jost, sans-serif', '#dfe6fb', 'right');
  }

  // Silksong: two enemies across 8 positions
  const POS8 = [[150, 470], [300, 470], [450, 470], [600, 470], [150, 260], [300, 220], [450, 220], [600, 260]];
  const PAIRS = []; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) PAIRS.push([i, j]);
  function bug(g, x, y, fly, col) {
    T.shadow(x, fly ? y + 60 : y + 26, 22, 6, .2);
    if (fly) { g.fillStyle = 'rgba(223,230,251,.85)'; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(x + s * 18, y - 14, 18, 9, s * .5, 0, TAU); g.fill(); }); }
    g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 26, 20, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 8, y - 4, 5, 0, TAU); g.arc(x + 8, y - 4, 5, 0, TAU); g.fill();
    g.fillStyle = C.navy; g.beginPath(); g.arc(x - 8, y - 3, 2.5, 0, TAU); g.arc(x + 8, y - 3, 2.5, 0, TAU); g.fill();
  }
  function drawThreads(g, t) {
    g.fillStyle = '#e8dcc0'; g.fillRect(20, 500, 700, 20);
    g.fillStyle = '#b9a47c'; g.fillRect(20, 500, 700, 6);
    const per = .15, i = Math.floor(t / per) % 28, [a, b] = PAIRS[i];
    g.save();
    POS8.forEach(([x, y], k) => {
      g.strokeStyle = 'rgba(38,44,106,.35)'; g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.arc(x, y, 32, 0, TAU); g.stroke(); g.setLineDash([]);
      txt(g, String(k + 1), x, y + 48, '700 14px Jost, sans-serif', C.muted, 'center');
    });
    [a, b].forEach(k => bug(g, POS8[k][0], POS8[k][1], k >= 4, C.purple));
    g.restore();
    T.player(60, 478, 0, .8);
    txt(g, `combination ${i + 1} of 28`, 375, 60, '800 22px Montserrat, Jost, sans-serif', C.ink, 'center');
    txt(g, `enemies at ${a + 1} and ${b + 1}`, 375, 92, '600 16px Jost, sans-serif', C.muted, 'center');
    // the 28 combinations, filling in
    const gx = 760, gyy = 90, cs = 34;
    txt(g, 'all pairs of 8 positions', gx + 2 * cs, 50, '700 15px Jost, sans-serif', C.ink, 'center');
    PAIRS.forEach(([p, q], k) => {
      const x = gx + (k % 4) * cs * 1.2 - 20, y = gyy + Math.floor(k / 4) * cs;
      g.fillStyle = k === i ? C.gold : k < i || t >= per * 28 ? '#d8f0df' : '#efe5cf'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(x, y, cs * 1.1, cs - 6, 5); g.fill(); g.stroke();
      txt(g, `${p + 1}·${q + 1}`, x + cs * .55, y + (cs - 6) / 2, '600 13px Jost, sans-serif', C.ink, 'center');
    });
    txt(g, 'one enemy: 8 situations', gx + 50, 345, '600 16px Jost, sans-serif', C.muted, 'center');
    txt(g, 'two at once: 8 × 7 ÷ 2 = 28', gx + 50, 372, '800 17px Montserrat, Jost, sans-serif', C.ink, 'center');
    txt(g, 'Ninpek does it with platforms: two lanes', gx + 50, 410, '600 15px Jost, sans-serif', C.muted, 'center');
    txt(g, 'run in parallel, and you read both.', gx + 50, 432, '600 15px Jost, sans-serif', C.muted, 'center');
  }

  // Into the Breach: the roll is shown before you act
  const GW = 8, GH = 6, CS = 62, GX = 40, GY = 46;
  const BUILD = [[1, 1], [5, 1], [2, 4], [6, 4], [4, 2]];
  function round(k) {
    const r = rng(101 + k * 37), en = [], used = new Set(BUILD.map(b => b.join()));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (en.length < 3) {
      const x = Math.floor(r() * GW), y = Math.floor(r() * GH), d = dirs[Math.floor(r() * 4)];
      const tx = x + d[0], ty = y + d[1];
      if (used.has(x + ',' + y) || tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue;
      used.add(x + ',' + y); en.push({ x, y, d });
    }
    // the player pushes the first enemy that threatens a building, sideways
    const hitsB = e => BUILD.some(b => b[0] === e.x + e.d[0] && b[1] === e.y + e.d[1]);
    const tgt = en.find(hitsB) || en[0];
    const side = [[tgt.d[1], tgt.d[0]], [-tgt.d[1], -tgt.d[0]]].find(([dx, dy]) => {
      const nx = tgt.x + dx, ny = tgt.y + dy; return nx >= 0 && ny >= 0 && nx < GW && ny < GH && !used.has(nx + ',' + ny);
    }) || [0, 0];
    return { en, tgt, side, threat: en.filter(hitsB).length };
  }
  function drawRng(g, t) {
    const k = Math.floor(t / TAB_T), f = (t % TAB_T) / TAB_T, R = round(k);
    for (let x = 0; x < GW; x++) for (let y = 0; y < GH; y++) {
      g.fillStyle = (x + y) % 2 ? '#d9cba8' : '#e6d9ba'; g.fillRect(GX + x * CS, GY + y * CS, CS, CS);
    }
    g.strokeStyle = '#b7a47c'; g.lineWidth = 1; g.strokeRect(GX, GY, GW * CS, GH * CS);
    BUILD.forEach(([x, y]) => { g.fillStyle = C.player; g.fillRect(GX + x * CS + 10, GY + y * CS + 10, CS - 20, CS - 20); g.fillStyle = '#9fdcf3'; g.fillRect(GX + x * CS + 18, GY + y * CS + 16, 10, 10); g.fillRect(GX + x * CS + 34, GY + y * CS + 16, 10, 10); });
    const pushK = clamp((f - .45) / .15), boom = f > .72;
    R.en.forEach(e => {
      let ex = e.x, ey = e.y;
      if (e === R.tgt) { ex += R.side[0] * ease(pushK); ey += R.side[1] * ease(pushK); }
      const tx = ex + e.d[0], ty = ey + e.d[1];
      const cx = GX + (ex + .5) * CS, cy = GY + (ey + .5) * CS;
      // intent: the target tile and an arrow
      if (f > .08) {
        g.fillStyle = boom ? 'rgba(229,50,45,.75)' : `rgba(229,50,45,${.25 + .15 * Math.sin(t * 8)})`;
        g.fillRect(GX + tx * CS + 3, GY + ty * CS + 3, CS - 6, CS - 6);
        g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + e.d[0] * 22, cy + e.d[1] * 22); g.lineTo(cx + e.d[0] * 48, cy + e.d[1] * 48); g.stroke();
      }
      T.foe(cx, cy, 20, Math.atan2(e.d[1], e.d[0]), C.red, { mark: 'horns' });
      if (boom) T.flash(GX + (tx + .5) * CS, GY + (ty + .5) * CS, 40, clamp(1 - (f - .72) / .28));
    });
    // the mech that shoves
    const m = R.tgt, mx = GX + (m.x - R.side[0] + .5) * CS, my = GY + (m.y - R.side[1] + .5) * CS;
    if (f > .3) { T.player(mx, my, Math.atan2(R.side[1], R.side[0]), .9, clamp((f - .3) / .1), C.p2); if (f < .62) T.tracer(mx, my, mx + R.side[0] * CS * .7, my + R.side[1] * CS * .7, clamp((f - .4) / .05), C.gold, 5); }
    const ph = f < .3 ? 'enemy turn: every attack is announced' : f < .72 ? 'your turn: shove one attack off a building' : 'attacks resolve exactly as shown';
    const x0 = GX + GW * CS + 34;
    txt(g, `round ${k + 1}`, x0, 70, '800 22px Montserrat, Jost, sans-serif', C.ink);
    txt(g, ph, x0, 108, '700 16px Jost, sans-serif', f < .3 ? C.red : f < .72 ? '#1a8a4c' : C.ink);
    ['The dice roll first: where each bug', 'will strike is drawn on the board.', 'The skill is the answer, not the guess.'].forEach((l, i) => txt(g, l, x0, 160 + i * 26, '600 16px Jost, sans-serif', C.muted));
    // Slay the Spire style intent row
    txt(g, 'Slay the Spire shows intents too:', x0, 280, '700 15px Jost, sans-serif', C.ink);
    [['⚔', '12', C.red], ['🛡', '8', C.player], ['⚔', '5×2', C.red]].forEach(([ic, n, col], i) => {
      const x = x0 + 30 + i * 100, y = 345, cur = i === k % 3;
      g.fillStyle = cur ? '#fde9b8' : '#efe5cf'; g.strokeStyle = cur ? C.gold : '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x - 34, y - 34, 68, 68, 10); g.fill(); g.stroke();
      txt(g, ic, x, y - 6, '26px sans-serif', col, 'center'); txt(g, n, x, y + 20, '800 15px Montserrat, Jost, sans-serif', C.ink, 'center');
    });
    txt(g, 'Dark Souls 3 rolls its attack choice', x0, 420, '600 15px Jost, sans-serif', C.muted);
    txt(g, 'at the windup: read it, then answer.', x0, 442, '600 15px Jost, sans-serif', C.muted);
  }

  const TAB_INFO = {
    async: { draw: drawAsync, stats: () => '<div><b>60 s</b><span>until loops of 4, 5 and 6 s line up again</span></div><div class="g"><b>3</b><span>cycles, each predictable on its own</span></div>',
      out: 'Asynchrony: each guard runs a simple loop, but because the periods differ the gaps never repeat for a minute. “Asynchrony creates predictable irregularities.” Celeste’s out-of-sync bounce pads and This Way Madness Lies’ hyper bars do the same.' },
    sens: { draw: drawSens, stats: () => `<div><b>${CONTACTS.length}</b><span>contact points shown, ${CONTACTS.length} launch angles (${CONTACTS.map(o => bumpShot(o).ang + '°').join(', ')})</span></div>`,
      out: 'Input sensitivity: the bumper launches you along the line from its centre through your contact point, so a small change in your input is a different outcome. Silksong’s pogo and variable jump height work the same way.' },
    threads: { draw: drawThreads, stats: () => '<div><b>8</b><span>situations with one enemy</span></div><div class="g"><b>28</b><span>with two enemies at once (deck, slides 267-270)</span></div>',
      out: 'Multi-threading: two threats at once turn 8 situations into 28 combinations, and the player has to read both. Ninpek’s parallel platforms are the same tool.' },
    rng: { draw: drawRng, stats: () => '<div><b>3</b><span>attacks rolled and shown each round</span></div><div class="g"><b>0</b><span>surprises: the outcome is the one drawn</span></div>',
      out: 'Input RNG: the randomness comes before the player acts and is shown, so it creates new problems instead of deciding the result. Into the Breach and Slay the Spire show intents; Dark Souls 3 rolls at the windup.' },
  };
  canvasDemo('tools', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, tab: 'async', t0: 0, key: '' };
    const tourBtn = $(s, '.tl-tour');
    $$(s, '.tl-tab .btn').forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.tab = b.dataset.k; st.t0 = st.t; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render() {
      let tab = st.tab, lt = st.t - st.t0;
      if (st.tour) { const i = Math.floor(st.t / TAB_T) % 4; tab = TABS[i]; lt = st.t - i * TAB_T; if (tab === 'rng') lt = (st.t - i * TAB_T); }
      $$(s, '.tl-tab .btn').forEach(b => b.classList.toggle('on', b.dataset.k === tab));
      panel(g);
      const info = TAB_INFO[tab];
      info.draw(g, Math.max(0, tab === 'threads' && !st.tour ? lt * .3 : lt));
      if (tab === st.key) return; st.key = tab;
      say($(s, '.tl-stats'), info.stats()); say($(s, '.tl-out'), info.out);
    }
    apis.tools = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => TAB_T * 4 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > TAB_T * 4) st.t = 0; render(); };
  });

  window.__seek = (t, w = 'juggle') => apis[w].seek(t);
  window.__dur = (w = 'juggle') => apis[w].dur();
  window.__fleaSim = { newSim, step, possible, P };
})();
