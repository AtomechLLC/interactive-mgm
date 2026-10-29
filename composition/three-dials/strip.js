/* Strip the packaging (MGM C4 M7, deck slides 60-65). Two pairs from the deck's breakdowns, side by side: Shoulder Throw vs
   Link's hookshot (notes on 64: the melee grab needs touch, the hookshot works at a distance, and they solve the same problem),
   then Nayru's Love vs Mario's cape (notes on 65: Zelda gets a long window, Mario must time it precisely; slide 71 writes it as
   [Reflect] (2 sec) vs [Reflect] (0.25 sec)). Packaging fades first, the matching rows get an equals sign, and the one row
   that differs stays lit with a small picture of the difference. */
(function () {
  const { text, wrap, card, chip, TONE, scene, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C;
  // [name, game, art, col, purpose, payload, [detail label, value, number], packaging]
  const PAIRS = [
    { diff: 'range', stamp: 'Only the range differs', items: [
      ['Shoulder Throw', 'Street Fighter 6 (Ryu)', 'grab', '#e05a3a', 'Counter blocking', 'Grab + conditional damage + displace enemy', ['Range', 'touch', .18], 'Martial arts toss'],
      ['Hookshot', 'Super Smash Bros. (Link)', 'grapple', '#4c9a52', 'Counter blocking', 'Grab + conditional damage + displace enemy', ['Range', 'far', 1], 'Physically grounded fantasy: a mechanical hook'] ] },
    { diff: 'window', stamp: 'Only the timing window differs', items: [
      ['Nayru’s Love', 'Super Smash Bros. Melee (Zelda)', 'magic-shield', '#5aa8e8', 'Ranged missile counter', '[Reflect]', ['Window', '2 sec', 2], 'Magically grounded fantasy: a crystal shield'],
      ['Mario’s Cape', 'Super Smash Bros. Melee (Mario)', 'cape', '#e8b83a', 'Ranged missile counter', '[Reflect]', ['Window', '0.25 sec', .25], 'Physical: Mario’s cape'] ] },
  ];
  const BEAT = 8.5, DUR = BEAT * 2;
  const XS = [276, 764], ROWY = [218, 300, 388, 470];

  function lane(g, kind, v, x, y, t, a) {
    g.save(); g.globalAlpha *= a; T.use(g);
    if (kind === 'range') {
      const reach = 30 + v * 118, k = ease(clamp(((t % 2.4) - .3) / .5)) * (1 - ease(clamp(((t % 2.4) - 1.6) / .4)));
      T.player(x - 90, y, 0, .6);
      T.foe(x - 90 + 26 + reach, y, 12, Math.PI, C.red, { mark: 'shield' });
      g.strokeStyle = C.goldInk; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 76, y); g.lineTo(x - 76 + reach * k, y); g.stroke();
    } else {
      const W = 170, x0 = x - W / 2 + 10, sc = W / 2.2;
      g.fillStyle = 'rgba(21,32,68,.12)'; g.fillRect(x0, y - 9, W, 18);
      g.fillStyle = 'rgba(47,174,99,.75)'; g.fillRect(x0 + W - v * sc, y - 9, v * sc, 18);
      g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(x0, y - 9, W, 18);
      const mx = x0 + ((t * .6) % 1) * W; g.fillStyle = C.red; g.beginPath(); g.arc(mx, y, 5, 0, Math.PI * 2); g.fill();
      text(g, 'missile lands →', x0 + W - 4, y - 20, { size: 10.5, col: C.muted, align: 'right' });
    }
    g.restore();
  }

  scene('strip-ability', {
    dur: DUR,
    draw(g, t) {
      const b = Math.min(1, Math.floor(t / BEAT)), u = t - b * BEAT, P = PAIRS[b];
      const inA = ease(clamp(u / .6)), pk = ease(clamp((u - 1.4) / .9)), eqP = ease(clamp((u - 2.8) / .6)), eqL = ease(clamp((u - 3.8) / .6)), df = ease(clamp((u - 4.8) / .6));
      const fade = b === 0 ? 1 - clamp((u - BEAT + .4) / .4) : 1;
      g.save(); g.globalAlpha = fade;
      const step = u < 1.4 ? '' : u < 2.8 ? '1. Strip the packaging' : u < 4.8 ? '2. Match what is left' : '3. What is still different?';
      text(g, step, 520, 40, { size: 22, w: 800, display: true, col: C.navy, a: clamp((u - 1.4) / .4) });
      P.items.forEach((it, i) => {
        const [name, game, gi, col, purpose, payload, [dl, dv, dn], pack] = it, x = XS[i];
        g.save(); g.globalAlpha *= inA; g.translate((1 - inA) * (i ? 40 : -40), 0);
        card(g, x, 300, 440, 450, { edge: C.navy });
        g.fillStyle = col; g.beginPath(); g.arc(x - 160, 118, 30, 0, Math.PI * 2); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3; g.stroke();
        GI.draw(g, gi, x - 160, 118, 38, '#fff');
        text(g, name, x - 118, 106, { align: 'left', size: 24, w: 800, display: true });
        text(g, game, x - 118, 134, { align: 'left', size: 13.5, col: C.muted });
        const rows = [['Purpose', purpose, TONE.blue, eqP], ['Payload', payload, TONE.gold, eqL], [dl, dv, TONE.orange, 0], ['Packaging', pack, TONE.purple, 0]];
        rows.forEach(([lab, val, tone, eq], r) => {
          const y = ROWY[r], isPack = r === 3, isDiff = r === 2;
          let a = 1 - .62 * eq; if (isPack) a = 1 - .78 * pk;
          if (isDiff && df) { g.fillStyle = `rgba(253,214,99,${.75 * df})`; g.beginPath(); g.roundRect(x - 206, y - 30, 412, 76, 10); g.fill(); }
          g.save(); g.globalAlpha *= a;
          chip(g, lab, x - 196, y - 14, { ...tone, size: 12.5, align: 'left' });
          wrap(g, val, x - 194, y + 14, 380, { size: isDiff ? 20 : 15.5, w: 700, lh: 19 });
          g.restore();
          if (isPack && pk > 0) { g.strokeStyle = `rgba(168,32,28,${pk})`; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 196, y + 14); g.lineTo(x - 196 + 380 * pk, y + 14); g.stroke(); }
          if (isDiff && df) lane(g, P.diff, dn, x + 100, y + 4, u, df);
        });
        g.restore();
      });
      // equals and not-equals between the cards
      [[ROWY[0], eqP, '='], [ROWY[1], eqL, '='], [ROWY[2], df, '≠']].forEach(([y, a, s]) => { if (a > 0) { g.fillStyle = s === '=' ? C.good : C.redDk; g.beginPath(); g.arc(520, y + 4, 20 * a, 0, Math.PI * 2); g.fill(); text(g, s, 520, y + 5, { size: 26, w: 800, col: '#fff', a }); } });
      if (u > 6.2) { T.use(g); T.stamp(P.stamp, 520, 556, C.navy, clamp((u - 6.2) / .4), 24); }
      g.restore();
    },
    side(t) {
      const b = Math.min(1, Math.floor(t / BEAT));
      return { out: b ? 'Nayru’s Love and Mario’s Cape: same purpose, same [Reflect]. Zelda gets a long window to counter the missile; Mario must time it precisely.' : 'Shoulder Throw and the hookshot solve the same problem, beating a blocking opponent. The throw needs touch; the hookshot works at a distance.' };
    },
  });
})();
