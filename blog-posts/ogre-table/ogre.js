/* The Ogre Turn: one D&D turn told twice at once, as dice and as a table.
   scene: the ogre hits Thistle (d20 15 + 7 = 22 vs AC 14, 2d8 + 4 = 15, 17 HP down to 2), Ansel answers with a flail
          (d20 13 + 6 = 19 vs AC 17, 1d8 + 4 = 11), then Ansel, silent for three sessions, says "I've got you. Go sing."
          The top half is the dice and the fight; the bottom half is the table's energy and the seats.
   odds:  how often the dice hand a table this setup: the ogre hits, Thistle is left on 1 to 3 HP, Ansel hits back.
          Exact odds from the 5e attack rules, plus 40 seeded nights.
   Numbers: ROLLS, BEATS, ENERGY (scene) and OGRE, ANSEL (odds). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const pct = v => (v >= .995 ? '100' : v < .1 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%';
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const apis = {};
  const COL = { thistle: '#8a4fd6', ansel: '#2ea3dc', ogre: '#a8201c', gm: '#9a5a06', gold: '#e0a92d', miss: '#8b8fa8' };

  // dice faces, drawn so the rolled number reads at a glance
  function d20(g, x, y, r, n, col, spin = 0) {
    g.save(); g.translate(x, y); g.rotate(spin);
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
    g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2.5; g.stroke();
    const t = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].map(a => [Math.cos(a) * r * .62, Math.sin(a) * r * .62 + r * .1]);
    g.beginPath(); t.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.stroke();
    g.restore();
    txt(g, String(n), x, y + r * .12, `800 ${Math.round(r * .62)}px Montserrat`, '#fff', 'center');
  }
  function d8(g, x, y, r, n, col, spin = 0) {
    g.save(); g.translate(x, y); g.rotate(spin);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * .82, 0); g.lineTo(0, r); g.lineTo(-r * .82, 0); g.closePath();
    g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2.5; g.stroke();
    g.beginPath(); g.moveTo(-r * .82, 0); g.lineTo(r * .82, 0); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.stroke();
    g.restore();
    txt(g, String(n), x, y + 2, `800 ${Math.round(r * .58)}px Montserrat`, '#fff', 'center');
  }
  function token(g, x, y, r, icon, col, name, sub) {
    g.fillStyle = 'rgba(21,32,68,.18)'; g.beginPath(); g.ellipse(x + 3, y + r * .9, r * .9, r * .3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#152044'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = col; g.lineWidth = 5; g.stroke();
    GI.draw(g, icon, x, y, r * 1.35, '#fff');
    if (name) txt(g, name, x, y + r + 18, '800 16px Montserrat', C.ink, 'center');
    if (sub) txt(g, sub, x, y + r + 36, '600 13px Jost', C.muted, 'center');
  }
  function hpBar(g, x, y, w, v, max, col) {
    box(g, x - w / 2 - 2, y - 9, w + 4, 18, 'rgba(21,32,68,.85)', null, 5);
    g.fillStyle = '#5a1f1c'; g.fillRect(x - w / 2, y - 6, w, 12);
    g.fillStyle = v / max <= .2 ? '#e5322d' : col; g.fillRect(x - w / 2, y - 6, w * clamp(v / max), 12);
    txt(g, `${Math.round(v)} / ${max} HP`, x, y - 22, '800 15px Montserrat', v / max <= .2 ? C.redDk : C.ink, 'center');
  }
  const wrapLines = (g, s, w, font) => { g.font = font; const out = []; let line = ''; s.split(' ').forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w && line) { out.push(line); line = wd; } else line = t; }); out.push(line); return out; };

  /* ---------- 1: one turn at the table ---------- */
  const THISTLE = { max: 17 }, OGRE = { max: 59, hit: 7, ac: 17 };
  // each roll: when it starts, when the dice land, what they show
  const ROLLS = [
    { t0: 1.6, land: 3.0, who: 'Ogre attacks Thistle', col: COL.ogre, d: 20, faces: [15], mod: 7, vs: 14, vsName: 'Thistle’s AC', verdict: 'connects' },
    { t0: 5.0, land: 6.2, who: 'Ogre damage: 2d8 + 4', col: COL.ogre, d: 8, faces: [6, 5], mod: 4, dmg: 'damage' },
    { t0: 12.3, land: 13.5, who: 'Ansel attacks the ogre', col: COL.ansel, d: 20, faces: [13], mod: 6, vs: 17, vsName: 'Ogre’s AC', verdict: 'gets there' },
    { t0: 15.8, land: 16.9, who: 'Flail damage: 1d8 + 4', col: COL.ansel, d: 8, faces: [7], mod: 4, dmg: 'bludgeoning' },
  ];
  const total = r => r.faces.reduce((a, b) => a + b, 0) + r.mod;
  const BEATS = [
    [0, 'The ogre swings', 'gm', 'Thistle, this thing’s got nothing but hate in its eyes. Rolling...'],
    [3.6, 'It connects', 'gm', 'Your AC’s 14? Yeah, that’s gonna connect. Roll damage.'],
    [7.2, 'Thistle at 2 HP', 'say', 'Fifteen damage. Thistle drops to 2 HP.'],
    [8.8, 'Ansel’s turn', 'gm', 'Ansel, it’s turning to finish her. What do you do?'],
    [11.2, 'The flail', 'ansel', 'I hit it. Flail.'],
    [13.8, 'It gets there', 'gm', 'Oh, that gets there.'],
    [17.2, 'Cracked jaw', 'gm', 'You crack it across the jaw and it staggers back, and Thistle, when you look up...'],
    [20.0, 'Ansel speaks', 'ansel', 'I’ve got you. Go sing.'],
    [23.4, 'The table', 'say', 'The table absolutely detonates.'],
  ];
  const CHIPS = [0, 2, 3, 4, 7, 8];   // the beats shown as chips along the top
  // the table's energy (0 to 1, above 1 is off the chart): an illustration of the room, not a measurement
  const ENERGY = [[0, .18], [1.6, .3], [3, .42], [3.8, .55], [6.2, .62], [7.6, .9], [8.8, .95], [11.2, .78], [12.3, .82], [13.5, .9], [14.2, .86], [17, .82], [19.6, .78], [20.6, .7], [23.2, .74], [24, 1.3], [30, 1.3]];
  const energy = t => { for (let i = 1; i < ENERGY.length; i++) if (t <= ENERGY[i][0]) { const [a, va] = ENERGY[i - 1], [b, vb] = ENERGY[i]; return lerp(va, vb, ease(clamp((t - a) / (b - a)))); } return ENERGY[ENERGY.length - 1][1]; };
  const SPEAKER = { gm: ['pointy-hat', COL.gm, 'GM'], ansel: ['hood', COL.ansel, 'Ansel'], say: ['meeple', C.muted, ''] };

  canvasDemo('scene', (s, cv, g) => {
    const DUR = 30;
    const st = { tour: true, t: 0, held: false, key: '' };
    const tourBtn = $(s, '.sc-tour'), tIn = $(s, '.sc-t'), free = freeOf(st, tourBtn), beatBox = $(s, '.sc-beats');
    beatBox.innerHTML = BEATS.map((b, i) => `<button class="btn" data-i="${i}">${i + 1}. ${b[1]}</button>`).join('');
    $$(beatBox, '.btn').forEach(b => b.onclick = () => { free(); st.t = BEATS[+b.dataset.i][0] + .05; });
    tIn.oninput = () => { free(); st.t = +tIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };

    function drawRoll(g, r, t, x0, y0) {
      const rolling = t < r.land, k = clamp((t - r.land) / .5);
      const shown = r.faces.map((f, i) => rolling ? 1 + Math.floor(rng(Math.floor(t * 14) * 7 + i)() * r.d) : f);
      txt(g, r.who, x0, y0, '800 18px Montserrat', r.col);
      if (r.d === 20) {
        d20(g, x0 + 58, y0 + 78, 52, shown[0], r.col, rolling ? Math.sin(t * 20) * .4 : 0);
        const tot = total(r);
        txt(g, rolling ? 'rolling d20...' : `${r.faces[0]} + ${r.mod} = ${tot}`, x0 + 132, y0 + 52, '800 30px Montserrat', C.ink);
        // number line, 1 to 30, the AC as a wall and the total sliding to it
        const lx = x0 + 132, lw = 300, ly = y0 + 112, X = v => lx + (v - 1) / 29 * lw;
        g.fillStyle = '#e8dcc0'; g.fillRect(lx, ly - 4, lw, 8);
        g.fillStyle = 'rgba(47,174,99,.22)'; g.fillRect(X(r.vs), ly - 12, lx + lw - X(r.vs), 24);
        [1, 10, 20, 30].forEach(v => txt(g, String(v), X(v), ly + 24, '600 12px Jost', C.muted, 'center'));
        g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(X(r.vs), ly - 20); g.lineTo(X(r.vs), ly + 14); g.stroke();
        txt(g, `${r.vsName} ${r.vs}`, X(r.vs), ly - 30, '700 14px Jost', C.navy, 'center');
        if (!rolling) {
          const v = lerp(r.faces[0], tot, ease(k));
          g.fillStyle = r.col; g.beginPath(); g.arc(X(v), ly, 9, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
          if (k >= 1) txt(g, `${tot} ≥ ${r.vs}: it ${r.verdict}`, x0 + 132, y0 + 160, '800 20px Montserrat', C.good);
        }
      } else {
        r.faces.forEach((f, i) => d8(g, x0 + 50 + i * 92, y0 + 78, 44, shown[i], r.col, rolling ? Math.sin(t * 18 + i) * .5 : 0));
        const dx = x0 + 50 + r.faces.length * 92 - 10;
        txt(g, rolling ? 'rolling...' : `${r.faces.join(' + ')} + ${r.mod}`, dx, y0 + 62, '700 22px Jost', C.muted);
        if (!rolling) txt(g, `= ${total(r)} ${r.dmg}`, dx, y0 + 98, '800 32px Montserrat', C.ink);
      }
    }

    function render() {
      const t = st.t;
      if (st.tour) tIn.value = t.toFixed(1);
      T.use(g); panel(g);
      let bi = 0; BEATS.forEach((b, i) => { if (t >= b[0]) bi = i; });
      // beat chips along the top
      const cw = 1000 / CHIPS.length;
      CHIPS.forEach((ci, i) => {
        const x = 20 + i * cw, now = bi >= ci && (i === CHIPS.length - 1 || bi < CHIPS[i + 1]), past = bi >= ci;
        box(g, x, 10, cw - 12, 32, now ? C.navy : past ? '#fde9b8' : 'rgba(21,32,68,.05)', past ? (now ? C.navy : COL.gold) : '#cdbf9f', 8, 2);
        txt(g, BEATS[ci][1], x + (cw - 12) / 2, 26, '700 15px Jost', now ? '#fff' : past ? '#7a4a00' : C.muted, 'center');
        if (i < CHIPS.length - 1) txt(g, '›', x + cw - 7, 26, '800 18px Montserrat', '#cdbf9f', 'center');
      });

      // ----- the dice -----
      box(g, 20, 54, 480, 304, 'rgba(21,32,68,.05)', null, 12);
      txt(g, 'THE DICE', 36, 72, '800 13px Montserrat', C.muted);
      let cur = null; ROLLS.forEach(r => { if (t >= r.t0) cur = r; });
      if (cur && t < 25.2) drawRoll(g, cur, t, 36, 98);
      else if (cur) { const a = clamp((t - 25.2) * 3); g.save(); g.globalAlpha = a; txt(g, 'Four rolls built a cliffhanger.', 260, 232, '700 18px Jost', C.muted, 'center'); txt(g, 'One line of dialogue paid it off.', 260, 258, '700 18px Jost', C.muted, 'center'); g.restore(); }
      else { txt(g, 'The ogre lumbers in.', 260, 170, '700 20px Jost', C.muted, 'center'); txt(g, 'The GM leans forward.', 260, 198, '700 20px Jost', C.muted, 'center'); }
      // ledger of finished rolls
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(36, 282); g.lineTo(484, 282); g.stroke();
      ROLLS.forEach((r, i) => {
        const done = t >= r.land + .4, y = 296 + (i % 2) * 24, x = 36 + Math.floor(i / 2) * 230;
        const line = r.d === 20 ? `${r.col === COL.ogre ? 'Ogre' : 'Ansel'} to hit: ${total(r)} vs ${r.vs}` : `${r.col === COL.ogre ? 'Ogre' : 'Flail'} damage: ${total(r)}`;
        g.fillStyle = done ? r.col : '#d9cfb8'; g.beginPath(); g.arc(x + 5, y, 5, 0, Math.PI * 2); g.fill();
        txt(g, line, x + 16, y, '600 14px Jost', done ? C.ink : '#b9ae96');
      });

      // ----- the fight -----
      box(g, 520, 54, 500, 304, 'rgba(21,32,68,.05)', null, 12);
      txt(g, 'THE FIGHT', 536, 72, '800 13px Montserrat', C.muted);
      const thHp = t < 7.2 ? THISTLE.max : lerp(THISTLE.max, 2, ease(clamp((t - 7.2) / .9)));
      const ogHp = t < 17 ? OGRE.max : lerp(OGRE.max, OGRE.max - 11, ease(clamp((t - 17) / .8)));
      // the ogre walks in, lunges on the hit, turns on Thistle, then staggers back from the flail
      let ox = lerp(1090, 900, ease(clamp(t / 1.4)));
      ox -= 70 * Math.sin(Math.PI * clamp((t - 2.9) / .7));
      ox -= 22 * ease(clamp((t - 9) / 1.2)) * (1 - ease(clamp((t - 16.9) / .2)));
      ox += 46 * ease(clamp((t - 16.9) / .6));
      const oy = 186, oShake = t > 16.9 && t < 17.6 ? Math.sin(t * 60) * 4 : 0;
      // Ansel steps between them on his turn
      const ax = lerp(690, 770, ease(clamp((t - 11.2) / 1)));
      const ay = lerp(300, 222, ease(clamp((t - 11.2) / 1)));
      const thx = 620, thy = 200, thShake = t > 3.0 && t < 3.6 ? Math.sin(t * 60) * 4 : 0;
      token(g, thx + thShake, thy, 38, 'woman-elf-face', COL.thistle, 'Thistle', 'bard');
      hpBar(g, thx, thy - 62, 92, thHp, THISTLE.max, '#2fae63');
      if (t > 7.6 && t < 22) GI.draw(g, 'heart-beats', thx + 50, thy - 30, 30, '#e5322d');
      token(g, ax, ay, 34, 'hood', COL.ansel, 'Ansel', '');
      token(g, ox + oShake, oy, 52, 'ogre', COL.ogre, 'Ogre', '');
      if (t > 1) hpBar(g, ox, oy - 78, 110, ogHp, OGRE.max, '#2fae63');
      // hit flashes
      const flashAt = (x, y, t0, col) => { const a = 1 - clamp((t - t0) / .6); if (t > t0 && a > 0) { g.save(); g.globalAlpha = a; GI.draw(g, 'ragged-wound', x, y, 70 + 30 * (1 - a), col); g.restore(); } };
      flashAt(thx, thy, 3.0, '#e5322d');
      flashAt(thx, thy, 6.6, '#e5322d');
      // the flail: swings over Ansel's head and into the ogre's jaw
      if (t > 13.5) {
        const sw = ease(clamp((t - 16.3) / .6)), ang = lerp(-2.4, .5, sw) + (t < 16.3 ? Math.sin(t * 7) * .25 : 0);
        GI.draw(g, 'flail', ax + 34 + Math.cos(ang) * 30, ay - 18 + Math.sin(ang) * 30, 52, '#152044', ang + 1.2);
      }
      flashAt(ox - 30, oy - 10, 16.9, '#2ea3dc');
      if (t > 17 && t < 19.5) T.popText('-11', ox + 80, oy - 60 - 16 * clamp(t - 17), C.redDk, 1 - clamp((t - 18.7) / .8));
      if (t > 7.2 && t < 9.4) T.popText('-15', thx - 70, thy - 50 - 16 * clamp(t - 7.2), C.redDk, 1 - clamp((t - 8.6) / .8));
      if (t > 22) { const a = clamp((t - 22) / .6); g.save(); g.globalAlpha = a; [0, 1, 2].forEach(i => GI.draw(g, 'musical-notes', thx + 52 + i * 26, thy - 34 - 18 * i - 6 * Math.sin(t * 3 + i), 24, COL.thistle)); g.restore(); }

      // ----- the quote line -----
      const [, , who, quote] = BEATS[bi], [sic, scol, sname] = SPEAKER[who];
      const qa = clamp((t - BEATS[bi][0]) / .35);
      box(g, 20, 366, 1000, 46, who === 'ansel' && bi === 7 ? '#fde9b8' : '#fffaf0', who === 'ansel' && bi === 7 ? COL.gold : '#cdbf9f', 10, 2);
      g.save(); g.globalAlpha = qa;
      GI.draw(g, sic, 46, 389, 30, scol);
      if (sname) txt(g, sname + ':', 70, 389, '800 17px Montserrat', scol);
      txt(g, (who === 'say' ? '' : '“') + quote + (who === 'say' ? '' : '”'), sname ? 70 + g.measureText(sname + ':').width + 12 : 70, 389, who === 'say' ? 'italic 600 18px Jost' : '600 18px Jost', C.ink);
      g.restore();

      // ----- the table's energy -----
      const cx = 20, cy = 422, cw2 = 620, ch = 150;
      box(g, cx, cy, cw2, ch, 'rgba(21,32,68,.05)', null, 12);
      txt(g, 'THE TABLE’S ENERGY', cx + 16, cy + 16, '800 13px Montserrat', C.muted);
      const px = v => cx + 16 + v / DUR * (cw2 - 32), py = v => cy + ch - 16 - Math.min(v, 1.08) * (ch - 44);
      g.strokeStyle = '#d9cfb8'; g.lineWidth = 1; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(px(0), py(1)); g.lineTo(px(DUR), py(1)); g.stroke(); g.setLineDash([]);
      // future, faint; past, solid
      const curve = (a, b, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath(); for (let v = a; v <= b + 1e-6; v += .1) { const x = px(v), y = py(energy(v)); v === a ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); };
      curve(0, DUR, 'rgba(93,97,140,.18)', 3);
      if (t > .1) {
        const grad = g.createLinearGradient(px(0), 0, px(DUR), 0); grad.addColorStop(0, COL.ogre); grad.addColorStop(.5, COL.ansel); grad.addColorStop(.8, COL.gold);
        curve(0, t, grad, 5);
        g.fillStyle = C.navy; g.beginPath(); g.arc(px(t), py(energy(t)), 7, 0, Math.PI * 2); g.fill();
      }
      const note = (t0, x, y, s, col) => { const a = clamp((t - t0) / .5); if (a > 0) { g.save(); g.globalAlpha = a; T.label(s, x, y, 'center', col, 14); g.restore(); } };
      note(7.6, px(5), py(.9) + 40, 'dice: Thistle on 2 HP', COL.ogre);
      note(13.6, px(15.5), py(.86) + 40, 'dice: the flail lands', COL.ansel);
      note(23.8, px(24.5) - 40, py(1.08) + 48, 'a quiet player: off the chart', '#7a4a00');
      if (t > 24) { const a = clamp((t - 24) / .4); g.save(); g.globalAlpha = a; txt(g, '▲', px(t) , cy + 22, '800 16px Montserrat', COL.gold, 'center'); g.restore(); }

      // ----- the seats -----
      const sx = 656, sy = 422;
      box(g, sx, sy, 364, ch, 'rgba(21,32,68,.05)', null, 12);
      txt(g, 'THE SEATS', sx + 16, sy + 16, '800 13px Montserrat', C.muted);
      box(g, sx + 92, sy + 58, 180, 56, '#c9a46b', '#9a7444', 10, 2);
      const seats = [
        ['GM', 'pointy-hat', COL.gm, sx + 182, sy + 40],
        ['Thistle', 'woman-elf-face', COL.thistle, sx + 60, sy + 86],
        ['Ansel', 'hood', COL.ansel, sx + 304, sy + 86],
        ['', 'meeple', '#2fae63', sx + 136, sy + 132],
        ['', 'meeple', '#e5322d', sx + 228, sy + 132],
      ];
      const boom = clamp((t - 23.4) / .3);
      seats.forEach(([name, ic, col, x, y], i) => {
        const hop = boom > 0 ? Math.abs(Math.sin((t - 23.4) * 7 + i * 1.3)) * 12 * boom : 0;
        const lean = t > 8.8 && t < 23.4 && name !== 'Ansel' ? 1 : 0;   // eyes on Ansel once the GM hands him the turn
        g.fillStyle = '#152044'; g.beginPath(); g.arc(x, y - hop, 17, 0, Math.PI * 2); g.fill(); g.strokeStyle = col; g.lineWidth = 3.5; g.stroke();
        GI.draw(g, ic, x, y - hop, 24, '#fff');
        if (lean) { const a = Math.atan2(sy + 86 - y, sx + 304 - x); g.fillStyle = col; g.beginPath(); g.arc(x + Math.cos(a) * 22, y + Math.sin(a) * 22, 3.5, 0, Math.PI * 2); g.fill(); }
        if (name === 'Ansel') {
          const lit = t >= 20;
          box(g, x - 46, y + 22, 92, 22, lit ? '#fde9b8' : '#ede4d0', lit ? COL.gold : '#cdbf9f', 6, 1.5);
          txt(g, lit ? '1 line!' : '0 lines', x, y + 33, '700 12px Jost', lit ? '#7a4a00' : C.muted, 'center');
          txt(g, 'in 3 sessions', x, y + 54, '600 11px Jost', C.muted, 'center');
          if (lit && t < 23.4) { g.save(); g.globalAlpha = .5 + .5 * Math.sin(t * 8); g.strokeStyle = COL.gold; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 25, 0, Math.PI * 2); g.stroke(); g.restore(); }
        } else if (name) txt(g, name, x, y + (name === 'GM' ? -27 : 30), '600 12px Jost', C.muted, 'center');
      });
      // confetti
      if (boom > 0) {
        const R = rng(5);
        for (let i = 0; i < 46; i++) {
          const a = R() * Math.PI * 2, sp = 40 + R() * 120, life = (t - 23.4 + R() * 1.6) % 2.2, k = life / 2.2;
          const x = sx + 182 + Math.cos(a) * sp * k * 1.4, y = sy + 86 + Math.sin(a) * sp * k - 30 * k + 60 * k * k;
          g.save(); g.globalAlpha = (1 - k) * boom; g.fillStyle = [COL.gold, COL.ansel, COL.thistle, '#e5322d', '#2fae63'][i % 5];
          g.translate(x, y); g.rotate(life * 6 + i); g.fillRect(-4, -2, 8, 4); g.restore();
        }
        g.save(); g.globalAlpha = boom; GI.draw(g, 'party-popper', sx + 182, sy + 86, 40, COL.gold); g.restore();
      }
      if (t > 25.2) T.stamp('The dice set it up. A player paid it off.', 260, 170, C.navy, clamp((t - 25.2) * 3), 21);

      $(s, '.sc-tv').textContent = t.toFixed(1) + 's';
      $$(beatBox, '.btn').forEach((b, i) => b.classList.toggle('on', i === bi));
      const key = String(bi); if (key === st.key) return; st.key = key;
      const OUT = [
        'The ogre attacks Thistle. The GM rolls in the open: the table watches the d20.',
        '15 + 7 = 22 against AC 14. The hit is never in doubt; the question is how much it hurts.',
        '2d8 + 4 comes up 15. Thistle had 17. She is standing on 2 HP, and every eye at the table knows it.',
        'The GM hands the spotlight to Ansel, the player who has not said a word in three sessions.',
        'Ansel answers in four words. The player has made the choice; now the dice decide if it lands.',
        '13 + 6 = 19 against AC 17. A 50% swing that lands.',
        '1d8 + 4 = 11 bludgeoning. The ogre has HP to spare, so the dice did not end the fight. The GM narrates a stagger instead.',
        'Then Ansel speaks in character for the first time in three sessions.',
        'The table detonates. The numbers built the tension; the release came from a person at the table.',
      ];
      say($(s, '.sc-out'), OUT[bi]);
    }
    apis.scene = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.t > DUR) st.t = st.tour ? 0 : DUR; render(); };
  });

  /* ---------- 2: what the dice allowed ---------- */
  // distribution of n d8s, as { sum: count }
  const dist = n => { let d = { 0: 1 }; for (let k = 0; k < n; k++) { const nx = {}; Object.entries(d).forEach(([s, c]) => { for (let f = 1; f <= 8; f++) nx[+s + f] = (nx[+s + f] || 0) + c; }); d = nx; } return d; };
  const D2 = dist(2), D4 = dist(4);
  const hitParts = (bonus, ac) => { let n = 0; for (let d = 2; d <= 19; d++) if (d + bonus >= ac) n++; return { hit: n / 20, crit: 1 / 20 }; };
  // outcome for a damage total against HP: down, cliff (1 to 3 left), stands (4+ left)
  const outcome = (dmg, hp) => dmg >= hp ? 'down' : hp - dmg <= 3 ? 'cliff' : 'stands';
  function odds(ac, hp, bonus) {
    const { hit, crit } = hitParts(OGRE.hit, ac);
    const o = { miss: 1 - hit - crit, down: 0, cliff: 0, stands: 0 };
    [[hit, D2, 64], [crit, D4, 4096]].forEach(([p, D, n]) => Object.entries(D).forEach(([s, c]) => { o[outcome(+s + 4, hp)] += p * c / n; }));
    const a = hitParts(bonus, OGRE.ac), ansel = a.hit + a.crit;
    return { ...o, ansel, moment: o.cliff * ansel };
  }
  // 40 nights of seeded dice: ogre d20, four d8s, Ansel's d20
  const NIGHTS = (() => { const r = rng(23); return Array.from({ length: 40 }, () => ({ od: 1 + Math.floor(r() * 20), d8: [0, 0, 0, 0].map(() => 1 + Math.floor(r() * 8)), ad: 1 + Math.floor(r() * 20) })); })();
  const night = (n, ac, hp, bonus) => {
    if (n.od === 1 || (n.od < 20 && n.od + OGRE.hit < ac)) return { k: 'miss' };
    const dmg = (n.od === 20 ? n.d8.reduce((a, b) => a + b) : n.d8[0] + n.d8[1]) + 4, k = outcome(dmg, hp);
    const hits = n.ad === 20 || (n.ad > 1 && n.ad + bonus >= OGRE.ac);
    return { k, dmg, moment: k === 'cliff' && hits, ansel: hits };
  };
  const OC = { miss: ['#e6e2d8', '#8b8fa8', 'checked-shield', 'Ogre misses'], stands: ['#d8f0df', '#5fb47c', 'heart-organ', 'Thistle stands, 4+ HP'], cliff: ['#fde9b8', '#e0a92d', 'heart-beats', 'Thistle on 1 to 3 HP'], down: ['#f9d9d6', '#e07b72', 'broken-heart', 'Thistle drops'] };

  canvasDemo('odds', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, ac: 14, hp: 17, bo: 6, key: '' };
    const tourBtn = $(s, '.od-tour'), aIn = $(s, '.od-ac'), hIn = $(s, '.od-hp'), bIn = $(s, '.od-bo'), free = freeOf(st, tourBtn);
    aIn.oninput = () => { free(); st.ac = +aIn.value; };
    hIn.oninput = () => { free(); st.hp = +hIn.value; };
    bIn.oninput = () => { free(); st.bo = +bIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 24;
    function bar(g, x, y, w, h, parts, labelFn) {
      let cx = x; const tot = parts.reduce((a, p) => a + p[0], 0) || 1;
      parts.forEach(([v, fill, stroke, lbl], i) => {
        const pw = w * v / tot; if (pw <= 0) return;
        box(g, cx, y, Math.max(2, pw - 2), h, fill, stroke, 6, 2);
        if (pw > 70) { txt(g, pct(v / tot), cx + pw / 2, y + h / 2 - 9, '800 18px Montserrat', C.ink, 'center'); txt(g, lbl, cx + pw / 2, y + h / 2 + 11, '600 13px Jost', C.muted, 'center'); }
        else if (pw > 30) txt(g, pct(v / tot), cx + pw / 2, y + h / 2, '800 14px Montserrat', C.ink, 'center');
        parts[i].x0 = cx; parts[i].x1 = cx + pw; cx += pw;
      });
    }
    const zoom = (g, x0, x1, y0, X0, X1, y1, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(X1, y1); g.lineTo(X0, y1); g.closePath(); g.fill(); };
    function render() {
      let { ac, hp, bo } = st; const t = st.t;
      if (st.tour) {
        if (t < 6) { ac = 14; hp = 17; bo = 6; }
        else if (t < 12) { ac = Math.round(lerp(14, 20, ease(clamp((t - 6.5) / 4)))); hp = 17; bo = 6; }
        else if (t < 18) { ac = 14; hp = Math.round(lerp(17, 32, ease(clamp((t - 12.5) / 4)))); bo = 6; }
        else { ac = 14; hp = 17; bo = Math.round(lerp(6, 1, ease(clamp((t - 18.5) / 3.5)))); }
        aIn.value = ac; hIn.value = hp; bIn.value = bo;
      }
      const o = odds(ac, hp, bo);
      T.use(g); panel(g);
      // the funnel: each row zooms into one slice of the row above
      const X = 20, BW = 600, rows = [24, 138, 252];
      txt(g, `The ogre swings at AC ${ac}`, X, rows[0], '800 18px Montserrat');
      const hitAll = 1 - o.miss;
      const r1 = [[o.miss, ...OC.miss.slice(0, 2), 'misses'], [hitAll, '#f9d9d6', '#e07b72', 'hits']];
      bar(g, X, rows[0] + 16, BW, 56, r1);
      txt(g, `When it hits Thistle (${hp} HP)`, X, rows[1], '800 18px Montserrat');
      const r2 = [[o.down, ...OC.down.slice(0, 2), 'drops'], [o.cliff, ...OC.cliff.slice(0, 2), '1 to 3 HP left'], [o.stands, ...OC.stands.slice(0, 2), '4+ HP left']];
      if (r1[1].x1) zoom(g, r1[1].x0, r1[1].x1, rows[0] + 72, X, X + BW, rows[1] - 12, 'rgba(224,123,114,.12)');
      bar(g, X, rows[1] + 16, BW, 56, r2);
      txt(g, `When she is left on 1 to 3 HP, Ansel (+${bo}) swings at AC 17`, X, rows[2], '800 18px Montserrat');
      if (r2[1].x1) zoom(g, r2[1].x0, r2[1].x1, rows[1] + 72, X, X + BW, rows[2] - 12, 'rgba(224,169,45,.14)');
      bar(g, X, rows[2] + 16, BW, 56, [[o.ansel, '#dbeefa', '#2ea3dc', 'Ansel hits'], [1 - o.ansel, '#e6e2d8', '#8b8fa8', 'Ansel misses']]);
      // the headline
      box(g, X, 338, BW, 62, '#fffaf0', '#e0a92d', 10, 2);
      GI.draw(g, 'party-popper', X + 32, 369, 36, '#e0a92d');
      txt(g, 'This exact setup:', X + 62, 358, '700 16px Jost', C.muted);
      txt(g, `${pct(o.moment)} of nights${o.moment > 0 ? `, about 1 in ${Math.max(1, Math.round(1 / o.moment))}` : ''}`, X + 62, 382, '800 22px Montserrat', '#7a4a00');

      // damage histogram: 2d8 + 4 against Thistle's HP
      const HX = 650, HY = 20, HW = 370, HH = 380;
      box(g, HX, HY, HW, HH, 'rgba(21,32,68,.05)', null, 12);
      txt(g, 'Ogre damage, 2d8 + 4', HX + 16, HY + 22, '800 17px Montserrat');
      txt(g, 'the night’s roll: 15', HX + 16, HY + 44, '600 14px Jost', C.muted);
      const maxC = 8, bw = (HW - 40) / 15, base = HY + HH - 46;
      for (let d = 6; d <= 20; d++) {
        const c = D2[d - 4] || 0, h = c / maxC * (HH - 130), x = HX + 20 + (d - 6) * bw, [fill, stroke] = OC[outcome(d, hp)];
        box(g, x + 2, base - h, bw - 4, h, fill, stroke, 4, d === 15 ? 3.5 : 1.5);
        if (d === 15) { g.strokeStyle = C.navy; g.lineWidth = 3; g.strokeRect(x, base - h - 4, bw, h + 8); }
        if (d % 2 === 0 || d === 15) txt(g, String(d), x + bw / 2, base + 14, `${d === 15 ? 800 : 600} 13px Jost`, d === 15 ? C.navy : C.muted, 'center');
      }
      // legend
      ['down', 'cliff', 'stands'].forEach((k, i) => { const [fill, stroke, ic, lbl] = OC[k]; GI.draw(g, ic, HX + 26 + i * 118, base + 36, 18, stroke); txt(g, k === 'down' ? 'drops' : k === 'cliff' ? '1 to 3 left' : '4+ left', HX + 40 + i * 118, base + 36, '600 13px Jost', C.ink); });

      // 40 seeded nights
      txt(g, '40 nights at this table, same dice each time', X, 424, '800 17px Montserrat');
      let moments = 0;
      NIGHTS.forEach((n, i) => {
        const r = night(n, ac, hp, bo), [fill, stroke, ic] = OC[r.k], x = X + (i % 20) * 50, y = 440 + Math.floor(i / 20) * 66;
        box(g, x, y, 44, 58, fill, r.moment ? C.navy : stroke, 7, r.moment ? 3.5 : 1.5);
        GI.draw(g, ic, x + 22, y + 20, 22, stroke);
        if (r.k !== 'miss') txt(g, String(r.dmg), x + 22, y + 44, '700 13px Jost', C.ink, 'center');
        if (r.moment) { moments++; GI.draw(g, 'flail', x + 36, y + 8, 18, C.navy); }
      });
      txt(g, `${moments} of 40 nights hand Ansel the moment (outlined)`, 1020, 424, '700 15px Jost', moments ? '#7a4a00' : C.muted, 'right');

      $(s, '.od-av').textContent = ac; $(s, '.od-hv').textContent = hp; $(s, '.od-bv').textContent = '+' + bo;
      const key = [ac, hp, bo].join(); if (key === st.key) return; st.key = key;
      say($(s, '.od-out'), ac === 14 && hp === 17 && bo === 6
        ? `On the night: the ogre hits ${pct(hitAll)} of the time, ${pct(o.cliff / Math.max(hitAll, 1e-9))} of hits leave Thistle on 1 to 3 HP, and Ansel lands ${pct(o.ansel)}. Together, about 1 night in ${Math.round(1 / o.moment)}.`
        : hp > 24
          ? `With ${hp} HP, one ogre hit is a scratch. The cliffhanger needs a lucky crit, so the setup drops to ${pct(o.moment)} of nights.`
          : ac > 16
            ? `AC ${ac} turns most swings into misses. Fewer hits means fewer cliffhangers: ${pct(o.moment)} of nights.`
            : bo < 4
              ? `At +${bo}, Ansel lands only ${pct(o.ansel)}. The cliffhanger still happens, but the answer often whiffs: ${pct(o.moment)} of nights.`
              : `This table gets the setup on ${pct(o.moment)} of nights.`);
    }
    apis.odds = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
