/* Keyword coverage map (MGM C4 M7, deck slides 66-72). Notes on 71: over time "we can clearly see which keywords are exposed
   to game content… where we have used our game features effectively… and where maybe we could repurpose some." Abilities are
   rows, keywords are columns, and the content on the right switches on and off. A column lights when an ability carries the
   keyword and something in the content responds to it; otherwise it says which half is missing. Data from forge-data.js. */
(function () {
  const { $$ } = FPF.kit;
  const { icon, text, chip, TONE, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C, F = window.FORGE;
  const ABIL = [['Fireball', 'wow-spell_fire_flamebolt.jpg', ['Burn']], ['Lightning Bolt', 'wow-spell_nature_lightning.jpg', ['Shock']], ['Healing Wave', 'wow-spell_nature_healingwavegreater.jpg', ['Heal']],
    ...F.PRESETS.map(p => [p.name, F.PACKS[p.pack].icon, p.keys])];
  const KEYS = F.KEYWORDS.map(k => k[0]);
  const KX = i => 232 + i * 41, RY = i => 152 + i * 50, TY = i => 62 + i * 62;
  const DUR = 20;
  const ORDER = ['demon', 'mage', 'bridge', 'gate', 'hall', 'field', 'ally', 'brazier'];

  function onSet(t, st, tour) {
    if (!tour) return st.on;
    const n = clamp(Math.floor((t - 1) / 1.8), 0, ORDER.length);
    return t < 1 ? [] : ORDER.slice(0, n + 1);
  }
  function status(k, on) {
    const carried = ABIL.some(a => a[2].includes(k)), responds = F.THINGS.some(th => on.includes(th.k) && th.rules[k]);
    return carried && responds ? 'live' : carried ? 'unused' : responds ? 'waiting' : 'idle';
  }

  scene('coverage', {
    dur: DUR,
    state: () => ({ on: ['demon', 'mage'] }),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        F.THINGS.forEach((th, i) => { if (inBox(x, y, 864, TY(i) + 20, 300, 54)) { if (st.tour) { api.manual(); st.on = onSet(st.t, st, true); } st.on = st.on.includes(th.k) ? st.on.filter(q => q !== th.k) : [...st.on, th.k]; } });
      });
      $$(s, '.cv-all .btn').forEach(b => b.onclick = () => { api.manual(); st.on = b.dataset.v === 'all' ? F.THINGS.map(th => th.k) : []; });
    },
    draw(g, t, st, tour) {
      const on = onSet(t, st, tour);
      panel(g, 14, 14, 676, 558, { title: 'Abilities × keywords' });
      KEYS.forEach((k, i) => {
        const s = status(k, on), x = KX(i);
        const fill = s === 'live' ? 'rgba(253,214,99,.55)' : s === 'waiting' ? 'rgba(111,147,224,.18)' : 'rgba(0,0,0,0)';
        g.fillStyle = fill; g.beginPath(); g.roundRect(x - 19, 50, 38, 420, 8); g.fill();
        g.save(); g.translate(x + 4, 116); g.rotate(-Math.PI / 2.6); text(g, k, 0, 0, { size: 13.5, w: 800, align: 'left', col: s === 'live' ? C.goldInk : C.ink }); g.restore();
        const lab = { live: ['in use', C.good], unused: ['unused', C.redDk], waiting: ['no ability', C.blue], idle: ['–', C.muted] }[s];
        g.save(); g.translate(x + 4, 486); g.rotate(Math.PI / 2.6); text(g, lab[0], 0, 0, { size: 12, w: 800, align: 'left', col: lab[1] }); g.restore();
      });
      ABIL.forEach(([n, ic, ks], r) => {
        icon(g, ic, 36, RY(r), 30, { lw: 2 });
        text(g, n, 58, RY(r), { align: 'left', size: 13.5, w: 800 });
        KEYS.forEach((k, i) => {
          if (!ks.includes(k)) { g.fillStyle = 'rgba(150,140,115,.25)'; g.beginPath(); g.arc(KX(i), RY(r), 3, 0, Math.PI * 2); g.fill(); return; }
          const live = status(k, on) === 'live';
          g.fillStyle = live ? C.gold : '#fffaf0'; g.strokeStyle = live ? C.goldInk : C.redDk; g.lineWidth = 3; g.beginPath(); g.arc(KX(i), RY(r), 11, 0, Math.PI * 2); g.fill(); g.stroke();
        });
      });
      panel(g, 702, 14, 324, 558, { title: 'Content in the game' });
      F.THINGS.forEach((th, i) => {
        const y = TY(i), act = on.includes(th.k), k = tour && act && ORDER.indexOf(th.k) === on.length - 1 ? ease(clamp(((t - 1) % 1.8) / .4)) : 1;
        g.save(); g.globalAlpha = act ? .4 + .6 * k : .45;
        CK.card(g, 864, y + 20, 300, 54, { edge: act ? C.navy : '#cdbf9f', lw: act ? 3 : 2, dash: act ? [] : [6, 5], shadow: act });
        if (th.icon) icon(g, th.icon, 736, y + 20, 34, { lw: 2, grey: !act }); else { g.fillStyle = act ? th.col : '#b9b09a'; g.beginPath(); g.arc(736, y + 20, 17, 0, Math.PI * 2); g.fill(); GI.draw(g, th.gi, 736, y + 20, 22, '#fff'); }
        text(g, th.name, 762, y + 10, { align: 'left', size: 14, w: 800 });
        text(g, Object.keys(th.rules).map(r => `[${r}]`).join(' '), 762, y + 30, { align: 'left', size: 11.5, col: C.muted });
        g.restore();
      });
    },
    side(t, st, tour) {
      const on = onSet(t, st, tour), n = s => KEYS.filter(k => status(k, on) === s);
      const stats = `<div class="g"><b>${n('live').length}</b><span>keywords in use</span></div><div class="r"><b>${n('unused').length}</b><span>carried by an ability, nothing responds</span></div><div><b>${n('waiting').length}</b><span>content responds, no ability carries it</span></div>`;
      const u = n('unused');
      return { stats, out: u.length ? `Unused so far: ${u.map(k => `[${k}]`).join(' ')}. Add content that responds, or repurpose the keyword.` : 'Every keyword an ability carries has something in the game that responds to it.' };
    },
  });
})();
