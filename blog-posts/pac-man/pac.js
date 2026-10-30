/* Pac-Man ghost targeting (genre breakdown: "Pathfinding in Pac-Man").
   Every ghost runs the same step rule: at each tile, look at the open neighbours (never straight back), and take the one
   whose centre is closest in a straight line to a target tile. Only the target differs, and that gives four personalities:
   Blinky aims at Pac-Man's tile; Pinky aims four tiles ahead of him; Inky doubles the vector from Blinky to the tile two
   ahead of him; Clyde chases until he is within eight tiles, then heads for his corner. Scatter sends each ghost to its own
   corner. These target rules are the well-documented arcade behaviour (see The Pac-Man Dossier, Jamey Pittman), simplified:
   no ghost house, no tunnel slow-down, and no up-direction overflow quirk. The maze is our own.
   Fixed-step simulation from t = 0, so the walk-through and __seek are deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, DT = 1 / 60;
  const HALF = [
    '############', '#.....#.....', '#.###.#.###.', '#.###.#.###.', '#...........', '#.###.#####.', '#.....#.....', '#####.#.###.', '#####.#.#...',
    '#####.#.#.##', '#.......#...', '#.###.#####.', '#...#.......', '###.#.#.###.', '#.....#...#.', '#.#######.#.', '#...........', '############',
  ];
  const MAP = HALF.map(r => r + r.slice(0, -1).split('').reverse().join(''));
  const MW = MAP[0].length, MH = MAP.length, TS = 30, OX = 16, OY = 26;
  const open = (x, y) => y >= 0 && y < MH && x >= 0 && x < MW && MAP[y][x] === '.';
  const DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]];          // up, left, down, right: the arcade's tie-break order
  const px = x => OX + (x + .5) * TS, py = y => OY + (y + .5) * TS;
  const GHOSTS = [
    { id: 'blinky', name: 'Blinky', col: '#e5322d', start: [11, 8], dir: 1, corner: [MW - 2, -3], rule: 'aims at Pac-Man’s tile' },
    { id: 'pinky', name: 'Pinky', col: '#f28bc7', start: [10, 10], dir: 1, corner: [1, -3], rule: 'aims 4 tiles ahead of Pac-Man' },
    { id: 'inky', name: 'Inky', col: '#20b8d8', start: [12, 10], dir: 3, corner: [MW - 1, MH], rule: 'doubles Blinky → 2 tiles ahead' },
    { id: 'clyde', name: 'Clyde', col: '#f59a2c', start: [13, 9], dir: 0, corner: [0, MH], rule: 'chases beyond 8 tiles, else his corner' },
  ];
  const PAC_START = [11, 16];
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

  function fresh() {
    return {
      t: 0, r: rng(5), caught: 0, flash: -9, mode: 'chase',
      pac: { x: PAC_START[0], y: PAC_START[1], dir: 1, p: 0, want: 1, sp: 6.5 },
      gs: GHOSTS.map(g => ({ ...g, x: g.start[0], y: g.start[1], p: 0, sp: 6, target: [0, 0] })),
    };
  }
  const ahead = (pac, n) => [pac.x + DIRS[pac.dir][0] * n, pac.y + DIRS[pac.dir][1] * n];
  function targetOf(S, g, o) {
    const pac = S.pac, pt = [pac.x, pac.y];
    if (S.mode === 'scatter') return g.corner;
    if (o.blinkyAll || g.id === 'blinky') return pt;
    if (g.id === 'pinky') return ahead(pac, 4);
    if (g.id === 'inky') { const piv = ahead(pac, 2), b = S.gs[0]; return [2 * piv[0] - b.x, 2 * piv[1] - b.y]; }
    return d2([g.x, g.y], pt) > 64 ? pt : g.corner;
  }
  // the one rule every ghost shares
  function choices(x, y, dir) {
    const back = (dir + 2) % 4; let c = [0, 1, 2, 3].filter(k => k !== back && open(x + DIRS[k][0], y + DIRS[k][1]));
    if (!c.length) c = [back];
    return c;
  }
  function choose(x, y, dir, target) {
    let best = -1, bd = 1e9;
    choices(x, y, dir).forEach(k => { const d = d2([x + DIRS[k][0], y + DIRS[k][1]], target); if (d < bd - 1e-9) { bd = d; best = k; } });
    return best;
  }

  function move(e, dt, pick) {
    e.p += e.sp * dt;
    while (e.p >= 1) { e.x += DIRS[e.dir][0]; e.y += DIRS[e.dir][1]; e.p -= 1; e.dir = pick(e); if (e.dir < 0) { e.p = 0; break; } }
  }
  const posOf = e => e.dir < 0 ? [e.x, e.y] : [e.x + DIRS[e.dir][0] * e.p, e.y + DIRS[e.dir][1] * e.p];

  function step(S, o, keys) {
    const pac = S.pac;
    const mode = o.mode;
    if (mode !== S.mode) { S.mode = mode; S.gs.forEach(g => { g.x += DIRS[g.dir][0]; g.y += DIRS[g.dir][1]; g.p = 1 - g.p; g.dir = (g.dir + 2) % 4; }); }
    // Pac-Man: the player's wanted direction, or a seeded wander in the walk-through
    if (keys) { const k = keys.w ? 0 : keys.a ? 1 : keys.s ? 2 : keys.d ? 3 : -1; if (k >= 0) pac.want = k; if (pac.dir >= 0 && pac.want === (pac.dir + 2) % 4) { pac.x += DIRS[pac.dir][0]; pac.y += DIRS[pac.dir][1]; pac.p = 1 - pac.p; pac.dir = pac.want; } }
    if (pac.dir < 0) { if (open(pac.x + DIRS[pac.want][0], pac.y + DIRS[pac.want][1])) pac.dir = pac.want; }
    else move(pac, DT, e => {
      // walk-through: keep away from the nearest ghost, with a little seeded noise
      if (!keys) { const c = choices(e.x, e.y, e.dir); let best = c[0], bs = -1; c.forEach(k => { const n = [e.x + DIRS[k][0], e.y + DIRS[k][1]], sc = Math.min(...S.gs.map(g => d2(n, [g.x, g.y]))) + S.r() * 6; if (sc > bs) { bs = sc; best = k; } }); return best; }
      if (open(e.x + DIRS[e.want][0], e.y + DIRS[e.want][1])) return e.want;
      return open(e.x + DIRS[e.dir][0], e.y + DIRS[e.dir][1]) ? e.dir : -1;
    });
    S.gs.forEach(g => { g.target = targetOf(S, g, o); move(g, DT, e => choose(e.x, e.y, e.dir, targetOf(S, e, o))); });
    // caught: everyone back to the start
    const pp = posOf(pac);
    if (o.catching && S.gs.some(g => d2(posOf(g), pp) < .36)) {
      S.caught++; S.flash = S.t; S.flashAt = pp;
      Object.assign(pac, { x: PAC_START[0], y: PAC_START[1], dir: 1, p: 0, want: 1 });
      S.gs.forEach(g => Object.assign(g, { x: g.start[0], y: g.start[1], p: 0, dir: GHOSTS.find(q => q.id === g.id).dir }));
    }
    S.t += DT;
  }

  function cross(g, x, y, col, s = 9) { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke(); }
  function ghostShape(g, x, y, col, dir, a = 1) {
    g.save(); g.globalAlpha = a; g.fillStyle = col; const r = 12;
    g.beginPath(); g.arc(x, y - 2, r, Math.PI, 0); g.lineTo(x + r, y + r);
    for (let i = 0; i < 4; i++) g.lineTo(x + r - (i + .5) * r / 2, y + r - (i % 2 ? 0 : 5));
    g.lineTo(x - r, y + r); g.closePath(); g.fill();
    const [dx, dy] = dir >= 0 ? DIRS[dir] : [0, 0];
    [-5, 5].forEach(ex => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + ex, y - 3, 4, 0, TAU); g.fill(); g.fillStyle = C.navy; g.beginPath(); g.arc(x + ex + dx * 2, y - 3 + dy * 2, 2, 0, TAU); g.fill(); });
    g.restore();
  }

  function draw(g, S, o, paused) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = '#10163a'; g.beginPath(); g.roundRect(OX - 8, OY - 8, MW * TS + 16, MH * TS + 16, 12); g.fill();
    g.fillStyle = '#2b3aa8'; g.fillRect(OX, OY, MW * TS, MH * TS);
    g.fillStyle = '#10163a'; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (open(x, y)) g.fillRect(OX + x * TS - .5, OY + y * TS - .5, TS + 1, TS + 1);
    const show = gh => o.show === 'all' || o.show === gh.id;
    // targets and their construction
    g.save(); g.beginPath(); g.rect(OX - 8, OY - 8, MW * TS + 16, MH * TS + 16); g.clip();
    S.gs.forEach(gh => {
      if (!show(gh)) return;
      const [gx, gy] = posOf(gh), tx = px(gh.target[0]), ty = py(gh.target[1]);
      g.setLineDash([6, 6]); g.strokeStyle = gh.col; g.lineWidth = 2; g.beginPath(); g.moveTo(px(gx), py(gy)); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]);
      cross(g, tx, ty, gh.col);
      if (S.mode === 'chase' && !o.blinkyAll) {
        if (gh.id === 'pinky' || gh.id === 'inky') { const a = ahead(S.pac, gh.id === 'pinky' ? 4 : 2); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.strokeRect(px(a[0]) - TS / 2 + 2, py(a[1]) - TS / 2 + 2, TS - 4, TS - 4); }
        if (gh.id === 'inky') { const b = posOf(S.gs[0]), a = ahead(S.pac, 2); g.strokeStyle = 'rgba(229,50,45,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(px(b[0]), py(b[1])); g.lineTo(px(a[0]), py(a[1])); g.stroke(); g.strokeStyle = 'rgba(32,184,216,.9)'; g.beginPath(); g.moveTo(px(a[0]), py(a[1])); g.lineTo(tx, ty); g.stroke(); }
        if (gh.id === 'clyde') { const pp = posOf(S.pac); g.strokeStyle = 'rgba(245,154,44,.7)'; g.lineWidth = 2; g.setLineDash([4, 6]); g.beginPath(); g.arc(px(pp[0]), py(pp[1]), 8 * TS, 0, TAU); g.stroke(); g.setLineDash([]); }
      }
    });
    g.restore();
    // the distance check at each shown ghost's next tile
    if (paused) S.gs.forEach(gh => {
      if (!show(gh) || gh.dir < 0) return;
      const nx = gh.x + DIRS[gh.dir][0], ny = gh.y + DIRS[gh.dir][1], tgt = targetOf(S, gh, o), pick = choose(nx, ny, gh.dir, tgt);
      choices(nx, ny, gh.dir).forEach(k => {
        const cx = nx + DIRS[k][0], cy = ny + DIRS[k][1], d = Math.sqrt(d2([cx, cy], tgt));
        g.fillStyle = k === pick ? 'rgba(255,185,81,.9)' : 'rgba(255,255,255,.25)'; g.fillRect(px(cx) - TS / 2 + 3, py(cy) - TS / 2 + 3, TS - 6, TS - 6);
        g.font = '700 12px Jost, sans-serif'; g.fillStyle = k === pick ? C.navy : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d.toFixed(1), px(cx), py(cy));
      });
    });
    // pellets are left out on purpose: the picture is about targets
    const pp = posOf(S.pac), mouth = .25 + .2 * Math.abs(Math.sin(S.t * 12)), pa = S.pac.dir < 0 ? 0 : Math.atan2(DIRS[S.pac.dir][1], DIRS[S.pac.dir][0]);
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(px(pp[0]), py(pp[1])); g.arc(px(pp[0]), py(pp[1]), 12, pa + mouth, pa + TAU - mouth); g.closePath(); g.fill();
    S.gs.forEach(gh => { const [gx, gy] = posOf(gh); ghostShape(g, px(gx), py(gy), gh.col, gh.dir, show(gh) ? 1 : .3); });
    if (S.t - S.flash < 1) T.label('caught', px(S.flashAt[0]), py(S.flashAt[1]) - 24, 'center', C.red, 14);

    // legend
    const x0 = 724; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = '800 17px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(S.mode === 'scatter' ? 'Scatter: each to a corner' : o.blinkyAll ? 'Chase: everyone uses Blinky’s rule' : 'Chase: four targets', x0, 40);
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('One rule for all: at each tile, take the open', x0, 64); g.fillText('step closest in a straight line to the target.', x0, 82);
    GHOSTS.forEach((gh, i) => {
      const y = 126 + i * 64, on = show(gh), rule = S.mode === 'scatter' ? 'heads for his own corner' : o.blinkyAll ? 'aims at Pac-Man’s tile' : gh.rule;
      g.globalAlpha = on ? 1 : .4; ghostShape(g, x0 + 14, y, gh.col, 3);
      g.font = '700 16px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(gh.name, x0 + 38, y - 4);
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(rule, x0 + 38, y + 15); g.globalAlpha = 1;
    });
    // conga line measure: how spread out the ghosts are
    const spread = Math.round(S.gs.reduce((a, gh, i) => a + S.gs.slice(i + 1).reduce((b, h) => b + Math.sqrt(d2(posOf(gh), posOf(h))), 0), 0) / 6 * 10) / 10;
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`Average gap between ghosts: ${spread.toFixed(1)} tiles`, x0, 410);
    g.fillStyle = '#e6dcc5'; g.fillRect(x0, 420, 290, 12); g.fillStyle = C.gold; g.fillRect(x0, 420, 290 * clamp(spread / 12), 12);
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`Times caught: ${S.caught}`, x0, 466);
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted;
    g.fillText('Target rules: the arcade behaviour as documented in', x0, 520); g.fillText('The Pac-Man Dossier (Jamey Pittman). Maze: our own.', x0, 536);
    if (paused) T.label('paused: the numbers are each choice’s distance to the target', 360, 14, 'center', C.ink, 13, 'rgba(255,185,81,.95)');
  }

  // walk-through: one ghost at a time, then scatter, then the conga line
  const ACTS = [
    { len: 7, show: 'blinky', mode: 'chase', say: 'Blinky aims straight at Pac-Man’s tile, so he is always on his tail.' },
    { len: 7, show: 'pinky', mode: 'chase', say: 'Pinky aims four tiles ahead of Pac-Man (the white square), so she cuts him off from the front.' },
    { len: 9, show: 'inky', mode: 'chase', say: 'Inky takes the tile two ahead of Pac-Man and doubles the line from Blinky to it. He depends on where Blinky is, which makes him the hardest to read.' },
    { len: 8, show: 'clyde', mode: 'chase', say: 'Clyde chases while he is more than eight tiles away (the circle), then turns for his corner. He looks indecisive.' },
    { len: 6, show: 'all', mode: 'scatter', say: 'Scatter: each ghost targets its own corner and circles it. The timers switch between scatter and chase, and every switch reverses the ghosts.' },
    { len: 8, show: 'all', mode: 'chase', say: 'All four in chase: the same step rule, four targets, a pincer you can learn to read.' },
    { len: 10, show: 'all', mode: 'chase', blinkyAll: true, say: 'Give everyone Blinky’s target and the four collapse into a conga line behind Pac-Man. The personalities were only ever in the targets.' },
  ];
  const DUR = ACTS.reduce((a, b) => a + b.len, 0);
  const actAt = t => { let a = 0; for (const x of ACTS) { if (t < a + x.len) return x; a += x.len; } return ACTS[ACTS.length - 1]; };
  const SCHED = [['scatter', 7], ['chase', 20], ['scatter', 7], ['chase', 20], ['scatter', 5], ['chase', 1e9]];
  const schedMode = t => { let a = 0; for (const [m, l] of SCHED) { if (t < a + l) return m; a += l; } return 'chase'; };

  const scenes = {};
  canvasDemo('pac', (s, cv, g) => {
    const st = { tour: true, held: false, S: fresh(), keys: { w: 0, a: 0, s: 0, d: 0 }, acc: 0, paused: false, show: 'all', key: '', mode: 'tour' };
    const segs = $$(s, '.pm-show .btn'), scat = $(s, '.pm-scatter'), conga = $(s, '.pm-conga'), tourBtn = $(s, '.pm-tour'), playBtn = $(s, '.pm-play'), pauseBtn = $(s, '.pm-pause');
    const setShow = v => { st.show = v; segs.forEach(b => b.classList.toggle('on', b.dataset.g === v)); };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    segs.forEach(b => b.onclick = () => { manual(); setShow(b.dataset.g); });
    scat.onchange = conga.onchange = manual;
    tourBtn.onclick = () => { st.tour = true; st.mode = 'tour'; st.S = fresh(); st.paused = false; tourBtn.classList.add('on'); playBtn.classList.remove('on'); };
    playBtn.onclick = () => { manual(); st.mode = 'play'; st.S = fresh(); playBtn.classList.add('on'); };
    pauseBtn.onclick = () => { st.paused = !st.paused; pauseBtn.classList.toggle('on', st.paused); };
    s._key = (e, down) => { const k = e.key.toLowerCase(); if (k.length === 1 && 'wasd'.includes(k)) { if (st.mode !== 'play' && down) playBtn.onclick(); st.keys[k] = down ? 1 : 0; e.preventDefault(); } };
    function opts() {
      if (st.tour) { const a = actAt(st.S.t); setShow(a.show); scat.checked = a.mode === 'scatter'; conga.checked = !!a.blinkyAll; return { show: a.show, mode: a.mode, blinkyAll: !!a.blinkyAll, act: a, catching: false }; }
      return { show: st.show, mode: scat.checked ? 'scatter' : schedMode(st.S.t), blinkyAll: conga.checked, catching: st.mode === 'play' };
    }
    function info(o) {
      const key = [o.act && o.act.say, o.mode, o.blinkyAll, st.S.caught].join();
      if (key === st.key) return; st.key = key;
      say($(s, '.pm-stats'), `<div><b>${o.mode}</b><span>mode</span></div><div class="${st.S.caught ? 'r' : ''}"><b>${st.S.caught}</b><span>times caught</span></div>`);
      say($(s, '.pm-out'), o.act ? o.act.say : o.blinkyAll ? 'Everyone uses Blinky’s rule: watch them string out into a single line.' : 'Pause to see each shown ghost’s distance check at its next tile.' + (st.mode === 'play' ? '' : ' Press W A S D to drive Pac-Man.'));
    }
    scenes.pac = { seek(t) { st.held = true; st.tour = true; st.S = fresh(); let o; while (st.S.t < t) { o = opts(); step(st.S, o, null); } o = opts(); draw(g, st.S, o, false); info(o); }, dur: () => DUR };
    return dt => {
      if (st.held) return;
      const o = opts();
      if (!st.paused) { st.acc += Math.min(.1, Math.max(0, dt)); while (st.acc >= DT) { step(st.S, opts(), st.mode === 'play' ? st.keys : null); st.acc -= DT; } }
      if (st.tour && st.S.t >= DUR) st.S = fresh();
      draw(g, st.S, o, st.paused); info(o);
    };
  }, {
    enter(s) { s._kd = e => s._key(e, true); s._ku = e => s._key(e, false); addEventListener('keydown', s._kd); addEventListener('keyup', s._ku); },
    leave(s) { removeEventListener('keydown', s._kd); removeEventListener('keyup', s._ku); },
  });

  window.__seek = (t, which = 'pac') => scenes[which].seek(t);
  window.__dur = (which = 'pac') => scenes[which].dur();
})();
