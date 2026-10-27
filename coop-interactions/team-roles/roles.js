/* Cross-class structure (MGM C3 M6, deck slides 246-255): three scenes of one idea, each class holds part of the toolkit.
   Slide 2 is slide 248, the football play with fantasy classes (fighters hold the line, the wizard throws, a rogue runs).
   Slide 3 is slide 249, the holy trinity as an HP tug-of-war (tank square, healer circle, DPS triangle, skull boss).
   Slide 4 is slides 250-253, League of Legends laning into a teamfight, with slide 251's class shapes and slide 253's comps.
   Art: slide 248's champions (Sett, Ryze, Akali) as the fighter, wizard and rogue, and League's class and position icons
   (img/, from Data Dragon and CommunityDragon) inside the slides' shapes, tinted to each shape's team colour.
   Every scene is a pure function of (t, variant): draw(g, t, v) and words(t, v), so the sandboxes, the tours, the title loop
   and window.__seek(t, which) for the GIFs all draw the same thing. A variant is the set of roles (or the comp) in play. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease, TAU } = TD;
  const W = 1040, H = 585;
  const f1 = x => x.toFixed(1);

  /* ---------- shared drawing: the slides' shapes, skulls and the three fantasy classes ---------- */
  const IMG = {};
  ['champ-sett', 'champ-ryze', 'champ-akali', 'class-tank', 'class-fighter', 'class-assassin', 'class-support', 'class-marksman', 'class-mage', 'pos-top', 'pos-jungle', 'pos-middle', 'pos-bottom', 'pos-utility']
    .forEach(n => { const im = new Image(); im.src = `img/${n}.png`; IMG[n] = im; });
  const ready = im => im && im.complete && im.naturalWidth > 0;
  const tints = {};
  // an icon recoloured to one flat colour (source-in), cached per colour; nothing reads pixels back, so file:// works too
  function tinted(n, col) {
    const k = n + col; if (tints[k]) return tints[k];
    const im = IMG[n]; if (!ready(im)) return null;
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    return (tints[k] = c);
  }
  function icon(g, n, col, x, y, size) {
    const c = tinted(n, col); if (!c) return;
    const k = size / Math.max(c.width, c.height); g.drawImage(c, x - c.width * k / 2, y - c.height * k / 2, c.width * k, c.height * k);
  }
  // the League class icon for each class or role in the three scenes
  const ICON = { tank: 'class-tank', bruiser: 'class-fighter', assassin: 'class-assassin', enchanter: 'class-support', marksman: 'class-marksman', caster: 'class-mage', healer: 'class-support', dps: 'class-marksman' };
  const TEAM = { blue: ['#cfdcfb', '#1f5fd6'], red: ['#f8d2d0', '#a8201c'], green: ['#d9f0d9', '#2e7d32'] };
  function shape(g, kind, x, y, r, team, o = {}) {
    const [fill, stroke] = TEAM[team];
    g.save(); g.globalAlpha *= o.a ?? 1;
    T.shadow(x + 4, y + r * .8, r * .85, r * .35, .18);
    g.translate(x, y); g.beginPath();
    const poly = (n, a0, rr) => { for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n, q = rr(i); g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); };
    if (kind === 'square') g.rect(-r * .85, -r * .85, r * 1.7, r * 1.7);
    else if (kind === 'circle') g.arc(0, 0, r * .92, 0, TAU);
    else if (kind === 'triangle') poly(3, o.ang ?? -Math.PI / 2, () => r * 1.1);
    else if (kind === 'pentagon') poly(5, -Math.PI / 2, () => r);
    else if (kind === 'diamond') { g.moveTo(0, -r * 1.15); g.lineTo(r * .58, 0); g.lineTo(0, r * 1.15); g.lineTo(-r * .58, 0); g.closePath(); }
    else if (kind === 'star') poly(12, -Math.PI / 2, i => i % 2 ? r * .6 : r * 1.08);
    g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = o.lw ?? 3.5; g.lineJoin = 'round'; g.stroke();
    if (o.icon) icon(g, o.icon, stroke, 0, kind === 'triangle' ? r * .18 : 0, r * (kind === 'triangle' ? .85 : kind === 'diamond' ? .7 : 1.05));
    if (o.ko) { g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(-r * .6, -r * .6); g.lineTo(r * .6, r * .6); g.moveTo(r * .6, -r * .6); g.lineTo(-r * .6, r * .6); g.stroke(); }
    g.restore();
  }
  function skull(g, x, y, s = 1, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    T.shadow(x + 3 * s, y + 17 * s, 14 * s, 5 * s, .2);
    g.translate(x, y); g.scale(s, s);
    const ink = '#3b3652';
    g.fillStyle = o.col || '#f4efe4'; g.strokeStyle = ink; g.lineWidth = 2.2 / Math.sqrt(s);
    g.beginPath(); g.roundRect(-9, 3, 18, 13, 4); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -4, 15, 0, TAU); g.fill(); g.stroke();
    g.fillRect(-7.8, 2, 15.6, 6);
    g.fillStyle = ink;
    g.beginPath(); g.ellipse(-6, -3, 4.4, 5, 0, 0, TAU); g.ellipse(6, -3, 4.4, 5, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(0, 2); g.lineTo(2.2, 6); g.lineTo(-2.2, 6); g.closePath(); g.fill();
    g.lineWidth = 1.6; g.beginPath(); [-4, 0, 4].forEach(tx => { g.moveTo(tx, 10); g.lineTo(tx, 16); }); g.stroke();
    g.restore();
  }
  const CLS = { fighter: '#c4622d', wizard: '#7b4fd6', rogue: '#2a9d7a' };
  const CHAMP = { fighter: 'champ-sett', wizard: 'champ-ryze', rogue: 'champ-akali' };
  function dagger(g, s = 1) {
    g.beginPath(); g.moveTo(0, -13 * s); g.lineTo(3 * s, -3 * s); g.lineTo(3 * s, 4 * s); g.lineTo(-3 * s, 4 * s); g.lineTo(-3 * s, -3 * s); g.closePath(); g.fill();
    g.fillRect(-6 * s, 4 * s, 12 * s, 2.5 * s); g.fillRect(-1.5 * s, 6.5 * s, 3 * s, 6 * s);
  }
  function hero(g, cls, x, y, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    T.shadow(x + 3, y + 5, 19, 14, .25);
    g.translate(x, y);
    const im = IMG[CHAMP[cls]];
    if (ready(im)) {
      // the champion portrait from slide 248, ringed in its class colour
      g.save(); g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.clip(); g.drawImage(im, -23, -23, 46, 46); g.restore();
      g.strokeStyle = CLS[cls]; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.stroke();
      g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 22.5, 0, TAU); g.stroke();
      g.restore(); return;
    }
    g.fillStyle = CLS[cls]; g.strokeStyle = '#fff'; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 20.5, 0, TAU); g.stroke();
    g.fillStyle = '#fff';
    if (cls === 'fighter') {
      g.beginPath(); g.moveTo(0, -13); g.lineTo(3, -8); g.lineTo(3, 4); g.lineTo(-3, 4); g.lineTo(-3, -8); g.closePath(); g.fill();
      g.fillRect(-8, 4, 16, 3); g.fillRect(-1.5, 7, 3, 6);
    } else if (cls === 'wizard') {
      g.beginPath(); g.moveTo(3, -14); g.lineTo(8, 5); g.lineTo(-8, 5); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(0, 6, 13, 3.5, 0, 0, TAU); g.fill();
      g.fillStyle = C.gold; g.beginPath(); g.arc(1, -2, 2.4, 0, TAU); g.fill();
    } else { g.rotate(.6); dagger(g); }
    g.restore();
  }
  function heart(g, x, y, s = 1, a = 1) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#e0413a'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-14, -1, -8, -13, 0, -5); g.bezierCurveTo(8, -13, 14, -1, 0, 8); g.fill(); g.stroke();
    g.restore();
  }
  function arrow(g, pts, col, a = 1, w = 3, dash = [10, 8]) {
    if (a <= 0 || pts.length < 2) return;
    g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash);
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.setLineDash([]);
    const [x1, y1] = pts.at(-1), [x0, y0] = pts.at(-2), an = Math.atan2(y1 - y0, x1 - x0);
    g.beginPath(); g.moveTo(x1 + Math.cos(an) * 6, y1 + Math.sin(an) * 6); g.lineTo(x1 + Math.cos(an + 2.6) * 15, y1 + Math.sin(an + 2.6) * 15); g.lineTo(x1 + Math.cos(an - 2.6) * 15, y1 + Math.sin(an - 2.6) * 15); g.closePath(); g.fill();
    g.restore();
  }
  function bar(g, x, y, w, k, col, a = 1) {
    g.save(); g.globalAlpha *= a;
    g.fillStyle = 'rgba(21,32,68,.75)'; g.fillRect(x - w / 2 - 2, y - 5, w + 4, 10);
    g.fillStyle = '#4a3f3a'; g.fillRect(x - w / 2, y - 3, w, 6);
    g.fillStyle = col; g.fillRect(x - w / 2, y - 3, w * clamp(k), 6);
    g.restore();
  }
  function orb(g, x, y, t, a = 1) {
    g.save(); g.globalAlpha *= a;
    const gr = g.createRadialGradient(x, y, 0, x, y, 18); gr.addColorStop(0, 'rgba(255,240,190,.95)'); gr.addColorStop(1, 'rgba(255,185,81,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 18 + 2 * Math.sin(t * 8), 0, TAU); g.fill();
    g.fillStyle = C.gold; g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  const pt = p => [p.x, p.y];
  // the first time in [0, end] that fn(t) is true, sampled at 20 Hz
  const first = (fn, end) => { for (let t = 0; t <= end; t += .05) if (fn(t)) return t; return null; };

  /* ---------- the sandbox: one scene, its variant controls, a tour, and a seek hook for the GIF ---------- */
  const SEEK = {};
  function stage(s, cv, g, key, S, ui) {
    const st = { t: 0, tt: 0, tour: false, slow: false, held: false, last: '', list: S.tour };
    const verdict = $(s, '.rl-verdict'), bt = $(s, '.rl-tour'), bs = $(s, '.rl-slow');
    const total = list => list.reduce((a, v) => a + S.dur(v), 0);
    function at(tt, list) {
      let x = ((tt % total(list)) + total(list)) % total(list);
      for (let i = 0; i < list.length; i++) { const d = S.dur(list[i]); if (x < d) return { v: list[i], t: x, i }; x -= d; }
      return { v: list[0], t: 0, i: 0 };
    }
    function render() {
      let v, t, cap = '';
      if (st.tour) { const a = at(st.tt, st.list); v = a.v; t = a.t; ui.sync(v); cap = st.list.length > 1 ? `${a.i + 1} / ${st.list.length}  ${S.name(v)}` : S.name(v); }
      else { v = ui.cur(); t = st.t; }
      g.clearRect(0, 0, cv.width, cv.height);
      g.save(); g.scale(cv.width / W, cv.height / H); T.use(g);
      S.draw(g, t, v);
      if (cap) T.label(cap, W - 18, 30, 'right', '#fff', 16, 'rgba(21,32,68,.9)');
      g.restore();
      S.hud?.(s, t, v);
      const html = S.words(t, v);
      if (html !== st.last) { st.last = html; say(verdict, html); }
      bt.classList.toggle('on', st.tour); bs.classList.toggle('on', st.slow);
    }
    const api = {
      restart(t = 0) { st.tour = false; st.t = t; },
      tour() { st.tour = !st.tour; st.list = S.tour; st.tt = 0; st.t = 0; },
      tick(dt) {
        if (!st.held) {
          const d = clamp(dt, 0, .1) * (st.slow ? .4 : 1);
          st.tt += d; st.t += d;
          if (!st.tour && st.t >= S.dur(ui.cur())) st.t = 0;
        }
        render();
      },
      get touring() { return st.tour; },
    };
    $(s, '.rl-run').onclick = () => api.restart();
    bs.onclick = () => { st.slow = !st.slow; };
    bt.onclick = () => api.tour();
    SEEK[key] = { seek(t) { st.held = st.tour = true; st.list = S.gif; st.tt = t; render(); }, dur: () => total(S.gif) };
    return api;
  }
  // role toggle buttons: [data-role] in .role buttons, one letter each, never all off
  function roleUi(s, letters, onChange) {
    const btns = $$(s, '.role');
    btns.forEach(b => b.onclick = () => {
      const on = btns.filter(x => x.classList.contains('on'));
      if (on.length === 1 && on[0] === b) return;
      b.classList.toggle('on'); onChange();
    });
    return {
      cur: () => btns.map((b, i) => b.classList.contains('on') ? letters[i] : '').join(''),
      sync: v => btns.forEach((b, i) => b.classList.toggle('on', v.includes(letters[i]))),
    };
  }

  /* ======================================================================
     Scene 1 (slide 248): the football play, with fighters, a wizard and rogues against seven skulls.
     Variant: letters for who is on the team, f fighters, w wizard, r rogues.
     ====================================================================== */
  const LOS = 420, GOAL = 900, YD = 8, FY = [190, 250, 310, 370, 430], FX = 400, WZ = [300, 310], SNAP = .8, FB_DUR = 9;
  const FB_NAMES = { fwr: 'The whole team', wr: 'No fighters', fr: 'No wizard', fw: 'No rogues' };
  const fbMemo = {};
  function fbPlan(v) {
    if (fbMemo[v]) return fbMemo[v];
    const P = { f: v.includes('f'), w: v.includes('w'), r: v.includes('r') };
    const fighters = P.f ? FY.map(y => T.Path([FX, y], 100)) : [];
    const wiz = P.w ? T.Path(WZ, 40) : null;
    const rogues = P.r ? [T.Path([380, 100], 140), T.Path([380, 520], 140)] : [];
    const rush = FY.map(y => T.Path([452, y], 120));
    const deep = [T.Path([660, 130], 110), T.Path([660, 480], 110)];
    const R = { P, fighters, wiz, rogues, rush, deep, routes: [], marks: [] };
    if (P.r) {
      R.routes = [[[380, 100], [600, 100], [760, 190], [840, 170]], [[380, 520], [660, 520], [800, 430]]];
      rogues[0].wait(SNAP).go(600, 100).go(760, 190).go(840, 170, 110).wait(FB_DUR);
      rogues[1].wait(SNAP).go(660, 520).go(800, 430);
    }
    const hold = (p, y, a, b) => p.wait(SNAP).go(a, y, 120).go(b, y, 7);
    if (P.f && P.w && P.r) {
      // the play works: the wall holds, the wizard throws to the open rogue, who runs it in
      fighters.forEach((p, i) => hold(p, FY[i], 412, 392).wait(FB_DUR));
      rush.forEach((p, i) => hold(p, FY[i], 452, 432).wait(FB_DUR));
      wiz.wait(SNAP).go(285, 310).wait(FB_DUR);
      const catchAt = rogues[1].t;
      rogues[1].go(965, 380, 160).wait(FB_DUR);
      deep[0].wait(SNAP).go(700, 150).go(800, 215, 90).wait(FB_DUR);
      deep[1].wait(SNAP).go(700, 470, 100).go(770, 455, 70).go(930, 410, 150).wait(FB_DUR);
      const thr = catchAt - .85, a = pt(wiz.at(thr)), b = pt(rogues[1].at(catchAt));
      R.ball = t => t < thr ? pt(wiz.at(t)).concat(0) : t < catchAt ? (k => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.sin(k * Math.PI) * 60])((t - thr) / (catchAt - thr)) : pt(rogues[1].at(t)).concat(0);
      R.thr = thr; R.catchAt = catchAt;
      R.end = first(t => R.ball(t)[0] >= GOAL, FB_DUR); R.result = 'td';
    } else if (!P.f) {
      // nothing in front of the ball carrier: the rush gets there first
      if (P.w) { wiz.wait(FB_DUR); rogues[1]?.wait(FB_DUR); }
      // no wizard either: the second rogue holds the relic instead of running a route
      else { rogues[1] = T.Path([380, 520], 140).wait(FB_DUR); R.routes = R.routes.slice(0, 1); }
      const carrier = P.w ? wiz : rogues[1];
      R.carrier = P.w ? 'wizard' : 'rogue';
      const SACK = 2.2, c = pt(carrier.at(SACK));
      rush.forEach((p, i) => { const an = (i - 2) * .62, q = [c[0] + Math.cos(an) * 40, c[1] + Math.sin(an) * 40]; p.wait(SNAP).go(q[0], q[1], Math.hypot(q[0] - 452, q[1] - FY[i]) / (SACK - SNAP)).wait(FB_DUR); });
      deep[0].wait(SNAP).go(700, 150).go(780, 200, 90).wait(FB_DUR);
      deep[1].wait(SNAP).go(640, 470, 100).wait(FB_DUR);
      R.ball = t => pt(carrier.at(t)).concat(0);
      R.end = SACK; R.result = 'sack';
    } else if (!P.w) {
      // a fighter carries the relic into the pile: brute force moves the line slowly
      fighters.forEach((p, i) => i === 2 ? p.wait(SNAP).go(410, 310, 70).go(436, 310, 12).wait(FB_DUR) : hold(p, FY[i], 412, 392).wait(FB_DUR));
      rush.forEach((p, i) => i === 2 ? p.wait(SNAP).go(444, 310, 120).go(470, 310, 12).wait(FB_DUR) : hold(p, FY[i], 452, 432).wait(FB_DUR));
      if (P.r) rogues[1].go(830, 400, 90).wait(FB_DUR);
      deep[0].wait(SNAP).go(700, 150).go(800, 215, 90).wait(FB_DUR);
      deep[1].wait(SNAP).go(700, 470, 100).go(800, 450, 70).wait(FB_DUR);
      R.ball = t => pt(fighters[2].at(t)).map((q, i) => i ? q : q + 10).concat(0);
      R.end = fighters[2].t - FB_DUR; R.result = 'stuffed';
    } else {
      // fighters hold and the wizard has the relic, but nobody runs a route: the line breaks first
      const BREAK = 4.2;
      fighters.forEach((p, i) => { hold(p, FY[i], 412, 392); if (i === 2) p.wait(BREAK - p.t).go(392, 368, 90); p.wait(FB_DUR); });
      rush.forEach((p, i) => { hold(p, FY[i], 452, 432); if (i === 2) p.wait(BREAK - p.t).go(312, 306, 170); p.wait(FB_DUR); });
      wiz.wait(SNAP).go(285, 310).wait(FB_DUR);
      deep[0].wait(SNAP).go(560, 210, 60).wait(FB_DUR);
      deep[1].wait(SNAP).go(560, 410, 60).wait(FB_DUR);
      R.ball = t => pt(wiz.at(t)).concat(0);
      R.end = rush[2].t - FB_DUR; R.result = 'sack'; R.carrier = 'wizard'; R.stuck = true;
    }
    // yards from the line of scrimmage; dropping back only costs yards if the carrier is sacked there
    R.yards = t => { const y = Math.round((R.ball(Math.min(t, R.end ?? t))[0] - LOS) / YD); return R.result === 'sack' && t >= R.end ? y : Math.max(0, y); };
    return (fbMemo[v] = R);
  }
  function fbField(g) {
    g.fillStyle = '#cfdcb5'; g.fillRect(0, 0, W, H);
    for (let x = 100, i = 0; x < 900; x += 80, i++) if (i % 2) { g.fillStyle = '#c6d4aa'; g.fillRect(x, 0, 80, H); }
    g.fillStyle = 'rgba(255,185,81,.38)'; g.fillRect(GOAL, 0, W - GOAL, H);
    g.fillStyle = 'rgba(85,98,235,.12)'; g.fillRect(0, 0, 100, H);
    g.save(); g.translate(975, H / 2); g.rotate(Math.PI / 2); g.font = '800 34px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(154,90,6,.55)'; g.fillText('End zone', 0, 0); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3;
    for (let x = 100; x <= GOAL; x += 80) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, H - 22); g.stroke(); }
    g.lineWidth = 4; g.strokeRect(4, 22, W - 8, H - 44);
    g.font = '800 24px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.9)';
    for (let x = 180; x < GOAL; x += 80) { const n = 50 - Math.abs(x - 500) / YD; g.fillText(n, x, 72); g.fillText(n, x, H - 72); }
    g.strokeStyle = C.blue; g.lineWidth = 4; g.beginPath(); g.moveTo(LOS, 22); g.lineTo(LOS, H - 22); g.stroke();
    g.strokeStyle = C.gold; g.beginPath(); g.moveTo(LOS + 80, 22); g.lineTo(LOS + 80, H - 22); g.stroke();
  }
  const FB = {
    tour: ['fwr', 'wr', 'fw', 'fr'], gif: ['fwr', 'wr'],
    name: v => FB_NAMES[v] || 'Custom team',
    dur: () => FB_DUR,
    draw(g, t, v) {
      const R = fbPlan(v), P = R.P;
      fbField(g);
      R.routes.forEach(r => arrow(g, r, 'rgba(21,32,68,.4)', 1, 3));
      const done = R.end != null && t >= R.end;
      // skulls, then the team
      R.deep.forEach(p => skull(g, ...pt(p.at(t)), 1.25));
      R.rush.forEach(p => skull(g, ...pt(p.at(t)), 1.25));
      R.fighters.forEach(p => hero(g, 'fighter', ...pt(p.at(t))));
      R.rogues.forEach(p => hero(g, 'rogue', ...pt(p.at(t))));
      if (R.wiz) hero(g, 'wizard', ...pt(R.wiz.at(t)));
      // the relic (the ball)
      const [bx, by, bh] = R.ball(t);
      if (bh > 0) T.shadow(bx, by + 8, 8, 4, .25);
      orb(g, bx + 14, by - 14 - bh, t);
      // contact sparks along the line while it holds
      if (P.f && t > SNAP + .1 && !done) R.fighters.forEach((p, i) => { const q = p.at(t), k = (t * 3 + i * .37) % 1; if (k < .25) T.flash(q.x + 17, q.y, 16, 1 - k * 4); });
      // labels
      const lab = (txt, x, y, col = C.ink) => T.label(txt, x, y, 'center', col, 14);
      if (t < 3) {
        if (R.wiz) lab('Wizard', ...pt(R.wiz.at(t)).map((q, i) => i ? q + 34 : q));
        if (P.f) lab('Fighters', FX - 4, 150);
        R.rogues.forEach(p => lab('Rogue', ...pt(p.at(t)).map((q, i) => i ? q + 34 : q)));
      }
      if (t < SNAP) T.popText('Set…', LOS, 300 - 140, C.navy, 1);
      else if (t < SNAP + .6) T.popText('Hike!', LOS, 160, C.navy, 1 - (t - SNAP) / .6);
      if (R.stuck && t > 2.6 && t < R.end) lab('No one to throw to', WZ[0] - 15, WZ[1] - 46, C.redDk);
      if (P.r && !P.w && t > 3 && t < FB_DUR) { const q = R.rogues[1].at(t); lab('Open, but nobody can throw', q.x - 60, q.y + 36, C.redDk); }
      if (R.result === 'sack' && R.carrier === 'wizard' && t > 1.4 && t < (R.end + 2)) lab('Everyone wants to kill the wizard first', WZ[0], 402, C.redDk);
      // HUD and result
      const yd = R.yards(t);
      T.label(`Distance: ${yd > 0 ? '+' : ''}${yd} yards`, 18, 30, 'left', C.navy, 17);
      if (done) {
        const a = clamp((t - R.end) / .25);
        if (R.result === 'td') T.stamp('Touchdown!', 520, 290, C.good, a, 44);
        else if (R.result === 'sack') { T.stamp('Sacked!', 520, 290, C.red, a, 44); }
        else T.stamp(`Stopped: +${yd} yards`, 520, 290, C.ink, a, 38);
      }
    },
    words(t, v) {
      const R = fbPlan(v), P = R.P;
      if (t < SNAP) return `<b>${this.name(v)}.</b> Seven skulls on defence. Success is distance travelled, and the end zone is the victory threshold.`;
      if (R.result === 'td') {
        if (t < R.thr) return '<b>Fighters</b> hold the line while the <b>rogues</b> sneak out on their routes. The <b>wizard</b> waits for one to get open.';
        if (t < R.catchAt) return 'The <b>wizard</b> throws the relic to the open <b>rogue</b>.';
        if (t < R.end) return 'Caught. The <b>rogue</b> outruns the last skull.';
        return '<b class="good">Touchdown.</b> No class could have done it alone: each one held a different part of the play.';
      }
      if (R.result === 'stuffed') {
        if (t < R.end) return '<b>No wizard:</b> a fighter has to carry the relic, straight into the pile.';
        return `<b class="bad">Stopped after ${R.yards(t)} yards.</b> ${P.r ? 'The rogues got open, but nobody could throw to them.' : 'Brute force alone moves the line slowly.'}`;
      }
      if (R.stuck) {
        if (t < R.end) return '<b>No rogues:</b> the fighters hold, but nobody runs a route. The wizard has no one to throw to, and the wall cannot hold forever.';
        return `<b class="bad">Sacked, ${R.yards(t)} yards.</b> The wizard held the relic until the line broke.`;
      }
      if (t < R.end) return `<b>No fighters:</b> nothing stands between seven skulls and the ${R.carrier}.`;
      return `<b class="bad">Sacked, ${R.yards(t)} yards.</b> ${R.carrier === 'wizard' ? 'The quarterback is the wizard everyone wants to kill first, and nobody protected the wizard.' : 'Nobody blocked, and nobody could throw.'}`;
    },
  };

  /* ======================================================================
     Scene 2 (slide 249): the holy trinity. The boss hits the first role it can reach (tank, then DPS, then healer),
     the healer refills the lowest ally, everyone chips the boss. Fixed numbers, so the run is deterministic.
     Variant: letters for who is in the party, t tank, h healer, d DPS.
     ====================================================================== */
  const TR = { boss: 800, max: { tank: 500, healer: 200, dps: 180 }, dmg: { tank: 10, healer: 6, dps: 60 }, heal: 55, self: 5, first: 1.2, swing: 1.5, hit: 120, enrage: 15, dt: .05 };
  const ROLES = ['tank', 'dps', 'healer'];
  const TR_NAMES = { thd: 'The whole party', hd: 'No tank', td: 'No healer', th: 'No DPS' };
  const TR_POS = { boss: [520, 100], tank: [520, 258], dps: [700, 335], healer: [340, 335] };
  const TR_SHAPE = { tank: ['square', 'blue'], healer: ['circle', 'green'], dps: ['triangle', 'red'] };
  const trMemo = {};
  function trSim(v) {
    if (trMemo[v]) return trMemo[v];
    const P = { tank: v.includes('t'), healer: v.includes('h'), dps: v.includes('d') };
    const hp = {}, dead = {}, ev = [], F = [];
    ROLES.forEach(k => hp[k] = P[k] ? TR.max[k] : 0);
    let boss = TR.boss, end = null, res = null, next = TR.first;
    const alive = k => P[k] && !(k in dead);
    for (let i = 0; i < 1200; i++) {
      const t = i * TR.dt;
      let heal = null;
      if (end == null) {
        if (t >= next) {
          const tgt = ROLES.find(alive);
          if (tgt) { const d = t >= TR.enrage ? TR.hit * 2 : TR.hit; hp[tgt] -= d; ev.push({ t, kind: 'hit', tgt, d }); }
          next += TR.swing;
        }
        if (alive('healer')) {
          heal = ROLES.filter(k => alive(k) && hp[k] < TR.max[k]).sort((a, b) => hp[a] / TR.max[a] - hp[b] / TR.max[b])[0] || null;
          if (heal) hp[heal] = Math.min(TR.max[heal], hp[heal] + TR.heal * TR.dt);
        }
        if (alive('tank')) hp.tank = Math.min(TR.max.tank, hp.tank + TR.self * TR.dt);
        boss -= TR.dt * ROLES.reduce((a, k) => a + (alive(k) ? TR.dmg[k] : 0), 0);
        ROLES.forEach(k => { if (alive(k) && hp[k] <= 0) { hp[k] = 0; dead[k] = t; ev.push({ t, kind: 'die', tgt: k }); } });
        if (boss <= 0) { boss = 0; end = t; res = 'win'; } else if (!ROLES.some(alive)) { end = t; res = 'wipe'; }
      }
      F.push({ hp: { ...hp }, boss, heal });
      if (end != null && t >= end + 3) break;
    }
    const firstDeath = Math.min(...Object.values(dead), Infinity);
    return (trMemo[v] = { P, F, ev, end, res, dead, firstDeath, dur: F.length * TR.dt });
  }
  const TRI = {
    tour: ['thd', 'hd', 'td', 'th'], gif: ['thd', 'td'],
    name: v => TR_NAMES[v] || 'Custom party',
    dur: v => trSim(v).dur,
    draw(g, t, v) {
      const S = trSim(v), P = S.P, f = S.F[clamp(Math.floor(t / TR.dt), 0, S.F.length - 1)];
      const over = S.end != null && t >= S.end, enraged = t >= TR.enrage && !(over && S.res === 'win');
      T.floor(0, 0, W, H); T.wall(0, 0, W, 24);
      const B = TR_POS.boss, isAlive = k => P[k] && !(S.dead[k] <= t);
      // the slide's arrows: boss onto its target, heals onto the tank, daggers up into the boss
      const tgt = ROLES.find(isAlive);
      if (!over && tgt) arrow(g, [[B[0] - 34, B[1] + 34], [TR_POS[tgt][0] - 30, TR_POS[tgt][1] - 34]], 'rgba(168,32,28,.45)', 1, 3);
      if (!over && f.heal && isAlive('healer') && f.heal !== 'healer') arrow(g, [[TR_POS.healer[0] + 10, TR_POS.healer[1] - 34], [TR_POS[f.heal][0] - 40, TR_POS[f.heal][1] + 10]], 'rgba(46,125,50,.5)', 1, 3);
      if (!over && isAlive('dps')) arrow(g, [[TR_POS.dps[0] - 10, TR_POS.dps[1] - 40], [B[0] + 46, B[1] + 20]], 'rgba(31,95,214,.4)', 1, 3);
      // projectiles: hearts from the healer, daggers from the DPS, sword taps from the tank
      if (!over && f.heal && isAlive('healer') && f.heal !== 'healer') for (let j = 0; j < 2; j++) { const k = (t * 1.1 + j / 2) % 1, a = TR_POS.healer, b = TR_POS[f.heal]; heart(g, lerp(a[0], b[0], k), lerp(a[1], b[1], k) - 20, 1.1, Math.min(1, (1 - k) * 4)); }
      if (!over && isAlive('dps') && S.F[0]) for (let j = 0; j < 3; j++) {
        const k = (t * 1.6 + j / 3) % 1, a = TR_POS.dps, x = lerp(a[0], B[0] + 20, k), y = lerp(a[1] - 20, B[1] + 10, k);
        g.save(); g.translate(x, y); g.rotate(Math.atan2(B[1] - a[1], B[0] - a[0]) + Math.PI / 2); g.fillStyle = C.navy; g.globalAlpha = Math.min(1, (1 - k) * 4); dagger(g, .9); g.restore();
      }
      if (!over && isAlive('tank') && (t % 1.2) < .2) T.flash(B[0], B[1] + 40, 22, 1 - (t % 1.2) / .2);
      // the boss
      skull(g, B[0], B[1], 3, { col: enraged ? '#f6b7b0' : undefined, a: over && S.res === 'win' ? Math.max(.25, 1 - (t - S.end)) : 1 });
      bar(g, B[0], B[1] - 66, 200, f.boss / TR.boss, C.red);
      T.label(`Boss ${Math.ceil(f.boss)}`, B[0] + 112, B[1] - 66, 'left', C.redDk, 14);
      if (enraged && !over) T.label('Enrage!', B[0] - 112, B[1] - 66, 'right', '#fff', 15, C.red);
      // the party
      ROLES.forEach(k => {
        const [x, y] = TR_POS[k], [kind, team] = TR_SHAPE[k];
        if (!P[k]) { g.save(); g.setLineDash([6, 6]); g.strokeStyle = 'rgba(93,97,140,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 34, 0, TAU); g.stroke(); g.restore(); T.label(`No ${k === 'dps' ? 'DPS' : k}`, x, y + 56, 'center', C.muted, 14); return; }
        const d = S.dead[k], gone = d != null && t >= d;
        shape(g, kind, x, y, 34, team, { a: gone ? .35 : 1, ko: gone, icon: ICON[k] });
        if (gone) T.poof(x, y, t - d, 40);
        else bar(g, x, y - 52, 84, f.hp[k] / TR.max[k], team === 'green' ? '#2fae63' : team === 'red' ? '#e5322d' : '#3c7be6');
        T.label(k === 'dps' ? 'DPS' : k[0].toUpperCase() + k.slice(1), x, y + 56, 'center', C.ink, 15);
        // incoming hits
        const h = S.ev.find(e => e.kind === 'hit' && e.tgt === k && t >= e.t && t < e.t + .6);
        if (h) { T.flash(x, y, 46, 1 - (t - h.t) / .3); T.popText(`−${h.d}`, x + 46, y - 30, C.red, 1 - (t - h.t) / .6); }
      });
      // the HP tug-of-war: the knot moves toward whichever side is winning
      const pMax = ROLES.reduce((a, k) => a + (P[k] ? TR.max[k] : 0), 0), pHp = ROLES.reduce((a, k) => a + (P[k] ? f.hp[k] : 0), 0);
      const knot = 520 - 300 * (pHp / pMax - f.boss / TR.boss), ry = 500;
      g.strokeStyle = '#8a6a3a'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(190, ry); g.lineTo(850, ry); g.stroke();
      g.strokeStyle = '#c9a66b'; g.lineWidth = 3; g.setLineDash([6, 6]); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.navy; g.fillRect(518, ry - 22, 4, 44);
      g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(knot, ry, 13, 0, TAU); g.fill(); g.stroke();
      T.label('Party HP', 150, ry, 'right', '#1f5fd6', 16); T.label('Boss HP', 890, ry, 'left', C.redDk, 16);
      T.label('One-dimensional tug-of-war', 520, ry + 40, 'center', C.muted, 14);
      if (over) { const a = clamp((t - S.end) / .25); S.res === 'win' ? T.stamp('Boss down', 520, 300, C.good, a, 44) : T.stamp('Wipe', 520, 300, C.red, a, 44); }
      T.label(`${f1(Math.min(t, S.end ?? t))} s`, 18, 50, 'left', C.navy, 16);
    },
    hud(s, t, v) {
      const S = trSim(v), P = S.P, on = {};
      const lit = t >= S.firstDeath || (!P.dps && t >= TR.enrage);
      if (lit) {
        if (!P.tank) on.dps0 = on.healer0 = 1;
        if (!P.healer) on.tank1 = on.dps1 = 1;
        if (!P.dps) on.tank0 = on.healer1 = 1;
      }
      $$(s, 'li[data-w]').forEach(li => li.classList.toggle('hit', !!on[li.dataset.w]));
    },
    words(t, v) {
      const S = trSim(v), P = S.P, over = S.end != null && t >= S.end, pct = Math.ceil(S.F[S.F.length - 1].boss / TR.boss * 100);
      if (t < TR.first) return `<b>${this.name(v)}.</b> Pull the boss.`;
      if (over) return S.res === 'win'
        ? `<b class="good">Boss down in ${f1(S.end)} s.</b> The tank soaked, the healer refilled, the DPS did the damage: each role covered another's weakness.`
        : `<b class="bad">Wipe at ${f1(S.end)} s</b>, with the boss on ${pct}% HP. ${!P.tank ? 'Without a tank, the DPS and healer durability is insufficient.' : !P.healer ? 'Without a healer, the tank\'s self-healing is too slow, and the DPS has no other healing.' : 'Without DPS, everyone\'s damage is too slow, and the boss enraged.'}`;
      if (!P.tank) return '<b>No tank:</b> the boss hits whoever is next in line, and that is the DPS.';
      if (!P.healer) return '<b>No healer:</b> the tank holds the boss, but its self-healing cannot keep up.';
      if (!P.dps) return t < TR.enrage ? '<b>No DPS:</b> the tank and healer are stable, but the boss barely moves.' : '<b class="bad">Enrage at 15 s:</b> the fight went on too long, and the boss now hits twice as hard.';
      return 'The boss hits the <b>tank</b>, the <b>healer</b> refills it, the <b>DPS</b> chips the boss down. The knot shows who is winning the HP race.';
    },
  };

  /* ======================================================================
     Scene 3 (slides 250-253): League of Legends. Laning duels, a jungle gank, then everyone groups for a teamfight:
     frontline, backline and a flank, the enemy retreats and the tower falls. Shapes are slide 251's classes,
     comps are slide 253's three (five of six classes each). Variant: comp index, 0-2.
     ====================================================================== */
  const CL3 = { tank: ['square', 'Engage tank'], bruiser: ['pentagon', 'Bruiser'], assassin: ['diamond', 'Assassin'], enchanter: ['circle', 'Enchanter / defensive tank'], marksman: ['triangle', 'Marksmen'], caster: ['star', 'Control caster'] };
  const LANES = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
  const COMPS = [
    { Top: 'bruiser', Jungle: 'assassin', Mid: 'caster', Bot: 'marksman', Support: 'enchanter' },
    { Top: 'marksman', Jungle: 'tank', Mid: 'assassin', Bot: 'bruiser', Support: 'enchanter' },
    { Top: 'tank', Jungle: 'caster', Mid: 'enchanter', Bot: 'marksman', Support: 'assassin' },
  ];
  const RED = { Top: 'bruiser', Jungle: 'tank', Mid: 'caster', Bot: 'marksman', Support: 'enchanter' };
  const LANE_END = 7, FIGHT = 8.5, TF_DUR = 19;
  const LANE_Y = { Top: 100, Mid: 292, Bot: 470 };
  const LANE_POS = { blue: { Top: [450, 100], Mid: [450, 292], Bot: [445, 462], Support: [412, 510] }, red: { Top: [590, 100], Mid: [590, 292], Bot: [595, 462], Support: [628, 510] } };
  const TOWER = [842, 292];
  const tfMemo = {};
  function tfPlan(ci) {
    if (tfMemo[ci]) return tfMemo[ci];
    const mk = (team, comp) => {
      const us = LANES.map((lane, i) => ({ team, lane, cls: comp[lane], i }));
      const front = ['tank', 'bruiser'].map(c => us.find(u => u.cls === c)).filter(Boolean);
      const back = ['caster', 'marksman', 'enchanter'].map(c => us.find(u => u.cls === c)).filter(Boolean);
      // formation slots by row and row size; red stands a little further right so the lines meet around x = 580
      const FS = team === 'blue' ? { 1: [[465, 292]], 2: [[470, 252], [460, 334]] } : { 1: [[615, 292]], 2: [[612, 252], [622, 334]] };
      const BS = team === 'blue' ? { 1: [[340, 292]], 2: [[345, 252], [345, 334]], 3: [[350, 222], [328, 292], [350, 362]] } : { 1: [[730, 292]], 2: [[725, 252], [725, 334]], 3: [[722, 222], [744, 292], [722, 362]] };
      front.forEach((u, k) => { u.slot = FS[front.length][k]; u.row = 'front'; });
      back.forEach((u, k) => { u.slot = BS[back.length][k]; u.row = 'back'; });
      us.filter(u => u.cls === 'assassin').forEach(u => { u.slot = [430, 160]; u.row = 'flank'; });
      return us;
    };
    const blue = mk('blue', COMPS[ci]), red = mk('red', RED);
    const has = c => blue.some(u => u.cls === c);
    const engager = blue.find(u => u.cls === 'tank') || blue.find(u => u.cls === 'bruiser');
    const redMk = red.find(u => u.cls === 'marksman');
    const R = { ci, blue, red, has, engager, redMk, kill: has('assassin') ? 3.4 : 4.6, towerEnd: 8.6 };
    // the junglers: blue wanders the top jungle and ganks mid, red wanders the bottom jungle
    R.bj = T.Path([300, 196], 50).go(370, 205).wait(.6).go(340, 196, 40).go(380, 210, 40).go(520, 292, 210).go(560, 292, 60).wait(.6).go(470, 250, 90).wait(LANE_END);
    R.rj = T.Path([720, 392], 40).go(690, 385).wait(1).go(730, 400).go(700, 380).wait(LANE_END);
    R.gank = first(t => R.bj.at(t).x > 450, LANE_END);
    return (tfMemo[ci] = R);
  }
  function lanePos(R, u, t) {
    if (u.lane === 'Jungle') return pt((u.team === 'blue' ? R.bj : R.rj).at(t));
    const [x, y] = LANE_POS[u.team][u.lane], sx = u.team === 'blue' ? 1 : -1, w = 12 * Math.sin(t * 1.8 + u.i);
    if (u.team === 'red' && u.lane === 'Mid' && R.gank != null) {
      const k = clamp((t - R.gank) / .7), back = clamp((t - R.gank - 2) / 1.5);
      return [lerp(x, 730, ease(k) * (1 - ease(back))) - w, y];
    }
    return [x + sx * w, y];
  }
  // where unit u is at time t of the whole scene: lanes, grouping, then the fight in the mid lane
  function tfPos(R, u, t) {
    if (t < LANE_END) return lanePos(R, u, t);
    const lp = lanePos(R, u, LANE_END);
    if (t < FIGHT) { const k = ease(clamp((t - LANE_END) / (FIGHT - LANE_END - .2))); return [lerp(lp[0], u.slot[0], k), lerp(lp[1], u.slot[1], k)]; }
    const f = t - FIGHT, [sx0, sy] = u.slot, j = Math.sin(t * 9 + u.i) * 2;
    const go = (pts) => { // pts: [[f, x, y], ...] keyframes, eased between
      if (f <= pts[0][0]) return [pts[0][1], pts[0][2]];
      for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) { const a = pts[i - 1], b = pts[i], k = ease((f - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
      return [pts.at(-1)[1], pts.at(-1)[2]];
    };
    if (u.team === 'blue') {
      if (u.row === 'front') {
        if (u === R.engager) return go([[1, sx0, sy], [1.3, 562, sy], [5, 558 + j, sy], [6, 620, sy], [8.4, 762, sy]]);
        return go([[1, sx0, sy], [1.6, 545, sy], [5, 545 + j, sy], [6, 610, sy], [8.4, 750, sy]]);
      }
      if (u.row === 'back') return go([[1, sx0, sy], [1.6, sx0 + 80, sy], [5, sx0 + 80, sy], [6, sx0 + 150, sy], [8.4, sx0 + 320, sy]]);
      const m = pt(R.redMk.slot ? { x: R.redMk.slot[0], y: R.redMk.slot[1] } : { x: 720, y: 292 });
      return go([[1.2, sx0, sy], [2.0, 560, 128], [2.7, 680, 150], [3.0, m[0] - 24, m[1] - 18], [3.6, m[0] - 24, m[1] - 18], [4.6, 610, 175], [6, 640, 180], [8.4, 730, 190]]);
    }
    const out = u.row === 'front' ? [[1.3, sx0, sy], [5, sx0 + 4 + j, sy]] : [[5, sx0, sy]];
    return go([...out, [6.4, 1000, sy]]);
  }
  function tfHp(R, u, f) {
    if (f < 0) return 1;
    if (u.team === 'blue') return u.row === 'front' ? 1 - (R.has('enchanter') ? .18 : .32) * clamp((f - 1.3) / 3.7) : 1;
    if (u === R.redMk) return 1 - clamp((f - 1.6) / (R.kill - 1.6));
    return 1 - (u.row === 'front' ? .62 : .42) * clamp((f - 1.3) / 3.7);
  }
  function tower(g, x, y, team, k, t) {
    const [fill, stroke] = TEAM[team];
    if (k <= 0) return;
    T.shadow(x + 4, y + 22, 24, 8, .25);
    g.fillStyle = fill; g.strokeStyle = stroke; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x - 16, y + 20); g.lineTo(x - 12, y - 14); g.lineTo(x + 12, y - 14); g.lineTo(x + 16, y + 20); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); for (let i = 0; i < 3; i++) g.rect(x - 15 + i * 11, y - 24, 8, 10); g.fill(); g.stroke();
  }
  function tfMap(g) {
    T.floor(0, 0, W, H);
    g.fillStyle = 'rgba(80,130,60,.16)'; g.fillRect(0, 130, W, 132); g.fillRect(0, 322, W, 108);
    [['Top', 70, 130], ['Mid', 262, 322], ['Bot', 430, 545]].forEach(([n, a, b]) => { g.fillStyle = 'rgba(255,250,236,.55)'; g.fillRect(0, a, W, b - a); });
    g.fillStyle = 'rgba(85,98,235,.18)'; g.fillRect(0, 22, 60, H - 44); g.fillStyle = 'rgba(229,50,45,.14)'; g.fillRect(W - 60, 22, 60, H - 44);
    T.wall(0, 0, W, 22); T.wall(0, H - 22, W, 22);
  }
  const TFV = {
    tour: [0, 1, 2], gif: [2],
    name: ci => `Comp ${ci + 1}`,
    dur: () => TF_DUR,
    draw(g, t, ci) {
      const R = tfPlan(ci), f = t - FIGHT;
      tfMap(g);
      // League's position icons down the left edge, like the lane boxes on slides 250-253
      [['Top', 92, 'pos-top'], ['Jungle', 190, 'pos-jungle'], ['Mid', 286, 'pos-middle'], ['Jungle', 370, 'pos-jungle'], ['Bot', 452, 'pos-bottom'], ['Support', 506, 'pos-utility']].forEach(([n, y, ic]) => {
        g.fillStyle = 'rgba(21,32,68,.88)'; g.beginPath(); g.arc(32, y, 15, 0, TAU); g.fill();
        icon(g, ic, C.gold, 32, y, 20); T.label(n, 32, y + 25, 'center', C.ink, 11);
      });
      // towers: blue and red on each lane; the red mid tower is the objective
      const tk = f < 6.8 ? 1 : 1 - clamp((f - 6.8) / (R.towerEnd - 6.8));
      Object.values(LANE_Y).forEach(y => { tower(g, 196, y, 'blue', 1); if (y !== TOWER[1]) tower(g, TOWER[0], y, 'red', 1); });
      tower(g, TOWER[0], TOWER[1], 'red', tk);
      if (f > 6.8) bar(g, TOWER[0], TOWER[1] - 40, 60, tk, C.red, tk > 0 ? 1 : 0);
      if (f > R.towerEnd) T.poof(TOWER[0], TOWER[1], f - R.towerEnd, 36);
      // laning: little trades in each lane, and the gank arrow
      if (t < LANE_END) {
        [['Top'], ['Mid'], ['Bot']].forEach(([n], i) => {
          const k = (t * .9 + i * .33) % 1, b = R.blue.find(u => u.lane === n), r = R.red.find(u => u.lane === n), a = lanePos(R, b, t), c = lanePos(R, r, t);
          if (k < .2) T.tracer(a[0] + 18, a[1], lerp(a[0], c[0], k * 5), c[1], 1 - k * 5, C.blue, 3);
          else if (k > .5 && k < .7) T.tracer(c[0] - 18, c[1], lerp(c[0], a[0], (k - .5) * 5), a[1], 1 - (k - .5) * 5, C.red, 3);
        });
        if (R.gank != null && t > R.gank - 1.2 && t < R.gank + 1.4) arrow(g, [[372, 212], [430, 236], [470, 272], [510, 286]], 'rgba(31,95,214,.7)', 1 - clamp((t - R.gank) / 1.4), 4);
        if (R.gank != null && t > R.gank && t < R.gank + 1.6) T.popText('Gank!', 520, 246, '#1f5fd6', 1 - (t - R.gank) / 1.6);
      }
      // teamfight overlays: frontline, backline and the flank (team-neutral colours, so they never read as a side)
      if (f > 0 && f < 5.4) {
        const a = Math.min(clamp(f / .6), 1 - clamp((f - 4.8) / .6));
        const box = (us, col, txt) => {
          const ps = us.map(u => tfPos(R, u, t)); if (!ps.length) return;
          const x0 = Math.min(...ps.map(p => p[0])) - 34, x1 = Math.max(...ps.map(p => p[0])) + 34, y0 = Math.min(...ps.map(p => p[1])) - 34, y1 = Math.max(...ps.map(p => p[1])) + 34;
          g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = 4; g.fillStyle = 'rgba(255,252,244,.25)';
          g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 14); g.fill(); g.stroke(); g.restore();
          if (a > .05) { g.save(); g.globalAlpha *= a; T.label(txt, (x0 + x1) / 2, col === C.navy ? y1 + 16 : y0 - 16, 'center', '#fff', 14, col); g.restore(); }
        };
        box(R.blue.filter(u => u.row === 'front'), C.goldInk, 'Frontline');
        box(R.blue.filter(u => u.row === 'back'), C.navy, 'Backline');
        if (R.has('assassin') && f < 3.2) arrow(g, [[440, 150], [560, 122], [680, 146], [R.redMk.slot[0] - 34, R.redMk.slot[1] - 30]], 'rgba(122,74,0,.75)', a, 3);
        if (R.has('assassin') && f < 3.2) { g.save(); g.globalAlpha *= a; T.label('Flank', 590, 108, 'center', '#fff', 14, C.goldInk); g.restore(); }
      }
      // fight effects
      if (f > 1.3 && f < 2) { T.zone(615, 292, 70 + 40 * (f - 1.3), 1 - (f - 1.3) / .7, '255,185,81'); T.popText(R.engager.cls === 'tank' ? 'Engage!' : 'Bruiser engage!', 590, 196, C.goldInk, 1 - (f - 1.3) / .7); }
      if (R.has('caster') && f > 2.4 && f < 3.4) { T.zone(732, 292, 80, Math.min(1, (3.4 - f) * 3), '138,79,214'); T.popText('Root', 732, 414, C.purple, Math.min(1, (3.4 - f) * 2)); }
      if (f > 1.6 && f < 5) {
        R.blue.filter(u => u.row === 'back').forEach((u, k) => {
          const q = (f * 1.4 + k * .3) % 1, a = tfPos(R, u, t), tg = R.red.filter(r => r.row === 'front')[k % 2] || R.red[0], b = tfPos(R, tg, t);
          const col = u.cls === 'marksman' ? C.gold : u.cls === 'caster' ? C.purple : '#2fae63';
          if (q < .3) { const p = q / .3; g.fillStyle = col; g.beginPath(); g.arc(lerp(a[0], b[0], p), lerp(a[1], b[1], p), 5, 0, TAU); g.fill(); }
        });
        R.red.filter(u => u.row === 'back' && tfHp(R, u, f) > 0).forEach((u, k) => {
          const q = (f * 1.2 + k * .4 + .5) % 1, a = tfPos(R, u, t), b = tfPos(R, R.engager, t);
          if (q < .3) { const p = q / .3; g.fillStyle = C.red; g.beginPath(); g.arc(lerp(a[0], b[0], p), lerp(a[1], b[1], p), 4, 0, TAU); g.fill(); }
        });
        if ((f * 2) % 1 < .3) T.flash(585, 292 + Math.sin(f * 5) * 40, 20, 1 - ((f * 2) % 1) / .3);
      }
      if (f > 6.8 && f < R.towerEnd) R.blue.filter(u => u.row === 'back').forEach((u, k) => {
        const q = (f * 2 + k * .3) % 1, a = tfPos(R, u, t);
        if (q < .35) { const p = q / .35; g.fillStyle = u.cls === 'marksman' ? C.gold : C.purple; g.beginPath(); g.arc(lerp(a[0], TOWER[0], p), lerp(a[1], TOWER[1], p), u.cls === 'marksman' ? 6 : 4, 0, TAU); g.fill(); }
      });
      // units
      const draw = u => {
        const [x, y] = tfPos(R, u, t), hp = tfHp(R, u, f), [kind] = CL3[u.cls];
        const fade = u.team === 'red' ? 1 - clamp((f - 5.6) / .8) : 1;
        if (u === R.redMk && hp <= 0) { T.poof(x, y, f - R.kill, 30); return; }
        if (fade <= 0) return;
        shape(g, kind, x, y, 22, u.team, { a: fade, ang: u.team === 'blue' ? 0 : Math.PI, icon: ICON[u.cls] });
        if (f > 1 && f < 6) bar(g, x, y - 32, 36, hp, u.team === 'blue' ? '#3c7be6' : C.red, fade);
        if (R.has('enchanter') && u.team === 'blue' && u.row === 'front' && f > 2 && f < 4.5) T.bubble(x, y, 26, t, Math.min(1, (4.5 - f) * 3, (f - 2) * 4));
      };
      R.red.forEach(draw); R.blue.forEach(draw);
      if (R.has('assassin') && f > 3 && f < 3.6) T.flash(R.redMk.slot[0], R.redMk.slot[1], 34, 1 - (f - 3) / .6);
      // phase
      const ph = t < LANE_END ? 'Laning' : f < 0 ? 'Grouping up' : f < 5 ? 'Teamfight' : f < 6.4 ? 'They retreat' : 'Push the tower';
      T.label(ph, 520, 44, 'center', '#fff', 18, 'rgba(21,32,68,.9)');
      if (f > R.towerEnd) T.stamp('Tower down', 520, 300, C.good, clamp((f - R.towerEnd) / .25), 44);
    },
    words(t, ci) {
      const R = tfPlan(ci), f = t - FIGHT, miss = ['tank', 'bruiser', 'assassin', 'enchanter', 'marksman', 'caster'].find(c => !R.has(c));
      if (t < LANE_END) return R.gank != null && t > R.gank - .4
        ? 'The <b>jungler</b> ganks mid: the red mid laner is fragile, and has to escape.'
        : '<b>Laning:</b> each lane is a slow-burn duel, much like the holy trinity. Top is tough and alone, mid is fragile, bot is a marksman with a support.';
      if (f < 0) return 'An objective pulls everyone together. The lanes stop mattering. The classes start to.';
      if (f < 5) return `${R.engager.cls === 'tank' ? 'The <b>engage tank</b> starts the fight.' : '<b>No engage tank:</b> the bruiser starts the fight instead.'} The <b>frontline</b> holds, the <b>backline</b> deals the damage${R.has('assassin') ? ', and the <b>assassin</b> flanks for the marksman' : ''}.${R.has('caster') ? '' : ' No control caster, so nothing roots their backline.'}`;
      if (f < 6.4) return 'Forced to retreat, they give up the space in front of their tower.';
      if (f < R.towerEnd) return 'The backline deals far more damage once it reaches the objective.';
      return `<b class="good">Tower down.</b> Comp ${ci + 1} has no ${CL3[miss][1].toLowerCase()}, and still has a front, a back and a flank.`;
    },
  };
  const svgShape = (cls, team = 'blue') => {
    const [fill, stroke] = TEAM[team], k = CL3[cls][0];
    const d = { square: '<rect x="5" y="5" width="20" height="20"/>', circle: '<circle cx="15" cy="15" r="10"/>', triangle: '<path d="M15 4 26 25H4Z"/>', pentagon: '<path d="M15 4 26 12 22 26H8L4 12Z"/>', diamond: '<path d="M15 2 22 15 15 28 8 15Z"/>', star: '<path d="M15 3 18 10 26 9 21 15 26 21 18 20 15 27 12 20 4 21 9 15 4 9 12 10Z"/>' }[k];
    const o = k === 'triangle' ? [9, 11, 12] : k === 'diamond' ? [10, 10, 10] : [8, 8, 14];
    return `<svg viewBox="0 0 30 30"><g fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round">${d}</g><image href="img/${ICON[cls]}.png" x="${o[0]}" y="${o[1]}" width="${o[2]}" height="${o[2]}" filter="url(#tint-${team})"/></svg>`;
  };

  /* ---------- slide 1: title, the three scenes in turn ---------- */
  const TITLE = [[FB, 'fwr'], [TRI, 'thd'], [TFV, 2]];
  canvasDemo('title', (s, cv, g) => (dt, t) => {
    const tot = TITLE.reduce((a, [S, v]) => a + S.dur(v), 0);
    let x = t % tot, k = 0;
    while (x >= TITLE[k][0].dur(TITLE[k][1])) { x -= TITLE[k][0].dur(TITLE[k][1]); k++; }
    g.clearRect(0, 0, cv.width, cv.height);
    g.save(); g.scale(cv.width / W, cv.height / H); T.use(g); TITLE[k][0].draw(g, x, TITLE[k][1]); g.restore();
  });

  /* ---------- slides 2-4 ---------- */
  canvasDemo('football', (s, cv, g) => {
    let sb; const ui = roleUi(s, ['f', 'w', 'r'], () => sb.restart());
    sb = stage(s, cv, g, 'football', FB, ui);
    return dt => sb.tick(dt);
  }, { enter(s) { const b = $(s, '.rl-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  canvasDemo('trinity', (s, cv, g) => {
    let sb; const ui = roleUi(s, ['t', 'h', 'd'], () => sb.restart());
    sb = stage(s, cv, g, 'trinity', TRI, ui);
    return dt => sb.tick(dt);
  }, { enter(s) { const b = $(s, '.rl-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  canvasDemo('teamfight', (s, cv, g) => {
    let sb, ci = 2;
    const box = $(s, '.comps');
    box.innerHTML = COMPS.map((c, i) => `<button class="comp" data-i="${i}"><b>Comp ${i + 1}</b><span class="shapes">${LANES.map(l => svgShape(c[l], 'blue')).join('')}</span><small>${LANES.map(l => `${l}: ${CL3[c[l]][1].split(' /')[0].toLowerCase()}`).join(', ')}</small></button>`).join('');
    $(s, '.legend').innerHTML = Object.keys(CL3).map(c => `<span>${svgShape(c)}${CL3[c][1]}</span>`).join('');
    const btns = $$(box, '.comp');
    const ui = { cur: () => ci, sync: v => { ci = v; btns.forEach((b, i) => b.classList.toggle('on', i === v)); } };
    btns.forEach((b, i) => b.onclick = () => { ui.sync(i); sb.restart(); });
    ui.sync(ci);
    sb = stage(s, cv, g, 'teamfight', TFV, ui);
    $(s, '.rl-fight').onclick = () => sb.restart(LANE_END);
    return dt => sb.tick(dt);
  }, { enter(s) { const b = $(s, '.rl-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  window.__seek = (t, which) => SEEK[which].seek(t);
  window.__dur = which => SEEK[which].dur();
})();
