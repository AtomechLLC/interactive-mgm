/* Scene helper for DGMS pages: one canvas demo per slide that plays a walk-through on a loop until the learner
   touches a control, and that the GIF recorder can drive frame by frame through window.__seek / __dur.
   SCENE(name, { dur, init(st), draw(g, st, t), side(st, t), onManual(st), onTour(st) })
   - st holds the slide (st.s), canvas (st.cv), context (st.g), st.tour (walk-through on) and st.manual() (stop it).
   - draw() gets the tour clock t while touring, and the free-running clock otherwise; it must be a pure function of
     t and st, so __seek(t, name) shows the same frame every time.
   - a .tour button on the slide restarts the walk-through.
   Text helpers: SCENE.txt, SCENE.wrap, SCENE.box, SCENE.img (cached Image by URL), SCENE.at (pointer → canvas units). */
(function () {
  const scenes = {}, first = [];
  window.__seek = (t, which) => scenes[which || first[0]].seek(t);
  window.__dur = which => scenes[which || first[0]].dur;

  function SCENE(name, def) {
    FPF.kit.canvasDemo(name, (s, cv, g) => {
      const st = { t: 0, tour: true, held: false, s, cv, g, W: cv.width, H: cv.height };
      const tourBtn = s.querySelector('.tour');
      st.manual = () => { if (st.tour) { st.tour = false; tourBtn?.classList.remove('on'); def.onManual?.(st); } st.dirty = true; };
      if (tourBtn) tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); def.onTour?.(st); };
      def.init?.(st);
      const frame = t => { TD.use(g); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, st.W, st.H); def.draw(g, st, t); def.side?.(st, t); };
      scenes[name] = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: def.dur };
      first.push(name);
      return dt => {
        if (st.held) return;
        st.t += Math.max(0, dt);
        if (st.tour && st.t >= def.dur) st.t = 0;
        frame(st.t);
      };
    });
  }
  const FONT = { d: 'Montserrat, Jost, sans-serif', b: 'Jost, system-ui, sans-serif' };
  // txt(g, text, x, y, { size, w: weight, col, align, base, font: 'd' | 'b', a })
  SCENE.txt = (g, text, x, y, o = {}) => {
    g.save(); g.globalAlpha *= o.a ?? 1;
    g.font = `${o.w || (o.font === 'b' ? 500 : 800)} ${o.size || 16}px ${FONT[o.font || 'd']}`;
    g.fillStyle = o.col || TD.C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
    g.fillText(text, x, y); g.restore();
  };
  // wrapped body text; returns the y after the last line
  SCENE.wrap = (g, text, x, y, maxW, o = {}) => {
    const size = o.size || 15, lh = o.lh || size * 1.3;
    g.save(); g.font = `${o.w || 500} ${size}px ${FONT[o.font || 'b']}`;
    const words = String(text).split(' '); let line = '', yy = y;
    const out = [];
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line);
    g.restore();
    out.forEach(l => { SCENE.txt(g, l, x, yy, { ...o, size, font: o.font || 'b', w: o.w || 500 }); yy += lh; });
    return yy;
  };
  // rounded box: fill, stroke, line width, radius, alpha
  SCENE.box = (g, x, y, w, h, o = {}) => {
    g.save(); g.globalAlpha *= o.a ?? 1; g.beginPath(); g.roundRect(x, y, w, h, o.r ?? 12);
    if (o.fill !== null) { g.fillStyle = o.fill || 'rgba(255,252,244,.9)'; g.fill(); }
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.lw || 2; g.stroke(); }
    g.restore();
  };
  const cache = {};
  SCENE.img = src => { if (!cache[src]) { const i = new Image(); i.src = src; cache[src] = i; } return cache[src]; };
  SCENE.draw = (g, src, x, y, w, h, a = 1) => { const i = SCENE.img(src); if (i.complete && i.naturalWidth) { g.save(); g.globalAlpha *= a; g.drawImage(i, x, y, w, h ?? w); g.restore(); } };
  SCENE.at = (cv, e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
  // parchment card behind every scene
  SCENE.paper = (g, W, H) => SCENE.box(g, 0, 0, W, H, { fill: 'rgba(255,252,244,.86)', r: 14 });
  window.SCENE = SCENE;
})();
