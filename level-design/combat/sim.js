/* Ten against ten on a floor plan: the battle simulation, with no drawing in it (battle.js draws, sim-test.js runs it in node).
   The map is a ../shared/plan.js plan: units walk room to room through the doors, and a shot needs a clear line that
   only crosses walls at a doorway. Each unit follows one lane to the middle of the map, then hunts the nearest enemy.
   Every unit type has a weapon plus one behaviour or power that matches its token (see ROSTER). A dead unit respawns
   in its spawn room after RESPAWN seconds, and spawn rooms are safe ground; the first team to `goal` kills wins.

   The ideal session this is judged against (SCRIPT below, measured by battle.script()), not the win rate:
   the squads meet in the middle third of the map; every lane sees fighting; Long Dock kills happen at range and
   Pump Tunnels kills up close; and the middle doorway changes hands. Both squads use one damage scale.

   Telegraphed powers can be answered: units walk out of a grenade or stomp circle, sidestep an aimed shot once its
   line locks, plasma bolts fly straight and miss a target that has moved, and a psion's confusion is a channel that
   damage interrupts. Slowed, rooted, stunned or simply slow units fail those answers, which is what makes set-ups matter.

   FPSSIM.create(map, { seed, goal, swap, midShut, bench }) returns the battle; battle.step(dt) advances it.
   swap puts each squad in the other spawn, midShut walls up the middle doorway, bench is a list of unit keys left out. */
