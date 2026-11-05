/* Comeback tug-of-war (DGMS M8 Balancing, Part 7: slides 287-about 324).
   Two simulated players trade exchanges until one is out of HP (or forfeits), for at most 250 exchanges.
   Each exchange: win odds come from each side's power (snowball: the trailing player loses power) plus a rubber band
   bonus for whoever is behind. The loser takes damage and fills a comeback meter (10 losses). A full meter fires a
   comeback: flat HP or a share of the gap, that either hits the opponent or heals you, and (if the rule is on) only
   while you are behind. Presets reproduce each problem on the same seeded match, so the rules are the only difference.
   The sim is seeded (mulberry32), and every frame is a pure function of t, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, MAX = 250, METER = 10, SEED = 37;
  const PC = ['#2ea3dc', '#f08c28'], PDK = ['#1a6f9a', '#a85a12'], NAME = ['Player 1', 'Player 2'];
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };

  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // R: { snow 0-1, rb 0-1, size, prop, heal, gap, dmg, ff }
  function sim(R, seed) {
    const r = rng(seed), hp = [100, 100], m = [0, 0], frames = [{ hp: [100, 100], m: [0, 0], w: -1 }], ev = [];
    let end = null, winner = null, how = '';
    for (let i = 1; i <= MAX; i++) {
      const pow = [1, 1];
      for (const k of [0, 1]) { const gap = hp[1 - k] - hp[k]; if (gap > 0) pow[k] = Math.max(.15, 1 - R.snow * gap / 60); }
      let pA = pow[0] / (pow[0] + pow[1]) + R.rb * .006 * (hp[1] - hp[0]);
      pA = clamp(pA, .03, .97);
      const w = r() < pA ? 0 : 1, l = 1 - w;
      hp[l] = Math.max(0, hp[l] - R.dmg * pow[w]);
      if (!R.gap || hp[l] < hp[w]) m[l] = Math.min(METER, m[l] + 1);
      let fired = -1;
      if (hp[l] > 0) for (const k of [0, 1]) {
        if (R.size <= 0 || m[k] < METER) continue;
        const gap = hp[1 - k] - hp[k]; if (R.gap && gap <= 0) continue;
        const v = R.prop ? R.size / 100 * Math.max(0, gap) : R.size;
        const before = [hp[0], hp[1]];
        if (R.heal) hp[k] = Math.min(100, hp[k] + v); else hp[1 - k] = Math.max(0, hp[1 - k] - v);
        m[k] = 0; fired = k; ev.push({ i, k, v, before });
      }
      frames.push({ hp: [hp[0], hp[1]], m: [m[0], m[1]], w, fired });
      if (hp[0] <= 0 || hp[1] <= 0) { end = i; winner = hp[0] > 0 ? 0 : 1; how = 'KO'; break; }
      if (R.ff > 0 && Math.abs(hp[0] - hp[1]) >= R.ff) { end = i; winner = hp[0] > hp[1] ? 0 : 1; how = 'forfeit'; break; }
    }
    // decided at: the exchange after which the eventual winner was never behind or level again
    let decided = null;
    if (end !== null) {
      decided = 0;
      for (let i = frames.length - 1; i >= 0; i--) { const d = frames[i].hp[0] - frames[i].hp[1]; if ((winner ? -d : d) <= 0) { decided = i + 1; break; } }
      decided = Math.min(decided, end);
    }
    let flips = 0; for (let i = 1; i < frames.length; i++) { const a = Math.sign(frames[i - 1].hp[0] - frames[i - 1].hp[1]), b = Math.sign(frames[i].hp[0] - frames[i].hp[1]); if (a && b && a !== b) flips++; }
    return { frames, ev, end, winner, how, decided, flips };
  }

  const PRE = [
    { id: 'prop', name: 'Proportional comeback', R: { snow: .6, rb: 0, size: 43, prop: true, heal: false, gap: true, dmg: 2, ff: 0 } },
    { id: 'slip', name: 'Slippery slope', R: { snow: 1, rb: 0, size: 0, prop: false, heal: false, gap: true, dmg: 2, ff: 0 } },
    { id: 'perp', name: 'Perpetual comeback', R: { snow: .6, rb: 0, size: 35, prop: false, heal: true, gap: false, dmg: 2, ff: 0 } },
    { id: 'roll', name: 'Rollover', R: { snow: 1, rb: 0, size: 60, prop: false, heal: false, gap: true, dmg: 2, ff: 0 } },
    { id: 'lame', name: 'Lame duck', R: { snow: 1, rb: 0, size: 0, prop: false, heal: false, gap: true, dmg: 1, ff: 0 } },
  ];
  const BLURB = {
    prop: 'The comeback is a share of the gap (43%: at 22 vs 90 HP that is +29). It narrows a lead without flipping it, and only fires while you are behind.',
    slip: 'The trailing player loses power, so each lost exchange makes the next one easier to lose. StarCraft armies and Lanchester\'s laws work this way.',
    perp: 'Comebacks heal, and fire for either player, so progress keeps being undone. Like Super Puzzle Fighter II Turbo gems going back and forth, the match never reaches its victory condition.',
    roll: 'A flat comeback of 60 is bigger than the gap, so the trailing player jumps ahead and runs away. Marvel vs. Capcom 3\'s X-Factor and Smash 4 rage can do this: winning by losing.',
    lame: 'The result is settled early, but the match runs on. Like a Yu-Gi-Oh! duel with 9 of 10 zones locked, the trailing player can only wait. Try a forfeit threshold.',
  };
  const PER = 5, PLAY = 4;

  canvasDemo('cb-race', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, pre: 'prop', R: { ...PRE[0].R }, seed: SEED, key: '', ckey: '', res: null, tourBtn: $(s, '.cb-tour') };
    const el = k => $(s, '.cb-' + k);
    el('pre').innerHTML = PRE.map(p => `<button class="btn" data-p="${p.id}">${p.name}</button>`).join('');
    const free = () => { st.tour = false; st.tourBtn.classList.remove('on'); };
    const changed = () => { free(); st.pre = null; st.t = 0; };
    $$(el('pre'), '.btn').forEach(b => b.onclick = () => { free(); const p = PRE.find(p => p.id === b.dataset.p); st.pre = p.id; st.R = { ...p.R }; st.seed = SEED; st.t = 0; });
    el('snow').oninput = () => { changed(); st.R.snow = el('snow').value / 100; };
    el('rb').oninput = () => { changed(); st.R.rb = el('rb').value / 100; };
    el('size').oninput = () => { changed(); st.R.size = +el('size').value; };
    el('dmg').oninput = () => { changed(); st.R.dmg = +el('dmg').value; };
    el('ff').oninput = () => { changed(); st.R.ff = +el('ff').value; };
    el('gap').onchange = () => { changed(); st.R.gap = el('gap').checked; };
    $$(el('kind'), '.btn').forEach(b => b.onclick = () => { changed(); const k = b.dataset.k; if (k === 'flat' || k === 'prop') st.R.prop = k === 'prop'; else st.R.heal = k === 'heal'; });
    el('new').onclick = () => { free(); st.seed++; st.t = 0; };
    st.tourBtn.onclick = () => { st.tour = true; st.t = 0; st.tourBtn.classList.add('on'); };
    const cache = {};
    const run = (R, seed) => { const k = JSON.stringify(R) + seed; return cache[k] || (cache[k] = sim(R, seed)); };
    function syncControls(R, pre) {
      el('snow').value = R.snow * 100; el('rb').value = R.rb * 100; el('size').value = R.size; el('dmg').value = R.dmg; el('ff').value = R.ff; el('gap').checked = R.gap;
      el('snowv').textContent = Math.round(R.snow * 100) + '%'; el('rbv').textContent = Math.round(R.rb * 100) + '%';
      el('sizev').textContent = R.size <= 0 ? 'off' : R.prop ? R.size + '% of the gap' : R.size + ' HP';
      el('dmgv').textContent = R.dmg; el('ffv').textContent = R.ff > 0 ? R.ff + ' HP' : 'off';
      $$(el('kind'), '.btn').forEach(b => { const k = b.dataset.k; b.classList.toggle('on', k === 'prop' ? R.prop : k === 'flat' ? !R.prop : k === 'heal' ? R.heal : !R.heal); });
      $$(el('pre'), '.btn').forEach(b => b.classList.toggle('on', b.dataset.p === pre));
    }

    // chart geometry
    const cx0 = 70, cx1 = 1010, cy0 = 232, cy1 = 548, X = i => cx0 + (cx1 - cx0) * i / MAX, Y = d => (cy0 + cy1) / 2 - d / 100 * (cy1 - cy0) / 2;
    function render() {
      let R = st.R, pre = st.pre, seed = st.seed, t = st.t;
      if (st.tour) { const k = clamp(Math.floor(st.t / PER), 0, PRE.length - 1); pre = PRE[k].id; R = PRE[k].R; seed = SEED; t = st.t - k * PER; }
      const ck = JSON.stringify(R) + pre; if (ck !== st.ckey) { st.ckey = ck; syncControls(R, pre); }
      const res = run(R, seed), len = res.frames.length - 1;
      // playback: the tour plays each match in PLAY seconds; by hand it runs at 60 exchanges a second
      const idx = st.tour ? Math.round(len * ease(clamp(t / PLAY))) : Math.min(len, Math.floor(t * 60));
      const f = res.frames[idx], done = idx >= len;
      T.use(g); panel(g);
      // health bars and meters, fighting-game style
      for (const k of [0, 1]) {
        const bx = k ? 560 : 40, bw = 440, hpw = bw * f.hp[k] / 100;
        txt(g, NAME[k], k ? 1000 : 40, 22, '800 17px Montserrat', PDK[k], k ? 'right' : 'left');
        txt(g, `${Math.round(f.hp[k])} HP`, k ? 900 : 140, 22, '700 15px Jost', C.ink, k ? 'right' : 'left');
        g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(bx, 36, bw, 26, 6); g.fill();
        g.fillStyle = PC[k]; g.beginPath(); g.roundRect(k ? bx + bw - hpw : bx, 36, Math.max(0, hpw), 26, 6); g.fill();
        if (R.size > 0) for (let j = 0; j < METER; j++) {
          const px = k ? 1000 - (j + 1) * 22 : 40 + j * 22;
          g.fillStyle = j < f.m[k] ? (f.m[k] >= METER ? '#e0a92d' : PDK[k]) : '#e8dcc0'; g.beginPath(); g.roundRect(px, 70, 18, 10, 3); g.fill();
        }
        if (R.size > 0) txt(g, 'comeback meter', k ? 1000 - METER * 22 - 8 : 40 + METER * 22 + 4, 75, '600 12px Jost', C.muted, k ? 'right' : 'left');
      }
      txt(g, done ? (res.end ? (res.how === 'KO' ? `${NAME[res.winner]} wins at exchange ${res.end}` : `${NAME[1 - res.winner]} forfeits at exchange ${res.end}`) : `No winner after ${MAX} exchanges`) : `Exchange ${idx}`,
        520, 22, '800 16px Montserrat', done && res.end ? PDK[res.winner] : C.ink, 'center');
      // the rope: the knot moves toward whoever leads
      const lead = f.hp[0] - f.hp[1], ry = 128, kx = 520 - lead / 100 * 420;
      g.fillStyle = 'rgba(21,32,68,.06)'; g.fillRect(40, ry - 26, 960, 52);
      g.strokeStyle = '#b08a4a'; g.lineWidth = 7; g.beginPath(); g.moveTo(70, ry); g.lineTo(970, ry); g.stroke();
      g.strokeStyle = '#8a6a32'; g.lineWidth = 1.5; for (let x = 74; x < 970; x += 14) { g.beginPath(); g.moveTo(x, ry - 3); g.lineTo(x + 7, ry + 3); g.stroke(); }
      g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(520, ry - 24); g.lineTo(520, ry + 24); g.stroke(); g.setLineDash([]);
      g.fillStyle = PC[0]; g.beginPath(); g.arc(56, ry, 16, 0, 7); g.fill(); g.fillStyle = PC[1]; g.beginPath(); g.arc(984, ry, 16, 0, 7); g.fill();
      txt(g, 'P1', 56, ry, '800 13px Montserrat', '#fff', 'center'); txt(g, 'P2', 984, ry, '800 13px Montserrat', '#fff', 'center');
      g.fillStyle = lead > 0 ? PC[0] : lead < 0 ? PC[1] : C.navy; g.beginPath(); g.roundRect(kx - 11, ry - 16, 22, 32, 5); g.fill();
      txt(g, lead === 0 ? 'even' : `${lead > 0 ? 'P1' : 'P2'} leads by ${Math.round(Math.abs(lead))}`, clamp(kx, 110, 930), ry + 36, '700 14px Jost', C.ink, 'center');
      // trace
      txt(g, 'Lead over time', cx0 - 50, cy0 - 26, '800 16px Montserrat');
      txt(g, 'P1 ahead ↑   P2 ahead ↓', cx0 + 110, cy0 - 26, '600 13px Jost', C.muted);
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 1;
      [-100, -50, 0, 50, 100].forEach(v => { g.beginPath(); g.moveTo(cx0, Y(v)); g.lineTo(cx1, Y(v)); g.stroke(); txt(g, String(Math.abs(v)), cx0 - 8, Y(v), '500 12px Jost', C.muted, 'right'); });
      for (let i = 0; i <= MAX; i += 50) txt(g, String(i), X(i), cy1 + 14, '500 12px Jost', C.muted, 'center');
      txt(g, 'exchanges', cx1, cy1 + 30, '600 12px Jost', C.muted, 'right');
      g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx0, Y(0)); g.lineTo(cx1, Y(0)); g.stroke();
      // lame duck stretch: decided, then still playing
      if (done && res.end && res.end - res.decided >= 25) {
        g.fillStyle = 'rgba(224,169,45,.16)'; g.fillRect(X(res.decided), cy0, X(res.end) - X(res.decided), cy1 - cy0);
        txt(g, `${res.end - res.decided} exchanges after it was decided`, (X(res.decided) + X(res.end)) / 2, cy0 + 14, '700 13px Jost', C.goldInk, 'center');
      }
      // the line, coloured by who leads
      for (let i = 1; i <= idx; i++) {
        const a = res.frames[i - 1], b = res.frames[i], da = a.hp[0] - a.hp[1], db = b.hp[0] - b.hp[1];
        g.strokeStyle = (da + db) >= 0 ? PDK[0] : PDK[1]; g.lineWidth = 3; g.beginPath(); g.moveTo(X(i - 1), Y(da)); g.lineTo(X(i), Y(db)); g.stroke();
      }
      res.ev.forEach(e => {
        if (e.i > idx) return; const d = res.frames[e.i].hp[0] - res.frames[e.i].hp[1], x = X(e.i), y = Y(d);
        g.fillStyle = '#e0a92d'; g.strokeStyle = PDK[e.k]; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 7, y); g.lineTo(x, y + 8); g.lineTo(x - 7, y); g.closePath(); g.fill(); g.stroke();
      });
      if (done && res.end) {
        const xd = X(res.decided), xe = X(res.end);
        g.strokeStyle = C.goldInk; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(xd, cy0); g.lineTo(xd, cy1); g.stroke(); g.setLineDash([]);
        txt(g, `decided at ${res.decided}`, xd + 6, cy1 - 12, '700 13px Jost', C.goldInk, 'left');
        g.fillStyle = PDK[res.winner]; g.beginPath(); g.arc(xe, Y(f.hp[0] - f.hp[1]), 7, 0, 7); g.fill();
        txt(g, res.how === 'KO' ? 'KO' : 'forfeit', xe + 10, Y(f.hp[0] - f.hp[1]), '800 13px Montserrat', PDK[res.winner], 'left');
      } else if (done) {
        txt(g, `still going at ${MAX}`, cx1, cy0 + 14, '700 13px Jost', C.redDk, 'right');
      }
      // legend for comeback markers
      g.fillStyle = '#e0a92d'; g.beginPath(); g.moveTo(cx1 - 140, cy0 - 26 - 7); g.lineTo(cx1 - 134, cy0 - 26); g.lineTo(cx1 - 140, cy0 - 26 + 7); g.lineTo(cx1 - 146, cy0 - 26); g.fill();
      txt(g, `comeback (${res.ev.length})`, cx1 - 128, cy0 - 26, '600 13px Jost', C.muted);
      // caption
      const key = [pre, ck, seed, done].join('|'); if (key === st.key) return; st.key = key;
      let tail = '';
      if (done) tail = res.end ? ` Result: ${res.how === 'KO' ? NAME[res.winner] + ' wins' : NAME[1 - res.winner] + ' forfeits'} at exchange ${res.end}, decided at ${res.decided}; ${res.ev.length} comebacks, ${res.flips} lead changes.` : ` No winner after ${MAX} exchanges; ${res.ev.length} comebacks, ${res.flips} lead changes.`;
      say(el('out'), (pre ? `<b>${PRE.find(p => p.id === pre).name}.</b> ${BLURB[pre]}` : '<b>Your rules,</b> same match seed.') + tail);
    }
    window.__seek = (t, w) => { st.held = st.tour = true; st.t = t; render(); };
    window.__dur = () => PER * PRE.length;
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > PER * PRE.length) st.t = 0; render(); };
  });
})();
