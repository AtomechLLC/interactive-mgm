/* Speed is a camera job (genre breakdown: "Racing Game Design").
   The same car at the same 180 km/h, drawn twice with a simple perspective camera: on the left with nothing added, on
   the right with the effects you switch on. Field of view widens the lens (roadside posts sweep past the edges faster),
   camera shake adds a rumble that grows with speed, and speed lines streak out from the vanishing point.
   The readout is how fast a roadside post crosses the screen as it leaves the frame, in screen widths per second: a measure of
   optical flow at the edges, which is what the eye reads as speed. Camera values are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const SPEED = 50, HEIGHT = 1.3, ROAD = 5, POSTS = 12, KMH = 180;
  function view(g, x0, y0, w, h, t, o) {
    const fov = o.fov * Math.PI / 180, f = (w / 2) / Math.tan(fov / 2);
    const R = GK.rng(Math.floor(t * 30) + 7);
    const sh = o.shake ? [(R() - .5) * 7, (R() - .5) * 5] : [0, 0];
    const cx = x0 + w / 2 + sh[0], hz = y0 + h * .42 + sh[1];
    g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.clip();
    const sky = g.createLinearGradient(0, y0, 0, hz); sky.addColorStop(0, '#7fb6e6'); sky.addColorStop(1, '#d9ecf7');
    g.fillStyle = sky; g.fillRect(x0, y0, w, hz - y0);
    g.fillStyle = '#7fb069'; g.fillRect(x0, hz, w, y0 + h - hz);
    // hills
    g.fillStyle = '#9cc58a'; g.beginPath(); g.moveTo(x0, hz); for (let i = 0; i <= 10; i++) g.lineTo(x0 + i * w / 10, hz - 14 - 12 * Math.sin(i * 1.7)); g.lineTo(x0 + w, hz); g.fill();
    const P = (x, z) => [cx + f * x / z, hz + f * HEIGHT / z];
    // road
    const zn = 2.2, zf = 400;
    const [l1, b1] = P(-ROAD, zn), [r1] = P(ROAD, zn), [l2, b2] = P(-ROAD, zf), [r2] = P(ROAD, zf);
    g.fillStyle = '#5d6170'; g.beginPath(); g.moveTo(l1, b1); g.lineTo(r1, b1); g.lineTo(r2, b2); g.lineTo(l2, b2); g.fill();
    // stripes and posts, moving toward the camera
    const off = (SPEED * t) % 10;
    for (let i = 30; i >= 0; i--) {
      const z = i * 10 - off + 2.5; if (z < zn) continue;
      const [ax, ay] = P(-.15, z), [bx, by] = P(.15, z + 4);
      if (z + 4 > zn) { g.fillStyle = '#f2f2f2'; const [cx2, cy2] = P(.15, Math.max(zn, z)), [dx2, dy2] = P(-.15, z + 4); g.beginPath(); g.moveTo(ax, Math.min(ay, y0 + h)); g.lineTo(cx2, Math.min(cy2, y0 + h)); g.lineTo(bx, by); g.lineTo(dx2, dy2); g.fill(); }
      [-1, 1].forEach(sd => { const [kx, ky] = P(sd * (ROAD + 1.5), z), [tx, ty] = P(sd * (ROAD + 1.5), z); const ph = f * 1.4 / z; g.fillStyle = i % 2 ? '#e5322d' : '#fff'; g.fillRect(kx - Math.max(1, ph * .08), ky - ph, Math.max(2, ph * .16), ph); });
    }
    // speed lines
    if (o.lines) {
      const L = GK.rng(Math.floor(t * 12) + 3);
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const a = L() * 6.283, r0 = w * (.32 + L() * .2), len = 40 + L() * 70; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, hz + Math.sin(a) * r0 * .7); g.lineTo(cx + Math.cos(a) * (r0 + len), hz + Math.sin(a) * (r0 + len) * .7); g.stroke(); }
    }
    // the car, rear view
    const carW = w * .3, carH = carW * .42, carX = x0 + w / 2 - carW / 2 + sh[0] * .4, carY = y0 + h - carH - 14 + sh[1] * .4;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x0 + w / 2, carY + carH + 4, carW * .55, 10, 0, 0, 6.283); g.fill();
    g.fillStyle = C.red; g.beginPath(); g.roundRect(carX, carY + carH * .3, carW, carH * .7, 10); g.fill();
    g.fillStyle = '#b5201c'; g.beginPath(); g.roundRect(carX + carW * .18, carY, carW * .64, carH * .45, 10); g.fill();
    g.fillStyle = '#9fd3f0'; g.beginPath(); g.roundRect(carX + carW * .24, carY + carH * .06, carW * .52, carH * .28, 6); g.fill();
    g.fillStyle = '#222'; g.fillRect(carX + 4, carY + carH * .85, carW * .16, carH * .2); g.fillRect(carX + carW * .8 - 4, carY + carH * .85, carW * .16, carH * .2);
    g.fillStyle = C.gold; g.fillRect(carX + 10, carY + carH * .45, carW * .14, 6); g.fillRect(carX + carW * .86 - 10, carY + carH * .45, carW * .14, 6);
    g.restore();
    // speedometer
    GK.box(g, x0 + w - 104, y0 + 10, 94, 40, 'rgba(21,32,68,.85)', null, 8);
    GK.head(g, `${KMH} km/h`, x0 + w - 57, y0 + 37, 'center', '#fff', 16);
    // optical flow: how fast a roadside post is crossing the screen as it leaves the frame, in screen widths per second.
    // It leaves when f X / z = w / 2, so its screen speed f X V / z^2 is V w^2 / (4 f X) there.
    return SPEED * w / (4 * f * (ROAD + 1.5));
  }

  GK.scene('camera', (s, g, ui) => {
    const fovEl = s.querySelector('.rc-fov'), fovV = s.querySelector('.rc-fovv'), shake = s.querySelector('.rc-shake'), lines = s.querySelector('.rc-lines');
    ui.watch(fovEl, shake, lines);
    const ACTS = [{ to: 4, o: { fov: 60, shake: false, lines: false } }, { to: 8, o: { fov: 95, shake: false, lines: false } }, { to: 12, o: { fov: 95, shake: true, lines: false } }, { to: 18, o: { fov: 95, shake: true, lines: true } }];
    return {
      dur: 18,
      frame(t, tour) {
        let o = { fov: +fovEl.value, shake: shake.checked, lines: lines.checked };
        if (tour) { const [a] = GK.act(ACTS, t); o = a.o; fovEl.value = o.fov; shake.checked = o.shake; lines.checked = o.lines; }
        fovV.textContent = o.fov + '°';
        GK.panel(g);
        GK.head(g, 'Plain camera: 60° lens', 20, 30);
        GK.head(g, 'Your camera', 532, 30);
        const f0 = view(g, 16, 42, 500, 340, t, { fov: 60 });
        const f1 = view(g, 528, 42, 500, 340, t, o);
        // readouts
        GK.head(g, 'What changed between the two views', 20, 420);
        const rows = [['Car speed', `${KMH} km/h`, `${KMH} km/h`, false], ['Field of view', '60°', `${o.fov}°`, o.fov !== 60], ['Camera shake', 'off', o.shake ? 'on' : 'off', o.shake], ['Speed lines', 'off', o.lines ? 'on' : 'off', o.lines], ['Edge flow (screen widths / s)', f0.toFixed(1), f1.toFixed(1), Math.abs(f1 - f0) > .05]];
        rows.forEach(([k, a, b, ch], i) => {
          const y = 448 + i * 26;
          GK.text(g, k, 24, y, C.ink, 14, 'left', 600); GK.text(g, a, 380, y, C.muted, 14, 'center', 700); GK.text(g, b, 640, y, ch ? C.goldInk : C.muted, 14, 'center', 800);
        });
        GK.text(g, 'plain', 380, 420, C.muted, 12, 'center', 700); GK.text(g, 'yours', 640, 420, C.muted, 12, 'center', 700);
        GK.wrap(g, 'The speedometer never moves. Everything that reads as faster is the camera: a wider lens drags the roadside past the edges of the screen, shake adds rumble, and lines streak toward you.', 740, 440, 280, 19, C.ink, 14);
        ui.stats(`<div class="g"><b>${KMH}</b><span>km/h in both views</span></div><div class="${f1 > f0 + .05 ? 'y' : ''}"><b>${(f1 / f0).toFixed(1)}×</b><span>edge flow of the plain camera</span></div>`);
        ui.out('Racing games communicate speed mostly through the camera. Same physics, same number on the dial; the right view feels faster.');
      },
    };
  });
})();
