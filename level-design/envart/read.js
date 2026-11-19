/* Find the enemy (The Level Design Book: Environment art, "Readability")
   The same street in three treatments: the blockout, a busy art pass (dark, high-contrast brick, saturated clutter)
   and a calm one (close values, brighter walls, quiet props). The book's example is de_cache in CS:GO, which moved from
   the second kind to the third. Start a round and click each enemy as it steps out; the slide keeps your times.
   The first stat needs no player: it is measured from the drawn pixels, as the colour distance between each enemy and
   the backdrop around it, divided by how much that backdrop varies. The click test and that measure are our own. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit, E = EA, W = E.W, H = E.H, GY = E.GY;
  const FOE = [356, 46, 34], NAMES = { block: 'Blockout', busy: 'Busy art pass', calm: 'Calm art pass' };
  // where an enemy can stand: x, ground y, scale. Each faces the middle of the street, where the player is.
  const SLOTS = [[70, GY + 26, .86], [232, GY + 62, .98], [372, GY + 22, .84], [604, GY + 30, .86], [800, GY + 70, 1], [968, GY + 28, .86]];
  function draw(g, mode) {
    if (mode === 'block') { E.street(g, { d: 0 }); return; }
    const busy = mode === 'busy';
    E.street(g, busy ? { d: 3, red: true, noise: .95, wallL: -27, groundL: 40, groundNoise: 26 } : { d: 3, red: false, groundL: 56 });
    if (!busy) return;
    // the busy pass: more saturated clutter on every wall, and hard shadow under every ledge
    const r = E.rng(41), C = [[4, 70, 46], [22, 84, 52], [46, 86, 54], [200, 66, 40], [140, 50, 36], [350, 60, 40]];
    for (let i = 0; i < 26; i++) { const c = C[Math.floor(r() * C.length)], x = 14 + r() * (W - 60), y = GY - 60 - r() * 250; r() < .7 ? E.poster(g, x, y, 22 + r() * 18, 30 + r() * 22, c, 3, i) : E.sign(g, x, y, 44 + r() * 30, c, 3); }
    for (let i = 0; i < 7; i++) { const x = 60 + r() * (W - 120), y = GY + 14 + r() * 100; r() < .5 ? E.barrel(g, x, y, .9 + r() * .2, 3, { col: C[Math.floor(r() * 3)] }) : E.crate(g, x, y, .8 + r() * .3, 3, { col: [20 + r() * 14, 50, 30 + r() * 14] }); }
    const k = g.createLinearGradient(0, GY - 150, 0, GY + 20); k.addColorStop(0, 'rgba(14,12,40,0)'); k.addColorStop(1, 'rgba(14,12,40,.5)'); g.fillStyle = k; g.fillRect(0, GY - 150, W, 170);
    g.fillStyle = 'rgba(14,12,40,.34)'; for (let i = 0; i < 5; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, GY); g.lineTo(x + 150, GY); g.lineTo(x + 250, H); g.lineTo(x + 40, H); g.fill(); }
  }
  canvasDemo('read', (s, cv, g) => {
    const st = { mode: 'busy' }, IM = {}, M = {}, times = { block: [], busy: [], calm: [] };
    let run = null, flash = null;                                // run: { left, slot, t0, wait, got: [], miss }
    const foe = (c, i, a = 1) => { const [x, y, sc] = SLOTS[i]; E.figure(c, x, y, { pose: 'aim', face: x < W / 2 ? 1 : -1, col: FOE, s: sc, a }); };
    // measure each treatment once: enemy pixels against the backdrop pixels in the box around them
    Object.keys(NAMES).forEach(m => {
      const c = E.canvas(W, H), x = c.getContext('2d', { willReadFrequently: true }); draw(x, m); IM[m] = c;
      const mk = E.canvas(W, H), mx = mk.getContext('2d', { willReadFrequently: true }), fc = E.canvas(W, H), fx = fc.getContext('2d', { willReadFrequently: true });
      let sum = 0;
      SLOTS.forEach(([sx, sy, sc], i) => {
        mx.clearRect(0, 0, W, H); foe(mx, i); fx.drawImage(c, 0, 0); foe(fx, i);
        const R = [Math.round(sx - 60 * sc), Math.round(sy - 124 * sc), Math.round(120 * sc), Math.round(134 * sc)], A = mx.getImageData(...R).data, B = x.getImageData(...R).data, F = fx.getImageData(...R).data;
        const e = [0, 0, 0], w = [0, 0, 0]; let ne = 0, nw = 0, vr = 0;
        for (let p = 0; p < A.length; p += 4) { if (A[p + 3] > 200) { e[0] += F[p]; e[1] += F[p + 1]; e[2] += F[p + 2]; ne++; } else { w[0] += B[p]; w[1] += B[p + 1]; w[2] += B[p + 2]; nw++; } }
        for (let q = 0; q < 3; q++) { e[q] /= ne; w[q] /= nw; }
        for (let p = 0; p < A.length; p += 4) if (A[p + 3] <= 200) vr += (B[p] - w[0]) ** 2 + (B[p + 1] - w[1]) ** 2 + (B[p + 2] - w[2]) ** 2;
        sum += Math.hypot(e[0] - w[0], e[1] - w[1], e[2] - w[2]) / Math.max(6, Math.sqrt(vr / nw));
      });
      M[m] = sum / SLOTS.length;
    });
    const avg = a => a.length ? a.reduce((p, q) => p + q, 0) / a.length : 0;
    function ui() {
      const r = M[st.mode], tm = times[st.mode];
      say($(s, '.rd-stats'),
        `<div class="${r >= 1.8 ? 'g' : r >= 1 ? 'y' : 'r'}"><b>${r.toFixed(1)}×</b><span>enemy against its backdrop, measured from the pixels</span></div>` +
        `<div><b>${tm.length ? avg(tm).toFixed(2) + ' s' : '–'}</b><span>your average time to click an enemy here</span></div>`);
      const mx = Math.max(1.2, ...Object.values(times).map(avg));
      say($(s, '.rd-bars'), Object.keys(NAMES).map(m => `<div class="rd-bar${m === st.mode ? ' on' : ''}"><span>${NAMES[m]}</span><i><u style="width:${times[m].length ? avg(times[m]) / mx * 100 : 0}%"></u></i><b>${times[m].length ? avg(times[m]).toFixed(2) + ' s' : 'not played'}</b></div>`).join(''));
      say($(s, '.rd-out'), run ? '<b class="accent">Click each enemy</b> as soon as you see it.'
        : st.mode === 'block' ? '<b class="accent">Plain, and easy to read.</b> The book’s point about blockouts: nothing here competes with the enemy. Nothing says where we are, either.'
        : st.mode === 'busy' ? '<b class="accent">Busy art hides the game.</b> Each brick, poster and shadow is as loud as the enemy. Six of them are standing in this street right now. The book calls a level like this illegible.'
        : '<b class="accent">A place that still plays.</b> Walls close in value, shadows lifted, clutter quiet. The same six enemies now stand out. CS:GO’s de_cache made this trade: less drama, more clarity.');
      $(s, '.rd-go').textContent = run ? 'Round running…' : tm.length ? 'Play this street again' : 'Start a round: 5 enemies';
      $(s, '.rd-go').disabled = !!run;
    }
    const next = () => { let i; do i = Math.floor(Math.random() * SLOTS.length); while (i === run.slot); run.slot = i; run.wait = .5 + Math.random() * .9; run.t0 = 0; };
    $(s, '.rd-go').onclick = () => { run = { left: 5, slot: -1, got: [] }; next(); ui(); };
    $$(s, '.rd-mode .btn').forEach(b => b.onclick = () => { if (run) return; st.mode = b.dataset.v; $$(s, '.rd-mode .btn').forEach(q => q.classList.toggle('on', q === b)); ui(); });
    function hit(dt) { run.got.push(dt); flash = { i: run.slot, t: .35, ok: dt < 4 }; if (--run.left <= 0) { times[st.mode].push(avg(run.got)); run = null; ui(); } else next(); }
    cv.style.touchAction = 'manipulation';
    cv.onpointerdown = e => {
      if (!run || !run.t0) return;
      const p = FPF.ptr(cv, e), [x, y, sc] = SLOTS[run.slot];
      if (Math.abs(p.x - x) < 34 * sc && p.y > y - 116 * sc && p.y < y + 8) hit((performance.now() - run.t0) / 1000);
    };
    ui();
    window.__readSet = o => { Object.assign(st, o); run = null; $$(s, '.rd-mode .btn').forEach(q => q.classList.toggle('on', q.dataset.v === st.mode)); ui(); return M; };
    return dt => {
      g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
      g.drawImage(IM[st.mode], 0, 0);
      if (!run) SLOTS.map((p, i) => i).sort((a, b) => SLOTS[a][1] - SLOTS[b][1]).forEach(i => foe(g, i));
      else {
        cv.style.cursor = 'crosshair';
        if (!run.t0) { run.wait -= dt; if (run.wait <= 0) run.t0 = performance.now(); }
        else { foe(g, run.slot); if (performance.now() - run.t0 > 4000) hit(4); }
      }
      if (!run) cv.style.cursor = 'default';
      if (flash) { const [x, y, sc] = SLOTS[flash.i]; g.strokeStyle = `rgba(255,255,255,${flash.t / .35})`; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 56 * sc, (1.35 - flash.t) * 60, 0, 7); g.stroke(); flash.t -= dt; if (flash.t <= 0) flash = null; }
      E.label(g, run ? `${run.left} to find` : NAMES[st.mode] + ': six enemies are standing here', run ? 60 : 20, 24, { size: 14, align: run ? 'center' : 'left' });
      g.restore();
    };
  });
})();
