/* Three ships, one seabed (MGM C4 M1, deck slides 28-30). The notes' metaphor: a designer is a ship on a pitch black
   sea that can only measure the water directly under it. Three ships search the same hidden seabed: one pings at
   random, one only ever moves to deeper water next door (and stalls in the 40m dip, a local minimum), and one can see
   which way the ground curves around each ping, so it crosses the ridge to the 100m trench. Then the seabed is shown.
   The curve-reading ship takes the slides' own attempts: 20m, 30m, 40m, 100m. */
(function () {
  const { $, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, LH = 191, GAP = 6, SKY = 40, DY = 1.15;
  // seabed depth in metres at x: a 10m shelf, a 40m dip at x 330 and a 100m trench at x 800, a ridge between
  const depth = x => 10 + 30 * Math.exp(-((x - 330) ** 2) / 9800) + 90 * Math.exp(-((x - 800) ** 2) / 16200);
  const m = x => Math.round(depth(x));
  const seaY = (top, d) => top + SKY + 24 + d * DY;

  // [time the ping lands, x]. The ship sails to x before that time.
  const SHIPS = [
    { name: 'Blind trawl', how: 'pings anywhere at random', col: '#8b8fa8',
      pings: [226, 470, 610, 300, 1000, 160, 540, 390, 40, 640, 100, 960].map((x, i) => [0.9 + i * 1.05, x]) },
    { name: 'Downhill only', how: 'moves to deeper water next door', col: '#e0a92d',
      pings: [[0.9, 226], [2.2, 285], [3.5, 330], [4.8, 375]], stuck: 5.8 },
    { name: 'Reads the curve', how: 'sees which way the seabed slopes', col: '#2ea3dc', see: 300,
      pings: [[0.9, 226], [2.2, 268], [3.5, 330], [7.2, 800]] },
  ];
  const REVEAL = 13.4, DUR = 18;

  function shipX(s, t) {
    const p = s.pings; if (t <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) {
      if (t < p[i][0]) { const go = Math.max(p[i - 1][0] + 0.35, p[i][0] - Math.min(1.6, Math.abs(p[i][1] - p[i - 1][1]) / 250 + 0.4)); return lerp(p[i - 1][1], p[i][1], ease(clamp((t - go) / (p[i][0] - go)))); }
    }
    return p.at(-1)[1];
  }
  function profile(g, top, x0, x1, alpha, dim) {
    if (x1 <= x0 || alpha <= 0) return;
    g.save(); g.globalAlpha = alpha; g.beginPath(); g.moveTo(x0, top + LH);
    for (let x = x0; x <= x1; x += 4) g.lineTo(x, seaY(top, depth(x)));
    g.lineTo(x1, seaY(top, depth(x1))); g.lineTo(x1, top + LH); g.closePath();
    const gr = g.createLinearGradient(0, top + SKY, 0, top + LH); gr.addColorStop(0, dim ? '#6e6146' : '#c9b07a'); gr.addColorStop(1, dim ? '#2c2618' : '#7a6438');
    g.fillStyle = gr; g.fill();
    g.beginPath(); for (let x = x0; x <= x1; x += 4) x === x0 ? g.moveTo(x, seaY(top, depth(x))) : g.lineTo(x, seaY(top, depth(x)));
    g.strokeStyle = dim ? '#9fd6ff' : '#f1dca6'; g.lineWidth = 2.5; g.stroke(); g.restore();
  }
  function boat(g, x, y, col) {
    g.save(); g.translate(x, y);
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(4, -8); g.lineTo(4, -30); g.lineTo(22, -10); g.stroke();
    g.fillStyle = '#e9e1cf'; g.fillRect(-12, -18, 15, 10);
    g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-28, -9); g.lineTo(28, -9); g.lineTo(20, 4); g.lineTo(-22, 4); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function tag(g, x, y, text, size, col, bold) {
    g.font = `${bold ? 800 : 600} ${size}px ${bold ? 'Montserrat, ' : ''}Jost, sans-serif`;
    const w = g.measureText(text).width + 12, bx = clamp(x - w / 2, 4, W - w - 4);
    g.fillStyle = 'rgba(8,12,34,.78)'; g.beginPath(); g.roundRect(bx, y - size / 2 - 5, w, size + 10, 6); g.fill();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, bx + w / 2, y);
  }
  // pings that have landed by t, and the deepest of them
  const landed = (s, t) => s.pings.filter(p => p[0] <= t);
  const deepest = (s, t) => Math.max(0, ...landed(s, t).map(p => m(p[1])));

  function lane(g, s, i, t) {
    const top = i * (LH + GAP), wy = top + SKY + 4, rev = clamp((t - REVEAL) / 1.2);
    g.save(); g.beginPath(); g.roundRect(0, top, W, LH, 12); g.clip();
    // sky band and sea
    g.fillStyle = '#efe6d2'; g.fillRect(0, top, W, SKY);
    const sea = g.createLinearGradient(0, wy, 0, top + LH); sea.addColorStop(0, '#16224a'); sea.addColorStop(1, '#04060f');
    g.fillStyle = sea; g.fillRect(0, wy, W, LH - SKY - 4);
    // what this ship knows of the seabed: a window around each ping for the curve reader, everything once revealed
    if (s.see) {   // one span per ping, merged where they overlap; the newest span fades in
      const got = landed(s, t), old = [];
      got.slice(0, -1).forEach(([, x]) => { const a = Math.max(0, x - s.see), b = Math.min(W, x + s.see), l = old.at(-1); l && a <= l[1] ? l[1] = Math.max(l[1], b) : old.push([a, b]); });
      g.save(); g.globalAlpha = 1 - rev; old.forEach(([a, b]) => profile(g, top, a, b, 1, true)); g.restore();
      const n = got.at(-1); if (n) { g.save(); g.globalAlpha = 1 - rev; profile(g, top, Math.max(0, n[1] - s.see), Math.min(W, n[1] + s.see), clamp((t - n[0]) / 0.8), true); g.restore(); }
    }
    profile(g, top, 0, W, rev);
    if (rev > 0) {   // marks on the revealed seabed
      g.globalAlpha = rev; g.setLineDash([5, 5]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5;
      [[330, 40], [800, 100]].forEach(([x, d]) => { g.beginPath(); g.moveTo(x, wy + 10); g.lineTo(x, seaY(top, d) - 4); g.stroke(); });
      g.setLineDash([]); g.globalAlpha = 1;
    }
    // soundings: old ones as small marks, the newest one dropping
    const seen = landed(s, t + 0.4);
    seen.forEach(([pt, x], k) => {
      g.globalAlpha = 1; const d = depth(x), by = seaY(top, d), drop = clamp((t - (pt - 0.4)) / 0.4), last = k === seen.length - 1;
      g.strokeStyle = last ? 'rgba(143,211,255,.9)' : 'rgba(143,211,255,.28)'; g.lineWidth = last ? 2.5 : 1.5; g.setLineDash([6, 5]);
      g.beginPath(); g.moveTo(x, wy + 8); g.lineTo(x, lerp(wy + 8, by, drop)); g.stroke(); g.setLineDash([]);
      if (drop < 1) return;
      const ring = clamp((t - pt) / 0.6);
      if (last && ring < 1) { g.strokeStyle = `rgba(143,211,255,${1 - ring})`; g.lineWidth = 2; g.beginPath(); g.arc(x, by, 6 + ring * 22, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#8fd3ff'; g.beginPath(); g.arc(x, by, last ? 6 : 4, 0, Math.PI * 2); g.fill();
      if (!last && rev < 1) g.globalAlpha = 1 - rev, tag(g, x, by + 16 > top + LH - 10 ? by - 16 : by + 16, m(x) + 'm', 12, '#c9d6f2');
    });
    if (seen.length) {
      const [pt, x] = seen.at(-1), d = depth(x), n = seen.length, hit = m(x) >= 100;
      if (t >= pt && rev < 1) g.globalAlpha = 1 - rev, tag(g, x, seaY(top, d) + 24 > top + LH - 12 ? seaY(top, d) - 26 : seaY(top, d) + 24, `Attempt ${n}: ${m(x)}m${hit ? '! Jackpot!' : ''}`, hit ? 18 : 15, hit ? C.gold : '#fff', hit);
    }
    // what the ship can see around it
    if (s.see && t < REVEAL) {
      const p = landed(s, t).at(-1);
      if (p && p[1] === 330 && t > p[0] + 0.8) tag(g, 880, wy + 40, 'past the ridge the seabed keeps dropping →', 15, '#8fd3ff');
    }
    if (s.stuck && t > s.stuck && rev < 1) g.globalAlpha = 1 - rev, tag(g, 720, wy + 60, 'every spot next door is shallower: stuck at 40m', 15, C.gold);
    g.globalAlpha = 1;
    if (rev > 0) {
      g.globalAlpha = rev;
      tag(g, 330, seaY(top, 40) + 26, '40m: local minimum', 14, '#fff');
      tag(g, 800, seaY(top, 100) - 40, '100m: the deepest point', 14, C.gold, true);
      g.globalAlpha = 1;
    }
    // surface and ship
    g.strokeStyle = 'rgba(143,211,255,.35)'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = wy + 2 * Math.sin(x / 22 + t * 3); x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    const sx = shipX(s, t); boat(g, sx, wy + 2 + 1.5 * Math.sin(t * 3 + sx / 22), s.col);
    // sky band labels
    g.fillStyle = s.col; g.beginPath(); g.arc(20, top + SKY / 2, 7, 0, Math.PI * 2); g.fill();
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = C.ink; g.font = '800 19px Montserrat, Jost, sans-serif';
    g.fillText(s.name, 34, top + SKY / 2);
    const nw = g.measureText(s.name).width; g.font = '500 16px Jost, sans-serif'; g.fillStyle = C.muted;
    g.fillText(s.how, 46 + nw, top + SKY / 2);
    const n = landed(s, t).length, best = deepest(s, t);
    g.textAlign = 'right'; g.fillStyle = C.ink; g.font = '600 17px Jost, sans-serif';
    g.fillText(`pings ${n}   ·   deepest ${best ? best + 'm' : '–'}`, W - 16, top + SKY / 2);
    g.restore();
  }

  let api;
  FPF.kit.canvasDemo('seabed', (sl, cv, g) => {
    const st = { t: 0, held: false, key: '' };
    $(sl, '.sb-replay').onclick = () => { st.t = 0; };
    function render() {
      const t = st.t;
      g.clearRect(0, 0, W, H);
      SHIPS.forEach((s, i) => lane(g, s, i, t));
      const phase = t < 5 ? 0 : t < 8 ? 1 : t < REVEAL ? 2 : 3;
      const counts = SHIPS.map(s => `${landed(s, t).length}:${deepest(s, t)}`).join('|');
      const key = phase + counts; if (key === st.key) return; st.key = key;
      say($(sl, '.sb-stats'), SHIPS.map((s, i) => {
        const n = landed(s, t).length, best = deepest(s, t);
        return `<div class="${['', 'y', ''][i]}" style="border-left-color:${s.col}"><b>${best ? best + 'm' : '–'}</b><span>${s.name}: deepest after ${n} ping${n === 1 ? '' : 's'}</span></div>`;
      }).join(''));
      say($(sl, '.sb-out'), [
        'Each ship can only measure the water directly under it. All three start on the same spot over the same seabed.',
        'The downhill ship reaches 40m and every spot next to it is shallower, so it stops. The curve reader sees the ground past the ridge falling away and crosses it.',
        'The curve reader found 100m in 4 attempts. The blind trawl keeps pinging and still can’t tell whether it is getting closer.',
        'The seabed revealed: 40m was a local minimum. Understanding depth is seeing which way the ground curves, and knowing when you have really reached the bottom.',
      ][phase]);
    }
    api = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.t > DUR) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
