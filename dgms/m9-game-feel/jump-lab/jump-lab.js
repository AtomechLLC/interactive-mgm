/* Jump curve lab (DGMS Module 9, deck slides 164-172).
   jumps:  one jump key and three jumpers that differ only in what happens on release (slides 166-168):
           Sonic cuts upward speed, Mario switches from low to high gravity, the fighter only listens during a 3-6 frame
           pre-jump (short hop vs full jump). Arcs stay as ghost lines; a gravity slider runs 1x to 3x Earth (slide 165);
           the bottom panel is the ADSR-style envelope of the last jump (slide 169).
   easing: five easing curves (slides 170-172) moving dots over the same distance in the same time.
   The jump physics runs at a fixed 60 steps a second, so the walk-through (and __seek) replays a list of timed key
   presses from t = 0 and every frame comes from t alone. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585;
  const apis = {};
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.82)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };

  /* ---------- physics ---------- */
  const STEP = 1 / 60, PX = 40, EARTH = 9.8 * PX;      // 40 px to the metre
  const JH = 150, VX = 120, LAND = 0.15, SHORT = 0.45;  // full jump height (px), run speed (px/s), landing pause (s), short hop height share
  const LANES = [
    { kind: 'sonic', name: 'Sonic style', rule: ['Release: upward speed is cut', 'to 4/6.5 of launch speed'], col: '#2e63dc' },
    { kind: 'mario', name: 'Mario style', rule: ['Held: 1/3 gravity while rising', 'Release: gravity triples'], col: '#e5322d' },
    { kind: 'fighter', name: 'Fighting game', rule: ['Release during the pre-jump:', 'short hop. Later: full jump'], col: '#8a4fd6' },
  ];
  function makeSim(o) {
    return { t: 0, g: o.g, frames: o.frames, run: o.run, held: false, pressT: null, releaseT: null, trace: null,
      ghosts: [[], [], []], last: [null, null, null],
      js: LANES.map(l => ({ kind: l.kind, phase: 'ready', x: 0, y: 0, vy: 0, pre: 0, hop: false, path: [], pressT: 0, releaseT: null, liftT: 0, landT: 0, peak: 0 })) };
  }
  const G = sim => sim.g * EARTH;
  function press(sim) {
    if (sim.held) return;
    sim.held = true; sim.pressT = sim.t; sim.releaseT = null;
    let any = false;
    sim.js.forEach((j, i) => {
      if (j.phase !== 'ready') return;
      any = true;
      Object.assign(j, { x: 0, y: 0, path: [[0, 0]], pressT: sim.t, releaseT: null, hop: false, pre: 0, liftT: sim.t, peak: 0, traced: true });
      const g = G(sim);
      if (j.kind === 'sonic') { j.phase = 'air'; j.vy = Math.sqrt(2 * g * JH); }
      if (j.kind === 'mario') { j.phase = 'air'; j.vy = Math.sqrt(2 * (g / 3) * JH) * (sim.run ? 1.1 : 1); }
      if (j.kind === 'fighter') { j.phase = 'pre'; j.vy = 0; }
    });
    if (any) sim.trace = { pressT: sim.t, releaseT: null, curves: [[], [], []], lift: [0, 0, null], frames: sim.frames, g: sim.g, on: sim.js.map(j => j.pressT === sim.t) };
  }
  function release(sim) {
    if (!sim.held) return;
    sim.held = false; sim.releaseT = sim.t;
    if (sim.trace && sim.trace.releaseT == null) sim.trace.releaseT = sim.t;
    sim.js.forEach(j => {
      if (j.phase === 'ready' || j.phase === 'land' || j.releaseT != null) return;
      j.releaseT = sim.t;
      const g = G(sim);
      if (j.kind === 'sonic' && j.phase === 'air') { const cut = Math.sqrt(2 * g * JH) * 4 / 6.5; if (j.vy > cut) j.vy = cut; }
      if (j.kind === 'fighter' && j.phase === 'pre') j.hop = true;
    });
  }
  function step(sim) {
    const g = G(sim);
    sim.js.forEach((j, i) => {
      if (j.phase === 'pre') {
        j.pre++;
        if (j.pre >= sim.frames) { j.phase = 'air'; j.liftT = sim.t; j.vy = Math.sqrt(2 * g * JH * (j.hop ? SHORT : 1)); if (sim.trace && sim.trace.on[i]) sim.trace.lift[i] = sim.t - sim.trace.pressT; }
      } else if (j.phase === 'air') {
        const held = j.releaseT == null && sim.held;
        const gg = j.kind === 'mario' && held && j.vy > 0 ? g / 3 : g;
        j.vy -= gg * STEP; j.y += j.vy * STEP; j.x += VX * STEP;
        if (j.y <= 0 && j.vy < 0) {
          j.y = 0; j.phase = 'land'; j.landT = sim.t;
          const hold = (j.releaseT ?? sim.t) - j.pressT;
          const gh = sim.ghosts[i]; gh.push({ pts: j.path.slice(), hold, held: j.releaseT == null, hop: j.hop, g: sim.g });
          if (gh.length > 5) gh.shift();
          sim.last[i] = { air: sim.t - j.pressT, peak: j.peak, hop: j.hop };
        }
        j.peak = Math.max(j.peak, j.y);
        j.path.push([j.x, j.y]);
      } else if (j.phase === 'land' && sim.t - j.landT > LAND) { j.phase = 'ready'; j.x = 0; j.path = []; }
      const tr = sim.trace;
      if (tr && tr.on[i] && j.pressT === tr.pressT && (j.phase === 'pre' || j.phase === 'air' || (j.phase === 'land' && j.landT >= sim.t - STEP / 2))) tr.curves[i].push([sim.t - tr.pressT, j.y]);
    });
    sim.t += STEP;
  }

  /* ---------- the walk-through: timed presses of varied lengths ---------- */
  const TOUR_DUR = 21;
  const TOUR = [
    { at: 0, g: 3, clear: 1 },
    { at: 0.6, hold: 0.06 }, { at: 2.4, hold: 0.16 }, { at: 4.2, hold: 0.32 }, { at: 6.0, hold: 0.9 },
    { at: 8.0, g: 1, clear: 1 },
    { at: 8.5, hold: 0.12 }, { at: 11.0, hold: 1.7 },
    { at: 14.6, g: 3, clear: 1 },
    { at: 15.0, hold: 0.03 }, { at: 16.8, hold: 0.1 }, { at: 18.6, hold: 0.5 },
  ];
  const EVENTS = [];
  TOUR.forEach(e => { if (e.hold) { EVENTS.push({ at: e.at, f: press }, { at: e.at + e.hold, f: release }); } else EVENTS.push({ at: e.at, f: sim => { sim.g = e.g; if (e.clear) sim.ghosts = [[], [], []]; } }); });
  EVENTS.sort((a, b) => a.at - b.at);
  const TOUR_SAY = [
    [0, 'Gravity is 3x Earth. The walk-through presses the key four times: a tap, a short hold, a longer hold and a full hold. Each arc stays as a ghost line, labelled with how long the key was held.'],
    [8, 'Now 1x Earth, with the same full jump height. Every arc gets wide and slow. The deck: most 2D games use gravity about 3 times stronger than on Earth, because the sense of power is more fun than a realistic jump.'],
    [14.6, 'Back to 3x. A tap shorter than the 4-frame pre-jump gives the fighter a short hop. Any longer hold gives it the same full jump, while Sonic and Mario keep growing with the hold.'],
  ];
  function tourSim(t, frames, run) {
    const sim = makeSim({ g: 3, frames, run });
    let k = 0;
    while (sim.t < t - 1e-9) {
      while (k < EVENTS.length && EVENTS[k].at <= sim.t + 1e-9) EVENTS[k++].f(sim);
      step(sim);
    }
    return sim;
  }

  /* ---------- drawing ---------- */
  const mario = new Image(); mario.src = 'img/mario-small.png';
  const LW = W / 3, GY = 340, X0 = 30;
  function drawSonic(g, x, y, air, spin) {
    g.save(); g.translate(x, y);
    if (air) {
      g.translate(0, -18); g.rotate(spin);
      g.fillStyle = '#1f4fd1'; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fill();
      g.fillStyle = '#4f7cf0';
      for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(-6, -4); g.lineTo(0, -19); g.lineTo(6, -4); g.closePath(); g.fill(); }
      g.fillStyle = '#f2c28e'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill();
    } else {
      g.fillStyle = '#d8261f'; g.beginPath(); g.ellipse(-7, -3, 8, 4, 0, 0, 7); g.ellipse(9, -3, 8, 4, 0, 0, 7); g.fill();
      g.fillStyle = '#1f4fd1'; g.fillRect(-6, -20, 4, 16); g.fillRect(4, -20, 4, 16);
      g.beginPath(); g.ellipse(1, -26, 10, 9, 0, 0, 7); g.fill();
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-4, -44 + k * 9); g.lineTo(-24, -48 + k * 11); g.lineTo(-4, -36 + k * 9); g.closePath(); g.fill(); }
      g.beginPath(); g.arc(2, -44, 13, 0, 7); g.fill();
      g.fillStyle = '#f2c28e'; g.beginPath(); g.ellipse(10, -39, 7, 5, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(1, -26, 5, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(7, -47, 5, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#1b2a6b'; g.beginPath(); g.arc(9, -47, 2.4, 0, 7); g.fill();
    }
    g.restore();
  }
  function drawMario(g, x, y, air) {
    if (!mario.complete || !mario.naturalWidth) { g.fillStyle = '#e5322d'; g.fillRect(x - 18, y - 48, 36, 48); return; }
    g.imageSmoothingEnabled = false;
    g.drawImage(mario, air ? 16 : 0, 0, 16, 16, x - 24, y - 48, 48, 48);
    g.imageSmoothingEnabled = true;
  }
  function drawFighter(g, x, y, pre, frames, air) {
    const sq = pre ? 0.62 : air ? 1.06 : 1, w = 28 / Math.sqrt(sq), h = 44 * sq;
    g.fillStyle = '#8a4fd6'; g.strokeStyle = C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(x - w / 2, y - h, w, h, 8); g.fill(); g.stroke();
    g.fillStyle = '#c9b2f0'; g.beginPath(); g.arc(x, y - h - 12, 11, 0, 7); g.fill(); g.stroke();
    g.fillStyle = C.navy; g.fillRect(x + 2, y - h - 15, 6, 3);
  }
  function lane(g, sim, i, now) {
    const L = LANES[i], lx = i * LW, j = sim.js[i];
    if (i) { g.strokeStyle = '#e3d8bf'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 16); g.lineTo(lx, 372); g.stroke(); }
    txt(g, L.name, lx + 20, 24, '800 18px Montserrat', L.col);
    txt(g, L.rule[0], lx + 20, 46, '600 14px Jost', C.muted); txt(g, L.rule[1], lx + 20, 64, '600 14px Jost', C.muted);
    // ground
    g.fillStyle = '#e8dcc0'; g.fillRect(lx + 10, GY, LW - 20, 16);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx + 10, GY); g.lineTo(lx + LW - 10, GY); g.stroke();
    // full jump height line
    g.setLineDash([4, 6]); g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(lx + 10, GY - JH); g.lineTo(lx + LW - 10, GY - JH); g.stroke(); g.setLineDash([]);
    txt(g, 'full jump height', lx + LW - 14, GY - JH - 9, '600 11px Jost', '#a99c7c', 'right');
    const sx = x => lx + X0 + x, sy = y => GY - y;
    // ghost arcs
    const gh = sim.ghosts[i], placed = [];
    gh.forEach((a, k) => {
      const al = 0.25 + 0.6 * (k + 1) / gh.length;
      g.globalAlpha = al; g.strokeStyle = L.col; g.lineWidth = 2.5; g.setLineDash([7, 5]);
      g.beginPath(); a.pts.forEach(([x, y], n) => n ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.stroke(); g.setLineDash([]);
      let top = a.pts[0]; a.pts.forEach(p => { if (p[1] > top[1]) top = p; });
      const lab = (a.held ? 'held to landing' : a.hold.toFixed(2) + ' s') + (a.hop ? ', short hop' : '');
      let lx2 = sx(top[0]), ly = sy(top[1]) - 12;
      while (placed.some(([px, py]) => Math.abs(px - lx2) < 62 && Math.abs(py - ly) < 15)) ly -= 15;
      placed.push([lx2, ly]);
      g.font = '700 12px Jost'; const tw = g.measureText(lab).width + 8;
      g.fillStyle = 'rgba(255,252,244,.92)'; g.fillRect(lx2 - tw / 2, ly - 8, tw, 16);
      txt(g, lab, lx2, ly, '700 12px Jost', L.col, 'center');
      g.globalAlpha = 1;
    });
    // the live arc
    if (j.path.length > 1 && j.phase !== 'ready') {
      g.strokeStyle = L.col; g.lineWidth = 4; g.beginPath(); j.path.forEach(([x, y], n) => n ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y))); g.stroke();
    }
    const air = j.phase === 'air';
    const px = sx(j.phase === 'ready' ? 0 : j.x), py = sy(j.y);
    T.use(g); T.shadow(px, GY + 3, 16 * (1 - Math.min(.6, j.y / 300)), 4, .25);
    if (L.kind === 'sonic') drawSonic(g, px, py, air, now * 22);
    if (L.kind === 'mario') drawMario(g, px, py, air);
    if (L.kind === 'fighter') {
      drawFighter(g, px, py, j.phase === 'pre', sim.frames, air);
      if (j.phase === 'pre') T.label(`pre-jump ${j.pre + 1} / ${sim.frames}`, px, py - 84, 'center', L.col, 13);
    }
    const ls = sim.last[i];
    txt(g, ls ? `last: ${ls.air.toFixed(2)} s in the air, ${(ls.peak / PX).toFixed(1)} m high` : 'press to jump', lx + LW / 2, GY + 30, '600 13px Jost', C.muted, 'center');
  }
  function envelope(g, sim, now) {
    const y0 = 392, y1 = 580;
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#e3d8bf'; g.lineWidth = 2; g.beginPath(); g.roundRect(10, y0, W - 20, y1 - y0, 12); g.fill(); g.stroke();
    // key cap
    const down = sim.held, kx = 30, ky = 440;
    g.fillStyle = down ? '#ffb951' : '#fff'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(kx, ky + (down ? 4 : 0), 96, 46, 8); g.fill(); g.stroke();
    if (!down) { g.fillStyle = '#cdbf9f'; g.fillRect(kx + 4, ky + 46, 88, 4); }
    txt(g, 'SPACE', kx + 48, ky + 23 + (down ? 4 : 0), '800 16px Montserrat', C.ink, 'center');
    const tr = sim.trace;
    const hold = tr ? ((tr.releaseT ?? sim.t) - tr.pressT) : 0;
    txt(g, down ? 'held' : 'released', kx + 48, ky - 18, '700 13px Jost', down ? C.goldInk : C.muted, 'center');
    txt(g, tr ? `${hold.toFixed(2)} s` : '', kx + 48, ky + 72, '800 18px Montserrat', C.ink, 'center');
    txt(g, 'Envelope of the last jump: height over time since the press', 160, y0 + 16, '800 14px Montserrat', C.ink);
    const p0 = 160, p1 = 1015, q0 = 446, q1 = 556;
    if (!tr) { txt(g, 'Press the key to draw an envelope.', (p0 + p1) / 2, (q0 + q1) / 2, '600 16px Jost', C.muted, 'center'); return; }
    let tEnd = 0.6; tr.curves.forEach(c => { if (c.length) tEnd = Math.max(tEnd, c[c.length - 1][0]); });
    const Tm = Math.max(1, Math.ceil((tEnd + 0.05) * 2) / 2);
    const X = t => p0 + (t / Tm) * (p1 - p0), Y = h => q1 - (h / (JH * 1.25)) * (q1 - q0);
    // key held band
    const rel = tr.releaseT != null ? tr.releaseT - tr.pressT : sim.t - tr.pressT;
    g.fillStyle = 'rgba(255,185,81,.22)'; g.fillRect(X(0), q0 - 8, X(rel) - X(0), q1 - q0 + 8);
    // phases: attack (to lift-off), decay and sustain (key held), release
    const att = tr.frames / 60;
    const bracket = (a, b, lab, col) => {
      if (b - a < 0.005) return;
      const xa = X(a), xb = X(b), yy = y0 + 38;
      g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(xa, yy + 6); g.lineTo(xa, yy); g.lineTo(xb, yy); g.lineTo(xb, yy + 6); g.stroke();
      g.font = '700 12px Jost'; const fits = g.measureText(lab).width < xb - xa - 4;
      if (fits) txt(g, lab, (xa + xb) / 2, yy - 9, '700 12px Jost', col, 'center');
      else txt(g, lab.split(/[: ]/)[0], xa + 2, yy - 9, '700 12px Jost', col, 'left');
    };
    bracket(0, Math.min(att, rel + 99), 'Attack', '#8a4fd6');
    if (rel > att) bracket(att, rel, 'Decay and sustain: key held', C.goldInk);
    if (tr.releaseT != null) bracket(rel, tEnd, 'Release: what letting go does', C.redDk);
    // axes
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p0, q1); g.lineTo(p1, q1); g.stroke();
    for (let s = 0; s <= Tm + 1e-6; s += 0.5) { g.beginPath(); g.moveTo(X(s), q1); g.lineTo(X(s), q1 + 4); g.stroke(); txt(g, s.toFixed(1) + ' s', X(s), q1 + 13, '600 11px Jost', C.muted, 'center'); }
    if (tr.releaseT != null) { g.setLineDash([4, 4]); g.strokeStyle = C.redDk; g.beginPath(); g.moveTo(X(rel), q0 - 8); g.lineTo(X(rel), q1); g.stroke(); g.setLineDash([]); }
    tr.curves.forEach((c, i) => {
      if (c.length < 2) return;
      g.strokeStyle = LANES[i].col; g.lineWidth = 3; g.beginPath();
      c.forEach(([t, h], n) => n ? g.lineTo(X(t), Y(h)) : g.moveTo(X(t), Y(h))); g.stroke();
    });
    // legend
    LANES.forEach((L, i) => { const lx = p1 - 300 + i * 100; g.fillStyle = L.col; g.fillRect(lx, y0 + 12, 16, 4); txt(g, L.name.split(' ')[0], lx + 21, y0 + 15, '700 12px Jost', L.col); });
  }

  /* ---------- 1: three jumpers ---------- */
  canvasDemo('jumps', (s, cv, g) => {
    const gIn = $(s, '.jl-g'), fIn = $(s, '.jl-f'), runIn = $(s, '.jl-run'), tourBtn = $(s, '.jl-tour');
    const opts = () => ({ g: +gIn.value, frames: +fIn.value, run: runIn.checked });
    const st = { tour: true, t: 0, frozen: false, sim: null, acc: 0, key: '' };
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.sim = makeSim(opts()); st.acc = 0; };
    gIn.oninput = () => { free(); st.sim.g = +gIn.value; };
    fIn.oninput = () => { free(); st.sim.frames = +fIn.value; };
    runIn.onchange = () => { free(); st.sim.run = runIn.checked; };
    $(s, '.jl-clear').onclick = () => { free(); st.sim.ghosts = [[], [], []]; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const isJump = e => e.code === 'Space' || e.code === 'KeyZ';
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active') || !isJump(e) || e.target.closest?.('input[type=text], textarea')) return;
      e.preventDefault(); e.stopPropagation();
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (e.repeat) return;
      free(); press(st.sim);
    });
    document.addEventListener('keyup', e => {
      if (!s.classList.contains('active') || !isJump(e)) return;
      e.preventDefault(); e.stopPropagation();
      if (st.sim && !st.tour) release(st.sim);
    });
    s._release = () => { if (st.sim && !st.tour) release(st.sim); };
    function render() {
      const sim = st.tour ? tourSim(st.t, 4, false) : st.sim;
      if (st.tour) { gIn.value = sim.g; fIn.value = 4; runIn.checked = false; }
      panel(g);
      for (let i = 0; i < 3; i++) lane(g, sim, i, st.tour ? st.t : sim.t);
      envelope(g, sim, sim.t);
      $(s, '.jl-gv').textContent = (+gIn.value).toFixed(1) + 'x Earth';
      $(s, '.jl-fv').textContent = fIn.value + ' frames';
      const tr = sim.trace, hold = tr ? ((tr.releaseT ?? sim.t) - tr.pressT).toFixed(2) + ' s' : '–';
      const air = sim.last.map(l => l ? l.air.toFixed(2) : '–').join(' / ');
      const key = [hold, air, st.tour ? TOUR_SAY.filter(x => x[0] <= st.t + 1e-6).length : -1].join('|');
      if (key === st.key) return; st.key = key;
      $(s, '.jl-stats').innerHTML = `<div class="y"><b>${hold}</b><span>last key hold</span></div><div style="display:block"><b>${air}</b><br><span>seconds in the air: Sonic / Mario / fighter</span></div>`;
      if (st.tour) say($(s, '.jl-out'), TOUR_SAY.filter(x => x[0] <= st.t + 1e-6).pop()[1]);
      else say($(s, '.jl-out'), 'The three jumpers only differ in what happens when the key comes up. That release behaviour is the part of a jump that real life does not have, and the part players feel first.');
    }
    apis.jumps = { seek(t) { st.frozen = st.tour = true; st.t = t; render(); }, dur: () => TOUR_DUR };
    return dt => {
      if (st.tour) { if (!st.frozen) st.t += dt; if (st.t > TOUR_DUR) st.t = 0; }
      else { st.acc += dt; while (st.acc >= STEP) { step(st.sim); st.acc -= STEP; } }
      render();
    };
  }, { leave(s) { s._release?.(); } });

  /* ---------- 2: easing gallery ---------- */
  const bounce = k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; };
  const EASE = [
    { name: 'Linear', f: k => k, fx: 'k', col: '#5d618c', say: 'Linear: the same speed from start to end. It starts and stops with a jolt, like a machine. The spacing marks are even.' },
    { name: 'Ease in', f: k => k * k * k, fx: 'k³', col: '#2e63dc', say: 'Ease in: starts slow and speeds up, then hits the end at full speed. It reads as gathering weight, like a fall.' },
    { name: 'Ease out', f: k => 1 - Math.pow(1 - k, 3), fx: '1 - (1 - k)³', col: '#2fae63', say: 'Ease out: starts fast and settles. The reaction is instant and the landing is soft, which is why menus and cameras use it so often.' },
    { name: 'Ease in-out', f: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, fx: 'in, then out', col: '#8a4fd6', say: 'Ease in-out: slow, fast, slow. Smooth to watch, but the slow start can feel like input lag on a move the player triggered.' },
    { name: 'Bounce', f: bounce, fx: 'out-bounce', col: '#e5322d', say: 'Bounce: reaches the end, then rebounds in shrinking hops. The arrival gets a physical impact.' },
  ];
  canvasDemo('easing', (s, cv, g) => {
    const st = { tour: true, t: 0, frozen: false, pick: 'all', dur: 1.2, marks: true, key: '' };
    const tourBtn = $(s, '.ez-tour'), dIn = $(s, '.ez-d'), mIn = $(s, '.ez-marks');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.ez-pick .btn').forEach(b => b.onclick = () => { free(); st.pick = b.dataset.k; });
    dIn.oninput = () => { free(); st.dur = +dIn.value; };
    mIn.onchange = () => { free(); st.marks = mIn.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const TD_ = 16;
    function render() {
      let pick = st.pick, D = st.dur, marks = st.marks;
      if (st.tour) { D = 1.2; marks = true; pick = st.t < 3 ? 'all' : String(Math.min(4, Math.floor((st.t - 3) / 2.6))); dIn.value = D; mIn.checked = true; }
      $$(s, '.ez-pick .btn').forEach(b => b.classList.toggle('on', b.dataset.k === pick));
      $(s, '.ez-dv').textContent = D.toFixed(1) + ' s';
      panel(g);
      const P = D + 0.7, k = clamp((st.t % P) / D);
      const RH = 110, top = 20, ax = 320, bx = 990;
      EASE.forEach((e, i) => {
        const cy = top + i * RH + RH / 2, on = pick === 'all' || pick === String(i), dim = .4;
        g.globalAlpha = on ? 1 : dim;
        if (pick === String(i)) { g.fillStyle = '#fff3d6'; g.beginPath(); g.roundRect(10, cy - RH / 2 + 4, W - 20, RH - 8, 10); g.fill(); }
        txt(g, e.name, 28, cy - 10, '800 19px Montserrat', e.col);
        txt(g, e.fx, 28, cy + 14, '600 14px Jost', C.muted);
        // mini graph
        const gx = 180, gy = cy + 38, gw = 96, gh = 76;
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.strokeRect(gx, gy - gh, gw, gh);
        g.strokeStyle = e.col; g.lineWidth = 3; g.beginPath();
        for (let n = 0; n <= 60; n++) { const u = n / 60, x = gx + u * gw, y = gy - e.f(u) * gh; n ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        g.fillStyle = e.col; g.beginPath(); g.arc(gx + k * gw, gy - e.f(k) * gh, 5, 0, 7); g.fill();
        // track
        g.strokeStyle = '#e3d8bf'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, cy); g.lineTo(bx, cy); g.stroke(); g.lineCap = 'butt';
        txt(g, 'a', ax, cy + 22, '700 13px Jost', C.muted, 'center'); txt(g, 'b', bx, cy + 22, '700 13px Jost', C.muted, 'center');
        if (marks) for (let n = 0; n <= 15; n++) { const x = lerp(ax, bx, e.f(n / 15)); g.fillStyle = e.col; g.globalAlpha = (on ? 1 : dim) * .35; g.beginPath(); g.arc(x, cy, 5, 0, 7); g.fill(); }
        g.globalAlpha = on ? 1 : dim;
        const x = lerp(ax, bx, e.f(k));
        g.fillStyle = e.col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, cy, 14, 0, 7); g.fill(); g.stroke();
        g.globalAlpha = 1;
      });
      const key = pick; if (key === st.key) return; st.key = key;
      say($(s, '.ez-out'), pick === 'all' ? 'Every dot travels from a to b in the same time. Only the easing differs, and the spacing marks show where each dot spends its time.' : EASE[+pick].say);
    }
    apis.easing = { seek(t) { st.frozen = st.tour = true; st.t = t; render(); }, dur: () => TD_ };
    return dt => { if (!st.frozen) st.t += dt; if (st.tour && st.t > TD_) st.t = 0; render(); };
  });

  window.__seek = (t, w = 'jumps') => apis[w].seek(t);
  window.__dur = (w = 'jumps') => apis[w].dur();
})();
