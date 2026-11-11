/* Dress the wall (The Level Design Book: Environment art)
   One street front after the blockout is settled: a wall, an open door, a blocked door and an enemy at range. The art
   pass adds detail on top. The book asks that the result still reads: as a place, as enemies you can see at a
   distance, and as a clear split between what is passable and what is not. Its tools are grouping detail into
   clusters, keeping material values close together, and reserving specific colours for things that matter.
   The first stat is measured from the drawn pixels: the colour distance between the enemy and the wall around it,
   divided by how much that wall varies. The squint (blur) switch is our own check; the book does not name one. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, GY = 430, MAXP = 60, EX = 540, EY = 438;
  let sd = 2024; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const PROPS = Array.from({ length: MAXP }, (_, i) => ({ type: i % 5, a: rnd(), b: rnd(), c: rnd(), d: rnd(), e: rnd(), f: rnd() }));
  const BR = Array.from({ length: 600 }, rnd), GR = Array.from({ length: 200 }, rnd);
  const MUTED = [[150, 130, 105], [120, 125, 120], [135, 140, 110], [160, 150, 135], [112, 106, 116]];
  const LOUD = [[214, 58, 48], [255, 140, 40], [40, 120, 220], [60, 170, 80], [240, 205, 50]];
  const SIGNAL = [255, 140, 40], FOE = [206, 52, 44];
  const rgb = (c, v = 0) => `rgb(${c.map(x => Math.round(clamp((x + v) / 255) * 255)).join(',')})`;
  const cv2 = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

  function enemy(x, col) { x.fillStyle = col; x.beginPath(); x.arc(EX, EY - 104, 15, 0, 7); x.fill(); x.beginPath(); x.roundRect(EX - 21, EY - 88, 42, 58, 10); x.fill(); x.fillRect(EX - 17, EY - 34, 13, 34); x.fillRect(EX + 4, EY - 34, 13, 34); x.fillRect(EX + 19, EY - 76, 34, 9); }

  canvasDemo('art', (s, cv, g) => {
    const st = { n: .7, group: 'scatter', con: .7, reserve: false, squint: false }; let m = {};
    const sc = cv2(), x = sc.getContext('2d', { willReadFrequently: true }), small = document.createElement('canvas'); small.width = 104; small.height = 59; const sg = small.getContext('2d');
    const mask = cv2(), mx = mask.getContext('2d', { willReadFrequently: true }); enemy(mx, '#000');
    const R = [440, 300, 200, 124], MASK = mx.getImageData(...R).data;
    function scene() {
      const spread = 15 + st.con * 85;
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#cfd9ea'; x.fillRect(0, 0, W, 70);
      x.fillStyle = rgb([176, 164, 146]); x.fillRect(0, 70, W, GY - 70);
      for (let r = 0, k = 0; r < 14; r++) for (let c = -1; c < 21; c++, k++) { const v = (BR[k % 600] - .5) * 2 * st.con * 62; x.fillStyle = rgb([176, 164, 146], v); x.fillRect(c * 52 + (r % 2) * 26 + 1, 70 + r * 26 + 1, 50, 24); }
      x.fillStyle = rgb([150, 142, 130]); x.fillRect(0, GY, W, H - GY);
      for (let r = 0, k = 0; r < 4; r++) for (let c = 0; c < 11; c++, k++) { x.fillStyle = rgb([150, 142, 130], (GR[k] - .5) * 2 * st.con * 40); x.fillRect(c * 100 - r * 14 + 1, GY + r * 40 + 1, 98, 38); }
      x.fillStyle = 'rgba(28,36,80,.5)'; x.fillRect(0, GY - 2, W, 4);
      // the art pass: props, scattered evenly or pulled into three clusters that leave the doors and the enemy clear
      const n = Math.round(st.n * MAXP), CX = [105, 392, 905]; let signal = 2, groups = new Set();
      const list = PROPS.slice(0, n).map(p => {
        const k = Math.floor(p.c * 3), ground = p.type === 2, cl = st.group === 'cluster'; groups.add(k);
        const px = cl ? CX[k] + (p.a - .5) * 110 : 20 + p.a * 1000, py = ground ? (cl ? 450 + p.b * 60 : 446 + p.b * 110) : (cl ? 240 + p.b * 150 : 96 + p.b * 290);
        const loud = !st.reserve && p.f < .55, li = Math.floor(p.d * 5); if (loud && li < 2) signal++;
        return { p, px, py, ground, col: loud ? rgb(LOUD[li]) : rgb(MUTED[li], (p.e - .5) * 2 * spread) };
      }).sort((a, b) => (a.ground - b.ground) || (a.py - b.py));
      list.forEach(({ p, px, py, col }) => {
        x.fillStyle = col; x.strokeStyle = 'rgba(28,36,80,.55)'; x.lineWidth = 2; x.beginPath();
        if (p.type === 0) x.rect(px - 16, py, 32, 42);                               // poster
        if (p.type === 1) x.rect(px - 5, py - 20, 10, 110);                          // pipe
        if (p.type === 2) x.rect(px - 24, py - 46, 48, 46);                          // crate
        if (p.type === 3) x.roundRect(px - 34, py, 68, 22, 4);                       // sign
        if (p.type === 4) x.ellipse(px, py + 14, 30, 16, 0, 0, 7);                   // stain
        x.fill(); if (p.type !== 4) x.stroke();
      });
      // open door: dark interior, frame in the signal colour
      x.fillStyle = rgb(SIGNAL); x.fillRect(232, 262, 106, GY - 262); x.fillStyle = '#23284a'; x.fillRect(242, 272, 86, GY - 272);
      x.fillStyle = 'rgba(255,236,190,.35)'; x.beginPath(); x.moveTo(242, GY); x.lineTo(328, GY); x.lineTo(300, GY - 46); x.lineTo(262, GY - 46); x.fill();
      // blocked door: boarded up and overgrown
      x.fillStyle = rgb([118, 112, 108]); x.fillRect(692, 262, 106, GY - 262); x.fillStyle = rgb([134, 108, 80]); x.fillRect(702, 272, 86, GY - 272);
      x.strokeStyle = rgb([96, 76, 56]); x.lineWidth = 12; x.beginPath(); x.moveTo(700, 290); x.lineTo(790, 410); x.moveTo(790, 290); x.lineTo(700, 410); x.moveTo(700, 350); x.lineTo(790, 350); x.stroke();
      x.fillStyle = rgb([82, 122, 78]); [[700, 268, 26], [730, 262, 20], [770, 272, 24], [694, 310, 16], [796, 300, 14]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
      enemy(x, rgb(FOE));
      // measure: enemy pixels against the wall pixels around them
      const D = x.getImageData(...R).data, e = [0, 0, 0], w = [0, 0, 0]; let ne = 0, nw = 0, vr = 0;
      for (let i = 0; i < D.length; i += 4) { const t = MASK[i + 3] > 128 ? e : w; t[0] += D[i]; t[1] += D[i + 1]; t[2] += D[i + 2]; MASK[i + 3] > 128 ? ne++ : nw++; }
      e.forEach((_, k) => { e[k] /= ne; w[k] /= nw; });
      for (let i = 0; i < D.length; i += 4) if (MASK[i + 3] <= 128) vr += (D[i] - w[0]) ** 2 + (D[i + 1] - w[1]) ** 2 + (D[i + 2] - w[2]) ** 2;
      const noise = Math.sqrt(vr / nw), ratio = Math.hypot(e[0] - w[0], e[1] - w[1], e[2] - w[2]) / Math.max(8, noise);
      sg.imageSmoothingQuality = 'high'; sg.clearRect(0, 0, 104, 59); sg.drawImage(sc, 0, 0, 104, 59);
      m = { ratio, n, groups: st.group === 'cluster' ? groups.size : n, signal };
      const reads = ratio >= 4.5, ok = ratio >= 2.8;
      say($(s, '.ar-stats'),
        `<div class="${reads ? 'g' : ok ? 'y' : 'r'}"><b>${ratio.toFixed(1)}×</b><span>enemy against the wall behind it, measured from the pixels</span></div>` +
        `<div><b>${n}</b><span>pieces of detail${n ? st.group === 'cluster' ? `, in ${groups.size} clusters` : ', each on its own' : ''}</span></div>` +
        `<div class="${signal > 2 ? 'y' : 'g'}"><b>${signal}</b><span>things wearing red or orange${signal === 2 ? ': the enemy and the open door' : ''}</span></div>`);
      say($(s, '.ar-out'), (!n && st.con < .15 ? '<b class="accent">The blockout.</b> Everything reads and nothing says where we are. The book’s art pass starts here and works from big shapes down to small ones, stopping about halfway to check it still plays.'
        : !ok ? '<b class="accent">Busy art hides the game.</b> Each brick and prop competes with the enemy for attention. The book’s advice: keep material values close, avoid deep saturation, and make sure enemies show at range.'
        : signal > 2 ? '<b class="accent">Which red matters?</b> The enemy shows, but posters and crates wear the same colours as the enemy and the open door. The book suggests reserving specific colours so they keep their meaning.'
        : st.group === 'scatter' && n > 12 ? '<b class="accent">Readable, and restless.</b> Detail spread evenly gives the eye no rest and no place to look. Pull it into clusters: the book leans on grouping so that dressed areas and plain ones set each other off.'
        : '<b class="accent">A place that still plays.</b> Calm surfaces, detail in clusters, and colour kept for the enemy and the door you can use. The boarded, overgrown door says “closed” from across the street.')
        + (st.squint ? ' Squinting is our check, not the book’s.' : ''));
    }
    const ui = () => { $(s, '.ar-nv').textContent = Math.round(st.n * MAXP) + ' pieces'; $(s, '.ar-cv').textContent = Math.round(st.con * 100) + '%'; };
    $(s, '.ar-n').oninput = e => { st.n = +e.target.value; ui(); scene(); };
    $(s, '.ar-c').oninput = e => { st.con = +e.target.value; ui(); scene(); };
    $$(s, '.ar-group .btn').forEach(b => b.onclick = () => { st.group = b.dataset.v; $$(s, '.ar-group .btn').forEach(q => q.classList.toggle('on', q === b)); scene(); });
    $(s, '.ar-res').onchange = e => { st.reserve = e.target.checked; scene(); };
    $(s, '.ar-sq').onchange = e => { st.squint = e.target.checked; scene(); };
    ui(); scene();
    window.__artSet = o => { Object.assign(st, o); $(s, '.ar-n').value = st.n; $(s, '.ar-c').value = st.con; $$(s, '.ar-group .btn').forEach(q => q.classList.toggle('on', q.dataset.v === st.group)); $(s, '.ar-res').checked = st.reserve; $(s, '.ar-sq').checked = st.squint; ui(); scene(); return m; };

    return () => {
      T.use(g); g.clearRect(0, 0, W, H);
      g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
      if (st.squint) { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(small, 0, 0, 104, 59, 0, 0, W, H); } else g.drawImage(sc, 0, 0);
      g.restore();
      T.label('open door', 285, 562, 'center', C.goldInk, 13); T.label('enemy at range', EX, 562, 'center', C.redDk, 13); T.label('blocked door', 745, 562, 'center', C.muted, 13);
      if (st.squint) T.label('squinting', 70, 30, 'center', C.muted, 13);
    };
  });
})();
