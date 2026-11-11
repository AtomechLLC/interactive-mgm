/* Three floors, six links (The Level Design Book: Verticality, Circulation)
   A side view of three floor planes, which the book gives as the most a map usually tracks. Six links can be switched on:
   stairs (two-way, and they take floor space), a ladder (two-way, small, slow), two drops (one-way, free, fast) and a
   jump pad (one-way up). The walker tours bottom, middle, top and back, taking the route with the fewest links.
   Stats are computed from the link graph and the walked paths: which floors reach which, how long the climb and the
   descent take, and how many floor tiles the links occupy (26 px is one tile). Speeds are ours. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, INK = '#1c2450', TILE = 26;
  const FL = { B: { y: 470, x0: 60, x1: 980, name: 'bottom', home: 420 }, M: { y: 330, x0: 300, x1: 980, name: 'middle', home: 620 }, Tp: { y: 190, x0: 690, x1: 900, name: 'top', home: 760 } };
  const arc = (a, c, b, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
  const LINKS = [
    { id: 'sBM', name: 'Stairs: bottom ↔ middle', a: 'B', b: 'M', two: true, tiles: 5, spd: 110, pts: [[170, 470], [300, 330]], kind: 'stairs' },
    { id: 'sMT', name: 'Stairs: middle ↔ top', a: 'M', b: 'Tp', two: true, tiles: 5, spd: 110, pts: [[560, 330], [690, 190]], kind: 'stairs' },
    { id: 'lMT', name: 'Ladder: middle ↔ top', a: 'M', b: 'Tp', two: true, tiles: 1, spd: 60, pts: [[800, 330], [800, 190]], kind: 'ladder' },
    { id: 'dTM', name: 'Drop: top → middle', a: 'Tp', b: 'M', two: false, tiles: 0, spd: 430, pts: [[900, 190], [926, 205], [926, 330]], kind: 'drop' },
    { id: 'dMB', name: 'Drop: middle → bottom', a: 'M', b: 'B', two: false, tiles: 1, spd: 430, pts: [[470, 330], [470, 470]], kind: 'drop' },
    { id: 'pBT', name: 'Jump pad: bottom → top', a: 'B', b: 'Tp', two: false, tiles: 1, spd: 400, pts: arc([110, 470], [400, -60], [720, 190]), kind: 'pad' },
  ];
  const IDS = ['B', 'M', 'Tp'];

  canvasDemo('floors', (s, cv, g) => {
    const on = new Set(['sBM']); let t = 0, sim = null;
    const box = $(s, '.fl-links');
    box.innerHTML = LINKS.map(l => `<label class="chk"><input type="checkbox" data-k="${l.id}"${on.has(l.id) ? ' checked' : ''}> ${l.name}</label>`).join('');
    // fewest-links route from floor a to floor b over the links that are switched on
    function route(a, b) {
      const prev = { [a]: null }, q = [a];
      while (q.length) { const n = q.shift(); if (n === b) break; LINKS.forEach(l => { if (!on.has(l.id)) return; [[l.a, l.b, false], l.two ? [l.b, l.a, true] : null].forEach(e => { if (e && e[0] === n && !(e[1] in prev)) { prev[e[1]] = { l, rev: e[2], from: n }; q.push(e[1]); } }); }); }
      if (!(b in prev)) return null; const out = []; for (let n = b; prev[n]; n = prev[n].from) out.unshift(prev[n]); return out;
    }
    function walk(path, steps) { steps.forEach(({ l, rev }) => { const pts = rev ? l.pts.slice().reverse() : l.pts; path.go(pts[0][0], pts[0][1], 170); pts.slice(1).forEach(p => path.go(p[0], p[1], l.spd)); }); }
    const timeOf = (a, b) => { const r = route(a, b); if (!r) return null; const p = T.Path([FL[a].home, FL[a].y], 170); walk(p, r); p.go(FL[b].home, FL[b].y, 170); return p.t; };
    function run() {
      const path = T.Path([FL.B.home, FL.B.y], 170), ev = []; let at = 'B';
      ['M', 'Tp', 'B', 'Tp', 'B'].forEach(to => {
        if (to === at) return; const r = route(at, to);
        if (!r) { ev.push({ t: path.t, text: `no way ${FL[to].y < FL[at].y ? 'up' : 'down'} to the ${FL[to].name}`, col: C.redDk }); path.wait(1.3); return; }
        walk(path, r); path.go(FL[to].home, FL[to].y, 170); path.wait(.5); at = to;
      });
      let reach = 0; IDS.forEach(a => IDS.forEach(b => { if (a !== b && route(a, b)) reach++; }));
      const tiles = LINKS.filter(l => on.has(l.id)).reduce((m, l) => m + l.tiles, 0), oneWay = LINKS.filter(l => on.has(l.id) && !l.two).length, up = timeOf('B', 'Tp'), down = timeOf('Tp', 'B');
      sim = { path, ev, end: path.t }; t = 0;
      say($(s, '.fl-stats'),
        `<div class="${reach === 6 ? 'g' : reach >= 3 ? 'y' : 'r'}"><b>${reach}/6</b><span>floor-to-floor trips that are possible</span></div>` +
        `<div><b>${up ? up.toFixed(0) + 's' : '–'} · ${down ? down.toFixed(0) + 's' : '–'}</b><span>bottom up to the top · top back down (– means no route)</span></div>` +
        `<div class="${tiles > 10 ? 'y' : ''}"><b>${tiles}</b><span>floor tiles taken up by links, ${oneWay} of them one-way</span></div>`);
      const stairsOnly = [...on].every(k => k[0] === 's') && on.size;
      say($(s, '.fl-out'), !on.size ? 'Three floors with nothing joining them are three separate maps. Switch a link on.'
        : reach < 6 && oneWay && !up ? '<b class="accent">Down is free, up has to be built.</b> A drop costs no floor and takes a second, but nothing here leads back up, so every drop is a door that locks behind the player.'
        : reach < 6 ? '<b class="accent">Some floors are cut off.</b> Count the trips: a floor nobody can reach is wasted work, and a floor nobody can leave is a trap unless you mean it as a one-way commitment.'
        : stairsOnly ? '<b class="accent">Everything joined, all of it two-way.</b> Safe and easy to read, and expensive: each staircase eats five tiles of floor, and the trip down is as slow as the trip up.'
        : on.has('pBT') ? '<b class="accent">Up fast, down fast.</b> Jump pads and drops make height cheap to cross, as in Quake 3’s The Longest Yard, which the book notes balances them with sparse cover. The book’s caution: constant height changes are hard on games about precise aim.'
        : '<b class="accent">Climb slowly, come down fast.</b> The book calls downward flow heavier than upward: the drop commits the player in one move, while the way up needs space reserved for stairs or a ladder. Together they make a loop.');
    }
    $$(box, 'input').forEach(i => i.onchange = () => { i.checked ? on.add(i.dataset.k) : on.delete(i.dataset.k); run(); });
    $(s, '.fl-replay').onclick = () => { t = 0; };
    run();
    window.__floorsSet = (keys, tt = 0) => { on.clear(); keys.forEach(k => on.add(k)); $$(box, 'input').forEach(i => i.checked = on.has(i.dataset.k)); run(); t = tt; };

    function drawLink(l, live) {
      const a = live ? 1 : .16, [p, q] = [l.pts[0], l.pts[l.pts.length - 1]];
      g.save(); g.globalAlpha = a; g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 3; g.lineCap = 'butt';
      if (l.kind === 'stairs') { const n = 7; g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 0; i < n; i++) { const x = p[0] + (q[0] - p[0]) * (i + 1) / n, y0 = p[1] + (q[1] - p[1]) * i / n, y1 = p[1] + (q[1] - p[1]) * (i + 1) / n; g.lineTo(p[0] + (q[0] - p[0]) * i / n, y1); g.lineTo(x, y1); } g.lineTo(q[0], p[1]); g.closePath(); g.fillStyle = live ? '#cfc6ad' : '#e6dfcc'; g.fill(); g.stroke(); }
      if (l.kind === 'ladder') { g.beginPath(); g.moveTo(p[0] - 9, p[1]); g.lineTo(q[0] - 9, q[1] - 6); g.moveTo(p[0] + 9, p[1]); g.lineTo(q[0] + 9, q[1] - 6); for (let y = p[1] - 12; y > q[1]; y -= 16) { g.moveTo(p[0] - 9, y); g.lineTo(p[0] + 9, y); } g.stroke(); }
      if (l.kind === 'drop') { g.setLineDash([6, 6]); g.strokeStyle = C.redDk; g.beginPath(); l.pts.forEach((v, i) => i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1])); g.stroke(); g.setLineDash([]); g.fillStyle = C.redDk; g.beginPath(); g.moveTo(q[0] - 8, q[1] - 22); g.lineTo(q[0] + 8, q[1] - 22); g.lineTo(q[0], q[1] - 8); g.fill(); }
      if (l.kind === 'pad') { g.setLineDash([4, 8]); g.strokeStyle = C.blue; g.beginPath(); l.pts.forEach((v, i) => i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1])); g.stroke(); g.setLineDash([]); g.fillStyle = C.blue; g.beginPath(); g.roundRect(p[0] - 22, p[1] - 8, 44, 8, 3); g.fill(); }
      g.restore();
    }
    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      // slabs: the three floor planes, with a hole in the middle floor and a hatch in the top one when those links are on
      const gaps = { M: on.has('dMB') ? [[448, 492]] : [], Tp: on.has('lMT') ? [[786, 814]] : [], B: [] };
      Object.entries(FL).forEach(([k, f]) => {
        let x = f.x0; g.fillStyle = INK; [...gaps[k], [f.x1, f.x1]].forEach(([a, b]) => { g.fillRect(x, f.y, a - x, 14); x = b; });
        g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(f.name + ' floor', f.x1 - 8, f.y + 30);
      });
      g.fillStyle = INK; g.fillRect(980, 150, 14, 334);                      // the back wall the floors hang off
      LINKS.forEach(l => drawLink(l, on.has(l.id)));
      g.font = '500 12px Jost, sans-serif'; g.textAlign = 'center'; g.fillStyle = C.muted;
      LINKS.forEach(l => { if (!on.has(l.id)) return; const m = l.pts[Math.floor(l.pts.length / 2)]; const lab = { stairs: 'stairs', ladder: 'ladder', drop: 'drop', pad: 'jump pad' }[l.kind]; g.fillText(lab, m[0] + (l.kind === 'stairs' ? -46 : l.kind === 'pad' ? 0 : 34), m[1] + (l.kind === 'pad' ? -14 : l.kind === 'stairs' ? -30 : 0)); });
      const p = sim.path.at(t); T.player(p.x, p.y - 20, p.face, .8);
      sim.ev.forEach(e => { const a = clamp(1.4 - (t - e.t)) * clamp((t - e.t) * 6); if (t >= e.t && a > 0) T.popText(e.text, clamp(sim.path.at(e.t).x, 180, 860), sim.path.at(e.t).y - 70, e.col, a); });
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('side view · the walker tours bottom, middle, top, bottom, top, bottom', 20, H - 14);
      if (t > sim.end + 2) t = 0;
    };
  });
})();
