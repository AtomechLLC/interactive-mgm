/* Unavoidable Calamity, played. A World of Warcraft delve concept by Alonso R Baselli, Diogo Guerreiro and Pavle Sivakov,
   from their Miro board: data.js holds their enemies, pulls and map, sim.js runs the fights.
   Slides: title and credits · their rules · the roster · the delve (map hub + fights) · every pull solved two ways. */
(function () {
  const { $, $$, demo, canvasDemo, say, store } = FPF.kit;
  const D = window.DELVE_DATA, SIM = window.DELVE_SIM, E = D.ENEMIES;
  const TAU = Math.PI * 2, CW = SIM.W, CH = SIM.H;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const IMGS = {};
  const img = n => { if (!IMGS[n]) { const i = new Image(); i.src = 'img/' + n + '.jpg'; IMGS[n] = i; } return IMGS[n]; };
  const MAP = img('map');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const pct = x => Math.round(x * 100) + '%';
  const SKILL = D.SKILLS;
  const AREA_COL = { 1: '#ffe94a', 2: '#ff9f2a', 3: '#ff6a1a' };
  const ringCol = k => E[k].boss || E[k].elite ? '#ffb951' : E[k].object ? '#c0306a' : k === 'healer' ? '#43c78a' : k === 'caller' ? '#6a8dff' : E[k].range === 'ranged' ? '#4aa8ff' : '#ff6b5a';

  // icon in a circle
  function disc(g, name, x, y, r, ring, o = {}) {
    const im = img(name);
    g.save(); g.globalAlpha *= o.a ?? 1;
    g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (im.complete && im.naturalWidth) { g.save(); g.beginPath(); g.arc(x, y, r - 1, 0, TAU); g.clip(); if (o.grey) g.filter = 'grayscale(1) brightness(.7)'; g.drawImage(im, x - r * 1.15, y - r * 1.15, r * 2.3, r * 2.3); g.restore(); }
    if (ring) { g.strokeStyle = ring; g.lineWidth = o.lw || 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
    g.restore();
  }
  function sq(g, name, x, y, s, o = {}) {
    const im = img(name);
    g.save(); g.globalAlpha *= o.a ?? 1;
    if (im.complete && im.naturalWidth) { g.save(); g.beginPath(); g.roundRect(x, y, s, s, 5); g.clip(); if (o.grey) g.filter = 'grayscale(1) brightness(.6)'; g.drawImage(im, x, y, s, s); g.restore(); }
    g.strokeStyle = o.edge || '#000'; g.lineWidth = o.lw || 2; g.beginPath(); g.roundRect(x, y, s, s, 5); g.stroke();
    g.restore();
  }
  function txt(g, s, x, y, o = {}) {
    g.save(); g.font = `${o.w || 600} ${o.size || 14}px ${o.font || 'Jost, sans-serif'}`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    g.globalAlpha *= o.a ?? 1;
    if (o.stroke !== false) { g.lineWidth = o.lw || 4; g.strokeStyle = o.stroke || 'rgba(0,0,0,.85)'; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.fillStyle = o.col || '#fff'; g.fillText(s, x, y); g.restore();
  }
  function bar(g, x, y, w, h, k, col, bg = 'rgba(0,0,0,.65)') {
    g.fillStyle = bg; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x, y, w * clamp(k, 0, 1), h);
    g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1);
  }

  /* ======================= the run (saved in this browser) ======================= */
  const RUN0 = () => ({ role: 'melee', cleared: {}, barrels: {}, hp: null, wipes: 0, boss: false, spot: D.SPOTS.start.slice(), fights: 0 });
  let RUN = Object.assign(RUN0(), store.get('delve-run', {}));
  const save = () => store.set('delve-run', RUN);
  const kitOf = () => SIM.KIT[RUN.role];
  if (RUN.hp == null) RUN.hp = kitOf().hp;
  const barrelsDone = () => Object.keys(RUN.barrels).length;
  const pullsDone = () => D.PULLS.filter(p => RUN.cleared[p.id]).length;

  /* ======================= map geometry ======================= */
  const toPx = ([u, v]) => ({ x: u * CW, y: v * CH });
  const PATROL_SPEED = 20;                                  // canvas px per second on the map
  function patrolAt(p, t) {
    const pts = p.patrol.map(toPx), segs = [];
    let tot = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b.x - a.x, b.y - a.y); segs.push([a, b, l]); tot += l; }
    let s = (t * PATROL_SPEED + p.id.charCodeAt(2) * 37) % tot;
    for (const [a, b, l] of segs) { if (s <= l) return { x: a.x + (b.x - a.x) * s / l, y: a.y + (b.y - a.y) * s / l }; s -= l; }
    return pts[0];
  }
  const posOf = (p, t) => p.patrol ? patrolAt(p, t) : toPx(p.at);
  const MERGE_PATROL = 62, MERGE_BARREL = 70;

  // what you'd pull if you engaged this target now
  function engagePlan(target, t) {
    const at = target.type === 'pull' ? posOf(target.p, t) : target.type === 'barrel' ? toPx(D.BARRELS[target.i]) : toPx(D.BOSS.at);
    const merged = [];
    if (target.type !== 'boss') {
      D.PULLS.forEach(q => {
        if (RUN.cleared[q.id] || (target.p && q.id === target.p.id)) return;
        const d = Math.hypot(posOf(q, t).x - at.x, posOf(q, t).y - at.y);
        if (q.patrol && d < MERGE_PATROL) merged.push(q);
        else if (!q.patrol && target.type === 'barrel' && d < MERGE_BARREL) merged.push(q);
      });
    }
    return { at, merged };
  }

  /* ======================= fights ======================= */
  const CROP = 0.24;
  const BOT_CACHE = {};
  function fightSpec(target, merged) {
    const joiners = merged.flatMap(q => q.m);
    if (target.type === 'pull') return { kinds: target.p.m, joiners };
    if (target.type === 'barrel') return { kinds: [], barrels: [[560, CH / 2]], joiners };
    const c = cropAt(toPx(D.BOSS.at));
    return { kinds: [], boss: true, barrels: D.BOSS.barrels.map(([u, v]) => [(u - c.u0) / c.w * CW, (v - c.v0) / c.h * CH]) };
  }
  function fightPlan(target, merged) {
    if (target.type === 'boss') return D.BOSS.plan;
    const base = target.type === 'pull' ? target.p.plan : (merged.find(q => !q.patrol)?.plan || { order: [], int: [] });
    const extra = merged.flatMap(q => q.m).filter(k => !base.order.includes(k));
    const add = pl => pl && ({ ...pl, order: [...pl.order, ...extra], int: [...(pl.int || []), ...merged.flatMap(q => q.plan.int)], stun: [...(pl.stun || []), ...merged.flatMap(q => q.plan.stun || [])] });
    const out = add(base); if (base.melee) out.melee = add({ order: base.melee.order, int: base.melee.int, stun: base.stun });
    if (target.type === 'barrel') { out.order = [...out.order, 'barrel']; if (out.melee) out.melee.order = [...out.melee.order, 'barrel']; }
    return out;
  }
  function cropAt(pt) {
    const u = clamp(pt.x / CW, CROP / 2, 1 - CROP / 2), v = clamp(pt.y / CH, CROP / 2, 1 - CROP / 2);
    return { u0: u - CROP / 2, v0: v - CROP / 2, w: CROP, h: CROP };
  }
  function botOutcome(key, spec, plan, mode, role) {
    const k = key + '|' + mode + '|' + role + '|' + (spec.joiners || []).join(',') + '|' + (spec.heroHp ?? '');
    if (!BOT_CACHE[k]) { const s = SIM.runBot({ ...spec, heroHp: undefined }, plan, mode, role, 1); BOT_CACHE[k] = { over: s.over, taken: s.stats.taken / s.hero.max, t: s.t }; }
    return BOT_CACHE[k];
  }
  const targetName = tg => tg.type === 'pull' ? 'Pull ' + tg.p.id : tg.type === 'barrel' ? 'Corrupted Wine Barrel' : 'Final boss';
  const targetKey = tg => tg.type === 'pull' ? tg.p.id : tg.type === 'barrel' ? 'barrel' + tg.i : 'boss';

  /* ======================= slide 4: the delve ======================= */
  let delveApi = null;
  canvasDemo('delve', (s, cv, g) => {
    const side = $(s, '.dv-side');
    const st = { view: 'map', clock: 0, hover: null, sel: null, F: null, keys: {}, heroAnim: null, sideKey: '' };

    /* ---------- map view ---------- */
    function mapTargets() {
      const list = [];
      D.PULLS.forEach(p => { if (!RUN.cleared[p.id]) { const q = posOf(p, st.clock); list.push({ type: 'pull', p, x: q.x, y: q.y, r: 17 }); } });
      D.BARRELS.forEach((b, i) => { if (!RUN.barrels[i]) { const q = toPx(b); list.push({ type: 'barrel', i, x: q.x, y: q.y, r: 11 }); } });
      const rp = toPx(D.SPOTS.rest); list.push({ type: 'rest', x: rp.x, y: rp.y, r: 18 });
      const bp = toPx(D.BOSS.at); if (!RUN.boss) list.push({ type: 'boss', x: bp.x, y: bp.y, r: 30 });
      return list;
    }
    const sameT = (a, b) => a && b && a.type === b.type && (a.p?.id ?? a.i) === (b.p?.id ?? b.i);

    function drawMap() {
      if (MAP.complete) g.drawImage(MAP, 0, 0, CW, CH); else { g.fillStyle = '#222'; g.fillRect(0, 0, CW, CH); }
      g.fillStyle = 'rgba(8,6,20,.18)'; g.fillRect(0, 0, CW, CH);
      D.ZONES.forEach(z => { const q = toPx(z.at); txt(g, z.name, q.x, q.y, { size: 15, w: 700, col: z.col, lw: 4 }); });
      const hl = st.sel || st.hover;
      const plan = hl && (hl.type === 'pull' || hl.type === 'barrel') ? engagePlan(hl, st.clock) : null;
      // patrol routes
      D.PULLS.filter(p => p.patrol && !RUN.cleared[p.id]).forEach(p => {
        const pts = p.patrol.map(toPx);
        g.save(); g.setLineDash([4, 6]); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath();
        pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath(); g.stroke(); g.restore();
      });
      // barrels
      D.BARRELS.forEach((b, i) => {
        const q = toPx(b), done = RUN.barrels[i];
        disc(g, 'inv_drink_05', q.x, q.y, 10, done ? '#555' : '#c0306a', { grey: done, lw: 2 });
        if (done) { g.strokeStyle = '#ddd'; g.lineWidth = 2; g.beginPath(); g.moveTo(q.x - 7, q.y - 7); g.lineTo(q.x + 7, q.y + 7); g.moveTo(q.x + 7, q.y - 7); g.lineTo(q.x - 7, q.y + 7); g.stroke(); }
      });
      // merge preview
      if (plan) {
        const r = hl.type === 'barrel' ? MERGE_BARREL : MERGE_PATROL;
        g.save(); g.fillStyle = 'rgba(255,90,90,.12)'; g.strokeStyle = 'rgba(255,120,120,.8)'; g.setLineDash([6, 5]); g.lineWidth = 2;
        g.beginPath(); g.arc(plan.at.x, plan.at.y, r, 0, TAU); g.fill(); g.stroke(); g.restore();
      }
      // pulls
      D.PULLS.forEach(p => {
        const q = posOf(p, st.clock), done = RUN.cleared[p.id];
        const on = hl?.p?.id === p.id, joins = plan?.merged.includes(p);
        if (on || joins) { g.save(); g.shadowColor = joins ? '#ff4a4a' : '#fff'; g.shadowBlur = 16; disc(g, E[p.m[0]].icon, q.x, q.y, 18, joins ? '#ff4a4a' : '#fff', { lw: 3 }); g.restore(); }
        disc(g, E[p.m[0]].icon, q.x, q.y, p.patrol ? 14 : 16, done ? '#666' : p.elite ? '#ffb951' : AREA_COL[p.area], { grey: done, lw: p.elite ? 4 : 3 });
        if (!done && p.m.length > 1) txt(g, '×' + p.m.length, q.x + 15, q.y + 13, { size: 11, w: 700 });
        txt(g, p.id, q.x, q.y - 25, { size: 13, w: 700, col: done ? '#aaa' : '#fff' });
        if (done) txt(g, '✓', q.x, q.y + 1, { size: 18, col: '#7dffa0' });
        if (joins) txt(g, 'joins!', q.x, q.y + 29, { size: 13, w: 700, col: '#ff8a8a' });
      });
      // rest area and the boss gate
      const rp = toPx(D.SPOTS.rest);
      g.save(); g.fillStyle = 'rgba(30,60,30,.85)'; g.strokeStyle = '#7ef310'; g.lineWidth = 3; g.beginPath(); g.arc(rp.x, rp.y, 16, 0, TAU); g.fill(); g.stroke(); g.restore();
      txt(g, '+', rp.x, rp.y, { size: 24, w: 800, col: '#7ef310' });
      const bp = toPx(D.BOSS.at), open = barrelsDone() >= D.BARRELS_NEEDED;
      disc(g, E.construct.icon, bp.x, bp.y, 28, RUN.boss ? '#666' : open ? '#ffb951' : '#777', { grey: RUN.boss || !open, lw: 4 });
      if (RUN.boss) txt(g, '✓', bp.x, bp.y, { size: 30, col: '#7dffa0' });
      else if (!open) txt(g, `🔒 ${barrelsDone()}/${D.BARRELS_NEEDED} barrels`, bp.x, bp.y + 42, { size: 14, w: 700, col: '#ffd0d0' });
      if (RUN.boss) { const tp = toPx(D.SPOTS.treasure); txt(g, '★ Treasure', tp.x, tp.y + 26, { size: 16, w: 800, col: '#ffe08a' }); }
      // hero
      let hp = toPx(RUN.spot);
      if (st.heroAnim) { const a = st.heroAnim, k = clamp((st.clock - a.t0) / a.dur, 0, 1); hp = { x: a.from.x + (a.to.x - a.from.x) * k, y: a.from.y + (a.to.y - a.from.y) * k }; if (k >= 1) st.heroAnim = null; }
      disc(g, kitOf().icon, hp.x, hp.y, 13, '#fff', { lw: 3 });
      txt(g, 'You', hp.x, hp.y + 22, { size: 12, w: 700 });
      if (RUN.hp < kitOf().hp) bar(g, hp.x - 16, hp.y - 22, 32, 4, RUN.hp / kitOf().hp, '#5fe07a');
      // hover hint
      if (st.hover && !st.sel) txt(g, 'click to inspect', st.hover.x, st.hover.y + (st.hover.r + 16), { size: 12, col: '#ffe08a' });
    }

    function mapPick(x, y) {
      return mapTargets().filter(t => Math.hypot(t.x - x, t.y - y) < t.r + 6).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || null;
    }

    /* ---------- fight view ---------- */
    function startFight(target, mode) {
      const plan0 = engagePlan(target, st.clock);
      const merged = plan0.merged;
      const spec = fightSpec(target, merged), plan = fightPlan(target, merged);
      if (mode === 'play') spec.heroHp = RUN.hp;
      const S = SIM.newFight(spec, RUN.role, (st.clock * 1000) | 0 || 1);
      const crop = cropAt(plan0.at);
      st.F = { S, mode, target, merged, spec, plan, crop, speed: 1, paused: false, mem: {}, acc: 0, moveTo: null, chase: false, queue: [], done: false, at: plan0.at };
      st.view = 'fight'; st.sel = target;
      sideKey('');
    }
    function endFight() {
      const F = st.F; if (!F || F.done) return;
      F.done = true;
      if (F.mode !== 'play') return;
      const S = F.S, k = kitOf();
      RUN.fights++;
      if (S.over === 'win') {
        if (F.target.type === 'pull') RUN.cleared[F.target.p.id] = true;
        if (F.target.type === 'barrel') RUN.barrels[F.target.i] = true;
        if (F.target.type === 'boss') RUN.boss = true;
        F.merged.forEach(q => RUN.cleared[q.id] = true);
        RUN.hp = Math.round(S.hero.hp + (k.hp - S.hero.hp) * 0.35);   // your companion patches you up a little
        RUN.spot = [F.at.x / CW, F.at.y / CH];
      } else if (S.over === 'wipe') {
        RUN.wipes++; RUN.hp = k.hp; RUN.spot = D.SPOTS.start.slice();
      }
      save();
    }
    function leaveFight() { st.view = 'map'; st.F = null; sideKey(''); }

    function fightInput(F) {
      const S = F.S, h = S.hero;
      if (F.mode !== 'play') return SIM.bot(S, F.plan.melee && RUN.role === 'melee' ? { ...F.plan, ...F.plan.melee } : F.plan, F.mode, F.mem);
      const inp = { press: F.queue.splice(0), flags: {} };
      let mx = 0, my = 0; const K = st.keys;
      if (K.KeyA || K.ArrowLeft) mx--; if (K.KeyD || K.ArrowRight) mx++; if (K.KeyW || K.ArrowUp) my--; if (K.KeyS || K.ArrowDown) my++;
      if (mx || my) { inp.move = { x: mx, y: my }; F.moveTo = null; F.chase = false; }
      else if (F.moveTo) { const dx = F.moveTo.x - h.x, dy = F.moveTo.y - h.y; if (Math.hypot(dx, dy) < 6) F.moveTo = null; else inp.move = { x: dx, y: dy }; }
      else if (F.chase) {
        const t = S.foes.find(f => f.id === h.tgt && f.alive);
        if (!t) F.chase = false;
        else { const want = RUN.role === 'melee' ? kitOf().range + t.r + h.r : kitOf().range - 20; const d = Math.hypot(t.x - h.x, t.y - h.y); if (d > want) inp.move = { x: t.x - h.x, y: t.y - h.y }; }
      }
      if (F.pendingTarget != null) { inp.target = F.pendingTarget; F.pendingTarget = null; }
      return inp;
    }

    function tickFight(dt) {
      const F = st.F;
      if (!F || F.paused) return;
      F.acc += dt * F.speed;
      const STEP = 1 / 60;
      while (F.acc >= STEP) {
        F.acc -= STEP;
        if (F.S.over) { SIM.step(F.S, STEP, {}); continue; }
        SIM.step(F.S, STEP, fightInput(F));
        if (F.S.over) endFight();
      }
      if (F.mode === 'play' && !F.S.over && F.S.hero.tgt == null && F.S.t > 0.5) {
        // keep something targeted so new players always hit back
        const L = SIM.live(F.S).filter(f => !f.stealth && !(f.joinT > 0));
        const n = L.sort((a, b) => SIM.dist(a, F.S.hero) - SIM.dist(b, F.S.hero))[0];
        if (n) F.pendingTarget = n.id;
      }
    }

    function drawFight() {
      const F = st.F, S = F.S, h = S.hero, c = F.crop;
      if (MAP.complete) g.drawImage(MAP, c.u0 * MAP.naturalWidth, c.v0 * MAP.naturalHeight, c.w * MAP.naturalWidth, c.h * MAP.naturalHeight, 0, 0, CW, CH);
      g.fillStyle = 'rgba(10,6,22,.38)'; g.fillRect(0, 0, CW, CH);
      // pools
      S.pools.forEach(p => {
        const gr = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
        gr.addColorStop(0, 'rgba(150,20,90,.85)'); gr.addColorStop(1, 'rgba(90,10,120,.35)');
        g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, Math.max(2, p.r), 0, TAU); g.fill();
      });
      // Void Collector
      if (h.collectT > 0) { g.save(); g.strokeStyle = 'rgba(200,150,255,.9)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.lineDashOffset = -S.t * 80; g.beginPath(); g.arc(h.x, h.y, SIM.BTN.E.rad, 0, TAU); g.stroke(); g.restore(); }
      // telegraphs
      S.tele.forEach(tl => {
        const k = 1 - tl.t / tl.max;
        g.save(); g.fillStyle = tl.col + '33'; g.strokeStyle = tl.col; g.lineWidth = 2;
        g.beginPath(); g.arc(tl.x, tl.y, tl.r, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = tl.col + '66'; g.beginPath(); g.arc(tl.x, tl.y, tl.r * k, 0, TAU); g.fill(); g.restore();
      });
      // cones and beams
      SIM.live(S).forEach(f => {
        const cc = f.cast; if (!cc) return;
        const a = cc.ab;
        if (a.kind === 'cone') {
          const chan = cc.t >= cc.dur;
          g.save(); g.fillStyle = chan ? 'rgba(170,60,255,.38)' : 'rgba(255,80,80,.18)'; g.strokeStyle = chan ? '#b46bff' : '#ff6b6b'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(f.x, f.y); g.arc(f.x, f.y, a.len, cc.dir - a.arc / 2, cc.dir + a.arc / 2); g.closePath(); g.fill(); g.stroke(); g.restore();
        }
        if (a.kind === 'beam' && cc.t >= cc.dur) { g.save(); g.strokeStyle = '#7fe05a'; g.lineWidth = 4 + Math.sin(S.t * 30) * 1.5; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(h.x, h.y); g.stroke(); g.restore(); }
        if (a.kind === 'heal' && cc.t >= cc.dur) { g.save(); g.strokeStyle = 'rgba(67,199,138,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, a.rad * (0.3 + ((S.t * 1.5) % 0.7)), 0, TAU); g.stroke(); g.restore(); }
        if (a.kind === 'siphon' && cc.t >= cc.dur) { g.save(); g.strokeStyle = 'rgba(180,107,255,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, a.rad, 0, TAU); g.stroke(); g.restore(); }
      });
      // target marker
      const tg = S.foes.find(f => f.id === h.tgt && f.alive);
      if (tg) { g.save(); g.strokeStyle = '#ffe08a'; g.lineWidth = 2; g.setLineDash([6, 5]); g.lineDashOffset = -S.t * 30; g.beginPath(); g.arc(tg.x, tg.y, tg.r + 9, 0, TAU); g.stroke(); g.restore(); }
      // enemies
      S.foes.forEach(f => {
        if (!f.alive) return;
        const d = E[f.kind];
        if (f.joinT > 0) {
          disc(g, d.icon, f.x, f.y, f.r, '#ff4a4a', { a: 0.55 });
          txt(g, `${d.short || d.name} joins in ${f.joinT.toFixed(1)}s`, f.x, f.y + (f.y < CH / 2 ? f.r + 14 : -f.r - 14), { size: 13, w: 700, col: '#ff9a9a' });
          return;
        }
        if (f.stealth) { g.save(); g.globalAlpha = 0.18 + 0.08 * Math.sin(S.t * 6); disc(g, d.icon, f.x, f.y, f.r, '#c69bff'); g.restore(); return; }
        if (f.enraged) { g.save(); g.shadowColor = '#ff2020'; g.shadowBlur = 24; disc(g, d.icon, f.x, f.y, f.r, '#ff4040', { lw: 4 }); g.restore(); }
        if (f.buffs.siphon) { g.save(); g.fillStyle = 'rgba(160,90,255,.25)'; g.beginPath(); g.arc(f.x, f.y, f.r + 12, 0, TAU); g.fill(); g.restore(); }
        if (f.buffs.enhance) { g.save(); g.shadowColor = '#ff7ad9'; g.shadowBlur = 18; disc(g, d.icon, f.x, f.y, f.r, '#ff7ad9'); g.restore(); }
        disc(g, d.icon, f.x, f.y, f.r, ringCol(f.kind), { lw: d.elite || d.boss ? 4 : 3 });
        if (f.kind === 'barrel' && !f.active) txt(g, 'inert', f.x, f.y + f.r + 12, { size: 12, col: '#ddd' });
        if (f.shield > 0) { g.save(); g.strokeStyle = 'rgba(110,160,255,.95)'; g.lineWidth = 4; g.beginPath(); g.arc(f.x, f.y, f.r + 5, 0, TAU); g.stroke(); g.restore(); }
        if (f.stun > 0) txt(g, '✦ stunned', f.x, f.y + f.r + 12, { size: 12, col: '#e9d27a' });
        if (f.revealT > 0) txt(g, 'One with the Dark', f.x, f.y + f.r + 12, { size: 11, col: '#c69bff' });
        // health and cast bars
        const bw = Math.max(46, f.r * 2.6);
        bar(g, f.x - bw / 2, f.y - f.r - 12, bw, 6, f.hp / f.max, f.kind === 'barrel' ? '#c0306a' : '#d33');
        if (f.shield > 0) bar(g, f.x - bw / 2, f.y - f.r - 12, bw * Math.min(1, f.shield / f.max), 3, 1, '#7aa8ff', 'rgba(0,0,0,0)');
        if (d.elite || d.boss) txt(g, d.short || d.name, f.x, f.y + f.r + (f.stun > 0 || f.revealT > 0 ? 26 : 13), { size: 13, w: 700, col: '#ffd27a' });
        if (f.buffs.siphon) txt(g, `${Math.round(f.buffs.siphon.dr * 100)}% resist`, f.x, f.y + f.r + 28, { size: 12, col: '#d4b0ff' });
        if (f.cast) {
          const cc = f.cast, a = cc.ab, chan = cc.t >= cc.dur && cc.chan;
          const k = chan ? 1 - (cc.t - cc.dur) / cc.chan : cc.t / cc.dur;
          const y = f.y - f.r - 32, w = 110;
          g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(f.x - w / 2, y, w, 14);
          g.fillStyle = a.int ? '#ffb22e' : '#9a9aa8'; g.fillRect(f.x - w / 2, y, w * clamp(k, 0, 1), 14);
          g.strokeStyle = a.int ? '#ffe7a8' : '#d0d0d8'; g.lineWidth = 1; g.strokeRect(f.x - w / 2 + .5, y + .5, w - 1, 13);
          sq(g, a.icon, f.x - w / 2 - 17, y - 2, 17, { lw: 1 });
          txt(g, a.name + (a.int ? '' : ' 🛡'), f.x, y + 7, { size: 11, w: 700, lw: 3 });
        }
      });
      // hero
      const kit = S.kit;
      if (h.drT > 0) { g.save(); g.strokeStyle = 'rgba(160,230,255,.9)'; g.lineWidth = 4; g.beginPath(); g.arc(h.x, h.y, h.r + 7, 0, TAU); g.stroke(); g.restore(); }
      disc(g, h.hexT > 0 ? 'spell_shaman_hex' : kit.icon, h.x, h.y, h.r + 2, '#fff', { lw: 3 });
      g.save(); g.fillStyle = '#fff'; g.beginPath(); g.arc(h.x + Math.cos(h.face) * (h.r + 6), h.y + Math.sin(h.face) * (h.r + 6), 3, 0, TAU); g.fill(); g.restore();
      bar(g, h.x - 22, h.y - h.r - 13, 44, 5, h.hp / h.max, '#5fe07a');
      if (h.hexT > 0) txt(g, 'Hexed: press 2 to dispel', h.x, h.y + h.r + 16, { size: 13, w: 700, col: '#a7ff7a' });
      if (S.role === 'melee' && tg) { const d = Math.hypot(tg.x - h.x, tg.y - h.y); if (d > kit.range + tg.r + h.r + 4) txt(g, 'out of reach', h.x, h.y + h.r + (h.hexT > 0 ? 30 : 16), { size: 11, col: '#ffcf8a' }); }
      if (S.role === 'ranged' && tg && h.moving && !h.kb) txt(g, 'casting needs you to stand still', h.x, h.y + h.r + 16, { size: 11, col: '#bfe6ff' });
      // effects
      S.fx.forEach(e => {
        const k = e.t / e.life;
        if (e.k === 'txt') txt(g, e.txt, e.x, e.y - k * 26, { size: 14, w: 700, col: e.col, a: 1 - k * k });
        else if (e.k === 'ring') { g.save(); g.globalAlpha = 1 - k; g.strokeStyle = e.col; g.lineWidth = 3; g.beginPath(); g.arc(e.x, e.y, e.r * (0.6 + 0.4 * k), 0, TAU); g.stroke(); g.restore(); }
        else if (e.k === 'bolt') { g.save(); g.globalAlpha = 1 - k; g.strokeStyle = e.col; g.lineWidth = 4; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + (e.x2 - e.x) * Math.min(1, k * 2), e.y + (e.y2 - e.y) * Math.min(1, k * 2)); g.stroke(); g.restore(); }
      });
      drawHud(F);
    }

    // player frame, target frame, debuffs, action bar
    const SLOTS = [1, 2, 3, 4, 5, 6, 'E'];
    const slotRect = i => ({ x: CW / 2 - (SLOTS.length * 58) / 2 + i * 58, y: CH - 66, s: 50 });
    function drawHud(F) {
      const S = F.S, h = S.hero, kit = S.kit;
      // player
      g.fillStyle = 'rgba(8,10,24,.78)'; g.beginPath(); g.roundRect(10, 10, 250, 58, 8); g.fill();
      disc(g, kit.icon, 38, 39, 22, '#fff');
      txt(g, `You (${kit.name})`, 68, 24, { size: 14, w: 700, align: 'left', stroke: false });
      bar(g, 68, 36, 180, 14, h.hp / h.max, '#3fbf5f');
      txt(g, `${Math.round(h.hp)} / ${h.max}`, 158, 43, { size: 11, w: 700, lw: 3 });
      h.debuffs.forEach((d, i) => {
        sq(g, d.icon, 68 + i * 30, 54, 24, { edge: d.disp ? '#ffd24a' : '#7a2020', lw: 2 });
        txt(g, d.stacks ? '' + d.stacks : Math.ceil(d.t) + '', 68 + i * 30 + 12, 82, { size: 11, w: 700, lw: 3, col: d.disp ? '#ffe08a' : '#ffaaaa' });
      });
      if (h.debuffs.length) txt(g, 'yellow edge = dispellable', 70 + h.debuffs.length * 30, 66, { size: 11, align: 'left', col: '#ffe08a', lw: 3 });
      // target
      const tg = S.foes.find(f => f.id === h.tgt && f.alive);
      if (tg) {
        const d = E[tg.kind];
        g.fillStyle = 'rgba(8,10,24,.78)'; g.beginPath(); g.roundRect(CW / 2 - 140, 10, 280, 52, 8); g.fill();
        disc(g, d.icon, CW / 2 - 112, 36, 20, ringCol(tg.kind));
        txt(g, d.short || d.name, CW / 2 - 86, 23, { size: 13, w: 700, align: 'left', stroke: false });
        bar(g, CW / 2 - 86, 33, 216, 12, tg.hp / tg.max, '#d33');
        txt(g, d.tags.slice(0, 3).join(' · '), CW / 2 - 86, 53, { size: 11, align: 'left', col: '#cbd3ff', stroke: false });
      }
      // timer and mode
      g.fillStyle = 'rgba(8,10,24,.78)'; g.beginPath(); g.roundRect(CW - 220, 10, 210, 52, 8); g.fill();
      txt(g, targetName(F.target) + (F.merged.length ? ' + ' + F.merged.map(q => q.id).join(', ') : ''), CW - 115, 26, { size: 13, w: 700, stroke: false });
      txt(g, (F.mode === 'play' ? 'You' : F.mode === 'solution' ? 'Watching: the board’s solution' : 'Watching: just DPS') + ` · ${S.t.toFixed(1)}s`, CW - 115, 46, { size: 12, col: F.mode === 'play' ? '#9fe0ff' : '#ffd27a', stroke: false });
      // action bar
      SLOTS.forEach((k, i) => {
        const r = slotRect(i), b = SIM.BTN[k], cd = h.cds[k] || 0;
        const name = k === 'E' ? ['Void Collector', 'spell_priest_voidshift'] : kit.keys[k];
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(r.x - 2, r.y - 2, r.s + 4, r.s + 4);
        const lit = !cd && hint(S, k);
        sq(g, name[1], r.x, r.y, r.s, { grey: cd > 0 || (h.hexT > 0 && k !== 2), edge: lit ? '#ffe36a' : '#222', lw: lit ? 3 : 2 });
        if (cd > 0) { g.save(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.moveTo(r.x + r.s / 2, r.y + r.s / 2); g.arc(r.x + r.s / 2, r.y + r.s / 2, r.s * 0.75, -Math.PI / 2, -Math.PI / 2 + TAU * cd / b.cd); g.closePath(); g.save(); g.beginPath(); g.rect(r.x, r.y, r.s, r.s); g.clip(); g.restore(); g.fill(); g.restore(); txt(g, Math.ceil(cd) + '', r.x + r.s / 2, r.y + r.s / 2, { size: 17, w: 800 }); }
        txt(g, '' + k, r.x + 8, r.y + 9, { size: 13, w: 800, col: '#ffe08a', lw: 3 });
      });
      const hov = st.hoverSlot != null ? SLOTS[st.hoverSlot] : null;
      if (hov != null) { const r = slotRect(st.hoverSlot), name = hov === 'E' ? 'Void Collector' : kit.keys[hov][0]; txt(g, `${hov} · ${name}: ${BTN_TEXT[SIM.BTN[hov].k]}`, CW / 2, r.y - 16, { size: 13, w: 700, col: '#fff' }); }
      if (S.over) {
        g.fillStyle = 'rgba(5,6,16,.7)'; g.fillRect(0, CH / 2 - 70, CW, 140);
        const win = S.over === 'win';
        txt(g, win ? (F.target.type === 'boss' ? 'The Construct falls. The treasure room is open.' : 'Cleared') : S.over === 'wipe' ? 'Wiped' : 'Time up', CW / 2, CH / 2 - 30, { size: 34, w: 800, col: win ? '#7dffa0' : '#ff8a8a', font: 'Montserrat, sans-serif' });
        txt(g, `${S.t.toFixed(1)} s · took ${pct(S.stats.taken / h.max)} of your health · ${S.stats.ints} interrupts · ${S.stats.dispels} dispels · ${S.stats.stuns} stuns`, CW / 2, CH / 2 + 10, { size: 16, w: 600 });
        txt(g, F.mode === 'play' ? (win ? 'Back to the map on the right, or retry.' : 'You respawn at the entrance with full health.') : 'A demo: your map is unchanged.', CW / 2, CH / 2 + 40, { size: 14, col: '#cbd3ff' });
      }
      if (F.paused && !S.over) txt(g, 'Paused', CW / 2, CH / 2, { size: 40, w: 800, font: 'Montserrat, sans-serif' });
    }
    const BTN_TEXT = { interrupt: 'stops an orange cast bar', dispel: 'removes a yellow-edged debuff from you, or strips an enemy shield', stun: 'stuns your target for 3 s and stops its cast (not enraged or bosses)', aoe: 'hits everything near ' + 'you or your target', defensive: 'take 55% less damage for 6 s', potion: 'heal 35%', collector: 'sucks up Corrupted Wine Pools around you for 4 s' };
    // should this button light up right now?
    function hint(S, k) {
      const h = S.hero, L = SIM.live(S);
      if (k === 1) return L.some(f => f.cast && f.cast.ab.int && !(f.joinT > 0));
      if (k === 2) return h.debuffs.some(d => d.disp) || L.some(f => f.shield > 0);
      if (k === 3) return L.some(f => f.cast && !f.enraged && !E[f.kind].boss && !E[f.kind].object);
      if (k === 'E') return S.pools.some(p => SIM.dist(p, h) < SIM.BTN.E.rad);
      if (k === 6) return h.hp < h.max * 0.4;
      return false;
    }

    /* ---------- side panel ---------- */
    function sideKey(k) { st.sideKey = k; }
    function renderSide() {
      const F = st.F;
      const key = st.view + '|' + (st.sel ? targetKey(st.sel) : '') + '|' + JSON.stringify(RUN) + '|' + (F ? F.mode + F.speed + F.paused + !!F.S.over + F.S.log.length : '') + '|' + (st.view === 'map' && st.sel ? engagePlan(st.sel.type === 'rest' ? { type: 'boss' } : st.sel, st.clock).merged.map(q => q.id).join() : '');
      if (key === st.sideKey) return;
      st.sideKey = key;
      side.innerHTML = st.view === 'map' ? mapSide() : fightSide();
    }
    function enemyRow(kinds) {
      const n = {}; kinds.forEach(k => n[k] = (n[k] || 0) + 1);
      return Object.entries(n).map(([k, c]) => `<span class="dv-foe" title="${esc(E[k].name)}"><img src="img/${E[k].icon}.jpg" alt="" style="border-color:${ringCol(k)}">${c > 1 ? c + '× ' : ''}${esc(E[k].short || E[k].name)}</span>`).join('');
    }
    function objectives() {
      return `<div class="dv-obj">
        <div class="${barrelsDone() >= D.BARRELS_NEEDED ? 'g' : ''}"><b>${barrelsDone()}/${D.BARRELS_NEEDED}</b><span>Corrupted Wine Barrels destroyed</span></div>
        <div><b>${pullsDone()}/${D.PULLS.length}</b><span>pulls cleared (secondary, optional)</span></div>
        <div class="${RUN.boss ? 'g' : ''}"><b>${RUN.boss ? '✓' : '—'}</b><span>Void Corrupted Construct</span></div></div>`;
    }
    function mapSide() {
      const k = kitOf();
      let sel = '';
      const t = st.sel;
      if (!t) sel = `<p class="tip">Click a pull, a barrel, the rest area or the boss. Patrols walk their dotted routes: engage a pack while a patrol is close and it joins the fight. Barrels wake when you hit them, and any pack standing next to one joins in.</p>`;
      else if (t.type === 'rest') sel = `<h4>Rest Area</h4><p class="tip">Recover to full health.</p><div class="row wrap"><button class="btn" data-act="rest">Rest</button></div>`;
      else {
        const pl = t.type === 'boss' ? { merged: [] } : engagePlan(t, st.clock);
        const locked = t.type === 'boss' && barrelsDone() < D.BARRELS_NEEDED;
        const info = t.type === 'pull' ? t.p : t.type === 'boss' ? D.BOSS : { m: ['barrel'], syn: D.FEATURES.barrel.text, sol: 'Clear the packs around it first, then destroy it, kill the slimes, and use the Void Collector on the pools.' };
        const role = RUN.role;
        const sol = botOutcome(targetKey(t), fightSpec(t, pl.merged), fightPlan(t, pl.merged), 'solution', role);
        const dps = botOutcome(targetKey(t), fightSpec(t, pl.merged), fightPlan(t, pl.merged), 'dps', role);
        const out = o => o.over === 'win' ? `takes ${pct(o.taken)} of your health` : '<b>wipes</b>';
        sel = `<h4>${esc(targetName(t))}${t.p?.elite ? ' · elite' : ''}${t.p?.patrol ? ' · patrol' : ''}</h4>
          <div class="dv-foes">${enemyRow(info.m)}</div>
          ${pl.merged.length ? `<p class="dv-warn">⚠ Right now ${pl.merged.map(q => q.id + ' (' + q.m.map(m => E[m].short || E[m].name).join(', ') + ')').join(' and ')} would join this fight.</p>` : ''}
          <p class="dv-syn"><b>Synergy.</b> ${esc(info.syn)}</p>
          <p class="dv-sol"><b>Solution.</b> ${esc(info.sol)}</p>
          <p class="dv-cmp">As a ${k.name}, the board’s solution ${out(sol)}; just DPS ${out(dps)}.</p>
          ${locked ? `<p class="dv-warn">The gate opens once ${D.BARRELS_NEEDED} barrels are destroyed (${barrelsDone()} so far).</p>` : ''}
          <div class="row wrap"><button class="btn pick" data-act="fight" ${locked ? 'disabled' : ''}>⚔ Fight</button><button class="btn" data-act="watch-solution">▶ Watch the solution</button><button class="btn" data-act="watch-dps">▶ Watch “just DPS”</button></div>`;
      }
      return `${objectives()}
        <h4>Your hero</h4>
        <div class="seg"><button class="btn ${RUN.role === 'melee' ? 'on' : ''}" data-act="role" data-v="melee">Warrior (melee)</button><button class="btn ${RUN.role === 'ranged' ? 'on' : ''}" data-act="role" data-v="ranged">Mage (ranged)</button></div>
        <div class="dv-hp"><i style="width:${RUN.hp / k.hp * 100}%"></i><span>${Math.round(RUN.hp)} / ${k.hp}${RUN.wipes ? ` · ${RUN.wipes} wipe${RUN.wipes > 1 ? 's' : ''}` : ''}</span></div>
        <div class="dv-sel">${sel}</div>
        <div class="row wrap dv-foot"><button class="btn" data-act="reset">Reset the delve</button><button class="btn" data-act="tour">▶ Guided tour</button></div>`;
    }
    function fightSide() {
      const F = st.F, S = F.S, t = F.target, k = kitOf();
      const info = t.type === 'pull' ? t.p : t.type === 'boss' ? D.BOSS : { m: ['barrel'], syn: D.FEATURES.barrel.text, sol: 'Destroy it, kill the slimes before they burst, and use the Void Collector on the pools.' };
      const keys = [1, 2, 3, 4, 5, 6].map(n => `<li><kbd>${n}</kbd> ${esc(k.keys[n][0])}: ${BTN_TEXT[SIM.BTN[n].k]}</li>`).join('') + `<li><kbd>E</kbd> Void Collector: ${BTN_TEXT.collector}</li>`;
      const log = S.log.slice(-5).reverse().map(([tt, m]) => `<li><span>${tt.toFixed(1)}s</span> ${esc(m)}</li>`).join('');
      let res = '';
      if (S.over) {
        const by = Object.entries(S.stats.by).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, v]) => `<li>${esc(n)}: ${pct(v / S.hero.max)}</li>`).join('');
        res = `<h4>What hurt</h4><ul class="dv-hurt">${by || '<li>Nothing</li>'}</ul>`;
      }
      return `<h4>${esc(targetName(t))}${F.merged.length ? ' + ' + F.merged.map(q => q.id).join(', ') : ''}</h4>
        <div class="dv-foes">${enemyRow([...info.m, ...F.merged.flatMap(q => q.m)])}</div>
        <p class="dv-sol"><b>Solution.</b> ${esc(info.sol)}</p>
        ${res}
        <div class="row wrap">${S.over ? `<button class="btn pick" data-act="map">← Map</button><button class="btn" data-act="retry">↻ Retry</button>` : `<button class="btn" data-act="pause">${F.paused ? '▶ Resume' : '❚❚ Pause'}</button><button class="btn" data-act="retreat">← Leave</button>`}
        ${F.mode !== 'play' ? `<button class="btn ${F.speed > 1 ? 'on' : ''}" data-act="speed">2× speed</button>` : ''}
        <button class="btn" data-act="${F.mode === 'solution' ? 'watch-dps' : 'watch-solution'}">▶ ${F.mode === 'solution' ? 'Watch “just DPS”' : 'Watch the solution'}</button></div>
        ${F.mode === 'play' ? `<h4>Controls</h4><p class="tip">Click an enemy to target (and chase it), click the ground to move, or use WASD. Buttons light up when they would help.</p><ul class="dv-keys">${keys}</ul>` : ''}
        <h4>Log</h4><ul class="dv-log">${log}</ul>`;
    }
    side.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
      const act = b.dataset.act, F = st.F;
      stopTour();
      if (act === 'role') { RUN.role = b.dataset.v; RUN.hp = Math.min(RUN.hp, kitOf().hp); if (!RUN.fights) RUN.hp = kitOf().hp; save(); }
      if (act === 'rest') { RUN.hp = kitOf().hp; heroTo(D.SPOTS.rest); save(); }
      if (act === 'reset') { const r = RUN.role; RUN = RUN0(); RUN.role = r; RUN.hp = kitOf().hp; save(); st.sel = null; }
      if (act === 'fight' && st.sel) { heroTo([engagePlan(st.sel, st.clock).at.x / CW, engagePlan(st.sel, st.clock).at.y / CH]); startFight(st.sel, 'play'); }
      if (act === 'watch-solution' || act === 'watch-dps') { const tg = F ? F.target : st.sel; if (tg) startFight(tg, act === 'watch-solution' ? 'solution' : 'dps'); }
      if (act === 'map' || act === 'retreat') leaveFight();
      if (act === 'retry' && F) startFight(F.target, F.mode);
      if (act === 'pause' && F) F.paused = !F.paused;
      if (act === 'speed' && F) F.speed = F.speed > 1 ? 1 : 2;
      st.sideKey = '';
    });
    function heroTo(spot) { st.heroAnim = { from: toPx(RUN.spot), to: toPx(spot), t0: st.clock, dur: 0.5 }; RUN.spot = spot.slice(); }

    /* ---------- pointer and keys ---------- */
    const P = e => FPF.ptr(cv, e);
    cv.addEventListener('pointermove', e => {
      const { x, y } = P(e);
      if (st.view === 'map') { st.hover = mapPick(x, y); cv.style.cursor = st.hover ? 'pointer' : 'default'; }
      else { st.hoverSlot = SLOTS.findIndex((k, i) => { const r = slotRect(i); return x >= r.x && x <= r.x + r.s && y >= r.y && y <= r.y + r.s; }); if (st.hoverSlot < 0) st.hoverSlot = null; if (st.F?.drag) st.F.moveTo = { x, y }; }
    });
    cv.addEventListener('pointerdown', e => {
      const { x, y } = P(e);
      stopTour();
      if (st.view === 'map') { st.sel = mapPick(x, y); st.sideKey = ''; return; }
      const F = st.F; if (!F || F.mode !== 'play' || F.S.over) return;
      const si = SLOTS.findIndex((k, i) => { const r = slotRect(i); return x >= r.x && x <= r.x + r.s && y >= r.y && y <= r.y + r.s; });
      if (si >= 0) { F.queue.push(SLOTS[si]); return; }
      const f = SIM.live(F.S).filter(f => !f.stealth && !(f.joinT > 0)).find(f => Math.hypot(f.x - x, f.y - y) < f.r + 8);
      if (f) { F.pendingTarget = f.id; F.chase = true; F.moveTo = null; }
      else { F.moveTo = { x, y }; F.chase = false; F.drag = true; }
    });
    addEventListener('pointerup', () => { if (st.F) st.F.drag = false; });
    const GAME_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];
    s._kd = e => {
      if (!st.F || st.F.mode !== 'play' || st.view !== 'fight') return;
      if (e.target.closest?.('input, textarea, select')) return;
      const F = st.F;
      if (GAME_KEYS.includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); }
      if (e.code === 'Tab' && !F.S.over) {
        const L = SIM.live(F.S).filter(f => !f.stealth && !(f.joinT > 0)).sort((a, b) => SIM.dist(a, F.S.hero) - SIM.dist(b, F.S.hero));
        const i = L.findIndex(f => f.id === F.S.hero.tgt); if (L.length) F.pendingTarget = L[(i + 1) % L.length].id;
      }
      if (e.code === 'Space') { F.paused = !F.paused; st.sideKey = ''; }
      st.keys[e.code] = true;
      const m = /^Digit([1-6])$/.exec(e.code); if (m) { F.queue.push(+m[1]); e.preventDefault(); e.stopImmediatePropagation(); }
      if (e.code === 'KeyE') { F.queue.push('E'); e.preventDefault(); e.stopImmediatePropagation(); }
    };
    s._ku = e => { st.keys[e.code] = false; };

    /* ---------- guided tour (and the GIF) ---------- */
    // map: hover a pull, see its synergy and patrol; then watch the solution; then watch "just DPS"
    let tour = null;
    function stopTour() { if (tour) { tour = null; $(s, '.dv-tourbtn')?.classList.remove('on'); } }
    function startTour() {
      tour = { t: 0, step: -1 };
      st.sel = null; leaveFight();
    }
    const TOUR = [
      { at: 0, run: () => { st.sel = null; st.hover = null; } },
      { at: 1.2, run: () => { const p = D.PULLS.find(q => q.id === '1-E'); st.sel = { type: 'pull', p }; } },
      { at: 5, run: () => { const p = D.PULLS.find(q => q.id === '1-E'); startFight({ type: 'pull', p }, 'dps'); st.F.speed = 2; } },
      { at: 22, run: () => { const p = D.PULLS.find(q => q.id === '1-E'); startFight({ type: 'pull', p }, 'solution'); st.F.speed = 2; } },
      { at: 42, run: () => { leaveFight(); st.sel = null; } },
    ];
    function tourStep(dt) {
      if (!tour) return;
      tour.t += dt;
      while (tour.step + 1 < TOUR.length && tour.t >= TOUR[tour.step + 1].at) { tour.step++; TOUR[tour.step].run(); st.sideKey = ''; }
      if (tour.t > 44) startTour();
    }

    delveApi = {
      open(pullId, mode) {
        stopTour();
        const p = D.PULLS.find(q => q.id === pullId);
        const tg = p ? { type: 'pull', p } : { type: 'boss' };
        st.sel = tg; if (mode) startFight(tg, mode); else leaveFight();
      },
      tour() { startTour(); $(s, '.dv-tourbtn')?.classList.add('on'); },
      st,
    };
    side.addEventListener('click', e => { if (e.target.closest('[data-act=tour]')) delveApi.tour(); });

    return dt => {
      st.clock += dt;
      tourStep(dt);
      if (st.view === 'fight') tickFight(dt);
      g.clearRect(0, 0, CW, CH);
      if (st.view === 'map') drawMap(); else drawFight();
      renderSide();
    };
  }, {
    enter(s) { addEventListener('keydown', s._kd, true); addEventListener('keyup', s._ku, true); },
    leave(s) { removeEventListener('keydown', s._kd, true); removeEventListener('keyup', s._ku, true); },
  });

  /* ======================= slide 1: title ======================= */
  demo('dvtitle', {
    init(s) {
      $(s, '.dv-icons').innerHTML = ['fox', 'hawk', 'lynx', 'rabbit', 'frog', 'caller', 'healer', 'caster', 'fly', 'murloc', 'gnoll', 'construct']
        .map((k, i) => `<img src="img/${E[k].icon}.jpg" alt="${esc(E[k].name)}" title="${esc(E[k].name)}" style="border-color:${ringCol(k)};animation-delay:${i * 0.07}s">`).join('');
    },
  });

  /* ======================= slide 3: the roster ======================= */
  demo('roster', {
    init(s) {
      const keys = ['fox', 'hawk', 'lynx', 'rabbit', 'frog', 'caller', 'healer', 'caster', 'fly', 'murloc', 'slime', 'gnoll', 'construct'];
      const grid = $(s, '.ro-grid'), out = $(s, '.ro-detail');
      grid.innerHTML = keys.map(k => `<button class="ro-card" data-k="${k}"><img src="img/${E[k].icon}.jpg" alt="" style="border-color:${ringCol(k)}"><b>${esc(E[k].short || E[k].name)}</b><small>${esc(E[k].tier)}</small></button>`).join('')
        + Object.entries(D.FEATURES).map(([k, f]) => `<button class="ro-card feat" data-f="${k}"><img src="img/${f.icon}.jpg" alt=""><b>${esc(f.name)}</b><small>Delve feature</small></button>`).join('');
      const show = k => {
        $$(grid, '.ro-card').forEach(b => b.classList.toggle('on', b.dataset.k === k || b.dataset.f === k));
        if (D.FEATURES[k]) { const f = D.FEATURES[k]; say(out, `<h3><img src="img/${f.icon}.jpg" alt="">${esc(f.name)}</h3><p class="ro-tags"><span class="chip gold">${esc(f.type)}</span></p><p>${esc(f.text)}</p>`); return; }
        const e = E[k];
        const abs = e.ab.map(a => `<div class="ro-ab"><img src="img/${a.icon}.jpg" alt=""><div><b>${esc(a.name)}</b> <span class="chip">${esc(a.type)}</span>${a.type !== 'Passive' ? (a.int ? ' <span class="chip gold">Interruptible</span>' : ' <span class="chip red">Uninterruptible</span>') : ''}${a.disp ? ' <span class="chip green">Dispellable</span>' : ''}
          <p>${esc(a.text)}</p><p class="ro-teach">${esc(a.teach)} ${(a.skills || []).map(x => `<span class="chip">${SKILL[x]} is important</span>`).join(' ')}</p></div></div>`).join('');
        say(out, `<h3><img src="img/${e.icon}.jpg" alt="" style="border-color:${ringCol(k)}">${esc(e.name)}</h3><p class="ro-tags">${e.tags.map(t => `<span class="chip">${esc(t)}</span>`).join(' ')}</p>${e.flavor ? `<p class="ro-flavor">${esc(e.flavor)}</p>` : ''}${abs}
          <p class="ro-where">In pulls: ${D.PULLS.filter(p => p.m.includes(k)).map(p => p.id).join(', ') || (k === 'slime' ? 'the boss fight and every barrel' : k === 'construct' ? 'the boss room' : '—')}</p>`);
      };
      $$(grid, '.ro-card').forEach(b => b.onclick = () => show(b.dataset.k || b.dataset.f));
      show('frog');
    },
  });

  /* ======================= slide 5: every pull solved two ways ======================= */
  canvasDemo('compare', (s, cv, g) => {
    const st = { role: 'melee', rows: null, hover: -1 };
    const ROW = 25, TOP = 44, LX = 250, BW = 520;
    function compute() {
      const list = [...D.PULLS.map(p => ({ id: p.id, p, spec: { kinds: p.m }, plan: p.plan })), { id: 'Boss', spec: fightSpec({ type: 'boss' }, []), plan: D.BOSS.plan }];
      st.rows = list.map(r => ({ ...r, sol: botOutcome(r.id + '-cmp', r.spec, r.plan, 'solution', st.role), dps: botOutcome(r.id + '-cmp', r.spec, r.plan, 'dps', st.role) }));
      const w = st.rows.filter(r => r.dps.over !== 'win').length, avgS = st.rows.reduce((a, r) => a + r.sol.taken, 0) / st.rows.length, avgD = st.rows.reduce((a, r) => a + Math.min(1, r.dps.taken), 0) / st.rows.length;
      const cleared = st.rows.filter(r => r.sol.over === 'win').length, wiped = st.rows.filter(r => r.dps.over !== 'win').map(r => r.id);
      const close = st.rows.filter(r => r.dps.over === 'win' && r.dps.taken > 0.85).map(r => r.id);
      say($(s, '.cmp-out'), `As a ${SIM.KIT[st.role].name}, the board’s solutions clear ${cleared === st.rows.length ? 'all' : cleared + ' of'} ${st.rows.length} fights and take <b>${pct(avgS)}</b> of your health on average. “Just DPS them down” wipes on <b>${w}</b> (${wiped.join(', ') || 'none'})${close.length ? ` and barely survives ${close.length} more (${close.join(', ')})` : ''}. It takes ${pct(avgD)} on average. Click a row to watch both.`);
    }
    $$(s, '.cmp-role .btn').forEach(b => b.onclick = () => { st.role = b.dataset.r; $$(s, '.cmp-role .btn').forEach(x => x.classList.toggle('on', x === b)); compute(); });
    cv.addEventListener('pointermove', e => { const { y } = FPF.ptr(cv, e); st.hover = Math.floor((y - TOP) / ROW); cv.style.cursor = st.hover >= 0 && st.hover < (st.rows?.length || 0) ? 'pointer' : 'default'; });
    cv.addEventListener('pointerleave', () => st.hover = -1);
    cv.addEventListener('pointerdown', e => {
      const { y } = FPF.ptr(cv, e), i = Math.floor((y - TOP) / ROW), r = st.rows?.[i]; if (!r) return;
      RUN.role = st.role; save();
      const idx = [...document.querySelectorAll('.slide')].findIndex(x => x.dataset.demo === 'delve');
      FPF.go(idx); setTimeout(() => delveApi?.open(r.p ? r.p.id : 'boss', 'solution'), 50);
    });
    setTimeout(compute, 30);
    return () => {
      const W = cv.width, H = cv.height;
      g.clearRect(0, 0, W, H);
      if (!st.rows) { txt(g, 'Running 48 fights…', W / 2, H / 2, { size: 20, col: '#262c6a', stroke: false }); return; }
      txt(g, 'damage taken, as a share of your health (100% = dead)', LX + BW / 2, 14, { size: 14, col: '#5d618c', stroke: false });
      txt(g, 'board’s solution', LX + BW + 70, 14, { size: 13, col: '#1f7a45', stroke: false, w: 700 });
      txt(g, 'just DPS', LX + BW + 170, 14, { size: 13, col: '#a02a20', stroke: false, w: 700 });
      [0, 0.25, 0.5, 0.75, 1].forEach(k => { g.strokeStyle = k === 1 ? '#a02a20' : 'rgba(38,44,106,.15)'; g.lineWidth = k === 1 ? 2 : 1; g.beginPath(); g.moveTo(LX + BW * k, TOP - 6); g.lineTo(LX + BW * k, TOP + st.rows.length * ROW); g.stroke(); txt(g, pct(k), LX + BW * k, TOP - 14, { size: 11, col: '#5d618c', stroke: false }); });
      st.rows.forEach((r, i) => {
        const y = TOP + i * ROW;
        if (i === st.hover) { g.fillStyle = 'rgba(255,185,81,.25)'; g.fillRect(0, y, W, ROW); }
        const ic = r.p ? E[r.p.m[0]].icon : E.construct.icon;
        sq(g, ic, 6, y + 2, ROW - 4, { lw: 1 });
        txt(g, r.id, 34, y + ROW / 2, { size: 14, w: 700, col: '#262c6a', stroke: false, align: 'left' });
        const names = r.p ? [...new Set(r.p.m)].map(k => E[k].short || E[k].name.replace(/^(Void Corrupted|Void-infested|Corrupted|Shadow-Infused|Mur’gul|Makrura|Baby) /, '')).join(', ') : 'Construct + slimes';
        txt(g, names.length > 30 ? names.slice(0, 29) + '…' : names, 72, y + ROW / 2, { size: 12, col: '#5d618c', stroke: false, align: 'left' });
        const b = (o, dy, col) => { const k = Math.min(1.08, o.taken); g.fillStyle = col; g.fillRect(LX, y + dy, BW * k, 8); };
        b(r.sol, 4, '#2fae63'); b(r.dps, 13, r.dps.over === 'win' ? '#e0a92d' : '#e5322d');
        txt(g, r.sol.over === 'win' ? pct(r.sol.taken) : 'wipe', LX + BW + 70, y + ROW / 2, { size: 13, w: 700, col: '#1f7a45', stroke: false });
        txt(g, r.dps.over === 'win' ? pct(r.dps.taken) : 'wipe', LX + BW + 170, y + ROW / 2, { size: 13, w: 700, col: r.dps.over === 'win' ? '#9a5a06' : '#c0201a', stroke: false });
      });
    };
  });
})();