(function (root) {
  const TAU = Math.PI * 2, RESPAWN = 3, GUARD = 1.5, SIGHT = 640, LOCK = .3;
  const LANES = ['long', 'mid', 'tun'];
  const SCALE = .36;   // one damage scale for both squads: it sets how long a battle lasts, never who wins
  const SCRIPT = [
    ['front', 'Squads meet in the middle third', 'of deaths in the middle third'],
    ['lanes', 'Every lane sees fighting', 'of deaths in the quietest lane'],
    ['range', 'Long Dock at range, tunnels up close', 'tiles: typical kill distance, long lane and tunnels'],
    ['mid', 'The middle doorway changes hands', 'changes of holder'],
  ];
  // lane = weights for [long, mid, tunnels]. shot: bullet (instant), bolt (plasma projectile), rail (aimed), rocket, arc (psion), melee, none.
  const ROSTER = [
    // modern
    { key: 'rifleman', team: 0, name: 'Rifleman', hp: 100, spd: 92, range: 240, dmg: 11, rate: .32, shot: 'bullet', lane: [3, 2, 3], pow: 'mark', cd: 8, does: 'Baseline rifle. Marks its target, so the whole squad deals 25% more damage to it.' },
    { key: 'heavy-gunner', team: 0, name: 'Heavy Gunner', hp: 150, spd: 68, range: 215, dmg: 6, rate: .11, shot: 'bullet', lane: [1, 3, 1], pow: 'suppress', cd: 8, does: 'Slow, with a fast-firing machine gun. Suppressing fire slows every enemy in a cone.' },
    { key: 'riot-shield', team: 0, name: 'Riot Shield', hp: 170, spd: 84, range: 105, dmg: 9, rate: .4, shot: 'bullet', close: true, lane: [0, 2, 5], pow: 'bash', cd: 6, does: 'Leads the push through the tunnels. Its shield stops 70% of damage from the front; a bash stuns.' },
    { key: 'marksman', team: 0, name: 'Marksman', hp: 80, spd: 80, range: 520, dmg: 95, rate: 1.9, shot: 'rail', aim: .75, hold: true, lane: [8, 1, 0], does: 'Takes the long lane and holds at range. The aim line locks a moment before the shot, so a quick target can sidestep it; a slow, rooted or stunned one cannot.' },
    { key: 'medic', team: 0, name: 'Medic', hp: 90, spd: 96, range: 180, dmg: 7, rate: .4, shot: 'bullet', heals: 17, lane: [2, 2, 2], does: 'Follows the most wounded squadmate and heals them with a beam. Shoots only when nobody needs help.' },
    { key: 'grenadier', team: 0, name: 'Grenadier', hp: 100, spd: 88, range: 250, dmg: 9, rate: .36, shot: 'bullet', lane: [1, 2, 4], pow: 'grenade', cd: 4.5, does: 'Lobs a grenade at a marked circle. Enemies walk out of it if they can, so it lands on the slowed, rooted and stunned.' },
    { key: 'rocketeer', team: 0, name: 'Rocketeer', hp: 95, spd: 82, range: 330, dmg: 64, rate: 2.7, shot: 'rocket', big: true, lane: [4, 2, 1], does: 'Fires slow rockets that splash. Picks the toughest enemy in view, and its warhead deals double damage to the mech.' },
    { key: 'drone-operator', team: 0, name: 'Drone Operator', hp: 85, spd: 86, range: 210, dmg: 8, rate: .34, shot: 'bullet', lane: [3, 2, 3], pow: 'recon', cd: 7, does: 'Sends a recon drone over the walls. It marks everyone near where it lands, including a cloaked enemy.' },
    { key: 'k9-handler', team: 0, name: 'K9 Handler', hp: 100, spd: 90, range: 220, dmg: 10, rate: .34, shot: 'bullet', lane: [1, 1, 4], pow: 'dog', cd: 7, does: 'Releases a dog that runs an enemy down, bites and roots it in place.' },
    { key: 'commander', team: 0, name: 'Commander', hp: 115, spd: 88, range: 220, dmg: 10, rate: .36, shot: 'bullet', leads: true, lane: [1, 2, 1], pow: 'rally', cd: 11, does: 'Stays with the biggest group. Squadmates nearby fire 20% faster, and a rally call speeds them up.' },
    // sci-fi
    { key: 'trooper', team: 1, name: 'Trooper', hp: 100, spd: 92, range: 240, dmg: 17, rate: .36, shot: 'bolt', lane: [3, 2, 3], pow: 'overcharge', cd: 7, does: 'Baseline plasma rifle. Bolts fly straight, so a moving target at range can be missed. Every few seconds it fires an overcharged bolt that sets the target burning.' },
    { key: 'mech', team: 1, name: 'Mech', hp: 330, spd: 58, range: 235, dmg: 12, rate: .22, shot: 'bolt', size: 1.45, lane: [1, 4, 0], pow: 'stomp', cd: 6, does: 'Three units’ worth of health and a slow walk down the middle. It winds up a stomp that knocks down everyone still next to it. Too slow to sidestep aimed shots or rockets.' },
    { key: 'hover-drone', team: 1, name: 'Hover Drone', hp: 60, spd: 150, range: 175, dmg: 9, rate: .15, shot: 'bolt', dodge: .3, size: .85, lane: [3, 0, 3], does: 'Fast and fragile, always on an outer lane. 30% of shots miss it.' },
    { key: 'shield-drone', team: 1, name: 'Shield Drone', hp: 80, spd: 110, range: 0, dmg: 0, rate: 1, shot: 'none', bubble: 72, size: .85, lane: [1, 3, 1], does: 'Unarmed. Floats behind the toughest squadmate in the field (usually the mech) and projects a bubble; shots from outside it deal half damage.' },
    { key: 'cyborg', team: 1, name: 'Cyborg', hp: 185, spd: 100, range: 30, dmg: 27, rate: .5, shot: 'melee', close: true, lane: [0, 2, 5], pow: 'charge', cd: 6, does: 'A melee bruiser. Charges across a room, knocks its target down, then stays on top of it.' },
    { key: 'xeno-swarm', team: 1, name: 'Xeno Swarm', hp: 125, spd: 128, range: 26, dmg: 11, rate: .22, shot: 'melee', close: true, lane: [0, 1, 6], pow: 'leap', cd: 5, does: 'Rushes through the tunnels, leaps onto a target and leaves it bleeding.' },
    { key: 'psion', team: 1, name: 'Psion', hp: 80, spd: 86, range: 270, dmg: 19, rate: .7, shot: 'arc', lane: [3, 2, 1], pow: 'confuse', cd: 7, does: 'Attacks with arcs of energy. Channels a confusion on one enemy, who then wanders and cannot act. Any damage to the psion breaks the channel.' },
    { key: 'cloaker', team: 1, name: 'Cloaker', hp: 75, spd: 104, range: 160, dmg: 17, rate: .3, shot: 'bolt', cloak: true, lane: [3, 0, 3], does: 'Invisible until it fires or an enemy comes very close. Its first shot out of cloak deals triple damage.' },
    { key: 'repair-bot', team: 1, name: 'Repair Bot', hp: 85, spd: 100, range: 150, dmg: 9, rate: .45, shot: 'bolt', heals: 17, size: .85, lane: [1, 3, 1], does: 'Follows whoever is missing the most health (usually the mech) and repairs them with a beam.' },
    { key: 'blinker', team: 1, name: 'Blinker', hp: 95, spd: 94, range: 220, dmg: 17, rate: .36, shot: 'bolt', lane: [3, 1, 3], pow: 'blink', cd: 5, does: 'Teleports to a new angle on its target and deals 50% more damage for a moment after.' },
  ];
  const TEAMS = ['Modern', 'Sci-fi'];

  function rng(seed) { let s = seed >>> 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function create(map, opt = {}) {
    const R = rng(opt.seed || 1), goal = opt.goal || 100, scale = opt.scale || SCALE;
    const rooms = map.P.rooms, ids = Object.keys(rooms), doors = map.P.doors;
    const adj = {}; ids.forEach(id => adj[id] = []);
    const midDoor = doors.find(d => d.a === 'MidW' && d.b === 'MidE'), bases = opt.swap ? [map.bases[1], map.bases[0]] : map.bases;
    doors.forEach(d => { if (opt.midShut && d === midDoor) return; adj[d.a].push({ to: d.b, d }); adj[d.b].push({ to: d.a, d }); });
    const inRoom = (r, x, y) => {
      if (r.circle) return Math.hypot(x - r.circle[0], y - r.circle[1]) <= r.circle[2];
      let c = false; const p = r.pts;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
      return c;
    };
    const roomAt = (x, y, hint) => { if (hint && inRoom(rooms[hint], x, y)) return hint; for (const id of ids) if (inRoom(rooms[id], x, y)) return id; return null; };
    // a clear line: every sample is on a floor, and each change of room happens at a doorway between those two rooms
    function los(a, b) {
      const L = dist(a, b), n = Math.max(1, Math.ceil(L / 7)); let cur = roomAt(a.x, a.y, a.room);
      if (!cur) return false;
      for (let i = 1; i <= n; i++) {
        const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n, r = roomAt(x, y, cur);
        if (!r) return false;
        if (r !== cur) { if (!adj[cur].some(e => e.to === r && Math.hypot(e.d.m[0] - x, e.d.m[1] - y) < e.d.gw / 2 + 5)) return false; cur = r; }
      }
      return true;
    }
    function roomPath(from, to) {
      if (from === to) return [];
      const prev = { [from]: null }, q = [from];
      while (q.length) { const c = q.shift(); if (c === to) break; for (const e of adj[c]) if (!(e.to in prev)) { prev[e.to] = { c, d: e.d }; q.push(e.to); } }
      const out = []; let c = to; while (prev[c]) { out.unshift(prev[c].d); c = prev[c].c; } return out;
    }
    const spot = (id, pad = 22) => { const r = rooms[id]; for (let i = 0; i < 30; i++) { const xs = r.pts.map(p => p[0]), ys = r.pts.map(p => p[1]); const x = Math.min(...xs) + pad + R() * (Math.max(...xs) - Math.min(...xs) - pad * 2), y = Math.min(...ys) + pad + R() * (Math.max(...ys) - Math.min(...ys) - pad * 2); if (inRoom(r, x, y)) return { x, y }; } return { x: r.c[0], y: r.c[1] }; };

    const B = { t: 0, score: [0, 0], goal, over: false, winner: -1, units: [], shots: [], zones: [], fx: [], feed: [], deaths: [], midFlips: 0, midHold: -1, first: null, rooms, los, teams: TEAMS, opt, midDoor };
    const fx = (type, o) => { B.fx.push({ type, age: 0, ttl: .4, ...o }); if (B.fx.length > 160) B.fx.shift(); };

    ROSTER.forEach((def, i) => {
      if ((opt.bench || []).includes(def.key)) return;
      const u = { id: B.units.length, def, team: def.team, hpMax: def.hp, kills: 0, deaths: 0, off: (R() - .5) * .6, st: {} };
      B.units.push(u); spawn(u, true);
    });
    function spawn(u, first) {
      const base = bases[u.team], p = spot(base);
      Object.assign(u, { x: p.x, y: p.y, room: base, hp: u.hpMax, alive: true, dead: 0, face: bases[u.team] === map.bases[1] ? Math.PI : 0, evade: null, side: null, chan: null, wind: 0, shotCd: R() * .4, powCd: (u.def.cd || 0) * (.3 + R() * .5), think: R() * .2, target: null, heal: null, path: [], goalPt: null, phase: 'lane', aim: null, dash: null, lastFire: -9, st: { guard: first ? 0 : GUARD } });
      const w = u.def.lane, tot = w[0] + w[1] + w[2]; let k = R() * tot, li = 0; while (k > w[li]) { k -= w[li]; li++; }
      const route = map.lanes[LANES[li]]; u.lane = LANES[li]; u.route = (u.team ? !opt.swap : !!opt.swap) ? [...route].reverse() : [...route]; u.ri = 1; u.wander = 0;
    }
    const foes = u => B.units.filter(e => e.alive && e.team !== u.team);
    const mates = u => B.units.filter(e => e.alive && e.team === u.team && e !== u);
    const cloaked = e => e.def.cloak && B.t - e.lastFire > 2 && !(e.st.marked > 0);
    const hidden = (e, u) => cloaked(e) && dist(e, u) > 80;
    const busy = u => u.st.stun > 0 || u.st.confuse > 0;
    // a spawn room is safe ground: nobody in their own spawn can be hurt, targeted or hunted, and nobody shoots from inside one
    const home = u => u.room === bases[u.team];

    function hurt(src, tgt, amt, kind, from) {
      if (!tgt.alive || tgt.st.guard > 0 || home(tgt) || B.over) return 0;
      if (tgt.def.dodge && kind !== 'dot' && kind !== 'blast' && R() < tgt.def.dodge) { fx('text', { x: tgt.x, y: tgt.y - 18, text: 'miss', ttl: .5 }); return 0; }
      amt *= scale;
      if (tgt.st.marked > 0) amt *= 1.25;
      if (tgt.def.key === 'riot-shield' && from && kind !== 'dot' && !busy(tgt)) {
        let da = Math.atan2(from.y - tgt.y, from.x - tgt.x) - tgt.face; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < 1.15) { amt *= .3; tgt.blockT = B.t; }
      }
      if (from && kind !== 'dot') for (const s of B.units) if (s.alive && s.team === tgt.team && s.def.bubble && !busy(s) && dist(s, tgt) <= s.def.bubble && dist(s, from) > s.def.bubble) { amt *= .5; s.soakT = B.t; break; }
      tgt.hp -= amt; tgt.hitT = B.t;
      if (tgt.hp <= 0) kill(src, tgt, kind);
      return amt;
    }
    function kill(src, tgt, kind) {
      tgt.alive = false; tgt.dead = RESPAWN; tgt.deaths++; tgt.target = null; tgt.aim = null; tgt.dash = null;
      src.kills++; B.score[src.team]++;
      B.deaths.push({ x: tgt.x, y: tgt.y, team: tgt.team, room: tgt.room, d: dist(src, tgt), kind });
      fx('dead', { x: tgt.x, y: tgt.y, ttl: 1.4, team: tgt.team });
      B.feed.unshift({ t: B.t, k: src.id, v: tgt.id, kind }); if (B.feed.length > 6) B.feed.pop();
      if (!B.first) B.first = { k: src.id, v: tgt.id };
      if (B.score[src.team] >= goal) { B.over = true; B.winner = src.team; }
    }
    const blast = (src, x, y, r, dmg, armour) => { fx('burst', { x, y, r, team: src.team, ttl: .45 }); foes(src).forEach(e => { const d = Math.hypot(e.x - x, e.y - y); if (d < r) hurt(src, e, dmg * (1 - .5 * d / r) * (armour && e.def.size > 1.2 ? 2 : 1), 'blast', { x, y }); }); };
    const canDodge = u => u.alive && !busy(u) && !(u.st.root > 0) && !u.dash && !u.aim && !u.chan && !(u.wind > 0);
    // a straight shot: flies from a toward b and on to `reach`, and stops at the first wall
    const bolt = (u, e, o) => { const L = dist(u, e) || 1; B.shots.push({ type: 'bolt', src: u, x: u.x, y: u.y, vx: (e.x - u.x) / L, vy: (e.y - u.y) / L, room: u.room, left: u.def.range * 1.25, team: u.team, ang: Math.atan2(e.y - u.y, e.x - u.x), ...o }); };

    function fire(u, e) {
      const d = u.def; let dmg = d.dmg;
      if (u.st.amp > 0) dmg *= 1.5;
      if (d.cloak && B.t - u.lastFire > 2) { dmg *= 3; fx('text', { x: u.x, y: u.y - 20, text: 'ambush', ttl: .7 }); }
      u.lastFire = B.t;
      if (d.shot === 'bullet') { const k = dist(u, e) / d.range, fall = k < .5 ? 1 : 1 - .6 * (k - .5) / .5;   // bullets lose up to 60% of their damage over the far half of their range
        fx('tracer', { x: u.x, y: u.y, x2: e.x, y2: e.y, team: u.team, ttl: .09, weak: fall < .7 }); hurt(u, e, dmg * fall, 'shot', u); }
      else if (d.shot === 'rail') {
        // the shot follows the locked line (e is the lock point) and hits the first enemy standing on it
        const L = dist(u, e) || 1, ux = (e.x - u.x) / L, uy = (e.y - u.y) / L; let hit = null, hd = 1e9;
        foes(u).forEach(f => { const ax = f.x - u.x, ay = f.y - u.y, al = ax * ux + ay * uy, pr = Math.abs(ax * uy - ay * ux); if (al > 0 && al < d.range * 1.1 && al < hd && pr < 9 + 12 * (f.def.size || 1) && !hidden(f, u) && los(u, f)) { hit = f; hd = al; } });
        const end = hit ? hit : { x: u.x + ux * Math.min(d.range, L + 60), y: u.y + uy * Math.min(d.range, L + 60) };
        fx('rail', { x: u.x, y: u.y, x2: end.x, y2: end.y, team: u.team, ttl: .3 }); if (hit) hurt(u, hit, dmg, 'shot', u); else fx('text', { x: e.x, y: e.y - 18, text: 'dodged', ttl: .6 });
      }
      else if (d.shot === 'arc') { fx('arc', { x: u.x, y: u.y, x2: e.x, y2: e.y, team: u.team, ttl: .22 }); hurt(u, e, dmg, 'shot', u); }
      else if (d.shot === 'melee') { fx('slash', { x: e.x, y: e.y, team: u.team, ttl: .18 }); hurt(u, e, dmg, 'melee', u); }
      else if (d.shot === 'bolt') bolt(u, e, { spd: 760, dmg });
      else if (d.shot === 'rocket') B.shots.push({ type: 'rocket', src: u, x: u.x, y: u.y, tx: e.x, ty: e.y, spd: 300, dmg, team: u.team });
    }
    function power(u) {
      const d = u.def, e = u.target, de = e ? dist(u, e) : 1e9, used = () => { u.powCd = d.cd; };
      switch (d.pow) {
        case 'mark': if (e && de < d.range) { e.st.marked = 4; fx('ping', { x: e.x, y: e.y, r: 26, team: u.team }); used(); } break;
        case 'suppress': if (e && de < d.range) {
          const a = Math.atan2(e.y - u.y, e.x - u.x); fx('cone', { x: u.x, y: u.y, ang: a, r: 220, team: u.team, ttl: .7 });
          foes(u).forEach(f => { let da = Math.atan2(f.y - u.y, f.x - u.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .5 && dist(u, f) < 220 && los(u, f)) { f.st.slow = 2.5; hurt(u, f, 9, 'shot', u); } }); used();
        } break;
        case 'bash': if (e && de < 36) { e.st.stun = 1.2; fx('burst', { x: e.x, y: e.y, r: 22, team: u.team, ttl: .3 }); hurt(u, e, 22, 'melee', u); used(); } break;
        case 'grenade': if (e && de < 300 && de > 70) { B.shots.push({ type: 'grenade', src: u, x: u.x, y: u.y, sx: u.x, sy: u.y, tx: e.x, ty: e.y, fuse: .95, t: 0, team: u.team }); B.zones.push({ kind: 'grenade', x: e.x, y: e.y, r: 62, t: .95, t0: .95, team: u.team }); used(); } break;
        case 'recon': { let best = null, bd = 460; B.units.forEach(f => { if (f.alive && f.team !== u.team) { const k = dist(u, f); if (k < bd) { bd = k; best = f; } } }); if (best) { B.shots.push({ type: 'drone', src: u, x: u.x, y: u.y, tx: best.x, ty: best.y, spd: 400, team: u.team }); used(); } } break;
        case 'dog': if (e && de < 320 && de > 50) { B.shots.push({ type: 'dog', src: u, tgt: e, x: u.x, y: u.y, spd: 330, life: 3, team: u.team }); used(); } break;
        case 'rally': { const near = mates(u).filter(m => dist(u, m) < 130); if (e && near.length >= 1) { [u, ...near].forEach(m => m.st.haste = 3.5); fx('ring', { x: u.x, y: u.y, r: 130, team: u.team, ttl: .6 }); used(); } } break;
        case 'overcharge': if (e && de < d.range) { bolt(u, e, { big: true, spd: 520, dmg: 34, burn: 3 }); used(); } break;
        case 'stomp': if (foes(u).some(f => dist(u, f) < 70)) { u.wind = .6; B.zones.push({ kind: 'stomp', x: u.x, y: u.y, r: 86, t: .6, t0: .6, team: u.team, src: u }); used(); } break;
        case 'charge': if (e && de > 60 && de < 280) { u.dash = { tgt: e, spd: 520, hit: 40, stun: .7, arc: false, x0: u.x, y0: u.y }; fx('dash', { x: u.x, y: u.y, x2: e.x, y2: e.y, team: u.team, ttl: .5 }); used(); } break;
        case 'leap': if (e && de > 45 && de < 175) { u.dash = { tgt: e, spd: 430, hit: 22, bleed: 4, arc: true, x0: u.x, y0: u.y }; fx('leap', { x: u.x, y: u.y, x2: e.x, y2: e.y, team: u.team, ttl: .5 }); used(); } break;
        case 'confuse': if (e && de < d.range && !(e.st.confuse > 0)) { u.chan = { tgt: e, t: .7, t0: .7, at: B.t }; used(); } break;
        case 'blink': if (e) {
          for (let i = 0; i < 12; i++) {
            const a = R() * TAU, r = 80 + R() * 80, p = { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r }; p.room = roomAt(p.x, p.y);
            if (p.room && !bases.includes(p.room) && roomAt(p.x + 10, p.y) && roomAt(p.x - 10, p.y) && roomAt(p.x, p.y + 10) && roomAt(p.x, p.y - 10) && los(p, e)) {
              fx('blink', { x: u.x, y: u.y, x2: p.x, y2: p.y, team: u.team, ttl: .5 });
              u.x = p.x; u.y = p.y; u.room = p.room; u.path = []; u.st.amp = 1.6; used(); break;
            }
          }
        } break;
      }
    }

    function decide(u) {
      const d = u.def, es = foes(u).filter(e => !hidden(e, u) && !(e.st.guard > 0) && !home(e));
      const seen = es.filter(e => dist(u, e) < SIGHT && los(u, e));
      // who to shoot
      let tgt = null, score = -1e9;
      seen.forEach(e => {
        const dd = dist(u, e); let s = -dd;
        if (d.big) s += e.hpMax * 2;                              // rocketeer: the toughest thing in view
        if (d.hold && dd < d.range) s += 300 - e.hp + (e.def.size > 1.2 ? 250 : 0) + (e.st.root > 0 || e.st.stun > 0 || e.st.slow > 0 ? 200 : 0);   // marksman: whoever cannot sidestep (the mech, anyone held in place), then whoever one shot will finish
        if (d.cloak) s -= e.hpMax;                                // cloaker: soft targets
        if (e.st.marked > 0) s += 60;
        if (e === u.target) s += 30;
        if (s > score) { score = s; tgt = e; }
      });
      if (home(u)) tgt = null;   // leave the spawn room before picking a fight
      u.target = tgt;
      // who to heal or follow
      u.heal = null; let lead = null;
      const ms = mates(u);
      if (d.heals) { let need = 0; ms.forEach(m => { const miss = m.hpMax - m.hp; if (miss > 8 && miss > need && dist(u, m) < 420) { need = miss; u.heal = m; } }); lead = u.heal; }
      if ((d.heals || d.bubble || d.leads) && !lead) {
        // the squadmate with the most company (commander), or the fighter nearest the enemy base (supports)
        let best = -1e9; const eb = rooms[bases[1 - u.team]].c;
        ms.forEach(m => { if (m.def.heals || m.def.bubble || m.def.leads || m.def.cloak) return; const s = d.leads ? ms.filter(o => dist(o, m) < 130).length * 100 - dist(u, m) : -Math.hypot(m.x - eb[0], m.y - eb[1]) - dist(u, m) * .5; if (s > best) { best = s; lead = m; } });
      }
      // the shield drone anchors on the toughest squadmate in the field and floats on its sheltered side
      if (d.bubble) { let big = null; ms.forEach(m => { if (!home(m) && !m.def.heals && (!big || m.hpMax > big.hpMax)) big = m; }); if (big) { const hx = rooms[bases[u.team]].c[0] < big.x ? -1 : 1, p = { x: big.x + hx * 34, y: big.y }; lead = roomAt(p.x, p.y, big.room) === big.room ? { ...p, room: big.room } : big; } }
      // where to go
      let g = null;
      // badly hurt and not a brawler: fall back to a healer, or to the spawn room to resupply
      if (!d.close && !d.bubble && (u.hp < u.hpMax * .3 || (u.retreat && u.hp < u.hpMax * .8))) {
        u.retreat = true; const doc = ms.find(m => m.def.heals && dist(u, m) < 260);
        g = doc ? (dist(u, doc) > 50 ? { x: doc.x, y: doc.y, room: doc.room } : null) : (home(u) ? null : { ...(u.homePt = u.homePt || spot(bases[u.team])), room: bases[u.team] });
        if (!doc && home(u)) g = u.goalPt && u.goalPt.room === u.room ? u.goalPt : null;
      } else u.retreat = false;
      if (u.retreat) { /* keeps shooting while backing off */ } else
      if (lead && !(tgt && !d.heals && !d.bubble && dist(u, tgt) < d.range)) { if (dist(u, lead) > (d.heals ? 70 : d.bubble ? 10 : 55)) g = { x: lead.x, y: lead.y, room: lead.room }; }
      else if (tgt) {
        const dd = dist(u, tgt);
        if (d.close || dd > d.range * .85) g = { x: tgt.x, y: tgt.y, room: tgt.room };
        else if (!d.hold && (u.wander -= .2) <= 0) { u.wander = .8 + R() * .8; const p = { x: u.x + (R() - .5) * 70, y: u.y + (R() - .5) * 70 }; if (roomAt(p.x, p.y, u.room) === u.room) g = { ...p, room: u.room }; }
        else g = u.goalPt && u.goalPt.room === u.room && !d.hold ? u.goalPt : null;
        if (u.phase === 'lane') u.phase = 'hunt';
      } else if (u.phase === 'lane') {
        if (u.room === u.route[u.ri]) { u.ri++; u.lanePt = null; if (u.ri > u.route.length >> 1) u.phase = 'hunt'; }
        if (u.phase === 'lane') { const id = u.route[u.ri]; if (!u.lanePt || u.lanePt.room !== id) u.lanePt = { ...spot(id, 26), room: id }; g = u.lanePt; }
      }
      if (!g && !tgt && !u.retreat && u.phase === 'hunt') {
        let best = null, bd = 1e9; es.forEach(e => { const k = dist(u, e) * (map.laneOf[e.room] === u.lane ? 1 : 1.6); if (k < bd) { bd = k; best = e; } });   // an enemy in this unit's own lane counts as nearer
        if (best) g = { x: best.x, y: best.y, room: best.room };
        else { const id = u.route[u.route.length >> 1]; if (!u.lanePt || u.lanePt.room !== id) u.lanePt = { ...spot(id), room: id }; g = u.lanePt; }
      }
      if (g && g.room === bases[1 - u.team]) g = null;   // never walk into the enemy spawn
      // regroup: nobody pushes into the enemy half alone. A unit past the midline with fewer than two squadmates close by waits for them.
      if (g && !tgt && !u.retreat && u.phase === 'hunt') {
        const ex = rooms[bases[1 - u.team]].c[0], far = Math.abs(g.x - ex) < Math.abs(u.x - ex) && Math.abs(u.x - ex) < map.W / 2;
        if (far && ms.filter(m => dist(u, m) < 150).length < 2) g = null;
      }
      u.goalPt = g;
      u.path = g ? [...roomPath(u.room, g.room).map(dr => ({ x: dr.m[0] + dr.e[0] * dr.gw * u.off, y: dr.m[1] + dr.e[1] * dr.gw * u.off })), { x: g.x, y: g.y }] : [];
      if (!busy(u) && d.pow && u.powCd <= 0 && !home(u)) power(u);
    }

    function moveTo(u, x, y, step) {
      const dx = x - u.x, dy = y - u.y, L = Math.hypot(dx, dy);
      if (L > .01) u.mv = Math.atan2(dy, dx);
      if (L <= step) { u.x = x; u.y = y; return true; }
      u.x += dx / L * step; u.y += dy / L * step; return false;
    }

    B.step = dt => {
      if (B.over) { B.fx.forEach(f => f.age += dt); B.fx = B.fx.filter(f => f.age < f.ttl); return; }
      B.t += dt;
      for (const u of B.units) {
        if (!u.alive) { if ((u.dead -= dt) <= 0) spawn(u); continue; }
        const st = u.st, d = u.def;
        for (const k in st) if (st[k] > 0) st[k] -= dt;
        if (st.burn > 0) hurt(st.burnBy, u, 6 * dt, 'dot'); if (!u.alive) continue;
        if (st.bleed > 0) hurt(st.bleedBy, u, 6 * dt, 'dot'); if (!u.alive) continue;
        u.shotCd -= dt; u.powCd -= dt;
        if (home(u) && u.hp < u.hpMax) u.hp = Math.min(u.hpMax, u.hp + 45 * dt);   // resupply in the spawn room
        if (st.stun > 0) { u.aim = null; u.dash = null; u.chan = null; u.wind = 0; continue; }
        if (u.wind > 0) { u.wind -= dt; continue; }
        if (u.chan) {   // psion: a channel the target's squad can break by hurting the psion or by breaking the line
          const c = u.chan, e = c.tgt;
          if (!e.alive || home(e) || u.hitT > c.at || !los(u, e)) { if (u.hitT > c.at) fx('text', { x: u.x, y: u.y - 20, text: 'interrupted', ttl: .7 }); u.chan = null; u.powCd = Math.min(u.powCd, 2.5); }
          else if ((c.t -= dt) <= 0) { e.st.confuse = 2.5; e.aim = null; e.chan = null; fx('arc', { x: u.x, y: u.y, x2: e.x, y2: e.y, team: u.team, ttl: .35 }); u.chan = null; }
          else u.face = Math.atan2(e.y - u.y, e.x - u.x);
          continue;
        }
        if (st.confuse > 0) {   // wander on the spot, do nothing useful
          u.conf = (u.conf || 0) - dt; if (u.conf <= 0) { u.conf = .35; u.mv = R() * TAU; }
          const nx = u.x + Math.cos(u.mv) * 40 * dt, ny = u.y + Math.sin(u.mv) * 40 * dt; if (roomAt(nx, ny, u.room) === u.room) { u.x = nx; u.y = ny; } u.face = u.mv; continue;
        }
        if (u.dash) {
          const e = u.dash.tgt;
          if (!e.alive) u.dash = null;
          else if (moveTo(u, e.x, e.y, u.dash.spd * dt) || dist(u, e) < 20) {
            hurt(u, e, u.dash.hit, 'melee', u); if (u.dash.stun) e.st.stun = Math.max(e.st.stun || 0, u.dash.stun); if (u.dash.bleed) { e.st.bleed = u.dash.bleed; e.st.bleedBy = u; }
            fx('burst', { x: e.x, y: e.y, r: 20, team: u.team, ttl: .25 }); u.dash = null;
          }
          const r = roomAt(u.x, u.y, u.room); if (r) u.room = r; else u.dash = null;
          continue;
        }
        if ((u.think -= dt) <= 0) { u.think = .2; decide(u); }
        const e = u.target && u.target.alive ? u.target : null;
        // heal beam
        if (d.heals && u.heal && u.heal.alive && dist(u, u.heal) < 125 && u.heal.hp < u.heal.hpMax) { u.heal.hp = Math.min(u.heal.hpMax, u.heal.hp + d.heals * dt); u.beamT = B.t; u.beamTo = u.heal; }
        // answer a telegraph first: leave a hostile circle, or step off a locked aim line
        const sp = d.spd * (st.slow > 0 ? .5 : 1) * (st.haste > 0 ? 1.35 : 1);
        let dodging = false;
        if (canDodge(u)) {
          const z = B.zones.find(z => z.team !== u.team && z.t0 - z.t > .2 && Math.hypot(u.x - z.x, u.y - z.y) < z.r + 8);
          let dir = null;
          if (z) { const L = Math.hypot(u.x - z.x, u.y - z.y); dir = L > 1 ? [(u.x - z.x) / L, (u.y - z.y) / L] : [Math.cos(u.id), Math.sin(u.id)]; }
          else if (u.side && (u.side.t -= dt) > 0) dir = u.side.dir; else u.side = null;
          if (dir) for (const [cx, cy] of [dir, [-dir[1], dir[0]], [dir[1], -dir[0]]]) {
            const nx = u.x + cx * sp * dt, ny = u.y + cy * sp * dt, r = roomAt(nx + cx * 8, ny + cy * 8, u.room);
            if (r && (r === u.room || adj[u.room].some(a => a.to === r && Math.hypot(a.d.m[0] - nx, a.d.m[1] - ny) < a.d.gw / 2)) && r !== bases[1 - u.team]) { u.x = nx; u.y = ny; u.room = roomAt(nx, ny, u.room) || u.room; dodging = true; break; }
          }
        }
        // move (not while lining up a shot)
        if (!dodging && !u.aim && !(st.root > 0) && u.path.length) {
          const w = u.path[0]; if (moveTo(u, w.x, w.y, sp * dt)) u.path.shift();
          const r = roomAt(u.x, u.y, u.room); if (r) u.room = r;
        }
        if (e) u.face = Math.atan2(e.y - u.y, e.x - u.x); else if (u.mv != null) u.face = u.mv;
        // shoot
        if (d.shot === 'none' || home(u)) { u.aim = null; continue; }
        if (u.aim) {
          if (!u.aim.tgt.alive || u.aim.tgt.st.guard > 0) u.aim = null;
          else if ((u.aim.t -= dt) <= 0) { const p = u.aim.lock || u.aim.tgt; u.aim = null; fire(u, p); u.shotCd = d.rate; }
          else {
            const a = u.aim;
            // the line locks LOCK seconds before the shot; from then on the target may step off it
            if (!a.lock && a.t <= LOCK) { a.lock = { x: a.tgt.x, y: a.tgt.y }; const ang = Math.atan2(a.tgt.y - u.y, a.tgt.x - u.x) + (R() < .5 ? 1 : -1) * Math.PI / 2; a.tgt.side = { dir: [Math.cos(ang), Math.sin(ang)], t: LOCK }; }
            if (!a.lock && !los(u, a.tgt)) u.aim = null; else { const p = a.lock || a.tgt; u.face = Math.atan2(p.y - u.y, p.x - u.x); }
          }
        } else if (e && u.shotCd <= 0 && dist(u, e) <= d.range + 4 && !(d.heals && u.heal)) {
          if (d.aim) u.aim = { tgt: e, t: d.aim, t0: d.aim };
          else { fire(u, e); const lead = B.units.some(m => m.alive && m.team === u.team && m.def.leads && m !== u && dist(m, u) < 130); u.shotCd = d.rate * (lead ? .8 : 1) * (st.haste > 0 ? .8 : 1); }
        }
      }
      // keep squadmates from standing on one spot
      for (let i = 0; i < B.units.length; i++) for (let j = i + 1; j < B.units.length; j++) {
        const a = B.units[i], b = B.units[j]; if (!a.alive || !b.alive || a.dash || b.dash) continue;
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), min = a.team === b.team ? 20 : 16;
        if (L < min && L > .01) { const k = (min - L) / 2 * .5, px = dx / L * k, py = dy / L * k; if (roomAt(a.x - px, a.y - py, a.room) === a.room) { a.x -= px; a.y -= py; } if (roomAt(b.x + px, b.y + py, b.room) === b.room) { b.x += px; b.y += py; } }
      }
      // projectiles
      B.shots = B.shots.filter(s => {
        if (s.type === 'bolt') {
          const st = s.spd * dt, nx = s.x + s.vx * st, ny = s.y + s.vy * st;
          if ((s.left -= st) <= 0 || !los({ x: s.x, y: s.y, room: s.room }, { x: nx, y: ny })) return false;
          s.x = nx; s.y = ny; s.room = roomAt(nx, ny, s.room);
          const e = B.units.find(f => f.alive && f.team !== s.team && !(f.st.guard > 0) && Math.hypot(f.x - nx, f.y - ny) < 6 + 12 * (f.def.size || 1));
          if (!e) return true;
          hurt(s.src, e, s.dmg, 'shot', s.src); if (s.burn && e.alive) { e.st.burn = s.burn; e.st.burnBy = s.src; }
          return false;
        }
        if (s.type === 'dog') {
          const e = s.tgt; if (!e.alive || (s.life != null && (s.life -= dt) <= 0)) return false;
          const dx = e.x - s.x, dy = e.y - s.y, L = Math.hypot(dx, dy), st = s.spd * dt; s.ang = Math.atan2(dy, dx);
          if (L <= st + 8) {
            if (s.type === 'dog') { hurt(s.src, e, 30, 'melee', s); e.st.root = 1.6; fx('burst', { x: e.x, y: e.y, r: 18, team: s.team, ttl: .25 }); }
            else { hurt(s.src, e, s.dmg, 'shot', s.src); if (s.burn && e.alive) { e.st.burn = s.burn; e.st.burnBy = s.src; } }
            return false;
          }
          s.x += dx / L * st; s.y += dy / L * st; return true;
        }
        if (s.type === 'rocket' || s.type === 'drone') {
          const dx = s.tx - s.x, dy = s.ty - s.y, L = Math.hypot(dx, dy), st = s.spd * dt; s.ang = Math.atan2(dy, dx);
          const nx = s.x + dx / (L || 1) * st, ny = s.y + dy / (L || 1) * st;
          if (L <= st || (s.type === 'rocket' && !roomAt(nx, ny))) {
            if (s.type === 'rocket') blast(s.src, s.x, s.y, 48, s.dmg, true);
            else { fx('ping', { x: s.tx, y: s.ty, r: 90, team: s.team, ttl: .7 }); foes(s.src).forEach(f => { if (Math.hypot(f.x - s.tx, f.y - s.ty) < 90) { f.st.marked = 5; hurt(s.src, f, 8, 'blast', null); } }); }
            return false;
          }
          s.x = nx; s.y = ny; return true;
        }
        if (s.type === 'grenade') { s.t += dt; const k = Math.min(1, s.t / s.fuse); s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k; s.k = k; if (k >= 1) { blast(s.src, s.tx, s.ty, 62, 58); return false; } return true; }
        return false;
      });
      // circles that go off when their timer ends: the stomp (the grenade's blast is carried by its projectile)
      B.zones = B.zones.filter(z => {
        if (z.kind === 'stomp' && (!z.src.alive || z.src.st.stun > 0)) return false;   // a stun cancels the wind-up
        if ((z.t -= dt) > 0) return true;
        if (z.kind === 'stomp') { fx('ring', { x: z.x, y: z.y, r: z.r, team: z.team, ttl: .4 }); foes(z.src).forEach(f => { if (Math.hypot(f.x - z.x, f.y - z.y) < z.r) { f.st.stun = .9; hurt(z.src, f, 30, 'blast', z); } }); }
        return false;
      });
      // who holds the middle doorway: the squad with more units standing near it, sampled twice a second
      if (!opt.midShut && (B.midT = (B.midT || 0) - dt) <= 0) {
        B.midT = .5; const n = [0, 0]; B.units.forEach(u => { if (u.alive && Math.hypot(u.x - midDoor.m[0], u.y - midDoor.m[1]) < 120) n[u.team]++; });
        const h = n[0] > n[1] ? 0 : n[1] > n[0] ? 1 : -1; if (h >= 0) { if (B.midHold >= 0 && h !== B.midHold) B.midFlips++; B.midHold = h; }
      }
      B.fx.forEach(f => f.age += dt); B.fx = B.fx.filter(f => f.age < f.ttl);
    };
    // the battle so far, measured against SCRIPT: [key, value text, met?]
    B.script = () => {
      const D = B.deaths, n = D.length || 1, third = x => x < map.W / 3 ? 0 : x > map.W * 2 / 3 ? 2 : 1;
      const mid3 = D.filter(k => third(k.x) === 1).length / n;
      const share = l => D.filter(k => map.laneOf[k.room] === l).length / n, quiet = Math.min(share('long'), share('mid'), share('tun'));
      const med = l => { const a = D.filter(k => map.laneOf[k.room] === l && k.room !== 'An' && k.room !== 'Bn' && k.room !== 'As' && k.room !== 'Bs' && k.kind !== 'dot').map(k => k.d).sort((p, q) => p - q); return a.length ? a[a.length >> 1] / 40 : 0; };
      const lg = med('long'), tn = med('tun');
      return { front: [Math.round(mid3 * 100) + '%', mid3 >= .45], lanes: [Math.round(quiet * 100) + '%', quiet >= .15], range: [lg.toFixed(1) + ' and ' + tn.toFixed(1), lg >= tn * 1.5 && lg > 0], mid: [opt.midShut ? 'walled up' : String(B.midFlips), !opt.midShut && B.midFlips >= 6], thirds: [0, 1, 2].map(t => D.filter(k => third(k.x) === t).length / n), n: D.length };
    };
    B.cloaked = cloaked;
    return B;
  }
  root.FPSSIM = { create, ROSTER, TEAMS, SCRIPT };
})(typeof window !== 'undefined' ? window : globalThis);
