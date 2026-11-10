/* Run recorder for the replanned blog-post pages: the learner plays a short game and their own run is the readout.
   Load after genre.js.

   PLAY.game(name, def) registers a GK.scene for <section data-demo="name">. def:
     dur            length of the walk-through in seconds
     init(o, live)  a fresh state for one run; o = def.opts(s) (read from the side panel), live = false in the walk-through
     step(st, inp, dt)  advance one fixed step (dt = 1/60). inp = { down: {key: true}, press: {key: true}, click: id, mouse: [x, y], drag: bool }
     draw(g, st, ui, live)   draw the whole canvas; ui.btn(...) draws a canvas button and registers its click id
     bot(st)        the scripted player's inp for the walk-through
     opts(s)        optional: read the side panel
   The walk-through re-simulates the bot from t = 0, so window.__seek(t) (genre.js) replays it for the GIF recorder.
   A .play button in the side panel (or any canvas button the learner clicks) starts a live run with their own inputs.
   Keys are captured only while a live run is on, so Space does not also page the deck. */
(function () {
  const C = TD.C, DT = 1 / 60;
  let AC = null;
  function beep(freq = 660, dur = .12, vol = .15, type = 'sine') {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), v = AC.createGain();
      o.type = type; o.frequency.value = freq; v.gain.value = vol; v.gain.exponentialRampToValueAtTime(.001, AC.currentTime + dur);
      o.connect(v); v.connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
    } catch (e) { /* no audio: the pages say when sound matters */ }
  }

  function game(name, def) {
    GK.scene(name, (s, g, ui) => {
      const cv = g.canvas;
      const input = { down: {}, press: {}, click: null, mouse: [cv.width / 2, cv.height / 2], drag: false };
      let live = null, lastT = 0, acc = 0, hits = [];
      let tourSt = null, tourT = 0;
      const api = {
        s, W: cv.width, H: cv.height, stats: ui.stats, out: ui.out,
        get live() { return !!live; },
        // a canvas button: draws it and registers the click id. Returns nothing.
        btn(id, label, x, y, w, h, o = {}) {
          GK.box(g, x, y, w, h, o.on ? C.navy : (o.fill || '#fffaf0'), o.stroke || (o.on ? C.navy : '#8ea2e6'), 9, 2);
          GK.text(g, label, x + w / 2, y + h / 2 + (o.px || 14) * .36, o.on ? '#fff' : (o.col || C.ink), o.px || 14, 'center', 700);
          hits.push([x, y, w, h, id]);
        },
        hit(id, x, y, w, h) { hits.push([x, y, w, h, id]); },
        beep: (...a) => { if (live) beep(...a); },
      };
      const start = () => { ui.stopTour(); live = def.init(def.opts ? def.opts(s) : {}, true); acc = 0; input.press = {}; input.click = null; };
      api.start = start;
      const pb = s.querySelector('.play'); if (pb) pb.onclick = start;
      const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.width, (e.clientY - r.top) / r.height * cv.height]; };
      cv.addEventListener('pointermove', e => { input.mouse = pos(e); });
      cv.addEventListener('pointerdown', e => {
        input.mouse = pos(e); input.drag = true;
        const [x, y] = input.mouse; let id = null;
        hits.forEach(([hx, hy, hw, hh, hid]) => { if (x >= hx && x <= hx + hw && y >= hy && y <= hy + hh) id = hid; });
        if (!live) { if (id != null || def.clickStarts) { start(); } else return; }
        input.click = id != null ? id : '_canvas';
      });
      addEventListener('pointerup', () => { input.drag = false; });
      addEventListener('keydown', e => {
        if (!live || e.target.closest?.('input, textarea, select')) return;
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (!(def.keys || [' ']).includes(k)) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (!input.down[k]) input.press[k] = true; input.down[k] = true;
      }, true);
      addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; delete input.down[k]; }, true);
      // the side panel's own controls restart nothing; a page that wants them to can call api.start()
      def.setup?.(s, api);
      return {
        dur: def.dur,
        frame(t, tour) {
          hits = [];
          if (tour) {
            live = null;
            if (!tourSt || t < tourT) { tourSt = def.init(def.tourOpts || (def.opts ? def.opts(s) : {}), false); tourT = 0; }
            while (tourT + DT <= t) { def.step(tourSt, def.bot(tourSt) || { down: {}, press: {} }, DT); tourT += DT; }
            def.draw(g, tourSt, api, false);
          } else {
            if (!live) { live = def.init(def.opts ? def.opts(s) : {}, true); live._idle = true; }
            acc += Math.min(.1, Math.max(0, t - lastT));
            while (acc >= DT) {
              def.step(live, { down: input.down, press: input.press, click: input.click, mouse: input.mouse, drag: input.drag }, DT);
              input.press = {}; input.click = null; acc -= DT;
            }
            def.draw(g, live, api, true);
          }
          lastT = t;
        },
      };
    });
  }

  // small shared drawings
  function bar(g, x, y, w, h, v, col, bg = '#efe6d2') {
    g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill();
    if (v > 0) { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, Math.max(h, w * TD.clamp(v)), h, h / 2); g.fill(); }
  }
  function note(g, str, x, y, w) { return GK.wrap(g, str, x, y, w, 17, C.muted, 12, 500); }
  const pct = v => Math.round(v * 100) + '%';
  window.PLAY = { game, beep, bar, note, pct, DT };
})();
