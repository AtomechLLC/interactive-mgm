/* One pair of eyes, three jobs (genre breakdown: "RTS Game Design").
   Economy, supply and the army each build up urgency while you look away; a full bar starts to cost you (idle workers
   waste income, a supply block stops production, an unwatched fight loses units). You can attend to one job at a time,
   and switching takes a moment. Play it yourself (keys 1, 2, 3) or watch three habits play the same 45-second match.
   All rates are illustrative. */
(function () {
  const C = TD.C, { clamp } = TD;
  const END = 45, DT = .1, SWITCH = .6;
  const FIGHTS = [[12, 22], [30, 40]];
  const inFight = t => FIGHTS.some(([a, b]) => t >= a && t < b);
  const JOBS = [
    { key: 'eco', name: 'Economy', what: 'queue workers', col: C.gold, rise: () => 1 / 6, cost: 'income wasted', unit: '' },
    { key: 'sup', name: 'Supply', what: 'build depots', col: C.good, rise: () => 1 / 10, cost: 's of production blocked', unit: ' s' },
    { key: 'army', name: 'Army', what: 'control the fight', col: C.red, rise: t => inFight(t) ? 1 / 2 : -1 / 4, cost: 'units lost', unit: '' },
  ];
  const POLICIES = {
    army: { label: 'Army only', pick: () => 2 },
    robin: { label: 'Round robin, 3 s each', pick: t => Math.floor(t / 3) % 3 },
    urgent: { label: 'Triage: most urgent, then finish it', pick: (t, u, cur) => { if (u[cur] > .02 && !(u[2] > .85 && cur !== 2)) return cur; let b = cur, bv = -1; u.forEach((v, i) => { if (v > bv) { bv = v; b = i; } }); return b; } },
  };
  // run the match: choose(t, urgency, current) -> job index
  function sim(choose, upto = END) {
    const u = [0, 0, 0], cost = [0, 0, 0], line = [], hist = []; let cur = 0, sw = 0, army = 20;
    for (let t = 0; t < upto - 1e-9; t += DT) {
      const want = choose(t, u, cur); if (want !== cur) { cur = want; sw = SWITCH; }
      const focus = sw > 0 ? -1 : cur; sw -= DT;
      JOBS.forEach((j, i) => { u[i] = clamp(u[i] + (i === focus ? -1 : j.rise(t)) * DT, 0, 1); });
      if (u[0] >= 1) cost[0] += 5 * DT;
      if (u[1] >= 1) cost[1] += DT;
      if (u[2] >= 1 && inFight(t)) { cost[2] += .8 * DT; army = Math.max(0, army - .8 * DT); }
      line.push(focus); if (Math.round(t / DT) % 5 === 0) hist.push([t, ...u]);
    }
    return { u, cost, line, hist, cur };
  }
  const fmtC = (i, v) => i === 0 ? Math.round(v) + '' : i === 1 ? v.toFixed(1) + ' s' : Math.round(v) + '';
  const total = c => c[0] / 5 + c[1] + c[2] * 2;   // a single "cost" in seconds-ish, illustrative weights

  GK.scene('attention', (s, g, ui) => {
    const jb = [...s.querySelectorAll('.rt-j')], pb = [...s.querySelectorAll('.rt-p')]; ui.watch(jb, pb);
    let mode = 'urgent', t0 = 0, rec = [[0, 0]], want = 0;
    const setJob = i => { if (mode !== 'you') { mode = 'you'; t0 = ui.t; rec = [[0, i]]; } else rec.push([ui.t - t0, i]); want = i; };
    jb.forEach(b => b.onclick = () => setJob(+b.dataset.j));
    pb.forEach(b => b.onclick = () => { mode = b.dataset.p; t0 = ui.t; });
    window.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; const i = '123'.indexOf(e.key); if (i >= 0) { ui.stopTour(); setJob(i); } });
    const ORDER = ['army', 'robin', 'urgent'], SPEED = 3, PER = END / SPEED + 2;
    const cache = {};
    const full = m => cache[m] || (cache[m] = sim((t, u, c) => POLICIES[m].pick(t, u, c)));
    return {
      dur: PER * 3,
      frame(t, tour) {
        let gt;
        if (tour) { mode = ORDER[Math.floor(t / PER) % 3]; gt = Math.min(END, (t % PER) * SPEED); }
        else gt = mode === 'you' ? Math.min(END, t - t0) : Math.min(END, ((t - t0) * SPEED) % (END + 6));
        pb.forEach(b => b.classList.toggle('on', b.dataset.p === mode));
        const choose = mode === 'you' ? (tt => { let j = 0; rec.forEach(([a, i]) => { if (a <= tt + 1e-9) j = i; }); return j; }) : (tt, u, c) => POLICIES[mode].pick(tt, u, c);
        const S = mode === 'you' ? sim(choose, gt) : sim(choose, gt);
        jb.forEach(b => b.classList.toggle('on', S.line.length && S.line[S.line.length - 1] === +b.dataset.j));
        GK.panel(g);
        GK.head(g, mode === 'you' ? 'You are playing (keys 1, 2, 3)' : POLICIES[mode].label, 24, 36, 'left', C.ink, 18);
        GK.text(g, `match time ${gt.toFixed(1)} / ${END} s${inFight(gt) ? '  ·  fight on' : ''}`, 1016, 36, inFight(gt) ? C.redDk : C.muted, 13, 'right', 700);
        // lanes
        JOBS.forEach((j, i) => {
          const y = 70 + i * 92, on = S.line[S.line.length - 1] === i;
          GK.box(g, 24, y, 600, 78, on ? '#fff3d6' : '#fffaf0', on ? C.gold : '#cdbf9f', 10, on ? 3 : 1.5);
          GK.text(g, `${i + 1}  ${j.name}`, 40, y + 28, C.ink, 16, 'left', 800);
          GK.text(g, j.what, 40, y + 50, C.muted, 12, 'left', 600);
          GK.text(g, on ? 'watching' : 'unwatched', 40, y + 66, on ? C.goldInk : C.muted, 11, 'left', 700);
          GK.box(g, 200, y + 22, 260, 22, '#efe6d2', null, 11);
          const v = S.u[i]; g.fillStyle = v >= 1 ? C.redDk : j.col; g.beginPath(); g.roundRect(200, y + 22, Math.max(0, 260 * v), 22, 11); g.fill();
          GK.text(g, v >= 1 ? 'full: costing you' : 'urgency', 330, y + 62, v >= 1 ? C.redDk : C.muted, 11, 'center', 700);
          GK.big(g, fmtC(i, S.cost[i]), j.cost, 484, y + 34, S.cost[i] > 0 ? C.redDk : C.ink);
        });
        // replay line
        const X0 = 24, X1 = 1016, Y = 360, sx = tt => X0 + tt / END * (X1 - X0);
        GK.text(g, 'where attention went', X0, Y - 8, C.muted, 12, 'left', 700);
        FIGHTS.forEach(([a, b]) => { g.fillStyle = 'rgba(229,50,45,.12)'; g.fillRect(sx(a), Y, sx(b) - sx(a), 34); GK.text(g, 'fight', (sx(a) + sx(b)) / 2, Y + 50, C.redDk, 11, 'center', 700); });
        S.line.forEach((f, k) => { g.fillStyle = f < 0 ? '#cdbf9f' : JOBS[f].col; g.fillRect(sx(k * DT), Y + 6, sx(DT) - sx(0) + .5, 22); });
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.strokeRect(X0, Y, X1 - X0, 34);
        // urgency trace
        const ty = 420, th = 70;
        S.hist.forEach(() => {});
        [0, 1, 2].forEach(i => GK.line(g, S.hist.map(h => [sx(h[0]), ty + th - h[i + 1] * th]), JOBS[i].col, 2));
        g.strokeStyle = '#cdbf9f'; g.strokeRect(X0, ty, X1 - X0, th); GK.text(g, 'urgency over the match', X0, ty - 6, C.muted, 12, 'left', 700);
        // all three habits compared (full matches)
        const RX = 650;
        GK.head(g, 'Full match, each habit', RX, 92, 'left', C.ink, 15);
        ORDER.forEach((m, i) => {
          const F = full(m), y = 112 + i * 62;
          GK.box(g, RX, y, 366, 54, m === mode ? '#fff3d6' : '#fffaf0', m === mode ? C.gold : '#cdbf9f', 8, 2);
          GK.text(g, POLICIES[m].label, RX + 12, y + 22, C.ink, 13, 'left', 700);
          GK.text(g, `${Math.round(F.cost[0])} income · ${F.cost[1].toFixed(1)} s blocked · ${Math.round(F.cost[2])} units`, RX + 12, y + 42, C.muted, 12, 'left', 600);
        });
        GK.text(g, 'Switching jobs costs 0.6 s of looking at nothing (tan on the line).', X0, 530, C.ink, 13, 'left', 600);
        const tot = total(S.cost);
        ui.stats(`<div><b>${Math.round(S.cost[0])}</b><span>income wasted</span></div><div><b>${S.cost[1].toFixed(1)} s</b><span>supply blocked</span></div><div class="${S.cost[2] ? '' : 'g'}"><b>${Math.round(S.cost[2])}</b><span>units lost</span></div>`);
        ui.out(mode === 'army' ? 'Watching only the army wins the fights and starves the base: income and supply bleed the whole match.'
          : mode === 'robin' ? 'A fixed rotation spreads the cost evenly, but it looks away mid-fight just as often as it looks at the economy in a lull.'
          : mode === 'urgent' ? 'Triage: take the fullest bar, finish it, drop anything for a fight about to boil over. Every bar stays short of full, and the skill is the choosing.'
          : `Your match so far costs about ${tot.toFixed(0)} (illustrative units). Fights fill the army bar fast; the base fills while you fight.`);
      },
    };
  });
})();
