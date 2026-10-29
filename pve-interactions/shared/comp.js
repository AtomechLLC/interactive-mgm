/* PvE Interactions: copy of ../../composition/shared/comp.js (the CK.scene engine and drawing helpers). Keep in sync by hand.
   CK.scene(name, cfg) registers one slide: a canvas drawn as a pure function of time and the slide's state, a walk-through
   that loops, and controls in the side panel. window.__seek(t, which) / __dur(which) reach any scene for the GIF recorder.
   cfg: { dur, init(s, st, api), draw(g, t, st, tour), side(t, st, tour) -> {stats, out} }
   - tour is true while the walk-through plays (t is its clock); controls call api.manual() to stop it and api.tour() to restart.
   - st is the scene's own state object; draw reads it in manual mode and may script it from t in tour mode.
   Drawing helpers (pic, text, card, chip, arrow, wrap, timeline) work in the canvas's logical 1040 x 585 space. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = window.TD, clamp = T.clamp, lerp = T.lerp, ease = T.ease;
  const BASE = new URL('img/', document.currentScript.src).href;
  const IMGS = {};
  const img = n => {
    if (!IMGS[n]) { IMGS[n] = new Image(); IMGS[n].src = n.includes('/') ? n : BASE + n; }
    return IMGS[n];
  };
  const ready = n => { const i = img(n); return i.complete && i.naturalWidth > 0; };
  // an image centred on x,y at width w; pixel art stays crisp (px), o.h forces a height, o.bottom anchors the feet at y
  function pic(g, n, x, y, w, o = {}) {
    const im = img(n); if (!im.complete || !im.naturalWidth) return;
    const h = o.h || w * im.naturalHeight / im.naturalWidth;
    g.save(); g.globalAlpha *= o.a ?? 1; g.imageSmoothingEnabled = !o.px; g.translate(x, y); if (o.flip) g.scale(-1, 1); if (o.rot) g.rotate(o.rot);
    if (o.grey) g.filter = 'grayscale(1) opacity(.55)';
    if (o.round) { g.beginPath(); g.roundRect(-w / 2, o.bottom ? -h : -h / 2, w, h, o.round); g.clip(); }
    g.drawImage(im, -w / 2, o.bottom ? -h : -h / 2, w, h); g.restore();
  }
  // a framed square icon (WoW / LoL style)
  function icon(g, n, x, y, s, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    if (o.glow) { g.fillStyle = o.glow; g.beginPath(); g.roundRect(x - s / 2 - 7, y - s / 2 - 7, s + 14, s + 14, 10); g.fill(); }
    pic(g, n, x, y, s, { grey: o.grey, round: 6 });
    g.strokeStyle = o.edge || T.C.navy; g.lineWidth = o.lw || 3; g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, 6); g.stroke(); g.restore();
  }
  function text(g, s, x, y, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1; g.font = `${o.it ? 'italic ' : ''}${o.w || 600} ${o.size || 15}px ${o.display ? 'Montserrat, ' : ''}Jost, sans-serif`;
    g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle'; g.fillStyle = o.col || T.C.ink;
    if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.strokeCol || '#fffaf0'; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.fillText(s, x, y); g.restore();
  }
  // wraps s into lines no wider than w; returns the lines (draws them when o.draw is not false)
  function wrap(g, s, x, y, w, o = {}) {
    g.save(); g.font = `${o.it ? 'italic ' : ''}${o.w || 500} ${o.size || 15}px ${o.display ? 'Montserrat, ' : ''}Jost, sans-serif`;
    const words = String(s).split(' '), lines = []; let cur = '';
    words.forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > w && cur) { lines.push(cur); cur = wd; } else cur = t; });
    if (cur) lines.push(cur); g.restore();
    if (o.draw !== false) lines.forEach((l, i) => text(g, l, x, y + i * (o.lh || (o.size || 15) * 1.3), { ...o, align: o.align || 'left' }));
    return lines;
  }
  function card(g, x, y, w, h, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    if (o.shadow !== false) { g.fillStyle = 'rgba(80,60,30,.12)'; g.beginPath(); g.roundRect(x - w / 2 + 3, y - h / 2 + 5, w, h, o.r ?? 12); g.fill(); }
    g.fillStyle = o.fill || '#fffaf0'; g.strokeStyle = o.edge || '#cdbf9f'; g.lineWidth = o.lw || 3; g.setLineDash(o.dash || []);
    g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, o.r ?? 12); g.fill(); g.stroke(); g.restore();
  }
  // a rounded label chip centred on x,y; returns its width
  function chip(g, s, x, y, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1; const size = o.size || 14;
    g.font = `${o.w || 700} ${size}px Jost, sans-serif`; const w = o.width || g.measureText(s).width + (o.pad ?? 18), h = o.h || size * 1.75;
    const x0 = o.align === 'left' ? x : x - w / 2;
    g.fillStyle = o.fill || '#dfe6fb'; g.strokeStyle = o.edge || '#8ea2e6'; g.lineWidth = o.lw || 2;
    g.beginPath(); g.roundRect(x0, y - h / 2, w, h, o.r ?? 7); g.fill(); g.stroke();
    g.fillStyle = o.col || '#23306e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x0 + w / 2, y + 1); g.restore();
    return w;
  }
  // named chip colours, shared so the same idea keeps the same colour across pages
  const TONE = {
    blue: { fill: '#dfe6fb', edge: '#8ea2e6', col: '#23306e' }, gold: { fill: '#fde9b8', edge: '#e0a92d', col: '#7a4a00' },
    green: { fill: '#d8f0df', edge: '#5fb47c', col: '#145c33' }, red: { fill: '#f9d9d6', edge: '#e07b72', col: '#8a1c15' },
    purple: { fill: '#eadcfb', edge: '#a77fe0', col: '#4b2286' }, grey: { fill: '#ece8de', edge: '#b9b09a', col: '#55513f' },
    teal: { fill: '#d4eff1', edge: '#5fb3bb', col: '#11555c' }, navy: { fill: '#152044', edge: '#152044', col: '#ffffff' },
    pink: { fill: '#fbdcec', edge: '#e07fb0', col: '#7d1f52' }, orange: { fill: '#ffe2c8', edge: '#f0954a', col: '#7a3a06' },
  };
  function arrow(g, a, b, col, w = 4, o = {}) {
    const [x0, y0] = a, [x1, y1] = b, ang = Math.atan2(y1 - y0, x1 - x0), p0 = o.pad0 ?? o.pad ?? 0, p1 = o.pad1 ?? o.pad ?? 0;
    const sx = x0 + Math.cos(ang) * p0, sy = y0 + Math.sin(ang) * p0, ex = x1 - Math.cos(ang) * p1, ey = y1 - Math.sin(ang) * p1;
    g.save(); g.globalAlpha *= o.a ?? 1; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.setLineDash(o.dash || []);
    g.beginPath(); g.moveTo(sx, sy);
    if (o.bend) { const mx = (sx + ex) / 2 - Math.sin(ang) * o.bend, my = (sy + ey) / 2 + Math.cos(ang) * o.bend; g.quadraticCurveTo(mx, my, ex, ey); }
    else g.lineTo(ex - Math.cos(ang) * 8, ey - Math.sin(ang) * 8);
    g.stroke(); g.setLineDash([]);
    if (o.head !== false) {
      const hs = 8 + w * 1.6, ha = o.bend ? Math.atan2(ey - ((sy + ey) / 2 + Math.cos(ang) * o.bend), ex - ((sx + ex) / 2 - Math.sin(ang) * o.bend)) : ang;
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - Math.cos(ha - .45) * hs, ey - Math.sin(ha - .45) * hs); g.lineTo(ex - Math.cos(ha + .45) * hs, ey - Math.sin(ha + .45) * hs); g.closePath(); g.fill();
    }
    g.restore();
  }
  // steps are [time, key]: on(k) once reached, in(k, d) a 0-1 ease over d seconds, out(k, d) fades back to 0 from that key
  const timeline = (steps, t) => {
    const at = k => (steps.find(s => s[1] === k) || [1e9])[0];
    return { on: k => t >= at(k), in: (k, d = .5) => ease(clamp((t - at(k)) / d)), at, since: k => t - at(k), last: () => [...steps].reverse().find(s => t >= s[0])?.[1] };
  };
  // the parchment panel used behind groups of things
  function panel(g, x, y, w, h, o = {}) {
    g.save(); g.fillStyle = o.fill || 'rgba(255,252,244,.62)'; g.strokeStyle = o.edge || 'rgba(205,191,159,.9)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, y, w, h, o.r ?? 14); g.fill(); if (o.edge !== null) g.stroke(); g.restore();
    if (o.title) text(g, o.title, x + 16, y + 20, { align: 'left', size: o.ts || 14, w: 700, col: T.C.muted, display: true });
  }

  const API = window.CKS = window.CKS || {};
  function scene(name, cfg) {
    canvasDemo(name, (s, cv, g) => {
      const st = Object.assign({ t: 0, tour: true, held: false }, cfg.state ? cfg.state() : {});
      const tourBtn = $(s, '.ck-tour');
      const api = {
        manual() { st.tour = false; tourBtn?.classList.remove('on'); },
        tour() { st.tour = true; st.t = 0; tourBtn?.classList.add('on'); },
        restart() { st.t = 0; },
        render, st, s, cv, g,
      };
      if (tourBtn) tourBtn.onclick = () => api.tour();
      cfg.init?.(s, st, api);
      let lastSide = '';
      function render() {
        T.use(g); g.clearRect(0, 0, cv.width, cv.height);
        cfg.draw(g, st.t, st, st.tour);
        const sd = cfg.side ? cfg.side(st.t, st, st.tour) : null;
        if (sd) { const k = (sd.stats || '') + '|' + (sd.out || ''); if (k !== lastSide) { lastSide = k; say($(s, '.st'), sd.stats || ''); say($(s, '.out1'), sd.out || ''); } }
        cfg.after?.(st);
      }
      API[name] = { seek(t) { st.held = true; if (!st.tour) api.tour(); st.t = t; render(); }, dur: () => cfg.dur };
      return dt => {
        if (!st.held) { st.t += Number.isFinite(dt) ? clamp(dt, 0, .1) : 0; if (st.tour && st.t > cfg.dur) st.t = 0; if (!st.tour && cfg.loop && st.t > cfg.loop) st.t = 0; }
        render();
      };
    });
  }
  window.__seek = (t, w) => API[w].seek(t);
  window.__dur = w => API[w].dur();

  // pointer events on a demo canvas, in its logical units: fn(x, y, type) for 'down', 'move', 'up'
  function pointer(cv, fn) {
    const at = e => { const r = cv.getBoundingClientRect(), w = cv.__hidpi ? cv.width : cv.width, h = cv.height; return [(e.clientX - r.left) * w / r.width, (e.clientY - r.top) * h / r.height]; };
    cv.addEventListener('pointerdown', e => fn(...at(e), 'down'));
    cv.addEventListener('pointermove', e => fn(...at(e), 'move'));
    window.addEventListener('pointerup', e => fn(...at(e), 'up'));
  }
  const inBox = (x, y, cx, cy, w, h) => Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= h / 2;

  window.CK = { img, ready, pic, icon, text, wrap, card, chip, TONE, arrow, timeline, panel, scene, pointer, inBox, clamp, lerp, ease };
})();
