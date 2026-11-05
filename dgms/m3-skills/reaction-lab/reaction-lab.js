/* Frame window and reaction lab (DGMS Module 3, Leveraging Player Skills, slides 91-110 and 141-143).
   A 60 fps test bench that measures the learner instead of describing them, one slide per test:
     timing    (slides 98-99)  press while a marker crosses a window of 1 / 3 / 6 / 15 / 30 frames, 20 tries per set
     redgreen  (slides 103-104, 109) simple reaction in frames against the 15-frame (250 ms) average and the 18-frame line
     overhead  (slides 104-107) stand-block an overhead with 14 (SF3), 20 (SF6) or about 48 (Dark Souls 2 knight) startup frames
     choice    (slide 108)     1 to 4 possible cues, each with its own key: reaction grows about a frame per option
     angle     (slides 141-143) buffered reaction: watch one of two doors; the opponent learns your habit
   Every test has a sight / sound toggle (WebAudio beeps) so learners can measure the ~40 ms / ~3 frame audio advantage.
   Timing: cue times are the requestAnimationFrame time the cue is drawn (sight) or the time the beep is scheduled to
   reach the speakers via AudioContext.getOutputTimestamp (sound); presses use KeyboardEvent/PointerEvent.timeStamp.
   The screen and the keyboard add their own lag on top, so readings run a frame or two slow.
   Results stay in this browser only (FPF.store, localStorage wrapped in try/catch).
   The walk-through on each slide is a scripted ghost player whose trials are a pure function of time, so __seek(t, which)
   draws the same frame every time.
   Numbers: the deck's are marked "deck"; window picks inside each band, wait times and the ghost's reactions are ours. */
