/* The storm (genre breakdown: "How to Make a Game like Fortnite?").
   100 players land on a 1000 x 1000 island and wander. With the storm on, a safe circle shrinks in five phases and
   anyone outside heads for it. Two players within sight range fight, and one is out. Everything is precomputed from a
   seed for both modes, so the walk-through and __seek are deterministic.
   The match is compressed: 24 s of page time stand for a 20 minute match. Phases, speeds and sight range are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const N = 100, MAP = 1000, STEPS = 480, DT = 1 / 20, MATCH = STEPS * DT, SIGHT = 26, MIN_PER_S = 20 / MATCH;
  // phases: [start s, end s, radius at end, centre at end]
  const PH = [[0, 3, 560], [5, 8, 380], [10, 13, 240], [15, 18, 130], [19.5, 22, 50]];
  function circleAt(t, cs) {
    let r = 720, c = [500, 500];
    for (let i = 0; i < PH.length; i++) {
      const [a, b, rr] = PH[i], prevR = i ? PH[i - 1][2] : 720, prevC = i ? cs[i - 1] : [500, 500];
      if (t < a) { r = prevR; c = prevC; break; }
      const k = clamp((t - a) / (b - a)); r = lerp(prevR, rr, k); c = [lerp(prevC[0], cs[i][0], k), lerp(prevC[1], cs[i][1], k)];
    }
    return { r, c };
  }
  function simulate(storm) {
    const R = GK.rng(storm ? 11 : 12), RC = GK.rng(5);
    const cs = []; let c = [500, 500]; PH.forEach(([, , r], i) => { const prev = i ? PH[i - 1][2] : 720, d = (prev - r) * RC(), a = RC() * 6.283; c = [c[0] + Math.cos(a) * d * .6, c[1] + Math.sin(a) * d * .6]; cs.push(c); });
    const P = []; for (let i = 0; i < N; i++) { P.push({ x: 40 + R() * 920, y: 40 + R() * 920, h: R() * 6.283, out: -1 }); }
    const frames = [], fights = [];
    for (let s = 0; s <= STEPS; s++) {
      const t = s * DT, z = circleAt(t, cs);
      for (const p of P) {
        if (p.out >= 0) continue;
        const dx = z.c[0] - p.x, dy = z.c[1] - p.y, d = Math.hypot(dx, dy);
        if (storm && d > z.r * .85) p.h = Math.atan2(dy, dx) + (R() - .5) * .6; else p.h += (R() - .5) * .9;
        const sp = 80 * DT * (storm ? 1 : Math.max(.3, 1 - t / 12));   // with nothing pushing them, players settle in and hide
        p.x = clamp(p.x + Math.cos(p.h) * sp, 10, MAP - 10); p.y = clamp(p.y + Math.sin(p.h) * sp, 10, MAP - 10);
        if (storm && d > z.r + 30 && t > 21) p.out = t;   // caught by the final storm
      }
      // fights: each pair in sight range, once a quarter second
      if (s % 5 === 0) {
        const alive = P.filter(p => p.out < 0);
        for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
          const a = alive[i], b = alive[j]; if (a.out >= 0 || b.out >= 0) continue;
          if (Math.hypot(a.x - b.x, a.y - b.y) < SIGHT) { const loser = R() < .5 ? a : b; loser.out = t; fights.push({ t, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); }
        }
      }
      frames.push(P.map(p => [p.x, p.y, p.out]));
    }
    return { frames, fights, cs };
  }
  const SIM = { true: simulate(true), false: simulate(false) };
  const alive = (sim, t) => sim.frames[Math.min(STEPS, Math.round(t / DT))].filter(p => p[2] < 0 || p[2] > t).length;

  GK.scene('storm', (s, g, ui) => {
    const on = s.querySelector('.fs-storm'); ui.watch(on);
    const DUR = 52;
    return {
      dur: DUR,
      frame(t, tour) {
        let storm = on.checked, mt;
        if (tour) { storm = t < 26; on.checked = storm; mt = Math.min(MATCH, (t % 26) * 1.05); }
        else mt = Math.min(MATCH, (t % 28) * 1.05);
        const sim = SIM[storm], other = SIM[!storm];
        GK.panel(g);
        // map
        const mx = 18, my = 18, ms = 548, k = ms / MAP;
        g.fillStyle = '#7fb069'; g.beginPath(); g.roundRect(mx, my, ms, ms, 12); g.fill();
        g.fillStyle = '#5a9bd4'; g.fillRect(mx + ms * .62, my, ms * .38, ms * .06); g.fillRect(mx, my + ms * .7, ms * .05, ms * .3);
        if (storm) {
          const z = circleAt(mt, sim.cs);
          g.save(); g.beginPath(); g.rect(mx, my, ms, ms); g.arc(mx + z.c[0] * k, my + z.c[1] * k, z.r * k, 0, 6.2832, true); g.clip();
          g.fillStyle = 'rgba(138,79,214,.45)'; g.fillRect(mx, my, ms, ms); g.restore();
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(mx + z.c[0] * k, my + z.c[1] * k, z.r * k, 0, 6.2832); g.stroke();
          const ph = PH.findIndex(p => mt < p[1]);
          if (ph >= 0 && mt >= PH[ph][0]) GK.text(g, 'the storm is closing', mx + 12, my + ms - 12, '#fff', 14, 'left', 700);
        }
        const fr = sim.frames[Math.min(STEPS, Math.round(mt / DT))];
        fr.forEach(([x, y, out]) => { if (out >= 0 && out <= mt) return; g.fillStyle = C.player; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(mx + x * k, my + y * k, 5, 0, 6.2832); g.fill(); g.stroke(); });
        sim.fights.forEach(f => { const age = mt - f.t; if (age < 0 || age > 1.2) return; g.strokeStyle = `rgba(229,50,45,${1 - age / 1.2})`; g.lineWidth = 3; g.beginPath(); g.arc(mx + f.x * k, my + f.y * k, 8 + age * 18, 0, 6.2832); g.stroke(); });
        // charts
        const ax = 640, aw = 370;
        GK.head(g, 'Fights per minute, for every 10 players still in', ax, 40);
        const perMin = (sim2, a, b) => sim2.fights.filter(f => f.t >= a && f.t < b).length / ((b - a) * MIN_PER_S) / Math.max(1, alive(sim2, a) / 10);
        const bins = 10, bw = MATCH / bins, maxY = 3;
        const A = GK.axes(g, ax, 56, aw, 170, { x0: 0, x1: MATCH, y0: 0, y1: maxY, xt: [0, MATCH / 2, MATCH], yt: [0, 1, 2, 3], fmtX: v => Math.round(v * MIN_PER_S) + ' min' });
        [[other, '#b9ad92', 2.5, [6, 5]], [sim, storm ? C.purple : C.player, 3.5]].forEach(([sm, col, w, dash]) => {
          const pts = []; for (let i = 0; i < bins; i++) { const a = i * bw; if (sm === sim && a > mt) break; const v = perMin(sm, a, Math.min(a + bw, sm === sim ? Math.max(a + .01, mt) : a + bw)); pts.push([A.sx(a + bw / 2), A.sy(Math.min(maxY, v))]); }
          GK.line(g, pts, col, w, dash);
        });
        GK.text(g, storm ? 'dashed: same island, no storm' : 'dashed: same island, with the storm', ax + aw, 258, C.muted, 11, 'right');
        GK.head(g, 'Players still in', ax, 290);
        const B = GK.axes(g, ax, 304, aw, 150, { x0: 0, x1: MATCH, y0: 0, y1: 100, xt: [0, MATCH / 2, MATCH], yt: [0, 50, 100], fmtX: v => Math.round(v * MIN_PER_S) + ' min' });
        [[other, '#b9ad92', 2.5, [6, 5], MATCH], [sim, storm ? C.purple : C.player, 3.5, null, mt]].forEach(([sm, col, w, dash, upto]) => {
          const pts = []; for (let tt = 0; tt <= upto; tt += .25) pts.push([B.sx(tt), B.sy(alive(sm, tt))]); GK.line(g, pts, col, w, dash);
        });
        const left = alive(sim, mt), total = sim.fights.filter(f => f.t <= mt).length;
        GK.big(g, `${left}`, 'players still in', ax, 510);
        GK.big(g, `${total}`, 'fights so far', ax + 130, 510);
        GK.big(g, `${Math.round(mt * MIN_PER_S)}:00`, 'match clock', ax + 260, 510);
        const end = alive(sim, MATCH), otherEnd = alive(other, MATCH);
        ui.stats(`<div class="${storm ? 'g' : 'r'}"><b>${end}</b><span>players left at 20 minutes ${storm ? 'with' : 'without'} the storm</span></div><div><b>${otherEnd}</b><span>${storm ? 'without' : 'with'} the storm</span></div>`);
        ui.out(storm ? 'The circle packs the players who are left into less and less ground, so they keep running into each other: each player keeps meeting fights until one or two remain.'
          : 'Without the storm, players spread out and hide. Fights dry up as the island empties, and twenty minutes later dozens are still waiting.');
      },
    };
  });
})();
