/* Brake at the board (genre breakdown: "Racing Game Design"), slide 2: a playable test, not a model.
   Slide 1 shows that a wider lens, shake and speed lines make the same 180 km/h feel faster. Here the learner drives:
   twelve corners, each with a 100 board, and they press B (or click the road) to brake. The ideal is to brake on the
   board. Six corners use the plain 60° camera and six use slide 1's full kit (100° lens, shake, speed lines), in a
   shuffled order so practice helps both equally. The gap before each board varies, so the rhythm can't be learned.
   The result is the learner's own: how far from the board they braked with each camera.
   The walk-through drives itself with a simulated driver whose spread is illustrative; Play measures you. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const SPEED = 50, HEIGHT = 1.3, ROAD = 5, CORNERS = 12, WIDE = 10;   // braking more than WIDE m late runs wide
  const PLAIN = { fov: 60, shake: 0, lines: false }, KIT = { fov: 100, shake: .8, lines: true };
  const plan = seed => { const R = GK.rng(seed), cams = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]; for (let i = cams.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cams[i], cams[j]] = [cams[j], cams[i]]; } return cams.map(c => ({ cam: c, gap: 2.4 + R() * 2.2 })); };

  function view(g, x0, y0, w, h, t, zb, o, braking) {
    const fov = o.fov * Math.PI / 180, f = (w / 2) / Math.tan(fov / 2), R = GK.rng(Math.floor(t * 30) + 7);
    const sh = [(R() - .5) * 16 * o.shake, (R() - .5) * 11 * o.shake], cx = x0 + w / 2 + sh[0], hz = y0 + h * .42 + sh[1];
    g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.clip();
    const sky = g.createLinearGradient(0, y0, 0, hz); sky.addColorStop(0, '#7fb6e6'); sky.addColorStop(1, '#d9ecf7');
    g.fillStyle = sky; g.fillRect(x0, y0, w, hz - y0); g.fillStyle = '#7fb069'; g.fillRect(x0, hz, w, y0 + h - hz);
    const P = (x, z) => [cx + f * x / z, hz + f * HEIGHT / z];
    // the near edge sits below the view's bottom, so the road always runs under the car, whatever the field of view
    const zn = Math.min(2.2, f * HEIGHT / (y0 + h + 30 - hz)), zf = 400, [l1, b1] = P(-ROAD, zn), [r1] = P(ROAD, zn), [l2, b2] = P(-ROAD, zf), [r2] = P(ROAD, zf);
    g.fillStyle = '#5d6170'; g.beginPath(); g.moveTo(l1, b1); g.lineTo(r1, b1); g.lineTo(r2, b2); g.lineTo(l2, b2); g.fill();
    const off = (SPEED * t) % 10;
    for (let i = 30; i >= 0; i--) { const z = i * 10 - off + 2.5; if (z < zn) continue; [-1, 1].forEach(sd => { const [kx, ky] = P(sd * (ROAD + 1.5), z), ph = f * 1.4 / z; g.fillStyle = i % 2 ? '#e5322d' : '#fff'; g.fillRect(kx - Math.max(1, ph * .08), ky - ph, Math.max(2, ph * .16), ph); }); }
    // the corner: a red-and-white kerb across the road 25 m past the board
    const zk = zb + 25; if (zk > zn && zk < 300) { const [a1, k1] = P(-ROAD, zk), [a2] = P(ROAD, zk), kh = Math.max(2, f * .6 / zk); for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? C.red : '#fff'; g.fillRect(a1 + (a2 - a1) * i / 10, k1 - kh, (a2 - a1) / 10, kh); } }
    if (zb > zn && zb < 300) {
      const [bx, by] = P(ROAD + 2.6, zb), bw = f * 2.2 / zb, bh = f * 1.6 / zb, pole = f * 1.2 / zb;
      g.fillStyle = '#444'; g.fillRect(bx - Math.max(1, bw * .04), by - pole, Math.max(2, bw * .08), pole);
      g.fillStyle = '#fff'; g.fillRect(bx - bw / 2, by - pole - bh, bw, bh); g.strokeStyle = C.red; g.lineWidth = Math.max(1, bw * .08); g.strokeRect(bx - bw / 2, by - pole - bh, bw, bh);
      if (bh > 7) { g.font = `800 ${Math.round(bh * .6)}px Montserrat, sans-serif`; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('100', bx, by - pole - bh / 2); }
    }
    if (o.lines) { const L = GK.rng(Math.floor(t * 12) + 3); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; for (let i = 0; i < 30; i++) { const a = L() * 6.283, r0 = w * (.22 + L() * .2), len = 40 + L() * 70; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, hz + Math.sin(a) * r0 * .7); g.lineTo(cx + Math.cos(a) * (r0 + len), hz + Math.sin(a) * (r0 + len) * .7); g.stroke(); } }
    const carW = w * .28, carH = carW * .42, carX = x0 + w / 2 - carW / 2 + sh[0] * .4, carY = y0 + h - carH - 12 + sh[1] * .4;
    g.fillStyle = C.red; g.beginPath(); g.roundRect(carX, carY + carH * .3, carW, carH * .7, 10); g.fill();
    g.fillStyle = '#b5201c'; g.beginPath(); g.roundRect(carX + carW * .18, carY, carW * .64, carH * .45, 10); g.fill();
    g.fillStyle = '#9fd3f0'; g.beginPath(); g.roundRect(carX + carW * .24, carY + carH * .06, carW * .52, carH * .28, 6); g.fill();
    g.fillStyle = braking ? '#ff3b30' : '#7a1512'; g.fillRect(carX + 8, carY + carH * .45, carW * .16, 8); g.fillRect(carX + carW * .84 - 8, carY + carH * .45, carW * .16, 8);
    g.restore();
  }

  GK.scene('brakeplay', (s, g, ui) => {
    const playBtn = s.querySelector('.bp-play'), cv = s.querySelector('canvas');
    const st = { mode: 'tour', i: 0, clock: 0, last: null, results: [], plan: plan(5), pressed: false, flash: 0 };
    const start = () => { ui.stopTour(); Object.assign(st, { mode: 'play', i: 0, clock: 0, last: null, results: [], plan: plan(Math.floor(Math.random() * 1e6)), pressed: false, flash: 0 }); playBtn.textContent = '↻ Start over'; };
    const press = () => {
      if (st.mode !== 'play' || st.pressed || st.i >= CORNERS) return;
      const c = st.plan[st.i], zb = SPEED * (c.gap - st.clock);
      if (zb > 80) return;                               // far too early to count: ignore stray presses
      st.pressed = true; st.results.push({ cam: c.cam, err: zb }); st.flash = 1.2;
    };
    playBtn.onclick = start;
    cv.addEventListener('pointerdown', e => { if (st.mode === 'play') { e.preventDefault(); press(); } });
    addEventListener('keydown', e => { if ((e.key === 'b' || e.key === 'B') && s.classList.contains('active')) press(); });
    ui.watch(playBtn);
    // walk-through: a simulated driver, spread illustrative (5 m plain, 12 m with the kit)
    const TOUR = plan(5).map((c, i) => { const R = GK.rng(i + 40), u = Math.max(1e-6, R()), z = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * R()); return { ...c, err: z * (c.cam ? 12 : 5) + (c.cam ? -2 : 0) }; });
    const TSTART = TOUR.reduce((a, c, i) => (a.push(i ? a[i - 1] + TOUR[i - 1].gap + 1.4 : 0), a), []);
    const DUR = TSTART[CORNERS - 1] + TOUR[CORNERS - 1].gap + 4;
    return {
      dur: DUR,
      frame(t, tour) {
        if (tour && st.mode !== 'tour') { st.mode = 'tour'; playBtn.textContent = '▶ Play: brake yourself'; }
        let cur, clock, results, cam, braking = false, done;
        if (st.mode === 'tour') {
          let i = TSTART.findIndex((a, k) => t < a + TOUR[k].gap + 1.4); if (i < 0) i = CORNERS;
          results = TOUR.slice(0, i).map(c => ({ cam: c.cam, err: c.err }));
          done = i >= CORNERS; cur = TOUR[Math.min(i, CORNERS - 1)]; clock = done ? cur.gap + 1 : t - TSTART[i];
          const tp = cur.gap - cur.err / SPEED; braking = !done && clock >= tp; if (!done && clock >= cur.gap + .2) results = TOUR.slice(0, i + 1);
        } else {
          const dt = st.last == null ? 0 : clamp(t - st.last, 0, .1); st.last = t; st.flash = Math.max(0, st.flash - dt);
          done = st.i >= CORNERS;
          if (!done) {
            st.clock += dt; const c = st.plan[st.i];
            if (!st.pressed && st.clock > c.gap + WIDE / SPEED + .3) { st.results.push({ cam: c.cam, err: -(st.clock - c.gap) * SPEED, missed: true }); st.pressed = true; st.flash = 1.2; }
            if (st.clock > c.gap + 1.4) { st.i++; st.clock = 0; st.pressed = false; }
          }
          cur = st.plan[Math.min(st.i, CORNERS - 1)]; clock = done ? cur.gap + 1 : st.clock; results = st.results; braking = st.pressed;
        }
        cam = cur.cam ? KIT : PLAIN;
        GK.panel(g);
        const n = Math.min(results.length + (done ? 0 : 1), CORNERS);
        GK.head(g, done ? 'Done: your twelve corners' : `Corner ${n} of ${CORNERS} · ${cur.cam ? 'slide 1’s full camera kit' : 'plain 60° camera'}`, 20, 28, 'left', cur.cam && !done ? C.goldInk : C.ink);
        const zb = SPEED * (cur.gap - clock);
        view(g, 16, 40, 560, 315, t, zb, done ? PLAIN : cam, braking);
        if (!done && st.mode === 'play' && !st.pressed) GK.text(g, 'Press B or click the road to brake at the board', 296, 372, C.muted, 13, 'center', 700);
        const lastR = results[results.length - 1];
        if (lastR && (st.mode === 'play' ? st.flash > 0 : clock > cur.gap && clock < cur.gap + 1.4)) {
          const e = lastR.err, txt = lastR.missed ? 'No brake: ran wide' : e < -WIDE ? `${Math.round(-e)} m late: ran wide` : e >= 0 ? `${Math.round(e)} m early` : `${Math.round(-e)} m late`;
          GK.box(g, 196, 150, 200, 44, 'rgba(21,32,68,.85)', null, 10); GK.head(g, txt, 296, 179, 'center', e < -WIDE || lastR.missed ? '#ff8a80' : '#fff', 16);
        }
        // results: your brake points with each camera
        const rx = 600, rw = 420, mid = rx + rw / 2, mpp = rw / 80, X = m => mid + clamp(m, -40, 40) * mpp;
        GK.head(g, st.mode === 'play' ? 'Where you braked' : 'Where the walk-through driver braked', rx, 28);
        [['Plain camera', 0, 70], ['Full kit', 1, 170]].forEach(([l, c, y]) => {
          g.fillStyle = '#5d6170'; g.fillRect(rx, y, rw, 50);
          g.fillStyle = 'rgba(229,50,45,.3)'; g.fillRect(rx, y, X(-WIDE) - rx, 50);
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(mid, y - 6); g.lineTo(mid, y + 56); g.stroke();
          GK.text(g, l, rx, y - 10, C.ink, 13, 'left', 800);
          const mine = results.filter(r => r.cam === c);
          mine.forEach((r, k) => TD.player(X(r.err), y + 12 + (k % 4) * 9, 0, .3, 1, r.missed || r.err < -WIDE ? C.red : C.gold));
          const mae = mine.length ? mine.reduce((a, r) => a + Math.abs(r.err), 0) / mine.length : null, wide = mine.filter(r => r.missed || r.err < -WIDE).length;
          GK.text(g, mine.length ? `off by ${mae.toFixed(1)} m on average · ${wide} ran wide` : 'no corners yet', rx + rw, y - 10, C.muted, 12, 'right', 700);
        });
        GK.text(g, 'late, runs wide', rx + 4, 246, C.redDk, 11, 'left', 700); GK.text(g, 'board', mid, 246, C.ink, 11, 'center', 800); GK.text(g, 'early', rx + rw - 4, 246, C.muted, 11, 'right', 700);
        const avg = c => { const m = results.filter(r => r.cam === c); return m.length ? m.reduce((a, r) => a + Math.abs(r.err), 0) / m.length : null; };
        const a0 = avg(0), a1 = avg(1);
        let msg;
        if (st.mode === 'tour') msg = 'The walk-through uses a simulated driver. Press Play to drive the twelve corners yourself: the dots become yours.';
        else if (!done) msg = 'Brake on the board. Six corners use the plain camera and six use the full kit, shuffled so practice helps both equally.';
        else if (a1 > a0 * 1.25) msg = `Your braking was ${(a1 / a0).toFixed(1)}× less precise with the camera that feels faster. Speed feel is paid for in readability.`;
        else if (a0 > a1 * 1.25) msg = 'You braked more precisely with the full kit. Some players read the wider view well; run it again and see if it holds.';
        else msg = 'About the same with both cameras this run. Try again: one run of six corners each is a small sample.';
        GK.wrap(g, msg, 600, 290, 420, 22, C.ink, 16, 700);
        GK.wrap(g, 'The camera has two jobs that pull against each other: sell the speed, and show the next decision. Measuring players, not guessing, is how you find where yours sits.', 20, 420, 1000, 18, C.muted, 13);
        ui.stats(`<div><b>${a0 == null ? '–' : a0.toFixed(1) + ' m'}</b><span>off the board, plain camera</span></div><div class="${a1 != null && a0 != null && a1 > a0 * 1.25 ? 'r' : ''}"><b>${a1 == null ? '–' : a1.toFixed(1) + ' m'}</b><span>off the board, full kit</span></div>`);
        ui.out(st.mode === 'play' ? 'B or a click on the road brakes. Start over for a fresh shuffle.' : 'Press Play to measure yourself.');
      },
    };
  });
})();
