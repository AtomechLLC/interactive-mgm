/* Resource pool sandbox (MGM C4 M2, deck slides 198-216, 257).
   1. A mana pool over 30 seconds of play. Generators (inflow): passive regen, a potion, conversion (health into mana) and
      conditional (crits refund 50% more). Spenders (outflow): casting, a passive leak above an equilibrium point, a
      triggered drain when struck, and theft. Capacity caps it. sim() runs the whole 30 s for the current setup, so the
      graph is instant and the playhead just reveals it; the x2 / x½ buttons are slide 257's "explore the extremes".
      Numbers are illustrative: R.
   2. Discrete vs continuous: Jhin-style four-shot clip (every 4th shot hits harder, then reload) next to a battery that
      drains while a boost is held (the Subnautica Seaglide). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, SPAN = 30, DT = .05;
  const R = { cap: 100, regen: 6, potion: 30, potionAt: [9, 21], convert: 25, convertBelow: 15, convertCd: 5, cost: 20, castEvery: 2, critEvery: 3, crit: 10, leakAbove: 60, leak: 6, struck: 12, struckEvery: 7, thief: 7, thiefFrom: 16, thiefTo: 20 };
  const GEN = [['passive', 'Passive regen (mana per second)'], ['potion', 'Active: drink a potion'], ['convert', 'Conversion: health into mana'], ['crit', 'Conditional: crits refund 50% more']];
  const SPEND = [['cast', 'Active: cast a 20-mana spell'], ['leak', `Equilibrium: leaks above ${R.leakAbove}`], ['struck', 'Triggered: drained when struck'], ['thief', 'Theft: an enemy drains you']];
  const X = [['cap', 'Capacity'], ['in', 'Inflow'], ['out', 'Outflow']];

  // run 30 seconds: returns the pool over time plus every event (casts tried, blocked, overflow, conversions...)
  function sim(o) {
    const cap = R.cap * o.mul.cap, inM = o.mul.in, outM = o.mul.out;
    let p = 50, hp = 100, nextCast = 1, cd = 0, casts = 0;
    const pts = [], ev = [], acc = { wasted: 0, blocked: 0, cast: 0, gen: 0, spent: 0 };
    const add = (v, kind, t) => { if (v <= 0) return; const room = cap - p, got = Math.min(v, room); p += got; acc.gen += got; if (v > got + 1e-9) acc.wasted += v - got; if (kind) ev.push({ t, kind, v }); };
    const take = (v, kind, t) => { const got = Math.min(v, p); p -= got; acc.spent += got; if (kind) ev.push({ t, kind, v: got }); };
    for (let i = 0; i <= SPAN / DT; i++) {
      const t = i * DT;
      if (o.on.passive) add(R.regen * inM * DT, null, t);
      if (o.on.potion && R.potionAt.some(a => Math.abs(t - a) < DT / 2)) add(R.potion * inM, 'potion', t);
      cd -= DT;
      if (o.on.convert && p < R.convertBelow && cd <= 0) { add(R.convert * inM, 'convert', t); hp -= R.convert; cd = R.convertCd; }
      if (o.on.cast && t >= nextCast) {
        const cost = R.cost * outM;
        if (p >= cost - 1e-9) { take(cost, 'cast', t); casts++; acc.cast++; if (o.on.crit && casts % R.critEvery === 0) add(R.crit * inM, 'crit', t); }
        else { acc.blocked++; ev.push({ t, kind: 'blocked' }); }
        nextCast += R.castEvery;
      }
      if (o.on.leak && p > R.leakAbove) take(Math.min(p - R.leakAbove, R.leak * outM * DT), null, t);
      if (o.on.struck && t > 0 && Math.abs(t % R.struckEvery) < DT / 2) take(R.struck * outM, 'struck', t);
      if (o.on.thief && t >= R.thiefFrom && t < R.thiefTo) take(R.thief * outM * DT, null, t);
      pts.push([t, p]);
    }
    return { pts, ev, acc, cap, hp };
  }

  const G = { x0: 420, x1: 1020, y0: 300, y1: 30 };
  function graph(g, r, play, o) {
    const gx = t => lerp(G.x0, G.x1, t / SPAN), maxV = Math.max(200, r.cap), gy = v => lerp(G.y0, G.y1, v / maxV);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(G.x0 - 50, 10, G.x1 - G.x0 + 60, 340, 12); g.fill();
    g.strokeStyle = '#d8ccb0'; g.lineWidth = 1; g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textBaseline = 'middle';
    [0, 50, 100, 150, 200].forEach(v => { g.beginPath(); g.moveTo(G.x0, gy(v)); g.lineTo(G.x1, gy(v)); g.stroke(); g.textAlign = 'right'; g.fillText(v, G.x0 - 8, gy(v)); });
    g.textAlign = 'center'; [0, 10, 20, 30].forEach(t => g.fillText(`${t} s`, gx(t), G.y0 + 16));
    // capacity line and the equilibrium point
    g.setLineDash([8, 6]); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(G.x0, gy(r.cap)); g.lineTo(G.x1, gy(r.cap)); g.stroke();
    T.label(`capacity ${Math.round(r.cap)}`, G.x1 - 60, gy(r.cap) - 14, 'center', C.navy, 12);
    if (o.on.leak) { g.strokeStyle = '#e0a92d'; g.beginPath(); g.moveTo(G.x0, gy(R.leakAbove)); g.lineTo(G.x1, gy(R.leakAbove)); g.stroke(); T.label('equilibrium point', G.x0 + 70, gy(R.leakAbove) - 14, 'center', '#9a5a06', 12); }
    g.setLineDash([]);
    if (o.on.thief) { g.fillStyle = 'rgba(229,50,45,.1)'; g.fillRect(gx(R.thiefFrom), G.y1, gx(R.thiefTo) - gx(R.thiefFrom), G.y0 - G.y1); T.label('theft', gx((R.thiefFrom + R.thiefTo) / 2), G.y1 + 12, 'center', C.redDk, 12); }
    // the pool so far
    const upto = r.pts.filter(([t]) => t <= play);
    g.fillStyle = 'rgba(60,111,224,.15)'; g.beginPath(); g.moveTo(gx(0), gy(0)); upto.forEach(([t, v]) => g.lineTo(gx(t), gy(v))); if (upto.length) g.lineTo(gx(upto.at(-1)[0]), gy(0)); g.closePath(); g.fill();
    g.strokeStyle = '#3c6fe0'; g.lineWidth = 3.5; g.beginPath(); upto.forEach(([t, v], i) => i ? g.lineTo(gx(t), gy(v)) : g.moveTo(gx(t), gy(v))); g.stroke();
    // cast strip: a tick per cast attempt
    const sy = 330;
    g.fillStyle = C.muted; g.font = '600 12px Jost, sans-serif'; g.textAlign = 'right'; g.fillText('casts', G.x0 - 8, sy);
    r.ev.filter(e => e.t <= play && (e.kind === 'cast' || e.kind === 'blocked')).forEach(e => { g.fillStyle = e.kind === 'cast' ? C.good : C.red; g.font = '800 13px Jost, sans-serif'; g.textAlign = 'center'; g.fillText(e.kind === 'cast' ? '●' : '✕', gx(e.t), sy); });
    if (play < SPAN) { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(gx(play), G.y1); g.lineTo(gx(play), sy + 8); g.stroke(); }
    return upto.length ? upto.at(-1)[1] : 50;
  }
  // the pool as a tank with pipes in and drains out
  function tank(g, r, p, play, o) {
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(10, 10, 350, 340, 12); g.fill();
    const tx = 125, tw = 120, ty0 = 70, ty1 = 290, maxV = Math.max(200, r.cap), vy = v => lerp(ty1, ty0, v / maxV);
    g.fillStyle = '#e9e3d4'; g.fillRect(tx, vy(r.cap), tw, ty1 - vy(r.cap));
    g.fillStyle = '#3c6fe0'; g.fillRect(tx, vy(p), tw, ty1 - vy(p));
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(tx + 8, vy(p), 14, ty1 - vy(p));
    g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.moveTo(tx, vy(r.cap) - 6); g.lineTo(tx, ty1); g.lineTo(tx + tw, ty1); g.lineTo(tx + tw, vy(r.cap) - 6); g.stroke();
    g.fillStyle = C.ink; g.font = '800 26px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${Math.round(p)}`, tx + tw / 2, ty1 - 24);
    g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`MP (${Math.round(p)}/${Math.round(r.cap)})`, tx + tw / 2, ty1 + 20);
    // inflow pipes on the left, outflow on the right, lit when that source is on
    const ins = GEN.filter(([k]) => o.on[k]), outs = SPEND.filter(([k]) => o.on[k]);
    ins.forEach(([k], i) => { const y = 80 + i * 44; g.strokeStyle = '#2fae63'; g.lineWidth = 8; g.beginPath(); g.moveTo(24, y); g.lineTo(tx - 4, y + 20); g.stroke(); T.label(k === 'passive' ? 'regen' : k, 54, y - 14, 'center', '#1a8a4c', 11); });
    outs.forEach(([k], i) => { const y = 160 + i * 40; g.strokeStyle = '#e5322d'; g.lineWidth = 8; g.beginPath(); g.moveTo(tx + tw + 4, y); g.lineTo(346, y + 20); g.stroke(); T.label(k, 318, y - 12, 'center', C.redDk, 11); });
    T.label('inflow', 54, 36, 'center', '#fff', 12, C.good); T.label('outflow', 318, 36, 'center', '#fff', 12, C.redDk);
    // recent events float off the tank
    r.ev.filter(e => e.t <= play && play - e.t < .9 && e.kind !== 'blocked' && e.kind !== 'cast').forEach(e => T.popText(`+${Math.round(e.v)} ${e.kind}`, tx + tw / 2, vy(p) - 20 - 30 * (play - e.t), C.good, 1 - (play - e.t)));
    r.ev.filter(e => e.t <= play && play - e.t < .6 && e.kind === 'blocked').forEach(e => T.popText('not enough mana!', tx + tw / 2, 50, C.redDk, 1 - (play - e.t) / .6));
  }
  function tallies(g, r, play) {
    const acc = { cast: 0, blocked: 0 }; r.ev.forEach(e => { if (e.t <= play && acc[e.kind] != null) acc[e.kind]++; });
    const done = play >= SPAN, items = [[acc.cast, 'casts', C.good], [acc.blocked, 'casts blocked', acc.blocked ? C.redDk : C.ink], [done ? Math.round(r.acc.wasted) : '…', 'mana wasted at the cap', r.acc.wasted > 1 && done ? '#9a5a06' : C.ink], [done ? Math.round(r.acc.gen) : '…', 'mana generated', C.ink]];
    items.forEach(([v, l, col], i) => {
      const x = 10 + i * 256;
      g.fillStyle = 'rgba(255,252,244,.9)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x, 366, 246, 90, 12); g.fill(); g.stroke();
      g.fillStyle = col; g.font = '800 32px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v, x + 123, 400);
      g.fillStyle = C.muted; g.font = '600 13px Jost, sans-serif'; g.fillText(l, x + 123, 436);
    });
  }

  const base = () => ({ on: { passive: false, potion: false, convert: false, crit: false, cast: false, leak: false, struck: false, thief: false }, mul: { cap: 1, in: 1, out: 1 } });
  const step = (on, mul = {}, cap) => { const b = base(); on.forEach(k => { b.on[k] = true; }); Object.assign(b.mul, mul); b.cap = cap; return b; };
  const TOUR = [
    step(['passive'], {}, 'Capacity and inflow only: it fills, hits the cap, and the rest is wasted.'),
    step(['passive', 'cast'], {}, 'Add a spender. Inflow and outflow now push against each other, and sometimes you can’t cast.'),
    step(['passive', 'cast', 'potion', 'convert', 'crit'], {}, 'More generators: a potion, converting health into mana when low, and crits that refund more.'),
    step(['passive', 'potion', 'convert', 'crit', 'cast', 'leak', 'struck', 'thief'], {}, 'More spenders: a leak above the equilibrium point, a drain when struck, and an enemy stealing mana.'),
    step(['passive', 'cast'], { in: 2 }, 'Explore the extremes: double the inflow. Casting is never blocked and the rest spills at the cap, so mana stops being a decision.'),
    step(['passive', 'cast'], { out: 2 }, 'Double the outflow: most casts are blocked. The player spends the fight waiting.'),
    step(['passive', 'potion'], { cap: .5 }, 'Halve the capacity: the pool tops out at 50, so regen and both potions spill over. There is nothing to save up for a burst.'),
  ];
  const STEP = 7.5, SWEEP = 5.5;

  let api1;
  canvasDemo('pool', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, o: base(), key: '' };
    const tourBtn = $(s, '.rp-tour');
    const box = (sel, list) => { $(s, sel).innerHTML = list.map(([k, l]) => `<label class="chk" style="margin:3px 0;font-size:15px"><input type="checkbox" data-k="${k}"> ${l}</label>`).join(''); };
    box('.rp-gen', GEN); box('.rp-spend', SPEND);
    $(s, '.rp-x').innerHTML = X.map(([k, l]) => `<button class="btn" data-k="${k}" data-m="2">${l} x2</button><button class="btn" data-k="${k}" data-m=".5">${l} x½</button>`).join('');
    const sync = () => {
      $$(s, '.rp-gen input, .rp-spend input').forEach(i => { i.checked = !!st.o.on[i.dataset.k]; });
      $$(s, '.rp-x .btn').forEach(b => b.classList.toggle('on', st.o.mul[b.dataset.k] === +b.dataset.m));
    };
    const free = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } st.t = 0; };
    $$(s, '.rp-gen input, .rp-spend input').forEach(i => i.onchange = () => { free(); st.o = { ...st.o, on: { ...st.o.on, [i.dataset.k]: i.checked } }; sync(); });
    $$(s, '.rp-x .btn').forEach(b => b.onclick = () => { free(); const m = +b.dataset.m, k = b.dataset.k; st.o = { ...st.o, mul: { ...st.o.mul, [k]: st.o.mul[k] === m ? 1 : m } }; sync(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    let cache = { k: '', r: null };
    function render() {
      const i = st.tour ? Math.floor(st.t / STEP) % TOUR.length : -1;
      if (st.tour && st.o !== TOUR[i]) { st.o = TOUR[i]; sync(); }
      const k = JSON.stringify([st.o.on, st.o.mul]); if (k !== cache.k) cache = { k, r: sim(st.o) };
      const r = cache.r, lt = st.tour ? st.t % STEP : st.t, play = clamp(lt / SWEEP) * SPAN;
      T.use(g); g.clearRect(0, 0, W, H);
      const p = graph(g, r, play, st.o); tank(g, r, p, play, st.o); tallies(g, r, play);
      if (st.tour) T.label(st.o.cap, W / 2, 492, 'center', '#fff', 15, C.navy);
      const mulTxt = X.filter(([m]) => st.o.mul[m] !== 1).map(([m, l]) => `${l} x${st.o.mul[m] === 2 ? '2' : '½'}`).join(', ');
      if (mulTxt) T.label(mulTxt, W / 2, 532, 'center', '#fff', 14, '#9a5a06');
      const key = k + (st.tour ? i : 'f') + (play >= SPAN); if (key === st.key) return; st.key = key;
      say($(s, '.rp-out'), st.tour ? st.o.cap
        : !Object.values(st.o.on).some(Boolean) ? 'Tick a generator and a spender to start the pool flowing.'
          : r.acc.blocked > 4 ? 'Outflow outruns inflow: casts get blocked. Add a generator, or explore the x½ outflow extreme.'
            : r.acc.wasted > 40 ? 'Lots of mana is lost at the cap: inflow outruns outflow. Raise capacity or add a spender.'
              : 'Inflow and outflow are close to balanced: the pool matters, and so does when you spend it.');
    }
    sync();
    api1 = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => STEP * TOUR.length };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > STEP * TOUR.length) st.t = 0; if (!st.tour && st.t > SWEEP + 3) st.t = 0; render(); };
  });

  /* ---------- 2. discrete vs continuous ---------- */
  const CLIP = 4, RELOAD = 2.2, BATT = 100, DRAIN = 22, CHARGE = 12;
  // replay inputs: shots at times, boost held over [a, b] intervals
  function spend(shots, holds, t) {
    let ammo = CLIP, reloadAt = null, fired = 0, last = null; const marks = [];
    shots.filter(x => x <= t).forEach(x => {
      if (reloadAt != null && x < reloadAt + RELOAD) return;
      if (reloadAt != null) { ammo = CLIP; reloadAt = null; }
      ammo--; fired++; last = { x, big: fired % CLIP === 0 }; marks.push(last);
      if (ammo === 0) reloadAt = x;
    });
    if (reloadAt != null && t >= reloadAt + RELOAD) { ammo = CLIP; reloadAt = null; }
    let batt = BATT, prev = 0, boosting = false;
    holds.forEach(([a, b]) => { if (a > t) return; batt = Math.min(BATT, batt + (a - prev) * CHARGE); const e = Math.min(b, t); const need = (e - a) * DRAIN; batt = Math.max(0, batt - need); prev = e; if (t <= b && batt > 0) boosting = true; });
    batt = Math.min(BATT, batt + Math.max(0, t - prev) * (boosting ? 0 : CHARGE));
    return { ammo, reloading: reloadAt != null, reloadK: reloadAt != null ? (t - reloadAt) / RELOAD : 0, last, batt, boosting };
  }
  const TSHOTS = [1, 1.8, 2.6, 3.4, 4.2, 7, 7.8], THOLDS = [[1, 5.6], [8.6, 10.4]], SDUR = 12;
  let api2;
  canvasDemo('spend', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, shots: [], holds: [], hold: null, key: '' };
    const tourBtn = $(s, '.rp-tour'), hold = $(s, '.rp-hold');
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.shots = []; st.holds = []; };
    $(s, '.rp-fire').onclick = () => { free(); st.shots.push(st.t); };
    hold.onpointerdown = () => { free(); st.hold = [st.t, 1e9]; st.holds.push(st.hold); };
    const up = () => { if (st.hold) { st.hold[1] = st.t; st.hold = null; } };
    hold.onpointerup = up; hold.onpointerleave = up;
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render() {
      const t = st.t, r = spend(st.tour ? TSHOTS : st.shots, st.tour ? THOLDS : st.holds, t);
      T.use(g); g.clearRect(0, 0, W, H);
      // left: discrete, a four-round clip
      g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(10, 10, 505, 565, 12); g.fill(); g.beginPath(); g.roundRect(525, 10, 505, 565, 12); g.fill();
      T.label('Discrete: spent in chunks', 262, 40, 'center', '#fff', 15, C.navy); T.label('Continuous: drained like a battery', 777, 40, 'center', '#fff', 15, C.navy);
      for (let i = 0; i < CLIP; i++) {
        const x = 110 + i * 100, y = 170, full = i < r.ammo, big = i === CLIP - 1;
        g.fillStyle = full ? (big ? '#e5322d' : '#ffb951') : 'rgba(205,191,159,.35)'; g.strokeStyle = full ? C.navy : '#cdbf9f'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x - 18, y + 50); g.lineTo(x - 18, y - 20); g.quadraticCurveTo(x, y - 60, x + 18, y - 20); g.lineTo(x + 18, y + 50); g.closePath(); g.fill(); g.stroke();
        if (big) T.label('4th: extra damage', x, y + 76, 'center', C.redDk, 12);
      }
      if (r.reloading) { g.fillStyle = '#e7dec9'; g.beginPath(); g.roundRect(110, 290, 300, 22, 11); g.fill(); g.fillStyle = C.navy; g.beginPath(); g.roundRect(110, 290, 300 * clamp(r.reloadK), 22, 11); g.fill(); T.label('reloading…', 260, 330, 'center', C.ink, 14); }
      if (r.last && t - r.last.x < .5) T.popText(r.last.big ? 'BIG SHOT!' : 'shot', 262, 100 - 30 * (t - r.last.x), r.last.big ? C.redDk : '#9a5a06', 1 - (t - r.last.x) * 2);
      g.fillStyle = C.ink; g.font = '800 44px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${r.ammo} / ${CLIP}`, 262, 420);
      g.fillStyle = C.muted; g.font = '600 14px Jost, sans-serif'; g.fillText('each shot costs exactly 1 round', 262, 456); g.fillText('like Jhin in League of Legends', 262, 480);
      // right: continuous, a battery that drains while held
      const bx = 690, by = 110, bw = 170, bh = 260;
      g.strokeStyle = C.navy; g.lineWidth = 5; g.beginPath(); g.roundRect(bx, by, bw, bh, 14); g.stroke(); g.fillStyle = C.navy; g.fillRect(bx + 55, by - 16, 60, 16);
      const lvl = r.batt / BATT; g.fillStyle = lvl > .3 ? '#2fae63' : '#e5322d'; g.beginPath(); g.roundRect(bx + 10, by + 10 + (bh - 20) * (1 - lvl), bw - 20, (bh - 20) * lvl, 8); g.fill();
      if (r.boosting) { T.flash(bx + bw / 2, by + bh + 40, 60, .6); T.label('boosting: draining', bx + bw / 2, by + bh + 40, 'center', '#fff', 13, C.redDk); } else T.label('recharging', bx + bw / 2, by + bh + 40, 'center', '#fff', 13, C.muted);
      g.fillStyle = C.ink; g.font = '800 44px Montserrat, Jost, sans-serif'; g.fillText(`${Math.round(r.batt)}%`, 777, 470);
      g.fillStyle = C.muted; g.font = '600 14px Jost, sans-serif'; g.fillText(`${DRAIN}% per second while held`, 777, 506); g.fillText('like the Seaglide in Subnautica', 777, 530);
      const key = `${r.ammo}${r.reloading}${r.boosting}${Math.round(r.batt / 10)}`; if (key === st.key) return; st.key = key;
      say($(s, '.rp-out'), r.reloading ? 'Out of rounds: every 4th shot hit harder, now Jhin must reload. Discrete spending makes each chunk a decision.'
        : r.boosting ? 'Holding the boost drains the battery every moment you use it. Continuous spending makes duration the decision.'
          : 'Fire a few shots, or hold the boost. One spends in whole chunks, the other drains as long as you use it.');
    }
    api2 = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => SDUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > SDUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => (w === 'spend' ? api2 : api1).seek(t);
  window.__dur = w => (w === 'spend' ? api2 : api1).dur();
})();
