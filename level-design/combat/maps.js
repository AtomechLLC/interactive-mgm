/* Three more arenas for the same twenty tokens, each lopsided on purpose. Saltworks (map.js) is mirrored, so it can only
   show what the squads do. These three give each spawn a different map to fight on, and each is built around
   environmental features that some tokens can use and others cannot. All three are our own layouts.

   1. Kiln Terraces    the west spawn owns a raised terrace over the yard; the east gets a vent under it and a door into the yard
   2. Glass Arcade     a gallery fires through glass into the atrium; the east has a stair between them, the west an unlit stockroom
   3. Sluice Reactor   every lane carries a hazard from the PvE hazards page (pve-interactions/hazards), and the two spawns
                       meet different ones on the way to the middle

   Each build() returns what FPSMAP.build() returns, plus what sim.js reads for features:
     doors of kind 'window' (shots only), 'vent' (small units only), 'ledge' (a one-way drop from the first room named)
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
    P.rect('Ter', 140, 60, 470, 170, { lab: 'Upper Terrace', tint: HIGH, high: true });
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
    P.rect('Stock', 140, 400, 420, 535, { lab: 'Unlit Stockroom', tint: DARK, dark: true });
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
      lopsided: 'The gallery fires into the atrium through glass that nothing can walk through. The east spawn has a stair from the gallery straight into the middle. The west has no stair; it has an unlit stockroom that opens onto the atrium floor.',
      posts: [{ side: 0, keys: ['marksman', 'psion'], x: 400, y: 134, room: 'Gal' }, { side: 0, keys: ['rocketeer'], x: 520, y: 134, room: 'Gal' }, { side: 1, keys: ['marksman', 'psion'], x: 640, y: 134, room: 'Gal' }, { side: 1, keys: ['rocketeer'], x: 520, y: 134, room: 'Gal' }],
      features: [
        { name: 'Gallery glass', kind: 'window', at: [520, 150], min: 150, who: 'Marksman, Rocketeer, Psion', text: 'Four windows: a shot passes, a unit does not. A token at the glass fights the atrium without being reachable from it, so melee tokens have to walk the long way round to answer.' },
        { name: 'Unlit stockroom', kind: 'dark', at: [280, 468], min: 100, who: 'Cloaker, Xeno Swarm, Cyborg, Riot Shield', text: 'A token in the dark is seen only from about three tiles, when it is marked, or for a moment after it fires. Short-range tokens cross it unseen, and long guns have nothing to aim at.' },
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
        { type: 'rotor', name: 'the mixer arm', x: 520, y: 295, len: 92, period: 9, floor: true, dmg: 40 },
        { type: 'crush', name: 'the blast door', door: ['Wm', 'Hub'], period: 5.5, shut: 1.8, warnT: .45, dmg: 85 },
        { type: 'jet', name: 'a wall flame', a: [790, 253], b: [790, 337], w: 13, on: 1.3, off: 2.6, warnT: .4, dmg: 90 },
        { type: 'jet', name: 'a wall flame', a: [484, 175], b: [556, 175], w: 13, on: 1.1, off: 3, warnT: .4, phase: 2, dmg: 90 },
        { type: 'barrel', name: 'a fuel drum', at: [[270, 470], [335, 512], [470, 508], [585, 468], [760, 505]], r: 74, dmg: 70 },
      ],
      features: [
        { name: 'Coolant cart', hz: 'patrol', pattern: 'Patrolling', at: [520, 110], min: 60, text: 'A machine that runs the length of the long lane and back. Tokens step to the wall to let it pass; a token that is aiming, rooted or slowed is run down. The drones fly over it.' },
        { name: 'Mixer arm', hz: 'rotor', pattern: 'Rotation', at: [520, 295], min: 100, text: 'An arm sweeping the hub. Its tip moves faster than most tokens walk, so the middle of the room is only safe in the gap behind the arm. The drones fly over it; the mech is too slow for it.' },
        { name: 'Blast door', hz: 'crush', pattern: 'Crushing', at: [360, 295], min: 40, text: 'The west door into the hub slams shut every few seconds, and blocks shots while it is shut. Anything fast simply waits. Whatever is held in the doorway when it closes is crushed, and the kill goes to the token that held it there.' },
        { name: 'Wall flames', hz: 'jet', pattern: 'Across', at: [790, 295], min: 40, text: 'A flame across the east corridor and another across the north connector, on a timer. They cut the east side’s way into the hub into short windows.' },
        { name: 'Fuel drums', hz: 'barrel', pattern: 'Expansive', at: [470, 508], min: 100, text: 'A blast near a drum always sets it off, a stray shot sometimes does, and one drum sets off the next. The blast hurts both squads; the kill goes to whoever lit it.' },
      ],
      script: ['front', 'lanes', 'edge', 'feat', 'haz'],
    };
  }
  root.FPSMAPS = [{ key: 'terraces', name: 'Kiln Terraces', build: terraces }, { key: 'arcade', name: 'Glass Arcade', build: arcade }, { key: 'reactor', name: 'Sluice Reactor', build: reactor }];
})(typeof window !== 'undefined' ? window : globalThis);
