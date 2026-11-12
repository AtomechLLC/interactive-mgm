/* Is this map fair? (The Level Design Book: Balance)
   A three-lane map for two teams. The book's balance page asks for a win rate near 50%, warns against a position so
   useful that it becomes the only strategy, and suggests a chokepoint per lane so no single spot covers every route.
   It lists three symmetries: mirrored, rotated, and none (the hardest to balance).
   The book gives no formula, so the model here is ours: in each lane the fight leans toward whoever arrives first
   and whoever holds a perch, plus luck; with one shared choke a single fight decides the round and arriving first
   counts for much more. 200 seeded rounds are played for every setting. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, INK = '#1c2450', YS = [120, 292, 465], BX = 150, PXS = 25, N = 200;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const along = (p, d) => { for (let i = 0; i < p.length - 1; i++) { const l = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); if (d <= l || i === p.length - 2) { const u = clamp(d / l); return [p[i][0] + (p[i + 1][0] - p[i][0]) * u, p[i][1] + (p[i + 1][1] - p[i][1]) * u, Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0])]; } d -= l; } };
  const len = p => p.slice(1).reduce((m, q, i) => m + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);

  canvasDemo('balance', (s, cv, g) => {
    const st = { sym: 'mirror', d: 0, choke: 'lane' }; let t = 0, ri = 0, lanes = [], rounds = [], m = {};
    const perchR = () => st.sym === 'mirror' ? 0 : st.sym === 'rot' ? 2 : -1;      // which lane red's perch overlooks
    function build() {
      const rx = 890 + st.d * PXS;
      lanes = YS.map(y => st.choke === 'lane' ? [[BX, 292], [300, y], [740, y], [rx, 292]] : [[BX, 292], [300, y], [440, y], [520, 292], [600, y], [740, y], [rx, 292]]);
      const R = rng(4242), gauss = () => Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(6.283185 * R());
      const first = Math.tanh(st.d / 2), pr = perchR(); let blue = 0; rounds = [];
      for (let i = 0; i < N; i++) {
        let res;
        if (st.choke === 'one') { const w = 1.6 * first + .5 * (1 - (pr >= 0 ? 1 : 0)) + .8 * gauss() > 0; res = [w, w, w]; }
        else res = [0, 1, 2].map(l => .6 * first + .9 * ((l === 0 ? 1 : 0) - (l === pr ? 1 : 0)) + gauss() > 0);
        const w = res.filter(Boolean).length >= 2; if (w) blue++; rounds.push({ res, w });
      }
      const p = blue / N, off = Math.abs(p - .5), spots = st.choke === 'one' ? 1 : 3;
      m = { p, spots }; t = 0; ri = 0;
      say($(s, '.bl-stats'),
        `<div class="${off <= .06 ? 'g' : off <= .12 ? 'y' : 'r'}"><b>${Math.round(p * 100)}%</b><span>of ${N} rounds won by blue (aim near 50%)</span></div>` +
        `<div><b>${st.d === 0 ? '0 s' : Math.abs(st.d).toFixed(1) + ' s'}</b><span>${st.d === 0 ? 'both teams reach the middle together' : (st.d > 0 ? 'blue' : 'red') + ' reaches the middle first'}</span></div>` +
        `<div class="${spots === 1 ? 'y' : ''}"><b>${spots}</b><span>${spots === 1 ? 'position watches every route' : 'positions needed to watch every route'}</span></div>`);
      const lead = p > .5 ? 'Blue' : 'Red';
      say($(s, '.bl-out'),
        st.choke === 'one' && off > .06 ? `<b class="accent">One choke decides everything.</b> Every route passes one doorway, so whoever gets there first holds the whole map and the other strategies stop mattering. ${lead} wins most rounds. The book’s advice is a chokepoint for each lane.`
        : st.choke === 'one' ? '<b class="accent">Even, and fragile.</b> The numbers are level, but one position still covers every route. Move a spawn by half a second and watch how far the win rate swings.'
        : off > .12 ? `<b class="accent">${lead} has the better map.</b> When one side’s advantage is this large it becomes the only sensible way to play. The book’s tuning habit: change a value by double or by half first, then narrow in.`
        : off > .06 ? `<b class="accent">Leaning ${lead.toLowerCase()}.</b> Close, but players will feel it over a long match, and felt fairness matters as much as the measured kind. Nudge the spawn.`
        : st.sym === 'none' ? '<b class="accent">Fair without symmetry.</b> Blue has the perch and red has the shorter walk: different advantages of about the same worth. The book calls this the hardest kind of balance to reach, and it only holds until players learn the map.'
        : st.sym === 'rot' ? '<b class="accent">Rotated, and level.</b> Turn the map half a circle and each team gets the same half, so timings match by construction. Each team’s perch overlooks a different lane, so the lanes play differently.'
        : '<b class="accent">Mirrored, and level.</b> The cheapest way to be fair: build one half and flip it. The cost is orientation. Both halves look alike, so the book asks for different art on each side.');
    }
    $$(s, '.bl-sym .btn').forEach(b => b.onclick = () => { st.sym = b.dataset.v; $$(s, '.bl-sym .btn').forEach(x => x.classList.toggle('on', x === b)); build(); });
    $$(s, '.bl-choke .btn').forEach(b => b.onclick = () => { st.choke = b.dataset.v; $$(s, '.bl-choke .btn').forEach(x => x.classList.toggle('on', x === b)); build(); });
    const dv = () => $(s, '.bl-dv').textContent = st.d === 0 ? 'same as blue' : Math.abs(st.d).toFixed(1) + (st.d > 0 ? ' s longer' : ' s shorter');
    $(s, '.bl-d').oninput = e => { st.d = +e.target.value; dv(); build(); };
    dv(); build();
    window.__balSet = (sym, d, choke, tt = 0) => { Object.assign(st, { sym, d, choke }); $$(s, '.bl-sym .btn').forEach(x => x.classList.toggle('on', x.dataset.v === sym)); $$(s, '.bl-choke .btn').forEach(x => x.classList.toggle('on', x.dataset.v === choke)); $(s, '.bl-d').value = d; dv(); build(); t = tt; return m; };

    const perch = (x, lane, col) => { const y = lane === 2 ? YS[2] + 28 : YS[lane] - 62; g.fillStyle = '#f6e6bc'; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.roundRect(x - 38, y, 76, 34, 5); g.fill(); g.stroke(); g.font = '600 12px Jost, sans-serif'; g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('perch', x, y + 18); };
    const pinch = (x, y) => { g.fillStyle = INK; g.fillRect(x - 5, y - 23, 10, 14); g.fillRect(x - 5, y + 9, 10, 14); };
    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      const rx = 890 + st.d * PXS, line = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; lanes.forEach(p => { g.beginPath(); p.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.stroke(); }); };
      g.fillStyle = INK; [[BX, 292], [rx, 292]].forEach(q => { g.beginPath(); g.arc(q[0], q[1], 58, 0, T.TAU); g.fill(); });
      line(46, INK); line(40, '#f4efe2');
      [[BX, '#dfe3fb'], [rx, '#f9dcd6']].forEach(([x, c]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 292, 55, 0, T.TAU); g.fill(); });
      if (st.choke === 'lane') YS.forEach(y => pinch(520, y)); else pinch(520, 292);
      perch(380, 0, C.blue); const pl = perchR(); if (pl >= 0) perch(660, pl, C.red);
      g.font = '600 13px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = C.blue; g.fillText('blue base', BX, 372); g.fillStyle = C.redDk; g.fillText('red base', rx, 372);
      g.fillStyle = C.muted; g.font = '500 12px Jost, sans-serif'; if (st.choke === 'lane') YS.forEach(y => g.fillText('choke', 520, y + 36)); else T.label('the only choke', 520, 344, 'center', C.muted, 12);
      // one round: both teams run their lanes, meet, and the round's three fights resolve
      const rd = rounds[ri], RUN = 2.9, tt = Math.min(t, RUN);
      lanes.forEach((p, l) => {
        const L = len(p), meet = L / 2, d = Math.min(meet - 16, tt / RUN * (meet - 16)), a = along(p, d), b = along(p, L - d);
        const done = t > RUN + .5, bw = rd.res[l];
        if (t > RUN && t < RUN + .5) { const mp = along(p, meet); T.flash(mp[0], mp[1], 30, .8 * (1 - (t - RUN) / .5)); }
        if (!done || bw) T.player(a[0], a[1], a[2], .6, 1, C.blue);
        if (!done || !bw) T.player(b[0], b[1], b[2] + Math.PI, .6, 1, C.red);
      });
      if (t > RUN + .6) T.popText(rd.w ? 'blue takes the round' : 'red takes the round', 520, 36, rd.w ? C.blue : C.redDk, clamp((t - RUN - .6) * 5));
      if (t > RUN + 2.4) { t = 0; ri = (ri + 1) % N; }
      // tally over all 200 rounds
      const x0 = 300, w = 440, y = 548; g.fillStyle = C.blue; g.fillRect(x0, y, w * m.p, 14); g.fillStyle = C.red; g.fillRect(x0 + w * m.p, y, w * (1 - m.p), 14);
      g.fillStyle = INK; g.fillRect(x0 + w / 2 - 1.5, y - 6, 3, 26);
      g.font = '600 13px Jost, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'right'; g.fillStyle = C.blue; g.fillText(`blue ${Math.round(m.p * 100)}%`, x0 - 12, y + 7); g.textAlign = 'left'; g.fillStyle = C.redDk; g.fillText(`red ${100 - Math.round(m.p * 100)}%`, x0 + w + 12, y + 7);
    };
  });
})();
