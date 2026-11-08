/* Zoning and Spacing (MGM C4 M4, part 5): the slide demos.
   Slide 2 plays sim.js (Ashe vs Zed on a lane), slide 3 is the distance problem in 2D with damage capability,
   slide 4 is the deck's 3 movement types (walking, root motion, gap closers) racing the same zoner.
   Every demo is a pure function of its settings and a time, exposed to the GIF recorder as window.__seek / __dur. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const S = window.ZoneSim;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const C = {
    navy: '#152044', ink: '#262c6a', muted: '#5d618c', line: '#cdbf9f', paper: 'rgba(255,252,244,.82)',
    ashe: '#2ea3dc', asheLt: 'rgba(46,163,220,.16)', zed: '#e5322d', zedLt: 'rgba(229,50,45,.16)',
    frost: '#7fd0ff', mark: '#8a4fd6', gold: '#e0a92d', goldInk: '#9a5a06', green: '#2fae63', grey: '#b9b3a3',
  };

  /* ---------- art ---------- */
  const IMG = {};
  const LOL = '../../student-tokens/256px/league-of-legends/';
  [['ashe', LOL + 'champ-ashe-token-player.png'], ['zed', LOL + 'champ-zed-token-enemy.png'], ['w', 'img/ZedW.png'], ['r', 'img/ZedR.png'], ['volley', 'img/Volley.png']]
    .forEach(([k, src]) => { const i = new Image(); i.src = src; IMG[k] = i; });
  const ready = i => i && i.complete && i.naturalWidth;
  function img(g, k, x, y, s, a = 1) { if (!ready(IMG[k])) return; g.save(); g.globalAlpha *= a; g.drawImage(IMG[k], x - s / 2, y - s / 2, s, s); g.restore(); }
  function text(g, t, x, y, { col = C.ink, size = 15, weight = 600, align = 'center', base = 'middle' } = {}) {
    g.font = `${weight} ${size}px Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(t, x, y);
  }
  function pill(g, t, x, y, bg, fg = '#fff', size = 14, align = 'center') {
    g.font = `600 ${size}px Jost, sans-serif`; const w = g.measureText(t).width + 16, h = size + 10;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x0, y - h / 2, w, h, h / 2); g.fill();
    g.fillStyle = fg; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, x0 + 8, y + 1);
  }
  function panel(g, x, y, w, h) { g.fillStyle = C.paper; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); }
  function hp(g, x, y, w, v, max, col) {
    g.fillStyle = '#3a2f2a'; g.fillRect(x - w / 2 - 2, y - 2, w + 4, 12);
    g.fillStyle = '#6b1f1c'; g.fillRect(x - w / 2, y, w, 8);
    g.fillStyle = col; g.fillRect(x - w / 2, y, w * clamp(v / max), 8);
  }
  function dashLine(g, x0, y0, x1, y1, col, w = 2, dash = [7, 6]) { g.setLineDash(dash); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]); }

  /* =====================================================================
     Slide 2: Ashe vs Zed on a lane
     ===================================================================== */
  const W = 1040, H = 585;
  const BASE = { range: 600, zspd: 345, room: 3000, frost: true, volley: false, w: false, r: false };
  const PRESETS = [
    { name: '1 · Ashe kites', p: {}, cap: 'Ashe hits at 600, Zed at 125. Every Frost Shot slows Zed below Ashe’s speed, so she backs off between shots and he never gets in. His damage capability stays at 0.' },
    { name: '2 · + Living Shadow', p: { w: true }, cap: 'Living Shadow skips 650 units of the lane, so Zed reaches her. But every Frost Shot slows him again, so he keeps slipping out of melee: he can hit her for only about a fifth of the fight, and she wins on range.' },
    { name: '3 · + Death Mark', p: { w: true, r: true }, cap: 'A second gap closer plus a window of 2× damage: the few seconds Zed spends in range now count double, and he wins. Gap closers and burst are how short range pays for itself.' },
    { name: '4 · No room to kite', p: { room: 300 }, cap: 'Same matchup as 1, but Ashe has a wall 300 units behind her. Once she can’t back off, Zed walks into melee with no tools at all and hits her for over half the fight. She still wins with about a third of her health; give him Death Mark and she loses. Arena size is a zoning tool too.' },
    { name: '5 · No slow', p: { frost: false }, cap: 'Without Frost Shot, Zed is 20 units per second faster than Ashe, and every time she stops to shoot he gains ground. He gets in, but too late to win.' },
  ];
  const lane = { p: { ...BASE }, preset: 0, r: null, t: 0, tour: true, tt: 0, held: false };
  const tourPlan = () => PRESETS.map((pr, i) => ({ i, p: { ...BASE, ...pr.p }, len: S.simulate({ ...BASE, ...pr.p }).tEnd + 1.6 }));

  function laneDraw(g, r, t, p) {
    const f = S.frameAt(r, t), d = f.z - f.a;
    g.clearRect(0, 0, W, H);
    // ---------- the lane ----------
    panel(g, 0, 0, W, 236);
    const k = 0.42, cx = (f.a + f.z) / 2, cam = clamp(cx, 0, 1e9), sx = u => W / 2 + (u - cam) * k, LY = 132;
    g.save(); g.beginPath(); g.roundRect(0, 0, W, 236, 14); g.clip();
    g.fillStyle = '#ddd2bc'; g.fillRect(0, LY - 62, W, 124);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5;
    for (let u = Math.floor((cam - 1400) / 100) * 100; u < cam + 1400; u += 100) { if (u < 0) continue; g.beginPath(); g.moveTo(sx(u), LY - 62); g.lineTo(sx(u), LY + 62); g.stroke(); }
    if (sx(0) > -40) { g.fillStyle = '#3d4270'; g.fillRect(sx(0) - 40, LY - 70, 40, 140); text(g, 'wall', sx(0) - 20, LY + 84, { col: C.muted, size: 13 }); }
    // ranges: Ashe's attack range, Zed's melee and his gap closer reach
    g.fillStyle = C.asheLt; g.fillRect(sx(f.a), LY - 62, (p.range) * k, 124);
    dashLine(g, sx(f.a + p.range), LY - 66, sx(f.a + p.range), LY + 66, C.ashe, 2.5);
    pill(g, `Ashe’s range ${p.range}`, sx(f.a + p.range), LY - 76, C.ashe, '#fff', 13);
    g.fillStyle = C.zedLt; g.fillRect(sx(f.z - S.ZED.range), LY - 62, S.ZED.range * k, 124);
    const wLeft = p.w && !r.ev.some(e => e.k === 'w' && e.t <= t), rLeft = p.r && !r.ev.some(e => e.k === 'r' && e.t <= t);
    if (wLeft || rLeft) {
      const reach = wLeft ? S.ZED.wRange : S.ZED.rRange;
      dashLine(g, sx(f.z - reach), LY + 66, sx(f.z - reach), LY - 30, C.zed, 2.5);
      dashLine(g, sx(f.z - reach), LY + 54, sx(f.z), LY + 54, C.zed, 2, [4, 5]);
      pill(g, `${wLeft ? 'Living Shadow' : 'Death Mark'} reach ${reach}`, sx(f.z - reach), LY + 76, C.zed, '#fff', 13);
    }
    // gap closer ghosts
    r.ev.filter(e => (e.k === 'w' || e.k === 'r') && t >= e.t && t < e.t + 0.7).forEach(e => {
      const fa = S.frameAt(r, e.t - S.DT); img(g, 'zed', sx(fa.z), LY, 64, 0.45 * (1 - (t - e.t) / 0.7));
      img(g, e.k, sx(fa.z), LY - 52, 30, 1 - (t - e.t) / 0.7);
    });
    // Ashe's arrows in flight during her wind-up
    r.ev.filter(e => e.k === 'aa' && t >= e.t - 0.14 && t < e.t).forEach(e => {
      const q = 1 - (e.t - t) / 0.14, x = lerp(sx(f.a) + 26, sx(f.z) - 26, q);
      g.strokeStyle = C.ashe; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 24, LY); g.lineTo(x, LY); g.stroke();
      g.fillStyle = C.ashe; g.beginPath(); g.moveTo(x + 8, LY); g.lineTo(x - 2, LY - 6); g.lineTo(x - 2, LY + 6); g.fill();
    });
    r.ev.filter(e => e.k === 'volley' && t >= e.t && t < e.t + 0.3).forEach(e => {
      const q = (t - e.t) / 0.3; for (let j = -3; j <= 3; j++) { const x = lerp(sx(f.a), sx(f.z), q); g.strokeStyle = C.frost; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 18, LY + j * 9); g.lineTo(x, LY + j * 9); g.stroke(); }
    });
    // tokens
    if (f.mark) { g.strokeStyle = C.mark; g.lineWidth = 5; g.beginPath(); g.arc(sx(f.a), LY, 40, 0, TAU); g.stroke(); }
    if (f.slowed) { g.strokeStyle = C.frost; g.lineWidth = 6; g.beginPath(); g.arc(sx(f.z), LY, 40, 0, TAU); g.stroke(); }
    img(g, 'ashe', sx(f.a), LY, 70); img(g, 'zed', sx(f.z), LY, 70);
    hp(g, sx(f.a), LY - 52, 70, f.hpA, S.ASHE.hp, C.ashe); hp(g, sx(f.z), LY - 52, 70, f.hpZ, S.ZED.hp, C.zed);
    // damage numbers
    r.ev.filter(e => t >= e.t && t < e.t + 0.6).forEach(e => {
      const up = (t - e.t) * 50, al = 1 - (t - e.t) / 0.6;
      g.globalAlpha = al;
      if (e.k === 'aa' || e.k === 'volley') text(g, `-${e.dmg}`, sx(f.z) + 30, LY - 74 - up, { col: C.ashe, size: 18, weight: 700 });
      if (e.k === 'zhit') text(g, `-${e.dmg}${e.mark ? ' ×2' : ''}`, sx(f.a) - 30, LY - 74 - up, { col: e.mark ? C.mark : C.zed, size: e.mark ? 22 : 18, weight: 700 });
      g.globalAlpha = 1;
    });
    g.restore();
    text(g, `distance ${Math.round(d)}`, W / 2, 222, { col: C.muted, size: 14 });
    text(g, `${t.toFixed(1)} s`, W - 18, 18, { col: C.muted, size: 13, align: 'right' });

    // ---------- distance over time ----------
    const P = { x: 0, y: 252, w: 600, h: 333 }, X0 = 64, X1 = 584, Y0 = 548, Y1 = 290, DMAX = 1200;
    panel(g, P.x, P.y, P.w, P.h);
    text(g, 'Distance over time', P.w / 2, P.y + 18, { col: C.navy, size: 15 });
    const tx = s => lerp(X0, X1, s / S.T_MAX), dy = v => lerp(Y0, Y1, clamp(v / DMAX));
    g.fillStyle = C.asheLt; g.fillRect(X0, dy(p.range), X1 - X0, Y0 - dy(p.range));
    g.fillStyle = C.zedLt; g.fillRect(X0, dy(S.ZED.range), X1 - X0, Y0 - dy(S.ZED.range));
    text(g, 'Ashe can hit', X1 - 6, dy(p.range) + 12, { col: C.ashe, size: 12, align: 'right' });
    text(g, 'Zed can hit', X1 - 6, dy(S.ZED.range) + 12, { col: C.zed, size: 12, align: 'right' });
    g.strokeStyle = C.line; g.lineWidth = 1; g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
    [0, 300, 600, 900, 1200].forEach(v => { g.beginPath(); g.moveTo(X0, dy(v)); g.lineTo(X1, dy(v)); g.stroke(); g.fillText(v, X0 - 6, dy(v)); });
    g.textAlign = 'center'; [0, 2, 4, 6, 8, 10, 12].forEach(s => g.fillText(s + ' s', tx(s), Y0 + 14));
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath();
    r.frames.forEach((fr, i) => { if (fr.t > t) return; const x = tx(fr.t), y = dy(fr.z - fr.a); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
    r.ev.filter(e => (e.k === 'w' || e.k === 'r') && e.t <= t).forEach(e => img(g, e.k, tx(e.t), dy(e.from) - 18, 24));
    g.fillStyle = C.navy; g.beginPath(); g.arc(tx(Math.min(t, r.tEnd)), dy(d), 6, 0, TAU); g.fill();

    // ---------- danger by distance ----------
    const Q = { x: 618, y: 252, w: 422, h: 333 }, A0 = 670, A1 = 1024, B0 = 548, B1 = 300, VMAX = 280;
    panel(g, Q.x, Q.y, Q.w, Q.h);
    text(g, 'Danger by distance (damage per second)', Q.x + Q.w / 2, Q.y + 18, { col: C.navy, size: 15 });
    const ax = v => lerp(A0, A1, v / DMAX), by = v => lerp(B0, B1, v / VMAX);
    g.strokeStyle = C.line; g.lineWidth = 1; g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted;
    [0, 100, 200].forEach(v => { g.beginPath(); g.moveTo(A0, by(v)); g.lineTo(A1, by(v)); g.stroke(); g.textAlign = 'right'; g.fillText(v, A0 - 6, by(v)); });
    g.textAlign = 'center'; [0, 300, 600, 900, 1200].forEach(v => g.fillText(v, ax(v), B0 + 14));
    text(g, 'distance', (A0 + A1) / 2, B0 + 30, { col: C.muted, size: 12 });
    const dpsA = Math.round(S.ASHE.aa / S.ASHE.period), dpsZ = Math.round(S.ZED.aa / S.ZED.period);
    const step = (col, pts, w = 4) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(ax(x), by(y)) : g.moveTo(ax(x), by(y))); g.stroke(); };
    step(C.ashe, [[0, dpsA], [p.range, dpsA], [p.range, 0], [DMAX, 0]]);
    if (p.volley) { g.fillStyle = 'rgba(127,208,255,.35)'; g.fillRect(ax(p.range), by(18), ax(S.ASHE.volleyRange) - ax(p.range), by(0) - by(18)); text(g, 'Volley slow', ax((p.range + S.ASHE.volleyRange) / 2), by(18) - 9, { col: C.ashe, size: 11 }); }
    step(C.zed, [[0, dpsZ], [S.ZED.range, dpsZ], [S.ZED.range, 0], [DMAX, 0]]);
    if (p.r) { step(C.mark, [[0, dpsZ * 2], [S.ZED.range, dpsZ * 2], [S.ZED.range, dpsZ]], 3); text(g, '×2 Death Mark', ax(S.ZED.range) + 8, by(dpsZ * 2), { col: C.mark, size: 12, align: 'left' }); }
    if (p.w || p.r) { const reach = Math.max(p.w ? S.ZED.wRange : 0, p.r ? S.ZED.rRange : 0); dashLine(g, ax(0), by(dpsZ) + 14, ax(reach), by(dpsZ) + 14, C.zed, 2, [4, 5]); text(g, `gap closer reach ${reach}`, ax(reach) + 6, by(dpsZ) + 14, { col: C.zed, size: 11, align: 'left' }); }
    text(g, `Ashe ${dpsA} up to ${p.range}`, ax(p.range) - 6, by(dpsA) - 12, { col: C.ashe, size: 12, align: 'right' });
    text(g, `Zed ${dpsZ} up to ${S.ZED.range}`, ax(S.ZED.range) + 6, by(dpsZ) + (p.w || p.r ? 30 : 14), { col: C.zed, size: 12, align: 'left' });
    const dx = ax(clamp(d, 0, DMAX)); dashLine(g, dx, B1 + 6, dx, B0, C.navy, 2, [3, 4]);
    pill(g, 'now', dx, B1 - 4, C.navy, '#fff', 11);
  }

  let laneApi = null;
  canvasDemo('lane', (s, cv, g) => {
    const st = lane, box = $(s, '.ln-presets');
    box.innerHTML = PRESETS.map((pr, i) => `<button class="btn" data-i="${i}">${pr.name}</button>`).join('') + '<button class="btn ln-tour">▶ Walk-through</button>';
    const ui = {
      range: $(s, '.i-range'), zspd: $(s, '.i-zspd'), room: $(s, '.i-room'),
      frost: $(s, '.t-frost'), volley: $(s, '.t-volley'), w: $(s, '.t-w'), r: $(s, '.t-r'), tour: $(s, '.ln-tour'),
    };
    function stopTour() { st.tour = false; }
    function load(p, preset = -1) { st.p = p; st.preset = preset; st.r = S.simulate(p); st.t = 0; sync(); }
    function sync() {
      const p = st.p;
      ui.range.value = p.range; ui.zspd.value = p.zspd; ui.room.value = p.room;
      $(s, '.v-range').textContent = p.range; $(s, '.v-zspd').textContent = p.zspd; $(s, '.v-room').textContent = p.room >= 3000 ? 'open lane' : p.room;
      ['frost', 'volley', 'w', 'r'].forEach(k => ui[k].classList.toggle('on', !!p[k]));
      $$(box, '[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === st.preset));
      ui.tour.classList.toggle('on', st.tour);
      const r = st.r, win = r.winner === 'ashe' ? '<b>Ashe</b>' : r.winner === 'zed' ? '<b>Zed</b>' : 'Nobody';
      say($(s, '.st'), `<div class="wide ${r.winner === 'zed' ? 'r' : ''}"><b>${r.winner === 'none' ? 'No kill' : (r.winner === 'ashe' ? 'Ashe' : 'Zed') + ' wins'}</b><span>${r.winner === 'none' ? 'in 12 s' : 'after ' + r.tEnd.toFixed(1) + ' s'}</span></div>`
        + `<div><b>${Math.round(r.capA * 100)}%</b><span>of the fight Ashe can hit Zed</span></div><div class="r"><b>${Math.round(r.capZ * 100)}%</b><span>of the fight Zed can hit Ashe: his damage capability</span></div>`);
      const pr = PRESETS[st.preset];
      say($(s, '.out1'), pr ? pr.cap : `Your settings. ${win} comes out ahead: Zed was in melee range for ${Math.round(r.capZ * 100)}% of the fight, Ashe in range for ${Math.round(r.capA * 100)}%. Range decides who gets to use their damage at all.`);
    }
    $$(box, '[data-i]').forEach(b => b.onclick = () => { stopTour(); const i = +b.dataset.i; load({ ...BASE, ...PRESETS[i].p }, i); });
    ui.tour.onclick = () => { st.tour = true; st.tt = 0; };
    ['range', 'zspd', 'room'].forEach(k => ui[k].oninput = () => { stopTour(); load({ ...st.p, [k]: +ui[k].value }); });
    ['frost', 'volley', 'w', 'r'].forEach(k => ui[k].onclick = () => { stopTour(); load({ ...st.p, [k]: !st.p[k] }); });
    load({ ...BASE }, 0);
    const plan = tourPlan(), DUR = plan.reduce((a, x) => a + x.len, 0);
    function tourAt(T) { let acc = 0; for (const x of plan) { if (T < acc + x.len) return { ...x, t: T - acc }; acc += x.len; } return { ...plan[0], t: 0 }; }
    function render() {
      if (st.tour) { const q = tourAt(st.tt); if (q.i !== st.preset) load(q.p, q.i); st.t = q.t; }
      laneDraw(g, st.r, Math.min(st.t, st.r.tEnd), st.p);
      ui.tour.classList.toggle('on', st.tour);
    }
    laneApi = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => DUR };
    return dt => {
      if (!st.held) { if (st.tour) { st.tt = (st.tt + dt) % DUR; } else { st.t += dt; if (st.t > st.r.tEnd + 1.6) st.t = 0; } }
      render();
    };
  });

  /* =====================================================================
     Slide 3: the distance problem in 2D, and damage capability
     ===================================================================== */
  const DOTS = (() => {   // where an opponent might be standing: a fixed, seeded scatter over a 2400 x 2400 arena
    let x = 7; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 900 }, () => ({ x: (rnd() - .5) * 2400, y: (rnd() - .5) * 2400 }));
  })();
  const pct = v => v > 0 && v < 0.1 ? (v * 100).toFixed(1) + '%' : Math.round(v * 100) + '%';
  const area = { ar: 600, am: 125, ak: 2, gap: false, tour: true, tt: 0, held: false };
  const DPS_R = 122, DPS_M = 120;
  function areaStats(a) {
    const inR = DOTS.filter(p => Math.hypot(p.x, p.y) <= a.ar).length / DOTS.length;
    const inM = DOTS.filter(p => Math.hypot(p.x, p.y) <= (a.gap ? 650 : a.am)).length / DOTS.length;
    return { inR, inM, ratio: (a.ar / a.am) ** 2, effR: DPS_R * inR, effM: DPS_M * a.ak * inM };
  }
  function areaDraw(g, a) {
    g.clearRect(0, 0, W, H);
    const st = areaStats(a);
    // arena
    panel(g, 0, 0, 585, 585);
    const CX = 292, CY = 300, k = 0.225, R = 270;
    text(g, 'Where could the opponent be standing?', CX, 22, { col: C.navy, size: 15 });
    g.save(); g.beginPath(); g.roundRect(CX - R, CY - R, 2 * R, 2 * R, 10); g.clip();
    g.fillStyle = '#e9e0cb'; g.fillRect(CX - R, CY - R, 2 * R, 2 * R);
    g.fillStyle = C.asheLt; g.beginPath(); g.arc(CX, CY, a.ar * k, 0, TAU); g.fill();
    g.strokeStyle = C.ashe; g.lineWidth = 3; g.stroke();
    g.fillStyle = C.zedLt; g.beginPath(); g.arc(CX, CY, a.am * k, 0, TAU); g.fill(); g.strokeStyle = C.zed; g.stroke();
    if (a.gap) { g.setLineDash([6, 5]); g.strokeStyle = C.zed; g.lineWidth = 2.5; g.beginPath(); g.arc(CX, CY, 650 * k, 0, TAU); g.stroke(); g.setLineDash([]); }
    DOTS.forEach(p => {
      const dd = Math.hypot(p.x, p.y), inM = dd <= (a.gap ? 650 : a.am), inR = dd <= a.ar;
      g.fillStyle = inM ? C.zed : inR ? C.ashe : C.grey; g.beginPath(); g.arc(CX + p.x * k, CY + p.y * k, inM || inR ? 3.2 : 2.4, 0, TAU); g.fill();
    });
    g.restore();
    g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(CX, CY, 9, 0, TAU); g.fill(); g.stroke();
    img(g, 'ashe', CX + R - 30, CY - R + 30, 40); img(g, 'zed', CX + R - 30, CY - R + 76, 40);
    text(g, 'ranged', CX + R - 56, CY - R + 30, { col: C.ashe, size: 13, align: 'right' }); text(g, 'melee', CX + R - 56, CY - R + 76, { col: C.zed, size: 13, align: 'right' });
    pill(g, `ranged ${a.ar}`, CX, CY - a.ar * k - 4 < CY - R + 12 ? CY - R + 14 : CY - a.ar * k - 4, C.ashe, '#fff', 12);
    pill(g, `melee ${a.am}`, CX, CY + a.am * k + 14, C.zed, '#fff', 12);
    if (a.gap) pill(g, 'gap closer 650 (once per cooldown)', CX, Math.min(CY + R - 14, CY + 650 * k + 14), C.zed, '#fff', 12);
    text(g, 'Each dot is one place the other player could stand. Blue: ranged can hit it. Red: melee can.', CX, 578, { col: C.muted, size: 12 });
    // math
    panel(g, 600, 0, 440, 585);
    text(g, 'Threatened floor', 820, 26, { col: C.navy, size: 16 });
    const bx = 640, bw = 360;
    const bar = (y, lab, v, max, col, val) => {
      text(g, lab, bx, y, { col: C.ink, size: 14, align: 'left' });
      g.fillStyle = '#eee6d3'; g.fillRect(bx, y + 12, bw, 18); g.fillStyle = col; g.fillRect(bx, y + 12, bw * clamp(v / max), 18);
      text(g, val, bx + bw, y, { col, size: 14, align: 'right', weight: 700 });
    };
    const areaR = Math.PI * a.ar * a.ar, areaM = Math.PI * a.am * a.am;
    bar(62, 'Ranged: π × reach²', areaR, Math.max(areaR, areaM), C.ashe, `${Math.round(areaR / 1000)}k units²`);
    bar(110, 'Melee: π × reach²', areaM, Math.max(areaR, areaM), C.zed, `${Math.round(areaM / 1000)}k units²`);
    text(g, `${st.ratio >= 1 ? st.ratio.toFixed(1) + '×' : (1 / st.ratio).toFixed(1) + '× less'}`, 820, 182, { col: C.navy, size: 40, weight: 700 });
    text(g, 'Double the reach, four times the floor: area grows with the square.', 820, 214, { col: C.muted, size: 13 });
    g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(630, 240); g.lineTo(1010, 240); g.stroke();
    text(g, 'Damage × damage capability', 820, 266, { col: C.navy, size: 16 });
    const row = (y, col, who, dps, share, eff) => {
      text(g, who, bx, y, { col, size: 15, align: 'left', weight: 700 });
      text(g, `${Math.round(dps)} DPS × ${pct(share)} of the floor = `, bx, y + 24, { col: C.ink, size: 15, align: 'left' });
      text(g, `${eff.toFixed(1)}`, bx + bw, y + 24, { col, size: 22, align: 'right', weight: 700 });
    };
    row(298, C.ashe, 'Ranged', DPS_R, st.inR, st.effR);
    row(360, C.zed, `Melee${a.ak !== 1 ? ` (${a.ak}× damage)` : ''}${a.gap ? ', gap closer up' : ''}`, DPS_M * a.ak, st.inM, st.effM);
    g.fillStyle = '#fffaf0'; g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.roundRect(630, 430, 380, 120, 12); g.fill(); g.stroke();
    text(g, 'If damage = 1,000,000', 820, 458, { col: C.ink, size: 16 });
    text(g, 'but damage capability = 0', 820, 484, { col: C.ink, size: 16 });
    text(g, 'then damage = 0', 820, 516, { col: C.zed, size: 22, weight: 700 });
    return st;
  }
  const AREA_TOUR = [
    { t: 0, ar: 600, am: 125, ak: 1, gap: false }, { t: 3, ar: 600, am: 125, ak: 2, gap: false }, { t: 6, ar: 600, am: 125, ak: 8, gap: false },
    { t: 9, ar: 300, am: 125, ak: 2, gap: false }, { t: 12, ar: 600, am: 125, ak: 2, gap: true }, { t: 15, ar: 600, am: 125, ak: 2, gap: false },
  ];
  const AREA_DUR = 15;
  function areaTourAt(T) {
    let i = 0; while (i < AREA_TOUR.length - 1 && AREA_TOUR[i + 1].t <= T) i++;
    const A = AREA_TOUR[i], B = AREA_TOUR[Math.min(i + 1, AREA_TOUR.length - 1)], k = clamp((T - A.t - 1.8) / 1.0);
    const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    return { ar: Math.round(lerp(A.ar, B.ar, e) / 25) * 25, am: A.am, ak: k > .5 ? B.ak : A.ak, gap: k > .5 ? B.gap : A.gap };
  }
  let areaApi = null;
  canvasDemo('area', (s, cv, g) => {
    const st = area, ui = { ar: $(s, '.i-ar'), am: $(s, '.i-am'), ak: $(s, '.i-ak'), gap: $(s, '.t-gap'), tour: $(s, '.a-tour') };
    let last = '';
    const stop = () => { st.tour = false; };
    ['ar', 'am', 'ak'].forEach(k => ui[k].oninput = () => { stop(); st[k] = +ui[k].value; });
    ui.gap.onclick = () => { stop(); st.gap = !st.gap; };
    ui.tour.onclick = () => { st.tour = true; st.tt = 0; };
    function render() {
      const a = st.tour ? areaTourAt(st.tt) : st;
      if (st.tour) Object.assign(st, a);
      const r = areaDraw(g, a);
      const key = [a.ar, a.am, a.ak, a.gap, st.tour].join('|'); if (key === last) return; last = key;
      ['ar', 'am', 'ak'].forEach(k => { ui[k].value = a[k]; $(s, '.v-' + k).textContent = k === 'ak' ? a.ak + '×' : a[k]; });
      ui.gap.classList.toggle('on', a.gap); ui.tour.classList.toggle('on', st.tour);
      say($(s, '.st'), `<div><b>${(r.ratio).toFixed(1)}×</b><span>the floor ranged threatens, vs melee</span></div><div class="r"><b>${pct(r.inM)}</b><span>of spots melee can hit: its damage capability</span></div>`);
      const lead = r.effR >= r.effM ? `Ranged still deals ${(r.effR / Math.max(r.effM, .1)).toFixed(1)}× more expected damage` : `Now melee deals ${(r.effM / Math.max(r.effR, .1)).toFixed(1)}× more expected damage`;
      say($(s, '.out1'), `${lead}. Before you balance damage per second, check damage capability: how often each side can reach anyone at all. ${a.gap ? 'A gap closer stretches melee’s reach, but only once per cooldown, which is why it needs a downside.' : a.ak >= 4 ? 'Even a huge damage multiplier barely moves a number that starts near zero.' : 'Small range changes make an immense power difference.'}`);
    }
    areaApi = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => AREA_DUR };
    return dt => { if (!st.held && st.tour) st.tt = (st.tt + dt) % AREA_DUR; render(); };
  });

  /* =====================================================================
     Slide 4: walk, root motion, gap closer against the same zoner
     ===================================================================== */
  const mv = { ws: 345, lg: 150, rc: 0.6, t: 0, held: false };
  const GAP = 1100, MELEE = 125, BOLT = { every: 0.8, speed: 1600, first: 0.2 }, DASH = { trigger: 650, dist: 500, time: 0.2 }, SWING = { every: 0.8, len: 0.3 }, MV_T = 4.5;
  // one row: where the melee character is over time, and which of the zoner's bolts land before it gets into range
  function runRow(kind, m) {
    const dt = 1 / 120, fr = [], bolts = [];
    let x = 0, arrive = null, dashT = -1, dashFrom = 0, nextBolt = BOLT.first;
    for (let i = 0; i * dt <= MV_T + 1e-9; i++) {
      const t = i * dt;
      const dashing = dashT >= 0 && t - dashT < DASH.time, recovering = dashT >= 0 && !dashing && t - dashT < DASH.time + m.rc;
      let swinging = false;
      if (arrive === null) {
        if (kind === 'dash' && dashT < 0 && GAP - x <= DASH.trigger) { dashT = t; dashFrom = x; }
        if (dashT >= 0 && t - dashT < DASH.time) x = lerp(dashFrom, Math.min(dashFrom + DASH.dist, GAP - MELEE), (t - dashT) / DASH.time);
        else if (recovering) { /* stuck in the gap closer's recovery */ }
        else if (kind === 'lunge' && (t % SWING.every) < SWING.len) { swinging = true; x += (m.lg / SWING.len) * dt; }
        else x += m.ws * dt;
        x = Math.min(x, GAP - MELEE);
        if (x >= GAP - MELEE - 0.01 && !(dashT >= 0 && t - dashT < DASH.time + m.rc)) arrive = t;
      }
      if (t >= nextBolt - 1e-9) { bolts.push({ t0: t, hit: null, gone: false }); nextBolt += BOLT.every; }
      bolts.forEach(b => {
        if (b.hit !== null || b.gone) return;
        if (GAP - (t - b.t0) * BOLT.speed <= x + 20) { if (arrive === null) b.hit = t; else b.gone = true; }
      });
      fr.push({ t, x, rec: recovering && arrive === null, dash: dashing, swing: swinging });
    }
    return { fr, bolts, hits: bolts.filter(b => b.hit !== null).length, recHits: bolts.filter(b => b.hit !== null && dashT >= 0 && b.hit >= dashT + DASH.time).length, arrive, dt };
  }
  const ROWS = [
    { k: 'walk', name: 'Tool 1 · Walking', col: C.ink },
    { k: 'lunge', name: 'Tool 2 · Root motion', col: C.gold },
    { k: 'dash', name: 'Tool 3 · Gap closer', col: C.zed },
  ];
  function moveDraw(g, m, t) {
    g.clearRect(0, 0, W, H);
    const res = ROWS.map(r => ({ ...r, run: runRow(r.k, m) }));
    res.forEach((r, i) => {
      const y0 = i * 195, cy = y0 + 104, sx = u => 70 + u * 0.8;
      panel(g, 0, y0, W, 180);
      text(g, r.name, 20, y0 + 22, { col: r.col, size: 17, align: 'left', weight: 700 });
      const sub = r.k === 'walk' ? `${m.ws} units/s, nothing else` : r.k === 'lunge' ? `each swing carries the body ${m.lg} units forward` : `dash ${DASH.dist} units from ${DASH.trigger}, then ${m.rc.toFixed(1)} s of recovery`;
      text(g, sub, 20, y0 + 44, { col: C.muted, size: 13, align: 'left' });
      g.fillStyle = '#ddd2bc'; g.fillRect(40, cy - 34, W - 80, 68);
      g.fillStyle = C.zedLt; g.fillRect(sx(GAP - MELEE), cy - 34, MELEE * 0.8, 68);
      const f = r.run.fr[Math.min(r.run.fr.length - 1, Math.round(t / r.run.dt))];
      // bolts in flight
      r.run.bolts.forEach(b => {
        if (t < b.t0) return; const end = b.hit ?? (b.gone ? b.t0 : 99); if (t > end) return;
        const bx = sx(GAP - (t - b.t0) * BOLT.speed); g.strokeStyle = C.ashe; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, cy); g.lineTo(bx + 22, cy); g.stroke();
      });
      if (r.k === 'lunge' && f.swing) { g.strokeStyle = C.gold; g.lineWidth = 5; g.beginPath(); g.arc(sx(f.x) + 10, cy, 36, -1, 1); g.stroke(); }
      if (r.k === 'dash' && f.dash) { g.fillStyle = 'rgba(229,50,45,.25)'; g.fillRect(sx(f.x) - 80, cy - 22, 80, 44); }
      img(g, 'ashe', sx(GAP) + 10, cy, 54);
      img(g, 'zed', sx(f.x), cy, 54);
      if (f.rec) pill(g, 'recovery: open to a free shot', sx(f.x), cy - 46, C.zed, '#fff', 12);
      if (r.run.bolts.some(b => b.hit !== null && t >= b.hit && t < b.hit + 0.4)) text(g, 'hit', sx(f.x), cy + 48, { col: C.ashe, size: 16, weight: 700 });
      const taken = r.run.bolts.filter(b => b.hit !== null && b.hit <= t).length;
      text(g, `${taken} bolt${taken === 1 ? '' : 's'} taken`, W - 24, y0 + 22, { col: C.ashe, size: 15, align: 'right', weight: 700 });
      text(g, r.run.arrive !== null && t >= r.run.arrive ? `in range at ${r.run.arrive.toFixed(2)} s` : 'closing…', W - 24, y0 + 44, { col: C.muted, size: 13, align: 'right' });
    });
    return res;
  }
  let moveApi = null;
  canvasDemo('move', (s, cv, g) => {
    const st = mv, ui = { ws: $(s, '.i-ws'), lg: $(s, '.i-lg'), rc: $(s, '.i-rc') };
    let last = '';
    ['ws', 'lg', 'rc'].forEach(k => { ui[k].value = st[k]; ui[k].oninput = () => { st[k] = +ui[k].value; st.t = 0; }; });
    function render() {
      const res = moveDraw(g, st, st.t);
      const key = [st.ws, st.lg, st.rc].join('|'); if (key === last) return; last = key;
      $(s, '.v-ws').textContent = st.ws; $(s, '.v-lg').textContent = st.lg; $(s, '.v-rc').textContent = st.rc.toFixed(1) + ' s';
      say($(s, '.st'), res.map(r => `<div class="${r.k === 'dash' ? 'r' : r.k === 'lunge' ? 'g' : ''}"><b>${r.run.hits}</b><span>${r.name.split('· ')[1]}: bolts taken${r.run.arrive !== null ? `, in range at ${r.run.arrive.toFixed(1)} s` : ''}${r.k === 'dash' && r.run.recHits ? ` (${r.run.recHits} during recovery)` : ''}</span></div>`).join(''));
      say($(s, '.out1'), 'Walking is the baseline: tune its speed against attack range, throw range and arena size. Root motion gives swings weight and drags the body forward while attacking. A gap closer threatens from much further away, but it must have a downside, such as a cooldown or a recovery the zoner can punish, or it gets spammed.');
    }
    moveApi = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => MV_T };
    return dt => { if (!st.held) { st.t += dt; if (st.t > MV_T) st.t = 0; } render(); };
  });

  const apis = () => ({ lane: laneApi, area: areaApi, move: moveApi });
  window.__seek = (t, which = 'lane') => apis()[which].seek(t);
  window.__dur = (which = 'lane') => apis()[which].dur();
})();
