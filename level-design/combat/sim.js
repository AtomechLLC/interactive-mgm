/* Ten against ten on a floor plan: the battle simulation, with no drawing in it (battle.js draws, sim-test.js runs it in node).
   The map is a ../shared/plan.js plan: units walk room to room through the doors, and a shot needs a clear line that
   only crosses walls at a doorway. Each unit follows one lane to the middle of the map, then hunts the nearest enemy.
   Every unit type has a weapon plus one behaviour or power that matches its token (see ROSTER). A dead unit respawns
   in its spawn room after RESPAWN seconds, and spawn rooms are safe ground; the first team to `goal` kills wins.

   The ideal session this is judged against (SCRIPT below, measured by battle.script()), not the win rate:
   the squads meet in the middle third of the map; every lane sees fighting; Long Dock kills happen at range and
   Pump Tunnels kills up close; the middle doorway changes hands; and most kills land in the killer's favoured moment.

   Damage is contextual, not equal. Every token has one favoured moment (EDGE below): a place, a range or a state of
   its target in which its hits count for about double, and outside which they count for less than normal. The
   imbalance is meant to be sharp, so a token dominates when the map or its squad hands it that moment and loses
   when it is caught outside it.

   Telegraphed powers can be answered: units walk out of a grenade or stomp circle, sidestep an aimed shot once its
   line locks, plasma bolts fly straight and miss a target that has moved, and a psion's confusion is a channel that
   damage interrupts. Slowed, rooted, stunned or simply slow units fail those answers, which is what makes set-ups matter.

   A map may also carry environmental features (maps.js), and every use of one is counted per token in battle.use:
   windows (shots pass, units do not), vents (only small units fit), ledges (a one-way drop off high ground), high
   rooms (a quarter more reach and 15% more damage shooting down, 15% less taken from below), cover (halves shots that cross it; blasts,
   melee and shots from above ignore it), dark rooms (a unit inside is seen only up close, when marked, or when it
   has just fired), posts (where a holding unit sets up) and hazards. Hazards are the movement patterns from the
   PvE hazards page: a crushing door, a patrolling cart, a rotating arm, a flame across a corridor and expansive
   fuel drums. They hurt both squads. Units wait for them and step out of them, so a hazard mostly kills whoever
   has been slowed, rooted, stunned or confused, and that kill is credited to the token that set it up.

   FPSSIM.create(map, { seed, goal, swap, midShut, bench }) returns the battle; battle.step(dt) advances it.
   swap puts each squad in the other spawn, midShut walls up the middle doorway, bench is a list of unit keys left out. */
