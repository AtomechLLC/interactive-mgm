/* Camera rig switcher (Module 6, 3Cs: Camera, slides 21-107).
   One grey-box level (a corridor, a doorway, an open courtyard and a small arena) seen two ways at once: the top-down map
   on the left (where the camera is, its frustum, and its rails, volumes or splines) and the view on the right (what the
   player sees). The view is a small perspective projector: walls and props are extruded boxes split into 2 m chunks, the
   hero and foes are capsules, and everything is painter-sorted by distance. Each of the deck's eleven rigs is one rule for
   where the camera goes when the hero moves: RIGS (below) holds the words (definition, pros, cons from slide 103's lists),
   and the CAM table holds the rule itself, a pure function of the hero's position now and over the last second.
   The scrolling rig swaps the level for a Super Mario Bros.-style strip (sprites copied from pve-interactions/shared/mario.js).
   Slides: 'switch' (the switcher and its tour), 'offspline' (slide 66: a spline camera in a wide courtyard), and
   'drill' (slides 105-107: a rig plays unnamed and the learner classifies it).
   Tunable rules live in the tables right after RIGS: LEVEL geometry, FIXED volumes, DOLLY, PB, VEC, SPLINE, ANIM keys,
   FOLLOW, COVER, FP, FLOAT, the DEMO walks and the TOUR script. Every scene draws as a pure function of t, so
   window.__seek(t, which) is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const W = 1040, H = 585;
  const MAP = { x: 12, y: 12, w: 480, h: 360, wx: -4, wy: -3, s: 10 };   // world -4..44 by -3..33 metres at 10 px per metre
  const VIEW = { x: 504, y: 12, w: 524, h: 295 };                         // 16:9
  const CARD = 'rgba(255,252,244,.85)', PANEL = '#efe6d2';

  /* ================= the eleven rigs: words (slide 103's pros and cons, shortened) ================= */
  const RIGS = {
    fixed: { n: 1, name: 'Fixed point', slides: '28-38', seen: 'Tetris, Resident Evil', fov: 55,
      def: 'Never translates. This one turns from its corner to keep the hero in view; activation volumes pick which camera is live.',
      clue: 'The camera never moves, and the view cuts whenever the hero crosses into another volume.',
      pros: ['Unnerving: you are not in control (horror)', 'Guaranteed suspense: the designer knows what is in view', 'Reads as security cameras', 'Can signal a camera change'],
      cons: ['Easy to lose attention: “fairly dead”', 'Unwanted cuts in combat from poorly set-up activation volumes'] },
    dolly: { n: 2, name: 'Dolly', slides: '39-47', seen: 'God of War (grey-box here)', fov: 55,
      def: 'A fixed camera with rotation that dollies toward a virtual position the designer sets. Its implementation point sits outside the level.',
      clue: 'The camera slides along a line that starts outside the level, always turning to face the hero.',
      pros: ['Avoids gimbal lock: the pivot is outside the play space', 'The designer sets the dolly, not the player'],
      cons: ['Depends on a programmer to build the dolly system'] },
    blend: { n: 3, name: 'Position blend', slides: '48-58', seen: 'God of War (grey-box here)', fov: 55,
      def: 'Two authored cameras per space. The hero’s position across the space blends between them: PB1, PB2, PB3.',
      clue: 'The camera glides between two set-ups as the hero crosses a room, then hands over to the next room’s pair.',
      pros: ['The player never diverts attention to the camera', 'New-player friendly'],
      cons: ['Very labour-intensive for camera designers'] },
    vector: { n: 4, name: 'Vector (isometric)', slides: '59-61', seen: 'Diablo III', fov: 40,
      def: 'A constant relationship to the hero: a fixed yaw, pitch, distance and offset.',
      clue: 'The same angle and distance everywhere: the hero stays the same size on screen.',
      pros: ['Easy to set up, low maintenance, scalable', 'Consistent hero size on screen', 'Suits long linear or very wide spaces', 'Focus on character and control'],
      cons: ['Feels programmatic, cold, non-immersive', 'God’s-eye view, not empathetic to the hero', 'Rarely reacts to gameplay'] },
    spline: { n: 5, name: 'Spline', slides: '62-68', seen: 'God of War: Chains of Olympus', fov: 60,
      def: 'The hero’s closest point on a designer’s curve drives the camera along that curve, a few metres behind.',
      clue: 'The camera rides a rail behind the hero; step sideways off it and the camera stays on the rail.',
      pros: ['Tight spaces: doorways and hallways', 'Gets close to blocking art without clipping'],
      cons: ['Wide spaces with lots of left/right movement', 'More setup time'] },
    animated: { n: 6, name: 'Animated', slides: '69-74', seen: 'God of War: Ghost of Sparta', fov: 60,
      def: 'The hero’s progress scrubs an authored camera animation forward or back, so it can’t get caught on a path.',
      clue: 'The framing is authored, not aimed at the hero: it swoops over the doorway and plays backward when the hero turns round.',
      pros: ['Looks smoother than a spline camera', 'Tight spaces: doorways and hallways', 'Can’t get caught on the path'],
      cons: ['Wide spaces with lots of left/right movement', 'Even more setup: the animation pass'] },
    scrolling: { n: 7, name: 'Scrolling', slides: '75-79', seen: 'Super Mario Bros., Super Metroid', strip: true,
      def: 'Moves horizontally, vertically or both. This one scrolls right with the hero and never scrolls back.',
      clue: 'A flat side view that only scrolls forward.',
      pros: ['Low investment', 'Accessible: no camera to control'],
      cons: ['Less immersive, flat', 'Rarely helps guide the gameplay'] },
    floating: { n: 8, name: 'Floating', slides: '80-81', seen: 'Homeworld, Total War', fov: 60,
      def: 'A point the player moves anywhere, with pitch and yaw to look in any direction from it.',
      clue: 'The camera moves on its own path, not the hero’s, and jumps between places.',
      pros: ['Wide open spaces', 'Freedom to look at what you want', 'Pull in for detail, out for scope'],
      cons: ['Can be difficult to use', 'Needs jump-to shortcuts around the space'] },
    follow: { n: 9, name: 'Follow', slides: '82-86', seen: 'many third-person action games', fov: 70,
      def: 'Attached to the hero by an anchor point. It moves with the hero, and the player can yaw and pitch around them.',
      clue: 'It stays a set distance behind the hero’s shoulder and swings round as they turn.',
      pros: ['The base camera of many third-person action games', 'Player can yaw and pitch around the hero', 'Copies with new parameters cover other states'],
      cons: ['The farther away, the more occlusion and clipping', 'Five variables to tune: anchor, distance, offset, height, FOV'] },
    cover: { n: 10, name: 'Cover', slides: '87-100', seen: 'The Order: 1886, Gears of War', fov: 65,
      def: 'A follow camera contextualised to cover: lower, closer and over the right shoulder when the hero takes low cover.',
      clue: 'A follow camera that drops low and shifts to the shoulder when the hero ducks behind the crate.',
      pros: ['Can be very immersive', 'Perceived consequences: you’re not bulletproof', 'Players care about using the environment'],
      cons: ['Time-consuming to contextualise each cover', 'Bias toward the side with more visibility (Gears: right)'] },
    first: { n: 11, name: 'First-person', slides: '101-102', seen: 'Doom, Half-Life, Halo, Portal', fov: 85,
      def: 'The camera is the hero’s eyes. Only the weapon shows.',
      clue: 'No hero on screen, only the weapon.',
      pros: ['More immersive for some players', 'Cheaper than a third-person camera', 'Easy to identify as the character'],
      cons: ['Can’t see your upgrades (except weapons)', 'Blank-slate hero limits storytelling', 'No hero to empathise with'] },
  };
  const ORDER = Object.keys(RIGS);

  /* ================= tunable rules ================= */
  // LEVEL, in metres: x east, y south (map down), z up. Rooms are walkable rectangles; walls and props are boxes.
  const ROOMS = [[1, 12, 16, 18], [16, 13.5, 16.5, 16.5], [16.5, 2, 30, 28], [30, 11, 30.5, 19], [30.5, 8, 39.5, 22]];
  const WALL_H = 3;
  const WALLS = [
    [0.5, 11.5, 16, 12], [0.5, 18, 16, 18.5], [0.5, 12, 1, 18],                               // corridor
    [16, 1.5, 16.5, 13.5], [16, 16.5, 16.5, 28.5], [16.5, 1.5, 30.5, 2], [16.5, 28, 30.5, 28.5],  // courtyard, doorway in the west wall
    [30, 2, 30.5, 11], [30, 19, 30.5, 28],                                                     // courtyard east wall, open to the arena
    [30.5, 7.5, 40, 8], [30.5, 22, 40, 22.5], [39.5, 8, 40, 22],                               // arena
  ];
  const PROPS = [
    { r: [20, 4.5, 21, 5.5], h: 3, kind: 'pillar' }, { r: [27, 3.8, 28, 4.8], h: 3, kind: 'pillar' },
    { r: [20.5, 7.5, 22.5, 8.3], h: 1, kind: 'crate' }, { r: [24.5, 19.7, 26.5, 20.5], h: 1, kind: 'crate' }, { r: [36.5, 9.6, 38, 10.4], h: 1, kind: 'crate' },
  ];
  const LABELS = [['corridor', 8.5, 10.4], ['doorway', 12.8, 19.6], ['courtyard', 23.25, .5], ['arena', 35, 6.5]];
  const FOES = [[38, 12.2], [38.3, 17.2], [36.2, 20.3]];
  // 1 Fixed point: activation volumes [x0,y0,x1,y1] and camera positions. 'split' runs a volume edge through the fight (slides 31, 38).
  const FIXED = {
    rooms: [{ id: 'A', vol: [1, 12, 16.5, 18], pos: [1.5, 17.5, 2.8] }, { id: 'B', vol: [16.5, 2, 30.25, 28], pos: [29.5, 27.5, 5.5] }],
    tidy: [{ id: 'C', vol: [30.25, 8, 39.5, 22], pos: [31, 8.6, 5] }],
    split: [{ id: 'C1', vol: [30.25, 8, 35, 22], pos: [39, 8.5, 4.2] }, { id: 'C2', vol: [35, 8, 39.5, 22], pos: [31, 21.5, 4.2] }],
    turn: 50,   // degrees each fixed camera may rotate either side of its rest direction
  };
  // 2 Dolly: implementation point P outside the level, desired distance D to the hero, minimum dolly sMin to get inside the walls
  const DOLLY = [{ P: [-3, 15, 3.2], D: 6, sMin: 4.6 }, { P: [23, 31.5, 9], D: 11, sMin: 4.4 }, { P: [43, 15, 5], D: 7.5, sMin: 3.6 }];
  // 3 Position blend: per space, two hero marks (h1, h2) and the camera authored for each (c1, c2)
  const PB = [
    { id: 'PB1', h1: [3, 15], h2: [15, 15], c1: [1.3, 12.4, 3.4], c2: [9.5, 17.5, 3.6] },
    { id: 'PB2', h1: [17.5, 15], h2: [29, 15], c1: [18, 27.4, 7], c2: [29.4, 21, 6] },
    { id: 'PB3', h1: [31, 15], h2: [39, 15], c1: [31, 21.6, 4.5], c2: [39, 21.6, 4.5] },
  ];
  const ZONE_EDGES = [16.25, 30.25], ZONE_BLEND = 1.2;   // where PB1/PB2/PB3 (and the dolly rooms) hand over, and over how many metres
  // 4 Vector: yaw, pitch (degrees) and distance (m), constant
  const VEC = { yaw: -45, pitch: 50, dist: 17 };
  // 5 Spline: the designer's curve (Catmull-Rom through these points), camera lag along it (m) and height
  const SPLINE = { pts: [[1.5, 15], [9, 15], [16.2, 15], [22, 16], [28, 15.2], [31, 15], [37, 15]], lag: 4.5, z: 3 };
  // 6 Animated: authored poses keyed by the hero's progress along the spline (0..1): camera position and look-at point
  const ANIM = [
    { p: 0, pos: [1.4, 13.2, 2.6], at: [7, 15, 1] }, { p: .33, pos: [6, 17.3, 3], at: [14, 15, 1] },
    { p: .45, pos: [11, 15, 4.6], at: [21, 15, 0] }, { p: .62, pos: [21, 26, 5], at: [24, 15, 1] },
    { p: .82, pos: [27, 25, 6], at: [31, 15, 1] }, { p: 1, pos: [31, 20.5, 4], at: [37, 14, 1] },
  ];
  const ANIM_FRAMES = 120;
  // 9 Follow: anchor height, distance, height above anchor, right offset (m), pitch (deg), facing lag (s)
  const FOLLOW = { anchor: 1.6, dist: 5, up: .9, side: .5, pitch: 14, lag: .9 };
  // 10 Cover: the camera blended in near low cover (right shoulder, Gears/Order style) and the cover volumes
  const COVER = { anchor: 1.05, dist: 3.3, up: .5, side: 1.15, pitch: 6, fade: 1.2, vols: [{ r: [24.3, 20.5, 26.7, 21.6], face: -Math.PI / 2 }] };
  // 11 First-person: eye height, facing lag
  const FP = { eye: 1.65, lag: .3, pitch: 4 };
  // 8 Floating: the demo flight, keyed by time; cut:true is a jump-to shortcut
  const FLOAT = {
    loop: 10,
    keys: [{ t: 0, pos: [23, 31, 17], at: [23, 13, 0] }, { t: 3, pos: [24, 19.5, 3.2], at: [24, 13, 1] }, { t: 5, pos: [23, 31, 17], at: [23, 13, 0] },
      { t: 5.6, pos: [35, 27, 10], at: [35, 15, 0], cut: 'arena' }, { t: 8.4, pos: [34, 25, 7], at: [36, 14, 0] }, { t: 8.6, pos: [23, 31, 17], at: [23, 13, 0], cut: 'courtyard' }, { t: 10, pos: [23, 31, 17], at: [23, 13, 0] }],
    jumps: { corridor: [8, 15], courtyard: [23, 14], arena: [35, 15] },
  };
  // demo walks, one per rig (closed loops, metres); a number is a wait in seconds
  const SPEED = 3.2;
  const DEMO = {
    fixed: [[8, 15], [15, 15], [23, 15], [32, 15], [36, 11.5], [34, 18.5], [37.5, 15], [33.5, 12], [36.5, 17], [31.5, 15], [23, 15], [15, 15], [8, 15]],
    dolly: [[5, 15], [15, 15], [19, 6], [27.5, 6], [27.5, 25], [19, 25], [16.8, 15], [5, 15]],
    blend: [[3, 15], [15, 15], [18, 15], [28.5, 9], [28.5, 21], [31.5, 15], [38, 15], [31.5, 15], [18, 15], [3, 15]],
    vector: [[18, 5.8], [28, 9], [28, 26], [18, 24], [18, 5.8]],
    spline: [[2.5, 15], [15, 15], [24, 15.7], [24, 4], 1, [24, 15.7], [15, 15], [2.5, 15]],
    animated: [[2.5, 15], [15, 15], [23, 15.8], [29, 15], [35, 15], .6, [29, 15], [23, 15.8], [15, 15], [2.5, 15]],
    floating: [[22, 12], [26, 12], [26, 16], [22, 16], [22, 12]],
    follow: [[3, 15], [14, 15], [19, 13], [24, 6], [28, 12], [28, 22], [19, 22], [17.5, 15.5], [14, 15], [3, 15]],
    cover: [[18, 24.5], [25, 21.15], 1.4, [26.2, 21.15], 1, [28.5, 25.6], [18, 24.6], [18, 24.5]],
    first: [[2.5, 15], [14, 15], [19, 15], [23, 10], [27, 14], [24, 19], [19, 16], [14, 15], [2.5, 15]],
  };
  const DODGE = [[32, 15], [36, 11.5], [34, 18.5], [37.5, 15], [33.5, 12], [36.5, 17], [34.2, 14]];
  // slide 1 walk-through: rig, seconds, the hero's path, options and the caption drawn on the canvas
  const TOUR = [
    { rig: 'follow', len: 4, path: [[3, 15], [14, 15]], cap: 'Follow: the base third-person camera rides behind the hero’s shoulder.' },
    { rig: 'spline', len: 5.5, path: [[11, 15], [24, 15.7], [24, 4]], cap: 'Spline: on the rail through the doorway. Off it in the wide courtyard, the hero shrinks.' },
    { rig: 'fixed', len: 5, path: DODGE, opt: { vol: 'split' }, cap: 'Fixed point, volumes split through the fight: dodges cross the edge and the view cuts.' },
    { rig: 'fixed', len: 3.5, path: DODGE, opt: { vol: 'tidy' }, cap: 'Same fight, one volume for the arena: no cuts mid-combat.' },
    { rig: 'vector', len: 3.5, path: [[18, 5.8], [28, 9], [28, 18]], cap: 'Vector: fixed yaw, pitch and distance. The hero’s size never changes.' },
    { rig: 'scrolling', len: 4, strip: [6, 9], cap: 'Scrolling: the camera follows the hero right and never scrolls back.' },
    { rig: 'first', len: 3.5, path: [[3, 15], [14, 15], [19, 15], [22, 11]], cap: 'First-person: the hero’s eyes. You never see your upgrades.' },
  ];
  // the scrolling strip, in tiles: [x, height] pipes, goombas at x, blocks [x, y, kind]
  const STRIP = {
    len: 96, tile: 32, P: 2.4, lead: 6.5, speed: 9,
    pipes: [[14, 2], [24, 3], [33, 4], [52, 3], [66, 2], [80, 3]], goombas: [19.5, 29, 45, 59, 73],
    blocks: [[9, 4, 'q'], [17, 4, 'b'], [18, 4, 'q'], [19, 4, 'b'], [20, 4, 'q'], [40, 4, 'b'], [41, 4, 'q'], [42, 4, 'b'], [61, 4, 'q'], [86, 4, 'q']],
    hills: [[2, 2], [26, 1], [48, 2], [70, 1], [90, 2]], clouds: [[8, 6.2], [22, 6.6], [37, 6], [55, 6.5], [76, 6.2], [92, 6.6]],
  };

  /* ================= small helpers ================= */
  const smooth = k => k * k * (3 - 2 * k), sstep = (a, b, v) => smooth(clamp((v - a) / (b - a)));
  const wrapA = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI, lerpA = (a, b, k) => a + wrapA(b - a) * k;
  const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const look = (p, q) => ({ yaw: Math.atan2(q[1] - p[1], q[0] - p[0]), pitch: Math.atan2(p[2] - q[2], Math.hypot(q[0] - p[0], q[1] - p[1])) });
  const mx = x => MAP.x + (x - MAP.wx) * MAP.s, my = y => MAP.y + (y - MAP.wy) * MAP.s;
  const inR = (r, x, y, m = 0) => x >= r[0] - m && x <= r[2] + m && y >= r[1] - m && y <= r[3] + m;
  const rectDist = (r, x, y) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - y, 0, y - r[3]));
  const BOXES = [...WALLS.map(r => ({ r, h: WALL_H, kind: 'wall' })), ...PROPS];
  const inLevel = (x, y) => ROOMS.some(r => inR(r, x, y));
  const walkable = (x, y, rad = .35) => inLevel(x, y) && !BOXES.some(b => rectDist(b.r, x, y) < rad);
  const solidAt = (x, y, z) => !inLevel(x, y) || BOXES.some(b => z < b.h && inR(b.r, x, y, .25));
  const font = (s, w = 600) => `${w} ${s}px Jost, sans-serif`, disp = s => `800 ${s}px Montserrat, Jost, sans-serif`;
  function wrapText(g, text, x, y, maxW, lh, maxLines = 9) {
    const words = text.split(' '); let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const tryL = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(tryL).width > maxW && line) { g.fillText(line, x, y + n * lh); n++; line = words[i]; if (n >= maxLines) return n; }
      else line = tryL;
    }
    if (line) { g.fillText(line, x, y + n * lh); n++; }
    return n;
  }
  function panel(g, r, fill = PANEL) { g.fillStyle = fill; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 12); g.fill(); }
  function pill(g, text, x, y, size, col, bg, align = 'left') {
    g.font = font(size); const w = g.measureText(text).width + 16, bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.fillStyle = bg; g.beginPath(); g.roundRect(bx, y - size * .85, w, size * 1.7, size * .85); g.fill();
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, bx + 8, y + 1); return w;
  }

  /* ================= hero tracks: where the hero is at time t, and was a moment ago ================= */
  function pathTrack(pts, speed = SPEED, fitLen) {
    const first = pts.find(p => Array.isArray(p));
    let spd = speed;
    if (fitLen) {   // pick the speed so the walk takes about 90% of the segment
      let d = 0, prev = first; pts.forEach(p => { if (Array.isArray(p)) { d += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; } });
      spd = Math.max(.5, d / (fitLen * .9));
    }
    const P = T.Path(first, spd);
    pts.forEach(p => Array.isArray(p) ? P.go(p[0], p[1]) : P.wait(p));
    return { dur: Math.max(P.t, .01), path: P };
  }
  const loopAt = (tr, t) => { const d = tr.dur, a = tr.path.at(((t % d) + d) % d); return { x: a.x, y: a.y, face: a.face, moving: a.moving }; };
  const clampAt = (tr, t) => { const a = tr.path.at(clamp(t, 0, tr.dur)); return { x: a.x, y: a.y, face: a.face, moving: a.moving }; };
  // R is everything a camera rule may read: the hero now (h), the hero dt seconds ago (past), time and options
  const makeR = (at, t, opt = {}) => ({ t, h: at(t), past: dt => at(t - dt), opt });
  function dragTrack(x, y, face = 0) {
    const buf = [{ t: -99, x, y, face }];
    return {
      push(t, x, y, face) { buf.push({ t, x, y, face }); while (buf.length > 2 && buf[1].t < t - 8) buf.shift(); },
      at(t) { for (let i = buf.length - 1; i >= 0; i--) if (buf[i].t <= t) return buf[i]; return buf[0]; },
      get last() { return buf.at(-1); },
      reset(x, y, face) { buf.length = 0; buf.push({ t: -99, x, y, face }); },
    };
  }

  /* ================= the spline: dense samples with arc length u ================= */
  const SPL = (() => {
    const P = SPLINE.pts, out = [];
    const cr = (p0, p1, p2, p3, k) => { const k2 = k * k, k3 = k2 * k; return .5 * ((2 * p1) + (-p0 + p2) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k2 + (-p0 + 3 * p1 - 3 * p2 + p3) * k3); };
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
      for (let j = 0; j < 20; j++) { const k = j / 20; out.push([cr(a[0], b[0], c[0], d[0], k), cr(a[1], b[1], c[1], d[1], k)]); }
    }
    out.push(P.at(-1).slice());
    let u = 0; return out.map((p, i) => { if (i) u += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]); return { x: p[0], y: p[1], u }; });
  })();
  const SPL_LEN = SPL.at(-1).u;
  function splClosest(x, y) { let best = SPL[0], bd = 1e9; SPL.forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }); return { ...best, d: bd }; }
  function splAt(u) { u = clamp(u, 0, SPL_LEN); let i = 1; while (i < SPL.length - 1 && SPL[i].u < u) i++; const a = SPL[i - 1], b = SPL[i], k = (u - a.u) / (b.u - a.u || 1); return [lerp(a.x, b.x, k), lerp(a.y, b.y, k)]; }

  /* ================= the camera rules (CAM), one per rig: R -> { x, y, z, yaw, pitch, fov, ...extras } ================= */
  const chest = (h, z = 1.2) => [h.x, h.y, z];
  const aimed = (pos, target, fov, extra = {}) => ({ x: pos[0], y: pos[1], z: pos[2], ...look(pos, target), fov, ...extra });
  const zoneW = x => { const a = sstep(ZONE_EDGES[0] - ZONE_BLEND, ZONE_EDGES[0] + ZONE_BLEND, x), b = sstep(ZONE_EDGES[1] - ZONE_BLEND, ZONE_EDGES[1] + ZONE_BLEND, x); return [1 - a, a - b, b]; };
  const fixedSet = vol => [...FIXED.rooms, ...FIXED[vol === 'tidy' ? 'tidy' : 'split']];
  const fixedActive = (set, h) => set.find(c => inR(c.vol, h.x, h.y)) || set.reduce((a, c) => rectDist(c.vol, h.x, h.y) < rectDist(a.vol, h.x, h.y) ? c : a);
  function fixedCuts(R, set, span = 6) {   // camera changes over the last span seconds, and how long since the last one
    let cuts = 0, since = 99, prev = fixedActive(set, R.past(span)).id;
    for (let i = Math.round(span * 10) - 1; i >= 0; i--) { const id = fixedActive(set, R.past(i / 10)).id; if (id !== prev) { cuts++; since = i / 10; } prev = id; }
    return { cuts, since };
  }
  function pullIn(anchor, pos) {   // follow and cover cameras slide toward the anchor instead of entering a wall
    const d = sub(pos, anchor), L = Math.hypot(d[0], d[1], d[2]);
    for (let s = .3; s <= L; s += .15) { const k = s / L; if (solidAt(anchor[0] + d[0] * k, anchor[1] + d[1] * k, anchor[2] + d[2] * k)) return lerp3(anchor, pos, Math.max(0, (s - .35) / L)); }
    return pos;
  }
  /* Third-person smoothing. A critically damped spring eases the camera's yaw, its anchor and its boom length toward
     their targets, frame-rate independent (exact update for any step). Every scene must stay a pure function of t (seek,
     GIFs, the drill), so the spring is replayed over the last SMOOTH.win seconds on a fixed grid each time it is read;
     the start-up state's influence has decayed to well under a millimetre by the end. Dead zones: heading changes under
     SMOOTH.yawDZ are absorbed, and the anchor trails the hero by up to SMOOTH.leash, so small steps don't move the camera.
     Both dead zones are soft (measured against a short running average), so they carry no hidden memory. */
  const SMOOTH = { win: 3, step: 1 / 60, yawW: 3.2, posW: 9, avgW: 4, boomIn: 22, boomOut: 4, yawDZ: 6 * D2R, leash: .3, dirSpan: .2, dirMin: .12 };
  function damp(x, v, goal, w, dt, ang) {   // exact critically damped spring step: returns [x, v]
    const e = ang ? wrapA(x - goal) : x - goal, a = v + w * e, ex = Math.exp(-w * dt);
    return [goal + (e + a * dt) * ex, (v - w * a * dt) * ex];
  }
  function heading(R, t, held) {   // the direction the hero is actually travelling (root motion), or held when it stands still
    const a = R.past(R.t - t), b = R.past(R.t - t + SMOOTH.dirSpan), dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy) > SMOOTH.dirMin ? Math.atan2(dy, dx) : held;
  }
  function followState(R, P, yawW = SMOOTH.yawW, boom = true) {
    const S = SMOOTH, t1 = R.t, t0 = (Math.floor((t1 - S.win) / S.step) + 1) * S.step, h0 = R.past(t1 - t0);
    let held = heading(R, t0, h0.face), avgYaw = held, yaw = held, vy = 0;
    let ex = h0.x, ey = h0.y, ax = ex, ay = ey, vx = 0, vyy = 0, k = 1, vk = 0;
    const times = []; for (let t = t0; t < t1 - 1e-9; t += S.step) times.push(t); times.push(t1);
    let prev = t0;
    for (const t of times) {
      const dt = t - prev, h = R.past(t1 - t); prev = t;
      const raw = held = heading(R, t, held);
      if (dt > 0) { const a = 1 - Math.exp(-S.avgW * dt); avgYaw += wrapA(raw - avgYaw) * a; ex += (h.x - ex) * a; ey += (h.y - ey) * a; }
      const goalYaw = raw - clamp(wrapA(raw - avgYaw), -S.yawDZ, S.yawDZ);   // heading dead zone
      const lx = h.x - ex, ly = h.y - ey, L = Math.hypot(lx, ly), lk = L > S.leash ? S.leash / L : 1;
      const gx = h.x - lx * lk, gy = h.y - ly * lk;   // anchor leash (positional dead zone)
      if (dt <= 0) continue;
      [yaw, vy] = damp(yaw, vy, goalYaw, yawW, dt, true);
      [ax, vx] = damp(ax, vx, gx, S.posW, dt); [ay, vyy] = damp(ay, vyy, gy, S.posW, dt);
      if (boom && P) {
        const an = [ax, ay, P.anchor], want = boomPos(an, yaw, P), got = pullIn(an, want);
        const kk = Math.hypot(...sub(got, an)) / (Math.hypot(...sub(want, an)) || 1);
        [k, vk] = damp(k, vk, kk, kk < k ? S.boomIn : S.boomOut, dt);
      }
    }
    return { yaw: wrapA(yaw), ax, ay, k: clamp(k, 0, 1) };
  }
  function boomPos(anchor, yaw, P) {
    const f = [Math.cos(yaw), Math.sin(yaw)], r = [-f[1], f[0]];
    return [anchor[0] - f[0] * P.dist + r[0] * P.side, anchor[1] - f[1] * P.dist + r[1] * P.side, P.anchor + P.up];
  }
  function followCam(h, yaw, P, fov, S) {   // S: the smoothed state from followState; without it, a hard rig (cover pose)
    const anchor = S ? [S.ax, S.ay, P.anchor] : [h.x, h.y, P.anchor];
    if (S) yaw = S.yaw;
    const want = boomPos(anchor, yaw, P);
    const pos = S ? lerp3(anchor, want, S.k) : pullIn(anchor, want);
    return { x: pos[0], y: pos[1], z: pos[2], yaw, pitch: P.pitch * D2R, fov, anchor, want };
  }
  function floatPose(t) {
    const K = FLOAT.keys, tt = ((t % FLOAT.loop) + FLOAT.loop) % FLOAT.loop;
    let i = 1; while (i < K.length - 1 && K[i].t <= tt) i++;
    const a = K[i - 1], b = K[i];
    if (b.cut) return { pos: a.pos, at: a.at, cut: a.cut, since: tt - a.t };
    const k = smooth(clamp((tt - a.t) / (b.t - a.t)));
    return { pos: lerp3(a.pos, b.pos, k), at: lerp3(a.at, b.at, k), cut: a.cut, since: tt - a.t };
  }
  const coverW = h => COVER.vols.reduce((m, v) => Math.max(m, 1 - sstep(0, COVER.fade, rectDist(v.r, h.x, h.y))), 0);
  const CAM = {
    fixed(R) {
      const set = fixedSet(R.opt.vol), a = fixedActive(set, R.h), rest = look(a.pos, [(a.vol[0] + a.vol[2]) / 2, (a.vol[1] + a.vol[3]) / 2, 1]).yaw;
      const L = look(a.pos, chest(R.h)), lim = FIXED.turn * D2R, yaw = rest + clamp(wrapA(L.yaw - rest), -lim, lim);
      return { x: a.pos[0], y: a.pos[1], z: a.pos[2], yaw, pitch: L.pitch, fov: RIGS.fixed.fov, active: a.id, set, ...fixedCuts(R, set) };
    },
    dolly(R) {
      const h = chest(R.h), w = zoneW(R.h.x); let pos = [0, 0, 0]; const rails = [];
      DOLLY.forEach((d, i) => {
        const v = sub(h, d.P), L = Math.hypot(v[0], v[1], v[2]), s = clamp(L - d.D, d.sMin, L - 1.2), p = lerp3(d.P, h, s / L);
        rails.push({ P: d.P, p, w: w[i] }); pos = pos.map((q, j) => q + p[j] * w[i]);
      });
      return aimed(pos, h, RIGS.dolly.fov, { rails });
    },
    blend(R) {
      const h = R.h, w = zoneW(h.x); let pos = [0, 0, 0]; const parts = [];
      PB.forEach((b, i) => {
        const ax = b.h2[0] - b.h1[0], ay = b.h2[1] - b.h1[1], k = clamp(((h.x - b.h1[0]) * ax + (h.y - b.h1[1]) * ay) / (ax * ax + ay * ay)), p = lerp3(b.c1, b.c2, smooth(k));
        parts.push({ b, k, w: w[i], p }); pos = pos.map((q, j) => q + p[j] * w[i]);
      });
      return aimed(pos, chest(h), RIGS.blend.fov, { parts });
    },
    vector(R) {
      const yaw = VEC.yaw * D2R, pitch = VEC.pitch * D2R, cp = Math.cos(pitch);
      return { x: R.h.x - Math.cos(yaw) * cp * VEC.dist, y: R.h.y - Math.sin(yaw) * cp * VEC.dist, z: 1 + Math.sin(pitch) * VEC.dist, yaw, pitch, fov: RIGS.vector.fov };
    },
    spline(R) {
      const c = splClosest(R.h.x, R.h.y), q = splAt(c.u - SPLINE.lag), pos = [q[0], q[1], SPLINE.z];
      return aimed(pos, chest(R.h), RIGS.spline.fov, { near: c, off: c.d });
    },
    animated(R) {
      const p = splClosest(R.h.x, R.h.y).u / SPL_LEN, p0 = splClosest(R.past(.25).x, R.past(.25).y).u / SPL_LEN;
      let i = 1; while (i < ANIM.length - 1 && ANIM[i].p < p) i++;
      const a = ANIM[i - 1], b = ANIM[i], k = smooth(clamp((p - a.p) / (b.p - a.p)));
      const pos = lerp3(a.pos, b.pos, k), at = lerp3(a.at, b.at, k);
      return aimed(pos, at, RIGS.animated.fov, { p, frame: Math.round(p * ANIM_FRAMES), dir: p > p0 + .002 ? 1 : p < p0 - .002 ? -1 : 0 });
    },
    floating(R) {
      if (R.opt.float) {   // the learner's own float point: looks north, pitch rises with height
        const f = R.opt.float, pitch = lerp(16, 62, clamp((f.z - 3) / 23)) * D2R;
        return { x: f.x, y: f.y, z: f.z, yaw: -Math.PI / 2, pitch, fov: RIGS.floating.fov, manual: true };
      }
      const P = floatPose(R.t);
      return aimed(P.pos, P.at, RIGS.floating.fov, { jump: P.cut && P.since < 1.4 ? P.cut : null, flash: P.cut && P.since < .25 });
    },
    follow(R) { return followCam(R.h, 0, FOLLOW, RIGS.follow.fov, followState(R, FOLLOW)); },
    cover(R) {
      const w = coverW(R.h), base = followCam(R.h, 0, FOLLOW, RIGS.follow.fov, followState(R, FOLLOW));
      if (w <= 0) return { ...base, w, crouch: 0 };
      const v = COVER.vols[0], cov = followCam(R.h, v.face, COVER, RIGS.cover.fov);
      return { x: lerp(base.x, cov.x, w), y: lerp(base.y, cov.y, w), z: lerp(base.z, cov.z, w), yaw: lerpA(base.yaw, cov.yaw, w), pitch: lerp(base.pitch, cov.pitch, w), fov: lerp(base.fov, cov.fov, w), anchor: lerp3(base.anchor, cov.anchor, w), w, crouch: w, heroFace: w > .5 ? v.face : null };
    },
    first(R) { return { x: R.h.x, y: R.h.y, z: FP.eye, yaw: followState(R, null, 9, false).yaw, pitch: FP.pitch * D2R, fov: RIGS.first.fov, fp: true }; },
  };

  /* ================= the perspective projector ================= */
  const NEAR = .12;
  function basis(c, V) {
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const f = [cy * cp, sy * cp, -sp], r = [-sy, cy, 0], u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
    return { o: [c.x, c.y, c.z], f, r, u, F: (V.w / 2) / Math.tan(c.fov * D2R / 2), V };
  }
  const toCam = (B, p) => { const d = sub(p, B.o); return [dot(d, B.r), dot(d, B.u), dot(d, B.f)]; };
  const scr = (B, q) => [B.V.x + B.V.w / 2 + q[0] / q[2] * B.F, B.V.y + B.V.h / 2 - q[1] / q[2] * B.F];
  function clipNear(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ia = a[2] >= NEAR, ib = b[2] >= NEAR;
      if (ia) out.push(a);
      if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k), NEAR]); }
    }
    return out;
  }
  // box faces, split into chunks of at most 2 m so the painter's sort holds up next to the hero
  const LIGHT = [-.45, -.75, .5];
  const shade = (rgb, n) => { const k = .68 + .32 * Math.max(0, dot(n, LIGHT)); return `rgb(${rgb.map(v => Math.round(v * k)).join(',')})`; };
  const KIND = { wall: { side: [176, 178, 202], top: '#5a5f92' }, pillar: { side: [150, 154, 178], top: '#62688a' }, crate: { side: [214, 172, 124], top: '#e2c08f' } };
  const FACES = (() => {
    const out = [];
    BOXES.forEach(b => {
      const [x0, y0, x1, y1] = b.r, h = b.h, along = (x1 - x0) >= (y1 - y0), L = along ? x1 - x0 : y1 - y0, n = Math.max(1, Math.ceil(L / 2)), K = KIND[b.kind];
      for (let i = 0; i < n; i++) {
        const a = i / n, c = (i + 1) / n;
        const X0 = along ? lerp(x0, x1, a) : x0, X1 = along ? lerp(x0, x1, c) : x1, Y0 = along ? y0 : lerp(y0, y1, a), Y1 = along ? y1 : lerp(y0, y1, c);
        const add = (q, nrm) => out.push({ q, n: nrm, col: nrm[2] ? K.top : shade(K.side, nrm), c: [q.reduce((s, p) => s + p[0], 0) / 4, q.reduce((s, p) => s + p[1], 0) / 4, q.reduce((s, p) => s + p[2], 0) / 4] });
        if (along || i === 0) add([[X0, Y0, 0], [X1, Y0, 0], [X1, Y0, h], [X0, Y0, h]], [0, -1, 0]);
        if (along || i === n - 1) add([[X0, Y1, 0], [X1, Y1, 0], [X1, Y1, h], [X0, Y1, h]], [0, 1, 0]);
        if (!along || i === 0) add([[X0, Y0, 0], [X0, Y1, 0], [X0, Y1, h], [X0, Y0, h]], [-1, 0, 0]);
        if (!along || i === n - 1) add([[X1, Y0, 0], [X1, Y1, 0], [X1, Y1, h], [X1, Y0, h]], [1, 0, 0]);
        add([[X0, Y0, h], [X1, Y0, h], [X1, Y1, h], [X0, Y1, h]], [0, 0, 1]);
      }
    });
    return out;
  })();
  function polyPath(g, B, poly3) {
    const q = clipNear(poly3.map(p => toCam(B, p))); if (q.length < 3) return false;
    g.beginPath(); q.forEach((p, i) => { const s = scr(B, p); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }); g.closePath(); return true;
  }
  function line3(g, B, a, b) {
    let p = toCam(B, a), q = toCam(B, b);
    if (p[2] < NEAR && q[2] < NEAR) return;
    if (p[2] < NEAR) { const k = (NEAR - p[2]) / (q[2] - p[2]); p = [lerp(p[0], q[0], k), lerp(p[1], q[1], k), NEAR]; }
    if (q[2] < NEAR) { const k = (NEAR - q[2]) / (p[2] - q[2]); q = [lerp(q[0], p[0], k), lerp(q[1], p[1], k), NEAR]; }
    const s = scr(B, p), e = scr(B, q); g.moveTo(s[0], s[1]); g.lineTo(e[0], e[1]);
  }
  // a capsule (hero or foe) between z=r and z=h-r, drawn as a round-capped stroke; returns its on-screen height
  function capsule(g, B, x, y, h, rad, col, face, draw = true) {
    const foot = toCam(B, [x, y, 0]), head = toCam(B, [x, y, h]);
    if (foot[2] < NEAR || head[2] < NEAR) return 0;
    const sf = scr(B, foot), sh = scr(B, head), px = Math.hypot(sh[0] - sf[0], sh[1] - sf[1]);
    if (!draw) return px;
    const mid = toCam(B, [x, y, h / 2]), wpx = 2 * rad * B.F / mid[2];
    // body: a round-capped stroke up to the shoulders; head: a ball on top
    const a = scr(B, toCam(B, [x, y, rad])), b = scr(B, toCam(B, [x, y, h * .72 - rad * .4])), hz = h * .87, hq = toCam(B, [x, y, hz]), hs = scr(B, hq), hr = h * .13 * B.F / hq[2];
    g.fillStyle = 'rgba(40,30,20,.25)'; g.beginPath(); g.ellipse(sf[0], sf[1], wpx * .75, Math.max(2, wpx * .25), 0, 0, TAU); g.fill();
    g.lineCap = 'round';
    g.strokeStyle = '#fff'; g.lineWidth = wpx + 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = col; g.lineWidth = wpx; g.stroke();
    g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(hs[0], hs[1], hr, 0, TAU); g.fill(); g.stroke();
    if (face != null) {   // a visor on the front of the head, visible when the capsule faces the camera
      const hp = [x, y, hz], fp = [x + Math.cos(face) * h * .09, y + Math.sin(face) * h * .09, hz];
      const dh = Math.hypot(...sub(hp, B.o)), df = Math.hypot(...sub(fp, B.o));
      if (df < dh) { const s = scr(B, toCam(B, fp)); g.fillStyle = C.navy; g.beginPath(); g.ellipse(s[0], s[1], hr * .7, hr * .32, 0, 0, TAU); g.fill(); }
    }
    return px;
  }
  const HERO_H = 1.8, HERO_R = .36;
  function heroPx(cam, V, h, crouch = 0) { return capsule(null, basis(cam, V), h.x, h.y, lerp(HERO_H, 1.15, crouch), HERO_R, C.player, null, false); }
  const foesAt = t => FOES.map(([x, y], i) => [x + Math.sin(t * .9 + i * 2) * .5, y + Math.cos(t * .7 + i) * .4]);
  // the whole 3D view: sky, floor, sorted boxes and capsules
  function drawView(g, V, cam, R, o = {}) {
    const B = basis(cam, V);
    g.save(); g.beginPath(); g.roundRect(V.x, V.y, V.w, V.h, 10); g.clip();
    const sky = g.createLinearGradient(0, V.y, 0, V.y + V.h); sky.addColorStop(0, '#e4e7f3'); sky.addColorStop(1, '#f6efdf');
    g.fillStyle = sky; g.fillRect(V.x, V.y, V.w, V.h);
    if (polyPath(g, B, [[-150, -150, 0], [200, -150, 0], [200, 200, 0], [-150, 200, 0]])) { g.fillStyle = '#cdc0a3'; g.fill(); }
    ROOMS.forEach(r => { if (polyPath(g, B, [[r[0], r[1], 0], [r[2], r[1], 0], [r[2], r[3], 0], [r[0], r[3], 0]])) { g.fillStyle = C.floor; g.fill(); } });
    g.strokeStyle = C.floorLn; g.lineWidth = 1; g.beginPath();
    ROOMS.forEach(r => {
      for (let x = Math.ceil(r[0] / 2) * 2; x <= r[2]; x += 2) line3(g, B, [x, r[1], 0], [x, r[3], 0]);
      for (let y = Math.ceil(r[1] / 2) * 2; y <= r[3]; y += 2) line3(g, B, [r[0], y, 0], [r[2], y, 0]);
    });
    g.stroke();
    if (o.spline) {   // the designer's rail, drawn on the floor
      g.strokeStyle = 'rgba(224,169,45,.85)'; g.lineWidth = 2.5; g.setLineDash([8, 6]); g.beginPath();
      for (let i = 1; i < SPL.length; i++) line3(g, B, [SPL[i - 1].x, SPL[i - 1].y, .02], [SPL[i].x, SPL[i].y, .02]);
      g.stroke(); g.setLineDash([]);
    }
    const items = [];
    FACES.forEach(F => { if (dot(F.n, sub(B.o, F.q[0])) > 0) items.push({ d: Math.hypot(...sub(F.c, B.o)), F }); });
    const h = R.h, crouch = cam.crouch || 0;
    if (!cam.fp) items.push({ d: Math.hypot(h.x - B.o[0], h.y - B.o[1], .9 - B.o[2]), cap: [h.x, h.y, lerp(HERO_H, 1.15, crouch), HERO_R, C.player, cam.heroFace ?? h.face] });
    foesAt(R.t).forEach(([x, y]) => items.push({ d: Math.hypot(x - B.o[0], y - B.o[1], 1 - B.o[2]), cap: [x, y, 1.9, .42, C.red, Math.atan2(h.y - y, h.x - x)] }));
    items.sort((a, b) => b.d - a.d);
    let px = 0;
    g.lineJoin = 'round';
    items.forEach(it => {
      if (it.F) { if (polyPath(g, B, it.F.q)) { g.fillStyle = it.F.col; g.fill(); g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 1; g.stroke(); } }
      else { const v = capsule(g, B, ...it.cap); if (it.cap[4] === C.player) px = v; }
    });
    if (cam.fp) {   // first-person: only the weapon shows
      const bx = V.x + V.w * .66, by = V.y + V.h, s = V.w / 524;
      g.fillStyle = '#4b4f74'; g.strokeStyle = C.navy; g.lineWidth = 2;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 30 * s, by - 92 * s); g.lineTo(bx + 62 * s, by - 96 * s); g.lineTo(bx + 96 * s, by); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#6b7099'; g.fillRect(bx + 34 * s, by - 112 * s, 24 * s, 22 * s); g.strokeRect(bx + 34 * s, by - 112 * s, 24 * s, 22 * s);
      g.fillStyle = '#f2b98a'; g.beginPath(); g.ellipse(bx + 70 * s, by - 18 * s, 26 * s, 18 * s, -.5, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(21,32,68,.6)'; g.lineWidth = 2; const cx = V.x + V.w / 2, cy = V.y + V.h / 2;
      g.beginPath(); g.moveTo(cx - 8, cy); g.lineTo(cx + 8, cy); g.moveTo(cx, cy - 8); g.lineTo(cx, cy + 8); g.stroke();
    }
    if (o.flash > 0) { g.fillStyle = `rgba(255,255,255,${o.flash})`; g.fillRect(V.x, V.y, V.w, V.h); }
    g.restore();
    g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2; g.beginPath(); g.roundRect(V.x, V.y, V.w, V.h, 10); g.stroke();
    return px;
  }

  /* ================= the top-down map ================= */
  function camGlyph(g, x, y, yaw, o = {}) {
    g.save(); g.translate(x, y); g.rotate(yaw); g.globalAlpha *= o.a ?? 1;
    g.fillStyle = o.fill || C.navy; g.strokeStyle = o.edge || '#fff'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-10, -6, 13, 12, 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(3, -3); g.lineTo(10, -7); g.lineTo(10, 7); g.lineTo(3, 3); g.closePath(); g.fill(); g.stroke();
    if (o.ring) { g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.arc(-1, 0, 15, 0, TAU); g.stroke(); }
    g.restore();
  }
  const tag = (g, text, x, y, col = C.ink, size = 11) => T.label(text, x, y, 'center', col, size);
  function drawLevelMap(g) {
    g.fillStyle = '#e4d9c1'; g.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
    ROOMS.forEach(r => { g.fillStyle = C.floor; g.fillRect(mx(r[0]), my(r[1]), (r[2] - r[0]) * MAP.s, (r[3] - r[1]) * MAP.s); });
    g.strokeStyle = C.floorLn; g.lineWidth = 1; g.beginPath();
    ROOMS.forEach(r => {
      for (let x = Math.ceil(r[0] / 2) * 2; x <= r[2]; x += 2) { g.moveTo(mx(x), my(r[1])); g.lineTo(mx(x), my(r[3])); }
      for (let y = Math.ceil(r[1] / 2) * 2; y <= r[3]; y += 2) { g.moveTo(mx(r[0]), my(y)); g.lineTo(mx(r[2]), my(y)); }
    });
    g.stroke();
    WALLS.forEach(r => { g.fillStyle = C.wall; g.fillRect(mx(r[0]), my(r[1]), (r[2] - r[0]) * MAP.s, (r[3] - r[1]) * MAP.s); });
    PROPS.forEach(p => {
      const [x0, y0, x1, y1] = p.r;
      g.fillStyle = p.kind === 'crate' ? '#c9a27a' : C.stone; g.strokeStyle = p.kind === 'crate' ? '#7a5a3a' : C.navy; g.lineWidth = 1.5;
      g.fillRect(mx(x0), my(y0), (x1 - x0) * MAP.s, (y1 - y0) * MAP.s); g.strokeRect(mx(x0), my(y0), (x1 - x0) * MAP.s, (y1 - y0) * MAP.s);
    });
    g.font = font(12); g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'middle';
    LABELS.forEach(([s, x, y]) => g.fillText(s, mx(x), my(y)));
  }
  function frustum(g, cam, range = 9) {
    const x = mx(cam.x), y = my(cam.y), half = Math.atan(Math.tan(cam.fov * D2R / 2)), R = range * MAP.s;
    g.fillStyle = 'rgba(255,185,81,.22)'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, R, cam.yaw - half, cam.yaw + half); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(190,120,20,.85)'; g.lineWidth = 2; g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]);
  }
  const dash = (g, pts, col, w = 2, d = [6, 5]) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(d); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(mx(x), my(y)) : g.moveTo(mx(x), my(y))); g.stroke(); g.setLineDash([]); };
  // rig overlays: rails, volumes, splines, anchors
  const OVER = {
    fixed(g, R, cam) {
      cam.set.forEach(c => {
        const on = c.id === cam.active, [x0, y0, x1, y1] = c.vol, col = /C/.test(c.id) && c.id !== 'C' ? (c.id === 'C1' ? '229,50,45' : '138,79,214') : '85,98,235';
        g.fillStyle = `rgba(${col},${on ? .16 : .07})`; g.fillRect(mx(x0), my(y0), (x1 - x0) * MAP.s, (y1 - y0) * MAP.s);
        g.strokeStyle = `rgba(${col},${on ? .9 : .45})`; g.lineWidth = 2; g.setLineDash([7, 5]); g.strokeRect(mx(x0) + 1, my(y0) + 1, (x1 - x0) * MAP.s - 2, (y1 - y0) * MAP.s - 2); g.setLineDash([]);
        if (!on) camGlyph(g, mx(c.pos[0]), my(c.pos[1]), look(c.pos, [(x0 + x1) / 2, (y0 + y1) / 2, 0]).yaw, { a: .45 });
        tag(g, `cam ${c.id}`, mx(c.pos[0]), my(c.pos[1]) + (c.pos[1] > 20 ? -17 : 17), C.ink, 10);
      });
      if (R.opt.vol !== 'tidy') { dash(g, [[35, 8], [35, 22]], C.red, 3, [5, 4]); tag(g, 'volume edge in the fight', mx(35), my(23.6), C.red, 11); }
    },
    dolly(g, R, cam) {
      dash(g, [[.5, 1.5], [40, 1.5], [40, 28.5], [.5, 28.5], [.5, 1.5]], 'rgba(21,32,68,.35)', 1.5, [3, 4]);
      cam.rails.forEach(r => {
        const a = .25 + .75 * r.w; g.globalAlpha = a;
        dash(g, [[r.P[0], r.P[1]], [R.h.x, R.h.y]], C.ink, 1.5, [3, 5]);
        camGlyph(g, mx(r.P[0]), my(r.P[1]), look(r.P, [R.h.x, R.h.y, 1]).yaw, { fill: '#151515' });
        g.globalAlpha = 1;
      });
      const main = cam.rails.reduce((a, b) => b.w > a.w ? b : a);
      tag(g, 'implementation point (outside the level)', mx(main.P[0]) + (main.P[0] < 0 ? 92 : main.P[0] > 40 ? -96 : 0), my(main.P[1]) + (main.P[1] > 30 ? -14 : 62), C.ink, 10);
      tag(g, 'virtual camera', mx(cam.x), my(cam.y) - 16, C.goldInk, 10);
    },
    blend(g, R, cam) {
      cam.parts.forEach(({ b, k, w }) => {
        const a = .3 + .7 * w; g.globalAlpha = a;
        dash(g, [[b.c1[0], b.c1[1]], [b.c2[0], b.c2[1]]], C.blue, 2, [4, 4]);
        [[b.c1, '_1'], [b.c2, '_2']].forEach(([c, s]) => { camGlyph(g, mx(c[0]), my(c[1]), look(c, [R.h.x, R.h.y, 1]).yaw, { fill: '#fff', edge: C.navy }); tag(g, b.id.slice(2) + s, mx(c[0]), my(c[1]) + (c[1] > 20 ? 15 : -15), C.blue, 10); });
        g.globalAlpha = 1;
        if (w > .5) tag(g, `${b.id}: ${Math.round(k * 100)}% toward ${b.id.slice(2)}_2`, mx((b.c1[0] + b.c2[0]) / 2), my(Math.max(b.c1[1], b.c2[1])) + 30, C.blue, 11);
      });
    },
    vector(g, R, cam) {
      dash(g, [[R.h.x, R.h.y], [cam.x, cam.y]], C.ink, 2, [4, 4]);
      tag(g, `yaw ${VEC.yaw}°, pitch ${VEC.pitch}°, ${VEC.dist} m: always`, mx(R.h.x), my(R.h.y) + 30, C.ink, 11);
    },
    spline(g, R, cam) {
      dash(g, SPL.map(p => [p.x, p.y]), 'rgba(190,120,20,.95)', 3, [8, 5]);
      const n = cam.near; dash(g, [[R.h.x, R.h.y], [n.x, n.y]], cam.off > 2 ? C.red : C.ink, 2, [3, 4]);
      if (cam.off > 1.5) tag(g, `off the spline ${cam.off.toFixed(1)} m`, mx((R.h.x + n.x) / 2) + 58, my((R.h.y + n.y) / 2), C.red, 11);
      tag(g, 'spline', mx(SPLINE.pts[1][0]), my(SPLINE.pts[1][1]) + 14, C.goldInk, 10);
    },
    animated(g, R, cam) {
      dash(g, SPL.map(p => [p.x, p.y]), 'rgba(21,32,68,.3)', 1.5, [3, 5]);
      ANIM.forEach((k, i) => { camGlyph(g, mx(k.pos[0]), my(k.pos[1]), look(k.pos, k.at).yaw, { fill: '#fff', edge: C.navy, a: .7 }); tag(g, `key ${i + 1}`, mx(k.pos[0]), my(k.pos[1]) + (k.pos[1] > 20 ? 16 : -16), C.muted, 9); });
      const bx = mx(1), by = my(31.2), bw = 37 * MAP.s;   // the animation timeline the hero scrubs
      g.fillStyle = '#e6dcc5'; g.fillRect(bx, by - 4, bw, 8); g.fillStyle = C.gold; g.fillRect(bx, by - 4, bw * cam.p, 8);
      ANIM.forEach(k => { g.fillStyle = C.navy; g.fillRect(bx + bw * k.p - 1, by - 7, 2, 14); });
      tag(g, `frame ${cam.frame} / ${ANIM_FRAMES} ${cam.dir > 0 ? '▶ forward' : cam.dir < 0 ? '◀ backward' : '■ held'}`, bx + bw / 2, by - 15, C.ink, 11);
    },
    floating(g, R, cam) {
      Object.entries(FLOAT.jumps).forEach(([n, [x, y]], i) => { g.fillStyle = C.blue; g.beginPath(); g.arc(mx(x), my(y), 9, 0, TAU); g.fill(); g.font = font(11, 700); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i + 1, mx(x), my(y) + 1); });
      tag(g, `float point, height ${cam.z.toFixed(1)} m`, mx(cam.x), my(cam.y) + (cam.y > 29 ? -16 : 16), C.goldInk, 10);
      if (cam.jump) tag(g, `jump-to shortcut: ${cam.jump}`, mx(FLOAT.jumps[cam.jump][0]), my(FLOAT.jumps[cam.jump][1]) - 22, C.blue, 12);
    },
    follow(g, R, cam) {
      dash(g, [[cam.anchor[0], cam.anchor[1]], [cam.x, cam.y]], C.ink, 2, [4, 3]);
      g.fillStyle = C.gold; g.beginPath(); g.arc(mx(cam.anchor[0]), my(cam.anchor[1]), 4, 0, TAU); g.fill();
      if (cam.want && Math.hypot(cam.want[0] - cam.x, cam.want[1] - cam.y) > .3) { dash(g, [[cam.x, cam.y], [cam.want[0], cam.want[1]]], C.red, 2, [2, 3]); tag(g, 'pulled in off the wall', mx(cam.x), my(cam.y) + 18, C.red, 10); }
    },
    cover(g, R, cam) {
      COVER.vols.forEach(v => { const [x0, y0, x1, y1] = v.r; g.fillStyle = `rgba(85,98,235,${.08 + .2 * cam.w})`; g.fillRect(mx(x0), my(y0), (x1 - x0) * MAP.s, (y1 - y0) * MAP.s); g.strokeStyle = C.blue; g.lineWidth = 2; g.setLineDash([5, 4]); g.strokeRect(mx(x0), my(y0), (x1 - x0) * MAP.s, (y1 - y0) * MAP.s); g.setLineDash([]); tag(g, 'low cover volume', mx((x0 + x1) / 2), my(y1) + 12, C.blue, 10); });
      OVER.follow(g, R, cam);
      if (cam.w > .5) tag(g, 'cover camera: low, right shoulder', mx(R.h.x), my(R.h.y) - 44, C.blue, 11);
    },
    first(g, R, cam) { tag(g, 'camera = the hero’s eyes', mx(R.h.x), my(R.h.y) + 26, C.ink, 11); },
  };
  function drawMap(g, rig, R, cam, o = {}) {
    g.save(); g.beginPath(); g.roundRect(MAP.x, MAP.y, MAP.w, MAP.h, 10); g.clip();
    drawLevelMap(g);
    if (!o.hide) OVER[rig](g, R, cam);
    foesAt(R.t).forEach(([x, y]) => T.foe(mx(x), my(y), 6, Math.atan2(R.h.y - y, R.h.x - x)));
    T.player(mx(R.h.x), my(R.h.y), cam.fp ? cam.yaw : R.h.face, .42);
    frustum(g, cam, Math.max(9, Math.hypot(cam.x - R.h.x, cam.y - R.h.y) + 3));
    camGlyph(g, mx(cam.x), my(cam.y), cam.yaw, { fill: o.hide ? C.navy : rig === 'dolly' ? '#fff' : C.navy, edge: rig === 'dolly' && !o.hide ? C.navy : '#fff', ring: !cam.fp });
    g.font = font(11, 700); g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(o.title || 'MAP (TOP-DOWN)', MAP.x + 10, MAP.y + 12);
    g.restore();
    g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2; g.beginPath(); g.roundRect(MAP.x, MAP.y, MAP.w, MAP.h, 10); g.stroke();
  }

  /* ================= the scrolling strip (Super Mario Bros. style) ================= */
  const PAL = { R: '#d8322b', S: '#f2b98a', K: '#5a3216', B: '#2f56c9', Y: '#ffd23f', W: '#ffffff', k: '#151515', N: '#a4552a', n: '#6e3414', p: '#ffd7a8' };
  const HERO = ['...RRRR...', '..RRRRRRR.', '..KSSSSK..', '..SSkSkS..', '..SSSSSS..', '...SSSS...', '..RRBBRR..', '.RRBBBBRR.', '.SRBYYBRS.', '.S.BBBB.S.', '...BBBB...', '...B..B...', '..KK..KK..'];
  const HERO_STEP = HERO.slice(0, 11).concat(['....BB....', '...KKKK...']);
  const HERO_JUMP = HERO.slice(0, 7).concat(['SRRBBBBRRS', '..RBYYBR..', '...BBBB...', '...BBBB...', '..B....B..', '.KK....KK.']);
  const GOOMBA = ['....NNNN....', '..NNNNNNNN..', '.NNkWNNWkNN.', 'NNNkWNNWkNNN', 'NNNNNNNNNNNN', '.NNNNNNNNNN.', '...pppppp...', '..nnpppppp..', '.nnnn..pnnn.'];
  const GOOMBA_STEP = GOOMBA.slice(0, 7).concat(['..pppppnn...', '..nnn.nnnn..']);
  function spr(g, rows, x, foot, P, flip) {
    const w = rows[0].length, h = rows.length;
    g.save(); g.translate(Math.round(x), Math.round(foot - h * P / 2)); if (flip) g.scale(-1, 1);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const ch = rows[r][c]; if (ch === '.') continue; g.fillStyle = PAL[ch]; g.fillRect(Math.round((c - w / 2) * P), Math.round((r - h / 2) * P), Math.ceil(P), Math.ceil(P)); }
    g.restore();
  }
  const OBST = [...STRIP.pipes.map(([x, h]) => [x, x + 2, h]), ...STRIP.goombas.map(x => [x - .5, x + .5, 1])];
  const stripY = x => OBST.reduce((m, [a, b, h]) => { const s = (x - (a - 1.6)) / (b - a + 3.2); return s > 0 && s < 1 ? Math.max(m, (h + 1.3) * Math.sin(Math.PI * s)) : m; }, 0);
  const VIEW_TILES = VIEW.w / STRIP.tile;
  const stripCam = maxX => clamp(maxX - STRIP.lead, 0, STRIP.len - VIEW_TILES);
  function stripTrack(x0, speed, hold = .8) {   // run right at speed from x0, then hold; camera = running max, so it never scrolls back
    const run = (STRIP.len - 14 - x0) / speed;
    return { dur: run + hold, at: t => { const x = x0 + speed * clamp(t, 0, run); return { x, moving: t < run }; } };
  }
  function drawStripView(g, V, hx, camX, t) {
    const TS = STRIP.tile * V.w / VIEW.w, P = STRIP.P * V.w / VIEW.w, gy = V.y + V.h - 2 * TS, sx = x => V.x + (x - camX) * TS, sy = y => gy - y * TS;
    g.save(); g.beginPath(); g.roundRect(V.x, V.y, V.w, V.h, 10); g.clip();
    g.fillStyle = '#5c94fc'; g.fillRect(V.x, V.y, V.w, V.h);
    STRIP.hills.forEach(([x, s]) => { g.fillStyle = '#00a800'; g.beginPath(); g.ellipse(sx(x + 2.5 * s), gy, 2.5 * s * TS, (1.2 + s * .6) * TS, 0, Math.PI, 0); g.fill(); g.fillStyle = '#005800'; g.fillRect(sx(x + 2.5 * s) - 4, gy - (s * .6 + .6) * TS, 3, 8); });
    STRIP.clouds.forEach(([x, y]) => { g.fillStyle = '#fff'; [[0, 0, .7], [.7, -.3, .8], [1.5, 0, .7]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(sx(x + dx), sy(y + dy), r * TS * .7, 0, TAU); g.fill(); }); });
    for (let x = Math.floor(camX); x < camX + VIEW_TILES + 1; x++) for (let r = 0; r < 2; r++) {   // ground bricks
      const X = sx(x), Y = gy + r * TS; g.fillStyle = '#c84c0c'; g.fillRect(X, Y, TS, TS);
      g.strokeStyle = '#000'; g.lineWidth = 1.5; g.strokeRect(X + .5, Y + .5, TS - 1, TS - 1); g.fillStyle = '#fcbcb0'; g.fillRect(X + 2, Y + 2, TS - 6, 2);
    }
    STRIP.blocks.forEach(([x, y, k]) => {
      const X = sx(x), Y = sy(y + 1); if (X < V.x - TS || X > V.x + V.w) return;
      g.fillStyle = k === 'q' ? '#fc9838' : '#c84c0c'; g.fillRect(X, Y, TS, TS); g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(X + 1, Y + 1, TS - 2, TS - 2);
      if (k === 'q') { g.font = `800 ${TS * .7}px Montserrat, sans-serif`; g.fillStyle = '#7a2c00'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', X + TS / 2, Y + TS / 2 + 1); }
      else { g.strokeStyle = '#000'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X, Y + TS / 2); g.lineTo(X + TS, Y + TS / 2); g.moveTo(X + TS / 2, Y); g.lineTo(X + TS / 2, Y + TS / 2); g.stroke(); }
    });
    STRIP.pipes.forEach(([x, h]) => {
      const X = sx(x), Y = sy(h); if (X < V.x - 3 * TS || X > V.x + V.w) return;
      g.fillStyle = '#00a800'; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.fillRect(X + 3, Y + TS * .5, 2 * TS - 6, h * TS - TS * .5); g.strokeRect(X + 3, Y + TS * .5, 2 * TS - 6, h * TS - TS * .5);
      g.fillRect(X - 2, Y, 2 * TS + 4, TS * .55); g.strokeRect(X - 2, Y, 2 * TS + 4, TS * .55);
      g.fillStyle = '#80d010'; g.fillRect(X + 8, Y + TS * .6, 5, h * TS - TS * .7); g.fillRect(X + 2, Y + 3, 6, TS * .4);
    });
    STRIP.goombas.forEach((x, i) => { const gx = x + Math.sin(t * 1.5 + i) * .25; if (sx(gx) > V.x - TS && sx(gx) < V.x + V.w + TS) spr(g, Math.floor(t * 4 + i) % 2 ? GOOMBA : GOOMBA_STEP, sx(gx), gy, P); });
    const y = stripY(hx), rows = y > .05 ? HERO_JUMP : Math.floor(hx * 1.6) % 2 ? HERO : HERO_STEP;
    spr(g, rows, sx(hx), sy(y), P * 1.1);
    g.restore();
    g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2; g.beginPath(); g.roundRect(V.x, V.y, V.w, V.h, 10); g.stroke();
    return 13 * P * 1.1;
  }
  const SMAP = { x: MAP.x + 10, y: MAP.y + 150, w: MAP.w - 20, s: (MAP.w - 20) / STRIP.len };
  function drawStripMap(g, hx, camX, o = {}) {
    g.save(); g.beginPath(); g.roundRect(MAP.x, MAP.y, MAP.w, MAP.h, 10); g.clip();
    g.fillStyle = '#e4d9c1'; g.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
    const X = x => SMAP.x + x * SMAP.s, gy = SMAP.y + 60, ts = SMAP.s;
    g.fillStyle = '#cfe0ff'; g.fillRect(SMAP.x, gy - 9 * ts, SMAP.w, 9 * ts);
    g.fillStyle = '#c84c0c'; g.fillRect(SMAP.x, gy, SMAP.w, 2 * ts);
    STRIP.pipes.forEach(([x, h]) => { g.fillStyle = '#00a800'; g.fillRect(X(x), gy - h * ts, 2 * ts, h * ts); });
    STRIP.blocks.forEach(([x, y, k]) => { g.fillStyle = k === 'q' ? '#fc9838' : '#c84c0c'; g.fillRect(X(x), gy - (y + 1) * ts, ts, ts); });
    STRIP.goombas.forEach(x => { g.fillStyle = '#a4552a'; g.fillRect(X(x) - 2, gy - ts, 4, ts); });
    // the camera window
    g.fillStyle = 'rgba(255,185,81,.25)'; g.fillRect(X(camX), gy - 9.2 * ts, VIEW_TILES * ts, 11.2 * ts);
    g.strokeStyle = C.goldInk; g.lineWidth = 2.5; g.strokeRect(X(camX), gy - 9.2 * ts, VIEW_TILES * ts, 11.2 * ts);
    g.strokeStyle = C.red; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(camX + STRIP.lead), gy - 9.2 * ts); g.lineTo(X(camX + STRIP.lead), gy + 2 * ts); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.player; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(X(hx), gy - stripY(hx) * ts - 4, 6, 0, TAU); g.fill(); g.stroke();
    if (!o.hide) {
      tag(g, 'camera window', X(camX + VIEW_TILES / 2), gy - 9.2 * ts - 14, C.goldInk, 12);
      tag(g, 'push line: hero past it drags the window right', SMAP.x + SMAP.w / 2, gy + 2 * ts + 26, C.red, 12);
      tag(g, '◀ the window never scrolls back', SMAP.x + SMAP.w / 2, gy + 2 * ts + 56, C.ink, 12);
    }
    g.font = font(11, 700); g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(o.title || 'MAP: THE WHOLE LEVEL STRIP', MAP.x + 10, MAP.y + 12);
    g.font = font(13); g.fillStyle = C.ink; g.textAlign = 'left';
    if (!o.hide) wrapText(g, 'The scrolling rig swaps the grey-box level for a side-on strip in the style of Super Mario Bros. (1985). Drag along the strip to walk.', MAP.x + 14, MAP.y + 44, MAP.w - 28, 18);
    g.restore();
    g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 2; g.beginPath(); g.roundRect(MAP.x, MAP.y, MAP.w, MAP.h, 10); g.stroke();
  }

  /* ================= words on the canvas: rig card and chips ================= */
  function chips(g, label, items, x0, y0, maxW, kind, size = 13) {
    const col = kind === 'pro' ? ['#d8f0df', '#5fb47c', '#145c33'] : ['#f9d9d6', '#e07b72', '#8a1c15'];
    g.font = font(size); g.textBaseline = 'middle'; g.textAlign = 'left';
    let x = x0, y = y0; const hgt = size + 11, gap = 7;
    const one = (text, bold) => {
      g.font = font(size, bold ? 800 : 600); const w = g.measureText(text).width + 18;
      if (x + w > x0 + maxW && x > x0) { x = x0 + 62; y += hgt + 6; }
      g.fillStyle = bold ? col[1] : col[0]; g.strokeStyle = col[1]; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x, y, w, hgt, 8); g.fill(); g.stroke();
      g.fillStyle = bold ? '#fff' : col[2]; g.fillText(text, x + 9, y + hgt / 2 + 1); x += w + gap;
    };
    one(label, true); x = Math.max(x, x0 + 62); items.forEach(s => one(s));
    return y + hgt;
  }
  function rigCard(g, rig, x, y, w) {
    const R = RIGS[rig];
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = disp(17); g.fillStyle = C.ink; g.fillText(`${R.n} · ${R.name} camera`, x, y + 16);
    const tw = g.measureText(`${R.n} · ${R.name} camera`).width;
    g.font = font(12); g.fillStyle = C.muted; g.fillText(`seen in ${R.seen}`, x + tw + 12, y + 15);
    g.font = font(13, 500); g.fillStyle = C.ink; wrapText(g, R.def, x, y + 36, w, 17, 2);
  }
  function viewBadge(g, lines, V = VIEW) {
    g.font = font(12); const w = Math.max(...lines.map(l => g.measureText(l[0]).width)) + 18, h = lines.length * 17 + 8;
    g.fillStyle = 'rgba(255,252,244,.88)'; g.beginPath(); g.roundRect(V.x + 8, V.y + 8, w, h, 8); g.fill();
    g.textAlign = 'left'; g.textBaseline = 'middle'; lines.forEach(([s, c], i) => { g.fillStyle = c || C.ink; g.fillText(s, V.x + 17, V.y + 8 + 12 + i * 17); });
  }
  function caption(g, text, V = VIEW) {
    g.font = font(14); const lines = []; let line = '';
    text.split(' ').forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > V.w - 40 && line) { lines.push(line); line = wd; } else line = t; }); lines.push(line);
    const h = lines.length * 19 + 10, y = V.y + V.h - h - 8;
    g.fillStyle = 'rgba(21,32,68,.86)'; g.beginPath(); g.roundRect(V.x + 10, y, V.w - 20, h, 9); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, V.x + V.w / 2, y + 15 + i * 19));
  }
  const card = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = CARD; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };

  /* ================= one frame of a rig: map, view, readouts ================= */
  // F: { rig, R (or strip: { x, camX }), hide, title }; returns the readouts
  function drawRig(g, F) {
    const rig = F.rig;
    if (RIGS[rig].strip) {
      drawStripMap(g, F.strip.x, F.strip.camX, { hide: F.hide, title: F.title });
      const px = drawStripView(g, VIEW, F.strip.x, F.strip.camX, F.t);
      if (!F.noBadge) viewBadge(g, [[`hero on screen: ${Math.round(px)} px, always`], [`camera x: ${F.strip.camX.toFixed(1)} tiles (only grows)`]]);
      return { px, dist: 0 };
    }
    const cam = CAM[rig](F.R);
    drawMap(g, rig, F.R, cam, { hide: F.hide, title: F.title });
    const flash = rig === 'fixed' && cam.since < .3 ? .75 * (1 - cam.since / .3) : cam.flash ? .6 : 0;
    const px = drawView(g, VIEW, cam, F.R, { flash, spline: rig === 'spline' && !F.hide });
    const dist = Math.hypot(cam.x - F.R.h.x, cam.y - F.R.h.y, cam.z - 1.2);
    if (rig === 'fixed' && cam.since < 1) T.stamp('CUT', VIEW.x + VIEW.w - 70, VIEW.y + 44, C.red, 1 - cam.since, 26);
    if (!F.noBadge) {
      const lines = [[cam.fp ? 'hero on screen: none (only the weapon)' : `hero on screen: ${Math.round(px)} px tall`], [`camera ${cam.fp ? 'at the hero’s eyes' : dist.toFixed(1) + ' m from the hero'} · FOV ${Math.round(cam.fov)}°`]];
      if (rig === 'fixed') lines.push([`live camera ${cam.active} · cuts in the last 6 s: ${cam.cuts}`, cam.cuts > 2 ? C.red : C.ink]);
      if (rig === 'spline') lines.push([`off the spline: ${cam.off.toFixed(1)} m`, cam.off > 2 ? C.red : C.ink]);
      if (rig === 'cover' && cam.w > .05) lines.push([`cover blend ${Math.round(cam.w * 100)}%`, C.blue]);
      viewBadge(g, lines);
    }
    return { px, dist, cam };
  }

  /* ================= slide 1: the switcher ================= */
  const DEMO_TR = Object.fromEntries(ORDER.filter(k => !RIGS[k].strip).map(k => [k, pathTrack(DEMO[k], SPEED)]));
  DEMO_TR.floating = (() => { const tr = pathTrack(DEMO.floating, 1); const k = tr.dur / FLOAT.loop; return { dur: FLOAT.loop, path: { at: t => tr.path.at(t * k) } }; })();
  const STRIP_DEMO = stripTrack(2.5, STRIP.speed);
  const TOUR_TR = TOUR.map(s => s.strip ? stripTrack(s.strip[0], s.strip[1], 0) : pathTrack(s.path, SPEED, s.len));
  const TOUR_DUR = TOUR.reduce((a, s) => a + s.len, 0);
  const stripMax = (tr, t) => { let m = tr.at(0).x; for (let s = 0; s <= t; s += .05) m = Math.max(m, tr.at(s).x); return Math.max(m, tr.at(t).x); };
  function tourFrame(t) {
    let t0 = 0, i = 0; while (i < TOUR.length - 1 && t >= t0 + TOUR[i].len) { t0 += TOUR[i].len; i++; }
    const seg = TOUR[i], tl = t - t0, tr = TOUR_TR[i];
    if (seg.strip) { const x = tr.at(tl).x; return { i, seg, rig: seg.rig, t: tl, strip: { x, camX: stripCam(stripMax(tr, tl)) } }; }
    return { i, seg, rig: seg.rig, t: tl, R: makeR(tt => clampAt(tr, tt), tl, seg.opt || {}) };
  }
  function drawSwitch(g, F) {
    card(g);
    const out = drawRig(g, F);
    rigCard(g, F.rig, VIEW.x + 4, VIEW.y + VIEW.h + 8, VIEW.w - 8);
    const R = RIGS[F.rig];
    const y = chips(g, 'Pros', R.pros, 12, 390, 1016, 'pro', 15);
    chips(g, 'Cons', R.cons, 12, Math.max(y + 14, 462), 1016, 'con', 15);
    if (F.cap) { caption(g, F.cap); pill(g, `walk-through ${F.step} / ${TOUR.length}`, VIEW.x + VIEW.w - 8, VIEW.y + 20, 12, '#fff', 'rgba(21,32,68,.8)', 'right'); }
    g.font = font(12, 500); g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText('Pros and cons from the deck’s lists. Grey-box scenes stand in for the games named.', 12, H - 14);
    return out;
  }

  const scenes = {};
  canvasDemo('switch', (s, cv, g) => {
    const st = { rig: 'follow', vol: 'split', tour: true, mode: 'demo', t: 0, clock: 0, held: false, drag: null, target: null, key: '',
      track: dragTrack(8, 15, 0), float: { x: 23, y: 31, z: 17 }, strip: { x: 3, max: 3 } };
    const rigBtns = $$(s, '.rs-rig .btn'), tourBtn = $(s, '.rs-tour'), demoBtn = $(s, '.rs-demo'), volBtns = $$(s, '.rs-vol .btn'), jumpBtns = $$(s, '.rs-jump .btn'), hIn = $(s, '.rs-h');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; } };
    const showRig = k => { rigBtns.forEach(b => b.classList.toggle('on', b.dataset.r === k)); $$(s, '.rs-opt').forEach(o => o.classList.toggle('on', o.dataset.for === k)); };
    const cur = () => {   // the frame the switcher should draw now, whatever mode it is in
      if (st.tour) { const T0 = st.t % TOUR_DUR, f = tourFrame(T0); return { rig: f.rig, R: f.R, strip: f.strip, t: f.t, cap: f.seg.cap, step: f.i + 1, vol: f.seg.opt?.vol }; }
      const rig = st.rig;
      if (RIGS[rig].strip) {
        if (st.mode === 'demo') { const tt = st.t % STRIP_DEMO.dur; return { rig, t: st.t, strip: { x: STRIP_DEMO.at(tt).x, camX: stripCam(stripMax(STRIP_DEMO, tt)) } }; }
        return { rig, t: st.clock, strip: { x: st.strip.x, camX: stripCam(st.strip.max) } };
      }
      const opt = { vol: st.vol };
      if (st.mode === 'demo') { const tr = DEMO_TR[rig]; return { rig, R: makeR(tt => loopAt(tr, tt), st.t, opt) }; }
      if (rig === 'floating') opt.float = st.float;
      return { rig, R: makeR(tt => st.track.at(tt), st.clock, opt) };
    };
    const takeOver = () => {   // leave the demo walk where it is and hand the hero to the learner
      if (st.mode === 'drag') return;
      const F = cur();
      if (F.strip) { st.strip.x = F.strip.x; st.strip.max = F.strip.camX + STRIP.lead; }
      else { const h = F.R.h; st.track.reset(h.x, h.y, h.face); if (F.rig === 'floating') { const c = CAM.floating(F.R); st.float = { x: c.x, y: c.y, z: c.z }; hIn.value = c.z; } }
      st.mode = 'drag';
    };
    rigBtns.forEach(b => b.onclick = () => { manual(); st.rig = b.dataset.r; st.mode = 'demo'; st.t = 0; showRig(st.rig); });
    volBtns.forEach(b => b.onclick = () => { manual(); st.rig = 'fixed'; st.vol = b.dataset.v; volBtns.forEach(x => x.classList.toggle('on', x === b)); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    demoBtn.onclick = () => { manual(); st.mode = 'demo'; st.t = 0; };
    const setFloat = (x, y, z) => { manual(); st.rig = 'floating'; showRig('floating'); takeOver(); Object.assign(st.float, { x, y, z }); };
    jumpBtns.forEach(b => b.onclick = () => { const [tx, ty] = FLOAT.jumps[b.dataset.j], z = st.float.z, pitch = lerp(16, 62, clamp((z - 3) / 23)) * D2R; setFloat(tx, ty + (z - 1) / Math.tan(pitch), z); });
    hIn.oninput = () => { setFloat(st.float.x, st.float.y, +hIn.value); };
    const toWorld = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; return { px: x, py: y, x: (x - MAP.x) / MAP.s + MAP.wx, y: (y - MAP.y) / MAP.s + MAP.wy, inMap: x >= MAP.x && x <= MAP.x + MAP.w && y >= MAP.y && y <= MAP.y + MAP.h }; };
    cv.addEventListener('pointerdown', e => {
      const p = toWorld(e); if (!p.inMap) return;
      manual(); const F = cur(); takeOver();
      if (RIGS[st.rig].strip) { st.drag = 'strip'; }
      else if (st.rig === 'floating' && Math.hypot(p.x - st.float.x, p.y - st.float.y) < 2.2) st.drag = 'cam';
      else st.drag = 'hero';
      st.target = p; cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => { const p = toWorld(e); if (st.drag) st.target = p; cv.style.cursor = p.inMap ? 'grab' : ''; });
    const up = () => { st.drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    function stepDrag(dt) {
      if (st.mode !== 'drag') return;
      st.clock += dt;
      if (RIGS[st.rig].strip) {
        if (st.drag && st.target) { const want = (st.target.px - SMAP.x) / SMAP.s, lo = stripCam(st.strip.max) + .5; st.strip.x = clamp(lerp(st.strip.x, want, clamp(dt * 10)), lo, STRIP.len - 1); }
        st.strip.max = Math.max(st.strip.max, st.strip.x);
        return;
      }
      const L = st.track.last; let { x, y, face } = L;
      if (st.drag === 'cam' && st.target) { st.float.x = clamp(st.target.x, -3, 43); st.float.y = clamp(st.target.y, -2, 32); }
      if (st.drag === 'hero' && st.target) {
        const dx = st.target.x - x, dy = st.target.y - y, d = Math.hypot(dx, dy), step = Math.min(d, 9 * dt);
        if (d > .05) {
          const nx = x + dx / d * step, ny = y + dy / d * step;
          if (walkable(nx, ny)) { x = nx; y = ny; } else if (walkable(nx, y)) x = nx; else if (walkable(x, ny)) y = ny;
          if (Math.hypot(x - L.x, y - L.y) > .01) face = Math.atan2(y - L.y, x - L.x);
        }
      }
      st.track.push(st.clock, x, y, face);
    }
    function info(F, out) {
      const rig = F.rig, R = RIGS[rig], key = [rig, st.tour, st.mode, Math.round(out.px / 4), Math.round((out.dist || 0) * 2), out.cam?.cuts ?? ''].join();
      if (key === st.key) return; st.key = key; showRig(rig);
      if (rig === 'fixed') volBtns.forEach(b => b.classList.toggle('on', b.dataset.v === (F.vol || st.vol)));
      const rows = [`<div><b>${out.cam?.fp ? '–' : Math.round(out.px)}</b><span>px: the hero’s height on screen</span></div>`];
      if (rig === 'fixed') rows.push(`<div class="${out.cam.cuts > 2 ? 'r' : 'g'}"><b>${out.cam.cuts}</b><span>cuts in the last 6 s</span></div>`);
      else if (!R.strip && !out.cam?.fp) rows.push(`<div class="y"><b>${out.dist.toFixed(1)}</b><span>m from camera to hero</span></div>`);
      say($(s, '.rs-stats'), rows.join(''));
      say($(s, '.rs-out'), `<b>${R.name}.</b> ${R.def}${st.mode === 'drag' || st.tour ? '' : ' <i>Demo walk: drag the hero to take over.</i>'}`);
    }
    scenes.switch = { seek(t) { st.held = true; const f = tourFrame(t % TOUR_DUR); const F = { rig: f.rig, R: f.R, strip: f.strip, t: f.t, cap: f.seg.cap, step: f.i + 1, vol: f.seg.opt?.vol }; info(F, drawSwitch(g, F)); }, dur: () => TOUR_DUR };
    showRig(st.rig);
    return dt => {
      if (st.held) return;
      dt = Math.max(0, Math.min(dt, .1)); st.t += dt; stepDrag(dt);
      const F = cur(); info(F, drawSwitch(g, F));
    };
  });

  /* ================= slide 2: off the spline (slide 66) ================= */
  const OFF_PATH = [[3, 15], [15, 15], [24, 15.7], .6, [24, 3.4], 1.6, [24, 15.7], .8];
  const OFF_TR = pathTrack(OFF_PATH, 3);
  const PIP = { x: VIEW.x + VIEW.w - 214, y: VIEW.y + VIEW.h - 126, w: 204, h: 115 };
  const OFF_CURVE = (() => {   // on-screen height against distance off the spline, for the spline camera and a follow camera
    const pts = [];
    for (let d = 0; d <= 12.01; d += .25) {
      const h = { x: 24, y: 15.7 - d, face: -Math.PI / 2 }, R = { t: 0, h, past: () => h, opt: {} };
      pts.push({ d, spline: heroPx(CAM.spline(R), VIEW, h), follow: heroPx(CAM.follow(R), VIEW, h) });
    }
    return pts;
  })();
  function drawOff(g, R, pip, t) {
    card(g);
    const cam = CAM.spline(R);
    drawMap(g, 'spline', R, cam);
    const px = drawView(g, VIEW, cam, R, { spline: true });
    const onPx = OFF_CURVE[0].spline;
    viewBadge(g, [[`hero on screen: ${Math.round(px)} px tall`], [`off the spline: ${cam.off.toFixed(1)} m`, cam.off > 2 ? C.red : C.ink], [`${Math.round(px / onPx * 100)}% of the size on the spline`, px / onPx < .6 ? C.red : C.ink]]);
    if (pip) {
      const fc = CAM.follow(R), fpx = drawView(g, PIP, fc, R);
      g.font = font(11, 700); const lab = `follow camera: ${Math.round(fpx * VIEW.w / PIP.w)} px`;
      pill(g, lab, PIP.x + 6, PIP.y + 13, 11, '#fff', 'rgba(21,32,68,.8)');
    }
    // under the view
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = disp(17); g.fillStyle = C.ink; g.fillText('A spline camera in a wide courtyard', VIEW.x + 4, VIEW.y + VIEW.h + 24);
    g.font = font(13, 500); g.fillStyle = C.ink;
    wrapText(g, 'The camera only follows the hero’s closest point on the rail. Walk sideways off it and the rail holds the camera back.', VIEW.x + 4, VIEW.y + VIEW.h + 44, VIEW.w - 8, 17, 2);
    // the graph
    const G = { x: 62, y: 406, w: 560, h: 124 }, maxPx = Math.max(...OFF_CURVE.map(p => Math.max(p.spline, p.follow))) * 1.1;
    const gx = d => G.x + d / 12 * G.w, gy = v => G.y + G.h - v / maxPx * G.h;
    panel(g, { x: 12, y: 382, w: 650, h: 176 });
    g.strokeStyle = C.floorLn; g.lineWidth = 1; g.beginPath();
    for (let d = 0; d <= 12; d += 2) { g.moveTo(gx(d), G.y); g.lineTo(gx(d), G.y + G.h); }
    for (let v = 0; v <= maxPx; v += 25) { g.moveTo(G.x, gy(v)); g.lineTo(G.x + G.w, gy(v)); }
    g.stroke();
    g.strokeStyle = C.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(G.x, G.y); g.lineTo(G.x, G.y + G.h); g.lineTo(G.x + G.w, G.y + G.h); g.stroke();
    g.font = font(11, 500); g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'top';
    for (let d = 0; d <= 12; d += 2) g.fillText(d + ' m', gx(d), G.y + G.h + 4);
    g.textAlign = 'right'; g.textBaseline = 'middle'; for (let v = 0; v <= maxPx; v += 50) g.fillText(v, G.x - 6, gy(v));
    g.font = font(12); g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText('hero height on screen (px) against distance off the spline', G.x, G.y - 8);
    const curve = (k, col) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); OFF_CURVE.forEach((p, i) => i ? g.lineTo(gx(p.d), gy(p[k])) : g.moveTo(gx(p.d), gy(p[k]))); g.stroke(); };
    curve('follow', C.blue); curve('spline', '#d08a12');
    const last = OFF_CURVE.at(-1);
    T.label('follow camera', gx(10.6), gy(last.follow) - 14, 'center', C.blue, 11);
    T.label('spline camera', gx(10.6), gy(last.spline) - 16, 'center', C.goldInk, 11);
    const d = clamp(cam.off, 0, 12);
    g.fillStyle = C.red; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(gx(d), gy(px), 6, 0, TAU); g.fill(); g.stroke();
    // the deck's words
    panel(g, { x: 674, y: 382, w: 354, h: 176 });
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = disp(14); g.fillStyle = C.ink; g.fillText('Not for wide rooms', 690, 410);
    g.font = font(13, 500); g.fillStyle = C.ink;
    const n = wrapText(g, 'Spline cameras are best for “tight limited spaces (doorways or hallways)”. In a wide room, walking off the spline “creates a detachment between the camera and the character/hero.”', 690, 432, 322, 18, 6);
    g.font = font(12, 500); g.fillStyle = C.muted;
    wrapText(g, 'The follow camera inset keeps the hero the same size; the spline camera lets them shrink into the scenery.', 690, 432 + n * 18 + 10, 322, 16, 3);
    g.font = font(12, 500); g.fillStyle = C.muted; g.fillText('Grey-box courtyard; the deck’s example is God of War.', 14, H - 10);
    return { px, off: cam.off };
  }
  canvasDemo('offspline', (s, cv, g) => {
    const st = { tour: true, pip: false, t: 0, clock: 0, held: false, mode: 'tour', drag: false, target: null, track: dragTrack(24, 15.7, -Math.PI / 2), key: '' };
    const tourBtn = $(s, '.os-tour'), pipIn = $(s, '.os-pip');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.mode = 'tour'; tourBtn.classList.add('on'); };
    pipIn.onchange = () => { manual(); if (st.mode === 'tour') { const h = loopAt(OFF_TR, st.t); st.track.reset(h.x, h.y, h.face); st.mode = 'drag'; } st.pip = pipIn.checked; };
    $$(s, '.os-jump').forEach(b => b.onclick = () => { manual(); st.mode = 'drag'; const [x, y] = b.dataset.p.split(',').map(Number); st.track.reset(x, y, -Math.PI / 2); st.target = null; });
    const toWorld = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; return { x: (x - MAP.x) / MAP.s + MAP.wx, y: (y - MAP.y) / MAP.s + MAP.wy, inMap: x >= MAP.x && x <= MAP.x + MAP.w && y >= MAP.y && y <= MAP.y + MAP.h }; };
    cv.addEventListener('pointerdown', e => { const p = toWorld(e); if (!p.inMap) return; manual(); if (st.mode === 'tour') { const h = loopAt(OFF_TR, st.t); st.track.reset(h.x, h.y, h.face); st.mode = 'drag'; } st.drag = true; st.target = p; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { const p = toWorld(e); if (st.drag) st.target = p; cv.style.cursor = p.inMap ? 'grab' : ''; });
    cv.addEventListener('pointerup', () => { st.drag = false; });
    const pipAt = t => t > 7.4;
    function info(out) {
      const key = [Math.round(out.px / 3), Math.round(out.off * 2)].join(); if (key === st.key) return; st.key = key;
      say($(s, '.os-stats'), `<div class="${out.off > 2 ? 'r' : 'g'}"><b>${out.off.toFixed(1)}</b><span>m off the spline</span></div><div><b>${Math.round(out.px)}</b><span>px: the hero on screen (${Math.round(OFF_CURVE[0].spline)} px on the rail)</span></div>`);
    }
    scenes.offspline = { seek(t) { st.held = true; info(drawOff(g, makeR(tt => loopAt(OFF_TR, tt), t), pipAt(t % OFF_TR.dur), t)); }, dur: () => OFF_TR.dur };
    return dt => {
      if (st.held) return;
      dt = Math.max(0, Math.min(dt, .1)); st.t += dt;
      let R, pip;
      if (st.mode === 'tour') { R = makeR(tt => loopAt(OFF_TR, tt), st.t); pip = st.tour ? pipAt(st.t % OFF_TR.dur) : st.pip; if (st.tour) pipIn.checked = pip; }
      else {
        st.clock += dt; const L = st.track.last; let { x, y, face } = L;
        if (st.drag && st.target) { const dx = st.target.x - x, dy = st.target.y - y, d = Math.hypot(dx, dy), stp = Math.min(d, 9 * dt); if (d > .05) { const nx = x + dx / d * stp, ny = y + dy / d * stp; if (walkable(nx, ny)) { x = nx; y = ny; } else if (walkable(nx, y)) x = nx; else if (walkable(x, ny)) y = ny; if (Math.hypot(x - L.x, y - L.y) > .01) face = Math.atan2(y - L.y, x - L.x); } }
        st.track.push(st.clock, x, y, face); R = makeR(tt => st.track.at(tt), st.clock); pip = st.pip;
      }
      info(drawOff(g, R, pip, st.t));
    };
  });

  /* ================= slide 3: classify the camera (slides 105-107) ================= */
  const TILE = { x: 12, y: 388, w: (1016 - 5 * 8) / 6, h: 30, gap: 8 };
  const tileRect = i => { const row = i < 6 ? 0 : 1, col = row ? i - 6 : i; return { x: TILE.x + col * (TILE.w + TILE.gap) + (row ? (TILE.w + TILE.gap) / 2 : 0), y: TILE.y + row * (TILE.h + 8), w: TILE.w, h: TILE.h }; };
  const DRILL_TOUR = [{ rig: 'spline', pick: 'animated', off: 2.5 }, { rig: 'fixed', pick: 'fixed', off: 7 }, { rig: 'vector', pick: 'vector', off: 0 }, { rig: 'cover', pick: 'cover', off: 1.5 }];
  const ROUND = 5.5, PICK_AT = 3.4;
  function drillFrame(rig, t, vol = 'split') {   // the rig's own demo walk, unnamed
    if (RIGS[rig].strip) { const tt = t % STRIP_DEMO.dur; return { rig, t, strip: { x: STRIP_DEMO.at(tt).x, camX: stripCam(stripMax(STRIP_DEMO, tt)) } }; }
    const tr = DEMO_TR[rig]; return { rig, t, R: makeR(tt => loopAt(tr, tt), t, { vol }) };
  }
  function drawDrill(g, D) {
    card(g);
    const F = { ...drillFrame(D.rig, D.t), hide: !D.pick, title: D.pick ? 'MAP: RIG OVERLAYS REVEALED' : 'MAP: RIG OVERLAYS HIDDEN', noBadge: true };
    drawRig(g, F);
    if (!D.pick) pill(g, 'Which rig is this?', VIEW.x + 10, VIEW.y + 20, 14, '#fff', 'rgba(21,32,68,.85)');
    // under the view: round and score
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = disp(17); g.fillStyle = C.ink; g.fillText(`Round ${D.round}`, VIEW.x + 4, VIEW.y + VIEW.h + 24);
    g.font = font(13, 500); g.fillStyle = C.muted; g.fillText(`Score ${D.score} of ${D.answered}`, VIEW.x + 92, VIEW.y + VIEW.h + 23);
    g.fillStyle = C.ink;
    wrapText(g, D.pick ? 'Click “Next rig” for another round.' : 'Watch where the camera goes when the hero moves, then pick its type below.', VIEW.x + 4, VIEW.y + VIEW.h + 46, VIEW.w - 8, 17, 2);
    ORDER.forEach((k, i) => {
      const r = tileRect(i), isAns = D.pick && k === D.rig, isPick = D.pick === k, hov = D.hover === k && !D.pick;
      g.fillStyle = isAns ? '#d8f0df' : isPick ? '#f9d9d6' : hov ? '#fde9b8' : '#fffaf0';
      g.strokeStyle = isAns ? '#2f9a5c' : isPick ? '#e07b72' : hov ? '#e0a92d' : '#cdbf9f'; g.lineWidth = isAns || isPick ? 3 : 2;
      g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 8); g.fill(); g.stroke();
      g.font = font(13, 700); g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`${RIGS[k].n}. ${RIGS[k].name}${isAns ? ' ✓' : isPick ? ' ✗' : ''}`, r.x + r.w / 2, r.y + r.h / 2 + 1);
    });
    if (D.pick) {
      const R = RIGS[D.rig], right = D.pick === D.rig;
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = font(14, 700); g.fillStyle = right ? '#1a8a4c' : C.redDk;
      const head = right ? `Yes: ${R.name} camera.` : `Not ${RIGS[D.pick].name}: this was the ${R.name} camera.`;
      g.fillText(head, 12, 490); const hw = g.measureText(head).width;
      g.font = font(13, 500); g.fillStyle = C.ink; wrapText(g, R.clue, 12 + hw + 10, 490, 1016 - hw - 10, 17, 1);
      const y = chips(g, 'Pros', R.pros.slice(0, 3), 12, 502, 1016, 'pro', 12);
      chips(g, 'Cons', R.cons.slice(0, 3), 12, y + 6, 1016, 'con', 12);
    } else {
      g.font = font(13, 500); g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('The goal: “Develop the skill to identify and classify the type of cameras that exist in video games.”', 12, 498);
    }
    if (D.cursor) {   // the walk-through's pointer
      const [x, y] = D.cursor; g.save(); g.translate(x, y); g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.lineTo(6, 16); g.lineTo(11, 26); g.lineTo(15, 24); g.lineTo(10, 14); g.lineTo(18, 14); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
  }
  function drillTourState(t) {
    const k = Math.floor(t / ROUND) % DRILL_TOUR.length, f = t - k * ROUND, R = DRILL_TOUR[k];
    const before = DRILL_TOUR.slice(0, k), score = before.filter(r => r.pick === r.rig).length + (f >= PICK_AT && R.pick === R.rig ? 1 : 0);
    const tile = tileRect(ORDER.indexOf(R.pick)), home = [VIEW.x + VIEW.w / 2, VIEW.y + VIEW.h + 40], to = [tile.x + tile.w / 2, tile.y + tile.h / 2];
    const m = smooth(clamp((f - (PICK_AT - .8)) / .7));
    const cursor = f > PICK_AT - 1 ? [lerp(home[0], to[0], m), lerp(home[1], to[1], m)] : null;
    return { rig: R.rig, t: R.off + f, pick: f >= PICK_AT ? R.pick : null, round: k + 1, score, answered: k + (f >= PICK_AT ? 1 : 0), cursor };
  }
  canvasDemo('drill', (s, cv, g) => {
    const shuffle = () => { const a = ORDER.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const st = { tour: true, t: 0, held: false, seq: shuffle(), i: 0, pick: null, score: 0, answered: 0, hover: null, rt: 0, key: '' };
    const tourBtn = $(s, '.dr-tour'), nextBtn = $(s, '.dr-next');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.rt = 0; st.pick = null; st.score = 0; st.answered = 0; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    nextBtn.onclick = () => { manual(); st.i++; if (st.i >= st.seq.length) { st.seq = shuffle(); st.i = 0; } st.pick = null; st.rt = 0; };
    const at = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; return ORDER.findIndex((k, i) => { const t = tileRect(i); return x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h; }); };
    cv.addEventListener('mousemove', e => { const i = at(e); st.hover = i >= 0 ? ORDER[i] : null; cv.style.cursor = i >= 0 ? 'pointer' : ''; });
    cv.addEventListener('mouseleave', () => { st.hover = null; });
    cv.addEventListener('click', e => {
      const i = at(e); if (i < 0) return;
      if (st.tour) { manual(); }
      if (st.pick) return;
      st.pick = ORDER[i]; st.answered++; if (st.pick === st.seq[st.i]) st.score++;
    });
    function info(D) {
      const key = [D.pick, D.score, D.answered, D.round].join(); if (key === st.key) return; st.key = key;
      say($(s, '.dr-stats'), `<div class="g"><b>${D.score}/${D.answered}</b><span>classified correctly</span></div>`);
      say($(s, '.dr-out'), D.pick ? `<b>${RIGS[D.rig].name}.</b> ${RIGS[D.rig].clue}` : 'Watch the map and the view: does the camera move? Does it keep the hero the same size? Does it cut?');
    }
    scenes.drill = { seek(t) { st.held = true; const D = drillTourState(t); drawDrill(g, D); info(D); }, dur: () => ROUND * DRILL_TOUR.length };
    return dt => {
      if (st.held) return;
      dt = Math.max(0, Math.min(dt, .1)); st.t += dt; st.rt += dt;
      const D = st.tour ? drillTourState(st.t % (ROUND * DRILL_TOUR.length))
        : { rig: st.seq[st.i], t: st.rt, pick: st.pick, round: st.answered + (st.pick ? 0 : 1), score: st.score, answered: st.answered, hover: st.hover };
      drawDrill(g, D); info(D);
    };
  });

  window.__seek = (t, which = 'switch') => scenes[which].seek(t);
  window.__dur = (which = 'switch') => scenes[which].dur();
})();
