/* Helpers for the "Learning From My Past" pages (care/, response/): text wrapping, pixel sprites, and a scene runner.
   LP.scenes(name, opts) registers a canvasDemo whose slide plays a list of scenes, each a pure function of its own time u,
   with a looping walk-through, a scene menu and window.__seek(t, name) / __dur(name) for GIF recording. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const TAU = Math.PI * 2;
  const C = { ink: '#262c6a', navy: '#152044', muted: '#5d618c', gold: '#ffb951', goldInk: '#9a5a06', line: '#cdbf9f', paper: 'rgba(255,252,244,.94)',
    react: '#2e7fd6', prep: '#c07a0c', recup: '#2f9e5a', red: '#d8402f', green: '#2f9e5a' };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, ease = k => k * k * (3 - 2 * k);
  const imgs = {}; const IM = src => { if (!imgs[src]) { const i = new Image(); i.src = src; imgs[src] = i; } return imgs[src]; };
  const ready = i => i && i.complete && i.naturalWidth;
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function wrap(g, text, x, y, w, lh) {
    const words = String(text).split(' '); let line = '';
    words.forEach(wd => { if (line && g.measureText(line + wd).width > w) { g.fillText(line.trim(), x, y); y += lh; line = ''; } line += wd + ' '; });
    if (line.trim()) g.fillText(line.trim(), x, y);
    return y;
  }
  function text(g, t, x, y, font, col, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(t, x, y); }
  // draw an image pixel-sharp; flip mirrors it, tint washes it with a colour (for flashing sprites)
  const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
  function sprite(g, src, x, y, w, h, o = {}) {
    const i = IM(src); if (!ready(i)) return;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha *= o.a ?? 1;
    g.translate(x + w / 2, y + h / 2); if (o.flip) g.scale(-1, 1); if (o.flipV) g.scale(1, -1);
    if (o.tint) {
      tmp.width = i.naturalWidth; tmp.height = i.naturalHeight; tg.clearRect(0, 0, tmp.width, tmp.height); tg.globalCompositeOperation = 'source-over';
      tg.drawImage(i, 0, 0); tg.globalCompositeOperation = 'source-atop'; tg.globalAlpha = o.tintA ?? .55; tg.fillStyle = o.tint; tg.fillRect(0, 0, tmp.width, tmp.height); tg.globalAlpha = 1;
      g.drawImage(tmp, -w / 2, -h / 2, w, h);
    } else g.drawImage(i, -w / 2, -h / 2, w, h);
    g.restore();
  }
  // a sprite from rows of characters; pal maps a character to a colour
  function pixels(g, rows, pal, x, y, px) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + i * px, y + j * px, px + .4, px + .4); } }));
  }
  function icon(g, src, x, y, s) { const i = IM(src); if (ready(i)) { g.save(); rr(g, x, y, s, s, 6); g.clip(); g.drawImage(i, x, y, s, s); g.restore(); g.strokeStyle = C.navy; g.lineWidth = 1.5; rr(g, x, y, s, s, 6); g.stroke(); } }

  /* opts: { scenes: [{ id, label, len, draw(g, u, ctx) }], menu: '.sel', tour: '.sel', out: '.sel', say(scene) -> html,
             setup(slide, st) (extra wiring), frame(g, st, scene, u) (optional overlay) } */
  const runners = {};
  function scenes(name, opts) {
    const S = opts.scenes, DUR = S.reduce((a, s) => a + s.len, 0);
    const at = t => { t = ((t % DUR) + DUR) % DUR; for (let i = 0; i < S.length; i++) { if (t < S[i].len) return { i, u: t }; t -= S[i].len; } return { i: 0, u: 0 }; };
    canvasDemo(name, (sl, cv, g) => {
      const st = { tour: true, held: false, t: 0, i: 0, u: 0, key: '', slide: sl, loop: true };
      const menu = opts.menu && $(sl, opts.menu), tourBtn = opts.tour && $(sl, opts.tour);
      if (menu) menu.innerHTML = S.map((s, i) => `<button class="btn" data-i="${i}">${s.label}</button>`).join('');
      const mBtns = menu ? $$(menu, '.btn') : [];
      st.manual = () => { st.tour = false; tourBtn && tourBtn.classList.remove('on'); };
      st.go = i => { st.manual(); st.i = i; st.u = 0; };
      mBtns.forEach((b, i) => b.onclick = () => st.go(i));
      if (tourBtn) tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
      opts.setup && opts.setup(sl, st);
      function frame() {
        if (st.tour) Object.assign(st, at(st.t));
        const s = S[st.i];
        g.clearRect(0, 0, cv.width, cv.height);
        s.draw(g, Math.min(st.u, s.len), st);
        opts.frame && opts.frame(g, st, s);
        mBtns.forEach((b, i) => b.classList.toggle('on', i === st.i));
        const key = [st.i, st.tour, opts.key ? opts.key(st) : ''].join();
        if (key !== st.key) { st.key = key; if (opts.out) say($(sl, opts.out), opts.say ? opts.say(s, st) : ''); opts.sync && opts.sync(sl, st, s); }
      }
      st.frame = frame;
      runners[name] = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => DUR };
      return dt => {
        if (st.held) return; dt = Math.max(0, Math.min(dt, .1));
        if (st.tour) { st.t += dt; if (st.t >= DUR) st.t = 0; }
        else { st.u += dt; if (st.u >= S[st.i].len) st.u = st.loop ? 0 : S[st.i].len; }
        frame();
      };
    });
  }
  const prevSeek = window.__seek, prevDur = window.__dur;
  window.__seek = (t, which) => runners[which] ? runners[which].seek(t) : prevSeek && prevSeek(t, which);
  window.__dur = which => runners[which] ? runners[which].dur() : prevDur && prevDur(which);
  window.LP = { C, TAU, clamp, lerp, ease, IM, ready, rr, wrap, text, sprite, pixels, icon, scenes, runners };
})();