(function () {
  const { $, $$, canvasDemo, say, store } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585;

  const N = {
    fps: 60,                                   // deck: the frame unit throughout
    windows: [                                 // deck slides 98-99 scale; the frame count picked inside each band is ours
      { f: 1, band: '1', name: 'frame perfect' },
      { f: 3, band: '2-3', name: 'tight' },
      { f: 6, band: '4-7', name: 'tricky' },
      { f: 15, band: '10-20', name: 'comfortable' },
      { f: 30, band: '30+', name: 'nearly unmissable' },
    ],
    run: { frames: 80, center: 50, beats: [5, 20, 35], lead: 500, hold: 650, pxPerFrame: 11 },   // timing track, ours
    tries: 20,                                 // proposal: hit rate after 20 tries
    avgF: 15, avgMs: 250, unseeable: 18,       // deck slide 104
    moves: {                                   // deck slides 104 and 107
      // sf3 is Ryu's Towards + Strong from the Game Animation Library move explorer (Baston data): its first active
      // frame is 15, so 14 frames come before the hit, then 12 active and 9 recovery (35 total). f counts frames before the hit.
      sf3: { name: 'SF3: 3rd Strike · Ryu, Towards + Strong overhead', short: 'SF3 overhead', f: 14, data: { startup: 15, active: 12, recovery: 9, total: 35 } },
      sf6: { name: 'Street Fighter 6 overhead', short: 'SF6 overhead', f: 20 },
      ds2: { name: 'Dark Souls 2 knight', short: 'DS2 knight swing', f: 48 },
    },
    perOption: 1,                              // deck slide 108: about a frame more per possible stimulus
    soundF: 3, soundMs: 40,                    // deck slide 109: sound is ~40 ms / ~3 frames faster than sight
    wait: [1000, 2800],                        // random foreperiod before a cue, ms (ours)
    soundLead: 60,                             // ms between scheduling a beep and it reaching the ear (ours)
    keep: 40,                                  // results kept per list in the browser
  };
  const FR = 1000 / N.fps;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const avg = a => a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const f1 = v => v == null ? '–' : v.toFixed(1);
  const ms = f => Math.round(f * FR);

  /* ---------- results, this browser only ---------- */
  const SK = 'dgms-m3-reaction-lab';
  const DB = store.get(SK, {}) || {};
  const save = () => store.set(SK, DB);
  const slot = (path, def) => { let o = DB; const ks = path.split('.'); ks.slice(0, -1).forEach(k => { if (typeof o[k] !== 'object' || !o[k]) o[k] = {}; o = o[k]; }); const k = ks[ks.length - 1]; if (o[k] == null || typeof o[k] !== typeof def || Array.isArray(def) !== Array.isArray(o[k])) o[k] = def; return o[k]; };
  const pushKeep = (a, v) => { a.push(v); while (a.length > N.keep) a.shift(); };

  /* ---------- sound ---------- */
  let AC = null;
  function ac() {
    try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch { AC = null; }
    return AC;
  }
  // plays a beep so it reaches the ear at performance time `at` (ms)
  function beep(at, o = {}) {
    const a = ac(); if (!a) return at;
    try {
      const ts = a.getOutputTimestamp && a.getOutputTimestamp();
      let ct = ts && ts.contextTime > 0 && ts.performanceTime > 0
        ? ts.contextTime + (at - ts.performanceTime) / 1000
        : a.currentTime + (at - performance.now()) / 1000 - (a.outputLatency || a.baseLatency || 0);
      ct = Math.max(a.currentTime + .005, ct);
      const d = o.d || .09, osc = a.createOscillator(), gn = a.createGain();
      osc.type = o.type || 'square'; osc.frequency.value = o.f || 880;
      gn.gain.setValueAtTime(0.0001, ct); gn.gain.exponentialRampToValueAtTime(o.v || .16, ct + .004); gn.gain.exponentialRampToValueAtTime(.0005, ct + d);
      let out = gn;
      if (o.pan != null && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = o.pan; gn.connect(p); out = p; }
      osc.connect(gn); out.connect(a.destination); osc.start(ct); osc.stop(ct + d + .03);
    } catch {}
    return at;
  }

  /* ---------- keys: the showing slide's test gets them ---------- */
  let active = null;
  addEventListener('keydown', e => {
    if (!active || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (!active.keys.includes(e.code)) return;
    e.preventDefault(); e.stopPropagation(); ac();
    active.press(e.timeStamp, e.code);
  }, true);

  /* ---------- trials: one runner for live play, one pure function for the ghost ---------- */
  // o: { wait(), make(), cue(c, now) -> cue time, end(c) -> end time or null, judge(c), after(c), gap }
  function runner(o) {
    const R = { running: false, cur: null, done: [], next: 0, setStart: 0 };
    R.start = now => { R.running = true; R.cur = null; R.next = now + 250; R.setStart = R.done.length; };
    R.stop = () => { R.running = false; R.cur = null; };
    R.tick = now => {
      if (!R.running) return;
      if (!R.cur) { if (now < R.next) return; R.cur = Object.assign({ begin: now, cueAt: now + o.wait(), cue: null, press: null }, o.make()); }
      const c = R.cur;
      if (c.cue == null && c.press == null && now >= c.cueAt) c.cue = o.cue(c, now);
      const end = o.end(c);
      if (end != null && now >= end) { o.judge(c); R.done.push(c); R.cur = null; R.next = now + (o.gap || 0); o.after && o.after(c, R); }
    };
    R.press = (ts, key) => { const c = R.cur; if (!c || c.press != null) return; c.press = ts; c.key = key; o.judge(c); };
    return R;
  }
  // the ghost: script items { wait, rf (frames from cue to press; negative = early; null = no press), key, ...trial fields }
  function ghost(script, o, tMs) {
    let b = 0; const done = [];
    for (let i = 0; i < script.length; i++) {
      const sp = script[i];
      const c = Object.assign({ begin: b, cueAt: b + sp.wait, cue: b + sp.wait, press: null, ghost: true }, sp);
      o.prep && o.prep(c, done);
      const pt = sp.rf == null ? null : c.cue + sp.rf * FR + FR * .5;
      if (pt != null) { c.press = pt; c.key = sp.key; }
      const end = o.end(c);
      if (tMs < end) {
        if (pt != null && tMs < pt) { c.press = null; c.key = null; }
        o.judge(c);
        return { done, cur: c, now: tMs };
      }
      o.judge(c); done.push(c); b = end + (o.gap || 0);
    }
    return { done, cur: null, now: tMs };
  }
  const ghostDur = (script, o) => { let b = 0; script.forEach(sp => { const c = Object.assign({ begin: b, cueAt: b + sp.wait, cue: b + sp.wait, press: null }, sp); o.prep && o.prep(c, []); if (sp.rf != null) c.press = c.cue + sp.rf * FR + FR * .5; b = o.end(c) + (o.gap || 0); }); return b / 1000 + .6; };
  // shared judging: early, none, or a reaction in whole frames
  function judgeRT(c) {
    c.early = c.press != null && (c.cue == null || c.press < c.cue);
    c.none = c.press == null;
    c.rf = !c.early && !c.none ? Math.floor((c.press - c.cue) / FR) : null;
    // under 100 ms is faster than a person can react: count it as anticipation, a false start
    if (c.rf != null && c.rf < 6) { c.early = c.antic = true; c.rf = null; }
  }

  /* ---------- drawing helpers ---------- */
  const HF = (s, w = 800) => `${w} ${s}px Montserrat, Jost, sans-serif`, BF = (s, w = 600) => `${w} ${s}px Jost, sans-serif`;
  function tx(g, s, x, y, f = BF(16), c = C.ink, a = 'left', b = 'middle') { g.font = f; g.fillStyle = c; g.textAlign = a; g.textBaseline = b; g.fillText(s, x, y); }
  function box(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function bg(g) { T.use(g); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); box(g, 0, 0, W, H, 14, 'rgba(255,252,244,.86)'); }
  function keycap(g, x, y, label, lit, col = C.gold, s = 46) {
    box(g, x - s / 2, y - s / 2 + 5, s, s, 9, C.navy);
    box(g, x - s / 2, y - s / 2 + (lit ? 4 : 0), s, s, 9, lit ? col : '#fffaf0', C.navy, 2.5);
    tx(g, label, x, y + (lit ? 4 : 0) + 1, HF(s * .42), lit ? '#fff' : C.ink, 'center');
  }
  function waves(g, x, y, k = 1, col = '#fff') {
    g.save(); g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { g.globalAlpha = clamp(k * 1.4 - i * .3); g.beginPath(); g.arc(x, y, 16 + i * 14, -.7, .7); g.stroke(); }
    g.restore();
    g.fillStyle = col; g.beginPath(); g.moveTo(x - 30, y - 9); g.lineTo(x - 20, y - 9); g.lineTo(x - 6, y - 20); g.lineTo(x - 6, y + 20); g.lineTo(x - 20, y + 9); g.lineTo(x - 30, y + 9); g.closePath(); g.fill();
  }
  // a number line in frames; returns x(frames)
  function frameAxis(g, x0, x1, y, max, step = 6) {
    const X = f => x0 + (x1 - x0) * clamp(f / max);
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    for (let f = 0; f <= max; f += step) {
      g.beginPath(); g.moveTo(X(f), y - 5); g.lineTo(X(f), y + 5); g.stroke();
      tx(g, f + ' f', X(f), y + 17, BF(14, 700), C.ink, 'center');
      tx(g, ms(f) + ' ms', X(f), y + 34, BF(12, 500), C.muted, 'center');
    }
    return X;
  }
  function zones(g, X, yTop, yBot, max) {
    // under 18 frames: the "unseeable" zone, and the 15-frame average
    g.fillStyle = 'rgba(229,50,45,.08)'; g.fillRect(X(0), yTop, X(N.unseeable) - X(0), yBot - yTop);
    g.setLineDash([7, 6]); g.lineWidth = 2.5;
    g.strokeStyle = C.red; g.beginPath(); g.moveTo(X(N.unseeable), yTop); g.lineTo(X(N.unseeable), yBot); g.stroke();
    g.strokeStyle = '#2ea3dc'; g.beginPath(); g.moveTo(X(N.avgF), yTop); g.lineTo(X(N.avgF), yBot); g.stroke();
    g.setLineDash([]);
    tx(g, '18 f: "unseeable" line', X(N.unseeable) + 6, yTop - 10, BF(13, 700), C.redDk, 'left');
    tx(g, 'average 15 f · 250 ms', X(N.avgF) - 6, yTop - 10, BF(13, 700), '#1b6f9a', 'right');
  }
  function dot(g, x, y, r, fill, stroke = C.navy) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
  function diamond(g, x, y, r, fill) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); }
  const SIGHT = '#2ea3dc', SOUND = '#e0a92d';
  const recent = (now, t, d = 160) => t != null && now >= t && now - t < d;

  /* ---------- the slide shell: walk-through, cue mode, clear, keys, stats ---------- */
  const apis = {};
  function lab(name, def) {
    canvasDemo(name, (s, cv, g) => {
      const st = Object.assign({ tour: true, t: 0, held: false, mode: 'sight', sk: '', ok: '' }, def.state || {});
      const o = def.opts(st), R = runner(o), DUR = ghostDur(def.script, o);
      const tourBtn = $(s, '.lab-tour');
      const free = () => { if (st.tour) { st.tour = false; st.held = false; tourBtn.classList.remove('on'); } };
      st.free = free;
      $$(s, '.lab-mode .btn').forEach(b => b.onclick = () => { ac(); free(); R.stop(); st.mode = b.dataset.m; b.blur(); });
      tourBtn.onclick = () => { R.stop(); st.tour = true; st.held = false; st.t = 0; tourBtn.classList.add('on'); tourBtn.blur(); };
      $(s, '.lab-clear').onclick = e => { free(); R.stop(); R.done.length = 0; def.clear(); save(); e.currentTarget.blur(); };
      def.wire && def.wire(s, st, R, free);
      const press = (ts, code) => {
        free();
        if (!R.running) { if (def.canStart ? def.canStart(code) : true) R.start(performance.now()); return; }
        R.press(ts, code);
      };
      s._lab = { keys: def.keys, press, stop: () => R.stop() };
      cv.addEventListener('pointerdown', e => {
        ac(); const p = FPF.ptr(cv, e);
        const code = def.click ? def.click(p, st, R) : def.keys[0];
        if (code) press(e.timeStamp, code);
      });
      function frame() {
        const v = st.tour ? ghost(def.script, o, st.t * 1000) : { done: R.done, cur: R.cur, now: performance.now(), running: R.running, set: R.done.slice(R.setStart) };
        v.tour = st.tour;
        const cfg = st.tour ? def.tourCfg(v, st) : def.liveCfg(st);
        v.cfg = cfg;
        $$(s, '.lab-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === cfg.mode));
        def.marks && def.marks(s, cfg);
        bg(g); def.draw(g, v, st, R);
        const html = def.stats(v, st);
        if (html !== st.sk) { st.sk = html; say($(s, '.lab-stats'), html); }
        const out = def.out(v, st);
        if (out !== st.ok) { st.ok = out; say($(s, '.lab-out'), out); }
      }
      apis[name] = { seek(t) { st.tour = st.held = true; tourBtn.classList.add('on'); R.stop(); st.t = t; frame(); }, dur: () => DUR };
      return dt => {
        if (st.tour) { if (!st.held) st.t += dt; if (st.t > DUR) st.t = 0; }
        else R.tick(performance.now());
        frame();
      };
    }, {
      enter(s) { active = s._lab; },
      leave(s) { if (active === s._lab) active = null; s._lab && s._lab.stop(); },
    });
  }
  const stat = (b, span, cls = '') => `<div class="${cls}"><b>${b}</b><span>${span}</span></div>`;
  function idleBanner(g, v, line1, line2) {
    if (v.tour || v.running) return;
    box(g, 250, 205, 540, 110, 16, 'rgba(21,32,68,.92)', C.gold, 3);
    tx(g, line1, 520, 245, HF(24), '#fff', 'center');
    tx(g, line2, 520, 284, BF(16, 500), '#d6dbef', 'center');
  }
  function ghostTag(g, v, x = 1012, y = 36) { if (v.tour) { box(g, x - 168, y - 15, 168, 30, 15, C.navy); tx(g, '▶ ghost player', x - 84, y + 1, BF(15, 700), C.gold, 'center'); } }

  /* =================== 1. timing windows (slides 98-99) =================== */
  const RUN = N.run;
  const winOf = f => N.windows.find(w => w.f === f) || N.windows[3];
  const winRange = f => { const lo = RUN.center - Math.floor(f / 2); return [lo, lo + f - 1]; };
  const timingOpts = st => ({
    wait: () => RUN.lead,
    make: () => ({ mode: st.mode, win: st.win }),
    cue(c, now) {
      if (c.mode !== 'sound') return now;
      const t0 = now + N.soundLead;
      RUN.beats.forEach((b, i) => beep(t0 + b * FR, { f: 660, d: .07 }));
      return t0;
    },
    end: c => c.press != null ? Math.max(c.press + RUN.hold, c.cue != null ? c.cue + (RUN.center + 4) * FR : 0) : c.cue != null ? c.cue + RUN.frames * FR + RUN.hold : null,
    judge(c) {
      c.none = c.press == null;
      const pf = c.none ? null : Math.floor((c.press - (c.cue ?? c.press + 1e4)) / FR);
      const [lo, hi] = winRange(c.win);
      c.pf = pf; c.off = pf == null ? null : pf - RUN.center;
      c.hit = pf != null && pf >= lo && pf <= hi;
    },
    after(c, R) {
      const set = R.done.slice(R.setStart);
      if (set.length >= N.tries) {
        const h = set.filter(x => x.hit).length, rec = slot(`timing.${c.mode}.w${c.win}`, {});
        rec.last = h; rec.best = Math.max(rec.best || 0, h); rec.sets = (rec.sets || 0) + 1; save();
        R.stop();
      }
    },
  });
  const TIMING_SCRIPT = [[30, [-6, 3, 9]], [6, [1, -4, 2]], [1, [1, 0, -2]]]
    .flatMap(([win, offs]) => offs.map(off => ({ wait: RUN.lead, rf: RUN.center + off, key: 'KeyJ', win, mode: 'sight' })));
  lab('timing', {
    state: { win: 15 },
    keys: ['KeyJ'],
    script: TIMING_SCRIPT,
    opts: timingOpts,
    clear() { DB.timing = {}; },
    wire(s, st, R, free) { $$(s, '.lab-win .btn').forEach(b => b.onclick = () => { free(); R.stop(); st.win = +b.dataset.f; b.blur(); }); },
    liveCfg: st => ({ mode: st.mode, win: st.win }),
    tourCfg: v => ({ mode: 'sight', win: (v.cur || v.done[v.done.length - 1] || TIMING_SCRIPT[0]).win }),
    marks(s, cfg) { $$(s, '.lab-win .btn').forEach(b => b.classList.toggle('on', +b.dataset.f === cfg.win)); },
    draw(g, v) {
      const { win, mode } = v.cfg, now = v.now, c = v.cur;
      tx(g, 'Press when the marker is inside the window', 28, 34, HF(21), C.ink);
      ghostTag(g, v);
      // the deck's scale
      const bw = 192, bx = 28;
      N.windows.forEach((w, i) => {
        const on = w.f === win, x = bx + i * (bw + 6);
        box(g, x, 62, bw, 52, 10, on ? C.navy : '#efe6d2', on ? C.gold : '#cdbf9f', on ? 3 : 2);
        tx(g, w.band + (w.band === '1' ? ' frame' : ' frames'), x + bw / 2, 80, HF(16), on ? C.gold : C.ink, 'center');
        tx(g, w.name, x + bw / 2, 101, BF(15, 600), on ? '#fff' : C.muted, 'center');
      });
      // track
      const x0 = 70, P = RUN.pxPerFrame, ty = 150, th = 64, [lo, hi] = winRange(win);
      box(g, x0 - 8, ty, RUN.frames * P + 16, th, 12, '#efe6d2', C.navy, 2.5);
      g.fillStyle = 'rgba(47,174,99,.85)'; g.fillRect(x0 + lo * P, ty + 3, win * P, th - 6);
      g.strokeStyle = '#145c33'; g.lineWidth = 2; g.strokeRect(x0 + lo * P, ty + 3, win * P, th - 6);
      g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 2;
      RUN.beats.forEach(b => { g.beginPath(); g.moveTo(x0 + b * P + P / 2, ty + 8); g.lineTo(x0 + b * P + P / 2, ty + th - 8); g.stroke(); });
      tx(g, `window: ${win} frame${win > 1 ? 's' : ''} = ${ms(win)} ms`, x0 + (lo + win / 2) * P, ty - 12, BF(15, 700), '#145c33', 'center');
      const cued = c && c.cue != null && now >= c.cue;
      const fx = c ? (cued ? clamp((now - c.cue) / FR, 0, RUN.frames) : 0) : 0;
      const pressed = c && c.press != null && now >= c.press;
      const mx = pressed && c.pf != null ? x0 + clamp(c.pf, 0, RUN.frames) * P + P / 2 : x0 + fx * P;
      const hideMarker = mode === 'sound' && !v.tour && !pressed;
      if (hideMarker) {
        box(g, x0 - 8, ty, RUN.frames * P + 16, th, 12, 'rgba(21,32,68,.94)');
        waves(g, x0 + 40, ty + th / 2, c && cued ? 1 : .4, C.gold);
        tx(g, 'Sound only: three beeps, then press on the fourth beat', x0 + 110, ty + th / 2, BF(18, 700), '#fff');
      } else if (c || v.tour) {
        g.fillStyle = pressed ? (c.hit ? '#145c33' : C.redDk) : C.gold; g.strokeStyle = C.navy; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(mx, ty + th + 2); g.lineTo(mx - 13, ty + th + 22); g.lineTo(mx + 13, ty + th + 22); g.closePath(); g.fill(); g.stroke();
        g.fillRect(mx - 3, ty - 6, 6, th + 10); g.strokeRect(mx - 3, ty - 6, 6, th + 10);
      }
      // zoomed frame cells around the window
      const zy = 262, cw = 22, span = 20, zx = W / 2 - (span + .5) * cw;
      tx(g, 'zoom: one cell = one frame (16.7 ms)', 28, zy - 14, BF(14, 600), C.muted);
      for (let k = -span; k <= span; k++) {
        const f = RUN.center + k, x = zx + (k + span) * cw, inW = f >= lo && f <= hi;
        box(g, x + 1, zy, cw - 2, 30, 4, inW ? 'rgba(47,174,99,.85)' : '#efe6d2', inW ? '#145c33' : '#cdbf9f', 1.5);
      }
      if (pressed && c.pf != null && Math.abs(c.off) <= span) { const x = zx + (c.off + span) * cw; box(g, x - 1, zy - 4, cw + 2, 38, 5, null, C.navy, 3.5); }
      if (pressed) {
        const txt = c.none ? 'No press' : c.pf < 0 ? 'Too early: the run had not started' : c.hit ? (c.off === 0 ? 'HIT · dead centre' : `HIT · ${Math.abs(c.off)} frame${Math.abs(c.off) > 1 ? 's' : ''} ${c.off < 0 ? 'early' : 'late'}`)
          : `MISS · ${Math.abs(c.off)} frames ${c.off < 0 ? 'early' : 'late'}`;
        tx(g, txt, W / 2, zy + 56, HF(22), c.hit ? '#145c33' : C.redDk, 'center');
      }
      // this set: early / late scatter
      const set = v.tour ? v.done.concat(v.cur && v.cur.press != null && now >= v.cur.press ? [v.cur] : []).filter(x => x.win === win) : (v.set || []).concat(c && pressed ? [c] : []);
      const sy = 425, sx0 = 120, sx1 = 920, R2 = 24, XS = o => sx0 + (sx1 - sx0) * (clamp(o, -R2, R2) + R2) / (2 * R2);
      tx(g, v.tour ? 'Ghost tries at this window' : `This set: try ${Math.min(set.length + (c && !pressed ? 1 : 0), N.tries)} of ${N.tries}`, 28, sy - 34, HF(17), C.ink);
      g.fillStyle = 'rgba(47,174,99,.25)'; g.fillRect(XS(lo - RUN.center - .5), sy - 18, XS(hi - RUN.center + .5) - XS(lo - RUN.center - .5), 92);
      g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(sx0, sy + 74); g.lineTo(sx1, sy + 74); g.stroke();
      for (let o2 = -R2; o2 <= R2; o2 += 6) { tx(g, (o2 > 0 ? '+' : '') + o2, XS(o2), sy + 90, BF(13, 600), C.muted, 'center'); }
      tx(g, '◀ early', sx0, sy + 112, BF(14, 700), C.muted, 'left'); tx(g, 'late ▶', sx1, sy + 112, BF(14, 700), C.muted, 'right');
      tx(g, 'frames from the window centre', W / 2, sy + 112, BF(13, 500), C.muted, 'center');
      set.forEach((x, i) => { if (x.off == null) return; dot(g, XS(x.off), sy - 6 + (i % 5) * 16, 7, x.hit ? C.p2 : C.red); });
      const hits = set.filter(x => x.hit).length;
      tx(g, `${hits} / ${set.length} hits`, sx1 + 6, sy + 30, HF(20), C.ink, 'left');
      idleBanner(g, v, 'Press J or click to start', `${N.tries} tries at a ${win}-frame window · ${mode === 'sound' ? 'sound only' : 'watch the marker'}`);
    },
    stats(v) {
      const { win, mode } = v.cfg;
      const set = v.tour ? v.done.filter(x => x.win === win) : v.set || [];
      const h = set.filter(x => x.hit).length, rec = (DB.timing && DB.timing[mode] && DB.timing[mode]['w' + win]) || {};
      return stat(`${win} f`, `${ms(win)} ms window · ${winOf(win).name}`) +
        stat(set.length ? Math.round(100 * h / set.length) + '%' : '–', `${v.tour ? 'ghost' : 'this set'}: ${h} of ${set.length} hit`, h / Math.max(1, set.length) >= .7 ? 'g' : 'r') +
        stat(rec.best != null ? `${rec.best}/${N.tries}` : '–', `your best set here (${mode}), stored in this browser`, 'y');
    },
    out(v) {
      const w = winOf(v.cfg.win);
      return {
        1: 'A 1-frame window is <b>frame perfect</b>: 16.7 ms. Even experts miss it most of the time, so reserve it for optional mastery, never the critical path.',
        3: 'Two or three frames is <b>tight</b>: hittable with practice and rhythm, still missed often. A test for players who chose a hard mode.',
        6: 'Four to seven frames is <b>tricky</b>: most players land it some of the time, which makes each hit feel earned.',
        15: 'Ten to twenty frames is <b>comfortable</b>: anyone can hit it and feel skilled. This is where core actions belong.',
        30: 'Thirty frames or more is <b>nearly unmissable</b>: half a second. It confirms intent more than it tests timing.',
      }[w.f];
    },
  });

  /* =================== 2. red / green (slides 103-104, 109) =================== */
  const rtOpts = (st, list) => ({
    wait: () => rnd(N.wait[0], N.wait[1]),
    make: () => ({ mode: st.mode }),
    cue(c, now) { return c.mode === 'sound' ? beep(now + N.soundLead, { f: 1000, d: .12, v: .2 }) : now; },
    end: c => c.press != null ? c.press + 900 : c.cue != null ? c.cue + 1500 : null,
    judge: judgeRT,
    after(c) { if (c.rf != null) { pushKeep(slot(`rg.${c.mode}`, []), c.rf); save(); } },
  });
  const RG_SCRIPT = [[17, 900], [15, 1150], [16, 1000], [14, 1250]].map(([rf, wait]) => ({ wait, rf, key: 'KeyJ', mode: 'sight' }))
    .concat([[13, 1050], [12, 900], [13, 1200], [11, 1000]].map(([rf, wait]) => ({ wait, rf, key: 'KeyJ', mode: 'sound' })));
  const rgLists = v => v.tour
    ? { sight: v.done.filter(x => x.mode === 'sight' && x.rf != null).map(x => x.rf), sound: v.done.filter(x => x.mode === 'sound' && x.rf != null).map(x => x.rf) }
    : { sight: (DB.rg && DB.rg.sight) || [], sound: (DB.rg && DB.rg.sound) || [] };
  lab('redgreen', {
    keys: ['KeyJ'],
    script: RG_SCRIPT,
    opts: rtOpts,
    clear() { DB.rg = {}; },
    liveCfg: st => ({ mode: st.mode }),
    tourCfg: v => ({ mode: (v.cur || v.done[v.done.length - 1] || RG_SCRIPT[0]).mode }),
    draw(g, v) {
      const c = v.cur, now = v.now, mode = v.cfg.mode;
      const cued = c && c.cue != null && now >= c.cue, pressed = c && c.press != null && now >= c.press;
      const px = 28, py = 22, pw = 984, ph = 290;
      let fill = C.navy, big = '', small = '';
      if (!c) { fill = C.navy; big = v.running ? 'Get ready…' : ''; }
      else if (pressed && c.early) { fill = '#c76a12'; big = 'Too early'; small = c.antic ? 'under 100 ms: that was anticipation, not reaction' : 'false start: wait for the cue'; }
      else if (pressed) { fill = mode === 'sound' ? '#9a6a06' : '#1d8a4c'; big = `${c.rf} frames`; small = `${Math.round(c.press - c.cue)} ms · ${c.rf < N.unseeable ? 'faster than the 18-frame line' : 'slower than the 18-frame line'}`; }
      else if (c.none && c.cue != null && now > c.cue + 1500) { fill = C.navy; big = 'No press'; }
      else if (mode === 'sound') { fill = '#2a3160'; big = 'Listen…'; small = 'press J at the beep'; }
      else if (cued) { fill = C.p2; big = 'PRESS!'; }
      else { fill = C.red; big = 'Wait for green…'; }
      box(g, px, py, pw, ph, 18, fill, C.navy, 3);
      if (big) tx(g, big, W / 2, py + ph / 2 - 14, HF(64), '#fff', 'center');
      if (small) tx(g, small, W / 2, py + ph / 2 + 44, BF(22, 600), 'rgba(255,255,255,.9)', 'center');
      if (mode === 'sound' && c && !pressed) waves(g, px + 90, py + ph / 2, cued && (v.tour || false) ? clamp((now - c.cue) / 200) : .35, cued && v.tour ? C.gold : 'rgba(255,255,255,.5)');
      if (mode === 'sound' && cued && v.tour && !pressed) tx(g, 'beep!', px + 160, py + ph / 2, HF(26), C.gold, 'left');
      keycap(g, px + pw - 50, py + ph - 44, 'J', c && recent(now, c.press, 180));
      ghostTag(g, v, px + pw - 14, py + 30);
      idleBanner(g, v, 'Press J or click to start', 'each round waits 1-3 s, then the cue comes');
      // the number line
      const L = rgLists(v), max = 36;
      const X = frameAxis(g, 120, 990, 520, max, 6);
      zones(g, X, 340, 512, max);
      const rows = [['sight', SIGHT, 400], ['sound', SOUND, 460]];
      rows.forEach(([k, col, y]) => {
        tx(g, k, 28, y, HF(17), C.ink);
        L[k].forEach((f, i) => dot(g, X(f) + ((i * 37) % 9 - 4), y + ((i * 13) % 3 - 1) * 7, 6.5, col));
        const m = avg(L[k]);
        if (m != null) { diamond(g, X(m), y - 26, 9, col); T.label(`mean ${f1(m)} f`, X(m) + 16, y - 26, 'left', C.ink, 14); }
      });
    },
    stats(v) {
      const L = rgLists(v), c = v.cur || v.done[v.done.length - 1];
      const ms1 = avg(L.sight), ms2 = avg(L.sound);
      const last = c && c.rf != null && (v.tour ? c.press <= v.now : true) ? `${c.rf} f` : '–';
      return stat(last, c && c.rf != null ? `last: ${Math.round(c.press - c.cue)} ms (${c.mode})` : 'last reaction') +
        stat(f1(ms1), `sight mean, frames (${L.sight.length} tries) · deck average 15`, 'g') +
        stat(f1(ms2), `sound mean, frames (${L.sound.length} tries)`, 'y') +
        stat(ms1 != null && ms2 != null ? f1(ms1 - ms2) : '–', `frames sound saves you · deck: about ${N.soundF} (${N.soundMs} ms)`, 'r');
    },
    out(v) {
      const L = rgLists(v), a = avg(L.sight), b = avg(L.sound);
      if (L.sight.length >= 3 && L.sound.length >= 3) return `Sound beats sight by <b>${f1(a - b)} frames</b> (${Math.round((a - b) * FR)} ms) for ${v.tour ? 'the ghost' : 'you'}. The deck's figure is about 3 frames: one reason sound cues matter for reactive moves.`;
      if (L.sight.length >= 3) return `Your sight mean is <b>${f1(a)} frames</b>. Most people sit near 15 (250 ms); a cue faster than 18 frames is generally treated as unseeable. Now try sound.`;
      return 'Most people react to a visual cue in about 250 ms, or 15 frames. Anything that gives less than 18 frames of warning is generally considered "unseeable".';
    },
  });

  /* =================== 3. block the overhead (slides 104-107) =================== */
  const ohOpts = st => ({
    wait: () => rnd(N.wait[0], N.wait[1]),
    make: () => ({ mode: st.mode, move: st.move, S: N.moves[st.move].f }),
    cue(c, now) { return c.mode === 'sound' ? beep(now + N.soundLead, { f: 180, type: 'sawtooth', d: .16, v: .22 }) : now; },
    end(c) {
      if (c.press != null && (c.cue == null || c.press < c.cue)) return c.press + 1100;
      if (c.cue == null) return null;
      return Math.max(c.press ?? 0, c.cue + c.S * FR) + 950;
    },
    judge(c) { judgeRT(c); c.res = c.early ? 'early' : c.rf != null && c.rf < c.S ? 'block' : 'hit'; },
    after(c) { const r = slot(`oh.${c.mode}.${c.move}`, [0, 0]); r[1]++; if (c.res === 'block') r[0]++; if (c.rf != null) pushKeep(slot(`ohrf.${c.mode}`, []), c.rf); save(); },
  });
  const OH_SCRIPT = [['sf3', 16, 1100], ['sf3', 15, 950], ['sf3', -22, 1200], ['sf6', 17, 1000], ['sf6', 16, 900], ['ds2', 18, 1000]]
    .map(([move, rf, wait]) => ({ move, S: N.moves[move].f, rf, wait, key: 'KeyJ', mode: 'sight' }));
  // Street Fighter III: 3rd Strike sprites (© Capcom) from the Game Animation Library move explorer, which takes them
  // from Baston by ensabahnur; see sf3/CREDITS.txt. One cell per game frame; ax, ay is the frame-1 pushbox foot centre.
  const SPR = {
    oh:     { src: 'ryu.normal.028.webp', w: 142, h: 121, cols: 28, n: 35, ax: 61, ay: 113 },   // Ryu, Towards + Strong
    low:    { src: 'ryu.normal.020.webp', w: 184, h: 88, cols: 22, n: 28, ax: 59, ay: 79 },    // Ryu, Crouching Forward
    stand:  { src: 'ken.normal.001.webp', w: 108, h: 117, cols: 11, n: 11, ax: 44, ay: 109 },  // Ken, frame 1 of Jab
    crouch: { src: 'ken.normal.007.webp', w: 123, h: 81, cols: 12, n: 12, ax: 44, ay: 72 },    // Ken, frame 1 of Crouching Jab
  };
  Object.values(SPR).forEach(sp => { sp.img = new Image(); sp.img.src = 'sf3/' + sp.src; });
  const sprReady = () => Object.values(SPR).every(sp => sp.img.complete && sp.img.naturalWidth);
  function sprite(g, sp, i, x, fy, dir, sc = 1.5) {
    i = clamp(Math.floor(i), 0, sp.n - 1);
    g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(x), fy); g.scale(dir * sc, sc);
    g.drawImage(sp.img, (i % sp.cols) * sp.w, Math.floor(i / sp.cols) * sp.h, sp.w, sp.h, -sp.ax, -sp.ay, sp.w, sp.h);
    g.restore();
  }
  function fighter(g, x, fy, dir, col, o) {
    // o: { crouch 0..1, arm angle (rad, 0 = forward), kick 0..1, sword }
    const hgt = lerp(150, 92, o.crouch || 0), hipY = fy - lerp(70, 40, o.crouch || 0), shY = fy - hgt + 34;
    g.save(); g.translate(x, 0); g.scale(dir, 1);
    g.lineCap = 'round'; g.strokeStyle = C.navy;
    // legs
    g.lineWidth = 15;
    const kick = o.kick || 0;
    g.beginPath(); g.moveTo(-8, hipY); g.lineTo(-22, fy - (o.crouch ? 18 : 0)); g.lineTo(-24, fy); g.stroke();
    g.beginPath(); g.moveTo(8, hipY); g.lineTo(lerp(20, 70, kick), lerp(fy - (o.crouch ? 18 : 0), fy - 12, kick)); g.lineTo(lerp(24, 92, kick), lerp(fy, fy - 8, kick)); g.stroke();
    g.strokeStyle = col; g.lineWidth = 9;
    g.beginPath(); g.moveTo(-8, hipY); g.lineTo(-22, fy - (o.crouch ? 18 : 0)); g.lineTo(-24, fy); g.stroke();
    g.beginPath(); g.moveTo(8, hipY); g.lineTo(lerp(20, 70, kick), lerp(fy - (o.crouch ? 18 : 0), fy - 12, kick)); g.lineTo(lerp(24, 92, kick), lerp(fy, fy - 8, kick)); g.stroke();
    // torso and head
    box(g, -22, shY - 6, 44, hipY - shY + 12, 14, col, C.navy, 3);
    g.beginPath(); g.arc(0, shY - 26, 19, 0, Math.PI * 2); g.fillStyle = '#f2d2b0'; g.fill(); g.stroke();
    g.fillStyle = C.navy; g.fillRect(6, shY - 30, 8, 5);
    // arm
    const a = o.arm ?? .6, len = 52, ex = 12 + Math.cos(a) * len, ey = shY + 4 + Math.sin(a) * len;
    g.strokeStyle = C.navy; g.lineWidth = 14; g.beginPath(); g.moveTo(10, shY + 4); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = col; g.lineWidth = 8; g.beginPath(); g.moveTo(10, shY + 4); g.lineTo(ex, ey); g.stroke();
    if (o.sword) { g.strokeStyle = '#c9cfe0'; g.lineWidth = 8; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + Math.cos(a) * 95, ey + Math.sin(a) * 95); g.stroke(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); }
    else { g.beginPath(); g.arc(ex, ey, 10, 0, Math.PI * 2); g.fillStyle = '#f2d2b0'; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2.5; g.stroke(); }
    if (o.guard) { g.strokeStyle = C.navy; g.lineWidth = 12; g.beginPath(); g.moveTo(10, shY + 10); g.lineTo(34, shY - (o.crouch ? -6 : 10)); g.stroke(); g.strokeStyle = col; g.lineWidth = 7; g.stroke(); }
    g.restore();
  }
  lab('overhead', {
    state: { move: 'sf3' },
    keys: ['KeyJ'],
    script: OH_SCRIPT,
    opts: ohOpts,
    clear() { DB.oh = {}; DB.ohrf = {}; },
    wire(s, st, R, free) { $$(s, '.lab-move .btn').forEach(b => b.onclick = () => { free(); R.stop(); st.move = b.dataset.k; b.blur(); }); },
    liveCfg: st => ({ mode: st.mode, move: st.move }),
    tourCfg: v => ({ mode: 'sight', move: (v.cur || v.done[v.done.length - 1] || OH_SCRIPT[0]).move }),
    marks(s, cfg) { $$(s, '.lab-move .btn').forEach(b => b.classList.toggle('on', b.dataset.k === cfg.move)); },
    draw(g, v) {
      const c = v.cur, now = v.now, mv = N.moves[v.cfg.move], S = mv.f, mode = v.cfg.mode;
      const cued = c && c.cue != null && now >= c.cue, pressed = c && c.press != null && now >= c.press;
      const imp = c && c.cue != null ? c.cue + S * FR : Infinity, landed = now >= imp;
      // arena
      box(g, 28, 22, 984, 318, 16, '#2a3160', C.navy, 3);
      g.fillStyle = '#3d4270'; g.fillRect(31, 270, 978, 67);
      g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 12; i++) g.fillRect(31 + i * 84, 270, 42, 67);
      const D = mv.data, real = !!D && sprReady();
      tx(g, D ? `${mv.name} · first active frame ${D.startup}` : mv.name + ` · ${S} startup frames (${ms(S)} ms)`, 48, 48, HF(19), '#fff');
      ghostTag(g, v, 996, 48);
      const fy = 300, px = real ? 432 : 440, ox = real ? 578 : 548;
      // player: crouch-blocks until the press
      const stood = pressed;
      const shake = c && (c.res === 'hit' && !c.early && now >= imp && now < imp + 160 || c.early && pressed && now > c.press + 240 && now < c.press + 400) ? (Math.floor(now / 33) % 2 ? 3 : -3) : 0;
      if (real) sprite(g, stood ? SPR.stand : SPR.crouch, 0, px + shake, fy, 1);
      else fighter(g, px, fy, 1, SIGHT, { crouch: stood ? 0 : 1, arm: stood ? -1.25 : -.75 });
      // opponent wind-up
      let p = 0;
      if (cued) p = clamp((now - c.cue) / (S * FR));
      if (mode === 'sound' && !v.tour && !landed) p = 0;
      const early = c && c.early && pressed;
      const kick = early ? clamp((now - c.press - 120) / 120) : 0;
      let arm = .6;
      if (!early) {
        if (p < .85) arm = lerp(.6, -2.1, p / .85);
        else if (p < 1) arm = -2.1;
        if (landed) arm = lerp(-2.1, mv.f > 30 ? -.25 : .05, clamp((now - imp) / 70));
      }
      // real frames: game frame k (1-based) is on screen from cue + (k - 1) frames, so the first active frame lands at the hit
      const fr = cued ? Math.floor((now - c.cue) / FR + 1e-6) : 0, hide = mode === 'sound' && !v.tour && !landed;
      if (real) {
        const lowAt = early ? c.press + 120 : Infinity;
        if (now >= lowAt) sprite(g, SPR.low, (now - lowAt) / FR, ox, fy, -1);
        else sprite(g, SPR.oh, hide || early ? 0 : fr, ox, fy, -1);
      } else fighter(g, ox, fy, -1, C.red, { crouch: 0, arm, sword: v.cfg.move === 'ds2', kick });
      if (real && cued && !early && !hide && fr < D.total) {
        const k = fr + 1, ph = k < D.startup ? 'startup' : k < D.startup + D.active ? 'active' : 'recovery';
        tx(g, `frame ${k} / ${D.total} · ${ph}`, ox + 62, 120, BF(16, 700), ph === 'active' ? '#ff8a80' : C.gold, 'left');
      } else if (!real && cued && !landed && !early && (mode !== 'sound' || v.tour)) tx(g, `startup frame ${Math.min(S, Math.floor((now - c.cue) / FR) + 1)} / ${S}`, ox + 30, 120, BF(16, 700), C.gold, 'left');
      if (real) tx(g, 'Street Fighter III: 3rd Strike sprites © Capcom · frames and frame data: Baston (ensabahnur) via Game Animation Library', 44, 326, BF(12, 600), 'rgba(255,255,255,.72)', 'left');
      if (mode === 'sound' && c && !pressed && !landed) waves(g, 110, 160, cued && v.tour ? 1 : .35, cued && v.tour ? C.gold : 'rgba(255,255,255,.45)');
      // outcome
      if (early && now > c.press + 240) { tx(g, 'Stood too early: the low hits', W / 2, 92, HF(28), '#ffb06b', 'center'); }
      else if (c && landed && !c.early) {
        const k = clamp((now - imp) / 400);
        if (c.res === 'block') { g.strokeStyle = C.shield; g.lineWidth = 6; g.globalAlpha = 1 - k * .6; g.beginPath(); g.arc(px + 40, fy - 135, 26 + k * 20, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; tx(g, 'BLOCKED', W / 2, 92, HF(34), C.shield, 'center'); }
        else { g.fillStyle = `rgba(229,50,45,${.8 - k * .5})`; const hy = real && !stood ? fy - 100 : fy - 130; g.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 14 : 38, a = i * Math.PI / 8; g.lineTo(px + 20 + Math.cos(a) * r, hy + Math.sin(a) * r); } g.closePath(); g.fill(); tx(g, c.press != null ? 'HIT · too late' : 'HIT', W / 2, 92, HF(34), '#ff8a80', 'center'); }
      }
      keycap(g, 960, 300, 'J', c && recent(now, c.press, 180), SIGHT);
      // frame strip
      // cell i is game frame i + 1; with real data the strip is the whole move: startup, active, recovery
      const n = D ? D.total : Math.max(S + 2, 24), sx = 40, sw = 960, cw = sw / n, sy = 390;
      const A0 = D ? D.startup - 1 : S, A1 = D ? A0 + D.active : S + 1;
      tx(g, D ? `frames 1-${A0} startup · ${A0 + 1}-${A1} active · ${A1 + 1}-${n} recovery: block before frame ${A0 + 1}` : 'startup frames: block before the hit lands', 28, D ? 356 : 364, HF(16), C.ink);
      for (let i = 0; i < n; i++) {
        const col = i < A0 ? '#fde9b8' : i < A1 ? (D && i > A0 ? '#ef8f88' : C.red) : D ? '#cfd8ea' : '#e8dfcd';
        box(g, sx + i * cw + 1, sy, cw - 2, 34, 4, col, i < A0 ? '#e0a92d' : i < A1 && D ? '#b8322c' : D ? '#93a3c4' : '#cdbf9f', 1.5);
      }
      tx(g, 'hit', sx + S * cw + cw / 2, sy + 17, BF(12, 800), '#fff', 'center');
      if (D) {
        tx(g, `active · ${D.active} f`, sx + (A0 + 1 + (A1 - A0 - 1) / 2) * cw, sy + 17, BF(13, 800), '#fff', 'center');
        tx(g, `recovery · ${D.recovery} f`, sx + (A1 + D.recovery / 2) * cw, sy + 17, BF(13, 800), '#33416e', 'center');
      }
      const XL = f => sx + f * cw;
      g.setLineDash([6, 5]); g.lineWidth = 2.5;
      g.strokeStyle = C.red; g.beginPath(); g.moveTo(XL(N.unseeable), sy - 8); g.lineTo(XL(N.unseeable), sy + 46); g.stroke();
      g.strokeStyle = '#2ea3dc'; g.beginPath(); g.moveTo(XL(N.avgF), sy - 8); g.lineTo(XL(N.avgF), sy + 46); g.stroke(); g.setLineDash([]);
      tx(g, '18 f line', XL(N.unseeable) + 4, sy + 58, BF(13, 700), C.redDk, 'left');
      tx(g, 'avg 15 f', XL(N.avgF) - 4, sy + 58, BF(13, 700), '#1b6f9a', 'right');
      if (cued && !hide && !(mode === 'sound' && !v.tour) && (D ? !early && fr < n : !landed)) { const f = (now - c.cue) / FR; g.fillStyle = C.navy; g.fillRect(XL(f) - 2, sy - 6, 4, 46); }
      if (pressed && c.rf != null) { const x = XL(Math.min(c.rf, n - 1)); box(g, x - 1, sy - 5, cw + 2, 44, 5, null, C.navy, 3.5); tx(g, `you: ${c.rf} f`, x + cw / 2, sy - 16, BF(15, 800), C.navy, 'center'); }
      // history
      const hist = (v.tour ? v.done : v.done.slice(-12)).filter(x => x.move === v.cfg.move || v.tour).slice(-12);
      tx(g, v.tour ? 'ghost attempts' : 'your attempts', 28, 498, HF(15), C.ink);
      hist.forEach((x, i) => {
        const bx = 160 + i * 70, ok = x.res === 'block';
        box(g, bx, 480, 62, 36, 8, ok ? '#d8f0df' : '#f9d9d6', ok ? '#5fb47c' : '#e07b72', 2);
        tx(g, x.early ? 'early' : x.rf == null ? '–' : `${x.rf} f`, bx + 31, 492, BF(14, 700), C.ink, 'center');
        tx(g, `${ok ? 'block' : 'hit'} · ${N.moves[x.move].f}`, bx + 31, 508, BF(11, 600), C.muted, 'center');
      });
      tx(g, 'Dark Souls 2\'s knight winds up for about 48 frames: reactable by almost anyone.', 28, 548, BF(15, 500), C.muted);
      idleBanner(g, v, 'Press J or click to start', `random waits, then a ${S}-frame overhead`);
    },
    stats(v) {
      const { mode, move } = v.cfg, S = N.moves[move].f;
      const list = v.tour ? v.done.filter(x => x.move === move) : v.done.filter(x => x.move === move && x.mode === mode);
      const b = list.filter(x => x.res === 'block').length;
      const stored = (DB.oh && DB.oh[mode] && DB.oh[mode][move]) || [0, 0];
      const rfs = v.tour ? v.done.filter(x => x.rf != null).map(x => x.rf) : ((DB.ohrf && DB.ohrf[mode]) || []);
      return stat(`${S} f`, `${ms(S)} ms of startup · ${S < N.unseeable ? 'under' : 'over'} the 18-frame line`, S < N.unseeable ? 'r' : 'g') +
        stat(list.length ? `${b}/${list.length}` : '–', v.tour ? 'ghost blocks on this move' : 'blocks this session', 'g') +
        stat(v.tour ? '–' : stored[1] ? Math.round(100 * stored[0] / stored[1]) + '%' : '–', `stored block rate here (${mode}, ${stored[1]} tries)`, 'y') +
        stat(f1(avg(rfs)), 'mean reaction, frames');
    },
    out(v) {
      const S = N.moves[v.cfg.move].f;
      if (S < N.unseeable) return 'A <b>14-frame</b> overhead lands before most players can react, so blocking it is a guess: unreactable means Rock Paper Scissors. Fine for a mix-up, wrong for a core move.';
      if (S < 30) return 'A <b>20-frame</b> overhead sits just past the 18-frame line: a focused player can block it on reaction, so it tests attention instead of guessing.';
      return 'At about <b>48 frames</b> nearly anyone can react. The test stops being "did you see it" and becomes "did you choose the right answer".';
    },
  });

  /* =================== 4. choice reaction (slide 108) =================== */
  const PANELS = [
    { code: 'KeyA', l: 'A', col: C.red, f: 262 }, { code: 'KeyS', l: 'S', col: '#2ea3dc', f: 330 },
    { code: 'KeyJ', l: 'J', col: '#2fae63', f: 392 }, { code: 'KeyK', l: 'K', col: '#e0a92d', f: 523 },
  ];
  const ACTIVE = { 1: [2], 2: [2, 3], 3: [1, 2, 3], 4: [0, 1, 2, 3] };
  const PX = i => 42 + i * 245, PY = 62, PW = 220, PH = 190;
  const tone = (at, i) => beep(at, { f: PANELS[i].f, type: 'triangle', d: .16, v: .32 });
  const chOpts = st => ({
    wait: () => rnd(900, 2400),
    make: () => { const a = ACTIVE[st.n]; return { mode: st.mode, n: st.n, target: a[Math.floor(Math.random() * a.length)] }; },
    cue(c, now) { return c.mode === 'sound' ? tone(now + N.soundLead, c.target) : now; },
    end: c => c.press != null ? c.press + 900 : c.cue != null ? c.cue + 1600 : null,
    judge(c) { judgeRT(c); c.wrong = c.rf != null && c.key !== PANELS[c.target].code; if (c.wrong) c.ok = false; else c.ok = c.rf != null; },
    after(c) { if (c.ok) pushKeep(slot(`ch.${c.mode}.n${c.n}`, []), c.rf); else if (c.wrong) { const e = slot(`cherr.${c.mode}`, {}); e['n' + c.n] = (e['n' + c.n] || 0) + 1; } save(); },
  });
  const CH_SCRIPT = [[1, 2, 15], [1, 2, 14], [2, 3, 16], [2, 2, 17], [3, 1, 17], [3, 3, 18], [4, 0, 19], [4, 2, 18]]
    .map(([n, target, rf], i) => ({ n, target, rf, key: PANELS[target].code, wait: 850 + (i % 3) * 150, mode: 'sight' }));
  const chData = (v, mode) => {
    const d = {};
    [1, 2, 3, 4].forEach(n => { d[n] = v.tour ? v.done.filter(x => x.n === n && x.ok).map(x => x.rf) : ((DB.ch && DB.ch[mode] && DB.ch[mode]['n' + n]) || []); });
    return d;
  };
  function slope(d) {
    const pts = [1, 2, 3, 4].filter(n => d[n].length).map(n => [n, avg(d[n])]);
    if (pts.length < 2) return null;
    const mx = avg(pts.map(p => p[0])), my = avg(pts.map(p => p[1]));
    const num = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0), den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
    return num / den;
  }
  lab('choice', {
    state: { n: 1 },
    keys: PANELS.map(p => p.code),
    script: CH_SCRIPT,
    opts: chOpts,
    clear() { DB.ch = {}; DB.cherr = {}; },
    canStart: code => true,
    click(p, st, R) {
      const i = PANELS.findIndex((_, k) => p.x >= PX(k) && p.x <= PX(k) + PW && p.y >= PY && p.y <= PY + PH);
      if (i < 0) return R.running ? null : 'KeyJ';
      if (!R.running) { st.free(); tone(performance.now() + 40, i); return null; }
      return PANELS[i].code;
    },
    wire(s, st, R, free) { $$(s, '.lab-n .btn').forEach(b => b.onclick = () => { free(); R.stop(); st.n = +b.dataset.n; b.blur(); }); },
    liveCfg: st => ({ mode: st.mode, n: st.n }),
    tourCfg: v => ({ mode: 'sight', n: (v.cur || v.done[v.done.length - 1] || CH_SCRIPT[0]).n }),
    marks(s, cfg) { $$(s, '.lab-n .btn').forEach(b => b.classList.toggle('on', +b.dataset.n === cfg.n)); },
    draw(g, v) {
      const c = v.cur, now = v.now, { n, mode } = v.cfg;
      const cued = c && c.cue != null && now >= c.cue, pressed = c && c.press != null && now >= c.press;
      tx(g, `${n} possible cue${n > 1 ? 's' : ''}: press the key of the one that lights`, 28, 34, HF(20), C.ink);
      ghostTag(g, v);
      PANELS.forEach((P, i) => {
        const on = ACTIVE[n].includes(i), x = PX(i);
        const lit = c && i === c.target && ((cued && (mode !== 'sound' || v.tour)) || pressed) && !c.early;
        if (!on) { g.setLineDash([8, 7]); box(g, x, PY, PW, PH, 16, 'rgba(232,223,205,.5)', '#cdbf9f', 2); g.setLineDash([]); tx(g, 'off', x + PW / 2, PY + PH / 2, BF(18, 600), '#b3a789', 'center'); return; }
        box(g, x, PY, PW, PH, 16, lit ? P.col : '#f4ecdb', P.col, lit ? 4 : 3);
        tx(g, P.l, x + PW / 2, PY + PH / 2 - 10, HF(70), lit ? '#fff' : P.col, 'center');
        tx(g, lit && !pressed ? 'NOW' : mode === 'sound' ? `${P.f} Hz` : '', x + PW / 2, PY + PH - 26, HF(18), lit ? '#fff' : C.muted, 'center');
        if (mode === 'sound' && v.tour && cued && !pressed && i === c.target) waves(g, x + PW - 40, PY + 40, 1, '#fff');
        if (pressed && c.key === P.code) box(g, x - 6, PY - 6, PW + 12, PH + 12, 20, null, C.navy, 4);
      });
      if (pressed) {
        const txt = c.early ? 'Too early: false start' : c.wrong ? `Wrong key: ${PANELS.find(p => p.code === c.key).l} for ${PANELS[c.target].l}` : `${c.rf} frames · ${Math.round(c.press - c.cue)} ms`;
        tx(g, txt, W / 2, 284, HF(24), c.ok ? C.ink : C.redDk, 'center');
      } else if (c && c.none && c.cue != null && now > c.cue + 1500) tx(g, 'No press', W / 2, 284, HF(24), C.redDk, 'center');
      // chart: mean reaction vs options
      const d = chData(v, mode), dOther = v.tour ? null : chData(v, mode === 'sight' ? 'sound' : 'sight');
      const cx0 = 110, cx1 = 1000, cy0 = 340, cy1 = 545, maxF = 30, Y = f => cy1 - (cy1 - cy0) * clamp(f / maxF);
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 1;
      for (let f = 0; f <= maxF; f += 6) { g.beginPath(); g.moveTo(cx0, Y(f)); g.lineTo(cx1, Y(f)); g.stroke(); tx(g, f + ' f', cx0 - 10, Y(f), BF(13, 600), C.muted, 'right'); }
      tx(g, 'mean reaction', 28, cy0 - 26, HF(15), C.ink);
      g.fillStyle = 'rgba(229,50,45,.07)'; g.fillRect(cx0, Y(N.unseeable), cx1 - cx0, cy1 - Y(N.unseeable));
      const base = d[1].length ? avg(d[1]) : N.avgF;
      const GX = k => cx0 + (cx1 - cx0) * (k - .5) / 4;
      [1, 2, 3, 4].forEach(k => {
        const x = GX(k), m = avg(d[k]), here = k === n;
        if (m != null) { box(g, x - 46, Y(m), 92, cy1 - Y(m), 6, mode === 'sound' ? SOUND : SIGHT, here ? C.navy : null, 3); tx(g, f1(m) + ' f', x, Y(m) - 12, BF(15, 800), C.ink, 'center'); }
        if (dOther && dOther[k].length) { const m2 = avg(dOther[k]); g.strokeStyle = mode === 'sound' ? SIGHT : SOUND; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 46, Y(m2)); g.lineTo(x + 46, Y(m2)); g.stroke(); }
        tx(g, `${k} option${k > 1 ? 's' : ''}`, x, cy1 + 16, BF(15, here ? 800 : 600), here ? C.ink : C.muted, 'center');
      });
      g.setLineDash([8, 6]); g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath();
      [1, 2, 3, 4].forEach(k => { const y = Y(base + (k - 1) * N.perOption); k === 1 ? g.moveTo(GX(k), y) : g.lineTo(GX(k), y); }); g.stroke(); g.setLineDash([]);
      g.setLineDash([8, 6]); g.beginPath(); g.moveTo(210, cy0 - 26); g.lineTo(250, cy0 - 26); g.stroke(); g.setLineDash([]);
      tx(g, 'deck: about +1 frame per option, from the 1-option mean', 258, cy0 - 26, BF(13, 700), C.navy, 'left');
      tx(g, 'red tint: under 18 f', cx1, cy0 - 26, BF(13, 600), C.redDk, 'right');
      idleBanner(g, v, 'Press A, S, J or K to start', `${n} possible cue${n > 1 ? 's' : ''} · ${mode === 'sound' ? 'listen for the pitch' : 'watch the panels'}`);
    },
    stats(v) {
      const { n, mode } = v.cfg, d = chData(v, mode), sl = slope(d);
      const errs = v.tour ? v.done.filter(x => x.n === n && x.wrong).length : ((DB.cherr && DB.cherr[mode] && DB.cherr[mode]['n' + n]) || 0);
      return stat(f1(avg(d[n])), `mean frames with ${n} option${n > 1 ? 's' : ''} (${d[n].length} correct, ${mode})`) +
        stat(sl == null ? '–' : (sl >= 0 ? '+' : '') + sl.toFixed(1), 'frames per extra option · deck: about +1', 'y') +
        stat(String(errs), 'wrong-key presses at this count', 'r');
    },
    out(v) {
      const d = chData(v, v.cfg.mode), sl = slope(d);
      if (sl != null) return `Each extra possible cue costs ${v.tour ? 'the ghost' : 'you'} about <b>${sl.toFixed(1)} frames</b>. A move that is reactable on its own can drop under the 18-frame line once it is one of four options.`;
      return 'Reacting gets slower with every possible stimulus: about a frame more per option. Measure 1 option, then raise it.';
    },
  });

  /* =================== 5. holding an angle (slides 141-143) =================== */
  const DOORS = [{ x: 190, w: 180 }, { x: 670, w: 180 }], DY = 96, DH = 230;
  const doorC = i => DOORS[i].x + DOORS[i].w / 2;
  // the opponent peeks the door you watch less the more you favour it (ours)
  const peekOdds = (hist, watch) => { const h = hist.slice(-8); if (!h.length) return .5; const share = h.filter(w => w === watch).length / h.length; return clamp(.5 - .8 * (share - .5), .1, .9); };
  let angleHist = [];
  const anOpts = st => ({
    wait: () => rnd(1000, 2500),
    make: () => ({ mode: st.mode }),
    cue(c, now) {
      c.watch = st.watch; c.odds = peekOdds(angleHist, c.watch);
      c.door = Math.random() < c.odds ? c.watch : 1 - c.watch;
      return c.mode === 'sound' ? beep(now + N.soundLead, { f: 140, type: 'square', d: .1, v: .3, pan: c.door ? .9 : -.9 }) : now;
    },
    end: c => c.press != null ? c.press + 900 : c.cue != null ? c.cue + 1600 : null,
    judge(c) { judgeRT(c); c.watched = c.door === c.watch; c.wrong = c.rf != null && c.key !== (c.door ? 'KeyK' : 'KeyA'); c.ok = c.rf != null && !c.wrong; },
    after(c) { if (c.watch != null) angleHist.push(c.watch); if (c.ok) { pushKeep(slot(`an.${c.mode}.${c.watched ? 'w' : 'u'}`, []), c.rf); save(); } },
  });
  const AN_SCRIPT = [[0, 0, 13], [0, 0, 14], [0, 1, 23], [0, 1, 22], [1, 1, 13], [1, 0, 24]]
    .map(([watch, door, rf], i) => ({ watch, door, rf, key: door ? 'KeyK' : 'KeyA', wait: 900 + (i % 2) * 250, mode: 'sight' }));
  const anOptsTour = { prep(c, done) { c.odds = peekOdds(done.map(x => x.watch), c.watch); } };
  const anData = (v, mode) => v.tour
    ? { w: v.done.filter(x => x.ok && x.watched).map(x => x.rf), u: v.done.filter(x => x.ok && !x.watched).map(x => x.rf) }
    : { w: (DB.an && DB.an[mode] && DB.an[mode].w) || [], u: (DB.an && DB.an[mode] && DB.an[mode].u) || [] };
  lab('angle', {
    state: { watch: 0 },
    keys: ['KeyA', 'KeyK'],
    script: AN_SCRIPT,
    opts: st => Object.assign(anOpts(st), anOptsTour),
    clear() { DB.an = {}; angleHist = []; },
    click(p, st, R) {
      const i = DOORS.findIndex(d => p.x >= d.x - 30 && p.x <= d.x + d.w + 30 && p.y < 360);
      if (i < 0) return R.running ? null : 'KeyA';
      const c = R.cur;
      if (R.running && c && c.cue != null && performance.now() >= c.cue && c.press == null) return i ? 'KeyK' : 'KeyA';
      st.free(); st.watch = i; return null;
    },
    wire(s, st, R, free) { $$(s, '.lab-watch .btn').forEach(b => b.onclick = () => { free(); st.watch = +b.dataset.w; b.blur(); }); },
    liveCfg: st => ({ mode: st.mode, watch: st.watch, odds: peekOdds(angleHist, st.watch) }),
    tourCfg: v => { const c = v.cur || v.done[v.done.length - 1] || AN_SCRIPT[0]; return { mode: 'sight', watch: c.watch, odds: v.cur ? v.cur.odds : peekOdds(v.done.map(x => x.watch), c.watch) }; },
    marks(s, cfg) { $$(s, '.lab-watch .btn').forEach(b => b.classList.toggle('on', +b.dataset.w === cfg.watch)); },
    draw(g, v) {
      const c = v.cur, now = v.now, { mode, watch } = v.cfg;
      const cued = c && c.cue != null && now >= c.cue, pressed = c && c.press != null && now >= c.press;
      T.wall(28, 22, 984, 330);
      g.fillStyle = '#ddd2bc'; g.fillRect(28, 326, 984, 26);
      DOORS.forEach((d, i) => {
        box(g, d.x - 10, DY - 10, d.w + 20, DH + 10, 8, '#8b8fa8', C.navy, 3);
        g.fillStyle = '#0d1330'; g.fillRect(d.x, DY, d.w, DH);
        g.fillStyle = 'rgba(255,185,81,.10)'; g.fillRect(d.x, DY + DH - 40, d.w, 40);
        keycap(g, doorC(i), 380, i ? 'K' : 'A', c && pressed && c.key === (i ? 'KeyK' : 'KeyA') && recent(now, c.press, 200), C.gold, 42);
        if (i === watch) { box(g, doorC(i) - 52, DY - 40, 104, 26, 13, C.gold); tx(g, 'watching', doorC(i), DY - 26, BF(14, 800), C.navy, 'center'); }
      });
      ghostTag(g, v, 996, 46);
      // target
      const show = c && cued && !c.early && (mode !== 'sound' || v.tour || pressed);
      if (show) {
        const k = clamp((now - c.cue) / 90), x = doorC(c.door);
        T.foe(x, DY + DH - 70, 40 * lerp(.6, 1, k), Math.PI / 2, C.red, { mark: 'scope', a: pressed && c.ok ? .55 : 1 });
      }
      if (mode === 'sound' && c && cued && !pressed && v.tour) waves(g, doorC(c.door) - (c.door ? -70 : 70), DY + 80, 1, C.gold);
      if (mode === 'sound' && c && !pressed && !v.tour) { box(g, 380, 150, 280, 70, 14, 'rgba(21,32,68,.9)'); tx(g, 'Sound only: listen', 520, 172, HF(18), '#fff', 'center'); tx(g, 'footstep left or right', 520, 198, BF(15, 500), '#d6dbef', 'center'); }
      // crosshair
      let cx = doorC(watch);
      if (pressed && c.ok) cx = lerp(doorC(c.watch), doorC(c.door), clamp((now - c.press) / 90));
      const cy = DY + DH - 70;
      g.strokeStyle = C.gold; g.lineWidth = 3.5; g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.moveTo(cx - 40, cy); g.lineTo(cx - 12, cy); g.moveTo(cx + 12, cy); g.lineTo(cx + 40, cy); g.moveTo(cx, cy - 40); g.lineTo(cx, cy - 12); g.moveTo(cx, cy + 12); g.lineTo(cx, cy + 40); g.stroke();
      if (pressed) {
        const txt = c.early ? 'Too early' : c.wrong ? 'Wrong door' : `${c.rf} f · ${c.watched ? 'the door you held' : 'the other door'}`;
        box(g, 380, 236, 280, 46, 12, 'rgba(255,252,244,.95)', C.navy, 2);
        tx(g, txt, 520, 259, HF(19), c.ok ? (c.watched ? '#145c33' : C.redDk) : C.redDk, 'center');
      }
      // results
      const d = anData(v, mode), X = frameAxis(g, 200, 990, 540, 36, 6);
      zones(g, X, 418, 532, 36);
      [['held door', d.w, '#2fae63', 452], ['other door', d.u, C.red, 498]].forEach(([lab2, list, col, y]) => {
        tx(g, lab2, 28, y, HF(16), C.ink);
        list.forEach((f, i) => dot(g, X(f) + ((i * 37) % 9 - 4), y, 6.5, col));
        const m = avg(list); if (m != null) { diamond(g, X(m), y - 18, 8, col); T.label(f1(m) + ' f', X(m) + 14, y - 18, 'left', C.ink, 14); }
      });
      idleBanner(g, v, 'Press A or K to start', 'click a door to choose which one to watch');
    },
    stats(v) {
      const d = anData(v, v.cfg.mode), a = avg(d.w), b = avg(d.u);
      return stat(f1(a), `held door, mean frames (${d.w.length})`, 'g') +
        stat(f1(b), `other door, mean frames (${d.u.length})`, 'r') +
        stat(a != null && b != null ? f1(b - a) : '–', 'frames the held angle saves, and costs on the other side', 'y') +
        stat(Math.round(100 * v.cfg.odds) + '%', 'chance the opponent peeks the door you watch');
    },
    out(v) {
      const d = anData(v, v.cfg.mode), a = avg(d.w), b = avg(d.u);
      if (a != null && b != null) return `Holding an angle made ${v.tour ? 'the ghost' : 'you'} <b>${f1(b - a)} frames</b> faster on that door, and slower everywhere else. A reader of habits peeks the other side.`;
      return 'Buffering a reaction means deciding in advance what to watch for: you react faster to that one thing, and worse to everything else.';
    },
  });

  window.__seek = (t, w) => (apis[w] || apis.timing).seek(t);
  window.__dur = w => (apis[w] || apis.timing).dur();
})();
