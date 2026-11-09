/* Climb to see, glide to reach (genre breakdown: "How to Design an Open-World Game?").
   A heightmap with four landmarks. From where the player stands, a landmark shows when the straight line from the
   player's eye to its top clears the terrain; the ridge in the middle is a natural divider that hides the east.
   The player's verbs set what is reachable: walking climbs one step at a time and drops two, climbing takes any
   slope, and gliding covers 5 cells per step of height lost, so a high place is a launch pad. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const COLS = 40, ROWS = 18, CS = 24, OX = 40, OY = 16, EYE = .6, GLIDE = 5;
  // the map: a valley (west), a lake with an island, a ridge down the middle, a plain and a mountain (east)
  const H = [];
  (function build() {
    const r = GK.rng(5);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const e = (a, b) => Math.exp(-a - b);
      let h = 2 + .03 * x;
      h += 5.5 * Math.exp(-(((x - 21) / 1.2) ** 2));
      h += 4.5 * e((x - 33) ** 2 / 14, (y - 4) ** 2 / 10);
      h += 2.6 * e((x - 5) ** 2 / 10, (y - 6) ** 2 / 8);
      h -= 4.5 * e((x - 13) ** 2 / 14, (y - 12) ** 2 / 8);
      h += 5.2 * e((x - 13) ** 2 / 1, (y - 12) ** 2 / 1);
      h += (r() - .5) * .5;
      H.push(clamp(Math.round(h), 0, 7));
    }
  })();
  const h = (x, y) => H[y * COLS + x], water = (x, y) => h(x, y) === 0;
  const LM = [
    { x: 5, y: 6, up: 2, name: 'Great tree', kind: 'tree' },
    { x: 13, y: 12, up: 1.2, name: 'Ruins', kind: 'ruin' },
    { x: 36, y: 12, up: 4, name: 'Tower', kind: 'tower' },
    { x: 33, y: 4, up: .6, name: 'Peak', kind: 'peak' },
  ];
  // line of sight over the terrain from (ax, ay, az) to (bx, by, bz); returns the blocking cell or null
  function blocked(ax, ay, az, bx, by, bz) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d * 4);
    for (let i = 1; i < n; i++) {
      const k = i / n, cx = Math.round(lerp(ax, bx, k)), cy = Math.round(lerp(ay, by, k));
      if ((cx === Math.round(ax) && cy === Math.round(ay)) || (cx === bx && cy === by)) continue;
      if (h(cx, cy) > lerp(az, bz, k)) return [cx, cy];
    }
    return null;
  }
  // reachable cells from (sx, sy) with the chosen verbs
  const RC = {};
  function reach(sx, sy, climb, glide) {
    const key = `${sx},${sy},${climb},${glide}`; if (RC[key]) return RC[key];
    const seen = new Uint8Array(COLS * ROWS), q = [[sx, sy]]; seen[sy * COLS + sx] = 1;
    const add = (x, y) => { const i = y * COLS + x; if (!seen[i] && !water(x, y)) { seen[i] = 1; q.push([x, y]); } };
    while (q.length) {
      const [x, y] = q.shift(), hs = h(x, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const dh = h(nx, ny) - hs; if (climb || (dh <= 1 && dh >= -2)) add(nx, ny);
      }
      if (glide && hs >= 2) for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
        const ht = h(tx, ty); if (seen[ty * COLS + tx] || ht === 0 || ht >= hs) continue;
        const d = Math.hypot(tx - x, ty - y); if (d > GLIDE * (hs - ht) || d < 1.5) continue;
        if (!blocked(x, y, hs + .3, tx, ty, ht)) add(tx, ty);
      }
    }
    let n = 0; seen.forEach(v => n += v);
    const land = H.filter(v => v > 0).length;
    return (RC[key] = { seen, pct: n / land });
  }
  const VS = {};
  function viewshed(px, py) {
    const key = `${px},${py}`; if (VS[key]) return VS[key];
    const eye = h(px, py) + EYE, v = new Uint8Array(COLS * ROWS);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) v[y * COLS + x] = blocked(px, py, eye, x, y, h(x, y) + .05) ? 0 : 1;
    return (VS[key] = v);
  }
  const HC = ['#3f74c9', '#d9e8b0', '#b4d68a', '#93c06e', '#6f9c55', '#8a7f66', '#6e6656', '#f4f1ea'];
  const cx = x => OX + x * CS + CS / 2, cy = y => OY + y * CS + CS / 2;

  function drawLM(g, l, seen) {
    const x = cx(l.x), y = cy(l.y);
    g.globalAlpha = seen ? 1 : .55;
    if (l.kind === 'tree') { g.fillStyle = '#6b4a2b'; g.fillRect(x - 3, y - 4, 6, 14); g.fillStyle = '#2f7a3a'; g.beginPath(); g.arc(x, y - 10, 13, 0, 7); g.fill(); }
    if (l.kind === 'ruin') { g.fillStyle = '#9a8f80'; [-9, 0, 9].forEach((d, i) => g.fillRect(x + d - 3, y - 14 + i % 2 * 6, 6, 20 - i % 2 * 6)); g.fillRect(x - 13, y - 16, 26, 4); }
    if (l.kind === 'tower') { g.fillStyle = C.wall; g.fillRect(x - 7, y - 30, 14, 40); g.fillStyle = C.redDk; g.beginPath(); g.moveTo(x - 11, y - 30); g.lineTo(x, y - 44); g.lineTo(x + 11, y - 30); g.fill(); }
    if (l.kind === 'peak') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 12, y + 6); g.lineTo(x, y - 12); g.lineTo(x + 12, y + 6); g.fill(); g.strokeStyle = C.stoneDk; g.lineWidth = 2; g.stroke(); }
    g.globalAlpha = 1;
    TD.label(l.name, x, y + 24, 'center', seen ? C.ink : C.muted, 12);
  }

  GK.scene('sight', (s, g, ui) => {
    const bC = s.querySelector('.ow-climb'), bG = s.querySelector('.ow-glide'); ui.watch(bC, bG);
    const st = { x: 4, y: 9, climb: false, glide: false };
    bC.onclick = () => { st.climb = !st.climb; }; bG.onclick = () => { st.glide = !st.glide; };
    const cv = g.canvas;
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * cv.width / r.width, my = (e.clientY - r.top) * cv.height / r.height;
      const x = Math.floor((mx - OX) / CS), y = Math.floor((my - OY) / CS);
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
      ui.stopTour();
      if (reach(st.x, st.y, st.climb, st.glide).seen[y * COLS + x]) { st.x = x; st.y = y; }
    });
    // walk-through: [time, x, y, climb, glide, caption]
    const ACTS = [
      { to: 5, path: [[4, 9]], climb: false, glide: false, say: 'Walking only: the ridge is too steep and the lake too wide. Two landmarks in view.' },
      { to: 11, path: [[4, 9], [5, 6], [13, 12]], fly: 1, climb: false, glide: true, say: 'Add a glider: climb the hill on foot and glide out to the island.' },
      { to: 17, path: [[13, 12], [17, 12], [19, 11], [21, 10]], fly: 0, climb: true, glide: true, say: 'Add climbing: glide off the island, scale the ridge, and the tower and the peak come into view.' },
      { to: 23, path: [[21, 10], [34, 12]], fly: 0, climb: true, glide: true, say: 'From the ridge top, one glide crosses the whole plain toward the tower.' },
      { to: 29, path: [[34, 12], [33, 5], [33, 4]], climb: true, glide: true, say: 'From the peak, three of four: a tall place is a goal and a map, yet the ridge still hides the low ruins.' },
    ];
    return {
      dur: 29,
      frame(t, tour) {
        let px = st.x, py = st.y;
        if (tour) {
          const [a, k] = GK.act(ACTS, t), p = a.path, seg = Math.min(p.length - 1, k * 1.4 * (p.length - 1));
          const i = Math.min(p.length - 2, Math.floor(seg)), kk = p.length > 1 ? clamp(seg - i) : 0;
          px = p.length > 1 ? lerp(p[i][0], p[i + 1][0], kk) : p[0][0]; py = p.length > 1 ? lerp(p[i][1], p[i + 1][1], kk) : p[0][1];
          st.climb = a.climb; st.glide = a.glide; if (!water(Math.round(px), Math.round(py))) { st.x = Math.round(px); st.y = Math.round(py); } st.say = a.say;
          st.fly = a.fly === i && seg < p.length - 1 && seg > 0;
        } else { st.say = null; st.fly = false; }
        bC.classList.toggle('on', st.climb); bG.classList.toggle('on', st.glide);
        const R = reach(st.x, st.y, st.climb, st.glide), V = viewshed(st.x, st.y);
        GK.panel(g);
        // terrain
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const v = h(x, y); g.fillStyle = HC[v]; g.fillRect(OX + x * CS, OY + y * CS, CS, CS);
          if (v > 0) { g.fillStyle = 'rgba(0,0,0,.08)'; if (x + 1 < COLS && h(x + 1, y) < v) g.fillRect(OX + x * CS + CS - 3, OY + y * CS, 3, CS); if (y + 1 < ROWS && h(x, y + 1) < v) g.fillRect(OX + x * CS, OY + y * CS + CS - 3, CS, 3); }
          if (!V[y * COLS + x]) { g.fillStyle = 'rgba(255,252,244,.55)'; g.fillRect(OX + x * CS, OY + y * CS, CS, CS); }
          if (v > 0 && !R.seen[y * COLS + x]) {
            g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 1.5; g.beginPath();
            g.moveTo(OX + x * CS, OY + y * CS + CS); g.lineTo(OX + x * CS + CS, OY + y * CS); g.stroke();
          }
        }
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.strokeRect(OX, OY, COLS * CS, ROWS * CS);
        // sight lines
        const eye = h(st.x, st.y) + EYE;
        const seen = LM.map(l => {
          const b = blocked(st.x, st.y, eye, l.x, l.y, h(l.x, l.y) + l.up);
          if (b) { GK.line(g, [[cx(px), cy(py)], [cx(b[0]), cy(b[1])]], 'rgba(93,97,140,.6)', 2, [5, 5]); g.strokeStyle = C.redDk; g.lineWidth = 2.5; const X = cx(b[0]), Y = cy(b[1]); g.beginPath(); g.moveTo(X - 5, Y - 5); g.lineTo(X + 5, Y + 5); g.moveTo(X + 5, Y - 5); g.lineTo(X - 5, Y + 5); g.stroke(); }
          else GK.line(g, [[cx(px), cy(py)], [cx(l.x), cy(l.y) - 10]], C.gold, 3);
          return !b;
        });
        LM.forEach((l, i) => drawLM(g, l, seen[i]));
        if (st.fly) { const X = cx(px), Y = cy(py); g.fillStyle = C.purple; g.beginPath(); g.moveTo(X - 22, Y - 6); g.quadraticCurveTo(X, Y - 38, X + 22, Y - 6); g.quadraticCurveTo(X, Y - 22, X - 22, Y - 6); g.fill(); }
        TD.player(cx(px), cy(py), 0, .7);
        if (st.say) TD.label(st.say, 520, 40, 'center', C.navy, 14);
        // readouts
        const nSeen = seen.filter(Boolean).length;
        GK.big(g, `${nSeen} of 4`, 'landmarks in view', 40, 490, nSeen > 2 ? C.good : C.ink);
        GK.big(g, `${Math.floor(R.pct * 100)}%`, 'of the land reachable', 200, 490, R.pct > .9 ? C.good : C.ink);
        GK.big(g, `${h(st.x, st.y)}`, 'height you stand on', 380, 490);
        GK.wrap(g, 'Pale cells are out of view; hatched cells are out of reach. Gold lines reach a landmark; dashed ones stop at the ✕ where terrain blocks them.', 560, 482, 440, 19, C.ink, 14);
        ui.stats(`<div><b>${nSeen}/4</b><span>landmarks in view</span></div><div class="g"><b>${Math.floor(R.pct * 100)}%</b><span>land reachable</span></div>`);
        ui.out(st.climb && st.glide ? 'Climb plus glide: every high point is now a launch pad, so the ridge stops dividing the map.'
          : st.climb ? 'Climbing opens the ridge, and the view from its top pulls you east.'
          : st.glide ? 'Gliding turns height into distance: the gentle side of the ridge reaches the island.'
          : 'On foot, the ridge is a natural divider: it hides the east and blocks the way.');
      },
    };
  });
})();
