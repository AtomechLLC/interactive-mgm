/* Five more arenas for the same twenty tokens, each lopsided on purpose. Saltworks (map.js) is mirrored, so it can only
   show what the squads do. These three give each spawn a different map to fight on, and each is built around
   environmental features that some tokens can use and others cannot. All three are our own layouts.

   1. Kiln Terraces    the west spawn owns a raised terrace over the yard; the east gets a vent under it and a door into the yard
   2. Glass Arcade     a gallery looks through breakable glass into the atrium; the east has a stair between them, the west an unlit stockroom
   3. Sluice Reactor   every lane carries a hazard from the PvE hazards page (pve-interactions/hazards), and the two spawns
                       meet different ones on the way to the middle

   4. Tannery Wings    manor-style geometry (a round tower, an aisle and hall of different widths, a wing turned 20 degrees):
                       a long clear gallery against short routes lined with nine hazards
   5. Cistern Fork     a one-exit spawn in a turned wing against a two-exit round tower, around an eight-sided cistern
   Maps 1 to 3 share a rectangular frame, so their lopsidedness is in the features. Maps 4 and 5 are lopsided in shape:
   different spawn rooms, a different number of exits, routes of different lengths, and walls off the grid, after the
   manor plans in ../shared/manorgen.js.

   Each build() returns what FPSMAP.build() returns, plus what sim.js reads for features:
     doors of kind 'window' (see-through, breakable), 'vent' (small units only), 'ledge' (a one-way drop from the first room named)
     rooms with high: true or dark: true
     cover [[x, y]...]      crates that halve a shot crossing them
     posts [{ side, keys, x, y, room }]   where holding tokens set up; side 0 is whoever spawns in the west
     hazards [...]          see hazards() in sim.js
     features [...]         what the page lists and counts: { name, kind or hz, at, min, who, text }
     script [...]           the lines of the ideal session this map is judged on */
