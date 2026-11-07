/* Counter cycles: what a rush, a turtle and an expand look like in a StarCraft-style RTS, for students who never played one.
   ro-solo:  the three openings side by side on one game clock, each on its own half of a map.
   ro-match: each arrow of the wheel played out on one map (Turtle vs Rush, Expand vs Turtle, Rush vs Expand).
   Everything is a pure function of game time in seconds, so window.__seek(t, which) / __dur(which) replay any moment
   for the GIFs (which = 'solo' | 'turtle-rush' | 'expand-turtle' | 'rush-expand'; t is real seconds).
   Timings, costs and fights are illustrative and loosely Protoss-flavoured (Nexus, Gateway, Zealot, Photon Cannon),
   not the game's numbers. All positions are in one player's own frame (their base on the left of a 1600 x 480 map);
   the right-hand player is drawn mirrored. */
(function () {
  const { $, $$, canvasDemo } = FPF.kit;
  const SPEED = 15;                  // game seconds per real second
  const MW = 1600, MH = 480;         // map size in local units
  const WALK = 45;                   // soldier speed, units per game second
  const COL = { rush: '#ff7a2a', turtle: '#36c9c6', expand: '#ffb547' };
  const NAME = { rush: 'Rush', turtle: 'Turtle', expand: 'Expand' };
  const PLAN = {
    rush: 'Few workers, two Gateways, attack early',
    turtle: 'Wall the ramp, cannons, stay home',
    expand: 'Second base first, army later',
  };
  const PIC = {};
  for (const k of ['rush', 'turtle', 'expand']) { const im = new Image(); im.src = `img/rts-${k}.jpg`; PIC[k] = im; }
  // where the money goes
  const CAT = {
    workers: { label: 'workers', col: '#8fd3ff' },
    bases: { label: 'bases', col: '#b896ff' },
    army: { label: 'soldiers + Gateways', col: '#ff8f6b' },
    defence: { label: 'wall + cannons', col: '#7be0a8' },
  };
  const COST = { worker: 50, nexus: 400, gateway: 150, forge: 150, pylon: 100, cannon: 150, unit: 100 };

  /* ---------- the map, in a player's own frame ---------- */
  const SITE = {
    main: { x: 150, y: 240, ang: [135, 225] },   // mineral arc angles, degrees
    nat: { x: 520, y: 118, ang: [205, 335] },
    third: { x: 520, y: 362, ang: [25, 155] },
  };
  const patches = s => Array.from({ length: 8 }, (_, i) => {
    const a = (s.ang[0] + (s.ang[1] - s.ang[0]) * i / 7) * Math.PI / 180;
    return { x: s.x + 96 * Math.cos(a), y: s.y + 96 * Math.sin(a) };
  });
  const PATCH = { main: patches(SITE.main), nat: patches(SITE.nat), third: patches(SITE.third) };
  const RALLY = { rush: { x: 392, y: 240 }, turtle: { x: 262, y: 240 }, expand: { x: 610, y: 210 } };
  const mir = p => ({ x: MW - p.x, y: p.y });
  const ENEMY_WALL = { x: MW - 400, y: 240 };    // just outside the other player's ramp
  const ENEMY_NAT = mir(SITE.nat);
  const ENEMY_MAIN = mir(SITE.main);

  /* ---------- small helpers ---------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const seg = (g, a, b) => clamp((g - a) / (b - a));
  const mmss = g => `${Math.floor(g / 60)}:${String(Math.floor(g % 60)).padStart(2, '0')}`;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // a soldier's slot in a loose blob
  const spread = (i, r = 15) => { const a = i * 2.4, d = r * Math.sqrt(i + .5); return { x: Math.cos(a) * d, y: Math.sin(a) * d }; };

  // a route of keyframes { g, x, y, atk } walked at WALK speed. Returns the builder so calls chain.
  function route(g, p) {
    const kf = [{ g, x: p.x, y: p.y }];
    const R = {
      kf,
      get end() { return kf[kf.length - 1].g; },
      to(q, speed = WALK) { const L = kf[kf.length - 1], d = Math.hypot(q.x - L.x, q.y - L.y); kf.push({ g: L.g + d / speed, x: q.x, y: q.y }); return R; },
      wait(until, atk) { const L = kf[kf.length - 1]; if (atk) L.atk = atk; if (until > L.g) kf.push({ g: until, x: L.x, y: L.y, atk }); return R; },
    };
    return R;
  }
  function posAt(kf, g) {
    if (g <= kf[0].g) return { x: kf[0].x, y: kf[0].y, atk: null, dx: 1, dy: 0 };
    for (let i = 0; i < kf.length - 1; i++) {
      const A = kf[i], B = kf[i + 1];
      if (g <= B.g) {
        const k = (g - A.g) / ((B.g - A.g) || 1);
        return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), atk: A.atk || null, dx: B.x - A.x, dy: B.y - A.y };
      }
    }
    const L = kf[kf.length - 1];
    return { x: L.x, y: L.y, atk: L.atk || null, dx: 0, dy: 0 };
  }
  const piece = (x, y) => ({ x, y });

  /* ---------- one player's opening: workers, buildings, soldiers, captions ----------
     o.fate(unit, i) can rewrite a soldier's route and death for a matchup. */
  function player(op, o = {}) {
    const P = { op, workers: [], builds: [], units: [], notes: [] };
    const B = (kind, x, y, start, dur, cat, extra = {}) => { const b = { kind, x, y, start, done: start + dur, cat, ...extra }; P.builds.push(b); return b; };
    P.main = B('nexus', SITE.main.x, SITE.main.y, -1, 1, 'bases', { free: true });
    const wBirths = [];
    for (let i = 0; i < 12; i++) wBirths.push(0);
    if (op === 'rush') {
      wBirths.push(12, 24);
      B('pylon', 210, 100, 18, 18, 'army');
      P.gates = [B('gateway', 222, 150, 40, 46, 'army'), B('gateway', 222, 330, 52, 46, 'army')];
      P.births = [100, 110, 128, 138, 156, 166, 184, 194];
      P.notes = [[0, 'Starts with 12 workers mining crystals: the money.'], [24, 'Stops making workers at 14.'],
        [40, 'Spends on two Gateways: soldier factories.'], [100, 'Zealots come out early, two at a time.'],
        [145, 'Four zealots walk to the enemy base, timed to arrive early.'], [160, 'Every new zealot follows straight away.'],
        [200, 'All-in: almost nothing was spent on the economy.']];
    } else if (op === 'turtle') {
      for (let g = 12; g <= 120; g += 12) wBirths.push(g);
      B('pylon', 300, 170, 20, 18, 'defence');
      P.wall = [B('forge', 354, 262, 48, 32, 'defence'), B('gateway', 352, 222, 70, 46, 'defence')];
      P.cannons = [B('cannon', 296, 312, 90, 40, 'defence'), B('cannon', 292, 240, 110, 40, 'defence'),
        B('cannon', 250, 300, 140, 40, 'defence'), B('cannon', 250, 180, 180, 40, 'defence')];
      P.gates = [P.wall[1]];
      P.births = [165, 195, 225, 255, 285, 315, 345];
      P.notes = [[0, 'Starts with 12 workers mining crystals: the money.'], [20, 'A Pylon and a Forge go up at the ramp.'],
        [70, 'A Gateway closes the ramp: a wall.'], [92, 'Photon Cannons go up behind the wall.'],
        [165, 'A few soldiers wait at home, behind the wall.'], [230, 'Safe, but stuck on one base: about 22 workers is the cap.']];
    } else {
      for (let g = 12; g <= 120; g += 12) wBirths.push(g);
      for (let g = 132; wBirths.length < 44; g += 6) wBirths.push(g);
      B('pylon', 200, 100, 18, 18, 'army');
      P.nat = B('nexus', SITE.nat.x, SITE.nat.y, 55, 71, 'bases');
      P.third = B('nexus', SITE.third.x, SITE.third.y, 210, 71, 'bases');
      P.gates = [B('gateway', 236, 150, 75, 46, 'army'), B('gateway', 236, 330, 200, 46, 'army'),
        B('gateway', 300, 108, 206, 46, 'army'), B('gateway', 300, 372, 212, 46, 'army')];
      P.births = [175, 205];
      for (let g = 250; g <= 400; g += 27) P.births.push(g, g + 6, g + 12, g + 18);
      P.notes = [[0, 'Starts with 12 workers mining crystals: the money.'], [55, 'Spends 400 on a second base, with no army yet.'],
        [126, 'The new base is done: more workers can mine.'], [175, 'Its first soldier shows up late.'],
        [210, 'A third base and more Gateways.'], [250, 'The bigger income buys soldiers four at a time.'],
        [345, 'A big army leaves home.']];
    }
    // workers: the first 16 mine at the main, the next 16 at the second base, the rest at the third
    wBirths.forEach((born, i) => {
      const want = i < 16 ? 'main' : i < 32 ? 'nat' : 'third';
      const site = want === 'third' && !P.third ? (P.nat ? 'nat' : 'main') : want === 'nat' && !P.nat ? 'main' : want;
      const w = { born, i, path: [{ g: born, base: 'main' }] };
      if (site !== 'main') {
        const b = site === 'nat' ? P.nat : P.third, from = site === 'third' && P.nat ? 'nat' : 'main';
        if (from !== 'main') w.path.push({ g: Math.max(born, P.nat.done), base: from });
        w.path.push({ g: Math.max(born, b.done), base: site });
      }
      P.workers.push(w);
    });
    // soldiers: out of a Gateway, to the rally point, then what the opening does with them
    P.units = P.births.map((born, i) => {
      const ready = P.gates.filter(b => b.done <= born), gate = ready[i % ready.length], out = { x: gate.x + 30, y: gate.y + (gate.y < 240 ? 20 : -20) };
      const home = op === 'turtle' ? { x: RALLY.turtle.x - 20 + spread(i, 12).x, y: RALLY.turtle.y + spread(i, 12).y } : null;
      const u = { born, i, dies: Infinity };
      const s = spread(i);
      if (op === 'rush') {
        const r = route(born, out).to({ x: RALLY.rush.x + s.x * .6, y: RALLY.rush.y + s.y * .6 });
        r.wait(i < 4 ? 145 : r.end).to({ x: 820 + s.x, y: 240 + s.y }).to({ x: 1300 + s.x, y: 240 + s.y });
        u.r = r;
      } else if (op === 'turtle') {
        u.r = route(born, { x: gate.x - 34, y: gate.y }).to(home);
      } else {
        const r = route(born, out).to({ x: RALLY.expand.x + s.x, y: RALLY.expand.y + s.y });
        r.wait(Math.max(r.end, 345)).to({ x: 820 + s.x, y: 240 + s.y }).to({ x: 1300 + s.x, y: 240 + s.y });
        u.r = r;
      }
      o.fate?.(u, i, { out, s, home, P });
      return u;
    });
    return P;
  }

  /* ---------- the four scenes ---------- */
  function solo() {
    return { dur: 372, rows: ['rush', 'turtle', 'expand'].map(op => player(op)) };
  }
  // a matchup: L plays on the left, R on the right; the routes below are in each player's own frame
  const at = (x, y, s, k = 1) => ({ x: x + s.x * k, y: y + s.y * k });
  function matchTurtleRush() {
    const deaths = [172, 177, 183, 189, 190, 196, 216, 223];
    const L = player('rush', {
      fate(u, i, { s, out }) {
        const r = route(u.born, out).to(at(RALLY.rush.x, RALLY.rush.y, s, .6));
        r.wait(i < 4 ? 145 : r.end).to(at(820, 240, s)).to(at(ENEMY_WALL.x, 240, s, .7));
        u.dies = Math.max(deaths[i], r.end + 5);
        r.wait(u.dies + 1, mir({ x: 352, y: 240 }));
        u.r = r;
      },
    });
    const R = player('turtle');
    R.wall[1].hp = [[170, 1], [192, .55], [214, .55], [228, .45]];
    R.wall[0].hp = [[170, 1], [192, .8]];
    return {
      dur: 270, L, R, title: ['Turtle', 'beats', 'Rush'],
      notes: [[0, 'Same map, same clock. Left: Rush. Right: Turtle.'], [30, 'Rush stops at 14 workers and builds two Gateways.'],
        [70, 'Turtle closes its ramp with buildings: a wall.'], [100, 'Turtle builds Photon Cannons behind the wall.'],
        [145, 'Four zealots leave for the enemy base.'], [166, 'They arrive at a closed wall, with cannons behind it.'],
        [185, 'Zealots can only hit the wall. Cannons hit the zealots.'], [198, 'Reinforcements arrive one pair at a time and die too.']],
      verdict: { g: 232, head: 'Turtle holds', body: 'The rush spent 800 on zealots and lost all 8. It killed nothing. Turtle mines with 22 workers; Rush has 14 and no army.' },
    };
  }
  function matchExpandTurtle() {
    const lost = { 3: 392, 7: 397, 11: 401, 13: 405, 16: 409, 18: 413 };
    const L = player('expand', {
      fate(u, i, { s, out }) {
        const r = route(u.born, out).to(at(RALLY.expand.x, RALLY.expand.y, s));
        r.wait(Math.max(r.end, 368)).to(at(820, 240, s)).to(at(ENEMY_WALL.x - 10, 240, s, .8)).wait(Math.max(r.end, 400), mir({ x: 352, y: 240 }))
          .to(at(MW - 300, 240, s, .8)).wait(440, ENEMY_MAIN);
        u.r = r; if (lost[i]) u.dies = lost[i];
      },
    });
    const R = player('turtle', {
      fate(u, i, { home }) {
        u.r = route(u.born, { x: 318, y: 206 }).to(home).wait(392 + i * 3, { x: 410, y: 240 }).wait(394 + i * 3);
        u.dies = 394 + i * 3;
      },
    });
    R.wall[1].hp = [[386, 1], [398, 0]]; R.wall[1].dies = 398;
    R.wall[0].hp = [[386, 1], [401, 0]]; R.wall[0].dies = 401;
    R.cannons.forEach((c, i) => { c.hp = [[392 + i * 4, 1], [400 + i * 4, 0]]; c.dies = 400 + i * 4; });
    R.main.hp = [[414, 1], [440, .25]];
    return {
      dur: 446, L, R, title: ['Expand', 'beats', 'Turtle'],
      notes: [[0, 'Same map, same clock. Left: Expand. Right: Turtle.'], [55, 'Expand spends 400 on a second base instead of soldiers.'],
        [90, 'Turtle spends on a wall and cannons, and never leaves home.'], [130, 'Nobody attacks the new base, so it pays: more workers, more money.'],
        [210, 'Expand starts a third base and adds Gateways.'], [255, 'Expand’s income buys soldiers four at a time. Turtle’s buys one.'],
        [368, 'Expand’s army walks across.'], [392, 'Four cannons can’t stop an army this size.']],
      verdict: { g: 418, head: 'Expand overruns the turtle', body: 'Three bases paid for 44 workers and 26 soldiers. Turtle sat on 22 workers, and nothing ever punished the greed.' },
    };
  }
  function matchRushExpand() {
    const L = player('rush', {
      fate(u, i, { s, out }) {
        const r = route(u.born, out).to(at(RALLY.rush.x, RALLY.rush.y, s, .6));
        r.wait(i < 4 ? 145 : r.end).to(at(820, 200, s)).to(at(ENEMY_NAT.x - 10, ENEMY_NAT.y - 46, s, .7)).wait(205, { x: ENEMY_NAT.x, y: ENEMY_NAT.y - 80 })
          .wait(230, ENEMY_NAT).to(at(ENEMY_WALL.x - 10, 240, s, .6)).to(at(MW - 205, 238, s, .7)).wait(320, ENEMY_MAIN);
        u.r = r; if (i === 2) u.dies = 191;
      },
    });
    const R = player('expand');
    // the second base's workers: nine die, the rest run home
    const dead = [166, 169, 172, 176, 180, 184, 188, 193, 198];
    let k = 0;
    R.workers = R.workers.filter(w => w.born < 166).map(w => {
      if (w.i < 16) return w;
      const p = [{ g: w.born, base: 'main' }, { g: Math.max(w.born, R.nat.done), base: 'nat' }];
      if (k < dead.length) return { ...w, path: p, dies: dead[k++] };
      return { ...w, path: [...p, { g: 186, base: 'main' }] };
    });
    // the zealots walk up the ramp and into the main base's workers
    R.workers.filter(w => w.i < 16).slice(0, 10).forEach((w, j) => { w.dies = 243 + j * 2.4; });
    // after the raid only the main base makes workers, one at a time, until the zealots are inside
    for (let g = 178; g <= 236; g += 12) R.workers.push({ born: g, i: R.workers.length, path: [{ g, base: 'main' }] });
    R.nat.hp = [[172, 1], [229, 0]]; R.nat.dies = 229;
    R.third.start = R.third.done = Infinity;
    R.gates.slice(1).forEach(b => { b.start = b.done = Infinity; });
    R.units = R.units.slice(0, 2);
    R.units[0].r = route(175, { x: 266, y: 170 }).to({ x: 488, y: 168 }).wait(192, { x: 540, y: 150 });
    R.units[0].dies = 192;
    R.units[1].r = route(205, { x: 266, y: 170 }).to({ x: 300, y: 240 }).wait(241, { x: 380, y: 240 });
    R.units[1].dies = 241;
    return {
      dur: 296, L, R, title: ['Rush', 'beats', 'Expand'],
      notes: [[0, 'Same map, same clock. Left: Rush. Right: Expand.'], [55, 'Expand spends 400 on a second base. It has no soldiers yet.'],
        [100, 'Rush’s first zealots walk out of the Gateways.'], [145, 'Four zealots head straight for the new base.'],
        [164, 'The new base has workers on it and nothing to protect them.'], [178, 'Workers die. Expand’s first soldier arrives alone.'],
        [205, 'The zealots turn on the base itself.'], [229, 'The second base falls before it paid for itself.'],
        [238, 'Nothing guards the ramp, so the zealots walk into the main base.']],
      verdict: { g: 266, head: 'Rush breaks the expansion', body: 'Expand lost its 400 base, both soldiers and 19 workers, for one zealot. Rush has 7 zealots against none, and the same 14 workers.' },
    };
  }
  const MATCH = { 'turtle-rush': matchTurtleRush(), 'expand-turtle': matchExpandTurtle(), 'rush-expand': matchRushExpand() };
  const SOLO = solo();

  /* ---------- state at game time g ---------- */
  const alive = (x, g) => g >= x.born && g < (x.dies ?? Infinity);
  const built = (b, g) => g >= b.done && g < (b.dies ?? Infinity);
  const hpAt = (b, g) => {
    if (!b.hp) return 1;
    if (g <= b.hp[0][0]) return b.hp[0][1];
    for (let i = 0; i < b.hp.length - 1; i++) if (g <= b.hp[i + 1][0]) return lerp(b.hp[i][1], b.hp[i + 1][1], (g - b.hp[i][0]) / (b.hp[i + 1][0] - b.hp[i][0]));
    return b.hp[b.hp.length - 1][1];
  };
  function stats(P, g) {
    const spend = { workers: 0, bases: 0, army: 0, defence: 0 };
    P.workers.forEach(w => { if (w.born > 0 && g >= w.born - 12) spend.workers += COST.worker; });
    P.builds.forEach(b => { if (!b.free && g >= b.start) spend[b.cat] += COST[b.kind]; });
    P.units.forEach(u => { if (g >= u.born - 27) spend.army += COST.unit; });
    return {
      workers: P.workers.filter(w => alive(w, g)).length,
      army: P.units.filter(u => alive(u, g)).length,
      towers: P.builds.filter(b => b.kind === 'cannon' && built(b, g)).length,
      bases: P.builds.filter(b => b.kind === 'nexus' && built(b, g)).length,
      lost: P.units.filter(u => g >= u.dies).length,
      spend,
    };
  }
  // where a worker is: walking between its base's Nexus and a crystal, or moving house
  function workerAt(w, g) {
    let cur = w.path[0], prev = null;
    for (const p of w.path) if (g >= p.g) { prev = cur; cur = p; }
    const S = SITE[cur.base], patch = PATCH[cur.base][(w.i * 3) % 8];
    if (prev && prev !== cur && g - cur.g < 7) {           // moving to a new base
      const from = SITE[prev.base], k = ease((g - cur.g) / 7);
      return { x: lerp(from.x, S.x, k), y: lerp(from.y + 20, S.y + 20, k), carry: false };
    }
    const T = 7, ph = ((g - w.born) + hash(w.i) * T) % T;
    const ax = S.x + (patch.x - S.x) * .3, ay = S.y + (patch.y - S.y) * .3, bx = patch.x + (S.x - patch.x) * .12, by = patch.y + (S.y - patch.y) * .12;
    const jit = (hash(w.i + 7) - .5) * 10;
    if (ph < 2.6) { const k = ph / 2.6; return { x: lerp(ax, bx, k) + jit * .3, y: lerp(ay, by, k) + jit * .3, carry: false }; }
    if (ph < 4) return { x: bx + Math.sin(ph * 9) * 1.2, y: by, carry: false };
    const k = (ph - 4) / 3;
    return { x: lerp(bx, ax, k) + jit * .3, y: lerp(by, ay, k) + jit * .3, carry: true };
  }

  /* ---------- drawing ---------- */
  let g2;   // the current 2D context
  function txt(s, x, y, size, col, align = 'left', weight = 500, font = 'Jost') {
    g2.font = `${weight} ${size}px ${font}`; g2.fillStyle = col; g2.textAlign = align; g2.textBaseline = 'middle'; g2.fillText(s, x, y);
  }
  function wrap(s, x, y, w, size, col, lh = 1.3, weight = 500) {
    g2.font = `${weight} ${size}px Jost`;
    const words = s.split(' '); let line = '', yy = y;
    for (const wd of words) {
      const t = line ? line + ' ' + wd : wd;
      if (g2.measureText(t).width > w && line) { txt(line, x, yy, size, col, 'left', weight); line = wd; yy += size * lh; } else line = t;
    }
    if (line) txt(line, x, yy, size, col, 'left', weight);
    return yy + size * lh;
  }
  function rr(x, y, w, h, r) { g2.beginPath(); g2.roundRect(x, y, w, h, r); }
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = c => Math.round(clamp(c * k, 0, 255));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };

  // a view maps a player's local frame onto the canvas: { ox, oy, sc, x0, flip, k (glyph scale) }
  const V = (v, p) => ({ x: v.ox + ((v.flip ? MW - p.x : p.x) - v.x0) * v.sc, y: v.oy + p.y * v.sc });

  function terrain(v, w) {
    const { ox, oy, sc } = v;
    g2.save();
    rr(ox, oy, w, MH * sc, 10); g2.fillStyle = '#121b2e'; g2.fill(); g2.clip();
    // faint ground texture
    for (let i = 0; i < 70; i++) {
      const x = ox + hash(i) * w, y = oy + hash(i + 99) * MH * sc;
      g2.fillStyle = 'rgba(255,255,255,.025)'; g2.beginPath(); g2.arc(x, y, 6 + hash(i + 3) * 26 * sc, 0, 7); g2.fill();
    }
    for (const flip of v.both ? [false, true] : [v.flip]) {
      const vv = { ...v, flip };
      // the main base sits on high ground with one ramp out
      const a = V(vv, { x: 8, y: 52 }), b = V(vv, { x: 338, y: 428 });
      const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
      rr(x0, a.y, x1 - x0, b.y - a.y, 26 * sc); g2.fillStyle = '#1f2c48'; g2.fill();
      g2.strokeStyle = '#3a4f7e'; g2.lineWidth = 3 * sc; g2.stroke();
      const r1 = V(vv, { x: 330, y: 214 }), r2 = V(vv, { x: 330, y: 266 }), r3 = V(vv, { x: 392, y: 276 }), r4 = V(vv, { x: 392, y: 204 });
      g2.beginPath(); g2.moveTo(r1.x, r1.y); g2.lineTo(r4.x, r4.y); g2.lineTo(r3.x, r3.y); g2.lineTo(r2.x, r2.y); g2.closePath();
      g2.fillStyle = '#1b2640'; g2.fill();
      for (let i = 1; i < 4; i++) {   // ramp steps
        const p = V(vv, { x: 330 + i * 15, y: 210 }), q = V(vv, { x: 330 + i * 15, y: 270 });
        g2.strokeStyle = 'rgba(255,255,255,.07)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); g2.stroke();
      }
      // crystals at every base site
      for (const k of ['main', 'nat', 'third']) for (const p of PATCH[k]) crystal(V(vv, p), v.k);
      if (v.labels) {
        const m = V(vv, { x: 170, y: 446 }); txt('main base (high ground)', m.x, m.y, 15 * v.k + 2, 'rgba(169,183,214,.75)', 'center');
        const rp = V(vv, { x: 366, y: 318 }); txt('ramp', rp.x, rp.y, 15 * v.k + 2, 'rgba(169,183,214,.75)', 'center');
      }
    }
    g2.restore();
  }
  function crystal(p, k) {
    g2.save(); g2.translate(p.x, p.y);
    const s = 7 * k;
    g2.fillStyle = '#4fb8ff'; g2.strokeStyle = '#bfe6ff'; g2.lineWidth = 1;
    for (const [dx, h] of [[-s * .7, 1.1], [0, 1.6], [s * .7, 1]]) {
      g2.beginPath(); g2.moveTo(dx, -s * h); g2.lineTo(dx + s * .45, 0); g2.lineTo(dx, s * .5); g2.lineTo(dx - s * .45, 0); g2.closePath(); g2.fill(); g2.stroke();
    }
    g2.restore();
  }
  function hpBar(p, w, f, col) {
    if (f >= .999) return;
    g2.fillStyle = 'rgba(0,0,0,.6)'; g2.fillRect(p.x - w / 2, p.y, w, 6);
    g2.fillStyle = f > .5 ? col : '#ff6b6b'; g2.fillRect(p.x - w / 2, p.y, w * f, 6);
  }
  function building(b, v, g, col) {
    if (g < b.start) return;
    const p = V(v, b), k = v.k, dead = b.dies != null && g >= b.dies;
    const prog = clamp((g - b.start) / (b.done - b.start));
    g2.save(); g2.translate(p.x, p.y);
    if (dead) {   // rubble, fading
      g2.globalAlpha = clamp(1 - (g - b.dies) / 30, .35, 1);
      g2.fillStyle = '#3b4255';
      for (let i = 0; i < 6; i++) { g2.beginPath(); g2.arc((hash(i + b.x) - .5) * 30 * k, (hash(i + b.y) - .5) * 24 * k, (4 + hash(i) * 5) * k, 0, 7); g2.fill(); }
      if (g - b.dies < 4) { g2.strokeStyle = `rgba(255,200,120,${1 - (g - b.dies) / 4})`; g2.lineWidth = 4; g2.beginPath(); g2.arc(0, 0, (20 + (g - b.dies) * 14) * k, 0, 7); g2.stroke(); }
      g2.restore(); return;
    }
    g2.globalAlpha = prog < 1 ? .45 : 1;
    const dark = shade(col, .45);
    g2.fillStyle = dark; g2.strokeStyle = col; g2.lineWidth = 3 * k;
    if (b.kind === 'nexus') {
      const r = 36 * k;
      g2.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g2.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g2.closePath(); g2.fill(); g2.stroke();
      g2.fillStyle = '#9fe3ff'; g2.beginPath(); g2.arc(0, 0, r * .36, 0, 7); g2.fill();
    } else if (b.kind === 'gateway') {
      const s = 19 * k; rr(-s, -s, s * 2, s * 2, 6 * k); g2.fill(); g2.stroke();
      g2.fillStyle = col; g2.fillRect(-s * .35, -s * .6, s * .7, s * 1.2);
    } else if (b.kind === 'forge') {
      const s = 16 * k; rr(-s, -s, s * 2, s * 2, 4 * k); g2.fill(); g2.stroke();
      g2.fillStyle = col; g2.beginPath(); g2.arc(0, 0, s * .4, 0, 7); g2.fill();
    } else if (b.kind === 'pylon') {
      const s = 11 * k; g2.beginPath(); g2.moveTo(0, -s); g2.lineTo(s * .7, 0); g2.lineTo(0, s); g2.lineTo(-s * .7, 0); g2.closePath(); g2.fill(); g2.stroke();
    } else if (b.kind === 'cannon') {
      const s = 12 * k; g2.beginPath(); g2.arc(0, 0, s, 0, 7); g2.fill(); g2.stroke();
      g2.fillStyle = '#9fe3ff'; g2.beginPath(); g2.arc(0, -s * .1, s * .45, 0, 7); g2.fill();
    }
    g2.globalAlpha = 1;
    if (prog < 1) {   // construction ring
      const r = (b.kind === 'nexus' ? 44 : 24) * k;
      g2.strokeStyle = '#fff'; g2.lineWidth = 3; g2.beginPath(); g2.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); g2.stroke();
      if (b.kind === 'nexus' && v.labels) txt(`building ${Math.round(prog * 100)}%`, 0, r + 14, 16, '#fff', 'center', 600);
    }
    g2.restore();
    const f = hpAt(b, g);
    if (prog >= 1) hpBar({ x: p.x, y: p.y + (b.kind === 'nexus' ? 42 : 22) * k }, (b.kind === 'nexus' ? 60 : 34) * k, f, col);
  }
  function soldier(u, v, g, col) {
    if (g < u.born) return;
    const st = posAt(u.r.kf, Math.min(g, u.dies)), p = V(v, st), k = v.k;
    if (g >= u.dies) { puff(p, g - u.dies, k); return; }
    let fx = st.atk ? st.atk.x - st.x : st.dx, fy = st.atk ? st.atk.y - st.y : st.dy;
    if (v.flip) fx = -fx;
    const d = Math.hypot(fx, fy) || 1; fx /= d; fy /= d;
    const wob = st.atk ? Math.sin(g * 9 + u.i * 2) * 3 * k : 0;
    zealot(p.x + fx * wob, p.y + fy * wob, fx, fy, k, col, st.atk && ((g * 3 + u.i * .37) % 1) < .35);
  }
  function zealot(x, y, fx, fy, k, col, strike) {
    const r = 8 * k;
    g2.fillStyle = col; g2.strokeStyle = '#0b1222'; g2.lineWidth = 2;
    g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); g2.stroke();
    g2.strokeStyle = '#d9f4ff'; g2.lineWidth = 2.5 * k; g2.beginPath();   // psi blades, pointing where it's going
    g2.moveTo(x + fx * r * .6 - fy * r * .7, y + fy * r * .6 + fx * r * .7); g2.lineTo(x + fx * r * 1.7 - fy * r * .5, y + fy * r * 1.7 + fx * r * .5);
    g2.moveTo(x + fx * r * .6 + fy * r * .7, y + fy * r * .6 - fx * r * .7); g2.lineTo(x + fx * r * 1.7 + fy * r * .5, y + fy * r * 1.7 - fx * r * .5);
    g2.stroke();
    if (strike) {   // a strike landing
      g2.strokeStyle = 'rgba(255,255,255,.85)'; g2.lineWidth = 2;
      g2.beginPath(); g2.arc(x + fx * r * 2.6, y + fy * r * 2.6, 6 * k, 0, Math.PI * 1.2); g2.stroke();
    }
  }
  function worker(w, v, g, col) {
    if (g < w.born) return;
    const st = workerAt(w, Math.min(g, w.dies ?? Infinity)), p = V(v, st), k = v.k;
    if (w.dies != null && g >= w.dies) { puff(p, g - w.dies, k * .7); return; }
    probe(p.x, p.y, k, col, st.carry);
  }
  function probe(x, y, k, col, carry) {
    const p = { x, y }, st = { carry }, s = 4.2 * k;
    g2.fillStyle = shade(col, 1.15); g2.strokeStyle = '#0b1222'; g2.lineWidth = 1.2;
    g2.beginPath(); g2.moveTo(p.x, p.y - s); g2.lineTo(p.x + s, p.y); g2.lineTo(p.x, p.y + s); g2.lineTo(p.x - s, p.y); g2.closePath(); g2.fill(); g2.stroke();
    if (st.carry) { g2.fillStyle = '#7fd0ff'; g2.beginPath(); g2.arc(p.x, p.y - s - 2.5 * k, 2.3 * k, 0, 7); g2.fill(); }
  }
  function puff(p, age, k) {
    if (age > 4) return;
    const a = 1 - age / 4;
    g2.strokeStyle = `rgba(230,236,255,${a})`; g2.lineWidth = 2;
    g2.beginPath(); g2.arc(p.x, p.y, (6 + age * 6) * k, 0, 7); g2.stroke();
    const s = 5 * k; g2.beginPath(); g2.moveTo(p.x - s, p.y - s); g2.lineTo(p.x + s, p.y + s); g2.moveTo(p.x + s, p.y - s); g2.lineTo(p.x - s, p.y + s); g2.stroke();
  }
  // cannons fire at the nearest enemy soldier in range
  function beams(P, v, foes, fv, g) {
    if (!foes) return;
    const Rng = 170;
    P.builds.forEach((b, bi) => {
      if (b.kind !== 'cannon' || !built(b, g)) return;
      const me = V(v, b); let best = null, bd = Infinity;
      for (const u of foes.units) {
        if (!alive(u, g)) continue;
        const q = V(fv, posAt(u.r.kf, g)), d = Math.hypot(q.x - me.x, q.y - me.y);
        if (d < Rng * v.sc && d < bd) { bd = d; best = q; }
      }
      if (!best) return;
      g2.strokeStyle = 'rgba(143,211,255,.18)'; g2.lineWidth = 1.5; g2.setLineDash([4, 6]);
      g2.beginPath(); g2.arc(me.x, me.y, Rng * v.sc, 0, 7); g2.stroke(); g2.setLineDash([]);
      const ph = (g * 1.1 + bi * .3) % 1;
      if (ph < .45) {
        const a = 1 - ph / .45;
        g2.strokeStyle = `rgba(143,211,255,${a})`; g2.lineWidth = 5; g2.beginPath(); g2.moveTo(me.x, me.y); g2.lineTo(best.x, best.y); g2.stroke();
        g2.strokeStyle = `rgba(255,255,255,${a})`; g2.lineWidth = 2; g2.stroke();
      }
    });
  }
  function drawPlayer(P, v, g, foes, fv) {
    const col = COL[P.op];
    P.builds.forEach(b => building(b, v, g, col));
    P.workers.forEach(w => worker(w, v, g, col));
    beams(P, v, foes, fv, g);
    P.units.forEach(u => soldier(u, v, g, col));
  }
  function spendBar(s, x, y, w, h, showLabels) {
    const tot = Object.values(s.spend).reduce((a, b) => a + b, 0) || 1, max = 6000;
    rr(x, y, w, h, 6); g2.fillStyle = 'rgba(255,255,255,.06)'; g2.fill();
    let cx = x;
    for (const c in CAT) {
      const ww = w * s.spend[c] / max;
      if (ww <= 0) continue;
      g2.fillStyle = CAT[c].col; g2.fillRect(cx, y, Math.min(ww, x + w - cx), h);
      if (showLabels && ww > 54) txt(String(s.spend[c]), cx + ww / 2, y + h / 2 + 1, 15, '#0b1222', 'center', 700);
      cx += ww;
    }
    return tot;
  }
  function legendCats(x, y, size = 16, col = '#a9b7d6') {
    let cx = x;
    for (const c in CAT) {
      g2.fillStyle = CAT[c].col; rr(cx, y - 7, 14, 14, 3); g2.fill();
      txt(CAT[c].label, cx + 20, y, size, col);
      g2.font = `500 ${size}px Jost`; cx += 20 + g2.measureText(CAT[c].label).width + 18;
    }
  }
  function legendGlyphs(x, y, ink) {
    const items = [['worker', 'worker (mines money)'], ['soldier', 'soldier'], ['cannon', 'cannon (tower)'], ['nexus', 'base']];
    let cx = x;
    for (const [kind, label] of items) {
      const v = { ox: 0, oy: 0, sc: 1, x0: 0, k: .8 };
      if (kind === 'worker') probe(cx + 4, y, 1.3, '#4a5aa8', true);
      if (kind === 'soldier') zealot(cx + 2, y, 1, 0, .9, '#4a5aa8', false);
      if (kind === 'cannon') building({ kind: 'cannon', x: cx + 4, y, start: -1, done: -1 }, v, 0, '#4a5aa8');
      if (kind === 'nexus') building({ kind: 'nexus', x: cx + 8, y, start: -1, done: -1 }, { ...v, k: .45 }, 0, '#4a5aa8');
      txt(label, cx + 26, y, 16, ink);
      g2.font = '500 16px Jost'; cx += 26 + g2.measureText(label).width + 26;
    }
  }
  const noteAt = (notes, g) => { let n = null; for (const x of notes) if (g >= x[0]) n = x; return n; };

  function portrait(op, x, y, s) {
    g2.save(); g2.beginPath(); g2.arc(x + s / 2, y + s / 2, s / 2, 0, 7); g2.clip();
    if (PIC[op].complete && PIC[op].naturalWidth) g2.drawImage(PIC[op], x, y, s, s); else { g2.fillStyle = '#222'; g2.fillRect(x, y, s, s); }
    g2.restore();
    g2.strokeStyle = COL[op]; g2.lineWidth = 4; g2.beginPath(); g2.arc(x + s / 2, y + s / 2, s / 2, 0, 7); g2.stroke();
  }
  function counters(s, x, y, size = 20) {
    const items = [['workers', s.workers], ['soldiers', s.army], ['cannons', s.towers], ['bases', s.bases]];
    items.forEach(([l, n], i) => {
      const cx = x + i * (size * 4.6);
      txt(String(n), cx, y, size * 1.5, '#fff', 'left', 800, 'Montserrat');
      txt(l, cx, y + size * 1.25, size * .8, '#a9b7d6');
    });
  }

  /* ---------- slide: three openings, one clock ----------
     The course template's title block takes the top-left corner; the clock and the keys sit on the parchment beside it. */
  const INK = '#262c6a', PANEL = '#152044';
  function renderSolo(g) {
    const top = 186, rowH = 230, mapX = 470, mapW = 560;
    txt(`game clock ${mmss(g)}`, 1200, 86, 30, '#9a5a06', 'right', 800, 'Montserrat');
    legendGlyphs(900, 132, INK);
    legendCats(900, 162, 16, INK);
    SOLO.rows.forEach((P, i) => {
      const y = top + i * (rowH + 6), op = P.op, s = stats(P, g);
      rr(20, y, 1560, rowH, 14); g2.fillStyle = PANEL; g2.fill();
      g2.strokeStyle = COL[op]; g2.lineWidth = 2; g2.stroke();
      portrait(op, 36, y + 16, 84);
      txt(NAME[op], 136, y + 40, 32, COL[op], 'left', 800, 'Montserrat');
      wrap(PLAN[op], 136, y + 76, 310, 19, '#cfd8ee');
      counters(s, 36, y + 160, 18);
      // the map: this player's half and the middle, the enemy off to the right
      const v = { ox: mapX, oy: y + 10, sc: (rowH - 20) / MH, x0: 0, k: .8, labels: false };
      terrain(v, mapW);
      g2.save(); rr(v.ox, v.oy, mapW, MH * v.sc, 10); g2.clip();
      drawPlayer(P, v, g);
      const ex = v.ox + mapW - 8, ey = v.oy + 24;
      g2.fillStyle = 'rgba(12,20,40,.8)'; g2.fillRect(ex - 124, ey - 16, 124, 32);
      txt('enemy base →', ex - 8, ey, 17, '#ff9a9a', 'right', 600);
      g2.restore();
      // where the money went, and what is happening now
      const px = mapX + mapW + 26, pw = 1580 - px - 20;
      txt('money spent so far', px, y + 28, 17, '#a9b7d6', 'left', 600);
      const tot = spendBar(s, px, y + 44, pw, 26, true);
      txt(String(tot), px + pw, y + 28, 17, '#fff', 'right', 700);
      const n = noteAt(P.notes, g);
      if (n) {
        g2.globalAlpha = .35 + .65 * clamp((g - n[0]) / 3);
        txt(mmss(n[0]), px, y + 104, 19, COL[op], 'left', 800, 'Montserrat');
        wrap(n[1], px + 62, y + 104, pw - 62, 22, '#fff', 1.3, 500);
        g2.globalAlpha = 1;
      }
    });
  }

  /* ---------- slide: one matchup on one map ---------- */
  function renderMatch(M, g) {
    const mapY = 182, sc = 1560 / MW, mh = MH * sc, v = { ox: 20, oy: mapY, sc, x0: 0, k: 1, labels: true, both: true };
    const vL = { ...v, flip: false }, vR = { ...v, flip: true };
    terrain(v, 1560);
    g2.save(); rr(20, mapY, 1560, mh, 10); g2.clip();
    for (const p of [SITE.nat, SITE.third]) for (const [vv, P] of [[vL, M.L], [vR, M.R]]) {
      if (P.builds.some(b => b.kind === 'nexus' && b.x === p.x && b.y === p.y && g >= b.start)) continue;
      const q = V(vv, { x: p.x, y: p.y + (p === SITE.nat ? 62 : -62) });
      txt('expansion site', q.x, q.y, 15, 'rgba(169,183,214,.6)', 'center');
    }
    drawPlayer(M.L, vL, g, M.R, vR);
    drawPlayer(M.R, vR, g, M.L, vL);
    g2.restore();
    // clock and caption on the map
    rr(620, mapY + 10, 360, 44, 22); g2.fillStyle = 'rgba(6,14,32,.85)'; g2.fill();
    txt(`game clock ${mmss(g)}`, 800, mapY + 33, 24, '#ffb547', 'center', 800, 'Montserrat');
    const n = noteAt(M.notes, g);
    if (n) {
      g2.font = '600 26px Jost'; const tw = g2.measureText(n[1]).width + 50;
      g2.globalAlpha = clamp((g - n[0]) / 2.5);
      rr(800 - tw / 2, mapY + mh - 60, tw, 48, 12); g2.fillStyle = 'rgba(6,14,32,.88)'; g2.fill();
      txt(n[1], 800, mapY + mh - 35, 26, '#fff', 'center', 600); g2.globalAlpha = 1;
    }
    // the two players
    const y0 = mapY + mh + 10, h = 900 - 12 - y0;
    const card = (P, s, x) => {
      const w = 524;
      rr(x, y0, w, h, 14); g2.fillStyle = PANEL; g2.fill(); g2.strokeStyle = COL[P.op]; g2.lineWidth = 2; g2.stroke();
      portrait(P.op, x + 16, y0 + 12, 62);
      txt(NAME[P.op], x + 92, y0 + 30, 28, COL[P.op], 'left', 800, 'Montserrat');
      txt(PLAN[P.op], x + 92, y0 + 60, 17, '#cfd8ee');
      if (s.lost) txt(`soldiers lost: ${s.lost}`, x + w - 18, y0 + 30, 18, '#ff9a9a', 'right', 600);
      counters(s, x + 18, y0 + 104, 16);
      txt('money spent', x + 18, y0 + 156, 15, '#a9b7d6', 'left', 600);
      const tot = spendBar(s, x + 18, y0 + 170, w - 36, 22, true);
      txt(String(tot), x + w - 18, y0 + 156, 15, '#fff', 'right', 700);
    };
    card(M.L, stats(M.L, g), 20); card(M.R, stats(M.R, g), 1056);
    // soldiers and workers over time, both players
    const cx = 552, cw = 496;
    rr(cx, y0, cw, h, 14); g2.fillStyle = PANEL; g2.fill();
    txt('soldiers (solid) and workers (dashed)', cx + cw / 2, y0 + 18, 15, '#a9b7d6', 'center', 600);
    const px = cx + 16, py = y0 + 32, pw = cw - 32, ph = h - 70, ymax = 46;
    g2.strokeStyle = 'rgba(255,255,255,.14)'; g2.lineWidth = 1; g2.strokeRect(px, py, pw, ph);
    for (const P of [M.L, M.R]) {
      const ser = P.ser || (P.ser = Array.from({ length: Math.ceil(M.dur / 2) + 1 }, (_, j) => stats(P, j * 2)));
      for (const key of ['workers', 'army']) {
        g2.strokeStyle = COL[P.op]; g2.lineWidth = key === 'army' ? 3 : 2; g2.setLineDash(key === 'army' ? [] : [6, 5]);
        g2.beginPath();
        for (let j = 0; j * 2 <= g; j++) {
          const X = px + pw * j * 2 / M.dur, Y = py + ph - ph * Math.min(ymax, ser[j][key]) / ymax;
          j ? g2.lineTo(X, Y) : g2.moveTo(X, Y);
        }
        g2.stroke(); g2.setLineDash([]);
      }
    }
    g2.strokeStyle = 'rgba(255,255,255,.5)'; g2.beginPath(); g2.moveTo(px + pw * g / M.dur, py); g2.lineTo(px + pw * g / M.dur, py + ph); g2.stroke();
    legendCats(cx + 14, y0 + h - 18, 13, '#a9b7d6');
    // the verdict
    if (g >= M.verdict.g) {
      const wc = COL[M.title[0].toLowerCase()];
      g2.globalAlpha = clamp((g - M.verdict.g) / 2);
      rr(430, mapY + 110, 740, 190, 18); g2.fillStyle = 'rgba(6,14,32,.93)'; g2.fill();
      g2.strokeStyle = wc; g2.lineWidth = 3; g2.stroke();
      txt(M.verdict.head, 800, mapY + 156, 36, wc, 'center', 800, 'Montserrat');
      g2.font = '500 23px Jost';
      const words = M.verdict.body.split(' '); let line = '', yy = mapY + 208;
      for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g2.measureText(t).width > 660 && line) { txt(line, 800, yy, 23, '#fff', 'center'); line = wd; yy += 31; } else line = t; }
      txt(line, 800, yy, 23, '#fff', 'center');
      g2.globalAlpha = 1;
    }
  }

  /* ---------- wiring: play, pause, scrub ---------- */
  const api = {};
  function wire(name, getDur, render, init) {
    canvasDemo(name, (s, cv, ctx) => {
      const st = { t: 0, play: true, held: false };
      const scrub = $(s, '.ro-scrub'), pb = $(s, '.ro-play');
      const sync = () => { if (scrub) scrub.value = String(st.t / (getDur() / SPEED + 4)); if (pb) pb.textContent = st.play ? '❚❚ Pause' : '▶ Play'; };
      const draw = () => { g2 = ctx; ctx.clearRect(0, 0, cv.width, cv.height); render(Math.min(st.t * SPEED, getDur())); };
      if (pb) pb.onclick = () => { st.play = !st.play; if (st.play && st.t >= getDur() / SPEED + 4) st.t = 0; sync(); };
      cv.onclick = () => pb?.onclick();
      if (scrub) scrub.oninput = () => { st.t = +scrub.value * (getDur() / SPEED + 4); st.play = false; sync(); draw(); };
      init?.(s, st, sync);
      api[name] = { seek(t) { st.held = true; st.t = t; draw(); }, dur: () => getDur() / SPEED + 3.5, restart() { st.t = 0; st.play = true; sync(); } };
      sync();
      return dt => {
        if (!st.held && st.play) { st.t += dt; if (st.t > getDur() / SPEED + 4) st.t = 0; if (scrub) scrub.value = String(st.t / (getDur() / SPEED + 4)); }
        draw();
      };
    }, { enter() { api[name]?.restart(); } });
  }
  wire('ro-solo', () => SOLO.dur, renderSolo);
  let cur = 'turtle-rush';
  wire('ro-match', () => MATCH[cur].dur, g => renderMatch(MATCH[cur], g), (s, st, sync) => {
    $$(s, '[data-match]').forEach(b => b.onclick = () => {
      cur = b.dataset.match;
      $$(s, '[data-match]').forEach(x => x.classList.toggle('on', x === b));
      st.t = 0; st.play = true; sync();
    });
  });
  // GIF hooks
  window.__seek = (t, which) => {
    if (which === 'solo') return api['ro-solo'].seek(t);
    cur = which; document.querySelectorAll('[data-match]').forEach(x => x.classList.toggle('on', x.dataset.match === which));
    api['ro-match'].seek(t);
  };
  window.__dur = which => which === 'solo' ? SOLO.dur / SPEED + 3.5 : MATCH[which].dur / SPEED + 3.5;
})();
