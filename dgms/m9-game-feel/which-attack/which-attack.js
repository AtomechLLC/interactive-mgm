/* Which attack comes out? (DGMS Module 9, deck slides 66-69: principle 1, predictable results).
   Two knights get the same press. Left: the stick direction picks the attack, so the same input always gives the same
   move (Smash, slide 67). Right: one button, and the game picks one of three attacks you can't predict (a forward roll
   into a thrust, a double-slash pirouette, an upward slash: the notes on 68). Each enemy calls for one move, and a
   tally counts how often the move you aimed for came out, and how often it hit.
   Randomness is a seeded hash of (seed, round), so the walk-through and __seek replay exactly. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, PW = 520, GY = 380, ANIM = 1.0;
  const MOVES = {
    thrust: { name: 'roll thrust', long: 'forward roll into a thrust' },
    spin: { name: 'pirouette', long: 'double-slash pirouette' },
    rising: { name: 'rising slash', long: 'upward slash' },
  };
  const ORDER = ['thrust', 'spin', 'rising'];
  const DIR_MOVE = { forward: 'thrust', neutral: 'spin', up: 'rising' };
  const ENEMY = {
    far: { label: 'at range', needs: 'thrust', dir: 'forward' },
    around: { label: 'on both sides', needs: 'spin', dir: 'neutral' },
    air: { label: 'flying overhead', needs: 'rising', dir: 'up' },
  };
  const ENEMIES = ['far', 'around', 'air'];
  // a small integer hash, so round n with seed s always gives the same number in [0, 1)
  const hash = (s, n) => { let h = (s * 374761393 + n * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const enemyAt = (seed, n) => { const a = Math.floor(hash(seed + 101, n) * 3); return ENEMIES[n > 0 && ENEMIES[a] === enemyAt(seed, n - 1) ? (a + 1) % 3 : a]; };
  const pickAt = (seed, n) => ORDER[Math.floor(hash(seed, n) * 3)];
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };

  // the player is Pip from the shared cast (assets/cast.js). o.sword is the blade angle in radians (0 forward, negative up),
  // o.roll curls into a dodge roll, o.lift raises off the floor.
  function knight(g, x, y, o = {}) {
    const RD = 180 / Math.PI, S = .58;
    const lunge = o.sword === 0 && o.len > 50 ? clamp((o.len - 46) / 80) : 0;   // a long blade means the thrust is out
    const pose = o.roll != null ? { base: 'tuck', spin: o.roll * RD } : lunge ? CAST.mix('guard', 'thrust', lunge) : CAST.hold(90 - (o.sword ?? -0.6) * RD);
    CAST.draw(g, 'pip', { x, y, s: S, face: o.face || 1, pose: { ...(typeof pose === 'string' ? { base: pose } : pose), lift: (o.lift || 0) / S }, shadow: false });
  }
  function foe(g, x, y, kind, flash, knock, a = 1) {
    g.save(); g.globalAlpha *= a; g.translate(x + knock, y);
    const col = flash ? '#fff' : C.red;
    T.use(g);
    if (kind === 'air') {
      T.shadow(0, GY - y + 4, 16, 5, .18);
      g.fillStyle = '#c0392b'; const fl = 0;
      g.beginPath(); g.moveTo(-6, -2); g.lineTo(-34, -18 + fl); g.lineTo(-20, 4); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(6, -2); g.lineTo(34, -18 + fl); g.lineTo(20, 4); g.closePath(); g.fill();
    } else T.shadow(0, 4, 20, 6, .22);
    g.fillStyle = col; g.strokeStyle = C.redDk; g.lineWidth = 3;
    g.beginPath(); kind === 'air' ? g.arc(0, 0, 18, 0, 7) : g.roundRect(-18, -44, 36, 44, 12); g.fill(); g.stroke();
    g.fillStyle = flash ? C.red : '#fff'; const ey = kind === 'air' ? -3 : -30;
    g.beginPath(); g.arc(-7, ey, 4, 0, 7); g.arc(7, ey, 4, 0, 7); g.fill();
    g.restore();
  }
  // where the enemies stand for each kind, relative to the knight at kx
  const spots = (kind, kx) => kind === 'far' ? [[kx + 250, GY]] : kind === 'around' ? [[kx - 92, GY], [kx + 92, GY]] : [[kx + 95, GY - 150]];
  function slash(g, cx, cy, r, a0, a1, w, col, alpha) {
    g.save(); g.globalAlpha = alpha; g.strokeStyle = col; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { g.lineWidth = w * (1 - k * .3); g.globalAlpha = alpha * (1 - k * .3); g.beginPath(); g.arc(cx, cy, r - k * 8, Math.min(a0, a1), Math.max(a0, a1)); g.stroke(); }
    g.restore();
  }

  // draws one knight panel at time u (seconds since the attack started, or null for idle) with the given move and enemy
  function scene(g, px, enemy, move, u, hit, fade) {
    const kx = px + 150;
    let kopt = {}, kxx = kx, impact = false, after = false;
    if (u != null && u < ANIM) {
      if (move === 'thrust') {
        const r = clamp(u / .32), th = clamp((u - .32) / .2);
        kxx = kx + 110 * ease(r);
        if (u < .32) kopt = { roll: r * Math.PI * 4 };
        else { kopt = { sword: 0, len: 46 + 110 * ease(th) * (1 - clamp((u - .75) / .25)) }; }
        impact = u > .45 && u < .7;
        if (u > .32 && u < .8) { g.strokeStyle = 'rgba(255,185,81,.8)'; g.lineWidth = 5; g.beginPath(); g.moveTo(kxx + 20, GY - 32); g.lineTo(kxx + 60 + 110 * ease(th), GY - 32); g.stroke(); }
      } else if (move === 'spin') {
        const k = clamp(u / .7);
        kopt = { face: Math.cos(k * Math.PI * 4) >= 0 ? 1 : -1, sword: 0, len: 60 };
        if (u < .8) {
          const a = k * Math.PI * 4, al = 1 - clamp((u - .6) / .2);
          g.save(); g.strokeStyle = '#ffb951'; g.lineCap = 'round';
          for (let j = 0; j < 3; j++) { g.globalAlpha = al * (1 - j * .3); g.lineWidth = 9 - j * 3; g.beginPath(); g.ellipse(kx, GY - 30 - j * 4, 100, 26, 0, a - 2.2, a); g.stroke(); }
          g.restore();
        }
        impact = u > .25 && u < .7;
      } else {
        const k = clamp((u - .1) / .35);
        kopt = { lift: 34 * Math.sin(clamp(u / .7) * Math.PI), sword: lerp(.6, -2.0, ease(k)), len: 54 };
        if (u > .1 && u < .75) slash(g, kx + 10, GY - 40, 150, lerp(-0.2, -1.2, ease(k)) - .9, lerp(-0.2, -1.2, ease(k)) + .3, 10, '#ffb951', 1 - clamp((u - .55) / .2));
        impact = u > .3 && u < .6;
      }
      after = u > .45;
    }
    // enemies
    spots(enemy, kx).forEach(([x, y], k) => {
      const struck = hit && u != null && u > .45;
      const knock = struck ? (x < kx ? -1 : 1) * 40 * ease(clamp((u - .45) / .3)) : 0;
      foe(g, x, y, enemy, hit && impact && u < .6, knock, struck ? 1 - clamp((u - .7) / .3) : fade);
    });
    T.use(g); T.shadow(kxx + 3, GY + 4, 20, 6, .25);
    knight(g, kxx, GY, kopt);
    if (u != null && u < ANIM && after) {
      const [ex, ey] = spots(enemy, kx)[0];
      if (hit) T.popText('Hit', ex, ey - 70 - 20 * clamp((u - .45) / .5), C.good, 1 - clamp((u - .8) / .2));
      else T.popText('Whiff', kxx, GY - 110 - 20 * clamp((u - .45) / .5), C.muted, 1 - clamp((u - .8) / .2));
    }
    const sp = spots(enemy, kx), lx = sp.reduce((a, b) => a + b[0], 0) / sp.length;
    if (u == null || u < .4) T.label(ENEMY[enemy].label, enemy === 'around' ? kx : lx, (enemy === 'air' ? GY - 150 : GY) - (enemy === 'air' ? 40 : enemy === 'around' ? 108 : 66), 'center', C.redDk, 13);
  }

  canvasDemo('attack', (s, cv, g) => {
    const st = { tour: true, t: 0, frozen: false, now: 0, seed: 28, dir: 'neutral', log: [], key: '' };
    const tourBtn = $(s, '.wa-tour');
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.log = []; st.seed = 28; st.now = 0; };
    const setDir = d => { st.dir = d; $$(s, '.wa-dir .btn').forEach(b => b.classList.toggle('on', b.dataset.d === d)); };
    $$(s, '.wa-dir .btn').forEach(b => b.onclick = () => { free(); setDir(b.dataset.d); });
    const attack = () => {
      free();
      const last = st.log[st.log.length - 1];
      if (last && st.now - last.at < ANIM) return;
      const n = st.log.length;
      st.log.push({ enemy: enemyAt(st.seed, n), dir: st.dir, pick: pickAt(st.seed, n), at: st.now });
    };
    $(s, '.wa-attack').onclick = attack;
    $(s, '.wa-seed').onclick = () => { free(); st.seed = 1 + Math.floor(Math.random() * 9999); st.log = []; };
    $(s, '.wa-reset').onclick = () => { free(); st.log = []; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const KEYS = { KeyS: 'neutral', KeyD: 'forward', KeyW: 'up' };
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.repeat) return;
      if (KEYS[e.code]) { free(); setDir(KEYS[e.code]); }
      else if (e.code === 'KeyX' || e.code === 'KeyJ') attack();
    });

    // the walk-through: one round every PER seconds, aimed at the move each enemy calls for
    const PER = 2.2, ROUNDS = 7, DUR = PER * ROUNDS + 0.6, TSEED = 28;
    const tourLog = t => { const L = []; for (let n = 0; n < ROUNDS; n++) { const at = n * PER + 1.0; if (at > t) break; const en = enemyAt(TSEED, n); L.push({ enemy: en, dir: ENEMY[en].dir, pick: pickAt(TSEED, n), at }); } return L; };
    function render() {
      let log = st.log, now = st.now, seed = st.seed, dir = st.dir;
      if (st.tour) {
        now = st.t; seed = TSEED; log = tourLog(now);
        const n = Math.min(ROUNDS - 1, Math.floor(now / PER)); dir = ENEMY[enemyAt(TSEED, n)].dir;
        if (now % PER < .45 && !log[n]) dir = 'neutral';
        setDir(dir);
      }
      g.clearRect(0, 0, W, H);
      const last = log[log.length - 1], u = last ? now - last.at : null, busy = u != null && u < ANIM;
      const n = log.length, enemy = busy ? last.enemy : enemyAt(seed, n), fade = busy ? 1 : clamp(last ? (u - ANIM) / .3 : 1);
      [0, 1].forEach(side => {
        const px = side * PW;
        g.fillStyle = 'rgba(255,252,244,.82)'; g.beginPath(); g.roundRect(px + (side ? 6 : 0), 0, PW - 6, H, 14); g.fill();
        txt(g, side ? 'Unpredictable: one button, three moves' : 'Predictable: the stick picks the move', px + 22, 30, '800 18px Montserrat', side ? C.redDk : C.ink);
        txt(g, side ? `The game picks one of three at random (seed ${seed}).` : 'The same input always gives the same move.', px + 22, 54, '600 14px Jost', C.muted);
        g.fillStyle = '#e8dcc0'; g.fillRect(px + 16, GY, PW - 38, 16);
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 16, GY); g.lineTo(px + PW - 22, GY); g.stroke();
        g.save(); g.beginPath(); g.rect(px + (side ? 6 : 0), 60, PW - 6, GY - 44); g.clip();
        const move = busy ? (side ? last.pick : DIR_MOVE[last.dir]) : null;
        const hit = busy && move === ENEMY[last.enemy].needs;
        scene(g, px, enemy, move, busy ? u : null, hit, fade);
        g.restore();
        // the move list
        const y0 = 418;
        if (!side) [['forward', 'Forward + attack'], ['neutral', 'Neutral + attack'], ['up', 'Up + attack']].forEach(([d, lab], k) => {
          const on = busy ? last.dir === d : dir === d;
          if (on) { g.fillStyle = '#fff3d6'; g.beginPath(); g.roundRect(px + 16, y0 + k * 28 - 12, PW - 38, 24, 6); g.fill(); }
          txt(g, lab, px + 26, y0 + k * 28, '700 15px Jost', C.ink); txt(g, MOVES[DIR_MOVE[d]].long, px + 200, y0 + k * 28, '600 15px Jost', on ? C.goldInk : C.muted);
        });
        else ORDER.forEach((m, k) => {
          const on = busy && last.pick === m;
          if (on) { g.fillStyle = '#fde2df'; g.beginPath(); g.roundRect(px + 16, y0 + k * 28 - 12, PW - 38, 24, 6); g.fill(); }
          txt(g, 'Attack: 1 in 3', px + 26, y0 + k * 28, '700 15px Jost', C.ink); txt(g, MOVES[m].long, px + 200, y0 + k * 28, '600 15px Jost', on ? C.redDk : C.muted);
        });
        // tally
        const done = log.filter(e => now - e.at >= .45);
        const outOf = done.length, meant = done.filter(e => (side ? e.pick : DIR_MOVE[e.dir]) === DIR_MOVE[e.dir]).length;
        const hits = done.filter(e => (side ? e.pick : DIR_MOVE[e.dir]) === ENEMY[e.enemy].needs).length;
        txt(g, `Came out as you aimed: ${meant} / ${outOf}`, px + 26, 520, '800 17px Montserrat', C.ink);
        txt(g, `Enemies hit: ${hits} / ${outOf}`, px + 26, 548, '700 15px Jost', C.muted);
        if (outOf) { const k = meant / outOf; g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(px + 330, 512, 150, 14, 7); g.fill(); g.fillStyle = side ? C.red : C.blue; g.beginPath(); g.roundRect(px + 330, 512, Math.max(8, 150 * k), 14, 7); g.fill(); }
      });
      // side stats and caption
      const done = log.filter(e => now - e.at >= .45), right = done.filter(e => e.pick === DIR_MOVE[e.dir]).length;
      const msg = st.tour
        ? (log.length < 3 ? 'Each enemy calls for one move: a thrust at range, a pirouette when surrounded, a rising slash for a flyer. Both knights get the same press.'
          : 'On the left, the stick always gives the move you aimed for. On the right, the same press gives one of three moves, so about one aim in three comes out.')
        : (done.length < 3 ? 'Aim with the stick, then attack. Watch the right knight: the press is the same, the result is a coin flip with three sides.'
          : `Your aim came out ${done.length} times in ${done.length} on the left and ${right} in ${done.length} on the right. “When you can’t predict what your character is going to do… you can’t consistently make informed decisions.”`);
      const key = msg + done.length;
      if (key !== st.key) {
        st.key = key; say($(s, '.wa-out'), msg);
        $(s, '.wa-stats').innerHTML = `<div class="g"><b>${done.length}/${done.length}</b><span>predictable: your aim came out</span></div><div class="r"><b>${right}/${done.length}</b><span>random pick: your aim came out</span></div>`;
      }
    }
    s._api = { seek(t) { st.frozen = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    window.__seek = t => s._api.seek(t); window.__dur = () => DUR;
    return dt => { if (st.tour) { if (!st.frozen) st.t += dt; if (st.t > DUR) st.t = 0; } else st.now += dt; render(); };
  });
})();
