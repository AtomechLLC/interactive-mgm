/* Reading a Pull (MGM C4 M5, the "Example" slides for pulls 1-D and 2-E). A five-player World of Warcraft party against one
   dungeon pull, simulated at 30 steps a second so every frame is a pure function of (pull, plan, calls, time).
   PULL.run(pullKey, plan, calls) returns { frames, fx, end, stats }; cached by its arguments. Works in node too, for tuning:
     node -e "require('./sim.js'); const P = globalThis.PULLS; console.log(P.run('d1', P.PULLS.d1.plans[0].plan).stats)"
   plan = { order: [kinds, first to last], kick: 'none' | 'key' | 'all', move: 'stand' | 'step' }
   calls = live calls made by the student, [{ t, type: 'focus' | 'kick' | 'move', id }], replayed at their times.
   Creature names, tags and the synergy / solution text come from the slides; abilities and all numbers are this page's
   illustration of those tags. */
(function (root) {
  const DT = 1 / 30, W = 1040, H = 470, MAX_T = 75;
  const LOCK = 4, KICK_AT = .35;   // interrupts land 35% into a cast and lock the caster out for 4 s

  // the party: one tank, two melee/ranged damage dealers with interrupts, a hunter and a healer
  const PARTY = [
    { cls: 'warrior', name: 'Warrior', role: 'tank', hp: 240, dps: 5, reach: 46, speed: 120, kick: { name: 'Pummel', cd: 12, range: 50 }, icon: 'classicon_warrior', x: 150, y: 235 },
    { cls: 'rogue', name: 'Rogue', role: 'melee', hp: 130, dps: 15, reach: 44, speed: 125, kick: { name: 'Kick', cd: 12, range: 50 }, icon: 'classicon_rogue', x: 120, y: 175 },
    { cls: 'mage', name: 'Mage', role: 'ranged', hp: 105, dps: 13, range: 380, speed: 110, kick: { name: 'Counterspell', cd: 14, range: 380 }, icon: 'classicon_mage', x: 70, y: 300 },
    { cls: 'hunter', name: 'Hunter', role: 'ranged', hp: 120, dps: 12, range: 400, speed: 110, kick: { name: 'Counter Shot', cd: 14, range: 400 }, icon: 'classicon_hunter', x: 70, y: 160 },
    { cls: 'priest', name: 'Priest', role: 'healer', hp: 105, heal: 17, range: 400, speed: 110, mana: 100, manaPer: 4.4, icon: 'classicon_priest', x: 40, y: 235 },
  ];
  const KICK_ICON = { Pummel: 'inv_gauntlets_04', Kick: 'ability_kick', Counterspell: 'spell_frost_iceshock', 'Counter Shot': 'inv_ammo_arrow_03' };

  // the creatures, with the slide's tags. spell: what it casts; key: the cast the slide's solution says to interrupt
  const KINDS = {
    frog: { name: 'Void Corrupted Frog', short: 'Frog', tags: ['Non Elite', 'Single Target', 'Ranged/Melee', 'Tank', 'Disruptor'], hp: 1100, dps: 9, reach: 40, speed: 70, icon: 'inv_pet_toad_black', r: 30, lash: { cd: 7, stun: 1.2 } },
    murloc: { name: 'Corrupted Murloc Tidehunter', short: 'Murloc', tags: ['Non Elite', 'Single Target', 'Ranged', 'Caster', 'Disruptor'], hp: 150, icon: 'inv_misc_head_murloc_01', r: 22,
      spells: [{ key: 'bolt', name: 'Void Water Bolt', cast: 2.2, gap: .5, dmg: 20, icon: 'spell_frost_frostbolt' }] },
    dragonfly: { name: 'Void infested Dragonfly', short: 'Dragonfly', tags: ['Non Elite', 'Single Target', 'Ranged', 'Debuffer', 'Caster'], hp: 130, icon: 'ability_hunter_pet_wasp', r: 22,
      spells: [{ key: 'sting', name: 'Sapping Sting', cast: 2.4, gap: .9, dmg: 8, slow: 12, icon: 'spell_nature_slow' }] },
    rabbit: { name: 'Void Corrupted Rabbit', short: 'Rabbit', tags: ['Non Elite', 'Single Target', 'Melee', 'Nuker', 'Ambusher', 'Assassin'], hp: 240, dps: 5, reach: 34, speed: 150, icon: 'spell_magic_polymorphrabbit', r: 22,
      pounce: { first: 2.6, cd: 5.5, warn: 1.5, radius: 50, dmg: 46, icon: 'ability_druid_supriseattack' } },
    fox: { name: 'Void Corrupted Fox', short: 'Fox', tags: ['Non Elite', 'Single Target', 'Melee', 'Ambusher', 'Pack'], hp: 250, dps: 5, reach: 36, speed: 140, icon: 'inv_foxpet', r: 22, pack: { range: 140, k: 1.7 } },
    makrura: { name: 'Shadow-Infused Makrura', short: 'Makrura', tags: ['Non Elite', 'AOE', 'Range', 'Healer', 'Caster'], hp: 320, icon: 'ability_hunter_pet_crab', r: 26,
      spells: [{ key: 'mend', name: 'Shadow Mend', cast: 2.4, gap: .6, heal: .5, self: .12, icon: 'spell_shadow_shadowmend' },
        { key: 'wave', name: 'Void Wave', cast: 2.0, gap: .6, aoe: 5, icon: 'spell_shadow_shadowfury' }] },
  };

  // the two pulls: where everything stands, the slide's synergy and solution, and the plans offered on the page
  const PULLS = {
    d1: {
      label: '1-D', key: 'sting', keyName: 'Sapping Sting', keyFrom: 'dragonfly',
      foes: [['frog', 480, 235], ['murloc', 670, 115], ['murloc', 670, 355], ['dragonfly', 740, 235]],
      synergy: 'The frog protects the 3 casters in the back which are dealing consistent damage and slowing the player.',
      solution: 'Focus on the range enemies and interrupt the dragonfly to avoid getting slowed.',
      orders: {
        frog: { label: 'Frog first', order: ['frog', 'murloc', 'dragonfly'] },
        casters: { label: 'Casters first', order: ['murloc', 'dragonfly', 'frog'] },
        dragonfly: { label: 'Dragonfly first', order: ['dragonfly', 'murloc', 'frog'] },
      },
    },
    e2: {
      label: '2-E', key: 'mend', keyName: 'Shadow Mend', keyFrom: 'makrura',
      foes: [['rabbit', 560, 95], ['rabbit', 560, 375], ['fox', 650, 165], ['fox', 650, 305], ['makrura', 930, 235]],
      synergy: 'The foxes and the rabbits exert pressure on the player, encouraging them to focus them first. The Makrura heals them and deals ranged damage, being able to keep itself safer and deal damage for a longer period of time by sustaining their melee allies.',
      solution: 'Move away from the rabbits’ attacks. Interrupt the Makrura when they try to heal their allies.',
      orders: {
        melee: { label: 'Rabbits, then foxes', order: ['rabbit', 'fox', 'makrura'] },
        fox: { label: 'Foxes first', order: ['fox', 'rabbit', 'makrura'] },
        makrura: { label: 'Makrura first', order: ['makrura', 'rabbit', 'fox'] },
      },
    },
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clampXY = p => { p.x = Math.max(20, Math.min(W - 20, p.x)); p.y = Math.max(20, Math.min(H - 20, p.y)); };
  function step(p, tx, ty, v) {
    const d = Math.hypot(tx - p.x, ty - p.y); if (d < 1e-6) return 0;
    const k = Math.min(1, v * DT / d); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; return d;
  }
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function simulate(pk, plan, calls = []) {
    const P = PULLS[pk], r = rng(pk === 'd1' ? 11 : 23);
    const order = plan.order, kick = plan.kick, move = plan.move || 'stand';
    const party = PARTY.map((m, i) => ({ ...m, id: 'p' + i, max: m.hp, hpNow: m.hp, alive: true, slow: 0, stun: 0, kickCd: 0, mana: m.mana || 0, busy: 0, dodge: null, healOn: null, tgt: null }));
    party.forEach(m => { m.hp = m.max; });
    const tank = party[0], priest = party[4];
    const foes = P.foes.map(([k, x, y], i) => {
      const K = KINDS[k];
      return { id: 'f' + i, kind: k, x, y, hx: x, hy: y, hp: K.hp, max: K.hp, alive: true, cast: null, lock: 0, next: .4 + i * .35, tgt: null, lashCd: K.lash ? 3 : 0,
        pounceAt: K.pounce ? K.pounce.first + i * 1.1 : 0, warn: null, spell: 0, hidden: k === 'rabbit' || k === 'fox' };
    });
    const fx = [], frames = [], stats = { dmg: 0, slowSec: 0, healed: 0, pounceHits: 0, pounces: 0, kicks: 0, wasted: 0, missedKey: 0, keyCasts: 0, lashes: 0, deaths: 0 };
    let t = 0, end = null, focusId = null, ci = 0, moveCall = -9;
    const calls_ = calls.slice().sort((a, b) => a.t - b.t);
    const live = () => foes.filter(f => f.alive);
    const alive = () => party.filter(m => m.alive);
    const hurt = (m, d, src) => {
      if (!m.alive || d <= 0) return; m.hp -= d; stats.dmg += d;
      if (d >= 3) fx.push({ t, kind: 'dmg', id: m.id, d: Math.round(d), src });
      if (m.hp <= 0) { m.hp = 0; m.alive = false; stats.deaths++; fx.push({ t, kind: 'die', id: m.id, x: m.x, y: m.y }); }
    };
    const say = (s, x, y, col) => fx.push({ t, kind: 'say', s, x, y, col });

    function focus() {
      const f = foes.find(f => f.id === focusId && f.alive); if (f) return f;
      for (const k of order) {
        const c = live().filter(f => f.kind === k && !f.hidden); if (c.length) return c.sort((a, b) => a.hp - b.hp || dist(tank, a) - dist(tank, b))[0];
      }
      return live().find(f => !f.hidden) || null;
    }
    // who interrupts: anyone alive, not stunned, off cooldown and in range; ranged interrupts are saved for the key cast
    function interrupter(f) {
      return alive().filter(m => m.kick && m.kickCd <= 0 && m.stun <= 0 && dist(m, f) <= m.kick.range + KINDS[f.kind].r)
        .sort((a, b) => (a.kick.range > 100) - (b.kick.range > 100))[0];
    }
    function tryKick(f, called) {
      if (!f || !f.alive) return false;
      if (!f.cast) { if (called) { say('Nothing to interrupt', f.x, f.y - 50, '#7a4a00'); stats.wasted++; } return false; }
      const m = interrupter(f);
      if (!m) { if (called) say('No interrupt ready', f.x, f.y - 50, '#7a4a00'); return false; }
      m.kickCd = m.kick.cd; stats.kicks++;
      if (f.cast.key !== P.key) stats.wasted++;
      fx.push({ t, kind: 'kick', id: m.id, fid: f.id, name: m.kick.name, spell: f.cast.name, x: f.x, y: f.y });
      f.cast = null; f.lock = LOCK; f.next = Math.max(f.next, t + LOCK);
      return true;
    }

    while (!end) {
      // the student's live calls
      while (ci < calls_.length && calls_[ci].t <= t + 1e-9) {
        const c = calls_[ci++];
        if (c.type === 'focus') { const f = foes.find(f => f.id === c.id && f.alive); if (f) { focusId = c.id; fx.push({ t, kind: 'call', fid: c.id }); } }
        if (c.type === 'kick') tryKick(foes.find(f => f.id === c.id), true);
        if (c.type === 'move') { moveCall = t; fx.push({ t, kind: 'movecall' }); }
      }
      const F = focus();

      /* ---------- the party ---------- */
      alive().forEach(m => {
        m.kickCd = Math.max(0, m.kickCd - DT); m.stun = Math.max(0, m.stun - DT);
        if (m.slow > 0) { m.slow = Math.max(0, m.slow - DT); stats.slowSec += DT; }
        const sk = m.slow > 0 ? .5 : 1;
        m.tgt = null; m.healOn = null;
        if (m.stun > 0) return;
        // step out of a rabbit's pounce: straight away from its centre
        const warn = foes.find(f => f.alive && f.warn && dist(m, f.warn) < KINDS.rabbit.pounce.radius + 14);
        const react = warn && (move === 'step' ? t - warn.warn.t0 > .3 : moveCall >= warn.warn.t0 && moveCall <= t);
        if (react) {
          const a = Math.atan2(m.y - warn.warn.y, m.x - warn.warn.x) || 0;
          const tx = warn.warn.x + Math.cos(a) * (KINDS.rabbit.pounce.radius + 30), ty = warn.warn.y + Math.sin(a) * (KINDS.rabbit.pounce.radius + 30);
          step(m, tx, ty, m.speed * 1.4 * sk); clampXY(m); m.moving = true; return;
        }
        m.moving = false;
        if (m.role === 'healer') {
          const hurtM = alive().filter(o => o.hp < o.max - 2).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
          const cx = alive().reduce((s, o) => s + o.x, 0) / alive().length, cy = alive().reduce((s, o) => s + o.y, 0) / alive().length;
          const far = alive().filter(o => dist(o, m) > m.range - 20);
          if (far.length) { step(m, cx - 60, cy, m.speed * sk); m.moving = true; }
          if (hurtM && m.mana > 0 && dist(hurtM, m) <= m.range) {
            const h = Math.min(m.heal * sk * DT, hurtM.max - hurtM.hp); hurtM.hp += h; m.mana = Math.max(0, m.mana - h / m.manaPer); m.healOn = hurtM.id;
          }
          return;
        }
        let tg = F;
        if (m.role === 'tank') {
          // the tank holds the frog in 1-D and picks up the foxes in 2-E, whatever the damage dealers are on
          const hold = live().filter(f => (f.kind === 'frog' || f.kind === 'fox') && !f.hidden).sort((a, b) => dist(m, a) - dist(m, b))[0];
          tg = hold || F;
        }
        if (!tg) return;
        const reach = (m.reach || m.range) + KINDS[tg.kind].r;
        const d = dist(m, tg);
        // a ranged interrupter on a plan that interrupts keeps the key caster in range too
        const keyF = kick !== 'none' && m.kick && m.kick.range > 100 && live().find(f => f.kind === P.keyFrom);
        if (keyF && dist(m, keyF) > m.kick.range + KINDS[keyF.kind].r - 6 && d <= reach + 40) {
          step(m, keyF.x, keyF.y, m.speed * sk); clampXY(m); m.moving = true; return;
        }
        if (d > reach - 4) {
          // ranged stop at range, slightly off the line so tokens do not stack
          const ang = Math.atan2(m.y - tg.y, m.x - tg.x), want = reach - 12;
          const tx = tg.x + Math.cos(ang) * want, ty = tg.y + Math.sin(ang) * want;
          step(m, tx, ty, m.speed * sk); clampXY(m); m.moving = true;
        } else { m.tgt = tg.id; tg.hp -= m.dps * sk * DT; }
      });

      /* ---------- interrupts the plan calls ---------- */
      if (kick === 'key' || kick === 'all') live().forEach(f => {
        if (!f.cast || (t - f.cast.t0) / f.cast.dur < KICK_AT) return;
        if (kick === 'key' && f.cast.key !== P.key) return;
        tryKick(f, false);
      });

      /* ---------- the creatures ---------- */
      live().forEach(f => {
        const K = KINDS[f.kind];
        if (f.hp <= 0) { f.alive = false; f.cast = null; f.warn = null; fx.push({ t, kind: 'kill', fid: f.id, x: f.x, y: f.y }); if (focusId === f.id) focusId = null; return; }
        f.lock = Math.max(0, f.lock - DT);
        // ambushers wait hidden for a moment, then leap at their marks
        if (f.hidden) {
          if (t >= .9 + (+f.id.slice(1)) * .15) { f.hidden = false; fx.push({ t, kind: 'ambush', fid: f.id, x: f.x, y: f.y }); }
          else return;
        }
        // melee: rabbits are assassins and go for the healer and the mage; foxes go for the hunter and rogue until the tank takes them
        if (K.reach) {
          if (!f.tgt || !party.find(m => m.id === f.tgt).alive) {
            const want = f.kind === 'rabbit' ? ['priest', 'mage', 'hunter', 'rogue', 'warrior'] : f.kind === 'fox' ? ['hunter', 'rogue', 'mage', 'priest', 'warrior'] : ['warrior', 'rogue', 'hunter', 'mage', 'priest'];
            const n = foes.filter(o => o.kind === f.kind).indexOf(f);
            const pick = want.map(c => party.find(m => m.cls === c && m.alive)).filter(Boolean);
            f.tgt = (pick[n] || pick[0] || {}).id;
          }
          if (f.kind === 'fox' && tank.alive && dist(tank, f) < 70) f.tgt = tank.id;
          const tg = party.find(m => m.id === f.tgt); if (!tg || !tg.alive) return;
          if (f.leap) { // a pounce in flight
            const k = Math.min(1, (t - f.leap.t0) / .25); f.x = f.leap.x0 + (f.leap.x - f.leap.x0) * k; f.y = f.leap.y0 + (f.leap.y - f.leap.y0) * k;
            if (k >= 1) {
              f.leap = null; stats.pounces++;
              const hit = alive().filter(m => dist(m, f) < K.pounce.radius + 10);
              hit.forEach(m => { hurt(m, K.pounce.dmg, f.id); stats.pounceHits++; });
              fx.push({ t, kind: 'pounce', fid: f.id, x: f.x, y: f.y, hits: hit.length });
            }
            return;
          }
          if (f.warn && t - f.warn.t0 >= K.pounce.warn) { f.leap = { t0: t, x0: f.x, y0: f.y, x: f.warn.x, y: f.warn.y }; f.warn = null; f.pounceAt = t + K.pounce.cd; return; }
          if (K.pounce && !f.warn && t >= f.pounceAt) f.warn = { t0: t, x: tg.x, y: tg.y };
          const d = dist(f, tg);
          if (d > K.reach + 18) { step(f, tg.x, tg.y, K.speed); return; }
          let dps = K.dps;
          if (K.pack && foes.some(o => o !== f && o.alive && !o.hidden && o.kind === f.kind && dist(o, f) < K.pack.range)) dps *= K.pack.k;
          hurt(tg, dps * DT, f.id);
          // the frog's tongue: anyone who gets past it is pulled back to its front
          if (K.lash) {
            f.lashCd = Math.max(0, f.lashCd - DT);
            const past = alive().filter(m => m !== tank && m.x > f.x + 8).sort((a, b) => b.x - a.x)[0];
            if (past && f.lashCd <= 0) {
              f.lashCd = K.lash.cd; stats.lashes++;
              fx.push({ t, kind: 'lash', fid: f.id, id: past.id, x0: past.x, y0: past.y });
              past.x = f.x - 52; past.y = f.y + (past.y > f.y ? 30 : -30); past.stun = K.lash.stun;
            }
          }
          return;
        }
        // casters
        if (f.cast) {
          if (t - f.cast.t0 >= f.cast.dur) {
            const sp = f.cast, tg = party.find(m => m.id === sp.tgt);
            if (sp.key === P.key) stats.missedKey++;
            if (sp.dmg && tg && tg.alive) hurt(tg, sp.dmg, f.id);
            if (sp.slow && tg && tg.alive) { tg.slow = sp.slow; fx.push({ t, kind: 'slowed', id: tg.id }); }
            if (sp.heal) { let h = 0; live().forEach(o => { if (o.hidden) return; const a = Math.min(o.max - o.hp, o.max * (o === f ? sp.self : sp.heal)); o.hp += a; h += a; }); stats.healed += h; fx.push({ t, kind: 'mend', fid: f.id, h: Math.round(h) }); }
            if (sp.aoe) { alive().forEach(m => hurt(m, sp.aoe, f.id)); fx.push({ t, kind: 'wave', fid: f.id }); }
            fx.push({ t, kind: 'cast', fid: f.id, key: sp.key, tgt: sp.tgt });
            f.cast = null; f.next = t + sp.gap;
          }
          return;
        }
        if (t < f.next || f.lock > 0) return;
        let sp = K.spells[0];
        if (f.kind === 'makrura') sp = live().some(o => !o.hidden && o !== f && o.hp < o.max * .85) || f.hp < f.max * .85 ? K.spells[0] : K.spells[1];
        const pool = alive().filter(m => m !== tank);
        let tg = pool[Math.floor(r() * pool.length)];
        if (sp.slow) tg = pool.filter(m => m.slow < 2).sort((a, b) => (a.role === 'healer' ? -1 : 0) - (b.role === 'healer' ? -1 : 0))[Math.floor(r() * 2)] || tg;
        if (!tg) return;
        if (sp.key === P.key) stats.keyCasts++;
        f.cast = { key: sp.key, name: sp.name, icon: sp.icon, t0: t, dur: sp.cast, tgt: tg.id, dmg: sp.dmg, slow: sp.slow, heal: sp.heal, self: sp.self, aoe: sp.aoe, gap: sp.gap };
      });

      /* ---------- snapshot ---------- */
      frames.push({
        party: party.map(m => ({ id: m.id, x: m.x, y: m.y, hp: m.hp, alive: m.alive, slow: m.slow, stun: m.stun, kickCd: m.kickCd, mana: m.mana, tgt: m.tgt, healOn: m.healOn, moving: m.moving })),
        foes: foes.map(f => ({ id: f.id, x: f.x, y: f.y, hp: Math.max(0, f.hp), alive: f.alive, hidden: f.hidden, lock: f.lock, warn: f.warn ? { ...f.warn } : null, leap: !!f.leap,
          cast: f.cast ? { key: f.cast.key, name: f.cast.name, icon: f.cast.icon, k: (t - f.cast.t0) / f.cast.dur, tgt: f.cast.tgt } : null })),
        focus: F ? F.id : null,
      });
      if (!live().length) end = { t, result: 'cleared' };
      else if (!priest.alive || party.filter(m => !m.alive).length >= 3) end = { t, result: 'wipe' };
      else if (t >= MAX_T) end = { t, result: 'timeout' };
      t += DT;
    }
    stats.hpLeft = Math.round(100 * party.reduce((s, m) => s + Math.max(0, m.hp), 0) / party.reduce((s, m) => s + m.max, 0));
    stats.mana = Math.round(priest.mana);
    // close call: cleared, but someone died or the party ended below a third of its health
    if (end.result === 'cleared' && (stats.deaths > 0 || stats.hpLeft < 35)) end.result = 'close';
    return { frames, fx, end, stats, pull: pk, plan, calls: calls_ };
  }

  const cache = new Map();
  function run(pk, plan, calls = []) {
    const key = pk + JSON.stringify(plan) + JSON.stringify(calls);
    if (!cache.has(key)) { if (cache.size > 60) cache.delete(cache.keys().next().value); cache.set(key, simulate(pk, plan, calls)); }
    return cache.get(key);
  }
  root.PULLS = { run, simulate, PULLS, KINDS, PARTY, KICK_ICON, DT, W, H, MAX_T, LOCK };
})(typeof window !== 'undefined' ? window : globalThis);
