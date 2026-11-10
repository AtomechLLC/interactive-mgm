/* Build Orders: the map. Two build orders from the simulation (engine.js) played out on one StarCraft-style map,
   in the style of Counter Cycles' "Each counter, played out". Nothing here is scripted per matchup: every worker,
   building and unit appears when the simulation makes it, the attacker moves out at the chosen time, and the fight
   is the One Clock slide's square-law fight, with the defender given the time the attack takes to walk across.
   Everything is a pure function of game time, so the transport can scrub it. */
(function () {
  const { $, $$, demo, say, raf, store } = FPF.kit;
  const { T, run, fmt, PRESETS, STIM } = BO;
  const { transport, icon, fight, HOME, esc } = BOUI;

  const MW = 1600, MH = 480;          // the map, in one player's own frame (their base on the left)
  const WALK = 40;                    // map units per game second
  const FD = 12;                      // how long a fight lasts, game seconds
  const RAID = 30;                    // how long a winning attacker raids before the verdict
  const UNTIL = 640;                  // how far each build is simulated
  const KEYS = ['rush', 'turtle', 'expand', 'standard', 'yours'];
  const YOURS = { name: 'Yours: from the Simulator', col: '#c792ff', tag: 'The build on the Simulator slide, as you left it.' };
  const meta = k => k === 'yours' ? YOURS : PRESETS[k];
  const label = k => meta(k).name.split(':')[0];

  /* ---------- the map ---------- */
  const SITE = [
    { x: 150, y: 240, ang: [135, 225], gey: [[118, 118], [118, 362]] },   // main, on the high ground
    { x: 520, y: 118, ang: [205, 335], gey: [[408, 132], [632, 132]] },   // natural
    { x: 520, y: 362, ang: [25, 155], gey: [[408, 348], [632, 348]] },    // third
    { x: 700, y: 175, ang: [200, 340], gey: [[610, 196], [790, 196]] },
    { x: 700, y: 305, ang: [20, 160], gey: [[610, 284], [790, 284]] },
  ];
  SITE.forEach(s => {
    s.patch = Array.from({ length: 8 }, (_, i) => {
      const a = (s.ang[0] + (s.ang[1] - s.ang[0]) * i / 7) * Math.PI / 180;
      return { x: s.x + 92 * Math.cos(a), y: s.y + 92 * Math.sin(a) };
    });
  });
  const PROD_SLOTS = [[232, 120], [232, 360], [292, 120], [292, 360], [232, 176], [232, 304], [292, 176], [292, 304], [176, 152], [176, 328]];
  const SUP_SLOTS = [];
  for (let x = 322; x >= 166; x -= 26) SUP_SLOTS.push([x, 68], [x, 412]);
  for (const x of [26, 50]) for (const y of [92, 118, 144, 336, 362, 388]) SUP_SLOTS.push([x, y]);   // overflow: the back wall of the main
  const BUNK = { ramp: [[302, 198], [302, 282], [272, 240], [268, 186], [268, 294]], nat: [[618, 196], [586, 228], [648, 160], [560, 252]] };
  const RALLY = { main: { x: 262, y: 240 }, nat: { x: 452, y: 196 } };
  const FIGHT = { ramp: { x: 440, y: 240 }, nat: { x: 640, y: 212 } };   // in the defender's own frame

  /* ---------- helpers ---------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const spread = (i, r = 13) => { const a = i * 2.4, d = r * Math.sqrt(i + .5); return { x: Math.cos(a) * d, y: Math.sin(a) * d }; };
  const add = (p, q, k = 1) => ({ x: p.x + q.x * k, y: p.y + q.y * k });
  const mir = p => ({ x: MW - p.x, y: p.y });
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = c => Math.round(clamp(c * k, 0, 255));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };
  const powOf = (id, stim) => T[id].pow * (stim && T[id].bio ? STIM : 1);
  const costOf = id => T[id].ore + T[id].gas;

  // a route of keyframes walked at WALK speed; wait() holds a spot, optionally fighting toward `atk`
  function route(g, p) {
    const kf = [{ g, x: p.x, y: p.y }];
    const R = {
      kf,
      get end() { return kf[kf.length - 1].g; },
      get last() { return kf[kf.length - 1]; },
      to(q, speed = WALK) { const L = kf[kf.length - 1], d = Math.hypot(q.x - L.x, q.y - L.y); kf.push({ g: L.g + d / speed, x: q.x, y: q.y }); return R; },
      wait(until, atk) { const L = kf[kf.length - 1]; if (atk) L.atk = atk; if (until > L.g) kf.push({ g: until, x: L.x, y: L.y, atk }); return R; },
    };
    return R;
  }
  function posAt(kf, g) {
    if (g <= kf[0].g) return { x: kf[0].x, y: kf[0].y, atk: null, dx: 1, dy: 0 };
    for (let i = 0; i < kf.length - 1; i++) {
      const A = kf[i], B = kf[i + 1];
      if (g <= B.g) { const k = (g - A.g) / ((B.g - A.g) || 1); return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k), atk: A.atk || null, dx: B.x - A.x, dy: B.y - A.y }; }
    }
    const L = kf[kf.length - 1];
    return { x: L.x, y: L.y, atk: L.atk || null, dx: 0, dy: 0 };
  }

  /* ---------- one build, laid out on the map ----------
     Buildings, workers and units come straight from the simulation's records; this only decides where they stand. */
  function model(R) {
    const last = R.snaps[R.snaps.length - 1];
    const S = last.structs.map((s, i) => ({ ...s, i, begun: s.type === 'base' && s.done <= 0 ? -1 : T[s.type].kind === 'bld' ? s.begun : s.done - T[s.type].time }));
    const P = { R, S, bases: [], refs: [], units: [], workers: [] };
    let prod = 0, sup = 0;
    const bunkN = { ramp: 0, nat: 0 }, gCount = [];
    S.forEach(s => {
      if (s.type === 'base') { s.site = P.bases.length; P.bases.push(s); Object.assign(s, SITE[Math.min(s.site, SITE.length - 1)]); s.x = SITE[Math.min(s.site, SITE.length - 1)].x; }
    });
    S.forEach(s => {
      const t = s.type;
      if (t === 'refinery') {
        const b = P.bases.find(b => (gCount[b.site] || 0) < 2 && b.begun <= s.begun + 1) || P.bases[0];
        const k = gCount[b.site] = (gCount[b.site] || 0) + 1;
        const [x, y] = SITE[Math.min(b.site, SITE.length - 1)].gey[k - 1] || SITE[0].gey[0];
        Object.assign(s, { x, y, base: b.site, ri: P.refs.length }); P.refs.push(s);
      } else if (t === 'supply') { const [x, y] = SUP_SLOTS[sup++ % SUP_SLOTS.length]; Object.assign(s, { x, y }); }
      else if (t === 'barracks' || t === 'factory' || t === 'starport') {
        const [x, y] = PROD_SLOTS[prod] || [380 + (prod % 3) * 30, 40 + Math.floor(prod / 3) * 30]; prod++; Object.assign(s, { x, y });
      } else if (t === 'bunker') {
        const nat = P.bases[1] && P.bases[1].begun < s.begun, mode = nat ? 'nat' : 'ramp';
        const [x, y] = BUNK[mode][bunkN[mode]++ % BUNK[mode].length]; Object.assign(s, { x, y, mode });
      }
    });
    // a Lab bolts onto a Barracks: the k-th Lab onto the k-th Barracks that has one
    const hosts = S.filter(s => s.type === 'barracks' && s.lab);
    S.filter(s => s.type === 'lab').forEach((s, k) => { const h = hosts[k] || S.find(x => x.type === 'barracks'); Object.assign(s, { x: h.x + 25, y: h.y + 6 }); });
    // units: every unit run, born where it was trained
    R.runs.forEach(r => {
      const it = T[r.id];
      if (it.kind !== 'unit') return;
      if (r.id === 'worker') return;
      P.units.push({ id: r.id, born: r.end, at: S[r.lane], k: P.units.length });
    });
    // workers: the 12 you start with, then every one trained
    for (let i = 0; i < BO.START_W; i++) P.workers.push({ born: 0, home: 0, k: i });
    R.runs.forEach(r => { if (r.id === 'worker') P.workers.push({ born: r.end, home: S[r.lane].site || 0, k: P.workers.length }); });
    plan(P);
    return P;
  }

  /* which ore patch or refinery each worker works, second by second: 16 to a base, 3 to a refinery,
     the same number on gas as the simulation, and a worker only moves when it has to */
  function plan(P) {
    const R = P.R;
    P.workers.forEach(w => { w.hist = []; w.cur = null; });
    for (let s = 0; s <= UNTIL; s++) {
      const snap = R.at(s);
      const bases = P.bases.filter(b => b.done <= s).map(b => 'b' + b.site), refs = P.refs.filter(r => r.done <= s).map(r => 'r' + r.ri);
      const alive = P.workers.filter(w => w.born <= s);
      const load = {}; [...bases, ...refs].forEach(k => (load[k] = 0));
      alive.forEach(w => { if (w.cur && w.cur in load) load[w.cur]++; else w.cur = null; });
      const want = snap.onGas;
      let onGas = refs.reduce((a, k) => a + load[k], 0);
      const freeRef = () => refs.find(k => load[k] < 3);
      // new workers go to their own base if it has room, else the emptiest one
      const pickBase = home => {
        if (!bases.length) return null;
        const h = 'b' + home;
        if (h in load && load[h] < 16) return h;
        return bases.reduce((a, b) => (load[b] < load[a] ? b : a), bases[0]);
      };
      for (const w of alive) {
        if (w.cur) continue;
        if (onGas < want && freeRef()) { w.cur = freeRef(); load[w.cur]++; onGas++; continue; }
        w.cur = pickBase(w.home); if (w.cur) load[w.cur]++;
      }
      // more gas wanted: pull miners from the busiest base
      while (onGas < want && freeRef()) {
        const b = bases.reduce((a, x) => (load[x] > load[a] ? x : a), bases[0]);
        const w = [...alive].reverse().find(w => w.cur === b); if (!w) break;
        load[b]--; w.cur = freeRef(); load[w.cur]++; onGas++;
      }
      // a new base takes the extra miners from an oversaturated one
      for (let guard = 0; guard < 40; guard++) {
        const over = bases.find(b => load[b] > 16), under = bases.find(b => load[b] < 16);
        if (!over || !under) break;
        const w = [...alive].reverse().find(w => w.cur === over); if (!w) break;
        load[over]--; w.cur = under; load[under]++;
      }
      alive.forEach(w => { const L = w.hist[w.hist.length - 1]; if (!L || L.site !== w.cur) w.hist.push({ s, site: w.cur, from: L ? L.site : null }); });
    }
  }
  const siteCenter = (P, key) => {
    if (!key) return SITE[0];
    if (key[0] === 'b') return SITE[Math.min(+key.slice(1), SITE.length - 1)];
    const r = P.refs[+key.slice(1)]; return SITE[Math.min(r.base, SITE.length - 1)];
  };
  function workerAt(P, w, g) {
    let h = null;
    for (const x of w.hist) { if (x.s <= g) h = x; else break; }
    if (!h || !h.site) { const S0 = SITE[Math.min(w.home, SITE.length - 1)]; return { x: S0.x + 30, y: S0.y + 10, carry: false }; }
    const to = siteCenter(P, h.site);
    if (h.from && h.from !== h.site) {
      const fr = siteCenter(P, h.from), d = dist(fr, to), k = (g - h.s) / (d / 34);
      if (k < 1) return { x: lerp(fr.x, to.x, k), y: lerp(fr.y + 18, to.y + 18, k), carry: false };
    }
    let res;
    if (h.site[0] === 'r') { const r = P.refs[+h.site.slice(1)]; res = { x: r.x, y: r.y }; }
    else res = to.patch[(w.k * 3) % 8];
    const Tm = 7, ph = ((g - w.born) + hash(w.k) * Tm) % Tm;
    const ax = to.x + (res.x - to.x) * .32, ay = to.y + (res.y - to.y) * .32, bx = res.x + (to.x - res.x) * .14, by = res.y + (to.y - res.y) * .14;
    const jit = (hash(w.k + 7) - .5) * 8;
    if (ph < 2.6) { const k = ph / 2.6; return { x: lerp(ax, bx, k) + jit * .3, y: lerp(ay, by, k) + jit * .3, carry: false }; }
    if (ph < 4) return { x: bx + Math.sin(ph * 9) * 1.2, y: by, carry: false };
    const k = (ph - 4) / 3;
    return { x: lerp(bx, ax, k) + jit * .3, y: lerp(by, ay, k) + jit * .3, carry: true };
  }
  const rallyAt = (P, g) => (P.bases[1] && P.bases[1].done <= g ? RALLY.nat : RALLY.main);

  /* ---------- an attack at time tA, worked out ahead of time ---------- */
  function geometry(A, D, tA) {
    const nat = !!(D.bases[1] && D.bases[1].begun <= tA + 20) && !D.S.some(s => s.type === 'bunker' && s.mode === 'ramp' && s.done <= tA + 20 && !(D.bases[1].begun < s.begun));
    const fpD = nat ? FIGHT.nat : FIGHT.ramp, fpA = mir(fpD);
    const from = rallyAt(A, tA), slot = { x: fpA.x + 46, y: fpA.y };
    return { nat, fpD, fpA, slot, travel: dist(from, slot) / WALK };
  }
  function outcome(RA, RD, A, D, tA) {
    const G = geometry(A, D, tA), tF = tA + G.travel;
    return { G, tF, f: fight(RA.at(tA), RD.at(Math.round(tF))) };
  }
  // inside the attacker's first winning window (counting the walk), the moment its attack keeps the most army alive;
  // if it never wins, its closest try
  function bestTiming(RA, RD, A, D) {
    let best = null, ratio = 0, win = null, left = -1, inWin = false;
    for (let t = 45; t <= 480; t++) {
      const o = outcome(RA, RD, A, D, t);
      if (o.f.a < 0.5) { if (inWin) break; continue; }
      if (o.f.w === 'atk') { inWin = true; if (o.f.left > left + 1e-6) { left = o.f.left; win = t; } continue; }
      if (inWin) break;
      const r = o.f.a / (o.f.d || 1);
      if (r > ratio) { ratio = r; best = t; }
    }
    return win != null ? { t: win, win: true } : { t: best ?? 240, win: false };
  }

  function scene(KA, KD, RA, RD, A, D, tA) {
    const sc = { KA, KD, A, D, tA, u: new Map(), wDie: new Map(), b: new Map() };
    const o = outcome(RA, RD, A, D, tA), { G, f } = o, tF = o.tF, tR = tF + FD;
    Object.assign(sc, { G, f, tF, tR });
    const sa = RA.at(tA), sd = RD.at(Math.round(tF));
    sc.none = f.a < 0.05;
    const atkWins = !sc.none && f.w === 'atk';
    sc.atkWins = atkWins;
    // who fights: every attacker unit out by tA, every defender unit out by the time it lands, and finished bunkers
    const pa = sc.none ? [] : A.units.filter(u => u.born <= tA);
    const pd = sc.none ? [] : D.units.filter(u => u.born <= tF);
    const bunks = sc.none ? [] : D.S.filter(s => s.type === 'bunker' && s.done <= tF);
    // casualties: the loser loses everything; the winner keeps the square-law survivors, cheapest units dying first
    const die = new Map();
    const kill = (list, keepRaw, stim, t0, t1) => {
      const sorted = [...list].sort((x, y) => powOf(x.id, stim) - powOf(y.id, stim) || x.k - y.k);
      let left = sorted.reduce((a, u) => a + powOf(u.id, stim), 0);
      const dead = [];
      for (const u of sorted) { if (left - keepRaw <= powOf(u.id, stim) / 2) break; dead.push(u); left -= powOf(u.id, stim); }
      dead.sort((x, y) => hash(x.k + 3) - hash(y.k + 3)).forEach((u, i) => die.set(u, lerp(t0, t1, (i + .5) / dead.length)));
      return dead.length;
    };
    if (!sc.none) {
      if (atkWins) {
        sc.lostA = kill(pa, f.left, sa.stim, tF + 1, tF + FD * .8);
        pd.forEach((u, i) => die.set(u, lerp(tF + 1, tF + FD, (i + .5) / pd.length)));
        sc.lostD = pd.length;
        bunks.forEach((b, i) => sc.b.set(b, { dies: tF + FD * (.6 + .3 * i / Math.max(1, bunks.length)), hp: [[tF + 1, 1], [tF + FD * .6, .3]] }));
      } else {
        pa.forEach((u, i) => die.set(u, lerp(tF + 1, tF + FD, (i + .5) / pa.length)));
        sc.lostA = pa.length;
        const keep = Math.max(0, f.left / HOME - bunks.length * T.bunker.def);
        sc.lostD = kill(pd, keep, sd.stim, tF + 1, tF + FD * .8);
        bunks.forEach(b => sc.b.set(b, { hp: [[tF + 1, 1], [tF + FD, clamp(1 - f.a / (f.d || 1) * .7, .2, 1)]] }));
      }
    }
    sc.unitsA = pa.length; sc.costA = pa.reduce((a, u) => a + costOf(u.id), 0);
    sc.unitsD = pd.length;
    // the raid: survivors walk into the base and kill workers, faster the bigger they are
    const natBuilding = G.nat && D.bases[1].done > tR ? D.bases[1] : null;   // still going up when the attack wins
    const raidBase = G.nat && !natBuilding ? D.bases[1] : D.bases[0];
    const raidSite = SITE[raidBase ? raidBase.site : 0];
    sc.raidSite = raidSite; sc.raidMain = raidBase === D.bases[0];
    let arrive = G.nat && !natBuilding ? 4 : 10;
    if (atkWins && natBuilding) {
      const down = tR + 4 + clamp(60 / f.left, 2, 12);
      sc.b.set(natBuilding, { dies: down, hp: [[tR + 4, 1], [down, .05]] }); sc.natDown = true;
      arrive = down - tR + 12;
    }
    sc.natStop = natBuilding ? arrive - 12 + tR : null;
    sc.killedW = 0;
    if (atkWins) {
      const P = f.left, rate = clamp(P * 0.09, 0.3, 1.5), s = Math.floor(tR + arrive);
      const keyB = 'b' + (raidBase ? raidBase.site : 0);
      const here = D.workers.filter(w => {
        if (w.born > s) return false;
        let h = null; for (const x of w.hist) { if (x.s <= s) h = x; else break; }
        if (!h) return false;
        return h.site === keyB || (h.site && h.site[0] === 'r' && 'b' + D.refs[+h.site.slice(1)].base === keyB);
      });
      const n = Math.min(here.length, Math.floor(rate * (RAID - arrive)));
      here.slice(0, n).forEach((w, j) => sc.wDie.set(w, tR + arrive + j / rate));
      sc.killedW = n;
      if (raidBase) {
        const fall = tR + arrive + clamp(220 / P, 5, 80);
        if (fall < tR + RAID) { sc.b.set(raidBase, { dies: fall, hp: [[tR + arrive, 1], [fall, .05]] }); sc.baseDead = true; }
        else sc.b.set(raidBase, { hp: [[tR + arrive, 1], [tR + RAID, clamp(1 - RAID / (fall - tR), .1, 1)]] });
      }
    }
    sc.end = sc.none ? tA + 16 : atkWins ? tR + RAID : tR + 14;
    sc.H = Math.ceil(sc.end + 4);
    sc.verdictAt = sc.none ? tA + 2 : atkWins ? tR + 12 : tR + 2;

    // routes: attacker units in the attacker's frame, defender units in the defender's frame
    A.units.forEach(u => {
      const b = u.at, out = { x: b.x + 26, y: b.y + (b.y < 240 ? 16 : -16) };
      const r = route(u.born, out).to(add(rallyAt(A, u.born), spread(u.k), .8));
      let dies = Infinity;
      if (pa.includes(u)) {
        const i = pa.indexOf(u);
        r.wait(tA + hash(u.k) * 1.5).to(add(G.slot, spread(i, 12)));
        const tgt = { x: G.fpA.x - 40, y: G.fpA.y };
        if (die.has(u)) { dies = Math.max(die.get(u), r.end + .5); r.wait(dies + 1, tgt); }
        else {
          r.wait(tR, tgt);
          if (atkWins) {
            if (natBuilding) r.to(add(mir({ x: SITE[1].x + 50, y: SITE[1].y + 40 }), spread(i, 10))).wait(sc.natStop, mir(SITE[1]));
            if (sc.raidMain) r.to(add(mir({ x: 366, y: 240 }), spread(i, 6))).to(add(mir({ x: 230, y: 240 }), spread(i, 13)));
            else r.to(add(mir({ x: raidSite.x + 70, y: raidSite.y }), spread(i, 13)));
            r.wait(sc.H + 5, mir(raidSite));
          } else r.to(add(rallyAt(A, tR), spread(u.k), .8));
        }
      }
      sc.u.set(u, { r, dies });
    });
    D.units.forEach(u => {
      const b = u.at, out = { x: b.x + 26, y: b.y + (b.y < 240 ? 16 : -16) };
      const r = route(u.born, out).to(add(rallyAt(D, u.born), spread(u.k), .8));
      let dies = Infinity;
      if (pd.includes(u)) {
        const i = pd.indexOf(u), tgt = { x: G.fpD.x + 40, y: G.fpD.y };
        r.wait(Math.max(r.end, tA + G.travel * .35)).to(add({ x: G.fpD.x - 34, y: G.fpD.y }, spread(i, 12)));
        if (die.has(u)) { dies = Math.max(die.get(u), r.end + .5); r.wait(dies + 1, tgt); }
        else r.wait(tR + 2, tgt).to(add(rallyAt(D, tR), spread(u.k), .8));
      } else if (atkWins && u.born < sc.end) {   // reinforcements walk into the raid and die
        r.to(add({ x: raidSite.x + 60, y: raidSite.y }, spread(u.k % 7, 8)));
        dies = Math.max(r.end, tR) + 1; r.wait(dies + 1, raidSite);
      }
      sc.u.set(u, { r, dies });
    });

    // the words
    const nA = label(KA), nD = label(KD);
    if (sc.none) sc.verdict = { head: `${nA} has nothing to attack with`, cls: 'def', body: `At ${fmt(tA)} ${nA} has no army yet. Try a later timing, or Best.` };
    else if (atkWins) sc.verdict = {
      head: `${nA} breaks ${nD}`, cls: 'atk',
      body: `Moved out at ${fmt(tA)}, arrived ${fmt(tF)}: ${f.a.toFixed(1)} attacking power into ${f.d.toFixed(1)} defence. ${nA} lost ${sc.lostA} of ${sc.unitsA} units${sc.natDown ? ', knocked down the half-built second base' : ''}, then killed ${sc.killedW} workers${sc.baseDead ? ` and the ${sc.raidMain ? 'main' : 'second'} base` : ''}.`,
    };
    else sc.verdict = {
      head: `${nD} holds`, cls: 'def',
      body: `${nA} moved out at ${fmt(tA)} with ${f.a.toFixed(1)} power into ${f.d.toFixed(1)} defence (army${bunks.length ? ' + bunkers' : ''} × ${HOME} at home) and lost all ${sc.unitsA} units, ${sc.costA} ore and gas. ${nD} lost ${sc.lostD}.`,
    };
    return sc;
  }

  /* ---------- drawing ---------- */
  function painter(cv) {
    const g = cv.getContext('2d'), S = 2, W = cv.width / S, H = cv.height / S;
    const sc = Math.min(W / MW, H / MH), ox = (W - MW * sc) / 2, oy = (H - MH * sc) / 2;
    let ground = null;
    document.fonts?.ready.then(() => { ground = null; });
    const X = (p, flip) => ({ x: flip ? MW - p.x : p.x, y: p.y });
    function terrain() {
      const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
      const q = c.getContext('2d');
      q.setTransform(S * sc, 0, 0, S * sc, S * ox, S * oy);
      q.beginPath(); q.roundRect(0, 0, MW, MH, 12); q.fillStyle = '#121b2e'; q.fill(); q.save(); q.clip();
      for (let i = 0; i < 90; i++) { q.fillStyle = 'rgba(255,255,255,.025)'; q.beginPath(); q.arc(hash(i) * MW, hash(i + 99) * MH, 6 + hash(i + 3) * 30, 0, 7); q.fill(); }
      q.strokeStyle = 'rgba(255,255,255,.05)'; q.setLineDash([6, 10]); q.beginPath(); q.moveTo(MW / 2, 10); q.lineTo(MW / 2, MH - 10); q.stroke(); q.setLineDash([]);
      for (const flip of [false, true]) {
        const P = p => X(p, flip);
        const a = P({ x: 8, y: 52 }), b = P({ x: 338, y: 428 });
        q.beginPath(); q.roundRect(Math.min(a.x, b.x), a.y, Math.abs(b.x - a.x), b.y - a.y, 26); q.fillStyle = '#1f2c48'; q.fill(); q.strokeStyle = '#3a4f7e'; q.lineWidth = 3; q.stroke();
        const r = [{ x: 330, y: 214 }, { x: 392, y: 204 }, { x: 392, y: 276 }, { x: 330, y: 266 }].map(P);
        q.beginPath(); r.forEach((p, i) => (i ? q.lineTo(p.x, p.y) : q.moveTo(p.x, p.y))); q.closePath(); q.fillStyle = '#1b2640'; q.fill();
        for (let i = 1; i < 4; i++) { const p = P({ x: 330 + i * 15, y: 210 }), p2 = P({ x: 330 + i * 15, y: 270 }); q.strokeStyle = 'rgba(255,255,255,.07)'; q.lineWidth = 2; q.beginPath(); q.moveTo(p.x, p.y); q.lineTo(p2.x, p2.y); q.stroke(); }
        SITE.slice(0, 3).forEach(s => {
          s.patch.forEach(p => crystal(q, P(p)));
          s.gey.forEach(([x, y]) => { const p = P({ x, y }); q.fillStyle = 'rgba(95,224,160,.25)'; q.beginPath(); q.ellipse(p.x, p.y, 15, 10, 0, 0, 7); q.fill(); q.strokeStyle = 'rgba(95,224,160,.5)'; q.lineWidth = 1.5; q.stroke(); });
        });
        const m = P({ x: 170, y: 456 }); q.font = '500 15px Jost'; q.fillStyle = 'rgba(169,183,214,.6)'; q.textAlign = 'center'; q.fillText('main base (high ground)', m.x, m.y);
        const rp = P({ x: 366, y: 312 }); q.fillText('ramp', rp.x, rp.y);
      }
      q.restore();
      return c;
    }
    function crystal(q, p) {
      q.save(); q.translate(p.x, p.y); const s = 7;
      q.fillStyle = '#4fb8ff'; q.strokeStyle = '#bfe6ff'; q.lineWidth = 1;
      for (const [dx, h] of [[-s * .7, 1.1], [0, 1.6], [s * .7, 1]]) { q.beginPath(); q.moveTo(dx, -s * h); q.lineTo(dx + s * .45, 0); q.lineTo(dx, s * .5); q.lineTo(dx - s * .45, 0); q.closePath(); q.fill(); q.stroke(); }
      q.restore();
    }
    const hpAt = (hp, t) => {
      if (!hp) return 1;
      if (t <= hp[0][0]) return hp[0][1];
      for (let i = 0; i < hp.length - 1; i++) if (t <= hp[i + 1][0]) return lerp(hp[i][1], hp[i + 1][1], (t - hp[i][0]) / (hp[i + 1][0] - hp[i][0]));
      return hp[hp.length - 1][1];
    };
    function building(s, flip, t, col, ov) {
      if (t < s.begun) return;
      const p = X(s, flip), dead = ov && ov.dies != null && t >= ov.dies;
      const prog = s.done <= s.begun ? 1 : clamp((t - s.begun) / (s.done - s.begun));
      g.save(); g.translate(p.x, p.y);
      if (dead) {
        g.globalAlpha = clamp(1 - (t - ov.dies) / 30, .35, 1); g.fillStyle = '#3b4255';
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((hash(i + s.x) - .5) * 30, (hash(i + s.y) - .5) * 24, 4 + hash(i) * 5, 0, 7); g.fill(); }
        if (t - ov.dies < 4) { g.strokeStyle = `rgba(255,200,120,${1 - (t - ov.dies) / 4})`; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 20 + (t - ov.dies) * 14, 0, 7); g.stroke(); }
        g.restore(); return;
      }
      g.globalAlpha = prog < 1 ? .45 : 1;
      g.fillStyle = shade(col, .42); g.strokeStyle = col; g.lineWidth = 3;
      const ty = s.type;
      if (ty === 'base') {
        const r = 34; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(0, 0, r * .34, 0, 7); g.fill();
      } else if (ty === 'barracks') { g.beginPath(); g.roundRect(-18, -16, 36, 32, 5); g.fill(); g.stroke(); g.fillStyle = col; g.fillRect(-5, -10, 10, 20); }
      else if (ty === 'factory') { g.beginPath(); g.roundRect(-20, -17, 40, 34, 4); g.fill(); g.stroke(); g.fillStyle = col; g.fillRect(-12, -7, 24, 4); g.fillRect(-12, 3, 24, 4); }
      else if (ty === 'starport') { g.beginPath(); g.moveTo(0, -20); g.lineTo(20, 0); g.lineTo(0, 20); g.lineTo(-20, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); }
      else if (ty === 'supply') { g.beginPath(); g.roundRect(-10, -9, 20, 18, 3); g.fill(); g.lineWidth = 2; g.stroke(); g.fillStyle = col; g.fillRect(-5, -2, 10, 4); }
      else if (ty === 'refinery') { g.beginPath(); g.roundRect(-16, -11, 32, 22, 6); g.fillStyle = shade('#5fe0a0', .35); g.fill(); g.strokeStyle = '#5fe0a0'; g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); }
      else if (ty === 'lab') { g.beginPath(); g.roundRect(-9, -9, 18, 18, 3); g.fill(); g.lineWidth = 2; g.stroke(); g.fillStyle = '#d58cff'; g.beginPath(); g.arc(0, 0, 3.5, 0, 7); g.fill(); }
      else if (ty === 'bunker') { g.beginPath(); g.arc(0, 4, 15, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = col; g.fillRect(-7, -2, 14, 3); }
      g.globalAlpha = 1;
      if (prog < 1) { const r = ty === 'base' ? 42 : 24; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); g.stroke(); }
      g.restore();
      const f = hpAt(ov && ov.hp, t);
      if (prog >= 1 && f < .999) {
        const w = ty === 'base' ? 60 : 34, y = p.y + (ty === 'base' ? 40 : 20);
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(p.x - w / 2, y, w, 6); g.fillStyle = f > .5 ? col : '#ff6b6b'; g.fillRect(p.x - w / 2, y, w * f, 6);
      }
    }
    function unitGlyph(id, x, y, fx, fy, col, strike) {
      g.fillStyle = col; g.strokeStyle = '#0b1222'; g.lineWidth = 2;
      const ang = Math.atan2(fy, fx);
      if (id === 'soldier' || id === 'ranger') {
        const r = id === 'ranger' ? 8.5 : 6.5;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
        if (id === 'ranger') { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r * .5, 0, 7); g.stroke(); }
        g.strokeStyle = '#e8f6ff'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x + fx * r * .5, y + fy * r * .5); g.lineTo(x + fx * r * 1.9, y + fy * r * 1.9); g.stroke();
      } else if (id === 'raider' || id === 'tank') {
        const L = id === 'tank' ? 12 : 10, Wd = id === 'tank' ? 8 : 6;
        g.save(); g.translate(x, y); g.rotate(ang);
        g.beginPath(); g.roundRect(-L, -Wd, L * 2, Wd * 2, 3); g.fill(); g.stroke();
        if (id === 'tank') { g.fillStyle = shade(col, .6); g.beginPath(); g.arc(0, 0, 5, 0, 7); g.fill(); g.strokeStyle = '#e8f6ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(3, 0); g.lineTo(L + 9, 0); g.stroke(); }
        else { g.fillStyle = '#0b1222'; g.fillRect(-L + 2, -Wd - 2, 5, 3); g.fillRect(L - 7, -Wd - 2, 5, 3); g.fillRect(-L + 2, Wd - 1, 5, 3); g.fillRect(L - 7, Wd - 1, 5, 3); }
        g.restore();
      } else if (id === 'gunship') {
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + 4, y + 12, 9, 4, 0, 0, 7); g.fill();
        g.save(); g.translate(x, y - 4); g.rotate(ang); g.fillStyle = col;
        g.beginPath(); g.moveTo(14, 0); g.lineTo(-9, -10); g.lineTo(-4, 0); g.lineTo(-9, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
      }
      if (strike) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.beginPath(); g.arc(x + fx * 20, y + fy * 20, 6, 0, Math.PI * 1.2); g.stroke(); }
    }
    function puff(p, age, k = 1) {
      if (age > 4 || age < 0) return;
      const a = 1 - age / 4; g.strokeStyle = `rgba(230,236,255,${a})`; g.lineWidth = 2;
      g.beginPath(); g.arc(p.x, p.y, (6 + age * 6) * k, 0, 7); g.stroke();
      const s = 5 * k; g.beginPath(); g.moveTo(p.x - s, p.y - s); g.lineTo(p.x + s, p.y + s); g.moveTo(p.x + s, p.y - s); g.lineTo(p.x - s, p.y + s); g.stroke();
    }
    const RANGED = { ranger: 150, tank: 210, gunship: 150 };
    function side(P, flip, t, col, scn, mine) {
      // buildings
      P.S.forEach(s => building(s, flip, t, col, scn.b.get(s)));
      // workers
      P.workers.forEach(w => {
        if (t < w.born) return;
        const d = scn.wDie.get(w);
        const st = workerAt(P, w, d != null ? Math.min(t, d) : t), p = X(st, flip);
        if (d != null && t >= d) { puff(p, t - d, .7); return; }
        const s = 4.2; g.fillStyle = shade(col, 1.15); g.strokeStyle = '#0b1222'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(p.x, p.y - s); g.lineTo(p.x + s, p.y); g.lineTo(p.x, p.y + s); g.lineTo(p.x - s, p.y); g.closePath(); g.fill(); g.stroke();
        if (st.carry) { g.fillStyle = '#7fd0ff'; g.beginPath(); g.arc(p.x, p.y - s - 2.5, 2.3, 0, 7); g.fill(); }
      });
      // units
      P.units.forEach(u => {
        if (t < u.born) return;
        const { r, dies } = scn.u.get(u), st = posAt(r.kf, Math.min(t, dies)), p = X(st, flip);
        if (t >= dies) { puff(p, t - dies); return; }
        let fx = st.atk ? st.atk.x - st.x : st.dx, fy = st.atk ? st.atk.y - st.y : st.dy;
        if (flip) fx = -fx;
        const d = Math.hypot(fx, fy) || 1; fx /= d; fy /= d;
        if (!st.atk && !st.dx && !st.dy) { fx = flip ? -1 : 1; fy = 0; }
        const wob = st.atk ? Math.sin(t * 9 + u.k * 2) * 2.5 : 0;
        unitGlyph(u.id, p.x + fx * wob, p.y + fy * wob, fx, fy, col, st.atk && !RANGED[u.id] && ((t * 3 + u.k * .37) % 1) < .35);
        mine.push({ u, p, atk: !!st.atk });
      });
    }
    function tracers(from, to, t) {
      from.forEach(({ u, p, atk }) => {
        const R = RANGED[u.id]; if (!R || !atk) return;
        let best = null, bd = R;
        to.forEach(q => { const d = dist(p, q.p); if (d < bd) { bd = d; best = q.p; } });
        if (!best) return;
        const ph = (t * 1.3 + u.k * .37) % 1; if (ph > .3) return;
        const a = 1 - ph / .3;
        g.strokeStyle = u.id === 'tank' ? `rgba(255,200,120,${a})` : `rgba(255,255,255,${a * .8})`; g.lineWidth = u.id === 'tank' ? 3 : 1.5;
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(best.x, best.y); g.stroke();
        if (u.id === 'tank') { g.fillStyle = `rgba(255,170,90,${a})`; g.beginPath(); g.arc(best.x, best.y, 10 * a + 3, 0, 7); g.fill(); }
      });
    }
    function bunkerFire(scn, t, targets) {
      scn.D.S.forEach(s => {
        if (s.type !== 'bunker' || s.done > t) return;
        const ov = scn.b.get(s); if (ov && ov.dies != null && t >= ov.dies) return;
        const me = X(s, true); let best = null, bd = 190;
        targets.forEach(q => { const d = dist(me, q.p); if (d < bd) { bd = d; best = q.p; } });
        if (!best) return;
        const ph = (t * 1.6 + s.i * .3) % 1; if (ph > .4) return;
        g.strokeStyle = `rgba(255,236,170,${1 - ph / .4})`; g.lineWidth = 2; g.beginPath(); g.moveTo(me.x, me.y - 4); g.lineTo(best.x, best.y); g.stroke();
      });
    }
    function pill(text, x, y, size, col, bg = 'rgba(6,14,32,.88)') {
      g.font = `800 ${size}px Montserrat, Jost`; const w = g.measureText(text).width + size * 1.4;
      g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - size * .95, w, size * 1.9, size * .95); g.fill();
      g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1); g.textBaseline = 'alphabetic';
    }
    return function draw(scn, t, colA, colD) {
      if (!ground) ground = terrain();
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(ground, 0, 0);
      g.setTransform(S * sc, 0, 0, S * sc, S * ox, S * oy);
      g.save(); g.beginPath(); g.roundRect(0, 0, MW, MH, 12); g.clip();
      const ua = [], ud = [];
      side(scn.A, false, t, colA, scn, ua);
      side(scn.D, true, t, colD, scn, ud);
      tracers(ua, ud, t); tracers(ud, ua, t); bunkerFire(scn, t, ua);
      // the attack, drawn as an arrow from the rally to the fight
      if (!scn.none && t >= scn.tA - 8 && t < scn.tR) {
        const a = rallyAt(scn.A, scn.tA), b = scn.G.slot;
        g.globalAlpha = t < scn.tA ? clamp((t - scn.tA + 8) / 8) * .6 : .9;
        g.strokeStyle = colA; g.lineWidth = 4; g.setLineDash([14, 10]); g.lineDashOffset = -t * 20;
        g.beginPath(); g.moveTo(a.x + 20, a.y); g.lineTo(b.x - 10, b.y); g.stroke(); g.setLineDash([]);
        const ang = Math.atan2(b.y - a.y, b.x - a.x); g.fillStyle = colA; g.beginPath();
        g.moveTo(b.x, b.y); g.lineTo(b.x - 20 * Math.cos(ang - .5), b.y - 20 * Math.sin(ang - .5)); g.lineTo(b.x - 20 * Math.cos(ang + .5), b.y - 20 * Math.sin(ang + .5)); g.closePath(); g.fill();
        g.globalAlpha = 1;
      }
      // the two players' names on their main bases
      g.font = '800 20px Montserrat, Jost'; g.textAlign = 'left'; g.fillStyle = colA; g.fillText(`${label(scn.KA)} · attacker`, 22, 38);
      g.textAlign = 'right'; g.fillStyle = colD; g.fillText(`defender · ${label(scn.KD)}`, MW - 22, 38);
      g.restore();
      // overlays, in map units
      pill(`game clock ${fmt(t)}`, MW / 2, 30, 22, '#ffb547');
      if (!scn.none) {
        const fp = mir(scn.G.fpD);
        if (t >= scn.tA - 8 && t < scn.tA) pill(`${label(scn.KA)} moves out at ${fmt(scn.tA)}`, MW / 2, MH - 34, 22, '#fff');
        else if (t >= scn.tA && t < scn.tF) pill(`moving out · lands at ${fmt(scn.tF)}`, MW / 2, MH - 34, 22, colA);
        else if (t >= scn.tF && t < scn.tR) {
          pill(`${scn.f.a.toFixed(1)} attack  vs  ${scn.f.d.toFixed(1)} defence`, fp.x, fp.y - 92, 20, '#fff');
          pill('FIGHT', fp.x, fp.y - 132, 18, '#152044', '#ffb547');
        } else if (t >= scn.tR && scn.atkWins) pill(`${scn.killedW ? `workers lost: ${Math.min(scn.killedW, [...scn.wDie.values()].filter(d => d <= t).length)}` : 'raiding'}`, MW / 2, MH - 34, 22, '#ff9a9a');
      }
      if (t >= scn.verdictAt) {
        const V = scn.verdict, col = V.cls === 'atk' ? colA : colD;
        g.globalAlpha = clamp((t - scn.verdictAt) / 2);
        // over the attacker's half: by now the action is all on the defender's side
        const cx = 410;
        g.fillStyle = 'rgba(6,14,32,.93)'; g.beginPath(); g.roundRect(cx - 370, 130, 740, 190, 18); g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
        g.fillStyle = col; g.font = '800 34px Montserrat, Jost'; g.textAlign = 'center'; g.fillText(V.head, cx, 178);
        g.font = '500 21px Jost'; g.fillStyle = '#fff';
        const words = V.body.split(' '); let line = '', yy = 216;
        for (const wd of words) { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > 680 && line) { g.fillText(line, cx, yy); line = wd; yy += 28; } else line = tt; }
        g.fillText(line, cx, yy);
        g.globalAlpha = 1;
      }
    };
  }

  /* ---------- the slide ---------- */
  demo('bo-map', {
    init(s) {
      const RUN = {}, MOD = {};
      const yours = () => store.get('bo-lab', null) || PRESETS.standard;
      const get = k => {
        if (!RUN[k]) { RUN[k] = run(k === 'yours' ? yours() : PRESETS[k], { until: UNTIL }); MOD[k] = model(RUN[k]); }
        return [RUN[k], MOD[k]];
      };
      const st = { atk: 'rush', def: 'expand', when: 'best' };
      const draw = painter($(s, '.bo-map-cv'));
      let scn, tr, chips = [];
      const colOf = (k, other) => (k === other && k !== st.atk ? '#e8e2cf' : meta(k).col);
      const pic = k => meta(k).img ? `<img src="${meta(k).img}" alt="">` : `<span class="bo-pic-std">${icon(k === 'yours' ? 'worker' : 'base', 18, '#152044')}</span>`;
      const pick = (box, side) => {
        box.innerHTML = KEYS.map(k => `<button class="bo-pk row" data-k="${k}" style="--c:${meta(k).col}" title="${esc(meta(k).tag)}">${pic(k)}<span>${label(k)}</span></button>`).join('');
        $$(box, '[data-k]').forEach(b => b.onclick = () => { st[side] = b.dataset.k; redo(); });
      };
      pick($(s, '.bo-map-a'), 'atk'); pick($(s, '.bo-map-d'), 'def');
      const whenBox = $(s, '.bo-map-when');
      function ticker(box, k, R, col) {
        const list = R.steps.map((x, i) => {
          const bad = x.bad || x.start == null;
          return `<span class="bo-wchip${bad ? ' bad' : ''}" data-i="${i}" style="--c:${T[x.id].col}" title="${esc(T[x.id].name)}${bad ? ': never starts' : ` at ${fmt(x.start)}`}"><b>${bad ? '✕' : x.supply ?? ''}</b>${icon(x.id, 18, '#152044')}</span>`;
        }).join('');
        box.innerHTML = `<div class="bo-wb-h"><b style="color:${col}">${label(k)}</b><span>${esc(meta(k).tag)}</span></div><div class="bo-wb-chips">${list}</div><div class="bo-wb-now"></div>`;
        return { box, R, els: $$(box, '.bo-wchip'), now: $(box, '.bo-wb-now') };
      }
      function redo() {
        $$(s, '.bo-map-a [data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === st.atk));
        $$(s, '.bo-map-d [data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === st.def));
        const [RA, A] = get(st.atk), [RD, D] = get(st.def);
        const best = bestTiming(RA, RD, A, D);
        const tA = st.when === 'best' ? best.t : +st.when;
        whenBox.innerHTML = `<span class="bo-pick-lbl">attack at</span>` + [['best', `${best.win ? 'Best' : 'Closest'} ${fmt(best.t)}`], ...[180, 240, 300, 360, 420].map(v => [String(v), fmt(v)])]
          .map(([v, l]) => `<button class="bo-wt ${String(st.when) === v ? 'on' : ''}" data-w="${v}" title="${v === 'best' ? (best.win ? 'The first moment this attack wins, counting the walk across the map' : 'This attack never wins before 8:00; this is its closest try') : ''}">${l}</button>`).join('');
        $$(whenBox, '[data-w]').forEach(b => b.onclick = () => { st.when = b.dataset.w; redo(); });
        scn = scene(st.atk, st.def, RA, RD, A, D, tA);
        scn.colA = colOf(st.atk); scn.colD = st.atk === st.def ? '#e8e2cf' : meta(st.def).col;
        chips = [ticker($(s, '.bo-map-ba'), st.atk, RA, scn.colA), ticker($(s, '.bo-map-bd'), st.def, RD, scn.colD)];
        tr = transport($(s, '.bo-transport'), { H: scn.H, t: 0, onTime: t => paint(t) });
        s._tr = tr; s._scn = scn;
        paint(0);
        if (s._on) tr.start();
      }
      function paint(t) {
        draw(scn, t, scn.colA, scn.colD);
        chips.forEach(c => {
          let cur = null;
          c.R.steps.forEach((x, i) => {
            const done = x.start != null && x.start <= t;
            c.els[i].classList.toggle('done', done);
            if (done) cur = i;
          });
          c.els.forEach((e, i) => e.classList.toggle('cur', i === cur));
          const x = cur != null ? c.R.steps[cur] : null;
          c.now.innerHTML = x ? `<b>${fmt(x.start)}</b> ${x.supply ?? ''} ${esc(T[x.id].name)}${cur === c.R.steps.length - 1 ? ' · then keeps producing' : ''}` : 'workers only, so far';
        });
        const live = (P, side) => {
          const ws = P.workers.filter(w => w.born <= t && !(scn.wDie.get(w) <= t)).length;
          const snap = (side === 'a' ? RUN[st.atk] : RUN[st.def]).at(t);
          const pow = P.units.reduce((a, u) => a + (u.born <= t && !(scn.u.get(u).dies <= t) ? powOf(u.id, snap.stim) : 0), 0);
          const def = P.S.filter(x => x.type === 'bunker' && x.done <= t && !(scn.b.get(x)?.dies <= t)).length * T.bunker.def;
          return { ws, pow, def };
        };
        const a = live(scn.A, 'a'), d = live(scn.D, 'd');
        say($(s, '.bo-hud'), `<div class="bo-clock-big">${fmt(t)}</div>
          <div class="bo-stat"><i style="--c:${scn.colA}"></i><b>${a.pow.toFixed(1)}</b><small>${label(st.atk)} army · ${a.ws} workers</small></div>
          <div class="bo-stat"><i style="--c:${scn.colD}"></i><b>${d.pow.toFixed(1)}${d.def ? ` + ${d.def}` : ''}</b><small>${label(st.def)} army${d.def ? ' + bunkers' : ''} · ${d.ws} workers</small></div>`);
      }
      s._redo = redo;
      s._st = st;
      s._fresh = () => { delete RUN.yours; delete MOD.yours; };
      redo();
    },
    enter(s) {
      s._on = true;
      // arriving from One Clock's button, or with a newer build on the Simulator slide
      const want = window.BO_MAP_PAIR; window.BO_MAP_PAIR = null;
      if (want) { s._st.atk = want.atk; s._st.def = want.def; s._st.when = 'best'; }
      s._fresh();
      s._redo();
      s._tr.start();
      s._stop = raf(dt => s._tr.tick(dt));
    },
    leave(s) { s._on = false; s._stop?.(); s._tr.stop(); },
  });
})();