(function (root) {
  const TAU = Math.PI * 2, RESPAWN = 3, GUARD = 1.5, SIGHT = 640, LOCK = .3, SH_WAIT = 1.2, SH_REGEN = 14;
  const LANES = ['long', 'mid', 'tun'];
  const SCALE = .36;   // pace only: how long a battle lasts. Who wins a fight is decided by EDGE.
  // each token's favoured moment: [label shown on a favoured hit, the moment in words]
  const EDGE = {
    'rifleman': ['sweet spot', 'at two to four and a half tiles, the range a rifle is built for'],
    'heavy-gunner': ['planted', 'once it has stood still for a moment; on the move its fire is wild'],
    'riot-shield': ['point blank', 'inside a tile and a half, where the shield has already won the approach'],
    'marksman': ['long shot', 'at six tiles or more; inside three tiles the scope is a handicap'],
    'grenadier': ['confined', 'when the blast goes off in the tunnels or a connector, where there is nowhere to go'],
    'rocketeer': ['armour', 'against the mech; rockets are wasted on small targets'],
    'drone-operator': ['marked', 'against a target its drone or a rifleman has marked'],
    'k9-handler': ['held', 'while the dog holds the target in place'],
    'commander': ['with the squad', 'with three or more squadmates beside it; alone it is the weakest gun on the map'],
    'trooper': ['focus fire', 'on a target a squadmate hit a moment ago, or one already burning'],
    'mech': ['open ground', 'in the middle lane; in the tunnels and connectors it cannot bring its guns to bear'],
    'hover-drone': ['flank', 'from behind its target'],
    'cyborg': ['rush', 'on the charge and for two seconds after it lands'],
    'xeno-swarm': ['bleeding', 'on a target that is already bleeding from its leap'],
    'psion': ['mind-locked', 'on a confused target'],
    'cloaker': ['isolated', 'on a target with no squadmate within three tiles'],
    'blinker': ['blink strike', 'in the second and a half after a blink'],
  };
  const SCRIPT = [
    ['front', 'Squads meet in the middle third', 'of deaths in the middle third'],
    ['lanes', 'Every lane sees fighting', 'of deaths in the quietest lane'],
    ['range', 'Long Dock at range, tunnels up close', 'tiles: typical kill distance, long lane and tunnels'],
    ['mid', 'The middle doorway changes hands', 'changes of holder'],
    ['edge', 'Kills land in a favoured moment', 'of kills came from the killer’s favoured moment'],
  ];
  // lines only some maps ask for (map.script lists the keys a map is judged on)
  const LINES = Object.fromEntries(SCRIPT.map(l => [l[0], l]));
  LINES.feat = ['feat', 'Every feature earns its place', 'features changed the fighting'];
  LINES.haz = ['haz', 'Hazards decide fights, not the battle', 'of deaths were caused by a hazard'];
  // what a feature is counted in: [battle.use tag, unit]
  const COUNT = { high: ['high', 'damage dealt from above'], cover: ['cover', 'damage stopped by cover'], window: ['window', 'damage dealt through glass'], dark: ['dark', 'damage dealt to targets in the dark'], vent: ['vent', 'trips through the vent'], room: ['room', 'trips through it'] };
  // lane = weights for [long, mid, tunnels]. shot: bullet (instant), bolt (plasma projectile), rail (aimed), rocket, arc (psion), melee, none.
  const ROSTER = [
    // modern
    { key: 'rifleman', team: 0, band: .45, name: 'Rifleman', hp: 100, spd: 92, range: 240, dmg: 11, rate: .32, shot: 'bullet', lane: [3, 2, 3], pow: 'mark', cd: 8, does: 'Baseline rifle. Marks its target, so the whole squad deals 25% more damage to it.' },
    { key: 'heavy-gunner', team: 0, plant: true, name: 'Heavy Gunner', hp: 150, spd: 68, range: 215, dmg: 6, rate: .11, shot: 'bullet', lane: [1, 3, 1], pow: 'suppress', cd: 8, does: 'Slow, with a fast-firing machine gun. Suppressing fire slows every enemy in a cone.' },
    { key: 'riot-shield', team: 0, block: 45, name: 'Riot Shield', hp: 170, spd: 84, range: 105, dmg: 9, rate: .4, shot: 'bullet', close: true, lane: [0, 2, 5], pow: 'bash', cd: 6, does: 'Leads the push through the tunnels. Its shield stops 70% of damage from the front, but absorbing drains the shield’s stamina. At zero the shield drops, and it comes back once the stamina has refilled halfway, which only starts after a moment without blocking. A bash stuns.' },
    { key: 'marksman', team: 0, name: 'Marksman', hp: 80, spd: 80, range: 520, dmg: 95, rate: 1.9, shot: 'rail', aim: .75, hold: true, lane: [8, 1, 0], does: 'Takes the long lane and holds at range. The aim line locks a moment before the shot, so a quick target can sidestep it; a slow, rooted or stunned one cannot.' },
    { key: 'medic', team: 0, name: 'Medic', hp: 90, spd: 96, range: 180, dmg: 7, rate: .4, shot: 'bullet', heals: 17, lane: [2, 2, 2], does: 'Follows the most wounded squadmate and heals them with a beam. Shoots only when nobody needs help.' },
    { key: 'grenadier', team: 0, name: 'Grenadier', hp: 100, spd: 88, range: 250, dmg: 9, rate: .36, shot: 'bullet', lane: [0, 1, 6], pow: 'grenade', cd: 4.5, does: 'Lobs a grenade at a marked circle. Enemies walk out of it if they can, so it lands on the slowed, rooted and stunned.' },
    { key: 'rocketeer', team: 0, name: 'Rocketeer', hp: 95, spd: 82, range: 330, dmg: 64, rate: 2.7, shot: 'rocket', big: true, lane: [4, 2, 1], does: 'Fires slow rockets that splash. Picks the toughest enemy in view, and its warhead is built for armour.' },
    { key: 'drone-operator', team: 0, name: 'Drone Operator', hp: 85, spd: 86, range: 210, dmg: 8, rate: .34, shot: 'bullet', lane: [3, 2, 3], pow: 'recon', cd: 7, does: 'Sends a recon drone over the walls. It marks everyone near where it lands, including a cloaked enemy.' },
    { key: 'k9-handler', team: 0, name: 'K9 Handler', hp: 100, spd: 90, range: 220, dmg: 10, rate: .34, shot: 'bullet', lane: [1, 1, 4], pow: 'dog', cd: 7, does: 'Releases a dog that runs an enemy down, bites and roots it in place.' },
    { key: 'commander', team: 0, name: 'Commander', hp: 115, spd: 88, range: 220, dmg: 10, rate: .36, shot: 'bullet', leads: true, lane: [1, 2, 1], pow: 'rally', cd: 11, does: 'Stays with the biggest group. Squadmates nearby fire 20% faster, and a rally call speeds them up.' },
    // sci-fi
    { key: 'trooper', team: 1, name: 'Trooper', hp: 100, spd: 92, range: 240, dmg: 17, rate: .36, shot: 'bolt', lane: [3, 2, 3], pow: 'overcharge', cd: 7, does: 'Baseline plasma rifle. Bolts fly straight, so a moving target at range can be missed. Every few seconds it fires an overcharged bolt that sets the target burning.' },
    { key: 'mech', team: 1, name: 'Mech', hp: 330, spd: 58, range: 235, dmg: 12, rate: .22, shot: 'bolt', size: 1.45, lane: [1, 4, 0], pow: 'stomp', cd: 6, does: 'Three units’ worth of health and a slow walk down the middle. It winds up a stomp that knocks down everyone still next to it. Too slow to sidestep aimed shots or rockets.' },
    { key: 'hover-drone', team: 1, fly: true, crawl: true, flank: true, name: 'Hover Drone', hp: 60, spd: 150, range: 175, dmg: 9, rate: .15, shot: 'bolt', dodge: .3, size: .85, lane: [3, 0, 3], does: 'Fast and fragile, always on an outer lane. 30% of shots miss it.' },
    { key: 'shield-drone', team: 1, fly: true, crawl: true, name: 'Shield Drone', hp: 80, spd: 110, range: 0, dmg: 0, rate: 1, shot: 'none', bubble: 72, size: .85, lane: [1, 3, 1], does: 'Unarmed. Floats behind the toughest squadmate in the field (usually the mech) and projects a bubble; shots from outside it deal half damage.' },
    { key: 'cyborg', team: 1, name: 'Cyborg', hp: 185, spd: 100, range: 30, dmg: 27, rate: .5, shot: 'melee', close: true, lane: [0, 2, 5], pow: 'charge', cd: 6, does: 'A melee bruiser. Charges across a room, knocks its target down, then stays on top of it.' },
    { key: 'xeno-swarm', team: 1, crawl: true, clones: 3, size: .8, name: 'Xeno Swarm', hp: 55, spd: 128, range: 26, dmg: 6, rate: .22, shot: 'melee', close: true, lane: [0, 1, 6], pow: 'leap', cd: 5, does: 'Three bodies in one roster slot. They spawn together, take the same lane, and each leaps onto a target and leaves it bleeding. Killing one body scores nothing: the kill counts when the last of the three falls, and then all three come back together.' },
    { key: 'psion', team: 1, name: 'Psion', hp: 80, spd: 86, range: 270, dmg: 19, rate: .7, shot: 'arc', lane: [3, 2, 1], pow: 'confuse', cd: 7, does: 'Attacks with arcs of energy. Channels a confusion on one enemy, who then wanders and cannot act. Any damage to the psion breaks the channel.' },
    { key: 'cloaker', team: 1, name: 'Cloaker', hp: 75, spd: 104, range: 160, dmg: 17, rate: .3, shot: 'bolt', cloak: true, lane: [3, 0, 3], does: 'Invisible until it fires or an enemy comes very close. Its first shot out of cloak deals triple damage.' },
    { key: 'repair-bot', team: 1, crawl: true, name: 'Repair Bot', hp: 85, spd: 100, range: 150, dmg: 9, rate: .45, shot: 'bolt', heals: 17, size: .85, lane: [1, 3, 1], does: 'Follows whoever is missing the most health (usually the mech) and repairs them with a beam.' },
    { key: 'blinker', team: 1, name: 'Blinker', hp: 95, spd: 94, range: 220, dmg: 17, rate: .36, shot: 'bolt', lane: [3, 1, 3], pow: 'blink', cd: 5, does: 'Teleports to a new angle on its target and strikes hard in the moment after.' },
  ];
  const TEAMS = ['Modern', 'Sci-fi'];

  function rng(seed) { let s = seed >>> 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function create(map, opt = {}) {
    const R = rng(opt.seed || 1), goal = opt.goal || 100, scale = opt.scale || SCALE;
    const rooms = map.P.rooms, ids = Object.keys(rooms), doors = map.P.doors;
    const adj = {}; ids.forEach(id => adj[id] = []);
    const kd = map.keyDoor || ['MidW', 'MidE'], midDoor = doors.find(d => d.a === kd[0] && d.b === kd[1]), bases = opt.swap ? [map.bases[1], map.bases[0]] : map.bases;
    doors.forEach(d => { if (opt.midShut && d === midDoor) return; adj[d.a].push({ to: d.b, d }); adj[d.b].push({ to: d.a, d }); });
    const inRoom = (r, x, y) => {
      if (r.circle) return Math.hypot(x - r.circle[0], y - r.circle[1]) <= r.circle[2];
      let c = false; const p = r.pts;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
      return c;
    };
    const roomAt = (x, y, hint) => { if (hint && inRoom(rooms[hint], x, y)) return hint; for (const id of ids) if (inRoom(rooms[id], x, y)) return id; return null; };
    // what a doorway lets through. mode 'see' is a shot or a look, 'walk' is a unit moving now, 'plan' is a route (a crusher
    // door that is shut for a moment still belongs on a route). A window passes shots only, a vent passes small units only,
    // a ledge is a one-way drop from room d.a (fliers ignore that).
    const can = (e, from, u, mode) => {
      const k = e.d.kind; if (e.d.shut && mode !== 'plan') return false;
      if (mode === 'see') return k !== 'vent';
      return k === 'window' ? false : k === 'vent' ? !!(u && u.def.crawl) : k === 'ledge' ? e.d.a === from || !!(u && u.def.fly) : true;
    };
    // a clear line: every sample is on a floor, and each change of room happens at a doorway between those two rooms
    let via = null;   // set by los(): 'window' or 'ledge' if the line crossed one
    function los(a, b, mode = 'see', u) {
      const L = dist(a, b), n = Math.max(1, Math.ceil(L / 7)); let cur = roomAt(a.x, a.y, a.room); via = null;
      if (!cur) return false;
      for (let i = 1; i <= n; i++) {
        const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n, r = roomAt(x, y, cur);
        if (!r) return false;
        if (r !== cur) { const e = adj[cur].find(e => e.to === r && can(e, cur, u, mode) && Math.hypot(e.d.m[0] - x, e.d.m[1] - y) < e.d.gw / 2 + 5); if (!e) return false; if (e.d.kind === 'window' || e.d.kind === 'ledge') via = e.d.kind; cur = r; }
      }
      return true;
    }
    function roomPath(from, to, u) {
      if (from === to) return [];
      const prev = { [from]: null }, q = [from];
      while (q.length) { const c = q.shift(); if (c === to) break; for (const e of (u && u.def.crawl ? crawlAdj : adj)[c]) if (!(e.to in prev) && can(e, c, u, 'plan')) { prev[e.to] = { c, d: e.d }; q.push(e.to); } }
      if (!(to in prev)) return null;
      const out = []; let c = to; while (prev[c]) { out.unshift(prev[c].d); c = prev[c].c; } return out;
    }
    const crawlAdj = {}; ids.forEach(id => crawlAdj[id] = [...adj[id]].sort((a, b) => (b.d.kind === 'vent') - (a.d.kind === 'vent')));   // small units try a vent first
    const cover = (map.cover || []).map(c => ({ x: c[0], y: c[1], room: roomAt(c[0], c[1]) }));
    const high = id => !!(rooms[id] && rooms[id].high);
    // a shooter on high ground reaches a quarter further at a target below
    const reach = (u, e) => u.def.range * (high(u.room) && !high(e.room) ? 1.25 : 1);
    const spot = (id, pad = 22) => { const r = rooms[id]; for (let i = 0; i < 30; i++) { const xs = r.pts.map(p => p[0]), ys = r.pts.map(p => p[1]); const x = Math.min(...xs) + pad + R() * (Math.max(...xs) - Math.min(...xs) - pad * 2), y = Math.min(...ys) + pad + R() * (Math.max(...ys) - Math.min(...ys) - pad * 2); if (inRoom(r, x, y)) return { x, y }; } return { x: r.c[0], y: r.c[1] }; };

    const B = { t: 0, score: [0, 0], goal, over: false, winner: -1, units: [], shots: [], zones: [], fx: [], feed: [], deaths: [], midFlips: 0, midHold: -1, first: null, rooms, los, teams: TEAMS, opt, midDoor, map, use: {}, haz: [], danger: [], hzDeaths: 0 };
    const note = (tag, u, amt) => { const t = B.use[tag] = B.use[tag] || {}; t[u.def.key] = (t[u.def.key] || 0) + amt; };
    const fx = (type, o) => { B.fx.push({ type, age: 0, ttl: .4, ...o }); if (B.fx.length > 160) B.fx.shift(); };

    ROSTER.forEach((def, i) => {
      if ((opt.bench || []).includes(def.key)) return;
      // a token with clones is several bodies sharing one roster slot (pack): they respawn together and score as one
      for (let c = 0; c < (def.clones || 1); c++) {
        const u = { id: B.units.length, def, team: def.team, hpMax: def.hp, kills: 0, deaths: 0, off: (R() - .5) * .6, st: {}, pack: def.clones ? def.key : null };
        B.units.push(u); spawn(u, true);
      }
    });
    function spawn(u, first) {
      const base = bases[u.team], p = spot(base);
      Object.assign(u, { x: p.x, y: p.y, room: base, hp: u.hpMax, alive: true, dead: 0, face: bases[u.team] === map.bases[1] ? Math.PI : 0, evade: null, side: null, chan: null, wind: 0, shotCd: R() * .4, powCd: (u.def.cd || 0) * (.3 + R() * .5), think: R() * .2, target: null, heal: null, path: [], goalPt: null, phase: 'lane', aim: null, dash: null, lastFire: -9, st: { guard: first ? 0 : GUARD } });
      const w = u.def.lane, tot = w[0] + w[1] + w[2]; let k = R() * tot, li = 0; while (k > w[li]) { k -= w[li]; li++; }
      if (u.pack) { const m = B.units.find(m => m !== u && m.pack === u.pack && m.team === u.team && m.bornT === B.t); if (m) li = m.li; }   // the pack takes one lane
      u.li = li; u.bornT = B.t;
      const route = map.lanes[LANES[li]]; u.lane = LANES[li]; u.route = (u.team ? !opt.swap : !!opt.swap) ? [...route].reverse() : [...route]; u.ri = 1; u.wander = 0;
      u.sh = u.def.block || 0; u.broken = false; u.half = bases[u.team] === map.bases[0] ? 0 : 1; u.post = null; u.hz = {};
      if (map.posts) { const ps = map.posts.filter(p => p.side === u.half && p.keys.includes(u.def.key)); if (ps.length) { u.post = ps[Math.floor(R() * ps.length)]; if (LANES.includes(map.laneOf[u.post.room])) u.lane = map.laneOf[u.post.room]; } }
    }
    const foes = u => B.units.filter(e => e.alive && e.team !== u.team);
    const mates = u => B.units.filter(e => e.alive && e.team === u.team && e !== u);
    const cloaked = e => e.def.cloak && B.t - e.lastFire > 2 && !(e.st.marked > 0);
    // a unit in a dark room shows only up close, when marked, or for a moment after it fires
    const dim = e => rooms[e.room].dark && !(e.st.marked > 0) && B.t - e.lastFire > .8;
    const hidden = (e, u) => (cloaked(e) && dist(e, u) > 80) || (dim(e) && dist(e, u) > 130);
    const held = (src, tgt) => { tgt.ctrlBy = src; tgt.ctrlT = B.t; };   // who slowed, rooted, stunned or confused it last
    const busy = u => u.st.stun > 0 || u.st.confuse > 0;
    // a spawn room is safe ground: nobody in their own spawn can be hurt, targeted or hunted, and nobody shoots from inside one
    const home = u => u.room === bases[u.team];

    // how much a hit counts for, given who is hitting whom, where and in what state (see EDGE)
    function edge(u, e, kind) {
      const tiles = dist(u, e) / 40, lane = map.laneOf[e.room], tight = lane === 'tun' || lane === 'link';
      switch (u.def.key) {
        case 'rifleman': return tiles >= 2 && tiles <= 4.5 ? 1.7 : .7;
        case 'heavy-gunner': return B.t - (u.movedT || 0) > .7 ? 1.8 : .5;
        case 'riot-shield': return tiles < 1.6 ? 2.4 : .5;
        case 'marksman': return tiles >= 6 ? 1.8 : tiles < 3 ? .4 : 1;
        case 'grenadier': return kind === 'blast' && tight ? 1.9 : .7;
        case 'rocketeer': return e.def.size > 1.2 ? 2.2 : .8;
        case 'drone-operator': return e.st.marked > 0 ? 1.9 : .6;
        case 'k9-handler': return e.st.root > 0 ? 2.2 : .75;
        case 'commander': { const n = mates(u).filter(m => dist(u, m) < 130).length; return n >= 3 ? 1.9 : n ? .9 : .5; }
        case 'trooper': return e.st.burn > 0 || (e.hitBy && e.hitBy !== u && e.hitBy.team === u.team && B.t - e.hitT < .6) ? 1.7 : .8;
        case 'mech': return lane === 'mid' ? 1.5 : tight ? .5 : .9;
        case 'hover-drone': { let da = Math.atan2(u.y - e.y, u.x - e.x) - e.face; da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))); return da > 2 ? 2.4 : .6; }
        case 'cyborg': return u.st.rush > 0 || u.dash ? 2 : .8;
        case 'xeno-swarm': return e.st.bleed > 0 ? 1.9 : .7;
        case 'psion': return e.st.confuse > 0 ? 2.6 : .7;
        case 'cloaker': return foes(u).some(m => m !== e && dist(m, e) < 120) ? .6 : 1.8;
        case 'blinker': return u.st.amp > 0 ? 2.2 : .6;
      }
      return .8;
    }
    function hurt(src, tgt, amt, kind, from) {
      if (!tgt.alive || tgt.st.guard > 0 || home(tgt) || B.over) return 0;
      if (tgt.def.dodge && kind !== 'dot' && kind !== 'blast' && R() < tgt.def.dodge) { fx('text', { x: tgt.x, y: tgt.y - 18, text: 'miss', ttl: .5 }); return 0; }
      amt *= scale;
      let fav = false;
      if (kind !== 'dot') {
        const m = edge(src, tgt, kind); amt *= m; fav = m >= 1.4;
        if (fav && B.t - (src.edgeT || -9) > 1.4) { src.edgeT = B.t; fx('text', { x: tgt.x, y: tgt.y - 22, text: EDGE[src.def.key][0], ttl: .8, team: src.team }); }
        src.dealt = (src.dealt || 0) + amt; if (fav) src.dealtFav = (src.dealtFav || 0) + amt;
        tgt.hitBy = src; tgt.hitFav = fav;
      }
      if (tgt.st.marked > 0) amt *= 1.25;
      const tags = [];
      if (kind === 'shot' && from && from.room) {
        const up = high(from.room) && !high(tgt.room);
        if (up) { amt *= 1.15; tags.push('high'); } else if (high(tgt.room) && !high(from.room)) amt *= .85;
        // cover: a crate between the shooter and a target standing against it stops half the shot
        if (cover.length && !up) { const L = dist(from, tgt); for (const c of cover) { const k = Math.hypot(c.x - tgt.x, c.y - tgt.y); if (k < 30 && k > 1 && L > k + 20 && ((c.x - tgt.x) * (from.x - tgt.x) + (c.y - tgt.y) * (from.y - tgt.y)) / (k * L) > .6) { amt *= .5; note('cover', tgt, amt); tgt.coverT = B.t; break; } } }
        if (map.glass && los(from, tgt) && via === 'window') tags.push('window');
      }
      if (kind !== 'dot' && rooms[tgt.room].dark) tags.push('dark');
      tags.forEach(t => note(t, src, Math.min(amt, tgt.hp)));
      if (kind !== 'dot') { tgt.foeBy = src; tgt.foeT = B.t; if (drums.length) spark(tgt.x, tgt.y, src, kind === 'blast' || tgt.st.burn > 0 ? 1 : .12, 46); }
      // the shield absorbs 70% of a frontal hit out of its stamina; when the stamina runs out the shield drops
      if (tgt.def.block && from && kind !== 'dot' && !busy(tgt) && !tgt.broken) {
        let da = Math.atan2(from.y - tgt.y, from.x - tgt.x) - tgt.face; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < 1.15) {
          const soak = Math.min(amt * .7, tgt.sh); amt -= soak; tgt.sh -= soak; tgt.blockT = B.t;
          if (tgt.sh <= .01) { tgt.sh = 0; tgt.broken = true; fx('text', { x: tgt.x, y: tgt.y - 22, text: 'shield down', ttl: .9 }); }
        }
      }
      if (from && kind !== 'dot') for (const s of B.units) if (s.alive && s.team === tgt.team && s.def.bubble && !busy(s) && dist(s, tgt) <= s.def.bubble && dist(s, from) > s.def.bubble) { amt *= .5; s.soakT = B.t; break; }
      tgt.hp -= amt; tgt.hitT = B.t;
      if (tgt.hp <= 0) kill(src, tgt, kind);
      return amt;
    }
    // src is null when a hazard kills a unit nobody set up: the death counts, the kill is nobody's
    function kill(src, tgt, kind, hz) {
      tgt.alive = false; tgt.target = null; tgt.aim = null; tgt.dash = null;
      const pack = tgt.pack ? B.units.filter(m => m.pack === tgt.pack && m.team === tgt.team) : null;
      if (pack && pack.some(m => m.alive)) { tgt.dead = 1e9; fx('dead', { x: tgt.x, y: tgt.y, ttl: .8, team: tgt.team }); return false; }   // one body of a pack: no score until the last falls
      (pack || [tgt]).forEach(m => m.dead = RESPAWN); tgt.deaths++;
      if (src) { src.kills++; B.score[src.team]++; }
      B.deaths.push({ x: tgt.x, y: tgt.y, team: tgt.team, room: tgt.room, d: src ? dist(src, tgt) : 0, kind, hz: hz ? hz.type : null, fav: hz ? false : kind === 'dot' ? !!tgt.hitFav && tgt.hitBy === src : !!tgt.hitFav });
      fx('dead', { x: tgt.x, y: tgt.y, ttl: 1.4, team: tgt.team });
      B.feed.unshift({ t: B.t, k: src ? src.id : -1, v: tgt.id, kind, hz: hz ? hz.name : null }); if (B.feed.length > 6) B.feed.pop();
      if (!B.first && src) B.first = { k: src.id, v: tgt.id };
      if (src && B.score[src.team] >= goal) { B.over = true; B.winner = src.team; }
      return true;
    }
    /* ---- hazards: each is a pure function of the clock, as on the PvE hazards page ---- */
    (map.hazards || []).forEach(h => (h.type === 'barrel' ? h.at.map(p => ({ ...h, x: p[0], y: p[1], state: 'idle', t: 0 })) : [{ ...h }]).forEach(o => { o.i = B.haz.length; if (o.type === 'crush') o.d = doors.find(d => d.a === o.door[0] && d.b === o.door[1]); B.haz.push(o); }));
    const drums = B.haz.filter(h => h.type === 'barrel');
    // a hit or a blast near an idle drum may light its fuse
    function spark(x, y, by, chance, r) { for (const b of drums) if (b.state === 'idle' && Math.hypot(b.x - x, b.y - y) < r && (chance >= 1 || R() < chance)) { b.state = 'fuse'; b.t = b.fuse || .8; b.by = by; } }
    function hazHurt(u, amt, h, stun, by) {
      if (!u.alive || u.st.guard > 0 || home(u) || B.over) return;
      const cc = (u.st.root > 0 || u.st.stun > 0 || u.st.slow > 0 || u.st.confuse > 0) && u.ctrlBy && u.ctrlBy.team !== u.team && B.t - u.ctrlT < 4 ? u.ctrlBy : null;
      u.hp -= amt; u.hitT = B.t; u.hz[h.i] = B.t; if (stun) u.st.stun = Math.max(u.st.stun || 0, stun);
      note('hz:' + h.type + ':hit', u, amt);
      if (u.hp > 0) return;
      // the kill goes to whoever lit the drum, else whoever held the victim in place, else whoever hit it in the last three seconds
      const credit = by && by.team !== u.team ? by : cc || (u.foeBy && u.foeBy.team !== u.team && B.t - u.foeT < 3 ? u.foeBy : null);
      if (kill(credit, u, 'hazard', h)) { B.hzDeaths++; note('hz:' + h.type + ':death', u, 1); if (credit) note('hz:' + h.type + ':setup', credit, 1); }
    }
    const hits = (u, x, y, r) => u.alive && Math.hypot(u.x - x, u.y - y) < r + 8 * (u.def.size || 1);
    const across = (z, n) => u => { const k = (u.x - z.x) * n[0] + (u.y - z.y) * n[1] >= 0 ? 1 : -1; return [n[0] * k, n[1] * k]; };
    function hazards(dt) {
      const D = B.danger = [];
      const push = (x, y, r, h, dir) => D.push({ x, y, r, h, floor: !!h.floor, dir });
      for (const h of B.haz) {
        if (h.type === 'crush') {   // Crushing: a door that slams shut
          const ph = (B.t + (h.phase || 0)) % h.period, open = h.period - h.shut, was = h.d.shut, d = h.d;
          d.shut = ph >= open; h.warn = !d.shut && ph >= open - h.warnT; h.k = d.shut ? 1 : h.warn ? (ph - (open - h.warnT)) / h.warnT : 0;
          if (d.shut || h.warn) { const z = { x: d.m[0], y: d.m[1] }; push(z.x, z.y, d.gw / 2 + 4, h, across(z, [-d.e[1], d.e[0]])); }
          if (d.shut && !was) B.units.forEach(u => { if (hits(u, d.m[0], d.m[1], d.gw / 2 - 4)) hazHurt(u, h.dmg || 85, h, .9); });
        } else if (h.type === 'patrol') {   // Patrolling: a machine that runs back and forth
          const w = (B.t + (h.phase || 0)) / h.period * TAU, k = (1 - Math.cos(w)) / 2, vk = Math.sin(w) * Math.PI / h.period;
          h.x = h.a[0] + (h.b[0] - h.a[0]) * k; h.y = h.a[1] + (h.b[1] - h.a[1]) * k;
          const vx = (h.b[0] - h.a[0]) * vk, vy = (h.b[1] - h.a[1]) * vk, L = Math.hypot(h.b[0] - h.a[0], h.b[1] - h.a[1]), n = [-(h.b[1] - h.a[1]) / L, (h.b[0] - h.a[0]) / L];
          [0, .35, .7].forEach(t => { const z = { x: h.x + vx * t, y: h.y + vy * t }; push(z.x, z.y, h.r, h, across(z, n)); });
          B.units.forEach(u => { if (!u.def.fly && hits(u, h.x, h.y, h.r) && B.t - (u.hz[h.i] || -9) > 1) hazHurt(u, h.dmg || 45, h, .5); });
        } else if (h.type === 'rotor') {   // Rotation: an arm that sweeps a room
          h.ang = (B.t + (h.phase || 0)) / h.period * TAU;
          const out = u => { const dx = u.x - h.x, dy = u.y - h.y, L = Math.hypot(dx, dy) || 1; const v = [dx / L * .8 - dy / L * .6, dy / L * .8 + dx / L * .6]; return v; };
          for (let arm = 0; arm < 2; arm++) for (const look of [0, .3, .6]) for (let r = 26; r <= h.len; r += 24) { const a = h.ang + arm * Math.PI + look; push(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 11, h, out); }
          B.units.forEach(u => {
            if (u.def.fly || !u.alive || B.t - (u.hz[h.i] || -9) < 1) return;
            const dx = u.x - h.x, dy = u.y - h.y, L = Math.hypot(dx, dy); if (L > h.len + 6) return;
            for (let arm = 0; arm < 2; arm++) { const a = h.ang + arm * Math.PI, al = dx * Math.cos(a) + dy * Math.sin(a), pr = Math.abs(dx * Math.sin(a) - dy * Math.cos(a)); if (al > -4 && pr < 5 + 8 * (u.def.size || 1)) { hazHurt(u, h.dmg || 40, h, .4); break; } }
          });
        } else if (h.type === 'jet') {   // Across: a flame out of a wall that turns on and off
          const cyc = h.on + h.off, ph = (B.t + (h.phase || 0)) % cyc; h.live = ph < h.on; h.warn = ph >= cyc - h.warnT; h.k = h.warn ? (ph - (cyc - h.warnT)) / h.warnT : 0;
          const dx = h.b[0] - h.a[0], dy = h.b[1] - h.a[1], L = Math.hypot(dx, dy), n = [-dy / L, dx / L];
          if (h.live || h.warn) for (let k = 0; k <= L; k += 20) { const z = { x: h.a[0] + dx * k / L, y: h.a[1] + dy * k / L }; push(z.x, z.y, h.w, h, across(z, n)); }
          if (h.live) B.units.forEach(u => { if (!u.alive) return; const al = ((u.x - h.a[0]) * dx + (u.y - h.a[1]) * dy) / L, pr = Math.abs((u.x - h.a[0]) * n[0] + (u.y - h.a[1]) * n[1]); if (al > -6 && al < L + 6 && pr < h.w) hazHurt(u, (h.dmg || 70) * dt, h, 0); });
        } else if (h.type === 'barrel') {   // Expansive: a fuel drum that goes off when the fight reaches it
          if (h.state === 'fuse') {
            push(h.x, h.y, h.r - 14, h, u => { const dx = u.x - h.x, dy = u.y - h.y, L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; });
            if ((h.t -= dt) <= 0) {
              h.state = 'gone'; h.t = h.back || 14; fx('boom', { x: h.x, y: h.y, r: h.r, ttl: .5 });
              B.units.forEach(u => { const k = Math.hypot(u.x - h.x, u.y - h.y); if (u.alive && k < h.r) hazHurt(u, (h.dmg || 70) * (1 - .5 * k / h.r), h, .4, h.by); });
              drums.forEach(b => { if (b !== h && b.state === 'idle' && Math.hypot(b.x - h.x, b.y - h.y) < h.r + 30) { b.state = 'fuse'; b.t = .35; b.by = h.by; } });
            }
          } else if (h.state === 'gone' && (h.t -= dt) <= 0) h.state = 'idle';
        }
      }
    }
    // the first danger circle a unit at (x, y) would be standing in; fliers pass over the ones on the floor
    const threat = (u, x, y, pad) => B.danger.find(z => !(u.def.fly && z.floor) && Math.hypot(x - z.x, y - z.y) < z.r + pad);
    // the spot behind a crate that puts it between this unit and its target
    function coverSpot(u, tgt) {
      let best = null, bd = 130;
      for (const c of cover) {
        if (c.room !== u.room) continue; const L = Math.hypot(c.x - tgt.x, c.y - tgt.y); if (L < 50) continue;
        const p = { x: c.x + (c.x - tgt.x) / L * 19, y: c.y + (c.y - tgt.y) / L * 19, room: u.room }, k = dist(u, p);
        if (k < bd && roomAt(p.x, p.y, u.room) === u.room && dist(p, tgt) <= reach(u, tgt) * .95 && !B.units.some(m => m !== u && m.alive && m.team === u.team && dist(m, p) < 14)) { bd = k; best = p; }
      }
      return best;
    }
    const blast = (src, x, y, r, dmg) => { fx('burst', { x, y, r, team: src.team, ttl: .45 }); if (drums.length) spark(x, y, src, 1, r + 10); foes(src).forEach(e => { const d = Math.hypot(e.x - x, e.y - y); if (d < r) hurt(src, e, dmg * (1 - .5 * d / r), 'blast', { x, y }); }); };
    const canDodge = u => u.alive && !busy(u) && !(u.st.root > 0) && !u.dash && !u.aim && !u.chan && !(u.wind > 0);
    // a straight shot: flies from a toward b and on to `reach`, and stops at the first wall
    const bolt = (u, e, o) => { const L = dist(u, e) || 1; B.shots.push({ type: 'bolt', src: u, x: u.x, y: u.y, vx: (e.x - u.x) / L, vy: (e.y - u.y) / L, room: u.room, left: u.def.range * 1.25, team: u.team, ang: Math.atan2(e.y - u.y, e.x - u.x), ...o }); };

    function fire(u, e) {
      const d = u.def; let dmg = d.dmg;
      if (d.cloak && B.t - u.lastFire > 2) { dmg *= 3; fx('text', { x: u.x, y: u.y - 20, text: 'ambush', ttl: .7 }); }
      u.lastFire = B.t;
      if (d.shot === 'bullet') { const k = dist(u, e) / reach(u, e), fall = k < .5 ? 1 : 1 - .6 * (k - .5) / .5;   // bullets lose up to 60% of their damage over the far half of their range
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
          foes(u).forEach(f => { let da = Math.atan2(f.y - u.y, f.x - u.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .5 && dist(u, f) < 220 && los(u, f)) { f.st.slow = 2.5; held(u, f); hurt(u, f, 9, 'shot', u); } }); used();
        } break;
        case 'bash': if (e && de < 36) { e.st.stun = 1.2; held(u, e); fx('burst', { x: e.x, y: e.y, r: 22, team: u.team, ttl: .3 }); hurt(u, e, 22, 'melee', u); used(); } break;
        case 'grenade': if (e && de < 300 && de > 70) { B.shots.push({ type: 'grenade', src: u, x: u.x, y: u.y, sx: u.x, sy: u.y, tx: e.x, ty: e.y, fuse: .95, t: 0, team: u.team }); B.zones.push({ kind: 'grenade', x: e.x, y: e.y, r: 62, t: .95, t0: .95, team: u.team }); used(); } break;
        case 'recon': { let best = null, bd = 460; B.units.forEach(f => { if (f.alive && f.team !== u.team) { const k = dist(u, f); if (k < bd) { bd = k; best = f; } } }); if (best) { B.shots.push({ type: 'drone', src: u, x: u.x, y: u.y, tx: best.x, ty: best.y, spd: 400, team: u.team }); used(); } } break;
        case 'dog': if (e && de < 320 && de > 50) { B.shots.push({ type: 'dog', src: u, tgt: e, x: u.x, y: u.y, spd: 330, life: 3, team: u.team }); used(); } break;
        case 'rally': { const near = mates(u).filter(m => dist(u, m) < 130); if (e && near.length >= 1) { [u, ...near].forEach(m => m.st.haste = 3.5); fx('ring', { x: u.x, y: u.y, r: 130, team: u.team, ttl: .6 }); used(); } } break;
        case 'overcharge': if (e && de < d.range) { bolt(u, e, { big: true, spd: 520, dmg: 34, burn: 3 }); used(); } break;
        case 'stomp': if (foes(u).some(f => dist(u, f) < 70)) { u.wind = .6; B.zones.push({ kind: 'stomp', x: u.x, y: u.y, r: 86, t: .6, t0: .6, team: u.team, src: u }); used(); } break;
        case 'charge': if (e && de > 60 && de < 280 && los(u, e, 'walk', u)) { u.dash = { tgt: e, spd: 520, hit: 40, stun: .7, arc: false, x0: u.x, y0: u.y }; fx('dash', { x: u.x, y: u.y, x2: e.x, y2: e.y, team: u.team, ttl: .5 }); used(); } break;
        case 'leap': if (e && de > 45 && de < 175 && los(u, e, 'walk', u)) { u.dash = { tgt: e, spd: 430, hit: 12, bleed: 4, arc: true, x0: u.x, y0: u.y }; fx('leap', { x: u.x, y: u.y, x2: e.x, y2: e.y, team: u.team, ttl: .5 }); used(); } break;
        case 'confuse': if (e && de < d.range && !(e.st.confuse > 0)) { u.chan = { tgt: e, t: .7, t0: .7, at: B.t }; used(); } break;
        case 'blink': if (e) {
          for (let i = 0; i < 12; i++) {
            const a = R() * TAU, r = 80 + R() * 80, p = { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r }; p.room = roomAt(p.x, p.y);
            if (p.room && !bases.includes(p.room) && roomAt(p.x + 10, p.y) && roomAt(p.x - 10, p.y) && roomAt(p.x, p.y + 10) && roomAt(p.x, p.y - 10) && los(p, e)) {
              fx('blink', { x: u.x, y: u.y, x2: p.x, y2: p.y, team: u.team, ttl: .5 });
              u.x = p.x; u.y = p.y; u.room = p.room; u.path = []; u.st.amp = 2.5; used(); break;
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
        if (d.hold && dd < reach(u, e)) s += 300 - e.hp + (e.def.size > 1.2 ? 250 : 0) + (e.st.root > 0 || e.st.stun > 0 || e.st.slow > 0 ? 200 : 0);   // marksman: whoever cannot sidestep (the mech, anyone held in place), then whoever one shot will finish
        if (d.cloak) s -= e.hpMax + (foes(u).some(m => m !== e && dist(m, e) < 120) ? 200 : 0);   // cloaker: soft targets, isolated first
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
      else if (u.post && !(tgt && dist(u, tgt) < reach(u, tgt))) { if (dist(u, u.post) > 14) g = { x: u.post.x, y: u.post.y, room: u.post.room }; }   // a holding unit sets up on its post
      else if (tgt) {
        const dd = dist(u, tgt), cv = cover.length && !d.close && !d.hold && !d.flank && dd <= reach(u, tgt) ? coverSpot(u, tgt) : null;
        const flank = d.flank && tgt.room === u.room ? { x: tgt.x - Math.cos(tgt.face) * 70, y: tgt.y - Math.sin(tgt.face) * 70 } : null;
        if (flank && roomAt(flank.x, flank.y, u.room) === u.room && dist(u, flank) > 24) g = { ...flank, room: u.room };   // hover drone: get behind it
        else if (cv) g = dist(u, cv) > 6 ? cv : null;                                                                 // fight from behind a crate
        else if (d.close || dd > reach(u, tgt) * (d.band || .85)) g = { x: tgt.x, y: tgt.y, room: tgt.room };
        else if (d.plant) g = null;                                                                                    // heavy gunner: stand and fire
        else if (!d.hold && (u.wander -= .2) <= 0) { u.wander = .8 + R() * .8; const p = { x: u.x + (R() - .5) * 70, y: u.y + (R() - .5) * 70 }; if (roomAt(p.x, p.y, u.room) === u.room) g = { ...p, room: u.room }; }
        else g = u.goalPt && u.goalPt.room === u.room && !d.hold ? u.goalPt : null;
        if (u.phase === 'lane') u.phase = 'hunt';
      } else if (u.phase === 'lane') {
        if (u.room === u.route[u.ri]) { u.ri++; u.lanePt = null; if (u.ri > u.route.length >> 1) u.phase = 'hunt'; }
        if (u.phase === 'lane') { const id = u.route[u.ri]; if (!u.lanePt || u.lanePt.room !== id) u.lanePt = { ...spot(id, 26), room: id }; g = u.lanePt; }
      }
      if (!g && !tgt && !u.retreat && u.phase === 'hunt' && !u.post) {
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
      const rp = g ? roomPath(u.room, g.room, u) : null; if (!rp) g = null;
      u.goalPt = g;
      u.path = g ? [...rp.map(dr => ({ x: dr.m[0] + dr.e[0] * dr.gw * u.off, y: dr.m[1] + dr.e[1] * dr.gw * u.off })), { x: g.x, y: g.y }] : [];
      if (!busy(u) && d.pow && u.powCd <= 0 && !home(u)) power(u);
    }

    // a unit changes room: count a trip through a vent, a drop off a ledge, or an entry into a room a feature watches
    function enter(u, r) {
      if (r === u.room) return;
      const e = adj[u.room].find(e => e.to === r && Math.hypot(e.d.m[0] - u.x, e.d.m[1] - u.y) < e.d.gw / 2 + 14);
      if (e && e.d.kind === 'vent') note('vent', u, 1); else if (e && e.d.kind === 'ledge') note('drop', u, 1);
      if (map.watch && map.watch.includes(r)) note('room:' + r, u, 1);
      u.room = r;
    }
    function moveTo(u, x, y, step) {
      const dx = x - u.x, dy = y - u.y, L = Math.hypot(dx, dy);
      if (L > .01) { u.mv = Math.atan2(dy, dx); if (step > .01) u.movedT = B.t; }
      if (L <= step) { u.x = x; u.y = y; return true; }
      u.x += dx / L * step; u.y += dy / L * step; return false;
    }

    B.step = dt => {
      if (B.over) { B.fx.forEach(f => f.age += dt); B.fx = B.fx.filter(f => f.age < f.ttl); return; }
      B.t += dt;
      if (B.haz.length) hazards(dt);
      for (const u of B.units) {
        if (!u.alive) { if ((u.dead -= dt) <= 0) spawn(u); continue; }
        const st = u.st, d = u.def;
        for (const k in st) if (st[k] > 0) st[k] -= dt;
        if (st.burn > 0) hurt(st.burnBy, u, 6 * dt, 'dot'); if (!u.alive) continue;
        if (st.bleed > 0) hurt(st.bleedBy, u, 6 * dt, 'dot'); if (!u.alive) continue;
        u.shotCd -= dt; u.powCd -= dt;
        // shield stamina refills like stamina: nothing for a moment after the last block, then steadily; a dropped shield is back at half
        if (d.block && u.sh < d.block && B.t - (u.blockT || -9) > SH_WAIT) { u.sh = Math.min(d.block, u.sh + SH_REGEN * dt); if (u.broken && u.sh >= d.block / 2) u.broken = false; }
        if (u.broken) B.shieldDown = (B.shieldDown || 0) + dt;
        if (home(u) && u.hp < u.hpMax) u.hp = Math.min(u.hpMax, u.hp + 45 * dt);   // resupply in the spawn room
        if (st.stun > 0) { u.aim = null; u.dash = null; u.chan = null; u.wind = 0; continue; }
        if (u.wind > 0) { u.wind -= dt; continue; }
        if (u.chan) {   // psion: a channel the target's squad can break by hurting the psion or by breaking the line
          const c = u.chan, e = c.tgt;
          if (!e.alive || home(e) || u.hitT > c.at || !los(u, e)) { if (u.hitT > c.at) fx('text', { x: u.x, y: u.y - 20, text: 'interrupted', ttl: .7 }); u.chan = null; u.powCd = Math.min(u.powCd, 2.5); }
          else if ((c.t -= dt) <= 0) { e.st.confuse = 2.5; held(u, e); e.aim = null; e.chan = null; fx('arc', { x: u.x, y: u.y, x2: e.x, y2: e.y, team: u.team, ttl: .35 }); u.chan = null; }
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
            hurt(u, e, u.dash.hit, 'melee', u); if (u.dash.stun) { e.st.stun = Math.max(e.st.stun || 0, u.dash.stun); held(u, e); } if (u.dash.bleed) { e.st.bleed = u.dash.bleed; e.st.bleedBy = u; }
            fx('burst', { x: e.x, y: e.y, r: 20, team: u.team, ttl: .25 }); if (!u.dash.arc) u.st.rush = 2; u.dash = null;
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
          const z = B.zones.find(z => z.team !== u.team && z.t0 - z.t > .2 && Math.hypot(u.x - z.x, u.y - z.y) < z.r + 8), hz = !z && B.danger.length ? threat(u, u.x, u.y, 10) : null;
          let dir = null;
          if (z) { const L = Math.hypot(u.x - z.x, u.y - z.y); dir = L > 1 ? [(u.x - z.x) / L, (u.y - z.y) / L] : [Math.cos(u.id), Math.sin(u.id)]; }
          else if (hz) dir = hz.dir(u);
          else if (u.side && (u.side.t -= dt) > 0) dir = u.side.dir; else u.side = null;
          if (dir) for (const [cx, cy] of [dir, [-dir[1], dir[0]], [dir[1], -dir[0]]]) {
            const nx = u.x + cx * sp * dt, ny = u.y + cy * sp * dt, r = roomAt(nx + cx * 8, ny + cy * 8, u.room);
            if (r && (r === u.room || adj[u.room].some(a => a.to === r && can(a, u.room, u, 'walk') && Math.hypot(a.d.m[0] - nx, a.d.m[1] - ny) < a.d.gw / 2)) && r !== bases[1 - u.team]) { u.x = nx; u.y = ny; u.movedT = B.t; enter(u, roomAt(nx, ny, u.room) || u.room); dodging = true; break; }
          }
        }
        // move (not while lining up a shot)
        if (!dodging && !u.aim && !(st.root > 0) && u.path.length) {
          const w = u.path[0]; let clear = true;
          // wait for a hazard instead of walking into it
          if (B.danger.length) { const L = Math.hypot(w.x - u.x, w.y - u.y) || 1, k = Math.min(L, 14); clear = !threat(u, u.x + (w.x - u.x) / L * k, u.y + (w.y - u.y) / L * k, 12); }
          if (clear && moveTo(u, w.x, w.y, sp * dt)) u.path.shift();
          const r = roomAt(u.x, u.y, u.room); if (r) enter(u, r);
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
        } else if (e && u.shotCd <= 0 && dist(u, e) <= reach(u, e) + 4 && !(d.heals && u.heal)) {
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
            if (s.type === 'dog') { hurt(s.src, e, 30, 'melee', s); e.st.root = 1.6; held(s.src, e); fx('burst', { x: e.x, y: e.y, r: 18, team: s.team, ttl: .25 }); }
            else { hurt(s.src, e, s.dmg, 'shot', s.src); if (s.burn && e.alive) { e.st.burn = s.burn; e.st.burnBy = s.src; } }
            return false;
          }
          s.x += dx / L * st; s.y += dy / L * st; return true;
        }
        if (s.type === 'rocket' || s.type === 'drone') {
          const dx = s.tx - s.x, dy = s.ty - s.y, L = Math.hypot(dx, dy), st = s.spd * dt; s.ang = Math.atan2(dy, dx);
          const nx = s.x + dx / (L || 1) * st, ny = s.y + dy / (L || 1) * st;
          if (L <= st || (s.type === 'rocket' && !roomAt(nx, ny))) {
            if (s.type === 'rocket') blast(s.src, s.x, s.y, 48, s.dmg);
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
        if (z.kind === 'stomp') { fx('ring', { x: z.x, y: z.y, r: z.r, team: z.team, ttl: .4 }); foes(z.src).forEach(f => { if (Math.hypot(f.x - z.x, f.y - z.y) < z.r) { f.st.stun = .9; held(z.src, f); hurt(z.src, f, 30, 'blast', z); } }); }
        return false;
      });
      // who holds the middle doorway: the squad with more units standing near it, sampled twice a second
      if (midDoor && !opt.midShut && (B.midT = (B.midT || 0) - dt) <= 0) {
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
      const med = l => { const a = D.filter(k => map.laneOf[k.room] === l && k.room !== 'An' && k.room !== 'Bn' && k.room !== 'As' && k.room !== 'Bs' && k.kind !== 'dot' && k.kind !== 'hazard').map(k => k.d).sort((p, q) => p - q); return a.length ? a[a.length >> 1] / 40 : 0; };
      const lg = med('long'), tn = med('tun'), fought = D.filter(k => k.kind !== 'hazard'), fn = fought.length || 1;
      const F = B.features(), used = F.filter(f => f.met).length, hz = B.hzDeaths / n;
      return { feat: [`${used} of ${F.length}`, F.length > 0 && used === F.length], haz: [Math.round(hz * 100) + '%', hz >= .04 && hz <= .3], front: [Math.round(mid3 * 100) + '%', mid3 >= .45], lanes: [Math.round(quiet * 100) + '%', quiet >= .15], range: [lg.toFixed(1) + ' and ' + tn.toFixed(1), lg >= tn * 1.5 && lg > 0], mid: [opt.midShut ? 'walled up' : String(B.midFlips), !opt.midShut && B.midFlips >= 6], edge: [Math.round(fought.filter(k => k.fav).length / fn * 100) + '%', fought.filter(k => k.fav).length / fn >= .5], thirds: [0, 1, 2].map(t => D.filter(k => third(k.x) === t).length / n), n: D.length };
    };
    // every feature of the map, with how much it was used and by whom: { ...feature, val, unit, top: [[key, amount]...], met }
    B.features = () => (map.features || []).map(f => {
      const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0), top = o => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (f.hz) { const dead = B.use['hz:' + f.hz + ':death'], set = B.use['hz:' + f.hz + ':setup'], hit = B.use['hz:' + f.hz + ':hit']; return { ...f, val: Math.round(sum(hit)), deaths: sum(dead), unit: 'damage dealt by it', top: top(set), caught: top(hit), met: sum(hit) >= (f.min || 1) }; }
      const [tag, unit] = COUNT[f.kind], o = B.use[f.kind === 'room' ? 'room:' + f.room : tag];
      return { ...f, val: Math.round(sum(o)), unit, top: top(o), met: sum(o) >= (f.min || 1) };
    });
    B.lines = (map.script || ['front', 'lanes', 'range', 'mid', 'edge']).map(k => LINES[k]);
    B.cloaked = cloaked;
    return B;
  }
  root.FPSSIM = { create, ROSTER, TEAMS, SCRIPT, EDGE, LINES };
})(typeof window !== 'undefined' ? window : globalThis);
