/* Strip the packaging (MGM C4 M7, deck slides 238-240). The fighting game triangle (attacks beat throws, throws beat blocks,
   blocks beat attacks) loses its presentation, then its theme, and what is left is the Counter Circle: Offense beats
   Prediction, Prediction beats Defense, Defense beats Offense. */
(function () {
  const { $$ } = FPF.kit;
  const { text, wrap, card, arrow, timeline, scene, clamp, lerp, ease } = CK;
  const C = TD.C;
  // [game name, game line, icon, colour, framework name, framework line, position]
  const NODES = [
    ['Attack', 'Jabs, kicks, sweeps', 'punch', '#d8463a', 'Offense', 'I act to make progress', [520, 132]],
    ['Throw', 'Walk up and grab', 'grab', '#8a4fd6', 'Prediction', 'I read what you will do', [720, 420]],
    ['Block', 'Hold back to guard', 'checked-shield', '#2f7fd6', 'Defense', 'I stop your progress', [320, 420]],
  ];
  const BEATS = [[0, 1, 'Attacks beat throws', 'Offense beats Prediction'], [1, 2, 'Throws beat blocks', 'Prediction beats Defense'], [2, 0, 'Blocks beat attacks', 'Defense beats Offense']];
  const STEPS = [[0, 'game'], [4, 'pres'], [7.5, 'theme'], [11, 'circle'], [15, 'end']];
  const DUR = 15.5;

  function node(g, i, pres, theme) {
    const [n, line, gi, col, fn, fl, [x, y]] = NODES[i];
    const w = 220, h = 128;
    const fill = `rgba(${pres > .5 ? '236,232,222' : '255,250,240'},1)`;
    card(g, x, y, w, h, { edge: pres < 1 || theme > .5 ? col : '#9a957f', lw: 4, fill: theme > .5 ? '#fffaf0' : fill });
    if (pres < 1) {
      g.save(); g.globalAlpha = 1 - pres;
      g.fillStyle = col; g.beginPath(); g.arc(x - 64, y - 6, 38, 0, Math.PI * 2); g.fill();
      GI.draw(g, gi, x - 64, y - 6, 50, '#fff'); g.restore();
    }
    if (pres > 0 && pres < 1) { g.save(); g.globalAlpha = pres; g.fillStyle = '#b9b09a'; g.beginPath(); g.roundRect(x - 98, y - 40, 68, 68, 6); g.fill(); g.restore(); }
    const tx = lerp(x - 18, x, theme), al = theme > 0 ? 'center' : 'left';
    if (theme < 1) {
      g.save(); g.globalAlpha = 1 - theme;
      text(g, n, x - 18, y - 18, { align: 'left', size: 24, w: 800, display: true, col: pres >= 1 ? '#55513f' : C.ink });
      text(g, line, x - 18, y + 14, { align: 'left', size: 14, col: pres >= 1 ? '#7a755f' : C.muted, a: 1 - pres });
      g.restore();
    }
    if (theme > 0) {
      g.save(); g.globalAlpha = theme;
      text(g, fn, x, y - 16, { size: 28, w: 800, display: true, col: col });
      text(g, fl, x, y + 18, { size: 15, col: C.ink });
      g.restore();
    }
  }
  function links(g, theme, a = 1, spin = 0) {
    BEATS.forEach(([f, to, l1, l2], k) => {
      const A = NODES[f][6], B = NODES[to][6];
      arrow(g, A, B, C.navy, 5, { pad0: 92, pad1: 92, a, bend: -40 });
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, cx = 520, cy = 324, d = Math.hypot(mx - cx, my - cy), ox = (mx - cx) / d, oy = (my - cy) / d;
      const lx = mx + ox * 66, ly = my + oy * 52;
      g.save(); g.globalAlpha = a * (1 - theme); TD.label(l1, lx, ly, 'center', C.ink, 15); g.restore();
      g.save(); g.globalAlpha = a * theme; TD.label(l2, lx, ly, 'center', C.navy, 15); g.restore();
    });
  }

  scene('strip-circle', {
    dur: DUR,
    state: () => ({ step: 2 }),
    init(s, st, api) {
      $$(s, '.sc-step .btn').forEach(b => b.onclick = () => { api.manual(); st.step = +b.dataset.n; });
      st.sync = () => $$(s, '.sc-step .btn').forEach(b => b.classList.toggle('on', +b.dataset.n === st.cur));
    },
    draw(g, t, st, tour) {
      const L = timeline(STEPS, t);
      const pres = tour ? L.in('pres', 1.2) : st.step >= 1 ? 1 : 0, theme = tour ? L.in('theme', 1.2) : st.step >= 2 ? 1 : 0;
      st.cur = tour ? (L.on('theme') ? 2 : L.on('pres') ? 1 : 0) : st.step;
      // the counter circle ring behind, once the theme is gone
      const ring = tour ? L.in('circle', 1) : theme;
      if (ring > 0) { g.save(); g.globalAlpha = ring * .9; g.strokeStyle = 'rgba(85,98,235,.25)'; g.lineWidth = 34; g.beginPath(); g.arc(520, 324, 200, 0, Math.PI * 2); g.stroke(); g.restore(); }
      links(g, theme, tour ? L.in('game', .6) : 1);
      NODES.forEach((_, i) => node(g, i, pres, theme));
      const head = st.cur === 2 ? (ring >= 1 && tour ? 'The Counter Circle Framework' : '2. Strip the theme') : st.cur === 1 ? '1. Strip the presentation' : 'A fighting game’s counters';
      text(g, head, 30, 34, { align: 'left', size: 22, w: 800, display: true, col: C.navy });
      if (tour && L.on('circle')) TD.stamp('Same shape, any genre', 840, 520, C.goldInk, L.in('circle', .4), 24);
      st.sync?.();
    },
    side(t, st) {
      const out = st.cur === 0 ? 'Attacks beat throws, throws beat blocks, blocks beat attacks: rock, paper, scissors built into a fighting game.'
        : st.cur === 1 ? 'Take away the characters and the art. The relationships are still there.'
        : 'Take away the theme too. Offense beats Prediction, Prediction beats Defense, Defense beats Offense: the Counter Circle, a framework that shows up far beyond fighting games.';
      return { out };
    },
  });
})();
