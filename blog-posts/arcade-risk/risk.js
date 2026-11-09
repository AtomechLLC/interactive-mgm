/* Risk for score (genre breakdown: "Arcade Game Design").
   A graze rule, as in many shooters: a multiplier climbs while you fly close to the bullet stream, faster the closer
   you are, and a hit resets it and costs one of three lives. Each second scores 10 × the multiplier. The slider sets
   how close the pilot stays; runs are seeded, so the same distance always plays the same way. The ghost line is a run at
   the distance with the highest average over six seeded runs. Rates are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const LEN = 60, LIVES = 3;
  const grow = d => 2.2 * Math.exp(-(d - 18) / 30), hitRate = d => .45 * Math.exp(-(d - 18) / 16);
  function run(d, seed = 1) {
    const R = GK.rng(Math.round(d) * 3 + seed); let mult = 1, score = 0, lives = LIVES, t = 0; const pts = [[0, 0]], hits = [];
    for (; t < LEN && lives > 0; t += .1) {
      mult += grow(d) * .1;
      if (R() < hitRate(d) * .1) { lives--; mult = 1; hits.push(t); }
      score += 10 * mult * .1; pts.push([t + .1, score]);
    }
    return { score, pts, hits, end: t, lives };
  }
  const DS = []; for (let d = 18; d <= 160; d += 2) DS.push(d);
  // six seeded runs per distance: the bars show their mean, the arena plays the median one
  const ALL = DS.map(d => { const rs = [1, 2, 3, 4, 5, 6].map(k => run(d, k)).sort((a, b) => a.score - b.score), r = rs[3]; r.mean = rs.reduce((a, x) => a + x.score, 0) / 6; return [d, r]; });
  const BEST = ALL.reduce((a, b) => b[1].mean > a[1].mean ? b : a);
  GK.scene('risk', (s, g, ui) => {
    const dEl = s.querySelector('.ar-d'), dv = s.querySelector('.ar-dv'); ui.watch(dEl);
    const ACTS = [{ to: 8, d: 140 }, { to: 16, d: 24 }, { to: 24, d: BEST[0] }];
    return {
      dur: 24,
      frame(t, tour) {
        let d = +dEl.value; if (tour) { const [a] = GK.act(ACTS, t); d = a.d; dEl.value = d; }
        d = Math.round(d / 2) * 2; dv.textContent = d + ' px from the bullets';
        const r = ALL.find(x => x[0] === d)[1], lt = Math.min(r.end, (tour ? t % 8 : t % 10) / 7 * LEN);
        const i = Math.min(r.pts.length - 1, Math.floor(lt / .1)), score = r.pts[i][1], hitsSoFar = r.hits.filter(h => h <= lt).length;
        const lastHit = r.hits.filter(h => h <= lt).pop() ?? 0, mult = 1 + grow(d) * (lt - lastHit);
        GK.panel(g);
        // arena
        const ax = 16, ay = 16, aw = 420, ah = 540;
        g.fillStyle = '#10142e'; g.beginPath(); g.roundRect(ax, ay, aw, ah, 10); g.fill();
        const sx = ax + 150;
        for (let k = 0; k < 16; k++) { const y = ay + ((k * 40 + lt * 260) % ah); g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(sx, y, 7, 0, 6.283); g.fill(); g.fillStyle = '#ffd1d1'; g.beginPath(); g.arc(sx, y, 3, 0, 6.283); g.fill(); }
        g.strokeStyle = 'rgba(255,185,81,.35)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(sx + 60, ay); g.lineTo(sx + 60, ay + ah); g.stroke(); g.setLineDash([]);
        GK.text(g, 'graze zone', sx + 64, ay + 18, C.gold, 11, 'left', 700);
        const px = sx + 8 + d * 1.5, py = ay + 400 + Math.sin(lt * 2) * 30, justHit = r.hits.some(h => lt - h >= 0 && lt - h < .6);
        g.fillStyle = justHit ? '#fff' : C.player; g.beginPath(); g.moveTo(px, py - 16); g.lineTo(px + 12, py + 12); g.lineTo(px - 12, py + 12); g.closePath(); g.fill();
        if (d < 60 && !justHit) { g.strokeStyle = 'rgba(255,185,81,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 20 + (lt * 20) % 8, 0, 6.283); g.stroke(); }
        GK.head(g, `×${mult.toFixed(1)}`, ax + aw - 16, ay + 36, 'right', C.gold, 26);
        GK.text(g, '♥'.repeat(Math.max(0, LIVES - hitsSoFar)) + '♡'.repeat(Math.min(LIVES, hitsSoFar)), ax + 16, ay + 32, '#ff8a8a', 22, 'left', 700);
        GK.head(g, `${Math.round(score).toLocaleString()}`, ax + aw / 2, ay + ah - 16, 'center', '#fff', 22);
        if (lt >= r.end - .05 && r.lives === 0) TD.label('GAME OVER', ax + aw / 2, ay + 200, 'center', C.redDk, 18);
        // score chart
        const cx = 480, cw = 530;
        GK.head(g, 'Score over a 60 second run', cx, 34);
        const ymax = Math.max(...ALL.map(x => Math.max(x[1].score, x[1].mean)), 100) * 1.05;
        const A = GK.axes(g, cx + 40, 50, cw - 40, 260, { x0: 0, x1: LEN, y0: 0, y1: ymax, xt: [0, 20, 40, 60], yt: [0, Math.round(ymax / 2), Math.round(ymax)], fmtX: v => v + ' s', fmtY: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v });
        GK.line(g, BEST[1].pts.map(([x, y]) => [A.sx(x), A.sy(y)]), '#b9ad92', 2.5, [6, 5]);
        GK.text(g, `ghost: the best distance, ${BEST[0]} px away`, A.sx(LEN) - 4, A.sy(BEST[1].score) - 8, '#8c8068', 12, 'right', 700);
        GK.line(g, r.pts.slice(0, i + 1).map(([x, y]) => [A.sx(x), A.sy(y)]), C.player, 3.5);
        r.hits.filter(h => h <= lt).forEach(h => { const p = r.pts[Math.min(r.pts.length - 1, Math.round(h / .1))]; g.fillStyle = C.red; g.beginPath(); g.arc(A.sx(h), A.sy(p[1]), 5, 0, 6.283); g.fill(); });
        // final score by distance
        const by = 370, bh = 150;
        GK.head(g, 'Average final score by how close you fly (6 runs each)', cx, by - 12);
        const B = GK.axes(g, cx + 40, by, cw - 40, bh, { x0: 18, x1: 160, y0: 0, y1: ymax, xt: [20, 60, 100, 140], yt: [0, Math.round(ymax)], fmtX: v => v + ' px', fmtY: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v });
        ALL.forEach(([dd, rr]) => { g.fillStyle = dd === d ? C.player : dd === BEST[0] ? C.gold : 'rgba(93,97,140,.35)'; g.fillRect(B.sx(dd) - 2.5, B.sy(rr.mean), 5, by + bh - B.sy(rr.mean)); });
        GK.text(g, 'too safe: the multiplier crawls', B.sx(150), by + 14, C.muted, 11, 'right', 600);
        GK.text(g, 'too close: hits reset it', B.sx(20), by + 14, C.muted, 11, 'left', 600);
        ui.stats(`<div><b>${Math.round(r.score).toLocaleString()}</b><span>final score at ${d} px</span></div><div class="y"><b>${BEST[0]} px</b><span>the distance with the highest average score</span></div>`);
        ui.out('The score rewards the risk you choose. The high score lives between safe and reckless, and finding it is the skill.');
      },
    };
  });
})();
