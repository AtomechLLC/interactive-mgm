/* Go board size (MGM C4 M1, deck slide 93). The same game on 9x9, 19x19 and 31x31. The shaded band is every point within
   d lines of an edge, where the edge still presses on the fight; the plain middle is where play turns self-similar.
   share(n, d) is the whole model: points in the band over all points. A few stones are dropped as the board grows so
   the middle can be seen filling with the same shapes. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, SIZES = [9, 19, 31];
  const share = (n, d) => { const inner = Math.max(0, n - 2 * d); return { all: n * n, edge: n * n - inner * inner, mid: inner * inner }; };
  const pct = (a, b) => Math.round(100 * a / b);

  // a fixed scatter of stones so every frame is the same picture
  function stones(n) {
    let s = n * 7919; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const out = []; for (let i = 0; i < Math.round(n * n * .16); i++) out.push([Math.floor(r() * n), Math.floor(r() * n), r() < .5]);
    return out;
  }
  const STONES = Object.fromEntries(SIZES.map(n => [n, stones(n)]));

  function board(g, n, d, x0, y0, S, a = 1) {
    const step = S / (n - 1 + 1.2), ox = x0 + step * .6, oy = y0 + step * .6, end = step * (n - 1);
    g.save(); g.globalAlpha = a;
    g.fillStyle = '#e2b866'; g.strokeStyle = '#8a5a1c'; g.lineWidth = 3; g.beginPath(); g.roundRect(x0, y0, S, S, 10); g.fill(); g.stroke();
    // edge band
    const inner = n - 1 - 2 * d;
    g.fillStyle = '#9cc9dc';
    g.fillRect(ox - step * .5, oy - step * .5, end + step, end + step);
    if (inner >= 0) { g.fillStyle = '#e2b866'; g.fillRect(ox + step * (d - .5), oy + step * (d - .5), step * (inner + 1), step * (inner + 1)); }
    g.strokeStyle = 'rgba(60,38,10,.85)'; g.lineWidth = n > 25 ? 1 : 1.4; g.beginPath();
    for (let i = 0; i < n; i++) { g.moveTo(ox, oy + i * step); g.lineTo(ox + end, oy + i * step); g.moveTo(ox + i * step, oy); g.lineTo(ox + i * step, oy + end); }
    g.stroke();
    STONES[n].forEach(([i, j, b]) => {
      g.fillStyle = b ? '#1d1d24' : '#f6f3ea'; g.strokeStyle = b ? '#000' : '#9a958a'; g.lineWidth = 1;
      g.beginPath(); g.arc(ox + i * step, oy + j * step, step * .42, 0, Math.PI * 2); g.fill(); g.stroke();
    });
    g.restore();
  }

  function bars(g, d, cur, x0, y0) {
    g.font = '800 18px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('Share of points near an edge', x0, y0);
    SIZES.forEach((n, i) => {
      const s = share(n, d), y = y0 + 46 + i * 92, w = 380, on = n === cur;
      g.font = `${on ? 800 : 600} 20px Montserrat, Jost, sans-serif`; g.fillStyle = on ? C.ink : C.muted; g.fillText(`${n}×${n}`, x0, y);
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(x0, y + 16, w, 26, 6); g.fill();
      g.fillStyle = on ? '#2ea3dc' : 'rgba(46,163,220,.45)'; g.beginPath(); g.roundRect(x0, y + 16, w * s.edge / s.all, 26, 6); g.fill();
      g.font = '600 15px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left';
      g.fillText(`${pct(s.edge, s.all)}% near an edge · ${s.mid} points in the middle`, x0 + 80, y);
    });
  }

  const DUR = 15;
  let api;
  canvasDemo('go', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, n: 19, d: 3, key: '' };
    const tourBtn = $(s, '.go-tour'), dIn = $(s, '.go-d');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.go-size .btn').forEach(b => b.onclick = () => { free(); st.n = +b.dataset.n; });
    dIn.oninput = () => { free(); st.d = +dIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.d = 3; dIn.value = 3; tourBtn.classList.add('on'); };
    function render() {
      let n = st.n, a = 1;
      if (st.tour) { const k = Math.floor(st.t / 5) % 3, f = st.t % 5; n = SIZES[k]; a = clamp(f / .4) * clamp((5 - f) / .3); }
      $$(s, '.go-size .btn').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      board(g, n, st.d, 24, 20, 545, a);
      bars(g, st.d, n, 610, 60);
      T.label('blue band: within ' + st.d + ' lines of an edge', 296, 572 - 0, 'center', C.ink, 14);
      const sh = share(n, st.d);
      g.font = '800 44px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(`${sh.all} points`, 610, 380);
      g.font = '600 17px Jost, sans-serif'; g.fillStyle = C.muted;
      g.fillText(n === 9 ? 'Almost every point feels the edge.' : n === 19 ? 'About half the board is open middle.' : 'Most of the board is open middle,', 610, 420);
      if (n === 31) g.fillText('playing out the same shapes again and again.', 610, 444);
      $(s, '.go-dv').textContent = st.d;
      const key = [n, st.d].join(); if (key === st.key) return; st.key = key;
      say($(s, '.go-stats'), `<div><b>${sh.all}</b><span>points on the board (possibility space)</span></div><div class="g"><b>${pct(sh.edge, sh.all)}%</b><span>within ${st.d} lines of an edge</span></div><div class="y"><b>${sh.mid}</b><span>points in the open middle</span></div>`);
      say($(s, '.go-out'), n === 31
        ? 'The 31×31 board has the most positions, but the edge only reaches about a third of them. The rest is open middle, more self-similar, so the extra possibility space adds little depth.'
        : n === 9 ? 'On 9×9 the edge reaches almost every point: every fight is shaped by it, but the board is small.'
        : 'On 19×19 the edge still reaches about half the board, which is where the game’s variety comes from.');
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.t > DUR) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
