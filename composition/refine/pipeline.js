/* Polish pipeline and skill radar (MGM C4 M7, deck slides 110-138).
   'polish-pipeline': steps 4-8 each add one line to each of the three abilities. Slide 121: "these are not hard numbered
   steps. You can do these steps in any order", so in manual mode each station switches on or off and lines stack in the
   order they were switched on.
   'skill-radar': step 4's notes give each ability the skills it tests (113: timing and aim; 114: decision making and game
   sense; 115: situational awareness and game knowledge). The six axes are those skills; the scores are this page's reading. */
(function () {
  const { icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C, R = window.REFINE;

  // ---------- polish pipeline ----------
  const SX = i => 128 + i * 196, CX = [180, 520, 860], PDUR = 21, AT = i => 1 + i * 3.2;

  function station(g, i, on, hot, t) {
    const [n, tone, gi] = R.STEPS[i], x = SX(i), T0 = TONE[tone];
    card(g, x, 34, 182, 46, { fill: on ? T0.fill : '#f3eee2', edge: hot ? C.navy : on ? T0.edge : '#cdbf9f', lw: hot ? 4 : 2, shadow: false, r: 10 });
    GI.draw(g, gi, x - 66, 34, 24, on ? T0.col : '#b9b09a');
    text(g, n, x + 12, 35, { size: 14.5, w: 800, col: on ? T0.col : '#9a927c' });
  }

  scene('polish-pipeline', {
    dur: PDUR,
    state: () => ({ order: [0, 1, 2, 3, 4], at: {} }),
    init(s, st, api) {
      const set = o => { api.manual(); st.order = o; };
      s.querySelector('.pp-all').onclick = () => { set([0, 1, 2, 3, 4]); st.order.forEach(i => st.at[i] = st.t - 9); };
      s.querySelector('.pp-none').onclick = () => set([]);
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        R.STEPS.forEach((_, i) => { if (inBox(x, y, SX(i), 34, 182, 46)) { if (st.tour) { api.manual(); st.order = []; } if (st.order.includes(i)) st.order = st.order.filter(j => j !== i); else { st.order = [...st.order, i]; st.at[i] = st.t; } } });
      });
    },
    draw(g, t, st, tour) {
      const order = tour ? [0, 1, 2, 3, 4].filter(i => t >= AT(i)) : st.order;
      const since = i => tour ? t - AT(i) : t - (st.at[i] ?? -9);
      // the belt under the stations
      g.strokeStyle = '#b9b09a'; g.lineWidth = 3; g.setLineDash([12, 10]); g.lineDashOffset = -t * 30; g.beginPath(); g.moveTo(30, 66); g.lineTo(1010, 66); g.stroke(); g.setLineDash([]);
      R.STEPS.forEach((_, i) => station(g, i, order.includes(i), order.includes(i) && since(i) < 2.4, t));
      R.AB.forEach((a, c) => {
        const x = CX[c];
        card(g, x, 326, 316, 492, { edge: a.col, lw: 3 });
        icon(g, a.icon, x - 120, 110, 44, { lw: 2 });
        text(g, a.name, x - 88, 110, { align: 'left', size: 19, w: 800, display: true });
        order.forEach((i, j) => {
          const [n, tone] = R.STEPS[i], y = 160 + j * 82, k = clamp((since(i) - c * .15) / .45);
          if (k <= 0) return;
          const s = 1 + .3 * (1 - ease(k));
          g.save(); g.globalAlpha = ease(k); g.translate(x - 138, y); g.scale(s, s);
          chip(g, n, 0, 0, { ...TONE[tone], size: 12, align: 'left' });
          wrap(g, R.STEPS[i][3][c], 0, 24, 276, { size: 13.5, lh: 16, col: C.ink });
          g.restore();
        });
        if (!order.length) text(g, 'The bare ability', x, 300, { size: 15, col: C.muted, it: true });
      });
    },
    side(t, st, tour) {
      const order = tour ? [0, 1, 2, 3, 4].filter(i => t >= AT(i)) : st.order;
      const last = order[order.length - 1];
      return { out: order.length ? `<b>${R.STEPS[last][0]}</b>: ${R.AB.map((a, c) => `${a.name}: ${R.STEPS[last][3][c].charAt(0).toLowerCase() + R.STEPS[last][3][c].slice(1)}`).join('. ')}.` : 'No passes yet: three bare abilities. Click a station to apply it.' };
    },
  });

  // ---------- skill radar ----------
  const AX = ['Timing', 'Dexterity', 'Decision making', 'Game sense', 'Situational awareness', 'Game knowledge'];
  const SC = [[5, 4.5, 1.5, 1.5, 1, 1.5], [1.5, 1, 5, 4.5, 2, 2], [1, 1, 2.5, 2, 5, 4.5]];
  const TESTS = ['timing and aim', 'decision making and game sense', 'situational awareness and game knowledge'];
  const OX = 320, OY = 300, RR = 190, RDUR = 15, ang = i => -Math.PI / 2 + i * Math.PI / 3;
  const pt = (i, v) => [OX + Math.cos(ang(i)) * RR * v / 5, OY + Math.sin(ang(i)) * RR * v / 5];

  scene('skill-radar', {
    dur: RDUR,
    state: () => ({ show: [true, true, true] }),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => { if (type !== 'down') return; [0, 1, 2].forEach(i => { if (inBox(x, y, 820, 120 + i * 132, 360, 112)) { api.manual(); st.show[i] = !st.show[i]; } }); });
    },
    draw(g, t, st, tour) {
      const k = i => tour ? ease(clamp((t - 1 - i * 3) / .9)) : st.show[i] ? 1 : 0;
      // web
      for (let r = 1; r <= 5; r++) { g.strokeStyle = r === 5 ? 'rgba(93,97,140,.55)' : 'rgba(93,97,140,.2)'; g.lineWidth = r === 5 ? 2 : 1; g.beginPath(); AX.forEach((_, i) => { const [x, y] = pt(i, r); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
      AX.forEach((n, i) => {
        const [x, y] = pt(i, 5); g.strokeStyle = 'rgba(93,97,140,.25)'; g.beginPath(); g.moveTo(OX, OY); g.lineTo(x, y); g.stroke();
        const c = Math.cos(ang(i)), side = Math.abs(c) > .3, [lx, ly] = pt(i, side ? 5.3 : 5.75), lit = [0, 1, 2].some(a => k(a) > .5 && SC[a][i] >= 4);
        text(g, n, lx + (side ? Math.sign(c) * 8 : 0), ly, { size: 15, w: 800, col: lit ? C.navy : C.muted, align: side ? (c > 0 ? 'left' : 'right') : 'center' });
      });
      // shapes
      R.AB.forEach((a, s) => {
        const kk = k(s); if (kk <= 0) return;
        g.beginPath(); AX.forEach((_, i) => { const [x, y] = pt(i, SC[s][i] * kk); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
        g.fillStyle = a.col + '38'; g.fill(); g.strokeStyle = a.col; g.lineWidth = 3; g.stroke();
      });
      // the union, once all three are in
      const u = tour ? clamp((t - 10.5) / .6) : st.show.every(Boolean) ? 1 : 0;
      if (u > 0) {
        g.save(); g.globalAlpha = u; g.setLineDash([8, 6]); g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath();
        AX.forEach((_, i) => { const [x, y] = pt(i, Math.max(...SC.map(r => r[i]))); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); g.restore();
      }
      // legend cards
      R.AB.forEach((a, i) => {
        const y = 120 + i * 132, on = k(i) > .5;
        card(g, 820, y, 360, 112, { edge: on ? a.col : '#cdbf9f', lw: on ? 4 : 2, fill: on ? '#fffaf0' : 'rgba(255,250,240,.5)' });
        icon(g, a.icon, 682, y, 52, { lw: 2, grey: !on });
        text(g, a.name, 722, y - 18, { align: 'left', size: 18, w: 800, display: true, col: on ? C.ink : C.muted });
        wrap(g, `Tests ${TESTS[i]}`, 722, y + 8, 250, { size: 13.5, lh: 16, col: on ? C.ink : C.muted });
      });
      if (u > 0) text(g, 'Together, the three test all six skills.', 820, 532, { size: 17, w: 800, col: C.navy, a: u });
    },
    side(t, st, tour) {
      const on = tour ? [0, 1, 2].filter(i => t >= 1 + i * 3) : [0, 1, 2].filter(i => st.show[i]);
      if (!on.length) return { out: 'Click an ability to show its shape.' };
      const i = on[on.length - 1];
      return { out: on.length === 3 ? 'Each ability leans on different skills, so the kit as a whole asks for all six.' : `<b>${R.AB[i].name}</b> tests ${TESTS[i]}.` };
    },
  });
})();
