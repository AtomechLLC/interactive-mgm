/* Same purpose, many payloads (MGM C4 M7, deck slides 47-55: "we make abilities to solve problems"). One problem, a player
   who keeps blocking, and five games' answers to it, each a different payload: a throw, a ranged grab, a guard-breaking
   kick, a move that hits through Protect, and a sword thrust that breaks shields. Each tile loops its own small picture. */
(function () {
  const { text, chip, card, TONE, scene, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C;
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const ITEMS = [
    ['Shoulder Throw', 'Street Fighter 6', 'Grab', 'grab', '#e05a3a'],
    ['Hookshot', 'Super Smash Bros. (Link)', 'Ranged grab', 'grapple', '#4c9a52'],
    ['Kick', 'Elden Ring', 'Guard break', 'boot-kick', '#a07a4a'],
    ['Feint', 'Pokémon', 'Hits through Protect', 'pointy-sword', '#d0a020'],
    ['Shield Breaker', 'Super Smash Bros. (Marth)', 'Shield damage', 'broadsword', '#5a6fd0'],
  ];
  const POS = [[180, 210], [520, 210], [860, 210], [350, 450], [690, 450]];
  const DUR = 12, LOOP = 3;

  function mini(g, i, a) {
    // local box 260 x 110, player on the left, the blocker on the right
    let px = -80, fx = 60, fy = 0, guard = true, bub = false;
    const pop = (s, age, col) => { if (age >= 0 && age < .8) T.popText(s, fx, -38 - age * 18, col, 1 - age / .8); };
    if (i === 0) { px = lerp(-90, fx - 34, ease(ph(a, 0, .8))); const toss = ease(ph(a, 1.1, 1.7)); if (a > 1.1) { fx = lerp(60, -110, toss) ; fy = -Math.sin(toss * Math.PI) * 40; guard = false; } pop('thrown', a - 1.6, C.redDk); }
    if (i === 1) { const k = ph(a, .5, .9), pull = ease(ph(a, 1, 1.6)); fx = lerp(70, -45, pull); if (a > .5 && a < 1.7) T.tracer(px + 14, 0, lerp(px + 14, fx - 14, a < .9 ? k : 1), 0, 1, '#4c9a52', 4); if (a > 1) guard = false; pop('pulled in', a - 1.6, C.redDk); }
    if (i === 2) { px = -10; if (a > 1) guard = false; if (a > .9 && a < 1.2) T.flash(fx - 20, 0, 30, 1 - ph(a, .9, 1.2)); pop('guard broken', a - 1.1, C.redDk); }
    if (i === 3) { px = -30; bub = a < 1.15; guard = false; if (a > .9 && a < 1.2) T.tracer(px + 14, 0, fx, 0, 1, C.gold, 5); pop('through Protect', a - 1.1, C.redDk); }
    if (i === 4) { px = -30; const ch = ph(a, .2, 1.1); if (a < 1.1) { g.fillStyle = `rgba(90,111,208,${.25 + .35 * ch})`; g.beginPath(); g.arc(px, 0, 18 + 10 * ch, 0, Math.PI * 2); g.fill(); } if (a > 1.1 && a < 1.35) T.tracer(px + 14, 0, fx - 22, 0, 1, '#5a6fd0', 7); if (a > 1.25) guard = false; pop('shield broken', a - 1.3, C.redDk); }
    T.player(px, 0, 0, .75);
    if (bub) T.bubble(fx, fy, 24, a, 1);
    T.foe(fx, fy, 15, Math.PI, C.red, { mark: guard ? 'shield' : null });
    if (!guard && a > 1.3 && i !== 0) { g.fillStyle = C.gold; for (let j = 0; j < 3; j++) { const an = a * 4 + j * 2.1; g.beginPath(); g.arc(fx + Math.cos(an) * 14, fy - 22 + Math.sin(an) * 4, 2.5, 0, Math.PI * 2); g.fill(); } }
  }

  scene('same-purpose', {
    dur: DUR,
    draw(g, t) {
      chip(g, 'Purpose: counter blocking', 520, 38, { ...TONE.blue, size: 18 });
      text(g, 'One problem, five payloads', 520, 70, { size: 14, col: C.muted });
      ITEMS.forEach(([n, game, pay, gi, col], i) => {
        const [x, y] = POS[i], k = ease(clamp((t - i * .25) / .5));
        g.save(); g.globalAlpha = k; g.translate(x, y + (1 - k) * 20);
        card(g, 0, 0, 316, 220, { edge: col, lw: 3 });
        g.save(); g.beginPath(); g.roundRect(-146, -98, 292, 116, 8); g.clip(); T.use(g); T.floor(-146, -98, 292, 116); g.translate(0, -40); g.scale(1.2, 1.2); mini(g, i, (t + i * .6) % LOOP); g.restore();
        GI.draw(g, gi, -128, 44, 26, col);
        text(g, n, -108, 40, { align: 'left', size: 17, w: 800, display: true });
        text(g, game, -108, 60, { align: 'left', size: 12, col: C.muted });
        chip(g, pay, 0, 88, { ...TONE.gold, size: 13 });
        g.restore();
      });
    },
    side() { return { out: 'Every one of these solves the same problem, an opponent who keeps blocking. Purpose is the constant; the payload is where each game differs.' }; },
  });
})();
