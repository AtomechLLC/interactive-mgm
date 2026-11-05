/* Sequencing with tokens (MGM C4 M6 Update, Part 8: Teamplay Sequencing Framework, deck slides ~186-245).
   Generic visuals only: player tokens P1-P4, one enemy, four elements (Water, Chill, Shock, Rock) and status chips
   from student-tokens/vector-basics. Two engines:
   - sim(spec): a timed scene. Each event is a cast at time t; it lands at th = t + windup + travel and reads the enemy's
     states at that moment (RULES). Enemy movement is integrated from its states, so a beam that fires at an empty spot
     misses for a physical reason, not a flag. drawScene(g, S, t) is a pure function of time, so every slide, the title
     loop and window.__seek (the GIF recorder) draw the same thing.
   - beatSim(plan): the sandbox. Abilities in beat b read the states from the start of beat b and land at its end. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease, TAU } = TD;

  /* ---------- the vocabulary ---------- */
  const PC = ['#2ea3dc', '#2fae63', '#8a4fd6', '#e08a1e'];          // P1-P4 token colours
  const STAGE = { setup: '#5562eb', exploit: '#c98a10', payoff: '#e5322d' };
  const EL = {
    water: { name: 'Water', col: '#2f8fd6', glyph: 'drop' },
    chill: { name: 'Chill', col: '#5bb8ee', glyph: 'flake' },
    shock: { name: 'Shock', col: '#e9b52a', glyph: 'bolt' },
    rock: { name: 'Rock', col: '#8b8fa8', glyph: 'rock' },
    root: { name: 'Root', col: '#2f8a4c', glyph: 'vine' },
    beam: { name: 'Beam', col: '#8a4fd6', glyph: 'beam' },
    mark: { name: 'Mark', col: '#d9433d', glyph: 'eye' },
    topple: { name: 'Topple', col: '#c98a10', glyph: 'down' },
    pull: { name: 'Pull', col: '#c98a10', glyph: 'pull' },
  };
  // states on the enemy: label, colour, and the vector-basics status icon (null: drawn here)
  const ST = {
    wet: { name: 'Wet', col: '#2f8fd6', glyph: 'drop' },
    chilled: { name: 'Chilled', col: '#5bb8ee', glyph: 'flake' },
    frozen: { name: 'Frozen', col: '#57b6ff', icon: 'freeze' },
    rooted: { name: 'Rooted', col: '#2f8a4c', icon: 'root' },
    stunned: { name: 'Stunned', col: '#e9b52a', icon: 'stun' },
    knocked: { name: 'Knocked down', col: '#c98a10', icon: 'knocked-down' },
    vulnerable: { name: 'Marked', col: '#d9433d', icon: 'vulnerable' },
    gathered: { name: 'Gathered', col: '#c98a10', glyph: 'pull' },
  };
  const ICON = {};
  ['freeze', 'root', 'stun', 'knocked-down', 'vulnerable', 'cooldown', 'channeling'].forEach(n => { const i = new Image(); i.src = `../../student-tokens/vector-basics/svg/status/${n}.svg`; ICON[n] = i; });
  const HELD = s => !!(s.rooted || s.frozen || s.stunned || s.knocked);

  /* ---------- the rules: what an element does to the enemy's current states ---------- */
  const RULES = {
    water: s => s.chilled ? { dmg: 10, take: ['chilled'], add: { frozen: 3 }, word: 'Wet + Chill → Frozen', ok: 1, stage: 'setup' } : { dmg: 5, add: { wet: 3.4 }, word: 'Wet', ok: 1, stage: 'setup' },
    chill: s => s.wet ? { dmg: 10, take: ['wet'], add: { frozen: 3 }, word: 'Frozen', ok: 1, stage: 'exploit' } : { dmg: 5, add: { chilled: 3.4 }, word: 'Chilled', ok: 1, stage: 'setup' },
    rock: s => s.frozen ? { dmg: 80, take: ['frozen'], word: 'Shattered! 80', ok: 1, big: 1, burst: 1, stage: 'payoff' } : { dmg: 5, word: s.wet ? 'Bonk 5 · Wet doesn’t fit Rock' : 'Bonk 5', fail: 1, stage: 'payoff' },
    shock: s => s.wet ? { dmg: 30, take: ['wet'], add: { stunned: 2 }, word: 'Stunned! 30', ok: 1, big: 1, stage: 'payoff' } : { dmg: 10, word: 'Zap 10', fail: 1, stage: 'payoff' },
    root: (s, e) => ({ dmg: 5, add: { rooted: e.hold || 2 }, word: 'Rooted', ok: 1, stage: 'setup' }),
    pull: s => s.frozen ? { dmg: 0, add: { gathered: 9 }, word: 'Gathered', ok: 1, stage: 'exploit' } : { dmg: 0, word: 'Nothing to pull', fail: 1, stage: 'exploit' },
    // the beam is resolved by position in sim() below
  };

  /* ---------- glyphs and chips ---------- */
  function glyph(g, kind, x, y, r, col = '#fff') {
    g.save(); g.translate(x, y); g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    if (kind === 'drop') { g.beginPath(); g.moveTo(0, -r * .78); g.bezierCurveTo(r * .62, -r * .05, r * .6, r * .7, 0, r * .7); g.bezierCurveTo(-r * .6, r * .7, -r * .62, -r * .05, 0, -r * .78); g.fill(); }
    else if (kind === 'flake') { g.lineWidth = r * .17; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * r * .7, Math.sin(a) * r * .7); g.lineTo(-Math.cos(a) * r * .7, -Math.sin(a) * r * .7); g.stroke(); } }
    else if (kind === 'bolt') { const p = [[-.15, -.8], [.38, -.8], [.08, -.12], [.42, -.12], [-.28, .85], [-.06, .14], [-.4, .14]]; g.beginPath(); p.forEach(([a, b], i) => i ? g.lineTo(a * r, b * r) : g.moveTo(a * r, b * r)); g.closePath(); g.fill(); }
    else if (kind === 'rock') { const p = [[-.62, .42], [-.52, -.18], [-.1, -.6], [.45, -.42], [.66, .18], [.32, .55]]; g.beginPath(); p.forEach(([a, b], i) => i ? g.lineTo(a * r, b * r) : g.moveTo(a * r, b * r)); g.closePath(); g.fill(); }
    else if (kind === 'vine') { g.lineWidth = r * .17; g.beginPath(); g.moveTo(-r * .55, r * .6); g.bezierCurveTo(-r * .1, -r * .1, r * .5, r * .2, r * .2, -r * .7); g.stroke(); g.beginPath(); g.ellipse(-r * .05, -r * .02, r * .2, r * .11, -.6, 0, TAU); g.fill(); }
    else if (kind === 'beam') { g.lineWidth = r * .22; g.beginPath(); g.moveTo(-r * .7, 0); g.lineTo(r * .7, 0); g.stroke(); g.lineWidth = r * .1; g.beginPath(); g.moveTo(-r * .4, -r * .35); g.lineTo(r * .5, -r * .35); g.moveTo(-r * .4, r * .35); g.lineTo(r * .5, r * .35); g.stroke(); }
    else if (kind === 'eye') { g.lineWidth = r * .14; g.beginPath(); g.arc(0, 0, r * .55, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r * .2, 0, TAU); g.fill(); }
    else if (kind === 'down') { g.lineWidth = r * .18; g.beginPath(); g.moveTo(0, -r * .65); g.lineTo(0, r * .45); g.moveTo(-r * .4, r * .1); g.lineTo(0, r * .5); g.lineTo(r * .4, r * .1); g.stroke(); }
    else if (kind === 'pull') { g.lineWidth = r * .16; [-1, 1].forEach(sg => { g.beginPath(); g.moveTo(sg * r * .72, 0); g.lineTo(sg * r * .18, 0); g.moveTo(sg * r * .42, -r * .28); g.lineTo(sg * r * .14, 0); g.lineTo(sg * r * .42, r * .28); g.stroke(); }); }
    g.restore();
  }
  function disc(g, x, y, r, col, kind, a = 1) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a;
    g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, r * .14);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r + g.lineWidth + 1, 0, TAU); g.stroke();
    glyph(g, kind, x, y, r * .78);
    g.restore();
  }
  function stateChip(g, k, x, y, r, a = 1) {
    const s = ST[k], im = s.icon && ICON[s.icon];
    if (im && im.complete && im.naturalWidth) { g.save(); g.globalAlpha *= a; g.drawImage(im, x - r * 1.14, y - r * 1.14, r * 2.28, r * 2.28); g.restore(); }
    else disc(g, x, y, r, s.col, s.glyph || 'drop', a);
  }
  // a player token: the deck's disc in the player's colour, with a P# badge
  function token(g, i, x, y, ang = 0, o = {}) {
    T.player(x, y, ang, o.s || 1.15, o.a ?? 1, PC[i]);
    if (o.badge !== false) T.label(o.name || `P${i + 1}`, x, y + 36 * (o.s || 1.15), 'center', '#fff', 14, PC[i]);
  }
  function arena(g, x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); T.floor(x, y, w, h); g.restore(); T.wall(x, y, w, 18); T.wall(x, y + h - 18, w, 18); }

  /* ---------- timed scenes ---------- */
  // spec: { players: [[x,y],...], enemy: { x, y, amp, speed, ph }, events: [{ t, p, el, travel?, windup?, hold?, stage?, label? }], minions?: [[x,y],...] }
  function sim(spec) {
    const en = Object.assign({ amp: 0, speed: 0, ph: 0, r: 34 }, spec.enemy);
    const states = [];   // { k, from, until }
    const stateAt = t => { const o = {}; states.forEach(s => { if (t >= s.from && t < s.until) o[s.k] = s; }); return o; };
    // enemy position integrates its own movement, which stops while it is held
    const posCache = new Map();
    const pos = t => {
      if (!en.amp) return [en.x, en.y];
      const key = Math.round(t * 50); if (posCache.has(key) && !sim.dirty) return posCache.get(key);
      let ph = en.ph; for (let s = 0; s < key / 50; s += .02) if (!HELD(stateAt(s))) ph += .02 * en.speed;
      const p = [en.x, en.y + Math.sin(ph) * en.amp]; posCache.set(key, p); return p;
    };
    const ev = spec.events.map((e, i) => ({ travel: .45, windup: 0, i, ...e })).map(e => ({ ...e, fire: e.t + e.windup, th: e.t + e.windup + e.travel }));
    ev.slice().sort((a, b) => a.th - b.th || a.i - b.i).forEach(e => {
      posCache.clear();
      const s = Object.fromEntries(Object.entries(stateAt(e.th)).map(([k]) => [k, true]));
      let r;
      if (e.el === 'beam') {
        // fires along a line toward where the enemy stood when the cast began
        const p0 = spec.players[e.p], a = pos(e.t), b = pos(e.fire), dx = a[0] - p0[0], dy = a[1] - p0[1], L = Math.hypot(dx, dy);
        const d = Math.abs((b[0] - p0[0]) * dy - (b[1] - p0[1]) * dx) / L;
        e.aim = a; e.hitPos = b;
        r = d < en.r + 12 ? { dmg: 80, word: '80! It held still', ok: 1, big: 1, stage: 'payoff' } : { dmg: 0, word: 'Missed', miss: 1, stage: 'payoff' };
      } else r = RULES[e.el](s, e);
      if (r.ok && s.vulnerable && r.stage === 'payoff') { r.dmg = Math.round(r.dmg * 1.5); r.take = [...(r.take || []), 'vulnerable']; }
      (r.take || []).forEach(k => states.forEach(x => { if (x.k === k && e.th >= x.from && e.th < x.until) x.until = e.th; }));
      Object.entries(r.add || {}).forEach(([k, n]) => {
        states.forEach(x => { if (x.k === k && e.th >= x.from && e.th < x.until) x.until = e.th; });
        states.push({ k, from: e.th, until: e.th + n, dur: n });
      });
      e.r = r; e.stage = e.stage || r.stage;
    });
    posCache.clear();
    const total = t => ev.reduce((s, e) => s + (t >= e.th ? e.r.dmg * (e.r.burst && spec.minions && stateAt(e.th - .001).gathered ? 1 + spec.minions.length : 1) : 0), 0);
    const last = ev.reduce((m, e) => Math.max(m, e.th), 0);
    return { spec, en, ev, states, stateAt, pos, total, last };
  }

  function drawEnemy(g, S, t, o = {}) {
    const [ex, ey] = S.pos(t), st = S.stateAt(t), r = S.en.r;
    if (st.frozen) { g.fillStyle = 'rgba(160,215,255,.55)'; g.beginPath(); g.roundRect(ex - r - 12, ey - r - 12, (r + 12) * 2, (r + 12) * 2, 14); g.fill(); g.strokeStyle = '#57b6ff'; g.lineWidth = 3; g.stroke(); }
    if (st.rooted) { g.strokeStyle = '#2f8a4c'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.beginPath(); g.moveTo(ex + Math.cos(a) * (r + 12), ey + Math.sin(a) * (r + 12)); g.quadraticCurveTo(ex + Math.cos(a + .6) * (r - 6), ey + Math.sin(a + .6) * (r - 6), ex + Math.cos(a) * 12, ey + Math.sin(a) * 12); g.stroke(); } }
    if (st.chilled) { g.strokeStyle = 'rgba(91,184,238,.85)'; g.lineWidth = 3; g.setLineDash([3, 6]); g.beginPath(); g.arc(ex, ey, r + 9, 0, TAU); g.stroke(); g.setLineDash([]); }
    T.foe(ex, ey, r, Math.PI, st.wet ? '#c9443e' : C.red, { mark: 'horns' });
    if (st.wet) { g.fillStyle = 'rgba(47,143,214,.85)'; [[-14, -r - 6], [10, -r - 10], [22, -r + 4]].forEach(([dx, dy]) => { g.beginPath(); g.ellipse(ex + dx, ey + dy + (t * 30 % 10), 3, 5, 0, 0, TAU); g.fill(); }); }
    if (st.stunned || st.knocked) { g.fillStyle = C.gold; for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; g.beginPath(); g.arc(ex + Math.cos(a) * 26, ey - r - 8 + Math.sin(a) * 7, 5, 0, TAU); g.fill(); } }
    // state chips with how long each has left
    const keys = Object.keys(st).filter(k => k !== 'gathered');
    keys.forEach((k, i) => {
      const x = ex + (i - (keys.length - 1) / 2) * 52, y = ey + r + 34, s = st[k];
      stateChip(g, k, x, y, 17);
      const left = clamp((s.until - t) / s.dur);
      g.fillStyle = 'rgba(21,32,68,.25)'; g.fillRect(x - 20, y + 23, 40, 5);
      g.fillStyle = ST[k].col; g.fillRect(x - 20, y + 23, 40 * left, 5);
      if (o.chipNames !== false) T.label(ST[k].name, x, y + 42, 'center', C.ink, 12);
    });
    return [ex, ey];
  }

  function drawScene(g, S, t, o = {}) {
    const P = S.spec.players, st = S.stateAt(t);
    // minions (the converge slide): gathered by a pull, shattered with the target
    if (S.spec.minions) {
      const pull = S.ev.find(e => e.el === 'pull' && e.r.ok), rock = S.ev.find(e => e.el === 'rock' && e.r.ok);
      const [ex, ey] = S.pos(t);
      S.spec.minions.forEach(([mx, my], i) => {
        const k = pull ? ease(clamp((t - pull.th) / .5)) : 0, side = i ? 1 : -1;
        const x = lerp(mx, ex + side * 78, k), y = lerp(my, ey - 6, k);
        if (rock && t >= rock.th) { T.poof(x, y, t - rock.th, 26); return; }
        T.foe(x, y, 22, Math.PI / 2, '#d4554f', { mark: 'horns' });
      });
    }
    const [ex, ey] = drawEnemy(g, S, t, o);
    // payoff telegraphs (the beam's windup line)
    S.ev.forEach(e => {
      if (e.el !== 'beam' || t < e.t || t > e.th + .5) return;
      const p = P[e.p], a = e.aim, ang = Math.atan2(a[1] - p[1], a[0] - p[0]), L = 1400;
      const x1 = p[0] + Math.cos(ang) * L, y1 = p[1] + Math.sin(ang) * L;
      if (t < e.fire) {
        const k = (t - e.t) / e.windup;
        g.save(); g.strokeStyle = 'rgba(138,79,214,.25)'; g.lineWidth = 52; g.lineCap = 'butt'; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = 'rgba(138,79,214,.75)'; g.lineWidth = 2.5; g.setLineDash([10, 8]);
        [-26, 26].forEach(off => { const nx = -Math.sin(ang) * off, ny = Math.cos(ang) * off; g.beginPath(); g.moveTo(p[0] + nx, p[1] + ny); g.lineTo(x1 + nx, y1 + ny); g.stroke(); });
        g.setLineDash([]); g.strokeStyle = 'rgba(138,79,214,.55)'; g.lineWidth = 52 * k; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + Math.cos(ang) * L * k, p[1] + Math.sin(ang) * L * k); g.stroke(); g.restore();
      } else {
        const k = clamp((t - e.fire) / .5);
        g.save(); g.globalAlpha = 1 - k; g.strokeStyle = '#b48cf0'; g.lineWidth = 46; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 14; g.stroke(); g.restore();
      }
    });
    // players, facing the enemy; the caster glows for a moment
    P.forEach((p, i) => {
      if (o.only && !o.only.includes(i)) return;
      const casting = S.ev.find(e => e.p === i && t >= e.t - .05 && t < e.fire + .25);
      if (casting) { const c = casting.el === 'beam' ? STAGE.payoff : STAGE[casting.stage] || C.blue; g.fillStyle = c + '33'; g.beginPath(); g.arc(p[0], p[1], 36, 0, TAU); g.fill(); }
      token(g, i, p[0], p[1], Math.atan2(ey - p[1], ex - p[0]), { name: o.names?.[i] });
      if (casting && o.castLabels !== false) {
        const lab = casting.label || `${EL[casting.el].name}${casting.stage ? ' · ' + casting.stage[0].toUpperCase() + casting.stage.slice(1) : ''}`;
        T.label(lab, p[0] + (o.labelSide?.[i] ?? 1) * 44, p[1] - 40, (o.labelSide?.[i] ?? 1) > 0 ? 'left' : 'right', '#fff', 14, STAGE[casting.stage] || C.blue);
      }
    });
    // orbs in flight, then the hit
    S.ev.forEach(e => {
      if (e.el === 'beam') { if (t >= e.th && t < e.th + 1.1) T.popText(e.r.word, (e.r.miss ? e.hitPos[0] + 120 : ex), ey - S.en.r - 30 - (t - e.th) * 16, e.r.miss ? '#7a7f9e' : C.goldInk, 1 - (t - e.th) / 1.1); return; }
      const p = P[e.p];
      if (t >= e.fire && t < e.th) {
        const k = ease((t - e.fire) / e.travel), [tx, ty] = S.pos(e.th);
        const x = lerp(p[0], tx, k), y = lerp(p[1], ty, k) - Math.sin(k * Math.PI) * 30;
        T.tracer(lerp(p[0], tx, Math.max(0, k - .2)), lerp(p[1], ty, Math.max(0, k - .2)) - Math.sin(Math.max(0, k - .2) * Math.PI) * 30, x, y, .6, EL[e.el].col, 6);
        disc(g, x, y, 15, EL[e.el].col, EL[e.el].glyph);
      }
      if (t >= e.th && t < e.th + 1.1) {
        const v = (t - e.th) / 1.1;
        if (v < .25 && !e.r.fail) T.flash(ex, ey, e.r.big ? 80 : 44, 1 - v * 4);
        if (e.r.burst && v < .6) { g.save(); g.globalAlpha = 1 - v / .6; g.strokeStyle = '#9fdcff'; g.lineWidth = 6; g.beginPath(); g.arc(ex, ey, 40 + v * 220, 0, TAU); g.stroke(); g.restore(); }
        if (e.r.fail && v < .5) { const s = Math.sin(v * 40) * 8 * (1 - v * 2); g.strokeStyle = C.red; g.lineWidth = 5; g.beginPath(); g.moveTo(ex - 14 + s, ey - 14); g.lineTo(ex + 14 + s, ey + 14); g.moveTo(ex + 14 + s, ey - 14); g.lineTo(ex - 14 + s, ey + 14); g.stroke(); }
        const many = e.r.burst && S.spec.minions && S.stateAt(e.th - .001).gathered;
        T.popText(many ? `Shattered! 80 × ${1 + S.spec.minions.length}` : e.r.word, ex, ey - S.en.r - 30 - v * 18, e.r.big ? C.goldInk : e.r.fail ? '#7a7f9e' : STAGE[e.stage] || C.blue, 1 - v * .7);
      }
    });
    return [ex, ey];
  }
  const fitTo = (g, cv, W, H, fn) => { const sc = Math.min(cv.width / W, cv.height / H); g.save(); g.translate((cv.width - W * sc) / 2, (cv.height - H * sc) / 2); g.scale(sc, sc); fn(); g.restore(); };
  const take = (takes, t) => { const tot = takes.reduce((s, x) => s + x.dur, 0); let u = ((t % tot) + tot) % tot; for (const k of takes) { if (u < k.dur) return { k, t: u }; u -= k.dur; } return { k: takes[0], t: 0 }; };
  const totalDur = takes => takes.reduce((s, x) => s + x.dur, 0);
  function caption(g, text, x, y, w) { T.label(text, x, y, 'left', '#fff', 18, 'rgba(21,32,68,.92)'); }
  function damage(g, S, t, x, y) { T.label(`Damage: ${S.total(t)}`, x, y, 'right', C.ink, 20); }

  /* =====================================================================
     Slide 2: hooks as puzzle tabs (deck slides 209-213)
     ===================================================================== */
  const W2 = 1420, H2 = 600;
  const PIECE = {
    water: { left: null, right: 'round', stage: 'setup', sub: 'leaves Wet' },
    chill: { left: 'round', right: 'tri', stage: 'exploit', sub: 'Wet → Frozen' },
    rock: { left: 'tri', right: null, stage: 'payoff', sub: 'shatters Frozen' },
  };
  const PFILL = { setup: ['#dfe6fb', '#5562eb'], exploit: ['#fde9b8', '#e0a92d'], payoff: ['#f9d9d6', '#e07b72'] };
  function piecePath(g, x, y, w, h, left, right) {
    const s = h * .2, my = y + h / 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y);
    if (right === 'round') { g.lineTo(x + w, my - s); g.arc(x + w, my, s, -Math.PI / 2, Math.PI / 2, false); }
    else if (right === 'tri') { g.lineTo(x + w, my - s); g.lineTo(x + w + s * 1.1, my); g.lineTo(x + w, my + s); }
    g.lineTo(x + w, y + h); g.lineTo(x, y + h);
    if (left === 'round') { g.lineTo(x, my + s); g.arc(x, my, s, Math.PI / 2, -Math.PI / 2, true); }
    else if (left === 'tri') { g.lineTo(x, my + s); g.lineTo(x + s * 1.1, my); g.lineTo(x, my - s); }
    g.closePath();
  }
  function piece(g, el, x, y, a = 1, o = {}) {
    const P = PIECE[el], [fill, edge] = PFILL[P.stage], w = PW, h = 96;
    g.save(); g.globalAlpha *= a;
    g.fillStyle = 'rgba(40,30,20,.18)'; piecePath(g, x + 4, y + 6, w, h, P.left, P.right); g.fill();
    g.fillStyle = fill; g.strokeStyle = o.bad ? C.red : edge; g.lineWidth = 3.5; piecePath(g, x, y, w, h, P.left, P.right); g.fill(); g.stroke();
    disc(g, x + 56, y + h / 2, 22, EL[el].col, EL[el].glyph);
    g.fillStyle = C.ink; g.font = '700 22px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(EL[el].name, x + 88, y + 42);
    g.fillStyle = edge; g.font = '600 15px Jost, sans-serif'; g.fillText(`${P.stage[0].toUpperCase() + P.stage.slice(1)}: ${P.sub}`, x + 88, y + 66);
    if (o.who != null) T.label(`P${o.who + 1}`, x + 22, y + 16, 'center', '#fff', 13, PC[o.who]);
    g.restore();
  }
  const RX = 300, RY = 420, PW = 268;           // rail: the enemy plate ends at RX; slot i starts at RX + i*PW
  function rail(g) {
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(20, 352, W2 - 40, 236, 14); g.fill(); g.stroke();
    g.fillStyle = C.muted; g.font = '700 15px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText('THE HOOK RAIL: EACH STATE IS A SHAPE THE NEXT PIECE MUST FIT', 44, 384);
    // the enemy plate: a flat right edge, nothing to plug into until a setup lands
    g.fillStyle = '#f3d6d3'; g.strokeStyle = '#a8201c'; g.lineWidth = 3.5; g.beginPath(); g.roundRect(60, RY, RX - 60, 96, [14, 0, 0, 14]); g.fill(); g.stroke();
    T.foe(112, RY + 48, 24, 0, C.red, { mark: 'horns' });
    g.fillStyle = C.ink; g.font = '700 22px Montserrat, Jost, sans-serif'; g.fillText('Enemy', 150, RY + 42); g.fillStyle = C.muted; g.font = '600 15px Jost, sans-serif'; g.fillText('flat edge: no hook', 150, RY + 66);
  }
  // rail moves per take: { el, who, slot, t0 (leave the player), t1 (arrive), fail }
  const TABS = [
    { dur: 6.6, cap: 'Water → Chill → Rock: each piece leaves the edge the next one plugs into.',
      events: [{ t: .6, p: 0, el: 'water' }, { t: 2.0, p: 1, el: 'chill' }, { t: 3.4, p: 2, el: 'rock' }] },
    { dur: 3.8, cap: 'No setup: Rock has nothing to plug into.',
      events: [{ t: .6, p: 2, el: 'rock' }] },
    { dur: 4.6, cap: 'Wrong hook: Wet has a round tab, and Rock needs a triangle.',
      events: [{ t: .6, p: 0, el: 'water' }, { t: 2.0, p: 2, el: 'rock' }] },
    { dur: 6.8, cap: 'P1 and P3 both hold a Rock: who closes the chain is a choice.', either: 3.0,
      events: [{ t: .6, p: 0, el: 'water' }, { t: 2.0, p: 1, el: 'chill' }, { t: 3.9, p: 0, el: 'rock' }] },
  ];
  const TAB_PLAYERS = [[190, 92], [140, 172], [190, 252]];
  TABS.forEach(k => {
    k.S = sim({ players: TAB_PLAYERS, enemy: { x: 900, y: 172 }, events: k.events });
    let slot = 0;
    k.moves = k.S.ev.map(e => { const fail = !!e.r.fail, m = { el: e.el, who: e.p, slot, t0: e.t, t1: e.th, fail }; if (!fail) slot++; return m; });
  });
  function drawTabs(g, t, o = {}) {
    const { k, t: u } = take(TABS, t), S = k.S;
    arena(g, 0, 0, W2, 340);
    drawScene(g, S, u, { labelSide: [1, 1, 1] });
    damage(g, S, u, W2 - 24, 46);
    rail(g);
    k.moves.forEach(m => {
      if (u < m.t0) return;
      const p = TAB_PLAYERS[m.who], sx = RX + m.slot * PW, sy = RY;
      const flyK = ease(clamp((u - m.t0) / (m.t1 - m.t0)));
      let x = lerp(p[0] - 40, sx + (m.fail ? 26 : 0), flyK), y = lerp(p[1] - 30, sy - (m.fail ? 4 : 0), flyK), a = 1;
      if (m.fail && u > m.t1) {
        const v = clamp((u - m.t1) / 1.2);
        x = sx + 26 + Math.sin(v * 30) * 10 * (1 - v) + v * 30; y = sy - 4 - v * 60; a = 1 - clamp((v - .6) / .4);
        if (v < .9) T.stamp('No hook', sx + 40, sy - 26, C.red, 1 - v, 22);
      }
      piece(g, m.el, x, y, a, { who: m.who, bad: m.fail && u > m.t1 });
    });
    // the "either can finish" beat: two ghost Rocks hover over the open slot
    if (k.either && u >= k.either && u < k.moves[2].t0 + .1) {
      const a = clamp((u - k.either) / .3);
      piece(g, 'rock', RX + 2 * PW + 20, RY - 112, .45 * a, { who: 0 });
      piece(g, 'rock', RX + 2 * PW + 280, RY - 112, .45 * a, { who: 2 });
      T.label('Either one fits', RX + 2 * PW + 270, RY - 128, 'center', '#fff', 15, STAGE.payoff);
    }
    if (!o.quiet) caption(g, k.cap, 44, 552);
  }

  /* =====================================================================
     Slide 3: one player or three (deck slide 237)
     ===================================================================== */
  const W3 = 1420, H3 = 600, LANE = 280;
  const SOLO = sim({ players: [[200, 140]], enemy: { x: 800, y: 140 }, events: [{ t: .5, p: 0, el: 'water' }, { t: 3.3, p: 0, el: 'chill' }, { t: 6.1, p: 0, el: 'rock' }] });
  const TEAM = sim({ players: [[200, 70], [150, 140], [200, 210]], enemy: { x: 800, y: 140 }, events: [{ t: .5, p: 0, el: 'water' }, { t: 1.2, p: 1, el: 'chill' }, { t: 1.9, p: 2, el: 'rock' }] });
  const HANDS_DUR = 9.4;
  function lane(g, S, t, y0, title, solo) {
    g.save(); g.translate(0, y0);
    arena(g, 0, 0, W3, LANE);
    drawScene(g, S, t, { chipNames: true });
    // the solo player's cooldown ring between casts
    if (solo) {
      const p = S.spec.players[0], casts = S.ev.map(e => e.t), prev = casts.filter(c => c <= t).pop(), next = casts.find(c => c > t);
      if (prev != null && next != null && t > prev + .3) {
        const k = clamp((t - prev - .3) / (next - prev - .3));
        g.strokeStyle = 'rgba(21,32,68,.25)'; g.lineWidth = 7; g.beginPath(); g.arc(p[0], p[1], 44, 0, TAU); g.stroke();
        g.strokeStyle = C.navy; g.beginPath(); g.arc(p[0], p[1], 44, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
        const im = ICON.cooldown; if (im.complete && im.naturalWidth) g.drawImage(im, p[0] + 34, p[1] - 58, 30, 30);
        T.label('Cooldown', p[0] + 70, p[1] - 44, 'left', C.ink, 14);
      }
    }
    // the clock
    const end = S.last, done = t >= end, shown = Math.min(t, end);
    T.label(title, 420, 46, 'left', '#fff', 18, 'rgba(21,32,68,.92)');
    g.font = '800 46px Montserrat, Jost, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = done ? C.goldInk : C.ink;
    g.fillText(`${shown.toFixed(1)} s`, W3 - 40, 80);
    g.font = '600 16px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(done ? `chain done · ${S.total(t)} damage` : 'chain running…', W3 - 40, 116);
    // a strip of when each cast went in
    const sx = v => 1040 + 320 * v / HANDS_DUR, sy = LANE - 52;
    g.fillStyle = '#e9dfcb'; g.fillRect(sx(0), sy, 320, 10);
    S.ev.forEach(e => { g.fillStyle = PC[e.p]; g.beginPath(); g.arc(sx(e.t), sy + 5, 8, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); });
    g.fillStyle = C.navy; g.fillRect(sx(Math.min(t, HANDS_DUR)) - 1.5, sy - 6, 3, 22);
    g.restore();
  }
  function drawHands(g, t) {
    const u = t % HANDS_DUR;
    lane(g, SOLO, u, 0, 'By 1 player: one kit holds the whole chain', true);
    lane(g, TEAM, u, LANE + 40, 'By 3 players: one step each', false);
  }

  /* =====================================================================
     Slide 4: payoff window (deck slides 223-228)
     ===================================================================== */
  const W4 = 1420, H4 = 600, A4 = 390, WIN_DUR = 4.8;
  const WIN_PLAYERS = [[200, 120], [200, 270]];
  const WIN_EN = { x: 900, y: 195, amp: 115, speed: 2.1, ph: 0 };
  const WINDOW = [
    { name: 'Take 1: no setup', events: [{ t: .6, p: 1, el: 'beam', windup: 1.6, travel: .1 }] },
    { name: 'Take 2: a short root (1.0 s)', events: [{ t: .25, p: 0, el: 'root', hold: 1.0, travel: .4 }, { t: .75, p: 1, el: 'beam', windup: 1.6, travel: .1 }] },
    { name: 'Take 3: a long root (2.4 s)', events: [{ t: .25, p: 0, el: 'root', hold: 2.4, travel: .4 }, { t: .75, p: 1, el: 'beam', windup: 1.6, travel: .1 }] },
  ].map(k => ({ ...k, dur: WIN_DUR, S: sim({ players: WIN_PLAYERS, enemy: WIN_EN, events: k.events }) }));
  function drawWindow(g, t, o = {}) {
    const { k, t: u } = take(WINDOW, t), S = k.S;
    arena(g, 0, 0, W4, A4);
    drawScene(g, S, u, { labelSide: [1, 1] });
    if (!o.quiet) T.label(k.name, 24, 46, 'left', '#fff', 18, 'rgba(21,32,68,.92)');
    damage(g, S, u, W4 - 24, 46);
    // the two bars: windup and held time, on one clock
    const beam = S.ev.find(e => e.el === 'beam'), root = S.states.find(s => s.k === 'rooted');
    const x0 = 250, x1 = W4 - 60, sx = v => x0 + (x1 - x0) * v / WIN_DUR, y = A4 + 26;
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(20, A4 + 10, W4 - 40, H4 - A4 - 14, 14); g.fill(); g.stroke();
    const row = (i, name, col, from, to) => {
      const yy = y + 24 + i * 52;
      g.fillStyle = C.ink; g.font = '700 18px Montserrat, Jost, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(name, x0 - 18, yy + 11);
      g.fillStyle = '#e9dfcb'; g.fillRect(x0, yy, x1 - x0, 22);
      if (from != null && u > from) { g.fillStyle = col; g.fillRect(sx(from), yy, sx(Math.min(u, to)) - sx(from), 22); }
      if (from != null) { g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([6, 5]); g.strokeRect(sx(from), yy, sx(to) - sx(from), 22); g.setLineDash([]); }
    };
    row(0, 'Payoff windup', '#8a4fd6', beam.t, beam.fire);
    row(1, 'Enemy held', '#2f8a4c', root?.from, root?.until);
    // the moment the beam fires
    g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.moveTo(sx(beam.fire), y + 14); g.lineTo(sx(beam.fire), y + 130); g.stroke();
    g.fillStyle = C.red; g.font = '700 14px Jost, sans-serif'; g.textAlign = 'center'; g.fillText('fires', sx(beam.fire), y + 8);
    g.fillStyle = C.navy; g.fillRect(sx(u) - 1.5, y + 14, 3, 118);
    const held = root ? Math.max(0, Math.min(root.until, beam.fire) - Math.max(root.from, beam.t)) : 0;
    if (u >= beam.th) {
      const msg = beam.r.miss ? `Held ${held.toFixed(1)} s of a ${beam.windup.toFixed(1)} s windup: the enemy walked out of the beam.` : `Held through the whole ${beam.windup.toFixed(1)} s windup: the beam lands.`;
      g.fillStyle = beam.r.miss ? C.redDk : '#1a6b3c'; g.font = '700 19px Jost, sans-serif'; g.textAlign = 'left'; g.fillText(msg, x0, y + 150);
    }
  }

  /* =====================================================================
     Slide 5: two setups converge (deck slides 238-240)
     ===================================================================== */
  const W5 = 1420, H5 = 600;
  const CV_PLAYERS = [[230, 300], [1190, 300], [710, 520], [710, 70]];
  const CONVERGE = [
    { name: 'Setup A, then Setup B', dur: 4.8, events: [{ t: .5, p: 0, el: 'water', label: 'Water · Setup A' }, { t: 1.6, p: 1, el: 'chill', label: 'Chill · Setup B' }, { t: 2.8, p: 2, el: 'rock', label: 'Rock · Payoff' }] },
    { name: 'Setup B, then Setup A', dur: 4.8, events: [{ t: .5, p: 1, el: 'chill', label: 'Chill · Setup B' }, { t: 1.6, p: 0, el: 'water', label: 'Water · Setup A' }, { t: 2.8, p: 2, el: 'rock', label: 'Rock · Payoff' }] },
    { name: 'Only Setup A', dur: 3.8, events: [{ t: .5, p: 0, el: 'water', label: 'Water · Setup A' }, { t: 1.7, p: 2, el: 'rock', label: 'Rock · Payoff' }] },
    { name: 'A + B → Exploit → Payoff', dur: 6.0, minions: [[520, 170], [900, 170]], events: [{ t: .5, p: 0, el: 'water', label: 'Water · Setup A' }, { t: 1.3, p: 1, el: 'chill', label: 'Chill · Setup B' }, { t: 2.2, p: 3, el: 'pull', label: 'Pull · Exploit' }, { t: 3.3, p: 2, el: 'rock', label: 'Rock · Payoff' }] },
  ].map(k => ({ ...k, S: sim({ players: CV_PLAYERS, enemy: { x: 710, y: 270 }, events: k.events.map(e => ({ ...e, stage: /Setup/.test(e.label) ? 'setup' : /Exploit/.test(e.label) ? 'exploit' : 'payoff' })), minions: k.minions }) }));
  function drawConverge(g, t, o = {}) {
    const { k, t: u } = take(CONVERGE, t), S = k.S;
    arena(g, 0, 0, W5, H5);
    drawScene(g, S, u, { only: k.minions ? null : [0, 1, 2], labelSide: [1, -1, 1, 1] });
    if (!o.quiet) T.label(k.name, 24, 46, 'left', '#fff', 18, 'rgba(21,32,68,.92)');
    damage(g, S, u, W5 - 24, 46);
  }

  /* =====================================================================
     Slide 6: the sandbox (beats)
     ===================================================================== */
  const SW = 900, SH = 330, BEATS = 8, BEAT = .9, TAIL = 1.4;
  const KIT = [['water', 'root'], ['chill', 'shock'], ['rock', 'beam'], ['mark', 'topple']];
  const ALL = KIT.flat();
  // beat rules: dur in beats; used = states this hit fed on (for chain tracking)
  const BRULE = {
    water: s => s.chilled ? { dmg: 10, add: { frozen: 2 }, take: ['chilled'], used: ['chilled'], word: 'Frozen', ok: 1, stage: 'exploit' } : { dmg: 5, add: { wet: 3 }, word: 'Wet', ok: 1, stage: 'setup' },
    chill: s => s.wet ? { dmg: 10, add: { frozen: 2 }, take: ['wet'], used: ['wet'], word: 'Frozen', ok: 1, stage: 'exploit' } : { dmg: 5, add: { chilled: 3 }, word: 'Chilled', ok: 1, stage: 'setup' },
    root: s => ({ dmg: 5, add: { rooted: 2 }, word: 'Rooted', ok: 1, stage: 'setup' }),
    shock: s => s.wet ? { dmg: 30, add: { stunned: 2 }, take: ['wet'], used: ['wet'], word: 'Stunned! 30', ok: 1, big: 1, stage: 'payoff' } : { dmg: 10, word: 'Zap 10', stage: 'payoff', meh: 1 },
    rock: s => s.frozen ? { dmg: 80, take: ['frozen'], used: ['frozen'], word: 'Shattered! 80', ok: 1, big: 1, stage: 'payoff' } : { dmg: 5, word: 'Bonk 5', stage: 'payoff', meh: 1 },
    beam: s => HELD(s) ? { dmg: 60, used: ['rooted', 'frozen', 'stunned', 'knocked'].filter(k => s[k]), word: 'Beam lands! 60', ok: 1, big: 1, stage: 'payoff' } : { dmg: 0, word: 'Missed', miss: 1, stage: 'payoff', meh: 1 },
    mark: s => ({ dmg: 0, add: { vulnerable: 3 }, word: 'Marked', ok: 1, stage: 'setup' }),
    topple: s => (s.stunned || s.rooted) ? { dmg: 15, add: { knocked: 2 }, used: ['stunned', 'rooted'].filter(k => s[k]), word: 'Knocked down', ok: 1, stage: 'exploit' } : { dmg: 5, word: 'Shove 5', stage: 'exploit', meh: 1 },
  };
  const NAME = Object.fromEntries(Object.entries(EL).map(([k, v]) => [k, v.name]));
  function beatSim(P, solo) {
    const beats = [], st = {}; let total = 0;
    for (let b = 0; b < BEATS; b++) {
      const before = {}; Object.keys(st).forEach(k => { if (st[k].until >= b) before[k] = st[k]; });
      const flags = Object.fromEntries(Object.keys(before).map(k => [k, true]));
      const acts = [];
      P.forEach((row, who) => {
        const id = row[b]; if (!id) return;
        const r = { ...BRULE[id](flags) };
        const used = [...(r.used || [])];
        if (r.ok && r.big && flags.vulnerable) { r.dmg = Math.round(r.dmg * 1.5); r.word = r.word.replace(/\d+$/, r.dmg) + ' (Marked ×1.5)'; used.push('vulnerable'); r.take = [...(r.take || []), 'vulnerable']; }
        const src = r.ok ? used.map(k => before[k]?.chain || []).sort((x, y) => y.length - x.length) : [];
        const merged = []; src.forEach(c => c.forEach(a => { if (!merged.includes(a)) merged.push(a); }));
        merged.sort((x, y) => x.b - y.b || x.who - y.who);
        const a = { who: solo ? 0 : who, id, b, ...r };
        a.chain = [...merged, a];
        acts.push(a); total += r.dmg;
      });
      acts.forEach(a => {
        (a.take || []).forEach(k => delete st[k]);
        Object.entries(a.add || {}).forEach(([k, n]) => { st[k] = { until: b + n, chain: a.chain }; });
      });
      Object.keys(st).forEach(k => { if (st[k].until <= b) delete st[k]; });
      beats.push({ acts, states: before, total });
    }
    const chains = beats.flatMap(x => x.acts).filter(a => a.big && a.chain.length > 1).map(a => a.chain);
    return { P, solo, beats, total, chains, dur: BEATS * BEAT + TAIL };
  }
  const SB_POS = [[170, 62], [130, 126], [170, 190], [130, 254]];
  const sbStates = (S, t) => { const b = Math.floor(t / BEAT); if (b < 0 || b >= BEATS) return {}; const k = (t - b * BEAT) / BEAT; return k > .7 ? (S.beats[b + 1]?.states || {}) : S.beats[b].states; };
  function sbEnemy(S, t) { let ph = 0; for (let s = 0; s < Math.min(t, BEATS * BEAT); s += .03) ph += .03 * (HELD(sbStates(S, s)) ? 0 : 2.2); return [660, 165 + Math.sin(ph) * 56]; }
  function drawSandbox(g, S, t, o = {}) {
    arena(g, 0, 0, SW, SH);
    const st = sbStates(S, t), [ex, ey] = sbEnemy(S, t), b = Math.min(BEATS - 1, Math.floor(t / BEAT)), k = (t - b * BEAT) / BEAT, done = t >= BEATS * BEAT;
    // the enemy with its chips (dur in beats, so the bars are drawn from the beat it ends)
    const fake = { en: { r: 30 }, pos: () => [ex, ey], stateAt: () => Object.fromEntries(Object.entries(st).map(([kk, v]) => [kk, { until: v.until * BEAT + BEAT, dur: 3 * BEAT }])) };
    drawEnemy(g, fake, t, { chipNames: false });
    const pos = S.solo ? [[150, 165]] : SB_POS;
    pos.forEach((p, i) => token(g, i, p[0], p[1], Math.atan2(ey - p[1], ex - p[0]), { s: .9, name: S.solo ? 'P1 (solo)' : null }));
    if (!done && S.beats[b]) S.beats[b].acts.forEach(a => {
      const p = pos[a.who], u = clamp((k - .15) / .4);
      if (!o.quiet) T.label(NAME[a.id], p[0] + 34, p[1] - 4, 'left', '#fff', 13, STAGE[a.stage]);
      if (u <= 0) return;
      const tx = a.miss ? ex + 20 : ex, ty = a.miss ? ey + 80 : ey;
      if (u < 1) { const x = lerp(p[0] + 24, tx, ease(u)), y = lerp(p[1], ty, ease(u)); disc(g, x, y, 12, EL[a.id].col, EL[a.id].glyph); }
      else {
        const v = clamp((k - .55) / .45);
        if (!a.miss && !a.meh && v < .3) T.flash(ex, ey, a.big ? 70 : 40, 1 - v / .3);
        T.popText(a.word, ex + 150, ey - 70 + (S.solo ? 0 : S.beats[b].acts.indexOf(a)) * 30 - v * 12, a.big ? C.goldInk : a.meh ? '#7a7f9e' : STAGE[a.stage], 1 - v * .6);
      }
    });
    const tot = done ? S.total : (b > 0 ? S.beats[b - 1].total : 0) + (k > .55 && S.beats[b] ? S.beats[b].acts.reduce((s, a) => s + a.dmg, 0) : 0);
    T.label(`Damage: ${tot}`, SW - 24, 46, 'right', C.ink, 20);
    if (o.cap) T.label(o.cap, SW - 24, SH - 46, 'right', '#fff', 16, 'rgba(21,32,68,.9)');
  }
  const plan = rows => rows.map(r => r.split(' ').map(x => x === '.' ? '' : x));
  const PRESETS = [
    { name: 'Everyone on their own', sub: 'each player repeats one attack', plan: plan(['root root root root root root root root', 'shock shock shock shock shock shock shock shock', 'rock rock rock rock rock rock rock rock', 'mark mark mark mark mark mark mark mark']) },
    { name: 'Water → Shock', sub: 'one-two combo · P1 then P2', plan: plan(['water . . water . . water .', '. shock . . shock . . shock', '. . . . . . . .', '. . . . . . . .']) },
    { name: 'Water + Chill → Rock', sub: 'two setups, one payoff', plan: plan(['water . . . water . . .', '. chill . . . chill . .', '. . rock . . . rock .', '. . . . . . . .']) },
    { name: 'Root → Topple → Beam', sub: 'setup, exploit, payoff', plan: plan(['root . . . root . . .', '. . . . . . . .', '. . beam . . . beam .', '. topple . . . topple . .']) },
    { name: 'The whole team', sub: 'Mark, then two chains back to back', plan: plan(['water . . root . . . .', '. chill . . . . . .', '. . rock . . beam . .', 'mark . . . topple mark . .']) },
    { name: 'Solo: Water, Chill, Rock', sub: 'one player, one action every other beat', solo: 1, plan: plan(['water . chill . rock . . .']) },
  ];
  const SB_SIMS = PRESETS.map(p => beatSim(p.plan, !!p.solo));

  /* =====================================================================
     Wiring: every slide is a pure function of time, so __seek(t, which) can record it
     ===================================================================== */
  const SEEK = {};
  function scene(name, W, H, draw, dur) {
    canvasDemo(name, (s, cv, g) => {
      const st = { t: 0, held: false };
      const render = () => { T.use(g); g.clearRect(0, 0, cv.width, cv.height); fitTo(g, cv, W, H, () => draw(g, st.t)); };
      SEEK[name] = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => dur };
      return dt => { if (!st.held) st.t += dt; render(); };
    });
  }
  scene('title', W2, H2, (g, t) => drawTabs(g, t % TABS[0].dur, { quiet: true }), TABS[0].dur);
  scene('tabs', W2, H2, drawTabs, totalDur(TABS));
  scene('hands', W3, H3, drawHands, HANDS_DUR);
  scene('window', W4, H4, drawWindow, totalDur(WINDOW));
  scene('converge', W5, H5, drawConverge, totalDur(CONVERGE));

  canvasDemo('sandbox', (s, cv, g) => {
    const grid = $(s, '.sb-grid'), out = $(s, '.sb-out'), total = $(s, '.sb-total'), soloBtn = $(s, '.sb-solo');
    const st = { P: PRESETS[2].plan.map(r => r.slice()), solo: false, t: 0, playing: true, tour: false, tt: 0, held: false, last: '' };
    let S = beatSim(st.P, st.solo);
    $(s, '.sb-presets').innerHTML = PRESETS.map((p, i) => `<button class="pre" data-i="${i}"><b>${p.name}</b><span>${p.sub}</span></button>`).join('');
    const TOUR = [0, 1, 2, 3, 5], D = SB_SIMS[0].dur, tourAt = tt => { const i = Math.floor((tt % (D * TOUR.length)) / D); return { i: TOUR[i], t: tt % D }; };
    function buildGrid() {
      const rows = st.solo ? [{ name: 'P1 (solo)', col: PC[0], kit: ALL }] : KIT.map((kit, i) => ({ name: `P${i + 1}`, col: PC[i], kit }));
      grid.innerHTML = `<div class="gh"></div>` + Array.from({ length: BEATS }, (_, b) => `<div class="gh">Beat ${b + 1}</div>`).join('') +
        rows.map((r, w) => `<div class="gp" style="--c:${r.col}">${r.name}</div>` + Array.from({ length: BEATS }, (_, b) => `<button class="cell${st.solo && b % 2 ? ' off' : ''}" data-w="${w}" data-b="${b}"></button>`).join('')).join('');
      $$(grid, '.cell').forEach(c => c.onclick = () => {
        const w = +c.dataset.w, b = +c.dataset.b; if (st.solo && b % 2) return;
        const kit = ['', ...(st.solo ? ALL : KIT[w])], cur = st.P[w][b];
        st.P[w][b] = kit[(kit.indexOf(cur) + 1) % kit.length]; st.tour = false; set();
      });
    }
    function paintGrid(Sx, t) {
      const b = Math.floor(t / BEAT);
      $$(grid, '.cell').forEach(c => {
        const w = +c.dataset.w, bb = +c.dataset.b, id = Sx.P[w]?.[bb], a = Sx.beats[bb].acts.find(x => x.who === w && x.b === bb);
        c.className = `cell ${Sx.solo && bb % 2 ? 'off' : ''} ${a ? a.stage : ''} ${bb === b ? 'now' : ''} ${a && bb < b ? (a.big ? 'big' : a.meh ? 'meh' : '') : ''}`;
        c.textContent = id ? NAME[id] : '';
      });
    }
    const chainText = ch => ch.map(a => `<span class="chip ${a.stage === 'setup' ? '' : a.stage === 'exploit' ? 'gold' : 'red'}">${st.solo || ch.solo ? 'P1' : 'P' + (a.who + 1)}: ${NAME[a.id]}</span>`).join('<i>→</i>');
    function report(Sx, name) {
      const key = name + Sx.solo + JSON.stringify(Sx.P); if (key === st.last) return; st.last = key;
      const own = SB_SIMS[0].total;
      say(total, `<b>${Sx.total}</b><span>damage in ${BEATS} beats${name ? ` · ${name}` : ''}${Sx === SB_SIMS[0] ? '' : ` · everyone on their own: ${own}`}</span>`);
      say(out, Sx.chains.length === 0 ? `<b class="warn">No chains.</b> No payoff landed on a state another ability set up, so each player is running their own loop side by side.`
        : `<b style="color:#1a6b3c">${Sx.chains.length} payoff${Sx.chains.length > 1 ? 's' : ''} landed on a set-up target:</b>` + Sx.chains.map(ch => `<div class="chain">${chainText(ch)}</div>`).join('') + (Sx.solo ? `<div style="margin-top:6px">Solo, the chain needs five beats because of the cooldown. Split across players it fits in three.</div>` : ''));
    }
    const set = () => { S = beatSim(st.P, st.solo); st.t = 0; st.playing = true; };
    const setSolo = on => { st.solo = on; soloBtn.classList.toggle('on', on); soloBtn.textContent = on ? 'Split across 4 players' : 'One player does it all'; buildGrid(); };
    $$(s, '.pre').forEach(b => b.onclick = () => { const p = PRESETS[+b.dataset.i]; setSolo(!!p.solo); st.P = p.plan.map(r => r.slice()); st.tour = false; set(); });
    $(s, '.sb-play').onclick = () => { st.tour = false; st.t = 0; st.playing = true; };
    $(s, '.sb-clear').onclick = () => { st.P = (st.solo ? [0] : KIT).map(() => Array(BEATS).fill('')); st.tour = false; set(); };
    soloBtn.onclick = () => { setSolo(!st.solo); st.P = (st.solo ? [0] : KIT).map(() => Array(BEATS).fill('')); st.tour = false; set(); };
    buildGrid();
    function render() {
      let Sx = S, t = st.t, name = '';
      if (st.tour) { const a = tourAt(st.tt); Sx = SB_SIMS[a.i]; t = a.t; name = PRESETS[a.i].name; if (Sx.solo !== st.solo) setSolo(Sx.solo); }
      else { const i = PRESETS.findIndex(p => !!p.solo === st.solo && JSON.stringify(p.plan) === JSON.stringify(st.P)); name = i >= 0 ? PRESETS[i].name : 'your plan'; }
      $$(s, '.pre').forEach((b, i) => b.classList.toggle('on', !!PRESETS[i].solo === Sx.solo && JSON.stringify(PRESETS[i].plan) === JSON.stringify(Sx.P)));
      T.use(g); g.clearRect(0, 0, cv.width, cv.height);
      fitTo(g, cv, SW, SH, () => drawSandbox(g, Sx, Math.min(t, Sx.dur), { cap: st.tour ? name : '' }));
      paintGrid(Sx, Math.min(t, Sx.dur)); report(Sx, name);
    }
    SEEK.sandbox = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => D * TOUR.length };
    return dt => { if (!st.held) { st.tt += dt; if (st.playing) st.t += dt; if (!st.tour && st.t > S.dur + 1.2) st.t = 0; } render(); };
  });

  window.__seek = (t, which) => SEEK[which].seek(t);
  window.__dur = which => SEEK[which].dur();
  window.__SEQ = { sim, beatSim, TABS, WINDOW, CONVERGE, SOLO, TEAM, SB_SIMS, PRESETS };
})();
