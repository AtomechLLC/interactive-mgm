// Spend visual intensity only on what matters: one raid pull drawn twice. The first pass gives every effect the same
// brightness; the second quiets the allies' spells and spends the saturation on the boss's warning.
// The arena is top-down with round tokens, so nothing here has a facing.
(function () {
  const { C, clamp, lerp, seg, ease, easeOut, rng, text, para, rrect, panel, bar, icon, captions } = DC;
  const DUR = 18, HALF = 9, CX = 500, CY = 462, R = 300;
  const CLASSES = ['mage', 'priest', 'warrior', 'shaman', 'paladin', 'warlock', 'druid', 'rogue', 'hunter'];
  // allies around the boss: [class, angle in degrees, distance, effect hue]
  const ALLIES = [['warrior', 200, 95, 20], ['rogue', 160, 100, 55], ['paladin', 250, 120, 48], ['mage', 20, 230, 200], ['warlock', 325, 235, 285],
    ['hunter', 55, 250, 95], ['shaman', 110, 215, 185], ['druid', 290, 150, 130], ['priest', 150, 235, 55]];
  const YOU = { x: CX + 40, y: CY + 185 }, SAFE = { x: CX + 190, y: CY + 150 }, ZONE = 92, CAST = 5, HIT = 6.2;
  // one colour function for every ally effect: q is how quiet it is (0 loud, 1 quiet)
  const hsl = (h, s, l, a, q) => `hsla(${h},${Math.round(s * (1 - .88 * q))}%,${Math.round(lerp(l, 70, q * .6))}%,${a * (1 - .68 * q)})`;
  const pos = a => ({ x: CX + Math.cos(a[1] * Math.PI / 180) * a[2], y: CY + Math.sin(a[1] * Math.PI / 180) * a[2] });

  function effects(g, u, q) {
    const r = rng(7);
    // ground effects: consecration, blizzard, healing rain, rain of fire
    [[CX - 60, CY - 20, 120, 48], [CX + 110, CY - 120, 105, 205], [CX - 150, CY + 120, 115, 165], [CX + 60, CY + 120, 110, 18], [CX - 30, CY + 190, 95, 280]].forEach(([x, y, rad, h], i) => {
      const pulse = .5 + .5 * Math.sin(u * 3 + i * 1.7);
      g.fillStyle = hsl(h, 90, 55, .34 + .12 * pulse, q); g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
      g.strokeStyle = hsl(h, 95, 50, .8, q); g.lineWidth = 3; g.setLineDash([10, 8]); g.lineDashOffset = -u * 30; g.beginPath(); g.arc(x, y, rad - 3, 0, 7); g.stroke(); g.setLineDash([]);
      for (let j = 0; j < 14; j++) { const a = r() * 7, d = Math.sqrt(r()) * rad, ph = (u * (1 + r()) + r() * 3) % 1; g.fillStyle = hsl(h, 100, 70, 1 - ph, q); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d - ph * 16, 3 + 4 * (1 - ph), 0, 7); g.fill(); }
    });
    // bolts from the ranged allies to the boss
    ALLIES.forEach((a, i) => { if (a[2] < 200) return; const p = pos(a);
      for (let j = 0; j < 2; j++) { const k = (u * 1.4 + i * .37 + j * .5) % 1, x = lerp(p.x, CX, k), y = lerp(p.y, CY, k);
        g.fillStyle = hsl(a[3], 100, 60, .95, q); g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
        g.strokeStyle = hsl(a[3], 100, 70, .6, q); g.lineWidth = 6; g.beginPath(); g.moveTo(x, y); g.lineTo(lerp(p.x, CX, Math.max(0, k - .12)), lerp(p.y, CY, Math.max(0, k - .12))); g.stroke(); } });
    // melee sparks on the boss
    for (let j = 0; j < 10; j++) { const a = r() * 7, ph = (u * 2.2 + r()) % 1; g.strokeStyle = hsl(40 + r() * 20, 100, 62, 1 - ph, q); g.lineWidth = 4; g.beginPath(); g.moveTo(CX + Math.cos(a) * 50, CY + Math.sin(a) * 50); g.lineTo(CX + Math.cos(a) * (50 + 50 * ph), CY + Math.sin(a) * (50 + 50 * ph)); g.stroke(); }
  }

  function arena(g, u, q, img, pass) {
    g.save(); g.beginPath(); g.arc(CX, CY, R + 22, 0, 7); g.fillStyle = '#3a3d4d'; g.fill(); g.beginPath(); g.arc(CX, CY, R + 10, 0, 7); g.fillStyle = '#565a6e'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.arc(CX, CY, i * 78, 0, 7); g.stroke(); }
    g.beginPath(); g.arc(CX, CY, R + 10, 0, 7); g.clip();
    // the boss's warning: a zone under you that fills for 1.2 s, then lands
    const fill = seg(u, CAST, HIT), live = u >= CAST && u < HIT + .5;
    const drawZone = () => { if (!live) return;
      if (u < HIT) {
        if (pass === 0) { g.fillStyle = `hsla(280,85%,55%,${.3 + .12 * fill})`; g.beginPath(); g.arc(YOU.x, YOU.y, ZONE, 0, 7); g.fill(); g.strokeStyle = 'hsla(280,90%,52%,.8)'; g.lineWidth = 3; g.stroke(); }
        else { g.fillStyle = 'rgba(255,60,20,.28)'; g.beginPath(); g.arc(YOU.x, YOU.y, ZONE, 0, 7); g.fill(); g.fillStyle = 'rgba(255,60,20,.62)'; g.beginPath(); g.arc(YOU.x, YOU.y, ZONE * fill, 0, 7); g.fill();
          g.strokeStyle = '#ff2a00'; g.lineWidth = 6 + 2 * Math.sin(u * 22); g.beginPath(); g.arc(YOU.x, YOU.y, ZONE, 0, 7); g.stroke(); }
      } else { const k = seg(u, HIT, HIT + .5); g.fillStyle = `rgba(255,${pass ? 120 : 200},${pass ? 40 : 255},${.9 * (1 - k)})`; g.beginPath(); g.arc(YOU.x, YOU.y, ZONE * (1 + .25 * k), 0, 7); g.fill(); } };
    if (pass === 0) drawZone();            // loud pass: the warning sits under everything else
    effects(g, u, q);
    if (pass === 1) drawZone();            // quiet pass: the warning is drawn on top
    g.restore();
    icon(g, img.dragon, CX, CY, 46, '#1b1024'); text(g, 'BOSS', CX, CY + 70, { size: 16, weight: 700, color: '#fff', align: 'center' });
    ALLIES.forEach(a => { const p = pos(a); g.globalAlpha = pass ? .8 : 1; icon(g, img[a[0]], p.x, p.y, 21, '#fff'); g.globalAlpha = 1; });
    // you: stand still in the loud pass, walk out in the quiet one
    const mv = pass ? ease(seg(u, CAST + .35, CAST + 1.05)) : 0, x = lerp(YOU.x, SAFE.x, mv), y = lerp(YOU.y, SAFE.y, mv);
    const hurt = pass === 0 ? clamp(1 - Math.abs(u - HIT - .15) / .35) : 0;
    g.beginPath(); g.arc(x, y, 24, 0, 7); g.fillStyle = hurt > 0 ? `rgb(255,${Math.round(255 - 150 * hurt)},${Math.round(255 - 150 * hurt)})` : C.blue; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
    text(g, 'YOU', x, y + 6, { size: 15, weight: 700, color: hurt > .3 ? C.red : '#fff', align: 'center' });
    if (u >= HIT) { const k = seg(u, HIT, HIT + 1.6), al = clamp(1.8 - k * 1.8) ;
      if (pass === 0) text(g, '−8,400', YOU.x, YOU.y - 40 - k * 40, { size: 38, weight: 800, color: '#ff5a3c', align: 'center', font: 'Montserrat', alpha: al });
      else text(g, 'Dodged', SAFE.x - 10, SAFE.y - 62 - k * 30, { size: 32, weight: 800, color: '#fff', align: 'center', font: 'Montserrat', alpha: al }); }
  }

  function side(g, u, q, pass) {
    const x = 880, w = 680;
    panel(g, x, 150, w, 630, pass ? 'Second pass: one loud thing' : 'First pass: everything is loud', pass ? 'Same pull, same timing, same warning' : 'Every effect at full colour and full opacity');
    text(g, 'Where the screen’s brightness goes', x + 22, 262, { size: 20, weight: 600, color: C.muted });
    const rows = [['Allies’ spells', lerp(.78, .2, q), C.grey], ['Arena floor', lerp(.14, .1, q), C.grey], ['Boss warning', lerp(.08, .7, q), '#ff4a1c']];
    rows.forEach(([n, v, c], i) => { const y = 300 + i * 62; text(g, n, x + 22, y + 22, { size: 22, weight: 600 }); bar(g, x + 200, y, 360, 30, v, i === 2 ? c : (pass ? '#b9bdcc' : ['#e0b23a', '#8d7fd1', c][i])); text(g, Math.round(v * 100) + '%', x + 578, y + 24, { size: 24, weight: 700 }); });
    // the timeline of the warning
    const ty = 540; text(g, 'The boss’s warning', x + 22, ty - 16, { size: 20, weight: 600, color: C.muted });
    rrect(g, x + 22, ty, w - 44, 22, 11, '#e6dcc6'); const x0 = x + 22 + (w - 44) * CAST / HALF, x1 = x + 22 + (w - 44) * HIT / HALF;
    rrect(g, x0, ty, x1 - x0, 22, 6, pass ? '#ff4a1c' : '#a070d8'); g.fillStyle = C.navy; g.fillRect(x + 22 + (w - 44) * clamp(u / HALF) - 2, ty - 8, 4, 38);
    text(g, 'on screen for 1.2 s', (x0 + x1) / 2, ty + 48, { size: 18, color: C.muted, align: 'center' });
    const res = u >= HIT;
    rrect(g, x + 22, 620, w - 44, 136, 12, res ? (pass ? '#e3f1e6' : '#f7e1da') : '#f1ead8');
    text(g, 'Result', x + 44, 656, { size: 18, color: C.muted });
    if (!res) text(g, u < CAST ? 'Waiting for the cast…' : 'Find the warning', x + 44, 706, { size: 34, weight: 700, font: 'Montserrat' });
    else { text(g, pass ? 'Stepped out in 0.5 s' : 'Hit for 8,400', x + 44, 700, { size: 34, weight: 800, font: 'Montserrat', color: pass ? C.green : C.red });
      text(g, pass ? 'The warning was the brightest thing on screen' : 'The warning was one more circle among five others', x + 44, 736, { size: 19, color: C.ink }); }
  }

  DC.scene({
    dur: DUR, kicker: '5 · Be clear before you’re clever', title: 'Spend visual intensity only on what matters',
    imgs: Object.fromEntries([...CLASSES.map(c => [c, `../img/classicon_${c}.jpg`]), ['dragon', '../img/inv_misc_head_dragon_01.jpg']]),
    draw(g, t, img) {
      const pass = t < HALF ? 0 : 1, u = t % HALF, q = pass ? ease(seg(u, 0, .9)) : 1 - ease(seg(u, 0, .6)) * 1;
      arena(g, u, pass ? q : (t < .6 ? q : 0), img, pass); side(g, u, pass ? q : 0, pass);
      captions(g, t, [[0, 'Nine allies cast at once. Each effect is as bright as every other, including the one that hurts you.'],
        [HIT, 'The warning was there for 1.2 seconds. It was simply the same volume as everything around it.'],
        [HALF, 'Desaturate and quiet the allies’ spells. Spend the saved brightness on the single effect that matters.'],
        [HALF + HIT, 'Nothing about the fight changed. The player can now see the question the boss is asking.']]);
    },
  });
})();
