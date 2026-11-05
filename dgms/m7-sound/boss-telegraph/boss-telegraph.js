/* Hear the boss coming (Module 7, Sound Design; deck slide 23, Emmanuel Lagumbay's Guild Wars 2 raid example:
   "the sound gives them an audio timer based on when that shot is exactly going to happen").
   An original grey-box boss telegraphs a shot. The arrow on the floor says where it will land, but the wind-up length
   changes every round, so the arrow alone cannot say when. The tone rises from R.F0 to R.F1 and ends exactly when the
   shot fires, so a player can dodge on the sound. The learner dodges (Space, D or the button); a dodge gives R.IFRAMES
   of invulnerability, so it must start in the last R.IFRAMES before the shot lands. Score is kept separately for rounds
   with the tone and with the arrow alone. The tone is synthesised (Web Audio API, context made on the first "Sound"
   click) and drawn too: a rising pitch line along the bottom and rings from the boss that tighten as the pitch climbs,
   so the GIF and a muted browser show it. The canvas is a pure function of the round list and t, so __seek(t) is
   deterministic and silent. Tunable rules: R (timings, pitches) and TOUR (the walk-through's six rounds). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const R = {
    REST: 1.0,          // s between rounds with no telegraph
    AFTER: 1.1,         // s after the shot fires before the next round
    TRAVEL: .12,        // s from the shot firing to it landing on the player
    IFRAMES: .35,       // s of invulnerability after a dodge starts
    WIND: [1.5, 3.4],   // s, the wind-up length range (random each live round)
    F0: 220, F1: 880,   // Hz, the tone rises from F0 to F1 over the wind-up and stops when the shot fires
    ARROW_GROW: .45,    // s for the arrow to reach full length (then it only pulses, at a fixed rate)
  };
  // the walk-through: three rounds with the tone, three with the arrow alone. p = press time after the arrow appears
  const TOUR = [
    { W: 2.4, tone: 1, p: 2.4 + R.TRAVEL - .17 }, { W: 1.8, tone: 1, p: 1.8 + R.TRAVEL - .13 }, { W: 3.0, tone: 1, p: 3.0 + R.TRAVEL - .2 },
    { W: 2.9, tone: 0, p: 2.0 }, { W: 1.6, tone: 0, p: 2.0 }, { W: 2.2, tone: 0, p: 2.0 },
  ];
  const CARD = 'rgba(255,252,244,.85)', PANEL = '#efe6d2', LINE = '#cdbf9f', TONE = '#e0a92d', TONEDK = '#9a6a06', GREY = '#8b8fa8';
  const font = (w, s, m) => `${w} ${s}px ${m ? 'Montserrat, Jost' : 'Jost'}, sans-serif`;
  function text(g, s, x, y, col = C.ink, f = font(600, 13), al = 'left') { g.font = f; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  function panel(g, x, y, w, h, title) { g.fillStyle = PANEL; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); if (title) text(g, title, x + 14, y + 24, C.ink, font(800, 14, 1)); }
  const pitch = (r, tt) => R.F0 * Math.pow(R.F1 / R.F0, clamp((tt - r.arrow) / r.W));   // Hz at time tt
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---------- rounds: {s start, arrow, fire, hit, end, W, tone, press} ---------- */
  function mkRound(s, Wd, tone, press = null) { const arrow = s + R.REST, fire = arrow + Wd; return { s, arrow, fire, hit: fire + R.TRAVEL, end: fire + R.AFTER, W: Wd, tone, press }; }
  const TOUR_ROUNDS = (() => { let s = 0; return TOUR.map(o => { const r = mkRound(s, o.W, o.tone); r.press = r.arrow + o.p; s = r.end; return r; }); })();
  const TOUR_DUR = TOUR_ROUNDS.at(-1).end + .6;
  function outcome(r) {
    if (r.press == null) return { k: 'hit', why: 'no dodge' };
    const off = r.press - r.hit;
    if (off > 0) return { k: 'hit', why: `too late by ${off.toFixed(2)} s`, off };
    if (off < -R.IFRAMES) return { k: 'hit', why: `too early by ${(-off - R.IFRAMES).toFixed(2)} s`, off };
    return { k: 'dodged', why: 'inside the i-frames', off };
  }
  const score = (rounds, t) => { const sc = { 1: { d: 0, h: 0 }, 0: { d: 0, h: 0 } }; rounds.forEach(r => { if (t < r.hit) return; const o = outcome(r); sc[r.tone][o.k === 'dodged' ? 'd' : 'h']++; }); return sc; };

  /* ---------- audio ---------- */
  const AU = { ctx: null, master: null, on: false, noise: null };
  function ensure() {
    if (!AU.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      const c = AU.ctx = new AC(); AU.master = c.createGain(); AU.master.gain.value = 0; AU.master.connect(c.destination);
      const n = c.createBuffer(1, c.sampleRate, c.sampleRate), d = n.getChannelData(0), r = rng(5); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; AU.noise = n;
    }
    if (AU.ctx.state === 'suspended') AU.ctx.resume();
    return AU.ctx;
  }
  function setSound(on) {
    if (on && !ensure()) return;
    AU.on = on; if (AU.ctx) AU.master.gain.setTargetAtTime(on ? .8 : 0, AU.ctx.currentTime, .03);
    $$(document, '.bt-snd').forEach(b => { b.classList.toggle('on', on); b.textContent = on ? '♪ Sound: on' : '♪ Sound: off'; });
  }
  const live = () => AU.on && AU.ctx;
  // the telegraph tone: starts at the arrow, rises F0 -> F1, ends exactly at the shot. gate mutes it live.
  function sndTone(at, Wd) {
    const c = AU.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), gate = c.createGain();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.setValueAtTime(R.F0, at); o.frequency.exponentialRampToValueAtTime(R.F1, at + Wd);
    o2.frequency.setValueAtTime(R.F0 * 2, at); o2.frequency.exponentialRampToValueAtTime(R.F1 * 2, at + Wd);
    const g2 = c.createGain(); g2.gain.value = .25;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.22, at + .08); g.gain.linearRampToValueAtTime(.32, at + Wd - .01); g.gain.linearRampToValueAtTime(0, at + Wd);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(gate); gate.connect(AU.master);
    o.start(at); o2.start(at); o.stop(at + Wd + .02); o2.stop(at + Wd + .02);
    return gate;
  }
  function burst(at, dur, f0, f1, q, peak, type = 'bandpass') {
    const c = AU.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = AU.noise; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, at); f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(peak, at); g.gain.exponentialRampToValueAtTime(.001, at + dur);
    s.connect(f); f.connect(g); g.connect(AU.master); s.start(at, Math.random() * .5); s.stop(at + dur + .02);
  }
  const sndShot = at => { burst(at, .25, 2400, 300, .8, .7); const c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, at); o.frequency.exponentialRampToValueAtTime(45, at + .25); g.gain.setValueAtTime(.6, at); g.gain.exponentialRampToValueAtTime(.001, at + .3); o.connect(g); g.connect(AU.master); o.start(at); o.stop(at + .32); };
  const sndDodge = at => burst(at, .22, 600, 3000, 1.5, .35);
  const sndHit = at => burst(at, .3, 500, 120, 1, .9, 'lowpass');
  const sndSafe = at => { const c = AU.ctx; [660, 990].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, at + i * .07); g.gain.linearRampToValueAtTime(.12, at + i * .07 + .01); g.gain.exponentialRampToValueAtTime(.001, at + i * .07 + .25); o.connect(g); g.connect(AU.master); o.start(at + i * .07); o.stop(at + i * .07 + .3); }); };

  /* ---------- drawing ---------- */
  const ARENA = { x: 0, y: 0, w: 690, h: 420 }, BOSS = { x: 345, y: 96 }, PL = { x: 345, y: 330 };
  function rings(g, t, r) {
    // rings from the boss for the tone: they come faster as the pitch rises (sound made visible)
    if (!r.tone) return;
    let ts = r.arrow, k = 0;
    while (ts < Math.min(t, r.fire) && k < 200) {
      const age = t - ts, rad = 40 + age * 190;
      if (rad < 330) { const a = (1 - (rad - 40) / 290) * .9, f = pitch(r, ts); g.strokeStyle = TONE; g.globalAlpha = a; g.lineWidth = 2 + 3 * (f - R.F0) / (R.F1 - R.F0); g.beginPath(); g.arc(BOSS.x, BOSS.y, rad, 0, TAU); g.stroke(); }
      ts += .32 * R.F0 / pitch(r, ts); k++;
    }
    g.globalAlpha = 1;
  }
  function drawArena(g, r, t) {
    const A = ARENA;
    g.save(); g.beginPath(); g.roundRect(A.x, A.y, A.w, A.h, 12); g.clip();
    T.floor(A.x, A.y, A.w, A.h);
    T.wall(A.x, A.y, A.w, 16); T.wall(A.x, A.y, 14, A.h); T.wall(A.x + A.w - 14, A.y, 14, A.h); T.wall(A.x, A.y + A.h - 12, A.w, 12);
    const winding = r && t >= r.arrow && t < r.fire;
    // the arrow: says where. It grows in, then pulses at a fixed rate that says nothing about when.
    if (winding) {
      const grow = ease(clamp((t - r.arrow) / R.ARROW_GROW)), pul = .45 + .2 * Math.sin((t - r.arrow) * TAU * 1.5);
      const x0 = BOSS.x, y0 = BOSS.y + 50, y1 = lerp(y0, PL.y + 30, grow), hw = 30;
      g.fillStyle = `rgba(229,50,45,${pul})`; g.beginPath();
      g.moveTo(x0 - hw * .6, y0); g.lineTo(x0 + hw * .6, y0); g.lineTo(x0 + hw * .6, y1 - 46); g.lineTo(x0 + hw * 1.4, y1 - 46); g.lineTo(x0, y1); g.lineTo(x0 - hw * 1.4, y1 - 46); g.lineTo(x0 - hw * .6, y1 - 46); g.closePath(); g.fill();
      g.strokeStyle = C.redDk; g.lineWidth = 2; g.stroke();
    }
    if (r) rings(g, t, r);
    // boss: charges up (a glow that does not show progress either: same for every wind-up length)
    T.foe(BOSS.x, BOSS.y, 44, Math.PI / 2, '#6b5a8a', { edge: '#3a2d56', mark: 'horns' });
    if (winding) T.flash(BOSS.x, BOSS.y + 40, 30 + 6 * Math.sin(t * 14), .8);
    // the shot
    const shot = r && t >= r.fire && t < r.hit + .2;
    if (shot) {
      const k = clamp((t - r.fire) / R.TRAVEL), y = lerp(BOSS.y + 44, PL.y, k);
      T.tracer(BOSS.x, BOSS.y + 44, BOSS.x, y, 1 - clamp((t - r.hit) / .2), C.red, 14);
      T.flash(BOSS.x, y, 34, 1 - clamp((t - r.hit) / .2));
    }
    // the player: a dodge dashes sideways and back over the i-frames
    let px = PL.x, ghost = 0;
    if (r && r.press != null && t >= r.press) { const k = clamp((t - r.press) / (R.IFRAMES + .15)); px = PL.x - 92 * Math.sin(Math.PI * k); ghost = t - r.press < R.IFRAMES ? 1 : 0; }
    if (ghost) { g.fillStyle = 'rgba(87,182,255,.25)'; g.beginPath(); g.arc(px, PL.y, 30, 0, TAU); g.fill(); g.strokeStyle = C.shield; g.lineWidth = 2; g.setLineDash([4, 4]); g.stroke(); g.setLineDash([]); }
    T.player(px, PL.y, -Math.PI / 2, 1.1);
    if (r && t >= r.hit) {
      const o = outcome(r), a = 1 - clamp((t - r.hit - .6) / .5);
      if (o.k === 'hit') { T.flash(PL.x, PL.y, 60, clamp(1 - (t - r.hit) / .4)); T.popText('HIT', PL.x, PL.y - 54 - 20 * clamp((t - r.hit) * 2), C.red, a); }
      else T.popText('DODGED', PL.x - 90, PL.y - 54 - 20 * clamp((t - r.hit) * 2), C.good, a);
      T.label(o.why, PL.x, PL.y + 58, 'center', o.k === 'hit' ? C.redDk : C.good, 13);
    }
    if (winding && !r.tone) T.label('tone muted: arrow alone', BOSS.x + 150, BOSS.y, 'center', C.muted, 13);
    if (winding && r.tone) T.label('♪ rising tone', BOSS.x + 130, BOSS.y, 'center', TONEDK, 13);
    g.restore();
  }
  function drawScore(g, rounds, t, mode) {
    const b = { x: 704, y: 0, w: 336, h: 420 };
    panel(g, b.x, b.y, b.w, b.h, 'Score');
    const sc = score(rounds, t);
    [['arrow + tone', 1, TONE], ['arrow alone', 0, GREY]].forEach(([n, k, col], i) => {
      const y = b.y + 44 + i * 58, tot = sc[k].d + sc[k].h;
      g.fillStyle = '#fffaf0'; g.strokeStyle = mode === k ? col : LINE; g.lineWidth = mode === k ? 3 : 2; g.beginPath(); g.roundRect(b.x + 14, y, b.w - 28, 48, 10); g.fill(); g.stroke();
      text(g, n, b.x + 28, y + 20, C.ink, font(700, 14));
      text(g, tot ? `${sc[k].d} of ${tot} dodged` : 'no rounds yet', b.x + 28, y + 38, C.muted, font(600, 13));
      text(g, tot ? `${Math.round(sc[k].d / tot * 100)}%` : '–', b.x + b.w - 28, y + 33, k ? TONEDK : C.muted, font(800, 24, 1), 'right');
    });
    // timing chart: each dodge relative to the moment the shot lands
    const cy = b.y + 180; text(g, 'When you dodged', b.x + 14, cy, C.ink, font(800, 14, 1));
    const X0 = b.x + 24, X1 = b.x + b.w - 20, lo = -1.4, hi = .6, xo = o => X0 + (clamp(o, lo, hi) - lo) / (hi - lo) * (X1 - X0);
    const top = cy + 18, rowH = 64;
    g.fillStyle = 'rgba(47,174,99,.2)'; g.fillRect(xo(-R.IFRAMES), top, xo(0) - xo(-R.IFRAMES), rowH * 2);
    g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(xo(0), top - 4); g.lineTo(xo(0), top + rowH * 2 + 4); g.stroke();
    text(g, 'lands', xo(0) + 4, top + 12, C.red, font(700, 11));
    text(g, 'dodge window', (xo(-R.IFRAMES) + xo(0)) / 2, top + rowH * 2 + 16, C.good, font(700, 11), 'center');
    [-1, -.5, 0, .5].forEach(s => text(g, `${s > 0 ? '+' : ''}${s} s`, xo(s), top + rowH * 2 + 32, C.muted, font(600, 11), 'center'));
    [['tone', 1, TONE], ['alone', 0, GREY]].forEach(([n, k, col], i) => {
      const y = top + i * rowH + rowH / 2; g.strokeStyle = LINE; g.lineWidth = 1; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke();
      text(g, n, X0, y - 22, k ? TONEDK : C.muted, font(700, 11));
      rounds.filter(r => r.tone === k && t >= r.hit).slice(-8).forEach((r, j) => {
        const o = outcome(r), x = o.off != null ? xo(o.off) : X1 - 6;
        g.fillStyle = o.k === 'dodged' ? C.good : C.red; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y + ((j % 3) - 1) * 9, 7, 0, TAU); g.fill(); g.stroke();
        if (o.off == null) text(g, '×', x, y + 4 + ((j % 3) - 1) * 9, '#fff', font(800, 11), 'center');
      });
    });
    text(g, 'dots off the left edge: more than 1.4 s early', b.x + 14, b.y + b.h - 14, C.muted, font(500, 11));
  }
  function drawTone(g, r, t, mode) {
    const b = { x: 0, y: 432, w: 1040, h: 153 };
    panel(g, b.x, b.y, b.w, b.h, 'The tone: an audio timer');
    const X0 = b.x + 160, X1 = b.x + b.w - 24, Y0 = b.y + 40, Y1 = b.y + b.h - 26, SPAN = 3.8;
    const xt = tt => X0 + (tt - (r ? r.arrow : 0)) / SPAN * (X1 - X0), yf = f => Y1 - Math.log(f / R.F0) / Math.log(R.F1 / R.F0) * (Y1 - Y0);
    g.fillStyle = '#fffaf0'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    [R.F0, 440, R.F1].forEach(f => { g.strokeStyle = 'rgba(205,191,159,.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X0, yf(f)); g.lineTo(X1, yf(f)); g.stroke(); text(g, `${f} Hz`, X0 - 8, yf(f) + 4, C.muted, font(600, 11), 'right'); });
    text(g, 'shot fires at the top', X1 - 4, yf(R.F1) - 6, TONEDK, font(700, 11), 'right');
    for (let s = 0; s <= 3.5; s += .5) text(g, `${s} s`, xt((r ? r.arrow : 0) + s), Y1 + 16, C.muted, font(600, 11), 'center');
    if (!r || t < r.arrow) { text(g, 'waiting for the boss…', (X0 + X1) / 2, (Y0 + Y1) / 2 + 5, C.muted, font(600, 14), 'center'); return; }
    g.save(); g.beginPath(); g.rect(X0, Y0 - 6, X1 - X0, Y1 - Y0 + 12); g.clip();
    const now = Math.min(t, r.fire), done = t >= r.fire;
    // the pitch line: drawn as far as you have heard it; muted rounds only show it after the shot, dashed
    const line = (until, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash); g.beginPath(); for (let tt = r.arrow; tt <= until + 1e-6; tt += .02) { const x = xt(Math.min(tt, until)), y = yf(pitch(r, Math.min(tt, until))); tt === r.arrow ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.setLineDash([]); };
    if (r.tone) line(now, TONE, 4, []);
    else if (done) line(r.fire, 'rgba(139,143,168,.8)', 2.5, [6, 5]);
    if (!r.tone && !done) text(g, 'muted: nothing tells you when', xt(r.arrow) + 12, (Y0 + Y1) / 2 + 5, C.muted, font(700, 14));
    if (!done) { g.strokeStyle = C.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(xt(t), Y0); g.lineTo(xt(t), Y1); g.stroke(); if (r.tone) { g.fillStyle = TONE; g.beginPath(); g.arc(xt(t), yf(pitch(r, t)), 6, 0, TAU); g.fill(); } }
    if (done) {
      g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.moveTo(xt(r.fire), Y0); g.lineTo(xt(r.fire), Y1); g.stroke();
      text(g, `fired at ${r.W.toFixed(1)} s`, xt(r.fire) + 6, Y1 - 6, C.red, font(700, 12));
      g.fillStyle = 'rgba(47,174,99,.22)'; g.fillRect(xt(r.hit - R.IFRAMES), Y0, xt(r.hit) - xt(r.hit - R.IFRAMES), Y1 - Y0);
    }
    if (r.press != null && t >= r.press) { const x = xt(r.press); g.fillStyle = C.player; g.beginPath(); g.moveTo(x, Y0 + 2); g.lineTo(x - 8, Y0 - 8 + 2); g.lineTo(x + 8, Y0 - 8 + 2); g.closePath(); g.fill(); g.fillRect(x - 1.5, Y0, 3, Y1 - Y0); text(g, 'dodge', x - 6, Y1 - 6, '#1d6f96', font(700, 12), 'right'); }
    g.restore();
    text(g, r.tone ? 'tone on' : 'tone muted', b.x + 14, b.y + 60, r.tone ? TONEDK : C.muted, font(700, 13));
    text(g, `wind-up ${done ? r.W.toFixed(1) + ' s' : '?'}`, b.x + 14, b.y + 80, C.muted, font(600, 12));
  }

  /* ---------- the demo ---------- */
  const scenes = {};
  canvasDemo('bt-boss', (s, cv, g) => {
    const st = { tour: true, held: false, tt: 0, t: 0, rounds: [], mode: 1, rnd: rng(2026), key: '', gates: new Map() };
    const tourBtn = $(s, '.bt-tour'), segs = $$(s, '.bt-mode .btn');
    const setMode = m => { st.mode = m; segs.forEach(b => b.classList.toggle('on', +b.dataset.m === m)); };
    const newRound = s0 => { const r = mkRound(s0, lerp(R.WIND[0], R.WIND[1], st.rnd()), st.mode); st.rounds.push(r); schedule(r, st.t); return r; };
    const stopAll = () => { st.gates.forEach(gt => { try { gt.gain.setTargetAtTime(0, AU.ctx.currentTime, .01); } catch (e) {} }); st.gates.clear(); };
    // audio for a round, scheduled from "now" (t) in round time
    function schedule(r, t) {
      if (!live() || st.held) return;
      const c = AU.ctx, at = tt => c.currentTime + Math.max(0, tt - t);
      if (t < r.arrow) { const gate = sndTone(at(r.arrow), r.W); gate.gain.value = r.tone ? 1 : 0; st.gates.set(r, gate); }
      if (t < r.fire) sndShot(at(r.fire));
    }
    const manual = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); stopAll(); st.rounds = []; st.t = 0; newRound(0); };
    segs.forEach(b => b.onclick = () => { manual(); setMode(+b.dataset.m); const r = st.rounds.at(-1); if (r && st.t < r.fire) { r.tone = st.mode; const gt = st.gates.get(r); if (gt) gt.gain.setTargetAtTime(r.tone, AU.ctx.currentTime, .01); } });
    $(s, '.bt-reset').onclick = () => { manual(); stopAll(); st.rounds = []; st.t = 0; newRound(0); };
    tourBtn.onclick = () => { stopAll(); st.tour = true; st.tt = 0; tourBtn.classList.add('on'); };
    const dodge = () => {
      manual();
      const r = st.rounds.at(-1); if (!r || r.press != null || st.t < r.arrow || st.t > r.hit + .3) return;
      r.press = st.t; if (live()) sndDodge(AU.ctx.currentTime);
    };
    $(s, '.bt-dodge').onclick = dodge;
    addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.target.closest?.('input, textarea, select')) return;
      if (e.code === 'Space' || e.code === 'KeyD' || e.key === ' ' || e.key === 'd' || e.key === 'D') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) dodge(); }
    }, true);
    cv.addEventListener('pointerdown', dodge);
    document.addEventListener('click', e => { if (e.target.closest('.bt-snd')) setSound(!AU.on); });

    const view = () => st.tour ? { rounds: TOUR_ROUNDS, t: st.tt } : { rounds: st.rounds, t: st.t };
    function render() {
      const { rounds, t } = view(), r = rounds.filter(x => x.s <= t).at(-1) || rounds[0];
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = CARD; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      drawArena(g, r, t);
      drawScore(g, rounds, t, r ? r.tone : st.mode);
      drawTone(g, r, t, st.mode);
      const i = rounds.indexOf(r);
      if (st.tour) T.label(`Round ${i + 1} of ${rounds.length} · ${r.tone ? 'arrow + tone: dodge as the pitch tops out' : 'arrow alone: guessing at 2 s'}`, ARENA.w / 2, 34, 'center', C.ink, 14);
      else T.label(`Round ${i + 1} · ${r.tone ? 'arrow + tone' : 'arrow alone'} · dodge: Space, D, or click`, ARENA.w / 2, 34, 'center', C.ink, 14);
      return { rounds, t, r };
    }
    function info({ rounds, t }) {
      const sc = score(rounds, t), k = JSON.stringify(sc) + st.tour; if (k === st.key) return; st.key = k;
      const pc = m => { const n = sc[m].d + sc[m].h; return n ? `${sc[m].d}/${n}` : '–'; };
      say($(s, '.bt-stats'), `<div class="y"><b>${pc(1)}</b><span>dodged with arrow + tone</span></div><div><b>${pc(0)}</b><span>dodged with the arrow alone</span></div>`);
      say($(s, '.bt-out'), 'The arrow tells you where the shot will land, never when: each wind-up has a different length. The tone ends exactly when the shot fires, so you can dodge on the sound. Mute it and the timing becomes a guess.');
    }
    scenes.boss = { seek(t) { st.held = true; stopAll(); st.tour = true; st.tt = t; render(); }, dur: () => TOUR_DUR, stop: stopAll };
    newRound(0);
    return dt => {
      if (st.held) return;
      if (st.tour) {
        const p0 = st.tt; st.tt += Math.max(0, dt);
        if (st.tt >= TOUR_DUR) { st.tt = 0; }
        else TOUR_ROUNDS.forEach(r => {
          if (live()) {
            if (r.s > p0 && r.s <= st.tt) schedule(r, st.tt);
            if (r.press > p0 && r.press <= st.tt) sndDodge(AU.ctx.currentTime);
            if (r.hit > p0 && r.hit <= st.tt) (outcome(r).k === 'hit' ? sndHit : sndSafe)(AU.ctx.currentTime);
          }
        });
      } else {
        const p0 = st.t; st.t += Math.max(0, dt);
        const r = st.rounds.at(-1);
        if (live() && r.hit > p0 && r.hit <= st.t) (outcome(r).k === 'hit' ? sndHit : sndSafe)(AU.ctx.currentTime);
        if (st.t >= r.end) newRound(r.end);
      }
      info(render());
    };
  }, {
    // shots already scheduled would still sound after leaving, so the page's output is closed while the slide is hidden
    leave() { scenes.boss?.stop(); if (AU.ctx) AU.master.gain.setTargetAtTime(0, AU.ctx.currentTime, .01); },
    enter() { if (AU.ctx && AU.on) AU.master.gain.setTargetAtTime(.8, AU.ctx.currentTime, .03); },
  });

  window.__seek = (t, which = 'boss') => scenes[which].seek(t);
  window.__dur = (which = 'boss') => scenes[which].dur();
})();
