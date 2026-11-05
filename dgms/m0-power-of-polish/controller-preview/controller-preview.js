/* Module 0, slides 69-70: two previews of Module 5.
   Slide 1, "4 Pieces of Puppet Architecture": one press travels Controller → Pawn → Model → Actions. Swap the gamepad
   for an AI brain and the other three pieces don't change, which is the reason for the split. The per-piece captions
   are this page's reading; Module 5 defines the pieces in full.
   Slide 2, Titanfall 2's wall-run assist: the same stick input, three assist thresholds. No assist follows the literal
   stick and peels off; full assist clings and can't leave; the middle reads intent. The stick trace is invented.
   Both scenes are pure functions of time and the controls, so __seek is deterministic. */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585, IMG = '../img/';
  ['gamepad', 'brain', 'meeple', 'cube', 'lightning-arc'].forEach(n => SCENE.img(IMG + n + '-w.svg'));

  /* ---------- slide 1: puppet architecture ---------- */
  const PIECES = [
    ['Controller', '#2ea3dc', { pad: ['gamepad', 'Reads the player: A pressed'], ai: ['brain', 'Decides for itself: jump the gap'] }],
    ['Pawn', '#8a4fd6', 'The body in the world asks: may I jump?'],
    ['Model', '#e0a92d', 'The rules answer: grounded, not stunned: yes'],
    ['Actions', '#e5322d', 'Jump plays: velocity, animation, sound'],
  ];
  const PRESS = 2.6, PDUR = PRESS * 4;
  function drawPuppet(g, st, t) {
    SCENE.paper(g, W, H);
    const ai = st.tour ? t >= PRESS * 2 : st.ai, c = st.tour ? t % PRESS : (st.pressT >= 0 ? t - st.pressT : 99);
    const hop = c / .45, active = c < 2.2 ? Math.min(3, Math.floor(hop)) : -1;
    const bw = 220, gap = 28, x0 = (W - 4 * bw - 3 * gap) / 2, y0 = 70;
    PIECES.forEach(([n, col, d], i) => {
      const x = x0 + i * (bw + gap), on = i === active || (active === 3 && i === 3);
      const [ic, cap] = i === 0 ? d[ai ? 'ai' : 'pad'] : [['', 'meeple', 'cube', 'lightning-arc'][i], d];
      box(g, x, y0, bw, 220, { fill: on ? col + '33' : '#fffaf0', stroke: col, lw: on ? 5 : 3 });
      g.fillStyle = col; g.beginPath(); g.arc(x + bw / 2, y0 + 62, 40, 0, TAU); g.fill();
      SCENE.draw(g, IMG + ic + '-w.svg', x + bw / 2 - 26, y0 + 36, 52);
      txt(g, i === 0 && ai ? 'AI Controller' : n, x + bw / 2, y0 + 130, { size: 19, align: 'center' });
      wrap(g, cap, x + 16, y0 + 160, bw - 32, { size: 15, lh: 19 });
      if (i > 0) { txt(g, 'unchanged', x + bw / 2, y0 + 246, { size: 13, align: 'center', col: ai ? '#1a8a4c' : 'rgba(0,0,0,0)' }); }
      else if (ai) txt(g, 'swapped', x + bw / 2, y0 + 246, { size: 13, align: 'center', col: C.goldInk });
      if (i < 3) { const ax = x + bw + 4; g.fillStyle = C.muted; g.beginPath(); g.moveTo(ax, y0 + 100); g.lineTo(ax + 20, y0 + 110); g.lineTo(ax, y0 + 120); g.fill(); }
    });
    // the signal dot hopping between pieces
    if (hop < 3.6) {
      const k = clamp(hop, 0, 3), i = Math.floor(k), f = k - i, xa = x0 + i * (bw + gap) + bw / 2, xb = x0 + Math.min(3, i + 1) * (bw + gap) + bw / 2;
      const x = lerp(xa, xb, ease(f)), y = y0 + 110 - Math.sin(f * Math.PI) * 60;
      g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); g.stroke();
    }
    // the puppet on the ground: it jumps when Actions fires
    const gy = 500; g.fillStyle = '#d9cba8'; g.fillRect(40, gy, W - 80, 40);
    const jt = c - 3 * .45, jy = jt > 0 && jt < .7 ? Math.sin(jt / .7 * Math.PI) * 110 : 0;
    TD.shadow(W / 2, gy + 4, 30 - jy * .1, 8, .25);
    g.fillStyle = ai ? '#8a4fd6' : C.player; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.roundRect(W / 2 - 24, gy - 70 - jy, 48, 70, 16); g.fill(); g.stroke();
    txt(g, ai ? 'driven by the AI brain' : 'driven by the player', W / 2 + 60, gy - 30, { size: 14, col: C.muted });
  }
  SCENE('puppet', {
    dur: PDUR,
    init(st) {
      st.ai = false; st.pressT = -1; st.clock = 0;
      const bs = $$(st.s, '.pp-ctrl .btn');
      st.setAI = v => { st.ai = v; bs.forEach(b => b.classList.toggle('on', (b.dataset.c === 'ai') === v)); };
      bs.forEach(b => b.onclick = () => { st.manual(); st.setAI(b.dataset.c === 'ai'); });
      $(st.s, '.pp-press').onclick = () => { st.manual(); st.pressT = st.t; };
    },
    side(st, t) {
      const ai = st.tour ? t >= PRESS * 2 : st.ai;
      if (st.tour) $$(st.s, '.pp-ctrl .btn').forEach(b => b.classList.toggle('on', (b.dataset.c === 'ai') === ai));
      if (ai === st.k) return; st.k = ai;
      say($(st.s, '.pp-out'), ai ? 'The brain replaces the gamepad. Pawn, Model and Actions are the same code: the AI jumps by the same rules and with the same animation as the player.' : 'The player presses A. The Controller turns it into an intent, the Pawn asks the Model whether the jump is allowed, and Actions plays it.');
    },
    draw: drawPuppet,
  });

  /* ---------- slide 2: wall-run assist ---------- */
  // the stick's push away from the wall over a run, in 0-1: small drift, then a deliberate push off at 62% of the run
  const stick = u => u < .62 ? .2 + .14 * Math.sin(u * 31) + .08 * Math.sin(u * 13) : .86;
  const RUN = 4.2, WDUR = RUN + 2.5;
  function sim(a, u) {
    // assist threshold: pushes below it are read as "keep running on the wall"
    let d = 0, left = -1, fell = -1; const N = 120, th = lerp(0, 1.05, a);
    for (let i = 1; i <= N * u; i++) {
      const uu = i / N, s = stick(uu), away = s < th ? 0 : s;
      d += away * 3.2;
      if (d > 26 && left < 0) { if (uu < .62) fell = uu; else left = uu; }
    }
    return { d, left, fell };
  }
  function lane(g, y, a, u, name) {
    const x0 = 40, x1 = W - 40, wl = y;
    g.fillStyle = '#3d4270'; g.fillRect(x0, wl - 18, x1 - x0, 18); g.fillStyle = '#5a5f92'; g.fillRect(x0, wl - 18, x1 - x0, 3);
    g.fillStyle = '#efe6d2'; g.fillRect(x0, wl, x1 - x0, 118);
    // trail
    const pts = []; for (let k = 0; k <= 60; k++) { const uu = u * k / 60, r = sim(a, uu); pts.push([lerp(x0 + 160, x1 - 40, uu), wl + 20 + Math.min(r.d, 78)]); }
    TD.trail(pts, a > .9 ? '#e5322d' : a < .1 ? '#e0a92d' : C.player, .8, 4);
    const r = sim(a, u), [px, py] = pts[pts.length - 1];
    TD.player(px, py, 0, .8);
    // stick arrow
    const s = stick(u), sx = x0 + 70, sy = wl + 56;
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, 30, 0, TAU); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(s * 1.2) * 28, sy + Math.sin(s * 1.2) * 28); g.stroke();
    txt(g, 'stick', sx, sy + 46, { size: 11, align: 'center', col: C.muted });
    box(g, x0, wl - 52, 250, 30, { fill: C.navy, r: 8 }); txt(g, `${name}: assist ${Math.round(a * 100)}%`, x0 + 12, wl - 32, { size: 14, col: C.gold });
    const verdict = r.fell >= 0 ? ['Peeled off mid-run', '#c0392b'] : r.left >= 0 ? ['Left the wall on purpose', '#1a8a4c'] : u >= .99 ? ['Trapped on the wall', '#c0392b'] : null;
    if (verdict && u > .7) txt(g, verdict[0], x0 + 266, wl - 31, { size: 15, col: verdict[1] });
  }
  SCENE('wallrun', {
    dur: WDUR,
    init(st) {
      st.a = .5;
      const r = $(st.s, '.wr-a input'), o = $(st.s, '.wr-a b');
      r.oninput = () => { st.manual(); st.a = r.value / 100; o.textContent = r.value + '%'; };
    },
    draw(g, st, t) {
      SCENE.paper(g, W, H);
      const u = clamp((st.tour ? t : t % WDUR) / RUN);
      lane(g, 72, 0, u, 'Literal stick'); lane(g, 262, st.tour ? .5 : st.a, u, st.tour ? 'Reads intent' : 'Your setting'); lane(g, 452, 1, u, 'Too sticky');
    },
    side(st, t) {
      const k = st.tour ? 'tour' : Math.round(st.a * 20); if (k === st.k) return; st.k = k;
      const a = st.tour ? .5 : st.a, r = sim(a, 1);
      say($(st.s, '.wr-out'), r.fell >= 0 ? 'At this setting the small drift in the stick is read literally, and the runner slides off the wall mid-parkour.' : r.left < 0 ? 'At this setting even a hard push away is swallowed: the runner feels trapped against the wall.' : 'Drift is ignored and a deliberate push is honoured. The game biases toward what the player meant, not the literal stick input.');
    },
  });
})();
