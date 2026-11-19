/* Speed is a camera job (genre breakdown: "Racing Game Design").
   The same car at the same 180 km/h, drawn twice with a perspective chase camera: on the left with nothing added, on
   the right with the effects you switch on. Field of view widens the lens and pulls the camera in to keep the car the
   same size, so the near road stretches, the distance shrinks and roadside posts sweep past the edges faster;
   camera shake adds a rumble that grows with speed, and speed lines streak out from the vanishing point.
   The readout is how fast a roadside post crosses the screen as it leaves the frame, in screen widths per second: a measure of
   optical flow at the edges, which is what the eye reads as speed. Camera values are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const SPEED = 50, ROAD = 5, POST_X = 6.5, TREE_X = 13, KMH = 180;
  // A chase camera on a true perspective projection. As the lens widens, the camera also moves in (a dolly zoom) so
  // the car's rear stays the same size on screen, the way racing games pair FOV with camera distance: the car and the
  // road near it stretch, the distance shrinks away, and the roadside rushes past the edges.
  const D0 = 6.5, H0 = 2.3, F0 = 1 / Math.tan(30 * Math.PI / 180);   // camera distance and height at the 60 degree lens
  function view(g, x0, y0, w, h, t, o) {
    const fov = o.fov * Math.PI / 180, f = (w / 2) / Math.tan(fov / 2);
    const kd = (1 / Math.tan(fov / 2)) / F0, dist = D0 * kd, ch = H0 * kd;   // keep the car's rear the same screen size
    const R = GK.rng(Math.floor(t * 30) + 7);
    const sh = o.shake ? [(R() - .5) * 7, (R() - .5) * 5] : [0, 0];
    const cx = x0 + w / 2 + sh[0], hz = y0 + h * .36 + sh[1];
    const NEAR = .6;
    const P = (x, y, z) => { const zz = z + dist; return [cx + f * x / zz, hz - f * (y - ch) / zz]; };
    const poly = (pts, fill) => { if (pts.some(p => p[2] + dist < NEAR)) return; g.fillStyle = fill; g.beginPath(); pts.forEach((p, i) => { const [a, b] = P(...p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); };
    g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.clip();
    const sky = g.createLinearGradient(0, y0, 0, hz); sky.addColorStop(0, '#7fb6e6'); sky.addColorStop(1, '#d9ecf7');
    g.fillStyle = sky; g.fillRect(x0, y0, w, hz - y0);
    g.fillStyle = '#7fb069'; g.fillRect(x0, hz, w, y0 + h - hz);
    g.fillStyle = '#9cc58a'; g.beginPath(); g.moveTo(x0, hz); for (let i = 0; i <= 10; i++) g.lineTo(x0 + i * w / 10, hz - 10 - 9 * Math.sin(i * 1.7)); g.lineTo(x0 + w, hz); g.fill();
    // the road, from just in front of the camera to the horizon
    const zn = NEAR - dist + .05, zf = 600;
    poly([[-ROAD, 0, zn], [ROAD, 0, zn], [ROAD, 0, zf], [-ROAD, 0, zf]], '#5d6170');
    [-1, 1].forEach(sd => poly([[sd * ROAD, 0, zn], [sd * (ROAD - .25), 0, zn], [sd * (ROAD - .25), 0, zf], [sd * ROAD, 0, zf]], '#e9e6dc'));
    // everything that streams past, far to near so near things draw on top
    const items = [];
    for (let i = 0; i < 70; i++) {
      const z = i * 6 - (SPEED * t) % 6 - dist + 1;
      if (z + dist < NEAR + .4) continue;
      if (i % 2 === 0) items.push(['stripe', z]);
      items.push(['post', z, i]);
      if (i % 3 === 0) items.push(['tree', z + 3, i]);
    }
    items.sort((a, b) => b[1] - a[1]).forEach(([k, z, i]) => {
      if (k === 'stripe') poly([[-.12, 0, z], [.12, 0, z], [.12, 0, z + 3], [-.12, 0, z + 3]], '#f2f2f2');
      if (k === 'post') [-1, 1].forEach(sd => { const x = sd * POST_X; poly([[x - .12, 0, z], [x + .12, 0, z], [x + .12, 1.2, z], [x - .12, 1.2, z]], i % 2 ? '#e5322d' : '#ffffff'); });
      if (k === 'tree') [-1, 1].forEach(sd => { const x = sd * (TREE_X + (i % 5)); poly([[x - .25, 0, z], [x + .25, 0, z], [x + .25, 1.5, z], [x - .25, 1.5, z]], '#6b4a2b'); poly([[x - 1.8, 1.5, z], [x + 1.8, 1.5, z], [x, 6.5, z]], '#2f7a3a'); });
    });
    // speed lines
    if (o.lines) {
      const L = GK.rng(Math.floor(t * 12) + 3);
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const a = L() * 6.283, r0 = w * (.32 + L() * .2), len = 40 + L() * 70; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, hz + Math.sin(a) * r0 * .7); g.lineTo(cx + Math.cos(a) * (r0 + len), hz + Math.sin(a) * (r0 + len) * .7); g.stroke(); }
    }
    // the car, a 3D body seen from behind and above: rear at z = 0, nose at z = 4.2
    g.fillStyle = 'rgba(0,0,0,.28)'; { const [a, b] = P(-1.1, 0, -.2), [c] = P(1.1, 0, -.2), [, d] = P(0, 0, 4.4); g.beginPath(); g.ellipse((a + c) / 2, (b + d) / 2, (c - a) / 2, Math.max(4, (b - d) / 2), 0, 0, 6.283); g.fill(); }
    poly([[-.95, .95, 0], [.95, .95, 0], [.85, .95, 4.2], [-.85, .95, 4.2]], '#c92a24');   // bonnet and boot deck
    poly([[-.68, 1.45, .9], [.68, 1.45, .9], [.68, 1.45, 2.6], [-.68, 1.45, 2.6]], '#a51f1b');   // roof
    poly([[-.8, .95, .5], [.8, .95, .5], [.68, 1.45, .9], [-.68, 1.45, .9]], '#9fd3f0');   // rear window
    poly([[-.95, .25, 0], [.95, .25, 0], [.95, .95, 0], [-.95, .95, 0]], C.red);   // rear face
    [-1, 1].forEach(sd => { poly([[sd * .95, 0, .1], [sd * .55, 0, .1], [sd * .55, .5, .1], [sd * .95, .5, .1]], '#222'); poly([[sd * .85, .62, -.01], [sd * .45, .62, -.01], [sd * .45, .78, -.01], [sd * .85, .78, -.01]], C.gold); });
    g.restore();
    GK.box(g, x0 + w - 104, y0 + 10, 94, 40, 'rgba(21,32,68,.85)', null, 8);
    GK.head(g, `${KMH} km/h`, x0 + w - 57, y0 + 37, 'center', '#fff', 16);
    // optical flow: how fast a roadside post is crossing the screen as it leaves the frame, in screen widths per second.
    // It leaves when f X / Z = w / 2, so its screen speed f X V / Z^2 is V w^2 / (4 f X) there, divided by w.
    return SPEED * w / (4 * f * POST_X);
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
