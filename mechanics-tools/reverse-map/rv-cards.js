/* Reverse sequencing, take 3: one turn of a deckbuilder, built from the finisher back (card art: World of Warcraft spell
   icons). Forward: play the biggest number on each card until the energy runs out, and the boss lives. Backward: the
   goal is 32 damage, so Lightning Bolt at 4 Maelstrom goes in the last slot first; then ask what makes 4 Maelstrom,
   and two routes appear. The cards and numbers are made up for the example. */
(function () {
  const { pic, card, text, timeline, slide } = RVK;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, HP0 = 32, CW = 112, CH = 156;
  const EDGE = { atk: C.red, mael: C.purple, fin: C.gold };
  // [id, name, cost, icon, effect lines, kind]
  const CARDS = [
    ['strike1', 'Strike', 1, 'meleedamage', ['6 damage'], 'atk'], ['strike2', 'Strike', 1, 'meleedamage', ['6 damage'], 'atk'],
    ['cleave', 'Cleave', 2, 'warrior_savageblow', ['10 damage'], 'atk'], ['spark1', 'Spark', 0, 'nature_wispsplode', ['+1 Maelstrom'], 'mael'],
    ['spark2', 'Spark', 0, 'nature_wispsplode', ['+1 Maelstrom'], 'mael'], ['focus', 'Focus', 0, 'nature_lightningshield', ['+2 Maelstrom'], 'mael'],
    ['overload', 'Overload', 1, 'shaman_staticshock', ['+3 Maelstrom'], 'mael'], ['bolt', 'Lightning Bolt', 1, 'shaman_thunderstorm', ['8 damage per', 'Maelstrom'], 'fin'],
  ];
  const HAND = i => [100 + i * 120, 482], SLOT = j => [250 + j * 135, 292];

  function drawCard(g, c, x, y, o = {}) {
    const [, name, cost, icon, fx, kind] = c;
    g.save(); g.globalAlpha *= o.a ?? 1; g.translate(x, y); if (o.lift) g.translate(0, -10 * o.lift);
    if (o.ring) { g.strokeStyle = o.ring; g.lineWidth = 6; g.beginPath(); g.roundRect(-CW / 2 - 6, -CH / 2 - 6, CW + 12, CH + 12, 14); g.stroke(); }
    card(g, 0, 0, CW, CH, { edge: EDGE[kind], lw: 4, fill: o.dim ? '#ece4d2' : '#fffaf0', r: 10 });
    pic(g, `wow-${icon}.jpg`, 0, -34, 62);
    g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(-31, -65, 62, 62);
    g.fillStyle = C.blue; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(-CW / 2 + 10, -CH / 2 + 10, 15, 0, Math.PI * 2); g.fill(); g.stroke();
    text(g, String(cost), -CW / 2 + 10, -CH / 2 + 11, { size: 17, w: 800, col: '#fff', display: true });
    text(g, name, 0, 18, { size: name.length > 10 ? 14 : 16, w: 700, display: true });
    fx.forEach((l, i) => text(g, l, 0, 42 + i * 18, { size: 14, col: C.muted }));
    g.restore();
  }
  const byId = id => CARDS.find(c => c[0] === id);

  // a run of the turn: moves [time, id, slot], plays [time, slot, {dmg, mael, cost}]
  function state(run, t) {
    let hp = HP0, en = 3, mael = 0; const played = new Set();
    run.plays.forEach(([tt, slot, e]) => { if (t < tt) return; hp -= e.dmg ? (e.dmg === 'bolt' ? 8 * mael : e.dmg) : 0; en -= e.cost || 0; mael = e.dmg === 'bolt' ? 0 : mael + (e.mael || 0); played.add(slot); });
    return { hp: Math.max(0, hp), en, mael, played };
  }
  const FWD = { moves: [[.6, 'cleave', 0], [2.6, 'strike1', 1]], plays: [[1.3, 0, { dmg: 10, cost: 2 }], [3.3, 1, { dmg: 6, cost: 1 }]] };
  const BK = { moves: [[1.6, 'bolt', 4], [6.6, 'spark2', 3], [7.0, 'spark1', 2], [7.4, 'focus', 1], [8.4, 'strike1', 0]],
    plays: [[9.6, 0, { dmg: 6, cost: 1 }], [10.2, 1, { mael: 2 }], [10.8, 2, { mael: 1 }], [11.4, 3, { mael: 1 }], [12.1, 4, { dmg: 'bolt', cost: 1 }]] };
  const FDUR = 8.5, BDUR = 15.5;
  const BWD = [[.4, 'goal'], [1.6, 'bolt'], [3.4, 'routeA'], [5.0, 'routeB'], [6.6, 'fill'], [8.4, 'strike'], [9.6, 'play'], [12.6, 'done']];

  function hud(g, s, glow) {
    g.fillStyle = 'rgba(255,252,244,.55)'; g.beginPath(); g.roundRect(20, 20, W - 40, 180, 12); g.fill();
    text(g, 'Energy', 40, 52, { align: 'left', size: 15, col: C.muted });
    for (let i = 0; i < 3; i++) { g.fillStyle = i < s.en ? C.blue : '#d9d4c6'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(56 + i * 38, 86, 14, 0, Math.PI * 2); g.fill(); g.stroke(); }
    text(g, 'Maelstrom', 40, 130, { align: 'left', size: 15, col: C.muted });
    pic(g, 'wow-shaman_maelstromweapon.jpg', 58, 166, 36); text(g, `× ${s.mael}`, 84, 167, { align: 'left', size: 26, w: 800, display: true, col: C.purple });
    // the boss
    if (glow) { g.fillStyle = 'rgba(255,185,81,.45)'; g.beginPath(); g.roundRect(800, 30, 200, 160, 14); g.fill(); }
    pic(g, 'wow-boss_onyxia.jpg', 900, 86, 84); g.strokeStyle = C.navy; g.lineWidth = 3; g.strokeRect(858, 44, 84, 84);
    T.hp(900, 148, 170, s.hp, HP0);
    text(g, `Onyxia  ${s.hp} / ${HP0} HP`, 900, 174, { size: 16, w: 700 });
  }
  function board(g, run, t, s, rings = {}) {
    text(g, 'This turn', 120, 292, { size: 17, w: 700, display: true, col: C.muted });
    for (let j = 0; j < 5; j++) { const [x, y] = SLOT(j); g.setLineDash([8, 7]); g.strokeStyle = C.floorLn; g.lineWidth = 3; g.beginPath(); g.roundRect(x - CW / 2, y - CH / 2, CW, CH, 10); g.stroke(); g.setLineDash([]); }
    g.fillStyle = 'rgba(255,252,244,.6)'; g.beginPath(); g.roundRect(20, 392, W - 40, 180, 12); g.fill();
    text(g, 'Hand', 40, 410, { align: 'left', size: 14, col: C.muted });
    CARDS.forEach((c, i) => {
      const mv = run.moves.find(m => m[1] === c[0]);
      let [x, y] = HAND(i), lift = 0;
      if (mv && t >= mv[0]) { const k = ease(clamp((t - mv[0]) / .5)), [sx, sy] = SLOT(mv[2]); x = lerp(x, sx, k); y = lerp(y, sy, k) - Math.sin(k * Math.PI) * 40; }
      const inSlot = mv && t >= mv[0] + .5, active = inSlot && run.plays.some(p => p[1] === mv[2] && t >= p[0] && t < p[0] + .6);
      if (active) lift = 1;
      drawCard(g, c, x, y, { ring: rings[c[0]], dim: inSlot && s.played.has(mv[2]) && !active, lift });
    });
  }

  function draw(g, mode, t) {
    if (mode === 'fwd') {
      const s = state(FWD, t);
      hud(g, s, false); board(g, FWD, t, s, t >= 3.9 ? { bolt: C.redDk } : {});
      T.label('Play the biggest number first', 500, 52, 'center', C.ink, 17);
      FWD.plays.forEach(([tt, j, e]) => { if (t >= tt && t < tt + 1.2) T.popText(`-${e.dmg}`, 900, 60 - (t - tt) * 20, C.redDk, 1.2 - (t - tt)); });
      if (t >= 3.9) { T.label('Out of energy', 500, 100, 'center', C.redDk, 16); T.label('0 Maelstrom: Lightning Bolt deals 0', HAND(7)[0] - 70, 386, 'center', C.redDk, 14); }
      if (t >= 5.4) T.stamp('Onyxia lives at 16 HP', 500, 150, C.redDk, clamp((t - 5.4) / .3), 26);
      return;
    }
    const L = timeline(BWD, t), s = state(BK, t), rings = {};
    if (L.on('routeB') && !L.on('fill')) { rings.focus = rings.spark1 = rings.spark2 = C.p2; }
    else if (L.on('routeA') && !L.on('fill')) { rings.overload = rings.spark1 = C.purple; }
    hud(g, s, L.on('goal') && !L.on('play')); board(g, BK, t, s, rings);
    const prompt = L.on('done') ? null : L.on('play') ? ['Then play it forward', C.ink] : L.on('strike') ? ['1 energy left over: add a Strike', C.ink] : L.on('fill') ? ['Pick a route and fill the turn from the end', C.ink]
      : L.on('routeA') ? ['What makes 4 Maelstrom?', C.redDk] : L.on('bolt') ? ['What deals 32? Lightning Bolt at 4 Maelstrom', C.redDk] : L.on('goal') ? ['Goal: 32 damage this turn', C.goldInk] : null;
    if (prompt) T.label(prompt[0], 470, 52, 'center', prompt[1], 17);
    if (L.on('bolt')) { const [x, y] = SLOT(4); T.label('8 × 4 = 32', x + CW / 2 + 52, y, 'center', C.goldInk, 15); }
    const chip = (y, col, parts, tail, a) => {
      g.save(); g.globalAlpha = a; let x = 260;
      parts.forEach(p => { g.font = '700 15px Jost, sans-serif'; const w = g.measureText(p).width + 22; g.fillStyle = col; g.beginPath(); g.roundRect(x, y - 15, w, 30, 15); g.fill(); text(g, p, x + w / 2, y + 1, { size: 15, w: 700, col: '#fff' }); x += w + 8; });
      text(g, tail, x + 6, y + 1, { align: 'left', size: 15, col: C.muted }); g.restore();
    };
    if (L.on('routeA')) chip(108, C.purple, ['Overload +3', 'Spark +1'], '= 4, costs 1 energy', L.in('routeA'));
    if (L.on('routeB')) chip(152, C.p2, ['Focus +2', 'Spark +1', 'Spark +1'], '= 4, costs 0 energy', L.in('routeB'));
    BK.plays.forEach(([tt, j, e]) => { if (e.dmg && t >= tt && t < tt + 1.2) T.popText(`-${e.dmg === 'bolt' ? 32 : e.dmg}`, 900, 60 - (t - tt) * 20, C.redDk, 1.2 - (t - tt)); });
    if (L.on('done')) { T.stamp('Lethal', 470, 52, C.p2, L.in('done', .3), 28); T.label('2 routes to lethal', 120, 340, 'center', '#fff', 15, C.p2); }
  }

  slide('rv-cards', {
    fdur: FDUR, bdur: BDUR, draw,
    caps: {
      fwd: 'Forward, action first: play the biggest number on each card. Cleave, Strike, out of energy, and the finisher sits dead in hand. Onyxia lives.',
      back: 'Backward, goal first: 32 damage means Lightning Bolt at 4 Maelstrom, so it takes the last slot. What makes 4 Maelstrom? Two different routes, and either one is lethal.',
    },
    stats: {
      fwd: `<div class="r"><b>16</b><span>damage dealt, with the finisher left in hand</span></div>`,
      back: `<div class="g"><b>2</b><span>routes to lethal, found from the finisher back</span></div>`,
    },
  });
})();
