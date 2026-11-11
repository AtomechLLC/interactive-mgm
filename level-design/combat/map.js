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
    const lanes = {
      long: ['A', 'An', 'Long', 'Bn', 'B'],
      mid: ['A', 'M1', 'MidW', 'MidE', 'rM1', 'B'],
      tun: ['A', 'As', 'T1', 'T2', 'Tmid', 'rT2', 'rT1', 'Bs', 'B'],
    };
    const laneOf = { A: 'spawn', B: 'spawn', Long: 'long', An: 'long', Bn: 'long', M1: 'mid', rM1: 'mid', MidW: 'mid', MidE: 'mid', As: 'tun', Bs: 'tun', T1: 'tun', rT1: 'tun', T2: 'tun', rT2: 'tun', Tmid: 'tun', cN: 'link', rcN: 'link', cS: 'link', rcS: 'link' };
    return { P, lanes, laneOf, bases: ['A', 'B'], W, H };
  }
  root.FPSMAP = { build, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
