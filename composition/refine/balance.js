/* Balance (MGM C4 M7, deck slides 127-132).
   'solution-scale': slide 132, "purposeful content solves problems, but also introduces vulnerabilities". Each ability is a
   scale: what it solves on one pan, what it opens up on the other. The player feedback of slides 129-131 tips each scale; the
   deck's fix adds or removes weight until it levels. The weights are an illustration.
   'rain-exploit': slide 131. In a team fight, a healer can hang outside and recast Restoring Rain with low risk. The fix
   divides the healing across the teammates it touches and lengthens the cooldown. The dots are where healers stand across
   many imagined matches; the numbers are an illustration, not data. */
(function () {
  const { $$ } = FPF.kit;
  const { icon, text, wrap, card, chip, TONE, panel, scene, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C, R = window.REFINE;
  const TAU = Math.PI * 2;

  // ---------- solution + vulnerability ----------
  // blocks: [label, weight, 'before' | 'after' | 'gone' (present before, removed by the fix)]
  const SCALES = [
    { quote: '“I keep missing it.”', fix: 'Recast quickly, but each repeat costs more',
      sol: [['Drains the mage', 1, 'before'], ['Heals you', 1, 'before'], ['Quick recast', 2, 'after']],
      vul: [['Miss: get nothing', 1, 'before'], ['Tight skill shot', 2, 'before'], ['Rising cost', 1, 'after']] },
    { quote: '“It locks me down too long.”', fix: 'Move sooner after casting; much shorter duration',
      sol: [['Puts out fire', 1, 'before'], ['Hides you', 1, 'before'], ['Move sooner', 1, 'after']],
      vul: [['Hides enemies too', 1, 'before'], ['Long lockdown', 2, 'gone'], ['Short duration', 1, 'after'], ['Brief lockdown', 1, 'after']] },
    { quote: '“Healers camp outside the fight.”', fix: 'Healing split across targets; longer cooldown',
      sol: [['Puts out fire', 1, 'before'], ['Heals the team', 1, 'before'], ['Endless safe healing', 2, 'gone']],
      vul: [['Heals enemies too', 1, 'before'], ['Heal split', .5, 'after'], ['Longer cooldown', .5, 'after']] },
  ];
  const SX = [180, 520, 860], PIV = 150, ARM = 92, STRING = 172, BH = w => 20 + w * 18;
  const has = (b, k) => b[2] === 'before' ? 1 : b[2] === 'after' ? k : 1 - k;
  const sum = (bs, k) => bs.reduce((s, b) => s + b[1] * has(b, k), 0);

  function pan(g, x, y, blocks, k, col, label) {
    g.strokeStyle = '#7a6f55'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - STRING); g.lineTo(x - 50, y); g.moveTo(x, y - STRING); g.lineTo(x + 50, y); g.stroke();
    g.fillStyle = '#c9b88f'; g.strokeStyle = '#7a6f55'; g.beginPath(); g.ellipse(x, y + 4, 56, 12, 0, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    let top = y;
    blocks.forEach(b => {
      const a = has(b, k); if (a <= 0.01) return;
      const h = BH(b[1]) * (b[2] === 'gone' ? 1 : a), drop = b[2] === 'after' ? (1 - a) * 80 : 0;
      g.save(); g.globalAlpha = b[2] === 'gone' ? a : Math.min(1, a * 1.5);
      card(g, x, top - h / 2 - drop, 100, h - 3, { fill: col.fill, edge: col.edge, lw: 2, r: 6, shadow: false });
      if (h > 20) wrap(g, b[0], x, top - h / 2 - drop - (b[0].length > 14 ? 7 : 0), 92, { size: 11, w: 700, lh: 13, align: 'center', col: col.col });
      g.restore(); top -= h;
    });
    text(g, label, x, y + 30, { size: 13, w: 800, col: col.col });
  }

  function oneScale(g, i, k) {
    const s = SCALES[i], ab = R.AB[i], x = SX[i];
    card(g, x, 272, 324, 520, { edge: ab.col, lw: 3 });
    icon(g, ab.icon, x - 110, 50, 34, { lw: 2 });
    text(g, ab.name, x - 86, 50, { align: 'left', size: 17, w: 800, display: true });
    const L = sum(s.sol, k), Rr = sum(s.vul, k), th = clamp((Rr - L) * .09, -.24, .24);
    // post and beam
    g.fillStyle = '#7a6f55'; g.fillRect(x - 4, PIV, 8, 250); g.fillRect(x - 40, PIV + 246, 80, 8);
    const lx = x - Math.cos(th) * ARM, ly = PIV - Math.sin(th) * ARM, rx = x + Math.cos(th) * ARM, ry = PIV + Math.sin(th) * ARM;
    pan(g, lx, ly + STRING, s.sol, k, TONE.green, 'Solves');
    pan(g, rx, ry + STRING, s.vul, k, TONE.red, 'Opens up');
    g.strokeStyle = C.navy; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(lx, ly); g.lineTo(rx, ry); g.stroke();
    g.fillStyle = C.gold; g.beginPath(); g.arc(x, PIV, 8, 0, TAU); g.fill();
    const level = Math.abs(th) < .02;
    text(g, level ? 'Level' : th > 0 ? 'Tips toward the cost' : 'Tips toward the payoff', x, 92, { size: 13, w: 800, col: level ? C.good : C.goldInk });
    // the feedback, then the fix
    text(g, s.quote, x, 452, { size: 14, it: true, col: C.ink, a: 1 - k * .5 });
    g.save(); g.globalAlpha = k; chip(g, 'Fix', x - 138, 490, { ...TONE.gold, size: 12, align: 'left' }); wrap(g, s.fix, x - 100, 482, 230, { size: 12.5, lh: 15, w: 700 }); g.restore();
  }

  scene('solution-scale', {
    dur: 15,
    state: () => ({ after: false, at: -9 }),
    init(s, st, api) {
      const b = s.querySelector('.ss-pass');
      b.onclick = () => { api.manual(); st.after = !st.after; st.at = st.t; b.classList.toggle('on', st.after); };
    },
    draw(g, t, st, tour) {
      const k = i => tour ? ease(clamp((t - 3 - i * 2.5) / 1)) : st.after ? ease(clamp((t - st.at - i * .3) / 1)) : 1 - ease(clamp((t - st.at - i * .3) / 1));
      SX.forEach((_, i) => oneScale(g, i, k(i)));
      const all = tour ? clamp((t - 11) / .5) : st.after && t - st.at > 1.8 ? 1 : 0;
      text(g, 'Purposeful = Solution + Vulnerability', 520, 560, { size: 19, w: 800, display: true, col: C.navy, a: .35 + .65 * all });
    },
    side(t, st, tour) {
      const n = tour ? [0, 1, 2].filter(i => t > 4 + i * 2.5).length : st.after ? 3 : 0;
      return { out: n === 0 ? 'Player feedback tips each scale: too much cost on two, too much payoff on Restoring Rain.' : n < 3 ? `${R.AB[n - 1].name}: ${SCALES[n - 1].fix.toLowerCase()}.` : 'Each fix keeps what the ability solves and gives it a cost that fits. Purposeful = Solution + Vulnerability.' };
    },
  });

  // ---------- Restoring Rain exploit ----------
  const ALLY = [[300, 212], [340, 360], [262, 420], [330, 130]], FOE = [[430, 230], [460, 320], [420, 400], [470, 170]];
  const DANGER = [445, 290, 175], SPOT = [[78, 300], [292, 296]];
  const DOTS = Array.from({ length: 42 }, (_, i) => [Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12345.678 % 1]);
  const MODE = [
    { name: 'Before', rule: 'Full heal to every ally in the rain, 4 s cooldown', heal: 100, cd: 4, risk: .12, out: 'Safest spot wins: stand outside the fight and recast forever.' },
    { name: 'After', rule: 'Healing split across the allies it touches, 10 s cooldown', heal: 25, cd: 10, risk: .7, out: 'Rain alone no longer carries a match, so healers step in, where the payoff and the risk both are.' },
  ];

  scene('rain-exploit', {
    dur: 16,
    state: () => ({ mode: 0, at: -9 }),
    init(s, st, api) {
      const bs = $$(s, '.re-mode');
      const sync = () => bs.forEach(b => b.classList.toggle('on', +b.dataset.m === st.mode));
      bs.forEach(b => b.onclick = () => { api.manual(); if (st.mode !== +b.dataset.m) { st.mode = +b.dataset.m; st.at = st.t; } sync(); });
      sync();
    },
    draw(g, t, st, tour) {
      const m = tour ? (t < 8 ? 0 : 1) : st.mode, since = tour ? (t < 8 ? t + 9 : t - 8) : t - st.at, M = MODE[m];
      T.use(g); T.floor(14, 14, 646, 558);
      // the danger zone of the enemy team
      g.fillStyle = 'rgba(229,50,45,.1)'; g.strokeStyle = 'rgba(229,50,45,.55)'; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.arc(DANGER[0], DANGER[1], DANGER[2], 0, TAU); g.fill(); g.stroke(); g.setLineDash([]);
      text(g, 'Enemy reach', DANGER[0] + 60, DANGER[1] - DANGER[2] - 14, { size: 13, w: 800, col: C.redDk, stroke: 3 });
      // where healers stood across many matches: each dot drifts from the old spot to the new one
      const from = SPOT[1 - m], to = SPOT[m];
      const pos = DOTS.map(([a, b], i) => { const k = ease(clamp((since - i * .025) / 1.2)); return [lerp(from[0], to[0], k) + a * 40, lerp(from[1], to[1], k) + b * 100]; });
      const hx = pos.reduce((s, p) => s + p[0], 0) / pos.length, hy = pos.reduce((s, p) => s + p[1], 0) / pos.length;
      // the rain around the healer, recast on its cooldown
      const cyc = (t % M.cd) / M.cd, rk = cyc < .55 ? 1 : 0;
      g.fillStyle = `rgba(63,143,214,${.16 * rk})`; g.strokeStyle = `rgba(63,143,214,${.6 * rk})`; g.lineWidth = 2; g.save(); g.beginPath(); g.rect(14, 14, 646, 558); g.clip(); g.beginPath(); g.arc(hx, hy, 270, 0, TAU); g.fill(); g.stroke(); g.restore();
      if (rk) for (let i = 0; i < 40; i++) { const an = i * 2.4, r = (i * 37) % 260, x = hx + Math.cos(an) * r, y = hy + Math.sin(an) * r + ((t * 300 + i * 13) % 30) - 15; if (x > 20 && x < 655) { g.fillStyle = 'rgba(63,143,214,.75)'; g.beginPath(); g.ellipse(x, y, 2.5, 6, 0, 0, TAU); g.fill(); } }
      pos.forEach(([sx, sy]) => { const gr = g.createRadialGradient(sx, sy, 0, sx, sy, 24); gr.addColorStop(0, 'rgba(255,140,30,.45)'); gr.addColorStop(1, 'rgba(255,140,30,0)'); g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, 24, 0, TAU); g.fill(); });
      ALLY.forEach(([x, y]) => T.player(x, y, 0, .85, 1, C.p2));
      FOE.forEach(([x, y]) => T.foe(x, y, 17));
      T.player(hx, hy, 0, 1, 1, '#3f8fd6');
      icon(g, 'wow-spell_nature_giftofthewaterspirit.jpg', hx, hy - 42, 26, { lw: 2 });
      text(g, 'Healer', hx, hy + 32, { size: 12, w: 800, col: C.navy, stroke: 3 });
      text(g, 'Glow: where healers stood, across many matches', 337, 556, { size: 12.5, col: C.muted, stroke: 3 });
      // the readout
      panel(g, 672, 14, 354, 558, { title: 'Restoring Rain' });
      card(g, 849, 96, 322, 92, { edge: C.navy, lw: 3, shadow: false });
      text(g, M.name, 849, 72, { size: 18, w: 800, display: true });
      wrap(g, M.rule, 849, 98, 290, { size: 13, lh: 16, align: 'center', col: C.muted });
      const bars = [['Healing per ally, per cast', M.heal / 100, `${M.heal}%`, '#2fae63'], ['Casts per minute', 6 / M.cd / 1.5, `${Math.round(60 / M.cd)}`, '#3f8fd6'], ['Risk to the healer', M.risk, M.risk < .3 ? 'Low' : 'High', '#e5322d']];
      bars.forEach(([n, v, s, col], i) => {
        const y = 196 + i * 72;
        text(g, n, 694, y, { align: 'left', size: 14, w: 700 });
        g.fillStyle = 'rgba(21,32,68,.12)'; g.beginPath(); g.roundRect(694, y + 16, 270, 18, 6); g.fill();
        g.fillStyle = col; g.beginPath(); g.roundRect(694, y + 16, 270 * clamp(v * ease(clamp(since / .8))), 18, 6); g.fill();
        text(g, s, 1006, y + 25, { align: 'right', size: 14, w: 800, col });
      });
      wrap(g, M.out, 694, 430, 310, { size: 15, w: 700, lh: 20, col: C.navy });
    },
    side(t, st, tour) { const m = tour ? (t < 8 ? 0 : 1) : st.mode; return { out: `<b>${MODE[m].name}.</b> ${MODE[m].out}` }; },
  });
})();
