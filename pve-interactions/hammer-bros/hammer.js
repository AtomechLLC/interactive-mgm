/* World 5-2's Hammer Bros. encounter (Super Mario Bros.), rebuilt as a small deterministic platformer so students can
   take the encounter apart. Real sprites and 5-2 tiles in img/ (see img/sources.json).
   The rules live at the top: geometry in level(), enemies in step(), Mario's physics in moveMario(), and the three
   route bots in BOTS. Everything is a pure function of (pieces, seed, inputs), so window.__seek replays a run exactly. */
(function () {
  const { $, $$, demo, say, raf } = FPF.kit;

  /* ---------- sprites ---------- */
  const IMG = {};
  ['ground', 'brick', 'block', 'pipe', 'tree-tall', 'tree', 'fence', 'cloud', 'cloud-2', 'piranha', 'piranha-shut',
    'mario', 'mario-walk1', 'mario-walk2', 'mario-walk3', 'mario-jump', 'mario-big', 'mario-big-walk1', 'mario-big-walk2', 'mario-big-walk3', 'mario-big-jump', 'mario-dead', 'hammer-0', 'hammer-1', 'hammer-2', 'hammer-3',
    'hammer-bro-0', 'hammer-bro-1', 'hammer-bro-2', 'hammer-bro-3'].forEach(n => {
    const i = new Image(); i.src = new URL(`img/smb-${n}.png`, document.currentScript?.src || location.href).href; IMG[n] = i;
  });

  /* ---------- the pieces of the encounter ---------- */
  // Native NES pixels: 16 px tiles, a 20 x 12 tile view, ground top at y = 160.
  const T = 16, VW = 320, VH = 192, GY = 160, LOW = 96, HIGH = 32, GOAL = 300, FPS = 60, DT = 1 / FPS, LIMIT = 30;
  const PIECES = [
    { id: 'bro1', name: 'Hammer Bro, top', short: 'Top Hammer Bro', img: 'hammer-bro-0' },
    { id: 'bro2', name: 'Hammer Bro, low', short: 'Low Hammer Bro', img: 'hammer-bro-1' },
    { id: 'plant', name: 'Piranha Plant', short: 'Piranha Plant', img: 'piranha' },
    { id: 'bricks', name: 'Brick platforms', short: 'Bricks', img: 'brick' },
    { id: 'pit', name: 'Pit', short: 'Pit', img: null },
    { id: 'col', name: 'Block column', short: 'Column', img: 'block' },
  ];
  const ALL = { bro1: 1, bro2: 1, plant: 1, bricks: 1, pit: 1, col: 1 };
  const PRESETS = {
    w52: { name: 'World 5-2', on: ALL },
    lesson: { name: 'The Lesson', on: { bro2: 1, bricks: 1 } },
    squeeze: { name: 'The Squeeze', on: { bro1: 1, bro2: 1, plant: 1, pit: 1, col: 1 } },
    terrain: { name: 'Terrain only', on: { bricks: 1, pit: 1, col: 1 } },
  };

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

  // The level: solid rectangles. The pipe is always there (it's the step up); every other piece is a toggle.
  function level(on) {
    const S = [];
    if (on.pit) S.push({ x0: 0, x1: 224, y0: GY, y1: GY + 32, k: 'ground' }, { x0: 256, x1: VW, y0: GY, y1: GY + 32, k: 'ground' });
    else S.push({ x0: 0, x1: VW, y0: GY, y1: GY + 32, k: 'ground' });
    S.push({ x0: 32, x1: 64, y0: 128, y1: GY, k: 'pipe' });
    if (on.bricks) S.push({ x0: 80, x1: 208, y0: LOW, y1: LOW + 16, k: 'brick', lvl: 1 }, { x0: 80, x1: 208, y0: HIGH, y1: HIGH + 16, k: 'brick', lvl: 2 });
    if (on.col) S.push({ x0: 256, x1: 272, y0: 112, y1: GY, k: 'block' });
    return S;
  }
  const LVLY = [GY, LOW, HIGH];

  function world(on, seed = 1) {
    const R = rng(seed * 7919 + 13);
    const levels = on.bricks ? [0, 1, 2] : [0];
    const bros = [];
    // the slide's layout: one Hammer Bro on each row of bricks; with no bricks they stand on the ground
    if (on.bro1) bros.push({ id: 'bro1', home: on.bricks ? 112 : 128, lvl: on.bricks ? 2 : 0 });
    if (on.bro2) bros.push({ id: 'bro2', home: on.bricks ? 168 : 184, lvl: on.bricks ? 1 : 0 });
    bros.forEach((b, i) => Object.assign(b, {
      x: b.home, y: LVLY[b.lvl], alive: true, die: null, hop: null, face: -1, ph: i * 1.7,
      nextHop: 2.2 + i * 1.4 + R() * 1.5, nextThrow: .15 + i * .3 + R() * .3, wind: 0,
    }));
    return {
      on, R, levels, S: level(on), bros, t: 0,
      plant: on.plant ? { st: 'up', k: .3, wait: 1.6, off: 24 } : null,
      m: { x: 14, y: GY, vx: 0, vy: 0, ground: true, face: 1, hits: 0, inv: 0, big: true, dead: false, fell: false, done: false, jp: false, walk: 0 },
      hm: [], trail: [], ev: [], bumps: [], over: null,
    };
  }

  /* ---------- one 1/60 s step ---------- */
  // Super Mario is two tiles tall; small Mario one
  const mH = m => m.big ? 30 : 15;
  const mBox = m => ({ x0: m.x - 6, x1: m.x + 6, y0: m.y - mH(m), y1: m.y });
  // the game's hurt box for Super Mario leaves out the top of his sprite (about 24 px tall, not 32)
  const hurtBox = m => ({ x0: m.x - 6, x1: m.x + 6, y0: m.y - (m.big ? 24 : 15), y1: m.y });
  const broBox = b => ({ x0: b.x - 7, x1: b.x + 7, y0: b.y - 22, y1: b.y });
  const plantBox = p => ({ x0: 41, x1: 55, y0: 128 - p.off, y1: 128 });
  const hamBox = h => ({ x0: h.x - 6, x1: h.x + 6, y0: h.y - 6, y1: h.y + 6 });
  // As in the game: a hit shrinks Super Mario (with a short flicker), and a hit on small Mario costs the life.
  function hurt(w, why) {
    const m = w.m; if (m.inv > 0 || m.done || m.dead) return;
    m.hits++; w.ev.push({ t: w.t, k: m.big ? 'shrink' : 'dead', why, x: m.x, y: m.y });
    if (m.big) { m.big = false; m.inv = 1.6; }
    else { m.dead = true; m.vx = 0; m.vy = -330; m.deadAt = w.t; }
  }

  function moveMario(w, inp) {
    const m = w.m;
    const want = ((inp.r ? 1 : 0) - (inp.l ? 1 : 0)) * 84;
    const acc = (m.ground ? 900 : 520) * DT;
    m.vx += clamp(want - m.vx, -acc, acc);
    if (inp.j && !m.jp && m.ground) { m.vy = -350; m.ground = false; }
    m.jp = !!inp.j;
    m.vy = Math.min(420, m.vy + (m.vy < 0 && inp.j ? 900 : 2000) * DT);
    if (want) m.face = Math.sign(want);
    // x, then y, against the solids
    m.x += m.vx * DT; m.x = Math.max(6, m.x);
    for (const s of w.S) { const b = mBox(m); if (hit(b, s)) { if (m.vx > 0) m.x = s.x0 - 6; else if (m.vx < 0) m.x = s.x1 + 6; m.vx = 0; } }
    m.y += m.vy * DT; m.ground = false;
    for (const s of w.S) {
      const b = mBox(m); if (!hit(b, s)) continue;
      if (m.vy > 0) { m.y = s.y0; m.vy = 0; m.ground = true; }
      else if (m.vy < 0) {
        m.y = s.y1 + mH(m); m.vy = 0;
        if (s.k === 'brick') bump(w, s, m.x);
      }
    }
    m.walk += Math.abs(m.vx) * DT;
    if (m.y > GY + 40 && !m.fell) { m.fell = true; w.ev.push({ t: w.t, k: 'fell', x: m.x }); }
    if (m.x >= GOAL && m.ground && !m.done) { m.done = true; w.ev.push({ t: w.t, k: 'done' }); }
    if (m.inv > 0) m.inv -= DT;
  }

  // Bumping a brick from below knocks out a Hammer Bro standing on it (as in the game).
  function bump(w, s, x) {
    const tx = Math.floor(x / T) * T + 8;
    w.bumps.push({ t: w.t, x: tx, y: s.y0 });
    w.bros.forEach(b => { if (b.alive && !b.hop && b.lvl === s.lvl && Math.abs(b.x - tx) < 16) kill(w, b, 'bump'); });
  }
  function kill(w, b, how) { b.alive = false; b.die = { vy: -160, how }; w.ev.push({ t: w.t, k: how, id: b.id, x: b.x, y: b.y }); }

  function stepBros(w) {
    const m = w.m;
    for (const b of w.bros) {
      if (!b.alive) { if (b.die) { b.die.vy += 900 * DT; b.y += b.die.vy * DT; } continue; }
      b.face = m.x < b.x ? -1 : 1;
      // after 9 seconds they stop waiting and walk toward Mario (the game does this too)
      if (w.t > 9) b.home = clamp(b.home + Math.sign(m.x - b.home) * 10 * DT, b.lvl ? 88 : 76, b.lvl ? 200 : 212);
      b.ph += DT * 1.7;
      if (b.hop) {
        const h = b.hop, k = clamp((w.t - h.t0) / h.d, 0, 1);
        const y0 = LVLY[h.from], y1 = LVLY[h.to], top = Math.min(y0, y1) - (h.from === h.to ? 18 : 22);
        // up to the top of the arc, then down to the target row
        b.y = k < .45 ? y0 + (top - y0) * Math.sin(k / .45 * Math.PI / 2) : top + (y1 - top) * (1 - Math.cos((k - .45) / .55 * Math.PI / 2));
        b.x = b.home + Math.sin(b.ph) * 10;
        if (k >= 1) { b.lvl = h.to; b.y = y1; b.hop = null; }
        continue;
      }
      b.x = b.home + Math.sin(b.ph) * 10;
      if (w.t >= b.nextHop && b.wind <= 0) {
        const L = w.levels; let to = b.lvl;
        if (L.length > 1) to = b.lvl === 2 ? 1 : b.lvl === 0 ? 1 : (w.R() < .5 ? 2 : 0);
        b.hop = { t0: w.t, d: to === b.lvl ? .55 : .9, from: b.lvl, to };
        b.nextHop = w.t + 3.2 + w.R() * 2.4;
        continue;
      }
      if (b.wind > 0) {
        b.wind -= DT;
        if (b.wind <= 0) w.hm.push({ x: b.x + b.face * 5, y: b.y - 21, vx: b.face * (30 + w.R() * 62), vy: -240, rot: 0 });
      } else if (w.t >= b.nextThrow) {
        b.wind = .22;
        b.nextThrow = w.t + (w.R() < .2 ? 1 + w.R() * .5 : .3 + w.R() * .3);
      }
    }
    for (const h of w.hm) { h.vy += 720 * DT; h.x += h.vx * DT; h.y += h.vy * DT; h.rot += DT; }
    w.hm = w.hm.filter(h => h.y < VH + 20 && h.x > -20 && h.x < VW + 20);
  }

  function stepPlant(w) {
    const p = w.plant; if (!p) return;
    p.k += DT;
    const near = Math.abs(w.m.x - 48) < 27;   // it stays in the pipe while Mario stands on or beside it
    if (p.st === 'hidden' && p.k >= p.wait && !near) { p.st = 'rise'; p.k = 0; }
    else if (p.st === 'rise' && p.k >= .6) { p.st = 'up'; p.k = 0; }
    else if (p.st === 'up' && p.k >= 1.4) { p.st = 'sink'; p.k = 0; }
    else if (p.st === 'sink' && p.k >= .6) { p.st = 'hidden'; p.k = 0; p.wait = 1.6; }
    p.off = p.st === 'rise' ? 24 * p.k / .6 : p.st === 'up' ? 24 : p.st === 'sink' ? 24 * (1 - p.k / .6) : 0;
  }

  function collide(w) {
    const m = w.m; if (m.done || m.fell || m.dead) return;
    const mb = hurtBox(m);
    for (const b of w.bros) {
      if (!b.alive || !hit(mb, broBox(b))) continue;
      if (m.vy > 0 && m.y - (b.y - 22) < 9 + (m.big ? 4 : 0)) { kill(w, b, 'stomp'); m.vy = -220; }
      else hurt(w, 'Hammer Bro');
    }
    for (const h of w.hm) if (hit(mb, hamBox(h))) hurt(w, 'hammer');
    if (w.plant && w.plant.off > 4 && hit(mb, plantBox(w.plant))) hurt(w, 'Piranha Plant');
  }

  function step(w, inp) {
    if (w.over) return;
    w.t += DT;
    const M = w.m;
    if (M.dead) { if (w.t - M.deadAt > .45) { M.vy += 1100 * DT; M.y += M.vy * DT; } }
    else if (!M.done && !M.fell) moveMario(w, inp); else if (M.fell) { M.vy += 2000 * DT; M.y += M.vy * DT; }
    stepBros(w); stepPlant(w); collide(w);
    if ((w.t * FPS | 0) % 3 === 0) w.trail.push([w.m.x, w.m.y - 8]);
    if (w.m.done) w.over = w.over || { k: w.m.hits ? 'hit' : 'clean', t: w.t };
    else if (w.m.dead && w.m.y > VH + 30) w.over = { k: 'dead', t: w.t };
    else if (w.m.fell) w.over = { k: 'fell', t: w.t };
    else if (w.t >= LIMIT) w.over = { k: 'time', t: w.t };
  }

  /* ---------- the route bots ---------- */
  // When will a hammer in the air touch Mario if he keeps moving at vx along his current row?
  function threatAt(w, x, y, vx, horizon = .6, h = w.m.big ? 24 : 15) {
    let first = Infinity;
    for (const h of w.hm) {
      for (let t = 0; t <= horizon; t += 1 / 30) {
        const hx = h.x + h.vx * t, hy = h.y + h.vy * t + 360 * t * t, mx = x + vx * t;
        if (Math.abs(hx - mx) < 13 && hy > y - h - 7 && hy < y + 7) { first = Math.min(first, t); break; }
      }
    }
    return first;
  }
  // Prefer the planned speed; if a hammer will land on that line, take the line that is hit latest.
  function dodge(w, plan) {
    const m = w.m; if (!m.ground) return plan;
    const lines = [plan, 0, -84, 84].filter((v, i, a) => a.indexOf(v) === i);
    let best = plan, bt = -1;
    for (const v of lines) { const t = threatAt(w, m.x, m.y, v); if (t === Infinity) return v; if (t > bt) { bt = t; best = v; } }
    return best;
  }
  // a Hammer Bro standing in Mario's row just ahead: jump it (and stomp it if the arc lands on it)
  function broAhead(w, v) {
    const m = w.m; if (!m.ground || !v) return false;
    return w.bros.some(b => b.alive && !b.hop && Math.abs(b.y - m.y) < 4 && (b.x - m.x) * Math.sign(v) > 18 && (b.x - m.x) * Math.sign(v) < 34);
  }
  const lvlOf = m => m.y > GY - 4 ? 0 : m.y > LOW - 4 && m.y < LOW + 4 ? 1 : m.y < HIGH + 4 && m.y > HIGH - 4 ? 2 : -1;
  const inp = (v, j) => ({ l: v < 0, r: v > 0, j });
  // jumps every route needs: onto / over the pipe, and over the pit or up the column
  function terrainJump(w) {
    const m = w.m; if (!m.ground) return null;
    if (m.y >= GY - 1 && m.x > 17 && m.x < 26 && m.vx > 30) return true;
    const [e0, e1] = w.on.pit ? [211, 230] : w.on.col ? [229, 240] : [];
    if (e0 && m.y >= GY - 1 && m.x > e0 && m.x < e1 && m.vx > 30) return true;
    return null;
  }

  const BOTS = [
    {
      id: 'dash', name: 'Run for it', blurb: 'Hold right and jump only for the pipe and the exit.',
      ctl(w, s) {
        const m = w.m;
        s.j = s.j > 0 ? s.j - DT : 0;
        if (terrainJump(w) || (m.ground && m.vx < 5 && m.x > 20 && w.t > .4)) s.j = .4;
        return inp(84, s.j > 0);
      },
    },
    {
      id: 'read', name: 'Read the throws', blurb: 'Wait out the plant, stand on the pipe, cross when the air is clear and side-step hammers.',
      ctl(w, s) {
        const m = w.m, p = w.plant;
        s.j = s.j > 0 ? s.j - DT : 0;
        if (!s.phase) s.phase = 'approach';
        let v = 84;
        if (s.phase === 'approach') {
          // only step up while the plant is down (or there is none)
          const safe = !p || (p.st === 'hidden' && p.k < .6) || (p.st === 'sink' && p.k > .3);
          if (m.x > 15 && !safe && m.y >= GY - 1) v = 0;
          if (m.y <= 129 && m.ground) { s.phase = 'perch'; s.k = 0; }
        }
        if (s.phase === 'perch') {
          s.k += DT; v = m.x < 47 ? 30 : m.x > 51 ? -30 : 0;
          // the pipe is the one place the plant can't touch: wait for a clear sky, but not forever
          const clear = threatAt(w, 90, GY, 84, 1.3) === Infinity && !w.bros.some(b => b.alive && b.wind > 0);
          if ((clear && s.k > .3) || s.k > 4) s.phase = 'cross';
        }
        if (s.phase === 'cross') {
          v = dodge(w, 84);
          if (broAhead(w, v)) s.j = .4;
        }
        if (terrainJump(w) && s.phase !== 'perch') s.j = .4;
        if (s.phase === 'approach' && m.ground && m.x > 17 && m.x < 26 && v > 0) s.j = .4;
        return inp(v, s.j > 0);
      },
    },
    {
      id: 'hunt', name: 'Go up and fight', blurb: 'Use the pipe as a step onto the bricks, bump or stomp each Hammer Bro, then leave.',
      ctl(w, s) {
        const m = w.m, p = w.plant;
        s.j = s.j > 0 ? s.j - DT : 0;
        const alive = w.bros.filter(b => b.alive && !b.hop);
        const lv = lvlOf(m);
        let v = 84;
        const exit = () => { v = dodge(w, 84); if (terrainJump(w) || broAhead(w, v)) s.j = .4; if (lv === 1 && m.x > 196) v = 84; };
        const done = !alive.length || w.t > 18;
        if (lv === 0 && m.x < 70) {
          // get onto the pipe while the plant is down, then hop onto the low bricks
          const safe = !p || (p.st === 'hidden' && p.k < .6) || (p.st === 'sink' && p.k > .3);
          if (m.x < 26) { v = (m.x > 15 && !safe) ? 0 : 84; if (m.x > 17 && m.ground && v > 0) s.j = .4; }
          else if (m.y <= 129) { v = 84; if (m.x > 54 && m.ground && w.on.bricks && !done) s.j = .45; }
          else v = 84;
          return inp(v, s.j > 0);
        }
        if (done) { exit(); return inp(v, s.j > 0); }
        const tgt = alive.reduce((a, b) => (a.lvl <= b.lvl ? a : b));
        const dl = tgt.lvl - (lv < 0 ? 0 : lv);
        if (lv >= 0 && m.ground) {
          if (dl === 1) {   // stand under it and bump the brick
            const dx = tgt.x - m.x;
            v = Math.abs(dx) > 4 ? Math.sign(dx) * 84 : 0;
            v = dodge(w, v);
            if (Math.abs(dx) < 7) s.j = .35;
          } else if (dl === 0) {   // same row: jump onto it
            const dx = tgt.x - m.x;
            v = dodge(w, Math.sign(dx) * 84);
            if (Math.abs(dx) < 34 && Math.abs(dx) > 14) s.j = .3;
          } else if (dl < 0) {   // it is below: walk off the right end of the bricks
            v = dodge(w, 84);
            if (broAhead(w, v)) s.j = .4;
          } else { exit(); }
        }
        if (terrainJump(w) && lv === 0) s.j = .4;
        return inp(v, s.j > 0);
      },
    },
  ];

  function runBot(on, seed, bot, upto = LIMIT) {
    const w = world(on, seed), s = {};
    while (!w.over && w.t < upto) step(w, bot.ctl(w, s));
    return w;
  }
  const TRIALS = 20;
  const statsCache = new Map();
  function stats(on) {
    const key = PIECES.map(p => on[p.id] ? 1 : 0).join('');
    if (statsCache.has(key)) return statsCache.get(key);
    const out = BOTS.map(b => {
      const r = { clean: 0, hit: 0, dead: 0, fell: 0, time: 0, hits: 0 };
      for (let i = 1; i <= TRIALS; i++) { const w = runBot(on, i, b); r[w.over.k]++; r.hits += w.m.hits; }
      return r;
    });
    statsCache.set(key, out); return out;
  }
  // where hammers pass through, over 5 runs with Mario standing at the start
  const heatCache = new Map();
  function heat(on) {
    const key = PIECES.map(p => on[p.id] ? 1 : 0).join('');
    if (heatCache.has(key)) return heatCache.get(key);
    const C = 8, H = new Float32Array((VW / C) * (VH / C));
    for (let s = 1; s <= 5; s++) {
      const w = world(on, s + 100);
      for (let i = 0; i < 20 * FPS; i++) { step(w, {}); w.over = null; for (const h of w.hm) { const cx = h.x / C | 0, cy = h.y / C | 0; if (cx >= 0 && cy >= 0 && cx < VW / C && cy < VH / C) H[cy * (VW / C) + cx]++; } }
    }
    let mx = 0; H.forEach(v => mx = Math.max(mx, v));
    const r = { C, H, mx }; heatCache.set(key, r); return r;
  }

  /* ---------- drawing ---------- */
  function img(g, n, x, y, o = {}) {
    const i = IMG[n]; if (!i || !i.complete || !i.naturalWidth) return;
    g.save(); g.translate(Math.round(x), Math.round(y));
    if (o.flip) g.scale(-1, 1); if (o.vflip) g.scale(1, -1);
    if (o.a != null) g.globalAlpha = o.a;
    if (o.clipH != null) { g.beginPath(); g.rect(-i.width / 2, -i.height, i.width, o.clipH); g.clip(); }
    g.drawImage(i, -i.width / 2, -i.height);   // anchored at bottom centre
    g.restore();
  }
  function render(g, w, o = {}) {
    const S = o.S || 3;
    g.save(); g.imageSmoothingEnabled = false; g.setTransform?.(1, 0, 0, 1, 0, 0); if (o.ox) g.translate(o.ox, o.oy || 0); g.scale(S, S);
    g.fillStyle = '#6b8cff'; g.fillRect(0, 0, VW, VH);
    img(g, 'cloud', 52, 46); img(g, 'cloud-2', 250, 66); img(g, 'cloud', 196, 30);
    if (o.heat) {
      const { C, H, mx } = heat(w.on);
      for (let i = 0; i < H.length; i++) if (H[i]) { g.fillStyle = `rgba(255,60,40,${Math.min(.55, .12 + .55 * H[i] / mx)})`; g.fillRect((i % (VW / C)) * C, (i / (VW / C) | 0) * C, C, C); }
    }
    img(g, 'fence', 14, GY); img(g, 'tree-tall', 72, GY); img(g, 'tree', 115, GY); img(g, 'tree', 131, GY); img(g, 'tree', 296, GY);
    if (w.plant) img(g, w.plant.off > 0 && (w.t * 4 | 0) % 2 ? 'piranha-shut' : 'piranha', 48, 128 + 24 - w.plant.off, { clipH: 24 - (24 - w.plant.off) });
    for (const s of w.S) {
      if (s.k === 'ground') for (let x = s.x0; x < s.x1; x += T) for (let y = s.y0; y < s.y1; y += T) img(g, 'ground', x + 8, y + 16);
      if (s.k === 'brick') for (let x = s.x0; x < s.x1; x += T) { const b = w.bumps.find(b => b.x === x + 8 && b.y === s.y0 && w.t - b.t < .15); img(g, 'brick', x + 8, s.y1 - (b ? 4 : 0)); }
      if (s.k === 'block') for (let y = s.y0; y < s.y1; y += T) img(g, 'block', s.x0 + 8, y + 16);
      if (s.k === 'pipe') img(g, 'pipe', 48, GY);
    }
    if (o.ghost) for (const gh of o.ghost) { g.strokeStyle = gh.col; g.lineWidth = 1.4; g.globalAlpha = .9; g.beginPath(); gh.trail.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.globalAlpha = 1; }
    for (const b of w.bros) {
      if (b.y > VH + 30) continue;
      const fr = !b.alive ? 'hammer-bro-0' : b.wind > 0 ? 'hammer-bro-2' : (b.ph * 2.2 | 0) % 2 ? 'hammer-bro-1' : 'hammer-bro-0';
      img(g, fr, b.x, b.y + (b.alive ? 0 : -24), { flip: b.face > 0, vflip: !b.alive });
      if (b.alive && b.wind > 0) img(g, 'hammer-0', b.x - b.face * 2, b.y - 20);
    }
    for (const h of w.hm) img(g, 'hammer-' + ((h.rot * 12 | 0) % 4), h.x, h.y + 4, { flip: h.vx > 0 });
    const m = w.m;
    if (m.dead) { if (m.y < VH + 40) img(g, 'mario-dead', m.x, m.y + 1); }
    else if (!(m.inv > 0 && (w.t * 20 | 0) % 2) && m.y < VH + 20) {
      // the shrink: for the first beat of the flicker he alternates between big and small
      const big = m.big || (m.inv > 1.2 && (w.t * 12 | 0) % 2), p = big ? 'mario-big' : 'mario';
      const fr = !m.ground ? p + '-jump' : Math.abs(m.vx) > 8 ? p + '-walk' + (1 + (m.walk / 6 | 0) % 3) : p;
      img(g, fr, m.x, m.y + 1, { flip: m.face < 0 });
    }
    g.restore();
  }

  // how a finished run reads
  const OUTCOME = { clean: 'Through as Super Mario, untouched', hit: 'Through, shrunk to small Mario', dead: 'Hit while small: a life lost', fell: 'Fell in the pit: a life lost', time: 'Stuck: out of time' };

  /* ---------- labels drawn over the scene (in screen pixels) ---------- */
  function tag(g, s, x, y, o = {}) {
    g.save(); g.font = `${o.w || 700} ${o.size || 19}px Jost, sans-serif`; g.textBaseline = 'middle'; g.textAlign = o.align || 'center';
    const tw = g.measureText(s).width, pad = 10, bx = o.align === 'left' ? x - pad : o.align === 'right' ? x - tw - pad : x - tw / 2 - pad;
    g.globalAlpha = o.a ?? 1;
    g.fillStyle = o.bg || 'rgba(21,32,68,.9)'; g.beginPath(); g.roundRect(bx, y - 16, tw + pad * 2, 32, 9); g.fill();
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = 2.5; g.stroke(); }
    g.fillStyle = o.col || '#fff'; g.fillText(s, x, y + 1); g.restore();
  }
  function ring(g, x, y, w, h, col, a = 1) {
    g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 4; g.setLineDash([10, 7]); g.beginPath(); g.roundRect(x, y, w, h, 10); g.stroke(); g.restore();
  }

  /* ---------- slide 1: title ---------- */
  demo('hb-title', {
    init(s) {
      const c = $(s, 'canvas'), g = c.getContext('2d');
      s._draw = (dt, t) => {
        g.clearRect(0, 0, c.width, c.height); g.save(); g.imageSmoothingEnabled = false; g.scale(5, 5);
        img(g, 'mario-walk' + (1 + (t * 8 | 0) % 3), 22, 28);
        img(g, 'hammer-bro-' + ((t * 3 | 0) % 2), 88, 28, {}); img(g, 'hammer-bro-' + ((t * 3 + 1 | 0) % 2), 112, 28);
        img(g, (t * 3 | 0) % 2 ? 'piranha' : 'piranha-shut', 150, 28);
        img(g, 'brick', 56, 28); img(g, 'block', 172, 28);
        img(g, 'hammer-' + ((t * 10 | 0) % 4), 64 + Math.sin(t * 2) * 6, 10 + Math.cos(t * 2) * 3);
        g.restore();
      };
    },
    enter(s) { s._stop = raf(s._draw); }, leave(s) { s._stop?.(); },
  });

  /* ---------- slide 2: the encounter, piece by piece, then played (the GIF) ---------- */
  // First the pieces one at a time with Mario off screen (INTRO seconds), then one run by the "Read the throws" bot.
  const TOUR_SEED = 1, TOUR_BOT = 1, CALL = 3.2;
  const CALLS = [
    { k: 'plant', text: 'Piranha Plant: guards the pipe, the step up' },
    { k: 'bros', text: 'Hammer Bros: hammers arc down over the ground lane' },
    { k: 'bricks', text: 'Bricks: high ground for them, cover and a bump for you' },
    { k: 'exit', text: 'Pit + column: one committed jump to leave' },
  ];
  const INTRO = CALLS.length * CALL + .4;
  const SIDE = [
    'The plant rises and sinks on its own timer. It can’t rise while Mario stands on the pipe or right beside it.',
    'Both Hammer Bros throw toward Mario in arcs. The red cells are where hammers pass: a band over the whole ground lane.',
    'The bricks hold the Hammer Bros up high so their hammers cover the lane, and give Mario a second route and a bump from below.',
    'The exit is a high jump from one spot over the pit onto the column. You can’t take it while side-stepping.',
  ];
  const RUNTXT = {
    approach: 'Now played: Mario waits for the plant to sink, then steps up onto the pipe.',
    perch: 'On the pipe the plant can’t touch him. He watches the throws and waits for a clear sky.',
    cross: 'A gap between volleys: he crosses the lane, side-stepping any hammer that will land on him.',
  };
  demo('hb-tour', {
    init(s) {
      const c = $(s, 'canvas'), g = c.getContext('2d'), out = $(s, '.tour-out'), S = c.width / VW, list = $(s, '.tour-list');
      let wi, wr, st, held = false, clock = 0, speed = 1, paused = false;
      const reset = () => { wi = world(ALL, TOUR_SEED); wi.m.x = -40; wi.m.inv = 1e9; wr = world(ALL, TOUR_SEED); st = {}; };
      reset();
      const RUN = runBot(ALL, TOUR_SEED, BOTS[TOUR_BOT]).over.t, DUR = INTRO + RUN + 2.5;
      function seekTo(t) {
        if (t < clock - 1e-6) reset();
        const ti = Math.min(t, INTRO), tr = Math.max(0, t - INTRO);
        while (wi.t + DT <= ti + 1e-9) { step(wi, {}); wi.over = null; wi.m.x = -40; }
        while (wr.t + DT <= tr + 1e-9 && !wr.over) step(wr, BOTS[TOUR_BOT].ctl(wr, st));
        clock = t;
      }
      function draw() {
        const t = clock, intro = t < INTRO, w = intro ? wi : wr, cur = intro ? Math.min(CALLS.length - 1, t / CALL | 0) : -1;
        render(g, w, { S, heat: cur === 1 });
        if (intro) {
          const cl = CALLS[cur], a = Math.min(1, (t - cur * CALL) / .3);
          if (cl.k === 'plant') { ring(g, 28 * S, 96 * S, 40 * S, 64 * S, '#ffb951', a); tag(g, cl.text, 26 * S, 84 * S, { a, align: 'left', edge: '#ffb951' }); }
          if (cl.k === 'bros') { w.bros.forEach(b => b.alive && ring(g, (b.x - 11) * S, (b.y - 28) * S, 22 * S, 30 * S, '#ff6b4a', a)); tag(g, cl.text, 160 * S, 12 * S, { a, edge: '#ff6b4a' }); }
          if (cl.k === 'bricks') { ring(g, 77 * S, 29 * S, 134 * S, 22 * S, '#8fd3ff', a); ring(g, 77 * S, 93 * S, 134 * S, 22 * S, '#8fd3ff', a); tag(g, cl.text, 144 * S, 72 * S, { a, edge: '#8fd3ff' }); }
          if (cl.k === 'exit') { ring(g, 222 * S, 108 * S, 52 * S, 70 * S, '#5fe0a0', a); tag(g, cl.text, 312 * S, 92 * S, { a, align: 'right', edge: '#5fe0a0' }); }
        } else {
          tag(g, 'Played: read the throws', 8 * S, 10 * S, { align: 'left', size: 18 });
          if (w.over) tag(g, OUTCOME[w.over.k], 160 * S, 124 * S, { size: 26, bg: '#ffb951', col: '#152044' });
        }
        $$(list, 'li').forEach((li, i) => li.classList.toggle('on', intro ? i === cur : true));
        say(out, intro ? SIDE[cur] : w.over ? 'Through: wait out the plant, perch on the pipe, cross between volleys, then make the one committed jump.' :
          w.m.x > 205 ? 'Past the hammers, now the exit: one high jump over the pit onto the column.' : RUNTXT[st.phase] || RUNTXT.approach);
      }
      s._api = { seek(t) { held = true; seekTo(t); draw(); }, dur: () => DUR };
      $(s, '.tour-replay').onclick = () => { held = false; paused = false; reset(); clock = 0; };
      $(s, '.tour-pause').onclick = e => { paused = !paused; e.target.textContent = paused ? '▶ Play' : '❚❚ Pause'; };
      $(s, '.tour-slow').onclick = e => { speed = speed === 1 ? .5 : 1; e.target.classList.toggle('on', speed < 1); };
      s._draw = dt => { if (!held && !paused) { const t = clock + dt * speed; if (t > DUR) { reset(); clock = 0; } else seekTo(t); } draw(); };
    },
    enter(s) { s._stop = raf(s._draw); }, leave(s) { s._stop?.(); },
  });

  /* ---------- slide 3: take it apart ---------- */
  const LAB = { on: { ...ALL }, mode: 'bot', bot: 1, seed: 1, heat: false };
  window.__hbPreset = id => { LAB.on = { ...PRESETS[id].on }; LAB.refresh?.(); };
  const BOT_COL = ['#ffb951', '#8fd3ff', '#5fe0a0'];
  function asks(on) {
    // what the current combination asks of the player, piece by piece
    const L = [];
    const bros = (on.bro1 ? 1 : 0) + (on.bro2 ? 1 : 0);
    if (bros) L.push(on.bricks ? `<b>${bros === 2 ? 'Two Hammer Bros' : 'A Hammer Bro'} up on the bricks</b>: hammers arc over the ground lane from above, so crossing is about <i>when</i>.` : `<b>${bros === 2 ? 'Two Hammer Bros' : 'A Hammer Bro'} on the ground</b>: they stand in the lane itself, so you have to jump them or stomp them, and their hammers fly flatter and shorter.`);
    else L.push('<b>No Hammer Bros</b>: nothing pushes you on a clock; the terrain is a puzzle you can take at your own pace.');
    if (on.plant) L.push(`<b>Piranha Plant</b>: the pipe${on.bricks ? ' (the step up to the bricks)' : ''} opens on its timer, not yours; once you stand on it, it’s the one perch the plant can’t touch.`);
    if (on.bricks) L.push(`<b>Bricks</b>: ${bros ? 'height for the Hammer Bros, a ceiling over your jumps, and a weapon: bump the brick under one to knock it out.' : 'a second route with no one on it.'}`);
    if (on.pit || on.col) L.push(`<b>${on.pit && on.col ? 'Pit and column' : on.pit ? 'Pit' : 'Column'}</b>: the exit is ${on.pit ? 'a jump you can’t take while dodging' : 'a high jump at a fixed spot'}${bros ? ', so you clear the hammers first or time the jump between throws' : ''}.`);
    else if (bros) L.push('<b>No exit jump</b>: once you are past the Hammer Bros you are out; outrunning them is a complete answer.');
    return L;
  }
  demo('hb-lab', {
    init(s) {
      const c = $(s, 'canvas'), g = c.getContext('2d'), S = c.width / VW;
      const tg = $(s, '.lab-toggles'), pr = $(s, '.lab-presets'), bt = $(s, '.lab-bots'), tb = $(s, '.lab-stats'), rd = $(s, '.lab-asks'), msg = $(s, '.lab-msg');
      tg.innerHTML = PIECES.map(p => `<button class="pc" data-id="${p.id}">${p.img ? `<img src="img/smb-${p.img}.png" alt="">` : '<span class="pit-ic"></span>'}<span>${p.name}</span></button>`).join('');
      pr.innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button class="btn sm" data-p="${k}">${p.name}</button>`).join('');
      bt.innerHTML = BOTS.map((b, i) => `<button class="btn sm" data-b="${i}"><i style="background:${BOT_COL[i]}"></i>${b.name}</button>`).join('') + '<button class="btn sm" data-b="play">🎮 Play it</button>';
      let w, st, ghosts = [], keys = {}, shown = null;
      const keyOf = () => PIECES.map(p => LAB.on[p.id] ? 1 : 0).join('');
      function restart() {
        w = world(LAB.on, LAB.mode === 'play' ? 1 + (Math.random() * 999 | 0) : LAB.seed); st = {};
        ghosts = LAB.mode === 'bot' ? [] : [];
      }
      function table() {
        const R = stats(LAB.on);
        tb.innerHTML = `<tr><th></th><th title="through as Super Mario">clean</th><th title="through, shrunk to small Mario">shrank</th><th title="hit while small">died</th><th>fell</th><th>stuck</th></tr>` + R.map((r, i) =>
          `<tr data-b="${i}" class="${LAB.mode === 'bot' && LAB.bot === i ? 'cur' : ''}"><th><i style="background:${BOT_COL[i]}"></i>${BOTS[i].name}</th>${['clean', 'hit', 'dead', 'fell', 'time'].map(k => `<td class="${k}"><span class="bar" style="--v:${r[k] / TRIALS}"></span><b>${r[k]}</b></td>`).join('')}</tr>`).join('');
        $$(tb, 'tr[data-b]').forEach(tr => tr.onclick = () => { LAB.mode = 'bot'; LAB.bot = +tr.dataset.b; LAB.seed = 1; refresh(); });
      }
      function refresh() {
        $$(tg, '.pc').forEach(b => b.classList.toggle('on', !!LAB.on[b.dataset.id]));
        const k = keyOf();
        $$(pr, '[data-p]').forEach(b => b.classList.toggle('on', PIECES.map(p => PRESETS[b.dataset.p].on[p.id] ? 1 : 0).join('') === k));
        $$(bt, '[data-b]').forEach(b => b.classList.toggle('on', LAB.mode === 'play' ? b.dataset.b === 'play' : +b.dataset.b === LAB.bot && b.dataset.b !== 'play'));
        $(s, '.lab-heat').classList.toggle('on', LAB.heat);
        restart(); table();
        rd.innerHTML = asks(LAB.on).map(x => `<li>${x}</li>`).join('');
        say(msg, LAB.mode === 'play' ? 'Playing: <b>A / D</b> or <b>← →</b> to move, <b>W</b>, <b>K</b> or <b>↑</b> to jump (hold for height). <b>Esc</b> stops.' : `Watching <b>${BOTS[LAB.bot].name}</b>, run ${LAB.seed} of ${TRIALS}: ${BOTS[LAB.bot].blurb}`);
      }
      LAB.refresh = refresh;
      tg.onclick = e => { const b = e.target.closest('.pc'); if (!b) return; LAB.on[b.dataset.id] = LAB.on[b.dataset.id] ? 0 : 1; refresh(); };
      pr.onclick = e => { const b = e.target.closest('[data-p]'); if (b) { LAB.on = { ...PRESETS[b.dataset.p].on }; refresh(); } };
      bt.onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; if (b.dataset.b === 'play') { LAB.mode = 'play'; c.focus(); } else { LAB.mode = 'bot'; LAB.bot = +b.dataset.b; LAB.seed = 1; } refresh(); };
      $(s, '.lab-heat').onclick = () => { LAB.heat = !LAB.heat; $(s, '.lab-heat').classList.toggle('on', LAB.heat); };
      $(s, '.lab-next').onclick = () => { LAB.seed = LAB.seed % TRIALS + 1; if (LAB.mode === 'play') LAB.mode = 'bot'; refresh(); };
      $(s, '.lab-all').onclick = () => { ghosts = BOTS.map((b, i) => ({ col: BOT_COL[i], trail: runBot(LAB.on, LAB.seed, b).trail })); shown = performance.now(); };
      // keys: only while playing on this slide; swallow the deck's arrow / space navigation
      const KM = { a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r', w: 'j', k: 'j', arrowup: 'j', ' ': 'j' };
      const onKey = down => e => {
        if (LAB.mode !== 'play' || !s._on) return;
        const k = e.key.toLowerCase();
        if (k === 'escape' && down) { LAB.mode = 'bot'; refresh(); return; }
        if (!KM[k]) return;
        e.preventDefault(); e.stopImmediatePropagation(); keys[KM[k]] = down;
      };
      addEventListener('keydown', onKey(true), true); addEventListener('keyup', onKey(false), true);
      s._draw = dt => {
        if (!w) return;
        let n = Math.round(Math.min(.05, dt) * FPS) || 1;
        while (n-- > 0) {
          if (LAB.mode === 'play') {
            step(w, keys);
            // a lost life (hit while small, or the pit): start again as Super Mario
            const lost = w.ev.find(e => e.k === 'fell' || e.k === 'dead');
            if (lost && w.t - lost.t > (lost.k === 'dead' ? 1.8 : .8)) { const lives = (w.lives || 0) + 1; w = world(LAB.on, 1 + (Math.random() * 999 | 0)); w.lives = lives; }
          } else if (!w.over) step(w, BOTS[LAB.bot].ctl(w, st));
          else if (w.t - w.over.t > 2) { LAB.seed = LAB.seed % TRIALS + 1; restart(); say(msg, `Watching <b>${BOTS[LAB.bot].name}</b>, run ${LAB.seed} of ${TRIALS}: ${BOTS[LAB.bot].blurb}`); }
          else w.t += DT;
        }
        render(g, w, { S, heat: LAB.heat, ghost: ghosts.length && performance.now() - shown < 8000 ? ghosts : null });
        if (ghosts.length && performance.now() - shown < 8000) BOTS.forEach((b, i) => tag(g, b.name, 12, 22 + i * 38, { align: 'left', size: 16, edge: BOT_COL[i] }));
        const m = w.m;
        tag(g, LAB.mode === 'play' ? `${m.big ? 'Super Mario' : 'small Mario'} · lives lost ${w.lives || 0}` : `${BOTS[LAB.bot].name} · run ${LAB.seed}`, c.width - 12, 22, { align: 'right', size: 16 });
        if (w.over && (LAB.mode !== 'play' || w.over.k === 'clean' || w.over.k === 'hit')) tag(g, OUTCOME[w.over.k], c.width / 2, c.height / 2 - 40, { size: 24, bg: '#ffb951', col: '#152044' });
      };
      refresh();
    },
    enter(s) { s._on = true; s._stop = raf(s._draw); }, leave(s) { s._on = false; s._stop?.(); if (LAB.mode === 'play') { LAB.mode = 'bot'; LAB.refresh?.(); } },
  });

  /* ---------- slide 4: what the 20-run tables show when one piece comes out ---------- */
  demo('hb-why', {
    init(s) {
      const base = stats(ALL), without = id => stats({ ...ALL, [id]: 0 });
      const c = (r, i) => r[i].dead + r[i].fell;   // lives lost
      const noBros = stats({ ...ALL, bro1: 0, bro2: 0 }), noPlant = without('plant'), noBricks = without('bricks');
      const nums = (b) => BOTS.map((x, i) => `${x.name} ${c(base, i)} → <b>${c(b, i)}</b>`).join('<br>');
      const cell = (h, b, txt) => `<div><h4>${h}</h4><p class="n">${nums(b)}</p><p>${txt}</p></div>`;
      $(s, '.proof').innerHTML = `<h4 class="proof-h">Remove one piece: lives lost out of ${TRIALS} runs per route, before → after (Mario starts as Super Mario)</h4><div class="proof-row">` +
        cell('No Hammer Bros', noBros, 'Nothing runs a clock. A blind run can still shrink on the plant, but no route loses a life.') +
        cell('No Piranha Plant', noPlant, 'The way in stops asking you to wait, so running for it no longer costs a life.') +
        cell('No bricks', noBricks, 'The Hammer Bros drop into the lane: no high ground for them, no second route or bump for you. A blind run loses the life every time.') + '</div>';
    },
  });

  /* ---------- slide 5: two more encounters, previewed ---------- */
  demo('hb-more', {
    init(s) {
      const cs = $$(s, 'canvas.more-c');
      s._draw = (dt, tt) => cs.forEach(c => {
        const g = c.getContext('2d'), id = c.dataset.p;
        if (!c._w || c._w.over || c._w.t > 14) { c._w = world(PRESETS[id].on, 3); c._s = {}; }
        let n = Math.round(Math.min(.05, dt) * FPS) || 1; while (n-- > 0) step(c._w, BOTS[+c.dataset.b].ctl(c._w, c._s));
        render(g, c._w, { S: c.width / VW, heat: true });
      });
      $$(s, '.more-stats').forEach(el => { const r = stats(PRESETS[el.dataset.p].on); el.innerHTML = BOTS.map((b, i) => `<span><i style="background:${BOT_COL[i]}"></i>${b.name}: <b>${r[i].clean}</b> clean, <b>${r[i].dead + r[i].fell}</b> lives lost</span>`).join(''); });
      $$(s, '[data-load]').forEach(b => b.onclick = () => { window.__hbPreset(b.dataset.load); FPF.go(2); });
    },
    enter(s) { s._stop = raf(s._draw); }, leave(s) { s._stop?.(); },
  });

  window.__seek = (t) => document.querySelector('.slide[data-demo="hb-tour"]')._api.seek(t);
  window.__dur = () => document.querySelector('.slide[data-demo="hb-tour"]')._api.dur();
  window.__hb = { world, step, BOTS, stats, runBot, ALL, PRESETS };
})();
