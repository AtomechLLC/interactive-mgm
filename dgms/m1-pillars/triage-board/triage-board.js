/* Module 1, slides 16, 26-30 and 33: use pillars to triage a backlog.
   Slide 1, triage board: three pillars for a deep-sea survival game (taken from the deck's own examples on 22 and 33)
   and sixteen feature ideas. Mark which pillars each feature supports: features under two or more get a priority star
   and rise, features under none drop into "cut or rethink".
   Slide 2, too many pillars: add slide 33's nine pillars one at a time and the priority star spreads until it means
   nothing. The game, its features and which pillars they support are this page's illustration (table SUP). */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585;
  // slide 33's nine pillars, in the order the slider adds them (the first three are the triage board's)
  const PILLARS = ['Thrill of the Unknown', 'Desperate Survival', 'Living World', 'Earned Triumph', 'Silent Predator', 'Controlled Chaos', 'Fragile Humanity', 'Echoes of the Past', 'Relentless Momentum'];
  const PCOL = ['#2ea3dc', '#e5322d', '#2fae63', '#e0a92d', '#8a4fd6', '#9a5a06', '#d0568f', '#5d618c', '#262c6a'];
  // [feature, pillar indices it supports]
  const SUP = [
    ['Oxygen system', [0, 1, 6]], ['Sonar ping into the dark', [0, 4]], ['Creatures that hunt by sound', [0, 2, 4, 5]], ['Day and night on the reef', [2]],
    ['Crafting from salvage', [1, 3]], ['Logs from the lost crew', [0, 6, 7]], ['Hull breaches under pressure', [1, 5, 6]], ['Daily login reward', []],
    ['Leviathan patrolling the deep', [0, 2, 3, 4]], ['Base building', [1, 3]], ['Storms on the surface', [2, 5]], ['Achievement pop-ups', []],
    ['Fish schools that flee the sub', [2]], ['Speedrun timer', [8]], ['Map with every site marked', []], ['Sub upgrades to dive deeper', [0, 3, 8]],
  ];
  const pick = (f, n) => SUP[f][1].filter(p => p < n);

  /* ---------- slide 1: triage board ---------- */
  const N3 = 3, TPER = .55, TDUR = 1 + SUP.length * TPER + 5;
  function layout(marks) {
    // sort: 2+ pillars first, then 1, then none; stable by backlog order
    const rows = SUP.map((f, i) => [i, marks[i].size]).sort((a, b) => (b[1] >= 2) - (a[1] >= 2) || (b[1] > 0) - (a[1] > 0) || a[0] - b[0]);
    return rows;
  }
  function drawBoard(g, st, t) {
    SCENE.paper(g, W, H);
    const marks = st.tour ? SUP.map((f, i) => new Set(t > 1 + i * TPER ? pick(i, N3) : [])) : st.marks;
    const rows = layout(marks);
    // pillar headers
    const CX0 = 470;
    PILLARS.slice(0, N3).forEach((p, j) => { box(g, CX0 + j * 120, 18, 112, 52, { fill: PCOL[j] }); wrap(g, p, CX0 + j * 120 + 56, 40, 100, { size: 13, font: 'd', w: 800, col: '#fff', align: 'center', lh: 15 }); });
    txt(g, 'Feature backlog', 30, 52, { size: 20 });
    box(g, 840, 18, 176, 52, { fill: C.navy }); txt(g, 'Priority', 928, 50, { size: 16, col: C.gold, align: 'center' });
    // rows, animated into their sorted place
    const pos = st.pos || (st.pos = SUP.map((_, i) => i));
    rows.forEach(([i, n], r) => {
      const target = r; pos[i] = st.tour ? target : lerp(pos[i], target, .25);
      const y = 80 + pos[i] * 31 + (n === 0 ? 8 : 0);
      const prio = n >= 2, cut = n === 0;
      box(g, 24, y, 994, 27, { fill: prio ? '#fde9b8' : cut ? '#f1ebe0' : '#fffaf0', stroke: prio ? '#e0a92d' : '#e3d8bf', lw: 1.5, r: 7 });
      txt(g, SUP[i][0], 40, y + 19, { size: 14, font: 'b', w: 600, col: cut ? '#9b927c' : C.ink });
      for (let j = 0; j < N3; j++) {
        const on = marks[i].has(j), cx = CX0 + j * 120 + 56, cy = y + 13.5;
        g.fillStyle = on ? PCOL[j] : '#fff'; g.strokeStyle = on ? PCOL[j] : '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 9, 0, TAU); g.fill(); g.stroke();
        if (on) { g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx - 4, cy); g.lineTo(cx - 1, cy + 3); g.lineTo(cx + 4, cy - 3); g.stroke(); }
      }
      txt(g, prio ? '★ build first' : cut ? 'cut or rethink' : 'supports one', 928, y + 19, { size: 13.5, align: 'center', col: prio ? C.goldInk : cut ? '#c0392b' : C.muted });
    });
  }
  SCENE('board', {
    dur: TDUR,
    init(st) {
      st.marks = SUP.map(() => new Set());
      st.cv.addEventListener('click', e => {
        const p = SCENE.at(st.cv, e), j = Math.round((p.x - 470 - 56) / 120); if (j < 0 || j >= N3 || Math.abs(p.x - (470 + j * 120 + 56)) > 22) return;
        if (st.tour) st.manual();
        const rows = layout(st.marks); const r = rows.find(([i, n]) => { const y = 80 + st.pos[i] * 31 + (n === 0 ? 8 : 0); return p.y >= y && p.y <= y + 27; });
        if (!r) return; const m = st.marks[r[0]]; m.has(j) ? m.delete(j) : m.add(j);
      });
      $(st.s, '.tb-ref').onclick = () => { st.manual(); st.marks = SUP.map((f, i) => new Set(pick(i, N3))); };
      $(st.s, '.tb-clear').onclick = () => { st.manual(); st.marks = SUP.map(() => new Set()); };
    },
    onManual(st) { st.marks = SUP.map(() => new Set()); },
    side(st, t) {
      const marks = st.tour ? SUP.map((f, i) => new Set(t > 1 + i * TPER ? pick(i, N3) : [])) : st.marks;
      const pr = marks.filter(m => m.size >= 2).length, cut = marks.filter(m => m.size === 0).length, k = pr + ',' + cut + st.tour; if (k === st.k) return; st.k = k;
      say($(st.s, '.tb-stats'), `<div class="y"><b>${pr}</b><span>support two or more pillars: build first</span></div><div class="r"><b>${cut}</b><span>support none: cut or rethink</span></div>`);
    },
    draw: drawBoard,
  });

  /* ---------- slide 2: too many pillars ---------- */
  const share = n => SUP.filter((f, i) => pick(i, n).length >= 2).length / SUP.length;
  const MDUR = 2 + 9 * 1.6 + 4;
  function drawMany(g, st, t) {
    SCENE.paper(g, W, H);
    const nf = st.tour ? clamp(1 + (t - 2) / 1.6, 1, 9) : st.n, n = Math.floor(nf);
    // pillar list
    txt(g, `${n} pillar${n > 1 ? 's' : ''}`, 30, 52, { size: 26, col: n <= 3 ? '#1a8a4c' : n <= 5 ? C.goldInk : '#c0392b' });
    txt(g, n <= 3 ? 'inside slide 16’s range' : n <= 5 ? 'the most slide 16 allows' : 'more than slide 16’s five', 30, 76, { size: 14, font: 'b', w: 600, col: C.muted });
    PILLARS.forEach((p, j) => { const on = j < n; box(g, 30, 92 + j * 40, 250, 32, { fill: on ? PCOL[j] : '#efe8da', r: 8 }); txt(g, p, 44, 113 + j * 40, { size: 14, col: on ? '#fff' : '#b5aa90' }); });
    // the backlog as stars
    SUP.forEach(([f], i) => {
      const x = 310 + (i % 2) * 180, y = 92 + Math.floor(i / 2) * 44, c = pick(i, n).length;
      box(g, x, y, 170, 36, { fill: c >= 2 ? '#fde9b8' : '#fffaf0', stroke: c >= 2 ? '#e0a92d' : '#e3d8bf', lw: 1.5, r: 8 });
      wrap(g, f, x + 10, y + 15, 126, { size: 11.5, lh: 12.5, w: 600 });
      if (c >= 2) txt(g, '★', x + 152, y + 26, { size: 20, col: C.goldInk, align: 'center' });
    });
    // chart: priority share against pillar count
    const X = 700, Y = 100, CW = 310, CH = 300;
    box(g, X - 20, Y - 60, CW + 40, CH + 130, { fill: '#fffaf0', stroke: '#e3d8bf' });
    txt(g, 'Share of features with a ★', X, Y - 30, { size: 16 });
    g.fillStyle = 'rgba(95,180,124,.18)'; g.fillRect(X, Y, CW * 3 / 9, CH);
    txt(g, '1-3', X + CW * 1.5 / 9, Y + 16, { size: 12, col: '#1a8a4c', align: 'center' });
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.strokeRect(X, Y, CW, CH);
    [0, .5, 1].forEach(v => txt(g, Math.round(v * 100) + '%', X - 6, Y + CH - v * CH + 4, { size: 11, align: 'right', col: C.muted }));
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath();
    for (let k = 1; k <= 9; k++) { const x = X + (k - .5) * CW / 9, y = Y + CH - share(k) * CH; k === 1 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.globalAlpha = .25; g.stroke(); g.globalAlpha = 1;
    g.beginPath(); for (let k = 1; k <= n; k++) { const x = X + (k - .5) * CW / 9, y = Y + CH - share(k) * CH; k === 1 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    for (let k = 1; k <= 9; k++) { const x = X + (k - .5) * CW / 9; txt(g, k, x, Y + CH + 18, { size: 12, align: 'center', col: k === n ? C.ink : C.muted }); if (k <= n) { g.fillStyle = k === n ? C.gold : C.navy; g.beginPath(); g.arc(x, Y + CH - share(k) * CH, k === n ? 7 : 4, 0, TAU); g.fill(); } }
    txt(g, 'pillars', X + CW / 2, Y + CH + 38, { size: 12, align: 'center', col: C.muted });
    txt(g, `${Math.round(share(n) * 100)}% starred`, X + CW / 2, Y + CH + 64, { size: 20, align: 'center', col: share(n) > .5 ? '#c0392b' : C.ink });
  }
  SCENE('many', {
    dur: MDUR,
    init(st) {
      st.n = 3; const r = $(st.s, '.tm-n input'), o = $(st.s, '.tm-n b');
      r.oninput = () => { st.manual(); st.n = +r.value; o.textContent = r.value; };
    },
    side(st, t) {
      const n = st.tour ? Math.floor(clamp(1 + (t - 2) / 1.6, 1, 9)) : st.n;
      if (st.tour) { $(st.s, '.tm-n input').value = n; $(st.s, '.tm-n b').textContent = n; }
      if (n === st.k) return; st.k = n;
      say($(st.s, '.tm-out'), n <= 3 ? '“Any feature that supports more than 1 pillar should be prioritized.” With a few pillars, the star picks out a few features.' : n <= 5 ? 'Still workable, but the starred list is growing.' : 'With this many pillars most features support two. When most things are a priority, the word stops picking anything out.');
    },
    draw: drawMany,
  });
})();
