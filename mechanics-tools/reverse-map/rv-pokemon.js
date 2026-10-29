/* Reverse sequencing, take 2: a Pokémon Red and Blue gym. Forward: pick the starter that looks coolest, catch whatever
   shows up, grind, lose to Misty, grind again until levels win it. Backward: start at Misty's Water team and ask what
   beats Water (Electric or Grass), then where each one lives on the road to Cerulean: three routes to one badge.
   Type matchups, Misty's team and the catch locations are Red and Blue's; the party levels are illustrative. */
(function () {
  const { pic, arrow, card, text, timeline, slide } = RVK;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040;
  const TYPE = { Water: ['#3d7dd8', '#fff'], Electric: ['#f2c31b', '#3a2a00'], Grass: ['#4caf50', '#fff'], Fire: ['#e8622c', '#fff'], Normal: ['#a8a77a', '#fff'] };
  function pill(g, t, x, y, a = 1, size = 15) {
    g.save(); g.globalAlpha *= a; g.font = `700 ${size}px Montserrat, Jost, sans-serif`;
    const w = g.measureText(t).width + 26; g.fillStyle = TYPE[t][0]; g.strokeStyle = C.navy; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x - w / 2, y - size, w, size * 2, size); g.fill(); g.stroke();
    g.fillStyle = TYPE[t][1]; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 1); g.restore();
  }

  // the road to Cerulean, left to right, as the strip along the bottom
  const STOPS = [['Pallet Town', 90], ['Route 1', 230], ['Viridian Forest', 380], ['Pewter City', 520], ['Mt. Moon', 660], ['Route 24', 800], ['Cerulean Gym', 950]];
  const SX = n => STOPS.find(s => s[0] === n)[1], SY = 492;

  // forward: the trainer's walk, marking when each thing happens
  const M = {};
  const FWD = T.Path([SX('Pallet Town'), SY], 300).wait(1.1); M.route1 = FWD.t;
  FWD.go(SX('Route 1'), SY).wait(1.2); M.grind = FWD.t;
  FWD.go(SX('Viridian Forest'), SY).go(SX('Pewter City'), SY).go(SX('Mt. Moon'), SY).wait(1.4); M.gymGo = FWD.t;
  FWD.go(SX('Route 24'), SY).go(SX('Cerulean Gym'), SY); M.fight1 = FWD.t; FWD.wait(2.2); M.regrind = FWD.t;
  FWD.go(SX('Route 24'), SY); [0, 1, 2].forEach(() => FWD.go(SX('Route 24') + 70, SY).go(SX('Route 24'), SY)); M.retry = FWD.t;
  FWD.go(SX('Cerulean Gym'), SY); M.fight2 = FWD.t; FWD.wait(2.6);
  const FDUR = FWD.t;
  const level = t => t < M.grind ? 5 : t < M.gymGo ? Math.round(lerp(5, 18, clamp((t - M.grind) / 1.4))) : t < M.regrind ? 18 : Math.round(lerp(18, 26, clamp((t - M.regrind) / (M.retry - M.regrind))));

  // backward: reveal steps
  const BWD = [[.4, 'goal'], [1.8, 'types'], [3.2, 'pika'], [4.3, 'bulba'], [5.2, 'oddish'], [6.4, 'mapPika'], [7.2, 'mapBulba'], [8.0, 'mapOddish'], [9.2, 'done']];
  const BDUR = 13.5;
  const LEAF = [['pika', 'pikachu', 'Pikachu', 'Electric', 'Viridian Forest', 95, C.gold], ['bulba', 'bulbasaur', 'Bulbasaur', 'Grass', 'Pallet Town', 210, C.p2], ['oddish', 'oddish', 'Oddish', 'Grass', 'Route 24', 325, C.purple]];
  const where = { Pikachu: 'catch in Viridian Forest', Bulbasaur: 'pick it as the starter', Oddish: 'catch on Route 24' };

  function goalCard(g, lit, hp) {
    const x = 860, y = 195;
    card(g, x, y, 250, 300, { edge: lit ? C.goldInk : C.wall, fill: lit ? '#fde9b8' : '#fffaf0', lw: lit ? 4 : 3 });
    text(g, 'Misty, Cerulean Gym', x, y - 126, { size: 17, w: 700, display: true });
    pic(g, 'pk-staryu.png', x - 58, y - 30, 105); pic(g, 'pk-starmie.png', x + 56, y - 30, 115);
    text(g, 'Staryu Lv 18', x - 58, y + 40, { size: 14, col: C.muted }); text(g, 'Starmie Lv 21', x + 58, y + 40, { size: 14, col: C.muted });
    pill(g, 'Water', x, y + 78);
    if (hp != null) T.hp(x, y + 116, 180, hp, 1);
  }
  function fwdCard(g, x, a, title, arts, sub) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a; card(g, x, 195, 180, 230);
    text(g, title, x, 100, { size: 16, w: 700, display: true });
    arts.forEach(([n, dx, w]) => pic(g, n, x + dx, 180, w));
    sub.forEach((s, i) => text(g, s, x, 262 + i * 20, { size: 14, col: C.muted }));
    g.restore();
  }
  function strip(g, f) {
    g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(20, 400, W - 40, 168, 12); g.fill();
    text(g, 'The road to Cerulean (Pokémon Red and Blue)', 590, 420, { align: 'center', size: 14, col: C.muted });
    g.strokeStyle = C.floorLn; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(SX('Pallet Town'), SY); g.lineTo(SX('Cerulean Gym'), SY); g.stroke();
    STOPS.forEach(([n, x]) => {
      const lit = f.lit?.[n];
      g.fillStyle = lit || (n === 'Cerulean Gym' ? C.blue : '#fffaf0'); g.strokeStyle = C.navy; g.lineWidth = 3;
      g.beginPath(); g.arc(x, SY, lit ? 13 : 10, 0, Math.PI * 2); g.fill(); g.stroke();
      text(g, n, x, SY + 34, { size: 14, w: 600 });
    });
  }

  function draw(g, mode, t) {
    g.fillStyle = 'rgba(255,252,244,.55)'; g.beginPath(); g.roundRect(20, 20, W - 40, 370, 12); g.fill();
    if (mode === 'fwd') {
      const lost = t >= M.fight1 + .9, won = t >= M.fight2 + 1;
      fwdCard(g, 120, clamp(t / .5), 'Starter', [['pk-charmander.png', 0, 120]], ['Charmander: picked', 'because it looks cool']);
      fwdCard(g, 330, clamp((t - M.route1) / .5), 'Route 1', [['pk-pidgey.png', -40, 95], ['pk-rattata.png', 42, 95]], ['Pidgey and Rattata:', 'whatever showed up']);
      if (t >= M.grind) {
        g.save(); g.globalAlpha = clamp((t - M.grind) / .5); card(g, 540, 195, 180, 230);
        text(g, 'Grind', 540, 100, { size: 16, w: 700, display: true });
        text(g, `Lv ${level(t)}`, 540, 185, { size: 52, w: 800, display: true, col: t >= M.regrind ? C.redDk : C.ink });
        text(g, t >= M.regrind ? 'grinding again' : 'party level', 540, 262, { size: 14, col: C.muted });
        g.restore();
        arrow(g, [120, 195], [330, 195], C.ink, 3, { pad: 95 }); arrow(g, [330, 195], [540, 195], C.ink, 3, { pad: 95 });
      }
      if (t >= M.gymGo) arrow(g, [540, 195], [860, 195], C.ink, 3, { pad0: 95, pad1: 130 });
      const hp = t < M.fight1 ? 1 : t < M.regrind ? lerp(1, .68, clamp((t - M.fight1) / .8)) : t < M.fight2 ? 1 : lerp(1, 0, clamp((t - M.fight2) / .9));
      goalCard(g, false, hp);
      if (t >= M.fight1 && t < M.regrind) { T.stamp('Lost', 860, 120, C.redDk, clamp((t - M.fight1 - .9) / .3)); text(g, 'Water resists Charmander’s Fire moves', 690, 365, { size: 14, col: C.redDk, a: clamp((t - M.fight1 - .9) / .3) }); }
      if (t >= M.regrind) {   // the loop back to the grind
        g.save(); g.strokeStyle = C.redDk; g.lineWidth = 3; g.setLineDash([8, 7]); g.beginPath(); g.moveTo(800, 330); g.quadraticCurveTo(700, 385, 600, 318); g.stroke(); g.setLineDash([]); g.restore();
        arrow(g, [640, 350], [596, 314], C.redDk, 3);
      }
      if (won) T.stamp('Won at Lv 26', 860, 120, C.p2, clamp((t - M.fight2 - 1) / .3), 28);
      strip(g, {});
      T.trail(FWD.trail(Math.min(t, FDUR)).map(([x, y]) => [x, y - 4]), C.player, .6, 4);
      const p = FWD.at(Math.min(t, FDUR)); T.player(p.x, p.y, p.face, .75);
      T.label(lost ? (won ? '2 gym attempts' : '1 gym attempt, lost') : 'one party, found by walking', 40, 365, 'left', '#fff', 15, lost && !won ? C.redDk : C.player);
      return;
    }
    const L = timeline(BWD, t);
    goalCard(g, L.on('goal'));
    if (L.on('goal')) T.label('Goal: beat a Water team', 860, 32, 'center', C.goldInk, 15);
    if (L.on('types')) {
      const a = L.in('types');
      arrow(g, [860, 150], [650, 110], C.redDk, 4, { pad0: 125, pad1: 70, a }); arrow(g, [860, 240], [650, 280], C.redDk, 4, { pad0: 125, pad1: 70, a });
      pill(g, 'Electric', 650, 110, a, 17); pill(g, 'Grass', 650, 280, a, 17);
      T.label('What beats Water?', 650, 195, 'center', C.redDk, 15);
    }
    LEAF.forEach(([k, art, name, type, stop, y, col]) => {
      if (!L.on(k)) return; const a = L.in(k);
      arrow(g, [650, type === 'Electric' ? 110 : 280], [400, y], C.goldInk, 3, { pad0: 62, pad1: 128, a });
      g.save(); g.globalAlpha = a; card(g, 400, y, 250, 100, { edge: L.on('map' + k[0].toUpperCase() + k.slice(1)) ? col : '#cdbf9f', lw: 4 });
      pic(g, `pk-${art}.png`, 322, y, 82);
      text(g, name, 370, y - 16, { align: 'left', size: 17, w: 700, display: true }); text(g, where[name], 370, y + 14, { align: 'left', size: 14, col: C.muted });
      g.restore();
    });
    const lit = {};
    LEAF.forEach(([k, , , , stop, , col]) => { if (L.on('map' + k[0].toUpperCase() + k.slice(1))) lit[stop] = col; });
    strip(g, { lit });
    LEAF.forEach(([k, art, , , stop, , col]) => {
      const key = 'map' + k[0].toUpperCase() + k.slice(1); if (!L.on(key)) return;
      const a = L.in(key), x = SX(stop); pic(g, `pk-${art}.png`, x, SY - 40 + (1 - ease(a)) * 20, 62, { a });
    });
    if (L.on('done')) {
      g.save(); g.globalAlpha = L.in('done'); T.label('3 routes to one badge', 150, 330, 'center', '#fff', 17, C.p2);
      text(g, 'each one a different', 150, 268, { size: 15, col: C.muted }); text(g, 'first hour of the game', 150, 290, { size: 15, col: C.muted }); g.restore();
    }
  }

  slide('rv-pokemon', {
    fdur: FDUR, bdur: BDUR, draw,
    caps: {
      fwd: 'Forward, action first: pick a starter for its looks, catch whatever is nearby, grind, lose to Misty, grind again. One party, and the levels do the work.',
      back: 'Backward, goal first: Misty’s team is Water. What beats Water? Electric or Grass. Where are they? Pallet Town, Viridian Forest, Route 24. Three routes to the same badge.',
    },
    stats: {
      fwd: `<div class="r"><b>2</b><span>gym attempts, won by out-levelling</span></div>`,
      back: `<div class="g"><b>3</b><span>routes, found by asking what the goal needs</span></div>`,
    },
  });
})();
