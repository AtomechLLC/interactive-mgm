/* Attack window editor (Module 5, 3Cs: controller, Part 6: the anatomy of an attack animation, slides 248-323).
   Slide 1: startup, active and recovery on a looping strike over a frame ruler (with the compression-and-release cadence).
   Slide 2: the editor. One row per window type over the ruler (timeline.js); dragging the queue, interrupt, hit,
            protection, translation, rotation and sensory windows changes what the looping strike does.
            A compare view lines a dagger up against a greatsword by end frame.
   Slide 3: plus, even or minus: attacker and defender frame strips and the frame advantage they leave.
   Slide 4: a small gallery of hitstun styles (none, freeze, interrupt, crumple).
   The protection rules (iFrames, super armour, armour) follow pvp/strike-trades. The phase colours and tick strips follow
   pvp/core-actions. Every canvas is a pure function of time and state, so __seek(t, which) is deterministic.
   All frame values are illustrative approximations. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const ease = k => (k = clamp(k), k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const W = 1040, H = 585;
  const C = {
    ink: '#262c6a', muted: '#5d618c', navy: '#152044', line: '#cdbf9f', paper: 'rgba(255,252,244,.92)',
    blue: '#2ea3dc', red: '#e5322d', redDk: '#a8201c', green: '#2fae63', gold: '#ffb951', goldInk: '#9a5a06', purple: '#8a4fd6',
    steel: '#e4e8f2', foe: '#d0574f', foeDk: '#7c2420',
  };
  // phase colours from pvp/core-actions' timing chart
  const PH = { startup: '#3fbf4f', active: '#e23a3a', recovery: '#3b8cff' };

  function lab(g, s, x, y, { col = C.ink, size = 15, weight = 600, align = 'left', font = 'Jost, sans-serif' } = {}) {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
  }
  function panel(g, x, y, w, h, fill = C.paper) {
    g.fillStyle = fill; g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.stroke();
  }
  function pill(g, s, x, y, col, { size = 13, fg = '#fff', align = 'center' } = {}) {
    g.font = `600 ${size}px Jost, sans-serif`; const w = g.measureText(s).width + 16, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.fillStyle = col; g.beginPath(); g.roundRect(x0, y - size * .8, w, size * 1.6, 7); g.fill();
    lab(g, s, x0 + w / 2, y + 1, { col: fg, size, align: 'center' });
  }
  function ground(g, x0, x1, y) {
    g.strokeStyle = 'rgba(38,44,106,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    g.fillStyle = 'rgba(205,191,159,.25)'; g.fillRect(x0, y, x1 - x0, 6);
  }

  /* ---------- the side-view knight: legs, torso, helmet, one sword arm ---------- */
  const BLADE = { great: { len: 104, w: 7, guard: 16 }, sword: { len: 72, w: 5, guard: 12 }, dagger: { len: 30, w: 4, guard: 8 } };
  const SHOULDER = [4, -96];
  // a point in the knight's own space, mapped to the canvas
  function kpt(o, lx, ly) {
    const s = o.s ?? 1, face = o.face ?? 1, ln = o.lean ?? 0, sy = o.squash ?? 1;
    ly *= sy;
    const rx = lx * Math.cos(ln) - ly * Math.sin(ln), ry = lx * Math.sin(ln) + ly * Math.cos(ln);
    return { x: o.x + rx * s * face, y: o.y + ry * s };
  }
  function tipOf(o, arm = o.arm) {
    const b = BLADE[o.weapon || 'sword'], r = 30 + b.len;
    return kpt(o, SHOULDER[0] + Math.cos(arm) * r, SHOULDER[1] + Math.sin(arm) * r);
  }
  function knight(g, o) {
    const { x, y, s = 1, arm = .95, lean = 0, col = C.blue, dark = C.navy, weapon = 'sword', alpha = 1, flash = 0, face = 1, shield = false, squash = 1, spin = 0 } = o;
    const b = BLADE[weapon];
    g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.scale(face * s, s);
    g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse(0, 2, 30, 6, 0, 0, TAU); g.fill();
    if (spin) { g.translate(0, -50); g.rotate(spin); g.translate(0, 50); }
    g.rotate(lean); g.scale(1, squash);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // legs
    g.strokeStyle = dark; g.lineWidth = 10;
    g.beginPath(); g.moveTo(-4, -56); g.lineTo(-16, -2); g.moveTo(4, -56); g.lineTo(18, -2); g.stroke();
    // torso and head
    g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = 3;
    g.beginPath(); g.roundRect(-16, -108, 32, 56, 11); g.fill(); g.stroke();
    g.beginPath(); g.arc(2, -124, 15, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = dark; g.fillRect(6, -128, 11, 5);
    if (shield) {   // a round shield held forward
      g.fillStyle = '#c9a25a'; g.strokeStyle = dark; g.lineWidth = 3; g.beginPath(); g.ellipse(26, -84, 9, 28, 0, 0, TAU); g.fill(); g.stroke();
    }
    // sword arm and blade
    const [sx, sy] = SHOULDER, hx = sx + Math.cos(arm) * 30, hy = sy + Math.sin(arm) * 30;
    const ex = hx + Math.cos(arm) * b.len, ey = hy + Math.sin(arm) * b.len, nx = -Math.sin(arm), ny = Math.cos(arm);
    g.strokeStyle = dark; g.lineWidth = 7; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke();
    g.strokeStyle = dark; g.lineWidth = b.w + 3; g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = C.steel; g.lineWidth = b.w; g.beginPath(); g.moveTo(hx, hy); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = dark; g.lineWidth = 4; g.beginPath(); g.moveTo(hx + nx * b.guard / 2, hy + ny * b.guard / 2); g.lineTo(hx - nx * b.guard / 2, hy - ny * b.guard / 2); g.stroke();
    if (flash > 0) {
      g.globalAlpha *= flash; g.fillStyle = '#fff';
      g.beginPath(); g.roundRect(-16, -108, 32, 56, 11); g.fill(); g.beginPath(); g.arc(2, -124, 15, 0, TAU); g.fill();
    }
    g.restore();
  }
  // a training dummy on a post; recoil leans it back, flash whitens it
  function dummy(g, x, y, { s = 1, recoil = 0, flash = 0 } = {}) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse(0, 2, 26, 6, 0, 0, TAU); g.fill();
    g.fillStyle = '#8b6136'; g.fillRect(-4, -60, 8, 60); g.fillRect(-18, -4, 36, 6);
    g.rotate(recoil * .35);
    g.fillStyle = '#d9b57a'; g.strokeStyle = '#7a5a3a'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(-20, -116, 40, 62, 14); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -132, 15, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#7a5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, -86); g.lineTo(20, -86); g.stroke();
    g.fillStyle = '#b5482f'; g.beginPath(); g.arc(0, -96, 7, 0, TAU); g.fill();
    if (flash > 0) { g.globalAlpha = flash; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-20, -116, 40, 62, 14); g.fill(); g.beginPath(); g.arc(0, -132, 15, 0, TAU); g.fill(); }
    g.restore();
  }
  // the strike's pose at (fractional) frame f: startup [0, a), active [a, b), recovery [b, L)
  // Startup pulls back quickly, then creeps a little further: the compression before the release (slides 284-286).
  function pose(f, a, b, L) {
    const REST = .95, WIND = -2.45, FOLLOW = 1.3;
    if (f < a) { const k = clamp(f / a); return { ph: 'startup', k, arm: lerp(REST, WIND, easeOut(Math.min(1, k * 1.4))) - .16 * clamp((k - .6) / .4), lean: -.13 * easeOut(k) }; }
    if (f < b) { const k = clamp((f - a) / (b - a)); return { ph: 'active', k, arm: lerp(WIND - .16, FOLLOW, easeOut(k)), lean: lerp(-.13, .2, easeOut(k)) }; }
    const k = clamp((f - b) / Math.max(1, L - b)); return { ph: 'recovery', k, arm: lerp(FOLLOW, REST, ease(k)), lean: lerp(.2, 0, ease(k)) };
  }
  // the slash trail behind the blade tip over the last few frames
  function trail(g, o, armAt, f, col = '255,122,42', n = 12) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(tipOf(o, armAt(f - i * .25)));
    for (let i = 0; i < n; i++) {
      g.strokeStyle = `rgba(${col},${(1 - i / n) * .8})`; g.lineWidth = 10 * (1 - i / n) + 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(pts[i].x, pts[i].y); g.lineTo(pts[i + 1].x, pts[i + 1].y); g.stroke();
    }
  }
  function spark(g, x, y, age, r = 34) {
    const k = clamp(age / 6);
    g.save(); g.globalAlpha = 1 - k;
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(x, y, r * (.4 + k * .6), 0, TAU); g.fill();
    g.strokeStyle = '#ff7a2a'; g.lineWidth = 4;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + .3, r0 = r * (.5 + k), r1 = r * (1 + k * 1.2); g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke(); }
    g.restore();
  }
  // sound, drawn: rings that ripple out from the impact, plus a speaker glyph
  function ripple(g, x, y, age, col = '209,75,154') {
    for (let i = 0; i < 3; i++) {
      const k = (age / 7 - i * .3); if (k < 0 || k > 1) continue;
      g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 20 + k * 70, 0, TAU); g.stroke();
    }
  }
  function speaker(g, x, y, on, col = '#d14b9a') {
    g.fillStyle = on ? col : 'rgba(93,97,140,.35)';
    g.beginPath(); g.moveTo(x - 10, y - 6); g.lineTo(x - 3, y - 6); g.lineTo(x + 6, y - 14); g.lineTo(x + 6, y + 14); g.lineTo(x - 3, y + 6); g.lineTo(x - 10, y + 6); g.closePath(); g.fill();
    g.strokeStyle = g.fillStyle; g.lineWidth = 3;
    if (on) [10, 18].forEach(r => { g.beginPath(); g.arc(x + 6, y, r, -.7, .7); g.stroke(); });
    else { g.beginPath(); g.moveTo(x + 12, y - 8); g.lineTo(x + 26, y + 8); g.moveTo(x + 26, y - 8); g.lineTo(x + 12, y + 8); g.stroke(); }
  }
  // deterministic shake offset for a frame
  const shakeAt = (f, amp) => ({ x: amp * Math.sin(f * 2.9 + 1), y: amp * .6 * Math.cos(f * 3.7) });

  const scenes = {};
  // shared playback-speed buttons
  function speedSeg(s, sel, st, after) {
    const bs = $$(s, sel + ' .btn');
    const sync = () => bs.forEach(b => b.classList.toggle('on', +b.dataset.fps === st.fps));
    bs.forEach(b => b.onclick = () => { st.fps = +b.dataset.fps; sync(); after?.(); });
    return sync;
  }

  /* ================= 1. startup, active, recovery ================= */
  const AN_DEF = { S: 14, A: 4, R: 22 }, AN_HOLD = 10;
  const AN_TOUR = [
    { t: 0, S: 14, A: 4, R: 22, say: 'A strike reads in three parts. Startup is the wind-up before anything can be hit, active is when the hitbox is live, and recovery is the follow-through where the attacker is exposed.' },
    { t: 5, S: 30, A: 4, R: 22, say: 'A long startup is a readable telegraph. The pose pulls back quickly, then creeps a little further: the compression before the release.' },
    { t: 10, S: 8, A: 4, R: 38, say: 'A short startup is hard to react to, so the cost moves to recovery. A long follow-through is the punish window that keeps a fast strike fair.' },
    { t: 15, S: 6, A: 3, R: 10, say: 'Short everywhere is a jab: fast, safe and weak. The phases are a budget, and every attack spends it somewhere.' },
  ];
  const AN_DUR = 20;
  canvasDemo('anatomy', (s, c, g) => {
    const st = { ...AN_DEF, fps: 20, ghost: true, tour: true, held: false, t: 0, key: '' };
    const inp = k => $(s, `input[data-k=${k}]`);
    const syncSpeed = speedSeg(s, '.an-speed', st);
    const tourBtn = $(s, '.an-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.fps = 20; syncSpeed(); } };
    ['S', 'A', 'R'].forEach(k => inp(k).oninput = () => { manual(); st[k] = +inp(k).value; st.t = 0; });
    $(s, '.an-ghost').onchange = e => { st.ghost = e.target.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.an-reset').onclick = () => { manual(); Object.assign(st, AN_DEF); st.t = 0; };

    function tourAt(t) {
      let k = AN_TOUR[0]; AN_TOUR.forEach(x => { if (t >= x.t) k = x; });
      Object.assign(st, { S: k.S, A: k.A, R: k.R, fps: 20 });
      return { local: t - k.t, say: k.say };
    }
    function info(cap) {
      ['S', 'A', 'R'].forEach(k => { if (+inp(k).value !== st[k]) inp(k).value = st[k]; $(s, `[data-v=${k}]`).textContent = `${st[k]} f · ${Math.round(st[k] * 1000 / 60)} ms`; });
      const L = st.S + st.A + st.R, key = [st.S, st.A, st.R, cap].join();
      if (key === st.key) return; st.key = key;
      say($(s, '.an-stats'), `<div><b>${L}</b><span>frames in all, ${Math.round(L * 1000 / 60)} ms at 60 fps</span></div><div class="${st.S < 12 ? 'r' : 'g'}"><b>${st.S}</b><span>startup frames: ${st.S < 12 ? 'too short to react to' : 'enough to see it coming and react'}</span></div><div class="y"><b>${st.R}</b><span>recovery frames: the window to punish it</span></div>`);
      say($(s, '.an-out'), cap || 'Drag the sliders. Each tick on the ruler is one frame at 60 fps, and the strike loops at the chosen speed.');
    }
    function draw(f, cap) {
      const { S, A, R } = st, L = S + A + R;
      g.clearRect(0, 0, W, H);
      panel(g, 0, 0, W, 372);
      ground(g, 40, W - 40, 346);
      const fx = Math.min(f, L), P = pose(fx, S, S + A, L), lunge = 40 * easeOut((fx - S + 6) / (A + 8));
      const o = { x: 380 + lunge, y: 346, s: 1.4, arm: P.arm, lean: P.lean, weapon: 'sword' };
      // key poses as ghosts: rest, full wind-up, end of the swing
      if (st.ghost) [[0, .18], [S - .01, .22], [S + A - .01, .22]].forEach(([gf, a]) => { const q = pose(gf, S, S + A, L); knight(g, { ...o, x: 380 + 40 * easeOut((gf - S + 6) / (A + 8)), arm: q.arm, lean: q.lean, alpha: a, col: '#9aa3c7' }); });
      const hit = fx >= S && fx < S + A + 6;
      dummy(g, 620, 346, { s: 1.3, recoil: hit ? Math.sin(clamp((fx - S) / (A + 6)) * Math.PI) : 0, flash: fx >= S && fx < S + 3 ? .7 : 0 });
      if (P.ph === 'active') trail(g, o, q => pose(Math.max(S, q), S, S + A, L).arm, fx);
      knight(g, o);
      if (fx >= S && fx < S + 5) spark(g, 600, 222, fx - S, 34);
      pill(g, { startup: 'Startup', active: 'Active', recovery: 'Recovery' }[P.ph], 390, 40, PH[P.ph], { size: 18 });
      lab(g, `frame ${Math.floor(fx)} of ${L}`, 470, 40, { col: C.muted, size: 16 });
      if (st.ghost) lab(g, 'faint figures: rest, full wind-up and end of the swing', W - 40, 40, { col: C.muted, size: 14, align: 'right' });

      // the frame ruler and phase strip
      const x0 = 70, w = W - 140, y = 440, pf = w / L, X = q => x0 + q * pf;
      TL.ruler(g, x0, y - 26, w, L);
      TL.strip(g, x0, y, w, L, [{ a: 0, b: S, col: PH.startup, label: 'Startup' }, { a: S, b: S + A, col: PH.active, label: 'Active' }, { a: S + A, b: L, col: PH.recovery, label: 'Recovery' }], { h: 34 });
      [[0, S, PH.startup, `${S} f`], [S, S + A, PH.active, `${A} f`], [S + A, L, PH.recovery, `${R} f`]].forEach(([a, b, col, t]) => lab(g, t, X((a + b) / 2), y + 52, { col, size: 16, align: 'center' }));
      // compression before release
      const c0 = Math.floor(S * .6);
      g.strokeStyle = PH.startup; g.lineWidth = 2; g.beginPath(); g.moveTo(X(c0), y + 74); g.lineTo(X(c0), y + 82); g.lineTo(X(S), y + 82); g.lineTo(X(S), y + 74); g.stroke();
      lab(g, 'compression', X((c0 + S) / 2), y + 98, { col: '#1f7a2e', size: 14, align: 'center' });
      lab(g, 'release', X(S + A / 2), y + 98, { col: PH.active, size: 14, align: 'center' });
      // playhead
      g.fillStyle = C.navy; g.fillRect(X(fx) - 1.5, y - 34, 3, 80);
      g.beginPath(); g.moveTo(X(fx) - 7, y - 42); g.lineTo(X(fx) + 7, y - 42); g.lineTo(X(fx), y - 34); g.fill();
      lab(g, 'Frame values are illustrative.', W - 40, H - 16, { col: C.muted, size: 13, align: 'right', weight: 500 });
      info(cap);
    }
    const frameOf = local => (local * st.fps) % (st.S + st.A + st.R + AN_HOLD);
    scenes.anatomy = { seek(t) { st.held = true; const k = tourAt(t % AN_DUR); draw(frameOf(k.local), k.say); }, dur: () => AN_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= AN_DUR) st.t = 0; const k = tourAt(st.t); draw(frameOf(k.local), k.say); }
      else draw(frameOf(st.t), '');
    };
  });

  /* ================= 2. the window editor ================= */
  const ROWS = [
    ['interrupt', 'Interrupt: dodge', '#1f9e8f'],
    ['queue', 'Queue / buffer', '#d99a1e'],
    ['hit', 'Hit + hitstun', '#e23a3a'],
    ['iframes', 'iFrames', '#8a4fd6'],
    ['translation', 'Translation', '#5562eb'],
    ['rotation', 'Rotation', '#2ea3dc'],
    ['vfx', 'Visual effect', '#ff7a2a'],
    ['sound', 'Sound', '#d14b9a'],
    ['shake', 'Screen shake', '#8b6136'],
  ];
  const TRIO = ['vfx', 'sound', 'shake'];
  // protection rules from pvp/strike-trades: what the row does to an incoming hit
  const PROT = {
    iframes: { name: 'iFrames', col: '#8a4fd6' },
    super: { name: 'Super armour', col: '#e08a1e' },
    armour: { name: 'Armour', col: '#3f8fd6' },
  };
  const WEAP = {
    great: { name: 'Greatsword', L: 54, blade: 'great', lunge: 70, reach: 128, guard: 44, att: [12, 26, 36, 48], dodge: 30, arrow: 14, shake: 7,
      rows: { interrupt: [38, 54], queue: [30, 46], hit: [22, 27, 18], iframes: [10, 20, false], translation: [16, 28], rotation: [0, 18], vfx: [22, 32], sound: [22, 28], shake: [23, 30] } },
    dagger: { name: 'Dagger', L: 22, blade: 'dagger', lunge: 34, reach: 74, guard: 15, att: [3, 8, 13, 20], dodge: 11, arrow: 5, shake: 3,
      rows: { interrupt: [13, 22], queue: [9, 20], hit: [7, 10, 12], iframes: [2, 8, false], translation: [4, 10], rotation: [0, 6], vfx: [7, 12], sound: [7, 10], shake: [8, 11] } },
  };
  const ED_HOLD = 10;
  const makeRows = w => ROWS.map(([id, label, col]) => {
    const v = WEAP[w].rows[id], r = { id, label, col, a: v[0], b: v[1], on: v[2] !== false };
    if (id === 'hit') Object.assign(r, { tail: v[2], tailMax: 40, tailCol: '#a8201c', tailLabel: 'hitstun on the target' });
    if (id === 'interrupt') r.b = WEAP[w].L;
    return r;
  });
  const byId = rows => Object.fromEntries(rows.map(r => [r.id, r]));

  // one pass of the strike: which presses are accepted, whether it is cancelled, whether the hit lands
  function simulate(P, R, { dodge, arrow, prot, manual = [] }) {
    const on = (id, f) => R[id].on && f >= R[id].a && f < R[id].b;
    const ev = P.att.map(f => ({ f, k: 'atk' }));
    if (dodge) ev.push({ f: P.dodge, k: 'dodge' });
    if (arrow) ev.push({ f: P.arrow, k: 'arrow' });
    manual.forEach(m => ev.push({ ...m, you: true }));
    ev.sort((a, b) => a.f - b.f || (a.k === 'arrow' ? -1 : 1));
    let cut = null, by = null, took = 0, queued = null;
    const q = R.queue, it = R.interrupt;
    for (const e of ev) {
      if (cut != null && e.f >= cut) { e.ok = null; e.why = 'ignored: the swing was already cancelled'; continue; }
      if (e.k === 'arrow') {
        const cov = on('iframes', e.f), m = PROT[prot].name;
        if (!cov) { e.ok = false; took += 12; cut = e.f; by = 'flinch'; e.why = `the arrow lands outside the ${m.toLowerCase()} window, and the flinch interrupts the swing`; }
        else if (prot === 'iframes') { e.ok = true; e.why = 'the arrow passes straight through: iFrames, no damage, no flinch'; }
        else if (prot === 'super') { e.ok = true; took += 12; e.why = 'the arrow deals full damage, but super armour stops the flinch, so the swing carries on'; }
        else { e.ok = false; took += 6; cut = e.f; by = 'flinch'; e.why = 'armour halves the damage, but the flinch still interrupts the swing'; }
      } else if (e.k === 'dodge') {
        if (on('interrupt', e.f)) { e.ok = true; cut = e.f; by = 'dodge'; e.why = `dodge accepted: it is inside the interrupt window (from frame ${it.a}), so the swing is cancelled into a roll`; }
        else { e.ok = false; e.why = !it.on ? 'dodge refused: this strike has no dodge interrupt' : e.f < it.a ? `dodge refused: the interrupt window only opens at frame ${it.a}, so you are still committed` : 'dodge refused: outside the interrupt window'; }
      } else {
        e.ok = on('queue', e.f);
        if (e.ok && queued == null) queued = e.f;
        e.why = e.ok ? `attack press buffered: it is inside the queue window (${q.a}-${q.b}), so the next swing follows` : !q.on ? 'attack press refused: there is no queue window' : `attack press refused: outside the queue window (${q.a}-${q.b})`;
      }
    }
    const lands = R.hit.on && (cut == null || cut > R.hit.a);
    return { ev, cut, by, took, lands, queued };
  }

  canvasDemo('editor', (s, c, g) => {
    const TX = 172, TW = W - TX - 18, RULER_Y = 238, ROW_Y = 260, ROW_H = 30, LANE_Y = 214;
    const tl = TL.create({ x: TX, y: ROW_Y, w: TW, labelW: 162, rowH: ROW_H, frames: 54, rows: makeRows('great') });
    const fresh = () => ({ weapon: 'great', view: 'edit', rows: { great: makeRows('great'), dagger: makeRows('dagger') }, dodge: false, arrow: false, prot: 'iframes', manual: [] });
    const st = { ...fresh(), fps: 20, tour: true, held: false, t: 0, last: -1, key: '', cap: '' };
    const tourBtn = $(s, '.ed-tour'), syncSpeed = speedSeg(s, '.ed-speed', st, () => manual());
    function manual() { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); Object.assign(st, fresh()); st.t = 0; st.fps = 20; syncSpeed(); bind(); } }
    function bind() { tl.rows = st.rows[st.weapon]; tl.setFrames(WEAP[st.weapon].L); const r = tl.row('iframes'); r.label = PROT[st.prot].name; r.col = PROT[st.prot].col; tl.cursor = null; }
    bind();
    tl.attach(c, { onGrab: () => { if (st.view === 'compare') return; manual(); }, onChange: () => {}, onToggle: () => {} });
    $$(s, '.ed-weapon .btn').forEach(b => b.onclick = () => { manual(); st.weapon = b.dataset.w; st.manual = []; bind(); st.t = 0; });
    $$(s, '.ed-view .btn').forEach(b => b.onclick = () => { manual(); st.view = b.dataset.v; st.t = 0; });
    $(s, '.ed-dodge').onchange = e => { manual(); st.dodge = e.target.checked; };
    $(s, '.ed-arrow').onchange = e => { manual(); st.arrow = e.target.checked; };
    $$(s, '.ed-prot .btn').forEach(b => b.onclick = () => { manual(); st.prot = b.dataset.p; const r = tl.row('iframes'); r.on = true; bind(); });
    const trioOn = () => TRIO.every(id => st.rows[st.weapon].find(r => r.id === id).on);
    $(s, '.ed-trio').onclick = () => { manual(); const v = !trioOn(); TRIO.forEach(id => { tl.row(id).on = v; }); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.ed-reset').onclick = () => { manual(); st.rows[st.weapon] = makeRows(st.weapon); st.manual = []; bind(); };
    const press = k => { manual(); if (st.view !== 'edit' || st.last < 0) return; const f = Math.floor(st.last); if (f < WEAP[st.weapon].L) st.manual.push({ f, k }); };
    $(s, '.ed-atk').onclick = () => press('atk');
    $(s, '.ed-dg').onclick = () => press('dodge');
    addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyJ') press('atk'); else if (e.code === 'KeyK') press('dodge');
    });

    /* walk-through: a script of plays, drags and toggles, replayed from the defaults so any time t has one state */
    const LAP = (54 + ED_HOLD) / 20;
    const TOUR = [
      { d: LAP, play: 1, say: 'Four attack presses arrive during the swing. Only those inside the queue window are buffered into the next swing; the rest are refused.' },
      { d: 1.4, drag: ['queue', 'a', 30, 22], say: 'Drag the queue window earlier...' },
      { d: LAP, play: 1, say: '...and the press at frame 26 now gets through. A wider buffer feels more responsive, but the player commits sooner.' },
      { d: LAP, play: 1, set: st => { st.dodge = true; }, say: 'Now a dodge press at frame 30. The dodge interrupt only opens at frame 38, so the dodge is refused: the player is committed to the swing.' },
      { d: 1.4, drag: ['interrupt', 'a', 38, 28], say: 'Move the dodge interrupt earlier...' },
      { d: LAP, play: 1, say: '...and the same press cancels the swing into a roll. Where the interrupt starts decides how long the strike holds you.' },
      { d: LAP, play: 1, set: st => { st.dodge = false; TRIO.forEach(id => { st.rows.great.find(r => r.id === id).on = false; }); }, say: 'Switch off the sensory trio: no visual effect, no sound, no screen shake. The hit still lands and deals the same damage, but nothing sells it.' },
      { d: 1, click: 'iframes', set: st => { TRIO.forEach(id => { st.rows.great.find(r => r.id === id).on = true; }); st.arrow = true; }, say: 'Trio back on. An enemy arrow will land at frame 14; switch on a protection window that covers it...' },
      { d: LAP, play: 1, say: '...and the arrow passes through on iFrames. Super armour would take the damage without flinching; armour would halve it and still flinch.' },
      { d: LAP, play: 1, set: st => { st.arrow = false; st.view = 'compare'; st.rows.great = makeRows('great'); }, say: 'Line a dagger up against the greatsword by end frame: the dagger can dodge and guard far sooner after it connects.' },
    ];
    const TOUR_DUR = TOUR.reduce((a, x) => a + x.d, 0);
    function tourAt(t) {
      Object.assign(st, fresh()); bind();
      let t0 = 0, out = { frame: 0, say: '' };
      for (const seg of TOUR) {
        const cur = t < t0 + seg.d, k = clamp((t - t0) / seg.d);
        seg.set?.(st); bind();
        if (seg.click) { const r = tl.row(seg.click); if (!cur || k > .6) r.on = true; }
        if (seg.drag) { const [id, part, a, b] = seg.drag, r = tl.row(id); tl.dragTo(r, part, lerp(a, b, cur ? ease((k - .2) / .6) : 1)); }
        if (cur) {
          out.say = seg.say;
          out.frame = seg.play ? Math.min((t - t0) * 20, 54 + ED_HOLD - .01) : 0;
          const i = seg.drag ? ROWS.findIndex(r => r[0] === seg.drag[0]) : seg.click ? ROWS.findIndex(r => r[0] === seg.click) : -1;
          if (i >= 0) {
            const r = tl.rows[i], hy = ROW_Y + i * ROW_H + 14, hx = seg.drag ? tl.fx(r[seg.drag[1]]) : TX - 153;
            const rest = { x: hx + 60, y: hy + 70 };
            const kk = seg.drag ? k : k * 1.6;
            tl.cursor = kk < .2 ? { x: lerp(rest.x, hx, ease(kk / .2)), y: lerp(rest.y, hy, ease(kk / .2)), down: false } : { x: hx, y: hy, down: kk < .85 };
          }
          break;
        }
        t0 += seg.d;
      }
      return out;
    }

    function stats(P, R, sim, cap) {
      const atk = sim.ev.filter(e => e.k === 'atk'), acc = atk.filter(e => e.ok).length;
      const key = [st.weapon, st.view, R.queue.a, R.queue.b, R.queue.on, R.interrupt.a, R.interrupt.on, R.hit.tail, R.hit.a, R.hit.b, sim.cut, sim.by, acc, trioOn(), st.prot, st.dodge, st.arrow, cap].join();
      if (key === st.key) return; st.key = key;
      $$(s, '.ed-weapon .btn').forEach(b => b.classList.toggle('on', b.dataset.w === st.weapon));
      $$(s, '.ed-view .btn').forEach(b => b.classList.toggle('on', b.dataset.v === st.view));
      $$(s, '.ed-prot .btn').forEach(b => b.classList.toggle('on', b.dataset.p === st.prot));
      $(s, '.ed-dodge').checked = st.dodge; $(s, '.ed-arrow').checked = st.arrow;
      const tb = $(s, '.ed-trio'); tb.classList.toggle('on', trioOn()); tb.textContent = `Sensory trio: ${trioOn() ? 'on' : 'off'}`;
      if (st.view === 'compare') {
        const D = byId(st.rows.dagger), G = byId(st.rows.great);
        say($(s, '.ed-stats'), `<div class="g"><b>${D.interrupt.a - D.hit.a}</b><span>frames from contact to dodge, dagger</span></div><div class="r"><b>${G.interrupt.a - G.hit.a}</b><span>frames from contact to dodge, greatsword</span></div><div class="y"><b>${WEAP.great.guard - G.hit.a} vs ${WEAP.dagger.guard - D.hit.a}</b><span>frames from contact to guard, greatsword vs dagger</span></div>`);
      } else say($(s, '.ed-stats'), `<div class="${acc ? 'g' : 'r'}"><b>${acc}/${atk.length}</b><span>attack presses buffered by the queue window</span></div><div class="${sim.by === 'dodge' ? 'g' : 'y'}"><b>${R.interrupt.on ? R.interrupt.a : 'none'}</b><span>first frame a dodge can cancel the swing</span></div><div><b>${R.hit.on ? R.hit.tail : 0}</b><span>frames of hitstun on the target</span></div>`);
      say($(s, '.ed-out'), cap || (st.view === 'compare'
        ? 'Both strikes end on the same frame. Measured from contact, the dagger’s dodge and guard interrupts open much sooner: light weapons let you act again quickly, heavy ones hold you in place.'
        : 'Press J to attack and K to dodge while the strike loops, or drag the windows. Green presses are accepted, red ones refused.'));
    }

    function drawStage(f, P, R, sim, sh) {
      g.save(); g.translate(sh.x, sh.y);
      panel(g, 0, 0, W, 200);
      ground(g, 30, 760, 188);
      const L = P.L, fx = Math.min(f, L), cut = sim.cut, a = R.hit.a, b = R.hit.b;
      const tf = cut != null ? Math.min(fx, cut) : fx;   // the strike freezes at the cancel
      const armAt = q => pose(q, a, b, L).arm;
      const pp = pose(tf, a, b, L);
      const tr = R.translation, lunge = tr.on ? P.lunge * ease((tf - tr.a) / Math.max(1, tr.b - tr.a)) : 0;
      const bx = 250, o = { x: bx + lunge, y: 188, s: .78, arm: pp.arm, lean: pp.lean, weapon: P.blade };
      const dx = bx + P.lunge + P.reach;
      // the target
      const stunK = sim.lands && fx >= a ? (fx - a) / Math.max(1, R.hit.tail) : -1;
      dummy(g, dx, 188, { s: .8, recoil: stunK >= 0 && stunK < 1 ? Math.sin(Math.min(1, stunK * 3) * Math.PI / 2) * (1 - stunK) : 0, flash: stunK >= 0 && fx - a < 3 ? .7 : 0 });
      if (stunK >= 0 && stunK < 1) { g.fillStyle = 'rgba(168,32,28,.2)'; g.fillRect(dx - 30, 64, 60, 7); g.fillStyle = '#a8201c'; g.fillRect(dx - 30, 64, 60 * (1 - stunK), 7); lab(g, 'hitstun', dx, 54, { col: '#a8201c', size: 13, align: 'center' }); }
      // the arrow
      if (st.arrow) {
        const af = P.arrow, k = (fx - (af - 8)) / 8;
        if (k > 0 && k < 1.3) { const ax = lerp(760, o.x + 10, Math.min(k, 1)), ay = 110; g.strokeStyle = '#7a5a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + 40, ay); g.stroke(); g.fillStyle = C.redDk; g.beginPath(); g.moveTo(ax - 8, ay); g.lineTo(ax + 2, ay - 6); g.lineTo(ax + 2, ay + 6); g.fill(); }
      }
      // the attacker: striking, rolling away, or flinching
      const iw = R.iframes.on && tf >= R.iframes.a && tf < R.iframes.b && (cut == null || fx < cut);
      if (cut != null && fx >= cut && sim.by === 'dodge') {
        const k = clamp((fx - cut) / 16), ox = o.x - 120 * easeOut(k);
        knight(g, { ...o, x: ox, arm: .9, lean: 0, spin: -TAU * easeOut(k), squash: lerp(1, .7, Math.sin(k * Math.PI)), alpha: .95 });
        pill(g, 'cancelled into a dodge', ox, 30, '#1f9e8f');
      } else if (cut != null && fx >= cut) {
        const k = clamp((fx - cut) / 14);
        knight(g, { ...o, lean: -.35 * Math.sin(Math.min(1, k * 2) * Math.PI / 2) * (1 - k * .5), flash: k < .2 ? .7 : 0 });
        pill(g, 'flinched: swing interrupted', o.x, 30, C.redDk);
      } else {
        if (R.vfx.on && tf >= R.vfx.a && tf < R.vfx.b && pp.ph !== 'startup') trail(g, o, armAt, tf);
        knight(g, { ...o, alpha: iw ? .45 + .25 * Math.sin(f * 2.4) : 1 });
        if (iw) pill(g, PROT[st.prot].name, o.x, 30, PROT[st.prot].col);
        else pill(g, { startup: 'Startup', active: 'Active', recovery: 'Recovery' }[pp.ph], o.x, 30, PH[pp.ph]);
      }
      // the sensory trio at the impact
      const hx = dx - 6, hy = 100;
      if (R.vfx.on && sim.lands && fx >= Math.max(a, R.vfx.a) && fx < R.vfx.b) spark(g, hx, hy, fx - Math.max(a, R.vfx.a));
      const sOn = R.sound.on && fx >= R.sound.a && fx < R.sound.b && (cut == null || fx < cut);
      if (sOn) { ripple(g, hx, hy, fx - R.sound.a); lab(g, 'CLANG', hx + 34, hy - 46, { col: '#d14b9a', size: 22, weight: 800, font: 'Montserrat, Jost, sans-serif' }); }
      speaker(g, 40, 30, sOn); lab(g, R.sound.on ? 'sound' : 'sound off', 76, 30, { col: R.sound.on ? '#d14b9a' : C.muted, size: 13 });
      if (R.shake.on && fx >= R.shake.a && fx < R.shake.b) lab(g, 'shake', 76, 54, { col: '#8b6136', size: 13 });
      g.restore();
      // rotation inset (top-down): the attacker tracks the target only inside the rotation window
      const ix = 790, iy = 14, iw2 = 236, ih = 172, cx = ix + iw2 / 2, cy = iy + ih / 2 + 8;
      g.fillStyle = 'rgba(237,231,220,.9)'; g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.roundRect(ix, iy, iw2, ih, 10); g.fill(); g.stroke();
      lab(g, 'Rotation, seen from above', ix + 10, iy + 14, { col: C.muted, size: 13 });
      const tAng = q => -1 + q * (2 / L), rot = R.rotation;
      const face = rot.on ? tAng(clamp(tf, rot.a, rot.b)) : tAng(0), trk = rot.on && tf >= rot.a && tf < rot.b && (cut == null || fx < cut);
      const tx = cx + Math.cos(tAng(fx)) * 60, ty = cy + Math.sin(tAng(fx)) * 60;
      g.fillStyle = 'rgba(46,163,220,.18)'; g.beginPath(); g.moveTo(cx - 40, cy); g.arc(cx - 40, cy, 100, face - .2, face + .2); g.closePath(); g.fill();
      g.fillStyle = '#d9b57a'; g.strokeStyle = '#7a5a3a'; g.beginPath(); g.arc(tx - 40, ty, 9, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = C.blue; g.strokeStyle = C.navy; g.beginPath(); g.arc(cx - 40, cy, 12, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 40, cy); g.lineTo(cx - 40 + Math.cos(face) * 11, cy + Math.sin(face) * 11); g.stroke();
      lab(g, trk ? 'tracking the target' : rot.on && tf < rot.a ? 'not tracking yet' : 'facing locked', ix + 10, iy + ih - 14, { col: trk ? '#2ea3dc' : C.muted, size: 13 });
    }

    function drawLane(f, P, sim) {
      lab(g, 'Presses', TX - 152, LANE_Y, { col: C.ink, size: 14 });
      lab(g, 'J attack, K dodge', TX - 98, LANE_Y, { col: C.muted, size: 12, weight: 500 });
      g.fillStyle = 'rgba(38,44,106,.05)'; g.fillRect(TX, LANE_Y - 12, TW, 24);
      sim.ev.forEach(e => {
        const x = tl.fx(e.f + .5), past = f >= e.f, col = e.ok == null ? '#9aa0bf' : e.ok ? C.green : C.red;
        g.lineWidth = 2;
        if (e.k === 'arrow') {
          g.fillStyle = past ? col : 'rgba(255,252,244,.9)'; g.strokeStyle = past ? col : '#9aa0bf';
          g.beginPath(); g.moveTo(x - 9, LANE_Y); g.lineTo(x + 7, LANE_Y - 8); g.lineTo(x + 7, LANE_Y + 8); g.closePath(); g.fill(); g.stroke();
          return;
        }
        g.fillStyle = past ? col : 'rgba(255,252,244,.95)'; g.strokeStyle = past ? col : e.you ? C.navy : '#9aa0bf';
        g.beginPath(); if (e.k === 'atk') g.arc(x, LANE_Y, 9, 0, TAU); else g.roundRect(x - 9, LANE_Y - 9, 18, 18, 3); g.fill(); g.stroke();
        lab(g, e.k === 'atk' ? 'J' : 'K', x, LANE_Y + 1, { col: past ? '#fff' : C.ink, size: 12, align: 'center' });
      });
    }

    function drawCompare(f) {
      const L = 54, gR = byId(st.rows.great), dR = byId(st.rows.dagger), off = L - WEAP.dagger.L;
      g.clearRect(0, 0, W, H);
      panel(g, 0, 0, W, 200);
      ground(g, 30, W - 30, 188);
      [['dagger', dR, off, 120], ['great', gR, 0, 560]].forEach(([w, R, o0, bx]) => {
        const P = WEAP[w], lf = clamp(Math.min(f, L) - o0, 0, P.L), pp = pose(lf, R.hit.a, R.hit.b, P.L), tr = R.translation;
        const lunge = tr.on ? P.lunge * ease((lf - tr.a) / Math.max(1, tr.b - tr.a)) : 0;
        const k = { x: bx + lunge, y: 188, s: .72, arm: pp.arm, lean: pp.lean, weapon: P.blade }, dx = bx + P.lunge + P.reach * .92;
        dummy(g, dx, 188, { s: .74, flash: lf >= R.hit.a && lf < R.hit.a + 3 ? .7 : 0 });
        if (pp.ph === 'active') trail(g, k, q => pose(q, R.hit.a, R.hit.b, P.L).arm, lf);
        knight(g, k);
        lab(g, P.name, bx - 70, 24, { col: C.ink, size: 18, weight: 700 });
        const dOk = Math.min(f, L) - o0 >= R.interrupt.a, gOk = Math.min(f, L) - o0 >= P.guard;
        pill(g, dOk ? 'dodge ready' : 'no dodge yet', bx - 70, 54, dOk ? '#1f9e8f' : 'rgba(93,97,140,.45)', { align: 'left' });
        pill(g, gOk ? 'guard ready' : 'no guard yet', bx - 70, 84, gOk ? '#3f8fd6' : 'rgba(93,97,140,.45)', { align: 'left' });
        if (f < o0) lab(g, 'waiting, so both end together', bx - 70, 114, { col: C.muted, size: 13 });
      });
      // aligned strips
      const pf = TW / L, X = q => TX + q * pf;
      TL.ruler(g, TX, RULER_Y, TW, L);
      lab(g, 'aligned by end frame', TX - 152, RULER_Y + 9, { col: C.muted, size: 13 });
      [['dagger', dR, off, 300], ['great', gR, 0, 430]].forEach(([w, R, o0, y]) => {
        const P = WEAP[w];
        lab(g, P.name, TX - 152, y + 13, { col: C.ink, size: 16, weight: 700 });
        TL.strip(g, X(o0), y, P.L * pf, P.L, [{ a: 0, b: R.hit.a, col: PH.startup, label: 'Startup' }, { a: R.hit.a, b: R.hit.b, col: PH.active }, { a: R.hit.b, b: P.L, col: PH.recovery, label: 'Recovery' }], { h: 26 });
        const bar = (a, col, txt, yy) => { if (a >= P.L) return; g.fillStyle = col; g.beginPath(); g.roundRect(X(o0 + a), yy, X(o0 + P.L) - X(o0 + a), 18, 4); g.fill(); lab(g, txt, X(o0 + a) - 6, yy + 9, { col, size: 13, align: 'right' }); };
        if (R.interrupt.on) bar(R.interrupt.a, '#1f9e8f', `dodge from frame ${R.interrupt.a}`, y + 34);
        bar(P.guard, '#3f8fd6', `guard from frame ${P.guard}`, y + 58);
        // contact marker and the gap to the dodge
        const cx = X(o0 + R.hit.a);
        g.fillStyle = C.redDk; g.beginPath(); g.moveTo(cx, y - 2); g.lineTo(cx - 7, y - 12); g.lineTo(cx + 7, y - 12); g.fill();
        lab(g, 'contact', cx, y - 20, { col: C.redDk, size: 12, align: 'center' });
        if (R.interrupt.on) {
          const x1 = X(o0 + R.interrupt.a), yy = y + 92;
          g.strokeStyle = '#1f9e8f'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, yy - 6); g.lineTo(cx, yy); g.lineTo(x1, yy); g.lineTo(x1, yy - 6); g.stroke();
          const gl = `${R.interrupt.a - R.hit.a} frames from contact to dodge`, right = Math.max(cx, x1) + 8 + 200 < W;
          lab(g, gl, right ? Math.max(cx, x1) + 8 : Math.min(cx, x1) - 8, yy, { col: '#1f9e8f', size: 13, align: right ? 'left' : 'right' });
        }
      });
      const px = X(Math.min(f, L));
      g.fillStyle = C.navy; g.fillRect(px - 1.5, RULER_Y - 4, 3, 300);
      lab(g, 'Frame values are illustrative.', W - 20, H - 14, { col: C.muted, size: 13, align: 'right', weight: 500 });
    }

    function draw(f, cap) {
      const P = WEAP[st.weapon], R = byId(tl.rows), L = P.L;
      tl.disabled = st.view === 'compare';
      if (st.view === 'compare') { drawCompare(f); stats(P, R, simulate(P, R, st), cap); return; }
      const sim = simulate(P, R, st);
      g.clearRect(0, 0, W, H);
      const fx = Math.min(f, L), sOn = R.shake.on && fx >= R.shake.a && fx < R.shake.b && (sim.cut == null || fx < sim.cut);
      const sh = sOn ? shakeAt(fx * 3, P.shake * (1 - (fx - R.shake.a) / Math.max(1, R.shake.b - R.shake.a))) : { x: 0, y: 0 };
      drawStage(f, P, R, sim, sh);
      drawLane(fx, P, sim);
      // phase strip derived from the hit window sits in the ruler row
      tl.draw(g, { frame: fx, cut: sim.cut != null && fx >= sim.cut ? sim.cut : null, cutLabel: sim.by === 'dodge' ? 'cancelled into a dodge' : sim.by ? 'interrupted by the flinch' : '', rulerY: RULER_Y });
      if (st.arrow) { const i = ROWS.findIndex(r => r[0] === 'iframes'), y = ROW_Y + i * ROW_H + 12, x = tl.fx(P.arrow + .5); g.fillStyle = C.redDk; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 6, y - 7); g.lineTo(x + 6, y + 7); g.fill(); }
      // status line: the latest press the playhead has passed
      const last = sim.ev.filter(e => e.f <= fx).at(-1);
      const y = H - 18;
      if (last) lab(g, `Frame ${last.f}: ${last.k === 'arrow' ? last.why : last.why}.`, TX - 152, y, { col: last.ok == null ? C.muted : last.ok ? '#1a8a4c' : C.redDk, size: 15 });
      else lab(g, 'Drag a window edge, or click a row name to switch it off. Frame values are illustrative.', TX - 152, y, { col: C.muted, size: 15, weight: 500 });
      stats(P, R, sim, cap);
    }
    scenes.editor = { seek(t) { st.held = true; const k = tourAt(t % TOUR_DUR); draw(k.frame, k.say); }, dur: () => TOUR_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= TOUR_DUR) st.t = 0; const k = tourAt(st.t); draw(k.frame, k.say); return; }
      const lapLen = (st.view === 'compare' ? 54 : WEAP[st.weapon].L) + ED_HOLD, f = (st.t * st.fps) % lapLen;
      if (f < st.last) st.manual = [];
      st.last = f;
      draw(f, '');
    };
  });

  /* ================= 3. plus, even or minus ================= */
  const FA_DEF = { S: 8, A: 3, R: 14, block: 15, hit: 19 }, JAB = 6, FA_HOLD = 14;
  canvasDemo('advantage', (s, c, g) => {
    const st = { ...FA_DEF, mode: 'block', tour: true, held: false, t: 0, key: '', cursor: null };
    const tourBtn = $(s, '.fa-tour'), inp = k => $(s, `input[data-k=${k}]`);
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); Object.assign(st, FA_DEF, { mode: 'block' }); st.cursor = null; st.t = 0; } };
    const stun = () => st[st.mode];
    ['S', 'A', 'R'].forEach(k => inp(k).oninput = () => { manual(); st[k] = +inp(k).value; });
    inp('B').oninput = () => { manual(); st[st.mode] = +inp('B').value; };
    $$(s, '.fa-mode .btn').forEach(b => b.onclick = () => { manual(); st.mode = b.dataset.m; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.fa-reset').onclick = () => { manual(); Object.assign(st, FA_DEF); };

    const X0 = 190, XW = W - X0 - 30, AY = 300, DY = 392;
    const N = () => Math.max(56, Math.max(st.S + st.A + st.R, st.S + stun()) + JAB + 6);
    const fx = q => X0 + q * XW / N();
    // dragging the end of the recovery bar or the end of the stun bar
    let drag = null;
    const pos = e => FPF.ptr(c, e);
    const grab = p => {
      if (Math.abs(p.y - (AY + 15)) < 22 && Math.abs(p.x - fx(st.S + st.A + st.R)) < 14) return 'R';
      if (Math.abs(p.y - (DY + 15)) < 22 && Math.abs(p.x - fx(st.S + stun())) < 14) return 'B';
      return null;
    };
    c.addEventListener('pointerdown', e => { const k = grab(pos(e)); if (!k) return; manual(); drag = { k, n: N() }; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => {
      const p = pos(e);
      if (!drag) { c.style.cursor = grab(p) ? 'ew-resize' : ''; return; }
      const fr = Math.round((p.x - X0) / XW * drag.n);
      if (drag.k === 'R') st.R = clamp(fr - st.S - st.A, 4, 36); else st[st.mode] = clamp(fr - st.S, 4, 36);
    });
    c.addEventListener('pointerup', () => { drag = null; });

    function verdict() {
      const B = stun(), af = st.S + st.A + st.R, df = st.S + B, adv = df - af, on = st.mode === 'block' ? 'on block' : 'on hit';
      if (adv > 0) return { adv, af, df, col: C.green, big: `+${adv} ${on}`, kind: 'plus', line: af + JAB <= df ? `Plus ${adv}: your ${JAB}-frame jab lands before the defender is free, so it combos.` : `Plus ${adv}: you recover first, so it is your turn. The defender has to respect your next move.` };
      if (adv === 0) return { adv, af, df, col: '#c08a12', big: `Even ${on}`, kind: 'even', line: 'Even: both sides are free on the same frame, and nobody has the turn.' };
      if (-adv < JAB) return { adv, af, df, col: '#e07b1e', big: `${adv} ${on}`, kind: 'minus', line: `Minus ${-adv}: the defender acts first, but their fastest jab (${JAB} frames) arrives after you can guard. Safe.` };
      return { adv, af, df, col: C.redDk, big: `${adv} ${on}: unsafe`, kind: 'unsafe', line: `Minus ${-adv}: the defender's ${JAB}-frame jab lands while you are still recovering. Unsafe: you get punished.` };
    }
    // walk-through: drag recovery longer (unsafe), then shorter (plus), then switch to on hit
    const LAP = 3.6;
    const FT = [
      { d: LAP, say: 'The defender blocks on the first active frame. Frame advantage is the defender’s blockstun minus what is left of the attack: active plus recovery.' },
      { d: 1.3, drag: ['R', 14, 23], say: 'Drag the recovery longer...' },
      { d: LAP, say: '...and the attack is unsafe on block: the defender recovers so early that even their fastest jab lands before you can guard.' },
      { d: 1.3, drag: ['R', 23, 10], say: 'Shorten the recovery...' },
      { d: LAP, say: '...and the attack is plus on block: you recover first and keep the turn.' },
      { d: LAP, set: st => { st.mode = 'hit'; }, say: 'On hit, the hitstun is longer than the blockstun, so the same attack is further plus. That gap is what lets a hit lead into more.' },
    ];
    const FT_DUR = FT.reduce((a, x) => a + x.d, 0);
    function tourAt(t) {
      Object.assign(st, FA_DEF, { mode: 'block' }); st.cursor = null;
      let t0 = 0, out = { frame: 0, say: '' };
      for (const seg of FT) {
        const cur = t < t0 + seg.d, k = clamp((t - t0) / seg.d);
        seg.set?.(st);
        if (seg.drag) { const [key, a, b] = seg.drag; st[key] = Math.round(lerp(a, b, cur ? ease((k - .2) / .6) : 1)); }
        if (cur) {
          out.say = seg.say; out.frame = seg.drag ? 0 : Math.min((t - t0) * 20, N() + FA_HOLD - .01);
          if (seg.drag) { const hx = fx(st.S + st.A + st.R), hy = AY + 15; st.cursor = k < .2 ? { x: lerp(hx + 50, hx, ease(k / .2)), y: lerp(hy + 80, hy, ease(k / .2)), down: false } : { x: hx, y: hy, down: k < .85 }; }
          break;
        }
        t0 += seg.d;
      }
      return out;
    }
    function info(v, cap) {
      ['S', 'A', 'R'].forEach(k => { if (+inp(k).value !== st[k]) inp(k).value = st[k]; $(s, `[data-v=${k}]`).textContent = `${st[k]} f`; });
      if (+inp('B').value !== stun()) inp('B').value = stun();
      $(s, '[data-v=B]').textContent = `${stun()} f`;
      const key = [st.S, st.A, st.R, stun(), st.mode, cap].join(); if (key === st.key) return; st.key = key;
      $(s, '.fa-stun-name').textContent = st.mode === 'block' ? 'Defender blockstun' : 'Defender hitstun';
      $$(s, '.fa-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === st.mode));
      say($(s, '.fa-stats'), `<div class="${v.kind === 'plus' ? 'g' : v.kind === 'even' ? 'y' : 'r'}"><b>${v.adv > 0 ? '+' : ''}${v.adv}</b><span>frame advantage ${st.mode === 'block' ? 'on block' : 'on hit'}</span></div><div><b>${v.af}</b><span>frame the attacker is free</span></div><div><b>${v.df}</b><span>frame the defender is free</span></div>`);
      say($(s, '.fa-out'), cap || v.line);
    }
    function draw(f, cap) {
      const v = verdict(), n = N(), B = stun(), blk = st.mode === 'block';
      g.clearRect(0, 0, W, H);
      panel(g, 0, 0, W, 236);
      ground(g, 30, W - 30, 222);
      // who acts after both are free
      const atkJab = v.adv >= 0 ? v.af : null, defJab = v.adv <= 0 ? v.df : null;
      const unsafe = v.kind === 'unsafe', defLand = defJab != null ? defJab + JAB : null, atkLand = atkJab != null ? atkJab + JAB : null;
      // attacker
      const S = st.S, A = st.A, L = v.af;
      let pa = pose(Math.min(f, L), S, S + A, L), aArm = pa.arm, aLean = pa.lean, aFlash = 0;
      if (atkJab != null && f >= atkJab) { const k = clamp((f - atkJab) / JAB); aArm = lerp(.9, 0, easeOut(k)); aLean = .12 * k; }
      if (unsafe && f >= defLand) { aFlash = f < defLand + 3 ? .7 : 0; aLean = -.3; }
      const ax = 430 + 30 * easeOut((Math.min(f, L) - S + 4) / (A + 6));
      knight(g, { x: ax, y: 222, s: .95, arm: aArm, lean: aLean, weapon: 'sword', flash: aFlash });
      // defender: blocks (or reels on hit) through the stun, then jabs or guards
      const inStun = f >= S && f < v.df, sk = clamp((f - S) / B);
      let dArm = .9, dLean = 0, dFlash = 0, shield = blk && f >= S - 6 && f < v.df + 2;
      if (inStun) { dLean = blk ? -.08 * (1 - sk) : -.3 * Math.sin(Math.min(1, sk * 3) * Math.PI / 2) * (1 - sk * .6); dFlash = f - S < 3 ? .6 : 0; }
      if (defJab != null && f >= defJab) { const k = clamp((f - defJab) / JAB); dArm = lerp(.9, 0, easeOut(k)); shield = false; }
      else if (atkJab != null && f >= v.df) shield = true;
      const push = f >= S ? 26 * easeOut(clamp((f - S) / 8)) : 0;
      knight(g, { x: 600 + push, y: 222, s: .95, face: -1, arm: dArm, lean: dLean, weapon: 'sword', col: C.foe, dark: C.foeDk, shield, flash: dFlash });
      if (f >= S && f < S + 5) spark(g, 560 + push * .5, 140, f - S, 24);
      lab(g, 'Attacker', 430, 26, { col: C.blue, size: 17, weight: 700, align: 'center' });
      lab(g, 'Defender', 610, 26, { col: C.foe, size: 17, weight: 700, align: 'center' });
      const tag = (t, x, col) => pill(g, t, x, 56, col);
      if (f < S) tag('startup', 430, PH.startup); else if (f < S + A) tag('active', 430, PH.active); else if (f < L) tag('recovery', 430, PH.recovery);
      else if (unsafe && f >= defLand) tag('punished', 430, C.redDk); else if (atkJab != null) tag('your turn: jab', 430, C.green); else tag('guarding', 430, '#3f8fd6');
      if (inStun) tag(blk ? 'blockstun' : 'hitstun', 610, C.purple); else if (f >= v.df) tag(defJab != null ? 'jab' : 'must guard', 610, defJab != null ? '#e07b1e' : '#3f8fd6');
      if (f >= v.af && f >= v.df && v.kind === 'even' && f >= v.af + JAB) lab(g, 'both jabs land together: a trade', 520, 150, { col: '#c08a12', size: 18, align: 'center' });

      // frame strips
      const P = q => fx(q);
      TL.ruler(g, X0, AY - 30, XW, n);
      lab(g, 'Attacker', X0 - 170, AY + 15, { col: C.blue, size: 16, weight: 700 });
      lab(g, 'Defender', X0 - 170, DY + 15, { col: C.foe, size: 16, weight: 700 });
      const aSeg = [{ a: 0, b: S, col: PH.startup, label: 'startup' }, { a: S, b: S + A, col: PH.active }, { a: S + A, b: L, col: PH.recovery, label: 'recovery' }];
      if (atkJab != null) aSeg.push({ a: L, b: L + JAB, col: '#9fdcae', label: 'jab', txt: C.ink });
      else aSeg.push({ a: L, b: Math.min(n, L + JAB + 4), col: '#bcd3f0', label: unsafe ? '' : 'guard', txt: C.ink });
      TL.strip(g, X0, AY, XW, n, aSeg, { h: 30 });
      const dSeg = [{ a: 0, b: S, col: '#c9cbd9', label: 'idle', txt: C.ink }, { a: S, b: v.df, col: C.purple, label: blk ? 'blockstun' : 'hitstun', hatch: 'rgba(255,255,255,.25)' }];
      if (defJab != null) dSeg.push({ a: v.df, b: v.df + JAB, col: '#f4c58f', label: 'jab', txt: C.ink });
      else dSeg.push({ a: v.df, b: Math.min(n, v.df + JAB + 4), col: '#bcd3f0', label: 'guard', txt: C.ink });
      TL.strip(g, X0, DY, XW, n, dSeg, { h: 30 });
      // grips on the two draggable ends
      [[L, AY], [v.df, DY]].forEach(([q, y]) => { g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(P(q) - 4, y - 5, 8, 40, 3); g.fill(); g.stroke(); });
      lab(g, 'drag', P(v.df), DY + 46, { col: C.muted, size: 11, align: 'center' });
      // advantage bracket between the free frames
      const x1 = P(v.af), x2 = P(v.df), my = (AY + 30 + DY) / 2;
      g.strokeStyle = v.col; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, AY + 30); g.lineTo(x1, my); g.lineTo(x2, my); g.lineTo(x2, DY); g.stroke();
      lab(g, v.adv === 0 ? '0' : `${v.adv > 0 ? '+' : ''}${v.adv}`, Math.max(x1, x2) + 10, my, { col: v.col, size: 18, weight: 800 });
      if (unsafe) { const lx = P(defLand); g.fillStyle = C.redDk; g.beginPath(); g.moveTo(lx, AY + 30); g.lineTo(lx - 7, AY + 42); g.lineTo(lx + 7, AY + 42); g.fill(); lab(g, 'jab lands', lx + 10, AY + 40, { col: C.redDk, size: 12 }); }
      // playhead
      g.fillStyle = C.navy; g.fillRect(P(Math.min(f, n)) - 1.5, AY - 34, 3, DY - AY + 70);
      // verdict
      lab(g, v.big, W / 2, 484, { col: v.col, size: 34, weight: 800, align: 'center', font: 'Montserrat, Jost, sans-serif' });
      lab(g, `Advantage = ${blk ? 'blockstun' : 'hitstun'} ${B} − (active ${A} + recovery ${st.R}) = ${v.adv}`, W / 2, 524, { col: C.ink, size: 17, align: 'center' });
      lab(g, `Defender's fastest jab: ${JAB} frames. Frame values are illustrative.`, W / 2, 556, { col: C.muted, size: 14, align: 'center', weight: 500 });
      if (st.cursor) TL.hand(g, st.cursor.x, st.cursor.y, st.cursor.down);
      info(v, cap);
    }
    scenes.advantage = { seek(t) { st.held = true; const k = tourAt(t % FT_DUR); draw(k.frame, k.say); }, dur: () => FT_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= FT_DUR) st.t = 0; const k = tourAt(st.t); draw(k.frame, k.say); return; }
      draw((st.t * 20) % (N() + FA_HOLD), '');
    };
  });

  /* ================= 4. hitstun variants ================= */
  const STYLES = [
    { name: 'None', game: 'StarCraft', say: 'No hitstun. In StarCraft a unit that is hit keeps doing what it was doing: the hit only takes health. Reactions would make large battles unreadable, so damage is the whole story.' },
    { name: 'Freeze', game: 'Hollow Knight', say: 'A freeze, or hit-stop. In Hollow Knight both sides stop for a few frames on contact, then the target is knocked back. The pause is short, but it makes each hit feel solid.' },
    { name: 'Interrupt', game: 'Under Night In-Birth', say: 'An interrupt. In fighting games like Under Night In-Birth a hit cancels whatever the target was doing, including its own attack, and holds it in hitstun.' },
    { name: 'Crumple', game: 'Street Fighter 6', say: 'A unique reaction. Street Fighter 6’s crumple folds the target slowly to the floor: a long, readable stun that rewards the hit with time for a follow-up.' },
  ];
  // Phalanx's 'Sword and Board Punch Attack' against the claw probe (assets/atomech-rigs.js). The strike's timing comes
  // from her rig: the HitboxSB slot keys the hitbox on at frame 7 and off at frame 10 of 23 (30 fps). Clock: 20 frames a second.
  const HS_L = 72, HS_HOLD = 6, HS_SEG = 4.5, RIG_FPS = 30;
  const PUNCH = 'Sword and Board Punch Attack', PH_IDLE = 'Sword and Board Idle';
  canvasDemo('stun', (s, c, g) => {
    const st = { pick: -1, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.hs-tour');
    $$(s, '.hs-pick .btn').forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.pick = +b.dataset.i; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // frame data, replaced by the rig's own numbers once it loads
    const T = { S: 5, on: 7, off: 10, len: 23, wound: 20, death: 55 };
    const FZ = 8;                                  // the freeze length, in frames
    const HF = () => T.S + T.on;                   // the hit frame: Phalanx's hitbox switches on over the probe
    const CW = 512, GH = 200, GY = 196;            // cell width; the rig layer covers the top GH px of a cell, ground at GY
    const gl = document.createElement('canvas'); gl.width = CW; gl.height = GH;
    let rigs = null;
    if (window.AtomechRigs) AtomechRigs.create(gl).then(sc => {
      const ph = sc.rig('phalanx'), cl = sc.rig('claw');
      ph.scale = .15; cl.scale = .275; ph.faceRight = true; cl.faceRight = false;
      const w = ph.hitWindows(PUNCH)[0], fr = v => Math.round(v * RIG_FPS);
      Object.assign(T, { on: fr(w.on), off: fr(w.off), len: fr(ph.duration(PUNCH)), wound: fr(cl.duration('Wound')), death: fr(cl.duration('Death')) });
      rigs = { sc, ph, cl };
    }).catch(e => console.warn('hitstun rigs did not load', e));
    const rt = (anim, rig, fr, loop) => { const d = rig.duration(anim), v = fr / RIG_FPS; return loop ? ((v % d) + d) % d : clamp(v / d) * d * .9999; };
    function figures(i, x, y, f, tf, flash, kb) {
      if (!rigs) return;
      const { sc, ph, cl } = rigs, hf = HF(), age = f - hf;
      ph.x = 150; ph.y = GH - GY; cl.x = 300 + kb; cl.y = GH - GY - 36;
      const ta = tf - T.S;   // frames into the punch
      if (ta < 0 || ta >= T.len) ph.pose(PH_IDLE, rt(PH_IDLE, ph, ta < 0 ? f : ta - T.len, true)); else ph.pose(PUNCH, rt(PUNCH, ph, ta));
      if (i === 0) cl.pose('Attack', rt('Attack', cl, f, true));                         // keeps attacking on its own rhythm
      else if (i === 1) {
        if (age < FZ) cl.pose('Idle', rt('Idle', cl, Math.min(f, hf), true));           // held through the freeze
        else if (age - FZ < T.wound) cl.pose('Wound', rt('Wound', cl, age - FZ));
        else cl.pose('Idle', rt('Idle', cl, age - FZ - T.wound, true));
      } else if (i === 2) {                                                              // its own attack, cancelled by the hit
        if (age < 0) cl.pose('Attack', rt('Attack', cl, f));
        else if (age < T.wound) cl.pose('Wound', rt('Wound', cl, age));
        else cl.pose('Idle', rt('Idle', cl, age - T.wound, true));
      } else if (age < 0) cl.pose('Idle', rt('Idle', cl, f, true));
      else cl.pose('Death', rt('Death', cl, age));
      cl.skeleton.color.set(1, 1 - .55 * flash, 1 - .55 * flash, 1);
      sc.draw();
      g.drawImage(gl, x, y);
    }
    function cell(i, x, y, w, h, f, hi) {
      g.save();
      const hf = HF();
      const freeze = i === 1 && f >= hf && f < hf + FZ;
      if (freeze) { const sh = shakeAt(f * 3, 3); g.translate(sh.x, sh.y); }
      g.fillStyle = hi ? 'rgba(255,250,236,.98)' : C.paper; g.strokeStyle = hi ? C.gold : C.line; g.lineWidth = hi ? 4 : 2;
      g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.stroke();
      g.beginPath(); g.roundRect(x, y, w, h, 12); g.clip();
      lab(g, STYLES[i].name, x + 16, y + 22, { col: C.ink, size: 20, weight: 800, font: 'Montserrat, Jost, sans-serif' });
      lab(g, STYLES[i].game, x + w - 16, y + 22, { col: C.muted, size: 15, align: 'right' });
      const gy = y + GY; ground(g, x + 20, x + w - 20, gy);
      // time as each side experiences it: the freeze holds both in place
      const tf = i === 1 ? (f < hf ? f : f < hf + FZ ? hf : f - FZ) : f;
      const hitAge = tf - hf, age = f - hf;
      const flash = i === 1 ? (freeze ? .7 : 0) : age >= 0 && age < (i === 0 ? 2 : 3) ? .7 : 0;
      const kb = i === 1 && hitAge > 0 ? 40 * easeOut(hitAge / 10) : 0;
      const tX = x + 300 + kb;
      figures(i, x, y, f, tf, flash, kb);
      if (i !== 0 && hitAge >= 0 && hitAge < 5) spark(g, x + 272, gy - 62, hitAge, 22);   // the freeze holds the spark at its first frame
      // health bar
      const hp = f >= hf ? .62 : 1; g.fillStyle = 'rgba(168,32,28,.2)'; g.fillRect(tX - 30, y + 52, 60, 6); g.fillStyle = C.red; g.fillRect(tX - 30, y + 52, 60 * hp, 6);
      if (f >= hf && f < hf + 16) lab(g, '-38', tX + 38, y + 56 - (f - hf) * .8, { col: C.redDk, size: 15, weight: 700 });
      if (freeze) lab(g, 'freeze', x + w / 2, y + 22, { col: C.navy, size: 16, weight: 700, align: 'center' });
      // mini frame strips
      const sx = x + 96, sw = w - 116, pf = sw / HS_L;
      lab(g, 'Phalanx', x + 16, y + 222, { col: C.blue, size: 13, weight: 700 });
      lab(g, 'Probe', x + 16, y + 248, { col: C.foe, size: 13, weight: 700 });
      // the freeze lands inside the active window: the hitbox stays live through it, and recovery waits for the release
      const fz = i === 1 ? FZ : 0, A0 = T.S + T.on, A1 = T.S + T.off + fz, E = T.S + T.len + fz;
      const aS = [{ a: 0, b: T.S, col: '#c9cbd9' }, { a: T.S, b: A0, col: PH.startup }, { a: A0, b: A0 + fz, col: PH.active, label: 'freeze', hatch: 'rgba(255,255,255,.35)' },
        { a: A0 + fz, b: A1, col: PH.active }, { a: A1, b: E, col: PH.recovery }];
      const tS = [
        [{ a: 0, b: HS_L, col: '#9fdcae', label: 'keeps acting', txt: C.ink }],
        [{ a: 0, b: hf, col: '#c9cbd9' }, { a: hf, b: hf + FZ, col: '#9aa0bf', label: 'freeze', txt: '#fff' }, { a: hf + FZ, b: hf + FZ + T.wound, col: C.purple, label: 'knockback' }],
        [{ a: 0, b: hf, col: '#f4c58f', label: 'its attack', txt: C.ink }, { a: hf, b: hf + T.wound, col: C.purple, label: 'hitstun' }],
        [{ a: 0, b: hf, col: '#c9cbd9' }, { a: hf, b: Math.min(HS_L, hf + T.death), col: C.purple, label: 'crumple', hatch: 'rgba(255,255,255,.25)' }],
      ][i];
      TL.strip(g, sx, y + 212, sw, HS_L, aS, { h: 18, ticks: false });
      TL.strip(g, sx, y + 238, sw, HS_L, tS, { h: 18, ticks: false });
      g.fillStyle = C.navy; g.fillRect(sx + Math.min(f, HS_L) * pf - 1, y + 206, 2, 56);
      g.restore();
    }
    function draw(t, pick, cap) {
      g.clearRect(0, 0, W, H);
      const f = (t * 20) % (HS_L + HS_HOLD);
      const cw = 512, ch = 280;
      for (let i = 0; i < 4; i++) cell(i, 4 + (i % 2) * (cw + 12), 4 + Math.floor(i / 2) * (ch + 12), cw, ch, Math.min(f, HS_L), i === pick);
      lab(g, 'Phalanx’s punch, frame data from her rig, shown at 2/3 speed.', W - 8, H - 8, { col: C.muted, size: 12, align: 'right', weight: 500 });
      const key = pick + cap; if (key === st.key) return; st.key = key;
      $$(s, '.hs-pick .btn').forEach(b => b.classList.toggle('on', +b.dataset.i === pick));
      say($(s, '.hs-out'), pick >= 0 ? STYLES[pick].say : 'The hit window decides when a strike connects. What the target does next is a separate choice: nothing, a freeze, an interrupt, or a unique reaction. Pick one to read about it.');
    }
    const HS_DUR = HS_SEG * 4;
    scenes.stun = { seek(t) { st.held = true; t %= HS_DUR; draw(t % HS_SEG, Math.floor(t / HS_SEG), ''); }, dur: () => HS_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= HS_DUR) st.t = 0; draw(st.t % HS_SEG, Math.floor(st.t / HS_SEG), ''); }
      else draw(st.t, st.pick, '');
    };
  });

  window.__seek = (t, which = 'editor') => scenes[which].seek(t);
  window.__dur = (which = 'editor') => scenes[which].dur();
})();
