/* Helpers for the alternate reverse sequencing slides (rv-pokemon, rv-cards, rv-mario): image loading, arrows, and the
   Forward / Backward / Walk-through side panel that reverse-map.js builds by hand. Each slide registers under RV[name]
   so the recorder's __seek(t, which) reaches it (see reverse-map.js). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const IMGS = {};
  const img = n => { if (!IMGS[n]) { IMGS[n] = new Image(); IMGS[n].src = 'img/' + n; } return IMGS[n]; };
  // draws an image centred on x,y at width w (height from its aspect); pixel art stays crisp when px is set
  function pic(g, n, x, y, w, o = {}) {
    const im = img(n); if (!im.complete || !im.naturalWidth) return;
    const h = o.h || w * im.naturalHeight / im.naturalWidth;
    g.save(); g.globalAlpha *= o.a ?? 1; g.imageSmoothingEnabled = !o.px; g.translate(x, y); if (o.flip) g.scale(-1, 1);
    g.drawImage(im, -w / 2, o.bottom ? -h : -h / 2, w, h); g.restore();
  }
  // arrow from a to b, trimmed by pad px at each end
  function arrow(g, a, b, col, w = 4, o = {}) {
    const [x0, y0] = a, [x1, y1] = b, ang = Math.atan2(y1 - y0, x1 - x0), p0 = o.pad0 ?? o.pad ?? 0, p1 = o.pad1 ?? o.pad ?? 0;
    const sx = x0 + Math.cos(ang) * p0, sy = y0 + Math.sin(ang) * p0, ex = x1 - Math.cos(ang) * p1, ey = y1 - Math.sin(ang) * p1;
    g.save(); g.globalAlpha *= o.a ?? 1; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.setLineDash(o.dash || []);
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex - Math.cos(ang) * 8, ey - Math.sin(ang) * 8); g.stroke(); g.setLineDash([]);
    const hs = 8 + w * 1.6;
    g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - Math.cos(ang - .45) * hs, ey - Math.sin(ang - .45) * hs); g.lineTo(ex - Math.cos(ang + .45) * hs, ey - Math.sin(ang + .45) * hs); g.closePath(); g.fill();
    g.restore();
  }
  // a parchment card with a coloured edge
  function card(g, x, y, w, h, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    g.fillStyle = o.fill || '#fffaf0'; g.strokeStyle = o.edge || '#cdbf9f'; g.lineWidth = o.lw || 3;
    g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, o.r ?? 12); g.fill(); g.stroke(); g.restore();
  }
  function text(g, s, x, y, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1; g.font = `${o.w || 600} ${o.size || 15}px ${o.display ? 'Montserrat, ' : ''}Jost, sans-serif`;
    g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillStyle = o.col || TD.C.ink; g.fillText(s, x, y); g.restore();
  }
  // timeline helpers: steps are [time, key]; on(k) once reached, in(k) a 0-1 fade over .5 s
  const timeline = (steps, t) => {
    const at = k => (steps.find(s => s[1] === k) || [1e9])[0];
    return { on: k => t >= at(k), in: (k, d = .5) => TD.clamp((t - at(k)) / d), at };
  };

  // cfg: { fdur, bdur, draw(g, mode, t), caps: {fwd, back}, stats: {fwd, back} }
  const RV = window.RV = window.RV || {};
  function slide(name, cfg) {
    const DUR = cfg.fdur + cfg.bdur, tourAt = t => t < cfg.fdur ? { mode: 'fwd', t } : { mode: 'back', t: t - cfg.fdur };
    canvasDemo(name, (s, cv, g) => {
      const st = { mode: 'fwd', t: 0, tour: true, tt: 0, held: false, last: '' };
      const box = $(s, '.rv-modes'), tourBtn = $(s, '.rv-tour');
      box.innerHTML = `<button class="btn" data-m="fwd">Forward</button><button class="btn" data-m="back">Backward</button>`;
      $$(box, 'button').forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.mode = b.dataset.m; st.t = 0; });
      tourBtn.onclick = () => { st.tour = true; st.tt = 0; tourBtn.classList.add('on'); };
      function render() {
        let { mode, t } = st; if (st.tour) ({ mode, t } = tourAt(st.tt));
        TD.use(g); g.clearRect(0, 0, cv.width, cv.height); cfg.draw(g, mode, t);
        $$(box, 'button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
        if (mode === st.last) return; st.last = mode;
        say($(s, '.st'), cfg.stats[mode]); say($(s, '.out1'), cfg.caps[mode]);
      }
      RV[name] = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => DUR };
      return dt => { if (!st.held) { if (st.tour) { st.tt += dt; if (st.tt > DUR) st.tt = 0; } else st.t = Math.min(st.t + dt, st.mode === 'fwd' ? cfg.fdur : cfg.bdur); } render(); };
    });
  }
  window.RVK = { img, pic, arrow, card, text, timeline, slide };
})();
