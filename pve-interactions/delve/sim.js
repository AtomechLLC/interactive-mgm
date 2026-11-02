/* The fight engine for the Unavoidable Calamity delve. One hero against a pull, in a fixed-step simulation:
   newFight() builds a fight from a list of enemy kinds, step() advances it by dt with the player's input, and bot()
   is the demo player. The bot plays either the board's solution for the pull (kill order, which casts to interrupt or
   stun, dispel, dodge, Void Collector) or "just DPS them down" (hit the nearest thing, ignore every mechanic), so the
   page can show why the team wrote a solution for each pull. Enemy behaviour comes from ENEMIES in data.js.
   Runs in the browser (window.DELVE_SIM) and in node (tools/delve-check.js). */
(function (root) {
  const D = root.DELVE_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);
  const E = D.ENEMIES;
  const TAU = Math.PI * 2;
  const W = 880, H = 704;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- the hero: a Warrior (melee) or a Mage (ranged), with the same six buttons ---------- */
  const KIT = {
    melee: { name: 'Warrior', icon: 'classicon_warrior', range: 30, dps: 125, speed: 175, hp: 3000,
      keys: { 1: ['Pummel', 'ability_kick'], 2: ['Purge and cleanse', 'spell_holy_dispelmagic'], 3: ['Storm Bolt', 'ability_rogue_kidneyshot'], 4: ['Whirlwind', 'ability_whirlwind'], 5: ['Shield Wall', 'ability_warrior_shieldwall'], 6: ['Healing Potion', 'inv_drink_05'] },
      aoe: { rad: 120, dmg: 210, around: 'hero' } },
    ranged: { name: 'Mage', icon: 'classicon_mage', range: 330, dps: 120, speed: 165, hp: 2700,
      keys: { 1: ['Counterspell', 'spell_frost_frostbolt02'], 2: ['Remove Curse and Spellsteal', 'spell_holy_dispelmagic'], 3: ['Ring of Frost', 'spell_frost_frostshock'], 4: ['Blizzard', 'spell_nature_unrelentingstorm'], 5: ['Ice Block', 'ability_mage_shattershield'], 6: ['Healing Potion', 'inv_drink_05'] },
      aoe: { rad: 120, dmg: 210, around: 'target' } },
  };
  // the buttons: what each does is the same for both classes; only names, ranges and the AOE centre change
  const BTN = {
    1: { k: 'interrupt', cd: 10 },
    2: { k: 'dispel', cd: 7 },
    3: { k: 'stun', cd: 18, dur: 3 },
    4: { k: 'aoe', cd: 7 },
    5: { k: 'defensive', cd: 35, dur: 6, dr: 0.55 },
    6: { k: 'potion', cd: 45, heal: 0.35 },
    E: { k: 'collector', cd: 14, dur: 4, rad: 170 },
  };
  const HERO_R = 14;

  /* ---------- building a fight ----------
     spec: { kinds: [...], joiners: [...] (patrols that walked into the pull), barrels: [[x, y]...], boss, heroHp } */
  function newFight(spec, role = 'melee', seed = 1) {
    const kit = KIT[role];
    const S = { t: 0, W, H, role, kit, rnd: rng(seed), foes: [], pools: [], tele: [], fx: [], log: [], over: null, nextId: 1,
      hero: { x: 150, y: H / 2, r: HERO_R, hp: Math.min(spec.heroHp ?? kit.hp, kit.hp), max: kit.hp, tgt: null, cds: {}, debuffs: [], dr: 0, drT: 0, hexT: 0, kb: null, collectT: 0, moving: false, face: 0, swingT: 0 },
      stats: { taken: 0, by: {}, ints: 0, intMiss: 0, dispels: 0, stuns: 0, collected: 0, barrels: 0, kills: 0, poolDmg: 0, missed: {} },
      boss: null, spec };
    const melee = [], ranged = [];
    spec.kinds.forEach(k => (E[k].range === 'ranged' ? ranged : melee).push(k));
    const col = (list, x) => list.forEach((k, i) => addFoe(S, k, x + (i % 2) * 34, H / 2 + (i - (list.length - 1) / 2) * 78));
    if (spec.boss) {
      const b = addFoe(S, 'construct', 560, H / 2);
      S.boss = { next: 1 - E.construct.phases.every, enhanceT: null, barrels: spec.barrels || [] };
      b.cds.barrage = E.construct.ab[2].first; b.cds.siphon = E.construct.ab[1].first;
    } else {
      col(melee, 520); col(ranged, 680);
    }
    (spec.barrels && !spec.boss ? spec.barrels : []).forEach(([x, y]) => addFoe(S, 'barrel', x, y));
    (spec.joiners || []).forEach((k, i) => { const f = addFoe(S, k, 700, i % 2 ? H - 60 : 60); f.joinT = 2.5 + i * 0.6; f.joiner = true; });
    return S;
  }

  function addFoe(S, kind, x, y) {
    const d = E[kind];
    const f = { id: S.nextId++, kind, name: d.short || d.name, x, y, r: d.r, hp: d.hp, max: d.hp, cds: {}, cast: null, stun: 0, shield: 0, shieldT: 0,
      buffs: {}, born: S.t, face: Math.PI, swingT: 0, alive: true, object: !!d.object, stealth: kind === 'fox', revealT: 0, enraged: false, active: !d.object, slowAtk: 0, dmgUp: 0 };
    d.ab.forEach(a => { if (a.cd) f.cds[a.id] = a.first ?? a.cd; });
    if (kind === 'fox') f.x = Math.max(f.x, 640);
    S.foes.push(f);
    return f;
  }

  const ab = (f, id) => E[f.kind].ab.find(a => a.id === id);
  const live = S => S.foes.filter(f => f.alive);
  const say = (S, txt, col = '#fff', x = S.hero.x, y = S.hero.y - 30) => S.fx.push({ k: 'txt', txt, col, x, y, t: 0, life: 1.4 });

  /* ---------- damage ---------- */
  function hurtHero(S, amt, src, what) {
    const h = S.hero;
    if (S.over) return;
    const vuln = h.debuffs.filter(d => d.k === 'vuln').reduce((a, d) => a + d.stacks * d.per, 0);
    let dmg = amt * (1 + vuln) * (h.drT > 0 ? 1 - h.dr : 1);
    h.hp -= dmg;
    S.stats.taken += dmg;
    const key = what || src;
    S.stats.by[key] = (S.stats.by[key] || 0) + dmg;
    if (h.hp <= 0) { h.hp = 0; S.over = 'wipe'; S.log.push([S.t, 'You died']); }
  }
  function hurtFoe(S, f, amt, how) {
    if (!f.alive || f.joinT > 0) return;
    if (f.kind === 'barrel' && !f.active) { f.active = true; f.cds.lob = 0.6; S.log.push([S.t, 'A barrel wakes up']); }
    let dmg = amt;
    if (f.revealT > 0) dmg *= 0.6;                               // One with the Dark
    if (f.buffs.siphon) dmg *= 1 - f.buffs.siphon.dr;
    if (f.shield > 0) { const a = Math.min(f.shield, dmg); f.shield -= a; dmg -= a; }
    f.hp -= dmg;
    if (f.kind === 'fox' && f.stealth) { f.stealth = false; }
    if (f.hp <= 0) kill(S, f);
  }
  function kill(S, f) {
    f.alive = false; f.hp = 0; f.cast = null;
    S.stats.kills++;
    if (S.hero.tgt === f.id) S.hero.tgt = null;
    if (f.kind === 'barrel') {
      S.stats.barrels++;
      S.log.push([S.t, 'Barrel destroyed: 3 slimes']);
      for (let i = 0; i < 3; i++) { const s = addFoe(S, 'slime', f.x + Math.cos(i * 2.1) * 30, f.y + Math.sin(i * 2.1) * 30); s.cds = {}; }
    }
    if (live(S).filter(x => !x.object).length === 0 && live(S).every(x => x.kind !== 'barrel')) { S.over = 'win'; S.log.push([S.t, 'Pull cleared']); }
  }

  /* ---------- the hero's buttons ---------- */
  function press(S, key, flags = {}) {
    const h = S.hero, b = BTN[key], kit = S.kit;
    if (!b || S.over) return false;
    if ((h.cds[key] || 0) > 0) return false;
    if (h.hexT > 0 && b.k !== 'dispel') return false;            // hexed: only your dispel works
    const tgt = S.foes.find(f => f.id === h.tgt && f.alive);
    const inRange = f => f && dist(h, f) <= (S.role === 'melee' ? kit.range + f.r + h.r + 4 : kit.range);
    switch (b.k) {
      case 'interrupt': {
        // the target if it is casting, otherwise any interruptible caster in range (the bot passes which one)
        const f = flags.foe ? S.foes.find(x => x.id === flags.foe) : (tgt && tgt.cast ? tgt : live(S).find(x => x.cast && inRange(x)));
        if (!f || !inRange(f)) return false;
        h.cds[key] = b.cd;
        if (f.cast && f.cast.ab.int) {
          S.stats.ints++; say(S, 'Interrupted ' + f.cast.ab.name, '#8fd3ff', f.x, f.y - 30);
          S.log.push([S.t, 'Interrupted ' + f.cast.ab.name]);
          f.cds[f.cast.ab.id] = Math.max(f.cds[f.cast.ab.id] || 0, 4); f.cast = null;
        } else { S.stats.intMiss++; say(S, 'Wasted', '#aaa', f.x, f.y - 30); }
        return true;
      }
      case 'dispel': {
        const mine = h.debuffs.filter(d => d.disp);
        if (mine.length) {
          const d = flags.which ? mine.find(x => x.k === flags.which) || mine[0] : mine.sort((a, b) => (b.k === 'hex') - (a.k === 'hex'))[0];
          h.debuffs = h.debuffs.filter(x => x !== d); if (d.k === 'hex') h.hexT = 0;
          h.cds[key] = b.cd; S.stats.dispels++; say(S, 'Dispelled ' + d.name, '#ffe08a'); S.log.push([S.t, 'Dispelled ' + d.name]); return true;
        }
        const f = flags.foe ? S.foes.find(x => x.id === flags.foe) : tgt;
        if (f && f.alive && f.shield > 0 && dist(h, f) <= 360) {
          f.shield = 0; f.shieldT = 0; h.cds[key] = b.cd; S.stats.dispels++; say(S, 'Shield stripped', '#ffe08a', f.x, f.y - 30); S.log.push([S.t, 'Dispelled Dark Water Armor']); return true;
        }
        return false;
      }
      case 'stun': {
        const f = flags.foe ? S.foes.find(x => x.id === flags.foe) : tgt;
        if (!f || !f.alive || dist(h, f) > Math.max(kit.range, 260)) return false;
        h.cds[key] = b.cd;
        if (f.enraged || E[f.kind].boss || E[f.kind].object) { say(S, 'Immune', '#ff9a9a', f.x, f.y - 30); S.stats.intMiss++; return true; }
        f.stun = b.dur; if (f.cast) { S.log.push([S.t, 'Stunned through ' + f.cast.ab.name]); f.cds[f.cast.ab.id] = Math.max(f.cds[f.cast.ab.id] || 0, 3); f.cast = null; }
        S.stats.stuns++; say(S, 'Stunned', '#c9b6ff', f.x, f.y - 30);
        return true;
      }
      case 'aoe': {
        const c = kit.aoe.around === 'hero' ? h : tgt;
        if (!c) return false;
        if (kit.aoe.around === 'target' && dist(h, c) > kit.range) return false;
        h.cds[key] = b.cd;
        S.fx.push({ k: 'ring', x: c.x, y: c.y, r: kit.aoe.rad, t: 0, life: 0.5, col: S.role === 'melee' ? '#ffd27a' : '#9fdcff' });
        live(S).forEach(f => { if (dist(c, f) <= kit.aoe.rad + f.r) hurtFoe(S, f, kit.aoe.dmg, 'aoe'); });
        return true;
      }
      case 'defensive': h.cds[key] = b.cd; h.drT = b.dur; h.dr = b.dr; say(S, kit.keys[5][0], '#9fe7ff'); return true;
      case 'potion': h.cds[key] = b.cd; h.hp = Math.min(h.max, h.hp + h.max * b.heal); say(S, '+' + Math.round(h.max * b.heal), '#7dffa0'); return true;
      case 'collector': h.cds[key] = b.cd; h.collectT = b.dur; say(S, 'Void Collector', '#c69bff'); return true;
    }
    return false;
  }

  /* ---------- one step ----------
     input: { move: {x, y} unit vector or null, target: foe id, press: [keys] } */
  function step(S, dt, input = {}) {
    if (S.over) { S.fx.forEach(f => f.t += dt); S.fx = S.fx.filter(f => f.t < f.life); return; }
    S.t += dt;
    const h = S.hero, kit = S.kit;
    for (const k in h.cds) h.cds[k] = Math.max(0, h.cds[k] - dt);
    h.drT = Math.max(0, h.drT - dt); h.hexT = Math.max(0, h.hexT - dt); h.collectT = Math.max(0, h.collectT - dt);
    if (input.target != null && S.foes.some(f => f.id === input.target && f.alive && !f.stealth && !(f.joinT > 0))) h.tgt = input.target;
    (input.press || []).forEach(k => press(S, k, input.flags?.[k] || {}));

    // debuffs: dots, slow, vulnerability, hex
    let slow = 0;
    h.debuffs.forEach(d => {
      d.t -= dt;
      if (d.dps) hurtHero(S, d.dps * dt, d.src, d.name);
      if (d.k === 'slow') slow = Math.max(slow, d.amt);
    });
    h.debuffs = h.debuffs.filter(d => d.t > 0);
    if (!h.debuffs.some(d => d.k === 'hex')) h.hexT = 0;

    // movement (knockback and tongue pulls override)
    h.moving = false;
    if (h.kb) {
      const k = Math.min(1, dt / h.kb.t); h.x += (h.kb.x - h.x) * k * 2.2; h.y += (h.kb.y - h.y) * k * 2.2; h.kb.t -= dt;
      if (h.kb.t <= 0 || dist(h, h.kb) < 4) h.kb = null; h.moving = true;
    } else if (input.move && h.hexT <= 0) {
      const m = Math.hypot(input.move.x, input.move.y);
      if (m > 0.01) {
        let sp = kit.speed * (1 - slow) * (S.pools.some(p => dist(p, h) < p.r) ? 0.55 : 1) * (h.hexT > 0 ? 0 : 1);
        h.x += input.move.x / m * sp * dt; h.y += input.move.y / m * sp * dt; h.moving = true; h.face = Math.atan2(input.move.y, input.move.x);
      }
    }
    h.x = clamp(h.x, 20, W - 20); h.y = clamp(h.y, 20, H - 20);

    // the hero's auto attack: melee swings when in reach, the Mage casts only while standing still
    const tgt = S.foes.find(f => f.id === h.tgt && f.alive);
    if (tgt && h.hexT <= 0 && !(tgt.joinT > 0)) {
      const reach = S.role === 'melee' ? dist(h, tgt) <= kit.range + tgt.r + h.r + 4 : dist(h, tgt) <= kit.range && !h.moving;
      if (reach) { hurtFoe(S, tgt, kit.dps * dt, 'auto'); h.face = Math.atan2(tgt.y - h.y, tgt.x - h.x); h.swingT += dt; }
    }

    // Void Collector: pulls pools within reach into the hero
    if (h.collectT > 0) S.pools.forEach(p => { const d = dist(p, h); if (d < BTN.E.rad + p.r) { p.r -= 60 * dt; p.x += (h.x - p.x) * dt * 2; p.y += (h.y - p.y) * dt * 2; if (p.r <= 6 && !p.gone) { p.gone = true; S.stats.collected++; } } });
    S.pools = S.pools.filter(p => !p.gone && (p.life -= dt) > 0);
    S.pools.forEach(p => { if (dist(p, h) < p.r + 4) { hurtHero(S, 34 * dt, 'pool', 'Corrupted Wine Pool'); S.stats.poolDmg += 34 * dt; } });

    // telegraphs resolve
    S.tele.forEach(tl => { tl.t -= dt; if (tl.t <= 0 && !tl.done) { tl.done = true; tl.hit(S); } });
    S.tele = S.tele.filter(tl => !tl.done);

    // enemies
    live(S).forEach(f => foeStep(S, f, dt));
    separate(S);
    if (S.boss) bossStep(S, dt);

    S.fx.forEach(f => f.t += dt); S.fx = S.fx.filter(f => f.t < f.life);
  }

  function separate(S) {
    const L = live(S).filter(f => !(f.joinT > 0));
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], d = dist(a, b), m = a.r + b.r + 2;
      if (d > 0 && d < m) { const k = (m - d) / d / 2; if (!E[a.kind].object) { a.x -= (b.x - a.x) * k; a.y -= (b.y - a.y) * k; } if (!E[b.kind].object) { b.x += (b.x - a.x) * k; b.y += (b.y - a.y) * k; } }
    }
  }

  function foeStep(S, f, dt) {
    const d = E[f.kind], h = S.hero;
    if (f.joinT > 0) { f.joinT -= dt; if (f.joinT <= 0) S.log.push([S.t, d.name + ' walks into the fight']); else return; }
    for (const k in f.cds) f.cds[k] = Math.max(0, f.cds[k] - dt);
    f.revealT = Math.max(0, f.revealT - dt);
    if (f.shieldT > 0) { f.shieldT -= dt; if (f.shieldT <= 0) f.shield = 0; }
    for (const k in f.buffs) { f.buffs[k].t -= dt; if (f.buffs[k].t <= 0) delete f.buffs[k]; }
    if (d.object) return objectStep(S, f, dt);
    if (f.stun > 0) { f.stun -= dt; return; }

    // low-health triggers
    if (f.kind === 'gnoll' && !f.enraged && f.hp < f.max * 0.3) { f.enraged = true; f.stun = 0; say(S, 'ENRAGED: immune to crowd control', '#ff6a6a', f.x, f.y - 40); S.log.push([S.t, 'The Gnoll enrages']); }
    if (f.kind === 'slime' && !f.burst && f.hp < f.max * ab(f, 'burst').at) { f.burst = true; startCast(S, f, ab(f, 'burst')); }

    if (f.cast) return castStep(S, f, dt);

    // pick an ability
    const facing = Math.atan2(h.y - f.y, h.x - f.x);
    for (const a of d.ab) {
      if (!a.cd || f.cds[a.id] > 0) continue;
      if (a.kind === 'pull' && dist(f, h) < a.min) continue;
      if (a.kind === 'splash' && dist(f, h) > a.near) continue;
      if (a.kind === 'heal' && !live(S).some(o => !E[o.kind].object && o.hp < o.max * 0.85 && dist(o, f) < a.rad)) continue;
      if (a.kind === 'shield' && !live(S).some(o => !E[o.kind].object && o.shield <= 0 && dist(o, f) < 400)) continue;
      if (a.kind === 'cone' && dist(f, h) > a.len * 0.9) continue;
      if (a.kind === 'ambush' && f.cds[a.id] > 0) continue;
      if (a.kind === 'selfbuff' && dist(f, h) > 80) continue;
      if (a.kind === 'siphon' && !live(S).some(o => o.kind === 'slime' && S.t - o.born > a.wait)) continue;
      if (a.kind === 'lick' && dist(f, h) > f.r + h.r + 30) continue;
      startCast(S, f, a, facing);
      return;
    }

    // move toward the hero, to melee reach or casting range
    const want = d.range === 'ranged' ? 300 : f.r + h.r + 6;
    const dd = dist(f, h);
    f.face = facing;
    if (dd > want) {
      const sp = d.speed * dt;
      f.x += (h.x - f.x) / dd * Math.min(sp, dd - want); f.y += (h.y - f.y) / dd * Math.min(sp, dd - want);
    } else if (d.range === 'melee') {
      // auto attacks
      let rate = d.swing ? 1 / d.swing : 1;
      if (f.buffs.wrath) rate *= ab(f, 'wrath').haste;
      const mult = (f.enraged ? 1 + ab(f, 'enrage').more : 1) * (f.buffs.enhance ? 2 : 1);
      if (d.swing) {
        f.swingT += dt * rate;
        if (f.swingT >= 1) {
          f.swingT -= 1; hurtHero(S, d.hit * mult, f.kind, d.name);
          const c = ab(f, 'claws'); if (c) addVuln(S, c);
        }
      } else hurtHero(S, d.dps * dt * mult, f.kind, d.name + ' (melee)');
    }
  }

  function addVuln(S, c) {
    const h = S.hero; let v = h.debuffs.find(x => x.k === 'vuln');
    if (!v) { v = { k: 'vuln', name: 'Corrupted Claws', icon: c.icon, disp: true, stacks: 0, per: c.vuln, t: c.dur, max: c.max }; h.debuffs.push(v); }
    v.stacks = Math.min(c.max, v.stacks + 1); v.t = c.dur;
  }

  function startCast(S, f, a, facing = Math.atan2(S.hero.y - f.y, S.hero.x - f.x)) {
    const h = S.hero;
    f.cds[a.id] = a.cd || 999;
    if (!a.cast) return resolve(S, f, a, {});                     // instant
    const c = { ab: a, t: 0, dur: a.cast, chan: a.chan || 0, tick: 0, dir: facing, spot: { x: h.x, y: h.y } };
    if (a.kind === 'leap') S.tele.push({ k: 'circle', x: h.x, y: h.y, r: a.rad, t: a.cast, max: a.cast, col: '#ff5a5a', src: f.id, hit: Sx => { if (!f.alive || f.stun > 0) return; f.x = c.spot.x; f.y = c.spot.y; if (dist(Sx.hero, c.spot) < a.rad + Sx.hero.r * 0.5) hurtHero(Sx, a.dmg, f.kind, a.name); } });
    f.cast = c;
  }

  function castStep(S, f, dt) {
    const c = f.cast, a = c.ab, h = S.hero;
    c.t += dt;
    if (a.kind === 'cone' && c.t < c.dur) c.dir = Math.atan2(h.y - f.y, h.x - f.x);   // aims during the wind-up, locks for the channel
    if (c.t < c.dur) { if (a.kind === 'leap' && f.stun > 0) f.cast = null; return; }
    if (!c.started) { c.started = true; if (!c.chan) { f.cast = null; return resolve(S, f, a, c); } }
    // channel ticks
    c.tick -= dt;
    if (c.tick <= 0) { c.tick += a.tick || 0.5; channelTick(S, f, a, c); }
    if (c.t >= c.dur + c.chan) { f.cast = null; if (a.kind === 'siphon') resolve(S, f, a, c); }
  }

  function channelTick(S, f, a, c) {
    const h = S.hero;
    switch (a.kind) {
      case 'cone': {
        const inCone = dist(f, h) < a.len + h.r && angDiff(Math.atan2(h.y - f.y, h.x - f.x), c.dir) < a.arc / 2;
        if (inCone) hurtHero(S, a.dmg * (f.enraged ? 1 + ab(f, 'enrage').more : 1), f.kind, a.name);
        if (f.kind === 'gnoll') c.side = !c.side;
        break;
      }
      case 'beam': hurtHero(S, a.dmg, f.kind, a.name); break;
      case 'heal': live(S).forEach(o => { if (!E[o.kind].object && dist(o, f) < a.rad) { o.hp = Math.min(o.max, o.hp + a.amt); } }); S.fx.push({ k: 'ring', x: f.x, y: f.y, r: a.rad, t: 0, life: 0.45, col: '#43c78a' }); break;
      case 'barrage': {
        const spot = { x: h.x, y: h.y };
        S.tele.push({ k: 'circle', x: spot.x, y: spot.y, r: a.rad, t: a.fuse, max: a.fuse, col: '#b46bff', hit: Sx => { if (dist(Sx.hero, spot) < a.rad + Sx.hero.r * 0.5) hurtHero(Sx, a.dmg, 'construct', a.name); Sx.fx.push({ k: 'ring', x: spot.x, y: spot.y, r: a.rad, t: 0, life: 0.4, col: '#b46bff' }); } });
        break;
      }
    }
  }

  function resolve(S, f, a, c) {
    const h = S.hero, d = E[f.kind];
    switch (a.kind) {
      case 'bolt': hurtHero(S, a.dmg * (f.buffs.enhance ? 2 : 1), f.kind, a.name); S.fx.push({ k: 'bolt', x: f.x, y: f.y, x2: h.x, y2: h.y, t: 0, life: 0.25, col: a.id === 'wine' ? '#c0306a' : a.id === 'pressure' ? '#7fd0ff' : '#9a5cff' }); break;
      case 'spit': hurtHero(S, a.dmg, f.kind, a.name); h.debuffs = h.debuffs.filter(x => x.k !== 'slow'); h.debuffs.push({ k: 'slow', name: 'Corrupted Spit', icon: a.icon, disp: true, amt: a.slow, t: a.dur }); S.fx.push({ k: 'bolt', x: f.x, y: f.y, x2: h.x, y2: h.y, t: 0, life: 0.25, col: '#7fe05a' }); break;
      case 'hex': h.debuffs.push({ k: 'hex', name: 'Hex', icon: a.icon, disp: true, t: a.dur }); h.hexT = a.dur; S.stats.missed.hex = (S.stats.missed.hex || 0) + 1; S.log.push([S.t, 'You were hexed']); say(S, 'Hexed!', '#7fe05a'); break;
      case 'pull': { const dd = dist(f, h), k = (f.r + h.r + 10) / dd; h.kb = { x: f.x + (h.x - f.x) * k, y: f.y + (h.y - f.y) * k, t: 0.4 }; S.stats.missed.tongue = (S.stats.missed.tongue || 0) + 1; S.log.push([S.t, 'Tongue Pull']); say(S, 'Pulled in', '#ffb0b0'); break; }
      case 'splash': { hurtHero(S, a.dmg, f.kind, a.name); const dd = Math.max(1, dist(f, h)); h.kb = { x: clamp(h.x + (h.x - f.x) / dd * a.push, 20, W - 20), y: clamp(h.y + (h.y - f.y) / dd * a.push, 20, H - 20), t: 0.35 }; say(S, 'Knocked back', '#ffb0b0'); break; }
      case 'shield': { const o = live(S).filter(x => !E[x.kind].object && x.shield <= 0 && dist(x, f) < 400).sort((p, q) => p.hp / p.max - q.hp / q.max)[0]; if (o) { o.shield = a.absorb; o.shieldT = a.dur; S.fx.push({ k: 'ring', x: o.x, y: o.y, r: o.r + 10, t: 0, life: 0.5, col: '#6a8dff' }); } break; }
      case 'selfbuff': f.buffs.wrath = { t: a.dur }; say(S, 'Predator’s Wrath', '#ff9a9a', f.x, f.y - 30); break;
      case 'lick': hurtHero(S, a.dmg, f.kind, a.name); h.debuffs.push({ k: 'dot', name: 'Poisoned Lick', icon: a.icon, disp: false, dps: a.dot, t: a.dotT, src: f.kind }); break;
      case 'bite': hurtHero(S, a.dmg * (f.enraged ? 1 + ab(f, 'enrage').more : 1), f.kind, a.name); h.debuffs.push({ k: 'dot', name: 'Vicious Void Bite', icon: a.icon, disp: false, dps: a.dot, t: a.dotT, src: f.kind }); break;
      case 'ambush': {
        const back = h.face + Math.PI;
        f.x = clamp(h.x + Math.cos(back) * (h.r + f.r + 4), 20, W - 20); f.y = clamp(h.y + Math.sin(back) * (h.r + f.r + 4), 20, H - 20);
        f.stealth = false; f.revealT = 3;
        hurtHero(S, a.dmg, f.kind, a.name); h.debuffs.push({ k: 'dot', name: 'Nether Ambush bleed', icon: a.icon, disp: false, dps: a.dot, t: a.dotT, src: f.kind });
        S.fx.push({ k: 'ring', x: f.x, y: f.y, r: 26, t: 0, life: 0.5, col: '#c69bff' });
        break;
      }
      case 'burst': {
        S.fx.push({ k: 'ring', x: f.x, y: f.y, r: a.rad, t: 0, life: 0.5, col: '#b04bd0' });
        if (dist(f, h) < a.rad + h.r) hurtHero(S, a.dmg, 'slime', a.name);
        S.pools.push({ x: f.x, y: f.y, r: 46, life: 60 });
        S.stats.missed.burst = (S.stats.missed.burst || 0) + 1;
        f.alive = false; f.hp = 0; S.stats.kills++;
        if (S.hero.tgt === f.id) S.hero.tgt = null;
        if (live(S).filter(x => !x.object).length === 0) { S.over = 'win'; }
        break;
      }
      case 'enhance': { const o = live(S).find(x => x.kind === 'slime'); if (o) { o.buffs.enhance = { t: 30 }; say(S, 'Void Enhancement', '#ff7ad9', o.x, o.y - 26); S.stats.missed.enhance = (S.stats.missed.enhance || 0) + 1; } break; }
      case 'siphon': {
        const eaten = live(S).filter(x => x.kind === 'slime' && dist(x, f) < a.rad);
        eaten.forEach(x => { x.alive = false; x.hp = 0; S.fx.push({ k: 'bolt', x: x.x, y: x.y, x2: f.x, y2: f.y, t: 0, life: 0.4, col: '#b46bff' }); });
        if (eaten.length) { f.buffs.siphon = { t: a.dur, dr: Math.min(0.7, eaten.length * a.dr + (f.buffs.siphon?.dr || 0)) }; say(S, `Siphoned ${eaten.length}: ${Math.round(f.buffs.siphon.dr * 100)}% damage resistance`, '#c69bff', f.x, f.y - 50); S.stats.missed.siphon = (S.stats.missed.siphon || 0) + eaten.length; }
        break;
      }
    }
  }

  // barrels: inert until hit, then lob wine at the hero
  function objectStep(S, f, dt) {
    if (!f.active) return;
    if (f.cds.lob > 0) return;
    const a = ab(f, 'lob'); f.cds.lob = a.cd;
    const spot = { x: S.hero.x, y: S.hero.y };
    S.tele.push({ k: 'circle', x: spot.x, y: spot.y, r: a.rad, t: a.fuse, max: a.fuse, col: '#c0306a', hit: Sx => { Sx.pools.push({ x: spot.x, y: spot.y, r: a.rad, life: 60 }); } });
  }

  // the boss: slimes every 20% of its health, then Void Enhancement a few seconds later
  function bossStep(S, dt) {
    const b = S.foes.find(f => f.kind === 'construct');
    if (!b || !b.alive) return;
    const P = E.construct.phases;
    while (b.hp <= b.max * S.boss.next && S.boss.next > 0.01) {
      S.boss.next -= P.every;
      const spots = S.boss.barrels.length ? S.boss.barrels : [[b.x, b.y]];
      for (let i = 0; i < P.adds; i++) { const [x, y] = spots[(i + Math.round(S.boss.next * 10)) % spots.length]; const s = addFoe(S, 'slime', x, y); s.cds = {}; }
      S.boss.enhanceT = P.enhanceAfter;
      S.log.push([S.t, `${Math.round((S.boss.next + P.every) * 100)}%: three slimes burst from the barrels`]);
    }
    if (S.boss.enhanceT != null) {
      S.boss.enhanceT -= dt;
      if (S.boss.enhanceT <= 0 && !b.cast && b.stun <= 0) { S.boss.enhanceT = null; if (live(S).some(x => x.kind === 'slime')) startCast(S, b, ab(b, 'enhance')); }
    }
  }

  /* ---------- the demo player ----------
     mode 'solution': the board's plan for this pull. mode 'dps': nearest target, no interrupts, no dispels, no dodging. */
  function bot(S, plan, mode, mem) {
    const h = S.hero, kit = S.kit, inp = { press: [], flags: {} };
    if (S.over) return inp;
    mem.react = mem.react || {};
    const L = live(S).filter(f => !f.stealth && !(f.joinT > 0));
    const solve = mode === 'solution';
    const p = solve ? (S.role === 'melee' && plan.melee ? { ...plan, ...plan.melee } : plan) : null;
    const range = f => (S.role === 'melee' ? kit.range + f.r + h.r + 4 : kit.range);

    // target: the plan's kill order (slimes first, barrels last) or simply the nearest
    let tgt;
    if (solve) {
      const rank = f => { if (f.kind === 'slime') return -1; if (f.kind === 'barrel') return 99; const i = p.order.indexOf(f.kind); return i < 0 ? 50 : i; };
      const ord = L.slice().sort((a, b) => rank(a) - rank(b) || a.hp - b.hp);
      tgt = ord[0];
      // stay on a nearly dead target
      const cur = L.find(f => f.id === h.tgt);
      if (cur && cur.hp < cur.max * 0.25 && cur.kind !== 'barrel') tgt = cur;
    } else tgt = L.slice().sort((a, b) => (a.kind === 'barrel') - (b.kind === 'barrel') || dist(a, h) - dist(b, h))[0];
    if (tgt) inp.target = tgt.id;

    const ready = k => !(h.cds[k] > 0);
    if (solve) {
      // interrupts and stuns, after a human-ish reaction time
      const casting = L.filter(f => f.cast && f.cast.ab.int && f.cast.t > 0.35 && (p.int || []).includes(f.cast.ab.id) && dist(f, h) <= Math.max(range(f), 260))
        .sort((a, b) => p.int.indexOf(a.cast.ab.id) - p.int.indexOf(b.cast.ab.id));
      const c0 = casting[0];
      if (c0 && ready(1) && dist(c0, h) <= range(c0)) { inp.press.push(1); inp.flags[1] = { foe: c0.id }; }
      else {
        const st = L.find(f => f.cast && (p.stun || []).includes(f.cast.ab.id) && f.cast.t > 0.35 && !f.enraged);
        if (st && ready(3)) { inp.press.push(3); inp.flags[3] = { foe: st.id }; }
      }
      // dispels: hex first, then a slow or 3+ vulnerability stacks, then an enemy's shield
      const hex = h.debuffs.find(d => d.k === 'hex'), slow = h.debuffs.find(d => d.k === 'slow'), vuln = h.debuffs.find(d => d.k === 'vuln' && d.stacks >= 3);
      const shielded = L.find(f => f.shield > 0 && (f.id === tgt?.id || f.kind === 'frog' || f.kind === 'gnoll'));
      if (ready(2)) {
        if (hex && hex.t < 3.6) { inp.press.push(2); inp.flags[2] = { which: 'hex' }; }
        else if (vuln) { inp.press.push(2); inp.flags[2] = { which: 'vuln' }; }
        else if (slow) { inp.press.push(2); inp.flags[2] = { which: 'slow' }; }
        else if (shielded && dist(shielded, h) < 340) { inp.press.push(2); inp.flags[2] = { foe: shielded.id }; }
      }
      if (ready('E') && S.pools.some(pl => dist(pl, h) < BTN.E.rad)) inp.press.push('E');
      if (ready(5) && (h.hp < h.max * 0.45 || (p.openDef && S.t > 1.5 && S.t < 3))) inp.press.push(5);
    } else if (ready(5) && h.hp < h.max * 0.4) inp.press.push(5);
    if (ready(6) && h.hp < h.max * 0.35) inp.press.push(6);
    // AOE when it hits two or more
    if (ready(4) && tgt) {
      const c = kit.aoe.around === 'hero' ? h : tgt;
      const n = L.filter(f => dist(c, f) <= kit.aoe.rad + f.r).length;
      if (n >= 2 && (kit.aoe.around === 'hero' || dist(h, tgt) <= kit.range)) inp.press.push(4);
    }

    // movement: dodge first (solution only), then get into range
    let mv = null;
    if (solve) mv = dodge(S, mem);
    if (!mv && tgt) {
      const d = dist(h, tgt);
      if (S.role === 'melee') { if (d > range(tgt) - 4) mv = { x: tgt.x - h.x, y: tgt.y - h.y }; }
      else {
        const want = kit.range - 30;
        if (d > want) mv = { x: tgt.x - h.x, y: tgt.y - h.y };
      }
    }
    // don't walk back into a telegraph that hasn't gone off yet
    if (solve && mv && !mem.dodging) {
      const m = Math.hypot(mv.x, mv.y) || 1, nx = h.x + mv.x / m * 16, ny = h.y + mv.y / m * 16;
      if (danger(S, nx, ny) && !danger(S, h.x, h.y)) mv = null;
    }
    mem.dodging = solve && !!dodge(S, mem);
    inp.move = mv;
    return inp;
  }

  function danger(S, x, y) {
    const h = S.hero, at = { x, y };
    if (S.tele.some(tl => dist(tl, at) < tl.r + h.r + 6)) return true;
    if (h.collectT <= 0 && S.pools.some(p => dist(p, at) < p.r + h.r)) return true;
    return live(S).some(f => f.cast && f.cast.ab.kind === 'cone' && dist(f, at) < f.cast.ab.len + h.r + 10 && angDiff(Math.atan2(y - f.y, x - f.x), f.cast.dir) < f.cast.ab.arc / 2 + 0.25);
  }

  // a direction out of danger, or null when the hero is safe
  function dodge(S, mem) {
    const h = S.hero;
    let vx = 0, vy = 0, n = 0;
    const away = (x, y, r, k = 1) => {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d >= r + h.r + 6) return;
      n++;
      if (d < 2) { const a = h.face + Math.PI / 2 + (h.y > S.H / 2 ? Math.PI : 0); vx += Math.cos(a) * k; vy += Math.sin(a) * k; }   // dead centre: step sideways
      else { vx += (h.x - x) / d * k; vy += (h.y - y) / d * k; }
    };
    S.tele.forEach(tl => { if (tl.t < tl.max - 0.2) away(tl.x, tl.y, tl.r, 2); });
    S.pools.forEach(p => { if (h.collectT <= 0 && h.cds.E > 0) away(p.x, p.y, p.r); });
    live(S).forEach(f => {
      const c = f.cast;
      if (!c || c.ab.kind !== 'cone') return;
      if (c.t < 0.2) return;
      const a = c.ab, ang = Math.atan2(h.y - f.y, h.x - f.x), d = dist(f, h);
      if (d < a.len + h.r + 10 && angDiff(ang, c.dir) < a.arc / 2 + 0.25) {
        // step sideways out of the cone, toward the side we are already on
        const side = Math.sign(((ang - c.dir + 3 * Math.PI) % TAU) - Math.PI) || 1;
        const perp = c.dir + side * Math.PI / 2;
        vx += Math.cos(perp) * 2 + Math.cos(c.dir + Math.PI) * 0.6; vy += Math.sin(perp) * 2 + Math.sin(c.dir + Math.PI) * 0.6; n++;
      }
    });
    if (!n) return null;
    // keep off the walls
    if (h.x < 60) vx += 1; if (h.x > W - 60) vx -= 1; if (h.y < 60) vy += 1; if (h.y > H - 60) vy -= 1;
    return { x: vx, y: vy };
  }

  // run a whole fight with the bot (for the checker and for instant "what would happen" readouts)
  function runBot(spec, plan, mode, role, seed = 1, max = 240, dt = 1 / 30) {
    const S = newFight(spec, role, seed), mem = {};
    while (!S.over && S.t < max) step(S, dt, bot(S, plan, mode, mem));
    if (!S.over) S.over = 'timeout';
    return S;
  }

  const API = { KIT, BTN, W, H, newFight, step, press, bot, runBot, addFoe, dist, live };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.DELVE_SIM = API;
})(typeof window !== 'undefined' ? window : globalThis);
