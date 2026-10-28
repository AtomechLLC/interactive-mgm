/* Three tiers of depth with real weapon counts (MGM C4 M1, deck slides 56-68 and 122-125). Dark Souls III and
   Bloodborne side by side as nested circles drawn to scale (area = count). Every dot is a real weapon from data.js.
   Weapons that share a moveset collapse into one dot, which is the step from possibility space to differentiated depth
   (a grey dot stays where each weapon started);
   the relevant tier is the deck's estimate (no public usage data exists for either game) and has a slider.
   Modes: counted from the games, or the deck's own slide numbers for comparison. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, GA = Math.PI * (3 - Math.sqrt(5));
  const COL = { red: ['rgba(229,50,45,.13)', '#c9302a'], orange: ['rgba(240,140,40,.22)', '#c26a1a'], yellow: ['rgba(255,205,60,.45)', '#9a7a06'], grey: ['rgba(93,97,140,.08)', '#8b8fa8'] };
  const CLASS_COL = ['#2ea3dc', '#8a4fd6', '#2fae63', '#e0a92d', '#d6457a', '#1f5fbf', '#7a8a20', '#c26a1a', '#4a9a9a', '#9a4a9a', '#5562eb', '#b0552a', '#3d7a3d', '#a83e6a', '#3a8fb7', '#7c5cc4', '#c48a1c', '#5a6a8a', '#8a2a2a', '#2a6a5a', '#6a4a2a'];

  // game-icons.net icon for each moveset: per weapon class in Dark Souls III, per trick weapon in Bloodborne
  const ICON = {
    'Daggers': 'plain-dagger', 'Straight Swords': 'broadsword', 'Greatswords': 'two-handed-sword', 'Ultra Greatswords': 'zeus-sword',
    'Curved Swords': 'curvy-knife', 'Curved Greatswords': 'saw-claw', 'Katanas': 'katana', 'Thrusting Swords': 'stiletto',
    'Axes': 'wood-axe', 'Greataxes': 'battle-axe', 'Hammers': 'mace-head', 'Great Hammers': 'flat-hammer', 'Fists & Claws': 'fist',
    'Spears & Pikes': 'spear-feather', 'Halberds': 'halberd', 'Reapers': 'reaper-scythe', 'Whips': 'whip', 'Bows': 'bow-arrow',
    'Greatbows': 'high-shot', 'Crossbows': 'pocket-bow', 'Staves': 'wizard-staff',
    'Saw Cleaver': 'hand-saw', 'Saw Spear': 'spear-hook', 'Hunter Axe': 'battle-axe', 'Threaded Cane': 'whip', 'Kirkhammer': 'flat-hammer',
    'Ludwig’s Holy Blade': 'two-handed-sword', 'Blade of Mercy': 'plain-dagger', 'Burial Blade': 'scythe', 'Chikage': 'katana',
    'Reiterpallasch': 'stiletto', 'Rifle Spear': 'spear-feather', 'Stake Driver': 'claw-hammer', 'Tonitrus': 'mace-head',
    'Logarius’ Wheel': 'spiked-mace', 'Beast Claw': 'fist', 'Amygdalan Arm': 'broken-bone', 'Beasthunter Saif': 'curvy-knife',
    'Beast Cutter': 'whip', 'Bloodletter': 'dripping-blade', 'Boom Hammer': 'claw-hammer', 'Church Pick': 'reaper-scythe',
    'Holy Moonlight Sword': 'zeus-sword', 'Kos Parasite': 'daemon-skull', 'Rakuyo': 'crossed-swords', 'Simon’s Bowblade': 'bow-arrow',
    'Whirligig Saw': 'saw-claw',
  };
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
    const D = WEAPONS[game], weapons = D.classes.flatMap(([c, list], ci) => list.map(n => ({ name: n, cls: c, ci })));
    const tiers = [
      { n: weapons.length, label: 'weapons in the game', sub: 'possibility space', col: 'red' },
      { n: D.classes.length, label: game === 'ds3' ? 'distinct movesets (one per weapon class)' : 'distinct movesets (every trick weapon)', sub: 'differentiated depth', col: 'orange' },
      { n: rel, label: 'relevant (the deck’s estimate)', sub: 'relevant depth', col: 'yellow' },
    ];
    const cs = circles(tiers, cx, base, R);
    const movePts = sunflower(D.classes.length, cs[1].cx, cs[1].cy, cs[1].r, null, 0);
    const outPts = sunflower(weapons.length, cs[0].cx, cs[0].cy, cs[0].r, [cs[1].cx, cs[1].cy, cs[1].r], 6);
    weapons.forEach((w, i) => { w.p0 = outPts[i]; w.p1 = movePts[w.ci]; });
    return { D, weapons, cs, movePts };
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
        const dotR = Math.max(2.2, Math.min(6, m.cs[0].r / Math.sqrt(m.weapons.length) * .55));
        const shown = Math.ceil(m.weapons.length * kIn);
        // where each weapon started stays behind as a grey dot once it moves to its moveset
        if (kMerge > 0) { g.fillStyle = `rgba(139,143,168,${.55 * clamp(kMerge * 3)})`; m.weapons.slice(0, shown).forEach(w => { if (Math.hypot(w.p0[0] - w.p1[0], w.p0[1] - w.p1[1]) > 1) { g.beginPath(); g.arc(w.p0[0], w.p0[1], dotR, 0, 7); g.fill(); } }); }
        m.weapons.slice(0, shown).forEach(w => {
          const x = lerp(w.p0[0], w.p1[0], kMerge), y = lerp(w.p0[1], w.p1[1], kMerge);
          g.fillStyle = CLASS_COL[w.ci % CLASS_COL.length]; g.beginPath(); g.arc(x, y, dotR, 0, 7); g.fill();
          if (st.mx != null && Math.hypot(st.mx - x, st.my - y) < dotR + 3) hover = { x, y, w, game };
        });
        // the merged dots read as one dot per moveset
        // the merged dots read as one moveset each, shown with its weapon icon
        const kIcon = clamp((kMerge - .85) / .15);
        if (kIcon > 0) {
          const iconR = Math.min(24, Math.max(dotR + 3, m.cs[1].r * Math.sqrt(Math.PI / m.movePts.length) * .42));
          g.save(); g.globalAlpha = kIcon;
          m.D.classes.forEach(([c], i) => { const p = m.movePts[i]; g.fillStyle = CLASS_COL[i % CLASS_COL.length]; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(p[0], p[1], iconR, 0, 7); g.fill(); g.stroke(); GI.draw(g, ICON[c], p[0], p[1], iconR * 1.45, '#fff'); });
          g.restore();
        }
        legend(g, cx - 200, 460, m.cs.map((c, i) => i < 2 || kRel > 0 ? c : { ...c }), 1);
        const pct = Math.round(100 * m.cs[1].n / m.cs[0].n);
        g.font = '700 15px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center';
        if (kMerge > .5) g.fillText(`${m.cs[0].n} weapons → ${m.cs[1].n} movesets: ${pct}% of the arsenal is distinct`, cx, 548);
      });
      if (hover) {
        const txt = `${hover.w.name}${hover.game === 'ds3' ? ' · ' + hover.w.cls : ''}`;
        T.label(txt, clamp(hover.x, 120, W - 120), hover.y - 20, 'center', C.ink, 14);
      }
      $$(s, '.tr-relv').forEach(b => b.textContent = st.rel[b.dataset.g]);
      const key = [mode, scale, st.rel.ds3, st.rel.bb].join(); if (key === st.key) return; st.key = key;
      say($(s, '.tr-out'), mode === 'deck'
        ? 'The deck’s napkin math counts weapon types, not weapons: 120 → 18 → 10 → 5 for Dark Souls III and 26 → 18 → 8 → 4 for Bloodborne.'
        : scale === 'same'
          ? 'Drawn to the same scale: Dark Souls III has eight times as many weapons, but only 21 movesets to Bloodborne’s 26.'
          : 'Each dot is a real weapon. Weapons that share a moveset collapse into one dot: Dark Souls III’s 206 weapons become 21 movesets; none of Bloodborne’s 26 trick weapons collapse.');
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
