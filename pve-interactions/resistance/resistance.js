/* Resistance (MGM course 4, module 5, deck slides 74-84). One corridor from start to goal, five kinds of resistance from
   the deck's examples (DOOM, Elden Ring, Dark Souls, Halo, XCOM), and a strength slider. plan(type, strong) scripts the
   player's route as timed segments; draw() renders any moment of it, so the sandbox, the five-up comparison and
   window.__seek (for the GIF) all show the same run. Below STRONG the enemy is too weak to matter (slide 83) and every
   type collapses into the same walk-up-and-shoot route. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C;
  const WW = 1300, WH = 380, CY = 190, START = [80, CY], GOAL = [1220, CY], SPD = 230, SPRINT = 420, STRONG = .4;
  const EMPTY = (GOAL[0] - START[0]) / SPD;

  const TYPES = {
    kill: { name: 'Shoot it', game: 'DOOM: basic enemies', changes: false,
      strong: 'It just takes longer. The route never changes, so the enemy slows the player down without asking for anything new. This is the deck’s “not very interesting” enemy.' },
    avoid: { name: 'Avoid it', game: 'Elden Ring: Tree Sentinel', changes: true,
      strong: 'Too strong to fight, so the player waits for it to turn away and slips past along the wall.' },
    flank: { name: 'Get behind it', game: 'Dark Souls III: Black Knight', changes: true,
      strong: 'Its front is guarded, so the player circles wide out of its sight and strikes its back.' },
    cover: { name: 'Take cover', game: 'Halo: Kig-Yar snipers', changes: true,
      strong: 'In the open the sniper wins, so the player moves from pillar to pillar between shots.' },
    target: { name: 'Switch targets', game: 'XCOM: support aliens', changes: true,
      strong: 'The support alien shields the brute, so the player ignores the enemy in their face and takes out the support first.' },
  };
  const ORDER = Object.keys(TYPES);
  const WEAK = 'Too weak to matter. The player walks up and shoots it, exactly like every other enemy, so its special trait never comes into play.';

  /* ---------- the enemies of each type, as functions of time ---------- */
  const SENT = { x: 700, phase: 2.6, per: 7 };
  const sentY = t => CY + 80 * Math.sin(2 * Math.PI * (t - SENT.phase) / SENT.per);
  const PILLARS = [420, 660, 900].map(x => ({ x: x - 25, y: CY - 42, w: 50, h: 84 }));
  const SNIPER = [1170, CY], FIRE0 = 1.0, FIRE_GAP = 1.6;
  const fireTimes = dur => { const out = []; for (let t = FIRE0; t < dur; t += FIRE_GAP) out.push(t); return out; };
  function blocked(a, b) {   // does segment a-b cross any pillar?
    return PILLARS.some(r => { for (let k = 0; k <= 1; k += .02) { const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k; if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true; } return false; });
  }
  function foes(type, t) {
    switch (type) {
      case 'kill': return [{ id: 'grunt', x: 720, y: CY, r: 22, face: Math.PI, mark: 'horns' }];
      case 'avoid': return [{ id: 'sent', x: SENT.x, y: sentY(t), r: 42, face: Math.cos(2 * Math.PI * (t - SENT.phase) / SENT.per) > 0 ? Math.PI / 2 : -Math.PI / 2, col: '#c9932e', edge: '#7a5512' }];
      case 'flank': return [{ id: 'knight', x: 720, y: CY, r: 26, face: Math.PI, mark: 'shield', col: '#5b6178', edge: C.navy }];
      case 'cover': return [{ id: 'sniper', x: SNIPER[0], y: SNIPER[1], r: 19, face: Math.PI, mark: 'scope' }];
      case 'target': return [{ id: 'brute', x: 720, y: CY, r: 30, face: Math.PI, mark: 'horns' }, { id: 'support', x: 960, y: 300, r: 18, face: Math.PI, mark: 'staff', col: C.purple, edge: '#4d2a86' }];
    }
  }
  const foeAt = (type, id, t) => foes(type, t).find(f => f.id === id);

  /* ---------- the player's plan for each type ---------- */
  function plan(type, strong, s) {
    const p = T.Path(START, SPD), shots = [], dead = {}, hits = [];
    const aim = (id) => { const f = foeAt(type, id, p.t); return [f.x, f.y]; };
    const shoot = (id, n, o = {}) => {
      for (let i = 0; i < n; i++) { p.wait(.04, aim(id)); shots.push({ t: p.t, from: p.pos, id, kind: o.block ? 'block' : 'hit' }); p.wait(.26, aim(id)); }
      if (!o.block) dead[id] = p.t;
    };
    const stab = id => { p.wait(.15, aim(id)); shots.push({ t: p.t, from: p.pos, id, kind: 'stab' }); p.wait(.4, aim(id)); dead[id] = p.t; };
    const hpOf = { kill: 2 + Math.round(6 * s), avoid: 3, flank: 2, cover: 2, target: 2 };
    if (!strong) {
      // every type, too weak: walk up, shoot it, walk on
      if (type === 'cover') { p.go(330, 280).go(740, 280); shoot('sniper', 2); p.go(1100, 270); }
      else if (type === 'avoid') { p.go(430, CY); shoot('sent', hpOf.avoid); }
      else if (type === 'target') { p.go(470, CY); shoot('brute', 3); p.go(860, 120); }
      else { p.go(470, CY); shoot(type === 'kill' ? 'grunt' : 'knight', hpOf[type]); }
    } else if (type === 'kill') {
      p.go(470, CY); shoot('grunt', hpOf.kill);
    } else if (type === 'avoid') {
      p.go(430, CY);
      const win = SENT.phase + SENT.per / 12;          // the sentinel is at the bottom of its patrol from here
      p.wait(Math.max(.4, win - .67 - p.t));
      p.go(520, 66).go(880, 66).go(1000, CY);
    } else if (type === 'flank') {
      p.go(300, 62).go(900, 62).go(900, CY).go(778, CY); stab('knight');
    } else if (type === 'cover') {
      const hide = PILLARS.map(r => [r.x - 26, CY]);
      const nextFire = () => fireTimes(60).find(f => f > p.t - .02);
      p.go(hide[0][0], hide[0][1]);
      for (let i = 1; i < hide.length; i++) {
        p.wait(Math.max(.25, nextFire() + .06 - p.t), SNIPER);
        p.go(PILLARS[i - 1].x + 25, CY + 70, SPRINT).go(hide[i][0], hide[i][1], SPRINT);
      }
      p.wait(Math.max(.25, nextFire() + .06 - p.t), SNIPER);
      p.go(860, CY + 62, SPRINT); shoot('sniper', 2); p.go(1100, CY + 62);
    } else if (type === 'target') {
      p.go(460, CY); shoot('brute', 2, { block: true });
      p.go(520, 300); shoot('support', 2); shoot('brute', 2); p.go(880, 110);
    }
    p.go(GOAL[0], GOAL[1]);
    const done = p.t;
    p.wait(1.6);
    // the sniper fires on a fixed rhythm: a hit if it can see the player, a spark on the pillar if not
    if (type === 'cover') fireTimes(done).forEach(ft => { if (dead.sniper != null && ft >= dead.sniper) return; const q = p.at(ft); hits.push({ t: ft, to: [q.x, q.y], hit: !blocked(SNIPER, [q.x, q.y]) }); });
    if (type === 'kill') for (let ft = .9; ft < (dead.grunt ?? 0); ft += .75) { const q = p.at(ft); if (q.x > 300) hits.push({ t: ft, to: [q.x, q.y], hit: true, from: [720, CY] }); }
    return { type, strong, s, p, shots, dead, hits, done, dur: p.t, hp: hpOf };
  }

  /* ---------- drawing a run at time t, in world units ---------- */
  function draw(g, R, t, o = {}) {
    T.use(g);
    const { type, s, strong } = R, k = o.k || 1;   // k enlarges the figures when the corridor is drawn small
    T.floor(0, 0, WW, WH);
    T.wall(0, 0, WW, 34); T.wall(0, WH - 34, WW, 34);
    if (type === 'cover') PILLARS.forEach(r => T.pillar(r.x, r.y, r.w, r.h));
    T.pad(START[0], START[1]); T.flag(GOAL[0], GOAL[1]);
    // the route so far
    T.trail(R.p.trail(t), o.trailCol || C.player, .9, 4 * k);
    // telegraphs, scaled by strength
    const alive = id => R.dead[id] == null || t < R.dead[id];
    const deadAge = id => R.dead[id] == null ? -1 : t - R.dead[id];
    const st = T.clamp((s - .1) / .9);
    foes(type, t).forEach(f => {
      if (!alive(f.id)) return;
      if (type === 'avoid') T.zone(f.x, f.y, 50 + 120 * s, .5 + .5 * st);
      if (type === 'flank') T.cone(f.x, f.y, f.face, .45, 140 + 200 * s, .4 + .6 * st);
    });
    if (type === 'target' && alive('support')) {
      T.beam(960, 300, 720, CY, t, alive('brute') ? .25 + .75 * st : 0);
      if (alive('brute')) T.bubble(720, CY, 46, t, .15 + .85 * st);
    }
    if (type === 'cover' && alive('sniper')) {
      const q = R.p.at(t), nf = fireTimes(R.dur + 2).find(f => f >= t) ?? 99, charge = T.clamp(1 - (nf - t) / FIRE_GAP);
      let end = [q.x, q.y];
      if (blocked(SNIPER, end)) { for (let k = 0; k <= 1; k += .01) { const pt = [SNIPER[0] + (q.x - SNIPER[0]) * k, SNIPER[1] + (q.y - SNIPER[1]) * k]; if (blocked(SNIPER, pt)) { end = pt; break; } } }
      T.laser(SNIPER[0], SNIPER[1], end[0], end[1], .25 + .7 * charge * (.4 + .6 * st));
    }
    // enemies
    foes(type, t).forEach(f => {
      const age = deadAge(f.id);
      if (age >= 0) { T.poof(f.x, f.y, age, f.r); return; }
      const r = type === 'avoid' ? 22 + 22 * s : f.r;
      const max = R.hp[type] + (type === 'target' && f.id === 'brute' ? 0 : 0), taken = R.shots.filter(x => x.id === f.id && x.kind !== 'block' && x.t <= t).length;
      const total = R.shots.filter(x => x.id === f.id && x.kind !== 'block').length || max;
      T.foe(f.x, f.y, r * (type === 'avoid' ? Math.min(k, 1.3) : k), f.face, f.col || C.red, { mark: f.mark, edge: f.edge, hp: k > 1 ? null : total - taken, hpMax: total });
    });
    // shots
    R.shots.forEach(x => {
      const k = t - x.t; if (k < 0 || k > .25) return;
      const f = foeAt(type, x.id, x.t);
      if (x.kind === 'stab') { T.flash(f.x + 30, f.y, 46, 1 - k / .25); T.popText('Backstab!', f.x, f.y - 50, C.good, 1); return; }
      T.tracer(x.from[0], x.from[1], f.x, f.y, 1 - k / .25);
      if (x.kind === 'block') { T.flash(f.x - 40, f.y, 26, 1 - k / .25); }
    });
    R.shots.filter(x => x.kind === 'block').forEach(x => { const k = t - x.t; if (k >= 0 && k < .9) T.popText('Shielded', 720, CY - 70 - k * 30, '#2f78c4', 1 - k / .9); });
    R.hits.forEach(h => {
      const k = t - h.t; if (k < 0 || k > .6) return;
      const from = h.from || SNIPER;
      if (h.hit) { T.tracer(from[0], from[1], h.to[0], h.to[1], 1 - k / .25, C.red, 3); T.popText(type === 'cover' && !strong ? '−1' : 'Hit', h.to[0], h.to[1] - 40 - k * 30, C.red, 1 - k / .6); }
      else { let pt = h.to; for (let q = 0; q <= 1; q += .01) { const a = [from[0] + (h.to[0] - from[0]) * q, from[1] + (h.to[1] - from[1]) * q]; if (blocked(from, a)) { pt = a; break; } } T.tracer(from[0], from[1], pt[0], pt[1], 1 - k / .25, C.red, 3); T.flash(pt[0], pt[1], 22, 1 - k / .4); }
    });
    if (type === 'avoid' && strong) { const q = R.p.at(t); if (t > 1.5 && t < 2.6) T.label('waits for it to turn…', q.x, q.y - 48, 'center', C.ink, 16); }
    if (type === 'cover' && strong) { const q = R.p.at(t); if (!R.p.at(t).moving && t < R.dead.sniper - .7 && t > 1) T.label('waits out the shot', q.x, q.y - 48, 'center', C.ink, 15); }
    const q = R.p.at(t);
    T.player(q.x, q.y, q.face, k);
    if (t >= R.done) T.popText('Goal', GOAL[0], GOAL[1] - 74, C.good, T.clamp((t - R.done) / .3));
  }
  // fit the world into a canvas region
  function fit(g, x, y, w, h, fn) {
    const sc = Math.min(w / WW, h / WH);
    g.save(); g.translate(x + (w - WW * sc) / 2, y + (h - WH * sc) / 2); g.scale(sc, sc); fn(); g.restore();
  }

  /* ---------- slide 1: title ---------- */
  canvasDemo('title', (s, c, g) => {
    const R = plan('flank', true, .8);
    return (dt, t) => { g.clearRect(0, 0, c.width, c.height); fit(g, 0, 0, c.width, c.height, () => draw(g, R, t % R.dur)); };
  });

  /* ---------- slide 2: the sandbox ---------- */
  canvasDemo('sandbox', (s, c, g) => {
    const out = $(s, '.sb-out'), tabs = $(s, '.sb-tabs'), slider = $(s, '.sb-str'), bars = $(s, '.sb-bars');
    const st = { type: 'avoid', s: .8, t: 0 };
    let R, last = '';
    tabs.innerHTML = ORDER.map(k => `<button class="btn" data-t="${k}"><b>${TYPES[k].name}</b><small>${TYPES[k].game}</small></button>`).join('');
    $$(tabs, 'button').forEach(b => b.onclick = () => { st.type = b.dataset.t; rebuild(); });
    slider.value = st.s * 100;
    slider.oninput = () => { st.s = slider.value / 100; rebuild(false); };
    function rebuild(restart = true) {
      const strong = st.s >= STRONG, was = R && R.strong;
      R = plan(st.type, strong, st.s);
      if (restart || was !== strong) st.t = 0;
      $$(tabs, 'button').forEach(b => b.classList.toggle('on', b.dataset.t === st.type));
      $(s, '.sb-lvl').textContent = st.s < STRONG ? 'too weak to matter' : st.s < .7 ? 'strong enough' : 'very strong';
      $(s, '.sb-lvl').className = 'sb-lvl ' + (st.s < STRONG ? 'bad' : 'good');
      const ty = TYPES[st.type], changed = strong && ty.changes;
      const pct = x => Math.min(100, x / 16 * 100);
      bars.innerHTML = `<div><span>Empty corridor</span><i style="width:${pct(EMPTY)}%"></i><b>${EMPTY.toFixed(1)} s</b></div>`
        + `<div><span>With this enemy</span><i class="e" style="width:${pct(R.done)}%"></i><b>${R.done.toFixed(1)} s</b></div>`
        + `<p>Route changed? <b class="${changed ? 'good' : 'bad'}">${changed ? 'Yes' : 'No'}</b></p>`;
      const msg = `<b>${ty.name}</b> <span class="muted">(${ty.game})</span>. ` + (strong ? ty.strong : `<b class="bad">${WEAK}</b>`);
      if (msg !== last) { last = msg; say(out, msg); }
    }
    rebuild();
    return dt => { st.t += dt; if (st.t > R.dur) st.t = 0; g.clearRect(0, 0, c.width, c.height); fit(g, 0, 0, c.width, c.height, () => draw(g, R, Math.max(0, st.t))); };
  });

  /* ---------- slide 3: all five at once, weak then strong ---------- */
  let fiveApi = null;
  canvasDemo('five', (s, c, g) => {
    const out = $(s, '.fv-out'), slider = $(s, '.fv-str');
    const st = { s: .2, t: 0, auto: true, held: false }, W = c.width, H = c.height;
    const runs = sv => ORDER.map(k => plan(k, sv >= STRONG, sv));
    let RS = runs(st.s), last = '';
    const weakRuns = runs(.2), strongRuns = runs(.85);
    const span = rs => Math.max(...rs.map(r => r.dur));
    const AUTO = { weak: span(weakRuns), strong: span(strongRuns) };
    slider.oninput = () => { st.auto = false; st.s = slider.value / 100; RS = runs(st.s); st.t = 0; $(s, '.fv-auto').classList.remove('on'); };
    $(s, '.fv-auto').onclick = e => { st.auto = true; st.t = 0; e.target.classList.add('on'); };
    const cellW = W / 3, cellH = H / 2;
    function panel(i, R, t) {
      const x = (i % 3) * cellW, y = Math.floor(i / 3) * cellH;
      g.save(); g.beginPath(); g.rect(x, y, cellW, cellH); g.clip();
      fit(g, x + 10, y + 34, cellW - 20, cellH - 44, () => draw(g, R, Math.min(t, R.dur - .01), { k: 1.7 }));
      T.use(g); T.label(`${TYPES[R.type].name} · ${TYPES[R.type].game.split(':')[0]}`, x + 14, y + 18, 'left', C.ink, 16, 'rgba(255,252,244,0)');
      g.restore();
    }
    function render() {
      let rs = RS, t = st.t, strong = st.s >= STRONG;
      if (st.auto) {
        const tt = st.t % (AUTO.weak + AUTO.strong + 2);
        strong = tt >= AUTO.weak + 1; rs = strong ? strongRuns : weakRuns; t = strong ? tt - AUTO.weak - 1 : tt;
        slider.value = strong ? 85 : 20;
      } else if (st.t > span(rs) + 1) st.t = 0;
      g.clearRect(0, 0, W, H);
      rs.forEach((R, i) => panel(i, R, t));
      // the sixth cell: the verdict and the chain it breaks
      const x = 2 * cellW, y = cellH;
      T.use(g);
      const allDone = t > Math.max(...rs.map(r => r.done));
      const chain = ['Uniqueness', 'Resistance', 'Opportunity'];
      chain.forEach((n, i) => {
        const cx = x + 40 + i * 150, cy = y + 70, on = strong || i === 1;
        g.fillStyle = on ? '#152044' : 'rgba(21,32,68,.15)'; g.beginPath(); g.roundRect(cx - 4, cy - 22, 128, 44, 8); g.fill();
        g.fillStyle = on ? '#ffb951' : '#8a8fae'; g.font = '700 17px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, cx + 60, cy + 1);
        if (i < 2) { g.fillStyle = strong ? '#152044' : '#b9b3a0'; g.beginPath(); g.moveTo(cx + 128, cy - 8); g.lineTo(cx + 142, cy); g.lineTo(cx + 128, cy + 8); g.fill(); }
      });
      if (!strong) T.stamp('✗ Resistance not strong enough', x + cellW / 2, y + 160, C.red, allDone ? 1 : .35, 24);
      else T.stamp('✓ Five different routes', x + cellW / 2, y + 160, C.good, allDone ? 1 : .35, 26);
      const msg = strong
        ? '<b class="good">Strong enough to matter.</b> Each enemy forces its own route: shoot, slip past, circle behind, hop between cover, kill the support first. The uniqueness shows up as a change in what the player does.'
        : '<b class="bad">Too weak to matter.</b> All five play the same: walk up, shoot, walk on. The players keep doing what they already were, so five different enemies feel like one.';
      if (msg !== last) { last = msg; say(out, msg); }
    }
    fiveApi = { seek(tt) { st.held = st.auto = true; st.t = tt; render(); }, dur: () => AUTO.weak + AUTO.strong + 2 };
    return dt => { if (!st.held) st.t += dt; render(); };
  });

  window.__seek = (t, which = 'five') => fiveApi.seek(t);
  window.__dur = () => fiveApi.dur();
})();
