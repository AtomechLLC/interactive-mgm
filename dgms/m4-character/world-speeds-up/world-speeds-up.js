/* The world speeds up (Module 4, slide 82: The Last of Us). Carrying Sarah, Joel could have been slowed; instead "they kept
   movement speed the same as usual, but the world accelerates around you."
   Two runs of one scene. Left: Joel slowed to s of his usual speed, world clock 1×. Right: Joel at his usual speed,
   world clock 1/s×. Measured against the world, Joel's pace is s in both, so the chasers close in identically; only the
   speed of the player's own controls differs. Original art. The scene is a pure function of world time, so __seek is exact. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, PW = 512, M = 26, NORMAL = 5, LOOP = 8;   // px per metre, usual run speed m/s, world-seconds per loop
  const hash = i => { const x = Math.sin(i * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };

  // a running adult carrying a child (original shapes): phase drives the stride
  function runner(g, x, y, phase, col, carry) {
    const sw = Math.sin(phase), sw2 = Math.sin(phase + Math.PI);
    g.save(); g.translate(x, y); g.lineCap = 'round';
    g.strokeStyle = col; g.lineWidth = 9;
    [[sw, 0], [sw2, 1]].forEach(([s]) => { g.beginPath(); g.moveTo(0, -46); g.lineTo(s * 12, -24); g.lineTo(s * 18 + (s < 0 ? -4 : 6), 0); g.stroke(); });
    g.lineWidth = 15; g.beginPath(); g.moveTo(0, -46); g.lineTo(5, -84); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(8, -98, 11, 0, TAU); g.fill();
    if (carry) {
      // the child, held across the chest, arms around the neck
      g.fillStyle = '#e0a92d'; g.beginPath(); g.ellipse(18, -76, 15, 9, -.5, 0, TAU); g.fill();
      g.beginPath(); g.arc(20, -94, 7.5, 0, TAU); g.fill();
      g.strokeStyle = '#e0a92d'; g.lineWidth = 5; g.beginPath(); g.moveTo(26, -70); g.lineTo(34, -58); g.stroke();
      g.strokeStyle = col; g.lineWidth = 7; g.beginPath(); g.moveTo(6, -80); g.lineTo(22, -66); g.lineTo(30, -78); g.stroke();
    } else {
      g.lineWidth = 7; g.beginPath(); g.moveTo(5, -80); g.lineTo(5 + sw2 * 14, -60); g.stroke(); g.beginPath(); g.moveTo(5, -80); g.lineTo(5 + sw * 14, -58); g.stroke();
    }
    g.restore();
  }
  function chaser(g, x, y, phase) {
    const sw = Math.sin(phase);
    g.save(); g.translate(x, y); g.lineCap = 'round'; g.strokeStyle = '#ff6b5e'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(0, -44); g.lineTo(sw * 14, -22); g.lineTo(sw * 20, 0); g.stroke();
    g.beginPath(); g.moveTo(0, -44); g.lineTo(-sw * 14, -22); g.lineTo(-sw * 18, 0); g.stroke();
    g.lineWidth = 13; g.beginPath(); g.moveTo(0, -44); g.lineTo(9, -80); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(8, -76); g.lineTo(34, -70 + sw * 4); g.moveTo(8, -74); g.lineTo(32, -60 - sw * 4); g.stroke();
    g.fillStyle = '#ff6b5e'; g.beginPath(); g.arc(14, -92, 10, 0, TAU); g.fill();
    g.restore();
  }

  // one run, drawn in a panel at ox. w = world time (s), s = Joel's pace against the world
  function panel(g, ox, w, s, title, sub, real, k) {
    g.save(); g.translate(ox, 0); g.beginPath(); g.roundRect(0, 0, PW, H, 12); g.clip();
    const lw = w % LOOP, px = s * NORMAL * w;   // Joel's world position in metres
    const cam = px * M - 330, gy = 440;
    const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#2a2e55'); sky.addColorStop(1, '#c86a3a'); g.fillStyle = sky; g.fillRect(0, 0, PW, gy);
    // skyline (parallax)
    for (let i = Math.floor(cam * .3 / 70) - 1; i < Math.floor(cam * .3 / 70) + 10; i++) {
      const bx = i * 70 - cam * .3, bh = 120 + hash(i) * 150;
      g.fillStyle = '#3d4270'; g.fillRect(bx, gy - bh, 62, bh);
      g.fillStyle = 'rgba(255,200,120,.5)'; for (let r = 0; r < 4; r++) if (hash(i * 7 + r) > .55) g.fillRect(bx + 10 + (r % 2) * 26, gy - bh + 20 + r * 26, 12, 14);
    }
    // smoke columns drift with the world clock
    for (let i = 0; i < 3; i++) { const sx = ((i * 190 + 60 - cam * .5) % (PW + 200) + PW + 200) % (PW + 200) - 100; for (let j = 0; j < 6; j++) { const ph = (w * .35 + j / 6 + i * .3) % 1; g.fillStyle = `rgba(60,55,70,${.35 * (1 - ph)})`; g.beginPath(); g.arc(sx + Math.sin(ph * 6 + i) * 14, gy - 120 - ph * 220, 18 + ph * 30, 0, TAU); g.fill(); } }
    // street
    g.fillStyle = '#4a4f63'; g.fillRect(0, gy, PW, H - gy); g.fillStyle = '#6b7088'; g.fillRect(0, gy, PW, 8);
    g.fillStyle = '#e0c060'; for (let i = Math.floor(cam / 80) - 1; i < Math.floor(cam / 80) + 9; i++) g.fillRect(i * 80 - cam, gy + 60, 40, 6);
    // burning cars every 14 m: flames flicker on the world clock
    for (let i = Math.floor(cam / M / 14) - 1; i < Math.floor(cam / M / 14) + 3; i++) {
      const cx = i * 14 * M + 260 - cam; if (cx < -160 || cx > PW + 160) continue;
      g.fillStyle = '#262c3a'; g.beginPath(); g.roundRect(cx - 60, gy - 34, 120, 30, 8); g.fill(); g.beginPath(); g.roundRect(cx - 34, gy - 56, 70, 26, 8); g.fill();
      g.fillStyle = '#151a22'; [cx - 36, cx + 36].forEach(wx => { g.beginPath(); g.arc(wx, gy - 4, 13, 0, TAU); g.fill(); });
      for (let f = 0; f < 5; f++) { const fl = Math.sin(w * 14 + f * 1.7 + i) * .5 + .5; g.fillStyle = f % 2 ? '#ffb951' : '#e5322d'; g.beginPath(); g.ellipse(cx - 24 + f * 12, gy - 64 - fl * 16, 7, 16 + fl * 14, 0, 0, TAU); g.fill(); }
    }
    // lamp posts every 4 m
    for (let i = Math.floor(cam / M / 4) - 1; i < Math.floor(cam / M / 4) + 5; i++) { const lx = i * 4 * M - cam; g.fillStyle = '#20243f'; g.fillRect(lx, gy - 170, 6, 170); g.fillRect(lx - 14, gy - 170, 26, 6); const on = hash(i) > .3 && Math.sin(w * 9 + i * 3) > -.6; if (on) { g.fillStyle = 'rgba(255,220,140,.9)'; g.beginPath(); g.arc(lx - 8, gy - 160, 7, 0, TAU); g.fill(); } }
    // falling debris on the world clock
    for (let i = 0; i < 7; i++) { const ph = (w * .8 + hash(i + 40)) % 1, dx = ((hash(i) * 900 - cam * .9) % (PW + 100) + PW + 100) % (PW + 100) - 50; g.fillStyle = '#ffb951'; g.globalAlpha = 1 - ph; g.fillRect(dx + Math.sin(ph * 9 + i) * 10, ph * gy, 4, 4); g.globalAlpha = 1; }
    // chasers close in on the world clock: from 9 m behind to 2.5 m behind over one loop
    const gap = lerp(9, 2.5, lw / LOOP);
    [0, 1.6].forEach((o, j) => chaser(g, (px - gap - o) * M - cam, gy + 2 - j * 4, w * 11 + j * 2));
    runner(g, px * M - cam, gy + 2, px * 2.6, '#f2ead6', true);
    // readouts
    g.fillStyle = 'rgba(255,252,244,.93)'; g.beginPath(); g.roundRect(12, 12, PW - 24, 138, 10); g.fill();
    T.use(g);
    g.font = '800 17px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(title, 26, 38);
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(sub, 26, 58);
    g.font = '700 15px Jost, sans-serif'; g.fillStyle = C.ink;
    g.fillText(`Joel's controls: ${real.toFixed(1)} m/s`, 26, 84); g.fillText(`World clock: ${k.toFixed(2)}×`, 240, 84);
    g.fillStyle = '#1a6b8a'; g.fillText(`Pace against the world: ${Math.round(s * 100)}%`, 26, 110);
    g.fillStyle = C.red; g.fillText(`Chasers gain ${(6.5 / LOOP).toFixed(2)} m on Joel per second of world time`, 26, 134);
    g.restore();
  }

  function draw(g, t, s) {
    T.use(g); g.clearRect(0, 0, W, H);
    const k = 1 / s;
    panel(g, 0, t, s, 'Slow the player', 'Joel slowed, the world as usual', s * NORMAL, 1);
    panel(g, PW + 16, t * k, s, 'Speed up the world', 'Joel as usual, everything else faster', NORMAL, k);
  }

  const scenes = {};
  canvasDemo('world', (s, cv, g) => {
    const st = { s: .5, tour: true, held: false, t: 0, key: '' };
    const sl = $(s, '.ws-s'), tourBtn = $(s, '.ws-tour');
    sl.oninput = () => { st.tour = false; tourBtn.classList.remove('on'); st.s = +sl.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.s = .5; tourBtn.classList.add('on'); };
    function info() {
      if (st.key === st.s) return; st.key = st.s; sl.value = st.s;
      $(s, '.ws-v').textContent = `${Math.round(st.s * 100)}% speed`;
      say($(s, '.ws-stats'), `<div><b>${(st.s * NORMAL).toFixed(1)}</b><span>m/s on the stick, left: slowed</span></div><div class="g"><b>${NORMAL.toFixed(1)}</b><span>m/s on the stick, right: as usual</span></div><div class="y"><b>${Math.round(st.s * 100)}%</b><span>pace against the world, in both runs</span></div>`);
      say($(s, '.ws-out'), st.s >= 1 ? 'With no slowdown the two runs are identical. Drag the slider to add the weight of the child.'
        : `Both runs show the same chase: the chasers gain at the same rate against Joel. Only the left one makes the controls feel heavy. “They instead kept movement speed the same as usual, but the world accelerates around you.”`);
    }
    scenes.world = { seek(t) { st.held = true; st.s = .5; draw(g, t, .5); info(); }, dur: () => LOOP };
    return dt => {
      if (st.held) return;
      st.t += dt; if (st.tour && st.t >= LOOP) st.t = 0;
      draw(g, st.t, st.s); info();
    };
  });
  window.__seek = (t, which = 'world') => scenes[which].seek(t);
  window.__dur = (which = 'world') => scenes[which].dur();
})();
