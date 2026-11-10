/* Build Orders: the simulation. A small, deterministic RTS opening economy.
   An original faction with timings in the spirit of a classic sci-fi RTS opening:
   12 workers and 50 ore at 0:00, workers mine ore, refineries hold three gas workers,
   supply caps how much you can field, and buildings need a worker to put them up.
   Runs in the browser (window.BO) and in node (module.exports) so the presets can be tuned headless. */
(function (root) {
  /* ---------- the tech tree ----------
     kind: bld (a worker builds it), addon (a building builds it), unit, tech (researched).
     by: what makes it. req: what must be finished first. sup: supply it uses (units) or gives (buildings). */
  const T = {
    base:     { name: 'Base',        kind: 'bld',   ore: 400, gas: 0,   time: 71,  by: 'worker', travel: 8, give: 15, req: [], col: '#ffb951', tip: 'A new town hall on fresh ore. Eight more patches to mine, a second worker queue, +15 supply.' },
    supply:   { name: 'Supply Post', kind: 'bld',   ore: 100, gas: 0,   time: 21,  by: 'worker', travel: 3, give: 8,  req: [], col: '#9fc4ff', tip: '+8 supply. Late is a supply block; early is ore that isn’t a worker yet.' },
    refinery: { name: 'Refinery',    kind: 'bld',   ore: 75,  gas: 0,   time: 21,  by: 'worker', travel: 3, req: [], perBase: 2, col: '#5fe0a0', tip: 'Puts three workers on gas. Every tech step past the Barracks costs gas.' },
    barracks: { name: 'Barracks',    kind: 'bld',   ore: 150, gas: 0,   time: 46,  by: 'worker', travel: 3, req: ['supply'], col: '#ff8a78', tip: 'Infantry. The first real decision of the game: when, and how many.' },
    bunker:   { name: 'Bunker',      kind: 'bld',   ore: 100, gas: 0,   time: 29,  by: 'worker', travel: 3, req: ['barracks'], def: 3, col: '#c7a46b', tip: 'Static defence: worth 3 army power, but only at home. Ore that never attacks.' },
    lab:      { name: 'Lab',         kind: 'addon', ore: 50,  gas: 25,  time: 18,  by: 'barracks', req: ['barracks'], col: '#d58cff', tip: 'Bolts onto a Barracks (which can’t train while it’s going up). Unlocks Rangers and Stim.' },
    factory:  { name: 'Factory',     kind: 'bld',   ore: 150, gas: 100, time: 43,  by: 'worker', travel: 3, req: ['barracks'], col: '#ffa24d', tip: 'Vehicles. The second tier: slow to reach, hits hard.' },
    starport: { name: 'Starport',    kind: 'bld',   ore: 150, gas: 100, time: 36,  by: 'worker', travel: 3, req: ['factory'], col: '#6fd6ff', tip: 'Air. Three buildings deep in the tree.' },
    worker:   { name: 'Worker',      kind: 'unit',  ore: 50,  gas: 0,   time: 12,  by: 'base',     sup: 1, pow: 0,   req: [], col: '#e8e2cf', tip: 'Mines about 57 ore a minute. Every worker you skip is ore you never see.' },
    soldier:  { name: 'Soldier',     kind: 'unit',  ore: 50,  gas: 0,   time: 18,  by: 'barracks', sup: 1, pow: 1,   bio: 1, req: [], col: '#ff8a78', tip: 'Cheap, quick, ore only. The rush unit.' },
    ranger:   { name: 'Ranger',      kind: 'unit',  ore: 100, gas: 25,  time: 21,  by: 'barracks', sup: 2, pow: 3, bio: 1, req: ['lab'], lab: 1, col: '#d58cff', tip: 'Armoured infantry. Needs a Barracks with a Lab.' },
    raider:   { name: 'Raider',      kind: 'unit',  ore: 100, gas: 0,   time: 21,  by: 'factory',  sup: 2, pow: 1.4, req: [], col: '#ffd36b', tip: 'Fast, ore-only vehicle. Good at catching workers, poor in a straight fight.' },
    tank:     { name: 'Tank',        kind: 'unit',  ore: 150, gas: 125, time: 32,  by: 'factory',  sup: 3, pow: 6, req: [], col: '#ffa24d', tip: 'Slow, expensive, and the best defender in the game.' },
    gunship:  { name: 'Gunship',     kind: 'unit',  ore: 150, gas: 100, time: 43,  by: 'starport', sup: 3, pow: 5, req: [], col: '#6fd6ff', tip: 'Air harass. Ignores walls and bunkers on the way in.' },
    stim:     { name: 'Stim',        kind: 'tech',  ore: 100, gas: 100, time: 100, by: 'lab',      req: [], col: '#d58cff', tip: 'Research at a Lab: Soldiers and Rangers fight 35% harder.' },
  };
  for (const k in T) T[k].id = k;
  const PROD = { base: 'worker', barracks: 'soldier', factory: 'tank', starport: 'gunship' };
  const FALL = { barracks: 'soldier', factory: 'raider' };
  const STIM = 1.35, MINE = 0.95, MINE3 = 0.4, GAS = 0.9, START_W = 12, CAP = 200;

  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  /* which steps can never start: their tree is missing from everything before them */
  function check(order) {
    const have = { base: 1 }, bad = [];
    order.forEach((st, i) => {
      const it = T[st.id], miss = [];
      it.req.forEach(r => { if (!have[r]) miss.push(r); });
      if (it.by !== 'worker' && !have[it.by]) miss.push(it.by);
      if (it.gas && !have.refinery) miss.push('refinery');
      if (it.perBase && (have[st.id] || 0) >= it.perBase * (have.base || 1)) miss.push('base');
      bad[i] = miss.length ? [...new Set(miss)] : null;
      if (!bad[i]) have[st.id] = (have[st.id] || 0) + 1;
    });
    return bad;
  }

  /* ---------- run a build ----------
     build: { order: [{id}], workerCap, keep (keep producing after the last step), autoSupply, until }
     returns { snaps (one per second), runs (every item started), lanes, steps (per-step start / end / supply / waits) } */
  function run(build, opts = {}) {
    const until = opts.until || build.until || 480, dt = 0.1;
    const order = build.order || [], bad = check(order);
    const wCap = build.workerCap ?? 70;
    let t = 0, ore = 50, gas = 0, oreMined = 0, gasMined = 0, spent = 0;
    let workers = START_W, building = 0, onGas = 0;
    const army = {}, structs = [], runs = [], snaps = [], lanes = [];
    const stepInfo = order.map((st, i) => ({ i, id: st.id, bad: bad[i], start: null, end: null, supply: null, wait: {} }));
    let used = START_W, stim = false, blockSecs = 0, idleSecs = 0, floatSecs = 0;
    const lane = (name, type) => { const L = { name, type, i: lanes.length }; lanes.push(L); return L; };
    function addStruct(type, done, extra = {}) {
      const n = structs.filter(s => s.type === type).length + 1;
      const s = { type, n, done, busy: 0, lab: null, base: null, lane: lane(`${T[type].name}${type === 'base' && n === 1 ? ' (main)' : ' ' + n}`, type), ...extra };
      structs.push(s); return s;
    }
    addStruct('base', 0);
    const pending = [];   // things finishing later: { end, fn }
    const later = (end, fn) => pending.push({ end, fn });
    const doneOf = type => structs.filter(s => s.type === type && s.done <= t);
    const cap = () => Math.min(CAP, structs.reduce((a, s) => a + (s.done <= t ? (T[s.type].give || 0) : 0), 0));
    const refineries = () => doneOf('refinery').length;
    const basesDone = () => doneOf('base').length;
    const mining = () => workers - building - onGas;
    function mineRate() {
      let m = mining(), r = 0;
      const b = basesDone();
      const full = Math.min(m, 16 * b); r += full * MINE; m -= full;
      r += Math.min(m, 8 * b) * MINE3;
      return r;
    }
    function fillGas() {
      const slots = refineries() * 3;
      while (onGas < slots && mining() > 0) onGas++;
    }

    /* can item `id` start now? returns null or the reason it waits */
    function why(id, step) {
      const it = T[id];
      for (const r of it.req) if (!structs.some(s => s.type === r && s.done <= t)) return { r: 'tech', on: r };
      if (it.kind === 'unit' && used + it.sup > cap()) return { r: 'supply' };
      if (it.kind === 'unit' && used + it.sup > CAP) return { r: 'max' };
      let prod = null;
      if (it.by === 'worker') { if (mining() < 1) return { r: 'busy', on: 'worker' }; }
      else {
        const cands = structs.filter(s => s.type === it.by && s.done <= t && (!it.lab || s.lab && s.lab.done <= t) && (it.kind !== 'addon' || !s.lab));
        if (!cands.length) return { r: 'tech', on: it.lab ? 'lab' : it.by };
        prod = cands.find(s => s.busy <= t + 1e-9);
        if (!prod) return { r: 'busy', on: it.by };
      }
      if (it.perBase && structs.filter(s => s.type === id).length >= it.perBase * structs.filter(s => s.type === 'base').length) return { r: 'tech', on: 'base' };
      if (ore < it.ore - 1e-9) return { r: 'ore', need: it.ore - ore };
      if (gas < it.gas - 1e-9) return { r: 'gas', need: it.gas - gas };
      return { ok: 1, prod };
    }
    function start(id, prod, stepIdx) {
      const it = T[id];
      ore -= it.ore; gas -= it.gas; spent += it.ore + it.gas;
      const R = { id, start: t, step: stepIdx, supplyAt: used };
      if (it.kind === 'bld') {
        building++;
        const end = t + it.travel + it.time;
        const s = addStruct(id, end, { begun: t + it.travel });
        R.end = end; R.lane = s.lane.i; R.build = 1; R.travel = it.travel;
        later(end, () => { building--; if (id === 'refinery') fillGas(); });
        if (id === 'base') s.base = structs.filter(x => x.type === 'base').length;
      } else if (it.kind === 'addon') {
        const end = t + it.time;
        prod.busy = end;
        const s = addStruct(id, end, { host: prod });
        prod.lab = s;
        R.end = end; R.lane = prod.lane.i; R.addon = 1;
      } else {
        const end = t + it.time;
        prod.busy = end;
        if (it.kind === 'unit') used += it.sup;
        R.end = end; R.lane = prod.lane.i;
        later(end, () => {
          if (id === 'worker') { workers++; fillGas(); }
          else if (it.kind === 'unit') army[id] = (army[id] || 0) + 1;
          else if (id === 'stim') stim = true;
        });
      }
      runs.push(R);
      return R;
    }
    const wantWorkers = () => workers + runs.filter(r => r.id === 'worker' && r.end > t).length < wCap;

    let si = 0;
    const steps = Math.round(until / dt);
    for (let k = 0; k <= steps; k++) {
      t = +(k * dt).toFixed(4);
      // finish whatever ends now
      pending.sort((a, b) => a.end - b.end);
      while (pending.length && pending[0].end <= t + 1e-9) pending.shift().fn();
      if (k === 0) fillGas();
      let blocked = false, waiting = false;
      // 1. constant workers: every idle base trains one
      if (wantWorkers()) {
        for (const b of doneOf('base')) {
          if (b.busy > t + 1e-9 || !wantWorkers()) continue;
          const w = why('worker');
          if (w.ok) start('worker', b, null);
          else if (w.r === 'supply') blocked = true;
        }
      }
      // 2. the build order, strictly in order
      while (si < order.length) {
        const info = stepInfo[si];
        if (info.bad) { si++; continue; }
        const w = why(order[si].id, si);
        if (w.ok) {
          const R = start(order[si].id, w.prod, si);
          info.start = t; info.end = R.end; info.supply = R.supplyAt; si++;
          continue;
        }
        info.wait[w.r] = (info.wait[w.r] || 0) + dt;
        if (w.r === 'supply') blocked = true;
        waiting = true;
        break;
      }
      // 3. after the last step: auto supply, then every production building keeps training
      if (si >= order.length) {
        if (build.autoSupply && cap() < CAP) {
          const inProd = structs.filter(s => s.type === 'supply' && s.done > t).length + structs.filter(s => s.type === 'base' && s.done > t).length;
          const rate = doneOf('base').length + doneOf('barracks').length + doneOf('factory').length * 2 + doneOf('starport').length * 2;
          const room = cap() + inProd * 8 - used;
          if (room <= Math.max(4, rate * 2.4) && inProd < 1 + Math.floor(rate / 4)) {
            const w = why('supply');
            if (w.ok) start('supply', null, null);
          }
        }
        // macro: money piling up buys another production building (one at a time)
        const building_ = structs.filter(s => PROD[s.type] && s.type !== 'base' && s.done > t).length;
        if (build.macro && ore > 300 + 220 * building_) {
          const m = [].concat(build.macro), pick = m[structs.filter(s => m.includes(s.type)).length % m.length];
          const w = why(pick);
          if (w.ok) start(pick, null, null);
        }
        if (build.keep) {
          for (const s of structs) {
            if (s.type === 'base' || !PROD[s.type] || s.done > t || s.busy > t + 1e-9) continue;
            let pick = build.keep[s.type] || (s.type === 'barracks' && s.lab && s.lab.done <= t && build.keep.ranger ? 'ranger' : PROD[s.type]);
            if (!pick) continue;
            let w = why(pick);
            // can't afford the gas unit: fall back to the ore-only one rather than sit idle
            if (w.r === 'gas' && FALL[s.type]) { pick = FALL[s.type]; w = why(pick); }
            if (w.ok && w.prod === s) start(pick, s, null);
            else if (w.ok && w.prod) { /* another building of that type is idle first */ start(pick, w.prod, null); }
            else if (w.r === 'supply') blocked = true;
          }
        }
      }
      // money comes in
      const mr = mineRate(), gr = onGas * GAS;
      ore += mr * dt; gas += gr * dt; oreMined += mr * dt; gasMined += gr * dt;
      if (blocked) blockSecs += dt;
      if (ore > 400) floatSecs += dt;
      if (k % 10 === 0) {
        let pow = 0, bio = 0;
        for (const id in army) { const p = T[id].pow * army[id] * (stim && T[id].bio ? STIM : 1); pow += p; }
        const def = doneOf('bunker').length * T.bunker.def;
        snaps.push({ t, ore, gas, oreRate: mr * 60, gasRate: gr * 60, used, cap: cap(), workers, onGas, building, mining: mining(),
          army: { ...army }, pow, def, stim, blocked, bases: basesDone(), spent, mined: oreMined + gasMined, blockSecs, floatSecs,
          structs: structs.map(s => ({ type: s.type, n: s.n, done: s.done, begun: s.begun ?? 0, lab: !!s.lab })), waiting });
      }
    }
    // supply blocks as intervals, for drawing
    const blocks = []; let b0 = null;
    snaps.forEach(s => { if (s.blocked && b0 == null) b0 = s.t; if (!s.blocked && b0 != null) { blocks.push([b0, s.t]); b0 = null; } });
    if (b0 != null) blocks.push([b0, until]);
    return { snaps, runs, lanes, steps: stepInfo, blocks, until, at: tt => snaps[Math.max(0, Math.min(snaps.length - 1, Math.round(tt)))] };
  }

  /* first time a condition holds, or null */
  const first = (R, f) => { const s = R.snaps.find(f); return s ? s.t : null; };

  /* ---------- presets: the three openings from Counter Cycles, plus a standard build ---------- */
  const B = (ids, extra) => ({ order: ids.trim().split(/\s+/).map(id => ({ id })), ...extra });
  const PRESETS = {
    standard: { name: 'Standard: Expand into Tech', tag: 'The textbook opening: wall, expand, gas, then a second tier.', col: '#9fc4ff',
      ...B('supply barracks refinery soldier base supply factory refinery lab soldier starport supply stim tank supply', { workerCap: 60, keep: { ranger: 1 }, autoSupply: 1, macro: ['barracks', 'factory', 'barracks'] }) },
    rush: { name: 'Rush: Three-Barracks Soldiers', tag: 'Stop workers early, three Barracks, every ore into Soldiers. Hits before 3:00.', col: '#ff6b5a', img: '../counter-cycles/img/rts-rush.jpg',
      ...B('supply barracks barracks barracks soldier soldier soldier supply soldier soldier soldier', { workerCap: 16, keep: {}, autoSupply: 1, macro: 'barracks' }) },
    turtle: { name: 'Turtle: One-Base Tanks', tag: 'One base, a wall of Bunkers, Tanks behind them. Safe, and never bigger.', col: '#36c9c6', img: '../counter-cycles/img/rts-turtle.jpg',
      ...B('supply barracks refinery soldier bunker supply refinery factory bunker soldier lab tank supply tank', { workerCap: 22, keep: {}, autoSupply: 1, macro: ['factory', 'barracks'] }) },
    expand: { name: 'Expand: Base First', tag: 'Skip the early army: a second Base before the Barracks. Greedy, and huge later.', col: '#ffd84a', img: '../counter-cycles/img/rts-expand.jpg',
      ...B('supply base barracks refinery supply refinery base factory refinery lab supply refinery stim', { workerCap: 70, keep: { ranger: 1 }, autoSupply: 1, macro: ['barracks', 'factory', 'barracks', 'starport'] }) },
  };

  const BO = { T, PROD, run, check, first, fmt, PRESETS, STIM, START_W };
  if (typeof module !== 'undefined') module.exports = BO; else root.BO = BO;
})(typeof window !== 'undefined' ? window : globalThis);
