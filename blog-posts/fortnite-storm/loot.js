/* Loot or rotate (genre breakdown: "How to Make a Game like Fortnite?"), slide 2: playable.
   Slide 1 shows that the storm forces fights. Here the learner plays one life against 24 bots and feels what the storm
   does to every second: each crate takes 1.2 s to open and adds one gear level (more damage in a fight), and every
   second spent opening one is a second not spent getting inside the next circle. Two storm tunings, fast and slow, set
   how long looting pays. The learner plays both and compares crates opened, fights and placement. Bots follow the
   same rules: loot the nearest crate, head for the next circle when it is about to close, and fight whoever comes
   within range. The walk-through is a scripted player on the fast storm. All rates are illustrative. */
(function () {
  const W = 1040, TOPY = 40, H = 585, CX = 520, CY = 312, NB = 16, RANGE = 45, OPEN = 2, GEARMAX = 5;
  const STORMS = { fast: { wait: 8, close: 6, label: 'fast storm' }, slow: { wait: 22, close: 12, label: 'slow storm' } };
  const RADII = [640, 360, 220, 130, 65, 22];
  const rngOf = seed => { let s = (seed * 2654435761 + 7) >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); };
  const dps = a => (14 + 8 * a.gear) * a.skill;

  function newMatch(storm, seed) {
    const r = rngOf(seed), cfg = STORMS[storm];
    const crates = []; for (let i = 0; i < 30; i++) crates.push({ x: 40 + r() * (W - 80), y: TOPY + 30 + r() * (H - TOPY - 60), open: false });
    const A = [{ me: true, x: 260, y: 200, hp: 100, gear: 0, skill: 1, prog: 0, tx: 260, ty: 200, ang: 0 }];
    for (let i = 0; i < NB; i++) A.push({ x: 40 + r() * (W - 80), y: TOPY + 30 + r() * (H - TOPY - 60), hp: 100, gear: 0, skill: .8 + r() * .4, prog: 0, think: 0, jx: r() * 40 - 20, jy: r() * 40 - 20, ang: 0 });
    // circle centres drift inside the previous circle; phase i waits, then closes, each 20% shorter than the last
    const circ = [{ x: CX, y: CY, r: RADII[0] }]; const sched = []; let t = 0;
    for (let i = 1; i < RADII.length; i++) {
      const p = circ[i - 1], slack = Math.min(p.r - RADII[i], 300) * .6, a = r() * 6.283, d = r() * slack;
      circ.push({ x: Math.min(W - RADII[i] * .5 - 30, Math.max(RADII[i] * .5 + 30, p.x + Math.cos(a) * d)), y: Math.min(H - RADII[i] * .4 - 20, Math.max(TOPY + RADII[i] * .4 + 20, p.y + Math.sin(a) * d)), r: RADII[i] });
      const k = Math.pow(.8, i - 1); sched.push({ from: t + cfg.wait * k, to: t + cfg.wait * k + cfg.close * k }); t += (cfg.wait + cfg.close) * k;
    }
    return { storm, t: 0, crates, A, circ, sched, state: 'run', met: new Set(), me: { crates: 0, kills: 0, storm: 0, fights: 0, place: null }, fx: [] };
  }

  // the safe circle now, the next one, and the phase number (0 before the first close)
  function circle(S) {
    let i = 0; while (i < S.sched.length && S.t >= S.sched[i].to) i++;
    if (i >= S.sched.length) { const c = S.circ[S.circ.length - 1]; return { c, next: c, phase: i, closing: false, until: 0 }; }
    const a = S.circ[i], b = S.circ[i + 1], sc = S.sched[i];
    if (S.t < sc.from) return { c: a, next: b, phase: i, closing: false, until: sc.from - S.t };
    const q = (S.t - sc.from) / (sc.to - sc.from);
    return { c: { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q, r: a.r + (b.r - a.r) * q }, next: b, phase: i + 1, closing: true, until: sc.to - S.t };
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const nearestCrate = (S, a) => { let best = null, bd = 1e9; for (const c of S.crates) if (!c.open) { const d = dist(a, c); if (d < bd) { bd = d; best = c; } } return best; };

  // the shared brain: bots use it, and the walk-through's scripted player uses it too
  function decide(S, a, C) {
    const n = C.next, outNext = Math.hypot(a.x - n.x, a.y - n.y) > n.r - 25, hurry = C.closing || C.until < 6;
    if (outNext && hurry) return [n.x + (a.jx || 0), n.y + (a.jy || 0)];
    const cr = a.gear < GEARMAX && nearestCrate(S, a);
    if (cr && Math.hypot(cr.x - n.x, cr.y - n.y) < n.r - 20 && dist(a, cr) < 260) return [cr.x, cr.y];
    return [n.x + (a.jx || 0) * 2, n.y + (a.jy || 0) * 2];
  }

  function step(S, dt, input) {
    if (S.state !== 'run' || dt <= 0) return;
    S.t += dt; const C = circle(S), live = S.A.filter(a => a.hp > 0);
    // each agent targets the nearest enemy in range
    for (const a of live) { a.foe = null; let bd = RANGE; for (const b of live) if (b !== a) { const d = dist(a, b); if (d < bd) { bd = d; a.foe = b; } } }
    for (const a of live) {
      if (a.me && input) { a.tx = input[0]; a.ty = input[1]; }
      else { a.think -= dt; if (!(a.think > 0)) { [a.tx, a.ty] = decide(S, a, C); a.think = .4; } }
      if (!a.me) {
        // a bot fights where it stands; it hunts anyone it out-gears and steers clear of the rest, unless the storm is pushing it
        if (a.foe) { a.tx = a.x; a.ty = a.y; }
        else { let e = null, ed = 140; for (const b of live) if (b !== a) { const d = dist(a, b); if (d < ed) { ed = d; e = b; } }
          if (e && a.gear >= e.gear && a.gear > 0) { a.tx = e.x; a.ty = e.y; }
          else if (e && !(C.closing && Math.hypot(a.x - C.next.x, a.y - C.next.y) > C.next.r - 25)) { a.tx = a.x + (a.x - e.x) / ed * 80 + (a.tx - a.x) * .3; a.ty = a.y + (a.y - e.y) / ed * 80 + (a.ty - a.y) * .3; } }
      }
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), sp = (a.me ? 88 : 80) * dt;
      if (d > 2) { const m = Math.min(sp, d); a.x += dx / d * m; a.y += dy / d * m; a.ang = Math.atan2(dy, dx); }
      a.x = Math.max(12, Math.min(W - 12, a.x)); a.y = Math.max(TOPY + 12, Math.min(H - 12, a.y));
      // open a crate by standing on it, out of a fight
      const cr = nearestCrate(S, a);
      if (cr && dist(a, cr) < 16 && !a.foe && a.gear < GEARMAX) { a.prog += dt; if (a.prog >= OPEN) { cr.open = true; a.prog = 0; a.gear = Math.min(GEARMAX, a.gear + 1); if (a.me) S.me.crates++; } }
      else a.prog = 0;
      // the storm
      if (Math.hypot(a.x - C.c.x, a.y - C.c.y) > C.c.r) { const h = (3 + 2 * C.phase) * dt; a.hp -= h; if (a.me) S.me.storm += h; }
    }
    for (const a of live) if (a.foe) { a.foe.hp -= dps(a) * dt; if (a.me && !S.met.has(a.foe)) { S.met.add(a.foe); S.me.fights++; } if (a.foe.hp <= 0 && !a.foe.dead) { a.foe.dead = true; a.hp = Math.min(100, a.hp + 30); a.gear = Math.max(a.gear, a.foe.gear); if (a.me) S.me.kills++; S.fx.push({ x: a.foe.x, y: a.foe.y, t: S.t }); } }
    for (const a of live) if (a.hp <= 0) a.dead = true;
    const me = S.A[0], alive = S.A.filter(a => a.hp > 0).length;
    if (me.hp <= 0) { S.state = 'dead'; S.me.place = alive + 1; }
    else if (alive === 1) { S.state = 'won'; S.me.place = 1; }
  }

  if (typeof GK === 'undefined') { module.exports = { newMatch, step, circle, decide }; return; }

  GK.scene('loot', (s, g, ui) => {
    const C0 = TD.C, cv = s.querySelector('canvas'), playBtns = [...s.querySelectorAll('.lt-play .btn')];
    const st = { mode: 'tour', run: null, aim: null, last: null, res: { fast: [], slow: [] }, seed: 11 };
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    let held = false;
    cv.addEventListener('pointerdown', e => { if (st.mode !== 'play') return; e.preventDefault(); held = true; cv.setPointerCapture(e.pointerId); st.aim = toCanvas(e); });
    cv.addEventListener('pointermove', e => { if (held) st.aim = toCanvas(e); });
    cv.addEventListener('pointerup', () => { held = false; });
    playBtns.forEach(b => b.onclick = () => { ui.stopTour(); st.mode = 'play'; st.run = newMatch(b.dataset.s, st.seed++); st.aim = [260, 200]; st.last = null; st.logged = false; });
    ui.watch(playBtns);
    // walk-through: precomputed at fixed steps, the scripted player loots like a bot on the fast storm
    const DT = 1 / 30;
    const TOUR = (() => { const S = newMatch('fast', 5), fr = []; for (let k = 0; k < 90 * 30 && S.state === 'run'; k++) { step(S, DT, null); fr.push(snap(S)); } return fr; })();
    function snap(S) { return { t: S.t, A: S.A.map(a => [a.x, a.y, a.hp, a.gear, a.prog, a.ang]), open: S.crates.map(c => c.open), C: circle(S), me: { ...S.me }, state: S.state, fx: S.fx.slice(-6) }; }
    const tourMatch = newMatch('fast', 5);
    const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

    return {
      dur: TOUR.length * DT + 3,
      frame(t, tour) {
        if (tour && st.mode !== 'tour') st.mode = 'tour';
        let F, crates, storm;
        if (st.mode === 'tour') { F = TOUR[Math.min(TOUR.length - 1, Math.floor(t / DT))]; crates = tourMatch.crates; storm = 'fast'; }
        else {
          const S = st.run, dt = st.last == null ? 0 : Math.min(.05, Math.max(0, t - st.last)); st.last = t;
          for (let k = 0; k < 2; k++) step(S, dt / 2, st.aim);
          if (S.state !== 'run' && !st.logged) { st.logged = true; st.res[S.storm].push({ ...S.me }); }
          F = snap(S); crates = S.crates; storm = S.storm;
        }
        const me = F.A[0], C = F.C, alive = F.A.filter(a => a[2] > 0).length;
        GK.panel(g);
        g.fillStyle = '#a9cf86'; g.fillRect(0, TOPY, W, H - TOPY);
        // crates
        crates.forEach((c, i) => { if (F.open[i]) { g.strokeStyle = 'rgba(90,60,30,.35)'; g.lineWidth = 1.5; g.strokeRect(c.x - 6, c.y - 6, 12, 12); } else { g.fillStyle = '#b07a3c'; g.fillRect(c.x - 7, c.y - 7, 14, 14); g.strokeStyle = '#6b4520'; g.lineWidth = 2; g.strokeRect(c.x - 7, c.y - 7, 14, 14); } });
        // storm outside the circle, next circle as a white ring
        g.save(); g.beginPath(); g.rect(0, TOPY, W, H - TOPY); g.clip(); g.beginPath(); g.rect(0, TOPY, W, H - TOPY); g.arc(C.c.x, C.c.y, C.c.r, 0, Math.PI * 2, true); g.fillStyle = 'rgba(122,62,200,.38)'; g.fill('evenodd'); g.restore();
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.arc(C.next.x, C.next.y, C.next.r, 0, 6.283); g.stroke(); g.setLineDash([]);
        // bots, then the player
        F.A.forEach((a, i) => { if (i === 0) return; if (a[2] <= 0) { g.strokeStyle = 'rgba(60,40,40,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0] - 5, a[1] - 5); g.lineTo(a[0] + 5, a[1] + 5); g.moveTo(a[0] + 5, a[1] - 5); g.lineTo(a[0] - 5, a[1] + 5); g.stroke(); return; }
          TD.foe(a[0], a[1], 8 + a[3], a[5], C0.red); });
        if (me[2] > 0) { TD.player(me[0], me[1], me[5], .55); if (me[4] > 0) { g.strokeStyle = C0.gold; g.lineWidth = 4; g.beginPath(); g.arc(me[0], me[1], 17, -1.571, -1.571 + 6.283 * me[4] / OPEN); g.stroke(); } }
        if (st.mode === 'play' && st.aim && F.state === 'run') { g.strokeStyle = C0.navy; g.lineWidth = 2; g.beginPath(); g.arc(st.aim[0], st.aim[1], 7, 0, 6.283); g.stroke(); }
        F.fx.forEach(f => { const k = F.t - f.t; if (k < .6) { g.strokeStyle = `rgba(255,255,255,${1 - k / .6})`; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, 10 + 30 * k, 0, 6.283); g.stroke(); } });
        // header: your state
        const hpCol = me[2] > 50 ? C0.good : me[2] > 25 ? C0.goldInk : C0.redDk;
        GK.head(g, `${st.mode === 'tour' ? 'Walk-through' : 'Your match'} · ${STORMS[storm].label} · ${fmt(F.t)}`, 20, 28);
        GK.text(g, `HP ${Math.max(0, Math.round(me[2]))}`, 430, 28, hpCol, 14, 'left', 800);
        GK.text(g, `gear ${me[3]}/${GEARMAX}`, 500, 28, C0.ink, 14, 'left', 800);
        GK.text(g, C.phase >= RADII.length - 1 && !C.closing ? 'final circle' : `${C.closing ? 'storm closing' : 'circle closes in'} ${Math.ceil(C.until)} s`, 600, 28, C0.purple, 14, 'left', 800);
        GK.text(g, `${alive} alive`, 1020, 28, C0.ink, 14, 'right', 800);
        if (F.state !== 'run') { GK.box(g, 330, 220, 380, 92, 'rgba(21,32,68,.9)', null, 12); GK.head(g, F.state === 'won' ? 'Last one standing' : `Eliminated · place ${F.me.place} of ${NB + 1}`, 520, 256, 'center', F.state === 'won' ? C0.gold : '#ff8a80', 22);
          GK.text(g, `${F.me.crates} crates · ${F.me.fights} fights · ${F.me.kills} eliminations · ${Math.round(F.me.storm)} storm damage`, 520, 288, '#fff', 14, 'center', 800); }
        // side panel: results per storm
        const sum = k => { const r = st.res[k]; if (!r.length) return null; const av = f => r.reduce((s, x) => s + x[f], 0) / r.length; return { n: r.length, place: Math.min(...r.map(x => x.place)), crates: av('crates'), fights: av('fights') }; };
        const f = sum('fast'), sl = sum('slow'), cell = (x, lab) => `<div><b>${x ? '#' + x.place : '–'}</b><span>${lab}: best place${x ? ` · ${x.crates.toFixed(1)} crates a match over ${x.n}` : ''}</span></div>`;
        ui.stats(cell(f, 'fast storm') + cell(sl, 'slow storm'));
        ui.out(st.mode === 'tour' ? 'Press a Play button. Hold the mouse button to steer. Stand on a crate for 2 s to open it: each one adds a gear level, and gear wins fights. The storm hurts outside the circle; the white ring is where it closes next.'
          : f && sl ? (sl.crates > f.crates + .9 ? `You opened ${sl.crates.toFixed(1)} crates a match on the slow storm and ${f.crates.toFixed(1)} on the fast one. The storm's clock sets how much looting a match can afford, and so how geared the fights are.` : 'Your crate count barely moved between storms: you spent the slow storm\'s extra time on position, not loot. Try one match where you loot until the circle forces you out.')
          : 'Play the other storm too, then compare crates opened and placement.');
      },
    };
  });
})();
