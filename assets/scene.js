/* Scene kit for the game-example mock-ups: a small fixed-step runner plus the canvas pieces those pages share
   (text, panels, bars, key caps, speech bubbles, sprites, a few synthesised sounds). Exposed as SCN.
   Load after deck.js and kit.js (and cast.js when the page draws the cast).

   SCN.run(name, setup) registers a canvas demo. setup(s, canvas, g) returns
     { dur, reset(tour), step(h, t), draw(g, t, tour), script: [[time, fn], ...], caption(t), status(), stats(),
       acts: { name(arg) }, set(key, value), keys: { j: 'name' }, holds: { r: 'name' }, point({x, y, type}) }
   The walk-through is reset() followed by step() in 1/60 s ticks with the script's events fired on time, so
   window.__seek(t) replays it exactly (the GIF recorder uses that) and the same step() runs when someone plays.
   Markup the runner wires inside the slide:
     .tour                     walk-through button          [data-do="name"]    calls acts.name (leaves the tour)
     [data-hold="name"]        acts.name(true / false)      [data-set="k"][data-v]  set(k, v), marks the button .on
     input[data-rng="k"]       set(k, number)               input[data-chk="k"]  set(k, checked)
     .mt-out                   caption / status line        .mt-stats            stats() html
     .snd                      sound on / off (sounds stay off until it is pressed) */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => (k = clamp(k), k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const C = { ink: '#1b2147', navy: '#152044', muted: '#6d7196', paper: '#fffaf0', sand: '#efe6d2', line: '#cdbf9f', blue: '#2ea3dc', red: '#e5322d',
    gold: '#ffb951', amber: '#e0a92d', green: '#2fae63', purple: '#8a4fd6', pink: '#e0569b', night: '#141a36', white: '#ffffff' };
  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- drawing ---------- */
  function font(o = {}) { return `${o.w || 600} ${o.size || 15}px ${o.display ? 'Montserrat, ' : ''}Jost, sans-serif`; }
  function txt(g, s, x, y, o = {}) {
    g.font = font(o); g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle';
    if (o.halo) { g.lineWidth = o.haloW || 4; g.strokeStyle = o.halo; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.fillText(s, x, y);
  }
  function lines(g, s, max, o = {}) {
    g.font = font(o); const out = []; let cur = '';
    String(s).split(' ').forEach(w => { const t = cur ? cur + ' ' + w : w; if (cur && g.measureText(t).width > max) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur); return out;
  }
  function wrap(g, s, x, y, max, o = {}) { const lh = o.lh || (o.size || 15) * 1.3; lines(g, s, max, o).forEach((l, i) => txt(g, l, x, y + i * lh, o)); }
  function box(g, x, y, w, h, o = {}) {
    g.beginPath(); g.roundRect(x, y, w, h, o.r ?? 10);
    if (o.fill) { g.fillStyle = o.fill; g.fill(); }
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.lw || 2; g.stroke(); }
  }
  function bar(g, x, y, w, h, k, o = {}) {
    box(g, x, y, w, h, { r: o.r ?? 4, fill: o.back || 'rgba(20,26,54,.18)' });
    if (k > 0) { g.save(); g.beginPath(); g.roundRect(x, y, w, h, o.r ?? 4); g.clip(); g.fillStyle = o.col || C.blue; if (o.centre) g.fillRect(x + w / 2 - w * clamp(k) / 2, y, w * clamp(k), h); else g.fillRect(x, y, w * clamp(k), h); g.restore(); }
    if (o.stroke !== null) box(g, x, y, w, h, { r: o.r ?? 4, stroke: o.stroke || C.navy, lw: o.lw || 2 });
  }
  function pill(g, s, x, y, o = {}) {
    g.font = font(o); const w = g.measureText(s).width + (o.pad ?? 16), h = (o.size || 15) + (o.padY ?? 10);
    const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    box(g, x0, y - h / 2, w, h, { r: h / 2, fill: o.fill || C.navy, stroke: o.stroke, lw: o.lw });
    txt(g, s, x0 + w / 2, y + 1, { ...o, col: o.col || '#fff', align: 'center', halo: null }); return w;
  }
  // a key or pad button; down presses it in
  function key(g, label, x, y, o = {}) {
    const w = o.w || 46, h = o.h || 40, d = o.down ? 3 : 0, col = o.col || C.navy;
    box(g, x - w / 2, y - h / 2 + 4, w, h, { r: 9, fill: 'rgba(0,0,0,.28)' });
    box(g, x - w / 2, y - h / 2 + d, w, h, { r: 9, fill: o.down ? col : '#fffaf0', stroke: col, lw: 3 });
    txt(g, label, x, y + d + 1, { size: o.size || 17, w: 800, align: 'center', col: o.down ? '#fff' : col });
  }
  function arrow(g, x1, y1, x2, y2, o = {}) {
    const a = Math.atan2(y2 - y1, x2 - x1), hd = o.head || 11;
    g.strokeStyle = g.fillStyle = o.col || C.navy; g.lineWidth = o.lw || 3; g.lineCap = 'round'; g.setLineDash(o.dash || []);
    g.beginPath(); g.moveTo(x1, y1);
    if (o.bend) { const mx = (x1 + x2) / 2 - Math.sin(a) * o.bend, my = (y1 + y2) / 2 + Math.cos(a) * o.bend; g.quadraticCurveTo(mx, my, x2 - Math.cos(a) * hd * .6, y2 - Math.sin(a) * hd * .6); }
    else g.lineTo(x2 - Math.cos(a) * hd * .6, y2 - Math.sin(a) * hd * .6);
    g.stroke(); g.setLineDash([]);
    const b = o.bend ? Math.atan2(y2 - ((y1 + y2) / 2 + Math.cos(a) * o.bend), x2 - ((x1 + x2) / 2 - Math.sin(a) * o.bend)) : a;
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - Math.cos(b - .45) * hd, y2 - Math.sin(b - .45) * hd); g.lineTo(x2 - Math.cos(b + .45) * hd, y2 - Math.sin(b + .45) * hd); g.closePath(); g.fill();
  }
  // a pad arrow glyph: dir is 'U' 'D' 'L' 'R'
  function padArrow(g, dir, x, y, r, col) {
    const a = { R: 0, D: 90, L: 180, U: 270 }[dir] * Math.PI / 180;
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col;
    g.beginPath(); g.moveTo(r, 0); g.lineTo(-r * .1, -r * .85); g.lineTo(-r * .1, -r * .36); g.lineTo(-r, -r * .36); g.lineTo(-r, r * .36); g.lineTo(-r * .1, r * .36); g.lineTo(-r * .1, r * .85); g.closePath(); g.fill(); g.restore();
  }
  function bubble(g, s, x, y, o = {}) {      // (x, y) is where the tail points
    const size = o.size || 16, max = o.max || 220, L = lines(g, s, max, { size, w: o.w || 700 }), lh = size * 1.25;
    g.font = font({ size, w: o.w || 700 }); const w = Math.max(...L.map(l => g.measureText(l).width)) + 24, h = L.length * lh + 16;
    const bx = clamp(x - w / 2 + (o.dx || 0), 6, (o.W || 1040) - w - 6), by = y - 16 - h;
    g.fillStyle = o.fill || '#fff'; g.strokeStyle = o.stroke || C.navy; g.lineWidth = 3;
    g.beginPath(); g.roundRect(bx, by, w, h, 12); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x - 9, by + h - 1.5); g.lineTo(x, y); g.lineTo(x + 9, by + h - 1.5); g.fillStyle = o.fill || '#fff'; g.fill();
    g.beginPath(); g.moveTo(x - 9, by + h); g.lineTo(x, y); g.lineTo(x + 9, by + h); g.stroke();
    L.forEach((l, i) => txt(g, l, bx + w / 2, by + 8 + lh / 2 + i * lh, { size, w: o.w || 700, align: 'center', col: o.col || C.ink }));
  }
  const cache = {};
  function img(url) { const im = cache[url] || (cache[url] = Object.assign(new Image(), { src: url })); return im.complete && im.naturalWidth ? im : null; }
  // draw an image standing on (x, y), h pixels tall; pix keeps hard pixels, flip mirrors it
  function sprite(g, im, x, y, h, o = {}) {
    if (!im) return; const w = h * im.naturalWidth / im.naturalHeight;
    g.save(); g.imageSmoothingEnabled = !o.pix; g.globalAlpha *= o.alpha ?? 1; g.translate(x, y); if (o.flip) g.scale(-1, 1);
    g.drawImage(im, -w / 2, o.mid ? -h / 2 : -h, w, h); g.restore();
  }
  function ring(g, x, y, r, col, lw = 3, a = 1) { if (r <= 0 || a <= 0) return; g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.restore(); }
  function dot(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function paper(g, W, H, col) { g.clearRect(0, 0, W, H); box(g, 0, 0, W, H, { r: 14, fill: col || 'rgba(255,252,244,.92)' }); }
  function clipStage(g, W, H) { g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip(); }

  /* ---------- sound: off until the slide's .snd button is pressed ---------- */
  let AC = null, soundOn = false, quiet = false;
  function ctx() { if (!soundOn || quiet) return null; if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
  function tone(o = {}) {
    const ac = ctx(); if (!ac) return; const t0 = ac.currentTime + (o.at || 0), d = o.dur || .2;
    const osc = ac.createOscillator(), gn = ac.createGain(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, t0); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = (o.f || 440) * .06; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + d); }
    gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(o.vol || .15, t0 + Math.min(.02, d / 4)); gn.gain.exponentialRampToValueAtTime(.001, t0 + d);
    osc.connect(gn); gn.connect(ac.destination); osc.start(t0); osc.stop(t0 + d + .02);
  }
  function noise(o = {}) {
    const ac = ctx(); if (!ac) return; const t0 = ac.currentTime + (o.at || 0), d = o.dur || .15;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain(); src.buffer = buf; f.type = o.filter || 'lowpass'; f.frequency.value = o.cut || 1200;
    gn.gain.setValueAtTime(o.vol || .2, t0); gn.gain.exponentialRampToValueAtTime(.001, t0 + d);
    src.connect(f); f.connect(gn); gn.connect(ac.destination); src.start(t0);
  }

  /* ---------- the runner ---------- */
  const STEP = 1 / 60;
  function run(name, setup) {
    const { $, $$, canvasDemo, say } = FPF.kit;
    let live = null;
    canvasDemo(name, (s, cv, g) => {
      const d = setup(s, cv, g), script = (d.script || []).slice().sort((a, b) => a[0] - b[0]);
      const st = { tour: true, t: 0, si: 0, acc: 0, held: false, cap: null, stats: null };
      const tourBtn = $(s, '.tour'), out = $(s, '.mt-out'), stats = $(s, '.mt-stats');
      const restart = tour => { st.tour = tour; st.t = 0; st.si = 0; st.acc = 0; tourBtn?.classList.toggle('on', tour); d.reset(tour); };
      const tick = () => { while (st.tour && st.si < script.length && script[st.si][0] <= st.t + 1e-9) script[st.si++][1](); d.step(STEP, st.t); st.t += STEP; };
      const manual = () => { if (st.tour) restart(false); st.held = false; };
      const act = (n, a) => { manual(); d.acts?.[n]?.(a); };
      if (tourBtn) tourBtn.onclick = () => { st.held = false; restart(true); };
      $$(s, '[data-do]').forEach(b => b.onclick = () => { if (b.dataset.do === 'reset') { st.held = false; restart(false); } else act(b.dataset.do, b.dataset.arg); });
      $$(s, '[data-hold]').forEach(b => {
        const up = () => { if (b.classList.contains('down')) { b.classList.remove('down'); d.acts?.[b.dataset.hold]?.(false); } };
        b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('down'); act(b.dataset.hold, true); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, up));
      });
      const mark = d.mark = (k, v) => $$(s, `[data-set="${k}"]`).forEach(x => x.classList.toggle('on', x.dataset.v === String(v)));
      $$(s, '[data-set]').forEach(b => b.onclick = () => { st.held = false; if (st.tour) { st.tour = false; tourBtn?.classList.remove('on'); } d.set?.(b.dataset.set, b.dataset.v); mark(b.dataset.set, b.dataset.v); st.t = 0; d.reset(false); });
      $$(s, 'input[data-rng]').forEach(r => r.oninput = () => { st.held = false; if (st.tour) { st.tour = false; tourBtn?.classList.remove('on'); } const b = r.closest('label')?.querySelector('b'); if (b) b.textContent = r.value + (r.dataset.unit || ''); d.set?.(r.dataset.rng, +r.value); st.t = 0; d.reset(false); });
      $$(s, 'input[data-chk]').forEach(c => c.onchange = () => { st.held = false; if (st.tour) { st.tour = false; tourBtn?.classList.remove('on'); } d.set?.(c.dataset.chk, c.checked); st.t = 0; d.reset(false); });
      const snd = $(s, '.snd'); if (snd) snd.onclick = () => { soundOn = !soundOn; $$(document, '.snd').forEach(b => { b.classList.toggle('on', soundOn); b.textContent = soundOn ? '🔊 Sound on' : '🔈 Sound off'; }); if (soundOn) tone({ f: 660, dur: .08, vol: .08 }); };
      ['pointerdown', 'pointermove', 'pointerup'].forEach(ev => cv.addEventListener(ev, e => { if (!d.point) return; const p = FPF.ptr(cv, e); if (ev === 'pointerdown') manual(); if (!st.tour) d.point({ x: p.x, y: p.y, type: ev.slice(7) }); }));
      const onKey = (e, down) => {
        if (live !== api || e.target.closest?.('input, textarea, select') || e.altKey || e.ctrlKey || e.metaKey) return;
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (d.holds?.[k]) { e.preventDefault(); if (down && e.repeat) return; if (down) act(d.holds[k], true); else d.acts?.[d.holds[k]]?.(false); }
        else if (down && d.keys?.[k] && !e.repeat) { e.preventDefault(); act(d.keys[k]); }
      };
      addEventListener('keydown', e => onKey(e, true), true); addEventListener('keyup', e => onKey(e, false), true);
      const paint = () => {
        d.draw(g, st.t, st.tour);
        const cap = st.tour ? d.caption?.(st.t) : (d.status?.() ?? d.caption?.(st.t)); if (cap != null && cap !== st.cap) { st.cap = cap; say(out, cap); }
        const h = d.stats?.(); if (h != null && h !== st.stats) { st.stats = h; say(stats, h); }
      };
      const api = { d, st, mark };
      s._seek = t => { quiet = true; restart(true); while (st.t < t) tick(); quiet = false; paint(); };
      s._enter = () => { live = api; window.__seek = t => { st.held = true; s._seek(t); }; window.__dur = () => d.dur; };
      restart(true);
      return dt => {
        if (st.held) return;
        st.acc = Math.min(.1, st.acc + Math.max(0, dt));
        while (st.acc >= STEP) { st.acc -= STEP; tick(); if (st.tour && st.t >= d.dur) restart(true); }
        paint();
      };
    }, { enter(s) { s._enter(); }, leave() { live = null; } });
  }

  window.SCN = { TAU, clamp, lerp, ease, easeOut, C, rng, txt, lines, wrap, box, bar, pill, key, arrow, padArrow, bubble, img, sprite, ring, dot, paper, clipStage, tone, noise, run, STEP };
})();
