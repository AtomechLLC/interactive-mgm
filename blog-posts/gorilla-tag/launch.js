/* Tune the launch (genre breakdown: "How to Make a Game Like Gorilla Tag?"), a lesson-richness spike for slide 2.
   Slide 1 shows how pushing the world moves the body. A designer of arm locomotion then tunes what a release does:
     launch multiplier: release speed = hand speed x the multiplier (games like this often boost it above 1).
     speed cap: no launch goes faster.
     smoothing: release speed averages the last N frames of hand speed, which cancels jitter (by the square root of N)
                but makes the release lag N frames of 11 ms behind the hand.
   Forty novices (hand speed about 1.75 m/s, jittery) and forty experts (about 2.6 m/s, steady) each launch at a gap
   that needs 2.4 m/s, seeded. Launch distance grows with the square of speed. A comfort line at 4 m/s marks launches
   fast enough that some players find them uncomfortable in a headset. All numbers are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const NEED = 2.4, COMFORT = 4, VMAX = 6;
  const pop = (seed, mu, sd, jit) => { const R = GK.rng(seed), a = []; for (let i = 0; i < 40; i++) { const n = () => { const u = Math.max(1e-6, R()), v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); }; a.push([mu + sd * n(), jit * n()]); } return a; };
  const NOV = pop(4, 1.75, .3, .35), EXP = pop(8, 2.6, .2, .18);
  function model(mult, cap, N) {
    const v = p => p.map(([s, j]) => Math.max(.2, Math.min(cap, mult * (s + j / Math.sqrt(N)))));
    const nv = v(NOV), ev = v(EXP), mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    return { pinned: ev.filter(x => x >= cap - 1e-9).length / 40, nv, ev, nClear: nv.filter(x => x >= NEED).length / 40, eTop: mean(ev), over: ev.filter(x => x > COMFORT).length / 40, gap: (mean(ev) ** 2) / (mean(nv) ** 2), lag: N * 11 };
  }
  GK.scene('launch', (s, g, ui) => {
    const mEl = s.querySelector('.ln-m'), mv = s.querySelector('.ln-mv'), cEl = s.querySelector('.ln-c'), cv = s.querySelector('.ln-cv'), nEl = s.querySelector('.ln-n'), nv = s.querySelector('.ln-nv');
    ui.watch(mEl, cEl, nEl);
    const ACTS = [
      { to: 6, m: 1, c: 6, n: 1, say: 'Release speed equals hand speed. Experts clear the gap; most novices fall short and conclude the game is not for them.' },
      { to: 12, m: 1.5, c: 6, n: 1, say: 'Boost every release by 50%. Most novices now clear it, and half the expert launches fly past the comfort line.' },
      { to: 18, m: 1.5, c: 3.8, n: 1, say: 'Cap the speed. Comfort is back, but the experts pile up against the cap: the speed that set them apart stops showing.' },
      { to: 24, m: 1.5, c: 3.8, n: 4, say: 'Smoothing over four frames sounds like help for shaky hands, but it trims lucky launches as well as unlucky ones. Almost nobody changes side of the gap, and every release lags 44 ms.' },
    ];
    return {
      dur: 24,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); mEl.value = a.m; cEl.value = a.c; nEl.value = a.n; say = a.say; }
        const mult = +mEl.value, cap = +cEl.value, N = +nEl.value;
        mv.textContent = `×${mult.toFixed(2)}`; cv.textContent = cap >= VMAX ? 'none' : `${cap.toFixed(1)} m/s`; nv.textContent = `${N} frame${N > 1 ? 's' : ''} (${N * 11} ms)`;
        const m = model(mult, cap, N);
        GK.panel(g);
        GK.head(g, 'Launch speed of 40 novices and 40 experts', 20, 28);
        const ax = 70, ay = 50, aw = 940, ah = 250, sx = v => ax + v / VMAX * aw, bins = 30, bw = aw / bins;
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.strokeRect(ax, ay, aw, ah);
        for (let v = 0; v <= VMAX; v++) GK.text(g, v + ' m/s', sx(v), ay + ah + 16, C.muted, 11, 'center', 600);
        const hist = (a, col, up) => { const h = new Array(bins).fill(0); a.forEach(x => h[Math.min(bins - 1, Math.floor(x / VMAX * bins))]++); h.forEach((c, i) => { if (!c) return; const hh = c * 9; g.fillStyle = col; g.fillRect(ax + i * bw + 1, up ? ay + ah / 2 - hh : ay + ah / 2, bw - 2, hh); }); };
        g.strokeStyle = '#cdbf9f'; g.beginPath(); g.moveTo(ax, ay + ah / 2); g.lineTo(ax + aw, ay + ah / 2); g.stroke();
        hist(m.ev, C.p2, true); hist(m.nv, C.gold, false);
        GK.text(g, 'experts', ax + 8, ay + 18, C.good, 12, 'left', 800); GK.text(g, 'novices', ax + 8, ay + ah - 8, C.goldInk, 12, 'left', 800);
        const vline = (v, col, lbl, dy) => { g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(sx(v), ay); g.lineTo(sx(v), ay + ah); g.stroke(); g.setLineDash([]); GK.text(g, lbl, sx(v) + 4, ay + dy, col, 11, 'left', 800); };
        vline(NEED, C.navy, 'clears the gap', 14); vline(COMFORT, C.red, 'comfort line', 30);
        if (cap < VMAX) vline(cap, C.purple, 'cap', 46);
        const yb = 360;
        GK.big(g, `${Math.round(m.nClear * 100)}%`, 'of novices clear the gap', 20, yb, m.nClear >= .6 ? C.good : C.redDk);
        GK.big(g, `${m.eTop.toFixed(1)} m/s`, 'typical expert launch', 220, yb);
        GK.big(g, `${Math.round(m.pinned * 100)}%`, 'expert launches at the cap', 420, yb, m.pinned > .3 ? C.goldInk : C.ink);
        GK.big(g, `${Math.round(m.over * 100)}%`, 'of expert launches past comfort', 620, yb, m.over > .2 ? C.redDk : C.good);
        GK.big(g, `${m.lag} ms`, 'release lag', 850, yb, m.lag > 30 ? C.goldInk : C.ink);
        GK.wrap(g, say || (m.nClear >= .6 && m.over <= .2 && m.pinned <= .3 && m.lag <= 30 ? 'Novices get over the first gap, experts still fly further, and nobody leaves feeling ill.' : 'Each dial fixes one readout and moves another.'), 20, 440, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'One movement rule sets the floor for new players, the ceiling for experts and the comfort limit for everyone. A boost lifts the floor and the ceiling together; a cap protects comfort by flattening the ceiling; smoothing trims jitter both ways and costs response.', 20, 516, 1000, 18, C.muted, 13);
        ui.stats(`<div class="${m.nClear >= .6 ? 'g' : 'r'}"><b>${Math.round(m.nClear * 100)}%</b><span>novices clear the gap</span></div><div class="${m.over > .2 ? 'r' : 'g'}"><b>${Math.round(m.over * 100)}%</b><span>expert launches past comfort</span></div>`);
        ui.out('The same rule sets the floor, the ceiling and the comfort limit.');
      },
    };
  });
})();
