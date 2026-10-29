/* Decomposition, then composition (MGM C4 M7, deck slides 33-42). Slide 35: a game piece is a black box; break it into its
   composite parts, repeat across the game, and you have "the game's toolbox of components" (notes on 35). Slide 39: composition
   is mixing some of those parts into a new whole. The black-box slide opens five items from five games into five slots
   (source, target, mechanic, duration, trigger); parts already in the toolbox pulse instead of being added twice. The toolbox
   slide builds an item from those parts and names the real one it matches. Part tags are this page's reading of each item. */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C;
  const SLOTS = [['Source', TONE.blue], ['Target', TONE.teal], ['Mechanic', TONE.red], ['Duration', TONE.gold], ['Trigger', TONE.purple]];
  // [name, game, art, art kind, [source, target, mechanic, duration, trigger]]
  const BOXES = [
    ['Super Star', 'Super Mario Bros.', 'smb-star.png', 'pic', ['Self', 'Self', 'Invincibility', 'Timed', 'Touch']],
    ['Fireball', 'World of Warcraft', 'wow-spell_fire_flamebolt.jpg', 'icon', ['Self', 'Enemy', 'Damage', 'Instant', 'Cast']],
    ['Thunderbolt', 'Pokémon (Pikachu)', 'pk-pikachu.png', 'pic', ['Self', 'Enemy', 'Damage', 'Instant', 'Turn']],
    ['Estus Flask', 'Dark Souls', 'gi:potion-ball', 'gi', ['Self', 'Self', 'Heal', 'Instant', 'Use']],
    ['Doran’s Blade', 'League of Legends', 'lol-item-1055.png', 'icon', ['Self', 'Self', 'Empower', 'Permanent', 'Passive']],
  ];
  // more real items for the toolbox slide to recognise
  const MORE = [
    ['Bloodlust', 'World of Warcraft (shaman)', ['Self', 'Ally', 'Empower', 'Timed', 'Cast']],
    ['Frost Nova', 'World of Warcraft (mage)', ['Self', 'Enemy', 'Disable', 'Timed', 'Cast']],
    ['Rain Dance', 'Pokémon', ['Self', 'Environment', 'Empower', 'Timed', 'Turn']],
    ['Healing Potion', 'World of Warcraft', ['Self', 'Self', 'Heal', 'Instant', 'Use']],
    ['Paralysis (Thunder Wave)', 'Pokémon', ['Self', 'Enemy', 'Disable', 'Permanent', 'Turn']],
  ];
  const ALL = [...BOXES.map(b => [b[0], b[1], b[4]]), ...MORE];
  const TOOL = [['Self'], ['Self', 'Enemy', 'Ally', 'Environment'], ['Damage', 'Heal', 'Empower', 'Invincibility', 'Disable'], ['Instant', 'Timed', 'Permanent'], ['Touch', 'Cast', 'Turn', 'Use', 'Passive']];
  const art = (g, b, x, y, s) => b[3] === 'icon' ? icon(g, b[2], x, y, s, { lw: 2 }) : b[3] === 'gi' ? (g.fillStyle = '#c9782a', g.beginPath(), g.arc(x, y, s / 2, 0, Math.PI * 2), g.fill(), GI.draw(g, b[2].slice(3), x, y, s * .64, '#fff')) : pic(g, b[2], x, y, s * (b[2].startsWith('smb') ? .8 : 1.05), { px: b[2].startsWith('smb') });

  // ---------- black box ----------
  const BX = i => 104 + i * 208, BY = 108;
  scene('black-box', {
    dur: 16,
    state: () => ({ opened: [] }),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => { if (type !== 'down') return; BOXES.forEach((b, i) => { if (inBox(x, y, BX(i), BY, 160, 140)) { if (st.tour) { api.manual(); st.opened = []; } if (!st.opened.some(o => o[0] === i)) st.opened.push([i, st.t]); } }); });
      $(s, '.bb-reset').onclick = () => { api.manual(); st.opened = []; };
      $(s, '.bb-all').onclick = () => { api.manual(); st.opened = BOXES.map((b, i) => [i, st.t + i * .5]); };
    },
    draw(g, t, st, tour) {
      const opened = tour ? BOXES.map((b, i) => [i, 1 + i * 2.6]).filter(o => t >= o[1]) : st.opened.filter(o => t >= o[1]);
      // the shelf of boxes
      BOXES.forEach((b, i) => {
        const o = opened.find(q => q[0] === i), k = o ? ease(clamp((t - o[1]) / .6)) : 0, x = BX(i);
        card(g, x, BY, 168, 150, { edge: o ? C.navy : '#8a7f66', fill: o ? '#fffaf0' : '#3d4270', lw: 3 });
        if (k < 1) { g.save(); g.globalAlpha = 1 - k; text(g, '?', x, BY - 10, { size: 58, w: 800, display: true, col: '#fff' }); text(g, 'click to open', x, BY + 48, { size: 12, col: '#cfd3f0' }); g.restore(); }
        if (k > 0) { g.save(); g.globalAlpha = k; art(g, b, x, BY - 24, 64); text(g, b[0], x, BY + 30, { size: 15, w: 800, display: true }); text(g, b[1], x, BY + 52, { size: 11.5, col: C.muted }); g.restore(); }
      });
      // what each opened box breaks into
      panel(g, 14, 200, 640, 372, { title: 'Composite parts' });
      SLOTS.forEach(([n, tone], j) => text(g, n, 120 + j * 120, 252, { size: 13, w: 800, col: tone.col }));
      opened.forEach(([i, at], r) => {
        const b = BOXES[i], y = 292 + r * 54, k = clamp((t - at - .3) / .5);
        art(g, b, 46, y, 34);
        b[4].forEach((p, j) => { const a = clamp(k * 3 - j * .35); g.save(); g.globalAlpha = a; chip(g, p, 120 + j * 120, y, { ...SLOTS[j][1], size: 13, width: 104 }); g.restore(); });
      });
      // the toolbox: unique parts only
      panel(g, 668, 200, 358, 372, { title: 'The game’s toolbox' });
      const seen = {}, firstAt = {};
      opened.forEach(([i, at]) => BOXES[i][4].forEach((p, j) => { const key = j + p; if (!seen[key]) { seen[key] = [j, p]; firstAt[key] = at + .3 + j * .12; } }));
      const groups = SLOTS.map((s, j) => Object.values(seen).filter(v => v[0] === j));
      let y = 272;
      groups.forEach((list, j) => {
        let x = 688;
        list.forEach(([, p]) => {
          const key = j + p, a = clamp((t - firstAt[key] - .4) / .4);
          // a part that turns up again pulses instead of being added
          const reused = opened.filter(([i, at]) => BOXES[i][4][j] === p && t >= at + .3);
          const last = reused.length > 1 ? reused[reused.length - 1][1] + .3 : -9, pulse = t - last > 0 && t - last < .8 ? Math.sin((t - last) / .8 * Math.PI) : 0;
          g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(1 + .18 * pulse, 1 + .18 * pulse);
          const w = chip(g, p, 0, 0, { ...SLOTS[j][1], size: 13, align: 'left', lw: pulse ? 4 : 2, edge: pulse ? C.gold : SLOTS[j][1].edge });
          g.restore(); x += w + 8;
          if (reused.length > 1) text(g, `×${reused.length}`, x - 8, y - 15, { size: 10.5, w: 800, col: C.goldInk, align: 'right', a });
        });
        if (list.length) y += 58;
      });
    },
    side(t, st, tour) {
      const opened = tour ? BOXES.filter((b, i) => t >= 1 + i * 2.6).length : st.opened.length;
      const list = tour ? BOXES.slice(0, opened) : st.opened.map(o => BOXES[o[0]]);
      const uniq = new Set(); list.forEach(b => b[4].forEach((p, j) => uniq.add(j + p)));
      const stats = `<div class="b"><b>${list.length}</b><span>items opened</span></div><div class="g"><b>${uniq.size}</b><span>unique parts in the toolbox</span></div><div class="y"><b>${list.length * 5}</b><span>parts found in all</span></div>`;
      return { stats, out: 'Open the boxes. Each item breaks into the same five slots, and the toolbox grows slower than the pile of items because parts repeat.' };
    },
  });

  // ---------- toolbox to composite ----------
  const TX = j => 90 + j * 122, TY = (j, i) => 98 + i * 50;   // 20px inside the toolbox panel on both sides
  scene('toolbox', {
    dur: 18,
    state: () => ({ pick: ['Self', 'Enemy', 'Damage', 'Instant', 'Cast'] }),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => { if (type !== 'down') return; TOOL.forEach((list, j) => list.forEach((p, i) => { if (inBox(x, y, TX(j), TY(j, i), 112, 38)) { api.manual(); st.pick = [...st.pick]; st.pick[j] = p; } })); });
      $(s, '.tb-rand').onclick = () => { api.manual(); st.pick = TOOL.map(l => l[Math.floor(Math.random() * l.length)]); };
    },
    draw(g, t, st, tour) {
      const SEQ = [ALL[0][2], ALL[5][2], ['Self', 'Ally', 'Heal', 'Timed', 'Cast'], ALL[7][2], ['Self', 'Environment', 'Disable', 'Timed', 'Touch']];
      const pick = tour ? SEQ[Math.min(SEQ.length - 1, Math.floor(t / 3.4))] : st.pick, since = tour ? t % 3.4 : 9;
      panel(g, 14, 14, 640, 332, { title: 'Toolbox' });
      TOOL.forEach((list, j) => {
        text(g, SLOTS[j][0], TX(j), 60, { size: 14, w: 800, col: SLOTS[j][1].col });
        list.forEach((p, i) => { const on = pick[j] === p; chip(g, p, TX(j), TY(j, i), on ? { ...SLOTS[j][1], size: 14, width: 112, lw: 3 } : { fill: 'rgba(255,250,240,.8)', edge: '#cdbf9f', col: C.muted, size: 14, width: 112, w: 600 }); });
      });
      // the composite
      panel(g, 14, 358, 640, 214, { title: 'Composite' });
      pick.forEach((p, j) => { const a = ease(clamp((since - j * .12) / .3)); g.save(); g.globalAlpha = a; chip(g, p, 86 + j * 124, 420 + (1 - a) * -20, { ...SLOTS[j][1], size: 15, width: 104 }); g.restore(); if (j < 4) text(g, '+', 148 + j * 124, 420, { size: 18, w: 800, col: C.muted }); });
      const match = ALL.filter(a => a[2].every((p, j) => p === pick[j]));
      const k = ease(clamp((since - .7) / .4));
      text(g, match.length ? `= ${match.map(m => m[0]).join(' or ')}` : '= a new item', 334, 494, { size: match.length ? 22 : 24, w: 800, display: true, col: match.length ? C.navy : C.good, a: k });
      text(g, match.length ? match.map(m => m[1]).join(' · ') : 'No item on file has this combination: a design prompt.', 334, 530, { size: 13, col: C.muted, a: k });
      // how many composites the toolbox allows
      const total = TOOL.reduce((n, l) => n * l.length, 1);
      panel(g, 668, 14, 358, 558, { title: 'Combinations' });
      text(g, TOOL.map(l => l.length).join(' × '), 847, 92, { size: 22, w: 800, display: true });
      text(g, `= ${total} possible items`, 847, 128, { size: 20, w: 800, col: C.good });
      text(g, `${ALL.length} of them are on file here:`, 847, 170, { size: 13.5, col: C.muted });
      ALL.forEach((a, i) => { const on = match.includes(a); text(g, `${on ? '▶ ' : ''}${a[0]}`, 700, 204 + i * 30, { align: 'left', size: 14, w: on ? 800 : 600, col: on ? C.navy : C.ink }); text(g, a[1].split(' (')[0], 1010, 204 + i * 30, { align: 'right', size: 11.5, col: C.muted }); });
    },
    side(t, st, tour) {
      return { out: 'Composition is exploring combinations of properties. Pick one part per slot: some combinations are items you know, the rest are new ideas built from parts the game already has.' };
    },
  });
})();
