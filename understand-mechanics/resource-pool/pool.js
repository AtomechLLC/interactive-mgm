/* Resource pool sandbox (MGM C4 M2, deck slides 198-216, 219, 257).
   1. A mana pool over 30 seconds of play. Generators (inflow): passive regen, a potion, conversion (health into mana) and
      conditional (crits refund 50% more). Spenders (outflow): casting, a passive leak above an equilibrium point, a
      triggered drain when struck, and theft. Capacity caps it. sim() runs the whole 30 s for the current setup, so the
      graph is instant and the playhead just reveals it; the x2 / x½ buttons are slide 257's "explore the extremes".
      Numbers are illustrative: R.
   2. Discrete vs continuous: Jhin-style four-shot clip (every 4th shot hits harder, then reload) next to a battery that
      drains while a boost is held (the Subnautica Seaglide).
   3. Resources & states (slide 219): hold to charge a two-segment energy bar; at the threshold it bursts into flame and
      Link is On Fire, spend a segment and it goes out. The walk-through is replayed from its inputs, so seeking is exact. */
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
    r.ev.filter(e => e.t <= play && play - e.t < .9 && e.kind !== 'blocked' && e.kind !== 'cast').forEach(e => { const y = vy(p) - 20 - 30 * (play - e.t); T.popText(`+${Math.round(e.v)} ${e.kind}`, tx + tw / 2, y, C.good, 1 - (play - e.t)); const ic = { potion: 'potion', convert: 'lifetap' }[e.kind]; if (ic) ICON.draw(g, ic, tx - 30, y, 30, 1 - (play - e.t)); });
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

  /* ---------- 3. resources & states: a full energy bar sets you on fire ---------- */
  // The Legend of Zelda sprites (Zelda Wiki): green tunic normally, red ring tunic while On Fire; drawn pixel-sharp, educational use, per Xelnath
  const LINK = {}; ['link', 'link-red'].forEach(n => { const i = new Image(); i.src = new URL(`../img/tloz-${n}.png`, location.href).href; LINK[n] = i; });
  const SEG = 50, FULL = 100, RATE = 34, HIST = 12, BDT = 1 / 60;
  // the walk-through as inputs: charge held over [a, b], one segment spent at each time
  const BHOLDS = [[.5, 3.6], [7, 8], [9, 9.6]], BSPENDS = [6, 12, 12.8], BDUR = 14.5;
  const BCAP = [[0, 'Hold to charge: the energy bar fills one segment at a time. Below the threshold, nothing changes.'],
    [3.44, 'Full: energy crosses the threshold and triggers a state. Link is on fire for as long as the bar stays full.'],
    [6, 'Spend a segment and the bar drops below the threshold: the state ends at once.'],
    [7, '84 of 100 is close, but a threshold is all or nothing: still no fire.'],
    [9.47, 'Full again, on fire again. The state follows the resource, not a timer.'],
    [12, 'Spend both segments: back to empty, back to normal.']];
  const fresh = () => ({ t: 0, e: 0, fire: false, ign: -9, out: -9, spent: -9, fail: -9, hist: [], next: 0 });
  function bstep(s, dt, held, thr) {
    s.t += dt; if (held) s.e = Math.min(FULL, s.e + RATE * dt);
    const on = s.e >= thr - 1e-6;
    if (on && !s.fire) s.ign = s.t; if (!on && s.fire) s.out = s.t; s.fire = on;
    if (s.t >= s.next) { s.hist.push([s.t, s.e, on]); s.next = s.t + .05; while (s.hist[0][0] < s.t - HIST - .5) s.hist.shift(); }
  }
  function bspend(s, thr) { if (s.e < SEG - 1e-6) { s.fail = s.t; return; } s.e -= SEG; s.spent = s.t; bstep(s, 0, false, thr); }
  function btour(t) {
    const s = fresh(); let k = 0;
    while (s.t < t - 1e-9) {
      while (k < BSPENDS.length && BSPENDS[k] <= s.t + 1e-9) bspend(s, FULL), k++;
      bstep(s, Math.min(BDT, t - s.t), BHOLDS.some(([a, b]) => s.t >= a && s.t < b), FULL);
    }
    return s;
  }
  // flames rising off an element at x, y, w, h: three layers, licks across the top, sides wobbling. k: 0..1 size.
  function flame(g, x, y, w, h, t, k, n = 4) {
    if (k <= 0) return;
    [['#ff5a00', 1], ['#ff9d1c', .7], ['#ffe27a', .42]].forEach(([col, sc], L) => {
      const pad = 20 * sc * k, lick = 54 * sc * k, x0 = x - pad, x1 = x + w + pad, top = y - pad * .4, bot = y + h;
      g.fillStyle = col; g.beginPath(); g.moveTo(x + w * .2, bot);
      for (let i = 0; i <= 8; i++) g.lineTo(x0 + Math.sin(t * 7 + i * 1.3 + L) * 4 * k * (i / 8), lerp(bot, top, i / 8));
      for (let i = 0; i < n; i++) {
        const a = lerp(x0, x1, i / n), b = lerp(x0, x1, (i + 1) / n), hg = lick * (.6 + .4 * Math.sin(t * 9 + i * 2.1 + L));
        const tip = (a + b) / 2 + Math.sin(t * 6 + i * 1.7) * 7 * k;
        g.quadraticCurveTo(a, top - hg * .3, tip, top - hg); g.quadraticCurveTo(b, top - hg * .3, b, top);
      }
      for (let i = 8; i >= 0; i--) g.lineTo(x1 + Math.sin(t * 7.5 + i * 1.1 + L) * 4 * k * (i / 8), lerp(bot, top, i / 8));
      g.lineTo(x + w * .8, bot); g.closePath(); g.fill();
    });
    for (let i = 0; i < 9; i++) {
      const ph = (t * .8 + i * .137) % 1, ex = x + ((i * 53) % w) + Math.sin(t * 3 + i) * 10, ey = y - 30 - ph * 110;
      g.fillStyle = `rgba(255,${120 + (i % 3) * 40},30,${(1 - ph) * k})`; g.beginPath(); g.arc(ex, ey, 3.5 - ph * 2, 0, TD.TAU); g.fill();
    }
  }
  // 0..1 flame size: grows in on ignite, shrinks away when it goes out
  const fireK = s => s.fire ? ease(clamp((s.t - s.ign) / .35)) : 1 - clamp((s.t - s.out) / .3);
  let api3;
  canvasDemo('burn', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, down: false, thr: FULL, b: fresh(), key: '' };
    const tourBtn = $(s, '.rp-tour'), hold = $(s, '.rp-charge');
    $(s, '.rp-thr').innerHTML = [[FULL, 'Full (100)'], [SEG, 'Half (50)']].map(([v, l]) => `<button class="btn" data-v="${v}">${l}</button>`).join('');
    const sync = () => $$(s, '.rp-thr .btn').forEach(b => b.classList.toggle('on', +b.dataset.v === (st.tour ? FULL : st.thr)));
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.b = fresh(); sync(); };
    hold.onpointerdown = () => { free(); st.down = true; hold.classList.add('on'); };
    const up = () => { st.down = false; hold.classList.remove('on'); };
    hold.onpointerup = up; hold.onpointerleave = up;
    $(s, '.rp-use').onclick = () => { free(); bspend(st.b, st.thr); };
    $$(s, '.rp-thr .btn').forEach(b => b.onclick = () => { free(); st.thr = +b.dataset.v; bstep(st.b, 0, false, st.thr); sync(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); sync(); };
    function render() {
      const b = st.tour ? btour(st.t) : st.b, thr = st.tour ? FULL : st.thr, t = b.t, k = fireK(b);
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(10, 10, 330, 565, 12); g.fill(); g.beginPath(); g.roundRect(350, 10, 680, 565, 12); g.fill();
      // the slide's bar: black outline, pale yellow rim, two orange segments that fill from the bottom
      const bx = 105, by = 130, bw = 140, bh = 370, sh = (bh - 16 - 12) / 2;
      flame(g, bx, by, bw, bh * .62, t, k);
      g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.roundRect(bx, by, bw, bh, 14); g.fill(); g.stroke();
      g.fillStyle = '#fff6b8'; g.beginPath(); g.roundRect(bx + 4, by + 4, bw - 8, bh - 8, 11); g.fill();
      [0, 1].forEach(i => {
        const x = bx + 10, w = bw - 20, y = i ? by + 8 : by + 8 + sh + 12, f = clamp((b.e - i * SEG) / SEG);
        g.fillStyle = '#fffdf2'; g.beginPath(); g.roundRect(x, y, w, sh, 10); g.fill();
        g.save(); g.clip(); g.fillStyle = '#ffc477'; g.fillRect(x, y + sh * (1 - f), w, sh * f); g.restore();
        g.strokeStyle = f > 0 ? '#b9a98a' : '#d8ccb0'; g.lineWidth = 1.5; g.setLineDash(f > 0 ? [] : [6, 5]); g.beginPath(); g.roundRect(x, y, w, sh, 10); g.stroke(); g.setLineDash([]);
      });
      // the threshold, marked beside the bar
      const ty = thr >= FULL ? by + 8 : by + 8 + sh + 6;
      g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(bx + bw + 6, ty); g.lineTo(bx + bw + 40, ty); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.navy; g.beginPath(); g.moveTo(bx + bw + 4, ty); g.lineTo(bx + bw + 14, ty - 6); g.lineTo(bx + bw + 14, ty + 6); g.fill();
      T.label('threshold', bx + bw + 46, ty - 18, 'center', C.navy, 12);
      if (t - b.ign < .5) { T.flash(bx + bw / 2, by + 60, 150, 1 - (t - b.ign) * 2); }
      if (t - b.out < .8) T.poof(bx + bw / 2, by + 20, t - b.out, 40);
      g.fillStyle = C.ink; g.font = '800 30px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${Math.round(b.e)} / ${FULL}`, bx + bw / 2, 532);
      g.fillStyle = C.muted; g.font = '600 14px Jost, sans-serif'; g.fillText('energy', bx + bw / 2, 558);
      if (t - b.spent < .7) T.popText(`-${SEG} energy`, bx + bw / 2, by + bh / 2 - 40 * (t - b.spent), C.redDk, 1 - (t - b.spent) / .7);
      if (t - b.fail < .7) T.popText('not a full segment!', bx + bw / 2, by + bh / 2, C.redDk, 1 - (t - b.fail) / .7);
      // the character: Link, in the red ring tunic with flames around him while On Fire
      const mx = 470, my = 290, ms = 8, spr = LINK[b.fire ? 'link-red' : 'link'];
      T.shadow(mx, my, 46, 12, .25);
      flame(g, mx - 50, my - 120, 100, 120, t + 3, k, 3);
      if (spr.complete && spr.naturalWidth) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(spr, mx - 7.5 * ms, my - 16 * ms, 15 * ms, 16 * ms); g.restore(); }
      if (t - b.ign < .9) T.popText('ignite!', mx, my - 190 - 40 * (t - b.ign), '#d2470a', 1 - (t - b.ign) / .9);
      if (t - b.out < .8) T.poof(mx, my - 80, t - b.out, 50);
      // the state and the rule that sets it
      const on = b.fire;
      g.fillStyle = on ? '#fff0dc' : '#f3efe4'; g.strokeStyle = on ? '#ff6a00' : '#cdbf9f'; g.lineWidth = 3; g.beginPath(); g.roundRect(610, 60, 390, 230, 14); g.fill(); g.stroke();
      g.fillStyle = C.muted; g.font = '600 14px Jost, sans-serif'; g.textAlign = 'left'; g.fillText('STATE', 636, 92);
      g.fillStyle = on ? '#d2470a' : C.ink; g.font = '800 44px Montserrat, Jost, sans-serif'; g.fillText(on ? 'On Fire' : 'Normal', 634, 140);
      g.fillStyle = C.ink; g.font = '600 18px Jost, sans-serif'; g.fillText(`If energy ≥ ${thr}: On Fire`, 636, 196);
      g.fillStyle = on ? '#d2470a' : C.muted; g.font = '600 16px Jost, sans-serif';
      g.fillText(`now: ${Math.round(b.e)} ${on ? '≥' : '<'} ${thr}, so ${on ? 'the state is on' : 'no state'}`, 636, 232);
      g.fillStyle = C.muted; g.font = '600 14px Jost, sans-serif'; g.fillText(on ? 'spend energy and it ends' : 'charge to the threshold to trigger it', 636, 262);
      // the last 12 seconds of energy, with the threshold and the time spent on fire
      const gx0 = 420, gx1 = 1005, gy0 = 540, gy1 = 380, gx = tt => lerp(gx0, gx1, (tt - (t - HIST)) / HIST), gy = v => lerp(gy0, gy1, v / FULL);
      g.fillStyle = C.muted; g.font = '600 12px Jost, sans-serif'; g.textAlign = 'right'; [0, 50, 100].forEach(v => g.fillText(v, gx0 - 8, gy(v)));
      g.strokeStyle = '#d8ccb0'; g.lineWidth = 1; [0, 50, 100].forEach(v => { g.beginPath(); g.moveTo(gx0, gy(v)); g.lineTo(gx1, gy(v)); g.stroke(); });
      const pts = b.hist.filter(([tt]) => tt >= t - HIST);
      g.save(); g.beginPath(); g.rect(gx0, gy1 - 30, gx1 - gx0, gy0 - gy1 + 30); g.clip();
      pts.forEach(([tt, , f], i) => { if (f && pts[i + 1]) { g.fillStyle = 'rgba(255,106,0,.18)'; g.fillRect(gx(tt), gy1 - 24, gx(pts[i + 1][0]) - gx(tt) + .5, gy0 - gy1 + 24); } });
      g.fillStyle = 'rgba(255,196,119,.45)'; g.beginPath(); g.moveTo(gx(pts.length ? pts[0][0] : t), gy0); pts.forEach(([tt, v]) => g.lineTo(gx(tt), gy(v))); g.lineTo(gx(t), gy(b.e)); g.lineTo(gx(t), gy0); g.closePath(); g.fill();
      g.strokeStyle = '#e07a10'; g.lineWidth = 3.5; g.beginPath(); pts.forEach(([tt, v], i) => i ? g.lineTo(gx(tt), gy(v)) : g.moveTo(gx(tt), gy(v))); g.lineTo(gx(t), gy(b.e)); g.stroke();
      g.restore();
      g.setLineDash([8, 6]); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(gx0, gy(thr)); g.lineTo(gx1, gy(thr)); g.stroke(); g.setLineDash([]);
      T.label('energy, last 12 s', gx0 + 70, gy1 - 40, 'center', C.ink, 13); T.label('shaded: on fire', gx1 - 60, gy1 - 40, 'center', '#d2470a', 13);
      const ci = st.tour ? BCAP.filter(([a]) => st.t >= a).length - 1 : -1;
      const key = st.tour ? 'c' + ci : `${on}${Math.round(b.e)}${thr}`; if (key === st.key) return; st.key = key;
      say($(s, '.rp-out'), st.tour ? BCAP[ci][1]
        : on ? `On fire: energy is at or above the threshold (${thr}). Spend a segment to drop below it.`
          : b.e > 0 ? `${Math.round(b.e)} energy, ${thr} needed. Keep holding to cross the threshold.`
            : 'Hold the charge button to fill the bar.');
    }
    sync();
    api3 = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => BDUR };
    return dt => {
      dt = Math.max(0, dt);
      if (st.tour) { if (!st.held) st.t += dt; if (st.t > BDUR) st.t = 0; }
      else for (let left = Math.min(dt, .25); left > 1e-9; left -= BDT) bstep(st.b, Math.min(BDT, left), st.down, st.thr);
      render();
    };
  });

  const APIS = () => ({ pool: api1, spend: api2, burn: api3 });
  window.__seek = (t, w) => APIS()[w].seek(t);
  window.__dur = w => APIS()[w].dur();
})();
