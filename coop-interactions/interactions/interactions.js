/* Interaction count (MGM C3 M6, deck slide 9). One player and three monsters is 3 interactions to design. Three
   players and three monsters is 9 player-monster pairs plus 6 player-player pairs: 15. The deck counts each direction
   between players (A helps B and B helps A are different designs); the toggle shows the undirected count too.
   draw(g, P, M, k) draws the board with lines growing in by k, so the tour and window.__seek (the GIF) match.
   The heroes are the slide's own Mario, Luigi and Peach; the six enemies are official renders from the Super Mario
   Wiki (img/), reused for teaching. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1100, H = 560, PX = 370, MX = 900, MAXP = 3;
  const sprite = f => { const i = new Image(); i.src = new URL(`img/${f}.png`, document.currentScript.src).href; return i; };
  const HEROES = [['Mario', sprite('mario')], ['Luigi', sprite('luigi')], ['Peach', sprite('peach')]];
  const FOES = [['Goomba', 'goomba'], ['Koopa Troopa', 'koopa'], ['Piranha Plant', 'piranha'], ['Bob-omb', 'bobomb'], ['Hammer Bro', 'hammer'], ['Boo', 'boo']].map(([n, f]) => [n, sprite(f)]);
  const blit = (g, img, x, y, h) => { if (!img.complete || !img.naturalWidth) return; const w = h * img.naturalWidth / img.naturalHeight; g.drawImage(img, x - w / 2, y - h / 2, w, h); };
  const pm = (P, M) => P * M, pp = (P, d) => d ? P * (P - 1) : P * (P - 1) / 2;
  const ys = (n, top = 115, bot = 455) => Array.from({ length: n }, (_, i) => n === 1 ? (top + bot) / 2 : lerp(top, bot, i / (n - 1)));

  function draw(g, P, M, d, k, o = {}) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.6)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const py = ys(P), my = ys(M, M > 4 ? 72 : 110, M > 4 ? 500 : 450);
    // player-monster pairs: straight red lines
    const pairs = []; py.forEach((a, i) => my.forEach((b, j) => pairs.push([i, j])));
    pairs.forEach(([i, j], n) => {
      const u = clamp(k * (pairs.length + 4) - n * .7, 0, 1); if (u <= 0) return;
      g.strokeStyle = 'rgba(229,50,45,.55)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(PX + 40, py[i]); g.lineTo(lerp(PX + 40, MX - 44, u), lerp(py[i], my[j], u)); g.stroke();
    });
    // player-player pairs: green arcs on the left, one per direction when counting directions
    const pps = []; for (let i = 0; i < P; i++) for (let j = i + 1; j < P; j++) { pps.push([i, j, 1]); if (d) pps.push([j, i, -1]); }
    pps.forEach(([i, j, s], n) => {
      const u = clamp(k * (pps.length + 4) - n * .7 - 1, 0, 1); if (u <= 0) return;
      const a = py[i], b = py[j], bulge = (60 + Math.abs(b - a) * .35) * (s > 0 ? 1 : 1.6);
      g.strokeStyle = s > 0 ? 'rgba(26,138,76,.8)' : 'rgba(26,138,76,.45)'; g.lineWidth = 3; g.setLineDash(s > 0 ? [] : [8, 6]);
      g.beginPath();
      for (let q = 0; q <= u + 1e-6; q += .02) { const y = lerp(a, b, q), x = PX - 40 - Math.sin(q * Math.PI) * bulge; q ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.setLineDash([]);
      if (u >= 1 && d) { const y = lerp(a, b, .92), x = PX - 40 - Math.sin(.92 * Math.PI) * bulge; g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
    });
    const ph = P === 1 ? 170 : 128, mh = M > 4 ? 76 : 104;
    py.forEach((y, i) => { blit(g, HEROES[i][1], PX, y, ph); T.label(HEROES[i][0], PX, y + ph / 2 + 10, 'center', C.ink, 15); });
    my.forEach((y, j) => { blit(g, FOES[j][1], MX, y, mh); T.label(FOES[j][0], MX + 52, y, 'left', C.ink, 14); });
    T.label('Players', PX, 24, 'center', C.ink, 18); T.label('Monsters', MX, 24, 'center', C.ink, 18);
    const a = pm(P, M), b = pp(P, d), shown = Math.round((a + b) * clamp(k * 1.15));
    const cx = (PX + MX) / 2;
    g.fillStyle = 'rgba(255,252,244,.94)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(cx - 110, 230, 220, o.quiet ? 120 : 200, 14); g.fill(); g.stroke();
    g.font = '800 64px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink; g.fillText(shown, cx, 300);
    g.font = '600 18px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('things to design', cx, 330);
    if (!o.quiet) { T.label(`${a} player ↔ monster`, cx, 370, 'center', C.redDk, 15); if (P > 1) T.label(`${b} player ↔ player`, cx, 404, 'center', C.good, 15); }
  }

  canvasDemo('title', (s, cv, g) => (dt, t) => { const u = t % 8, P = u < 4 ? 1 : 3; draw(g, P, 3, true, clamp((u % 4) / 2.5), { quiet: true }); });

  let api = null;
  canvasDemo('count', (s, cv, g) => {
    const st = { P: 1, M: 3, d: true, k: 0, tour: false, tt: 0, held: false };
    const TOUR = [[1, 3], [2, 3], [3, 3], [3, 6]], STEP = 4.5;
    $$(s, '.ic-step .btn').forEach(b => b.onclick = () => {
      const [key, v] = [b.dataset.d[0], +b.dataset.d.slice(1)];
      if (key === 'p') st.P = clamp(st.P + v, 1, MAXP); else st.M = clamp(st.M + v, 1, 6);
      st.tour = false; st.k = 0;
    });
    $(s, '.ic-directed').onchange = e => { st.d = e.target.checked; st.k = 0; };
    $(s, '.ic-tour').onclick = () => { st.tour = !st.tour; st.tt = 0; };
    function render() {
      let P = st.P, M = st.M, k = st.k;
      if (st.tour) { const i = clamp(Math.floor(st.tt / STEP) || 0, 0, TOUR.length - 1); [P, M] = TOUR[i]; k = clamp((st.tt - i * STEP) / 2.4); }
      draw(g, P, M, st.d, k);
      $(s, '.ic-p').textContent = P; $(s, '.ic-m').textContent = M; $(s, '.ic-tour').classList.toggle('on', st.tour);
      const a = pm(P, M), b = pp(P, st.d), solo = M;
      say($(s, '.ic-sum'), `<b>${a + b}</b><span>things to design, against <b>${solo}</b> in single player (${((a + b) / solo).toFixed(1)}×)</span>`);
      const max = pm(MAXP, M) + pp(MAXP, st.d);
      $(s, '.ic-bars').innerHTML = [1, 2, 3].map(n => { const x = pm(n, M), y = pp(n, st.d); return `<div class="${n === P ? 'on' : ''}"><span>${n}P</span><i style="width:${x / max * 100}%" class="r"></i><i style="width:${y / max * 100}%" class="g"></i><b>${x + y}</b></div>`; }).join('');
    }
    api = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => TOUR.length * STEP };
    return dt => { if (!st.held) { st.tt += dt; st.k = Math.min(1, st.k + dt / 2.4); if (st.tour && st.tt > TOUR.length * STEP + 1.5) st.tt = 0; } render(); };
  }, { enter(s) { const b = $(s, '.ic-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
