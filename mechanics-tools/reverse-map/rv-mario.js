/* Reverse sequencing, take 4: a Super Mario World climb, seen from the level designer's chair (real SMW sprites, with the walk and run cycles).
   Forward: Mario runs at the wall, jumps twice, wanders back and happens to hit the ? block with the feather, then flies
   up. Backward: start at the Dragon Coin six tiles up and ask what lifts Mario that high (a cape, a trampoline, a vine),
   then where each one has to be placed: three routes, every one a block the designer put down working back from the coin. */
(function () {
  const { pic, arrow, text, timeline, slide } = RVK;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, TL = 48, GY = 517, WALL = 768, TOP = GY - 6 * TL, COIN = [888, TOP];
  const QF = [312, GY - 4 * TL], QV = [696, GY - 4 * TL], SPRING = 168;   // block top-left x centre / top y
  const px = { px: true, bottom: true };

  // which sprite a move shows at time tt: jumps use the jump pose, ground moves cycle SMW's walk frames (small Mario has
  // two), and the caped run switches to the arms-out run cycle once Mario is fast enough to take off
  function frame(s, tt) {
    const speed = Math.abs(s.x1 - s.x0) / (s.t1 - s.t0);
    if (s.h) return s.spr === 'smw-mario.png' ? 'smw-mario-jump.png' : s.spr;
    if (speed < 1 || s.y1 !== s.y0) return s.spr;
    if (s.spr === 'smw-mario.png') return `smw-mario-walk${1 + Math.floor(tt * 10) % 2}.png`;
    if (s.spr === 'smw-cape-mario.png') return speed > 330 ? `smw-cape-run${1 + Math.floor(tt * 16) % 4}.png` : `smw-cape-walk${1 + Math.floor(tt * 10) % 4}.png`;
    return s.spr;
  }
  // Mario's moves: [dur, x1, y1 (feet), jump height, sprite]; each starts where the last ended
  function Seq(x, y) {
    const segs = []; let t = 0;
    const api = {
      add(d, x1, y1, h = 0, spr = 'smw-mario.png') { segs.push({ t0: t, t1: t + d, x0: x, y0: y, x1, y1, h, spr }); t += d; x = x1; y = y1; return api; },
      get t() { return t; },
      at(tt) {
        const s = segs.find(s => tt < s.t1) || segs.at(-1), k = clamp((tt - s.t0) / (s.t1 - s.t0));
        return { x: lerp(s.x0, s.x1, k), y: lerp(s.y0, s.y1, k) - s.h * 4 * k * (1 - k), spr: frame(s, tt), left: s.x1 < s.x0 - 1 || (s.x1 === s.x0 && s.left), k, s };
      },
      trail(tt) { const o = []; for (let q = 0; q <= Math.min(tt, t); q += .04) { const p = api.at(q); o.push([p.x, p.y - 30]); } return o; },
    };
    return api;
  }
  const M = {};
  const F = Seq(80, GY).add(.5, 80, GY).add(2.1, 735, GY); M.jump1 = F.t;
  F.add(.7, 735, GY, 100).add(.25, 735, GY).add(.7, 735, GY, 100); M.tooHigh = F.t; F.add(.6, 735, GY);
  F.add(1.4, QF[0], GY); M.hit = F.t + .3; F.add(.6, QF[0], GY, 84); M.cape = F.t + .9; F.add(1.1, QF[0], GY);
  F.add(.7, 140, GY, 0, 'smw-cape-mario.png').add(1.2, 560, GY, 0, 'smw-cape-mario.png'); M.fly = F.t;
  F.add(1.3, COIN[0] - 20, TOP, 120, 'smw-cape-fly.png'); M.got = F.t; F.add(1.8, COIN[0] - 20, TOP, 0, 'smw-cape-mario.png');
  const FDUR = F.t;
  // load every animation frame up front so the first loop does not skip any
  ['smw-mario-walk1', 'smw-mario-walk2', 'smw-cape-walk1', 'smw-cape-walk2', 'smw-cape-walk3', 'smw-cape-walk4', 'smw-cape-run1', 'smw-cape-run2', 'smw-cape-run3', 'smw-cape-run4', 'smw-mario-jump', 'smw-cape-fly'].forEach(n => RVK.img(n + '.png'));

  const BWD = [[.4, 'goal'], [1.8, 'ask'], [3.3, 'cape'], [4.5, 'spring'], [5.7, 'vine'], [7.1, 'rCape'], [8.1, 'rSpring'], [9.1, 'rVine'], [10.3, 'done']];
  const BDUR = 14;
  const OPT = [['cape', 'smw-cape-fly.png', 'Fly with a cape', 112, C.purple, 72], ['spring', 'smw-trampoline.png', 'Bounce on a trampoline', 196, C.p2, 44], ['vine', 'smw-vine.png', 'Climb a vine', 280, C.goldInk, 44]];
  // the walked route for each, start to coin
  const ROUTES = {
    rCape: [[80, GY - 30], [QF[0], GY - 30], [QF[0], QF[1] + 70], [QF[0], GY - 30], [560, GY - 30], [700, TOP - 60], [COIN[0] - 20, TOP - 30]],
    rSpring: [[80, GY - 24], [SPRING, GY - 24], [740, GY - 24], [740, TOP - 70], [COIN[0] - 40, TOP - 34]],
    rVine: [[80, GY - 36], [QV[0], GY - 36], [QV[0], QV[1] + 70], [QV[0], TOP - 20], [COIN[0] - 60, TOP - 40]],
  };

  function scene(g, o) {
    g.save(); g.beginPath(); g.roundRect(20, 20, W - 40, 545, 12); g.clip();
    const sky = g.createLinearGradient(0, 20, 0, GY); sky.addColorStop(0, '#8fcff2'); sky.addColorStop(1, '#e4f4fc'); g.fillStyle = sky; g.fillRect(20, 20, W - 40, 545);
    [[150, 90], [420, 60], [610, 120]].forEach(([x, y]) => { g.fillStyle = 'rgba(255,255,255,.85)'; [[0, 0, 26], [28, -8, 32], [58, 0, 24]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill(); }); });
    for (let x = 0; x < W; x += TL) pic(g, 'smw-ground.png', x + TL / 2, GY + TL, TL, px);
    for (let x = WALL; x < W; x += TL) for (let y = TOP; y < GY; y += TL) pic(g, 'smw-hard-block.png', x + TL / 2, y + TL, TL, px);
    // blocks: the feather block turns used once hit (forward), the vine block sprouts in the backward preview
    pic(g, o.featherUsed ? 'smw-used-block.png' : 'smw-qblock.png', QF[0], QF[1] + TL, TL, px);
    pic(g, 'smw-qblock.png', QV[0], QV[1] + TL, TL, px);
    if (o.vine > 0) { const top = lerp(QV[1], TOP - 40, o.vine); for (let y = QV[1]; y > top + 10; y -= TL) pic(g, 'smw-vine.png', QV[0], y, TL, { ...px, a: o.vineA }); pic(g, 'smw-vine-top.png', QV[0], top + 10, 45, { ...px, a: o.vineA }); }
    pic(g, 'smw-trampoline.png', o.springX ?? SPRING, GY, TL, px);
    if (!o.coinGone) pic(g, 'smw-dragon-coin.png', COIN[0], TOP - 4 + Math.sin(o.t * 3) * 3, 46, px);
    o.extra?.(g);
    g.restore();
    g.strokeStyle = C.floorLn; g.lineWidth = 3; g.beginPath(); g.roundRect(20, 20, W - 40, 545, 12); g.stroke();
  }
  const glow = (g, x, y, r, col, a = 1) => { g.save(); g.globalAlpha = a * .55; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.restore(); };

  function draw(g, mode, t) {
    if (mode === 'fwd') {
      const p = F.at(Math.min(t, FDUR));
      scene(g, { t, featherUsed: t >= M.hit, coinGone: t >= M.got, extra: g => {
        T.trail(F.trail(t), '#fff', .9, 4);
        if (t >= M.hit && t < M.cape) { const k = (t - M.hit) / (M.cape - M.hit); pic(g, 'smw-feather.png', QF[0] + Math.sin(k * 9) * 26, lerp(QF[1] - 10, GY - 50, k) + 21, 42, px); }
        const im = RVK.img(p.spr);   // every sprite at 3x its pixel size
        pic(g, p.spr, p.x, p.y, (im.naturalWidth || 14) * 3, { ...px, flip: p.left });
      } });
      if (t >= M.jump1 + .3 && t < M.tooHigh + 1.6) T.popText('Too high!', 600, 250, C.redDk, 1);
      if (t >= M.hit && t < M.hit + 1.2) T.popText('A feather!', QF[0], QF[1] - 30, C.purple, 1.2 - (t - M.hit));
      if (t >= M.got) T.stamp('Got the Dragon Coin', 470, 120, C.p2, clamp((t - M.got) / .3), 26);
      T.label(t >= M.got ? '1 route, found by trying things' : 'run, jump, look around', 40, 548, 'left', '#fff', 15, C.player);
      return;
    }
    const L = timeline(BWD, t);
    scene(g, { t, vine: L.on('vine') ? ease(L.in('vine', .8)) : 0, vineA: .55, extra: g => {
      if (L.on('goal')) glow(g, COIN[0], TOP - 40, 52, C.gold, L.in('goal'));
      if (L.on('cape')) glow(g, QF[0], QF[1] + 24, 40, C.purple, L.in('cape'));
      if (L.on('spring')) glow(g, SPRING, GY - 24, 40, C.p2, L.in('spring'));
      if (L.on('vine')) glow(g, QV[0], QV[1] + 24, 40, C.gold, L.in('vine'));
      [['rCape', C.purple], ['rSpring', C.p2], ['rVine', C.goldInk]].forEach(([k, col]) => { if (L.on(k)) T.trail(ROUTES[k].slice(0, 1 + Math.ceil((ROUTES[k].length - 1) * L.in(k, .8))), col, 1, 5); });
      pic(g, 'smw-mario.png', 80, GY, 42, px);
    } });
    if (L.on('goal')) T.label('Goal: the Dragon Coin, 6 tiles up', 888, 140 - 40, 'center', C.goldInk, 15);
    if (L.on('ask')) {
      T.label('What lifts Mario that high?', 560, 52, 'center', C.redDk, 16);
      OPT.forEach(([k, spr, name, y, col, w], i) => {
        const a = clamp((t - L.at('ask') - i * .25) / .4); if (a <= 0) return;
        g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(255,252,244,.94)'; g.strokeStyle = L.on(k) ? col : C.floorLn; g.lineWidth = 3;
        g.beginPath(); g.roundRect(440, y - 30, 260, 60, 12); g.fill(); g.stroke();
        pic(g, spr, 478, y, w * .75, { px: true }); text(g, name, 510, y, { align: 'left', size: 16, w: 700 }); g.restore();
        arrow(g, [COIN[0] - 30, TOP - 40], [700, y], C.redDk, 3, { pad0: 20, pad1: 6, a });
      });
    }
    const link = (k, from, to, col, lab, lx, ly) => { if (!L.on(k)) return; const a = L.in(k); arrow(g, from, to, col, 4, { pad1: 30, a }); g.save(); g.globalAlpha = a; T.label(lab, lx, ly, 'center', col, 14); g.restore(); };
    link('cape', [440, 112], [QF[0], QF[1] + 24], C.purple, 'a feather in a ? block', QF[0], QF[1] - 30);
    link('spring', [440, 196], [SPRING, GY - 30], C.p2, 'a trampoline to carry', SPRING, GY - 90);
    link('vine', [600, 310], [QV[0], QV[1] + 24], C.goldInk, 'a vine in a ? block', QV[0] - 40, QV[1] + 90);
    if (L.on('done')) { g.save(); g.globalAlpha = L.in('done'); T.label('3 routes, each one a block placed back from the coin', 40 + 4, 548, 'left', '#fff', 15, C.p2); g.restore(); }
  }

  slide('rv-mario', {
    fdur: FDUR, bdur: BDUR, draw,
    caps: {
      fwd: 'Forward, action first: run at the wall, jump, too high. Wander back, bump a ? block by chance, get the cape, fly up. One route, found by luck.',
      back: 'Backward, goal first: the coin is six tiles up. What lifts Mario that high? A cape, a trampoline, a vine. Each answer is a block to place earlier in the level: three routes.',
    },
    stats: {
      fwd: `<div><b>1</b><span>route, found by trial and error</span></div>`,
      back: `<div class="g"><b>3</b><span>routes, each placed working back from the goal</span></div>`,
    },
  });
})();