(function (root) {
  const W = 1040, H = 585;
  const BLUE = '#e3ecfa', PEACH = '#f7e3d6', SAND = '#efe4cc', HIGH = '#f6dcae', DARK = '#b9b4c4';
  // the outer frame every map shares: a spawn at each end with a room north and south of it
  function frame(P) {
    P.rect('A', 30, 230, 140, 360, { lab: 'west spawn', tint: BLUE }); P.rect('B', 900, 230, 1010, 360, { lab: 'east spawn', tint: PEACH });
    P.rect('An', 30, 60, 140, 230, {}); P.rect('As', 30, 360, 140, 535, {});
    P.rect('Bn', 900, 60, 1010, 230, {}); P.rect('Bs', 900, 360, 1010, 535, {});
    P.door('A', 'An', [85, 230], 0, 'gap'); P.door('A', 'As', [85, 360], 0, 'gap'); P.door('B', 'Bn', [955, 230], 0, 'gap'); P.door('B', 'Bs', [955, 360], 0, 'gap');
  }
  const door = (P, a, b, x, y, deg, kind = 'gap', gw) => { P.door(a, b, [x, y], deg, kind); if (gw) P.doors[P.doors.length - 1].gw = gw; };
  const crates = (P, list) => list.forEach(([x, y], i) => P.prop('crate', x, y, 9, i * .5));
  const lanesOf = (lanes, links) => { const o = { A: 'spawn', B: 'spawn' }; Object.entries(lanes).forEach(([k, r]) => r.slice(1, -1).forEach(id => o[id] = k)); links.forEach(id => o[id] = 'link'); return o; };

  /* ---- 1. Kiln Terraces: height ---- */
  function terraces() {
    const P = root.PLAN.make(); frame(P);
    P.rect('Ter', 140, 60, 470, 170, { lab: 'Upper Terrace', tint: HIGH, high: true, labAt: [290, 82] });
    P.rect('Duct', 140, 170, 330, 250, { tint: '#e2dccb' });
    P.rect('Wm', 140, 250, 330, 340, {});
    P.rect('Yard', 330, 170, 700, 400, { lab: 'Kiln Yard', tint: SAND, labAt: [560, 372] });
    P.rect('Ramp', 470, 60, 760, 170, { lab: 'Loading Ramp' });
    P.rect('Bw', 760, 60, 900, 230, {});
    P.rect('Em', 700, 250, 900, 340, {});
    P.rect('K1', 140, 440, 330, 535, {}); P.rect('K2', 330, 440, 520, 535, { lab: 'Kiln Row' }); P.rect('K3', 520, 440, 710, 535, {}); P.rect('K4', 710, 400, 900, 535, {});
    P.rect('cS', 400, 400, 470, 440, {});
    door(P, 'An', 'Ter', 140, 115, 90); door(P, 'Ter', 'Ramp', 470, 115, 90); door(P, 'Ramp', 'Bw', 760, 115, 90); door(P, 'Bw', 'Bn', 900, 145, 90);
    door(P, 'A', 'Wm', 140, 295, 90); door(P, 'Wm', 'Yard', 330, 295, 90); door(P, 'Yard', 'Em', 700, 295, 90); door(P, 'Em', 'B', 900, 295, 90);
    door(P, 'Ramp', 'Yard', 640, 170, 0);
    door(P, 'Ter', 'Yard', 400, 170, 0, 'ledge', 120);                      // the overlook: see both ways, drop down only
    door(P, 'Duct', 'Ter', 235, 170, 0, 'vent', 22); door(P, 'Duct', 'Yard', 330, 210, 90, 'vent', 22);   // under the terrace and up behind its defenders
    door(P, 'As', 'K1', 140, 490, 90); door(P, 'K1', 'K2', 330, 470, 90); door(P, 'K2', 'K3', 520, 510, 90); door(P, 'K3', 'K4', 710, 470, 90); door(P, 'K4', 'Bs', 900, 470, 90);
    door(P, 'Yard', 'cS', 435, 400, 0); door(P, 'cS', 'K2', 435, 440, 0);
    P.stairs([146, 115], [186, 115], 40, 5); P.stairs([464, 115], [424, 115], 40, 5);
    const cover = [[430, 300], [600, 300], [515, 245], [515, 350], [640, 235]]; crates(P, cover);
    const lanes = { long: ['A', 'An', 'Ter', 'Ramp', 'Bw', 'Bn', 'B'], mid: ['A', 'Wm', 'Yard', 'Em', 'B'], tun: ['A', 'As', 'K1', 'K2', 'K3', 'K4', 'Bs', 'B'] };
    return {
      key: 'terraces', name: 'Kiln Terraces', theme: 'height', P, lanes, laneOf: lanesOf(lanes, ['Duct', 'cS']), bases: ['A', 'B'], W, H, cover,
      laneNames: { long: 'the terrace', mid: 'the yard', tun: 'Kiln Row' },
      lopsided: 'The west spawn is two rooms from a terrace that looks down into the yard. The east spawn has to cross that yard, or take the one door onto the terrace, or send something small through the vent beneath it.',
      posts: [{ side: 0, keys: ['marksman', 'psion'], x: 400, y: 152, room: 'Ter' }, { side: 0, keys: ['rocketeer', 'trooper'], x: 352, y: 150, room: 'Ter' }, { side: 0, keys: ['heavy-gunner'], x: 448, y: 150, room: 'Ter' }, { side: 1, keys: ['marksman', 'psion'], x: 868, y: 295, room: 'Em' }],
      features: [
        { name: 'The overlook', kind: 'high', at: [400, 170], min: 150, who: 'Marksman, Rocketeer, Heavy Gunner', text: 'A ledge along the terrace. A token up here reaches a quarter further and hits 15% harder shooting down, takes 15% less from below, and ignores the crates. Units can drop off it but cannot climb it.' },
        { name: 'Yard crates', kind: 'cover', at: [515, 300], min: 80, who: 'Rifleman, Trooper, Medic', text: 'A crate between a shooter and a token standing against it stops half the shot. Grenades, melee and anything fired from the terrace ignore it, so the crates protect against the far doorway and not against the overlook.' },
        { name: 'The crawlway', kind: 'vent', at: [235, 210], min: 4, who: 'Xeno Swarm, Hover Drone, Repair Bot', text: 'A vent under the terrace, from the yard up to the back of the terrace. Only small tokens fit: the swarm and the drones. It is the one route to the terrace that the terrace cannot see.' },
      ],
      script: ['front', 'lanes', 'edge', 'feat'],
    };
  }

  /* ---- 2. Glass Arcade: sight without passage, and darkness ---- */
  function arcade() {
    const P = root.PLAN.make(); frame(P);
    P.rect('Gal', 140, 60, 900, 150, { lab: 'Gallery' });
    P.rect('Atr', 300, 150, 740, 400, { lab: 'Atrium', tint: SAND, labAt: [520, 380] });
    P.rect('Wm', 140, 250, 300, 340, {});
    P.rect('Stair', 740, 150, 900, 230, { lab: 'East Stair' });
    P.rect('Em', 740, 230, 900, 340, {});
    P.rect('Stock', 140, 400, 420, 535, { lab: 'Unlit Stockroom', tint: DARK, dark: true, labAt: [280, 510] });
    P.rect('S2', 420, 440, 680, 535, { lab: 'Service Hall' }); P.rect('S3', 680, 400, 900, 535, {});
    door(P, 'An', 'Gal', 140, 105, 90); door(P, 'Gal', 'Bn', 900, 105, 90);
    door(P, 'A', 'Wm', 140, 295, 90); door(P, 'Wm', 'Atr', 300, 295, 90); door(P, 'Atr', 'Em', 740, 295, 90); door(P, 'Em', 'B', 900, 295, 90);
    [400, 520, 640].forEach(x => door(P, 'Gal', 'Atr', x, 150, 0, 'window', 54));
    door(P, 'S3', 'Atr', 710, 400, 0, 'window', 40);
    door(P, 'Gal', 'Stair', 820, 150, 0); door(P, 'Stair', 'Em', 820, 230, 0);   // only the east can turn from the gallery into the middle
    door(P, 'As', 'Stock', 140, 470, 90); door(P, 'Stock', 'Atr', 360, 400, 0); door(P, 'Stock', 'S2', 420, 490, 90); door(P, 'S2', 'S3', 680, 490, 90); door(P, 'S3', 'Bs', 900, 470, 90);
    const cover = [[420, 290], [520, 230], [620, 290], [520, 340]]; crates(P, cover);
    const lanes = { long: ['A', 'An', 'Gal', 'Bn', 'B'], mid: ['A', 'Wm', 'Atr', 'Em', 'B'], tun: ['A', 'As', 'Stock', 'S2', 'S3', 'Bs', 'B'] };
    return {
      key: 'arcade', name: 'Glass Arcade', theme: 'glass and darkness', P, lanes, laneOf: lanesOf(lanes, ['Stair']), bases: ['A', 'B'], W, H, cover, glass: true, watch: ['Stair'],
      laneNames: { long: 'the gallery', mid: 'the atrium', tun: 'the service side' },
      lopsided: 'The gallery looks into the atrium through glass that has to be shot out before anything passes. The east spawn has a stair from the gallery straight into the middle. The west has no stair; it has an unlit stockroom that opens onto the atrium floor.',
      posts: [{ side: 0, keys: ['marksman', 'psion'], x: 400, y: 134, room: 'Gal' }, { side: 0, keys: ['rocketeer'], x: 520, y: 134, room: 'Gal' }, { side: 1, keys: ['marksman', 'psion'], x: 640, y: 134, room: 'Gal' }, { side: 1, keys: ['rocketeer'], x: 520, y: 134, room: 'Gal' }],
      features: [
        { name: 'Gallery glass', kind: 'window', at: [520, 150], min: 100, who: 'Marksman, Rocketeer, Blinker', text: 'Four panes. A token sees through glass but its shots go into the pane first. A rifle needs four hits, a marksman or a blast needs one. A broken pane is an opening to shoot and walk through, so the first squad to shoot one out has made itself a door. Panes are replaced after 30 seconds.' },
        { name: 'Unlit stockroom', kind: 'dark', at: [280, 452], min: 100, who: 'Cloaker, Xeno Swarm, Cyborg, Riot Shield', text: 'A token in the dark is seen only from about three tiles, when it is marked, or for a moment after it fires. Short-range tokens cross it unseen, and long guns have nothing to aim at.' },
        { name: 'The east stair', kind: 'room', room: 'Stair', at: [820, 190], min: 6, who: 'whoever spawns east', text: 'A two-door turn between the gallery and the middle that only the east side has. The count is how often a token used it.' },
        { name: 'Atrium crates', kind: 'cover', at: [520, 290], min: 80, who: 'Rifleman, Trooper, Heavy Gunner', text: 'The same crates as the yard, in a room that is also watched through glass from two sides.' },
      ],
      script: ['front', 'lanes', 'edge', 'feat'],
    };
  }

  /* ---- 3. Sluice Reactor: the PvE hazards ---- */
  function reactor() {
    const P = root.PLAN.make(); frame(P);
    P.rect('Run', 140, 60, 900, 160, { lab: 'Coolant Run', labAt: [520, 80] });
    P.rect('Wm', 140, 250, 360, 340, {});
    P.rect('Hub', 360, 190, 680, 400, { lab: 'Mixing Hub', tint: SAND, cham: [0, 1, 2, 3], k: 45, labAt: [520, 208] });
    P.rect('Em', 680, 250, 900, 340, {});
    P.rect('cN', 480, 160, 560, 190, {}); P.rect('cS', 480, 400, 560, 440, {});
    P.rect('F1', 140, 440, 400, 535, {}); P.rect('F2', 400, 440, 640, 535, { lab: 'Fuel Store', labAt: [520, 522] }); P.rect('F3', 640, 440, 900, 535, {});
    door(P, 'An', 'Run', 140, 110, 90); door(P, 'Run', 'Bn', 900, 110, 90);
    door(P, 'A', 'Wm', 140, 295, 90); door(P, 'Wm', 'Hub', 360, 295, 90); door(P, 'Hub', 'Em', 680, 295, 90); door(P, 'Em', 'B', 900, 295, 90);
    door(P, 'Run', 'cN', 520, 160, 0); door(P, 'cN', 'Hub', 520, 190, 0); door(P, 'Hub', 'cS', 520, 400, 0); door(P, 'cS', 'F2', 520, 440, 0);
    door(P, 'As', 'F1', 140, 490, 90); door(P, 'F1', 'F2', 400, 490, 90); door(P, 'F2', 'F3', 640, 490, 90); door(P, 'F3', 'Bs', 900, 470, 90);
    const lanes = { long: ['A', 'An', 'Run', 'Bn', 'B'], mid: ['A', 'Wm', 'Hub', 'Em', 'B'], tun: ['A', 'As', 'F1', 'F2', 'F3', 'Bs', 'B'] };
    return {
      key: 'reactor', name: 'Sluice Reactor', theme: 'hazards', P, lanes, laneOf: lanesOf(lanes, ['cN', 'cS']), bases: ['A', 'B'], W, H,
      laneNames: { long: 'Coolant Run', mid: 'the hub', tun: 'the Fuel Store' },
      lopsided: 'The rooms are close to mirrored; the dangers are not. The west side reaches the hub through a door that slams shut, the east through a corridor with a flame across it, and the fuel drums sit nearer the west.',
      hazards: [
        { type: 'patrol', name: 'the coolant cart', a: [215, 110], b: [825, 110], r: 20, period: 10, floor: true, dmg: 45 },
        { type: 'rotor', name: 'the mixer arm', x: 520, y: 295, len: 86, period: 9, floor: true, dmg: 32 },
        { type: 'crush', name: 'the blast door', door: ['Wm', 'Hub'], period: 5, shut: 1.8, warnT: .3, dmg: 85 },
        { type: 'jet', name: 'a wall flame', a: [790, 253], b: [790, 337], w: 16, on: 1.6, off: 2.4, warnT: .25, dmg: 90 },
        { type: 'jet', name: 'a wall flame', a: [484, 175], b: [556, 175], w: 14, on: 1.3, off: 2.8, warnT: .25, phase: 2, dmg: 90 },
        { type: 'barrel', name: 'a fuel drum', at: [[270, 470], [335, 512], [470, 508], [585, 468], [760, 505]], r: 74, dmg: 70 },
      ],
      features: [
        { name: 'Coolant cart', hz: 'patrol', pattern: 'Patrolling', at: [520, 110], min: 60, text: 'A machine that runs the length of the long lane and back. Tokens step to the wall to let it pass; a token that is aiming, rooted or slowed is run down. The drones fly over it.' },
        { name: 'Mixer arm', hz: 'rotor', pattern: 'Rotation', at: [520, 295], min: 100, text: 'An arm sweeping the hub. Its tip moves faster than most tokens walk, so the middle of the room is only safe in the gap behind the arm. The drones fly over it; the mech is too slow for it.' },
        { name: 'Blast door', hz: 'crush', pattern: 'Crushing', at: [360, 295], min: 1, text: 'The west door into the hub slams shut every few seconds, and blocks shots while it is shut. Anything fast simply waits. Whatever is held in the doorway when it closes is crushed, and the kill goes to the token that held it there.' },
        { name: 'Wall flames', hz: 'jet', pattern: 'Across', at: [790, 295], min: 1, text: 'A flame across the east corridor and another across the north connector, on a timer. They cut the east side’s way into the hub into short windows.' },
        { name: 'Fuel drums', hz: 'barrel', pattern: 'Expansive', at: [470, 508], min: 100, text: 'A blast near a drum always sets it off, a stray shot sometimes does, and one drum sets off the next. The blast hurts both squads; the kill goes to whoever lit it.' },
      ],
      script: ['front', 'lanes', 'edge', 'feat', 'haz'],
    };
  }
  /* ---- manor-style geometry: a grid turned off the page's axes, and doors on walls at any angle ---- */
  // a wing's own grid: origin o, turned by deg. T(u, v) is the page point u along the wing and v across it.
  const grid = (o, deg) => { const r = deg * Math.PI / 180, a = [Math.cos(r), Math.sin(r)], b = [-a[1], a[0]]; return (u, v) => [o[0] + a[0] * u + b[0] * v, o[1] + a[1] * u + b[1] * v]; };
  const quad = (P, id, T, u0, v0, u1, v1, o = {}) => P.poly(id, [T(u0, v0), T(u1, v0), T(u1, v1), T(u0, v1)], o);
  // a door in the middle of the wall from p to q (t moves it along the wall)
  const doorOn = (P, a, b, p, q, kind = 'gap', t = .5, gw = 42) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]); P.doors.push({ a, b, m: [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], e: [(q[0] - p[0]) / L, (q[1] - p[1]) / L], gw, kind }); };
  const HAZ = {
    spiral: { name: 'Spiral blade', hz: 'rotor', pattern: 'Spiral', text: 'A blade that turns and also grows and shrinks, so the safe ring of floor around it keeps changing width.' },
    crush: { name: 'Crushing door', hz: 'crush', pattern: 'Crushing', text: 'A door that slams on a timer and blocks shots while shut. It crushes whatever was held in the doorway, and the kill goes to the token that held it there.' },
    roll: { name: 'Boulder', hz: 'roll', pattern: 'In Path', text: 'A boulder released down the corridor on a timer. Tokens press to the wall to let it by; aiming, rooted and slowed tokens are run down. Drones fly over it.' },
    trench: { name: 'Fire trench', hz: 'trench', pattern: 'Winding', text: 'Fire runs the length of a winding trench and the trench crosses the walkway several times, so the corridor opens and closes in sections.' },
    barrel: { name: 'Fuel drums', hz: 'barrel', pattern: 'Expansive', text: 'A blast near a drum sets it off, a stray shot sometimes does, and one drum lights the next. The blast hurts both squads; the kill goes to whoever lit it.' },
    erupt: { name: 'Vent eruption', hz: 'erupt', pattern: 'Eruption', text: 'A vent throws four boulders at marked circles every few seconds. The marks give time to step out, so it punishes whoever is pinned in a fight there.' },
    collapse: { name: 'Whirlpool', hz: 'collapse', pattern: 'Collapsing', text: 'Water closes in from the rim to a small eye, holds, then drains. Tokens caught inside are pushed to the eye, packed together, which is what a grenade wants.' },
    leash: { name: 'Chained beast', hz: 'leash', pattern: 'Tethered', text: 'A beast on a chain that goes for whoever comes inside its reach. Passing costs one bite unless something else is nearer to it.' },
    jet: { name: 'Wall flame', hz: 'jet', pattern: 'Across', text: 'A flame across a connector, on a timer. It turns a short cut into a door that is only sometimes open.' },
    hop: { name: 'Jumping slime', hz: 'hop', pattern: 'Jump', text: 'A slime that bounces between four marked spots. Each landing is marked before it lands.' },
    bounce: { name: 'Ricochet ball', hz: 'bounce', pattern: 'Ricochet', text: 'A steel ball bouncing between the walls of the room. Its path is predictable for a second ahead and no further.' },
  };
  const hz = (k, at, min = 1) => ({ ...HAZ[k], at, min });

  /* ---- 4. Tannery Wings: a round tower spawn, an aisle and a hall of different widths, and a wing turned 20 degrees ---- */
  function tannery() {
    const P = root.PLAN.make(), T = grid([630, 205], 20);
    P.round('Tower', 105, 140, 72, { lab: 'west spawn', tint: BLUE });
    P.rect('Aisle', 170, 100, 470, 180, { lab: 'Aisle' });
    P.rect('Hall', 250, 180, 560, 380, { lab: 'Tan Hall', tint: SAND, labAt: [405, 362] });
    P.rect('Wy', 60, 206, 250, 400, { lab: 'Drying Yard', labAt: [150, 250] });
    P.rect('Ce', 60, 400, 330, 535, { lab: 'Soak Pits', labAt: [130, 520] });
    P.rect('Gal', 470, 80, 800, 160, { lab: 'Long Gallery' });
    P.rect('Ne', 800, 80, 960, 230, {});
    P.poly('Ns', [[860, 230], [960, 230], T(350, -30), T(260, -30)], {});
    P.poly('Seam', [[560, 205], [630, 205], T(0, 130), [560, T(0, 130)[1]]], {});
    quad(P, 'W1', T, 0, 0, 140, 130, { lab: 'East Wing' }); quad(P, 'W2', T, 140, 0, 260, 130, {});
    quad(P, 'East', T, 260, -30, 350, 150, { lab: 'east spawn', tint: PEACH });
    P.rect('Sl', 330, 430, 620, 535, { lab: 'Sluice', labAt: [475, 522] });
    P.poly('Su', [[620, 430], T(140, 130), T(260, 130), [800, 535], [620, 535]], { lab: 'Undercroft', labAt: [715, 505] });
    P.rect('Dr', 420, 380, 500, 430, {});
    door(P, 'Tower', 'Aisle', 173, 140, 90); door(P, 'Tower', 'Wy', 105, 209, 0);
    door(P, 'Aisle', 'Hall', 360, 180, 0); door(P, 'Wy', 'Hall', 250, 300, 90); door(P, 'Wy', 'Ce', 150, 400, 0);
    door(P, 'Aisle', 'Gal', 470, 130, 90); door(P, 'Gal', 'Ne', 800, 120, 90); door(P, 'Ne', 'Ns', 910, 230, 0);
    doorOn(P, 'Ns', 'East', T(260, -30), T(350, -30));
    door(P, 'Hall', 'Seam', 560, 268, 90); doorOn(P, 'Seam', 'W1', T(0, 0), T(0, 130), 'gap', .45);
    doorOn(P, 'W1', 'W2', T(140, 0), T(140, 130), 'gap', .3); doorOn(P, 'W2', 'East', T(260, 0), T(260, 130), 'gap', .6);
    door(P, 'Hall', 'Dr', 460, 380, 0); door(P, 'Dr', 'Sl', 460, 430, 0); door(P, 'Ce', 'Sl', 330, 485, 90); door(P, 'Sl', 'Su', 620, 485, 90);
    doorOn(P, 'Su', 'W2', T(140, 130), T(260, 130));
    const lanes = { long: ['Tower', 'Aisle', 'Gal', 'Ne', 'Ns', 'East'], mid: ['Tower', 'Wy', 'Hall', 'Seam', 'W1', 'W2', 'East'], tun: ['Tower', 'Wy', 'Ce', 'Sl', 'Su', 'W2', 'East'] };
    const lo = lanesOf(lanes, ['Dr']); lo.Tower = lo.East = 'spawn';
    const r1 = T(250, 65), r2 = T(12, 65);
    return {
      key: 'tannery', name: 'Tannery Wings', theme: 'hazard short cuts', P, lanes, laneOf: lo, bases: ['Tower', 'East'], W, H, watch: ['Gal', 'Sl'],
      laneNames: { long: 'the gallery', mid: 'the hall and wing', tun: 'the pits and sluice' },
      lopsided: 'Nothing here mirrors. The west spawns in a round tower with two exits; the east spawns at the end of a wing turned 20 degrees off the grid. The gallery along the top is the long way and has no hazards. Every shorter route has several.',
      hazards: [
        { type: 'rotor', name: 'the spiral blade', x: 405, y: 280, len: 52, amp: 26, breath: 5, period: 8, floor: true, dmg: 30 },
        { type: 'crush', name: 'the crushing door', door: ['Seam', 'W1'], period: 5, shut: 1.8, warnT: .3, dmg: 85 },
        { type: 'roll', name: 'the boulder', a: r1, b: r2, r: 15, period: 8, wait: 4.5, go: 2.2, floor: true, dmg: 55 },
        { type: 'trench', name: 'the fire trench', pts: [[345, 445], [410, 520], [480, 445], [550, 520], [610, 462]], w: 13, burn: 12, period: 7, dmg: 70 },
        { type: 'barrel', name: 'a fuel drum', at: [[380, 510], [520, 452]], r: 70, dmg: 70 },
        { type: 'erupt', name: 'the vent', x: 715, y: 455, R: 50, r: 30, n: 4, period: 3.6, warnT: .6, dmg: 45 },
        { type: 'collapse', name: 'the whirlpool', x: 215, y: 468, R: 58, eye: 16, period: 9, close: 3, hold: 1.5, floor: true, dmg: 45 },
        { type: 'leash', name: 'the chained beast', x: 150, y: 330, L: 62, spd: 150, dmg: 38 },
        { type: 'jet', name: 'a wall flame', a: [424, 405], b: [496, 405], w: 14, on: 1.3, off: 2.7, warnT: .3, dmg: 90 },
      ],
      features: [
        { name: 'The gallery', kind: 'room', room: 'Gal', at: [635, 120], min: 4, text: 'The long way round, along the top, with no hazard on it. The count is how often a token took it.' },
        { name: 'The sluice cut', kind: 'room', room: 'Sl', at: [475, 470], min: 4, text: 'The short way along the bottom, through the trench, the drums and the vent. The count is how often a token took it.' },
        hz('spiral', [405, 280], 40), hz('crush', [T(0, 58)[0], T(0, 58)[1]]), hz('roll', T(130, 65), 20), hz('trench', [480, 445], 20), hz('barrel', [520, 452], 60), hz('erupt', [715, 455], 20), hz('collapse', [215, 468], 20), hz('leash', [150, 330], 20), hz('jet', [460, 405]),
      ],
      script: ['lanes', 'edge', 'feat', 'haz'],
    };
  }

  /* ---- 5. Cistern Fork: a one-exit spawn in a wing turned the other way, a round tower spawn with two exits, an eight-sided cistern ---- */
  function cistern() {
    const P = root.PLAN.make(), T = grid([370, 380], 195);   // u runs up and to the left, v across the wing towards the top
    P.round('Tower', 900, 450, 75, { lab: 'east spawn', tint: PEACH });
    P.rect('Cis', 430, 200, 700, 420, { lab: 'Cistern', tint: SAND, cham: [0, 1, 2, 3], k: 50, labAt: [565, 218] });
    P.rect('E1', 700, 260, 900, 380, { lab: 'Pump Room', labAt: [800, 276] });
    P.rect('S1', 520, 420, 640, 480, {}); P.rect('S2', 480, 480, 850, 535, { lab: 'Drain', labAt: [760, 522] });
    P.rect('N1', 700, 120, 960, 260, { lab: 'Filter Beds' }); P.rect('N2', 430, 90, 700, 160, {}); P.rect('N3', 300, 90, 430, 160, {});
    P.rect('cN', 530, 160, 600, 200, {});
    P.poly('Seam', [T(0, 120), [430, 250], [430, 370], T(0, 0)], {});
    quad(P, 'Wg1', T, 0, 0, 150, 120, { lab: 'West Wing' }); quad(P, 'Wg2', T, 150, 0, 290, 120, {});
    quad(P, 'West', T, 290, -10, 350, 130, { lab: 'west spawn', tint: BLUE });
    P.poly('Nw', [[150, 90], [300, 90], [300, 160], T(150, 120), T(290, 120)], { lab: 'Reed Court', labAt: [220, 120] });
    P.poly('Sw', [T(150, 0), T(0, 0), [480, 480], [480, 535], [200, 535]], { lab: 'Silt Yard', labAt: [300, 520] });
    door(P, 'Cis', 'E1', 700, 310, 90); door(P, 'E1', 'Tower', 888, 379, 0); door(P, 'Cis', 'S1', 580, 420, 0); door(P, 'S1', 'S2', 580, 480, 0); door(P, 'S2', 'Tower', 848, 500, 90);
    door(P, 'E1', 'N1', 800, 260, 0); door(P, 'N1', 'N2', 700, 140, 90); door(P, 'N2', 'cN', 565, 160, 0); door(P, 'cN', 'Cis', 565, 200, 0); door(P, 'N3', 'N2', 430, 125, 90); door(P, 'Nw', 'N3', 300, 125, 90);
    door(P, 'Cis', 'Seam', 430, 310, 90); doorOn(P, 'Seam', 'Wg1', T(0, 0), T(0, 120)); doorOn(P, 'Wg1', 'Wg2', T(150, 0), T(150, 120), 'gap', .65); doorOn(P, 'Wg2', 'West', T(290, 0), T(290, 120));
    doorOn(P, 'Wg2', 'Nw', T(150, 120), T(290, 120)); doorOn(P, 'Wg1', 'Sw', T(0, 0), T(150, 0)); door(P, 'Sw', 'S2', 480, 507, 90);
    const lanes = { long: ['West', 'Wg2', 'Nw', 'N3', 'N2', 'N1', 'E1', 'Tower'], mid: ['West', 'Wg2', 'Wg1', 'Seam', 'Cis', 'E1', 'Tower'], tun: ['West', 'Wg2', 'Wg1', 'Sw', 'S2', 'Tower'] };
    const lo = lanesOf(lanes, ['cN', 'S1']); lo.West = lo.Tower = 'spawn'; lo.Wg2 = 'mid'; lo.Wg1 = 'mid'; lo.E1 = 'mid';
    const hp = [T(35, 30), T(120, 90), T(35, 90), T(120, 30)];
    return {
      key: 'cistern', name: 'Cistern Fork', theme: 'hazard short cuts', P, lanes, laneOf: lo, bases: ['West', 'Tower'], W, H, watch: ['Nw', 'Sw'],
      laneNames: { long: 'the filter beds', mid: 'the cistern', tun: 'the silt yard and drain' },
      lopsided: 'The west spawn has one exit, into a wing turned off the grid, and the routes only fork after it. The east spawns in a round tower with two exits. The north loop is long and clear. The cistern and the drain are short and full of hazards.',
      hazards: [
        { type: 'collapse', name: 'the whirlpool', x: 565, y: 310, R: 92, eye: 24, period: 10, close: 3.5, hold: 1.5, floor: true, dmg: 45 },
        { type: 'crush', name: 'the crushing door', door: ['Cis', 'Seam'], period: 5, shut: 1.8, warnT: .3, dmg: 85 },
        { type: 'hop', name: 'the jumping slime', pts: hp, r: 24, hopT: 1.3, floor: true, dmg: 45 },
        { type: 'bounce', name: 'the ricochet ball', box: [262, 432, 400, 515], r: 14, vx: 105, vy: 71, floor: true, dmg: 40 },
        { type: 'trench', name: 'the fire trench', pts: [[500, 492], [580, 525], [660, 492], [740, 525], [820, 496]], w: 12, burn: 12, period: 7, dmg: 70 },
        { type: 'barrel', name: 'a fuel drum', at: [[540, 522], [700, 494]], r: 66, dmg: 70 },
        { type: 'jet', name: 'a wall flame', a: [524, 450], b: [636, 450], w: 14, on: 1.3, off: 2.7, warnT: .3, dmg: 90 },
        { type: 'erupt', name: 'the vent', x: 800, y: 325, R: 44, r: 30, n: 4, period: 3.6, warnT: .6, dmg: 45 },
        { type: 'roll', name: 'the boulder', a: [690, 180], b: [440, 180], r: 0, period: 99, wait: 99, go: 1, floor: true, dmg: 0, off: true },
      ].filter(h => !h.off),
      features: [
        { name: 'The north loop', kind: 'room', room: 'Nw', at: [200, 175], min: 4, text: 'The long way round, with no hazard on it. The count is how often a token took it.' },
        { name: 'The silt cut', kind: 'room', room: 'Sw', at: [330, 440], min: 4, text: 'The short way to the east tower, past the ricochet ball and down the burning drain. The count is how often a token took it.' },
        hz('collapse', [565, 310], 40), hz('crush', [430, 310]), hz('hop', T(78, 60), 20), hz('bounce', [330, 475], 20), hz('trench', [660, 492], 20), hz('barrel', [700, 494], 60), hz('jet', [580, 450]), hz('erupt', [800, 325], 20),
      ],
      script: ['lanes', 'edge', 'feat', 'haz'],
    };
  }
  root.FPSMAPS = [{ key: 'terraces', name: 'Kiln Terraces', build: terraces }, { key: 'arcade', name: 'Glass Arcade', build: arcade }, { key: 'reactor', name: 'Sluice Reactor', build: reactor }, { key: 'tannery', name: 'Tannery Wings', build: tannery }, { key: 'cistern', name: 'Cistern Fork', build: cistern }];
})(typeof window !== 'undefined' ? window : globalThis);
