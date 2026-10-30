/* Valorant counter-strafe (genre breakdown: "How to Make a Game Like Valorant?").
   Movement inaccuracy: the faster you move, the wider your shots spread, so you stop before you shoot. Letting go of
   the key lets friction stop you; tapping the opposite key adds acceleration to the friction and stops you in a
   fraction of the time. The speeds, the stopping rates, the "accurate" threshold and the spread are illustrative,
   chosen to show the shape of the mechanic, not Valorant's exact numbers.
   Fixed-step simulation from t = 0; the walk-through's three runs and __seek are deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, DT = 1 / 120;
  const ACCEL = 8, FRICTION = 2.5, ACCURATE = .2, HEAD = 26;
  const spread = v => 4 + Math.max(0, Math.abs(v) - .05) * 150;      // pixels at the target
  const rnd = n => { let s = (n * 2654435761) >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); };

  function fresh() { return { t: 0, v: 0, x: 0, hist: [], shots: [], n: 0 }; }
  function step(S, dir) {
    if (dir) { S.v += Math.sign(dir - S.v) * ACCEL * DT; if (Math.sign(dir) !== Math.sign(S.v) && S.v !== 0) S.v += Math.sign(dir) * FRICTION * DT; S.v = clamp(S.v, -1, 1); }
    else { const f = FRICTION * DT; S.v = Math.abs(S.v) <= f ? 0 : S.v - Math.sign(S.v) * f; }
    S.x += S.v * DT; S.t += DT; S.hist.push([S.t, S.v]); if (S.hist.length > 600) S.hist.shift();
  }
  function shoot(S) {
    const r = rnd(++S.n), a = r() * TAU, d = Math.sqrt(r()) * spread(S.v);
    const sh = { t: S.t, v: S.v, dx: Math.cos(a) * d, dy: Math.sin(a) * d }; sh.hit = Math.hypot(sh.dx, sh.dy) < HEAD; S.shots.push(sh); return sh;
  }

  // the three runs: [name, input at time u, shot times]
  const RUNS = [
    ['Shoot while moving', u => u < 3 ? 1 : 0, [1.0, 1.4, 1.8, 2.2]],
    ['Let go, then shoot', u => u < 1.2 ? 1 : 0, [1.3, 1.45, 1.75, 2.1]],
    ['Counter-strafe: tap the other key', u => u < 1.2 ? 1 : u < 1.2 + 1 / (ACCEL + FRICTION) ? -1 : 0, [1.32, 1.6, 1.9, 2.2]],
  ];
  const RUN_LEN = 3.2, DUR = RUN_LEN * 3;
  function tourAt(t) {
    const k = Math.min(2, Math.floor(t / RUN_LEN)), u = t - k * RUN_LEN, run = RUNS[k], S = fresh();
    while (S.t < u) { const before = S.t; step(S, run[1](S.t)); run[2].forEach(ts => { if (before < ts && S.t >= ts) shoot(S); }); }
    return { S, run, k, dir: run[1](S.t) };
  }

  function draw(g, S, title, dir) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    // the range: a target, the crosshair and its spread
    const cx = 260, cy = 280;
    g.fillStyle = '#2a2e55'; g.beginPath(); g.roundRect(20, 60, 480, 440, 12); g.fill();
    g.fillStyle = '#3d4270'; g.fillRect(20, 380, 480, 120);
    g.fillStyle = '#c9b48a'; g.beginPath(); g.arc(cx, cy, HEAD, 0, TAU); g.fill(); g.beginPath(); g.roundRect(cx - 46, cy + 30, 92, 130, 18); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, HEAD, 0, TAU); g.stroke(); g.setLineDash([]);
    const r = spread(S.v), acc = Math.abs(S.v) <= ACCURATE;
    g.strokeStyle = acc ? '#7df0a8' : '#ff8a7a'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 2; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(cx + a * 5, cy + b * 5); g.lineTo(cx + a * 14, cy + b * 14); g.stroke(); });
    S.shots.forEach(sh => { g.fillStyle = sh.hit ? '#7df0a8' : '#ff8a7a'; g.beginPath(); g.arc(cx + sh.dx, cy + sh.dy, 5, 0, TAU); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 1; g.stroke(); });
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(title, 36, 88);
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = acc ? '#7df0a8' : '#ff8a7a'; g.fillText(acc ? 'accurate' : 'moving: shots spread', 36, 110);
    // keys
    [['A', -1], ['D', 1]].forEach(([k, d], i) => { const x = 380 + i * 52, on = dir === d; g.fillStyle = on ? C.gold : 'rgba(255,255,255,.15)'; g.beginPath(); g.roundRect(x, 440, 44, 40, 8); g.fill(); g.font = '800 18px Montserrat, Jost, sans-serif'; g.fillStyle = on ? C.navy : '#fff'; g.textAlign = 'center'; g.fillText(k, x + 22, 467); });
    // velocity over the last 3 s, with the shots on it
    const vx = 540, vw = 470, vy = 80, vh = 300, t1 = S.t, t0 = t1 - 3, sx = t => vx + (t - t0) / 3 * vw, sy = v => vy + vh / 2 - v * vh / 2;
    g.textAlign = 'left'; g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Speed over the last 3 seconds', vx, 50);
    g.fillStyle = 'rgba(47,174,99,.15)'; g.fillRect(vx, sy(ACCURATE), vw, sy(-ACCURATE) - sy(ACCURATE));
    g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.good; g.fillText('accurate band', vx + 6, sy(ACCURATE) - 4);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.strokeRect(vx, vy, vw, vh); g.beginPath(); g.moveTo(vx, sy(0)); g.lineTo(vx + vw, sy(0)); g.stroke();
    g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText('right', vx - 6, sy(1) + 10); g.fillText('still', vx - 6, sy(0) + 4); g.fillText('left', vx - 6, sy(-1) - 2);
    g.strokeStyle = C.player; g.lineWidth = 3; g.beginPath(); let first = true;
    S.hist.forEach(([t, v]) => { if (t < t0) return; first ? g.moveTo(sx(t), sy(v)) : g.lineTo(sx(t), sy(v)); first = false; }); g.stroke();
    S.shots.forEach(sh => { if (sh.t < t0) return; g.fillStyle = sh.hit ? C.good : C.red; g.beginPath(); g.arc(sx(sh.t), sy(sh.v), 6, 0, TAU); g.fill(); });
    // stop times
    g.textAlign = 'left'; g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.ink;
    g.fillText(`Letting go stops you in ${(1 / FRICTION).toFixed(2)} s; tapping the other key, in ${(1 / (ACCEL + FRICTION)).toFixed(2)} s.`, vx, vy + vh + 30);
    const hits = S.shots.filter(s => s.hit).length;
    g.font = '800 22px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`${hits} / ${S.shots.length}`, vx, vy + vh + 76);
    g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('shots on the head', vx + 80, vy + vh + 74);
    g.fillText('Speeds, stopping rates and spread are illustrative.', vx, vy + vh + 110);
  }

  const scenes = {};
  canvasDemo('strafe', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, S: fresh(), keys: { a: 0, d: 0 }, acc: 0, key: '' };
    const tourBtn = $(s, '.cs-tour'), playBtn = $(s, '.cs-play');
    const play = () => { st.tour = false; st.S = fresh(); playBtn.classList.add('on'); tourBtn.classList.remove('on'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); playBtn.classList.remove('on'); };
    playBtn.onclick = play;
    s._key = (e, down) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'd') { if (st.tour && down) play(); st.keys[k] = down ? 1 : 0; e.preventDefault(); }
      if ((k === 'j' || k === 'k') && down && !e.repeat) { if (st.tour) play(); shoot(st.S); e.preventDefault(); }
    };
    cv.addEventListener('mousedown', () => { if (st.tour) play(); shoot(st.S); });
    function info(title, k) {
      const key = [title, st.tour].join(); if (key === st.key) return; st.key = key;
      say($(s, '.cs-out'), st.tour ? ['Holding D and firing: every shot leaves the spread circle wide open.', 'Letting go: friction stops you, but the first shot comes while you are still sliding.', 'Counter-strafe: tap A to cancel D. You stop almost at once, and the first shot lands.'][k]
        : 'Hold A or D to strafe, click the canvas (or press J) to shoot. Try stopping by letting go, then by tapping the other key.');
    }
    scenes.strafe = { seek(t) { st.held = true; const { S, run, k, dir } = tourAt(t); draw(g, S, run[0], dir); info(run[0], k); }, dur: () => DUR };
    return dt => {
      if (st.held) return;
      if (st.tour) { st.t += Math.max(0, dt); if (st.t >= DUR) st.t = 0; const { S, run, k, dir } = tourAt(st.t); draw(g, S, run[0], dir); info(run[0], k); return; }
      st.acc += Math.min(.1, Math.max(0, dt)); const dir = st.keys.d - st.keys.a;
      while (st.acc >= DT) { step(st.S, dir); st.acc -= DT; }
      if (st.S.shots.length > 12) st.S.shots.shift();
      draw(g, st.S, 'Your turn', dir); info('play', 0);
    };
  }, {
    enter(s) { s._kd = e => s._key(e, true); s._ku = e => s._key(e, false); addEventListener('keydown', s._kd); addEventListener('keyup', s._ku); },
    leave(s) { removeEventListener('keydown', s._kd); removeEventListener('keyup', s._ku); },
  });
  window.__seek = (t, which = 'strafe') => scenes[which].seek(t);
  window.__dur = (which = 'strafe') => scenes[which].dur();
})();
