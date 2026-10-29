/* Stretch: build a boss, then audit the kit that has to beat it (MGM C4 M7: archetypes, slides 155-173, and the nine
   fundamentals, slides 242-255). Slide 266 says to create the challenges first, then the tools for overcoming them; here the
   challenge is a boss made of up to three archetypes and the tools are up to four moves. Each archetype asks for the two
   cells of the nine that its answer uses (the answers are the deck's, from arch.js); each move fills one cell. The audit
   shows which asks the kit answers and which are gaps. Which cells an answer uses is this page's reading. */
(function () {
  const { $, $$ } = FPF.kit;
  const { text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C;
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const A = Object.assign({}, (window.ARCH || {}).ARCH, {
    grappler: { name: 'Grappler', gi: 'grab', col: '#8a5a2a', counter: 'Sidestep the reach, punish the miss' },
  });
  const KEYS = ['flailer', 'fighter', 'brute', 'sweeper', 'grappler', 'rampager', 'defender', 'evader', 'healer'];
  const CELL = ['Initiate', 'Zone', 'Punish', 'Mitigate', 'Reflex', 'React', 'Setup', 'Counterplay', 'Response'];
  const ROWS = [['Offensive', '#d8463a'], ['Defensive', '#2f7fd6'], ['Predictive', '#2f9a5a']], COLS = ['Before', 'During', 'Post'];
  // the cells each archetype's answer uses
  const ASK = {
    flailer: ['Mitigate', 'Punish'], fighter: ['Zone', 'Reflex'], brute: ['Reflex', 'Punish'], sweeper: ['Mitigate', 'Initiate'],
    grappler: ['Reflex', 'Punish'], rampager: ['Mitigate', 'Punish'], defender: ['Counterplay', 'Initiate'], evader: ['Setup', 'Punish'],
    healer: ['Initiate', 'Zone'],
  };
  // one move per cell: [name, glyph]
  const MOVE = {
    Initiate: ['Charge in', 'sprint'], Zone: ['Long poke', 'spear-hook'], Punish: ['Heavy strike', 'warhammer'],
    Mitigate: ['Block', 'round-shield'], Reflex: ['Dodge roll', 'dodging'], React: ['Healing flask', 'round-potion'],
    Setup: ['Feint', 'trap-mask'], Counterplay: ['Guard break', 'shield-bash'], Response: ['Stance swap', 'cycle'],
  };
  const MAXB = 3, MAXK = 4;
  // the walk-through: [time, 'b' boss or 'k' kit, key, on]
  const TOUR = [[.6, 'b', 'defender', 1], [1.2, 'b', 'healer', 1], [1.8, 'b', 'brute', 1],
    [3.6, 'k', 'Mitigate', 1], [4.2, 'k', 'Punish', 1], [4.8, 'k', 'Reflex', 1], [7.4, 'k', 'Counterplay', 1],
    [10.4, 'b', 'healer', 0], [11, 'b', 'flailer', 1]];
  const DUR = 15;
  const SAY = [[0, 'Create the challenge first: a Paladin-style boss of Defender, Zone Healer and Brute (slide 171).'],
    [3.2, 'Then the tools. Three moves answer the Brute, and nothing yet reaches the Defender or the Healer.'],
    [7.2, 'A Guard break gets through the shield. The kit is full at four, and two asks are still open.'],
    [10.2, 'So change the challenge instead: swap the Healer for a Flailer, which this kit already answers.']];
  function replay(t) { const b = [], k = []; TOUR.forEach(([at, w, key, on]) => { if (t < at) return; const s = w === 'b' ? b : k; on ? s.push(key) : s.splice(s.indexOf(key), 1); }); return { boss: b, kit: k }; }
  const view = (t, st, tour) => tour ? replay(t) : st;
  function audit(v) {
    return CELL.map(c => { const by = v.boss.filter(b => ASK[b].includes(c)), have = v.kit.includes(c); return { c, by, have, s: by.length ? (have ? 'answered' : 'gap') : have ? 'spare' : '' }; });
  }

  const BX = i => 74 + (i % 3) * 110, BY = i => 112 + Math.floor(i / 3) * 84;
  const KX = i => 418 + (i % 3) * 104, KY = i => 112 + Math.floor(i / 3) * 84;
  const GX = c => 768 + c * 94, GY = r => 128 + r * 102;
  scene('boss-fight', {
    dur: DUR,
    state: () => replay(DUR),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        KEYS.forEach((key, i) => { if (!inBox(x, y, BX(i), BY(i), 100, 76)) return; api.manual(); const j = st.boss.indexOf(key); if (j >= 0) st.boss.splice(j, 1); else if (st.boss.length < MAXB) st.boss.push(key); });
        CELL.forEach((c, i) => { if (!inBox(x, y, KX(i), KY(i), 96, 76)) return; api.manual(); const j = st.kit.indexOf(c); if (j >= 0) st.kit.splice(j, 1); else if (st.kit.length < MAXK) st.kit.push(c); });
      });
      $(s, '.bf-clear').onclick = () => { api.manual(); st.boss = []; st.kit = []; };
      $(s, '.bf-deal').onclick = () => {
        api.manual(); const pick = (arr, n) => arr.slice().sort(() => Math.random() - .5).slice(0, n);
        st.boss = pick(KEYS, 3); st.kit = pick(CELL, 4);
      };
    },
    draw(g, t, st, tour) {
      const v = view(t, st, tour), au = audit(v);
      // the boss
      panel(g, 14, 14, 340, 558, { title: `The challenge · ${v.boss.length}/${MAXB} archetypes` });
      KEYS.forEach((key, i) => {
        const a = A[key], on = v.boss.includes(key), x = BX(i), y = BY(i);
        card(g, x, y, 100, 76, { fill: on ? '#fff3c4' : '#fffaf0', edge: on ? C.gold : '#cdbf9f', lw: on ? 4 : 2, shadow: false, r: 10 });
        GI.draw(g, a.gi, x, y - 10, 34, on ? a.col : '#b9b09a');
        text(g, a.name, x, y + 24, { size: 12.5, w: 800, col: on ? C.ink : C.muted });
      });
      card(g, 184, 444, 310, 196, { edge: C.navy, lw: 3, fill: '#fffaf0' });
      text(g, v.boss.length ? 'Your boss' : 'Pick up to three archetypes', 184, 368, { size: 15, w: 800, display: true, col: C.navy });
      v.boss.forEach((key, j) => {
        const a = A[key], y = 404 + j * 50;
        GI.draw(g, a.gi, 60, y, 30, a.col);
        text(g, a.name, 84, y - 9, { align: 'left', size: 14, w: 800 });
        text(g, a.counter, 84, y + 10, { align: 'left', size: 11.5, col: C.muted });
      });
      // the kit
      panel(g, 364, 14, 314, 558, { title: `Your tools · ${v.kit.length}/${MAXK} moves` });
      CELL.forEach((c, i) => {
        const [n, gi] = MOVE[c], on = v.kit.includes(c), x = KX(i), y = KY(i), row = ROWS[Math.floor(i / 3)][1];
        card(g, x, y, 96, 76, { fill: on ? '#eef6ff' : '#fffaf0', edge: on ? row : '#cdbf9f', lw: on ? 4 : 2, shadow: false, r: 10 });
        GI.draw(g, gi, x, y - 12, 32, on ? row : '#b9b09a');
        text(g, n, x, y + 18, { size: 12.5, w: 800, col: on ? C.ink : C.muted });
        text(g, c, x, y + 32, { size: 10, col: C.muted });
      });
      const gaps = au.filter(a => a.s === 'gap'), ans = au.filter(a => a.s === 'answered');
      card(g, 521, 444, 290, 196, { edge: C.navy, lw: 3, fill: '#fffaf0' });
      text(g, 'Audit', 521, 368, { size: 15, w: 800, display: true, col: C.navy });
      const line = !v.boss.length ? 'Build the challenge first; then pick the tools it calls for.'
        : !v.kit.length ? `The boss asks for ${au.filter(a => a.by.length).length} cells. Pick up to four moves.`
        : gaps.length ? `${ans.length} ask${ans.length === 1 ? '' : 's'} answered, ${gaps.length} gap${gaps.length === 1 ? '' : 's'}: ${gaps.map(a => a.c).join(', ')}.`
        : 'Every ask is answered.';
      wrap(g, line, 521, 394, 260, { size: 14, w: 700, lh: 18, align: 'center' });
      gaps.slice(0, 3).forEach((a, j) => text(g, `${a.by.map(b => A[b].name).join(' & ')} → ${a.c}`, 521, 470 + j * 22, { size: 12.5, col: C.redDk, w: 700 }));
      const spare = au.filter(a => a.s === 'spare');
      if (spare.length) text(g, `Spare: ${spare.map(a => MOVE[a.c][0]).join(', ')}`, 521, 528, { size: 12, col: C.muted, it: true });
      // the nine
      panel(g, 688, 14, 338, 558, { title: 'The nine, asked vs covered' });
      COLS.forEach((c, j) => text(g, c, GX(j), 62, { size: 12.5, w: 800, col: C.muted }));
      ROWS.forEach(([r, col], i) => { g.save(); g.translate(712, GY(i)); g.rotate(-Math.PI / 2); text(g, r, 0, 0, { size: 11.5, w: 800, col }); g.restore(); });
      au.forEach((a, i) => {
        const x = GX(i % 3), y = GY(Math.floor(i / 3)), k = a.s;
        const tone = k === 'answered' ? TONE.green : k === 'gap' ? TONE.red : k === 'spare' ? TONE.grey : { fill: '#fffaf0', edge: '#e2d8c0' };
        card(g, x, y, 86, 92, { fill: tone.fill, edge: tone.edge, lw: k === 'gap' ? 4 : 2, shadow: false, r: 9 });
        text(g, a.c, x, y - 32, { size: 12, w: 800, col: k ? tone.col : C.muted });
        a.by.forEach((b, j) => GI.draw(g, A[b].gi, x - (a.by.length - 1) * 12 + j * 24, y - 6, 20, A[b].col));
        if (a.have) GI.draw(g, MOVE[a.c][1], x, y + 20, 18, C.navy);
        if (k) text(g, k, x, y + 38, { size: 10.5, w: 800, col: tone.col });
      });
      text(g, 'icons above: who asks · below: your move', 857, 452, { size: 11.5, col: C.muted, it: true });
      const legend = [['answered', TONE.green], ['gap', TONE.red], ['spare', TONE.grey]];
      let lx = 724; legend.forEach(([n, tn]) => { lx += chip(g, n, lx, 486, { ...tn, size: 12, align: 'left' }) + 8; });
      if (tour) { const s = SAY.filter(s => t >= s[0]).pop(); wrap(g, s[1], 857, 520, 300, { size: 12.5, w: 700, lh: 16, align: 'center', col: C.navy }); }
    },
    side(t, st, tour) {
      const v = view(t, st, tour), au = audit(v), gaps = au.filter(a => a.s === 'gap');
      const s = SAY.filter(s => t >= s[0]).pop();
      return {
        stats: `<div><b>${v.boss.length}/${MAXB}</b><span>archetypes</span></div><div><b>${v.kit.length}/${MAXK}</b><span>moves</span></div><div class="${gaps.length ? 'r' : 'g'}"><b>${gaps.length}</b><span>gaps</span></div>`,
        out: tour ? s[1] : v.boss.length ? (gaps.length ? `Gaps: ${gaps.map(a => `${a.c} (asked by ${a.by.map(b => A[b].name).join(' and ')})`).join('; ')}. Add a move, or change the boss.` : 'The kit answers everything this boss asks.') : 'Click archetypes on the left to build a boss.',
      };
    },
  });
})();
