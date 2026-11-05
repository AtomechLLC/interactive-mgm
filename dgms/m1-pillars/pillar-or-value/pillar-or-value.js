/* Module 1, slides 40-61: pillars and values.
   Slide 1, pillar or value? Sort statements from the module into Pillar (what the player should feel, "from the HEART")
   or Value (how the team makes the game, "from the MIND"). Round 2 adds statements that break slide 58's rules.
   Slide 2, a value grows up: Master Chef's three values from a word to a statement, an action and a self-explanatory
   check (slides 49-56; this page follows the layout of 54-56).
   Slide 3, Subnautica's values in play: each value as a before and after in a mock HUD (original art).
   Round 2's statements and the HUD scenes are this page's. */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585;

  /* ---------- slide 1: pillar or value? ---------- */
  const CARDS = [
    ['Thrill of the Unknown', 'P', 'slide 22'],
    ['Never tell the player what to do. If there’s something we want them to do, breadcrumb it.', 'V', 'Subnautica, slide 46'],
    ['Dark Modern Fairytale', 'P', 'slide 24'],
    ['Meals should be visually appealing.', 'V', 'Master Chef, slide 50'],
    ['Controlled Power', 'P', 'slide 37'],
    ['The world doesn’t care about the player. The player is a foreigner in an unknowable, majestic alien world.', 'V', 'Subnautica, slide 46'],
    ['Players leave their mark everywhere they go', 'P', 'slide 18'],
    ['We give more recipes than the players need to finish the game so they can choose how they win.', 'V', 'Master Chef, slide 51'],
    ['Father and Son', 'P', 'God of War, slide 32'],
    ['Respect the player and their time. Don’t manipulate them through achievements, dopamine and extrinsic rewards.', 'V', 'Subnautica, slide 46'],
    ['All textures are hand-painted.', 'R', 'round 2', 'Only the art team can act on it: values should be team independent.'],
    ['Players should feel the thrill of the unknown.', 'R', 'round 2', 'It sounds like a pillar, so it is a pillar: don’t overlap values with pillars.'],
    ['Make it fun.', 'R', 'round 2', 'Too abstract to act on: nobody can apply it to a decision.'],
    ['Our lead designer signs off on every quest.', 'R', 'round 2', 'It won’t survive team turnover: values should outlive the people who wrote them.'],
  ];
  const WHY = { P: 'It says what the player should feel: a pillar comes from the heart.', V: 'It tells the team how to make the game: a value comes from the mind and explains how to deliver on the pillars.' };
  const SPER = 1.7, SDUR = 1 + CARDS.length * SPER + 4;
  function answersAt(st, t) { return st.tour ? CARDS.slice(0, clamp(Math.floor((t - 1) / SPER) + 1, 0, CARDS.length)).map((c, i) => ({ i, c: c[1] })) : st.ans; }
  function drawSort(g, st, t) {
    SCENE.paper(g, W, H);
    const ans = answersAt(st, t), cur = ans.length, last = ans[ans.length - 1], round2 = cur >= 10;
    const bins = [['Pillars', 'what should the player feel? (the heart)', 'P', 24, '#e0a92d'], ['Values', 'how is the game made? (the mind)', 'V', 696, '#2ea3dc']];
    bins.forEach(([n, d, k, x, col]) => {
      box(g, x, 20, 320, 545, { fill: col + '1f', stroke: col, lw: 2.5 });
      txt(g, n, x + 18, 52, { size: 22, col }); txt(g, d, x + 18, 74, { size: 13, font: 'b', w: 600, col: C.muted });
      ans.filter(a => a.c === k).forEach((a, j) => {
        const right = CARDS[a.i][1] === a.c;
        box(g, x + 14, 90 + j * 46, 292, 40, { fill: '#fffaf0', stroke: right ? col : '#c0392b', lw: 2, r: 8 });
        const s = CARDS[a.i][0]; txt(g, s.length > 40 ? s.slice(0, 38) + '…' : s, x + 26, 115 + j * 46, { size: 12.5, font: 'b', w: 600 });
      });
    });
    // centre: the current card and the rules tray in round 2
    if (cur < CARDS.length) {
      const [s, , src] = CARDS[cur];
      box(g, 362, 120, 316, 200, { fill: '#fff', stroke: C.ink, lw: 3 });
      wrap(g, '“' + s + '”', 382, 160, 276, { size: s.length > 60 ? 16 : 20, font: 'd', w: 800, lh: s.length > 60 ? 21 : 26 });
      txt(g, src, 520, 306, { size: 12, align: 'center', col: C.muted });
      txt(g, `card ${cur + 1} of ${CARDS.length}`, 520, 104, { size: 13, align: 'center', col: C.muted });
    } else { box(g, 362, 120, 316, 120, { fill: C.navy }); txt(g, 'Sorted!', 520, 172, { size: 26, col: C.gold, align: 'center' }); txt(g, `${ans.filter(a => CARDS[a.i][1] === a.c).length} of ${CARDS.length} in the right place`, 520, 206, { size: 15, col: '#fff', align: 'center' }); }
    if (round2) {
      box(g, 362, 400, 316, 165, { fill: '#f9d9d6', stroke: '#c0392b', lw: 2.5 });
      txt(g, 'Breaks a rule for values', 378, 424, { size: 15, col: '#8a1c15' });
      ans.filter(a => a.c === 'R').forEach((a, j) => { const s = CARDS[a.i][0]; txt(g, '• ' + (s.length > 38 ? s.slice(0, 36) + '…' : s), 378, 448 + j * 28, { size: 12.5, font: 'b', w: 600 }); });
    }
    if (last) {
      const card = CARDS[last.i], right = card[1] === last.c, y = 340;
      const msg = card[1] === 'R' ? card[3] : WHY[card[1]];
      box(g, 362, y, 316, 54, { fill: right ? '#d8f0df' : '#f9d9d6', stroke: right ? '#5fb47c' : '#e07b72', r: 8 });
      wrap(g, (right ? '' : 'Not quite. ') + msg, 372, y + 20, 296, { size: 12, lh: 14, w: 600 });
    }
  }
  SCENE('sort', {
    dur: SDUR,
    init(st) {
      st.ans = [];
      $$(st.s, '.pv-pick .btn').forEach(b => b.onclick = () => { st.manual(); if (st.ans.length < CARDS.length) st.ans.push({ i: st.ans.length, c: b.dataset.c }); });
      $(st.s, '.pv-reset').onclick = () => { st.manual(); st.ans = []; };
    },
    onManual(st) { st.ans = []; },
    side(st, t) {
      const ans = answersAt(st, t), k = ans.length + st.tour; if (k === st.k) return; st.k = k;
      $(st.s, '.pv-r2').style.display = ans.length >= 10 ? '' : 'none';
      const ok = ans.filter(a => CARDS[a.i][1] === a.c).length;
      say($(st.s, '.pv-stats'), `<div class="g"><b>${ok}/${ans.length}</b><span>in the right place</span></div>`);
      say($(st.s, '.pv-out'), ans.length < 10 ? 'Round 1: is it a pillar or a value?' : 'Round 2: these sound like values but break one of slide 58’s rules: 2-4 values, no overlap with pillars, team independent.');
    },
    draw: drawSort,
  });

  /* ---------- slide 2: a value grows up ---------- */
  const MC = [
    ['Aesthetic', 'Meals should be visually appealing.', 'We prioritize visually appealing choices and art assets.', 'You probably intuitively understood this one.'],
    ['Expressive', 'Meals should be an expression of the chef’s style and preferences.', 'We give more recipes than the players need to finish the game so they can choose how they win (e.g. Sushi Master path).', 'This one might need an explanation, and that’s okay.'],
    ['Sophisticated', 'All in-game themes should reinforce that the player is already a master of their discipline.', 'We don’t create stages where the player works making burgers, fries or deep-fried chicken. We put the tutorial in a high-end restaurant.', 'This one likely needed a mood board, but it clearly outlines the limits for artists and designers alike.'],
  ];
  const STEPS = [['1 · Formalize', 'a word, written alongside the pillars'], ['2 · Simple statement', 'one sentence per value'], ['3 · Actionable', 'developers can apply it to a decision'], ['4 · Self-explanatory', 'longer and more pragmatic than a pillar']];
  const VPER = 3.5, VDUR = VPER * 4 + 3;
  function drawGrow(g, st, t) {
    SCENE.paper(g, W, H);
    const step = st.tour ? clamp(Math.floor(t / VPER), 0, 3) : st.step, k = st.tour ? clamp((t % VPER) / .6) : 1;
    txt(g, 'Master Chef', 24, 40, { size: 22 }); txt(g, 'one game, three values', 172, 40, { size: 14, font: 'b', w: 600, col: C.muted });
    const cw = [150, 270, 330, 230], cx = [24]; for (let i = 1; i < 4; i++) cx.push(cx[i - 1] + cw[i - 1] + 8);
    STEPS.forEach(([n, d], i) => { const on = i <= step; box(g, cx[i], 58, cw[i], 52, { fill: on ? C.navy : '#efe8da', r: 8 }); txt(g, n, cx[i] + 10, 80, { size: 14, col: on ? C.gold : '#b5aa90' }); txt(g, d, cx[i] + 10, 100, { size: 11.5, font: 'b', w: 600, col: on ? '#d6dbef' : '#b5aa90' }); });
    MC.forEach((row, r) => {
      const y = 120 + r * 152;
      row.forEach((cell, i) => {
        if (i > step) return; const a = i === step ? k : 1;
        box(g, cx[i], y, cw[i], 144, { fill: i === 0 ? '#fde9b8' : '#fffaf0', stroke: i === step ? C.gold : '#e3d8bf', lw: i === step ? 3 : 1.5, a });
        g.save(); g.globalAlpha = a;
        if (i === 0) txt(g, cell, cx[i] + cw[i] / 2, y + 78, { size: 19, align: 'center', col: C.goldInk });
        else wrap(g, cell, cx[i] + 12, y + 26, cw[i] - 24, { size: i === 3 ? 14 : 14.5, lh: 19, col: i === 3 ? C.muted : C.ink, w: i === 3 ? 600 : 500 });
        g.restore();
      });
    });
  }
  SCENE('grow', {
    dur: VDUR,
    init(st) { st.step = 3; const r = $(st.s, '.vg-step input'), o = $(st.s, '.vg-step b'); r.oninput = () => { st.manual(); st.step = +r.value - 1; o.textContent = r.value; }; },
    side(st, t) {
      const step = st.tour ? clamp(Math.floor(t / VPER), 0, 3) : st.step; if (step === st.k) return; st.k = step;
      if (st.tour) { $(st.s, '.vg-step input').value = step + 1; $(st.s, '.vg-step b').textContent = step + 1; }
      say($(st.s, '.vg-out'), ['Formalize values at the same time you create pillars. They should support their pillar.', 'Write them as statements, one sentence per value.', 'Developers should be able to take action to apply the value to their decisions.', 'They can be longer and more pragmatic compared to pillars, and they don’t all need to be obvious at first read.'][step]);
    },
    draw: drawGrow,
  });

  /* ---------- slide 3: Subnautica's values in play ---------- */
  const SUB = [
    ['Never tell the player what to do. Breadcrumb it.', 'A quest marker points the way', 'A distress signal flickers on the horizon'],
    ['The world doesn’t care about the player.', 'The creature turns to chase you', 'The creature ignores you and keeps grazing'],
    ['Respect the player and their time.', 'ACHIEVEMENT UNLOCKED pops up', 'Nothing interrupts the moment'],
  ];
  const UDUR = 12;
  function sea(g, x, y, w, h) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#5fb8d8'); gr.addColorStop(1, '#0d3a5c'); g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); }
  function diver(g, x, y) { g.fillStyle = '#ffb951'; g.beginPath(); g.ellipse(x, y, 16, 9, 0, 0, TAU); g.fill(); g.fillStyle = '#152044'; g.beginPath(); g.arc(x + 9, y - 2, 4, 0, TAU); g.fill(); }
  function fish(g, x, y, s, ang) { g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s); g.fillStyle = '#c97fd8'; g.beginPath(); g.ellipse(0, 0, 30, 14, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-26, 0); g.lineTo(-44, -14); g.lineTo(-44, 14); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, -3, 4, 0, TAU); g.fill(); g.restore(); }
  function drawSub(g, st, t) {
    SCENE.paper(g, W, H);
    const after = st.tour ? (t % 6) >= 3 : st.after, lt = t % 3;
    SUB.forEach(([v, b, a], i) => {
      const x = 24 + i * 336, y = 24, w = 320;
      box(g, x, y, w, 84, { fill: '#fffaf0', stroke: '#e3d8bf' }); wrap(g, v, x + 14, y + 30, w - 28, { size: 15, font: 'd', w: 800, lh: 19 });
      sea(g, x, y + 96, w, 360);
      const cx = x + w / 2, cy = y + 300;
      diver(g, x + 70, cy);
      if (i === 0) {
        if (!after) { g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 100, cy); g.lineTo(x + 260, y + 160); g.stroke(); box(g, x + 190, y + 128, 116, 30, { fill: C.gold, r: 6 }); txt(g, 'GO HERE ▼ 420m', x + 248, y + 148, { size: 11, align: 'center', col: C.navy }); }
        else { const p = (Math.sin(lt * 5) + 1) / 2; g.fillStyle = `rgba(255,90,80,${.3 + p * .7})`; g.beginPath(); g.arc(x + 250, y + 150, 5 + p * 4, 0, TAU); g.fill(); g.strokeStyle = `rgba(255,90,80,${.5 * (1 - p)})`; g.lineWidth = 2; g.beginPath(); g.arc(x + 250, y + 150, 10 + p * 22, 0, TAU); g.stroke(); }
      }
      if (i === 1) {
        if (!after) { const k = clamp(lt / 3); fish(g, lerp(x + 250, x + 120, k), cy - 40 + k * 30, -1.2, -.2); txt(g, '!', x + 250 - k * 130, cy - 80 + k * 30, { size: 26, col: '#e5322d', align: 'center' }); }
        else { fish(g, x + 220 + Math.sin(lt) * 10, cy - 70, 1.2, Math.sin(lt * 2) * .1); g.fillStyle = '#2fae63'; for (let k = 0; k < 5; k++) g.fillRect(x + 190 + k * 14, y + 440 - 30 - (k % 2) * 12, 6, 30 + (k % 2) * 12); }
      }
      if (i === 2 && !after) { box(g, x + 30, y + 120, w - 60, 54, { fill: 'rgba(20,24,50,.9)', stroke: C.gold }); txt(g, 'ACHIEVEMENT UNLOCKED', cx, y + 143, { size: 13, col: C.gold, align: 'center' }); txt(g, 'Swim 100 metres! +50 XP', cx, y + 163, { size: 12, col: '#fff', align: 'center' }); }
      box(g, x, y + 466, w, 74, { fill: after ? '#d8f0df' : '#f1ebe0', stroke: after ? '#5fb47c' : '#9b927c' });
      txt(g, after ? 'WITH THE VALUE' : 'WITHOUT IT', x + 14, y + 488, { size: 12, col: after ? '#145c33' : '#7a6f58' });
      wrap(g, after ? a : b, x + 14, y + 512, w - 28, { size: 15, w: 600 });
    });
  }
  SCENE('subnautica', {
    dur: UDUR,
    init(st) { st.after = true; $$(st.s, '.sv-ba .btn').forEach(b => b.onclick = () => { st.manual(); st.after = b.dataset.v === 'after'; $$(st.s, '.sv-ba .btn').forEach(x => x.classList.toggle('on', x === b)); }); },
    side(st, t) { if (st.tour) { const after = (t % 6) >= 3; $$(st.s, '.sv-ba .btn').forEach(x => x.classList.toggle('on', (x.dataset.v === 'after') === after)); } },
    draw: drawSub,
  });
})();
