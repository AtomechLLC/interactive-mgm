/* Sawtooth or ramp (genre breakdown: "Casual Game Design").
   Thirty levels, two difficulty curves with the same average: a straight ramp, and a sawtooth that climbs a little
   faster for four levels and then gives a relief level. A thousand simulated players (seeded) improve a little with
   each level; a level harder than their skill adds stress, an easier one drains most of it, and stress drives quitting.
   The drop-off lines show who is still playing. The player model is illustrative, not data. */
(function () {
  const C = TD.C, { clamp } = TD;
  const N = 30, G = .06;
  const ramp = L => 1 + .08 * L;
  const saw = (L, relief) => { const c = (L - 1) % 5; return c === 4 ? ramp(L) - relief : ramp(L) + .2 * (c - 1.5) + relief / 4; };
  function run(curve, mu) {
    const r = GK.rng(3), n = 1000, alive = [1];
    const norm = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return u - 3; };
    const ps = Array.from({ length: n }, () => ({ s: mu + .45 * norm(), stress: 0, on: true }));
    for (let L = 1; L <= N; L++) {
      const d = curve(L); let c = 0;
      ps.forEach(p => {
        if (!p.on) return;
        const f = d - p.s;
        p.stress = f > 0 ? p.stress + f : p.stress * .2;
        const q = Math.min(.5, .006 + .03 * p.stress * p.stress + (f < -1.2 ? .02 : 0));
        if (r() < q) p.on = false; else { p.s += G; c++; }
      });
      alive.push(c / n);
    }
    return alive;
  }
  GK.scene('curve', (s, g, ui) => {
    const sA = s.querySelector('.cc-a'), sR = s.querySelector('.cc-r'), vA = s.querySelector('.cc-av'), vR = s.querySelector('.cc-rv');
    ui.watch(sA, sR);
    const ACTS = [
      { to: 10, a: 1.2, r: .6, say: 'Newcomers: the relief levels drain stress before it turns into quitting, so more of them reach level 30.' },
      { to: 20, a: 1.2, r: 1.2, say: 'Too deep a relief costs steeper peaks to keep the same average, and the peaks drive players off.' },
      { to: 30, a: 2.2, r: .6, say: 'Veterans rarely feel stress here: the sawtooth buys them nothing, and its peaks cost a few.' },
    ];
    const cache = {};
    const get = (a, rl) => { const k = a + ',' + rl; return cache[k] || (cache[k] = { ramp: run(ramp, a), saw: run(L => saw(L, rl), a) }); };
    const X0 = 90, X1 = 1000;
    return {
      dur: 30,
      frame(t, tour) {
        let say = null, k = 1;
        if (tour) { const [a, kk] = GK.act(ACTS, t); sA.value = a.a; sR.value = a.r; say = a.say; k = clamp(kk * 1.6); }
        const mu = +sA.value, rl = +sR.value;
        vA.textContent = mu < 1.5 ? 'newcomers' : mu < 2 ? 'some experience' : 'veterans'; vR.textContent = rl.toFixed(1);
        const R = get(mu, rl), upto = Math.max(1, Math.round(k * N));
        GK.panel(g);
        // difficulty
        const A = GK.axes(g, X0, 40, X1 - X0, 170, { x0: 1, x1: N, y0: 0, y1: 4.5, xt: [1, 5, 10, 15, 20, 25, 30], yt: [0, 1.5, 3, 4.5], fmtY: v => v.toFixed(1) });
        GK.text(g, 'difficulty per level', X0, 30, C.muted, 12, 'left', 700);
        // the audience's average skill
        GK.line(g, Array.from({ length: N }, (_, i) => [A.sx(i + 1), A.sy(mu + G * i)]), 'rgba(93,97,140,.55)', 2, [6, 5]);
        GK.text(g, 'average player, improving', A.sx(N) - 4, A.sy(mu + G * (N - 1)) + 16, C.muted, 11, 'right', 600);
        GK.line(g, Array.from({ length: N }, (_, i) => [A.sx(i + 1), A.sy(ramp(i + 1))]), C.blue, 3);
        const sp = []; for (let L = 1; L <= N; L++) sp.push([A.sx(L), A.sy(saw(L, rl))]);
        GK.line(g, sp, C.gold, 3);
        for (let L = 5; L <= N; L += 5) { g.fillStyle = C.good; g.beginPath(); g.arc(A.sx(L), A.sy(saw(L, rl)), 4, 0, 7); g.fill(); }
        // retention
        const B = GK.axes(g, X0, 260, X1 - X0, 200, { x0: 0, x1: N, y0: 0, y1: 1, xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, .25, .5, .75, 1], fmtY: v => Math.round(v * 100) + '%', xl: 'level' });
        GK.text(g, 'players still playing', X0, 250, C.muted, 12, 'left', 700);
        GK.line(g, R.ramp.slice(0, upto + 1).map((v, i) => [B.sx(i), B.sy(v)]), C.blue, 3);
        GK.line(g, R.saw.slice(0, upto + 1).map((v, i) => [B.sx(i), B.sy(v)]), C.gold, 3);
        // legend + readouts
        GK.line(g, [[X1 - 300, 22], [X1 - 278, 22]], C.blue, 3); GK.text(g, 'ramp', X1 - 272, 26, C.muted, 12, 'left', 600);
        GK.line(g, [[X1 - 220, 22], [X1 - 198, 22]], C.gold, 3); GK.text(g, 'sawtooth (● relief level)', X1 - 192, 26, C.muted, 12, 'left', 600);
        const rr = Math.round(R.ramp[N] * 100), ss = Math.round(R.saw[N] * 100);
        GK.big(g, `${rr}%`, 'reach level 30 on the ramp', X0, 530, C.blue);
        GK.big(g, `${ss}%`, 'reach level 30 on the sawtooth', X0 + 230, 530, C.goldInk);
        GK.big(g, `${ss - rr >= 0 ? '+' : ''}${ss - rr}`, 'points for the sawtooth', X0 + 470, 530, ss > rr ? C.good : C.redDk);
        if (say) TD.label(say, 545, 236, 'center', C.navy, 13);
        ui.stats(`<div><b>${rr}%</b><span>finish on the ramp</span></div><div class="${ss > rr ? 'g' : ''}"><b>${ss}%</b><span>finish on the sawtooth</span></div>`);
        ui.out(ss > rr + 2 ? 'Relief levels let stress drain, so more of this audience keeps playing: challenge without alienating them.'
          : ss < rr - 2 ? 'The sawtooth\'s peaks hurt more than its relief helps for this audience and depth.'
          : 'For this audience the two curves land in about the same place.');
      },
    };
  });
})();
