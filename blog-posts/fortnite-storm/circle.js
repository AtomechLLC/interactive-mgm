/* Tune the circle (genre breakdown: "How to Make a Game like Fortnite?"), a lesson-richness spike for slide 2.
   Slide 1 shows that a storm forces fights. This slide hands the learner the storm's two main dials: how long the
   first circle waits (looting time) and how fast each phase closes. Five phases take the safe circle's radius from
   1 to 0.06; each phase holds for 60% of the first wait, 20% less each time.
   The match is a population model, not agents: eliminations from fights grow with players squared over the circle's
   area; a phase that closes faster than players can run (0.16 radius a minute) catches some of them. Four readouts
   pull against each other: looting time, the longest quiet stretch, deaths to the storm, and players left when the
   final circle closes. All rates are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const RAD = [1, .62, .4, .24, .13, .06], RUN = .16;
  function run(wait, shrink) {
    const hold = wait * .6, ev = []; let t = wait;
    for (let i = 1; i < RAD.length; i++) { ev.push([t, t + shrink, RAD[i - 1], RAD[i]]); t += shrink + hold * Math.pow(.8, i); }
    let N = 100, storm = 0, quiet = 0, q = 0, finalN = null; const dt = .05, S = [];
    const rAt = x => { let r = RAD[0], v = 0; for (const [a, b, r0, r1] of ev) { if (x >= b) r = r1; else if (x >= a) { r = r0 + (r1 - r0) * (x - a) / (b - a); v = (r0 - r1) / (b - a); break; } else break; } return [r, v]; };
    for (let x = 0; x < t + 8 && N > 1.5; x += dt) {
      const [r, v] = rAt(x), f = Math.min(N * .5, .00022 * N * N / (r * r) * dt * (1 + .6 * Math.min(1, x / 3)));
      const caught = v > RUN ? N * (v - RUN) / v * .2 * dt : 0;
      N -= f + caught; storm += caught;
      if (x > 2) { if ((f + caught) / dt < 1.2) { q += dt; quiet = Math.max(quiet, q); } else q = 0; }
      if (finalN === null && x >= ev[ev.length - 1][1]) finalN = N;
      S.push([x, N, r, v > RUN]);
    }
    return { ev, S, storm, quiet, finalN: finalN ?? N, len: S[S.length - 1][0] };
  }
  const band = (v, lo, hi, lo2, hi2) => v >= lo && v <= hi ? 0 : v >= lo2 && v <= hi2 ? 1 : 2;
  const COL = [C.good, C.goldInk, C.redDk], CLS = ['g', 'y', 'r'];

  GK.scene('circle', (s, g, ui) => {
    const wEl = s.querySelector('.ci-w'), wv = s.querySelector('.ci-wv'), sEl = s.querySelector('.ci-s'), sv = s.querySelector('.ci-sv');
    ui.watch(wEl, sEl);
    const ACTS = [
      { to: 8, w: 2, s: .5, say: 'A fast storm: a short loot, and phases that close faster than players can run. One in six dies to the map, and a crowd reaches the last circle, where the winner is a lottery.' },
      { to: 16, w: 8, s: 4, say: 'A slow storm: long looting and long quiet stretches, and the match is decided before the last circle closes.' },
      { to: 24, w: 4, s: 2, say: 'In between: time to loot, steady pressure, few deaths to the storm, and a handful of players left for the final circle.' },
    ];
    return {
      dur: 24,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); wEl.value = a.w; sEl.value = a.s; say = a.say; }
        const w = +wEl.value, sh = +sEl.value; wv.textContent = w + ' min'; sv.textContent = sh + ' min';
        const r = run(w, sh);
        GK.panel(g);
        // the island at a moment of the match: the loop replays the match in 7 s
        const mx = r.len * ((t % 7) / 7), idx = Math.min(r.S.length - 1, Math.floor(mx / .05)), [x, N, rad, fast] = r.S[idx];
        const ix = 20, iy = 44, iw = 300, cx = ix + iw / 2, cy = iy + iw / 2;
        GK.head(g, `Minute ${x.toFixed(0)}: ${Math.round(N)} players left`, ix, 28);
        g.fillStyle = 'rgba(138,79,214,.35)'; g.beginPath(); g.roundRect(ix, iy, iw, iw, 12); g.fill();
        g.fillStyle = '#7fb069'; g.beginPath(); g.arc(cx, cy, rad * iw * .5, 0, 6.283); g.fill();
        g.strokeStyle = fast ? C.red : '#fff'; g.lineWidth = 3; g.stroke();
        const R = GK.rng(5);
        for (let i = 0; i < Math.round(N); i++) { const a = R() * 6.283, d = Math.sqrt(R()) * .92; TD.player(cx + Math.cos(a) * d * rad * iw * .5, cy + Math.sin(a) * d * rad * iw * .5, a, .3, 1, C.player); }
        if (fast) GK.text(g, 'closing faster than players can run', cx, iy + iw + 18, C.redDk, 12, 'center', 800);
        // players left over the match
        const ax = 380, ay = 44, aw = 630, ah = 260, tm = Math.max(30, Math.ceil(r.len / 5) * 5);
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: tm, y0: 0, y1: 100, xt: Array.from({ length: tm / 5 + 1 }, (_, i) => i * 5), yt: [0, 25, 50, 75, 100], fmtX: v => v + ' min', xl: 'match time' });
        GK.head(g, 'Players left', ax, 28);
        g.fillStyle = 'rgba(224,169,45,.25)'; g.fillRect(A.sx(0), ay, A.sx(w) - A.sx(0), ah); GK.text(g, 'looting', (A.sx(0) + A.sx(w)) / 2, ay + 14, C.goldInk, 11, 'center', 800);
        r.ev.forEach(([a, b]) => { g.fillStyle = 'rgba(138,79,214,.16)'; g.fillRect(A.sx(a), ay, A.sx(b) - A.sx(a), ah); });
        const last = r.ev[r.ev.length - 1][1]; g.strokeStyle = C.purple; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(A.sx(last), ay); g.lineTo(A.sx(last), ay + ah); g.stroke(); g.setLineDash([]);
        GK.text(g, 'final circle', A.sx(last) + 4, ay + 28, C.purple, 11, 'left', 800);
        GK.line(g, r.S.filter((p, i) => i % 4 === 0).map(p => [A.sx(p[0]), A.sy(p[1])]), C.navy, 3);
        g.fillStyle = C.red; g.beginPath(); g.arc(A.sx(x), A.sy(N), 5, 0, 6.283); g.fill();
        // readouts
        const R4 = [
          [`${w} min`, 'to loot before the first circle', band(w, 3, 6, 2, 8), ['time to gear up', w < 3 ? 'a short loot' : 'a long loot', w < 3 ? 'no time to gear up' : 'a long wait']],
          [`${r.quiet.toFixed(1)} min`, 'longest stretch with almost no eliminations', band(r.quiet, 0, 4, 0, 6), ['steady pressure', 'a lull', 'nothing happens for minutes']],
          [`${r.storm.toFixed(0)}%`, 'of players eliminated by the storm', band(r.storm, 0, 6, 0, 12), ['players beat players', 'some die to the map', 'the map is the enemy']],
          [`${r.finalN.toFixed(0)}`, 'players left as the final circle closes', band(r.finalN, 4, 9, 3, 12), ['a real endgame', r.finalN > 9 ? 'crowded' : 'thin', r.finalN > 12 ? 'a lottery' : 'decided before the end']],
        ];
        R4.forEach(([v, l, b, notes], i) => {
          const bx = 20 + i * 252, by = 370;
          GK.box(g, bx, by, 238, 92, ['#d8f0df', '#fde9b8', '#f9d9d6'][b], null, 10);
          GK.head(g, v, bx + 12, by + 32, 'left', COL[b], 24); GK.wrap(g, l, bx + 12, by + 52, 214, 15, C.ink, 12, 600); GK.text(g, notes[b], bx + 12, by + 84, COL[b], 12, 'left', 800);
        });
        GK.wrap(g, say || 'Every dial trades one readout for another: a faster storm buys pressure with deaths to the map, and a slower one buys looting with dead time.', 20, 496, 1000, 21, C.ink, 16, 700);
        GK.text(g, `Match length: ${r.len.toFixed(0)} minutes.`, 20, 568, C.muted, 13, 'left', 600);
        const bad = R4.filter(q => q[2] === 2).length;
        ui.stats(`<div class="${CLS[R4[2][2]]}"><b>${r.storm.toFixed(0)}%</b><span>eliminated by the storm</span></div><div class="${CLS[R4[3][2]]}"><b>${r.finalN.toFixed(0)}</b><span>players at the final circle</span></div>`);
        ui.out(bad ? `${bad} readout${bad > 1 ? 's are' : ' is'} out of range.` : 'All four in range: the storm paces the match without deciding it.');
      },
    };
  });
})();
