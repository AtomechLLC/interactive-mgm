/* Build Orders: two builds on one map. Both economies run side by side (engine.js sim()), armies leave home
   in waves when their attack plan says so, walk the map, fight, and kill workers and buildings. Every loss is
   taken out of the loser's economy, so a raid that kills twelve workers really does cost the next two minutes.
   Fights use Lanchester's square law in small steps; defenders at home get Bunkers and a home advantage.
   Works in the browser (window.BOMatch) and in node, like engine.js. */
(function (root) {
  const BO = root.BO || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const { T, sim } = BO;

  const TRAVEL = 40;          // seconds for an army to cross the map
  const ALPHA = 0.07;         // fight lethality per second
  const HOME = 1.1;           // home advantage for defenders
  const HP = { worker: 0.55, base: 45, supply: 9, refinery: 9, barracks: 16, bunker: 3, lab: 6, factory: 16, starport: 16 };

  /* attack plans. at: send the army when the power at home reaches this. after: not before this second.
     wave: once the first attack has gone, later waves leave at this power (0 = every new unit walks out). */
  const PLANS = {
    home:     { name: 'Stay home', tag: 'Never attacks. Defends with everything.', never: 1 },
    rush:     { name: 'All-in early', tag: 'Goes at 4 power and sends every new unit after it. Gives up after losing 30 power for nothing.', at: 4, wave: 0, quit: 30 },
    timing:   { name: 'One big push', tag: 'Waits for 40 power, then attacks in waves of 12.', at: 40, wave: 12 },
    late:     { name: 'Max out first', tag: 'Waits for 130 power or 8:00, then rolls in.', at: 130, deadline: 480, wave: 20 },
  };
  const PRESET_PLAN = { rush: 'rush', turtle: 'home', expand: 'late', standard: 'timing' };

  const powerOf = (S, counts) => S.powerOf(counts);
  const sub = (a, b) => { const o = {}; for (const k in a) o[k] = Math.max(0, (a[k] || 0) - (b[k] || 0)); return o; };
  const add = (a, b) => { const o = { ...a }; for (const k in b) o[k] = (o[k] || 0) + b[k]; return o; };
  const total = c => Object.values(c).reduce((a, b) => a + b, 0);

  function match(buildA, buildB, planA, planB, opts = {}) {
    const until = opts.until || 600, dt = 0.1;
    const side = [buildA, buildB].map((b, i) => ({
      i, S: sim(b, { until }), plan: PLANS[[planA, planB][i]] || PLANS.home, groups: [], launched: 0,
      bunkerHp: {}, dmgHome: 0, dmgRaid: 0, lost: { units: 0, workers: 0, structs: 0, unitPow: 0 }, out: null,
    }));
    const snaps = [], events = [];
    let t = 0, k = 0, over = null, gid = 0;
    const steps = Math.round(until / dt);

    const away = P => P.groups.reduce((a, g) => add(a, g.counts), {});
    const homeCounts = P => sub(P.S.army, away(P));
    const bunkers = P => P.S.doneOf('bunker');
    const defence = P => (powerOf(P.S, homeCounts(P)) + bunkers(P).reduce((a, b) => a + (P.bunkerHp[b.n] ?? HP.bunker), 0)) * HOME;
    // take `dmg` power-seconds of losses out of a unit pool, whole units at a time; returns what died
    function bleed(P, counts, dmg, carry) {
      const died = [];
      let pool = (carry || 0) + dmg;
      for (let guard = 0; guard < 400; guard++) {
        const ids = Object.keys(counts).filter(id => counts[id] > 0);
        if (!ids.length) { pool = 0; break; }
        // the cheapest units die first: they're out in front
        ids.sort((a, b) => T[a].pow - T[b].pow);
        const id = ids[0], hp = T[id].pow * (P.S.stim && T[id].bio ? BO.STIM : 1);
        if (pool < hp) break;
        pool -= hp; counts[id]--; P.S.loseUnits(id, 1); died.push(id);
        P.lost.units++; P.lost.unitPow += hp;
      }
      return { died, carry: pool };
    }
    function ev(e) { events.push({ t, ...e }); }

    // a fight between attackers (one group) and a defending pool; returns nothing, applies losses
    function siege(A, g, D) {
      const a = powerOf(A.S, g.counts), homeC = homeCounts(D), dHome = powerOf(D.S, homeC);
      const bk = bunkers(D), bHp = bk.reduce((s, b) => s + (D.bunkerHp[b.n] ?? HP.bunker), 0);
      const d = (dHome + bHp) * HOME;
      g.state = 'siege';
      if (a <= 0.01) return;
      if (d > 0.05) {
        g.fighting = 1;
        // attackers take d, defenders take a, shared between units at home and bunkers by their power
        const ra = bleed(A, g.counts, ALPHA * d * dt, g.dmg); g.dmg = ra.carry; ra.died.forEach(id => ev({ side: A.i, kind: 'unit', id, g: g.id }));
        let hit = ALPHA * a * dt / HOME;
        const toB = bHp > 0 ? hit * bHp / (bHp + dHome) : 0;
        const rd = bleed(D, homeC, hit - toB, D.dmgHome); D.dmgHome = rd.carry; rd.died.forEach(id => ev({ side: D.i, kind: 'unit', id, home: 1 }));
        let left = toB;
        for (const b of bk) {
          if (left <= 0) break;
          const hp = D.bunkerHp[b.n] ?? HP.bunker, take = Math.min(hp, left);
          D.bunkerHp[b.n] = hp - take; left -= take;
          if (D.bunkerHp[b.n] <= 1e-6) { D.S.killStruct(b); D.lost.structs++; ev({ side: D.i, kind: 'struct', type: 'bunker', n: b.n }); }
        }
      } else {
        g.fighting = 0;
        // nothing left to stop them: workers first, then buildings, newest base before the main
        D.dmgRaid += a * dt * 0.45;
        for (let guard = 0; guard < 50; guard++) {
          const W = D.S.workers - D.S.building;
          if (W > 0) {
            if (D.dmgRaid < HP.worker) break;
            D.dmgRaid -= HP.worker; D.S.loseWorkers(1); D.lost.workers++; ev({ side: D.i, kind: 'worker' }); continue;
          }
          const live = D.S.live().filter(s => s.type !== 'lab');
          if (!live.length) break;
          const bases = live.filter(s => s.type === 'base');
          const order = live.filter(s => s.type !== 'base').sort((x, y) => (y.done - x.done))
            .concat(bases.sort((x, y) => y.n - x.n));
          // expansions go before production; the main goes last
          const tgt = bases.length > 1 ? bases.sort((x, y) => y.n - x.n)[0] : order[0];
          const hp = HP[tgt.type] ?? 10;
          tgt._hp = tgt._hp ?? hp;
          const take = Math.min(tgt._hp, D.dmgRaid);
          tgt._hp -= take; D.dmgRaid -= take;
          g.target = { type: tgt.type, n: tgt.n };
          if (tgt._hp <= 1e-6) { D.S.killStruct(tgt); D.lost.structs++; ev({ side: D.i, kind: 'struct', type: tgt.type, n: tgt.n }); }
          else break;
        }
        if (!D.S.live().some(s => s.type === 'base') && !over) over = { t, winner: A.i };
      }
    }
    // two groups meeting in the middle: no bunkers, no home advantage
    function clash(A, g, B, h) {
      const a = powerOf(A.S, g.counts), b = powerOf(B.S, h.counts);
      g.state = h.state = 'clash'; g.fighting = h.fighting = 1;
      const ra = bleed(A, g.counts, ALPHA * b * dt, g.dmg); g.dmg = ra.carry; ra.died.forEach(id => ev({ side: A.i, kind: 'unit', id, g: g.id }));
      const rb = bleed(B, h.counts, ALPHA * a * dt, h.dmg); h.dmg = rb.carry; rb.died.forEach(id => ev({ side: B.i, kind: 'unit', id, g: h.id }));
    }

    for (k = 0; k <= steps; k++) {
      t = +(k * dt).toFixed(4);
      side.forEach(P => P.S.tick());
      // send armies out
      for (const P of side) {
        const pl = P.plan; if (pl.never || over || P.quit) continue;
        // an all-in that keeps dying at the door stops feeding units in
        if (pl.quit && P.lost.unitPow >= pl.quit && side[1 - P.i].lost.workers + side[1 - P.i].lost.structs === 0) { P.quit = t; ev({ side: P.i, kind: 'quit' }); continue; }
        const hc = homeCounts(P), hp = powerOf(P.S, hc);
        const ready = P.launched ? hp >= Math.max(pl.wave ?? pl.at, 0.9) : (hp >= pl.at || (pl.deadline && t >= pl.deadline && hp >= 4));
        if (ready && t >= (pl.after || 0) && total(hc) > 0) {
          P.groups.push({ id: ++gid, counts: hc, p: 0, state: 'out', born: t, dmg: 0, fighting: 0 });
          P.launched++;
          ev({ side: P.i, kind: 'launch', pow: hp });
        }
      }
      // move, meet, fight
      const [L, R] = side;
      for (const P of side) for (const g of P.groups) {
        g.fighting = 0;
        if (g.state === 'out') g.p = Math.min(1, g.p + dt / TRAVEL);
      }
      // clashes: the lead groups that have crossed paths
      for (const g of L.groups) for (const h of R.groups) {
        if ((g.state === 'out' || g.state === 'clash') && (h.state === 'out' || h.state === 'clash') && g.p + h.p >= 1 && total(g.counts) && total(h.counts)) clash(L, g, R, h);
      }
      for (const P of side) {
        const D = side[1 - P.i];
        // merge every group that has arrived into one siege group
        const at = P.groups.filter(g => g.p >= 1 && g.state !== 'clash');
        if (at.length > 1) { const m = at[0]; for (const g of at.slice(1)) { m.counts = add(m.counts, g.counts); g.counts = {}; } }
        for (const g of P.groups) {
          if (g.state === 'clash' && !g.fighting) g.state = 'out';   // the other side is gone: keep walking
          if (g.p >= 1 && g.state !== 'clash' && total(g.counts)) siege(P, g, D);
        }
        P.groups = P.groups.filter(g => total(g.counts) > 0);
      }
      if (k % 5 === 0) snaps.push(snapshot());
      if (over && t > over.t + 20) break;
    }
    function snapshot() {
      return {
        t, over,
        sides: side.map(P => {
          const hc = homeCounts(P);
          return {
            workers: P.S.workers, onGas: P.S.onGas, building: P.S.building, ore: P.S.ore,
            army: { ...P.S.army }, home: hc, homePow: powerOf(P.S, hc), pow: powerOf(P.S, P.S.army), defence: defence(P),
            groups: P.groups.map(g => ({ id: g.id, counts: { ...g.counts }, p: g.p, state: g.state, fighting: g.fighting, pow: powerOf(P.S, g.counts), target: g.target })),
            structs: P.S.live().map(s => ({ type: s.type, n: s.n, done: s.done, begun: s.begun ?? 0, host: s.host ? s.host.n : null,
              hp: s.type === 'bunker' ? (P.bunkerHp[s.n] ?? HP.bunker) / HP.bunker : (s._hp ?? HP[s.type] ?? 10) / (HP[s.type] ?? 10) })),
            dead: [],
            bases: P.S.live().filter(s => s.type === 'base' && s.done <= t).length,
            lost: { ...P.lost }, stim: P.S.stim,
          };
        }),
      };
    }
    const end = snaps[snaps.length - 1].t;
    // every structure ever built, with when it died, for drawing rubble
    const builtAll = side.map(P => P.S.snaps.length ? P.S.snaps[P.S.snaps.length - 1].structs : []);
    return {
      snaps, events, over, end, builtAll, plans: side.map(P => P.plan),
      at(tt) { return snaps[Math.max(0, Math.min(snaps.length - 1, Math.round(tt * 2)))]; },
    };
  }

  const BOMatch = { match, PLANS, PRESET_PLAN, TRAVEL, HOME, HP };
  if (typeof module !== 'undefined') module.exports = BOMatch; else root.BOMatch = BOMatch;
})(typeof window !== 'undefined' ? window : globalThis);
