/* Make one mass the landmark (The Level Design Book: Massing, Composition)
   A town blockout of 25 plain masses on a grid, drawn in axonometric. The middle one is meant to be the landmark.
   The book builds hierarchy from contrast in height, spread, orientation and shape, and says contrast is local: a
   mass only stands out against the masses next to it. So every test here compares the tower with its eight nearest
   neighbours. The plan inset checks the book's other condition, that a landmark is useful: from how many street
   corners can a player see its top over the roofs? Thresholds (1.5 times taller, 7 of 8 different) are ours. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, INK = '#1c2450', OX = 560, OY = 96, A = 40, B = 20, CZ = 36, ST = .5, EYE = .25;
  const pr = (u, v, h = 0) => [OX + (u - v) * A, OY + (u + v) * B - h * CZ];
  // fixed per-building random numbers, so the variety slider only scales them
  let sd = 77; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const NB = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (i !== 2 || j !== 2) NB.push({ u: i * 2, v: j * 2, r: [rnd(), rnd(), rnd()], ring: Math.max(Math.abs(i - 2), Math.abs(j - 2)) });
  const SPOTS = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) SPOTS.push([1 + i * 2, 1 + j * 2]);
  const HERO = { u: 4, v: 4 };
  const foot = m => { const n = m.round ? 18 : 4, a0 = m.round ? 0 : (m.turn ? 0 : Math.PI / 4), r = m.round ? m.w : m.w * Math.SQRT2; return Array.from({ length: n }, (_, k) => [m.u + r * Math.cos(a0 + k * 2 * Math.PI / n), m.v + r * Math.sin(a0 + k * 2 * Math.PI / n)]); };
  const inPoly = (p, x, y) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };

  canvasDemo('massing', (s, cv, g) => {
    const st = { h: 2, turn: false, round: false, plaza: false, vary: 0 }; let masses = [], hero = null, seen = [], m = {};
    function build() {
      hero = { ...HERO, w: .65, h: st.h * ST, turn: st.turn, round: st.round, hero: true };
      masses = NB.filter(n => !(st.plaza && n.ring === 1)).map(n => ({ u: n.u, v: n.v, w: .65, ring: n.ring, h: Math.max(1, Math.round(2 + st.vary * (n.r[0] * 7 - 1.5))) * ST, turn: n.r[1] < (st.vary - .25) * .75, round: n.r[2] < (st.vary - .25) * .75 }));
      masses.forEach(x => x.poly = foot(x)); hero.poly = foot(hero);
      const d = x => Math.hypot(x.u - 4, x.v - 4), near = masses.slice().sort((a, b) => d(a) - d(b)).slice(0, 8);
      const tall = Math.max(...near.map(x => x.h)), gap = d(near[0]) - 1.3;
      const wins = { height: hero.h >= tall * 1.5, turn: near.filter(x => x.turn !== hero.turn).length >= 7, shape: near.filter(x => x.round !== hero.round).length >= 7, space: gap >= 1.4 };
      // can a player at each street corner see the top of the tower over the roofs in between?
      seen = SPOTS.map(([x, y]) => { for (let k = 1; k < 40; k++) { const f = k / 40, px = x + (4 - x) * f, py = y + (4 - y) * f, lh = EYE + (hero.h - EYE) * f; if (masses.some(b => b.h > lh && inPoly(b.poly, px, py))) return false; } return true; });
      const n = Object.values(wins).filter(Boolean).length, vis = seen.filter(Boolean).length;
      m = { n, vis, wins, tall: tall / ST, gap };
      const reads = n >= 2 && vis >= 10;
      say($(s, '.ms-stats'),
        `<div class="${n >= 2 ? 'g' : n ? 'y' : 'r'}"><b>${n}/4</b><span>contrasts won against its eight neighbours${n ? ': ' + [['height', 'height'], ['turn', 'orientation'], ['shape', 'shape'], ['space', 'spread']].filter(x => wins[x[0]]).map(x => x[1]).join(', ') : ''}</span></div>` +
        `<div><b>${st.h} · ${m.tall}</b><span>storeys: tower · tallest neighbour</span></div>` +
        `<div class="${vis >= 10 ? 'g' : vis >= 5 ? 'y' : 'r'}"><b>${vis}/16</b><span>street corners that see its top</span></div>`);
      say($(s, '.ms-out'),
        !n && st.vary > .5 ? '<b class="accent">Everything differs, so nothing does.</b> Each mass is its own height, shape and angle, and the eye has nowhere to settle. The book’s warning about fragmented massing: variety everywhere works like camouflage.'
        : !n ? '<b class="accent">A mass among equals.</b> Nothing separates the tower from the eight masses around it, so the town has no centre. Hierarchy needs a contrast: height, spread, orientation or shape.'
        : st.vary > .5 && n < 2 ? '<b class="accent">Contrast is local.</b> The tower’s one difference is being matched by its neighbours. Calm the town down or stack a second contrast on the tower.'
        : n >= 2 && vis < 10 ? '<b class="accent">Distinct, but hidden.</b> The tower wins on paper, yet few street corners can see it. The book wants a landmark to be useful: something players steer by. Raise it.'
        : reads ? `<b class="accent">The landmark reads.</b> ${n} contrasts stacked, and most of the town can see it and steer by it. No detail was needed: these are still plain boxes.`
        : '<b class="accent">One contrast is a start.</b> The tower differs in one way. The book treats hierarchy as stacking: a second contrast makes the difference look meant.');
    }
    const ui = () => { $(s, '.ms-hv').textContent = st.h + ' storeys'; $(s, '.ms-vv').textContent = Math.round(st.vary * 100) + '%'; };
    $(s, '.ms-h').oninput = e => { st.h = +e.target.value; ui(); build(); };
    $(s, '.ms-v').oninput = e => { st.vary = +e.target.value; ui(); build(); };
    [['turn', '.ms-turn'], ['round', '.ms-round'], ['plaza', '.ms-plaza']].forEach(([k, c]) => $(s, c).onchange = e => { st[k] = e.target.checked; build(); });
    ui(); build();
    window.__massSet = o => { Object.assign(st, o); $(s, '.ms-h').value = st.h; $(s, '.ms-v').value = st.vary; $(s, '.ms-turn').checked = st.turn; $(s, '.ms-round').checked = st.round; $(s, '.ms-plaza').checked = st.plaza; ui(); build(); return m; };

    function prism(b) {
      const p = b.poly, n = p.length, top = p.map(q => pr(q[0], q[1], b.h)), bot = p.map(q => pr(q[0], q[1], 0));
      const base = b.hero ? [246, 214, 150] : [222, 214, 196];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, nx = (p[i][0] + p[j][0]) / 2 - b.u, ny = (p[i][1] + p[j][1]) / 2 - b.v, len = Math.hypot(nx, ny);
        if (nx + ny <= 0) continue;                                   // faces pointing away from the viewer
        const k = .78 - .2 * (nx - ny) / len; g.fillStyle = `rgb(${base.map(c => Math.round(c * k)).join(',')})`;
        g.beginPath(); g.moveTo(...top[i]); g.lineTo(...top[j]); g.lineTo(...bot[j]); g.lineTo(...bot[i]); g.closePath(); g.fill(); if (n <= 4) { g.stroke(); } else { g.strokeStyle = g.fillStyle; g.stroke(); g.strokeStyle = INK; }
      }
      if (n > 4) { const xs = top.map(q => q[0]), l = xs.indexOf(Math.min(...xs)), r = xs.indexOf(Math.max(...xs)); g.beginPath(); g.moveTo(...top[l]); g.lineTo(...bot[l]); g.moveTo(...top[r]); g.lineTo(...bot[r]); g.stroke(); g.beginPath(); bot.forEach((q, i) => { const mx = p[i][0] - b.u + p[i][1] - b.v; if (mx > -.2) g.lineTo(...q); }); g.stroke(); }
      g.fillStyle = `rgb(${base.join(',')})`; g.beginPath(); top.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.fill(); g.stroke();
    }
    return () => {
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      // ground
      g.fillStyle = '#efe8d6'; g.strokeStyle = 'rgba(28,36,80,.25)'; g.lineWidth = 1.5; g.beginPath(); [[-1.2, -1.2], [9.2, -1.2], [9.2, 9.2], [-1.2, 9.2]].forEach((q, i) => { const a = pr(...q); i ? g.lineTo(...a) : g.moveTo(...a); }); g.closePath(); g.fill(); g.stroke();
      if (st.plaza) { g.fillStyle = 'rgba(255,185,81,.22)'; g.beginPath(); [[1.2, 1.2], [6.8, 1.2], [6.8, 6.8], [1.2, 6.8]].forEach((q, i) => { const a = pr(...q); i ? g.lineTo(...a) : g.moveTo(...a); }); g.closePath(); g.fill(); }
      g.strokeStyle = INK; g.lineWidth = 2; g.lineJoin = 'round';
      [...masses, hero].sort((a, b) => (a.u + a.v) - (b.u + b.v)).forEach(prism);
      const tp = pr(4, 4, hero.h); T.label('the tower', tp[0], Math.max(22, tp[1] - 34), 'center', C.goldInk, 13);
      // plan inset: which street corners see the top of the tower
      const ix = 24, iy = 372, k = 17, q = (u, v) => [ix + 12 + (u + 1) * k, iy + 12 + (v + 1) * k];
      g.fillStyle = 'rgba(255,252,244,.95)'; g.strokeStyle = 'rgba(28,36,80,.3)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(ix, iy, 194, 194, 10); g.fill(); g.stroke();
      [...masses, hero].forEach(b => { g.fillStyle = b.hero ? C.gold : '#cfc6ad'; g.beginPath(); b.poly.forEach((c, i) => { const a = q(...c); i ? g.lineTo(...a) : g.moveTo(...a); }); g.closePath(); g.fill(); });
      SPOTS.forEach((c, i) => { const a = q(...c); if (seen[i]) { g.strokeStyle = 'rgba(85,98,235,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...a); g.lineTo(...q(4, 4)); g.stroke(); } g.fillStyle = seen[i] ? C.blue : 'rgba(93,97,140,.45)'; g.beginPath(); g.arc(a[0], a[1], 4.5, 0, T.TAU); g.fill(); });
      g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('plan · blue corners see the tower top', ix, iy - 8);
    };
  });
})();
