/* Reflect window test (MGM C4 M7, deck slides 65 and 71). Same keyword, different skill test: [Reflect] (2 sec) for Nayru's
   Love and [Reflect] (0.25 sec) for Mario's Cape. Missiles fly in on a fixed rhythm; press R, click the canvas or use the
   button to raise the reflect. A missile is sent back if it lands while the reflect is up. The strip under the lane shows the
   window you get: any press inside the green band works. The page counts your hits in each mode. */
(function () {
  const { $, $$ } = FPF.kit;
  const { text, chip, TONE, panel, scene, pointer, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C;
  const MODES = { nayru: { name: 'Nayru’s Love', win: 2, col: '91,168,232', gi: 'magic-shield' }, cape: { name: 'Mario’s Cape', win: .25, col: '232,184,58', gi: 'cape' } };
  const FLY = 1.6, GAP = 2.4, FIRST = .6, CD = .35;     // missile flight time, spacing, first shot, reflect cooldown
  const PX = 210, EX = 860, LY = 250;
  const arrive = k => FIRST + k * GAP + FLY;
  // the walk-through: Nayru for 12 s with relaxed early presses, then Cape: early (miss), on time, late (miss), on time
  const TOUR = { nayru: [arrive(0) - 1.3, arrive(1) - .9, arrive(2) - 1.6, arrive(3) - .5], cape: [arrive(0) - .6, arrive(1) - .12, arrive(2) + .08, arrive(3) - .1] };
  const DUR = 24;

  function view(t, st, tour) {
    if (!tour) return { mode: st.mode, c: t, presses: st.presses };
    return t < 12 ? { mode: 'nayru', c: t, presses: TOUR.nayru } : { mode: 'cape', c: t - 12, presses: TOUR.cape };
  }
  // presses honoured (cooldown) and the fate of each missile that has landed by clock c
  function resolve(v) {
    const W = MODES[v.mode].win, ok = [];
    v.presses.forEach(p => { if (p <= v.c && (!ok.length || p >= ok[ok.length - 1] + W + CD)) ok.push(p); });
    const out = [];
    for (let k = 0; arrive(k) <= v.c; k++) out.push({ k, at: arrive(k), hit: ok.some(p => p <= arrive(k) && arrive(k) <= p + W) });
    return { ok, out, W };
  }

  scene('reflect-window', {
    dur: DUR,
    state: () => ({ mode: 'nayru', presses: [], score: { nayru: [0, 0], cape: [0, 0] }, counted: 0 }),
    init(s, st, api) {
      const press = () => { if (st.tour) { api.manual(); st.t = 0; st.presses = []; st.counted = 0; } st.presses.push(st.t); };
      $$(s, '.rw-mode .btn').forEach(b => b.onclick = () => { api.manual(); st.mode = b.dataset.m; st.t = 0; st.presses = []; st.counted = 0; sync(); });
      $(s, '.rw-press').onclick = press;
      pointer(api.cv, (x, y, type) => { if (type === 'down') press(); });
      document.addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R') && s.classList.contains('active')) press(); });
      function sync() { $$(s, '.rw-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === st.mode)); }
      st.sync = sync; sync();
    },
    // manual play: tally each missile once it lands
    after(st) {
      if (st.tour) return;
      const r = resolve(view(st.t, st, false));
      for (let i = st.counted; i < r.out.length; i++) { const sc = st.score[st.mode]; sc[1]++; if (r.out[i].hit) sc[0]++; }
      st.counted = r.out.length;
    },
    draw(g, t, st, tour) {
      const v = view(t, st, tour), M = MODES[v.mode], { ok, out, W } = resolve(v), c = v.c;
      panel(g, 14, 14, 1012, 340, { title: `${M.name}: [Reflect] (${M.win === 2 ? '2 sec' : '0.25 sec'})` });
      g.save(); g.beginPath(); g.roundRect(26, 40, 988, 300, 10); g.clip(); T.use(g); T.floor(26, 40, 988, 300); g.restore();
      T.use(g);
      // the reflect, while it is up
      const up = ok.find(p => p <= c && c <= p + W);
      if (up != null) {
        const k = (c - up) / W;
        if (v.mode === 'nayru') { g.save(); g.translate(PX, LY); g.rotate(c * 2); g.fillStyle = `rgba(${M.col},.28)`; g.strokeStyle = `rgba(${M.col},.95)`; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); } g.closePath(); g.fill(); g.stroke(); g.restore(); }
        else { g.strokeStyle = `rgba(${M.col},${1 - k * .5})`; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.arc(PX, LY, 40, -1.4 + k * 2.4, -.4 + k * 2.4); g.stroke(); g.strokeStyle = 'rgba(200,40,40,.85)'; g.lineWidth = 5; g.beginPath(); g.arc(PX, LY, 46, -1.4 + k * 2.4, -.6 + k * 2.4); g.stroke(); }
      }
      T.player(PX, LY, 0, 1.1);
      T.foe(EX, LY, 26, Math.PI, '#5562eb', { mark: 'staff', edge: '#2a3590' });
      // missiles in flight, and the ones that landed
      for (let k = 0; FIRST + k * GAP <= c; k++) {
        const s0 = FIRST + k * GAP, a = arrive(k), res = out.find(o => o.k === k);
        if (!res) { const x = lerp(EX - 30, PX + 30, (c - s0) / FLY); T.flash(x, LY, 22, 1); g.fillStyle = '#e5622d'; g.beginPath(); g.arc(x, LY, 8, 0, Math.PI * 2); g.fill(); continue; }
        const age = c - a;
        if (res.hit && age < FLY * .8) { const x = lerp(PX + 30, EX - 30, age / (FLY * .8)); T.flash(x, LY, 22, 1); g.fillStyle = `rgb(${M.col})`; g.beginPath(); g.arc(x, LY, 8, 0, Math.PI * 2); g.fill(); }
        if (res.hit && age < .9) T.popText('reflected', PX, LY - 70 - age * 20, C.good, 1 - age / .9);
        if (!res.hit && age < .35) T.flash(PX, LY, 50, 1 - age / .35);
        if (!res.hit && age < .9) T.popText('hit', PX, LY - 70 - age * 20, C.redDk, 1 - age / .9);
      }
      // the timing strip: the next missile's landing, and the band a press must start in
      const nk = Math.max(0, Math.ceil((c - FIRST - FLY) / GAP)), na = arrive(nk);
      const X0 = 80, XW = 880, span = 3.2, xt = tt => X0 + XW * (tt - (c - .6)) / span;
      panel(g, 14, 366, 1012, 206, { title: 'Timing: press inside the green band' });
      g.save(); g.beginPath(); g.rect(X0, 400, XW, 150); g.clip();
      g.fillStyle = 'rgba(47,174,99,.28)'; g.fillRect(xt(na - W), 420, Math.max(4, xt(na) - xt(na - W)), 70);
      g.strokeStyle = C.good; g.lineWidth = 2; g.strokeRect(xt(na - W), 420, Math.max(4, xt(na) - xt(na - W)), 70);
      g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.moveTo(xt(na), 410); g.lineTo(xt(na), 500); g.stroke();
      text(g, 'lands', xt(na), 516, { size: 13, w: 700, col: C.redDk });
      v.presses.filter(p => p <= c && p > c - 3).forEach(p => { const good = ok.includes(p); g.fillStyle = good ? C.navy : C.muted; g.beginPath(); g.moveTo(xt(p), 424); g.lineTo(xt(p) - 7, 410); g.lineTo(xt(p) + 7, 410); g.fill(); if (good) { g.fillStyle = `rgba(${M.col},.55)`; g.fillRect(xt(p), 476, xt(p + W) - xt(p), 10); } });
      g.restore();
      g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(xt(c), 404); g.lineTo(xt(c), 546); g.stroke();
      text(g, 'now', xt(c), 556, { size: 12.5, w: 800, col: C.navy });
      text(g, `${M.win === 2 ? '2 s' : '0.25 s'} window`, X0 + XW - 10, 400, { size: 14, w: 800, col: C.good, align: 'right' });
      if (tour) T.label(v.mode === 'nayru' ? 'A 2 second window: almost any press works' : 'A 0.25 second window: press as it lands', 520, 300, 'center', C.navy, 17);
      st.sync?.();
    },
    side(t, st, tour) {
      const v = view(t, st, tour), r = resolve(v);
      const sc = tour ? { [v.mode]: [r.out.filter(o => o.hit).length, r.out.length] } : st.score;
      const f = m => sc[m] ? `${sc[m][0]} / ${sc[m][1]}` : '–';
      const stats = `<div class="b"><b>${f('nayru')}</b><span>reflected with Nayru’s Love</span></div><div class="y"><b>${f('cape')}</b><span>reflected with Mario’s Cape</span></div>`;
      return { stats, out: 'Same purpose, same [Reflect] keyword. The window length alone turns it from a safe button into a timing test.' };
    },
  });
})();
