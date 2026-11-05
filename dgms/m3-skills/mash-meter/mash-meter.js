/* Mash meter (DGMS Module 3, Leveraging Player Skills, slides 111-115).
   mash     Mash J/K (or click) for 5 seconds and read presses per second against the deck's marks: about 8 for most
            people, 16 for the old world record, 30 as the 60 fps ceiling (a press and a release take a frame each),
            31 for the current record. "Hold instead of mash" is the notes' accessibility option: holding counts as a
            steady mash at the most-people rate.
   lockout  Smash's tech lockout: a press makes you ready for 20 frames, then locked out for 40, so a player who mashes
            before landing is often locked when the ground arrives. Toggle the lockout to compare.
   Numbers marked "deck" come from the notes; the hold rate, fall times and ghost press patterns are ours.
   Results stay in this browser (FPF.store, localStorage wrapped in try/catch). The walk-through is a scripted ghost
   whose presses are a pure function of time, so __seek(t, which) is deterministic. */
(function () {
  const { $, $$, canvasDemo, say, store } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585;

  const N = {
    fps: 60,
    secs: 5,                                   // proposal: mash for five seconds
    marks: [                                   // deck notes, presses per second
      { v: 8, l: 'most people', col: '#2ea3dc' },
      { v: 16, l: 'old world record', col: '#2fae63' },
      { v: 30, l: '60 fps ceiling', col: '#e0a92d' },
      { v: 31, l: 'current record', col: '#e5322d' },
    ],
    max: 34,
    holdRate: 8,                               // ours: a held key counts as the most-people rate
    ready: 20, locked: 40,                     // deck: Smash's tech, ready for 20 frames, then locked for 40
    fall: [1.0, 1.8],                          // ours: seconds from launch to landing
    rounds: 10,                                // ours: landings per set
    g: 480,                                    // ours: px/s^2, sets the arc height from the fall time
  };
  const FR = 1000 / N.fps;
  const SK = 'dgms-m3-mash-meter';
  const DB = store.get(SK, {}) || {};
  const save = () => store.set(SK, DB);
  const HF = (s, w = 800) => `${w} ${s}px Montserrat, Jost, sans-serif`, BF = (s, w = 600) => `${w} ${s}px Jost, sans-serif`;
  function tx(g, s, x, y, f = BF(16), c = C.ink, a = 'left', b = 'middle') { g.font = f; g.fillStyle = c; g.textAlign = a; g.textBaseline = b; g.fillText(s, x, y); }
  function box(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function bg(g) { T.use(g); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); box(g, 0, 0, W, H, 14, 'rgba(255,252,244,.86)'); }
  function keycap(g, x, y, label, lit, s = 46, col = C.gold) {
    box(g, x - s / 2, y - s / 2 + s * .11, s, s, s * .2, C.navy);
    box(g, x - s / 2, y - s / 2 + (lit ? s * .09 : 0), s, s, s * .2, lit ? col : '#fffaf0', C.navy, 3);
    tx(g, label, x, y + (lit ? s * .09 : 0) + 2, HF(s * .42), lit ? '#fff' : C.ink, 'center');
  }
  function ghostTag(g, on, x = 1012, y = 34) { if (on) { box(g, x - 168, y - 15, 168, 30, 15, C.navy); tx(g, '▶ ghost player', x - 84, y + 1, BF(15, 700), C.gold, 'center'); } }
  const stat = (b, span, cls = '') => `<div class="${cls}"><b>${b}</b><span>${span}</span></div>`;
  const apis = {};
  let active = null;
  addEventListener('keydown', e => {
    if (!active || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (!active.keys.includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat) active.down(e.timeStamp, e.code);
  }, true);
  addEventListener('keyup', e => { if (active && active.keys.includes(e.code)) active.up(e.timeStamp, e.code); }, true);
  const demo = (name, setup) => canvasDemo(name, setup, {
    enter(s) { active = s._mm; },
    leave(s) { if (active === s._mm) active = null; s._mm && s._mm.stop(); },
  });

  /* =================== 1. the mash meter =================== */
  // the ghost: a five-second mash at about 8.6/s that tires a little, then the same five seconds holding the key
  const TOUR1 = { a: 1.0, b: 8.6, dur: 15.4 };
  const ghostMash = (() => {
    const out = []; let t = 0, i = 0;
    while (t < N.secs * 1000) { out.push(t); t += 1000 / 8.6 * (1 + .14 * Math.sin(i * 1.7) + .06 * (t / 5000)); i++; }
    return out;
  })();
  const holdPresses = (start, end) => { const out = []; for (let t = start; t < end; t += 1000 / N.holdRate) out.push(t); return out; };
  demo('mash', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, hold: false, run: null, sk: '', ok: '' };
    const tourBtn = $(s, '.mm-tour');
    const free = () => { if (st.tour) { st.tour = false; st.held = false; tourBtn.classList.remove('on'); } };
    $$(s, '.mm-hold .btn').forEach(b => b.onclick = () => { free(); st.hold = b.dataset.h === '1'; st.run = null; b.blur(); });
    tourBtn.onclick = () => { st.tour = true; st.held = false; st.t = 0; st.run = null; tourBtn.classList.add('on'); tourBtn.blur(); };
    $(s, '.mm-clear').onclick = e => { free(); DB.mash = {}; save(); st.run = null; e.currentTarget.blur(); };
    const keysDown = new Set();
    function down(ts, code) {
      free();
      const now = ts;
      let r = st.run;
      if (r && r.over && now - r.t0 < N.secs * 1000 + 900) return;      // a short pause after a run so a late press does not start the next
      if (!r || r.over) r = st.run = { t0: now, presses: [], hold: st.hold, holdFrom: null, over: false };
      keysDown.add(code);
      if (r.hold) { if (r.holdFrom == null) { r.holdFrom = now; } }
      else r.presses.push(now);
    }
    function up(ts, code) {
      keysDown.delete(code);
      const r = st.run;
      if (r && r.hold && r.holdFrom != null && !keysDown.size) { holdPresses(r.holdFrom, Math.min(ts, r.t0 + N.secs * 1000)).forEach(p => r.presses.push(p)); r.holdFrom = null; }
    }
    s._mm = { keys: ['KeyJ', 'KeyK'], down, up, stop() { keysDown.clear(); if (st.run && !st.run.over) st.run = null; } };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); down(e.timeStamp, 'ptr'); });
    cv.addEventListener('pointerup', e => up(e.timeStamp, 'ptr'));
    cv.addEventListener('pointercancel', e => up(e.timeStamp, 'ptr'));

    // view: { presses (ms from start), el (ms elapsed), hold, holding, over, ghost }
    function view() {
      if (st.tour) {
        const t = st.t * 1000;
        if (t < 8000) {
          const el = t - TOUR1.a * 1000;
          return { presses: el < 0 ? [] : ghostMash.filter(p => p <= el), el: clamp(el, 0, N.secs * 1000), hold: false, over: el >= N.secs * 1000, started: el >= 0, ghost: true };
        }
        const el = t - TOUR1.b * 1000;
        return { presses: el < 0 ? [] : holdPresses(0, Math.min(el, N.secs * 1000) + .01), el: clamp(el, 0, N.secs * 1000), hold: true, holding: el >= 0 && el < N.secs * 1000, over: el >= N.secs * 1000, started: el >= 0, ghost: true };
      }
      const r = st.run, now = performance.now();
      if (!r) return { presses: [], el: 0, hold: st.hold, over: false, started: false };
      const el = Math.min(now - r.t0, N.secs * 1000);
      if (!r.over && now - r.t0 >= N.secs * 1000) {
        if (r.holdFrom != null) { holdPresses(r.holdFrom, r.t0 + N.secs * 1000).forEach(p => r.presses.push(p)); r.holdFrom = null; }
        r.over = true;
        const rate = r.presses.filter(p => p - r.t0 < N.secs * 1000).length / N.secs;
        const rec = DB.mash = DB.mash && typeof DB.mash === 'object' ? DB.mash : {};
        const k = r.hold ? 'hold' : 'mash';
        rec[k + 'Best'] = Math.max(rec[k + 'Best'] || 0, rate); rec[k + 'Last'] = rate;
        rec.hist = Array.isArray(rec.hist) ? rec.hist : []; if (!r.hold) { rec.hist.push(rate); while (rec.hist.length > 12) rec.hist.shift(); }
        save();
      }
      const ps = r.presses.map(p => p - r.t0).filter(p => p < N.secs * 1000);
      if (r.holdFrom != null) holdPresses(r.holdFrom - r.t0, el + .01).forEach(p => ps.push(p));
      return { presses: ps, el, hold: r.hold, holding: r.holdFrom != null, over: r.over, started: true };
    }

    function render() {
      const v = view(), hold = v.hold;
      $$(s, '.mm-hold .btn').forEach(b => b.classList.toggle('on', (b.dataset.h === '1') === hold));
      bg(g);
      tx(g, hold ? 'Hold J for 5 seconds: the game counts it as a steady mash' : 'Mash J (or J and K) for 5 seconds', 28, 32, HF(20), C.ink);
      ghostTag(g, v.ghost);
      const n = v.presses.length, el = v.el;
      const recent = v.presses.filter(p => p > el - 1000).length / Math.min(1, Math.max(.5, el / 1000));
      const rate = v.over ? n / N.secs : v.started ? recent : 0;
      // gauge
      const x0 = 60, x1 = 980, gy = 112, X = r => x0 + (x1 - x0) * clamp(r / N.max);
      box(g, x0, gy, x1 - x0, 34, 10, '#efe6d2', C.navy, 2.5);
      const grad = g.createLinearGradient(x0, 0, x1, 0); grad.addColorStop(0, '#9fdcf3'); grad.addColorStop(.45, '#2fae63'); grad.addColorStop(.88, '#e0a92d'); grad.addColorStop(1, '#e5322d');
      g.save(); g.beginPath(); g.roundRect(x0, gy, x1 - x0, 34, 10); g.clip(); g.fillStyle = grad; g.fillRect(x0, gy, X(rate) - x0, 34); g.restore();
      for (let r = 0; r <= 24; r += 4) { tx(g, String(r), X(r), gy + 52, BF(13, 600), C.muted, 'center'); }
      tx(g, 'presses per second', x1, gy + 72, BF(13, 600), C.muted, 'right');
      N.marks.forEach((m, i) => {
        g.strokeStyle = m.col; g.lineWidth = 3; g.beginPath(); g.moveTo(X(m.v), gy - 8); g.lineTo(X(m.v), gy + 42); g.stroke();
        const up = i < 3, a = i === 2 ? 'right' : 'left', dx = i === 2 ? -6 : 6;
        tx(g, i === 3 ? `${m.l} · ${m.v}` : `${m.v} · ${m.l}`, X(m.v) + (i === 3 ? 4 : dx), up ? gy - 18 : gy + 52, BF(14, 800), m.col === '#e0a92d' ? '#9a5a06' : m.col, i === 3 ? 'right' : a);
      });
      // needle
      g.fillStyle = C.navy; g.beginPath(); g.moveTo(X(rate), gy + 36); g.lineTo(X(rate) - 11, gy + 54); g.lineTo(X(rate) + 11, gy + 54); g.closePath(); g.fill();
      // key, count, timer
      const lastP = v.presses.length ? v.presses[v.presses.length - 1] : -1e9;
      const lit = v.holding || (v.started && !v.over && el - lastP < 60);
      keycap(g, 150, 262, 'J', lit, 110, hold ? '#2fae63' : C.gold);
      if (hold) tx(g, v.holding ? 'held' : 'hold', 150, 352, HF(18), '#145c33', 'center');
      tx(g, String(n), 420, 268, HF(84), C.ink, 'center');
      tx(g, v.over ? 'presses in 5 s' : 'presses', 420, 330, BF(18, 600), C.muted, 'center');
      tx(g, rate.toFixed(1), 650, 268, HF(84), C.ink, 'center');
      tx(g, v.over ? 'per second, final' : 'per second, last 1 s', 650, 330, BF(18, 600), C.muted, 'center');
      const left = N.secs - el / 1000, cx = 880, cy = 280;
      g.strokeStyle = '#e8dcc0'; g.lineWidth = 14; g.beginPath(); g.arc(cx, cy, 58, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = C.navy; g.beginPath(); g.arc(cx, cy, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - el / (N.secs * 1000))); g.stroke();
      tx(g, v.started ? left.toFixed(1) : '5.0', cx, cy - 4, HF(30), C.ink, 'center'); tx(g, 'seconds', cx, cy + 24, BF(13, 600), C.muted, 'center');
      // rate over time
      const by = 552, bh = 140, bx0 = 90, bx1 = 990, bins = 10, bw = (bx1 - bx0) / bins, Y = r => by - bh * clamp(r / 20);
      tx(g, 'presses per second through the run', 28, by - bh - 22, HF(15), C.ink);
      [8, 16].forEach(r => { g.setLineDash([6, 5]); g.strokeStyle = r === 8 ? '#2ea3dc' : '#2fae63'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx0, Y(r)); g.lineTo(bx1, Y(r)); g.stroke(); g.setLineDash([]); tx(g, String(r), bx0 - 10, Y(r), BF(13, 700), r === 8 ? '#1b6f9a' : '#145c33', 'right'); });
      for (let i = 0; i < bins; i++) {
        const a = i * 500, b = a + 500; if (el < a) break;
        const c = v.presses.filter(p => p >= a && p < b).length, span = Math.min(500, el - a) / 1000;
        const r = span > .1 ? c / span : 0;
        box(g, bx0 + i * bw + 6, Y(r), bw - 12, by - Y(r), 4, hold ? '#2fae63' : '#2ea3dc');
      }
      g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(bx0, by); g.lineTo(bx1, by); g.stroke();
      for (let i = 0; i <= 5; i++) tx(g, i + ' s', bx0 + i * 2 * bw, by + 14, BF(12, 600), C.muted, 'center');
      if (!st.tour && !v.started) { box(g, 300, 400, 440, 72, 14, 'rgba(21,32,68,.92)', C.gold, 3); tx(g, hold ? 'Hold J or the canvas to start' : 'Press J or click to start', 520, 424, HF(20), '#fff', 'center'); tx(g, 'the timer starts on your first press', 520, 452, BF(15, 500), '#d6dbef', 'center'); }
      // side panel
      const rec = DB.mash || {};
      const html = stat(v.over ? (n / N.secs).toFixed(1) : '–', v.ghost ? 'ghost presses per second' : 'your presses per second, this run', 'g') +
        stat(rec.mashBest ? rec.mashBest.toFixed(1) : '–', 'your best mash, stored in this browser', 'y') +
        stat(v.over ? Math.round(100 * (n / N.secs) / 16) + '%' : '–', 'of the old world record (16/s)') +
        stat('2 f', 'per press at 60 fps: down and up, so 30/s is the ceiling', 'r');
      if (html !== st.sk) { st.sk = html; say($(s, '.mm-stats'), html); }
      const r2 = n / N.secs;
      const out = hold ? 'Hold mode turns the mash into a steady 8 presses per second. Players with limited hand mobility, or a worn controller, still get through, and the test stays the same length.'
        : !v.over ? 'Most people mash at about 8 presses per second. The old world record was 16, and 60 fps puts a ceiling at 30, since each press needs a frame down and a frame up.'
        : r2 >= 16 ? `<b>${r2.toFixed(1)}/s</b> is world-record territory. Do not design a required mash around you.`
        : r2 >= 10 ? `<b>${r2.toFixed(1)}/s</b>: faster than most people. A mash tuned to your speed would lock most players out.`
        : `<b>${r2.toFixed(1)}/s</b>: right around the 8 most people manage. Tune required mashes to this, and offer a hold option.`;
      if (out !== st.ok) { st.ok = out; say($(s, '.mm-out'), out); }
    }
    apis.mash = { seek(t) { st.tour = st.held = true; tourBtn.classList.add('on'); st.t = t; render(); }, dur: () => TOUR1.dur };
    return dt => { if (st.tour) { if (!st.held) st.t += dt; if (st.t > TOUR1.dur) st.t = 0; } render(); };
  });

  /* =================== 2. tech lockout =================== */
  // a press opens 20 ready frames; with the lockout, 40 locked frames follow and presses in either are ignored
  function windows(presses, lock) {
    const segs = [], ignored = []; let busy = -1e9;
    presses.slice().sort((a, b) => a - b).forEach(p => {
      if (lock) {
        if (p >= busy) { segs.push({ a: p, b: p + N.ready, k: 'ready' }, { a: p + N.ready, b: p + N.ready + N.locked, k: 'lock' }); busy = p + N.ready + N.locked; }
        else ignored.push(p);
      } else segs.push({ a: p, b: p + N.ready, k: 'ready' });
    });
    return { segs, ignored };
  }
  const teched = (presses, lock, land) => windows(presses, lock).segs.some(s => s.k === 'ready' && land >= s.a && land < s.b);
  // what a steady 8/s masher (from launch) gets, averaged over landings in the fall range and press phases (ours)
  const masherRate = lock => {
    let ok = 0, n = 0;
    for (let land = N.fall[0] * 60; land <= N.fall[1] * 60; land++) for (let ph = 0; ph < 7.5; ph += .5) {
      const ps = []; for (let p = ph; p < land; p += 7.5) ps.push(p);
      n++; if (teched(ps, lock, land)) ok++;
    }
    return ok / n;
  };
  const MASH_ON = masherRate(true), MASH_OFF = masherRate(false);
  const TOUR2 = [
    { lock: true, land: 90, presses: Array.from({ length: 12 }, (_, i) => 4 + i * 7.5).filter(p => p < 90), who: 'masher, lockout on' },
    { lock: true, land: 78, presses: [70], who: 'one timed press, lockout on' },
    { lock: false, land: 90, presses: Array.from({ length: 12 }, (_, i) => 4 + i * 7.5).filter(p => p < 90), who: 'masher, lockout off' },
  ];
  const AFTER = 1300, GAP = 400;
  const tourRounds = () => { let b = 0; return TOUR2.map(r => { const o = Object.assign({ begin: b }, r); b += r.land * FR + AFTER + GAP; return o; }); };
  const TR = tourRounds(), DUR2 = TR.reduce((a, r) => a + r.land * FR + AFTER + GAP, 0) / 1000 + .3;

  demo('lockout', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, lock: true, running: false, cur: null, done: [], next: 0, sk: '', ok: '' };
    const tourBtn = $(s, '.mm-tour');
    const free = () => { if (st.tour) { st.tour = false; st.held = false; tourBtn.classList.remove('on'); } };
    const stop = () => { st.running = false; st.cur = null; };
    $$(s, '.mm-lock .btn').forEach(b => b.onclick = () => { free(); stop(); st.lock = b.dataset.l === '1'; b.blur(); });
    tourBtn.onclick = () => { stop(); st.tour = true; st.held = false; st.t = 0; tourBtn.classList.add('on'); tourBtn.blur(); };
    $(s, '.mm-clear').onclick = e => { free(); stop(); st.done = []; DB.lock = {}; save(); e.currentTarget.blur(); };
    function down(ts) {
      free();
      if (!st.running) { st.running = true; st.done = []; st.cur = null; st.next = performance.now() + 500; return; }
      const c = st.cur; if (!c) return;
      const f = (ts - c.t0) / FR; if (f >= 0 && f < c.land) c.presses.push(f);
    }
    s._mm = { keys: ['KeyJ'], down, up() {}, stop };
    cv.addEventListener('pointerdown', e => down(e.timeStamp));
    function tick(now) {
      if (!st.running) return;
      if (!st.cur) { if (now < st.next) return; st.cur = { t0: now, land: Math.round(60 * (N.fall[0] + Math.random() * (N.fall[1] - N.fall[0]))), presses: [], lock: st.lock }; }
      const c = st.cur;
      if (now >= c.t0 + c.land * FR + AFTER) {
        c.ok = teched(c.presses, c.lock, c.land); st.done.push(c); st.cur = null; st.next = now + GAP;
        const r = DB.lock = DB.lock && typeof DB.lock === 'object' ? DB.lock : {}; const k = c.lock ? 'on' : 'off';
        r[k] = Array.isArray(r[k]) ? r[k] : [0, 0]; r[k][1]++; if (c.ok) r[k][0]++; save();
        if (st.done.length >= N.rounds) stop();
      }
    }
    function view() {
      if (st.tour) {
        const t = st.t * 1000; const done = [];
        for (const r of TR) {
          const end = r.begin + r.land * FR + AFTER + GAP;
          const f = (t - r.begin) / FR;
          if (t < end) return { cur: Object.assign({}, r, { presses: r.presses.filter(p => p <= f), ok: teched(r.presses, r.lock, r.land) }), f, done, lock: r.lock, ghost: true };
          done.push(Object.assign({}, r, { ok: teched(r.presses, r.lock, r.land) }));
        }
        return { cur: null, f: 0, done, lock: TR[TR.length - 1].lock, ghost: true };
      }
      const now = performance.now(), c = st.cur;
      return { cur: c ? Object.assign({}, c, { ok: teched(c.presses, c.lock, c.land) }) : null, f: c ? (now - c.t0) / FR : 0, done: st.done, lock: c ? c.lock : st.lock, running: st.running };
    }
    function fighterAt(g, x, y, ang, squash = 1) {
      g.save(); g.translate(x, y); g.scale(1 / squash, squash);
      T.player(0, 0, ang, 1.3);
      g.restore();
    }
    function render() {
      if (!st.tour) tick(performance.now());
      const v = view(), c = v.cur, f = v.f;
      $$(s, '.mm-lock .btn').forEach(b => b.classList.toggle('on', (b.dataset.l === '1') === v.lock));
      bg(g);
      // scene
      box(g, 28, 18, 984, 300, 16, '#2a3160', C.navy, 3);
      const gy = 262;
      box(g, 120, gy, 800, 22, 6, '#8b8fa8', C.navy, 3); g.fillStyle = '#5a5f92'; g.fillRect(150, gy + 22, 740, 26);
      tx(g, v.lock ? 'Lockout on: ready 20 f, then locked 40 f' : 'Lockout off: every press is ready for 20 f', 48, 44, HF(18), '#fff');
      ghostTag(g, v.ghost, 996, 44);
      if (c) {
        const L = c.land, k = clamp(f / L), t = Math.min(f, L) / 60, Ls = L / 60;
        const apex = N.g * Ls * Ls / 8, vy = N.g * Ls / 2, hgt = vy * t - .5 * N.g * t * t;
        const x = lerp(300, 560, k), y = gy - 26 - hgt;
        if (f < L) {
          fighterAt(g, x, y, f * .25);
          g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, gy + 2, 26 * (1 - .4 * clamp(hgt / 220)), 6, 0, 0, Math.PI * 2); g.fill();
          // ready / locked pill above the fighter
          const st2 = windows(c.presses, c.lock).segs.find(sg => f >= sg.a && f < sg.b);
          if (st2) { const rd = st2.k === 'ready'; box(g, x - 48, y - 64, 96, 26, 13, rd ? C.p2 : C.red); tx(g, rd ? 'READY' : 'LOCKED', x, y - 50, BF(14, 800), '#fff', 'center'); }
          tx(g, `apex ${Math.round(apex)} px · lands on frame ${L}`, 48, 296, BF(14, 600), 'rgba(255,255,255,.6)');
        } else {
          const a = clamp((f - L) / 22);
          if (c.ok) {
            const rx = lerp(560, 700, a);
            for (let i = 1; i <= 3; i++) { g.globalAlpha = .18 * (4 - i) * (a < 1 ? 1 : .3); fighterAt(g, rx - i * 24 * a, gy - 26, (f - L) * .5 - i * .4); }
            g.globalAlpha = 1; fighterAt(g, rx, gy - 26, (f - L) * .5);
            tx(g, 'TECH ROLL', W / 2, 100, HF(38), '#7ee0a8', 'center');
          } else {
            fighterAt(g, 560, gy - 14, 0, .5);
            tx(g, 'KNOCKDOWN', W / 2, 100, HF(38), '#ff8a80', 'center');
            tx(g, c.presses.length ? (windows(c.presses, c.lock).segs.some(sg => sg.k === 'lock' && L >= sg.a && L < sg.b) ? 'locked out when the ground arrived' : 'no ready frames at landing') : 'no press', W / 2, 140, BF(18, 600), '#fff', 'center');
          }
        }
        if (v.ghost) tx(g, 'ghost: ' + c.who, 48, 72, BF(15, 600), C.gold);
      }
      keycap(g, 960, 270, 'J', c && c.presses.length && f - c.presses[c.presses.length - 1] < 4 && f < c.land);
      // timeline
      const tx0 = 60, tx1 = 980, ty = 362, maxF = c ? c.land + 24 : 130, XF = q => tx0 + (tx1 - tx0) * clamp(q / maxF);
      tx(g, 'frames since launch', 28, 340, HF(15), C.ink);
      box(g, tx0, ty, tx1 - tx0, 40, 8, '#efe6d2', '#cdbf9f', 2);
      if (c) {
        const { segs, ignored } = windows(c.presses, c.lock);
        segs.forEach(sg => { if (sg.a > f) return; const b = Math.min(sg.b, f); g.fillStyle = sg.k === 'ready' ? 'rgba(47,174,99,.85)' : 'rgba(229,50,45,.75)'; g.fillRect(XF(sg.a), ty + 2, XF(b) - XF(sg.a), 36); });
        c.presses.forEach(p => { if (p > f) return; const ig = ignored.includes(p); g.strokeStyle = ig ? 'rgba(21,32,68,.45)' : C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(XF(p), ty - 10); g.lineTo(XF(p), ty + 4); g.stroke(); });
        g.strokeStyle = C.navy; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(XF(c.land), ty - 14); g.lineTo(XF(c.land), ty + 54); g.stroke(); g.setLineDash([]);
        tx(g, 'landing', XF(c.land), ty + 64, BF(14, 800), C.ink, 'center');
        if (f < c.land) { g.fillStyle = C.gold; g.fillRect(XF(f) - 2, ty - 4, 4, 48); }
      }
      for (let q = 0; q <= maxF; q += 20) tx(g, String(q), XF(q), ty + 54, BF(12, 600), C.muted, 'center');
      // legend
      box(g, 60, 440, 18, 18, 4, 'rgba(47,174,99,.85)'); tx(g, 'ready: landing here techs', 86, 449, BF(14, 600), C.ink);
      box(g, 300, 440, 18, 18, 4, 'rgba(229,50,45,.75)'); tx(g, 'locked: presses ignored', 326, 449, BF(14, 600), C.ink);
      g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(530, 440); g.lineTo(530, 458); g.stroke(); tx(g, 'a press (faded: ignored)', 542, 449, BF(14, 600), C.ink);
      // history
      tx(g, v.ghost ? 'ghost rounds' : `your rounds (${v.done.length} of ${N.rounds})`, 28, 500, HF(15), C.ink);
      v.done.slice(-10).forEach((r, i) => {
        const bx = 240 + i * 74;
        box(g, bx, 482, 66, 40, 8, r.ok ? '#d8f0df' : '#f9d9d6', r.ok ? '#5fb47c' : '#e07b72', 2);
        tx(g, r.ok ? 'tech' : 'down', bx + 33, 495, BF(14, 800), C.ink, 'center');
        tx(g, `${r.presses.length} press${r.presses.length === 1 ? '' : 'es'}`, bx + 33, 512, BF(11, 600), C.muted, 'center');
      });
      tx(g, `A steady 8/s masher techs ${Math.round(100 * MASH_ON)}% of these landings with the lockout, ${Math.round(100 * MASH_OFF)}% without it.`, 28, 556, BF(15, 600), C.muted);
      if (!st.tour && !v.running && !c) { box(g, 300, 120, 440, 80, 14, 'rgba(21,32,68,.94)', C.gold, 3); tx(g, 'Press J or click to start', 520, 148, HF(20), '#fff', 'center'); tx(g, `${N.rounds} launches · tech as you land`, 520, 178, BF(15, 500), '#d6dbef', 'center'); }
      // side panel
      const rec = DB.lock || {}, mine = v.ghost ? null : v.done.filter(r => r.lock === v.lock);
      const pct = a => a && a[1] ? Math.round(100 * a[0] / a[1]) + '%' : '–';
      const html = stat(Math.round(100 * (v.lock ? MASH_ON : MASH_OFF)) + '%', `a steady 8/s masher techs, lockout ${v.lock ? 'on' : 'off'}`, v.lock ? 'r' : 'g') +
        stat(mine && mine.length ? `${mine.filter(r => r.ok).length}/${mine.length}` : '–', 'your techs this set') +
        stat(pct(rec[v.lock ? 'on' : 'off']), `your stored tech rate, lockout ${v.lock ? 'on' : 'off'}`, 'y') +
        stat('20/40', 'ready frames / locked frames per press', '');
      if (html !== st.sk) { st.sk = html; say($(s, '.mm-stats'), html); }
      const out = v.lock ? 'With the lockout, mashing early spends your ready frames in the air and leaves you locked when you land. One press, timed to the landing, techs every time.'
        : 'Without the lockout, mashing wins: every press refreshes the ready window, so timing stops mattering. The lockout is what makes the tech a timing test.';
      if (out !== st.ok) { st.ok = out; say($(s, '.mm-out'), out); }
    }
    apis.lockout = { seek(t) { st.tour = st.held = true; tourBtn.classList.add('on'); stop(); st.t = t; render(); }, dur: () => DUR2 };
    return dt => { if (st.tour) { if (!st.held) st.t += dt; if (st.t > DUR2) st.t = 0; } render(); };
  });

  window.__seek = (t, w) => (apis[w] || apis.mash).seek(t);
  window.__dur = w => (apis[w] || apis.mash).dur();
})();
