/* The one street most slides in this deck dress. EA.street(g, o) draws it and returns the shapes that matter to play.
   o.d: detail level 0..3 for { walls, ground, open, props } (a single number sets all four)
   o.red: true when red is used freely, false when it is kept for the explosive barrels
   o.drift: the art pass changes two play shapes (a narrower doorway, a lower piece of cover)
   o.groundL: pavement lightness.  o.noise: brick contrast on every wall.  o.wallL: shifts every wall's lightness. */
(function () {
  const E = EA, W = 1040, H = 585, GY = 432;
  E.W = W; E.H = H; E.GY = GY;
  E.street = function (g, o = {}) {
    const d = typeof o.d === 'number' ? { walls: o.d, ground: o.d, open: o.d, props: o.d } : o.d || { walls: 3, ground: 3, open: 3, props: 3 };
    const red = o.red !== false, RED = [4, 68, 48], wl = o.wallL || 0, nz = o.noise || 0, drift = !!o.drift;
    const B = [
      { x: -10, w: 270, h: 330, hue: 38, s: 34, l: 79, roof: 'tile', bays: 3, door: { bay: 1, kind: 'open', w: drift ? 38 : 58 }, shut: red ? [4, 56, 44] : [190, 28, 42], boxes: 1, seed: 3, lamp: 1 },
      { x: 260, w: 300, h: 268, hue: 16, s: 36, l: 72, bays: 3, door: { bay: 1, kind: 'boarded', col: [200, 26, 36] }, awning: red ? [E.hsl(4, 66, 50), E.hsl(40, 40, 90)] : [E.hsl(40, 52, 60), E.hsl(40, 40, 90)], seed: 5, pipe: 1, boxes: 1 },
      { x: 560, w: 230, h: 352, hue: 206, s: 16, l: 76, roof: 'tile', bays: 2, shut: [24, 34, 40], seed: 8 },
      { x: 790, w: 260, h: 256, hue: 44, s: 34, l: 78, bays: 3, door: { bay: 1, kind: 'open', frame: red ? E.hsl(4, 60, 52) : null }, seed: 11, pipe: 1 },
    ];
    E.sky(g, W, GY, d.walls);
    B.forEach(b => E.building(g, { ...b, l: b.l + wl, noise: nz, dw: d.walls, dop: d.open }, GY));
    E.ground(g, W, H, GY, d.ground, { l: o.groundL ?? 58, noise: o.groundNoise });
    const p = d.props;
    if (d.walls >= 1) {
      E.poster(g, 290, 250, 32, 44, red ? RED : [206, 30, 46], p, 1); E.poster(g, 326, 258, 26, 36, red ? [22, 80, 54] : [80, 22, 50], p, 2);
      E.sign(g, 640, 268, 70, red ? RED : [222, 34, 36], p);
    }
    E.planter(g, 42, GY + 14, 1, p, { seed: 4 }); E.lamp(g, 548, GY + 12, 1, p); E.bench(g, 985, GY + 16, 1, p);
    E.barrel(g, 738, GY + 30, 1, p, { col: RED, hazard: 1 }); E.barrel(g, 492, GY + 26, 1, p, { col: RED, hazard: 1 }); E.barrel(g, 776, GY + 38, 1, p);
    const low = { name: 'low cover', x: 379, y: GY + 66 - 58, w: 62, h: 58 }, high = { name: 'high cover', x: 632, y: GY + 78 - 116, w: 66, h: 116 };
    if (drift && p >= 1) E.planter(g, 410, GY + 66, 1.5, p, { seed: 9 }); else E.crate(g, 410, GY + 66, 1, p);
    E.crate(g, 665, GY + 78, 1.07, p, { h: 108.4 });
    const doorA = { name: 'doorway', x: 96, y: GY - 112, w: 58, h: 112 }, doorD = { name: 'doorway', x: 891, y: GY - 112, w: 58, h: 112 };
    return {
      block: [doorA, low, high, doorD],
      art: drift ? [{ ...doorA, x: 106, w: 38, changed: 1 }, { ...low, x: 362, w: 96, y: GY + 66 - 39, h: 39, changed: 1 }, high, doorD] : [doorA, low, high, doorD],
      count: red ? 9 : 2,
    };
  };
})();
