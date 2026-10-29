/* Combining frameworks, continued (MGM C4 M7, deck slides 241-257).
   'circle-reskin' (241): one Counter Circle, many skins. The slide's V1 (Pressuring, Blocking, Priming), V2 (Zoning, Evading,
   Healing) and V3 (Punishing, Parrying, Buffing), the fighting game it came from, and an RTS reading; then two familiar
   triangles with the same shape that are not Offense / Defense / Prediction, for contrast.
   'two-make-nine' (242-244): the Counter Circle times the Teamplay Timing framework (Proactive before, Coactive during,
   Reactive after the event) gives the nine fundamentals.
   'duel-timeline' (244, 246-254): one enemy attack at a time, and a player action before, during or after it; the cell it
   belongs to lights. Examples are the notes' own.
   'elemental-diamond' (257): four elements on two axes. Drag the point; or rename everything and save your own. */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease, lerp, arrow } = CK;
  const T = TD, C = TD.C, TAU = Math.PI * 2;
  const ph = (t, a, b) => clamp((t - a) / (b - a));

  // ---------- counter circle reskinner ----------
  const POS = [[400, 126], [560, 400], [240, 400]];       // top, right, left
  const COL = ['#d8463a', '#8a4fd6', '#2f7fd6'];
  // [skin, source, [top, right, left], icons, kind]
  const SKINS = [
    ['Original', 'Slide 240', ['Offense', 'Prediction', 'Defense'], ['crossed-swords', 'brain', 'checked-shield'], 'circle'],
    ['V1', 'Slide 241', ['Pressuring', 'Priming', 'Blocking'], ['sword-brandish', 'bolt-spell-cast', 'shield-impact'], 'circle'],
    ['V2', 'Slide 241', ['Zoning', 'Healing', 'Evading'], ['spear-hook', 'healing', 'dodging'], 'circle'],
    ['V3', 'Slide 241', ['Punishing', 'Buffing', 'Parrying'], ['punch-blast', 'fire-shield', 'sword-clash'], 'circle'],
    ['Fighting game', 'Slides 238-239', ['Attack', 'Throw', 'Block'], ['punch', 'grab', 'checked-shield'], 'circle'],
    ['Real-time strategy', 'A reading', ['Rush', 'Expand', 'Turtle'], ['sprint', 'two-coins', 'castle'], 'circle'],
    ['Pokémon starters', 'Same shape, a type chart', ['Fire', 'Grass', 'Water'], ['pk-charmander.png', 'pk-bulbasaur.png', 'pk-squirtle.png'], 'other'],
    ['Fire Emblem', 'Same shape, a weapon triangle', ['Sword', 'Axe', 'Lance'], ['broadsword', 'battle-axe', 'spear-hook'], 'other'],
  ];
  const ROLE = ['Offense', 'Prediction', 'Defense'];
  scene('circle-reskin', {
    dur: SKINS.length * 2.6,
    state: () => ({ i: 1, at: 0 }),
    init(s, st, api) {
      const box = $(s, '.cr-skins');
      box.innerHTML = SKINS.map((k, i) => `<button class="btn" data-i="${i}">${k[0]}</button>`).join('');
      const sync = () => $$(box, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === st.i));
      $$(box, '.btn').forEach(b => b.onclick = () => { api.manual(); st.prev = st.i; st.i = +b.dataset.i; st.at = st.t; sync(); });
      sync();
    },
    draw(g, t, st, tour) {
      const i = tour ? Math.floor(t / 2.6) % SKINS.length : st.i, at = tour ? i * 2.6 : st.at, k = ease(ph(t - at, 0, .5));
      const [name, src, labels, icons, kind] = SKINS[i];
      // the arrows never move: top beats right, right beats left, left beats top
      [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => arrow(g, POS[a], POS[b], C.navy, 5, { pad0: 86, pad1: 86, bend: -46 }));
      POS.forEach(([x, y], j) => {
        card(g, x, y, 200, 120, { edge: COL[j], lw: 4 });
        g.save(); g.globalAlpha = k;
        if (icons[j].endsWith('.png')) pic(g, icons[j], x, y - 18, 64); else GI.draw(g, icons[j], x, y - 18, 46, COL[j]);
        text(g, labels[j], x, y + 34, { size: 22, w: 800, display: true, col: COL[j] });
        g.restore();
      });
      // the panel
      panel(g, 700, 14, 326, 558, { title: 'Skin' });
      text(g, name, 863, 80, { size: 24, w: 800, display: true, col: C.navy, a: k });
      text(g, src, 863, 110, { size: 13.5, col: C.muted, a: k });
      ROLE.forEach((r, j) => {
        const y = 170 + j * 76;
        card(g, 863, y, 290, 62, { edge: COL[j], shadow: false, lw: 2 });
        text(g, labels[j], 730, y - 10, { align: 'left', size: 18, w: 800, col: COL[j], a: k });
        text(g, kind === 'circle' ? `is the ${r.toLowerCase()} node` : `beats ${labels[(j + 1) % 3]}`, 730, y + 14, { align: 'left', size: 13, col: C.ink, a: k });
      });
      wrap(g, kind === 'circle' ? 'Arrows stay put; only the labels change. Each version is the same Counter Circle with new packaging.' : 'Same triangle shape, but these are matchups, not Offense, Defense and Prediction. Shape alone does not make a Counter Circle.', 724, 420, 280, { size: 14.5, w: 700, lh: 19, col: kind === 'circle' ? C.navy : C.goldInk });
      text(g, '→ beats', 400, 556, { size: 14, w: 700, col: C.muted });
    },
    side(t, st, tour) { const i = tour ? Math.floor(t / 2.6) % SKINS.length : st.i, s = SKINS[i]; return { out: `<b>${s[0]}</b>: ${s[2][0]} beats ${s[2][1]}, ${s[2][1]} beats ${s[2][2]}, ${s[2][2]} beats ${s[2][0]}.${s[4] === 'other' ? ' A matchup triangle, not the Counter Circle.' : ''}` }; },
  });

  // ---------- two frameworks make nine ----------
  const ROWS = [['Offensive', '#d8463a'], ['Defensive', '#2f7fd6'], ['Predictive', '#8a4fd6']];
  const TIME = [['Before', 'Proactive'], ['During', 'Coactive'], ['Post', 'Reactive']];
  const NAMES = [['Initiate', 'Zone', 'Punish'], ['Mitigate', 'Reflex', 'React'], ['Setup', 'Counterplay', 'Response']];
  scene('two-make-nine', {
    dur: 15,
    draw(g, t) {
      const m = ease(ph(t, 2.4, 4.2));     // the two frameworks move into place
      // the circle on the left becomes the row labels
      const cpos = [[220, 170], [350, 370], [90, 370]], rpos = j => [150, 206 + j * 118];
      if (m < 1) { g.save(); g.globalAlpha = 1 - m; [[0, 2], [2, 1], [1, 0]].forEach(([a, b]) => arrow(g, cpos[a], cpos[b], C.navy, 4, { pad0: 60, pad1: 60, bend: -30 })); g.restore(); }
      text(g, 'Counter Circle', 200, 70, { size: 18, w: 800, display: true, col: C.navy, a: 1 - m });
      ROWS.forEach(([n, col], j) => { const [x0, y0] = cpos[j], [x1, y1] = rpos(j), x = lerp(x0, x1, m), y = lerp(y0, y1, m); chip(g, n, x, y, { fill: col, edge: col, col: '#fff', size: 17, width: 136 }); });
      // the timing column on the right becomes the column labels
      text(g, 'Teamplay Timing', 840, 70, { size: 18, w: 800, display: true, col: C.navy, a: 1 - m });
      TIME.forEach(([b, p], j) => { const x = lerp(840, 380 + j * 230, m), y = lerp(170 + j * 120, 104, m); card(g, x, y, 190, 56, { edge: C.gold, lw: 3, shadow: false, r: 10 }); text(g, b, x, y - 9, { size: 18, w: 800, display: true }); text(g, p, x, y + 14, { size: 13, col: C.muted }); });
      if (t > 1 && t < 2.4) text(g, '×', 520, 280, { size: 60, w: 800, col: C.muted, a: ph(t, 1, 1.4) });
      // the nine cells
      NAMES.forEach((row, r) => row.forEach((n, c) => {
        const k = ease(ph(t, 4.4 + (r * 3 + c) * .35, 4.8 + (r * 3 + c) * .35)), x = 380 + c * 230, y = 206 + r * 118;
        if (k <= 0) return;
        card(g, x, y, 214, 104, { edge: ROWS[r][1], lw: 3, a: k, fill: '#fffaf0' });
        text(g, n, x, y, { size: 24, w: 800, display: true, col: ROWS[r][1], a: k });
      }));
      if (t > 8.2) text(g, 'Every action combat mechanic falls into at least one of nine.', 520, 556, { size: 18, w: 800, col: C.navy, a: ph(t, 8.2, 8.7) });
    },
    side(t) { return { out: t < 4.4 ? 'Two frameworks: what an action does (offense, defense, prediction) and when it happens (before, during, after).' : 'Three kinds × three timings = nine fundamental categories (slide 244).' }; },
  });

  // ---------- duel timeline ----------
  // [cell row, col, action, the notes' line, player behaviour]
  const BEATS = [
    [0, 0, 'Gap close', 'Initiate: rush in before they act', 'dash'],
    [2, 0, 'Feint', 'Setup: fake an attack to read their defense', 'feint'],
    [1, 1, 'Perfect block', 'Reflex: block on the hit frames', 'block'],
    [1, 2, 'Rally hit-back', 'React: hit back to win back lost life', 'rally'],
    [0, 2, 'Slow launcher', 'Punish: they are in recovery, launch them', 'punish'],
    [2, 2, 'Weapon swap', 'Response: change your state after reading them', 'swap'],
  ];
  const BL = 3.2, WIND = [.6, 1.4], HIT = [1.4, 1.6], REC = [1.6, 2.4];
  scene('duel-timeline', {
    dur: BEATS.length * BL,
    draw(g, t) {
      const i = Math.floor(t / BL) % BEATS.length, a = t - i * BL, [r, c, n, line, kind] = BEATS[i];
      // arena: player left, enemy right
      panel(g, 14, 14, 640, 400, { title: 'One enemy attack' });
      g.save(); g.beginPath(); g.roundRect(26, 44, 616, 360, 10); g.clip(); T.use(g); T.floor(26, 44, 616, 360);
      const ex = 440, ey = 220, wind = ph(a, WIND[0], WIND[1]), hitOn = a >= HIT[0] && a < HIT[1];
      let px = 230, py = 220, shield = false;
      if (kind === 'dash') px = lerp(110, 330, ease(ph(a, .1, .5)));
      if (kind === 'feint') { px = 300 + Math.sin(ph(a, .1, .5) * Math.PI) * 30; px = a > 1.3 ? lerp(300, 200, ph(a, 1.3, 1.6)) : px; }
      if (kind === 'block') { px = 330; shield = a > 1.3 && a < 1.8; }
      if (kind === 'rally' || kind === 'punish' || kind === 'swap') px = 330;
      if (kind === 'feint' || kind === 'dash') { if (a > WIND[0]) T.cone(ex, ey, Math.PI, .6, 140, .3 + .5 * wind); }
      else if (a > WIND[0] && a < HIT[1]) T.cone(ex, ey, Math.PI, .6, 140, .3 + .5 * wind);
      if (hitOn) T.flash(px + 10, py, 50, .9);
      if (kind === 'rally' && a > HIT[1] && a < 2.4) { T.tracer(px + 16, py, ex - 20, ey, 1 - ph(a, 1.9, 2.4), C.gold, 5); T.popText('+ life back', px, py - 44, C.good, 1 - ph(a, 2, 2.6)); }
      if (kind === 'punish' && a > REC[0] + .1 && a < REC[1] + .3) { T.flash(ex, ey - 10, 50, 1 - ph(a, 1.8, 2.4)); T.popText('launched', ex, ey - 50 - ph(a, 1.7, 2.5) * 30, C.redDk, 1 - ph(a, 2, 2.6)); }
      if (kind === 'block' && shield) { T.bubble(px, py, 28, a, 1); if (hitOn) T.popText('perfect', px, py - 46, C.blue, 1); }
      if (kind === 'feint' && a > .2 && a < .7) T.label('feint', px, py - 40, 'center', C.purple, 13);
      if (kind === 'swap' && a > 2.4) { GI.draw(g, 'battle-axe', px, py - 44, 30, C.goldInk); T.label('axe out', px, py - 74, 'center', C.goldInk, 12); }
      else if (kind === 'swap') GI.draw(g, 'broadsword', px, py - 44, 30, C.muted);
      if (a > REC[0] && a < REC[1]) T.label('recovering', ex, ey + 46, 'center', C.goldInk, 12);
      T.foe(ex + (a > WIND[0] && a < HIT[0] ? -6 * wind : 0), ey, 26, Math.PI, C.red, { mark: 'horns' });
      T.player(px, py, 0, 1.1);
      g.restore();
      // the timeline
      const TX = 60, TW = 560, TY = 470, sx = s => TX + TW * s / BL;
      [[0, WIND[0], 'Before', '#e7e1d2'], [WIND[0], HIT[1], 'During', '#fde9b8'], [HIT[1], BL, 'Post', '#d4eff1']].forEach(([s0, s1, l, f]) => { g.fillStyle = f; g.fillRect(sx(s0), TY - 18, sx(s1) - sx(s0), 36); text(g, l, (sx(s0) + sx(s1)) / 2, TY - 32, { size: 13, w: 800, col: C.muted }); });
      g.fillStyle = 'rgba(229,50,45,.5)'; g.fillRect(sx(HIT[0]), TY - 18, sx(HIT[1]) - sx(HIT[0]), 36); text(g, 'hit', sx(1.5), TY + 30, { size: 12, w: 800, col: C.redDk });
      const actT = { dash: .3, feint: .35, block: 1.45, rally: 2, punish: 2, swap: 2.6 }[kind];
      if (a >= actT) { g.fillStyle = C.navy; g.beginPath(); g.arc(sx(actT), TY, 9, 0, TAU); g.fill(); text(g, n, sx(actT), TY + 34, { size: 13, w: 800, col: C.navy }); }
      g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(sx(a), TY - 24); g.lineTo(sx(a), TY + 24); g.stroke();
      // the grid
      panel(g, 666, 14, 360, 558, { title: 'The nine fundamentals' });
      TIME.forEach(([b], j) => text(g, b, 774 + j * 96, 56, { size: 13, w: 800, col: C.muted }));
      NAMES.forEach((row, rr) => {
        chip(g, ROWS[rr][0].slice(0, 3), 698, 110 + rr * 92, { fill: ROWS[rr][1], edge: ROWS[rr][1], col: '#fff', size: 12, width: 44 });
        row.forEach((nm, cc) => {
          const lit = rr === r && cc === c && a >= actT, done = BEATS.slice(0, i).some(b => b[0] === rr && b[1] === cc);
          card(g, 774 + cc * 96, 110 + rr * 92, 88, 80, { fill: lit ? '#fff3c4' : done ? '#f3eee2' : '#fffaf0', edge: lit ? C.gold : ROWS[rr][1] + (done ? 'aa' : '55'), lw: lit ? 4 : 2, shadow: false, r: 8 });
          text(g, nm, 774 + cc * 96, 110 + rr * 92, { size: 13, w: 800, col: lit || done ? ROWS[rr][1] : C.muted });
        });
      });
      if (a >= actT) { wrap(g, line, 690, 410, 316, { size: 15, w: 700, lh: 19, col: C.navy }); }
    },
    side(t) { const i = Math.floor(t / BL) % BEATS.length; return { out: `<b>${BEATS[i][2]}</b>: ${BEATS[i][3]}.` }; },
  });

  // ---------- elemental diamond ----------
  const DX = 340, DY = 300, DR = 196;
  const DEF = { top: 'Lightning', bottom: 'Earth', left: 'Chemical', right: 'Plague', topAx: 'Light · Ethereal · Offensive', bottomAx: 'Heavy · Hard · Defensive', leftAx: 'Inorganic · Corrosion · Physical effects', rightAx: 'Organic · Infection · Mental effects' };
  const ICON = { top: ['lightning-arc', '#d6aa28'], bottom: ['earth-crack', '#8a5a2a'], left: ['acid', '#4c9a52'], right: ['biohazard', '#8a4fd6'] };
  const DTOUR = [[0, 0], [0, -.9], [.85, -.1], [0, .9], [-.85, .05], [.4, -.45], [-.3, .5], [0, 0]];
  function dview(t, st, tour) { if (!tour) return st.p; const i = Math.floor(t / 1.6) % (DTOUR.length - 1), k = ease(ph(t - i * 1.6, 0, 1)); return [lerp(DTOUR[i][0], DTOUR[i + 1][0], k), lerp(DTOUR[i][1], DTOUR[i + 1][1], k)]; }
  function lean(p, L) {
    const [x, y] = p, w = { top: Math.max(0, -y), bottom: Math.max(0, y), left: Math.max(0, -x), right: Math.max(0, x) };
    const near = Object.entries(w).sort((a, b) => b[1] - a[1]);
    const v = y < -.15 ? L.topAx.split(' · ').pop().toLowerCase() : y > .15 ? L.bottomAx.split(' · ').pop().toLowerCase() : 'balanced';
    const h = x < -.15 ? L.leftAx.split(' · ')[0].toLowerCase() : x > .15 ? L.rightAx.split(' · ')[0].toLowerCase() : 'between';
    return { near: near[0][1] < .2 ? null : near[0][0], v, h, w };
  }
  scene('elemental-diamond', {
    dur: 11.2,
    state: () => ({ p: [.4, -.4], L: { ...DEF }, drag: false }),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => {
        const nx = (x - DX) / DR, ny = (y - DY) / DR;
        if (type === 'down' && Math.abs(nx) + Math.abs(ny) <= 1.15) { api.manual(); st.drag = true; }
        if (type === 'up') st.drag = false;
        if (st.drag && (type === 'down' || type === 'move')) { let px = nx, py = ny; const d = Math.abs(px) + Math.abs(py); if (d > 1) { px /= d; py /= d; } st.p = [px, py]; }
      });
      $$(s, '.ed-in').forEach(inp => { inp.value = st.L[inp.dataset.k]; inp.oninput = () => { api.manual(); st.L[inp.dataset.k] = inp.value || '…'; }; });
      $(s, '.ed-reset').onclick = () => { st.L = { ...DEF }; $$(s, '.ed-in').forEach(inp => inp.value = st.L[inp.dataset.k]); };
      $(s, '.ed-save').onclick = () => { const a = document.createElement('a'); a.href = api.cv.toDataURL('image/png'); a.download = 'my-elemental-diamond.png'; a.click(); };
    },
    draw(g, t, st, tour) {
      const L = tour ? DEF : st.L, p = dview(t, st, tour), ln = lean(p, L);
      // axes
      g.strokeStyle = 'rgba(93,97,140,.35)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(DX, DY - DR - 30); g.lineTo(DX, DY + DR + 30); g.moveTo(DX - DR - 30, DY); g.lineTo(DX + DR + 30, DY); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,250,240,.7)'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(DX, DY - DR); g.lineTo(DX + DR, DY); g.lineTo(DX, DY + DR); g.lineTo(DX - DR, DY); g.closePath(); g.fill(); g.stroke();
      // corners
      [['top', DX, DY - DR], ['right', DX + DR, DY], ['bottom', DX, DY + DR], ['left', DX - DR, DY]].forEach(([k, x, y]) => {
        const on = ln.near === k, [gi, col] = ICON[k];
        g.fillStyle = on ? col : '#fffaf0'; g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 40, 0, TAU); g.fill(); g.stroke();
        GI.draw(g, gi, x, y, 46, on ? '#fff' : col);
        const side = k === 'left' || k === 'right', lx = side ? x : x + 50, ly = side ? y + 60 : y;
        text(g, L[k], lx, ly, { size: 20, w: 800, display: true, col, align: side ? 'center' : 'left' });
      });
      // axis ends
      text(g, L.topAx, DX, 34, { size: 13, w: 700, col: C.muted });
      text(g, L.bottomAx, DX, 568, { size: 13, w: 700, col: C.muted });
      g.save(); g.translate(28, DY); g.rotate(-Math.PI / 2); text(g, L.leftAx, 0, 0, { size: 13, w: 700, col: C.muted }); g.restore();
      g.save(); g.translate(652, DY); g.rotate(Math.PI / 2); text(g, L.rightAx, 0, 0, { size: 13, w: 700, col: C.muted }); g.restore();
      // the point
      const px = DX + p[0] * DR, py = DY + p[1] * DR;
      g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(px, py, 14, 0, TAU); g.fill(); g.stroke();
      // readout
      panel(g, 690, 14, 336, 558, { title: 'Where this point sits' });
      text(g, ln.near ? L[ln.near] : 'In between', 858, 84, { size: 28, w: 800, display: true, col: ln.near ? ICON[ln.near][1] : C.navy });
      text(g, `Leans ${ln.v}, ${ln.h}`, 858, 118, { size: 15, w: 700, col: C.ink });
      ['top', 'right', 'bottom', 'left'].forEach((k, j) => {
        const y = 176 + j * 52, v = clamp(ln.w[k]); text(g, L[k], 712, y, { align: 'left', size: 14, w: 800, col: ICON[k][1] });
        g.fillStyle = 'rgba(21,32,68,.12)'; g.fillRect(820, y - 8, 180, 16); g.fillStyle = ICON[k][1]; g.fillRect(820, y - 8, 180 * v, 16);
      });
      wrap(g, '“You need to sit down and develop your frameworks, tools, and keywords yourself.” Rename the corners and axes for your own game, then save it.', 712, 410, 296, { size: 14, lh: 18, col: C.navy, w: 700 });
    },
    side(t, st, tour) { const ln = lean(dview(t, st, tour), tour ? DEF : st.L), L = tour ? DEF : st.L; return { out: `${ln.near ? `<b>${L[ln.near]}</b>` : 'Between elements'}: leans ${ln.v}, ${ln.h}.` }; },
  });
})();
