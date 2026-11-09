/* Genre breakdown pages: the boilerplate every one-widget genre page shares, so each page's own file is only its model
   and its drawing. Load after deck.js, kit.js and topdown.js.

   GK.scene(name, setup) registers a canvasDemo for <section data-demo="name">. setup(s, g, ui) returns
   { dur, frame(t, tour) }: frame draws the whole canvas at time t (seconds). While tour is true the page is in its
   walk-through and frame should also set the controls from t; any control the learner touches turns the tour off
   (ui.watch(...elements) wires that), and the .tour button turns it back on from t = 0.
   ui.stats(html) / ui.out(html) fill .mt-stats / .mt-out only when the html changes.
   window.__seek(t, which) / __dur(which) replay any scene for tools/record-slide-gif.js; which defaults to the first
   scene on the page. */
(function () {
  const { $, $$, canvasDemo } = FPF.kit;
  const T = TD, C = TD.C;
  const scenes = {}; let first = null;

  function scene(name, setup) {
    first = first || name;
    canvasDemo(name, (s, cv, g) => {
      const st = { t: 0, tour: true, held: false };
      const tourBtn = $(s, '.tour');
      const cache = {};
      const put = (sel, html) => { if (cache[sel] === html) return; cache[sel] = html; const el = $(s, sel); if (el) el.innerHTML = html; };
      const ui = {
        s, W: cv.width, H: cv.height,
        stats: html => put('.mt-stats', html), out: html => put('.mt-out', html),
        get tour() { return st.tour; },
        stopTour() { st.tour = false; tourBtn?.classList.remove('on'); },
        watch(...els) { els.flat().forEach(el => { if (!el) return; const f = () => ui.stopTour(); el.addEventListener('input', f); el.addEventListener('click', f); }); },
        get t() { return st.t; },
      };
      if (tourBtn) tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
      const def = setup(s, g, ui);
      const draw = t => { T.use(g); g.clearRect(0, 0, cv.width, cv.height); g.save(); def.frame(t, st.tour); g.restore(); };
      scenes[name] = { seek(t) { st.held = true; st.tour = true; draw(t); }, dur: () => def.dur };
      return dt => { if (st.held) return; st.t += Math.max(0, Math.min(.1, dt)); if (st.tour && st.t >= def.dur) st.t = 0; draw(st.t); };
    });
  }

  // drawing helpers in the module's look
  const font = (w, px, fam) => `${w} ${px}px ${fam === 'd' ? 'Montserrat, Jost, sans-serif' : 'Jost, sans-serif'}`;
  function panel(g, x = 0, y = 0, w = g.canvas.width, h = g.canvas.height) {
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill();
  }
  function head(g, text, x, y, align = 'left', col = C.ink, px = 15) {
    g.font = font(800, px, 'd'); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(text, x, y);
  }
  function text(g, str, x, y, col = C.muted, px = 13, align = 'left', w = 500) {
    g.font = font(w, px); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(str, x, y);
  }
  // wrapped text; returns the y below the last line
  function wrap(g, str, x, y, maxW, lh = 18, col = C.muted, px = 13, w = 500) {
    g.font = font(w, px); g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let line = '';
    for (const word of str.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = word; } else line = t;
    }
    if (line) { g.fillText(line, x, y); y += lh; }
    return y;
  }
  function big(g, value, label, x, y, col = C.ink) {
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = font(800, 24, 'd'); g.fillStyle = col; g.fillText(value, x, y);
    g.font = font(500, 13); g.fillStyle = C.muted; g.fillText(label, x, y + 19);
  }
  // axes box with gridlines: returns { sx, sy } mapping data to pixels
  function axes(g, x, y, w, h, o) {
    const { x0 = 0, x1 = 1, y0 = 0, y1 = 1, xt = [], yt = [], xl = '', yl = '', fmtX = v => v, fmtY = v => v } = o;
    const sx = v => x + (v - x0) / (x1 - x0) * w, sy = v => y + h - (v - y0) / (y1 - y0) * h;
    g.strokeStyle = 'rgba(205,191,159,.6)'; g.lineWidth = 1;
    yt.forEach(v => { g.beginPath(); g.moveTo(x, sy(v)); g.lineTo(x + w, sy(v)); g.stroke(); });
    g.strokeStyle = '#cdbf9f'; g.strokeRect(x, y, w, h);
    g.font = font(500, 11); g.fillStyle = C.muted;
    g.textAlign = 'right'; yt.forEach(v => g.fillText(fmtY(v), x - 6, sy(v) + 4));
    g.textAlign = 'center'; xt.forEach(v => g.fillText(fmtX(v), sx(v), y + h + 14));
    if (xl) { g.fillText(xl, x + w / 2, y + h + 30); }
    if (yl) { g.save(); g.translate(x - 38, y + h / 2); g.rotate(-Math.PI / 2); g.fillText(yl, 0, 0); g.restore(); }
    return { sx, sy };
  }
  function line(g, pts, col, w = 3, dash) {
    g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.setLineDash([]);
  }
  function box(g, x, y, w, h, fill = '#fffaf0', stroke = '#cdbf9f', r = 10, lw = 2) {
    g.fillStyle = fill; g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); if (stroke) g.stroke();
  }
  // a seeded random stream: rng(seed)() -> [0, 1)
  const rng = seed => { let s = (seed * 2654435761 + 7) >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); };
  // images: img(src) returns the Image once loaded, else null
  const IM = {};
  function img(src) { let im = IM[src]; if (!im) { im = IM[src] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; }
  // the walk-through's act at time t: acts = [{ to, ... }], returns [act, k 0..1 through it, index]
  function act(acts, t) {
    let i = acts.findIndex(a => t < a.to); if (i < 0) i = acts.length - 1;
    const from = i ? acts[i - 1].to : 0; return [acts[i], T.clamp((t - from) / (acts[i].to - from)), i];
  }

  window.GK = { scene, font, panel, head, text, wrap, big, axes, line, box, rng, img, act };
  // a page whose first slide has its own __seek / __dur (loaded before this file) keeps them for its own scenes
  const prevSeek = window.__seek, prevDur = window.__dur;
  const mine = which => which ? !!scenes[which] : !prevSeek;
  window.__seek = (t, which) => mine(which) ? scenes[which || first].seek(t) : prevSeek(t, which);
  window.__dur = which => mine(which) ? scenes[which || first].dur() : prevDur(which);
})();
