/* Feedback loop sandbox (MGM C4 M3, deck slides 155-176). Left: what each loop does to the numbers over 30 rounds.
   Right: the loops themselves, drawn the way the deck draws them, lighting up as they fire. The rules are in loops-model.js.
   The deck's warning, kept in every caption: positive does not mean desirable, negative does not mean undesirable. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, M = window.LoopModel;
  const W = 1040, H = 585, TAU = Math.PI * 2;
  const PRESETS = [
    { k: 'fire', name: 'Wildfire', o: { pos: 1, solo: 1 }, a: 'Fire size', cap: 'Fire burns objects, gets bigger, reaches further and catches more objects on fire. Each round adds more than the last: an upwards trend.' },
    { k: 'thermo', name: 'Thermostat', o: { neg: 1, solo: 1 }, a: 'Room temperature', cap: 'The thermostat notices the room is too hot or cold and pushes back toward its setting. However hard the day pushes, the line stays flat.' },
    { k: 'rich', name: 'Rich get richer', o: { pos: 1 }, cap: 'Positive loop: whoever is ahead turns the lead into more lead, like the rich investing or a StarCraft, Counter-Strike or chess player who loses units and with them the means to win them back. A tiny head start snowballs off the chart.' },
    { k: 'kart', name: 'Mario Kart items', o: { neg: 1 }, cap: 'Negative loop: the further behind you are, the stronger the items you roll. The gap keeps closing, so the race stays close: a flat trend. Bloodborne’s rally, healing by hitting back, works the same way.' },
    { k: 'dead', name: 'Deadlock bounties', o: { pos: 1, neg: 1 }, cap: 'Both at once. Kills snowball, but the richest players carry the biggest bounties and wait longest to respawn. The two loops cancel out and the match stays live.' },
    { k: 'dim', name: 'Diminishing returns', o: { pos: 1, dim: 1 }, cap: 'The snowball again, but each advantage buys less the bigger you already are, like Xerath’s stun per rank or Elden Ring’s stat soft caps. Getting ahead still pays; it just stops multiplying.' },
    { k: 'cap', name: 'Limit', o: { pos: 1, cap: 1 }, cap: `The snowball again, but it stops at a limit: a fighting game knockdown ends the combo and resets to neutral, Towerfall caps how many arrows you can hold. The lead can’t grow past ${M.LIMIT}.` },
  ];
  const TOUR = ['rich', 'kart', 'dead', 'dim', 'cap'];
  const SPEED = 8, HOLD = 1.4, SEG = M.ROUNDS / SPEED + HOLD;
  const st = { o: { ...PRESETS[2].o }, preset: 2, t: 0, tour: true, tt: 0, held: false };

  const X0 = 70, X1 = 670, Y0 = 520, Y1 = 78, VMAX = 400;
  const rx = r => lerp(X0, X1, r / M.ROUNDS), vy = v => lerp(Y0, Y1, clamp(v / VMAX));
  const TREND = { up: 'Upwards trend', flat: 'Flat trend', down: 'Downwards trend' };

  function series(g, arr, r, col, w = 4) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath();
    const n = Math.floor(r), f = r - n;
    for (let i = 0; i <= Math.min(n, M.ROUNDS); i++) i ? g.lineTo(rx(i), vy(arr[i])) : g.moveTo(rx(i), vy(arr[i]));
    if (n < M.ROUNDS && f > 0) g.lineTo(rx(n + f), vy(lerp(arr[n], arr[n + 1], f)));
    g.stroke();
    const v = n < M.ROUNDS ? lerp(arr[n], arr[n + 1], f) : arr[M.ROUNDS];
    g.fillStyle = col; g.beginPath(); g.arc(rx(Math.min(r, M.ROUNDS)), vy(v), 7, 0, TAU); g.fill();
    if (v > VMAX) { T.label('off the chart ↑', rx(Math.min(r, M.ROUNDS)), Y1 - 22, 'center', col, 13); }
    return v;
  }
  function loop(g, cx, cy, sign, nodes, on, fire, col) {
    const R = 74;
    g.globalAlpha = on ? 1 : 0.28;
    g.strokeStyle = col; g.lineWidth = fire ? 6 : 3;
    for (let i = 0; i < 3; i++) {
      const a0 = -Math.PI / 2 + i * TAU / 3 + 0.42, a1 = a0 + TAU / 3 - 0.84;
      g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
      const ax = cx + Math.cos(a1) * R, ay = cy + Math.sin(a1) * R, ta = a1 + Math.PI / 2;
      g.fillStyle = col; g.beginPath(); g.moveTo(ax + Math.cos(ta) * 10, ay + Math.sin(ta) * 10); g.lineTo(ax + Math.cos(ta + 2.5) * 10, ay + Math.sin(ta + 2.5) * 10); g.lineTo(ax + Math.cos(ta - 2.5) * 10, ay + Math.sin(ta - 2.5) * 10); g.fill();
    }
    g.fillStyle = col; g.font = '700 40px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sign, cx, cy + 2);
    nodes.forEach((t, i) => {
      const a = -Math.PI / 2 + i * TAU / 3, x = cx + Math.cos(a) * (R + 4), y = cy + Math.sin(a) * (R + 4);
      T.label(t, x, y, 'center', C.ink, 13);
    });
    g.globalAlpha = 1;
  }

  function draw(g, res, o, p, r) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, 700, H, 14); g.roundRect(716, 0, 324, H, 14); g.fill();
    // ---------- chart ----------
    if (o.solo) T.label(p.a || 'Value', X0 + 8, 32, 'left', '#fff', 15, C.navy);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textBaseline = 'middle';
    [0, 100, 200, 300, 400].forEach(v => { g.beginPath(); g.moveTo(X0, vy(v)); g.lineTo(X1, vy(v)); g.stroke(); g.textAlign = 'right'; g.fillText(v, X0 - 8, vy(v)); });
    g.textAlign = 'center'; [0, 5, 10, 15, 20, 25, 30].forEach(i => g.fillText(`round ${i}`, rx(i), Y0 + 20));
    if (o.solo && o.neg) { g.setLineDash([7, 6]); g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.moveTo(X0, vy(M.SET)); g.lineTo(X1, vy(M.SET)); g.stroke(); g.setLineDash([]); T.label('thermostat setting', X1 - 70, vy(M.SET) - 16, 'center', C.goldInk, 12); }
    const n = Math.floor(Math.min(r, M.ROUNDS));
    if (!o.solo) {
      // shade the gap
      g.fillStyle = 'rgba(224,169,45,.18)'; g.beginPath();
      for (let i = 0; i <= n; i++) i ? g.lineTo(rx(i), vy(res.A[i])) : g.moveTo(rx(i), vy(res.A[i]));
      for (let i = n; i >= 0; i--) g.lineTo(rx(i), vy(res.B[i]));
      g.fill();
    }
    const va = series(g, res.A, r, o.solo ? (o.pos ? C.red : C.player) : C.player);
    let vb = null;
    if (!o.solo) vb = series(g, res.B, r, C.p2);
    // the trend label, once the round count is high enough to read one
    if (r >= 10) {
      const tr = M.trend(res, o.solo, n);
      T.label(TREND[tr], X1 - 4, 32, 'right', '#fff', 15, tr === 'up' ? C.red : C.good);
    }
    if (!o.solo) {
      T.label(`Player 1 · ${Math.round(va)}`, X0 + 8, 32, 'left', C.player, 15);
      T.label(`Player 2 · ${Math.round(vb)}`, X0 + 170, 32, 'left', C.p2, 15);
    }
    // ---------- the loops ----------
    const fired = n > 0 && n <= M.ROUNDS ? res.gain[n - 1] : { pos: 0, neg: 0 };
    const pulse = (r % 1) < 0.5;
    const posNodes = o.solo ? ['Fire burns objects', 'Fire is bigger', 'Catches more'] : ['Ahead', 'Takes more', 'Further ahead'];
    const negNodes = o.solo ? ['Too hot or cold', 'Pushes back', 'Stays the same'] : ['Behind', 'Gets help', 'Gap closes'];
    T.label('Positive (acceleration) loop', 878, 28, 'center', '#fff', 14, C.red);
    loop(g, 878, 150, '+', posNodes, !!o.pos, o.pos && fired.pos > 0.5 && pulse, C.red);
    T.label('Negative (self-regulating) loop', 878, 272, 'center', '#fff', 14, C.player);
    loop(g, 878, 392, '−', negNodes, !!o.neg, o.neg && Math.abs(fired.neg) > 0.5 && pulse, C.player);
    // controls on the positive loop
    const tags = [];
    if (o.dim) tags.push('diminishing returns');
    if (o.cap) tags.push(`limit: lead ≤ ${M.LIMIT}`);
    if (tags.length) T.label(tags.join(' · '), 878, 236, 'center', C.goldInk, 13);
    // the lead
    if (!o.solo) {
      const gap = Math.abs(lerp(res.gap[n], res.gap[Math.min(M.ROUNDS, n + 1)], r - n)), w = 260, bx = 748;
      g.fillStyle = C.muted; g.font = '600 13px Jost, sans-serif'; g.textAlign = 'left'; g.fillText('Lead', bx, 520);
      g.fillStyle = '#eee6d3'; g.fillRect(bx, 532, w, 18); g.fillStyle = C.gold; g.fillRect(bx, 532, w * clamp(gap / 200), 18);
      if (o.cap) { const lx = bx + w * M.LIMIT / 200; g.strokeStyle = C.goldInk; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(lx, 526); g.lineTo(lx, 556); g.stroke(); g.setLineDash([]); }
      g.fillStyle = C.ink; g.textAlign = 'right'; g.fillText(gap > 200 ? `${Math.round(gap)} ↑` : Math.round(gap), bx + w, 520);
    }
  }

  let api = null;
  canvasDemo('loops', (s, cv, g) => {
    const box = $(s, '.fl-presets'), tourBtn = $(s, '.fl-tour');
    box.innerHTML = PRESETS.map((p, i) => `<button class="btn" data-i="${i}">${p.name}</button>`).join('');
    let res = M.run(st.o), last = '';
    const load = (o, i = -1) => { st.o = o; st.preset = i; res = M.run(o); st.t = 0; last = ''; };
    const stop = () => { st.tour = false; };
    $$(box, '[data-i]').forEach(b => b.onclick = () => { stop(); load({ ...PRESETS[+b.dataset.i].o }, +b.dataset.i); });
    const tog = (k) => () => {
      stop(); const o = { ...st.o, [k]: st.o[k] ? 0 : 1 };
      if (k === 'dim' || k === 'cap') { o.solo = 0; if (o[k]) o.pos = 1; }
      if ((k === 'pos' || k === 'neg') && o.solo && !o.pos && !o.neg) o.solo = 0;
      const i = PRESETS.findIndex(p => JSON.stringify(norm(p.o)) === JSON.stringify(norm(o)));
      load(o, i);
    };
    const norm = o => ({ pos: !!o.pos, neg: !!o.neg, dim: !!o.dim, cap: !!o.cap, solo: !!o.solo });
    ['pos', 'neg', 'dim', 'cap'].forEach(k => $(s, '.t-' + k).onclick = tog(k));
    tourBtn.onclick = () => { st.tour = true; st.tt = 0; };
    function render() {
      if (st.tour) {
        const k = Math.floor(st.tt / SEG) % TOUR.length, i = PRESETS.findIndex(p => p.k === TOUR[k]);
        if (i !== st.preset) load({ ...PRESETS[i].o }, i);
        st.t = st.tt - Math.floor(st.tt / SEG) * SEG;
      }
      const r = Math.min(M.ROUNDS, st.t * SPEED), p = PRESETS[st.preset] || {};
      draw(g, res, st.o, p, r);
      const key = [st.preset, JSON.stringify(st.o), st.tour, Math.floor(r / 10)].join('|'); if (key === last) return; last = key;
      $$(box, '[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === st.preset));
      ['pos', 'neg', 'dim', 'cap'].forEach(k => $(s, '.t-' + k).classList.toggle('on', !!st.o[k]));
      tourBtn.classList.toggle('on', st.tour);
      const tr = M.trend(res, st.o.solo, M.ROUNDS);
      say($(s, '.st'), st.o.solo
        ? `<div class="${tr === 'up' ? 'r' : 'g'}"><b>${Math.round(res.A[M.ROUNDS])}</b><span>${p.a ? p.a.toLowerCase() : 'value'} after 30 rounds: ${TREND[tr].toLowerCase()}</span></div>`
        : `<div class="${tr === 'up' ? 'r' : 'g'}"><b>${Math.round(Math.abs(res.gap[M.ROUNDS]))}</b><span>lead after 30 rounds, from a head start of 8: ${TREND[tr].toLowerCase()}</span></div><div><b>${Math.round(Math.min(res.A[M.ROUNDS], res.B[M.ROUNDS]))}</b><span>what the trailing player has left</span></div>`);
      const body = p.cap || (st.o.solo ? '' : `Your mix: ${st.o.pos ? 'a positive loop' : 'no positive loop'}${st.o.neg ? ' and a negative loop' : ''}${st.o.dim ? ', tamed by diminishing returns' : ''}${st.o.cap ? ', stopped by a limit' : ''}. Watch the lead bar.`);
      say($(s, '.out1'), `${body} <span class="muted">Positive doesn’t mean desirable: it means the loop feeds itself.</span>`);
    }
    const DUR = SEG * TOUR.length;
    api = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) { if (st.tour) st.tt = (st.tt + dt) % DUR; else st.t = Math.min(st.t + dt, M.ROUNDS / SPEED + 10); } render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
