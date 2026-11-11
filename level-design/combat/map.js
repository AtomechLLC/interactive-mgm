/* Saltworks: an original three-lane arena drawn with ../shared/plan.js, as a structural study of Dust II (Counter-Strike).
   Borrowed from the reference: one long open lane that rewards range, a middle lane squeezed through a single doorway
   that gives the fastest rotation, a tight tunnel lane for close-range fights, short connectors from mid into both
   outer lanes, and spawns set one room back from every lane mouth. Not borrowed: the room shapes, proportions and
   names. The reference is asymmetric with two bomb sites; this map is mirrored left to right for team deathmatch.
   FPSMAP.build() returns { P, lanes, bases, W, H }. lanes[k] is a room route from the west base to the east base. */
(function (root) {
  const W = 1040, H = 585;
  function build() {
    const P = root.PLAN.make(), MX = x => W - x;
    const BLUE = '#e3ecfa', PEACH = '#f7e3d6', SAND = '#efe4cc';
    // west half: [id, mirrored id, x0, y0, x1, y1, options]
    const half = [
      ['A', 'B', 30, 215, 150, 370, { lab: 'west spawn', tint: BLUE }],
      ['An', 'Bn', 30, 50, 150, 215, {}],
      ['As', 'Bs', 30, 370, 150, 535, {}],
      ['M1', 'rM1', 150, 250, 330, 335, {}],
      ['MidW', 'MidE', 330, 200, 520, 385, { cham: [0, 3], k: 30, tint: SAND }],
      ['cN', 'rcN', 400, 140, 470, 200, {}],
      ['cS', 'rcS', 370, 385, 440, 430, {}],
      ['T1', 'rT1', 150, 450, 300, 535, {}],
      ['T2', 'rT2', 300, 430, 450, 535, {}],
    ];
    half.forEach(([id, , x0, y0, x1, y1, o]) => P.rect(id, x0, y0, x1, y1, o));
    half.forEach(([id, mid, , , , , o]) => P.poly(mid, P.rooms[id].pts.map(p => [MX(p[0]), p[1]]).reverse(), { ...o, lab: o.lab ? 'east spawn' : undefined, tint: o.lab ? PEACH : o.tint }));
    P.rect('Long', 150, 50, 890, 140, { lab: 'Long Dock' });
    P.rect('Tmid', 450, 430, 590, 535, { lab: 'Pump Tunnels' });
    const twin = Object.fromEntries(half.map(h => [h[0], h[1]])); twin.Long = 'Long'; twin.Tmid = 'Tmid';
    const door = (a, b, x, y, deg) => { P.door(a, b, [x, y], deg, 'gap'); if (twin[a] !== a || twin[b] !== b) P.door(twin[a], twin[b], [MX(x), y], deg, 'gap'); };
    door('A', 'An', 90, 215, 0); door('A', 'As', 90, 370, 0); door('A', 'M1', 150, 305, 90);
    door('An', 'Long', 150, 95, 90); door('M1', 'MidW', 330, 272, 90);
    door('MidW', 'cN', 435, 200, 0); door('cN', 'Long', 435, 140, 0);
    door('MidW', 'cS', 405, 385, 0); door('cS', 'T2', 405, 430, 0);
    door('As', 'T1', 150, 472, 90); door('T1', 'T2', 300, 513, 90); door('T2', 'Tmid', 450, 455, 90);   // staggered, so no shot runs the length of the tunnels
    P.door('MidW', 'MidE', [520, 330], 90, 'gap');   // the one doorway in the middle lane
    P.rooms.MidW.lab = 'Brine Doors'; P.rooms.MidW.labAt = [520, 228];
    // dressing only: props sit against walls and do not block shots or movement
    [[250, 62], [790, 62], [520, 62]].forEach(([x, y], i) => P.prop('crate', x, y, 8, i * .4));
    [[345, 300], [695, 300]].forEach(([x, y]) => P.prop('column', x, y - 62, 7));
    [[462, 523], [578, 523]].forEach(([x, y]) => P.prop('crate', x, y, 7, .3));
    // theme: a tidal salt works. The west half makes the salt (pan house, rake walk, coal for the fires); the east half ships it
    // (packing shed, tub line, cooperage), so the two mirrored halves read as different places. Dressing only: see theme.js.
    const planProps = [[250, 62, 8], [790, 62, 8], [520, 62, 8], [462, 523, 7], [578, 523, 7]].map(([x, y, r]) => ({ type: 'crate', x, y, r })).concat([[345, 238], [695, 238]].map(([x, y]) => ({ type: 'column', x, y, r: 7 })));
    const mat = { Long: 'plank', An: 'cobble', Bn: 'cobble', A: 'slab', B: 'plank', M1: 'slab', rM1: 'slab', MidW: 'salt', MidE: 'salt', cN: 'plank', rcN: 'plank', cS: 'brick', rcS: 'brick', As: 'soot', Bs: 'plank', T1: 'brick', rT1: 'brick', T2: 'brick', rT2: 'brick', Tmid: 'brick' };
    const names = { A: 'Pan House\nwest spawn', B: 'Packing Shed\neast spawn', An: 'Weighbridge', Bn: 'Sack Yard', As: 'Coal Store', Bs: 'Cooperage', M1: 'Rake Walk', rM1: 'Tub Line', MidE: 'Salt Pans', T1: 'Old Culvert', rT1: 'Barrel Run' };
    Object.entries(mat).forEach(([id, m]) => { const r = P.rooms[id]; r.mat = m; if (!r.tint || r.tint === SAND) r.tint = root.FPSTHEME ? root.FPSTHEME.MATS[m].tint : r.tint; });
    Object.entries(names).forEach(([id, n]) => P.rooms[id].lab = n);
    P.rooms.Long.sky = P.rooms.An.sky = P.rooms.Bn.sky = P.rooms.MidW.sky = P.rooms.MidE.sky = true;   // open to the sky in first person
    P.rooms.MidE.labAt = [640, 300]; P.rooms.M1.labAt = [240, 322]; P.rooms.rM1.labAt = [800, 262];
    const theme = {
      name: 'a tidal salt works', planProps,
      decals: [
        { type: 'beam', at: [[520, 44], [520, 146]] },                                         // gantry crane over the dock: the long lane's landmark
        { type: 'plate', at: [58, 105, 64, 70] },                                              // weighbridge
        { type: 'pan', at: [345, 300, 62, 66] }, { type: 'pan', at: [418, 222, 78, 44], col: '#e9c9cf' }, { type: 'pan', at: [345, 222, 44, 60] },
        { type: 'pan', at: [540, 222, 150, 50], col: '#e9c9cf' }, { type: 'pan', at: [632, 300, 62, 66] }, { type: 'pan', at: [548, 345, 70, 30] },
        { type: 'rail', at: [712, 322, 890] }, { type: 'rail', at: [890, 322, 1004] },
        { type: 'pipe', at: [[158, 458], [292, 458], [292, 438], [442, 438], [458, 438], [582, 438], [598, 438], [748, 438], [748, 458], [882, 458]] },
        { type: 'grate', at: [378, 398, 22, 20] }, { type: 'grate', at: [640, 398, 22, 20] },
        { type: 'glow', at: [225, 492, 46] }, { type: 'glow', at: [375, 482, 46] }, { type: 'glow', at: [520, 482, 50] }, { type: 'glow', at: [665, 482, 46] }, { type: 'glow', at: [815, 492, 46] },
      ],
      props: [
        // Long Dock: gantry legs, bollards on the quay edge, salt waiting for the boat
        { type: 'post', x: 520, y: 58, r: 4 }, { type: 'post', x: 520, y: 132, r: 4 },
        ...[190, 330, 440, 600, 700, 850].map(x => ({ type: 'bollard', x, y: 57, r: 3.5 })),
        { type: 'heap', x: 205, y: 126, r: 11 }, { type: 'heap', x: 640, y: 127, r: 10 }, { type: 'sacks', x: 730, y: 128, r: 9 }, { type: 'sacks', x: 865, y: 62, r: 9 },
        // west: making salt
        { type: 'stack', x: 50, y: 236, r: 13 }, { type: 'vat', x: 52, y: 348, r: 13 }, { type: 'vat', x: 128, y: 350, r: 11 },
        { type: 'rack', x: 205, y: 259, r: 8 }, { type: 'rack', x: 275, y: 259, r: 8 }, { type: 'heap', x: 165, y: 325, r: 7 },
        { type: 'coal', x: 48, y: 517, r: 13 }, { type: 'coal', x: 132, y: 388, r: 10 }, { type: 'coal', x: 46, y: 392, r: 8 },
        { type: 'heap', x: 132, y: 66, r: 10 },
        // east: shipping it
        { type: 'sacks', x: 992, y: 236, r: 10 }, { type: 'sacks', x: 990, y: 350, r: 10 }, { type: 'sacks', x: 908, y: 352, r: 8 }, { type: 'barrel', x: 912, y: 232, r: 7 },
        { type: 'tub', x: 760, y: 322, r: 8 }, { type: 'tub', x: 960, y: 322, r: 8 },
        { type: 'sacks', x: 1000, y: 70, r: 10 }, { type: 'sacks', x: 1000, y: 105, r: 9 }, { type: 'sacks', x: 905, y: 200, r: 9 }, { type: 'barrel', x: 968, y: 64, r: 7 },
        { type: 'barrel', x: 906, y: 520, r: 8 }, { type: 'barrel', x: 924, y: 506, r: 8 }, { type: 'barrel', x: 998, y: 520, r: 8 }, { type: 'barrel', x: 1000, y: 386, r: 8 }, { type: 'barrel', x: 984, y: 398, r: 7 },
        // middle: the sluice at the one doorway, and the pump under it
        { type: 'valve', x: 520, y: 296, r: 7 }, { type: 'valve', x: 520, y: 364, r: 7 },
        { type: 'pump', x: 520, y: 517, r: 11 },
      ],
    };
    const lanes = {
      long: ['A', 'An', 'Long', 'Bn', 'B'],
      mid: ['A', 'M1', 'MidW', 'MidE', 'rM1', 'B'],
      tun: ['A', 'As', 'T1', 'T2', 'Tmid', 'rT2', 'rT1', 'Bs', 'B'],
    };
    const laneOf = { A: 'spawn', B: 'spawn', Long: 'long', An: 'long', Bn: 'long', M1: 'mid', rM1: 'mid', MidW: 'mid', MidE: 'mid', As: 'tun', Bs: 'tun', T1: 'tun', rT1: 'tun', T2: 'tun', rT2: 'tun', Tmid: 'tun', cN: 'link', rcN: 'link', cS: 'link', rcS: 'link' };
    return { P, lanes, laneOf, bases: ['A', 'B'], W, H, theme };
  }
  root.FPSMAP = { build, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
