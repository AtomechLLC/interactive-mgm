/* Log line (RGF C2 M4, 3Cs: Character, Part 3: the Core Theme layer of the Pyramid of Complexity).
   One verb, two log lines: the same walk-and-pick-up input plays under Katamari Damacy's "Roll it up into a star" and
   The Last of Us's "Survive at all costs". The log line decides the tone, the scale, the world and what failure means.
   The scene is a pure function of time and the chosen log line, so window.__seek is deterministic. Original figures;
   the game art comes from the course deck. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const IMG = {};
  const load = n => { if (IMG[n]) return IMG[n]; const i = new Image(); i.src = `img/${n}`; IMG[n] = i; return i; };
  const ok = i => i && i.complete && i.naturalWidth;
  const cover = (g, n, x, y, w, h, fx = .5, fy = .3) => {
    const i = load(n); if (!ok(i)) { g.fillStyle = '#3d4270'; g.fillRect(x, y, w, h); return; }
    const k = Math.max(w / i.naturalWidth, h / i.naturalHeight), sw = w / k, sh = h / k;
    g.drawImage(i, (i.naturalWidth - sw) * fx, (i.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
  };
  const font = (s, w = 600, f = 'Jost') => `${w} ${s}px ${f}, sans-serif`;
  const text = (g, s, x, y, size, col = C.ink, w = 600, align = 'left', fam = 'Jost') => { g.font = font(size, w, fam === 'M' ? 'Montserrat, Jost' : fam); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  function wrap(g, s, x, y, maxW, lh, size, col = C.ink, w = 500) {
    g.font = font(size, w); g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let line = '', yy = y;
    s.split(' ').forEach(word => { const test = line ? line + ' ' + word : word; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = word; yy += lh; } else line = test; });
    if (line) g.fillText(line, x, yy);
    return yy;
  }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const hash = i => { const x = Math.sin(i * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };

  const THEMES = {
    kat: { game: 'Katamari Damacy', tone: 'Whimsical fantasy', log: 'Roll it up into a star', art: 'katamari.jpg', fy: .5, col: '#e04f8c',
      decides: [['Tone', 'Whimsical and silly'], ['Scale', 'Thumbtacks, then cows, then buildings'], ['World', 'Larger-than-life caricatures'], ['Failure', 'Your ball is smaller than you hoped']],
      note: 'Katamari Damacy is about whimsically sticking things together into bigger and bigger balls, so the character and the world are larger-than-life caricatures that let the player break free of the constraints of reality.' },
    tlou: { game: 'The Last of Us', tone: 'Serious reflection', log: 'Survive at all costs', art: 'last-of-us.jpg', fy: .3, col: '#c2852f',
      decides: [['Tone', 'Somber and serious'], ['Scale', 'Human: one bottle, one rag, one shiv'], ['World', 'A grounded, broken city'], ['Failure', 'Death']],
      note: 'The Last of Us is somber and serious: the trauma of an older generation who lost something precious, against the hope of the young to survive and endure. Every pickup is scarce, and every step is a risk.' },
  };
  load(THEMES.kat.art); load(THEMES.tlou.art);

  // the shared input: one path and the same pickup presses in both worlds
  const PATH = [[60, 470], [180, 400], [300, 430], [380, 330], [300, 240], [400, 170], [470, 250]];
  const LOOP = 9;
  const ITEMS = [[150, 418], [250, 405], [330, 395], [360, 300], [320, 250], [380, 180], [440, 190], [465, 235]];
  const KAT = ['pencil', 'dice', 'cat', 'bike', 'cow', 'tree', 'house', 'cloud'];
  const TLOU = ['scrap', null, 'bottle', null, 'rag', null, null, 'blade'];
  function along(k) {
    const segs = PATH.length - 1, f = clamp(k) * segs, i = Math.min(segs - 1, Math.floor(f)), q = f - i;
    return [lerp(PATH[i][0], PATH[i + 1][0], q), lerp(PATH[i][1], PATH[i + 1][1], q)];
  }
  function scene(g, id, t, x0, y0, w, h) {
    const th = THEMES[id], k = clamp(t / (LOOP - 1.2)), [px, py] = along(ease(k));
    g.save(); g.translate(x0, y0); rr(g, 0, 0, w, h, 10); g.clip();
    // when each item is reached (first time the walker passes within 34px)
    const reach = ITEMS.map(([ix, iy]) => { for (let s = 0; s <= 200; s++) { const [ax, ay] = along(ease(s / 200)); if (Math.hypot(ax - ix, ay - iy) < 34) return s / 200 * (LOOP - 1.2); } return 99; });
    const pathLine = col => { g.save(); g.setLineDash([6, 8]); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); PATH.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore(); };
    if (id === 'kat') {
      g.fillStyle = '#9ee07a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c8f0a8'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(hash(i) * w, hash(i + 50) * h, 10 + hash(i + 9) * 20, 0, TAU); g.fill(); }
      // rainbow
      ['#ff6b6b', '#ffb951', '#ffe066', '#7bd389', '#6fa8ff', '#b28dff'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 7; g.globalAlpha = .55; g.beginPath(); g.arc(w - 90, 140, 120 - i * 7, Math.PI, TAU); g.stroke(); });
      g.globalAlpha = 1; pathLine('rgba(59,53,82,.3)');
      const got = ITEMS.filter((_, i) => t >= reach[i]).length, r = 16 + got * 4.5;
      ITEMS.forEach(([ix, iy], i) => {
        const s = 1 + i * .35, gone = t >= reach[i];
        if (gone) return;
        g.save(); g.translate(ix, iy); g.scale(s, s);
        g.fillStyle = ['#ffd84d', '#fff', '#ff9f43', '#4dabf7', '#fff', '#2f9e44', '#e8590c', '#e9ecef'][i]; g.strokeStyle = '#3b3552'; g.lineWidth = 1.5;
        rr(g, -8, -8, 16, 16, 4); g.fill(); g.stroke();
        g.restore();
        T.label(KAT[i], ix, iy - 14 - i * 4, 'center', '#3b3552', 11, 'rgba(255,255,255,.75)');
      });
      // the ball, studded with what it has rolled up
      g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(px + 4, py + r * .8, r, r * .35, 0, 0, TAU); g.fill();
      g.fillStyle = '#ff8fc7'; g.strokeStyle = '#3b3552'; g.lineWidth = 2; g.beginPath(); g.arc(px + 10, py - r * .4, r, 0, TAU); g.fill(); g.stroke();
      for (let i = 0; i < got; i++) { const a = i * 2.1 + t * 2; g.fillStyle = ['#ffd84d', '#fff', '#ff9f43', '#4dabf7', '#fff', '#2f9e44', '#e8590c', '#e9ecef'][i]; rr(g, px + 10 + Math.cos(a) * r * .6 - 5, py - r * .4 + Math.sin(a) * r * .6 - 5, 10, 10, 2); g.fill(); }
      // the tiny prince pushing it
      g.fillStyle = '#7bd389'; g.beginPath(); g.arc(px - r * .9, py - 8, 7, 0, TAU); g.fill(); g.fillStyle = '#3b3552'; g.fillRect(px - r * .9 - 1, py - 22, 2, 8);
      ITEMS.forEach((_, i) => { const a = t - reach[i]; if (a >= 0 && a < .8) T.popText('+ ' + KAT[i] + '!', px, py - r - 20 - a * 30, '#c2255c', (1 - a / .8) * 1.4); });
      text(g, `Ball size: ${Math.round(r * 2)} cm`, 14, h - 14, 15, '#3b3552', 800, 'left', 'M');
    } else {
      g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
      // rubble and broken blocks
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${110 + hash(i) * 40},${105 + hash(i) * 30},${98},.9)`; g.fillRect(hash(i + 3) * w, hash(i + 7) * h, 20 + hash(i + 11) * 50, 14 + hash(i + 13) * 30); }
      g.strokeStyle = 'rgba(80,110,60,.6)'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(hash(i + 20) * w, hash(i + 30) * h); g.quadraticCurveTo(hash(i + 40) * w, hash(i + 50) * h, hash(i + 60) * w, hash(i + 70) * h); g.stroke(); }
      pathLine('rgba(230,220,190,.35)');
      // an infected wanders
      const ex = 260 + Math.sin(t * .7) * 120, ey = 120 + Math.cos(t * .5) * 40;
      g.fillStyle = 'rgba(255,90,90,.12)'; g.beginPath(); g.arc(ex, ey, 70, 0, TAU); g.fill();
      g.fillStyle = '#b35a3c'; g.beginPath(); g.arc(ex, ey, 9, 0, TAU); g.fill();
      ITEMS.forEach(([ix, iy], i) => { if (!TLOU[i] || t >= reach[i]) return; g.fillStyle = '#e0c060'; g.beginPath(); g.arc(ix, iy, 5, 0, TAU); g.fill(); T.label(TLOU[i], ix, iy - 12, 'center', '#3b3552', 11, 'rgba(255,240,200,.8)'); });
      // the survivor, crouched
      g.fillStyle = '#d9c7a3'; g.beginPath(); g.arc(px, py, 8, 0, TAU); g.fill(); g.fillStyle = '#5a6b3a'; g.beginPath(); g.ellipse(px, py + 10, 9, 6, 0, 0, TAU); g.fill();
      // darkness with a flashlight cone
      g.save(); g.globalCompositeOperation = 'source-over';
      const dark = g.createRadialGradient(px, py, 30, px, py, 190); dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(1, 'rgba(0,0,0,.5)');
      g.fillStyle = dark; g.fillRect(0, 0, w, h); g.restore();
      const inv = ITEMS.filter((_, i) => TLOU[i] && t >= reach[i]).map((_, i) => i);
      ITEMS.forEach((_, i) => { const a = t - reach[i]; if (a >= 0 && a < .8) T.popText(TLOU[i] ? '+ ' + TLOU[i] : 'nothing here', px, py - 30 - a * 24, TLOU[i] ? '#ffe599' : '#9aa0a8', (1 - a / .8) * 1.4); });
      const near = Math.hypot(px - ex, py - ey) < 90;
      if (near) T.label('Stay low. It will hear you.', px, py + 34, 'center', '#ffb4ae', 13, 'rgba(40,20,20,.85)');
      // tiny inventory
      text(g, 'Pack', 14, h - 40, 13, '#d9d2c2', 700);
      for (let i = 0; i < 4; i++) { g.strokeStyle = '#d9d2c2'; g.lineWidth = 1.5; rr(g, 14 + i * 34, h - 34, 28, 22, 4); g.stroke(); if (i < inv.length) { g.fillStyle = '#e0c060'; rr(g, 18 + i * 34, h - 30, 20, 14, 3); g.fill(); } }
    }
    g.restore();
  }
  function draw(g, id, t, since) {
    const th = THEMES[id];
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.92)'; rr(g, 0, 0, W, H, 14); g.fill();
    // left: the log line card
    const lx = 12, lw = 400;
    g.fillStyle = '#152044'; rr(g, lx, 12, lw, H - 24, 12); g.fill();
    g.save(); rr(g, lx, 12, lw, 210, [12, 12, 0, 0]); g.clip(); cover(g, th.art, lx, 12, lw, 210, .5, th.fy);
    g.fillStyle = 'rgba(13,20,36,.72)'; g.fillRect(lx, 196, lw, 26); text(g, 'From the course deck', lx + 12, 214, 13, '#fffaf0', 600); g.restore();
    text(g, th.game, lx + 20, 252, 15, '#c9d3f0', 700);
    text(g, 'Core theme · ' + th.tone, lx + 20, 274, 13, th.col, 800, 'left', 'M');
    const fade = clamp(since / .5);
    g.save(); g.globalAlpha = fade;
    g.font = font(28, 800, 'Montserrat, Jost'); g.fillStyle = '#fffaf0'; g.textAlign = 'left';
    wrap(g, '"' + th.log + '"', lx + 20, 312, lw - 40, 34, 28, '#fffaf0', 800);
    text(g, 'The log line decides', lx + 20, 384, 13, '#c9d3f0', 700);
    th.decides.forEach(([k, v], i) => {
      const y = 404 + i * 40, a = clamp((since - .3 - i * .25) / .4);
      g.save(); g.globalAlpha *= a;
      g.fillStyle = 'rgba(255,255,255,.07)'; rr(g, lx + 16, y, lw - 32, 34, 8); g.fill();
      text(g, k, lx + 28, y + 22, 14, th.col, 800, 'left', 'M'); text(g, v, lx + 120, y + 22, 15, '#fffaf0', 500);
      g.restore();
    });
    g.restore();
    // right: the same input in the world this log line builds
    const sx = 426, sw = W - sx - 12;
    text(g, 'Same input in both: walk this path and pick things up.', sx, 34, 16, C.ink, 700);
    scene(g, id, t % LOOP, sx, 46, sw, H - 58);
  }
  const scenes = {};
  const DUR = LOOP * 2;
  canvasDemo('log', (s, cv, g) => {
    const st = { id: 'kat', t: 0, at: 0, tour: true, held: false, key: '' };
    const tourBtn = $(s, '.ll-tour');
    const free = () => { st.held = false; st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.ll-pick .btn').forEach(b => b.onclick = () => { free(); st.id = b.dataset.id; st.at = st.t; st.t0 = st.t; });
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render(t) {
      let id = st.id, local = t - (st.t0 || 0), since = t - st.at;
      if (st.tour) { const tt = t % DUR; id = tt < LOOP ? 'kat' : 'tlou'; local = tt % LOOP; since = local; }
      draw(g, id, local, since);
      if (st.key === id) return; st.key = id;
      $$(s, '.ll-pick .btn').forEach(b => b.classList.toggle('on', b.dataset.id === id));
      say($(s, '.ll-out'), THEMES[id].note);
    }
    scenes.log = { seek(t) { st.held = true; st.tour = true; render(t); }, dur: () => DUR };
    return dt => { if (st.held) return; st.t += dt; if (st.tour && st.t >= DUR) st.t = 0; render(st.t); };
  });
  window.__seek = (t, which = 'log') => scenes[which].seek(t);
  window.__dur = (which = 'log') => scenes[which].dur();
})();
