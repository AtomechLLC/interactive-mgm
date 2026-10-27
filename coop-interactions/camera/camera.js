/* Shared-screen camera lab (MGM C3 M6, deck slides 68-78). One scripted couch co-op moment: both players walk in
   together, P2 wanders off to the far corner while P1 meets an enemy, then P2 comes back. The same 16 s plays under
   five camera rules from the deck: follow P1, frame both equally, a locked scroll (TMNT), split when far apart, and a
   weighted camera (slide 75: P1 must-have, enemy half as important, ally a little less). views(t, mode) decides what
   each screen shows; the meters score it against slide 77 (clarity, motivation, response). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const WW = 2000, WH = 900, LOOP = 16, VW = 960, VH = 540, AR = VH / VW, BASE_W = 900;
  const kf = (pts, t) => {
    if (t <= pts[0][0]) return [pts[0][1], pts[0][2]];
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const a = pts[i - 1], b = pts[i], k = ease((t - a[0]) / (b[0] - a[0] || 1)); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    const l = pts.at(-1); return [l[1], l[2]];
  };
  const P1 = [[0, 300, 500], [3, 650, 500], [5, 830, 480], [13, 850, 470], [16, 850, 470]];
  const P2 = [[0, 250, 620], [3, 600, 620], [4.4, 900, 380], [7, 1640, 170], [9.5, 1680, 150], [11.8, 1000, 330], [13, 930, 580], [16, 930, 580]];
  const EN = [1010, 470];
  const fade = t => t > LOOP - .5 ? (t - (LOOP - .5)) / .5 : t < .3 ? 1 - t / .3 : 0;
  const MODES = {
    follow: { name: 'Follow P1', sub: 'Centre on player 1, as in single player', text: 'The single-player default: player 1 is always centred and always clear. But when player 2 walks off, they vanish. “If you cannot see each other, you forget them.”' },
    equal: { name: 'Frame both equally', sub: 'Keep both players on screen, zooming out as needed', text: 'Nobody leaves the screen, but as the players spread out the camera zooms until your own character is a dot. It becomes far less obvious which one is yours (slide 71).' },
    locked: { name: 'Locked scroll', sub: 'The camera leads, players can’t leave it (TMNT)', text: 'The camera moves on its own and the players are held inside it, like a side-scrolling beat ’em up. Wandering off is impossible, so player 2 is pinned to the edge of the screen: stuck, as in Secret of Mana.' },
    split: { name: 'Split when far', sub: 'Tear the screen when the players separate', text: 'Each player keeps a clear view of themselves, but each gets half a screen, and the moment they separate they stop seeing each other’s fights.' },
    weighted: { name: 'Weighted', sub: 'Give each entity a weight (Cat Quest 2, Gungeon)', text: 'Weight what matters: you are a must-have, the enemy half as important, the ally a little less (slide 75). When the ally is close, everyone fits; when they wander, the camera lets them go before it lets you shrink.' },
  };
  const ORDER = Object.keys(MODES);

  const pos = t => ({ p1: kf(P1, t), p2: kf(P2, t), e: [EN[0] + Math.sin(t * 2) * 8, EN[1]] });
  const inView = (cam, p, m = 0) => Math.abs(p[0] - cam.x) < cam.w / 2 - m && Math.abs(p[1] - cam.y) < cam.w * cam.ar / 2 - m;
  const clampCam = c => { const hw = c.w / 2, hh = c.w * c.ar / 2; c.w = Math.min(c.w, WW, WH / c.ar); c.x = clamp(c.x, Math.min(c.w / 2, WW / 2), Math.max(WW - c.w / 2, WW / 2)); c.y = clamp(c.y, Math.min(c.w * c.ar / 2, WH / 2), Math.max(WH - c.w * c.ar / 2, WH / 2)); return c; };

  // what the screen(s) show at time t: a list of { cam, rect, who }, plus where the players are drawn (locked clamps them)
  function views(t, mode, W) {
    const P = pos(t), out = { P, shown: { ...P }, screens: [], flags: [] };
    const full = { x: 0, y: 0, w: VW, h: VH };
    if (mode === 'follow') out.screens.push({ cam: clampCam({ x: P.p1[0], y: P.p1[1], w: BASE_W, ar: AR }), rect: full });
    if (mode === 'equal') {
      const cx = (P.p1[0] + P.p2[0]) / 2, cy = (P.p1[1] + P.p2[1]) / 2;
      const w = Math.max(BASE_W, Math.abs(P.p1[0] - P.p2[0]) + 360, (Math.abs(P.p1[1] - P.p2[1]) + 300) / AR);
      out.screens.push({ cam: clampCam({ x: cx, y: cy, w, ar: AR }), rect: full });
    }
    if (mode === 'locked') {
      const cam = clampCam({ x: 560 + 30 * Math.min(t, 13), y: 450, w: BASE_W, ar: AR });
      out.screens.push({ cam, rect: full });
      const hold = p => [clamp(p[0], cam.x - cam.w / 2 + 40, cam.x + cam.w / 2 - 40), clamp(p[1], cam.y - cam.w * AR / 2 + 50, cam.y + cam.w * AR / 2 - 40)];
      out.shown.p1 = hold(P.p1); out.shown.p2 = hold(P.p2);
      out.stuck = Math.hypot(out.shown.p2[0] - P.p2[0], out.shown.p2[1] - P.p2[1]) > 30;
    }
    if (mode === 'split') {
      const far = Math.hypot(P.p1[0] - P.p2[0], P.p1[1] - P.p2[1]) > 620;
      if (far) {
        const half = { w: VW / 2 - 2, h: VH }, ar = half.h / half.w;
        out.screens.push({ cam: clampCam({ x: P.p1[0], y: P.p1[1], w: 640, ar }), rect: { x: 0, y: 0, ...half }, who: 'P1' });
        out.screens.push({ cam: clampCam({ x: P.p2[0], y: P.p2[1], w: 640, ar }), rect: { x: VW / 2 + 2, y: 0, ...half }, who: 'P2' });
      } else out.screens.push({ cam: clampCam({ x: (P.p1[0] + P.p2[0]) / 2, y: (P.p1[1] + P.p2[1]) / 2, w: BASE_W, ar: AR }), rect: full });
    }
    if (mode === 'weighted') {
      const ents = [[P.p1, W.self], [P.e, W.enemy], [P.p2, W.ally]], sw = ents.reduce((s, e) => s + e[1], 0) || 1;
      let cx = ents.reduce((s, e) => s + e[0][0] * e[1], 0) / sw, cy = ents.reduce((s, e) => s + e[0][1] * e[1], 0) / sw;
      // fit everything weighted at least half of the top weight, but never zoom out past MAXW: the lightest goes first
      const MAXW = 1250, top = Math.max(W.self, W.enemy, W.ally);
      let keep = ents.filter(e => e[1] >= top * .45 && e[1] > 0).sort((a, b) => b[1] - a[1]), w;
      const need = ks => { const xs = ks.map(e => e[0][0]), ys = ks.map(e => e[0][1]); return Math.max(BASE_W, Math.max(...xs) - Math.min(...xs) + 360, (Math.max(...ys) - Math.min(...ys) + 300) / AR); };
      while (keep.length > 1 && need(keep) > MAXW) keep.pop();
      w = Math.min(MAXW, need(keep));
      const xs = keep.map(e => e[0][0]), ys = keep.map(e => e[0][1]);
      cx = clamp(cx, Math.max(...xs) - w / 2 + 180, Math.min(...xs) + w / 2 - 180); cy = clamp(cy, Math.max(...ys) - w * AR / 2 + 150, Math.min(...ys) + w * AR / 2 - 150);
      out.screens.push({ cam: clampCam({ x: cx, y: cy, w, ar: AR }), rect: full });
    }
    // slide 77, scored from player 1's seat
    const mine = out.screens.find(s => s.who !== 'P2'), cam = mine.cam, scale = mine.rect.w / cam.w;
    const clarity = clamp((scale - .45) / (1.07 - .45)) * (out.screens.length > 1 ? .8 : 1);
    const allySeen = inView(cam, out.shown.p2, 10) ? 1 : out.screens.length > 1 ? .4 : 0;
    const response = inView(cam, out.shown.p2, 10) && inView(cam, P.e, 10) ? 1 : inView(cam, P.e, 10) || inView(cam, out.shown.p2, 10) ? .45 : 0;
    out.m = { clarity, motivation: out.stuck ? .5 : allySeen, response: out.stuck ? .4 : response };
    if (!inView(cam, out.shown.p2, 10) && out.screens.length === 1) out.flags.push('P2 is off screen');
    if (scale < .66) out.flags.push('Zoomed out: your character is tiny');
    if (out.stuck) out.flags.push('P2 is stuck at the edge');
    if (out.screens.length > 1) out.flags.push('Split: half a screen each');
    return out;
  }

  /* ---------- drawing ---------- */
  const PILLARS = [[480, 260], [1250, 640], [1460, 360], [760, 760], [1780, 600]];
  function world(g, t, V) {
    // a plain floor with a sparse grid: fine tiles would make the scrolling GIF several times larger
    g.fillStyle = C.floor; g.fillRect(0, 0, WW, WH);
    g.strokeStyle = C.floorLn; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= WW; x += 160) { g.moveTo(x, 0); g.lineTo(x, WH); }
    for (let y = 0; y <= WH; y += 160) { g.moveTo(0, y); g.lineTo(WW, y); }
    g.stroke();
    g.fillStyle = C.wall; [[0, 0, WW, 40], [0, WH - 40, WW, 40], [0, 0, 40, WH], [WW - 40, 0, 40, WH]].forEach(r => g.fillRect(...r));
 
    PILLARS.forEach(([x, y]) => T.pillar(x - 30, y - 30, 60, 60));
    g.fillStyle = 'rgba(255,185,81,.25)'; g.beginPath(); g.ellipse(1690, 150, 70, 40, 0, 0, Math.PI * 2); g.fill();
    T.label('a shiny thing', 1690, 210, 'center', C.goldInk, 15);
    const { e } = V.P, p1 = V.shown.p1, p2 = V.shown.p2;
    const fighting = t > 5.2 && t < 14;
    if (fighting) { const k = (t * 1.2) % 1.6; if (k < 1) T.cone(e[0], e[1], Math.PI, Math.PI / 3, 150, .4 + .6 * k); }
    T.foe(e[0], e[1], 30, Math.PI, C.red, { mark: 'horns' });
    T.player(p1[0], p1[1], Math.atan2(e[1] - p1[1], e[0] - p1[0]));
    T.player(p2[0], p2[1], Math.atan2(V.P.p2[1] - p2[1] || .01, V.P.p2[0] - p2[0] || 1), 1, 1, C.p2);
    T.label('P1', p1[0], p1[1] - 40, 'center', '#fff', 15, C.player);
    T.label('P2', p2[0], p2[1] - 40, 'center', '#fff', 15, C.p2);
    if (V.stuck) T.label('stuck!', p2[0], p2[1] + 42, 'center', C.red, 15);
  }
  function screen(g, t, V, s) {
    const { cam, rect } = s, sc = rect.w / cam.w;
    g.save(); g.beginPath(); g.rect(rect.x, rect.y, rect.w, rect.h); g.clip();
    g.translate(rect.x + rect.w / 2, rect.y + rect.h / 2); g.scale(sc, sc); g.translate(-cam.x, -cam.y);
    world(g, t, V); g.restore();
    if (s.who) { T.use(g); T.label(s.who === 'P1' ? 'P1’s half' : 'P2’s half', rect.x + rect.w - 16, rect.y + 30, 'right', '#fff', 15, s.who === 'P1' ? C.player : C.p2); }
  }
  function minimap(g, V) {
    const x0 = 14, y0 = VH - 104, mw = 200, sc = mw / WW, mh = WH * sc;
    g.fillStyle = 'rgba(21,32,68,.85)'; g.beginPath(); g.roundRect(x0 - 6, y0 - 6, mw + 12, mh + 12, 8); g.fill();
    g.fillStyle = '#ddd2bc'; g.fillRect(x0, y0, mw, mh);
    V.screens.forEach(s => { g.strokeStyle = s.who === 'P2' ? C.p2 : C.navy; g.lineWidth = 2; g.strokeRect(x0 + (s.cam.x - s.cam.w / 2) * sc, y0 + (s.cam.y - s.cam.w * s.cam.ar / 2) * sc, s.cam.w * sc, s.cam.w * s.cam.ar * sc); });
    [[V.P.e, C.red], [V.P.p1, C.player], [V.P.p2, C.p2]].forEach(([p, c]) => { g.fillStyle = c; g.beginPath(); g.arc(x0 + p[0] * sc, y0 + p[1] * sc, 4, 0, Math.PI * 2); g.fill(); });
  }
  function frame(g, t, mode, W, o = {}) {
    T.use(g);
    const V = views(t, mode, W);
    g.fillStyle = C.navy; g.fillRect(0, 0, VW, VH);
    V.screens.forEach(s => screen(g, t, V, s));
    T.use(g);
    minimap(g, V);
    if (!o.quiet) V.flags.forEach((f, i) => T.label(f, VW - 18, VH - 30 - i * 34, 'right', '#fff', 16, 'rgba(168,32,28,.92)'));
    if (o.cap) T.label(o.cap, 18, 30, 'left', '#fff', 17, 'rgba(21,32,68,.92)');
    const f = fade(t); if (f > 0) { g.fillStyle = `rgba(21,32,68,${f})`; g.fillRect(0, 0, VW, VH); }
    return V;
  }

  /* ---------- slide 1: title ---------- */
  canvasDemo('title', (s, cv, g) => (dt, t) => frame(g, t % LOOP, 'weighted', { self: 1, enemy: .5, ally: .4 }, { quiet: true }));

  /* ---------- slide 2: the lab ---------- */
  let api = null;
  const TOUR_FROM = 3.6, TOUR_LEN = 7.6;
  canvasDemo('lab', (s, cv, g) => {
    const st = { mode: 'follow', W: { self: 1, enemy: .5, ally: .4 }, t: 0, tour: false, tt: 0, held: false, last: '' };
    $(s, '.cm-modes').innerHTML = ORDER.map(k => `<button class="cm-mode" data-m="${k}"><b>${MODES[k].name}</b><span>${MODES[k].sub}</span></button>`).join('');
    $$(s, '.cm-mode').forEach(b => b.onclick = () => { st.mode = b.dataset.m; st.tour = false; });
    const sl = { self: $(s, '.w-self'), enemy: $(s, '.w-enemy'), ally: $(s, '.w-ally') };
    Object.entries(sl).forEach(([k, el]) => { el.value = st.W[k] * 100; el.oninput = () => { st.W[k] = el.value / 100; st.mode = 'weighted'; st.tour = false; }; });
    $(s, '.cm-tour').onclick = () => { st.tour = !st.tour; st.tt = 0; };
    const meters = $(s, '.cm-meters'), out = $(s, '.cm-out');
    meters.innerHTML = [['clarity', 'Clarity', 'Can you see yourself?'], ['motivation', 'Motivation', 'Can you see your ally?'], ['response', 'Response', 'Can you help them?']]
      .map(([k, n, q]) => `<div data-k="${k}"><b>${n}<span class="v"></span></b><small>${q}</small><div class="bar"><i></i></div></div>`).join('');
    function render() {
      let mode = st.mode, t = st.t, cap = '';
      if (st.tour) { const i = Math.floor(st.tt / TOUR_LEN) % ORDER.length; mode = ORDER[i]; t = TOUR_FROM + (st.tt % TOUR_LEN); cap = `${i + 1} / ${ORDER.length}  ${MODES[mode].name}`; }
      const V = frame(g, t, mode, st.W, { cap });
      $$(s, '.cm-mode').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      $(s, '.cm-weights').classList.toggle('off', mode !== 'weighted');
      $(s, '.cm-tour').classList.toggle('on', st.tour);
      ['self', 'enemy', 'ally'].forEach(k => $(s, `.w-${k}-v`).textContent = st.W[k].toFixed(2));
      Object.entries(V.m).forEach(([k, v]) => {
        const d = $(meters, `[data-k="${k}"]`), c = v > .7 ? '#1a8a4c' : v > .35 ? '#e0a92d' : '#e5322d';
        d.querySelector('i').style.width = `${Math.round(v * 100)}%`; d.querySelector('i').style.background = c;
        d.querySelector('.v').textContent = v > .7 ? 'strong' : v > .35 ? 'weak' : 'lost';
      });
      if (mode !== st.last) { st.last = mode; say(out, MODES[mode].text); }
    }
    api = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => TOUR_LEN * ORDER.length };
    return dt => { if (!st.held) { st.t = (st.t + dt) % LOOP; st.tt += dt; } render(); };
  }, { enter(s) { const b = $(s, '.cm-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
