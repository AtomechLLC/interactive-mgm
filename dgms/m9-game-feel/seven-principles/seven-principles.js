/* Seven principles score sheet (DGMS Module 9, deck slides 65-84).
   A radar chart of the deck's seven principles of highly satisfying games, each scored 0-10 by the learner for a game of
   their choice (slide 83: "You can treat these 7 Principles like a score sheet"). Scores live in FPF.store, in this
   browser only; the sheet downloads as a PNG for the Discord drill. The walk-through morphs two illustrative sheets and
   never touches the learner's saved scores. */
(function () {
  const { $, $$, canvasDemo, say, store, ptr } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, KEY = 'dgms-m9-seven-principles';
  const P = [
    { name: 'Predictable results', short: ['Predictable', 'results'], ex: 'The same input gives the same result, so you can make informed decisions. Smash picks the attack from the stick direction.' },
    { name: 'Nuance', short: ['Nuance'], ex: 'Small differences in input give small differences in the result, like Silksong’s jump height and turnarounds.' },
    { name: 'Context', short: ['Context'], ex: 'One button does what the situation needs, like Assassin’s Creed’s context-sensitive buttons.' },
    { name: 'Feedback', short: ['Feedback'], ex: 'The game answers every action through what you see, hear and feel.' },
    { name: 'Low floor, high ceiling', short: ['Low floor,', 'high ceiling'], ex: '“Hour 1: This feels nice! Hour 100: This feels AMAZING!” Ori 2’s final Kuro phase asks for every skill at once.' },
    { name: 'Impact and resolution', short: ['Impact and', 'resolution'], ex: 'Guilty Gear Strive’s counter-hit slows and zooms. Too much hit stop is “a rollercoaster that brakes every 10 feet”.' },
    { name: 'Appealing reaction', short: ['Appealing', 'reaction'], ex: 'The world reacts in a way that is a pleasure to watch, “even if it’s completely fake”.' },
  ];
  const N = P.length, CX = 318, CY = 302, R = 190;
  // illustrative sheets for the walk-through (not reviews of real games)
  const SAMPLES = [
    { game: 'Example: a precision platformer', v: [9, 9, 4, 7, 8, 6, 7] },
    { game: 'Example: an open-world action game', v: [5, 5, 9, 7, 6, 8, 8] },
  ];
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / N;
  const pt = (i, r) => [CX + Math.cos(ang(i)) * r, CY + Math.sin(ang(i)) * r];
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  function wrap(g, s, x, y, w, lh, font, col) {
    g.font = font; const words = s.split(' '); let line = '', yy = y;
    words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w && line) { txt(g, line, x, yy, font, col); line = wd; yy += lh; } else line = t; });
    if (line) txt(g, line, x, yy, font, col);
    return yy;
  }

  function draw(g, v, game, sel, solid) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = solid ? '#fbf7ee' : 'rgba(255,252,244,.82)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    // grid
    for (let k = 2; k <= 10; k += 2) {
      g.strokeStyle = k === 10 ? '#cdbf9f' : '#e6dcc6'; g.lineWidth = k === 10 ? 2 : 1.2; g.beginPath();
      for (let i = 0; i <= N; i++) { const [x, y] = pt(i % N, R * k / 10); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < N; i++) {
      const [x, y] = pt(i, R); g.strokeStyle = i === sel ? '#e0a92d' : '#e6dcc6'; g.lineWidth = i === sel ? 3 : 1.2; g.beginPath(); g.moveTo(CX, CY); g.lineTo(x, y); g.stroke();
      const [lx, ly] = pt(i, R + 38), al = Math.abs(lx - CX) < 20 ? 'center' : lx > CX ? 'left' : 'right';
      const lines = P[i].short, x0 = al === 'left' ? lx - 18 : al === 'right' ? lx + 18 : lx;
      lines.forEach((l, k) => txt(g, l, x0, ly + (k - (lines.length - 1) / 2) * 17, '800 15px Montserrat', i === sel ? C.goldInk : C.ink, al));
    }
    for (const k of [5, 10]) txt(g, String(k), CX + 6, CY - R * k / 10 - 8, '600 11px Jost', C.muted);
    // the shape
    g.fillStyle = 'rgba(85,98,235,.22)'; g.strokeStyle = C.blue; g.lineWidth = 3.5; g.beginPath();
    v.forEach((s, i) => { const [x, y] = pt(i, R * s / 10); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.closePath(); g.fill(); g.stroke();
    v.forEach((s, i) => { const [x, y] = pt(i, R * s / 10); g.fillStyle = i === sel ? '#ffb951' : C.blue; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, i === sel ? 9 : 7, 0, 7); g.fill(); g.stroke(); });
    // the sheet
    const X0 = 620;
    txt(g, 'Score sheet', X0, 34, '800 13px Montserrat', C.muted);
    txt(g, game || 'Unnamed game', X0, 60, '800 22px Montserrat', C.ink);
    P.forEach((p, i) => {
      const y = 104 + i * 40, s = Math.round(v[i] * 10) / 10;
      if (i === sel) { g.fillStyle = '#fff3d6'; g.beginPath(); g.roundRect(X0 - 10, y - 17, 410, 34, 8); g.fill(); }
      txt(g, p.name, X0, y, '700 16px Jost', C.ink);
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(X0 + 200, y - 6, 150, 12, 6); g.fill();
      g.fillStyle = i === sel ? '#e0a92d' : C.blue; g.beginPath(); g.roundRect(X0 + 200, y - 6, Math.max(6, 150 * s / 10), 12, 6); g.fill();
      txt(g, String(Math.round(s)), X0 + 392, y, '800 18px Montserrat', C.ink, 'right');
    });
    const tot = v.reduce((a, b) => a + Math.round(b), 0);
    txt(g, `Total ${tot} / 70`, X0, 392, '800 18px Montserrat', C.ink);
    if (sel != null) wrap(g, P[sel].ex, X0, 430, 400, 21, '600 16px Jost', C.muted);
    txt(g, 'There’s no perfect score.', X0, 540, '800 20px Montserrat', C.goldInk);
  }

  canvasDemo('radar', (s, cv, g) => {
    const saved = store.get(KEY, null);
    const st = { tour: true, t: 0, frozen: false, v: saved?.v?.length === N ? saved.v.slice() : Array(N).fill(5), game: saved?.game || '', sel: null, key: '' };
    const tourBtn = $(s, '.sp-tour'), gameIn = $(s, '.sp-game'), box = $(s, '.sp-sliders');
    box.innerHTML = P.map((p, i) => `<label class="rng">${p.name} <b data-i="${i}"></b><input type="range" min="0" max="10" step="1" value="${st.v[i]}" data-i="${i}"></label>`).join('');
    const ins = $$(box, 'input');
    const save = () => store.set(KEY, { game: st.game, v: st.v });
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); gameIn.value = st.game; ins.forEach((x, i) => x.value = st.v[i]); };
    ins.forEach((x, i) => x.oninput = () => { const val = +x.value; free(); st.v[i] = x.value = val; st.sel = i; save(); });
    gameIn.oninput = () => { const val = gameIn.value; free(); st.game = gameIn.value = val; save(); };
    gameIn.onfocus = () => { if (st.tour) { free(); gameIn.select(); } };
    gameIn.value = st.game;
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.sp-reset').onclick = () => { free(); st.v = Array(N).fill(5); st.game = ''; st.sel = null; gameIn.value = ''; ins.forEach(x => x.value = 5); save(); };
    $(s, '.sp-png').onclick = () => {
      free();
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); draw(x, st.v.map(Math.round), st.game, null, true);
      txt(x, 'Seven principles of highly satisfying games', W - 20, H - 18, '600 13px Jost', C.muted, 'right');
      const a = document.createElement('a');
      a.download = 'seven-principles-' + ((st.game || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'game') + '.png';
      a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    };
    // drag a point on the chart
    let drag = null;
    const pick = e => {
      const p = ptr(cv, e), dx = p.x - CX, dy = p.y - CY, d = Math.hypot(dx, dy);
      if (d > R + 40) return null;
      let a = Math.atan2(dy, dx) + Math.PI / 2; if (a < 0) a += 2 * Math.PI;
      return { i: Math.round(a / (2 * Math.PI / N)) % N, p };
    };
    const setFrom = (i, p) => {
      const along = (p.x - CX) * Math.cos(ang(i)) + (p.y - CY) * Math.sin(ang(i));
      st.v[i] = clamp(Math.round(along / R * 10), 0, 10); ins[i].value = st.v[i]; st.sel = i; save();
    };
    cv.addEventListener('pointerdown', e => { const h = pick(e); if (!h) return; free(); drag = h.i; cv.setPointerCapture(e.pointerId); setFrom(drag, h.p); });
    cv.addEventListener('pointermove', e => { if (drag != null) setFrom(drag, ptr(cv, e)); });
    const end = () => { drag = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.style.touchAction = 'none';

    const DUR = 18;
    function render() {
      let v = st.v, game = st.game, sel = st.sel, msg;
      if (st.tour) {
        const t = st.t;
        // 0-1.5 grow the first sheet, 1.5-9 walk its axes, 9-11 morph, 11-17 walk the second sheet's peaks, 17-18 hold
        const A = SAMPLES[0].v, B = SAMPLES[1].v;
        if (t < 9) { v = A.map(x => x * ease(clamp(t / 1.5))); game = SAMPLES[0].game; sel = t < 1.5 ? null : Math.min(N - 1, Math.floor((t - 1.5) / 1.07)); }
        else { const k = ease(clamp((t - 9) / 2)); v = A.map((x, i) => lerp(x, B[i], k)); game = k < .5 ? SAMPLES[0].game : SAMPLES[1].game; sel = t < 11 ? null : [2, 5, 6, 0][Math.min(3, Math.floor((t - 11) / 1.6))]; }
        ins.forEach((x, i) => x.value = Math.round(v[i]));
        gameIn.value = game;
        msg = t < 9 ? 'A precision platformer, scored on the seven principles. Predictable results and nuance run high. Context scores lower, since every button does one thing.'
          : 'An open-world action game makes the opposite trade: context-sensitive buttons, big impacts and reactions, less precision. Two different shapes, neither one complete. There’s no perfect score.';
      } else msg = 'Pick a game you know and score each principle from 0 to 10. Name the lowest one: that’s where its feel has the most room to grow.';
      draw(g, v, game, sel, false);
      $$(box, 'b').forEach((b, i) => b.textContent = Math.round(v[i]));
      if (msg !== st.key) { st.key = msg; say($(s, '.sp-out'), msg); }
    }
    s._api = { seek(t) { st.frozen = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    window.__seek = (t) => s._api.seek(t); window.__dur = () => DUR;
    return dt => { if (st.tour) { if (!st.frozen) st.t += dt; if (st.t > DUR) st.t = 0; } render(); };
  });
})();
