/* Unfair fairness board (Module 8, Part 3, slides 91-109).
   Slide 1: champions (rows) against situations (columns). Each cell is dominant, even or weak. "Contextually overpowered =
   balanced and memorable; always overpowered = unbalanced and unfair": any row with no weak cell gets a "no answer" flag,
   which is how Kassadin stands out from the other five. The learner can add rows and shade any cell.
   Slide 2: Ori's Reckless shard as two multipliers (damage dealt, damage taken), read through hits to kill.
   Both canvases draw purely from time t (plus the learner's edits), so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const img = {};
  const load = n => { const i = new Image(); i.src = `img/${n}.png`; img[n] = i; };
  const pic = (g, n, x, y, s) => { const i = img[n]; if (i && i.complete && i.naturalWidth) { g.drawImage(i, x, y, s, s); return true; } return false; };
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };

  /* ---------- slide 1: the board ---------- */
  const COLS = ['early game', 'late game', 'vs auto-attackers', 'with knock-up allies', 'teamfight', 'vs mages'];
  const EVEN = 0, DOM = 1, WEAK = 2;
  const CHAMPS = [
    { name: 'Rammus', cells: [0, 0, 1, 0, 0, 2], line: 'Rammus is fair to dominate when the enemy team leans on auto-attacks. Mages walk straight past his armor.' },
    { name: 'Veigar', cells: [2, 1, 2, 0, 0, 0], line: 'Veigar is weak early and dominant once he has farmed into the late game. The early weakness is the price.' },
    { name: 'Tristana', cells: [2, 1, 0, 0, 1, 2], line: 'A full-build Tristana with a team protecting her can win a teamfight alone. Catch her early or alone and she falls.' },
    { name: 'Yasuo', cells: [0, 0, 2, 1, 0, 0], line: 'Yasuo dominates when his allies bring knock-ups. Without them he is one champion among many.' },
    { name: 'Amumu', cells: [2, 0, 0, 0, 1, 0], line: 'Amumu’s team-wide hold makes him the hero of a teamfight, and not much else.' },
    { name: 'Kassadin', cells: [0, 1, 1, 1, 1, 1], line: 'Kassadin dominates everyone and makes it impossible for mages to win. No situation answers him.' },
  ];
  CHAMPS.forEach(c => load(c.name));
  const FILL = ['#ece3cf', '#ffb951', '#a9c4e6'], EDGE = ['#cdbf9f', '#c98a1e', '#5d8fd6'], WORD = ['even', 'dominant', 'weak'], INK = ['#5d618c', '#4a2c00', '#14305e'];
  const X0 = 214, CW = 112, Y0 = 76, RH = 60, FX = X0 + CW * 6 + 8;
  const noAnswer = r => !r.cells.includes(WEAK);

  // walk-through: the five fair rows, then Kassadin, then a learner row shaded step by step
  const DUR = 24;
  const YOU = 'Your pick';
  function tourRows(t) {
    const rows = [], k = { row: -1, cell: -1, cap: '' };
    CHAMPS.forEach((c, i) => { const t0 = i < 5 ? 1 + i * 2 : 11; if (t >= t0) { rows.push({ name: c.name, cells: c.cells.slice(), born: t0, flagAt: t0 + 1 }); k.row = rows.length - 1; k.cap = c.line; } });
    if (t < 1) k.cap = 'Six Wild Rift champions against six situations. Watch where each one is dominant, and where each one is weak.';
    if (t >= 12.6) k.cap = 'Kassadin’s row has no weak cell, so the board flags it. Contextually overpowered is fair. Always overpowered is not.';
    if (t >= 14) {
      const r = { name: YOU, cells: [0, 0, 0, 0, 0, 0], born: 14, flagAt: 14.6, user: true }; rows.push(r); k.row = rows.length - 1;
      k.cap = 'A new champion starts even everywhere. With no weak cell it is flagged too: nothing answers it yet.';
      const steps = [[16, 4, DOM], [17, 1, DOM], [18.5, 0, WEAK], [19.5, 5, WEAK]];
      steps.forEach(([ts, ci, v]) => { if (t >= ts) { r.cells[ci] = v; k.cell = ci; } });
      if (t >= 16) k.cap = 'Give it a moment to shine: dominant in a teamfight and in the late game.';
      if (t >= 18.5) k.cap = 'Then give it a price. A weak early game clears the flag: there is now a situation where it can be beaten.';
      if (t >= 21) k.cap = 'Make every champion the hero of some moment. Fear the one-champion-does-it-all design that is dominant everywhere.';
    }
    return { rows, k };
  }

  function drawBoard(g, rows, f, t, hov) {
    T.use(g); panel(g);
    // header
    COLS.forEach((c, i) => {
      const cx = X0 + i * CW + CW / 2, words = c.split(' '), half = Math.ceil(words.length / 2);
      const l1 = words.length > 2 ? words.slice(0, half).join(' ') : c, l2 = words.length > 2 ? words.slice(half).join(' ') : '';
      txt(g, l1, cx, l2 ? 30 : 40, { font: '700 14px Montserrat, Jost, sans-serif', align: 'center', col: C.ink });
      if (l2) txt(g, l2, cx, 49, { font: '700 14px Montserrat, Jost, sans-serif', align: 'center', col: C.ink });
    });
    txt(g, 'champion', 20, 40, { font: '700 13px Montserrat, Jost, sans-serif', col: C.muted });
    txt(g, 'flag', FX + 58, 40, { font: '700 13px Montserrat, Jost, sans-serif', col: C.muted, align: 'center' });
    g.strokeStyle = '#d9cba8'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, Y0 - 8); g.lineTo(W - 14, Y0 - 8); g.stroke();
    rows.forEach((r, ri) => {
      const y = Y0 + ri * RH, a = clamp((t - (r.born ?? -9)) / .4);
      g.save(); g.globalAlpha = a; g.translate(lerp(-30, 0, ease(a)), 0);
      if (f.row === ri) { g.fillStyle = 'rgba(85,98,235,.10)'; g.beginPath(); g.roundRect(10, y - 2, W - 20, RH - 4, 10); g.fill(); }
      // portrait
      g.save(); g.beginPath(); g.roundRect(20, y + 4, 48, 48, 8); g.clip();
      if (!r.user && pic(g, r.name, 20, y + 4, 48)) {} else { g.fillStyle = '#5d618c'; g.fillRect(20, y + 4, 48, 48); txt(g, '?', 44, y + 29, { font: '800 28px Montserrat, Jost, sans-serif', col: '#fff', align: 'center' }); }
      g.restore();
      g.strokeStyle = r.user ? C.blue : C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(20, y + 4, 48, 48, 8); g.stroke();
      txt(g, r.name, 78, y + 28, { font: `700 ${r.name.length > 10 ? 14 : 16}px Montserrat, Jost, sans-serif` });
      // cells
      r.cells.forEach((v, ci) => {
        const x = X0 + ci * CW + 4, cy = y + 4, w = CW - 8, h = RH - 12;
        const hot = (f.row === ri && f.cell === ci) || (hov && hov[0] === ri && hov[1] === ci);
        g.fillStyle = FILL[v]; g.strokeStyle = EDGE[v]; g.lineWidth = hot ? 4 : 2;
        g.beginPath(); g.roundRect(x, cy, w, h, 8); g.fill(); g.stroke();
        txt(g, WORD[v], x + w / 2, cy + h / 2 + 1, { font: `${v === DOM ? 700 : 600} 15px Jost, sans-serif`, col: INK[v], align: 'center' });
      });
      // flag
      const na = noAnswer(r), fa = clamp((t - (r.flagAt ?? -9)) / .35);
      if (na) {
        g.save(); g.globalAlpha *= fa; const sc = lerp(1.5, 1, ease(fa)); g.translate(FX + 58, y + 28); g.scale(sc, sc); g.rotate(-.05);
        g.fillStyle = '#f9d9d6'; g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.roundRect(-54, -17, 108, 34, 8); g.fill(); g.stroke();
        txt(g, 'no answer', 0, 1, { font: '800 15px Montserrat, Jost, sans-serif', col: '#8a1c15', align: 'center' }); g.restore();
      } else {
        const nd = r.cells.filter(v => v === DOM).length, nw = r.cells.filter(v => v === WEAK).length;
        txt(g, `${nd} dominant`, FX + 58, y + 19, { font: '600 13px Jost, sans-serif', col: '#9a5a06', align: 'center' });
        txt(g, `${nw} weak`, FX + 58, y + 37, { font: '600 13px Jost, sans-serif', col: '#14305e', align: 'center' });
      }
      g.restore();
    });
  }

  const scenes = {};
  canvasDemo('board', (s, cv, g) => {
    const fresh = () => CHAMPS.map(c => ({ name: c.name, cells: c.cells.slice() }));
    const st = { rows: fresh(), tour: true, held: false, t: 0, key: '', hov: null, nUser: 0, sel: -1 };
    const tourBtn = $(s, '.uf-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.rows = fresh(); st.nUser = 0; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.uf-reset').onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.rows = fresh(); st.nUser = 0; st.sel = -1; };
    $(s, '.uf-add').onclick = () => { manual(); if (st.rows.length >= 8) return; st.nUser++; st.rows.push({ name: st.rows.length === 6 ? YOU : 'Your pick 2', cells: [0, 0, 0, 0, 0, 0], user: true }); st.sel = st.rows.length - 1; };
    const at = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; const ri = Math.floor((y - Y0) / RH), ci = Math.floor((x - X0) / CW); return x >= X0 && ci < 6 && ri >= 0 ? [ri, ci] : null; };
    cv.addEventListener('mousemove', e => { const h = at(e); st.hov = h && (st.tour || h[0] < st.rows.length) ? h : null; cv.style.cursor = st.hov ? 'pointer' : ''; });
    cv.addEventListener('mouseleave', () => { st.hov = null; });
    cv.addEventListener('click', e => { const h = at(e); if (!h) return; manual(); const r = st.rows[h[0]]; if (!r) return; r.cells[h[1]] = (r.cells[h[1]] + 1) % 3; st.sel = h[0]; });
    function info(rows, cap) {
      const flagged = rows.filter(noAnswer), key = rows.map(r => r.cells.join('')).join('|') + cap;
      if (key === st.key) return; st.key = key;
      say($(s, '.uf-stats'), `<div class="r"><b>${flagged.length}</b><span>row${flagged.length === 1 ? '' : 's'} with no answer${flagged.length ? ': ' + flagged.map(r => r.name).join(', ') : ''}</span></div><div class="g"><b>${rows.length - flagged.length}</b><span>row${rows.length - flagged.length === 1 ? '' : 's'} dominant somewhere and weak somewhere else</span></div>`);
      say($(s, '.uf-out'), cap);
    }
    function manualCap() {
      const r = st.rows[st.sel];
      if (!r) return 'Contextually overpowered = balanced and memorable. Always overpowered = unbalanced and unfair. Click any cell, or add your own champion.';
      if (r.user) return noAnswer(r) ? `${r.name} has no weak cell, so nothing answers it. Shade one situation where it loses.` : `${r.name} has a price now. Check that its dominant cells are moments worth building a team around.`;
      const c = CHAMPS.find(c => c.name === r.name); return noAnswer(r) ? `${r.name} has no weak cell left. That is the Kassadin problem.` : c.line;
    }
    scenes.board = { seek(t) { st.held = true; const { rows, k } = tourRows(t); drawBoard(g, rows, k, t, null); info(rows, k.cap); }, dur: () => DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; const { rows, k } = tourRows(st.t); drawBoard(g, rows, k, st.t, st.hov); info(rows, k.cap); }
      else { drawBoard(g, st.rows, { row: st.sel, cell: -1 }, 99, st.hov); info(st.rows, manualCap()); }
    };
  });

  /* ---------- slide 2: the Reckless shard ---------- */
  const EN_HP = 100, ORI_HIT = 20, ORI_HP = 100, EN_HIT = 34;
  const kills = d => Math.ceil(EN_HP / (ORI_HIT * d) - 1e-9), takes = t => Math.ceil(ORI_HP / (EN_HIT * t) - 1e-9);
  const BASE_K = kills(1), BASE_T = takes(1);
  const VERD = {
    free: ['free upgrade: feels mandatory', '#e0a92d', 'The bonus saves hits in every fight, but the drawback never changes how many hits you can take. Nobody has a reason to leave it off.'],
    style: ['its own play-style', '#8a4fd6', 'Enemies fall in two hits, and one hit drops you. Equipping it changes how you play, which is what the quadrupled version did.'],
    power: ['lopsided: more power than price', '#e5322d', 'The price costs you a hit, but the bonus saves several. Still an easy pick for almost everyone.'],
    price: ['lopsided: more price than power', '#5d8fd6', 'You lose more hits than you save. Few players would equip this version.'],
    trade: ['a tradeoff', '#8b8fa8', 'Some power, some price. A real choice, but not yet a distinct way to play.'],
  };
  function verdict(d, t) {
    const k = kills(d), tk = takes(t), gain = BASE_K - k, loss = BASE_T - tk;
    if (tk === 1 && k <= 2) return 'style';
    if (gain > 0 && loss === 0) return 'free';
    if (gain - loss >= 2) return 'power';
    if (loss > gain) return 'price';
    return 'trade';
  }
  const MX = 70, MY = 40, MS = 450, LO = 1.25, HI = 4;
  const mx = d => MX + (d - LO) / (HI - LO) * MS, my = t => MY + MS - (t - LO) / (HI - LO) * MS;
  const RDUR = 18;
  let RMAP = null; const CENT = {};
  function regionMap() {
    if (RMAP) return RMAP;
    RMAP = document.createElement('canvas'); RMAP.width = MS; RMAP.height = MS; const q = RMAP.getContext('2d'), acc = {};
    for (let px = 0; px < MS; px += 3) for (let py = 0; py < MS; py += 3) {
      const d = LO + (px + 1.5) / MS * (HI - LO), t = HI - (py + 1.5) / MS * (HI - LO), v = verdict(d, t);
      q.fillStyle = VERD[v][1]; q.fillRect(px, py, 3, 3);
      const a = acc[v] || (acc[v] = [0, 0, 0]); a[0] += px; a[1] += py; a[2]++;
    }
    Object.entries(acc).forEach(([v, a]) => { CENT[v] = [MX + a[0] / a[2], MY + a[1] / a[2]]; });
    return RMAP;
  }
  const KEYS = [[0, 1.25, 1.25], [3, 1.25, 1.25], [6.5, 4, 4], [9.5, 4, 4], [11.5, 4, 1.25], [13, 4, 1.25], [14.5, 1.25, 4], [15.5, 1.25, 4], [17.5, 4, 4], [18, 4, 4]];
  function rTour(t) {
    for (let i = 0; i < KEYS.length - 1; i++) { const [a, d0, t0] = KEYS[i], [b, d1, t1] = KEYS[i + 1]; if (t < b) { const k = ease(clamp((t - a) / (b - a))); return [lerp(d0, d1, k), lerp(t0, t1, k)]; } }
    return [4, 4];
  }
  function pips(g, x, y, n, max, col, label) {
    txt(g, label, x, y, { font: '700 15px Montserrat, Jost, sans-serif' });
    for (let i = 0; i < max; i++) { const px = x + i * 52; g.fillStyle = i < n ? col : '#ece3cf'; g.strokeStyle = i < n ? C.navy : '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(px, y + 16, 44, 30, 6); g.fill(); g.stroke(); }
    txt(g, `${n}`, x + max * 52 + 8, y + 31, { font: '800 26px Montserrat, Jost, sans-serif', col: C.ink });
  }
  function drawReck(g, d, tk, t) {
    T.use(g); panel(g);
    // region map (drawn once into an offscreen canvas, then laid over the panel at low alpha)
    g.globalAlpha = .3; g.drawImage(regionMap(), MX, MY); g.globalAlpha = 1;
    g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(MX, MY, MS, MS);
    [1.25, 2, 3, 4].forEach(v => { txt(g, v + 'x', mx(v), MY + MS + 16, { font: '600 13px Jost, sans-serif', col: C.muted, align: 'center' }); txt(g, v + 'x', MX - 8, my(v), { font: '600 13px Jost, sans-serif', col: C.muted, align: 'right' }); });
    txt(g, 'damage dealt multiplier', MX + MS / 2, MY + MS + 38, { font: '700 14px Montserrat, Jost, sans-serif', align: 'center' });
    g.save(); g.translate(20, MY + MS / 2); g.rotate(-Math.PI / 2); txt(g, 'damage taken multiplier', 0, 0, { font: '700 14px Montserrat, Jost, sans-serif', align: 'center' }); g.restore();
    // region labels at each region's centre, kept inside the map
    regionMap(); Object.entries(CENT).forEach(([v, [cx, cy]]) => {
      g.font = '600 13px Jost, sans-serif'; const hw = g.measureText(VERD[v][0]).width / 2 + 10;
      T.label(VERD[v][0], clamp(cx, MX + hw, MX + MS - hw), clamp(cy, MY + 14, MY + MS - 14), 'center', VERD[v][1], 13);
    });
    // marker
    const v = verdict(d, tk), px = mx(d), py = my(tk);
    g.fillStyle = 'rgba(85,98,235,.25)'; g.beginPath(); g.arc(px, py, 22 + 3 * Math.sin(t * 5), 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(px, py, 11, 0, TAU); g.fill(); g.stroke();
    // right panel
    const RX = 580;
    txt(g, 'Reckless', RX, 56, { font: '800 26px Montserrat, Jost, sans-serif' });
    txt(g, `deal ${d.toFixed(2)}x damage, take ${tk.toFixed(2)}x damage`, RX, 88, { font: '600 17px Jost, sans-serif', col: C.muted });
    pips(g, RX, 136, kills(d), BASE_K, C.gold, `Hits to kill an enemy (${EN_HP} health, ${ORI_HIT} per hit)`);
    txt(g, `without the shard: ${BASE_K}`, RX, 206, { font: '600 13px Jost, sans-serif', col: C.muted });
    pips(g, RX, 246, takes(tk), BASE_T, C.player, `Hits Ori can take (${ORI_HP} health, ${EN_HIT} per hit)`);
    txt(g, `without the shard: ${BASE_T}`, RX, 316, { font: '600 13px Jost, sans-serif', col: C.muted });
    T.stamp(VERD[v][0], RX + 210, 382, VERD[v][1], 1, 22);
    // wrap the explanation
    g.font = '500 16px Jost, sans-serif'; const words = VERD[v][2].split(' '); let line = '', ly = 440;
    words.forEach(w => { const tst = line ? line + ' ' + w : w; if (g.measureText(tst).width > 430) { txt(g, line, RX, ly, { font: '500 16px Jost, sans-serif' }); line = w; ly += 24; } else line = tst; });
    txt(g, line, RX, ly, { font: '500 16px Jost, sans-serif' });
    return v;
  }
  canvasDemo('reckless', (s, cv, g) => {
    const st = { d: 1.25, tk: 1.25, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.rk-tour'), dI = $(s, '.rk-d'), tI = $(s, '.rk-t');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    dI.oninput = () => { manual(); st.d = +dI.value; };
    tI.oninput = () => { manual(); st.tk = +tI.value; };
    $$(s, '.rk-p').forEach(b => b.onclick = () => { manual(); st.d = +b.dataset.d; st.tk = +b.dataset.t; });
    function info(d, tk, v) {
      const key = [d.toFixed(2), tk.toFixed(2), v].join(); if (key === st.key) return; st.key = key;
      dI.value = d; tI.value = tk; $(s, '.rk-dv').textContent = d.toFixed(2) + 'x'; $(s, '.rk-tv').textContent = tk.toFixed(2) + 'x';
      say($(s, '.rk-stats'), `<div class="y"><b>${kills(d)}</b><span>hits to kill an enemy</span></div><div><b>${takes(tk)}</b><span>hits Ori can take</span></div>`);
      say($(s, '.rk-out'), v === 'free' ? 'Here the price never costs a hit. That is how Reckless felt at a small bonus: the power showed up in every fight and the price almost never did, so it felt mandatory.'
        : v === 'style' ? 'When both damage dealt and damage taken were quadrupled, Reckless became its own play-style. Powerful and vulnerable, with a purpose.'
        : 'Move either slider. Watch the hit counts, not the multipliers: a price only counts once it changes a threshold.');
    }
    scenes.reckless = { seek(t) { st.held = true; const [d, tk] = rTour(t); info(d, tk, drawReck(g, d, tk, t)); }, dur: () => RDUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= RDUR) st.t = 0; [st.d, st.tk] = rTour(st.t); }
      info(st.d, st.tk, drawReck(g, st.d, st.tk, st.t));
    };
  });

  window.__seek = (t, which = 'board') => scenes[which].seek(t);
  window.__dur = (which = 'board') => scenes[which].dur();
})();
