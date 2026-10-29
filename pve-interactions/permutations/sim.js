/* Evaluating Enemy Permutations (MGM C4 M5, deck slide 141). One small top-down World of Warcraft Classic pull in Westfall,
   simulated at 30 steps a second, so every frame is a pure function of (pull, class, time).
   A Defias creature, or two, against a Warrior (melee) or a Mage (ranged). Each player action is logged, and the ordered list
   of distinct actions is the player's reaction pattern: the thing slide 141 says a permutation has to change.
   PERM.run(foes, cls) returns { frames, won, lost, t, pattern, wasted, escaped }; cached. Works in node too, for tuning.
   Creature names follow Classic's Westfall Defias (the Pillager casts Fireball, the Trapper throws a Net, the speaker notes'
   example); the Tough, Swift and Runaway Thugs are this page's variants. All numbers are illustrative. */
(function (root) {
  const DT = 1 / 30, W = 600, H = 270, MAX_T = 45;
  // the base creature and its rule changes. kind: what the change is, rule: the one line shown on its card
  const FOES = {
    thug: { name: 'Defias Thug', rule: 'Walks up and hits you', kind: 'base', hp: 60, speed: 85, dmg: 8, swing: 2, icon: 'inv_misc_bandana_03', badge: 'inv_sword_04' },
    tough: { name: 'Tough Thug', rule: '+60% health, +25% damage', kind: 'numbers', hp: 96, dmg: 10, badge: 'spell_nature_stoneskintotem' },
    swift: { name: 'Swift Thug', rule: 'Swings and runs faster', kind: 'numbers', swing: 1.25, speed: 125, badge: 'spell_nature_bloodlust' },
    runaway: { name: 'Runaway Thug', rule: 'Runs for help at low health', kind: 'rule', flee: .34, badge: 'ability_rogue_sprint' },
    pillager: { name: 'Defias Pillager', rule: 'Casts Fireball from range', kind: 'rule', hp: 52, caster: true, badge: 'spell_fire_flamebolt' },
    trapper: { name: 'Defias Trapper', rule: 'Nets you, holds you for its friends', kind: 'rule', net: true, badge: 'ability_ensnare' },
  };
  Object.keys(FOES).forEach(k => { FOES[k] = { ...FOES.thug, ...FOES[k], key: k }; });
  const FIREBALL = { cast: 2.5, dmg: 16, speed: 300, range: 215 };
  const NET = { cast: .2, cd: 5, root: 5, speed: 900, min: 50, max: 390, first: 0, hold: 170 };
  const FLEE_SPEED = 120, HELP_DELAY = 2.5;

  const CLASSES = {
    warrior: { name: 'Warrior', role: 'melee', hp: 150, speed: 110, reach: 52, swing: 1.6, dmg: 13, icon: 'classicon_warrior' },
    mage: { name: 'Mage', role: 'ranged', hp: 100, speed: 110, icon: 'classicon_mage' },
  };
  const CHARGE = { min: 80, max: 260, cd: 15, speed: 520, stun: 1 };
  const PUMMEL = { cd: 10, lock: 4 };
  const FROSTBOLT = { cast: 1.5, dmg: 26, range: 290, slow: .55, slowFor: 9 };
  const FIREBLAST = { cd: 7, dmg: 16, range: 210 };
  const NOVA = { cd: 15, near: 76, radius: 115, root: 6 };
  const BLINK = { cd: 14, dist: 170 };
  // the words the reaction pattern is made of, with the icon each one is drawn with
  const ACTIONS = {
    Charge: 'ability_warrior_charge', Attack: 'inv_sword_04', Pummel: 'inv_gauntlets_04', Hamstring: 'ability_shockwave',
    'Stand netted': 'ability_ensnare', Frostbolt: 'spell_frost_frostbolt02', 'Frost Nova': 'spell_frost_frostnova',
    'Back off': 'ability_rogue_sprint', 'Fire Blast': 'spell_fire_fireball', Blink: 'spell_arcane_blink',
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clampXY = p => { p.x = Math.max(16, Math.min(W - 16, p.x)); p.y = Math.max(16, Math.min(H - 16, p.y)); };
  function step(p, tx, ty, v) {
    const d = Math.hypot(tx - p.x, ty - p.y); if (d < 1e-6) return 0;
    const k = Math.min(1, v * DT / d); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; return d;
  }
  const SPOTS = { 1: [[480, 135]], 2: [[480, 90], [480, 180]] };

  function simulate(keys, cls) {
    const P = CLASSES[cls];
    const me = { x: 90, y: 135, hp: P.hp, max: P.hp, swingCd: 0, chargeCd: 0, pummelCd: 0, fbCd: 0, novaCd: 0, blinkCd: 0, root: 0, cast: null, charging: null, face: 0 };
    let uid = 0;
    const mk = (k, x, y, o = {}) => { const f = FOES[k]; return { id: uid++, key: k, x, y, throwing: 0, hp: f.hp, max: f.hp, swingCd: .8, netCd: NET.first, castCd: .2, cast: null, stun: 0, lock: 0, root: 0, slow: 0, slowK: 0, ham: 0, fleeing: false, alive: true, gone: false, face: Math.PI, ...o }; };
    const foes = keys.map((k, i) => mk(k, ...SPOTS[keys.length][i]));
    const shots = [], fx = [], frames = [], log = [], pattern = [];
    let t = 0, won = false, lost = false, wasted = 0, escaped = 0, helpAt = -1, helpEdge = 0, lastAct = '';
    const act = (a, x, y) => { log.push([t, a]); if (!pattern.includes(a)) pattern.push(a); if (a !== lastAct || a === 'Pummel' || a === 'Blink' || a === 'Frost Nova' || a === 'Charge' || a === 'Hamstring') fx.push({ t, kind: 'act', a, x: x ?? me.x, y: y ?? me.y }); lastAct = a; };
    const hurt = (who, d) => { who.hp -= d; fx.push({ t, kind: 'hit', x: who.x, y: who.y, d: Math.round(d), me: who === me }); };
    const living = () => foes.filter(f => f.alive && !f.gone);

    function pickTarget() {
      const L = living(); if (!L.length) return null;
      // the Warrior goes for casters first; the Mage keeps every walker slowed, then works on the casters
      const walker = f => !FOES[f.key].caster && !f.fleeing && f.slow <= 0 && f.root <= 0 && dist(me, f) < 230;
      const score = f => (f.fleeing ? -3000 : 0) + (cls === 'mage' && walker(f) && dist(me, f) < 140 ? -2000 : 0) + (FOES[f.key].caster ? -1000 : 0) + dist(me, f);
      return L.slice().sort((a, b) => score(a) - score(b))[0];
    }

    // the direction to run from something: straight away, or turned toward the open room when a wall is in the way (circle kiting)
    // the direction to run from something: straight away, bent off the walls so the Mage circles the room instead of
    // pinning itself in a corner, and smoothed so it does not jitter
    function away(from) {
      let ax = me.x - from.x, ay = me.y - from.y; const n = Math.hypot(ax, ay) || 1; ax /= n; ay /= n;
      const push = d => Math.max(0, (90 - d) / 90) * 1.8;
      let vx = ax + push(me.x) - push(W - me.x), vy = ay + push(me.y) - push(H - me.y);
      if (Math.hypot(vx, vy) < .3) { vx = -ay; vy = ax; if ((W / 2 - me.x) * vx + (H / 2 - me.y) * vy < 0) { vx = -vx; vy = -vy; } }
      const m = Math.hypot(vx, vy); vx /= m; vy /= m;
      if (me.runV) { vx = vx * .3 + me.runV[0] * .7; vy = vy * .3 + me.runV[1] * .7; const q = Math.hypot(vx, vy) || 1; vx /= q; vy /= q; }
      me.runV = [vx, vy]; return Math.atan2(vy, vx);
    }
    function playerStep() {
      ['swingCd', 'chargeCd', 'pummelCd', 'fbCd', 'novaCd', 'blinkCd'].forEach(k => me[k] = Math.max(0, me[k] - DT));
      if (me.root > 0) me.root = Math.max(0, me.root - DT);
      const tg = pickTarget(); if (!tg) return;
      const d = dist(me, tg);
      me.face = Math.atan2(tg.y - me.y, tg.x - me.x);
      if (cls === 'warrior') {
        if (me.charging) {
          const c = me.charging; if (!c.alive || c.gone) { me.charging = null; return; }
          const left = step(me, c.x - Math.cos(me.face) * 44, c.y - Math.sin(me.face) * 44, CHARGE.speed);
          if (left < 6) { me.charging = null; c.stun = Math.max(c.stun, CHARGE.stun); if (c.cast) c.cast = null; }
          return;
        }
        if (d > P.reach) {
          if (me.root > 0) { if (lastAct !== 'Stand netted') act('Stand netted'); return; }
          if (d >= CHARGE.min && d <= CHARGE.max && me.chargeCd <= 0) { me.chargeCd = CHARGE.cd; me.charging = tg; act('Charge'); return; }
          step(me, tg.x, tg.y, P.speed);
          return;
        }
        if (tg.cast && me.pummelCd <= 0) { tg.cast = null; tg.lock = PUMMEL.lock; me.pummelCd = PUMMEL.cd; act('Pummel', tg.x, tg.y); return; }
        if (tg.fleeing && tg.ham <= 0) { tg.ham = 10; act('Hamstring', tg.x, tg.y); }
        if (me.swingCd <= 0) { me.swingCd = P.swing; hurt(tg, P.dmg); act('Attack', tg.x, tg.y); }
        return;
      }
      // Mage
      const near = living().filter(f => !FOES[f.key].caster && f.root <= 0 && f.stun <= 0 && !f.fleeing).sort((a, b) => dist(me, a) - dist(me, b))[0];
      const nd = near ? dist(me, near) : 1e9;
      if (me.root > 0 && me.blinkCd <= 0) {
        // blink away from whatever is closest, back toward the middle of the room
        const from = living().sort((a, b) => dist(me, a) - dist(me, b))[0];
        const a = away(from, BLINK.dist), x0 = me.x, y0 = me.y; me.x += Math.cos(a) * BLINK.dist; me.y += Math.sin(a) * BLINK.dist; clampXY(me);
        me.root = 0; me.blinkCd = BLINK.cd; me.cast = null; fx.push({ t, kind: 'blink', x0, y0, x: me.x, y: me.y }); act('Blink'); return;
      }
      if (nd < NOVA.near && me.novaCd <= 0) {
        me.novaCd = NOVA.cd; me.cast = null; living().forEach(f => { if (dist(me, f) < NOVA.radius) { f.root = NOVA.root; f.cast = f.cast && FOES[f.key].caster ? f.cast : null; } });
        fx.push({ t, kind: 'nova', x: me.x, y: me.y }); act('Frost Nova'); return;
      }
      const held = near && (near.root > 0 || near.stun > 0);
      const far = living().filter(f => !FOES[f.key].caster && !f.fleeing).sort((a, b) => dist(me, a) - dist(me, b))[0];
      const fd = far ? dist(me, far) : 1e9, fheld = far && (far.root > 0 || far.stun > 0);
      if (me.kite && (me.root > 0 || !far || fd >= (fheld ? 85 : 135))) me.kite = false;
      if (me.root <= 0 && !me.kite && ((nd < 90) || (fheld && fd < 62))) me.kite = true;
      if (me.kite || (nd < 56 && me.root <= 0)) {
        me.cast = null;
        const from = nd < 90 ? near : far, a = away(from);
        me.x += Math.cos(a) * P.speed * DT; me.y += Math.sin(a) * P.speed * DT; clampXY(me);
        if (lastAct !== 'Back off') act('Back off'); return;
      }
      if (tg.fleeing && d <= FIREBLAST.range && me.fbCd <= 0) { me.fbCd = FIREBLAST.cd; hurt(tg, FIREBLAST.dmg); fx.push({ t, kind: 'blast', x: tg.x, y: tg.y }); act('Fire Blast', tg.x, tg.y); return; }
      if (d > FROSTBOLT.range) { if (me.root <= 0) { me.cast = null; step(me, tg.x, tg.y, P.speed); } return; }
      if (!me.cast) { me.cast = { tg: tg.id, left: FROSTBOLT.cast, len: FROSTBOLT.cast }; return; }
      me.cast.left -= DT;
      if (me.cast.left <= 0) {
        const f = foes.find(q => q.id === me.cast.tg); me.cast = null;
        if (f && f.alive && !f.gone) { shots.push({ kind: 'frostbolt', x: me.x, y: me.y, to: f.id, speed: 360 }); act('Frostbolt', f.x, f.y); }
      }
    }

    function foeStep(f) {
      const F = FOES[f.key];
      ['swingCd', 'netCd', 'castCd'].forEach(k => f[k] = Math.max(0, f[k] - DT));
      ['stun', 'lock', 'root', 'slow', 'ham'].forEach(k => f[k] = Math.max(0, f[k] - DT));
      if (f.stun > 0) return;
      const v = F.speed * (f.slow > 0 ? 1 - FROSTBOLT.slow : 1) * (f.ham > 0 ? .4 : 1);
      const d = dist(me, f); f.face = Math.atan2(me.y - f.y, me.x - f.x);
      if (F.flee && !f.fleeing && f.hp <= f.max * F.flee) { f.fleeing = true; f.cast = null; fx.push({ t, kind: 'say', x: f.x, y: f.y, s: 'Runs for help!' }); }
      if (f.fleeing) {
        if (f.root > 0) return;
        const ex = f.x > W / 2 ? W + 30 : -30; f.face = f.x > W / 2 ? 0 : Math.PI;
        step(f, ex, f.y + (f.y > H / 2 ? 30 : -30) * DT, FLEE_SPEED * (f.slow > 0 ? 1 - FROSTBOLT.slow : 1) * (f.ham > 0 ? .4 : 1));
        if (f.x > W + 10 || f.x < -10) { f.gone = true; escaped++; helpAt = t + HELP_DELAY; helpEdge = ex > 0 ? W - 20 : 20; fx.push({ t, kind: 'say', x: ex > 0 ? W - 60 : 60, y: f.y, s: 'Escaped' }); }
        return;
      }
      if (f.throwing > 0) { f.throwing -= DT; return; }
      if (f.cast) {
        f.cast.left -= DT;
        if (f.cast.left <= 0) { f.cast = null; shots.push({ kind: 'fireball', x: f.x, y: f.y, to: 'me', speed: FIREBALL.speed }); }
        return;
      }
      if (F.net && f.netCd <= 0 && d >= NET.min && d <= NET.max && f.lock <= 0) {
        f.netCd = NET.cd; f.throwing = NET.cast; shots.push({ kind: 'net', x: f.x, y: f.y, to: 'me', speed: NET.speed, delay: NET.cast, from: f.id }); fx.push({ t, kind: 'throw', x: f.x, y: f.y }); return;
      }
      if (F.caster) {
        if (d > FIREBALL.range) { if (f.root <= 0) step(f, me.x, me.y, v); return; }
        if (f.lock <= 0 && f.castCd <= 0) { f.cast = { left: FIREBALL.cast, len: FIREBALL.cast }; f.castCd = .4; return; }
        if (d < 54 && f.swingCd <= 0) { f.swingCd = 2; hurt(me, 4); }
        return;
      }
      // a Trapper with a friend that hits holds at range and keeps you netted; alone, it walks in to stab
      if (F.net && living().some(o => o !== f && !FOES[o.key].net)) { if (d < NET.hold - 10 && f.root <= 0) step(f, f.x + (f.x - me.x), f.y + (f.y - me.y), v * .6); else if (d > NET.hold + 20 && f.root <= 0) step(f, me.x, me.y, v); return; }
      if (d > 48) { if (f.root <= 0) step(f, me.x - Math.cos(f.face) * 46, me.y - Math.sin(f.face) * 46, v); return; }
      if (f.swingCd <= 0) { f.swingCd = F.swing; hurt(me, F.dmg); fx.push({ t, kind: 'swing', x: f.x, y: f.y, a: f.face }); }
    }

    function shotsStep() {
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (s.delay > 0) { s.delay -= DT; continue; }
        const tg = s.to === 'me' ? me : foes.find(q => q.id === s.to);
        if (!tg || (tg !== me && (!tg.alive || tg.gone))) { shots.splice(i, 1); continue; }
        if (step(s, tg.x, tg.y, s.speed) < 10) {
          shots.splice(i, 1);
          if (s.kind === 'fireball') hurt(me, FIREBALL.dmg);
          else if (s.kind === 'net') { if (me.root > 1.5) { wasted++; fx.push({ t, kind: 'say', x: me.x, y: me.y - 34, s: 'Already netted' }); } me.root = NET.root; me.cast = null; me.charging = null; fx.push({ t, kind: 'netted', x: me.x, y: me.y }); }
          else if (s.kind === 'frostbolt') { hurt(tg, FROSTBOLT.dmg); tg.slow = FROSTBOLT.slowFor; }
        }
      }
    }

    const snap = () => ({
      t, me: { x: me.x, y: me.y, hp: Math.max(0, me.hp), max: me.max, root: me.root, face: me.face, cast: me.cast ? 1 - me.cast.left / me.cast.len : 0, charging: !!me.charging },
      foes: foes.map(f => ({ id: f.id, key: f.key, x: f.x, y: f.y, hp: Math.max(0, f.hp), max: f.max, alive: f.alive, gone: f.gone, stun: f.stun, root: f.root, slow: f.slow, ham: f.ham, fleeing: f.fleeing, face: f.face, cast: f.cast ? 1 - f.cast.left / f.cast.len : 0, lock: f.lock })),
      shots: shots.filter(s => !(s.delay > 0)).map(s => ({ kind: s.kind, x: s.x, y: s.y })),
    });

    while (t < MAX_T) {
      playerStep();
      foes.forEach(f => { if (f.alive && !f.gone) foeStep(f); });
      shotsStep();
      foes.forEach(f => { if (f.alive && f.hp <= 0) { f.alive = false; fx.push({ t, kind: 'die', x: f.x, y: f.y }); } });
      if (helpAt > 0 && t >= helpAt) { helpAt = -1; foes.push(mk('thug', helpEdge, 80), mk('thug', helpEdge, 160)); fx.push({ t, kind: 'say', x: helpEdge === 20 ? 90 : W - 90, y: 120, s: 'Help arrives' }); }
      frames.push(snap());
      if (me.hp <= 0) { lost = true; break; }
      if (!living().length && helpAt < 0) { won = true; break; }
      t += DT;
    }
    return { keys, cls, frames, fx, log, pattern, won, lost, t, wasted, escaped, hpLeft: Math.max(0, me.hp) / me.max };
  }

  // verdicts. One creature: did its rule change the reaction pattern, compared with the base Thug?
  const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const cache = {};
  function run(keys, cls) {
    const id = keys.join('+') + '|' + cls;
    return cache[id] || (cache[id] = simulate(keys, cls));
  }
  function solo(key, cls) {
    const r = run([key], cls), base = run(['thug'], cls);
    const changed = key !== 'thug' && !same(r.pattern, base.pattern);
    return { r, base, changed, verdict: key === 'thug' ? 'base' : r.lost ? 'impossible' : changed ? 'permutation' : 'escalation' };
  }
  // A pair: impossible (the player loses), fight (one creature's tool lands on nothing), numbers (the pair asks for nothing
  // either creature did alone and both ask the same), or stacks (each creature's ask survives in the mix)
  function pair(a, b, cls) {
    const r = run([a, b], cls), pa = run([a], cls).pattern, pb = run([b], cls).pattern;
    let verdict = 'stacks';
    if (r.lost) verdict = 'impossible';
    else if (r.wasted) verdict = 'fight';
    else if (same(pa, pb) && same(r.pattern, pa)) verdict = 'numbers';
    return { r, verdict, pa, pb };
  }

  const API = { DT, W, H, FOES, CLASSES, ACTIONS, run, solo, pair, same };
  if (typeof module !== 'undefined') module.exports = API; else root.PERM = API;
})(typeof window !== 'undefined' ? window : globalThis);
