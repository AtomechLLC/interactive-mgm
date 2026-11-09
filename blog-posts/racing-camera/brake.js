/* Speed costs readability (genre breakdown: "Racing Game Design"), a lesson-richness spike for slide 2.
   Slide 1 shows that a wider lens, shake and speed lines make the same 180 km/h feel faster. This slide puts a price on
   them: the player still has to read the braking board before a corner. A wider lens shrinks far objects (the board
   reads later), shake blurs it, and speed lines crowd the edge of the view it sits in. Twenty seeded drivers brake on
   the board; the spread of their brake points grows with each effect. "Calm the camera on approach" fades every effect
   to a quarter inside the braking zone, so the straight keeps its feel and the decision gets a steady view.
   Spread model (metres, illustrative): 3 + 6 (1 / size - 1) + 13 shake + 4 lines, size = tan(30°) / tan(fov / 2).
   Felt speed is slide 1's edge flow against a 60° lens, plus a share for shake and lines; also illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const SPEED = 50, HEIGHT = 1.3, ROAD = 5, CYCLE = 4.5, ZONE = 1.6;   // the last ZONE seconds of a cycle are the braking zone
  const size = fov => Math.tan(Math.PI / 6) / Math.tan(fov * Math.PI / 360);
  const flow = fov => 1 / size(fov);                                   // edge flow relative to a 60° lens
  const felt = (o, k) => flow(lerp(60, o.fov, k)) + .35 * o.shake * k + (o.lines ? .25 * k : 0);
  const spread = (o, k) => 3 + 6 * (1 / size(lerp(60, o.fov, k)) - 1) + 13 * o.shake * k + (o.lines ? 4 * k : 0);
  // standard normals for 20 drivers, seeded
  const Z = (() => { const R = GK.rng(41), z = []; for (let i = 0; i < 20; i++) { const u = Math.max(1e-6, R()), v = R(); z.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v)); } return z; })();

  function view(g, x0, y0, w, h, t, o, k) {
    const fov = lerp(60, o.fov, k) * Math.PI / 180, f = (w / 2) / Math.tan(fov / 2);
    const R = GK.rng(Math.floor(t * 30) + 7), amp = o.shake * k;
    const sh = [(R() - .5) * 16 * amp, (R() - .5) * 11 * amp];
    const cx = x0 + w / 2 + sh[0], hz = y0 + h * .42 + sh[1];
    g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.clip();
    const sky = g.createLinearGradient(0, y0, 0, hz); sky.addColorStop(0, '#7fb6e6'); sky.addColorStop(1, '#d9ecf7');
    g.fillStyle = sky; g.fillRect(x0, y0, w, hz - y0); g.fillStyle = '#7fb069'; g.fillRect(x0, hz, w, y0 + h - hz);
    const P = (x, z) => [cx + f * x / z, hz + f * HEIGHT / z];
    const zn = 2.2, zf = 400, [l1, b1] = P(-ROAD, zn), [r1] = P(ROAD, zn), [l2, b2] = P(-ROAD, zf), [r2] = P(ROAD, zf);
    g.fillStyle = '#5d6170'; g.beginPath(); g.moveTo(l1, b1); g.lineTo(r1, b1); g.lineTo(r2, b2); g.lineTo(l2, b2); g.fill();
    const off = (SPEED * t) % 10;
    for (let i = 30; i >= 0; i--) {
      const z = i * 10 - off + 2.5; if (z < zn) continue;
      [-1, 1].forEach(sd => { const [kx, ky] = P(sd * (ROAD + 1.5), z), ph = f * 1.4 / z; g.fillStyle = i % 2 ? '#e5322d' : '#fff'; g.fillRect(kx - Math.max(1, ph * .08), ky - ph, Math.max(2, ph * .16), ph); });
    }
    // the braking board: it reaches the car at the end of each cycle
    const zb = SPEED * (CYCLE - (t % CYCLE)) + 4;
    if (zb < 260) {
      const [bx, by] = P(ROAD + 2.6, zb), bw = f * 2.2 / zb, bh = f * 1.6 / zb, pole = f * 1.2 / zb;
      g.fillStyle = '#444'; g.fillRect(bx - Math.max(1, bw * .04), by - pole, Math.max(2, bw * .08), pole);
      g.fillStyle = '#fff'; g.fillRect(bx - bw / 2, by - pole - bh, bw, bh); g.strokeStyle = C.red; g.lineWidth = Math.max(1, bw * .08); g.strokeRect(bx - bw / 2, by - pole - bh, bw, bh);
      if (bh > 7) { g.font = `800 ${Math.round(bh * .6)}px Montserrat, sans-serif`; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('100', bx, by - pole - bh / 2); }
      // shake smears the board: a ghost copy offset by the shake
      if (amp > .05) { g.globalAlpha = .35 * amp; g.fillStyle = '#fff'; g.fillRect(bx - bw / 2 + sh[0] * 1.5, by - pole - bh + sh[1], bw, bh); g.globalAlpha = 1; }
    }
    if (o.lines && k > .05) {
      const L = GK.rng(Math.floor(t * 12) + 3); g.strokeStyle = `rgba(255,255,255,${.75 * k})`; g.lineWidth = 2;
      for (let i = 0; i < 30; i++) { const a = L() * 6.283, r0 = w * (.22 + L() * .2), len = 40 + L() * 70; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, hz + Math.sin(a) * r0 * .7); g.lineTo(cx + Math.cos(a) * (r0 + len), hz + Math.sin(a) * (r0 + len) * .7); g.stroke(); }
    }
    const carW = w * .28, carH = carW * .42, carX = x0 + w / 2 - carW / 2 + sh[0] * .4, carY = y0 + h - carH - 12 + sh[1] * .4;
    g.fillStyle = C.red; g.beginPath(); g.roundRect(carX, carY + carH * .3, carW, carH * .7, 10); g.fill();
    g.fillStyle = '#b5201c'; g.beginPath(); g.roundRect(carX + carW * .18, carY, carW * .64, carH * .45, 10); g.fill();
    g.fillStyle = '#9fd3f0'; g.beginPath(); g.roundRect(carX + carW * .24, carY + carH * .06, carW * .52, carH * .28, 6); g.fill();
    g.restore();
  }

  GK.scene('brake', (s, g, ui) => {
    const fovEl = s.querySelector('.bk-fov'), fovV = s.querySelector('.bk-fovv'), shEl = s.querySelector('.bk-shake'), shV = s.querySelector('.bk-shakev');
    const lines = s.querySelector('.bk-lines'), calm = s.querySelector('.bk-calm');
    ui.watch(fovEl, shEl, lines, calm);
    const ACTS = [
      { to: 9, o: { fov: 60, shake: 0, lines: false, calm: false }, say: 'A plain 60° camera: the board reads early and the drivers brake close together.' },
      { to: 18, o: { fov: 100, shake: .8, lines: true, calm: false }, say: 'Slide 1’s full kit: much faster feel, and the brake points scatter. Some drivers miss the corner.' },
      { to: 27, o: { fov: 100, shake: .8, lines: true, calm: true }, say: 'Calm the camera on the approach: the straight keeps its feel, and the braking zone gets a steady view.' },
    ];
    return {
      dur: 27,
      frame(t, tour) {
        let o = { fov: +fovEl.value, shake: +shEl.value / 100, lines: lines.checked, calm: calm.checked }, say = '';
        if (tour) { const [a] = GK.act(ACTS, t); o = a.o; say = a.say; fovEl.value = o.fov; shEl.value = o.shake * 100; lines.checked = o.lines; calm.checked = o.calm; }
        fovV.textContent = o.fov + '°'; shV.textContent = Math.round(o.shake * 100) + '%';
        const kZone = o.calm ? .25 : 1, inZone = (t % CYCLE) > CYCLE - ZONE - .6;
        const kNow = inZone ? kZone : 1;
        GK.panel(g);
        GK.head(g, inZone ? 'Braking zone: read the board' : 'The straight', 20, 28, 'left', inZone ? C.redDk : C.ink);
        view(g, 16, 40, 560, 315, t, o, kNow);
        // readouts beside the view
        const fx = 600, fS = felt(o, 1), fZ = felt(o, kZone), sd = spread(o, kZone);
        GK.head(g, 'Felt speed (plain 60° camera = 1.0×)', fx, 28);
        [['on the straight', fS], ['in the braking zone', fZ]].forEach(([l, v], i) => {
          const y = 44 + i * 40, w = 300 * clamp(v / 3);
          GK.text(g, l, fx, y + 16, C.ink, 13, 'left', 600); GK.box(g, fx + 140, y + 2, 300, 22, '#f1e9d6', null, 6);
          g.fillStyle = C.player; g.beginPath(); g.roundRect(fx + 140, y + 2, Math.max(4, w), 22, 6); g.fill(); GK.text(g, v.toFixed(1) + '×', fx + 146 + w, y + 19, C.ink, 13, 'left', 800);
        });
        GK.head(g, 'Where 20 drivers hit the brakes', fx, 150);
        // top-down strip: the board at x = mid, the corner entry at +8 m
        const sx0 = fx, sw = 420, sy = 168, sh = 120, mpp = sw / 80, mid = sx0 + sw / 2, sxm = m => mid + m * mpp;
        g.fillStyle = '#7fb069'; g.fillRect(sx0, sy, sw, sh); g.fillStyle = '#5d6170'; g.fillRect(sx0, sy + 30, sw, 60);
        g.fillStyle = 'rgba(229,50,45,.25)'; g.fillRect(sxm(11), sy + 30, sx0 + sw - sxm(11), 60);
        g.fillStyle = 'rgba(224,169,45,.3)'; g.fillRect(sx0, sy + 30, sxm(-13) - sx0, 60);
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(mid, sy + 22); g.lineTo(mid, sy + 98); g.stroke();
        GK.text(g, 'board', mid, sy + 16, '#fff', 11, 'center', 800); GK.text(g, 'too late: runs wide', sxm(24), sy + 112, C.redDk, 11, 'center', 700); GK.text(g, 'too early: loses time', sxm(-25), sy + 112, C.goldInk, 11, 'center', 700);
        let late = 0, early = 0;
        Z.forEach((z, i) => { const m = clamp(z * sd, -39, 39), col = m > 11 ? C.red : m < -13 ? C.gold : C.player; if (m > 11) late++; if (m < -13) early++; TD.player(sxm(m), sy + 36 + (i % 10) * 5.4, 0, .3, 1, col); });
        GK.text(g, '-40 m', sx0 + 4, sy + sh + 14, C.muted, 11, 'left', 600); GK.text(g, '+40 m', sx0 + sw - 4, sy + sh + 14, C.muted, 11, 'right', 600);
        GK.big(g, `±${sd.toFixed(0)} m`, 'spread of brake points', fx, 336, sd > 10 ? C.redDk : C.ink);
        GK.big(g, `${late}`, 'of 20 miss the corner', fx + 170, 336, late ? C.redDk : C.good);
        GK.big(g, `${early}`, 'of 20 brake too early', fx + 310, 336, early ? C.goldInk : C.good);
        GK.wrap(g, say || (o.calm ? 'The camera does its job on the straight and gets out of the way when the player has to decide.' : sd > 10 ? 'Every effect that sells speed also hides the board. Speed feel is paid for in readability.' : 'Readable, and calm. Push the effects and watch what the drivers lose.'), 20, 410, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'A wider lens makes far objects smaller, so the board reads later; shake smears it; speed lines crowd the edge of the view where it stands. One answer: tie the effects to the moment, strong on the straights and eased off when the player has a decision to make.', 20, 500, 1000, 18, C.muted, 13);
        ui.stats(`<div class="g"><b>${fS.toFixed(1)}×</b><span>felt speed on the straight</span></div><div class="${late ? 'r' : 'g'}"><b>${late} of 20</b><span>drivers miss the corner</span></div>`);
        ui.out('The camera has two jobs that pull against each other: sell the speed, and show the next decision.');
      },
    };
  });
})();
