/* StarCraft II co-op mutators (MGM C4 M5, deck slide id g3ca178c8255_0_0, "Procedural Permutation: Mutators").
   One small top-down fight, simulated at 30 steps a second, so every frame is a pure function of (mutator, side, time).
   The same Zerg wave hits the same squad twice: 'habit' plays the base mission's habit (let them come to the line, focus the
   nearest), 'answer' plays what the mutator asks for. Rules for each mutator follow the slide's text; numbers are illustrative.
   MUT.run(key, side) returns { frames: [snapshot per step], lost, hurt, boom }; cached. Works in node too, for tuning. */
(function (root) {
  const DT = 1 / 30, DUR = 10, W = 500, H = 300;
  // [key, name, the slide's text, the answer it asks for, permutation (true) or closer to escalation (false)]
  const MUTATORS = [
    ['none', 'No mutator', 'The base co-op mission: the same wave, no modifiers.', 'Let them come, focus the nearest', null],
    ['aggressive-deployment', 'Aggressive Deployment', 'Additional enemy units are periodically deployed onto the battlefield.', 'Watch your back: turn on the drops', true],
    ['alien-incubation', 'Alien Incubation', 'All enemy units spawn Broodlings upon death.', 'Splash the Broodlings', true],
    ['avenger', 'Avenger', 'Enemy units gain increased attack speed, movement speed, armor, life, and life-regeneration when nearby enemy units die.', 'Kill the pack together', true],
    ['barrier', 'Barrier', 'Enemy units and structures gain a temporary shield upon the first time they take damage.', 'Tag them all, then wait it out', true],
    ['black-death', 'Black Death', 'Some enemy units carry a plague that deals damage over time and spreads to other nearby units. The plague spreads to your units when the enemy unit is killed.', 'Kill the carriers at range', true],
    ['blizzard', 'Blizzard', 'Storm clouds move across the map, damaging and freezing player units in their path.', 'Step out of the storm’s path', true],
    ['boom-bots', 'Boom Bots', 'Uncaring automatons carry a nuclear payload toward your base. One player must discern the disarming sequence and the other player must enter it.', 'One player reads, the other enters', true],
  ];
  const KEYS = MUTATORS.map(m => m[0]);
  const STAT = {
    marine: { hp: 45, range: 150, dmg: 7, rate: .45, r: 15 },
    tank: { hp: 150, range: 300, dmg: 45, rate: 1.8, r: 19, splash: 56 },
    zergling: { hp: 35, speed: 56, dmg: 5, rate: .6, r: 13, brood: 2 },
    roach: { hp: 110, speed: 44, dmg: 10, rate: 1, r: 17, brood: 4 },
    broodling: { hp: 18, speed: 70, dmg: 5, rate: .5, r: 9, life: Infinity, brood: 0 },   // Alien Incubation's Broodlings have no timed life (StarCraft Wiki)
  };
  const ENGAGE_HABIT = 135;   // the habit: hold fire until they are this close to the shooter
  const BOMB = { x0: 330, y: 272, speed: 40, seq: ['↑', '←', '↓', '→'] };
  const STORM = { x: 92, r: 72, y0: -90, speed: 64, t0: 1 };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // a seeded wave: six zerglings and a roach in a loose pack, two of the zerglings carry the plague under Black Death
  function wave() {
    const out = [], spots = [[440, 128], [440, 172], [464, 106], [464, 194], [486, 128], [486, 172], [464, 150]];
    spots.forEach(([x, y], i) => out.push(enemy(i === 6 ? 'roach' : 'zergling', x, y, { carrier: i === 1 || i === 4 })));
    return out;
  }
  let uid = 0;
  function enemy(kind, x, y, o = {}) {
    const s = STAT[kind];
    return { id: uid++, kind, x, y, hp: s.hp, max: s.hp, cd: .3, alive: true, shield: 0, shieldT: 0, tagged: false, stacks: 0, life: s.life || 0, born: o.born || 0, ...o };
  }
  function squad() {
    const u = [
      { kind: 'tank', who: 1, hx: 52, hy: 150 },
      { kind: 'marine', who: 1, hx: 104, hy: 84 }, { kind: 'marine', who: 1, hx: 112, hy: 128 },
      { kind: 'marine', who: 2, hx: 112, hy: 174 }, { kind: 'marine', who: 2, hx: 104, hy: 218 },
    ];
    return u.map((p, i) => ({ id: uid++, i, ...p, x: p.hx, y: p.hy, hp: STAT[p.kind].hp, max: STAT[p.kind].hp, cd: .2 + i * .07, alive: true, frozen: 0, plague: 0 }));
  }

  // what each side does under each mutator
  function config(key, side) {
    const c = { key, engage: ENGAGE_HABIT, tankEngage: ENGAGE_HABIT, pick: 'nearest', tankPick: 'nearest', front: true };   // the habit faces the wave
    if (side === 'habit') return c;
    switch (key) {
      case 'alien-incubation': c.tankEngage = 300; c.tankPick = 'swarm'; c.engage = 150; c.pick = 'broodFirst'; break;
      case 'aggressive-deployment': c.front = false; c.pick = 'dropFirst'; c.tankPick = 'dropFirst'; break;
      case 'avenger': c.tankEngage = 300; c.tankPick = 'densest'; c.volley = 5; c.engage = 150; c.pick = 'healthiest'; break;
      case 'barrier': c.tankEngage = 300; c.tankPick = 'bare'; c.engage = 150; c.pick = 'untaggedFirst'; c.scout = true; break;
      case 'black-death': c.tankEngage = 300; c.tankPick = 'carrierFirst'; c.engage = 150; c.pick = 'carrierFirst'; break;
      case 'blizzard': c.dodge = true; break;
      case 'boom-bots': c.disarm = true; break;
    }
    return c;
  }

  // scripted positions: the barrier scout, the blizzard dodge and the boom bot runner
  function moveTo(u, x, y, speed) {
    const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy), s = speed * DT;
    if (d <= s) { u.x = x; u.y = y; return true; }
    u.x += dx / d * s; u.y += dy / d * s; return false;
  }
  function script(u, c, t, w) {
    if (c.scout && (u.i === 1 || u.i === 2)) {   // one marine runs out, tags the pack, runs home
      if (t < .4) return 'hold';
      if (!w.scoutDone) { if (t < 3.2) { moveTo(u, 250, u.i === 1 ? 118 : 172, 130); return 'tagging'; } w.scoutDone = true; }
      moveTo(u, u.hx, u.hy, 120); return dist(u, { x: u.hx, y: u.hy }) > 2 ? 'run' : null;
    }
    if (c.dodge) {               // everyone steps forward out of the storm column, then back once it has passed
      const sy = w.storm ? w.storm.y : -999, away = sy > -40 && sy < 330;
      moveTo(u, away ? u.hx + 125 : u.hx, u.hy, 140); return null;
    }
    if (c.disarm && u.who === 2 && u.i === 4) {   // player 2's last marine runs to the bot to read the sequence
      const b = w.bomb; if (!b || b.done) { moveTo(u, u.hx, u.hy, 110); return 'run'; }
      if (moveTo(u, b.x - 26, b.y - 22, 110)) { b.reading = true; return 'reading'; }
      return 'run';
    }
    return null;
  }

  function pickTarget(u, foes, mode, range, front) {
    const inR = foes.filter(e => e.alive && dist(u, e) <= range && e.x < W + 8 && (!front || e.x > u.x - 12));
    if (!inR.length) return null;
    const near = (a, b) => dist(u, a) - dist(u, b);
    switch (mode) {
      case 'farthest': return inR.sort((a, b) => b.x - a.x)[0];
      case 'dropFirst': return inR.sort((a, b) => !!b.dropped - !!a.dropped || near(a, b))[0];
      case 'swarm': return inR.sort((a, b) => foes.filter(e => e.alive && e.kind === 'broodling' && dist(e, b) < 50).length - foes.filter(e => e.alive && e.kind === 'broodling' && dist(e, a) < 50).length || near(a, b))[0];
      case 'broodFirst': return inR.sort((a, b) => (a.kind !== 'broodling') - (b.kind !== 'broodling') || near(a, b))[0];
      case 'weakest': return inR.sort((a, b) => (a.hp + a.shield) - (b.hp + b.shield) || near(a, b))[0];
      case 'healthiest': return inR.sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield) || near(a, b))[0];
      case 'carrierFirst': return inR.sort((a, b) => (!a.carrier) - (!b.carrier) || near(a, b))[0];
      case 'untaggedFirst': return inR.sort((a, b) => a.tagged - b.tagged || near(a, b))[0];
      case 'bare': { const ok = inR.filter(e => e.tagged && e.shield <= 0); return ok.length ? ok.sort(near)[0] : null; }
      case 'densest': return inR.sort((a, b) => foes.filter(e => e.alive && dist(e, b) < 60).length - foes.filter(e => e.alive && dist(e, a) < 60).length || near(a, b))[0];
      default: return inR.sort(near)[0];
    }
  }

  function simulate(key, side) {
    uid = 0;
    const c = config(key, side), units = squad(), foes = wave(), fx = [], frames = [];
    const w = { t: 0, scoutDone: false, storm: null, bomb: null, boom: 0, seqStep: 0 };
    if (key === 'boom-bots') w.bomb = { x: BOMB.x0, y: BOMB.y, done: false, reading: false, read: 0, entered: 0 };
    const hit = (e, dmg, t) => {
      if (!e.alive) return;
      if (key === 'barrier' && !e.tagged) { e.tagged = true; e.shield = 55; e.shieldT = 3; fx.push({ k: 'pop', x: e.x, y: e.y - 20, s: 'shield', ttl: .6, col: '#57b6ff' }); }
      e.tagged = true;
      if (e.shield > 0) { const a = Math.min(e.shield, dmg); e.shield -= a; dmg -= a; }
      e.hp -= dmg;
      if (e.hp <= 0) die(e, t);
    };
    const die = (e, t) => {
      e.alive = false; e.diedAt = t;
      fx.push({ k: 'poof', x: e.x, y: e.y, ttl: .45, col: e.carrier && key === 'black-death' ? '#5fd35f' : '#a8201c' });
      plague(e);
      if (key === 'alien-incubation') for (let k = 0, n = STAT[e.kind].brood; k < n; k++) foes.push(enemy('broodling', e.x - 6 + (k % 2) * 10, e.y + (k - (n - 1) / 2) * 12, { born: t }));   // more Broodlings from bigger units
      if (key === 'avenger') (w.batch ? w.batch.push(e) : avenge(e));
    };
    // Avenger: survivors near a death power up; a whole splash resolves first, so units that die together empower nobody
    const avenge = e => {
      foes.forEach(o => { if (o.alive && dist(o, e) < 140 && o.kind !== 'broodling') { o.stacks = Math.min(5, o.stacks + 1); o.hp = Math.min(o.max * (1 + .3 * o.stacks), o.hp + 6); fx.push({ k: 'pop', x: o.x, y: o.y - 22, s: '+' + o.stacks, ttl: .6, col: '#e5322d' }); } });
    };
    const plague = e => {
      if (key === 'black-death' && e.carrier) {
        fx.push({ k: 'ring', x: e.x, y: e.y, r: 95, ttl: .7, col: '#5fd35f' });
        units.forEach(u => { if (u.alive && dist(u, e) < 95) u.plague = 4; });
      }
    };
    for (let step = 0; step <= DUR / DT; step++) {
      const t = step * DT; w.t = t;
      // mutator clocks
      if (key === 'aggressive-deployment' && [1.6, 4.6].some(d => Math.abs(t - d) < DT / 2)) (t < 3 ? [[40, 96], [44, 206], [76, 64]] : [[40, 120], [74, 252], [42, 214]]).forEach(([x, y]) => { foes.push(enemy('zergling', x, y, { born: t, dropped: true })); fx.push({ k: 'drop', x, y, ttl: .6 }); });
      if (key === 'blizzard' && t >= STORM.t0) w.storm = { x: STORM.x, y: STORM.y0 + (t - STORM.t0) * STORM.speed, r: STORM.r };
      if (w.bomb && !w.bomb.done) {
        const b = w.bomb; b.x -= BOMB.speed * DT;
        if (b.reading) { b.read += DT; if (b.read > .7) { b.entered = Math.min(4, Math.floor((b.read - .7) / .45) + 1); if (b.entered >= 4 && b.read > .7 + 4 * .45 + .2) { b.done = 'disarmed'; fx.push({ k: 'pop', x: b.x, y: b.y - 30, s: 'Disarmed', ttl: 1.6, col: '#1a8a4c' }); } } }
        if (b.x <= 22 && !b.done) { b.done = 'boom'; w.boom = t; units.forEach(u => { if (u.alive && dist(u, b) < 150) { u.hp -= 70; if (u.hp <= 0) u.alive = false; } }); fx.push({ k: 'nuke', x: 22, y: b.y, ttl: 1.6 }); }
      }
      // player units
      units.forEach(u => {
        if (!u.alive) return;
        if (u.plague > 0) { u.plague -= DT; u.hp -= 10 * DT; units.forEach(o => { if (o !== u && o.alive && !o.plague && dist(o, u) < 34 && u.plague > 3.5) o.plague = 3; }); }
        if (w.storm && Math.hypot(u.x - w.storm.x, u.y - w.storm.y) < w.storm.r) { u.frozen = .9; u.hp -= 9 * DT; }
        if (u.hp <= 0) { u.alive = false; fx.push({ k: 'poof', x: u.x, y: u.y, ttl: .5, col: '#2ea3dc' }); return; }
        u.frozen = Math.max(0, u.frozen - DT);
        const mode = script(u, c, t, w);
        u.mode = mode;
        u.cd -= DT;
        if (u.frozen > 0 || mode === 'reading' || mode === 'run' || u.cd > 0) return;
        const S = STAT[u.kind], tank = u.kind === 'tank';
        let range = Math.min(S.range, tank ? c.tankEngage : c.engage), how = tank ? c.tankPick : c.pick;
        if (mode === 'tagging') { range = 150; how = 'untaggedFirst'; }
        const e = pickTarget(u, foes, how, range, c.front);
        // Avenger's answer: the tank waits until one shell would finish most of the pack at once
        if (tank && c.volley && e && foes.filter(o => o.alive && dist(o, e) < S.splash && o.hp + o.shield <= (dist(o, e) < 22 ? S.dmg : S.dmg * .8)).length < Math.min(c.volley, foes.filter(o => o.alive).length)) return;
        if (!e || (mode === 'tagging' && e.tagged)) return;
        u.cd = S.rate;
        if (tank) {
          fx.push({ k: 'shell', x0: u.x, y0: u.y, x: e.x, y: e.y, ttl: .28 });
          w.batch = [];
          foes.forEach(o => { if (o.alive) { const d = dist(o, e); if (d < S.splash) hit(o, d < 22 ? S.dmg : S.dmg * .8, t); } });
          const dead = w.batch; w.batch = null; dead.forEach(avenge);
        } else { fx.push({ k: 'shot', x0: u.x, y0: u.y, x: e.x, y: e.y, ttl: .09 }); hit(e, S.dmg, t); }
      });
      // enemies
      foes.forEach(e => {
        if (!e.alive || t < e.born) return;
        const S = STAT[e.kind], k = 1 + .22 * e.stacks;
        if (e.kind === 'broodling' && t - e.born > S.life) { e.alive = false; fx.push({ k: 'fade', x: e.x, y: e.y, ttl: .4 }); return; }
        if (e.shieldT > 0) { e.shieldT -= DT; if (e.shieldT <= 0) e.shield = 0; }
        if (e.stacks) e.hp = Math.min(e.max * (1 + .3 * e.stacks), e.hp + 3 * e.stacks * DT);
        const live = units.filter(u => u.alive);
        const u = live.sort((a, b) => dist(a, e) - dist(b, e))[0];
        e.cd -= DT;
        if (u && dist(u, e) < STAT[u.kind].r + S.r + 3) {
          if (e.cd <= 0) { e.cd = S.rate / k; u.hp -= S.dmg * k; fx.push({ k: 'claw', x: u.x, y: u.y, ttl: .15 }); }
          return;
        }
        const tx = u && dist(u, e) < 110 ? u.x : 20, ty = u && dist(u, e) < 110 ? u.y : e.y;
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, sp = S.speed * Math.min(2.4, k) * DT;
        if (e.x > 30 || (u && dist(u, e) < 110)) { e.x += dx / d * sp; e.y += dy / d * sp; }
      });
      // keep enemies from stacking on one spot
      const live = foes.filter(e => e.alive && t >= e.born);
      for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
        const p = live[a], q = live[b], d = dist(p, q) || .01, m = STAT[p.kind].r + STAT[q.kind].r - 2;
        if (d < m) { const push = (m - d) / 2, nx = (q.x - p.x) / d, ny = (q.y - p.y) / d; p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push; }
      }
      units.forEach(u => { if (u.alive && u.hp <= 0) { u.alive = false; fx.push({ k: 'poof', x: u.x, y: u.y, ttl: .5, col: '#2ea3dc' }); } });
      for (let i = fx.length - 1; i >= 0; i--) { fx[i].age = (fx[i].age ?? -DT) + DT; if (fx[i].age > fx[i].ttl) fx.splice(i, 1); }
      frames.push({
        t,
        units: units.map(u => ({ kind: u.kind, who: u.who, x: u.x, y: u.y, hp: Math.max(0, u.hp) / u.max, alive: u.alive, frozen: u.frozen > 0, plague: u.plague > 0, mode: u.mode })),
        foes: foes.filter(e => t >= e.born && (e.alive || t - e.diedAt < .01)).filter(e => e.alive).map(e => ({ kind: e.kind, x: e.x, y: e.y, hp: Math.max(0, e.hp) / (e.max * (1 + .3 * e.stacks)), shield: e.shield > 0, stacks: e.stacks, carrier: key === 'black-death' && e.carrier, life: e.kind === 'broodling' ? 1 - (t - e.born) / STAT.broodling.life : 1 })),
        fx: fx.map(f => ({ ...f })),
        storm: w.storm && { ...w.storm },
        bomb: w.bomb && { ...w.bomb },
        boom: w.boom,
        lost: units.filter(u => !u.alive).length,
        hurt: units.reduce((s, u) => s + (u.max - Math.max(0, u.hp)), 0) / units.reduce((s, u) => s + u.max, 0),
        left: foes.filter(e => e.alive && t >= e.born).length,
      });
    }
    const last = frames[frames.length - 1];
    return { frames, lost: last.lost, hurt: last.hurt, boom: !!w.boom, left: last.left, units: units.length };
  }
  const CACHE = {};
  const run = (key, side) => CACHE[key + side] || (CACHE[key + side] = simulate(key, side));
  const frame = (key, side, t) => { const r = run(key, side); return r.frames[Math.max(0, Math.min(r.frames.length - 1, Math.floor(t / DT)))]; };

  const api = { MUTATORS, KEYS, STAT, DUR, W, H, BOMB, run, frame };
  if (typeof module !== 'undefined') module.exports = api; else root.MUT = api;
})(this);
