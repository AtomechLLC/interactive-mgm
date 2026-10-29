/* The nine fundamentals of action games (MGM C4 M7, deck slides 242-255). The counter circle (offensive, defensive,
   predictive) times the co-op timing framework (before, during, post the event) gives nine cells; slides 246-254 define each
   with high-risk and low-risk examples. Three modes: explore a cell; audit a moveset, where each move lights its cell and the
   empty ones read "gap" (notes on 255: how the No Rest for the Wicked team found what a weapon class was missing); and a quiz
   where you place a move yourself. Definitions and examples are the deck's; the moveset tags are this page's reading. */
(function () {
  const { $, $$ } = FPF.kit;
  const { icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C;
  const ROWS = [['Offensive', '#e5736b', 'crossed-swords'], ['Defensive', '#6f93e0', 'checked-shield'], ['Predictive', '#62b77c', 'eye-target']];
  const COLS = [['Before', '#f2c94c'], ['During', '#f0954a'], ['Post', '#9b7fd6']];
  // [name, definition, high risk, low risk], row-major
  const CELLS = [
    ['Initiate', 'Pre-empting the opponent by performing an offensive, proactive action.', ['Charging', 'Gap Closing', 'Approaching'], ['Projectile Harassment']],
    ['Zone', 'Putting hitboxes out to influence what the opponent is doing and where they go.', ['Far-reaching Pokes', 'Crowd Control'], ['Resource-Limited Missiles', 'Placed AoE Zones']],
    ['Punish', 'Making use of an enemy mistake to land an attack that would otherwise not be possible or easy to avoid.', ['Slow Launchers', 'Super Moves', 'Charged Moves'], ['Quick Jabs', 'Far-reaching Pokes']],
    ['Mitigate', 'Proactively acting to prevent or reduce an incoming attack.', ['Retreat', 'Block', 'Super-Armor'], ['Distancing', 'Obstacle']],
    ['Reflex', 'Twitch-responses to an incoming attack in flight.', ['Perfect Block or Dodge', 'Parry', 'Deflecting'], ['Interrupt', 'Pushback', 'Disengage (Neutral Escape)']],
    ['React', 'Done in response to a situation, such as an enemy telegraph or an attack hitting you.', ['Tech Roll (Ukemi)', 'Lifesteal (Rally)'], ['Heal']],
    ['Setup', 'Performing an action to prepare before an exchange.', ['Empowerment', 'Attack Feint', 'Baiting'], ['Trap', 'AoE Totem-Base', 'Primer']],
    ['Counterplay', 'Observing the opponent’s patterns, reading when they will repeat, and countering them during the exchange.', ['Power Shield', 'Unblockable', 'Conditional Counters'], ['Block Break', 'Grab / Throw']],
    ['Response', 'Seeing how the opponent is playing and changing your own state to improve your situation.', ['Equipment Change', 'Switch Stance / Spell Swap', 'Toe-to-Toe Trade'], ['Elemental Enchant / Infuse', 'Revive']],
  ];
  const IDX = Object.fromEntries(CELLS.map((c, i) => [c[0], i]));
  // movesets: [move, icon ('gi:' glyph or image), cell, why]
  const KITS = [
    { name: 'Yasuo', game: 'League of Legends', art: 'lol-champ-Yasuo.png', moves: [
      ['Steel Tempest (Q)', 'lol-YasuoQ1Wrapper.png', 'Zone', 'a long thrust; the third cast knocks up'],
      ['Wind Wall (W)', 'lol-YasuoW.png', 'Reflex', 'catches projectiles in flight'],
      ['Sweeping Blade (E)', 'lol-YasuoE.png', 'Initiate', 'a dash through a unit to close the gap'],
      ['Last Breath (R)', 'lol-YasuoR.png', 'Punish', 'only on a target already knocked up'],
      ['Way of the Wanderer', 'lol-YasuoPassive.png', 'Mitigate', 'moving builds a shield before the hit'] ] },
    { name: 'Warrior', game: 'World of Warcraft Classic', art: 'wow-ability_warrior_savageblow.jpg', moves: [
      ['Charge', 'wow-ability_warrior_charge.jpg', 'Initiate', 'rush in and stun'],
      ['Hamstring', 'wow-ability_shockwave.jpg', 'Zone', 'a slow that keeps a runner in reach'],
      ['Overpower', 'wow-ability_meleedamage.jpg', 'Punish', 'only after the target dodges'],
      ['Shield Wall', 'wow-ability_warrior_shieldwall.jpg', 'Mitigate', 'less damage from what is coming'],
      ['Pummel', 'wow-inv_gauntlets_04.jpg', 'Reflex', 'interrupt a cast in progress'],
      ['Battle Shout', 'wow-ability_warrior_battleshout.jpg', 'Setup', 'empower before the fight'],
      ['Stance swap', 'wow-ability_warrior_defensivestance.jpg', 'Response', 'switch stance to fit the fight'] ] },
    { name: 'Knight', game: 'Dark Souls, sword and shield', art: 'gi:swordman', moves: [
      ['Running attack', 'gi:sprint', 'Initiate', 'approach with a hit'],
      ['Light and heavy attacks', 'gi:broadsword', 'Punish', 'hit the opening a whiff leaves'],
      ['Riposte', 'gi:pointy-sword', 'Punish', 'the free hit after a parry'],
      ['Raise shield', 'gi:round-shield', 'Mitigate', 'block before the blow lands'],
      ['Roll', 'gi:dodge', 'Reflex', 'i-frames through the swing'],
      ['Parry', 'gi:fencer', 'Reflex', 'catch the swing in a tight window'],
      ['Estus Flask', 'gi:potion-ball', 'React', 'heal after taking a hit'],
      ['Swap weapon', 'gi:crossed-swords', 'Response', 'change equipment to fit the foe'] ] },
  ];
  // quiz: [move, game, accepted cells, why]
  const QUIZ = [
    ['Stinger', 'Devil May Cry (Dante)', ['Initiate'], 'A rushing stab that opens the exchange: the deck’s own charging example.'],
    ['Deflect', 'Sekiro', ['Reflex'], 'A press timed to the blow in flight: Deflecting.'],
    ['Rally', 'Bloodborne', ['React'], 'Hit back right after taking damage to win health back: Lifesteal (Rally).'],
    ['Kick', 'Elden Ring', ['Counterplay'], 'Read an opponent who keeps blocking and break the guard: Block Break.'],
    ['Weapon buff', 'Dark Souls resin, Bloodborne paper', ['Setup', 'Response'], 'Both. Applied before an exchange it is Empowerment (Setup); swapped in after seeing what hurts them it is Elemental Enchant (Response).'],
    ['Throw', 'Street Fighter', ['Counterplay'], 'Beats a player who keeps blocking: Grab / Throw.'],
  ];
  const GX = c => 214 + c * 154, GY = r => 138 + r * 132, CW = 144, CH = 120;
  const DUR = 31;
  const TOUR = [[0, 'build'], [2.2, 'e', 0], [4.6, 'e', 2], [7, 'e', 4], [9.4, 'e', 7], [12, 'a', 0], [18.2, 'a', 1], [24.6, 'q', 2], [27.4, 'qa', 2]];

  function mode(t, st, tour) {
    if (!tour) return st;
    let i = 0; while (i + 1 < TOUR.length && t >= TOUR[i + 1][0]) i++;
    const s = TOUR[i], since = t - s[0];
    if (s[1] === 'build') return { mode: 'explore', sel: null, build: t / 2 };
    if (s[1] === 'e') return { mode: 'explore', sel: s[2], since };
    if (s[1] === 'a') return { mode: 'audit', kit: s[2], since };
    return { mode: 'quiz', q: s[2], answer: s[1] === 'qa' ? IDX[QUIZ[s[2]][2][0]] : null, since };
  }

  function cellArt(g, r, c, x, y, a = 1, lit = 0) {
    const w = CW, h = CH, x0 = x - w / 2, y0 = y - h / 2;
    g.save(); g.globalAlpha *= a;
    g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.save(); g.clip();
    g.fillStyle = ROWS[r][1]; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = COLS[c][1]; g.beginPath(); g.moveTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = `rgba(255,250,240,${.55 - .35 * lit})`; g.fillRect(x0, y0, w, h); g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.stroke();
    GI.draw(g, ROWS[r][2], x0 + 20, y0 + 20, 24, C.navy);
    text(g, COLS[c][0][0], x0 + w - 16, y0 + h - 16, { size: 18, w: 800, display: true, col: C.navy });
    g.restore();
  }
  const art = (g, a, x, y, s) => a.startsWith('gi:') ? (g.fillStyle = '#7a6a52', g.beginPath(), g.arc(x, y, s / 2, 0, Math.PI * 2), g.fill(), GI.draw(g, a.slice(3), x, y, s * .64, '#fff')) : icon(g, a, x, y, s, { lw: 2 });

  scene('nine-grid', {
    dur: DUR,
    state: () => ({ mode: 'explore', sel: 0, kit: 0, q: 0, answer: null, since: 9 }),
    init(s, st, api) {
      const take = () => { if (st.tour) api.manual(); st.since = 0; st.t = 0; };
      const box = $(s, '.ng-mode');
      box.innerHTML = `<button class="btn" data-m="explore">Explore</button>` + KITS.map((k, i) => `<button class="btn" data-m="audit" data-i="${i}">Audit: ${k.name}</button>`).join('') + `<button class="btn" data-m="quiz">Quiz: place a move</button>`;
      $$(box, '.btn').forEach(b => b.onclick = () => { take(); st.mode = b.dataset.m; if (b.dataset.i) st.kit = +b.dataset.i; if (st.mode === 'quiz') { st.q = (st.q + (st.answer != null ? 1 : 0)) % QUIZ.length; st.answer = null; } sync(); });
      function sync() { $$(box, '.btn').forEach(b => b.classList.toggle('on', b.dataset.m === st.mode && (st.mode !== 'audit' || +b.dataset.i === st.kit))); }
      st.sync = sync;
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (inBox(x, y, GX(c), GY(r), CW, CH)) {
          const i = r * 3 + c;
          if (st.tour) { api.manual(); st.mode = 'explore'; }
          if (st.mode === 'quiz') { if (st.answer == null) { st.answer = i; st.since = 0; } else { st.q = (st.q + 1) % QUIZ.length; st.answer = null; st.since = 0; } }
          else { st.mode = 'explore'; st.sel = i; st.since = 0; }
          sync();
        }
        if (st.mode === 'quiz' && st.answer != null && x > 600) { st.q = (st.q + 1) % QUIZ.length; st.answer = null; st.since = 0; }
      });
      sync();
    },
    draw(g, t, st, tour) {
      const m = mode(t, st, tour), since = tour ? m.since ?? 0 : t;
      const build = m.build ?? 9;
      // headers
      COLS.forEach(([n, col], c) => { const a = clamp(build * 3 - c * .4); text(g, n, GX(c), 46, { size: 20, w: 800, display: true, col: col === '#f2c94c' ? '#b88a10' : col, a }); });
      ROWS.forEach(([n, col], r) => { const a = clamp(build * 3 - r * .4); text(g, n, GX(0) - CW / 2 - 14, GY(r), { size: 18, w: 800, display: true, col, align: 'right', a }); });
      text(g, 'Counter circle  ×  timing', GX(1), 18, { size: 13, col: C.muted, a: clamp(build * 3) });
      // which cells light up
      const kit = m.mode === 'audit' ? KITS[m.kit] : null;
      const shown = kit ? kit.moves.filter((mv, i) => since >= .6 + i * .55) : [];
      const quizAns = m.mode === 'quiz' && m.answer != null ? QUIZ[m.q][2].map(n => IDX[n]) : [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const i = r * 3 + c, x = GX(c), y = GY(r), a = clamp(build * 2.2 - (r + c) * .25), pop = ease(a);
        const moves = shown.filter(mv => mv[2] === CELLS[i][0]);
        const lit = m.mode === 'explore' ? (m.sel === i ? 1 : 0) : kit ? (moves.length ? 1 : 0) : quizAns.includes(i) ? 1 : 0;
        g.save(); g.translate(x, y); g.scale(.8 + .2 * pop, .8 + .2 * pop); g.translate(-x, -y);
        if (lit) { g.fillStyle = 'rgba(253,214,99,.8)'; g.beginPath(); g.roundRect(x - CW / 2 - 7, y - CH / 2 - 7, CW + 14, CH + 14, 14); g.fill(); }
        cellArt(g, r, c, x, y, a, lit);
        text(g, CELLS[i][0], x, y - 4, { size: CELLS[i][0].length > 9 ? 16 : 19, w: 800, display: true, a });
        if (kit && moves.length) { const s = moves.length > 1 ? 30 : 34; moves.forEach((mv, j) => art(g, mv[1], x - (moves.length - 1) * 18 + j * 36, y + 28, s)); }
        if (kit && since > .6 + kit.moves.length * .55 + .2 && !moves.length) { text(g, 'gap', x, y + 28, { size: 17, w: 800, col: C.redDk, it: true }); }
        if (m.mode === 'quiz' && m.answer === i && !quizAns.includes(i)) { g.strokeStyle = C.red; g.lineWidth = 4; g.setLineDash([8, 6]); g.beginPath(); g.roundRect(x - CW / 2 - 5, y - CH / 2 - 5, CW + 10, CH + 10, 12); g.stroke(); g.setLineDash([]); }
        g.restore();
      }
      text(g, m.mode === 'explore' ? 'Click a cell to read it' : m.mode === 'audit' ? 'Each move lights the cell it belongs to' : 'Click the cell this move belongs to', GX(1), 560, { size: 14, col: C.muted, a: clamp(build * 3 - 1) });
      // the right-hand panel
      const P = 650, PW = 376;
      if (m.mode === 'explore' && m.sel != null) {
        const [n, def, hi, lo] = CELLS[m.sel], r = Math.floor(m.sel / 3), c = m.sel % 3;
        panel(g, P, 14, PW, 558);
        g.save(); g.translate(P + 60, 76); g.scale(.62, .62); g.translate(-(P + 60), -76); cellArt(g, r, c, P + 60, 76, 1, 0); g.restore();
        text(g, n, P + 132, 62, { align: 'left', size: 28, w: 800, display: true });
        chip(g, `${ROWS[r][0]} · ${COLS[c][0]}`, P + 132, 94, { ...TONE.grey, size: 12.5, align: 'left' });
        wrap(g, def, P + 22, 158, PW - 44, { size: 16, w: 600, lh: 21 });
        const y0 = 270;
        g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(P + 22, y0 + 14); g.lineTo(P + PW - 22, y0 + 14); g.moveTo(P + PW / 2, y0 - 10); g.lineTo(P + PW / 2, y0 + 160); g.stroke();
        text(g, 'High Risk', P + PW / 4 + 6, y0, { size: 15, w: 800, display: true, col: C.redDk });
        text(g, 'Low Risk', P + PW * 3 / 4 - 6, y0, { size: 15, w: 800, display: true, col: C.good });
        hi.forEach((e, j) => wrap(g, e, P + 24, y0 + 40 + j * 40, PW / 2 - 36, { size: 14, w: 600, lh: 16 }));
        lo.forEach((e, j) => wrap(g, e, P + PW / 2 + 14, y0 + 40 + j * 40, PW / 2 - 36, { size: 14, w: 600, lh: 16 }));
        wrap(g, 'Riskier moves pay off more and cost more when they miss.', P + 22, 520, PW - 44, { size: 13, col: C.muted, it: true });
      } else if (m.mode === 'explore') {
        panel(g, P, 14, PW, 558, { fill: 'rgba(255,252,244,.4)' });
        wrap(g, 'Every action combat mechanic falls into at least one of these nine cells. Offensive moves progress you toward winning; defensive moves stop them progressing; predictive moves bet on what comes next.', P + 22, 200, PW - 44, { size: 16, lh: 22, col: C.ink, a: clamp(build - 1) });
      } else if (kit) {
        panel(g, P, 14, PW, 558);
        art(g, kit.art, P + 46, 62, 56);
        text(g, kit.name, P + 86, 50, { align: 'left', size: 24, w: 800, display: true });
        text(g, kit.game, P + 86, 76, { align: 'left', size: 13.5, col: C.muted });
        kit.moves.forEach((mv, j) => {
          const a = clamp((since - .6 - j * .55) / .3), y = 124 + j * 50;
          g.save(); g.globalAlpha = a;
          art(g, mv[1], P + 40, y, 36);
          text(g, mv[0], P + 66, y - 9, { align: 'left', size: 14.5, w: 800 });
          text(g, mv[3], P + 66, y + 10, { align: 'left', size: 12, col: C.muted });
          chip(g, mv[2], P + PW - 110, y, { ...TONE.gold, size: 12, width: 92, align: 'left' });
          g.restore();
        });
        const gaps = CELLS.map(c => c[0]).filter(n => !kit.moves.some(mv => mv[2] === n));
        const ga = clamp((since - .6 - kit.moves.length * .55 - .2) / .4);
        wrap(g, `Gaps: ${gaps.join(', ')}. A gap is a question for the design: does this kit need one?`, P + 22, 532, PW - 44, { size: 14, w: 700, col: C.redDk, lh: 18, a: ga });
      } else {
        const [n, game, ok, why] = QUIZ[m.q];
        panel(g, P, 14, PW, 558);
        text(g, 'Where does this move go?', P + PW / 2, 52, { size: 16, w: 700, col: C.muted });
        card(g, P + PW / 2, 150, PW - 60, 120, { edge: C.navy });
        text(g, n, P + PW / 2, 132, { size: 30, w: 800, display: true });
        text(g, game, P + PW / 2, 170, { size: 15, col: C.muted });
        if (m.answer != null) {
          const right = ok.includes(CELLS[m.answer][0]);
          text(g, tour ? ok.join(' or ') : right ? `Yes: ${CELLS[m.answer][0]}` : `Not ${CELLS[m.answer][0]}: ${ok.join(' or ')}`, P + PW / 2, 262, { size: 24, w: 800, display: true, col: right || tour ? C.good : C.redDk });
          wrap(g, why, P + 24, 304, PW - 48, { size: 15, lh: 20 });
          if (!tour) text(g, 'Click here for the next move', P + PW / 2, 540, { size: 13, col: C.muted });
        }
      }
      st.sync?.();
    },
    side(t, st, tour) {
      const m = mode(t, st, tour);
      let out = 'Two frameworks multiplied: what you do (offensive, defensive, predictive) by when you do it (before, during, after the event).';
      if (m.mode === 'explore' && m.sel != null) out = `<b>${CELLS[m.sel][0]}</b>: ${CELLS[m.sel][1]}`;
      if (m.mode === 'audit') { const k = KITS[m.kit], gaps = CELLS.filter(c => !k.moves.some(mv => mv[2] === c[0])).map(c => c[0]); out = `<b>${k.name}</b> covers ${9 - gaps.length} of 9 cells. Gaps: ${gaps.join(', ')}. The No Rest for the Wicked team used the grid this way to find what a weapon or enemy class was missing.`; }
      if (m.mode === 'quiz') out = m.answer == null ? `Where does <b>${QUIZ[m.q][0]}</b> (${QUIZ[m.q][1]}) go? Click a cell.` : QUIZ[m.q][3];
      const stats = m.mode === 'audit' ? `<div class="g"><b>${9 - CELLS.filter(c => !KITS[m.kit].moves.some(mv => mv[2] === c[0])).length}</b><span>cells covered</span></div><div class="r"><b>${CELLS.filter(c => !KITS[m.kit].moves.some(mv => mv[2] === c[0])).length}</b><span>gaps</span></div>` : '';
      return { stats, out };
    },
  });
})();
