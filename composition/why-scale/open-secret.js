/* The industry "open secret" (MGM C4 M7, deck slide 4): well known inside the industry, not outside. Three games' content
   (World of Warcraft spells, League of Legends abilities, Magic: The Gathering style cards) get x-rayed by a sweeping beam,
   and under each item sit the same coloured parts. The cards are drawn here, not taken from Magic; their names are generic. */
(function () {
  const { icon, text, card, chip, panel, scene, clamp, ease } = CK;
  const C = TD.C;
  const PART = { Damage: '#e5622d', Area: '#c2412c', Missile: '#d08a2a', Dash: '#4c9a52', Disable: '#8a4fd6', Shield: '#5a8ad8', Heal: '#2fae63', Block: '#3d6ea8', Flying: '#5fb3bb', Empower: '#d0a020' };
  const COLS = [
    { name: 'World of Warcraft', items: [['Fireball', 'wow-spell_fire_flamebolt.jpg', ['Damage', 'Missile']], ['Frost Nova', 'wow-spell_frost_frostnova.jpg', ['Area', 'Disable']], ['Charge', 'wow-ability_warrior_charge.jpg', ['Dash', 'Disable']], ['Power Word: Shield', 'wow-spell_holy_powerwordshield.jpg', ['Shield']], ['Healing Rain', 'wow-spell_nature_giftofthewaterspirit.jpg', ['Heal', 'Area']]] },
    { name: 'League of Legends', items: [['Steel Tempest', 'lol-YasuoQ1Wrapper.png', ['Damage', 'Disable']], ['Wind Wall', 'lol-YasuoW.png', ['Block', 'Missile']], ['Sweeping Blade', 'lol-YasuoE.png', ['Dash', 'Damage']], ['Unbreakable', 'lol-BraumE.png', ['Block', 'Shield']], ['Last Breath', 'lol-YasuoR.png', ['Damage', 'Area']]] },
    { name: 'A trading card game', items: [['Lightning Strike', null, ['Damage']], ['Sky Knight', null, ['Flying', 'Shield']], ['Giant Strength', null, ['Empower']], ['Earthquake', null, ['Damage', 'Area']], ['Healing Salve', null, ['Heal']]] },
  ];
  const CX = [180, 520, 860], RY = i => 108 + i * 86, DUR = 12;

  scene('open-secret', {
    dur: DUR,
    draw(g, t) {
      const sweep = clamp((t - 2) / 5);           // the x-ray beam moves left to right
      const bx = -40 + sweep * 1120;
      COLS.forEach((col, c) => {
        const x = CX[c];
        panel(g, x - 162, 14, 324, 500, { title: col.name });
        col.items.forEach(([n, ic, parts], i) => {
          const y = RY(i), seen = clamp((bx - (x - 150)) / 60);
          // the item as players meet it
          g.save(); g.globalAlpha = 1 - .55 * seen;
          if (ic) icon(g, ic, x - 118, y, 50, { lw: 2 });
          else { card(g, x - 118, y, 46, 64, { edge: C.navy, lw: 2, r: 5, fill: ['#f3d9b0', '#d8e4f3', '#d8efd9', '#f3d0c7', '#efe5c8'][i] }); g.fillStyle = 'rgba(21,32,68,.25)'; g.fillRect(x - 136, y - 22, 36, 24); }
          text(g, n, x - 84, y - 12, { align: 'left', size: 14.5, w: 800 });
          g.restore();
          // the parts under it
          let px = x - 84;
          parts.forEach((p, j) => { const a = clamp(seen * 2 - j * .3); g.save(); g.globalAlpha = a; px += chip(g, p, px, y + 14, { fill: PART[p], edge: PART[p], col: '#fff', size: 12.5, align: 'left' }) + 6; g.restore(); });
        });
      });
      if (sweep > 0 && sweep < 1) { const gr = g.createLinearGradient(bx - 60, 0, bx + 10, 0); gr.addColorStop(0, 'rgba(85,98,235,0)'); gr.addColorStop(1, 'rgba(85,98,235,.35)'); g.fillStyle = gr; g.fillRect(bx - 60, 14, 70, 520); g.fillStyle = 'rgba(85,98,235,.9)'; g.fillRect(bx + 8, 14, 4, 520); }
      // the shared parts
      const sh = clamp((t - 7.4) / .6);
      if (sh) {
        const used = Object.keys(PART);
        let x = 520 - 470;
        g.save(); g.globalAlpha = sh;
        text(g, `${used.length} parts make all fifteen:`, 520, 534, { size: 15, w: 800, col: C.navy });
        g.restore();
        used.forEach((p, j) => { g.save(); g.globalAlpha = clamp(sh * 2 - j * .08); x += chip(g, p, x + 40, 566, { fill: PART[p], edge: PART[p], col: '#fff', size: 12.5, align: 'left' }) + 8; g.restore(); });
      }
      if (t > 9.4) { TD.use(g); TD.stamp('Same parts, every game', 520, 300, C.navy, clamp((t - 9.4) / .4), 30); }
    },
    side() { return { out: 'The industry’s open secret: big games are built from a toolbox of shared parts. Players meet fifteen items; designers see ten parts recombined.' }; },
  });
})();
