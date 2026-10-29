/* What's next (MGM C4 M7, deck slides 261-275).
   'challenge-loop' (266): "Start by creating the challenges first for your game. Next create the tools for overcoming those
   challenges. Then expand the breadth or depth of those tools… Then cut things out that aren't strong contenders, refine and
   improve what you have, then repeat." Played out on a Super Mario Bros. stretch of ground.
   'course-map' (268-270): FPF, then Mastering Game Mechanics, then implementation, with level and narrative design beside
   it. Mastering Game Mechanics opens into every module and page of this site; click one to go there.
   'framework-kit' (256, 271-273): the module's frameworks as blank cards, for planning your own game or a mod. The printable
   version is kit.html. */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease, lerp, arrow } = CK;
  const T = TD, C = TD.C, TAU = Math.PI * 2;
  const ph = (t, a, b) => clamp((t - a) / (b - a));

  // ---------- challenge-first loop ----------
  const STEPS = [['Create the challenges', 'A gap in the ground'], ['Shape your toolkit', 'Give Mario a jump'], ['Expand breadth & depth', 'Run for a longer jump; land on a Goomba'], ['Prune, refine, repeat', 'Cut the tool nobody needs']];
  const PH = 3.4, GY = 470;
  function ground(g, gapL, gapR) {
    g.fillStyle = '#5c94fc'; g.fillRect(14, 14, 640, 558);
    for (let x = 14; x < 654; x += 32) for (let r = 0; r < 3; r++) {
      if (x + 32 > gapL && x < gapR) continue;
      const y = GY + r * 32; g.fillStyle = '#c84c0c'; g.fillRect(x, y, 32, 32); g.fillStyle = '#fcbcb0'; g.fillRect(x, y, 32, 3); g.fillRect(x, y, 3, 32); g.fillStyle = '#000'; g.fillRect(x + 29, y, 3, 32); g.fillRect(x, y + 29, 32, 3);
    }
  }
  const frame = t => `smb-mario-walk${1 + Math.floor(t * 10) % 3}.png`;
  scene('challenge-loop', {
    dur: PH * 4,
    draw(g, t) {
      const i = Math.floor(t / PH), a = t - i * PH;
      g.save(); g.beginPath(); g.roundRect(14, 14, 640, 558, 12); g.clip();
      let gapL = 302, gapR = i === 0 ? lerp(302, 398, ease(ph(a, .3, 1))) : i >= 2 ? 462 : 398;
      if (i >= 2) gapL = 302;
      ground(g, gapL, gapR);
      let mx = 120, my = GY, moving = false, jump = false;
      if (i === 0) { mx = lerp(80, 270, ph(a, 1, 2.4)); moving = a > 1 && a < 2.4; if (a > 2.5) text(g, '?', mx, GY - 70, { size: 34, w: 800, col: '#fff', stroke: 5, strokeCol: C.navy }); }
      if (i === 1) { const k = ph(a, .8, 2.2); mx = lerp(200, 470, k); moving = a > .8 && a < 2.4; my = GY - Math.sin(ph(a, 1.2, 1.9) * Math.PI) * 120; jump = a > 1.2 && a < 1.9; }
      if (i === 2) { const k = ph(a, .2, 2.4); mx = lerp(60, 560, k); moving = a > .2 && a < 2.4; my = GY - Math.sin(ph(a, .95, 1.75) * Math.PI) * 150; jump = a > .95 && a < 1.75; }
      if (i === 3) { mx = 180; }
      // a goomba to land on, from step 3
      if (i === 2) { const squash = a > 1.75; pic(g, squash ? 'smb-goomba-flat.png' : 'smb-goomba.png', 530, GY, 44, { px: true, bottom: true }); if (squash && a < 2.6) text(g, 'stomp!', 530, GY - 60, { size: 18, w: 800, col: '#fff', stroke: 5, strokeCol: C.navy }); }
      pic(g, jump ? 'smb-mario-jump.png' : moving ? frame(t) : 'smb-mario.png', mx, my, jump || moving ? 54 : 41, { px: true, bottom: true });
      g.restore();
      // the toolkit
      const tools = [['Jump', i >= 1, false], ['Running jump', i >= 2, false], ['Stomp', i >= 2, false], ['Fireball', i >= 2, i === 3 && a > .8]];
      card(g, 334, 74, 580, 70, { fill: 'rgba(255,250,240,.92)', edge: C.navy, shadow: false });
      text(g, 'Toolkit', 64, 74, { align: 'left', size: 14, w: 800, col: C.muted });
      let tx = 140; tools.forEach(([n, have, cut]) => { if (!have) return; const w = chip(g, n, tx, 74, { ...(cut ? TONE.red : TONE.green), size: 14, align: 'left' }); if (cut) { g.strokeStyle = C.redDk; g.lineWidth = 3; g.beginPath(); g.moveTo(tx - 4, 74); g.lineTo(tx + w + 4, 74); g.stroke(); } tx += w + 10; });
      if (i === 3 && a > 1.2) wrap(g, 'Nothing in this stretch needs a fireball, so it waits for a challenge that does.', 334, 132, 540, { size: 15, w: 700, lh: 19, align: 'center', col: '#fff' });
      // the loop
      panel(g, 666, 14, 360, 558, { title: 'Final bits of advice' });
      const cx = 846, cy = 240, R = 112;
      STEPS.forEach(([n, l], j) => {
        const an = -Math.PI / 2 + j * Math.PI / 2, x = cx + Math.cos(an) * R, y = cy + Math.sin(an) * R, on = j === i;
        const an2 = an + Math.PI / 2, x2 = cx + Math.cos(an2) * R, y2 = cy + Math.sin(an2) * R;
        arrow(g, [x, y], [x2, y2], on ? C.navy : '#b9b09a', 3, { pad0: 50, pad1: 50, bend: -34 });
        card(g, x, y, 130, 70, { fill: on ? '#fff3c4' : '#fffaf0', edge: on ? C.gold : '#cdbf9f', lw: on ? 4 : 2, shadow: false });
        text(g, String(j + 1), x - 54, y - 22, { size: 13, w: 800, col: C.muted });
        wrap(g, n, x, y - (n.length > 14 ? 9 : 0), 112, { size: 14, w: 800, align: 'center', lh: 17 });
      });
      text(g, `Step ${i + 1}`, cx, cy, { size: 20, w: 800, display: true, col: C.navy });
      card(g, cx, 446, 320, 70, { fill: '#fff3c4', edge: C.gold, lw: 2, shadow: false });
      wrap(g, STEPS[i][1], cx, 446 - (STEPS[i][1].length > 34 ? 9 : 0), 290, { size: 15, w: 700, lh: 19, align: 'center', col: C.navy });
      text(g, 'then again', cx, 548, { size: 13, col: C.muted, it: true });
    },
    side(t) { const i = Math.floor(t / PH); return { out: `<b>${i + 1}. ${STEPS[i][0]}.</b> ${STEPS[i][1]}.` }; },
  });

  // ---------- course map ----------
  const M = window.COURSE || [];
  const MGM = i => [120 + (i % 4) * 238, 330 + Math.floor(i / 4) * 92];
  function mview(t, st, tour) { if (!tour) return { open: st.open, hover: st.hover }; return { open: t < 3 ? -1 : Math.min(M.length - 1, Math.floor((t - 3) / 2.2)), hover: -1 }; }
  scene('course-map', {
    dur: 3 + M.length * 2.2 + 1,
    state: () => ({ open: M.length - 1, hover: -1 }),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => {
        if (type === 'down') {
          M.forEach((m, i) => { const [mx, my] = MGM(i); if (inBox(x, y, mx, my, 226, 80)) { api.manual(); st.open = i; } });
          const m = M[st.open]; if (m && !st.tour) m.pages.forEach((p, j) => { const [bx, by] = pagePos(j, m.pages.length); if (inBox(x, y, bx, by, 236, 26)) window.location.href = '../../' + p[0]; });
        }
      });
    },
    draw(g, t, st, tour) {
      const v = mview(t, st, tour), k = ease(ph(t, .2, 1.4));
      // the three stages
      const S = [[150, 'Stage 1', 'FPF', 'Diagnose the problem'], [520, 'Stage 2', 'Mastering Game Mechanics', 'Create solutions'], [890, 'Stage 3', 'Future course', 'Implementation']];
      S.forEach(([x, s, n, l], j) => {
        card(g, x, 92, 280, 96, { edge: j === 1 ? C.gold : '#cdbf9f', lw: j === 1 ? 4 : 2, fill: j === 1 ? '#fff3c4' : '#fffaf0' });
        text(g, s, x, 62, { size: 12, w: 800, col: C.muted }); text(g, n, x, 90, { size: j === 1 ? 16.5 : 20, w: 800, display: true }); text(g, l, x, 118, { size: 13, col: C.ink });
        if (j < 2) arrow(g, [x + 140, 92], [x + 230, 92], C.navy, 4, { a: k });
      });
      chip(g, 'Stage 2 · Level Design', 340, 168, { ...TONE.grey, size: 12.5 }); chip(g, 'Stage 2 · Narrative Design', 700, 168, { ...TONE.grey, size: 12.5 });
      text(g, 'beside it: Udemy / YouTube / Coursera', 520, 196, { size: 12, col: C.muted, it: true });
      // Mastering Game Mechanics, opened
      g.strokeStyle = C.gold; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(520, 140); g.lineTo(520, 236); g.stroke(); g.setLineDash([]);
      text(g, `This site: ${M.length} modules, ${M.reduce((s, m) => s + m.pages.length, 0)} pages`, 520, 254, { size: 15, w: 800, col: C.navy });
      M.forEach((m, i) => {
        const [x, y] = MGM(i), on = v.open === i, kk = ease(ph(t, .8 + i * .12, 1.2 + i * .12));
        card(g, x, y, 226, 80, { fill: on ? '#fff3c4' : '#fffaf0', edge: on ? C.gold : '#cdbf9f', lw: on ? 4 : 2, a: tour ? kk : 1, shadow: false });
        g.save(); g.globalAlpha = tour ? kk : 1;
        pic(g, '../../' + m.img, x - 84, y, 40);
        text(g, m.code, x - 56, y - 18, { align: 'left', size: 11, w: 800, col: C.muted });
        wrap(g, m.name, x - 56, y + (m.name.length > 20 ? -2 : 4), 160, { size: 14.5, w: 800, lh: 16 });
        text(g, `${m.pages.length} pages`, x + 104, y + 28, { align: 'right', size: 11, col: C.muted });
        g.restore();
      });
      const m = M[v.open];
      if (m) {
        const n = m.pages.length;
        card(g, 520, 520 + 0, 1000, 100, { fill: 'rgba(255,252,244,.96)', edge: C.navy, lw: 2, shadow: false, r: 10 });
        m.pages.forEach((p, j) => { const [x, y] = pagePos(j, n); chip(g, p[1], x, y, { ...TONE.blue, size: 12, width: 236 }); });
      }
    },
    side(t, st, tour) { const v = mview(t, st, tour), m = M[v.open]; return { out: m ? `<b>${m.name}</b> (${m.code}): ${m.pages.map(p => p[1]).join(', ')}.${tour ? '' : ' Click a page on the canvas to open it.'}` : 'FPF diagnoses the problem; Mastering Game Mechanics creates solutions; the next course implements them.' }; },
  });
  function pagePos(j, n) { const cols = 4, r = Math.floor(j / cols), c = j % cols, rows = Math.ceil(n / cols); return [146 + c * 248, 520 - (rows - 1) * 15 + r * 30]; }

  // ---------- framework kit ----------
  const KIT = [
    ['Ability card', 'Purpose · Payload · Packaging', (g, x, y) => { ['Purpose', 'Payload', 'Packaging'].forEach((n, j) => { chip(g, n, x - 70, y - 40 + j * 40, { ...[TONE.blue, TONE.gold, TONE.purple][j], size: 11, align: 'left' }); g.strokeStyle = '#cdbf9f'; g.beginPath(); g.moveTo(x - 70, y - 26 + j * 40); g.lineTo(x + 70, y - 26 + j * 40); g.stroke(); }); }],
    ['Creature card', 'Three archetypes, one body', (g, x, y) => { [-50, 0, 50].forEach(dx => { g.strokeStyle = '#cdbf9f'; g.setLineDash([4, 4]); g.lineWidth = 2; g.strokeRect(x + dx - 20, y - 40, 40, 50); g.setLineDash([]); }); text(g, '+  +  =', x, y + 30, { size: 14, w: 800, col: C.muted }); }],
    ['Nine fundamentals', 'Audit a moveset', (g, x, y) => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { g.strokeStyle = ['#d8463a', '#2f7fd6', '#8a4fd6'][r]; g.lineWidth = 2; g.strokeRect(x - 60 + c * 42, y - 52 + r * 36, 36, 30); } }],
    ['Counter circle', 'Offense · Defense · Prediction', (g, x, y) => { [[0, -40], [42, 30], [-42, 30]].forEach(([dx, dy], j) => { g.strokeStyle = ['#d8463a', '#8a4fd6', '#2f7fd6'][j]; g.lineWidth = 3; g.beginPath(); g.arc(x + dx, y + dy - 6, 18, 0, TAU); g.stroke(); }); }],
    ['Elemental diamond', 'Name four corners, two axes', (g, x, y) => { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 54); g.lineTo(x + 54, y); g.lineTo(x, y + 54); g.lineTo(x - 54, y); g.closePath(); g.stroke(); }],
    ['Design skeleton', 'Slots before content', (g, x, y) => { for (let r = 0; r < 5; r++) { g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.strokeRect(x - 66, y - 50 + r * 20, 40, 16); g.strokeRect(x - 22, y - 50 + r * 20, 88, 16); } }],
  ];
  scene('framework-kit', {
    dur: 9,
    draw(g, t) {
      KIT.forEach(([n, l, d], i) => {
        const tx = 190 + (i % 3) * 330, ty = 170 + Math.floor(i / 3) * 250, k = ease(ph(t, .3 + i * .35, .9 + i * .35));
        const x = lerp(520, tx, k), y = lerp(640, ty, k), rot = (1 - k) * (i % 2 ? .3 : -.3);
        g.save(); g.translate(x, y); g.rotate(rot);
        card(g, 0, 0, 290, 220, { edge: C.navy, lw: 3 });
        text(g, n, 0, -84, { size: 18, w: 800, display: true }); d(g, 0, 8); text(g, l, 0, 92, { size: 12.5, col: C.muted });
        g.restore();
      });
      if (t > 3) text(g, 'Blank and printable: plan your own game, or skills to mod into one.', 520, 560, { size: 16, w: 800, col: C.navy, a: ph(t, 3, 3.5) });
    },
    side() { return { out: 'Six blank frameworks from this module. Open the printable kit to print or save them as a PDF.' }; },
  });
})();
