/* Sketch level: the level data and the whole game simulation, with no drawing and no DOM, so Node can run it too.
   Every coordinate is a pixel of the student's graph-paper sketch (img/sketch.png, 1587×697), so the pencil render
   lies exactly over the drawing. One grid square is about 41 px wide and 44 px tall.
   The sketch gives the layout; the rules it leaves open are this page's reading and live in RULES:
   - a lantern breaks when the flail hits it and drops what the sketch draws beside it (a heart, or the purple sword);
   - a cracked brown block breaks when the flail hits it, cracks under your feet after RULES.crumble seconds of standing,
     and grows back after RULES.regrow seconds;
   - a Spawn is a point in the ceiling that keeps releasing Medusa heads; a head flies toward you in a sine wave whose
     middle line drifts to your height (the sketch's wavy Homing arrow), and it takes two flail hits;
   - the purple sword makes the flail strike twice as hard, so a Medusa head falls to one hit instead of two.
   Fixed step (1/60 s) and no randomness, so a run is a pure function of its inputs: the GIF and the demo replay exactly. */
(function (root) {
  const DT = 1 / 60;
  const RULES = {
    run: 230, gravity: 2000, jumpV: 760, cutV: 300, fall: 900, coyote: 0.1, corner: 16, buffer: 0.12,
    pw: 28, ph: 84,                       // player box, about two thirds of a square wide and two squares tall
    hearts: 3, maxHearts: 5, invuln: 1.2,
    reach: 150, throwT: 0.34, headR: 12,  // flail: out and back in throwT seconds
    crumble: 0.9, regrow: 5,
    headHp: 2, spawnEvery: 2.4, spawnRange: 430, maxHeads: 2,
    headSpeed: 120, waveAmp: 38, wavePeriod: 1.5, homing: 45, headLife: 10, medusaR: 14, stagger: 0.3,
    itemG: 1400,
  };

  /* ---------- the level, read off the sketch ---------- */
  const PAPER = { x0: 24, y0: 55, x1: 1556, y1: 640 };
  // the ceiling band: [x0, x1, top line, underside]
  const CEIL = [[24, 105, 128, 262], [105, 765, 128, 175], [765, 1172, 172, 218], [1172, 1556, 130, 172]];
  // solid ground and ledges: [x0, y0, x1, y1]
  const GROUND = [
    [24, 437, 105, 483],      // first ledge, where the player starts
    [187, 350, 270, 397],     // the small floating block at the end of the first jump arc
    [352, 438, 599, 485],     // second ledge, where the player throws the flail
    [763, 437, 928, 485],     // ledge after the two cracked blocks
    [928, 455, 948, 485], [948, 473, 968, 503], [968, 491, 990, 521], [990, 509, 1010, 539],   // the staircase down
    [1010, 527, 1093, 572],   // the lower block at the foot of the stairs
    [1504, 350, 1556, 397],   // the final ledge: the goal
  ];
  const B = 41;
  const CRACKED = [352, 393, 435, 476].map(x => [x, 262])        // the cracked row in mid air, under the sword
    .concat([680, 721].map(x => [x, 437]))                        // the two cracked blocks where the second jump lands
    .concat([1093, 1134, 1258, 1299, 1422, 1463].map(x => [x, 437]))   // the three cracked platforms over the pit
    .map(([x, y]) => ({ x0: x, y0: y, x1: x + B, y1: y + (y === 262 ? 46 : 47) }));
  const LANTERNS = [[250, 198, 'heart'], [455, 198, 'sword'], [575, 198, 'heart'], [740, 289, 'heart'],
    [1125, 312, 'heart'], [1293, 312, 'heart'], [1458, 312, 'heart']].map(([x, y, drop]) => ({ x, y, drop }));
  // where each Spawn point sits and where its Medusa heads come out; the sketch's wavy Homing arrows run down and to the left
  const SPAWNS = [{ x: 765, y: 186, mx: 742, my: 214 }, { x: 1480, y: 186, mx: 1456, my: 214 }];
  const START = { x: 66, y: 437 };
  const GOAL = GROUND[GROUND.length - 1];
  const LEVEL = { PAPER, CEIL, GROUND, CRACKED, LANTERNS, SPAWNS, START, GOAL, B };

  const solidsStatic = CEIL.map(([x0, x1, , y1]) => ({ x0, y0: -200, x1, y1 }))
    .concat(GROUND.map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1 })))
    .concat([{ x0: -100, y0: -200, x1: PAPER.x0, y1: 900 }, { x0: PAPER.x1, y0: -200, x1: PAPER.x1 + 100, y1: 900 }]);

  function newGame() {
    return {
      t: 0, frame: 0, gen: 0, won: false, over: 0,
      p: { x: START.x, y: START.y, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, buf: 0, jumpHeld: false,
        hearts: RULES.hearts, sword: false, inv: 0, safe: { x: START.x, y: START.y }, falls: 0, onCracked: -1 },
      fl: null,                                  // the flail while it is out
      prevThrow: false, prevJump: false,
      cracked: CRACKED.map(() => ({ state: 'ok', stand: 0, gone: 0 })),
      lanterns: LANTERNS.map(() => ({ lit: true })),
      items: [],
      spawns: SPAWNS.map(() => ({ cd: 0.6, pulse: 0 })),
      heads: [], nextId: 1,
      events: [],                               // [t, kind, text] for captions
    };
  }

  const box = p => ({ x0: p.x - RULES.pw / 2, x1: p.x + RULES.pw / 2, y0: p.y - RULES.ph, y1: p.y });
  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  function solids(s) {
    const out = solidsStatic.slice();
    s.cracked.forEach((c, i) => { if (c.state !== 'gone') out.push(Object.assign({ cracked: i }, CRACKED[i])); });
    return out;
  }
  const ev = (s, kind, text) => s.events.push([s.t, kind, text]);
  const chest = p => ({ x: p.x, y: p.y - RULES.ph + 30 });

  // input: { left, right, up, jump, throw } booleans for this step
  function step(s, inp) {
    const R = RULES, p = s.p;
    s.t += DT; s.frame++;
    if (s.won) return s;
    if (s.over > 0) { s.over -= DT; if (s.over <= 0) { const keep = s.events; Object.assign(s, newGame(), { events: keep, t: s.t, frame: s.frame, gen: s.gen + 1 }); ev(s, 'restart', 'Back to the start.'); } return s; }
    const sol = solids(s);

    /* --- player movement --- */
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    p.vx = dir * R.run;
    if (dir) p.face = dir;
    if (inp.jump && !s.prevJump) p.buf = R.buffer; else p.buf = Math.max(0, p.buf - DT);
    p.coyote = p.ground ? R.coyote : Math.max(0, p.coyote - DT);
    if (p.buf > 0 && p.coyote > 0) { p.vy = -R.jumpV; p.buf = 0; p.coyote = 0; p.ground = false; p.jumpHeld = true; }
    if (!inp.jump && p.jumpHeld && p.vy < -R.cutV) p.vy = -R.cutV;
    if (!inp.jump || p.vy >= 0) p.jumpHeld = false;
    p.vy = Math.min(R.fall, p.vy + R.gravity * DT);
    // x then y, against every solid
    p.x += p.vx * DT;
    let b = box(p);
    for (const o of sol) if (hit(b, o)) { if (p.vx > 0) p.x = o.x0 - R.pw / 2 - 0.01; else if (p.vx < 0) p.x = o.x1 + R.pw / 2 + 0.01; b = box(p); }
    const wasGround = p.ground;
    p.y += p.vy * DT; p.ground = false; p.onCracked = -1;
    b = box(p);
    for (const o of sol) if (hit(b, o)) {
      if (p.vy > 0) { p.y = o.y0; p.ground = true; p.vy = 0; if (o.cracked !== undefined) p.onCracked = o.cracked; }
      else if (p.vy < 0) {
        // corner correction: a head that clips a ceiling corner by a few pixels slides past it instead of stopping
        const l = b.x1 - o.x0, r = o.x1 - b.x0, nx = l < r ? p.x - l - 0.02 : p.x + r + 0.02;
        const nb = { x0: nx - R.pw / 2, x1: nx + R.pw / 2, y0: b.y0, y1: b.y1 };
        if (Math.min(l, r) <= R.corner && !sol.some(q => hit(nb, q))) p.x = nx;
        else { p.y = o.y1 + R.ph; p.vy = 0; }
      }
      b = box(p);
    }
    if (p.ground && p.onCracked < 0 && !wasGround) p.safe = { x: p.x, y: p.y };
    if (p.ground && p.onCracked < 0) p.safe = { x: p.x, y: p.y };
    p.inv = Math.max(0, p.inv - DT);

    /* --- cracked blocks: crack while stood on, grow back later --- */
    s.cracked.forEach((c, i) => {
      if (c.state === 'gone') { c.gone += DT; if (c.gone >= R.regrow && !hit(box(p), CRACKED[i])) { c.state = 'ok'; c.stand = 0; c.gone = 0; } return; }
      const on = p.ground && p.y === CRACKED[i].y0 && p.x + R.pw / 2 > CRACKED[i].x0 && p.x - R.pw / 2 < CRACKED[i].x1;
      if (on) { c.stand += DT; c.state = 'shaking'; if (c.stand >= R.crumble) { c.state = 'gone'; c.gone = 0; ev(s, 'crumble', 'The cracked block gives way under your feet.'); } }
      else if (c.state === 'shaking' && c.stand > 0) c.state = 'shaking';
    });

    /* --- the flail --- */
    if (inp.throw && !s.prevThrow && !s.fl) {
      const dx = inp.up ? (dir ? p.face * Math.SQRT1_2 : 0) : p.face, dy = inp.up ? (dir ? -Math.SQRT1_2 : -1) : 0;
      s.fl = { t: 0, dx, dy, len: 0, max: R.reach, done: {}, stopped: false };
    }
    if (s.fl) {
      const f = s.fl; f.t += DT;
      const u = f.t / R.throwT;
      const want = (u < 0.5 ? u * 2 : (1 - u) * 2) * R.reach;
      if (!f.stopped || want < f.len) f.len = Math.min(want, f.max);
      const c = chest(p), hx = c.x + f.dx * f.len, hy = c.y + f.dy * f.len;
      f.hx = hx; f.hy = hy;
      const hb = { x0: hx - R.headR, x1: hx + R.headR, y0: hy - R.headR, y1: hy + R.headR };
      // the head stops on stone; a cracked block breaks
      if (u < 0.5) for (const o of sol) if (hit(hb, o)) {
        if (o.cracked !== undefined) { s.cracked[o.cracked].state = 'gone'; s.cracked[o.cracked].gone = 0; ev(s, 'break', 'The flail smashes a cracked block.'); }
        f.max = f.len; f.stopped = true; break;
      }
      LANTERNS.forEach((L, i) => {
        if (!s.lanterns[i].lit || f.done['l' + i]) return;
        if (Math.abs(hx - L.x) < 11 + R.headR && Math.abs(hy - L.y) < 21 + R.headR) {
          f.done['l' + i] = 1; s.lanterns[i].lit = false;
          s.items.push({ kind: L.drop, x: L.x, y: L.y + 14, vy: -120, got: false, id: s.nextId++ });
          ev(s, 'lantern', L.drop === 'sword' ? 'The lantern shatters and drops the purple sword.' : 'The lantern shatters and drops a heart.');
        }
      });
      s.heads.forEach(h => {
        if (h.dead || f.done['h' + h.id] || Math.hypot(hx - h.x, hy - h.y) >= R.medusaR + R.headR + 4) return;
        f.done['h' + h.id] = 1; h.hp -= p.sword ? 2 : 1; h.hit = R.stagger;
        if (h.hp <= 0) { h.dead = true; ev(s, 'kill', p.sword ? 'One sword-weighted hit and the Medusa head is gone.' : 'The second hit finishes the Medusa head.'); }
        else ev(s, 'wound', 'The Medusa head takes a hit and staggers. One more.');
      });
      if (f.t >= R.throwT) s.fl = null;
    }

    /* --- Spawn points release Medusa heads that wave toward you --- */
    SPAWNS.forEach((S, i) => {
      const sp = s.spawns[i]; sp.pulse = Math.max(0, sp.pulse - DT);
      sp.cd -= DT;
      const near = Math.abs(p.x - S.x) < R.spawnRange && p.x < S.x + 160;
      const mine = s.heads.filter(h => !h.dead && h.from === i).length;
      if (sp.cd <= 0 && near && mine < R.maxHeads) {
        sp.cd = R.spawnEvery; sp.pulse = 0.4;
        s.heads.push({ x: S.mx, y: S.my, mid: S.my + R.waveAmp, ph: -Math.PI / 2, dir: p.x < S.mx ? -1 : 1, hp: R.headHp, hit: 0,
          life: R.headLife, from: i, dead: false, id: s.nextId++, trail: [] });
        ev(s, 'fire', 'A Medusa head comes out of the Spawn.');
      }
    });
    s.heads.forEach(h => {
      if (h.dead) return;
      h.hit = Math.max(0, h.hit - DT);
      if (h.hit <= 0) {
        // forward at a steady speed, up and down on a sine wave, and the middle of the wave drifts toward your chest
        const c = chest(p), w = 2 * Math.PI / R.wavePeriod;
        h.mid += Math.max(-R.homing * DT, Math.min(R.homing * DT, c.y - h.mid));
        h.ph += w * DT;
        h.x += h.dir * R.headSpeed * DT;
        h.y = h.mid + Math.sin(h.ph) * R.waveAmp;
      }
      h.trail.push([h.x, h.y]); if (h.trail.length > 18) h.trail.shift();
      h.life -= DT; if (h.life <= 0 || h.x < PAPER.x0 - 30 || h.x > PAPER.x1 + 30) h.dead = true;
      const pb = box(p), r = R.medusaR - 3;
      if (!h.dead && p.inv <= 0 && h.x > pb.x0 - r && h.x < pb.x1 + r && h.y > pb.y0 - r && h.y < pb.y1 + r) {
        p.hearts--; p.inv = R.invuln; ev(s, 'hurt', 'A Medusa head bites: one heart lost.');
      }
    });
    s.heads = s.heads.filter(h => !h.dead);

    /* --- dropped items fall onto whatever is below, and you walk into them --- */
    s.items.forEach(it => {
      if (it.got) return;
      it.vy = Math.min(R.fall, it.vy + R.itemG * DT);
      const ny = it.y + it.vy * DT;
      let landed = false;
      if (it.vy > 0) for (const o of sol) if (it.x > o.x0 && it.x < o.x1 && it.y <= o.y0 && ny >= o.y0) { it.y = o.y0; it.vy = 0; landed = true; break; }
      if (!landed) it.y = ny;
      const pb = box(p);
      if (it.x > pb.x0 - 12 && it.x < pb.x1 + 12 && it.y > pb.y0 && it.y - 16 < pb.y1) {
        it.got = true;
        if (it.kind === 'sword') { p.sword = true; ev(s, 'sword', 'The purple sword: the flail now strikes twice as hard.'); }
        else if (p.hearts < R.maxHearts) { p.hearts++; ev(s, 'heart', 'Heart picked up.'); }
        else ev(s, 'heart', 'Heart picked up, but your hearts are already full.');
      }
      if (it.y > 760) { it.got = true; ev(s, 'lost', it.kind === 'sword' ? 'The sword falls into the pit.' : 'The heart falls into the pit.'); }
    });

    /* --- falling into the pit --- */
    if (p.y > PAPER.y1 + 90) {
      p.hearts--; p.falls++;
      ev(s, 'fall', 'Into the pit: one heart lost.');
      p.x = p.safe.x; p.y = p.safe.y; p.vx = p.vy = 0; p.inv = R.invuln;
    }
    if (p.hearts <= 0) { s.over = 1.6; ev(s, 'over', 'Out of hearts.'); }
    else if (p.ground && p.x > GOAL[0] && p.y === GOAL[1]) { s.won = true; ev(s, 'win', 'The final ledge: encounter cleared.'); }
    s.prevThrow = !!inp.throw; s.prevJump = !!inp.jump;
    return s;
  }

  /* ---------- a scripted player, for the demo and the GIF ----------
     Each beat is a small goal; the bot also swings at any Medusa head that gets close. */
  const BEATS = [
    ['walk', 108], ['jumpto', 236], ['walk', 250], ['throw', 'up'], ['pause', 0.55],
    ['jumpto', 455], ['walk', 455], ['throw', 'up'], ['pause', 0.3], ['jthrow', 'up'], ['pause', 0.75],
    ['walk', 575], ['jthrow', 'up'], ['pause', 0.7],
    ['walk', 585], ['jumpto', 742], ['throw', 'up'], ['pause', 0.42], ['walk', 776], ['jthrow', 'up'], ['pause', 0.4],
    ['walk', 1052], ['jumpto', 1126], ['throw', 'up'], ['pause', 0.42], ['jumpto', 1293], ['throw', 'up'], ['pause', 0.42],
    ['jumpto', 1462], ['throw', 'up'], ['pause', 0.3], ['jthrow', 'up'], ['jumpto', 1532], ['walk', 1532],
  ];
  function newBot() { return { i: 0, t: 0, phase: 0, gen: 0 }; }
  function botInput(s, bot) {
    const p = s.p, inp = { left: false, right: false, up: false, jump: false, throw: false };
    if (bot.gen !== s.gen) Object.assign(bot, newBot(), { gen: s.gen });
    const beat = BEATS[bot.i];
    const next = () => { bot.i++; bot.t = 0; bot.phase = 0; };
    if (!beat || s.won || s.over > 0) return inp;
    bot.t += DT;
    const toward = x => { if (x > p.x + 3) inp.right = true; else if (x < p.x - 3) inp.left = true; };
    const kind = beat[0], arg = beat[1];
    if (kind === 'walk') { toward(arg); if (Math.abs(p.x - arg) <= 3 && p.ground) next(); }
    else if (kind === 'pause') { if (bot.t >= arg) next(); }
    else if (kind === 'jumpto') {
      if (bot.phase === 0) { if (p.ground) { inp.jump = true; bot.phase = 1; } }
      else { inp.jump = p.vy < 0; toward(arg); if (p.ground && bot.t > 0.1) next(); }
      if (bot.phase === 1 && p.vy < 0) toward(arg);
    }
    else if (kind === 'throw') { if (bot.phase === 0) { if (!s.fl && !s.prevThrow) { inp.up = arg === 'up'; inp.throw = true; bot.phase = 1; } } else if (!s.fl) next(); }
    else if (kind === 'jthrow') {
      if (bot.phase === 0) { if (p.ground && !s.prevJump) { inp.jump = true; bot.phase = 1; } }
      else if (bot.phase === 1) { inp.jump = true; if (p.vy > -140) { inp.up = arg === 'up'; inp.throw = !s.fl && !s.prevThrow; if (inp.throw) bot.phase = 2; } }
      else if (p.ground && !s.fl) next();
    }
    // on top of the plan, swing at a Medusa head that comes close
    const c = chest(p);
    const threat = s.heads.find(h => !h.dead && Math.hypot(h.x - c.x, h.y - c.y) < 130);
    const busy = (kind === 'jthrow' && bot.phase === 1) || inp.throw;
    if (threat && !busy && !s.fl && !s.prevThrow) {
      const ax = threat.x - c.x, ay = threat.y - c.y, ahead = ax * p.face >= 0;
      if (ay < -Math.abs(ax) * 1.8) { inp.up = true; inp.throw = true; inp.left = inp.right = false; }
      else if (ahead && ay < -Math.abs(ax) * 0.45) { inp.up = true; inp.throw = true; }
      else if (ahead) inp.throw = true;
      else if (p.ground && (kind === 'walk' || kind === 'pause' || kind === 'throw')) { inp.left = ax < 0; inp.right = ax > 0; }
    }
    return inp;
  }

  const clone = s => JSON.parse(JSON.stringify(s));
  // play the bot from the start, returning one snapshot per frame
  function recordRun(maxSeconds = 60) {
    const s = newGame(), bot = newBot(), frames = [clone(s)];
    let end = 0;
    for (let i = 0; i < maxSeconds / DT; i++) {
      step(s, botInput(s, bot));
      frames.push(clone(s));
      if (s.won) { end++; if (end > 90) break; }
    }
    return frames;
  }

  const API = { DT, RULES, LEVEL, newGame, step, box, chest, solids, newBot, botInput, recordRun, BEATS, clone };
  if (typeof module !== 'undefined') module.exports = API; else root.SKETCH = API;
})(this);
