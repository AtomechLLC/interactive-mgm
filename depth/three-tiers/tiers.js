/* Three tiers of depth with real weapon counts (MGM C4 M1, deck slides 56-68 and 122-125). Dark Souls III and
   Bloodborne side by side as nested circles drawn to scale (area = count). Every tile is a real weapon from data.js, shown
   with its in-game icon (icons/, one sprite sheet per game in data.js order; sources in icons/sources.json).
   Weapons that share a moveset collapse into one tile, which is the step from possibility space to differentiated depth
   (a grey dot stays where each weapon started);
   the relevant tier is the deck's estimate (no public usage data exists for either game) and has a slider.
   Modes: counted from the games, or the deck's own slide numbers for comparison. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, GA = Math.PI * (3 - Math.sqrt(5));
  const COL = { red: ['rgba(229,50,45,.13)', '#c9302a'], orange: ['rgba(240,140,40,.22)', '#c26a1a'], yellow: ['rgba(255,205,60,.45)', '#9a7a06'], grey: ['rgba(93,97,140,.08)', '#8b8fa8'] };
  const CLASS_COL = ['#2ea3dc', '#8a4fd6', '#2fae63', '#e0a92d', '#d6457a', '#1f5fbf', '#7a8a20', '#c26a1a', '#4a9a9a', '#9a4a9a', '#5562eb', '#b0552a', '#3d7a3d', '#a83e6a', '#3a8fb7', '#7c5cc4', '#c48a1c', '#5a6a8a', '#8a2a2a', '#2a6a5a', '#6a4a2a'];

  // the games' own inventory icons, one sprite sheet per game, cells in data.js order
  const SPRITE = { ds3: { src: 'icons/ds3.png', cell: 64, cols: 16 }, bb: { src: 'icons/bb.jpg', cell: 128, cols: 6 } };
  Object.values(SPRITE).forEach(sp => { sp.img = new Image(); sp.img.src = sp.src; });
  // one weapon tile: its icon in a disc ringed in its class colour (Bloodborne's icons carry their own dark backdrop, brightened)
  function tile(g, game, i, x, y, r, ring) {
    const sp = SPRITE[game], ok = sp.img.complete && sp.img.naturalWidth;
    g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = game === 'ds3' ? '#f6efdf' : '#23232c'; g.fill();
    if (ok) {
      g.clip(); const k = game === 'ds3' ? 1.75 : 2.05;
      if (game === 'bb') g.filter = 'brightness(1.7) contrast(1.15)';
      g.drawImage(sp.img, (i % sp.cols) * sp.cell, Math.floor(i / sp.cols) * sp.cell, sp.cell, sp.cell, x - r * k / 2, y - r * k / 2, r * k, r * k);
    }
    g.restore(); g.strokeStyle = ring; g.lineWidth = Math.max(1.2, r * .14); g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }
  const GAME_ICON = { ds3: 'visored-helm', bb: 'wolf-head' };

  // n evenly spread points in a circle, skipping a smaller circle keepOut = [x, y, r] (plus pad) if given
  function sunflower(n, cx, cy, R, keepOut, pad) {
    const make = M => { const pts = []; for (let k = 0; k < M; k++) { const r = R * .92 * Math.sqrt((k + .5) / M), a = k * GA; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); if (!keepOut || Math.hypot(x - keepOut[0], y - keepOut[1]) > keepOut[2] + pad) pts.push([x, y]); } return pts; };
    if (!keepOut) return make(n);
    for (let M = n; M < n * 40; M = Math.ceil(M * 1.05)) { const pts = make(M); if (pts.length >= n) return pts.slice(0, n); }
    return sunflower(n, cx, cy, R, null, 0);   // no room outside keepOut: use the whole circle
  }
  // circles for one game: tiers [{n, label, col}], scaled so the outer one has radius R, bottoms aligned at base
  function circles(tiers, cx, base, R) {
    const n0 = tiers[0].n; return tiers.map(t => { const r = R * Math.sqrt(t.n / n0); return { ...t, r, cx, cy: base - r }; });
  }
  function build(game, cx, base, R, rel) {
    const D = WEAPONS[game], weapons = D.classes.flatMap(([c, list], ci) => list.map(n => ({ name: n, cls: c, ci }))).map((w, i) => ({ ...w, i }));
    const tiers = [
      { n: weapons.length, label: 'weapons in the game', sub: 'possibility space', col: 'red' },
      { n: D.classes.length, label: game === 'ds3' ? 'distinct movesets (one per weapon class)' : 'distinct movesets (every trick weapon)', sub: 'differentiated depth', col: 'orange' },
      { n: rel, label: 'relevant (the deck’s estimate)', sub: 'relevant depth', col: 'yellow' },
    ];
    const cs = circles(tiers, cx, base, R);
    const movePts = sunflower(D.classes.length, cs[1].cx, cs[1].cy, cs[1].r, null, 0);
    const outPts = sunflower(weapons.length, cs[0].cx, cs[0].cy, cs[0].r, [cs[1].cx, cs[1].cy, cs[1].r], 6);
    weapons.forEach((w, i) => { w.p0 = outPts[i]; w.p1 = movePts[w.ci]; });
    const first = D.classes.map((c, ci) => weapons.findIndex(w => w.ci === ci));   // each moveset is shown by its class's first weapon
    return { D, weapons, cs, movePts, first };
  }
  function buildDeck(game, cx, base, R) {
    const d = WEAPONS[game].deck;
    return { cs: circles([
      { n: d.weapons, label: 'weapons', sub: '', col: 'grey' },
      { n: d.possibility, label: 'possibility space', sub: '', col: 'red' },
      { n: d.differentiated, label: 'differentiated', sub: '', col: 'orange' },
      { n: d.relevant, label: 'relevant', sub: '', col: 'yellow' },
    ], cx, base, R) };
  }
  function disc(g, c, a = 1) {
    g.save(); g.globalAlpha = a; g.fillStyle = COL[c.col][0]; g.strokeStyle = COL[c.col][1]; g.lineWidth = 2.5;
    g.beginPath(); g.arc(c.cx, c.cy, Math.max(c.r, 1), 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
  }
  function legend(g, x, y, cs, a) {
    g.save(); g.globalAlpha = a; g.textBaseline = 'middle';
    cs.forEach((c, i) => {
      const yy = y + i * 26; g.fillStyle = COL[c.col][0]; g.strokeStyle = COL[c.col][1]; g.lineWidth = 2; g.beginPath(); g.arc(x + 8, yy, 8, 0, 7); g.fill(); g.stroke();
      g.font = '800 19px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'right'; g.fillText(c.n, x + 66, yy);
      g.font = '600 15px Jost, sans-serif'; g.textAlign = 'left'; g.fillText(c.label, x + 76, yy);
    });
    g.restore();
  }

  const DUR = 18, PANEL = [[270, 'ds3'], [790, 'bb']];
  let api;
  canvasDemo('tiers', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 'counted', scale: 'fit', rel: { ds3: 5, bb: 4 }, hover: null, key: '' };
    const tourBtn = $(s, '.tr-tour');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.tr-mode .btn').forEach(b => b.onclick = () => { free(); st.mode = b.dataset.m; });
    $$(s, '.tr-scale .btn').forEach(b => b.onclick = () => { free(); st.scale = b.dataset.s; });
    $$(s, '.tr-rel').forEach(i => i.oninput = () => { free(); st.rel[i.dataset.g] = +i.value; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); st.mx = (e.clientX - r.left) * W / r.width; st.my = (e.clientY - r.top) * H / r.height; });
    cv.addEventListener('mouseleave', () => { st.mx = null; });
    // table of classes in the side panel
    $(s, '.tr-cls').innerHTML = WEAPONS.ds3.classes.map(([c, l]) => `<tr><td>${c}</td><td>${l.length}</td></tr>`).join('') + `<tr><td><b>Dark Souls III total</b></td><td>206</td></tr><tr><td>Bloodborne trick weapons (15 + 11 DLC)</td><td>26</td></tr>`;
    function render() {
      let mode = st.mode, scale = st.scale, t = 99;
      if (st.tour) { t = st.t; mode = t < 13.5 ? 'counted' : 'deck'; scale = t < 10 || t >= 13.5 ? 'fit' : 'same'; }
      $$(s, '.tr-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      $$(s, '.tr-scale .btn').forEach(b => b.classList.toggle('on', b.dataset.s === scale));
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 2; g.beginPath(); g.moveTo(530, 20); g.lineTo(530, H - 20); g.stroke();
      const base = 420, RMAX = 180, maxN = mode === 'counted' ? 206 : 120;
      let hover = null;
      PANEL.forEach(([cx, game]) => {
        const D = WEAPONS[game], n0 = mode === 'counted' ? D.classes.flatMap(c => c[1]).length : D.deck.weapons;
        const R = scale === 'fit' ? RMAX : RMAX * Math.sqrt(n0 / maxN);
        g.font = '800 24px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(D.name, cx, 30);
        GI.draw(g, GAME_ICON[game], cx - g.measureText(D.name).width / 2 - 22, 30, 30, C.ink);
        g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted;
        g.fillText(mode === 'counted' ? (game === 'ds3' ? 'all 21 weapon classes, base game + both DLCs' : 'all trick weapons, base game + The Old Hunters') : `the deck’s numbers, slide ${game === 'ds3' ? 123 : 125}`, cx, 54);
        if (mode === 'deck') {
          const m = buildDeck(game, cx, base, R);
          m.cs.forEach(c => disc(g, c));
          legend(g, cx - 200, 460, m.cs, 1);
          return;
        }
        const m = build(game, cx, base, R, st.rel[game]);
        const kIn = st.tour ? clamp(t / 2.5) : 1, kMerge = st.tour ? ease(clamp((t - 3.5) / 2.5)) : 1, kRel = st.tour ? clamp((t - 7) / 1) : 1;
        disc(g, m.cs[0]); disc(g, m.cs[1], st.tour ? clamp((t - 3) / .6) : 1); disc(g, m.cs[2], kRel);
        // tile size from the room each weapon gets in the outer ring (or the whole circle, when nothing collapses)
        const ring = Math.max(m.cs[0].r ** 2 - (m.cs[1].r < m.cs[0].r - 1 ? m.cs[1].r ** 2 : 0), m.cs[0].r ** 2 * .3);
        const tileR = clamp(Math.sqrt(Math.PI * ring / m.weapons.length) * .42, 4, 30), dotR = Math.max(2.5, tileR * .35);
        const moveR = clamp(m.cs[1].r * Math.sqrt(Math.PI / m.movePts.length) * .46, tileR, 30);
        const shown = Math.ceil(m.weapons.length * kIn), moved = m.weapons.some(w => Math.hypot(w.p0[0] - w.p1[0], w.p0[1] - w.p1[1]) > 1);
        // where each weapon started stays behind as a grey dot once it moves to its moveset
        if (kMerge > 0) { g.fillStyle = `rgba(139,143,168,${.55 * clamp(kMerge * 3)})`; m.weapons.slice(0, shown).forEach(w => { if (Math.hypot(w.p0[0] - w.p1[0], w.p0[1] - w.p1[1]) > 1) { g.beginPath(); g.arc(w.p0[0], w.p0[1], dotR, 0, 7); g.fill(); } }); }
        const kSettle = moved ? clamp((kMerge - .85) / .15) : 0;   // stacked tiles give way to one moveset tile
        m.weapons.slice(0, shown).forEach(w => {
          const x = lerp(w.p0[0], w.p1[0], kMerge), y = lerp(w.p0[1], w.p1[1], kMerge);
          if (kSettle < 1) { g.save(); g.globalAlpha = 1 - kSettle; tile(g, game, w.i, x, y, tileR, CLASS_COL[w.ci % CLASS_COL.length]); g.restore(); }
          if (st.mx != null && kSettle < .5 && Math.hypot(st.mx - x, st.my - y) < tileR) hover = { x, y, txt: w.name + (game === 'ds3' ? ' · ' + w.cls : '') };
        });
        if (kSettle > 0) {
          g.save(); g.globalAlpha = kSettle;
          m.movePts.forEach((p, ci) => {
            tile(g, game, m.first[ci], p[0], p[1], lerp(tileR, moveR, kSettle), CLASS_COL[ci % CLASS_COL.length]);
            const [c, list] = m.D.classes[ci];
            if (st.mx != null && Math.hypot(st.mx - p[0], st.my - p[1]) < moveR) hover = { x: p[0], y: p[1], txt: `${c}: ${list.length} weapon${list.length > 1 ? 's' : ''}, one moveset` };
          });
          g.restore();
        }
        legend(g, cx - 200, 460, m.cs.map((c, i) => i < 2 || kRel > 0 ? c : { ...c }), 1);
        const pct = Math.round(100 * m.cs[1].n / m.cs[0].n);
        g.font = '700 15px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center';
        if (kMerge > .5) g.fillText(`${m.cs[0].n} weapons → ${m.cs[1].n} movesets: ${pct}% of the arsenal is distinct`, cx, 548);
      });
      if (hover) {
        T.label(hover.txt, clamp(hover.x, 120, W - 120), hover.y - 20, 'center', C.ink, 14);
      }
      $$(s, '.tr-relv').forEach(b => b.textContent = st.rel[b.dataset.g]);
      const key = [mode, scale, st.rel.ds3, st.rel.bb].join(); if (key === st.key) return; st.key = key;
      say($(s, '.tr-out'), mode === 'deck'
        ? 'The deck’s napkin math counts weapon types, not weapons: 120 → 18 → 10 → 5 for Dark Souls III and 26 → 18 → 8 → 4 for Bloodborne.'
        : scale === 'same'
          ? 'Drawn to the same scale: Dark Souls III has eight times as many weapons, but only 21 movesets to Bloodborne’s 26.'
          : 'Each tile is a real weapon, with its icon from the game. Weapons that share a moveset collapse into one tile: Dark Souls III’s 206 weapons become 21 movesets; none of Bloodborne’s 26 trick weapons collapse.');
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
