/* Cancel playground (DGMS Module 5, Part 7: cancel philosophies, about slides 329-392).
   Every demo is a deterministic frame simulation: live play steps it with real time, and the walk-throughs are
   event scripts fired against the same simulation, so window.__seek(t, which) can rebuild any moment for GIFs.
   All frame counts are illustrative approximations at 60 fps, not data from a shipped game. */
(function () {
  const { $, $$, canvasDemo, say, ptr } = FPF.kit;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIn = t => clamp(t, 0, 1) ** 2;
  const FPS = 60;
  const PH = { s: '#3fbf4f', a: '#e23a3a', r: '#3b8cff', idle: '#6f7a99', dodge: '#2fc6b5', stun: '#f0a35e', act: '#ffb951' };
  const OK = { ok: '#5fe0a0', no: '#ff6b6b', arm: '#ffd166' };
  const INK = '#262c6a', MUTED = '#5d618c', PAPER = '#fffaf0', EDGE = '#cdbf9f', NAVY = '#152044';

  /* ---------- drawing helpers ---------- */
  function label(g, text, x, y, { col = INK, size = 16, weight = 600, align = 'center', base = 'middle' } = {}) {
    g.font = `${weight} ${size}px Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(text, x, y);
  }
  function panel(g, x, y, w, h, { fill = PAPER, stroke = EDGE, r = 12, lw = 2 } = {}) {
    g.save(); g.fillStyle = fill; g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); if (stroke) g.stroke(); g.restore();
  }
  function pill(g, text, x, y, { bg = '#d8f0df', fg = '#145c33', bd = '#5fb47c', size = 16, align = 'center', maxW = 520 } = {}) {
    g.font = `600 ${size}px Jost, sans-serif`;
    let t = text; while (g.measureText(t).width > maxW - 24 && t.length > 4) t = t.slice(0, -2);
    if (t !== text) t = t.trimEnd() + '…';
    const w = g.measureText(t).width + 24, h = size + 14, x0 = align === 'center' ? x - w / 2 : x;
    panel(g, x0, y - h / 2, w, h, { fill: bg, stroke: bd, r: 8 });
    label(g, t, x0 + w / 2, y + 1, { col: fg, size });
    return w;
  }
  // a frame strip in the style of pvp/core-actions: one tick per frame, tall ticks every 5 frames and on phase changes
  function ticks(g, X, from, to, colOf, y, h = 18, { alpha = 1, w = 2 } = {}) {
    g.save(); g.globalAlpha *= alpha;
    for (let i = from; i <= to; i++) {
      const c = colOf(i), big = i % 5 === 0 || (i > from && colOf(i - 1) !== c);
      g.fillStyle = c; g.fillRect(X(i) - w / 2, y - (big ? h : h * .6), w, big ? 2 * h : 1.2 * h);
    }
    g.restore();
  }
  function seg(g, X, a, b, col, y, txt, ly, size = 14) {
    g.fillStyle = col; g.fillRect(X(a), y - 3, X(b) - X(a), 6);
    if (txt) label(g, txt, (X(a) + X(b)) / 2, ly, { col, size });
  }

  // the swordfighter is Pip from the shared cast (assets/cast.js), facing right; y is the ground.
  // P.arm is the weapon angle in radians (0 points forward, negative is up), as the pose code below produces it.
  const RD = 180 / Math.PI, FS = .75;
  const castPose = P => {
    if (P.roll) return CAST.roll(((-P.roll / TAU) % 1 + 1) % 1);
    const crouch = clamp((P.crouch || 0) / 12, 0, .6), w = 90 - (P.arm ?? -0.7) * RD;
    const base = P.guard ? 'block' : CAST.hold(w);
    return { base: crouch ? CAST.mix(base, 'crouch', crouch) : base, lift: (P.air || 0) / FS, ...(P.guard ? {} : { w }), ...(P.lean ? { lean: P.lean * RD } : {}) };
  };
  const castOpts = (x, y, P, arm) => ({ x, y, s: FS * (P.scale || 1), pose: castPose(arm == null ? P : { ...P, arm }), weapon: P.weapon === 1 ? 'axe' : 'sword',
    flash: P.flash || 0, alpha: P.alpha ?? 1, trim: P.stance ? '#ff7a2a' : '#2f7bff' });
  function fighter(g, x, y, P = {}) {
    if (P.trail) {   // the swing's arc, traced by the weapon tip
      const [t0, t1, tc] = P.trail;
      g.save(); g.globalAlpha *= .4; g.strokeStyle = tc; g.lineWidth = 18 * (P.scale || 1); g.lineCap = 'round'; g.beginPath();
      for (let q = 0; q <= 10; q++) { const t = CAST.tip('pip', castOpts(x, y, P, lerp(t0, t1, q / 10))); q ? g.lineTo(t.x, t.y) : g.moveTo(t.x, t.y); }
      g.stroke(); g.restore();
    }
    CAST.draw(g, 'pip', castOpts(x, y, P));
    if (P.guard) { const k = P.scale || 1; g.strokeStyle = 'rgba(47,123,255,.55)'; g.lineWidth = 6; g.beginPath(); g.arc(x + 10 * k, y - 60 * k, 46 * k, -1.1, 1.1); g.stroke(); }
  }
  function dummy(g, x, y, flash = 0, far = false) {
    g.save(); g.globalAlpha *= far ? .55 : 1;
    g.fillStyle = '#8a5a2b'; g.fillRect(x - 4, y - 70, 8, 70);
    g.fillStyle = '#c99a5b'; g.strokeStyle = '#7a4a1e'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x - 16, y - 96, 32, 46, 10); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, y - 108, 12, 0, TAU); g.fill(); g.stroke();
    g.fillRect(x - 30, y - 82, 60, 7);
    if (flash > 0) { g.globalAlpha = flash * .8; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - 80, 34, 0, TAU); g.fill();
      g.globalAlpha = flash; g.strokeStyle = '#e23a3a'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; g.beginPath(); g.moveTo(x + Math.cos(q) * 22, y - 80 + Math.sin(q) * 22); g.lineTo(x + Math.cos(q) * 40, y - 80 + Math.sin(q) * 40); g.stroke(); } }
    g.restore();
  }
  function keycap(g, x, y, w, h, key, name, tone) {
    const bg = tone === 'ok' ? '#d8f0df' : tone === 'no' ? '#f9d9d6' : tone === 'arm' ? '#fde9b8' : PAPER;
    const bd = tone === 'ok' ? '#2fae63' : tone === 'no' ? '#e5322d' : tone === 'arm' ? '#e0a92d' : EDGE;
    panel(g, x, y, w, h, { fill: bg, stroke: bd, r: 8, lw: tone ? 3 : 2 });
    label(g, key, x + 10, y + h / 2, { size: 17, weight: 700, align: 'left' });
    label(g, name, x + w - 8, y + h / 2, { size: 13.5, col: MUTED, align: 'right', weight: 500 });
  }

  /* ---------- a runner: live stepping plus scripted walk-throughs that can be sought ---------- */
  function fire(S, sc) {
    while (S.ei < sc.length) {
      const e = sc[S.ei];
      if (S.n - S.eAt < (e.wait || 0)) return;
      if (e.when && !e.when(S)) return;
      if (e.do) e.do(S);
      if (e.cap != null) S.cap = e.cap;
      S.ei++; S.eAt = S.n;
    }
  }
  function runner(fresh, step, scripts, tail = 90) {
    const R = { S: fresh(), tour: Object.keys(scripts)[0], held: false, acc: 0, speed: 1, durs: {} };
    const frame = (S, sc) => { if (sc) fire(S, sc); step(S); };
    R.dur = w => {
      if (R.durs[w] == null) { const S = fresh(), sc = scripts[w]; let i = 0; while (S.ei < sc.length && i < 9000) { frame(S, sc); i++; } R.durs[w] = (i + tail) / FPS; }
      return R.durs[w];
    };
    R.seek = (t, w) => { R.held = true; R.tour = w; R.S = fresh(); const n = Math.round(t * FPS), sc = scripts[w]; for (let i = 0; i < n; i++) frame(R.S, sc); };
    R.start = w => { R.tour = w; R.S = fresh(); R.acc = 0; R.held = false; };
    R.free = () => { R.tour = null; R.held = false; };
    R.tick = dt => {
      if (R.held) return;
      R.acc += dt * FPS * R.speed;
      while (R.acc >= 1) { R.acc--; frame(R.S, R.tour && scripts[R.tour]); }
      if (R.tour && R.S.n / FPS > R.dur(R.tour)) R.start(R.tour);
    };
    return R;
  }
  const base = () => ({ n: 0, ei: 0, eAt: 0, cap: '' });
  // keys a slide listens to while it is showing (captured before the deck's own shortcuts)
  function keys(s, map) {
    addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest?.('input:not([type=checkbox]):not([type=range]), textarea, select')) return;
      const k = e.code === 'Space' ? 'SP' : e.code.startsWith('Key') ? e.code.slice(3) : null;
      if (!k || !(k in map)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur?.();
      if (!e.repeat) map[k]();
    }, true);
  }

  /* =====================================================================
     Slide 1: one strike, three philosophies (no cancel, IASA frames, free cancel)
     ===================================================================== */
  const ST = { s: 12, a: 4, r: 24 }; ST.A0 = ST.s; ST.A1 = ST.s + ST.a; ST.E = ST.A1 + ST.r; ST.IASA = ST.A1 + 14;
  const DODGE = 24, CYC = 108;
  const LANES = [
    { id: 'none', name: 'No cancel', sub: 'the whole strike plays out', at: P => Math.max(P, ST.E) },
    { id: 'iasa', name: 'IASA frames', sub: `follow-through from frame ${ST.IASA}`, at: P => Math.max(P, ST.IASA) },
    { id: 'free', name: 'Free cancel', sub: 'any frame, at once', at: P => P },
  ];
  const strikePhase = f => f < ST.A0 ? 's' : f < ST.A1 ? 'a' : f < ST.E ? 'r' : 'idle';
  function strikePose(f) {
    const ph = strikePhase(f);
    if (ph === 's') return { arm: lerp(-0.7, -2.6, ease(f / ST.s)), crouch: 4 * f / ST.s };
    if (ph === 'a') { const p = (f - ST.A0) / ST.a, a = lerp(-2.6, 0.9, p); return { arm: a, trail: [-2.6, a, '#e23a3a'] }; }
    if (ph === 'r') return { arm: lerp(0.9, -0.7, easeIn((f - ST.A1) / ST.r)) };
    return { arm: -0.7 };
  }
  function dodgePose(t) { const p = t / DODGE; return { roll: -TAU * ease(p), dx: -70 * Math.sin(Math.PI * p), arm: 0.4, crouch: 10 }; }

  canvasDemo('cp-commit', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.cm-out'), stats = $(s, '.cm-stats'), tourBtn = $(s, '.cm-tour'), slowBtn = $(s, '.cm-slow');
    const fresh = () => ({ ...base(), t: 0, cyc: 0, P: null, lastP: null });
    const step = S => { S.n++; S.t++; if (S.t >= CYC) { S.t = 0; S.cyc++; S.lastP = S.P; S.P = null; } };
    const press = S => { if (S.P == null && S.t < ST.E) S.P = S.t; };
    const at = (f, cap) => ({ when: S => S.t === f, do: press, cap });
    const tour = [
      { cap: 'The same strike plays in all three rows. Watch what one dodge press does to each.' },
      ...[[6, 'A press in the startup. No cancel waits for the whole strike, IASA waits for the follow-through, and free cancel dodges at once.'],
        [14, 'A press in the active frames. Free cancel pulls out mid-swing, so the strike never finishes.'],
        [24, 'A press early in the recovery. IASA still holds you until the follow-through begins.'],
        [33, 'A press in the follow-through. IASA and free cancel now agree; only no cancel still makes you wait.']]
        .flatMap(([f, cap]) => [at(f, cap), { when: S => S.t === CYC - 1 }, at(f), { when: S => S.t === CYC - 1 }]),
    ];
    const R = runner(fresh, step, { commit: tour }, 2);
    s._cm = R;
    const goLive = () => { if (R.tour) { R.free(); tourBtn.classList.remove('on'); R.S.cap = ''; } };
    const doPress = () => { goLive(); if (R.S.t >= ST.E) { R.S.t = 0; R.S.P = null; } else press(R.S); };
    $(s, '.cm-press').onclick = doPress;
    keys(s, { K: doPress });
    tourBtn.onclick = () => { R.start('commit'); tourBtn.classList.add('on'); };
    slowBtn.onclick = () => { R.speed = R.speed === 1 ? .3 : 1; slowBtn.classList.toggle('on', R.speed !== 1); };

    let statKey = '';
    return dt => {
      R.tick(dt);
      const S = R.S, t = S.t, P = S.P;
      g.clearRect(0, 0, W, H);
      label(g, '“The feeling of being locked into a course of action after it is input.”', W / 2, 22, { size: 21, weight: 600, col: INK });
      label(g, 'Commitment, as the deck defines it. Frame counts are illustrative, at 60 fps.', W / 2, 50, { size: 15, col: MUTED, weight: 500 });
      const x0 = 300, x1 = W - 24, X = f => x0 + f * (x1 - x0) / (CYC - 20);
      const res = [];
      LANES.forEach((ln, i) => {
        const y0 = 74 + i * 166, h = 154, cy = y0 + 100;
        panel(g, 0, y0, W, h, { fill: i % 2 ? '#f6f0e1' : PAPER });
        label(g, ln.name, 16, y0 + 24, { size: 21, weight: 700, align: 'left' });
        label(g, ln.sub, 16, y0 + 48, { size: 14.5, col: MUTED, align: 'left', weight: 500 });
        const C = P == null ? null : ln.at(P);
        // the fighter
        let pose;
        if (C != null && t >= C && t < C + DODGE) { const d = dodgePose(t - C); pose = { ...d }; }
        else if (C != null && t >= C + DODGE) pose = { arm: -0.7 };
        else pose = strikePose(t);
        g.save(); g.beginPath(); g.rect(0, y0, 290, h); g.clip();
        fighter(g, 236 + (pose.dx || 0), y0 + h - 12, { ...pose, scale: .85 });
        g.restore();
        // strip: the strike up to the cancel point, the cut remainder, then the dodge
        const sy = y0 + 66, end = C == null ? ST.E : Math.min(C, ST.E);
        g.fillStyle = 'rgba(38,44,106,.06)'; g.fillRect(x0 - 8, y0 + 30, x1 - x0 + 16, 74);
        seg(g, X, 0, Math.min(ST.A0, end), PH.s, sy - 30, end > 4 ? 'startup' : '', sy - 42, 13);
        if (end > ST.A0) seg(g, X, ST.A0, Math.min(ST.A1, end), PH.a, sy - 30, 'active', sy - 42, 13);
        if (end > ST.A1) seg(g, X, ST.A1, end, PH.r, sy - 30, end - ST.A1 > 5 ? 'recovery' : '', sy - 42, 13);
        ticks(g, X, 0, end, f => PH[strikePhase(f)] || PH.r, sy, 16);
        if (end < ST.E) ticks(g, X, end + 1, ST.E, () => '#b9bfc9', sy, 16, { alpha: .5 });
        if (C != null) {
          // locked in: from the press until the dodge actually starts
          if (C > P) {
            g.fillStyle = 'rgba(229,50,45,.16)'; g.fillRect(X(P), sy + 22, X(C) - X(P), 18);
            g.strokeStyle = '#e5322d'; g.lineWidth = 1.5; g.strokeRect(X(P), sy + 22, X(C) - X(P), 18);
            label(g, `locked in ${C - P} f`, X(C) + 6, sy + 31, { size: 13, col: '#8a1c15', align: 'left' });
          }
          seg(g, X, C, C + DODGE, PH.dodge, sy - 30, 'dodge', sy - 42, 13);
          ticks(g, X, C, C + DODGE, () => PH.dodge, sy, 16);
          // the press
          g.fillStyle = '#e0a92d'; g.beginPath(); g.arc(X(P), sy + 31, 8, 0, TAU); g.fill();
          label(g, 'K', X(P), sy + 31, { size: 11, col: '#fff', weight: 700 });
          const sec = ((C - P) / FPS).toFixed(2);
          label(g, C === P ? 'Dodge came out on the frame you pressed.' : `Dodge waited ${C - P} frames (${sec} s) after the press.`, x0, y0 + h - 18, { size: 16, align: 'left', col: C === P ? '#145c33' : '#8a1c15' });
          res.push(C - P);
        } else {
          label(g, t < ST.E ? 'Press K during the strike.' : 'No press this time. Press K to start the next strike.', x0, y0 + h - 18, { size: 16, align: 'left', col: MUTED, weight: 500 });
          res.push(null);
        }
        if (ln.id === 'iasa') { g.strokeStyle = '#7a4a00'; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(ST.IASA), sy - 22); g.lineTo(X(ST.IASA), sy + 20); g.stroke(); g.setLineDash([]); label(g, 'IASA starts', X(ST.IASA) + 4, sy + 50, { size: 12, col: '#7a4a00', align: 'left' }); }
        // playhead
        g.fillStyle = INK; g.fillRect(X(Math.min(t, CYC - 20)) - 1.5, y0 + 28, 3, 82);
      });
      const k = res.join(',');
      if (k !== statKey) {
        statKey = k;
        stats.innerHTML = LANES.map((ln, i) => `<div class="${res[i] == null ? '' : res[i] === 0 ? 'g' : res[i] > 15 ? 'r' : 'y'}"><b>${res[i] == null ? '·' : res[i] + ' f'}</b><span>${ln.name}: locked in after the press</span></div>`).join('');
      }
      say(out, R.tour ? S.cap : 'More commitment makes each choice weigh more and makes attacks readable; less makes the controls feel responsive. IASA frames are the middle road: commit to the swing, but not to its follow-through.');
    };
  }, { init(s) { window.__cpReg('commit', s._cm, s); } });

  /* =====================================================================
     Slide 2: the cancel playground
     ===================================================================== */
  const HITS = [
    { name: 'Slash 1', s: 10, a: 4, r: 18, up: -2.6, down: 0.9 },
    { name: 'Slash 2', s: 9, a: 4, r: 20, up: 2.0, down: -1.3 },
    { name: 'Leap slam', s: 16, a: 6, r: 28, up: -2.9, down: 1.2, leap: true },
  ];
  { let o = 0; HITS.forEach(h => { h.S = o; h.A0 = o + h.s; h.A1 = h.A0 + h.a; h.E = h.A1 + h.r; o = h.E; }); }
  const MOVE = HITS[2].E, IDLE = 12, LOOP = MOVE + IDLE, FLINCH = 30;
  const hitAt = f => HITS.findIndex(h => f >= h.S && f < h.E);
  const phaseAt = f => { const i = hitAt(f); if (i < 0) return 'idle'; const h = HITS[i]; return f < h.A0 ? 's' : f < h.A1 ? 'a' : 'r'; };
  const PHN = { s: 'startup', a: 'active', r: 'recovery', idle: 'neutral' };
  const [H1, H2, H3] = HITS;
  const per = (idx, fn) => idx.map(i => fn(HITS[i]));
  const PLAYER = ['J', 'O', 'K', 'L', 'SP', 'U', 'I'];
  const KEYS = [['J', 'Attack'], ['O', 'Special'], ['K', 'Dodge'], ['L', 'Block'], ['SP', 'Jump'], ['U', 'Switch'], ['I', 'Stance'], ['F', 'Feint'], ['H', 'Take a hit']];
  const KNAME = { J: 'J (attack)', O: 'O (special)', K: 'K (dodge)', L: 'L (block)', SP: 'Space (jump)', U: 'U (switch weapon)', I: 'I (stance)', F: 'F (feint)', H: 'a hit on you' };
  const ACT = { dodge: 26, block: 20, jump: 34, special: 40, feint: 8, roll: 22 };
  const COST = { K: 25, L: 10, SP: 15, U: 10, I: 10, F: 20 };

  const CANCELS = [
    { id: 'free', lab: 'free cancel', name: 'Free', col: '#ff8fa3', keys: PLAYER, win: () => [[0, MOVE]], desc: 'Free cancel: any action can interrupt any frame of the move. The most responsive option, with no commitment at all.' },
    { id: 'iasa', lab: 'the IASA frames', name: 'IASA / follow-through', col: '#7fd6ff', keys: PLAYER, win: () => per([0, 1, 2], h => [h.A1 + Math.ceil(h.r * .6), h.E]), desc: 'IASA (interruptible as soon as) frames: the follow-through at the end of the recovery can be cut short by any action.' },
    { id: 'landing', lab: 'landing cancel', name: 'Landing', col: '#c9a3ff', keys: PLAYER, win: () => [[H3.A1, H3.A1 + 6]], desc: 'Landing cancel: the leap slam ends the moment it touches the ground, so any action can follow on the landing frames.' },
    { id: 'damage', lab: 'damage cancel', name: 'Damage', col: '#ff9b54', keys: ['H'], win: () => [[0, MOVE]], desc: 'Damage cancel: taking a hit interrupts your move and puts you into a flinch. Press H to send a hit.' },
    { id: 'armour', lab: 'super armour', name: 'Super armour', col: '#ffd166', keys: ['H'], win: () => [[H3.S + 6, H3.A1]], desc: 'Super armour: during this window an incoming hit does not cancel the leap slam. You take the damage and keep swinging.' },
    { id: 'onhit', lab: 'on-hit cancel', name: 'On-hit', col: '#5fe0a0', keys: ['J'], win: () => per([0, 1], h => [h.A0, h.A1 + 10]), desc: 'On-hit cancel: only when a slash connects can attack cancel it, here into a special. Whiff it and you stay committed.' },
    { id: 'switch', lab: 'switch cancel', name: 'Switch', col: '#b5e86b', keys: ['U'], win: () => per([0, 1], h => [h.A1 + 3, h.A1 + 13]), desc: 'Switch cancel: swapping weapons mid-string cuts the recovery and the next hit comes out with the other weapon.' },
    { id: 'jump', lab: 'jump cancel', name: 'Jump', col: '#7aa7ff', keys: ['SP'], win: () => per([0, 1, 2], h => [h.A1 + 6, h.E]), desc: 'Jump cancel: a jump cuts the recovery short once the strike is done.' },
    { id: 'defensive', lab: 'defensive cancel', name: 'Defensive', col: '#4fd1c5', keys: ['K', 'L'], win: () => HITS.flatMap(h => [[h.S, h.S + Math.floor(h.s / 2)], [h.A1 + Math.floor(h.r / 2), h.E]]), desc: 'Defensive cancel: a dodge or block can interrupt the early startup or the late recovery, never the active frames.' },
    { id: 'stun', lab: 'stun into recovery', name: 'Stun into recovery', col: '#f4a3d6', keys: ['K'], where: 'flinch', win: () => [[12, FLINCH]], desc: 'Stun into recovery: after the first frames of a flinch, a recovery roll (K) can cut the stun short.' },
    { id: 'feint', lab: 'feint', name: 'Feint', col: '#c3cbe0', keys: ['F'], win: () => [[H3.S, H3.A0 - 3]], desc: 'Feint: cancel the startup of the leap slam back to neutral, to bait a reaction. It costs stamina.' },
    { id: 'reload', lab: 'active reload', name: 'Active reload', col: '#ffe66d', keys: ['J'], win: () => [[H3.A1 + 12, H3.A1 + 16]], desc: 'Active reload: a narrow sweet spot in the slam’s long recovery. Press J inside it to skip the rest; press outside it and the recovery jams.' },
    { id: 'self', lab: 'self cancel', name: 'Self', col: '#ff7ab8', keys: ['J'], win: o => (o && o.on.has('free')) ? [[H1.S, H1.E]] : [[H1.A1 + 6, H1.E]], desc: 'Self cancel: a move cancels into itself, here the first slash restarting itself.' },
    { id: 'resource', lab: 'resource cancel', name: 'Resource', col: '#ffb951', keys: PLAYER, win: () => [[0, MOVE]], desc: 'Resource cancel: spend 50 meter to cancel anything on any frame. Meter fills when slashes connect, so the cost is the limit.' },
    { id: 'stance', lab: 'stance cancel', name: 'Stance', col: '#a0c4ff', keys: ['I'], win: () => per([0, 1], h => [h.A1 + 2, h.A1 + 12]), desc: 'Stance cancel: changing stance mid-string cuts the recovery and the string continues in the new stance.' },
    { id: 'string', lab: 'string cancel', name: 'String', col: '#9be7a8', keys: ['J'], win: () => per([0, 1], h => [h.A1, h.A1 + 12]), desc: 'String cancel: press attack in the window after each slash and the next hit of the authored string comes out.' },
    { id: 'chain', lab: 'chain cancel', name: 'Chain', col: '#d4a5ff', keys: ['O'], win: () => per([0, 1], h => [h.A0, h.A1 + 10]), desc: 'Chain cancel: a slash can cancel into a heavier move, here a special, during its active frames and early recovery.' },
  ];
  const CB = Object.fromEntries(CANCELS.map(x => [x.id, x]));
  const PRESETS = {
    souls: { on: ['iasa', 'string', 'damage', 'armour'], cap: 'Souls-style commit: a string, a late IASA follow-through, damage that interrupts you and super armour on the slam. Everything else is refused.' },
    fight: { on: ['onhit', 'chain', 'jump', 'damage', 'resource', 'stun'], cap: 'Fighting-game on-hit chain: J cancels only a slash that connects, O chains into a heavier move, and meter buys a cancel anywhere.' },
    free: { on: ['string', 'chain', 'jump', 'defensive', 'switch', 'stance', 'landing', 'iasa', 'damage'], cap: 'Character-action free set: dodge, jump, weapon and stance cancels everywhere except the active frames.' },
    clear: { on: [], cap: 'No cancels at all: every press during the string is refused.' },
  };
  // windows actually in force, given the options (stretching turns each into the whole move)
  const winOf = (cb, o) => o.wide ? [[0, cb.where === 'flinch' ? FLINCH : MOVE]] : cb.win(o);
  const inWin = (cb, o, f) => winOf(cb, o).some(([a, b]) => f >= a && f < b);
  const ORDER = { J: ['reload', 'onhit', 'string', 'self', 'free', 'iasa', 'landing', 'resource'], O: ['chain', 'free', 'iasa', 'landing', 'resource'] };
  const orderFor = k => ORDER[k] || [k === 'K' || k === 'L' ? 'defensive' : k === 'SP' ? 'jump' : k === 'U' ? 'switch' : 'stance', 'free', 'iasa', 'landing', 'resource'];

  // the anti-pattern detector, from the cancel set alone
  function detect(o) {
    const on = id => o.on.has(id), r = [];
    // 1. universal free cancel
    r.push(on('free') ? 'Free cancel is on: every action interrupts every frame of every move.' : '');
    // 2. a key that is accepted on (almost) every frame of the move, for free
    let worst = null;
    PLAYER.forEach(k => {
      const ids = orderFor(k).filter(id => id !== 'resource' && id !== 'onhit' && id !== 'reload' && on(id) && CB[id].keys.includes(k));
      let n = 0; for (let f = 0; f < MOVE; f++) if (ids.some(id => inWin(CB[id], o, f))) n++;
      if (!worst || n > worst.n) worst = { k, n };
    });
    const cov = worst ? worst.n / MOVE : 0;
    r.push(cov >= .9 ? `${KNAME[worst.k]} is accepted on ${Math.round(cov * 100)}% of the string’s frames.` : '');
    // 3. infinite loops
    r.push(on('self') && (on('free') || o.wide) ? `${on('free') ? 'Free plus self' : 'A stretched self'} cancel: mash J and Slash 1 restarts forever.` : '');
    // 4. no downsides
    const freebies = ['defensive', 'jump', 'switch', 'stance', 'feint', 'free'].filter(on);
    r.push(!o.costs && freebies.length ? `Stamina costs are off: ${freebies.map(id => CB[id].name.toLowerCase()).join(', ')} cost nothing to spam.` : '');
    // 5. option selects
    r.push(on('onhit') && (on('string') || on('free')) ? `On-hit and ${on('string') ? 'string' : 'free'} share J: one press is right whether the slash hit or missed.` : '');
    return r;
  }
  const ANTI = ['Universal free cancel', 'Window the size of the whole move', 'Infinite loop', 'Cancels with no downsides', 'Option select'];

  canvasDemo('cp-play', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.cp-out');
    const chipBox = $(s, '.cp-chips');
    chipBox.innerHTML = CANCELS.map((x, i) => `<button class="btn cp-chip" data-c="${x.id}" style="--c:${x.col}" title="${x.desc}">${i + 1}. ${x.name}</button>`).join('');
    const opts0 = () => ({ on: new Set(), connect: true, costs: true, wide: false });
    const fresh = () => ({ ...base(), mode: 'string', f: 0, hold: 0, act: null, ft: 0, conn: [false, false, false], stam: 100, meter: 30, weapon: 0, stance: 0,
      marks: [], last: null, lastKey: null, hitN: -99, info: '', opts: opts0() });
    const goto = (S, f) => { S.mode = 'string'; S.f = f; S.hold = 0; const i = hitAt(f); if (i >= 0) S.conn[i] = false; };
    const startAct = (S, kind) => { S.mode = 'action'; S.act = { kind, t: 0, dur: ACT[kind], from: S.f }; };
    function step(S) {
      S.n++;
      S.stam = Math.min(100, S.stam + (S.mode === 'action' ? 0.15 : 0.45)); S.meter = Math.min(100, S.meter + 0.05);
      if (S.mode === 'string') {
        if (S.hold > 0) S.hold--; else { S.f++; if (S.f >= LOOP) S.f = 0; }
        const i = hitAt(S.f);
        if (i >= 0 && S.f === HITS[i].S) S.conn[i] = false;
        if (i >= 0 && S.f === HITS[i].A0 && S.hold === 0 && S.opts.connect) { S.conn[i] = true; S.meter = Math.min(100, S.meter + 12); S.hitN = S.n; }
      } else if (S.mode === 'action') {
        if (++S.act.t >= S.act.dur) goto(S, 0);
      } else if (S.mode === 'flinch') {
        if (++S.ft >= FLINCH) goto(S, 0);
      }
    }
    function where(S) {
      if (S.mode === 'flinch') return `the flinch, frame ${S.ft + 1} of ${FLINCH}`;
      if (S.mode === 'action') return `the ${S.act.kind}`;
      const i = hitAt(S.f); if (i < 0) return 'neutral';
      const h = HITS[i], ph = phaseAt(S.f), st = ph === 's' ? h.S : ph === 'a' ? h.A0 : h.A1, len = ph === 's' ? h.s : ph === 'a' ? h.a : h.r;
      return `${h.name} ${PHN[ph]}, frame ${S.f - st + 1} of ${len}`;
    }
    function result(S, k, tone, by, text) {
      S.last = { tone, k, by, text, n: S.n };
      S.lastKey = { k, tone, n: S.n };
      if (S.mode === 'string' || S.mode === 'action' || tone) S.marks.push({ f: S.mode === 'flinch' ? -1 - S.ft : S.f, tone, k, by, n: S.n, col: by ? CB[by]?.col : null });
      if (S.marks.length > 10) S.marks.shift();
    }
    // a key press: find the first cancel that allows it on this frame, or explain the refusal
    function press(S, k) {
      const o = S.opts, on = id => o.on.has(id);
      const at = where(S);
      if (S.mode === 'flinch') {
        if (k === 'K' && on('stun') && inWin(CB.stun, o, S.ft)) { result(S, k, 'ok', 'stun', `Accepted by stun into recovery: a roll out of ${at}.`); startAct(S, 'roll'); return; }
        const hint = k === 'K' && !on('stun') ? ' Turn on stun into recovery to roll out.' : k === 'K' ? ' The recovery roll opens on frame 13.' : '';
        result(S, k, 'no', null, `Refused: you are stunned (${at}).${hint}`); return;
      }
      if (S.mode === 'action') { result(S, k, 'no', null, `Refused: ${at} is still playing, and nothing cancels it.`); return; }
      const f = S.f, i = hitAt(f);
      if (k === 'H') {
        if (i < 0) { result(S, k, 'ok', null, 'The hit lands in neutral: nothing to cancel, straight into a flinch.'); S.mode = 'flinch'; S.ft = 0; return; }
        if (on('armour') && inWin(CB.armour, o, f)) { result(S, k, 'arm', 'armour', `Absorbed by super armour on ${at}. The slam keeps going.`); return; }
        if (on('damage') && inWin(CB.damage, o, f)) { result(S, k, 'ok', 'damage', `Damage cancel: the hit interrupts ${at}, and you flinch.`); S.mode = 'flinch'; S.ft = 0; return; }
        result(S, k, 'no', null, `Refused: no damage cancel, so the hit lands but ${at} carries on.`); return;
      }
      if (i < 0) {   // neutral: nothing to cancel
        if (k === 'F') { result(S, k, 'no', null, 'Refused: there is no attack to feint in neutral.'); return; }
        result(S, k, 'ok', null, `Neutral: nothing to cancel, so ${KNAME[k]} comes straight out.`);
        if (k === 'J') goto(S, 0); else if (k === 'U') { S.weapon ^= 1; goto(S, 0); } else if (k === 'I') { S.stance ^= 1; goto(S, 0); }
        else startAct(S, { O: 'special', K: 'dodge', L: 'block', SP: 'jump' }[k]);
        return;
      }
      if (k === 'F') {
        if (on('feint') && inWin(CB.feint, o, f)) {
          if (o.costs && S.stam < COST.F) { result(S, k, 'no', null, `Refused: a feint needs ${COST.F} stamina.`); return; }
          if (o.costs) S.stam -= COST.F;
          result(S, k, 'ok', 'feint', `Accepted by feint: ${at} is called off, back to neutral.`); startAct(S, 'feint'); return;
        }
        result(S, k, 'no', null, `Refused on ${at}. ${on('feint') ? 'Feints only work early in the slam’s startup.' : 'Turn on feint to call off the slam’s startup.'}`); return;
      }
      for (const id of orderFor(k)) {
        if (!on(id) || !CB[id].keys.includes(k) || !inWin(CB[id], o, f)) continue;
        if (id === 'onhit' && !S.conn[i]) continue;
        if (id === 'resource') { if (S.meter < 50) continue; S.meter -= 50; }
        else if (COST[k] && o.costs) { if (S.stam < COST[k]) { result(S, k, 'no', null, `Refused: ${KNAME[k]} needs ${COST[k]} stamina and you have ${Math.floor(S.stam)}.`); return; } S.stam -= COST[k]; }
        const nm = CB[id].lab;
        // what the cancel turns into
        if (k === 'J') {
          if (id === 'onhit') { result(S, k, 'ok', id, `Accepted by on-hit: ${at} connected, so J cancels into the special.`); startAct(S, 'special'); return; }
          if (id === 'self') { result(S, k, 'ok', id, `Accepted by self cancel: ${at} restarts Slash 1.`); goto(S, H1.S); return; }
          if (id === 'reload') { result(S, k, 'ok', id, `Active reload: a perfect press on ${at}. The rest of the recovery is skipped.`); goto(S, MOVE); return; }
          const nx = (i + 1) % 3;
          result(S, k, 'ok', id, `Accepted by ${nm}: ${at} cancels into ${HITS[nx].name}.`); goto(S, HITS[nx].S); return;
        }
        if (k === 'U' || k === 'I') {
          const nx = (i + 1) % 3;
          if (k === 'U') S.weapon ^= 1; else S.stance ^= 1;
          result(S, k, 'ok', id, `Accepted by ${nm}: ${k === 'U' ? 'weapon swapped' : 'stance changed'} on ${at}, straight into ${HITS[nx].name}.`); goto(S, HITS[nx].S); return;
        }
        const kind = { O: 'special', K: 'dodge', L: 'block', SP: 'jump' }[k];
        result(S, k, 'ok', id, `Accepted by ${nm}: ${at} cancels into the ${kind}${id === 'resource' ? ' for 50 meter' : ''}.`); startAct(S, kind); return;
      }
      // refused: say why, and which cancel would have allowed it here
      if (k === 'J' && on('reload') && i === 2 && phaseAt(f) === 'r') { S.hold = 15; result(S, k, 'no', 'reload', `Missed the active reload sweet spot on ${at}: the recovery jams for 15 more frames.`); return; }
      let why = '';
      if (k === 'J' && on('onhit') && inWin(CB.onhit, o, f) && !S.conn[i]) why = ' On-hit cancel needs the slash to connect.';
      else if (on('resource') && S.meter < 50 && CB.resource.keys.includes(k)) why = ' Not enough meter for a resource cancel.';
      else {
        const fits = orderFor(k).filter(id => !on(id) && CB[id].keys.includes(k) && inWin(CB[id], o, f));
        const alt = fits.find(id => id !== 'free' && id !== 'resource') || fits[0];
        if (alt) why = ` Turning on ${CB[alt].lab} would allow it here.`;
      }
      result(S, k, 'no', null, `Refused: you are committed to ${at}.${why}`);
    }
    const applyPreset = (S, p) => { S.opts.on = new Set(PRESETS[p].on); S.info = PRESETS[p].cap; };
    const K = k => S => press(S, k);
    const opt = (name, v) => S => { S.opts[name] = v; };
    const tog = (id, v) => S => { v ? S.opts.on.add(id) : S.opts.on.delete(id); };
    const atF = (f, k, extra = {}) => ({ when: S => S.mode === 'string' && S.f === f, do: K(k), ...extra });
    const SCRIPTS = {
      play: [
        { do: S => applyPreset(S, 'souls'), cap: 'Souls-style commit. The string loops on its own; the coloured rows under the frame strip are the windows each cancel opens.' },
        atF(12, 'K', { wait: 150, cap: 'Dodge during Slash 1’s active frames: refused. You are locked into the swing.' }),
        atF(26, 'K', { wait: 100, cap: 'Dodge in the follow-through instead: the IASA window accepts it.' }),
        atF(83, 'H', { wait: 160, cap: 'A hit during the leap slam: super armour absorbs it and the slam lands anyway.' }),
        { wait: 120, when: S => S.mode === 'string' && S.f === MOVE + 2, do: S => applyPreset(S, 'fight'), cap: PRESETS.fight.cap },
        atF(16, 'J', { wait: 150, cap: 'J while Slash 1 connects: the on-hit cancel turns it into a special.' }),
        { wait: 140, do: S => { S.opts.connect = false; S.conn = [false, false, false]; S.meter = 10; }, cap: 'Now the slashes miss. On-hit is closed, so J is refused: whiff and you are committed. The chain on O does not need a hit, and Space jump-cancels.' },
        atF(18, 'J', { wait: 60 }),
        atF(20, 'O', { wait: 50 }),
        atF(54, 'SP', { wait: 30 }),
        { wait: 50, do: opt('connect', true) },
        atF(6, 'H', { wait: 60, cap: 'A hit during Slash 1’s startup: damage cancel puts you in a flinch, then K rolls out of the stun.' }),
        { when: S => S.mode === 'flinch' && S.ft === 16, do: K('K') },
        { wait: 120, when: S => S.mode === 'string' && S.f === 2, do: S => applyPreset(S, 'free'), cap: PRESETS.free.cap },
        atF(16, 'J', { wait: 150, cap: 'J continues the string, U swaps to the axe on the way into the slam, and a dodge comes out of the slam’s startup.' }),
        atF(50, 'U'),
        atF(68, 'K'),
        atF(20, 'I', { wait: 150, cap: 'Stance cancel out of Slash 1, then a landing cancel: a jump on the frame the slam touches down.' }),
        atF(89, 'SP'),
        { wait: 120, cap: 'Try it: toggle any of the seventeen chips and press the keys under the timeline.' },
        { wait: 150 },
      ],
      anti: [
        { do: S => { S.opts.on = new Set(['free']); }, cap: 'Anti-patterns 1 and 2: universal free cancel. Every press is accepted on every frame, so nothing commits.' },
        atF(12, 'K', { wait: 90 }),
        atF(84, 'L', { wait: 60 }),
        { wait: 120, when: S => S.mode === 'string' && S.f === 2, do: tog('self', true), cap: 'Anti-pattern 3: free plus self cancel. Mash J and Slash 1 restarts forever, an infinite loop.' },
        atF(12, 'J', { wait: 60 }), ...Array.from({ length: 11 }, () => atF(12, 'J', { wait: 2 })),
        { wait: 60, do: S => { applyPreset(S, 'free'); S.opts.costs = false; S.stam = 100; }, cap: 'Anti-pattern 4: cancels with no downsides. With stamina costs off, dodge spam costs nothing.' },
        atF(3, 'K', { wait: 90 }), atF(3, 'K'), atF(30, 'K'), atF(3, 'K'), atF(30, 'K'),
        { wait: 60, do: S => { S.opts.costs = true; S.opts.wide = true; }, cap: 'Anti-pattern 2 again: stretch every window to the whole move, and the dodge is accepted mid-swing.' },
        atF(12, 'K', { wait: 90 }), atF(43, 'K', { wait: 40 }),
        { wait: 90, do: S => { S.opts.wide = false; S.opts.on = new Set(['string', 'onhit', 'damage']); }, cap: 'Anti-pattern 5: option select. On-hit and string share J, so J is right whether the slash hit or missed.' },
        atF(16, 'J', { wait: 90 }),
        { wait: 80, do: S => { S.opts.connect = false; S.conn = [false, false, false]; } },
        atF(18, 'J', { wait: 30 }),
        { wait: 80, do: opt('connect', true), cap: 'The detector reads the cancel set itself. Clear the warnings by giving every cancel a cost, a window and a reason.' },
        { wait: 180 },
      ],
    };
    const R = runner(fresh, step, SCRIPTS, 30);
    s._cp = R;
    const tourBtns = $$(s, '.cp-tour');
    const goLive = () => { if (R.tour) { R.free(); tourBtns.forEach(b => b.classList.remove('on')); } };
    const userKey = k => { goLive(); press(R.S, k); };
    keys(s, { J: () => userKey('J'), O: () => userKey('O'), K: () => userKey('K'), L: () => userKey('L'), SP: () => userKey('SP'), U: () => userKey('U'), I: () => userKey('I'), F: () => userKey('F'), H: () => userKey('H') });
    tourBtns.forEach(b => b.onclick = () => { R.start(b.dataset.w); tourBtns.forEach(x => x.classList.toggle('on', x === b)); });
    $$(s, '.cp-chip').forEach(b => b.onclick = () => {
      goLive(); const id = b.dataset.c, o = R.S.opts;
      o.on.has(id) ? o.on.delete(id) : o.on.add(id);
      R.S.info = CB[id].desc + (o.on.has(id) ? '' : ' (now off)');
    });
    $$(s, '.cp-presets .btn').forEach(b => b.onclick = () => { goLive(); applyPreset(R.S, b.dataset.p); R.S.stam = 100; });
    const chk = { connect: $(s, '.cp-connect'), costs: $(s, '.cp-costs'), wide: $(s, '.cp-wide') };
    Object.entries(chk).forEach(([k, el]) => el.onchange = () => { goLive(); R.S.opts[k] = el.checked; if (k === 'connect' && !el.checked) R.S.conn = [false, false, false]; });
    // keycaps under the timeline are buttons too
    const CAP = { y: 532, h: 44, w: 108, gap: 8.5 };
    c.addEventListener('pointerdown', e => {
      const p = ptr(c, e); if (p.y < CAP.y || p.y > CAP.y + CAP.h) return;
      const i = Math.floor(p.x / (CAP.w + CAP.gap)); if (i >= 0 && i < KEYS.length && p.x - i * (CAP.w + CAP.gap) <= CAP.w) userKey(KEYS[i][0]);
    });

    let syncKey = '';
    const sync = S => {
      const o = S.opts, k = [...o.on].sort().join() + o.connect + o.costs + o.wide;
      if (k === syncKey) return; syncKey = k;
      $$(s, '.cp-chip').forEach(b => b.classList.toggle('on', o.on.has(b.dataset.c)));
      Object.entries(chk).forEach(([n, el]) => { el.checked = o[n]; });
      const match = Object.entries(PRESETS).find(([, p]) => p.on.length === o.on.size && p.on.every(id => o.on.has(id)));
      $$(s, '.cp-presets .btn').forEach(b => b.classList.toggle('on', !!match && b.dataset.p === match[0]));
    };

    function pose(S) {
      if (S.mode === 'flinch') { const p = S.ft / FLINCH; return { arm: 1.1, lean: -0.3 * (1 - p), flash: Math.max(0, 1 - S.ft / 12), dx: -18 * Math.sin(Math.min(1, p * 3) * Math.PI / 2) * (1 - p) }; }
      if (S.mode === 'action') {
        const a = S.act, p = a.t / a.dur;
        if (a.kind === 'dodge' || a.kind === 'roll') return { roll: -TAU * ease(p), dx: -90 * Math.sin(Math.PI * p), arm: .4, crouch: 10 };
        if (a.kind === 'block') return { arm: -1.45, guard: true, crouch: 4 };
        if (a.kind === 'jump') return { air: 95 * Math.sin(Math.PI * p), arm: -1.1, crouch: p < .1 || p > .9 ? 8 : 0 };
        if (a.kind === 'special') { const q = ease(p * 1.3), ang = -2.6 + q * TAU * 1.25; return { arm: ang, air: 30 * Math.sin(Math.PI * p), trail: [ang - 1.8, ang, '#ffb951'] }; }
        if (a.kind === 'feint') return { arm: lerp(-2.4, -0.7, ease(p)), crouch: 2 };
      }
      const i = hitAt(S.f); if (i < 0) return { arm: -0.7 };
      const h = HITS[i], prev = i === 0 ? -0.7 : HITS[i - 1].down;
      const air = h.leap && S.f >= h.S + 2 && S.f < h.A1 ? 80 * Math.sin(Math.PI * (S.f - h.S - 2) / (h.A1 - h.S - 2)) : 0;
      if (S.f < h.A0) return { arm: lerp(i === 0 ? -0.7 : prev, h.up, ease((S.f - h.S) / h.s)), air, crouch: 3 };
      if (S.f < h.A1) { const a = lerp(h.up, h.down, (S.f - h.A0 + 1) / h.a); return { arm: a, air, trail: [h.up, a, '#e23a3a'], dx: h.leap ? 20 : 8 }; }
      return { arm: lerp(h.down, i === 2 ? -0.7 : h.down * .8, easeIn((S.f - h.A1) / h.r)), dx: h.leap ? 20 * (1 - (S.f - h.A1) / h.r) : 0 };
    }

    // timeline geometry
    const TL = { x: 0, y: 222, w: W, h: 300, lx: 14, x0: 156, x1: 846, fx0: 872, fx1: W - 16 };
    const X = f => TL.x0 + f * (TL.x1 - TL.x0) / LOOP, FX = f => TL.fx0 + f * (TL.fx1 - TL.fx0) / FLINCH;

    return dt => {
      R.tick(dt);
      const S = R.S, o = S.opts;
      sync(S);
      g.clearRect(0, 0, W, H);

      /* ---- arena ---- */
      const flashAge = S.last ? S.n - S.last.n : 999, tone = S.last && flashAge < 50 ? S.last.tone : null;
      panel(g, 0, 0, 560, 212, { stroke: tone ? (tone === 'ok' ? '#2fae63' : tone === 'arm' ? '#e0a92d' : '#e5322d') : EDGE, lw: tone ? 4 : 2 });
      g.save(); g.beginPath(); g.roundRect(0, 0, 560, 212, 12); g.clip();
      g.fillStyle = '#e9dfc6'; g.fillRect(0, 186, 560, 26);
      const far = !o.connect, dx = far ? 470 : 318;
      dummy(g, dx, 186, Math.max(0, 1 - (S.n - S.hitN) / 10), far);
      if (far) label(g, 'out of reach', dx - 36, 150, { size: 13, col: MUTED, align: 'right' });
      const P = pose(S);
      fighter(g, 180 + (P.dx || 0), 186, { ...P, weapon: S.weapon, stance: S.stance });
      if (S.mode === 'string' && S.hold > 0) label(g, 'jammed', 180, 70, { size: 18, col: '#8a1c15', weight: 700 });
      g.restore();
      // bars
      const bar = (y, v, col, name) => { g.fillStyle = '#e3d8bf'; g.fillRect(14, y, 130, 10); g.fillStyle = col; g.fillRect(14, y, 130 * v / 100, 10); label(g, `${name} ${Math.floor(v)}`, 150, y + 5, { size: 13, col: MUTED, align: 'left', weight: 500 }); };
      bar(14, S.stam, '#2fae63', o.costs ? 'stamina' : 'stamina, free'); bar(32, S.meter, '#e0a92d', 'meter');
      label(g, `${S.weapon ? 'axe' : 'sword'} · ${S.stance ? 'low' : 'high'} stance`, 14, 60, { size: 13, col: MUTED, align: 'left', weight: 500 });
      label(g, 'Now: ' + where(S), 546, 199, { size: 14, align: 'right', col: INK });
      if (S.last && flashAge < 150) {
        const t = S.last.tone, c2 = t === 'ok' ? ['#d8f0df', '#145c33', '#5fb47c'] : t === 'arm' ? ['#fde9b8', '#7a4a00', '#e0a92d'] : ['#f9d9d6', '#8a1c15', '#e07b72'];
        g.save(); g.globalAlpha = clamp((150 - flashAge) / 30, 0, 1);
        const words = S.last.text.split(' '), lines = ['']; g.font = '600 15px Jost';
        words.forEach(w => { const tst = (lines.at(-1) + ' ' + w).trim(); if (g.measureText(tst).width > 312) lines.push(w); else lines[lines.length - 1] = tst; });
        const bh = lines.length * 19 + 12;
        panel(g, 210, 34, 340, bh, { fill: c2[0], stroke: c2[2], r: 8 });
        lines.forEach((ln, j) => label(g, ln, 222, 46 + j * 19, { size: 15, col: c2[1], align: 'left', base: 'middle' }));
        g.restore();
      }

      /* ---- anti-pattern detector ---- */
      const det = detect(o), nOn = det.filter(Boolean).length;
      panel(g, 574, 0, W - 574, 212, { stroke: nOn ? '#e5322d' : EDGE, lw: nOn ? 3 : 2 });
      label(g, 'Anti-pattern detector', 590, 20, { size: 17, weight: 700, align: 'left' });
      label(g, nOn ? `${nOn} warning${nOn > 1 ? 's' : ''}` : 'all clear', W - 16, 20, { size: 14, align: 'right', col: nOn ? '#8a1c15' : '#145c33' });
      ANTI.forEach((nm, j) => {
        const y = 48 + j * 33, hot = !!det[j];
        g.fillStyle = hot ? '#e5322d' : '#d6ccb3'; g.beginPath(); g.arc(598, y + 6, 7, 0, TAU); g.fill();
        if (hot) { g.strokeStyle = 'rgba(229,50,45,.35)'; g.lineWidth = 4; g.beginPath(); g.arc(598, y + 6, 11 + 2 * Math.sin(S.n / 6), 0, TAU); g.stroke(); }
        label(g, `${j + 1}. ${nm}`, 614, y, { size: 15, align: 'left', col: hot ? '#8a1c15' : INK, weight: hot ? 700 : 600 });
        g.font = '500 12.5px Jost'; let d = hot ? det[j] : 'Not detected.'; while (g.measureText(d).width > W - 630 && d.length > 5) d = d.slice(0, -2); if (d !== (hot ? det[j] : 'Not detected.')) d += '…';
        label(g, d, 614, y + 15, { size: 12.5, align: 'left', col: hot ? '#8a1c15' : MUTED, weight: 500 });
      });

      /* ---- timeline ---- */
      panel(g, TL.x, TL.y, TL.w, TL.h, { fill: NAVY, stroke: '#34437a' });
      label(g, 'Frame timeline', TL.lx, TL.y + 16, { size: 14, col: '#fff', align: 'left', weight: 600 });
      label(g, '60 fps, illustrative', TL.lx, TL.y + 33, { size: 12, col: '#b3bbd8', align: 'left', weight: 500 });
      const sy = TL.y + 72;
      HITS.forEach(h => {
        seg(g, X, h.S, h.A0, PH.s, sy - 30, '', 0); seg(g, X, h.A0, h.A1, PH.a, sy - 30, '', 0); seg(g, X, h.A1, h.E, PH.r, sy - 30, '', 0);
        label(g, h.name, (X(h.S) + X(h.E)) / 2, sy - 44, { size: 14, col: '#fff' });
      });
      label(g, 'idle', (X(MOVE) + X(LOOP)) / 2, sy - 44, { size: 13, col: '#b3bbd8' });
      ticks(g, X, 0, LOOP - 1, f => PH[phaseAt(f)], sy, 16);
      label(g, 'string', TL.lx, sy, { size: 14, col: '#fff', align: 'left' });
      label(g, 'startup · active · recovery', TL.lx, sy + 16, { size: 10.5, col: '#b3bbd8', align: 'left', weight: 500 });
      // the flinch, on its own strip
      label(g, 'flinch (after a hit)', (TL.fx0 + TL.fx1) / 2, sy - 44, { size: 13, col: PH.stun });
      ticks(g, FX, 0, FLINCH, () => PH.stun, sy, 12, { alpha: .9 });
      // window rows
      const rows = CANCELS.filter(cb => o.on.has(cb.id));
      const top = sy + 30, bot = TL.y + TL.h - 12, rh = rows.length ? Math.min(22, (bot - top) / rows.length) : 22;
      if (!rows.length) label(g, 'No cancels on: every press during the string is refused. Turn on chips or pick a preset.', (TL.x0 + TL.fx1) / 2 - 60, (top + bot) / 2, { size: 16, col: '#b3bbd8', weight: 500 });
      rows.forEach((cb, j) => {
        const y = top + j * rh, hh = Math.max(4, rh - 4), fl = cb.where === 'flinch', XX = fl ? FX : X;
        if (j % 2) { g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(TL.x0, y, TL.fx1 - TL.x0, rh); }
        label(g, cb.name, TL.lx, y + rh / 2, { size: Math.min(13.5, Math.max(9, rh - 6)), col: cb.col, align: 'left', weight: 600 });
        winOf(cb, o).forEach(([a, b]) => {
          g.fillStyle = cb.col + '99'; g.fillRect(XX(a), y + 2, XX(b) - XX(a), hh);
          g.strokeStyle = cb.col; g.lineWidth = 1.5; g.strokeRect(XX(a), y + 2, XX(b) - XX(a), hh);
        });
        if (cb.id === 'onhit') HITS.slice(0, 2).forEach((h, i) => { if (!S.conn[i] && S.mode === 'string' && hitAt(S.f) === i && S.f >= h.A0) { g.fillStyle = 'rgba(21,32,68,.6)'; g.fillRect(X(h.A0), y + 2, X(h.A1 + 10) - X(h.A0), hh); } });
      });
      // marks: where each press landed, and whether it was accepted
      S.marks.forEach(m => {
        const age = S.n - m.n; if (age > 170) return;
        const a = clamp((170 - age) / 40, 0, 1), col = m.tone === 'ok' ? OK.ok : m.tone === 'arm' ? OK.arm : OK.no;
        const x = m.f < 0 ? FX(-m.f - 1) : X(m.f);
        g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x, sy - 22); g.lineTo(x, bot); g.stroke();
        g.fillStyle = col; g.beginPath(); g.arc(x, sy - 22, 11, 0, TAU); g.fill();
        label(g, m.k === 'SP' ? '␣' : m.k, x, sy - 22, { size: 13, col: NAVY, weight: 700 });
        if (m.by && m.tone !== 'no') { const j = rows.findIndex(r => r.id === m.by); if (j >= 0) { g.fillStyle = col; g.beginPath(); g.arc(x, top + j * rh + rh / 2, 5, 0, TAU); g.fill(); } }
        g.restore();
      });
      // playhead
      if (S.mode === 'string') { g.fillStyle = '#fff'; g.fillRect(X(S.f) - 1.5, sy - 30, 3, bot - sy + 30); }
      else if (S.mode === 'flinch') { g.fillStyle = '#fff'; g.fillRect(FX(S.ft) - 1.5, sy - 30, 3, bot - sy + 30); }
      else { const x = X(S.act.from); g.strokeStyle = '#fff'; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(x, sy - 30); g.lineTo(x, bot); g.stroke(); g.setLineDash([]);
        pill(g, `${S.act.kind} ${S.act.t + 1}/${S.act.dur} f`, Math.min(x + 8, TL.x1 - 120), sy + 30, { bg: '#1d2a56', fg: '#fff', bd: '#ffb951', size: 13, align: 'left' }); }

      /* ---- keycaps ---- */
      KEYS.forEach(([k, nm], i) => {
        const lk = S.lastKey && S.lastKey.k === k && S.n - S.lastKey.n < 24 ? S.lastKey.tone : null;
        keycap(g, i * (CAP.w + CAP.gap), CAP.y, CAP.w, CAP.h, k === 'SP' ? 'Space' : k, nm, lk);
      });

      say(out, R.tour ? S.cap : (S.info || 'Toggle the chips to open cancel windows, then press keys during the string. Green means a cancel allowed the press, red means it was refused.'));
    };
  }, { init(s) { window.__cpReg('play', s._cp, s); window.__cpReg('anti', s._cp, s); } });

  /* =====================================================================
     Slide 3: strings vs chains vs combos, and three chain patterns
     ===================================================================== */
  const MV = { L: { name: 'Light', s: 5, a: 3, r: 14, stun: 14 }, M: { name: 'Medium', s: 7, a: 4, r: 17, stun: 20 }, H: { name: 'Heavy', s: 10, a: 5, r: 22, stun: 26 }, S: { name: 'Special', s: 12, a: 6, r: 28, stun: 36 } };
  Object.values(MV).forEach(m => { m.T = m.s + m.a + m.r; });
  const BTN = { J: 'L', K: 'M', L: 'H', O: 'S' };
  const PATS = {
    ladder: {
      name: 'Ascending ladder', eg: 'like Darkstalkers and Marvel vs. Capcom',
      rule: 'Each cancel must go up a rung: light, medium, heavy, special. Rungs can be skipped, never repeated or reversed.',
      nodes: { L: [140, 0, 'L'], M: [340, 0, 'M'], H: [540, 0, 'H'], S: [740, 0, 'S'] },
      edges: [['L', 'M'], ['M', 'H'], ['H', 'S'], ['L', 'H', 1], ['M', 'S', 1], ['L', 'S', 2]],
      start: b => b, next: (cur, b) => { const o = 'LMHS'; return o.indexOf(b) > o.indexOf(cur) ? b : null; },
      no: (cur, b) => `${MV[b].name} after ${MV[cur].name.toLowerCase()} goes down the ladder.`,
    },
    tree: {
      name: 'Branching tree', eg: 'like Devil May Cry and Bayonetta strings',
      rule: 'Light, light, light is the trunk. A heavy at any branch point ends it with a different finisher.',
      nodes: { L1: [140, 30, 'L'], L2: [340, 30, 'L'], L3: [540, 30, 'L'], H1: [340, -40, 'H', 'launcher'], H2: [540, -40, 'H', 'sweep'], H3: [740, -40, 'H', 'finisher'] },
      edges: [['L1', 'L2'], ['L2', 'L3'], ['L1', 'H1'], ['L2', 'H2'], ['L3', 'H3']],
      start: b => b === 'L' ? 'L1' : null, next: (cur, b) => ({ L1: { L: 'L2', H: 'H1' }, L2: { L: 'L3', H: 'H2' }, L3: { H: 'H3' } }[cur] || {})[b] || null,
      no: (cur, b) => cur[0] === 'H' ? 'A heavy finisher ends the tree.' : `No ${MV[b].name.toLowerCase()} branch here.`,
    },
    loop: {
      name: 'Capped loop', eg: 'like chain jabs and rekkas in Street Fighter',
      rule: 'The light chains into itself up to three times, then into a rekka special that follows up twice. Each loop has a cap.',
      nodes: { L1: [140, 0, 'L'], L2: [290, 0, 'L'], L3: [440, 0, 'L'], S1: [590, 0, 'S'], S2: [740, 0, 'S'], S3: [890, 0, 'S'] },
      edges: [['L1', 'L2'], ['L2', 'L3'], ['L1', 'S1', 1], ['L2', 'S1', 1], ['L3', 'S1'], ['S1', 'S2'], ['S2', 'S3']],
      start: b => b === 'L' ? 'L1' : b === 'S' ? 'S1' : null,
      next: (cur, b) => ({ L1: { L: 'L2', S: 'S1' }, L2: { L: 'L3', S: 'S1' }, L3: { S: 'S1' }, S1: { S: 'S2' }, S2: { S: 'S3' } }[cur] || {})[b] || null,
      no: (cur, b) => cur === 'L3' && b === 'L' ? 'The jab loop is capped at three.' : cur === 'S3' ? 'The rekka is capped at three.' : `No ${MV[b].name.toLowerCase()} follow-up here.`,
    },
  };
  const mvOf = (pat, id) => MV[PATS[pat].nodes[id][2]];

  canvasDemo('cp-chains', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.ch-out'), stats = $(s, '.ch-stats'), tourBtn = $(s, '.ch-tour');
    const fresh = () => ({ ...base(), pat: 'ladder', cur: null, mt: 0, path: [], hits: [], combo: 0, best: 0, stunEnd: -1, t0: 0, last: null, dropped: false });
    function step(S) {
      S.n++;
      if (S.cur) {
        S.mt++;
        const m = mvOf(S.pat, S.cur);
        if (S.mt === m.s) {   // the hit lands
          const t = S.n, ok = S.combo > 0 && t <= S.stunEnd;
          if (ok) S.combo++; else { if (S.hits.length) S.dropped = true; S.combo = 1; }
          S.best = Math.max(S.best, S.combo);
          S.stunEnd = t + m.a + m.stun;
          S.hits.push({ t, id: S.cur, stunEnd: S.stunEnd });
        }
        if (S.mt >= m.T) { S.cur = null; }
      }
    }
    function input(S, b) {
      const P = PATS[S.pat];
      if (S.cur) {
        const nx = P.next(S.cur, b);
        if (!nx) { const why = P.no(S.cur, b); S.last = { ok: false, text: `Refused: ${why[0].toLowerCase() + why.slice(1)}`, n: S.n, b }; return; }
        S.last = { ok: true, text: `Chained: ${MV[PATS[S.pat].nodes[S.cur][2]].name.toLowerCase()} cancels into ${MV[b].name.toLowerCase()}.`, n: S.n, b };
        S.path.push({ id: nx, t: S.n, from: S.cur }); S.cur = nx; S.mt = 0; return;
      }
      const st = P.start(b);
      if (!st) { S.last = { ok: false, text: `Refused: this pattern does not start with a ${MV[b].name.toLowerCase()}.`, n: S.n, b }; return; }
      // a fresh start: clear the track if the last sequence is over
      if (!S.path.length || S.n - S.path.at(-1).t > 50) { S.path = []; S.hits = []; S.t0 = S.n; S.dropped = false; S.best = 0; S.combo = 0; }
      S.last = { ok: true, text: `${MV[b].name} starts the sequence.`, n: S.n, b };
      S.path.push({ id: st, t: S.n, from: null }); S.cur = st; S.mt = 0;
    }
    const setPat = (S, p) => { S.pat = p; S.cur = null; S.path = []; S.hits = []; S.combo = 0; S.best = 0; S.last = null; S.dropped = false; };
    const I = b => S => input(S, b);
    const mtIs = (id, mt) => S => S.cur === id && S.mt === mt;
    const TOUR = [
      { do: S => setPat(S, 'ladder'), cap: 'A string is authored: the same button walks a fixed sequence. A chain is a rule for which move may cancel into which. A combo is what the target feels: hits that land before its hitstun ends.' },
      { wait: 200, do: I('L'), cap: 'Ascending ladder: light, medium, heavy, special. Each cancel lands inside the previous hit’s hitstun, so all four combo.' },
      { when: mtIs('L', 10), do: I('M') }, { when: mtIs('M', 12), do: I('H') }, { when: mtIs('H', 15), do: I('S') },
      { wait: 200, do: I('M'), cap: 'Going down the ladder is refused: heavy cannot cancel back into light.' },
      { when: mtIs('M', 9), do: I('H') }, { when: mtIs('H', 8), do: I('L') },
      { wait: 180, do: I('L'), cap: 'A late cancel is still a legal chain, but the target has recovered: the combo drops.' },
      { when: mtIs('L', 18), do: I('M') },
      { wait: 180, do: S => setPat(S, 'tree'), cap: 'Branching tree: light, light, light is the trunk, and a heavy at each branch point picks a different finisher.' },
      { wait: 90, do: I('L') }, { when: mtIs('L1', 10), do: I('L') }, { when: mtIs('L2', 10), do: I('H') },
      { wait: 150, do: I('L') }, { when: mtIs('L1', 10), do: I('H') }, { when: mtIs('H1', 14), do: I('L') },
      { wait: 180, do: S => setPat(S, 'loop'), cap: 'Capped loop: the light chains into itself three times, then a rekka special follows up twice. The caps stop an infinite loop.' },
      { wait: 100, do: I('L') }, { when: mtIs('L1', 9), do: I('L') }, { when: mtIs('L2', 9), do: I('L') }, { when: mtIs('L3', 7), do: I('L') },
      { when: mtIs('L3', 9), do: I('S') }, { when: mtIs('S1', 16), do: I('S') }, { when: mtIs('S2', 16), do: I('S') },
      { wait: 200 },
    ];
    const R = runner(fresh, step, { chains: TOUR }, 30);
    s._ch = R;
    const goLive = () => { if (R.tour) { R.free(); tourBtn.classList.remove('on'); } };
    const userIn = b => { goLive(); input(R.S, b); };
    keys(s, { J: () => userIn('L'), K: () => userIn('M'), L: () => userIn('H'), O: () => userIn('S') });
    $$(s, '.ch-btns .btn').forEach(b => b.onclick = () => userIn(b.dataset.b));
    $$(s, '.ch-pat .btn').forEach(b => b.onclick = () => { goLive(); setPat(R.S, b.dataset.p); });
    tourBtn.onclick = () => { R.start('chains'); tourBtn.classList.add('on'); };

    let statKey = '', patKey = '';
    return dt => {
      R.tick(dt);
      const S = R.S, P = PATS[S.pat];
      if (S.pat !== patKey) { patKey = S.pat; $$(s, '.ch-pat .btn').forEach(b => b.classList.toggle('on', b.dataset.p === S.pat)); }
      g.clearRect(0, 0, W, H);
      // three definitions
      const cards = [
        ['String', 'An authored sequence on one button. Press J, J, J and the same three hits come out every time.', 'J J J'],
        ['Chain', 'A cancel rule between different moves. The player assembles the order, inside the rule.', 'L → M → H'],
        ['Combo', 'The result on the target: hits that land before its hitstun ends. Strings and chains are how you build one.', '3 hits'],
      ];
      cards.forEach(([t, d, glyph], i) => {
        const x = i * 352, w = 336;
        panel(g, x, 0, w, 120);
        label(g, t, x + 16, 22, { size: 20, weight: 700, align: 'left' });
        g.font = '600 14px Jost'; pill(g, glyph, x + w - 26 - g.measureText(glyph).width / 2, 22, { bg: '#dfe6fb', fg: '#23306e', bd: '#8ea2e6', size: 14 });
        g.font = '500 15px Jost'; const words = d.split(' '), lines = ['']; words.forEach(wd => { const tst = (lines.at(-1) + ' ' + wd).trim(); if (g.measureText(tst).width > w - 32) lines.push(wd); else lines[lines.length - 1] = tst; });
        lines.forEach((ln, j) => label(g, ln, x + 16, 52 + j * 20, { size: 15, align: 'left', col: MUTED, weight: 500 }));
      });
      // pattern graph
      panel(g, 0, 132, W, 236, { fill: NAVY, stroke: '#34437a' });
      label(g, `${P.name} (${P.eg}; illustrative)`, 16, 152, { size: 16, col: '#fff', align: 'left' });
      label(g, P.rule, 16, 174, { size: 14, col: '#b3bbd8', align: 'left', weight: 500 });
      const gy = 290, NX = id => 30 + P.nodes[id][0], NY = id => gy + P.nodes[id][1];
      const used = new Set(S.path.map(p => p.from + '>' + p.id));
      P.edges.forEach(([a, b, bend = 0]) => {
        const x1 = NX(a), y1 = NY(a), x2 = NX(b), y2 = NY(b), on = used.has(a + '>' + b);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - (bend ? 46 + bend * 22 : 0);
        g.strokeStyle = on ? OK.ok : 'rgba(179,187,216,.5)'; g.lineWidth = on ? 4 : 2;
        g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, x2, y2); g.stroke();
        const ang = Math.atan2(y2 - my, x2 - mx), ex = x2 - Math.cos(ang) * 30, ey = y2 - Math.sin(ang) * 30;
        g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - 11 * Math.cos(ang - .45), ey - 11 * Math.sin(ang - .45)); g.lineTo(ex - 11 * Math.cos(ang + .45), ey - 11 * Math.sin(ang + .45)); g.fill();
      });
      Object.entries(P.nodes).forEach(([id, [, , mv, sub]]) => {
        const x = NX(id), y = NY(id), cur = S.cur === id, visited = S.path.some(p => p.id === id);
        const col = { L: '#7fd6ff', M: '#9be7a8', H: '#ffb951', S: '#d4a5ff' }[mv];
        g.fillStyle = cur ? col : visited ? col + '88' : '#1d2a56'; g.strokeStyle = col; g.lineWidth = cur ? 4 : 2;
        g.beginPath(); g.arc(x, y, 27, 0, TAU); g.fill(); g.stroke();
        label(g, mv, x, y, { size: 20, weight: 700, col: cur || visited ? NAVY : col });
        label(g, sub || MV[mv].name.toLowerCase(), x, y + 40, { size: 12.5, col: '#b3bbd8', weight: 500 });
      });
      if (S.last && S.n - S.last.n < 110) {
        const a = clamp((110 - (S.n - S.last.n)) / 25, 0, 1); g.save(); g.globalAlpha = a;
        pill(g, S.last.text, W - 250, 152, S.last.ok ? { bg: '#d8f0df', fg: '#145c33', bd: '#5fb47c', size: 15, maxW: 480 } : { bg: '#f9d9d6', fg: '#8a1c15', bd: '#e07b72', size: 15, maxW: 480 });
        g.restore();
      }
      // combo track: our moves above, the target's hitstun below
      panel(g, 0, 380, W, 205);
      label(g, 'Combo track · each tick is a frame', 16, 398, { size: 15, align: 'left', weight: 600 });
      const tx0 = 130, tx1 = W - 20, span = 200, X = t => tx0 + (t - S.t0) * (tx1 - tx0) / span;
      label(g, 'you', 16, 446, { size: 15, align: 'left' }); label(g, 'target', 16, 520, { size: 15, align: 'left' });
      g.save(); g.beginPath(); g.rect(tx0 - 4, 404, tx1 - tx0 + 8, 180); g.clip();
      S.path.forEach((p, i) => {
        const m = mvOf(S.pat, p.id), nxt = S.path[i + 1], end = nxt ? nxt.t : p.t + m.T;
        const colOf = f => { const k = f - p.t; return k < m.s ? PH.s : k < m.s + m.a ? PH.a : PH.r; };
        ticks(g, X, p.t, Math.min(end, S.n), colOf, 446, 14, { w: 2 });
        label(g, PATS[S.pat].nodes[p.id][2], X(p.t) + 2, 418, { size: 13, align: 'left', col: INK });
        if (nxt) { g.fillStyle = '#8a1c15'; g.globalAlpha = .5; g.fillRect(X(nxt.t), 466, 2, 10); g.globalAlpha = 1; }
      });
      S.hits.forEach((h, i) => {
        const end = Math.min(h.stunEnd, S.n), nx = S.hits[i + 1];
        g.fillStyle = 'rgba(240,163,94,.55)'; g.fillRect(X(h.t), 506, Math.max(0, X(end) - X(h.t)), 26);
        g.strokeStyle = PH.stun; g.lineWidth = 1.5; g.strokeRect(X(h.t), 506, Math.max(0, X(end) - X(h.t)), 26);
        g.fillStyle = PH.a; g.beginPath(); g.arc(X(h.t), 519, 6, 0, TAU); g.fill();
        if (nx && nx.t > h.stunEnd) { g.fillStyle = 'rgba(229,50,45,.18)'; g.fillRect(X(h.stunEnd), 500, X(nx.t) - X(h.stunEnd), 38); label(g, 'recovered', (X(h.stunEnd) + X(nx.t)) / 2, 552, { size: 12.5, col: '#8a1c15' }); }
      });
      g.restore();
      label(g, 'hitstun', 16, 540, { size: 12.5, align: 'left', col: MUTED, weight: 500 });
      label(g, 'Frame data is illustrative.', W - 20, 398, { size: 13, align: 'right', col: MUTED, weight: 500 });

      const k = `${S.combo}|${S.best}|${S.path.length}|${S.dropped}`;
      if (k !== statKey) {
        statKey = k;
        stats.innerHTML = `<div class="${S.best > 2 ? 'g' : ''}"><b>${S.best}</b><span>hits in the longest combo</span></div><div><b>${S.path.length}</b><span>moves in this chain</span></div><div class="${S.dropped ? 'r' : ''}"><b>${S.dropped ? 'dropped' : 'held'}</b><span>did the target escape?</span></div>`;
      }
      say(out, R.tour ? S.cap : `${P.rule} Keys on this slide: J light, K medium, L heavy, O special.`);
    };
  }, { init(s) { window.__cpReg('chains', s._ch, s); } });

  /* ---------- GIF hooks ---------- */
  const REG = {};
  window.__cpReg = (w, R, s) => { REG[w] = { R, s }; };
  window.__seek = (t, w) => { const r = REG[w]; if (!r) return; r.R.seek(t, w); r.s._draw?.(0); };
  window.__dur = w => REG[w] ? REG[w].R.dur(w) : 0;
})();
