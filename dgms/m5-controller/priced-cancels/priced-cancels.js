/* Cancels with a price (mock-up for DGMS M5, beside the cancel philosophies and the cancel anti-patterns).
   1. Guilty Gear's Roman Cancel: the same attack pattern with no cancel, a free cancel and a cancel that costs Tension.
      Lanes show whose turn it is over 20 s; the price slider moves the third lane between the other two.
   2. Go's ko rule: on the left, a ko with no rule repeats forever; on the right, the rule forces a move elsewhere
      before each retake, until one side ends the fight. Both are pure functions of t (or of the step counter). */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const bg = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const rr = (g, x, y, w, h, r, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };

  /* ---------- 1. Roman Cancel ---------- */
  const SPAN = 20, ATK = '#2ea3dc', DEF = '#e5322d', TEN = '#e0a92d', END = '#5d618c';
  function rcSim(mode, price) {
    const seg = [], ten = [[0, 0]]; let t = 0, v = 0, rcs = 0;
    while (t < SPAN) {
      for (let h = 0; h < 4; h++) { seg.push([t, t + 0.35, 'hit']); t += 0.35; v = Math.min(100, v + 7); ten.push([t, v]); }
      if (mode !== 'none' && v >= price) { seg.push([t, t + 0.3, 'rc']); v -= price; ten.push([t, v]); rcs++; t += 0.3; }
      else { seg.push([t, t + 0.8, 'end']); t += 0.8; seg.push([t, t + 2, 'def']); t += 2; seg.push([t, t + 0.6, 'neutral']); t += 0.6; }
    }
    const def = seg.filter(s => s[2] === 'def').reduce((a, [x, y]) => a + Math.max(0, Math.min(y, SPAN) - x), 0);
    return { seg, ten, rcs, def };
  }
  const tenAt = (r, t) => { let v = 0; r.ten.forEach(([a, x]) => { if (a <= t) v = x; }); return v; };
  const segAt = (r, t) => r.seg.find(([a, b]) => t >= a && t < b) || [0, 0, 'neutral'];
  const LANES = [['No cancels', 'the slow finisher always ends the turn'], ['Free cancel', 'cancel every finisher, no cost'], ['Roman Cancel', 'cancel when the bar can pay']];
  function fighter(g, x, y, col, face, pose) {
    g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(x - 16, y - 70, 32, 56, 10); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, y - 86, 13, 0, TAU); g.fill(); g.stroke();
    g.lineCap = 'round'; g.lineWidth = 7; g.strokeStyle = col;
    g.beginPath(); g.moveTo(x - 8, y - 14); g.lineTo(x - 12, y + 18); g.moveTo(x + 8, y - 14); g.lineTo(x + 12, y + 18); g.stroke();
    g.beginPath(); g.moveTo(x, y - 56);
    if (pose === 'strike') g.lineTo(x + face * 52, y - 60); else if (pose === 'end') g.lineTo(x + face * 40, y - 30); else if (pose === 'guard') { g.lineTo(x + face * 20, y - 74); } else g.lineTo(x + face * 22, y - 40);
    g.stroke();
  }
  function drawRC(g, runs, t, price) {
    bg(g);
    const focus = runs[2], s = segAt(focus, t), v = tenAt(focus, t);
    // stage
    g.fillStyle = '#e8dfca'; g.fillRect(30, 182, 520, 8);
    const ak = s[2], ap = ak === 'hit' ? 'strike' : ak === 'end' ? 'end' : 'idle', dp = ak === 'def' ? 'strike' : ak === 'hit' || ak === 'end' ? 'guard' : 'idle';
    fighter(g, 200, 180, ATK, 1, ap); fighter(g, ak === 'def' ? 290 : 310, 180, DEF, -1, dp);
    if (ak === 'rc') { g.strokeStyle = TEN; g.lineWidth = 6; g.globalAlpha = 0.8; g.beginPath(); g.arc(200, 130, 50 + (t - s[0]) * 120, 0, TAU); g.stroke(); g.globalAlpha = 1; txt(g, 'ROMAN CANCEL', 200, 40, { font: '800 18px Montserrat', col: TEN, align: 'center' }); }
    const lab = { hit: 'attacker strings hits', end: 'slow finisher: open to a punish', def: "defender's turn", rc: `finisher cancelled: −${price}% Tension`, neutral: 'reset to neutral' }[ak];
    txt(g, lab, 260, 214, { font: '700 14px Jost', col: ak === 'def' ? DEF : ak === 'rc' ? '#9a5a06' : C.navy, align: 'center' });
    // tension gauge
    const gx = 600, gy = 70, gw = 400;
    txt(g, 'TENSION', gx, gy - 18, { font: '800 14px Montserrat', col: '#9a5a06' }); txt(g, `${Math.round(v)}%`, gx + gw, gy - 18, { font: '800 16px Montserrat', col: C.navy, align: 'right' });
    rr(g, gx, gy, gw, 26, 6, 'rgba(38,44,106,.12)'); rr(g, gx, gy, gw * v / 100, 26, 6, TEN);
    if (price > 0) { const px = gx + gw * price / 100; g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(px, gy - 6); g.lineTo(px, gy + 32); g.stroke(); g.setLineDash([]); txt(g, `price ${price}%`, px, gy + 44, { font: '700 12px Jost', col: C.navy, align: 'center' }); }
    txt(g, 'fills 7% per hit; a cancel spends the price', gx, gy + 66, { font: '600 12px Jost', col: C.muted });
    // lanes
    const X0 = 220, X1 = 1010, px = x => X0 + (X1 - X0) * x / SPAN;
    runs.forEach((r, k) => {
      const y0 = 250 + k * 104;
      txt(g, LANES[k][0] + (k === 2 ? ` · ${price}%` : ''), 30, y0 + 16, { font: '800 15px Montserrat' }); txt(g, LANES[k][1], 30, y0 + 36, { font: '600 11px Jost', col: C.muted });
      rr(g, X0, y0, X1 - X0, 34, 6, 'rgba(38,44,106,.06)');
      r.seg.forEach(([a, b, kind]) => { if (a >= t || a >= SPAN) return; const bb = Math.min(b, t, SPAN), col = { hit: ATK, end: END, rc: TEN, def: DEF, neutral: 'rgba(38,44,106,.12)' }[kind]; g.fillStyle = col; g.fillRect(px(a), y0 + (kind === 'hit' ? 6 : 0), px(bb) - px(a) - (kind === 'hit' ? 1.5 : 0), kind === 'hit' ? 22 : 34); if (kind === 'rc' && bb >= b) txt(g, 'RC', px(a) + (px(b) - px(a)) / 2, y0 + 17, { font: '800 9px Montserrat', col: C.navy, align: 'center' }); });
      // tension trace
      g.strokeStyle = TEN; g.lineWidth = 2; g.beginPath(); let last = 0; r.ten.forEach(([a, x], i) => { if (a > t) return; const y = y0 + 64 - 22 * x / 100; i ? (g.lineTo(px(a), y0 + 64 - 22 * last / 100), g.lineTo(px(a), y)) : g.moveTo(px(a), y); last = x; }); g.lineTo(px(Math.min(t, SPAN)), y0 + 64 - 22 * last / 100); g.stroke();
      g.strokeStyle = 'rgba(38,44,106,.2)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X0, y0 + 64); g.lineTo(X1, y0 + 64); g.stroke();
      const dshare = r.seg.filter(s => s[2] === 'def').reduce((a, [x, y]) => a + Math.max(0, Math.min(y, t, SPAN) - Math.min(x, t)), 0);
      txt(g, `defender acted ${dshare.toFixed(1)} s`, X1, y0 + 80, { font: '700 12px Jost', col: dshare > 0 ? DEF : C.muted, align: 'right' });
    });
    [0, 5, 10, 15, 20].forEach(x => txt(g, x + ' s', px(x), 238, { font: '600 11px Jost', col: C.muted, align: 'center' }));
    let lx = X0; [['hit', ATK], ['slow finisher', END], ['Roman Cancel', TEN], ["defender's turn", DEF]].forEach(([n, col]) => { rr(g, lx, H - 16, 14, 10, 2, col); txt(g, n, lx + 20, H - 11, { font: '600 12px Jost', col: C.muted }); lx += 30 + g.measureText(n).width + 14; });
    txt(g, 'gold line under each lane: Tension', X1, H - 11, { font: '600 12px Jost', col: C.muted, align: 'right' });
  }
  canvasDemo('rc', (s, cv, g) => {
    const st = { price: 50, tour: true, held: false, t: 0, key: '' }, tourBtn = $(s, '.rc-tour'), rng = $(s, '.rc-p');
    const mk = p => [rcSim('none', p), rcSim('priced', 0), rcSim('priced', p)];
    let runs = mk(50);
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.price = 50; rng.value = 50; runs = mk(50); tourBtn.classList.add('on'); };
    rng.oninput = () => { st.tour = false; tourBtn.classList.remove('on'); st.price = +rng.value; runs = mk(st.price); st.t = 0; };
    function info(cap) {
      const k = cap + st.price; if (k === st.key) return; st.key = k; $(s, '.rc-pv').textContent = st.price + '%';
      say($(s, '.rc-stats'), runs.map((r, i) => `<div class="${r.def === 0 ? 'r' : i === 2 ? 'y' : 'g'}"><b>${Math.round(100 * r.def / SPAN)}%</b><span>${LANES[i][0]}${i === 2 ? ' at ' + st.price + '%' : ''}: share of time the defender acts${r.rcs ? ` · ${r.rcs} cancels` : ''}</span></div>`).join(''));
      say($(s, '.rc-out'), cap);
    }
    const DUR = 24;
    const cap = t => t < 6 ? 'Each string is four quick hits and a slow finisher. Without a cancel, the finisher leaves an opening, and the defender takes a turn.'
      : t < 12 ? 'Make the cancel free and every finisher is cancelled. The defender never acts: the loop the anti-pattern warns about.'
      : t < 18 ? 'Charge half the Tension bar and the attacker can cancel about every other string, so they have to pick the moment.'
      : 'Same cancel, different price. Drag the slider: at 0% the loop returns; at 100% the cancel almost never happens.';
    s._seek = t => { if (st.price !== 50) { st.price = 50; runs = mk(50); } drawRC(g, runs, Math.min(SPAN, t), 50); info(cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      if (st.t >= SPAN + 3) st.t = 0;
      drawRC(g, runs, Math.min(SPAN, st.t), st.price);
      info(st.price === 0 ? 'Free: the bar never runs out, so the defender never acts. The price is what keeps the cancel fair.' : `At ${st.price}% a cancel, the attacker keeps the turn ${runs[2].rcs} times in 20 s, and the defender acts ${Math.round(100 * runs[2].def / SPAN)}% of the time.`);
    };
  });

  /* ---------- 2. Go's ko rule ---------- */
  const N = 9, CELL = 40;
  const BASE = { B: [[3, 3], [2, 4], [3, 5], [2, 3], [2, 5], [6, 6], [6, 7], [1, 6]], W: [[4, 3], [5, 4], [4, 5], [3, 4], [5, 3], [5, 5], [6, 2], [2, 7]] };
  const key = (x, y) => x + ',' + y;
  const board = moves => { const b = new Map(); BASE.B.forEach(p => b.set(key(...p), 'B')); BASE.W.forEach(p => b.set(key(...p), 'W')); moves.forEach(m => { if (m.cap) b.delete(key(...m.cap)); if (m.at && !m.ghost) b.set(key(...m.at), m.c); }); return b; };
  const TAKE_B = { c: 'B', at: [4, 4], cap: [3, 4] }, TAKE_W = { c: 'W', at: [3, 4], cap: [4, 4] };
  const RULE = [
    { m: null, cap: 'The ko shape. White\'s marked stone has one liberty left.' },
    { m: { ...TAKE_B, lab: 'takes' }, cap: 'Black takes the ko, capturing one white stone.' },
    { m: { c: 'W', at: [3, 4], ghost: true, lab: 'not yet' }, cap: 'White may not take back at once: the board would repeat.' },
    { m: { c: 'W', at: [7, 1], lab: 'threat' }, cap: 'So white plays a threat elsewhere first.' },
    { m: { c: 'B', at: [7, 2], lab: 'answer' }, cap: 'Black answers the threat.' },
    { m: { ...TAKE_W, lab: 'retakes' }, cap: 'Now white may retake, capturing black\'s stone.' },
    { m: { c: 'B', at: [4, 4], ghost: true, lab: 'not yet' }, cap: 'Black may not retake at once either.' },
    { m: { c: 'B', at: [1, 1], lab: 'no threat' }, cap: 'Black has no threat that matters, so plays elsewhere.' },
    { m: { c: 'W', at: [4, 4], lab: 'fills' }, cap: 'White fills the gap. The fight is over, and it cost each side moves elsewhere.' },
  ];
  function drawBoard(g, x0, y0, b, last, ghost, title, sub) {
    txt(g, title, x0 + CELL * 4, y0 - 52, { font: '800 18px Montserrat', align: 'center' });
    txt(g, sub, x0 + CELL * 4, y0 - 30, { font: '600 13px Jost', col: C.muted, align: 'center' });
    rr(g, x0 - 24, y0 - 24, CELL * 8 + 48, CELL * 8 + 48, 8, '#e3bd77');
    g.strokeStyle = '#6b4a1d'; g.lineWidth = 1.2;
    for (let i = 0; i < N; i++) { g.beginPath(); g.moveTo(x0, y0 + i * CELL); g.lineTo(x0 + 8 * CELL, y0 + i * CELL); g.moveTo(x0 + i * CELL, y0); g.lineTo(x0 + i * CELL, y0 + 8 * CELL); g.stroke(); }
    [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]].forEach(([x, y]) => { g.fillStyle = '#6b4a1d'; g.beginPath(); g.arc(x0 + x * CELL, y0 + y * CELL, 3, 0, TAU); g.fill(); });
    const stone = (x, y, c, a = 1) => { const cx = x0 + x * CELL, cy = y0 + y * CELL, gr = g.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 18); if (c === 'B') { gr.addColorStop(0, '#555'); gr.addColorStop(1, '#111'); } else { gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#cfcfcf'); } g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 18, 0, TAU); g.fill(); g.globalAlpha = 1; };
    b.forEach((c, k) => { const [x, y] = k.split(',').map(Number); stone(x, y, c); });
    g.strokeStyle = 'rgba(229,50,45,.8)'; g.lineWidth = 2; g.setLineDash([3, 3]); g.strokeRect(x0 + 3 * CELL - 22, y0 + 4 * CELL - 22, 2 * CELL + 44, 44); g.setLineDash([]);
    if (ghost) { stone(ghost.at[0], ghost.at[1], ghost.c, 0.35); const cx = x0 + ghost.at[0] * CELL, cy = y0 + ghost.at[1] * CELL; g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 12, cy - 12); g.lineTo(cx + 12, cy + 12); g.moveTo(cx + 12, cy - 12); g.lineTo(cx - 12, cy + 12); g.stroke(); }
    const mk = ghost || last;
    if (last && !ghost) { const cx = x0 + last.at[0] * CELL, cy = y0 + last.at[1] * CELL; g.strokeStyle = last.c === 'B' ? '#fff' : '#111'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.stroke(); }
    if (mk && mk.lab) T.label(mk.lab, x0 + mk.at[0] * CELL, y0 + mk.at[1] * CELL - 32, 'center', ghost ? '#fff' : C.navy, 13, ghost ? C.red : 'rgba(255,252,244,.95)');
  }
  function drawKo(g, k) {
    bg(g);
    const kk = Math.min(k, RULE.length - 1);
    // left: no rule, the same two moves forever
    const lm = k === 0 ? [] : [k % 2 ? TAKE_B : TAKE_W], lb = k % 2 ? board([TAKE_B]) : board([]);
    drawBoard(g, 70, 110, lb, k ? (k % 2 ? { ...TAKE_B, lab: 'takes' } : { ...TAKE_W, lab: 'takes back' }) : null, null, 'No ko rule', 'take, take back, take, take back…');
    txt(g, `${k} moves played · board repeated ${Math.floor(k / 2)} times`, 70 + CELL * 4, 110 + CELL * 8 + 52, { font: '800 15px Montserrat', col: k > 2 ? C.red : C.navy, align: 'center' });
    // right: with the rule
    const real = RULE.slice(1, kk + 1).map(r => r.m).filter(m => !m.ghost), cur = RULE[kk].m;
    drawBoard(g, 610, 110, board(real), cur && !cur.ghost ? cur : null, cur && cur.ghost ? cur : null, 'With the ko rule', 'retake only after a move elsewhere');
    txt(g, kk >= RULE.length - 1 ? `Settled after ${real.length} moves` : `${real.length} moves played · board never repeats`, 610 + CELL * 4, 110 + CELL * 8 + 52, { font: '800 15px Montserrat', col: kk >= RULE.length - 1 ? C.good : C.navy, align: 'center' });
    g.strokeStyle = 'rgba(38,44,106,.15)'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2, 40); g.lineTo(W / 2, H - 40); g.stroke();
    txt(g, 'red box: the ko', W / 2, H - 16, { font: '600 12px Jost', col: C.muted, align: 'center' });
  }
  canvasDemo('ko', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, k: 0, key: '' }, tourBtn = $(s, '.ko-tour');
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.ko-step').onclick = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.k = 0; } else st.k = st.k >= RULE.length - 1 ? 0 : st.k + 1; st.key = ''; };
    function info(k) {
      const kk = Math.min(k, RULE.length - 1), kkey = 'k' + kk; if (kkey === st.key) return; st.key = kkey;
      const real = RULE.slice(1, kk + 1).filter(r => !r.m.ghost).length;
      say($(s, '.ko-stats'), `<div class="r"><b>${Math.floor(kk / 2)}</b><span>repeats of the same board without the rule</span></div><div class="g"><b>${RULE.slice(1, kk + 1).filter(r => r.m && ['threat', 'no threat'].includes(r.m.lab)).length}</b><span>moves elsewhere the rule has forced (${real} moves in all)</span></div>`);
      say($(s, '.ko-out'), RULE[kk].cap);
    }
    const STEP = 2, DUR = STEP * RULE.length + 2;
    s._seek = t => { const k = Math.min(RULE.length - 1, Math.floor(t / STEP)); drawKo(g, k); info(k); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      drawKo(g, st.k); info(st.k);
    };
  });
})();
