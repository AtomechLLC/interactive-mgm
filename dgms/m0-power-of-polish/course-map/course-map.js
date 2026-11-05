/* Module 0, slides 22-34 and 54-58: the course map.
   Slide 1: "Game Mechanics & Experience" ringed by seven building blocks (slides 54-55), recoloured into the three phases
   of slide 56 (Insight, the 3Cs, Readability) and numbered in the notes' build order (slides 57-58).
   Slide 2: the toolbox fills up, one tool per module (slides 22-26).
   Slide 3: what this course is not (slides 30-34): four topics go elsewhere, the modules stay.
   Every frame is a pure function of the clock and the learner's picks, so __seek is deterministic. */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const IMG = '../img/';
  const SEG = [
    ['Player Profiling', 'Module 2 · Audience', 'Insight', 'Who is the game for? Identify the target audience before the concept, the step many developers skip.', 'team-idea', '#8a4fd6'],
    ['Skill Testing & Progression', 'Module 3 · Player Skills', 'Readability', 'Decide which skills the game tests, at what level, and how the tests grow.', 'archery-target', '#2fae63'],
    ['Character Design', 'Module 4 · Character', 'Core (3Cs)', 'A strong character fantasy: “the character is the nexus of fantasy and gameplay”.', 'visored-helm', '#e5322d'],
    ['Responsive Controller Design', 'Module 5 · Controller', 'Core (3Cs)', 'Natural controls that read intent: the game does what the player meant, not the literal stick input.', 'gamepad', '#2ea3dc'],
    ['Camera Immersion', 'Module 6 · Camera', 'Core (3Cs)', 'The camera is your primary tool for telling the player what matters right now.', 'video-camera', '#5562eb'],
    ['Gameplay Balance', 'Module 8 · Balance', 'Insight', 'Balance the content so every choice stays meaningful.', 'scales', '#9a5a06'],
    ['VFX & SFX Feedback', 'Modules 7 and 9 · Sound, Game Feel', 'Readability', 'Amplify the impact: communicate the state of the game to the player right away.', 'screen-impact', '#e0a92d'],
  ];
  const KEYS = ['m2-audience', 'm3-skills', 'm4-character', 'm5-controller', 'm6-camera', 'm8-balance', 'm9-game-feel'];
  const PH = {
    'Insight': ['#8a4fd6', 'the “why”: everything that informs design decisions before a single line of code is written'],
    'Core (3Cs)': ['#2ea3dc', 'character, controller, camera: the interactive core, the moment-to-moment “how”'],
    'Readability': ['#e0a92d', 'the “does it land?” pillar: visual clarity, audio language, test design, information architecture'],
  };
  // slide 56 splits the ring into nine labels; the export lists them but not their ring, so this grouping is inferred (3 per phase)
  const PHM = { 'Insight': 'Player Profiling, Skill Progression, Balance Tuning', 'Core (3Cs)': 'Character Design, Responsive Controller Design, Immersive Cameras', 'Readability': 'Visual Communication, Audio Communication, Skill Tests' };
  const ORDER = ['Identify your target audience', 'Decide on skill level and tests', 'Develop a strong character fantasy', 'Prototype natural controls', 'Choose immersive cameras', 'Balance content', 'Amplify the impact with game feel'];
  ['team-idea', 'archery-target', 'visored-helm', 'gamepad', 'video-camera', 'scales', 'screen-impact', 'stone-tower', 'speaker'].forEach(n => SCENE.img(IMG + n + '-w.svg'));
  const W = 1040, H = 585, CX = 296, CY = 290, R1 = 240, R0 = 100, N = SEG.length, A0 = -Math.PI / 2;
  const segAt = (x, y) => {
    const dx = x - CX, dy = y - CY, r = Math.hypot(dx, dy); if (r < R0 || r > R1) return -1;
    let a = Math.atan2(dy, dx) - A0; a = ((a % TAU) + TAU) % TAU; return Math.floor(a / (TAU / N));
  };
  const mid = (i, r) => { const a = A0 + (i + .5) * TAU / N; return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; };

  /* ---------- slide 1: the wheel ---------- */
  const TOUR = 30;   // 0-14 topics one by one, 14-21 phases, 21-30 build order
  function tourState(t) {
    if (t < 14) return { mode: 'topics', sel: Math.min(N - 1, Math.floor(t / 2)), k: 1 };
    if (t < 21) return { mode: 'phases', sel: -1, k: clamp((t - 14) / 1.2) };
    return { mode: 'order', sel: Math.min(N - 1, Math.floor((t - 21) / 1.2)), k: clamp((t - 21) / 8.4) };
  }
  function drawWheel(g, st, t) {
    SCENE.paper(g, W, H);
    const f = st.tour ? tourState(t) : { mode: st.mode, sel: st.sel, k: 1 };
    for (let i = 0; i < N; i++) {
      const a = A0 + i * TAU / N, b = a + TAU / N, [, , ph, , ic, col] = SEG[i];
      const pc = PH[ph][0], fill = f.mode === 'topics' ? col : f.mode === 'phases' ? pc : (i <= f.sel ? pc : '#cdbf9f');
      const on = i === f.sel, out = on ? 10 : 0;
      g.save(); g.translate(Math.cos((a + b) / 2) * out, Math.sin((a + b) / 2) * out);
      g.beginPath(); g.arc(CX, CY, R1, a + .012, b - .012); g.arc(CX, CY, R0, b - .012, a + .012, true); g.closePath();
      g.fillStyle = fill; g.globalAlpha = f.sel >= 0 && !on && f.mode === 'topics' ? .55 : 1; g.fill();
      g.globalAlpha = 1; g.strokeStyle = '#fffaf0'; g.lineWidth = 3; g.stroke();
      const [ix, iy] = mid(i, (R0 + R1) / 2 + 34);
      SCENE.draw(g, IMG + ic + '-w.svg', ix - 24, iy - 24, 48);
      const [lx, ly] = mid(i, (R0 + R1) / 2 - 34);
      const n2 = SEG[i][0].split(' ').length > 2 ? 2 : 1;
      wrap(g, SEG[i][0], lx, ly - (n2 - 1) * 7 + 4, 96, { size: 12, lh: 14, col: '#fff', align: 'center', w: 700, font: 'd' });
      g.restore();
    }
    // centre
    g.fillStyle = C.navy; g.beginPath(); g.arc(CX, CY, R0 - 6, 0, TAU); g.fill();
    ['Game', 'Mechanics', '& Experience'].forEach((l, j) => txt(g, l, CX, CY - 18 + j * 19, { size: 15, col: j === 1 ? C.gold : '#fff', align: 'center', base: 'middle' }));
    // build order path
    if (f.mode === 'order') {
      const pts = SEG.map((_, i) => mid(i, R1 + 20));
      const upto = f.k * (N - 1), a0 = A0 + .5 * TAU / N;
      g.strokeStyle = C.navy; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.arc(CX, CY, R1 + 20, a0, a0 + upto * TAU / N); g.stroke(); g.setLineDash([]);
      pts.forEach(([x, y], i) => { if (i > upto + .01) return; g.fillStyle = C.gold; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); txt(g, i + 1, x, y + 1, { size: 15, align: 'center', base: 'middle', col: C.navy }); });
    }
    // right card
    const X = 610, Y = 30;
    if (f.mode === 'phases') {
      txt(g, '3 phases of crafting emotionally', X, Y + 20, { size: 20 }); txt(g, 'engaging mechanics', X, Y + 46, { size: 20 });
      Object.entries(PH).forEach(([n, [c, d]], j) => {
        const y = Y + 80 + j * 150, a = clamp(f.k * 3 - j);
        box(g, X, y, 400, 132, { fill: '#fffaf0', stroke: c, lw: 3, a });
        txt(g, n, X + 16, y + 30, { size: 19, col: c, a });
        const mem = PHM[n];
        g.save(); g.globalAlpha = a; let yy = wrap(g, d, X + 16, y + 54, 370, { size: 14.5 }); wrap(g, mem, X + 16, yy + 4, 370, { size: 13.5, col: C.muted, w: 600 }); g.restore();
      });
      return;
    }
    if (f.mode === 'order') {
      txt(g, 'Where to start: the build order', X, Y + 20, { size: 20 });
      ORDER.forEach((o, i) => {
        const y = Y + 52 + i * 66, on = i <= f.sel;
        box(g, X, y, 400, 56, { fill: on ? '#fffaf0' : 'rgba(255,250,240,.4)', stroke: on ? PH[SEG[i][2]][0] : '#e3d8bf', lw: 2.5 });
        txt(g, `${i + 1}`, X + 22, y + 36, { size: 22, col: on ? C.goldInk : '#cdbf9f', align: 'center' });
        txt(g, o, X + 46, y + 24, { size: 15, col: on ? C.ink : '#b5aa90' });
        txt(g, SEG[i][1], X + 46, y + 44, { size: 13, font: 'b', w: 600, col: on ? C.muted : '#c9bfa6' });
      });
      return;
    }
    const i = f.sel;
    if (i < 0) { txt(g, '7 building blocks,', X, Y + 40, { size: 26 }); txt(g, 'spread across the modules', X, Y + 74, { size: 26 }); wrap(g, 'Hover a segment to read what it covers and which module teaches it. Click it to open that module on the course home.', X, Y + 120, 390, { size: 17 }); return; }
    const [n, mod, ph, d, ic, col] = SEG[i];
    box(g, X, Y, 400, 520, { fill: '#fffaf0', stroke: col, lw: 3 });
    g.fillStyle = col; g.beginPath(); g.arc(X + 60, Y + 66, 40, 0, TAU); g.fill();
    SCENE.draw(g, IMG + ic + '-w.svg', X + 34, Y + 40, 52);
    const yy = wrap(g, n, X + 114, Y + 58, 270, { size: 22, font: 'd', w: 800, lh: 26 });
    txt(g, mod, X + 114, Math.max(yy + 2, Y + 96), { size: 14, font: 'b', w: 600, col: C.goldInk });
    wrap(g, d, X + 24, Y + 160, 352, { size: 18, lh: 25 });
    box(g, X + 24, Y + 330, 352, 92, { fill: PH[ph][0] + '22', stroke: PH[ph][0] });
    txt(g, 'Phase: ' + ph, X + 40, Y + 358, { size: 15, col: PH[ph][0] });
    wrap(g, PH[ph][1], X + 40, Y + 380, 322, { size: 13.5 });
    txt(g, `Build order: step ${i + 1} of 7`, X + 24, Y + 470, { size: 15, col: C.muted });
  }
  SCENE('wheel', {
    dur: TOUR,
    init(st) {
      st.mode = 'topics'; st.sel = -1;
      const segs = $$(st.s, '.cm-mode .btn');
      st.setMode = m => { st.mode = m; segs.forEach(b => b.classList.toggle('on', b.dataset.m === m)); };
      segs.forEach(b => b.onclick = () => { st.manual(); st.setMode(b.dataset.m); });
      st.cv.addEventListener('mousemove', e => { const p = SCENE.at(st.cv, e), i = segAt(p.x, p.y); st.cv.style.cursor = i >= 0 ? 'pointer' : ''; if (i >= 0 && i !== st.sel) { st.manual(); st.sel = i; } });
      st.cv.addEventListener('click', e => { const p = SCENE.at(st.cv, e), i = segAt(p.x, p.y); if (i >= 0) location.href = '../../' + KEYS[i] + '/index.html'; });
    },
    onTour(st) { st.setMode('topics'); },
    side(st, t) {
      const f = st.tour ? tourState(t) : { mode: st.mode, sel: st.sel };
      if (st.tour) $$(st.s, '.cm-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === f.mode));
      const k = f.mode + f.sel; if (k === st.key) return; st.key = k;
      say($(st.s, '.cm-out'), f.mode === 'phases' ? 'The same seven blocks, grouped into the deck’s three phases. The phase slide splits the ring into nine labels (skill progression and skill tests come apart; sound gets its own). The phase notes are the deck’s; which phase each label sits in is read as three per phase and still to be checked against the slide image.'
        : f.mode === 'order' ? 'The notes’ roadmap: audience first, game feel last. Each step leans on the one before it.'
        : f.sel >= 0 ? `<b>${SEG[f.sel][0]}</b>: ${SEG[f.sel][1]}.` : 'Seven building blocks around one centre: everything in this course serves the mechanics and the experience they create.');
    },
    draw: drawWheel,
  });

  /* ---------- slide 2: the toolbox fills up ---------- */
  const TOOLS = [['Pillars', 'Module 1', 'stone-tower'], ['Audience dials', 'Module 2', 'team-idea'], ['Skill tests', 'Module 3', 'archery-target'], ['Character', 'Module 4', 'visored-helm'], ['Controller', 'Module 5', 'gamepad'], ['Camera', 'Module 6', 'video-camera'], ['Sound', 'Module 7', 'speaker'], ['Balance scales', 'Module 8', 'scales'], ['Game feel', 'Module 9', 'screen-impact']];
  const TB = 1.3, TB0 = 1, TDUR = TB0 + TOOLS.length * TB + 4;
  function drawBox(g, st, t) {
    SCENE.paper(g, W, H);
    const bx = 150, by = 200, bw = 740, bh = 360;
    // an open tray seen from above, three rows of three slots
    box(g, bx, by, bw, bh, { fill: '#c0392b', stroke: C.navy, lw: 4, r: 18 });
    box(g, bx + 14, by + 14, bw - 28, bh - 28, { fill: '#a93226', r: 12 });
    TOOLS.forEach(([n, m, ic], i) => {
      const sx = bx + 34 + (i % 3) * 232, sy = by + 30 + Math.floor(i / 3) * 106;
      box(g, sx, sy, 212, 88, { fill: 'rgba(0,0,0,.12)', r: 10 });
      const t0 = TB0 + i * TB, k = clamp((t - t0) / .6); if (k <= 0) return;
      const e = ease(k), y = lerp(-120, sy, e), sc = lerp(1.25, 1, e), land = clamp((t - t0 - .6) / .25), squash = 1 + Math.sin(land * Math.PI) * .06;
      g.save(); g.translate(sx + 106, y + 44); g.scale(sc * squash, sc / squash);
      SCENE.box(g, -106, -44, 212, 88, { fill: '#fffaf0', stroke: C.navy, lw: 2.5, r: 10 });
      g.fillStyle = C.navy; g.beginPath(); g.arc(-66, 0, 30, 0, TAU); g.fill();
      SCENE.draw(g, IMG + ic + '-w.svg', -88, -22, 44);
      txt(g, n, -26, -4, { size: 16 }); txt(g, m, -26, 18, { size: 13, font: 'b', w: 600, col: C.muted });
      g.restore();
    });
    const n = clamp(Math.floor((t - TB0) / TB) + 1, 0, TOOLS.length);
    txt(g, 'The designer’s toolbox', W / 2, 52, { size: 28, align: 'center' });
    txt(g, `${n} of ${TOOLS.length} tools`, W / 2, 82, { size: 16, font: 'b', w: 600, col: C.muted, align: 'center' });
    const end = clamp((t - (TB0 + TOOLS.length * TB)) / .8);
    if (end > 0) { box(g, 250, 108, 540, 70, { fill: C.navy, a: end }); txt(g, 'YOU decide where and when to use them.', W / 2, 152, { size: 22, col: C.gold, align: 'center', a: end }); }
  }
  SCENE('toolbox', {
    dur: TDUR,
    draw: (g, st, t) => drawBox(g, st, st.tour ? t : Math.min(t, TDUR)),
    side(st, t) {
      const n = clamp(Math.floor((t - TB0) / TB) + 1, 0, TOOLS.length); if (n === st.key) return; st.key = n;
      say($(st.s, '.tb-out'), n ? `<b>${TOOLS[n - 1][1]}</b> adds <b>${TOOLS[n - 1][0].toLowerCase()}</b>. The course gives you tools; it doesn’t tell you which game to make with them.` : 'An empty toolbox. Each module drops one tool in.');
    },
  });

  /* ---------- slide 3: what this course is not ---------- */
  const IN = ['Pillars', 'Audience', 'Player skills', 'Character', 'Controller', 'Camera', 'Sound', 'Balance', 'Game feel'];
  const OUT = [['Production', 'schedules, budgets and shipping'], ['Marketing', 'selling the game'], ['Coding and tooling', 'how the game is built'], ['Leadership', 'running a team']];
  const ALL = [...OUT.map(o => [o[0], 1, o[1]]), ...IN.map(n => [n, 0, 'the content of the game itself'])];
  // a fixed shuffle so the pile looks mixed and the tour is the same every time
  const PILE = [9, 0, 5, 11, 2, 7, 12, 1, 4, 8, 3, 10, 6];
  const SDUR = 2 + PILE.length * .9 + 4;
  function cardPos(k, sorted) {
    const [, side] = ALL[k];
    if (!sorted) { const j = PILE.indexOf(k); return [486 + (j % 3) * 4 - 4, 200 + j * 4 - 10, (j % 5 - 2) * .05]; }
    const same = PILE.filter(q => ALL[q][1] === side && sorted.has(q)), j = same.indexOf(k);
    return side ? [740, 120 + j * 92, 0] : [40 + (j % 2) * 200, 120 + Math.floor(j / 2) * 84, 0];
  }
  function drawScope(g, st, t) {
    SCENE.paper(g, W, H);
    box(g, 24, 24, 420, 537, { fill: '#e8f4ec', stroke: '#5fb47c' }); txt(g, 'In this course', 44, 70, { size: 22, col: '#145c33' }); txt(g, 'the content of the game itself', 44, 94, { size: 14, font: 'b', w: 600, col: '#145c33' });
    box(g, 724, 24, 292, 537, { fill: '#f6eadf', stroke: '#c58b5a' }); txt(g, 'Learn it elsewhere', 744, 70, { size: 22, col: '#7a4a00' }); txt(g, 'out of scope here', 744, 94, { size: 14, font: 'b', w: 600, col: '#7a4a00' });
    const sorted = st.tour ? new Set(PILE.filter((q, j) => t > 2 + j * .9 + .6)) : st.sorted;
    const moving = st.tour ? PILE.findIndex((q, j) => t > 2 + j * .9 && t <= 2 + j * .9 + .6) : -1;
    // the pile first, then sorted cards on top
    const order = [...PILE].reverse().filter(q => !sorted.has(q)).concat(PILE.filter(q => sorted.has(q)));
    if (moving >= 0) order.push(PILE[moving]);
    order.forEach(k => {
      let [x, y, r] = cardPos(k, sorted.has(k) ? sorted : null);
      if (moving >= 0 && k === PILE[moving]) { const kk = ease((t - 2 - moving * .9) / .6), s2 = new Set([...sorted, k]), [x2, y2] = cardPos(k, s2); x = lerp(x, x2, kk); y = lerp(y, y2, kk); r = lerp(r, 0, kk); }
      const [n, side, d] = ALL[k], wide = side && sorted.has(k) && !(moving >= 0 && k === PILE[moving]), w = wide ? 252 : 188, h = wide ? 76 : 68;
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(r);
      box(g, -w / 2, -h / 2, w, h, { fill: '#fffaf0', stroke: sorted.has(k) ? (side ? '#c58b5a' : '#5fb47c') : C.ink, lw: 2.5 });
      txt(g, n, -w / 2 + 14, -h / 2 + 28, { size: 16 });
      if (sorted.has(k) && side) txt(g, d, -w / 2 + 14, -h / 2 + 52, { size: 13, font: 'b', w: 600, col: C.muted });
      g.restore();
    });
    if (st.tour ? t > SDUR - 3.5 : sorted.size === ALL.length) { box(g, 300, 510, 400, 48, { fill: C.navy }); txt(g, 'This course: the game itself.', 500, 541, { size: 18, col: C.gold, align: 'center' }); }
  }
  SCENE('scope', {
    dur: SDUR,
    init(st) {
      st.sorted = new Set();
      st.cv.addEventListener('click', e => {
        const p = SCENE.at(st.cv, e);
        if (p.x > 470 && p.x < 690 && p.y > 180 && p.y < 300) { if (st.tour) st.manual(); const next = PILE.find(q => !st.sorted.has(q)); if (next != null) st.sorted.add(next); }
      });
      $(st.s, '.sc-reset').onclick = () => { st.manual(); st.sorted = new Set(); };
    },
    onManual(st) { st.sorted = new Set(); },
    side(st, t) {
      const sorted = st.tour ? PILE.filter((q, j) => t > 2 + j * .9 + .6) : PILE.filter(q => st.sorted.has(q));
      const k = sorted.length; if (k === st.key) return; st.key = k;
      const last = k ? ALL[sorted[k - 1]] : null;
      say($(st.s, '.sc-out'), !last ? 'Click the pile to deal the next card into its column.' : last[1] ? `<b>${last[0]}</b> (${last[2]}) matters, but it isn’t this course.` : `<b>${last[0]}</b> stays: it shapes the content of the game itself.`);
    },
    draw: drawScope,
  });
})();
