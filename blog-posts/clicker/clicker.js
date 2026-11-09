/* The next upgrade is always a few minutes away (genre breakdown: "How to Make a Clicker Game?").
   Five producers with Cookie Clicker's base costs and rates; each copy of a producer costs (growth) times the last.
   A greedy player clicks a few times a second and always saves for the producer that pays itself back fastest.
   The top chart (log scale) shows income per second and the price of the next purchase; the bottom chart shows the
   wait before each purchase. Geometric costs against compounding income keep the wait roughly steady. */
(function () {
  const C = TD.C, { clamp } = TD;
  const P = [['Cursor', 15, .1, '#8a8fb5'], ['Grandma', 100, 1, '#c9739b'], ['Farm', 1100, 8, '#4f9a4a'], ['Mine', 12000, 47, '#8a7f66'], ['Factory', 130000, 260, '#5562eb']];
  const END = 7200;
  function sim(growth, cps) {
    const n = P.map(() => 0); let bank = 0, inc = 0, last = 0;
    const buys = [], series = [];
    const cost = i => P[i][1] * growth ** n[i];
    const pick = () => { let b = 0, bv = Infinity; P.forEach((p, i) => { const v = cost(i) / p[2] + cost(i) / Math.max(inc + cps, .1); if (v < bv) { bv = v; b = i; } }); return b; };
    let target = pick();
    for (let t = 0; t <= END; t++) {
      if (t % 10 === 0) series.push({ t, inc: inc + cps, next: cost(target) });
      bank += inc + cps;
      while (bank >= cost(target)) {
        bank -= cost(target); n[target]++; inc += P[target][2];
        buys.push({ t, i: target, wait: t - last }); last = t; target = pick();
      }
    }
    return { buys, series, n, inc };
  }
  const fmt = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + 'k' : v >= 10 ? Math.round(v) + '' : v.toFixed(1);
  const fmtT = s => s >= 60 ? `${(s / 60).toFixed(s >= 600 ? 0 : 1)} min` : `${Math.round(s)} s`;

  GK.scene('clicker', (s, g, ui) => {
    const sG = s.querySelector('.ck-g'), sC = s.querySelector('.ck-c'), vG = s.querySelector('.ck-gv'), vC = s.querySelector('.ck-cv');
    ui.watch(sG, sC);
    const ACTS = [
      { to: 11, g: 1.15, c: 3, say: 'Cookie Clicker\'s 1.15: in the second hour a purchase lands about once a minute, and the longest wait is about six.' },
      { to: 22, g: 1.3, c: 3, say: 'At 1.30 costs outrun income: purchases thin to one every two minutes, and the longest wait passes ten.' },
      { to: 33, g: 1.05, c: 3, say: 'At 1.05 a purchase lands every twenty seconds: little to anticipate, and the counts climb into the hundreds.' },
    ];
    const cache = {};
    const run = (gr, c) => { const k = gr + ',' + c; return cache[k] || (cache[k] = sim(gr, c)); };
    const X0 = 90, X1 = 1000;
    return {
      dur: 33,
      frame(t, tour) {
        let cur, say = null;
        if (tour) { const [a, k] = GK.act(ACTS, t); sG.value = a.g; sC.value = a.c; say = a.say; cur = clamp(k * 1.2) * END; }
        else cur = (t % 15) / 15 * END;
        const gr = +sG.value, cps = +sC.value; vG.textContent = '×' + gr.toFixed(2); vC.textContent = cps + ' a second';
        const S = run(gr, cps), shown = S.buys.filter(b => b.t <= cur), late = S.buys.filter(b => b.t > END / 2).map(b => b.wait), avg = END / 2 / Math.max(1, late.length), longest = Math.max(0, ...late);
        GK.panel(g);
        // top: log chart of income and next price
        const lg = v => Math.log10(Math.max(v, .1));
        const A = GK.axes(g, X0, 40, X1 - X0, 230, { x0: 0, x1: END, y0: -1, y1: 7, xt: [0, 1200, 2400, 3600, 4800, 6000, 7200], yt: [-1, 1, 3, 5, 7], fmtX: v => v / 60 + ' min', fmtY: v => fmt(10 ** v) });
        GK.text(g, 'per second / price (log scale)', X0, 30, C.muted, 12, 'left', 600);
        const ser = S.series.filter(p => p.t <= cur);
        GK.line(g, ser.map(p => [A.sx(p.t), A.sy(lg(p.next))]), C.gold, 3);
        GK.line(g, ser.map(p => [A.sx(p.t), A.sy(lg(p.inc))]), C.good, 3);
        shown.forEach(b => { g.fillStyle = P[b.i][3]; g.fillRect(A.sx(b.t) - 1, 262, 2, 8); });
        // bottom: the wait before each purchase
        const B = GK.axes(g, X0, 320, X1 - X0, 120, { x0: 0, x1: END, y0: 0, y1: 720, xt: [], yt: [0, 360, 720], fmtY: v => fmtT(v) });
        GK.text(g, 'wait before each purchase', X0, 310, C.muted, 12, 'left', 600);
        shown.forEach(b => { const h = Math.min(720, b.wait); g.fillStyle = P[b.i][3]; g.fillRect(B.sx(b.t) - 1.5, B.sy(h), 3, B.sy(0) - B.sy(h)); });
        g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(A.sx(cur), 40); g.lineTo(A.sx(cur), 440); g.stroke();
        // legend
        GK.line(g, [[X1 - 290, 22], [X1 - 268, 22]], C.good, 3); GK.text(g, 'income per second', X1 - 262, 26, C.muted, 12);
        GK.line(g, [[X1 - 140, 22], [X1 - 118, 22]], C.gold, 3); GK.text(g, 'next price', X1 - 112, 26, C.muted, 12);
        P.forEach((p, i) => { g.fillStyle = p[3]; g.fillRect(X0 + i * 110, 466, 12, 12); GK.text(g, p[0], X0 + 18 + i * 110, 477, C.muted, 12, 'left', 600); });
        // readouts
        const owned = P.map(() => 0); shown.forEach(b => owned[b.i]++);
        GK.big(g, `${shown.length}`, 'purchases so far', X0, 522);
        GK.big(g, fmtT(avg), 'average wait, second hour', X0 + 160, 522, avg > 100 ? C.redDk : avg < 30 ? C.goldInk : C.good);
        GK.big(g, fmtT(longest), 'longest wait, second hour', X0 + 340, 522, longest > 540 ? C.redDk : C.ink);
        GK.big(g, fmt(S.inc + cps), 'per second at 2 hours', X0 + 520, 522);
        GK.wrap(g, owned.map((v, i) => `${v} ${P[i][0]}`).join(' · '), X0 + 690, 516, 220, 18, C.ink, 13, 600);
        if (say) TD.label(say, 545, 58, 'center', C.navy, 14);
        ui.stats(`<div><b>${S.buys.length}</b><span>purchases in two hours</span></div><div class="g"><b>${fmtT(avg)}</b><span>average wait, second hour</span></div>`);
        ui.out(avg > 100 ? 'Costs outrun income: the player waits so long between goals that the loop goes quiet.'
          : avg < 30 ? 'Purchases arrive faster than anyone can want them, and the numbers outgrow any sense of progress.'
          : 'Each price rises a little faster than income keeps up with it, so the next goal stays about a minute away.');
      },
    };
  });
})();
