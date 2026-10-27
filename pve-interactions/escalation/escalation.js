/* Escalation (MGM course 4, module 5, deck slides 126-133 and 148). One sword enemy and the lesson it teaches: read the
   wind-up, step out of the arc, strike during the recovery. Escalate it numerically (health, damage, speed) or
   contextually (narrow corridor, darkness, a ledge), or permutate it (a shield), and see whether the player's pattern
   changes or only the risk does (slide 126). fight(cfg) scripts the whole fight as a pure function of time, so the
   sandbox, the three-up comparison and window.__seek (for the GIF) all draw the same thing. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const WW = 900, WH = 420, E = [540, 210], READY = [430, 210], RANGE = 140, HALF = Math.PI / 3, SWING = .25, RECOVER = .9;
  const BASE = { hp: 3, dmg: 2, speed: 0, corridor: false, dark: false, ledge: false, shield: false };
  const LIFE = 10;

  const STEPS = {
    side: ['Read the wind-up', 'Sidestep', 'Strike'],
    up: ['Read the wind-up', 'Sidestep, safe side only', 'Strike'],
    back: ['Read the wind-up', 'Back-step', 'Step in', 'Strike'],
    dark: ['Hold at range', 'Late read', 'Back-step', 'Step in', 'Strike'],
    behind: ['Read the wind-up', 'Sidestep', 'Circle behind', 'Strike its back'],
    stuck: ['Read the wind-up', 'Back-step', 'Step in', 'Blocked'],
  };
  const patternOf = c => c.shield ? (c.corridor ? 'stuck' : 'behind') : c.corridor ? 'back' : c.dark ? 'dark' : c.ledge ? 'up' : 'side';
  const windup = c => lerp(.9, .4, c.speed);
  const readWin = c => windup(c) * (c.dark ? .45 : 1);
  const mistakes = c => c.ledge && !c.corridor ? 0 : Math.max(0, Math.ceil(LIFE / c.dmg) - 1);

  /* ---------- one fight: n exchanges of ready, wind-up, swing, recovery ---------- */
  function fight(c) {
    const pat = patternOf(c), W = windup(c), ready = pat === 'behind' ? 1.0 : .6;
    const X = ready + W + SWING + RECOVER, n = pat === 'stuck' ? 3 : c.hp;
    const end = n * X, dur = end + 1.4;
    function at(t) {
      const i = Math.min(n - 1, Math.floor(t / X)), u = t - i * X, s = { i, phase: 'ready', u, hpLeft: c.hp, dead: -1, pat };
      s.hpLeft = pat === 'stuck' ? c.hp : c.hp - i - (u > ready + W + SWING + .3 ? 1 : 0);
      if (t >= end) { s.phase = pat === 'stuck' ? 'stuck' : 'dead'; s.dead = t - end; s.hpLeft = pat === 'stuck' ? c.hp : 0; }
      else if (u < ready) s.phase = 'ready';
      else if (u < ready + W) s.phase = 'windup';
      else if (u < ready + W + SWING) s.phase = 'swing';
      else s.phase = 'recover';
      const k = s.phase === 'windup' ? (u - ready) / W : s.phase === 'swing' ? (u - ready - W) / SWING : s.phase === 'recover' ? (u - ready - W - SWING) / RECOVER : u / ready;
      s.k = k;
      // where the player stands
      const home = pat === 'dark' ? [400, 210] : READY;
      const sg = pat === 'side' ? (i % 2 ? 1 : -1) : -1;
      const side = [E[0] - 30, E[1] + sg * 100];
      let p = home, face = 0, strike = false, note = '';
      const mv = (a, b, q) => [lerp(a[0], b[0], ease(clamp(q))), lerp(a[1], b[1], ease(clamp(q)))];
      if (t >= end) { p = pat === 'stuck' ? [440, 210] : home; }
      else if (pat === 'side' || pat === 'up' || pat === 'behind') {
        const prev = pat === 'behind' ? [E[0] + 105, E[1]] : [E[0] - 30, E[1] + (pat === 'side' ? (i % 2 ? -1 : 1) : -1) * 100];
        // from behind it, come back round its side rather than through it
        if (s.phase === 'ready') p = i === 0 ? home : pat === 'behind' ? (k < .5 ? mv(prev, [E[0] + 20, E[1] - 105], k / .5) : mv([E[0] + 20, E[1] - 105], home, (k - .5) / .5)) : mv(prev, home, k);
        else if (s.phase === 'windup') p = mv(home, side, k / .55);
        else if (s.phase === 'swing') p = side;
        else if (pat === 'behind') { p = k < .45 ? mv(side, [E[0] + 105, E[1]], k / .45) : [E[0] + 105, E[1]]; strike = k > .5 && k < .75; }
        else { p = side; strike = k > .15 && k < .4; }
      } else if (pat === 'back' || pat === 'stuck' || pat === 'dark') {
        const out = [pat === 'dark' ? 270 : 330, 210], inn = [E[0] - 75, 210];
        if (s.phase === 'ready') p = i === 0 ? home : mv(inn, home, k);
        else if (s.phase === 'windup') p = pat === 'dark' ? (k < .55 ? home : mv(home, out, (k - .55) / .45)) : mv(home, out, k / .6);
        else if (s.phase === 'swing') p = out;
        else { p = k < .35 ? mv(out, inn, k / .35) : inn; strike = k > .4 && k < .65; }
      }
      face = Math.atan2(E[1] - p[1], E[0] - p[0]);
      s.player = p; s.face = face; s.strike = strike;
      s.enemyFace = Math.atan2(home[1] - E[1], home[0] - E[0]);
      if (pat === 'behind' && s.phase === 'recover') s.enemyFace = Math.PI;   // still facing where the swing went
      return s;
    }
    return { c, pat, X, n, end, dur, at, W, ready };
  }

  /* ---------- drawing ---------- */
  function draw(g, F, t, o = {}) {
    T.use(g);
    const c = F.c, s = F.at(t);
    T.floor(0, 0, WW, WH);
    T.wall(0, 0, WW, 30); T.wall(0, WH - 30, WW, 30);
    if (c.corridor) { T.wall(0, 30, WW, 108); T.wall(0, 282, WW, 108); }
    if (c.ledge && !c.corridor) {
      g.fillStyle = '#0d1230'; g.fillRect(0, 300, WW, WH - 330);
      g.fillStyle = '#1d2550'; for (let x = 0; x < WW; x += 36) g.fillRect(x, 300, 20, 6);
      g.fillStyle = C.gold; g.fillRect(0, 296, WW, 4);
      T.label('drop', 80, 345, 'center', '#ffb951', 15, 'rgba(21,32,68,.9)');
    }
    const alive = s.phase !== 'dead';
    // the telegraph and the swing
    if (alive && (s.phase === 'windup' || s.phase === 'swing')) {
      const seen = !c.dark || s.phase === 'swing' || s.k > .55;
      if (seen) T.cone(E[0], E[1], s.enemyFace, HALF, RANGE, s.phase === 'swing' ? 2.4 : .5 + .5 * s.k);
    }
    // the enemy
    if (alive) {
      const r = 28 + (c.hp > 3 ? Math.min(10, (c.hp - 3) * 2) : 0) * .6;
      const lean = s.phase === 'windup' ? -6 * s.k : s.phase === 'swing' ? 10 : 0;
      const ex = E[0] + Math.cos(s.enemyFace) * lean, ey = E[1] + Math.sin(s.enemyFace) * lean;
      T.foe(ex, ey, r, s.enemyFace, c.speed > .5 ? '#d8452f' : C.red, { mark: c.shield ? 'shield' : 'horns', hp: s.hpLeft, hpMax: c.hp });
      // the sword
      const sw = s.phase === 'windup' ? -1.4 * ease(s.k) : s.phase === 'swing' ? lerp(-1.4, 1.4, s.k) : s.phase === 'recover' ? 1.4 * (1 - s.k * .6) : 0;
      const a = s.enemyFace + sw;
      g.strokeStyle = '#e8e2cf'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex + Math.cos(a) * r * .8, ey + Math.sin(a) * r * .8); g.lineTo(ex + Math.cos(a) * (r + 46), ey + Math.sin(a) * (r + 46)); g.stroke();
      g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke();
      if (s.phase === 'recover' && !o.quiet) T.label('recovering', E[0], E[1] + 62, 'center', C.good, 15);
    } else T.poof(E[0], E[1], s.dead, 34);
    // the strike
    if (s.strike) {
      const [px, py] = s.player, blocked = F.pat === 'stuck';
      T.tracer(px, py, lerp(px, E[0], .8), lerp(py, E[1], .8), 1, blocked ? '#9fb3c8' : C.gold, 7);
      T.flash(lerp(px, E[0], .75), lerp(py, E[1], .75), 34, .9);
      if (!o.quiet) T.popText(blocked ? 'Blocked' : F.pat === 'behind' ? 'Back hit!' : 'Hit', E[0], E[1] - 66, blocked ? '#2f78c4' : C.good, 1);
    }
    T.player(s.player[0], s.player[1], s.face);
    if (c.dark) {
      // only a lamp around the player and a glint on the enemy cut through the dark
      g.save();
      const grd = g.createRadialGradient(s.player[0], s.player[1], 40, s.player[0], s.player[1], 190);
      grd.addColorStop(0, 'rgba(10,14,34,0)'); grd.addColorStop(1, 'rgba(10,14,34,.86)');
      g.fillStyle = grd; g.fillRect(0, 0, WW, WH);
      g.fillStyle = 'rgba(255,90,70,.9)'; g.beginPath(); g.arc(E[0] + Math.cos(s.enemyFace) * 12, E[1] + Math.sin(s.enemyFace) * 12 - 6, 3.5, 0, Math.PI * 2); g.arc(E[0] + Math.cos(s.enemyFace) * 12, E[1] + Math.sin(s.enemyFace) * 12 + 6, 3.5, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // the player's health, as hearts of LIFE
    if (!o.quiet) {
      const hearts = Math.ceil(LIFE / c.dmg);
      T.label(`Hits you can take: ${hearts}${c.ledge && !c.corridor ? ', or one fall' : ''}`, 20, 54, 'left', C.ink, 15);
    }
    if (F.pat === 'stuck' && t >= F.end) T.stamp('✗ No way behind it', WW / 2, 120, C.red, clamp((t - F.end) / .3), 28);
  }
  // draw the world region v = [x, y, w, h] (the whole arena by default) centred in a canvas box
  function fit(g, x, y, w, h, fn, v = [0, 0, WW, WH]) {
    const sc = Math.min(w / v[2], h / v[3]);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.translate(x + (w - v[2] * sc) / 2 - v[0] * sc, y + (h - v[3] * sc) / 2 - v[1] * sc); g.scale(sc, sc); fn(); g.restore();
  }

  /* ---------- what kind of change is it? ---------- */
  function classify(c) {
    const num = c.hp !== BASE.hp || c.dmg !== BASE.dmg || c.speed !== BASE.speed, pat = patternOf(c);
    const changed = !['side', 'up'].includes(pat);
    if (c.shield && c.corridor) return { kind: 'Impossible', cls: 'bad', changed: true, text: 'The permutation and the placement fight each other: a shield you must get behind, in a corridor with no way around it. Some mixes create situations the player cannot win.' };
    if (c.shield) return { kind: 'Permutation', cls: 'accent', changed: true, text: 'A rule changed: its front now blocks, so the player has to learn a new move, circling behind it. That is a new lesson, not a harder version of the old one.' };
    if (c.corridor) return { kind: 'Contextual escalation', cls: 'good', changed: true, text: `Same enemy${num ? '' : ', same numbers'}, but the walls take the sidestep away, so the player has to back off out of reach and step back in. The placement raised the stakes and changed the pattern.` };
    if (c.dark) return { kind: 'Contextual escalation', cls: 'good', changed: true, text: `Same enemy${num ? '' : ', same numbers'}, but in the dark the wind-up shows up late, so the player waits at range and backs off instead of sidestepping.` };
    if (c.ledge) return { kind: 'Escalation of risk', cls: 'warn', changed: false, text: 'The ledge only removes one side. The player still sidesteps, just always the same way, but one slip is now fatal. The risk went up; the pattern did not change.' };
    if (num) {
      const bits = [];
      if (c.hp !== BASE.hp) bits.push(c.hp > BASE.hp ? `${c.hp} exchanges instead of ${BASE.hp}` : `only ${c.hp} exchange${c.hp > 1 ? 's' : ''}`);
      if (c.dmg !== BASE.dmg) bits.push(`${mistakes(c)} mistake${mistakes(c) === 1 ? '' : 's'} allowed instead of ${mistakes(BASE)}`);
      if (c.speed !== BASE.speed) bits.push(`a ${readWin(c).toFixed(2)} s window to react instead of ${readWin(BASE).toFixed(2)} s`);
      return { kind: 'Numeric escalation', cls: 'warn', changed: false, text: `The player does exactly the same thing: read, sidestep, strike. Only the numbers moved: ${bits.join(', ')}. More time and more risk, no new behaviour.` };
    }
    return { kind: 'Baseline: the lesson', cls: 'muted', changed: false, text: 'Read the wind-up, step out of the arc, strike while it recovers. Once the player knows this, you can escalate it.' };
  }
  const chips = (c, cls = '') => STEPS[patternOf(c)].map(x => `<span class="stp ${cls}">${x}</span>`).join('<i>→</i>');

  /* ---------- slide 1: title ---------- */
  canvasDemo('title', (s, cv, g) => {
    const F = fight({ ...BASE, hp: 4 });
    return (dt, t) => { g.clearRect(0, 0, cv.width, cv.height); fit(g, 0, 0, cv.width, cv.height, () => draw(g, F, t % F.dur, { quiet: true })); };
  });

  /* ---------- slide 2: the sandbox, with a tour ---------- */
  const TOUR = [
    { cfg: {}, cap: 'The lesson' },
    { cfg: { hp: 6, dmg: 5, speed: .6 }, cap: 'More health, more damage, faster' },
    { cfg: { ledge: true }, cap: 'A ledge on one side' },
    { cfg: { corridor: true }, cap: 'A narrow corridor' },
    { cfg: { dark: true }, cap: 'A dark room' },
    { cfg: { shield: true }, cap: 'It gains a shield' },
  ];
  const TOUR_STEP = 8;
  let sbApi = null;
  canvasDemo('sandbox', (s, cv, g) => {
    const out = $(s, '.es-out'), kind = $(s, '.es-kind'), pat = $(s, '.es-pat'), stats = $(s, '.es-stats');
    const st = { c: { ...BASE }, t: 0, tour: false, tt: 0, held: false, last: '' };
    let F = fight(st.c);
    const sl = { hp: $(s, '.es-hp'), dmg: $(s, '.es-dmg'), speed: $(s, '.es-spd') };
    const setUI = c => {
      sl.hp.value = c.hp; sl.dmg.value = c.dmg; sl.speed.value = c.speed * 100;
      $(s, '.es-hp-v').textContent = `${c.hp} hits`; $(s, '.es-dmg-v').textContent = `${c.dmg} per hit`; $(s, '.es-spd-v').textContent = `${windup(c).toFixed(2)} s wind-up`;
      $$(s, '[data-ctx]').forEach(b => b.classList.toggle('on', !!c[b.dataset.ctx]));
      $(s, '.es-tour').classList.toggle('on', st.tour);
    };
    const set = () => { st.tour = false; F = fight(st.c); st.t = 0; };
    sl.hp.oninput = () => { st.c.hp = +sl.hp.value; set(); };
    sl.dmg.oninput = () => { st.c.dmg = +sl.dmg.value; set(); };
    sl.speed.oninput = () => { st.c.speed = sl.speed.value / 100; set(); };
    $$(s, '[data-ctx]').forEach(b => b.onclick = () => { if (st.tour) st.c = { ...BASE }; st.c[b.dataset.ctx] = !st.c[b.dataset.ctx]; set(); });
    $(s, '.es-reset').onclick = () => { st.c = { ...BASE }; set(); };
    $(s, '.es-tour').onclick = () => { st.tour = true; st.tt = 0; };
    const tours = TOUR.map(x => fight({ ...BASE, ...x.cfg }));
    function readouts(c, F) {
      const k = classify(c), key = JSON.stringify(c);
      setUI(c);
      if (key === st.last) return; st.last = key;
      kind.innerHTML = `<b class="${k.cls}">${k.kind}</b><span>Does the play pattern change? <b class="${k.changed ? 'good' : 'bad'}">${k.changed ? 'Yes' : k.kind === 'Escalation of risk' || k.kind === 'Numeric escalation' ? 'No, only the risk' : 'No'}</b></span>`;
      pat.innerHTML = chips(c, k.changed ? 'new' : '');
      stats.innerHTML = [
        ['Fight length', F.pat === 'stuck' ? '∞' : `${F.end.toFixed(1)} s`],
        ['Time to react', `${readWin(c).toFixed(2)} s`],
        ['Mistakes allowed', `${mistakes(c)}`],
      ].map(([a, b]) => `<div><b>${b}</b><span>${a}</span></div>`).join('');
      say(out, k.text);
    }
    function render() {
      g.clearRect(0, 0, cv.width, cv.height);
      if (st.tour) {
        const tt = Math.max(0, st.tt) % (TOUR.length * TOUR_STEP), i = Math.floor(tt / TOUR_STEP), f = tours[i], u = tt - i * TOUR_STEP;
        fit(g, 0, 0, cv.width, cv.height, () => draw(g, f, Math.min(u, f.dur - .01)));
        T.use(g); T.label(`${i + 1} / ${TOUR.length}  ${TOUR[i].cap}`, cv.width - 20, 54 * cv.height / WH, 'right', '#fff', 17, 'rgba(21,32,68,.9)');
        readouts(f.c, f);
        return;
      }
      fit(g, 0, 0, cv.width, cv.height, () => draw(g, F, st.t % F.dur));
      readouts(st.c, F);
    }
    sbApi = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => TOUR.length * TOUR_STEP };
    return dt => { if (!st.held) { st.t += dt; st.tt += dt; } render(); };
  }, { enter(s) { const b = $(s, '.es-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  /* ---------- slide 3: escalation vs permutation, side by side ---------- */
  canvasDemo('versus', (s, cv, g) => {
    const cfgs = [{ ...BASE }, { ...BASE, hp: 6, dmg: 5, speed: .55 }, { ...BASE, shield: true }];
    const Fs = cfgs.map(fight), W = cv.width / 3;
    $$(s, '.vs-pat').forEach((el, i) => el.innerHTML = chips(cfgs[i], i === 2 ? 'new' : ''));
    return (dt, t) => {
      g.clearRect(0, 0, cv.width, cv.height);
      Fs.forEach((F, i) => fit(g, i * W + 8, 0, W - 16, cv.height, () => draw(g, F, t % F.dur, { quiet: true }), [300, 70, 420, 280]));
    };
  });

  window.__seek = t => sbApi.seek(t);
  window.__dur = () => sbApi.dur();
})();
