/* The camera has a name (mock-up for DGMS M6, beside the camera rigs): Super Mario 64's Lakitu camera.
   Mario runs a loop through a small walled level. Lakitu follows on a cloud: his yaw trails Mario's heading, the
   C buttons add 45-degree turns around Mario, and walls push him in toward Mario. Mario cam is closer and stiffer.
   Left: the level from above, with Lakitu and his view cone. Right: what he films, as a simple ray-cast sketch.
   The camera is re-simulated from t = 0 with a fixed step and a list of button events, so frames depend on t only. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, DT = 0.02, CELL = 34, OX = 18, OY = 36;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const bg = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const MAP = [
    '################',
    '#..............#',
    '#..##......##..#',
    '#..##......##..#',
    '#..............#',
    '#......##......#',
    '#......##......#',
    '#..............#',
    '#.###......###.#',
    '#..............#',
    '#....#....#....#',
    '#....#....#....#',
    '#..............#',
    '################',
  ];
  const wall = (x, y) => { const cx = Math.floor((x - OX) / CELL), cy = Math.floor((y - OY) / CELL); return cy < 0 || cy >= MAP.length || cx < 0 || cx >= 16 || MAP[cy][cx] === '#'; };
  const P = ([cx, cy]) => [OX + cx * CELL, OY + cy * CELL];
  const PATH = [[1.5, 4.5], [14.5, 4.5], [14.5, 9.5], [7.5, 9.5], [7.5, 12.5], [1.5, 12.5]].map(P);
  const SEGS = PATH.map((p, i) => { const q = PATH[(i + 1) % PATH.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]); return { p, q, len, a: Math.atan2(q[1] - p[1], q[0] - p[0]) }; });
  const LOOP = SEGS.reduce((a, s) => a + s.len, 0), SPEED = 105;
  function mario(t) { let d = (t * SPEED) % LOOP; for (const s of SEGS) { if (d <= s.len) { const f = d / s.len; return { x: lerp(s.p[0], s.q[0], f), y: lerp(s.p[1], s.q[1], f), a: s.a }; } d -= s.len; } return { x: PATH[0][0], y: PATH[0][1], a: 0 }; }
  const COINS = [[4.5, 1.5], [7.5, 1.5], [10.5, 1.5], [9.5, 7.5], [12.5, 9.5], [3.5, 9.5], [3.5, 12.5], [12.5, 12.5], [5.5, 6.5]].map(P);
  const GOOMBAS = [[10.5, 6.5], [4.5, 7.5], [12.5, 11.5]].map(P);
  const angTo = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const MODES = { lakitu: { dist: 140, rate: 1.6 }, mario: { dist: 78, rate: 7 } };
  function sim(events, t) {
    let m = mario(0), yaw = m.a, off = 0, mode = 'lakitu', ei = 0, out = null;
    const ev = events.slice().sort((a, b) => a[0] - b[0]);
    for (let s = 0; s <= t + 1e-9; s += DT) {
      while (ei < ev.length && ev[ei][0] <= s) { const [, k, v] = ev[ei++]; if (k === 'c') off += v * Math.PI / 4; else mode = v; }
      m = mario(s); const M = MODES[mode];
      yaw += angTo(yaw, m.a + off) * Math.min(1, M.rate * DT);
      const want = M.dist; let d = 0; const ux = -Math.cos(yaw), uy = -Math.sin(yaw);
      while (d < want && !wall(m.x + ux * (d + 6), m.y + uy * (d + 6))) d += 3;
      out = { m, yaw, off, mode, x: m.x + ux * d, y: m.y + uy * d, d, blocked: d < want - 4 };
    }
    return out;
  }
  function cloud(g, x, y, s) {
    g.fillStyle = '#fff'; g.strokeStyle = 'rgba(21,32,68,.5)'; g.lineWidth = 1.5;
    [[-9, 3, 9], [0, 0, 11], [9, 3, 9]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); g.stroke(); });
    g.fillStyle = '#7cc46a'; g.beginPath(); g.arc(x, y - 9 * s, 6 * s, 0, TAU); g.fill(); g.strokeStyle = C.navy; g.stroke();
    g.fillStyle = '#152044'; g.fillRect(x + 4 * s, y - 12 * s, 7 * s, 5 * s);   // the film camera
  }
  function drawMap(g, c, t) {
    MAP.forEach((row, y) => [...row].forEach((ch, x) => { g.fillStyle = ch === '#' ? '#5a5f92' : (x + y) % 2 ? '#bfe0a4' : '#b3d897'; g.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL); }));
    COINS.forEach(([x, y]) => { g.fillStyle = '#f5c518'; g.beginPath(); g.ellipse(x, y, 5, 7, 0, 0, TAU); g.fill(); });
    GOOMBAS.forEach(([x, y]) => { g.fillStyle = '#8a5a2b'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); });
    // view cone from Lakitu toward Mario
    const va = Math.atan2(c.m.y - c.y, c.m.x - c.x), R = 230;
    g.save(); g.beginPath(); g.rect(OX, OY, 16 * CELL, MAP.length * CELL); g.clip();
    g.fillStyle = 'rgba(255,185,81,.22)'; g.beginPath(); g.moveTo(c.x, c.y); g.arc(c.x, c.y, R, va - 0.52, va + 0.52); g.closePath(); g.fill();
    g.strokeStyle = c.blocked ? C.red : 'rgba(21,32,68,.45)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(c.m.x, c.m.y); g.stroke(); g.setLineDash([]);
    g.restore();
    // Mario
    g.fillStyle = '#e5322d'; g.beginPath(); g.arc(c.m.x, c.m.y, 9, 0, TAU); g.fill(); g.fillStyle = '#2f5fd0'; g.beginPath(); g.arc(c.m.x, c.m.y, 4.5, 0, TAU); g.fill();
    g.strokeStyle = '#e5322d'; g.lineWidth = 3; g.beginPath(); g.moveTo(c.m.x, c.m.y); g.lineTo(c.m.x + Math.cos(c.m.a) * 16, c.m.y + Math.sin(c.m.a) * 16); g.stroke();
    cloud(g, c.x, c.y, c.mode === 'mario' ? 0.8 : 1);
    if (c.blocked) T.label('a wall: Lakitu has to move in', c.x, c.y - 30, 'center', '#fff', 12, C.red);
  }
  function drawView(g, c) {
    const VX = 630, VY = 36, VW = 392, VH = 260, NC = 196, FOV = 1.05, cw = VW / NC;
    const va = Math.atan2(c.m.y - c.y, c.m.x - c.x), zb = new Float32Array(NC);
    g.save(); g.beginPath(); g.roundRect(VX, VY, VW, VH, 10); g.clip();
    g.fillStyle = '#9fd3f5'; g.fillRect(VX, VY, VW, VH / 2); g.fillStyle = '#9ccd7c'; g.fillRect(VX, VY + VH / 2, VW, VH / 2);
    for (let i = 0; i < NC; i++) {
      const rel = (i / (NC - 1) - 0.5) * FOV, a = va + rel, dx = Math.cos(a), dy = Math.sin(a);
      let d = 0, hit = false, side = 0;
      while (d < 700) { d += 2; const x = c.x + dx * d, y = c.y + dy * d; if (wall(x, y)) { hit = true; side = wall(x - dx * 2, y) ? 1 : 0; break; } }
      const perp = d * Math.cos(rel); zb[i] = hit ? perp : 1e9;
      if (!hit) continue;
      const h = Math.min(VH * 1.4, 7600 / perp), shade = clamp(1 - perp / 650, 0.35, 1);
      g.fillStyle = side ? `rgba(70,76,130,${shade})` : `rgba(96,102,160,${shade})`; g.fillRect(VX + i * cw, VY + VH / 2 - h / 2, cw + 0.6, h);
    }
    const sprites = [...COINS.map(p => ({ p, k: 'coin' })), ...GOOMBAS.map(p => ({ p, k: 'goomba' })), { p: [c.m.x, c.m.y], k: 'mario' }]
      .map(s => { const dx = s.p[0] - c.x, dy = s.p[1] - c.y; return { ...s, d: Math.hypot(dx, dy), rel: angTo(va, Math.atan2(dy, dx)) }; })
      .filter(s => Math.abs(s.rel) < FOV / 2 + 0.1 && s.d > 8).sort((a, b) => b.d - a.d);
    sprites.forEach(s => {
      const col = Math.round((s.rel / FOV + 0.5) * (NC - 1)); if (col >= 0 && col < NC && zb[col] < s.d * Math.cos(s.rel)) return;
      const sx = VX + (s.rel / FOV + 0.5) * VW, k = 7600 / (s.d * Math.cos(s.rel)), gy = VY + VH / 2 + k / 2;
      if (s.k === 'coin') { g.fillStyle = '#f5c518'; g.beginPath(); g.ellipse(sx, gy - k * 0.35, k * 0.08, k * 0.12, 0, 0, TAU); g.fill(); }
      else if (s.k === 'goomba') { g.fillStyle = '#8a5a2b'; g.beginPath(); g.ellipse(sx, gy - k * 0.13, k * 0.16, k * 0.13, 0, 0, TAU); g.fill(); g.fillStyle = '#f2d7a8'; g.fillRect(sx - k * 0.08, gy - k * 0.06, k * 0.16, k * 0.06); }
      else { const u = k * 0.25; g.fillStyle = '#2f5fd0'; g.fillRect(sx - u * 0.45, gy - u * 1.1, u * 0.9, u * 1.1); g.fillStyle = '#e5322d'; g.fillRect(sx - u * 0.5, gy - u * 1.75, u, u * 0.75); g.fillStyle = '#f2c79c'; g.beginPath(); g.arc(sx, gy - u * 2.05, u * 0.38, 0, TAU); g.fill(); g.fillStyle = '#e5322d'; g.fillRect(sx - u * 0.45, gy - u * 2.45, u * 0.9, u * 0.22); }
    });
    // HUD camera icon, bottom right, as in the game
    g.fillStyle = 'rgba(21,32,68,.55)'; g.beginPath(); g.roundRect(VX + VW - 132, VY + VH - 44, 124, 36, 8); g.fill();
    cloud(g, VX + VW - 110, VY + VH - 22, 0.75); txt(g, c.mode === 'mario' ? 'Mario cam' : 'Lakitu cam', VX + VW - 90, VY + VH - 25, { font: '800 13px Montserrat', col: '#fff' });
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(VX, VY, VW, VH, 10); g.stroke();
    txt(g, 'what Lakitu is filming', VX, VY - 14, { font: '700 13px Jost', col: C.muted });
    txt(g, 'the level from above', OX, OY - 14, { font: '700 13px Jost', col: C.muted });
    // readout
    const y0 = VY + VH + 34;
    [['distance from Mario', `${Math.round(c.d)} px of ${MODES[c.mode].dist}`], ['circled by C presses', `${Math.round(c.off * 180 / Math.PI)}°`], ['trails Mario\'s turns', c.mode === 'mario' ? 'tightly' : 'lazily, like a cameraman']].forEach(([k, v], i) => {
      txt(g, k, VX, y0 + i * 28, { font: '600 14px Jost', col: C.muted }); txt(g, v, VX + VW, y0 + i * 28, { font: '800 14px Montserrat', col: C.navy, align: 'right' });
    });
    if (c.blocked) txt(g, 'A wall stands where Lakitu wants to be, so he floats in closer.', VX, y0 + 100, { font: '700 13px Jost', col: C.red });
  }
  const TOUR = [[4, 'c', 1], [5.5, 'c', 1], [9, 'c', -1], [10, 'c', -1], [14, 'm', 'mario'], [21, 'm', 'lakitu']];
  canvasDemo('lakitu', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, key: '', ev: [], cache: null }, tourBtn = $(s, '.lk-tour'), seg = $$(s, '.lk-mode button');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.ev = [[0, 'm', 'lakitu']]; st.t = 0; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    seg.forEach(b => b.onclick = () => { manual(); st.ev.push([st.t, 'm', b.dataset.m]); });
    $(s, '.lk-cl').onclick = () => { manual(); st.ev.push([st.t, 'c', -1]); };
    $(s, '.lk-cr').onclick = () => { manual(); st.ev.push([st.t, 'c', 1]); };
    function info(c, cap) {
      seg.forEach(b => b.classList.toggle('on', b.dataset.m === c.mode));
      const k = cap + c.mode + c.blocked + c.off; if (k === st.key) return; st.key = k;
      say($(s, '.lk-stats'), `<div class="y"><b>${c.mode === 'mario' ? 'Mario' : 'Lakitu'}</b><span>camera mode: ${c.mode === 'mario' ? 'close, stiff follow' : 'wide, trailing shot'}</span></div><div class="${c.blocked ? 'r' : 'g'}"><b>${c.blocked ? 'wall' : 'clear'}</b><span>${c.blocked ? 'Lakitu pushed in toward Mario' : 'Lakitu at his chosen distance'}</span></div>`);
      say($(s, '.lk-out'), cap);
    }
    const DUR = 28;
    const cap = t => t < 4 ? 'Lakitu rides behind Mario on his cloud and films him. When Mario turns, Lakitu takes a moment to swing around, like a real camera operator.'
      : t < 11 ? 'The C buttons ask Lakitu to circle 45 degrees at a time. The player directs; Lakitu does the moving.'
      : t < 14 ? 'Walls are solid for Lakitu too. When one is in his way, he floats in closer, and the player sees why the shot changed.'
      : t < 21 ? 'R switches to Mario cam: closer and stiffer. The icon in the corner tells the player who is holding the camera.'
      : 'A follow camera with a name, a body and a reason. Players forgive a cameraman more readily than a rule.';
    s._seek = t => { const c = sim(TOUR, t); bg(g); drawMap(g, c, t); drawView(g, c); info(c, cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      if (st.t > 60) { st.t = 0; st.ev = [[0, 'm', st.ev.filter(e => e[1] === 'm').pop()?.[2] || 'lakitu'], [0, 'c', 0]]; }
      const c = sim(st.ev, st.t); bg(g); drawMap(g, c, st.t); drawView(g, c);
      info(c, 'You direct, Lakitu films. Use ◀ C and C ▶ to send him around Mario, and switch between his wide shot and Mario cam.');
    };
  });
})();
