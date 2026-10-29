/* WoW Classic spell reels (MGM C4 M7, deck slide 74). Notes: "this advanced spell creation framework that Blizzard used on
   World of Warcraft: Classic." Five of the slide's columns become reels: shape, proxy, payload, valid targets and cast
   position. Spin, or click a reel to step it, and the page names the Classic spells that sit on that combination, or calls it
   unused. The grid on the right shades which shape and payload pairs these spells cover. Spell tags are this page's reading. */
(function () {
  const { $ } = FPF.kit;
  const { icon, text, chip, TONE, panel, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C;
  const REELS = [
    ['Shape', ['Single Target', 'Circular Area', 'Line', 'Cone']],
    ['Proxy', ['Caster', 'Missile', 'Pet', 'Trap / Device']],
    ['Payload', ['Damage', 'Apply Status Effect', 'Stun', 'Charge', 'Teleport', 'Spell Cast Interrupt', 'Heal', 'Knockback']],
    ['Valid Targets', ['Enemy', 'Ally', 'Player', 'Environment']],
    ['Cast Position', ['Caster Position', 'Enemy Target Loc', 'Chosen Target Location', 'Target Current Location']],
  ];
  // [spell, class, icon, [shape, proxy, payload, targets, cast position]]
  const SPELLS = [
    ['Frost Nova', 'Mage', 'spell_frost_frostnova', [1, 0, 1, 0, 0]], ['Cone of Cold', 'Mage', 'spell_frost_glacier', [3, 0, 0, 0, 0]],
    ['Fireball', 'Mage', 'spell_fire_flamebolt', [0, 1, 0, 0, 1]], ['Blizzard', 'Mage', 'spell_frost_icestorm', [1, 0, 0, 0, 2]],
    ['Arcane Explosion', 'Mage', 'spell_nature_wispsplode', [1, 0, 0, 0, 0]], ['Blink', 'Mage', 'spell_arcane_blink', [2, 0, 4, 2, 0]],
    ['Rain of Fire', 'Warlock', 'spell_shadow_rainoffire', [1, 0, 0, 0, 2]], ['Spell Lock', 'Warlock (Felhunter)', 'spell_shadow_mindrot', [0, 2, 5, 0, 1]],
    ['Explosive Trap', 'Hunter', 'spell_fire_selfdestruct', [1, 3, 0, 0, 0]], ['Freezing Trap', 'Hunter', 'spell_frost_chainsofice', [0, 3, 2, 0, 0]],
    ['Volley', 'Hunter', 'ability_marksmanship', [1, 0, 0, 0, 2]], ['Concussive Shot', 'Hunter', 'spell_frost_stun', [0, 1, 1, 0, 1]],
    ['Charge', 'Warrior', 'ability_warrior_charge', [2, 0, 3, 0, 1]], ['Thunder Clap', 'Warrior', 'spell_nature_thunderclap', [1, 0, 0, 0, 0]],
    ['Kick', 'Rogue', 'ability_kick', [0, 0, 5, 0, 1]], ['Hammer of Justice', 'Paladin', 'spell_holy_sealofmight', [0, 0, 2, 0, 1]],
    ['Healing Wave', 'Shaman', 'spell_nature_magicimmunity', [0, 0, 6, 1, 3]],
  ];
  const RX = j => 84 + j * 132, RY = 150, DUR = 24;
  const TOUR = [[0, [0, 0, 0, 0, 0]], [1, [1, 0, 1, 0, 0]], [5.2, [0, 1, 0, 0, 1]], [9.4, [3, 2, 4, 3, 2]], [13.6, [1, 0, 0, 0, 2]], [17.8, [2, 0, 3, 0, 1]]];

  function view(t, st, tour) {
    if (!tour) return { v: st.v, prev: st.prev, at: st.at };
    let i = 0; while (i + 1 < TOUR.length && t >= TOUR[i + 1][0]) i++;
    return { v: TOUR[i][1], prev: TOUR[Math.max(0, i - 1)][1], at: TOUR[i][0] };
  }
  const matches = v => SPELLS.filter(s => s[3].every((x, j) => x === v[j]));

  scene('spell-reels', {
    dur: DUR,
    state: () => ({ v: [1, 0, 1, 0, 0], prev: [0, 0, 0, 0, 0], at: -9 }),
    init(s, st, api) {
      const set = v => { api.manual(); st.prev = st.v; st.v = v; st.at = st.t; };
      $(s, '.sr-spin').onclick = () => set(REELS.map(r => Math.floor(Math.random() * r[1].length)));
      $(s, '.sr-known').onclick = () => { const sp = SPELLS[Math.floor(Math.random() * SPELLS.length)]; set([...sp[3]]); };
      pointer(api.cv, (x, y, type) => { if (type !== 'down') return; REELS.forEach((r, j) => { if (inBox(x, y, RX(j), RY, 122, 190)) { const v = [...st.v]; v[j] = (v[j] + 1) % r[1].length; set(v); } }); });
    },
    draw(g, t, st, tour) {
      const { v, prev, at } = view(t, st, tour), since = t - at;
      panel(g, 14, 14, 676, 300, { title: 'Spell creation framework: one value per reel' });
      REELS.forEach(([n, vals], j) => {
        const x = RX(j), spin = clamp((since - j * .15) / .7), k = ease(spin);
        text(g, n, x, 52, { size: 14, w: 800, col: C.navy });
        g.save(); g.beginPath(); g.roundRect(x - 61, RY - 86, 122, 172, 10); g.fillStyle = '#fffaf0'; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3; g.stroke(); g.clip();
        // the reel rolls from the old value to the new one
        const L = vals.length, from = prev[j], to = v[j], steps = ((to - from) % L + L) % L + (since < 2 ? L : 0), pos = from + steps * k;
        for (let d = -2; d <= 2; d++) {
          const idx = ((Math.round(pos) + d) % L + L) % L, off = (Math.round(pos) + d - pos) * 52;
          const on = d === 0 && spin >= 1;
          g.fillStyle = on ? '#bdf0d8' : '#7fd7c6'; g.globalAlpha = 1 - Math.abs(off) / 140; g.beginPath(); g.roundRect(x - 52, RY + off - 22, 104, 44, 4); g.fill();
          CK.wrap(g, vals[idx], x, RY + off - (vals[idx].length > 14 ? 7 : 0), 98, { size: 12.5, w: 700, align: 'center', lh: 14, col: C.navy });
        }
        g.restore(); g.globalAlpha = 1;
        g.strokeStyle = C.gold; g.lineWidth = 3; g.strokeRect(x - 58, RY - 25, 116, 50);
      });
      // what it makes
      const m = matches(v), k = ease(clamp((since - 1.2) / .4));
      panel(g, 14, 326, 676, 246, { title: 'World of Warcraft: Classic spells on this combination' });
      g.save(); g.globalAlpha = k;
      if (m.length) m.slice(0, 4).forEach((s, i) => { const x = 50 + i * 160; icon(g, `wow-${s[2]}.jpg`, x + 26, 420, 56, { lw: 3 }); text(g, s[0], x + 26, 470, { size: 15, w: 800, display: true }); text(g, s[1], x + 26, 492, { size: 12, col: C.muted }); });
      else { text(g, 'Unused combination', 352, 420, { size: 26, w: 800, display: true, col: C.goldInk }); text(g, 'Nothing here in Classic: a design prompt, or a reason it was left out.', 352, 458, { size: 14, col: C.ink }); }
      if (m.length > 1) text(g, `${m.length} spells share every value: packaging tells them apart.`, 352, 540, { size: 14, w: 700, col: C.navy });
      g.restore();
      // coverage: shape x payload
      panel(g, 702, 14, 324, 558, { title: 'Coverage: shape × payload' });
      const pays = REELS[2][1], shapes = REELS[0][1];
      shapes.forEach((sh, r) => text(g, sh.replace('Circular ', 'Circ. '), 800, 116 + r * 106, { size: 11.5, w: 700, align: 'right' }));
      pays.forEach((p, c) => { g.save(); g.translate(818 + c * 25, 92); g.rotate(-Math.PI / 2.4); text(g, p.replace('Spell Cast ', '').replace('Apply Status Effect', 'Status'), 0, 0, { size: 10.5, align: 'left', col: C.muted }); g.restore(); });
      shapes.forEach((sh, r) => pays.forEach((p, c) => {
        const n = SPELLS.filter(s => s[3][0] === r && s[3][2] === c).length, here = v[0] === r && v[2] === c, x = 818 + c * 25, y = 116 + r * 106;
        g.fillStyle = n ? `rgba(47,174,99,${.25 + .2 * n})` : 'rgba(150,140,115,.15)'; g.fillRect(x - 11, y - 46, 22, 92);
        if (n) text(g, String(n), x, y, { size: 12, w: 800, col: '#145c33' });
        if (here) { g.strokeStyle = C.gold; g.lineWidth = 3; g.strokeRect(x - 12, y - 47, 24, 94); }
      }));
      text(g, `${SPELLS.length} spells here; empty columns are open space`, 864, 552, { size: 11.5, col: C.muted });
    },
    side(t, st, tour) {
      const { v } = view(t, st, tour), m = matches(v);
      return { out: m.length ? `<b>${m.map(s => s[0]).join(', ')}</b>: ${REELS.map((r, j) => r[1][v[j]].toLowerCase()).join(', ')}.` : `Unused: ${REELS.map((r, j) => r[1][v[j]].toLowerCase()).join(', ')}. What would this spell be?` };
    },
  });
})();
