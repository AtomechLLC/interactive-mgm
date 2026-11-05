/* Module 1, slides 24-25, 34-37.
   Slide 1, pull a pillar: features rest on the pillars they support. Pull one and the features that rested only on it
   fall; features on two tilt but stay. A decorative pillar ("Fun!") holds nothing up, so pulling it changes nothing.
   The month slider is slides 34-35: pull a pillar early and placeholders fall; pull it late and finished work falls.
   Slide 2, restraint vs pillar: the same twelve move ideas through "The game must have combos" and "Controlled Power".
   Features, supports, build months and the move verdicts are this page's illustration. */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585;
  const PIL = [['Thrill of the Unknown', 200, '#2ea3dc'], ['Desperate Survival', 470, '#e5322d'], ['Living World', 740, '#2fae63'], ['Fun!', 930, '#b5aa90']];
  // [feature, supports, build month]
  const FEAT = [
    ['Sonar ping', [0], 4], ['Lost crew logs', [0], 15], ['Sub upgrades', [0], 9],
    ['Crafting', [1], 3], ['Hull breaches', [1], 11], ['Base building', [1], 17],
    ['Day and night', [2], 6], ['Fish schools', [2], 13], ['Reef ecology', [2], 20],
    ['Oxygen system', [0, 1], 2], ['Leviathan', [0, 1], 16], ['Creatures hunt by sound', [1, 2], 8], ['Storms', [1, 2], 19],
  ];
  const BEAM = 350, GROUND = 545;
  // single-pillar features stack on their pillar; two-pillar features lie across both stacks, higher up
  const slot = f => {
    const s = FEAT[f][1];
    if (s.length === 1) { const k = FEAT.filter((x, i) => i < f && x[1].length === 1 && x[1][0] === s[0]).length; return [PIL[s[0]][1], BEAM - 22 - k * 40, 124]; }
    const k = FEAT.filter((x, i) => i < f && x[1].length === 2).length, a = PIL[s[0]][1], b = PIL[s[1]][1];
    return [(a + b) / 2, BEAM - 22 - (3 + k) * 40, b - a + 124];
  };
  function drawTemple(g, st, t) {
    SCENE.paper(g, W, H);
    let pulled = -1, since = 0, month = st.month;
    if (st.tour) {
      if (t < 4) { pulled = -1; month = 12; }
      else if (t < 8) { pulled = 3; since = t - 4; month = 12; }
      else if (t < 14) { pulled = 1; since = t - 9; month = 3; }
      else { pulled = 1; since = t - 15; month = 18; }
    } else { pulled = st.pulled; since = st.t - st.pullT; }
    if (since < 0) pulled = -1;
    // ground and steps
    g.fillStyle = '#d9cba8'; g.fillRect(20, GROUND, W - 40, 40); g.fillStyle = '#c6b78f'; g.fillRect(60, GROUND - 14, W - 120, 14);
    // pillars
    PIL.forEach(([n, x, col], i) => {
      const out = i === pulled ? ease(clamp(since / .5)) : 0;
      g.save(); g.globalAlpha = 1 - out * .85; g.translate(out * 0, out * 40);
      g.fillStyle = col; g.fillRect(x - 34, BEAM + 12, 68, GROUND - 14 - BEAM - 12);
      g.fillStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < 3; k++) g.fillRect(x - 26 + k * 20, BEAM + 18, 8, GROUND - 26 - BEAM - 18);
      g.fillStyle = C.navy; g.fillRect(x - 42, BEAM, 84, 14); g.fillRect(x - 42, GROUND - 26, 84, 12);
      g.restore();
      g.save(); g.translate(x, (BEAM + GROUND) / 2); g.rotate(-Math.PI / 2); txt(g, n, 0, 6, { size: 14, col: '#fff', align: 'center', a: 1 - out }); g.restore();
    });
    // features
    let lostDone = 0, lostPh = 0, tilted = 0;
    FEAT.forEach(([n, sup, m], f) => {
      const [x, y, w] = slot(f), done = month >= m, left = sup.filter(p => p !== pulled), falls = pulled >= 0 && !left.length, tilts = pulled >= 0 && left.length && left.length < sup.length;
      let dx = 0, dy = 0, rot = 0, a = 1;
      if (falls) { const k = Math.max(0, since - .35); dy = Math.min(GROUND - 20 - y, 900 * k * k); rot = Math.min(1, k * 2) * (f % 2 ? .5 : -.4); done ? lostDone++ : lostPh++; }
      if (tilts) { const k = ease(clamp((since - .3) / .4)); rot = (PIL[left[0]][1] < x ? -1 : 1) * .035 * k; dy = 5 * k; tilted++; }
      g.save(); g.translate(x + dx, y + dy); g.rotate(rot);
      if (done) box(g, -w / 2, -16, w, 34, { fill: '#fffaf0', stroke: C.navy, lw: 2.5, r: 6 });
      else { g.setLineDash([5, 4]); box(g, -w / 2, -16, w, 34, { fill: 'rgba(255,250,240,.5)', stroke: C.muted, lw: 2, r: 6 }); g.setLineDash([]); }
      sup.forEach(p => { g.fillStyle = PIL[p][2]; g.fillRect(PIL[p][1] - x - 30, 13, 60, 5); });
      wrap(g, n, 0, 5, w - 12, { size: 12.5, w: 700, align: 'center', col: done ? C.ink : C.muted, lh: 13 });
      if (falls && dy >= GROUND - 20 - y - 1) { g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-10, -16); g.lineTo(4, 0); g.lineTo(-6, 18); g.stroke(); }
      g.restore();
    });
    // roof
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(120, 52); g.lineTo(470, 8); g.lineTo(820, 52); g.closePath(); g.fill();
    txt(g, 'Your game', 470, 44, { size: 18, col: C.gold, align: 'center' });
    g.fillStyle = C.navy; g.fillRect(120, BEAM, 700, 6);
    // stats
    box(g, 870, 22, 150, 120, { fill: '#fffaf0', stroke: '#e3d8bf' });
    txt(g, 'Month ' + month, 945, 52, { size: 18, align: 'center' });
    txt(g, `${lostDone} finished`, 945, 84, { size: 15, align: 'center', col: lostDone ? '#c0392b' : C.muted });
    txt(g, `${lostPh} placeholders`, 945, 106, { size: 15, align: 'center', col: lostPh ? C.goldInk : C.muted });
    txt(g, 'fell', 945, 128, { size: 13, align: 'center', col: C.muted });
    st.stat = { pulled, lostDone, lostPh, tilted, month };
  }
  SCENE('temple', {
    dur: 21,
    init(st) {
      st.pulled = -1; st.pullT = 0; st.month = 12;
      const bs = $$(st.s, '.pp-pill .btn'), r = $(st.s, '.pp-month input'), o = $(st.s, '.pp-month b');
      bs.forEach(b => b.onclick = () => { st.manual(); const i = +b.dataset.i; st.pulled = st.pulled === i ? -1 : i; st.pullT = st.t; bs.forEach(x => x.classList.toggle('on', +x.dataset.i === st.pulled)); });
      r.oninput = () => { st.manual(); st.month = +r.value; o.textContent = r.value; };
      $(st.s, '.pp-reset').onclick = () => { st.manual(); st.pulled = -1; bs.forEach(x => x.classList.remove('on')); };
    },
    onManual(st) { st.pulled = -1; },
    side(st) {
      const s = st.stat; if (!s) return; const k = JSON.stringify(s); if (k === st.k) return; st.k = k;
      if (st.tour) { $(st.s, '.pp-month input').value = s.month; $(st.s, '.pp-month b').textContent = s.month; }
      say($(st.s, '.pp-out'), s.pulled < 0 ? 'Every feature rests on the pillars it supports. Pull one to see what was resting on it.'
        : s.pulled === 3 ? '“Fun!” holds nothing up: pull it and nothing changes. A pillar that removing changes nothing isn’t load bearing.'
        : `Pulling <b>${PIL[s.pulled][0]}</b> drops every feature that rested only on it; the ${s.tilted} that also rest on another pillar tilt but stay. ${s.month <= 6 ? 'This early, what falls is mostly placeholders.' : s.month >= 15 ? 'This late, what falls is finished work: changing pillars late, without understanding the effect.' : ''}`);
    },
    draw: drawTemple,
  });

  /* ---------- slide 2: restraint vs pillar ---------- */
  // [move, passes "must have combos", passes "Controlled Power", why under the pillar]
  const MOVES = [
    ['Three-hit combo string', 1, 1, 'timed presses: power you control'],
    ['Launcher into an air combo', 1, 1, 'a skilled follow-up'],
    ['Charge attack (hold to power up)', 0, 1, 'power you build and choose to release'],
    ['Parry with a tight window', 0, 1, 'control under pressure'],
    ['Super meter held back for the right moment', 0, 1, 'power saved, then spent'],
    ['Cancel a combo into a dodge', 1, 1, 'you stay in control mid-string'],
    ['Heavy finisher that ends a string', 1, 1, 'a deliberate payoff'],
    ['Auto-combo on one button', 1, 0, 'power without control'],
    ['Button-mash flurry', 1, 0, 'mashing is not control'],
    ['Rapid jab spam with no recovery', 1, 0, 'no cost, no control'],
    ['Juggle combo off a wall bounce', 1, 1, 'precise and earned'],
    ['Screen-clearing nuke on a cooldown', 0, 0, 'power with no decision attached'],
  ];
  const RPER = .9, RDUR = 1 + MOVES.length * RPER + 4.5;
  function drawRestraint(g, st, t) {
    SCENE.paper(g, W, H);
    const n = st.tour ? clamp(Math.floor((t - 1) / RPER) + 1, 0, MOVES.length) : MOVES.length;
    box(g, 24, 16, 300, 62, { fill: '#f1ebe0', stroke: '#9b927c', lw: 2.5 }); txt(g, 'RESTRAINT', 40, 38, { size: 12, col: '#7a6f58' }); txt(g, '“The game must have combos”', 40, 64, { size: 16 });
    box(g, 716, 16, 300, 62, { fill: '#fde9b8', stroke: '#e0a92d', lw: 2.5 }); txt(g, 'PILLAR', 732, 38, { size: 12, col: C.goldInk }); txt(g, '“Controlled Power”', 732, 64, { size: 16 });
    MOVES.forEach(([m, r, p, why], i) => {
      const y = 90 + i * 38, on = i < n, a = on ? 1 : .25;
      box(g, 334, y, 372, 32, { fill: '#fffaf0', stroke: '#cdbf9f', lw: 1.5, r: 8, a });
      txt(g, m, 520, y + 21, { size: 14, align: 'center', a, w: 700 });
      if (!on) return;
      const mark = (x, ok) => { g.fillStyle = ok ? '#1a8a4c' : '#c0392b'; g.beginPath(); g.arc(x, y + 16, 12, 0, TAU); g.fill(); txt(g, ok ? '✓' : '✗', x, y + 22, { size: 15, col: '#fff', align: 'center' }); };
      mark(300, r); txt(g, r ? 'it’s a combo' : 'not a combo', 280, y + 21, { size: 12.5, align: 'right', font: 'b', w: 600, col: C.muted });
      mark(740, p); txt(g, why, 760, y + 21, { size: 12.5, font: 'b', w: 600, col: C.muted });
    });
    const end = st.tour ? clamp((t - 1 - MOVES.length * RPER) / .8) : 1;
    if (end > 0) { box(g, 300, 548 - 4, 440, 36, { fill: C.navy, a: end }); txt(g, 'Road markings, not traffic signs.', 520, 568, { size: 17, col: C.gold, align: 'center', a: end }); }
  }
  SCENE('restraint', {
    dur: RDUR,
    side(st, t) {
      const n = st.tour ? clamp(Math.floor((t - 1) / RPER) + 1, 0, MOVES.length) : MOVES.length; if (n === st.k) return; st.k = n;
      const r = MOVES.slice(0, n).filter(m => m[1]).length, p = MOVES.slice(0, n).filter(m => m[2]).length;
      say($(st.s, '.rs-stats'), `<div><b>${r}</b><span>pass the restraint</span></div><div class="y"><b>${p}</b><span>pass the pillar</span></div>`);
    },
    draw: drawRestraint,
  });
})();
