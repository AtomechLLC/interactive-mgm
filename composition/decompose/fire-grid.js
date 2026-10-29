/* One element, four targets (MGM C4 M7, deck slides 37, 40 and 73). The deck's Source x Target framework: the source is the
   caster (Self), and changing only the target turns one element into four abilities. Slide 37 recalls the Super Star as
   Self -> Self (empowerment); slide 40 fills the fire row (Hellfire, Fireball, Cauterize, Pool of Flames); slide 73 turns a
   heal on an ally into a bandage on yourself. Empty cells stay empty on purpose: they are design prompts.
   Icons are World of Warcraft spell icons; the names are the deck's. */
(function () {
  const { $$ } = FPF.kit;
  const { pic, icon, text, wrap, card, chip, TONE, timeline, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C;
  const COLS = [['self', 'Self'], ['enemy', 'Enemy'], ['ally', 'Ally'], ['env', 'Environment']];
  // [element, colour, game-icons glyph, cells by target: [name, wow icon, line] or [null, prompt]]
  const ROWS = [
    ['Fire', '#e5622d', 'flame', {
      self: ['Hellfire', 'spell_fire_incinerate', 'Burns all around you, you too'],
      enemy: ['Fireball', 'spell_fire_flamebolt', 'A bolt of fire at one foe'],
      ally: ['Cauterize', 'spell_fire_rune', 'Fire that seals an ally’s wounds'],
      env: ['Pool of Flames', 'spell_fire_selfdestruct', 'Sets the ground alight'] }],
    ['Frost', '#2f8fd6', 'frozen-orb', {
      self: ['Frost Armor', 'spell_frost_frostarmor02', 'Slows whoever hits you'],
      enemy: ['Frostbolt', 'spell_frost_frostbolt02', 'Damages and slows one foe'],
      ally: [null, 'Frost on an ally: an ice block that saves them?'],
      env: ['Blizzard', 'spell_frost_icestorm', 'Slows a whole crowd'] }],
    ['Heal', '#2fae63', 'health-increase', {
      self: ['Bandage', 'inv_misc_bandage_15', 'The heal, aimed at yourself'],
      enemy: [null, 'Healing an enemy: when would you want that?'],
      ally: ['Heal', 'spell_holy_heal', 'Heal an ally'],
      env: ['Healing Rain', 'spell_nature_giftofthewaterspirit', 'Heals all who stand in it'] }],
  ];
  const CX = [300, 490, 680, 870], RY = [238, 356, 474], CWD = 176, CHT = 104;
  const STEPS = [[0, 'star'], [2.6, 'fire'], [6.4, 'frost'], [9.6, 'heal'], [12.8, 'prompts'], [17, 'end']];
  const DUR = 17.5;
  const cellAt = (r, c, t) => { const k = ['fire', 'frost', 'heal'][r]; return [STEPS.find(s => s[1] === k)[0] + .35 + c * .55, k]; };

  function targetGlyph(g, k, x, y) {
    TD.use(g);
    if (k === 'self') TD.player(x, y, -Math.PI / 2, .7);
    if (k === 'enemy') TD.foe(x, y, 13, Math.PI / 2);
    if (k === 'ally') TD.player(x, y, -Math.PI / 2, .7, 1, C.p2);
    if (k === 'env') { g.fillStyle = C.floor; g.strokeStyle = C.floorLn; g.lineWidth = 2; g.beginPath(); g.roundRect(x - 22, y - 12, 44, 24, 4); g.fill(); g.stroke(); g.strokeStyle = '#b8a984'; g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x + 22, y); g.moveTo(x, y - 12); g.lineTo(x, y); g.moveTo(x - 11, y); g.lineTo(x - 11, y + 12); g.moveTo(x + 11, y); g.lineTo(x + 11, y + 12); g.stroke(); }
  }
  function cell(g, r, c, a, o = {}) {
    const [, col] = ROWS[r], cl = ROWS[r][3][COLS[c][0]], x = CX[c], y = RY[r];
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * -16);
    if (cl[0]) {
      card(g, x, y, CWD, CHT, { edge: o.sel ? C.navy : col, lw: o.sel ? 4 : 3 });
      icon(g, `wow-${cl[1]}.jpg`, x - 52, y - 8, 54);
      text(g, cl[0], x - 18, y - 22, { align: 'left', size: cl[0].length > 12 ? 12.5 : cl[0].length > 10 ? 15 : 16, w: 800, display: true });
      wrap(g, cl[2], x - 18, y + 2, 96, { size: 12, col: C.muted, lh: 14 });
    } else {
      const pulse = o.pulse ? .5 + .5 * Math.sin(o.pulse * 5) : 0;
      card(g, x, y, CWD, CHT, { edge: o.sel ? C.navy : '#b9b09a', dash: [8, 6], fill: `rgba(253,233,184,${.25 + .45 * pulse})`, shadow: false, lw: o.sel ? 4 : 3 });
      text(g, '?', x, y - 22, { size: 30, w: 800, display: true, col: C.goldInk });
      wrap(g, cl[1], x, y + 8, CWD - 24, { size: 12.5, col: C.ink, align: 'center', lh: 15 });
    }
    g.restore();
  }

  scene('fire-grid', {
    dur: DUR,
    state: () => ({ rows: 3, sel: null }),
    init(s, st, api) {
      $$(s, '.fg-rows .btn').forEach(b => b.onclick = () => { api.manual(); st.rows = +b.dataset.n; st.sel = null; });
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (inBox(x, y, CX[c], RY[r], CWD, CHT)) { api.manual(); st.rows = Math.max(st.rows, r + 1); st.sel = [r, c]; }
      });
      st.sync = () => $$(s, '.fg-rows .btn').forEach(b => b.classList.toggle('on', +b.dataset.n === st.rows));
    },
    draw(g, t, st, tour) {
      const L = timeline(STEPS, t);
      // the Super Star: Self -> Self, the slide 37 reminder
      const starA = tour ? L.in('star', .5) : 1;
      g.save(); g.globalAlpha = starA;
      panel(g, 20, 14, 300, 92);
      pic(g, 'smb-star.png', 60, 60, 44, { px: true, rot: Math.sin(t * 4) * .12 });
      text(g, 'Super Star', 96, 42, { align: 'left', size: 16, w: 800, display: true });
      text(g, 'Source: Self  →  Target: Self', 96, 64, { align: 'left', size: 13.5, col: C.ink });
      text(g, 'Empowerment, for a while', 96, 84, { align: 'left', size: 13, col: C.muted });
      g.restore();
      text(g, 'Source: Self (the caster). Change only the target.', 680, 40, { size: 17, w: 700, col: C.navy, a: tour ? L.in('fire') : 1 });
      // headers
      const hA = tour ? L.in('fire') : 1;
      g.save(); g.globalAlpha = hA;
      text(g, 'Target →', 120, 150, { size: 14, w: 700, col: C.muted });
      COLS.forEach(([k, n], c) => { targetGlyph(g, k, CX[c] - (k === 'env' ? 62 : 40), 150); text(g, n, CX[c] - (k === 'env' ? 32 : 16), 151, { align: 'left', size: 16, w: 800, display: true }); });
      g.restore();
      ROWS.forEach(([n, col, gi], r) => {
        const on = tour ? L.on(['fire', 'frost', 'heal'][r]) : r < st.rows; if (!on) return;
        const a = tour ? L.in(['fire', 'frost', 'heal'][r], .4) : 1;
        g.save(); g.globalAlpha = a;
        card(g, 120, RY[r], 150, CHT, { fill: col, edge: col, shadow: false });
        GI.draw(g, gi, 80, RY[r], 46, '#fff');
        text(g, n, 140, RY[r], { size: 20, w: 800, display: true, col: '#fff', align: 'left' });
        g.restore();
        for (let c = 0; c < 4; c++) {
          const ca = tour ? ease(clamp((t - cellAt(r, c)[0]) / .4)) : 1;
          const empty = !ROWS[r][3][COLS[c][0]][0];
          cell(g, r, c, ca, { sel: st.sel && st.sel[0] === r && st.sel[1] === c && !tour, pulse: empty && (tour ? L.on('prompts') : true) ? t : 0 });
        }
      });
      if (tour && L.on('heal') && !L.on('prompts')) {
        const k = L.in('heal', .6);
        TD.use(g); text(g, '“Heal an ally” with the target changed to self becomes “Bandage yourself”', 520, 556, { size: 15, w: 600, col: C.good, a: k });
      }
      if (tour && L.on('prompts')) text(g, 'Empty cells are not mistakes. Each one is a design prompt.', 520, 556, { size: 17, w: 700, col: C.goldInk, a: L.in('prompts') });
      st.sync?.();
    },
    side(t, st, tour) {
      const L = timeline(STEPS, t);
      const shown = tour ? (L.on('heal') ? 3 : L.on('frost') ? 2 : L.on('fire') ? 1 : 0) : st.rows;
      const filled = ROWS.slice(0, shown).reduce((n, r) => n + Object.values(r[3]).filter(c => c[0]).length, 0);
      const open = shown * 4 - filled;
      const stats = `<div class="g"><b>${filled}</b><span>abilities from ${shown || 1} element${shown > 1 ? 's' : ''} and 4 targets</span></div><div class="y"><b>${open}</b><span>open cells to design into</span></div>`;
      let out = 'Keep the element, change the target, and you have a new ability. The fire row is the deck’s workshop exercise.';
      if (!tour && st.sel) { const [r, c] = st.sel, cl = ROWS[r][3][COLS[c][0]]; out = cl[0] ? `<b>${cl[0]}</b> (${ROWS[r][0]}, Self → ${COLS[c][1]}): ${cl[2]}.` : `<b>${ROWS[r][0]}, Self → ${COLS[c][1]}</b> is empty. ${cl[1]}`; }
      return { stats, out };
    },
  });
})();
