/* Audit Gallery: the nine fundamentals of action games (deck slides 242-255) run against thirteen games (data.js).
   One scene per game. The walk-through plays each kit in turn, lighting the cell each move belongs to, marking the
   empty cells as gaps (or n/a when the game cannot express that cell at all), then shows what the audit found.
   Manual mode: pick a kit or the findings in the side panel, or click a cell to read it against the current kit.
   Move chips are coloured by risk, read against the deck's high-risk and low-risk examples for each cell. */
(function () {
  const { $, $$ } = FPF.kit;
  const { icon, text, wrap, chip, TONE, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C;
  const ROWS = [['Offensive', '#e5736b', 'crossed-swords'], ['Defensive', '#6f93e0', 'checked-shield'], ['Predictive', '#62b77c', 'eye-target']];
  const COLS = [['Before', '#f2c94c'], ['During', '#f0954a'], ['Post', '#9b7fd6']];
  // [name, definition], row-major: the deck's definitions (slides 246-254)
  const CELLS = [
    ['Initiate', 'Pre-empting the opponent by performing an offensive, proactive action.'],
    ['Zone', 'Putting hitboxes out to influence what the opponent is doing and where they go.'],
    ['Punish', 'Making use of an enemy mistake to land an attack that would otherwise not be possible or easy to avoid.'],
    ['Mitigate', 'Proactively acting to prevent or reduce an incoming attack.'],
    ['Reflex', 'Twitch-responses to an incoming attack in flight.'],
    ['React', 'Done in response to a situation, such as an enemy telegraph or an attack hitting you.'],
    ['Setup', 'Performing an action to prepare before an exchange.'],
    ['Counterplay', 'Observing the opponent’s patterns, reading when they will repeat, and countering them during the exchange.'],
    ['Response', 'Seeing how the opponent is playing and changing your own state to improve your situation.'],
  ];
  const NAMES = CELLS.map(c => c[0]);
  const GX = c => 190 + c * 146, GY = r => 140 + r * 132, CW = 136, CH = 120;
  const P = 566, PW = 460;
  const STEP = .42, HOLD = 3.4, FIND = 7;
  const RISK = { H: { ...TONE.red, label: 'high risk' }, L: { ...TONE.teal, label: 'low risk' } };

  // every move that counts for a kit: its own, plus an inherited kit's (drawn faint)
  const allMoves = (G, k) => { const K = G.kits[k]; return (K.inherit != null ? G.kits[K.inherit].moves.map(m => [...m, true]) : []).concat(K.moves); };
  const naOf = (G, k) => G.kits[k].na || G.na || {};
  const gapsOf = (G, k) => { const mv = allMoves(G, k), na = naOf(G, k); return NAMES.filter(n => !na[n] && !mv.some(m => m[2] === n)); };
  const covered = (G, k) => NAMES.filter(n => allMoves(G, k).some(m => m[2] === n)).length;
  const kitLen = K => .6 + K.moves.length * STEP + HOLD;
  const durOf = G => G.kits.reduce((s, K) => s + kitLen(K), 0) + FIND;

  // where the walk-through is at time t: {kit, since} or {find, since}
  function at(G, t) {
    let t0 = 0;
    for (let k = 0; k < G.kits.length; k++) { const d = kitLen(G.kits[k]); if (t < t0 + d) return { kit: k, since: t - t0 }; t0 += d; }
    return { kit: G.kits.length - 1, find: true, since: t - t0 };
  }

  function cellArt(g, r, c, x, y, a = 1, lit = 0, na = false) {
    const w = CW, h = CH, x0 = x - w / 2, y0 = y - h / 2;
    g.save(); g.globalAlpha *= a;
    g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.save(); g.clip();
    g.fillStyle = ROWS[r][1]; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = COLS[c][1]; g.beginPath(); g.moveTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = `rgba(255,250,240,${.55 - .35 * lit})`; g.fillRect(x0, y0, w, h);
    if (na) {
      g.fillStyle = 'rgba(236,232,222,.86)'; g.fillRect(x0, y0, w, h);
      g.strokeStyle = 'rgba(150,140,120,.45)'; g.lineWidth = 2;
      for (let d = -h; d < w; d += 12) { g.beginPath(); g.moveTo(x0 + d, y0 + h); g.lineTo(x0 + d + h, y0); g.stroke(); }
    }
    g.restore();
    g.strokeStyle = na ? '#9a917c' : C.navy; g.lineWidth = 3; g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.stroke();
    GI.draw(g, ROWS[r][2], x0 + 18, y0 + 18, 22, na ? '#9a917c' : C.navy);
    text(g, COLS[c][0][0], x0 + w - 15, y0 + h - 15, { size: 17, w: 800, display: true, col: na ? '#9a917c' : C.navy });
    g.restore();
  }
  const art = (g, a, x, y, s, o = {}) => {
    if (a.startsWith('gi:')) {
      g.save(); g.globalAlpha *= o.a ?? 1; g.fillStyle = '#7a6a52'; g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, 6); g.fill();
      GI.draw(g, a.slice(3), x, y, s * .7, '#fff'); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, 6); g.stroke(); g.restore();
    } else icon(g, a, x, y, s, { lw: 2, a: o.a });
  };

  function grid(g, G, k, shownCount, since, tour, sel) {
    COLS.forEach(([n, col], c) => text(g, n, GX(c), 46, { size: 20, w: 800, display: true, col: col === '#f2c94c' ? '#b88a10' : col }));
    ROWS.forEach(([n, col], r) => text(g, n, GX(0) - CW / 2 - 12, GY(r), { size: 17, w: 800, display: true, col, align: 'right' }));
    text(g, 'Counter circle  ×  timing', GX(1), 18, { size: 13, col: C.muted });
    const K = G.kits[k], inh = K.inherit != null ? G.kits[K.inherit].moves.map(m => [...m, true]) : [];
    const own = K.moves.slice(0, shownCount), mv = inh.concat(own), na = naOf(G, k);
    const done = shownCount >= K.moves.length && since > .6 + K.moves.length * STEP + .15;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const i = r * 3 + c, n = NAMES[i], x = GX(c), y = GY(r), here = mv.filter(m => m[2] === n);
      const lit = here.some(m => !m[5]) ? 1 : here.length ? .5 : 0;
      if (lit === 1) { g.fillStyle = 'rgba(253,214,99,.8)'; g.beginPath(); g.roundRect(x - CW / 2 - 7, y - CH / 2 - 7, CW + 14, CH + 14, 14); g.fill(); }
      if (sel === i) { g.strokeStyle = C.navy; g.lineWidth = 4; g.setLineDash([7, 5]); g.beginPath(); g.roundRect(x - CW / 2 - 9, y - CH / 2 - 9, CW + 18, CH + 18, 15); g.stroke(); g.setLineDash([]); }
      cellArt(g, r, c, x, y, 1, lit ? 1 : 0, !!na[n] && done);
      text(g, n, x, y - 18, { size: n.length > 9 ? 16 : 18, w: 800, display: true, col: na[n] && done ? '#8a816c' : C.ink });
      if (here.length) {
        const s = here.length > 3 ? 24 : 30, gap = s + 4, list = here.slice(0, 4);
        list.forEach((m, j) => art(g, m[1], x - (list.length - 1) * gap / 2 + j * gap, y + 22, s, { a: m[5] ? .45 : 1 }));
      } else if (done && na[n]) text(g, 'n/a', x, y + 22, { size: 17, w: 800, col: '#8a816c', it: true });
      else if (done) text(g, 'gap', x, y + 22, { size: 17, w: 800, col: C.redDk, it: true });
    }
  }

  function header(g, G, sub, a) {
    art(g, a, P + 40, 52, 54);
    text(g, G.game, P + 78, 40, { align: 'left', size: G.game.length > 22 ? 19 : 23, w: 800, display: true });
    text(g, sub, P + 78, 66, { align: 'left', size: 13.5, col: C.muted });
  }

  function kitPanel(g, G, k, since, tour) {
    const K = G.kits[k], n = K.moves.length;
    panel(g, P, 14, PW, 558);
    header(g, G, `${K.name}: ${K.sub}`, K.art);
    if (G.kits.length > 1) G.kits.forEach((_, j) => chip(g, `${j + 1}/${G.kits.length}`, P + PW - 34, 40, { ...(j === k ? TONE.navy : TONE.grey), size: 11, width: 44, a: j === k ? 1 : 0 }));
    const top = K.inherit != null ? 118 : 102, rh = Math.min(42, (392 - (top - 102)) / n);
    if (K.inherit != null) text(g, `+ ${G.kits[K.inherit].name.toLowerCase()} (${G.kits[K.inherit].moves.length} moves, drawn faint)`, P + 22, 100, { align: 'left', size: 13, w: 700, col: C.muted, it: true });
    K.moves.forEach((m, j) => {
      const a = tour ? clamp((since - .6 - j * STEP) / .3) : 1, y = top + 12 + j * rh;
      if (a <= 0) return;
      g.save(); g.globalAlpha = a;
      art(g, m[1], P + 36, y, Math.min(32, rh - 6));
      const tight = rh < 38;
      text(g, m[0], P + 62, y - (tight ? 7 : 8), { align: 'left', size: tight ? 13.5 : 14.5, w: 800 });
      text(g, m[4], P + 62, y + (tight ? 8 : 10), { align: 'left', size: tight ? 11.5 : 12, col: C.muted });
      chip(g, m[2], P + PW - 112, y, { ...RISK[m[3]], size: 12, width: 96, align: 'left' });
      g.restore();
    });
    const ga = tour ? clamp((since - .6 - n * STEP - .2) / .4) : 1;
    const gaps = gapsOf(G, k), na = Object.keys(naOf(G, k));
    const hi = K.moves.filter(m => m[3] === 'H').length;
    const line = `${covered(G, k)} of 9 cells. ` + (gaps.length ? `Gaps: ${gaps.join(', ')}. ` : 'No gaps. ') + (na.length ? `n/a: ${na.join(', ')}.` : '');
    wrap(g, line, P + 22, 518, PW - 44, { size: 14.5, w: 700, col: gaps.length ? C.redDk : C.ink, lh: 18, a: ga });
    chip(g, `${hi} high risk`, P + 22, 556, { ...RISK.H, size: 11.5, align: 'left', a: ga });
    chip(g, `${n - hi} low risk`, P + 112, 556, { ...RISK.L, size: 11.5, align: 'left', a: ga });
  }

  function findPanel(g, G, since, tour) {
    const a = tour ? ease(clamp(since / .5)) : 1;
    panel(g, P, 14, PW, 558);
    g.save(); g.globalAlpha = a;
    header(g, G, 'What the audit found', G.art);
    let y = 104;
    G.kits.forEach((K, k) => {
      art(g, K.art, P + 34, y + 4, 28);
      text(g, K.name, P + 56, y + 4, { align: 'left', size: 14.5, w: 800 });
      const cov = covered(G, k);
      for (let i = 0; i < 9; i++) { const n = NAMES[i], on = allMoves(G, k).some(m => m[2] === n), na = naOf(G, k)[n];
        g.fillStyle = on ? '#f2b632' : na ? '#d9d3c4' : '#f3d0cc'; g.strokeStyle = on ? '#9a6a06' : na ? '#a8a08a' : C.red; g.lineWidth = 1.5;
        g.beginPath(); g.roundRect(P + 262 + i * 15, y - 4, 12, 16, 3); g.fill(); g.stroke(); }
      text(g, `${cov}/9`, P + PW - 24, y + 4, { align: 'right', size: 15, w: 800, display: true });
      y += 34;
    });
    y += 6;
    const lines = wrap(g, G.finding, P + 22, y + 8, PW - 44, { size: 17, lh: 23, w: 500, col: C.ink });
    y += 8 + lines.length * 23 + 12;
    if (G.off) {
      text(g, 'Off the grid (no opponent to answer):', P + 22, y + 6, { align: 'left', size: 13, w: 700, col: C.muted });
      let x = P + 22; y += 30;
      G.off.forEach(o => { const w = chip(g, o, x, y, { ...TONE.grey, size: 12, align: 'left' }); x += w + 6; if (x > P + PW - 80) { x = P + 22; y += 28; } });
    }
    g.restore();
  }

  (window.AUDITS || []).forEach(G => {
    scene('audit-' + G.id, {
      dur: durOf(G),
      state: () => ({ kit: 0, find: false, cell: null }),
      init(s, st, api) {
        const box = $(s, '.au-kits');
        box.innerHTML = G.kits.map((K, i) => `<button class="btn" data-k="${i}">${K.name}</button>`).join('') + `<button class="btn" data-k="find">What the audit found</button>`;
        $$(box, '.btn').forEach(b => b.onclick = () => { api.manual(); st.cell = null; if (b.dataset.k === 'find') st.find = true; else { st.find = false; st.kit = +b.dataset.k; } sync(); });
        function sync() { $$(box, '.btn').forEach(b => b.classList.toggle('on', !st.tour && (b.dataset.k === 'find' ? st.find : !st.find && +b.dataset.k === st.kit))); }
        st.sync = sync;
        pointer(api.cv, (x, y, type) => {
          if (type !== 'down') return;
          for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (inBox(x, y, GX(c), GY(r), CW, CH)) {
            if (st.tour) { const m = at(G, st.t); st.kit = m.kit; api.manual(); }
            const i = r * 3 + c; st.find = false; st.cell = st.cell === i ? null : i; sync();
          }
        });
        sync();
      },
      draw(g, t, st, tour) {
        const m = tour ? at(G, t) : { kit: st.kit, find: st.find, since: 99 };
        const K = G.kits[m.kit];
        const shown = m.find || !tour ? K.moves.length : K.moves.filter((_, j) => m.since >= .6 + j * STEP).length;
        grid(g, G, m.kit, shown, m.find ? 99 : m.since, tour, tour ? null : st.cell);
        text(g, tour ? (m.find ? 'Gold: filled · red: gap · grey: n/a' : 'Each move lights the cell it belongs to') : 'Click a cell to read it against this kit', GX(1), 560, { size: 14, col: C.muted });
        if (m.find) findPanel(g, G, m.since, tour);
        else if (!tour && st.cell != null) cellPanel(g, G, m.kit, st.cell);
        else kitPanel(g, G, m.kit, m.since, tour);
        st.sync?.();
      },
      side(t, st, tour) {
        const m = tour ? at(G, t) : { kit: st.kit, find: st.find };
        const k = m.kit, gaps = gapsOf(G, k), na = Object.keys(naOf(G, k));
        const stats = `<div class="g"><b>${covered(G, k)}</b><span>cells filled</span></div><div class="r"><b>${gaps.length}</b><span>gaps</span></div>` + (na.length ? `<div><b>${na.length}</b><span>n/a</span></div>` : '');
        const out = m.find ? G.finding : `<b>${G.kits[k].name}</b> (${G.kits[k].sub}) fills ${covered(G, k)} of 9 cells.` + (gaps.length ? ` Gaps: ${gaps.join(', ')}.` : ' No gaps.') + (na.length ? ` Not expressible here: ${na.map(n => `${n} (${naOf(G, k)[n]})`).join(' ')}` : '');
        return { stats, out };
      },
    });
  });

  // a cell read against one kit: the deck's definition, then this kit's moves there, or why it is empty
  function cellPanel(g, G, k, i) {
    const n = NAMES[i], r = Math.floor(i / 3), c = i % 3, here = allMoves(G, k).filter(m => m[2] === n), na = naOf(G, k)[n];
    panel(g, P, 14, PW, 558);
    g.save(); g.translate(P + 56, 70); g.scale(.6, .6); g.translate(-(P + 56), -70); cellArt(g, r, c, P + 56, 70, 1, here.length ? 1 : 0, !!na); g.restore();
    text(g, n, P + 116, 58, { align: 'left', size: 26, w: 800, display: true });
    chip(g, `${ROWS[r][0]} · ${COLS[c][0]}`, P + 116, 88, { ...TONE.grey, size: 12.5, align: 'left' });
    const lines = wrap(g, CELLS[i][1], P + 22, 146, PW - 44, { size: 15.5, w: 600, lh: 21 });
    let y = 146 + lines.length * 21 + 22;
    text(g, `${G.kits[k].name}:`, P + 22, y, { align: 'left', size: 14, w: 800, col: C.muted }); y += 34;
    if (here.length) here.forEach(m => {
      art(g, m[1], P + 40, y, 34, { a: m[5] ? .5 : 1 });
      text(g, m[0], P + 66, y - 8, { align: 'left', size: 15, w: 800 });
      text(g, m[4], P + 66, y + 11, { align: 'left', size: 12.5, col: C.muted });
      chip(g, RISK[m[3]].label, P + PW - 104, y, { ...RISK[m[3]], size: 12, width: 84, align: 'left' });
      y += 50;
    });
    else wrap(g, na ? `Not expressible: ${na}` : 'A gap. Nothing in this kit fills it: a question for the design, not a verdict.', P + 22, y, PW - 44, { size: 15, w: 700, lh: 20, col: na ? '#6d6552' : C.redDk });
  }
})();
