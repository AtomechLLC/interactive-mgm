/* Disguises as signals (mock-up for MGM C4 M2, beside The Guarded Door).
   A small mansion: a public garden and three staff rooms, each with a receiver at its door. 47 tries every door in the
   outfit picked; each receiver accepts some outfits, and an enforcer (white dot) rejects the outfit they know. A grid
   fills in outfit x room. Rules: DIS (signals), ROOMS (receiver, accepts, enforcer). Drawing is a function of t. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const DIS = {
    suit: { name: 'Suit', body: '#1d1f2e', trim: '#e5322d' },
    waiter: { name: 'Waiter', body: '#f4f1ea', trim: '#1d1f2e' },
    security: { name: 'Security', body: '#2f6db5', trim: '#ffb951' },
  };
  const ORDER = ['suit', 'waiter', 'security'];
  const ROOMS = [
    { id: 'kitchen', name: 'Kitchen', who: 'Kitchen porter', outfit: 'waiter', accepts: ['waiter', 'security'], enforcer: null, x: 30, w: 190, door: 125 },
    { id: 'office', name: 'Security office', who: 'Security captain', outfit: 'security', accepts: ['security'], enforcer: null, x: 235, w: 190, door: 330 },
    { id: 'lounge', name: 'VIP lounge', who: 'Bodyguard', outfit: 'security', accepts: ['waiter', 'security'], enforcer: 'security', x: 440, w: 190, door: 535 },
  ];
  const RES = {
    ok: { col: '#1a8a4c', mark: '✓', line: 'Go ahead.', word: 'walks in' },
    no: { col: '#b77d07', mark: '✗', line: 'Staff only. Turn around.', word: 'turned away' },
    caught: { col: '#a8201c', mark: '!', line: 'I know every guard here. Who are you?', word: 'seen through' },
  };
  const result = (d, r) => r.enforcer === d ? 'caught' : r.accepts.includes(d) ? 'ok' : 'no';
  const TOPY = 40, ROOMH = 200, DOORY = TOPY + ROOMH, HOME = [330, 500], STEP = 2.6;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };

  function person(g, x, y, d, o = {}) {
    const D = DIS[d];
    T.shadow(x + 3, y + 6, 19, 14, .25);
    g.fillStyle = D.body; g.strokeStyle = o.ring || '#fff'; g.lineWidth = 3.5; g.beginPath(); g.arc(x, y, 18, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = D.trim; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill();
    if (o.enf) { g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 32, 6, 0, TAU); g.fill(); g.stroke(); }
    if (o.label) T.label(o.label, x, y + 34, 'center', C.ink, 12);
  }
  function bubble(g, x, y, s, col) {
    g.font = '700 14px Jost, sans-serif'; const w = g.measureText(s).width + 20;
    const bx = clamp(x - w / 2, 8, 640 - w);
    g.fillStyle = '#fff'; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.roundRect(bx, y - 16, w, 30, 10); g.fill(); g.stroke();
    txt(g, s, bx + 10, y, { font: '700 14px Jost, sans-serif', col });
  }

  function draw(g, d, t, tested, showSig) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    // garden
    g.fillStyle = '#b9d79a'; g.beginPath(); g.roundRect(20, DOORY + 20, 620, H - DOORY - 40, 12); g.fill();
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(70,120,60,.35)'; g.beginPath(); g.arc(50 + (i * 97) % 570, DOORY + 60 + (i * 53) % 220, 10 + (i % 3) * 4, 0, TAU); g.fill(); }
    txt(g, 'Garden: public, any outfit', 36, H - 36, { font: '700 14px Jost', col: '#3c6a2c' });
    // rooms
    ROOMS.forEach(r => {
      T.floor(r.x, TOPY, r.w, ROOMH);
      T.wall(r.x - 10, TOPY - 14, r.w + 20, 14); T.wall(r.x - 10, TOPY, 10, ROOMH + 14); T.wall(r.x + r.w, TOPY, 10, ROOMH + 14);
      T.wall(r.x - 10, DOORY, r.door - 34 - r.x + 10, 14); T.wall(r.door + 34, DOORY, r.x + r.w + 10 - r.door - 34, 14);
      txt(g, r.name, r.x + r.w / 2, TOPY + 26, { font: '800 17px Montserrat', align: 'center', col: C.navy });
      person(g, r.door + 58, DOORY + 30, r.outfit, { enf: !!r.enforcer, label: r.who });
      if (showSig) {
        const acc = r.accepts.map(a => DIS[a].name).join(', ');
        txt(g, 'lets in: ' + acc, r.x + r.w / 2, TOPY + 52, { font: '600 13px Jost', align: 'center', col: C.good });
        if (r.enforcer) txt(g, 'sees through: ' + DIS[r.enforcer].name, r.x + r.w / 2, TOPY + 72, { font: '700 13px Jost', align: 'center', col: C.redDk });
      }
    });
    // 47's route: door i from t = i * STEP
    const i = Math.min(2, Math.floor(t / STEP)), lt = t - i * STEP, r = ROOMS[i], res = result(d, r);
    const door = [r.door, DOORY + 44], inside = [r.door, DOORY - 60];
    let p;
    if (lt < .9) p = [lerp(HOME[0], door[0], ease(lt / .9)), lerp(HOME[1], door[1], ease(lt / .9))];
    else if (lt < 1.9) p = res === 'ok' ? [door[0], lerp(door[1], inside[1], ease(clamp((lt - 1.2) / .6)))] : door;
    else p = res === 'ok' ? inside : [lerp(door[0], HOME[0], ease((lt - 1.9) / .7)), lerp(door[1], HOME[1], ease((lt - 1.9) / .7))];
    if (t >= 3 * STEP) p = HOME;
    if (showSig && lt > .7 && lt < 1.9 && t < 3 * STEP) {   // the signal travels from 47 to the receiver
      const k = clamp((lt - .7) / .4), sx = r.door + 58, sy = DOORY + 30;
      for (let w = 0; w < 3; w++) { const kk = clamp(k - w * .15); if (kk <= 0) continue; g.strokeStyle = `rgba(85,98,235,${.7 * (1 - kk)})`; g.lineWidth = 3; g.beginPath(); g.arc(lerp(p[0], sx, kk), lerp(p[1], sy, kk), 10 + 16 * kk, 0, TAU); g.stroke(); }
    }
    person(g, p[0], p[1], d, { ring: C.player, label: '47 · ' + DIS[d].name });
    if (lt > 1.0 && lt < 2.4 && t < 3 * STEP) {
      bubble(g, r.door + 58, DOORY + 76, RES[res].line, RES[res].col);
      if (res === 'caught') { g.strokeStyle = 'rgba(229,50,45,.8)'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(r.door + 58, DOORY + 30); g.lineTo(p[0], p[1]); g.stroke(); g.setLineDash([]); }
    }
    // the grid
    const GX = 664, GY = 40, cw = 94, rh = 74, SHORT = { kitchen: 'Kitchen', office: 'Office', lounge: 'Lounge' };
    txt(g, 'outfit × door', GX, GY - 14, { font: '700 13px Jost', col: C.muted });
    ROOMS.forEach((rr, k) => txt(g, SHORT[rr.id], GX + 88 + k * cw + cw / 2, GY + 14, { font: '700 13px Jost', align: 'center' }));
    ORDER.forEach((dd, j) => {
      const y = GY + 34 + j * rh;
      g.fillStyle = dd === d ? 'rgba(46,163,220,.14)' : 'rgba(239,230,210,.7)'; g.beginPath(); g.roundRect(GX - 6, y, 88 + 3 * cw + 8, rh - 8, 10); g.fill();
      person(g, GX + 18, y + rh / 2 - 6, dd); txt(g, DIS[dd].name, GX + 40, y + rh / 2 - 4, { font: '700 13px Jost' });
      ROOMS.forEach((rr, k) => {
        const cx = GX + 88 + k * cw + cw / 2, cy = y + rh / 2 - 4, seen = tested[dd + rr.id];
        g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(cx - cw / 2 + 6, y + 6, cw - 12, rh - 20, 8); g.fill(); g.stroke();
        if (seen) { const R = RES[result(dd, rr)]; txt(g, R.mark, cx, cy - 8, { font: '800 22px Montserrat', align: 'center', col: R.col }); txt(g, R.word, cx, cy + 14, { font: '600 12px Jost', align: 'center', col: R.col }); }
      });
    });
    // tool reading
    const ty = GY + 34 + 3 * rh + 16;
    const lines = [['Suit', 'a signal no door accepts'], ['Waiter', 'a lockpick: two doors'], ['Security', 'a hammer: every door, one enforcer']];
    lines.forEach(([a, b], k) => { txt(g, a, GX, ty + k * 26, { font: '800 14px Jost', col: C.navy }); txt(g, b, GX + 72, ty + k * 26, { font: '500 14px Jost', col: C.ink }); });
  }

  const PER = 3 * STEP + 1;
  canvasDemo('disguise', (s, cv, g) => {
    const st = { d: 'suit', t: 0, tour: true, held: false, tested: {}, sig: true, key: '' };
    const tourBtn = $(s, '.dg-tour');
    const mark = () => $$(s, '.dg-dis .btn').forEach(b => b.classList.toggle('on', b.dataset.v === st.d));
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    $$(s, '.dg-dis .btn').forEach(b => b.onclick = () => { manual(); st.d = b.dataset.v; st.t = 0; mark(); });
    $(s, '.dg-sig').onchange = e => { st.sig = e.target.checked; };
    $(s, '.dg-reset').onclick = () => { st.tested = {}; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.tested = {}; tourBtn.classList.add('on'); };
    mark();
    const CAP = {
      suit: 'In his own suit, 47 sends a signal no staff door accepts. The garden is all he gets.',
      waiter: 'The waiter outfit opens the kitchen and the lounge: a lockpick, two doors, no trouble. The office stays shut.',
      security: 'Security opens every door, until the bodyguard, an enforcer, knows every face on the detail. The broadest tool has a receiver built to catch it.',
    };
    function info(d, cap) {
      const k = d + cap + Object.keys(st.tested).length; if (k === st.key) return; st.key = k;
      say($(s, '.dg-stats'), ORDER.map(dd => { const n = ROOMS.filter(r => result(dd, r) === 'ok').length, c = ROOMS.filter(r => result(dd, r) === 'caught').length; return `<div class="${n === 0 ? 'r' : c ? 'y' : 'g'}"><b>${n}/3</b><span>${DIS[dd].name}: doors open cleanly${c ? `, ${c} enforcer` : ''}</span></div>`; }).join(''));
      say($(s, '.dg-out'), cap);
    }
    const run = (d, lt) => { const i = Math.min(2, Math.floor(lt / STEP)); for (let k = 0; k < i; k++) st.tested[d + ROOMS[k].id] = 1; if (lt - i * STEP > 1.0) st.tested[d + ROOMS[i].id] = 1; if (lt >= 3 * STEP) ROOMS.forEach(r => st.tested[d + r.id] = 1); };
    s._seek = t => {
      const j = Math.floor(t / PER), lt = t - j * PER;
      if (j >= 3) { ORDER.forEach(d => ROOMS.forEach(r => st.tested[d + r.id] = 1)); draw(g, 'security', 3 * STEP, st.tested, st.sig); info('end', 'Three outfits, three tools: nothing, a lockpick, a hammer. Every receiver reads the same signal its own way, so the choice of outfit is a plan, not a pass.'); return; }
      if (t < .05) st.tested = {};
      st.d = ORDER[j]; mark(); for (let k = 0; k < j; k++) ROOMS.forEach(r => st.tested[ORDER[k] + r.id] = 1); run(st.d, lt); draw(g, st.d, lt, st.tested, st.sig); info(st.d, CAP[st.d]);
    };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => 3 * PER + 4;
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= 3 * PER + 4) { st.t = 0; st.tested = {}; } s._seek(st.t); }
      else { if (st.t >= PER + 1) st.t = 0; run(st.d, st.t); draw(g, st.d, st.t, st.tested, st.sig); info(st.d, CAP[st.d]); }
    };
  });
})();
